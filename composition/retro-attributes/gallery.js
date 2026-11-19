/* Retro enemy attribute galleries: the article's 51 attributes on seven slides (three of movement, two of qualities, two of
   abilities), each attribute a small loop with the answer it asks for, in the layout of the Souls archetype galleries
   (../archetypes/gallery.js). Pick one to see it large with the article's own example. The loops live in move.js,
   quality.js and ability.js so the recipe slide (mix.js) can run them too. */
(function () {
  const { $, $$ } = FPF.kit;
  const { text, wrap, chip, TONE, panel, scene, pointer, inBox } = CK;
  const { A, LOOP } = RA, C = TD.C;
  const X = i => 130 + (i % 4) * 260, Y = i => 112 + Math.floor(i / 4) * 284;
  const TONES = { Movement: TONE.blue, Quality: TONE.purple, Ability: TONE.orange };
  const TRIGGERS = ['Is hit by the player', 'Hits the player', 'A timer runs out', 'After its last action', 'Player or object is near', 'Random', 'Player can see it', 'Player cannot see it'];
  const PAGES = [
    { id: 'ra-move-ground', keys: ['stationary', 'walker', 'pacer', 'jumper', 'riser', 'ducker', 'faller', 'geobound'], all: 'All eight',
      out: 'Eight movement attributes that live on the ground or change height. Each one is a fixed rule, so each is answered by timing: when it turns, when it sinks, when it lands.' },
    { id: 'ra-move-air', keys: ['floater', 'waver', 'swooper', 'sticky', 'rotator', 'swinger', 'tethered'], all: 'All seven',
      out: 'Seven movement attributes in the air or on an anchor. Each draws a shape in space (a line, a wave, a circle, a chain’s length), and the answer is to read that shape and stand outside it.' },
    { id: 'ra-move-paths', keys: ['follower', 'roamer', 'liner', 'dasher', 'teleporter', 'ponger', 'mirror'], all: 'All seven',
      out: 'Seven movement attributes seen from above. What differs is what the enemy steers by: you, chance, a fixed spot, the walls, or your own steps.' },
    { id: 'ra-quality-attack', keys: ['geoignore', 'shielder', 'deflector', 'secretSpot', 'invulnerable', 'secretWeakness', 'hardToHit'], all: 'All seven',
      out: 'Seven qualities that decide what happens when your attack arrives. Each takes away the default answer (shoot it from here) and asks for a specific one.' },
    { id: 'ra-quality-body', keys: ['revivor', 'regenerator', 'segmented', 'bumper', 'geomimic', 'alarm'], all: 'All six', extra: true,
      out: 'Six qualities of the body itself: it comes back, heals, breaks into pieces, shoves, carries your weight, or calls for help. The seventh panel lists the article’s triggers, the events that switch attributes on and off.' },
    { id: 'ra-ability-bodies', keys: ['grower', 'shrinker', 'forcer', 'carrier', 'thrower', 'emitter', 'splitter', 'cloner'], all: 'All eight',
      out: 'Eight abilities that change size, push or move the player, or put more bodies and objects on the screen. Thrower and Emitter differ in supply: a pile runs out, an emitter does not.' },
    { id: 'ra-ability-state', keys: ['morpher', 'sapper', 'latcher', 'hider', 'switcher', 'exploder', 'interactor', 'charger'], all: 'All eight',
      out: 'Eight abilities about state and timing: the enemy changes form, changes you, hides, swaps rule sets, ends itself, uses the level, or pauses before it acts.' },
  ];
  const ALL = PAGES.flatMap(p => p.keys);

  // one loop in its 240 x 180 box, clipped, at scale sc
  function box(g, k, x, y, t, sc) {
    const a = A[k];
    g.save(); g.translate(x, y); g.scale(sc, sc); TD.use(g);
    g.save(); g.beginPath(); g.roundRect(-120, -90, 240, 180, 12); g.clip(); RA[a.view](g); a.loop(g, t % LOOP); g.restore();
    g.strokeStyle = a.view === 'side' ? '#a9bcc6' : C.floorLn; g.lineWidth = 2; g.beginPath(); g.roundRect(-120, -90, 240, 180, 12); g.stroke();
    g.restore();
  }
  function tile(g, k, x, y, t, sc = .95) {
    const a = A[k];
    box(g, k, x, y, t, sc);
    const by = y + 90 * sc / .95;
    GI.draw(g, a.gi, x - 100, by + 18, 26, a.col);
    text(g, a.name, x - 82, by + 19, { align: 'left', size: 18, w: 800, display: true });
    const n = wrap(g, a.line, x, by + 40, 244, { size: 12, col: C.muted, align: 'center', lh: 14 }).length;
    chip(g, a.counter, x, by + 58 + n * 14, { ...TONE.green, size: 11.5, pad: 12 });
  }
  function mapCell(g, page) {
    const x = X(7), y = Y(7);
    panel(g, x - 122, y - 88, 244, 264, { title: `All 51 attributes · slide ${page + 1} of 7` });
    ALL.forEach((k, i) => {
      const on = PAGES[page].keys.includes(k), cx = x - 114 + Math.floor(i / 17) * 79, cy = y - 50 + (i % 17) * 13.2;
      if (on) { g.fillStyle = A[k].col; g.beginPath(); g.arc(cx + 3, cy, 3, 0, Math.PI * 2); g.fill(); }
      text(g, A[k].name, cx + 9, cy, { align: 'left', size: 10, w: on ? 800 : 500, col: on ? C.ink : i < page * 7.4 ? C.muted : '#a9a28c' });
    });
  }
  function triggerCell(g) {
    const x = X(6), y = Y(6);
    panel(g, x - 122, y - 88, 244, 264, { title: 'Triggers switch attributes' });
    TRIGGERS.forEach((s, i) => chip(g, s, x, y - 44 + i * 27, { ...TONE.gold, size: 12.5, width: 200 }));
  }
  RA.box = box; RA.tile = tile; RA.TONES = TONES;

  PAGES.forEach((P, page) => scene(P.id, {
    dur: LOOP * 2,
    state: () => ({ focus: null }),
    init(s, st, api) {
      const el = $(s, '.ag-pick');
      el.innerHTML = `<button class="btn" data-k="">${P.all}</button>` + P.keys.map(k => `<button class="btn" data-k="${k}">${A[k].name}</button>`).join('');
      $$(el, '.btn').forEach(b => b.onclick = () => { api.manual(); st.focus = b.dataset.k || null; });
      pointer(api.cv, (x, y, type) => {
        if (type !== 'down') return;
        if (st.focus) { api.manual(); st.focus = null; return; }
        P.keys.forEach((k, i) => { if (inBox(x, y, X(i), Y(i) + 30, 250, 270)) { api.manual(); st.focus = k; } });
      });
      st.sync = () => $$(el, '.btn').forEach(b => b.classList.toggle('on', (b.dataset.k || null) === st.focus));
    },
    draw(g, t, st, tour) {
      if (!tour && st.focus) {
        const a = A[st.focus];
        box(g, st.focus, 400, 290, t, 2.6);
        GI.draw(g, a.gi, 850, 96, 76, a.col);
        text(g, a.name, 850, 164, { size: 28, w: 800, display: true });
        chip(g, a.group + ' attribute', 850, 198, { ...TONES[a.group], size: 13 });
        const l1 = wrap(g, a.line, 850, 240, 250, { size: 17, col: C.ink, align: 'center', lh: 22 });
        let y = 240 + l1.length * 22 + 22;
        text(g, 'The answer it asks for', 850, y, { size: 12, col: C.muted, w: 700 }); y += 26;
        const l2 = wrap(g, a.counter, 850, y, 250, { size: 16, col: TONE.green.col, w: 700, align: 'center', lh: 21 }); y += l2.length * 21 + 22;
        text(g, 'The article’s example', 850, y, { size: 12, col: C.muted, w: 700 }); y += 24;
        wrap(g, a.ex || 'none named', 850, y, 250, { size: 14, col: a.ex ? C.ink : C.muted, it: !a.ex, align: 'center', lh: 19 });
        text(g, 'Click anywhere to go back', 850, 556, { size: 13, col: C.muted });
        st.sync?.(); return;
      }
      P.keys.forEach((k, i) => tile(g, k, X(i), Y(i), t));
      if (P.extra) triggerCell(g);
      if (P.keys.length < 8) mapCell(g, page);
      st.sync?.();
    },
    side(t, st, tour) {
      const a = st.focus && !tour && A[st.focus];
      return { out: a ? `<b>${a.name}:</b> ${a.line.toLowerCase()}. The answer it asks for: ${a.counter.toLowerCase()}.` : P.out };
    },
  }));
})();
