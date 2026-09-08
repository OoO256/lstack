# Architecture

lstack는 작업 흐름을 안내하는 스킬, 구현자와 분리해 판단하는 리뷰어,
프로젝트가 선택한 lint와 구조 리뷰의 실행을 확인하는 Claude Code hook로 구성한다.
이 문서는 전체 흐름과 책임을 찾는 인덱스다. 실행 절차·설정·작성 원칙은 담당 구성요소에 둔다.

## 작업 흐름

```text
/start: worktree 격리 → 인터뷰 → 기존 구조·원인 조사 → 설계
  → 구조 영향이 있으면 사전 structure-reviewer 검토
  → /align: 현재·변경 후 동작과 버그 추적 이해 → 구현 범위 합의
  → 구현 → /reviewer: 코드·구조·보안 검토
  → 최종 코드 검증 (UI 변경은 /show) → /pr → /compound → /close
```

`start`는 설계를 준비하고 `align`은 사용자의 이해와 진행 의사를 확인한다.
합의에 없던 책임·동작·범위가 필요해지면 그 부분만 다시 맞춘다. 사전 설계 검토는
구현 후 실제 코드 검토를 대신하지 않으며, 리뷰로 고친 최종 코드를 검증하고 푸시한다.

## 책임과 위치

| 구성 | 책임 |
|---|---|
| [start](../../skills/start/SKILL.md) | 격리·인터뷰·설계, 구조 영향이 있으면 구현 전 독립 검토 |
| [align](../../skills/align/SKILL.md) | 사용자가 동작과 문제 추적 방법을 이해하도록 설명·확인하고 구현 범위 합의 |
| [reviewer](../../skills/reviewer/SKILL.md) | 코드·구조·보안 리뷰어를 새 context에서 실행하고 결과 통합 |
| [code-reviewer](../../agents/code-reviewer.md) | 요구한 기능·로직·오류 처리·테스트의 정확성 |
| [structure-reviewer](../../agents/structure-reviewer.md) | 책임·소유·공개 계약·이름과 역할·원본의 일관성 |
| [security-reviewer](../../agents/security-reviewer.md) | 권한·입력·의존성에서 발생하는 보안 위험 |
| [변경 수집](../../skills/reviewer/references/change-collection.md) | git 변경과 새 이름 후보 수집, hook와 공유하는 변경 snapshot 계산 |
| [lint·리뷰 확인](../../hooks/lint-and-review.md) | 프로젝트 lint 실행과 현재 변경에 대한 실제 구조 리뷰 완료 확인 |
| [pr](../../skills/pr/SKILL.md) | 검증 결과·요구 반영 확인, handoff 기반 PR 작성과 커밋·푸시 |
| [show](../../skills/show/SKILL.md) | UI 수동 확인 또는 실제 동작 검증 |
| [compound](../../skills/compound/SKILL.md) / [close](../../skills/close/SKILL.md) | 피드백의 자동화 제안 / 완료 확인과 worktree 정리 |
| [handoff](../../skills/handoff/SKILL.md) | 다음 사람이 이해할 수 있는 최신 인계 문서 |
| [nobs](../../skills/nobs/SKILL.md) / [explain](../../skills/explain/SKILL.md) | 짧고 평이한 설명 / 낯선 코드·PR 이해를 돕는 대화 |
| [call-as-codex](../../skills/call-as-codex/SKILL.md) | 별도 Codex 호출과 결과 전달 |

## 책임을 보존하는 원칙

문법으로 판정할 규칙과 기존 위반의 점진 적용은 프로젝트 lint가 소유한다.
lstack는 그 규칙을 복제하지 않고 실행 결과를 확인한다. 책임·이름·의도에 대한 판단은
실제 코드와 소비자를 읽는 리뷰어가 맡으며, 후보 수나 메인의 통과 선언으로 대신하지 않는다.

프로젝트는 `.lstack.json`으로 검사 대상·lint 명령·구조 지적 처리 방식을 선택한다.
필드별 작성 원칙은 [프로젝트 설정](../../hooks/project-config.md)에 둔다. 검사 대상은 수정 권한이 아니다.

hook는 Claude Code의 실제 세션·리뷰어 이벤트에 연결된다. 스킬을 다른 실행 환경에서
사용한다고 이 hook까지 적용되는 것은 아니다. 이벤트 연결과 상태의 한계는 담당 문서가 설명한다.

[코드 작성 원칙](../../skills/start/references/coding-conventions.md)은 start,
[테스트 판별 기준](../../skills/pr/change-detector-tests.md)은 pr이 소유한다.
작업 기록은 handoff 하나로 유지하며, 계획과 설명은 사용자와의 대화에서 한다.
