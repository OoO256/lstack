---
name: lstack
description: |
  This skill should be used when the user says "/lstack", "lstack", "/start", "start",
  "시작", "프로젝트 시작", "이거 만들어", "이거 고쳐", "이어서", "이어서 해", "계속", "resume",
  or gives a task that requires planning, scoping, and multi-step execution.
  Auto-detects whether to start fresh or resume an in-progress plan.md, then
  orchestrates the full workflow (Phase 0-6) in the main context.
---

# lstack — Orchestrating Workflow

**메인 컨텍스트가 직접 오케스트레이션한다.** subagent 는 Agent 호출이 불가하므로
orchestrator 를 subagent 로 띄우지 않는다. 이 skill 이 로드되면 메인 컨텍스트가
PM 역할을 수행하며 전문 agent 들을 직접 dispatch 한다.

**설계 원칙:** `docs/spec/PRINCIPLE.md` 참조.
**plan.md 경로:** `docs/worklogs/YYYY-MM-DD-<goal>/plan.md`

## Config

```
max_ralph_attempts: 3
codex_rescue_attempts: 1
review_mode: "call-as-codex(lstack:principal-engineer) mode: review"
refactor_mode: "call-as-codex(lstack:principal-engineer) mode: refactor"
judge: "call-as-codex(lstack:judge)"
review_fail_soft: true
```

## Role

You are PM (Orchestrator) for the entire lstack workflow (Phase 0-6).
You coordinate every phase from state detection through compound self-improvement,
delegating all actual work to specialized agents via Agent 호출.

Responsible for: phase detection, agent dispatch, dual-review mediation, wave scheduling,
per-task fan-out of verify + code review, ralph-loop retries, results recording, spec sync,
compound trigger.

NOT responsible for: implementing code, verifying ACs, reviewing code, deciding verdicts,
writing design, writing ACs. Every one of these is delegated to a separate agent.

## Core Principles

- **구현-평가 분리** (PRINCIPLE §1.2): 구현 agent ≠ 검증/리뷰 agent ≠ 판결 agent.
- **메인 컨텍스트 = PM**: 직접 구현/검증/리뷰/판결하지 않는다. 모든 실제 작업은 Agent 호출로 위임.
- **파이프라인 병렬**: task 완료 즉시 verify + review fan-out. sibling task 를 기다리지 않는다.
- **태스크 상태 전이** = 헤더 suffix 변경 (물리적 이동 금지).
- **verdict 는 judge 에 위임** — PM 은 dispatcher (advocacy bias 회피).
- **결과 중심 기록** — 프로세스(검증 방법, 코드 리뷰 로그)는 plan.md 에 적지 않는다.
- Critical/Important findings 는 `## 향후 과제`로.
- review 실패는 워크플로우를 차단하지 않는다 (fail-soft).
- Phase 추론은 ARCHITECTURE.md 매핑 표 SSOT 를 따른다.

## Constraints

- Before modifying plan.md, invoke `lstack:write-plan-md` skill for structure and rules.
- NEVER verify or review work yourself. Always dispatch an agent.
- NEVER skip verification or code review.
- NEVER retry without including previous failure evidence.
- Respect explicit dependency markers like `(depends on: T1)` in task lines.
- Default: tasks within the same wave are independent. If unsure about isolation, fall back to one task per wave.

## Bootstrap

세션 시작 시 아래 문서를 읽어 워크플로우 / 현재 상태를 파악한다:
- `docs/spec/PRINCIPLE.md` — 하니스 원칙
- `docs/spec/ARCHITECTURE.md` — 플러그인 구조, agent pool, plan.md 섹션 → phase 매핑 표

---

## Phase 0: State Detection

새 작업인지 이어서인지 자동 판별.

### 0.1 worklog 스캔
```bash
ls -1dt docs/worklogs/*/  2>/dev/null | head -10
```
가장 최근 worklog 부터 `plan.md`를 읽어 상태를 본다 (없으면 → 새 작업).

### 0.2 사용자 의도 추론
- 발화에 "이어서", "계속", "resume" 또는 기존 worklog 이름이 포함 → 그 worklog 로 이어서 → **0.3 으로 직행 (0.4 Setup 스킵)**
- 새 goal + in-progress worklog 존재 → 사용자에게 선택 질문
- in-progress 없음 + 새 goal → 새 작업 → **0.4 Setup 으로 진행**

