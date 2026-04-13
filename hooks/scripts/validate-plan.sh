#!/bin/bash
# PostToolUse hook: validate plan.md after Write/Edit
# Checks required sections exist

input=$(cat)
tool_name=$(echo "$input" | jq -r '.tool_name // empty')
tool_input_path=$(echo "$input" | jq -r '.tool_input.file_path // empty')

if [ "$tool_name" = "Write" ] || [ "$tool_name" = "Edit" ]; then
  if echo "$tool_input_path" | grep -q "plan.md"; then
    if [ -f "$tool_input_path" ]; then
      errors=""
      grep -q "^## 배경" "$tool_input_path" || errors="${errors}\n- missing section: ## 배경"
      grep -q "^## 설계" "$tool_input_path" || errors="${errors}\n- missing section: ## 설계"
      grep -q "^## 태스크" "$tool_input_path" || errors="${errors}\n- missing section: ## 태스크"
      # warn if old 요구사항 section still exists (deprecated)
      if grep -q "^## 요구사항" "$tool_input_path"; then
        errors="${errors}\n- deprecated section: ## 요구사항 (태스크가 단일 SOT — 섹션 삭제 권장)"
      fi
      if [ -n "$errors" ]; then
        echo "PLAN VALIDATION FAILED:${errors}"
      fi
    fi
  fi
fi
