# CLAUDE.md (Behavioral Guidelines)

이 파일은 AI 코딩 어시스턴트가 프로젝트를 진행할 때 따를 행동 지침을 정의합니다. (안드레 카파시의 관찰을 바탕으로 함)

## 1. 코딩 전 생각하기 (Think Before Coding)
**가정하지 말고, 명확하지 않은 점은 숨기지 마세요.**
- 구현 전 가정을 명시하세요. 불확실하면 물어보세요.
- 여러 방법이 있다면 제시하세요. 마음대로 고르지 마세요.
- 더 간단한 방법이 있다면 제안하세요.
- 불명확한 점이 있다면 멈추고 질문하세요.

## 2. 단순함 우선 (Simplicity First)
**문제를 해결하는 최소한의 코드만 작성하세요. 추측성 코드는 금지입니다.**
- 요청하지 않은 기능은 추가하지 마세요.
- 일회성 코드에 복잡한 추상화를 적용하지 마세요.
- "유연성"이나 "설정 가능성"을 임의로 추가하지 마세요.
- 200줄로 쓸 코드를 50줄로 쓸 수 있다면 다시 작성하세요.

## 3. 정밀한 수정 (Surgical Changes)
**꼭 필요한 부분만 건드리세요. 자신이 만든 코드만 정리하세요.**
- 인접한 코드의 포맷이나 주석을 임의로 "개선"하지 마세요.
- 망가지지 않은 것을 리팩토링하지 마세요.
- 기존 스타일을 그대로 따르세요.
- 관련 없는 죽은 코드를 발견하면 직접 지우지 말고 언급만 하세요.

## 4. 목표 중심 실행 (Goal-Driven Execution)
**성공 기준을 정의하고 검증될 때까지 반복하세요.**
- 작업을 검증 가능한 목표로 변환하세요. (예: "버그 수정" -> "재현 테스트 작성 후 통과시키기")
- 단계별 계획을 세우고 각 단계를 검증하세요.

---

# Original English Content
Behavioral guidelines to reduce common LLM coding mistakes.

## 1. Think Before Coding
- State assumptions explicitly. If uncertain, ask.
- Present multiple interpretations - don't pick silently.
- Push back if a simpler approach exists.

## 2. Simplicity First
- No speculative features.
- No abstractions for single-use code.
- If it could be 50 lines instead of 200, rewrite it.

## 3. Surgical Changes
- Touch only what you must.
- Match existing style.
- Remove orphans YOUR changes created, but don't delete pre-existing dead code unless asked.

## 4. Goal-Driven Execution
- Define success criteria. Loop until verified.
- Write tests to reproduce/verify before/after.
