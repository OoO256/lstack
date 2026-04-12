# Skills

lstack 플러그인에 정의된 스킬 목록.

### pm
- **경로**: `skills/pm/SKILL.md`
- **트리거**: `/pm`, "프로젝트 시작", "이거 만들어", "이거 고쳐"
- **역할**: 가벼운 6-phase 오케스트레이터. 각 phase를 전문 agent에게 위임하고 tasks.json 상태만 추적.
- **워크플로우**: Interview → Design (architect → test-planner → planner) → Execute+Verify (orchestrator) → Document → Compound
- **원칙**: `docs/spec/PRINCIPLE.md` 참조

### compound
- **경로**: `skills/compound/SKILL.md`
- **트리거**: `/compound`, "컴파운드"
- **역할**: Self-improvement loop. 대화에서 워크플로우 문제를 분석하고, 레퍼런스 플러그인에서 패턴을 탐색하여 harness-sage가 개선 PR 생성.
- **레퍼런스**: `skills/compound/references.md` (superpowers, gstack, hoyeon, omc)

### document
- **경로**: `skills/document/SKILL.md`
- **트리거**: `/document`, "문서화", 또는 커밋 후 자동 리마인드
- **역할**: 대화를 분석해서 worklog 작성 + spec SSOT 업데이트
