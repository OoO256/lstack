# Setup phase skill — 인터뷰 전 브랜치/worktree 셋업

## 배경

현재 lstack 워크플로우는 Phase 0 (state detect) 직후 바로 Phase 1 (interview) 로 진입해서 작업 격리 전략(브랜치·worktree)이 암묵적이다. 외부 프로젝트가 늘수록 프로젝트별 규칙(브랜치 컨벤션, worktree 선호)이 달라 매번 수작업으로 처리해야 한다. 인터뷰 직전에 "어느 브랜치 / worktree 사용 여부"를 정하는 setup 단계를 스킬로 추가하고, 프로젝트별 규칙은 `skills/setup/projects/*.md` SSOT 에 둔다.

## AS-IS → TO-BE

| 축 | AS-IS | TO-BE |
|---|---|---|
| 워크플로우 | Phase 0 (state) → Phase 1 (interview) | Phase 0 → **Phase 0.5 (setup)** → Phase 1 |
| 브랜치/worktree 결정 | 암묵적, 세션마다 수작업 | 인터랙티브 + 프로젝트별 기본값 |
| 프로젝트별 규칙 | 없음 | `skills/setup/projects/<dirname>.md` SSOT |
| Fallback | 없음 | 매칭 project 파일 없으면 인터랙티브 질문 |

## Non-goals

- worktree 자동 cleanup / merge-back 자동화
- GitHub PR 생성·연동
- 프로젝트별 환경변수·시크릿 관리
- monorepo 서브프로젝트 동시 셋업
- setup 결과를 plan.md 에 기록 (기록 안 함 — ephemeral)
- Resume 시 setup 재실행 (새 worklog 생성 시에만)

## 사용자 결정 (interview 결과)

- **트리거**: 새 worklog 생성 시에만 (Phase 0 이 '새 작업' 판정한 경우)
- **프로젝트 매칭**: cwd basename ↔ `skills/setup/projects/<basename>.md`
- **Fallback**: 매칭 파일 없으면 인터랙티브 질문
- **기록**: plan.md 에 기록하지 않음 (ephemeral)
- **브랜치 옵션**: 현재 유지 / 새 브랜치 / 기존 브랜치 체크아웃
- **새 브랜치 이름**: slug에서 자동 유도 + 사용자 확인
- **worktree 경로**: project 파일에서 지정 (없으면 인터랙티브)
- **세션 흐름**: worktree 생성 후 메인 세션이 `cd`

## 설계

### 결정
- **`skills/setup/SKILL.md` 를 Phase 0.5 전용 skill로 추가하고, 라이브 설정은 `skills/setup/projects/<cwd-basename>.md` 에 둔다** — `skills/lstack/SKILL.md`가 상태 판정과 Git 작업 격리 인터뷰까지 모두 품기 시작하면 Phase 0 복잡도가 빠르게 커진다. setup을 별도 skill로 분리하면 lstack은 "언제 호출할지"만 알고, setup은 "어떻게 묻고 적용할지"만 안다. `references/` 는 예시/문헌용이라 쓰지 않고, `projects/` 를 live config SSOT로 둔다.
  FF 원칙: 가독성↑, 응집도↑, 결합도↓.
  복잡성 신호: Phase 0 state detect와 Git setup mechanics가 한 파일에 얽히기 시작함 → phase-specific skill 분리로 차단.
- **`setup` skill 본문은 `preflight → project config load → branch option interview → worktree decision → apply → ephemeral result` 순으로 둔다** — plan.md에 기록하지 않으므로 caller가 바로 소비할 수 있는 구조화된 결과를 반환해야 한다. branch 인터뷰는 `현재 유지`, `<base_branch>에서 새 브랜치`, `기존 브랜치 체크아웃` 세 갈래로 고정하고, 새 브랜치/기존 브랜치 두 갈래에서만 "현재 tree에서 전환 vs 새 worktree 생성" 분기를 연다. 기존 브랜치가 다른 worktree에 이미 checkout돼 있으면 `git worktree add <path> <branch>` 가 거부되므로 `--force`로 밀지 않고 다른 경로(그 worktree로 이동, 현재 tree 전환, 다른 브랜치 선택)만 제안한다. 반환값은 최소 `project_file`, `confirmed_slug`, `branch_mode`, `branch_name`, `active_cwd`, `worktree_path|null` 을 포함한다.
  FF 원칙: 예측가능성↑, 응집도↑.
  복잡성 신호: branch/worktree 경우의 수가 Phase 0 본문에 인라인 분기되기 시작함 → skill 내부 절차로 국소화.