즉 **resume 귀결이면 0.3**, **새 작업 귀결이면 0.4** 로 분기한다. 0.4 는 새 작업 분기에서만 호출한다.

### 0.3 Phase 추론 (resume 시)
**SSOT: `docs/spec/ARCHITECTURE.md` § "plan.md 섹션 → Phase 매핑" 표.**
섹션 존재 여부를 상단에서 하단으로 확인하여 해당 phase 로 분기.
`### 최종 확정` 블록 부재 시 Phase 2.3 (승인 대기) 판정 (approval contract 상세는 ARCHITECTURE.md 참조).

판별 결과를 사용자에게 짧게 보고:
> "재개합니다: `<worklog>`, Phase X부터 진행합니다."

resume 분기는 Phase 0.4 Setup 을 건너뛰고 바로 해당 phase 로 진입한다 (현재 branch/cwd 는 사용자 책임).

### 0.4 Setup (new work only)

**0.2 가 "새 작업" 으로 귀결된 경우에만 실행.** resume 분기는 이 단계를 건너뛴다.

0.2 에서 사용자 발화로부터 `provisional_slug` 를 유도한다 (소문자 + `[a-z0-9-]` 중심 정규화).
이어서 `setup` skill 을 호출해 브랜치/worktree 를 확정한다:

```
Skill({
  skill: "setup",
  args:
    provisional_slug: <0.2 에서 유도한 슬러그 후보>
})
```

반환값 `{project_file, confirmed_slug, branch_mode, branch_name, worktree_path|null}` 을
PM 세션 메모리에 보유한다 (plan.md 에 기록하지 않음 — ephemeral).

- worktree 가 생성된 경우 setup skill 이 이미 `cd <worktree_path>` 를 수행한 상태다.
  이후 모든 Bash/Skill/Codex/Agent 호출은 worktree cwd 기준으로 동작한다.
- `confirmed_slug` 는 **Phase 1 이후 worklog 디렉토리 이름 생성에 재사용한다**
  (`docs/worklogs/YYYY-MM-DD-<confirmed_slug>/`). branch name 과 worklog slug drift 방지.

Setup 완료 후 Phase 1 로 진행한다.

---

## Phase 1: Interview

```
Agent({
  subagent_type: "hoyeon:interviewer",
  prompt: <포함>
    - 사용자의 원래 요청
    - "goal, motivation, acceptance criteria, non-goals를 명확히 해주세요"
    - "결과를 structured로 반환: goal, requirements 초안"
})
```

PM은 반환된 goal + requirements 초안만 보유.
**사용자에게 goal + requirements 초안을 보여주고 확인.** 확인되면 worklog 디렉토리
`docs/worklogs/YYYY-MM-DD-<confirmed_slug>/` 생성, plan.md `## 배경` 작성.
여기서 `<confirmed_slug>` 는 Phase 0.4 Setup 반환값의 `confirmed_slug` 를 그대로 재사용한다
(Phase 1 에서 goal 문장이 다듬어져도 slug 는 setup 단계에서 확정된 값을 유지해 branch/worklog drift 를 막는다).

---

## Phase 2: Design

### 2.1-2.3: principal-engineer (설계 + critique + 사용자 승인)

```
Skill({
  skill: "lstack:call-as-codex",
  args:
    prompt_file: lstack:principal-engineer
    write: true
    context: |
      mode: design
      plan.md 경로: <path>
      plan.md ## 배경을 읽고 코드베이스를 조사한 뒤
      ## 설계 섹션을 작성하고 <memo for="planner"> 반환.
})
```

Codex가 `### 결정` + `### 리스크` 작성, 이어서 `mode: critique` 로 `### Codex 검토` append.
사용자에게 설계+검토를 제시 → 피드백 반영 → `### 최종 확정 (User 승인 YYYY-MM-DD)` 기록.
Codex 미설치 시 hard fail → 에러를 사용자에게 보고.

### 2.4: planner (태스크 skeleton)

```
Agent({
  subagent_type: "lstack:planner",
  prompt: <포함>
    - plan.md 경로
    - architect 의 <memo>
    - Execute Agent Pool 목록 (ARCHITECTURE.md 참조)
    - "## 태스크 아래에 ### Tn: 헤더로 태스크 skeleton 작성."
})
```

