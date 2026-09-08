# 반복 코드 피드백을 lint와 독립 구조 리뷰로 옮긴다

## 배경

이전 구현은 새 이름·사용처 후보를 세고 독립 structure-reviewer를 추가했지만,
사용자 피드백을 '추상화 증가 요청 0건'으로 일반화했다. 2026-09-08 원문 대조에서
사용자가 요청한 `BaseAgent` 공통 생명주기와 선택한 `EventValidationPolicy`가 확인되어
그 주장을 철회한다. 필요한 공통 책임과 불필요한 계층을 구분하는 것이 실제 요구다.

기계 검증은 동작·문법을 확인하지만 이름·소유·책임의 의미를 판정하지 않는다.
독립 검토가 임의 실행에 머물고 변경 목록이 커밋 전 새 파일을 놓치면 같은 피드백이 반복된다.

## 해결 방법

기존 start·code-review·pr·structure-reviewer·hooks를 확장한다. 새 검사 프레임워크는 없다.
start는 기존 개념·동작·원인 → 변경안 순으로 설명하고 책임·공개 계약·모듈 경계가 바뀔 때
구현 전에 fresh reviewer가 검토한다. 종류·소유·호출 관계를 구분하고 모든 개념을 개별
파일로 쪼개지 않는다. 새 이름·사용처 수·단어 자체는 실패 기준이 아니다.

변경 수집은 concept-budget.mjs, 실제 lint 실행과 reviewer 완료 증거 연결은
hooks/scripts/verify-completion.mjs가 소유한다. .lstack.json이 프로젝트 범위·lint argv·
review report/enforce를 명시한다. 실제 SubagentStart/Stop의 세션·agent·tree·snapshot이
맞아야 현재 diff 검토를 인정하며, 메인의 통과 선언이나 설계 검토는 대신할 수 없다.

사용자가 확정한 구현 범위는 검사 시스템뿐이다. 기존 서비스 코드·제품 테스트는 수정하지
않는다. 검사 경로는 수정 권한이 아니며, 기존 lint 부채와 report 지적은 관찰·보고한다.
현재 변경에서 새로 생기거나 악화한 문제를 승인된 범위에서 해결하고 범위 밖 문제는 보고한다.

## 결과

- 기존 reviewer와 start/code-review/pr/PRINCIPLE에서 새 이름 0·Policy/Manager 금지·
  추상화 증가 금지·모든 파일 1:1·루틴 작업마다 승인 요구를 제거하고 실제 책임·소비자
  근거를 요구한다. 테스트를 포함한 캐스팅 금지와 이름/동작 구분도 같은 기준으로 적었다.
- git 변경 목록은 NUL 경로를 사용하고 committed·staged·unstaged·untracked·삭제·개명을
  포함한다. 기존 export 줄 변경을 신설로 세지 않으며 git 오류는 실패한다. 코드뿐 아니라
  에이전트·스킬·hook의 동작 변경도 후보로 읽는다.
- 검사 범위의 같은 경로에 staged와 unstaged/untracked 변경이 함께 있으면 snapshot과
  리뷰 재사용 전에 실패한다. staged 삭제 후 같은 경로 복원은 .gitignore에 숨은 경우도
  포함한다. 인덱스는 수정하지 않으며, 서로 다른 경로의 staged/unstaged는 허용한다.
  scripts/**와 scripts/**/*.ts의 개행 파일·디렉토리도 검사에 포함한다.
- 완료 hook는 lint와 실제 fresh 구조 diff 검토를 확인한다. report의 의미적 지적도 메인에게
  전달하고 enforce는 승인된 범위의 확정 blocker를 수정하게 한다. 같은 snapshot은 재사용하고 수정 이후
  다시 검토한다. /start의 새 tree는 명시적 register로 연결한다.
- 2026-09-08 로컬 `npm test`: 실제 Node CLI·임시 git 행동 테스트 41개 전체 통과(61.9초).
  `git diff --check` 통과. 변경 경로와 .mts/.cts 기본 수집·export·소비자,
  lint 실패/실행 오류, 리뷰 누락/미완료/다른 세션·agent·tree, 검토 중/후 수정,
  질문·compact/resume·작업 tree 전환·반복 중단·점진 opt-in·부분 staged와 개행 glob을 검증했다.
- 독립 보안 리뷰에서 Stop 이전의 새 사용자 입력이 미검증 변경을 숨기는 경로를 확인해
  수정했다. 새 질문의 읽기전용 Stop은 막지 않되 미해결 상태를 보존·표시하며, 구현 완료와
  PR은 check를 통과해야 한다. 이 회귀도 전체 테스트에 포함한다.
- 실제 Claude CLI 통합 E2E에서 Stop 리뷰 누락 차단과 fresh `structure-reviewer`의
  SubagentStart/Stop 완료·advisory 보고·Stop 통과(enforce)를 확인했다.
- 완료 hook·reviewer·start/pr/code-review는 점진 적용을 기존 서비스 코드 대청소로
  바꾸지 않도록 지시한다. 명령·적용 범위의 오류는 검사 시스템에서 고치고,
  검사 대상이 넓다는 이유로 기존 서비스 코드·제품 테스트에 수정 권한을 부여하지 않는다.
- PR의 draft/ready·reviewer 질문과 rebase 충돌 보고 정책은 HEAD 원문을 유지한다.
  검사 연결·리베이스 후 재검사·커밋 허락 명시만 추가한다.

## 한계와 후속

export와 사용처 검색은 문법 근사다. 재export·구조분해·별칭·동적 호출은 놓칠 수 있고
문자열·주석이 후보에 포함될 수 있다. 숫자를 결론으로 쓰지 않고 reviewer가 실제 코드를 읽는다.

로컬 이벤트 fixture만으로 Claude의 실제 실행·모델 판단 품질을 입증하지 않는다. 실제 Claude
--plugin-dir 통합 동작은 E2E로 확인했지만, 구조 판단 품질은 실제 PR에서 관찰해야 한다.
로컬 상태 기록은 우발적인 자기 승인과 오래된
리뷰 재사용을 방지하며, 파일을 의도적으로 위조하는 공격자를 막는 보안 경계는 아니다.
이번 후속 작업은 기존 5개 커밋의 작업 파일을 복구 경로에 보존했다. 복구된 검사 코드로
`npm test` 41/41을 재실행 통과했고, 실제 Claude CLI 통합 E2E도 통과했다. 두 저장소
커밋과 본인 확인용 draft PR 게시를 사용자가 명시 승인했으며 리뷰어는 지정하지 않는다.
ready 전환·merge·설치본 변경은 범위 밖이다. 최신 `main`(`69c2523`) 위로 리베이스했고,
기존 스크린샷 안내와 이번 검사 시스템 안내를 모두 보존했다. 검사 코드와 테스트는 그대로다.
