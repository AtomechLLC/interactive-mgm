#!/bin/sh
# Re-records every GIF in this module. Serve InteractiveMGM on 127.0.0.1:${PORT:-8171} first.
cd "$(dirname "$0")"
U=http://127.0.0.1:${PORT:-8171}/depth
HIDE='.mt-side h4,.mt-side .row,.mt-side .seg,.mt-side .tip,.mt-side label,.mt-side .kw,.mt-side .or-vars,.mt-side .src,.mt-side table'
rec() { node record-slide-gif.js "$U/$1" "$2" "../gifs/$3.gif" 15 "$HIDE"; }
rec 'three-tiers/index.html#1' tiers three-tiers-counted
rec 'sword-forge/index.html#1' scale sword-forge-scale
rec 'sword-forge/index.html#2' gauntlet sword-forge-three-fights
rec 'sword-forge/index.html#3' ortho sword-forge-orthogonality
rec 'additive/index.html#1' additive additive-vs-multiplicative
rec 'go-board/index.html#1' go go-board-size
rec 'ghost-runs/index.html#1' ghosts ghost-runs
rec 'mtg-keywords/index.html#1' mtg mtg-keyword-combat
