# Architecture

lstack 플러그인의 구조와 컴포넌트 간 관계.

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

## Compound Self-Improvement Loop

사용자가 작업 중 문제를 겪으면 `/compound`로 플러그인 자체를 개선하는 루프.

### Data Flow

```
User: "/compound"
    |
    v
Compound Skill (메인 컨텍스트)
    |  Phase 1: 대화에서 문제 패턴 요약
    |  Phase 2: gh api로 레퍼런스 플러그인 탐색
    |  Phase 3: harness-sage 에이전트 dispatch (worktree 격리)
    |  Phase 4: worklog 기록 + spec 업데이트
    |  Phase 5: 사용자에게 issue/PR 링크 보고
    |
    v
Harness-Sage (격리된 worktree)
    |  1. 브랜치 생성
    |  2. 코드 변경
    |  3. gh issue create
    |  4. gh pr create
    |  5. 결과 반환
```

### Components

| Component | Path | Role |
|-----------|------|------|
| compound skill | `skills/compound/SKILL.md` | 문제 분석 + 레퍼런스 탐색 + 에이전트 dispatch + 문서화 |
| harness-sage agent | `agents/harness-sage.md` | worktree에서 코드 구현 + issue/PR 생성 |
| reference registry | `skills/compound/references.md` | 레퍼런스 플러그인 GitHub URL 목록 |

### Design Decisions

- **Worktree 격리**: 에이전트가 사용자의 작업 브랜치에 영향을 주지 않음
- **GitHub URL 기반 레퍼런스**: git-tracked, portable. 로컬 클론 불필요
- **역할 분리**: 스킬(메인 컨텍스트)이 분석, 에이전트(worktree)가 구현

## PM Orchestration

사용자 요청을 interview → design → execute → verify 하는 핵심 워크플로우.
PM은 가벼운 오케스트레이터 — 각 phase를 전문 agent에게 위임하고 tasks.json 상태만 추적.

### Flow

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
    │
    ├─ Execute Pool ── omc:executor, omc:test-engineer, omc:debugger, ...
    └─ Verify Pool ─── superpowers:code-reviewer, omc:verifier, omc:critic, ...
```

### tasks.json

단일 SOT. 스키마: `skills/pm/tasks-schema.json`.

| Field | Description |
|-------|-------------|
| goal | 사용자 의도 한 줄 요약 |
| requirements[] | id, type (requirement\|design_decision), content, rationale?, status, acceptance_criteria[] |
| requirements[].acceptance_criteria[] | id, check, verify_agent, status (pending/pass/fail) |
| tasks[] | id, action, status, agent, depends_on, acceptance_criteria[], worklog |
| tasks[].acceptance_criteria[] | id, check, verify_agent, status (pending/pass/fail) |
| tasks[].worklog | summary, decisions, insights, changes |

### Components

| Component | Path | Role |
|-----------|------|------|
| pm skill | `skills/pm/SKILL.md` | 가벼운 6-phase 오케스트레이터 |
| architect agent | `agents/architect.md` | Design 2.1-2.3: 구조 설계 |
| test-planner agent | `agents/test-planner.md` | Design 2.4: 테스트 시나리오 |
| planner agent | `agents/planner.md` | Design 2.5: tasks.json 작성 |
| orchestrator agent | `agents/orchestrator.md` | Phase 3+4: 실행 + 검증 |
| tasks schema | `skills/pm/tasks-schema.json` | 스키마 정의 |
| validation hook | `hooks/scripts/validate-tasks.sh` | Write/Edit 시 스키마 체크 |
