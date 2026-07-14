---
base_branch: main
worktree_root: .worktrees
---

# mimeo

## 매번 확인할 항목
- **worktree 사용 여부**: setup Step 4 에서 항상 질문 (yes/no 로 확인).
- **base branch**: 기본 `main`. 바꿀 일이 있으면 인터뷰 중 사용자가 명시.

## Worktree 생성 후 필수 후처리

새 worktree 를 생성했으면 즉시 `.env` 파일을 복사해야 정상 실행 가능하다.
setup skill 자체는 이를 수행하지 않으므로, 호출자(lstack orchestrator)가
setup 반환값의 `worktree_path` 가 non-null 인 경우에만 아래를 실행한다.

```bash
# REPO_ROOT = setup 호출 이전의 원래 tree 루트
cp "$REPO_ROOT/.env" "$worktree_path/.env"
```

`.env` 가 없거나 복사 실패 시 사용자에게 알리고 중단 여부를 확인한다.

## 작업 마무리 프로토콜

사용자가 "lstack 작업 마무리" 혹은 동등한 지시를 내리면, 아래를 순서대로
**각 단계마다 사용자 확인을 받아** 진행한다.

1. **plan.md 정리** — 진행 중 태스크 상태 확정, 향후 과제 반영, 결과 요약 정리.
2. **최종 커밋 생성** — 남은 변경 사항 커밋 (hook 준수, `--no-verify` 금지).
3. **PR 생성** — `gh pr create` 로 현재 브랜치를 main 대상 PR 로 올림.
4. **worktree 삭제** — 메인 tree 로 `cd` 복귀 후 `git worktree remove <worktree_path>`.

어느 단계에서든 사용자가 No 라고 하면 그 지점에서 멈춘다. 건너뛰거나
다음 단계로 임의 진행하지 않는다.
