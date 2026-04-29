# Architecture

lstack 플러그인의 구조, 컴포넌트, 워크플로우.

## Plugin Structure

```
lstack/
├── .claude-plugin/plugin.json   # 플러그인 매니페스트
├── agents/                       # 에이전트 정의 (.md)
├── skills/                       # 스킬 정의 (디렉토리/SKILL.md)
├── commands/                     # 슬래시 커맨드 정의 (.md)
├── hooks/hooks.json              # 이벤트 훅 등록
├── docs/
│   ├── spec/                     # 분야별 SSOT 문서
│   └── worklog/                  # 프로젝트 단위 작업 디렉토리
└── tests/                        # 테스트
```

---

## Skills

### lstack (PM 진입점 + 오케스트레이터, start 스킬 대체)
- **경로**: `skills/lstack/SKILL.md`
- **트리거**: `/lstack`, `/start`, "시작", "이어서", "계속", "resume", "이거 만들어", "이거 고쳐"
- **역할**: 단일 진입점 **겸 오케스트레이터**. 메인 컨텍스트가 직접 PM 역할을 수행하며
  전문 agent 들을 Agent 호출로 dispatch 한다 (subagent 는 Agent 호출 불가하므로
  orchestrator 를 subagent 로 띄우지 않는다).
- **워크플로우**: [State Detect] → [Setup (new work only)] → Interview → Design (`call-as-codex(lstack:principal-engineer)` → planner → test-designer) →
  사용자 승인 → Execute+Verify+Review (메인 컨텍스트가 pipelined 오케스트레이션,
  per-task FF + Codex adversarial fan-out, 복잡성 시 `call-as-codex(lstack:principal-engineer)` review, 3회 ralph 실패 시
  Codex Rescue 폴백) → Spec 업데이트 → Compound
- **원칙**: `docs/spec/PRINCIPLE.md` 참조

### setup
- **경로**: `skills/setup/SKILL.md`
- **트리거**: Phase 0.4 에서 lstack orchestrator 가 호출 (standalone 트리거 없음)
- **역할**: 브랜치/worktree 전략을 사용자에게 묻고 적용. 프로젝트별 기본값은 `skills/setup/projects/<cwd-basename>.md` frontmatter 에서.
- **반환**: `{project_file, confirmed_slug, branch_mode, branch_name, worktree_path|null}` (5 필드 고정)
- **범위**: 새 작업 (Phase 0.2 '새 goal' 귀결) 에만 실행. resume 시 스킵.

### compound
- **경로**: `skills/compound/SKILL.md`
- **트리거**: `/compound`, "컴파운드"
- **역할**: Self-improvement loop. 대화에서 워크플로우 문제를 분석하고, 레퍼런스 플러그인에서 패턴을 탐색하여 harness-sage가 개선 PR 생성.
- **레퍼런스**: `skills/compound/references.md` (superpowers, gstack, hoyeon, omc)

### document
- **경로**: `skills/document/SKILL.md`
- **트리거**: `/document`, "문서화", 또는 커밋 후 자동 리마인드
- **역할**: 대화를 분석해서 worklog 작성 + spec SSOT 업데이트

### close
- **경로**: `skills/close/SKILL.md`
- **트리거**: `/close`, "닫자", "마무리", "끝내자", 또는 lstack orchestrator Phase 7
- **역할**: 사용자 완료 확인 → plan.md 를 다른 개발자도 이해 가능하도록 **구현 방침 중심**으로 정리 → PR 생성 여부 인터뷰 (생성 시 본문도 같은 원칙) → worktree 제거 (브랜치 유지)
- **범위**: Phase 5 (Spec) · Phase 6 (Compound) 가 끝난 뒤 호출. 새 섹션 추가 / 태스크 구조 변경 금지 (표현만 다듬음).

---

## Agents

### 내부 Agent (모두 dual-invocable — Claude subagent + Codex 프롬프트 양쪽 호출 가능)

| Agent | 경로 | Phase | 역할 |
|-------|------|-------|------|
| principal-engineer | `agents/principal-engineer.md` | Phase 2.1 설계, Phase 2.2 critique, Phase 3+4 task diff review, 복잡성 refactor, `/ask-cto` | 객관적 설계 판단 · task diff 리뷰 · 복잡성 리팩터 · 독립적 기술 자문 |
| judge | `agents/judge.md` | Phase 3+4 verdict 결정 | evidence + rule table 기반 PASS/RALPH/RESCUE/ESCALATE 판정 |
| planner | `agents/planner.md` | Design 2.4 | plan.md `### Tn` skeleton 작성 (exec agent + 구현 힌트) |
| test-designer | `agents/test-designer.md` | Design 2.5 | 각 태스크 블록 끝에 AC 체크박스 추가. 테스트 코드는 쓰지 않는다 |
| ~~orchestrator~~ | 삭제됨 → `skills/lstack/SKILL.md` 로 통합 | Phase 0-6 | 메인 컨텍스트가 직접 오케스트레이션 (subagent 는 Agent 호출 불가). PM persona + 상세 규칙은 skill 에 내장 |
| harness-sage | `agents/harness-sage.md` | Compound | worktree 격리 후 코드 구현 + issue/PR 생성 |

