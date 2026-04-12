---
name: pm
description: |
  This skill should be used when the user says "/pm", "pm", "프로젝트 시작",
  "이거 만들어", "이거 고쳐", or gives a task that requires planning, scoping,
  and multi-step execution. Orchestrates the full workflow: interview → design →
  plan → execute → verify → document → compound.
---

# PM — Project Manager Orchestrator

사용자의 요청을 인터뷰로 명확히 하고, 설계하고, tasks.json으로 계획을 세우고, agent pool에서 적절한 실행자를 선택하여 dispatch하고, 검증하고, 문서화하고, 하니스를 개선한다.

**설계 원칙:** `docs/spec/PRINCIPLE.md` 참조.

## Phase 1: Interview

사용자의 의도를 파악하고 명확하게 한다.

1. 사용자의 요청을 읽고, 부족한 정보를 식별한다.
2. 한 번에 하나씩 질문한다 (가능하면 multiple choice).
3. 다음이 명확해질 때까지 계속한다:
   - 무엇을 원하는지 (goal)
   - 왜 원하는지 (motivation)
   - 성공 기준이 무엇인지 (acceptance criteria)
   - 범위 밖은 무엇인지 (non-goals)

결과: `goal`과 `requirements` 초안 정리.

## Phase 2: Design

코드 상태를 확인하고, 구현을 시뮬레이션하고, 클린한 구조와 검증 방법을 설계한다.

### 2.1 수정 범위 파악
1. 관련 파일/모듈을 Glob, Grep, Read로 탐색.
2. 수정이 필요한 파일 목록을 작성.
3. 의존성과 영향 범위를 확인.

### 2.2 구현 시뮬레이션
1. 요구사항을 코드 변경으로 머릿속에서 변환해본다.
2. 변경이 기존 코드에 미치는 영향을 추적한다.
3. 예상되는 난관과 엣지 케이스를 식별한다.

### 2.3 디자인 패턴 결정
1. 기존 코드베이스의 패턴을 파악한다.
2. 요구사항을 최대한 클린하게 구현할 수 있는 구조를 설계한다.
   - 책임 분리, 인터페이스 경계, 의존성 방향
   - 기존 패턴을 따르되, 개선이 필요하면 제안
3. 설계 결정과 근거를 기록한다.

### 2.4 테스트 시나리오 작성
1. 요구사항을 검증하기 위한 최소한의 테스트 케이스를 도출한다.
   - 핵심 동작을 커버하되, 중복 테스트를 배제
   - happy path + 핵심 edge case만 — 불필요하게 많은 케이스 금지
2. 각 테스트가 어떤 requirement/AC를 검증하는지 매핑한다.
3. 테스트 실행 방법 (command, assertion, inspection)을 결정한다.

결과: 수정 범위 + 설계 결정 + 테스트 시나리오 → Phase 3의 task 분해와 AC 정의에 반영.

## Phase 3: Plan

tasks.json을 작성한다.

1. 작업을 task로 분해한다.
2. 각 task마다 구체적인 acceptance criteria를 정의한다:
   - **원칙 2.1**: context 없는 다른 agent가 봐도 동일하게 판단 가능한 수준
   - **원칙 2.1**: 불필요하게 엄밀하지 않게
3. task 간 의존성을 설정한다.
4. 각 task에 적절한 agent를 지정한다 (agent pool에서 선택).
5. Phase 2의 설계 결정을 requirements에 `design_decision` 타입으로 추가한다.

### Agent Pool

task 유형에 따라 agent를 선택:

| 유형 | Agent | 비고 |
|------|-------|------|
| 일반 구현 | `general-purpose` | fresh subagent |
| 테스트 작성 | `oh-my-claudecode:test-engineer` | TDD + unit/integration/e2e 작성 + 커버리지 갭 분석 |
| 코드 리뷰 | `superpowers:code-reviewer` | diff 기반 코드 품질 + 계획 대비 검증 |
| 디버깅 | 사용 가능한 debugger agent | 외부 플러그인 |
| 아키텍처 | 사용 가능한 architect agent | 외부 플러그인 |
| 리팩토링 | `general-purpose` | fresh subagent |

사용 가능한 외부 agent가 없으면 `general-purpose`로 fallback.

### Verify Agent Pool

AC 검증에 사용할 agent:

| 용도 | Agent | 비고 |
|------|-------|------|
| 테스트 작성/검증 | `oh-my-claudecode:test-engineer` | 테스트 전략 + 작성 + 커버리지 분석 |
| 코드 품질 | `superpowers:code-reviewer` | diff 기반 리뷰, Critical/Important/Minor 분류 |

### tasks.json 작성

스키마는 `skills/pm/tasks-schema.json` 참조. 예시:

