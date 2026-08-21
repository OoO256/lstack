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
  해당 `handoff.md` 를 읽고 결과 / 남은 작업 / 인계 사항을 채팅으로 요약 보고한 뒤 이어간다.
  (아래 1~3 스킵)
- 그 외 새 작업 → **new**: 1 로 진행.

## 1. 격리 (new work, 의도 4)

origin/main 에서 worktree 새 브랜치를 만든다.

- 프로젝트 기본값: `skills/start/projects/<cwd-basename>.md` frontmatter
  (`base_branch` 기본 `main`, `branch_prefix`, `worktree_root` 기본 `.worktrees`). 없으면 기본값.
- 사용자 발화에서 slug 유도(소문자 · `[a-z0-9-]`). `<branch_prefix><slug>` 후보를 보여주고 확인.

```bash
git fetch origin
git worktree add "<worktree_root>/<branch>" -b "<branch>" "origin/<base_branch>"
cd "<worktree_root>/<branch>"
```

이후 모든 작업은 이 worktree cwd 에서 진행된다. slug 는 worklog 디렉토리 이름에 재사용.

## 2. 인터뷰 (의도 5)

구현 전, **불명확한 의도만** 채팅으로 질문한다: goal · 동기 · 성공 기준 · non-goals.
명확하면 생략. (파일로 넘기지 않는다 — 대화 안에서.)

## 3. 가이드 로드 + 계획 제시

1. `docs/spec/PRINCIPLE.md` 를 읽어 개발 의도를 컨텍스트에 로드한다.
2. 계획을 쪼개기 전에 **구조 판단**(의도 8)을 먼저 한다 — 이 작업이 만들/바꿀 이해 단위는
   무엇이고 어떤 모듈/파일과 1:1 대응하는가, 기존 구조가 이 변경을 깔끔히 수용하는가.
   선행 리팩토링이 필요하면 첫 작업으로 계획한다.
3. 계획을 **채팅에 인라인**으로 제시하고 "이대로 갈까?" 가벼운 확인.
   배경(as-is → to-be) + 독립 작업 단위 + 구조 판단 결과. **문서로 만들지 않는다.**

확인되면 구현으로 넘어간다 — 분해 · 병렬 · 저가 서브에이전트 위임(의도 1·2)은 판단으로.
subagent 에 맥락을 넘겨야 하면 그때 `handoff` 스킬로 worklog 를 만든다.
이후 arc: 구현 → self-test → `/show` → `/pr` → `/compound` → `/close`.
