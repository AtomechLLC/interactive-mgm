/* One river, many answers (genre breakdown: "Sandbox Game Design").
   A loosely tuned challenge: reach the shrine past a river and a cliff. Each tool answers the river, the cliff, or
   both. A solution is any river answer paired with any cliff answer, plus any tool that answers both alone, so the
   count multiplies as tools are added instead of adding. The scene plays each solution in turn. */
(function () {
  const C = TD.C, { clamp, lerp } = TD;
  const TOOLS = [['bridge', 'Build a bridge', 'river'], ['boat', 'Row a boat', 'river'], ['ice', 'Freeze the water', 'river'], ['dig', 'Dig a ramp', 'cliff'], ['climb', 'Climb the rock', 'cliff'], ['glide', 'Glide from the hill', 'both']];
  function solutions(on) {
    const r = TOOLS.filter(t => on.has(t[0]) && t[2] === 'river'), c = TOOLS.filter(t => on.has(t[0]) && t[2] === 'cliff'), b = TOOLS.filter(t => on.has(t[0]) && t[2] === 'both');
    const out = []; r.forEach(x => c.forEach(y => out.push([x, y]))); b.forEach(x => out.push([x]));
    return out;
  }
  // the scene: hill (left), river, bank, cliff, shrine on top
  const RIV = [300, 460], CL = 640, TOP = 250, GR = 430;
  function pathFor(sol, k) {   // player position along a solution, k in 0..1
    const legs = [];
    if (sol.length === 1) { legs.push([[60, 300], [140, 220]], [[140, 220], [700, TOP - 20]], [[700, TOP - 20], [880, TOP - 20]]); }
    else {
      legs.push([[60, GR - 20], [RIV[0] - 10, GR - 20]]);
      legs.push([[RIV[0] - 10, GR - 20], [RIV[1] + 10, GR - 20]]);
      legs.push(sol[1][0] === 'dig' ? [[RIV[1] + 10, GR - 20], [CL + 70, TOP - 20]] : [[RIV[1] + 10, GR - 20], [CL - 14, GR - 20]]);
      legs.push(sol[1][0] === 'dig' ? [[CL + 70, TOP - 20], [880, TOP - 20]] : [[CL - 14, GR - 20], [CL - 14, TOP - 20]]);
      if (sol[1][0] !== 'dig') legs.push([[CL - 14, TOP - 20], [880, TOP - 20]]);
    }
    const i = Math.min(legs.length - 1, Math.floor(k * legs.length)), kk = k * legs.length - i, [a, b] = legs[i];
    return [lerp(a[0], b[0], kk), lerp(a[1], b[1], kk)];
  }
  GK.scene('tools', (s, g, ui) => {
    const btns = [...s.querySelectorAll('.sb-t .btn')]; ui.watch(btns);
    const on = new Set(['bridge', 'climb']);
    btns.forEach(b => b.onclick = () => { const n = b.dataset.t; on.has(n) ? on.delete(n) : on.add(n); });
    const ORDER = ['bridge', 'climb', 'boat', 'dig', 'ice', 'glide'];
    return {
      dur: 30,
      frame(t, tour) {
        if (tour) { const n = clamp(Math.floor(t / 5) + 2, 2, 6); on.clear(); ORDER.slice(0, n).forEach(x => on.add(x)); }
        btns.forEach(b => b.classList.toggle('on', on.has(b.dataset.t)));
        const sols = solutions(on), per = 2.5, si = sols.length ? Math.floor(t / per) % sols.length : 0, sol = sols[si], k = (t % per) / per;
        GK.panel(g);
        // scene
        g.fillStyle = '#bfe0f2'; g.beginPath(); g.roundRect(16, 16, 1008, 440, 10); g.fill();
        g.fillStyle = '#7fb069'; g.beginPath(); g.moveTo(16, GR); g.lineTo(16, 280); g.quadraticCurveTo(120, 190, 220, 300); g.lineTo(RIV[0], GR); g.closePath(); g.fill();
        g.fillRect(16, GR, RIV[0] - 16, 456 - GR); g.fillRect(RIV[1], GR, CL - RIV[1], 456 - GR);
        g.fillStyle = '#8b8fa8'; g.fillRect(CL, TOP, 1024 - CL, 456 - TOP); g.fillStyle = '#7fb069'; g.fillRect(CL, TOP - 8, 1024 - CL, 10);
        const frozen = sol && sol[0][0] === 'ice';
        g.fillStyle = frozen ? '#e4f3fb' : '#3f74c9'; g.fillRect(RIV[0], GR + 6, RIV[1] - RIV[0], 450 - GR);
        GK.text(g, 'river', (RIV[0] + RIV[1]) / 2, 452, frozen ? C.navy : '#fff', 13, 'center', 700);
        GK.text(g, 'cliff', CL + 30, 340, '#fff', 13, 'left', 700);
        // shrine
        g.fillStyle = C.gold; g.fillRect(900, TOP - 60, 70, 52); g.fillStyle = C.redDk; g.beginPath(); g.moveTo(890, TOP - 60); g.lineTo(935, TOP - 92); g.lineTo(980, TOP - 60); g.fill();
        if (sol) {
          const tl = sol.map(x => x[0]);
          if (tl.includes('bridge')) { g.fillStyle = '#8b5a2b'; g.fillRect(RIV[0] - 10, GR - 4, RIV[1] - RIV[0] + 20, 10); }
          if (tl.includes('boat') && k > .2 && k < .45) { const bx = lerp(RIV[0] + 10, RIV[1] - 60, (k - .2) / .25); g.fillStyle = '#8b5a2b'; g.beginPath(); g.moveTo(bx, GR); g.lineTo(bx + 60, GR); g.lineTo(bx + 50, GR + 14); g.lineTo(bx + 10, GR + 14); g.fill(); }
          if (tl.includes('dig')) { g.fillStyle = '#a07a52'; g.beginPath(); g.moveTo(RIV[1] + 20, GR); g.lineTo(CL + 70, TOP); g.lineTo(CL + 70, GR); g.fill(); }
          if (tl.includes('climb')) { g.strokeStyle = '#5a4330'; g.lineWidth = 3; for (let y = TOP; y < GR; y += 22) { g.beginPath(); g.moveTo(CL - 6, y); g.lineTo(CL + 2, y + 8); g.stroke(); } }
          if (tl.includes('glide') && k > .2 && k < .7) { const p = pathFor(sol, k); g.fillStyle = C.purple; g.beginPath(); g.moveTo(p[0] - 40, p[1] - 22); g.quadraticCurveTo(p[0], p[1] - 46, p[0] + 40, p[1] - 22); g.lineTo(p[0], p[1] - 30); g.fill(); }
          const p = pathFor(sol, k); TD.player(p[0], p[1], 0, .8);
          TD.label(`solution ${si + 1} of ${sols.length}: ${sol.map(x => x[1]).join(', then ')}`, 520, 40, 'center', C.navy, 14);
        } else TD.label('no way across with these tools', 520, 40, 'center', C.redDk, 14);
        // counts
        const r = TOOLS.filter(x => on.has(x[0]) && x[2] === 'river').length, c = TOOLS.filter(x => on.has(x[0]) && x[2] === 'cliff').length, b = on.has('glide') ? 1 : 0;
        GK.big(g, `${on.size}`, 'tools', 24, 500);
        GK.big(g, `${r} × ${c}${b ? ' + 1' : ''} = ${sols.length}`, 'river answers × cliff answers (+ one that does both)', 140, 500, C.good);
        GK.wrap(g, 'The challenge is tuned loosely on purpose: no single intended answer, so every tool you add multiplies the ways through.', 560, 490, 440, 19, C.ink, 14);
        ui.stats(`<div><b>${on.size}</b><span>tools</span></div><div class="g"><b>${sols.length}</b><span>ways to reach the shrine</span></div>`);
        ui.out('A toolbox plus a loosely tuned challenge: the player picks the answer, and the designer never had to author each one.');
      },
    };
  });
})();
