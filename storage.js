// localStorage 안전 래퍼: 사용할 수 없으면(비공개 모드 등) 메모리에만 저장
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
      if (key in mem) return mem[key];
      if (ok) {
        try { const v = ls().getItem(P + key); if (v != null) return JSON.parse(v); } catch (e) { /* 손상된 값은 무시 */ }
      }
      return fallback;
    },
    set(key, value) {
      mem[key] = value;
      if (ok) { try { ls().setItem(P + key, JSON.stringify(value)); } catch (e) { ok = false; } }
    },
  };
});
