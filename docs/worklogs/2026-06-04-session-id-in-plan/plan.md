# Claude 세션 resume을 위한 session id plan.md 기록

## 배경

lstack의 resume(Phase 0)은 plan.md 섹션 상태로 phase만 추론할 뿐, 이전 세션의 대화
컨텍스트는 복원하지 못한다. Claude Code 세션의 session id를 plan.md에 기록해두면
`claude --resume <session-id>`로 대화 컨텍스트까지 포함된 원래 세션을 재개할 수 있다.
모델(메인 컨텍스트)은 자기 session id를 직접 알 수 없으므로, hook이 stdin JSON의
`session_id`를 캡처해 skill이 읽을 수 있게 노출하는 메커니즘이 필요하다.

사용자 확정 정책:
- 기록 위치: plan.md 맨 끝 `## 세션` 섹션 — `- \`<session-id>\` (YYYY-MM-DD)` 목록
- 멀티 세션: 날짜와 함께 누적 (한 worklog가 여러 세션에 걸치면 모두 기록)
- close(PR 모드) 변환 시에도 유지
- 기록 시점: 새 작업 시작 + resume 시 모두

## Non-goals

- transcript(`.jsonl`) 내용을 plan.md에 복사/백업 — resume은 `claude --resume`의 일
- Codex 등 다른 도구 세션의 resume
- 자동 resume 실행 — id 기록만, resume은 사용자가 수동 실행
- session id가 없는 비대화형/SDK 호출 지원

## 설계

### 결정

- **세션 식별자 획득은 `SessionStart` hook의 단일 책임으로 둔다** — Claude Code hook 입력 JSON은 `session_id`를 공통 필드로 제공하고, `SessionStart`에서 `CLAUDE_ENV_FILE`에 쓴 `export`는 이후 Bash 호출에 유지된다. lstack의 현재 hook은 plan 검증뿐이므로 `hooks/hooks.json`에 `SessionStart` 그룹과 별도 capture script를 추가한다. hook이 plan.md를 직접 수정하는 대안은 worklog 선택 전 실행되는 lifecycle layer가 target plan.md를 알아야 해서 workflow layer와 결합되므로 기각한다.
- **환경 변수 이름은 lstack 전용 `LSTACK_CLAUDE_SESSION_ID`로 둔다** — 검증된 openai-codex reference의 메커니즘은 재사용하되 `CODEX_COMPANION_SESSION_ID`라는 도메인명은 lstack의 Claude resume 기능과 다르다. hook script는 stdout을 내지 않고, `session_id` 또는 `CLAUDE_ENV_FILE`이 없으면 no-op으로 종료한다.
- **plan.md 기록은 lstack workflow helper가 담당한다** — 메인 컨텍스트는 모델 자체로 session id를 알 수 없지만 Bash에서 환경 변수를 읽을 수 있으므로, `skills/lstack/SKILL.md`에 "현재 세션 기록" helper를 두고 Phase 1 worklog 생성 직후와 Phase 0.3 resume worklog 확정 직후에 호출한다. 같은 id가 이미 있으면 추가하지 않고, `## 세션`이 없으면 파일 맨 끝에 만들고 있으면 그 섹션에 `- `<session-id>` (YYYY-MM-DD)` 한 줄만 추가한다.
- **`## 세션`은 phase 상태가 아닌 terminal metadata로 정의한다** — `skills/write-plan-md/SKILL.md`의 작업 중 구조와 close 후 구조에 optional terminal section으로 추가하고, `docs/spec/ARCHITECTURE.md`의 phase mapping은 이 섹션을 무시한다고 명시한다. phase 추론은 `## 설계`, `### 최종 확정`, `### Tn`, AC 상태 같은 workflow marker만 본다.
- **close는 `## 세션`을 보존한다** — 사용자 확정 정책대로 PR 모드 변환에서 설계와 agent marker는 정리하되 session list는 마지막 섹션으로 유지한다. close 후 plan.md가 workflow resume 대상이 아니라는 기존 원칙은 유지하고, session list는 히스토리와 수동 resume 힌트로만 남긴다.

### 리스크

