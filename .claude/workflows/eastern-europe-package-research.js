export const meta = {
  name: 'eastern-europe-package-research',
  description: '동유럽 패키지(성인 5명, 2027-05-15~06-10, 7~10일)를 reference/tips.md 기준으로 여행사별 조사·Playwright 검증·비교 분석해 보고서 작성',
  whenToUse: '동유럽 패키지 여행 상품을 여러 여행사에서 비교 조사할 때. args: { today: "YYYY-MM-DD", suffix?: string, sites?: string[] }',
  phases: [
    { title: 'Research', detail: '여행사별 후보 상품 검색 (병렬)' },
    { title: 'Browser Verify', detail: 'Playwright로 상품 페이지·출발일 달력 직접 확인 (순차)' },
    { title: 'Analyze', detail: 'tips.md 6개 평가 항목별 분석 (병렬)' },
    { title: 'Discuss', detail: '분석팀 질문 → 조사팀 재확인 → 재평가' },
    { title: 'Report', detail: 'tips.md 형식 Markdown + HTML 보고서 작성' },
  ],
}

// ───────── 조사 기준 (원본: reference/tips.md) ─────────
const CRITERIA = `조사 기준 원본은 작업 디렉터리의 reference/tips.md입니다. 작업 전에 Read 도구로 먼저 읽고 그대로 따르세요.
핵심 요약:
- 인천 출발, 성인 5명 단체. 출발 2027-05-15 ~ 2027-06-10, 7~10일(8~9일 우선).
- 체코·오스트리아·헝가리 주요 도시를 여유 있게 보는 일정 선호. 국가 수를 늘려 체류가 짧아지는 상품은 낮게 평가.
- 5명 동시 예약 가능 여부(잔여석·최소 출발 인원·객실 배정)를 반드시 확인.
- 예산 참고: 1인 450~500만원. 가격만 싸다고 높게 평가하지 말 것.`

const SAFETY = `안전 규칙 (반드시 준수):
- 브라우저 동작은 조회·클릭·탭 이동·출발일 선택만. 로그인·예약·결제·개인정보 입력·견적/상담 폼 제출 금지.
- CAPTCHA·봇 차단·로그인 요구가 나오면 우회하지 말고 verifiedBy를 "unverified"로 두고 notes에 사유 기록.
- 금액은 원(KRW) 정수. 확인 못 한 값은 null 또는 "확인 필요". 추측을 확인된 값처럼 쓰지 말 것.
- 검색 결과 가격과 상품 페이지 가격이 다르면 상품 페이지를 따를 것.`

const DEFAULT_SITES = [
  { name: '하나투어', domain: 'hanatour.com', hint: '스타투어매니저 동유럽 3국 9일 EEP133 계열(1인 469.9만, 노쇼핑·노옵션), 프리미엄 5성 EEP113 계열' },
  { name: '모두투어', domain: 'modetour.com', hint: 'EEP333KEPP(프라하 IN/OUT), EEN329KEB(노팁·노옵션·노쇼핑)' },
  { name: '노랑풍선', domain: 'ybtour.co.kr', hint: 'EEP1403 동유럽 3국 9일 ALL포함' },
  { name: '참좋은여행', domain: 'verygoodtour.com', hint: 'EPP4067 [노팁 노옵션] 동유럽 3개국 9일 부다페스트 IN 회차(-BUD, 1인 373~383만, 하루 최장 버스 3h). 상품코드 끝자리가 IN 도시(PRG/VIE/BUD)' },
  { name: '교원투어', domain: 'kyowontour.com', hint: '' },
  { name: '온라인투어', domain: 'onlinetour.co.kr', hint: '' },
  { name: '인터파크투어', domain: 'travel.interpark.com', hint: '지난 조사에서 403 차단됨. 막히면 재판매 페이지(마이리얼트립 등)로 확인' },
  { name: '롯데관광', domain: 'lottetour.com', hint: '「낮보다 아름다운 동유럽의 밤」 4개국 9일(출발 확정). 마이리얼트립 재판매 페이지 있음' },
]

const today = (args && args.today) || '날짜미지정'
const suffix = args && args.suffix ? `-${args.suffix}` : ''
const SITES = args && Array.isArray(args.sites) && args.sites.length
  ? DEFAULT_SITES.filter(s => args.sites.includes(s.name))
  : DEFAULT_SITES
