#!/bin/sh
# Re-records every GIF in this module at 1920x1080, all slides in parallel. Serve InteractiveMGM on 127.0.0.1:${PORT:-8161} first.
cd "$(dirname "$0")"
U=http://127.0.0.1:${PORT:-8161}/mechanics-tools
HIDE='.mt-side h4,.mt-side .row,.mt-side>p:not(.mt-out),.mt-side label'
# NOSIDE drops the side panel and centres a larger canvas, for slides whose GIF is the visual alone.
NOSIDE='.mt-side{display:none!important} .mt-wrap{grid-template-columns:auto!important;justify-content:center} .mt-wrap canvas.demo{width:1200px!important;height:675px!important}'
rec() { node record-slide-gif.js "$U/$1" "$2" "../gifs/$3.gif" 15 "$HIDE" "$4" & }
rec 'doors/index.html#2' doors doors-switch-plate-pulley "$NOSIDE"
rec 'doors/index.html#3' kinds doors-binary-discrete-continuous "$NOSIDE"
rec 'contrapositive/index.html#2' arena contrapositive-arena
rec 'inversion/index.html#2' raid inversion-danger-safe-ring "$NOSIDE"
rec 'reverse-map/index.html#1' map reverse-sequencing-map
rec 'diminishing/index.html#1' dim diminishing-returns
rec 'life-per-hit/index.html#1' lph life-per-hit
wait
