# Compound + Harness-Sage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a self-improvement loop to lstack — `/compound` skill analyzes conversation problems, searches reference plugins, and dispatches harness-sage agent to create improvement PRs in an isolated worktree.

**Architecture:** Three files: agent definition (`agents/harness-sage.md`), skill definition (`skills/compound/SKILL.md`), and reference registry (`skills/compound/references.md`). The skill runs in main context (has conversation history), the agent runs in a worktree (isolated code changes + PR creation).

**Tech Stack:** Claude Code plugin system (YAML frontmatter + markdown), `gh` CLI for GitHub operations.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `skills/compound/references.md` | GitHub URLs for 4 reference plugins |
| Create | `agents/harness-sage.md` | Agent: implement lstack improvements + create issue/PR |
| Create | `skills/compound/SKILL.md` | Skill: problem analysis + reference search + agent dispatch |
| Modify | `CLAUDE.md` | Document new agent and skill |

---

### Task 1: Reference Registry

**Files:**
- Create: `skills/compound/references.md`

- [ ] **Step 1: Create the references file**

```markdown
# Reference Plugins

Proven Claude Code plugin harnesses used as patterns for lstack improvements.

| Name | Repository | Strength |
|------|-----------|----------|
| superpowers | https://github.com/obra/superpowers | Skills architecture, TDD workflows, brainstorming |
| gstack | https://github.com/garrytan/gstack | Opinionated dev tools, CEO/designer/QA agents |
| hoyeon | https://github.com/team-attention/hoyeon | Requirements-first harness, spec-driven execution, hooks |
| omc | https://github.com/Yeachan-Heo/oh-my-claudecode | Multi-agent orchestration, team pipelines |
```

Write to `skills/compound/references.md`.

- [ ] **Step 2: Verify file exists**

Run: `cat skills/compound/references.md`
Expected: The table with 4 repos renders correctly.

- [ ] **Step 3: Commit**

```bash
git add skills/compound/references.md
git commit -m "feat: add compound reference registry with 4 plugin sources"
```

---

### Task 2: Harness-Sage Agent

**Files:**
- Create: `agents/harness-sage.md`
- Remove: `agents/.gitkeep`

- [ ] **Step 1: Write agent definition**

```markdown
---
name: harness-sage
description: |
  Use this agent to improve the lstack plugin based on problem analysis and reference patterns.
  Spawned by the compound skill in an isolated worktree. Receives a structured prompt with:
  (1) problem summary from the user's conversation, (2) relevant patterns from reference plugins.
  Creates a branch, implements the improvement, and opens a GitHub issue + PR.
---

You are Harness-Sage, an expert in Claude Code plugin development. You receive a problem analysis and reference patterns, then implement improvements to the lstack plugin.

## Input

You will receive a prompt containing:

1. **Problem Summary**: What went wrong in the user's workflow — the failing pattern, what was attempted, why it failed.
2. **Reference Patterns**: Relevant skills, agents, hooks, or commands from proven plugins (superpowers, gstack, hoyeon, omc) that address similar problems.
3. **Current lstack State**: The plugin's existing structure and components.

## Process

### 1. Understand the Problem

- Read the problem summary carefully.
- Identify what type of plugin component would solve it (skill, agent, hook, command, or modification to existing).

### 2. Study the Reference Patterns

- Analyze the provided reference patterns.
- Identify what to adopt directly vs. what to adapt for lstack's conventions.
- Do NOT copy verbatim — understand the pattern and rewrite for lstack.

### 3. Implement

- Create or modify plugin files following lstack conventions:
  - Skills: `skills/<name>/SKILL.md` with YAML frontmatter (`name`, `description`)
  - Agents: `agents/<name>.md` with YAML frontmatter (`name`, `description`)
  - Commands: `commands/<name>.md` with YAML frontmatter (`description`)
  - Hooks: Update `hooks/hooks.json`
- Keep changes minimal and focused on the specific problem.

### 4. Create Issue + PR

After implementing:

1. **Create issue:**
   ```bash
   gh issue create --title "<concise title>" --body "<problem description + what was added>"
   ```

2. **Create PR referencing the issue:**
   ```bash
   gh pr create --title "<concise title>" --body "Closes #<issue_number>\n\n## Summary\n<what changed and why>\n\n## Reference\nPattern adapted from: <source plugin>"
   ```

3. Return the issue URL and PR URL.

## Conventions

- Follow existing lstack patterns (check CLAUDE.md).
- YAML frontmatter: `name` and `description` are required for skills and agents.
- One improvement per PR. Do not bundle unrelated changes.
- Commit messages: `feat:`, `fix:`, or `refactor:` prefix.
```

Write to `agents/harness-sage.md`.

- [ ] **Step 2: Remove .gitkeep**

Run: `rm agents/.gitkeep`

- [ ] **Step 3: Verify frontmatter parses correctly**

Run: `head -5 agents/harness-sage.md`
Expected: Valid YAML frontmatter with `name: harness-sage` and `description:`.

- [ ] **Step 4: Commit**

```bash
git add agents/harness-sage.md
git rm agents/.gitkeep 2>/dev/null; true
git commit -m "feat: add harness-sage agent for plugin self-improvement"
```

---

### Task 3: Compound Skill

