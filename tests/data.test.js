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
