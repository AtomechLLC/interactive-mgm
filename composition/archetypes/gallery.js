/* Souls archetype galleries (MGM C4 M7, deck slides 158-168). Slide 168 lists 28 archetypes; the deck walks through seven
   (arch-gallery) and the other 21 follow on three more slides of seven (arch-gallery-move, -reach, -allies), each a small
   top-down loop with the answer it asks for. The loops live in arch.js and arch-more.js so the creature composer can run
   them too. Pick one to see it large. */
(function () {
  const { $, $$ } = FPF.kit;
  const { text, wrap, chip, TONE, panel, scene, pointer, inBox } = CK;
  const { ARCH, MORE, LOOP, arena } = window.ARCH;
  const C = TD.C;
  const X = i => 130 + (i % 4) * 260, Y = i => 112 + Math.floor(i / 4) * 284;
  const DUR = LOOP * 2;
  const FIRST = ['flailer', 'fighter', 'brute', 'sweeper', 'defender', 'evader', 'rampager'];
  const PAGES = [
    { id: 'arch-gallery', keys: FIRST, all: 'All seven' },
    { id: 'arch-gallery-move', keys: ['ambusher', 'tethered', 'charger', 'teleporter', 'burrower', 'diveBomber', 'floater'], all: 'All seven',
      out: 'Seven archetypes defined by where they come from or how they move. Each is answered by reading its movement: where it hides, how far it reaches, when it lands.' },
    { id: 'arch-gallery-reach', keys: ['sniper', 'bombarder', 'grappler', 'desecrator', 'exploder', 'slug', 'reflector'], all: 'All seven',
      out: 'Seven archetypes that reach you across the room or change the ground you stand on. Each is answered with your position: cover, distance, or clean floor.' },
    { id: 'arch-gallery-allies', keys: ['healer', 'directHealer', 'enchanter', 'spawner', 'summoner', 'splitter', 'duelist'], all: 'All seven',
      out: 'Six archetypes that bring more bodies or keep them alive, and one that punishes your attack. Most are answered by choosing who to hit first.' },
  ];
  // all 28, in slide order, for the map in the eighth cell
  const ALL = PAGES.flatMap(p => p.keys);

  function tile(g, k, x, y, t, sc = .95) {
    const A = ARCH[k];
    g.save(); g.translate(x, y); g.scale(sc, sc); TD.use(g); arena(g); A.loop(g, t % LOOP); g.restore();
    const by = y + 90 * sc / .95;
    GI.draw(g, A.gi, x - 100, by + 18, 26, A.col);
    text(g, A.name, x - 82, by + 19, { align: 'left', size: 18, w: 800, display: true });
    text(g, A.line, x, by + 42, { size: 12.5, col: C.muted });
    chip(g, A.counter, x, by + 66, { ...TONE.green, size: 12.5 });
  }

  // eighth cell on the first page: the rest of the list. On the later pages: all 28, with this page's seven picked out.
  function listCell(g, page) {
    const x = X(7), y = Y(7);
    if (page === 0) {
      panel(g, x - 122, y - 88, 244, 260, { title: '21 more, on the next slides' });
      const all = ['Zone Healer', ...MORE];
      all.forEach((n, i) => text(g, n, x - 108 + (i % 2) * 118, y - 46 + Math.floor(i / 2) * 20.5, { align: 'left', size: 13, col: C.ink, w: 500 }));
      return;
    }
    panel(g, x - 122, y - 88, 244, 260, { title: `All 28 patterns · page ${page + 1} of 4` });
    ALL.forEach((k, i) => {
      const on = PAGES[page].keys.includes(k), seen = ALL.indexOf(k) < page * 7;
      const cx = x - 110 + Math.floor(i / 14) * 118, cy = y - 50 + (i % 14) * 15.4;
      if (on) { g.fillStyle = ARCH[k].col; g.beginPath(); g.arc(cx + 3, cy, 3.5, 0, Math.PI * 2); g.fill(); }
      text(g, ARCH[k].name, cx + 10, cy, { align: 'left', size: 11.5, w: on ? 800 : 500, col: on ? C.ink : seen ? C.muted : '#a9a28c' });
    });
  }

  PAGES.forEach((P, page) => scene(P.id, {
    dur: DUR,
    state: () => ({ focus: null }),
    init(s, st, api) {
      const box = $(s, '.ag-pick');
      box.innerHTML = `<button class="btn" data-k="">${P.all}</button>` + P.keys.map(k => `<button class="btn" data-k="${k}">${ARCH[k].name}</button>`).join('');
      $$(box, '.btn').forEach(b => b.onclick = () => { api.manual(); st.focus = b.dataset.k || null; });
      pointer(api.cv, (x, y, type) => {
        if (type !== 'down') return;
        if (st.focus) { api.manual(); st.focus = null; return; }
        P.keys.forEach((k, i) => { if (inBox(x, y, X(i), Y(i) + 30, 250, 270)) { api.manual(); st.focus = k; } });
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
      P.keys.forEach((k, i) => tile(g, k, X(i), Y(i), t));
      listCell(g, page);
      st.sync?.();
    },
    side(t, st, tour) {
      const out = st.focus && !tour
        ? `<b>${ARCH[st.focus].name}:</b> ${ARCH[st.focus].line.toLowerCase()}. The answer it asks for: ${ARCH[st.focus].counter.toLowerCase()}.`
        : P.out || 'Each archetype is one recurring play pattern, and each asks the player for a different answer. A creature combines one or more of them.';
      return { out };
    },
  }));
})();
