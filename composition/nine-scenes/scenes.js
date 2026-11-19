/* The nine fundamentals of action games, one scene each (MGM C4 M7, deck slides 244-254), seen from above like a
   top-down action RPG (No Rest for the Wicked is the game the framework was built on).
   Every scene has the same layout: a top-down arena, the cell's definition, the 3 x 3 grid with the cell lit, the deck's own
   examples as a list, and a timeline with the cell's column (before, during, post) marked. The arena plays EVERY example the
   deck lists for that cell, one short vignette each, high risk first; the list row and the timeline follow along.
   Scenes: 'f-initiate', 'f-zone', 'f-punish', 'f-mitigate', 'f-reflex', 'f-react', 'f-setup', 'f-counterplay', 'f-response'.
   Names, definitions and the example lists are the deck's. How each example is staged, the captions and every number are
   this page's illustration. Each scene is a pure function of time: window.__seek(t, which) / __dur(which). */
(function () {
  const { text, wrap, chip, panel, scene, clamp, ease, lerp, icon, arrow } = CK;
  const T = TD, C = TD.C, TAU = Math.PI * 2, PI = Math.PI;
  const ph = (t, a, b) => clamp((t - a) / (b - a));
  const ROWS = [['Offensive', '#e5736b', 'crossed-swords', '#a8322a'], ['Defensive', '#6f93e0', 'checked-shield', '#2f55a8'], ['Predictive', '#62b77c', 'eye-target', '#1f7a3f']];
  const COLS = [['Before', '#f2c94c', '#8a6500'], ['During', '#f0954a', '#9a4a06'], ['Post', '#9b7fd6', '#4b2c8a']];
  const CELLS = [
    ['Initiate', 'Pre-empting the opponent by performing an offensive, proactive action.'],
    ['Zone', 'Putting hitboxes out to influence what the opponent is doing and where they go.'],
    ['Punish', 'Making use of an enemy mistake to land an attack that would otherwise not be possible or easy to avoid.'],
    ['Mitigate', 'Proactively acting to prevent or reduce an incoming attack.'],
    ['Reflex', 'Twitch-responses to an incoming attack in flight.'],
    ['React', 'Done in response to a situation, such as an enemy telegraph or an attack hitting you.'],
    ['Setup', 'Performing an action to prepare before an exchange.'],
    ['Counterplay', 'Observing the opponent’s patterns, reading when they will repeat, and countering them during the exchange.'],
    ['Response', 'Seeing how the opponent is playing and changing your own state to improve your situation.'],
  ];
  const HI = '#a8201c', LO = '#1c6fa8', YOU = '#2ea3dc', FOE = '#d0574f', GREEN = '#1a8a4c';
  // the arena, in its own coordinates
  const SX = 20, SY = 126, SW = 670, SH = 356, Z = 1.3;     // the arena is drawn 1.3x, centred on (350, 190)
  let READ = null;

  /* ---------- time helpers ---------- */
  // keyframes [[t, x, y], ...] -> {x, y}, eased between neighbours
  const mv = (a, keys) => {
    if (a <= keys[0][0]) return { x: keys[0][1], y: keys[0][2] };
    for (let i = 0; i < keys.length - 1; i++) if (a < keys[i + 1][0]) { const k = ease(ph(a, keys[i][0], keys[i + 1][0])); return { x: lerp(keys[i][1], keys[i + 1][1], k), y: lerp(keys[i][2], keys[i + 1][2], k) }; }
    const l = keys[keys.length - 1]; return { x: l[1], y: l[2] };
  };
  const kv = (a, keys) => mv(a, keys.map(k => [k[0], k[1], 0])).x;
  const win = (a, t0, t1, f = .18) => Math.min(ph(a, t0, t0 + f), 1 - ph(a, t1 - f, t1));     // 0..1 while t0 < a < t1
  const REST = .5, WIND = 2.3, THRU = -1.25;
  // a swing that lands at `hit`: wind back from t0, cut through, recover
  function swing(a, t0, hit) {
    if (a < t0 || a > hit + .5) return { wa: REST, trail: 0 };
    if (a < hit - .1) return { wa: lerp(REST, WIND, ease(ph(a, t0, hit - .1))), trail: 0 };
    if (a < hit + .08) return { wa: lerp(WIND, THRU, ph(a, hit - .1, hit + .08)), trail: 1 };
    return { wa: lerp(THRU, REST, ease(ph(a, hit + .08, hit + .5))), trail: 1 - ph(a, hit + .08, hit + .3) };
  }
  // a thrust that is fully out at `hit`
  function thrust(a, t0, hit) {
    if (a < t0 || a > hit + .4) return { wa: REST, th: 0 };
    if (a < hit - .08) return { wa: lerp(REST, 0, ph(a, t0, t0 + .1)), th: -.5 * ease(ph(a, t0, hit - .08)) };
    if (a < hit + .12) return { wa: 0, th: lerp(-.5, 1, ph(a, hit - .08, hit)) };
    return { wa: lerp(0, REST, ph(a, hit + .12, hit + .4)), th: 1 - ease(ph(a, hit + .12, hit + .4)) };
  }

  /* ---------- drawing: figures seen from above ---------- */
  const LEN = { sword: 38, spear: 62, hammer: 40, club: 42, staff: 46, bow: 16, none: 0 };
  function weapon(g, kind, o) {
    g.lineCap = 'round'; g.lineJoin = 'round';
    if (o.wglow) { g.shadowColor = o.wglow; g.shadowBlur = 16; }
    if (kind === 'sword') {
      g.strokeStyle = '#152044'; g.lineWidth = 7; g.beginPath(); g.moveTo(8, 0); g.lineTo(38, 0); g.stroke();
      g.strokeStyle = o.wglow || '#eef1f7'; g.lineWidth = 4; g.beginPath(); g.moveTo(8, 0); g.lineTo(37, 0); g.stroke();
      g.shadowBlur = 0; g.strokeStyle = '#8a6a3a'; g.lineWidth = 4; g.beginPath(); g.moveTo(8, -6); g.lineTo(8, 6); g.stroke();
    } else if (kind === 'spear') {
      g.strokeStyle = '#6b4a22'; g.lineWidth = 4; g.beginPath(); g.moveTo(-16, 0); g.lineTo(50, 0); g.stroke();
      g.fillStyle = o.wglow || '#eef1f7'; g.strokeStyle = '#152044'; g.lineWidth = 2; g.beginPath(); g.moveTo(48, -6); g.lineTo(64, 0); g.lineTo(48, 6); g.closePath(); g.fill(); g.stroke();
    } else if (kind === 'hammer') {
      g.strokeStyle = '#6b4a22'; g.lineWidth = 5; g.beginPath(); g.moveTo(0, 0); g.lineTo(32, 0); g.stroke();
      g.fillStyle = o.wglow || '#9aa0b8'; g.strokeStyle = '#152044'; g.lineWidth = 2.5; g.beginPath(); g.roundRect(26, -12, 15, 24, 3); g.fill(); g.stroke();
    } else if (kind === 'club') {
      g.fillStyle = '#7a5630'; g.strokeStyle = '#3a2610'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(0, -3); g.lineTo(40, -7); g.quadraticCurveTo(48, 0, 40, 7); g.lineTo(0, 3); g.closePath(); g.fill(); g.stroke();
    } else if (kind === 'staff') {
      g.strokeStyle = '#5a3a7a'; g.lineWidth = 4; g.beginPath(); g.moveTo(-6, 0); g.lineTo(42, 0); g.stroke();
      g.fillStyle = o.wglow || '#e0c7ff'; g.strokeStyle = '#2e1760'; g.lineWidth = 2; g.beginPath(); g.arc(46, 0, 7, 0, TAU); g.fill(); g.stroke();
    } else if (kind === 'bow') {
      g.strokeStyle = '#6b4a22'; g.lineWidth = 4; g.beginPath(); g.arc(2, 0, 17, -1.15, 1.15); g.stroke();
      g.strokeStyle = '#efe6d0'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(2 + 17 * Math.cos(1.15), -17 * Math.sin(1.15)); g.lineTo(2 - (o.draw || 0) * 8 + 6, 0); g.lineTo(2 + 17 * Math.cos(1.15), 17 * Math.sin(1.15)); g.stroke();
    }
    g.shadowBlur = 0;
  }
  // o: foe, r, col, weapon, wa (weapon angle from facing), th (thrust -1..1), trail, shield (0..1 raised), glow (css colour),
  //    armor (css colour ring), flash (0..1), alpha, lift (px off the floor), scale, horns (default true for foes), down
  function fig(g, x, y, ang, o = {}) {
    const foe = !!o.foe, r = o.r || (foe ? 19 : 15), col = o.col || (foe ? FOE : YOU), dark = o.dark || (foe ? '#7c2420' : '#152044');
    const kind = o.weapon === undefined ? (foe ? 'club' : 'sword') : o.weapon, lift = o.lift || 0, sc = o.scale || 1;
    g.save(); g.globalAlpha *= o.alpha ?? 1;
    g.fillStyle = `rgba(40,30,20,${.24 * clamp(1 - lift / 90, .35, 1)})`; g.beginPath(); g.ellipse(x + 3 + lift * .25, y + 5 + lift * .5, r * 1.1, r * .9, 0, 0, TAU); g.fill();
    g.translate(x, y - lift); g.scale(sc, sc); g.rotate(ang);
    if (o.glow) { g.fillStyle = o.glow; g.beginPath(); g.arc(0, 0, r + 11, 0, TAU); g.fill(); }
    if (o.down) {      // lying on the floor: a flat body with no stance
      g.fillStyle = col; g.strokeStyle = dark; g.lineWidth = 2.5; g.globalAlpha *= .8; g.beginPath(); g.ellipse(0, 0, r * 1.5, r * .7, 0, 0, TAU); g.fill(); g.stroke();
      g.beginPath(); g.arc(r * 1.5, 0, r * .55, 0, TAU); g.fill(); g.stroke(); g.restore(); return;
    }
    const wa = o.wa ?? REST, reach = r + (LEN[kind] || 0);
    if (o.trail > 0 && kind) { g.fillStyle = `rgba(255,255,255,${.6 * o.trail})`; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, reach + 2, Math.min(wa, WIND), Math.min(wa + 1.5, WIND)); g.closePath(); g.fill(); }
    if (kind) { g.save(); g.translate(4 + (o.th || 0) * 16, kind === 'bow' ? 0 : r * .92); g.rotate(kind === 'bow' ? 0 : wa); if (kind === 'bow') g.translate(r * .7, 0); weapon(g, kind, o); g.restore(); }
    if (o.shield > 0) { g.save(); g.rotate(lerp(-1.25, -.1, o.shield)); g.strokeStyle = '#152044'; g.lineWidth = 10; g.lineCap = 'round'; g.beginPath(); g.arc(0, 0, r + 8, -.7, .7); g.stroke(); g.strokeStyle = o.shieldCol || '#c9d3e6'; g.lineWidth = 6; g.stroke(); g.restore(); }
    g.fillStyle = col; g.strokeStyle = dark; g.lineWidth = 2.5; g.beginPath(); g.ellipse(0, 0, r * .74, r * 1.2, 0, 0, TAU); g.fill(); g.stroke();
    if (foe && o.horns !== false) { g.fillStyle = '#fff2d8'; g.strokeStyle = dark; g.lineWidth = 1.5; [-1, 1].forEach(sg => { g.beginPath(); g.moveTo(r * .05, sg * r * .45); g.lineTo(r * .7, sg * r * .95); g.lineTo(r * .42, sg * r * .3); g.closePath(); g.fill(); g.stroke(); }); }
    g.fillStyle = foe ? '#a8322a' : '#1b7fb5'; if (o.head) g.fillStyle = o.head; g.strokeStyle = dark; g.lineWidth = 2.5; g.beginPath(); g.arc(r * .1, 0, r * .6, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(r * .58, 0); g.lineTo(r * .16, -r * .3); g.lineTo(r * .16, r * .3); g.closePath(); g.fill();
    if (o.armor) { g.strokeStyle = o.armor; g.lineWidth = 4.5; g.beginPath(); g.arc(0, 0, r + 5, 0, TAU); g.stroke(); }
    if (o.flash > 0) { g.fillStyle = `rgba(255,255,255,${.85 * o.flash})`; g.beginPath(); g.arc(0, 0, r * 1.25, 0, TAU); g.fill(); }
    g.restore();
  }
  const you = (g, p, ang, o) => fig(g, p.x, p.y, ang, o);
  const foe = (g, p, ang, o) => fig(g, p.x, p.y, ang, { foe: true, ...o });

  /* ---------- drawing: effects ---------- */
  // the enemy's attack: a cone that fills while it winds up and flashes on the hit frame. Returns the weapon pose.
  function threat(g, p, ang, a, t0, hit, o = {}) {
    const range = o.range || 100, half = o.half || .8, end = o.cancel ?? hit;
    if (a >= t0 && a < end) {
      const k = ph(a, t0, hit);
      g.fillStyle = 'rgba(229,50,45,.10)'; g.beginPath(); g.moveTo(p.x, p.y); g.arc(p.x, p.y, range, ang - half, ang + half); g.closePath(); g.fill();
      g.fillStyle = 'rgba(229,50,45,.30)'; g.beginPath(); g.moveTo(p.x, p.y); g.arc(p.x, p.y, range * k, ang - half, ang + half); g.closePath(); g.fill();
      g.setLineDash([8, 6]); g.strokeStyle = 'rgba(229,50,45,.85)'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(p.x, p.y); g.arc(p.x, p.y, range, ang - half, ang + half); g.closePath(); g.stroke(); g.setLineDash([]);
    }
    if (o.cancel == null && a >= hit && a < hit + .22) { g.fillStyle = `rgba(229,50,45,${.75 * (1 - ph(a, hit, hit + .22))})`; g.beginPath(); g.moveTo(p.x, p.y); g.arc(p.x, p.y, range, ang - half, ang + half); g.closePath(); g.fill(); }
    if (o.cancel != null && a >= o.cancel) return { wa: lerp(WIND, REST, ph(a, o.cancel, o.cancel + .3)), trail: 0 };
    return swing(a, t0, hit);
  }
  // how far the enemy can hit, as a ring on the floor
  function reach(g, p, a = 1, r = 100, label) {
    g.save(); g.globalAlpha *= a; g.setLineDash([4, 7]); g.strokeStyle = 'rgba(168,50,42,.55)'; g.lineWidth = 2; g.beginPath(); g.arc(p.x, p.y, r, 0, TAU); g.stroke(); g.setLineDash([]);
    if (label) text(g, label, p.x, p.y - r - 9, { size: 11.5, w: 700, col: '#a8322a' }); g.restore();
  }
  function pop(g, s, x, y, col, a, t0, o = {}) {
    const k = a - t0, life = o.life || 1.0; if (k < 0 || k > life) return;
    const sc = 1 + .45 * (1 - ease(ph(k, 0, .15)));
    g.save(); g.translate(x, y - 16 * ease(k / life)); g.scale(sc, sc);
    text(g, s, 0, 0, { size: o.size || 19, w: 800, display: true, col, stroke: 5, a: 1 - ph(k, life - .3, life) }); g.restore();
  }
  function tag(g, s, x, y, col, a, t0, t1, size = 12.5) { const k = win(a, t0, t1); if (k > 0) chip(g, s, x, y, { fill: '#fffaf0', edge: col, col, size, a: k, w: 700, pad: 14 }); }
  function spark(g, x, y, a, t0, col = '#ffd45e', r = 26) {
    const k = ph(a, t0, t0 + .3); if (a < t0 || k >= 1) return;
    g.save(); g.globalAlpha *= 1 - k; g.strokeStyle = col; g.lineWidth = 4; g.lineCap = 'round';
    for (let i = 0; i < 8; i++) { const an = i * TAU / 8 + .3; g.beginPath(); g.moveTo(x + Math.cos(an) * r * (.25 + .5 * k), y + Math.sin(an) * r * (.25 + .5 * k)); g.lineTo(x + Math.cos(an) * r * (.6 + .7 * k), y + Math.sin(an) * r * (.6 + .7 * k)); g.stroke(); }
    g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, r * .3 * (1 - k), 0, TAU); g.fill(); g.restore();
  }
  function ring(g, x, y, r0, r1, a, t0, dur, col = '255,212,94', lw = 5) {
    const k = ph(a, t0, t0 + dur); if (a < t0 || k >= 1) return;
    g.save(); g.strokeStyle = `rgba(${col},${1 - k})`; g.lineWidth = lw; g.beginPath(); g.arc(x, y, lerp(r0, r1, ease(k)), 0, TAU); g.stroke(); g.restore();
  }
  function stars(g, x, y, a, t0, t1) {
    const k = win(a, t0, t1, .15); if (k <= 0) return;
    g.save(); g.globalAlpha *= k; g.fillStyle = '#ffd45e'; g.strokeStyle = '#8a6500'; g.lineWidth = 1.2;
    for (let i = 0; i < 3; i++) { const an = a * 5 + i * TAU / 3, sx = x + Math.cos(an) * 20, sy = y - 26 + Math.sin(an) * 7; g.beginPath(); for (let j = 0; j < 10; j++) { const rr = j % 2 ? 2.4 : 6, aa = j * TAU / 10 - PI / 2; g.lineTo(sx + Math.cos(aa) * rr, sy + Math.sin(aa) * rr); } g.closePath(); g.fill(); g.stroke(); }
    g.restore();
  }
  // a projectile from A to B between t0 and t1; kind 'arrow' | 'bolt' (o.col) | 'flask'
  function shot(g, A, B, a, t0, t1, kind = 'arrow', col = '#ffb347') {
    if (a < t0 || a >= t1) return false;
    const k = ph(a, t0, t1), x = lerp(A.x, B.x, k), y = lerp(A.y, B.y, k) - (kind === 'flask' ? Math.sin(k * PI) * 46 : 0), an = Math.atan2(B.y - A.y, B.x - A.x);
    g.save(); g.translate(x, y); g.rotate(an);
    if (kind === 'arrow') { g.strokeStyle = '#3a2610'; g.lineWidth = 3; g.beginPath(); g.moveTo(-16, 0); g.lineTo(8, 0); g.stroke(); g.fillStyle = '#eef1f7'; g.strokeStyle = '#152044'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(14, 0); g.lineTo(5, -5); g.lineTo(5, 5); g.closePath(); g.fill(); g.stroke(); }
    else if (kind === 'flask') { g.rotate(k * 9); g.fillStyle = '#3d3528'; g.strokeStyle = '#152044'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 7, 0, TAU); g.fill(); g.stroke(); g.fillRect(-2.5, -12, 5, 6); }
    else { g.fillStyle = col; g.globalAlpha = .35; g.beginPath(); g.ellipse(-12, 0, 18, 6, 0, 0, TAU); g.fill(); g.globalAlpha = 1; g.shadowColor = col; g.shadowBlur = 14; g.beginPath(); g.arc(0, 0, 8, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(1, 0, 3.5, 0, TAU); g.fill(); }
    g.restore(); return true;
  }
  function bar(g, x, y, frac, o = {}) {
    const w = o.w || 46, h = 7, x0 = x - w / 2;
    g.save(); g.fillStyle = 'rgba(21,32,68,.85)'; g.beginPath(); g.roundRect(x0 - 2, y - 2, w + 4, h + 4, 4); g.fill();
    g.fillStyle = '#3a2f2a'; g.fillRect(x0, y, w, h);
    if (o.ghost != null) { g.fillStyle = o.ghostCol || '#f0954a'; g.fillRect(x0, y, w * clamp(o.ghost), h); }
    g.fillStyle = o.col || '#4fc46a'; g.fillRect(x0, y, w * clamp(frac), h); g.restore();
    if (o.label) text(g, o.label, x, y - 9, { size: 10.5, w: 700, col: C.muted, stroke: 3 });
  }
  // the player's read of the opponent: the eye and a line (predictive row)
  function read(g, s, a, t0, t1) { const k = win(a, t0, t1, .22); if (k > 0) READ = { s, k }; }
  function drawRead(g, { s, k }) {
    g.save(); g.globalAlpha *= k; g.font = '700 14px Jost, sans-serif'; const w = g.measureText(s).width + 52, x = SW - w - 12, y = SH - 26;
    g.fillStyle = '#fffdf6'; g.strokeStyle = ROWS[2][3]; g.lineWidth = 2.5; g.beginPath(); g.roundRect(x, y - 15, w, 30, 15); g.fill(); g.stroke();
    GI.draw(g, 'eye-target', x + 19, y, 21, ROWS[2][3]); text(g, s, x + 38, y + 1, { align: 'left', size: 14, w: 700, col: C.navy }); g.restore();
  }
  function hitbox(g, x, y, w, h, a = 1, label) {
    g.save(); g.globalAlpha *= a; g.fillStyle = 'rgba(229,50,45,.3)'; g.strokeStyle = C.red; g.lineWidth = 2.5; g.setLineDash([7, 4]); g.beginPath(); g.roundRect(x, y - h / 2, w, h, 6); g.fill(); g.stroke(); g.setLineDash([]);
    if (label) text(g, label, x + w / 2, y - h / 2 - 10, { size: 12.5, w: 800, col: C.redDk, stroke: 4 }); g.restore();
  }
  function plus(g, x, y, a, t0, t1) {
    const k = win(a, t0, t1); if (k <= 0) return;
    g.save(); g.fillStyle = '#2fae63'; for (let i = 0; i < 5; i++) { const t = ((a - t0) * 1.1 + i * .2) % 1; g.globalAlpha = k * (1 - t); const px = x - 22 + i * 11, py = y + 10 - t * 44; g.fillRect(px - 1.5, py - 6, 3, 12); g.fillRect(px - 6, py - 1.5, 12, 3); } g.restore();
  }
  const flame = (g, x, y, r, a, t) => { g.save(); g.globalAlpha *= a; for (let i = 0; i < 9; i++) { const an = i * TAU / 9 + t * .6, d = r * (.25 + .6 * ((i * 37) % 10) / 10), fx = x + Math.cos(an) * d, fy = y + Math.sin(an) * d * .85, s = 7 + 4 * Math.sin(t * 9 + i); g.fillStyle = i % 2 ? '#ff8a2a' : '#ffc94a'; g.beginPath(); g.moveTo(fx - s * .6, fy + s * .5); g.quadraticCurveTo(fx, fy - s * 1.6, fx + s * .6, fy + s * .5); g.closePath(); g.fill(); } g.restore(); };

  /* ---------- the shared frame ---------- */
  function cellArt(g, r, c, x, y, w, h, lit) {
    const x0 = x - w / 2, y0 = y - h / 2, rad = Math.min(10, w / 6);
    g.save(); g.beginPath(); g.roundRect(x0, y0, w, h, rad); g.save(); g.clip();
    g.fillStyle = ROWS[r][1]; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + w, y0); g.lineTo(x0, y0 + h); g.fill();
    g.fillStyle = COLS[c][1]; g.beginPath(); g.moveTo(x0 + w, y0); g.lineTo(x0 + w, y0 + h); g.lineTo(x0, y0 + h); g.fill();
    g.fillStyle = `rgba(255,250,240,${lit ? .18 : .78})`; g.fillRect(x0, y0, w, h); g.restore();
    g.strokeStyle = lit ? C.navy : '#b9b09a'; g.lineWidth = lit ? 3 : 1.5; g.beginPath(); g.roundRect(x0, y0, w, h, rad); g.stroke(); g.restore();
  }
  const colName = c => COLS[c][0] === 'Post' ? 'Post (after)' : COLS[c][0];
  function frame(g, t, cfg) {
    const i = cfg.cell, r = Math.floor(i / 3), c = i % 3, [name, def] = CELLS[i], L = cfg.L;
    const vi = Math.min(cfg.vs.length - 1, Math.floor(t / L)), a = t - vi * L, v = cfg.vs[vi];
    // header
    cellArt(g, r, c, 66, 64, 88, 88, true); GI.draw(g, ROWS[r][2], 66, 64, 46, C.navy);
    text(g, name, 124, 36, { align: 'left', size: 36, w: 800, display: true, col: C.navy });
    g.save(); g.font = '800 36px Montserrat, Jost, sans-serif'; const nw = g.measureText(name).width; g.restore();
    const w1 = chip(g, ROWS[r][0], 124 + nw + 18, 37, { fill: ROWS[r][1], edge: ROWS[r][3], col: '#fff', size: 15, align: 'left', w: 800 });
    text(g, '×', 124 + nw + 18 + w1 + 11, 37, { size: 18, w: 800, col: C.muted });
    chip(g, colName(c), 124 + nw + 18 + w1 + 22, 37, { fill: COLS[c][1], edge: COLS[c][2], col: C.navy, size: 15, align: 'left', w: 800 });
    wrap(g, def, 124, 74, 560, { size: 16, w: 600, lh: 21, col: C.ink });
    // grid
    const RX = 704, RW = 322, key = v.you.find(b => b[3] !== 'plain') || v.you[0], lit = a >= key[0], pulse = lit ? 1 - ph(a, key[0], key[0] + .5) : 0;
    panel(g, RX, 10, RW, 176);
    const gx = cc => RX + 92 + cc * 86, gy = rr => 62 + rr * 44;
    COLS.forEach(([n, , dk], cc) => text(g, n, gx(cc), 28, { size: 12.5, w: 800, col: cc === c ? dk : C.muted }));
    ROWS.forEach(([n, , ic, dk], rr) => { GI.draw(g, ic, RX + 20, gy(rr), 18, rr === r ? dk : '#a9a391'); });
    for (let rr = 0; rr < 3; rr++) for (let cc = 0; cc < 3; cc++) {
      const me = rr === r && cc === c, x = gx(cc), y = gy(rr);
      if (me) { g.fillStyle = `rgba(253,200,60,${.45 + .55 * pulse})`; g.beginPath(); g.roundRect(x - 44 - 5 * pulse, y - 22 - 5 * pulse, 88 + 10 * pulse, 44 + 10 * pulse, 10); g.fill(); }
      cellArt(g, rr, cc, x, y, 80, 37, me);
      text(g, CELLS[rr * 3 + cc][0], x, y, { size: 11.5, w: 800, display: true, col: me ? C.navy : '#8d8672' });
    }
    // the deck's examples: one row each, the playing one lit
    panel(g, RX, 196, RW, 379);
    text(g, 'The deck’s examples, played in order', RX + RW / 2, 213, { size: 12.5, w: 700, col: C.muted, display: true });
    const rh = Math.min(62, 336 / cfg.vs.length);
    cfg.vs.forEach((e, j) => {
      const y = 232 + j * rh + rh / 2 - 3, on = j === vi, done = j < vi, col = e.risk === 'hi' ? HI : LO;
      g.save(); g.fillStyle = on ? '#fff6d6' : 'rgba(255,252,244,.55)'; g.strokeStyle = on ? C.navy : '#d8ccb0'; g.lineWidth = on ? 2.5 : 1.2;
      g.beginPath(); g.roundRect(RX + 10, y - rh / 2 + 3, RW - 20, rh - 6, 8); g.fill(); g.stroke();
      if (on) { g.fillStyle = 'rgba(253,200,60,.5)'; g.beginPath(); g.roundRect(RX + 10, y - rh / 2 + 3, (RW - 20) * clamp(a / L), rh - 6, 8); g.fill(); g.strokeStyle = C.navy; g.beginPath(); g.roundRect(RX + 10, y - rh / 2 + 3, RW - 20, rh - 6, 8); g.stroke(); }
      g.restore();
      text(g, e.name, RX + 22, y, { align: 'left', size: e.name.length > 22 ? 13.5 : 15, w: on ? 800 : 600, col: on ? C.navy : done ? '#8d8672' : C.ink });
      chip(g, e.risk === 'hi' ? 'High risk' : 'Low risk', RX + RW - 18 - 70, y, { fill: on ? col : '#fffaf0', edge: col, col: on ? '#fff' : col, size: 11.5, width: 70, align: 'left', w: 800, a: on || !done ? 1 : .6 });
    });
    // arena
    g.save(); g.beginPath(); g.roundRect(SX, SY, SW, SH, 14); g.clip(); g.translate(SX, SY);
    g.save(); g.translate(SW / 2, SH / 2); g.scale(Z, Z); g.translate(-350, -190);
    T.use(g); T.floor(-40, -40, 800, 480); g.fillStyle = 'rgba(60,48,30,.07)'; g.fillRect(-40, -40, 800, 480);
    READ = null; v.draw(g, a); g.restore();
    if (READ) drawRead(g, READ);
    // the example's name on the arena
    const col = v.risk === 'hi' ? HI : LO, k = vi ? ph(a, 0, .18) : 1;
    g.save(); g.globalAlpha = k; g.font = '800 21px Montserrat, Jost, sans-serif'; const tw = g.measureText(v.name).width;
    g.fillStyle = 'rgba(255,252,244,.94)'; g.strokeStyle = col; g.lineWidth = 2.5; g.beginPath(); g.roundRect(12, 10, tw + 112, 34, 10); g.fill(); g.stroke();
    text(g, v.name, 24, 28, { align: 'left', size: 21, w: 800, display: true, col: C.navy });
    chip(g, v.risk === 'hi' ? 'High risk' : 'Low risk', 24 + tw + 10, 27, { fill: col, edge: col, col: '#fff', size: 11.5, width: 68, align: 'left', w: 800 }); g.restore();
    if (a < .16 && vi > 0) { g.fillStyle = `rgba(255,250,240,${1 - a / .16})`; g.fillRect(0, 0, SW, SH); }
    g.restore();
    g.strokeStyle = 'rgba(160,140,100,.9)'; g.lineWidth = 2; g.beginPath(); g.roundRect(SX, SY, SW, SH, 14); g.stroke();
    // caption
    g.save(); g.font = '700 16.5px Jost, sans-serif'; const cw = g.measureText(v.cap).width; g.restore();
    text(g, v.cap, SX + SW / 2, 499, { size: Math.min(16.5, 16.5 * 664 / cw), w: 700, col: C.navy, a: ph(a, .05, .25) });
    timeline(g, a, cfg, v, r, c);
  }
  function timeline(g, a, cfg, v, r, c) {
    const TX = 84, TW = 600, Y0 = 513, Y1 = 577, L = cfg.L, sx = t => TX + TW * t / L;
    const edges = [0, cfg.bands[0], cfg.bands[1], L];
    for (let k = 0; k < 3; k++) {
      const x0 = sx(edges[k]), x1 = sx(edges[k + 1]), me = k === c;
      g.fillStyle = COLS[k][1]; g.globalAlpha = me ? .5 : .13; g.beginPath(); g.roundRect(x0 + 1, Y0, x1 - x0 - 2, Y1 - Y0, 7); g.fill(); g.globalAlpha = 1;
      if (me) { g.strokeStyle = COLS[k][2]; g.lineWidth = 2.5; g.beginPath(); g.roundRect(x0 + 1, Y0, x1 - x0 - 2, Y1 - Y0, 7); g.stroke(); }
      if (x1 - x0 > 46) text(g, colName(k).toUpperCase(), (x0 + x1) / 2, Y0 + 9, { size: me ? 11.5 : 10.5, w: 800, display: true, col: me ? COLS[k][2] : '#9a9483' });
    }
    chip(g, 'Enemy', 46, 540, { fill: FOE, edge: '#7c2420', col: '#fff', size: 12, width: 58, w: 700 });
    chip(g, 'You', 46, 563, { fill: YOU, edge: '#152044', col: '#fff', size: 12, width: 58, w: 700 });
    const bars = (list, y, who) => list.forEach(([t0, t1, label, kind]) => {
      const x0 = sx(t0), x1 = sx(Math.min(t1, L)), on = a >= t0, plain = kind === 'plain', ghost = kind === 'ghost', w = Math.max(7, x1 - x0);
      g.save(); g.globalAlpha = on || ghost ? 1 : .32;
      const youKey = who === 'you' && !plain;
      g.fillStyle = ghost ? 'rgba(255,250,240,.65)' : who === 'foe' ? (kind === 'hit' ? '#d0574f' : kind === 'stuck' ? '#f4d2ce' : '#e9a8a2') : youKey ? ROWS[r][1] : '#c9d6e8';
      g.strokeStyle = who === 'foe' ? '#7c2420' : youKey ? ROWS[r][3] : '#5d6f8c'; g.lineWidth = youKey ? 2.6 : 1.6; if (ghost) g.setLineDash([5, 4]);
      g.beginPath(); g.roundRect(x0, y - 7.5, w, 15, 5); g.fill(); g.stroke(); g.setLineDash([]);
      if (label) {
        g.font = `${youKey ? 800 : 700} 11.5px Jost, sans-serif`; const lw = g.measureText(label).width, inside = lw + 10 <= w;
        const col = who === 'foe' ? (inside && kind === 'hit' ? '#fff' : '#7c2420') : youKey ? (inside ? '#fff' : ROWS[r][3]) : '#3f4f6c';
        text(g, label, inside ? x0 + w / 2 : x0 + w + 5, y + .5, { align: inside ? 'center' : 'left', size: 11.5, w: youKey ? 800 : 700, col, stroke: inside ? 0 : 3 });
      }
      g.restore();
    });
    bars(v.foe || [], 540, 'foe'); bars(v.you, 563, 'you');
    const x = sx(Math.min(a, L)); g.strokeStyle = 'rgba(21,32,68,.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, Y0 + 18); g.lineTo(x, Y1 - 1); g.stroke();
    g.fillStyle = C.navy; g.beginPath(); g.moveTo(x - 5, Y0 + 17); g.lineTo(x + 5, Y0 + 17); g.lineTo(x, Y0 + 24); g.closePath(); g.fill();
  }
  function make(name, cfg) {
    scene(name, { dur: cfg.vs.length * cfg.L, draw(g, t) { frame(g, t, cfg); }, side(t) { const v = cfg.vs[Math.min(cfg.vs.length - 1, Math.floor(t / cfg.L))]; return { out: `<b>${v.name}</b> (${v.risk === 'hi' ? 'high' : 'low'} risk): ${v.cap}` }; } });
  }
  const V = (name, risk, cap, foeBars, youBars, draw) => ({ name, risk, cap, foe: foeBars, you: youBars, draw });
  const P0 = { x: 215, y: 190 }, E0 = { x: 455, y: 190 }, at = (x, y) => ({ x, y });
  const hitK = (a, t0) => a > t0 ? 1 - ph(a, t0, t0 + .28) : 0;

  /* ================= 1. Initiate: offensive, before ================= */
  const NOATK = [[1.9, 2.7, 'no attack yet', 'ghost']];
  make('f-initiate', {
    cell: 0, L: 3.8, bands: [1.9, 2.7], vs: [
      V('Charging', 'hi', 'Wind up, then rush in with a stab before the enemy has acted. (Dante’s Stinger.)', NOATK, [[.3, 1.0, 'charge'], [1.0, 1.3, 'rush']], (g, a) => {
        const p = mv(a, [[1.0, 140, 190], [1.25, 392, 190]]), e = mv(a, [[1.25, 455, 190], [1.6, 505, 190]]);
        reach(g, E0, 1 - ph(a, 1.2, 1.5), 100, 'enemy reach');
        if (a > .3 && a < 1.0) ring(g, p.x, p.y, 54, 18, a, .3 + ((a - .3) % .35 > 0 ? Math.floor((a - .3) / .35) * .35 : 0), .35, '46,163,220', 4);
        if (a > 1.0 && a < 1.5) { g.strokeStyle = `rgba(46,163,220,${.6 * (1 - ph(a, 1.25, 1.5))})`; g.lineWidth = 12; g.lineCap = 'round'; g.beginPath(); g.moveTo(140, 190); g.lineTo(p.x - 20, 190); g.stroke(); }
        foe(g, e, PI, { flash: hitK(a, 1.25) }); stars(g, e.x, e.y, a, 1.3, 2.9);
        you(g, p, 0, { ...thrust(a, .3, 1.25), glow: a > .3 && a < 1.25 ? 'rgba(46,163,220,.25)' : null });
        spark(g, 432, 190, a, 1.25, '#ffd45e', 34); pop(g, '−12', 470, 150, HI, a, 1.25); tag(g, 'hit before it acted', 470, 252, ROWS[0][3], a, 1.5, 3.6);
      }),
      V('Gap Closing', 'hi', 'A leap that crosses the room and lands in the enemy’s face.', NOATK, [[.6, 1.1, 'leap in']], (g, a) => {
        const k = ph(a, .6, 1.05), p = at(lerp(120, 398, ease(k)), lerp(270, 200, ease(k))), e = mv(a, [[1.05, 455, 190], [1.4, 500, 186]]);
        reach(g, E0, 1 - ph(a, 1.0, 1.3));
        g.setLineDash([3, 8]); g.strokeStyle = 'rgba(46,163,220,.7)'; g.lineWidth = 3; g.beginPath(); g.moveTo(120, 270); g.quadraticCurveTo(250, 150, 398, 200); g.stroke(); g.setLineDash([]);
        foe(g, e, PI, { flash: hitK(a, 1.05) }); stars(g, e.x, e.y, a, 1.1, 2.6);
        you(g, p, -.2, { lift: Math.sin(k * PI) * 46, scale: 1 + .25 * Math.sin(k * PI), ...swing(a, .7, 1.07) });
        ring(g, 410, 200, 10, 70, a, 1.05, .4); spark(g, 436, 194, a, 1.05); pop(g, '−8', 474, 150, HI, a, 1.05); tag(g, 'distance gone in one move', 300, 300, ROWS[0][3], a, 1.3, 3.6);
      }),
      V('Approaching', 'hi', 'Walk into their reach and swing first. The risk: you are now inside it.', NOATK, [[.3, 1.4, 'walk in'], [1.4, 1.75, 'strike']], (g, a) => {
        const p = mv(a, [[.3, 150, 190], [1.4, 390, 190]]), e = mv(a, [[1.6, 455, 190], [1.9, 492, 190]]), inside = p.x > 355;
        reach(g, E0, 1, 100, 'enemy reach'); if (inside && a < 1.7) { g.fillStyle = 'rgba(229,50,45,.12)'; g.beginPath(); g.arc(455, 190, 100, 0, TAU); g.fill(); }
        foe(g, e, PI, { flash: hitK(a, 1.6) });
        you(g, p, 0, { ...swing(a, 1.3, 1.6) });
        tag(g, 'inside enemy reach', 372, 136, HI, a, 1.05, 1.7); spark(g, 432, 190, a, 1.6); pop(g, '−6', 470, 150, HI, a, 1.6); tag(g, 'swung first', 430, 252, ROWS[0][3], a, 1.8, 3.6);
      }),
      V('Projectile Harassment', 'lo', 'Suppressing fire from outside their reach keeps them pinned.', NOATK, [[.5, 2.6, 'arrows']], (g, a) => {
        const p = at(120, 190), shots = [.5, 1.0, 1.5, 2.0], last = shots.filter(s => a >= s + .28).pop();
        const e = at(455 + (last != null ? 10 * (1 - ph(a, last + .28, last + .5)) : 0), 190);
        reach(g, E0, 1, 100, 'enemy reach');
        foe(g, e, PI, { flash: last != null ? hitK(a, last + .28) : 0, shield: 0 });
        shots.forEach((s, i) => { shot(g, at(150, 190), at(432, 190), a, s, s + .28); spark(g, 432, 190, a, s + .28, '#ffd45e', 16); pop(g, '−2', 470, 150 - (i % 2) * 14, LO, a, s + .28, { size: 16, life: .7 }); });
        you(g, p, 0, { weapon: 'bow', draw: 1 - ((a - .5 + 5) % .5) / .5 });
        tag(g, 'safe: outside reach', 172, 136, LO, a, .4, 3.6); tag(g, 'pinned', 470, 252, ROWS[0][3], a, 1.2, 3.6);
      }),
    ],
  });

  /* ================= 2. Zone: offensive, during ================= */
  const CLOSE = [[.5, 3.2, 'tries to close in']];
  make('f-zone', {
    cell: 1, L: 3.8, bands: [.5, 3.2], vs: [
      V('Far-reaching Pokes', 'hi', 'A long hitbox held where the enemy wants to walk pushes it back out.', CLOSE, [[1.15, 1.5, 'poke'], [2.45, 2.8, 'poke']], (g, a) => {
        const p = at(180, 190), e = mv(a, [[.5, 520, 190], [1.3, 322, 190], [1.6, 420, 190], [1.9, 420, 190], [2.6, 322, 190], [2.9, 430, 190]]);
        const th = a < 2 ? thrust(a, 1.0, 1.3) : thrust(a, 2.3, 2.6), out = (a > 1.25 && a < 1.5) || (a > 2.55 && a < 2.8);
        g.fillStyle = 'rgba(229,115,107,.16)'; g.fillRect(200, 150, 100, 80); g.setLineDash([5, 5]); g.strokeStyle = ROWS[0][3]; g.lineWidth = 2; g.beginPath(); g.moveTo(300, 120); g.lineTo(300, 260); g.stroke(); g.setLineDash([]);
        text(g, 'space you control', 246, 250, { size: 12, w: 700, col: ROWS[0][3] });
        foe(g, e, PI, { flash: Math.max(hitK(a, 1.3), hitK(a, 2.6)) }); you(g, p, 0, { weapon: 'spear', ...th });
        if (out) hitbox(g, 206, 204, 96, 26, 1, 'hitbox');
        spark(g, 300, 196, a, 1.3); spark(g, 300, 196, a, 2.6); pop(g, 'pushed out', 400, 140, ROWS[0][3], a, 1.35); pop(g, 'pushed out', 400, 140, ROWS[0][3], a, 2.65);
      }),
      V('Crowd Control', 'hi', 'One slam knocks the whole pack away and stuns it, so they cannot all reach you.', CLOSE, [[1.3, 1.75, 'ground slam']], (g, a) => {
        const p = at(300, 190), k = ph(a, 1.6, 1.95);
        [[520, 120, .2], [540, 250, -.25], [300, 30, PI / 2 + .2]].forEach(([x0, y0], i) => {
          const tx = p.x + (x0 - p.x) * .22, ty = p.y + (y0 - p.y) * .3, ox = p.x + (x0 - p.x) * .6, oy = p.y + (y0 - p.y) * .72;
          const e = a < 1.6 ? mv(a, [[.5, x0, y0], [1.6, tx, ty]]) : at(lerp(tx, ox, ease(k)), lerp(ty, oy, ease(k)));
          foe(g, e, Math.atan2(p.y - e.y, p.x - e.x), { r: 14, weapon: null, flash: hitK(a, 1.6) }); stars(g, e.x, e.y, a, 1.7, 3.5);
        });
        const s = swing(a, 1.1, 1.6); you(g, p, 0, { weapon: 'hammer', ...s });
        ring(g, p.x, p.y, 20, 120, a, 1.6, .45, '229,115,107', 8); if (a > 1.6 && a < 2.4) { g.fillStyle = `rgba(229,115,107,${.25 * (1 - ph(a, 1.6, 2.4))})`; g.beginPath(); g.arc(p.x, p.y, 120, 0, TAU); g.fill(); }
        pop(g, 'knocked back + stunned', 300, 312, ROWS[0][3], a, 1.65, { life: 1.6, size: 17 });
      }),
      V('Resource-Limited Missiles', 'lo', 'Each shot stops the advance from a safe distance, until the ammo runs out.', CLOSE, [[.9, 1.15, ''], [1.6, 1.85, ''], [2.3, 2.55, 'last shot']], (g, a) => {
        const p = at(130, 190), fired = [.9, 1.6, 2.3], n = fired.filter(s => a >= s).length;
        const e = mv(a, [[.5, 540, 190], [1.2, 440, 190], [1.4, 490, 190], [1.9, 400, 190], [2.1, 450, 190], [2.6, 370, 190], [2.8, 420, 190], [3.6, 330, 190]]);
        foe(g, e, PI, { flash: Math.max(...fired.map(s => hitK(a, s + .3))) });
        fired.forEach(s => { shot(g, at(170, 190), at(mv(s + .3, [[.5, 540, 190], [1.2, 440, 190], [1.4, 490, 190], [1.9, 400, 190], [2.1, 450, 190], [2.6, 370, 190]]).x - 20, 190), a, s, s + .3, 'bolt', '#7fd0ff'); pop(g, 'stopped', e.x, 140, ROWS[0][3], a, s + .3, { size: 15, life: .6 }); });
        you(g, p, 0, { weapon: 'staff', wa: .1 });
        for (let i = 0; i < 3; i++) { g.fillStyle = i < 3 - n ? '#7fd0ff' : 'rgba(21,32,68,.2)'; g.strokeStyle = C.navy; g.lineWidth = 1.5; g.beginPath(); g.arc(112 + i * 18, 150, 6, 0, TAU); g.fill(); g.stroke(); }
        text(g, 'ammo', 130, 132, { size: 11.5, w: 700, col: C.muted }); tag(g, 'out of ammo', 150, 240, HI, a, 2.7, 3.7);
      }),
      V('Placed AoE Zones', 'lo', 'A zone left on the path. The enemy has to stop and go around it.', CLOSE, [[.7, 1.0, 'place zone']], (g, a) => {
        const p = at(150, 190), z = at(330, 190), k = ph(a, .95, 1.15);
        if (a > .95) { T.zone(z.x, z.y, 62 * k, 1, '240,120,30'); flame(g, z.x, z.y, 52, k, a); }
        const e = mv(a, [[.5, 560, 190], [1.5, 410, 190], [1.9, 410, 190], [2.6, 380, 92], [3.6, 270, 70]]);
        if (a > 1.9) { g.setLineDash([4, 7]); g.strokeStyle = 'rgba(124,36,32,.7)'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(410, 190); g.quadraticCurveTo(400, 100, 270, 70); g.stroke(); g.setLineDash([]); }
        foe(g, e, a < 1.9 ? PI : PI + .9 - .5 * ph(a, 2.6, 3.6));
        shot(g, at(180, 190), z, a, .75, .95, 'bolt', '#ff9a3a'); you(g, p, 0, { weapon: 'staff', wa: a > .6 && a < 1.1 ? 0 : REST });
        tag(g, 'stops at the edge', 440, 240, ROWS[0][3], a, 1.5, 2.2); tag(g, 'forced to go around', 420, 76, ROWS[0][3], a, 2.3, 3.7);
      }),
    ],
  });

  /* ================= 3. Punish: offensive, post ================= */
  const WHIFF = [[.3, 1.1, 'big swing'], [1.1, 1.25, '', 'hit'], [1.25, 2.8, 'recovery: cannot act', 'stuck']];
  // the shared mistake: a heavy swing that misses, then a long recovery with the club stuck down
  function whiff(g, a, e, o = {}) {
    const s = threat(g, e, PI, a, .3, 1.1, { range: 104 }), stuck = a >= 1.18 && a < 2.8;
    if (stuck) { const k = 1 - ph(a, 1.25, 2.8); g.strokeStyle = 'rgba(124,36,32,.25)'; g.lineWidth = 6; g.beginPath(); g.arc(e.x, e.y, 32, 0, TAU); g.stroke(); g.strokeStyle = '#7c2420'; g.beginPath(); g.arc(e.x, e.y, 32, -PI / 2, -PI / 2 + TAU * k); g.stroke(); }
    foe(g, e, PI, { ...(stuck ? { wa: THRU, trail: 0 } : s), ...o });
    pop(g, 'miss', 366, 150, C.muted, a, 1.12, { life: .7 }); tag(g, 'recovering', e.x + 8, e.y + 52, '#7c2420', a, 1.3, Math.min(2.8, o.until || 2.8));
  }
  make('f-punish', {
    cell: 2, L: 3.8, bands: [.3, 1.25], vs: [
      V('Slow Launchers', 'hi', 'A slow launcher only lands on an enemy that cannot move. It opens a combo.', WHIFF, [[1.3, 2.35, 'slow launcher']], (g, a) => {
        const p = mv(a, [[1.2, 330, 190], [1.5, 392, 190]]), k = ph(a, 2.3, 3.3), e = at(455 + 40 * ease(ph(a, 2.3, 2.7)), 190);
        whiff(g, a, e, { lift: Math.sin(k * PI) * 60, scale: 1 + .3 * Math.sin(k * PI), flash: hitK(a, 2.3), until: 2.3 });
        you(g, p, 0, { ...swing(a, 1.5, 2.3) }); spark(g, 432, 190, a, 2.3, '#ffd45e', 36); pop(g, '−20', 480, 140, HI, a, 2.3); tag(g, 'launched: combo starts', 470, 262, ROWS[0][3], a, 2.4, 3.7);
      }),
      V('Super Moves', 'hi', 'A super spends the whole meter. Spend it when the hit is guaranteed.', WHIFF, [[1.5, 2.4, 'super: spends meter']], (g, a) => {
        const p = mv(a, [[1.2, 330, 190], [1.5, 392, 190]]), e = at(455 + 30 * ease(ph(a, 1.7, 2.4)), 190), hits = [1.7, 1.9, 2.1, 2.3];
        whiff(g, a, e, { flash: Math.max(...hits.map(h => hitK(a, h))), until: 1.7 });
        const s = a < 1.6 ? swing(a, 1.4, 1.7) : { wa: REST + Math.sin((a - 1.6) * 16) * 1.6, trail: a < 2.4 ? .8 : 0 };
        you(g, p, 0, { ...(a < 2.5 ? s : {}), glow: a > 1.5 && a < 2.5 ? 'rgba(255,212,94,.45)' : null, wglow: a > 1.5 && a < 2.5 ? '#ffd45e' : null });
        hits.forEach((h, i) => { spark(g, 436 + i * 6, 190 + (i % 2 ? -10 : 10), a, h, '#ffd45e', 30); }); ring(g, 440, 190, 20, 90, a, 2.3, .45);
        bar(g, p.x, p.y - 44, 1 - ph(a, 1.6, 2.3), { col: '#ffd45e', label: 'meter', w: 52 }); pop(g, '−30', 486, 140, HI, a, 2.3, { size: 24, life: 1.2 });
      }),
      V('Charged Moves', 'hi', 'Holding the charge eats the opening. Release it just before they recover.', WHIFF, [[1.4, 2.5, 'charge … release']], (g, a) => {
        const p = mv(a, [[1.2, 330, 190], [1.4, 392, 190]]), e = at(455 + 36 * ease(ph(a, 2.45, 2.8)), 190), c = ph(a, 1.4, 2.35);
        whiff(g, a, e, { flash: hitK(a, 2.45), until: 2.45 });
        if (a > 1.4 && a < 2.45) { g.strokeStyle = 'rgba(21,32,68,.2)'; g.lineWidth = 6; g.beginPath(); g.arc(p.x, p.y, 28, 0, TAU); g.stroke(); g.strokeStyle = '#ffb951'; g.beginPath(); g.arc(p.x, p.y, 28, -PI / 2, -PI / 2 + TAU * c); g.stroke(); }
        you(g, p, 0, { ...(a < 2.3 ? { wa: lerp(REST, WIND, ease(ph(a, 1.4, 1.8))) } : swing(a, 2.2, 2.45)), wglow: a > 1.6 && a < 2.6 ? '#ffb951' : null });
        spark(g, 432, 190, a, 2.45, '#ffd45e', 38); pop(g, '−22', 484, 140, HI, a, 2.45); tag(g, 'barely in time', 400, 262, HI, a, 2.5, 3.7);
      }),
      V('Quick Jabs', 'lo', 'Two fast jabs and out again, long before the recovery ends. Small damage, little risk.', WHIFF, [[1.5, 1.95, 'jab, jab'], [2.0, 2.4, 'back out', 'plain']], (g, a) => {
        const p = mv(a, [[1.2, 330, 190], [1.4, 392, 190], [2.0, 392, 190], [2.4, 310, 190]]);
        whiff(g, a, E0, { flash: Math.max(hitK(a, 1.6), hitK(a, 1.9)) });
        you(g, p, 0, { ...(a < 1.75 ? thrust(a, 1.5, 1.6) : thrust(a, 1.8, 1.9)) });
        spark(g, 432, 190, a, 1.6, '#ffd45e', 18); spark(g, 432, 190, a, 1.9, '#ffd45e', 18); pop(g, '−4', 474, 146, LO, a, 1.6, { life: .6 }); pop(g, '−4', 486, 136, LO, a, 1.9, { life: .7 });
        tag(g, 'out with time to spare', 300, 262, LO, a, 2.3, 3.7);
      }),
      V('Far-reaching Pokes', 'lo', 'A long poke punishes from where you already stand. No step in needed.', WHIFF, [[1.4, 1.75, 'poke']], (g, a) => {
        const p = at(338, 190);
        whiff(g, a, E0, { flash: hitK(a, 1.6) }); reach(g, E0, .8);
        you(g, p, 0, { weapon: 'spear', ...thrust(a, 1.35, 1.6) }); if (a > 1.55 && a < 1.8) hitbox(g, 362, 204, 76, 22);
        spark(g, 436, 196, a, 1.6, '#ffd45e', 20); pop(g, '−6', 480, 146, LO, a, 1.6); tag(g, 'never entered their reach', 300, 262, LO, a, 1.9, 3.7);
      }),
    ],
  });

  /* ================= 4. Mitigate: defensive, before ================= */
  const ATK_B = [[1.9, 2.5, 'wind-up'], [2.5, 2.7, '', 'hit']];
  make('f-mitigate', {
    cell: 3, L: 3.8, bands: [1.9, 2.7], vs: [
      V('Retreat', 'hi', 'Back out of range before the swing begins. You give up your position.', ATK_B, [[.6, 1.5, 'retreat']], (g, a) => {
        const p = mv(a, [[.6, 388, 190], [1.5, 270, 190]]);
        reach(g, E0, 1, 100, 'enemy reach'); const s = threat(g, E0, PI, a, 1.9, 2.5); foe(g, E0, PI, s); you(g, p, 0, { shield: 0 });
        if (a > .6 && a < 1.7) arrow(g, [370, 228], [290, 228], YOU, 3, { a: win(a, .6, 1.7) });
        pop(g, 'out of range', 300, 140, ROWS[1][3], a, 2.5, { life: 1.1 }); tag(g, 'ground given up', 330, 262, HI, a, 2.7, 3.7);
      }),
      V('Block', 'hi', 'Guard up early and held. The hit lands on the shield: chip damage and stamina.', ATK_B, [[.8, 3.0, 'block held']], (g, a) => {
        const p = at(388 - 8 * hitK(a, 2.5), 190), up = win(a, .8, 3.1, .25);
        const s = threat(g, E0, PI, a, 1.9, 2.5); foe(g, E0, PI, s); you(g, p, 0, { shield: up, wa: 1.2 });
        bar(g, p.x, p.y - 58, kv(a, [[2.5, 1], [2.6, .92]]), { label: 'health' }); bar(g, p.x, p.y - 40, kv(a, [[2.5, 1], [2.65, .5]]), { col: '#ffd45e' });
        spark(g, 412, 190, a, 2.5, '#9cc3ff', 26); pop(g, '−1', 340, 150, ROWS[1][3], a, 2.5); tag(g, 'stamina spent', 388, 250, HI, a, 2.6, 3.7);
      }),
      V('Super-Armor', 'hi', 'Armor on before the hit. You still take the damage, but your own swing is not stopped.', ATK_B, [[.8, 3.0, 'super-armor']], (g, a) => {
        const p = at(388, 190), on = a > .8 && a < 3.1, e = at(455 + 34 * ease(ph(a, 2.85, 3.2)), 190);
        const s = threat(g, E0, PI, a, 1.9, 2.5); foe(g, e, PI, { ...s, flash: hitK(a, 2.85) });
        you(g, p, 0, { weapon: 'hammer', ...swing(a, 1.8, 2.85), armor: on ? '#ffb951' : null, glow: on ? 'rgba(255,185,81,.22)' : null, flash: .6 * hitK(a, 2.5) });
        bar(g, p.x, p.y - 50, kv(a, [[2.5, 1], [2.6, .6]]), { label: 'health' });
        ring(g, p.x, p.y, 16, 40, a, .8, .4, '255,185,81'); pop(g, '−6', 340, 150, HI, a, 2.5); pop(g, 'not staggered', 388, 250, ROWS[1][3], a, 2.5, { size: 15, life: 1.0 }); spark(g, 432, 190, a, 2.85, '#ffd45e', 34); pop(g, '−14', 486, 146, ROWS[0][3], a, 2.85);
      }),
      V('Distancing', 'lo', 'Spacing kept just outside their reach the whole time. The swing never had a target.', ATK_B, [[0, 3.8, 'keeps distance']], (g, a) => {
        const an = PI + .55 * Math.sin(a * 1.3), p = at(455 + Math.cos(an) * 128, 190 + Math.sin(an) * 128), fa = Math.atan2(p.y - 190, p.x - 455);
        reach(g, E0, 1, 100, 'enemy reach'); g.setLineDash([2, 8]); g.strokeStyle = 'rgba(46,163,220,.6)'; g.lineWidth = 3; g.beginPath(); g.arc(455, 190, 128, PI - .7, PI + .7); g.stroke(); g.setLineDash([]);
        const s = threat(g, E0, a < 2.5 ? fa : Math.atan2(at(0, 0).y + (190 + Math.sin(PI + .55 * Math.sin(2.5 * 1.3)) * 128) - 190, Math.cos(PI + .55 * Math.sin(2.5 * 1.3)) * 128), a, 1.9, 2.5);
        foe(g, E0, a < 2.5 ? fa : Math.atan2(Math.sin(PI + .55 * Math.sin(2.5 * 1.3)), Math.cos(PI + .55 * Math.sin(2.5 * 1.3))), s); you(g, p, fa + PI);
        pop(g, 'falls short', 350, 110, ROWS[1][3], a, 2.5, { life: 1.1 }); tag(g, 'no ground given up', 250, 300, LO, a, 2.7, 3.7);
      }),
      V('Obstacle', 'lo', 'Put the level between you and the shot before it is fired.', [[1.9, 2.5, 'aims'], [2.5, 2.75, '', 'hit']], [[.6, 1.4, 'behind cover']], (g, a) => {
        const e = at(540, 190), p = mv(a, [[.6, 250, 270], [1.4, 292, 190]]);
        if (a > 1.9 && a < 2.5) T.laser(e.x - 24, e.y, 366, 190, .9);
        T.pillar(312, 160, 54, 60); foe(g, e, PI, { weapon: 'bow', draw: ph(a, 1.9, 2.5) * (a < 2.5 ? 1 : 0) }); you(g, p, 0);
        shot(g, at(516, 190), at(372, 190), a, 2.5, 2.75); spark(g, 370, 190, a, 2.75, '#c9d3e6', 22); pop(g, 'blocked by cover', 340, 124, ROWS[1][3], a, 2.75, { size: 17 });
      }),
    ],
  });

  /* ================= 5. Reflex: defensive, during ================= */
  const ATK_D = [[.6, 1.9, 'wind-up'], [1.9, 2.1, '', 'hit']];
  make('f-reflex', {
    cell: 4, L: 3.8, bands: [.6, 2.1], vs: [
      V('Perfect Block or Dodge', 'hi', 'Roll on the hit frames and the swing passes through you. A few frames early or late, it lands.', ATK_D, [[1.8, 2.12, 'dodge']], (g, a) => {
        const k = ph(a, 1.8, 2.15), p = at(lerp(388, 530, ease(k)), 190), inv = a > 1.8 && a < 2.1;
        const s = threat(g, E0, PI, a, .6, 1.9); foe(g, E0, PI, s);
        if (inv) [.25, .5, .75].forEach(q => fig(g, lerp(388, p.x, q), 190, 0, { alpha: .22, weapon: null }));
        if (inv) { g.setLineDash([4, 5]); g.strokeStyle = '#3f7fe0'; g.lineWidth = 2.5; g.beginPath(); g.arc(p.x, p.y, 26, 0, TAU); g.stroke(); g.setLineDash([]); }
        fig(g, p.x, p.y, k * TAU, { alpha: inv ? .6 : 1 }); tag(g, 'invincible frames', 440, 126, ROWS[1][3], a, 1.8, 2.5); pop(g, 'no damage', 430, 262, ROWS[1][3], a, 1.95, { life: 1.3 });
      }),
      V('Parry', 'hi', 'Catch the blow on the frame it lands. The enemy is thrown open; miss and you eat it.', [[.6, 1.9, 'wind-up'], [1.9, 3.3, 'staggered', 'stuck']], [[1.82, 2.0, 'parry']], (g, a) => {
        const p = at(388, 190), e = at(455 + 22 * ease(ph(a, 1.9, 2.2)), 190);
        const s = a < 1.9 ? threat(g, E0, PI, a, .6, 1.9, { cancel: 1.9 }) : { wa: 2.6, trail: 0 };
        foe(g, e, PI, s); stars(g, e.x, e.y, a, 2.0, 3.3); you(g, p, 0, { shield: win(a, 1.78, 2.2, .06), flash: .7 * hitK(a, 1.9) });
        spark(g, 416, 190, a, 1.9, '#ffd45e', 44); pop(g, 'PARRY', 388, 126, ROWS[1][3], a, 1.9, { size: 24, life: 1.4 }); tag(g, 'wide open', e.x + 10, 262, ROWS[1][3], a, 2.2, 3.4);
      }),
      V('Deflecting', 'hi', 'Swing as the arrow arrives and send it back where it came from.', [[.6, 1.5, 'aims'], [1.5, 1.9, 'arrow in flight', 'hit']], [[1.8, 2.0, 'deflect']], (g, a) => {
        const p = at(280, 190), e = at(540, 190);
        if (a > .6 && a < 1.5) T.laser(516, 190, 304, 190, .9);
        foe(g, e, PI, { weapon: 'bow', draw: a < 1.5 ? ph(a, .6, 1.5) : 0, flash: hitK(a, 2.3) }); you(g, p, 0, { ...swing(a, 1.55, 1.9) });
        shot(g, at(516, 190), at(312, 190), a, 1.5, 1.9); shot(g, at(312, 190), at(516, 190), a, 1.9, 2.3);
        spark(g, 312, 190, a, 1.9, '#ffd45e', 34); pop(g, 'DEFLECT', 290, 126, ROWS[1][3], a, 1.9, { size: 22, life: 1.2 }); spark(g, 516, 190, a, 2.3); pop(g, '−5', 548, 146, ROWS[0][3], a, 2.3);
      }),
      V('Interrupt', 'lo', 'A fast jab during the long wind-up cancels the attack. Any moment before the hit works.', [[.6, 1.2, 'wind-up'], [1.2, 2.0, 'interrupted', 'stuck']], [[1.08, 1.32, 'jab']], (g, a) => {
        const p = at(388, 190), e = at(455 + 14 * hitK(a, 1.2), 190);
        const s = threat(g, E0, PI, a, .6, 1.9, { cancel: 1.2 }); foe(g, e, PI, { ...s, flash: hitK(a, 1.2) }); you(g, p, 0, { ...thrust(a, 1.05, 1.2) });
        spark(g, 430, 190, a, 1.2, '#ffd45e', 24); pop(g, 'interrupted', 455, 126, ROWS[1][3], a, 1.2, { life: 1.4 }); tag(g, 'attack never comes out', 440, 262, LO, a, 1.6, 3.6);
      }),
      V('Pushback', 'lo', 'A shove mid-wind-up moves the enemy away. The swing comes out and reaches nothing.', ATK_D, [[1.15, 1.45, 'shove']], (g, a) => {
        const p = at(388, 190), e = mv(a, [[1.3, 455, 190], [1.65, 545, 190]]);
        const s = threat(g, e, PI, a, .6, 1.9, { range: 100 }); foe(g, e, PI, { ...s, flash: .6 * hitK(a, 1.3) });
        you(g, p, 0, { shield: win(a, 1.15, 1.6, .1), th: a > 1.2 && a < 1.5 ? Math.sin(ph(a, 1.2, 1.5) * PI) * .8 : 0 });
        ring(g, 420, 190, 10, 46, a, 1.3, .3, '111,147,224'); pop(g, 'falls short', 420, 126, ROWS[1][3], a, 1.9, { life: 1.2 });
      }),
      V('Disengage', 'lo', 'A hop back out of the exchange as the swing comes. Safe, and nothing gained.', ATK_D, [[1.5, 1.85, 'hop back']], (g, a) => {
        const k = ph(a, 1.5, 1.85), p = at(lerp(388, 280, ease(k)), 190);
        reach(g, E0, .8); const s = threat(g, E0, PI, a, .6, 1.9); foe(g, E0, PI, s); you(g, p, 0, { lift: Math.sin(k * PI) * 16 });
        if (a > 1.5 && a < 2.1) arrow(g, [372, 228], [296, 228], YOU, 3, { a: win(a, 1.5, 2.1) });
        pop(g, 'out of range', 300, 126, ROWS[1][3], a, 1.9, { life: 1.2 }); tag(g, 'back to neutral', 300, 262, LO, a, 2.2, 3.6);
      }),
    ],
  });

  /* ================= 6. React: defensive, post ================= */
  const ATK_P = [[.3, 1.1, 'wind-up'], [1.1, 1.3, '', 'hit']];
  make('f-react', {
    cell: 5, L: 4.2, bands: [.3, 1.3], vs: [
      V('Tech Roll (Ukemi)', 'hi', 'Knocked off your feet, you press as you land and roll up ready. Miss it and you stay down.', ATK_P, [[1.62, 2.05, 'tech roll']], (g, a) => {
        const s = threat(g, E0, PI, a, .3, 1.1); const e = mv(a, [[2.2, 455, 190], [3.4, 330, 200]]);
        const k = ph(a, 1.1, 1.65), p = a < 1.65 ? at(lerp(388, 232, k), lerp(190, 214, k)) : mv(a, [[1.65, 232, 214], [2.05, 190, 214]]);
        if (a > 1.9) { fig(g, 232, 214, PI, { down: true, alpha: .3 * win(a, 1.9, 4.2), col: '#8d8672', dark: '#55513f' }); tag(g, 'without the tech: still down', 250, 262, C.muted, a, 2.0, 4.1, 12); }
        foe(g, e, PI, s);
        fig(g, p.x, p.y, a < 1.1 ? 0 : a < 1.65 ? PI + k * 5 : a < 2.05 ? ph(a, 1.65, 2.05) * TAU : 0, { lift: a > 1.1 && a < 1.65 ? Math.sin(k * PI) * 34 : 0, flash: hitK(a, 1.1) });
        spark(g, 400, 190, a, 1.1, '#ff9d8a', 30); pop(g, '−6', 388, 140, HI, a, 1.1); ring(g, 232, 214, 8, 40, a, 1.65, .35, '111,147,224'); pop(g, 'TECH', 200, 150, ROWS[1][3], a, 1.68, { size: 23, life: 1.3 }); tag(g, 'up and ready', 190, 164, ROWS[1][3], a, 2.6, 4.1);
      }),
      V('Lifesteal (Rally)', 'hi', 'Lost health stays winnable for a moment. Hit back at once to take it back. (Bloodborne.)', ATK_P, [[1.6, 2.6, 'hit back']], (g, a) => {
        const p = at(388 - 8 * hitK(a, 1.1), 190), hits = [1.8, 2.25, 2.7].slice(0, 2), got = hits.filter(h => a >= h).length;
        const s = threat(g, E0, PI, a, .3, 1.1); foe(g, E0, PI, { ...(a > 1.3 ? {} : s), flash: Math.max(...hits.map(h => hitK(a, h))) });
        you(g, p, 0, { ...(a < 2.0 ? swing(a, 1.55, 1.8) : swing(a, 2.0, 2.25)), flash: hitK(a, 1.1) });
        const hpv = a < 1.1 ? 1 : .45 + got * .2, ghost = a < 1.1 ? null : a < 1.6 ? 1 : Math.max(hpv, 1 - .25 * ph(a, 2.4, 3.6));
        bar(g, 388, 132, hpv, { label: 'health', ghost, w: 70 });
        spark(g, 400, 190, a, 1.1, '#ff9d8a', 30); pop(g, '−6', 340, 150, HI, a, 1.1); tag(g, 'orange: can still be won back', 388, 106, '#9a4a06', a, 1.25, 2.3, 12);
        hits.forEach((h, i) => { spark(g, 432, 190, a, h); pop(g, '+2', 340 - i * 4, 150, GREEN, a, h); });
      }),
      V('Heal', 'lo', 'Take the hit, step away, then restore the health afterwards.', ATK_P, [[1.3, 1.9, 'back off', 'plain'], [2.0, 3.0, 'heal']], (g, a) => {
        const p = mv(a, [[1.1, 388, 190], [1.25, 372, 190], [1.9, 250, 190]]);
        const s = threat(g, E0, PI, a, .3, 1.1); foe(g, E0, PI, s); you(g, p, 0, { flash: hitK(a, 1.1), glow: a > 2.0 && a < 3.1 ? 'rgba(79,196,106,.3)' : null, wa: a > 2 && a < 3 ? 1.6 : REST });
        bar(g, p.x, p.y - 50, a < 2.0 ? kv(a, [[1.1, 1], [1.25, .4]]) : kv(a, [[2.2, .4], [3.0, .9]]), { label: 'health', ghost: a > 2.2 ? .9 : null, ghostCol: '#bfe8c8', w: 60 });
        spark(g, 400, 190, a, 1.1, '#ff9d8a', 30); pop(g, '−6', 340, 150, HI, a, 1.1); plus(g, p.x, p.y, a, 2.0, 3.1); pop(g, '+5', 196, 150, GREEN, a, 2.5, { life: 1.2 }); reach(g, E0, .7);
      }),
    ],
  });

  /* ================= 7. Setup: predictive, before ================= */
  function trap(g, x, y, open, a = 1) {
    g.save(); g.globalAlpha *= a; g.translate(x, y); g.strokeStyle = '#3a3f53'; g.fillStyle = '#8b8fa8'; g.lineWidth = 2;
    g.beginPath(); g.arc(0, 0, 17, 0, TAU); g.fillStyle = 'rgba(60,64,83,.25)'; g.fill(); g.stroke();
    g.fillStyle = '#c9cede'; for (let i = 0; i < 10; i++) { const an = i * TAU / 10, r0 = 17, r1 = open ? 9 : 2; g.beginPath(); g.moveTo(Math.cos(an - .2) * r0, Math.sin(an - .2) * r0); g.lineTo(Math.cos(an) * r1, Math.sin(an) * r1); g.lineTo(Math.cos(an + .2) * r0, Math.sin(an + .2) * r0); g.closePath(); g.fill(); g.stroke(); }
    g.restore();
  }
  make('f-setup', {
    cell: 6, L: 3.8, bands: [1.9, 3.0], vs: [
      V('Empowerment', 'hi', 'Reading that they will hang back, you spend the lull enchanting your weapon.', [[1.9, 2.5, 'comes in']], [[.5, 1.5, 'enchant weapon'], [2.4, 2.75, 'strike', 'plain']], (g, a) => {
        const p = at(240, 190), e = a < 1.9 ? at(500 + 8 * Math.sin(a * 3), 190 + 22 * Math.sin(a * 2.1)) : mv(a, [[1.9, 500, 196], [2.5, 312, 190], [2.65, 312, 190], [3.0, 370, 190]]);
        const lit = ph(a, .5, 1.5); read(g, 'They will hang back.', a, .15, 1.8);
        foe(g, e, PI, { flash: hitK(a, 2.65) }); you(g, p, 0, { ...(a < 1.6 ? { wa: 1.1 - .7 * ph(a, 1.4, 1.6) } : swing(a, 2.3, 2.65)), wglow: lit > .15 ? '#ffe26a' : null, glow: a > .5 && a < 1.5 ? 'rgba(255,226,106,.3)' : null });
        if (a > .5 && a < 1.6) icon(g, 'wow-spell_nature_lightning.jpg', 240, 122, 34, { a: win(a, .5, 1.6) });
        spark(g, 290, 190, a, 2.65, '#ffe26a', 44); ring(g, 300, 190, 10, 60, a, 2.65, .35, '255,226,106'); pop(g, '−14', 340, 140, ROWS[2][3], a, 2.65, { size: 22 }); tag(g, 'empowered hit', 330, 262, ROWS[2][3], a, 2.8, 3.7);
      }),
      V('Attack Feint', 'hi', 'A fake swing draws out their defense early. The real one arrives after it drops.', [[.85, 1.7, 'blocks nothing'], [1.9, 3.0, 'guard spent', 'stuck']], [[.6, 1.05, 'feint'], [2.0, 2.4, 'real hit', 'plain']], (g, a) => {
        const p = at(388, 190), e = at(455 + 30 * ease(ph(a, 2.3, 2.6)), 190);
        read(g, 'They guard the moment I wind up.', a, .15, 1.8);
        foe(g, e, PI, { shield: win(a, .82, 1.75, .12), flash: hitK(a, 2.3), wa: 1.3 });
        you(g, p, 0, a < 1.3 ? { wa: lerp(REST, WIND, Math.sin(ph(a, .6, 1.05) * PI)) } : swing(a, 2.0, 2.3));
        tag(g, 'feint: cancelled', 388, 126, ROWS[2][3], a, .95, 1.8); tag(g, 'guard up for nothing', 480, 250, '#7c2420', a, 1.0, 1.8); spark(g, 432, 190, a, 2.3, '#ffd45e', 32); pop(g, '−10', 486, 140, ROWS[2][3], a, 2.3);
      }),
      V('Baiting', 'hi', 'Show a false opening so they attack where you want. The risk: the opening is real.', [[1.9, 2.5, 'takes the bait', 'hit'], [2.5, 3.4, 'overextended', 'stuck']], [[.5, 1.9, 'bait: fake opening'], [2.7, 3.0, 'strike', 'plain']], (g, a) => {
        const p = mv(a, [[2.15, 340, 190], [2.45, 340, 108]]), e = mv(a, [[1.9, 500, 190], [2.5, 300, 190]]);
        read(g, 'They will lunge at an open back.', a, .15, 1.8);
        if (a > 1.9 && a < 2.6) { g.strokeStyle = `rgba(208,87,79,${.5 * (1 - ph(a, 2.4, 2.6))})`; g.lineWidth = 14; g.lineCap = 'round'; g.beginPath(); g.moveTo(500, 190); g.lineTo(e.x + 24, 190); g.stroke(); }
        foe(g, e, PI, { ...thrust(a, 1.9, 2.4), flash: hitK(a, 2.95) });
        you(g, p, a < .5 ? 0 : a < 2.1 ? lerp(0, PI, ease(ph(a, .5, .8))) : lerp(PI, PI / 2 + .3, ph(a, 2.15, 2.45)), { ...swing(a, 2.6, 2.95), shield: 0 });
        tag(g, 'back turned: looks open', 340, 136, ROWS[2][3], a, .8, 2.0); pop(g, 'miss', 300, 250, C.muted, a, 2.5, { life: .7 }); spark(g, 316, 168, a, 2.95, '#ffd45e', 30); pop(g, '−9', 280, 140, ROWS[2][3], a, 2.95);
      }),
      V('Trap', 'lo', 'Placed long before the fight on the path they will take. It waits for them.', [[1.9, 2.5, 'walks in'], [2.5, 3.8, 'caught', 'stuck']], [[.5, 1.1, 'set trap']], (g, a) => {
        const p = mv(a, [[.3, 250, 190], [.6, 330, 190], [1.1, 330, 190], [1.6, 230, 190]]), e = mv(a, [[1.9, 540, 190], [2.5, 366, 190]]);
        read(g, 'They will come straight at me.', a, .15, 1.8);
        if (a < 2.5) arrow(g, [520, 232], [300, 232], ROWS[2][3], 2.5, { dash: [7, 6], a: .7 * win(a, .3, 2.5) });
        if (a > .85) trap(g, 366, 190, a < 2.5, ph(a, .85, 1.05));
        foe(g, e, PI, { flash: hitK(a, 2.5) }); you(g, p, a > 1.1 && a < 1.6 ? PI : 0, { wa: a > .6 && a < 1.1 ? 0 : REST });
        spark(g, 366, 190, a, 2.5, '#ffd45e', 30); pop(g, 'SNAP', 366, 130, ROWS[2][3], a, 2.5, { size: 23, life: 1.2 }); tag(g, 'held in place', 380, 250, ROWS[2][3], a, 2.7, 3.7);
      }),
      V('AoE Totem-Base', 'lo', 'Plant a totem first. The fight then happens inside your area of power.', [[1.9, 2.6, 'enters your area'], [2.6, 3.8, 'slowed', 'stuck']], [[.5, .95, 'plant totem'], [2.85, 3.2, 'strike', 'plain']], (g, a) => {
        const tp = at(280, 190), p = mv(a, [[.3, 240, 190], [.6, 262, 200], [1.2, 232, 206]]), e = mv(a, [[1.9, 540, 190], [2.6, 352, 190], [3.4, 318, 192]]), k = ph(a, .8, 1.1), inside = e.x < 372;
        read(g, 'They have to come to me.', a, .15, 1.8);
        if (a > .8) { g.fillStyle = `rgba(98,183,124,${.18 * k})`; g.beginPath(); g.arc(tp.x, tp.y, 96 * k, 0, TAU); g.fill(); g.setLineDash([9, 7]); g.strokeStyle = `rgba(31,122,63,${.85 * k})`; g.lineWidth = 3; g.beginPath(); g.arc(tp.x, tp.y, Math.max(0, 96 * k + 2 * Math.sin(a * 5)), 0, TAU); g.stroke(); g.setLineDash([]); icon(g, 'wow-spell_nature_earthbind.jpg', tp.x, tp.y, 30, { a: k, edge: ROWS[2][3] }); }
        foe(g, e, PI, { flash: hitK(a, 3.15), glow: inside ? 'rgba(90,150,255,.35)' : null }); you(g, p, 0, { ...swing(a, 2.85, 3.15), wglow: a > 1.1 ? '#8be0a4' : null });
        tag(g, 'your area', 280, 304, ROWS[2][3], a, 1.1, 3.7); tag(g, 'slowed', e.x, 240, '#2f55a8', a, 2.6, 3.7); spark(g, 300, 196, a, 3.15); pop(g, '−8', 352, 140, ROWS[2][3], a, 3.15, { life: .65 });
      }),
      V('Primer', 'lo', 'Mark them now, cash it in later. The oil does nothing until a spark arrives.', [[1.9, 2.5, 'comes in']], [[.6, 1.1, 'primer: oil'], [2.3, 2.6, 'ignite', 'plain']], (g, a) => {
        const p = at(200, 190), e = mv(a, [[1.9, 480, 190], [2.5, 380, 190]]), oiled = a >= 1.1, lit = a >= 2.6;
        read(g, 'They will walk through fire later.', a, .15, 1.8);
        foe(g, e, PI, { glow: oiled && !lit ? 'rgba(40,34,24,.45)' : lit ? 'rgba(255,138,42,.5)' : null, flash: hitK(a, 2.6) }); if (lit) flame(g, e.x, e.y, 34, 1 - ph(a, 3.3, 3.8), a);
        shot(g, at(224, 190), at(470, 190), a, .6, 1.1, 'flask'); shot(g, at(224, 190), at(380, 190), a, 2.35, 2.6, 'bolt', '#ff9a3a'); you(g, p, 0, { weapon: 'staff', wa: (a > .5 && a < 1.1) || (a > 2.25 && a < 2.7) ? 0 : REST });
        spark(g, 470, 190, a, 1.1, '#5a4a30', 20); tag(g, 'oiled: no damage yet', 480, 250, '#55513f', a, 1.15, 2.4); ring(g, 380, 190, 10, 70, a, 2.6, .4, '255,138,42', 7); pop(g, '−15', 400, 126, ROWS[2][3], a, 2.6, { size: 24, life: 1.1 });
      }),
    ],
  });

  /* ================= 8. Counterplay: predictive, during ================= */
  const BLOCKS = [[.4, 3.0, 'blocks, as always']];
  make('f-counterplay', {
    cell: 7, L: 3.8, bands: [.6, 2.4], vs: [
      V('Power Shield', 'hi', 'You know their rhythm, so the shield goes up on the exact frame. The shot flies back.', [[.6, 1.3, 'aims'], [1.3, 1.7, 'shot', 'hit']], [[1.6, 1.82, 'power shield']], (g, a) => {
        const p = at(280, 190), e = at(540, 190);
        read(g, 'Habit: fires on a steady beat.', a, .15, 3.6);
        if (a > .6 && a < 1.3) T.laser(516, 190, 304, 190, .9);
        foe(g, e, PI, { weapon: 'bow', draw: a < 1.3 ? ph(a, .6, 1.3) : 0, flash: hitK(a, 2.1) }); you(g, p, 0);
        if (a > 1.6 && a < 1.9) { T.bubble(p.x, p.y, 32, a, win(a, 1.6, 1.9, .05)); }
        shot(g, at(516, 190), at(314, 190), a, 1.3, 1.7, 'bolt', '#ff9a3a'); shot(g, at(314, 190), at(516, 190), a, 1.7, 2.1, 'bolt', '#7fd0ff');
        spark(g, 314, 190, a, 1.7, '#7fd0ff', 36); pop(g, 'REFLECTED', 300, 126, ROWS[2][3], a, 1.7, { size: 21, life: 1.2 }); spark(g, 516, 190, a, 2.1); pop(g, '−9', 548, 146, ROWS[2][3], a, 2.1);
      }),
      V('Unblockable', 'hi', 'They always turtle. A slow unblockable is wasted on anyone else, and lands on them.', BLOCKS, [[1.0, 1.9, 'unblockable']], (g, a) => {
        const p = at(388, 190), e = at(455 + 36 * ease(ph(a, 1.85, 2.2)), 190);
        read(g, 'Habit: hides behind the shield.', a, .15, 3.6);
        foe(g, e, PI, { shield: a < 1.85 ? ph(a, .4, .6) : 1 - ph(a, 1.85, 2.0), wa: 1.3, flash: hitK(a, 1.85) }); stars(g, e.x, e.y, a, 1.95, 3.4);
        you(g, p, 0, { ...swing(a, 1.0, 1.85), wglow: a > 1.0 && a < 2.1 ? '#ff3b30' : null, glow: a > 1.0 && a < 1.9 ? 'rgba(255,59,48,.22)' : null });
        tag(g, 'red glow: cannot be blocked', 388, 126, HI, a, 1.05, 1.85); spark(g, 430, 190, a, 1.85, '#ff6a5e', 40); pop(g, '−14', 490, 140, ROWS[2][3], a, 1.85, { size: 22 }); tag(g, 'straight through the guard', 440, 262, ROWS[2][3], a, 2.0, 3.6);
      }),
      V('Conditional Counters', 'hi', 'A counter stance only fires if they attack into it. You bet that they will.', [[.6, 1.5, 'wind-up'], [1.5, 1.7, '', 'hit'], [1.7, 3.2, 'countered', 'stuck']], [[.9, 1.75, 'counter stance']], (g, a) => {
        const p = at(388, 190), e = at(455 + 34 * ease(ph(a, 1.62, 1.95)), 190), st = a > .9 && a < 1.6;
        read(g, 'Habit: always swings first.', a, .15, 3.6);
        const s = threat(g, E0, PI, a, .6, 1.5); foe(g, e, PI, { ...s, flash: hitK(a, 1.62) }); stars(g, e.x, e.y, a, 1.75, 3.2);
        if (st) { g.setLineDash([6, 5]); g.strokeStyle = '#8a4fd6'; g.lineWidth = 3; g.beginPath(); g.arc(p.x, p.y, 30 + 2 * Math.sin(a * 9), 0, TAU); g.stroke(); g.setLineDash([]); }
        you(g, p, 0, { ...(a < 1.5 ? { wa: lerp(REST, 2.0, ph(a, .9, 1.1)) } : swing(a, 1.45, 1.62)), glow: st ? 'rgba(138,79,214,.25)' : null, flash: .8 * hitK(a, 1.5) });
        tag(g, 'waiting for the hit', 388, 126, '#4b2286', a, .95, 1.5); spark(g, 420, 190, a, 1.5, '#c9a8ff', 30); spark(g, 436, 190, a, 1.62, '#ffd45e', 38); pop(g, 'COUNTER −16', 440, 126, ROWS[2][3], a, 1.62, { size: 21, life: 1.3 });
      }),
      V('Block Break', 'lo', 'They always block, so you kick the guard open instead of hitting it. (Elden Ring’s kick.)', BLOCKS, [[1.2, 1.5, 'kick'], [1.8, 2.15, 'strike', 'plain']], (g, a) => {
        const p = at(388, 190), e = at(455 + 16 * ease(ph(a, 1.35, 1.6)) + 24 * ease(ph(a, 2.05, 2.3)), 190), broke = a >= 1.35;
        read(g, 'Habit: hides behind the shield.', a, .15, 3.6);
        foe(g, e, PI, { shield: broke ? 0 : ph(a, .4, .6), wa: 1.3, flash: Math.max(.5 * hitK(a, 1.35), hitK(a, 2.05)) }); stars(g, e.x, e.y, a, 1.4, 3.0);
        if (broke && a < 2.2) { const k = ph(a, 1.35, 2.2); g.save(); g.translate(430 + 60 * k, 172 - 70 * Math.sin(k * PI * .8)); g.rotate(k * 7); g.globalAlpha = 1 - ph(a, 1.9, 2.2); g.strokeStyle = '#152044'; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); g.arc(0, 0, 18, -.7, .7); g.stroke(); g.strokeStyle = '#c9d3e6'; g.lineWidth = 5; g.stroke(); g.restore(); }
        you(g, p, 0, { ...swing(a, 1.75, 2.05), th: a > 1.2 && a < 1.5 ? Math.sin(ph(a, 1.2, 1.5) * PI) : 0 });
        spark(g, 424, 190, a, 1.35, '#c9d3e6', 30); pop(g, 'GUARD BROKEN', 440, 126, ROWS[2][3], a, 1.35, { size: 20, life: 1.2 }); spark(g, 440, 190, a, 2.05); pop(g, '−8', 500, 150, ROWS[2][3], a, 2.05);
      }),
      V('Grab / Throw', 'lo', 'A throw ignores the guard. Against a habitual blocker it is the cheap answer.', BLOCKS.map(b => [b[0], 1.35, b[2]]).concat([[1.35, 3.0, 'thrown', 'stuck']]), [[1.15, 1.95, 'grab and throw']], (g, a) => {
        const p = mv(a, [[1.1, 388, 190], [1.3, 412, 190]]), k = ph(a, 1.4, 1.95);
        const an = PI * k, e = a < 1.4 ? E0 : at(412 + Math.cos(an) * 46 - 110 * ease(k) * (k > .5 ? (k - .5) * 2 : 0), 190 - Math.sin(an) * 44);
        read(g, 'Habit: hides behind the shield.', a, .15, 3.6);
        if (a < 1.95) foe(g, e, PI + k * 5, { shield: a < 1.4 ? ph(a, .4, .6) : 0, wa: 1.3, lift: Math.sin(k * PI) * 26 }); else foe(g, e, PI, { down: true });
        you(g, p, a < 1.4 ? 0 : -an * .9, { weapon: a > 1.2 && a < 2.0 ? null : 'sword' });
        if (a > 1.2 && a < 1.45) ring(g, 432, 190, 6, 26, a, 1.2, .25, '98,183,124');
        ring(g, e.x, e.y, 10, 54, a, 1.95, .4, '98,183,124'); pop(g, 'THROWN', 300, 126, ROWS[2][3], a, 1.95, { size: 22, life: 1.2 }); tag(g, 'the shield never mattered', 300, 262, ROWS[2][3], a, 2.2, 3.6);
      }),
    ],
  });

  /* ================= 9. Response: predictive, post ================= */
  const EXCH = [[.3, 1.3, 'the exchange']];
  function swapCard(g, x, y, from, to, a, t0, t1, label) {
    const k = win(a, t0, t1 + .5, .2), done = a >= (t0 + t1) / 2; if (k <= 0) return;
    g.save(); g.globalAlpha *= k; panel(g, x - 96, y - 28, 192, 70, { fill: 'rgba(255,253,246,.96)', edge: ROWS[2][3] });
    const dr = (n, px, on) => n.startsWith('gi:') ? (g.fillStyle = on ? '#fffaf0' : '#e9e4d6', g.strokeStyle = on ? C.navy : '#a9a391', g.lineWidth = 2.5, g.beginPath(), g.arc(px, y - 2, 17, 0, TAU), g.fill(), g.stroke(), GI.draw(g, n.slice(3), px, y - 2, 23, on ? C.navy : '#a9a391')) : icon(g, n, px, y - 2, 32, { grey: !on });
    dr(from, x - 56, !done); arrow(g, [x - 28, y - 2], [x + 28, y - 2], ROWS[2][3], 4); dr(to, x + 56, done);
    text(g, label, x, y + 30, { size: 12.5, w: 800, col: ROWS[2][3] }); g.restore();
  }
  make('f-response', {
    cell: 8, L: 4.4, bands: [.3, 1.3], vs: [
      V('Equipment Change', 'hi', 'The sword bounced off its armor. You swap to a hammer for the next exchange.', EXCH, [[.5, 1.2, 'hits: no effect', 'plain'], [1.5, 2.4, 'swap weapon'], [3.0, 3.4, 'strike', 'plain']], (g, a) => {
        const p = mv(a, [[1.3, 388, 190], [1.6, 330, 190], [2.7, 330, 190], [3.0, 388, 190]]), ham = a >= 1.95, e = at(455 + 30 * ease(ph(a, 3.3, 3.6)), 190), crack = a >= 3.3;
        read(g, 'Its armor stops blades.', a, 1.25, 2.9);
        foe(g, e, PI, { armor: crack ? null : '#8b93ad', flash: hitK(a, 3.3) });
        you(g, p, 0, { weapon: ham ? 'hammer' : 'sword', ...(a < .85 ? swing(a, .4, .65) : a < 1.4 ? swing(a, .85, 1.1) : swing(a, 3.0, 3.3)), flash: .7 * hitK(a, 1.95) });
        [.65, 1.1].forEach(h => { spark(g, 428, 190, a, h, '#c9d3e6', 20); pop(g, '0', 480, 146, C.muted, a, h, { life: .6 }); });
        swapCard(g, 330, 286, 'gi:broadsword', 'gi:warhammer', a, 1.5, 2.4, 'new state: hammer');
        spark(g, 432, 190, a, 3.3, '#ffd45e', 40); pop(g, '−12', 490, 140, ROWS[2][3], a, 3.3, { size: 22 }); tag(g, 'armor cracked', 470, 262, ROWS[2][3], a, 3.4, 4.3);
      }),
      V('Switch Stance / Spell Swap', 'hi', 'Fire did nothing to it. You swap the loadout to frost before casting again.', EXCH, [[.4, .9, 'fire: immune', 'plain'], [1.5, 2.4, 'swap spell'], [2.9, 3.3, 'frost', 'plain']], (g, a) => {
        const p = at(200, 190), frozen = a >= 3.3;
        read(g, 'It is immune to fire.', a, 1.0, 2.9);
        foe(g, E0, PI, { col: frozen ? '#9fd4f5' : '#e8823a', dark: frozen ? '#2f6a94' : '#7a3a06', head: frozen ? '#6fb6e0' : '#c95f1a', weapon: null, flash: hitK(a, 3.3) }); if (!frozen) flame(g, 455, 190, 26, .7, a);
        shot(g, at(240, 190), at(432, 190), a, .5, .9, 'bolt', '#ff9a3a'); shot(g, at(240, 190), at(432, 190), a, 2.9, 3.3, 'bolt', '#9fd4f5');
        you(g, p, 0, { weapon: 'staff', wa: (a > .4 && a < 1) || (a > 2.8 && a < 3.4) ? 0 : REST, wglow: a < 1.95 ? '#ff9a3a' : '#9fd4f5' });
        pop(g, 'IMMUNE', 455, 126, C.muted, a, .9, { life: .9 }); swapCard(g, 200, 286, 'wow-spell_fire_fireball02.jpg', 'wow-spell_frost_frostbolt02.jpg', a, 1.5, 2.4, 'new state: frost');
        ring(g, 455, 190, 10, 60, a, 3.3, .4, '159,212,245', 7); pop(g, '−14', 490, 126, ROWS[2][3], a, 3.3, { size: 22 }); tag(g, 'frozen', 455, 252, '#2f6a94', a, 3.4, 4.3);
      }),
      V('Toe-to-Toe Trade', 'hi', 'The exchange showed you hit harder than they do. So you stand still and race them down.', EXCH, [[.6, .9, '', 'plain'], [1.5, 4.2, 'stand and trade']], (g, a) => {
        const p = at(392, 190), rounds = [.75, 2.0, 2.6, 3.2, 3.8], n = rounds.filter(h => a >= h).length;
        read(g, 'I deal 8. They deal 3.', a, 1.0, 4.3);
        const es = rounds.map(h => swing(a, h - .25, h + .12)).find(s => s.wa !== REST) || { wa: REST, trail: 0 }, ys = rounds.map(h => swing(a, h - .3, h)).find(s => s.wa !== REST) || { wa: REST, trail: 0 };
        foe(g, E0, PI, { ...es, flash: Math.max(...rounds.map(h => hitK(a, h))) }); you(g, p, 0, { ...ys, flash: .7 * Math.max(...rounds.map(h => hitK(a, h + .12))) });
        if (a > 1.5) { g.setLineDash([5, 5]); g.strokeStyle = ROWS[2][3]; g.lineWidth = 2.5; g.beginPath(); g.arc(p.x, p.y, 28, 0, TAU); g.stroke(); g.setLineDash([]); }
        bar(g, 392, 128, 1 - n * .12, { label: 'you', w: 70 }); bar(g, 470, 128, Math.max(0, 1 - n * .2), { label: 'enemy', w: 70, col: '#e5322d' });
        rounds.forEach((h, i) => { spark(g, 426, 190, a, h, '#ffd45e', 22); pop(g, '−8', 500, 170 + (i % 2) * 12, ROWS[2][3], a, h, { life: .55, size: 17 }); pop(g, '−3', 340, 170 + (i % 2) * 12, HI, a, h + .12, { life: .55, size: 15 }); });
        tag(g, 'they run out first', 430, 262, ROWS[2][3], a, 3.85, 4.35);
      }),
      V('Elemental Enchant / Infuse', 'lo', 'Your hit showed what it is weak to. You infuse the blade to match.', EXCH, [[.5, .9, '', 'plain'], [1.5, 2.4, 'infuse fire'], [3.0, 3.4, 'strike', 'plain']], (g, a) => {
        const p = mv(a, [[1.3, 388, 190], [1.6, 340, 190], [2.7, 340, 190], [3.0, 388, 190]]), hot = a >= 1.95, e = at(455 + 28 * ease(ph(a, 3.3, 3.6)), 190);
        read(g, 'Ice creature: weak to fire.', a, 1.0, 2.9);
        foe(g, e, PI, { col: '#9fd4f5', dark: '#2f6a94', head: '#6fb6e0', flash: Math.max(.5 * hitK(a, .75), hitK(a, 3.3)) }); if (a > 3.3) flame(g, e.x, e.y, 30, 1 - ph(a, 3.9, 4.3), a);
        you(g, p, 0, { ...(a < 1.3 ? swing(a, .45, .75) : swing(a, 3.0, 3.3)), wglow: hot ? '#ff8a2a' : null, glow: a > 1.5 && a < 2.4 ? 'rgba(255,138,42,.28)' : null });
        spark(g, 430, 190, a, .75, '#c9d3e6', 18); pop(g, '−3', 486, 146, C.muted, a, .75, { life: .7 }); swapCard(g, 340, 286, 'gi:broadsword', 'wow-spell_fire_sealoffire.jpg', a, 1.5, 2.4, 'new state: fire blade');
        spark(g, 432, 190, a, 3.3, '#ff8a2a', 38); pop(g, '−11', 490, 140, ROWS[2][3], a, 3.3, { size: 22 });
      }),
      V('Revive', 'lo', 'They are backing off to reposition. You read the lull and use it to raise your ally.', [[.3, 1.3, 'the exchange'], [1.3, 3.2, 'backs off']], [[.5, .9, '', 'plain'], [2.0, 3.1, 'revive ally']], (g, a) => {
        const al = at(170, 276), p = mv(a, [[1.4, 388, 190], [2.0, 204, 250]]), e = mv(a, [[1.3, 455, 190], [2.4, 566, 118]]), up = a >= 3.1;
        read(g, 'They are backing off: a lull.', a, 1.3, 3.2);
        foe(g, e, a < 1.3 ? PI : PI + .5, { flash: hitK(a, .75) });
        if (a > 2.0 && a < 3.1) { const k = ph(a, 2.0, 3.1); g.strokeStyle = 'rgba(47,174,99,.25)'; g.lineWidth = 6; g.beginPath(); g.arc(al.x, al.y, 30, 0, TAU); g.stroke(); g.strokeStyle = '#2fae63'; g.beginPath(); g.arc(al.x, al.y, 30, -PI / 2, -PI / 2 + TAU * k); g.stroke(); }
        fig(g, al.x, al.y, -.6, { col: '#2fae63', dark: '#123f26', head: '#1f8a4a', down: !up, flash: hitK(a, 3.1) });
        you(g, p, a < 1.4 ? 0 : a < 2.0 ? PI - .5 : PI - .9, { ...swing(a, .45, .75), wa: a > 2 && a < 3.1 ? 1.4 : undefined });
        spark(g, 430, 190, a, .75); pop(g, '−8', 486, 146, ROWS[2][3], a, .75, { life: .6 }); tag(g, 'ally down', 170, 318, C.muted, a, .1, 2.9); plus(g, al.x, al.y, a, 3.0, 3.9); pop(g, 'REVIVED', 190, 226, GREEN, a, 3.1, { size: 21, life: 1.2 });
      }),
    ],
  });
})();
