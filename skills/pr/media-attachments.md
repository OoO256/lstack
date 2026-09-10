# PR 미디어 첨부 (as-is / to-be)

`/pr` 이 UI 변경을 설명하는 미디어를 PR 본문에 넣을 때 쓰는 절차다. 미디어는 GitHub
`user-attachments` 에 업로드하고 레포에는 커밋하지 않는다.

## 무엇을 첨부할지

항상 as-is 와 to-be 를 같은 화면 크기·시작 상태·조작 순서로 비교한다.

- 레이아웃·문구·색·정적인 상태 변화처럼 한 장으로 이해되면 **JPG 2장**을 쓴다.
- 클릭·전환·애니메이션·재생처럼 시간 흐름이 핵심이면 **짧은 MP4 또는 GIF 2개**를 쓴다.
- 영상은 H.264 MP4 를 우선한다. GIF 는 아주 짧고 소리 없는 반복 동작이 영상보다 빨리
  이해될 때만 쓴다.
- 새 화면이라 대응하는 as-is 가 없으면 같은 진입점의 기존 화면을 보여 주고, 본문에
  `as-is: 해당 기능 없음`이라고 명시한다.

리뷰에 필요한 영역만 담는다. 정적 이미지는 JPG 품질 70 안팎·가로 1440px 이하로 줄이고,
동작은 720p 이하의 짧은 구간으로 만든다. PNG 는 작은 글자나 투명도 때문에 JPG 로 판독하기
어려울 때만 쓴다. MP4 는 H.264·무음으로 만들고 GIF 는 5초 안팎의 짧은 반복에만 쓴다. 압축 뒤
직접 열어 글자와 동작을 알아볼 수 있는지 확인하며, 이미지는 1MB 이하·동작은 10MB 이하를
목표로 한다.

## 캡처와 보관

1. as-is 는 이미 남긴 캡처를 재사용한다. 없으면 base revision 의 임시 worktree에서 실행해
   캡처한다. 현재 작업공간을 stash·checkout 해서 되돌리지 않는다.
2. 캡처 도구와 `/pr`이 같은 위치를 찾도록 현재 worktree의 `.lstack/pr-media/`에 저장한다.
   `.lstack/pr-media/`가 이미 ignore 되었는지 `git check-ignore`로 확인하고, 아니면
   `.git/info/exclude`에만 추가한다. `.gitignore` 변경을 PR에 섞지 않는다.
3. 정적 변화는 `.lstack/pr-media/as-is.jpg`와 `to-be.jpg`, 동작 변화는 같은 확장자의
   `as-is`/`to-be` 쌍으로 이름을 맞춘다. 여러 변화가 있으면 의미가 드러나는 하위 디렉터리마다
   필요한 최소 한 쌍만 둔다.
4. PNG 원본이나 긴 녹화본을 압축했다면 판독 확인 후 제거한다. `git status --short`에 미디어가
   나타나지 않는지 확인한다.

## GitHub CLI 로 업로드

`gh 2.99.0` 이상과 대상 레포의 write 권한이 필요하다. `gh version`과 `gh auth status`를 먼저
확인한다. 버전이 낮거나 권한이 없으면 필요한 조치를 정확히 보고하고 첨부를 생략하지 않는다.

`.lstack/pr-media/` 아래에서 as-is/to-be 쌍을 찾는다. 본문에서 로컬 파일을 원하는 위치에
참조하고 같은 파일을 `--attach` 로 전달한다. `gh`가 로컬 참조를 업로드 URL 로 치환한다.

정적 이미지는 표로 비교한다:

```markdown
| as-is | to-be |
|---|---|
| ![변경 전](<local-as-is.jpg>) | ![변경 후](<local-to-be.jpg>) |
```

영상이나 GIF 는 각각 별도 문단에 둔다. 영상 플레이어로 보이려면 로컬 참조만 있는 문단이어야 한다.

```markdown
### as-is

![](<local-as-is.mp4>)

### to-be

![](<local-to-be.mp4>)
```

PR 생성 시 모든 파일을 한 명령에 넣는다:

```bash
gh pr create --title "<title>" --body-file <desc> \
  --attach <local-as-is> \
  --attach <local-to-be>
```

기존 PR 은 `gh pr edit <number-or-url> --body-file <desc> --attach ...`로 갱신한다.

## 검증과 실패 처리

생성·수정 후 `gh pr view <number-or-url> --json body --jq .body`로 다음을 확인한다:

- 본문의 로컬 경로가 모두 사라졌다.
- 기대한 수만큼 `https://github.com/user-attachments/assets/` URL 이 들어갔다.
- 이미지 또는 영상이 의도한 as-is/to-be 위치에 있다.

일부 업로드가 실패해도 PR 은 생성되고 명령만 실패할 수 있다. `gh pr create`를 바로 재실행하지
말고 출력된 URL 또는 현재 브랜치의 PR 을 조회한다. 생성된 PR 이 있으면 누락 파일만 본문에 다시
참조해 `gh pr edit --attach`로 보완한다.

검증이 끝나면 로컬 임시 미디어를 삭제한다.
