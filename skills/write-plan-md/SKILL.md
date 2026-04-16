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
- 단일 SOT: **태스크**가 모든 행위 정보를 가진다 (요구사항 · AC · 구현 힌트 · 결과).
- 설계: **왜 그렇게 결정했는가 + 리스크** 만. 현재 상태 분석/파일 리스트는 태스크 본문으로.
- 상태: 태스크 헤더 suffix (`— 진행중` / `— 완료 \`sha\``) — 마커 없음 = 대기.
- 결과 중심: 완료 시 결과 요약 1-2줄 + 선택적 의사결정/남은 리스크. 프로세스(검증 방법, 코드 리뷰 로그)는 기록하지 않는다.
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
```

```markdown
## AS-IS → TO-BE

| 축 | AS-IS | TO-BE |
|---|---|---|
| 구조 | 플랫한 단일 파일 | 모듈 분리 (tools/, utils/) |
| 태스크 | 체크박스 + 그룹 이동 | ### 헤더 + 인라인 상태 |
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

### Codex 검토 (선택)
Codex critique 결과를 기록하는 블록. Phase 2.2 에서 principal-engineer (Codex) 가 작성.
`### 결정` 에 대한 비판적 검토 — 동의/도전/추가 리스크/순서 제안.

### 최종 확정 (User 승인 YYYY-MM-DD) (선택)
사용자가 설계를 승인했음을 기록하는 블록. Phase 2.3 완료 시 작성.
이 블록이 없으면 Phase 2.3 (승인 대기) 로 판정. 있으면 planner (Phase 2.4) 진입 가능.

> "현재 상태", "수정 범위 전체 리스트", "개입 지점 상세"는 여기 **쓰지 않는다**.
> 그건 각 태스크 본문에 1-2줄씩 들어간다.

## 태스크

### T1: 간단한 action 문장 (exec: executor)
수정: `agents/dev.md:30` — 폴백 룰 교체
신규: `rules/foo.md` — 패턴 카탈로그

- [ ] AC1: 구체적 검증 항목 (v: verifier)
- [ ] AC2: 또 다른 검증 (v: test-engineer)

### T2: 또 다른 action (exec: executor)
신규: `src/auth/login.ts` — JWT 발급 핸들러

- [ ] AC3: … (v: code-reviewer)

### T3: 완료된 태스크 (exec: executor) — 완료 `abc1234`
수정: `src/auth/middleware.ts:42` — credential 검증 훅 등록

bcrypt + jsonwebtoken으로 구현. auth 에러 별도 처리 추가.

**의사결정**: passport.js 대신 직접 미들웨어 — 기존 패턴 일관성.
**남은 리스크**: JWT 만료 시 refresh token 미구현.

- [x] AC4: POST /auth/login 유효 credential → 200 + JWT (v: test-engineer)
- [x] AC5: 잘못된 credential → 401 (v: test-engineer)

### T4: 진행중인 태스크 (exec: executor) — 진행중
수정: `src/config.ts:15` — 환경변수 로딩

- [ ] AC6: … (v: verifier)

## 향후 과제
- 스코프 밖이지만 기록할 가치가 있는 것
- 코드 리뷰에서 나온 Critical/Important findings
- 구현 중 발견된 남은 리스크
```

## 섹션별 소유자

| 섹션 | 누가 작성 | 언제 |
|------|----------|------|
| `# <goal>` + `## 배경` | PM (lstack skill) | Phase 1 후 |
| `## AS-IS → TO-BE` (선택) | architect / PM | Phase 2.2-2.3 또는 Phase 1 |
| `## 설계` › `### 결정`, `### 리스크` | call-as-codex(lstack:principal-engineer) | Phase 2.1-2.2 |
| `## 설계` › `### Codex 검토` | call-as-codex(lstack:principal-engineer) Codex critique | Phase 2.2 |
| `## 설계` › `### 최종 확정` | orchestrator/PM (사용자 승인 기록, ARCHITECTURE.md approval contract 참조) | Phase 2.3 |
| `## 태스크` — `### Tn` skeleton | planner | Phase 2.4 |
| `## 태스크` — AC 추가 | test-designer | Phase 2.5 |
| `## 태스크` — 상태 전이 + 결과 기록 | orchestrator | Phase 3+4 |
| `## 향후 과제` | 누구나 추가 가능 | 아무 때나 |

