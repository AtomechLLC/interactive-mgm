# Directing Game Mechanics and Refining Game Feel (DGMS + RGF)

Course home: `index.html`. Proposals per deck: `proposals/`.

## Conventions for every page

- Folder: `dgms/<module>/<slug>/` with `index.html`, `notes.js` and `<slug>.js`. Modules: `m0-power-of-polish`, `m1-pillars`, `m2-audience`, `m3-skills`, `m4-character`, `m5-controller`, `m6-camera`, `m7-sound`, `m8-balance`, `m9-game-feel`, `interview`.
- `index.html` follows `blog-posts/keep-five/index.html`, with one more `../`:
  `../../../assets/deck.css`, `kit.css`, `deck.js`, `kit.js`; `../../shared/dgms.css`; `../../shared/topdown.js`.
  `window.DECK = { title: 'Directing Game Mechanics · Module N · <Page>', home: '../../index.html', audio: false, cues: null }`.
- Shared helpers for the whole course go in `dgms/shared/` (`dgms.css`, `topdown.js`). Module-only helpers go in `dgms/<module>/shared/`.
- Every slide has a walk-through/tour button and `window.__seek(t, which)` / `__dur` so `tools/record-slide-gif.js` can record it.
- Home icon: `assets/img/home/dgms--<module>--<slug>.svg`, a game-icons.net path filled `#ffb951` (see `assets/img/home/blog-posts--keep-five.svg`).
- GIFs: `dgms/gifs/<module>--<slug>[-<slide>].gif`, 1920×1080.
- Real game imagery is fine (WoW and League icons, game-icons.net, Pokémon, Mario sprites). In visuals, avoid the words "good" and "bad"; use precise adjectives or nouns.
- `dgms/index.html` (PAGES, GIFS), the root `index.html` and the root `README.md` are owned by one thread: send it your page list and it adds them.