**Dual-invocable 원칙:**
- 모든 agent 파일에 frontmatter (`name`/`description`/`model`) 존재 → `Agent({subagent_type: "..."})` 로 Claude subagent 호출 가능.
- `call-as-codex` skill 이 frontmatter 블록을 제거한 본문만 Codex 에 주입 → `call-as-codex(<plugin>:<name>)` 표기로 Codex 호출.
- 같은 persona 를 두 모델로 양쪽에서 활용 (Phase 2 이중 검토 등).

**레이어 분리:**
- `call-as-codex` (skill) = Codex 호출 mechanics (프롬프트 내용 알지 않음)
- `agents/<name>.md` = 프롬프트 파일 (호출 방식 알지 않음)
- 호출자 = 두 레이어를 조합 — `call-as-codex(<plugin>:<name>)` 표기로 참조

### 외부 Agent Pool

**Execute Pool** — task 구현에 사용:

| 유형 | Agent | 비고 |
|------|-------|------|
| 구현 | `oh-my-claudecode:executor` | 코드 변경, multi-file. sonnet |
| 테스트 작성 | `oh-my-claudecode:test-engineer` | TDD + unit/integration/e2e |
| 디버깅 | `oh-my-claudecode:debugger` | 근본 원인 분석 + 최소 수정 |
| 디버깅 (체계적) | `superpowers:systematic-debugging` | 4-phase 근본 원인 추적 |
| 리팩토링 | `oh-my-claudecode:code-simplifier` | 동작 유지 + 가독성 개선. opus |
| 탐색 | `oh-my-claudecode:explore` | 코드베이스 검색. haiku |
| fallback | `general-purpose` | 위 agent가 모두 안 맞을 때만 |

**Verify Pool** — AC 검증에 사용:

| 용도 | Agent | 비고 |
|------|-------|------|
| 테스트 검증 | `oh-my-claudecode:test-engineer` | 테스트 전략 + 커버리지 분석 |
| 코드 품질 | `superpowers:code-reviewer` | diff 기반, Critical/Important/Minor |
| 완료 검증 | `oh-my-claudecode:verifier` | AC 기반 증거 수집 |
| 비판적 리뷰 | `oh-my-claudecode:critic` | 다관점 결함/갭 탐지. opus |
| 보안 감사 | `oh-my-claudecode:security-reviewer` | OWASP Top 10. opus |
| 보안 감사 (심층) | `gstack:cso` | STRIDE, supply chain, CI/CD |

**Codex Integration Pool** — 다른 모델(GPT-5 Codex)의 독립 시각. 모든 호출은
`call-as-codex(<plugin>:<name>)` 표기로 통일:

| 시점 | 호출 | 권한 | 용도 |
|------|------|------|------|
| Phase 2.1 설계 | `call-as-codex(lstack:principal-engineer)` mode: design | write | Codex 가 로컬 코드 직접 읽어 plan.md `## 설계` 작성 |
| Phase 2.2 critique | `call-as-codex(lstack:principal-engineer)` mode: critique | write | Claude-작성 설계를 Codex 가 비판적 검토 → `### Codex 검토` append |
| Phase 3+4 task diff review | `call-as-codex(lstack:principal-engineer)` mode: review | read-only (fail-soft) | task commit diff 에 대한 객관 리뷰 (FF + adversarial 관점 통합) |
| Phase 3+4 복잡성 refactor | `call-as-codex(lstack:principal-engineer)` mode: refactor | write | review 가 복잡성 신호 보고 시 동작 보존 리팩터 |
| Phase 3+4 verdict | `call-as-codex(lstack:judge)` | read-only | evidence 기반 PASS/RALPH/RESCUE/ESCALATE 판정 |
| Ralph-loop 3회 실패 후 | `codex:codex-rescue --write` | write | 다른 모델의 마지막 시도 (외부 agent) |

**호출 패턴** (`call-as-codex`):
1. Codex availability 체크 (script 존재 + 호출 성공).
2. AVAILABLE → `agents/<name>.md` 의 frontmatter 블록 제거 후 본문만 + 호출자 context 를 Codex 에 주입, stdout verbatim 반환.
3. UNAVAILABLE → hard fail. 에러를 메인 컨텍스트에 보고 (판단/조치는 메인 컨텍스트가 결정).
4. Claude fallback 없음 — Codex가 워크플로우의 전제.

