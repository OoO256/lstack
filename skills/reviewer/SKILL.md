---
name: reviewer
description: |
  Use when the user requests /reviewer, code review, structure review, security review, or design review.
  Run the requested reviewers in fresh contexts against actual code and approved requirements.
  Manual invocation only; review requests do not authorize fixes, external posting, or lint execution.
---

# reviewer — 合의한 기준과 실제 코드를 독립 검토한다

구현자의 설명에 기대지 않고 요구한 동작과 사용자가 읽는 구조가 실제 코드에 있는지 확인한다.
구현 완료·PR 게시만으로 자동 실행하지 않는다. 리뷰만 요청하면 읽기 전용으로 결과를 보고한다.

## 대상과 근거

- 현재 작업: 사용자 지정 base, 프로젝트 기본 base, origin/main 순으로 정한다.
  stacked PR은 선행 브랜치가 base다. 커밋·staged·unstaged·untracked 변경을 모두 포함한다.
- PR: 실제 base·head를 확인하고 diff를 읽는다. 필요하면 격리 worktree를 사용한다.
- 경로: 요청한 코드와 실제 소비자를 읽는다.
- 설계: 기존 코드·관계와 제안된 책임·인터페이스를 검토한다. 구현되지 않은 부분은 설계 판단임을 밝힌다.

Git으로 변경을 수집한다. 별도 수집 스크립트·완료 기록은 만들지 않는다.

```bash
git merge-base "<base>" HEAD
git diff "<merge-base>" --
git diff --cached --
git ls-files --others --exclude-standard -z
```

untracked 파일은 따로 읽고, 부분 staged 변경은 인덱스와 작업 파일을 구분한다.
삭제·개명·실행 지침 변경도 포함한다. 오류나 누락을 빈 diff 또는 검토 완료로 취급하지 않는다.

## 역할과 공통 입력

| 리뷰어 | 책임 |
|---|---|
| [code-reviewer](../../agents/code-reviewer.md) | 요구한 동작·오류 처리·테스트가 맞는가 |
| [structure-reviewer](../../agents/structure-reviewer.md) | 분류·이름·계약을 따라 읽고 수정·버그 추적을 할 수 있는가 |
| [security-reviewer](../../agents/security-reviewer.md) | 입력·권한·의존성에서 악용 가능한 문제가 있는가 |

[코드 작성 원칙](../start/references/coding-conventions.md)을 읽고, 현재 작업에 적용되는 프로젝트
지침과 사용자 승인 분류·용어·대표 코드 사례를 함께 전달한다. 승인 사실과 AI의 추측을 구분한다.
사례가 없으면 만들지 말고 명시된 원칙과 실제 소비자로 판단한다.

각 리뷰어에는 사용자 요구 원문, 정확한 경로·base·head·변경 목록, 해당 기준의 경로를 준다.
구현자의 해설·정당화·앞선 리뷰 결론을 정답으로 넘기지 않는다. 사용자 승인 설계도 기술적 정확성을
보장하지 않으므로 모순이 있으면 코드 근거로 보고한다. 변경 이후의 옛 리뷰를 현재 결과로 재사용하지 않는다.

## 독립 실행

일반 코드 리뷰 요청은 세 리뷰어를 새 context로 병렬 실행한다. 설계는 structure-reviewer만,
특정 역할을 요청했으면 그 리뷰어만 실행한다. 구현자·이전 리뷰어를 resume하지 않는다.

```text
Agent(subagent_type="lstack:code-reviewer", prompt="<요구·경로·변경·적용 기준>. 실제 코드로 확인.")
Agent(subagent_type="lstack:structure-reviewer", prompt="<요구·경로·변경·적용 기준>. 이름·계약의 예측과 구현 대조.")
Agent(subagent_type="lstack:security-reviewer", prompt="<요구·경로·변경·적용 기준>. 권한·입력·의존성 확인.")
```

독립 실행이 불가능하면 그 한계를 알린다. 메인의 자기 점검을 독립 리뷰라고 부르지 않는다.

## 결과와 다음 행동

첫 줄에 확인된 blocker와 검토 완료·미완료를 적는다. 각 지적은 위치, 예상과 실제의 차이,
실제 소비자·영향, 최소 수정안을 포함한다. 같은 원인은 합치고 개수를 채우지 않는다.

blocker는 확인된 사용자 요구·공개 계약 위반 또는 기능·보안·데이터 손상 문제다.
단순 취향·대안·미확인은 별도로 적고, 줄 수·파일 수만으로 blocker를 만들지 않는다.
기존 부채는 새로 만들거나 악화한 문제와 구분한다. 정확성 검증을 가독성 판단으로 대체하지 않는다.

실행한 검사와 미실행·미확인 사항을 구분한다. lint는 따로 요청받았을 때만 실행한다.
리뷰 요청은 수정·반복 리뷰·PR 댓글·승인 게시 권한이 아니다. 수정도 요청받았으면 승인 범위만
고치고, 합의 밖의 책임·동작 변경은 align으로 돌린다. 외부 게시와 재리뷰는 요청받았을 때만 한다.
