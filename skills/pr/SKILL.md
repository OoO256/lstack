---
name: pr
description: |
  Use when the user says "/pr", "code 올려", "pr 올려", "pr 만들어", or "pr ready" —
  creating or readying a PR for the current work. A normal invocation creates a draft
  without reviewers. An explicit ready request creates or converts a ready PR and selects
  a reviewer from the user's recent PRs. Writes handoff.md before deriving the description.
---

# pr — code 올리기

내가 매번 치는 PR 명령을 대신 발동한다. 먼저 현재 브랜치의 PR 상태와 요청 모드를 구분한다:

```bash
gh pr view --json number,isDraft,url,author,assignees,reviewRequests
```

| 현재 상태 | 일반 PR 요청 | 명시적인 `pr ready` 요청 |
|---|---|---|
| PR 없음 | 리뷰어 없는 draft PR 생성 | ready PR 생성 후 reviewer 자동 지정 |
| draft PR | draft와 기존 설정 유지 | ready 전환 후 reviewer 자동 지정 |
| ready PR | ready와 기존 설정 유지 | ready 유지. reviewer가 없을 때만 자동 지정 |

`pr ready`가 아니면 draft/ready를 다시 묻지 않는다. `pr ready`는 ready 전환과 reviewer 지정을
허락한 요청이다. 기존 reviewer는 제거하거나 교체하지 않는다.

1. **본인 assign 필수** — PR author 를 assignee 로 등록.
2. **reviewer 없는 draft** — 일반 요청으로 새 PR을 만들 때 reviewer를 조회·질문·지정하지 않는다.
3. **ready reviewer 자동 선택** — `pr ready`이고 기존 reviewer가 없을 때만 아래 절차를 따른다.
4. **handoff.md 작성** — desc 를 쓰기 전에 먼저 한다. desc 의 소스이므로
   순서가 뒤바뀌면 안 된다. `handoff` 스킬 구조·글쓰기 원칙으로 쓴다 (이미 있으면 갱신).
5. **desc = 인간용** — 방침 중심, 독립 작업별 그룹화, as-is → to-be, 평이한 언어,
   비관여자도 이해 가능, 남은 한계 명시.
   handoff.md 4섹션(배경 · 해결 방법 · 결과 · 한계와 후속)을 소스로 재사용한다.
6. **UI 변경이면 as-is/to-be 미디어 첨부** — [PR 미디어 첨부](./media-attachments.md) 절차로
   단순한 화면 변화는 JPG, 상호작용·애니메이션 변화는 짧은 MP4 또는 GIF 로 보여 준다.
   GitHub 첨부 저장소에 올리고 본문에 URL 만 남긴다. 미디어 파일은 레포에 커밋하지 않는다.

## ready reviewer 선택

현재 PR을 제외한 최근 10개 PR에서 실제 review와 review request를 함께 확인한다:

```bash
gh pr list --author @me --state all --limit 11 \
  --json number,createdAt,reviewRequests,reviews
```

- 한 PR에서 같은 사람은 한 번만 센다. 본인과 자동화 계정은 제외한다.
- 가장 많은 PR에 등장한 한 명을 고른다. 같으면 더 최근 PR에 등장한 사람을 고른다.
- 유효한 후보가 없으면 ready PR 생성·전환 전에 멈추고, 근거가 없어 선택하지 못했다고 보고한다.
- 지정 후 선택한 reviewer, 최근 10개 중 등장한 PR 수, 가장 최근 PR을 보고하고 수정할지 묻는다.
- ready 전환과 reviewer 지정 중 일부만 성공하면 실제 PR 상태를 다시 확인해 부분 성공을 그대로 보고한다.

## 테스트 변경 스캔 (change-detector 회피)

diff 가 테스트를 건드리면 push 전에 change-detector 테스트를 훑어 사용자에게 플래그한다.
[change-detector 테스트 스캔](./change-detector-tests.md) 의 grep 힌트로 후보를 좁히고 litmus 로 판정한다.
건너뛰면 깨져도 버그가 아닌 테스트가 PR 에 그대로 실려 리뷰어가 매번 수동으로 지적하게 된다.

