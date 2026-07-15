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

## 정리 (확인 종료 시 반드시)

기동한 서버 · CDP 세션은 확인이 끝나면 반드시 닫는다 — 좀비 프로세스 · dangling 세션이 다음 작업의 포트/브라우저를 물고 있으면 안 된다.

- **dev 서버**: 기동 시 쓴 포트를 죽인다. `lsof -ti tcp:<port> | xargs -r kill`. 백그라운드 잡으로 띄웠으면 해당 잡도 종료.
- **CDP 세션**: 연 탭/브라우저를 닫는다. chrome-devtools-mcp 로 띄웠으면 그 세션을, 별도 Chrome 을 CDP 로 띄웠으면 그 프로세스를 종료.
- 종료 후 남은 프로세스가 없는지 한 번 확인하고 보고한다.

## 규칙

- 검증은 여기서 끝난다 — `close` 단계에서 다시 검증하지 않는다.
