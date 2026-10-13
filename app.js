/* 우리 가족 제주 여행지도 — 화면 */
(function () {
  const F = Schedule.fmt;
  const KIND = { visit: '관광', meal: '식사', rest: '휴식', stay: '숙소', transfer: '이동' };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const kakaoLink = (p) => `https://map.kakao.com/link/to/${encodeURIComponent(p.name)},${p.lat},${p.lng}`;
  const sticker = (name) => STICKERS[name] || STICKERS.tangerine;

  const validTab = (t) => ['all', 'd1', 'd2', 'd3'].includes(t) ? t : 'all';
  const state = {
    tab: validTab(Store.get('tab', 'all')),
    course: COURSES[Store.get('course', 'recommended')] ? Store.get('course', 'recommended') : 'recommended',
    selected: null,
    editing: false,
  };

  const savedFlight = () => {
    const f = Store.get('flight', null);
    return f && /^\d\d:\d\d$/.test(f.arrive) && /^\d\d:\d\d$/.test(f.depart) ? f : null;
  };
  const flightNow = () => savedFlight() || TRIP.flightDefault;
  const ovKey = (course, dayId) => `ov:${course}:${dayId}`;

  // 확정 항공편과 첫날 순서를 한 번 갱신. 이후 사용자가 편집한 값은 유지한다.
  if (Store.get('tripRevision', null) !== TRIP.revision) {
    if (savedFlight()) Store.set('flight', { ...TRIP.flightDefault });
    for (const course of Object.keys(COURSES)) {
      const key = ovKey(course, 'd1');
      const ov = Store.get(key, null);
      if (ov && ov.order) { const { order, ...rest } = ov; Store.set(key, rest); }
    }
    Store.set('tripRevision', TRIP.revision);
  }

  function computeCourse(course) {
    return COURSES[course].days.map((d) => Schedule.computeDay(d, {
      places: PLACES, routes: ROUTES, flight: flightNow(), override: Store.get(ovKey(course, d.id), null), sunset: TRIP.sunset[d.id],
    }));
  }
  const compute = () => computeCourse(state.course);
  // 같은 장소에 이어지는 일정은 같은 번호(지도 마커 하나)로 표시
  const placeNumbers = (r) => {
    const out = {}, seen = {};
    let n = 0;
    r.rows.forEach((row) => { if (!seen[row.place.id]) seen[row.place.id] = ++n; out[row.stop.id] = seen[row.place.id]; });
    return out;
  };
  const findRow = (results, stopId) => {
    for (const r of results) { const i = r.rows.findIndex((x) => x.stop.id === stopId); if (i >= 0) return { r, row: r.rows[i], i }; }
    return null;
  };

  /* ---------- 지도 ---------- */
  const HAS_MAP = typeof window.L !== 'undefined';
  if (!HAS_MAP) {
    document.getElementById('map').innerHTML = '<div style="padding:24px;text-align:center;color:#6B7774">🗺️ 지도를 불러오지 못했어요.<br>인터넷 연결 후 새로고침해 주세요.<br>일정과 카카오맵 길찾기는 아래에서 그대로 쓸 수 있어요.</div>';
    window.L = { map: () => ({ setView() { return this; }, fitBounds() {}, flyTo() {}, getZoom: () => 10, invalidateSize() {} }),
      tileLayer: () => ({ addTo() {} }), layerGroup: () => ({ addTo() { return this; }, clearLayers() {} }),
      polyline: () => ({ addTo() {} }), marker: () => ({ addTo() { return this; }, on() { return this; }, setIcon() {}, setZIndexOffset() {}, remove() {} }),
      divIcon: () => ({}), latLngBounds: () => null };
  }
  const map = L.map('map', { zoomControl: false, attributionControl: true, tap: false, zoomSnap: 0.25, zoomDelta: 0.5 }).setView([33.38, 126.55], 10);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> 기여자',
  }).addTo(map);
  const layer = L.layerGroup().addTo(map);
  let markers = {};
  let lastFitKey = '';
  let fitBounds = null;

  function pinIcon(color, n, stickerName, cls) {
    return L.divIcon({ className: '', iconSize: [38, 38], iconAnchor: [19, 19],
      html: `<div class="pin ${cls}">${sticker(stickerName)}<span class="n" style="background:${color}">${n}</span></div>` });
  }

  function renderMap(results, { refit } = {}) {
    layer.clearLayers();
    markers = {};
    const shown = state.tab === 'all' ? results : results.filter((r) => r.day.id === state.tab);
    const pts = [];
    shown.forEach((r) => {
      // 같은 장소에 여러 일정이 있으면 마커는 하나만(첫 번째 번호), 번호는 장소별로 표기
      const seen = {};
      const nums = placeNumbers(r);
      r.rows.forEach((row) => {
        const t = row.toNext;
        if (t && t.kind !== 'none') {
          L.polyline(t.coords, { color: '#fff', weight: 9, opacity: .85 }).addTo(layer);
          L.polyline(t.coords, { color: r.day.color, weight: 5, opacity: .95, dashArray: t.kind === 'straight' ? '4 10' : null, lineCap: 'round' }).addTo(layer);
          if (state.tab !== 'all') {
            const mid = t.coords[Math.floor(t.coords.length / 2)];
            L.marker(mid, { interactive: false, keyboard: false, icon: L.divIcon({ className: '', iconSize: [0, 0],
              html: `<span class="route-label">🚗 ${t.minutes}분${t.kind === 'straight' ? ' · 직선추정' : ''}</span>` }) }).addTo(layer);
          }
          pts.push(...t.coords);
        }
        if (seen[row.place.id]) { markers[row.stop.id] = seen[row.place.id]; return; }
        const n = nums[row.stop.id];
        const m = L.marker([row.place.lat, row.place.lng], {
          icon: pinIcon(r.day.color, n, row.place.sticker, state.selected === row.stop.id ? 'active' : ''),
          title: row.place.name, riseOnHover: true,
        }).on('click', () => { focusStop(row.stop.id, { fromMap: true }); openDetail(row.stop.id); }).addTo(layer);
        m._meta = { color: r.day.color, n, sticker: row.place.sticker };
        seen[row.place.id] = m;
        markers[row.stop.id] = m;
        pts.push([row.place.lat, row.place.lng]);
      });
    });
    fitBounds = pts.length ? L.latLngBounds(pts) : null;
    const key = `${state.tab}|${state.course}`;
    if (fitBounds && (refit || key !== lastFitKey)) { map.fitBounds(fitBounds, { padding: [22, 22], maxZoom: 13 }); lastFitKey = key; }
    const days = state.tab === 'all' ? results : shown;
    document.getElementById('legend').innerHTML = days.map((r) => `<span><i style="background:${r.day.color}"></i>${esc(r.day.tab)}</span>`).join('')
      + (shown.some((r) => r.rows.some((x) => x.toNext && x.toNext.kind === 'straight')) ? '<span>┄ 직선 추정</span>' : '');
  }

  function setActiveMarker(stopId) {
    const done = new Set();
    Object.entries(markers).forEach(([id, m]) => {
      if (done.has(m)) return;
      done.add(m);
      const active = Object.entries(markers).some(([sid, mm]) => mm === m && sid === stopId);
      m.setIcon(pinIcon(m._meta.color, m._meta.n, m._meta.sticker, active ? 'active' : (stopId ? 'dim' : '')));
      if (active) m.setZIndexOffset(1000); else m.setZIndexOffset(0);
    });
  }

  function focusStop(stopId, { fromMap } = {}) {
    state.selected = stopId;
    const hit = findRow(compute(), stopId);
    if (!hit) return;
    if (!fromMap) map.flyTo([hit.row.place.lat, hit.row.place.lng], Math.max(map.getZoom(), 13), { duration: .6 });
    setActiveMarker(stopId);
    document.querySelectorAll('.card').forEach((c) => c.classList.toggle('active', c.dataset.stop === stopId));
    if (fromMap) {
      if (state.tab !== 'all' && state.tab !== hit.r.day.id) return;
      document.querySelector(`.card[data-stop="${stopId}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  /* ---------- 타임라인 ---------- */
  function editControls(r, s) {
    const k = `${r.day.id}:${s.id}`;
    return `<div class="edit-row">
      <button class="chip small" type="button" data-mv="${k}:-1" aria-label="위로 이동">▲ 위로</button>
      <button class="chip small" type="button" data-mv="${k}:1" aria-label="아래로 이동">▼ 아래로</button>
      <button class="chip small" type="button" data-st="${k}:-10">−10분</button>
      <button class="chip small" type="button" data-st="${k}:10">＋10분</button>
      <button class="chip small" type="button" data-ex="${k}">제외</button></div>`;
  }

  function cardHTML(r, row, n) {
    const s = row.stop, p = row.place;
    const ws = r.warnings.filter((w) => w.stopId === s.id);
    const timeTxt = row.wait && s.targetAt && !row.inBreak
      ? `${F(row.start)}${s.stay ? ` <small>~ ${F(row.depart)}</small>` : ''} <small>(그 전 여유 ${row.wait}분)</small>`
      : row.wait ? `${F(row.start)} <small>(도착 ${F(row.arrive)} · 대기 ${row.wait}분)</small>`
      : `${F(row.start)}${s.stay ? ` <small>~ ${F(row.depart)}</small>` : ''}`;
    const badges = [
      `<span class="badge">${KIND[s.kind]}</span>`,
      s.stay ? `<span class="badge">${s.stay}분</span>` : '',
      s.fixedAt ? `<span class="badge fixed">⭐ ${s.fixedAt} 고정</span>` : '',
      s.targetAt ? `<span class="badge">${s.targetAt} 목표</span>` : '',
      s.latestAt ? `<span class="badge fixed">${s.latestAt}까지 완료</span>` : '',
      s.optional ? '<span class="badge opt">생략 가능</span>' : '',
    ].join('');
    const t = row.toNext;
    return `<article class="card ${s.kind === 'rest' ? 'rest' : ''} ${state.selected === s.id ? 'active' : ''}" data-stop="${s.id}" style="--day:${r.day.color}">
      <div class="sticker">${sticker(p.sticker)}</div>
      <div>
        <div class="time">${timeTxt}</div>
        <div class="name"><span class="num" style="background:${r.day.color}">${n}</span>${esc(s.label || p.name)}</div>
        <div class="badges">${badges}</div>
        ${s.note ? `<div class="kid">👶 ${esc(s.note)}</div>` : ''}
        ${ws.map((w) => `<div class="card-warn">⚠️ ${esc(w.message)}</div>`).join('')}
        <div class="actions">
          <a class="btn kakao" href="${kakaoLink(p)}" target="_blank" rel="noopener">카카오맵 길찾기</a>
          <button class="btn ghost" type="button" data-detail="${s.id}">상세 정보</button>
        </div>
        ${state.editing && !s.locked ? editControls(r, s) : ''}
      </div>
    </article>
    ${t && t.kind !== 'none' ? `<div class="drive"><span>🚗 ${t.minutes}분 · ${t.km}km <small>(${t.kind === 'road' ? 'OSRM 도로 기준 추정' : '직선거리 기준 추정'})</small></span></div>` : '<div style="height:8px"></div>'}`;
  }

  function dayHTML(r) {
    const top = r.warnings.filter((w) => !w.stopId);
    const sugg = r.suggestions;
    const first = r.rows[0], last = r.rows[r.rows.length - 1];
    return `<section data-day="${r.day.id}">
      <div class="day-h"><h2 style="color:${r.day.color}">${esc(r.day.label)}</h2></div>
      <div class="day-meta">${F(first.depart)} 출발 → ${F(last.arrive)} 도착 · 운전 약 ${r.driveMin}분(추정)${state.editing ? ` · <button class="chip small" type="button" data-reset="${r.day.id}">기본 일정으로 되돌리기</button>` : ''}</div>
      ${top.length || sugg.length ? `<div class="warnbox">${top.map((w) => `<div>⚠️ ${esc(w.message)}</div>`).join('')}${sugg.map((s) => `<div>💡 ${esc(s.message)}${state.editing ? '' : ' (✏️ 편집에서 제외)'}</div>`).join('')}</div>` : ''}
      ${(() => { const nums = placeNumbers(r); return r.rows.map((row) => cardHTML(r, row, nums[row.stop.id])).join(''); })()}
      ${r.excluded.length ? `<div class="warnbox excluded">제외한 장소: ${r.excluded.map((s) => `<button class="chip small" type="button" data-restore="${r.day.id}:${s.id}">＋ ${esc(s.label || PLACES[s.placeId].name)}</button>`).join(' ')}</div>` : ''}
    </section>`;
  }

  function overviewHTML(results) {
    const other = state.course === 'recommended' ? 'full' : 'recommended';
    const mine = Schedule.summarizeCourse(results);
    const theirs = Schedule.summarizeCourse(computeCourse(other));
    const rec = state.course === 'recommended' ? mine : theirs;
    const full = state.course === 'recommended' ? theirs : mine;
    const curCol = state.course === 'recommended' ? 1 : 2;
    const cell = (v, col) => `<td class="${col === curCol ? 'cur' : ''}">${v}</td>`;
    const f = savedFlight();
    const checks = TRIP.checklist.map((c) => `<label class="check-row"><input type="checkbox" data-check="${c.id}" ${Store.get('check:' + c.id, false) ? 'checked' : ''}><span>${esc(c.text)}</span></label>`).join('');
    return `<div class="tipbox">✈️ 금 <b>${(f || TRIP.flightDefault).arrive} 도착</b> · 일 <b>${(f || TRIP.flightDefault).depart} 출발</b><br>🚗 일요일 차량 반납은 <b>20:00까지 완료</b><br>💤 첫날은 15시 입실 후 객실 낮잠 · 섭지코지는 시간 남으면</div>
      <div class="panel-card"><h3>📅 날짜별 보기</h3><div class="day-pick">${results.map((r) => `<button type="button" data-tab="${r.day.id}" style="border-color:${r.day.color}"><b style="color:${r.day.color}">${esc(r.day.tab)}</b>${r.rows.length}곳 · 운전 ${r.driveMin}분</button>`).join('')}</div></div>
      <div class="panel-card"><h3>🧭 코스 비교</h3>
        <table class="cmp"><tr><th></th><th>🧸 추천</th><th>🗺️ 전체 방문</th></tr>
          <tr><td>방문 일정 수</td>${cell(rec.stops, 1)}${cell(full.stops, 2)}</tr>
          <tr><td>총 운전</td>${cell(rec.driveMin + '분', 1)}${cell(full.driveMin + '분', 2)}</tr>
          <tr><td>휴식·대기</td>${cell(rec.slackMin + '분', 1)}${cell(full.slackMin + '분', 2)}</tr></table>
        <div class="day-meta" style="margin-top:6px">운전시간은 OSRM 도로 기준 추정치예요. 전체 방문 코스는 금요일 해일리 카페가 추가돼요.</div></div>
      <div class="panel-card"><h3>🍼 아이 식사</h3><ul>${TRIP.kidFood.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>
      <div class="panel-card"><h3>📌 출발 전 확인</h3>${checks}</div>
      <div class="panel-card"><h3>🌤️ 날씨·일몰</h3>일몰: 10/16 ${TRIP.sunset.d1} · 10/17 ${TRIP.sunset.d2} · 10/18 ${TRIP.sunset.d3} (계산값)<br><a href="${TRIP.weatherLink}" target="_blank" rel="noopener">기상청 날씨 보기</a></div>`;
  }

  function renderSheet(results) {
    const days = state.tab === 'all' ? results : results.filter((r) => r.day.id === state.tab);
    document.getElementById('sheet-body').innerHTML = (state.tab === 'all' ? overviewHTML(results) : '') + days.map(dayHTML).join('');
  }

  /* ---------- 상세 ---------- */
  function infoRow(label, f) {
    if (!f) return '';
    const tag = f.status === 'verified'
      ? `<span class="st ok">✅ 확인${f.checked ? ` ${f.checked.slice(5).replace('-', '/')}` : ''}${f.source ? ` · <a href="${esc(f.source)}" target="_blank" rel="noopener">출처</a>` : ''}</span>`
      : `<span class="st chk">⚠️ 확인 필요${f.source ? ` · <a href="${esc(f.source)}" target="_blank" rel="noopener">참고</a>` : ''}</span>`;
    return `<div class="info-row"><b>${label}</b><div>${esc(f.value)}<br>${tag}</div></div>`;
  }

  const detailEl = document.getElementById('detail');
  function openDetail(stopId) {
    const hit = findRow(compute(), stopId);
    if (!hit) return;
    const p = hit.row.place, I = p.info, s = hit.row.stop;
    const menu = p.menu ? `<h3 style="margin:16px 0 4px">🍽️ 메뉴</h3>
      <div class="menu-tabs" role="tablist"><button type="button" aria-selected="true" data-mt="adult">어른 추천</button><button type="button" aria-selected="false" data-mt="baby8m">8개월</button><button type="button" aria-selected="false" data-mt="toddler16m">16개월</button></div>
      <div class="menu-body" id="menu-body">${p.menu.adult.map(esc).join('<br>')}</div>
      <div class="st ${p.menu.status === 'verified' ? 'ok' : 'chk'}" id="menu-note" style="margin-top:4px" data-adult-note="${esc((p.menu.status === 'verified' ? '✅ 메뉴·가격 카카오맵 기준' : '⚠️ 메뉴 확인 필요'))}">${p.menu.status === 'verified' ? '✅ 메뉴·가격 카카오맵 기준' : '⚠️ 메뉴 확인 필요'}</div>
      ${p.alt ? `<div class="tipbox">대안 식당: <b>${esc(PLACES[p.alt].name)}</b> · <a href="${kakaoLink(PLACES[p.alt])}" target="_blank" rel="noopener">길찾기</a> · <button class="chip small" type="button" data-alt="${p.alt}">정보 보기</button></div>` : ''}` : '';
    detailEl.innerHTML = `<div class="panel" role="dialog" aria-modal="true" aria-label="${esc(p.name)}">
      <div class="grip"></div>
      <div class="close-row"><button class="chip small" type="button" data-close>닫기 ✕</button></div>
      <div class="detail-head"><div class="sticker">${sticker(p.sticker)}</div><div>
        <h2>${esc(p.name)}</h2><div class="day-meta" style="margin:2px 0 0">${F(hit.row.start)} · ${esc(s.label || KIND[s.kind])}${s.stay ? ` · ${s.stay}분` : ''}</div></div></div>
      ${p.photo ? `<img src="${esc(p.photo.url)}" alt="${esc(p.name)}" style="width:100%;border-radius:16px"><div class="st">${esc(p.photo.credit)}</div>` : ''}
      ${s.note ? `<div class="tipbox">👶 ${esc(s.note)}</div>` : ''}
      ${infoRow('주소', I.address)}${infoRow('운영시간', I.hours)}${infoRow('마지막 주문', I.lastOrder)}${infoRow('요금·가격', I.price)}${infoRow('추천 체류', I.stay)}
      ${infoRow('주차', I.parking)}${infoRow('유모차', I.stroller)}${infoRow('수유·기저귀', I.nursing)}${infoRow('아이 정보', I.kids)}
      ${menu}
      <div class="actions" style="margin-top:14px"><a class="btn kakao" href="${kakaoLink(p)}" target="_blank" rel="noopener">카카오맵 길찾기</a>
        ${(p.links || []).map((l) => `<a class="btn ghost" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join('')}</div>
    </div>`;
    detailEl.hidden = false;
    detailEl._place = p;
  }
  function openPlace(placeId) {
    const p = PLACES[placeId];
    detailEl.innerHTML = `<div class="panel" role="dialog" aria-modal="true" aria-label="${esc(p.name)}"><div class="grip"></div>
      <div class="close-row"><button class="chip small" type="button" data-close>닫기 ✕</button></div>
      <div class="detail-head"><div class="sticker">${sticker(p.sticker)}</div><h2>${esc(p.name)}</h2></div>
      ${Object.entries({ address: '주소', hours: '운영시간', lastOrder: '마지막 주문', parking: '주차', kids: '아이 정보' }).map(([k, l]) => infoRow(l, p.info[k])).join('')}
      ${p.menu ? `<div class="menu-body" style="margin-top:10px"><b>어른</b> ${p.menu.adult.map(esc).join(', ')} <span class="st ${p.menu.status === 'verified' ? 'ok' : 'chk'}">${p.menu.status === 'verified' ? '✅ 카카오맵 기준' : '⚠️ 확인 필요'}</span><br><b>16개월</b> ${esc(p.menu.toddler16m)} <span class="st chk">💡 일반 안내</span></div>` : ''}
      <div class="actions" style="margin-top:14px"><a class="btn kakao" href="${kakaoLink(p)}" target="_blank" rel="noopener">카카오맵 길찾기</a></div></div>`;
    detailEl.hidden = false;
    detailEl._place = p;
  }
  detailEl.addEventListener('click', (e) => {
    if (e.target === detailEl || e.target.closest('[data-close]')) { detailEl.hidden = true; return; }
    const alt = e.target.closest('[data-alt]');
    if (alt) { openPlace(alt.dataset.alt); return; }
    const mt = e.target.closest('[data-mt]');
    if (mt) {
      detailEl.querySelectorAll('[data-mt]').forEach((b) => b.setAttribute('aria-selected', String(b === mt)));
      const v = detailEl._place.menu[mt.dataset.mt];
      detailEl.querySelector('#menu-body').innerHTML = Array.isArray(v) ? v.map(esc).join('<br>') : esc(v);
      const note = detailEl.querySelector('#menu-note');
      if (note) {
        const adult = mt.dataset.mt === 'adult';
        note.className = 'st ' + (adult && detailEl._place.menu.status === 'verified' ? 'ok' : 'chk');
        note.textContent = adult ? note.dataset.adultNote : '💡 월령 기준 일반 안내예요(식당 확인 아님). 아이가 먹어본 음식 위주로';
      }
    }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') detailEl.hidden = true; });

  /* ---------- 편집 ---------- */
  function updateOv(dayId, fn) {
    const key = ovKey(state.course, dayId);
    const ov = Object.assign({}, Store.get(key, null) || {});
    const day = COURSES[state.course].days.find((d) => d.id === dayId);
    const cur = Schedule.applyOverride(day.stops, ov).stops.map((s) => s.id);
    fn(ov, cur, day);
    Store.set(key, ov);
    render();
  }

  const sheetBody = document.getElementById('sheet-body');
  sheetBody.addEventListener('click', (e) => {
    const el = e.target.closest('button, a, .card');
    if (!el) return;
    const d = el.dataset;
    if (d.detail) return openDetail(d.detail);
    if (d.tab) { setTab(d.tab); return; }
    if (d.mv) {
      const [dayId, id, dir] = d.mv.split(':');
      updateOv(dayId, (ov, cur, day) => {
        const i = cur.indexOf(id), j = i + Number(dir);
        const locked = new Set(day.stops.filter((s) => s.locked).map((s) => s.id));
        if (i < 0 || j < 0 || j >= cur.length || locked.has(cur[j])) return;
        [cur[i], cur[j]] = [cur[j], cur[i]];
        ov.order = cur;
      });
      return;
    }
    if (d.st) {
      const [dayId, id, delta] = d.st.split(':');
      updateOv(dayId, (ov, cur, day) => {
        const base = (ov.stay && Number.isFinite(ov.stay[id])) ? ov.stay[id] : day.stops.find((s) => s.id === id).stay;
        ov.stay = Object.assign({}, ov.stay, { [id]: Math.max(0, base + Number(delta)) });
      });
      return;
    }
    if (d.ex) { const [dayId, id] = d.ex.split(':'); updateOv(dayId, (ov) => { ov.excluded = [...new Set([...(ov.excluded || []), id])]; }); return; }
    if (d.restore) { const [dayId, id] = d.restore.split(':'); updateOv(dayId, (ov) => { ov.excluded = (ov.excluded || []).filter((x) => x !== id); }); return; }
    if (d.reset) { Store.set(ovKey(state.course, d.reset), null); render(); return; }
    if (el.classList.contains('card')) focusStop(el.dataset.stop);
  });
  sheetBody.addEventListener('change', (e) => {
    if (e.target.dataset.check) Store.set('check:' + e.target.dataset.check, e.target.checked);
  });

  /* ---------- 상단 ---------- */
  function setTab(id) {
    state.tab = validTab(id);
    state.selected = null;
    Store.set('tab', state.tab);
    render({ refit: true });
    document.getElementById('sheet').scrollTop = 0;
  }
  document.querySelector('.tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) setTab(b.dataset.tab); });
  document.getElementById('btn-course').onclick = () => {
    state.course = state.course === 'recommended' ? 'full' : 'recommended';
    Store.set('course', state.course);
    render({ refit: true });
  };
  document.getElementById('btn-edit').onclick = () => { state.editing = !state.editing; render(); };
  document.getElementById('btn-fit').onclick = () => { if (fitBounds) map.fitBounds(fitBounds, { padding: [22, 22], maxZoom: 13 }); };
  let meMarker = null;
  document.getElementById('btn-locate').onclick = () => {
    if (!navigator.geolocation) return alert('이 기기에서는 위치를 확인할 수 없어요.');
    navigator.geolocation.getCurrentPosition((pos) => {
      const ll = [pos.coords.latitude, pos.coords.longitude];
      if (meMarker) meMarker.remove();
      meMarker = L.marker(ll, { icon: L.divIcon({ className: '', iconSize: [18, 18], html: '<div class="me-dot"></div>' }) }).addTo(map);
      map.flyTo(ll, 14, { duration: .6 });
    }, () => alert('위치 권한을 허용하면 내 위치를 볼 수 있어요.'), { enableHighAccuracy: true, timeout: 8000 });
  };

  const dlg = document.getElementById('flight-dlg');
  document.getElementById('btn-flight').onclick = () => {
    const f = flightNow();
    dlg.innerHTML = `<form method="dialog">
      <h3>✈️ 항공시간</h3>
      <label class="info-row"><b>금 10/16<br>도착</b><input type="time" name="arrive" value="${f.arrive}" required></label>
      <label class="info-row"><b>일 10/18<br>출발</b><input type="time" name="depart" value="${f.depart}" required></label>
      <p class="day-meta">금요일은 도착 후 75분(짐·렌터카·카시트) 뒤 출발해요. 일요일은 차량 반납 20:00 마감, 터미널은 출발 45분 전 도착을 계획상 목표로 계산해요. 실제 항공사 수속 마감과 셔틀시간은 예약 안내로 확인해 주세요.</p>
      <div class="actions"><button class="btn" value="save">저장</button><button class="btn ghost" value="reset" formnovalidate>확정 시간(${TRIP.flightDefault.arrive}/${TRIP.flightDefault.depart})</button><button class="btn ghost" value="cancel" formnovalidate>취소</button></div>
    </form>`;
    dlg.returnValue = '';
    dlg.showModal();
  };
  dlg.addEventListener('close', () => {
    const form = dlg.querySelector('form');
    if (!form) return;
    const fd = new FormData(form);
    if (dlg.returnValue === 'save' && fd.get('arrive') && fd.get('depart')) Store.set('flight', { arrive: fd.get('arrive'), depart: fd.get('depart') });
    if (dlg.returnValue === 'reset') Store.set('flight', null);
    render();
  });

  function render(opts = {}) {
    const results = compute();
    const tabs = [['all', '전체 일정', null], ...COURSES[state.course].days.map((d) => [d.id, d.tab, d.color])];
    document.querySelector('.tabs').innerHTML = tabs.map(([id, t, c]) =>
      `<button role="tab" type="button" aria-selected="${state.tab === id}" data-tab="${id}">${c ? `<span class="dot" style="background:${c}"></span>` : '🗺️ '}${t}</button>`).join('');
    const f = savedFlight();
    document.getElementById('btn-flight').textContent = `✈️ ${(f || TRIP.flightDefault).arrive} 도착 · ${(f || TRIP.flightDefault).depart} 출발`;
    document.getElementById('btn-course').textContent = state.course === 'recommended' ? '🧸 추천 코스' : '🗺️ 전체 방문 코스';
    const be = document.getElementById('btn-edit');
    be.textContent = state.editing ? '✅ 편집 완료' : '✏️ 일정 편집';
    be.classList.toggle('on', state.editing);
    renderMap(results, opts);
    renderSheet(results);
    if (state.selected) setActiveMarker(state.selected);
  }

  const syncTop = () => { document.documentElement.style.setProperty('--top-h', document.querySelector('.top').offsetHeight + 'px'); map.invalidateSize(); };
  window.addEventListener('resize', syncTop);
  syncTop();
  render({ refit: true });
  // 글꼴 로딩 후 상단 높이가 바뀌면 지도 크기를 다시 맞춘다
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { syncTop(); if (fitBounds) map.fitBounds(fitBounds, { padding: [22, 22], maxZoom: 13 }); });
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
