# 변경 수집 사용법

`reviewer`·`pr`에서 변경 목록을 읽거나 수집 오류를 확인할 때 사용한다.
[collect-review-changes.mjs](../scripts/collect-review-changes.mjs)는 git 변경과 새 이름 후보를
출력하는 읽기 전용 도구다. 구조의 좋고 나쁨이나 허용할 이름 수를 판정하지 않는다.

## 실행과 결과

대상 worktree에서 base를 인자로 준다. 생략하면 `origin/main`이다.

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/reviewer/scripts/collect-review-changes.mjs" "<base>"
```

stdout에는 변경 경로·종류, 새 파일·디렉토리, 새 export 이름과 사용처 후보 표가 나온다.
정상 수집은 exit 0, git 오류·충돌·검사 범위의 부분 staged 상태는 stderr와 exit 1이다.
파일·인덱스·커밋을 수정하지 않는다. 수집 성공은 리뷰 통과가 아니다.

## 무엇을 읽는가

merge-base부터 현재 worktree까지 커밋·staged·unstaged·untracked·삭제·개명을 함께 읽는다.
기본 CLI 범위는 소스 코드, `agents/*.md`, `skills/**/SKILL.md`, `hooks/*.json`이다.
목록 밖 참고 문서·설정도 동작을 바꾸면 리뷰어에게 별도로 전달한다.

git 경로는 NUL 구분으로 읽어 공백·탭·개행·콜론을 보존한다. 표에서는 제어 문자를
이스케이프한다. 아직 index에 없는 이동은 내용이 같은 삭제·추가를 순수 개명으로 연결한다.
기존 export의 내용 변경이나 순수 이동을 새 이름으로 다시 세지 않는다.

같은 검사 경로에 staged와 unstaged/untracked 변경이 함께 있으면 실패한다.
staged 삭제 뒤 같은 경로 복원은 `.gitignore`에 숨은 경우도 포함한다. 검사할 버전이
엇갈리지 않도록 사용자가 의도한 인덱스·작업 파일 상태를 먼저 정리한다. 인덱스를 자동 수정하지 않는다.
서로 다른 경로의 staged·unstaged 변경과 설정된 범위 밖의 부분 staged 파일은 허용한다.

## 후보 표와 snapshot의 차이

export·사용처 검색은 정규식 후보 탐색이다. 재export·구조분해·별칭·동적 호출을 놓칠 수
있고 문자열·주석도 셀 수 있다. 리뷰어가 실제 파일·소비자·공개 계약을 읽어 판단한다.

hook는 같은 모듈의 `readSnapshot`을 호출한다. 이때는 CLI 기본 범위 대신
`.lstack.json`의 `include`와 설정 파일 자체를 읽는다. base·설정·선택된 변경의 경로·
내용·파일 모드로 snapshot을 계산해, lint·리뷰가 현재 변경에 대한 것인지 비교한다.
후보 표의 숫자는 snapshot의 통과 조건이 아니다.
