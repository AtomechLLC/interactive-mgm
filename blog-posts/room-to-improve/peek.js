/* Room to Improve (replanned page for the counter-strafe post; Scripture: Physical Execution Skills, Raising the Floor and Lowering the Ceiling).
   Twenty peeks from cover under each of two accuracy rules. Strict: a shot lands only when nearly still (release slides for
   0.3 s, an opposite tap stops at once). Loose: every shot lands. The chart is the learner's own results. Timings are this
   page's, in the range of the real games'. The walk-through's player is scripted to improve and is labelled so. */
(function () {
  const C = TD.C, clamp = TD.clamp, N = 20, AX = 20, AY = 46, AW = 600, AH = 330, ENEMY = .45, VMAX = 230, STILL = 35;
  const data = { strict: [], loose: [] };
  const NAMES = { strict: 'Strict: stop to shoot', loose: 'Loose: always accurate' };
  const peek = () => ({ x: -46, v: 0, seen: null, shot: null, res: null, at: 0 });
  const fresh = (mode, live) => ({ live, mode, t: 0, p: peek(), log: [], ready: live, rows: { strict: [], loose: [] }, seg: 0 });

  PLAY.game('peek', {
    dur: 62, keys: ['a', 'd', ' ', 'ArrowLeft', 'ArrowRight'],
    opts: s => ({ mode: s.querySelector('.rt-mode .on').dataset.v }),
    setup(s, api) { const seg = [...s.querySelectorAll('.rt-mode .btn')]; seg.forEach(b => b.onclick = () => { seg.forEach(x => x.classList.toggle('on', x === b)); api.start(); }); },
    init(o, live) { return fresh(live ? o.mode : 'strict', live); },
    step(st, inp, dt) {
      if (st.ready) { if (Object.keys(inp.press).length || inp.click) st.ready = false; else return; }
      st.t += dt; const p = st.p, D = inp.down;
      if (st.log.length >= N) {
        if (!st.live && st.seg === 0 && st.t - p.at > 1.2) { const rows = st.rows; rows.strict = st.log; Object.assign(st, fresh('loose', false), { rows, seg: 1, t: st.t }); }
        else if (st.live && inp.press[' '] && st.t - p.at > 1) { data[st.mode] = []; Object.assign(st, fresh(st.mode, true), { ready: false }); }
        return;
      }
      if (p.res) { if (st.t - p.at > .75) st.p = peek(); return; }
      const dir = (D.d || D.ArrowRight ? 1 : 0) - (D.a || D.ArrowLeft ? 1 : 0);
      if (dir) { if (Math.sign(p.v) === -dir && Math.abs(p.v) > 1) p.v = 0; else p.v = clamp(p.v + dir * 2400 * dt, -VMAX, VMAX); }   // an opposite tap kills the slide
      else p.v -= Math.sign(p.v) * Math.min(Math.abs(p.v), VMAX / .3 * dt);
      p.x = clamp(p.x + p.v * dt, -60, 150);
      if (p.seen == null && p.x > 14) p.seen = st.t;
      if (p.seen != null && p.x < 0) { p.seen = null; }                // ducked back: he loses you
      const done = res => { p.res = res; p.at = st.t; st.log.push({ res, ttk: res === 'kill' ? st.t - p.first : null, moving: p.movingShot }); (st.live ? data[st.mode] : st.rows[st.mode]).length = 0; (st.live ? data[st.mode] : st.rows[st.mode]).push(...st.log); if (st.live) PLAY.beep(res === 'kill' ? 900 : 150, .12, .16, res === 'kill' ? 'sine' : 'sawtooth'); };
      if (p.seen != null && p.first == null) p.first = p.seen;
      if (inp.press[' '] && p.x > 14) {
        const ok = st.mode === 'loose' || Math.abs(p.v) < STILL; p.shot = { t: st.t, ok }; if (!ok) p.movingShot = true;
        if (st.live) PLAY.beep(ok ? 500 : 300, .05, .12, 'square');
        if (ok) return done('kill');
      }
      if (p.seen != null && st.t - p.seen >= ENEMY) done('dead');
    },
    // scripted to improve: early peeks fire while moving, the middle ones let go and slide, the late ones counter-strafe
    bot(st) {
      const p = st.p, i = st.log.length, P = (down, press) => ({ down, press: press || {} });
      if (st.log.length >= N || p.res) return P({});
      if (st.mode === 'loose') return p.x > 14 && st.t - p.seen > .26 ? P({ d: 1 }, { ' ': true }) : P({ d: 1 });
      const stage = i < 5 ? 0 : i < 12 ? 1 : 2, react = stage === 2 ? .2 : .26;
      if (p.seen == null) return P({ d: 1 });
      const dt = st.t - p.seen;
      if (stage === 0) return dt > react ? P({ d: 1 }, { ' ': true }) : P({ d: 1 });
      if (stage === 1) { const late = i % 3 === 0 ? .1 : 0; return dt < .12 + late ? P({ d: 1 }) : Math.abs(p.v) < STILL ? P({}, { ' ': true }) : P({}); }
      return dt < .12 ? P({ d: 1 }) : Math.abs(p.v) > 1 ? P({ a: 1 }) : dt > react ? P({}, { ' ': true }) : P({});
    },
    draw(g, st, ui, live) {
      GK.panel(g);
      const p = st.p, X = x => AX + 250 + x, PY = AY + 230, EX = AX + 250 + 40, EY = AY + 60, i = st.log.length;
      GK.head(g, `${NAMES[st.mode]} · peek ${Math.min(N, i + 1)} of ${N}`, AX, 30, 'left', C.ink, 17);
      g.save(); g.beginPath(); g.roundRect(AX, AY, AW, AH, 12); g.clip(); TD.floor(AX, AY, AW, AH);
      g.fillStyle = '#6b6f85'; g.fillRect(AX, PY - 80, 250, 40); g.fillStyle = '#4d5168'; g.fillRect(AX, PY - 86, 250, 8);
      // his line of sight, and your spread
      if (p.seen != null && !p.res) { const k = clamp((st.t - p.seen) / ENEMY); g.strokeStyle = `rgba(229,50,45,${.25 + .6 * k})`; g.lineWidth = 2 + 4 * k; g.beginPath(); g.moveTo(EX, EY); g.lineTo(X(p.x), PY); g.stroke(); }
      const spread = st.mode === 'loose' ? .02 : .02 + Math.abs(p.v) / VMAX * .4, aim = Math.atan2(EY - PY, EX - X(p.x));
      if (p.x > 0) { g.fillStyle = Math.abs(p.v) < STILL || st.mode === 'loose' ? 'rgba(47,174,99,.3)' : 'rgba(245,176,65,.3)'; g.beginPath(); g.moveTo(X(p.x), PY); g.arc(X(p.x), PY, 240, aim - spread, aim + spread); g.closePath(); g.fill(); }
      if (p.shot && st.t - p.shot.t < .15) { const a = aim + (p.shot.ok ? 0 : .22); g.strokeStyle = '#fff3b0'; g.lineWidth = 3; g.beginPath(); g.moveTo(X(p.x), PY); g.lineTo(X(p.x) + Math.cos(a) * 260, PY + Math.sin(a) * 260); g.stroke(); }
      TD.foe(EX, EY, 18, Math.PI / 2, p.res === 'kill' ? '#9aa0b5' : C.red); TD.player(X(p.x), PY, aim, 1, p.res === 'dead' ? .4 : 1);
      if (p.res) TD.label(p.res === 'kill' ? 'you got him' : p.movingShot ? 'shot while moving: missed, then he fired' : 'he fired first', AX + AW / 2 + 80, AY + 150, 'center', '#fff', 13, p.res === 'kill' ? 'rgba(47,174,99,.95)' : 'rgba(183,28,28,.95)');
      g.restore();
      GK.text(g, 'your speed', AX, AY + AH + 22, C.muted, 12, 'left', 700); PLAY.bar(g, AX + 80, AY + AH + 11, 200, 13, Math.abs(p.v) / VMAX, Math.abs(p.v) < STILL ? C.good : C.gold);
      GK.text(g, st.mode === 'strict' ? 'green = still enough to hit' : 'speed does not matter under this rule', AX + 292, AY + AH + 22, C.muted, 12, 'left', 600);
      if (st.ready) TD.stamp('Hold D to step out', AX + AW / 2, AY + 150, C.navy, 1, 22);
      if (i >= N && live) TD.stamp('Twenty peeks. Switch rule, or Space to redo', AX + AW / 2, AY + 150, C.navy, 1, 17);
      // the chart: both rules, peek by peek and in blocks of five
      const RX = 650, src = live ? data : st.rows;
      GK.head(g, live ? 'Your peeks' : 'A scripted player\'s peeks', RX, 30, 'left', C.ink, 17);
      const ax = GK.axes(g, RX + 30, 70, 330, 220, { x0: .5, x1: 4.5, y0: 0, y1: 1, xt: [1, 2, 3, 4], yt: [0, .25, .5, .75, 1], fmtX: v => `peeks ${v * 5 - 4}–${v * 5}`, fmtY: PLAY.pct });
      GK.text(g, 'duels won', RX + 30, 60, C.muted, 11, 'left', 700);
      [['strict', C.red], ['loose', C.blue]].forEach(([m, col], r) => {
        const L = src[m], pts = [];
        for (let b = 0; b < 4; b++) { const blk = L.slice(b * 5, b * 5 + 5); if (blk.length === 5) pts.push([ax.sx(b + 1), ax.sy(blk.filter(q => q.res === 'kill').length / 5)]); }
        if (pts.length > 1) GK.line(g, pts, col, 3); pts.forEach(([x, y]) => { g.fillStyle = col; g.beginPath(); g.arc(x, y, 6, 0, TD.TAU); g.fill(); });
        const y = 350 + r * 54; GK.text(g, NAMES[m], RX, y, col === C.red ? C.redDk : C.blue, 12, 'left', 800);
        for (let k = 0; k < N; k++) { const q = L[k]; g.fillStyle = !q ? '#e3d8bf' : q.res === 'kill' ? C.good : C.redDk; g.beginPath(); g.arc(RX + 8 + k * 17.6, y + 18, 6, 0, TD.TAU); g.fill(); }
      });
      GK.text(g, 'green won the duel · red lost it', RX, 470, C.muted, 11, 'left', 600);
      // side panel
      const kills = st.log.filter(q => q.res === 'kill').length, mv = st.log.filter(q => q.moving).length, S = src.strict, Lo = src.loose, rate = (L, a, b) => L.slice(a, b).filter(q => q.res === 'kill').length;
      ui.stats(`<div class="g"><b>${kills}/${i}</b><span>duels won under this rule</span></div><div class="r"><b>${mv}</b><span>shots fired while still moving</span></div><div><b>${i >= 5 ? rate(st.log, i - 5, i) + '/5' : '–'}</b><span>your last five</span></div>`);
      const who = live ? 'You' : 'The scripted player';
      ui.out(S.length < N || Lo.length < N ? (live ? (st.mode === 'strict' ? 'Step out, stop, fire. Letting go of D is too slow; find the faster way to stop.' : 'Step out and fire. There is nothing else to it.') : (st.seg ? 'The loose rule: nothing to learn, so nothing changes from the first peek to the last.' : 'The strict rule. This player is scripted to improve: firing on the move, then sliding to a stop, then counter-strafing. Your own curve is the one that counts.'))
        : `Strict: ${who.toLowerCase()} won ${rate(S, 0, 5)} of the first five and ${rate(S, 15, 20)} of the last five. Loose: ${rate(Lo, 0, 5)} and ${rate(Lo, 15, 20)}. ${rate(S, 15, 20) > rate(S, 0, 5) ? 'The strict rule started lower and climbed; the loose one had nowhere to go.' : 'No climb yet under the strict rule in twenty peeks: the skill is there to find, and the loose rule has none to find.'} The loose rule is kinder on day one and gives a hundredth hour that looks like the first.`);
    },
  });
})();
