---
name: start
description: |
  Use when the user says "/start", "/lstack", "시작", "이거 만들어", "이거 고쳐",
  "이어서", "계속", "resume", or gives a task needing planning and multi-step work.
  Sets up an isolated worktree, clarifies intent by interview, loads the dev guide,
  and presents the plan in chat. Auto-detects fresh start vs resume.
---

# start — 작업 시작 (격리 + 인터뷰 + 계획 제시)

내가 매번 치는 시작 명령(worktree 격리 · 의도 인터뷰 · 계획 제시)을 대신 발동한다.
작업 방식은 `docs/spec/PRINCIPLE.md`(개발 가이드)를 따른다 — 이 스킬이 그 파일을 로드한다.

## 0. resume vs new 판별

```bash
ls -1dt docs/worklogs/*/ 2>/dev/null | head -5
```

- 발화가 "이어서 / 계속 / resume" 이거나 기존 worklog 를 지칭 → **resume**:
  해당 `handoff.md` 를 읽고 결과 / 한계와 후속을 채팅으로 요약 보고한 뒤 이어간다.
  해당 worktree를 아래 register 명령으로 등록하고 이어간다. 같은 tree 재등록은 검사 기준을
  덮어쓰지 않는다. 이미 합의한 1~3은 반복하지 않는다.
- 그 외 새 작업 → **new**: 1 로 진행.

## 1. 격리 (new work, 의도 4)

origin/main 에서 worktree 새 브랜치를 만든다.

- 프로젝트 기본값: `skills/start/projects/<cwd-basename>.md` frontmatter
  (`base_branch` 기본 `main`, `branch_prefix`, `worktree_root` 기본 `.worktrees`). 없으면 기본값.
- 사용자 발화에서 slug를 정한다(소문자 · `[a-z0-9-]`). 이미 합의한 작업이면 이름 확인만을
  위해 중단하지 않는다.

```bash
git fetch origin
git worktree add "<worktree_root>/<branch>" -b "<branch>" "origin/<base_branch>"
cd "<worktree_root>/<branch>"
```

이후 모든 작업은 이 worktree cwd 에서 진행된다. slug 는 worklog 디렉토리 이름에 재사용.

SessionStart는 worktree 생성 전에 실행된다. shell의 `cd`가 hook.cwd도 바꾼다고 가정하지
않는다. **구현 전에** 실제 검사 대상을 명시적으로 등록한다:

```bash
node "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/verify-completion.mjs" register "<worktree 절대경로>"
```

SessionStart가 CLAUDE_ENV_FILE에 저장한 LSTACK_SESSION_ID를 사용한다. 누락·실행 오류는
통과로 취급하지 않는다. .lstack.json opt-in과 검사 계약은 ARCHITECTURE.md의 Hooks를 따른다.

## 2. 인터뷰 (의도 5)

구현 전, **불명확한 의도만** 채팅으로 질문한다: goal · 동기 · 성공 기준 · non-goals.
명확하면 생략. (파일로 넘기지 않는다 — 대화 안에서.)

## 3. 구조 설계 (의도 8)

가이드를 로드하고(`docs/spec/PRINCIPLE.md`) **코드보다 먼저** 구조를 정한다.
큰 책임·경계 변경을 구현 전에 검토하면 후속 수정 범위를 줄일 수 있다.

3.1 · 3.2 의 산출물이 그대로 handoff.md 의 `## 배경` · `## 해결 방법` 이 된다. 따로 쓰는 일이 아니다.

### 3.1 as-is — 기존 개념 트리 · 지금 동작하는 방식 · 문제의 원인

내가 만들 것을 생각하기 전에 **이미 있는 것부터** 읽는다.

- **기존 개념 트리와 관계**: 이 작업이 닿는 개념의 종류·소유·호출 관계를 구분한다.
  신설은 아직 넣지 않고, 별개 객체를 상속 형제처럼 배치하지 않는다.
