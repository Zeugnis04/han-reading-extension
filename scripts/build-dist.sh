#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

VERSION="$(node -e "console.log(JSON.parse(require('fs').readFileSync('manifest.json', 'utf8')).version)")"
NAME="han-reading-inspector-${VERSION}"
OUT_DIR="dist"
OUT_FILE="${OUT_DIR}/${NAME}.zip"

node -e "JSON.parse(require('fs').readFileSync('manifest.json', 'utf8'))"

rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

zip -r "$OUT_FILE" manifest.json src assets README.md

echo "Built ${OUT_FILE}"