if (!SITES.length) throw new Error(`args.sites에 알 수 없는 사이트만 있습니다. 가능: ${DEFAULT_SITES.map(s => s.name).join(', ')}`)

// ───────── 스키마 ─────────
const STR = { type: ['string', 'null'] }
const INT = { type: ['integer', 'null'] }
const NUM = { type: ['number', 'null'] }
const BOOL = { type: ['boolean', 'null'] }

const CANDIDATES_SCHEMA = {
  type: 'object',
  properties: {
    candidates: {
      type: 'array',
      items: {
        type: 'object',
        properties: { productName: { type: 'string' }, url: { type: 'string' }, reason: { type: 'string' } },
        required: ['productName', 'url'],
      },
    },
    notes: { type: 'string' },
  },
  required: ['candidates'],
}

const PRODUCT = {
  type: 'object',
  properties: {
    site: { type: 'string' },
    productName: { type: 'string' },
    productCode: STR,
    url: { type: 'string' },
    departDate: STR,
    arriveDate: STR,
    days: INT,
    countries: { type: 'array', items: { type: 'string' } },
    cities: { type: 'array', items: { type: 'string' } },
    pricePerPerson: INT,
    confirmed: BOOL,
    minPax: INT,
    currentPax: INT,
    seatsLeft: INT,
    bookableFor5: { type: 'string', description: '가능 | 불가 | 확인 필요 + 근거' },
    flight: {
      type: 'object',
      properties: {
        airline: STR, direct: BOOL, stops: INT,
        outDepart: STR, outArrive: STR, returnDepart: STR, returnArrive: STR,
      },
    },
    hotels: {
      type: 'array',
      items: {
        type: 'object',
        properties: { city: { type: 'string' }, name: STR, grade: STR, location: STR, nights: INT },
        required: ['city'],
      },
    },
    tripleRoom: STR,
    singleSupplement: INT,
    itinerary: {
      type: 'array',
      items: {
        type: 'object',
        properties: { day: { type: 'integer' }, cities: { type: 'array', items: { type: 'string' } }, busHours: NUM, highlights: STR },
        required: ['day', 'cities'],
      },
    },
    freeTime: STR,
    nightTour: STR,
    longBusDays: INT,
    attractions: {
      type: 'array',
      description: 'tips.md "특히 확인할 관광지" 각각의 포함 방식',
      items: {
        type: 'object',
        properties: { name: { type: 'string' }, entry: { type: 'string', description: '입장 | 외관 | 선택관광 | 미포함 | 확인 필요' } },
        required: ['name', 'entry'],
      },
    },
    localFee: INT,
    fuelIncluded: BOOL,
    shoppingCount: INT,
    optionalTours: {
      type: 'array',
      items: { type: 'object', properties: { name: { type: 'string' }, price: INT }, required: ['name'] },
    },
    priceByDate: {
      type: 'array',
      items: {
        type: 'object',
        properties: { date: { type: 'string' }, price: INT, confirmed: BOOL, seatsLeft: INT },
        required: ['date'],
      },
    },
    reviews: { type: 'object', properties: { rating: NUM, count: INT, summary: STR } },
    traps: { type: 'array', items: { type: 'string' } },
    verifiedBy: { type: 'string', enum: ['browser', 'search', 'unverified'] },
    notes: { type: 'string' },
  },
  required: ['site', 'productName', 'url', 'verifiedBy'],
}

const PRODUCTS_SCHEMA = {
  type: 'object',
  properties: { products: { type: 'array', items: PRODUCT } },
  required: ['products'],
}

const ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    scores: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          site: { type: 'string' },
          productName: { type: 'string' },
          score: { type: 'number', minimum: 0, maximum: 100 },
          rationale: { type: 'string' },
        },
        required: ['site', 'productName', 'score', 'rationale'],
      },
    },
    questions: {
      type: 'array',
      description: '조사팀에 재확인을 요청할 항목 (데이터 누락·의심). 없으면 빈 배열.',
      items: {
        type: 'object',
        properties: { site: { type: 'string' }, productName: { type: 'string' }, question: { type: 'string' } },
        required: ['site', 'productName', 'question'],
      },
    },
    summary: { type: 'string' },
  },
  required: ['scores', 'questions', 'summary'],
}