- **slug는 Phase 0에서 '새 작업'으로 판정한 사용자 발화로부터 후보를 먼저 만들고, setup에서 한 번 확정한 뒤 Phase 1까지 그대로 들고 간다** — setup이 Interview보다 앞서 있으므로 현재 구조에서는 final goal slug가 아직 없다. 따라서 Phase 0이 가진 raw request에서 provisional slug를 만들고, setup에서 branch-safe 후보(`<branch_prefix><slug>`)를 보여 준 뒤 사용자 확인/수정으로 확정한다. 이후 Phase 1이 goal 문장을 다듬더라도 worklog 디렉토리 생성은 이 `confirmed_slug`를 재사용해서 branch/worklog 이름 drift를 막는다. slug 정규화는 소문자 + `[a-z0-9-]` 중심으로 축약하고, prefix를 붙인 최종 branch name은 `git check-ref-format --branch`로 검증한다. 정규화 결과가 비거나 너무 길면 재입력 질문으로 폴백한다.
  FF 원칙: 예측가능성↑, 가독성↑.
  복잡성 신호: worklog slug와 branch name이 서로 다른 규칙으로 따로 생기면 진실의 원천이 둘이 됨 → setup이 세션 단위 SSOT를 잡음.
- **project 파일 schema는 frontmatter 3개만 표준화하고, 모두 "없으면 인터랙티브 보완"으로 처리한다** — 최소 파싱 필드는 `base_branch`, `branch_prefix`, `worktree_root` 세 개면 충분하다. `base_branch`는 새 브랜치 옵션에서만 필요하고, `branch_prefix`는 없으면 빈 문자열, `worktree_root`는 새 worktree 선택 시에만 필요하다. unknown key는 무시하고, body markdown은 사람이 보는 notes로만 취급해 옛 컨벤션 파일도 hard fail 없이 흡수한다. `worktree_root`가 상대경로면 repo root 기준으로 resolve한다.
  FF 원칙: 가독성↑, 결합도↓.
  복잡성 신호: project별 규칙을 코드 조건문으로 누적하기 시작함 → frontmatter SSOT로 이동.
- **`skills/setup/projects/lstack.md` 예시는 아래처럼 둔다** — lstack repo는 현재 `.gitignore`에 worktree 디렉토리 규칙이 없으므로, 예시는 repo 바깥 sibling 경로를 써서 불필요한 ignore 변경을 피한다.

  ```md
  ---
  base_branch: main
  branch_prefix: feat/
  worktree_root: ../worktrees/lstack
  ---

  # lstack

  - linked worktree는 `../worktrees/lstack/<branch>` 아래에 만든다.
  - project file에 없는 값은 setup 인터뷰에서 그때 묻는다.
  ```

  FF 원칙: 예측가능성↑.
  복잡성 신호: repo-local worktree 경로를 암묵값으로 두면 ignore/cleanup 규칙이 숨겨짐 → 예시에서 명시적으로 드러냄.
- **`skills/lstack/SKILL.md` 에서는 Phase 0.2가 새 작업으로 끝난 직후 `setup`을 호출하고, resume로 끝난 경우에는 Phase 0.3로 바로 간다** — 구체적으로 `0.2 사용자 의도 추론`이 "기존 worklog 재개"로 귀결되면 setup은 skip, 곧바로 `0.3 Phase 추론`으로 간다. "새 goal"로 귀결되면 `0.4 Setup (new work only)`를 실행하고, setup 결과의 `confirmed_slug`와 `active_cwd`를 메모리에 저장한 뒤 `Phase 1 Interview`로 진입한다. setup은 plan.md를 건드리지 않고, Phase 1 후 worklog 디렉토리 생성 시에만 그 slug를 사용한다.
  FF 원칙: 예측가능성↑, 결합도↓.
  복잡성 신호: resume/new-work 공통 플로우에 setup을 무조건 끼우면 사용자가 이어서 작업할 때 불필요한 질문이 반복됨 → Phase 0 intent resolution 결과에만 결합.
