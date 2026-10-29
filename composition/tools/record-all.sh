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
rec 'decompose/index.html#3' fire-grid one-element-four-targets
rec 'archetypes/index.html#2' arch-gallery souls-archetype-gallery
rec 'archetypes/index.html#3' paladin-turtle paladin-or-turtle
rec 'counter-circle/index.html#1' strip-circle strip-the-packaging-counter-circle
rec 'three-dials/index.html#1' three-dials three-dials
rec 'ability-forge/index.html#1' forge ability-forge
rec 'ability-forge/index.html#4' keyword-reach keyword-reach
rec 'archetypes/index.html#1' arch-composer souls-archetype-composer
rec 'counter-circle/index.html#2' nine-grid nine-fundamentals-audit
rec 'systems/index.html#5' doom-swap doom-encounter-swapper
rec 'why-scale/index.html#1' open-secret industry-open-secret
rec 'why-scale/index.html#3' depth-scale depth-or-scale
rec 'decompose/index.html#1' lego lego-bricks
rec 'decompose/index.html#2' black-box black-box-decomposer
rec 'decompose/index.html#4' toolbox toolbox-to-composite
rec 'decompose/index.html#5' spell-reels wow-classic-spell-reels
rec 'three-dials/index.html#2' strip-ability strip-the-packaging-abilities
rec 'three-dials/index.html#3' reflect-window reflect-window-test
rec 'three-dials/index.html#4' same-purpose same-purpose-five-payloads
rec 'three-dials/index.html#5' coverage keyword-coverage-map
rec 'ability-forge/index.html#2' three-cards three-cards-three-steps
rec 'ability-forge/index.html#3' rain-dance pokemon-rain-dance
rec 'refine/index.html#1' polish-pipeline polish-pipeline
rec 'refine/index.html#2' skill-radar skill-test-radar
rec 'refine/index.html#3' siphon-whip siphoning-strike-recast
rec 'refine/index.html#4' three-cs three-cs
rec 'refine/index.html#5' game-feel plain-then-felt
rec 'refine/index.html#6' solution-scale solution-vulnerability-scale
rec 'refine/index.html#7' rain-exploit restoring-rain-exploit
rec 'refine/index.html#8' three-ways-teach three-ways-to-teach
wait
