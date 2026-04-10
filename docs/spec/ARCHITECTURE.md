# Architecture

lstack 플러그인의 구조와 컴포넌트 간 관계.

## Plugin Structure

```
lstack/
├── .claude-plugin/plugin.json   # 플러그인 매니페스트
├── agents/                       # 에이전트 정의 (.md)
├── skills/                       # 스킬 정의 (디렉토리/SKILL.md)
├── commands/                     # 슬래시 커맨드 정의 (.md)
├── hooks/hooks.json              # 이벤트 훅 등록
├── docs/
│   ├── worklog/                  # 날짜별 작업 로그
│   ├── spec/                     # 분야별 SSOT 문서
│   └── plan/                     # 구현 계획
└── tests/                        # 테스트
```

## Compound Self-Improvement Loop

사용자가 작업 중 문제를 겪으면 `/compound`로 플러그인 자체를 개선하는 루프.

### Data Flow

```
User: "/compound"
    |
    v
Compound Skill (메인 컨텍스트)
    |  Phase 1: 대화에서 문제 패턴 요약
    |  Phase 2: gh api로 레퍼런스 플러그인 탐색
    |  Phase 3: harness-sage 에이전트 dispatch (worktree 격리)
    |  Phase 4: worklog 기록 + spec 업데이트
    |  Phase 5: 사용자에게 issue/PR 링크 보고
    |
    v
Harness-Sage (격리된 worktree)
    |  1. 브랜치 생성
    |  2. 코드 변경
    |  3. gh issue create
    |  4. gh pr create
    |  5. 결과 반환
```

### Components

| Component | Path | Role |
|-----------|------|------|
| compound skill | `skills/compound/SKILL.md` | 문제 분석 + 레퍼런스 탐색 + 에이전트 dispatch + 문서화 |
| harness-sage agent | `agents/harness-sage.md` | worktree에서 코드 구현 + issue/PR 생성 |
| reference registry | `skills/compound/references.md` | 레퍼런스 플러그인 GitHub URL 목록 |

### Design Decisions

- **Worktree 격리**: 에이전트가 사용자의 작업 브랜치에 영향을 주지 않음
- **GitHub URL 기반 레퍼런스**: git-tracked, portable. 로컬 클론 불필요
- **역할 분리**: 스킬(메인 컨텍스트)이 분석, 에이전트(worktree)가 구현