- Hook capture 실패 — 플러그인 reload 전 세션, `CLAUDE_ENV_FILE` 미제공 환경, `session_id` 없는 호출, script 오류에서 발생. 완화: 실패 시 조용히 no-op하고 가짜 id를 만들지 않는다. 구현 검증은 임시 env file에 `SessionStart` JSON을 stdin으로 넣어 export가 생기는지 확인한다.
- 중복 또는 stale 세션 기록 — resume, compact, helper 중복 호출에서 같은 id가 여러 번 기록될 수 있다. 완화: append 전 exact session id로 dedupe하고, 새 id일 때만 날짜와 함께 한 줄 추가한다.
- phase 추론 회귀 — `## 세션`이 `## 태스크` 뒤나 `## 설계` 없는 plan.md에 추가되면 naive section scan이 잘못 분기할 수 있다. 완화: ARCHITECTURE mapping과 lstack Phase 0.3 로직이 explicit workflow marker만 보게 하고, background+session / design+session / tasks+session / PR-mode+session 케이스를 smoke test에 포함한다.
- session id 외부 노출 — plan.md가 commit 또는 PR에 포함되면 local resume handle이 외부에 보인다. 완화: 이번 사용자 확정 정책에 따라 유지하되, 공개 repo나 외부 공유 범위가 커지면 local-only 저장 또는 close 시 redaction을 별도 정책으로 재검토한다.
- SessionStart hook noise/latency — 이 hook은 startup/resume뿐 아니라 세션 lifecycle에서 빠르게 실행되어야 하고 stdout은 Claude 컨텍스트에 들어갈 수 있다. 완화: hook은 stdout 없이 `CLAUDE_ENV_FILE` append만 수행하고, 네트워크나 worklog scan을 하지 않는다.

### Codex 검토

#### 동의하는 결정
- D1 — `SessionStart` hook을 세션 식별자 획득의 단일 책임으로 두는 방향은 맞다. Claude Code hook 공식 문서는 hook 입력 공통 필드의 `session_id`와 `SessionStart`의 `CLAUDE_ENV_FILE` env 지속화를 명시하고, 현재 lstack hook은 `hooks/hooks.json:3`의 plan 검증뿐이므로 capture script 분리는 응집도가 높다.
- D2 — `LSTACK_CLAUDE_SESSION_ID` 전용 env 이름과 stdout 없는 no-op 정책에 동의한다. `SessionStart` stdout은 Claude 컨텍스트에 들어갈 수 있으므로, 컨텍스트 오염을 막으려면 env file append만 수행하는 게 맞다.
- D3 — plan.md 기록을 lifecycle hook이 아니라 lstack workflow helper가 담당하는 결정은 계층 분리에 맞다. worklog target은 `skills/lstack/SKILL.md:90`의 resume 확정 또는 `skills/lstack/SKILL.md:139`의 worklog 생성 이후에야 알 수 있다.
- D4 — `## 세션`을 phase marker가 아닌 terminal metadata로 정의하는 방향에 동의한다. `docs/spec/ARCHITECTURE.md:261`의 phase mapping은 workflow marker 중심이어야 하며, 세션 목록이 phase 판정에 참여하면 resume 로직의 예측가능성이 떨어진다.
- D5 — close 후에도 세션 목록을 유지한다는 사용자 정책은 수용 가능하다. 단, close 후 plan.md가 workflow resume 대상이 아니라는 `docs/spec/ARCHITECTURE.md:264`의 원칙과 함께 읽히도록 "히스토리/수동 resume 힌트"임을 명확히 해야 한다.

#### 도전하는 결정
- D3 — helper 호출 시점은 맞지만, 현재 `hooks/scripts/validate-plan.sh:13`은 모든 plan.md 편집에 `## 배경`, `## 설계`, `## 태스크`를 요구한다. Phase 1 직후와 Phase 2 planner 전 plan.md는 정상적으로 `## 태스크`가 없을 수 있으므로, session append가 Write/Edit 경로를 타면 false validation failure가 난다. root fix는 helper보다 먼저 validator를 phase-aware로 바꾸는 것이다.
- D4/D5 — `## 세션`을 terminal metadata로 추가하려면 `skills/write-plan-md/SKILL.md:187`의 close 후 구조, `skills/close/SKILL.md:25`의 삭제/유지 규칙, `docs/spec/ARCHITECTURE.md:54`의 close 설명을 동시에 바꿔야 한다. 지금 상태로는 close가 `## 세션`을 보존해야 한다는 정책과 "유지 섹션은 배경/태스크/향후 과제"라는 기존 SSOT가 충돌한다.
- D4 — ARCHITECTURE에 "ignore `## 세션`"을 적는 것만으로는 충분하지 않다. `skills/lstack/SKILL.md:90`의 Phase 0.3 지침도 섹션 존재 여부를 상단에서 하단으로 확인한다고 되어 있으므로, lstack skill 자체에 `## 세션` 무시 규칙을 명시해야 prompt-level naive scan을 막을 수 있다.
- D5 — close에서 세션 목록을 보존하더라도 PR body에는 복사하면 안 된다. `skills/write-plan-md/SKILL.md:189`는 close 후 독자를 외부 리뷰어로 둔다. session id는 local resume handle이므로 plan history로 남기는 것과 외부 공유 텍스트에 싣는 것은 분리해야 한다.

