// 장소 정보. 각 info 필드: {value, status:'verified'|'check', source, checked}
// verified = 출처에서 확인됨(2026-10-12). check = 확인 필요(제3자 정보이거나 미확인).
(function () {
  const C = '2026-10-12';
  const kakao = (id) => `https://place.map.kakao.com/${id}`;
  const v = (value, source) => ({ value, status: 'verified', source, checked: C });
  const chk = (value, source) => ({ value: value || '확인 필요', status: 'check', ...(source ? { source } : {}) });
  const MOM_TAMORA = 'https://mom-mom.net/travel/properties/64f0bcdb0e9d8fca1f913466';
  const MOM_AQUA = 'https://mom-mom.net/travel/places/65a487f926cfc0b40814b9ac';
  const MOM_THEME = 'https://mom-mom.net/travel/places/635108d5b6165630c2055100';
  const KTRIP_FARM = 'https://www.ktriptips.com/kor/tourspot/2704412';
  const KTRIP_AQUA = 'https://www.ktriptips.com/kor/tourspot/2048059';
  const KTRIP_JUNGMUN = 'https://www.ktriptips.com/kor/food/2758844';
  const BABY = '평소 먹던 이유식·분유(모유) 지참. 식당 음식은 주지 않기';

  window.PLACES = {
    airport: {
      id: 'airport', name: '제주국제공항', type: 'airport', lat: 33.506841, lng: 126.492723, sticker: 'plane', photo: null,
      info: {
        address: v('제주특별자치도 제주시 공항로 2', kakao(10808261)),
        parking: v('유료주차', kakao(10808261)),
        nursing: chk('공항 내 수유실 위치는 공항 안내도에서 확인'),
        kids: chk('영유아 동반 수속은 여유 있게(출발 2시간 전 터미널 도착 권장)'),
      },
      links: [{ label: '공항 홈페이지', url: 'https://www.airport.co.kr/jeju/' }, { label: '카카오맵', url: kakao(10808261) }],
    },
    rentcar: {
      id: 'rentcar', name: '렌터카 반납(공항 렌터카하우스)', type: 'rest', lat: 33.504877, lng: 126.492274, sticker: 'car', photo: null,
      info: {
        address: chk('렌터카 업체가 정해지면 반납 영업소 위치·셔틀 시간 확인', kakao(452411056)),
        kids: chk('카시트 2개 반납 확인, 셔틀 탑승 시 유모차 접기'),
      },
      links: [{ label: '카카오맵', url: kakao(452411056) }],
    },
    galchi: {
      id: 'galchi', name: '성산갈치맛집', type: 'food', lat: 33.468448, lng: 126.917449, sticker: 'galchi', photo: null,
      info: {
        address: v('제주특별자치도 서귀포시 성산읍 한도로 90 1층', kakao(1213640558)),
        hours: v('09:00~21:00 (10/16 금 영업)', kakao(1213640558)),
        lastOrder: v('20:00', kakao(1213640558)),
        price: v('토막갈치조림(대) 90,000원 · 통갈치구이(특대) 115,000원 · 통갈치조림 4인 세트 165,000원', kakao(1213640558)),
        parking: chk('주차 정보 확인 필요'),
        stroller: chk(), nursing: chk(),
        kids: chk('유아의자 보유 여부 전화 확인(064-782-7799)'),
      },
      menu: {
        adult: ['통갈치조림 스페셜 세트(4인) 165,000원', '토막갈치조림(대) 90,000원', '통갈치구이(특대) 115,000원'],
        baby8m: BABY,
        toddler16m: '흰밥 + 통갈치구이 살을 가시 완전히 제거해 아주 잘게. 조림 양념(맵고 짬)은 피하기. 갈치를 처음 먹는다면 이번 여행에선 시도하지 않기',
        status: 'verified', source: kakao(1213640558),
      },
      links: [{ label: '인스타그램', url: 'https://www.instagram.com/sungsanfood' }, { label: '카카오맵', url: kakao(1213640558) }],
    },
    haeilri: {
      id: 'haeilri', name: '해일리 카페', type: 'cafe', lat: 33.468848, lng: 126.935393, sticker: 'coffee', photo: null,
      info: {
        address: v('제주특별자치도 서귀포시 성산읍 한도로 269-37', kakao(1546248756)),
        hours: v('09:00~21:00 (10/16 금 영업)', kakao(1546248756)),
        price: v('해일리라떼 9,500원 · 해일리수플레 19,000원', kakao(1546248756)),
        parking: v('무료주차(건물 뒤 전용 주차장)', kakao(1546248756)),
        stroller: v('휠체어 사용 가능 표시(유모차 이동 참고)', kakao(1546248756)),
        nursing: chk(),
        kids: chk('오션뷰·잔디 공간. 영유아 편의시설은 확인 필요'),
      },
      links: [{ label: '홈페이지', url: 'https://www.haeilri.com' }, { label: '카카오맵', url: kakao(1546248756) }],
    },
    aqua: {
      id: 'aqua', name: '아쿠아플라넷 제주', type: 'sight', lat: 33.433068, lng: 126.927845, sticker: 'fish', photo: null,
      info: {
        address: v('제주특별자치도 서귀포시 성산읍 섭지코지로 95', kakao(23150855)),
        hours: v('09:30~18:00 (10/16 금 영업, 입장 마감 17:30·매표 마감 17:00은 확인 필요)', kakao(23150855)),
        price: chk('종합권 대인 약 43,700원(제3자 자료, 최신 요금 확인 필요). 36개월 미만 요금 확인', KTRIP_AQUA),
        stay: chk('전체 관람 약 2시간 20분(제3자 자료). 일정상 2시간', KTRIP_AQUA),
        parking: v('무료주차(야외 주차장)', kakao(23150855)),
        stroller: chk('유모차 대여 여부 자료마다 다름 → 유모차 지참 권장', MOM_AQUA),
        nursing: chk('수유실 2곳(입장 후 왼편 휴게실, 오션아레나 오른쪽 끝) — 블로그 정보', MOM_AQUA),
        kids: chk('오션아레나 공연·해녀 시연이 매 시간 진행(시각은 당일 확인, 1833-7001), 물고기 먹이주기', KTRIP_AQUA),
      },
      links: [{ label: '공식 홈페이지', url: 'http://www.aquaplanet.co.kr/jeju' }, { label: '카카오맵', url: kakao(23150855) }],
    },
    seopji: {
      id: 'seopji', name: '섭지코지', type: 'sight', lat: 33.423938, lng: 126.930609, sticker: 'lighthouse', photo: null,
      info: {
        address: v('제주특별자치도 서귀포시 성산읍 섭지코지로 107', kakao(8413659)),
        parking: chk('공식 유료주차장(소형 30분 1,000원, 최대 3,000원) — 카카오 AI 요약', kakao(8413659)),
        stroller: chk('입구~해안 산책로 일부만 유모차로 짧게. 등대 계단 구간은 제외'),
        kids: chk('바람이 세면 생략. 일몰(약 18:00) 전에 마무리'),
      },
      links: [{ label: '카카오맵', url: kakao(8413659) }],
    },
    pyoseon: {
      id: 'pyoseon', name: '표선해녀의집', type: 'food', lat: 33.325333, lng: 126.843516, sticker: 'haenyeo', photo: null,
      info: {
        address: v('제주특별자치도 서귀포시 표선면 표선당포로 6 1층', kakao(545939584)),
        hours: v('08:30~20:30, 브레이크 15:00~17:00 (10/16 금 영업)', kakao(545939584)),
        lastOrder: v('20:15', kakao(545939584)),
        parking: v('무료주차(매장 앞 5~6대, 근처 항구 무료주차장)', kakao(545939584)),
        stroller: v('휠체어 사용 가능 표시', kakao(545939584)),
        kids: chk('유아의자 여부 전화 확인(064-787-6844)'),
      },
      menu: {
        adult: ['전복죽', '해산물 메뉴(카카오맵 메뉴판에서 확인)'],
        baby8m: BABY,
        toddler16m: '전복죽은 전복을 먹어본 적이 있을 때만, 전복 조각은 빼거나 아주 잘게. 처음이면 흰밥 요청 가능 여부 확인',
        status: 'check', source: kakao(545939584),
      },
      links: [{ label: '카카오맵', url: kakao(545939584) }],
    },
    dorm: {
      id: 'dorm', name: '제주해양경찰수련원', type: 'stay', lat: 33.376807, lng: 126.790664, sticker: 'house', photo: null,
      info: {
        address: v('제주특별자치도 서귀포시 표선면 중산간동로 4821 (카카오맵 명칭: 제주지방해양경찰청 수련원)', kakao(26411567)),
        hours: chk('체크인·체크아웃 시간은 예약 안내문으로 확인'),
        kids: chk('아기 침대·욕조 대여 여부 확인. 예약 확인서의 주소와 위 주소가 같은지 꼭 대조'),
      },
      links: [{ label: '카카오맵', url: kakao(26411567) }],
    },
    dangke: {
      id: 'dangke', name: '당케올레국수', type: 'food', lat: 33.325293, lng: 126.843336, sticker: 'noodle', photo: null,
      info: {
        address: v('제주특별자치도 서귀포시 표선면 민속해안로 584 1층', kakao(25589899)),
        hours: v('08:00~17:00 (10/17 토 영업)', kakao(25589899)),
        lastOrder: v('16:30', kakao(25589899)),
        price: v('보말칼국수 12,000원 · 보말죽 13,000원 · 고기국수 8,000원', kakao(25589899)),
        parking: v('무료주차(가게 앞, 표선해수욕장 주차장)', kakao(25589899)),
        kids: chk('대기 줄이 길면 생략'),
      },
      menu: {
        adult: ['보말칼국수 12,000원', '성게칼국수 13,000원', '보말죽 13,000원', '고기국수 8,000원'],
        baby8m: BABY,
        toddler16m: '고기국수 면을 짧게 자르고 고기는 잘게, 국물은 짜니 조금만. 보말·성게는 처음이면 피하기',
        status: 'verified', source: kakao(25589899),
      },
      links: [{ label: '캐치테이블', url: 'https://app.catchtable.co.kr/ct/shop/dangkaeolleh' }, { label: '카카오맵', url: kakao(25589899) }],
    },
    hueree: {
      id: 'hueree', name: '휴애리 자연생활공원', type: 'sight', lat: 33.30941, lng: 126.63541, sticker: 'flower', photo: null,
      info: {
        address: v('제주특별자치도 서귀포시 남원읍 신례동로 256', kakao(27581976)),
        hours: v('09:00~18:00 (10/17 토 영업)', kakao(27581976)),
        price: v('성인 13,000원 · 청소년 11,000원 (유아 요금 확인 필요)', kakao(27581976)),
        parking: v('무료주차(대규모 야외)', kakao(27581976)),
        stroller: v('휠체어 사용 가능 표시. 흙길 구간은 유모차 확인', kakao(27581976)),
        kids: chk('동물 먹이주기·가을 핑크뮬리. 행사 일정은 홈페이지 확인'),
      },
      links: [{ label: '공식 홈페이지', url: 'http://www.hueree.com' }, { label: '카카오맵', url: kakao(27581976) }],
    },
    jungmun: {
      id: 'jungmun', name: '중문어촌계 해녀의집', type: 'food', lat: 33.242373, lng: 126.419148, sticker: 'haenyeo', photo: null,
      info: {
        address: v('제주특별자치도 서귀포시 중문관광로 194 1층 (카카오맵 명칭: 중문해녀의집)', kakao(25046156)),
        hours: v('08:00~17:00 (10/17 토 영업)', kakao(25046156)),
        price: v('전복죽 10,000원(최근 13,000원 후기 있음) · 모듬 20,000원', kakao(25046156)),
        parking: v('무료주차(가게 앞)', kakao(25046156)),
        kids: chk('유아의자 여부 확인(064-738-9557). 재료 소진 시 조기 마감 가능', KTRIP_JUNGMUN),
      },
      menu: {
        adult: ['전복죽', '모듬 해산물 20,000원', '전복회 20,000원'],
        baby8m: BABY,
        toddler16m: '전복죽(전복을 먹어본 경우만, 전복은 잘게). 회·날것은 주지 않기',
        status: 'verified', source: kakao(25046156),
      },
      links: [{ label: '카카오맵', url: kakao(25046156) }],
    },
    somerset: {
      id: 'somerset', name: '서머셋 제주신화월드', type: 'stay', lat: 33.302504, lng: 126.317112, sticker: 'house', photo: null,
      info: {
        address: v('제주특별자치도 서귀포시 안덕면 신화역사로304번길 89', kakao(414336592)),
        hours: chk('체크인 15:00 · 체크아웃 11:00 (제3자 자료, 예약 확인서로 확인)', MOM_TAMORA),
        parking: v('투숙객 무료주차(동 앞 지상)', kakao(414336592)),
        kids: chk('유아용품 무료 대여(수량 한정, 예약 시 요청), 만 6세 이하 조식 무료(제3자 자료)', MOM_TAMORA),
      },
      links: [{ label: '제주신화월드', url: 'https://www.shinhwaworld.com' }, { label: '카카오맵', url: kakao(414336592) }],
    },
    pool: {
      id: 'pool', name: '탐모라 수영장(신화월드)', type: 'sight', lat: 33.302504, lng: 126.317112, sticker: 'swim', photo: null,
      info: {
        address: chk('서머셋 제주신화월드 투숙객 이용 수영장 — 정확한 위치는 체크인 시 안내'),
        hours: chk('운영시간 확인 필요(동절기 실내 전용 운영이라는 제3자 자료)', MOM_TAMORA),
        price: chk('서머셋 투숙객 무료 이용(제3자 자료)', MOM_TAMORA),
        kids: chk('영유아 방수기저귀·수영모 규정 확인 필요 → 둘 다 챙기기. 따뜻한 겉옷'),
      },
      links: [{ label: '제주신화월드', url: 'https://www.shinhwaworld.com' }],
    },
    nandre: {
      id: 'nandre', name: '난드르바당', type: 'food', lat: 33.234616, lng: 126.371005, sticker: 'pig', photo: null, alt: 'gobajin',
      info: {
        address: v('제주특별자치도 서귀포시 하예하동로16번길 11-1 1층', kakao(26883584)),
        hours: v('12:00~22:00 (10/17 토 영업)', kakao(26883584)),
        lastOrder: v('21:00', kakao(26883584)),
        parking: v('무료주차(매장 옆 전용 주차장)', kakao(26883584)),
        stroller: v('휠체어 사용 가능 표시', kakao(26883584)),
        kids: chk('실내석·유아의자 2개 전화 문의(064-739-0053)'),
      },
      menu: {
        adult: ['흑돼지 구이(메뉴·가격은 매장 확인)', '흑돼지 김치찌개 7,000원', '제주산 성게 미역국 11,000원', '냉면 7,000원'],
        baby8m: BABY,
        toddler16m: '흰밥 + 잘 익힌 흑돼지 살코기를 아주 잘게. 김치찌개(매움)와 성게(처음이면)는 피하기',
        status: 'check', source: kakao(26883584),
      },
      links: [{ label: '인스타그램', url: 'https://www.instagram.com/rlaqkq76' }, { label: '카카오맵', url: kakao(26883584) }],
    },
    gobajin: {
      id: 'gobajin', name: '고바진', type: 'food', lat: 33.308994, lng: 126.349112, sticker: 'pig', photo: null,
      info: {
        address: v('제주특별자치도 서귀포시 안덕면 신화역사로 578-18 1층', kakao(1334093506)),
        hours: v('11:30~21:00, 브레이크 15:00~17:00 (10/17 토 영업, 10/18 일 휴무)', kakao(1334093506)),
        parking: v('무료주차(가게 앞 7~9대)', kakao(1334093506)),
        kids: chk('유아의자 확인(064-794-2596)'),
      },
      menu: {
        adult: ['고바진 흑돼지(230g) 25,000원', '열무국수 4,000원(후식)'],
        baby8m: BABY,
        toddler16m: '흰밥 + 잘 익힌 흑돼지 살코기 아주 잘게. 열무국수(새콤·매콤)는 피하기',
        status: 'verified', source: kakao(1334093506),
      },
      links: [{ label: '카카오맵', url: kakao(1334093506) }],
    },
    themepark: {
      id: 'themepark', name: '신화테마파크', type: 'sight', lat: 33.304993, lng: 126.315177, sticker: 'ferris', photo: null,
      info: {
        address: v('제주특별자치도 서귀포시 안덕면 신화역사로304번길 98', kakao(1214707005)),
        hours: v('10:00~19:00 (10/18 일 영업)', kakao(1214707005)),
        price: chk('입장권 요금은 판매 채널마다 다름 → 공식 홈페이지 확인. 36개월 이하 요금 확인'),
        parking: v('무료주차', kakao(1214707005)),
        stroller: chk('유모차 유료 대여(입장 후 왼쪽 렌탈샵) — 블로그 정보', MOM_THEME),
        nursing: chk('수유실·기저귀교환대(입장 후 오른쪽) — 블로그 정보', MOM_THEME),
        kids: chk('라바 회전목마·어드벤처 플레이그라운드·캐릭터 포토존. 탑승 키·연령 제한은 현장 확인'),
      },
      links: [{ label: '공식 홈페이지', url: 'https://www.shinhwaworld.com/themepark.jhtml' }, { label: '카카오맵', url: kakao(1214707005) }],
    },
    shinhwafood: {
      id: 'shinhwafood', name: '신화월드 안 점심(식당 미정)', type: 'food', lat: 33.304993, lng: 126.315177, sticker: 'tangerine', photo: null,
      info: {
        address: chk('신화월드 리조트 안 식당 — 당일 선택'),
        kids: chk('유아의자·아이 메뉴가 있는 곳 선택'),
      },
      menu: {
        adult: ['당일 선택'],
        baby8m: BABY,
        toddler16m: '부드러운 밥, 익힌 채소, 잘게 자른 고기. 짠 국물·매운 양념 피하기',
        status: 'check',
      },
      links: [{ label: '제주신화월드', url: 'https://www.shinhwaworld.com' }],
    },
    farm: {
      id: 'farm', name: '아침미소목장', type: 'sight', lat: 33.453284, lng: 126.587423, sticker: 'cow', photo: null,
      info: {
        address: v('제주특별자치도 제주시 첨단동길 160-30', kakao(12697401)),
        hours: v('10:00~17:00 (10/18 일 영업, 화요일 휴무)', kakao(12697401)),
        lastOrder: chk('16:30(제3자 자료)', KTRIP_FARM),
        price: chk('입장 무료, 먹이주기 2,000원 · 송아지 우유주기 3,000원(제3자 자료, 2026-09 수정)', KTRIP_FARM),
        parking: v('무료주차(제1~3주차장)', kakao(12697401)),
        stroller: v('휠체어 사용 가능 표시. 목장 흙길은 확인', kakao(12697401)),
        kids: chk('송아지 우유주기는 당일 운영에 따라 달라짐 → 도착 후 확인. 요구르트·카이막'),
      },
      menu: {
        adult: ['카이막 세트 16,000원', '목장 연유라떼 7,000원', '한라봉 요구르트 4,500원'],
        baby8m: BABY,
        toddler16m: '플레인 요구르트 조금(유제품을 먹어본 경우). 쿠키·푸딩은 단맛이 강하니 조금만',
        status: 'verified', source: kakao(12697401),
      },
      links: [{ label: '공식 홈페이지', url: 'http://morningsmile.co.kr/' }, { label: '카카오맵', url: kakao(12697401) }],
    },
    yongdam: {
      id: 'yongdam', name: '용담해안도로 카페', type: 'cafe', lat: 33.515827, lng: 126.509561, sticker: 'coffee', photo: null,
      info: {
        address: chk('용담해안도로 일대 — 카페는 당일 선택', kakao(8013248)),
        kids: chk('아이들 낮잠 상태에 따라 차에서 바다 드라이브만 해도 좋아요'),
      },
      links: [{ label: '비짓제주', url: 'https://www.visitjeju.net/kr/detail/view?contentsid=CNTS_000000000020124' }, { label: '카카오맵', url: kakao(8013248) }],
    },
    chakhan: {
      id: 'chakhan', name: '착한집 제주공항본점', type: 'food', lat: 33.499963, lng: 126.507003, sticker: 'galchi', photo: null, alt: 'dodori',
      info: {
        address: v('제주특별자치도 제주시 서광로 98 1층', kakao(1762863151)),
        hours: v('11:00~21:00 (10/18 일 영업)', kakao(1762863151)),
        parking: v('무료주차(매장 앞 전용)', kakao(1762863151)),
        kids: chk('유아의자 2개 문의(064-713-7136)'),
      },
      menu: {
        adult: ['통갈치구이(대) 80,000원', '순살갈치조림(중) 38,000원', '갈치회 50,000원', '전복버터구이 40,000원'],
        baby8m: BABY,
        toddler16m: '흰밥 + 통갈치구이 살을 가시 완전히 제거해 잘게. 회·조림 양념은 피하기',
        status: 'verified', source: kakao(1762863151),
      },
      links: [{ label: '인스타그램', url: 'https://www.instagram.com/jejugoodfish' }, { label: '카카오맵', url: kakao(1762863151) }],
    },
    dodori: {
      id: 'dodori', name: '도도리고기국수', type: 'food', lat: 33.502856, lng: 126.486763, sticker: 'noodle', photo: null,
      info: {
        address: v('제주특별자치도 제주시 다호북길 109 1층', kakao(1810168249)),
        hours: v('09:40~20:00 (10/18 일 영업)', kakao(1810168249)),
        lastOrder: v('19:20', kakao(1810168249)),
        parking: v('무료주차(매장 앞)', kakao(1810168249)),
        kids: chk('유아의자 확인(064-744-1469)'),
      },
      menu: {
        adult: ['고기국수 10,000원', '고기비빔국수 10,000원', '고깃반(소) 16,000원'],
        baby8m: BABY,
        toddler16m: '고기국수 면 짧게 자르고 수육은 잘게, 국물은 조금만',
        status: 'verified', source: kakao(1810168249),
      },
      links: [{ label: '캐치테이블', url: 'https://app.catchtable.co.kr/ct/shop/dodorinoodle_jeju' }, { label: '카카오맵', url: kakao(1810168249) }],
    },
  };
})();
