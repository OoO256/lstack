# Changelog

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
