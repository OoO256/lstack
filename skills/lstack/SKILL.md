---
name: lstack
description: |
  This skill should be used when the user says "/lstack", "lstack", "/start", "start",
  "시작", "프로젝트 시작", "이거 만들어", "이거 고쳐", "이어서", "이어서 해", "계속", "resume",
  or gives a task that requires planning, scoping, and multi-step execution.
  Auto-detects whether to start fresh or resume an in-progress plan.md, then dispatches
  the appropriate phase agent. Replaces the old `start` skill.
---

# lstack — Resume-Aware Workflow Entry

lstack 작업의 단일 진입점. **상태를 먼저 파악**하고, 새로 시작하는지 / 이어서 하는지 판별한 후
워크플로우의 알맞은 phase 부터 자동으로 이어 진행한다.

**설계 원칙:** `docs/spec/PRINCIPLE.md` 참조.
**plan.md 경로:** `docs/worklogs/YYYY-MM-DD-<goal>/plan.md`

## Workflow

```
[State Detect] → Phase 1: Interview → Phase 2: Design → (사용자 승인) →
                 Phase 3+4: Execute+Verify+Review (pipelined, orchestrator) →
                 Phase 5: Spec 업데이트 → Phase 6: Compound
```

Phase 3+4는 orchestrator 안에서 wave 단위 백그라운드 병렬로 fan-out 된다. PM은 한 번만
dispatch 하고 결과 요약만 받는다.

## Phase 0: State Detection (반드시 먼저)

새 작업인지 이어서인지 자동 판별. 아래 순서로 결정한다.

### 0.1 worklog 스캔

```bash
ls -1dt docs/worklogs/*/  2>/dev/null | head -10
```

가장 최근 worklog부터 `plan.md`를 읽어 상태를 본다 (없으면 → 새 작업).

### 0.2 사용자 의도 추론

- 발화에 **"이어서", "계속", "resume"** 또는 기존 worklog 이름이 포함 → 그 worklog로 이어서
- 발화가 **새로운 goal/요청**이고 in-progress worklog가 있으면 → 사용자에게 선택 질문:
  > "진행 중인 작업이 있어요: `<worklog dir>` (Phase X). 이어서 할까요, 새 작업으로 시작할까요?"
- in-progress worklog 없음 + 새 goal → 새 작업 (Phase 1로)

### 0.3 Phase 추론 (resume 시)

대상 plan.md의 섹션 상태를 보고 어느 phase부터 이어 갈지 결정한다.

| plan.md 상태 | 다음 phase |
|--------------|-----------|
| `## 요구사항` 없음/비어있음 | **Phase 1** (Interview 처음부터) |
| `## 요구사항`만 있고 `## 설계` 비어있음 | **Phase 2.1-2.3** (architect) |
| `## 설계` 작성됐고 `## 요구사항` 항목에 AC 체크박스 없음 | **Phase 2.4** (test-planner) |
| `## 요구사항`에 AC는 있고 `## 태스크` 비어있음 | **Phase 2.5** (planner) → 사용자 승인 |
| `## 태스크`에 `[ ]` 미완료 항목이 있음 | **Phase 3+4** (orchestrator) |
| `## 태스크` 모두 `[x]`이고 spec 변경 미확인 | **Phase 5** (Spec 업데이트) |
| 모두 완료 | **Phase 6** (Compound) — 문제 패턴만 점검 |

판별 결과를 사용자에게 짧게 보고:
> "재개합니다: `<worklog>`, Phase X부터 진행합니다."

그리고 해당 phase 섹션으로 이동.

## Phase 1: Interview

사용자의 의도를 파악하고 requirements 초안을 정리한다.

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
`docs/worklogs/YYYY-MM-DD-<slug>/` 를 생성하고 plan.md 초안을 작성.

## Phase 2: Design

plan.md 초안 (없으면 생성):

```markdown
# <goal>

## 요구사항
- [ ] R1: <requirement 1>
- [ ] R2: <requirement 2>

## 설계
(architect가 작성)

## 태스크
(planner가 작성 — orchestrator가 완료 시 체크박스 + worklog 추가)

## 향후 과제
```

### 2.1~2.3: architect

```
Agent({
  subagent_type: "lstack:architect",
  prompt: <포함>
    - plan.md 경로
    - "plan.md를 읽고 ## 설계 섹션을 작성하세요"
})
```

### 2.4: test-planner

```
Agent({
  subagent_type: "lstack:test-planner",
  prompt: <포함>
    - plan.md 경로
    - "plan.md를 읽고 ## 요구사항의 각 항목에 AC 체크박스를 추가하세요"
})
```

### 2.5: planner

```
Agent({
  subagent_type: "lstack:planner",
  prompt: <포함>
    - plan.md 경로
    - Execute Agent Pool 목록
    - Verify Agent Pool 목록
    - "plan.md를 읽고 ## 태스크 섹션을 작성하세요"
})
```

