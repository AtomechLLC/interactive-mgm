#!/bin/sh
# Re-records every GIF in this module at 1920x1080, all slides in parallel. Serve InteractiveMGM on 127.0.0.1:${PORT:-8181} first.
# Usage: sh record-all.sh [name ...]   (no names: every GIF; names are the output file names without .gif)
cd "$(dirname "$0")"
U=http://127.0.0.1:${PORT:-8181}/composition
# NOSIDE drops the side panel and centres a larger canvas: every GIF here is the visual alone.
NOSIDE='.mt-side{display:none!important} .mt-wrap{grid-template-columns:auto!important;justify-content:center} .mt-wrap canvas.demo{width:1200px!important;height:675px!important}'
ONLY="$*"
rec() { case " $ONLY " in *" $3 "*|"  ") node record-slide-gif.js "$U/$1" "$2" "../gifs/$3.gif" 15 "" "$NOSIDE" & ;; esac; }
rec 'why-scale/index.html#2' bestiary two-views-one-bestiary
rec 'decompose/index.html#1' fire-grid one-element-four-targets
rec 'archetypes/index.html#2' arch-gallery souls-archetype-gallery
rec 'archetypes/index.html#3' paladin-turtle paladin-or-turtle
rec 'counter-circle/index.html#1' strip-circle strip-the-packaging-counter-circle
rec 'three-dials/index.html#1' three-dials three-dials
rec 'ability-forge/index.html#1' forge ability-forge
rec 'ability-forge/index.html#2' keyword-reach keyword-reach
rec 'archetypes/index.html#1' arch-composer souls-archetype-composer
rec 'counter-circle/index.html#2' nine-grid nine-fundamentals-audit
rec 'systems/index.html#1' doom-swap doom-encounter-swapper
wait
