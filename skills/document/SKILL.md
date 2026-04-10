---
name: document
description: |
  This skill should be used when the user says "/document", "문서화",
  "기록해", "log this", or when a PostToolUse hook detects a git commit.
  Analyzes the conversation to write a worklog entry and update relevant
  spec SSOT documents.
---

# Document

세션에서 수행한 작업을 docs/worklog에 기록하고, 관련 spec SSOT를 업데이트한다.

## Workflow

### Phase 1: 대화 분석

현재 대화를 분석해서 추출:

1. **작업 내역**: 무엇을 했는가 (구현, 수정, 리팩토링, 설정 등)
2. **결정 사항**: 어떤 선택을 했고 왜 했는가
3. **변경된 컨벤션/원칙/구조**: spec에 반영해야 할 것이 있는가

### Phase 2: Worklog 작성

`docs/worklog/YYYY-MM-DD-<topic>.md` 작성:

```markdown
# YYYY-MM-DD: <한줄 제목>

## 한 일

- <작업 1>
- <작업 2>

## 결정

- <결정 1: 무엇을 왜>
- <결정 2: 무엇을 왜>
```

규칙:
- 같은 날짜에 이미 worklog가 있으면 기존 파일에 추가 (새 파일 만들지 않음)
- 간결하게. 코드 블록이나 상세 설명은 불필요.

### Phase 3: Spec 업데이트

`docs/spec/` 의 기존 SSOT 문서를 확인:

1. 아키텍처 변경이 있었으면 → `ARCHITECTURE.md` 업데이트
2. 컨벤션 변경이 있었으면 → `CONVENTIONS.md` 업데이트 (없으면 생성)
3. 설계 원칙 변경이 있었으면 → `PRINCIPLE.md` 업데이트 (없으면 생성)
4. 해당 없으면 → 스킵

규칙:
- 기존 문서를 업데이트. 새 문서는 정말 새로운 분야일 때만.
- 겹치는 내용이 이미 있으면 중복 추가하지 않음.

### Phase 4: 커밋

```bash
git add docs/worklog/ docs/spec/
git commit -m "docs: update worklog and specs for <topic>"
```
