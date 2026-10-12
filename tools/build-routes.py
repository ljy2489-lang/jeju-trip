"""itinerary의 모든 인접 구간을 OSRM으로 조회해 data/routes.js 생성.
실행: python -I tools/build-routes.py   (OSRM 공개 서버 기준 추정치)
"""
import json, math, pathlib, subprocess, sys, time, urllib.request
try:
    import truststore; truststore.inject_into_ssl()
except ImportError:
    pass
sys.stdout.reconfigure(encoding="utf-8")
ROOT = pathlib.Path(__file__).resolve().parent.parent

js = ("global.window={};require(process.argv[1]);require(process.argv[2]);"
      "process.stdout.write(JSON.stringify({p:window.PLACES,c:window.COURSES}))")
out = subprocess.run(["node", "-e", js, str(ROOT / "data/places.js"), str(ROOT / "data/itinerary.js")],
                     capture_output=True, text=True, encoding="utf-8", check=True).stdout
data = json.loads(out)
P, C = data["p"], data["c"]


def km(a, b):  # schedule.js haversineKm 과 같은 식
    d = math.radians
    h = math.sin(d(b["lat"] - a["lat"]) / 2) ** 2 + math.cos(d(a["lat"])) * math.cos(d(b["lat"])) * math.sin(d(b["lng"] - a["lng"]) / 2) ** 2
    return 2 * 6371 * math.asin(math.sqrt(h))


pairs = []
for course in C.values():
    for day in course["days"]:
        ids = [s["placeId"] for s in day["stops"]]
        for a, b in zip(ids, ids[1:]):
            # schedule.travel 이 'none'(0분)으로 처리하는 구간은 조회하지 않는다
            if a == b or km(P[a], P[b]) < 0.3:
                continue
            if (a, b) not in pairs and (b, a) not in pairs:
                pairs.append((a, b))

routes = {}
for a, b in pairs:
    pa, pb = P[a], P[b]
    url = (f"https://router.project-osrm.org/route/v1/driving/{pa['lng']},{pa['lat']};{pb['lng']},{pb['lat']}"
           "?overview=simplified&geometries=geojson")
    req = urllib.request.Request(url, headers={"User-Agent": "jeju-family-trip/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        res = json.load(r)
    if res.get("code") != "Ok":
        print("FAIL", a, b, res.get("code"))
        continue
    rt = res["routes"][0]
    coords = [[round(lat, 5), round(lng, 5)] for lng, lat in rt["geometry"]["coordinates"]]
    routes[f"{a}>{b}"] = {"minutes": max(5, round(rt["duration"] / 60)), "km": round(rt["distance"] / 1000, 1),
                          "coords": coords, "source": "OSRM"}
    print(f"{a}>{b}: {routes[f'{a}>{b}']['minutes']}분 {routes[f'{a}>{b}']['km']}km ({len(coords)}점)")
    time.sleep(1)

(ROOT / "data/routes.js").write_text(
    "// 생성 파일: python -I tools/build-routes.py (OSRM 공개 서버 기준 추정치)\nwindow.ROUTES = "
    + json.dumps(routes, ensure_ascii=False) + ";\n", encoding="utf-8")
print(len(routes), "routes")
