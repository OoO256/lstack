# lstack v2 — 얇은 하니스 (intent, not stages)

## 배경

**As-is (두꺼움).** lstack 오케스트레이터가 Phase 0–7 고정 워크플로우를 강제한다 —
섹션→phase 매핑표 기반 state detect, `principal-engineer → planner → test-designer` 설계 스테이지,
execute+verify+review 파이프라인, judge verdict(PASS/RALPH/RESCUE/ESCALATE), ralph-loop 3회,
codex rescue, plan.md 의 `T1..Tn`/AC 체크박스/저널↔PR 모드 변환.
내부 에이전트 5개 + 스킬 6개 + `validate-plan` 훅.

두 가지가 이 기계장치의 ROI 를 역전시켰다:
1. 모델 성능이 좋아지고 더 오래 작업하게 되면서, 엄격한 검증 루프·스테이지가
   오히려 모델의 맥락 기반 판단을 방해한다.
2. (HANDOFF 분석) 사용자의 반복 지시 대부분이 *이미* CLAUDE.md·MEMORY 에 글로 있는데도
   7주간 반복됐다 → **수동 문서로는 행동이 안 바뀐다.** 얇더라도 자연스러운 순간에
   **능동 발동하는 스킬**이어야 반복이 멈춘다.

**To-be (얇음).** 고정 스테이지·judge·ralph·phase매핑·`T1..Tn` 게이트를 제거하고,
**양끝을 감싸는 능동 스킬 + 항상 로드되는 의도 가이드**로 축소한다.
중간(구현)은 메인 컨텍스트가 가이드를 지닌 채 판단으로 진행한다.
하니스 = "내가 반복 입력하는 명령을 대신 발동"하는 수준.

## 설계

### 결정 1 — 라이프사이클 arc (가이드에 서술, 강제 게이트 아님)

```
/start → 구현 → self-test(unit·integ) → /show(①/②) → /pr → /compound(자동·제안만) → /close
                                                              /review = arc 밖 독립
```

- 스킬 = "반복 명령 묶음". 메인 컨텍스트가 판단으로 arc 를 따라가며 각 스킬을 발동한다.
- arc 는 PRINCIPLE.md 가이드에 서술될 뿐, phase 매핑표·judge 같은 오케스트레이터로 강제하지 않는다.
- 대안: 얇은 오케스트레이터 유지 (기각 — 스테이지 제거가 이 작업의 목적).

### 결정 2 — 스킬 인벤토리 (6개 + 유지 2개)

| 스킬 | 트리거 | 얇은 계약 |
|---|---|---|
| `start` | `/start`, `/lstack`, 시작, 이거 만들어/고쳐, 이어서, 계속, resume | origin/main → worktree 새 브랜치 + 의도 인터뷰 + 가이드 로드 + plan.md 착수. resume 면 plan.md 읽고 "된 것/남은 것" 요약 후 이어감. (구 lstack + setup 흡수) |
| `show` | `/show`, 보여줘 + 검증 시점 | **①/② 중 선택받아 실행** — ① 내가 동작 테스트(로컬 서버 기동 + Chrome CDP, 사용자가 확인) / ② agent e2e 검증(CDP, 근거 첨부). ③ 건너뛰기 = 호출 안 함 |
| `pr` | `/pr`, code 올려, pr 올려 | ①draft/ready **꼭 질문** ②본인 assign **필수** ③이전 내 PR 확인 → reviewer **질문** ④desc = 인간용(그룹·as-is/to-be·평이·한계 명시·UI 스샷), `gh pr edit` deprecation 우회 |
| `review` | `/review`, 이 PR 리뷰 도와줘 (+PR URL/번호) | **남의 PR 을 사용자가 이해하도록 대화로** 설명 + 리뷰 순서 제시 (아래 결정 6). 게이팅 아님. arc 밖 독립 |
| `compound` | `/compound`, `/close` 직전 자동 | 이번 세션 지시 회고 → 하니스(skill/hook/guide)로 자동화 가능했던 것 식별 → **제안만** (자동 실행 안 함) |
| `close` | `/close`, 닫자, 마무리, 끝내자 | 완료 확인 → plan.md 인간용 최종 정리 → worktree 닫기(브랜치 유지). **검증/e2e 안 함** (검증은 `show` 로 이미 끝남) |