#### 추가 리스크
- Env file export injection — hook stdin의 `session_id`를 그대로 `export LSTACK_CLAUDE_SESSION_ID=...`에 붙이면 malformed id가 env file 문법을 깨거나 shell metacharacter를 주입할 수 있다. 완화: UUID/허용 문자 검증 또는 shell-safe quoting 후 append한다.
- Terminal section trap — `## 세션`이 파일 맨 끝에 생긴 뒤 `## 향후 과제`를 나중에 추가/수정하면, 단순 append 구현은 내용을 `## 세션` 아래에 잘못 넣을 수 있다. 완화: 모든 plan append helper는 section-aware insertion을 사용하고, target section이 없으면 `## 세션` 앞에 만든다.
- Hook dependency drift — 현재 validator도 `jq`에 의존한다. capture script가 `jq`를 쓰면 미설치 환경에서 조용히 no-op되어 기능이 실패했는지 알기 어렵다. 완화: jq dependency를 명시하거나, capture script에는 최소 parser/검증 경로를 둔다.
- SessionStart source ambiguity — 공식 hook 입력의 `source`는 startup/resume/clear/compact를 구분한다. 기록 정책은 새 작업 시작 + resume이므로, capture는 모든 source에서 env를 갱신해도 되지만 plan 기록 helper는 worklog가 확정된 workflow 지점에서만 실행해야 한다.

#### 순서/절차 개선 제안
- 먼저 `skills/write-plan-md/SKILL.md`에 작업 중/close 후 구조의 optional `## 세션`, 섹션 소유자, terminal insertion 규칙, PR body 복사 금지 규칙을 추가한다.
- 그 다음 `docs/spec/ARCHITECTURE.md`와 `skills/lstack/SKILL.md`의 phase mapping/Phase 0.3 지침을 업데이트해 `## 세션`을 명시적으로 무시하게 한다.
- `hooks/scripts/validate-plan.sh`를 phase-aware로 바꿔 Phase 1/2 plan.md가 `## 태스크` 없이도 정상으로 통과하게 한 뒤 session helper를 붙인다.
- 이후 `SessionStart` hook과 capture script를 추가한다. 검증은 stdout 없음, env file shell-safe append, `session_id` 없음 no-op, `CLAUDE_ENV_FILE` 없음 no-op을 포함해야 한다.
- 마지막으로 lstack workflow helper를 Phase 1 worklog 생성 직후와 Phase 0.3 resume 확정 직후에 연결하고, exact session id dedupe와 `## 세션` 앞 section-aware insertion을 smoke test로 고정한다.

#### 결론
- Accept with revisions — 핵심 방향은 맞다. 다만 validator phase-awareness, close/write-plan-md/ARCHITECTURE SSOT 정렬, env export quoting, terminal section insertion 규칙을 먼저 잠그지 않으면 session 기록 기능이 plan.md 구조 안정성을 깨뜨릴 수 있다.

### 최종 확정 (User 승인 2026-06-04)

Codex 수정사항 전부 반영 전제로 승인: validator phase-aware 선행, write-plan-md/close/ARCHITECTURE SSOT 동시 정렬, PR body에 session id 복사 금지, env export injection 방어(UUID 검증), terminal section-aware insertion. 구현 순서는 Codex 제안(문서 SSOT → phase mapping → validator → hook → helper)을 따른다.

## 태스크

### T1: write-plan-md SSOT에 `## 세션` terminal section 정의 (exec: general-purpose) — 완료 `cc55ebb`
수정: `skills/write-plan-md/SKILL.md:42` — "작업 중 구조"에 optional terminal `## 세션` (`- \`<id>\` (YYYY-MM-DD)` 목록) 추가
수정: `skills/write-plan-md/SKILL.md:186` — "close 후 구조" 유지 섹션에 `## 세션` 추가, terminal insertion 규칙(다른 섹션 append는 `## 세션` 앞) + PR body 복사 금지 + 섹션 소유자(lstack helper) 명시

규칙 정의를 섹션 예시와 같은 위치에 co-locate — 기존 문서 관례 유지.

- [x] AC1: `skills/write-plan-md/SKILL.md`에 optional terminal section `## 세션`과 항목 형식 `- \`<id>\` (YYYY-MM-DD)`이 명시되어 있다 (v: general-purpose)
- [x] AC2: `skills/write-plan-md/SKILL.md`에 "`## 향후 과제` 등 다른 섹션 추가/수정 시 `## 세션` 앞에 삽입한다"는 terminal insertion 규칙이 명시되어 있다 (v: general-purpose)