// ───────── Playwright 직렬 잠금 ─────────
// Playwright MCP 서버 하나를 모든 하위 에이전트가 공유한다. 동시에 쓰면 탭을 서로 덮어쓰므로 브라우저 단계는 한 번에 하나씩만 실행.
let browserLock = Promise.resolve()
const serial = fn => {
  const run = browserLock.then(fn)
  browserLock = run.catch(() => {})
  return run
}

const PLAYWRIGHT_HOWTO = `Playwright 사용법: ToolSearch로 "+playwright"를 검색해 mcp__playwright__* 도구를 로드한 뒤,
browser_navigate로 페이지를 열고 browser_snapshot으로 내용을 읽는다. 출발일 달력·일정표·호텔·포함/불포함·후기 탭은 browser_click으로 연다.
작업이 끝나면 browser_close로 브라우저를 닫는다. Playwright 도구가 없으면 WebFetch로 대신하고 verifiedBy를 "search"로 둔다.`

// ───────── 1~2. 조사팀: 검색(병렬) → 브라우저 검증(순차) ─────────
phase('Research')
log(`대상 여행사 ${SITES.length}곳: ${SITES.map(s => s.name).join(', ')}`)

const siteResults = await pipeline(
  SITES,
  site => agent(
    `당신은 "${site.name}"(${site.domain}) 담당 여행 상품 조사원입니다.
${CRITERIA}

WebSearch와 ${site.domain} 사이트 검색으로 조건에 맞는 동유럽 패키지 2~4개를 찾아 상품 상세 페이지 URL을 모으세요.
- 2027-05-15 ~ 06-10 출발 회차가 있는 상품, 체코·오스트리아·헝가리 중심, 7~10일(8~9일 우선).
- 성격이 다른 상품을 섞어서(노쇼핑·노옵션형, 실속형, 프리미엄형).
${site.hint ? `- 앞선 조사에서 강했던 상품(반드시 포함): ${site.hint}` : ''}
- 상세 URL을 못 찾으면 목록/검색 결과 URL이라도 넣고 reason에 그렇게 적으세요.`,
    { label: `research:${site.name}`, phase: 'Research', schema: CANDIDATES_SCHEMA },
  ),
  (found, site) => serial(() => agent(
    `당신은 "${site.name}" 담당 조사원입니다. 아래 후보 상품 페이지를 Playwright로 직접 열어 확인하세요.
${CRITERIA}

후보:
${JSON.stringify(found.candidates, null, 2)}

${PLAYWRIGHT_HOWTO}

tips.md "상품별 조사 항목"과 "특히 확인할 관광지"를 스키마에 맞춰 채우세요. 특히:
- 출발일 달력에서 2027-05-15 ~ 06-10 회차별 가격·출발확정·잔여석을 priceByDate에 모두 기록.
- 대표 회차 1개(가격 대비 가장 좋은 날)를 departDate/pricePerPerson으로.
- 5명 동시 예약 가능 여부(bookableFor5): 잔여석 ≥ 5인지, 최소 출발 인원, 객실 배정(3인실·싱글 추가요금) 근거와 함께.
- 항공 출국·귀국 시각, 호텔 실명·등급·시내/외곽·미정 여부, 관광지 입장/외관 구분, 자유시간, 야경투어.
- 가이드/기사 경비(localFee), 쇼핑 횟수, 선택관광 목록과 금액.
- tips.md "패키지의 함정"에 해당하는 것은 traps에 적기.
후보가 조건과 안 맞으면 사이트 안에서 더 맞는 상품으로 바꿔도 됩니다(notes에 기록).

${SAFETY}`,
    { label: `verify:${site.name}`, phase: 'Browser Verify', schema: PRODUCTS_SCHEMA },
  )),
)

const products = siteResults.filter(Boolean).flatMap(r => r.products)
const failedSites = SITES.filter((_, i) => !siteResults[i]).map(s => s.name)
if (failedSites.length) log(`조사 실패 여행사: ${failedSites.join(', ')}`)
if (!products.length) throw new Error('수집된 상품이 없습니다. Playwright MCP 연결과 네트워크를 확인하세요.')
if (products.length < 10) log(`주의: 수집 상품 ${products.length}개로 tips.md 최소 기준(10개) 미달`)
log(`상품 ${products.length}개 수집 (브라우저 검증 ${products.filter(p => p.verifiedBy === 'browser').length}개)`)

