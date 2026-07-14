---
name: call-as-codex
description: |
  Codex CLI(codex-companion.mjs)를 호출해 작업을 위임하는 mechanics 래퍼.
  호출자가 준 context(+선택적 프롬프트 파일 참조)를 Codex 에 전달하고 stdout 을 verbatim 반환.
  Codex 는 cwd 기준 로컬 파일을 읽는다 (--write 시 쓰기도). 미설치/실패 시 hard fail — fallback 없음.
---

# call-as-codex — Codex CLI 호출 래퍼 (mechanics only)

**Mechanics 레이어.** 어떤 작업인지 알지 않는다. 호출자가 프롬프트 / 컨텍스트를 주면
Codex 에 전달하고 결과를 그대로 반환한다. on-demand 로 다른 모델(Codex)의 프레시하고
객관적인 판단이 필요할 때 호출한다.

**쓰지 말 것:** 이미 답을 아는 사소한 질문 — Codex 호출은 느리고 비싸다. 의사결정급 판단에만.

## Input

| 파라미터 | 필수 | 설명 |
|---------|------|------|
| `context` | O | Codex 에 보낼 요청 본문 (질문 / 지시 / plan.md 경로 등) |
| `prompt_file` | X | 앞에 붙일 프롬프트 파일 참조 `<plugin>:<name>` → `${CLAUDE_PLUGIN_ROOT}/agents/<name>.md`. 없으면 context 만 전달 |
| `write` | X | `true` → 파일 쓰기 권한. 기본 read-only |
| `model` | X | Codex 모델. 기본 config.toml 값 |
| `effort` | X | reasoning effort (low/medium/high/xhigh) |

## Workflow

### Step 1: Codex 가용성 확인
```bash
CODEX_SCRIPT=$(ls ~/.claude/plugins/marketplaces/openai-codex/plugins/codex/scripts/codex-companion.mjs 2>/dev/null \
  || find ~/.claude/plugins -path '*openai-codex*codex/scripts/codex-companion.mjs' 2>/dev/null | head -1)
if [ -z "$CODEX_SCRIPT" ] || [ ! -f "$CODEX_SCRIPT" ]; then
  echo "ERROR: Codex CLI unavailable (codex-companion.mjs not found)."; exit 1
fi
```

### Step 2: (선택) prompt_file resolve + frontmatter strip
`prompt_file` 이 주어졌을 때만 수행한다:
```bash
case "$prompt_file" in
  lstack:*) PROMPT_PATH="${CLAUDE_PLUGIN_ROOT}/agents/${prompt_file#lstack:}.md" ;;
  *) echo "ERROR: unsupported namespace: $prompt_file"; exit 1 ;;
esac
[ -f "$PROMPT_PATH" ] || { echo "ERROR: prompt file not found: $PROMPT_PATH"; exit 1; }
# 1행이 --- 이면 첫 frontmatter 블록만 제거 (Claude runtime 용 메타데이터라 Codex 엔 노이즈)
PROMPT_BODY=$(awk 'BEGIN{in_fm=0;done=0} NR==1&&/^---$/{in_fm=1;next} in_fm&&/^---$/&&!done{in_fm=0;done=1;next} !in_fm{print}' "$PROMPT_PATH")
```
`prompt_file` 이 없으면 `PROMPT_BODY` 는 빈 문자열.

### Step 3: Codex 호출
```bash
FLAGS=""
[ "$write" = "true" ] && FLAGS="$FLAGS --write"
[ -n "$model" ]       && FLAGS="$FLAGS --model $model"
[ -n "$effort" ]      && FLAGS="$FLAGS --effort $effort"

if [ -n "$PROMPT_BODY" ]; then
  PAYLOAD=$(printf '%s\n\n---\n\n## 요청\n%s\n' "$PROMPT_BODY" "$context")
else
  PAYLOAD="$context"
fi
node "$CODEX_SCRIPT" task --wait $FLAGS "$PAYLOAD"
```

### Step 4: stdout 반환
Codex 출력을 호출자에게 **그대로** 전달. 해석 / 편집 / 요약 금지.

## 규칙
- Codex 미설치 / 실패는 fallback 없이 에러 그대로 반환 (exit 1). 메인 컨텍스트가 판단 / 조치.
- `write` 는 파일을 써야 할 때만 `true`. 조언 / 리뷰는 read-only.
- prompt_file 을 쓸 경우 그 내용은 수정하지 않는다 — 추가 지시는 `context` 로만.

## Anti-patterns
- Codex 응답을 중간에서 편집 / 요약 — verbatim 반환 위반
- 사소한 질문에 호출 — 느리고 비싸다
- mechanics 레이어에 프롬프트별 분기 로직 추가
