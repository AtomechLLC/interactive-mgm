#!/bin/sh
# Re-records the Evaluating Enemy Permutations GIF at 1920x1080 with the side panel hidden. Serve InteractiveMGM on 127.0.0.1:${PORT:-8191} first.
cd "$(dirname "$0")"
U=http://127.0.0.1:${PORT:-8191}/pve-interactions/permutations/index.html
NOSIDE='.mt-side{display:none!important} .mt-wrap{grid-template-columns:auto!important;justify-content:center} .mt-wrap canvas.demo{width:1200px!important;height:675px!important}'
node ../../composition/tools/record-slide-gif.js "$U#1" evaluate ../gifs/evaluating-enemy-permutations.gif ${FPS:-10} "" "$NOSIDE"
