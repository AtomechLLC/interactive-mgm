#!/bin/sh
# Build slide257-raid-roles.gif: fetch the slide's SVG export if missing, render frames, then palette-encode a looping 25fps GIF.
cd "$(dirname "$0")" || exit 1
D=1xBadKm2iOtQxbKC5WrMZ3rgbZq8e6a7cGx2jwtTIf9w
[ -f src/s257.svg ] || { mkdir -p src && curl -sL "https://docs.google.com/presentation/d/$D/export/svg?id=$D&pageid=g27878999f10_0_4467" -o src/s257.svg; }
mkdir -p src/hats  # Noto top hat, helmet, crown (the slide's emoji, which Slides doesn't render)
for c in 1f3a9 1fa96 1f451; do [ -f src/hats/$c.png ] || curl -sL "https://fonts.gstatic.com/s/e/notoemoji/latest/$c/512.png" -o src/hats/$c.png; done
node render.js frames && \
ffmpeg -y -loglevel error -framerate 25 -i frames/f%04d.png -vf "split[a][b];[a]palettegen=stats_mode=full:max_colors=256[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle" -loop 0 ../slide257-raid-roles.gif
