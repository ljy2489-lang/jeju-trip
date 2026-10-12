# 제주 가족여행 인터랙티브 지도 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 아이폰에서 여는 제주 2박 3일 가족여행 인터랙티브 일러스트 지도 웹앱을 만들어 GitHub Pages로 배포한다.

**Architecture:** 빌드 없는 정적 웹앱. 일정 계산은 DOM과 분리된 `schedule.js`(UMD, Node 테스트)에 두고, 화면(`app.js`)은 Leaflet 지도·타임라인·상세 시트를 그린다. 장소·일정·도로경로는 `data/*.js` 전역 객체로 제공하며 도로경로는 OSRM으로 미리 계산한다.

**Tech Stack:** HTML/CSS/ES2020, Leaflet 1.9.4(cdnjs), CARTO Voyager 타일, Node 20+ `node:test`, Python 3.13(+truststore) 경로 생성, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-12-jeju-trip-map-design.md`

## Global Constraints

- 여행 날짜 2026-10-16(금)~18(일), 성인 4명 + 아이 2명(8개월·16개월), 렌터카
- 항공 기본값(가정, 화면에 '가정한 시간' 표시): 금 도착 11:00, 일 출발 21:00
- DAY1 첫 출발 = 도착 + 75분 / DAY3 터미널 도착 마감 = 출발 − 120분
- 고정 일정: 토 서머셋 체크인 15:00, 수영 15:30
- 경고 임계: 하루 운전 > 180분, 휴식 없는 연속 활동 > 180분, 일몰 이후 야외 방문
- 직선 추정 이동시간 = 직선거리 × 1.3 ÷ 40km/h, 5분 단위 올림
- 확인 안 된 정보는 `status:'check'`로 두고 화면에 '확인 필요' 표시. 확인일 2026-10-12, 출처 URL 필수
- 터치 영역 ≥ 44px, 본문 ≥ 15px, safe-area 대응
- 날짜 색: DAY1 #F08A3C, DAY2 #1FA2A6, DAY3 #5BAA5B
- 외부 스크립트는 cdnjs 고정 버전만 사용
- 카카오맵 길찾기: `https://map.kakao.com/link/to/{이름},{lat},{lng}`

## Review Focus

1. 항공 도착이 매우 늦을 때(예: 금 16:00) → 음수·뒤섞인 시간 없이 계산되고, 섭지코지 등 생략 가능 일정을 절감 시간과 함께 제안해야 한다. (Task 1 테스트)
2. 항공 출발이 이를 때(예: 일 16:00) → 터미널 마감 초과 경고와 함께 아침미소목장·카페 생략을 제안해야 한다. (Task 1 테스트)
3. 데이터가 바뀌어 저장된 수정값이 없는 일정 id를 가리킬 때 → 무시하고 정상 계산해야 한다. (Task 1 테스트)
4. 아이폰 사파리 비공개 모드 등으로 localStorage 사용 불가 → 저장 없이도 앱이 동작해야 한다. (Task 5 테스트)
5. 순서 변경으로 미리 계산 안 된 구간이 생길 때 → 점선 직선 + '직선 추정' 표시로 이어져야 하며 오류가 없어야 한다. (Task 1·4)

---

## File Structure

| 파일 | 책임 |
|---|---|
| `schedule.js` | 시간 변환, 이동시간 조회/추정, 수정값 적용, 하루 일정 계산, 경고·생략 제안, 코스 요약 |
| `storage.js` | localStorage 안전 래퍼(실패 시 메모리), 키 버전 관리 |
| `data/places.js` | `window.PLACES` 장소·식당·숙소 정보와 필드별 검증 상태 |
| `data/itinerary.js` | `window.COURSES` 추천/전체 코스, `window.TRIP` 메타(일몰, 체크리스트, 아이 식사) |
| `data/routes.js` | `window.ROUTES` 미리 계산한 도로 경로 (생성 파일) |
| `tools/build-routes.py` | itinerary의 모든 인접 구간을 OSRM으로 조회해 routes.js 생성 |
| `index.html` | 레이아웃 뼈대, 스크립트 로드 |
| `styles.css` | 디자인 토큰, 레이아웃, 시트, 카드, 마커 |
| `app.js` | 상태 관리, 지도·타임라인·상세·편집·항공 설정 렌더링 |
| `assets/stickers.js` | 인라인 SVG 스티커 정의 `window.STICKERS` |
| `manifest.json`, `sw.js`, `assets/icon.svg` | PWA |
| `tests/schedule.test.js`, `tests/data.test.js`, `tests/storage.test.js` | 자동 테스트 |

---

### Task 1: 일정 계산 모듈 (schedule.js)

**Files:**
- Create: `schedule.js`
- Test: `tests/schedule.test.js`

**Interfaces:**
- Produces (global `Schedule` / `module.exports`):
  - `toMin(hhmm: string): number`, `fmt(min: number): string`
  - `haversineKm(a:{lat,lng}, b:{lat,lng}): number`
  - `travel(a: Place, b: Place, routes: Routes): {minutes, km, kind:'road'|'straight'|'none', coords: [lat,lng][]}`
  - `applyOverride(stops: Stop[], ov?: {order?:string[], excluded?:string[], stay?:Record<string,number>}): {stops: Stop[], excluded: Stop[]}`
  - `computeDay(day: Day, ctx: {places, routes, flight:{arrive:string, depart:string}, override?, sunset:string}): DayResult`
  - `summarizeCourse(results: DayResult[]): {stops:number, driveMin:number, slackMin:number}`
- Types:
  - `Stop = {id, placeId, kind:'visit'|'meal'|'rest'|'stay'|'transfer', stay:number, fixedAt?:string, optional?:boolean, outdoor?:boolean, locked?:boolean, label?:string, note?:string}`
  - `Day = {id, date, label, tab, color, start:{type:'flightArrive', offset:number}|{type:'time', at:string}, deadline?:{type:'flightDepart', offset:number}, softEnd?:string, stops: Stop[]}`
  - `DayResult = {day, rows: Row[], excluded: Stop[], driveMin, warnings: Warning[], suggestions: Suggestion[], endMin}`
  - `Row = {stop, place, arrive, start, depart, wait, toNext: travel-result|null}` (분 단위 숫자)
  - `Warning = {type:'fixedLate'|'deadline'|'softEnd'|'driveLong'|'noRest'|'afterSunset'|'lastOrder', stopId?, minutes?, message}`
  - `Suggestion = {stopId, saves:number, message}`

- [ ] **Step 1: 실패하는 테스트 작성** — `tests/schedule.test.js`

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../schedule.js');

const P = {
  air:  { id:'air',  name:'공항',  lat:33.5066, lng:126.4929, info:{} },
  a:    { id:'a',    name:'A',    lat:33.45,   lng:126.90,   info:{} },
  b:    { id:'b',    name:'B',    lat:33.43,   lng:126.93,   info:{} },
  c:    { id:'c',    name:'C',    lat:33.33,   lng:126.84,   info:{ lastOrder:{ value:'19:00', status:'verified' } } },
  stay: { id:'stay', name:'숙소', lat:33.32,   lng:126.83,   info:{} },
};
const R = { 'air>a': { minutes:70, km:55, coords:[[33.5,126.49],[33.45,126.9]] } };
const ctx = (o={}) => ({ places:P, routes:R, flight:{ arrive:'11:00', depart:'21:00' }, sunset:'17:50', ...o });

const day1 = {
  id:'d1', start:{ type:'flightArrive', offset:75 }, softEnd:'20:30',
  stops:[
    { id:'s0', placeId:'air', kind:'transfer', stay:0, locked:true },
    { id:'s1', placeId:'a', kind:'visit', stay:120 },
    { id:'s2', placeId:'b', kind:'visit', stay:30, optional:true, outdoor:true },
    { id:'s3', placeId:'c', kind:'meal', stay:60 },
    { id:'s4', placeId:'stay', kind:'stay', stay:0, locked:true },
  ],
};

test('toMin/fmt 왕복', () => {
  assert.equal(S.toMin('08:05'), 485);
  assert.equal(S.fmt(485), '08:05');
  assert.equal(S.fmt(24*60+10), '24:10');
});

