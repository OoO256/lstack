---
name: pr
description: |
  Use when the user says "/pr", "code 올려", "pr 올려", "pr 만들어" — creating a PR
  for the current work. Always asks draft vs ready, assigns the user, checks the user's
  recent PRs to suggest a reviewer, and writes a human-readable description.
---

# pr — code 올리기

내가 매번 치는 PR 명령을 대신 발동한다. 아래는 반드시 지킨다:

1. **draft or ready?** — 꼭 질문한다 (기본값 가정 금지).
2. **본인 assign 필수** — PR author 를 assignee 로 등록.
3. **reviewer 질문** — 내 최근 PR 들의 reviewer 를 확인해 후보를 제시하고 누구를 넣을지 묻는다:
   ```bash
   gh pr list --author @me --state all --limit 10 --json reviewRequests,reviews
   ```
4. **desc = 인간용 (의도 7)** — 방침 중심, 독립 작업별 그룹화, as-is → to-be, 평이한 언어,
   비관여자도 이해 가능, 남은 한계 명시. UI/UX 변경은 캡처 첨부.
   plan.md `## 배경` · `## 계획` 을 소스로 재사용한다.

## 생성

```bash
git push -u origin <branch>
gh pr create --assignee @me --reviewer <선택> \
  --title "<goal 한 줄>" --body-file <desc>   # draft 면 --draft 추가
```

- `gh pr edit` deprecation 우회: assignee · reviewer 는 `create` 플래그로 **한 번에** 넣는다.
  사후 수정이 필요하면 `gh api` 로 patch.
- 생성 후 PR URL 을 보고한다.

## 규칙

- draft/ready · reviewer 는 **묻고** 정한다. 임의 결정 금지.
- desc 에 "T1 에서 X, T2 에서 Y" 식 구현 나열 금지 — 방침 · 데이터 흐름 중심.
