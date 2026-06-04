#!/bin/bash
# Records the current Claude session id in a plan.md `## 세션` section.
# The plan.md structure contract stays in skills/write-plan-md/SKILL.md.

set -euo pipefail

session_id=${LSTACK_CLAUDE_SESSION_ID:-}
[ -n "$session_id" ] || exit 0

plan=${1:-${PLAN:-}}
if [ -z "$plan" ]; then
  printf 'record-session: plan path required\n' >&2
  exit 1
fi

if [ ! -f "$plan" ]; then
  printf 'record-session: plan.md not found: %s\n' "$plan" >&2
  exit 1
fi

line="- \`$session_id\` ($(date +%Y-%m-%d))"
needle="\`$session_id\`"
tmp=$(mktemp "${TMPDIR:-/tmp}/record-session.XXXXXX")
trap 'rm -f "$tmp"' EXIT

awk -v line="$line" -v needle="$needle" '
  $0 == "## 세션" {
    found_session = 1
    in_session = 1
    print
    next
  }

  in_session && /^##[[:space:]]/ {
    if (!session_has_id) {
      print line
      session_has_id = 1
    }
    in_session = 0
    print
    next
  }

  {
    if (in_session && index($0, needle) > 0) {
      session_has_id = 1
    }
    print
  }

  END {
    if (found_session) {
      if (in_session && !session_has_id) {
        print line
      }
    } else {
      print ""
      print "## 세션"
      print line
    }
  }
' "$plan" > "$tmp"

if ! cmp -s "$tmp" "$plan"; then
  cat "$tmp" > "$plan"
fi
