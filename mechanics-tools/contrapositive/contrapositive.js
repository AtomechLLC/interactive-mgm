/* Contrapositive arena (MGM C4 M3, deck slides 132-134). "If you're ranged, you can hit melee at a distance" flipped
   around shows the asymmetry: ranged can hit anyone, melee only what's close. Slide 134's picture: a monster shooting
   in four lanes, a big ranged reach zone and a small melee one. Each panel colours every spot by "can I hit the monster
   from here?" and "am I out of its shot lanes?" and counts the room that is both. Units are yards; the arena is 10. */
(function () {
  const { $, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;
  const W = 1040, ARENA = 10, MON = .8, LANE = .75, CELL = 5;    // lane half-width in yards; grid cell in px
  const DEF = { rr: 9, mr: 2.2, ln: 4 };

  // is the point (x, y), in yards from the monster, inside one of its n shot lanes?
  function inLane(x, y, n) {
    for (let k = 0; k < n; k++) {
      const a = k * Math.PI * 2 / n - Math.PI / 2, ux = Math.cos(a), uy = Math.sin(a);
      const along = x * ux + y * uy, across = Math.abs(-x * uy + y * ux);
      if (along > 0 && across < LANE) return true;
    }
    return false;
  }
  // share of the arena where a fighter with this reach can hit the monster without standing in a lane
  const memo = new Map();
  function room(reach, n) {
    const key = reach.toFixed(2) + '|' + n; if (memo.has(key)) return memo.get(key);
    let ok = 0, all = 0;
    for (let y = -ARENA; y <= ARENA; y += .1) for (let x = -ARENA; x <= ARENA; x += .1) {
      const d = Math.hypot(x, y); if (d > ARENA || d < MON) continue; all++;
      if (d <= reach + MON && !inLane(x, y, n)) ok++;
    }
    memo.set(key, ok / all); return ok / all;
  }
  // the best spot to stand: a safe point near the edge of your reach, between two lanes
  function spot(reach, n) {
    const a = n ? Math.PI / n - Math.PI / 2 : -Math.PI / 4;
    for (let d = reach + MON - .2; d > MON + .3; d -= .1) { const x = Math.cos(a) * d, y = Math.sin(a) * d; if (!inLane(x, y, n)) return [x, y, a]; }
    return null;
  }

  function panel(g, cx, cy, R, reach, n, t, who, col) {
    const s = R / ARENA;
    g.save(); g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.clip();
    g.fillStyle = '#efe6c6'; g.fillRect(cx - R, cy - R, R * 2, R * 2);
    for (let py = cy - R; py < cy + R; py += CELL) for (let px = cx - R; px < cx + R; px += CELL) {
      const x = (px + CELL / 2 - cx) / s, y = (py + CELL / 2 - cy) / s, d = Math.hypot(x, y), lane = inLane(x, y, n), hit = d <= reach + MON;
      if (hit && !lane) g.fillStyle = 'rgba(47,174,99,.55)';
      else if (lane) g.fillStyle = hit ? 'rgba(229,50,45,.55)' : 'rgba(232,140,90,.45)';
      else continue;
      g.fillRect(px, py, CELL, CELL);
    }
    // shots travelling down each lane
    for (let k = 0; k < n; k++) {
      const a = k * Math.PI * 2 / n - Math.PI / 2;
      for (let j = 0; j < 3; j++) { const d = MON + ((t * 4 + j * 3.4) % ARENA); g.fillStyle = C.redDk; g.beginPath(); g.arc(cx + Math.cos(a) * d * s, cy + Math.sin(a) * d * s, 5, 0, Math.PI * 2); g.fill(); }
    }
    g.restore();
    g.strokeStyle = C.navy; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.stroke();
    g.setLineDash([8, 6]); g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, Math.min(R, (reach + MON) * s), 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
    T.foe(cx, cy, MON * s + 6, Math.PI / 2, C.red, { mark: 'horns' });
    // the fighter, as a triangle like the slide's P1/P2/P3 markers, pointing at the monster
    const p = spot(reach, n);
    if (p) {
      const [x, y, a] = p, px = cx + x * s, py = cy + y * s;
      g.save(); g.translate(px, py); g.rotate(a + Math.PI / 2 + Math.PI);
      g.fillStyle = col; g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, -16); g.lineTo(14, 12); g.lineTo(-14, 12); g.closePath(); g.fill(); g.stroke(); g.restore();
    } else T.label('Nowhere safe to stand', cx, cy + 56, 'center', C.redDk, 15);
  }

  function draw(g, H, v, t, o = {}) {
    T.use(g); g.clearRect(0, 0, W, H);
    const R = o.title ? 225 : 228, cy = o.title ? 262 : 320;
    const mR = room(v.mr, v.ln), rR = room(v.rr, v.ln);
    panel(g, 262, cy, R, v.mr, v.ln, t, 'Melee', C.p2);
    panel(g, 778, cy, R, v.rr, v.ln, t, 'Ranged', C.player);
    if (!o.title) {
      T.label(`Melee: reach ${v.mr.toFixed(1)} yd`, 262, 46, 'center', '#fff', 17, C.p2);
      T.label(`Ranged: reach ${v.rr.toFixed(1)} yd`, 778, 46, 'center', '#fff', 17, C.player);
    }
    return { mR, rR };
  }

  // ---------- walk-through: defaults, more lanes, shorter range, a longer melee reach ----------
  const DUR = 21;
  const KEYS = [[0, DEF, 'Four shot lanes. The ranged fighter can hit from almost anywhere between them; the melee fighter has a sliver next to the monster.'],
    [5, { rr: 9, mr: 2.2, ln: 8 }, 'Eight lanes: near the monster the lanes overlap, so the melee fighter loses almost all of its room. Ranged barely notices.'],
    [9.5, { rr: 4, mr: 2.2, ln: 4 }, 'Back to four lanes, and cut the ranged reach to 4 yards. Ranged still has more safe room than melee.'],
    [14, { rr: 4, mr: 3.6, ln: 4 }, 'Give melee a lunge, 3.6 yards. Now the two have about the same room: the gap was in the rules, not the players.'],
    [19.5, DEF, '']];
  function tourAt(t) {
    let i = KEYS.length - 1; while (i > 0 && t < KEYS[i][0]) i--;
    const [t0, to] = KEYS[i], from = i ? KEYS[i - 1][1] : DEF, k = ease(clamp((t - t0) / 1.4));
    return { v: { rr: lerp(from.rr, to.rr, k), mr: lerp(from.mr, to.mr, k), ln: k < .5 ? from.ln : to.ln }, cap: KEYS[i][2] || KEYS[i - 1][2] };
  }

  canvasDemo('title', (s, cv, g) => { let t = 0; return dt => { t += dt; draw(g, cv.height, tourAt(t % DUR).v, t, { title: 1 }); }; });

  let api = null;
  canvasDemo('arena', (s, cv, g) => {
    const st = { v: { ...DEF }, tour: true, tt: 0, t: 0, held: false, last: '' };
    const inp = { rr: $(s, '.ct-rr'), mr: $(s, '.ct-mr'), ln: $(s, '.ct-ln') }, tourBtn = $(s, '.ct-tour');
    Object.entries(inp).forEach(([k, el]) => el.oninput = () => { st.tour = false; tourBtn.classList.remove('on'); st.v[k] = +el.value; });
    tourBtn.onclick = () => { st.tour = true; st.tt = 0; tourBtn.classList.add('on'); };
    $(s, '.ct-reset').onclick = () => { st.tour = false; tourBtn.classList.remove('on'); st.v = { ...DEF }; };
    function render() {
      let v = st.v, cap = '';
      if (st.tour) ({ v, cap } = tourAt(st.tt));
      const { mR, rR } = draw(g, cv.height, v, st.t);
      Object.entries(inp).forEach(([k, el]) => { el.value = v[k]; $(s, `.ct-v-${k}`).textContent = k === 'ln' ? Math.round(v[k]) : v[k].toFixed(1) + ' yd'; });
      const out = cap || 'Green: you can hit the monster and you are out of its lanes. Red: in reach, but in a lane. Try to give both fighters the same green room.';
      const ratio = mR > .002 ? (rR / mR).toFixed(1) + '×' : '∞';
      const key = `${(mR * 100).toFixed(0)}|${(rR * 100).toFixed(0)}|${out}`; if (key === st.last) return; st.last = key;
      say($(s, '.ct-stats'), `<div class="g"><b>${(mR * 100).toFixed(0)}%</b><span>of the arena where melee can hit safely</span></div><div><b>${(rR * 100).toFixed(0)}%</b><span>where ranged can hit safely</span></div><div class="y"><b>${ratio}</b><span>ranged’s room vs melee’s</span></div>`);
      say($(s, '.ct-out'), out);
    }
    api = { seek(t) { st.held = st.tour = true; st.tt = t; st.t = t; render(); }, dur: () => DUR };
    return dt => { if (!st.held) { st.t += dt; if (st.tour) { st.tt += dt; if (st.tt > DUR) st.tt = 0; } } render(); };
  });

  window.__seek = t => api.seek(t);
  window.__dur = () => api.dur();
})();
