#!/bin/sh
# Re-records every GIF in this module at 1920x1080 with sharp 2x canvases. Serve InteractiveMGM on 127.0.0.1:${PORT:-8181} first.
# Usage: sh record-all.sh [name ...]   (no names: every GIF; names are the output file names without .gif)
# These slides keep their side panels: the roster, rules and legends there are part of each visual.
cd "$(dirname "$0")"
U=http://127.0.0.1:${PORT:-8181}/coop-interactions
ONLY="$*"
rec() { case " $ONLY " in *" $3 "*|"  ") node record-slide-gif.js "$U/$1" "$2" "../gifs/$3.gif" 15 & ;; esac; }
GIF_COLORS=96 rec 'camera/index.html#2' lab camera-shared-screen
rec 'chains/index.html#2' builder chains-setup-exploit-payoff
rec 'free-gear/index.html#2' plateau free-gear-plateau
rec 'interactions/index.html#2' count interaction-count
rec 'keywords/index.html#3' board keywords-need-situations
wait
rec 'team-roles/index.html#2' football roles-football-fantasy
rec 'team-roles/index.html#3' trinity roles-holy-trinity
rec 'team-roles/index.html#4' teamfight roles-lanes-to-teamfight
rec 'targeting/index.html#2' matrix targeting-matrix
wait
rec 'timing/index.html#2' sandbox timing-before-during-after
rec 'timing/index.html#4' revive timing-revive
rec 'timing/index.html#5' souls timing-souls
rec 'timing/index.html#6' stack timing-stack
wait
