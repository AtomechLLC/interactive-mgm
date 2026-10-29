/* Souls archetype composer (MGM C4 M7, deck slides 155-173). Archetypes are recurring play patterns; a creature is a few of
   them on one body (slide 163: Crab = Sweeper + Brute + Grappler; slide 171: Defender + Zone Healer + Brute). Pick up to three
   and one creature runs them all: its attacks take turns, its passives (a shield, a dodge, a heal ring) are always on, and
   the player answers each one the way the notes describe. "Draw 3" deals a random hand: "What do you imagine?" (notes on 171).
   Archetype names, icons and answers come from arch.js, shared with the gallery. */
(function () {
  const { $, $$ } = FPF.kit;
  const { text, wrap, chip, TONE, panel, scene, pointer, inBox, clamp, lerp, ease } = CK;
  const T = TD, C = TD.C, A = Object.assign({}, window.ARCH.ARCH, {
    grappler: { name: 'Grappler', gi: 'grab', col: '#8a5a2a', line: 'Reaches out, grabs you and pulls you in', counter: 'Sidestep the reach, punish the miss' },
  });
  const KEYS = ['flailer', 'fighter', 'brute', 'sweeper', 'grappler', 'rampager', 'defender', 'evader', 'healer'];
  const PASSIVE = { defender: 1, evader: 1, healer: 1 };
  const PRESETS = [
    { name: 'Giant Crab', keys: ['sweeper', 'brute', 'grappler'], gi: 'crab', col: '#c2412c', note: 'Slide 163: the crabs are combinations of the sweeper, brute and grappler archetypes.' },
    { name: 'Paladin', keys: ['defender', 'healer', 'brute'], gi: 'templar-shield', col: '#c9a23a', note: 'Slide 171: a heavy hammer, a shield, and a radiance that heals nearby allies.' },
  ];
  const DEAL = ['flailer', 'evader', 'healer'];
  const CX = i => 76 + (i % 3) * 114, CY = i => 78 + Math.floor(i / 3) * 98;
  const AX = 706, AY = 300, SLOT = 3, DUR = 27;
  const ph = (t, a, b) => clamp((t - a) / (b - a));
  const pop = (s, x, y, age, col = C.redDk) => { if (age >= 0 && age < .9) T.popText(s, x, y - age * 26, col, 1 - age / .9); };

  // attack modules: where the player steps (pm), where the body goes (bm), what is drawn under (draw) and the answer (say)
  const ATK = {
    flailer: { say: 'block the flurry', pm: a => -ph(a, .1, .5) * (1 - ph(a, 2.6, 2.95)) * 95,
      draw(g, a, c) { for (let i = 0; i < 4; i++) { const k = a - .6 - i * .32; if (k >= 0 && k < .3) T.cone(c.x, c.y, c.f + (i % 2 ? .4 : -.4), .55, 110, 1 - k / .3); } if (a > .6 && a < 2) T.bubble(c.px, c.py, 26, a, .9); for (let i = 0; i < 4; i++) pop('block', c.px, c.py - 30, a - .7 - i * .32, C.blue); } },
    fighter: { say: 'don’t over-commit',
      bm: (a, c) => { const k = a > 1.3 && a < 1.8 ? Math.sin(ph(a, 1.3, 1.8) * Math.PI) * 50 : 0; return [Math.cos(c.f) * k + Math.sin(a * 2) * 14, Math.sin(c.f) * k]; },
      draw(g, a, c) { if (a > .9 && a < 1.4) T.cone(c.x, c.y, c.f, .22, 130, ph(a, .9, 1.3)); pop('-20', c.px, c.py - 30, a - 1.6); } },
    brute: { say: 'roll out, punish the recovery',
      pm: a => ph(a, 1.2, 1.5) * (1 - ph(a, 2.2, 2.5)) * 70,
      draw(g, a, c) { const k = ph(a, .2, 1.6); if (a > .2 && a < 1.6) T.zone(c.sx, c.sy, 80 * k, .5 + .5 * k); if (a > 1.6 && a < 1.95) T.flash(c.sx, c.sy, 100, 1 - ph(a, 1.6, 1.95)); if (a > 1.9 && a < 2.9) T.label('slow recovery', c.x, c.y + 48, 'center', C.goldInk, 12); } },
    sweeper: { say: 'get out of the arc',
      pm: a => ph(a, .8, 1.1) * (1 - ph(a, 2, 2.3)) * 80,
      draw(g, a, c) { if (a > .3 && a < 1.2) T.cone(c.x, c.y, c.f, 1.35, 150, .35 + .3 * Math.sin(a * 12)); const s = ph(a, 1.2, 1.7); if (a > 1.2 && a < 1.85) T.cone(c.x, c.y, c.f - 1.35 + s * 1.35, s * 1.35, 150, .7); } },
    grappler: { say: 'sidestep the reach',
      pm: a => ph(a, .9, 1.15) * (1 - ph(a, 2.2, 2.5)) * 60, side: true,
      draw(g, a, c) { if (a > .2 && a < 1.1) T.laser(c.x, c.y, c.sx, c.sy, .5 + .5 * Math.sin(a * 14)); const k = ph(a, 1.1, 1.35) * (1 - ph(a, 1.5, 1.8)); if (k > 0) { T.tracer(c.x, c.y, lerp(c.x, c.sx, k), lerp(c.y, c.sy, k), 1, '#8a5a2a', 7); GI.draw(g, 'crab-claw', lerp(c.x, c.sx, k), lerp(c.y, c.sy, k), 30, '#8a5a2a', c.f); } if (a > 1.3 && a < 1.9) T.label('missed', c.sx, c.sy - 30, 'center', C.muted, 12); } },
    rampager: { say: 'survive the rush, punish the rest',
      pm: a => ph(a, .4, .7) * (1 - ph(a, 2, 2.3)) * 70, side: true,
      bm: (a, c) => { const k = ease(ph(a, .3, 1.3)) * (1 - ease(ph(a, 2.6, 3))) * c.d * .55; return [Math.cos(c.f) * k, Math.sin(c.f) * k + Math.sin(a * 18) * 8 * (a > .3 && a < 1.3)]; },
      draw(g, a, c) { if (a > .3 && a < 1.3) for (let i = 0; i < 3; i++) T.cone(c.x, c.y, c.f + Math.sin(a * 14 + i) * .5, .7, 80, .5); if (a > 1.4 && a < 2.6) T.label('exhausted', c.x, c.y - 52, 'center', C.goldInk, 12); } },
  };
  const POKE = { say: 'keep moving', draw(g, a, c) { if (a > 1 && a < 1.5) T.cone(c.x, c.y, c.f, .3, 100, ph(a, 1, 1.4)); } };

  function creature(t, st, tour) {
    if (!tour) return st;
    const i = Math.min(2, Math.floor(t / 9)), u = t - i * 9;
    const keys = i < 2 ? PRESETS[i].keys : DEAL;
    return { keys: keys.filter((k, j) => u >= .3 + j * .45), preset: i < 2 ? i : null, dealt: i === 2, u };
  }
  function body(c) {
    const p = c.preset != null ? PRESETS[c.preset] : null;
    return { gi: p ? p.gi : c.keys.length ? A[c.keys[0]].gi : 'ghost', col: p ? p.col : c.keys.length ? A[c.keys[0]].col : '#9a9480', name: p ? p.name : c.dealt ? 'What do you imagine?' : c.keys.length ? 'Your creature' : 'Pick up to three' };
  }

  function arena(g, c, t) {
    panel(g, 380, 14, 648, 558, { title: 'One creature, all of its patterns' });
    g.save(); g.beginPath(); g.roundRect(392, 40, 624, 520, 10); g.clip(); T.use(g); T.floor(392, 40, 624, 520);
    g.translate(AX, AY + 16); g.scale(1.22, 1.22);
    const atk = c.keys.filter(k => !PASSIVE[k]), has = k => c.keys.includes(k);
    const mods = atk.length ? atk : [null], slot = Math.floor(t / SLOT), a = t % SLOT, M = mods[slot % mods.length] ? ATK[mods[slot % mods.length]] : POKE;
    const B = body(c);
    // the player circles on the left; each attack moves them the way its answer says
    const th = Math.PI + Math.sin(t * .4) * .8, R = 170;
    let px = Math.cos(th) * R + 40, py = Math.sin(th) * R * .8;
    const bx0 = 60, by0 = 0, f0 = Math.atan2(py - by0, px - bx0), d = Math.hypot(px - bx0, py - by0);
    const th0 = Math.PI + Math.sin((t - a) * .4) * .8, sx = Math.cos(th0) * R + 40, sy = Math.sin(th0) * R * .8;   // aimed where you stood
    const pmv = M.pm ? M.pm(a) : 0;
    if (pmv) { const ang = M.side ? f0 + Math.PI / 2 : f0; px += Math.cos(ang) * pmv; py += Math.sin(ang) * pmv; }
    let [ox, oy] = M.bm ? M.bm(a, { f: f0, d }) : [0, 0];
    // evader: sidesteps the player's strike
    const dodge = has('evader') ? ease(ph(a, 2.25, 2.45)) * (1 - ease(ph(a, 2.8, 3))) * 50 : 0;
    ox += Math.cos(f0 + Math.PI / 2) * dodge; oy += Math.sin(f0 + Math.PI / 2) * dodge;
    const x = bx0 + ox, y = by0 + oy, f = Math.atan2(py - y, px - x);
    const ctx = { x, y, f, px, py, sx, sy, d };
    // zone healer: a ring and two minions inside it
    if (has('healer')) {
      const pulse = (t % 1.3) / 1.3;
      T.zone(x, y, 130, 1, '47,174,99'); g.strokeStyle = `rgba(47,174,99,${1 - pulse})`; g.lineWidth = 3; g.beginPath(); g.arc(x, y, 130 * pulse, 0, Math.PI * 2); g.stroke();
      [[70, -95], [110, 80]].forEach(([mx, my], i) => { T.foe(bx0 + mx, my, 14, f, '#e07a6e', { hp: .55 + .4 * ((t * .25 + i * .4) % 1), hpMax: 1 }); pop('+', bx0 + mx, my - 26, (t + i * .5) % 1.3, C.good); });
    }
    M.draw(g, a, ctx);
    const mark = has('defender') ? 'shield' : has('brute') || has('rampager') ? 'horns' : has('healer') ? 'staff' : null;
    T.foe(x, y, has('brute') ? 38 : 30, f, B.col, { mark, edge: C.navy });
    GI.draw(g, B.gi, x, y, has('brute') ? 34 : 28, '#fff');
    T.player(px, py, Math.atan2(y - py, x - px), .95);
    // the player's strike, and what the creature's passives do to it
    if (a > 2.3 && a < 2.55) T.tracer(px, py, lerp(px, x, .8), lerp(py, y, .8), 1 - ph(a, 2.3, 2.55), C.gold, 5);
    const res = has('evader') ? ['dodged: bait it first', C.muted] : has('defender') ? ['clang: go around the shield', C.blue] : ['-18', C.redDk];
    pop(res[0], x, y - 50, a - 2.4, res[1]);
    g.restore();
    T.label(`${M === POKE ? 'Poke' : A[mods[slot % mods.length]].name}: ${M.say}`, AX, 72, 'center', C.navy, 15);
  }

  scene('arch-composer', {
    dur: DUR,
    state: () => ({ keys: [], preset: null, dealt: false }),
    init(s, st, api) {
      const take = () => { if (st.tour) api.manual(); };
      const box = $(s, '.ac-presets');
      box.innerHTML = PRESETS.map((p, i) => `<button class="btn" data-i="${i}">${p.name}</button>`).join('') + `<button class="btn" data-i="d">🎲 Draw 3</button><button class="btn" data-i="c">Clear</button>`;
      $$(box, '.btn').forEach(b => b.onclick = () => {
        take(); const i = b.dataset.i;
        if (i === 'c') Object.assign(st, { keys: [], preset: null, dealt: false });
        else if (i === 'd') { const pool = [...KEYS], keys = []; while (keys.length < 3) keys.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]); Object.assign(st, { keys, preset: null, dealt: true }); }
        else Object.assign(st, { keys: [...PRESETS[+i].keys], preset: +i, dealt: false });
        st.t = 0;
      });
      pointer(api.cv, (x, y, type) => {
        if (type !== 'down') return;
        KEYS.forEach((k, i) => { if (inBox(x, y, CX(i), CY(i) + 16, 106, 88)) { take(); st.keys = st.keys.includes(k) ? st.keys.filter(q => q !== k) : [...st.keys, k].slice(-3); const p = PRESETS.findIndex(p => p.keys.length === st.keys.length && p.keys.every(q => st.keys.includes(q))); st.preset = p < 0 ? null : p; st.dealt = false; st.t = 0; } });
      });
    },
    draw(g, t, st, tour) {
      const c = creature(t, st, tour), tt = tour ? c.u : t, B = body(c);
      panel(g, 16, 14, 352, 326, { title: 'Archetypes: pick up to three' });
      KEYS.forEach((k, i) => {
        const on = c.keys.includes(k), x = CX(i), y = CY(i) + 16, n = c.keys.indexOf(k);
        CK.card(g, x, y, 106, 88, { edge: on ? A[k].col : '#cdbf9f', lw: on ? 4 : 2, fill: on ? '#fffaf0' : 'rgba(255,250,240,.7)', shadow: on });
        GI.draw(g, A[k].gi, x, y - 14, 38, on ? A[k].col : '#b9b09a');
        text(g, A[k].name, x, y + 20, { size: 13.5, w: 800, col: on ? C.ink : C.muted });
        if (on) { g.fillStyle = C.navy; g.beginPath(); g.arc(x + 42, y - 36, 12, 0, Math.PI * 2); g.fill(); text(g, String(n + 1), x + 42, y - 35, { size: 13, w: 800, col: '#fff' }); }
        if (PASSIVE[k]) text(g, 'always on', x, y + 36, { size: 11, col: C.muted, it: true });
      });
      // the recipe
      panel(g, 16, 350, 352, 222);
      let x = 32;
      c.keys.forEach((k, i) => { const w = chip(g, A[k].name, x, 378, { ...TONE.red, size: 13, align: 'left' }); x += w + (i < c.keys.length - 1 ? 18 : 0); if (i < c.keys.length - 1) text(g, '+', x - 9, 378, { size: 16, w: 800, col: C.redDk }); });
      if (!c.keys.length) text(g, 'No archetypes yet', 32, 378, { align: 'left', size: 14, col: C.muted });
      GI.draw(g, B.gi, 46, 420, 34, B.col);
      text(g, `= ${B.name}`, 70, 420, { align: 'left', size: c.dealt ? 18 : 22, w: 800, display: true });
      text(g, 'It asks you to', 32, 458, { align: 'left', size: 13, w: 700, col: C.muted });
      c.keys.forEach((k, i) => text(g, `• ${A[k].counter}`, 32, 482 + i * 22, { align: 'left', size: 13.5, w: 600 }));
      arena(g, c, tt);
    },
    side(t, st, tour) {
      const c = creature(t, st, tour), p = c.preset != null ? PRESETS[c.preset] : null;
      const stats = `<div class="y"><b>${c.keys.length}</b><span>archetypes on one body</span></div><div class="g"><b>${KEYS.length}</b><span>here, of the 28 the deck lists</span></div>`;
      const out = p ? p.note : c.dealt ? 'Three archetypes dealt at random. What do you imagine? Name it, give it a look, and you have a creature.' : 'Each archetype brings one pattern and asks for one answer. A creature is a few of them on one body.';
      return { stats, out };
    },
  });
})();
