---
name: reviewer
description: |
  Use when the user requests "/reviewer", "리뷰해줘", "코드리뷰 해줘", "적대적 리뷰", or a design review.
  요청한 설계·코드·구조·보안 검토를 구현자와 분리한 fresh context에서 수행한다.
  start나 pr의 자동 단계가 아니다. 리뷰만 요청했다면 읽기 전용으로 결과를 보고한다.
---

# reviewer — 코드·구조·보안 독립 검토

구현자와 리뷰어는 별도 context여야 한다. 새 Agent를 실행하며 기존 구현자나 reviewer를
resume해서 fresh 검토로 기록하지 않는다.
사용자가 호출하거나 리뷰를 요청할 때 실행한다. 구현 완료나 PR 게시만을 이유로 자동 실행하지 않는다.

## 대상과 입력

- 인자 없음: 현재 worktree에서 base 대비 커밋·staged·unstaged·untracked 변경 전체.
- PR 번호/URL: 해당 PR의 base와 head를 읽는다. 필요하면 별도 worktree에 checkout한다.
- 경로: 해당 코드와 실제 소비자를 읽고 검토한 범위를 명시한다.
- 설계: 기존 구조·동작·원인과 변경안·사용자 요구를 읽고 structure-reviewer에게 전달한다.

base는 사용자 지정 또는 PR의 base, 프로젝트 기본값, origin/main 순으로 정한다.
Git 명령으로 실제 변경을 읽는다. 아래 merge-base 출력값을 diff의 기준으로 사용한다.

```bash
git merge-base "<base>" HEAD
git diff "<merge-base>" --
git diff --cached --
git ls-files --others --exclude-standard -z
```

untracked 파일은 별도로 읽는다. 부분 staged 상태면 인덱스와 작업 파일의 차이를 구분하고
Git 오류를 빈 diff로 취급하지 않는다. 삭제·개명·기존 선언 변경도 검토한다.
코드 외 에이전트·스킬·참고 문서·hook 설정도 실제 동작에 영향을 주면 함께 읽는다.

## 역할 구분

| 리뷰어 | 핵심 질문 | 주 담당 |
|---|---|---|
| [code-reviewer](../../agents/code-reviewer.md) | 요구한 동작이 실제로 맞는가? | 명세·로직·오류 처리·테스트·성능 |
| [structure-reviewer](../../agents/structure-reviewer.md) | 책임과 이름을 따라 변경·문제 원인을 이해할 수 있는가? | 소유·공개 계약·의존 방향·중복 원본·이름과 역할 |
| [security-reviewer](../../agents/security-reviewer.md) | 신뢰할 수 없는 입력이나 권한으로 어떤 피해가 가능한가? | 인증·인가·인젝션·시크릿·의존성 취약점 |

역할은 주 담당을 정할 뿐 다른 영역의 명백한 오류를 무시하라는 뜻은 아니다.
같은 원인의 지적은 통합할 때 하나로 묶고, 기능 오류·구조 비용·보안 영향의 근거를 구분한다.

## 독립 검토

일반 코드 리뷰 요청은 새 Agent 세 개를 병렬 실행한다. 설계 검토는 structure-reviewer만,
보안 등 특정 영역만 요청했다면 해당 리뷰어만 실행한다.
각 reviewer에는 사용자 목표·확정 요구,
정확한 작업 경로·base·변경 목록과 실제 코드를 준다. PR 설명과 구현자의 설계 정당화를
정답으로 넘기지 않는다. 필요한 제품 요구는 원문에서 분리해 전달한다.
`align`에서 합의한 동작·수정 범위가 있으면 사용자 요구로 전달한다. 합의된 설계라는
이유로 구현의 타당성까지 보장된 것으로 취급하지 않는다.

```text
Agent(subagent_type="lstack:code-reviewer", prompt="<목표·요구·경로·변경>. 실제 코드로 검증.")
Agent(subagent_type="lstack:security-reviewer", prompt="<목표·요구·경로·변경>. 보안 검토.")
Agent(subagent_type="lstack:structure-reviewer", prompt="현재 diff 검토. <목표·요구·경로·base·변경>. 실제 소비자를 읽어라.")
```

구조 reviewer는 기존 관계·원인부터 확인하고 책임·소유·공개 계약·이름·SSOT를 검토한다.
설계 검토 결과를 구현된 코드의 검토로 대신하지 않는다. 결과는 사용자에게 보고하며
완료 기록 파일이나 hook용 JSON을 작성하지 않는다.

## 결과와 수정

채팅에 blocker, advisory, 실행한 검사와 미완료 사항을 중요도 순으로 보고한다.
모든 의미적 지적에는 위치·실제 소비자·문제 근거·구체적 수정안을 포함한다.
구조 blocker는 사용자 요구·책임·공개 계약·모듈 경계의 확인된 오류다.
이름·파일·계층 수, 사용처 1곳, 단어 자체는 blocker 사유가 아니다.

리뷰 요청은 수정 권한이 아니다. 수정도 요청받았다면 승인된 범위에서만 고친다.
합의에 없던 책임·동작·범위가 필요해지면 그 부분을 `align`에서 다시 맞춘다.
기존 부채는 관찰 결과로 구분하고 서비스 코드·제품 테스트 정리로 범위를 넓히지 않는다.
검토 중 또는 검토 후 코드가 바뀌면 이전 결과를 현재 코드의 검토라고 보고하지 않는다.
실행하지 않은 검사·미완료 리뷰는 성공으로 보고하지 않으며, 재검토를 자동 반복하지 않는다.

## 외부 게시

사용자가 명시적으로 요청했을 때만 PR 리뷰를 게시한다. 게시할 내용을 먼저 완성하고,
이미 받은 권한·draft/ready·reviewer 선택은 재질문하지 않는다. 멀티라인 내용은 파일에
실제 줄바꿈으로 작성하고 gh의 --body-file을 쓴다. 로컬 검토만 요청했다면 게시하지 않는다.
