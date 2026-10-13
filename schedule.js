// 일정 계산 모듈: 화면과 분리된 순수 함수 (브라우저: window.Schedule, Node: require)
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Schedule = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const toMin = (s) => { const [h, m] = String(s).split(':').map(Number); return h * 60 + m; };
  const pad = (n) => String(n).padStart(2, '0');
  const hhmm = (m) => `${pad(Math.floor(m / 60))}:${pad(Math.round(m % 60))}`;
  // 자정을 넘기거나 전날로 가면 '다음날/전날'을 붙여 24:52 같은 표기를 피한다
  const fmt = (m) => (m >= 1440 ? `다음날 ${hhmm(m - 1440)}` : m < 0 ? `전날 ${hhmm(m + 1440)}` : hhmm(m));

  function haversineKm(a, b) {
    const R = 6371, d = (x) => (x * Math.PI) / 180;
    const dLat = d(b.lat - a.lat), dLng = d(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(d(a.lat)) * Math.cos(d(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  // 저장된 도로 경로(양방향) 우선, 없으면 직선거리 x1.3 / 40km/h 를 5분 단위로 올림
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

  // 사용자 수정값 적용. 모르는 id는 무시하고, locked 일정은 제외·이동하지 않는다.
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
    let drive = 0;
    stops.forEach((stop, i) => {
      const place = places[stop.placeId];
      let arrive = startMin;
      if (i > 0) {
        const tr = rows[i - 1].toNext;
        arrive = rows[i - 1].depart + (tr ? tr.minutes : 0);
      }
      let start = arrive, wait = 0;
      const anchor = stop.fixedAt || stop.targetAt;
      if (anchor) { const f = toMin(anchor); if (f > arrive) { wait = f - arrive; start = f; } }
      let inBreak = false;
      const bt = place && place.info && place.info.breakTime;
      if (stop.kind === 'meal' && bt && bt.status === 'verified') {
        const [bs, be] = String(bt.value).split('~').map((x) => toMin(x.trim()));
        if (start >= bs && start < be) { wait += be - start; start = be; inBreak = true; }
      }
      const depart = start + (stop.stay || 0);
      const next = stops[i + 1];
      const toNext = next ? travel(place, places[next.placeId], routes) : null;
      if (toNext) drive += toNext.minutes;
      rows.push({ stop, place, arrive, start, depart, wait, toNext, inBreak });
    });
    return { rows, drive, endMin: rows.length ? rows[rows.length - 1].arrive : startMin };
  }

  // 시간 제약 위반: 고정 일정 지각, 공항 마감, 숙소 권장 도착
  function violations(day, ctx, sim) {
    const w = [];
    sim.rows.forEach((r) => {
      if (r.stop.latestAt && r.depart > toMin(r.stop.latestAt)) {
        const late = r.depart - toMin(r.stop.latestAt);
        w.push({ type: 'latestEnd', stopId: r.stop.id, minutes: late,
          message: `${r.stop.label || r.place.name} 완료가 마감(${r.stop.latestAt})보다 ${late}분 늦어요` });
      }
      if (r.stop.fixedAt && r.arrive > toMin(r.stop.fixedAt)) {
        const late = r.arrive - toMin(r.stop.fixedAt);
        w.push({ type: 'fixedLate', stopId: r.stop.id, minutes: late, message: `${r.place.name} ${r.stop.fixedAt} 고정 일정에 ${late}분 늦어요` });
      }
    });
    sim.rows.forEach((r) => {
      const ca = r.place && r.place.info && r.place.info.closeAt;
      if (r.stop.kind === 'visit' && ca && ca.status === 'verified' && r.depart > toMin(ca.value))
        w.push({ type: 'closed', stopId: r.stop.id, message: `${r.place.name} 운영 종료(${ca.value}) 이후까지 일정이 잡혀 있어요` });
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
    sim.rows.forEach((r) => {
      if (r.inBreak) warnings.push({ type: 'breakTime', stopId: r.stop.id,
        message: `${r.place.name} 브레이크타임(${r.place.info.breakTime.value})이라 ${fmt(r.start)} 재오픈까지 기다려요` });
    });
    const sunsetText = ctx.sunset || '17:50';
    const sunset = toMin(sunsetText);
    sim.rows.forEach((r) => {
      if (r.stop.outdoor && r.depart > sunset) warnings.push({ type: 'afterSunset', stopId: r.stop.id, message: `${r.place.name}는 일몰(${sunsetText}) 이후예요` });
      const lo = r.place && r.place.info && r.place.info.lastOrder;
      if (r.stop.kind === 'meal' && lo && lo.status === 'verified' && r.arrive > toMin(lo.value))
        warnings.push({ type: 'lastOrder', stopId: r.stop.id, message: `${r.place.name} 마지막 주문(${lo.value}) 이후 도착이에요` });
    });

    // 시간 제약을 어겼을 때 생략 가능 일정과, 운영시간 밖이 된 일정 자체를 절감 시간 순으로 제안
    const culprits = new Set(warnings.filter((w) => w.type === 'closed' || w.type === 'lastOrder').map((w) => w.stopId));
    const suggestions = [];
    if (hard || culprits.size) {
      stops.forEach((s) => {
        if (s.locked || !(s.optional || culprits.has(s.id))) return;
        const alt = simulate(stops.filter((x) => x.id !== s.id), ctx, startMin);
        const saves = sim.endMin - alt.endMin;
        const name = s.label || ctx.places[s.placeId].name;
        if (culprits.has(s.id)) suggestions.push({ stopId: s.id, saves: Math.max(saves, 0),
          message: `${name}: 운영시간 밖이에요. ✏️ 편집에서 앞으로 옮기거나 제외해 주세요` });
        else if (saves > 0) suggestions.push({ stopId: s.id, saves, message: `${name} 생략 시 ${saves}분 절약` });
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
