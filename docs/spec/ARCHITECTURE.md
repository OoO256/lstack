# Architecture

lstack는 작업 시작·리뷰·PR 스킬, 독립 reviewer, 명시적으로 설정한 프로젝트의 완료 hook로
구성한다. 상세 판단 기준은 PRINCIPLE.md와 해당 reviewer가 소유한다.

## 구조와 흐름

```text
/start → 구현 → self-test → /show → /pr → /compound → /close
         ↓                      ↓
         Stop 검사              check CLI
         ├─ 프로젝트 lint 명령 실행
         └─ 실제 fresh 구조 diff 검토 확인
```

| 구성 | 위치 | 책임 |
|---|---|---|
| start | skills/start/SKILL.md | worktree 격리·등록, 기존 개념·동작·원인 → 변경안, 구조 영향 시 구현 전 검토 |
| code-review | skills/code-review/SKILL.md | code/security/structure reviewer를 fresh context로 병렬 실행 |
| structure-reviewer | agents/structure-reviewer.md | 책임·소유·공개 계약·이름·SSOT의 의미적 판단 |
| 변경 수집 | skills/code-review/concept-budget.mjs | git 변경·새 이름·사용처 후보 수집, 검사 snapshot 계산 |
| 완료 검사 | hooks/scripts/verify-completion.mjs | opt-in 읽기, lint 실행, 실제 reviewer 이벤트와 현재 변경 연결 |
| pr | skills/pr/SKILL.md | 현재 검사 확인·handoff·PR 작성. 기존 draft/ready·reviewer 질문과 충돌 보고 정책 유지 |
| show | skills/show/SKILL.md | UI 수동/e2e 동작 확인 |
| compound | skills/compound/SKILL.md | 사용자 피드백에서 자동화 제안. 수락된 개선만 harness-sage에 위임 |
| close | skills/close/SKILL.md | 완료 확인과 worktree 정리 |
| handoff | skills/handoff/SKILL.md | worklog 인계 문서 구조 |
| nobs | skills/nobs/SKILL.md | 사용자에게 짧고 평이하게 말하는 규칙 |
| explain | skills/explain/SKILL.md | 코드/PR 이해를 돕는 대화 |
| call-as-codex | skills/call-as-codex/SKILL.md | Codex 호출 mechanics. 실패를 그대로 전달 |

code-reviewer는 기능·로직·품질, security-reviewer는 보안을 읽기 전용으로 검토한다.
structure-reviewer의 설계 검토와 diff 검토는 서로 대체하지 않는다. 별개 객체의 종류·소유·
호출 관계를 구분한다. `BaseAgent`의 생명주기를 새 설정 객체와 상속 형제로 그리지 않는다.

