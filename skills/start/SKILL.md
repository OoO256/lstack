---
name: start
description: |
  Use when the user says "/start", "/lstack", "시작", "이거 만들어", "이거 고쳐",
  "이어서", "계속", "resume", or gives a task needing planning and multi-step work.
  Prepare a scoped design from existing code, then use align to agree on the user's
  taxonomy, interfaces, and representative code before implementation. Resume existing agreements.
---

# start — 기존 코드를 조사하고 설계를 준비한다

이번 작업이 닿는 기존 코드와 원인을 조사하고, 사용자가 읽고 책임질 수 있는 변경안을 준비한다.
질문·설명·리뷰 요청은 읽기 전용으로 답한다. 아래 작업 준비와 구현은 구현 요청에만 적용한다.

## 0. resume vs new 판별

```bash
ls -1dt docs/worklogs/*/ 2>/dev/null | head -5
```

- 발화가 "이어서 / 계속 / resume" 이거나 기존 worklog 를 지칭 → **resume**:
  해당 `handoff.md` 를 읽고 결과 / 한계와 후속을 채팅으로 요약 보고한 뒤 이어간다.
  기존 worktree를 재사용한다. 이미 합의한 분류·용어·대표 코드와 미해결 부분을 구분하고,
  바뀐 부분만 `align`에서 다시 맞춘다. 기록이 없으면 합의나 이해를 만들어내지 않는다.
- 그 외 새 작업 → **new**: 1 로 진행.

## 1. 격리 (new work)

기본은 최신 origin/main에서 worktree 새 브랜치를 만든다. 사용자가 stacked PR을 요청했다면
합의한 선행 브랜치가 base다. 기존 사용자 변경은 보존한다.

- 프로젝트 기본값: `skills/start/projects/<cwd-basename>.md` frontmatter
  (`base_branch` 기본 `main`, `branch_prefix`, `worktree_root` 기본 `.worktrees`). 없으면 기본값.
- 사용자 발화에서 slug를 정한다(소문자 · `[a-z0-9-]`). 이미 승인된 작업의 이름만으로 중단하지 않는다.

```bash
git fetch origin
git worktree add "<worktree_root>/<branch>" -b "<branch>" "origin/<base_branch>"
cd "<worktree_root>/<branch>"
```

이후 모든 작업은 이 worktree cwd 에서 진행된다. slug 는 worklog 디렉토리 이름에 재사용.

## 2. 인터뷰

구현 전, **불명확한 의도만** 채팅으로 질문한다: goal · 동기 · 성공 기준 · non-goals.
명확하면 생략. (파일로 넘기지 않는다 — 대화 안에서.)

## 3. 기존 구조와 변경안

[코드 작성 원칙](references/coding-conventions.md)과 프로젝트의 해당 책임·작성 지침을 읽는다.
[피드백 재사용 절차](../compound/references/feedback.md)의 조회 방식으로 이번 책임의 승인 기준·
코드 사례와 미해결 지점을 찾는다. 승인 전 제안을 구현 원칙으로 적용하지 않는다.
설계는 채팅에서 설명하며, 전체 저장소를 한 번에 정리하거나 별도 계획 문서를 만들지 않는다.

- **현재:** 실제 사례 하나의 입력 → 처리 → 결과를 코드와 소비자로 확인한다. 종류·소유·호출을
  구분하고 각 책임의 실제 파일·함수를 연결한다. 현재 코드 배치가 원하는 분류라고 가정하지 않는다.
- **원인:** 증상과 원인, 확인된 사실과 가설을 구분한다. 사용자가 이해하기 어려운 경계를 짚는다.
- **변경 후:** 현재와 유지·변경·신설을 비교한다. 책임의 소유자, 의존 방향, 핵심 인터페이스의
  이름·입력·반환·실패 방식을 준비한다. 새 어휘보다 기존 계약과 사용자의 용어를 먼저 찾는다.
- **읽는 모습:** 새 분류나 작성 패턴이면 대표 함수의 짧은 코드 초안을 준비한다. 실행되는 구현이
  아닌 제안임을 밝힌다. 기존 승인 패턴을 그대로 적용한다면 그 사례를 참조하고 재합의를 반복하지 않는다.

한 실행 경로를 이해하고 변경하는 데 필요한 범위로 나눈다. 선행 정리가 필요하면 그 이유와
소비자·호환성·전환 범위를 설명하고 승인받는다. 주변 부채를 이유로 작업 범위를 늘리지 않는다.
서로 독립인 작업만 나누며, 사용자가 직접 작성을 요구한 범위는 위임하지 않는다.

## 4. 합의 → 구현 → 실제 코드 확인

[align](../align/SKILL.md)에서 AI의 분류 이해와 사용자의 구조·동작 이해를 서로 확인하고
구현 범위를 합의한다. 설계안을 제시한 것만으로 구현 허락을 대신하지 않는다.
합의 밖의 책임·동작·범위가 필요할 때만 해당 부분을 다시 맞춘다.

승인된 작은 단위로 구현하고 관련 동작·오류 경로를 확인한다. UI 변경은 `show`로 실제 흐름을
확인하되, 문서 변경에 브라우저 검증을 붙이지 않는다. 실행한 것과 미확인 사항을 구분한다.
lint·독립 리뷰는 사용자가 직접 실행하거나 요청할 때만 수행하며, 기존 프로젝트 필수 CI는 유지한다.

사용자는 푸시된 코드로 확인한다. 승인된 수정은 관련 검증 후 `pr` 절차로 커밋·푸시하고,
`align`의 **구현 후 코드 확인**으로 대표 코드와 읽는 순서를 안내한다. 실제 답변 없이 코드 이해가
확인되었다고 보고하지 않는다. 인계는 `handoff`, 마무리는 `compound`·`close`가 담당한다.
구현 중 교정이 생기면 `compound`의 기록 절차로 현재 요구와 향후 개선 후보를 구분하고,
PR 공유·인계 전에 현재 작업 기록에 남긴다. 코드 이해 확인에서 뒤늦게 나온 피드백도 같은 기록을 갱신한다.
