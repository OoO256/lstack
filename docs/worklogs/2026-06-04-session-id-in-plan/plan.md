# Claude 세션 resume을 위한 session id plan.md 기록

## 배경

lstack의 resume(Phase 0)은 plan.md 섹션 상태로 phase만 추론할 뿐, 이전 세션의 대화
컨텍스트는 복원하지 못한다. Claude Code 세션의 session id를 plan.md에 기록해두면
`claude --resume <session-id>`로 대화 컨텍스트까지 포함된 원래 세션을 재개할 수 있다.
모델(메인 컨텍스트)은 자기 session id를 직접 알 수 없으므로, hook이 stdin JSON의
`session_id`를 캡처해 skill이 읽을 수 있게 노출하는 메커니즘이 필요하다.

기록 정책: plan.md 맨 끝 `## 세션` 섹션에 `- \`<id>\` (YYYY-MM-DD)` 목록으로 누적
(새 작업 + resume 모두), close(PR 모드) 후에도 유지.

## Non-goals

- transcript(`.jsonl`) 내용을 plan.md에 복사/백업 — resume은 `claude --resume`의 일
- Codex 등 다른 도구 세션의 resume
- 자동 resume 실행 — id 기록만, resume은 사용자가 수동 실행
- session id가 없는 비대화형/SDK 호출 지원

## 구현 원칙

- **계층 분리 — hook은 캡처만, 기록은 워크플로우가** — session id 획득(SessionStart hook → `$CLAUDE_ENV_FILE` export)과 plan.md 기록(PM이 호출하는 helper)을 분리. lifecycle hook이 worklog 위치를 알 필요가 없어 결합도가 낮다.
- **`## 세션`은 terminal metadata** — phase 추론은 workflow marker(`## 설계`/`### 최종 확정`/`### Tn`/AC)만 보고 `## 세션`은 무시. 세션 목록이 resume 판정에 끼어들지 않아 예측 가능성이 유지된다.
- **실패는 조용히, 위조는 없이** — hook의 모든 실패 모드(session_id 없음, env file 없음, jq 미설치, malformed id)는 silent no-op. 세션 시작을 차단하지 않고 가짜 id를 만들지 않는다. full UUID(8-4-4-4-12) 검증으로 env file injection을 차단.
- **SSOT 동시 정렬** — plan.md 구조 규칙을 가진 세 문서(write-plan-md·close·ARCHITECTURE)를 함께 갱신해 drift를 막고, validator(`validate-plan.sh`)를 phase-aware로 선행 수정해 Phase 1 plan.md의 false fail을 제거.
- **로직은 tested script로, 문서는 호출 지점만** — 기록 helper를 `hooks/scripts/record-session.sh`(section-aware insertion + dedupe + smoke test)로 추출하고 skill 문서는 호출 지점만 명시.

## 태스크

### T1: write-plan-md SSOT에 `## 세션` terminal section 정의 — 완료 `cc55ebb`
`## 세션` 항목 형식·terminal insertion 규칙(다른 섹션은 `## 세션` 앞에 삽입)·PR body 복사 금지·섹션 소유자를 SSOT에 명시. close 후 구조 예시와의 drift는 후속 리팩터 `8ec34cd`에서 정렬.

- [x] AC1: `skills/write-plan-md/SKILL.md`에 optional terminal section `## 세션`과 항목 형식 `- \`<id>\` (YYYY-MM-DD)`이 명시되어 있다
- [x] AC2: `skills/write-plan-md/SKILL.md`에 "`## 향후 과제` 등 다른 섹션 추가/수정 시 `## 세션` 앞에 삽입한다"는 terminal insertion 규칙이 명시되어 있다

### T2: phase mapping에 `## 세션` 무시 규칙 반영 — 완료 `023a0f9`
ARCHITECTURE phase 매핑과 lstack Phase 0.3 지침이 workflow marker만 보도록 명시. hooks 표에 capture-session 계약 문서화.

- [x] AC3: `docs/spec/ARCHITECTURE.md` phase 매핑에 phase 추론이 `## 세션`을 무시하고 workflow marker(`## 설계`/`### 최종 확정`/`### Tn`/AC)만 본다는 규칙이 명시되어 있다
- [x] AC4: `skills/lstack/SKILL.md` Phase 0.3 섹션 스캔 지침에 `## 세션`을 phase 판정에서 제외한다는 규칙이 명시되어 있다

### T3: close 변환 규칙에 `## 세션` 유지·PR body 제외 반영 — 완료 `ed403d9`
close는 `## 세션`을 보존(히스토리/수동 resume 힌트)하되, session id는 local resume handle이므로 PR body 등 외부 공유 텍스트에는 싣지 않는다.

