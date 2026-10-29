#!/bin/sh
# Re-records the two mutator GIFs at 1920x1080 with the side panel hidden. Serve InteractiveMGM on 127.0.0.1:${PORT:-8191} first.
cd "$(dirname "$0")"
U=http://127.0.0.1:${PORT:-8191}/pve-interactions/mutators/index.html
NOSIDE='.mt-side{display:none!important} .mt-wrap{grid-template-columns:auto!important;justify-content:center} .mt-wrap canvas.demo{width:1200px!important;height:675px!important}'
REC=../../composition/tools/record-slide-gif.js
node $REC "$U#1" mutator-answers ../gifs/sc2-mutators-same-wave-new-answer.gif 10 "" "$NOSIDE" &
node $REC "$U#2" weekly-mutation ../gifs/sc2-weekly-mutation-mix.gif 15 "" "$NOSIDE" &
wait
