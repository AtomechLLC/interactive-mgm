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
rec 'archetypes/index.html#4' archetype-context archetypes-depend-on-your-game
rec 'archetypes/index.html#5' zoom-encounter zoom-to-the-encounter
rec 'archetypes/index.html#6' paladin-variants paladin-variants
rec 'archetypes/index.html#7' structured-unstructured structured-vs-unstructured
rec 'systems/index.html#1' alchemy-grid alchemy-engine-grid
rec 'systems/index.html#2' loot-roll loot-generator-roll
rec 'systems/index.html#3' bespoke-procedural bespoke-vs-procedural
rec 'systems/index.html#4' systems-reel systems-tour-reel
rec 'systems/index.html#6' owl draw-the-rest-of-the-owl
rec 'systems/index.html#7' mtg-skeleton mtg-set-skeleton
rec 'systems/index.html#8' sf2-skeleton street-fighter-ii-skeleton
rec 'counter-circle/index.html#3' circle-reskin counter-circle-reskinner
rec 'counter-circle/index.html#4' two-make-nine two-frameworks-make-nine
rec 'counter-circle/index.html#5' duel-timeline duel-timeline
rec 'counter-circle/index.html#6' elemental-diamond elemental-diamond
rec 'whats-next/index.html#1' challenge-loop challenges-first-then-tools
rec 'whats-next/index.html#2' course-map where-to-go-next
rec 'whats-next/index.html#3' framework-kit framework-kit
rec 'whats-next/index.html#4' boss-fight build-the-boss-audit-the-kit
rec 'audits/index.html#1' audit-subnautica audit-subnautica
rec 'audits/index.html#2' audit-god-of-war audit-god-of-war
rec 'audits/index.html#3' audit-cyberpunk audit-cyberpunk
rec 'audits/index.html#4' audit-portal-2 audit-portal-2
rec 'audits/index.html#5' audit-expedition-33 audit-expedition-33
rec 'audits/index.html#6' audit-brood-war audit-brood-war
rec 'audits/index.html#7' audit-mario-kart-8 audit-mario-kart-8
rec 'audits/index.html#8' audit-minecraft audit-minecraft
rec 'audits/index.html#9' audit-celeste audit-celeste
rec 'audits/index.html#10' audit-deadlock audit-deadlock
rec 'audits/index.html#11' audit-factorio audit-factorio
rec 'audits/index.html#12' audit-slay-the-spire audit-slay-the-spire
rec 'audits/index.html#13' audit-runeterra audit-runeterra
wait
