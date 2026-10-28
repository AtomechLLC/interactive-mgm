/* Inversion (MGM C4 M3, deck slides 110-113). Flip where the danger is. A danger zone around the boss (the Ragnaros
   lava idea) makes the raid scatter to its edge; inverted, the whole floor erupts except one safe rune and the raid
   stacks into it; shrink that safe circle over time and you have the battle royale ring. One room, ten raiders, the
   same timing for every rule: telegraph at TELL, eruption at HIT. MODES and targetOf() are the model. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;
  const W = 1040, H = 585, ROOM = { x0: 24, y0: 24, x1: 1016, y1: 561 }, BOSS = [520, 292], YD = 26;   // 26 px per yard
  const TELL = 1.2, MOVE = 1.6, HIT = 4.6, LEN = 7, SPEED = 170;
  const MODES = [
    { k: 'danger', name: 'Danger zone', r: 150, cap: 'Danger zone: the space near the boss is lava. Everyone runs out to its edge, and the raid spreads out.' },
    { k: 'rune', name: 'Safe rune', r: 64, cap: 'Inverted: the whole floor erupts, except one safe rune. Everyone runs into it, and the raid stacks up.' },
    { k: 'ring', name: 'Shrinking ring', r: 300, r1: 80, cap: 'Shrink the safe circle over time and you have the battle royale ring: the whole match is pulled toward one spot.' },
  ];
  // ten raiders clumped around the boss as a melee raid would be (fixed, so every replay matches)
  const START = Array.from({ length: 10 }, (_, i) => { const a = i / 10 * Math.PI * 2 + .3, r = 78 + (i % 3) * 22; return [BOSS[0] + Math.cos(a) * r, BOSS[1] + Math.sin(a) * r * .9]; });
  const ringR = (m, t) => m.k === 'ring' ? lerp(m.r, m.r1, ease(clamp((t - MOVE) / (HIT + 1.4 - MOVE)))) : m.r;

  // where raider i wants to be at time t under this rule, given the zone centre z
  function targetOf(m, z, i, p, t) {
    const dx = p[0] - z[0], dy = p[1] - z[1], d = Math.hypot(dx, dy) || 1;
    if (m.k === 'danger') return d < m.r + 22 ? [z[0] + dx / d * (m.r + 28), z[1] + dy / d * (m.r + 28)] : p;
    // inside a safe circle: rune packs everyone in a little spiral, the ring spreads them over the shrinking circle
    if (m.k === 'rune') { const a = i * 2.4, rr = 10 + 13 * Math.sqrt(i); return [z[0] + Math.cos(a) * rr, z[1] + Math.sin(a) * rr]; }
    const r = ringR(m, t) - 22, a = i * 2.4, rr = r * Math.sqrt((i + .5) / 10); return [z[0] + Math.cos(a) * rr, z[1] + Math.sin(a) * rr];   // spread out inside whatever is left
  }
  // replay from 0 to t with a fixed step so a seek always lands on the same frame
  function sim(m, z, t) {
    const ps = START.map(p => p.slice()), trails = START.map(p => [p.slice()]);
    for (let x = 0; x < t; x += 1 / 60) {
      if (x < MOVE) continue;
      ps.forEach((p, i) => {
        const q = targetOf(m, z, i, p, x), d = Math.hypot(q[0] - p[0], q[1] - p[1]), st = Math.min(d, SPEED / 60);
        if (d > .5) { p[0] += (q[0] - p[0]) / d * st; p[1] += (q[1] - p[1]) / d * st; }
        if (Math.round(x * 60) % 4 === 0) trails[i].push(p.slice());
      });
    }
    return { ps, trails };
  }
  const isHit = (m, z, p, t) => { const d = Math.hypot(p[0] - z[0], p[1] - z[1]); return m.k === 'danger' ? d < m.r : d > ringR(m, t); };
  const spread = ps => { let s = 0, n = 0; ps.forEach((a, i) => ps.slice(i + 1).forEach(b => { s += Math.hypot(a[0] - b[0], a[1] - b[1]); n++; })); return s / n / YD; };

  function draw(g, m, z, t, o = {}) {
    T.use(g); g.clearRect(0, 0, W, H);
    T.floor(ROOM.x0, ROOM.y0, ROOM.x1 - ROOM.x0, ROOM.y1 - ROOM.y0);
    g.strokeStyle = C.wall; g.lineWidth = 10; g.strokeRect(ROOM.x0 - 5, ROOM.y0 - 5, ROOM.x1 - ROOM.x0 + 10, ROOM.y1 - ROOM.y0 + 10);
    const { ps, trails } = sim(m, z, t), tell = clamp((t - TELL) / .4), erupt = t >= HIT && t < HIT + 1.6, r = ringR(m, t);
    const pulse = .55 + .25 * Math.sin(t * 9);
    // the telegraph: danger is red, safe is blue; outside the safe circle turns red
    if (tell > 0) {
      g.save(); g.globalAlpha = tell;
      if (m.k === 'danger') { g.fillStyle = `rgba(229,50,45,${erupt ? .7 : .28 * pulse + .1})`; g.beginPath(); g.arc(z[0], z[1], m.r, 0, Math.PI * 2); g.fill(); }
      else {
        g.fillStyle = `rgba(229,50,45,${erupt ? .6 : .22 * pulse + .08})`; g.beginPath(); g.rect(ROOM.x0, ROOM.y0, ROOM.x1 - ROOM.x0, ROOM.y1 - ROOM.y0); g.arc(z[0], z[1], r, 0, Math.PI * 2, true); g.fill();
        g.fillStyle = 'rgba(87,182,255,.25)'; g.beginPath(); g.arc(z[0], z[1], r, 0, Math.PI * 2); g.fill();
      }
      g.setLineDash([12, 8]); g.strokeStyle = m.k === 'danger' ? C.redDk : '#2b78c9'; g.lineWidth = 4; g.beginPath(); g.arc(z[0], z[1], r, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
      if (m.k === 'rune') { g.strokeStyle = '#2b78c9'; g.lineWidth = 3; g.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + t; g.lineTo(z[0] + Math.cos(a) * r * .6, z[1] + Math.sin(a) * r * .6); } g.closePath(); g.stroke(); }
      g.restore();
    }
    T.foe(BOSS[0], BOSS[1], 34, Math.PI / 2, C.red, { mark: 'horns' });
    trails.forEach(tr => T.trail(tr, C.player, .5, 3));
    let hits = 0;
    ps.forEach((p, i) => {
      const hit = t >= HIT && isHit(m, z, p, HIT);
      if (hit) hits++;
      T.player(p[0], p[1], Math.atan2(BOSS[1] - p[1], BOSS[0] - p[0]), .72, hit ? .45 : 1);
      if (hit && t < HIT + 1) T.popText('hit', p[0], p[1] - 30 - (t - HIT) * 20, C.redDk, 1 - (t - HIT));
    });
    if (erupt) T.flash(z[0], z[1], m.k === 'danger' ? m.r * 1.2 : 120, clamp(1 - (t - HIT) / .6));
    // the slide's figure-ground picture, in the corner: what counts as floor
    if (!o.title) {
      const fx = ROOM.x1 - 130, fy = ROOM.y0 + 14, inv = m.k !== 'danger';
      g.fillStyle = inv ? '#111' : '#fff'; g.strokeStyle = C.navy; g.lineWidth = 2; g.fillRect(fx, fy, 112, 64); g.strokeRect(fx, fy, 112, 64);
      g.fillStyle = inv ? '#fff' : '#111'; g.beginPath(); g.arc(fx + 76, fy + 32, 24, 0, Math.PI * 2); g.fill();
      T.label(inv ? 'Safe in danger' : 'Danger in safe', fx + 56, fy + 82, 'center', C.ink, 13);
      T.label(m.name, ROOM.x0 + 90, ROOM.y0 + 26, 'center', '#fff', 17, m.k === 'danger' ? C.redDk : '#2b78c9');
    }
    return { hits, spread: spread(ps) };
  }

  const tourAt = t => { const i = Math.floor(t / LEN) % 3; return { m: MODES[i], t: t % LEN }; };
  const centre = m => m.k === 'danger' ? BOSS.slice() : m.k === 'rune' ? [700, 400] : [360, 360];

  canvasDemo('title', (s, cv, g) => { let t = 0; return dt => { t += dt; const { m, t: tt } = tourAt(t); draw(g, m, centre(m), tt, { title: 1 }); }; });

  let api = null;
  canvasDemo('raid', (s, cv, g) => {
    const st = { mi: 0, z: centre(MODES[0]), t: 0, tour: true, tt: 0, held: false, last: '' };
    const box = $(s, '.iv-modes'), tourBtn = $(s, '.iv-tour');
    box.innerHTML = MODES.map((m, i) => `<button class="btn" data-i="${i}">${m.name}</button>`).join('');
    const pick = i => { st.tour = false; tourBtn.classList.remove('on'); st.mi = i; st.z = centre(MODES[i]); st.t = 0; };
    $$(box, 'button').forEach(b => b.onclick = () => pick(+b.dataset.i));
    tourBtn.onclick = () => { st.tour = true; st.tt = 0; tourBtn.classList.add('on'); };
    $(s, '.iv-play').onclick = () => { if (st.tour) pick(st.mi); st.t = 0; };
    cv.addEventListener('pointerdown', e => {
      const p = FPF.ptr(cv, e); if (st.tour) pick(st.mi);
      st.z = [clamp(p.x, ROOM.x0 + 60, ROOM.x1 - 60), clamp(p.y, ROOM.y0 + 60, ROOM.y1 - 60)]; st.t = 0;
    });
    function render() {
      let m = MODES[st.mi], z = st.z, t = st.t;
      if (st.tour) { const k = tourAt(st.tt); m = k.m; t = k.t; z = centre(m); st.mi = MODES.indexOf(m); }
      const r = draw(g, m, z, Math.min(t, LEN));
      $$(box, 'button').forEach((b, i) => b.classList.toggle('on', i === st.mi));
      const done = t >= HIT;
      const key = `${st.mi}|${done ? r.hits : '-'}|${r.spread.toFixed(0)}`; if (key === st.last) return; st.last = key;
      say($(s, '.iv-stats'), `<div class="${m.k === 'danger' ? 'g' : 'r'}"><b>${r.spread.toFixed(0)} yd</b><span>average distance between raiders</span></div><div class="y"><b>${done ? r.hits : '…'}</b><span>raiders hit by the eruption</span></div>`);
      say($(s, '.iv-out'), m.cap + (m.k === 'danger' ? '' : ' Same code, opposite behaviour.'));
    }
    api = { seek(t) { st.held = st.tour = true; st.tt = t; render(); }, dur: () => LEN * 3 };
    return dt => { if (!st.held) { if (st.tour) { st.tt += dt; if (st.tt > LEN * 3) st.tt = 0; } else st.t = Math.min(st.t + dt, LEN); } render(); };
  });

  window.__seek = t => api.seek(t);
  window.__dur = () => api.dur();
})();