```json
{
  "goal": "인증 API 구현",
  "requirements": [
    {
      "id": "R1", "type": "requirement", "content": "JWT 기반 로그인 API가 동작한다", "status": "pending",
      "acceptance_criteria": [
        { "id": "AC1", "check": "POST /auth/login이 유효한 credential에 200 + JWT 반환", "verify_agent": "oh-my-claudecode:test-engineer", "status": "pending" },
        { "id": "AC2", "check": "잘못된 credential에 401 반환", "verify_agent": "oh-my-claudecode:test-engineer", "status": "pending" }
      ]
    },
    {
      "id": "R2", "type": "requirement", "content": "기존 코드 패턴을 따른다", "status": "pending",
      "acceptance_criteria": [
        { "id": "AC3", "check": "auth 모듈이 기존 미들웨어 패턴을 따른다", "verify_agent": "superpowers:code-reviewer", "status": "pending" }
      ]
    },
    {
      "id": "R3", "type": "design_decision", "content": "passport.js 대신 직접 미들웨어로 구현", "rationale": "의존성 최소화 + 기존 미들웨어 패턴과 일관성", "status": "pending",
      "acceptance_criteria": [
        { "id": "AC4", "check": "passport.js 의존성이 없고 직접 미들웨어로 구현되어 있다", "verify_agent": "superpowers:code-reviewer", "status": "pending" }
      ]
    }
  ],
  "tasks": [
    {
      "id": "T1",
      "action": "로그인 엔드포인트 구현",
      "status": "pending",
      "agent": "general-purpose",
      "depends_on": [],
      "acceptance_criteria": [
        { "id": "AC1", "check": "POST /auth/login이 유효한 credential에 200 + JWT 반환", "verify_agent": "oh-my-claudecode:test-engineer", "status": "pending" },
        { "id": "AC2", "check": "잘못된 credential에 401 반환", "verify_agent": "oh-my-claudecode:test-engineer", "status": "pending" }
      ]
    }
  ]
}
```

tasks.json 경로: 프로젝트 루트 또는 `.lstack/tasks.json`.

**사용자에게 tasks.json을 보여주고 승인을 받은 후 Phase 4로 진행.**

## Phase 4: Execute

task를 순서대로 (또는 의존성 없으면 병렬로) 실행한다.

각 task마다:

1. **tasks.json에서 task 읽기** — status를 `in_progress`로 업데이트.

2. **Agent dispatch** — fresh subagent로 spawn:
   ```
   Agent({
     subagent_type: "<task.agent>",
     prompt: <포함>
       - task.action (무엇을 할지)
       - task.acceptance_criteria (검증 기준 — 이것을 통과해야 함)
       - 관련 requirements (이 task가 충족해야 할 요구사항)
   })
   ```

3. **완료 시** — tasks.json에서 task status를 `done`으로 업데이트.

4. **검증 (Phase 5로)** — 바로 검증 진행.

## Phase 5: Verify

**원칙 1.2: 구현한 agent가 아닌 별도 verifier가 검증.**
**원칙 2.2: AC 항목별 최소 범위 병렬 검증.**

각 task의 acceptance_criteria에 대해:

1. **AC 항목별 외부 검증 agent를 병렬 dispatch:**
   ```
   // AC가 3개면 3개의 agent를 동시에 spawn (각 AC의 verify_agent 사용)
   Agent({
     subagent_type: "<AC.verify_agent>",
     prompt: <포함>
       - AC.check (검증할 항목)
       - task.action (무엇이 구현되었는지)
       - 관련 파일 경로
       - "pass 또는 fail로만 답하고, fail이면 구체적 이유를 포함"
   })
   ```

2. **결과 수집:**
   - 모든 AC가 pass → tasks.json에서 task status를 `verified`로 업데이트.
   - 하나라도 fail → task status를 `failed`로 업데이트.

3. **Ralph-loop (fail 시):**
   - 실패한 AC의 evidence와 suggestion을 포함하여 agent를 재dispatch.
   - 재구현 후 다시 Phase 5 검증.
   - 최대 3회 반복. 3회 실패 시 사용자에게 에스컬레이션.

4. **모든 task가 verified 되면** → 전체 검증:
   - tasks.json의 모든 task.status가 `verified`인지 확인.
   - goal에 대한 최종 검증 agent dispatch (전체 맥락에서 goal 달성 여부).

## Phase 6: Document

`/document` 스킬을 호출하여 worklog + spec 업데이트.

추가로 tasks.json 자체도 docs/plan/ 에 아카이빙:
```bash
cp tasks.json docs/plan/YYYY-MM-DD-<goal-slug>-tasks.json
```

## Phase 7: Compound

작업 과정에서 하니스 자체의 문제점이 발견되었는지 검토한다.

1. **하니스 문제 감지:**
   - PM 워크플로우 중 비효율적이었던 부분이 있었는가
   - agent 선택이 부적절했거나 누락된 agent 유형이 있었는가
   - tasks.json 스키마에 부족한 필드가 있었는가
   - 검증 과정에서 반복적으로 실패한 패턴이 있었는가

2. **문제가 발견되면:**
   - `/compound` 스킬을 호출하여 harness-sage가 개선 PR 생성
   - 사용자에게 발견된 문제와 개선 방향을 보고

3. **문제가 없으면:**
   - 스킵
