# PR 생성과 ready 전환을 분리한다

## 배경

기존 `pr` 스킬은 새 PR을 만들 때마다 draft/ready와 reviewer를 먼저 물었다. 저장소의
“PR은 reviewer 없이 만든다”는 규칙과 충돌했고, 이미 존재하는 draft PR을 `pr ready`로
전환하는 경로도 없었다.

일반 PR 요청은 검토 전 공유를 위한 draft 생성이고, `pr ready`는 검토 요청을 시작하는
별도 의도다. 사용자는 PR이 없는 상태에서 `pr ready`를 호출해도 ready PR을 바로 만들도록 확정했다.

## 해결 방법

`skills/pr/SKILL.md`가 현재 PR 상태와 요청 모드를 먼저 구분한다.

- 일반 PR 요청은 PR이 없을 때 assignee만 지정한 draft를 만든다.
- `pr ready`는 PR이 없으면 ready PR을 만들고, draft가 있으면 ready로 전환한다.
- ready reviewer는 현재 PR을 제외한 최근 10개 PR의 review와 review request에서 가장 자주
  등장한 한 명을 고른다. 동률이면 더 최근 PR을 우선한다.
- 기존 reviewer는 유지한다. 후보가 없으면 근거 없이 지정하지 않고 ready 변경 전에 멈춘다.
- 지정 후 선택 근거와 실제 PR 상태를 보고하고, reviewer를 수정할지 묻는다.

생성과 전환을 같은 명령으로 억지로 통합하지 않았다. 새 ready PR은 `gh pr create`에서 reviewer를
함께 지정하고, 기존 draft는 `gh pr ready` 후 requested reviewers API로 지정한다. 일부만 성공하면
실제 상태를 다시 확인해 부분 성공을 숨기지 않는다.

## 결과

- `pr` 스킬의 기존 사전 질문을 제거하고, PR 유무·draft/ready·명시적 ready 요청에 따른 동작을 정의했다.
- `CLAUDE.md`의 저장소 규칙을 같은 생성·ready 경계로 맞췄다.
- 버전을 4.0.1로 올리고 변경 내용을 기록했다.
- `git diff --check`, JSON 버전 확인, Ruby YAML 파서로 frontmatter 구조 확인을 통과했다.

## 한계와 후속

`skill-creator`의 `quick_validate.py`는 실행 환경에 PyYAML이 없어 `ModuleNotFoundError: yaml`로
실행되지 않았다. 별도 의존성을 설치하지 않고 YAML 파싱과 필수 필드는 Ruby로 확인했다.
실제 GitHub PR 생성·전환은 외부 상태를 바꾸므로 이 문서 변경 검증에서는 실행하지 않았다.