예외: Phase 3+4 task diff review 는 fail-soft (review 실패가 task pass 를 차단하지 않음).

**Design Pool** — Phase 2에서 추가 활용 가능:

| 용도 | Agent | 비고 |
|------|-------|------|
| 아키텍처 리뷰 | `oh-my-claudecode:architect` | file:line 증거. read-only, opus |
| 요구사항 분석 | `oh-my-claudecode:analyst` | AC 도출, 갭/엣지케이스. opus |
| 갭 분석 | `hoyeon:gap-analyzer` | 누락 요구사항, 오버엔지니어링 |
| 트레이드오프 | `hoyeon:tradeoff-analyzer` | 리스크 LOW/MED/HIGH |
| 외부 조사 | `hoyeon:external-researcher` | 라이브러리, API 웹 조사 |
| UX 리뷰 | `hoyeon:ux-reviewer` | UX 흐름 영향 분석 |
| 엔지니어링 리뷰 | `gstack:plan-eng-review` | 아키텍처, 테스트 커버리지 리뷰 |

---

## Hooks

| Hook | 타입 | 동작 |
|------|------|------|
| commit-document-reminder | PostToolUse(Bash) | `git commit` 감지 → `/document` 리마인드. async |
| validate-plan | PostToolUse(Write\|Edit) | `plan.md` 수정 시 필수 섹션(배경, 설계, 태스크) 체크 + deprecated `## 요구사항` 경고. sync |

---

## PM Orchestration Flow

**메인 컨텍스트가 직접 오케스트레이션한다.** subagent 는 Agent 호출이 불가하므로
orchestrator 를 subagent 로 띄우지 않는다. lstack skill 이 로드되면 메인 컨텍스트가
PM 역할을 수행하며 전문 agent 들을 직접 Agent 호출로 dispatch 한다.

```
사용자 요청
    │
    ▼
lstack Skill → 메인 컨텍스트가 PM 역할 직접 수행 (오케스트레이션 로직 skill 에 내장)
    │  Phase 0: State Detect ── worklog 스캔 + plan.md 섹션 분석 → 새 작업/resume 판별
    │     0.4 Setup (new work only) ─ 새 작업 분기만. worktree 생성 시 같은 세션이 cd
    │  Phase 1: Interview ─── Agent({subagent_type: "hoyeon:interviewer"})
    │  Phase 2: Design
    │     2.1-2.3 call-as-codex(lstack:principal-engineer) ── Codex가 직접 코드 읽고 조사 + 설계
    │     2.4 Agent({subagent_type: "lstack:planner"}) ── ## 태스크 › ### Tn: skeleton
    │     2.5 Agent({subagent_type: "lstack:test-designer"}) ── 각 태스크 밑에 AC 추가 → 사용자 승인
    │  Phase 3+4: Execute+Verify+Review (pipelined, 메인 컨텍스트가 직접 오케스트레이션)
    │     wave 단위 Agent({run_in_background: true}) 병렬 dispatch
    │       └─ 각 task 완료 → verify ACs ∥ FF review ∥ Codex adversarial(LOC>50) fan-out
    │       └─ evidence 패키지 → call-as-codex(lstack:judge)
    │           → PASS / RALPH / RESCUE / ESCALATE 결정
    │       └─ 복잡성 신호 → call-as-codex(lstack:principal-engineer) review mode fan-out
    │       └─ 3회 ralph 실패 → Codex Rescue 폴백 1회 → 그래도 실패 시 사용자 에스컬레이션
    │  Phase 5: Spec 업데이트 ── docs/spec/ SSOT 반영
    │  Phase 6: Compound ───── /compound (하니스 문제 시)
    │  Phase 7: Close ───────── plan 정리 + PR 인터뷰 + worktree 닫기 (close skill)

pipeline 구조 (wave N에서 task가 끝나는 순간 wave N+1 dispatch와
verify+review fan-out이 동시에 진행 — 어느 task도 sibling을 기다리지 않음):

```
wave 1: T1.exec ──┐                      ┌─→ T1.verify ACs ∥ T1.review
                  ├─ (background) ──────┤
        T2.exec ──┘                      └─→ T2.verify ACs ∥ T2.review
                                          │
wave 2:                            T3.exec ─→ T3.verify ACs ∥ T3.review
                                  (depends on T1)
```
    │
    ▼
plan.md (단일 SOT — docs/worklogs/YYYY-MM-DD-<confirmed_slug>/plan.md, `confirmed_slug` 는 setup 반환값)
```

## plan.md 구조

