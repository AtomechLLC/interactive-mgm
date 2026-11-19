#!/bin/sh
# Records the PvP slide GIFs that run through the shared recorder (../../tools/record-slide-gif.js) at 1920x1080,
# into each deck's own gifs/ folder: the six decks whose GIFs were added with the PvP home page's Slide GIFs section.
# Counter Cycles has its own recorder (../../tools/record-cc-gif.js).
# Serve InteractiveMGM on 127.0.0.1:${PORT:-8181} first.
# Args per line: slide, scene, GIF path (from pvp/, no .gif), [selectors to hide].
# Usage: sh record-all.sh [name ...]   (no names: every GIF; names are the output file names without .gif)
cd "$(dirname "$0")"
U=http://127.0.0.1:${PORT:-8181}/pvp
ONLY="$*"
# env set before rec (GIF_CSS, GIF_COLORS...) reaches the recorder for that line only
rec() { case " $ONLY " in *" $(basename "$3") "*|"  ") mkdir -p "../$(dirname "$3")"; node record-slide-gif.js "$U/$1" "$2" "../$3.gif" 15 "$4" & ;; esac; }
rec 'strike-trades/index.html#2' trade strike-trades/gifs/same-hit-different-answers
rec 'payoffs/index.html#2' line payoffs/gifs/same-swing-three-weapons
wait
rec 'core-actions/index.html#6' qs433 core-actions/gifs/sidestep-thrust-backstep-sweep
rec 'bruiser-meta/index.html#4' levers bruiser-meta/gifs/breaking-the-bruiser-meta
# this canvas has no CSS size, so pin it to its drawn size or the 2x backing store shows at double size
GIF_CSS='.mt-canvas{width:900px;height:470px}' rec 'elusives/index.html#3' meta elusives/gifs/elusive-meta-three-patches
wait
rec 'build-orders/index.html#2' read build-orders/gifs/reading-a-build-order
wait