test('travel: 저장된 경로는 양방향 조회, 없으면 직선 추정', () => {
  assert.equal(S.travel(P.air, P.a, R).kind, 'road');
  assert.equal(S.travel(P.a, P.air, R).minutes, 70);
  const t = S.travel(P.a, P.c, R);
  assert.equal(t.kind, 'straight');
  assert.equal(t.minutes % 5, 0);
  assert.ok(t.minutes > 0);
  assert.equal(S.travel(P.a, P.a, R).kind, 'none');
  assert.equal(S.travel(P.a, P.a, R).minutes, 0);
});

test('computeDay: 도착+75분 출발, 순차 계산', () => {
  const r = S.computeDay(day1, ctx());
  assert.equal(S.fmt(r.rows[0].depart), '12:15');
  assert.equal(S.fmt(r.rows[1].arrive), '13:25');
  assert.equal(r.rows[1].depart - r.rows[1].arrive, 120);
  for (let i = 1; i < r.rows.length; i++) assert.ok(r.rows[i].arrive >= r.rows[i-1].depart);
});

test('고정 일정: 일찍 도착하면 대기, 늦으면 fixedLate', () => {
  const d = { ...day1, stops: day1.stops.map(s => s.id==='s3' ? { ...s, fixedAt:'18:00' } : s) };
  const early = S.computeDay(d, ctx());
  const row = early.rows.find(x => x.stop.id==='s3');
  assert.equal(S.fmt(row.start), '18:00');
  assert.ok(row.wait > 0);
  const late = S.computeDay(d, ctx({ flight:{ arrive:'15:30', depart:'21:00' } }));
  assert.ok(late.warnings.some(w => w.type==='fixedLate' && w.stopId==='s3'));
});

test('Review1: 늦은 도착 → softEnd 경고 + optional 생략 제안', () => {
  const r = S.computeDay(day1, ctx({ flight:{ arrive:'18:30', depart:'21:00' } }));
  assert.ok(r.warnings.some(w => w.type==='softEnd'));
  assert.equal(r.suggestions[0].stopId, 's2');
  assert.ok(r.suggestions[0].saves >= 30);
  r.rows.forEach(x => assert.ok(x.arrive >= 0 && x.depart >= x.arrive));
});

test('Review2: 이른 출발 → deadline 경고 + 제안', () => {
  const d3 = { id:'d3', start:{ type:'time', at:'08:00' }, deadline:{ type:'flightDepart', offset:-120 },
    stops:[
      { id:'t0', placeId:'stay', kind:'stay', stay:60, locked:true },
      { id:'t1', placeId:'b', kind:'visit', stay:180, optional:true },
      { id:'t2', placeId:'a', kind:'visit', stay:120 },
      { id:'t3', placeId:'air', kind:'transfer', stay:0, locked:true },
    ] };
  const ok = S.computeDay(d3, ctx());
  assert.ok(!ok.warnings.some(w => w.type==='deadline'));
  const bad = S.computeDay(d3, ctx({ flight:{ arrive:'11:00', depart:'14:00' } }));
  assert.ok(bad.warnings.some(w => w.type==='deadline'));
  assert.equal(bad.suggestions[0].stopId, 't1');
});

test('Review3: 수정값의 모르는 id는 무시', () => {
  const { stops, excluded } = S.applyOverride(day1.stops, { order:['zzz','s3','s1'], excluded:['nope','s2'], stay:{ s1:90, ghost:5 } });
  assert.deepEqual(stops.map(s=>s.id), ['s0','s3','s1','s4']);
  assert.deepEqual(excluded.map(s=>s.id), ['s2']);
  assert.equal(stops.find(s=>s.id==='s1').stay, 90);
});

test('locked 일정은 제외되지 않음', () => {
  const { stops } = S.applyOverride(day1.stops, { excluded:['s0'] });
  assert.equal(stops[0].id, 's0');
});

test('일몰 이후 야외 방문 경고, 마지막 주문 경고', () => {
  const r = S.computeDay(day1, ctx({ flight:{ arrive:'15:00', depart:'21:00' } }));
  assert.ok(r.warnings.some(w => w.type==='afterSunset' && w.stopId==='s2'));
  const r2 = S.computeDay(day1, ctx({ flight:{ arrive:'17:30', depart:'21:00' } }));
  assert.ok(r2.warnings.some(w => w.type==='lastOrder' && w.stopId==='s3'));
});

test('운전 180분 초과 / 휴식 없는 활동 경고', () => {
  const long = { ...day1, stops:[ day1.stops[0], { id:'x', placeId:'a', kind:'visit', stay:200 }, day1.stops[4] ] };
  const r = S.computeDay(long, ctx({ routes:{ 'air>a':{ minutes:200, km:150, coords:[] } } }));
  assert.ok(r.warnings.some(w => w.type==='driveLong'));
  assert.ok(r.warnings.some(w => w.type==='noRest'));
});