// ───────── 3. 분석팀 (병렬, tips.md 평가 배점) ─────────
const ANALYSTS = [
  { key: '일정·관광시간', weight: 25, focus: '도시별 실제 체류·관광시간, 일정의 여유, 자유시간, 장거리 버스 반복 여부, 첫날·마지막 날 실제 관광 가능 시간, 국가 수를 늘려 체류가 짧아졌는지' },
  { key: '쇼핑·옵션', weight: 20, focus: '쇼핑 횟수(3회 이상 감점), 선택관광 개수와 금액, 가이드/기사 경비 별도 여부, 기본가는 싸지만 추가비용이 큰지' },
  { key: '항공', weight: 15, focus: '직항/경유, 경유 횟수, 출국·귀국 시각(새벽/심야 감점), 실제 관광 가능 시간에 미치는 영향, 5명 동일 항공편 좌석 확보 가능성' },
  { key: '숙박', weight: 15, focus: '호텔 등급, 실명 공개/미정·동급 여부, 시내/외곽, 주요 도시 숙박일수, 5명 객실 배정(3인실·싱글 추가요금)' },
  { key: '관광지 구성', weight: 15, focus: 'tips.md "특히 확인할 관광지" 포함 여부와 입장/외관 구분(프라하성·쇤브룬·벨베데레·국회의사당 등 내부 입장 가점), 야경투어' },
  { key: '가격', weight: 10, focus: '1인·5인 실제 총액(상품가+유류할증+가이드경비+현실적 옵션), 예산 1인 450~500만원 대비, 출발일별 가격 차이. 싸다는 이유만으로 고득점 금지' },
]

const analysisPrompt = (a, extra) => `당신은 동유럽 패키지 비교 분석팀의 "${a.key}" 담당 분석가입니다 (배점 ${a.weight}점 항목).
${CRITERIA}

평가 기준: ${a.focus}
아래 상품 전부를 0~100점으로 평가하고 근거를 쓰세요. verifiedBy가 "browser"가 아닌 데이터와 "확인 필요" 값은 신뢰도를 낮게 보세요.
판단에 필요한 데이터가 비었거나 의심스러우면 questions에 사이트·상품·구체적 질문을 남기세요(조사팀이 브라우저로 재확인합니다).

상품 데이터:
${JSON.stringify(products, null, 2)}
${extra || ''}`

phase('Analyze')
const round1 = await parallel(ANALYSTS.map(a => () =>
  agent(analysisPrompt(a), { label: `analyze:${a.key}`, phase: 'Analyze', schema: ANALYSIS_SCHEMA })))

// ───────── 4. 논의: 질문 → 조사팀 재확인(순차) → 분석팀 재평가(병렬) ─────────
phase('Discuss')
const questions = round1.flatMap((r, i) => (r ? r.questions.map(q => ({ ...q, from: ANALYSTS[i].key })) : []))
const bySite = {}
for (const q of questions) (bySite[q.site] = bySite[q.site] || []).push(q)
log(`분석팀 질문 ${questions.length}건 (여행사 ${Object.keys(bySite).length}곳)`)

const answers = await parallel(Object.entries(bySite).map(([siteName, qs]) => () => serial(() => agent(
  `당신은 "${siteName}" 담당 여행 상품 조사원입니다. 비교 분석팀이 아래 질문을 보냈습니다.
해당 상품 페이지를 Playwright로 다시 열어 확인하고 답하세요. 확인 못 하면 그렇다고 답하세요.

질문:
${JSON.stringify(qs, null, 2)}

기존 수집 데이터:
${JSON.stringify(products.filter(p => p.site === siteName), null, 2)}

${PLAYWRIGHT_HOWTO}
${SAFETY}

답변 형식: 질문마다 "[담당분석가] 상품명 — 질문 → 답변 (확인 방식: browser/search/unverified)" 한 줄씩.`,
  { label: `answer:${siteName}`, phase: 'Discuss' },
))))
const answerText = answers.filter(Boolean).join('\n\n')

