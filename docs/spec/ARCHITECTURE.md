# Architecture

lstack는 사용자가 현재 코드·변경안·구현 결과를 적은 부담으로 이해하도록 돕는 스킬과,
요청할 때 실행하는 독립 리뷰어로 구성한다.
이 문서는 전체 흐름과 책임을 찾는 인덱스다. 실행 절차·설정·작성 원칙은 담당 구성요소에 둔다.

## 작업 흐름

```text
/start: worktree 격리 → 인터뷰 → 기존 구조·원인 조사 → 설계
  → /align: 현재·변경 후 동작과 버그 추적 이해 → 구현 범위 합의
  → 구현·동작 확인 → 변경 결과 설명·공유 (/pr)
  → 마무리할 때 /compound → /close

필요한 시점에 사용자 요청: 프로젝트 lint / /reviewer / /show
```

`start`는 설계를 준비하고 `align`은 사용자의 이해와 진행 의사를 확인한다.
합의에 없던 책임·동작·범위가 필요해지면 그 부분만 다시 맞춘다. 이미 이해하고 합의한
내용을 반복하거나, 사용자에게 전체 파일 목록과 내부 절차를 한꺼번에 넘기지 않는다.
lint·독립 리뷰의 실행 시점은 사용자가 정하며, lstack는 완료 기록으로 작업을 차단하지 않는다.

## 책임과 위치

| 구성 | 책임 |
|---|---|
| [start](../../skills/start/SKILL.md) | 격리·인터뷰·기존 구조와 원인 조사·작은 범위의 설계 |
| [align](../../skills/align/SKILL.md) | 사용자가 동작과 문제 추적 방법을 이해하도록 설명·확인하고 구현 범위 합의 |
| [reviewer](../../skills/reviewer/SKILL.md) | 사용자가 요청한 설계·코드·구조·보안 리뷰를 새 context에서 실행하고 결과 통합 |
| [code-reviewer](../../agents/code-reviewer.md) | 요구한 기능·로직·오류 처리·테스트의 정확성 |
| [structure-reviewer](../../agents/structure-reviewer.md) | 책임·소유·공개 계약·이름과 역할·원본의 일관성 |
| [security-reviewer](../../agents/security-reviewer.md) | 권한·입력·의존성에서 발생하는 보안 위험 |
| [pr](../../skills/pr/SKILL.md) | 검증 결과·요구 반영 확인, handoff 기반 PR 작성과 커밋·푸시 |
| [show](../../skills/show/SKILL.md) | UI 수동 확인 또는 실제 동작 검증 |
| [compound](../../skills/compound/SKILL.md) / [close](../../skills/close/SKILL.md) | 피드백의 자동화 제안 / 완료 확인과 worktree 정리 |
| [handoff](../../skills/handoff/SKILL.md) | 다음 사람이 이해할 수 있는 최신 인계 문서 |
| [nobs](../../skills/nobs/SKILL.md) / [explain](../../skills/explain/SKILL.md) | 짧고 평이한 설명 / 낯선 코드·PR 이해를 돕는 대화 |
| [call-as-codex](../../skills/call-as-codex/SKILL.md) | 별도 Codex 호출과 결과 전달 |

## 책임을 보존하는 원칙

실행 절차와 작성 원칙은 담당 스킬에 둔다. 필요한 공통 책임은 유지하되,
이름·값·계층을 따라가야 하는 불필요한 비용을 줄인다. 개수 자체로 구조를 판정하지 않는다.

프로젝트의 기존 검사·CI는 해당 프로젝트가 소유한다. lstack는 새 lint 규칙·설정이나
리뷰 증명 장치를 설치하지 않는다. 미실행·미확인 사항은 결과에 명시한다.
hook는 [nobs 알림](../../hooks/hooks.json)만 두어 짧고 평이한 설명 원칙을 상기시킨다.

[코드 작성 원칙](../../skills/start/references/coding-conventions.md)은 start,
[테스트 판별 기준](../../skills/pr/change-detector-tests.md)은 pr이 소유한다.
작업 기록은 handoff 하나로 유지하며, 계획과 설명은 사용자와의 대화에서 한다.
