#!/usr/bin/env bash
# Builds src/data/espacios-protegidos.geojson: the national, natural and regional
# parks in and around the Altiplano, drawn on the organisations map.
#
# Source: MITECO, Banco de Datos de la Naturaleza, Espacios Naturales Protegidos
# (ENP, edition 2025, ETRS89 / UTM 30N). Run it again when a new edition is out
# (bump the URL) or to change the list of parks. Needs curl, unzip and npx.
#
#   scripts/build-espacios-protegidos.sh
set -euo pipefail

URL="https://www.miteco.gob.es/content/dam/miteco/es/biodiversidad/servicios/banco-datos-naturaleza/enp/Enp2025_geojson.zip"
OUT="$(cd "$(dirname "$0")/.." && pwd)/src/data/espacios-protegidos.geojson"

# Parks within ~15 km of the comarcas in altiplano-region.geojson (Sierra Espuña left out).
PARKS='["Sierra María-Los Velez","Sierra de Baza","Sierra de Castril","Sierras de Cazorla, Segura y las Villas","Sierra Nevada","Sierra de Huétor"]'

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
curl -sSfL -o "$TMP/enp.zip" "$URL"
unzip -q "$TMP/enp.zip" -d "$TMP"

# Sierra Nevada is both a national and a natural park with almost the same
# boundary: the two are dissolved into one shape.
NODE_OPTIONS=--max-old-space-size=8000 npx --yes mapshaper@0.6.102 "$TMP/Enp2025_p.json" \
  -filter "['Parque Nacional','Parque Natural','Parque Regional'].indexOf(ODESIGNATE) > -1 && $PARKS.indexOf(SITE_NAME) > -1" \
  -proj from=EPSG:25830 crs=wgs84 \
  -each "nombre = SITE_NAME === 'Sierra María-Los Velez' ? 'Sierra María-Los Vélez' : SITE_NAME" \
  -dissolve nombre copy-fields=ODESIGNATE \
  -each "figura = nombre === 'Sierra Nevada' ? 'Parque Nacional y Natural' : ODESIGNATE, source = 'MITECO, Espacios Naturales Protegidos 2025', delete ODESIGNATE" \
  -simplify 4% keep-shapes \
  -o "$OUT" format=geojson precision=0.0001

echo "Wrote $OUT"