## 변경 수집

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/code-review/concept-budget.mjs" "<base>"
```

merge-base에서 현재 worktree까지의 커밋·staged·unstaged·untracked를 함께 읽는다.
NUL 구분 git 경로를 사용하여 공백·탭·개행·콜론 경로를 보존한다. 삭제·개명·기존 선언 변경도
목록에 포함하고, 기존 export 줄 수정은 신설로 세지 않는다. index에 없는 순수 이동도
삭제/추가의 내용이 같은 경우 개명으로 연결한다. git 오류와 충돌은 실패로 반환한다.

검사 범위의 같은 경로에 staged와 unstaged/untracked 변경이 함께 있으면 부분 staged 상태로
실패한다. staged 내용을 작업 파일 복원으로 숨기거나 staged 삭제 후 같은 경로를 untracked로
복원한 경우도 포함한다(.gitignore에 숨은 복원 포함). 검사·snapshot·리뷰 재사용 전에 확인하며 인덱스를 자동 수정하지
않는다. 사용자가 의도한 staged/작업 파일 상태를 정리한 뒤 다시 검사한다. staged A와
unstaged B처럼 서로 다른 경로의 변경과 검사 범위 밖 부분 staged 파일은 허용한다.

기본 후보 범위는 소스 코드와 agents/*.md, skills/**/SKILL.md, hooks/*.json이다.
export 정규식과 사용처 검색은 후보 목록이다. 재export·구조분해·별칭·동적 호출을 놓칠 수
있고 문자열·주석을 셀 수 있으므로 숫자로 판정하지 않는다. 파일을 통째로 읽는 reviewer가
책임·공개 계약·소비자에 근거해 결론을 낸다.

## Hooks

| 이벤트 | 동작 |
|---|---|
| SessionStart | 세션 ID 전달, 처음 등록한 tree의 시작 상태 저장. compact/resume는 기존 기준 유지 |
| UserPromptSubmit | 이전 턴의 미검증 변경을 보존하고 이번 턴 시작 snapshot 기록. nobs-reminder도 실행 |
| SubagentStart | structure-reviewer의 session·agent_id·agent_type·tree·시작 snapshot 기록, 출력 계약 주입 |
| SubagentStop | 실제 최종 응답·종료 snapshot 확인. 완료한 동일 tree diff 검토만 증거로 저장 |
| Stop | 변경 턴의 lint 실제 실행과 현재 snapshot의 fresh diff 검토 확인, 실패 시 수정 지시 |

새 파일 여부로 막는 PreToolUse 설계 게이트는 없다. 공식 이벤트 계약은
[Claude Code hooks](https://code.claude.com/docs/en/hooks)를 따른다. Node.js와 git을 사용한다.

### 프로젝트 설정

프로젝트 root의 `.lstack.json`이 opt-in이다. 네 필드를 명시한다:

```json
{
  "base": "origin/main",
  "include": ["apps/**", "packages/**", "scripts/**", "agents/*.md", "skills/**/SKILL.md", "hooks/**"],
  "lint": ["bun", "run", "lint:new"],
  "review": "report"
}
```

include는 git 상대 경로 glob 배열이며 `*`(경로 한 부분), `**`(하위 경로), `?`를 지원한다.
개행이 포함된 파일·디렉토리 이름도 glob 검사에 포함한다.
brace/문자 집합 glob, 절대 경로, 상위 경로는 받지 않는다. `.lstack.json` 자체는 항상 검사
snapshot에 포함한다. 문법 코드 외 런타임 동작을 정하는 설정·프롬프트도 범위에 넣는다.

lint는 shell 문자열이 아닌 argv 배열로 실행한다. cwd는 등록한 worktree이고 LSTACK_BASE에
base를 전달한다. 프로젝트 명령은 종료 코드 0으로 성공을 알리고 위반·실행 오류는 nonzero로
끝내야 한다. stdout의 단어로 성공을 추정하지 않는다. timeout(120초), signal, 실행 파일 누락,
잘못된 설정/base, git 충돌은 실패다. lint 중 코드가 바뀌면 다시 검사한다.

review는 report 또는 enforce다. 두 모드 모두 실제 리뷰 누락·미완료·형식 오류를 차단한다.
report는 의미적 지적을 한 번 메인에게 돌려 사용자에게 보고하게 한다. enforce는 확정 blocker를
수정하고 새 reviewer로 재검토해야 한다. 신규 위반과 기존 위반의 점진 적용은 프로젝트 lint
명령이 소유한다. lstack는 프로젝트 규칙이나 baseline을 복제하지 않는다.
검사 범위가 서비스 코드를 포함해도 수정 권한까지 생기지 않는다. 기존 부채와 report 지적은
관찰·보고하고, 검사 시스템 도입만 승인된 작업에서는 기존 서비스 코드·제품 테스트를
수정하지 않는다. 명령·적용 범위의 오류는 검사 시스템에서 고치며, 범위 밖 문제는 미해결로 보고한다.

### 작업 tree 등록과 PR 검사

SessionStart는 `CLAUDE_ENV_FILE`에 LSTACK_SESSION_ID를 추가한다. /start는 worktree를
생성한 다음 **구현 전에** 다음 명령으로 검사 대상을 등록한다:

```bash
node "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/verify-completion.mjs" register "<worktree 절대경로>"
node "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/verify-completion.mjs" check
```

hook.cwd가 원래 저장소여도 등록한 tree를 검사한다. 같은 tree 재등록·compact·resume는 시작
snapshot을 덮어쓰지 않는다. 여러 tree를 전환해도 각각의 기준과 검토 기록은 유지한다.
check는 읽기전용 턴 생략을 적용하지 않고 현재 diff를 검사한다. 실패는 항상 exit 1이다.
Stop 반복 중단 이후에도 check가 실패하면 /pr를 진행하지 않는다.

### 리뷰 증거와 재사용

새 `lstack:structure-reviewer` Agent만 실행한다. SubagentStart가 기록한 session·agent_id·
agent_type·등록 tree와 SubagentStop이 일치해야 하며 시작 snapshot = 종료 snapshot = 현재
snapshot이어야 한다. 최종 응답은 hook가 주입한 다음 한 줄 형식을 포함한다:

```text
LSTACK_STRUCTURE_REVIEW {"mode":"diff","worktree":"/absolute/tree","snapshot":"<주입값>","status":"complete","findings":[]}
```

각 finding은 severity(blocker/advisory), location(path:line), consumer(실제 소비자), problem,
change를 가진다. 설계만 검토하면 mode는 design, 미완료는 status error다. 설계 결과·다른
session/agent/tree·검토 중 수정·검토 후 수정·같은 agent_id 재사용은 diff 완료가 아니다.
메인의 통과 파일이나 통과 선언을 읽지 않는다. 실제 SubagentStop의 last_assistant_message와
agent_transcript_path를 사용하는 만큼 이 필드가 없는 실행 환경은 완료를 입증할 수 없다.

질문·읽기전용 턴은 코드 snapshot 변화가 없으면 skip하며, 이전 미해결 상태는 보존한다.
Stop 이전에 새 사용자 입력이 들어와도 이전 snapshot과 현재 변경을 비교해 미검증 상태를
남긴다. 새 질문은 막지 않지만 미해결을 알리며, 구현 완료 전에는 check를 요구한다.
한 번 검증된 동일 snapshot의 lint와 review는 재사용한다. state는 사용자별 임시 디렉토리의
세션/tree 기록과 reviewer 이벤트 파일뿐이며 소스 내용을 복제하지 않는다. LSTACK_STATE_DIR로
테스트 상태를 격리할 수 있다. state가 사라지면 과거 리뷰 증거도 사라지므로 check는 다시
검토를 요구한다. 로컬 파일을 의도적으로 위조하는 공격자를 방어하는 보안 경계는 아니다.

stop_hook_active가 true여도 검증 없이 통과하지 않는다. 동일 미해결 원인이 3회 반복되면
continue:false와 미해결 사유를 사용자에게 보여주고 종료한다. accepted snapshot은 기록하지
않는다. 다음 사용자 턴에서 시도 횟수는 초기화되며, check는 미해결이면 계속 실패한다.

## handoff와 검증

worklog는 docs/worklogs/YYYY-MM-DD-작업/handoff.md 하나이며 구조는 handoff 스킬이 SSOT다.
배경·해결 방법·결과·한계와 후속을 최신 상태로 유지한다. 계획은 채팅에서 설명한다.

`npm test`는 실제 Node CLI와 임시 git 저장소를 사용한다. 변경 범위·오류·리뷰 증거·
compact/resume·/start tree 전환·반복 종료를 검증한다. 임시 fixture에만 커밋을 만들며
개발 저장소를 커밋하지 않는다. 실제 Claude 실행 검증은 별도로 해야 한다.