test('summarizeCourse 합계', () => {
  const r = S.computeDay(day1, ctx());
  const s = S.summarizeCourse([r]);
  assert.equal(s.stops, 3);
  assert.equal(s.driveMin, r.driveMin);
});
```

- [ ] **Step 2: 실패 확인** — Run: `node --test tests/` → FAIL (`Cannot find module '../schedule.js'`)

- [ ] **Step 3: 구현** — `schedule.js`

```js
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Schedule = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const toMin = (s) => { const [h, m] = String(s).split(':').map(Number); return h * 60 + m; };
  const pad = (n) => String(n).padStart(2, '0');
  const fmt = (m) => `${pad(Math.floor(m / 60))}:${pad(Math.round(m % 60))}`;

  function haversineKm(a, b) {
    const R = 6371, d = (x) => (x * Math.PI) / 180;
    const dLat = d(b.lat - a.lat), dLng = d(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(d(a.lat)) * Math.cos(d(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  function travel(a, b, routes) {
    if (!a || !b) return { minutes: 0, km: 0, kind: 'none', coords: [] };
    const km0 = haversineKm(a, b);
    if (a.id === b.id || km0 < 0.3) return { minutes: 0, km: 0, kind: 'none', coords: [] };
    const fwd = routes[`${a.id}>${b.id}`];
    if (fwd) return { minutes: fwd.minutes, km: fwd.km, kind: 'road', coords: fwd.coords };
    const rev = routes[`${b.id}>${a.id}`];
    if (rev) return { minutes: rev.minutes, km: rev.km, kind: 'road', coords: [...rev.coords].reverse() };
    const km = km0 * 1.3;
    return { minutes: Math.ceil(((km / 40) * 60) / 5) * 5, km: Math.round(km * 10) / 10, kind: 'straight',
      coords: [[a.lat, a.lng], [b.lat, b.lng]] };
  }

  function applyOverride(stops, ov) {
    ov = ov || {};
    const ids = new Set(stops.map((s) => s.id));
    const excludedIds = new Set((ov.excluded || []).filter((id) => ids.has(id)));
    stops.forEach((s) => { if (s.locked) excludedIds.delete(s.id); });
    const withStay = stops.map((s) => (ov.stay && Number.isFinite(ov.stay[s.id]) ? { ...s, stay: Math.max(0, ov.stay[s.id]) } : s));
    let ordered = withStay;
    const order = (ov.order || []).filter((id) => ids.has(id));
    if (order.length) {
      const byId = Object.fromEntries(withStay.map((s) => [s.id, s]));
      const movable = order.map((id) => byId[id]).filter((s) => !s.locked);
      const inOrder = new Set(movable.map((s) => s.id));
      const queue = [...movable];
      ordered = withStay.map((s) => (s.locked || !inOrder.has(s.id) ? s : queue.shift()));
    }
    return { stops: ordered.filter((s) => !excludedIds.has(s.id)), excluded: withStay.filter((s) => excludedIds.has(s.id)) };
  }

  function startOf(day, flight) {
    if (day.start.type === 'flightArrive') return toMin(flight.arrive) + day.start.offset;
    return toMin(day.start.at);
  }

  function simulate(stops, ctx, startMin) {
    const { places, routes } = ctx;
    const rows = [];
    let t = startMin, drive = 0;
    stops.forEach((stop, i) => {
      const place = places[stop.placeId];
      let arrive = t;
      if (i > 0) {
        const tr = rows[i - 1].toNext;
        arrive = rows[i - 1].depart + (tr ? tr.minutes : 0);
      }
      let start = arrive, wait = 0;
      if (stop.fixedAt) { const f = toMin(stop.fixedAt); if (f > arrive) { wait = f - arrive; start = f; } }
      const depart = start + (stop.stay || 0);
      const next = stops[i + 1];
      const toNext = next ? travel(place, places[next.placeId], routes) : null;
      if (toNext) drive += toNext.minutes;
      rows.push({ stop, place, arrive, start, depart, wait, toNext });
      t = depart;
    });
    return { rows, drive, endMin: rows.length ? rows[rows.length - 1].arrive : startMin };
  }

  function violations(day, ctx, sim) {
    const w = [];
    const { rows } = sim;
    rows.forEach((r) => {
      if (r.stop.fixedAt && r.arrive > toMin(r.stop.fixedAt))
        w.push({ type: 'fixedLate', stopId: r.stop.id, minutes: r.arrive - toMin(r.stop.fixedAt),
          message: `${r.place.name} ${r.stop.fixedAt} 고정 일정에 ${r.arrive - toMin(r.stop.fixedAt)}분 늦어요` });
    });
    if (day.deadline && day.deadline.type === 'flightDepart') {
      const limit = toMin(ctx.flight.depart) + day.deadline.offset;
      if (sim.endMin > limit) w.push({ type: 'deadline', minutes: sim.endMin - limit,
        message: `공항 도착이 권장 시각(${fmt(limit)})보다 ${sim.endMin - limit}분 늦어요` });
    }
    if (day.softEnd && sim.endMin > toMin(day.softEnd))
      w.push({ type: 'softEnd', minutes: sim.endMin - toMin(day.softEnd),
        message: `숙소 도착이 ${fmt(sim.endMin)}로 늦어요(권장 ${day.softEnd} 이전)` });
    return w;
  }

  function computeDay(day, ctx) {
    const { stops, excluded } = applyOverride(day.stops, ctx.override);
    const startMin = startOf(day, ctx.flight);
    const sim = simulate(stops, ctx, startMin);
    const warnings = violations(day, ctx, sim);
    const hard = warnings.length > 0;

    if (sim.drive > 180) warnings.push({ type: 'driveLong', minutes: sim.drive, message: `하루 운전이 ${sim.drive}분이에요(3시간 초과)` });
    let run = 0;
    sim.rows.forEach((r, i) => {
      if (['rest', 'meal', 'stay'].includes(r.stop.kind)) { run = 0; return; }
      run += (r.depart - r.start) + (i > 0 && sim.rows[i - 1].toNext ? sim.rows[i - 1].toNext.minutes : 0);
      if (run > 180) { warnings.push({ type: 'noRest', stopId: r.stop.id, message: `${r.place.name}까지 3시간 넘게 쉬지 않아요. 수유·휴식을 넣어주세요` }); run = 0; }
    });
    const sunset = toMin(ctx.sunset || '17:50');
    sim.rows.forEach((r) => {
      if (r.stop.outdoor && r.depart > sunset) warnings.push({ type: 'afterSunset', stopId: r.stop.id, message: `${r.place.name}는 일몰(${ctx.sunset}) 이후예요` });
      const lo = r.place && r.place.info && r.place.info.lastOrder;
      if (r.stop.kind === 'meal' && lo && lo.status === 'verified' && r.arrive > toMin(lo.value))
        warnings.push({ type: 'lastOrder', stopId: r.stop.id, message: `${r.place.name} 마지막 주문(${lo.value}) 이후 도착이에요` });
    });

    const suggestions = [];
    if (hard) {
      stops.forEach((s, i) => {
        if (!s.optional) return;
        const without = stops.filter((x) => x.id !== s.id);
        const alt = simulate(without, ctx, startMin);
        const saves = sim.endMin - alt.endMin;
        if (saves > 0) suggestions.push({ stopId: s.id, saves, message: `${ctx.places[s.placeId].name} 생략 시 ${saves}분 절약` });
      });
      suggestions.sort((a, b) => b.saves - a.saves);
    }
    return { day, rows: sim.rows, excluded, driveMin: sim.drive, warnings, suggestions, endMin: sim.endMin };
  }

  function summarizeCourse(results) {
    let stops = 0, driveMin = 0, slackMin = 0;
    results.forEach((r) => {
      stops += r.rows.filter((x) => !x.stop.locked).length;
      driveMin += r.driveMin;
      slackMin += r.rows.reduce((a, x) => a + x.wait + (x.stop.kind === 'rest' ? x.depart - x.start : 0), 0);
    });
    return { stops, driveMin, slackMin };
  }

  return { toMin, fmt, haversineKm, travel, applyOverride, computeDay, summarizeCourse };
});
```

- [ ] **Step 4: 통과 확인** — Run: `node --test tests/` → PASS (11 tests)
- [ ] **Step 5: Commit** — `git add schedule.js tests/schedule.test.js && git commit -m "feat: 일정 계산 모듈"`

---

### Task 2: 장소·일정 데이터 조사와 작성

**Files:**
- Create: `data/places.js`, `data/itinerary.js`
- Test: `tests/data.test.js`
- Modify: `작업일지.md` (출처 목록)

**Interfaces:**
- Consumes: `Stop`, `Day` 타입(Task 1)
- Produces: `window.PLACES: Record<id, Place>`, `window.COURSES: {recommended:{name, days:Day[]}, full:{name, days:Day[]}}`, `window.TRIP: {title, dates, party, sunset:{d1,d2,d3}, flightDefault:{arrive:'11:00', depart:'21:00'}, kidFood:string[], checklist:{id,text}[]}`
- `Place = {id, name, type:'airport'|'sight'|'food'|'cafe'|'stay'|'rest', lat, lng, sticker, photo:{url,credit}|null, alt?:placeId, info:{address, hours, price, stay, parking, stroller, nursing, kids, lastOrder?, closed?}, links:{label,url}[], menu?:{adult:string[], baby8m:string, toddler16m:string, status, source}}` — `info` 각 필드 `{value:string, status:'verified'|'check', source?:url, checked?:'2026-10-12'}`

- [ ] **Step 1: 실패하는 데이터 검증 테스트** — `tests/data.test.js`

```js
const test = require('node:test');
const assert = require('node:assert/strict');
global.window = {};
require('../data/places.js');
require('../data/itinerary.js');
const { PLACES, COURSES, TRIP } = global.window;

const inJeju = (p) => p.lat > 33.1 && p.lat < 33.6 && p.lng > 126.1 && p.lng < 127.0;

test('모든 장소 좌표가 제주 안', () => {
  for (const p of Object.values(PLACES)) assert.ok(inJeju(p), `${p.id} 좌표 이상`);
});
test('모든 info 필드에 status, verified면 source', () => {
  for (const p of Object.values(PLACES)) for (const [k, f] of Object.entries(p.info)) {
    assert.ok(['verified', 'check'].includes(f.status), `${p.id}.${k}`);
    if (f.status === 'verified') assert.match(f.source || '', /^https?:\/\//, `${p.id}.${k} 출처`);
  }
});
test('식당은 메뉴 3구분', () => {
  for (const p of Object.values(PLACES).filter((x) => x.type === 'food')) {
    assert.ok(p.menu && Array.isArray(p.menu.adult) && typeof p.menu.baby8m === 'string' && typeof p.menu.toddler16m === 'string', p.id);
  }
});
test('일정의 placeId와 alt가 모두 존재, stop id 유일', () => {
  for (const c of Object.values(COURSES)) for (const d of c.days) {
    const ids = new Set();
    for (const s of d.stops) {
      assert.ok(PLACES[s.placeId], `${d.id}:${s.placeId}`);
      assert.ok(!ids.has(s.id), `중복 ${s.id}`); ids.add(s.id);
    }
  }
  for (const p of Object.values(PLACES)) if (p.alt) assert.ok(PLACES[p.alt], `${p.id}.alt`);
});
test('추천 코스 고정 일정과 기준', () => {
  const d2 = COURSES.recommended.days[1];
  assert.ok(d2.stops.some((s) => s.fixedAt === '15:00'));
  assert.ok(d2.stops.some((s) => s.fixedAt === '15:30'));
  assert.deepEqual(TRIP.flightDefault, { arrive: '11:00', depart: '21:00' });
  assert.equal(COURSES.recommended.days[2].deadline.offset, -120);
});
test('전체 코스가 추천 코스보다 장소가 많음', () => {
  const n = (c) => c.days.reduce((a, d) => a + d.stops.length, 0);
  assert.ok(n(COURSES.full) > n(COURSES.recommended));
});
```

- [ ] **Step 2: 실패 확인** — Run: `node --test tests/data.test.js` → FAIL (파일 없음)

- [ ] **Step 3: 조사** — 장소별로 아래를 수행하고 결과를 `작업일지.md`의 "출처" 표에 적는다.
  - 카카오맵 장소검색(`KakaotalkMap SearchPlaceByKeyword`)으로 좌표·주소·전화. 대상: 제주국제공항, 성산갈치맛집, 아쿠아플라넷 제주, 섭지코지, 표선해녀의집, 제주해양경찰수련원, 당케올레국수, 휴애리 자연생활공원, 중문어촌계 해녀의집, 서머셋 제주신화월드, 제주신화월드(수영장), 난드르바당, 고바진, 신화테마파크, 아침미소목장, 용담해안도로(카페 지점), 착한집, 도도리고기국수, 해일리 베이커리 카페, 롯데렌터카 등 반납지는 '렌터카 반납(업체 미정)'로 공항 인근 좌표 + 확인 필요.
  - 제주해양경찰수련원: 주소·전화 대조, 유사 명칭(해양경찰교육원 등) 혼동 여부 작업일지에 기록.
  - 공식 홈페이지(WebSearch/WebFetch): 아쿠아플라넷 운영시간·요금·공연, 신화월드 수영장 10월 운영·시간·영유아 규정·투숙객 조건, 신화테마파크 운영시간·영유아 시설, 휴애리 운영시간·요금, 아침미소목장 운영·송아지 우유주기.
  - 식당: 영업시간·휴무·마지막 주문·대표 메뉴·유아의자. 블로그만 있으면 `check`.
  - 일몰: `python -c` 계산(NOAA 식)으로 10/16~18 제주(33.45N,126.56E) 일몰 → `TRIP.sunset`.
  - 사진: 위키미디어 공용에서 라이선스 확인된 것만 `photo`, 없으면 `null`.

- [ ] **Step 4: 데이터 작성** — `data/places.js`는 다음 형식으로 전 장소를 작성(필드값은 Step 3 결과, 미확인은 `status:'check', value:'확인 필요'`).

```js
window.PLACES = {
  airport: {
    id: 'airport', name: '제주국제공항', type: 'airport', lat: 33.5066, lng: 126.4929, sticker: 'plane', photo: null,
    info: {
      address: { value: '제주특별자치도 제주시 공항로 2', status: 'verified', source: 'https://place.map.kakao.com/...', checked: '2026-10-12' },
      hours: { value: '확인 필요', status: 'check' },
      // price, stay, parking, stroller, nursing, kids 동일 형식
    },
    links: [{ label: '공식 홈페이지', url: 'https://www.airport.co.kr/jeju/' }],
  },
  // ... 나머지 장소
};
```

`data/itinerary.js`는 스펙 2절 일정을 Day/Stop으로 옮긴다. 체류시간은 확정 일정의 시각 차이에서 이동시간을 뺀 값으로 잡는다. 필수 속성:
  - d1: `start:{type:'flightArrive', offset:75}`, `softEnd:'20:30'`, 섭지코지 `optional:true, outdoor:true`
  - d2: `start:{type:'time', at:'08:00'}`, 당케올레국수 `optional:true`, 체크인 `fixedAt:'15:00'`, 수영 `fixedAt:'15:30'`, 휴애리 `outdoor:true`
  - d3: `start:{type:'time', at:'08:00'}`, `deadline:{type:'flightDepart', offset:-120}`, 아침미소목장 `optional:true, outdoor:true`, 용담 카페 `optional:true`
  - 각 날 첫/마지막 stop `locked:true`
  - `full` 코스 = recommended 복제 + d1에 해일리 베이커리 카페(아쿠아플라넷 다음, stay 40, optional) 추가, 선택 일정 모두 포함
  - `TRIP.kidFood`, `TRIP.checklist`는 사용자 확정 텍스트의 '아이 식사', '출발 전 확인' 항목 그대로

- [ ] **Step 5: 통과 확인** — Run: `node --test tests/` → PASS
- [ ] **Step 6: Commit** — `git add data tests/data.test.js 작업일지.md && git commit -m "feat: 장소·일정 데이터(검증 상태·출처 포함)"`

---

### Task 3: 도로 경로 생성

**Files:**
- Create: `tools/build-routes.py`, `data/routes.js` (생성물)
- Modify: `tests/data.test.js` (경로 테스트 추가)

**Interfaces:**
- Consumes: `window.PLACES`, `window.COURSES`
- Produces: `window.ROUTES: Record<'a>b', {minutes:number, km:number, coords:[lat,lng][], source:'OSRM'}>`

- [ ] **Step 1: 실패하는 테스트 추가** — `tests/data.test.js` 끝에

```js
require('../data/routes.js');
test('두 코스의 모든 인접 구간에 도로 경로', () => {
  const S = require('../schedule.js');
  const { ROUTES } = global.window;
  for (const c of Object.values(COURSES)) for (const d of c.days) for (let i = 0; i < d.stops.length - 1; i++) {
    const a = PLACES[d.stops[i].placeId], b = PLACES[d.stops[i + 1].placeId];
    const t = S.travel(a, b, ROUTES);
    assert.notEqual(t.kind, 'straight', `${a.id}>${b.id}`);
  }
  for (const r of Object.values(ROUTES)) { assert.ok(r.coords.length >= 2); assert.ok(r.minutes > 0); }
});
```

- [ ] **Step 2: 실패 확인** — `node --test tests/data.test.js` → FAIL (routes.js 없음)

- [ ] **Step 3: 스크립트 작성** — `tools/build-routes.py`

```python
"""itinerary의 모든 인접 구간을 OSRM으로 조회해 data/routes.js 생성. 실행: python -I tools/build-routes.py"""
import json, re, subprocess, sys, time, urllib.request, pathlib
try:
    import truststore; truststore.inject_into_ssl()
except ImportError:
    pass
ROOT = pathlib.Path(__file__).resolve().parent.parent
js = ("global.window={};require(process.argv[1]);require(process.argv[2]);"
      "process.stdout.write(JSON.stringify({p:window.PLACES,c:window.COURSES}))")
out = subprocess.run(["node", "-e", js, str(ROOT/"data/places.js"), str(ROOT/"data/itinerary.js")],
                     capture_output=True, text=True, encoding="utf-8", check=True).stdout
data = json.loads(out)
P, C = data["p"], data["c"]
pairs = []
for course in C.values():
    for day in course["days"]:
        ids = [s["placeId"] for s in day["stops"]]
        for a, b in zip(ids, ids[1:]):
            if a != b and (a, b) not in pairs and (b, a) not in pairs:
                pairs.append((a, b))
routes = {}
for a, b in pairs:
    pa, pb = P[a], P[b]
    url = (f"https://router.project-osrm.org/route/v1/driving/{pa['lng']},{pa['lat']};{pb['lng']},{pb['lat']}"
           "?overview=simplified&geometries=geojson")
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "jeju-family-trip/1.0"}), timeout=30) as r:
        res = json.load(r)
    if res.get("code") != "Ok":
        print("FAIL", a, b, res.get("code")); continue
    rt = res["routes"][0]
    if rt["distance"] < 300:  # 같은 단지 내 이동
        continue
    coords = [[round(lat, 5), round(lng, 5)] for lng, lat in rt["geometry"]["coordinates"]]
    routes[f"{a}>{b}"] = {"minutes": max(5, round(rt["duration"] / 60)), "km": round(rt["distance"] / 1000, 1),
                          "coords": coords, "source": "OSRM"}
    print(f"{a}>{b}: {routes[f'{a}>{b}']['minutes']}분 {routes[f'{a}>{b}']['km']}km")
    time.sleep(1)
