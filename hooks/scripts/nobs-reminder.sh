#!/bin/bash
# UserPromptSubmit hook: inject the nobs response rules every turn.
# Skills are model-invoked and thus unreliable for "always" rules; this guarantees it.
# One line, section titles only — verbatim from skills/nobs/SKILL.md. Do not paraphrase or expand.
cat <<'EOF'
[nobs] 인지 부하 최소화 — 구조화 · 신규 용어 최소화 · 최대한 짧게 · 정보는 중요도 순으로 (전문: skills/nobs/SKILL.md)
EOF
exit 0
