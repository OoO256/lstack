#!/bin/bash
# UserPromptSubmit hook: inject the nobs response rules every turn.
# Skills are model-invoked and thus unreliable for "always" rules; this guarantees it.
# Full rules (현/원/대/사 등): skills/nobs/SKILL.md
cat <<'EOF'
[nobs] 응답 규칙: 결론 먼저(두괄식) · 분석이면 현(상황/문제)/원(원인)/대(대응)/사(사후관리·평가) 섹션, 아니어도 [문제] [결론] 등으로 구조화 · 신규 용어 만들지 말고 사용자가 아는 말로 · 최대한 짧게 · 중요도 순(중요한 것 앞, 덜 중요한 것 뒤). 부차적 내용은 참조형 각주로 — 본문엔 [1] 마커만, 본문 뒤에 [1] 내용. anchor 없는 첨언은 마커 없이 - bullet.
EOF
exit 0
