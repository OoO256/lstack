# 영상 퀄리티 휴리스틱 직접 구현

**코드 루트**: `packages/sandbox/video-editor-plugin/`

## 배경

현재 AI 생성 영상이 "배경 이미지 + Remotion 텍스트 오버레이" 패턴으로 수렴 — 누가 봐도 AI, wow 없음. 별도 인프라 없이 **코드/스키마/프롬프트/카탈로그에 휴리스틱을 직접 박아** 이를 해소한다. 검증은 사람이 눈으로.

## AS-IS → TO-BE

| 축 | AS-IS | TO-BE |
|---|---|---|
| 배경 씬 | 단색 gradient + 텍스트 오버레이로 폴백 | 배경 이미지 필수, 폴백은 Director 에스컬레이션 |
| 카메라 | 정적 (모션 전무) | 모든 씬에 zoom/pan/parallax/Ken Burns 중 1개 |
| 텍스트 | 일괄 opacity fade-in | 글자별 stagger / 강조어 bounce / 색상 분리 |
| 오디오 | 무음 | BGM 1트랙 + 전환 SFX |
| 서사 | Hook 선택 사항 | Hook(0-3초) 필수 + 3-Act 명시 |
| 레퍼런스 | 첨부 URL 만 전달 | Director 시각 분석 → moodboard 등록 |

## Non-goals
- 실험 자동화 인프라 (`wow-tests/*`, GH Actions)
- AI judge 자동 평가
- 새 서브에이전트 신설

## 설계

### 결정
- **"매번 보게"를 3층 구조로 분리** — (1) hard rule은 agent `.md` inline (system prompt), (2) 상세 카탈로그는 skill `rules/` + `<Skill_Reference>`에 **필수 참조**로 명시, (3) 서사 가이드는 `plan/SKILL.md`의 "항상 참조" 목록.
  FF: 응집도↑ (같은 성격 = 같은 디렉토리). 복잡성 신호: 없음.
- **폴백은 금지가 아닌 "Director 에스컬레이션"** — 에셋 생성 실패 시 단색 placeholder로 자동 대체하는 경로를 끊고, asset-prompter가 Director에게 의사결정 요청.
  FF: 예측가능성↑ (에셋 없이 완성 영상이 나오지 않음을 보장). 대안: hard error (기각 — 유연성 부족).
- **BGM 1영상 1트랙** — volume callback으로 구간별 볼륨만 조절. 씬별 트랙은 순서 변경 시 재믹싱 부담.
  FF: 결합도↓ (씬 순서 ↔ BGM 독립).
- **카메라 워크는 animations.md에 합치지 않음** — `animations.md` = 기본 기법, `camera-motion.md` = 연출 패턴으로 관심사 분리.
  FF: 응집도↑, 가독성↑.

### 리스크
- **룰 과다로 다양성 사망** — 금지 룰이 쌓이면 획일적 결과. 완화: 금지 룰을 3개로 한정(단색 폴백/정적 화면/fade-in), 나머지는 권장 + 예시 카탈로그.
- **카탈로그 참조 누락** — `<Skill_Reference>` 등록만으로는 에이전트가 스킵 가능. 완화: agent inline 룰에 "구현 전 반드시 Skill 도구로 참조" 명시.
- **BGM/SFX 볼륨 밸런싱** — BGM이 나레이션 덮거나 SFX가 산만. 완화: 카탈로그에 구체 값 명시(BGM 나레이션 중 0.1-0.15, 무나레이션 0.25-0.3, SFX 0.4-0.6).

## 태스크

### T1: 서사 구조 + 훅 패턴 (exec: executor)
신규: `skills/plan/references/narrative-structure.md` — 3-Act + Hook 유형 + Act 전환 시그널, 500단어 이내
수정: `skills/plan/rules/planning-guide.md:69` — Hook(0-3초) 필수 + 3-act 명시 룰
수정: `skills/plan/SKILL.md:31` — narrative-structure.md를 "항상 참조"로
수정: `agents/qa-plan.md:34` — Hook 체크 항목 추가

- [ ] AC1: narrative-structure.md 존재 + 3-Act + Hook 유형 + Act 전환 포함, 500단어 이내 (v: code-reviewer)
- [ ] AC2: planning-guide.md에 Hook 필수 + 3-act 룰이 있다 (v: verifier)
- [ ] AC3: qa-plan.md 평가 기준에 Hook(0-3s) 체크 있음 (v: verifier)

### T2: 레퍼런스 주입 회로 (exec: executor)
수정: `../CLAUDE.md:126` — 첨부 파일 시각 분석 + moodboard 등록 프로세스 (Director는 Opus, 멀티모달)
수정: `agents/asset-prompter.md:62` — `<Prompt_Engineering>`에 moodboard 활용 룰
수정: `skills/plan/rules/interview-guide.md:28` — 레퍼런스 분석 프로세스