- **메인 세션의 `cd`는 literal shell state가 아니라 orchestrator의 `active_cwd` 세션 상태로 구현한다** — 독립적인 Bash 호출에서 `cd /tmp && pwd` 다음 `pwd`를 실행하면 cwd가 원래 repo로 돌아오는 것을 확인했다. 반면 long-lived PTY 하나를 계속 붙들고 있으면 `cd`가 유지되지만, 현재 lstack workflow는 모든 Bash/Skill/Codex 호출을 하나의 PTY 세션에 묶는 구조가 아니다. 따라서 setup 이후에는 PM이 `active_cwd`를 세션 메모리로 들고, 이후 Bash/Skill/`call-as-codex`/Agent 호출을 모두 그 cwd 기준으로 실행하는 'logical cd'가 필요하다. 구현은 각 shell snippet 앞에 `cd "$ACTIVE_CWD" && ...` 를 붙이거나, 도구가 `workdir`를 지원하면 그 필드를 채우는 방식이 가장 단순하다.
  FF 원칙: 예측가능성↑, 결합도↓.
  복잡성 신호: 숨겨진 shell session state에 의존하면 같은 plan이 실행 맥락에 따라 다르게 동작함 → 명시적 session state로 치환.

### 리스크
- **cwd basename 충돌 / worktree basename drift** — 서로 다른 repo가 같은 basename을 쓰거나, 새 세션을 worktree leaf(`<branch>`)에서 시작하면 `skills/setup/projects/<cwd-basename>.md`가 엉뚱한 파일을 가리키거나 miss할 수 있다. 완화: 이번 단계에서는 user decision대로 basename 매칭을 유지하되, lookup은 setup 진입 시점의 cwd에서 한 번만 수행하고 miss 시 즉시 인터랙티브 질문으로 폴백한다. 이 리스크가 반복되면 다음 iteration에서 repo-root basename 또는 명시적 project key로 승격 검토.
- **worktree 생성 후 메인 세션 cwd가 실제로 따라가지 않을 수 있음** — 독립 Bash 호출은 `cd` 상태를 보존하지 않는다. 완화: literal `cd` 성공을 완료 조건으로 보지 않고 `active_cwd` 업데이트 + 후속 명령들이 그 cwd로 실행되는지 smoke check(`pwd`, `git branch --show-current`)를 setup 완료 조건에 포함한다.
- **slug → branch name 유도 시 특수문자/길이 문제** — raw request에 공백, 슬래시, 이모지, 긴 문장이 들어오면 branch name이 invalid/refuse될 수 있다. 완화: branch-safe normalization, prefix 포함 길이 cap, `git check-ref-format --branch` 검증, invalid/empty면 재입력 질문.
- **project 파일이 옛 컨벤션이거나 일부 필드만 있을 수 있음** — schema를 엄격하게 만들면 작은 drift로도 setup이 hard fail한다. 완화: frontmatter lenient parse, unknown key ignore, missing key만 인터랙티브 질문, body notes fallback. 버전 필드는 지금 추가하지 않고 실제 호환성 문제가 생길 때만 도입한다.
- **기존 브랜치가 다른 worktree에 이미 checkout돼 있을 수 있음** — `git worktree add <path> <branch>`는 이 경우 거부된다. 완화: `git worktree list --porcelain`로 선검사하고, `--force`는 쓰지 않는다. 이미 checkout된 worktree 경로를 보여 주고 그곳으로 이동하거나 현재 tree 전환만 허용한다.

### Codex 검토