- 후보를 근거와 함께 채팅에 제시하고 제거·수정 여부를 **묻는다**. 임의 삭제 금지.
- 최종 판정은 맥락 판단이다 — 애매하면 KEEP.

## 합의한 구조와 결과 확인

push 전에 전체 branch diff 를 구조 관점으로 훑는다:

- 새 코드가 합의한 분류·책임·이름과 대응하는가 (개념마다 별도 파일을 요구하지 않는다)
- 기존 파일에 덧붙여 응집도가 깨지거나 모듈 경계가 흐려진 곳은 없는가
- 필요한 선행 리팩토링을 미룬 흔적(어색한 우회 · 중복)은 없는가

findings 는 채팅에 인라인으로 보고하고, 수정 후 올릴지 그대로 올릴지 **묻는다**. 임의 수정 금지.
발견 없음이면 한 줄로 넘어간다.

이 확인은 독립 리뷰가 아니다. lint·독립 리뷰는 사용자 요청 시 실행하고 미실행 사항은 명시한다.
구현 중 교정이 있었다면 `compound`의 기록 절차로 근거·범위·미해결 지점을 handoff에 남긴다.
기록은 규칙 변경 승인이 아니며, 하니스 개선 구현까지 PR 게시의 필수 단계로 만들지 않는다.
사용자는 푸시된 코드로 확인한다. 승인된 수정 단위는 관련 검증 후 커밋·푸시하고 대표 코드 링크를
전달한다. 실제 코드 이해 확인은 `align`이 담당하며, PR 게시나 검사 통과로 대신하지 않는다.
기존 PR의 설정과 이미 받은 커밋·푸시 권한은 유지한다. 강제 푸시·머지는 별도 허락이 필요하다.

## 생성과 ready 전환

push 전에 최신 base 로 리베이스한다 — PR 이 뒤처진 base 를 향하지 않도록 (`/rebase` 와 동일):

```bash
git fetch origin
git rebase "origin/<base_branch>"   # 충돌 시 멈추고 사용자에게 보고, 임의 해결 금지
git push -u origin <branch>

# 일반 PR 요청: reviewer 없는 draft
gh pr create --draft --assignee @me \
  --title "<goal 한 줄>" --body-file <desc> [--attach <media> ...]

# PR 없음 + pr ready: 선택을 마친 뒤 ready PR 생성
gh pr create --assignee @me --reviewer <선택> \
  --title "<goal 한 줄>" --body-file <desc> [--attach <media> ...]

# draft PR + pr ready: ready 전환 후 reviewer 요청
gh pr ready <number>
gh api --method POST "repos/{owner}/{repo}/pulls/<number>/requested_reviewers" \
  -f "reviewers[]=<login>"
```

- `base_branch` 는 `skills/start/projects/<cwd-basename>.md` frontmatter 에서 읽는다. 없으면 `main`.
- 사용자가 stacked PR을 요청했다면 합의한 선행 브랜치를 base로 지정한다. 각 PR은 바로 앞
  브랜치 대비 변경만 포함하고, 선행 PR 머지 후 base·diff를 확인한다. 임의 강제 푸시는 하지 않는다.
- 새 ready PR의 assignee · reviewer는 `create` 플래그로 한 번에 넣는다. 기존 PR의 reviewer는
  `gh api`의 requested reviewers endpoint로 추가한다.
- 생성·전환 후 PR URL과 draft/ready 상태를 다시 확인해 보고한다.

## 규칙

- 일반 PR 요청은 draft, `pr ready` 요청은 ready다. 사전에 되묻지 않는다.
- reviewer 선택은 최근 PR 근거로 실행한 뒤 보고하고, 수정이 필요한지 묻는다.
- desc 에 "먼저 X 하고 그다음 Y" 식 작업 순서 나열 금지 — 방침 · 데이터 흐름 중심.