### T2: phase mapping에 `## 세션` 무시 규칙 반영 (exec: general-purpose) (depends on: T1) — 완료 `023a0f9`
수정: `docs/spec/ARCHITECTURE.md:149` — hooks 표에 SessionStart capture 행 추가
수정: `docs/spec/ARCHITECTURE.md:259` — phase 매핑이 `## 세션`을 무시(workflow marker만 본다)함을 명시
수정: `skills/lstack/SKILL.md:90` — Phase 0.3 섹션 스캔 지침에 `## 세션` 무시 규칙 명시

write-plan-md SSOT의 문구를 차용해 표현 일관성 유지, 상세 규칙은 SSOT 참조로 위임.

- [x] AC3: `docs/spec/ARCHITECTURE.md` phase 매핑에 phase 추론이 `## 세션`을 무시하고 workflow marker(`## 설계`/`### 최종 확정`/`### Tn`/AC)만 본다는 규칙이 명시되어 있다 (v: general-purpose)
- [x] AC4: `skills/lstack/SKILL.md` Phase 0.3 섹션 스캔 지침에 `## 세션`을 phase 판정에서 제외한다는 규칙이 명시되어 있다 (v: general-purpose)

### T3: close 변환 규칙에 `## 세션` 유지·PR body 제외 반영 (exec: general-purpose) (depends on: T1) — 완료 `ed403d9`
수정: `skills/close/SKILL.md:25` — 유지 섹션에 `## 세션` 추가, PR body에는 session id 복사 금지 명시
수정: `docs/spec/ARCHITECTURE.md:54` — close 설명에 session list 보존(히스토리/수동 resume 힌트) 반영

**남은 리스크**: ARCHITECTURE.md 편집 2줄이 동시 작업 race로 T2 커밋(`023a0f9`)에 번들됨 — 내용 손실은 없음.

- [x] AC5: `skills/close/SKILL.md`에 close 변환 시 `## 세션` 섹션을 유지(삭제하지 않음)하고 session id를 PR body에 복사하지 않는다는 규칙이 둘 다 명시되어 있다 (v: general-purpose)

### T4: validate-plan.sh phase-aware 전환 (exec: general-purpose) (depends on: T2, T3) — 완료 `565d8ba`
수정: `hooks/scripts/validate-plan.sh:13` — `## 태스크` 필수 검증을 phase-aware로 완화(Phase 1/2 plan.md가 `## 태스크` 없이 통과). `## 배경`만 hard-require, 설계/태스크는 존재 시 형식만 검증

이번 기능과 무관한 기존 잠복 버그(Phase 1 plan.md false fail) 선행 해소. deprecated 패턴 경고·출력 형식·exit 0 규약은 보존.

- [x] AC6: `## 배경`만 있는 plan.md(Phase 1 직후, `## 태스크` 없음)를 validate-plan.sh로 검증하면 통과(exit 0)한다 (v: general-purpose)
- [x] AC7: 기존 정상 plan.md(`## 배경`+`## 설계`+`## 태스크` 모두 포함)도 validate-plan.sh 검증을 계속 통과(exit 0)한다 (v: general-purpose)

### T5: SessionStart capture hook 추가 (exec: general-purpose) (depends on: T4) — 완료 `5b58fe3`
신규: `hooks/scripts/capture-session.sh` — stdin JSON `session_id` 읽어 `$CLAUDE_ENV_FILE`에 `export LSTACK_CLAUDE_SESSION_ID=...` append. stdout 없음, `session_id`/`CLAUDE_ENV_FILE` 부재 시 no-op, UUID/허용문자 검증 또는 shell-safe quoting으로 injection 방어
수정: `hooks/hooks.json:2` — `SessionStart` hook 그룹에 capture script 등록

기존 validate-plan.sh 스타일(shell + jq) 일관 유지, 모든 실패 모드는 silent no-op으로 세션 시작을 차단하지 않음. 멱등(중복 export 생략).

**의사결정**: jq 미설치 시 조용히 no-op — lifecycle 안정성 우선 trade-off.

- [x] AC8: 유효 `session_id`와 임시 `CLAUDE_ENV_FILE`을 주고 capture-session.sh를 실행하면 env file에 `export LSTACK_CLAUDE_SESSION_ID=<id>`가 append되고, stdout은 비어 있다 (v: general-purpose)
- [x] AC9: `session_id`가 없거나 `CLAUDE_ENV_FILE`이 없는 stdin으로 실행하면 stdout/env file 변경 없이 exit 0으로 no-op한다 (v: general-purpose)
- [x] AC10: malformed `session_id`(UUID/허용 문자 위반, 예: shell metacharacter 포함)는 env file에 기록되지 않는다 (v: general-purpose)
- [x] AC11: `hooks.json`에 capture-session.sh를 실행하는 `SessionStart` hook 그룹이 등록되어 있고, plan.md를 write하는 로직은 capture script에 없다 (v: general-purpose)

