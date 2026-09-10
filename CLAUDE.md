# lstack — Personal Development Workflow Harness

A Claude Code plugin for development workflow automation.

## Specs (SSOT)

전체 구조는 `docs/spec/`, 실행·작성 원칙은 해당 스킬이 소유한다.

- [ARCHITECTURE.md](docs/spec/ARCHITECTURE.md) — 전체 흐름과 책임을 찾는 인덱스
- 설계·작성 원칙은 `skills/start/`, 사용자 분류·코드 이해·합의는 `skills/align/`에서 읽는다.

## Docs Rules

### worklog (프로젝트 단위 작업 디렉토리)
- 경로: `docs/worklogs/YYYY-MM-DD-<한일>/`
- 세션에서 의미 있는 작업을 했으면 반드시 기록
- 디렉토리 구성:
  - `handoff.md` — 유일한 문서. 인계장(배경 · 해결 방법 · 결과 · 한계와 후속).
    구조는 `skills/handoff/` SSOT
- **계획 문서는 만들지 않는다** — 계획은 채팅에 인라인으로 제시한다

### spec (SSOT 문서)
- 경로: `docs/spec/<TOPIC>.md` (예: `ARCHITECTURE.md`)
- 분야별 단일 진실 공급원(SSOT) — 새 문서를 만들지 말고 기존 문서를 업데이트
- 새로운 분야가 생기면 새 파일 생성 가능, 단 기존 spec과 겹치지 않아야 함
- 작업 중 spec에 영향을 주는 결정을 내렸으면 해당 spec 파일을 반영
- 실행 절차·작성 원칙은 담당 스킬에 두고 아키텍처 인덱스에 상세를 복제하지 않는다.

## Workflow Rules

- **PR 은 리뷰어 없이 만든다** — assignee 만 지정하고 리뷰어는 붙이지 않는다
- **수정하면 항상 버전을 올린다** — `.claude-plugin/plugin.json` · `package.json` · `CHANGELOG.md` 세 곳
