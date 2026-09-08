# PR 스크린샷 첨부 (as-is / to-be)

`/pr` 가 UI/UX 변경의 캡처를 PR 본문에 넣을 때 쓰는 절차다. **이미지를 레포에 커밋하지 않는다** —
GitHub 의 첨부 CDN(`user-attachments`)에 올리고 본문에는 URL 만 쓴다. private 레포에서도
팀원에게 보인다.

## 왜 브라우저를 거치나

업로드 API 가 없다. PAT 로 `POST https://github.com/upload/policies/assets` 를 찔러도 JSON 이
아니라 에러 HTML 이 온다. 첨부는 **로그인 세션이 있는 브라우저**에서만 된다 (2026-09-08 실측).

릴리스 에셋(`gh release upload`)·gist 는 대안이 아니다 — private 레포에서 마크다운 이미지가
깨지거나 바이너리를 못 담는다.

## 준비: 로그인 1회

Playwright MCP 는 **영구 프로필**(`~/Library/Caches/ms-playwright-mcp/mcp-chrome-<해시>`)을 쓴다.
한 번 로그인하면 이후 세션에도 남는다 — 실측한 프로필은 3개월 전 만들어진 것이 계속 재사용되고
있었다. 해시가 무엇으로 갈리는지는 확인하지 않았다(프로필이 여러 개 있다). 다른 해시가 잡히면
거기서 한 번 더 로그인하면 된다.

- 미로그인 판별: private 레포 PR 페이지가 404 로 뜬다. **첨부 전에 매번 확인한다.**
- `https://github.com/login` 을 띄우고 **사용자에게 넘긴다**. 에이전트는 자격증명을 입력하지 않는다.

## 절차

1. **캡처 2장.** as-is 는 base 상태, to-be 는 현재 브랜치. Playwright 는 허용 루트(작업 레포) 밖
   경로에 저장하지 못하므로 **gitignore 된 레포 내 경로**(예: `.playwright-mcp/`)에 쓴다.
   as-is 는 변경 전에 찍어야 한다 — `/show` 단계에서 미리 남겨 두면 재촬영이 필요 없다.
2. **아무 PR/이슈 페이지를 연다.** 첨부만 할 것이므로 어느 페이지든 무방하다.
3. 코멘트 박스의 **"Add files"** 버튼을 클릭한다 → 파일 선택 창이 열린다 →
   `browser_file_upload` 로 파일 경로를 넘긴다 (여러 장 한 번에 가능).
4. 업로드가 끝나면 코멘트 textarea(`#new_comment_field`) 의 값에 이런 마크업이 삽입된다:
   `<img width="656" height="735" alt="upload-probe" src="https://github.com/user-attachments/assets/<uuid>" />`
   이 값을 읽어 `src` URL 을 뽑는다.
5. **textarea 를 비우고 코멘트는 제출하지 않는다.** 업로드는 제출과 무관하게 이미 끝나 있다.
6. URL 을 PR 본문에 넣어 `gh pr create --body-file` 로 올린다 (기존 PR 이면 `gh api -X PATCH`).

`user-attachments` URL 은 요청할 때마다 서명된 S3 주소로 리다이렉트된다. URL 자체는 안 만료된다.

## 본문 형식

```markdown
| as-is | to-be |
|---|---|
| <img src="https://github.com/user-attachments/assets/…" width="420"> | <img src="https://github.com/user-attachments/assets/…" width="420"> |
```

## 실패 시

브라우저가 없거나 로그인이 안 돼 있으면 **캡처 파일 경로 2개를 사용자에게 주고** PR 본문에
드래그해 달라고 한다. 조용히 건너뛰지 않는다 — 캡처가 빠진 UI PR 은 리뷰어가 diff 로 화면을
상상해야 한다.
