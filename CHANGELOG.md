# Changelog

## Unreleased

### 코드 이해 중심 워크플로우 — PR #26–#30

- `start` → `align`에서 사용자 분류·이름·대표 코드를 합의하고, 위임·재개와 작은 구현 단위에도
  적용 원칙·합의를 전달·대조한다. `PRINCIPLE.md`의 내용은 담당 스킬로 옮긴다.
- `/code-review`는 `/reviewer`로 개명한다. code-reviewer를 제거하고 readability-reviewer·
  behavior-tester·security-reviewer로 역할을 나눈다. lint·독립 리뷰는 요청할 때만 실행한다.
- 피드백의 적용 범위·승인 여부, 결정 이유·버린 대안·남은 고민을 handoff에 보존하고 다음 작업에서 재사용한다.
- **논의 재개:** Codex 세션 ID `01a07fe6-b8ef-7862-9290-925399234add`.
  [공통 배경과 선택 이유](docs/worklogs/2026-09-11-align-code-reading/handoff.md)에서 시작하고,
  [최신 역할 분리·구현 전후 원칙 적용과 남은 질문](docs/worklogs/2026-09-11-readability-and-qa/handoff.md)으로 이어간다.
  세션 원문에 접근하지 못해도 두 기록에서 판단 맥락을 읽을 수 있다. 실제 준수 효과·독립 실행은 아직 미검증이다.

### Added

- **`pr` PR 스크린샷 첨부**: UI 변경의 as-is/to-be 캡처를 GitHub 첨부 CDN(`user-attachments`)에
  올리고 본문에는 URL 만 넣는다 — 이미지가 레포에 쌓이지 않는다. 업로드 API 가 없어 로그인된
  Playwright 프로필의 코멘트 박스로 올린 뒤(제출하지 않는다) 삽입된 URL 만 회수한다.
  절차는 `skills/pr/screenshots.md`. `show` 는 as-is 캡처를 미리 남기도록 한 줄 추가.

## 3.1.0 - 2026-08-24

### Breaking

- **plan.md 폐지 → handoff.md**: 계획 문서를 만들지 않는다. 계획은 채팅에 인라인으로 제시하고,
  worklog 에는 인계장 `handoff.md` 하나만 남긴다. 탑다운 4섹션 —
  배경(문제 · 원인) · 해결 방법(as-is → to-be · 설계) · 결과(결정 · 검증) · 한계와 후속.
  subagent 위임 전 · PR 전 · compact 전 · `/handoff` 호출 시 작성하며 매번 덮어쓴다.
- **`write-plan-md` 스킬 → `handoff`**: 구조 SSOT 이면서 `/handoff` 로 직접 호출 가능.
- **`review` 스킬 → `explain`**: 남의 PR/코드를 대화로 이해하는 용도. `/code-review` 와 목적 분리.

### Added

- **`pr` 테스트 변경 스캔**: push 전 diff 의 테스트 변경을 훑어 change-detector 테스트(깨져도
  버그가 아닌 테스트)를 플래그한다. 판별 기준·범주·grep 힌트는 `skills/pr/change-detector-tests.md`,
  저작 시점 원칙은 PRINCIPLE 의도 3.
- **`code-review` 스킬 + `code-reviewer`/`security-reviewer` 에이전트**: 두 리뷰어를 fresh
  subagent 로 병렬 spawn — 구현자(메인) ≠ 리뷰어 컨텍스트 분리로 blind spot 공유 방지.
  블로커 있으면 재-spawn 루프(기본 1회). 대상: worktree diff · PR 번호/URL · 파일 경로.
  두 에이전트는 스킬을 거치지 않고 직접 호출도 가능.

## 3.0.0 - 2026-07-14

두꺼운 오케스트레이터를 걷어내고 "intent, not stages" 로 재설계. 모델 성능 향상으로
고정 스테이지·검증 게이트의 ROI 가 역전됐고, 반복 지시는 능동 발동 스킬로 대신한다.

### Breaking

- **Phase 0-7 오케스트레이터 제거**: judge verdict(PASS/RALPH/RESCUE/ESCALATE)·ralph-loop·
  codex rescue·wave 스케줄러·plan.md 섹션→phase 매핑 전부 삭제.
- **`lstack` 스킬 → `start`**: 진입점이 오케스트레이터가 아니라 격리+인터뷰+계획 착수만.
- **plan.md 규약 변경**: `T1..Tn`/AC 체크박스 게이트·저널↔PR 모드 변환 제거. 최소 구조
  (`## 배경`·`## 계획`·`## 향후 과제`) + 완료 마커 `✅`.
- **Codex 자동 개입 제거**: `call-as-codex` 는 on-demand bare 메커니즘으로만 유지.

### Added

- **`show`**: 동작 확인 스킬. ① 사용자 수동 테스트 / ② agent e2e, Chrome CDP.
- **`pr`**: code 올리기. draft/ready 질문·본인 assign·이전 PR 기반 reviewer 질문·인간용 desc.
- **`review`**: 남의 PR 이해 돕기. 구조/데이터흐름 + 사용자입력→클라→백→영속화 리뷰 순서.
- **PRINCIPLE.md**: 8개 개발 의도 + 커뮤니케이션 원칙 + 라이프사이클 arc 가이드로 재작성.

