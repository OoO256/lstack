#!/bin/bash
# PostToolUse hook: remind to document after git commit
# Reads tool input from stdin, checks if it was a git commit command

input=$(cat)
tool_name=$(echo "$input" | jq -r '.tool_name // empty')
tool_input=$(echo "$input" | jq -r '.tool_input.command // empty')

# Only trigger on Bash tool with git commit
if [ "$tool_name" = "Bash" ] && echo "$tool_input" | grep -q "git commit"; then
  # Check if the commit actually succeeded
  exit_code=$(echo "$input" | jq -r '.tool_response.exit_code // "0"')
  if [ "$exit_code" = "0" ]; then
    echo "커밋 감지. 작업 단위가 끝났다면 /document 로 worklog와 spec을 업데이트하세요."
  fi
fi
