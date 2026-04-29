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


## Workflow

### 1. 완료 확인
사용자에게 마무리 진행 여부 한 줄 질문. "아직" 이면 중단.

### 2. plan.md 정리 (저널 → PR 모드 변환)

**SSOT: `lstack:write-plan-md` 의 "close 후 구조 (PR 모드)" + "변환 규칙".** 편집 전 반드시 참조.

- **삭제**: `## 설계` 전체 (결정·리스크·Codex 검토·최종 확정), `## AS-IS → TO-BE`, agent 마커 `(exec:..)` / `(v:..)`, `**의사결정**` / `**남은 리스크**` 라벨, 시행착오 흔적.
- **신설**: `## 설계` 자리에 `## 구현 원칙` — 본 PR 에서 적용한 큰 원칙 3-5 개를 외부 리뷰어 관점으로 작성.
- **유지·정리**: `## 배경`, `## 태스크`(헤더+결과 요약+AC 체크박스), `## 향후 과제` — 글쓰기 3원칙 재적용해 다듬는다.

`## 구현 원칙` 은 PR body 의 동명 섹션과 동일 내용 (close Step 3 에서 그대로 복사).

### 3. PR 작성 여부 질문
**N** → Step 4.

**Y** → 같은 글쓰기 원칙으로 작성:
- Title: goal 한 줄 (under 70 chars).
- Body: `## 배경` / `## 구현 원칙` / `## 영향 범위` / `## 향후 과제` (있으면).
- `## 구현 원칙` 은 plan.md `## 구현 원칙` 을 그대로 복사 (단일 SOT).

PR URL 보고.

### 4. Worktree 닫기
현재 cwd 가 worktree 가 아니면 스킵.
worktree 면 사용자 확인받고 제거 (브랜치는 유지). `--force` 금지.

## Anti-patterns

- "T1 에서 X 수정, T2 에서 Y 추가..." 식 구현 나열 PR body
- 사용자 확인 없이 자동으로 모든 단계 실행
- PR push 전에 worktree 제거
- 브랜치 삭제 (사용자 책임)