- **지금 동작하는 방식**: 그 개념들이 실제로 어떻게 맞물려 도는지 (데이터 흐름 · 호출 순서).
- **문제의 원인**: 왜 이 작업이 필요한지. 증상 → 원인 → 근본 원인. 증상에서 멈추지 않는다.

확인된 원인과 아직 가설인 부분을 구분한다. 안전한 조사를 계속해 변경안의 근거를 만든다.

### 3.2 to-be — 3.1 의 트리 위에 얹는다

```
Agent                (기존)
├── ClaudeCodeAgent  (기존)
└── PiAgent          (신설) — 형제. Agent 계약을 그대로 구현
```

- 각 노드에 **기존 / 신설** 표시.
- 신설마다 **"이 개념을 기존 어휘로 뭐라 부를 수 있나"** 를 한 줄로 답한다 — 3.1 에서 그린
  형제, 값을 넘기는 계약, 개명 전 이름, SDK 공식명을 본다. 답이 나오면 그 단어를 쓰고,
  안 나올 때만 왜 못 쓰는지를 적는다.
- 각 책임을 소유할 모듈과 기존 소비자를 적는다. 모든 개념을 별도 파일과 1:1로 쪼개지 않는다.
- 기존 트리가 이 변경을 수용하지 못하면 현재 요청에 필요하고 승인된 범위의 선행 정리만
  포함한다. 검사 시스템 도입은 기존 서비스 코드·제품 테스트 정리의 승인이 아니다.

새 이름 수를 0으로 고정하지 않는다. 필요한 책임 분리·공통 생명주기는 허용하며
불필요한 파생값·통과 계층을 추가하지 않았는지 실제 소비자로 확인한다.

### 3.3 책임·공개 계약·모듈 경계가 바뀌면 구현 전에 독립 검토한다

새 이름·파일 수와 무관하게 구조 영향으로 판단한다. 루틴 구현은 생략할 수 있다.
사용자 목표·확정 요구를 전달하고 구현자의 정당화를 정답으로 넘기지 않는다.

```
Agent(subagent_type="lstack:structure-reviewer",
      prompt="설계 검토 (코드 없음, 아직 구현 전).\n\n작업 목표: <goal>\n\n<3.1 as-is 전문>\n\n<3.2 to-be 전문>")
```

결과는 계획과 **함께** 보여준다. 리뷰어와 내 판단이 다르면 감추지 않고 둘 다 적는다.

### 3.4 작업 단위로 쪼갠다

서로 독립인 단위로 (의도 1). 선행 리팩토링이 있으면 첫 단위.
검사 범위가 넓더라도 수정할 파일은 사용자가 승인한 작업에 한정한다. 점진 lint의 기존
부채나 report 결과를 작업 단위로 추가하지 않는다.

### 3.5 계획 제시

**채팅에 인라인**으로 3.1 → 3.2 → 3.3 → 3.4 순서로 제시한다. 큰 구조 변경의 선택이
아직 합의되지 않았으면 구체적인 변경안을 두고 확인한다. 이미 승인한 범위는 계속 구현한다.
**문서로 만들지 않는다.**

## 4. 구현 중

책임·공개 계약·모듈 경계가 추가로 바뀌면 변경안을 갱신하고 구현 전에 독립 검토한다.
새 파일·타입·export가 생겼다는 이유만으로 중단하지 않는다. 사용자 목표·합의 범위를
바꾸는 선택만 사용자에게 확인한다. 설계 검토가 완료 후 현재 diff 검토를 대신하지 않는다.

분해 · 병렬 · 저가 서브에이전트 위임(의도 1·2)은 판단으로.
subagent 에 맥락을 넘겨야 하면 그때 `handoff` 스킬로 worklog 를 만든다 —
합의한 트리는 `## 해결 방법` 에 적어 compact 이후에도 남게 한다.
이후 arc: 구현 → self-test(lint·unit·integ) → `/show` → `/pr` → `/compound` → `/close`.