const finalAnalyses = questions.length
  ? await parallel(ANALYSTS.map((a, i) => () =>
      agent(analysisPrompt(a, `
1차 평가(당신의 이전 결과):
${JSON.stringify(round1[i], null, 2)}

조사팀 재확인 답변:
${answerText || '(답변 없음)'}

답변을 반영해 점수와 근거를 최종 수정하세요. questions는 빈 배열로 두세요.`),
        { label: `revise:${a.key}`, phase: 'Discuss', schema: ANALYSIS_SCHEMA })))
  : round1
// 재평가가 실패한 분석가는 1차 평가를 그대로 사용
const analyses = finalAnalyses.map((r, i) => r || round1[i])

// ───────── 5. 종합 보고서 (tips.md 형식) ─────────
phase('Report')
const mdPath = `reports/${today}${suffix}-report.md`
const htmlPath = `reports/${today}${suffix}-report.html`
const reportResult = await agent(
  `당신은 동유럽 패키지 비교 조사의 종합 보고 담당입니다.
${CRITERIA}

배점: ${ANALYSTS.map(a => `${a.key} ${a.weight}`).join(' / ')}. 최종 점수 = Σ(분석가 점수 × 배점) / 100.
같은 상품을 여러 여행사가 팔면 하나의 상품군으로 묶으세요.

상품 데이터:
${JSON.stringify(products, null, 2)}

분석팀 최종 평가:
${JSON.stringify(ANALYSTS.map((a, i) => ({ analyst: a.key, weight: a.weight, ...(analyses[i] || {}) })), null, 2)}

분석팀↔조사팀 논의 기록:
${answerText || '(질문 없음)'}

조사 실패 여행사: ${failedSites.join(', ') || '없음'}

reference/tips.md의 "최종 추천"부터 "최종 결론"까지 요구하는 내용을 빠짐없이 담아 두 파일을 Write 도구로 작성하세요 (작업 디렉터리 기준).
1. ${mdPath}
   - 맨 앞: 3~4문장짜리 "결론부터" (최종 선택 상품과 이유).
   - 5개 부문 1위(종합·가성비·일정·프리미엄·저예산), tips.md 형식의 TOP 5 비교표.
   - ① 날짜별 가격 비교와 가장 유리한 출발일, ② 5명 예약 관점(좌석·객실·3인실/싱글 요금·출발확정), ③ 패키지의 함정 표시.
   - 5명 실제 예상 비용을 "추천 옵션만 선택"과 "옵션 거의 안 함" 두 경우로 (상품가×5 + 유류할증 + 제세공과금 + 가이드/기사 경비 + 필수 추가비용 + 옵션).
   - 최종 결론 문장: "성인 5명이 2027년 5월 15일~6월 초 사이에 여행한다면 나는 이 상품을 선택하겠다." + 가격/일정/항공/숙박/관광/추가비용 기준 이유.
   - 여행사에 확인할 질문 10개, 용어 풀이, 조사 한계(조회일 ${today} 기준, 확인 필요 항목).
   - 모든 상품에 URL. 확인 못 한 값은 "확인 필요".
   - **읽기 쉽게**: 쉬운 말, 한 문단 2~3문장, 문장마다 줄바꿈, 상품마다 "가격표 → 좋은 점 → 아쉬운 점 → 일정" 순서. 내부 분석 과정(점수 변경 이력 등)은 맨 뒤 부록으로.
2. ${htmlPath}
   - 같은 내용을 한 파일짜리 HTML로. 외부 라이브러리 없이 인라인 CSS만, 한국어.
   - 라이트/다크 모드 모두 읽기 좋게(prefers-color-scheme), 모바일 폭에서 표는 가로 스크롤.
   - 부문별 1위는 카드로, 일정은 일자별 도시 흐름(도시 → 도시)과 버스 시간 표시.

마지막으로 작성한 두 파일 경로와 최종 선택 상품 요약을 텍스트로 반환하세요.`,
  { label: 'report', phase: 'Report' },
)

return {
  today,
  files: [mdPath, htmlPath],
  sites: SITES.map(s => s.name),
  failedSites,
  productCount: products.length,
  browserVerified: products.filter(p => p.verifiedBy === 'browser').length,
  questionCount: questions.length,
  report: reportResult,
}