#### 동의하는 결정
- D1 — `setup`을 `skills/lstack/SKILL.md` 밖의 phase-specific skill로 분리하는 방향은 맞다. 현재 `lstack`은 이미 Phase 0-6 전체 orchestration을 담고 있어 state detect와 Git setup 인터뷰를 한 파일에 더 얹으면 책임 경계가 흐려진다.
- D2 일부 — 기존 브랜치가 다른 worktree에 checkout된 경우 `git worktree add`를 `--force`로 밀지 않는 선택은 맞다. setup 단계가 recovery workflow까지 떠안기 시작하면 v1 범위를 빠르게 넘긴다.
- D4 — project file schema를 `base_branch` / `branch_prefix` / `worktree_root` 최소 3필드로 시작하는 건 적절하다. 현재 하니스에는 project별 cwd/worktree 계약이 아직 없어서 schema를 더 키워도 소비 주체가 없다.

#### 도전하는 결정
- D7 — `active_cwd` 기반 logical cd는 현재 하니스 계약만으로는 실행 가능성이 낮다. `skills/lstack/SKILL.md`의 주요 dispatch는 `Agent({...})` / `Skill({ skill: "lstack:call-as-codex" ...})` 형태인데 cwd를 넘기는 필드가 없고, 레포 전체 검색상 `workdir`는 이 plan에만 등장한다. `skills/call-as-codex/SKILL.md` Step 3도 별도 `cwd` 입력 없이 현재 셸 cwd를 그대로 상속한다. Bash는 `cd "$ACTIVE_CWD" && ...` 래핑이 가능하지만 Agent/Codex 호출까지 같은 방식으로 propagate할 메커니즘은 아직 없다. v1은 자동 logical cd를 빼고 "추천 + 명시적 전환"으로 시작하거나, 선행 작업으로 `cwd` propagation contract를 먼저 정의해야 한다.
- D6 — "resume이면 setup skip"은 "setup 결과는 ephemeral"과 충돌한다. 현재 `skills/lstack/SKILL.md`의 Phase 0 resume flow는 worklog/phase만 복원하고 branch/worktree routing 정보는 복원하지 않는다. 사용자가 다음 세션을 repo root에서 열면 어떤 worktree가 의도된 위치인지 하니스가 알 방법이 없다. resume 시 현재 branch/cwd가 기대 상태인지 검증하고, 불일치 시 lightweight setup을 다시 태우는 쪽이 더 안전하다.
- D3 — branch name과 worklog slug를 동일한 `confirmed_slug`로 강제하는 건 SSOT 정리라기보다 서로 다른 두 사실을 과하게 결합하는 쪽에 가깝다. branch는 작업 격리용이고 worklog slug는 기록 식별용이다. 인터뷰 전에 둘을 같이 고정하면 초반 마찰만 늘고, 이후 goal 문장이 바뀌었을 때 수정 자유도도 줄어든다. 더 작은 시작은 setup에서 `branch_name`만 확정하고, worklog slug는 Phase 1 goal 확인 후 따로 만드는 것이다.
- D5 — `skills/setup/projects/lstack.md` 예시는 문서로서 유용하지만 런타임 설계의 핵심 결정은 아니다. propagation/dirty-tree 정책이 정해지기 전에는 예시 파일 형식을 먼저 굳힐 이유가 약하다.

#### 추가 리스크
- dirty working tree / staged but uncommitted changes — `git switch` 또는 현재 tree 전환이 실패하거나, 의도하지 않은 변경이 새 브랜치로 따라갈 수 있다. preflight에서 `git status --porcelain` 기준 정책이 필요하다.
- partial apply — 새 브랜치 생성은 성공했는데 worktree 생성 또는 cwd 전환이 실패하면 half-configured 상태가 남는다. setup 완료 조건과 rollback 범위를 미리 정해야 한다.
- detached HEAD / missing local `base_branch` / stale base — 새 브랜치의 시작점을 어디서 잡는지 불명확하다. local branch만 허용할지, remote tracking branch를 허용할지, fetch를 할지 계약이 필요하다.
- non-git directory / nested repo / submodule — basename 매칭은 성공해도 실제 git root semantics가 다를 수 있다. setup 진입 초기에 git root 검증이 필요하다.
- worktree path collision / path sanitization — branch name에 `/`가 포함되면 `worktree_root/<branch>`가 중첩 디렉토리가 된다. ref 검증과 별개로 filesystem-safe path 규칙이 필요하다.

