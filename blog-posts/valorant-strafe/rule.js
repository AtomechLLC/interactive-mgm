/* Write the accuracy rule (genre breakdown: "How to Make a Game Like Valorant?"), a lesson-richness spike for slide 2.
   Slide 1 shows counter-strafing beating running. That is a consequence of a rule the designer writes, and this
   slide hands the learner the rule: below what share of run speed shots are fully accurate (the threshold), and how
   wide the spread gets at full run speed. Three peekers swing on a player holding the angle:
     novice and expert counter-strafers tap the opposite key to stop (0.1 s), but their release is off by a normal
     error (45 ms and 12 ms); what is left over is drift speed, and their shots are only accurate if it is under the
     threshold. A run-and-gunner fires on the move.
   Each shot hits with 50% / spread. The holder is pre-aimed and fires from 0.2 s, every 0.1 s, at 50%. Win chance is
   who lands the first hit (exact, over the timing error). All numbers are illustrative. */
(function () {
  const C = TD.C, { clamp, lerp } = TD;
  const STOP = .1, H0 = .2, SIG = { novice: .045, expert: .012 };
  function first(me, them) { const ev = [...me.map(e => [...e, 0]), ...them.map(e => [...e, 1])].sort((a, b) => a[0] - b[0]); let alive = 1, p = 0; for (const [, q, w] of ev) { if (w === 0) p += alive * q; alive *= 1 - q; } return p + alive * .5; }
  function model(thr, run) {
    const spread = v => v <= thr ? 1 : lerp(1, run, clamp((v - thr) / (1 - thr))), acc = v => clamp(.5 / spread(v));
    const holder = []; for (let t = H0; t < 2; t += .1) holder.push([t, .5]);
    const cs = sig => { let P = 0, W = 0; for (let z = -3; z <= 3.001; z += .1) { const w = Math.exp(-z * z / 2), v = Math.abs(z * sig) / STOP, sh = []; for (let t = STOP + .04; t < 2; t += .1) sh.push([t, acc(v)]); P += w * first(sh, holder); W += w; } return P / W; };
    const rg = []; for (let t = .06; t < 2; t += .1) rg.push([t, acc(1)]);
    return { spread, novice: cs(SIG.novice), expert: cs(SIG.expert), rg: first(rg, holder) };
  }

  GK.scene('rule', (s, g, ui) => {
    const tEl = s.querySelector('.ar-t'), tv = s.querySelector('.ar-tv'), rEl = s.querySelector('.ar-r'), rv = s.querySelector('.ar-rv');
    ui.watch(tEl, rEl);
    const ACTS = [
      { to: 7, t: 25, r: 6, say: 'A rule shaped like slide 1: stopping wins peeks, running loses them, and timing the stop well is worth 18 points.' },
      { to: 14, t: 25, r: 1.5, say: 'Make running nearly as accurate as standing. Run-and-gun now wins as often as a perfect stop: movement skill stops mattering.' },
      { to: 21, t: 5, r: 6, say: 'Make the threshold strict. Experts still win their peeks; new players lose them even when they do the right thing.' },
      { to: 28, t: 60, r: 6, say: 'A loose threshold: you must still stop, but a sloppy stop is good enough. The floor rises and the skill gap shrinks.' },
    ];
    return {
      dur: 28,
      frame(t, tour) {
        let say = '';
        if (tour) { const [a] = GK.act(ACTS, t); tEl.value = a.t; rEl.value = a.r; say = a.say; }
        const thr = +tEl.value / 100, run = +rEl.value; tv.textContent = Math.round(thr * 100) + '% of run speed'; rv.textContent = run.toFixed(1) + '× the standing spread';
        const m = model(thr, run);
        GK.panel(g);
        // the rule: spread against speed, with where each counter-strafer's leftover drift lands
        const ax = 70, ay = 50, aw = 400, ah = 250;
        GK.head(g, 'Your rule: spread against movement speed', 20, 28);
        const A = GK.axes(g, ax, ay, aw, ah, { x0: 0, x1: 1, y0: 0, y1: 10, xt: [0, .25, .5, .75, 1], yt: [1, 4, 7, 10], fmtX: v => Math.round(v * 100) + '%', fmtY: v => v + '×', xl: 'speed when the shot is fired (share of run speed)' });
        // drift-speed densities (half-normal) for the two counter-strafers
        [['novice', 'rgba(224,169,45,.35)'], ['expert', 'rgba(47,174,99,.35)']].forEach(([k, col]) => {
          const sv = SIG[k] / STOP, pts = [];
          for (let v = 0; v <= 1.001; v += .01) pts.push([A.sx(v), A.sy(3 * Math.exp(-v * v / (2 * sv * sv)))]);
          g.fillStyle = col; g.beginPath(); g.moveTo(A.sx(0), A.sy(0)); pts.forEach(([x, y]) => g.lineTo(x, y)); g.lineTo(A.sx(1), A.sy(0)); g.closePath(); g.fill();
        });
        g.fillStyle = 'rgba(47,174,99,.12)'; g.fillRect(A.sx(0), ay, A.sx(thr) - A.sx(0), ah);
        GK.line(g, Array.from({ length: 101 }, (_, i) => [A.sx(i / 100), A.sy(m.spread(i / 100))]), C.navy, 3);
        g.strokeStyle = C.good; g.lineWidth = 2; g.setLineDash([5, 4]); g.beginPath(); g.moveTo(A.sx(thr), ay); g.lineTo(A.sx(thr), ay + ah); g.stroke(); g.setLineDash([]);
        GK.text(g, 'fully accurate', A.sx(thr) + 4, ay + 14, C.good, 11, 'left', 800);
        GK.text(g, 'where novices stop', A.sx(.55), A.sy(1.9), C.goldInk, 11, 'center', 800);
        GK.text(g, 'where experts stop', A.sx(.13) + 4, A.sy(2.9), C.good, 11, 'left', 800);
        // who wins the peek
        const bx = 540, bw = 470;
        GK.head(g, 'Chance the peeker wins against a held angle', bx, 28);
        const rows = [['Expert counter-strafe', m.expert, C.p2], ['Novice counter-strafe', m.novice, C.gold], ['Run and gun', m.rg, C.red]];
        rows.forEach(([l, v, col], i) => {
          const y = 52 + i * 70; GK.text(g, l, bx, y + 14, C.ink, 14, 'left', 700);
          GK.box(g, bx, y + 22, bw, 26, '#f1e9d6', null, 6); g.fillStyle = col; g.beginPath(); g.roundRect(bx, y + 22, bw * v, 26, 6); g.fill();
          GK.text(g, Math.round(v * 100) + '%', bx + bw * v + 6, y + 41, C.ink, 14, 'left', 800);
        });
        g.strokeStyle = C.muted; g.setLineDash([4, 4]); g.lineWidth = 1.5; g.beginPath(); g.moveTo(bx + bw / 2, 66); g.lineTo(bx + bw / 2, 260); g.stroke(); g.setLineDash([]);
        GK.text(g, 'even duel', bx + bw / 2, 274, C.muted, 11, 'center', 700);
        const gap = Math.round((m.expert - m.novice) * 100), move = Math.round((m.expert - m.rg) * 100);
        const yb = 350;
        GK.big(g, `${gap} pts`, 'expert over novice: timing skill', 20, yb, gap >= 15 ? C.redDk : gap <= 6 ? C.goldInk : C.good);
        GK.big(g, `${move} pts`, 'stopping over running: movement skill', 300, yb, move <= 10 ? C.redDk : C.good);
        GK.big(g, `${Math.round(m.novice * 100)}%`, 'novice peeks won', 600, yb, m.novice < .45 ? C.redDk : C.ink);
        const verdict = move <= 10 ? 'Run-and-gun works: the rule no longer rewards stopping, so movement precision is not a skill in this game.' : gap >= 15 ? 'A steep skill curve: new players lose peeks they played right. Great for experts, punishing for everyone else.' : gap <= 6 ? 'A forgiving rule: everyone who stops gets the reward, so precision stops separating players.' : 'Stopping is rewarded and timing it well is worth a bit more: a skill the game can teach.';
        GK.wrap(g, say || verdict, 20, 430, 1000, 22, C.ink, 17, 700);
        GK.wrap(g, 'There is no right threshold, only a choice about which skill the game rewards and how far apart new and expert players sit.', 20, 520, 1000, 18, C.muted, 13);
        ui.stats(`<div><b>${gap} pts</b><span>timing skill gap</span></div><div class="${move <= 10 ? 'r' : 'g'}"><b>${move} pts</b><span>stopping beats running by</span></div>`);
        ui.out('The accuracy rule decides what skill a shooter rewards.');
      },
    };
  });
})();
