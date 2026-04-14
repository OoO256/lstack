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
      # warn if old group sections exist (deprecated)
      if grep -q "^### 완료$\|^### 진행 중$\|^### 대기$" "$tool_input_path"; then
        errors="${errors}\n- deprecated group sections: ### 완료/진행 중/대기 (태스크 헤더 suffix로 상태 표시 — 그룹 삭제 권장)"
      fi
      # warn if old checkbox task format used
      if grep -q "^- \[.\] T[0-9]" "$tool_input_path"; then
        errors="${errors}\n- deprecated task format: - [ ] Tn (### Tn: 헤더 형식으로 변경 권장)"
      fi
      # warn if old worklog sub-headers used
      if grep -q "^  ### 작업 요약\|^  ### 검증 방법\|^  ### 코드 리뷰\|^  ### 복잡성 정리" "$tool_input_path"; then
        errors="${errors}\n- deprecated worklog sub-headers (결과 중심 인라인 기록으로 변경 권장)"
      fi
      if [ -n "$errors" ]; then
        echo "PLAN VALIDATION FAILED:${errors}"
      fi
    fi
  fi
fi