#### 순서/절차 개선 제안
- 1. 먼저 cwd propagation의 런타임 계약을 결정하라. `v1 = 자동 logical cd 없음, 사용자 명시적 전환`으로 갈지, `full auto = Bash/Skill/Codex/Agent 전부에 cwd 전달 계약 추가`로 갈지 먼저 고정해야 한다.
- 2. 그 다음 setup preflight만 구현하라. git repo 검증, dirty-tree 정책, `git worktree list` 검사, minimal project file parse까지를 먼저 고정하면 실패 모드가 선명해진다.
- 3. 이후 new work 경로에만 setup을 연결하라. `skills/lstack/SKILL.md`에 Phase 0.4를 넣는 시점은 preflight 결과가 안정화된 뒤가 낫다.
- 4. resume skip을 유지할 생각이면 최소한 별도 persistence가 필요하고, persistence를 넣지 않을 생각이면 resume 시 lightweight setup 재검증을 같은 사이클에 포함해야 한다.
- 5. `skills/setup/projects/lstack.md` 예시와 문서화는 마지막에 두는 편이 낫다. 앞선 계약이 바뀌면 예시도 같이 바뀌기 때문이다.

#### 결론
- Accept with revisions — setup phase 분리와 최소 schema 방향은 타당하지만, `active_cwd` propagation과 resume 복원 전략이 현재 설계의 핵심 리스크다. 이 두 계약을 먼저 줄이거나 명확히 하지 않으면 v1 구현이 문서보다 훨씬 커진다.

### 최종 확정 (User 승인 2026-04-17)

Codex 검토를 받아 아래 4개 조정으로 확정:

1. **D7 재정의 (worktree는 repo 내부 `.worktrees/<branch>`)** — Claude Code 는 Bash 호출 간 cwd 를 **working directory 내부에 머무는 한** 유지한다 (실측: `cd .worktrees/test && pwd` 다음 `pwd` 에서도 같은 경로 유지). repo 바깥 경로 (`/tmp`, `../worktrees/lstack`) 로 나가면 "Shell cwd was reset" 발생. 따라서 worktree 는 **repo 내부 `.worktrees/<branch>/` 에 생성** 하고 setup 이 단순히 `cd` 하면 이후 모든 Bash 호출은 자연스럽게 worktree 에서 실행된다. Agent/Skill/Codex 호출은 spawn 시점의 cwd 를 상속하므로 같은 세션 내에서 일관되게 동작. setup 반환값은 `project_file`, `confirmed_slug`, `branch_mode`, `branch_name`, `worktree_path|null` 로 확정. `next_session_hint` 는 불필요 (단일 세션 유지).

   → lstack project 파일의 `worktree_root` 는 `../worktrees/lstack` 에서 **`.worktrees`** 로 변경. repo `.gitignore` 에 `.worktrees/` 추가 필요.
2. **D6 유지 (skip + 검증 없음)** — resume 시 setup 재실행/재검증은 향후 과제. 사용자가 본인 cwd/branch를 직접 책임지는 계약으로 시작.
3. **D3 유지 (slug 통일)** — branch name 과 worklog slug 는 같은 `confirmed_slug` 재사용. drift 방지 우선.
4. **D4 유지 (최소 schema)** — `base_branch`, `branch_prefix`, `worktree_root` 3 필드. lstack.md 예시 파일은 v1에 포함.

**향후 과제로 이관된 항목**:
- dirty working tree 정책, partial apply rollback, detached HEAD / missing local base_branch, non-git directory 검증, worktree path collision (branch 에 `/` 포함 시)
- resume 시 branch/worktree lightweight 검증
- Agent/Skill/Codex 호출의 cwd propagation 계약 (필요 시)

