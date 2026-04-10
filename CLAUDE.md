# lstack — Personal Development Workflow Harness

A Claude Code plugin for development workflow automation.

## Structure

- `skills/` — Skill definitions (each skill is a directory with `SKILL.md`)
- `agents/` — Agent definitions (`.md` files with YAML frontmatter)
- `commands/` — Slash command definitions (`.md` files)
- `hooks/` — Event hooks registered in `hooks.json`
- `docs/worklog/` — 날짜별 작업 로그
- `docs/spec/` — 분야별 SSOT 문서 (누적 업데이트)
- `docs/plan/` — 구현 계획 문서
- `tests/` — Tests for skills and hooks

## Conventions

- Follow Claude Code plugin conventions (`.claude-plugin/plugin.json` manifest)
- Skills use YAML frontmatter with `name` and `description` fields

## Docs Rules

### worklog (작업 로그)
- 경로: `docs/worklog/YYYY-MM-DD-<한일>.md`
- 세션에서 의미 있는 작업을 했으면 반드시 기록
- 무엇을 했고, 왜 했고, 어떤 결정을 내렸는지 간결하게

### spec (SSOT 문서)
- 경로: `docs/spec/<TOPIC>.md` (예: `PRINCIPLE.md`, `CONVENTIONS.md`)
- 분야별 단일 진실 공급원(SSOT) — 새 문서를 만들지 말고 기존 문서를 업데이트
- 새로운 분야가 생기면 새 파일 생성 가능, 단 기존 spec과 겹치지 않아야 함
- 작업 중 spec에 영향을 주는 결정을 내렸으면 해당 spec 파일을 반영

### plan (구현 계획)
- 경로: `docs/plan/YYYY-MM-DD-<feature>.md`
- 구현 전 계획, 구현 후에는 worklog로 결과 기록

## Agents

### harness-sage
Plugin improvement expert. Spawned by `/compound` in an isolated worktree. Analyzes reference plugin patterns and implements improvements to lstack via issue + PR.

## Skills

### compound
Self-improvement loop. Trigger: `/compound` or "컴파운드". Analyzes conversation for workflow problems, searches reference plugins (superpowers, gstack, hoyeon, omc) for proven patterns, dispatches harness-sage to create a PR.
