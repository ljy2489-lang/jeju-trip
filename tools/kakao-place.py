"""카카오맵 장소 상세(panel3)를 받아 좌표·주소·영업시간·메뉴·편의시설을 요약한다.
실행: python -I tools/kakao-place.py <id> [<id> ...]   → tools/cache/kakao/<id>.json 저장 + 요약 출력
"""
import json, pathlib, sys, urllib.request
try:
    import truststore; truststore.inject_into_ssl()
except ImportError:
    pass
sys.stdout.reconfigure(encoding="utf-8")
ROOT = pathlib.Path(__file__).resolve().parent
CACHE = ROOT / "cache" / "kakao"
CACHE.mkdir(parents=True, exist_ok=True)


def fetch(pid):
    f = CACHE / f"{pid}.json"
    if f.exists():
        return json.loads(f.read_text(encoding="utf-8"))
    req = urllib.request.Request(f"https://place-api.map.kakao.com/places/panel3/{pid}",
                                 headers={"User-Agent": "Mozilla/5.0", "Referer": "https://place.map.kakao.com/", "pf": "web"})
    d = json.load(urllib.request.urlopen(req, timeout=20))
    f.write_text(json.dumps(d, ensure_ascii=False), encoding="utf-8")
    return d


def summarize(pid, d):
    s = d.get("summary", {})
    out = {"id": pid, "name": s.get("name"), "lat": round(s.get("point", {}).get("lat", 0), 6),
           "lng": round(s.get("point", {}).get("lon", 0), 6), "road": s.get("address", {}).get("road"),
           "phone": (s.get("phone_numbers") or [{}])[0].get("tel") if s.get("phone_numbers") else None,
           "homepage": (s.get("homepages") or [None])[0], "updated": s.get("meta", {}).get("updated_at")}
    days = []
    for wp in (d.get("open_hours") or {}).get("week_from_today", {}).get("week_periods", []):
        for day in wp.get("days", []):
            on = day.get("on_days") or {}
            days.append(f"{day.get('day_of_the_week_desc')}: {on.get('start_end_time_desc') or day.get('off_days_desc') or '휴무/정보없음'}"
                        + (f" / {', '.join(on.get('break_times_desc') or [])}" if on.get('break_times_desc') else "")
                        + (f" / {', '.join(on.get('last_order_times_desc') or [])}" if on.get('last_order_times_desc') else ""))
    out["hours"] = days
    items = ((d.get("menu") or {}).get("menus") or {}).get("items") or []
    out["menu"] = [f"{m.get('name')} {m.get('price') or ''}".strip() for m in items[:12]]
    add = d.get("place_add_info") or {}
    out["facilities"] = [i.get("text") for i in add.get("store_facility_icons") or []]
    out["ai_infos"] = [f"{i.get('title')}: {i.get('summary')}" for i in ((add.get("ai_mate") or {}).get("store_infos") or [])][:6]
    return out


if __name__ == "__main__":
    res = [summarize(pid, fetch(pid)) for pid in sys.argv[1:]]
    (ROOT / "cache" / "summary.json").write_text(json.dumps(res, ensure_ascii=False, indent=1), encoding="utf-8")
    for r in res:
        print(json.dumps(r, ensure_ascii=False))