유지: `write-plan-md`(plan.md 구조 SSOT, 축소) · `call-as-codex`(bare 메커니즘, on-demand).
`start` 는 구 `setup` 의 프로젝트별 기본값(`skills/setup/projects/<basename>.md`) 메커니즘을 흡수한다.

### 결정 3 — `show` = 검증 스킬 (별도 "검증 질문" 단계 없음)

self-test 뒤 `show` 가 발동되어 ①/② 를 묻고 선택된 것을 실행한다:
- **① 내가 동작 테스트** — 로컬 dev 서버 기동 + **Chrome CDP** 로 화면을 열어 사용자에게 넘김.
- **② agent e2e 검증** — agent 가 CDP 로 실동작 검증, 근거(스샷·로그) 첨부.
- **③ 건너뛰기** — `show` 를 호출하지 않음.

서버 기동 명령·CDP 실행 방식은 프로젝트별 설정에서 읽는다. `close` 에는 검증이 없다.

### 결정 4 — 의도 가이드 (= `PRINCIPLE.md` 재작성)

기존 PRINCIPLE.md(context 분리·전부검증·judge 정당화)는 지우는 기계장치의 근거이므로
아래 8개 의도 + 커뮤니케이션 원칙으로 교체한다. `start` 가 이 파일을 컨텍스트에 로드한다.

| # | 의도 | 어디서 강제되나 |
|---|---|---|
| 1 | 독립 단위로 분해해 병렬 진행 | 메인 판단 (가이드 상기) |
| 2 | 서브태스크는 저가 서브에이전트(sonnet/terra 등)로 위임 | 메인 판단 |
| 3 | TDD 구현·검증 → 완료 후 동작 보장 **최소셋**만 남기고 정리 | `show` |
| 4 | 항상 origin/main → worktree 새 브랜치로 시작 | **`start` 강제** |
| 5 | 구현 전 인터뷰로 의도 명확화 | **`start` 강제** |
| 6 | 마지막에 실환경 e2e 로 동작 검증 | `show` ② (CDP) |
| 7 | plan.md/PR 은 인간용 — 그룹·as-is/to-be·평이·비관여자 이해·UI 스샷 | `start`+`pr`+`close` |
| 8 | 유지보수 설계 — 단순화·SRP·응집도↑결합도↓·SSOT·적당한 위계 | 메인 판단 (가이드 상기) |

**커뮤니케이션 원칙 (별도):** 사용자와의 설계·계획·리뷰는 **대화(채팅) 안에서 인라인** 으로 한다.
파일(plan.md·PR desc)은 durable 기록/산출물로만 쓰고, 리뷰를 위해 파일 열람을 요구하지 않는다.

### 결정 5 — plan.md 최소 구조 (`write-plan-md` 를 이걸로 축소)

```markdown
# <goal>
## 배경        — as-is → to-be, 왜 필요한지 (2-3문장)
## 계획        — T1..Tn: 독립 작업 단위 서술 (분해 = 병렬 단위 = 인간 서술)
## 향후 과제   — (선택)
```

- AC 체크박스 게이트 ✗, phase→섹션 매핑 ✗, 저널↔PR 모드 변환 의식 ✗.
- 완료 표시는 가벼운 마커(예: `T2 ✅`)로 resume 판단만. `T1..Tn` 은 상태머신이 아니라
  독립 작업을 서술하는 장치이자 병렬 디스패치 단위.

### 결정 6 — `review` 스킬 (남의 PR 이해 돕기)

목적: 다른 사람의 PR 을 **사용자가 이해하도록 대화로** 돕는다. 승인 게이트가 아니다.

1. **전체 구조 as-is → to-be** 설명.
2. backend → **데이터 흐름**, frontend → **컴포넌트 의존성 + 역할** (다이어그램은 채팅 안 ASCII/mermaid).
3. **리뷰 순서 제시** — 사용자 선호 흐름 **사용자입력 → 클라 → 백 → 영속화** 로,
   입력이 영속화까지 반영되는 경로를 따라 읽도록 안내.

