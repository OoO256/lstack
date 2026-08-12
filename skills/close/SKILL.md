---
name: close
description: |
  Use when the user says "/close", "닫자", "마무리", "끝내자". Confirms completion
  and closes the worktree. plan.md 정리 · PR 은 /pr 에서 이미 끝났다 — close 는
  둘 다 하지 않고 검증도 하지 않는다.
---

# close — 작업 종료

완료 확인 → worktree 닫기.
검증 · PR · plan.md 정리는 하지 않는다 (검증은 `show`, PR 과 plan.md 정리는 `pr` 에서 이미 끝났다).

## 1. 완료 확인
사용자에게 마무리 여부 한 줄 질문. "아직" 이면 중단.

## 2. worktree 닫기
현재 cwd 가 worktree 가 아니면 스킵. worktree 면 사용자 확인받고 제거 (브랜치 유지). `--force` 금지.

## Anti-patterns
- 여기서 e2e / 검증 다시 하기 (`show` 에서 끝냄)
- 여기서 PR 만들기 · plan.md 다듬기 (`pr` 에서 함)
- 사용자 확인 없이 worktree 제거 / 브랜치 삭제
