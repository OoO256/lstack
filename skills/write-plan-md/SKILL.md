---
name: write-plan-md
description: |
  This skill should be used by any agent that needs to read or write plan.md.
  Defines the minimal plan.md structure and writing rules. Invoke before modifying plan.md.
---

# plan.md 구조 및 수정 규칙

plan.md 는 작업의 단일 SOT 이자 **인간용 문서**다.
경로: `docs/worklogs/YYYY-MM-DD-<slug>/plan.md`.

## 구조 (최소)

```markdown
# <goal>

## 배경
as-is → to-be. 왜 이 작업이 필요한지 2-3 문장. 처음 보는 동료가 맥락을 잡을 수 있게.

## 계획
독립 작업 단위를 T1..Tn 으로 서술한다. 분해 단위 = 병렬 디스패치 단위 = 인간이 읽는 단위.

### T1: action
무엇을 / 왜. 필요하면 수정/신규 힌트 1-3 줄.

### T2: action ✅
결과 요약 1-2 줄 (방침 중심). 완료 마커 `✅`.

## 향후 과제 (선택)
스코프 밖이지만 기록할 가치가 있는 것.
```

## 규칙

- **T1..Tn 은 서술 장치이자 병렬 단위** — 상태머신이 아니다.
  AC 체크박스 게이트 · phase→섹션 매핑 · 저널↔PR 모드 변환 없음.
- **완료 표시는 가벼운 마커** (`✅`). resume 시 "된 것 / 남은 것" 판단용. 마커 없음 = 남음.
- **인간용 글쓰기 (의도 7):**
  - 방침 중심 — "왜 / 어떤 결정" 위주. 파일·함수 나열 X (필요하면 한두 줄로 압축).
  - 외부 가독성 — 이 작업 안 한 동료가 처음 읽고 이해 가능하게. 사내 약어 · "아까 그거" 식 지시 금지.
  - 간결 — 결과 중심. 시도-실패-재시도 프로세스는 기록하지 않는다.
  - UI/UX 변경은 캡처 이미지를 첨부한다.
- **추가/수정만, 물리적 재배치 없음.** 완료돼도 T 순서·위치를 유지한다.
- 설계 판단이 무거우면 `## 배경` 아래 `## 설계`(결정 · 리스크)를 선택적으로 둘 수 있다. 남발 금지.
