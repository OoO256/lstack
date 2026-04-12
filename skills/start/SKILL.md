---
name: start
description: |
  This skill should be used when the user says "/start", "start", "시작",
  "프로젝트 시작", "이거 만들어", "이거 고쳐", or gives a task that requires planning, scoping,
  and multi-step execution. Lightweight orchestrator that dispatches specialized
  agents per phase. All state lives in a single plan.md file.
---

# Start — Project Orchestrator

가벼운 오케스트레이터. 각 phase를 전문 agent에게 위임하고, plan.md 상태만 추적한다.

**설계 원칙:** `docs/spec/PRINCIPLE.md` 참조.
**plan.md 경로:** `docs/worklogs/YYYY-MM-DD-<goal>/plan.md`

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

PM은 반환된 goal + requirements 초안만 보유.

**사용자에게 goal + requirements 초안을 보여주고 확인.**

## Phase 2: Design

plan.md를 생성하고 3개 agent를 순차 dispatch. 각 agent가 plan.md의 해당 섹션을 작성한다.

**PM이 먼저 plan.md 초안을 생성:**
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

## Phase 3: Execute + Phase 4: Verify

orchestrator agent에게 위임.

```
Agent({
  subagent_type: "lstack:orchestrator",
  prompt: <포함>
    - plan.md 경로
    - "plan.md를 읽고 ## 태스크를 순서대로 실행 + 검증. ## 구현 완료에 기록."
})
```

PM은 orchestrator 완료 후 plan.md를 읽어서 전체 상태만 확인.
모든 task 체크박스가 [x]가 아니면 사용자에게 에스컬레이션.

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
