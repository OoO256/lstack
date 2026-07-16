---
base_branch: main
worktree_root: .worktrees
---

# mimeo

## worktree 생성 후 후처리

bun workspace 모노레포다. 새 worktree 를 만들면 아래 두 단계를 즉시 수행해야 정상 실행된다.

### 1. `.env.local` 2개 복사 (원래 tree → 새 worktree)

루트와 `apps/web` 두 곳을 모두 복사한다. 파일명은 `.env` 가 아니라 `.env.local`.

```bash
cp "<원래 tree 루트>/.env.local" "<worktree>/.env.local"
cp "<원래 tree 루트>/apps/web/.env.local" "<worktree>/apps/web/.env.local"
```

안 하면 Next.js dev 서버가 `apps/web/.env.local` 을 못 읽어 `NEXT_PUBLIC_SUPABASE_URL` 미인라인으로 미들웨어에서 전 요청이 500. 파일이 없거나 복사 실패 시 사용자에게 알린다.

### 2. worktree 루트에서 `bun install`

```bash
cd "<worktree>" && bun install
```

worktree 는 자체 `node_modules` 가 없어 `node_modules/@ttv/core` 를 현재 worktree 의 `packages/core` 로 심볼릭 링크하기 위함이다.
안 하면 turbo typecheck(`tsc --noEmit`)이 부모 tree 의 `node_modules` 로 `@ttv/core` 를 resolve 해 새 파일에 거짓 `TS2307` 을 뱉는다.
