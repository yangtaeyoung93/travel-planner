# Spec: 동유럽 패키지 조사 하네스 (v2, tips.md 기준)

## 구성 파일
| 파일 | 역할 |
|---|---|
| `reference/tips.md` | 조사 기준 원본. 모든 에이전트가 먼저 읽음 |
| `.mcp.json` | 프로젝트 전용 Playwright MCP (`--isolated --headless`) |
| `.claude/workflows/eastern-europe-package-research.js` | 하네스 본체 |
| `reports/<today><suffix>-report.md`, `.html` | 결과물 (종합 에이전트가 작성) |

## 실행
```json
{ "today": "2026-11-23", "suffix": "v2", "sites": ["하나투어"] }
```
- `today`: 조회일·파일명. `suffix`(선택): 파일명 꼬리표(`-v2`). `sites`(선택): 일부 사이트만 테스트.

## 단계
1. **Research (병렬)**: 여행사 8곳에서 후보 상품·회차 URL을 2~4개씩 찾는다. 앞선 조사에서 강했던 상품은 힌트로 넘겨 반드시 포함한다.
2. **Browser Verify (순차)**: Playwright로 상세 페이지·출발일 달력을 열어 아래 스키마를 채운다. Playwright MCP 서버를 공유하므로 직렬 잠금으로 한 번에 하나씩.
3. **Analyze (병렬)**: tips.md 6개 평가 항목별 분석가 6명이 점수와 질문을 낸다.
4. **Discuss**: 질문이 있는 사이트만 브라우저로 재확인(순차) → 분석가 재평가(병렬). 1라운드.
5. **Report**: tips.md "최종 추천 ~ 최종 결론" 형식으로 보고서 작성.

## 상품 스키마 (요약)
기본: `site, productName, productCode, url, departDate, arriveDate, days, countries[], cities[], pricePerPerson, confirmed, minPax, currentPax, seatsLeft, bookableFor5`
항공: `flight{airline, direct, stops, outDepart, outArrive, returnDepart, returnArrive}`
숙박: `hotels[{city, name, grade, location(시내|외곽|미정), nights}], tripleRoom, singleSupplement`
일정: `itinerary[{day, cities[], busHours, highlights}], freeTime, nightTour, longBusDays`
관광지: `attractions[{name, entry(입장|외관|선택관광|미포함|확인 필요)}]`
비용: `localFee(가이드·기사 경비), fuelIncluded, shoppingCount, optionalTours[{name, price}]`
날짜별: `priceByDate[{date, price, confirmed, seatsLeft}]`
기타: `traps[]` (tips.md "패키지의 함정"), `verifiedBy(browser|search|unverified)`, `notes`
확인 못 한 값은 null 또는 "확인 필요". 금액은 원(KRW).

## 평가 (100점)
| 항목 | 배점 |
|---|---|
| 일정·관광시간 | 25 |
| 쇼핑·옵션 | 20 |
| 항공 | 15 |
| 숙박 | 15 |
| 관광지 구성 | 15 |
| 가격 | 10 |

분석가는 각자 0~100점을 주고, 최종 점수 = Σ(점수 × 배점) / 100.

## 보고서 형식
tips.md의 순서를 따른다: 5개 부문 1위(종합·가성비·일정·프리미엄·저예산), TOP 5 비교표, 날짜별 가격 비교, 5명 예약 관점, 패키지의 함정, 5명 비용(추천 옵션만 / 옵션 거의 없음), 최종 선택 1개와 이유, 여행사 확인 질문 10개.
문장은 쉽게, 문단을 짧게 나누고 표를 쓴다.

## 안전 규칙
- 조회·클릭·탭 이동·출발일 선택만. 로그인·예약·결제·개인정보 입력·견적 폼 제출 금지.
- CAPTCHA·차단 시 우회하지 않고 `verifiedBy: unverified`.

## 검증
- `package.json`이 없어 `npm test` 대신, 가짜 `agent()`로 스크립트를 끝까지 돌리는 흐름 검증을 한다 (브라우저 단계 동시 실행 1개, 질문 → 재확인 → 재평가 → 보고서 순서).

---

# Spec: harness-design 스킬

## 목적
새 에이전트 팀 하네스를 설계할 때 따르는 절차를 안내하는 스킬. 기존 `commit-message`(순차 + 검증 루프)와 동유럽 조사 하네스(팬아웃 + 토론)를 일반화한다.

## 파일
| 파일 | 역할 |
|---|---|
| `.claude/skills/harness-design/SKILL.md` | 스킬 본체 (500단어 이내, 단일 파일) |

## 범위
- 포함: 작업 분해, 아키텍처 선택, 에이전트 정의서, 스킬 분리, 오케스트레이터와 PASS/REDO 게이트, 흔한 실수.
- 제외: 템플릿 파일, 서브에이전트 베이스라인 테스트(RED/GREEN), 기존 `ecc:agent-harness-construction`·`ecc:harness-audit` 내용 복제.

## 트리거
- 새 하네스·에이전트 팀을 설계할 때. 이미 만든 하네스의 감사·실행은 제외.

## 영향도
- 신규 파일 1개 추가. 기존 파일 변경 없음 (Breaking Change 없음).

## 검증
- `npm test` 대상 아님(코드 없음). `wc -w`로 분량, frontmatter 형식, 기존 스킬 양식 일치를 점검한다.

---

# Spec: harness-orchestrator 스킬 + 프로젝트 CLAUDE.md 포인터

## 목적
`harness-design`의 5단계(오케스트레이터)를 별도 스킬로 분리해 상세화한다. 근거: `commit-message` 스킬(파일 인계 + PASS/REDO 루프)과 `.claude/workflows/eastern-europe-package-research.js`(병렬 조사 → 직렬 브라우저 → 병렬 분석 → 질문 사이트만 재확인 → 보고서).

## 파일
| 파일 | 역할 |
|---|---|
| `.claude/skills/harness-orchestrator/SKILL.md` | 오케스트레이터 작성 절차 (500단어 이내, 단일 파일) |
| `.claude/CLAUDE.md` (신규) | 프로젝트 스킬 포인터 2줄. 전역 `D:\.claude\CLAUDE.md`는 수정하지 않음 |
| `.claude/skills/harness-design/SKILL.md` | 5단계에 새 스킬 참조 한 줄만 추가 |

## 스킬 내용
- 구현 방식 2가지: 스킬 방식(`_workspace` 파일 인계, commit-message)과 워크플로우 스크립트 방식(스키마 반환, 동유럽 조사).
- 사전 점검 → 호출 → 판정 병합 → 재시도 → 종료 보고.
- 판정 파일이 없거나 형식이 불명확하면 REDO. 재시도 상한과 초과 시 "수동 검토 권장" 경고.
- 부분 실패: 실패한 작업자만 제외하고 계속하며, 실패 목록을 보고에 남긴다. 결과가 하나도 없으면 중단한다.
- 병렬화 범위: 공유 자원(브라우저 등)을 쓰는 단계만 직렬, 나머지는 병렬.

## 범위 외
- 워크플로우 스크립트 생성기, 서브에이전트 검증 테스트(별도 요청 시).

## 영향도
- 신규 파일 2개, 기존 파일 수정 1줄(`harness-design`). Breaking Change 없음.
