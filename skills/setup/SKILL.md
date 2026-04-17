---
name: setup
description: |
  This skill should be used when the caller (typically lstack) needs to perform
  "브랜치/worktree 셋업" — Phase 0.4 setup phase for a new worklog. Triggers include
  "setup phase", "phase 0.4", "새 작업 브랜치", "worktree 준비".
  Runs an interactive 6-step procedure (preflight → project config load → branch
  interview → worktree decision → apply → return) and emits a 5-field structured
  result that the caller consumes directly. Does NOT write to plan.md (ephemeral).
---

# setup — Phase 0.4 브랜치/worktree 셋업 (mechanics + 인터뷰)

**책임.** 새 worklog 로 들어가기 직전에 작업 격리 전략(branch · worktree)을 사용자와 함께
확정하고, caller 가 바로 소비할 수 있는 구조화된 5-필드 결과를 반환한다.
**plan.md 를 건드리지 않는다 (ephemeral).**

**호출자 계약.**
- caller 는 `provisional_slug` (Phase 0 에서 사용자 발화로부터 유도한 임시 slug) 를 전달한다.
- caller 는 "새 작업" 으로 귀결된 경우에만 이 skill 을 호출한다. resume 경로는 skip.

**MVP 스코프.** dirty working tree 정책, partial apply rollback, resume 재검증,
Agent/Skill/Codex cwd propagation 계약은 향후 과제로 이관. 이 skill 은 v1 필수 6 단계만 수행.

## 반환 스키마 (정확히 5 필드)

setup 완료 시 아래 5 필드만 출력한다:

```
project_file: <absolute path to skills/setup/projects/<basename>.md, or null>
confirmed_slug: <normalized slug string>
branch_mode: current_keep | new_branch | existing_checkout
branch_name: <final branch name actually applied>
worktree_path: <absolute path to created worktree, or null>
```

필드 의미:
- `project_file` — 로드된 project config 파일 경로. 없으면 `null`.
- `confirmed_slug` — 정규화된 slug (caller 의 `provisional_slug` 를 사용자 확인 거친 결과). worklog 디렉토리/브랜치 이름에 재사용.
- `branch_mode` — 3 갈래 중 하나. `current_keep` / `new_branch` / `existing_checkout`.
- `branch_name` — 실제 적용된 브랜치 이름. `current_keep` 이면 현재 브랜치, 그 외엔 사용자 확정 이름.
- `worktree_path` — 새 worktree 를 만들었으면 그 절대경로, 아니면 `null` (현재 tree 에서 전환한 경우 포함).

## Workflow (6 단계 순차)

### 1. Preflight

git 저장소 검증 및 현재 상태 캡처.

```bash
# git repo 여부 검증
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null) \
  || { echo "ERROR: not a git repository"; exit 1; }

# 현재 branch 와 cwd 캡처
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
CURRENT_CWD=$(pwd)
```

**MVP 범위에서 생략 (향후 과제)**: dirty working tree 정책, detached HEAD 처리,
submodule/nested repo 검증.

### 2. Project config load

cwd basename 으로 `skills/setup/projects/<basename>.md` 를 찾는다. 없으면 빈 config 로
이어가고, 필요한 값은 이후 단계에서 인터랙티브하게 보완한다.

```bash
BASENAME=$(basename "$CURRENT_CWD")
PROJECT_FILE="${CLAUDE_PLUGIN_ROOT}/skills/setup/projects/${BASENAME}.md"
[ -f "$PROJECT_FILE" ] || PROJECT_FILE=""
```

**Frontmatter 파싱 (lenient)** — 파일이 있으면 첫 `---` 블록에서 아래 3 필드만 읽는다:
- `base_branch` — 새 브랜치의 시작점 (없으면 인터랙티브 질문)
- `branch_prefix` — 새 브랜치 이름 prefix (없으면 빈 문자열)
- `worktree_root` — 새 worktree 루트 경로 (없으면 인터랙티브 질문, 기본 제안 `.worktrees`)

Unknown key 는 무시한다. body markdown 은 사람용 notes — 파싱하지 않는다.
`worktree_root` 가 상대경로면 repo root 기준으로 resolve 한다.

project_file 이 `""` 이면 반환 스키마의 `project_file` 은 `null`.

### 3. Branch 인터뷰 (3 갈래)

사용자에게 아래 3 갈래를 제시하고 하나를 고르게 한다.

**(a) 현재 브랜치 유지 (`current_keep`)** — 추가 질문 없음.
- `branch_name = $CURRENT_BRANCH`
- `branch_mode = "current_keep"`
- worktree 단계 질문 없음 (skip to return).

**(b) `<base_branch>` 에서 새 브랜치 (`new_branch`)**
- caller 가 전달한 `provisional_slug` 를 가져온다.
- slug 정규화: 소문자 변환, `[a-z0-9-]` 외 문자는 `-` 로 치환, 연속 `-` 축약, 양끝 `-` 제거.
- `branch_prefix` (없으면 빈 문자열) 와 결합해 후보 이름 생성: `<branch_prefix><slug>`.
- 사용자에게 후보를 보여주고 확인/수정 받는다.
- 확정된 이름에 대해 아래 검증:
  ```bash
  git check-ref-format --branch "$CANDIDATE" \
    || { echo "invalid branch name"; <재입력 요청>; }
  ```
