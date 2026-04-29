---
name: close
description: |
  This skill should be used when the user says "/close", "닫자", "마무리",
  "끝내자", "작업 종료", "PR 만들자", or when the lstack orchestrator reaches
  Phase 7 after Compound. Confirms completion with the user, polishes plan.md
  for outside readers (방침 중심, 구현 나열 금지), optionally opens a PR with
  the same writing principle, then closes the worktree.
---

# close — Phase 7 작업 종료

작업 완료 확인 → plan.md 정리 → PR 작성 여부 인터뷰 → worktree 닫기.

## 글쓰기 원칙 (plan.md 정리 · PR body 공통)

- **구현 방침 중심.** "왜 / 어떤 결정" 위주. 파일·함수 변경 나열 X.
- **외부 개발자 가독성.** 사내 약어/세션 컨텍스트 의존 금지. 배경 → 결정 → 영향 순.
- **간결.** 짧은 bullet, 결과 중심. 프로세스(시도-실패) 기록 X.

## Workflow

### 1. 완료 확인
사용자에게 마무리 진행 여부 한 줄 질문. "아직" 이면 중단.

### 2. plan.md 정리
- `## 배경`, `## 설계 › ### 결정`, 각 `### Tn` 결과 요약, `## 향후 과제` 의 **표현만** 다듬는다.
- 구조(섹션 헤더, 태스크 헤더 suffix, AC 체크박스) · 히스토리(`### Codex 검토`, `### 최종 확정`) 는 유지.
- 새 섹션 추가 금지 (`## 회고` / `## 결과` 등).
- 편집 전 `lstack:write-plan-md` 스킬로 구조 규칙 확인.

### 3. PR 작성 여부 질문
**N** → Step 4.

**Y** → 같은 글쓰기 원칙으로 작성:
- Title: goal 한 줄 (under 70 chars).
- Body: `## 배경` / `## 방침` / `## 영향 범위` / `## 향후 과제` (있으면).

PR URL 보고.

### 4. Worktree 닫기
현재 cwd 가 worktree 가 아니면 스킵.
worktree 면 사용자 확인받고 제거 (브랜치는 유지). `--force` 금지.

## Anti-patterns

- "T1 에서 X 수정, T2 에서 Y 추가..." 식 구현 나열 PR body
- 사용자 확인 없이 자동으로 모든 단계 실행
- PR push 전에 worktree 제거
- 브랜치 삭제 (사용자 책임)
