---
name: review
description: |
  Use when the user says "/review", "이 PR 리뷰 도와줘", or gives someone else's PR
  (URL/number) to understand. Explains the PR conversationally so the user understands it,
  then proposes a review order following user input → client → backend → persistence.
---

# review — 남의 PR 이해 돕기

다른 사람의 PR 을 **내가 이해하도록** 대화로 돕는다. 승인 게이트가 아니다 —
이해와 리뷰 순서 안내가 목적. 모든 설명은 **채팅 안에서** 한다 (파일로 넘기지 않는다).

## 1. 전체 구조 as-is → to-be
이 PR 이 무엇을 바꾸는지 한눈에. 바뀌기 전 / 후 상태 대비.

## 2. 구조 그리기
- backend → **데이터 흐름**: 입력이 어떻게 저장(영속화)까지 흘러가는지.
- frontend → **컴포넌트 의존성 + 역할**: 각 컴포넌트가 무엇을 하고 무엇에 의존하는지.
- 다이어그램은 채팅 안 ASCII / mermaid 로 그린다.

## 3. 리뷰 순서 제시
사용자 선호 흐름 **사용자 입력 → 클라 → 백 → 영속화** 로,
입력이 최종 반영 · 영속화되는 경로를 따라 어떤 파일을 어떤 순서로 볼지 제시한다.

## 입력
PR URL / 번호. diff 는 `gh pr diff <n>`, 설명은 `gh pr view <n>` 로 읽는다.
