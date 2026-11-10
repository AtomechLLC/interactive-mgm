/* Place the Breather (replanned page for the casual-game post; Scripture: Pacing Variety, Flow Channel).
   Twelve short match-three levels, four easy; the learner orders them and plays. The page plots their own wasted moves
   and failed attempts per level and compares hard levels played right after an easy one with those after a hard one.
   Nothing is modelled. The walk-through's player is a script with a fixed error rate. */
(function () {
  const C = TD.C, W = 6, N = 12, COLS = ['#e5322d', '#2ea3dc', '#2fae63', '#e0a92d', '#8a4fd6'];
  const KIND = { E: { k: 3, goal: 3, moves: 7 }, H: { k: 5, goal: 4, moves: 6 } };
  const runs = b => { const out = []; for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) { const c = b[y * W + x]; [[1, 0], [0, 1]].forEach(([dx, dy]) => { if (x - dx >= 0 && y - dy >= 0 && b[(y - dy) * W + x - dx] === c && (dx ? x > 0 : y > 0)) return; let n = 1; while (x + dx * n < W && y + dy * n < W && b[(y + dy * n) * W + x + dx * n] === c) n++; if (n >= 3) out.push(Array.from({ length: n }, (_, i) => (y + dy * i) * W + x + dx * i)); }); } return out; };
  const swapOk = (b, i, j) => { const t = b.slice(); [t[i], t[j]] = [t[j], t[i]]; return runs(t).length > 0; };
  const moves = b => { const out = []; for (let i = 0; i < W * W; i++) { if (i % W < W - 1 && swapOk(b, i, i + 1)) out.push([i, i + 1]); if (i < W * (W - 1) && swapOk(b, i, i + W)) out.push([i, i + W]); } return out; };
  function board(R, k) { for (;;) { const b = Array.from({ length: W * W }, () => Math.floor(R() * k)); if (!runs(b).length && moves(b).length >= 3) return b; } }
  function resolve(st) {
    let got = 0, b = st.b;
    for (let guard = 0; guard < 8; guard++) {
      const rs = runs(b); if (!rs.length) break; got += rs.length; rs.flat().forEach(i => b[i] = -1);
      for (let x = 0; x < W; x++) { const col = []; for (let y = W - 1; y >= 0; y--) if (b[y * W + x] >= 0) col.push(b[y * W + x]); for (let y = W - 1, n = 0; y >= 0; y--, n++) b[y * W + x] = n < col.length ? col[n] : Math.floor(st.R() * KIND[st.seq[st.i]].k); }
    }
    if (!moves(b).length) st.b = board(st.R, KIND[st.seq[st.i]].k);
    return got;
  }
  const start = st => { const K = KIND[st.seq[st.i]]; st.b = board(st.R, K.k); st.left = K.moves; st.got = 0; st.sel = null; };
  const results = [];

  PLAY.game('breather', {
    dur: 60, clickStarts: true, keys: [' '],
    init(o, live) {
      const st = { live, R: live ? Math.random : GK.rng(8), t: 0, seq: 'HHEHHEHHEHHE'.split(''), i: 0, phase: live ? 'plan' : 'play', log: Array.from({ length: N }, () => ({ wasted: 0, fails: 0, done: false })), at: 0, flash: -9 };
      if (live) st.seq = 'HHHHHHHHEEEE'.split(''); start(st); return st;
    },
    step(st, inp, dt) {
      st.t += dt;
      if (st.phase === 'plan') {
        if (typeof inp.click === 'string' && inp.click[0] === 's') { const k = +inp.click.slice(1), e = st.seq.filter(c => c === 'E').length; if (st.seq[k] === 'E') st.seq[k] = 'H'; else if (e < 4) st.seq[k] = 'E'; }
        if ((inp.click === 'go' || inp.press[' ']) && st.seq.filter(c => c === 'E').length === 4) { st.phase = 'play'; start(st); }
        return;
      }
      if (st.phase === 'end') { if (st.live && inp.click === 'again') Object.assign(st, this.init({}, true)); return; }
      if (st.phase === 'between') { if (st.t - st.at > .9) { st.phase = st.i >= N ? 'end' : 'play'; if (st.phase === 'play') start(st); else st.i = N - 1; } return; }
      let pair = inp.pair || null;
      if (typeof inp.click === 'string' && inp.click[0] === 'c') { const k = +inp.click.slice(1); if (st.sel == null) st.sel = k; else { const a = st.sel, d = Math.abs(a - k); if ((d === 1 && Math.floor(a / W) === Math.floor(k / W)) || d === W) pair = [a, k]; st.sel = d === 0 || pair ? null : k; } }
      if (!pair) return;
      const L = st.log[st.i], K = KIND[st.seq[st.i]]; st.left--;
      if (swapOk(st.b, pair[0], pair[1])) { [st.b[pair[0]], st.b[pair[1]]] = [st.b[pair[1]], st.b[pair[0]]]; st.got += resolve(st); st.flash = st.t; if (st.live) PLAY.beep(820, .07, .12); }
      else { L.wasted++; st.bad = st.t; if (st.live) PLAY.beep(170, .1, .14, 'sawtooth'); }
      if (st.got >= K.goal) { L.done = true; st.i++; st.phase = 'between'; st.at = st.t; st.msg = 'Cleared'; }
      else if (st.left <= 0) { L.fails++; st.msg = L.fails >= 3 ? 'Out of tries: moving on' : 'Out of moves: again'; if (L.fails >= 3) st.i++; st.phase = 'between'; st.at = st.t; }
      if (st.live) { results.length = 0; results.push(...st.log.map((l, i) => ({ ...l, kind: st.seq[i] }))); }
    },
    // a script: one move every half second, a fixed one-in-six chance of a swap that makes no line. It does not tire.
    bot(st) {
      if (st.phase !== 'play') return null; if (st.nextAt == null || st.nextAt < st.t - 2) st.nextAt = st.t + .5; if (st.t < st.nextAt) return null; st.nextAt = st.t + .5;
      const m = moves(st.b); if (st.R() < 1 / 6) { for (let i = 0; i < W * W - 1; i++) if (i % W < W - 1 && !swapOk(st.b, i, i + 1)) return { down: {}, press: {}, pair: [i, i + 1] }; }
      return { down: {}, press: {}, pair: m[Math.floor(st.R() * m.length)] };
    },
    draw(g, st, ui, live) {
      GK.panel(g);
      const ci = Math.min(st.i, N - 1), LX = 24, plan = st.phase === 'plan', end = st.phase === 'end', K = KIND[st.seq[ci]], L = st.log[ci];
      GK.head(g, plan ? `Place the four easy levels (${st.seq.filter(c => c === 'E').length} of 4)` : end ? 'Your sequence, played' : `Level ${ci + 1} of ${N}: ${st.seq[ci] === 'E' ? 'easy' : 'hard'}`, LX, 32, 'left', C.ink, 17);
      // the strip of twelve
      st.seq.forEach((c, i) => {
        const x = LX + i * 82, done = st.log[i].done, cur = i === ci && !plan && !end;
        GK.box(g, x, 46, 74, 40, c === 'E' ? '#e7f6ec' : '#fde9e7', cur ? C.navy : c === 'E' ? C.good : C.red, 8, cur ? 4 : 1.5);
        GK.text(g, `${i + 1} · ${c === 'E' ? 'easy' : 'hard'}`, x + 37, 71, C.ink, 12, 'center', 700);
        if (done) GK.text(g, '✓', x + 64, 60, C.good, 12, 'center', 800); if (plan) ui.hit('s' + i, x, 46, 74, 40);
      });
      // the board
      const BX = LX, BY = 110, TS = 62;
      if (!plan) {
        GK.box(g, BX - 6, BY - 6, W * TS + 12, W * TS + 12, '#23263f', '#23263f', 12, 0);
        st.b.forEach((c, i) => { const x = BX + (i % W) * TS, y = BY + Math.floor(i / W) * TS; g.fillStyle = COLS[c]; g.beginPath(); g.roundRect(x + 4, y + 4, TS - 8, TS - 8, 12); g.fill(); g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.roundRect(x + 10, y + 9, TS - 20, 12, 6); g.fill(); if (st.sel === i) { g.strokeStyle = '#fff'; g.lineWidth = 4; g.beginPath(); g.roundRect(x + 3, y + 3, TS - 6, TS - 6, 12); g.stroke(); } if (!end && st.phase === 'play') ui.hit('c' + i, x, y, TS, TS); });
        if (st.phase === 'between') TD.stamp(st.msg, BX + W * TS / 2, BY + W * TS / 2, st.msg === 'Cleared' ? C.good : C.redDk, 1, 22);
        if (st.bad && st.t - st.bad < .6) TD.label('no line: wasted move', BX + W * TS / 2, BY + 20, 'center', '#fff', 13, 'rgba(183,28,28,.95)');
        GK.text(g, `lines ${Math.min(st.got, K.goal)} / ${K.goal}`, BX + W * TS + 24, BY + 30, C.ink, 18, 'left', 800); GK.text(g, `moves left ${Math.max(0, st.left)}`, BX + W * TS + 24, BY + 60, st.left <= 2 ? C.redDk : C.ink, 18, 'left', 800);
        GK.text(g, `tries on this level: ${L.fails + 1}`, BX + W * TS + 24, BY + 86, C.muted, 12, 'left', 600);
      } else {
        PLAY.note(g, 'Click a slot to switch it between easy and hard. Four must be easy. Spread them out, save them for the end, or get them over with: then live with it.', LX, 120, 420);
        if (st.seq.filter(c => c === 'E').length === 4) ui.btn('go', 'Play this sequence (Space)', LX, 190, 260, 48, { px: 14 });
      }
      // the chart
      const RX = 590, RY = 130, RW = 420, RH = 250, src = live ? results : st.log.map((l, i) => ({ ...l, kind: st.seq[i] }));
      GK.head(g, live ? 'Your wasted moves and failed tries' : 'A scripted player\'s wasted moves and failed tries', RX, 118, 'left', C.ink, 14);
      const top = Math.max(4, ...src.map(r => r.wasted + r.fails * 2));
      const ax = GK.axes(g, RX + 24, RY + 14, RW - 24, RH, { x0: .5, x1: 12.5, y0: 0, y1: top, xt: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], yt: [0, top / 2, top], xl: 'level, in your order' });
      src.forEach((r, i) => {
        const x = ax.sx(i + 1), bw = 20; if (r.kind === 'E') { g.fillStyle = 'rgba(47,174,99,.14)'; g.fillRect(x - 15, RY + 14, 30, RH); }
        g.fillStyle = C.gold; g.fillRect(x - bw / 2, ax.sy(r.wasted), bw, ax.sy(0) - ax.sy(r.wasted));
        g.fillStyle = C.redDk; g.fillRect(x - bw / 2, ax.sy(r.wasted + r.fails * 2), bw, ax.sy(r.wasted) - ax.sy(r.wasted + r.fails * 2));
      });
      GK.text(g, 'gold: wasted moves · red: failed tries (drawn double) · green band: an easy level', RX, RY + RH + 62, C.muted, 11, 'left', 600);
      if (end && live) ui.btn('again', 'Arrange again', LX + W * TS + 24, 400, 180, 40, { px: 13 });
      // side panel
      const hard = src.map((r, i) => ({ ...r, prev: i ? src[i - 1].kind : null })).filter(r => r.kind === 'H' && (r.done || r.fails)), cost = r => r.wasted + r.fails * 2, m = a => a.length ? a.reduce((x, r) => x + cost(r), 0) / a.length : null;
      const afterE = hard.filter(r => r.prev === 'E'), afterH = hard.filter(r => r.prev === 'H'), aE = m(afterE), aH = m(afterH);
      ui.stats(`<div class="r"><b>${src.reduce((a, r) => a + r.wasted, 0)}</b><span>wasted moves so far</span></div><div class="r"><b>${src.reduce((a, r) => a + r.fails, 0)}</b><span>failed tries</span></div><div><b>${aE != null && aH != null ? aE.toFixed(1) + ' vs ' + aH.toFixed(1) : '–'}</b><span>trouble on hard levels after an easy one vs after a hard one</span></div>`);
      const who = live ? 'Your' : 'The script\'s';
      ui.out(plan ? 'The easy levels cost playtime and teach nothing new. What they buy, if anything, is how you play the level after them.'
        : !end ? (live ? 'Click a tile, then a neighbour. A swap that makes no line still uses a move.' : 'This script makes the same share of mistakes on every level. It cannot show what rest does; only a person can.')
        : aE == null || aH == null ? `${who} order never put a hard level after both kinds, so there is nothing to compare. Try an order with both.`
        : `${who} hard levels straight after an easy one: ${aE.toFixed(1)} trouble each (${afterE.length} levels). After another hard one: ${aH.toFixed(1)} (${afterH.length} levels). ${!live ? 'For a script the gap is noise.' : Math.abs(aE - aH) < .5 ? 'No real gap in this run; twelve levels is a small sample, and that is worth knowing before you trust a pacing rule.' : aE < aH ? 'You played tighter after a rest.' : 'In this run you did no better after a rest.'} The breather still cost you four levels of playtime with nothing new in them, which is the price a level designer weighs it against.`);
    },
  });
})();
