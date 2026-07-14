---
name: close
description: |
  Use when the user says "/close", "닫자", "마무리", "끝내자". Confirms completion,
  polishes plan.md for outside readers (방침 중심), and closes the worktree.
  The PR is created earlier by /pr; close does not create PRs or run verification.
---

# close — 작업 종료

완료 확인 → plan.md 인간용 정리 → worktree 닫기.
검증 · PR 은 하지 않는다 (검증은 `show`, PR 은 `pr` 에서 이미 끝났다).

## 1. 완료 확인
사용자에게 마무리 여부 한 줄 질문. "아직" 이면 중단.

## 2. plan.md 정리 (의도 7)
`write-plan-md` 글쓰기 원칙으로 다듬는다 — 방침 중심, 외부 개발자 가독성, 간결.
- `## 계획` 의 완료 태스크는 결과 요약 1-2줄로 정돈, 시행착오 흔적 제거.
- 구조는 유지한다 (새 섹션 추가 · 태스크 재배치 금지). 표현만 다듬는다.

## 3. worktree 닫기
현재 cwd 가 worktree 가 아니면 스킵. worktree 면 사용자 확인받고 제거 (브랜치 유지). `--force` 금지.

## Anti-patterns
- 여기서 e2e / 검증 다시 하기 (`show` 에서 끝냄)
- 여기서 PR 만들기 (`pr` 에서 함)
- 사용자 확인 없이 worktree 제거 / 브랜치 삭제
