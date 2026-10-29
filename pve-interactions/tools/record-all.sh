#!/bin/sh
# Re-records the slide GIFs in this module at 1920x1080 with sharp 2x canvases (hazard patterns: record.js; mutators and
# permutations: their own scripts). Serve InteractiveMGM on 127.0.0.1:${PORT:-8181} first.
# Args per line: slide, scene, GIF name, [selectors to hide], [hook prefix when the page does not use __seek / __dur].
# Usage: sh record-all.sh [name ...]   (no names: every GIF; names are the output file names without .gif)
cd "$(dirname "$0")"
U=http://127.0.0.1:${PORT:-8181}/pve-interactions
ONLY="$*"
rec() { case " $ONLY " in *" $3 "*|"  ") GIF_HOOK="$5" node record-slide-gif.js "$U/$1" "$2" "../gifs/$3.gif" 15 "$4" & ;; esac; }
rec 'nintendo-model/index.html#2' ladder nintendo-model-ladder
rec 'nintendo-model/index.html#4' tree koopa-family-tree
rec 'enemy-composer/index.html#2' cards compositional-design-cards
rec 'enemy-composer/index.html#3' composer enemy-composer
wait
rec 'enemy-composer/index.html#5' feel same-card-different-feel
rec 'resistance/index.html#3' five resistance-strong-enough
rec 'counters-wow/index.html#3' fight wow-mechanical-counters
rec 'escalation/index.html#2' sandbox escalation-numbers-vs-context
wait
rec 'escalation/index.html#3' versus escalation-vs-permutation
# flat pixel art: fewer colours and no dither keep it small
GIF_COLORS=96 GIF_DITHER=none rec 'enemy-counters/index.html#2' frame enemy-counters-mario '.fr-row .btn' __ec
wait
