/* Contrapositive rules (MGM C4 M3, deck slides 135-136, 139-140 in the editor). Same layout as the deck's burning / chillable
   pair: two statements, A -> B and ~B -> ~A, each with a check and a set diagram (B a blue circle, A an orange one, ~B the red
   box). Slide 1: Mario's stomp, where both hold. Slide 2: League of Legends brush, where both break together, on purpose.
   The game strip under the statements plays the evidence; each check flips when its moment happens. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;
  const W = 1040, H = 585;
  const BLUE = '#5b8fe0', ORANGE = '#f5a524', RED = '#cf3b2a', OK = '#2fae63', NO = '#e5322d';

  const IMG = {};
  ['smb-mario', 'smb-mario-walk1', 'smb-mario-walk2', 'smb-mario-walk3', 'smb-mario-jump', 'smb-goomba', 'smb-goomba-flat', 'smb-koopa',
    'smb-koopa-shell', 'smb-spiny', 'smb-ground', 'lol-ashe', 'lol-pyke'].forEach(n => { const i = new Image(); i.src = `img/${n}.png`; IMG[n] = i; });
  const ready = i => i && i.complete && i.naturalWidth;

  // a pixel sprite with its feet at (x, foot), P screen px per sprite pixel
  function sprite(g, name, x, foot, P, o = {}) {
    const im = IMG[name]; if (!ready(im)) return;
    const w = im.naturalWidth * P, h = im.naturalHeight * P;
    g.save(); g.imageSmoothingEnabled = false; g.globalAlpha *= o.a ?? 1;
    g.translate(Math.round(x), Math.round(foot - h / 2)); if (o.flip) g.scale(-1, 1);
    g.drawImage(im, -w / 2, -h / 2, w, h); g.restore();
  }
  // a champion portrait in a coloured ring
  function portrait(g, name, x, y, r, ring, a = 1) {
    const im = IMG[name];
    g.save(); g.globalAlpha *= a;
    g.beginPath(); g.arc(x, y, r + 4, 0, Math.PI * 2); g.fillStyle = ring; g.fill();
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.clip();
    if (ready(im)) g.drawImage(im, x - r, y - r, r * 2, r * 2); else { g.fillStyle = '#333'; g.fill(); }
    g.restore();
  }
  // text runs: [[text, colour], ...]
  function runs(g, parts, x, y, size = 25) {
    g.font = `600 ${size}px Jost, sans-serif`; g.textAlign = 'left'; g.textBaseline = 'middle';
    for (const [s, col] of parts) {
      if (col !== C.ink) { g.font = `700 ${size}px Jost, sans-serif`; }
      g.fillStyle = col; g.fillText(s, x, y); x += g.measureText(s).width;
      g.font = `600 ${size}px Jost, sans-serif`;
    }
  }
  function mark(g, x, y, state, pulse) {
    // state: 0 unknown, 1 holds, -1 breaks
    const s = 1 + .35 * Math.max(0, 1 - pulse) * (pulse >= 0 ? 1 : 0);
    g.save(); g.translate(x, y); g.scale(s, s); g.lineCap = 'round'; g.lineJoin = 'round';
    if (!state) { g.font = '700 40px Montserrat, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(38,44,106,.25)'; g.fillText('?', 0, 2); }
    else if (state > 0) { g.strokeStyle = OK; g.lineWidth = 9; g.beginPath(); g.moveTo(-18, 2); g.lineTo(-5, 16); g.lineTo(20, -16); g.stroke(); }
    else { g.strokeStyle = NO; g.lineWidth = 9; g.beginPath(); g.moveTo(-16, -16); g.lineTo(16, 16); g.moveTo(16, -16); g.lineTo(-16, 16); g.stroke(); }
    g.restore();
  }
  // the set diagram: blue B, orange A at offset `out` (0 inside B, 1 poking out), red box for ~B on the second row
  function venn(g, x, y, w, h, o) {
    g.save();
    g.fillStyle = o.neg ? RED : 'rgba(255,255,255,.0)';
    if (o.neg) { g.beginPath(); g.roundRect(x, y, w, h, 6); g.fill(); }
    const cx = x + w / 2 - 14, cy = y + h / 2, rx = 92, ry = 52;
    g.fillStyle = BLUE; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); g.fill();
    const ox = lerp(cx + 22, cx + 86, o.out), oy = lerp(cy + 4, cy + 16, o.out), r = 38;
    g.fillStyle = 'rgba(245,165,36,.92)'; g.beginPath(); g.arc(ox, oy, r, 0, Math.PI * 2); g.fill();
    if (o.out > .02) {   // the part of A outside B: hatch it so it reads as "A without B"
      g.save(); g.beginPath(); g.rect(x, y, w, h); g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2, true); g.clip('evenodd');
      g.beginPath(); g.arc(ox, oy, r, 0, Math.PI * 2); g.clip();
      g.strokeStyle = 'rgba(120,40,0,.55)'; g.lineWidth = 3;
      for (let k = -60; k < 60; k += 9) { g.beginPath(); g.moveTo(ox + k - 30, oy - 30); g.lineTo(ox + k + 30, oy + 30); g.stroke(); }
      g.restore();
      g.strokeStyle = '#7a3a00'; g.lineWidth = 2.5; g.beginPath(); g.arc(ox, oy, r, 0, Math.PI * 2); g.stroke();
    }
    g.restore();
    return { cx, cy, rx, ry, ox, oy, r };
  }
  function glow(g, x, y, r, col, a) {
    if (a <= 0 || a > 1) return;   // only in the second after its moment
    g.save(); g.globalAlpha = clamp(a); g.strokeStyle = col; g.lineWidth = 4; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke(); g.restore();
  }

  // the two statement rows plus legend; rows = [{parts, state, pulse}], icons drawn by the caller through vennAt
  const ROW_Y = [44, 184], ROW_H = 128, VX = 690, VW = 320;
  function frame(g, legend, rows, vennOpt, icons) {
    T.use(g); g.clearRect(0, 0, W, H);
    // legend, top right, like the deck's
    g.font = '700 17px Jost, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle';
    let lx = VX + 4;
    for (const [txt, col] of legend) { g.fillStyle = col; g.beginPath(); g.arc(lx + 7, 18, 7, 0, Math.PI * 2); g.fill(); g.fillStyle = C.ink; g.fillText(txt, lx + 20, 19); lx += 34 + g.measureText(txt).width; }
    rows.forEach((row, i) => {
      const y = ROW_Y[i];
      g.fillStyle = 'rgba(255,250,240,.85)'; g.strokeStyle = '#cdbf9f'; g.lineWidth = 2;
      g.beginPath(); g.roundRect(14, y - 6, W - 28, ROW_H + 12, 12); g.fill(); g.stroke();
      g.font = '700 14px Montserrat, sans-serif'; g.fillStyle = C.muted; g.textAlign = 'left';
      g.fillText(i ? 'CONTRAPOSITIVE  ~B → ~A' : 'RULE  A → B', 36, y + 18);
      runs(g, row.parts[0], 36, y + 58); if (row.parts[1]) runs(g, row.parts[1], 36, y + 92);
      mark(g, 628, y + ROW_H / 2, row.state, row.pulse);
      const v = venn(g, VX, y, VW, ROW_H, { neg: i === 1, out: vennOpt.out });
      icons(g, v, i, y);
    });
  }
  function caption(g, text, y = 342) {
    if (!text) return;
    g.font = '600 19px Jost, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = C.ink;
    g.fillText(text, W / 2, y);
  }
  // check state from event times: holds after t1, breaks after t2
  const stateAt = (t, t1, t2 = Infinity) => t >= t2 ? [-1, t - t2] : t >= t1 ? [1, t - t1] : [0, -1];
  const fade = (t, dur) => clamp(Math.min(t / .4, (dur - t) / .5));

  /* ---------- slide 1: Mario's stomp ---------- */
  const SKY = '#5c94fc', SX = 20, SY = 362, SW = 1000, SH = 210, P = 4, GROUND = SY + SH - 52;
  const GOOMBA = 300, KOOPA = 580, SPINY = 860;
  const E = { goomba: 2.1, koopa: 4.8, spiny: 7.4 };
  const S_DUR = 13;
  // Mario's motion: runs and arcs, each [t0, t1, kind, x0, x1, y0, y1, height]
  const top = (h) => GROUND - h * P;
  const MOVES = [
    [0, 1.4, 'run', 40, 230], [1.4, 2.1, 'arc', 230, GOOMBA, GROUND, top(16), 80], [2.1, 2.7, 'arc', GOOMBA, 390, top(16), GROUND, 70],
    [2.7, 4.0, 'run', 390, 520], [4.0, 4.8, 'arc', 520, KOOPA, GROUND, top(24), 70], [4.8, 5.4, 'arc', KOOPA, 680, top(24), GROUND, 60],
    [5.4, 6.6, 'run', 680, 800], [6.6, 7.4, 'arc', 800, SPINY, GROUND, top(15), 80], [7.4, 8.2, 'hurt', SPINY, 760, top(15), GROUND, 60],
    [8.2, 99, 'stand', 760, 760]];
  function marioAt(t) {
    const m = MOVES.find(m => t < m[1]) || MOVES.at(-1), k = clamp((t - m[0]) / (m[1] - m[0]));
    const [, , kind, x0, x1, y0, y1, h] = m;
    // the SMB run cycle, one frame per 10 px covered so the feet keep pace with the ground
    if (kind === 'run') { const x = lerp(x0, x1, k); return { x, y: GROUND, spr: 'smb-mario-walk' + (1 + Math.floor(x / 10) % 3) }; }
    if (kind === 'stand') return { x: x0, y: GROUND, spr: 'smb-mario', blink: t < 9.6 };
    const y = lerp(y0, y1, k) - h * 4 * k * (1 - k);
    return { x: lerp(x0, x1, k), y, spr: 'smb-mario-jump', flip: kind === 'hurt', blink: kind === 'hurt' };
  }
  function stompScene(g, t) {
    g.save(); g.beginPath(); g.roundRect(SX, SY, SW, SH, 10); g.clip();
    g.fillStyle = SKY; g.fillRect(SX, SY, SW, SH);
    for (let x = SX; x < SX + SW; x += 16 * P / 1.23) sprite(g, 'smb-ground', x + 26, SY + SH, P / 1.23);
    // enemies
    const step = Math.floor(t * 4) % 2 === 0;
    if (t < E.goomba) sprite(g, 'smb-goomba', GOOMBA, GROUND, P, { flip: step });
    else if (t < E.goomba + 1) sprite(g, 'smb-goomba-flat', GOOMBA, GROUND, P);
    sprite(g, t < E.koopa ? 'smb-koopa' : 'smb-koopa-shell', KOOPA, GROUND, P);
    sprite(g, 'smb-spiny', SPINY, GROUND, P);
    // Mario
    const m = marioAt(t);
    if (!(m.blink && Math.floor(t * 12) % 2)) sprite(g, m.spr, m.x, m.y, P, { flip: m.flip });
    // pop text at each landing
    const pop = (txt, x, t0, col) => { const a = t - t0; if (a >= 0 && a < 1.6) T.popText(txt, x, top(26) - a * 26, col, 1.6 - a); };
    pop('Stomp ✔', GOOMBA, E.goomba, OK); pop('Stomp ✔', KOOPA, E.koopa, OK); pop('Spikes: no stomp', SPINY, E.spiny, NO);
    if (t >= E.spiny && t < E.spiny + .25) T.flash(SPINY, top(16), 40, 1 - (t - E.spiny) / .25);
    g.restore();
    g.strokeStyle = C.navy; g.lineWidth = 3; g.beginPath(); g.roundRect(SX, SY, SW, SH, 10); g.stroke();
  }
  function stompDraw(g, t) {
    const r1 = stateAt(t, E.goomba), r2 = stateAt(t, E.spiny);
    const s = ORANGE, b = BLUE, k = C.ink;
    frame(g, [['Safe to touch on top (B)', BLUE], ['Stompable (A)', ORANGE]], [
      { parts: [[['If Mario can ', k], ['stomp', s], [' an enemy,', k]], [['its top is ', k], ['safe to touch', b], ['.', k]]], state: r1[0], pulse: r1[1] },
      { parts: [[['If its top is NOT ', k], ['safe to touch', b], [',', k]], [['Mario can NOT ', k], ['stomp', s], [' it.', k]]], state: r2[0], pulse: r2[1] },
    ], { out: 0 }, (g, v, row, y) => {
      if (row === 0) {
        sprite(g, 'smb-goomba', v.ox - 15, v.oy + 16, 2, { a: t >= E.goomba ? 1 : .35 });
        sprite(g, 'smb-koopa', v.ox + 16, v.oy + 22, 2, { a: t >= E.koopa ? 1 : .35 });
        glow(g, v.ox - 15, v.oy, 22, '#fff', 1 - (t - E.goomba)); glow(g, v.ox + 16, v.oy - 2, 27, '#fff', 1 - (t - E.koopa));
      } else {
        const sx = VX + VW - 30, sy = y + ROW_H - 22;
        sprite(g, 'smb-spiny', sx, sy + 13, 2, { a: t >= E.spiny ? 1 : .35 });
        glow(g, sx, sy - 3, 24, '#fff', 1 - (t - E.spiny));
        g.font = '700 13px Jost, sans-serif'; g.fillStyle = '#fff'; g.textAlign = 'left'; g.fillText('NOT safe on top', VX + 8, y + 14);
      }
    });
    const cap = t < E.goomba ? 'Mario stomps whatever is safe to land on.' : t < E.koopa ? 'Goomba: stompable, and safe on top. The rule holds.'
      : t < E.spiny ? 'Koopa Troopa: stompable, and safe on top. Still holds.' : 'Spiny: spikes on top, so no stomp. The contrapositive holds too, and A stays inside B.';
    caption(g, cap); stompScene(g, t);
    return cap;
  }

  /* ---------- slide 2: League of Legends brush ---------- */
  const B_DUR = 15, HIDE = 7.0, BREAK2 = 7.2, BREAK1 = 8.4, STAMP = 9.8;
  const LANE_Y = SY + 128, BRUSH = { x: 690, y: SY + 22, w: 150, h: 84 };
  const ashe = T.Path([80, LANE_Y + 8], 110).go(330, LANE_Y + 8).wait(20);
  const pyke = T.Path([920, LANE_Y], 90).wait(4.4).go(860, LANE_Y - 30).go(BRUSH.x + BRUSH.w / 2, BRUSH.y + BRUSH.h / 2).wait(20);
  function tuft(g, x, y, s, a = 1) {
    g.save(); g.globalAlpha *= a; g.translate(x, y); g.scale(s, s);
    for (let i = -3; i <= 3; i++) {
      g.fillStyle = i % 2 ? '#2f6b2c' : '#3f8a37'; g.beginPath(); g.moveTo(i * 6 - 5, 0); g.quadraticCurveTo(i * 9, -20 - Math.abs(3 - Math.abs(i)) * 5, i * 6 + 5, 0); g.fill();
    }
    g.restore();
  }
  function brushPatch(g) {
    const { x, y, w, h } = BRUSH;
    g.fillStyle = 'rgba(30,80,30,.55)'; g.beginPath(); g.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); g.fill();
    for (let j = 0; j < 3; j++) for (let i = 0; i < 5; i++) tuft(g, x + 18 + i * 28 + (j % 2) * 12, y + 26 + j * 24, 1.1);
  }
  function sight(g, a, b, col, solid, label, side) {
    const ang = Math.atan2(b.y - a.y, b.x - a.x), d = Math.hypot(b.x - a.x, b.y - a.y), off = side * 15;
    const dir = b.x >= a.x ? 1 : -1, nx = -Math.sin(ang) * off * dir, ny = Math.cos(ang) * off * dir;   // the same side whichever way the line runs
    const x0 = a.x + Math.cos(ang) * 40 + nx, y0 = a.y + Math.sin(ang) * 40 + ny;
    const end = solid ? d - 44 : d * .55;
    const x1 = a.x + Math.cos(ang) * end + nx, y1 = a.y + Math.sin(ang) * end + ny;
    g.save(); g.strokeStyle = col; g.lineWidth = 4; g.lineCap = 'round'; if (!solid) g.setLineDash([6, 8]);
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); g.setLineDash([]);
    if (solid) { g.fillStyle = col; g.beginPath(); g.moveTo(x1 + Math.cos(ang) * 6, y1 + Math.sin(ang) * 6); g.lineTo(x1 - Math.cos(ang - .5) * 14, y1 - Math.sin(ang - .5) * 14); g.lineTo(x1 - Math.cos(ang + .5) * 14, y1 - Math.sin(ang + .5) * 14); g.fill(); }
    else mark(g, x1 + Math.cos(ang) * 14, y1 + Math.sin(ang) * 14, -1, -1);
    g.restore();
    if (label) { const lx = solid ? (x0 + x1) / 2 : lerp(x0, x1, .45); T.label(label, lx, (y0 + y1) / 2 + side * 30, 'center', col, 15); }
  }
  function brushScene(g, t) {
    g.save(); g.beginPath(); g.roundRect(SX, SY, SW, SH, 10); g.clip();
    g.fillStyle = '#4f7d3f'; g.fillRect(SX, SY, SW, SH);
    g.fillStyle = '#b79c6b'; g.fillRect(SX, LANE_Y - 34, SW, 68);
    g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(SX, LANE_Y - 34, SW, 4); g.fillRect(SX, LANE_Y + 30, SW, 4);
    brushPatch(g);
    const a = ashe.at(t), p = pyke.at(t), hidden = t >= HIDE;
    // sight lines: Pyke always sees Ashe; Ashe sees Pyke only while he is out of the brush
    sight(g, p, a, NO, true, 'Pyke sees Ashe', -1);
    sight(g, a, p, BLUE, !hidden, hidden ? 'Ashe can NOT see Pyke' : 'Ashe sees Pyke', 1);
    portrait(g, 'lol-ashe', a.x, a.y, 30, BLUE);
    portrait(g, 'lol-pyke', p.x, p.y, 30, NO, hidden ? .45 : 1);
    if (hidden) { g.save(); g.setLineDash([5, 5]); g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(p.x, p.y, 38, 0, Math.PI * 2); g.stroke(); g.restore(); }
    T.label('Ashe (you)', a.x, a.y + 48, 'center', C.ink, 14);
    if (hidden) T.label('Pyke, hidden in brush', BRUSH.x + BRUSH.w + 12, p.y, 'left', C.ink, 14); else T.label('Pyke (enemy)', p.x, p.y + 48, 'center', C.ink, 14);
    T.stamp('Deliberate: brush is built for ambushes', SX + 270, SY + 40, C.goldInk, clamp((t - STAMP) / .4), 22);
    g.restore();
    g.strokeStyle = C.navy; g.lineWidth = 3; g.beginPath(); g.roundRect(SX, SY, SW, SH, 10); g.stroke();
  }
  function brushDraw(g, t) {
    const r1 = stateAt(t, 2.6, BREAK1), r2 = stateAt(t, 2.9, BREAK2);
    const s = ORANGE, b = BLUE, k = C.ink, out = ease(clamp((t - BREAK2) / .8));
    frame(g, [['You see them (B)', BLUE], ['They see you (A)', ORANGE]], [
      { parts: [[['If an enemy can ', k], ['see you', s], [',', k]], [['you can ', k], ['see them', b], ['.', k]]], state: r1[0], pulse: r1[1] },
      { parts: [[['If you can NOT ', k], ['see them', b], [',', k]], [['they can NOT ', k], ['see you', s], ['.', k]]], state: r2[0], pulse: r2[1] },
    ], { out }, (g, v, row, y) => {
      if (out > .3) { tuft(g, v.ox + 12, v.oy + 12, .8, out); }
      if (row === 1) { g.font = '700 13px Jost, sans-serif'; g.fillStyle = '#fff'; g.textAlign = 'left'; g.fillText('You can NOT see them', VX + 8, y + 14); }
    });
    const cap = t < HIDE ? 'Open lane: Ashe sees Pyke and Pyke sees Ashe. Both lines hold.'
      : t < BREAK1 ? 'Pyke steps into the brush. Ashe can NOT see him, but he still sees her.'
      : 'A rule and its contrapositive are the same statement, so they break together. Here the break is the point.';
    caption(g, cap); brushScene(g, t);
    return cap;
  }

  /* ---------- wiring: walk-through, jump buttons, seek hooks ---------- */
  const api = {};
  function wire(name, dur, draw) {
    canvasDemo(name, (s, cv, g) => {
      const st = { tour: true, t: 0, held: false, last: '' };
      const tourBtn = $(s, '.cr-tour');
      $$(s, '.cr-go').forEach(b => b.onclick = () => { st.t = +b.dataset.t; st.tour = false; tourBtn.classList.remove('on'); });
      tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
      function render() {
        g.save(); g.globalAlpha = 1; const cap = draw(g, st.t); g.restore();
        // fade the loop seam
        const a = 1 - fade(st.t, dur); if (a > 0) { g.fillStyle = `rgba(243,236,220,${a})`; g.fillRect(0, 0, W, H); }
        if (cap !== st.last) { st.last = cap; say($(s, '.cr-out'), cap); }
      }
      api[name] = { seek(t) { st.held = true; st.t = t; render(); }, dur: () => dur };
      return dt => {
        if (!st.held) { st.t += dt; if (st.t > dur) st.t = st.tour ? 0 : dur - .6; }
        render();
      };
    });
  }
  wire('stomp', S_DUR, stompDraw);
  wire('brush', B_DUR, brushDraw);
  window.__seek = (t, which) => api[which].seek(t);
  window.__dur = which => api[which].dur();
})();