- 정규화 결과가 비거나 검증 실패 시 재입력 질문으로 폴백.
- `base_branch` 가 project config 에 없으면 인터랙티브 질문 (기본 제안 없음).
- `branch_mode = "new_branch"`, `branch_name = <확정된 이름>`, `confirmed_slug = <정규화된 slug>`.

**(c) 기존 브랜치 체크아웃 (`existing_checkout`)**
- `git branch --list` 로 로컬 브랜치 목록을 보여주고 하나 선택받는다.
- **선검사**: `git worktree list --porcelain` 으로 이미 다른 worktree 에 checkout 된
  브랜치인지 확인. 이미 있으면 `--force` 로 밀지 않고, 사용자에게 (i) 그 worktree
  경로로 이동하거나 (ii) 현재 tree 로 전환하거나 (iii) 다른 브랜치 선택하도록 재질문.
- `branch_mode = "existing_checkout"`, `branch_name = <선택된 이름>`.

### 4. Worktree 결정

branch_mode 가 `new_branch` 또는 `existing_checkout` 일 때만 이 단계를 실행한다.
`current_keep` 이면 건너뛰고 return 으로.

사용자에게 질문: "현재 tree 에서 전환 vs 새 worktree 생성?"

- **현재 tree 에서 전환** 선택: worktree 단계 종료, `worktree_path = null`.
- **새 worktree 생성** 선택:
  - `worktree_root` 가 project config 에 있으면 그 값 사용.
  - 없으면 인터랙티브 질문 (기본 제안 `.worktrees`).
  - 상대경로는 repo root 기준으로 resolve.
  - 최종 경로: `<resolved_worktree_root>/<branch_name>/` (repo 내부 `.worktrees/<branch>/` 규칙).

### 5. Apply

선택에 따라 실제 git 작업을 수행한다.

```bash
case "$branch_mode" in
  current_keep)
    # 아무 작업 없음
    ;;
  new_branch)
    if [ -z "$worktree_path" ]; then
      # 현재 tree 에서 새 브랜치 생성 + 전환
      git switch -c "$branch_name" "$base_branch"
    else
      # 새 worktree 에 새 브랜치 생성
      git worktree add "$worktree_path" -b "$branch_name" "$base_branch"
    fi
    ;;
  existing_checkout)
    if [ -z "$worktree_path" ]; then
      # 현재 tree 에서 전환
      git switch "$branch_name"
    else
      # 새 worktree 에 기존 브랜치 체크아웃
      git worktree add "$worktree_path" "$branch_name"
    fi
    ;;
esac
```

**Worktree 생성이 성공했으면 같은 Bash 호출(또는 후속 호출)에서 `cd "$worktree_path"` 를 수행한다.**
Claude Code 는 repo 내부 cwd 는 Bash 호출 간 유지하므로, 이후 모든 작업이 worktree 에서
자연스럽게 실행된다.

```bash
[ -n "$worktree_path" ] && cd "$worktree_path"
```

**MVP 범위에서 생략 (향후 과제)**: partial apply rollback (브랜치 생성 성공 후
worktree 생성 실패 시 복구), missing local base_branch / stale base 처리,
worktree path collision (branch 에 `/` 포함 시).

### 6. 반환값 출력

정확히 아래 5 필드를 구조화된 블록으로 출력한다. caller 가 바로 파싱해서 소비한다.

```
project_file: <path or null>
confirmed_slug: <slug string>
branch_mode: current_keep | new_branch | existing_checkout
branch_name: <final branch name>
worktree_path: <path or null>
```

- `project_file` 은 Step 2 에서 로드한 파일 절대경로 (없으면 `null`).
- `confirmed_slug` 는 Step 3 에서 확정한 정규화된 slug. `current_keep` / `existing_checkout`
  경로에서도 caller 가 worklog 디렉토리 이름에 재사용해야 하므로 caller 의
  `provisional_slug` 를 그대로 (또는 간단 정규화 후) 반환.
- `worktree_path` 는 Step 4-5 에서 실제로 생성한 worktree 절대경로. 생성하지 않았으면 `null`.

## 규칙

- 이 skill 은 plan.md 를 읽거나 쓰지 않는다.
- `--force` 를 쓰지 않는다 (이미 checkout 된 브랜치는 재질문).
- 프로젝트 config 는 lenient parse. unknown key / missing field 는 인터랙티브 질문으로 폴백.
- 반환 스키마는 5 필드 고정. 추가 필드/요약 출력 금지 (caller 파싱 안정성).
- emoji 사용 금지.

## Anti-patterns

- plan.md 에 setup 결과 기록 — ephemeral 계약 위반
- dirty tree 자동 stash / reset — MVP 범위 밖, 향후 과제
- Agent/Skill/Codex 호출에 cwd 명시 전달 — MVP 는 단일 세션 cwd 유지에만 의존
- 반환 스키마 변경 / 필드 추가 — caller 계약 파손
- resume 경로에서 이 skill 호출 — caller 가 "새 작업" 분기에서만 호출해야 함
