---
name: close
description: |
  Use when the user says "/close", "닫자", "마무리", "끝내자". Confirms completion
  and closes the worktree. handoff.md · PR 은 /pr 에서 이미 끝났다 — close 는
  둘 다 하지 않고 검증도 하지 않는다.
---

# close — 작업 종료

완료 확인 → worktree 닫기.
검증 · PR · handoff.md 작성은 하지 않는다 (검증은 `show`, PR 과 handoff.md 는 `pr` 에서 이미 끝났다).

## 1. 완료 확인
마무리 의사가 있으면 `compound`로 남은 피드백·개선 제안을 확인한다. 이미 공유·기록한 내용은 반복하지 않는다.
뒤늦은 피드백은 채팅으로 제안만 한다. 파일 갱신이 필요하면 종료하지 말고 승인된 기록·공유 작업으로 돌아간다.
사용자에게 마무리 여부 한 줄 질문. "아직" 이면 중단.

## 2. worktree 닫기
현재 cwd 가 worktree 가 아니면 스킵. worktree 면 사용자 확인받고 제거 (브랜치 유지). `--force` 금지.

## Anti-patterns
- 여기서 e2e / 검증 다시 하기 (`show` 에서 끝냄)
- 여기서 PR 만들기 · handoff.md 쓰기 (`pr` 에서 함)
- 사용자 확인 없이 worktree 제거 / 브랜치 삭제
