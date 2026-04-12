# Agents

lstack 플러그인에 정의된 에이전트 목록.

## 내부 Agent

### harness-sage
- **경로**: `agents/harness-sage.md`
- **역할**: Plugin improvement expert. `/compound`에서 worktree 격리 후 코드 구현 + issue/PR 생성.
- **호출**: compound 스킬이 dispatch

### architect
- **경로**: `agents/architect.md`
- **역할**: Design phase (2.1-2.3). 수정 범위 파악 + 구현 시뮬레이션 + 디자인 패턴 결정. READ-ONLY.
- **호출**: PM이 dispatch
- **입력**: goal + requirements
- **출력**: JSON (scope, design_decisions, risks)

### test-planner
- **경로**: `agents/test-planner.md`
- **역할**: Design phase (2.4). 최소 테스트 시나리오 설계. 테스트 코드는 작성하지 않음.
- **호출**: PM이 dispatch
- **입력**: goal + requirements + architect 결과
- **출력**: JSON (test_scenarios, coverage_gaps)

### planner
- **경로**: `agents/planner.md`
- **역할**: Design phase (2.5). tasks.json 작성.
- **호출**: PM이 dispatch
- **입력**: goal + requirements + architect 결과 + test-planner 결과 + agent pool 목록
- **출력**: tasks.json 파일

### orchestrator
- **경로**: `agents/orchestrator.md`
- **역할**: Execution phase (3+4). tasks.json을 읽고 task별 agent dispatch + AC별 검증 + ralph-loop.
- **호출**: PM이 dispatch
- **입력**: tasks.json 경로

## 외부 Agent Pool

### Execute Pool

| 유형 | Agent | 비고 |
|------|-------|------|
| 구현 | `oh-my-claudecode:executor` | 코드 변경, multi-file. sonnet |
| 테스트 작성 | `oh-my-claudecode:test-engineer` | TDD + unit/integration/e2e |
| 디버깅 | `oh-my-claudecode:debugger` | 근본 원인 분석 + 최소 수정 |
| 디버깅 (체계적) | `superpowers:systematic-debugging` | 4-phase 근본 원인 추적 |
| 리팩토링 | `oh-my-claudecode:code-simplifier` | 동작 유지 + 가독성 개선. opus |
| 탐색 | `oh-my-claudecode:explore` | 코드베이스 검색. haiku |
| fallback | `general-purpose` | 위 agent가 모두 안 맞을 때만 |

### Verify Pool

| 용도 | Agent | 비고 |
|------|-------|------|
| 테스트 검증 | `oh-my-claudecode:test-engineer` | 테스트 전략 + 커버리지 분석 |
| 코드 품질 | `superpowers:code-reviewer` | diff 기반, Critical/Important/Minor |
| 완료 검증 | `oh-my-claudecode:verifier` | AC 기반 증거 수집 |
| 비판적 리뷰 | `oh-my-claudecode:critic` | 다관점 결함/갭 탐지. opus |
| 보안 감사 | `oh-my-claudecode:security-reviewer` | OWASP Top 10. opus |
| 보안 감사 (심층) | `gstack:cso` | STRIDE, supply chain, CI/CD |

### Design Pool

| 용도 | Agent | 비고 |
|------|-------|------|
| 아키텍처 리뷰 | `oh-my-claudecode:architect` | file:line 증거. read-only, opus |
| 요구사항 분석 | `oh-my-claudecode:analyst` | AC 도출, 갭/엣지케이스. opus |
| 갭 분석 | `hoyeon:gap-analyzer` | 누락 요구사항, 오버엔지니어링 |
| 트레이드오프 | `hoyeon:tradeoff-analyzer` | 리스크 LOW/MED/HIGH |
| 외부 조사 | `hoyeon:external-researcher` | 라이브러리, API 웹 조사 |
| UX 리뷰 | `hoyeon:ux-reviewer` | UX 흐름 영향 분석 |
| 엔지니어링 리뷰 | `gstack:plan-eng-review` | 아키텍처, 테스트 커버리지 리뷰 |
