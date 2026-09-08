---
name: pr
description: |
  Use when the user says "/pr", "푸시", "code 올려", "pr 올려", "pr 만들어", or an approved
  change is verified and ready to share. Commit and push reviewed changes to the work branch.
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

## PR 게시 전 검사

`align`에서 합의한 동작·수정 범위와 현재 변경을 비교한다. 아직 합의하지 않은 변경이
있으면 해당 부분을 먼저 맞춘다. 사전 합의가 없었다면 지금의 설명을 과거 합의로 기록하지 않는다.
구현 후 코드·구조·보안 리뷰와 최종 코드 검증 결과를 확인한다.
여러 피드백을 반영한 작업이면 요청 항목마다 실제 변경과 확인 근거를 대조한다.
일부만 끝났으면 완료한 항목과 남긴 항목·이유를 나눠 보고한다. 남은 요구를 임의로
후속 작업에 넣고 전체 반영이 끝난 것처럼 보고하지 않는다.

push 전에 **기계가 판정하는 것부터** 돌린다. 눈으로 훑는 스캔은 "괜찮아 보인다" 로 끝나서
같은 지적이 리뷰에서 반복된다.

1. .lstack.json opt-in 프로젝트는 설정한 lint 명령과 실제 fresh 구조 diff 검토를 확인한다:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/check-lint-and-review.mjs" check
   ```

   검사 대상은 /start에서 register한 worktree다. LSTACK_SESSION_ID가 없으면 SessionStart
   연결부터 확인한다. 읽기전용 턴 skip과 Stop 반복 종료는 PR 통과 증거가 아니다.
   check가 실패하면 승인된 변경 범위에서 원인을 해결한다. 현재 변경의 리뷰가 없으면 fresh structure-reviewer를
   실행하고, 코드가 바뀌면 새 리뷰를 받는다. report의 의미적 지적은 사용자에게 보고하고
   enforce의 확정 blocker는 승인된 범위에서 수정한다. 실행 오류·리뷰 미완료는 두 모드 모두 차단한다.
   설정이 없는 프로젝트는 저장소의 필수 lint·검증 명령을 실행하고 결과를 보고한다.
   검사 범위는 수정 권한이 아니다. 기존 부채 보고를 신규 위반 차단과 구분하고, 검사 시스템
   도입만 승인됐다면 기존 서비스 코드·제품 테스트를 수정하지 않는다. 검사 명령·적용 범위의
   오류는 검사 시스템에서 고치고, 범위 밖 문제는 미해결로 보고한다.
   설정 작성은 [프로젝트 설정](../../hooks/project-config.md), 실행 결과와 오류 해석은
   [lint·리뷰 확인](../../hooks/lint-and-review.md)을 읽는다.
2. 변경 목록과 **새 이름 후보**를 확인한다:

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/skills/reviewer/scripts/collect-review-changes.mjs" "<base_branch>"
   ```

   표는 `/align`에서 합의한 책임·소유 관계와 비교할 후보 목록이다. 숫자 자체로 실패시키거나
   새 이름마다 사용자 승인을 요구하지 않는다. 삭제·개명·기존 선언 변경·untracked도 읽는다.
   예상과 다른 책임·공개 계약·모듈 경계는 독립 reviewer가 실제 소비자로 확인한다.
   사용자 목표나 합의 범위를 바꾸는 선택만 사용자에게 확인한다.

`/reviewer`가 세 reviewer를 fresh context로 실행한다. opt-in 프로젝트의 구조 diff 검토는
선택 사항이 아니다. 설계 검토는 현재 코드의 diff 검토를 대신하지 않는다.

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
