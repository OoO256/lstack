# Compound Skill + Harness-Sage Agent Design

**Date**: 2026-04-10
**Status**: Approved

## Goal

Add a self-improvement loop to lstack: when a user encounters workflow problems, `/compound` analyzes the conversation, references proven plugin patterns, and creates an issue + PR to improve lstack — all via a dedicated agent in an isolated worktree.

## Components

### 1. Agent: `agents/harness-sage.md`

A harness expert agent that receives a problem analysis and reference patterns, then implements improvements to lstack.

- **Input**: Problem summary + relevant reference patterns (passed via prompt)
- **Process**: Write skill/agent/hook/command code in isolated worktree
- **Output**: `gh issue create` + `gh pr create`, return links
- **Isolation**: `isolation: "worktree"` — no impact on user's working branch
- **Tools**: Read, Grep, Glob, Bash, Write, Edit (code + gh CLI)

### 2. Skill: `skills/compound/SKILL.md`

Triggered by `/compound` or "컴파운드". Runs in main context.

**Phase 1 — Problem Analysis**:
1. Analyze current conversation for problem patterns (what failed, why, what was attempted)
2. Summarize into structured problem description

**Phase 2 — Reference Search**:
1. Read `skills/compound/references.md` for GitHub repo URLs
2. Use `gh api` to search reference repos for relevant patterns (skills, agents, hooks)
3. Extract applicable patterns and adaptation notes

**Phase 3 — Agent Dispatch**:
1. Spawn harness-sage with `isolation: "worktree"`
2. Pass: problem summary + reference patterns + lstack context
3. Agent creates branch, writes code, creates issue + PR

**Phase 4 — Report**:
1. Receive issue/PR links from agent
2. Report to user in main context

### 3. Reference Registry: `skills/compound/references.md`

Git-tracked file listing reference plugin GitHub URLs:

```markdown
- superpowers: https://github.com/obra/superpowers
- gstack: https://github.com/garrytan/gstack
- hoyeon: https://github.com/team-attention/hoyeon
- omc: https://github.com/Yeachan-Heo/oh-my-claudecode
```

Skill fetches from GitHub at runtime. Local `references/` directory (git-ignored) serves as optional personal cache only.

## Data Flow

```
User: "/compound"
    |
    v
Compound Skill (main context)
    |  Phase 1: Summarize problem from conversation
    |  Phase 2: gh api — search reference repos for patterns
    |  Phase 3: Agent(harness-sage, isolation: "worktree")
    |           prompt = problem + patterns + lstack context
    |
    v
Harness-Sage (isolated worktree)
    |  1. Create branch (compound/YYYY-MM-DD-<topic>)
    |  2. Write code changes to lstack
    |  3. gh issue create
    |  4. gh pr create (references the issue)
    |  5. Return issue + PR URLs
    |
    v
Compound Skill -> Report issue/PR links to user
```

## File Structure

```
lstack/
├── agents/
│   └── harness-sage.md
├── skills/
│   └── compound/
│       ├── SKILL.md
│       └── references.md
```

## Decisions

- **Worktree isolation**: Agent works in a separate worktree to avoid disrupting user's active work.
- **GitHub-based references**: `references.md` is git-tracked with repo URLs. Fetched at runtime via `gh api`. Portable — any user can run the skill without local clones.
- **Skill does analysis, agent does implementation**: Skill leverages main context (conversation history) for problem analysis and has access to local references/. Agent receives a focused prompt and only handles code + PR creation.
