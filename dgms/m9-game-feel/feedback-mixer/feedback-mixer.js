/* Feedback channel mixer (Module 9, Part 7, deck slides 179-208). One melee hit on a training dummy, on a loop, with the
   deck's eight feedback channels as toggles and a strength slider each: VFX and light, haptics, UI, SFX, animation,
   materials and decals, camera and time. Extras from the slides: GDKeys' "paint the UI green" check (187), cutting the
   first frames of a slow animation (193), the FOV table (198) and Sion's ultimate, heard map-wide (190). Haptics go to a
   connected controller through the Gamepad API and always show on the rumble meter; SFX are WebAudio blips that only
   start after a click or key press. Slide 2 is a checklist in the shape of Jacopo's feedback tool (208) that fills in
   from the mixer and downloads as text or JSON. Every frame is a pure function of (time, settings), so __seek is
   deterministic; sound and rumble only fire from the live loop. */
(function () {
  const { $, $$, canvasDemo, say, store } = FPF.kit;
  const C = TD.C, { clamp, lerp } = TD, TAU = Math.PI * 2;
  const W = 1040, H = 585, SH = 446;
  const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const eOut = k => 1 - (1 - k) * (1 - k), eIn = k => k * k, eIO = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  const GREEN = '#39e81c';

  const CH = [
    { id: 'vfx', name: 'VFX and light', short: 'VFX, light', items: ['Swing trail', 'Impact spark', 'Light flash'], thr: [0, .3, .6], pri: 'High',
      note: 'Trails “simulate the blur”, impacts and explosions “bring weight into actions”, and a flash of light lands the hit.' },
    { id: 'hap', name: 'Haptics', short: 'Haptics', items: ['Impact pulse, short and strong', 'Wind-up buzz, rising'], thr: [0, .5], pri: 'Medium',
      note: '“The only physical influence most games have.” Short and strong for impacts, rising or pulsing for charge-ups. A connected controller rumbles too.' },
    { id: 'ui', name: 'UI', short: 'UI', items: ['Damage number', 'Health bar drop', 'Hit marker and combo count'], sh: ['Damage number', 'Health bar', 'Hit marker'], thr: [0, .3, .6], pri: 'Medium',
      note: 'Numbers, bars and markers confirm the hit. Paint the UI green to see how much of the screen it takes.' },
    { id: 'sfx', name: 'SFX', short: 'SFX', items: ['Impact thump', 'Swing whoosh', 'Dummy creak'], thr: [0, .35, .7], pri: 'High',
      note: '“The rare feedback that doesn’t need to be on-screen.” Try Sion’s ultimate: you hear it from anywhere on the map.' },
    { id: 'anim', name: 'Animation', short: 'Animation', items: ['Anticipation pose', 'Follow-through', 'Victim recoil'], thr: [0, .35, .6], pri: 'High',
      note: 'The two common mistakes: not moving the characters enough, and slow starts. Turn the strength down, then cut the first frames.' },
    { id: 'mat', name: 'Materials, decals', short: 'Materials', items: ['Slash decal', 'Straw burst', 'Floor scuff'], thr: [0, .35, .7], pri: 'Low',
      note: 'The surface answers the blade: a slash mark stays on the dummy, straw bursts out, the floor gets scuffed.' },
    { id: 'cam', name: 'Camera', short: 'Camera', items: ['Shake on impact', 'Zoom punch'], thr: [0, .5], pri: 'High',
      note: 'Shake “must simulate the action”: it kicks in the direction of the hit. The FOV presets come from the deck’s table.' },
    { id: 'time', name: 'Time', short: 'Time', items: ['Hit stop', 'Victim wobble during the stop', 'Slow-motion tail'], sh: ['Hit stop', 'Victim wobble', 'Slow-mo tail'], thr: [0, .4, .8], pri: 'High',
      note: 'Hit stop “scaled depending on the impact. Don’t abuse it or it might make the game feel laggy.” The victim wobbles while frozen, Smash style.' },
  ];
  const FOV = [{ v: 50, game: 'Dying Light 1', why: 'claustrophobic horror' }, { v: 70, game: 'Dying Light 2', why: 'open parkour' }, { v: 90, game: 'Doom', why: 'awareness' }, { v: 100, game: 'Forza Horizon', why: 'speed' }];
  const sion = new Image(); sion.src = 'img/Sion.png';

  const S = {   // shared by both slides
    ch: Object.fromEntries(CH.map(c => [c.id, { on: false, str: .6 }])), green: false, cut: false, fov: 70, sionAt: -99,
    pri: Object.fromEntries(CH.map(c => [c.id, c.pri])), name: 'Melee hit on a training dummy',
  };
  const lvl = (st, id) => st.ch[id].on ? st.ch[id].str : 0;
  const has = (st, id, i) => st.ch[id].on && st.ch[id].str >= CH.find(c => c.id === id).thr[i];

  /* ---------- the hit as a timeline: real time maps to action time, so hit stop and slow motion freeze or stretch it ---------- */
  function timeline(st) {
    const wind = st.cut ? .08 : .3, strike = .07, stopF = has(st, 'time', 0) ? Math.round(2 + 10 * lvl(st, 'time')) : 0, slow = has(st, 'time', 2);
    const press = .5, imp = press + wind + strike;
    const seg = [];   // [real a, real b, action a, action b]
    let r = 0, a = 0;
    const add = (dr, da) => { seg.push([r, r + dr, a, a + da]); r += dr; a += da; };
    add(imp, imp);
    if (stopF) add(stopF / 60, 0);
    if (slow) add(.5, .18);
    add(1.3 - (slow ? .18 : 0), 1.3 - (slow ? .18 : 0));
    return { seg, len: r, press, wind, imp, stopF, stopEnd: imp + stopF / 60 };
  }
  function actionAt(TL, t) {
    t = ((t % TL.len) + TL.len) % TL.len;
    const s = TL.seg.find(x => t >= x[0] && t < x[1]) || TL.seg[TL.seg.length - 1];
    const a = lerp(s[2], s[3], (t - s[0]) / Math.max(1e-6, s[1] - s[0]));
    return { t, a, stopping: s[3] === s[2], stopFor: s[3] === s[2] ? t - s[0] : 0 };
  }
  const rumble = (st, a, TL) => {   // motor strength 0..1 at action time a
    let v = 0;
    if (has(st, 'hap', 1) && a > TL.press && a < TL.imp) v = Math.max(v, .15 + .45 * (a - TL.press) / (TL.imp - TL.press));
    if (has(st, 'hap', 0) && a >= TL.imp) v = Math.max(v, Math.exp(-(a - TL.imp) * 16));
    return v * (.3 + .7 * lvl(st, 'hap'));
  };

  /* ---------- drawing ---------- */
  function label(g, text, x, y, col = C.ink, size = 14, align = 'left', bgc = 'rgba(255,252,244,.9)') {
    g.font = `700 ${size}px Jost, sans-serif`; g.textAlign = align; g.textBaseline = 'alphabetic';
    const w = g.measureText(text).width, bx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    g.fillStyle = bgc; g.beginPath(); g.roundRect(bx - 7, y - size - 2, w + 14, size + 10, 6); g.fill();
    g.fillStyle = col; g.fillText(text, x, y);
  }
  function wrap(g, text, x, y, mw, lh) {
    const words = text.split(' '); let line = '', n = 0;
    words.forEach(w => { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > mw && line) { g.fillText(line, x, y + n++ * lh); line = w; } else line = t; });
    if (line) g.fillText(line, x, y + n++ * lh);
    return n;
  }
  function speaker(g, x, y, a, text, big) {
    if (a <= 0) return;
    g.save(); g.globalAlpha = clamp(a);
    g.font = '700 13px Jost, sans-serif'; const w = g.measureText(text).width;
    g.fillStyle = 'rgba(21,32,68,.88)'; g.beginPath(); g.roundRect(x - 8, y - 18, w + 44, 30, 8); g.fill();
    g.fillStyle = '#ffb951'; g.beginPath(); g.moveTo(x, y - 7); g.lineTo(x + 5, y - 7); g.lineTo(x + 11, y - 12); g.lineTo(x + 11, y + 6); g.lineTo(x + 5, y + 1); g.lineTo(x, y + 1); g.closePath(); g.fill();
    g.strokeStyle = '#ffb951'; g.lineWidth = 2; [6, 10].forEach(r => { g.beginPath(); g.arc(x + 12, y - 3, r, -.8, .8); g.stroke(); });
    g.fillStyle = '#fff'; g.textAlign = 'left'; g.fillText(text, x + 28, y + 2);
    g.restore();
  }

  function drawMixer(g, st, t) {
    const TL = timeline(st), A = actionAt(TL, t), a = A.a;
    const vfx = lvl(st, 'vfx'), ui = lvl(st, 'ui'), sfx = lvl(st, 'sfx'), an = lvl(st, 'anim'), mat = lvl(st, 'mat'), cam = lvl(st, 'cam'), tm = lvl(st, 'time');
    const since = a - TL.imp, hit = since >= 0, fl = 360;
    const uiCol = c => st.green ? GREEN : c;
    g.clearRect(0, 0, W, H);
    g.save(); g.beginPath(); g.roundRect(0, 0, W, H, 14); g.clip();
    g.save(); g.beginPath(); g.rect(0, 0, W, SH); g.clip();
    // camera: FOV preset as a zoom about the action, shake and zoom punch from the camera channel
    let zoom = Math.tan(35 * Math.PI / 180) / Math.tan(st.fov / 2 * Math.PI / 180);
    if (has(st, 'cam', 1) && hit) zoom *= 1 + .07 * cam * Math.exp(-since * 9);
    const shk = has(st, 'cam', 0) && hit ? 22 * cam * Math.exp(-since * 11) : 0;
    const sx = shk * (Math.cos(since * 60) * .9), sy = shk * Math.sin(since * 47) * .4;
    g.translate(W / 2 + sx, 300 + sy); g.scale(zoom, zoom); g.translate(-W / 2 - 10, -300);
    // set: wall, floor
    g.fillStyle = '#e2dac8'; g.fillRect(-900, -600, W + 1800, fl + 600);
    for (let i = -8; i < 16; i++) { g.fillStyle = i % 2 ? '#d8cfbb' : '#dcd3c0'; g.fillRect(i * 110, 60, 110, fl - 60); }
    g.fillStyle = '#c9bea6'; g.fillRect(-900, fl, W + 1800, 900);
    g.strokeStyle = '#a99c80'; g.lineWidth = 2; g.beginPath(); g.moveTo(-900, fl); g.lineTo(W + 900, fl); g.stroke();
    // light flash
    if (has(st, 'vfx', 2) && hit && since < .3 || has(st, 'vfx', 2) && A.stopping) {
      const k = A.stopping ? 1 : 1 - since / .3, rg = g.createRadialGradient(600, 300, 10, 600, 300, 380);
      rg.addColorStop(0, `rgba(255,236,170,${.7 * vfx * k})`); rg.addColorStop(1, 'rgba(255,236,170,0)'); g.fillStyle = rg; g.fillRect(-200, -100, W + 400, SH + 200);
    }
    // animation: the swing's poses; off means a stiff linear swing with no body motion
    const press = TL.press, wEnd = TL.press + TL.wind, imp = TL.imp, animOn = st.ch.anim.on, ex = .4 + an;
    const rest = 1.0, up = animOn ? -2.0 - .7 * an : -1.6, impA = .3, over = animOn && has(st, 'anim', 1) ? 1.0 + .5 * an : impA;
    let ang = rest, lean = 0, lunge = 0;
    if (a < press) ang = rest;
    else if (a < wEnd) { const k = (a - press) / TL.wind; ang = lerp(st.cut ? lerp(rest, up, .75) : rest, up, animOn ? eOut(k) : k); lean = animOn ? -10 * ex * eOut(k) : 0; }
    else if (a < imp) { const k = (a - wEnd) / (imp - wEnd); ang = lerp(up, impA, animOn ? eIn(k) : k); lean = animOn ? lerp(-10 * ex, 8 * ex, k) : 0; lunge = animOn ? 22 * ex * k : 0; }
    else { const d = a - imp; if (animOn && has(st, 'anim', 1)) { ang = d < .12 ? lerp(impA, over, eOut(d / .12)) : lerp(over, rest, eIO(clamp((d - .12) / .6))); } else ang = lerp(impA, rest, clamp(d / .5)); lean = animOn ? 8 * ex * (1 - eIO(clamp(d / .6))) : 0; lunge = animOn ? 22 * ex * (1 - eIO(clamp(d / .7))) : 0; }
    const px = 410 + lunge, shp = { x: px + 18 + lean * .5, y: fl - 84 }, L = 100;
    const tip = an_ => ({ x: shp.x + Math.cos(an_) * L, y: shp.y + Math.sin(an_) * L });
    // swing trail (VFX)
    if (has(st, 'vfx', 0) && a > wEnd && a < imp + .18) {
      const pts = []; for (let i = 0; i < 10; i++) { const k = clamp((a - wEnd - i * .012) / (imp - wEnd)); pts.push(lerp(up, impA, animOn ? eIn(k) : k)); }
      g.beginPath(); pts.forEach((q, i) => { const p = tip(q); i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y); });
      for (let i = pts.length - 1; i >= 0; i--) { g.lineTo(shp.x + Math.cos(pts[i]) * L * .45, shp.y + Math.sin(pts[i]) * L * .45); }
      g.closePath(); g.fillStyle = `rgba(170,220,255,${.35 + .5 * vfx})`; g.fill();
    }
    // floor scuff (materials)
    if (has(st, 'mat', 2) && a > wEnd) { g.fillStyle = `rgba(120,100,70,${.35 * mat})`; g.beginPath(); g.ellipse(px + 10, fl + 6, 30 + 20 * mat, 4, 0, 0, TAU); g.fill(); }
    // player
    TD.use(g); TD.shadow(px + 4, fl + 4, 34, 7, .25);
    g.save(); g.translate(px, fl); g.rotate(lean * .012);
    g.fillStyle = '#8b8fa8'; g.strokeStyle = C.navy; g.lineWidth = 2;
    g.beginPath(); g.roundRect(-22, -112, 44, 112, 12); g.fill(); g.stroke();
    g.fillStyle = '#9fa3ba'; g.beginPath(); g.arc(0, -128, 17, 0, TAU); g.fill(); g.stroke();
    g.restore();
    g.strokeStyle = '#5d618c'; g.lineWidth = 7; g.lineCap = 'round'; const tp = tip(ang); g.beginPath(); g.moveTo(shp.x, shp.y); g.lineTo(tp.x, tp.y); g.stroke(); g.lineCap = 'butt';
    // dummy: recoil (animation), wobble during stop (time), flash (VFX)
    const recoil = has(st, 'anim', 2) && hit ? 18 * (.4 + an) * (since < .05 ? since / .05 : Math.exp(-(since - .05) * 5)) * Math.cos(since * 14) : 0;
    const wob = has(st, 'time', 1) && A.stopping ? Math.sin(A.stopFor * 80) * 5 * (.5 + tm) : 0;
    const flash = has(st, 'vfx', 1) && (A.stopping || hit && since < .06);
    const dx = 600, tilt = recoil * .012;
    g.fillStyle = '#6b4a2a'; g.fillRect(dx - 5, fl - 70, 10, 70);
    g.save(); g.translate(dx + wob, fl - 70); g.rotate(tilt);
    g.fillStyle = '#6b4a2a'; g.fillRect(-52, -60, 104, 8);
    g.fillStyle = flash ? '#fff' : '#c9a24e'; g.beginPath(); g.roundRect(-30, -88, 60, 90, 20); g.fill();
    g.beginPath(); g.arc(0, -108, 20, 0, TAU); g.fill();
    if (!flash) { g.strokeStyle = '#8a6a2a'; g.lineWidth = 2; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-24, -74 + i * 18); g.lineTo(24, -70 + i * 18); g.stroke(); } }
    // slash decal (materials) stays after the hit
    if (has(st, 'mat', 0) && hit) { g.strokeStyle = `rgba(90,50,20,${.5 + .5 * mat})`; g.lineWidth = 3 + 3 * mat; g.lineCap = 'round'; [[-22, -70, 18, -40], [-16, -56, 22, -30]].forEach(([a1, b1, a2, b2], i) => { if (i === 0 || mat > .6) { g.beginPath(); g.moveTo(a1, b1); g.lineTo(a2, b2); g.stroke(); } }); g.lineCap = 'butt'; }
    g.restore();
    const hp = { x: dx - 24, y: 296 };
    // straw burst (materials) and spark (VFX)
    if (has(st, 'mat', 1) && hit && since < .8) for (let i = 0; i < 6 + 14 * mat; i++) { const an2 = -1.2 + hash(i) * 2.2, v = 150 + hash(i + 4) * 260 * mat, x = hp.x + Math.cos(an2) * v * since, y = hp.y + Math.sin(an2) * v * since + 420 * since * since; g.strokeStyle = `rgba(210,170,70,${1 - since / .8})`; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(an2 + i) * 9, y + Math.sin(an2 + i) * 9); g.stroke(); }
    if (has(st, 'vfx', 1) && (A.stopping || hit && since < .18)) {
      const k = A.stopping ? 0 : since / .18, r = (30 + 50 * vfx) * (1 + k);
      g.fillStyle = `rgba(255,250,220,${1 - k})`; g.beginPath();
      for (let i = 0; i < 16; i++) { const an3 = i / 16 * TAU, rr = i % 2 ? r * .35 : r; g.lineTo(hp.x + Math.cos(an3) * rr, hp.y + Math.sin(an3) * rr); }
      g.closePath(); g.fill();
      for (let i = 0; i < 10 * vfx + 4; i++) { const an4 = hash(i + 3) * TAU, v = 380 * (.5 + hash(i) * .5) * since; g.fillStyle = `rgba(255,190,70,${1 - k})`; g.fillRect(hp.x + Math.cos(an4) * v - 3, hp.y + Math.sin(an4) * v - 3, 6, 6); }
    }
    // world-space UI: damage number and hit marker
    const uiRects = [];
    if (has(st, 'ui', 0) && hit && since < 1) {
      const y = 230 - since * 70, sz = 26 + 20 * ui; g.globalAlpha = clamp(1.6 - since * 1.6);
      g.font = `800 ${sz}px Montserrat, Jost, sans-serif`; g.textAlign = 'center'; g.lineWidth = 6; g.strokeStyle = C.navy; g.strokeText('27', dx + 50, y); g.fillStyle = uiCol('#ffdf4a'); g.fillText('27', dx + 50, y); g.globalAlpha = 1;
      uiRects.push(sz * 1.4 * sz * zoom * zoom);
    }
    if (has(st, 'ui', 2) && hit && since < .25) { g.strokeStyle = uiCol('#fff'); g.lineWidth = 4; [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([u, v]) => { g.beginPath(); g.moveTo(hp.x + u * 12, hp.y + v * 12); g.lineTo(hp.x + u * 26, hp.y + v * 26); g.stroke(); }); uiRects.push(52 * 52 * zoom * zoom * .3); }
    // SFX: sound rings at the impact, drawn in the world
    if (has(st, 'sfx', 0) && hit && since < .4) { for (let r = 0; r < 2; r++) { const k = clamp((since - r * .08) / .32); if (k > 0 && k < 1) { g.strokeStyle = `rgba(255,185,81,${(1 - k) * .8})`; g.lineWidth = 3; g.beginPath(); g.arc(hp.x, hp.y, 40 + k * 160 * (.5 + sfx), -1.1, 1.1); g.stroke(); } } }
    g.restore();

    // screen-space overlay: UI bars, SFX captions, rumble meter, FOV diagram, frames readout
    if (has(st, 'ui', 1)) {
      const frac = a < TL.imp ? 1 : 1 - .27 * clamp((since - (A.stopping ? 99 : 0)) / .25 + (hit ? .001 : 0));
      const bw = 300, bx = W / 2 - bw / 2, by = 80;
      g.fillStyle = 'rgba(21,32,68,.75)'; g.fillRect(bx - 4, by - 4, bw + 8, 22);
      g.fillStyle = st.green ? GREEN : '#e5322d'; g.fillRect(bx, by, bw * Math.max(.73, frac), 14);
      if (hit && since < .5) { g.fillStyle = st.green ? GREEN : '#fff'; g.globalAlpha = 1 - since / .5; g.fillRect(bx + bw * .73, by, bw * .27, 14); g.globalAlpha = 1; }
      label(g, 'Training dummy', W / 2, by - 12, uiCol(C.ink), 13, 'center', st.green ? 'rgba(57,232,28,.25)' : 'rgba(255,252,244,.9)');
      uiRects.push((bw + 8) * 22 + 150 * 22);
    }
    if (has(st, 'ui', 2) && hit) { g.font = '800 30px Montserrat, Jost, sans-serif'; g.textAlign = 'right'; g.lineWidth = 5; g.strokeStyle = C.navy; g.strokeText('1 HIT', W - 30, 160); g.fillStyle = uiCol('#ffb951'); g.fillText('1 HIT', W - 30, 160); uiRects.push(110 * 36); }
    if (st.ch.ui.on) {   // the button prompt is part of the UI layer
      const pr = a >= TL.press && a < TL.press + .12;
      g.fillStyle = st.green ? GREEN : pr ? '#ffb951' : 'rgba(21,32,68,.75)'; g.beginPath(); g.arc(W - 60, SH - 50, 24, 0, TAU); g.fill();
      g.fillStyle = st.green ? '#103a08' : pr ? C.navy : '#fff'; g.font = '800 20px Montserrat, Jost, sans-serif'; g.textAlign = 'center'; g.fillText('X', W - 60, SH - 43);
      uiRects.push(48 * 48);
    }
    if (st.green) { g.fillStyle = 'rgba(57,232,28,.08)'; g.fillRect(0, 0, W, SH); const pct = Math.round(uiRects.reduce((s2, v) => s2 + v, 0) / (W * SH) * 100); label(g, st.ch.ui.on ? `UI painted green: about ${pct}% of the view at this moment` : 'UI painted green: no UI is on', W / 2, SH - 18, '#145c33', 14, 'center'); }
    if (has(st, 'sfx', 0) && hit && since < .5) speaker(g, 640, 150, 1 - since / .5, 'thump');
    if (has(st, 'sfx', 1) && a > TL.press + TL.wind * .5 && a < TL.imp) speaker(g, 330, 150, 1, 'whoosh');
    if (has(st, 'sfx', 2) && since > .15 && since < .7) speaker(g, 660, 196, 1 - (since - .15) / .55, 'creak');
    // rumble meter
    const rv = rumble(st, a, TL), mx = W - 214, my = 14;
    g.fillStyle = 'rgba(255,252,244,.92)'; g.beginPath(); g.roundRect(mx, my, 200, 92, 9); g.fill();
    g.fillStyle = st.ch.hap.on ? C.ink : C.muted; g.font = '700 13px Jost, sans-serif'; g.textAlign = 'left'; g.fillText('Rumble', mx + 10, my + 19);
    g.font = '500 11px Jost, sans-serif'; g.fillStyle = C.muted; g.textAlign = 'right'; g.fillText(st.pad ? 'controller connected' : 'no controller: meter only', mx + 190, my + 19);
    for (let i = 0; i < 40; i++) { const aa = a - (39 - i) * .02, v = aa < 0 ? 0 : rumble(st, aa, TL); g.fillStyle = v > .02 ? '#e0a92d' : '#e6dcc5'; const h = 6 + v * 50; g.fillRect(mx + 10 + i * 4.5, my + 84 - h, 3.5, h); }
    const jx = (rv > .05 ? Math.sin(t * 120) * 3 * rv : 0);
    g.save(); g.translate(mx + 160 + jx, my + 52); g.fillStyle = st.ch.hap.on ? '#5d618c' : '#b8bccc'; g.beginPath(); g.roundRect(-24, -10, 48, 22, 10); g.fill(); g.beginPath(); g.arc(-18, 10, 9, 0, TAU); g.arc(18, 10, 9, 0, TAU); g.fill(); g.restore();
    // FOV diagram
    const fx = 14, fy = 14;
    g.fillStyle = 'rgba(255,252,244,.92)'; g.beginPath(); g.roundRect(fx, fy, 232, 92, 9); g.fill();
    const half = st.fov / 2 * Math.PI / 180, ox = fx + 40, oy = fy + 60;
    g.fillStyle = 'rgba(46,163,220,.25)'; g.strokeStyle = C.player; g.lineWidth = 2;
    g.beginPath(); g.moveTo(ox, oy); g.arc(ox, oy, 46, -Math.PI / 2 - half, -Math.PI / 2 + half); g.closePath(); g.fill(); g.stroke();
    const P = FOV.find(f => f.v === st.fov);
    g.fillStyle = C.ink; g.font = '800 18px Montserrat, Jost, sans-serif'; g.textAlign = 'left'; g.fillText(`FOV ${st.fov}°`, fx + 92, fy + 30);
    g.font = '600 12px Jost, sans-serif'; g.fillStyle = C.muted; g.fillText(P.game, fx + 92, fy + 50); g.fillText(P.why, fx + 92, fy + 66);
    // frames from press to impact
    const frames = Math.round((TL.wind + .07) * 60);
    label(g, `press to impact: ${frames} frames${st.cut ? ' (first frames cut)' : ''}${TL.stopF ? ` · hit stop ${TL.stopF} frames` : ''}`, 264, 40, st.cut ? C.good : C.ink, 13);
    if (!CH.some(c => st.ch[c.id].on)) label(g, 'Every channel off: the hit happens, and nothing tells you', W / 2, 140, C.red, 16, 'center');
    // Sion's ultimate: heard from off screen
    const sa = t - st.sionAt;
    if (sa >= 0 && sa < 3) {
      const k = clamp(Math.min(sa / .2, (3 - sa) / .3));
      g.save(); g.globalAlpha = k;
      for (let r = 0; r < 3; r++) { const q = ((sa * 1.2 + r / 3) % 1); g.strokeStyle = `rgba(229,50,45,${(1 - q) * .7})`; g.lineWidth = 4; g.beginPath(); g.arc(W + 40, SH / 2, 60 + q * 500, Math.PI * .7, Math.PI * 1.3); g.stroke(); }
      const cx = W / 2 - 230, cy = SH - 150;
      g.fillStyle = 'rgba(21,32,68,.92)'; g.beginPath(); g.roundRect(cx, cy, 460, 92, 12); g.fill();
      if (sion.complete && sion.naturalWidth) g.drawImage(sion, cx + 10, cy + 10, 72, 72);
      g.fillStyle = '#ffb951'; g.font = '800 16px Montserrat, Jost, sans-serif'; g.textAlign = 'left'; g.fillText('Sion’s ultimate, from off screen', cx + 96, cy + 32);
      g.fillStyle = '#fff'; g.font = '500 13.5px Jost, sans-serif'; wrap(g, 'Every player on the map hears it charging. Sound is the rare feedback that does not need to be on screen.', cx + 96, cy + 52, 350, 17);
      g.restore();
    }
    // the checklist strip
    const n = CH.length, gap = 5, cw = (W - 16 - gap * (n - 1)) / n, y0 = SH + 6, chh = H - y0 - 6;
    g.fillStyle = '#f4ecda'; g.fillRect(0, SH, W, H - SH);
    CH.forEach((c, i) => {
      const x = 8 + i * (cw + gap), o = st.ch[c.id], got = c.items.filter((_, j) => has(st, c.id, j)).length;
      g.fillStyle = o.on ? '#fffaf0' : 'rgba(255,250,240,.45)'; g.strokeStyle = o.on ? '#cdbf9f' : '#e0d5bd'; g.lineWidth = 1.5;
      g.beginPath(); g.roundRect(x, y0, cw, chh, 9); g.fill(); g.stroke();
      g.fillStyle = o.on ? C.good : '#fff'; g.strokeStyle = o.on ? C.good : '#cdbf9f'; g.lineWidth = 2; g.beginPath(); g.roundRect(x + 8, y0 + 9, 18, 18, 4); g.fill(); g.stroke();
      if (o.on) { g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.moveTo(x + 12, y0 + 18); g.lineTo(x + 16, y0 + 22); g.lineTo(x + 23, y0 + 13); g.stroke(); }
      g.fillStyle = o.on ? C.ink : C.muted; g.font = '800 13px Montserrat, Jost, sans-serif'; g.textAlign = 'left'; g.fillText(c.short, x + 32, y0 + 23);
      g.fillStyle = '#e6dcc5'; g.fillRect(x + 8, y0 + 36, cw - 16, 6); g.fillStyle = o.on ? '#e0a92d' : '#cdbf9f'; g.fillRect(x + 8, y0 + 36, (cw - 16) * o.str, 6);
      g.font = '500 12px Jost, sans-serif';
      c.items.forEach((it, j) => { const ok = has(st, c.id, j); g.fillStyle = ok ? C.ink : '#b3a88f'; g.fillText((ok ? '✓ ' : '○ ') + (c.sh ? c.sh[j] : it.split(',')[0]), x + 8, y0 + 60 + j * 17); });
      g.fillStyle = C.muted; g.font = '600 11px Jost, sans-serif'; g.fillText(`${got} of ${c.items.length}`, x + 8, y0 + chh - 8);
    });
    g.restore();
    return TL;
  }

  /* ---------- the checklist sheet (slide 2) ---------- */
  const PRI = ['High', 'Medium', 'Low'], PRI_COL = { High: '#e5322d', Medium: '#e0a92d', Low: '#8ea2e6' };
  const ROW0 = 112, ROWH = 52;
  function drawSheet(g, st) {
    g.clearRect(0, 0, W, H);
    g.fillStyle = '#fffaf0'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill();
    g.fillStyle = C.navy; g.beginPath(); g.roundRect(0, 0, W, 56, [14, 14, 0, 0]); g.fill();
    g.fillStyle = '#ffb951'; g.font = '800 18px Montserrat, Jost, sans-serif'; g.textAlign = 'left'; g.fillText('Feedback checklist', 20, 35);
    g.fillStyle = '#fff'; g.font = '600 16px Jost, sans-serif'; g.fillText(`Event: ${st.name}`, 230, 35);
    const cols = [20, 220, 300, 760, 900];
    g.fillStyle = C.muted; g.font = '700 12px Jost, sans-serif';
    ['CHANNEL', 'STRENGTH', 'WHAT IT DOES ON THIS EVENT', 'PRIORITY', 'STATUS'].forEach((h, i) => g.fillText(h, cols[i], 92));
    let on = 0; const missing = [];
    CH.forEach((c, i) => {
      const y = ROW0 + i * ROWH, o = st.ch[c.id];
      g.fillStyle = i % 2 ? '#f6efdf' : '#fbf6ea'; g.fillRect(10, y - 6, W - 20, ROWH - 2);
      g.fillStyle = o.on ? C.good : '#fff'; g.strokeStyle = o.on ? C.good : '#cdbf9f'; g.lineWidth = 2; g.beginPath(); g.roundRect(cols[0], y + 6, 20, 20, 4); g.fill(); g.stroke();
      if (o.on) { on++; g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.moveTo(cols[0] + 5, y + 16); g.lineTo(cols[0] + 9, y + 21); g.lineTo(cols[0] + 16, y + 11); g.stroke(); }
      g.fillStyle = C.ink; g.font = '800 15px Montserrat, Jost, sans-serif'; g.textAlign = 'left'; g.fillText(c.name, cols[0] + 30, y + 22);
      g.fillStyle = '#e6dcc5'; g.fillRect(cols[1], y + 12, 64, 8); g.fillStyle = o.on ? '#e0a92d' : '#cdbf9f'; g.fillRect(cols[1], y + 12, 64 * o.str, 8);
      g.font = '500 13px Jost, sans-serif';
      let x = cols[2], ln = 0;
      c.items.forEach((it, j) => { const ok = has(st, c.id, j), txt = (ok ? '✓ ' : '○ ') + it; g.fillStyle = ok ? C.ink : '#ab9f86'; if (x > cols[2] && x + g.measureText(txt).width > cols[3] - 10) { x = cols[2]; ln++; } g.fillText(txt, x, y + 16 + ln * 18); x += g.measureText(txt).width + 18; });
      const p = st.pri[c.id]; g.fillStyle = PRI_COL[p]; g.beginPath(); g.roundRect(cols[3], y + 4, 86, 24, 12); g.fill();
      g.fillStyle = '#fff'; g.font = '700 13px Jost, sans-serif'; g.textAlign = 'center'; g.fillText(p, cols[3] + 43, y + 21);
      const got = c.items.filter((_, j) => has(st, c.id, j)).length, status = !o.on ? 'missing' : got < c.items.length ? `${got} of ${c.items.length}` : 'complete';
      g.textAlign = 'left'; g.fillStyle = !o.on ? (p === 'High' ? C.red : C.muted) : got < c.items.length ? '#9a5a06' : C.good; g.font = '700 14px Jost, sans-serif'; g.fillText(status, cols[4], y + 21);
      if (!o.on) missing.push(c);
    });
    const next = missing.slice().sort((a, b) => PRI.indexOf(st.pri[a.id]) - PRI.indexOf(st.pri[b.id]))[0];
    g.fillStyle = C.navy; g.fillRect(10, H - 54, W - 20, 44);
    g.fillStyle = '#fff'; g.font = '700 15px Jost, sans-serif'; g.textAlign = 'left';
    g.fillText(`${on} of 8 channels on.`, 24, H - 26);
    g.fillStyle = '#ffb951';
    g.fillText(missing.length ? `Missing: ${missing.map(m => m.short).join(', ')}.${next ? `  Next to add: ${next.name} (${st.pri[next.id].toLowerCase()} priority).` : ''}` : 'Every channel is in. Now check that none of them is overused.', 190, H - 26);
    return { on, missing, next };
  }
  function exportData(st) {
    return {
      event: st.name, fov: st.fov, uiPaintedGreen: st.green, firstFramesCut: st.cut,
      channels: CH.map(c => ({ channel: c.name, on: st.ch[c.id].on, strength: Math.round(st.ch[c.id].str * 100), priority: st.pri[c.id],
        items: c.items.map((it, j) => ({ item: it, done: has(st, c.id, j) })) })),
    };
  }
  function exportText(st) {
    const d = exportData(st), L = [`Feedback checklist: ${d.event}`, `FOV ${d.fov}°${d.firstFramesCut ? ', first frames of the swing cut' : ''}`, ''];
    d.channels.forEach(c => { L.push(`[${c.on ? 'x' : ' '}] ${c.channel}  (strength ${c.strength}%, priority ${c.priority})`); c.items.forEach(i => L.push(`    [${i.done ? 'x' : ' '}] ${i.item}`)); });
    const miss = d.channels.filter(c => !c.on).map(c => c.channel);
    L.push('', miss.length ? `Missing: ${miss.join(', ')}` : 'Every channel is in.');
    return L.join('\n');
  }
  function download(name, text, type) {
    try {
      const url = URL.createObjectURL(new Blob([text], { type })), a = document.createElement('a');
      a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e) { /* downloads blocked: nothing to do */ }
  }

  /* ---------- sound (WebAudio, only after a user gesture) and rumble (Gamepad API) ---------- */
  let ac = null, noise = null;
  const unlock = () => {
    try {
      if (!ac) { const A = window.AudioContext || window.webkitAudioContext; if (!A) return; ac = new A(); const b = ac.createBuffer(1, ac.sampleRate, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; noise = b; }
      if (ac.state === 'suspended') ac.resume().catch(() => {});
    } catch (e) { ac = null; }
  };
  addEventListener('pointerdown', unlock, true); addEventListener('keydown', unlock, true);
  const canPlay = () => { try { return ac && ac.state === 'running' && !store.get('muted', false); } catch (e) { return false; } };
  function tone(type, f0, f1, dur, vol, at = 0) {
    const t0 = ac.currentTime + at, o = ac.createOscillator(), gn = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
    gn.gain.setValueAtTime(vol, t0); gn.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    o.connect(gn).connect(ac.destination); o.start(t0); o.stop(t0 + dur + .02);
  }
  function hiss(f0, f1, dur, vol, q = 1.5) {
    const t0 = ac.currentTime, s = ac.createBufferSource(), bp = ac.createBiquadFilter(), gn = ac.createGain();
    s.buffer = noise; bp.type = 'bandpass'; bp.Q.value = q; bp.frequency.setValueAtTime(f0, t0); bp.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    gn.gain.setValueAtTime(.0001, t0); gn.gain.exponentialRampToValueAtTime(vol, t0 + dur * .3); gn.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    s.connect(bp).connect(gn).connect(ac.destination); s.start(t0); s.stop(t0 + dur + .02);
  }
  const SFX = {
    thump(v) { tone('sine', 150, 45, .22, .5 * v); hiss(1800, 600, .08, .35 * v, .8); },
    whoosh(v) { hiss(400, 2400, .18, .25 * v, 2); },
    creak(v) { tone('sawtooth', 230, 170, .14, .06 * v, .05); },
    sion() { tone('sawtooth', 55, 40, 1.8, .2); tone('sawtooth', 82, 60, 1.8, .12); hiss(300, 120, 1.6, .3, .7); },
  };
  const play = (k, v) => { if (!canPlay()) return; try { SFX[k](v); } catch (e) { /* audio glitches never break the page */ } };
  function pads() { try { return [...(navigator.getGamepads ? navigator.getGamepads() : [])].filter(p => p && p.connected); } catch (e) { return []; } }
  function vibrate(strong, ms) {
    pads().forEach(p => { try { const v = p.vibrationActuator; if (v && v.playEffect) v.playEffect('dual-rumble', { duration: ms, strongMagnitude: clamp(strong), weakMagnitude: clamp(strong * .7) }).catch(() => {}); } catch (e) { } });
  }

  /* ---------- slide 1: the mixer ---------- */
  const scenes = {};
  const TOUR_ORDER = ['anim', 'vfx', 'sfx', 'time', 'cam', 'ui', 'mat', 'hap'];
  const STEP = 1.7, T0 = 2, TG = T0 + STEP * 8, TC = TG + 2, TF = TC + 2, TS = TF + 3.2, TDUR = TS + 2.2;
  function tourState(st, t) {
    CH.forEach(c => { st.ch[c.id].on = false; st.ch[c.id].str = .6; });
    TOUR_ORDER.forEach((id, i) => { if (t >= T0 + i * STEP) st.ch[id].on = true; });
    st.green = t >= TG && t < TC; st.cut = t >= TC; st.fov = t >= TF && t < TS ? FOV[clamp(Math.floor((t - TF) / .8), 0, 3)].v : 70;
    st.sionAt = t >= TS ? 0 : -99; st.focus = t < T0 ? null : t < TG ? TOUR_ORDER[Math.min(7, Math.floor((t - T0) / STEP))] : t < TC ? 'green' : t < TF ? 'cut' : t < TS ? 'fov' : 'sion';
    // the walk-through restarts the hit with each change, so every step shows a full swing
    const marks = [0, ...TOUR_ORDER.map((_, i) => T0 + i * STEP), TG, TC, TF, TS];
    return t - Math.max(...marks.filter(m => m <= t));
  }
  canvasDemo('mixer', (s, cv, g) => {
    const st = S; st.tour = true; st.held = false; st.t = 0; st.focus = null;
    const box = $(s, '.fm-ch'), tourBtn = $(s, '.fm-tour'), out = $(s, '.fm-out'), greenBtn = $(s, '.fm-green'), cutBox = $(s, '.fm-cutbox'), fovBox = $(s, '.fm-fov');
    box.innerHTML = CH.map(c => `<input type="checkbox" id="fm-${c.id}" data-id="${c.id}"><label for="fm-${c.id}">${c.name}</label><input type="range" min="0" max="100" value="60" data-id="${c.id}" aria-label="${c.name} strength"><b data-v="${c.id}">60%</b>`).join('');
    fovBox.innerHTML = FOV.map(f => `<button class="btn" data-f="${f.v}" title="${f.game}: ${f.why}">${f.v}° ${f.game}</button>`).join('');
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); st.sionAt = -99; st.t = 0; } st.held = false; };
    $$(box, 'input[type=checkbox]').forEach(el => el.onchange = () => { manual(); st.ch[el.dataset.id].on = el.checked; st.focus = el.dataset.id; st.t = 0; });
    $$(box, 'input[type=range]').forEach(el => el.oninput = () => { manual(); const o = st.ch[el.dataset.id]; o.str = el.value / 100; o.on = true; st.focus = el.dataset.id; });
    $$(fovBox, '.btn').forEach(b => b.onclick = () => { manual(); st.fov = +b.dataset.f; st.focus = 'fov'; });
    greenBtn.onclick = () => { manual(); st.green = !st.green; st.focus = 'green'; };
    cutBox.onchange = () => { manual(); st.cut = cutBox.checked; st.focus = 'cut'; st.t = 0; };
    $(s, '.fm-sion').onclick = () => { manual(); st.sionAt = st.t; st.focus = 'sion'; play('sion'); vibrate(.4, 600); };
    $(s, '.fm-all').onclick = () => { manual(); CH.forEach(c => st.ch[c.id].on = true); st.focus = null; st.t = 0; };
    $(s, '.fm-none').onclick = () => { manual(); CH.forEach(c => st.ch[c.id].on = false); st.green = false; st.focus = null; st.t = 0; };
    tourBtn.onclick = () => { st.tour = true; st.held = false; st.t = 0; tourBtn.classList.add('on'); };
    let lastKey = '';
    function sync() {
      CH.forEach(c => { const o = st.ch[c.id]; $(box, `#fm-${c.id}`).checked = o.on; const r = $(box, `input[type=range][data-id=${c.id}]`); if (+r.value !== Math.round(o.str * 100)) r.value = Math.round(o.str * 100); $(box, `[data-v=${c.id}]`).textContent = Math.round(o.str * 100) + '%'; });
      greenBtn.classList.toggle('on', st.green); cutBox.checked = st.cut;
      $$(fovBox, '.btn').forEach(b => b.classList.toggle('on', +b.dataset.f === st.fov));
      const key = [st.focus, st.fov, st.green, st.cut].join();
      if (key === lastKey) return; lastKey = key;
      const c = CH.find(x => x.id === st.focus), F = FOV.find(f => f.v === st.fov);
      say(out, c ? `<b>${c.name}.</b> ${c.note}`
        : st.focus === 'green' ? '<b>Paint the UI green.</b> GDKeys’ trick: colour every UI element bright green and look at how much of the screen it covers. If it is a lot, the UI is carrying feedback the world should carry.'
        : st.focus === 'cut' ? `<b>Cut the first frames.</b> A pack animation starts slowly. Cutting its first frames makes the same swing land in ${Math.round((.08 + .07) * 60)} frames instead of ${Math.round((.3 + .07) * 60)}, and it reads as responsive.`
        : st.focus === 'fov' ? `<b>FOV ${F.v}°, ${F.game}:</b> ${F.why}. A narrow view closes in for horror; a wide one shows more for awareness and sells speed.`
        : st.focus === 'sion' ? '<b>Sion’s ultimate.</b> Heard map-wide, from off screen. Sound is the rare feedback that does not need to be on-screen.'
        : 'One melee hit on a training dummy, eight channels. Turn them on one at a time, then all together: the deck’s point is that they combine.');
    }
    let prevA = -1, prevLen = 0;
    scenes.mixer = { seek(t) { st.held = true; st.tour = true; tourBtn.classList.add('on'); const lt = tourState(st, t); drawMixer(g, st, lt); sync(); }, dur: () => TDUR };
    sync();
    return dt => {
      if (st.held) return;
      st.t += Math.max(0, dt);
      let lt = st.t;
      if (st.tour) { if (st.t >= TDUR) st.t = 0; lt = tourState(st, st.t); }
      st.pad = pads().length > 0;
      const TL = drawMixer(g, st, lt), A = actionAt(TL, lt);
      // live only: sound and rumble fire when the action time crosses a beat
      const cross = (x, a0, a1) => a0 < x && x <= a1;
      const a0 = prevA, a1 = A.a, wrapped = a1 < a0;
      const hitNow = !wrapped && cross(TL.imp, a0, a1) || wrapped && a1 >= TL.imp;
      if (prevA >= 0) {
        if (hitNow) { if (has(st, 'sfx', 0)) play('thump', .4 + .6 * lvl(st, 'sfx')); if (has(st, 'sfx', 2)) play('creak', lvl(st, 'sfx')); if (has(st, 'hap', 0)) vibrate(.4 + .6 * lvl(st, 'hap'), 110); }
        const wStart = TL.press + TL.wind * .5;
        if (!wrapped && cross(wStart, a0, a1)) { if (has(st, 'sfx', 1)) play('whoosh', lvl(st, 'sfx')); if (has(st, 'hap', 1)) vibrate(.25 * lvl(st, 'hap'), 120); }
        if (st.tour && prevLen < TS && st.t >= TS) play('sion');
      }
      prevA = a1; prevLen = st.t;
      sync();
    };
  });

  /* ---------- slide 2: the checklist ---------- */
  canvasDemo('sheet', (s, cv, g) => {
    const tourBtn = $(s, '.sh-tour'), out = $(s, '.sh-out'), name = $(s, '.fm-name');
    let tour = true, held = false, t = 0;
    const manual = () => { if (tour) { tour = false; tourBtn.classList.remove('on'); } held = false; };
    // walk-through: the sheet fills in as channels go on, highest priority first
    const ORDER = CH.slice().sort((a, b) => PRI.indexOf(a.pri) - PRI.indexOf(b.pri)).map(c => c.id), SDUR = 14;
    const tourSheet = tt => { const st = JSON.parse(JSON.stringify(S)); CH.forEach(c => { st.ch[c.id].on = false; st.ch[c.id].str = .6; }); ORDER.forEach((id, i) => { if (tt >= 1 + i * 1.3) st.ch[id].on = true; }); if (tt > 12) CH.forEach(c => st.ch[c.id].str = 1); st.name = S.name; st.pri = S.pri; return st; };
    let lastKey = '';
    const info = r => { const key = r.on + '|' + (r.next ? r.next.id : ''); if (key === lastKey) return; lastKey = key; say(out, r.missing.length ? `${r.on} of 8 channels on. Missing: ${r.missing.map(m => m.short).join(', ')}. “It helps me understand which effects are missing and what are the best things to prioritize.”` : 'Every channel is in. The next question is which ones are overused: paint the UI green, check the hit stop.'); };
    const render = () => { const st = tour ? tourSheet(t) : S; info(drawSheet(g, st)); };
    tourBtn.onclick = () => { tour = true; held = false; t = 0; tourBtn.classList.add('on'); };
    name.oninput = () => { S.name = name.value.trim() || 'Untitled event'; };
    $(s, '.sh-txt').onclick = () => { manual(); download('feedback-checklist.txt', exportText(S), 'text/plain'); };
    $(s, '.sh-json').onclick = () => { manual(); download('feedback-checklist.json', JSON.stringify(exportData(S), null, 2), 'application/json'); };
    cv.addEventListener('click', e => {
      const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * W / r.width, y = (e.clientY - r.top) * H / r.height, i = Math.floor((y - ROW0 + 6) / ROWH);
      if (i < 0 || i >= CH.length) return; manual();
      if (x >= 760 && x <= 846) { const id = CH[i].id; S.pri[id] = PRI[(PRI.indexOf(S.pri[id]) + 1) % 3]; }
      else if (x < 220) S.ch[CH[i].id].on = !S.ch[CH[i].id].on;
    });
    cv.addEventListener('mousemove', e => { const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * W / r.width, y = (e.clientY - r.top) * H / r.height, i = Math.floor((y - ROW0 + 6) / ROWH); cv.style.cursor = i >= 0 && i < CH.length && (x < 220 || x >= 760 && x <= 846) ? 'pointer' : ''; });
    scenes.sheet = { seek(tt) { held = true; tour = true; t = tt; render(); }, dur: () => SDUR };
    return dt => { if (held) return; if (tour) { t += Math.max(0, dt); if (t >= SDUR) t = 0; } render(); };
  });

  window.__seek = (t, which = 'mixer') => scenes[which].seek(t);
  window.__dur = (which = 'mixer') => scenes[which].dur();
})();
