---
name: call-codex-cli
description: |
  Codex CLI(codex-companion.mjs)를 호출해 작업을 위임한다.
  호출자가 준 prompt 파일 + context를 조합해 Codex에 전달하고 stdout을 verbatim 반환.
  Codex는 cwd 기준으로 로컬 파일을 읽을 수 있다 (--write 시 쓰기도 가능).
  Codex 미설치/실패 시 hard fail — 에러를 호출자(메인 컨텍스트)에게 그대로 보고. fallback 없음.
---

# call-codex-cli — Codex CLI 호출 래퍼 (mechanics only)

**Mechanics 레이어.** 어떤 프롬프트인지, 어떤 작업인지 알지 않는다.
호출자가 프롬프트 파일 참조 + 컨텍스트만 주면 Codex에 전달하고 결과를 반환.

프롬프트 파일은 `agents/*.md` 아래에 따로 관리된다 (SSOT). 이 skill은 참조를 경로로
resolve 해서 Codex에 주입하는 역할만 한다.

## 표기

```
call-codex-cli(<plugin>:<name>)
```

예:
- `call-codex-cli(lstack:principal-engineer)` — lstack 플러그인의 principal-engineer 프롬프트
- 참조 → `${CLAUDE_PLUGIN_ROOT}/agents/principal-engineer.md` 로 resolve

## 사용 시나리오

- 객관적이고 전문적인 기술 판단이 필요할 때 (예: `call-codex-cli(lstack:principal-engineer)`)
- 메인 컨텍스트와 분리된 프레시 컨텍스트에서 판단해야 할 때
- Codex가 로컬 코드베이스를 직접 읽고 판단해야 할 때

**쓰지 말 것:** 이미 답을 알고 있는 사소한 질문 — Codex 호출은 느리고 비싸다.

## Input

| 파라미터 | 필수 | 설명 |
|---------|------|------|
| `prompt_file` | O | 프롬프트 파일 참조. `<plugin>:<name>` 형식 (예: `lstack:principal-engineer`) |
| `context` | O | 프롬프트 뒤에 붙일 요청 본문 (질문/모드/plan.md 경로 등) |
| `write` | X | `true` → 파일 쓰기 권한. 기본 `read-only` |
| `model` | X | Codex 모델 (예: `gpt-5.4`). 기본 config.toml 값 |
| `effort` | X | reasoning effort (`low`/`medium`/`high`/`xhigh`) |

## Workflow

### Step 1: Codex 가용성 확인

```bash
CODEX_SCRIPT=$(ls ~/.claude/plugins/marketplaces/openai-codex/plugins/codex/scripts/codex-companion.mjs 2>/dev/null \
  || find ~/.claude/plugins -path '*openai-codex*codex/scripts/codex-companion.mjs' 2>/dev/null | head -1)

if [ -z "$CODEX_SCRIPT" ] || [ ! -f "$CODEX_SCRIPT" ]; then
  echo "ERROR: Codex CLI unavailable (codex-companion.mjs not found)."
  exit 1
fi
```

### Step 2: `prompt_file` 참조 resolve

`<plugin>:<name>` 을 파일 경로로 변환:

```bash
case "$prompt_file" in
  lstack:*)
    PROMPT_NAME="${prompt_file#lstack:}"
    PROMPT_PATH="${CLAUDE_PLUGIN_ROOT}/agents/${PROMPT_NAME}.md"
    ;;
  *)
    echo "ERROR: unsupported prompt_file namespace: $prompt_file (only 'lstack:*' supported)"
    exit 1
    ;;
esac

[ -f "$PROMPT_PATH" ] || { echo "ERROR: prompt file not found: $PROMPT_PATH"; exit 1; }
```

### Step 3: Codex 호출

프롬프트 파일 내용 + `---` 구분자 + 호출자 context 를 합쳐 전달:

```bash
FLAGS=""
[ "$write" = "true" ] && FLAGS="$FLAGS --write"
[ -n "$model" ]       && FLAGS="$FLAGS --model $model"
[ -n "$effort" ]      && FLAGS="$FLAGS --effort $effort"

node "$CODEX_SCRIPT" task --wait $FLAGS "$(printf '%s\n\n---\n\n## 요청\n%s\n' "$(cat "$PROMPT_PATH")" "$context")"
```

### Step 4: stdout 반환

Codex 출력을 호출자에게 **그대로** 전달. 해석/편집/요약 금지.

## 규칙

- 프롬프트 파일 내용은 수정하지 않는다. 추가 지시는 `context`로만.
- Codex 미설치/실패는 fallback 없이 에러 메시지 그대로 반환 (exit 1). 메인 컨텍스트가 판단/조치.
- `write`는 설계를 plan.md에 쓰거나 리팩터를 커밋해야 할 때만 `true`. 조언/리뷰는 기본 (read-only).
- 이 skill은 프롬프트 내용/작업을 알지 않는다. 호출자가 어떤 프롬프트 파일을 주입할지 결정.

## Anti-patterns

- Codex 응답을 중간에서 편집/요약 — verbatim 반환 원칙 위반
- 프롬프트 파일을 매 호출마다 바꿔서 전달 — 프롬프트 파일은 안정적으로 관리, 변경 필요 시 commit
- 사소한 질문에 호출 — 느리고 비싸다. 의사결정급 판단에만.
- skill 내부에 프롬프트별 분기 로직 추가 — mechanics 레이어 순수성 유지
