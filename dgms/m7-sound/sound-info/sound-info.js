/* Sound as information (mock-up for DGMS M7, beside Hear the Boss Coming, Four Classes Sorter and Same Scene, Four Rules).
   1. Overwatch: the same team fight twice; on one map ultimates are silent, on the other they start with a shout the
      targeted team reacts to. Units caught in each blast are counted.
   2. Left 4 Dead: special infected approach a group of survivors in fog; each is heard before it is seen.
   3. Counter-Strike: three attackers take one route to a site; running is heard by the defender, walking is silent.
   Positions are closed-form functions of t. Sounds are synthesised with the Web Audio API after the first Sound click,
   and only while a slide plays live (never while seeking). */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp } = TD, TAU = Math.PI * 2;
  const W = 1040, H = 585;
  const txt = (g, s, x, y, o = {}) => { g.font = o.font || '600 15px Jost, sans-serif'; g.fillStyle = o.col || C.ink; g.textAlign = o.align || 'left'; g.textBaseline = o.base || 'middle'; g.fillText(s, x, y); };
  const bg = g => { T.use(g); g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(255,252,244,.9)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill(); };
  const rr = (g, x, y, w, h, r, col) => { g.fillStyle = col; g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); };
  function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  /* ---------- audio ---------- */
  const AU = { ctx: null, master: null, on: false };
  function ensure() {
    if (!AU.ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; AU.ctx = new AC(); AU.master = AU.ctx.createGain(); AU.master.gain.value = 0; AU.master.connect(AU.ctx.destination); }
    if (AU.ctx.state === 'suspended') AU.ctx.resume(); return AU.ctx;
  }
  function setSound(on) { if (on && !ensure()) return; AU.on = on; if (AU.ctx) AU.master.gain.setTargetAtTime(on ? .5 : 0, AU.ctx.currentTime, .03); $$(document, '.si-snd').forEach(b => { b.classList.toggle('on', on); b.textContent = on ? '♪ Sound: on' : '♪ Sound: off'; }); }
  $$(document, '.si-snd').forEach(b => b.addEventListener('click', () => setSound(!AU.on)));
  function tone(f0, f1, dur, type = 'sine', vol = .3, at = 0) {
    if (!AU.on || !AU.ctx) return; const c = AU.ctx, t = c.currentTime + at, o = c.createOscillator(), gn = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(vol, t + .02); gn.gain.exponentialRampToValueAtTime(.001, t + dur);
    o.connect(gn); gn.connect(AU.master); o.start(t); o.stop(t + dur + .05);
  }
  function noise(dur, freq, vol = .3, at = 0) {
    if (!AU.on || !AU.ctx) return; const c = AU.ctx, t = c.currentTime + at, n = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate), d = n.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const s = c.createBufferSource(), f = c.createBiquadFilter(), gn = c.createGain(); s.buffer = n; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 2;
    gn.gain.setValueAtTime(vol, t); gn.gain.exponentialRampToValueAtTime(.001, t + dur); s.connect(f); f.connect(gn); gn.connect(AU.master); s.start(t);
  }
  // play events whose time falls in (a, b], only while live
  const fire = (list, a, b, fn) => list.forEach(e => { if (e.t > a && e.t <= b) fn(e); });

  /* ---------- 1. Overwatch ---------- */
  const BLUE = '#2ea3dc', RED = '#e5322d', RAD = 78, WIND = 1.2;
  const ULTS = [
    { t: 2, team: 'blue', hero: 'Stormcaller', tx: 340, ty: 140, own: '“Storm\'s coming. On me!”', foe: '“Nowhere to hide from the storm!”' },
    { t: 8, team: 'red', hero: 'Wrecker', tx: 150, ty: 140, own: '“Breaking through. Follow me in!”', foe: '“Here comes the wrecking ball!”' },
    { t: 14, team: 'blue', hero: 'Stormcaller', tx: 330, ty: 170, own: '“Storm\'s coming. On me!”', foe: '“Nowhere to hide from the storm!”' },
  ];
  const UNITS = (() => { const R = mulberry(9), u = []; ['blue', 'red'].forEach(team => { const cx = team === 'blue' ? 150 : 340, cy = 150; for (let i = 0; i < 5; i++) { const a = R() * TAU, d = 12 + R() * 38; u.push({ team, bx: cx + Math.cos(a) * d, by: cy + Math.sin(a) * d, react: 0.35 + R() * 0.6 }); } }); return u; })();
  function unitAt(u, t, loud) {
    let x = u.bx, y = u.by, caught = null;
    ULTS.forEach((e, k) => {
      if (e.team === u.team || t < e.t) return;
      const hit = e.t + WIND, dx = u.bx - e.tx, dy = u.by - e.ty, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
      const flee = loud ? Math.max(0, Math.min(t, hit) - (e.t + u.react)) * 100 : 0, back = t > hit + 1 ? clamp((t - hit - 1) / 2, 0, 1) : 0;
      const fleeAtHit = loud ? Math.max(0, WIND - u.react) * 100 : 0;
      if (t < hit + 3.5) { const f = t <= hit ? flee : fleeAtHit * (1 - back); x = u.bx + ux * f; y = u.by + uy * f; }
      if (t >= hit && d + fleeAtHit < RAD) { caught = caught || { k, at: hit }; }
    });
    return { x, y, caught };
  }
  function caughtCount(loud, t) { let n = 0; ULTS.forEach((e, k) => { if (t < e.t + WIND) return; UNITS.forEach(u => { if (u.team === e.team) return; const d = Math.hypot(u.bx - e.tx, u.by - e.ty), fl = loud ? Math.max(0, WIND - u.react) * 100 : 0; if (d + fl < RAD) n++; }); }); return n; }
  function drawFight(g, x0, y0, t, loud) {
    rr(g, x0, y0, 490, 290, 10, '#e6dcc4'); g.save(); g.beginPath(); g.roundRect(x0, y0, 490, 290, 10); g.clip();
    g.fillStyle = '#cdbf9f'; [[200, 60, 50, 40], [230, 200, 40, 50], [60, 230, 60, 30]].forEach(([x, y, w, h]) => g.fillRect(x0 + x, y0 + y, w, h));
    const live = ULTS.filter(e => t >= e.t && t < e.t + WIND + 1.2);
    live.forEach(e => {
      const f = clamp((t - e.t) / WIND, 0, 1), col = e.team === 'blue' ? BLUE : RED;
      if (t < e.t + WIND) { g.strokeStyle = col; g.lineWidth = 3; g.setLineDash([6, 5]); g.beginPath(); g.arc(x0 + e.tx, y0 + e.ty, RAD, 0, TAU); g.stroke(); g.setLineDash([]); g.fillStyle = col; g.globalAlpha = .12 + .2 * f; g.beginPath(); g.arc(x0 + e.tx, y0 + e.ty, RAD * f, 0, TAU); g.fill(); g.globalAlpha = 1; }
      else { const k = (t - e.t - WIND) / 1.2; g.fillStyle = col; g.globalAlpha = .45 * (1 - k); g.beginPath(); g.arc(x0 + e.tx, y0 + e.ty, RAD, 0, TAU); g.fill(); g.globalAlpha = 1; }
      if (loud && t < e.t + WIND) { const cx = e.team === 'blue' ? 150 : 340; for (let r = 0; r < 3; r++) { const rad = ((t - e.t) * 260 + r * 70) % 420; g.strokeStyle = col; g.globalAlpha = Math.max(0, .5 - rad / 840); g.lineWidth = 2; g.beginPath(); g.arc(x0 + cx, y0 + 60, rad, 0, TAU); g.stroke(); } g.globalAlpha = 1; }
    });
    UNITS.forEach(u => {
      const p = unitAt(u, t, loud), hurt = p.caught && t >= p.caught.at && t < p.caught.at + 2.5;
      g.fillStyle = u.team === 'blue' ? BLUE : RED; g.globalAlpha = hurt ? .35 : 1; g.beginPath(); g.arc(x0 + p.x, y0 + p.y, 9, 0, TAU); g.fill(); g.globalAlpha = 1;
      g.strokeStyle = C.navy; g.lineWidth = 1.5; g.stroke(); if (hurt) txt(g, '✕', x0 + p.x, y0 + p.y + 1, { font: '800 12px Jost', col: C.navy, align: 'center' });
    });
    g.restore(); g.save(); g.beginPath(); g.roundRect(x0, y0, 490, 290, 10); g.strokeStyle = C.navy; g.lineWidth = 2; g.stroke(); g.restore();
  }
  function drawUlt(g, t) {
    bg(g);
    txt(g, 'Silent ultimates', 30, 26, { font: '800 16px Montserrat' }); txt(g, 'Ultimates start with a shout', 540, 26, { font: '800 16px Montserrat' });
    drawFight(g, 20, 44, t, false); drawFight(g, 530, 44, t, true);
    const n0 = caughtCount(false, t), n1 = caughtCount(true, t);
    txt(g, `${n0} caught so far`, 30, 352, { font: '800 15px Montserrat', col: RED }); txt(g, `${n1} caught so far`, 540, 352, { font: '800 15px Montserrat', col: n1 < n0 ? C.good : RED });
    // what each team hears
    const e = ULTS.filter(u => t >= u.t).pop(), on = e && t < e.t + WIND + 2.5;
    rr(g, 20, 378, 490, 186, 10, 'rgba(38,44,106,.05)'); rr(g, 530, 378, 490, 186, 10, 'rgba(38,44,106,.05)');
    txt(g, 'What the players hear', 36, 400, { font: '700 13px Jost', col: C.muted }); txt(g, 'What the players hear', 546, 400, { font: '700 13px Jost', col: C.muted });
    if (on) {
      const own = e.team === 'blue' ? BLUE : RED, foe = e.team === 'blue' ? RED : BLUE;
      txt(g, `${e.hero} (${e.team} team) starts an ultimate.`, 36, 430, { font: '700 14px Jost', col: C.navy });
      txt(g, 'Nothing. The first sign is the blast itself.', 36, 462, { font: '600 14px Jost', col: C.muted });
      txt(g, `${e.hero} (${e.team} team) starts an ultimate.`, 546, 430, { font: '700 14px Jost', col: C.navy });
      rr(g, 546, 450, 458, 44, 8, 'rgba(255,255,255,.9)'); g.fillStyle = own; g.fillRect(546, 450, 6, 44); txt(g, `${e.team === 'blue' ? 'Blue' : 'Red'} team hears: ${e.own}`, 562, 472, { font: '700 14px Jost', col: C.navy });
      rr(g, 546, 502, 458, 44, 8, 'rgba(255,255,255,.9)'); g.fillStyle = foe; g.fillRect(546, 502, 6, 44); txt(g, `${e.team === 'blue' ? 'Red' : 'Blue'} team hears: ${e.foe}`, 562, 524, { font: '700 14px Jost', col: C.navy });
    } else { txt(g, 'quiet', 36, 430, { font: '600 14px Jost', col: C.muted }); txt(g, 'quiet', 546, 430, { font: '600 14px Jost', col: C.muted }); }
  }
  canvasDemo('ult', (s, cv, g) => {
    const st = { held: false, t: 0, prev: 0, key: '', tour: true }, DUR = 19, tourBtn = $(s, '.ult-tour');
    tourBtn.onclick = () => { st.t = 0; st.prev = 0; };
    function info(t) {
      const cap = t < 2 ? 'Two copies of one team fight. Blue on the left of each map, red on the right.' : t < 8 ? 'Blue starts an ultimate. On the right, the shout reaches red first, and most of them step out before the blast.' : t < 14 ? 'Red answers. The same line that warns blue tells red\'s own team to follow up.' : 'One sound, two jobs: a warning for the targets and a rally call for the team. On the silent map, everyone is caught.';
      const k = cap + caughtCount(false, t) + caughtCount(true, t); if (k === st.key) return; st.key = k;
      say($(s, '.ult-stats'), `<div class="r"><b>${caughtCount(false, t)}</b><span>players caught by silent ultimates</span></div><div class="g"><b>${caughtCount(true, t)}</b><span>caught when each ultimate starts with a shout</span></div>`);
      say($(s, '.ult-out'), cap);
    }
    s._seek = t => { drawUlt(g, Math.min(t, DUR)); info(t); };
    window.__seek = t => { st.held = true; s._seek(t); };
    window.__dur = () => DUR;
    return dt => {
      if (st.held) return; st.prev = st.t; st.t += Math.max(0, dt); if (st.t >= DUR) { st.t = 0; st.prev = 0; }
      fire(ULTS, st.prev, st.t, e => { if (e.team === 'blue') { tone(330, 660, .35, 'triangle', .25); tone(495, 990, .35, 'triangle', .15, .12); } else { tone(140, 90, .5, 'sawtooth', .18); noise(.4, 400, .2); } });
      s._seek(st.t);
    };
  });

  /* ---------- 2. Left 4 Dead ---------- */
  const SX = 300, SY = 290, VIS = 120, CUE = { smoker: '#5d8a3a', hunter: '#3a6fd8', boomer: '#c9a227', witch: '#c94fa0', tank: '#a8201c' };
  const SPECS = [
    { k: 'smoker', name: 'Smoker', cue: 'cough', t: 1, ang: -60, from: 420, speed: 70, stop: 105, range: 330 },
    { k: 'hunter', name: 'Hunter', cue: 'growl, then a screech', t: 5, ang: 160, from: 420, speed: 90, stop: 30, range: 300, pounce: 150 },
    { k: 'boomer', name: 'Boomer', cue: 'gurgle', t: 10, ang: 30, from: 380, speed: 45, stop: 60, range: 260 },
    { k: 'witch', name: 'Witch', cue: 'crying', t: 14, ang: 110, from: 220, speed: 0, stop: 220, range: 300 },
    { k: 'tank', name: 'Tank', cue: 'its own music', t: 18, ang: 200, from: 430, speed: 55, stop: 70, range: 9999 },
  ];
  function specAt(sp, t) {
    if (t < sp.t) return null;
    let d = sp.from, dt = t - sp.t;
    if (sp.pounce) { const walk = (sp.from - sp.pounce) / sp.speed; d = dt < walk ? sp.from - sp.speed * dt : Math.max(sp.stop, sp.pounce - 420 * (dt - walk)); }
    else d = Math.max(sp.stop, sp.from - sp.speed * dt);
    const a = sp.ang * Math.PI / 180; return { d, x: SX + Math.cos(a) * d, y: SY + Math.sin(a) * d };
  }
  // first time a special is heard / seen (searched on a fine grid; fine for a mock-up)
  const firstWhen = (sp, pred) => { for (let t = sp.t; t < sp.t + 20; t += 0.02) { const p = specAt(sp, t); if (p && pred(p)) return t; } return null; };
  SPECS.forEach(sp => { sp.heard = firstWhen(sp, p => p.d <= sp.range); sp.seen = firstWhen(sp, p => p.d <= VIS); });
  const SPAN = 26;
  function drawSpec(g, t, cues) {
    bg(g);
    rr(g, 20, 20, 560, 545, 10, '#4a4f3a');
    const R = mulberry(4); g.fillStyle = 'rgba(255,255,255,.05)'; for (let k = 0; k < 60; k++) g.fillRect(20 + R() * 540, 20 + R() * 530, 18, 6);
    // survivors
    [[-14, -8], [12, -10], [-10, 12], [14, 10]].forEach(([dx, dy], i) => { g.fillStyle = ['#e0a92d', '#2ea3dc', '#2fae63', '#d24b8f'][i]; g.beginPath(); g.arc(SX + dx, SY + dy, 8, 0, TAU); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.stroke(); });
    // specials (drawn before the fog so the fog hides them)
    SPECS.forEach(sp => { const p = specAt(sp, t); if (!p) return; g.fillStyle = CUE[sp.k]; g.beginPath(); g.arc(p.x, p.y, sp.k === 'tank' ? 16 : sp.k === 'boomer' ? 13 : 10, 0, TAU); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); });
    // fog outside the survivors' sight
    g.save(); g.beginPath(); g.roundRect(20, 20, 560, 545, 10); g.arc(SX, SY, VIS, 0, TAU, true); g.fillStyle = 'rgba(12,16,30,.86)'; g.fill(); g.restore();
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1.5; g.setLineDash([4, 4]); g.beginPath(); g.arc(SX, SY, VIS, 0, TAU); g.stroke(); g.setLineDash([]);
    // what is heard through the fog
    SPECS.forEach(sp => {
      const p = specAt(sp, t); if (!p) return;
      const heard = cues && p.d <= sp.range, seen = p.d <= VIS;
      if (seen) { txt(g, sp.name, p.x, p.y - 22, { font: '800 13px Montserrat', col: '#fff', align: 'center' }); if (sp.k === 'smoker' && p.d <= sp.stop + 1) { g.strokeStyle = CUE.smoker; g.lineWidth = 3; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(SX, SY); g.stroke(); } }
      if (heard && !seen) {
        for (let r = 0; r < 3; r++) { const rad = ((t * 40 + r * 14) % 42) + 6; g.strokeStyle = CUE[sp.k]; g.globalAlpha = 1 - rad / 48; g.lineWidth = 2.5; g.beginPath(); g.arc(p.x, p.y, rad, 0, TAU); g.stroke(); }
        g.globalAlpha = 1; txt(g, sp.cue, p.x, p.y + 30, { font: '700 12px Jost', col: '#fff', align: 'center' });
        const a = Math.atan2(p.y - SY, p.x - SX), ex = SX + Math.cos(a) * (VIS + 8), ey = SY + Math.sin(a) * (VIS + 8);
        g.fillStyle = CUE[sp.k]; g.beginPath(); g.moveTo(ex + Math.cos(a) * 12, ey + Math.sin(a) * 12); g.lineTo(ex + Math.cos(a + 2.5) * 8, ey + Math.sin(a + 2.5) * 8); g.lineTo(ex + Math.cos(a - 2.5) * 8, ey + Math.sin(a - 2.5) * 8); g.fill();
      }
      if (sp.k === 'tank' && cues && t < sp.t + 6 && t >= sp.t) txt(g, '♪ Tank music', SX, 44, { font: '800 15px Montserrat', col: '#ff9a8f', align: 'center' });
    });
    txt(g, 'survivors see only the clear circle', 300, 552, { font: '600 12px Jost', col: 'rgba(255,255,255,.7)', align: 'center' });
    // warning table
    const X0 = 610; txt(g, 'Warning before it is in sight', X0, 34, { font: '800 16px Montserrat' });
    const tx0 = X0 + 110, tx1 = 1010, px = v => tx0 + (tx1 - tx0) * v / SPAN;
    [0, 10, 20].forEach(v => txt(g, v + ' s', px(v), 62, { font: '600 11px Jost', col: C.muted, align: 'center' }));
    SPECS.forEach((sp, i) => {
      const y = 96 + i * 72, h = cues ? sp.heard : null, se = sp.seen;
      txt(g, sp.name, X0, y, { font: '800 14px Montserrat', col: CUE[sp.k] }); txt(g, sp.cue, X0, y + 18, { font: '600 11px Jost', col: C.muted });
      rr(g, tx0, y - 8, tx1 - tx0, 16, 4, 'rgba(38,44,106,.06)');
      if (h !== null && t >= h) { const b = se === null ? Math.min(t, SPAN) : Math.min(t, se); g.fillStyle = CUE[sp.k]; g.globalAlpha = .55; g.fillRect(px(h), y - 8, Math.max(2, px(b) - px(h)), 16); g.globalAlpha = 1; }
      if (se !== null && t >= se) { g.fillStyle = C.navy; g.fillRect(px(se) - 1.5, y - 12, 3, 24); }
      let lab = '';
      if (t >= sp.t) lab = se === null ? (h !== null && t >= h ? 'heard, never seen: steer clear' : '') : t >= se ? (h !== null ? `${(se - h).toFixed(1)} s of warning` : 'no warning: seen first') : (h !== null && t >= h ? 'heard, not yet seen' : '');
      txt(g, lab, tx0, y + 22, { font: '700 12px Jost', col: lab.startsWith('no') ? C.red : C.navy });
    });
    txt(g, 'coloured bar: heard · navy tick: seen', X0, 470, { font: '600 12px Jost', col: C.muted });
  }
  canvasDemo('spec', (s, cv, g) => {
    const st = { held: false, t: 0, prev: 0, key: '', cues: true }, chk = $(s, '.sp-cues');
    chk.onchange = () => { st.cues = chk.checked; st.key = ''; };
    $(s, '.sp-tour').onclick = () => { st.t = 0; st.prev = 0; };
    function info(t) {
      const done = SPECS.filter(sp => sp.seen !== null && t >= sp.seen), warn = st.cues ? done.map(sp => sp.seen - sp.heard) : done.map(() => 0);
      const avg = warn.length ? warn.reduce((a, b) => a + b, 0) / warn.length : 0;
      const cap = !st.cues ? 'With the sounds off, each special is a surprise: the first sign is the moment it steps out of the dark.' : t < 5 ? 'A cough in the dark: the Smoker is heard long before it is seen, and the arrow at the edge of sight points to it.' : t < 10 ? 'The Hunter growls while it stalks, then screeches as it pounces. Even a fast special gives a little warning.' : t < 18 ? 'The Witch\'s crying says where not to go. If the survivors listen, they never need to see her.' : 'The Tank brings its own music, heard across the map. Every special has a sound, so the players can sort threats by ear.';
      const k = cap + done.length + st.cues; if (k === st.key) return; st.key = k;
      say($(s, '.sp-stats'), `<div class="${st.cues ? 'g' : 'r'}"><b>${avg.toFixed(1)}</b><span>seconds of warning, on average, before a special is in sight (${done.length} seen so far)</span></div>`);
      say($(s, '.sp-out'), cap);
    }
    s._seek = t => { drawSpec(g, Math.min(t, SPAN), st.cues); info(t); };
    window.__seek = t => { st.held = true; s._seek(t); };
    window.__dur = () => SPAN;
    const EV = SPECS.map(sp => ({ t: sp.heard ?? sp.t, k: sp.k }));
    return dt => {
      if (st.held) return; st.prev = st.t; st.t += Math.max(0, dt); if (st.t >= SPAN) { st.t = 0; st.prev = 0; }
      if (st.cues) fire(EV, st.prev, st.t, e => ({
        smoker: () => { noise(.12, 900, .3); noise(.12, 900, .3, .2); },
        hunter: () => { tone(110, 90, .5, 'sawtooth', .15); tone(900, 1800, .3, 'sawtooth', .12, .55); },
        boomer: () => { tone(70, 55, .8, 'sine', .35); noise(.6, 200, .15); },
        witch: () => { tone(620, 420, .9, 'sine', .15); tone(560, 380, .9, 'sine', .12, .9); },
        tank: () => { [0, .5, 1, 1.5].forEach(a => { tone(60, 40, .3, 'sine', .45, a); }); tone(98, 98, 1.8, 'triangle', .1); },
      }[e.k]()));
      s._seek(st.t);
    };
  });

  /* ---------- 3. Counter-Strike ---------- */
  const U = 3, RUN = 250 / U, WALK = 130 / U, HEAR = 660 / U, DEFX = 470, DEFY = 345;
  const ROUTE = [[70, 520], [70, 160], [420, 160], [420, 330]];
  const RSEG = ROUTE.slice(1).map((q, i) => { const p = ROUTE[i]; return { p, q, len: Math.hypot(q[0] - p[0], q[1] - p[1]) }; }), RLEN = RSEG.reduce((a, s) => a + s.len, 0);
  const posAt = d => { for (const s of RSEG) { if (d <= s.len) { const f = d / s.len; return [lerp(s.p[0], s.q[0], f), lerp(s.p[1], s.q[1], f)]; } d -= s.len; } return ROUTE[ROUTE.length - 1]; };
  const near = d => { const [x, y] = posAt(d); return Math.hypot(x - DEFX, y - DEFY) <= HEAR; };
  // a policy says, for each distance along the route, whether the attacker walks
  function travel(walkFn, holdList) {
    const pts = [], steps = []; let d = 0, t = 0, heard = 0, firstHeard = null, nextStep = 0;
    while (d < RLEN && t < 60) {
      const walking = holdList ? holdList(t) : walkFn(d);
      if (!walking && t >= nextStep) { const h = near(d); steps.push({ t, d, h }); nextStep = t + 0.33; if (h && firstHeard === null) firstHeard = t; }
      d += (walking ? WALK : RUN) * 0.02; t += 0.02; pts.push({ t, d, walking });
    }
    return { pts, steps, arrive: t, firstHeard, warn: firstHeard === null ? 0 : t - firstHeard };
  }
  const CS_POL = [
    { name: 'Runs all the way', col: '#e5322d', run: travel(() => false) },
    { name: 'Walks all the way', col: '#2ea3dc', run: travel(() => true) },
    { name: 'Runs, then walks in earshot', col: '#2fae63', run: travel(d => near(d + RUN * 0.4)) },
  ];
  const dAt = (r, t) => { const p = r.pts[clamp(Math.round(t / 0.02), 0, r.pts.length - 1)]; return p ? p.d : 0; };
  function drawSteps(g, t, runs) {
    bg(g);
    rr(g, 20, 20, 560, 545, 10, '#e6dcc4');
    g.fillStyle = '#cdbf9f'; [[110, 200, 290, 90], [110, 330, 270, 210], [470, 40, 90, 260]].forEach(([x, y, w, h]) => g.fillRect(x, y, w, h));
    g.save(); g.beginPath(); g.roundRect(20, 20, 560, 545, 10); g.clip();
    g.fillStyle = 'rgba(229,50,45,.07)'; g.beginPath(); g.arc(DEFX, DEFY, HEAR, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(229,50,45,.5)'; g.lineWidth = 2; g.setLineDash([6, 5]); g.beginPath(); g.arc(DEFX, DEFY, HEAR, 0, TAU); g.stroke(); g.setLineDash([]); g.restore();
    txt(g, 'running footsteps carry this far', DEFX - 40, DEFY - HEAR - 12, { font: '700 12px Jost', col: C.red, align: 'center' });
    g.strokeStyle = 'rgba(21,32,68,.25)'; g.lineWidth = 16; g.lineJoin = 'round'; g.beginPath(); ROUTE.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke();
    rr(g, DEFX - 34, DEFY - 24, 68, 48, 8, 'rgba(229,50,45,.2)'); txt(g, 'site', DEFX, DEFY - 34, { font: '800 12px Montserrat', col: C.red, align: 'center' });
    g.fillStyle = '#5d618c'; g.beginPath(); g.arc(DEFX, DEFY, 10, 0, TAU); g.fill(); txt(g, 'defender', DEFX, DEFY + 22, { font: '700 11px Jost', col: C.navy, align: 'center' });
    runs.forEach((p, i) => {
      const r = p.run, off = (i - (runs.length - 1) / 2) * 10;
      r.steps.filter(sp => sp.t <= t && t - sp.t < 1.2).forEach(sp => { const [x, y] = posAt(sp.d), a = 1 - (t - sp.t) / 1.2; g.strokeStyle = sp.h ? C.red : 'rgba(21,32,68,.4)'; g.globalAlpha = a; g.lineWidth = sp.h ? 2.5 : 1.5; g.beginPath(); g.arc(x + off, y, 8 + (t - sp.t) * 30, 0, TAU); g.stroke(); g.globalAlpha = 1; });
      const [x, y] = posAt(dAt(r, t)); g.fillStyle = p.col; g.beginPath(); g.arc(x + off, y, 8, 0, TAU); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke();
    });
    // results
    const X0 = 610; txt(g, 'Route to the site', X0, 34, { font: '800 16px Montserrat' });
    runs.forEach((p, i) => {
      const r = p.run, y = 80 + i * 96, arrived = t >= r.arrive, heardNow = r.firstHeard !== null && t >= r.firstHeard;
      g.fillStyle = p.col; g.beginPath(); g.arc(X0 + 8, y, 7, 0, TAU); g.fill(); txt(g, p.name, X0 + 24, y, { font: '800 14px Montserrat' });
      txt(g, arrived ? `arrives at ${r.arrive.toFixed(1)} s` : `on the way · ${dAt(r, t) / RLEN * 100 | 0}%`, X0 + 24, y + 24, { font: '700 13px Jost', col: C.navy });
      txt(g, r.firstHeard === null ? 'never heard' : heardNow ? `heard ${arrived ? r.warn.toFixed(1) + ' s before arriving' : 'now: the defender turns'}` : 'not heard yet', X0 + 24, y + 46, { font: '700 13px Jost', col: r.firstHeard === null ? C.good : heardNow ? C.red : C.muted });
    });
    txt(g, `running ${250} units/s · walking ${130} units/s`, X0, 400, { font: '600 13px Jost', col: C.muted });
  }
  canvasDemo('steps', (s, cv, g) => {
    const st = { held: false, t: 0, prev: 0, key: '', tour: true, hold: [], down: false, mine: null }, tourBtn = $(s, '.cs-tour'), wb = $(s, '.cs-walk');
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); st.t = 0; st.hold = []; } };
    const setDown = v => { if (v === st.down) return; manual(); st.down = v; wb.classList.toggle('down', v); st.hold.push([st.t, v]); };
    wb.addEventListener('pointerdown', e => { e.preventDefault(); setDown(true); }); ['pointerup', 'pointercancel', 'pointerleave'].forEach(n => wb.addEventListener(n, () => setDown(false)));
    addEventListener('keydown', e => { if (e.key === 'Shift' && s.classList.contains('active')) setDown(true); }); addEventListener('keyup', e => { if (e.key === 'Shift') setDown(false); });
    tourBtn.onclick = () => { st.tour = true; st.t = 0; st.prev = 0; tourBtn.classList.add('on'); };
    const holdAt = t => { let v = false; st.hold.forEach(([a, x]) => { if (a <= t) v = x; }); return v; };
    function info(t, runs, cap) {
      const k = cap + runs.map(p => (t >= p.run.arrive) + '' + (p.run.firstHeard !== null && t >= p.run.firstHeard)).join(); if (k === st.key) return; st.key = k;
      say($(s, '.cs-stats'), runs.map(p => `<div class="${p.run.firstHeard === null ? 'g' : 'r'}"><b>${p.run.arrive.toFixed(1)} s</b><span>${p.name}: ${p.run.firstHeard === null ? 'never heard' : p.run.warn.toFixed(1) + ' s of warning'}</span></div>`).join(''));
      say($(s, '.cs-out'), cap);
    }
    const DUR = 20;
    const cap = t => t < 6 ? 'Three attackers take one route to the site. Running is fast; every running step makes a ring, red once the defender can hear it.' : t < 11 ? 'The runner gets there first, but the defender has heard them coming for seconds and is already aiming at the door.' : t < 16 ? 'The walker is never heard, and pays for it in time.' : 'Running until the edge of earshot, then walking, is the expert play: the rule turns information into something you spend.';
    s._seek = t => { drawSteps(g, Math.min(t, DUR), CS_POL); info(t, CS_POL, cap(t)); };
    window.__seek = t => { st.held = true; s._seek(t); };
    window.__dur = () => DUR;
    return dt => {
      if (st.held) return; st.prev = st.t; st.t += Math.max(0, dt);
      if (st.tour) {
        if (st.t >= DUR) { st.t = 0; st.prev = 0; }
        CS_POL.forEach(p => fire(p.run.steps, st.prev, st.t, sp => noise(.05, sp.h ? 1500 : 700, sp.h ? .35 : .08)));
        s._seek(st.t); return;
      }
      // the viewer's attacker: recomputed from the hold timeline; the three references are ghosts
      const mine = { name: 'You', col: '#e0a92d', run: travel(null, t => (t <= st.t ? holdAt(t) : st.down)) };
      fire(mine.run.steps, st.prev, st.t, sp => noise(.05, sp.h ? 1500 : 700, sp.h ? .35 : .08));
      const runs = [...CS_POL, mine]; drawSteps(g, Math.min(st.t, 40), runs);
      info(st.t, [mine], st.t >= mine.run.arrive ? `You arrived at ${mine.run.arrive.toFixed(1)} s, ${mine.run.firstHeard === null ? 'unheard' : 'heard for ' + mine.run.warn.toFixed(1) + ' s'}. Press Walk-through to replay the references.` : 'Hold the button or Shift to walk silently; let go to run.');
    };
  });
})();
