/* Netherspite (post-mortem: "Netherspite: The Clash of Novelty and Game Difficulty").
   Three portals fire beams at the boss. Whoever stands nearest the portal on a beam's line takes it instead:
   red for a tank, green for a healer, blue for damage. Hold a beam for 20 s and you die (the version 2 rule), so each
   beam has two people: the holder in front and a partner behind. To swap, the one waiting steps back in front, or the
   holder steps aside and the beam falls through to the partner. An uncovered beam powers the boss.
   The layer panel adds version 3's features one at a time (void zones, the banish phase with knockbacks, portals that
   move after it) and the meters count how many steps must be exact and how much room for mistakes the raid has left.
   "Let players use their own tools" applies the retrospective: telegraph the moments that need protection, and drop
   the knockbacks. Fixed-step simulation from t = 0, so the walk-through and __seek are deterministic.
   Numbers (timings, power, budget) are illustrative, chosen to show the shape of the problem. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp } = TD, TAU = Math.PI * 2;
  const W = 1040, H = 585, DT = 1 / 60, LOOP = 60;
  const BX = 330, BY = 292, PR = 225;            // boss and portal radius
  const BEAMS = [
    { id: 'red', col: '#e5322d', rgb: '229,50,45', role: 'tank', off: 0 },
    { id: 'green', col: '#2fae63', rgb: '47,174,99', role: 'healer', off: 3.3 },
    { id: 'blue', col: '#2e7fdc', rgb: '46,127,220', role: 'damage', off: 6.6 },
  ];
  const ANG0 = [-2.5, -.64, 1.57], ANG1 = [2.75, .2, -1.57];   // portal angles before and after the banish
  const SLOT_A = 70, SLOT_B = 125, HOLD_MAX = 20, SWAP = 10;
  const BANISH = [30, 38], ZONES = [{ t: 13, beam: 0 }, { t: 22, beam: 1 }, { t: 45, beam: 2 }], KNOCKS = [31, 33, 35, 37];
  const BUDGET = 80, COST = { uncovered: 6, zone: 3, death: 40, knock: 4 };

  const rng = seed => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const portalAt = (i, t, o) => { const a = (o.random && t >= BANISH[1]) ? ANG1[i] : ANG0[i]; return { x: BX + Math.cos(a) * PR, y: BY + Math.sin(a) * PR, a }; };
  const along = (p, d) => { const dx = BX - p.x, dy = BY - p.y, L = Math.hypot(dx, dy); return { x: p.x + dx / L * d, y: p.y + dy / L * d }; };
  const beamOn = (t, o) => !(o.banish && t >= BANISH[0] && t < BANISH[1]);

  function fresh(o) {
    const ppl = [];
    BEAMS.forEach((b, i) => {
      ['A', 'B'].forEach((slot, k) => ppl.push({ beam: i, mover: k === 0, x: 0, y: 0, stacks: 0, dead: false, you: i === 2 && k === 0, col: b.col, react: 0, lastPlan: '' }));
    });
    ppl.forEach(p => { const q = plan(p, 0, o, null); p.x = q.x; p.y = q.y; });
    return { t: 0, o, ppl, power: 0, cost: { uncovered: 0, zone: 0, death: 0, knock: 0 }, uncovered: [0, 0, 0], r: rng(11), kb: [], pops: [] };
  }

  // where a scripted raider wants to stand at time t. The mover holds 0-10 s, steps aside 10-20 s, steps back in, and so on.
  function plan(p, t, o, S) {
    const b = BEAMS[p.beam], tt = t + b.off, inFront = Math.floor(tt / SWAP) % 2 === 0;
    // with telegraphs on, raiders read where the portals will reopen and walk there during the banish
    const look = o.tools && o.banish && t >= BANISH[0] + 2 ? BANISH[1] : t;
    const po = portalAt(p.beam, look, o);
    let dA = SLOT_A, dB = SLOT_B;
    const z = S && activeZone(S, t + (o.tools ? 2 : 0), p.beam);
    if (z) { dA = 24; dB = 190; }      // the zone sits on both slots: front person hugs the portal, partner moves up to the boss
    const a = along(po, p.mover ? dA : dB);
    if (p.mover && !inFront) { const nx = -(BY - po.y), ny = BX - po.x, L = Math.hypot(nx, ny); return { x: a.x + nx / L * 46, y: a.y + ny / L * 46 }; }
    return a;
  }
  function activeZone(S, t, beam) {
    if (!S.o.zones) return null;
    return ZONES.find(z => z.beam === beam && t >= z.t && t < z.t + 25) || null;
  }
  function zoneAt(z, o) { const po = portalAt(z.beam, z.t, o); return { ...along(po, (SLOT_A + SLOT_B) / 2), r: 56 }; }

  function holderOf(S, i) {
    const po = portalAt(i, S.t, S.o), dx = BX - po.x, dy = BY - po.y, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
    let best = null, bd = 1e9;
    S.ppl.forEach(p => {
      if (p.dead) return;
      const rx = p.x - po.x, ry = p.y - po.y, d = rx * ux + ry * uy, perp = Math.abs(rx * uy - ry * ux);
      if (d > 0 && d < L - 30 && perp < 20 && d < bd) { bd = d; best = p; }
    });
    return { p: best, po, d: best ? bd : L };
  }

  function step(S, keys) {
    const t = S.t, o = S.o;
    // movement
    S.ppl.forEach(p => {
      if (p.dead) return;
      let vx = 0, vy = 0;
      if (p.you && keys) { vx = (keys.d - keys.a); vy = (keys.s - keys.w); }
      else {
        const key = JSON.stringify(plan(p, t, o, S));
        if (key !== p.lastPlan) { p.lastPlan = key; p.react = o.tools ? .15 : .8; }   // reaction delay before reacting to a change
        if (p.react > 0) p.react -= DT;
        else { const q = JSON.parse(key), dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy); if (d > 2) { vx = dx / d; vy = dy / d; } }
      }
      const m = Math.hypot(vx, vy); if (m) { p.x += vx / m * 170 * DT; p.y += vy / m * 170 * DT; }
      p.x = clamp(p.x, 30, 630); p.y = clamp(p.y, 30, 555);
    });
    // knockbacks during the banish (Netherbreath), dropped when players get their own tools
    if (o.banish && !o.tools) KNOCKS.forEach(k => {
      if (t < k && t + DT >= k) {
        const alive = S.ppl.filter(p => !p.dead), p = alive[Math.floor(S.r() * alive.length)];
        const dx = p.x - BX, dy = p.y - BY, L = Math.hypot(dx, dy) || 1; p.x += dx / L * 110; p.y += dy / L * 110; p.x = clamp(p.x, 30, 630); p.y = clamp(p.y, 30, 555);
        S.kb.push({ x: p.x, y: p.y, t }); S.cost.knock += COST.knock; p.lastPlan = '';
      }
    });
    // beams
    const on = beamOn(t, o);
    S.ppl.forEach(p => p.holding = -1);
    if (on) BEAMS.forEach((b, i) => {
      const h = holderOf(S, i);
      if (h.p) h.p.holding = i; else { S.uncovered[i] += DT; S.cost.uncovered += COST.uncovered * DT; }
    });
    S.ppl.forEach(p => {
      if (p.dead) return;
      if (p.holding >= 0) { p.stacks += DT; if (p.stacks >= HOLD_MAX) { p.dead = true; S.cost.death += COST.death; S.pops.push({ x: p.x, y: p.y, t, text: 'held 20 s' }); } }
      else p.stacks = Math.max(0, p.stacks - DT * 4);
      if (o.zones) ZONES.forEach(z => { if (t >= z.t && t < z.t + 25) { const q = zoneAt(z, o); if (Math.hypot(p.x - q.x, p.y - q.y) < q.r) S.cost.zone += COST.zone * DT; } });
    });
    S.power = S.cost.uncovered + S.cost.zone + S.cost.death + S.cost.knock;
    S.t += DT;
  }

  // the meters: forced steps per minute that come with no warning, and room left for mistakes
  function meters(o) {
    const swaps = 3 * (LOOP / SWAP);
    const zoneSteps = o.zones ? ZONES.length * 2 : 0, banishSteps = o.banish ? 6 + (o.tools ? 0 : KNOCKS.length) : 0, portalSteps = o.random ? 6 : 0;
    const warned = o.tools ? zoneSteps + portalSteps + (o.banish ? 6 : 0) : 0;
    const exact = swaps + zoneSteps + banishSteps + portalSteps - warned;
    const tips = 2 + (o.zones ? 1 : 0) + (o.banish ? 2 : 0) + (o.random ? 1 : 0);
    return { exact, tips };
  }
  const roomLeft = S => Math.max(0, Math.floor((BUDGET + (S.o.tools ? 30 : 0) - S.power) / 10));

  function draw(g, S, mode) {
    T.use(g); g.clearRect(0, 0, W, H);
    g.save(); g.beginPath(); g.roundRect(10, 10, 640, 565, 14); g.clip(); T.floor(10, 10, 640, 565); g.restore();
    g.strokeStyle = '#cdbf9f'; g.lineWidth = 2; g.beginPath(); g.roundRect(10, 10, 640, 565, 14); g.stroke();
    const t = S.t, o = S.o, on = beamOn(t, o);
    // void zones
    if (o.zones) ZONES.forEach(z => {
      const q = zoneAt(z, o);
      if (o.tools && t >= z.t - 2 && t < z.t) { g.setLineDash([8, 6]); g.strokeStyle = 'rgba(60,20,90,.8)'; g.lineWidth = 3; g.beginPath(); g.arc(q.x, q.y, q.r, 0, TAU); g.stroke(); g.setLineDash([]); T.label('void zone in ' + (z.t - t).toFixed(1) + ' s', q.x, q.y - q.r - 12, 'center', C.ink, 12); }
      if (t >= z.t && t < z.t + 25) { const gr = g.createRadialGradient(q.x, q.y, 0, q.x, q.y, q.r); gr.addColorStop(0, 'rgba(30,8,50,.75)'); gr.addColorStop(1, 'rgba(60,20,90,.25)'); g.fillStyle = gr; g.beginPath(); g.arc(q.x, q.y, q.r, 0, TAU); g.fill(); }
    });
    // portals and beams
    BEAMS.forEach((b, i) => {
      const h = holderOf(S, i), po = h.po;
      if (on) {
        const end = h.p ? { x: h.p.x, y: h.p.y } : { x: BX, y: BY };
        g.strokeStyle = `rgba(${b.rgb},.85)`; g.lineWidth = h.p ? 9 : 5; g.lineCap = 'round';
        g.beginPath(); g.moveTo(po.x, po.y); g.lineTo(end.x, end.y); g.stroke();
        g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 2; g.setLineDash([4, 10]); g.lineDashOffset = -t * 80; g.stroke(); g.setLineDash([]);
        if (!h.p) T.label('uncovered: boss empowered', (po.x + BX) / 2, (po.y + BY) / 2 - 14, 'center', b.col, 12);
      }
      if (o.tools && o.random && o.banish && t >= BANISH[0] + 2 && t < BANISH[1]) { const n = portalAt(i, BANISH[1], o); g.setLineDash([5, 5]); g.strokeStyle = b.col; g.lineWidth = 2; g.beginPath(); g.arc(n.x, n.y, 20, 0, TAU); g.stroke(); g.setLineDash([]); }
      const pa = on ? 1 : .35;
      g.globalAlpha = pa; g.fillStyle = `rgba(${b.rgb},.25)`; g.strokeStyle = b.col; g.lineWidth = 4; g.beginPath(); g.arc(po.x, po.y, 20 + Math.sin(t * 4 + i) * 2, 0, TAU); g.fill(); g.stroke(); g.globalAlpha = 1;
    });
    // boss
    T.foe(BX, BY, 40, -Math.PI / 2, on ? '#3fb59a' : '#8fb8ac', { edge: '#1d6b5a', mark: 'horns' });
    if (!on) T.label('banished: Netherbreath', BX, BY + 58, 'center', C.ink, 13);
    // knockback marks
    S.kb.forEach(k => { const a = 1 - (t - k.t) / 1.2; if (a > 0) T.flash(k.x, k.y, 60, a); });
    // raiders
    S.ppl.forEach(p => {
      if (p.dead) { g.fillStyle = 'rgba(40,30,20,.35)'; g.beginPath(); g.arc(p.x, p.y, 14, 0, TAU); g.fill(); return; }
      T.player(p.x, p.y, Math.atan2(BY - p.y, BX - p.x), .75, 1, p.you ? C.player : p.col);
      if (p.you) T.label('you', p.x, p.y - 30, 'center', C.ink, 12);
      if (p.stacks > .3) {
        const v = p.stacks / HOLD_MAX; g.fillStyle = 'rgba(21,32,68,.75)'; g.fillRect(p.x - 19, p.y + 18, 38, 7);
        g.fillStyle = v > .75 ? C.red : C.gold; g.fillRect(p.x - 18, p.y + 19, 36 * v, 5);
      }
    });
    S.pops.forEach(q => { const a = 1 - (t - q.t) / 2; if (a > 0) T.label(q.text, q.x, q.y - 30, 'center', C.red, 13); });

    // right panel: meters
    const m = meters(o), room = roomLeft(S), x0 = 680;
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    g.font = '800 17px Montserrat, Jost, sans-serif'; g.fillStyle = C.ink; g.fillText(o.v3 ? 'Version 3 layers' : 'Version 2: swap or die', x0, 40);
    g.font = '600 14px Jost, sans-serif'; g.fillStyle = C.muted; g.fillText(`${(t % LOOP).toFixed(1)} s of a ${LOOP} s cycle`, x0, 62);
    const bar = (lab, v, max, y, col, note) => {
      g.font = '600 15px Jost, sans-serif'; g.fillStyle = C.ink; g.fillText(lab, x0, y);
      g.fillStyle = '#e6dcc5'; g.beginPath(); g.roundRect(x0, y + 10, 330, 22, 6); g.fill();
      g.fillStyle = col; g.beginPath(); g.roundRect(x0, y + 10, Math.max(4, 330 * clamp(v / max)), 22, 6); g.fill();
      g.font = '800 16px Montserrat, Jost, sans-serif'; g.fillStyle = C.ink; g.textAlign = 'right'; g.fillText(String(v), x0 + 330, y); g.textAlign = 'left';
      if (note) { g.font = '500 12px Jost, sans-serif'; g.fillStyle = C.muted; g.fillText(note, x0, y + 48); }
    };
    bar('Steps that must be exact, per minute', m.exact, 45, 110, C.gold, 'beam swaps, dodges and re-entries that come with no warning');
    bar('Mistakes the raid can recover from', room, 13, 190, room > 3 ? C.p2 : C.red, 'one second of an uncovered beam, or a step late, each costs one');
    bar('Lines of tooltip to learn', m.tips, 6, 270, C.p3, '');
    // tally
    g.font = '600 14px Jost, sans-serif'; g.fillStyle = C.ink;
    const rows = [['uncovered beams', S.cost.uncovered], ['standing in void zones', S.cost.zone], ['knocked off a beam', S.cost.knock], ['held a beam 20 s', S.cost.death]];
    g.fillText('Where this pull spent its room', x0, 352);
    rows.forEach(([n, v], i) => { g.fillStyle = C.muted; g.fillText(n, x0, 378 + i * 22); g.textAlign = 'right'; g.fillStyle = v > 0 ? C.red : C.muted; g.fillText(v.toFixed(0), x0 + 330, 378 + i * 22); g.textAlign = 'left'; });
    g.fillStyle = C.ink; g.font = '700 14px Jost, sans-serif'; g.fillText(`Boss power ${S.power.toFixed(0)} / ${BUDGET + (o.tools ? 30 : 0)}`, x0, 476);
    g.fillStyle = '#e6dcc5'; g.fillRect(x0, 486, 330, 12); g.fillStyle = C.red; g.fillRect(x0, 486, 330 * clamp(S.power / (BUDGET + (o.tools ? 30 : 0))), 12);
    if (S.power >= BUDGET + (o.tools ? 30 : 0)) T.stamp('WIPE', 330, 120, C.red, 1, 40);
    g.font = '500 12px Jost, sans-serif'; g.fillStyle = C.muted;
    g.fillText(mode === 'play' ? 'You hold blue. W A S D. Step aside before 20 s; step back in front to take it.' : 'Press W A S D to drive the blue raider yourself.', x0, 530);
  }

  // walk-through: four acts, each a fresh 15 s run with one more layer
  const ACTS = [
    { name: 'Version 2: swap or die', o: { zones: false, banish: false, random: false, tools: false }, from: 0 },
    { name: '+ void zones', o: { zones: true, banish: false, random: false, tools: false }, from: 8 },
    { name: '+ banish and knockbacks, portals move', o: { zones: true, banish: true, random: true, tools: false }, from: 30 },
    { name: 'Let players use their own tools', o: { zones: true, banish: true, random: true, tools: true }, from: 30 },
  ];
  const ACT_LEN = 14, DUR = ACT_LEN * ACTS.length;

  const scenes = {};
  canvasDemo('nether', (s, cv, g) => {
    const st = { tour: true, held: false, S: null, keys: { w: 0, a: 0, s: 0, d: 0 }, acc: 0, tt: 0, act: -1, key: '' };
    const boxes = { zones: $(s, '.ns-zones'), banish: $(s, '.ns-banish'), random: $(s, '.ns-random'), tools: $(s, '.ns-tools') };
    const tourBtn = $(s, '.ns-tour'), playBtn = $(s, '.ns-play');
    const opts = () => { const o = {}; Object.keys(boxes).forEach(k => o[k] = boxes[k].checked); o.v3 = o.zones || o.banish || o.random; return o; };
    const restart = (from = 0) => { st.S = fresh(opts()); while (st.S.t < from) step(st.S, null); st.acc = 0; };
    const setBoxes = o => Object.keys(boxes).forEach(k => boxes[k].checked = !!o[k]);
    const manual = () => { st.tour = false; tourBtn.classList.remove('on'); };
    Object.values(boxes).forEach(b => b.onchange = () => { manual(); restart(); });
    tourBtn.onclick = () => { st.tour = true; st.tt = 0; st.act = -1; tourBtn.classList.add('on'); playBtn.classList.remove('on'); st.mode = 'tour'; };
    playBtn.onclick = () => { manual(); playBtn.classList.add('on'); st.mode = 'play'; restart(); };
    s._key = (e, down) => { const k = e.key.toLowerCase(); if (k.length === 1 && 'wasd'.includes(k)) { if (st.mode !== 'play' && down) playBtn.onclick(); st.keys[k] = down ? 1 : 0; e.preventDefault(); } };
    function tourAt(tt) {
      const i = Math.min(ACTS.length - 1, Math.floor(tt / ACT_LEN)), a = ACTS[i];
      if (i !== st.act) { st.act = i; setBoxes(a.o); st.S = fresh({ ...a.o, v3: a.o.zones }); while (st.S.t < a.from) step(st.S, null); }
      return a;
    }
    function info() {
      const S = st.S, room = roomLeft(S), m = meters(S.o), key = [m.exact, room, m.tips, S.o.tools].join();
      if (key === st.key) return; st.key = key;
      say($(s, '.ns-stats'), `<div class="${m.exact > 25 ? 'y' : ''}"><b>${m.exact}</b><span>exact steps a minute</span></div><div class="${room <= 3 ? 'r' : 'g'}"><b>${room}</b><span>mistakes left to absorb</span></div>`);
      say($(s, '.ns-out'), S.o.tools
        ? 'The retrospective: telegraph the moments that need protection and cut the knockbacks. The same layers now come with warning, so raiders move before the rule bites and the raid keeps room to recover.'
        : S.o.v3 ? 'Each layer was reasonable on its own. Together they leave the raid a dance: exact steps, almost no room to recover. "You had to take exactly the proper steps or you failed."'
          : 'Version 2: the holder in front takes the beam; step aside and it falls to your partner behind. Hold it 20 s and you die. It works, and the playtesters called it boring.');
    }
    scenes.nether = { seek(t) { st.held = true; st.act = -1; const a = tourAt(t); const target = a.from + (t - ACT_LEN * st.act); while (st.S.t < target) step(st.S, null); draw(g, st.S, 'tour'); if (a) T.label(a.name, 330, 32, 'center', C.ink, 15, 'rgba(255,185,81,.92)'); info(); }, dur: () => DUR };
    st.mode = 'tour';
    tourAt(0);
    return dt => {
      if (st.held) return;
      dt = Math.min(.1, Math.max(0, dt));
      let a = null;
      if (st.tour) { st.tt += dt; if (st.tt >= DUR) { st.tt = 0; st.act = -1; } a = tourAt(st.tt); }
      st.acc += dt; while (st.acc >= DT) { step(st.S, st.mode === 'play' ? st.keys : null); st.acc -= DT; }
      if (!st.tour && st.S.t >= LOOP) restart();
      draw(g, st.S, st.mode); if (a) T.label(a.name, 330, 32, 'center', C.ink, 15, 'rgba(255,185,81,.92)'); info();
    };
  }, {
    enter(s) { s._kd = e => s._key(e, true); s._ku = e => s._key(e, false); addEventListener('keydown', s._kd); addEventListener('keyup', s._ku); },
    leave(s) { removeEventListener('keydown', s._kd); removeEventListener('keyup', s._ku); },
  });

  window.__seek = (t, which = 'nether') => scenes[which].seek(t);
  window.__dur = (which = 'nether') => scenes[which].dur();
})();
