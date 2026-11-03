/* The Billion Dollar Hardware Mistake (Alex Brazie's outline), three spikes.
   order:  the same eight 32-bit floats added three ways (one at a time, in four SIMD lanes, as a GPU-style tree). Real
           maths says the order cannot matter; floats round after every add, so the last bits differ. Fixed-point
           integers agree every time. Numbers from listFor(seed).
   desync: two lockstep clients, same start, same inputs (sim.js). Client B adds forces in the other order. Floats split
           into two different games; fixed-point stays identical.
   wire:   why anyone bothers: replicating state costs bytes per unit, sending only inputs costs bytes per player, but
           only works when every machine computes the same result. Byte sizes in WIRE. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;
  const W = 1040, H = 585, f = Math.fround;
  const panel = g => { g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(255,252,244,.8)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill(); };
  const txt = (g, s, x, y, font, col = C.ink, al = 'left') => { g.font = font; g.fillStyle = col; g.textAlign = al; g.textBaseline = 'middle'; g.fillText(s, x, y); };
  const box = (g, x, y, w, h, fill, stroke, r = 10, lw = 2) => { g.beginPath(); g.roundRect(x, y, w, h, r); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); } };
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const freeOf = (st, btn) => () => { st.tour = false; btn.classList.remove('on'); };
  const apis = {};
  const bits = v => { const b = new DataView(new ArrayBuffer(4)); b.setFloat32(0, v); return b.getUint32(0).toString(16).padStart(8, '0').toUpperCase(); };

  /* ---------- 1: same numbers, different order ---------- */
  // a projectile's x: a big starting coordinate, then seven small per-frame moves (milli-units)
  const listFor = seed => { const r = rng(seed * 31 + 7), base = 4000 + Math.floor(r() * 4000) + Math.floor(r() * 1000) / 1000; return [base, ...Array.from({ length: 7 }, () => Math.round(1 + r() * 60) / 1000)]; };
  const ADD = (a, b, fixed) => fixed ? a + b : f(a + b);
  // each way returns its rows of partial sums, top to bottom
  const WAYS = {
    loop: { n: 'One at a time', sub: 'a CPU loop', rows: (v, x) => { const out = []; let acc = v[0]; for (let i = 1; i < v.length; i++) { acc = ADD(acc, v[i], x); out.push([acc]); } return out; } },
    simd: { n: 'Four lanes, then combine', sub: 'SIMD on another CPU', rows: (v, x) => { const lanes = [0, 1, 2, 3].map(k => ADD(v[k], v[k + 4], x)), two = [ADD(lanes[0], lanes[1], x), ADD(lanes[2], lanes[3], x)]; return [lanes, two, [ADD(two[0], two[1], x)]]; } },
    tree: { n: 'Smallest first', sub: 'a GPU reduction, sorted', rows: (v, x) => { const s = v.slice().sort((a, b) => a - b), out = []; let acc = s[0]; for (let i = 1; i < s.length; i++) { acc = ADD(acc, s[i], x); if (i % 2 === 0 || i === s.length - 1) out.push([acc]); } return out; } },
  };
  const WK = Object.keys(WAYS);
  const result = (seed, fixed) => { const v = listFor(seed).map(x => fixed ? Math.round(x * 1000) : f(x)); return WK.map(k => WAYS[k].rows(v, fixed).at(-1)[0]); };
  // seeds where the three float answers do not all agree, for the walk-through
  const SEEDS = (() => { const out = []; for (let s = 1; out.length < 3 && s < 500; s++) { const r = result(s, false); if (new Set(r).size === 3) out.push(s); } return out; })();
  canvasDemo('order', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, seed: SEEDS[0], fixed: false, key: '' };
    const tourBtn = $(s, '.or-tour'), free = freeOf(st, tourBtn);
    const setFixed = v => { st.fixed = v; $$(s, '.or-math .btn').forEach(b => b.classList.toggle('on', (b.dataset.m === 'fixed') === v)); };
    $$(s, '.or-math .btn').forEach(b => b.onclick = () => { free(); setFixed(b.dataset.m === 'fixed'); });
    $(s, '.or-new').onclick = () => { free(); st.seed++; };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    const DUR = 22;
    function render() {
      const t = st.t;
      if (st.tour) { st.seed = t < 7 ? SEEDS[0] : SEEDS[1]; setFixed(t > 14); }
      const raw = listFor(st.seed), v = raw.map(x => st.fixed ? Math.round(x * 1000) : f(x));
      const res = WK.map(k => WAYS[k].rows(v, st.fixed));
      const finals = res.map(r => r.at(-1)[0]), agree = new Set(finals).size === 1;
      const show = x => st.fixed ? (x / 1000).toFixed(3) : x.toFixed(6);
      T.use(g); panel(g);
      txt(g, st.fixed ? 'Fixed-point: whole numbers of thousandths' : '32-bit floats: rounded after every add', 24, 28, '800 19px Montserrat');
      txt(g, 'a projectile’s x: start, then seven small moves', W - 24, 28, '600 14px Jost', C.muted, 'right');
      // the numbers
      v.forEach((x, i) => { const bx = 24 + i * 124; box(g, bx, 46, 116, 40, i ? 'rgba(46,163,220,.1)' : 'rgba(21,32,68,.08)', i ? '#8ec6e6' : '#9aa0c8', 8, 1.5); txt(g, st.fixed ? String(x) : raw[i].toFixed(3), bx + 58, 66, '700 15px Jost', C.ink, 'center'); });
      // three machines
      const CW = 322;
      WK.forEach((k, m) => {
        const x = 24 + m * (CW + 12), rows = res[m], a = clamp((t % 7) * 1.4 - m * .5);
        box(g, x, 100, CW, 404, '#fffaf0', '#cdbf9f', 12, 2);
        GI.draw(g, m === 2 ? 'circuitry' : 'cpu', x + 26, 126, 26, C.navy);
        txt(g, `Machine ${'ABC'[m]}: ${WAYS[k].n}`, x + 46, 120, '800 14px Montserrat');
        txt(g, WAYS[k].sub, x + 46, 138, '600 12px Jost', C.muted);
        const rowH = Math.min(52, 270 / rows.length);
        rows.forEach((r, i) => {
          const y = 160 + i * rowH, vis = st.tour ? clamp(a * rows.length - i) : 1;
          if (vis <= 0) return; g.globalAlpha = vis;
          r.forEach((val, j) => { const w = (CW - 24) / r.length - 6, bx = x + 12 + j * (w + 6); box(g, bx, y, w, rowH - 8, 'rgba(255,185,81,.14)', '#e8cf9e', 6, 1); txt(g, show(val), bx + w / 2, y + (rowH - 8) / 2, `600 ${r.length > 2 ? 11 : 13}px Jost`, C.ink, 'center'); });
          g.globalAlpha = 1;
        });
        // the answer
        const fin = finals[m], same = finals.filter(o => o === fin).length;
        box(g, x + 12, 440, CW - 24, 54, agree ? 'rgba(47,174,99,.14)' : same > 1 ? 'rgba(255,185,81,.2)' : 'rgba(229,50,45,.12)', agree ? '#5fb47c' : same > 1 ? '#e0a92d' : '#e07b72', 8, 2);
        txt(g, show(fin), x + 24, 460, '800 20px Montserrat', agree ? C.good : C.redDk);
        txt(g, st.fixed ? `int ${fin}` : `bits 0x${bits(fin)}`, x + 24, 482, '600 12px Jost', C.muted);
      });
      T.stamp(agree ? 'All three agree' : 'Same maths, different answers', W / 2, 545, agree ? C.good : C.redDk, 1, 22);
      const key = [st.seed, st.fixed].join(); if (key === st.key) return; st.key = key;
      const ulp = !agree && !st.fixed ? Math.abs(Math.max(...finals) - Math.min(...finals)) : 0;
      say($(s, '.or-out'), st.fixed
        ? 'In fixed-point every add is exact, so the order cannot change the answer. Every machine gets the same bits.'
        : agree ? 'These numbers happened to round the same way. Try new numbers.'
          : `The answers differ by ${ulp.toPrecision(2)} units: a rounding step near ${Math.round(finals[0])}. Tiny, until two players’ machines need to agree on every bit, every frame.`);
    }
    apis.order = { seek(t) { st.held = st.tour = true; st.t = t; render(); }, dur: () => DUR };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > DUR) st.t = 0; render(); };
  });

  /* ---------- 2: the desync ---------- */
  canvasDemo('desync', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, mode: 'float', t0: 0, key: '' };
    const tourBtn = $(s, '.de-tour'), free = freeOf(st, tourBtn);
    const setMode = m => { st.mode = m; $$(s, '.de-math .btn').forEach(b => b.classList.toggle('on', b.dataset.m === m)); };
    $$(s, '.de-math .btn').forEach(b => b.onclick = () => { free(); setMode(b.dataset.m); st.t0 = st.t; });
    $(s, '.de-replay').onclick = () => { free(); st.t0 = st.t; };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    const RUN = LOCKSTEP.STEPS / 60 + 1, DUR = RUN * 2;
    function render() {
      const t = st.t;
      if (st.tour) { const m = t < RUN ? 'float' : 'fixed'; if (m !== st.mode) setMode(m); st.t0 = m === 'float' ? 0 : RUN; }
      const R = LOCKSTEP.run(st.mode), k = Math.min(LOCKSTEP.STEPS, Math.max(0, Math.floor((t - st.t0) * 60))), fr = R.frames[k];
      T.use(g); panel(g);
      // the arena: client A filled, client B outlined on top
      const AX = 24, AY = 64, SC = 470 / LOCKSTEP.BOX;
      txt(g, 'Two clients, same start, same inputs', AX, 30, '800 19px Montserrat');
      box(g, AX, AY, 470, 470, '#ddd2bc', '#cdbf9f', 10, 2);
      fr.a.forEach(([x, y], i) => { const [bx, by] = fr.b[i], d = Math.hypot(x - bx, y - by);
        if (d > 1) { g.strokeStyle = 'rgba(229,50,45,.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(AX + x * SC, AY + y * SC); g.lineTo(AX + bx * SC, AY + by * SC); g.stroke(); }
        g.fillStyle = 'rgba(46,163,220,.85)'; g.beginPath(); g.arc(AX + x * SC, AY + y * SC, LOCKSTEP.R * SC * .92, 0, 7); g.fill();
        g.strokeStyle = d > 1 ? C.red : '#152044'; g.lineWidth = 2.5; g.setLineDash(d > 1 ? [] : [5, 4]); g.beginPath(); g.arc(AX + bx * SC, AY + by * SC, LOCKSTEP.R * SC * .92, 0, 7); g.stroke(); g.setLineDash([]);
      });
      // legend
      g.fillStyle = 'rgba(46,163,220,.85)'; g.beginPath(); g.arc(AX + 12, 556, 8, 0, 7); g.fill(); txt(g, 'Client A', AX + 26, 556, '700 14px Jost');
      g.strokeStyle = '#152044'; g.lineWidth = 2.5; g.setLineDash([5, 4]); g.beginPath(); g.arc(AX + 120, 556, 8, 0, 7); g.stroke(); g.setLineDash([]); txt(g, 'Client B (adds in the other order)', AX + 134, 556, '700 14px Jost');
      // the gap chart
      const GX = 530, GY = 64, GW = 486, GH = 250, lg = v => clamp((Math.log10(Math.max(1e-4, v)) + 4) / 7);
      box(g, GX, GY, GW, GH, '#fffaf0', '#cdbf9f', 10, 2);
      txt(g, 'Largest gap between the clients (log scale)', GX + 12, GY + 18, '700 13px Jost', C.muted);
      [['0.0001', -4], ['0.01', -2], ['1', 0], ['100', 2]].forEach(([l, e]) => { const y = GY + GH - 14 - (e + 4) / 7 * (GH - 40); g.fillStyle = '#efe4cc'; g.fillRect(GX + 50, y, GW - 62, 1); txt(g, l, GX + 44, y, '600 11px Jost', C.muted, 'right'); });
      g.strokeStyle = st.mode === 'float' ? C.red : C.good; g.lineWidth = 3; g.beginPath();
      for (let q = 0; q <= k; q += 3) { const x = GX + 50 + q / LOCKSTEP.STEPS * (GW - 62), gp = R.frames[q].gap, y = GY + GH - 14 - (gp > 0 ? lg(gp) : 0) * (GH - 40); q ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke();
      if (gp0(R) && k >= R.first) { const x = GX + 50 + R.first / LOCKSTEP.STEPS * (GW - 62); g.strokeStyle = C.navy; g.setLineDash([4, 4]); g.lineWidth = 2; g.beginPath(); g.moveTo(x, GY + 30); g.lineTo(x, GY + GH - 14); g.stroke(); g.setLineDash([]); txt(g, `first bit differs: frame ${R.first}`, x + 6, GY + 40, '700 12px Jost', C.navy); }
      // checksums
      const same = fr.ca === fr.cb;
      box(g, GX, 330, GW, 120, same ? 'rgba(47,174,99,.1)' : 'rgba(229,50,45,.1)', same ? '#5fb47c' : '#e07b72', 10, 2);
      txt(g, `Frame ${k}   (${(k / 60).toFixed(1)} s)`, GX + 14, 352, '800 16px Montserrat');
      txt(g, `Client A checksum  ${fr.ca.toString(16).toUpperCase().padStart(8, '0')}`, GX + 14, 384, '700 15px Jost');
      txt(g, `Client B checksum  ${fr.cb.toString(16).toUpperCase().padStart(8, '0')}`, GX + 14, 410, '700 15px Jost', same ? C.ink : C.redDk);
      txt(g, `gap ${fr.gap < .001 && fr.gap > 0 ? fr.gap.toExponential(1) : fr.gap.toFixed(fr.gap < 1 ? 3 : 0)} units`, GX + GW - 14, 352, '700 14px Jost', C.muted, 'right');
      T.stamp(same ? 'In sync' : 'DESYNC', GX + GW / 2, 494, same ? C.good : C.redDk, 1, 26);
      txt(g, st.mode === 'float' ? 'Math: 32-bit floats' : 'Math: fixed-point', GX + GW - 4, 556, '800 15px Montserrat', C.ink, 'right');
      const key = st.mode + (same ? 1 : 0) + (fr.gap > 20 ? 1 : 0); if (key === st.key) return; st.key = key;
      say($(s, '.de-out'), st.mode === 'fixed'
        ? 'Fixed-point: whole numbers add exactly in any order. Both clients run the same game, frame after frame, with only inputs sent between them.'
        : same ? 'Both clients run identical code. The only difference is the order Client B adds up the pushes on each ball.'
          : fr.gap < 20 ? `At frame ${R.first} a single rounded bit differs. The checksums no longer match, though nobody can see it yet.`
            : 'Collisions amplify the stray bit until the two players are watching different games. Lockstep only works if every machine agrees on every bit.');
    }
    const gp0 = R => R.first >= 0;
    apis.desync = { seek(t) { st.held = st.tour = true; st.t = t; render(); }, dur: () => DUR };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > DUR) st.t = 0; if (!st.tour && st.t - st.t0 > RUN + 1) st.t0 = st.t; render(); };
  });

  /* ---------- 3: what goes over the wire ---------- */
  // bytes per unit per update for state replication; bytes per player per update for inputs
  const WIRE = { unit: 18, input: 6, players: 8, hz: 20, redundant: 3 };
  const PRESETS = { duel: ['A duel', 2], moba: ['A team fight', 120], rts: ['An RTS late game', 1600] };
  canvasDemo('wire', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, units: 2, key: '' };
    const tourBtn = $(s, '.wi-tour'), free = freeOf(st, tourBtn), uIn = $(s, '.wi-units');
    uIn.oninput = () => { free(); st.units = Math.round(Math.pow(10, +uIn.value)); };
    $$(s, '.wi-pre .btn').forEach(b => b.onclick = () => { free(); st.units = PRESETS[b.dataset.p][1]; uIn.value = Math.log10(st.units); });
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    const DUR = 18;
    function render() {
      const t = st.t;
      if (st.tour) { st.units = Math.round(Math.pow(10, lerp(Math.log10(2), Math.log10(1600), ease(clamp((t - 1) / 12))))); uIn.value = Math.log10(st.units); }
      const rep = st.units * WIRE.unit * WIRE.hz, inp = WIRE.players * WIRE.input * WIRE.hz * WIRE.redundant;
      $(s, '.wi-uv').textContent = st.units.toLocaleString('en-US');
      T.use(g); panel(g);
      txt(g, `${st.units.toLocaleString('en-US')} moving units, ${WIRE.players} players`, 24, 30, '800 19px Montserrat');
      const lanes = [['Replicate the state', 'positions, speeds and health of every unit, 20 times a second', rep, '#e07b72', 'cpu'], ['Send only inputs (deterministic)', 'each player’s button presses; every machine simulates the same game', inp, '#5fb47c', 'cpu']];
      lanes.forEach(([n, sub, bps, col], i) => {
        const y = 92 + i * 220;
        txt(g, n, 24, y, '800 17px Montserrat'); txt(g, sub, 24, y + 22, '600 14px Jost', C.muted);
        // two machines and a wire
        GI.draw(g, 'pc', 70, y + 104, 70, C.navy); GI.draw(g, 'pc', 970, y + 104, 70, C.navy);
        g.fillStyle = '#e8dcc0'; g.fillRect(112, y + 98, 816, 12);
        // packets: width grows with bytes per update (capped), they stream left to right
        const per = bps / WIRE.hz, pw = clamp(Math.sqrt(per) * 2.2, 10, 760), ph = clamp(8 + Math.sqrt(per) * .25, 10, 60);
        for (let p = 0; p < 4; p++) { const k = ((t * .45 + p / 4) % 1), x = lerp(112 - pw, 928, k); g.save(); g.beginPath(); g.rect(112, y + 40, 816, 130); g.clip(); box(g, x, y + 104 - ph / 2, pw, ph, col, null, 6); g.restore(); }
        txt(g, `${(bps / 1000).toLocaleString('en-US', { maximumFractionDigits: bps < 10000 ? 1 : 0 })} kB per second`, 520, y + 156, '800 20px Montserrat', i ? C.good : C.redDk, 'center');
        txt(g, `${Math.round(per).toLocaleString('en-US')} bytes per update`, 520, y + 180, '600 14px Jost', C.muted, 'center');
      });
      const ratio = rep / inp;
      T.stamp(ratio > 1.5 ? `${Math.round(ratio)}× less to send` : 'about even', W / 2, 548, ratio > 1.5 ? C.good : C.goldInk, 1, 22);
      const key = Math.round(Math.log10(st.units) * 8); if (key === st.key) return; st.key = key;
      say($(s, '.wi-out'), ratio < 1.5
        ? 'With a handful of units, replicating the state is cheap and simple. Most action games start here.'
        : `With ${st.units.toLocaleString('en-US')} units, sending state costs ${Math.round(ratio)}× more than sending inputs. That is why StarCraft and Warcraft III ran lockstep, and why rollback engines like Photon Quantum put deterministic maths at the core.`);
    }
    apis.wire = { seek(t) { st.held = st.tour = true; st.t = t; render(); }, dur: () => DUR };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > DUR) st.t = 0; render(); };
  });

  window.__seek = (t, w) => apis[w].seek(t);
  window.__dur = w => apis[w].dur();
})();