- [ ] AC4: CLAUDE.md에 시각 분석 + moodboard 등록 프로세스 있음 (v: verifier)
- [ ] AC5: asset-prompter.md에 moodboard 활용 룰 있음 (v: verifier)
- [ ] AC6: interview-guide.md에 레퍼런스 분석 프로세스 있음 (v: verifier)

### T3: dev/asset-prompter 폴백 차단 (exec: executor) — 완료 `a1b2c3d`
수정: `agents/dev.md:30` — 단색 placeholder 폴백 제거, `<Visual_Impact_Rules>` 신규
수정: `agents/asset-prompter.md:36` — 폴백을 Director 에스컬레이션으로

단색 폴백 제거 + Director 에스컬레이션 경로 교체. dev.md에 Visual_Impact_Rules 섹션 추가.

**의사결정**: hard error 대신 에스컬레이션 선택 — asset-prompter가 재시도 1회 후 Director에게 올림.
**남은 리스크**: asset-prompter 타임아웃 시 에스컬레이션 무한 루프 가능 — 재시도 횟수 제한 필요.

- [x] AC7: dev.md `<Scope>`에서 placeholder 폴백 제거 + 단색 금지 룰 있음 (v: verifier)
- [x] AC8: dev.md에 `<Visual_Impact_Rules>` 섹션 있음 (v: verifier)
- [x] AC9: asset-prompter.md 폴백이 재시도 + 에스컬레이션으로 바뀜 (v: code-reviewer)

### T4: 카메라 워크 카탈로그 (exec: executor) — 진행중
신규: `skills/remotion-best-practices/rules/camera-motion.md` — Zoom/Pan/Parallax/Ken Burns 4패턴 + 코드 스니펫
신규: `skills/remotion-best-practices/rules/assets/camera-ken-burns.tsx`
수정: `agents/dev.md` — `<Motion_Rules>` 신규, `<Skill_Reference>`에 camera-motion 추가
수정: `skills/remotion-best-practices/SKILL.md` — Camera Motion 항목

- [ ] AC10: camera-motion.md에 4가지 패턴 + 코드 스니펫 (v: code-reviewer)
- [ ] AC11: camera-ken-burns.tsx가 `bun run typecheck` 통과 (v: test-engineer)
- [ ] AC12: dev.md에 `<Motion_Rules>` + `<Skill_Reference>` 업데이트 (v: verifier)

### T5: 카이네틱 타이포그래피 (exec: executor)
신규: `skills/remotion-best-practices/rules/kinetic-typography.md` — stagger / emphasis bounce / 색상 분리 / 카운트업 (최소 4패턴)
신규: `rules/assets/kinetic-stagger-entrance.tsx`, `rules/assets/kinetic-emphasis-bounce.tsx`
수정: `agents/dev.md` — `<Typography_Rules>` 신규 (핵심 텍스트 fade-in 금지)
수정: `skills/remotion-best-practices/rules/text-animations.md` — 참조 링크

- [ ] AC13: kinetic-typography.md에 4패턴 포함 (v: code-reviewer)
- [ ] AC14: kinetic-*.tsx 2개가 typecheck 통과 (v: test-engineer)
- [ ] AC15: dev.md에 `<Typography_Rules>` + 참조 등록 (v: verifier)

### T6: BGM/SFX 자동 추가 (exec: executor)
신규: `skills/remotion-best-practices/rules/bgm-sfx-catalog.md` — 분위기별 Gemini 프롬프트 / SFX 타이밍 / Remotion 코드 패턴 + 볼륨 값
수정: `agents/dev.md` — `<Audio_Rules>` 신규 (BGM 최상위 Audio, 전환 SFX)
수정: `agents/asset-prompter.md` — BGM 생성 제안 룰, 프롬프트 가이드
수정: `skills/plan/rules/planning-guide.md` — "BGM 1영상 1트랙" 룰

- [ ] AC16: bgm-sfx-catalog.md에 프롬프트 템플릿 + SFX 타이밍 + 코드 패턴 (v: code-reviewer)
- [ ] AC17: dev.md `<Audio_Rules>` + 볼륨 값 명시 (v: verifier)
- [ ] AC18: asset-prompter.md에 BGM 가이드 추가 (v: verifier)

## 향후 과제
- 별도 크리에이티브 디렉터 에이전트 신설 (룰화로 해소 안 될 시 후속 worklog)
- 스토리보드 스키마 확장 (`visual_impact`, `motion_intent`, `reference_style`) — 공통 패턴 보이면 승격
- 씬 라이브러리 본체 — 현 워크트리에 코드 없음. 별도 worklog에서 위치 확인 후
- 실험 자동화 인프라 (GH Actions + E2B)
- 자동 평가 시스템 (AI judge)
- T3 코드 리뷰: asset-prompter 재시도 횟수 제한 로직 추가 필요 (Important)
