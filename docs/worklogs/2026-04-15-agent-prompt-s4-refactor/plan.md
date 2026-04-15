# lstack 워크플로우 v2 — 이중 검토 설계 + dual-invocable agent 구조

## 배경

최근 `docs/spec/PRINCIPLE.md`에 §4 (Agent 프롬프트 설계) 가 추가되었고,
`agents/principal-engineer.md` / `agents/judge.md` 는 이미 이 원칙에 맞춰 재작성되었다.
그러나 **하니스 구조 자체**가 아직 구버전에 머물러 있다:

- `lstack` skill이 PM 역할을 떠안고 있어 얇은 entry point가 아니고, `orchestrator`는 Phase 3+4만 담당.
- agent들이 Claude subagent 전용 또는 Codex 프롬프트 전용으로 이분되어 있어 dual-invocable 구조 부재.
- Phase 2 설계가 Codex 단일 호출로 끝나 사용자 개입/검증 루프가 약함.
- Phase 3+4의 리뷰가 `FF review skill` + `Codex adversarial (LOC>50)` 으로 산재되어 일관성 낮음.
- `call-codex-cli` 가 프롬프트 파일의 frontmatter까지 그대로 Codex에 전달해 낭비.

이 worklog에서 **하니스 v2 구조**로 일괄 전환한다. 목적:

1. `orchestrator` (opus) 를 진짜 PM으로 승격, `lstack` skill은 entry point만.
2. 모든 agent를 dual-invocable (Claude subagent + Codex 프롬프트 파일) 로 통일.
3. Phase 2 에 이중 검토 루프 (principal-engineer (Claude) 설계 → principal-engineer (Codex) 비판 → User 확정) 도입.
4. Phase 3+4 리뷰를 `codex-pe review mode` 단일 호출로 통일.
5. 기존 agent (`planner`, `test-planner`, `orchestrator`) 프롬프트를 PRINCIPLE §4 기준으로 리팩터.

## AS-IS → TO-BE

| 축 | AS-IS | TO-BE |
|---|---|---|
| 진입점 & PM | `lstack` skill 이 Phase 0-6 전담, `orchestrator` 는 Phase 3+4만 | `lstack` skill 은 `Agent(lstack:orchestrator)` 만 dispatch. `orchestrator` (opus) 가 Phase 0-6 전담, PRINCIPLE + ARCHITECTURE 를 SSOT 로 참조 |
| Agent 호출성 | `principal-engineer` / `judge` 는 Codex 전용 (frontmatter 無), 나머지는 Claude 전용 | 모든 agent 에 frontmatter → Claude subagent + Codex 프롬프트 양쪽 사용 가능 |
| Codex 호출 skill | `call-codex-cli` — 프롬프트 파일을 frontmatter 포함 그대로 전달 | `call-as-codex` 로 개명 — frontmatter (`---...---` 블록) 제거 후 본문만 전달 |
| Phase 2 | `call-codex-cli(lstack:principal-engineer) mode:design` 단일 호출 | principal-engineer (Claude) 설계 → principal-engineer (Codex) 비판 → User 확정 (orchestrator 가 중재) → planner → test-designer |
| Phase 3+4 리뷰 | FF review skill + Codex adversarial (LOC>50, fail-soft) 산재 | task 완료 직후 `call-as-codex(lstack:principal-engineer) mode:review` 단일 fan-out — FF + adversarial 역할 통합 |
| test-planner | `test-planner` — "test"가 테스트 코드로 오해됨 | **`test-designer`** 로 개명 (AC 설계임을 명확히) |
| 기존 프롬프트 | `planner`, `test-planner`, `orchestrator` 에 마이크로매니징 Rules/Checklist 산재 | PRINCIPLE §4.1 기준 — 책임은 Responsibilities 로, Workflow 는 I/O + 절차 + 고유 Constraints + Failure 만 |
| plan.md 역할 | 결과 기록 중심 | 모든 step 의 진행 상황/결과 공유 SSOT. orchestrator 가 현재 상태를 plan.md 로 파악 |
| 버전 | 1.9.0 | 2.0.0 (semver major — 구조 재편 + 규약/계약 변경, breaking) |

## Non-goals

- `Code_Principals` 별도 문서 분리 (YAGNI — 두 번째 persona 생길 때)
- `interviewer` 에 Codex 적용 (YAGNI)
- `harness-sage` 리팩터 (경미, 다음 사이클)
- Agent Pool 에 신규 agent 추가 (기존 pool 중 미사용만 정리)
- 리팩터로 인한 **동작 변경** — semantic preservation (각 agent 의 역할은 현 워크플로우 그대로)

## 설계

### 결정

- **D1. `lstack` skill 은 orchestrator spawn entry** — 사용자 요청을 받아
  `Agent({subagent_type: "lstack:orchestrator", prompt: $ARGUMENTS + 컨텍스트})` 한 번만 수행.
  Phase 0-6 로직은 전부 orchestrator 로 이관.
  근거: skill 은 트리거 감지, PM 은 subagent 격리 = §1.1 context 분리.
  대안: 현행(skill이 phase dispatch) — PM 책임이 메인 컨텍스트에 고정돼 context 오염 + resume 경로 분산.

