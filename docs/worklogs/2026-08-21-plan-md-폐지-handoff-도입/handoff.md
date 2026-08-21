# plan.md 폐지 → handoff.md 도입

## 배경

as-is: 작업마다 worklog 에 `plan.md` 를 만들어 계획을 적었다. 그런데 계획을 읽으려면
파일을 따로 열어야 했고, 사용자는 그걸 원하지 않았다 — 계획은 대화 중에 보고 바로 판단하고 싶다.

to-be: 계획은 채팅에 인라인으로만 제시한다. worklog 에는 계획서가 아니라 **인계장**
`handoff.md` 하나만 남긴다. 다음 작업하는 사람에게 "결과가 무엇이고, 이걸 어떻게 이해하면
되는지, 무엇을 알아야 하는지" 를 넘기는 문서다.

## 이해 방법

핵심은 문서의 성격이 바뀐 것이다. **계획서(앞을 보는 문서) → 인계장(뒤를 보는 문서).**
그래서 파일 이름도 시점도 바뀐다: 작업 시작 시 만드는 게 아니라, 맥락을 남에게 넘기는
순간에 만든다 (subagent 위임 전 · PR 전 · compact 전 · `/handoff` 호출).

이해 단위 → 파일 매핑:

- `skills/handoff/SKILL.md` — handoff.md 의 목차·작성 규칙 SSOT + 발동 트리거.
  기존 `skills/write-plan-md/` 를 rename 해 그 자리를 그대로 이어받는다.
- `skills/start/SKILL.md` — 계획을 문서가 아니라 채팅으로 낸다. resume 시 읽는 대상도
  plan.md → handoff.md.
- `skills/pr/SKILL.md` — PR desc 의 소스가 plan.md → handoff.md. desc 를 쓰기 전에
  handoff.md 를 먼저 쓴다는 순서는 유지.
- `docs/spec/PRINCIPLE.md` · `docs/spec/ARCHITECTURE.md` · `CLAUDE.md` — 워크플로우 SSOT.
  "계획은 문서로 만들지 않는다" 를 규범으로 명시.

기존 구조가 이 변경을 그대로 수용했다 — 스킬 하나를 rename 하고 참조를 갈아끼우면 끝이라
선행 리팩토링은 필요하지 않았다.

## 결과

- **handoff.md 목차 확정 (5섹션)**: `배경`(as-is → to-be) · `이해 방법`(중심 개념 ·
  데이터 흐름 · 이해 단위 → 모듈 매핑) · `결과` · `남은 작업` · `인계 사항`.
  파일 하나만 두고 매번 덮어쓴다. 시점에 따라 빈 섹션이 생기는 것은 정상이고 "없음" 으로 남긴다.
- **`write-plan-md` 스킬 → `handoff`**: 구조 SSOT 역할에 `/handoff` 직접 호출을 더했다.
- **워크플로우 참조 정리**: `start` 는 채팅 계획 제시로, `pr` 은 handoff.md 기준으로,
  `close` · `call-as-codex` 는 문구만 정합. spec 3개 문서에 "계획 문서 금지" 규범 추가.
- 이 문서 자체가 새 목차의 첫 적용 사례다.

## 남은 작업

없음.

## 인계 사항

- **과거 worklog 의 plan.md 4개는 그대로 뒀다** — 과거 기록이고, 소급 변환은 가치가 없다.
  즉 `docs/worklogs/` 에는 당분간 plan.md 와 handoff.md 가 섞여 있다.
- **5섹션의 알려진 비용**: 완료할 때마다 항목을 `남은 작업` → `결과` 로 옮겨야 한다.
  검토 때 4섹션안(`상태` 한 섹션 + `✅` 마커)도 후보였고, 이 이동이 실제로 번거롭다고
  느껴지면 `skills/handoff/SKILL.md` 하나만 고쳐 되돌릴 수 있다.
- 검증 방법: `grep -rn "plan\.md\|write-plan-md" CLAUDE.md docs/spec/ skills/ commands/ agents/ hooks/`
  가 아무것도 잡지 않으면 참조 정리가 끝난 것이다 (과거 worklog 는 검색 범위에서 제외).
