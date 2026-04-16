---
description: Principal Engineer 페르소나로 Codex를 소환하여 객관적인 기술 조언을 받는다
argument-hint: <질문>
---

# ask-cto — Independent Technical Advisor

`lstack:call-as-codex` skill에 `lstack:principal-engineer` 프롬프트를 주입하여 프레시한 컨텍스트의
객관적 기술 조언을 받는 커맨드. 현재 대화의 편향 없이 Codex가 코드베이스를 직접 읽고 판단한다.

## Workflow

### Step 1: 질문 정리

`$ARGUMENTS`에서 사용자의 질문을 파악한다. 비어있으면 한 번만 확인한다:

- 어떤 코드/설계에 대한 의견인지
- 어떤 관점의 조언이 필요한지 (구조, 성능, 유지보수성, 확장성 등)
- 관련 파일/디렉토리 경로

### Step 2: 컨텍스트 수집

질문에 필요한 최소한의 컨텍스트를 정리한다:

- 관련 파일 경로 목록
- 현재 구조의 핵심 요약 (3-5줄)
- 구체적인 질문 또는 검토 요청
- 고려 중인 대안이 있으면 포함

### Step 3: `call-as-codex(lstack:principal-engineer)` 호출

`lstack:call-as-codex` skill을 호출한다.
- `prompt_file`: `lstack:principal-engineer`
- `context`: 아래 템플릿으로 채워서 전달
- `write`: 생략 (read-only — 조언만 받는다)

**Context 템플릿:**

```
mode: advise

## 배경
<현재 구조의 핵심 요약>

## 관련 파일
<파일 경로 목록>

## 질문
<사용자의 구체적인 질문>
```

**반드시 프레시한 컨텍스트로** — 현재 대화의 결론이나 편향을 주입하지 않는다.

### Step 4: 결과 전달

skill의 반환값(Codex stdout)을 사용자에게 **그대로** 전달한다.
PM의 해석이나 편집을 최소화 — 독립적인 의견의 가치를 보존한다.

필요하면 짧게 보충:
- PM의 기존 생각과 다른 점
- 추가 논의가 필요한 부분

## Anti-patterns

- 현재 대화의 결론을 context에 넣어 답을 유도하지 않는다
- Codex 답변을 임의로 수정하거나 필터링하지 않는다
- 단순한 코드 질문에는 이 커맨드를 쓰지 않는다 — 설계/구조 수준의 판단에만 사용
- 프롬프트 파일(`agents/principal-engineer.md`) 을 매 호출마다 수정하지 않는다
