# Hooks

lstack 플러그인에 등록된 이벤트 훅 목록. `hooks/hooks.json`에서 관리.

### commit-document-reminder
- **타입**: PostToolUse (Bash)
- **경로**: `hooks/scripts/commit-document-reminder.sh`
- **동작**: `git commit` 명령 감지 시 `/document` 리마인드 출력
- **async**: true

### validate-tasks
- **타입**: PostToolUse (Write|Edit)
- **경로**: `hooks/scripts/validate-tasks.sh`
- **동작**: `tasks.json` 파일 수정 시 `check-jsonschema`로 스키마 validation
- **스키마**: `skills/pm/tasks-schema.json`
- **async**: false (수정 즉시 체크)
- **의존성**: `pip install check-jsonschema`
