---
description: 현재 브랜치를 최신 base(origin/main 등)로 리베이스한다
argument-hint: (없음 — base 는 프로젝트 설정에서 읽음)
---

# rebase — 최신 base 로 리베이스

작업 중 브랜치를 최신 base 위로 올린다. `start` 는 시작 시 origin/main 에서 worktree 를 따지만,
진행 중 base 가 앞서가면 이 커맨드로 따라잡는다. PR 직전에도 쓴다.

## Workflow

### Step 1: base 확인

`base_branch` 를 `skills/start/projects/<cwd-basename>.md` frontmatter 에서 읽는다. 없으면 `main`.

### Step 2: 리베이스

```bash
git fetch origin
git rebase "origin/<base_branch>"
```

### Step 3: 결과 보고

- 성공 → 앞서간 커밋 수와 함께 한 줄 보고.
- **충돌 → 여기서 멈춘다.** 충돌 파일 목록을 보고하고 사용자 판단을 기다린다. 임의 해결 금지.
  중단하려면 `git rebase --abort` 를 안내한다.

## Anti-patterns

- 충돌을 임의로 해결하고 진행 — 멈추고 보고한다.
- `--force` 로 밀어붙이기.
- push 된 공유 브랜치를 확인 없이 리베이스 (히스토리 재작성 주의).
