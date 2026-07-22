---
name: start
description: |
  Use when the user says "/start", "/lstack", "시작", "이거 만들어", "이거 고쳐",
  "이어서", "계속", "resume", or gives a task needing planning and multi-step work.
  Also resume this skill when the user briefly approves a plan it proposed (for example
  "그래", "진행해", "해줘", or "go ahead").
  Sets up an isolated worktree, clarifies intent by interview, loads the dev guide,
  and drafts plan.md. Auto-detects fresh start, plan continuation, and resume.
---

# start — 작업 시작 (격리 + 인터뷰 + 계획 착수)

내가 매번 치는 시작 명령(worktree 격리 · 의도 인터뷰 · plan 착수)을 대신 발동한다.
작업 방식은 `docs/spec/PRINCIPLE.md`(개발 가이드)를 따른다 — 이 스킬이 그 파일을 로드한다.

## 0. continuation vs resume vs new 판별

```bash
ls -1dt docs/worklogs/*/ 2>/dev/null | head -5
```

- 직전 `start` 실행이 계획을 인라인으로 보여주고 확인을 요청했으며, 현재 발화가 짧은 승인
  (예: "그래 / 진행해 / 해줘") → **continuation**: 아래 1~3을 반복하지 않고 4로 진행.
- 발화가 "이어서 / 계속 / resume" 이거나 기존 worklog 를 지칭 → **resume**:
  해당 plan.md 를 읽고 "된 것(`✅`) / 남은 것" 을 채팅으로 요약 보고한 뒤 이어간다. (아래 1~3 스킵)
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

## 3. 가이드 로드 + plan.md 착수

1. `docs/spec/PRINCIPLE.md` 를 읽어 개발 의도를 컨텍스트에 로드한다.
2. worklog 디렉토리 `docs/worklogs/YYYY-MM-DD-<slug>/` 생성.
3. 계획을 쪼개기 전에 **구조 판단**(의도 8)을 먼저 한다 — 이 작업이 만들/바꿀 이해 단위는
   무엇이고 어떤 모듈/파일과 1:1 대응하는가, 기존 구조가 이 변경을 깔끔히 수용하는가.
   구조 영향이 있으면 `## 설계 › ### 구조` 에 기록하고, 선행 리팩토링이 필요하면 첫 태스크로 계획한다.
4. `write-plan-md` 스킬 구조로 plan.md 작성: `## 배경`(as-is → to-be) + `## 계획`(독립 작업 T1..Tn).
5. 계획을 **채팅에 인라인**으로 보여주고 "이대로 갈까?" 가벼운 확인.

## 4. 승인 후 실행 인계

계획이 승인되면 구현 전에 아래를 한 번 판단하고 결과를 채팅에 한 줄로 남긴다.

1. 계획의 태스크별 변경 파일과 유사 모듈 크기를 보고 예상 추가+삭제 라인을 합산해
   `<300` / `≥300` 두 구간으로만 추정한다. 정확한 LOC 예측이 아니라 위임 결정을 위한 분류다.
2. 독립적이고 경계가 명확한 태스크를 찾고, 각 태스크의 파일 소유권이 겹치지 않게 나눈다.
   공유 계약·같은 파일을 바꾸는 작업은 먼저 순차 처리하고 그 뒤 병렬화한다.
3. 메인이 상위 모델(fable/sol 또는 동급)이고 예상 구현 diff 가 `≥300`이면, 구현은
   Sonnet/Terra급 서브에이전트에 병렬 위임하는 것을 기본으로 한다. 메인은 계획·감독·통합·검증을 맡는다.
4. 위임할 수 없으면 `작업이 너무 작음`, `파일 경계가 겹침`, `하나의 공유 계약에 강결합`처럼
   구체적인 이유를 남기고 로컬에서 진행한다. 단순히 "판단상"이라고 쓰지 않는다.

예: `예상 ≥300줄 · T1/T2는 파일 경계가 달라 Sonnet/Terra에 병렬 위임 · 메인은 통합/검증`
또는 `예상 <300줄 · 한 파일의 단일 계약 변경이라 로컬 진행`.

이후 arc: 구현 → self-test → `/show` → `/pr` → `/compound` → `/close`.
