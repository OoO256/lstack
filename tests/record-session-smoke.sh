#!/bin/bash
set -euo pipefail

SCRIPT="$(cd "$(dirname "$0")/.." && pwd)/hooks/scripts/record-session.sh"
TODAY=$(date +%Y-%m-%d)
ID1="11111111-1111-1111-1111-111111111111"
ID2="22222222-2222-2222-2222-222222222222"
tmpdir=$(mktemp -d)
trap 'rm -rf "$tmpdir"' EXIT
fail() { printf 'FAIL: %s\n' "$1" >&2; exit 1; }

plan="$tmpdir/plan.md"
printf '# Goal\n\n## 배경\nContext.\n' > "$plan"

# 1. env var 없음 → no-op
"$SCRIPT" "$plan"
grep -qF "## 세션" "$plan" && fail "no-op expected without LSTACK_CLAUDE_SESSION_ID"

# 2. ## 세션 없음 → 섹션 생성 + 한 줄 추가
LSTACK_CLAUDE_SESSION_ID="$ID1" "$SCRIPT" "$plan"
grep -qF "## 세션" "$plan" || fail "section not created"
grep -qF -- "- \`$ID1\` ($TODAY)" "$plan" || fail "session line not added"

# 3. 같은 id 재실행 → dedupe
LSTACK_CLAUDE_SESSION_ID="$ID1" "$SCRIPT" "$plan"
[ "$(grep -cF "\`$ID1\`" "$plan")" -eq 1 ] || fail "duplicate line on rerun"

# 4. dedupe 는 ## 세션 섹션 scope — 본문 내 같은 id 언급은 무시
printf '# Goal\n\n## 배경\nMention `%s` in prose.\n\n## 세션\n- `%s` (2026-06-01)\n' "$ID2" "$ID1" > "$plan"
LSTACK_CLAUDE_SESSION_ID="$ID2" "$SCRIPT" "$plan"
grep -qF -- "- \`$ID2\` ($TODAY)" "$plan" || fail "prose mention must not block insert"

# 5. ## 세션 뒤에 다른 섹션이 있는 비정상 구조 → ## 세션 블록 안에 삽입
printf '# Goal\n\n## 배경\nContext.\n\n## 세션\n- `%s` (2026-06-01)\n\n## 기타\nUnexpected.\n' "$ID1" > "$plan"
LSTACK_CLAUDE_SESSION_ID="$ID2" "$SCRIPT" "$plan"
awk '$0=="## 세션"{s=1;next} /^##[[:space:]]/{s=0} s' "$plan" | grep -qF "\`$ID2\`" \
  || fail "new id not inside ## 세션 block"

printf 'record-session smoke: pass\n'
