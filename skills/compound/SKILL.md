---
name: compound
description: |
  Use when the user says "/compound", or automatically just before /close.
  Retrospects on the instructions the user gave this session, identifies what
  could have been automated into the harness (skill/hook/guide), and proposes it.
  Proposal only — does not implement automatically.
---

# compound — 하니스 자동화 회고 (제안만)

이번 세션에서 사용자가 반복적으로 / 수동으로 준 지시를 돌아보고,
lstack 하니스로 자동화할 수 있었던 것을 찾아 **제안**한다. 자동으로 구현하지 않는다.
`/close` 직전에 자동 발동한다.

## 1. 회고
이번 대화에서 사용자가 준 지시를 훑어 아래를 찾는다:
- 반복해서 교정한 것 (매번 같은 요청)
- 수동으로 돌린 명령 (스킬이 대신 발동할 수 있던 것)
- 빠져서 사용자가 채운 단계

## 2. 제안
찾은 것마다 한 줄 제안 (채팅 인라인):
```
지시: <반복된 지시 요약>
자동화: <skill | hook | guide 수정> — <무엇을 어떻게>
```
자동화할 반복 패턴이 없으면 "없음" 이라고 짧게 보고하고 넘어간다.

## 3. (선택) 사용자가 수락하면
사용자가 특정 제안을 구현하라고 하면 **그때** harness-sage 를 격리 worktree 로 dispatch 한다.
`skills/compound/references.md` 의 레퍼런스 플러그인에서 패턴을 참고할 수 있다.

```
Agent({ subagent_type: "lstack:harness-sage", isolation: "worktree",
        prompt: <수락된 제안 + 현재 lstack 구조> })
```

수락 전엔 구현하지 않는다.
