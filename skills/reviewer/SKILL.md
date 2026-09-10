---
name: reviewer
description: |
  Use for /reviewer, review, readability review, behavior testing, QA, security review, or design review requests.
  Route to fresh-context readability-reviewer, isolated behavior-tester, and security-reviewer agents as requested.
  Manual invocation only; behavior-tester may create local reproduction artifacts but may not fix product code.
---

# reviewer — 가독성·동작 재현·보안을 독립 검토한다

구현자의 설명에 기대지 않고 요구한 동작과 사용자가 읽는 구조가 실제 코드에 있는지 확인한다.
구현 완료·PR 게시만으로 자동 실행하지 않는다. 제품 코드는 수정하지 않는다.
가독성·보안은 읽기 전용이며, behavior-tester만 독립 작업 공간에서 재현용 파일을 만들고 실행할 수 있다.

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
| [readability-reviewer](../../agents/readability-reviewer.md) | 분류·이름·계약·함수 흐름을 읽고 수정·문제 추적을 하기 쉬운가 |
| [behavior-tester](../../agents/behavior-tester.md) | 기획과 경계 사례를 재현했을 때 동작·비용·성능·지연에 문제가 있는가 |
| [security-reviewer](../../agents/security-reviewer.md) | 입력·권한·의존성에서 악용 가능한 문제가 있는가 |

readability-reviewer는 코드의 이해 비용, behavior-tester는 관찰 가능한 동작과 측정, security-reviewer는 악용 가능성을 담당한다.
예를 들어 반복 요청은 behavior-tester가 결과·호출 비용을 재현하고, 권한 우회 가능성은 security-reviewer가 검토한다.
다른 역할의 문제를 발견하면 근거를 전달하고 중복 지적은 통합한다. 경계를 이유로 명백한 오류를 무시하지 않는다.

[코드 작성 원칙](../start/references/coding-conventions.md)을 읽고, 현재 작업에 적용되는 프로젝트
지침과 사용자 승인 분류·용어·대표 코드 사례를 함께 전달한다. 승인 사실과 AI의 추측을 구분한다.
사례가 없으면 만들지 말고 명시된 원칙과 실제 소비자로 판단한다.
[피드백 재사용 절차](../compound/references/feedback.md)로 관련 기준을 선택하고 원본 경로를
함께 전달한다. 리뷰만 요청했을 때는 기록 파일이나 기준을 갱신하지 않는다.
이는 프로젝트 기록에 대한 제한이다. behavior-tester의 임시 재현 파일은 해당 독립 공간에만 둘 수 있다.

각 리뷰어에는 사용자 요구 원문, 정확한 경로·base·head·변경 목록, 해당 기준의 경로를 준다.
구현자의 해설·정당화·앞선 리뷰 결론을 정답으로 넘기지 않는다. 사용자 승인 설계도 기술적 정확성을
보장하지 않으므로 모순이 있으면 코드 근거로 보고한다. 변경 이후의 옛 리뷰를 현재 결과로 재사용하지 않는다.

## 독립 실행

일반 리뷰 요청은 readability-reviewer·behavior-tester·security-reviewer를 새 context로 병렬 실행한다.
가독성·동작 시험(QA)·보안만 요청했다면 해당 역할만 실행한다. 설계 검토는 readability-reviewer가 맡고,
실행 가능한 구현이 없으면 동작 재현을 한 것으로 취급하지 않는다. 구현자·이전 리뷰어를 resume하지 않는다.

behavior-tester에는 대상 코드의 원본 경로·커밋·미커밋 변경 범위와 요구·실행 환경·허용 한도를 전달한다.
behavior-tester의 [격리·재현 지침](../../agents/behavior-tester.md)에 따라 독립 작업 공간을 확보하게 한다.
도구가 만든 worktree도 대상과 같은 내용인지 확인해야 한다. 자동 worktree 생성만으로 미커밋 변경이
포함되었다고 가정하지 않는다. 격리가 안 되면 behavior-tester는 미완료로 보고하며 원본 공간에서 대신 실행하지 않는다.

```text
Agent(subagent_type="lstack:readability-reviewer", prompt="<요구·경로·변경·적용 기준>. 사람이 읽는 비용 확인.")
Agent(subagent_type="lstack:behavior-tester", isolation="worktree", prompt="<요구·원본 경로·대상 커밋·미커밋 범위·환경·한도>. 대상과 일치하는 독립 공간에서 사례 재현.")
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
behavior-tester는 기대·실제 결과와 재현 조건·측정 근거를 보고한다. 재현 불가를 통과로 바꾸지 않으며,
임시 재현 코드와 실행 조건을 인계한다. 배포 환경에서의 동작·청구 비용까지 확인했다고 일반화하지 않는다.
리뷰 요청은 수정·반복 리뷰·PR 댓글·승인 게시 권한이 아니다. 수정도 요청받았으면 승인 범위만
고치고, 합의 밖의 책임·동작 변경은 align으로 돌린다. 외부 게시와 재리뷰는 요청받았을 때만 한다.