- **D2. `orchestrator` = opus PM** — 모델 `inherit` → `opus` 로 명시.
  세션 시작 시 `docs/spec/PRINCIPLE.md` + `docs/spec/ARCHITECTURE.md` + `plan.md` 를 읽어
  workflow/현재 상태 파악. 책임: 완수 · 객관성 · 절차. 구현 X, 위임만.
  근거: 복잡한 조정 + 원칙 해석 = 상위 모델. §1.2 구현-평가 분리.
  대안: sonnet 유지 — 비용은 절감되나 에스컬레이션/리스크 판단 품질 저하.

- **D3. Dual-invocable agent 구조** — 모든 agent 파일에 `---\nname\ndescription\nmodel\n---` frontmatter.
  동일 persona 를 `Agent({subagent_type: ...})` 또는 `call-as-codex(...)` 양쪽으로 호출 가능.
  근거: §1.3 객관성 확보 + Phase 2 이중 검토 시 동일 프롬프트로 대조.
  대안: Claude 용 / Codex 용 파일 분리 — DRY 위반 + drift 발생.

- **D4. `call-codex-cli` → `call-as-codex` (skill rename + frontmatter strip)** — 대상 파일 읽고
  앞쪽 `---\n...\n---\n` 첫 블록만 제거한 본문을 Codex 에 주입.
  근거: frontmatter 는 Claude runtime 용 메타 — Codex 에 전달 시 토큰 낭비 + 지시 오해 소지.
  대안: 그대로 전달 — 낭비.

- **D5. `test-planner` → `test-designer` 개명** — "test" 가 테스트 코드 작성으로 오해되는 문제 제거.
  근거: 책임은 AC 체크박스 설계이지 테스트 코드 아님.
  대안: `ac-designer` / `verification-planner` — 모두 후보였으나 `test-designer` 가 가장 간결 + 기존 어휘 유지.

- **D6. Phase 2 이중 검토 루프 (principal-engineer Claude → principal-engineer Codex → User)** —
  2.1 `Agent(lstack:principal-engineer, mode:design)` principal-engineer (Claude) 가 plan.md `## 설계` 초안 작성.
  2.2 `call-as-codex(lstack:principal-engineer, mode:critique)` principal-engineer (Codex) 가 비판적 검토 → plan.md `### Codex 검토` 블록 append.
  2.3 orchestrator 가 User 에게 설계+검토 제시 → 피드백을 principal-engineer (Claude) 에 재전달 → 반영 → 확정.
  근거: §1.2 설계자 ≠ 검토자 + §1.3 Codex 객관성 + human-in-loop 보장.
  대안: 단일 Codex 설계 — 빠르나 설계자-검토자 루프 없음.

- **D7. Phase 3+4 리뷰 통일 — `codex-pe review mode` 단일 fan-out** — task 완료 직후 병렬:
  `verify ACs × N` ∥ `call-as-codex(lstack:principal-engineer, mode:review)`.
  기존 `frontend-fundamentals:review` skill 호출 + `codex-companion adversarial-review` Bash 분기 제거.
  근거: 리뷰 관점 단일화. principal-engineer 가 이미 FF 원칙 내장 → FF + adversarial 역할 통합 가능.
  대안: 현행 유지 — 동작하나 임계값 분기(LOC>50) + fail-soft 분산.

- **D8. `principal-engineer` review ≠ refactor 분리** —
  `mode: review` = task diff 객관 리뷰 (read-only). Phase 3+4 fan-out 용.
  `mode: refactor` = 동작 보존 복잡성 리팩터 (write=true, commit). 명시적 호출 시만.
  근거: 분석(review) 과 변경(refactor) 은 다른 책임 = SRP. 섞으면 fan-out 에서도 write 권한 과잉 부여.
  대안: 한 mode + write 플래그 분기 — 의미 모호.

- **D9. PRINCIPLE §4.1 기준 기존 프롬프트 리팩터** — `planner` · `test-designer` · `orchestrator` 에서
  임의 수치 (3-8 tasks, 1-3 ACs, LOC>50 등) 를 제거. 원칙은 Responsibilities 로 승격,
  Workflow 는 I/O + 절차 + 고유 Constraints + Failure 만. orchestrator 는 기계적 dispatcher 이므로
  필요 임계값을 `<Config>` 섹션으로 집약.
  근거: §4.1 마이크로매니징 금지. SSOT 일관성.

- **D10. plan.md = 모든 step 진행 공유 SSOT** — orchestrator 는 plan.md 섹션 상태로 Phase 추론,
  각 step agent 는 자기 섹션만 편집. Codex 검토 / 사용자 확정 / 실행 결과 전부 plan.md 반영.
  근거: §3 단일 SOT. resume 경로 단일화.

### 리스크

