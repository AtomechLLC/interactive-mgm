/* Smart Steering (replanned page for the assist-levels post; Scripture: Raising the Floor and Lowering the Ceiling).
   One track, edges you can fall from, a dirt shortcut. The learner laps it with the assist on and off. The assist takes
   the wheel near any edge, which also steers away from the shortcut, as Mario Kart 8 Deluxe's Smart Steering does.
   Lap times and falls are the learner's own; the walk-through is a scripted driver. */
(function () {
  const C = TD.C, TAU = TD.TAU, clamp = TD.clamp;
  const AX = 20, AY = 44, AW = 1000, AH = 420, HW = 36, SP = 200, TURN = 3, DIRT = .7, PEN = 1.5;
  const V = [[100, 360], [900, 360], [900, 60], [660, 60], [660, 250], [400, 250], [400, 60], [100, 60]], R = 70;
  // the centre line: straight edges with rounded corners, sampled every few pixels
  const LINE = [];
  V.forEach((v, i) => {
    const a = V[(i + V.length - 1) % V.length], b = V[(i + 1) % V.length], u = d => { const l = Math.hypot(d[0], d[1]); return [d[0] / l, d[1] / l]; };
    const ua = u([a[0] - v[0], a[1] - v[1]]), ub = u([b[0] - v[0], b[1] - v[1]]), p0 = [v[0] + ua[0] * R, v[1] + ua[1] * R], p1 = [v[0] + ub[0] * R, v[1] + ub[1] * R];
    for (let k = 0; k <= 1.0001; k += .05) LINE.push([(1 - k) ** 2 * p0[0] + 2 * k * (1 - k) * v[0] + k * k * p1[0], (1 - k) ** 2 * p0[1] + 2 * k * (1 - k) * v[1] + k * k * p1[1]]);
    const nb = V[(i + 2) % V.length], unb = u([b[0] - nb[0], b[1] - nb[1]]), q = [b[0] - ub[0] * R, b[1] - ub[1] * R], len = Math.hypot(q[0] - p1[0], q[1] - p1[1]);
    for (let d = 8; d < len; d += 8) LINE.push([p1[0] + ub[0] * d, p1[1] + ub[1] * d]);
  });
  const N = LINE.length, START = LINE.findIndex(p => Math.abs(p[1] - 360) < 1 && p[0] > 300);
  const near = (x, y) => { let bi = 0, bd = 1e9; for (let i = 0; i < N; i++) { const d = (LINE[i][0] - x) ** 2 + (LINE[i][1] - y) ** 2; if (d < bd) { bd = d; bi = i; } } return [bi, Math.sqrt(bd)]; };
  const tang = i => { const a = LINE[i % N], b = LINE[(i + 3) % N]; return Math.atan2(b[1] - a[1], b[0] - a[0]); };
  const onDirt = (x, y) => x > 400 && x < 660 && y > 60 - HW && y < 60 + HW;
  const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
  const laps = { on: [], off: [] };
  function place(st, i) { st.k = { x: LINE[i][0], y: LINE[i][1], a: tang(i) }; st.idx = i; }

  PLAY.game('steer', {
    dur: 30, keys: ['a', 'd', 'ArrowLeft', 'ArrowRight', ' '],
    opts: s => ({ assist: s.querySelector('.ss-mode .on').dataset.v === 'on' }),
    setup(s, api) { const seg = [...s.querySelectorAll('.ss-mode .btn')]; seg.forEach(b => b.onclick = () => { seg.forEach(x => x.classList.toggle('on', x === b)); api.start(); }); },
    init(o, live) {
      const st = { live, assist: live ? o.assist : true, t: 0, ready: live, lap: 0, falls: 0, cut: false, hold: 0, rows: { on: [], off: [] }, took: false, trail: [], done: 0 };
      place(st, START); return st;
    },
    step(st, inp, dt) {
      if (st.ready) { if (Object.keys(inp.press).length || inp.click) st.ready = false; return; }
      st.t += dt;
      if (st.hold > 0) { st.hold -= dt; st.lap += dt; return; }
      st.lap += dt;
      const k = st.k, D = inp.down; let steer = (D.d || D.ArrowRight ? 1 : 0) - (D.a || D.ArrowLeft ? 1 : 0); if (inp.steer != null) steer = inp.steer;
      const [i, d] = near(k.x, k.y), dirt = onDirt(k.x, k.y);
      st.took = false;
      const ahead = near(k.x + Math.cos(k.a) * 46, k.y + Math.sin(k.a) * 46)[1];
      if (st.assist && (d > HW * .4 || ahead > HW * .75)) {
        // the assist: aim back at the road a little ahead, harder than the driver can steer
        const tgt = LINE[(i + 7) % N], want = Math.atan2(tgt[1] - k.y, tgt[0] - k.x), da = wrap(want - k.a);
        k.a += clamp(da, -6 * dt, 6 * dt); st.took = true;
      } else k.a += steer * TURN * dt;
      const sp = SP * (dirt && d > HW ? DIRT : 1);
      k.x += Math.cos(k.a) * sp * dt; k.y += Math.sin(k.a) * sp * dt;
      if (dirt && d > HW) st.cut = true;
      if (st.trail.length === 0 || Math.hypot(k.x - st.trail[st.trail.length - 1][0], k.y - st.trail[st.trail.length - 1][1]) > 10) { st.trail.push([k.x, k.y]); if (st.trail.length > 400) st.trail.shift(); }
      let [j, d2] = near(k.x, k.y);
      if (st.assist && d2 > HW - 6) { const c = LINE[j], f = (HW - 6) / d2; k.x = c[0] + (k.x - c[0]) * f; k.y = c[1] + (k.y - c[1]) * f; d2 = HW - 6; }   // and it never lets the kart cross an edge
      if (d2 > HW && !onDirt(k.x, k.y)) { st.falls++; st.fallAt = { x: k.x, y: k.y, t: st.t }; place(st, j); st.hold = PEN; if (st.live) PLAY.beep(150, .25, .2, 'sawtooth'); return; }
      const rel = n => (n - START + N) % N;
      if (rel(st.idx) > N * .85 && rel(j) < N * .15) {
        const row = { time: st.lap, falls: st.falls, cut: st.cut }; (st.live ? laps : st.rows)[st.assist ? 'on' : 'off'].push(row); st.last = row;
        st.lap = 0; st.falls = 0; st.cut = false; st.trail = []; st.done++; if (st.live) PLAY.beep(990, .15, .15);
        if (!st.live && st.done === 1) st.assist = false;
      }
      if (rel(j) > rel(st.idx) || rel(st.idx) > N * .85) st.idx = j;
    },
    // a scripted driver: steers at a point ahead on the centre line; with the assist off it aims across the dirt
    bot(st) {
      const k = st.k, [i] = near(k.x, k.y); let tgt = LINE[(i + 9) % N];
      if (!st.assist && k.y < 110 && k.x > 430 && k.x < 760) tgt = [380, 60];
      const da = wrap(Math.atan2(tgt[1] - k.y, tgt[0] - k.x) - k.a);
      return { down: {}, press: {}, steer: clamp(da * 4, -1, 1) };
    },
    draw(g, st, ui, live) {
      GK.panel(g);
      const X = x => AX + x, Y = y => AY + y, k = st.k, key = st.assist ? 'on' : 'off';
      GK.head(g, `Smart Steering ${st.assist ? 'on' : 'off'} · lap ${st.lap.toFixed(1)} s`, AX, 30, 'left', C.ink, 17);
      g.save(); g.beginPath(); g.roundRect(AX, AY, AW, AH, 12); g.clip(); g.fillStyle = '#7fb069'; g.fillRect(AX, AY, AW, AH);
      g.fillStyle = '#a9794a'; g.fillRect(X(400), Y(60 - HW), 260, HW * 2);
      g.lineJoin = 'round'; g.lineCap = 'round';
      const path = () => { g.beginPath(); LINE.forEach((p, i) => i ? g.lineTo(X(p[0]), Y(p[1])) : g.moveTo(X(p[0]), Y(p[1]))); g.closePath(); };
      g.strokeStyle = '#fff'; g.lineWidth = HW * 2 + 8; path(); g.stroke(); g.strokeStyle = '#4a4e5a'; g.lineWidth = HW * 2; path(); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 2; g.setLineDash([14, 14]); path(); g.stroke(); g.setLineDash([]);
      g.fillStyle = '#fff'; for (let q = 0; q < 6; q++) g.fillRect(X(LINE[START][0]) - 4, Y(360 - HW + q * 12), 8, 6);
      GK.text(g, 'dirt: shorter, slower', X(530), Y(60) + 4, 'rgba(255,255,255,.9)', 12, 'center', 800);
      if (st.trail.length > 1) { g.strokeStyle = st.assist ? 'rgba(245,176,65,.85)' : 'rgba(122,200,255,.9)'; g.lineWidth = 3; g.beginPath(); st.trail.forEach((p, i) => i ? g.lineTo(X(p[0]), Y(p[1])) : g.moveTo(X(p[0]), Y(p[1]))); g.stroke(); }
      if (st.fallAt && st.t - st.fallAt.t < 1.2) TD.label('off the edge: 1.5 s', X(k.x), Y(k.y) - 28, 'center', '#fff', 12, 'rgba(183,28,28,.95)');
      g.save(); g.translate(X(k.x), Y(k.y)); g.rotate(k.a); g.fillStyle = '#e5322d'; g.beginPath(); g.roundRect(-13, -9, 26, 18, 5); g.fill(); g.fillStyle = '#1b2350'; g.fillRect(-10, -12, 7, 4); g.fillRect(-10, 8, 7, 4); g.fillRect(5, -12, 7, 4); g.fillRect(5, 8, 7, 4); g.fillStyle = '#ffd9b0'; g.beginPath(); g.arc(-1, 0, 5, 0, TAU); g.fill(); g.restore();
      if (st.took) TD.label('assist steering', X(k.x), Y(k.y) - 26, 'center', C.ink, 11, 'rgba(245,176,65,.95)');
      g.restore();
      if (st.ready) TD.stamp('Press A or D to start', X(AW / 2), Y(160), C.navy, 1, 22);
      // the table
      const TY = AY + AH + 30, src = live ? laps : st.rows;
      ['assist', 'laps', 'best lap', 'last lap', 'falls (all laps)', 'laps through the dirt'].forEach((h, i) => GK.text(g, h, AX + [0, 190, 290, 410, 530, 700][i], TY, C.muted, 11, 'left', 700));
      ['on', 'off'].forEach((m, i) => {
        const y = TY + 30 + i * 34, L = src[m];
        if (m === key) { g.fillStyle = 'rgba(245,176,65,.16)'; g.beginPath(); g.roundRect(AX - 8, y - 22, AW + 8, 32, 8); g.fill(); }
        GK.text(g, 'Smart Steering ' + m, AX, y, C.ink, 14, 'left', 700);
        if (!L.length) { GK.text(g, 'no lap yet', AX + 190, y, C.muted, 12, 'left', 500); return; }
        const best = Math.min(...L.map(r => r.time));
        [String(L.length), best.toFixed(1) + ' s', L[L.length - 1].time.toFixed(1) + ' s', String(L.reduce((a, r) => a + r.falls, 0)), String(L.filter(r => r.cut).length)].forEach((v, c) => GK.text(g, v, AX + [190, 290, 410, 530, 700][c], y, C.ink, 14, 'left', 700));
      });
      // side panel
      const on = src.on, off = src.off, best = L => L.length ? Math.min(...L.map(r => r.time)) : null, fl = L => L.reduce((a, r) => a + r.falls, 0);
      ui.stats(`<div><b>${st.lap.toFixed(1)} s</b><span>this lap</span></div><div class="r"><b>${st.falls}</b><span>falls this lap</span></div><div class="g"><b>${best(src[key]) ? best(src[key]).toFixed(1) + ' s' : '–'}</b><span>best lap, assist ${key}</span></div>`);
      const who = live ? 'Your' : 'The scripted driver\'s';
      ui.out(!on.length && !off.length ? (live ? 'Lap it with the assist on, then turn it off and lap it again. Try the dirt.' : 'Lap one with the assist on: the kart cannot leave the road, including where the dirt begins.')
        : on.length && off.length ? `${who} best lap with the assist: ${best(on).toFixed(1)} s and ${fl(on)} falls. Without it: ${best(off).toFixed(1)} s and ${fl(off)} falls${off.some(r => r.cut) ? ', through the dirt' : ', and no lap through the dirt yet'}. ${best(off) < best(on) ? 'The assist raised the worst lap and capped the fastest one, because the rule that keeps you on the road is the same rule that keeps you off the shortcut.' : 'So far the assist is simply faster for you. Its cap only shows once you can hold the dirt line without falling; until then it is all floor and no ceiling.'}`
        : on.length ? `Assist on: ${best(on).toFixed(1)} s, ${fl(on)} falls. You could not fall, and you could not reach the dirt either. Now turn it off.`
        : `Assist off: ${best(off).toFixed(1)} s, ${fl(off)} falls. Now turn it on and see what it does at the dirt.`);
    },
  });
})();
