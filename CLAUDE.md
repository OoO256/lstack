# lstack — Personal Development Workflow Harness

A Claude Code plugin for development workflow automation.

## Specs (SSOT)

모든 상세 문서는 `docs/spec/`에 있다. 필요할 때 참조.

- [PRINCIPLE.md](docs/spec/PRINCIPLE.md) — 하니스 구현 원칙
- [ARCHITECTURE.md](docs/spec/ARCHITECTURE.md) — 플러그인 구조, skills, agents, hooks, 워크플로우, plan.md 구조

## Docs Rules

### worklog (프로젝트 단위 작업 디렉토리)
- 경로: `docs/worklogs/YYYY-MM-DD-<한일>/`
- 세션에서 의미 있는 작업을 했으면 반드시 기록
- 디렉토리 구성:
  - `plan.md` — 단일 SOT. 설계, 요구사항, 태스크, worklog, 향후 과제 모두 포함

### spec (SSOT 문서)
- 경로: `docs/spec/<TOPIC>.md` (예: `PRINCIPLE.md`, `ARCHITECTURE.md`)
- 분야별 단일 진실 공급원(SSOT) — 새 문서를 만들지 말고 기존 문서를 업데이트
- 새로운 분야가 생기면 새 파일 생성 가능, 단 기존 spec과 겹치지 않아야 함
- 작업 중 spec에 영향을 주는 결정을 내렸으면 해당 spec 파일을 반영