**MVP 스코프 (v1)**:
- preflight: git repo 검증, project 파일 로드 (있으면)
- branch 인터뷰: 현재 유지 / base 에서 새 브랜치 / 기존 브랜치 체크아웃
- worktree 인터뷰: 예/아니오 (yes 면 경로 결정 후 `git worktree add`)
- 적용: branch 전환 또는 worktree 생성
- 출력: 선택 결과 요약 + `cd <worktree_path>` 실행 (같은 세션 유지)
- `skills/setup/projects/lstack.md` 예시 포함 (worktree_root: `.worktrees`)
- `.gitignore` 에 `.worktrees/` 추가
- `skills/lstack/SKILL.md` Phase 0.4 호출 지점 추가
- `docs/spec/ARCHITECTURE.md` skills 섹션 + Phase 설명 업데이트

## 태스크

### T1: setup skill 및 lstack project 예시 파일 구현 (exec: oh-my-claudecode:executor) — 완료 `39e5169`
신규: `skills/setup/SKILL.md` — preflight → project config load → branch 인터뷰 → worktree 결정 → apply → 반환값 출력 순. 반환 필드 `project_file`, `confirmed_slug`, `branch_mode`, `branch_name`, `worktree_path|null`. worktree 생성 시 `cd` 까지 수행 (같은 세션 유지).
신규: `skills/setup/projects/lstack.md` — frontmatter `base_branch: main`, `branch_prefix: feat/`, `worktree_root: .worktrees` + 간단한 notes body.
수정: `.gitignore` — `.worktrees/` 추가.

- [x] AC1: `skills/setup/SKILL.md` 가 존재하고 본문이 preflight → project config load → branch 인터뷰 → worktree 결정 → apply → 반환값 출력의 6 단계로 순차 기술된다 (v: verifier)
- [x] AC2: setup skill 반환 schema 가 정확히 `project_file`, `confirmed_slug`, `branch_mode`, `branch_name`, `worktree_path|null` 5 필드로 명시된다 (v: verifier)
- [x] AC3: branch 인터뷰가 "현재 유지 / base 에서 새 브랜치 / 기존 브랜치 체크아웃" 3 갈래로 기술되고, 새 브랜치 경로에 slug 정규화 + `git check-ref-format --branch` 검증이 포함된다 (v: verifier)
- [x] AC4: worktree 생성 경로가 repo 내부 `.worktrees/<branch>/` 규칙을 따르고, 생성 후 `cd <worktree_path>` 를 skill 본문에서 수행한다고 명시된다 (v: verifier)
- [x] AC5: `skills/setup/projects/lstack.md` frontmatter 에 `base_branch: main`, `branch_prefix: feat/`, `worktree_root: .worktrees` 3 필드가 포함되고, `.gitignore` 에 `.worktrees/` 라인이 추가된다 (v: verifier)

### T2: lstack 오케스트레이션에 Phase 0.4 Setup 호출 추가 (exec: oh-my-claudecode:executor) — 완료 `010902c`
수정: `skills/lstack/SKILL.md` — Phase 0.2 가 "새 작업" 으로 귀결된 경우에만 Phase 0.4 Setup 호출. resume 경로는 기존대로 Phase 0.3 로 직행. setup 반환값 `confirmed_slug` 를 Phase 1 이후 worklog 디렉토리 생성에 재사용.

- [x] AC6: `skills/lstack/SKILL.md` 에 Phase 0.4 Setup 단계가 추가되고, "새 작업" 분기에서만 호출되도록 조건이 명시된다 (v: verifier)
- [x] AC7: resume 분기에서는 Phase 0.4 를 건너뛰고 Phase 0.3 로 직행한다고 본문에 기술된다 (v: verifier)
- [x] AC8: setup 반환값 `confirmed_slug` 가 Phase 1 이후 worklog 디렉토리 (`docs/worklogs/YYYY-MM-DD-<slug>/`) 이름 생성에 재사용된다고 명시된다 (v: verifier)

### T3: ARCHITECTURE.md 문서 동기화 (exec: oh-my-claudecode:executor) — 완료 `5633ebc`
수정: `docs/spec/ARCHITECTURE.md` — skills 섹션에 `setup` skill 추가, Phase 플로우 다이어그램/설명을 State Detect → Setup → Interview 로 업데이트, Phase 매핑 표에 Phase 0.4 보조 설명.