- **Meta-task 실행 중 하니스 자체가 변동** — task 간 의존 높음.
  발현 조건: rename / frontmatter 추가 후 아직 reference 업데이트 전 중간 상태.
  완화: task 순서를 안정성 기준으로 (문서 → skill rename → agent frontmatter 및 개명 → orchestrator → lstack skill → 참조 업데이트).

- **Frontmatter strip 로직 오작동** — 본문 중간 `---` (markdown hr) 와 충돌 가능.
  발현 조건: 프롬프트 본문에 `---` 가 있을 때.
  완화: 파일 시작이 `---\n` 일 때만 첫 블록(다음 `---\n`까지) 제거. 그 외에는 원본 그대로.

- **orchestrator PM 이관 시 resume 경로 검증 부재** — plan.md 섹션 상태 기반 phase 추론이
  subagent context 에서도 안정적으로 동작하는지 미확인.
  발현 조건: 중단 후 resume 할 때 orchestrator 가 "어느 phase 인지" 오판.
  완화: ARCHITECTURE.md 에 "plan.md 섹션 → phase" 표를 SSOT 로 두고, orchestrator 가 그 표를 읽도록 지시.

- **Phase 2 이중 검토로 설계 비용/지연 증가** — 작은 작업도 Codex critique 호출.
  발현 조건: 소규모/자명한 변경.
  완화: 이번 사이클에는 항상 수행 (규칙 단순). 다음 사이클에 "작업 규모 기반 critique 스킵 gate" 도입 검토.

- **review mode 통일 후 Codex 호출 빈도 증가** — 모든 task 완료 시 1 회.
  발현 조건: task diff 가 trivial 해도 호출.
  완화: review mode 프롬프트에 "trivial change 는 NO_FINDINGS 로 빠르게 종료" 지침. fail-soft 는 유지 (review 실패가 task pass 를 차단하지 않음).

- **test-planner → test-designer 개명으로 과거 worklog 참조 깨짐** — 기록 문서성 vs 일관성.
  발현 조건: 과거 worklog 가 `test-planner` 로 agent 를 참조할 때.
  완화: 새 작업부터 `test-designer` 사용, 과거 worklog 는 역사적 기록으로 그대로 두되 한 줄 migration 주석(선택).

- **Phase 3+4 review mode 에 adversarial 성격 녹이기** — 기존 adversarial-review 는 "관점 도전",
  FF review 는 "구체 원칙 위반". principal-engineer review 프롬프트가 둘 다 커버해야 함.
  발현 조건: review 결과가 피상적이 되거나 adversarial 관점 누락.
  완화: review workflow 에 "(a) FF 축 위반 + (b) 구조/결정 가정 도전 — 두 렌즈로 본다" 명시.

<memo for="planner">
### Task 쪼개기 가이드 (안정성 순서 기준)

**순서 원칙**: 문서 → skill 이름/로직 → agent 개명/frontmatter → orchestrator PM 승격 → lstack skill 얇게 → 참조 일괄 업데이트 → 버전.
중간 상태에서도 각 task 가 "현재 워크플로우를 깨지 않는" 방식으로 진행되도록.

**영향 범위 파악 (grep 대상)**:
- `call-codex-cli` / `call_codex_cli` — SKILL 파일, commands/, skills/lstack/, agents/, docs/
- `test-planner` — 동일 범위
- `test-planner` agent 파일 자체는 rename (git mv)
- agent frontmatter 추가 대상: `principal-engineer.md`, `judge.md` (현재 frontmatter 없음)
- 기존 frontmatter 있는 agent: `planner.md`, `test-planner.md` (→ `test-designer.md`), `orchestrator.md`, `harness-sage.md` — 형식 통일 필요 여부 확인

**파일별 작업 힌트**:

- `skills/call-codex-cli/` → `skills/call-as-codex/` (디렉토리 rename)
  - `SKILL.md` 내부 이름 / 설명 / 예시 모두 `call-as-codex` 로.
  - Step 3 Codex 호출 앞에 frontmatter strip 추가:
    `PROMPT_BODY=$(awk 'BEGIN{in_fm=0; done=0} NR==1 && /^---$/ {in_fm=1; next} in_fm && /^---$/ && !done {in_fm=0; done=1; next} !in_fm {print}' "$PROMPT_PATH")`
    (또는 sed — 첫 `---` 블록만 제거, 본문 시작부터만 적용).

- `agents/principal-engineer.md`
  - frontmatter 추가: `name: principal-engineer`, `description: 객관적·전문적 기술 판단...`, `model: inherit`.
  - Workflows 에 `mode: critique` 추가 (Phase 2.2 용 — 설계 초안에 대한 비판적 검토, read-only, 플랜.md `### Codex 검토` 블록 append).
  - `mode: review` 의미 변경: "복잡성 리팩터" → "task diff 객관 리뷰, read-only". (FF 축 + adversarial 도전 두 렌즈.)
  - `mode: refactor` 신설: 기존 "복잡성 리팩터, write=true" 를 이쪽으로 이동.
  - `mode: design` / `mode: advise` 는 그대로.

