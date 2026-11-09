/* Arm locomotion (genre breakdown: "How to Make a Game Like Gorilla Tag?").
   Side view. The body has no legs to walk with: it moves only by pushing its hands against surfaces. A hand that
   touches the ground sticks where it touched; while it is stuck, moving the controller moves the body the opposite way
   (sweep a hand back, the body goes forward; push it down, the body goes up). Let go and the body keeps its velocity,
   so a fast sweep becomes a leap. The two hands row in turn; the slider sets how fast. Units and values are illustrative. */
(function () {
  const C = TD.C, { clamp, lerp } = TD;
  const DT = 1 / 60, GRAV = 900, ARM = 105, R = 26, GROUND = 470, LEDGE = [760, 400];
  const floorAt = x => x >= LEDGE[0] ? LEDGE[1] : GROUND;
  function offset(t, h, w, A) { const ph = w * t + h * Math.PI; return [Math.cos(ph) * A * 70, 34 + Math.sin(ph) * A * 46]; }
  function sim(T, w, A) {
    let B = [140, GROUND - R - 30], V = [0, 0], anch = [null, null], best = 0, onLedge = false; const trail = [];
    for (let t = 0; t <= T; t += DT) {
      const prev = B.slice(); let stuck = 0, sum = [0, 0];
      for (let h = 0; h < 2; h++) {
        const o = offset(t, h, w, A), want = [B[0] + o[0], B[1] + o[1]], down = Math.sin(w * t + h * Math.PI) > -.2;
        if (anch[h] && !down) anch[h] = null;                                 // lifting the hand lets go
        if (!anch[h] && down && want[1] >= floorAt(want[0])) anch[h] = [want[0], floorAt(want[0])];
        if (anch[h]) { stuck++; sum[0] += anch[h][0] - o[0]; sum[1] += anch[h][1] - o[1]; }
      }
      if (stuck) { B = [sum[0] / stuck, sum[1] / stuck]; V = [(B[0] - prev[0]) / DT, (B[1] - prev[1]) / DT]; }
      else { V[1] += GRAV * DT; B = [B[0] + V[0] * DT, B[1] + V[1] * DT]; }
      const fl = floorAt(B[0]) - R - 4;
      if (B[1] > fl) { if (B[0] >= LEDGE[0] && prev[0] < LEDGE[0] && prev[1] > LEDGE[1] - R) { B[0] = LEDGE[0] - R; V[0] = 0; } else { B[1] = fl; V[1] = Math.min(0, V[1]); V[0] *= .9; } }
      if (B[0] > LEDGE[0] && B[1] <= LEDGE[1] - R - 3) onLedge = true;
      best = Math.max(best, floorAt(B[0]) - R - 4 - B[1]);
      if (Math.round(t / DT) % 4 === 0) trail.push(B.slice());
      if (B[0] > 1000) break;
    }
    return { B, V, anch, best, onLedge, trail };
  }
  GK.scene('arms', (s, g, ui) => {
    const wEl = s.querySelector('.gt-w'), wv = s.querySelector('.gt-wv'), aEl = s.querySelector('.gt-a'), av = s.querySelector('.gt-av');
    ui.watch(wEl, aEl);
    const ACTS = [{ to: 9, w: 3, a: .6 }, { to: 18, w: 6, a: 1 }];
    return {
      dur: 18,
      frame(t, tour) {
        let w = +wEl.value, A = +aEl.value;
        if (tour) { const [a] = GK.act(ACTS, t); w = a.w; A = a.a; wEl.value = w; aEl.value = A; }
        wv.textContent = (w / 6.283).toFixed(1) + ' strokes/s'; av.textContent = Math.round(A * 100) + '%';
        const lt = tour ? t % 9 : t % 10, r = sim(lt, w, A);
        GK.panel(g);
        g.fillStyle = '#cfe6c0'; g.beginPath(); g.roundRect(14, 14, 1012, 520, 10); g.fill();
        g.fillStyle = '#7a5b3a'; g.fillRect(14, GROUND, LEDGE[0] - 14, 534 - GROUND); g.fillRect(LEDGE[0], LEDGE[1], 1026 - LEDGE[0], 534 - LEDGE[1]);
        g.fillStyle = '#5c8a3e'; g.fillRect(14, GROUND, LEDGE[0] - 14, 8); g.fillRect(LEDGE[0], LEDGE[1], 1026 - LEDGE[0], 8);
        GK.text(g, 'a ledge you cannot step onto', LEDGE[0] + 10, LEDGE[1] + 32, '#fff', 13, 'left', 700);
        r.trail.forEach(([x, y], i) => { g.fillStyle = `rgba(46,163,220,${.15 + .5 * i / r.trail.length})`; g.beginPath(); g.arc(x, y, 3, 0, 6.283); g.fill(); });
        // arms and body
        const [bx, by] = r.B;
        for (let h = 0; h < 2; h++) {
          const o = offset(lt, h, w, A), hand = r.anch[h] || [bx + o[0], by + o[1]];
          g.strokeStyle = h ? '#3a2a1a' : '#5a4330'; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); g.moveTo(bx, by); g.lineTo(hand[0], hand[1]); g.stroke();
          g.fillStyle = r.anch[h] ? C.gold : '#5a4330'; g.beginPath(); g.arc(hand[0], hand[1], 9, 0, 6.283); g.fill();
          if (r.anch[h]) { g.strokeStyle = C.goldInk; g.lineWidth = 2; g.beginPath(); g.arc(hand[0], hand[1], 14, 0, 6.283); g.stroke(); }
        }
        g.fillStyle = '#4a3a2c'; g.beginPath(); g.arc(bx, by, R, 0, 6.283); g.fill();
        g.fillStyle = '#c9a98a'; g.beginPath(); g.ellipse(bx + 6, by - 2, 14, 11, 0, 0, 6.283); g.fill();
        g.fillStyle = '#222'; g.beginPath(); g.arc(bx + 2, by - 6, 2.5, 0, 6.283); g.arc(bx + 12, by - 6, 2.5, 0, 6.283); g.fill();
        // velocity arrow
        const sp = Math.hypot(r.V[0], r.V[1]);
        if (sp > 20) { const k = .18; g.strokeStyle = C.red; g.lineWidth = 3; g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + r.V[0] * k, by + r.V[1] * k); g.stroke(); }
        const stuck = r.anch.filter(Boolean).length;
        TD.label(stuck ? `${stuck} hand${stuck > 1 ? 's' : ''} on the ground: the body moves opposite the controller` : 'no hands down: flying on the speed you built', 520, 40, 'center', stuck ? C.goldInk : C.redDk, 13);
        GK.big(g, `${Math.round(sp)}`, 'speed now (px/s)', 24, 568 - 6);
        GK.big(g, `${Math.round(r.best)} px`, 'highest leap so far', 200, 568 - 6);
        GK.big(g, r.onLedge ? 'yes' : 'not yet', 'reached the ledge', 380, 568 - 6, r.onLedge ? C.good : C.muted);
        ui.stats(`<div class="${r.onLedge ? 'g' : ''}"><b>${Math.round(r.best)} px</b><span>highest leap (the ledge is 70 px up)</span></div><div class="${r.onLedge ? 'g' : 'r'}"><b>${r.onLedge ? 'up' : 'no'}</b><span>onto the ledge</span></div>`);
        ui.out(A < .8 || w < 5 ? 'Slow, short strokes crawl. The body only goes where the hands push it.' : 'Fast, long sweeps build speed, and letting go carries it into a leap: the whole skill is in the arms.');
      },
    };
  });
})();