- [x] AC9: `docs/spec/ARCHITECTURE.md` skills 섹션에 `setup` 항목이 추가되어 책임/반환 schema 가 기술된다 (v: verifier)
- [x] AC10: Phase 플로우 설명이 State Detect → Setup (new work only) → Interview 순서로 업데이트되고, Phase 매핑 표에 Phase 0.4 설명이 포함된다 (v: verifier)
- [x] AC11: ARCHITECTURE.md 수정 내용이 plan.md 최종 확정 블록 (worktree_root: `.worktrees`, 반환 schema 5 필드, slug 통일) 과 모순되지 않는다 (v: critic)

## 향후 과제

**MVP 확정 시 이관된 항목** (plan.md 최종 확정 블록에서):
- dirty working tree 정책 (preflight `git status --porcelain` 기반 blocking/stash/안내 선택)
- partial apply rollback (브랜치 생성 성공 but worktree 생성 실패 등의 half-state 복구)
- detached HEAD / missing local base_branch / stale base 대응
- non-git directory / nested repo / submodule 검증
- worktree path collision (branch name 에 `/` 포함 시 중첩 디렉토리 정책)
- resume 시 branch/worktree lightweight 재검증
- Agent/Skill/Codex 호출의 cwd propagation 계약

**T1 code review carried findings** (Phase 3+4 에서 수용된 important/challenges):
- existing_checkout 인터뷰의 "(i) 기존 worktree 이동 / (ii) 현재 tree 전환" 옵션이 Apply 단계에 대응 로직 없음 → 2/3 dead path. `--ignore-other-worktrees` 또는 worktree 이동 전용 분기 필요.
- project config lookup 이 `$(basename $(pwd))` 기반 → 하위 디렉토리에서 시작 시 silent miss. `$(basename $(git rev-parse --show-toplevel))` 로 바꿔야 함.
- `.gitignore` 의 `.worktrees/` 가 하위 경로까지 포함 → repo root 전용이면 `/.worktrees/` 가 정확.
- `current_keep`/`existing_checkout` 경로에서 `confirmed_slug` 와 `branch_name` 이 서로 다른 출처라 drift 가능성 남음.
- "기존 worktree 재사용" 상태가 반환 schema 에 표현되지 않음 (현재 `branch_mode` + nullable `worktree_path` 만으로 부족).

**T2 code review carried findings**:
- `skills/lstack/SKILL.md:120` drift-prevention 문구가 `current_keep`/`existing_checkout` 경로에서는 성립하지 않는 invariant 를 보장하는 것처럼 기술됨.
- `skills/lstack/SKILL.md:119` 새 문구가 setup 이후 모든 Bash/Skill/Codex/Agent 가 worktree cwd 기준으로 동작한다고 보장하지만, SSOT 에서 닫히지 않은 계약 (Bash `cd` 지속만 명시).
- worklog 경로 규칙이 PRINCIPLE.md, ARCHITECTURE.md, lstack SKILL.md 3곳에 중복 정의 (`<goal>` vs `<confirmed_slug>` placeholder drift).

**T3 code review carried findings** (Phase 5 에서 처리):
- `docs/spec/ARCHITECTURE.md:30` lstack 워크플로우 요약이 아직 `[State Detect] → Interview → Design` 로 남음. PM Orchestration Flow 와 drift.
- `docs/spec/ARCHITECTURE.md:188` worklog 경로 예시가 `<goal>` → `<confirmed_slug>` 통일 필요.
- ARCHITECTURE.md 의 setup entry trigger 문구가 실제 SKILL.md 의 trigger 선언과 다름.

**복잡성 리팩터 시그널** (Phase 3.5 대상 — MVP 이후):
- Apply 분기를 operation enum (`keep_current`, `switch_current`, `create_branch_here`, `create_worktree`, `reuse_worktree`) 으로 재구성 고려.
- `branch_prefix: feat/` 이 기본값이라 slash 포함 브랜치가 예외가 아닌 기본 → worktree path 중첩 디렉토리 처리 규칙 필요.
