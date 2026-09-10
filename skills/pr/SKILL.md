---
name: pr
description: |
  Use when the user says "/pr", "푸시", "code 올려", "pr 올려", "pr 만들어", or an approved
  change is ready to share. Commit and push scoped changes with actual verification status.
  Preserve an existing PR's settings; when creating one, ask unresolved draft/ready and reviewer
  choices, assign the user, and derive its description from handoff.md.
---

# pr — code 올리기

사용자는 푸시된 코드로 검토한다. 수정 후에는 아래 절차로 기존 PR을 갱신하거나 새로 만든다.

## 수정 후 푸시

- 사용자의 "앞으로 수정 후 항상 푸시" 지시에 따라, 승인된 수정 단위를 검증한 뒤 해당
  작업 브랜치에 커밋·푸시한다. 매번 별도 푸시 요청이나 커밋 허락을 다시 기다리지 않는다.
  사용자가 특정 작업의 커밋·푸시를 보류하라고 하면 그 지시를 우선한다.
- 정확한 원격·브랜치와 변경 파일을 확인하고 승인된 작업만 커밋한다. 기존 PR이 있으면
  같은 브랜치에 푸시하며 draft/ready·assignee·reviewer 선택을 유지한다.
- 원격 변경과 충돌하거나 푸시에 실패하면 원인을 보고한다. 강제 푸시·머지·기본 브랜치에
  직접 푸시는 별도 허락 없이 하지 않는다. 푸시 성공과 원격 반영을 확인한 뒤 PR·커밋 링크를 전달한다.

새 PR을 만들 때는 아래를 지킨다. 기존 PR과 이미 확정한 선택은 재질문하지 않는다:

1. **draft or ready?** — 꼭 질문한다 (기본값 가정 금지).
2. **본인 assign 필수** — PR author 를 assignee 로 등록.
3. **reviewer 질문** — 내 최근 PR 들의 reviewer 를 확인해 후보를 제시하고 누구를 넣을지 묻는다:
   ```bash
   gh pr list --author @me --state all --limit 10 --json reviewRequests,reviews
   ```
4. **handoff.md 작성** — desc 를 쓰기 전에 먼저 한다. desc 의 소스이므로
   순서가 뒤바뀌면 안 된다. `handoff` 스킬 구조·글쓰기 원칙으로 쓴다 (이미 있으면 갱신).
5. **desc = 인간용** — 방침 중심, 독립 작업별 그룹화, as-is → to-be, 평이한 언어,
   비관여자도 이해 가능, 남은 한계 명시.
   handoff.md 4섹션(배경 · 해결 방법 · 결과 · 한계와 후속)을 소스로 재사용한다.
6. **UI 변경이면 as-is/to-be 캡처 첨부** — [PR 스크린샷 첨부](./screenshots.md) 절차로
   GitHub 첨부 CDN 에 올리고 본문에 URL 만 넣는다. 이미지를 레포에 커밋하지 않는다.

## 테스트 변경 스캔 (change-detector 회피)

diff 가 테스트를 건드리면 push 전에 change-detector 테스트를 훑어 사용자에게 플래그한다.
[change-detector 테스트 스캔](./change-detector-tests.md) 의 grep 힌트로 후보를 좁히고 litmus 로 판정한다.
건너뛰면 깨져도 버그가 아닌 테스트가 PR 에 그대로 실려 리뷰어가 매번 수동으로 지적하게 된다.

- 후보를 근거와 함께 채팅에 제시하고 제거·수정 여부를 **묻는다**. 임의 삭제 금지.
- 최종 판정은 맥락 판단이다 — 애매하면 KEEP.

## PR 게시 전 확인

`align`에서 합의한 동작·수정 범위와 현재 변경을 비교한다. 아직 합의하지 않은 변경이
있으면 해당 부분을 먼저 맞춘다. 사전 합의가 없었다면 지금의 설명을 과거 합의로 기록하지 않는다.
실제로 수행한 동작 확인·검사·리뷰 결과와 미확인 사항을 구분한다.
여러 피드백을 반영한 작업이면 요청 항목마다 실제 변경과 확인 근거를 대조한다.
일부만 끝났으면 완료한 항목과 남긴 항목·이유를 나눠 보고한다. 남은 요구를 임의로
후속 작업에 넣고 전체 반영이 끝난 것처럼 보고하지 않는다.

lint와 `/reviewer`는 사용자가 직접 실행하거나 요청할 때 수행한다. PR 게시의 자동 단계로
실행하거나 별도의 완료 기록을 요구하지 않는다. 실행하지 않았다면 PR에 미실행으로 적는다.
기존 프로젝트의 필수 검사·CI·브랜치 보호 규칙은 그대로 존중하며 실패를 통과로 바꾸지 않는다.

## 생성

push 전에 최신 base 로 리베이스한다 — PR 이 뒤처진 base 를 향하지 않도록 (`/rebase` 와 동일):

```bash
git fetch origin
git rebase "origin/<base_branch>"   # 충돌 시 멈추고 사용자에게 보고, 임의 해결 금지
git push -u origin <branch>
gh pr create --assignee @me --reviewer <선택> \
  --title "<goal 한 줄>" --body-file <desc>   # draft 면 --draft 추가
```

- `base_branch` 는 `skills/start/projects/<cwd-basename>.md` frontmatter 에서 읽는다. 없으면 `main`.
- `gh pr edit` deprecation 우회: assignee · reviewer 는 `create` 플래그로 **한 번에** 넣는다.
  사후 수정이 필요하면 `gh api` 로 patch.
- 생성 후 PR URL 을 보고한다.
- 리베이스·충돌 해결로 코드가 바뀌면 push 전에 현재 변경을 다시 검사한다.
- 수정 후 커밋·푸시 권한은 위의 사용자 지시에 따른다. `align` 합의나 이 권한이
  수정 범위 확대·임의의 외부 대상 게시·강제 푸시·머지 허락을 뜻하지는 않는다.

## 규칙

- 새 PR의 미확정 draft/ready · reviewer는 **묻고** 정한다. 기존 선택은 임의로 바꾸지 않는다.
- desc 에 "먼저 X 하고 그다음 Y" 식 작업 순서 나열 금지 — 방침 · 데이터 흐름 중심.
