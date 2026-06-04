#!/bin/bash
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
SCRIPT="$ROOT/hooks/scripts/record-session.sh"
TODAY=$(date +%Y-%m-%d)

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  exit 1
}

assert_contains() {
  local needle=$1
  local file=$2
  grep -qF -- "$needle" "$file" || fail "missing [$needle] in $file"
}

assert_count() {
  local expected=$1
  local needle=$2
  local file=$3
  local actual
  actual=$(grep -cF -- "$needle" "$file" || true)
  [ "$actual" -eq "$expected" ] || fail "expected $expected occurrences of [$needle], got $actual"
}

tmpdir=$(mktemp -d)
trap 'rm -rf "$tmpdir"' EXIT

plan_no_env="$tmpdir/no-env.md"
cat > "$plan_no_env" <<'EOF'
# Goal

## 배경
Context.
EOF

"$SCRIPT" "$plan_no_env"
if grep -qF "## 세션" "$plan_no_env"; then
  fail "empty LSTACK_CLAUDE_SESSION_ID should be no-op"
fi

plan_no_session="$tmpdir/no-session.md"
cat > "$plan_no_session" <<'EOF'
# Goal

## 배경
Context.
EOF

LSTACK_CLAUDE_SESSION_ID="11111111-1111-1111-1111-111111111111" "$SCRIPT" "$plan_no_session"
assert_contains "## 세션" "$plan_no_session"
assert_contains "- \`11111111-1111-1111-1111-111111111111\` ($TODAY)" "$plan_no_session"

LSTACK_CLAUDE_SESSION_ID="11111111-1111-1111-1111-111111111111" "$SCRIPT" "$plan_no_session"
assert_count 1 "- \`11111111-1111-1111-1111-111111111111\` ($TODAY)" "$plan_no_session"

plan_dedupe_scope="$tmpdir/dedupe-scope.md"
cat > "$plan_dedupe_scope" <<'EOF'
# Goal

## 배경
Mention `33333333-3333-3333-3333-333333333333` outside the session section.

## 세션
- `00000000-0000-0000-0000-000000000000` (2026-06-01)
EOF

LSTACK_CLAUDE_SESSION_ID="33333333-3333-3333-3333-333333333333" "$SCRIPT" "$plan_dedupe_scope"
assert_contains "- \`33333333-3333-3333-3333-333333333333\` ($TODAY)" "$plan_dedupe_scope"

plan_abnormal="$tmpdir/abnormal.md"
cat > "$plan_abnormal" <<'EOF'
# Goal

## 배경
Context.

## 세션
- `00000000-0000-0000-0000-000000000000` (2026-06-01)

## 기타
Unexpected section.
EOF

LSTACK_CLAUDE_SESSION_ID="22222222-2222-2222-2222-222222222222" "$SCRIPT" "$plan_abnormal"
session_block=$(awk '
  $0 == "## 세션" { in_session = 1 }
  in_session && /^##[[:space:]]/ && $0 != "## 세션" { exit }
  in_session { print }
' "$plan_abnormal")

printf '%s\n' "$session_block" | grep -qF -- "- \`22222222-2222-2222-2222-222222222222\` ($TODAY)" \
  || fail "new session id was not inserted inside ## 세션"

after_other=$(awk '
  $0 == "## 기타" { after_other = 1; next }
  after_other { print }
' "$plan_abnormal")

if printf '%s\n' "$after_other" | grep -qF "22222222-2222-2222-2222-222222222222"; then
  fail "new session id was appended under ## 기타"
fi

printf 'record-session smoke: pass\n'
