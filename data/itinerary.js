// 코스 정의. 체류시간(stay)은 확정 일정의 시각 차이에서 이동시간을 뺀 값.
(function () {
  const d1 = {
    id: 'd1', date: '2026-10-16', tab: 'DAY1 금', color: '#F08A3C',
    label: 'DAY 1 · 10/16 금 — 수족관 → [여유 있으면] 섭지코지 → 15시 숙소·낮잠',
    start: { type: 'flightArrive', offset: 75 }, softEnd: '20:30',
    stops: [
      { id: 'd1-air', placeId: 'airport', kind: 'transfer', stay: 0, locked: true, label: '제주공항 도착 · 렌터카 수령', note: '짐 찾기·렌터카·카시트 2개 확인(도착 후 75분)' },
      { id: 'd1-momguk', placeId: 'kimMomguk', kind: 'visit', stay: 15, optional: true, label: '김희선제주몸국 · 냉동 포장 수령(확인 필요)', note: '냉동 포장 판매·예약·보냉 포장을 064-745-0047로 사전 확인한 경우 방문. 다음 날 숙소 아침용. 보냉 준비 후 제품 안내에 따라 운반·보관. 불가하면 생략하고 아침 대체식 준비. 15시 입실 우선' },
      { id: 'd1-aqua', placeId: 'aqua', kind: 'visit', stay: 90, label: '아쿠아플라넷 · 수족관만 관람', note: '공연은 보지 않고 수족관만 관람. 아이들 컨디션에 따라 짧게' },
      { id: 'd1-rest', placeId: 'aqua', kind: 'rest', stay: 20, label: '수유·기저귀·휴식', note: '수유실은 입장 후 왼편 휴게실 쪽(확인 필요)' },
      { id: 'd1-seopji', placeId: 'seopji', kind: 'visit', stay: 30, optional: true, outdoor: true, label: '섭지코지 · 시간 남으면 짧게', note: '아쿠아플라넷 바로 옆 구역. 등대 계단은 제외. 15시 숙소 입실을 우선하고 피곤하거나 늦으면 생략' },
      { id: 'd1-lunch', placeId: 'galchi', kind: 'meal', stay: 60, note: '관람 후 점심. 갈치구이 살만 가시 제거해 잘게. 8개월은 이유식' },
      { id: 'd1-stay', placeId: 'dorm', kind: 'stay', stay: 15, fixedAt: '15:00', locked: true, label: '제주해양경찰수련원 15시 입실', note: '짐 정리 후 객실에서 아기들 눕혀 재우기' },
      { id: 'd1-nap', placeId: 'dorm', kind: 'rest', stay: 120, locked: true, label: '객실 낮잠 · 충분히 쉬기', note: '15:15~17:15 기준 2시간 확보. 실제 잠든 시간과 컨디션에 맞춰 쉬기' },
      { id: 'd1-dinner', placeId: 'pyoseon', kind: 'meal', stay: 60, targetAt: '17:30', note: '낮잠 후 저녁. 브레이크타임 15:00~17:00 이후 방문' },
      { id: 'd1-end', placeId: 'dorm', kind: 'stay', stay: 0, locked: true, label: '숙소 복귀·휴식' },
    ],
  };
  const d2 = {
    id: 'd2', date: '2026-10-17', tab: 'DAY2 토', color: '#1FA2A6',
    label: 'DAY 2 · 10/17 토 — 휴애리 → 중문 → 신화월드 수영 ⭐',
    start: { type: 'time', at: '08:00' }, softEnd: '20:30',
    stops: [
      { id: 'd2-start', placeId: 'dorm', kind: 'stay', stay: 45, locked: true, label: '숙소 아침 · 포장 몸국 + 밥', note: '취사 가능(사용자 확인). 전날 냉동 몸국 구매 시 제품 안내에 따라 데워 먹기. 포장 불가 시 준비한 대체식. 식사·출발 준비 포함' },
      { id: 'd2-hueree', placeId: 'hueree', kind: 'visit', stay: 70, outdoor: true, note: '동물 구경·가을 풍경. 유모차는 포장길 위주' },
      { id: 'd2-lunch', placeId: 'suduri', kind: 'meal', stay: 60, targetAt: '12:00', label: '중문수두리보말칼국수 · 보말칼국수', note: '휴애리에서 신화월드로 가는 길에 점심. 대기는 별도, 15시 체크인·15:30 수영 우선. 남은 음식도 포장 불가 안내' },
      { id: 'd2-nap', placeId: 'somerset', kind: 'rest', stay: 60, label: '짐 보관·수유·낮잠', note: '체크인 전 로비에 짐 맡기고 쉬기' },
      { id: 'd2-checkin', placeId: 'somerset', kind: 'stay', stay: 30, fixedAt: '15:00', label: '서머셋 체크인' },
      { id: 'd2-pool', placeId: 'pool', kind: 'visit', stay: 90, fixedAt: '15:30', label: '탐모라 실내수영장 ⭐', note: '방수기저귀·수영복·수영모·따뜻한 겉옷. 갈아입기·정리 포함' },
      { id: 'd2-ready', placeId: 'somerset', kind: 'rest', stay: 40, label: '씻고 외출 준비' },
      { id: 'd2-dinner', placeId: 'nandre', kind: 'meal', stay: 75, note: '실내석 문의. 대안: 고바진' },
      { id: 'd2-stay', placeId: 'somerset', kind: 'stay', stay: 0, locked: true, label: '서머셋 숙소 도착·휴식' },
    ],
  };
  const d3 = {
    id: 'd3', date: '2026-10-18', tab: 'DAY3 일', color: '#5BAA5B',
    label: 'DAY 3 · 10/18 일 — 테마파크 → 아침미소목장 → 제주시 → 공항',
    start: { type: 'time', at: '08:00' }, deadline: { type: 'flightDepart', offset: -45 },
    stops: [
      { id: 'd3-start', placeId: 'somerset', kind: 'stay', stay: 100, locked: true, label: '아침·짐 정리·체크아웃', note: '09:40까지 체크아웃' },
      { id: 'd3-theme', placeId: 'themepark', kind: 'visit', stay: 90, note: '산책·캐릭터 구경 위주. 놀이기구 탑승 조건은 현장 확인' },
      { id: 'd3-rest', placeId: 'themepark', kind: 'rest', stay: 30, label: '이동·기저귀·식사 준비' },
      { id: 'd3-lunch', placeId: 'shinhwafood', kind: 'meal', stay: 60 },
      { id: 'd3-farm', placeId: 'farm', kind: 'visit', stay: 60, optional: true, outdoor: true, note: '송아지 우유주기는 당일 운영 확인' },
      { id: 'd3-cafe', placeId: 'yongdam', kind: 'rest', stay: 50, optional: true, label: '낮잠·휴식(여유 있으면 용담해안도로 카페)' },
      { id: 'd3-dinner', placeId: 'dodori', kind: 'meal', stay: 60, targetAt: '18:00', label: '도도리고기국수 · 고기국수', note: '18시 전후 공항 근처 저녁. 주유·렌터카 반납은 20시까지 완료. 대기시간에 따라 더 일찍 식사' },
      { id: 'd3-fuel', placeId: 'rentcar', kind: 'transfer', stay: 20, label: '주유·렌터카 반납 준비', note: '영업소 근처에서 주유. 실제 업체 주소는 예약 안내로 확인' },
      { id: 'd3-return', placeId: 'rentcar', kind: 'transfer', stay: 20, latestAt: '20:00', locked: true, label: '렌터카 반납 · 20시까지 완료', note: '19:30 전후 반납 목표, 20시 마감. 반납 영업소·마지막 셔틀·항공사 수속 마감은 예약 안내로 확인' },
      { id: 'd3-shuttle', placeId: 'rentcar', kind: 'transfer', stay: 20, label: '공항 셔틀·터미널 이동', note: '셔틀 대기·이동 20분은 계획상 여유값. 실제 소요시간에 따라 더 일찍 반납' },
      { id: 'd3-air', placeId: 'airport', kind: 'transfer', stay: 0, locked: true, label: '제주공항 터미널 도착 · 21시 비행기', note: '20:15까지 터미널 도착을 계획상 목표로 계산. 항공사 체크인·탑승 마감과 셔틀 소요시간은 별도 확인' },
    ],
  };

  const clone = (x) => JSON.parse(JSON.stringify(x));
  const full1 = clone(d1);
  full1.label = 'DAY 1 · 10/16 금 — [선택] 해일리 → 수족관·섭지코지 → 15시 숙소·낮잠';
  full1.stops.splice(2, 0, { id: 'd1-haeilri', placeId: 'haeilri', kind: 'visit', stay: 40, optional: true, label: '해일리 카페', note: '15시 입실에 늦으면 생략. 오션뷰·잔디, 영유아 편의시설은 확인 필요' });

  window.COURSES = {
    recommended: { name: '추천 코스', days: [d1, d2, d3] },
    full: { name: '전체 방문 코스', days: [full1, clone(d2), clone(d3)] },
  };

  window.TRIP = {
    title: '우리 가족 제주 여행지도',
    dates: '2026.10.16 금 – 10.18 일',
    party: '성인 4명 + 아이 2명(8개월·16개월) · 렌터카',
    flightDefault: { arrive: '08:10', depart: '21:00' },
    revision: '2026-10-13-flight-nap',
    sunset: { d1: '18:00', d2: '17:59', d3: '17:58' }, // 제주(33.45N,126.56E) 계산값
    weatherLink: 'https://www.weather.go.kr/w/index.do',
    kidFood: [
      '8개월: 평소 먹던 이유식과 모유·분유 준비',
      '16개월: 익숙한 재료로 부드러운 밥, 가시를 완전히 제거한 익힌 생선살, 잘게 자른 고기 등',
      '아이 음식은 간을 약하게 부탁하고, 짠 국물·매운 양념은 피하기',
      '처음 먹는 해산물은 여행 중 새로 시도하지 않기',
      '식당별 아이 메뉴와 이유식 데우기 가능 여부는 미리 확인하기',
    ],
    checklist: [
      { id: 'hours', text: '식당 영업시간·마지막 주문·휴무 확인' },
      { id: 'seats', text: '저녁 식당에 성인 4명 + 아이 2명, 유아의자 2개 문의' },
      { id: 'car', text: '렌터카 카시트 2개와 반납 영업소·셔틀시간 확인' },
      { id: 'pool', text: '수영장 운영과 준비물 확인(방수기저귀·수영모)' },
      { id: 'flight', text: '항공편 확인: 금 08:10 도착 · 일 21:00 출발, 차량은 일 20:00까지 반납' },
      { id: 'dorm', text: '수련원 예약 확인서 주소와 지도 주소 대조' },
    ],
  };
})();
