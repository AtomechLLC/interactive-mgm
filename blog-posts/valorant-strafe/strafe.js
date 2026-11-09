/* Counter-strafe (genre breakdown: "How to Make a Game Like Valorant?").
   Three players strafe right at full speed, act at 1.0 s and fire five shots, the first after the delay slider.
   Run: keep holding the key. Release: let go and let friction stop you. Counter-strafe: tap the opposite key, which
   brakes with friction plus the opposite acceleration, then let go at zero.
   Illustrative numbers shaped like Valorant: run speed 6.75 m/s, friction 20 m/s^2 (about 0.34 s to stop), opposite
   key adds 55 m/s^2, spread grows linearly with speed and is at its minimum under 25% of run speed. */
(function () {
  const C = TD.C, { clamp } = TD;
  const RUN = 6.75, FRIC = 20, PUSH = 55, ACT = 1.0, RATE = .11, SHOTS = 5, END = 2.4, HEAD = 22;
  const MODES = [['run', 'Keep running', C.red], ['release', 'Let go and wait', C.gold], ['counter', 'Counter-strafe', C.p2]];
  function speed(mode, t) {
    if (t < ACT || mode === 'run') return RUN;
    const dec = mode === 'counter' ? FRIC + PUSH : FRIC;
    return Math.max(0, RUN - dec * (t - ACT));
  }
  const spread = v => v / RUN < .25 ? 6 : 6 + (v / RUN - .25) / .75 * 105;   // px radius at the target
  function shots(mode, delay) {
    const r = GK.rng(mode.length * 31 + 3), out = [];
    for (let i = 0; i < SHOTS; i++) {
      const t = ACT + delay + i * RATE, v = speed(mode, t), sp = spread(v) + i * 1.5;   // a little recoil each shot
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * sp;
      out.push({ t, v, x: Math.cos(a) * d + (mode === 'run' ? v * 3 : 0), y: Math.sin(a) * d - i * 2 });
    }
    return out;
  }

  GK.scene('strafe', (s, g, ui) => {
    const dEl = s.querySelector('.vs-d'), dv = s.querySelector('.vs-dv'); ui.watch(dEl);
    const DUR = 12;
    return {
      dur: DUR,
      frame(t, tour) {
        let delay = +dEl.value / 1000, clock;
        if (tour) { const pass = t < 6 ? 0 : 1; delay = pass ? .3 : .06; dEl.value = delay * 1000; clock = Math.min(END, (t % 6) / 5 * END); }
        else clock = (t % 4) / 3.4 * END;
        clock = Math.min(END, clock); dv.textContent = Math.round(delay * 1000) + ' ms';
        GK.panel(g);
        // three targets
        let hitsBy = {};
        MODES.forEach(([m, name, col], i) => {
          const x = 20 + i * 340, y = 18, w = 320, h = 270, cx = x + w / 2, cy = y + 140;
          GK.box(g, x, y, w, h, '#2a2e55', null, 12);
          g.fillStyle = '#3d4270'; g.fillRect(x, y + 200, w, 70);
          // a standing figure: body and head
          g.fillStyle = '#8b8fa8'; g.beginPath(); g.roundRect(cx - 34, cy + 20, 68, 90, 18); g.fill();
          g.fillStyle = '#b9bdd3'; g.beginPath(); g.arc(cx, cy, HEAD, 0, Math.PI * 2); g.fill();
          const v = speed(m, clock), sp = spread(v);
          g.strokeStyle = col; g.lineWidth = 2; g.setLineDash([5, 4]); g.beginPath(); g.arc(cx, cy, sp, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
          g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx - 10, cy); g.lineTo(cx - 4, cy); g.moveTo(cx + 4, cy); g.lineTo(cx + 10, cy); g.moveTo(cx, cy - 10); g.lineTo(cx, cy - 4); g.moveTo(cx, cy + 4); g.lineTo(cx, cy + 10); g.stroke();
          const sh = shots(m, delay); let hits = 0;
          sh.forEach(p => {
            const hit = Math.hypot(p.x, p.y) <= HEAD; if (hit) hits++;
            if (p.t > clock) return;
            g.fillStyle = hit ? C.gold : C.red; g.strokeStyle = C.navy; g.lineWidth = 1.5;
            g.beginPath(); g.arc(cx + p.x, cy + p.y, 4.5, 0, Math.PI * 2); g.fill(); g.stroke();
          });
          hitsBy[m] = hits;
          GK.head(g, name, x + 14, y + 26, 'left', '#fff', 16);
          GK.text(g, `${v.toFixed(1)} m/s`, x + w - 14, y + 26, col, 15, 'right', 700);
          const fired = sh.filter(p => p.t <= clock).length;
          GK.text(g, fired ? `${sh.slice(0, fired).filter(p => Math.hypot(p.x, p.y) <= HEAD).length} of ${fired} on the head` : 'no shots yet', x + 14, y + h - 14, '#d6dbef', 14, 'left', 600);
        });
        // speed over time
        const ax = 70, ay = 330, aw = 900, ah = 190;
        GK.head(g, 'Speed when each shot leaves the barrel', ax, ay - 14);
        const { sx, sy } = GK.axes(g, ax, ay, aw, ah, { x0: 0, x1: END, y0: 0, y1: RUN, xt: [0, .5, 1, 1.5, 2], yt: [0, RUN * .25, RUN], fmtX: v => v + ' s', fmtY: v => v.toFixed(1) });
        g.fillStyle = 'rgba(47,174,99,.12)'; g.fillRect(ax, sy(RUN * .25), aw, ah - (sy(RUN * .25) - ay));
        GK.text(g, 'accurate zone', ax + aw - 8, sy(RUN * .25) + 16, C.good, 12, 'right', 700);
        g.strokeStyle = C.navy; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(sx(ACT), ay); g.lineTo(sx(ACT), ay + ah); g.stroke(); g.setLineDash([]);
        GK.text(g, 'let go / tap opposite key', sx(ACT) + 6, ay + 14, C.navy, 12, 'left', 600);
        MODES.forEach(([m, , col], i) => {
          const pts = []; for (let k = 0; k <= 120; k++) { const tt = k / 120 * clock; pts.push([sx(tt), sy(speed(m, tt)) + i * 1.5]); }
          GK.line(g, pts, col, 3.5);
          shots(m, delay).forEach(p => { if (p.t > clock) return; g.fillStyle = col; g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(sx(p.t), sy(p.v) + i * 1.5, 6, 0, Math.PI * 2); g.fill(); g.stroke(); });
        });
        const rel = speed('release', ACT + delay), ctr = speed('counter', ACT + delay);
        ui.stats(`<div class="r"><b>${hitsBy.run}/5</b><span>keep running</span></div><div class="y"><b>${hitsBy.release}/5</b><span>let go and wait (${rel.toFixed(1)} m/s at first shot)</span></div><div class="g"><b>${hitsBy.counter}/5</b><span>counter-strafe (${ctr.toFixed(1)} m/s at first shot)</span></div>`);
        ui.out(delay < .25 ? 'Shooting fast after the stop: only the counter-strafe has bled off its speed. Friction alone takes about a third of a second.'
          : 'Waiting long enough lets friction finish the stop too, but a third of a second is a long time in a duel. The runner is never accurate.');
      },
    };
  });
})();
