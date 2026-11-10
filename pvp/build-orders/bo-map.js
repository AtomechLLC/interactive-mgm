/* Build Orders: Play it out. Two build orders on one map, simulated side by side by match.js: both economies run,
   armies walk out when their attack plan says so, fight, and kill workers and buildings. Nothing here is scripted:
   change your sandbox build and the game plays out differently.
   Drawn in the style of counter-cycles/openings.js: a 1600 x 480 map in one player's own frame (base on the left),
   the right-hand player mirrored. window.__seekMap(t) shows game second t (for tests and GIFs). */
(function () {
  const { $, $$, canvasDemo, store } = FPF.kit;
  const { T, PRESETS, fmt } = BO;
  const { match, PLANS, PRESET_PLAN } = BOMatch;

  const MW = 1600, MH = 480;
  const YOU = '#c79bff', ALT = '#f2f2f2';
  const BUILDS = ['you', 'rush', 'turtle', 'expand', 'standard'];
  const label = k => k === 'you' ? 'Your build' : PRESETS[k].name.split(':')[0];
  const colOf = k => k === 'you' ? YOU : PRESETS[k].col;
  const fresh = () => JSON.parse(JSON.stringify(PRESETS.standard));
  const buildOf = k => k === 'you' ? (store.get('bo-lab', null) || fresh()) : PRESETS[k];
  const PLAN_KEYS = Object.keys(PLANS);
  const COUNTERS = [['turtle', 'rush', 'Turtle holds Rush'], ['expand', 'turtle', 'Expand outgrows Turtle'], ['rush', 'expand', 'Rush breaks Expand']];

  /* ---------- the map, in a player's own frame ---------- */
  const SITES = [
    { x: 150, y: 240, ang: [135, 225] },   // main, on the high ground
    { x: 520, y: 118, ang: [205, 335] },   // natural
    { x: 520, y: 362, ang: [25, 155] },    // third
    { x: 752, y: 92, ang: [200, 340] },
    { x: 752, y: 388, ang: [20, 160] },
  ];
  const patches = s => Array.from({ length: 8 }, (_, i) => {
    const a = (s.ang[0] + (s.ang[1] - s.ang[0]) * i / 7) * Math.PI / 180;
    return { x: s.x + 96 * Math.cos(a), y: s.y + 96 * Math.sin(a) };
  });
  const PATCH = SITES.map(patches);
  const GEYSER = [{ x: 112, y: 132 }, { x: 112, y: 348 }, { x: 420, y: 118 }, { x: 620, y: 118 }, { x: 420, y: 362 }, { x: 620, y: 362 }, { x: 652, y: 92 }, { x: 652, y: 388 }];
  const grid = (xs, ys) => ys.flatMap(y => xs.map(x => ({ x, y })));
  const SLOT = {
    prod: [...grid([226, 276], [100, 148, 332, 380]), { x: 310, y: 100 }, { x: 310, y: 380 },
      ...grid([668, 714], [100, 150]), ...grid([668, 714], [380, 330]), { x: 460, y: 186 }, { x: 580, y: 186 }, { x: 460, y: 294 }, { x: 580, y: 294 },
      ...grid([420, 470, 520, 570, 620], [30]), ...grid([420, 470, 520, 570, 620], [450])],
    supply: [...grid([190, 216, 242, 268, 294, 320], [70]), ...grid([190, 216, 242, 268, 294, 320], [410]),
      ...Array.from({ length: 13 }, (_, i) => ({ x: 24, y: 76 + i * 27 })), ...grid([680, 706, 732], [24, 456]), ...grid([360, 386], [24, 456])],
    bunker: [{ x: 318, y: 184 }, { x: 318, y: 296 }, { x: 378, y: 150 }, { x: 378, y: 330 }, { x: 560, y: 200 }, { x: 560, y: 280 }, { x: 268, y: 136 }, { x: 268, y: 344 }],
  };
  const KIND = { barracks: 'prod', factory: 'prod', starport: 'prod', supply: 'supply', bunker: 'bunker' };
  const LANE0 = 300, LANE1 = MW - 392, RALLY = { x: 252, y: 240 };

  /* ---------- small helpers ---------- */
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const total = c => Object.values(c).reduce((a, b) => a + b, 0);
  const ORD = ['main', 'second', 'third', 'fourth', 'fifth', 'sixth'];
  // a blob of n units: sunflower spiral, front (largest x) first
  const BLOB = {};
  function blob(n) {
    if (BLOB[n]) return BLOB[n];
    const pts = Array.from({ length: n }, (_, i) => { const a = i * 2.4, d = 11 * Math.sqrt(i + .5); return { x: Math.cos(a) * d, y: Math.sin(a) * d * .9 }; });
    return (BLOB[n] = pts.sort((p, q) => q.x - p.x));
  }
  const UNIT_ORDER = ['soldier', 'ranger', 'raider', 'gunship', 'tank'];
  const unitList = counts => UNIT_ORDER.flatMap(id => Array(counts[id] || 0).fill(id));

  // where a structure sits: bases on sites, refineries on geysers, labs beside their Barracks, the rest in slots
  function placeAll(list) {
    const pos = {}, used = { prod: 0, supply: 0, bunker: 0 };
    let geo = 0, extra = 0;
    for (const s of list) {
      const key = s.type + s.n;
      if (s.type === 'base') pos[key] = SITES[s.n - 1] || { x: 640, y: 240 };
      else if (s.type === 'refinery') pos[key] = GEYSER[geo++] || { x: 300 + (geo % 4) * 30, y: 450 };
      else if (s.type === 'lab') continue;
      else {
        const k = KIND[s.type] || 'prod', L = SLOT[k], i = used[k]++;
        pos[key] = L[i] || { x: 40 + ((extra % 8) * 36), y: 20 + Math.floor(extra++ / 8) * 36 };
      }
    }
    for (const s of list) if (s.type === 'lab') {
      const h = pos['barracks' + s.host] || { x: 300, y: 240 };
      pos[s.type + s.n] = { x: h.x + 22, y: h.y + 8 };
    }
    return pos;
  }

  /* ---------- one match, prepared for drawing ---------- */
  function prepare(cfg) {
    const R = match(buildOf(cfg[0].b), buildOf(cfg[1].b), cfg[0].p, cfg[1].p);
    const same = cfg[0].b === cfg[1].b;
    const sides = cfg.map((c, i) => ({
      i, key: c.b, plan: PLANS[c.p], col: i === 1 && same ? ALT : colOf(c.b),
      name: label(c.b) + (same ? (i ? ' (right)' : ' (left)') : ''),
      built: R.builtAll[i], pos: placeAll(R.builtAll[i]),
      order: buildOf(c.b).order.map(o => T[o.id].name),
    }));
    // armies: walk the lane in each side's own frame, then close on whatever they're hitting
    const last = [{}, {}];
    R.snaps.forEach(sn => sn.sides.forEach((S, i) => {
      const D = sides[1 - i];
      for (const g of S.groups) {
        let want;
        if (g.state !== 'siege') want = { x: lerp(LANE0, LANE1, g.p), y: 240 };
        else if (g.fighting) want = { x: LANE1 - 10, y: 240 };
        else if (g.target) { const q = D.pos[g.target.type + g.target.n] || { x: 150, y: 240 }; want = { x: MW - q.x - 46, y: q.y + (q.y < 240 ? 30 : q.y > 240 ? -30 : 0) }; }
        else want = { x: MW - RALLY.x, y: 240 };
        const L = last[i][g.id];
        if (g.state === 'siege' && L) {
          const dx = want.x - L.x, dy = want.y - L.y, d = Math.hypot(dx, dy), step = 26;
          want = d <= step ? want : { x: L.x + dx / d * step, y: L.y + dy / d * step };
        }
        g.x = want.x; g.y = want.y; last[i][g.id] = want;
      }
    }));
    const snapAt = t => R.snaps[clamp(Math.floor(t * 2), 0, R.snaps.length - 1)];
    // where each death happened, in map coordinates (left player's frame)
    const toMap = (i, p) => ({ x: i ? MW - p.x : p.x, y: p.y });
    for (const e of R.events) {
      const sn = snapAt(e.t), prev = snapAt(e.t - 0.5);
      if (e.kind === 'unit') {
        const g = e.g && (sn.sides[e.side].groups.find(x => x.id === e.g) || prev.sides[e.side].groups.find(x => x.id === e.g));
        const p = g ? { x: g.x, y: g.y } : RALLY, j = hash(e.t * 7 + e.side);
        e.at = toMap(e.side, { x: p.x + (j - .5) * 40, y: p.y + (hash(e.t * 3) - .5) * 40 });
      } else if (e.kind === 'worker') {
        const g = sn.sides[1 - e.side].groups.find(x => x.state === 'siege') || prev.sides[1 - e.side].groups.find(x => x.state === 'siege');
        const p = g ? toMap(1 - e.side, g) : toMap(e.side, SITES[0]);
        e.at = { x: p.x + (hash(e.t * 5) - .5) * 70, y: p.y + (hash(e.t * 11) - .5) * 60 };
      }
    }
    // captions, from what actually happened
    const notes = [[0, `Same map, same clock. Left: ${sides[0].name}. Right: ${sides[1].name}.`]];
    const N = i => sides[i].name;
    sides.forEach((P, i) => P.built.filter(s => s.type === 'base' && s.n > 1 && s.done < R.end && (s.dead == null || s.dead > s.done))
      .forEach(s => notes.push([s.done, `${N(i)}’s ${ORD[s.n - 1]} base finishes: more workers can mine.`])));
    const seen = {};
    for (const e of R.events) {
      const A = N(e.side), O = N(1 - e.side);
      if (e.kind === 'launch') {
        if (!seen['l' + e.side]) { seen['l' + e.side] = 1; notes.push([e.t, `${A} moves out with ${e.pow.toFixed(0)} army power.`]); }
        else if (e.pow >= 10 && e.t - (seen['w' + e.side] || -99) > 25) { seen['w' + e.side] = e.t; notes.push([e.t, `${A} sends another wave: ${e.pow.toFixed(0)} power.`]); }
      } else if (e.kind === 'worker' && !seen['k' + e.side]) {
        seen['k' + e.side] = 1; notes.push([e.t, `${A} has nothing left to defend with. ${O} kills its workers.`]);
      } else if (e.kind === 'struct' && e.type === 'base') notes.push([e.t, `${A}’s ${ORD[e.n - 1]} base falls.`]);
      else if (e.kind === 'struct' && e.type === 'bunker') notes.push([e.t, `A ${A} Bunker falls.`]);
      else if (e.kind === 'quit') notes.push([e.t, `${A} gives up the attack: it lost ${sides[e.side].lostAtQuit = R.snaps.find(x => x.t >= e.t)?.sides[e.side].lost.unitPow.toFixed(0)} power and killed nothing.`]);
    }
    // the first time armies trade blows, in the field or at a ramp
    for (const sn of R.snaps) {
      sn.sides.forEach((S, i) => S.groups.forEach(g => {
        if (!g.fighting) return;
        const k = g.state + i;
        if (g.state === 'clash' && !seen.clash) { seen.clash = 1; notes.push([sn.t, 'The armies meet in the middle of the map.']); }
        if (g.state === 'siege' && !seen[k]) {
          seen[k] = 1;
          const bk = sn.sides[1 - i].structs.some(s => s.type === 'bunker' && s.done <= sn.t);
          notes.push([sn.t, `${N(i)} hits ${N(1 - i)}’s defence at the ramp${bk ? ', Bunkers and all' : ''}.`]);
        }
      }));
    }
    if (R.over) notes.push([R.over.t, `${N(1 - R.over.winner)} has no bases left. ${N(R.over.winner)} wins.`]);
    notes.sort((a, b) => a[0] - b[0]);
    // series for the chart
    const ser = sides.map((_, i) => R.snaps.map(sn => ({ t: sn.t, pow: sn.sides[i].pow, w: sn.sides[i].workers })));
    const maxPow = Math.max(10, ...ser.flat().map(x => x.pow)) * 1.08;
    const launches = R.events.filter(e => e.kind === 'launch');
    launches.forEach(e => { e.big = e.pow >= 8 || !launches.some(x => x.side === e.side && x.t < e.t); });
    return { R, sides, notes, ser, maxPow, launches, snapAt, dur: R.end };
  }

  /* ---------- drawing ---------- */
  let g2;
  function txt(s, x, y, size, col, align = 'left', weight = 500, font = 'Jost') {
    g2.font = `${weight} ${size}px ${font}`; g2.fillStyle = col; g2.textAlign = align; g2.textBaseline = 'middle'; g2.fillText(s, x, y);
  }
  function wrapC(s, x, y, w, size, col, lh = 1.3, weight = 500, align = 'left', maxLines = 9) {
    g2.font = `${weight} ${size}px Jost`;
    const words = s.split(' '); let line = '', yy = y, n = 0;
    for (const wd of words) {
      const t = line ? line + ' ' + wd : wd;
      if (g2.measureText(t).width > w && line) {
        if (++n >= maxLines) { txt(line + ' …', x, yy, size, col, align, weight); return yy + size * lh; }
        txt(line, x, yy, size, col, align, weight); line = wd; yy += size * lh;
      } else line = t;
    }
    if (line) txt(line, x, yy, size, col, align, weight);
    return yy + size * lh;
  }
  function rr(x, y, w, h, r) { g2.beginPath(); g2.roundRect(x, y, w, h, r); }
  const shade = (hex, k) => {
    const n = parseInt(hex.slice(1), 16), f = c => Math.round(clamp(c * k, 0, 255));
    return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
  };
  // a view maps a player's own frame onto the canvas
  const V = (v, p) => ({ x: v.ox + (v.flip ? MW - p.x : p.x) * v.sc, y: v.oy + p.y * v.sc });

  function terrain(v, w) {
    const { ox, oy, sc } = v;
    g2.save();
    rr(ox, oy, w, MH * sc, 10); g2.fillStyle = '#121b2e'; g2.fill(); g2.clip();
    for (let i = 0; i < 70; i++) {
      const x = ox + hash(i) * w, y = oy + hash(i + 99) * MH * sc;
      g2.fillStyle = 'rgba(255,255,255,.025)'; g2.beginPath(); g2.arc(x, y, 6 + hash(i + 3) * 26 * sc, 0, 7); g2.fill();
    }
    // the lane both armies walk
    g2.strokeStyle = 'rgba(255,255,255,.035)'; g2.lineWidth = 70 * sc; g2.lineCap = 'round';
    g2.beginPath(); g2.moveTo(ox + 392 * sc, oy + 240 * sc); g2.lineTo(ox + (MW - 392) * sc, oy + 240 * sc); g2.stroke();
    for (const flip of [false, true]) {
      const vv = { ...v, flip };
      const a = V(vv, { x: 8, y: 52 }), b = V(vv, { x: 338, y: 428 });
      const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x);
      rr(x0, a.y, x1 - x0, b.y - a.y, 26 * sc); g2.fillStyle = '#1f2c48'; g2.fill();
      g2.strokeStyle = '#3a4f7e'; g2.lineWidth = 3 * sc; g2.stroke();
      const r1 = V(vv, { x: 330, y: 214 }), r2 = V(vv, { x: 330, y: 266 }), r3 = V(vv, { x: 392, y: 276 }), r4 = V(vv, { x: 392, y: 204 });
      g2.beginPath(); g2.moveTo(r1.x, r1.y); g2.lineTo(r4.x, r4.y); g2.lineTo(r3.x, r3.y); g2.lineTo(r2.x, r2.y); g2.closePath();
      g2.fillStyle = '#1b2640'; g2.fill();
      for (let i = 1; i < 4; i++) {
        const p = V(vv, { x: 330 + i * 15, y: 210 }), q = V(vv, { x: 330 + i * 15, y: 270 });
        g2.strokeStyle = 'rgba(255,255,255,.07)'; g2.lineWidth = 2; g2.beginPath(); g2.moveTo(p.x, p.y); g2.lineTo(q.x, q.y); g2.stroke();
      }
      for (let k = 0; k < 3; k++) for (const p of PATCH[k]) crystal(V(vv, p), v.k);
      for (const q of GEYSER.slice(0, 6)) geyser(V(vv, q), v.k);
    }
    g2.restore();
  }
  function crystal(p, k) {
    g2.save(); g2.translate(p.x, p.y);
    const s = 7 * k;
    g2.fillStyle = '#4fb8ff'; g2.strokeStyle = '#bfe6ff'; g2.lineWidth = 1;
    for (const [dx, h] of [[-s * .7, 1.1], [0, 1.6], [s * .7, 1]]) {
      g2.beginPath(); g2.moveTo(dx, -s * h); g2.lineTo(dx + s * .45, 0); g2.lineTo(dx, s * .5); g2.lineTo(dx - s * .45, 0); g2.closePath(); g2.fill(); g2.stroke();
    }
    g2.restore();
  }
  function geyser(p, k) {
    g2.fillStyle = 'rgba(95,224,160,.22)'; g2.strokeStyle = 'rgba(95,224,160,.55)'; g2.lineWidth = 1.5;
    g2.beginPath(); g2.ellipse(p.x, p.y, 15 * k, 10 * k, 0, 0, 7); g2.fill(); g2.stroke();
  }
  function hpBar(p, w, f, col) {
    if (f >= .999) return;
    g2.fillStyle = 'rgba(0,0,0,.6)'; g2.fillRect(p.x - w / 2, p.y, w, 5);
    g2.fillStyle = f > .5 ? col : '#ff6b6b'; g2.fillRect(p.x - w / 2, p.y, w * clamp(f), 5);
  }
  const SIZE = { base: 34, barracks: 16, factory: 16, starport: 16, supply: 10, refinery: 13, bunker: 12, lab: 8 };
  // one structure: a construction ghost, the building, or rubble
  function structure(s, p, v, g, col, hp) {
    if (g < s.begun) return;
    const k = v.k, dead = s.dead != null && g >= s.dead, r = SIZE[s.type] * k;
    const prog = clamp((g - s.begun) / ((s.done - s.begun) || 1));
    g2.save(); g2.translate(p.x, p.y);
    if (dead) {
      g2.globalAlpha = clamp(1 - (g - s.dead) / 40, .4, 1);
      g2.fillStyle = '#3b4255';
      for (let i = 0; i < 6; i++) { g2.beginPath(); g2.arc((hash(i + s.n * 3) - .5) * r * 1.6, (hash(i + s.n * 7 + 1) - .5) * r * 1.3, (2 + hash(i) * 4) * k * (r / 16 + .4), 0, 7); g2.fill(); }
      if (g - s.dead < 4) { g2.globalAlpha = 1; g2.strokeStyle = `rgba(255,200,120,${1 - (g - s.dead) / 4})`; g2.lineWidth = 4; g2.beginPath(); g2.arc(0, 0, (r + (g - s.dead) * 12) , 0, 7); g2.stroke(); }
      g2.restore(); return;
    }
    g2.globalAlpha = prog < 1 ? .45 : 1;
    const acc = T[s.type].col;
    g2.fillStyle = shade(col, .42); g2.strokeStyle = col; g2.lineWidth = 2.5 * k;
    if (s.type === 'base') {
      g2.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + Math.PI / 6; g2.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g2.closePath(); g2.fill(); g2.stroke();
      g2.fillStyle = '#9fe3ff'; g2.beginPath(); g2.arc(0, 0, r * .34, 0, 7); g2.fill();
    } else if (s.type === 'supply') {
      g2.beginPath(); g2.moveTo(0, -r); g2.lineTo(r * .8, 0); g2.lineTo(0, r); g2.lineTo(-r * .8, 0); g2.closePath(); g2.fill(); g2.stroke();
      g2.fillStyle = acc; g2.beginPath(); g2.arc(0, 0, r * .28, 0, 7); g2.fill();
    } else if (s.type === 'bunker') {
      g2.beginPath(); g2.arc(0, 0, r, 0, 7); g2.fill(); g2.stroke();
      g2.fillStyle = acc; g2.fillRect(-r * .55, -r * .16, r * 1.1, r * .32);
    } else if (s.type === 'refinery') {
      rr(-r, -r * .8, r * 2, r * 1.6, 4 * k); g2.fill(); g2.stroke();
      g2.fillStyle = acc; g2.beginPath(); g2.arc(0, 0, r * .4, 0, 7); g2.fill();
    } else if (s.type === 'lab') {
      rr(-r, -r, r * 2, r * 2, 2 * k); g2.fillStyle = acc; g2.fill(); g2.strokeStyle = shade(col, .3); g2.lineWidth = 1.5; g2.stroke();
    } else {
      rr(-r, -r, r * 2, r * 2, 5 * k); g2.fill(); g2.stroke();
      g2.fillStyle = acc;
      if (s.type === 'barracks') g2.fillRect(-r * .3, -r * .55, r * .6, r * 1.1);
      else if (s.type === 'factory') { g2.beginPath(); g2.arc(0, 0, r * .45, 0, 7); g2.fill(); g2.fillStyle = shade(col, .42); g2.beginPath(); g2.arc(0, 0, r * .18, 0, 7); g2.fill(); }
      else { g2.beginPath(); g2.moveTo(r * .55, 0); g2.lineTo(-r * .4, -r * .45); g2.lineTo(-r * .4, r * .45); g2.closePath(); g2.fill(); }
    }
    g2.globalAlpha = 1;
    if (prog < 1) {
      g2.strokeStyle = '#fff'; g2.lineWidth = 2.5; g2.beginPath(); g2.arc(0, 0, r + 6 * k, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2); g2.stroke();
    }
    g2.restore();
    if (prog >= 1 && hp != null) hpBar({ x: p.x, y: p.y + r + 5 * k }, Math.max(26, r * 1.8), hp, col);
  }
  function probe(x, y, k, col, carry) {
    const s = 4 * k;
    g2.fillStyle = shade(col, 1.15); g2.strokeStyle = '#0b1222'; g2.lineWidth = 1.1;
    g2.beginPath(); g2.moveTo(x, y - s); g2.lineTo(x + s, y); g2.lineTo(x, y + s); g2.lineTo(x - s, y); g2.closePath(); g2.fill(); g2.stroke();
    if (carry) { g2.fillStyle = carry === 'gas' ? '#5fe0a0' : '#7fd0ff'; g2.beginPath(); g2.arc(x, y - s - 2.4 * k, 2.2 * k, 0, 7); g2.fill(); }
  }
  // a unit glyph facing fx (+1 right, -1 left)
  function unit(id, x, y, fx, k, col, strike) {
    g2.fillStyle = col; g2.strokeStyle = '#0b1222'; g2.lineWidth = 1.6;
    if (id === 'soldier' || id === 'ranger') {
      const r = (id === 'ranger' ? 6.5 : 5) * k;
      g2.beginPath(); g2.arc(x, y, r, 0, 7); g2.fill(); g2.stroke();
      g2.strokeStyle = '#d9f4ff'; g2.lineWidth = (id === 'ranger' ? 2.6 : 2) * k;
      g2.beginPath(); g2.moveTo(x + fx * r * .4, y + r * .35); g2.lineTo(x + fx * r * 1.8, y + r * .35); g2.stroke();
      if (id === 'ranger') { g2.fillStyle = T.ranger.col; g2.beginPath(); g2.arc(x, y, r * .4, 0, 7); g2.fill(); }
    } else if (id === 'raider') {
      const w = 8 * k, h = 5 * k;
      rr(x - w, y - h, w * 2, h * 2, 3 * k); g2.fill(); g2.stroke();
      g2.fillStyle = '#0b1222'; g2.fillRect(x - w * .7, y + h - 1, w * .5, 2.4 * k); g2.fillRect(x + w * .2, y + h - 1, w * .5, 2.4 * k);
    } else if (id === 'tank') {
      const w = 10 * k, h = 7 * k;
      rr(x - w, y - h, w * 2, h * 2, 3 * k); g2.fill(); g2.stroke();
      g2.strokeStyle = '#d9f4ff'; g2.lineWidth = 2.6 * k; g2.beginPath(); g2.moveTo(x, y); g2.lineTo(x + fx * w * 1.6, y); g2.stroke();
      g2.fillStyle = shade(col, .55); g2.beginPath(); g2.arc(x, y, h * .6, 0, 7); g2.fill();
    } else {
      const s = 8 * k;
      g2.fillStyle = 'rgba(0,0,0,.3)'; g2.beginPath(); g2.ellipse(x, y + 10 * k, s * .8, s * .3, 0, 0, 7); g2.fill();
      g2.fillStyle = col; g2.beginPath(); g2.moveTo(x + fx * s * 1.2, y - 4 * k); g2.lineTo(x - fx * s * .8, y - s * .8 - 4 * k); g2.lineTo(x - fx * s * .4, y - 4 * k); g2.lineTo(x - fx * s * .8, y + s * .8 - 4 * k); g2.closePath(); g2.fill(); g2.stroke();
    }
    if (strike) {
      g2.strokeStyle = 'rgba(255,240,200,.9)'; g2.lineWidth = 2;
      g2.beginPath(); g2.arc(x + fx * 13 * k, y, 3 * k, 0, 7); g2.stroke();
    }
  }
  function puff(p, age, k) {
    if (age > 3 || age < 0) return;
    const a = 1 - age / 3;
    g2.strokeStyle = `rgba(230,236,255,${a})`; g2.lineWidth = 2;
    g2.beginPath(); g2.arc(p.x, p.y, (5 + age * 6) * k, 0, 7); g2.stroke();
    const s = 4 * k; g2.beginPath(); g2.moveTo(p.x - s, p.y - s); g2.lineTo(p.x + s, p.y + s); g2.moveTo(p.x + s, p.y - s); g2.lineTo(p.x - s, p.y + s); g2.stroke();
  }
  // a group's units laid out as a blob around (x, y) in its own frame; returns canvas positions
  function layout(counts, c, v) {
    const ids = unitList(counts), pts = blob(ids.length);
    return ids.map((id, i) => ({ id, ...V(v, { x: c.x + pts[i].x, y: c.y + pts[i].y }) }));
  }
  function shots(from, to, g, seed, col, n = 5) {
    if (!from.length || !to) return;
    const b = Math.floor(g * 5);
    for (let j = 0; j < Math.min(n, from.length); j++) {
      const ph = (g * 5 + hash(j + seed)) % 1;
      if (ph > .45) continue;
      const u = from[Math.floor(hash(b * 17 + j * 5 + seed) * from.length)], a = 1 - ph / .45;
      const tx = to.x + (hash(b + j * 3 + seed) - .5) * 40, ty = to.y + (hash(b * 7 + j + seed) - .5) * 34;
      g2.strokeStyle = col.replace('A', a.toFixed(2)); g2.lineWidth = 2;
      g2.beginPath(); g2.moveTo(u.x, u.y); g2.lineTo(lerp(u.x, tx, .85), lerp(u.y, ty, .85)); g2.stroke();
    }
  }
  const centroid = pts => pts.length ? { x: pts.reduce((a, p) => a + p.x, 0) / pts.length, y: pts.reduce((a, p) => a + p.y, 0) / pts.length } : null;

  function drawMap(M, g, v0) {
    const sn = M.snapAt(g), nx = M.R.snaps[Math.min(M.R.snaps.length - 1, M.R.snaps.indexOf(sn) + 1)];
    const f = nx === sn ? 0 : clamp((g - sn.t) / (nx.t - sn.t));
    const views = [{ ...v0, flip: false }, { ...v0, flip: true }];
    const drawn = [{ home: [], groups: [] }, { home: [], groups: [] }];
    // structures, then workers, then armies
    M.sides.forEach((P, i) => {
      const v = views[i], S = sn.sides[i], hp = {};
      S.structs.forEach(s => (hp[s.type + s.n] = s.hp));
      for (const s of P.built) structure(s, V(v, P.pos[s.type + s.n]), v, g, P.col, hp[s.type + s.n]);
      // builders beside anything going up
      for (const s of P.built) if (T[s.type].by === 'worker' && g >= s.begun && g < s.done && (s.dead == null || g < s.dead)) {
        const p = P.pos[s.type + s.n], r = SIZE[s.type];
        const q = V(v, { x: p.x - r - 6, y: p.y + r * .4 + Math.sin(g * 6) * 2 });
        probe(q.x, q.y, v.k, P.col, false);
        if ((g * 4 + s.n) % 1 < .4) { g2.fillStyle = '#ffe6a0'; g2.beginPath(); g2.arc(q.x + (v.flip ? -6 : 6), q.y - 3, 1.8, 0, 7); g2.fill(); }
      }
      // workers: up to 16 on each finished base, then up to 24, three on each Refinery
      const alive = s => s.done <= g && (s.dead == null || s.dead > g);
      const bases = P.built.filter(s => s.type === 'base' && alive(s)).sort((a, b) => a.n - b.n);
      const refs = P.built.filter(s => s.type === 'refinery' && alive(s));
      let gas = Math.min(S.onGas, refs.length * 3), mining = Math.max(0, S.workers - S.building - S.onGas);
      const per = bases.map(() => 0);
      for (const cap of [16, 24]) bases.forEach((_, j) => { const add = Math.min(cap - per[j], mining); per[j] += add; mining -= add; });
      bases.forEach((b, j) => {
        const site = P.pos['base' + b.n], pa = SITES.indexOf(site) >= 0 ? PATCH[SITES.indexOf(site)] : PATCH[0];
        for (let w = 0; w < per[j]; w++) {
          const patch = pa[(w * 3) % 8], T7 = 7, ph = (g + hash(w + b.n * 50) * T7) % T7;
          const ax = site.x + (patch.x - site.x) * .3, ay = site.y + (patch.y - site.y) * .3, bx = patch.x + (site.x - patch.x) * .14, by = patch.y + (site.y - patch.y) * .14;
          const jit = (hash(w + 7 + b.n) - .5) * 8;
          let q, carry = false;
          if (ph < 2.6) { const k = ph / 2.6; q = { x: lerp(ax, bx, k) + jit, y: lerp(ay, by, k) + jit * .5 }; }
          else if (ph < 4) q = { x: bx + Math.sin(ph * 9) * 1.2, y: by };
          else { const k = (ph - 4) / 3; q = { x: lerp(bx, ax, k) + jit, y: lerp(by, ay, k) + jit * .5 }; carry = true; }
          const c = V(v, q); probe(c.x, c.y, v.k, P.col, carry);
        }
      });
      refs.forEach((r, j) => {
        const gp = P.pos['refinery' + r.n], site = SITES[[0, 0, 1, 1, 2, 2, 3, 4][GEYSER.indexOf(gp)] ?? 0] || SITES[0];
        for (let w = 0; w < 3 && gas > 0; w++, gas--) {
          const ph = (g * .2 + w / 3 + hash(r.n)) % 1, k = ease(ph < .5 ? ph * 2 : (1 - ph) * 2);
          const c = V(v, { x: lerp(site.x, gp.x, .25 + .6 * k), y: lerp(site.y, gp.y, .25 + .6 * k) + (w - 1) * 5 });
          probe(c.x, c.y, v.k, P.col, ph > .5 ? 'gas' : false);
        }
      });
    });
    // armies
    const tags = [];
    M.sides.forEach((P, i) => {
      const v = views[i], S = sn.sides[i], N = nx.sides[i];
      const fighting = sn.sides[1 - i].groups.some(x => x.state === 'siege' && x.fighting);
      const home = layout(S.home, RALLY, v);
      home.forEach((u, j) => unit(u.id, u.x + (fighting ? Math.sin(g * 9 + j) * 1.5 : 0), u.y, v.flip ? -1 : 1, v.k * 1.4, P.col, fighting && ((g * 3 + j * .37) % 1) < .25));
      drawn[i].home = home;
      for (const gr of S.groups) {
        const nxg = N.groups.find(x => x.id === gr.id) || gr;
        const c = { x: lerp(gr.x, nxg.x, f), y: lerp(gr.y, nxg.y, f) };
        const pts = layout(gr.counts, c, v);
        pts.forEach((u, j) => unit(u.id, u.x + (gr.fighting ? Math.sin(g * 9 + j) * 1.5 : 0), u.y, v.flip ? -1 : 1, v.k * 1.4, P.col, gr.fighting && ((g * 3 + j * .37) % 1) < .25));
        drawn[i].groups.push({ gr, pts, c: V(v, c) });
        const lc = V(v, c), top = Math.min(...pts.map(p => p.y)) - 12;
        if ((pts.length >= 3 || gr.pow >= 3) && !tags.some(q => Math.abs(q.x - lc.x) < 80 && Math.abs(q.y - top) < 20)) {
          tags.push({ x: lc.x, y: top });
          txt(`${gr.pow.toFixed(0)} power`, lc.x, top, 14, '#fff', 'center', 700);
        }
      }
    });
    // fire: field clashes, sieges against the home army and Bunkers
    M.sides.forEach((P, i) => {
      const O = drawn[1 - i], tint = i ? 'rgba(220,235,255,A)' : 'rgba(255,230,190,A)';
      for (const d of drawn[i].groups) {
        if (!d.gr.fighting) continue;
        if (d.gr.state === 'clash') {
          const foe = O.groups.filter(x => x.gr.state === 'clash').sort((a, b) => Math.abs(a.c.x - d.c.x) - Math.abs(b.c.x - d.c.x))[0];
          if (foe) { shots(d.pts, foe.c, g, i * 31 + d.gr.id, tint, 6); shots(foe.pts, d.c, g, i * 57 + d.gr.id + 3, i ? 'rgba(255,230,190,A)' : 'rgba(220,235,255,A)', 6); }
        } else {
          const tgt = centroid(O.home) || V(views[1 - i], { x: 300, y: 240 });
          shots(d.pts, tgt, g, i * 13 + d.gr.id, tint, 6);
          shots(O.home, d.c, g, i * 71 + 5, i ? 'rgba(255,230,190,A)' : 'rgba(220,235,255,A)', 6);
          // Bunkers fire too
          const D = M.sides[1 - i];
          D.built.filter(s => s.type === 'bunker' && s.done <= g && (s.dead == null || s.dead > g)).forEach((s, j) => {
            const me = V(views[1 - i], D.pos['bunker' + s.n]), ph = (g * 1.3 + j * .3) % 1;
            if (ph < .4) {
              const a = 1 - ph / .4;
              g2.strokeStyle = `rgba(255,214,120,${a})`; g2.lineWidth = 3; g2.beginPath(); g2.moveTo(me.x, me.y); g2.lineTo(d.c.x + (hash(j + Math.floor(g * 2)) - .5) * 30, d.c.y); g2.stroke();
            }
          });
        }
      }
    });
    // deaths in the last few seconds
    for (const e of M.R.events) {
      if (e.t > g) break;
      if (e.at && g - e.t < 3) puff(V({ ...v0, flip: false }, e.at), g - e.t, e.kind === 'worker' ? .7 : 1);
    }
  }

  /* ---------- the slide: map, captions, two cards, a chart ---------- */
  const PANEL = '#152044';
  function render(M, g) {
    const mapY = 182, sc = 1560 / MW, mh = MH * sc, v = { ox: 20, oy: mapY, sc, k: 1 };
    terrain(v, 1560);
    g2.save(); rr(20, mapY, 1560, mh, 10); g2.clip();
    // open expansion sites
    M.sides.forEach((P, i) => {
      for (const n of [2, 3]) {
        if (P.built.some(s => s.type === 'base' && s.n === n && g >= s.begun)) continue;
        const s = SITES[n - 1], q = V({ ...v, flip: !!i }, { x: s.x, y: s.y + (n === 2 ? 62 : -62) });
        txt('open base site', q.x, q.y, 14, 'rgba(169,183,214,.55)', 'center');
      }
    });
    drawMap(M, g, v);
    g2.restore();
    // clock and caption
    rr(620, mapY + 10, 360, 44, 22); g2.fillStyle = 'rgba(6,14,32,.85)'; g2.fill();
    txt(`game clock ${fmt(g)}`, 800, mapY + 33, 24, '#ffb951', 'center', 800, 'Montserrat');
    let n = null; for (const x of M.notes) if (g >= x[0]) n = x;
    if (n) {
      g2.font = '600 24px Jost'; const tw = Math.min(1400, g2.measureText(n[1]).width + 50);
      g2.globalAlpha = clamp((g - n[0]) / 2 + .3);
      rr(800 - tw / 2, mapY + mh - 58, tw, 46, 12); g2.fillStyle = 'rgba(6,14,32,.88)'; g2.fill();
      txt(n[1], 800, mapY + mh - 34, 24, '#fff', 'center', 600); g2.globalAlpha = 1;
    }
    const sn = M.snapAt(g);
    // the two players
    const y0 = mapY + mh + 10, h = 900 - 12 - y0;
    M.sides.forEach((P, i) => {
      const x = i ? 1056 : 20, w = 524, S = sn.sides[i];
      rr(x, y0, w, h, 14); g2.fillStyle = PANEL; g2.fill(); g2.strokeStyle = P.col; g2.lineWidth = 2; g2.stroke();
      txt(P.name, x + 18, y0 + 28, 26, P.col, 'left', 800, 'Montserrat');
      txt(P.plan.name, x + w - 18, y0 + 28, 17, '#ffb951', 'right', 700);
      wrapC(P.plan.tag, x + 18, y0 + 58, w - 36, 15, '#cfd8ee', 1.25, 500, 'left', 2);
      const items = [['workers', S.workers], ['army power', S.pow.toFixed(0)], ['bases', S.bases], ['buildings', S.structs.filter(s => s.type !== 'base' && s.done <= g).length]];
      items.forEach(([l, val], j) => {
        const cx = x + 18 + j * 124;
        txt(String(val), cx, y0 + 112, 30, '#fff', 'left', 800, 'Montserrat');
        txt(l, cx, y0 + 138, 14, '#a9b7d6');
      });
      const L = S.lost;
      txt(L.units + L.workers + L.structs ? `lost: ${L.units} units · ${L.workers} workers · ${L.structs} buildings` : 'lost: nothing yet', x + 18, y0 + 170, 16, L.units + L.workers + L.structs ? '#ff9a9a' : '#7f8db0', 'left', 600);
      wrapC('build: ' + P.order.join(', '), x + 18, y0 + 198, w - 36, 13, '#7f8db0', 1.25, 500, 'left', 2);
    });
    // army power and workers over time
    const cx = 552, cw = 496;
    rr(cx, y0, cw, h, 14); g2.fillStyle = PANEL; g2.fill();
    const px = cx + 62, pw = cw - 80, X = t => px + pw * t / M.dur;
    const panel = (py, ph, key, max, title) => {
      g2.strokeStyle = 'rgba(255,255,255,.14)'; g2.lineWidth = 1; g2.strokeRect(px, py, pw, ph);
      txt(title, px - 8, py + 8, 12, '#a9b7d6', 'right', 600);
      txt(String(Math.round(max)), px - 8, py + 22, 11, '#7f8db0', 'right');
      M.sides.forEach((P, i) => {
        g2.strokeStyle = P.col; g2.lineWidth = key === 'pow' ? 2.5 : 2; g2.setLineDash(i ? [6, 4] : []);
        g2.beginPath();
        const ser = M.ser[i];
        for (let j = 0; j < ser.length && ser[j].t <= g; j += 2) { const xx = X(ser[j].t), yy = py + ph - ph * Math.min(1, ser[j][key] / max); j ? g2.lineTo(xx, yy) : g2.moveTo(xx, yy); }
        g2.stroke(); g2.setLineDash([]);
      });
    };
    txt('army power and workers · left solid, right dashed', cx + cw / 2, y0 + 16, 14, '#a9b7d6', 'center', 600);
    panel(y0 + 30, 100, 'pow', M.maxPow, 'army');
    panel(y0 + 140, 56, 'w', 75, 'workers');
    for (const e of M.launches) {
      if (e.t > g) break;
      if (!e.big) continue;
      const xx = X(e.t), c = M.sides[e.side].col;
      g2.fillStyle = c; g2.beginPath(); g2.moveTo(xx, y0 + 30); g2.lineTo(xx - 4, y0 + 24); g2.lineTo(xx + 4, y0 + 24); g2.closePath(); g2.fill();
    }
    g2.strokeStyle = 'rgba(255,255,255,.55)'; g2.lineWidth = 1.5; g2.beginPath(); g2.moveTo(X(g), y0 + 28); g2.lineTo(X(g), y0 + 196); g2.stroke();
    txt('0:00', px, y0 + 210, 11, '#7f8db0', 'left'); txt(fmt(M.dur), px + pw, y0 + 210, 11, '#7f8db0', 'right');
    txt('▾ attack leaves home', px + pw / 2, y0 + 210, 11, '#7f8db0', 'center');
    // the verdict
    const vt = M.R.over ? M.R.over.t + 3 : M.dur - 3;
    if (g >= vt) {
      const end = M.R.snaps[M.R.snaps.length - 1].sides, [A, B] = M.sides;
      let head, body, wc;
      if (M.R.over) {
        const W = M.sides[M.R.over.winner], Lz = M.sides[1 - M.R.over.winner], el = end[Lz.i].lost, wl = end[W.i].lost;
        head = `${W.name} wins at ${fmt(M.R.over.t)}`; wc = W.col;
        body = `${Lz.name} lost every base, ${el.workers} workers and ${el.units} units. ${W.name} lost ${wl.units} units${wl.workers ? ` and ${wl.workers} workers` : ''}. ${W.plan.name} against ${Lz.plan.name.toLowerCase()}: ${M.R.over.t < 300 ? 'the attack landed before the other build’s spending paid off.' : 'the bigger economy turned into the bigger army.'}`;
      } else {
        const sa = end[0], sb = end[1], score = s => s.workers * 1 + s.pow * 1.5 + s.bases * 10;
        const lead = score(sa) >= score(sb) ? 0 : 1, Lp = M.sides[lead], Op = M.sides[1 - lead];
        head = `No base fell by ${fmt(M.dur)}`; wc = '#ffb951';
        const quit = M.R.events.find(e => e.kind === 'quit'), lw = end[0].lost.workers + end[1].lost.workers + end[0].lost.structs + end[1].lost.structs;
        body = `${Lp.name} is ahead: ${end[lead].workers} workers and ${end[lead].pow.toFixed(0)} army power against ${end[1 - lead].workers} and ${end[1 - lead].pow.toFixed(0)}. ` +
          (quit ? `${M.sides[quit.side].name}’s attack bounced off ${M.sides[1 - quit.side].name}’s defence and never killed a worker.`
            : A.plan.never && B.plan.never ? 'Nobody attacked, so nobody was punished.'
            : lw ? 'Both sides traded, but nobody finished the job.' : 'The attacks never got past the defenders.');
      }
      g2.globalAlpha = clamp((g - vt) / 2);
      rr(430, mapY + 110, 740, 190, 18); g2.fillStyle = 'rgba(6,14,32,.93)'; g2.fill();
      g2.strokeStyle = wc; g2.lineWidth = 3; g2.stroke();
      txt(head, 800, mapY + 154, 34, wc, 'center', 800, 'Montserrat');
      wrapC(body, 800, mapY + 204, 660, 21, '#fff', 1.4, 500, 'center', 4);
      g2.globalAlpha = 1;
    }
  }

  /* ---------- wiring: pickers, play, pause, scrub ---------- */
  const DEF = [{ b: 'you', p: 'timing' }, { b: 'rush', p: 'rush' }];
  const planFor = b => b === 'you' ? 'timing' : PRESET_PLAN[b];
  let api = null;
  canvasDemo('bo-map', (s, cv, ctx) => {
    let cfg = store.get('bo-map', null) || DEF, M = null, key = '';
    const st = { t: 0, play: true, held: false, speed: store.get('bo-speed', 15) };
    const scrub = $(s, '.ro-scrub'), pb = $(s, '.ro-play');
    const dur = () => M.dur / st.speed;
    const sync = () => { scrub.value = String(st.t / (dur() + 4)); pb.textContent = st.play ? '❚❚' : '▶'; };
    function pickers() {
      $$(s, '.bm-side').forEach((box, i) => {
        $$(box, '[data-b]').forEach(b => b.classList.toggle('on', b.dataset.b === cfg[i].b));
        $(box, 'select').value = cfg[i].p;
      });
      $$(s, '[data-ctr]').forEach(b => { const [a, d] = b.dataset.ctr.split(' '); b.classList.toggle('on', cfg[0].b === a && cfg[1].b === d && cfg[0].p === planFor(a) && cfg[1].p === planFor(d)); });
    }
    function rebuild(restart = true) {
      const k = JSON.stringify(cfg) + (cfg.some(c => c.b === 'you') ? JSON.stringify(buildOf('you')) : '');
      if (k !== key) { key = k; M = prepare(cfg); if (restart) { st.t = 0; st.play = true; } }
      store.set('bo-map', cfg); pickers(); sync();
    }
    $$(s, '.bm-side').forEach((box, i) => {
      box.querySelector('.bm-builds').innerHTML = BUILDS.map(b => `<button class="bm-b" data-b="${b}" style="--c:${colOf(b)}">${b === 'you' ? 'Your build' : label(b)}</button>`).join('');
      const sel = $(box, 'select');
      sel.innerHTML = PLAN_KEYS.map(p => `<option value="${p}">${PLANS[p].name}</option>`).join('');
      $$(box, '[data-b]').forEach(b => b.onclick = () => { cfg = cfg.map((c, j) => j === i ? { b: b.dataset.b, p: planFor(b.dataset.b) } : c); rebuild(); });
      sel.onchange = () => { cfg = cfg.map((c, j) => j === i ? { ...c, p: sel.value } : c); sel.blur(); rebuild(); };
    });
    $(s, '.bm-ctrs').innerHTML = COUNTERS.map(([a, d, l]) => `<button class="bm-b" data-ctr="${a} ${d}">${l}</button>`).join('');
    $$(s, '[data-ctr]').forEach(b => b.onclick = () => { const [a, d] = b.dataset.ctr.split(' '); cfg = [{ b: a, p: planFor(a) }, { b: d, p: planFor(d) }]; rebuild(); });
    $(s, '.bm-speeds').innerHTML = [5, 15, 40].map(v => `<button class="bm-b" data-sp="${v}">×${v}</button>`).join('');
    const speeds = () => $$(s, '[data-sp]').forEach(b => b.classList.toggle('on', +b.dataset.sp === st.speed));
    $$(s, '[data-sp]').forEach(b => b.onclick = () => { const g = st.t * st.speed; st.speed = +b.dataset.sp; st.t = g / st.speed; store.set('bo-speed', st.speed); speeds(); sync(); });
    speeds();
    pb.onclick = () => { st.play = !st.play; if (st.play && st.t >= dur() + 4) st.t = 0; sync(); };
    cv.onclick = () => pb.onclick();
    scrub.oninput = () => { st.t = +scrub.value * (dur() + 4); st.play = false; sync(); draw(); };
    scrub.onchange = () => scrub.blur();
    const draw = () => { g2 = ctx; ctx.clearRect(0, 0, cv.width, cv.height); render(M, Math.min(st.t * st.speed, M.dur)); };
    api = {
      enter() { cfg = store.get('bo-map', null) || cfg; rebuild(false); st.t = 0; st.play = true; sync(); },
      seek(g) { st.held = true; st.t = g / st.speed; st.play = false; sync(); draw(); },
      get M() { return M; },
    };
    rebuild();
    return dt => {
      if (!st.held && st.play) { st.t += dt; if (st.t > dur() + 4) st.t = 0; scrub.value = String(st.t / (dur() + 4)); }
      draw();
    };
  }, { enter() { api?.enter(); } });
  window.__seekMap = g => api.seek(g);
  window.__mapMatch = () => api.M;
  // other slides send a matchup here: BOMap.show(['rush', 'expand'])
  window.BOMap = {
    show(pair) {
      store.set('bo-map', pair.map(b => ({ b, p: planFor(b) })));
      const i = [...document.querySelectorAll('.slide')].findIndex(x => x.dataset.demo === 'bo-map');
      if (i >= 0) FPF.go(i);
    },
  };
})();
