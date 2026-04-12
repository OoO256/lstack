---
name: write-plan-md
description: |
  This skill should be used by any agent that needs to read or write plan.md.
  Defines the plan.md structure, section conventions, and editing rules.
  Agents should invoke this skill before modifying plan.md to ensure consistency.
---

# Plan — plan.md 구조 및 수정 규칙

모든 agent가 plan.md를 읽고 쓸 때 이 규칙을 따른다.

## plan.md 경로

`docs/worklogs/YYYY-MM-DD-<goal>/plan.md`

## 구조

```markdown
# <goal>

## 요구사항
- [ ] R1: 요구사항 내용
  - [ ] AC1: 검증 항목 (verify: agent-name)
- [x] R2: 완료된 요구사항
  - [x] AC2: 통과한 검증 항목

## 설계
(자유 형식 — 분석, 코드 스니펫, 수정 범위, 설계 결정, 기존 패턴, 리스크)

## 태스크
- [ ] T1: action (agent: agent-name)
  - [ ] AC1: 검증 항목 (verify: agent-name)

- [x] T2: 완료된 태스크 (agent: agent-name)
  - [x] AC2: 통과한 검증 항목
  ### 작업 요약
  ### 의사결정
  ### 암묵지
  ### 검증 방법

## 향후 과제
- 나중으로 미루지만 꼭 해야 하는 일
```

## 섹션별 소유자

| 섹션 | 누가 작성 | 언제 |
|------|----------|------|
| `# <goal>` | PM (start skill) | Phase 1 후 |
| `## 요구사항` | PM이 초안, test-planner가 AC 추가 | Phase 1, 2.4 |
| `## 설계` | architect | Phase 2.1-2.3 |
| `## 태스크` | planner가 초안, orchestrator가 체크+worklog | Phase 2.5, 3-4 |
| `## 향후 과제` | 누구나 추가 가능 | 아무 때나 |

## 수정 규칙

1. **자기 섹션만 수정한다.** 다른 agent의 섹션을 고치지 않는다.
2. **체크박스 규칙:**
   - `- [ ]` → 미완료
   - `- [x]` → 완료 (orchestrator만 체크)
3. **worklog는 체크된 태스크 아래에 작성한다:**
   ```markdown
   - [x] T1: action (agent: ...)
     - [x] AC1: ...
     ### 작업 요약
     (무엇을 했는지)
     ### 의사결정
     (구현 중 내린 결정과 근거)
     ### 암묵지
     (코드에 드러나지 않는 발견, 주의점, 노하우)
     ### 검증 방법
     (어떻게 검증했는지)
   ```
4. **AC 형식:** `- [ ] AC번호: 구체적 검증 항목 (verify: plugin:agent-name)`
5. **태스크 형식:** `- [ ] T번호: action (agent: plugin:agent-name)`
6. **추가만 하고 삭제하지 않는다.** 불필요한 항목은 취소선(~~)으로 표시.
7. **향후 과제는 누구나 추가 가능.** 스코프 밖이지만 기록할 가치가 있는 것.