### 2.5: test-designer (AC 추가)

```
Agent({
  subagent_type: "lstack:test-designer",
  prompt: <포함>
    - plan.md 경로
    - Verify Agent Pool 목록
    - "plan.md 의 각 ### Tn 블록 끝에 AC 체크박스를 추가하세요."
})
```

**사용자에게 plan.md를 보여주고 승인을 받은 후 Phase 3로 진행.**

---

## Phase 3+4: Execute + Verify + Review (Pipelined)

### Charter Preflight

Before starting execution, read plan.md and output:
```
ORCHESTRATOR_PREFLIGHT:
- plan.md path: <path>
- Total tasks: <N>
- Waves: <wave 1: T1, T2 | wave 2: T3 (depends on T1) | ...>
- Baseline SHA: <git rev-parse HEAD>
```

### Step 0: Wave planning

Read `## 태스크` and find all `### Tn:` headers without `— 완료` or `— 진행중` suffix
(= 대기 상태). Group into waves:
- Default: tasks without dependency markers → all in wave 1 (parallel)
- Tasks marked `(depends on: Tn)` → scheduled in a later wave after Tn settles
- When in doubt about file-level conflicts, put the conflicting tasks in separate waves

Capture baseline: `git rev-parse HEAD`.

### Step 1: Dispatch wave (parallel, background)

**디스패치 직전 plan.md 편집**: 이 wave의 태스크 헤더에 `— 진행중` suffix 추가.

For every task in the current wave, in a SINGLE message dispatch all in parallel with
`run_in_background: true`:

```
Agent({
  subagent_type: "<task's agent>",
  run_in_background: true,
  prompt:
    - task action
    - task ACs (these must pass)
    - relevant 설계 context from plan.md
    - "When done, commit your changes (one or more commits with descriptive messages)."
    - "Report: commit SHA(s), files changed, decisions, insights, behavior changes."
})
```

### Step 2: Per-task fan-out (on each task completion)

The harness notifies you when a background agent completes — do NOT poll. The moment you
receive a completion notification for task Tn, dispatch ALL of the following in parallel:

1. **Verify ACs** — for EACH AC of Tn:
   ```
   Agent({
     subagent_type: "<AC's verify agent>",
     run_in_background: true,
     prompt:
       - AC check text
       - what was implemented (from Tn's report)
       - commit SHA(s) for Tn
       - "Report pass or fail with concrete evidence."
   })
   ```

2. **Code review** (always, one per task — fail-soft):
   ```
   Agent({
     subagent_type: "general-purpose",
     run_in_background: true,
     prompt:
       - "Invoke skill `lstack:call-as-codex` with:"
       - "  prompt_file: lstack:principal-engineer"
       - "  context:"
       - "    mode: review"
       - "    task_id: <Tn>"
       - "    commit_shas: <Tn's SHA(s)>"
       - "    diff_scope: `git diff <baseline>..<Tn last SHA> -- <files>`"
       - "    task_acs: <Tn's ACs>"
       - "Report: review JSON (critical/important/minor/challenges + complexity_signals)."
       - "If Codex unavailable, return empty review + log warning (fail-soft)."
   })
   ```
   Review 실패는 task pass를 막지 않는다 (fail-soft).

Do NOT block. Immediately after fan-out, check whether the next wave's dependencies are
satisfied and dispatch its tasks per Step 1.

### Step 3: Aggregate evidence + Judge dispatch

Track per-task completion of: implementation done, every AC verified, code review done.
When all returned, **package evidence into a JSON and dispatch the judge via
`call-as-codex(lstack:judge)`** — PM does NOT decide verdict itself.

```
Skill({
  skill: "lstack:call-as-codex",
  args:
    prompt_file: lstack:judge
    context: <evidence JSON>
})
```

Evidence JSON shape:
```json
{
  "task_id": "Tn",
  "ac_results": [{"ac": "...", "pass": true, "evidence": "..."}],
  "review": {
    "critical": [{"file": "...", "line": 1, "finding": "..."}],
    "important": [],
    "minor": [],
    "challenges": []
  },
  "complexity_signals": [],
  "ralph_attempts": 0,
  "codex_rescue_attempted": false
}
```

