# Architecture

lstack는 사용자가 코드를 읽고 변경·장애 원인을 추적할 수 있도록 설계·합의·구현·공유를 연결한다.
이 문서는 전체 흐름과 책임의 인덱스다. 상세 절차와 작성 원칙은 담당 스킬에서 읽는다.

## 작업 흐름

```text
/start: 격리 → 인터뷰 → 기존 코드·원인 조사 → 설계 준비
  → /align: 사용자 분류 확인 → 구조·인터페이스·대표 코드 합의
  → 구현·동작 확인 → 커밋·푸시·PR 공유
  → /align: 실제 코드 이해 확인
  → 마무리할 때 /compound → /close

사용자 요청 시: lint / /reviewer / /show
낯선 기존 코드 설명: /explain
```

새 분류·패턴과 바뀐 범위만 합의하며, 이미 확인한 이해를 반복 시험하지 않는다.
사용자 이해와 구현 허락은 별개다. lint·독립 리뷰 완료를 강제하는 hook는 두지 않는다.

## 책임과 위치

| 구성 | 책임 |
|---|---|
| [start](../../skills/start/SKILL.md) | 격리·인터뷰·기존 구조와 원인 조사·작은 변경안 |
| [align](../../skills/align/SKILL.md) | 사용자 분류·대표 코드 합의와 구현 후 코드 이해 확인 |
| [reviewer](../../skills/reviewer/SKILL.md) | 요청한 가독성·동작 시험·보안 독립 검토와 결과 통합 |
| [pr](../../skills/pr/SKILL.md) | 실제 확인 결과·합의 반영 확인, 커밋·푸시와 PR 공유 |
| [show](../../skills/show/SKILL.md) | 필요한 UI·실제 동작 확인 |
| [compound](../../skills/compound/SKILL.md) / [close](../../skills/close/SKILL.md) | 교정 기록·개선 제안·재발 확인 / 작업 종료 |
| [handoff](../../skills/handoff/SKILL.md) | 합의·결과·한계를 다음 작업에 인계 |
| [nobs](../../skills/nobs/SKILL.md) / [explain](../../skills/explain/SKILL.md) | 평이한 문장 / 변경·기존 코드 설명 방식과 전체 diff의 작성 이유 연결 |
| [call-as-codex](../../skills/call-as-codex/SKILL.md) | 별도 Codex 호출 mechanics |
| [harness-sage](../../agents/harness-sage.md) | 수락된 하니스 개선 구현 |
| [readability-reviewer](../../agents/readability-reviewer.md) | 분류·이름·계약·함수 흐름의 이해 비용 |
| [behavior-tester](../../agents/behavior-tester.md) | 독립 작업 공간에서 기획·경계 사례 재현, 비용·성능·지연 위험 확인 |
| [security-reviewer](../../agents/security-reviewer.md) | 입력·권한·의존성의 악용 가능성 |

[코드 작성 원칙](../../skills/start/references/coding-conventions.md)은 start,
[행동 테스트 판별 기준](../../skills/pr/change-detector-tests.md)은 pr이 소유한다.
[explain](../../skills/explain/SKILL.md)이 코드 설명 방식의 SSOT다.
start·align·handoff·pr은 각 시점의 코드·합의·diff를 전달해 explain을 호출한다.
프로젝트의 분류·용어·계약은 해당 책임의 문서를 참조한다. 공통 원칙 문서로 상세를 다시 모으지 않는다.
[피드백 기록·재사용](../../skills/compound/references/feedback.md)은 compound가 소유하며,
start·reviewer는 관련 승인 기준을 읽고 pr·handoff는 교정 근거와 미해결 지점을 남긴다.

## 플러그인 경계

매니페스트는 `.claude-plugin/`, 실행 지침은 `skills/`, 독립 에이전트는 `agents/`에 둔다.
[hook](../../hooks/hooks.json)는 nobs 알림만 담당한다. 작업 기록은 handoff 하나를 최신 상태로 유지한다.
스킬은 책임과 판단 기준을 제공한다. 호출 mechanics의 실패는 호출자에게 그대로 전달하며 숨기지 않는다.
