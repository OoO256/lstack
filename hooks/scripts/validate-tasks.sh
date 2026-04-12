#!/bin/bash
# PostToolUse hook: validate tasks.json after Write/Edit
# Uses check-jsonschema for JSON Schema validation

input=$(cat)
tool_name=$(echo "$input" | jq -r '.tool_name // empty')
tool_input_path=$(echo "$input" | jq -r '.tool_input.file_path // empty')

if [ "$tool_name" = "Write" ] || [ "$tool_name" = "Edit" ]; then
  if echo "$tool_input_path" | grep -q "tasks.json"; then
    if [ -f "$tool_input_path" ]; then
      check-jsonschema --schemafile "${CLAUDE_PLUGIN_ROOT}/skills/pm/tasks-schema.json" "$tool_input_path" 2>&1
    fi
  fi
fi
