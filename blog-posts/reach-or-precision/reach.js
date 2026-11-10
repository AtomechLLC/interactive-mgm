/* Reach or Precision (replanned page for the arm-locomotion post; Scripture: Physical Execution Skills, Character Metrics).
   The learner drags to move a character along ten pads at a gain they pick. Time, strokes and missed landings are their
   own. The walk-through's hand is scripted: it stops within 8 canvas pixels of its aim (stated in the side panel). */
(function () {
  const C = TD.C, clamp = TD.clamp, AX = 20, AY = 46, AW = 1000, AH = 250, GY = AY + 170;
  // ten pads: [gap from the previous pad's centre, width]
  const PADS = [[300, 90], [380, 60], [260, 36], [520, 80], [340, 28], [460, 50], [300, 24], [620, 70], [360, 32], [440, 44]];
  const POS = []; PADS.reduce((x, [gap, w]) => { POS.push([x + gap, w]); return x + gap; }, 0);
  const GAINS = [0.5, 1.5, 4], runs = {};
  const fresh = (gain, live) => ({ live, gain, t: 0, x: 0, i: 0, strokes: 0, misses: 0, time: 0, going: false, was: false, last: null, hand: 0, done: false, fx: [], R: GK.rng(3), rows: {}, seg: 0 });
  function finish(st) { const r = { time: st.time, strokes: st.strokes, misses: st.misses }; (st.live ? runs : st.rows)[st.gain] = r; st.done = true; st.at = st.t; }

  PLAY.game('reach', {
    dur: 54, clickStarts: true, keys: [' '],
    opts: s => ({ gain: +s.querySelector('.rp-gain .on').dataset.v }),
    setup(s, api) { const seg = [...s.querySelectorAll('.rp-gain .btn')]; seg.forEach(b => b.onclick = () => { seg.forEach(x => x.classList.toggle('on', x === b)); api.start(); }); },
    init(o, live) { return fresh(live ? o.gain : GAINS[0], live); },
    step(st, inp, dt) {
      st.t += dt;
      if (st.done) {
        if (!st.live && st.seg < 2 && st.t - st.at > 1.2) { const rows = st.rows, seg = st.seg + 1, t = st.t; Object.assign(st, fresh(GAINS[seg], false), { rows, seg, t }); }
        else if (st.live && inp.press[' ']) Object.assign(st, fresh(st.gain, true));
        return;
      }
      if (st.going) st.time += dt;
      const drag = !!inp.drag, m = inp.mouse || st.last;
      if (drag && !st.was) { st.strokes++; st.going = true; st.hand = 0; st.last = m; }
      if (drag && st.last) { const dx = m[0] - st.last[0]; st.x += dx * st.gain; st.hand += Math.abs(dx); st.last = m; }
      if (!drag && st.was) {
        const [px, w] = POS[st.i];
        if (Math.abs(st.x - px) <= w / 2) { st.fx.push({ t: st.t, ok: true, x: st.x }); st.i++; if (st.live) PLAY.beep(880, .08, .12); if (st.i >= POS.length) finish(st); }
        else if (Math.abs(st.x - px) <= w / 2 + 40) { st.misses++; st.fx.push({ t: st.t, ok: false, x: st.x }); if (st.live) PLAY.beep(170, .12, .15, 'sawtooth'); }   // open ground is only a new grip
      }
      st.was = drag;
    },
    // a scripted hand: it aims at the pad's centre, moves at 700 px a second and stops within 8 px of its aim
    bot(st) {
      if (st.done) return null;
      const b = st.b || (st.b = { mx: 500, phase: 'rest', wait: .25 });
      if (b.phase === 'rest') { b.wait -= PLAY.DT; if (b.wait <= 0) { const need = (POS[st.i][0] - st.x) / st.gain, room = need > 0 ? 960 - 60 : 60 - 960; const move = (Math.abs(need) > 880 ? need / 2 : need) + (st.R() - .5) * 16; b.mx = need > 0 ? 60 : 960; b.to = b.mx + move; b.phase = 'grip'; } return { down: {}, press: {}, mouse: [b.mx, 200], drag: false }; }
      if (b.phase === 'grip') { b.phase = 'pull'; return { down: {}, press: {}, mouse: [b.mx, 200], drag: true }; }
      const step = 700 * PLAY.DT, d = b.to - b.mx;
      if (Math.abs(d) <= step) { b.mx = b.to; b.phase = 'rest'; b.wait = .22; return { down: {}, press: {}, mouse: [b.mx, 200], drag: true }; }
      b.mx += Math.sign(d) * step; return { down: {}, press: {}, mouse: [b.mx, 200], drag: true };
    },
    draw(g, st, ui, live) {
      GK.panel(g);
      const cam = st.x - 420, X = x => AX + x - cam;
      GK.head(g, `Gain ${st.gain}× · pad ${Math.min(POS.length, st.i + 1)} of ${POS.length}`, AX, 30, 'left', C.ink, 17);
      g.save(); g.beginPath(); g.roundRect(AX, AY, AW, AH, 12); g.clip(); g.fillStyle = '#dfeaf7'; g.fillRect(AX, AY, AW, AH);
      g.fillStyle = '#c9d6e8'; for (let x = Math.floor(cam / 100) * 100; x < cam + AW + 100; x += 100) g.fillRect(X(x), AY, 1, AH);
      g.fillStyle = '#b7c3d6'; g.fillRect(AX, GY + 14, AW, 4);
      POS.forEach(([px, w], i) => {
        const done = i < st.i, cur = i === st.i;
        g.fillStyle = done ? C.good : cur ? C.gold : '#8ea2e6'; g.beginPath(); g.roundRect(X(px - w / 2), GY, w, 18, 5); g.fill();
        GK.text(g, String(i + 1), X(px), GY + 42, cur ? C.ink : C.muted, 12, 'center', 700);
        if (cur) GK.text(g, `${w} px wide`, X(px), GY - 60, C.muted, 11, 'center', 600);
      });
      st.fx.forEach(f => { const a = 1 - (st.t - f.t) / .8; if (a > 0) TD.label(f.ok ? 'landed' : 'missed', X(f.x), GY - 44 - 14 * (1 - a), 'center', '#fff', 12, f.ok ? 'rgba(47,174,99,.95)' : 'rgba(183,28,28,.95)'); });
      TD.player(X(st.x), GY - 14, 0, .9, 1);
      if (st.was) { g.strokeStyle = C.navy; g.lineWidth = 3; g.beginPath(); g.moveTo(X(st.x), GY - 30); g.lineTo(X(st.x), GY - 80); g.stroke(); GK.text(g, `hand moved ${Math.round(st.hand)} px → character ${Math.round(st.hand * st.gain)} px`, X(st.x), GY - 90, C.navy, 12, 'center', 700); }
      if (!live && st.b) { g.fillStyle = 'rgba(27,35,80,.7)'; g.beginPath(); g.arc(AX + st.b.mx, AY + 30, st.was ? 9 : 6, 0, TD.TAU); g.fill(); GK.text(g, 'scripted hand', AX + st.b.mx, AY + 54, C.muted, 10, 'center', 600); }
      g.restore();
      if (live && !st.going && !st.done) TD.stamp('Hold the mouse button and drag right', AX + AW / 2, AY + 50, C.navy, 1, 20);
      if (st.done && live) TD.stamp('Course done. Pick another gain, or Space to rerun', AX + AW / 2, AY + 50, C.navy, 1, 18);
      // the table
      const TY = AY + AH + 34, src = live ? runs : st.rows, col = [AX, AX + 150, AX + 300, AX + 450, AX + 640];
      ['gain', 'time', 'strokes', 'missed landings', 'hand travel for the narrowest pad (24 px)'].forEach((h, i) => GK.text(g, h, col[i], TY, C.muted, 11, 'left', 700));
      GAINS.forEach((gn, i) => {
        const y = TY + 34 + i * 40, r = gn === st.gain && !st.done ? { time: st.time, strokes: st.strokes, misses: st.misses, live: true } : src[gn];
        if (gn === st.gain) { g.fillStyle = 'rgba(245,176,65,.16)'; g.beginPath(); g.roundRect(AX - 8, y - 23, AW + 8, 36, 8); g.fill(); }
        GK.text(g, gn + '×', col[0], y, C.ink, 15, 'left', 800);
        GK.text(g, `${(24 / gn).toFixed(0)} px of hand to stay on it`, col[4], y, C.ink, 13, 'left', 600);
        if (!r) { GK.text(g, 'not run yet', col[1], y, C.muted, 12, 'left', 500); return; }
        GK.text(g, r.time.toFixed(1) + ' s', col[1], y, C.ink, 15, 'left', 700); GK.text(g, String(r.strokes), col[2], y, C.ink, 15, 'left', 700); GK.text(g, String(r.misses), col[3], y, r.misses ? C.redDk : C.ink, 15, 'left', 700);
      });
      // side panel
      ui.stats(`<div><b>${st.time.toFixed(1)} s</b><span>this run</span></div><div><b>${st.strokes}</b><span>strokes</span></div><div class="r"><b>${st.misses}</b><span>missed landings</span></div>`);
      const have = GAINS.filter(q => src[q]), lo = src[0.5], hi = src[4], who = live ? 'you' : 'the scripted hand';
      ui.out(have.length < 3 ? (live ? (have.length ? `${have.length} of 3 gains run. Run the others to compare.` : 'Cross the ten pads, then run the same course at the other two gains.') : 'The same hand at three gains. Watch the strokes at 0.5× and the misses at 4×.')
        : `At 0.5× ${who} took ${lo.strokes} strokes and missed ${lo.misses}; at 4× ${hi.strokes} strokes and missed ${hi.misses}. The hand did not get clumsier: at 4× the narrowest pad is 6 pixels of hand wide. Fastest here was ${have.slice().sort((a, b) => src[a].time - src[b].time)[0]}×, on a course that mixes long gaps with small pads. A game about covering distance would ship a higher gain than a game about landing.`);
    },
  });
})();