(ROOT/"data/routes.js").write_text(
    "// 생성 파일: python -I tools/build-routes.py (OSRM 추정치)\nwindow.ROUTES = " + json.dumps(routes, ensure_ascii=False) + ";\n",
    encoding="utf-8")
print(len(routes), "routes")
```

- [ ] **Step 4: 실행** — `python -I tools/build-routes.py` → 구간별 분/km 출력, `data/routes.js` 생성. 300m 미만 구간은 `travel()`이 `none` 처리하므로 테스트 통과 대상.
- [ ] **Step 5: 통과 확인** — `node --test tests/` → PASS
- [ ] **Step 6: Commit** — `git add tools data/routes.js tests/data.test.js && git commit -m "feat: OSRM 도로 경로 데이터"`

---

### Task 4: 앱 뼈대·지도·스티커

**Files:**
- Create: `index.html`, `styles.css`, `app.js`, `assets/stickers.js`, `storage.js`
- Test: `tests/storage.test.js`

**Interfaces:**
- Consumes: `Schedule.*`, `PLACES`, `COURSES`, `TRIP`, `ROUTES`
- Produces:
  - `Store = {get(key, fallback), set(key, value), ok:boolean}` (`storage.js`, 키 접두사 `jejutrip:v1:`)
  - `window.STICKERS: Record<name, svgString>` (plane, fish, fishcake, haenyeo, dolhareubang, tangerine, cow, swim, house, coffee, noodle, rest, flower, car)
  - app 상태 `state = {tab:'all'|'d1'|'d2'|'d3', course:'recommended'|'full', selected:stopId|null, editing:boolean}`
  - 함수 `render()`, `renderMap(results)`, `focusStop(stopId)`

- [ ] **Step 1: storage 실패 테스트** — `tests/storage.test.js`

```js
const test = require('node:test');
const assert = require('node:assert/strict');
test('localStorage 없거나 throw해도 동작 (Review4)', () => {
  global.window = { localStorage: { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } } };
  delete require.cache[require.resolve('../storage.js')];
  const Store = require('../storage.js');
  Store.set('x', { a: 1 });
  assert.deepEqual(Store.get('x', null), { a: 1 });
  assert.equal(Store.ok, false);
});
test('정상 localStorage 왕복', () => {
  const mem = {};
  global.window = { localStorage: { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); } } };
  delete require.cache[require.resolve('../storage.js')];
  const Store = require('../storage.js');
  Store.set('y', [1, 2]);
  assert.deepEqual(Store.get('y', []), [1, 2]);
  assert.ok(Object.keys(mem)[0].startsWith('jejutrip:v1:'));
});
```

- [ ] **Step 2: 실패 확인** — `node --test tests/storage.test.js` → FAIL
- [ ] **Step 3: storage.js 구현**

```js
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Store = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const P = 'jejutrip:v1:';
  const mem = {};
  let ok = true;
  const ls = () => (typeof window !== 'undefined' ? window.localStorage : undefined);
  try { const s = ls(); s.setItem(P + '__t', '1'); s.getItem(P + '__t'); } catch (e) { ok = false; }
  return {
    get ok() { return ok; },
    get(key, fallback) {
      if (ok) { try { const v = ls().getItem(P + key); if (v != null) return JSON.parse(v); } catch (e) { /* 손상값 무시 */ } }
      return key in mem ? mem[key] : fallback;
    },
    set(key, value) {
      mem[key] = value;
      if (ok) { try { ls().setItem(P + key, JSON.stringify(value)); } catch (e) { ok = false; } }
    },
  };
});
```

- [ ] **Step 4: 통과 확인** — `node --test tests/` → PASS
- [ ] **Step 5: index.html** — 구조

```html
<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#FBF6EC">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <title>우리 가족 제주 여행지도</title>
  <link rel="manifest" href="manifest.json">
  <link rel="icon" href="assets/icon.svg">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Gowun+Dodum&family=Jua&display=swap">
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header class="top">
    <div class="title-row"><h1>우리 가족 제주 여행지도</h1><span class="dates">10.16 금 – 10.18 일</span></div>
    <nav class="tabs" role="tablist"></nav>
    <div class="tools"><button id="btn-flight" class="chip"></button><button id="btn-course" class="chip"></button><button id="btn-edit" class="chip">✏️ 편집</button></div>
  </header>
  <main>
    <div id="map" aria-label="제주 지도"></div>
    <section id="sheet" class="sheet"><div class="grip"></div><div id="sheet-body"></div></section>
  </main>
  <div id="detail" class="detail" hidden></div>
  <dialog id="flight-dlg"></dialog>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
  <script src="storage.js"></script><script src="schedule.js"></script>
  <script src="data/places.js"></script><script src="data/itinerary.js"></script><script src="data/routes.js"></script>
  <script src="assets/stickers.js"></script><script src="app.js"></script>
