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
  assert.equal(S.fmt(24*60+10), '다음날 00:10');
  assert.equal(S.fmt(-30), '전날 23:30');
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
  const s2 = r.suggestions.find((s) => s.stopId === 's2');
  assert.ok(s2 && s2.saves >= 30);
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

test('운영 종료 이후 방문이면 closed 경고 + 생략 제안', () => {
  const places = { ...P, a: { ...P.a, info: { closeAt: { value: '18:00', status: 'verified' } } } };
  const ok = S.computeDay(day1, ctx({ places }));
  assert.ok(!ok.warnings.some((w) => w.type === 'closed'));
  const late = S.computeDay(day1, ctx({ places, flight: { arrive: '16:30', depart: '21:00' } }));
  assert.ok(late.warnings.some((w) => w.type === 'closed' && w.stopId === 's1'));
  assert.ok(late.suggestions.length > 0);
});

test('브레이크타임에 도착하면 재오픈까지 대기 + breakTime 경고', () => {
  const places = { ...P, c: { ...P.c, info: { breakTime: { value: '15:00~17:00', status: 'verified' } } } };
  const r = S.computeDay(day1, ctx({ places, flight: { arrive: '09:45', depart: '21:00' } }));
  const row = r.rows.find((x) => x.stop.id === 's3');
  assert.ok(row.arrive >= S.toMin('15:00') && row.arrive < S.toMin('17:00'), `도착 ${S.fmt(row.arrive)}`);
  assert.equal(S.fmt(row.start), '17:00');
  assert.ok(r.warnings.some((w) => w.type === 'breakTime' && w.stopId === 's3'));
});

test('운영시간 위반을 일으킨 일정 자체도 조정 제안에 포함', () => {
  const places = { ...P, a: { ...P.a, info: { closeAt: { value: '18:00', status: 'verified' } } } };
  const r = S.computeDay(day1, ctx({ places, flight: { arrive: '14:30', depart: '21:00' } }));
  assert.ok(r.warnings.some((w) => w.type === 'closed' && w.stopId === 's1'));
  assert.ok(r.suggestions.some((s) => s.stopId === 's1'), JSON.stringify(r.suggestions));
});