### T6: lstack 세션 기록 helper 추가 및 연결 (exec: general-purpose) (depends on: T5) — 완료 `c87cce0`
수정: `skills/lstack/SKILL.md:139` — Phase 1 worklog 생성 직후 "현재 세션 기록" helper 호출
수정: `skills/lstack/SKILL.md:90` — Phase 0.3 resume worklog 확정 직후 동일 helper 호출
helper: `$LSTACK_CLAUDE_SESSION_ID` 읽어 exact id dedupe 후 `## 세션`에 한 줄 추가, 섹션 없으면 EOF 생성(section-aware: 다른 terminal 섹션 앞에 배치)

`## Session Recording Helper` 서브섹션에 PM이 그대로 실행 가능한 Bash 스니펫 포함. 비-Claude 환경(env var 없음)은 silent no-op.

- [x] AC12: helper가 `## 세션` 없는 plan.md에 `$LSTACK_CLAUDE_SESSION_ID`를 기록하면 `## 세션` 섹션이 생성되고 `- \`<id>\` (YYYY-MM-DD)` 한 줄이 추가된다 (v: general-purpose)
- [x] AC13: 이미 같은 session id가 `## 세션`에 있으면 helper 재실행 시 중복 줄이 추가되지 않는다 (dedupe) (v: general-purpose)
- [x] AC14: `skills/lstack/SKILL.md`에 Phase 1 worklog 생성 직후와 Phase 0.3 resume 확정 직후 두 지점에서 helper를 호출한다는 지침이 명시되어 있다 (v: general-purpose)

## 향후 과제
- session id 외부 노출(commit/PR 포함) — 공개 repo나 공유 범위 확대 시 local-only 저장 또는 close 시 redaction을 별도 정책으로 재검토.
- Hook dependency drift — capture script가 `jq` 의존 시 미설치 환경에서 조용히 no-op되어 실패 감지가 어렵다. jq 의존 명시 또는 최소 parser 경로 검토.
- ~~(T1 review, Important) close 후 구조 예시 블록과 변환 규칙 불일치~~ → 리팩터 `8ec34cd`에서 예시 블록에 `## 세션` 추가 완료.
- (T1 review, complexity) `skills/write-plan-md/SKILL.md` — close 후 구조 예시와 변환 규칙이 같은 구조 계약을 중복 표현. 한쪽만 업데이트되면 문서 내부 drift 발생.
- (T2 review, Important) `docs/spec/ARCHITECTURE.md:273` — "phase 추론은 workflow marker만 본다" 선언과 매핑 표의 `## 배경` 없음/있음 판정 기준이 모순. 근본 해결: phase progress marker와 worklog existence sentinel 분리 명명.
- (T2 review, Minor) `skills/lstack/SKILL.md:92` — "섹션 존재 여부를 상단에서 하단으로 확인" 기존 문장과 "workflow marker만 본다" 새 문장의 긴장 관계. marker/상태 표 기준 판정으로 좁히면 더 예측 가능.
- ~~(T5 review, Important) `hooks/hooks.json:9` — SessionStart sync hook timeout 미명시~~ → 리팩터 `c263d90`에서 `timeout: 2` 적용 완료.
- ~~(T5 review, Important) `hooks/scripts/capture-session.sh:20` — hex/dash allowlist를 full UUID 구조 검증으로~~ → 리팩터 `c263d90`에서 8-4-4-4-12 검증 적용 완료.
- (T6 review, Important) `skills/lstack/SKILL.md:175` — Phase 1 직후 `## 세션` 생성 시 downstream plan writer(principal-engineer design 등)가 terminal insertion 규칙을 주입받지 않음 — `## 설계` EOF append 시 `## 세션`이 terminal이 아니게 되는 숨은 전제. design/critique 호출 context에 규칙 주입 필요.
- ~~(T6 review, Important) helper의 무조건 EOF append~~ → 리팩터 `4d7fac5`에서 `hooks/scripts/record-session.sh`로 추출, section-aware insertion + 섹션 scope dedupe + smoke test(`tests/record-session-smoke.sh`) 적용 완료.

## 세션
- `2c3a7ae8-edda-4953-8b21-b78dbdc3b01b` (2026-06-04)