**사용자에게 plan.md를 보여주고 승인을 받은 후 Phase 3로 진행.**

## Phase 3+4: Execute + Verify + Code Review (Pipelined)

orchestrator agent에게 위임. orchestrator 내부에서 wave 단위 백그라운드 병렬로
구현 → (verify ACs ∥ 코드 리뷰) 가 fan-out 된다.

```
Agent({
  subagent_type: "lstack:orchestrator",
  prompt: <포함>
    - plan.md 경로
    - "plan.md ## 태스크를 wave 단위 파이프라인 병렬로 실행+검증+리뷰. 결과를 task별 worklog에 기록."
})
```

PM 책임:
- orchestrator 완료 후 plan.md를 읽어 전체 상태 확인
- 모든 task 체크박스가 [x]가 아니면 사용자에게 에스컬레이션
- 코드 리뷰에서 발견된 Critical/Important 이슈가 `## 향후 과제`에 추가됐는지 확인 후 사용자에게 보고

## Phase 5: Spec 업데이트

작업 결과가 spec SSOT에 영향을 주는지 확인하고 업데이트한다.

1. plan.md의 ## 태스크 worklog를 읽는다.
2. `docs/spec/` 의 기존 문서를 확인:
   - 아키텍처 변경 → `ARCHITECTURE.md` 업데이트
   - 원칙 변경 → `PRINCIPLE.md` 업데이트
   - 해당 없으면 → 스킵
3. 기존 문서를 업데이트. 겹치는 내용은 중복 추가하지 않음.

## Phase 6: Compound

plan.md의 ## 태스크 worklog를 읽고 하니스 문제를 식별:
- 비효율적이었던 워크플로우
- 부적절했던 agent 선택
- 반복 실패 패턴

문제 발견 시 → `/compound` 스킬 호출.
문제 없으면 → 스킵.

## Resume 안전 원칙

- **plan.md 의 기존 내용을 절대 덮어쓰지 않는다.** 이어서 시작하는 phase의 agent에게는
  "기존 섹션을 보존하고 아직 없는 부분만 채우라"고 지시한다.
- Phase 추론이 애매하면 (예: `## 태스크`에 일부 [x], 일부 [ ]) → 사용자에게 한 번 확인.
- worklog 디렉토리는 절대 삭제하지 않는다. 새 시도는 새 디렉토리.

## Agent Pool Reference

PM은 Phase 2.5에서 planner에게 이 목록을 전달한다.

### Execute Agent Pool

| 유형 | Agent | 비고 |
|------|-------|------|
| 구현 | `oh-my-claudecode:executor` | 코드 변경, multi-file. sonnet |
| 테스트 작성 | `oh-my-claudecode:test-engineer` | TDD + unit/integration/e2e |
| 디버깅 | `oh-my-claudecode:debugger` | 근본 원인 분석 + 최소 수정 |
| 디버깅 (체계적) | `superpowers:systematic-debugging` | 4-phase 근본 원인 추적 |
| 리팩토링 | `oh-my-claudecode:code-simplifier` | 동작 유지 + 가독성 개선. opus |
| 탐색 | `oh-my-claudecode:explore` | 코드베이스 검색. haiku |
| fallback | `general-purpose` | 위 agent가 모두 안 맞을 때만 |

### Verify Agent Pool

| 용도 | Agent | 비고 |
|------|-------|------|
| 테스트 검증 | `oh-my-claudecode:test-engineer` | 테스트 전략 + 커버리지 분석 |
| 코드 품질 | `superpowers:code-reviewer` | diff 기반, Critical/Important/Minor |
| 완료 검증 | `oh-my-claudecode:verifier` | AC 기반 증거 수집 |
| 비판적 리뷰 | `oh-my-claudecode:critic` | 다관점 결함/갭 탐지. opus |
| 보안 감사 | `oh-my-claudecode:security-reviewer` | OWASP Top 10. opus |
| 보안 감사 (심층) | `gstack:cso` | STRIDE, supply chain, CI/CD |

### Design Agent Pool

| 용도 | Agent | 비고 |
|------|-------|------|
| 아키텍처 리뷰 | `oh-my-claudecode:architect` | file:line 증거. read-only, opus |
| 요구사항 분석 | `oh-my-claudecode:analyst` | AC 도출, 갭/엣지케이스. opus |
| 갭 분석 | `hoyeon:gap-analyzer` | 누락 요구사항, 오버엔지니어링 |
| 트레이드오프 | `hoyeon:tradeoff-analyzer` | 리스크 LOW/MED/HIGH |
| 외부 조사 | `hoyeon:external-researcher` | 라이브러리, API 웹 조사 |
| UX 리뷰 | `hoyeon:ux-reviewer` | UX 흐름 영향 분석 |
| 엔지니어링 리뷰 | `gstack:plan-eng-review` | 아키텍처, 테스트 커버리지 리뷰 |