- [x] AC5: `skills/close/SKILL.md`에 close 변환 시 `## 세션` 섹션을 유지(삭제하지 않음)하고 session id를 PR body에 복사하지 않는다는 규칙이 둘 다 명시되어 있다

### T4: validate-plan.sh phase-aware 전환 — 완료 `565d8ba`
이번 기능과 무관한 기존 잠복 버그(Phase 1 plan.md false fail) 선행 해소. `## 배경`만 hard-require, deprecated 경고·출력 형식·exit 0 규약은 보존.

- [x] AC6: `## 배경`만 있는 plan.md(Phase 1 직후, `## 태스크` 없음)를 validate-plan.sh로 검증하면 통과(exit 0)한다
- [x] AC7: 기존 정상 plan.md(`## 배경`+`## 설계`+`## 태스크` 모두 포함)도 validate-plan.sh 검증을 계속 통과(exit 0)한다

### T5: SessionStart capture hook 추가 — 완료 `5b58fe3`
lstack 첫 SessionStart hook. 모든 실패 모드는 silent no-op으로 세션 시작을 차단하지 않으며 멱등. 후속 리팩터 `c263d90`에서 full UUID 검증 + `timeout: 2` + stderr 흡수 적용.

- [x] AC8: 유효 `session_id`와 임시 `CLAUDE_ENV_FILE`을 주고 capture-session.sh를 실행하면 env file에 `export LSTACK_CLAUDE_SESSION_ID=<id>`가 append되고, stdout은 비어 있다
- [x] AC9: `session_id`가 없거나 `CLAUDE_ENV_FILE`이 없는 stdin으로 실행하면 stdout/env file 변경 없이 exit 0으로 no-op한다
- [x] AC10: malformed `session_id`(UUID/허용 문자 위반, 예: shell metacharacter 포함)는 env file에 기록되지 않는다
- [x] AC11: `hooks.json`에 capture-session.sh를 실행하는 `SessionStart` hook 그룹이 등록되어 있고, plan.md를 write하는 로직은 capture script에 없다

### T6: lstack 세션 기록 helper 추가 및 연결 — 완료 `c87cce0`
Phase 1 worklog 생성 직후 + Phase 0.3 resume 확정 직후 두 지점에서 호출. 비-Claude 환경(env var 없음)은 silent no-op. 후속 리팩터 `4d7fac5`에서 `hooks/scripts/record-session.sh`로 추출(section-aware insertion + 섹션 scope dedupe + smoke test).

- [x] AC12: helper가 `## 세션` 없는 plan.md에 `$LSTACK_CLAUDE_SESSION_ID`를 기록하면 `## 세션` 섹션이 생성되고 `- \`<id>\` (YYYY-MM-DD)` 한 줄이 추가된다
- [x] AC13: 이미 같은 session id가 `## 세션`에 있으면 helper 재실행 시 중복 줄이 추가되지 않는다 (dedupe)
- [x] AC14: `skills/lstack/SKILL.md`에 Phase 1 worklog 생성 직후와 Phase 0.3 resume 확정 직후 두 지점에서 helper를 호출한다는 지침이 명시되어 있다

## 향후 과제

- session id 외부 노출(commit/PR 포함) — 공개 repo나 공유 범위 확대 시 local-only 저장 또는 close 시 redaction을 별도 정책으로 재검토.
- capture script의 `jq` 의존 — 미설치 환경에서 조용히 no-op되어 실패 감지가 어렵다. 기능 필수화 시 doctor/설치 단계 검증 검토.
- `docs/spec/ARCHITECTURE.md:273` — "phase 추론은 workflow marker만 본다" 선언과 매핑 표의 `## 배경` 판정 기준이 모순. phase progress marker와 worklog existence sentinel 분리 명명 필요.
- `skills/lstack/SKILL.md` — downstream plan writer(principal-engineer design 등)가 terminal insertion 규칙을 주입받지 않음. `## 설계` EOF append 시 `## 세션`이 terminal이 아니게 되는 숨은 전제 — design/critique 호출 context에 규칙 주입 필요.
- (하니스) wave 내 같은 파일 동시 수정 race — 병렬 태스크가 같은 파일을 수정하면 커밋 경계가 오염됨. wave planning에서 같은 파일 수정은 hard conflict로 분리.
- (하니스) 작업 크기 대비 파이프라인 무게 — 소규모 기능에 풀 파이프라인(설계→critique→태스크별 judge/review)은 과함. small task 경량 경로 검토.
- (하니스) Codex refactor 모드 커밋 불가 — 샌드박스 `.git` 쓰기 차단으로 항상 실패. refactor 계약을 "파일 수정만, 커밋은 PM"으로 변경.

## 세션
- `2c3a7ae8-edda-4953-8b21-b78dbdc3b01b` (2026-06-04)
