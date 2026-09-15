---
name: explain
description: |
  Use for PR/code explanations and when start, align, handoff, or pr needs to explain
  a change. Owns the shared explanation convention: data-flow before/after views at
  two abstraction levels and complete coverage of why each diff was written.
  Explanation is not implementation permission or independent review.
---

# explain — 모든 변경 코드의 작성 이유를 이해하게 한다

사용자가 모든 diff 코드를 볼 때 왜 이렇게 작성했는지 이해하도록 돕는다. 자기 작업·타인의 PR·
기존 코드·구현 전 초안에 적용한다. 설명 방식의 SSOT는 이 스킬이며, 호출한 스킬에 규칙을 복제하지 않는다.

[변경 설명 규칙](references/change-explanation.md)을 읽고 적용한다. 이 문서가 설명 순서,
추상화 수준, 한 그림의 전후 비교, CE(모든 변경의 작성 이유를 빠짐없이 연결)를 정의한다.

## 입력과 근거

- PR URL·번호: `gh pr view`로 base·head·본문을 확인하고 `gh pr diff`와 관련 원본 코드·소비자를 읽는다.
  PR 본문의 주장만으로 작성 이유나 동작을 확정하지 않는다.
- 로컬 변경: 합의한 base와 현재 변경 전체를 읽는다. staged·unstaged·이번 작업의 새 파일도 포함하고,
  사용자나 다른 작업의 변경을 섞지 않는다.
- 설계·기존 코드: 호출자가 준 요구·기존 코드·초안의 범위를 사용한다. 구현 전후나 검증 결과를
  만들어내지 않는다. 비교할 변경이 없는 기존 코드 설명은 현재 흐름과 확인 가능한 이유를 설명한다.

## 호출 시점과 출력

| 호출자 | 넘기는 맥락 | explain의 출력 |
|---|---|---|
| 직접 요청 | PR·파일·질문 범위 | 채팅에서 설명과 코드 읽는 순서 |
| start | 요구·원인·현재 코드·변경안 | 구현 전 설명. 초안과 확인된 현재 동작을 구분 |
| align | 기존 합의·사용자의 교정·초안 또는 실제 diff | 합의나 코드 이해 확인에 필요한 설명의 갱신 |
| handoff | 합의·최종 변경·검증·한계 | 호출자가 작성 중인 인계 문서에 들어갈 설명 |
| pr | 최종 diff·handoff | 설명 누락·변경을 대조하고 PR 본문에 사용할 설명 |

호출은 이 SKILL.md와 참조 규칙을 읽고 해당 맥락에 적용하는 것이다. 별도 에이전트 생성은 필요 없다.
기존 설명이 현재 변경과 일치하면 재사용하고 달라진 부분만 갱신한다. 직접 설명 요청은 채팅에서
완결하며 사용자를 파일로 넘기지 않는다. 문서·PR 작성은 호출자가 이미 승인받은 출력 범위에 따른다.

## 책임 경계

설명 요청만으로 제품 코드를 수정하거나 PR을 게시하지 않는다. 독립 검토는 reviewer,
사용자의 이해 확인과 구현 합의는 align, 인계 문서 구조는 handoff, 게시 절차는 pr이 소유한다.
코드 이해가 확인되지 않았으면 그대로 남긴다. explain이 호출자를 다시 호출하는 순환 절차를 만들지 않는다.
