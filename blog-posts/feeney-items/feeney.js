/* Brian Feeney's magic items, three spikes. Data in items.js (FEENEY); the item text is quoted from his sheet.
   answers: five common D&D problems, each played out with the three classic answers and then four of Brian's items.
            One scene per problem; every answer is a short timed script (ANIM) over the same scene.
   sort:    the 20 items dropped into what they change: remove the roll, move it, change the scene, change the stakes.
   loot:    hand one item to each of four players and watch who can lead an answer to each problem.
   GIF hooks: __seek(t, which) / __dur(which), which = door, chasm, guards, ambush, flood, sort or loot. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;
  const { CLASSES, BINS, ITEMS, PROBLEMS } = FEENEY;
  const W = 1040, H = 585;
  const ic = (g, n, x, y, s, col, ang) => GX.draw(g, n, x, y, s, col, ang);
  const panel = g => { g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(255,252,244,.8)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill(); };
  const txt = (g, s, x, y, font, col = C.ink, al = 'left') => { g.font = font; g.fillStyle = col; g.textAlign = al; g.textBaseline = 'middle'; g.fillText(s, x, y); };
  const box = (g, x, y, w, h, fill, stroke, r = 10, lw = 2) => { g.beginPath(); g.roundRect(x, y, w, h, r); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); } };
  const wrap = (g, s, maxW, font) => {
    g.font = font; const out = []; let line = '';
    s.split(' ').forEach(w => { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; });
    if (line) out.push(line); return out;
  };
  const para = (g, s, x, y, maxW, lh, font, col = C.ink, max = 99) => { wrap(g, s, maxW, font).slice(0, max).forEach((l, i) => txt(g, l, x, y + i * lh, font, col)); };
  const win = (t, a, b) => clamp((t - a) / (b - a));
  const TONE = { g: C.good, y: C.goldInk, r: C.redDk };
  const freeOf = (st, btn) => () => { st.tour = false; btn.classList.remove('on'); };
  const apis = {};

  // a party token: class colour, class icon, white rim
  function tok(g, k, x, y, o = {}) {
    const c = CLASSES[k], s = o.s ?? 1;
    g.save(); g.globalAlpha *= o.a ?? 1;
    if (!o.air) T.shadow(x + 3, y + 5, 17 * s, 13 * s, .25);
    g.translate(x, y); g.scale(s, s);
    g.fillStyle = o.col || c.col; g.strokeStyle = '#fff'; g.lineWidth = 3;
    g.beginPath(); g.arc(0, 0, 17, 0, Math.PI * 2); g.fill(); g.stroke();
    g.strokeStyle = C.navy; g.lineWidth = 1.5; g.beginPath(); g.arc(0, 0, 19.5, 0, Math.PI * 2); g.stroke();
    if (o.dash) { g.setLineDash([4, 4]); g.strokeStyle = c.col; g.lineWidth = 2.5; g.beginPath(); g.arc(0, 0, 23, 0, Math.PI * 2); g.stroke(); g.setLineDash([]); }
    ic(g, o.icon || c.icon, 0, 0, 22, '#fff');
    g.restore();
  }
  // a d20 result card: label, die (or two dice for advantage) + mod against a DC, ticked or crossed
  function rollCard(g, x, y, r, k) {
    const total = r.d + (r.mod || 0), ok = r.ok ?? total >= r.dc;
    const spin = k < .4, a = Math.min(1, k * 6, (1 - k) * 8);
    g.save(); g.globalAlpha = a;
    const w = r.adv ? 270 : 230; box(g, x - w / 2, y - 30, w, 60, 'rgba(255,252,244,.96)', spin ? '#cdbf9f' : ok ? '#5fb47c' : '#e07b72', 10, 2.5);
    ic(g, 'dice-twenty-faces-twenty', x - w / 2 + 26, y + 2, 34, spin ? C.navy : ok ? C.good : C.redDk, spin ? k * 30 : 0);
    txt(g, r.lab, x - w / 2 + 50, y - 13, '700 13px Jost', C.muted);
    let s;
    if (spin) s = String(1 + Math.floor((k * 97 % 1) * 20));
    else if (r.adv) s = `${r.adv[0]} | ${r.adv[1]} → ${r.d}${r.mod ? '+' + r.mod : ''} = ${total} vs ${r.dc}`;
    else s = `${r.d}${r.mod ? ' + ' + r.mod : ''} = ${total} vs ${r.dc}`;
    txt(g, s, x - w / 2 + 50, y + 11, (r.adv ? '800 15px' : '800 17px') + ' Montserrat', spin ? C.ink : ok ? C.good : C.redDk);
    if (!spin) txt(g, ok ? '✓' : '✗', x + w / 2 - 16, y + 10, '800 22px Montserrat', ok ? C.good : C.redDk, 'center');
    g.restore();
  }
  // a small roll chip, for group checks: "W 9 ✗"
  function mini(g, x, y, s, ok, a = 1) {
    g.save(); g.globalAlpha = a; g.font = '700 14px Jost'; const w = g.measureText(s).width + 34;
    box(g, x - w / 2, y - 13, w, 26, ok ? '#d8f0df' : '#f9d9d6', ok ? '#5fb47c' : '#e07b72', 8, 2);
    txt(g, s + (ok ? ' ✓' : ' ✗'), x, y + 1, '700 14px Jost', ok ? C.good : C.redDk, 'center'); g.restore();
  }
  function rings(g, x, y, k, col = '229,50,45') {
    for (let i = 0; i < 3; i++) { const kk = (k * 1.4 - i * .18); if (kk <= 0 || kk >= 1) continue; g.strokeStyle = `rgba(${col},${1 - kk})`; g.lineWidth = 4; g.beginPath(); g.arc(x, y, 14 + kk * 90, 0, Math.PI * 2); g.stroke(); }
  }

  /* An effects list the scripts fill; the scene draws first, then these on top. */
  function FX(g) {
    const L = [];
    return {
      L,
      roll(t, t0, x, y, r, len = 1.25) { const k = (t - t0) / len; if (k >= 0 && k <= 1) L.push(() => rollCard(g, x, y, r, k)); },
      mini(t, t0, x, y, s, ok, len = 2) { const k = (t - t0) / len; if (k >= 0 && k <= 1) L.push(() => mini(g, x, y, s, ok, Math.min(1, k * 8, (1 - k) * 8))); },
      noise(t, t0, x, y, word, col) { const k = (t - t0) / 1.3; if (k >= 0 && k <= 1) L.push(() => { rings(g, x, y, k, col); if (word) T.popText(word, x, y - 40 - k * 20, col ? 'rgb(' + col + ')' : C.redDk, Math.min(1, (1 - k) * 3)); }); },
      pop(t, t0, t1, n, x, y, s = 40, col = C.goldInk) { if (t < t0 || t > t1) return; const k = ease(Math.min(1, (t - t0) / .3)); L.push(() => { g.save(); g.globalAlpha = Math.min(1, (t1 - t) * 4); g.fillStyle = 'rgba(255,252,244,.92)'; g.strokeStyle = col; g.lineWidth = 2.5; g.beginPath(); g.arc(x, y, s * .7 * k, 0, Math.PI * 2); g.fill(); g.stroke(); ic(g, n, x, y, s * k, col); g.restore(); }); },
      say(t, t0, t1, s, x, y, col = C.ink, size = 15) { if (t >= t0 && t <= t1) L.push(() => T.label(s, x, y, 'center', col, size)); },
      big(t, t0, t1, s, x, y, col = C.redDk) { if (t >= t0 && t <= t1) L.push(() => T.popText(s, x, y, col, Math.min(1, (t - t0) * 5, (t1 - t) * 5))); },
      draw(f) { L.push(f); },
      flush() { L.forEach(f => f(g)); },
    };
  }
  // move token k along points between t0 and t1
  const mv = (S, k, t, t0, t1, ...pts) => {
    if (t < t0) return; const u = ease(win(t, t0, t1)), n = pts.length - 1, f = Math.min(n - 1e-9, u * n), i = Math.floor(f), kk = f - i;
    S.pos[k] = [lerp(pts[i][0], pts[i + 1][0], kk), lerp(pts[i][1], pts[i + 1][1], kk)];
  };
  const arc = (S, k, t, t0, t1, a, b, hgt) => { if (t < t0) return; const u = win(t, t0, t1); S.pos[k] = [lerp(a[0], b[0], u), lerp(a[1], b[1], u) - Math.sin(u * Math.PI) * hgt]; if (u > 0 && u < 1) (S.o[k] = S.o[k] || {}).s = 1 + Math.sin(u * Math.PI) * .35, S.o[k].air = 1; };

  /* ---------- scenes ---------- */
  const SB = { x: 20, y: 58, w: 600, h: 384 };
  const clipScene = (g, f) => { g.save(); g.beginPath(); g.roundRect(SB.x, SB.y, SB.w, SB.h, 12); g.clip(); f(); g.restore(); };
  const guard = (g, x, y, ang, st, t) => {
    T.foe(x, y, 17, ang, st === 'owner' ? '#e0a92d' : C.red, { mark: 'shield', a: st === 'gone' ? 0 : 1 });
    if (st === 'asleep') txt(g, 'z Z', x + 18, y - 22 - 3 * Math.sin(t * 3), '800 16px Montserrat', C.muted);
    if (st === 'alert') T.popText('!', x, y - 32, C.redDk, 1);
  };
  const SCENES = {
    door: {
      home: { F: [190, 210], R: [190, 290], W: [110, 210], B: [110, 290] },
      init: S => Object.assign(S, { door: 'shut', guard: 'asleep', gpos: [540, 130], gang: Math.PI / 2 }),
      draw(g, S, t) {
        T.use(g); T.floor(SB.x, SB.y, 380, SB.h); T.floor(410, SB.y, 230, SB.h, .12);
        T.wall(388, SB.y, 22, 157); T.wall(388, 285, 22, SB.y + SB.h - 285);
        ic(g, 'locked-chest', 556, 372, 58, C.goldInk); txt(g, 'the chest', 556, 410, '600 13px Jost', C.muted, 'center');
        const d = S.door;
        if (d === 'shut') { box(g, 390, 215, 18, 70, '#8a5a2b', '#4f2f12', 3, 2); g.fillStyle = '#3d4270'; g.fillRect(390, 230, 18, 4); g.fillRect(390, 266, 18, 4); ic(g, 'padlock', 399, 250, 18, C.gold); }
        if (d === 'open') { g.save(); g.translate(410, 215); g.rotate(-.9); box(g, 0, -9, 70, 18, '#8a5a2b', '#4f2f12', 3, 2); g.restore(); }
        if (d === 'broken') { [[400, 225, .4], [430, 250, -.8], [418, 282, 1.2], [446, 226, .2]].forEach(([x, y, a]) => { g.save(); g.translate(x, y); g.rotate(a); box(g, -16, -5, 32, 10, '#8a5a2b', '#4f2f12', 2, 1.5); g.restore(); }); }
        if (d === 'branches') { [[396, 230, .3], [404, 262, -.5], [392, 280, 1.4]].forEach(([x, y, a]) => ic(g, 'tree-branch', x, y, 34, '#6b7f2a', a)); }
        if (d === 'glass' || d === 'pass') { box(g, 390, 215, 18, 70, 'rgba(160,215,255,.55)', '#57b6ff', 3, 2.5); g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 2; g.beginPath(); g.moveTo(394, 222); g.lineTo(404, 240); g.stroke(); }
        if (d === 'pass') T.bubble(399, 250, 34, t, .6);
        guard(g, S.gpos[0], S.gpos[1], S.gang, S.guard, t);
      },
    },
    chasm: {
      home: { F: [190, 200], R: [190, 300], W: [110, 200], B: [110, 300] },
      init: S => Object.assign(S, { rope: 0, bread: 0 }),
      draw(g, S, t) {
        T.use(g); T.floor(SB.x, SB.y, 222, SB.h); T.floor(400, SB.y, 240, SB.h);
        const gr = g.createLinearGradient(242, 0, 400, 0); gr.addColorStop(0, '#1a1f3d'); gr.addColorStop(.5, '#0b0e22'); gr.addColorStop(1, '#1a1f3d');
        g.fillStyle = gr; g.fillRect(242, SB.y, 158, SB.h);
        g.strokeStyle = 'rgba(255,255,255,.06)'; g.lineWidth = 2; for (let i = 0; i < 7; i++) { g.beginPath(); g.moveTo(250 + i * 21, SB.y); g.lineTo(256 + i * 21 - 6 * Math.sin(i), SB.y + SB.h); g.stroke(); }
        g.fillStyle = '#62688a'; g.fillRect(238, SB.y, 6, SB.h); g.fillRect(398, SB.y, 6, SB.h);
        txt(g, '60 ft drop', 321, 425, '700 14px Jost', '#9aa3d6', 'center');
        g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(246, 84); g.lineTo(396, 84); g.stroke();
        T.label('20 ft', 321, 84, 'center', C.navy, 14);
        ic(g, 'open-gate', 560, 250, 70, C.stoneDk); txt(g, 'the way on', 560, 300, '600 13px Jost', C.muted, 'center');
        if (S.bread > 0) {
          const r = S.bread * 160; g.save(); g.beginPath(); g.ellipse(242, 300, r, r * .55, 0, 0, Math.PI * 2);
          const bg = g.createRadialGradient(242, 300, 4, 242, 300, Math.max(5, r)); bg.addColorStop(0, '#f2cf8e'); bg.addColorStop(.85, '#d89a4c'); bg.addColorStop(1, '#a8682a');
          g.fillStyle = bg; g.fill(); g.strokeStyle = '#7a4a1c'; g.lineWidth = 3; g.stroke(); g.restore();
        }
        if (S.rope > 0) { g.strokeStyle = '#b07a3a'; g.lineWidth = 4; g.setLineDash([7, 4]); g.beginPath(); g.moveTo(236, 250); g.lineTo(lerp(236, 410, S.rope), 250); g.stroke(); g.setLineDash([]); if (S.rope >= 1) ic(g, 'grapple', 414, 250, 22, C.stoneDk); }
      },
    },
    guards: {
      home: { F: [250, 400], R: [310, 400], W: [370, 400], B: [430, 400] },
      init: S => Object.assign(S, { g: [{ x: 280, y: 150, a: Math.PI / 2, st: 'post' }, { x: 380, y: 150, a: Math.PI / 2, st: 'post' }], extra: [], cone: 1 }),
      draw(g, S, t) {
        T.use(g); T.floor(SB.x, SB.y, SB.w, SB.h);
        T.wall(SB.x, SB.y, 280, 56); T.wall(380, SB.y, 260, 56);
        g.fillStyle = '#111530'; g.fillRect(300, SB.y, 80, 56); ic(g, 'dungeon-gate', 340, 86, 50, '#8b8fa8');
        box(g, 520, 130, 110, 120, '#c9b892', C.wall, 6, 3); txt(g, 'barracks', 575, 190, '700 14px Jost', C.ink, 'center'); g.fillStyle = '#5a3a1a'; g.fillRect(516, 175, 8, 30);
        S.g.forEach(q => { if (q.st === 'post' && S.cone) T.cone(q.x, q.y, q.a, .5, 150, S.cone); });
        S.g.forEach(q => guard(g, q.x, q.y, q.a, q.st, t));
        S.extra.forEach(q => T.foe(q[0], q[1], 15, Math.PI, C.red, { mark: 'shield' }));
      },
    },
    ambush: {
      home: { F: [190, 262], R: [145, 262], W: [100, 262], B: [55, 262] },
      init: S => Object.assign(S, { band: [[470, 140], [545, 160], [505, 370], [575, 350]].map(p => ({ x: p[0], y: p[1], a: .18, hp: 1 })), shrooms: [], fake: null }),
      draw(g, S, t) {
        T.use(g); g.fillStyle = '#c6d6a0'; g.fillRect(SB.x, SB.y, SB.w, SB.h);
        g.fillStyle = '#ddc99a'; g.fillRect(SB.x, 222, SB.w, 80); g.strokeStyle = '#c4ad78'; g.lineWidth = 2; g.setLineDash([14, 10]); g.beginPath(); g.moveTo(SB.x, 262); g.lineTo(SB.x + SB.w, 262); g.stroke(); g.setLineDash([]);
        const tree = (x, y, s) => { T.shadow(x + 4, y + 10, s * .4, s * .25, .2); ic(g, 'pine-tree', x, y, s, '#3f6b33'); };
        for (let i = 0; i < 9; i++) { tree(45 + i * 68, 100 + (i % 2) * 40, 62); tree(70 + i * 68, 380 - (i % 2) * 36, 62); }
        S.shrooms.forEach(m => { if (m.boom) return; ic(g, 'mushroom-gills', m.x, m.y, 24, '#a8201c'); });
        S.band.forEach(b => { if (b.a > 0) { T.foe(b.x, b.y, 15, Math.atan2(262 - b.y, 150 - b.x), C.red, { a: b.a, mark: 'scope' }); if (b.hp < 1 && b.a > .5) T.hp(b.x, b.y - 26, 34, b.hp, 1); } });
        if (S.fake) { g.save(); g.globalAlpha = .9; tok(g, 'B', S.fake[0], S.fake[1], { col: '#a7a39a', icon: 'skull-crossed-bones' }); g.restore(); }
      },
    },
    flood: {
      home: { F: [92, 210], R: [92, 290], W: [52, 210], B: [52, 290] },
      init: S => Object.assign(S, { breath: null, round: -1, cube: 0, bubble: null }),
      draw(g, S, t) {
        T.use(g); T.floor(SB.x, SB.y, SB.w, SB.h, .2);
        T.wall(SB.x, SB.y, SB.w, 82); T.wall(SB.x, 382, SB.w, 60);
        g.fillStyle = 'rgba(46,120,200,.62)'; g.fillRect(120, 140, 410, 242);
        g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 2;
        for (let r = 0; r < 6; r++) { g.beginPath(); for (let x = 124; x < 528; x += 8) g.lineTo(x, 160 + r * 38 + 4 * Math.sin(x / 18 + t * 2 + r)); g.stroke(); }
        g.fillStyle = 'rgba(255,240,190,.55)'; g.fillRect(560, 140, 60, 242); txt(g, 'daylight', 590, 128, '700 13px Jost', C.goldInk, 'center');
        g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(124, 118); g.lineTo(526, 118); g.stroke(); T.label('240 ft, no air', 325, 118, 'center', C.navy, 14);
        if (S.cube > 0) { g.save(); g.globalAlpha = S.cube; box(g, 280, 200, 90, 120, 'rgba(255,255,255,.35)', '#fff', 6, 2); for (let i = 0; i < 14; i++) { const bx = 290 + (i * 37) % 70, by = 310 - ((t * 40 + i * 23) % 105); g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.beginPath(); g.arc(bx, by, 3 + i % 3, 0, Math.PI * 2); g.stroke(); } g.restore(); }
        if (S.round >= 0) T.label(`Round ${Math.min(16, Math.floor(S.round))} of 16`, 325, 410, 'center', C.ink, 15);
      },
    },
  };

  /* ---------- the scripts: ANIM[id](t, S, fx), t in seconds over DUR ---------- */
  const DUR = 6;
  const swimX = r => lerp(120, 540, r / 16);       // round r of 16 along the tunnel
  const breathBars = (S, fx, rnd, air) => fx.draw(g => Object.entries(air).forEach(([k, a]) => {
    const p = S.pos[k], left = a === Infinity ? 1 : clamp(1 - rnd / a), x = p[0] - 20, y = p[1] - 32;
    g.fillStyle = 'rgba(21,32,68,.75)'; g.fillRect(x - 1, y - 1, 42, 8);
    g.fillStyle = left > .25 ? '#57b6ff' : '#e5322d'; g.fillRect(x, y, 40 * left, 6);
    if (a === Infinity) txt(g, '∞', x + 48, y + 3, '800 13px Montserrat', C.navy);
  }));
  const ANIM = {
    // locked door
    pick(t, S, fx) { mv(S, 'R', t, .2, 1.1, S.pos.R, [362, 250]); fx.roll(t, 1.3, 300, 160, { lab: 'Rogue: DEX (thieves’ tools)', d: 9, mod: 5, dc: 15 }); fx.say(t, 2.55, 2.85, 'a minute later…', 300, 196, C.muted); fx.roll(t, 2.8, 300, 160, { lab: 'Rogue: DEX (thieves’ tools)', d: 13, mod: 5, dc: 15 }); if (t > 3.9) S.door = 'open'; mv(S, 'R', t, 4.1, 4.9, [362, 250], [452, 250]); mv(S, 'F', t, 4.3, 5.1, S.pos.F, [440, 200]); },
    bash(t, S, fx) {
      mv(S, 'F', t, .2, 1, S.pos.F, [362, 250]); fx.roll(t, 1.1, 280, 160, { lab: 'Fighter: STR', d: 14, mod: 3, dc: 20 }); fx.noise(t, 1.7, 390, 250, 'BANG');
      if (t > 1.9) S.guard = 'alert'; fx.roll(t, 2.6, 280, 160, { lab: 'Fighter: STR', d: 19, mod: 3, dc: 20 }); fx.noise(t, 3.2, 390, 250, 'CRASH'); if (t > 3.3) S.door = 'broken';
      mv(S, 'F', t, 3.4, 4.1, [362, 250], [440, 255]); if (t > 3) { S.gang = Math.PI; S.gpos = [lerp(540, 480, win(t, 3.2, 4.4)), lerp(130, 210, win(t, 3.2, 4.4))]; }
    },
    knock(t, S, fx) {
      mv(S, 'W', t, .2, 1, S.pos.W, [330, 250]); fx.pop(t, 1.1, 2.2, 'magic-swirl', 399, 250, 46, C.purple); fx.noise(t, 1.6, 399, 250, 'KNOCK!', '138,79,214'); fx.say(t, 2, 3.6, 'heard 300 ft away', 300, 160, C.purple);
      if (t > 1.9) { S.door = 'open'; S.guard = 'alert'; } if (t > 2.6) { S.gang = Math.PI; S.gpos = [lerp(540, 480, win(t, 2.6, 3.8)), lerp(130, 210, win(t, 2.6, 3.8))]; }
      mv(S, 'F', t, 3.4, 4.3, S.pos.F, [440, 255]);
    },
    powder(t, S, fx) {
      mv(S, 'B', t, .2, 1.1, S.pos.B, [350, 262]); fx.pop(t, 1.2, 2.2, 'powder', 380, 230, 40); fx.draw(g => T.poof(399, 250, t - 1.9, 34));
      if (t > 2.1) S.door = 'branches'; fx.say(t, 2.3, 3.6, 'wood to branches', 300, 160, C.good);
      ['B', 'R', 'F', 'W'].forEach((k, i) => mv(S, k, t, 2.8 + i * .25, 4.2 + i * .25, S.pos[k], [440 + (i % 2) * 40, 210 + i * 30]));
    },
    key(t, S, fx) {
      mv(S, 'B', t, .2, 1.1, S.pos.B, [362, 262]); fx.roll(t, 1.2, 280, 160, { lab: 'Bard: DEX, with advantage', d: 16, adv: [6, 16], mod: 2, dc: 15 });
      if (t > 2.4) S.door = 'open'; ['B', 'R', 'F', 'W'].forEach((k, i) => mv(S, k, t, 2.5 + i * .15, 3.4 + i * .15, S.pos[k], [440 + (i % 2) * 40, 230 + i * 28]));
      if (t > 3.3) S.guard = 'alert'; fx.roll(t, 3.5, 470, 60 + 34, { lab: 'Guard: CHA save', d: 9, mod: 0, dc: 13 }, 1.1);
      if (t > 4.5) S.guard = 'owner'; fx.say(t, 4.5, 6, '“Welcome home, my lord.”', 520, 100, C.goldInk);
    },
    window(t, S, fx) {
      mv(S, 'W', t, .2, 1, S.pos.W, [362, 250]); fx.pop(t, 1, 1.6, 'window', 399, 250, 40, '#2a86c8'); if (t > 1.4) S.door = 'glass';
      if (t > 1.6 && t < 3.6) fx.draw(g => { g.strokeStyle = 'rgba(87,182,255,.8)'; g.lineWidth = 2; g.setLineDash([6, 6]); [[540, 130], [556, 372]].forEach(([x, y]) => { g.beginPath(); g.moveTo(400, 250); g.lineTo(x, y); g.stroke(); }); g.setLineDash([]); });
      fx.say(t, 1.7, 3.6, 'they can’t see you', 300, 160, '#2a86c8');
      if (t > 3.5) S.door = 'pass'; fx.say(t, 3.6, 4.6, 'open it: once a week', 300, 160, C.good);
      ['W', 'R', 'B', 'F'].forEach((k, i) => mv(S, k, t, 3.8 + i * .2, 4.9 + i * .2, S.pos[k], [440 + (i % 2) * 40, 210 + i * 30]));
    },
    wmd(t, S, fx) {
      mv(S, 'F', t, .2, 1, S.pos.F, [362, 250]); fx.pop(t, 1.05, 1.6, 'warhammer', 375, 230, 40, C.navy);
      fx.big(t, 1.5, 3.4, '2d6+5 = 12  × 3 = 36', 280, 160, C.navy); fx.say(t, 1.8, 3.4, 'the door has 18 HP', 280, 196, C.muted);
      fx.noise(t, 1.5, 390, 250, 'CRUNCH'); if (t > 1.6) S.door = 'broken'; if (t > 1.8) S.guard = 'alert';
      if (t > 2.4) { S.gang = Math.PI; S.gpos = [lerp(540, 480, win(t, 2.4, 3.6)), lerp(130, 210, win(t, 2.4, 3.6))]; } mv(S, 'F', t, 2.6, 3.4, [362, 250], [440, 255]);
    },
    // chasm
    jump(t, S, fx) {
      mv(S, 'F', t, .2, 1, S.pos.F, [110, 250]); mv(S, 'F', t, 1.1, 1.9, [110, 250], [232, 250]);
      if (t > 1.9) fx.draw(g => { const k = win(t, 1.9, 2.6); g.strokeStyle = C.red; g.lineWidth = 3; g.setLineDash([8, 6]); g.beginPath(); for (let i = 0; i <= 20 * k; i++) { const u = i / 20; g.lineTo(lerp(240, 368, u), 250 - Math.sin(u * Math.PI) * 70); } g.stroke(); g.setLineDash([]); if (k >= 1) { T.label('16 ft', 368, 290, 'center', C.redDk, 14); g.fillStyle = C.red; g.beginPath(); g.arc(368, 250, 6, 0, 7); g.fill(); } });
      fx.say(t, 2.4, 6, 'Strength 16: up to 16 ft', 321, 160, C.redDk); fx.big(t, 3.3, 6, 'No roll adds the last 4 ft', 321, 360, C.redDk);
    },
    rope(t, S, fx) {
      mv(S, 'R', t, .2, .9, S.pos.R, [226, 262]); fx.roll(t, 1, 320, 150, { lab: 'Rogue: throw the grapple', d: 12, mod: 5, dc: 15 }, 1.1); S.rope = win(t, 1.6, 2.1);
      [['R', 17, true], ['F', 13, true], ['B', 11, true], ['W', 6, false]].forEach(([k, d, ok], i) => {
        fx.mini(t, 2.2, 140 + i * 90, 110, `${CLASSES[k].name} ${d}`, ok, 3.6);
        const t0 = 2.4 + i * .5;
        if (ok) mv(S, k, t, t0, t0 + .9, i ? S.pos[k] : [226, 262], [236, 250], [430 + (i % 2) * 40, 200 + i * 40]);
        else { mv(S, k, t, t0, t0 + .6, S.pos[k], [236, 250], [320, 250]); if (t > t0 + .6) { const f = win(t, t0 + .6, t0 + 1.2); S.pos[k] = [320, 250 + f * 40]; S.o[k] = { s: 1 - .55 * f, a: 1 - .4 * f }; } }
      });
      fx.big(t, 4.4, 6, '60 ft: 6d6 = 21', 320, 330, C.redDk);
    },
    misty(t, S, fx) {
      mv(S, 'W', t, .2, 1, S.pos.W, [215, 250]); fx.pop(t, 1.1, 1.8, 'magic-swirl', 215, 250, 46, C.purple); fx.draw(g => { T.poof(215, 250, t - 1.5, 26); T.poof(450, 250, t - 1.7, 26); });
      if (t > 1.6) S.pos.W = [450, 250]; fx.big(t, 2.6, 6, 'One across, three stuck', 321, 360, C.goldInk);
    },
    boots(t, S, fx) {
      mv(S, 'F', t, .2, 1, S.pos.F, [232, 250]); fx.say(t, 1.1, 2.3, 'walk 10 ft back', 200, 170, C.navy); mv(S, 'F', t, 1.1, 1.8, [232, 250], [160, 250]);
      fx.pop(t, 1.9, 2.5, 'boots', 160, 205, 38); fx.say(t, 2.1, 3.8, 'launch 30 ft the other way', 290, 140, C.good);
      arc(S, 'F', t, 2.4, 3.4, [160, 250], [402, 250], 60); if (t > 3.4) mv(S, 'F', t, 3.5, 4.2, [402, 250], [450, 250]);
      fx.say(t, 3.5, 6, 'lands on the lip', 440, 300, C.good);
    },
    bread(t, S, fx) {
      mv(S, 'B', t, .2, 1, S.pos.B, [210, 300]); fx.pop(t, 1, 1.5, 'bread', 236, 300, 36);
      S.bread = Math.min(1, Math.floor(win(t, 1.4, 3.4) * 4.999) / 4) * (t > 1.4 ? 1 : 0); if (t > 1.4 && S.bread === 0) S.bread = .05;
      if (t > 1.4) fx.say(t, 1.4, 3.8, `round ${Math.max(1, Math.round(S.bread * 4))}: ${Math.max(5, Math.round(S.bread * 20))} ft`, 321, 150, C.goldInk);
      ['B', 'R', 'F', 'W'].forEach((k, i) => mv(S, k, t, 3.6 + i * .2, 4.8 + i * .2, S.pos[k], [300, 300], [450 + (i % 2) * 40, 210 + i * 30]));
    },
    portal(t, S, fx) {
      mv(S, 'R', t, .2, .9, S.pos.R, [210, 250]);
      if (t > 1) fx.draw(g => { g.fillStyle = 'rgba(229,50,45,.12)'; g.beginPath(); g.arc(450, 250, 120, 0, 7); g.fill(); g.strokeStyle = 'rgba(229,50,45,.7)'; g.setLineDash([8, 6]); g.lineWidth = 2; g.stroke(); g.setLineDash([]); T.label('miss by 3: up to 15 ft off', 450, 140, 'center', C.redDk, 13); g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.arc(450, 250, 10, 0, 7); g.stroke(); });
      fx.roll(t, 1.4, 320, 400, { lab: 'Rogue: attack the tile, AC 15', d: 11, mod: 5, dc: 15 }, 1.2);
      if (t > 2.6 && t < 3) fx.draw(g => T.tracer(210, 250, lerp(210, 450, win(t, 2.6, 2.9)), 250, 1, C.goldInk, 3));
      fx.draw(g => { T.poof(210, 250, t - 3, 24); T.poof(450, 250, t - 3.1, 24); }); if (t > 3.1) S.pos.R = [450, 250];
      fx.big(t, 3.6, 6, 'One across, once a day', 321, 350, C.goldInk);
    },
    wool(t, S, fx) {
      mv(S, 'F', t, .2, .9, S.pos.F, [232, 250]); fx.pop(t, .9, 1.5, 'sheep', 232, 200, 40, C.stoneDk);
      if (t > 1.3) { const f = win(t, 1.3, 2.1); S.pos.F = [lerp(232, 300, f), 250]; S.o.F = { s: 1 - .45 * f, air: 1 }; }
      fx.big(t, 2.1, 3.1, 'No damage', 300, 205, C.good);
      if (t > 2.3) { const f = win(t, 2.3, 3); S.pos.F = [lerp(300, 380, f), 250 - Math.sin(f * Math.PI) * 20]; S.o.F = { s: .55 + .25 * f, air: 1 }; }
      fx.say(t, 2.3, 3.2, 'bounced 30 ft back up', 330, 150, C.good);
      fx.roll(t, 3.2, 320, 400, { lab: 'Fighter: climb the last 30 ft', d: 9, mod: 5, dc: 10 }, 1.1);
      if (t > 4.2) { const f = win(t, 4.2, 4.9); S.pos.F = [lerp(380, 440, f), 250]; S.o.F = { s: .8 + .2 * f }; }
    },
    // guarded gate
    fight(t, S, fx) {
      ['F', 'R', 'W', 'B'].forEach((k, i) => mv(S, k, t, .3, 1.3, S.pos[k], [[290, 200], [330, 210], [250, 260], [400, 230]][i]));
      if (t > 1.3) S.cone = 0; fx.pop(t, 1.4, 2.6, 'crossed-swords', 330, 150, 44, C.redDk); if (t > 2.4) S.g[0].st = 'gone';
      fx.noise(t, 2, 575, 160, 'ALARM!'); fx.pop(t, 2, 3, 'ringing-bell', 575, 160, 30, C.redDk);
      [0, 1, 2].forEach(i => { if (t > 2.5 + i * .3) S.extra.push([lerp(515, 450 - i * 40, win(t, 2.5 + i * .3, 3.6 + i * .3)), 190 + i * 30]); });
      fx.big(t, 3.8, 6, 'The keep is coming', 320, 330, C.redDk);
    },
    sneak(t, S, fx) {
      ['R', 'W', 'B', 'F'].forEach((k, i) => mv(S, k, t, .3 + i * .1, 2 + i * .1, S.pos[k], [60 + i * 36, 320], [80 + i * 30, 160]));
      [['R', 17, 1], ['W', 9, 0], ['B', 11, 0], ['F', '4 (disadv.)', 0]].forEach(([k, d, ok], i) => fx.mini(t, 1.2, 120 + i * 130, 390, `${CLASSES[k].name} ${d}`, !!ok, 3.5));
      fx.say(t, 1.6, 4.7, 'group check vs passive Perception 13: 1 of 4, needs 2', 320, 350, C.redDk, 14);
      if (t > 2.4) { S.g[0].st = 'alert'; S.g[0].a = lerp(Math.PI / 2, Math.PI * .85, win(t, 2.4, 2.8)); S.g[1].st = 'alert'; S.cone = 0; }
      fx.big(t, 2.6, 6, 'Spotted', 200, 120, C.redDk);
    },
    talk(t, S, fx) {
      mv(S, 'B', t, .3, 1.3, S.pos.B, [330, 220]); fx.pop(t, 1.3, 2.2, 'conversation', 300, 210, 34, C.goldInk);
      fx.roll(t, 1.5, 480, 300, { lab: 'Bard: Deception vs Insight', d: 14, mod: 5, dc: 13 }, 1.1);
      fx.say(t, 2.6, 4, '“Fine. Go on through.”', 330, 110, C.good);
      if (t > 3) S.cone = 0; ['B', 'F', 'R', 'W'].forEach((k, i) => mv(S, k, t, 3.2 + i * .2, 4.4 + i * .2, k === 'B' ? [330, 220] : S.pos[k], [340, 100]));
      if (t > 4.4) ['B', 'F', 'R', 'W'].forEach((k, i) => { if (t > 4.4 + i * .2) S.o[k] = { a: 0 }; });
    },
    cowl(t, S, fx) {
      fx.pop(t, .3, 1.2, 'ninja-mask', 310, 350, 36, C.good);
      ['R', 'F', 'W', 'B'].forEach((k, i) => { const off = [[0, 0], [30, 14], [-30, 14], [0, 30]][i]; mv(S, k, t, .5, 1.3, S.pos[k], [80 + off[0], 330 + off[1]]); mv(S, k, t, 1.9, 4.5, [80 + off[0], 330 + off[1]], [100 + off[0], 210 + off[1]], [320 + off[0] * .6, 110 + off[1] * .5]); S.o[k] = { a: t > 1.9 ? .55 : 1 }; });
      fx.roll(t, 1.4, 470, 320, { lab: 'Rogue: Stealth for all four', d: 15, mod: 7, dc: 13 }, 1.2);
      fx.say(t, 1.6, 3.2, 'allies within 10 ft use the Rogue’s roll', 320, 400, C.good, 14);
    },
    badge(t, S, fx) {
      fx.pop(t, .3, 1.1, 'police-badge', 250, 350, 36, C.navy); if (t > .9) S.o.F = { col: '#c45a52', icon: 'police-badge' };
      ['F', 'R', 'W', 'B'].forEach((k, i) => mv(S, k, t, 1.1, 2.4, S.pos[k], [[330, 250], [300, 290], [340, 300], [380, 290]][i]));
      fx.say(t, 1.6, 2.6, '“Prisoners for the cells.”', 330, 200, C.navy);
      fx.roll(t, 2.4, 480, 320, { lab: 'Guard: Investigation DC 13', d: 8, mod: 1, dc: 13 }, 1.1); if (t > 3.5) S.cone = 0;
      ['F', 'R', 'W', 'B'].forEach((k, i) => { mv(S, k, t, 3.6 + i * .15, 4.6 + i * .15, [[330, 250], [300, 290], [340, 300], [380, 290]][i], [340, 100]); if (t > 4.6 + i * .15) S.o[k] = { a: 0, col: S.o[k]?.col, icon: S.o[k]?.icon }; });
    },
    cats(t, S, fx) {
      mv(S, 'W', t, .2, .8, S.pos.W, [370, 360]);
      if (t > .9 && t < 1.4) fx.draw(g => { const k = win(t, .9, 1.35); ic(g, 'glass-ball', lerp(370, 160, k), lerp(360, 260, k) - Math.sin(k * Math.PI) * 70, 22, '#57b6ff'); });
      fx.draw(g => T.flash(160, 260, 60, clamp(1 - (t - 1.4) * 3) * (t > 1.4 ? 1 : 0))); fx.big(t, 1.5, 3.2, '5d20 = 52 cats', 160, 200, C.goldInk); fx.noise(t, 1.5, 160, 260, 'MRRROW', '224,169,45');
      if (t > 1.4) fx.draw(g => { for (let i = 0; i < 52; i++) { const a = i * 2.4, d = (20 + (i * 53) % 140) * win(t, 1.4, 3) ; const x = clamp(160 + Math.cos(a) * d, 30, 610), y = clamp(260 + Math.sin(a) * d * .8, 90, 430); ic(g, 'cat', x, y, 16 + i % 3 * 3, ['#3d2b1f', '#8a5a2b', '#5d618c', '#e0a92d'][i % 4]); } });
      if (t > 2) { S.cone = 0; S.g.forEach((q, i) => { const f = win(t, 2, 3.6); q.st = 'alert'; q.a = Math.PI * .8; q.x = lerp(280 + i * 100, 150 + i * 40, f); q.y = lerp(150, 230 + i * 40, f); }); }
      ['F', 'R', 'W', 'B'].forEach((k, i) => { mv(S, k, t, 3.2 + i * .15, 4.6 + i * .15, k === 'W' ? [370, 360] : S.pos[k], [340, 100]); if (t > 4.6 + i * .15) S.o[k] = { a: 0 }; });
    },
    hanky(t, S, fx) {
      mv(S, 'W', t, .2, 1.1, S.pos.W, [320, 240]); fx.pop(t, 1.1, 1.8, 'tear-tracks', 300, 200, 34, '#2a86c8');
      fx.roll(t, 1.4, 130, 300, { lab: 'Guard 1: CHA save DC 13', d: 7, mod: 0, dc: 13 }, 1.1);
      if (t > 2.4) { S.cone = 0; const f = win(t, 2.4, 3.8); S.g[0].x = lerp(280, 80, f); S.g[0].a = Math.PI; if (t < 4) fx.say(t, 2.4, 3.9, 'sob…', S.g[0].x, 115, '#2a86c8'); if (f >= 1) S.g[0].st = 'gone'; }
      fx.roll(t, 2.6, 510, 300, { lab: 'Guard 2: CHA save DC 13', d: 15, mod: 0, dc: 13 }, 1.1);
      fx.say(t, 3.6, 4.6, '“What did you do to Bert?”', 380, 110, C.redDk);
      mv(S, 'F', t, 3.9, 4.6, S.pos.F, [360, 200]); fx.pop(t, 4.6, 5.6, 'crossed-swords', 380, 160, 40, C.redDk); if (t > 5.3) S.g[1].st = 'gone';
    },
    // ambush
    passive(t, S, fx) {
      const walk = lerp(0, 170, ease(win(t, .2, 1.8))); ['F', 'R', 'W', 'B'].forEach(k => S.pos[k] = [S.pos[k][0] + walk, 262]);
      ['F', 'R', 'W', 'B'].forEach((k, i) => fx.mini(t, 1.4, 90 + i * 140, 200, `${CLASSES[k].name} ${[10, 14, 11, 12][i]}`, false, 3));
      fx.say(t, 1.6, 4.4, 'their Stealth 16 vs your passive Perception', 320, 160, C.redDk, 14);
      if (t > 2.2) { S.band.forEach(b => b.a = 1); if (t < 2.8) fx.draw(g => S.band.forEach((b, i) => { const p = S.pos[['F', 'R', 'W', 'B'][i]]; const k = win(t, 2.2, 2.7); T.tracer(b.x, b.y, lerp(b.x, p[0], k), lerp(b.y, p[1], k), 1, C.redDk, 3); })); }
      fx.big(t, 2.8, 6, 'Surprised: no first turn', 320, 420, C.redDk);
    },
    scout(t, S, fx) {
      mv(S, 'R', t, .2, 1.6, S.pos.R, [420, 262]); const walk = lerp(0, 40, ease(win(t, .2, 1.6))); ['F', 'W', 'B'].forEach(k => S.pos[k] = [S.pos[k][0] + walk, 262]);
      fx.roll(t, 1.6, 230, 160, { lab: 'Rogue: Perception vs Stealth 16', d: 13, mod: 5, dc: 16 }, 1.1);
      if (t > 2.6) S.band.forEach(b => b.a = 1); if (t > 2.9 && t < 3.4) fx.draw(g => S.band.forEach(b => T.tracer(b.x, b.y, lerp(b.x, 420, win(t, 2.9, 3.3)), lerp(b.y, 262, win(t, 2.9, 3.3)), 1, C.redDk, 3)));
      fx.draw(g => { if (t > 2.6) T.hp(420, 232, 38, t > 3.4 ? .35 : 1, 1); });
      fx.say(t, 3.4, 6, 'help is 60 ft back', 300, 330, C.redDk);
    },
    formation(t, S, fx) {
      const walk = lerp(0, 150, ease(win(t, .2, 1.8))); ['F', 'R', 'W', 'B'].forEach(k => S.pos[k] = [S.pos[k][0] + walk, 262]);
      fx.pop(t, .3, 1.4, 'shield', S.pos.F[0], 215, 30, C.navy);
      if (t > 2) { S.band.forEach(b => b.a = 1); if (t < 2.6) fx.draw(g => S.band.forEach(b => T.tracer(b.x, b.y, lerp(b.x, S.pos.F[0], win(t, 2, 2.5)), lerp(b.y, 262, win(t, 2, 2.5)), 1, C.redDk, 3))); }
      fx.draw(g => { if (t > 2) T.hp(S.pos.F[0], 230, 38, t > 2.6 ? .55 : 1, 1); }); fx.big(t, 2.6, 4, '−18 HP', S.pos.F[0], 200, C.redDk);
      fx.big(t, 3.6, 6, 'Still surprised: the Fighter pays', 320, 420, C.goldInk);
    },
    blade(t, S, fx) {
      fx.pop(t, .2, 1.2, 'screaming', 190, 210, 32, C.redDk);
      const walk = lerp(0, 120, ease(win(t, .2, 1.4))); ['F', 'R', 'W', 'B'].forEach(k => S.pos[k] = [S.pos[k][0] + walk, 262]);
      fx.draw(g => { if (t > 1.2) T.zone(S.pos.F[0], 262, 230 * win(t, 1.2, 1.5), clamp(2.5 - t), '229,169,45'); });
      fx.noise(t, 1.4, S.pos.F[0], 262, 'AAAAAH!'); if (t > 1.6) S.band.forEach(b => b.a = 1);
      if (t > 1.8) { const f = win(t, 1.8, 2.6); S.pos.W[0] -= 20 * f; S.pos.B[0] -= 20 * f; S.pos.R[1] = 262 - 30 * f; }
      fx.big(t, 2.6, 6, 'No surprise: a fair fight', 320, 420, C.good);
    },
    flies(t, S, fx) {
      const walk = lerp(0, 130, ease(win(t, .2, 1.6))); ['F', 'R', 'W', 'B'].forEach(k => S.pos[k] = [S.pos[k][0] + walk, 262]);
      const red = t > 1.4;
      fx.draw(g => { const [x, y] = S.pos.W; g.fillStyle = red ? 'rgba(229,50,45,.12)' : 'rgba(255,220,90,.18)'; g.beginPath(); g.arc(x, y, 70, 0, 7); g.fill(); for (let i = 0; i < 12; i++) { const a = t * 2 + i * .52, r = 30 + (i % 4) * 9; g.fillStyle = red ? '#ff4b3e' : '#ffe14d'; g.beginPath(); g.arc(x + Math.cos(a) * r, y + Math.sin(a) * r * .8, 3, 0, 7); g.fill(); } });
      fx.say(t, 1.5, 3, 'the flies turn red: hostiles near', 320, 160, C.redDk, 14);
      if (t > 2.2) { S.band.forEach(b => b.a = .7); fx.draw(g => S.band.forEach(b => T.laser(b.x, b.y, S.pos.W[0], S.pos.W[1], clamp((t - 2.2) * 3)))); }
      fx.say(t, 2.6, 6, 'and the Wizard is the brightest thing in the woods', 320, 420, C.goldInk, 14);
    },
    shrooms(t, S, fx) {
      const walk = lerp(0, 60, ease(win(t, .2, 1))); ['F', 'R', 'W', 'B'].forEach(k => S.pos[k] = [S.pos[k][0] + walk, 262]);
      fx.say(t, .3, 1.6, 'once you know where they wait…', 320, 160, C.navy, 14);
      const spots = [[450, 200], [520, 210], [470, 320], [545, 310]];
      spots.forEach((p, i) => { const t0 = 1.2 + i * .25; if (t > t0 && t < t0 + .4) fx.draw(g => { const k = win(t, t0, t0 + .4); ic(g, 'mushroom-gills', lerp(S.pos.R[0], p[0], k), lerp(262, p[1], k) - Math.sin(k * Math.PI) * 40, 20, '#a8201c'); }); if (t > t0 + .4) S.shrooms.push({ x: p[0], y: p[1], boom: t > 3.3 }); });
      if (t > 2.7) S.band.forEach((b, i) => { b.a = 1; const f = win(t, 2.7, 3.3); b.x = lerp(b.x, spots[i][0], f); b.y = lerp(b.y, spots[i][1], f); if (t > 3.3) b.hp = .25; });
      fx.draw(g => spots.forEach(p => T.flash(p[0], p[1], 50, clamp(1 - (t - 3.3) * 2.5) * (t > 3.3 ? 1 : 0))));
      fx.big(t, 3.5, 5, '6d6 poison, blinded', 500, 170, '#6b2fa0'); fx.big(t, 4.2, 6, 'The trap had a trap in it', 320, 420, C.good);
    },
    amulet(t, S, fx) {
      const walk = lerp(0, 150, ease(win(t, .2, 1.6))); ['F', 'R', 'W', 'B'].forEach(k => S.pos[k] = [S.pos[k][0] + walk, 262]);
      if (t > 1.6) S.band.forEach(b => b.a = 1);
      if (t > 1.6 && t < 2) fx.draw(g => T.tracer(470, 140, lerp(470, S.pos.B[0], win(t, 1.6, 1.95)), lerp(140, 262, win(t, 1.6, 1.95)), 1, C.redDk, 3));
      if (t > 2) { S.fake = [S.pos.B[0] - 20 * win(t, 2, 2.3), 280]; S.o.B = { a: .3, dash: 1 }; mv(S, 'B', t, 2.3, 4.2, [S.pos.B[0], 262], [260, 380], [470, 410]); }
      fx.pop(t, 2, 2.8, 'invisible', S.fake ? S.fake[0] : 0, 320, 30, C.purple);
      if (t > 2.6) { const f = win(t, 2.6, 3.6); S.band[2].x = lerp(505, 330, f); S.band[2].y = lerp(370, 310, f); }
      fx.say(t, 2.6, 4, 'DC 15 to see through it', 230, 330, C.purple, 14);
      fx.pop(t, 4.3, 5.4, 'crossed-swords', 380, 330, 40, C.purple); fx.big(t, 4.4, 6, 'Shot first, struck first', 320, 160, C.good);
    },
    // flooded tunnel
    hold(t, S, fx) {
      const r = win(t, .6, 5.2) * 16; S.round = t > .6 ? r : -1;
      const air = { F: 30, R: 20, W: 10, B: 20 };
      ['F', 'R', 'W', 'B'].forEach((k, i) => { if (t > .6) S.pos[k] = [k === 'W' && r > 10 ? swimX(10) : swimX(r) - i * 18, 200 + i * 34]; if (k === 'W' && r > 10) S.o.W = { s: 1 - .3 * win(r, 10, 13), a: 1 - .4 * win(r, 10, 13) }; });
      if (t > .6) breathBars(S, fx, r, air); if (r > 10) fx.big(t, 3.4, 6, 'Wizard: out of air at round 10', 325, 360, C.redDk);
    },
    spell(t, S, fx) {
      mv(S, 'W', t, .2, .8, S.pos.W, [80, 250]); fx.pop(t, .8, 2, 'spell-book', 80, 190, 40, C.purple); fx.say(t, 1, 2.2, '3rd-level slot, or 10 min as a ritual', 260, 360, C.purple, 14);
      const r = win(t, 2, 5.4) * 16; S.round = t > 2 ? r : -1;
      if (t > 2) { ['F', 'R', 'W', 'B'].forEach((k, i) => S.pos[k] = [swimX(r) - i * 18, 200 + i * 34]); breathBars(S, fx, r, { F: Infinity, R: Infinity, W: Infinity, B: Infinity }); }
    },
    around(t, S, fx) {
      ['F', 'R', 'W', 'B'].forEach((k, i) => mv(S, k, t, .3, 1.8, S.pos[k], [30 + i * 4, S.pos[k][1]])); if (t > 1.8) ['F', 'R', 'W', 'B'].forEach(k => S.o[k] = { a: clamp(2.3 - t) });
      fx.pop(t, 1.8, 6, 'hourglass', 325, 250, 60, C.goldInk); fx.big(t, 2.4, 6, '+4 hours on the road', 325, 330, C.goldInk);
      fx.mini(t, 3.2, 255, 380, 'encounter roll 1: 14, nothing', true, 2.8); fx.mini(t, 3.6, 425, 380, 'roll 2: 3, wolves', false, 2.4);
    },
    buoyant(t, S, fx) {
      fx.pop(t, .2, 1, 'breastplate', 92, 160, 34, C.navy);
      if (t > 1) { const f = win(t, 1, 4.4); S.pos.F = [lerp(92, 560, f), 350]; S.o.F = { s: .9 }; }
      fx.say(t, 1, 3, 'sinks like plate, walks the floor', 325, 410, C.navy, 14); breathBars(S, fx, 0, { F: Infinity });
      fx.draw(g => { if (t > 1) { g.strokeStyle = '#b07a3a'; g.lineWidth = 3; g.setLineDash([6, 4]); g.beginPath(); g.moveTo(110, 300); g.lineTo(S.pos.F[0], S.pos.F[1]); g.stroke(); g.setLineDash([]); } });
      fx.big(t, 4.5, 6, 'Rope tied, route known', 325, 250, C.goldInk);
    },
    pendant(t, S, fx) {
      fx.pop(t, .2, 1, 'necklace', 52, 250, 34, '#2a86c8');
      ['B', 'F', 'R', 'W'].forEach((k, i) => mv(S, k, t, .6, 1.2, S.pos[k], [110 + [0, 22, 0, -22][i], 250 + [0, 0, 22, 0][i] - (i === 3 ? 0 : 0) + (i === 0 ? -22 : 0)]));
      const c = lerp(110, 560, ease(win(t, 1.4, 4.6)));
      if (t > 1.4) ['B', 'F', 'R', 'W'].forEach((k, i) => S.pos[k] = [c + [0, 22, 0, -22][i], 250 + [-22, 0, 22, 0][i]]);
      fx.draw(g => { if (t > 1.2) T.bubble(S.pos.B[0], 250, 50, t, 1); });
      S.round = t > 1.4 ? win(t, 1.4, 4.6) * 8 : -1;
      fx.say(t, 1.6, 4.4, 'walking pace: 8 rounds, no breath to count', 325, 360, '#2a86c8', 14);
    },
    pebble(t, S, fx) {
      if (t < 2) { const f = win(t, .3, 1.9); S.pos.F = [f < .5 ? lerp(92, 325, f * 2) : lerp(325, 92, f * 2 - 1), 250]; }
      fx.say(t, .4, 1.9, 'Fighter drops it halfway and swims back', 325, 410, C.navy, 14);
      if (t > 1.1) fx.draw(g => ic(g, 'bubbles', 325, 270, 22, '#fff'));
      fx.pop(t, 2, 3, 'hourglass', 325, 250, 50, C.goldInk); fx.say(t, 2.1, 3, 'wait 1 hour', 325, 190, C.goldInk);
      S.cube = win(t, 2.6, 3);
      const r = win(t, 3, 5.6) * 16; S.round = t > 3 ? r : -1; const stop = r > 8 && r < 9.5;
      if (t > 3) { ['F', 'R', 'W', 'B'].forEach((k, i) => S.pos[k] = [swimX(Math.min(r, 16)) - i * 14, 210 + i * 30]); breathBars(S, fx, r > 8.75 ? r - 8.75 : r, { F: 30, R: 20, W: 10, B: 20 }); }
      fx.say(t, 4.3, 5, 'breathe here', 325, 190, C.good);
    },
    gills(t, S, fx) {
      fx.pop(t, .2, 1.2, 'heavy-collar', 52, 160, 34, C.purple);
      const r = win(t, 1.2, 5.2) * 16; S.round = t > 1.2 ? r : -1;
      if (t > 1.2) { ['F', 'R', 'W', 'B'].forEach((k, i) => S.pos[k] = [swimX(r) - i * 18, 200 + i * 34]); breathBars(S, fx, r, { F: 30, R: 20, W: Infinity, B: 20 }); }
      fx.say(t, 1.4, 3, 'the Wizard breathes water; everyone else has 20+ rounds', 325, 410, C.purple, 14);
    },
  };

  /* ---------- 1: same problem, new answers ---------- */
  canvasDemo('answers', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, p: 0, a: 0, key: '' };
    const tourBtn = $(s, '.an-tour'), list = $(s, '.an-list'), free = freeOf(st, tourBtn);
    const P = () => PROBLEMS[st.p];
    function buildList() {
      list.innerHTML = P().all.map((a, i) => `${i === 0 ? '<h4>The classic answers</h4>' : i === 3 ? '<h4>With Brian Feeney’s items</h4>' : ''}<button class="btn an-a" data-i="${i}">${a.name}</button>`).join('');
      $$(list, '.an-a').forEach(b => b.onclick = () => { free(); st.a = +b.dataset.i; st.t = 0; });
    }
    $$(s, '.an-prob .btn').forEach(b => b.onclick = () => { free(); st.p = PROBLEMS.findIndex(p => p.id === b.dataset.p); st.a = 0; st.t = 0; buildList(); });
    tourBtn.onclick = () => { st.tour = true; st.t = 0; st.a = 0; tourBtn.classList.add('on'); };
    buildList();
    const card = (a, i, y, on, done) => {
      const x = 642, w = 380, h = 64;
      box(g, x, y, w, h, on ? (a.kind === 'item' ? '#fde9b8' : '#dfe6fb') : 'rgba(255,252,244,.9)', on ? (a.kind === 'item' ? '#e0a92d' : '#8ea2e6') : '#d9ccae', 10, on ? 3 : 1.5);
      ic(g, a.icon, x + 28, y + 32, 34, a.kind === 'item' ? C.goldInk : C.navy);
      txt(g, a.name, x + 54, y + 15, '800 15px Montserrat', C.ink);
      txt(g, a.roll, x + 54, y + 33, '600 13px Jost', a.sure ? C.good : C.muted);
      if (done) txt(g, '→ ' + a.res, x + 54, y + 50, '700 13px Jost', TONE[a.tone]);
      tok(g, a.who === 'A' ? 'F' : a.who, x + w - 26, y + 32, { s: .62, col: a.who === 'A' ? '#5d618c' : undefined, icon: a.who === 'A' ? 'meeple' : undefined });
      if (a.noise === 'loud') { ic(g, 'sound-waves', x + w - 26, y + 54, 16, C.redDk); }
    };
    function render() {
      if (st.tour) { const n = P().all.length; st.a = Math.min(n - 1, Math.floor(st.t / DUR)); }
      const p = P(), a = p.all[st.a], t = st.tour ? st.t - st.a * DUR : st.t, sc = SCENES[p.id];
      T.use(g); panel(g);
      txt(g, p.name, 22, 20, '800 21px Montserrat'); txt(g, p.sub, 22, 42, '600 14px Jost', C.muted);
      // the scene, then the script on top of it
      const S = { pos: {}, o: {} }; Object.entries(sc.home).forEach(([k, v]) => S.pos[k] = v.slice()); sc.init(S);
      const fx = FX(g); ANIM[a.id](t, S, fx);
      clipScene(g, () => { sc.draw(g, S, t); ['B', 'W', 'R', 'F'].forEach(k => tok(g, k, S.pos[k][0], S.pos[k][1], S.o[k] || {})); fx.flush(); });
      g.strokeStyle = '#cdbf9f'; g.lineWidth = 2; g.beginPath(); g.roundRect(SB.x, SB.y, SB.w, SB.h, 12); g.stroke();
      if (t > DUR - 1.3) T.stamp(a.res, 320, 250, TONE[a.tone], clamp((t - DUR + 1.3) * 4), 26);
      // caption
      box(g, 20, 452, 600, 122, a.kind === 'item' ? '#fff3d6' : '#eef1fb', a.kind === 'item' ? '#e0a92d' : '#8ea2e6', 12, 2);
      ic(g, a.icon, 56, 488, 46, a.kind === 'item' ? C.goldInk : C.navy);
      txt(g, (a.kind === 'item' ? 'Item · ' : 'Classic · ') + a.name, 92, 474, '800 18px Montserrat');
      para(g, a.why, 92, 500, 512, 20, '500 15.5px Jost', C.ink, 3);
      // the list of answers
      txt(g, 'The classic answers', 644, 14, '800 13px Montserrat', C.muted);
      p.classic.forEach((c, i) => card(c, i, 24 + i * 70, i === st.a, st.tour ? i < st.a : true));
      txt(g, 'With Brian Feeney’s items', 644, 248, '800 13px Montserrat', C.goldInk);
      p.items.forEach((c, i) => card(c, i + 3, 258 + i * 70, i + 3 === st.a, st.tour ? i + 3 < st.a : true));
      const sure = q => q.filter(x => x.sure).length;
      txt(g, `No die decides it: classic ${sure(p.classic)} of 3, items ${sure(p.items)} of 4`, 1022, 552, '700 13px Jost', C.muted, 'right');
      txt(g, 'Item text: Brian Feeney’s sheet', 1022, 571, '600 12px Jost', C.muted, 'right');
      $$(s, '.an-prob .btn').forEach((b, i) => b.classList.toggle('on', i === st.p));
      $$(list, '.an-a').forEach((b, i) => b.classList.toggle('on', i === st.a));
      const key = [st.p, st.a].join(); if (key === st.key) return; st.key = key;
      say($(s, '.an-out'), `${a.name}: ${a.res.toLowerCase()}. ${a.kind === 'item' ? 'From the sheet: “' + ITEMS[a.id].sheet.split('. ').slice(0, 2).join('. ').replace(/\.?$/, '.') + '”' : a.why}`);
    }
    PROBLEMS.forEach((p, i) => apis[p.id] = { seek(t) { st.held = st.tour = true; if (st.p !== i) { st.p = i; buildList(); } st.t = t; render(); }, dur: () => p.all.length * DUR });
    return dt => {
      if (!st.held) st.t += Math.max(0, dt);
      const end = st.tour ? P().all.length * DUR : DUR + 1.2;
      if (st.t > end) { st.t = 0; if (st.tour) { st.p = (st.p + 1) % PROBLEMS.length; st.a = 0; buildList(); } }
      render();
    };
  });

  /* ---------- 2: what the item changes ---------- */
  const ORDER = PROBLEMS.flatMap(p => p.items.map(a => a.id));
  canvasDemo('sort', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, f: 'all', pick: ORDER[0], key: '' };
    const tourBtn = $(s, '.so-tour'), free = freeOf(st, tourBtn);
    $$(s, '.so-f .btn').forEach(b => b.onclick = () => { free(); st.f = b.dataset.f; const first = ORDER.find(id => st.f === 'all' || ITEMS[id].problem === st.f); st.pick = first; });
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    const STEP = 1.6, DURS = ORDER.length * STEP + 3;
    const tiles = {};
    cv.addEventListener('click', e => {
      const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * W / r.width, y = (e.clientY - r.top) * H / r.height;
      const hit = Object.entries(tiles).find(([, b]) => x > b[0] && x < b[0] + b[2] && y > b[1] && y < b[1] + b[3]);
      if (hit) { free(); st.pick = hit[0]; }
    });
    function render() {
      const t = st.t, shown = st.tour ? Math.min(ORDER.length, Math.floor(t / STEP) + 1) : ORDER.length;
      if (st.tour) { st.f = 'all'; st.pick = ORDER[Math.min(ORDER.length - 1, Math.floor(t / STEP))]; }
      T.use(g); panel(g);
      txt(g, 'Twenty of Brian Feeney’s items, sorted by what they change', 22, 26, '800 20px Montserrat');
      const bw = 246, by = 48, bh = 300;
      BINS.forEach((b, i) => {
        const bx = 18 + i * (bw + 8);
        box(g, bx, by, bw, bh, b.fill, b.edge, 12, 2);
        txt(g, b.name, bx + 14, by + 22, '800 17px Montserrat', b.col); txt(g, b.sub, bx + 14, by + 44, '600 13px Jost', C.muted);
        const mine = ORDER.slice(0, shown).filter(id => ITEMS[id].bin === b.id);
        txt(g, String(mine.length), bx + bw - 16, by + 23, '800 22px Montserrat', b.col, 'right');
        mine.forEach((id, j) => {
          const it = ITEMS[id], tx = bx + 10 + (j % 2) * 116, ty = by + 60 + Math.floor(j / 2) * 78, dim = st.f !== 'all' && it.problem !== st.f;
          const k = st.tour && id === ORDER[shown - 1] ? ease(clamp((t - (shown - 1) * STEP) / .5)) : 1;
          tiles[id] = [tx, ty, 110, 72];
          g.save(); g.globalAlpha = dim ? .25 : k;
          box(g, tx, ty + (1 - k) * -30, 110, 72, id === st.pick ? '#fffaf0' : 'rgba(255,252,244,.85)', id === st.pick ? b.col : '#d9ccae', 9, id === st.pick ? 3 : 1.5);
          ic(g, it.icon, tx + 55, ty + 26 + (1 - k) * -30, 32, b.col);
          const nm = wrap(g, it.name, 102, '700 11.5px Jost'); nm.slice(0, 2).forEach((l, q) => txt(g, l, tx + 55, ty + 52 + q * 12 + (1 - k) * -30, '700 11.5px Jost', C.ink, 'center'));
          g.restore();
        });
      });
      // the picked item
      const it = ITEMS[st.pick], bin = BINS.find(b => b.id === it.bin), pr = PROBLEMS.find(p => p.id === it.problem);
      box(g, 18, 358, 1008, 218, '#fffaf0', bin.edge, 12, 2.5);
      ic(g, it.icon, 74, 420, 70, bin.col);
      txt(g, it.name, 126, 384, '800 21px Montserrat'); txt(g, `${it.type} · used on ${pr.name.toLowerCase()} · ${bin.name.toLowerCase()}`, 126, 408, '600 14px Jost', bin.col);
      txt(g, 'From the sheet', 126, 436, '800 12px Montserrat', C.muted);
      para(g, '“' + it.sheet + '”', 126, 456, 880, 18, 'italic 500 14.5px Jost', C.ink, 4);
      txt(g, 'What it changes', 126, 534, '800 12px Montserrat', C.muted);
      para(g, it.change, 126, 554, 880, 18, '600 15px Jost', bin.col, 1);
      $$(s, '.so-f .btn').forEach(b => b.classList.toggle('on', b.dataset.f === st.f));
      const key = st.pick; if (key === st.key) return; st.key = key;
      const counts = BINS.map(b => `${ORDER.filter(id => ITEMS[id].bin === b.id).length} ${b.name.toLowerCase()}`).join(', ');
      say($(s, '.so-out'), `${it.name}: ${bin.name.toLowerCase()}. Of the twenty: ${counts}. Only ${ORDER.filter(id => ITEMS[id].bin === 'remove').length} simply take the die away; the rest change who rolls, what kind of scene it is, or what failing costs.`);
    }
    apis.sort = { seek(t) { st.held = st.tour = true; st.t = t; render(); }, dur: () => DURS };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > DURS) st.t = 0; render(); };
  });

  /* ---------- 3: hand out the loot ---------- */
  const PARTY = ['F', 'R', 'W', 'B'];
  // who can lead an answer to a problem: classic answers by their class, items by whoever holds them.
  // Answers that belong to everyone (hold your breath, find another way, passive Perception) lead nobody's scene, so they are left out.
  function answers(load) {
    return PROBLEMS.map(p => PARTY.map(k => [
      ...p.classic.filter(a => a.id !== 'jump' && a.who === k),
      ...p.items.filter(a => load[k] === a.id),
    ]));
  }
  const TOUR = [{}, { B: 'powder' }, { B: 'powder', F: 'badge' }, { B: 'powder', F: 'badge', W: 'blade' }, { B: 'powder', F: 'badge', W: 'blade', R: 'bread' },
    { F: 'pendant', R: 'cowl', W: 'portal', B: 'key' }, { F: 'wool', R: 'shrooms', W: 'gills', B: 'hanky' }];
  const TSTEP = 4;
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const roll = rng(29);
  canvasDemo('loot', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, load: {}, key: '' };
    const tourBtn = $(s, '.lo-tour'), free = freeOf(st, tourBtn);
    const sels = PARTY.map(k => $(s, `.lo-${k}`));
    const opts = '<option value="">nothing</option>' + ORDER.map(id => `<option value="${id}">${ITEMS[id].name}</option>`).join('');
    sels.forEach((el, i) => { el.innerHTML = opts; el.onchange = () => { free(); st.load[PARTY[i]] = el.value || undefined; }; });
    $(s, '.lo-roll').onclick = () => { free(); const bag = ORDER.slice(); st.load = {}; PARTY.forEach(k => { st.load[k] = bag.splice(Math.floor(roll() * bag.length), 1)[0]; }); };
    $(s, '.lo-clear').onclick = () => { free(); st.load = {}; };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    const DURL = TOUR.length * TSTEP;
    function render() {
      if (st.tour) st.load = { ...TOUR[Math.min(TOUR.length - 1, Math.floor(st.t / TSTEP))] };
      const load = st.load, A = answers(load), base = answers({});
      T.use(g); panel(g);
      txt(g, 'Give each player one item. Who can lead an answer now?', 22, 26, '800 20px Montserrat');
      const x0 = 210, cw = 196, y0 = 52, rh = 78;
      PARTY.forEach((k, j) => {
        const x = x0 + j * cw;
        box(g, x + 4, y0, cw - 8, 70, 'rgba(255,252,244,.9)', CLASSES[k].col, 10, 2.5);
        tok(g, k, x + 32, y0 + 35, { s: 1 });
        txt(g, CLASSES[k].name, x + 58, y0 + 20, '800 16px Montserrat');
        const it = ITEMS[load[k]];
        if (it) { ic(g, it.icon, x + 70, y0 + 48, 24, C.goldInk); para(g, it.name, x + 86, y0 + 42, cw - 96, 13, '700 12px Jost', C.goldInk, 2); }
        else txt(g, 'no item', x + 58, y0 + 48, '600 13px Jost', C.muted);
      });
      PROBLEMS.forEach((p, i) => {
        const y = y0 + 80 + i * rh;
        box(g, 18, y, 1008, rh - 6, i % 2 ? 'rgba(239,228,204,.35)' : 'rgba(255,252,244,.6)', null, 8);
        ic(g, p.icon, 44, y + rh / 2 - 3, 36, C.navy); para(g, p.name.replace('The ', ''), 70, y + 24, 130, 17, '800 15px Montserrat', C.ink, 2);
        PARTY.forEach((k, j) => {
          const list = A[i][j], x = x0 + j * cw + 12;
          if (!list.length) { txt(g, '—', x + cw / 2 - 12, y + rh / 2 - 3, '700 20px Jost', '#c4b48f', 'center'); return; }
          list.slice(0, 4).forEach((a, q) => {
            const cx = x + 22 + q * 44, cy = y + rh / 2 - 3, isNew = a.kind === 'item';
            g.fillStyle = isNew ? '#fde9b8' : '#eef1fb'; g.strokeStyle = a.sure ? C.good : '#8ea2e6'; g.lineWidth = a.sure ? 3 : 2;
            g.beginPath(); g.arc(cx, cy, 19, 0, 7); g.fill(); g.stroke();
            ic(g, a.icon, cx, cy, 24, isNew ? C.goldInk : C.navy);
            if (!a.sure) ic(g, 'dice-twenty-faces-twenty', cx + 14, cy - 14, 15, C.muted);
          });
        });
      });
      // totals
      const lead = PARTY.map((k, j) => A.filter(r => r[j].length).length), lead0 = PARTY.map((k, j) => base.filter(r => r[j].length).length);
      const y = y0 + 80 + 5 * rh + 4;
      txt(g, 'Problems each player can lead', 22, y + 14, '700 14px Jost', C.muted);
      PARTY.forEach((k, j) => { const x = x0 + j * cw + 16; for (let q = 0; q < 5; q++) { g.fillStyle = q < lead[j] ? (q < lead0[j] ? CLASSES[k].col : '#e0a92d') : '#e8dcc0'; g.beginPath(); g.roundRect(x + q * 24, y + 4, 20, 20, 5); g.fill(); } txt(g, `${lead[j]} of 5`, x + 126, y + 14, '700 14px Jost', C.ink); });
      txt(g, 'Gold: from an item · green ring: no die decides it · d20: a roll decides it · answers everyone shares are left out', 22, y + 40, '600 13px Jost', C.muted);
      PARTY.forEach((k, i) => sels[i].value = load[k] || '');
      const key = PARTY.map(k => load[k] || '').join(); if (key === st.key) return; st.key = key;
      const n = PARTY.filter(k => load[k]).length;
      say($(s, '.lo-out'), n ? `With ${n} item${n > 1 ? 's' : ''} handed out, the players can lead ${lead.reduce((a, b) => a + b, 0)} problem-answers between them, up from ${lead0.reduce((a, b) => a + b, 0)}. The Bard goes from ${lead0[3]} of 5 to ${lead[3]} of 5.`
        : `No items: each classic answer sits with the class built for it. The Rogue leads ${lead0[1]} of 5 problems and the Bard leads ${lead0[3]}: the talking one.`);
    }
    apis.loot = { seek(t) { st.held = st.tour = true; st.t = t; render(); }, dur: () => DURL };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > DURL) st.t = 0; render(); };
  });

  window.__seek = (t, w) => apis[w].seek(t);
  window.__dur = w => apis[w].dur();
})();