- `agents/judge.md`
  - frontmatter 추가 (dual-invocable).
  - Workflow 내용 변경 없음.

- `agents/test-planner.md` → `agents/test-designer.md` (git mv)
  - frontmatter `name: test-designer` 로 갱신.
  - PRINCIPLE §4.1 리팩터: AC count 임의 수치 제거 + Failure/Checklist 축약.

- `agents/planner.md`
  - PRINCIPLE §4.1 리팩터: 3-8 tasks / ≤3줄 등 수치 제거 + Failure/Checklist 축약.

- `agents/orchestrator.md`
  - model `inherit` → `opus`.
  - Role/Responsibilities 를 **전체 Phase 0-6 PM** 기준으로 재작성 (현재는 Phase 3+4 전용).
  - State Detect / Interview dispatch / Design 이중검토 중재 / plan.md 섹션 기반 phase 추론 / Execute fan-out / Spec 업데이트 / Compound 호출 — 전부 포함.
  - 임계값(ralph 3회 등) 은 `<Config>` 섹션으로 집약.
  - Failure_Modes_To_Avoid + Final_Checklist 통합.
  - Phase 3+4 review 는 `call-as-codex(lstack:principal-engineer, mode:review)` 단일 fan-out 로 변경. FF review skill / adversarial Bash 블록 제거.

- `skills/lstack/SKILL.md`
  - 본문을 `Agent({subagent_type: "lstack:orchestrator", prompt: $ARGUMENTS})` 한 번만 하는 얇은 entry 로 재작성.
  - Agent Pool 표는 orchestrator 문서로 이관 (또는 ARCHITECTURE.md 로).

- `docs/spec/ARCHITECTURE.md`
  - "Persona source files" 섹션 제거 (dual-invocable 로 단일화).
  - Agents 표 업데이트: 모든 agent 에 invocable 표시, `principal-engineer` / `judge` 추가, `test-designer` 로 갱신.
  - plan.md 섹션 → phase 매핑 표를 여기 SSOT 로 둔다 (orchestrator 가 읽음).
  - Codex integration pool 표에서 `codex-judge` 삭제 반영 (이미 반영됐으나 재검).

- `docs/spec/PRINCIPLE.md`
  - §1.3 `call-codex-cli` → `call-as-codex` 로 갱신.
  - §4.3 예시 문구 (`call-codex-cli(lstack:principal-engineer)`) → `call-as-codex(...)` 로 갱신.

- `commands/ask-cto.md`
  - `call-codex-cli` → `call-as-codex`. 호출 예시 갱신.

- `plugin.json`
  - `version`: `1.9.0` → `1.10.0`.

**검증 힌트**:
- 리팩터 후 grep `call-codex-cli` / `test-planner` 결과 0 (과거 worklog 제외).
- plugin.json 버전 1.10.0.
- agent 파일 모두 frontmatter 존재 + `name` 필드 일치.
- orchestrator.md model=opus.
- lstack/SKILL.md 가 orchestrator dispatch 만 하는지.

**AC 설계용 힌트 (test-designer 에 전달)**:
task 별로 "파일 경로 존재/내용" · "grep 결과" · "frontmatter 필드" 같은 정적 검증으로 충분.
동작 검증은 end-to-end 로 `/lstack` 을 한 번 실행해서 orchestrator 가 spawn 되는지 확인하는 smoke test 1-2 개.
</memo>

### Codex 검토

#### 동의하는 결정
- D3 — 현재 `agents/principal-engineer.md` / `agents/judge.md` 만 frontmatter가 없고 `docs/spec/ARCHITECTURE.md` 에도 persona source files와 invokable subagent가 분리돼 있다. dual-invocable 단일화는 DRY와 drift 방지 측면에서 맞다.
- D8 — 현재 `principal-engineer` 의 `mode: review` 는 사실상 리팩터 워크플로우다. review와 refactor를 분리하는 쪽이 SRP와 권한 최소화에 맞다.
- D9 — 실제 `agents/planner.md`, `agents/test-planner.md`, `agents/orchestrator.md` 에 수치/체크리스트/안티패턴이 많이 박혀 있다. §4.1 기준으로 얇게 만드는 방향 자체는 맞다.

