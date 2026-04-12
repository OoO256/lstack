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
│   ├── worklog/                  # 날짜별 작업 로그
│   ├── spec/                     # 분야별 SSOT 문서
│   └── plan/                     # 구현 계획
└── tests/                        # 테스트
```

---

## Skills

### pm
- **경로**: `skills/pm/SKILL.md`
- **트리거**: `/pm`, "프로젝트 시작", "이거 만들어", "이거 고쳐"
- **역할**: 가벼운 6-phase 오케스트레이터. 각 phase를 전문 agent에게 위임하고 tasks.json 상태만 추적.
- **워크플로우**: Interview → Design (architect → test-planner → planner) → Execute+Verify (orchestrator) → Document → Compound
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
| orchestrator | `agents/orchestrator.md` | Execute+Verify | task별 agent dispatch + AC별 검증 + ralph-loop |
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
| validate-tasks | PostToolUse(Write\|Edit) | `tasks.json` 수정 시 `check-jsonschema`로 스키마 validation. sync. 의존성: `pip install check-jsonschema` |

---

## PM Orchestration Flow

```
사용자 요청
    │
    ▼
PM Skill (가벼운 오케스트레이터)
    │  Phase 1: Interview ─── hoyeon:interviewer
    │  Phase 2: Design
    │     2.1-2.3 architect ── 수정 범위 + 시뮬레이션 + 패턴
    │     2.4 test-planner ─── 최소 테스트 시나리오
    │     2.5 planner ──────── tasks.json 작성 (사용자 승인)
    │  Phase 3: Execute ────── orchestrator (agent pool dispatch)
    │  Phase 4: Verify ─────── orchestrator (AC별 병렬 검증 + ralph-loop)
    │  Phase 5: Document ───── /document
    │  Phase 6: Compound ───── /compound (하니스 문제 시)
    │
    ▼
tasks.json (단일 SOT)
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

## tasks.json

단일 SOT. 스키마: `skills/pm/tasks-schema.json`.

| Field | Description |
|-------|-------------|
| goal | 사용자 의도 한 줄 요약 |
| design | architect 분석 결과 파일 경로 (`.lstack/design.md`) |
| requirements[] | id, type (requirement\|design_decision), content, rationale?, status, acceptance_criteria[] |
| requirements[].acceptance_criteria[] | id, check, verify_agent, status (pending/pass/fail) |
| tasks[] | id, action, status, agent, depends_on, acceptance_criteria[], worklog |
| tasks[].acceptance_criteria[] | id, check, verify_agent, status (pending/pass/fail) |
| tasks[].worklog | summary, decisions, insights, changes |
