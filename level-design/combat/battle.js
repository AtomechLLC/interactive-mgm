/* Combat on a map: three slides drawn on one floor plan (map.js) and one simulation (sim.js).
   1. the map study: lanes, longest sightlines and doorways, all measured from the plan itself
   2. the two squads: every token with the behaviour or power the simulation gives it
   3. the battle: ten modern tokens against ten sci-fi tokens, respawning until one side has 100 kills,
      seen from above or through the eyes of one followed token (fp.js)
   4. three lopsided maps (maps.js): the same battle, with every environmental feature counted by which token used it
   Every unit, telegraph, arrow, status badge and prop is a student token from student-tokens/vector-basics/svg. */
(function () {
  const { $, $$, demo, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp } = TD;
  const W = 1040, H = 585, TAU = Math.PI * 2, TILE = 40;
  const TEAM = [{ name: 'Modern', col: '#1f8fa8', soft: '#8fdbe0', tel: 'ally' }, { name: 'Sci-fi', col: '#d9601f', soft: '#e3ad8c', tel: 'enemy' }];
  const SVG = new URL('../../student-tokens/vector-basics/svg/', document.currentScript.src).href;
  const MAP = FPSMAP.build(), ROSTER = FPSSIM.ROSTER;

  // student tokens, drawn once into a small canvas each so a frame is only bitmap copies
  const cache = {};
  function tok(path, px = 256) {
    let c = cache[path];
    if (!c) { c = cache[path] = { cv: null }; const im = new Image(); im.onload = () => { const cv = document.createElement('canvas'); cv.width = cv.height = px; cv.getContext('2d').drawImage(im, 0, 0, px, px); c.cv = cv; }; im.src = SVG + path + '.svg'; }
    return c.cv;
  }
  const unitTok = u => tok((u.team ? 'scifi' : 'modern') + '/enemy-' + u.key);
  ROSTER.forEach(unitTok);
  ['stun', 'slow', 'root', 'marked', 'confuse', 'haste', 'burn', 'bleed', 'heal', 'invulnerable', 'damage-up', 'channeling', 'dead', 'shield'].forEach(n => tok('status/' + n, 64));
  ['ally', 'enemy'].forEach(s => ['circle', 'ring', 'cone', 'line', 'burst', 'lightning', 'projectile', 'target-circle'].forEach(n => tok(`telegraphs/${n}-${s}`, 256)));
  ['arrows/charge-ally', 'arrows/charge-enemy', 'arrows/leap-ally', 'arrows/leap-enemy', 'props/bomb', 'props/vortex', 'props/barrel', 'props/rock', 'tokens/neutral-creature'].forEach(n => tok(n));

  let plan = null;
  // what plan.js does not draw: glass, vent grilles, ledges, and the fixed parts of the hazards
  function decor(g, map) {
    const INK = PLAN.INK;
    map.P.doors.forEach(d => {
      const a = [d.m[0] - d.e[0] * d.gw / 2, d.m[1] - d.e[1] * d.gw / 2], z = [d.m[0] + d.e[0] * d.gw / 2, d.m[1] + d.e[1] * d.gw / 2], n = [-d.e[1], d.e[0]];
      g.lineCap = 'butt';
      if (d.kind === 'window') { /* drawn each frame by drawGlass: a pane cracks and breaks */ }
      else if (d.kind === 'vent') { g.strokeStyle = '#4a4f6b'; g.lineWidth = 12; g.beginPath(); g.moveTo(...a); g.lineTo(...z); g.stroke(); g.strokeStyle = '#c9c4b4'; g.lineWidth = 1.5; for (let k = 3; k < d.gw; k += 5) { const p = [a[0] + d.e[0] * k, a[1] + d.e[1] * k]; g.beginPath(); g.moveTo(p[0] + n[0] * 5, p[1] + n[1] * 5); g.lineTo(p[0] - n[0] * 5, p[1] - n[1] * 5); g.stroke(); } }
      else if (d.kind === 'ledge') {
        const rb = map.P.rooms[d.b].c, k = (rb[0] - d.m[0]) * n[0] + (rb[1] - d.m[1]) * n[1] > 0 ? 1 : -1;
        g.strokeStyle = C.goldInk; g.lineWidth = 4; g.setLineDash([10, 5]); g.beginPath(); g.moveTo(...a); g.lineTo(...z); g.stroke(); g.setLineDash([]);
        g.fillStyle = C.goldInk; for (let t = 15; t < d.gw; t += 30) { const p = [a[0] + d.e[0] * t, a[1] + d.e[1] * t]; g.beginPath(); g.moveTo(p[0] + n[0] * k * 16, p[1] + n[1] * k * 16); g.lineTo(p[0] + n[0] * k * 6 + d.e[0] * 6, p[1] + n[1] * k * 6 + d.e[1] * 6); g.lineTo(p[0] + n[0] * k * 6 - d.e[0] * 6, p[1] + n[1] * k * 6 - d.e[1] * 6); g.fill(); }
      }
    });
    (map.hazards || []).forEach(h => {
      if (h.type === 'patrol') { g.strokeStyle = 'rgba(28,36,80,.4)'; g.lineWidth = 2; [-7, 7].forEach(k => { g.beginPath(); g.moveTo(h.a[0], h.a[1] + k); g.lineTo(h.b[0], h.b[1] + k); g.stroke(); }); for (let x = h.a[0]; x <= h.b[0]; x += 22) { g.beginPath(); g.moveTo(x, h.a[1] - 10); g.lineTo(x, h.a[1] + 10); g.stroke(); } }
      else if (h.type === 'rotor') { g.strokeStyle = 'rgba(229,50,45,.35)'; g.lineWidth = 2; g.setLineDash([6, 6]); g.beginPath(); g.arc(h.x, h.y, h.len + (h.amp || 0), 0, TAU); g.stroke(); g.setLineDash([]); }
      else if (h.type === 'roll') { g.strokeStyle = 'rgba(28,36,80,.3)'; g.lineWidth = 2; g.setLineDash([2, 9]); g.beginPath(); g.moveTo(...h.a); g.lineTo(...h.b); g.stroke(); g.setLineDash([]); g.fillStyle = '#4a4f6b'; g.beginPath(); g.arc(h.a[0], h.a[1], h.r + 4, 0, TAU); g.fill(); }
      else if (h.type === 'erupt') { g.fillStyle = '#4a4f6b'; g.beginPath(); g.arc(h.x, h.y, 13, 0, TAU); g.fill(); g.fillStyle = '#ff8a2a'; g.beginPath(); g.arc(h.x, h.y, 7, 0, TAU); g.fill(); g.strokeStyle = 'rgba(229,50,45,.3)'; g.lineWidth = 2; g.setLineDash([6, 6]); g.beginPath(); g.arc(h.x, h.y, h.R + h.r, 0, TAU); g.stroke(); g.setLineDash([]); }
      else if (h.type === 'collapse') { g.fillStyle = 'rgba(77,158,200,.28)'; g.beginPath(); g.arc(h.x, h.y, h.R, 0, TAU); g.fill(); g.strokeStyle = 'rgba(40,110,150,.5)'; g.lineWidth = 2; for (let r = h.eye; r < h.R; r += 16) { g.beginPath(); g.arc(h.x, h.y, r, r * .2, r * .2 + 4.4); g.stroke(); } }
      else if (h.type === 'trench') { g.strokeStyle = '#4a4033'; g.lineWidth = 9; g.lineJoin = 'round'; g.lineCap = 'round'; g.beginPath(); h.pts.forEach((p, i) => i ? g.lineTo(...p) : g.moveTo(...p)); g.stroke(); g.strokeStyle = '#1f1a14'; g.lineWidth = 4; g.stroke(); }
      else if (h.type === 'hop') { h.pts.forEach(p => { g.strokeStyle = 'rgba(58,138,44,.45)'; g.lineWidth = 2; g.setLineDash([4, 5]); g.beginPath(); g.arc(p[0], p[1], h.r, 0, TAU); g.stroke(); g.setLineDash([]); }); }
      else if (h.type === 'bounce') { g.strokeStyle = 'rgba(28,36,80,.25)'; g.lineWidth = 1.5; g.setLineDash([3, 6]); g.strokeRect(h.box[0] - h.r, h.box[1] - h.r, h.box[2] - h.box[0] + 2 * h.r, h.box[3] - h.box[1] + 2 * h.r); g.setLineDash([]); }
      else if (h.type === 'leash') { g.strokeStyle = 'rgba(229,50,45,.3)'; g.lineWidth = 2; g.setLineDash([6, 6]); g.beginPath(); g.arc(h.x, h.y, h.L, 0, TAU); g.stroke(); g.setLineDash([]); g.fillStyle = '#4a4f6b'; g.beginPath(); g.arc(h.x, h.y, 6, 0, TAU); g.fill(); }
      else if (h.type === 'jet') { g.fillStyle = '#4a4f6b'; [h.a, h.b].forEach(p => { g.beginPath(); g.arc(p[0], p[1], 7, 0, TAU); g.fill(); }); g.strokeStyle = 'rgba(255,138,42,.35)'; g.lineWidth = 2; g.setLineDash([4, 6]); g.beginPath(); g.moveTo(...h.a); g.lineTo(...h.b); g.stroke(); g.setLineDash([]); }
    });
  }
  const planOf = map => { if (!map._plan) { map._plan = map.P.render(W, H); FPSTHEME.paint(map._plan.getContext('2d'), map); decor(map._plan.getContext('2d'), map); } return map._plan; };
  const base = (g, map = MAP) => { const p = planOf(map); if (map === MAP) plan = p; g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(255,252,244,.85)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill(); g.drawImage(p, 0, 0); };
  const labels = (g, map = MAP) => Object.values(map.P.rooms).forEach(r => { if (r.lab) r.lab.split('\n').forEach((t, i, all) => T.label(t, (r.labAt || r.c)[0], (r.labAt || r.c)[1] + (i - (all.length - 1) / 2) * 15, 'center', C.muted, i ? 11 : 13, 'rgba(255,252,244,.7)')); });
  // im drawn so that the point (ax, ay) of its 100 x 100 box sits at (x, y), turned by rot, at k px per unit
  function stampTok(g, im, x, y, rot, kx, ky, ax = 50, ay = 50, a = 1) { if (!im || a <= 0) return; g.save(); g.globalAlpha *= a; g.translate(x, y); g.rotate(rot); g.drawImage(im, -ax * kx, -ay * ky, 100 * kx, 100 * ky); g.restore(); }
  // a token whose disc (centre 42,56; radius 32 of 100) lands on (x, y) with radius r, inside a ring in its team's colour
  function drawUnit(g, def, x, y, r, a = 1, disc = true) {
    const k = r / 32; g.save(); g.globalAlpha *= a;
    if (disc) { g.fillStyle = TEAM[def.team].col; g.beginPath(); g.arc(x, y, r + 3, 0, TAU); g.fill(); }
    const im = unitTok(def); if (im) g.drawImage(im, x - 42 * k, y - 56 * k, 100 * k, 100 * k); else { g.fillStyle = '#8a8f9c'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
    g.restore();
  }

  /* ---------- 1. the map study ---------- */
  const laneCol = { long: '#2ea3dc', mid: '#8a4fd6', tun: '#2fae63' }, laneName = { long: 'Long Dock', mid: 'Brine Doors', tun: 'Pump Tunnels' };
  function study() {
    const P = MAP.P, probe = FPSSIM.create(MAP, { seed: 7 }), out = {};
    Object.entries(MAP.lanes).forEach(([k, route]) => {
      const pts = P.walk(route); let len = 0; pts.forEach((p, i) => { if (i) len += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]); });
      // longest clear line with both ends in this lane's own rooms (the spawns are left out)
      const own = route.slice(1, -1), xs = [], rnd = (() => { let s = 99; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
      own.forEach(id => { const r = P.rooms[id], x0 = Math.min(...r.pts.map(p => p[0])), x1 = Math.max(...r.pts.map(p => p[0])), y0 = Math.min(...r.pts.map(p => p[1])), y1 = Math.max(...r.pts.map(p => p[1])); for (let i = 0; i < 26; i++) xs.push({ x: x0 + 12 + rnd() * (x1 - x0 - 24), y: y0 + 12 + rnd() * (y1 - y0 - 24), room: id }); });
      let best = { d: 0 }; xs.forEach((a, i) => xs.slice(i + 1).forEach(b => { const d = Math.hypot(a.x - b.x, a.y - b.y); if (d > best.d && probe.los(a, b)) best = { d, a, b }; }));
      out[k] = { pts, len, sight: best, doors: route.length - 1 };
    });
    return out;
  }
  canvasDemo('fps-map', (s, cv, g) => {
    const S = study(); let view = 'lanes', t = 0;
    const VIEWS = {
      lanes: ['Lanes', () => `<b class="accent">Three routes between the spawns.</b> The reference, Dust II, is read by players as three lanes: a long open one, a middle and a tunnel side. Saltworks keeps that count and gives each lane a different length, so the walk is part of the choice. Its rooms, proportions and names are our own.`],
      sight: ['Sightlines', () => `<b class="accent">One lane is built for range.</b> The longest clear line in each lane, measured on the plan. Dust II’s long lane is where rifles with scopes rule; Long Dock borrows that idea at ${(S.long.sight.d / TILE).toFixed(0)} tiles. Pump Tunnels is its opposite: the doorways are staggered, so no line there is longer than ${(S.tun.sight.d / TILE).toFixed(0)} tiles and close-range units can cross it alive.`],
      choke: ['Doorways', () => `<b class="accent">The middle is one doorway wide.</b> Every circle is a doorway, the only places a shot or a unit can pass a wall. Dust II squeezes its middle through a pair of doors, and whoever holds them can turn into either outer lane. Brine Doors does the same job with one doorway and two short connectors, drawn in gold. The battle slide counts how often that doorway changes hands, and lets you wall it up.`],
    };
    const seg = $(s, '.fm-view'); seg.innerHTML = Object.entries(VIEWS).map(([k, v]) => `<button class="btn" data-k="${k}">${v[0]}</button>`).join('');
    const set = k => {
      view = k; t = 0; $$(seg, '.btn').forEach(b => b.classList.toggle('on', b.dataset.k === k)); say($(s, '.fm-out'), VIEWS[k][1]());
      const rows = Object.entries(S).map(([id, L]) => view === 'lanes' ? [`${Math.round(L.len / TILE)} tiles`, laneName[id]] : view === 'sight' ? [`${(L.sight.d / TILE).toFixed(1)} tiles`, laneName[id]] : [`${L.doors}`, laneName[id]]);
      say($(s, '.fm-metric'), { lanes: 'Walk from spawn to spawn', sight: 'Longest clear line in the lane', choke: 'Doorways to pass, spawn to spawn' }[view]);
      say($(s, '.fm-stats'), rows.map(([v, l], i) => `<div style="border-left-color:${Object.values(laneCol)[i]}"><b>${v}</b><span>${l}</span></div>`).join(''));
    };
    $$(seg, '.btn').forEach(b => b.onclick = () => set(b.dataset.k)); set('lanes');
    window.__fpsMapView = set;
    return dt => {
      t += dt; T.use(g); base(g);
      const k = clamp(t / .9);
      if (view === 'lanes') Object.entries(S).forEach(([id, L]) => {
        const n = Math.max(2, Math.ceil(L.pts.length * k)); T.trail(L.pts.slice(0, n), laneCol[id], 1, 6);
      });
      if (view === 'sight') Object.entries(S).forEach(([id, L]) => {
        const { a, b } = L.sight, x = a.x + (b.x - a.x) * k, y = a.y + (b.y - a.y) * k;
        g.strokeStyle = laneCol[id]; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(x, y); g.stroke();
        [a, { x, y }].forEach(p => { g.fillStyle = laneCol[id]; g.beginPath(); g.arc(p.x, p.y, 7, 0, TAU); g.fill(); });
        T.label(`${(L.sight.d / TILE).toFixed(1)} tiles`, (a.x + b.x) / 2, (a.y + b.y) / 2 - 18, 'center', laneCol[id], 14);
      });
      if (view === 'choke') MAP.P.doors.forEach(d => {
        const con = /^r?c[NS]$/.test(d.a) || /^r?c[NS]$/.test(d.b), mid = d.a === 'MidW' && d.b === 'MidE';
        g.strokeStyle = mid ? C.red : con ? '#e0a92d' : C.ink; g.lineWidth = mid ? 5 : 3; g.beginPath(); g.arc(d.m[0], d.m[1], (mid ? 30 : 24) * (.6 + .4 * k), 0, TAU); g.stroke();
        if (mid) T.label('the only way through the middle', d.m[0] + 40, d.m[1], 'left', C.redDk, 14);
      });
      labels(g);
      if (view === 'lanes') Object.entries(S).forEach(([id, L]) => { const m = L.pts[L.pts.length >> 1]; T.label(`${Math.round(L.len / TILE)} tiles`, m[0], m[1] + (id === 'mid' ? 62 : 24), 'center', laneCol[id], 14); });
    };
  });

  /* ---------- 2. the squads ---------- */
  demo('fps-roster', {
    init(s) {
      const grid = $(s, '.fr-grid'), out = $(s, '.fr-out');
      grid.innerHTML = [0, 1].map(t => `<div class="fr-team" style="--tc:${TEAM[t].col}"><h4>${TEAM[t].name} squad</h4><div class="fr-row">` + ROSTER.filter(u => u.team === t).map(u => `<button class="fr-u" data-k="${u.key}"><img src="${SVG}${t ? 'scifi' : 'modern'}/enemy-${u.key}.svg" alt=""><span>${u.name}</span></button>`).join('') + '</div></div>').join('');
      const pick = k => {
        const u = ROSTER.find(x => x.key === k); $$(grid, '.fr-u').forEach(b => b.classList.toggle('on', b.dataset.k === k));
        const w = { bullet: 'rifle fire', bolt: 'plasma bolts', rail: 'aimed shots', rocket: 'rockets', arc: 'energy arcs', melee: 'melee', none: 'no weapon' }[u.shot], ln = u.lane.indexOf(Math.max(...u.lane));
        const E = FPSSIM.EDGE[u.key];
        say(out, `<b style="color:${TEAM[u.team].col}">${u.name}.</b> ${u.does}${E ? ` <b class="accent">Its moment:</b> it hits about twice as hard ${E[1]}.` : ''}<br><span class="chip">${u.hp} health</span> <span class="chip">${w}${u.range > 40 ? `, ${(u.range / TILE).toFixed(1)} tiles` : ''}</span> <span class="chip">${u.spd > 110 ? 'fast' : u.spd < 75 ? 'slow' : 'walking pace'}</span> <span class="chip gold">prefers ${Object.values(laneName)[ln]}</span>`);
      };
      $$(grid, '.fr-u').forEach(b => b.onclick = () => pick(b.dataset.k)); pick('marksman');
      window.__fpsPick = pick;
    },
  });

  /* ---------- 3. the battle ---------- */
  const BADGE = [['guard', 'invulnerable'], ['stun', 'stun'], ['confuse', 'confuse'], ['root', 'root'], ['slow', 'slow'], ['marked', 'marked'], ['burn', 'burn'], ['bleed', 'bleed'], ['haste', 'haste'], ['amp', 'damage-up']];
  // glass: a pane shows its damage as cracks, and a broken one is an opening with shards on the floor
  function drawGlass(g, B) {
    B.map.P.doors.forEach(d => {
      if (d.kind !== 'window') return;
      const a = [d.m[0] - d.e[0] * d.gw / 2, d.m[1] - d.e[1] * d.gw / 2], z = [d.m[0] + d.e[0] * d.gw / 2, d.m[1] + d.e[1] * d.gw / 2], n = [-d.e[1], d.e[0]];
      g.lineCap = 'butt';
      if (d.broken) { g.fillStyle = '#8fd0ee'; for (let i = 0; i < 9; i++) { const t = (i * .37 + .1) % 1, k = ((i * 7) % 5 - 2) * 4; g.fillRect(a[0] + (z[0] - a[0]) * t + n[0] * k - 2, a[1] + (z[1] - a[1]) * t + n[1] * k - 2, 4, 3); } return; }
      const hit = B.t - (d.hitT || -9) < .15; g.strokeStyle = hit ? '#fff' : '#8fd0ee'; g.lineWidth = 7; g.beginPath(); g.moveTo(...a); g.lineTo(...z); g.stroke();
      g.strokeStyle = PLAN.INK; g.lineWidth = 1.2; [-3.5, 3.5].forEach(k => { g.beginPath(); g.moveTo(a[0] + n[0] * k, a[1] + n[1] * k); g.lineTo(z[0] + n[0] * k, z[1] + n[1] * k); g.stroke(); });
      const cracks = Math.round((1 - d.hp / 40) * 5); for (let i = 0; i < cracks; i++) { const t = (i * .29 + .15) % 1, p = [a[0] + (z[0] - a[0]) * t, a[1] + (z[1] - a[1]) * t]; g.beginPath(); g.moveTo(p[0] - n[0] * 4 - d.e[0] * 3, p[1] - n[1] * 4 - d.e[1] * 3); g.lineTo(p[0], p[1]); g.lineTo(p[0] + n[0] * 4 - d.e[0] * 2, p[1] + n[1] * 4 - d.e[1] * 2); g.stroke(); }
    });
  }
  function drawHaz(g, B) {
    B.haz.forEach(h => {
      if (h.type === 'crush') {
        const d = h.d, k = h.k || 0, n = [-d.e[1], d.e[0]], half = d.gw / 2;
        if (h.warn && Math.floor(B.t * 10) % 2) { g.strokeStyle = C.red; g.lineWidth = 3; g.beginPath(); g.arc(d.m[0], d.m[1], half + 6, 0, TAU); g.stroke(); }
        [-1, 1].forEach(s => { const a = [d.m[0] + d.e[0] * half * s, d.m[1] + d.e[1] * half * s], z = [d.m[0] + d.e[0] * half * s * (1 - (d.shut ? 1 : k * .55)), d.m[1] + d.e[1] * half * s * (1 - (d.shut ? 1 : k * .55))]; g.strokeStyle = '#3a4160'; g.lineWidth = 13; g.lineCap = 'butt'; g.beginPath(); g.moveTo(...a); g.lineTo(...z); g.stroke(); g.strokeStyle = C.gold; g.lineWidth = 3; g.beginPath(); g.moveTo(a[0] + n[0] * 3, a[1] + n[1] * 3); g.lineTo(z[0] + n[0] * 3, z[1] + n[1] * 3); g.stroke(); });
      } else if (h.type === 'patrol') {
        g.save(); g.translate(h.x, h.y); g.fillStyle = '#3a4160'; g.strokeStyle = PLAN.INK; g.lineWidth = 2; g.beginPath(); g.roundRect(-h.r - 3, -h.r + 2, h.r * 2 + 6, h.r * 2 - 4, 6); g.fill(); g.stroke();
        g.fillStyle = C.gold; for (let i = -1; i <= 1; i++) g.fillRect(i * 13 - 3, -h.r + 2, 6, h.r * 2 - 4); g.fillStyle = C.red; g.beginPath(); g.arc(0, 0, 5, 0, TAU); g.fill(); g.restore();
      } else if (h.type === 'rotor') {
        g.save(); const len = h.cur || h.len; g.translate(h.x, h.y); g.rotate(h.ang || 0); g.strokeStyle = '#3a4160'; g.lineWidth = 8; g.lineCap = 'round'; g.beginPath(); g.moveTo(-len, 0); g.lineTo(len, 0); g.stroke();
        g.strokeStyle = C.red; g.beginPath(); g.moveTo(-len, 0); g.lineTo(-len + 16, 0); g.moveTo(len, 0); g.lineTo(len - 16, 0); g.stroke(); g.restore();
        g.fillStyle = C.gold; g.strokeStyle = PLAN.INK; g.lineWidth = 2.5; g.beginPath(); g.arc(h.x, h.y, 11, 0, TAU); g.fill(); g.stroke();
      } else if (h.type === 'jet') {
        if (h.warn) { g.strokeStyle = C.red; g.lineWidth = 2 + 5 * (h.k || 0); g.setLineDash([5, 5]); g.beginPath(); g.moveTo(...h.a); g.lineTo(...h.b); g.stroke(); g.setLineDash([]); }
        if (h.live) { const L = Math.hypot(h.b[0] - h.a[0], h.b[1] - h.a[1]); for (let k = 0; k <= L; k += 9) { const f = .5 + .5 * Math.sin(B.t * 31 + k * 1.7), x = h.a[0] + (h.b[0] - h.a[0]) * k / L, y = h.a[1] + (h.b[1] - h.a[1]) * k / L; g.fillStyle = `rgba(255,${138 + Math.round(70 * f)},42,.75)`; g.beginPath(); g.arc(x, y, h.w * (.55 + .4 * f), 0, TAU); g.fill(); } }
      } else if (h.type === 'roll') {
        if (h.warn && Math.floor(B.t * 10) % 2) { g.strokeStyle = C.red; g.lineWidth = 3; g.beginPath(); g.arc(h.a[0], h.a[1], h.r + 8, 0, TAU); g.stroke(); }
        if (h.on) { const im = tok('props/rock'); g.fillStyle = 'rgba(28,36,80,.2)'; g.beginPath(); g.arc(h.x + 3, h.y + 4, h.r, 0, TAU); g.fill(); if (im) stampTok(g, im, h.x, h.y, B.t * 6, h.r / 34, h.r / 34); else { g.fillStyle = '#8a8274'; g.beginPath(); g.arc(h.x, h.y, h.r, 0, TAU); g.fill(); } }
      } else if (h.type === 'erupt') {
        (h.spots || []).forEach(p => { g.strokeStyle = C.red; g.lineWidth = 2.5; g.beginPath(); g.arc(p.x, p.y, h.r, 0, TAU); g.stroke(); g.fillStyle = 'rgba(229,50,45,.16)'; g.beginPath(); g.arc(p.x, p.y, h.r * p.k, 0, TAU); g.fill(); const bx = h.x + (p.x - h.x) * p.k, by = h.y + (p.y - h.y) * p.k - Math.sin(p.k * Math.PI) * 30; g.fillStyle = '#ff8a2a'; g.beginPath(); g.arc(bx, by, 6, 0, TAU); g.fill(); });
      } else if (h.type === 'collapse') {
        if (h.safe < h.R - 3) { g.save(); g.fillStyle = 'rgba(30,96,140,.45)'; g.beginPath(); g.arc(h.x, h.y, h.R, 0, TAU); g.arc(h.x, h.y, h.safe, 0, TAU, true); g.fill('evenodd'); g.strokeStyle = '#fffaf0'; g.lineWidth = 2; g.beginPath(); g.arc(h.x, h.y, h.safe, B.t * 3, B.t * 3 + 5); g.stroke(); g.restore(); }
      } else if (h.type === 'trench') {
        if (h.sm) for (let i = Math.max(0, Math.floor(h.head - h.burn)); i < Math.min(h.sm.length, h.head + 5); i++) { const z = h.sm[i], lit = i <= h.head, f = .5 + .5 * Math.sin(B.t * 29 + i * 1.9); if (lit) { g.fillStyle = `rgba(255,${130 + Math.round(80 * f)},42,.8)`; g.beginPath(); g.arc(z.x, z.y, h.w * (.5 + .35 * f), 0, TAU); g.fill(); } else { g.fillStyle = 'rgba(229,50,45,.35)'; g.beginPath(); g.arc(z.x, z.y, 5, 0, TAU); g.fill(); } }
      } else if (h.type === 'hop') {
        const up = Math.sin((h.k || 0) * Math.PI) * 34; if (h.k > .3) { g.strokeStyle = C.red; g.lineWidth = 2.5; g.beginPath(); g.arc(h.to[0], h.to[1], h.r, 0, TAU); g.stroke(); }
        g.fillStyle = 'rgba(28,36,80,.2)'; g.beginPath(); g.ellipse(h.x, h.y, 13 - up * .15, 7 - up * .08, 0, 0, TAU); g.fill(); g.fillStyle = '#5fbf4a'; g.strokeStyle = '#3a8a2c'; g.lineWidth = 2; g.beginPath(); g.arc(h.x, h.y - up, 12, 0, TAU); g.fill(); g.stroke();
      } else if (h.type === 'bounce') {
        g.fillStyle = 'rgba(28,36,80,.2)'; g.beginPath(); g.arc(h.x + 3, h.y + 4, h.r, 0, TAU); g.fill(); g.fillStyle = '#a3a9c0'; g.strokeStyle = '#62688a'; g.lineWidth = 2.5; g.beginPath(); g.arc(h.x, h.y, h.r, 0, TAU); g.fill(); g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.arc(h.x - h.r * .3, h.y - h.r * .3, h.r * .25, 0, TAU); g.fill();
      } else if (h.type === 'leash') {
        const px = h.px ?? h.x, py = h.py ?? h.y; g.strokeStyle = '#4a4f6b'; g.lineWidth = 2.5; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(h.x, h.y); g.lineTo(px, py); g.stroke(); g.setLineDash([]);
        g.fillStyle = C.red; g.beginPath(); g.arc(px, py, 12, 0, TAU); g.fill(); const im = tok('tokens/neutral-creature'); if (im) stampTok(g, im, px, py, 0, .22, .22);
      } else if (h.type === 'barrel') {
        if (h.state === 'gone') { g.fillStyle = 'rgba(40,30,30,.22)'; g.beginPath(); g.arc(h.x, h.y, 13, 0, TAU); g.fill(); return; }
        if (h.state === 'fuse') { g.strokeStyle = C.red; g.lineWidth = 3; g.beginPath(); g.arc(h.x, h.y, h.r, 0, TAU); g.stroke(); g.fillStyle = 'rgba(229,50,45,.14)'; g.fill(); }
        const im = tok('props/barrel'); if (im) stampTok(g, im, h.x, h.y, 0, .3, .3); else { g.fillStyle = '#9a6434'; g.beginPath(); g.arc(h.x, h.y, 11, 0, TAU); g.fill(); }
      }
    });
  }
  function drawBattle(g, B, sel, heat) {
    T.use(g); base(g, B.map);
    drawGlass(g, B); drawHaz(g, B);
    if (B.opt.midShut) { const d = B.midDoor; g.strokeStyle = PLAN.INK; g.lineWidth = 9; g.lineCap = 'butt'; g.beginPath(); g.moveTo(d.m[0] - d.e[0] * d.gw / 2, d.m[1] - d.e[1] * d.gw / 2); g.lineTo(d.m[0] + d.e[0] * d.gw / 2, d.m[1] + d.e[1] * d.gw / 2); g.stroke(); }
    labels(g, B.map);
    // death map: one dot where each unit fell, in the colour of the squad that lost it
    if (heat) { g.save(); g.globalAlpha = .42; B.deaths.forEach(k => { g.fillStyle = TEAM[k.team].col; g.beginPath(); g.arc(k.x, k.y, 6, 0, TAU); g.fill(); }); g.restore(); }
    const tel = (n, team) => tok(`telegraphs/${n}-${TEAM[team].tel}`, 256);
    // ground layer: bubbles, telegraphs
    B.units.forEach(u => { if (u.alive && u.def.bubble && !(u.st.stun > 0)) { const r = u.def.bubble, a = B.t - (u.soakT || -9) < .25 ? .6 : .32; stampTok(g, tel('circle', u.team), u.x, u.y, 0, r / 46, r / 46, 50, 50, a); stampTok(g, tel('ring', u.team), u.x, u.y, 0, r / 45, r / 45, 50, 50, .55); } });
    // circles about to go off: the grenade's landing spot, the mech's stomp
    B.zones.forEach(z => { const k = 1 - z.t / z.t0; if (z.kind === 'grenade') stampTok(g, tel('target-circle', z.team), z.x, z.y, 0, z.r / 46, z.r / 46, 50, 50, .5 + .5 * k); else { stampTok(g, tel('circle', z.team), z.x, z.y, 0, z.r / 46 * k, z.r / 46 * k, 50, 50, .7); stampTok(g, tel('ring', z.team), z.x, z.y, 0, z.r / 45, z.r / 45, 50, 50, .9); } });
    B.fx.forEach(f => {
      const k = f.age / f.ttl, a = 1 - k;
      if (f.type === 'cone') stampTok(g, tel('cone', f.team), f.x, f.y, f.ang + Math.PI / 2, f.r / 92, f.r / 92, 50, 96, a * .8);
      else if (f.type === 'ring') { const r = f.r * (.4 + .6 * k); stampTok(g, tel('ring', f.team), f.x, f.y, 0, r / 45, r / 45, 50, 50, a); }
      else if (f.type === 'ping') { const r = f.r * (.5 + .5 * k); stampTok(g, tel('target-circle', f.team), f.x, f.y, 0, r / 46, r / 46, 50, 50, a); }
      else if (f.type === 'dash') { const L = Math.hypot(f.x2 - f.x, f.y2 - f.y); stampTok(g, tok(`arrows/charge-${TEAM[f.team].tel}`), f.x, f.y, Math.atan2(f.y2 - f.y, f.x2 - f.x) + Math.PI / 2, .3, L / 92, 50, 96, a); }
      else if (f.type === 'leap') { const L = Math.hypot(f.x2 - f.x, f.y2 - f.y) / 74; stampTok(g, tok(`arrows/leap-${TEAM[f.team].tel}`), f.x, f.y, Math.atan2(f.y2 - f.y, f.x2 - f.x) - .11, L, L * .7, 12, 88, a); }
      else if (f.type === 'blink') { [[f.x, f.y], [f.x2, f.y2]].forEach(p => stampTok(g, tok('props/vortex'), p[0], p[1], k * 5, .34, .34, 50, 50, a)); g.save(); g.globalAlpha = a * .7; g.setLineDash([4, 7]); g.strokeStyle = TEAM[f.team].col; g.lineWidth = 2.5; g.beginPath(); g.moveTo(f.x, f.y); g.lineTo(f.x2, f.y2); g.stroke(); g.restore(); }
    });
    // units
    B.units.forEach(u => {
      if (!u.alive) return;
      const d = u.def, r = 12 * (d.size || 1), ghost = B.cloaked(u) ? .32 : 1;
      if (u.aim) { const e = u.aim.lock || u.aim.tgt, L = Math.hypot(e.x - u.x, e.y - u.y) + (u.aim.lock ? 40 : 0), k = 1 - u.aim.t / u.aim.t0; stampTok(g, tel('line', u.team), u.x, u.y, Math.atan2(e.y - u.y, e.x - u.x) + Math.PI / 2, u.aim.lock ? .26 : .08 + .08 * k, L / 96, 50, 98, u.aim.lock ? .95 : .3 + .3 * k); }
      if (u.chan) { const e = u.chan.tgt, k = 1 - u.chan.t / u.chan.t0; g.save(); g.globalAlpha = .35 + .6 * k; g.strokeStyle = TEAM[u.team].col; g.lineWidth = 2 + 4 * k; g.setLineDash([3, 6]); g.beginPath(); g.moveTo(u.x, u.y); g.lineTo(e.x, e.y); g.stroke(); g.restore(); stampTok(g, tok('status/channeling', 64), u.x - 13, u.y - 13, 0, .13, .13); }
      if (B.t - (u.beamT || -9) < .12 && u.beamTo && u.beamTo.alive) { const e = u.beamTo; g.save(); g.strokeStyle = '#2fb36a'; g.lineWidth = 4; g.setLineDash([6, 5]); g.lineDashOffset = -B.t * 40; g.beginPath(); g.moveTo(u.x, u.y); g.lineTo(e.x, e.y); g.stroke(); g.restore(); stampTok(g, tok('status/heal', 64), e.x - 13, e.y - 13, 0, .13, .13); }
      if (u === sel) { g.strokeStyle = C.gold; g.lineWidth = 3; g.beginPath(); g.arc(u.x, u.y, r + 8, 0, TAU); g.stroke(); }
      drawUnit(g, d, u.x, u.y, r, ghost);
      if (d.block) {   // the shield arc shrinks with its stamina; a dropped shield is a thin red dashed arc
        const k = u.sh / d.block; g.lineCap = 'round';
        if (u.broken) { g.save(); g.setLineDash([3, 5]); g.strokeStyle = C.red; g.lineWidth = 2; g.beginPath(); g.arc(u.x, u.y, r + 6, u.face - 1.0, u.face + 1.0); g.stroke(); g.restore(); }
        else { g.strokeStyle = 'rgba(29,36,51,.25)'; g.lineWidth = 4; g.beginPath(); g.arc(u.x, u.y, r + 6, u.face - 1.0, u.face + 1.0); g.stroke(); g.strokeStyle = B.t - (u.blockT || -9) < .2 ? '#fff' : '#1d2433'; g.beginPath(); g.arc(u.x, u.y, r + 6, u.face - k, u.face + k); g.stroke(); }
      }
      if (d.key === 'xeno-swarm') for (let i = 0; i < 4; i++) { const a = B.t * 3 + i * TAU / 4; g.fillStyle = '#4b2e63'; g.beginPath(); g.arc(u.x + Math.cos(a) * (r + 7), u.y + Math.sin(a) * (r + 7), 3.2, 0, TAU); g.fill(); }
      // health bar and status badges
      const w = 26 * (d.size || 1), hp = clamp(u.hp / u.hpMax); g.globalAlpha = ghost;
      g.fillStyle = '#1d2433'; g.fillRect(u.x - w / 2 - 1, u.y - r - 11, w + 2, 5); g.fillStyle = TEAM[u.team].col; g.fillRect(u.x - w / 2, u.y - r - 10, w * hp, 3); g.globalAlpha = 1;
      if (d.block) { g.fillStyle = '#1d2433'; g.fillRect(u.x - w / 2 - 1, u.y - r - 15, w + 2, 4); g.fillStyle = u.broken ? C.red : C.gold; g.fillRect(u.x - w / 2, u.y - r - 14, w * u.sh / d.block, 2); }   // shield stamina
      let n = 0; BADGE.forEach(([k, icon]) => { if (u.st[k] > 0 && n < 3) { stampTok(g, tok('status/' + icon, 64), u.x + r + 2 - n * 13, u.y + r + 1, 0, .13, .13, 50, 50, ghost); n++; } });
    });
    // shots in flight
    B.shots.forEach(s => {
      if (s.type === 'bolt') stampTok(g, tel('projectile', s.team), s.x, s.y, s.ang + Math.PI / 2, s.big ? .24 : .13, s.big ? .3 : .17, 50, 20);
      else if (s.type === 'rocket') { stampTok(g, tel('projectile', s.team), s.x, s.y, s.ang + Math.PI / 2, .2, .3, 50, 20); g.fillStyle = '#1d2433'; g.beginPath(); g.arc(s.x, s.y, 4, 0, TAU); g.fill(); }
      else if (s.type === 'grenade') { const h = Math.sin(s.k * Math.PI) * 26; stampTok(g, tok('props/bomb'), s.x, s.y - h, s.k * 6, .2, .2); }
      else if (s.type === 'dog') { g.fillStyle = TEAM[s.team].col; g.beginPath(); g.arc(s.x, s.y, 9, 0, TAU); g.fill(); stampTok(g, tok('tokens/neutral-creature'), s.x, s.y, 0, .18, .18); }
      else if (s.type === 'drone') { g.save(); g.translate(s.x, s.y); g.rotate(B.t * 2); g.strokeStyle = '#1d2433'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(-8, -8); g.lineTo(8, 8); g.moveTo(8, -8); g.lineTo(-8, 8); g.stroke(); g.fillStyle = TEAM[s.team].col; [[-8, -8], [8, 8], [8, -8], [-8, 8]].forEach(p => { g.beginPath(); g.arc(p[0], p[1], 4, 0, TAU); g.fill(); }); g.fillStyle = '#1d2433'; g.fillRect(-4, -4, 8, 8); g.restore(); }
    });
    B.fx.forEach(f => {
      const k = f.age / f.ttl, a = 1 - k;
      if (f.type === 'tracer') { g.save(); g.globalAlpha = a * (f.weak ? .3 : .55); g.strokeStyle = TEAM[f.team].col; g.lineWidth = 1.3;   /* rifle fire is the background: thin, so the powers read over it */ g.beginPath(); g.moveTo(f.x, f.y); g.lineTo(f.x2, f.y2); g.stroke(); g.restore(); }
      else if (f.type === 'rail') { const L = Math.hypot(f.x2 - f.x, f.y2 - f.y); stampTok(g, tel('line', f.team), f.x, f.y, Math.atan2(f.y2 - f.y, f.x2 - f.x) + Math.PI / 2, .16 * a + .04, L / 96, 50, 98, a); g.save(); g.globalAlpha = a; g.strokeStyle = TEAM[f.team].col; g.lineWidth = 3; g.beginPath(); g.moveTo(f.x, f.y); g.lineTo(f.x2, f.y2); g.stroke(); g.restore(); }
      else if (f.type === 'arc') { const L = Math.hypot(f.x2 - f.x, f.y2 - f.y); g.save(); g.translate((f.x + f.x2) / 2, (f.y + f.y2) / 2); g.rotate(Math.atan2(f.y2 - f.y, f.x2 - f.x) + Math.PI / 2 - .34); g.globalAlpha = a; const im = tel('lightning', f.team), kk = L / 97; if (im) g.drawImage(im, -50 * kk * .5, -50 * kk, 100 * kk * .5, 100 * kk); g.restore(); }
      else if (f.type === 'burst') stampTok(g, tel('burst', f.team), f.x, f.y, k, f.r / 46 * (.5 + .5 * k), f.r / 46 * (.5 + .5 * k), 50, 50, a);
      else if (f.type === 'boom') { g.save(); g.globalAlpha = a * .8; g.fillStyle = '#ff8a2a'; g.beginPath(); g.arc(f.x, f.y, f.r * (.4 + .6 * k), 0, TAU); g.fill(); g.fillStyle = '#ffe08a'; g.beginPath(); g.arc(f.x, f.y, f.r * .5 * (1 - k), 0, TAU); g.fill(); g.restore(); }
      else if (f.type === 'emote') { if (f.of.alive) { const pop = Math.min(1, f.age / .18), up = 30 + 6 * Math.sin(f.age * 7); g.save(); g.globalAlpha = Math.min(1, a * 3); g.font = `${Math.round(22 * pop)}px 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fffaf0'; g.strokeStyle = C.ink; g.lineWidth = 1.5; g.beginPath(); g.arc(f.of.x, f.of.y - up, 15 * pop, 0, TAU); g.fill(); g.stroke(); g.fillStyle = C.ink; g.fillText(f.text, f.of.x, f.of.y - up + 1); g.restore(); } }
      else if (f.type === 'shatter') { g.save(); g.globalAlpha = a; g.fillStyle = '#bfe6f7'; for (let i = 0; i < 10; i++) { const an = i * .63, r = 8 + 26 * k; g.fillRect(f.x + Math.cos(an) * r - 2, f.y + Math.sin(an) * r - 2, 4, 4); } g.restore(); }
      else if (f.type === 'slash') stampTok(g, tel('burst', f.team), f.x, f.y, 0, .22, .22, 50, 50, a);
      else if (f.type === 'dead') stampTok(g, tok('status/dead', 64), f.x, f.y - k * 10, 0, .22, .22, 50, 50, Math.min(1, a * 2));
      else if (f.type === 'text' && f.team != null) { g.save(); g.globalAlpha = Math.max(0, a); g.font = '700 13px Montserrat, Jost, sans-serif'; g.textAlign = 'center'; g.lineWidth = 4; g.strokeStyle = '#fffaf0'; g.strokeText(f.text, f.x, f.y - k * 12); g.fillStyle = TEAM[f.team].col; g.fillText(f.text, f.x, f.y - k * 12); g.restore(); }   // a favoured hit, named in the squad's colour
      else if (f.type === 'text') { g.save(); g.globalAlpha = Math.max(0, a); g.font = '700 12px Montserrat, Jost, sans-serif'; g.textAlign = 'center'; g.lineWidth = 3.5; g.strokeStyle = '#fffaf0'; g.strokeText(f.text, f.x, f.y - k * 12); g.fillStyle = C.ink; g.fillText(f.text, f.x, f.y - k * 12); g.restore(); }
    });
    // score strip along the top edge, kill feed along the bottom edge
    const sc = B.score, bw = 300;
    [0, 1].forEach(t => { const x = t ? W / 2 + 40 : W / 2 - 40 - bw; g.fillStyle = 'rgba(28,36,80,.12)'; g.fillRect(x, 12, bw, 16); g.fillStyle = TEAM[t].col; const f = bw * Math.min(1, sc[t] / B.goal); g.fillRect(t ? x : x + bw - f, 12, f, 16); T.label(`${TEAM[t].name} ${sc[t]}`, t ? x + bw + 14 : x - 14, 20, t ? 'left' : 'right', TEAM[t].col, 17); });
    T.label(`to ${B.goal}`, W / 2, 20, 'center', C.muted, 14);
    const f0 = B.feed[0]; if (f0 && B.t - f0.t < 3) { const a = B.units[f0.k], v = B.units[f0.v], cap = s => s[0].toUpperCase() + s.slice(1); T.label(f0.hz ? (a ? `${a.def.name} got ${v.def.name} with ${f0.hz}` : `${cap(f0.hz)} took out ${v.def.name}`) : `${a.def.name} took out ${v.def.name}`, W / 2, 566, 'center', a ? TEAM[a.team].col : C.redDk, 15); }
    if (B.over) { g.fillStyle = 'rgba(255,252,244,.6)'; g.fillRect(0, 0, W, H); T.stamp(`${TEAM[B.winner].name} squad wins ${sc[B.winner]} to ${sc[1 - B.winner]}`, W / 2, H / 2 - 20, TEAM[B.winner].col, 1, 40); const mvp = [...B.units].sort((a, b) => b.kills - a.kills)[0]; T.label(`Most kills: ${mvp.def.name}, ${mvp.kills}. Battle length ${Math.floor(B.t / 60)}:${String(Math.floor(B.t % 60)).padStart(2, '0')}.`, W / 2, H / 2 + 44, 'center', C.ink, 18); }
  }

  canvasDemo('fps-battle', (s, cv, g) => {
    let seed = 1, B, speed = 2, run = true, sel = null, acc = 0, shown = '', heat = false, fp = false, walls = [], follow = '';
    const cam = { ang: 0, x: 0, y: 0 };
    const out = $(s, '.fb-out'), board = $(s, '.fb-script'), bench = $(s, '.fb-bench'), who = $(s, '.fb-follow');
    const opts = ROSTER.map(u => `<option value="${u.key}">${TEAM[u.team].name}: ${u.name}</option>`).join('');
    bench.innerHTML = '<option value="">nobody</option>' + opts; who.innerHTML = '<option value="">nobody</option>' + opts;
    const pick = key => { follow = key || ''; sel = B.units.find(u => u.def.key === follow) || null; who.value = sel ? follow : ''; if (sel) cam.ang = sel.face; shown = ''; };
    // a lever restarts the same battle (same seed) with one thing changed, so the two runs can be compared
    const fresh = keep => {
      if (!keep) seed++;
      B = FPSSIM.create(MAP, { seed, goal: 100, swap: $(s, '.fb-swap').checked, midShut: $(s, '.fb-shut').checked, bench: bench.value ? [bench.value] : [] });
      walls = FPV.walls(MAP.P, B.opt.midShut ? B.midDoor : null); run = true; pick(follow); sync();
    };
    const sync = () => { $(s, '.fb-play').textContent = run ? '⏸ Pause' : '▶ Play'; $$(s, '.fb-speed .btn').forEach(b => b.classList.toggle('on', +b.dataset.v === speed)); };
    $(s, '.fb-play').onclick = () => { if (B.over) fresh(); else { run = !run; sync(); } };
    $(s, '.fb-new').onclick = () => fresh();
    $(s, '.fb-end').onclick = () => { let n = 0; while (!B.over && n++ < 200000) B.step(1 / 30); };
    $$(s, '.fb-speed .btn').forEach(b => b.onclick = () => { speed = +b.dataset.v; sync(); });
    [$(s, '.fb-swap'), $(s, '.fb-shut'), bench].forEach(el => el.onchange = () => fresh(true));
    $(s, '.fb-heat').onchange = e => { heat = e.target.checked; };
    who.onchange = () => pick(who.value);
    // first person needs someone to follow: with nobody picked it takes the marksman, whose lane shows the map best
    $(s, '.fb-fp').onchange = e => { fp = e.target.checked; if (fp && !sel) pick('marksman'); if (fp && speed > 2) { speed = 1; sync(); } };
    cv.addEventListener('click', e => { if (fp) return; const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * W / r.width, y = (e.clientY - r.top) * H / r.height; let best = null, bd = 30; B.units.forEach(u => { const d = Math.hypot(u.x - x, u.y - y); if (u.alive && d < bd) { bd = d; best = u; } }); pick(best ? best.def.key : ''); });
    fresh(true);
    window.__fps = { get B() { return B; }, set speed(v) { speed = v; sync(); }, pause() { run = false; sync(); }, pick, heat: v => { heat = v; $(s, '.fb-heat').checked = v; }, fp: v => { fp = v; $(s, '.fb-fp').checked = v; if (v && !sel) pick('marksman'); } };
    return dt => {
      if (run) { acc += Math.min(dt, .1) * speed; while (acc >= 1 / 60) { B.step(1 / 60); acc -= 1 / 60; } }
      if (B.over && run) { run = false; sync(); }
      if (fp && sel && sel.alive && !B.over) {
        T.use(g); g.clearRect(0, 0, W, H); g.save(); g.beginPath(); g.roundRect(0, 0, W, H, 14); g.clip();
        const warn = FPV.draw(g, B, sel, cam, { W, H, walls, plan, drawUnit, tok, TEAM, BADGE, dt: Math.min(dt, .1), props: FPSTHEME.props(MAP), flats: FPSTHEME.flats(MAP), rooms: MAP.P.rooms });
        FPV.mini(g, B, sel, { W, H, TEAM, plan }, W - 272, 14, .25);
        // head-up display: score, who you are, health, and whether this is your moment
        T.label(`${TEAM[0].name} ${B.score[0]}`, 18, 24, 'left', TEAM[0].col, 17); T.label(`${TEAM[1].name} ${B.score[1]}`, 150, 24, 'left', TEAM[1].col, 17);
        const hp = clamp(sel.hp / sel.hpMax), inEdge = B.t - (sel.edgeT || -9) < 1.2, E = FPSSIM.EDGE[sel.def.key];
        T.label(`${sel.def.name} · ${sel.kills} kills, ${sel.deaths} deaths`, 18, H - 58, 'left', TEAM[sel.team].col, 17);
        g.fillStyle = '#1d2433'; g.fillRect(18, H - 40, 264, 14); g.fillStyle = TEAM[sel.team].col; g.fillRect(20, H - 38, 260 * hp, 10);
        if (sel.def.block) { g.fillStyle = '#1d2433'; g.fillRect(18, H - 48, 264, 8); g.fillStyle = sel.broken ? C.red : C.gold; g.fillRect(20, H - 46, 260 * sel.sh / sel.def.block, 4); }   // shield stamina
        if (E) T.label(inEdge ? `In its moment: ${E[0]}` : `Favoured moment: ${E[0]}`, 18, H - 14, 'left', inEdge ? C.goldInk : C.muted, 15, inEdge ? '#fde9b8' : 'rgba(255,252,244,.9)');
        let n = 0; BADGE.forEach(([k, icon]) => { if (sel.st[k] > 0 && n < 5) { stampTok(g, tok('status/' + icon, 64), 306 + n * 30, H - 33, 0, .26, .26); n++; } });
        if (warn) T.stamp(warn, W / 2, 74, C.redDk, 1, 20);
        g.restore();
      } else {
        drawBattle(g, B, sel, heat || B.over);
        if (fp && sel && !sel.alive && !B.over) T.stamp(sel.dead > 1e6 ? `${sel.def.name} is down: back when the rest of its pack falls` : `${sel.def.name} is down: back in ${Math.max(0, sel.dead).toFixed(1)} s`, W / 2, 70, TEAM[sel.team].col, 1, 22);
      }
      // the side panel only rewrites when its text changes
      const sc = B.script(), wait = sc.n < 10;
      const rows = B.lines.map(([k, name, unit]) => `<tr class="${wait ? '' : sc[k][1] ? 'met' : 'miss'}"><td>${wait ? '·' : sc[k][1] ? '✓' : '✗'}</td><td>${name}<small>${wait ? 'measuring…' : `${sc[k][0]} ${k === 'mid' && B.opt.midShut ? '' : unit}`}</small></td></tr>`).join('');
      const E = sel && FPSSIM.EDGE[sel.def.key], share = sel && sel.dealt ? Math.round((sel.dealtFav || 0) / sel.dealt * 100) : 0;
      const txt = sel ? `<b style="color:${TEAM[sel.team].col}">${sel.def.name}</b> · ${sel.kills} kills, ${sel.deaths} deaths · ${laneName[sel.lane]}<br>${E ? `<b>Hits about twice as hard</b> ${E[1]}. ${share}% of its damage so far came from that moment.` : sel.def.does}` : 'Change one thing and the same battle restarts. Click a token to follow it. A faded sci-fi token is cloaked.';
      const key = rows + txt; if (key !== shown) { shown = key; say(board, rows); say(out, txt); }
    };
  });

  /* ---------- 4. three lopsided maps ---------- */
  canvasDemo('fps-maps', (s, cv, g) => {
    const built = {}, uname = Object.fromEntries(ROSTER.map(u => [u.key, u.name]));
    let key = FPSMAPS[0].key, map, seed = 1, B, speed = 4, run = true, acc = 0, shown = '', pickF = -1, t = 0;
    const out = $(s, '.fx-out'), feat = $(s, '.fx-feat'), board = $(s, '.fx-script'), seg = $(s, '.fx-map');
    seg.innerHTML = FPSMAPS.map(m => `<button class="btn" data-k="${m.key}">${m.name}</button>`).join('');
    const sync = () => { $(s, '.fx-play').textContent = run ? '⏸ Pause' : '▶ Play'; $$(s, '.fx-speed .btn').forEach(b => b.classList.toggle('on', +b.dataset.v === speed)); $$(seg, '.btn').forEach(b => b.classList.toggle('on', b.dataset.k === key)); };
    const fresh = keep => { if (!keep) seed++; map = built[key] = built[key] || FPSMAPS.find(m => m.key === key).build(); B = FPSSIM.create(map, { seed, goal: 100, swap: $(s, '.fx-swap').checked }); run = true; shown = ''; sync(); };
    $$(seg, '.btn').forEach(b => b.onclick = () => { key = b.dataset.k; pickF = -1; fresh(true); });
    $(s, '.fx-play').onclick = () => { if (B.over) fresh(); else { run = !run; sync(); } };
    $(s, '.fx-new').onclick = () => fresh();
    $(s, '.fx-end').onclick = () => { let n = 0; while (!B.over && n++ < 200000) B.step(1 / 30); };
    $$(s, '.fx-speed .btn').forEach(b => b.onclick = () => { speed = +b.dataset.v; sync(); });
    $(s, '.fx-swap').onchange = () => fresh(true);
    feat.addEventListener('click', e => { const tr = e.target.closest('tr'); if (tr) { pickF = pickF === +tr.dataset.i ? -1 : +tr.dataset.i; shown = ''; } });
    fresh(true);
    window.__fpsMaps = { get B() { return B; }, map: k => { key = k; pickF = -1; fresh(true); }, pause() { run = false; sync(); }, feature: i => { pickF = i; shown = ''; }, swap: v => { $(s, '.fx-swap').checked = v; fresh(true); }, set speed(v) { speed = v; sync(); } };
    const fmt = v => v >= 1000 ? (v / 1000).toFixed(1) + 'k' : String(Math.round(v)), names = (top, n = 2) => top.slice(0, n).map(([k]) => uname[k]).join(', ');
    return dt => {
      t += dt;
      if (run) { acc += Math.min(dt, .1) * speed; while (acc >= 1 / 60) { B.step(1 / 60); acc -= 1 / 60; } }
      if (B.over && run) { run = false; sync(); }
      drawBattle(g, B, null, B.over);
      // numbered badges on the features; the picked one gets a ring
      const F = B.features();
      g.save(); F.forEach((f, i) => {
        const [x, y] = f.at, on = i === pickF;
        if (on) { g.strokeStyle = C.gold; g.lineWidth = 4; g.beginPath(); g.arc(x, y, 34 + 4 * Math.sin(t * 5), 0, TAU); g.stroke(); }
        g.fillStyle = on ? C.gold : '#fffaf0'; g.strokeStyle = C.goldInk; g.lineWidth = 2.5; g.beginPath(); g.arc(x, y - 22, 11, 0, TAU); g.fill(); g.stroke();
        g.fillStyle = C.goldInk; g.font = '800 13px Montserrat, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(i + 1, x, y - 21.5);
      }); g.restore();
      const rowsF = F.map((f, i) => {
        const who = f.hz ? [f.top.length ? `set up by ${names(f.top)}` : '', f.caught && f.caught.length ? `hit most: ${names(f.caught, 1)}` : ''].filter(Boolean).join(' · ') : names(f.top, 3);
        const val = f.hz ? `${fmt(f.val)} damage, ${f.deaths} ${f.deaths === 1 ? 'death' : 'deaths'}` : `${fmt(f.val)} ${f.unit}`;
        if (F.length > 6) return `<tr data-i="${i}" class="${f.met ? 'met' : ''}${i === pickF ? ' on' : ''}"><td>${i + 1}</td><td>${f.name}${f.pattern ? ` <i>${f.pattern}</i>` : ''} <span>${f.hz ? `${fmt(f.val)} dmg · ${f.deaths}☠` : `${fmt(f.val)}`}</span></td></tr>`;
        return `<tr data-i="${i}" class="${f.met ? 'met' : ''}${i === pickF ? ' on' : ''}"><td>${i + 1}</td><td>${f.name}${f.pattern ? ` <i>${f.pattern}</i>` : ''}<small>${val}${who ? ' · ' + who : ''}</small></td></tr>`;
      }).join('');
      const sc = B.script(), wait = sc.n < 10;
      const rows = B.lines.map(([k, name, unit]) => `<tr class="${wait ? '' : sc[k][1] ? 'met' : 'miss'}" title="${unit}"><td>${wait ? '·' : sc[k][1] ? '✓' : '✗'}</td><td>${name} <span>${wait ? '…' : sc[k][0]}</span></td></tr>`).join('');
      const f = F[pickF], side = B.opt.swap ? 'Sci-fi spawn in the west, Modern in the east.' : 'Modern spawn in the west, Sci-fi in the east.';
      const used = f && f.hz ? ` <b>So far:</b> ${fmt(f.val)} damage and ${f.deaths} ${f.deaths === 1 ? 'death' : 'deaths'}${f.top.length ? `, kills set up by ${names(f.top)}` : ''}${f.caught && f.caught.length ? `; hit most: ${names(f.caught, 2)}` : ''}.` : f && F.length > 6 ? ` <b>So far:</b> ${fmt(f.val)} ${f.unit}${f.top.length ? `, most by ${names(f.top, 3)}` : ''}.` : '';
      const txt = f ? `<b class="accent">${f.name}.</b> ${f.text}${f.who ? ` <b>Built for:</b> ${f.who}.` : ''}${used}` : `<b class="accent">${map.name}.</b> ${map.lopsided} ${side} Click a feature for what it does.`;
      const k2 = rowsF + rows + txt; if (k2 !== shown) { shown = k2; say(feat, rowsF); say(board, rows); say(out, txt); }
    };
  });
})();
