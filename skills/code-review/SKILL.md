---
name: code-review
description: |
  Use when the user says "/code-review", "코드리뷰 해줘", "적대적 리뷰", or before /pr.
  code-reviewer + security-reviewer + structure-reviewer를 구현자와 분리한 fresh context로
  병렬 spawn한다. 현재 worktree·PR·경로를 검토하고 승인된 구현의 blocker를 고친다.
---

# code-review — 독립 검토

구현자와 리뷰어는 별도 context여야 한다. 새 Agent를 실행하며 기존 구현자나 reviewer를
resume해서 fresh 검토로 기록하지 않는다.

## 대상과 입력

- 인자 없음: 현재 worktree에서 base 대비 커밋·staged·unstaged·untracked 변경 전체.
- PR 번호/URL: 해당 PR의 base와 head를 읽는다. 필요하면 별도 worktree에 checkout한다.
- 경로: 해당 코드와 실제 소비자를 읽는다. 경로 일부만 검토한 결과는 프로젝트 전체
  완료 증거로 쓰지 않는다.

base는 .lstack.json을 우선하고 프로젝트 기본값, origin/main 순으로 정한다.

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/code-review/concept-budget.mjs" "<base>"
git diff "<merge-base>" --
```

변경 수집 스크립트가 출력한 untracked 파일은 별도로 읽고 전체 내용을 전달한다.
Git 오류를 빈 diff로 취급하지 않는다. JavaScript/TypeScript 외 agents/*.md,
skills/**/SKILL.md, hooks/*.json도 실제 동작 변경이다.
새 이름·사용처 수 표는 후보 목록이며, 삭제·개명·기존 선언 변경도 직접 검토한다.

## 병렬 검토

새 Agent 세 개를 같은 메시지에서 병렬 실행한다. 각 reviewer에는 사용자 목표·확정 요구,
정확한 작업 경로·base·변경 목록과 실제 코드를 준다. PR 설명과 구현자의 설계 정당화를
정답으로 넘기지 않는다. 필요한 제품 요구는 원문에서 분리해 전달한다.

```text
Agent(subagent_type="lstack:code-reviewer", prompt="<목표·요구·경로·변경>. 실제 코드로 검증.")
Agent(subagent_type="lstack:security-reviewer", prompt="<목표·요구·경로·변경>. 보안 검토.")
Agent(subagent_type="lstack:structure-reviewer", prompt="현재 전체 diff 검토. <목표·요구·경로·base·후보 표·변경>. 실제 소비자를 읽어라.")
```

구조 reviewer는 기존 관계·원인부터 확인하고 책임·소유·공개 계약·이름·SSOT를 검토한다.
설계 검토 결과를 diff 검토로 재사용하지 않는다. Stop hook opt-in 프로젝트에서는
SubagentStart/Stop이 session·agent·작업 tree·시작/끝 snapshot을 기록한다. 메인이 쓰는
통과 파일이나 문장은 인정하지 않는다. hook가 주입한 최종 응답 형식을 reviewer가 따른다.

## 결과와 수정

채팅에 blocker, advisory, 실행한 검사와 미완료 사항을 중요도 순으로 보고한다.
모든 의미적 지적에는 위치·실제 소비자·문제 근거·구체적 수정안을 포함한다.
구조 blocker는 사용자 요구·책임·공개 계약·모듈 경계의 확인된 오류다.
이름·파일·계층 수, 사용처 1곳, 단어 자체는 blocker 사유가 아니다.

승인된 구현 범위의 blocker는 메인이 수정하고 새 reviewer로 다시 검토한다.
동일 코드에 같은 검사·리뷰를 반복하지 않는다. 범위 밖 선택이나 새로운 권한이 필요한
경우만 사용자에게 확인한다. 분석·남의 PR 리뷰 요청은 수정 권한이 아니므로 결과를 보고한다.

프로젝트 review가 `report`면 의미적 지적은 보고하고, `enforce`면 승인된 범위의 확정 blocker를 수정한다.
검사 대상이라는 이유로 수정 권한을 넓히지 않는다. 기존 부채는 관찰 결과로 남기며,
검사 시스템 도입만 승인된 작업에서 기존 서비스 코드·제품 테스트 정리를 시작하지 않는다.
lint 실패·리뷰 미완료·실행 오류는 어느 모드에서도 성공으로 보고하지 않는다.
검토 중 또는 검토 후 코드가 바뀌면 현재 변경에 대해 새 review가 필요하다.

## 외부 게시

사용자가 명시적으로 요청했을 때만 PR 리뷰를 게시한다. 게시할 내용을 먼저 완성하고,
이미 받은 권한·draft/ready·reviewer 선택은 재질문하지 않는다. 멀티라인 내용은 파일에
실제 줄바꿈으로 작성하고 gh의 --body-file을 쓴다. 로컬 검토만 요청했다면 게시하지 않는다.
