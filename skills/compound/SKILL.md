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

### Phase 4: Documentation

After harness-sage completes:

1. **Worklog 기록** — `docs/worklogs/YYYY-MM-DD-<topic>.md` 작성:
   - 어떤 문제가 있었는지
   - 어떤 레퍼런스를 참고했는지
   - 어떤 개선을 만들었는지 (issue/PR 링크 포함)

2. **Spec 업데이트** — 이번 개선이 기존 spec에 영향을 주면 해당 `docs/spec/<TOPIC>.md` 반영:
   - 새 컨벤션이 생겼으면 `CONVENTIONS.md` 업데이트
   - 새 설계 원칙이 생겼으면 `PRINCIPLE.md` 업데이트
   - 해당 spec이 없으면 새로 생성

### Phase 5: Report

Report to the user:

```
Compound complete.

Problem: <one-line summary>
Reference: <which plugin pattern was used>
Issue: <URL>
PR: <URL>
Worklog: <path>
Spec updated: <path or "none">

Review the PR when ready.
```