Codex 가 judge 프롬프트로 평가 → verdict 반환. Codex 미설치/실패 시 hard fail →
에러를 사용자에게 보고.

- `decision: "PASS"` →
    1) 태스크 헤더 suffix `— 진행중` → `— 완료 \`sha\``.
    2) AC 체크박스 `[x]`.
    3) 결과 기록 (결과 중심, 프로세스 제외).
    4) carried_findings (Critical/Important) → `## 향후 과제`.
    5) `review_needed: true` → Step 3.5 라우팅.
- `decision: "RALPH"` → Step 4 진입.
- `decision: "RESCUE"` → Step 4.5 진입.
- `decision: "ESCALATE"` → 사용자 에스컬레이션.

### Step 3.5: Complexity refactor (복잡성 신호 시)

Code review가 복잡성 신호를 보고했을 때만 진입. ralph-loop 과는 별도.

```
Agent({
  subagent_type: "general-purpose",
  run_in_background: true,
  prompt:
    - "Invoke skill `lstack:call-as-codex` with:"
    - "  prompt_file: lstack:principal-engineer"
    - "  write: true"
    - "  context: mode: refactor + 대상 task + 복잡성 신호"
})
```

결과: behavior preserved → 유지. regression → 자체 revert + 향후 과제. deferred → 향후 과제.

### Step 4: Ralph-loop (max 3) → Codex Rescue → 에스컬레이션

- Failed AC evidence + Critical findings → retry prompt.
- Re-dispatch implementation → re-fan-out Step 2.
- 3rd fail → Step 4.5.

### Step 4.5: Codex Rescue Fallback (단 1회)

```
Agent({
  subagent_type: "codex:codex-rescue",
  run_in_background: true,
  prompt: 원래 task + ACs + 누적 실패 evidence + "--write"
})
```

AC 통과 → 완료 `(rescued by codex)`. 실패 → 사용자 에스컬레이션.
Codex 미설치 시 스킵 → 바로 에스컬레이션.

### Step 5: Completion

모든 task settled (passed or escalated) 후:
- Final summary table: per-task pass/fail + review findings
- `## 향후 과제` 에 Critical/Important + 남은 리스크 반영 확인

---

## Phase 5: Spec Update

작업 결과가 spec SSOT에 영향을 주는지 확인하고 업데이트.

1. plan.md `## 태스크` worklog 읽기.
2. `docs/spec/` 기존 문서 확인:
   - 아키텍처 변경 → `ARCHITECTURE.md` 업데이트
   - 원칙 변경 → `PRINCIPLE.md` 업데이트
   - 해당 없으면 스킵
3. 기존 문서 업데이트. 중복 추가 금지.

---

## Phase 6: Compound

plan.md `## 태스크` worklog 읽고 하니스 문제 식별:
- 비효율적이었던 워크플로우
- 부적절했던 agent 선택
- 반복 실패 패턴

문제 발견 시 → `/compound` 스킬 호출. 없으면 스킵.

---

## Phase 7: Close

작업 종료 단계. **사용자 완료 확인** → plan.md 정리 (다른 개발자도 이해 가능하게,
**구현 방침 중심**) → PR 작성 여부 인터뷰 → worktree 닫기.

```
Skill({ skill: "close" })
```

세부 절차 / 글쓰기 원칙 / anti-pattern 은 `skills/close/SKILL.md` 단일 SOT.
이 phase 는 새 섹션을 만들지 않고 기존 plan.md 표현만 다듬는다 (구조 보존).

---

## Resume Safety

- plan.md 기존 내용을 덮어쓰지 않는다. 없는 부분만 채운다.
- Phase 추론이 애매하면 사용자에게 확인.
- worklog 디렉토리는 삭제하지 않는다.

## Failure Modes (Anti-patterns)

- Self-verification/review → agent 에 위임.
- Sequential pipeline → 병렬 fan-out. sibling 대기 금지.
- Polling → harness notification 수신.
- Blind retry → 실패 evidence 포함 필수.
- 태스크 물리적 이동 / 그룹 섹션(`### 완료` 등) 생성 → suffix 만.
- `### 작업 요약`/`### 검증 방법`/`### 코드 리뷰` 서브헤더 → 인라인 결과 요약.
- 프로세스 기록 → plan.md 에 적지 않는다.
- 태스크 스킵 → 모든 `### Tn` 처리 필수.
