# Harness Implementation Principles

agent는 context가 쌓이면 성능이 저하되고, 최초 지시사항을 망각하고, 자기 확신에 빠진다.
이를 최소화하기 위해 다음 원칙을 준수해서 하니스를 구현한다.

## 1. 작업 역할간 context 분리

### 1.1 역할간 agent 분리
역할별로 전문 agent를 정의하여 전문성 희석을 방지한다.
각 agent는 fresh context로 spawn하며, 이전 세션 context를 상속하지 않는다.

### 1.2 자기 평가 금지
작업을 구현하는 agent와 이를 검증/평가하는 agent는 반드시 분리한다.
같은 agent가 자기 작업을 평가하면 확증 편향이 발생한다.

### 1.3 call-codex-cli 사용
1.1, 1.2 원칙을 달성하기 위해서 call-codex-cli 를 사용하여 codex agent를 spawn 할 수 있다.
subagent나 teammate는 일정 수준 context가 공유되는 반면 codex는 보다 fresh하고 객관적인 판단을 제공한다.

## 2. 모든 요건은 검증을 기본으로

agent가 구현 중에 사용자의 의도를 망각하는 현상이 빈번하게 발생한다.
이를 최소화하기 위해, 사용자의 모든 의도와 지시는 항상 구현 전에 구체적인 검증 항목으로 분해하고, 구현 후 항상 검증하는 TDD 방식으로 개발한다.
검증 기준을 통과할 때까지 계속 개선을 반복하는 ralph-loop 방식을 차용한다.

### 2.1 검증 범위
검증 항목은 너무 좁거나 너무 넓은 범위로 설정해서는 안 된다.

- 작업 context를 공유하지 않는 다른 agent가 평가해도 항상 같은 결과가 나오도록 구체적이고 명확하게 설정해야 한다.
- 필수적이지 않은 조건으로 지나치게 엄밀하게 설정해서 불필요한 개선 루프를 반복하게 해서는 안 된다.

### 2.2 최소 범위 검증 원칙
작업 결과를 정확하게 평가하는 것이 결과의 최종 퀄리티를 결정한다.
agent의 문제점을 극복하고 정확하게 작업 결과를 평가하기 위해서, 검증은 항상 agent별로 최소한의 범위를 평가한다.

- 검증 항목이 N개라면, N개의 agent를 병렬로 호출하여 각 agent가 각자의 평가 기준에 집중하게 한다.
- 씬 별 평가가 가능하고 효율적이면, 씬 별로 각각 다른 agent를 병렬로 호출해서 더 정확하게 평가한다.

## 3. 단일 SOT를 통해 작업 현황 공유

여러 개의 파일을 통해 작업 현황을 공유하면, 서로 내용이 달라지고 파편화된다.
단일 `tasks.json` 파일을 통해 모든 agent가 작업 context를 공유한다.

## 4. Agent 프롬프트 설계

모든 agent 프롬프트(`agents/<name>.md`)를 작성할 때 아래 원칙을 따른다.
대상: Claude subagent로 invoke되는 프롬프트, Codex에 위임되는 프롬프트 모두 포함.

### 4.1 책임을 구체적으로, 워크플로우는 얇게

Persona는 **Role → Responsibilities → Principals → Workflows** 순으로 상위에서 하위로 좁혀간다.
상위 3개가 충분히 구체적이면, Workflows는 **I/O 계약 + 최소 절차 + 워크플로우 고유 제약 + Failure 응답**만 기술한다.

**Workflows에서 피할 것:**
절차에 마이크로매니징을 넣으면 모델의 맥락 기반 판단력을 저해한다.
책임으로 방향을 정하고, 판단은 모델에 맡긴다.

### 4.2 Fallback 없음 — 실패는 호출자로 보고

Mechanics 레이어(외부 모델 호출)가 실패하면 **fallback 하지 않고 호출자에게 에러를 그대로 전달**한다.
판단/복구는 호출자(메인 컨텍스트)의 책임.
 
### 4.3 좋은 예시

`agents/principal-engineer.md` 참조 — 위 원칙을 반영한 reference implementation.
- Role → Responsibilities → Code_Principals → Engineering_Principals → Workflows 순으로 상위에서 하위로 좁혀감
- Workflows는 각 mode별 I/O 계약 + 최소 절차 + 고유 Constraints + Failure 응답만 기술
- 임계값·도구·안티패턴 목록 없음 — 판단은 Principals에 위임
- frontmatter 없음 → invokable subagent로 등록되지 않고 `call-codex-cli(lstack:principal-engineer)` 로만 호출
