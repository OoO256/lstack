# lstack — Personal Development Workflow Harness

A Claude Code plugin for development workflow automation.

## Structure

- `skills/` — Skill definitions (each skill is a directory with `SKILL.md`)
- `agents/` — Agent definitions (`.md` files with YAML frontmatter)
- `commands/` — Slash command definitions (`.md` files)
- `hooks/` — Event hooks registered in `hooks.json`
- `docs/lstack/specs/` — Design spec documents
- `docs/lstack/plans/` — Implementation plan documents
- `tests/` — Tests for skills and hooks

## Conventions

- Follow Claude Code plugin conventions (`.claude-plugin/plugin.json` manifest)
- Skills use YAML frontmatter with `name` and `description` fields
- Design specs: `docs/lstack/specs/YYYY-MM-DD-<topic>-design.md`
- Plans: `docs/lstack/plans/YYYY-MM-DD-<topic>.md`

## Agents

### harness-sage
Plugin improvement expert. Spawned by `/compound` in an isolated worktree. Analyzes reference plugin patterns and implements improvements to lstack via issue + PR.

## Skills

### compound
Self-improvement loop. Trigger: `/compound` or "컴파운드". Analyzes conversation for workflow problems, searches reference plugins (superpowers, gstack, hoyeon, omc) for proven patterns, dispatches harness-sage to create a PR.
