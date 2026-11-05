#!/bin/sh
# Re-records the DGMS GIFs at 1920x1080 with the side panel dropped, four at a time. Serve InteractiveMGM on 127.0.0.1:${PORT:-8177} first.
# Each line of gifs.txt: <module>/<page> <slide number> <scene name> <gif name>
cd "$(dirname "$0")/../.."
U=http://127.0.0.1:${PORT:-8177}/dgms
NOSIDE=".mt-side{display:none!important} .mt-wrap{grid-template-columns:auto!important;justify-content:center} .mt-wrap canvas.demo{width:1200px!important;height:675px!important}"
export U NOSIDE
grep -v "^#" dgms/tools/gifs.txt | xargs -P 4 -L 1 sh -c 'node tools/record-slide-gif.js "$U/$0/index.html#$1" $2 dgms/gifs/$3.gif 15 "" "$NOSIDE" && echo "done $3"'