#### 도전하는 결정
- D1 — `lstack` 를 완전 thin entry 로 만들고 Phase 0-6 전체를 `orchestrator` 하나에 몰아넣으면 PM bootstrap, resume 판별, interview, execution pipeline, spec update가 한 프롬프트에 합쳐진다. 현재도 `orchestrator` 가 이미 크다. 인지부하와 변경 반경을 줄이려면 "새 worklog 선택/생성" 까지는 skill 또는 별도 bootstrap 단계로 남기고, 그 이후만 PM agent가 맡는 대안도 검토해야 한다.
- D2 — `orchestrator` 가 세션마다 `PRINCIPLE.md` + `ARCHITECTURE.md` + `plan.md` 를 읽는 전제는 지금 상태에선 안전하지 않다. 현재 `docs/spec/PRINCIPLE.md` §3 는 아직 `tasks.json` 을 SSOT로 선언하고 있어 `plan.md` 중심 구조와 충돌한다. 문서 SSOT 정렬이 먼저다.
- D4 — root cause는 rename이 아니라 frontmatter strip이다. 현재 `call-codex-cli` 참조가 `skills/`, `agents/`, `docs/spec/`, `commands/ask-cto.md` 전반에 퍼져 있는데, 이름까지 바꾸면 기계적 churn이 커진다. 가장 단순한 안은 기존 이름 유지 + strip 추가, 필요하면 `call-as-codex` 를 alias/deprecation 경로로 두는 것이다.
- D5 — 현재 `agents/test-planner.md` 자체가 이미 "test code를 쓰지 않는다"를 명시하고 있다. 오해의 근본 원인이 이름인지, 설명/예시 부족인지가 아직 증명되지 않았다. rename을 하더라도 alias 없이 바로 치환하면 비용 대비 효익이 약하다.
- D6 — `skills/write-plan-md/SKILL.md` 는 `## 설계` 를 "결정 + 리스크만"으로 제한하고 섹션 소유자도 엄격히 둔다. 여기에 `### Codex 검토` 를 추가하는 것은 현재 규약과 충돌한다. 또한 "설계 초안 작성됨, critique 완료, 사용자 미확정" 상태를 `plan.md` 에 어떻게 표현할지도 빠져 있다.
- D7 — 현재 `agents/judge.md` 와 `agents/orchestrator.md` 는 `ff_review` / `codex_review` 이원 스키마를 전제로 돈다. FF review와 adversarial path를 제거하려면 judge evidence schema, PASS 조건, complexity 후속 라우팅까지 같이 바꿔야 한다. 엔진만 바꾸고 계약을 그대로 두면 중간 상태가 깨진다.
- D10 — `plan.md` 를 SSOT로 두는 방향은 맞지만 설계안만으로는 닫히지 않았다. `PRINCIPLE.md` 의 `tasks.json` 선언, `lstack` 의 phase 추론 표, `write-plan-md` 의 섹션 소유자 규칙, "사용자 승인 대기" 상태 표현을 함께 정의해야 진짜 SSOT가 된다.

#### 추가 리스크
- `judge.md` 계약 누락 리스크 — D7/D8 적용 후에도 judge가 기존 `ff_review` / `codex_review` shape를 기대하면 PASS/RALPH 판정이 틀어진다. 완화안: review schema 재정의와 judge/orchestrator 변경을 한 task로 원자적으로 묶기.
- 문서 SSOT 불일치 리스크 — 현재 `PRINCIPLE.md` 는 `tasks.json`, `ARCHITECTURE.md` 와 `write-plan-md` 는 `plan.md` 를 말한다. 완화안: 동작 변경 전에 이 문서 충돌부터 해소하고, 어떤 문서가 runtime SSOT인지 하나로 못박기.
- approval state 누락 리스크 — critique까지 끝난 설계가 사용자 승인 전 상태에서 중단되면 resume 시 planner로 넘어갈지, 사용자 확인을 다시 받을지 판단 기준이 없다. 완화안: `plan.md` 안에 명시적 상태 마커를 두거나 phase 추론 표에 승인 대기 규칙을 추가하기.
- rename 파급 범위 과소평가 리스크 — `test-planner` 와 `call-codex-cli` 는 과거 worklog뿐 아니라 현재 스펙/커맨드/운영 습관에도 박혀 있다. 완화안: alias 기간을 두고 grep 0 조건은 "신규 코드 경로" 기준으로만 적용하기.

#### 순서/절차 개선 제안
- 1단계는 문서 계약 정렬만 먼저 수행하는 게 안전하다. `PRINCIPLE.md` §3, `ARCHITECTURE.md`, `write-plan-md` 를 먼저 맞춰서 `plan.md`/approval/review schema의 SSOT를 확정해야 한다.
- 2단계는 review 계약 정리다. `principal-engineer`, `judge`, `orchestrator` 의 입력/출력 스키마를 먼저 바꾸고, 그 다음에 FF/adversarial 제거 여부를 결정하는 편이 중간 상태가 덜 위험하다.
- 3단계는 dual-invocable + frontmatter strip 이다. 이건 behavior-preserving change라 앞 단계 계약이 정리된 뒤 비교적 안전하게 넣을 수 있다.
- 4단계로 optional rename (`call-as-codex`, `test-designer`) 을 분리하는 편이 낫다. alias 없이 즉시 rename 하면 설계 본질보다 migration churn이 더 커진다.
- `orchestrator` 의 Phase 0-6 승격은 마지막에 두는 게 맞다. 현재 execution-only orchestrator를 먼저 안정화한 뒤 PM 확장을 해야 smoke test 범위가 선명하다.

