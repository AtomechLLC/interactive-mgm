/* Souls archetype gallery (MGM C4 M7, deck slides 158-168). Seven of the deck's archetypes as small top-down loops, each
   with the player's answer from the speaker notes, and the other 21 patterns from slide 168's list. The loops live in
   arch.js so the creature composer can run them too. Pick one to see it large. */
(function () {
  const { $, $$ } = FPF.kit;
  const { text, wrap, chip, TONE, panel, scene, pointer, inBox, clamp } = CK;
  const { ARCH, MORE, LOOP, arena } = window.ARCH;
  const C = TD.C;
  const KEYS = ['flailer', 'fighter', 'brute', 'sweeper', 'defender', 'evader', 'rampager'];
  const X = i => 130 + (i % 4) * 260, Y = i => 112 + Math.floor(i / 4) * 284;
  const DUR = LOOP * 2;

  function tile(g, k, x, y, t, sc = .95) {
    const A = ARCH[k];
    g.save(); g.translate(x, y); g.scale(sc, sc); TD.use(g); arena(g); A.loop(g, t % LOOP); g.restore();
    const by = y + 90 * sc / .95;
    GI.draw(g, A.gi, x - 100, by + 18, 26, A.col);
    text(g, A.name, x - 82, by + 19, { align: 'left', size: 18, w: 800, display: true });
    text(g, A.line, x, by + 42, { size: 12.5, col: C.muted });
    chip(g, A.counter, x, by + 66, { ...TONE.green, size: 12.5 });
  }

  scene('arch-gallery', {
    dur: DUR,
    state: () => ({ focus: null }),
    init(s, st, api) {
      const box = $(s, '.ag-pick');
      box.innerHTML = `<button class="btn" data-k="">All seven</button>` + KEYS.map(k => `<button class="btn" data-k="${k}">${ARCH[k].name}</button>`).join('');
      $$(box, '.btn').forEach(b => b.onclick = () => { api.manual(); st.focus = b.dataset.k || null; });
      pointer(api.cv, (x, y, type) => {
        if (type !== 'down') return;
        if (st.focus) { api.manual(); st.focus = null; return; }
        KEYS.forEach((k, i) => { if (inBox(x, y, X(i), Y(i) + 30, 250, 270)) { api.manual(); st.focus = k; } });
      });
      st.sync = () => $$(box, '.btn').forEach(b => b.classList.toggle('on', (b.dataset.k || null) === st.focus));
    },
    draw(g, t, st, tour) {
      if (!tour && st.focus) {
        const A = ARCH[st.focus];
        g.save(); g.translate(400, 290); g.scale(2.6, 2.6); TD.use(g); arena(g); A.loop(g, t % LOOP); g.restore();
        GI.draw(g, A.gi, 850, 120, 80, A.col);
        text(g, A.name, 850, 190, { size: 30, w: 800, display: true });
        wrap(g, A.line, 850, 236, 200, { size: 18, col: C.ink, align: 'center', lh: 24 });
        chip(g, A.counter, 850, 330, { ...TONE.green, size: 15 });
        text(g, 'Click anywhere to go back', 850, 540, { size: 13, col: C.muted });
        st.sync?.(); return;
      }
      KEYS.forEach((k, i) => tile(g, k, X(i), Y(i), t));
      // eighth cell: the rest of the list
      const x = X(7), y = Y(7);
      panel(g, x - 122, y - 88, 244, 260, { title: 'And 21 more patterns' });
      const all = ['Zone Healer', ...MORE];
      all.forEach((n, i) => text(g, n, x - 108 + (i % 2) * 118, y - 46 + Math.floor(i / 2) * 20.5, { align: 'left', size: 13, col: C.ink, w: 500 }));
      st.sync?.();
    },
    side(t, st, tour) {
      const out = st.focus && !tour
        ? `<b>${ARCH[st.focus].name}:</b> ${ARCH[st.focus].line.toLowerCase()}. The answer it asks for: ${ARCH[st.focus].counter.toLowerCase()}.`
        : 'Each archetype is one recurring play pattern, and each asks the player for a different answer. A creature combines one or more of them.';
      return { out };
    },
  });
})();