### Changed

- **`compound`**: 회고 → 하니스 자동화 **제안만** (close 직전 자동, 수락 시에만 harness-sage).
- **`close`**: PR 인터뷰 분리(`pr` 로)·검증 제거. 완료 확인 + plan 정리 + worktree 닫기만.
- **`start` 가 구 `setup` 흡수**: worktree 는 항상 origin/main 에서 새 브랜치 (의도 4).
- 버전 정리: plugin.json/marketplace.json/package.json 을 모두 `3.0.0` 으로 동기 (기존 drift 해소).

### Removed

- agents `judge`·`principal-engineer`·`planner`·`test-designer`, command `ask-cto`,
  hook `validate-plan` (v2 hookless). `harness-sage` 는 compound 용으로 유지.

## 2.0.1 - 2026-04-15

### Changed

- **orchestrator.md**: Phase 3+4 전용 → Phase 0-6 전체 PM 으로 승격. model `inherit` → `opus`. 상태 감지, 인터뷰, 설계 이중검토 중재, 실행 파이프라인, spec 업데이트, compound 전체 관장.
- **lstack SKILL.md**: Phase 0-6 로직 제거, orchestrator spawn 만 하는 얇은 진입점으로 축소 (240행 → 33행).
- **ARCHITECTURE.md**: approval contract SSOT 단락 추가 (최종 확정 블록 작성자/승인 방식/전이 규칙 단일 정의).
- **marketplace.json**: version `1.0.0` → `2.0.1` (plugin.json 과 동기).

### Renamed

- `skills/call-codex-cli/` → `skills/call-as-codex/` — 모든 호출자 참조 일괄 치환. 과거 worklog 는 역사적 기록 보존.
- `agents/test-planner.md` → `agents/test-designer.md` — AC 설계 역할을 명확히. 모든 호출자 참조 일괄 치환.

### Fixed

- **plugin.json / marketplace.json version drift** — 두 파일 모두 `2.0.1` 로 동기.

## 2.0.0 - 2026-04-15

### Breaking

- **`## 설계` 섹션 규약 변경**: `### Codex 검토` (Codex critique 블록) 와 `### 최종 확정 (User 승인)` (approval state 마커) 가 `## 설계` 하위에 허용/필수. Phase 추론이 이 블록 존재 여부에 의존.
- **review/judge evidence schema 변경**: `ff_review` + `codex_review` 이원 필드 → `review` 단일 필드로 통합. Decision Rule Table 이 `review.critical` 만 참조.
- **orchestrator per-task fan-out 변경**: `frontend-fundamentals:review` skill + `codex-companion adversarial-review` Bash 블록 제거. `call-as-codex(lstack:principal-engineer) mode: review` 단일 호출로 치환.
- **principal-engineer `mode: review` 재정의**: 기존 "복잡성 리팩터 (write)" → "task diff 객관 리뷰 (read-only, FF 축 + adversarial 관점)". 리팩터는 `mode: refactor` 로 분리.

### Changed

- **PRINCIPLE.md §3**: `tasks.json` → `plan.md` 로 단일 SOT 선언 변경.
- **ARCHITECTURE.md**: plan.md 섹션 → Phase 매핑 SSOT 표 추가.
- **write-plan-md SKILL.md**: `### Codex 검토` / `### 최종 확정` 허용 섹션 + 섹션별 소유자 표 업데이트.
- **orchestrator.md**: `<Config>` 섹션 신설 (임계값 집약). `<Failure_Modes_To_Avoid>` + `<Final_Checklist>` → `<Failure_Modes>` 통합. `<Why_This_Matters>` + `<Success_Criteria>` → `<Responsibilities>` 승격.
- **planner.md**: 임의 수치 (3-8 tasks, ≤3줄 등) 제거. `<Failure_Modes_To_Avoid>` + `<Final_Checklist>` → `<Failure_Modes>` 통합.
- **test-designer.md**: description 첫 문장에 "테스트 코드를 쓰지 않는다" 명시. 임의 수치 (1-3 ACs) 제거. Failure/Checklist 통합.

### Added

- **principal-engineer.md**: `mode: critique` (Phase 2.2 설계 비판 read-only), `mode: refactor` (동작 보존 복잡성 리팩터 write).
- **principal-engineer.md / judge.md**: YAML frontmatter 추가 (dual-invocable — Claude subagent + Codex 프롬프트 양쪽 호출 가능).
- **call-as-codex SKILL.md**: Step 2.5 Frontmatter strip — 프롬프트 파일의 YAML frontmatter 를 제거 후 본문만 Codex 에 전달.

### Migrated

- `codex-architect` → `principal-engineer` (이전 사이클에서 완료, 이번 사이클에서 frontmatter/mode 정비).
- `codex-judge` → `judge` (이전 사이클에서 완료, 이번 사이클에서 frontmatter/schema 정비).