#### 결론
- Accept with revisions — 방향은 맞지만 현재 설계는 "문서 SSOT 정렬", "review/judge 계약 재정의", "`## 설계` 내 critique와 approval state의 규약화" 세 가지가 닫히지 않았다. 특히 D4/D5는 rename보다 root cause 해결이 먼저다.

### 최종 확정 (User 승인 2026-04-15)

**이번 사이클 포함 (D2, D3, D6, D7, D8, D9, D10)**:
- 문서 SSOT 정렬 (PRINCIPLE §3 `tasks.json` → `plan.md`; write-plan-md 에 `### Codex 검토` 허용 + approval state 마커; ARCHITECTURE 에 plan.md 섹션 → phase 매핑 SSOT 표).
- review/judge 계약 재정의 (principal-engineer `mode: review` = task diff 객관 리뷰 read-only / `mode: refactor` = 복잡성 리팩터 write; judge evidence schema `ff_review|codex_review` → 단일 `review`; orchestrator evidence 수집/dispatch 동반 수정).
- Dual-invocable frontmatter 추가 (principal-engineer.md, judge.md).
- call-codex-cli skill 에 frontmatter strip 로직 추가 (**rename 없이**).
- 기존 프롬프트 PRINCIPLE §4.1 리팩터 (planner, test-planner, orchestrator — 임의 수치/중복 Checklist 제거).
- 버전 bump: 1.9.0 → **2.0.0** (major — 구조/계약 breaking).

**다음 사이클로 연기 (D1, D4, D5)**:
- D1: orchestrator Phase 0-6 PM 승격 — 이번 사이클에서 문서 SSOT + review 계약 정렬된 뒤에 별도 worklog.
- D4: call-codex-cli → call-as-codex rename — 이번엔 frontmatter strip 만 적용, 필요 판단 시 다음 사이클에 alias 경로로.
- D5: test-planner → test-designer rename — 이번엔 description 강화로 오해 완화, rename 필요성 재평가 후 다음 사이클.

**실행 순서 (Codex 제안 수용)**:
1. 문서 SSOT 정렬 (선행 조건)
2. review/judge 계약 재정의 (schema + mode 분리)
3. Dual-invocable frontmatter + strip 추가 (behavior-preserving)
4. 기존 프롬프트 §4.1 리팩터
5. 버전 bump 2.0.0

**approval state 마커 규약 (D6 보완)**:
- `## 설계` 하단에 다음 중 하나의 블록이 존재해야 Phase 2.4 진입:
  - `### Codex 검토` — critique 완료 (승인 대기 상태)
  - `### 최종 확정 (User 승인 YYYY-MM-DD)` — 사용자 확정 (planner 진입 가능)
- Phase 추론: `### 최종 확정` 블록 없으면 Phase 2.3 (승인 대기) 로 판정.

## 태스크

**코드 루트**: `/Users/yonguk.lee/lstack/`

### T1: 문서 SSOT 정렬 (exec: oh-my-claudecode:executor) — 완료 `630335f`
수정: `docs/spec/PRINCIPLE.md` §3 — `tasks.json` → `plan.md` 로 SSOT 선언 변경, 본문 문구 업데이트.
수정: `skills/write-plan-md/SKILL.md` — `## 설계` 섹션 하위에 `### Codex 검토` / `### 최종 확정 (User 승인 YYYY-MM-DD)` 블록 허용 규약 추가. approval state 마커를 phase 추론 기준으로.
수정: `docs/spec/ARCHITECTURE.md` — `## plan.md 섹션 → phase 매핑` SSOT 표를 추가 (현재 skills/lstack/SKILL.md 에 있는 Phase 추론 표를 여기로 이관/참조). `### 최종 확정` 상태를 포함.

- [x] AC1-1: `docs/spec/PRINCIPLE.md` §3 본문에 `tasks.json` 이 남아있지 않고 `plan.md` 로 기술됨 (v: verifier)
- [x] AC1-2: `skills/write-plan-md/SKILL.md` 에 `### Codex 검토` 와 `### 최종 확정` 이 허용 섹션으로 명시됨 (v: verifier)
- [x] AC1-3: `docs/spec/ARCHITECTURE.md` 에 plan.md 섹션 → phase 매핑 표가 존재하고 `### 최종 확정` 상태 행이 포함됨 (v: verifier)

### T2: review/judge 계약 재정의 (exec: oh-my-claudecode:executor) (depends on: T1) — 완료 `a096b0e`
수정: `agents/principal-engineer.md` — `<Workflows>` 의 `mode: review` 를 "task diff 객관 리뷰 (FF 원칙 축 + adversarial 관점), read-only" 로 재정의; `mode: refactor` 섹션 신설(기존 review 의 "복잡성 리팩터, write" 로직 이관).
수정: `agents/judge.md` — evidence JSON shape 를 `review` 단일 필드로 재정의(`ff_review`/`codex_review` 대체). Decision Rule Table 의 critical 체크 지점 업데이트.
수정: `agents/orchestrator.md` — Per-task fan-out 에서 `frontend-fundamentals:review` skill 호출 + `codex-companion adversarial-review` Bash 블록 제거. `call-codex-cli(lstack:principal-engineer) mode: review` 단일 호출로 치환. evidence 구성도 새 schema 로.