모든 상태가 단일 markdown 파일에 존재한다. **요구사항 섹션은 없다** — 태스크가 단일 SOT.
**설계는 결정 + 리스크만** (현재 상태/파일 리스트는 태스크 본문으로).
**태스크는 `### Tn:` 헤더**, 상태는 헤더 suffix (`— 진행중` / `— 완료 \`sha\``). 마커 없음 = 대기.
**결과 중심 기록** — 프로세스(검증 방법, 코드 리뷰 로그)는 적지 않는다.
자세한 규칙과 좋은 예시는 `skills/write-plan-md/` 참조.

```markdown
# <goal>

**코드 루트**: `path/prefix/` (선택)

## 배경
2-3 문장. 왜 이 worklog 가 필요한지.

## AS-IS → TO-BE (선택)
한눈에 상태 대비가 필요할 때 표 또는 서술.

## Non-goals (선택)
- 스코프 밖 한 줄씩

## 설계
### 결정
- **결정 내용** — 근거. 대안: X (기각 이유).
  FF 원칙: 가독성↑/예측가능성↑/응집도↑/결합도↓ 중 해당 축.
  복잡성 신호: <신호> → <패턴> 또는 "없음".
### 리스크
- 구체적 위험 — 발현 조건, 완화안

### Codex 검토 (선택)
Codex critique 결과. Phase 2.2 에서 작성.

### 최종 확정 (User 승인 YYYY-MM-DD) (선택)
사용자 설계 승인 기록. 이 블록이 없으면 Phase 2.3 (승인 대기).

## 태스크

### T1: action (exec: executor)
수정: `path:line` — 이유
신규: `path` — 목적

- [ ] AC1: ... (v: verifier)
- [ ] AC2: ... (v: code-reviewer)

### T2: action (exec: executor) — 완료 `abc1234`
수정: `path:line` — 이유

결과 요약 1-2줄. 계획대로면 생략 가능.

**의사결정**: 구현 중 새로 내린 결정. 없으면 생략.
**남은 리스크**: 배포 후 주의점. 없으면 생략.

- [x] AC3: ... (v: verifier)

### T3: action (exec: executor) — 진행중

- [ ] AC4: ... (v: verifier)

## 향후 과제
```

### plan.md 섹션 → Phase 매핑 (SSOT)

orchestrator 가 plan.md 의 섹션 상태로 현재 phase 를 추론할 때 이 표를 참조한다.

| plan.md 섹션 상태 | Phase | 다음 행동 |
|---|---|---|
| `## 배경` 없음 | Phase 0 (State Detect) | 새 worklog 생성 또는 기존 worklog 탐색 |
| `## 배경` 있음, `## 설계` 없음 | Phase 1 (Interview) → Phase 2.1 | interviewer → principal-engineer 설계 |
| `## 설계` › `### 결정` 있음, `### Codex 검토` 없음 | Phase 2.2 (Codex Critique) | principal-engineer (Codex) critique 호출 |
| `### Codex 검토` 있음, `### 최종 확정` 없음 | Phase 2.3 (User 승인 대기) | 사용자에게 설계+검토 제시, 피드백 수렴 |
| `### 최종 확정 (User 승인 YYYY-MM-DD)` 있음 (SSOT), `## 태스크` 에 `### Tn` 없음 | Phase 2.4 (Planner) | planner dispatch |
| `### Tn` 있음, AC 없음 | Phase 2.5 (Test Designer) | test-designer dispatch |
| AC 있음, 대기 태스크 존재 | Phase 3+4 (Execute+Verify+Review) | orchestrator pipeline |
| 모든 태스크 완료 | Phase 5 (Spec 업데이트) | docs/spec/ SSOT 반영 |
| Phase 5 완료 | Phase 6 (Compound) | /compound (선택) |
| Phase 6 완료 | Phase 7 (Close) | close skill (plan 정리 + PR 인터뷰 + worktree 닫기) |

Phase 0.4 Setup 은 새 worklog 생성 전에 호출되어 plan.md 를 생성하지 않는다 (ephemeral). 따라서 위 표의 추론 대상이 아니다. `skills/setup/SKILL.md` 참조.

**Approval contract (SSOT):** `### 최종 확정 (User 승인 YYYY-MM-DD)` 블록은 orchestrator/PM 이 사용자 승인을 확인한 뒤 plan.md `## 설계` 하단에 기록한다. 이 블록의 존재가 Phase 2.3 → 2.4 전이의 유일한 게이트이다. 작성자 · 승인 방식 · 전이 규칙은 이 표에서만 정의하며, 다른 문서는 이 SSOT 를 참조한다.

## Compound Self-Improvement Loop

```
User: "/compound"
    |
    v
Compound Skill (메인 컨텍스트)
    |  Phase 1: 대화에서 문제 패턴 요약
    |  Phase 2: gh api로 레퍼런스 플러그인 탐색
    |  Phase 3: harness-sage dispatch (worktree 격리)
    |  Phase 4: worklog 기록 + spec 업데이트
    |  Phase 5: issue/PR 링크 보고
```
