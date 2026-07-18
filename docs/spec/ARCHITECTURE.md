# Architecture

lstack 플러그인의 구조와 워크플로우. 고정 오케스트레이터·검증 게이트는 없다 —
양끝을 감싸는 능동 스킬 + 개발 가이드(`PRINCIPLE.md`)로 얇게 구성한다.
상세 규칙은 각 스킬/가이드 파일이 SSOT.

## Plugin Structure

```
lstack/
├── .claude-plugin/plugin.json   # 플러그인 매니페스트
├── agents/                       # 에이전트 정의 (.md) — harness-sage 만
├── skills/                       # 스킬 정의 (디렉토리/SKILL.md)
├── hooks/hooks.json              # 비어 있음 (v2 hookless)
├── docs/
│   ├── spec/                     # 분야별 SSOT (PRINCIPLE, ARCHITECTURE)
│   └── worklogs/                 # 프로젝트 단위 작업 디렉토리 (plan.md)
└── tests/
```

## 라이프사이클

```
/start → 구현 → self-test(unit·integ) → /show(①/②) → /pr → /compound(자동·제안만) → /close
                                                              /review = 남의 PR 볼 때 아무 때나
```

스킬은 "반복 명령 묶음"이고, 중간 구현은 메인 컨텍스트가 `PRINCIPLE.md` 가이드를 지닌 채
판단으로 진행한다. arc 는 기본 흐름일 뿐 강제 게이트가 아니다.

## Skills

| 스킬 | 경로 | 역할 |
|------|------|------|
| `start` | `skills/start/SKILL.md` | 진입점. origin/main → worktree 새 브랜치 + 의도 인터뷰 + 가이드 로드 + plan.md 착수. resume 자동 판별. 프로젝트 기본값 `skills/start/projects/<basename>.md` |
| `show` | `skills/show/SKILL.md` | 동작 확인. ① 사용자 수동 테스트 / ② agent e2e 검증, Chrome CDP |
| `pr` | `skills/pr/SKILL.md` | code 올리기. draft/ready 질문·본인 assign·이전 PR 기반 reviewer 질문·인간용 desc·테스트 변경 change-detector 스캔 |
| `review` | `skills/review/SKILL.md` | 남의 PR 이해 돕기. 구조/데이터흐름 + 사용자입력→클라→백→영속화 리뷰 순서 |
| `compound` | `skills/compound/SKILL.md` | 세션 지시 회고 → 하니스 자동화 제안 (제안만, close 직전 자동) |
| `close` | `skills/close/SKILL.md` | 완료 확인 + plan.md 인간용 정리 + worktree 닫기 |
| `write-plan-md` | `skills/write-plan-md/SKILL.md` | plan.md 구조 SSOT (최소 구조) |
| `call-as-codex` | `skills/call-as-codex/SKILL.md` | on-demand Codex 위임 mechanics 래퍼 (bare) |

## Agents

| Agent | 경로 | 역할 |
|-------|------|------|
| harness-sage | `agents/harness-sage.md` | compound 가 수락된 개선을 구현할 때만. worktree 격리 후 issue/PR 생성 |

**레이어 분리:** `call-as-codex`(skill) = Codex 호출 mechanics (프롬프트 내용 모름) ·
`agents/<name>.md` = 프롬프트 파일 (호출 방식 모름). 호출자가 둘을 조합.

## Hooks

없음. v2 는 hookless (`hooks/hooks.json` = `{}`).

## 서브에이전트 위임 (의도 2)

독립 서브태스크는 더 싼 모델의 서브에이전트로 병렬 위임한다 (예: `general-purpose`(sonnet),
`Explore`). 프로젝트에 설치된 전문 에이전트가 있으면 활용. 태스크당 1커밋 권장.

## plan.md

단일 SOT 이자 인간용 문서. 구조·글쓰기 규칙은 `skills/write-plan-md/` SSOT.
최소 구조: `## 배경`(as-is → to-be) · `## 계획`(독립 작업 T1..Tn) · `## 향후 과제`(선택).
상태머신·phase 매핑·AC 게이트 없음. 완료 마커 `✅`.

## 스킬/프롬프트 작성 원칙 (하니스 자체를 수정할 때)

- **책임은 구체적으로, 워크플로우는 얇게.** 절차에 마이크로매니징(임계값·도구·안티패턴 나열)을
  넣지 않는다 — 방향은 책임으로 정하고 판단은 모델에 맡긴다.
- **Fallback 없음.** mechanics 레이어(`call-as-codex`)가 실패하면 fallback 하지 않고
  호출자(메인 컨텍스트)에게 에러를 그대로 보고한다.