`mode: critique` 도 추가 (Phase 2.2 설계 비판 전용).

- [x] AC2-1: `agents/principal-engineer.md` 에 `mode: review` 설명이 "task diff 객관 리뷰" / read-only 로 업데이트되고 `mode: refactor` 섹션이 신설됨 (v: verifier)
- [x] AC2-2: `agents/judge.md` Decision Rule Table 이 `review.critical` 단일 필드를 참조하고 `ff_review` / `codex_review` 필드가 없음 (v: verifier)
- [x] AC2-3: `agents/orchestrator.md` Per-task fan-out 에 `frontend-fundamentals:review` 와 `adversarial-review` 참조가 남아있지 않고 `call-codex-cli(lstack:principal-engineer)` 단일 호출로 치환됨 (v: verifier)

### T3: Dual-invocable frontmatter 추가 (exec: oh-my-claudecode:executor) — 완료 `69acb8a`
수정: `agents/principal-engineer.md` — 파일 상단 HTML 주석 제거하고 `---\nname: principal-engineer\ndescription: ...\nmodel: inherit\n---` frontmatter 추가.
수정: `agents/judge.md` — 동일 패턴으로 frontmatter 추가.
검증: 파일 모두 Claude subagent 로도 등록 가능한 구조인지 yaml front-matter 유효성.

- [x] AC3-1: `agents/principal-engineer.md` 1 행이 `---` 이고 `name: principal-engineer`, `description`, `model` 필드를 포함한 유효 yaml frontmatter 가 존재 (v: verifier)
- [x] AC3-2: `agents/judge.md` 에 동일 패턴 frontmatter 가 존재하고 `name: judge` 포함 (v: verifier)
- [x] AC3-3: 두 파일의 기존 Role/Responsibilities/Workflow 블록은 content 손실 없이 보존 (v: code-reviewer)

### T4: call-codex-cli 에 frontmatter strip 로직 추가 (exec: oh-my-claudecode:executor) (depends on: T3) — 완료 `bcfb40a`
수정: `skills/call-codex-cli/SKILL.md` Step 3 전에 strip 단계 추가:
파일이 `---\n` 으로 시작하면 첫 `---` 부터 두 번째 `---\n` 까지만 제거 후 본문만 Codex 에 전달. 그 외에는 원본 그대로.
구현 힌트: awk `BEGIN{in_fm=0; done=0} NR==1 && /^---$/ {in_fm=1; next} in_fm && /^---$/ && !done {in_fm=0; done=1; next} !in_fm {print}` 로 안전하게 첫 블록만 스트립.

Step 2.5 로 추가. `PROMPT_BODY` 변수에 strip 결과를 담고 Step 3 에서 `cat "$PROMPT_PATH"` 대신 사용.

- [x] AC4-1: `skills/call-codex-cli/SKILL.md` 에 frontmatter strip 단계가 Step 3 (Codex 호출) 전에 존재하고 "파일 시작이 `---` 일 때만 첫 블록 제거" 규약이 기술됨 (v: verifier)
- [x] AC4-2: `agents/principal-engineer.md` (frontmatter 有) 를 strip 통과 시 출력이 `---` 블록을 포함하지 않음을 스크립트 단위 테스트 (v: test-engineer)
- [x] AC4-3: frontmatter 없는 파일을 strip 통과 시 원본과 바이트 수준 동일 (v: test-engineer)

### T5: planner 프롬프트 §4.1 리팩터 (exec: oh-my-claudecode:executor) — 완료 `22457f1`
수정: `agents/planner.md` — `Success_Criteria` / `Constraints` / `Failure_Modes_To_Avoid` / `Final_Checklist` 에서 임의 수치(`3-8 tasks`, `≤3줄`, `10 파일`, `15 태스크` 등) 제거. 원칙은 Role/Responsibilities 로 승격("1 commit 단위로 적정 쪼개기"). Workflow 는 I/O + 절차 + 고유 Constraints(예: "AC 는 test-planner 영역 — 침범 금지", "`## 요구사항` 섹션 없음") + Failure 응답만.

`Why_This_Matters` + `Success_Criteria` 제거, `Failure_Modes_To_Avoid` + `Final_Checklist` → `Failure_Modes` 통합.

- [x] AC5-1: `agents/planner.md` 에 `3-8`, `≤3줄`, `10 파일`, `15 태스크`, `Task count` 같은 임의 수치 표현이 남아있지 않음 (v: verifier)
- [x] AC5-2: Role/Responsibilities 블록이 PRINCIPLE §4.1 의 "원칙 승격" 예시 형태로 구조화됨 (v: code-reviewer)
- [x] AC5-3: 기존 고유 제약 ("AC 는 test-planner 영역", "`## 요구사항` 섹션 없음") 은 보존 (v: verifier)

