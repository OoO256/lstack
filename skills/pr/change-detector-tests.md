# change-detector 테스트 스캔

`/pr` 가 diff 의 테스트 변경을 훑을 때 쓰는 판별 기준이다. 저작 시점 원칙(`PRINCIPLE.md` 의도 3)의 운영 버전.

## 판별 (litmus)

"이 테스트가 깨지면 버그인가? → No(리팩터·값 변경일 뿐)면 change-detector."

이 부류는 넓다 — 상수 재진술만이 아니다. 아래 4 범주가 모두 포함된다.

## 흐름

1. grep 으로 후보를 좁힌다 (아래 힌트). 판정이 아니라 후보 탐색용이다.
2. 각 후보에 litmus 를 적용한다.
3. change-detector 로 판정되면 채팅에 근거와 함께 플래그하고 제거·재작성 여부를 사용자에게 묻는다.

grep 히트는 후보일 뿐이다 — 최종 판정은 litmus 로 하는 맥락 판단이다.

### grep 후보 힌트

- `toEqual([` — 리스트·shape 를 통째로 미러
- `toHaveBeenCalledWith` · `invocationCallOrder` — mock 배선 단언
- `\.options)` — enum·config 재진술
- `typeof .*=== "function"` — 구조 존재 확인
- `DEFAULT` · 상수 리터럴에 대한 `.toBe(` — 기본값·상수 재진술

## 플래그 대상 (change-detector)

1. **상수·config·enum·default 재진술.** 함수가 상수를 반환하는데 그 상수를 그대로 다시 단언한다. `expect(foo()).toBe(1)`(foo 가 상수 1 반환), `schema.options).toEqual([...])`, `DEFAULT).toBe("x")`.
2. **mock 호출 단언.** 내부 collaborator 를 "불렀다 / 이 인자로 / 이 순서로" 확인한다 — 관찰 가능한 결과가 아니라 배선 방식이다. `toHaveBeenCalledWith(...)`, `invocationCallOrder`.
3. **내부 구조·shape·위임 미러.** 정확한 도구 리스트 `toEqual`, `typeof x === "function"`, 객체 key 목록처럼 내부 형태를 그대로 베낀다.
4. **동어반복 round-trip / pass-through.** 기대값을 테스트 대상과 같은 코드가 만들거나, 변환 없이 통과만 확인한다.

## 유지 (플래그 X — 오탐 주의)

- 독립적으로 도출한 기대값으로 관찰 가능한 행동·결과를 검증한다 — 파싱·변환·분기·fallback·에러 처리.
- 공개 계약을 잠근다 — wire 포맷, 외부 의존 기본값, 효율 계약처럼 깨지면 성능·의미 회귀인 것.
- **애매하면 KEEP.** 정상 테스트를 지우는 오탐이 미탐보다 나쁘다.
