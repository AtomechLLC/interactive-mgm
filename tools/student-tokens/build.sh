#!/usr/bin/env bash
# Rebuilds student-tokens/ from the decks' own art. Run from the repo root: tools/student-tokens/build.sh [out dir]
# Needs node + playwright (for the game-icons glyphs and top-down discs) and python3 + Pillow.
# The repo keeps the 256px set; the 512px set is built alongside it in the out dir (default: /tmp/student-tokens).
set -e
ROOT=$(pwd); HERE=$ROOT/tools/student-tokens; WORK=$(mktemp -d); OUT=${1:-/tmp/student-tokens}
sed 's/function shadow(x, y, rx, ry, a = .22) {/function shadow(x, y, rx, ry, a = .22) { return;/' blog-posts/shared/topdown.js > "$HERE/td-noshadow.js"
cd "$WORK" && mkdir -p raw/gi raw/td
node "$HERE/extract.js" "$ROOT/composition/shared/icons.js" "$ROOT/blog-posts/shared/icons.js" "$ROOT/depth/shared/icons.js"
node "$HERE/render.js"
python3 "$HERE/compose.py" "$ROOT" "$WORK" "$OUT"
mkdir -p "$OUT/contact-sheets"; python3 "$HERE/sheet.py" "$OUT" "$OUT/contact-sheet-all.png"
for t in $(ls "$OUT/512px"); do python3 "$HERE/sheet.py" "$OUT" "$OUT/contact-sheets/$t.png" "$t"; done
rm -f "$HERE/td-noshadow.js"; echo "built $OUT; copy $OUT/256px, contact sheets and index.json into student-tokens/"
