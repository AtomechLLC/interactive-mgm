/* Dressing for a themed map (map.theme, see map.js): floor materials, floor decals and props, for both views.
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
    soot:   { tint: '#dcd6d0', wall: [84, 78, 84], wall2: [62, 58, 66], floor: ['#c9c2ba', '#8f8880'], lines: 'brick', dim: true },
  };
  const rnd = s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  const shape = (g, r) => { g.beginPath(); r.pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); };
  const box = r => { const xs = r.pts.map(p => p[0]), ys = r.pts.map(p => p[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; };

  function floor(g, r, seed) {
    const [x0, y0, x1, y1] = box(r), R = rnd(seed), wide = x1 - x0 >= y1 - y0;
    g.save(); shape(g, r); g.clip(); g.lineWidth = 1;
    if (r.mat === 'plank') {
      g.strokeStyle = 'rgba(120,80,40,.3)'; g.beginPath();
      if (wide) { for (let x = x0; x < x1; x += 9) { g.moveTo(x, y0); g.lineTo(x, y1); } } else for (let y = y0; y < y1; y += 9) { g.moveTo(x0, y); g.lineTo(x1, y); }
      g.stroke();
    } else if (r.mat === 'brick' || r.mat === 'soot') {
      g.strokeStyle = r.mat === 'soot' ? 'rgba(40,36,44,.22)' : 'rgba(120,50,36,.25)'; g.beginPath();
      for (let y = y0, i = 0; y < y1; y += 7, i++) { g.moveTo(x0, y); g.lineTo(x1, y); for (let x = x0 + (i % 2 ? 7 : 0); x < x1; x += 14) { g.moveTo(x, y); g.lineTo(x, y + 7); } }
      g.stroke();
      if (r.mat === 'soot') { g.fillStyle = 'rgba(30,28,36,.25)'; for (let i = 0; i < (x1 - x0) * (y1 - y0) / 90; i++) g.fillRect(x0 + R() * (x1 - x0), y0 + R() * (y1 - y0), 2, 2); }
    } else if (r.mat === 'cobble') {
      g.strokeStyle = 'rgba(110,96,70,.3)';
      for (let y = y0 + 5, i = 0; y < y1; y += 9, i++) for (let x = x0 + (i % 2 ? 9 : 4); x < x1; x += 10) { g.beginPath(); g.arc(x, y, 3.6, 0, TAU); g.stroke(); }
    } else if (r.mat === 'salt') {
      g.fillStyle = 'rgba(255,255,255,.9)'; for (let i = 0; i < (x1 - x0) * (y1 - y0) / 60; i++) { g.beginPath(); g.arc(x0 + R() * (x1 - x0), y0 + R() * (y1 - y0), .8 + R() * 1.6, 0, TAU); g.fill(); }
      g.strokeStyle = 'rgba(150,140,125,.3)'; for (let i = 0; i < (x1 - x0) * (y1 - y0) / 1500; i++) { let x = x0 + R() * (x1 - x0), y = y0 + R() * (y1 - y0); g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (R() - .5) * 26; y += (R() - .5) * 26; g.lineTo(x, y); } g.stroke(); }
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
      const dark = p.type === 'coal'; disc(dark ? '#3a3640' : '#fbf9f4');
      g.strokeStyle = dark ? 'rgba(255,255,255,.25)' : 'rgba(120,110,95,.45)'; g.lineWidth = 1; [.65, .32].forEach(k => { g.beginPath(); g.arc(-r * .08, -r * .08, r * k, 0, TAU); g.stroke(); });
    } else if (p.type === 'sacks') {
      g.fillStyle = '#d9c08a'; [[-r * .45, -r * .3], [r * .4, -r * .2], [-r * .05, r * .4]].forEach(([x, y], i) => { g.save(); g.translate(x, y); g.rotate(i * .9); g.beginPath(); g.roundRect(-r * .55, -r * .38, r * 1.1, r * .76, r * .25); g.fill(); g.stroke(); g.restore(); });
    } else if (p.type === 'barrel') { disc('#a8703c'); g.beginPath(); g.arc(0, 0, r * .6, 0, TAU); g.stroke(); }
    else if (p.type === 'bollard') disc('#4a4f6b');
    else if (p.type === 'post') { g.fillStyle = '#c98c28'; g.fillRect(-r, -r, r * 2, r * 2); g.strokeRect(-r, -r, r * 2, r * 2); }
    else if (p.type === 'vat') { disc('#b8763c'); g.fillStyle = '#bfe0ea'; g.beginPath(); g.arc(0, 0, r * .72, 0, TAU); g.fill(); g.stroke(); g.fillStyle = 'rgba(255,255,255,.8)'; [[-.25, -.2], [.2, .15], [-.05, .3]].forEach(([x, y]) => { g.beginPath(); g.arc(x * r, y * r, r * .14, 0, TAU); g.fill(); }); }
    else if (p.type === 'stack') { disc('#9c5646'); disc('#2a2530', r * .5); }
    else if (p.type === 'pump') {
      g.fillStyle = '#6f8f92'; g.beginPath(); g.roundRect(-r * 1.3, -r * .8, r * 2.6, r * 1.6, 4); g.fill(); g.stroke();
      g.strokeStyle = '#c9a23a'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, r * .55, 0, TAU); g.stroke(); g.lineWidth = 1.5; for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI; g.beginPath(); g.moveTo(Math.cos(a) * r * .55, Math.sin(a) * r * .55); g.lineTo(-Math.cos(a) * r * .55, -Math.sin(a) * r * .55); g.stroke(); }
    } else if (p.type === 'tub') { g.fillStyle = '#4a4f6b'; g.beginPath(); g.roundRect(-r * 1.2, -r * .8, r * 2.4, r * 1.6, 3); g.fill(); g.stroke(); g.fillStyle = '#fbf9f4'; g.beginPath(); g.ellipse(0, 0, r * .85, r * .5, 0, 0, TAU); g.fill(); }
    else if (p.type === 'rack') { g.fillStyle = '#c9a877'; g.fillRect(-r * 1.8, -r * .45, r * 3.6, r * .9); g.strokeRect(-r * 1.8, -r * .45, r * 3.6, r * .9); g.lineWidth = 1; for (let x = -r * 1.4; x < r * 1.8; x += r * .5) { g.beginPath(); g.moveTo(x, -r * .45); g.lineTo(x, r * .45); g.stroke(); } }
    else if (p.type === 'valve') { g.strokeStyle = '#c9a23a'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke(); g.fillStyle = INK; g.beginPath(); g.arc(0, 0, r * .3, 0, TAU); g.fill(); }
    g.restore();
  }

  function paint(g, map) {
    const th = map.theme; if (!th) return;
    Object.values(map.P.rooms).forEach((r, i) => { if (r.pts && r.mat) floor(g, r, 7 + i * 31); });
    th.decals.forEach(d => decal(g, d));
    th.props.forEach(p => prop(g, p));
  }
  // first person also stands up the plan's own crates and columns
  const props = map => map.theme ? [...map.theme.props, ...map.theme.planProps] : [];

  // heights are in world units; a wall is 64 tall and the eye is at 32
  function fp(g, p, x, fl, k) {
    const r = p.r * k, up = h => fl - h * k, ol = Math.max(1, Math.min(2.5, k * .9)); g.lineWidth = ol; g.strokeStyle = INK; g.lineJoin = 'round';
    const mound = (col, w, h, hi) => { g.fillStyle = col; g.beginPath(); g.moveTo(x - w, fl); g.quadraticCurveTo(x - w * .35, up(h) - h * k * .25, x + w * .1, up(h)); g.quadraticCurveTo(x + w * .6, up(h * .6), x + w, fl); g.closePath(); g.fill(); g.stroke(); g.fillStyle = hi; g.beginPath(); g.moveTo(x - w * .6, fl - h * k * .2); g.quadraticCurveTo(x - w * .25, up(h * .85), x, up(h * .9)); g.quadraticCurveTo(x - w * .2, up(h * .5), x - w * .6, fl - h * k * .2); g.fill(); };
    const rect = (col, w, h0, h1, rad = 0) => { g.fillStyle = col; g.beginPath(); g.roundRect(x - w, up(h1), w * 2, (h1 - h0) * k, rad); g.fill(); g.stroke(); };
    const shade = (w, h0, h1) => { const s = g.createLinearGradient(x - w, 0, x + w, 0); s.addColorStop(0, 'rgba(0,0,0,.28)'); s.addColorStop(.35, 'rgba(255,255,255,.18)'); s.addColorStop(1, 'rgba(0,0,0,.34)'); g.fillStyle = s; g.fillRect(x - w, up(h1), w * 2, (h1 - h0) * k); };
    g.fillStyle = 'rgba(40,30,20,.2)'; g.beginPath(); g.ellipse(x, fl, r * 1.15, Math.max(1.5, r * .22), 0, 0, TAU); g.fill();
    switch (p.type) {
      case 'heap': mound('#fbf9f4', r, p.r * 1.3, 'rgba(255,255,255,.9)'); break;
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
      case 'crate': rect('#c99c6c', r, 0, p.r * 2); g.strokeStyle = '#6b4424'; g.beginPath(); g.moveTo(x - r, fl); g.lineTo(x + r, up(p.r * 2)); g.moveTo(x + r, fl); g.lineTo(x - r, up(p.r * 2)); g.stroke(); break;
    }
  }
  // floor decals worth seeing from the ground: pans and the weighbridge, as { pts, fill, line }
  const flats = map => !map.theme ? [] : map.theme.decals.filter(d => d.type === 'pan' || d.type === 'plate').map(d => { const [x, y, w, h] = d.at; return { pts: [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], inner: d.type === 'pan' ? [[x + 4, y + 4], [x + w - 4, y + 4], [x + w - 4, y + h - 4], [x + 4, y + h - 4]] : null, fill: d.type === 'pan' ? '#ffffff' : '#b9b3a6', fill2: d.col || '#bfe0ea', x: x + w / 2, y: y + h / 2 }; });
  root.FPSTHEME = { MATS, paint, props, fp, flats };
})(typeof window !== 'undefined' ? window : globalThis);
