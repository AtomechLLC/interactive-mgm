/* Measure against the player (The Level Design Book: Metrics, Blockout).
   Everything is in player units, so it is engine-free. The book's starting points:
   hallway width at least 2 player widths (two players can pass), stairs at 30 to 35 degrees,
   blockout walls at 150 to 200% of the player's height (they read as walls and block the view).
   Left: a top-down hallway where two players walk toward each other; under 2 widths one has to back out.
   Right: the stair slope in side view, and a wall next to the player with their eye line. */
(function () {
  const { $, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;
  const W = 1040, H = 585, PW = 40, PH = 84;          // one player width (top-down) and one player height (side view), in px

  function capsule(g, x, yFoot, h, col = C.player, a = 1) {   // side-view player: a rounded body with a head
    g.save(); g.globalAlpha *= a;
    g.fillStyle = col; g.strokeStyle = C.navy; g.lineWidth = 2.5;
    g.beginPath(); g.roundRect(x - 15, yFoot - h * .78, 30, h * .78, 12); g.fill(); g.stroke();
    g.beginPath(); g.arc(x, yFoot - h * .87, h * .12, 0, TAU); g.fill(); g.stroke();
    g.restore();
  }
  const TAU = Math.PI * 2;
  const panel = (g, x, y, w, h, title) => {
    g.fillStyle = 'rgba(255,252,244,.9)'; g.strokeStyle = '#cdbf9f'; g.lineWidth = 2; g.beginPath(); g.roundRect(x, y, w, h, 12); g.fill(); g.stroke();
    g.font = '800 15px Montserrat, Jost, sans-serif'; g.fillStyle = C.ink; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillText(title, x + 16, y + 26);
  };

  function verdicts(w, s, h) {
    return [
      w < 2 ? ['y', `${w.toFixed(2)}×`, 'player widths: single file, two players cannot pass'] : w <= 3.5 ? ['g', `${w.toFixed(2)}×`, 'player widths: two players pass (book: at least 2×)'] : ['y', `${w.toFixed(2)}×`, 'player widths: wider than a hall needs, it starts to read as a room'],
      s < 25 ? ['y', `${s}°`, 'stairs: shallow, a long run that reads close to a ramp'] : s < 30 ? ['y', `${s}°`, 'stairs: a little shallow'] : s <= 35 ? ['g', `${s}°`, 'stairs: in the book’s 30 to 35° range'] : s <= 42 ? ['y', `${s}°`, 'stairs: steep'] : ['r', `${s}°`, 'stairs: very steep, reads as a ladder or a wall'],
      h < .95 ? ['r', `${Math.round(h * 100)}%`, 'of player height: you see over it, so it reads as a ledge or cover'] : h < 1.5 ? ['y', `${Math.round(h * 100)}%`, 'of player height: blocks the view, feels cramped'] : h <= 2 ? ['g', `${Math.round(h * 100)}%`, 'of player height: in the book’s 150 to 200% blockout range'] : ['y', `${Math.round(h * 100)}%`, 'of player height: tall, reads as large architecture'],
    ];
  }

  canvasDemo('metrics', (s, cv, g) => {
    let w = 1.5, sl = 45, wh = 1, t = 0;
    const ui = () => {
      w = +$(s, '.me-w').value; sl = +$(s, '.me-s').value; wh = +$(s, '.me-h').value;
      $(s, '.me-wv').textContent = `${w.toFixed(2)} player widths`; $(s, '.me-sv').textContent = `${sl}°`; $(s, '.me-hv').textContent = `${Math.round(wh * 100)}% of player height`;
      const v = verdicts(w, sl, wh);
      say($(s, '.me-stats'), v.map(([c, n, l]) => `<div class="${c}"><b>${n}</b><span>${l}</span></div>`).join(''));
      const inRange = v.filter(x => x[0] === 'g').length;
      say($(s, '.me-out'), inRange === 3 ? '<b class="accent">All three sit on the book’s starting points.</b> Now build a test map at these sizes and walk it: the numbers are where you start, not where you stop.' : 'Drag each slider until its card turns green. Each number is measured against the player, never against the engine’s units.');
    };
    ['.me-w', '.me-s', '.me-h'].forEach(k => $(s, k).oninput = ui); ui();
    window.__metricsSet = (a, b, c, tt = 0) => { $(s, '.me-w').value = a; $(s, '.me-s').value = b; $(s, '.me-h').value = c; ui(); t = tt; };

    return dt => {
      t += dt; T.use(g); g.clearRect(0, 0, W, H);
      /* ---------- hallway, top down ---------- */
      panel(g, 0, 0, 500, H, 'Hallway, from above');
      const hw = w * PW, cy = 310, x0 = 40, x1 = 460;
      T.wall(x0, cy - hw / 2 - 24, x1 - x0, 24); T.wall(x0, cy + hw / 2, x1 - x0, 24);
      T.floor(x0, cy - hw / 2, x1 - x0, hw);
      // width ruler
      g.strokeStyle = C.goldInk; g.lineWidth = 2; g.beginPath(); g.moveTo(x1 - 20, cy - hw / 2); g.lineTo(x1 - 20, cy + hw / 2); g.stroke();
      T.label(`${w.toFixed(2)}×`, x1 - 20, cy, 'center', C.goldInk, 14);
      const sc = PW / 44, P = 6.5, k = t % P, L = x0 + 30, R = x1 - 50;
      let p1, p2, y1 = cy, y2 = cy, msg = null;
      if (w >= 2) {
        const off = Math.min(PW / 2 + 2, hw / 2 - PW / 2), side = ease(clamp(k / 1.2)) - ease(clamp((k - 4.2) / 1.2));
        p1 = lerp(L, R, clamp(k / 5.4)); p2 = lerp(R, L, clamp(k / 5.4)); y1 = cy - off * side; y2 = cy + off * side;
      } else {
        const meet = (L + R) / 2;
        if (k < 2) { p1 = lerp(L, meet - PW * .55, ease(k / 2)); p2 = lerp(R, meet + PW * .55, ease(k / 2)); }
        else if (k < 2.8) { p1 = meet - PW * .55; p2 = meet + PW * .55; msg = 'blocked'; }
        else { const b = ease(clamp((k - 2.8) / 2.4)); p2 = lerp(meet + PW * .55, R + 30, b); p1 = lerp(meet - PW * .55, R - PW * .8, b); msg = 'one has to back out'; }
      }
      T.player(p1, y1, 0, sc, 1, C.player); T.player(p2, y2, Math.PI, sc, 1, C.p2);
      if (msg) T.popText(msg, (L + R) / 2, cy - hw / 2 - 50, C.redDk, 1);
      else if (w >= 2) T.popText('they pass', (L + R) / 2, cy - hw / 2 - 50, C.good, 1);
      g.font = '500 14px Jost, sans-serif'; g.fillStyle = C.muted; g.textAlign = 'left'; g.fillText('each disc is one player width', 24, H - 22);

      /* ---------- stairs, side view ---------- */
      panel(g, 520, 0, 520, 288, 'Stairs, from the side');
      const gy = 262, rad = sl * Math.PI / 180, rise = 15, steps = Math.max(3, Math.floor(Math.min(190 / rise, 400 * Math.tan(rad) / rise))), tread = rise / Math.tan(rad);
      const sx = 600;
      g.fillStyle = C.stone; g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.moveTo(sx, gy);
      for (let i = 0; i < steps; i++) { g.lineTo(sx + i * tread, gy - (i + 1) * rise); g.lineTo(sx + (i + 1) * tread, gy - (i + 1) * rise); }
      g.lineTo(sx + steps * tread, gy); g.closePath(); g.fill(); g.stroke();
      g.strokeStyle = '#cdbf9f'; g.beginPath(); g.moveTo(530, gy); g.lineTo(1030, gy); g.stroke();
      // slope line and angle arc
      g.setLineDash([6, 6]); g.strokeStyle = C.goldInk; g.beginPath(); g.moveTo(sx, gy); g.lineTo(sx + steps * tread, gy - steps * rise); g.stroke(); g.setLineDash([]);
      g.beginPath(); g.arc(sx, gy, 46, -rad, 0); g.stroke(); T.label(`${sl}°`, sx + 70, gy - 16, 'center', C.goldInk, 14);
      // walker climbing
      const ci = (t % 5) / 5 * (steps + 1) - 1;
      if (ci < 0) capsule(g, sx + ci * 40, gy, PH * .7); else capsule(g, sx + (Math.floor(ci) + .5) * tread, gy - (Math.floor(ci) + 1) * rise, PH * .7);
      capsule(g, 560, gy, PH * .7, C.p2);

      /* ---------- wall, side view ---------- */
      panel(g, 520, 297, 520, 288, 'Wall, from the side');
      const wy = 560, wx = 800, ph = 70, whp = wh * ph;
      g.strokeStyle = '#cdbf9f'; g.lineWidth = 2; g.beginPath(); g.moveTo(530, wy); g.lineTo(1030, wy); g.stroke();
      // something beyond the wall: a tower you can only see if the wall is low enough
      const tx = 960;
      g.fillStyle = C.stone; g.strokeStyle = C.navy; g.lineWidth = 2; g.fillRect(tx - 16, wy - 150, 32, 150); g.strokeRect(tx - 16, wy - 150, 32, 150);
      for (let i = 0; i < 3; i++) { g.fillRect(tx - 16 + i * 12, wy - 160, 8, 10); g.strokeRect(tx - 16 + i * 12, wy - 160, 8, 10); }
      g.fillStyle = C.gold; g.beginPath(); g.moveTo(tx, wy - 160); g.lineTo(tx, wy - 190); g.lineTo(tx + 22, wy - 182); g.lineTo(tx, wy - 174); g.fill(); g.stroke();
      g.font = '500 12px Jost, sans-serif'; g.fillStyle = C.muted; g.textAlign = 'center'; g.fillText('landmark', tx, wy - 198);
      g.fillStyle = C.wall; g.fillRect(wx, wy - whp, 40, whp); g.fillStyle = C.wallHi; g.fillRect(wx, wy - whp, 40, 3);
      capsule(g, 680, wy, ph);
      // the eye line: blocked when the wall is taller than eye height
      const ey = wy - ph * .87, sees = whp < ph * .87;
      g.setLineDash([8, 6]); g.strokeStyle = sees ? C.good : C.red; g.lineWidth = 2.5; g.beginPath(); g.moveTo(694, ey); g.lineTo(sees ? tx - 16 : wx, ey); g.stroke(); g.setLineDash([]);
      T.label(sees ? 'sees over it' : 'view blocked', 745, ey - 22, 'center', sees ? C.good : C.redDk, 14);
      // a bracket for the 150 to 200% band
      const b0 = wy - 1.5 * ph, b1 = wy - 2 * ph;
      g.fillStyle = 'rgba(47,174,99,.14)'; g.fillRect(wx + 46, b1, 14, b0 - b1);
      g.font = '500 12px Jost, sans-serif'; g.fillStyle = C.good; g.textAlign = 'left'; g.fillText('150–200%', wx + 64, (b0 + b1) / 2 + 4);
    };
  });
})();
