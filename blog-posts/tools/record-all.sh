#!/bin/sh
# Re-records every blog-post GIF at 1920x1080 with the side panel dropped, all slides in parallel. Serve InteractiveMGM on 127.0.0.1:${PORT:-8191} first.
cd "$(dirname "$0")"
U=http://127.0.0.1:${PORT:-8191}/blog-posts
NOSIDE='.mt-side{display:none!important} .mt-wrap{grid-template-columns:auto!important;justify-content:center} .mt-wrap canvas.demo{width:1200px!important;height:675px!important}'
rec() { node record-slide-gif.js "$U/$1" "$2" "../gifs/$3.gif" 15 "" "$NOSIDE" & }
rec 'too-weak-to-waste/index.html#1' flip too-weak-to-waste-flip-the-fight
rec 'too-weak-to-waste/index.html#2' dice too-weak-to-waste-bypass-the-dice
rec 'too-weak-to-waste/index.html#3' keys too-weak-to-waste-items-as-keys
wait
