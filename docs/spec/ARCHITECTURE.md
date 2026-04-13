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
  **Codex Adversarial Design Review** → Execute+Verify+Review (orchestrator, pipelined,
  per-task FF + Codex adversarial fan-out, 복잡성 시 simplifier, 3회 ralph 실패 시
  Codex Rescue 폴백) → Spec 업데이트 → Compound
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
| explorer | `agents/explorer.md` | Design 2.1 | READ-ONLY 기계적 코드베이스 사실 수집 (haiku). 평가/제안 금지. anchor 분리 목적 |
| codex-architect | `agents/codex-architect.md` | Design 2.2-2.3 | **Codex 우선**, fallback = `lstack:architect`. explorer 사실표 + 요구사항으로 1st principles 설계. FF 원칙 + 복잡성 패턴 카탈로그 적용 |
| architect | `agents/architect.md` | Design (fallback) | codex-architect의 fallback. Codex 미가용 시 자동 호출. 동일 산출 (## 설계) |
| test-planner | `agents/test-planner.md` | Design 2.4 | 최소 테스트 시나리오 설계. 코드 작성 안 함 |
| planner | `agents/planner.md` | Design 2.5 | tasks.json 작성. agent pool 참조 |
| orchestrator | `agents/orchestrator.md` | Execute+Verify+Review | wave 단위 백그라운드 병렬 task dispatch + 완료 즉시 verify ACs ∥ FF code review ∥ Codex adversarial(LOC>50) fan-out. **결정은 codex-judge에 위임** (advocacy bias 회피) |
| codex-judge | `agents/codex-judge.md` | Verify 결정 | **Codex 우선**, fallback = `lstack:judge`. 수집된 evidence로 PASS/RALPH/RESCUE/ESCALATE 결정. orchestrator dispatcher와 분리 |
| judge | `agents/judge.md` | Verify 결정 (fallback) | codex-judge의 fallback. 동일 결정 룰 적용. 단독 사용 가능 |
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

**Codex Integration Pool** — 다른 모델(GPT-5 Codex)의 독립 시각. 모두 fail-soft (미설치/실패 시
자동으로 Claude fallback 호출 → 워크플로우 차단 안 함):

| 시점 | 호출 방식 | Fallback | 용도 |
|------|-----------|----------|------|
| Phase 2.2-2.3 설계 (1st principles) | Agent: `lstack:codex-architect` (내부에서 Codex 호출) | `lstack:architect` | 설계 perspective에 다른 모델. explorer 사실표 anchor 분리와 결합 |
| Phase 2.6 (설계 후, 사용자 승인 전) | Bash → `codex-companion adversarial-review --background` | 없음 (skip with warning) | 설계/접근/가정 도전. 사용자가 plan.md + Codex 도전을 함께 보고 승인 |
| 각 task 완료 후 fan-out (LOC > 50 게이트) | Bash → `codex-companion adversarial-review --wait` | 없음 (skip with warning) | 변경 부분에 대한 2nd opinion. FF review와 평행 |
| Verify 후 PASS/RALPH/RESCUE/ESCALATE 결정 | Agent: `lstack:codex-judge` (내부에서 Codex 호출) | `lstack:judge` | 판정 perspective에 다른 모델. orchestrator dispatcher와 분리 (advocacy bias 회피) |
| Ralph-loop 3회 실패 후 사용자 에스컬레이션 직전 | Agent: `codex:codex-rescue --write` | 없음 (바로 에스컬레이션) | 다른 모델의 마지막 시도. 통과 시 정상 완료 |

**Fallback 패턴** — `codex-*` 접두 agent는 모두 thin wrapper:
1. Codex availability 체크 (script 존재 + 호출 성공)
2. AVAILABLE → Codex 호출 (persona + XML 컨트랙트 적용)
3. UNAVAILABLE 또는 실패 → 동명 fallback Claude agent로 자동 dispatch
4. 어느 backend 갔는지 `*_BACKEND` 표시로 보고

이 패턴 덕분에 호출자(PM/orchestrator)는 Codex 가용성을 신경 쓸 필요 없음. Codex 요금제가
달라도 워크플로우는 항상 작동.

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

```
사용자 요청
    │
    ▼
lstack Skill (PM 진입점)
    │  Phase 0: State Detect ── worklog 스캔 + plan.md 섹션 분석 → 새 작업/resume 판별
    │  Phase 1: Interview ─── hoyeon:interviewer
    │  Phase 2: Design
    │     2.1 explorer ──────── READ-ONLY 사실표 (anchor 분리)
    │     2.2-2.3 codex-architect (Codex 우선, fallback = architect)
    │                            ─ 사실표 + 요구사항 → 1st principles 설계
    │     2.4 planner ──────── ## 태스크 › ### 대기 (skeleton — action + exec + 힌트 1-3줄)
    │     2.5 test-planner ─── 각 태스크 밑에 AC 추가 (요구사항 섹션 없음)
    │     2.6 Codex adversarial ─ design 자체 도전 (assumption/approach/tradeoff)
    │                              → plan.md + Codex 도전을 함께 사용자에게 (사용자 승인)
    │  Phase 3+4: Execute+Verify+Review (pipelined)
    │     orchestrator ─────── wave 단위 백그라운드 병렬 dispatch
    │       └─ 각 task 완료 → verify ACs ∥ FF review ∥ Codex adversarial(LOC>50) fan-out
    │       └─ evidence 패키지 → codex-judge (Codex 우선, fallback = judge)
    │           → PASS / RALPH / RESCUE / ESCALATE 결정
    │       └─ 복잡성 신호 → simplifier fan-out (동작 보존 패턴 적용)
    │       └─ 3회 ralph 실패 → Codex Rescue 폴백 1회 → 그래도 실패 시 사용자 에스컬레이션
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

모든 상태가 단일 markdown 파일에 존재한다. **요구사항 섹션은 없다** — 태스크가 단일 SOT.
**설계는 결정 + 리스크만** (현재 상태/파일 리스트는 태스크 본문으로). **태스크는 완료→진행중→대기 시간 순**.
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

## 태스크
(순서: 완료 → 진행 중 → 대기 = 시간 순)

### 완료
- [x] T0: action (exec: executor) — commit `abc1234`
  - [x] AC0: ... (v: verifier) ✓
  ### 작업 요약 (필수, 1-3줄)
  ### 검증 방법 (필수)
  ### 코드 리뷰 (필수 — orchestrator)
  ### 의사결정 (선택 — 상위 설계 결정 중복 금지)
  ### 남은 리스크 (선택 — 이전 "암묵지")

### 진행 중
- [→] T1: action (exec: executor) — dispatched 2026-04-13 14:02
  - [ ] AC1: ... (v: verifier)

### 대기
- [ ] T2: action (exec: executor)
  수정: `path:line` — 이유
  신규: `path` — 목적
  - [ ] AC2: ... (v: code-reviewer)

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
