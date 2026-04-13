---
name: write-plan-md
description: |
  This skill should be used by any agent that needs to read or write plan.md.
  Defines the plan.md structure, section conventions, and editing rules.
  Agents should invoke this skill before modifying plan.md to ensure consistency.
---

# Plan — plan.md 구조 및 수정 규칙

모든 agent가 plan.md를 읽고 쓸 때 이 규칙을 따른다.

**설계 원칙:** plan.md는 **저널**이다. 같은 사실을 두 번 적지 않는다.
- 단일 SOT: **태스크**가 모든 행위 정보를 가진다 (요구사항 · AC · 구현 힌트 · worklog).
- 설계: **왜 그렇게 결정했는가 + 리스크** 만. 현재 상태 분석/파일 리스트는 태스크 본문으로.
- 상태: 그룹으로 표시 (`### 대기` / `### 진행 중` / `### 완료`) — 체크박스만으로 상태를 추적하지 않는다.
- 좋은 예시: `references/example-plan.md` 참조.

## plan.md 경로

`docs/worklogs/YYYY-MM-DD-<goal>/plan.md`

## 구조

```markdown
# <goal>

(선택) **코드 루트**: `packages/foo/` — 이후 모든 경로는 상대

## 배경
2-3 문장. 이 worklog가 왜 존재하는지, 어떤 사용자 가치를 만드는지.

## AS-IS → TO-BE (선택)
한눈에 상태 대비가 필요할 때만. 표/3-5줄/before-after 스니펫 중 편한 형식.
작업이 단순한 기능 추가면 생략 가능.

```markdown
## AS-IS → TO-BE

| 축 | AS-IS | TO-BE |
|---|---|---|
| 구조 | 플랫한 단일 파일 | 모듈 분리 (tools/, utils/) |
| 진행 상태 | 전부 [ ] — 스캔 불가 | 대기/진행중/완료 그룹 |
| 중복 | 요구사항·설계·태스크 3중 | 태스크 단일 SOT |
```

또는 서술형:

```markdown
## AS-IS → TO-BE
- AS-IS: 폴백이 단색 placeholder 로 자동 대체 → 에이전트가 "완성" 선언.
- TO-BE: 폴백은 Director 에스컬레이션 경로만. 단색만의 씬은 최종 결과 금지.
```

## Non-goals (선택)
- 스코프 밖 항목 한 줄씩

## 설계
### 결정
- **결정 내용** — 근거. 대안: X (기각 이유).
  FF 원칙: 가독성↑ / 응집도↑ / 결합도↓ 중 해당 축.
  복잡성 신호: <신호명> → <도입 패턴> 또는 "없음".
- **두 번째 결정** — …

### 리스크
- 구체적 위험 → 발현 조건, 완화안

> "현재 상태", "수정 범위 전체 리스트", "개입 지점 상세"는 여기 **쓰지 않는다**.
> 그건 각 태스크 본문에 1-2줄씩 들어간다.

## 태스크
(**순서: 완료 → 진행 중 → 대기** = 시간 순. 위에서부터 과거, 아래가 미래.)

### 완료
- [x] T0: action (exec: executor) — commit `abc1234`
  - [x] AC0: … (v: verifier) ✓
  ### 작업 요약
  1-3줄. 실제로 바꾼 것. (필수)
  ### 검증 방법
  어떻게 돌려봤는지. 명령 · 결과 한 줄. (필수)
  ### 코드 리뷰
  pass / Critical N / Important N. 핵심 지적만 bullet. (필수 — orchestrator가 씀)
  ### 의사결정 (선택)
  **구현 중 새로 내린 결정만.** `## 설계 › ### 결정` 에 이미 적은 것은 반복 금지.
  쓸 게 없으면 섹션 자체 생략.
  ### 남은 리스크 (선택)
  배포 후 모니터링 필요한 것, 해결 못 한 엣지 케이스, 주의점.
  (이전 이름: "암묵지"). 없으면 생략.

### 진행 중
- [→] T3: action (exec: executor) — dispatched 2026-04-13 14:02
  - [ ] AC4: … (v: verifier)

### 대기
- [ ] T1: 간단한 action 문장 (exec: executor)
  - [ ] AC1: 구체적 검증 항목 (v: verifier)
  - [ ] AC2: 또 다른 검증 (v: test-engineer)
