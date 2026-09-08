# 현재 변경의 lint·구조 리뷰 확인

검사 대상을 등록하거나 lint·리뷰 확인이 실패했을 때 읽는다.
[check-lint-and-review.mjs](scripts/check-lint-and-review.mjs)는 **프로젝트 lint 성공**과
**현재 변경에 대한 실제 structure-reviewer 완료**를 확인한다. 사용자 요구가 모두 구현됐는지,
코드·보안 리뷰의 품질, 사용자의 이해도나 작업 완료 자체를 판정하는 도구는 아니다.

## 왜 필요한가

프로젝트 lint는 문법 규칙을 이미 검사하므로 다시 구현하지 않는다. git 변경 수집도
[공유 수집기](../skills/reviewer/references/change-collection.md)를 사용한다.
이 hook가 더하는 것은 Claude의 실제 리뷰어 시작·종료와 검토 당시 변경을 연결하는 일이다.
그 연결이 없으면 메인의 통과 선언이나 수정 전 리뷰를 현재 코드의 검토로 잘못 사용할 수 있다.

설정은 [프로젝트 설정](project-config.md)이 소유한다. 새 lint 프레임워크·의존성은 추가하지 않고
Node.js·git·프로젝트 명령과 Claude Code의 이벤트를 연결한다.

## 호출 시점

[hooks.json](hooks.json)이 같은 스크립트에 이벤트 JSON을 stdin으로 전달한다.

| 이벤트 | 하는 일 |
|---|---|
| SessionStart | 세션 ID를 전달하고 최초 worktree 기준을 저장. compact/resume는 기존 기준 보존 |
| UserPromptSubmit | 이전 미검증 변경을 보존하고 이번 턴 시작 snapshot 기록 |
| SubagentStart | structure-reviewer의 세션·agent·worktree·시작 snapshot을 기록하고 결과 형식 전달 |
| SubagentStop | 실제 최종 응답과 종료 snapshot을 확인하고 유효한 구조 리뷰만 기록 |
| Stop | 변경 턴의 lint 실행과 현재 snapshot의 구조 리뷰 완료 확인 |

hook 출력은 Claude가 읽는 JSON이다. 실패하면 `decision: block`과 수정할 사유를 주고,
통과하면 `systemMessage`로 검사 결과를 알린다. report 지적도 한 번 멈춰 사용자에게 보고하게 한다.
동일 미해결 원인이 3회 반복되면 `continue: false`로 **실패를 명시하고 종료**한다. 통과 기록은 남기지 않는다.

## worktree 등록과 명시적 검사

`SessionStart`가 `CLAUDE_ENV_FILE`에 전달한 `LSTACK_SESSION_ID`를 사용한다.
`/start`는 구현 전에 실제 작업 경로를 등록하고, `/pr`는 게시 전에 `check`를 실행한다.

```bash
node "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/check-lint-and-review.mjs" register "<worktree 절대경로>"
node "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/check-lint-and-review.mjs" check
```

`register`는 검사 대상과 최초 기준을 저장하고 대상 경로를 출력한다. 같은 tree 재등록·
compact/resume는 기존 기준을 덮어쓰지 않는다. hook.cwd가 원래 저장소여도 등록한 tree를 검사한다.
여러 tree를 전환해도 각각의 기준과 리뷰 기록을 유지한다.

`check`는 결과 JSON을 출력하고 성공은 exit 0, 실패는 exit 1이다. 읽기 전용 턴 생략을
적용하지 않으며 Stop이 반복 종료됐어도 미해결이면 계속 실패한다. 코드·인덱스는 바꾸지 않지만
검사 기록을 갱신하고 프로젝트 lint 명령을 실행한다. lint 명령의 부작용은 프로젝트 설정에서 확인한다.

## 어떤 리뷰를 인정하는가

새 `lstack:structure-reviewer`의 실제 SubagentStart/Stop이 세션·agent_id·agent_type·
등록 tree와 일치하고, 시작 snapshot = 종료 snapshot = 현재 snapshot이어야 한다.
최종 응답에는 hook가 주입한 다음 한 줄을 포함한다:

```text
LSTACK_STRUCTURE_REVIEW {"mode":"diff","worktree":"/absolute/tree","snapshot":"<주입값>","status":"complete","findings":[]}
```

finding은 severity(blocker/advisory), location(path:line), consumer, problem, change를 가진다.
설계 검토는 `mode: design`, 미완료는 `status: error`다. 설계만 검토한 결과·다른 세션이나
tree·같은 agent 재사용·검토 중/후 수정은 현재 diff 검토로 인정하지 않는다.
메인이 쓴 통과 파일은 읽지 않는다. 실제 `last_assistant_message`·`agent_transcript_path`가
없는 실행 환경은 이 hook로 리뷰 완료를 입증할 수 없다.

## 문제가 생기면

| 증상 | 먼저 확인할 곳 |
|---|---|
| 다른 tree를 검사함 / 세션 ID 없음 | `register` 출력과 `LSTACK_SESSION_ID`, 스크립트의 worktree 등록 처리 |
| lint 실패·시간 초과 | `.lstack.json`의 argv를 대상 tree에서 실행한 종료 코드·stdout·stderr |
| 리뷰했는데 누락으로 판정 | 리뷰 시작·종료의 세션·agent·tree·snapshot, `recordReviewResult`의 무효 사유 |
| git·부분 staged 오류 | 변경 수집기의 stderr와 git 인덱스·작업 파일 상태 |
| 질문만 했는데 이전 실패가 보임 | 미검증 변경 보존 여부. 질문은 막지 않고, 구현 완료 전 `check`로 다시 확인 |

같은 snapshot의 성공한 lint·리뷰는 재사용한다. 사용자별 임시 디렉토리에 세션/tree 상태와
리뷰 이벤트 결과만 저장하며 소스 내용을 복제하지 않는다. `LSTACK_STATE_DIR`은 테스트 격리용이다.
기록이 사라지면 리뷰를 다시 요구한다. 이 기록은 우발적 자기 승인·오래된 리뷰 재사용을
막기 위한 것이며, 로컬 파일을 의도적으로 위조하는 공격자를 막는 보안 경계는 아니다.

## 회귀 검증

`npm test`는 [verification.test.mjs](../tests/verification.test.mjs)에서 실제 Node CLI와
임시 git 저장소로 lint 실패·리뷰 누락·변경 후 재검토·세션/tree 전환을 검증한다.
리뷰 결과와 hook 입력은 테스트용이며, 실제 Claude 실행이나 리뷰 판단 품질을 입증하지 않는다.