**요구사항 섹션은 없다.** 요구사항은 `## 배경`에 한두 문장으로, 나머지는 태스크가 표현한다.

## 수정 규칙

1. **자기 섹션만 수정한다.** 다른 agent의 섹션은 건드리지 않는다.

2. **태스크 = `###` 헤더.** 상태는 헤더 suffix:
   - `### Tn: action (exec: agent)` — 대기 (기본, 마커 없음)
   - `### Tn: action (exec: agent) — 진행중` — dispatched
   - `### Tn: action (exec: agent) — 완료 \`sha\`` — done
   - 상태 전이 = suffix 변경. 태스크를 물리적으로 이동하지 않는다.

3. **AC 위치:** 각 태스크 블록의 **맨 끝**에 체크리스트.
   - `- [ ] ACn: 검증 항목 (v: agent-name)` — 대기
   - `- [x] ACn: 검증 항목 (v: agent-name)` — 통과
   - AC는 구현 힌트 (수정/신규) 아래, 결과 요약 아래에 위치.

4. **태스크 형식:** `### Tn: action (exec: agent-name)`
   - action은 **명사구 한 줄**. "OOO 구현", "XXX 교체" 수준.
   - 구현 힌트가 필요하면 태스크 바로 아래 **1-3줄** (`수정: path:line — 이유` / `신규: path — 목적`). 그 이상이면 설계 결정으로 승격하거나 스코프 재검토.

5. **완료 시 기록 (결과 중심):**
   - 헤더에 `— 완료 \`sha\`` 추가
   - 결과 요약 1-2줄 (뭘 바꿨는지). 계획대로면 생략 가능.
   - `**의사결정**:` — 구현 중 새로 내린 결정. `## 설계 › ### 결정`과 중복 금지. 없으면 생략.
   - `**남은 리스크**:` — 배포 후 모니터링/엣지 케이스. 없으면 생략.
   - AC 체크 (`[ ]` → `[x]`)
   - 프로세스 기록(검증 방법, 코드 리뷰 로그, 복잡성 정리)은 **적지 않는다**.

6. **경로 prefix:** 모든 태스크·AC가 같은 디렉토리 아래라면 `# <goal>` 직후에 **코드 루트**를 한 번 선언하고 이후 경로는 상대.

7. **추가만, 삭제 금지.** 불필요한 항목은 ~~취소선~~.

8. **설계는 결정/리스크만.** "현재 상태 이렇고, 이 파일이 있고…" 식의 사실 기술은 태스크 본문에. "현재 상태"를 길게 적어야 한다면 sibling 파일(`analysis.md`)로 분리.

## 안티패턴

- ❌ `## 요구사항` 섹션 추가 (태스크와 1:1 중복 발생)
- ❌ 같은 AC를 `## 요구사항`과 `## 태스크` 양쪽에 적기
- ❌ `## 설계`에 태스크별 `### 개입 지점` 서브섹션 (→ 태스크 본문으로)
- ❌ 태스크에 5줄 이상의 `> 구현 포인트` prose (→ 설계 결정으로 승격 or 스코프 축소)
- ❌ 긴 path prefix 반복 (→ 코드 루트 선언)
- ❌ 완료 worklog에 `### 작업 요약` / `### 검증 방법` / `### 코드 리뷰` 서브헤더 (→ 인라인 결과 요약)
- ❌ 완료 태스크에 대기 때 적은 파일 리스트를 또 적기
- ❌ `## 설계 › ### 결정` 내용을 `**의사결정**`에 복붙
- ❌ 할 말 없는데 `**의사결정**` / `**남은 리스크**` 라벨만 남기기 (→ 생략)
- ❌ `### 완료` / `### 진행 중` / `### 대기` 그룹 섹션 (→ 헤더 suffix로 상태 표시)