- [ ] T2: action (exec: executor)
  수정: `agents/dev.md:30` — 폴백 룰 교체
  신규: `rules/foo.md` — 패턴 카탈로그
  - [ ] AC3: … (v: code-reviewer)

## 향후 과제
- 스코프 밖이지만 기록할 가치가 있는 것
```

## 섹션별 소유자

| 섹션 | 누가 작성 | 언제 |
|------|----------|------|
| `# <goal>` + `## 배경` | PM (lstack skill) | Phase 1 후 |
| `## AS-IS → TO-BE` (선택) | architect / PM | Phase 2.2-2.3 또는 Phase 1 |
| `## 설계` | architect / codex-architect | Phase 2.2-2.3 |
| `## 태스크 › ### 대기` (skeleton) | planner | Phase 2.4 |
| `## 태스크 › ### 대기` (AC 채우기) | test-planner | Phase 2.5 |
| `## 태스크` 그룹 이동 (`### 대기` → `### 진행 중` → `### 완료`) | orchestrator | Phase 3+4 |
| `## 향후 과제` | 누구나 추가 가능 | 아무 때나 |

**요구사항 섹션은 없다.** 요구사항은 `## 배경`에 한두 문장으로, 나머지는 태스크가 표현한다.

## 수정 규칙

1. **자기 섹션만 수정한다.** 다른 agent의 섹션은 건드리지 않는다.

2. **체크박스:**
   - `- [ ]` 대기 / `- [→]` 진행 중 / `- [x]` 완료
   - `[x]` 체크는 orchestrator만 찍는다 (verdict=PASS 이후).

3. **태스크 상태 전이 = 그룹 이동:**
   - 디스패치 시점에 `### 대기` → `### 진행 중` 이동 + `[ ]` → `[→]`
   - verdict=PASS 시 `### 진행 중` → `### 완료` 이동 + `[→]` → `[x]` + worklog 4섹션 추가
   - verdict=RALPH 시 그대로 `### 진행 중` 유지 (재시도)

4. **AC 형식:** `- [ ] ACn: 검증 항목 (v: agent-name)`
   - `(verify: plugin:agent-name)` 대신 `(v: agent-name)` 짧은 형태 사용. plugin prefix는 `lstack:write-plan-md` skill 상단 요약에 한 번 선언하거나 그냥 agent 이름만.

5. **태스크 형식:** `- [ ] Tn: action (exec: agent-name)`
   - action은 **명사구 한 줄**. "OOO 구현", "XXX 교체" 수준.
   - 구현 힌트가 필요하면 태스크 바로 아래 **1-3줄** (`수정: path:line — 이유` / `신규: path — 목적`). 그 이상이면 설계 결정으로 승격하거나 스코프 재검토.

6. **경로 prefix:** 모든 태스크·AC가 같은 디렉토리 아래라면 `# <goal>` 직후에 **코드 루트**를 한 번 선언하고 이후 경로는 상대.

7. **추가만, 삭제 금지.** 불필요한 항목은 ~~취소선~~. 단, 태스크 **그룹 간 이동**(대기↔진행중↔완료)은 허용 — 상태를 가시화하는 메커니즘이기 때문.

8. **설계는 결정/리스크만.** "현재 상태 이렇고, 이 파일이 있고…" 식의 사실 기술은 태스크 본문에. "현재 상태"를 길게 적어야 한다면 sibling 파일(`analysis.md`)로 분리.

## 안티패턴

- ❌ `## 요구사항` 섹션 추가 (태스크와 1:1 중복 발생)
- ❌ 같은 AC를 `## 요구사항`과 `## 태스크` 양쪽에 적기
- ❌ `## 설계`에 태스크별 `### 개입 지점` 서브섹션 (→ 태스크 본문으로)
- ❌ 태스크에 5줄 이상의 `> 구현 포인트` prose (→ 설계 결정으로 승격 or 스코프 축소)
- ❌ 긴 path prefix 반복 (→ 코드 루트 선언)
- ❌ 전부 `[ ]`라 진행 상태가 안 보이는 상태 (→ 그룹 이동)
- ❌ 완료 worklog `### 의사결정` 에 `## 설계 › ### 결정` 을 복붙
- ❌ 할 말 없는데 `### 의사결정` / `### 남은 리스크` 섹션만 비어있게 남기기 (→ 섹션 자체 생략)
- ❌ 대기 태스크 본문에 이미 적은 파일 리스트를 완료 worklog 에 또 적기
