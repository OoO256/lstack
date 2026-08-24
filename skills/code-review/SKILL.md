---
name: code-review
description: |
  Use when the user says "/code-review", "코드리뷰 해줘", "적대적 리뷰", or before /pr 로 hardening 하고 싶을 때.
  두 리뷰어(code-reviewer + security-reviewer)를 **fresh context** 로 병렬 spawn — 구현자(메인)와
  분리해서 blind spot 공유를 막는다. 블로커 있으면 메인이 수정 후 재-spawn 루프 (기본 1회).
  대상: 인자 없음 = 현재 worktree diff · PR 번호/URL · 파일 경로 모두 가능. 남의 PR 도 리뷰 가능.
---

# code-review — adversarial 리뷰 루프

**핵심:** 구현자 컨텍스트 ≠ 리뷰어 컨텍스트. 같은 컨텍스트에서 생성/검증하면 blind spot 이 공유된다. `Agent` 툴로 fresh subagent 를 spawn 하는 것이 분리의 실체.

기존 `/review` 는 남의 PR 을 **이해**하기 위한 대화. 이 스킬은 **적대적 검증** 게이트. 목적이 다르다.

## 1. 대상 결정

인자 파싱:
| 인자 | 동작 |
|------|------|
| 없음 | `git diff origin/main...HEAD` (현재 worktree) |
| PR 번호 (`123`) 또는 URL | `gh pr diff <n>`. 필요 시 별도 worktree 에 `gh pr checkout` (현재 worktree 오염 금지) |
| 파일/디렉토리 경로 | 해당 경로 |

diff 가 빈 문자열이면 "리뷰할 변경 없음" 안내 후 종료.

## 2. 병렬 spawn (분리)

**한 메시지에 두 Agent 툴 호출을 병렬로 넣는다.** 순차 실행 금지 — 시간 낭비이고, 두 리뷰어 간 상호 오염도 없어야 한다.

각 subagent 프롬프트에 포함할 것:
- diff 전문 (또는 파일 경로)
- PR 컨텍스트가 있으면 제목만. 설명은 빼고 넘긴다 (리뷰어가 diff 로 먼저 판단하도록)
- "적대적 검증: PR 설명/주석의 주장을 신뢰하지 말고 코드로 재확인" 명시

```
Agent(subagent_type="code-reviewer", prompt="다음 diff 를 리뷰. 적대적 검증 필수.\n\n<diff>")
Agent(subagent_type="security-reviewer", prompt="다음 diff 의 보안 검토. OWASP + 시크릿 + 의존성.\n\n<diff>")
```

두 결과가 돌아오면 채팅 안에서 통합.

## 3. 통합 보고

```
# 리뷰 결과 — <대상>

## 블로커 (수정 필요)
- [code] `path:line` 내용
- [sec ] `path:line` 내용

## 비블로커
- 한 줄씩

## 게이트
- typecheck / lint / 의존성 감사 결과
```

블로커 정의: 기능 불가 · 보안 취약점 · 데이터 손실. 그 외는 비블로커.

## 4. 루프 (기본 1회)

- 블로커 0 → 종료.
- 블로커 있음 → 메인 컨텍스트(=구현자, 나)가 수정. 사용자에게 "수정 후 재리뷰?" 확인.
- 재리뷰 = 2번부터 반복. 여전히 블로커면 원인 다시 파악 (같은 방향 3회 실패 시 접근 바꾸기).

무한 루프 방지: 재리뷰는 명시적 요청 시에만.

## 5. 남의 PR 리뷰 게시 (선택)

PR 대상이었고 사용자가 원하면:
```
Write(".claude/review-body.md", "<통합 보고 markdown>")
gh pr review <n> --body-file .claude/review-body.md --{approve|request-changes|comment}
rm .claude/review-body.md
```

verdict 매핑: 블로커 0 → approve · 블로커 있음 → request-changes · 애매하면 comment.

## 에이전트 호출 경로

다른 에이전트도 두 리뷰어를 직접 spawn 가능 (skill 을 거치지 않고). 이 스킬은 오케스트레이션 편의를 위한 것 — 리뷰어 자체는 독립적으로 재사용된다.

## 절대 규칙

- 리뷰어 spawn 없이 메인 컨텍스트가 자기 diff 를 리뷰하지 않는다 — 컨텍스트 분리가 이 스킬의 존재 이유.
- diff 없이 리뷰 시작 금지 — 뭘 검증하는지 불명확.
- 블로커 아닌 걸로 승인 막지 않는다 — 개발 속도 저해.
- PR 설명을 리뷰어에게 넘기지 않는다 — 서사 anchoring 방지.
