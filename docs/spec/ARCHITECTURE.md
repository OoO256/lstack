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

### lstack (PM 진입점, start 스킬 대체)
- **경로**: `skills/lstack/SKILL.md`
- **트리거**: `/lstack`, `/start`, "시작", "이어서", "계속", "resume", "이거 만들어", "이거 고쳐"
- **역할**: 단일 진입점. **Phase 0에서 worklog 스캔 + plan.md 섹션 상태로 현재 phase 자동 추론**,
  새 작업 / 이어서 작업을 판별 후 알맞은 phase agent를 dispatch.
- **워크플로우**: [State Detect] → Interview → Design (architect → test-planner → planner) →
  Execute+Verify+Review (orchestrator, pipelined) → Spec 업데이트 → Compound
- **원칙**: `docs/spec/PRINCIPLE.md` 참조

### compound
- **경로**: `skills/compound/SKILL.md`
- **트리거**: `/compound`, "컴파운드"
- **역할**: Self-improvement loop. 대화에서 워크플로우 문제를 분석하고, 레퍼런스 플러그인에서 패턴을 탐색하여 harness-sage가 개선 PR 생성.
- **레퍼런스**: `skills/compound/references.md` (superpowers, gstack, hoyeon, omc)

### document
- **경로**: `skills/document/SKILL.md`
- **트리거**: `/document`, "문서화", 또는 커밋 후 자동 리마인드
- **역할**: 대화를 분석해서 worklog 작성 + spec SSOT 업데이트

---

## Agents

### 내부 Agent

| Agent | 경로 | Phase | 역할 |
|-------|------|-------|------|
| architect | `agents/architect.md` | Design 2.1-2.3 | 수정 범위 + 구현 시뮬레이션 + 디자인 패턴. READ-ONLY |
| test-planner | `agents/test-planner.md` | Design 2.4 | 최소 테스트 시나리오 설계. 코드 작성 안 함 |
| planner | `agents/planner.md` | Design 2.5 | tasks.json 작성. agent pool 참조 |
| orchestrator | `agents/orchestrator.md` | Execute+Verify+Review | wave 단위 백그라운드 병렬 task dispatch + 완료 즉시 verify ACs ∥ code review fan-out + 복잡성 신호 시 simplifier 라우팅 + ralph-loop |
| simplifier | `agents/simplifier.md` | Execute (post-review) | 코드 리뷰가 보고한 복잡성 신호에 패턴 카탈로그 적용. 동작 보존, 회귀 시 자동 revert |
| harness-sage | `agents/harness-sage.md` | Compound | worktree 격리 후 코드 구현 + issue/PR 생성 |

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

**Code Review Skill** — orchestrator가 task별로 자동 호출 (Skill, agent 아님):

| 용도 | Skill | 비고 |
|------|-------|------|
| 프론트엔드 품질 | `frontend-fundamentals:review` | 가독성/예측가능성/응집도/결합도 원칙. task별 commit diff 기반 |

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
| validate-plan | PostToolUse(Write\|Edit) | `plan.md` 수정 시 필수 섹션(설계, 요구사항, 태스크) 존재 여부 체크. sync |

---

## PM Orchestration Flow

```
사용자 요청
    │
    ▼
lstack Skill (PM 진입점)
    │  Phase 0: State Detect ── worklog 스캔 + plan.md 섹션 분석 → 새 작업/resume 판별
    │  Phase 1: Interview ─── hoyeon:interviewer
    │  Phase 2: Design
    │     2.1-2.3 architect ── 수정 범위 + 시뮬레이션 + 패턴
    │     2.4 test-planner ─── 최소 테스트 시나리오
    │     2.5 planner ──────── ## 태스크 작성 (사용자 승인)
    │  Phase 3+4: Execute+Verify+Review (pipelined)
    │     orchestrator ─────── wave 단위 백그라운드 병렬 dispatch
    │       └─ 각 task 완료 → verify ACs ∥ code review (frontend-fundamentals:review) fan-out
    │       └─ review 가 복잡성 신호 보고 → simplifier fan-out (동작 보존 패턴 적용)
    │  Phase 5: Spec 업데이트 ── docs/spec/ SSOT 반영
    │  Phase 6: Compound ───── /compound (하니스 문제 시)

orchestrator pipeline 구조 (wave N에서 task가 끝나는 순간 wave N+1 dispatch와
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
plan.md (단일 SOT — docs/worklogs/YYYY-MM-DD-<goal>/plan.md)
```

## plan.md 구조

모든 상태가 단일 markdown 파일에 존재한다.

```markdown
# <goal>

## 요구사항
- [ ] R1: 요구사항 내용
  - [ ] AC1: 검증 항목 (verify: agent)
- [x] R2: 완료된 요구사항
  - [x] AC2: 통과한 검증 항목

## 설계
(architect가 작성 — 자유 형식 분석, 수정 범위, 설계 결정, 리스크)

## 태스크
- [ ] T1: action (agent: oh-my-claudecode:executor)
  - [ ] AC1: 검증 항목 (verify: superpowers:code-reviewer)

- [x] T2: 완료된 태스크 (agent: oh-my-claudecode:executor)
  - [x] AC2: 통과한 검증 항목
  ### 작업 요약
  ### 의사결정
  ### 암묵지
  ### 검증 방법

## 향후 과제
```

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
