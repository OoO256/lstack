#!/bin/bash
# SessionStart hook: capture Claude session_id into $CLAUDE_ENV_FILE
# Exposes `export LSTACK_CLAUDE_SESSION_ID=<id>` for later hooks/skills.
# No stdout (SessionStart stdout pollutes Claude context). No-op when inputs absent.

# CLAUDE_ENV_FILE unset/empty -> no-op
[ -n "$CLAUDE_ENV_FILE" ] || exit 0

# jq missing -> no-op (cannot parse stdin safely)
command -v jq >/dev/null 2>&1 || exit 0

input=$(cat)
[ -n "$input" ] || exit 0

session_id=$(echo "$input" | jq -r '.session_id // empty' 2>/dev/null)
[ -n "$session_id" ] || exit 0

# injection defense: only UUID-shaped ids (hex + dashes) are recorded.
# Blocks shell metacharacters since the value lands in a sourced env file.
echo "$session_id" | grep -Eq '^[0-9a-fA-F-]+$' || exit 0

line="export LSTACK_CLAUDE_SESSION_ID=${session_id}"

# idempotent: skip append if this exact id is already present
if [ -f "$CLAUDE_ENV_FILE" ] && grep -qxF "$line" "$CLAUDE_ENV_FILE"; then
  exit 0
fi

echo "$line" >> "$CLAUDE_ENV_FILE"
exit 0
