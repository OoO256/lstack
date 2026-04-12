---
name: start
description: |
  This skill should be used when the user says "/start", "start", "시작",
  "프로젝트 시작", "이거 만들어", "이거 고쳐", or gives a task that requires planning, scoping,
  and multi-step execution. Lightweight orchestrator that dispatches specialized
  agents per phase. Does NOT accumulate phase results in its own context.
---

# PM — Project Manager Orchestrator

가벼운 오케스트레이터. 각 phase를 전문 agent에게 위임하고, tasks.json 상태만 추적한다.

**설계 원칙:** `docs/spec/PRINCIPLE.md` 참조.
**스키마:** `skills/start/tasks-schema.json` 참조.

## Workflow

```
Phase 1: Interview → Phase 2: Design → (사용자 승인) → Phase 3: Execute → Phase 4: Verify → Phase 5: Document → Phase 6: Compound
```

## Phase 1: Interview

사용자의 의도를 파악하고 requirements 초안을 정리한다.

**Agent dispatch:**
```
Agent({
  subagent_type: "hoyeon:interviewer",
  prompt: <포함>
    - 사용자의 원래 요청
    - "goal, motivation, acceptance criteria, non-goals를 명확히 해주세요"
    - "결과를 structured로 반환: goal, requirements 초안"
})
```

PM은 반환된 goal + requirements 초안만 보유. 상세 대화 내용은 agent context와 함께 소멸.

**사용자에게 goal + requirements 초안을 보여주고 확인.**

## Phase 2: Design

3개 agent를 순차 dispatch. 각 agent는 이전 agent의 결과를 입력으로 받는다.

### 2.1~2.3: architect

```
Agent({
  subagent_type: "lstack:architect",
  prompt: <포함>
    - goal
    - requirements 초안
    - "수정 범위 파악 + 구현 시뮬레이션 + 디자인 패턴 결정"
    - "JSON으로 반환: scope, design_decisions, risks"
})
```

### 2.4: test-planner

```
Agent({
  subagent_type: "lstack:test-planner",
  prompt: <포함>
    - goal
    - requirements 초안
    - "docs/worklogs/YYYY-MM-DD-<goal>/design.md 를 읽고 architect의 분석을 참고하세요"
    - "최소 테스트 시나리오 설계. JSON으로 반환: test_scenarios, coverage_gaps"
})
```

### 2.5: planner

```
Agent({
  subagent_type: "lstack:planner",
  prompt: <포함>
    - goal
    - requirements 초안
    - "docs/worklogs/YYYY-MM-DD-<goal>/design.md 를 읽고 architect의 분석을 참고하세요"
    - test-planner 반환값
    - Execute Agent Pool 목록
    - Verify Agent Pool 목록
    - "tasks.json을 작성하세요. 스키마: skills/start/tasks-schema.json"
})
```

**사용자에게 tasks.json을 보여주고 승인을 받은 후 Phase 3로 진행.**

## Phase 3: Execute + Phase 4: Verify

executor agent에게 위임. executor가 task별 실행 + AC별 검증 + ralph-loop를 모두 처리.

```
Agent({
  subagent_type: "lstack:orchestrator",
  prompt: <포함>
    - tasks.json 경로
    - "tasks.json을 읽고 task별로 실행 + 검증. 완료 시 보고."
})
```

PM은 executor 완료 후 tasks.json을 읽어서 전체 상태만 확인.
모든 task가 `verified`가 아니면 사용자에게 에스컬레이션.

## Phase 5: Document

```
/document 스킬 호출
```

추가로 tasks.json을 worklog 디렉토리에 아카이빙:
```bash
cp tasks.json docs/worklogs/YYYY-MM-DD-<goal>/tasks.json
```

## Phase 6: Compound

작업 과정에서 하니스 자체의 문제점이 발견되었는지 검토한다.

1. tasks.json의 worklog를 읽고 하니스 문제를 식별:
   - PM 워크플로우 중 비효율적이었던 부분
   - agent 선택이 부적절했거나 누락된 agent 유형
   - tasks.json 스키마에 부족한 필드
   - 검증 과정에서 반복 실패한 패턴

2. 문제 발견 시 → `/compound` 스킬 호출
3. 문제 없으면 → 스킵

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

Phase 2에서 추가로 활용 가능:

| 용도 | Agent | 비고 |
|------|-------|------|
| 아키텍처 리뷰 | `oh-my-claudecode:architect` | file:line 증거. read-only, opus |
| 요구사항 분석 | `oh-my-claudecode:analyst` | AC 도출, 갭/엣지케이스. opus |
| 갭 분석 | `hoyeon:gap-analyzer` | 누락 요구사항, 오버엔지니어링 |
| 트레이드오프 | `hoyeon:tradeoff-analyzer` | 리스크 LOW/MED/HIGH |
| 외부 조사 | `hoyeon:external-researcher` | 라이브러리, API 웹 조사 |
| UX 리뷰 | `hoyeon:ux-reviewer` | UX 흐름 영향 분석 |
| 엔지니어링 리뷰 | `gstack:plan-eng-review` | 아키텍처, 테스트 커버리지 리뷰 |
