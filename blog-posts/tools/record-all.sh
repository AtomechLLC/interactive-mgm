#!/bin/sh
# Re-records every blog-post GIF at 1920x1080 with the side panel dropped, a few slides at a time in parallel. Serve InteractiveMGM on 127.0.0.1:${PORT:-8191} first.
cd "$(dirname "$0")"
U=http://127.0.0.1:${PORT:-8191}/blog-posts
NOSIDE='.mt-side{display:none!important} .mt-wrap{grid-template-columns:auto!important;justify-content:center} .mt-wrap canvas.demo{width:1200px!important;height:675px!important}'
rec() { node record-slide-gif.js "$U/$1" "$2" "../gifs/$3.gif" 15 "" "$NOSIDE" & }
rec 'too-weak-to-waste/index.html#1' flip too-weak-to-waste-flip-the-fight
rec 'too-weak-to-waste/index.html#2' dice too-weak-to-waste-bypass-the-dice
rec 'too-weak-to-waste/index.html#3' keys too-weak-to-waste-items-as-keys
rec 'ogre-table/index.html#1' scene ogre-table-one-turn
rec 'ogre-table/index.html#2' odds ogre-table-what-the-dice-allowed
wait
rec 'games-played/index.html#1' draw games-played-draw-ten
rec 'games-played/index.html#2' range games-played-range-or-rut
wait
rec 'compositional-cats/index.html#1' reels compositional-cats-the-number
rec 'compositional-cats/index.html#2' anchors compositional-cats-parts-and-anchors
rec 'compositional-cats/index.html#3' board compositional-cats-one-bolt-two-classes
wait
rec 'cross-game-controllers/index.html#1' intent controllers-what-did-they-mean
rec 'cross-game-controllers/index.html#2' meant controllers-coyote-time-and-buffer
rec 'cross-game-controllers/index.html#3' camera controllers-same-camera-three-games
wait
rec 'hardware-mistake/index.html#1' order hardware-mistake-float-order
rec 'hardware-mistake/index.html#2' desync hardware-mistake-one-bit-two-games
rec 'hardware-mistake/index.html#3' wire hardware-mistake-over-the-wire
wait
rec 'atomech-lesson/index.html#1' runway atomech-the-runway
rec 'atomech-lesson/index.html#2' order atomech-hardest-first-or-snowball
rec 'atomech-lesson/index.html#3' multi atomech-call-and-swap
wait
