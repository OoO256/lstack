---
base_branch: main
worktree_root: .worktrees
---

# mimeo

## worktree 생성 후 후처리

새 worktree 를 만들면 즉시 `.env` 를 복사해야 정상 실행된다 (원래 tree → 새 worktree):

```bash
cp "<원래 tree 루트>/.env" "<worktree>/.env"
```

`.env` 가 없거나 복사 실패 시 사용자에게 알린다.