**Files:**
- Create: `skills/compound/SKILL.md`
- Remove: `skills/.gitkeep`

- [ ] **Step 1: Write skill definition**

```markdown
---
name: compound
description: |
  This skill should be used when the user says "/compound", "컴파운드",
  "improve this plugin", "this workflow isn't working", or after encountering
  a recurring workflow problem. Analyzes conversation patterns, searches
  reference plugins for solutions, and dispatches harness-sage to create
  an improvement PR.
---

# Compound

Analyze workflow problems from the current conversation, find proven patterns in reference plugins, and dispatch harness-sage to implement improvements via PR.

## Workflow

### Phase 1: Problem Analysis

Analyze the current conversation to identify what went wrong:

1. **Identify the failure pattern:**
   - What was the user trying to do?
   - What went wrong or was missing?
   - What workarounds were attempted?

2. **Classify the problem type:**
   - Missing skill (no skill exists for this workflow)
   - Inadequate skill (existing skill doesn't handle this case)
   - Missing agent (need a specialized agent)
   - Missing hook (need automated behavior on events)
   - Missing command (need a slash command shortcut)

3. **Write a structured problem summary:**
   ```
   Problem: <one sentence>
   Type: <skill|agent|hook|command|modification>
   Context: <what the user was doing>
   Gap: <what lstack is missing>
   ```

### Phase 2: Reference Search

1. Read `skills/compound/references.md` for repository URLs.

2. For each reference repo, search for patterns related to the problem:
   ```bash
   # Search skills
   gh api repos/{owner}/{repo}/contents/skills --jq '.[].name'
   
   # Search agents
   gh api repos/{owner}/{repo}/contents/agents --jq '.[].name'
   
   # Read a specific file
   gh api repos/{owner}/{repo}/contents/{path} --jq '.content' | base64 -d
   ```

3. Collect relevant patterns — focus on:
   - How the reference plugin solves a similar problem
   - File structure and frontmatter conventions used
   - Key design decisions worth adopting

4. Summarize findings:
   ```
   Reference: <plugin name>
   File: <path>
   Pattern: <what it does and how>
   Adaptation: <how to apply to lstack>
   ```

### Phase 3: Agent Dispatch

Spawn harness-sage in an isolated worktree:

```
Agent({
  subagent_type: "lstack:harness-sage",
  isolation: "worktree",
  prompt: <include all of the following>
    - Problem summary from Phase 1
    - Reference patterns from Phase 2
    - Current lstack structure (list files in skills/, agents/, commands/, hooks/)
})
```

Wait for the agent to complete. It will return issue and PR URLs.

### Phase 4: Report

Report to the user:

```
Compound complete.

Problem: <one-line summary>
Reference: <which plugin pattern was used>
Issue: <URL>
PR: <URL>

Review the PR when ready.
```
```

Write to `skills/compound/SKILL.md`.

- [ ] **Step 2: Remove .gitkeep**

Run: `rm skills/.gitkeep`

- [ ] **Step 3: Verify skill structure**

Run: `ls -la skills/compound/`
Expected: `SKILL.md` and `references.md` both present.

- [ ] **Step 4: Verify frontmatter**

Run: `head -8 skills/compound/SKILL.md`
Expected: Valid YAML with `name: compound` and `description:`.

- [ ] **Step 5: Commit**

```bash
git add skills/compound/SKILL.md
git rm skills/.gitkeep 2>/dev/null; true
git commit -m "feat: add compound skill for plugin self-improvement workflow"
```

---

### Task 4: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add agent and skill documentation to CLAUDE.md**

Add after the Conventions section:

```markdown
## Agents

### harness-sage
Plugin improvement expert. Spawned by `/compound` in an isolated worktree. Analyzes reference plugin patterns and implements improvements to lstack via issue + PR.

## Skills

### compound
Self-improvement loop. Trigger: `/compound` or "컴파운드". Analyzes conversation for workflow problems, searches reference plugins (superpowers, gstack, hoyeon, omc) for proven patterns, dispatches harness-sage to create a PR.
```

- [ ] **Step 2: Verify CLAUDE.md reads correctly**

Run: `cat CLAUDE.md`
Expected: Structure, Conventions, Agents, and Skills sections all present.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add harness-sage agent and compound skill to CLAUDE.md"
```

---

### Task 5: End-to-End Verification

- [ ] **Step 1: Verify complete file structure**

Run: `find . -not -path './.git/*' -not -path './references/*' -not -path './docs/*' | sort`
Expected:
```
.
./.claude-plugin
./.claude-plugin/plugin.json
./.gitignore
./agents
./agents/harness-sage.md
./CLAUDE.md
./commands
./commands/.gitkeep
./hooks
./hooks/hooks.json
./package.json
./skills
./skills/compound
./skills/compound/references.md
./skills/compound/SKILL.md
./tests
./tests/.gitkeep
```

- [ ] **Step 2: Verify all frontmatter is valid YAML**

Run: `head -4 agents/harness-sage.md && echo "---" && head -7 skills/compound/SKILL.md`
Expected: Both files start with `---` and contain `name:` and `description:` fields.

- [ ] **Step 3: Push and verify remote**

Run: `git push origin main`
Expected: All commits pushed successfully.
