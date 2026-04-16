---
name: lstack
description: |
  This skill should be used when the user says "/lstack", "lstack", "/start", "start",
  "시작", "프로젝트 시작", "이거 만들어", "이거 고쳐", "이어서", "이어서 해", "계속", "resume",
  or gives a task that requires planning, scoping, and multi-step execution.
  Auto-detects whether to start fresh or resume an in-progress plan.md, then dispatches
  the appropriate phase agent. Replaces the old `start` skill.
---

# lstack — Resume-Aware Workflow Entry

얇은 진입점. 사용자 요청을 orchestrator (PM agent) 에게 위임한다.
orchestrator 가 Phase 0-6 전체를 관장 — 상태 감지, 인터뷰, 설계, 실행, spec 업데이트, compound.

**설계 원칙:** `docs/spec/PRINCIPLE.md` 참조.
**워크플로우 상세:** `agents/orchestrator.md` 참조.
**plan.md 경로:** `docs/worklogs/YYYY-MM-DD-<goal>/plan.md`

## Workflow

```
Agent({
  subagent_type: "lstack:orchestrator",
  name: "orchestrator",
  run_in_background: true,
  prompt: <포함>
    - 사용자의 원래 요청 ($ARGUMENTS)
    - "docs/spec/PRINCIPLE.md, docs/spec/ARCHITECTURE.md 를 읽고 Phase 0 부터 시작."
    - plan.md 경로 (알고 있으면)
})
```

orchestrator 완료 후 결과를 사용자에게 전달.
