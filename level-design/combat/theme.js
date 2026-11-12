/* Dressing for a themed map (map.dress in map.js, map.dressSpec in maps.js): floor materials, floor decals and props, for both views.
   Nothing here changes a battle: props do not block shots, sight or movement.
   FPSTHEME.MATS                     material -> floor tint for the plan, wall and floor colours for first person
   FPSTHEME.paint(g, map)            draws floor patterns, decals and props onto the cached top-down plan
   FPSTHEME.props(map)               every upright prop as { type, x, y, r }, for the first-person view
   FPSTHEME.fp(g, p, x, floor, k)    draws one prop as a billboard standing on the floor line, k px per world unit */
(function (root) {
  const TAU = Math.PI * 2, INK = '#1c2450';
  const MATS = {
    slab:   { tint: '#f1ead9', wall: [112, 116, 150], wall2: [86, 90, 124], floor: ['#e2dac8', '#cdbf9f'] },
    plank:  { tint: '#ecd9b4', wall: [150, 112, 76], wall2: [122, 88, 58], floor: ['#dcc9a2', '#b99a68'], lines: 'plank' },
    brick:  { tint: '#e6c9b6', wall: [150, 108, 92], wall2: [120, 84, 74], floor: ['#cdbcab', '#9c8a7c'], lines: 'brick', dim: true },
    salt:   { tint: '#f8f5ee', wall: [196, 190, 180], wall2: [164, 158, 150], floor: ['#f1ede4', '#ddd6c8'] },
    cobble: { tint: '#e7dcc4', wall: [128, 120, 110], wall2: [102, 96, 88], floor: ['#d9cdb2', '#b3a482'], lines: 'brick' },
    tile:   { tint: '#f3efe8', wall: [176, 168, 160], wall2: [146, 140, 134], floor: ['#ece6dc', '#cfc6b8'] },
    metal:  { tint: '#dfe3e6', wall: [110, 124, 134], wall2: [84, 96, 106], floor: ['#d3d8dc', '#a3acb4'], lines: 'plank' },
    clay:   { tint: '#f1d2b8', wall: [176, 112, 80], wall2: [146, 90, 64], floor: ['#e6c4a8', '#c0906c'], lines: 'brick' },
    dirt:   { tint: '#ead9b8', wall: [140, 122, 98], wall2: [112, 98, 80], floor: ['#decba6', '#b89c70'] },
    wet:    { tint: '#d6e4e4', wall: [96, 118, 122], wall2: [74, 94, 100], floor: ['#c8dada', '#8fa9ac'], lines: 'brick', dim: true },
    grass:  { tint: '#dbe6c4', wall: [126, 132, 104], wall2: [100, 106, 84], floor: ['#cfdcb4', '#9fb07c'] },
    soot:   { tint: '#dcd6d0', wall: [84, 78, 84], wall2: [62, 58, 66], floor: ['#c9c2ba', '#8f8880'], lines: 'brick', dim: true },
  };
  const rnd = s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  const shape = (g, r) => { g.beginPath(); if (r.circle) g.arc(r.circle[0], r.circle[1], r.circle[2], 0, TAU); else { r.pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); } };
  const box = r => { const xs = r.pts.map(p => p[0]), ys = r.pts.map(p => p[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; };

  // the pattern is drawn in the room's own frame (along its longest wall), so a room turned off the grid keeps its floor square to its walls
  function floor(g, r, seed) {
    const R = rnd(seed); let ang = 0, ext = r.circle ? r.circle[2] : 0;
    if (r.pts) { let best = 0; r.pts.forEach((p, i) => { const q = r.pts[(i + 1) % r.pts.length], l = Math.hypot(q[0] - p[0], q[1] - p[1]); if (l > best) { best = l; ang = Math.atan2(q[1] - p[1], q[0] - p[0]); } ext = Math.max(ext, Math.hypot(p[0] - r.c[0], p[1] - r.c[1])); }); }
    const x0 = -ext, y0 = -ext, x1 = ext, y1 = ext, area = 4 * ext * ext;
    g.save(); shape(g, r); g.clip(); g.translate(r.c[0], r.c[1]); g.rotate(ang); g.lineWidth = 1;
    const speck = (col, per, s) => { g.fillStyle = col; for (let i = 0; i < area / per; i++) g.fillRect(x0 + R() * 2 * ext, y0 + R() * 2 * ext, s, s); };
    const bricks = col => { g.strokeStyle = col; g.beginPath(); for (let y = y0, i = 0; y < y1; y += 7, i++) { g.moveTo(x0, y); g.lineTo(x1, y); for (let x = x0 + (i % 2 ? 7 : 0); x < x1; x += 14) { g.moveTo(x, y); g.lineTo(x, y + 7); } } g.stroke(); };
    if (r.mat === 'plank') { g.strokeStyle = 'rgba(120,80,40,.3)'; g.beginPath(); for (let x = x0; x < x1; x += 9) { g.moveTo(x, y0); g.lineTo(x, y1); } g.stroke(); }
    else if (r.mat === 'brick') bricks('rgba(120,50,36,.25)');
    else if (r.mat === 'clay') bricks('rgba(150,70,30,.22)');
    else if (r.mat === 'soot') { bricks('rgba(40,36,44,.22)'); speck('rgba(30,28,36,.25)', 90, 2); }
    else if (r.mat === 'wet') { bricks('rgba(40,90,100,.2)'); g.strokeStyle = 'rgba(255,255,255,.55)'; for (let i = 0; i < area / 900; i++) { const x = x0 + R() * 2 * ext, y = y0 + R() * 2 * ext; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 5, y - 3, x + 10, y); g.stroke(); } }
    else if (r.mat === 'cobble') { g.strokeStyle = 'rgba(110,96,70,.3)'; for (let y = y0 + 5, i = 0; y < y1; y += 9, i++) for (let x = x0 + (i % 2 ? 9 : 4); x < x1; x += 10) { g.beginPath(); g.arc(x, y, 3.6, 0, TAU); g.stroke(); } }
    else if (r.mat === 'tile') { g.fillStyle = 'rgba(120,110,130,.13)'; for (let y = y0, i = 0; y < y1; y += 13, i++) for (let x = x0 + (i % 2 ? 13 : 0); x < x1; x += 26) g.fillRect(x, y, 13, 13); }
    else if (r.mat === 'metal') { g.strokeStyle = 'rgba(60,80,95,.22)'; g.beginPath(); for (let x = x0; x < x1; x += 22) { g.moveTo(x, y0); g.lineTo(x, y1); } for (let y = y0; y < y1; y += 22) { g.moveTo(x0, y); g.lineTo(x1, y); } g.stroke(); g.fillStyle = 'rgba(60,80,95,.3)'; for (let x = x0 + 3; x < x1; x += 22) for (let y = y0 + 3; y < y1; y += 22) g.fillRect(x, y, 1.6, 1.6); }
    else if (r.mat === 'dirt') { speck('rgba(120,90,50,.28)', 70, 1.6); speck('rgba(255,255,255,.5)', 160, 1.6); }
    else if (r.mat === 'grass') { g.strokeStyle = 'rgba(70,120,50,.45)'; for (let i = 0; i < area / 110; i++) { const x = x0 + R() * 2 * ext, y = y0 + R() * 2 * ext; g.beginPath(); g.moveTo(x - 2, y); g.lineTo(x - 3, y - 4); g.moveTo(x, y); g.lineTo(x, y - 5); g.moveTo(x + 2, y); g.lineTo(x + 3, y - 4); g.stroke(); } }
    else if (r.mat === 'salt') {
      g.fillStyle = 'rgba(255,255,255,.9)'; for (let i = 0; i < area / 60; i++) { g.beginPath(); g.arc(x0 + R() * 2 * ext, y0 + R() * 2 * ext, .8 + R() * 1.6, 0, TAU); g.fill(); }
      g.strokeStyle = 'rgba(150,140,125,.3)'; for (let i = 0; i < area / 1500; i++) { let x = x0 + R() * 2 * ext, y = y0 + R() * 2 * ext; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (R() - .5) * 26; y += (R() - .5) * 26; g.lineTo(x, y); } g.stroke(); }
    }
    g.restore();
  }

  // flat things on the floor, top-down only
  function decal(g, d) {
    g.save(); g.lineCap = 'butt';
    if (d.type === 'pan') {   // an evaporation pan: a shallow tray of brine with a salt rim
      const [x, y, w, h] = d.at; g.fillStyle = '#fff'; g.strokeStyle = 'rgba(28,36,80,.55)'; g.lineWidth = 1.5; g.beginPath(); g.roundRect(x, y, w, h, 4); g.fill(); g.stroke();
      g.fillStyle = d.col || '#bfe0ea'; g.beginPath(); g.roundRect(x + 4, y + 4, w - 8, h - 8, 3); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 1; for (let k = 10; k < w - 6; k += 12) { g.beginPath(); g.moveTo(x + k, y + 7); g.lineTo(x + k - 5, y + h - 7); g.stroke(); }
    } else if (d.type === 'rail') {
      const [x0, y, x1] = d.at; g.strokeStyle = 'rgba(90,70,50,.6)'; g.lineWidth = 2; for (let x = x0 + 4; x < x1; x += 10) { g.beginPath(); g.moveTo(x, y - 7); g.lineTo(x, y + 7); g.stroke(); }
      g.strokeStyle = '#4a4f6b'; g.lineWidth = 2; [-4, 4].forEach(k => { g.beginPath(); g.moveTo(x0, y + k); g.lineTo(x1, y + k); g.stroke(); });
    } else if (d.type === 'pipe') {
      g.lineJoin = 'round'; g.strokeStyle = '#3d5a5e'; g.lineWidth = 6; g.beginPath(); d.at.forEach((p, i) => i ? g.lineTo(...p) : g.moveTo(...p)); g.stroke();
      g.strokeStyle = '#7fa6a8'; g.lineWidth = 2; g.stroke();
      g.fillStyle = '#c9a23a'; d.at.forEach((p, i) => { if (i && i < d.at.length - 1) { g.beginPath(); g.arc(p[0], p[1], 4.5, 0, TAU); g.fill(); } });
    } else if (d.type === 'plate') {   // weighbridge
      const [x, y, w, h] = d.at; g.fillStyle = '#b9b3a6'; g.strokeStyle = 'rgba(28,36,80,.6)'; g.lineWidth = 2; g.fillRect(x, y, w, h); g.strokeRect(x, y, w, h);
      g.strokeStyle = 'rgba(28,36,80,.25)'; g.lineWidth = 1; for (let k = 6; k < w + h; k += 8) { g.beginPath(); g.moveTo(x + Math.min(k, w), y + Math.max(0, k - w)); g.lineTo(x + Math.max(0, k - h), y + Math.min(k, h)); g.stroke(); }
    } else if (d.type === 'grate') {
      const [x, y, w, h] = d.at; g.fillStyle = '#4a4f6b'; g.fillRect(x, y, w, h); g.strokeStyle = '#c9c4b4'; g.lineWidth = 1.5; for (let k = 4; k < w; k += 5) { g.beginPath(); g.moveTo(x + k, y + 2); g.lineTo(x + k, y + h - 2); g.stroke(); }
    } else if (d.type === 'glow') {
      const [x, y, r] = d.at, gr = g.createRadialGradient(x, y, 2, x, y, r); gr.addColorStop(0, 'rgba(255,214,120,.55)'); gr.addColorStop(1, 'rgba(255,214,120,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    } else if (d.type === 'beam') {   // the gantry crane's bridge, overhead
      const [a, b] = d.at; g.strokeStyle = 'rgba(201,140,40,.75)'; g.lineWidth = 9; g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke();
      g.strokeStyle = 'rgba(28,36,80,.5)'; g.lineWidth = 1.5; g.setLineDash([5, 5]); g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke(); g.setLineDash([]);
      const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; g.fillStyle = '#4a4f6b'; g.fillRect(m[0] - 7, m[1] - 7, 14, 14); g.strokeStyle = INK; g.lineWidth = 1.5; g.strokeRect(m[0] - 7, m[1] - 7, 14, 14);
    } else if (d.type === 'awning') {   // a stall front against a wall: a striped canopy
      const [x, y, w, h] = d.at; g.fillStyle = '#fffaf0'; g.fillRect(x, y, w, h); g.fillStyle = d.col || '#d8574a'; for (let k = 0; k < w; k += 12) g.fillRect(x + k, y, Math.min(6, w - k), h); g.strokeStyle = 'rgba(28,36,80,.6)'; g.lineWidth = 1.5; g.strokeRect(x, y, w, h);
    } else if (d.type === 'rosette') {   // a mosaic set into the floor
      const [x, y, r] = d.at; g.strokeStyle = d.col || 'rgba(60,110,140,.5)'; g.lineWidth = 2; [1, .66, .33].forEach(k => { g.beginPath(); g.arc(x, y, r * k, 0, TAU); g.stroke(); }); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; g.beginPath(); g.moveTo(x + Math.cos(a) * r * .33, y + Math.sin(a) * r * .33); g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); g.stroke(); }
    } else if (d.type === 'stripe') {   // hazard chevrons painted on the floor
      const [x, y, w, h] = d.at; g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.fillStyle = 'rgba(232,180,40,.75)'; g.fillRect(x, y, w, h); g.strokeStyle = 'rgba(30,30,40,.7)'; g.lineWidth = 4; for (let k = -h; k < w + h; k += 11) { g.beginPath(); g.moveTo(x + k, y + h); g.lineTo(x + k + h, y); g.stroke(); } g.restore();
    } else if (d.type === 'pool') {   // standing water
      const [x, y, r] = d.at; g.fillStyle = d.col || 'rgba(110,170,195,.4)'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 1.2; g.beginPath(); g.arc(x, y, r * .6, .4, 2.2); g.stroke();
    } else if (d.type === 'water') {   // the tide beyond the quay wall
      const [x, y, w, h] = d.at; g.fillStyle = 'rgba(120,180,205,.5)'; g.beginPath(); g.roundRect(x, y, w, h, 6); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1.5; for (let k = 14; k < w - 20; k += 46) { g.beginPath(); g.moveTo(x + k, y + h / 2); g.quadraticCurveTo(x + k + 8, y + h / 2 - 4, x + k + 16, y + h / 2); g.stroke(); }
    }
    g.restore();
  }

  // upright things, top-down
  function prop(g, p) {
    const r = p.r; g.save(); g.translate(p.x, p.y); g.lineWidth = 1.5; g.strokeStyle = INK;
    g.fillStyle = 'rgba(28,36,80,.14)'; g.beginPath(); g.arc(2, 3, r + 1, 0, TAU); g.fill();
    const disc = (col, rr = r) => { g.fillStyle = col; g.beginPath(); g.arc(0, 0, rr, 0, TAU); g.fill(); g.stroke(); };
    if (p.type === 'heap' || p.type === 'coal') {
      const dark = p.type === 'coal'; disc(p.col || (dark ? '#3a3640' : '#fbf9f4'));
      g.strokeStyle = dark ? 'rgba(255,255,255,.25)' : 'rgba(120,110,95,.45)'; g.lineWidth = 1; [.65, .32].forEach(k => { g.beginPath(); g.arc(-r * .08, -r * .08, r * k, 0, TAU); g.stroke(); });
    } else if (p.type === 'sacks') {
      g.fillStyle = '#d9c08a'; [[-r * .45, -r * .3], [r * .4, -r * .2], [-r * .05, r * .4]].forEach(([x, y], i) => { g.save(); g.translate(x, y); g.rotate(i * .9); g.beginPath(); g.roundRect(-r * .55, -r * .38, r * 1.1, r * .76, r * .25); g.fill(); g.stroke(); g.restore(); });
    } else if (p.type === 'barrel') { disc('#a8703c'); g.beginPath(); g.arc(0, 0, r * .6, 0, TAU); g.stroke(); }
    else if (p.type === 'bollard') disc('#4a4f6b');
    else if (p.type === 'post') { g.fillStyle = '#c98c28'; g.fillRect(-r, -r, r * 2, r * 2); g.strokeRect(-r, -r, r * 2, r * 2); }
    else if (p.type === 'vat') { disc('#b8763c'); g.fillStyle = p.col || '#bfe0ea'; g.beginPath(); g.arc(0, 0, r * .72, 0, TAU); g.fill(); g.stroke(); g.fillStyle = 'rgba(255,255,255,.8)'; [[-.25, -.2], [.2, .15], [-.05, .3]].forEach(([x, y]) => { g.beginPath(); g.arc(x * r, y * r, r * .14, 0, TAU); g.fill(); }); }
    else if (p.type === 'stack') { disc('#9c5646'); disc('#2a2530', r * .5); }
    else if (p.type === 'pump') {
      g.fillStyle = '#6f8f92'; g.beginPath(); g.roundRect(-r * 1.3, -r * .8, r * 2.6, r * 1.6, 4); g.fill(); g.stroke();
      g.strokeStyle = '#c9a23a'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, r * .55, 0, TAU); g.stroke(); g.lineWidth = 1.5; for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI; g.beginPath(); g.moveTo(Math.cos(a) * r * .55, Math.sin(a) * r * .55); g.lineTo(-Math.cos(a) * r * .55, -Math.sin(a) * r * .55); g.stroke(); }
    } else if (p.type === 'tub') { g.fillStyle = '#4a4f6b'; g.beginPath(); g.roundRect(-r * 1.2, -r * .8, r * 2.4, r * 1.6, 3); g.fill(); g.stroke(); g.fillStyle = '#fbf9f4'; g.beginPath(); g.ellipse(0, 0, r * .85, r * .5, 0, 0, TAU); g.fill(); }
    else if (p.type === 'rack') { g.fillStyle = '#c9a877'; g.fillRect(-r * 1.8, -r * .45, r * 3.6, r * .9); g.strokeRect(-r * 1.8, -r * .45, r * 3.6, r * .9); g.lineWidth = 1; for (let x = -r * 1.4; x < r * 1.8; x += r * .5) { g.beginPath(); g.moveTo(x, -r * .45); g.lineTo(x, r * .45); g.stroke(); } }
    else if (p.type === 'pot') { disc(p.col || '#c9744a'); g.fillStyle = '#5a2f1c'; g.beginPath(); g.arc(0, 0, r * .5, 0, TAU); g.fill(); }
    else if (p.type === 'kiln') { disc('#a85c44'); g.strokeStyle = 'rgba(60,20,16,.45)'; g.lineWidth = 1; [.75, .5].forEach(k => { g.beginPath(); g.arc(0, 0, r * k, 0, TAU); g.stroke(); }); g.fillStyle = '#ffb347'; g.beginPath(); g.arc(0, 0, r * .28, 0, TAU); g.fill(); }
    else if (p.type === 'planter') { disc('#e3d6b6'); g.fillStyle = p.col || '#6aa35a'; for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; g.beginPath(); g.arc(Math.cos(a) * r * .35, Math.sin(a) * r * .35, r * .45, 0, TAU); g.fill(); } }
    else if (p.type === 'bench') { g.rotate(p.rot || 0); g.fillStyle = '#b98a58'; g.beginPath(); g.roundRect(-r * 1.6, -r * .5, r * 3.2, r, 2); g.fill(); g.stroke(); g.lineWidth = 1; g.beginPath(); g.moveTo(-r * 1.6, 0); g.lineTo(r * 1.6, 0); g.stroke(); }
    else if (p.type === 'tank') { disc('#8fa3ad'); g.fillStyle = p.col || '#7fd0b0'; g.beginPath(); g.arc(0, 0, r * .62, 0, TAU); g.fill(); g.stroke(); g.fillStyle = INK; [0, 1, 2, 3].forEach(i => { const a = i / 4 * TAU + .78; g.beginPath(); g.arc(Math.cos(a) * r * .82, Math.sin(a) * r * .82, 1.3, 0, TAU); g.fill(); }); }
    else if (p.type === 'console') { g.rotate(p.rot || 0); g.fillStyle = '#5d6b78'; g.beginPath(); g.roundRect(-r * 1.3, -r * .6, r * 2.6, r * 1.2, 2); g.fill(); g.stroke(); ['#7fe0a0', '#ffd24a', '#ff7a5a'].forEach((c, i) => { g.fillStyle = c; g.fillRect(-r * .9 + i * r * .7, -r * .25, r * .4, r * .5); }); }
    else if (p.type === 'reeds') { g.strokeStyle = '#5c8a46'; g.lineWidth = 1.6; for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * r, Math.sin(a) * r); g.stroke(); } g.fillStyle = '#7a5a3a'; g.beginPath(); g.arc(0, 0, r * .25, 0, TAU); g.fill(); }
    else if (p.type === 'valve') { g.strokeStyle = '#c9a23a'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke(); g.fillStyle = INK; g.beginPath(); g.arc(0, 0, r * .3, 0, TAU); g.fill(); }
    g.restore();
  }

  /* A map either carries finished dressing (map.dress, as Saltworks does) or a spec to build it from (map.dressSpec):
       rooms:  { id: { mat, sky, lab, put: [type or { type, r, col }...] } }   put = props stood along that room's walls
       decals, props: hand-placed, as in map.dress
     Wall props are placed by a seeded shuffle of spots along the walls, clear of doorways, cover crates, posts and hazards. */
  const SIZE = { heap: 10, coal: 10, sacks: 9, barrel: 7, bollard: 3.5, vat: 11, pot: 5.5, kiln: 14, planter: 8, bench: 6, tank: 11, console: 7, rack: 7, reeds: 9, pump: 10, tub: 8, stack: 12, valve: 6 };
  function build(map) {
    const sp = map.dressSpec, P = map.P, R = rnd(sp.seed || 11), props = [...(sp.props || [])], avoid = [];
    P.doors.forEach(d => avoid.push([d.m[0], d.m[1], d.gw / 2 + 18]));
    (map.cover || []).forEach(c => avoid.push([c[0], c[1], 24])); (map.posts || []).forEach(p => avoid.push([p.x, p.y, 20]));
    const seg = (a, b, r) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1]); for (let k = 0; k <= L; k += 12) avoid.push([a[0] + (b[0] - a[0]) * k / L, a[1] + (b[1] - a[1]) * k / L, r]); };
    (map.hazards || []).forEach(h => {
      const r = (h.r || h.w || 12) + 16;
      if (h.x != null) avoid.push([h.x, h.y, (h.R || h.len || h.L || 0) * (h.type === 'leash' ? .3 : 1) + r]);
      if (h.a && h.b) seg(h.a, h.b, r); if (h.at) h.at.forEach(p => avoid.push([p[0], p[1], 26]));
      if (h.pts) h.pts.forEach((p, i) => { avoid.push([p[0], p[1], r]); if (i) seg(h.pts[i - 1], p, r); });
      if (h.box) for (let x = h.box[0]; x <= h.box[2]; x += 20) for (let y = h.box[1]; y <= h.box[3]; y += 20) avoid.push([x, y, 24]);
    });
    (sp.decals || []).forEach(d => { if (d.keep) avoid.push(d.keep); });
    props.forEach(p => avoid.push([p.x, p.y, p.r + 12]));
    const inside = (r, x, y) => { if (r.circle) return Math.hypot(x - r.circle[0], y - r.circle[1]) < r.circle[2]; let c = false; const p = r.pts; for (let i = 0, j = p.length - 1; i < p.length; j = i++) if ((p[i][1] > y) !== (p[j][1] > y) && x < (p[j][0] - p[i][0]) * (y - p[i][1]) / (p[j][1] - p[i][1]) + p[i][0]) c = !c; return c; };
    Object.entries(sp.rooms).forEach(([id, o]) => {
      const r = P.rooms[id]; if (!r) return;
      r.mat = o.mat; if (o.sky) r.sky = true; if (o.lab && !r.lab) r.lab = o.lab; if (o.labAt) r.labAt = o.labAt;
      if (!r.tint || r.tint === '#efe4cc') r.tint = MATS[o.mat].tint;
      const spots = [], IN = 14;
      if (r.circle) { const n = Math.floor(TAU * (r.circle[2] - IN) / 28); for (let i = 0; i < n; i++) { const a = i / n * TAU; spots.push([r.circle[0] + Math.cos(a) * (r.circle[2] - IN), r.circle[1] + Math.sin(a) * (r.circle[2] - IN), a]); } }
      else r.pts.forEach((p, i) => { const q = r.pts[(i + 1) % r.pts.length], ex = q[0] - p[0], ey = q[1] - p[1], L = Math.hypot(ex, ey); let nx = -ey / L, ny = ex / L; if ((r.c[0] - p[0]) * nx + (r.c[1] - p[1]) * ny < 0) { nx = -nx; ny = -ny; } for (let k = 18; k <= L - 18; k += 26) spots.push([p[0] + ex / L * k + nx * IN, p[1] + ey / L * k + ny * IN, Math.atan2(ey, ex)]); });
      for (let i = spots.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [spots[i], spots[j]] = [spots[j], spots[i]]; }
      (o.put || []).forEach(want => {
        const w = typeof want === 'string' ? { type: want } : want, pr = w.r || SIZE[w.type] || 8;
        const k = spots.findIndex(([x, y]) => inside(r, x, y) && !Object.values(P.rooms).some(q => q !== r && inside(q, x, y)) && !avoid.some(a => Math.hypot(a[0] - x, a[1] - y) < a[2] + pr * .6));
        if (k < 0) return; const [x, y, rot] = spots.splice(k, 1)[0]; props.push({ ...w, x, y, r: pr, rot }); avoid.push([x, y, pr + 13]);
      });
    });
    return { name: sp.name, decals: sp.decals || [], props, planProps: (map.cover || []).map(c => ({ type: 'crate', x: c[0], y: c[1], r: 9 })) };
  }
  const dressOf = map => map.dress || (map.dressSpec ? (map.dress = build(map)) : null);
  function paint(g, map) {
    const th = dressOf(map); if (!th) return;
    Object.values(map.P.rooms).forEach((r, i) => { if (r.mat) floor(g, r, 7 + i * 31); });
    th.decals.forEach(d => decal(g, d));
    th.props.forEach(p => prop(g, p));
  }
  // first person also stands up the plan's own crates and columns
  const props = map => { const th = dressOf(map); return th ? [...th.props, ...th.planProps] : []; };

  // heights are in world units; a wall is 64 tall and the eye is at 32
  function fp(g, p, x, fl, k) {
    const r = p.r * k, up = h => fl - h * k, ol = Math.max(1, Math.min(2.5, k * .9)); g.lineWidth = ol; g.strokeStyle = INK; g.lineJoin = 'round';
    const mound = (col, w, h, hi) => { g.fillStyle = col; g.beginPath(); g.moveTo(x - w, fl); g.quadraticCurveTo(x - w * .35, up(h) - h * k * .25, x + w * .1, up(h)); g.quadraticCurveTo(x + w * .6, up(h * .6), x + w, fl); g.closePath(); g.fill(); g.stroke(); g.fillStyle = hi; g.beginPath(); g.moveTo(x - w * .6, fl - h * k * .2); g.quadraticCurveTo(x - w * .25, up(h * .85), x, up(h * .9)); g.quadraticCurveTo(x - w * .2, up(h * .5), x - w * .6, fl - h * k * .2); g.fill(); };
    const rect = (col, w, h0, h1, rad = 0) => { g.fillStyle = col; g.beginPath(); g.roundRect(x - w, up(h1), w * 2, (h1 - h0) * k, rad); g.fill(); g.stroke(); };
    const shade = (w, h0, h1) => { const s = g.createLinearGradient(x - w, 0, x + w, 0); s.addColorStop(0, 'rgba(0,0,0,.28)'); s.addColorStop(.35, 'rgba(255,255,255,.18)'); s.addColorStop(1, 'rgba(0,0,0,.34)'); g.fillStyle = s; g.fillRect(x - w, up(h1), w * 2, (h1 - h0) * k); };
    g.fillStyle = 'rgba(40,30,20,.2)'; g.beginPath(); g.ellipse(x, fl, r * 1.15, Math.max(1.5, r * .22), 0, 0, TAU); g.fill();
    switch (p.type) {
      case 'heap': mound(p.col || '#fbf9f4', r, p.r * 1.3, 'rgba(255,255,255,.5)'); break;
      case 'coal': mound('#3a3640', r, p.r * 1.2, 'rgba(255,255,255,.12)'); break;
      case 'sacks': [[-.45, 0, 9], [.45, 0, 9], [0, 9, 18]].forEach(([dx, h0, h1]) => { g.fillStyle = '#d9c08a'; g.beginPath(); g.roundRect(x + (dx - .55) * r, up(h1), r * 1.1, (h1 - h0) * k, 3 * Math.min(k, 2)); g.fill(); g.stroke(); }); break;
      case 'barrel': rect('#a8703c', r * .85, 0, 26, 4 * Math.min(k, 2)); shade(r * .85, 0, 26); g.fillStyle = '#4a4f6b'; [6, 19].forEach(h => g.fillRect(x - r * .85, up(h + 2), r * 1.7, 2 * k)); break;
      case 'bollard': rect('#4a4f6b', r * .8, 0, 14, 2); g.fillStyle = '#c9a23a'; g.fillRect(x - r * .8, up(12), r * 1.6, 2 * k); break;
      case 'post': rect('#c98c28', r, 0, 64); shade(r, 0, 64); g.fillStyle = 'rgba(28,36,80,.55)'; for (let h = 8; h < 64; h += 16) g.fillRect(x - r, up(h + 2), r * 2, 2 * k); break;
      case 'column': rect('#1c2450', r, 0, 64); shade(r, 0, 64); break;
      case 'stack': rect('#9c5646', r, 0, 64); shade(r, 0, 64); g.fillStyle = 'rgba(60,20,16,.35)'; for (let h = 6; h < 64; h += 8) g.fillRect(x - r, up(h + 1), r * 2, Math.max(1, k)); break;
      case 'vat': rect('#b8763c', r, 0, 20, 3); shade(r, 0, 20); g.fillStyle = '#bfe0ea'; g.beginPath(); g.ellipse(x, up(20), r, Math.max(1.5, r * .2), 0, 0, TAU); g.fill(); g.stroke(); g.fillStyle = 'rgba(255,255,255,.5)'; [[-.3, 30, .5], [.2, 40, .65], [-.05, 52, .8]].forEach(([dx, h, s]) => { g.beginPath(); g.arc(x + dx * r, up(h), r * s * .45, 0, TAU); g.fill(); }); break;
      case 'pump': rect('#6f8f92', r * 1.3, 0, 26, 3); shade(r * 1.3, 0, 26); rect('#55777a', r * .45, 26, 44); g.strokeStyle = '#c9a23a'; g.lineWidth = Math.max(1.5, 3 * Math.min(k, 2)); g.beginPath(); g.arc(x, up(16), 8 * k, 0, TAU); g.stroke(); g.beginPath(); g.moveTo(x - 8 * k, up(16)); g.lineTo(x + 8 * k, up(16)); g.moveTo(x, up(8)); g.lineTo(x, up(24)); g.stroke(); break;
      case 'tub': g.fillStyle = '#fbf9f4'; g.beginPath(); g.ellipse(x, up(16), r, 5 * k, 0, Math.PI, TAU); g.fill(); g.stroke(); g.fillStyle = '#4a4f6b'; g.beginPath(); g.moveTo(x - r * 1.2, up(16)); g.lineTo(x + r * 1.2, up(16)); g.lineTo(x + r * .9, up(4)); g.lineTo(x - r * .9, up(4)); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#1c2450'; [-.6, .6].forEach(dx => { g.beginPath(); g.arc(x + dx * r, up(3), 3 * k, 0, TAU); g.fill(); }); break;
      case 'rack': g.fillStyle = '#8a6a44'; [-1.7, 1.6].forEach(dx => g.fillRect(x + dx * r, up(36), Math.max(1.5, r * .12), 36 * k)); [10, 22, 34].forEach(h => { g.fillStyle = '#c9a877'; g.fillRect(x - r * 1.7, up(h + 2), r * 3.4, 2.5 * k); g.fillStyle = '#fbf9f4'; g.fillRect(x - r * 1.5, up(h + 5), r * 3, 3 * k); }); break;
      case 'valve': g.fillStyle = '#4a4f6b'; g.fillRect(x - 1.5 * k, up(30), 3 * k, 30 * k); g.strokeStyle = '#c9a23a'; g.lineWidth = Math.max(1.5, 3 * Math.min(k, 2)); g.beginPath(); g.arc(x, up(34), r, 0, TAU); g.stroke(); break;
      case 'pot': rect(p.col || '#c9744a', r * .9, 0, p.r * 2.2, 4 * Math.min(k, 2)); shade(r * .9, 0, p.r * 2.2); break;
      case 'kiln': mound('#a85c44', r * 1.1, p.r * 2.6, 'rgba(255,255,255,.12)'); g.fillStyle = '#ffb347'; g.beginPath(); g.arc(x, up(p.r * .7), r * .35, Math.PI, TAU); g.fill(); break;
      case 'planter': rect('#e3d6b6', r * .8, 0, 12, 2); g.fillStyle = p.col || '#6aa35a'; [[-.4, 20, .6], [.4, 22, .6], [0, 30, .7]].forEach(([dx, h, s]) => { g.beginPath(); g.arc(x + dx * r, up(h), r * s, 0, TAU); g.fill(); }); break;
      case 'reeds': g.strokeStyle = '#5c8a46'; g.lineWidth = Math.max(1, 2 * Math.min(k, 2)); [-.6, -.3, 0, .3, .6].forEach(dx => { g.beginPath(); g.moveTo(x + dx * r * .5, fl); g.lineTo(x + dx * r * 1.4, up(34)); g.stroke(); }); break;
      case 'bench': rect('#b98a58', r * 1.6, 8, 13, 2); g.fillStyle = '#8a6a44'; [-1.3, 1.2].forEach(dx => g.fillRect(x + dx * r, up(8), Math.max(1.5, r * .15), 8 * k)); break;
      case 'tank': rect('#8fa3ad', r, 0, 40, 5 * Math.min(k, 2)); shade(r, 0, 40); g.fillStyle = p.col || '#7fd0b0'; g.fillRect(x - r * .25, up(32), r * .5, 22 * k); break;
      case 'console': rect('#5d6b78', r * 1.3, 0, 24, 2); ['#7fe0a0', '#ffd24a', '#ff7a5a'].forEach((c, i) => { g.fillStyle = c; g.fillRect(x - r * .9 + i * r * .7, up(21), r * .4, 5 * k); }); break;
      case 'crate': rect('#c99c6c', r, 0, p.r * 2); g.strokeStyle = '#6b4424'; g.beginPath(); g.moveTo(x - r, fl); g.lineTo(x + r, up(p.r * 2)); g.moveTo(x + r, fl); g.lineTo(x - r, up(p.r * 2)); g.stroke(); break;
    }
  }
  // floor decals worth seeing from the ground: pans and the weighbridge, as { pts, fill, line }
  const flats = map => !dressOf(map) ? [] : dressOf(map).decals.filter(d => d.type === 'pan' || d.type === 'plate').map(d => { const [x, y, w, h] = d.at; return { pts: [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], inner: d.type === 'pan' ? [[x + 4, y + 4], [x + w - 4, y + 4], [x + w - 4, y + h - 4], [x + 4, y + h - 4]] : null, fill: d.type === 'pan' ? '#ffffff' : '#b9b3a6', fill2: d.col || '#bfe0ea', x: x + w / 2, y: y + h / 2 }; });
  root.FPSTHEME = { MATS, paint, props, fp, flats, dressOf };
})(typeof window !== 'undefined' ? window : globalThis);
