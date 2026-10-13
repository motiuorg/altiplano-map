#!/usr/bin/env bash
# Builds src/data/cuencas.geojson: the main rivers of the Altiplano, drawn on
# the organisations map behind the "Cuencas hidrográficas" legend switch.
#
# Source: OpenStreetMap (ODbL), waterway=river, by name, via Overpass.
# Needs curl and python3. Overpass is sometimes busy (HTTP 504): run it again.
#
#   scripts/build-cuencas.sh
set -euo pipefail

OUT="$(cd "$(dirname "$0")/.." && pwd)/src/data/cuencas.geojson"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

RIVERS='Guadiana Menor|Fardes|Castril|Guardal|Guadalent|Qu.par|Argos|Almanzora|Hu.scar|Galera|R.o Guadix|Corneros|Chirivel'
curl -sSf -G -A "altiplano-map build script" https://overpass-api.de/api/interpreter \
  --data-urlencode "data=[out:json][timeout:240];way[\"waterway\"=\"river\"][\"name\"~\"$RIVERS\"](37.0,-3.5,38.45,-1.45);out geom;" \
  -o "$TMP/rivers.json"

python3 -I - "$TMP/rivers.json" "$OUT" <<'EOF'
import json, sys
rivers, out = sys.argv[1:]

# Spelling variants in OSM names.
FIX = {"Río Quipar": "Río Quípar", "Rio Argos": "Río Argos"}

features = []
for w in json.load(open(rivers))["elements"]:
    name = FIX.get(w["tags"]["name"], w["tags"]["name"])
    coords = [[round(p["lon"], 4), round(p["lat"], 4)] for p in w["geometry"]][::2]
    if len(coords) < 2:
        continue
    features.append({"type": "Feature", "properties": {"kind": "river", "name": name},
                     "geometry": {"type": "LineString", "coordinates": coords}})

json.dump({"type": "FeatureCollection",
           "source": "Rivers from OpenStreetMap (ODbL)",
           "features": features}, open(out, "w"), ensure_ascii=False, separators=(",", ":"))
print("Wrote", out, len(features), "features")
EOF