</body>
</html>
```

- [ ] **Step 6: styles.css** — 디자인 토큰과 레이아웃

```css
:root{--ivory:#FBF6EC;--paper:#FFFDF8;--ink:#2F3A3A;--muted:#6B7774;--sea:#1FA2A6;--tang:#F08A3C;--farm:#5BAA5B;
  --sand:#F3E6CF;--line:#E7DCC6;--warn:#C2541F;--ok:#2E7D5B;--r:18px;--shadow:0 6px 18px rgba(60,50,30,.12);}
*{box-sizing:border-box}html,body{margin:0;height:100%;background:var(--ivory);color:var(--ink);
  font:15px/1.5 "Gowun Dodum",system-ui,-apple-system,sans-serif;-webkit-text-size-adjust:100%}
h1,.display{font-family:"Jua",sans-serif;font-weight:400}
.top{position:sticky;top:0;z-index:1000;padding:calc(env(safe-area-inset-top) + 8px) 16px 8px;background:var(--ivory);border-bottom:1px solid var(--line)}
.title-row{display:flex;align-items:baseline;justify-content:space-between;gap:8px}.title-row h1{margin:0;font-size:22px}
.tabs{display:flex;gap:6px;overflow-x:auto;margin:8px 0 6px}
.tabs button,.chip{min-height:44px;padding:0 14px;border-radius:999px;border:1.5px solid var(--line);background:var(--paper);font:inherit;color:var(--ink);white-space:nowrap}
.tabs button[aria-selected=true]{background:var(--ink);color:#fff;border-color:var(--ink)}
.tools{display:flex;gap:6px;overflow-x:auto}
main{display:flex;flex-direction:column;height:calc(100dvh - var(--top-h,150px))}
#map{flex:0 0 55%;min-height:260px}
.leaflet-tile-pane{filter:saturate(.75) sepia(.12) brightness(1.04)}
.sheet{flex:1;overflow-y:auto;background:var(--paper);border-radius:var(--r) var(--r) 0 0;box-shadow:var(--shadow);margin-top:-14px;position:relative;z-index:500;padding:6px 16px calc(env(safe-area-inset-bottom) + 24px)}
.grip{width:40px;height:5px;border-radius:3px;background:var(--line);margin:4px auto 10px}
.card{display:grid;grid-template-columns:52px 1fr;gap:10px;padding:12px;border-radius:var(--r);background:#fff;border:1.5px solid var(--line);margin-bottom:10px}
.card.active{border-color:var(--day,var(--sea));box-shadow:0 0 0 3px color-mix(in srgb,var(--day,var(--sea)) 25%,transparent)}
.card .time{font-family:"Jua";font-size:18px}.card .name{font-weight:700;font-size:16px}
.badge{display:inline-block;font-size:12px;padding:2px 8px;border-radius:999px;background:var(--sand);margin-right:4px}
.badge.fixed{background:#FFE9A8}.badge.warn{background:#FCE1D4;color:var(--warn)}.badge.check{background:#FFF1C9}
.drive{font-size:13px;color:var(--muted);margin:2px 0 10px 62px}
.kid{font-size:14px;color:#4b5b58}.btn{min-height:44px;padding:0 14px;border-radius:12px;border:none;background:var(--sea);color:#fff;font:inherit}
.btn.ghost{background:transparent;color:var(--sea);border:1.5px solid var(--sea)}
.warnbox{background:#FFF4EC;border:1.5px solid #F6C9AE;border-radius:14px;padding:10px 12px;margin:8px 0;font-size:14px}
.sticker{width:48px;height:48px;filter:drop-shadow(0 2px 2px rgba(0,0,0,.18))}
.pin{position:relative}.pin .num{position:absolute;right:-6px;top:-6px;width:22px;height:22px;border-radius:50%;color:#fff;font:13px/22px "Jua";text-align:center;border:2px solid #fff}
.pin.active .sticker{transform:scale(1.25)}
.route-label{background:#fff;border-radius:999px;padding:1px 8px;font-size:12px;border:1px solid var(--line);white-space:nowrap}
.detail{position:fixed;inset:0;z-index:2000;background:rgba(40,35,25,.35);display:flex;align-items:flex-end}
.detail .panel{background:var(--paper);width:100%;max-height:88dvh;overflow-y:auto;border-radius:22px 22px 0 0;padding:16px 16px calc(env(safe-area-inset-bottom) + 24px)}
.info-row{display:grid;grid-template-columns:96px 1fr;gap:8px;padding:8px 0;border-bottom:1px dashed var(--line);font-size:15px}
.ok{color:var(--ok)}.chk{color:#9A6B00}
@media (min-width:900px){main{flex-direction:row}#map{flex:1 1 60%;height:100%}.sheet{flex:0 0 420px;margin:0;border-radius:0}}
```

- [ ] **Step 7: assets/stickers.js** — 14개 스티커를 둥근 흰 테두리 + 파스텔 채색의 단순 SVG(48×48 viewBox)로 정의. 예:

```js
window.STICKERS = {
  tangerine: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="22" fill="#fff"/><circle cx="24" cy="26" r="15" fill="#F7A440"/><path d="M24 11c3-4 8-4 10-2-3 3-7 3-10 2z" fill="#5BAA5B"/><circle cx="19" cy="22" r="2.5" fill="#FFD08A"/></svg>',
  fish: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="22" fill="#fff"/><ellipse cx="22" cy="24" rx="13" ry="8" fill="#5CC6C9"/><path d="M34 24l8-6v12z" fill="#1FA2A6"/><circle cx="16" cy="22" r="2" fill="#2F3A3A"/></svg>',
  // plane, fishcake, haenyeo, dolhareubang, cow, swim, house, coffee, noodle, rest, flower, car 동일 스타일
};
```

- [ ] **Step 8: app.js 지도 부분** — 초기화와 경로·마커

```js
const DAY_IDS = ['d1', 'd2', 'd3'];
const state = { tab: Store.get('tab', 'all'), course: Store.get('course', 'recommended'), selected: null, editing: false };
const flight = () => Store.get('flight', null);
const flightOrDefault = () => flight() || TRIP.flightDefault;
const overrideFor = (dayId) => Store.get(`ov:${state.course}:${dayId}`, null);

function compute() {
  return COURSES[state.course].days.map((d) => Schedule.computeDay(d, {
    places: PLACES, routes: ROUTES, flight: flightOrDefault(), override: overrideFor(d.id), sunset: TRIP.sunset[d.id] }));
}

const map = L.map('map', { zoomControl: false, attributionControl: true }).setView([33.38, 126.55], 10);
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
  subdomains: 'abcd', maxZoom: 19, attribution: '&copy; OpenStreetMap &copy; CARTO' }).addTo(map);
const layer = L.layerGroup().addTo(map);
const markers = {};

function pinIcon(row, n, color, active) {
  return L.divIcon({ className: '', iconSize: [48, 48], iconAnchor: [24, 24],
    html: `<div class="pin ${active ? 'active' : ''}"><div class="sticker">${STICKERS[row.place.sticker] || STICKERS.flower}</div><span class="num" style="background:${color}">${n}</span></div>` });
}

function renderMap(results) {
  layer.clearLayers();
  Object.keys(markers).forEach((k) => delete markers[k]);
  const shown = state.tab === 'all' ? results : results.filter((r) => r.day.id === state.tab);
  const bounds = [];
  shown.forEach((r) => {
    r.rows.forEach((row, i) => {
      if (row.toNext && row.toNext.kind !== 'none') {
        const line = L.polyline(row.toNext.coords, { color: r.day.color, weight: 5, opacity: .9,
          dashArray: row.toNext.kind === 'straight' ? '6 8' : null }).addTo(layer);
        const mid = row.toNext.coords[Math.floor(row.toNext.coords.length / 2)];
        if (state.tab !== 'all') L.marker(mid, { interactive: false, icon: L.divIcon({ className: '', iconSize: null,
          html: `<span class="route-label">🚗 ${row.toNext.minutes}분${row.toNext.kind === 'straight' ? ' 직선추정' : ' 추정'}</span>` }) }).addTo(layer);
        bounds.push(...row.toNext.coords);
      }
      const m = L.marker([row.place.lat, row.place.lng], { icon: pinIcon(row, i + 1, r.day.color, state.selected === row.stop.id) })
        .on('click', () => { focusStop(row.stop.id, { fromMap: true }); openDetail(row.stop.id); })
        .addTo(layer);
      markers[row.stop.id] = m;
      bounds.push([row.place.lat, row.place.lng]);
    });
  });
  if (bounds.length) map.fitBounds(bounds, { padding: [30, 30] });
}
```

- [ ] **Step 9: 수동 확인** — `python -m http.server 5173` 후 브라우저에서 지도·경로·마커가 보이는지 확인
- [ ] **Step 10: Commit** — `git add . && git commit -m "feat: 앱 뼈대, 지도, 스티커, 저장소"`

---

### Task 5: 타임라인·상세·카드↔마커 연동

**Files:**
- Modify: `app.js`

**Interfaces:**
- Consumes: Task 4 `state`, `markers`, `compute()`, `renderMap()`
- Produces: `renderSheet(results)`, `openDetail(stopId)`, `focusStop(stopId, {fromMap})`, `kakaoLink(place)`

- [ ] **Step 1: 구현** — app.js에 추가

```js
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const KIND = { visit: '관광', meal: '식사', rest: '휴식', stay: '숙소', transfer: '이동' };
const kakaoLink = (p) => `https://map.kakao.com/link/to/${encodeURIComponent(p.name)},${p.lat},${p.lng}`;
const F = Schedule.fmt;

function cardHTML(r, row, i) {
  const s = row.stop, p = row.place;
  const ws = r.warnings.filter((w) => w.stopId === s.id);
  return `<article class="card ${state.selected === s.id ? 'active' : ''}" data-stop="${s.id}" style="--day:${r.day.color}">
    <div class="sticker">${STICKERS[p.sticker] || STICKERS.flower}</div>
    <div>
      <div class="time">${F(row.start)}${row.wait ? ` <span class="badge">대기 ${row.wait}분</span>` : ''}</div>
      <div class="name">${i + 1}. ${esc(s.label || p.name)}</div>
      <div><span class="badge">${KIND[s.kind]}</span>${s.stay ? `<span class="badge">${s.stay}분</span>` : ''}${s.fixedAt ? '<span class="badge fixed">⭐ 고정</span>' : ''}${s.optional ? '<span class="badge">생략 가능</span>' : ''}</div>
      ${s.note ? `<div class="kid">👶 ${esc(s.note)}</div>` : ''}
      ${ws.map((w) => `<div class="badge warn">⚠️ ${esc(w.message)}</div>`).join('')}
      <div style="display:flex;gap:6px;margin-top:8px"><a class="btn" href="${kakaoLink(p)}" target="_blank" rel="noopener">카카오맵 길찾기</a><button class="btn ghost" data-detail="${s.id}">상세</button></div>
      ${state.editing && !s.locked ? editControls(r, s) : ''}
    </div></article>
    ${row.toNext && row.toNext.kind !== 'none' ? `<div class="drive">🚗 ${row.toNext.minutes}분 · ${row.toNext.km}km (${row.toNext.kind === 'road' ? 'OSRM 추정' : '직선거리 추정'})</div>` : ''}`;
}

function dayHTML(r) {
  const top = [...r.warnings.filter((w) => !w.stopId), ...r.suggestions.map((s) => ({ message: '💡 ' + s.message }))];
  return `<h2 class="display" style="color:${r.day.color}">${esc(r.day.label)}</h2>
    ${top.length ? `<div class="warnbox">${top.map((w) => `<div>${esc(w.message)}</div>`).join('')}</div>` : ''}
    ${r.rows.map((row, i) => cardHTML(r, row, i)).join('')}
    ${r.excluded.length ? `<div class="warnbox">제외한 장소: ${r.excluded.map((s) => `<button class="chip" data-restore="${r.day.id}:${s.id}">＋ ${esc(PLACES[s.placeId].name)}</button>`).join(' ')}</div>` : ''}`;
}

function renderSheet(results) {
  const body = document.getElementById('sheet-body');
  const days = state.tab === 'all' ? results : results.filter((r) => r.day.id === state.tab);
  body.innerHTML = (state.tab === 'all' ? overviewHTML(results) : '') + days.map(dayHTML).join('');
}

function focusStop(stopId, { fromMap } = {}) {
  state.selected = stopId;
  const results = compute();
  const row = results.flatMap((r) => r.rows).find((x) => x.stop.id === stopId);
  if (row) map.flyTo([row.place.lat, row.place.lng], Math.max(map.getZoom(), 13), { duration: .6 });
  Object.entries(markers).forEach(([id, m]) => {
    const r = results.find((rr) => rr.rows.some((x) => x.stop.id === id));
    const i = r.rows.findIndex((x) => x.stop.id === id);
    m.setIcon(pinIcon(r.rows[i], i + 1, r.day.color, id === stopId));
  });
  document.querySelectorAll('.card').forEach((c) => c.classList.toggle('active', c.dataset.stop === stopId));
  if (fromMap) document.querySelector(`.card[data-stop="${stopId}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function infoRow(label, f) {
  if (!f) return '';
  const tag = f.status === 'verified'
    ? `<span class="ok">✅ 확인${f.source ? ` · <a href="${esc(f.source)}" target="_blank" rel="noopener">출처</a>` : ''}${f.checked ? ` (${f.checked})` : ''}</span>`
    : '<span class="chk">⚠️ 확인 필요</span>';
  return `<div class="info-row"><b>${label}</b><div>${esc(f.value)}<br><small>${tag}</small></div></div>`;
}

function openDetail(stopId) {
  const row = compute().flatMap((r) => r.rows).find((x) => x.stop.id === stopId);
  if (!row) return;
  const p = row.place, I = p.info, el = document.getElementById('detail');
  const menu = p.menu ? `<h3>메뉴</h3><div class="tabs" role="tablist">
      <button aria-selected="true" data-mt="adult">어른</button><button data-mt="baby8m">8개월</button><button data-mt="toddler16m">16개월</button></div>
      <div id="menu-body">${(p.menu.adult || []).map(esc).join('<br>')}</div>
      <small>${p.menu.status === 'verified' ? '✅ 메뉴 확인' : '⚠️ 메뉴 확인 필요'}${p.menu.source ? ` · <a href="${esc(p.menu.source)}" target="_blank" rel="noopener">출처</a>` : ''}</small>
      ${p.alt ? `<p>대안 식당: <b>${esc(PLACES[p.alt].name)}</b> <a href="${kakaoLink(PLACES[p.alt])}" target="_blank" rel="noopener">길찾기</a></p>` : ''}` : '';
  el.innerHTML = `<div class="panel" role="dialog" aria-label="${esc(p.name)}">
    <button class="chip" data-close>닫기</button>
    <div style="text-align:center">${p.photo ? `<img src="${esc(p.photo.url)}" alt="${esc(p.name)}" style="width:100%;border-radius:16px"><small>${esc(p.photo.credit)}</small>` : `<div class="sticker" style="width:96px;height:96px;margin:auto">${STICKERS[p.sticker] || STICKERS.flower}</div>`}</div>
    <h2 class="display">${esc(p.name)}</h2>
    ${infoRow('주소', I.address)}${infoRow('운영시간', I.hours)}${infoRow('휴무', I.closed)}${infoRow('요금·가격', I.price)}${infoRow('추천 체류', I.stay)}
    ${infoRow('주차', I.parking)}${infoRow('유모차', I.stroller)}${infoRow('수유·기저귀', I.nursing)}${infoRow('아이 활동', I.kids)}
    ${menu}
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:12px"><a class="btn" href="${kakaoLink(p)}" target="_blank" rel="noopener">카카오맵 길찾기</a>
      ${(p.links || []).map((l) => `<a class="btn ghost" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join('')}</div></div>`;
  el.hidden = false;
  el.onclick = (e) => {
    if (e.target === el || e.target.matches('[data-close]')) el.hidden = true;
    const mt = e.target.dataset && e.target.dataset.mt;
    if (mt) {
      el.querySelectorAll('[data-mt]').forEach((b) => b.setAttribute('aria-selected', b === e.target));
      const v = p.menu[mt];
      el.querySelector('#menu-body').innerHTML = Array.isArray(v) ? v.map(esc).join('<br>') : esc(v);
    }
  };
}

document.getElementById('sheet-body').addEventListener('click', (e) => {
  const d = e.target.closest('[data-detail]'); if (d) return openDetail(d.dataset.detail);
  const c = e.target.closest('.card'); if (c && !e.target.closest('a,button')) focusStop(c.dataset.stop);
});
```

- [ ] **Step 2: 수동 확인** — 카드 탭 → 지도 이동·마커 확대, 마커 탭 → 카드 스크롤·상세 열림, 식당 메뉴 탭 전환
- [ ] **Step 3: Commit** — `git commit -am "feat: 타임라인, 상세, 카드-마커 연동"`

---

### Task 6: 탭·항공시간·코스 비교·편집·체크리스트

**Files:**
- Modify: `app.js`

**Interfaces:**
- Consumes: Task 4·5 함수, `Schedule.summarizeCourse`, `Store`
- Produces: `render()`, `overviewHTML(results)`, `editControls(r, stop)`, 저장 키 `tab`, `course`, `flight`, `ov:{course}:{dayId}`, `check:{id}`

- [ ] **Step 1: 구현**

```js
function render() {
  const results = compute();
  const tabs = [['all', '전체 일정'], ...COURSES[state.course].days.map((d) => [d.id, d.tab])];
  document.querySelector('.tabs').innerHTML = tabs.map(([id, t]) => `<button role="tab" aria-selected="${state.tab === id}" data-tab="${id}">${t}</button>`).join('');
  const f = flight();
  document.getElementById('btn-flight').textContent = f ? `✈️ ${f.arrive} 도착 · ${f.depart} 출발` : `✈️ ${TRIP.flightDefault.arrive}·${TRIP.flightDefault.depart} (가정)`;
  document.getElementById('btn-course').textContent = state.course === 'recommended' ? '🧸 추천 코스' : '🗺️ 전체 방문 코스';
  document.getElementById('btn-edit').textContent = state.editing ? '✅ 편집 완료' : '✏️ 편집';
  renderMap(results);
  renderSheet(results);
  document.documentElement.style.setProperty('--top-h', document.querySelector('.top').offsetHeight + 'px');
}

function overviewHTML(results) {
  const other = state.course === 'recommended' ? 'full' : 'recommended';
  const otherRes = COURSES[other].days.map((d) => Schedule.computeDay(d, { places: PLACES, routes: ROUTES, flight: flightOrDefault(), override: Store.get(`ov:${other}:${d.id}`, null), sunset: TRIP.sunset[d.id] }));
  const a = Schedule.summarizeCourse(state.course === 'recommended' ? results : otherRes);
  const b = Schedule.summarizeCourse(state.course === 'recommended' ? otherRes : results);
  const checks = TRIP.checklist.map((c) => `<label class="info-row" style="grid-template-columns:32px 1fr"><input type="checkbox" data-check="${c.id}" ${Store.get('check:' + c.id, false) ? 'checked' : ''} style="width:24px;height:24px"><span>${esc(c.text)}</span></label>`).join('');
  return `<div class="card" style="display:block"><h3 class="display">코스 비교</h3>
    <table style="width:100%;font-size:15px"><tr><th></th><th>추천</th><th>전체 방문</th></tr>
    <tr><td>장소 수</td><td>${a.stops}</td><td>${b.stops}</td></tr>
    <tr><td>총 운전</td><td>${a.driveMin}분</td><td>${b.driveMin}분</td></tr>
    <tr><td>여유·휴식</td><td>${a.slackMin}분</td><td>${b.slackMin}분</td></tr></table>
    <small>운전시간은 OSRM 기준 추정치</small></div>
    <div class="card" style="display:block"><h3 class="display">🍼 아이 식사</h3><ul>${TRIP.kidFood.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>
    <div class="card" style="display:block"><h3 class="display">📌 출발 전 확인</h3>${checks}</div>`;
}

function editControls(r, s) {
  return `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
    <button class="chip" data-mv="${r.day.id}:${s.id}:-1" aria-label="위로">▲</button>
    <button class="chip" data-mv="${r.day.id}:${s.id}:1" aria-label="아래로">▼</button>
    <button class="chip" data-st="${r.day.id}:${s.id}:-10">−10분</button>
    <button class="chip" data-st="${r.day.id}:${s.id}:10">＋10분</button>
    <button class="chip" data-ex="${r.day.id}:${s.id}">제외</button></div>`;
}

function updateOv(dayId, fn) {
  const key = `ov:${state.course}:${dayId}`;
  const ov = Store.get(key, null) || {};
  const day = COURSES[state.course].days.find((d) => d.id === dayId);
  const cur = Schedule.applyOverride(day.stops, ov).stops.map((s) => s.id);
  fn(ov, cur, day);
  Store.set(key, ov);
  render();
}

document.getElementById('sheet-body').addEventListener('click', (e) => {
  const t = e.target;
  if (t.dataset.mv) { const [d, id, dir] = t.dataset.mv.split(':'); updateOv(d, (ov, cur, day) => {
      const i = cur.indexOf(id), j = i + Number(dir);
      const locked = new Set(day.stops.filter((s) => s.locked).map((s) => s.id));
      if (j <= 0 || j >= cur.length || locked.has(cur[j])) return;
      [cur[i], cur[j]] = [cur[j], cur[i]]; ov.order = cur; }); }
  if (t.dataset.st) { const [d, id, delta] = t.dataset.st.split(':'); updateOv(d, (ov, cur, day) => {
      const base = (ov.stay && ov.stay[id]) ?? day.stops.find((s) => s.id === id).stay;
      ov.stay = { ...(ov.stay || {}), [id]: Math.max(0, base + Number(delta)) }; }); }
  if (t.dataset.ex) { const [d, id] = t.dataset.ex.split(':'); updateOv(d, (ov) => { ov.excluded = [...new Set([...(ov.excluded || []), id])]; }); }
  if (t.dataset.restore) { const [d, id] = t.dataset.restore.split(':'); updateOv(d, (ov) => { ov.excluded = (ov.excluded || []).filter((x) => x !== id); }); }
});
document.getElementById('sheet-body').addEventListener('change', (e) => {
  if (e.target.dataset.check) Store.set('check:' + e.target.dataset.check, e.target.checked);
});
document.querySelector('.tabs').addEventListener('click', (e) => {
  const id = e.target.dataset.tab; if (!id) return; state.tab = id; state.selected = null; Store.set('tab', id); render();
});
document.getElementById('btn-course').onclick = () => { state.course = state.course === 'recommended' ? 'full' : 'recommended'; Store.set('course', state.course); render(); };
document.getElementById('btn-edit').onclick = () => { state.editing = !state.editing; render(); };
document.getElementById('btn-flight').onclick = () => {
  const dlg = document.getElementById('flight-dlg'), f = flightOrDefault();
  dlg.innerHTML = `<form method="dialog" class="panel"><h3 class="display">✈️ 항공시간</h3>
    <label class="info-row"><b>금 도착</b><input type="time" name="arrive" value="${f.arrive}" style="font-size:17px;min-height:44px"></label>
    <label class="info-row"><b>일 출발</b><input type="time" name="depart" value="${f.depart}" style="font-size:17px;min-height:44px"></label>
    <p><small>비워두면 11:00 도착 / 21:00 출발로 가정해요.</small></p>
    <div style="display:flex;gap:6px"><button class="btn" value="save">저장</button><button class="btn ghost" value="reset">가정값으로</button><button class="btn ghost" value="cancel">취소</button></div></form>`;
  dlg.showModal();
  dlg.onclose = () => {
    const fd = new FormData(dlg.querySelector('form'));
    if (dlg.returnValue === 'save' && fd.get('arrive') && fd.get('depart')) Store.set('flight', { arrive: fd.get('arrive'), depart: fd.get('depart') });
    if (dlg.returnValue === 'reset') Store.set('flight', null);
    render();
  };
};
// 편집 모드에서 '기본 일정으로 되돌리기'
document.getElementById('sheet-body').addEventListener('click', (e) => {
  if (e.target.dataset.reset) { Store.set(`ov:${state.course}:${e.target.dataset.reset}`, null); render(); }
});
render();
```

`dayHTML`의 제목 아래에 `state.editing`일 때 `<button class="chip" data-reset="${r.day.id}">기본 일정으로 되돌리기</button>`를 추가한다.

- [ ] **Step 2: 수동 확인** — 항공 13:30 입력 → DAY1 섭지코지 생략 제안, 일 15:00 → DAY3 마감 경고, 편집 ▲▼/±10/제외/복원/되돌리기, 새로고침 후 유지, 코스 전환 시 비교표 수치 변화
- [ ] **Step 3: Commit** — `git commit -am "feat: 항공시간, 코스 비교, 편집, 체크리스트"`

---

### Task 7: PWA와 아이콘

**Files:**
- Create: `manifest.json`, `sw.js`, `assets/icon.svg`
- Modify: `app.js` (서비스워커 등록)

- [ ] **Step 1: manifest.json**

```json
{ "name": "우리 가족 제주 여행지도", "short_name": "제주여행", "start_url": "./", "display": "standalone",
  "background_color": "#FBF6EC", "theme_color": "#FBF6EC",
  "icons": [{ "src": "assets/icon.svg", "sizes": "any", "type": "image/svg+xml", "purpose": "any" }] }
```

- [ ] **Step 2: sw.js** — 앱 파일은 캐시 우선, 타일은 네트워크 우선 후 캐시(최대 400장)

```js
const APP = 'jeju-app-v1', TILES = 'jeju-tiles-v1';
const FILES = ['./', 'index.html', 'styles.css', 'app.js', 'schedule.js', 'storage.js', 'data/places.js', 'data/itinerary.js', 'data/routes.js', 'assets/stickers.js', 'assets/icon.svg', 'manifest.json'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(APP).then((c) => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => ![APP, TILES].includes(k)).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (u.hostname.endsWith('basemaps.cartocdn.com')) {
    e.respondWith(fetch(e.request).then(async (r) => { const c = await caches.open(TILES); c.put(e.request, r.clone());
      const ks = await c.keys(); if (ks.length > 400) c.delete(ks[0]); return r; }).catch(() => caches.match(e.request)));
  } else if (u.origin === location.origin) {
    e.respondWith(fetch(e.request).then(async (r) => { (await caches.open(APP)).put(e.request, r.clone()); return r; }).catch(() => caches.match(e.request)));
  }
});
```

(앱 파일도 네트워크 우선으로 해서 수정 배포가 바로 반영되게 한다.)

- [ ] **Step 3: 등록** — app.js 끝: `if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});`
- [ ] **Step 4: assets/icon.svg** — 감귤 + 파도 원형 아이콘(512 viewBox)
- [ ] **Step 5: Commit** — `git add . && git commit -m "feat: PWA"`

---

### Task 8: 브라우저 동작 검증

**Files:**
- Create: `.claude/launch.json`
- Modify: 발견된 결함이 있는 파일, `작업일지.md`

- [ ] **Step 1:** `.claude/launch.json`에 `{"name":"jeju","runtimeExecutable":"python","runtimeArgs":["-m","http.server","5173"],"port":5173}` 추가 후 내장 브라우저 `preview_start`.
- [ ] **Step 2:** `resize_window` mobile(375×812). 확인 항목과 기대값:
  - 전체 탭: 3색 경로·마커 21개 내외, 비교표·체크리스트 표시
  - DAY1: 공항→수련원 경로, 구간 라벨 '추정', 마커 번호 순서
  - DAY2: 수영 카드 ⭐ 고정 배지, 대기/지연 표시
  - DAY3: 공항 도착 경고 없음(기본 항공)
  - 카드 탭→지도 이동, 마커 탭→상세, 식당 메뉴 3탭
  - 항공 13:30/15:00 입력 → 제안·경고 표시
  - 편집 후 새로고침 → 유지
  - `read_console_messages onlyErrors` → 0건
  - 글자·버튼 가독성 스크린샷 확인
- [ ] **Step 3:** 결함 수정 → `node --test tests/` 재실행 → 재확인
- [ ] **Step 4:** 작업일지 갱신, Commit `git commit -am "fix: 브라우저 검증 결함 수정"`

---

### Task 9: GitHub Pages 배포

- [ ] **Step 1:** 사용자에게 `gh auth login` 요청, `gh auth status` 확인
- [ ] **Step 2:** 공개 저장소 생성 직전 사용자 확인(일정·숙소명 공개)
- [ ] **Step 3:** `gh repo create jeju-trip --public --source . --push`
- [ ] **Step 4:** `gh api -X POST repos/{owner}/jeju-trip/pages -f "source[branch]=main" -f "source[path]=/"`
- [ ] **Step 5:** 배포 주소 접속 확인(내장 브라우저 모바일 크기), 작업일지에 주소 기록, Commit
