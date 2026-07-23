# Changelog

## Unreleased

### Added

- **start 공통 원칙 동봉**: `start`가 소비 프로젝트의 문서를 찾지 않고, 스킬과 함께 배포된
  `references/PRINCIPLE.md`를 읽는다. 원본 spec과 동봉 사본은 동기화·검사 명령으로 일치시킨다.
- **`pr` 테스트 변경 스캔**: push 전 diff 의 테스트 변경을 훑어 change-detector 테스트(깨져도
  버그가 아닌 테스트)를 플래그한다. 판별 기준·범주·grep 힌트는 `skills/pr/change-detector-tests.md`,
  저작 시점 원칙은 PRINCIPLE 의도 3.

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
