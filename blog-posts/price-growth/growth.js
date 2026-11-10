/* Set the Price Growth (replanned page for the idle-game post; Scripture: Incremental Games and Magnitude, Reward Pacing).
   A 45 second clicker with three buildings. The learner picks the cost growth per copy (1.07, 1.15, 1.30) and plays; the
   page plots their own purchases and clicks. Base prices and outputs are invented for a short run; 1.15 is Cookie
   Clicker's real growth. The walk-through runs a scripted player at three times speed. */
(function () {
  const C = TD.C, LEN = 45, GROW = [1.07, 1.15, 1.3];
  const B = [{ n: 'Helper', base: 10, out: 1, col: '#2ea3dc' }, { n: 'Oven', base: 60, out: 5, col: '#e0a92d' }, { n: 'Factory', base: 250, out: 25, col: '#8a4fd6' }];
  const runs = {};
  const fmt = v => v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1e4 ? Math.round(v / 1e3) + 'k' : String(Math.floor(v));
  const cost = (st, i) => Math.ceil(B[i].base * Math.pow(st.grow, st.own[i]));
  const fresh = (grow, live) => ({ live, grow, t: 0, rt: 0, bank: 0, total: 0, own: [0, 0, 0], buys: [], clicks: [], ready: live, done: false, pop: -9, rows: {}, seg: 0, acc: 0 });
  const rate = st => st.own.reduce((a, n, i) => a + n * B[i].out, 0);
  function tick(st, click, buy, dt) {
    st.rt += dt; const r = rate(st) * dt; st.bank += r; st.total += r;
    if (click) { st.bank++; st.total++; st.clicks.push(st.rt); st.pop = st.t; }
    if (buy != null && st.bank >= cost(st, buy)) { st.bank -= cost(st, buy); st.own[buy]++; st.buys.push({ t: st.rt, i: buy }); return true; }
  }
  function summary(st) {
    const ts = st.buys.map(b => b.t), gaps = ts.map((t, i) => t - (i ? ts[i - 1] : 0)), m = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
    const early = m(gaps.filter((_, i) => ts[i] <= LEN / 3)), late = m(gaps.filter((_, i) => ts[i] > LEN * 2 / 3));
    return { buys: st.buys.slice(), clicks: st.clicks.slice(), total: st.total, n: ts.length, longest: Math.max(0, ...gaps, LEN - (ts[ts.length - 1] || 0)), early, late, lastClick: st.clicks[st.clicks.length - 1] || 0, rate: rate(st) };
  }

  PLAY.game('growth', {
    dur: 50, keys: [' ', '1', '2', '3'],
    opts: s => ({ grow: +s.querySelector('.pg-g .on').dataset.v }),
    setup(s, api) { const seg = [...s.querySelectorAll('.pg-g .btn')]; seg.forEach(b => b.onclick = () => { seg.forEach(x => x.classList.toggle('on', x === b)); api.start(); }); },
    init(o, live) { return fresh(live ? o.grow : GROW[0], live); },
    step(st, inp, dt) {
      st.t += dt;
      if (st.ready) { if (inp.press[' '] || inp.click) st.ready = false; else return; }
      if (st.done) {
        if (!st.live && st.seg < 2 && st.t - st.at > 1) { const rows = st.rows, seg = st.seg + 1, t = st.t; Object.assign(st, fresh(GROW[seg], false), { rows, seg, t }); }
        else if (st.live && inp.click === 'again') Object.assign(st, fresh(st.grow, true), { ready: false });
        return;
      }
      if (st.live) {
        const buy = inp.press['1'] || inp.click === 'b0' ? 0 : inp.press['2'] || inp.click === 'b1' ? 1 : inp.press['3'] || inp.click === 'b2' ? 2 : null;
        if (tick(st, inp.press[' '] || inp.click === 'cookie', buy, dt)) PLAY.beep(700 + buy * 150, .07, .1);
      } else for (let k = 0; k < 3; k++) {
        // the scripted player: five clicks a second, and the affordable building that pays for itself soonest
        st.acc += dt; const click = st.acc >= .2; if (click) st.acc -= .2;
        let best = null, bp = 1e9; B.forEach((b, i) => { const c = cost(st, i); if (c <= st.bank && c / b.out < bp) { bp = c / b.out; best = i; } });
        const cheaper = B.some((b, i) => cost(st, i) / b.out < bp * .6 && cost(st, i) - st.bank < (rate(st) + 5) * 3);
        tick(st, click, cheaper ? null : best, dt);
        if (st.rt >= LEN) break;
      }
      if (st.rt >= LEN) { st.done = true; st.at = st.t; (st.live ? runs : st.rows)[st.grow] = summary(st); }
    },
    bot() { return null; },
    draw(g, st, ui, live) {
      GK.panel(g);
      const LX = 24, src = live ? runs : st.rows;
      GK.head(g, `Each copy costs ${Math.round((st.grow - 1) * 100)}% more · ${Math.max(0, LEN - st.rt).toFixed(0)} s left`, LX, 32, 'left', C.ink, 17);
      // the cookie
      const k = TD.clamp((st.t - st.pop) / .12), r = 62 - 6 * (1 - k), cx = LX + 90, cy = 150;
      g.fillStyle = '#c98b4a'; g.beginPath(); g.arc(cx, cy, r, 0, TD.TAU); g.fill(); g.strokeStyle = '#8a5a26'; g.lineWidth = 4; g.stroke();
      g.fillStyle = '#5c3a17'; [[-22, -18], [16, -26], [26, 8], [-8, 20], [-30, 10], [4, -4]].forEach(([dx, dy]) => { g.beginPath(); g.arc(cx + dx * r / 62, cy + dy * r / 62, 7, 0, TD.TAU); g.fill(); });
      ui.hit('cookie', cx - 66, cy - 66, 132, 132);
      GK.text(g, fmt(st.bank), LX + 190, 132, C.ink, 34, 'left', 800); GK.text(g, 'cookies in the bank', LX + 190, 154, C.muted, 12, 'left', 600);
      GK.text(g, `${fmt(rate(st))} per second · ${fmt(st.total)} baked in all`, LX + 190, 180, C.muted, 13, 'left', 600);
      B.forEach((b, i) => {
        const y = 240 + i * 66, c = cost(st, i), can = st.bank >= c && !st.done;
        GK.box(g, LX, y, 360, 56, can ? '#fffaf0' : '#f3ecdc', can ? b.col : '#cdbf9f', 10, can ? 3 : 1.5);
        g.fillStyle = b.col; g.beginPath(); g.arc(LX + 26, y + 28, 10, 0, TD.TAU); g.fill();
        GK.text(g, `${i + 1} · ${b.n}`, LX + 46, y + 24, C.ink, 15, 'left', 800); GK.text(g, `+${b.out} per second · you own ${st.own[i]}`, LX + 46, y + 43, C.muted, 12, 'left', 600);
        GK.text(g, fmt(c), LX + 346, y + 34, can ? C.ink : C.muted, 18, 'right', 800);
        PLAY.bar(g, LX + 250, y + 44, 96, 5, st.bank / c, b.col);
        ui.hit('b' + i, LX, y, 360, 56);
      });
      if (st.ready) TD.stamp('Space or click the cookie', LX + 180, 70, C.navy, 1, 18);
      if (st.done && live) ui.btn('again', 'Play this growth again', LX, 450, 230, 42, { px: 14 });
      // the timelines: one per growth
      const RX = 430, RW = 580, sx = t => RX + 60 + t / LEN * (RW - 70);
      GK.head(g, live ? 'Your purchases and clicks' : 'A scripted player\'s purchases and clicks', RX, 32, 'left', C.ink, 17);
      GROW.forEach((gr, i) => {
        const y = 70 + i * 150, cur = gr === st.grow, q = cur && !st.done ? summary(st) : src[gr];
        if (cur) { g.fillStyle = 'rgba(245,176,65,.14)'; g.beginPath(); g.roundRect(RX - 8, y - 14, RW + 16, 138, 10); g.fill(); }
        GK.text(g, `+${Math.round((gr - 1) * 100)}%`, RX, y + 14, C.ink, 16, 'left', 800);
        g.strokeStyle = '#cdbf9f'; g.lineWidth = 1; g.strokeRect(sx(0), y, sx(LEN) - sx(0), 40); g.strokeRect(sx(0), y + 48, sx(LEN) - sx(0), 30);
        GK.text(g, 'bought', sx(0) - 6, y + 34, C.muted, 10, 'right', 600); GK.text(g, 'clicks', sx(0) - 6, y + 68, C.muted, 10, 'right', 600);
        if (!q) { GK.text(g, 'not played yet', sx(LEN / 2), y + 26, C.muted, 12, 'center', 500); return; }
        q.buys.forEach(b => { g.fillStyle = B[b.i].col; g.fillRect(sx(b.t) - 1.5, y + 3 + b.i * 12, 3, 10); });
        for (let s = 0; s < LEN; s += 3) { const n = q.clicks.filter(c => c >= s && c < s + 3).length / 3; g.fillStyle = 'rgba(27,35,80,.6)'; const h = Math.min(28, n * 3.5); g.fillRect(sx(s) + 1, y + 77 - h, sx(3) - sx(0) - 2, h); }
        if (cur && !st.done) { g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.moveTo(sx(st.rt), y - 4); g.lineTo(sx(st.rt), y + 82); g.stroke(); }
        GK.text(g, `${q.n} bought · longest wait ${q.longest.toFixed(1)} s · wait between buys: first third ${q.early != null ? q.early.toFixed(1) + ' s' : 'none'}, last third ${q.late != null ? q.late.toFixed(1) + ' s' : 'none'}`, sx(0), y + 98, C.ink, 11, 'left', 600);
        GK.text(g, `ended at ${fmt(q.rate)} per second`, sx(LEN), y + 114, C.muted, 11, 'right', 600);
      });
      B.forEach((b, i) => { g.fillStyle = b.col; g.fillRect(RX + 60 + i * 90, 524, 10, 10); GK.text(g, b.n, RX + 76 + i * 90, 533, C.ink, 11, 'left', 600); });
      GK.text(g, '0 s', sx(0), 552, C.muted, 10, 'center', 600); GK.text(g, '45 s', sx(LEN), 552, C.muted, 10, 'center', 600);
      // side panel
      const cur = summary(st), have = GROW.filter(q => src[q]);
      ui.stats(`<div><b>${fmt(st.total)}</b><span>cookies baked</span></div><div class="g"><b>${cur.n}</b><span>purchases</span></div><div class="r"><b>${cur.longest.toFixed(1)} s</b><span>longest wait with nothing to buy</span></div>`);
      const who = live ? 'you' : 'the scripted player', f = q => src[q], d = q => f(q).late != null && f(q).early != null ? (f(q).late / f(q).early).toFixed(1) + '×' : 'no late purchases';
      ui.out(have.length < 3 ? (live ? (have.length ? `${have.length} of 3 played. The comparison needs all three growths.` : 'Play 45 seconds, then switch the growth and play again.') : 'The same scripted player at three growths, at three times speed. Watch how the purchase marks bunch up or thin out.')
        : `At +7% ${who} bought ${f(1.07).n} times and the wait between buys changed by ${d(1.07)} from the first third to the last; at +15%, ${f(1.15).n} buys and ${d(1.15)}; at +30%, ${f(1.3).n} buys and ${d(1.3)}, with a longest wait of ${f(1.3).longest.toFixed(1)} s. Low growth makes buying one decision repeated; high growth leaves stretches with nothing to choose. The multiplier trades how often a goal arrives against how long each goal stays a goal.`);
    },
  });
})();
