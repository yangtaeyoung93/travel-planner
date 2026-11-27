# travel-planner

동유럽 패키지 여행(성인 5명, 2027-05-15 ~ 06-10, 7~10일)을 여러 여행사에서 조사하고 비교하는 프로젝트입니다.
에이전트 팀이 상품을 찾고, 브라우저로 직접 확인하고, 점수를 매겨 보고서를 만듭니다.

## 폴더 구조

| 경로 | 내용 |
|---|---|
| `task.md` | 여행 조건과 요구사항 (작업의 출발점) |
| `spec.md` | 구현 명세 (코드를 바꾸기 전에 먼저 갱신) |
| `reference/tips.md` | 조사 기준 원본. `task.md`와 다르면 이 파일을 따릅니다 |
| `reports/` | 조사 결과 보고서 (`.md`, `.html`) |
| `.claude/skills/` | 스킬: `commit-message`, `harness-design`, `harness-orchestrator` |
| `.claude/agents/` | 커밋 메시지 작성·검증 에이전트 |
| `.claude/workflows/` | 동유럽 패키지 조사 워크플로우 |
| `.mcp.json` | 프로젝트 전용 Playwright MCP 설정 |

## 사용법

**패키지 조사 실행**: Claude Code에서 워크플로우 `eastern-europe-package-research`를 실행합니다.

```json
{ "today": "2026-11-27", "suffix": "v3", "sites": ["하나투어"] }
```

- `today`: 조회일. 보고서 파일명에 쓰입니다.
- `suffix`(선택): 파일명 꼬리표. `sites`(선택): 일부 여행사만 조사합니다.
- 흐름: 검색(병렬) → 브라우저 확인(순차) → 분석(병렬) → 질문 사이트 재확인 → 보고서.

**커밋 메시지**: 변경을 `git add`로 스테이지한 뒤 `commit-message` 스킬을 실행합니다. 작성 에이전트와 검증 에이전트가 PASS를 낼 때까지 최대 2회 다시 씁니다.

**에이전트 팀 설계**: 새 팀은 `harness-design`, 호출 순서와 재시도는 `harness-orchestrator` 스킬을 따릅니다.

## 보고서 보기

`reports/`의 `<날짜>[-이름]-report.md`를 열면 됩니다. 같은 이름의 `.html`은 브라우저에서 바로 읽을 수 있는 같은 내용입니다.

## 안전 규칙

- 브라우저는 조회, 클릭, 탭 이동, 출발일 선택만 합니다.
- 로그인, 예약, 결제, 개인정보 입력, 견적 폼 제출은 하지 않습니다.
- CAPTCHA나 봇 차단은 우회하지 않고 "확인 필요"로 남깁니다.

## 참고

- `package.json`이 없어 `npm test`는 해당하지 않습니다.
- `.claude/settings.local.json`은 커밋하지 않습니다(`.gitignore`).