### 결정 7 — 컴포넌트 keep / delete (origin/main `82ca809` baseline 기준)

- **KEEP(수정):** `start`(구 lstack + setup 흡수), `show`, `pr`(신규), `review`(신규),
  `compound`(리프레임), `close`(PR 인터뷰 분리·검증 없음), `write-plan-md`(축소),
  `call-as-codex`(bare), `harness-sage`(compound 용), `PRINCIPLE.md`(재작성), `ARCHITECTURE.md`(축소).
- **DELETE:** agents `judge`·`principal-engineer`·`planner`·`test-designer`,
  command `ask-cto`, hook `validate-plan`(→ `hooks.json` 비움, v2 는 hookless).

### 리스크

- 게이트 제거로 "근거 없이 완료 단정"(반복 1위) 재발 가능 →
  `show` ② 의 근거 첨부 + `pr` desc 한계 명시로 완화.
- arc 가 가이드일 뿐이라 모델이 중간 단계를 스킵할 수 있음 →
  핵심 순간(start/show/pr/close)은 스킬 트리거로 능동 발동해 최소 보장.

## Non-goals

- judge/ralph/verdict 기계장치 재도입.
- Codex 자동 개입(설계/critique/review/judge). `call-as-codex` 는 on-demand 만.
- plan.md 상태머신화(phase 매핑·AC 게이트).
- 세션 recording(`## 세션` + `capture-session` 훅) — 미머지 `feat/session-id-in-plan`
  소관. v2 는 hookless 로 출발하고, 그 브랜치 머지 시 통합한다.

## 계획

### T1: `PRINCIPLE.md` 재작성 — 8개 의도 + 커뮤니케이션 원칙 + 라이프사이클 arc
기존 하니스-구현-원칙을 지우고 결정 4 표 + arc 서술로 교체. `start` 가 로드하는 SSOT.

### T2: `write-plan-md` 축소 — plan.md 최소 구조(결정 5)
phase 매핑·저널↔PR 변환·AC 게이트·`## 세션` SSOT 제거. 예시 plan 도 최소 구조로.

### T3: 삭제 — agents 4 + ask-cto + validate-plan (병렬 가능, 독립)
`judge`·`principal-engineer`·`planner`·`test-designer` 삭제, `commands/ask-cto.md` 삭제,
`hooks/scripts/validate-plan.sh` 삭제 + `hooks/hooks.json` 을 빈 `{}` 로.

### T4: `start` 스킬 — 구 lstack + setup 흡수, 얇게 재작성
결정 2 계약. resume/new 분기, worktree(origin/main), 인터뷰, 가이드 로드, plan 착수.
setup projects/*.md 기본값 메커니즘 유지.

### T5: `show` 스킬 (신규) — 검증 ①/② + Chrome CDP
결정 3. 프로젝트 설정에서 서버 기동/CDP 방식 읽기.

### T6: `pr` 스킬 (신규) — code 올리기
결정 2 계약. draft/ready·assign·reviewer·인간용 desc·`gh pr edit` 우회.

### T7: `review` 스킬 (신규) — 남의 PR 이해 돕기
결정 6. 구조/데이터흐름/컴포넌트 + 사용자입력→클라→백→영속화 리뷰 순서.

### T8: `compound` 리프레임 + `close` 검증 제거·PR 분리
compound = close 직전 자동, 제안만. close = 완료확인 + plan 정리 + worktree 닫기 (PR·검증 없음).

### T9: `ARCHITECTURE.md` 축소 + 매니페스트/CHANGELOG
새 스킬 인벤토리·arc 반영, 삭제된 것 제거. `plugin.json`/`marketplace.json`·`CHANGELOG.md`·`package.json` 버전.

### T10: 검증 — 플러그인 구조/스킬 파싱/상호참조
skill frontmatter·상호참조(끊긴 링크 없는지)·삭제 잔재 없는지 확인. (plugin-validator 활용 가능)
