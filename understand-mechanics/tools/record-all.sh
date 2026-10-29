#!/bin/sh
# Re-records every GIF in this module. Serve InteractiveMGM on 127.0.0.1:${PORT:-8171} first.
cd "$(dirname "$0")"
U=http://127.0.0.1:${PORT:-8171}/understand-mechanics
HIDE='.mt-side h4,.mt-side .row,.mt-side .seg,.mt-side .tip,.mt-side label'
rec() { node record-slide-gif.js "$U/$1" "$2" "../gifs/$3.gif" 15 "$HIDE"; }
rec 'grass/index.html#1' grass grass-mechanic-or-aesthetic
rec 'type-weakness/index.html#1' weak type-weakness-xray
rec 'life-tap/index.html#1' tap life-tap-solo-vs-raid
node record-slide-gif.js "$U/life-tap-trade/index.html#1" solo ../gifs/life-tap-solo-risky.gif 15 .lt-ctl
node record-slide-gif.js "$U/life-tap-trade/index.html#2" raid ../gifs/life-tap-raid-free.gif 15 .lt-ctl
# canvas only, no side panel
GIF_CSS='.mt-side{display:none!important}.mt-wrap{grid-template-columns:1fr!important;justify-items:center}.mt-wrap canvas.demo{width:1140px!important;height:641px!important}' GIF_DITHER=none \
  node record-slide-gif.js "$U/chaotic-energy/index.html#1" embers ../gifs/chaotic-energy-embers.gif 12
rec 'xray/index.html#1' candle xray-candle
rec 'xray/index.html#2' mario xray-mario-3
rec 'xray/index.html#3' switch xray-rusted-switch
rec 'xray/index.html#4' flame xray-flammable
rec 'cast-timeline/index.html#1' imbalance cast-time-as-resource
rec 'cast-timeline/index.html#1' imbalance.0 cast-time-fireball-spam
rec 'cast-timeline/index.html#1' imbalance.1 cast-time-mage-breaks
rec 'cast-timeline/index.html#1' imbalance.2 cast-time-life-tap-balance
rec 'cast-timeline/index.html#1' imbalance.3 cast-time-burning-crusade
rec 'cast-timeline/index.html#2' forever cast-repeats-forever
rec 'cast-timeline/index.html#3' tokens cast-tokens
rec 'cast-timeline/index.html#4' window cast-weakness-window
rec 'guarded-door/index.html#1' door guarded-door
rec 'guarded-door/index.html#2' matrix tool-matrix
rec 'resource-pool/index.html#1' pool resource-pool
rec 'resource-pool/index.html#2' spend discrete-vs-continuous
rec 'resource-pool/index.html#3' burn resources-and-states