### T6: test-planner 프롬프트 §4.1 리팩터 + description 강화 (exec: oh-my-claudecode:executor) — 완료 `1cb03b1`
수정: `agents/test-planner.md` — frontmatter `description` 에 "테스트 코드를 쓰지 않는다. AC 체크박스 설계만" 을 첫 문장으로 두어 오해 완화. 본문의 임의 수치(`1-3 ACs`, `3 태스크에 15 AC`) 제거. Failure_Modes/Checklist 축약, 중복 제거.

100행 → 81행. `Success_Criteria` 제거, `Failure_Modes_To_Avoid` + `Final_Checklist` → `Failure_Modes` 통합.

- [x] AC6-1: `agents/test-planner.md` frontmatter `description` 첫 문장에 "테스트 코드를 쓰지 않는다" 취지의 문구 포함 (v: verifier)
- [x] AC6-2: 본문에 `1-3 ACs`, `15 AC` 같은 임의 수치 표현 없음 (v: verifier)
- [x] AC6-3: Failure_Modes / Checklist 가 원문 대비 라인 수가 감소(축약됨) 하면서 핵심 규약은 보존 (v: code-reviewer)

### T7: orchestrator 프롬프트 §4.1 리팩터 (exec: oh-my-claudecode:executor) (depends on: T2) — 완료 `de954e6`
수정: `agents/orchestrator.md` — 산재된 임계값(`ralph_attempts ≥ 3`, `LOC > 50` 등)을 상단 `<Config>` 섹션으로 집약. `<Failure_Modes_To_Avoid>` 와 `<Final_Checklist>` 통합. 프롬프트에서 Role/Responsibilities 를 Phase 3+4 범위로 명확히 기술(PM 승격은 다음 사이클). review fan-out 은 T2 결과 반영 상태.

`Why_This_Matters` + `Success_Criteria` 제거 → 원칙은 `Responsibilities` 로. 335행 → 308행.

- [x] AC7-1: `agents/orchestrator.md` 에 `<Config>` (또는 동등) 섹션이 존재하고 `ralph_attempts`, `LOC` 등 임계값이 한 곳에 집약됨 (v: verifier)
- [x] AC7-2: `<Failure_Modes_To_Avoid>` 와 `<Final_Checklist>` 가 하나의 섹션으로 통합되었거나 명확히 비중복 (v: code-reviewer)
- [x] AC7-3: Role/Responsibilities 가 Phase 3+4 범위로 기술되어 있고 "Phase 0-6 PM" 같은 문구 없음 (v: verifier)

### T8: 버전 bump 2.0.0 + CHANGELOG (exec: oh-my-claudecode:executor) (depends on: T1, T2, T3, T4, T5, T6, T7) — 완료 `2f52a54`
수정: `plugin.json` — `"version": "1.9.0"` → `"version": "2.0.0"`.
신규: `CHANGELOG.md` (없으면 생성) — `## 2.0.0 - 2026-04-15` 섹션에 breaking/changed/added/migrated 분류로 정리. 특히 breaking: `## 설계` 섹션 규약 변경, review/judge evidence schema, `codex-judge` agent 제거 반영.

- [x] AC8-1: `plugin.json` 의 `version` 필드가 `"2.0.0"` (v: verifier)
- [x] AC8-2: `CHANGELOG.md` 에 `## 2.0.0` 섹션이 존재하고 breaking/changed/added 분류 항목이 포함됨 (v: verifier)
- [x] AC8-3: breaking 항목에 본 작업의 주요 계약 변경(설계 섹션 규약, review/judge schema) 이 최소 2개 이상 언급 (v: code-reviewer)



## 향후 과제
- **ARCHITECTURE.md "Persona source files" 섹션 업데이트 필요**: principal-engineer / judge 가 dual-invocable (frontmatter 有) 로 전환되었으나 ARCHITECTURE.md line 59 에 "NOT invokable subagents" 섹션이 남아있다. → 내부 Agent 표로 통합하거나 섹션 제거.
- **ARCHITECTURE.md Agents 표의 planner 설명 `tasks.json` → `plan.md` 업데이트**: line 55 에 `tasks.json 작성` 이 남아있다.
- **ARCHITECTURE.md Codex Integration Pool 에서 `LOC > 50` 게이트 제거**: 더 이상 adversarial-review 별도 fan-out 이 없으므로 해당 행 업데이트 필요.
- **skills/lstack/SKILL.md 의 Phase 워크플로우 문구 `FF review ∥ Codex adversarial(LOC>50)` 업데이트**: `call-codex-cli(lstack:principal-engineer) mode: review` 단일 호출 반영.
- D1 (다음 사이클): orchestrator Phase 0-6 PM 승격.
- D4 (다음 사이클): call-codex-cli → call-as-codex rename (alias 경로).
- D5 (다음 사이클): test-planner → test-designer rename (필요성 재평가).
