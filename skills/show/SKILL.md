---
name: show
description: |
  Use when the user says "/show", "보여줘", or when work is implemented and self-tested
  and behavior needs checking. Brings up the local dev server and opens Chrome via CDP
  so the user can test manually (①) or the agent runs e2e verification (②).
---

# show — 동작 확인 (로컬 서버 + Chrome CDP)

구현 · self-test(unit · integ) 뒤 실제 동작을 확인한다. 사용자에게 한 번 묻고 선택된 것을 실행한다:

- **① 내가 동작 테스트** — 로컬 dev 서버 기동 + Chrome 을 **CDP** 로 띄워 화면을 사용자에게 넘긴다.
- **② agent e2e 검증** — agent 가 **CDP** 로 실동작을 검증하고 근거(스샷 · 로그)를 첨부한다.
- **③ 건너뛰기** — 아무것도 하지 않는다.

## 실행

- 서버 기동 명령 · 포트 · 검증 진입 경로는 프로젝트 설정에서 읽는다
  (`skills/start/projects/<cwd-basename>.md`). 없으면 사용자에게 한 번 질문.
- Chrome 은 항상 **CDP** 로 띄운다 (chrome-devtools-mcp / chrome CDP).
- ② 는 사용자 입력 → 반영까지의 핵심 경로를 실제로 태워 확인하고, 결과를 근거와 함께 보고한다.

## 규칙

- 서버 · CDP 세션은 확인이 끝나면 정리한다 (좀비 프로세스 · dangling 세션 금지).
- 검증은 여기서 끝난다 — `close` 단계에서 다시 검증하지 않는다.
