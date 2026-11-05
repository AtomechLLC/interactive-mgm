/* Polish ladder (Module 9, Part 2, deck slides 35-57). Andre's three before-and-after demos, rebuilt in grey-box canvas art:
   a slasher strike in five cumulative stages, a first-person shot in seven separable layers, and a rail shooter in seven.
   Number keys toggle the layers, like the original builds. A strip under each scene lists what each layer adds and what it
   costs. The slasher also has a hit stop slider (principle 6, slides 77-79), from none to "a rollercoaster that brakes
   every 10 feet". Every frame is a pure function of (time, layers, hit stop), so __seek is deterministic. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const C = TD.C, { clamp, lerp } = TD, TAU = Math.PI * 2;
  const W = 1040, H = 585, SH = 446;           // scene height; the strip fills the rest
  const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const eOut = k => 1 - (1 - k) * (1 - k), eIn = k => k * k, eIO = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  const sstep = (a, b, v) => { const k = clamp((v - a) / (b - a)); return k * k * (3 - 2 * k); };
  const kick = (d, up = .04, fall = 9) => d < 0 ? 0 : d < up ? d / up : Math.exp(-(d - up) * fall);
  const COST = ['$', '$$', '$$$', '$$$$', '$$$$$'];

  function wrap(g, text, x, y, mw, lh) {
    const words = text.split(' '); let line = '', n = 0;
    words.forEach(w => { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > mw && line) { g.fillText(line, x, y + n++ * lh); line = w; } else line = t; });
    if (line) g.fillText(line, x, y + n++ * lh);
    return n;
  }
  function chip(g, text, x, y, on) {
    g.font = '700 12px Jost, sans-serif'; const w = g.measureText(text).width + 12;
    g.fillStyle = on ? '#fde9b8' : '#ece4d2'; g.strokeStyle = on ? '#e0a92d' : '#cdbf9f'; g.lineWidth = 1.5;
    g.beginPath(); g.roundRect(x - w, y - 13, w, 18, 5); g.fill(); g.stroke();
    g.fillStyle = on ? '#7a4a00' : C.muted; g.textAlign = 'left'; g.fillText(text, x - w + 6, y);
  }
  // the strip under every scene: what each layer adds, and its cost
  function strip(g, L, on, cur) {
    const n = L.length, gap = 6, x0 = 8, cw = (W - 16 - gap * (n - 1)) / n, y0 = SH + 6, ch = H - y0 - 6;
    g.fillStyle = '#f4ecda'; g.fillRect(0, SH, W, H - SH);
    L.forEach((l, i) => {
      const x = x0 + i * (cw + gap), lit = on[i];
      g.fillStyle = lit ? '#fffaf0' : 'rgba(255,250,240,.45)'; g.strokeStyle = i === cur ? C.gold : lit ? '#cdbf9f' : '#e0d5bd'; g.lineWidth = i === cur ? 3 : 1.5;
      g.beginPath(); g.roundRect(x, y0, cw, ch, 9); g.fill(); g.stroke();
      g.globalAlpha = lit ? 1 : .5;
      g.fillStyle = lit ? C.navy : C.muted; g.beginPath(); g.roundRect(x + 8, y0 + 8, 22, 22, 5); g.fill();
      g.fillStyle = '#fff'; g.font = '800 14px Montserrat, Jost, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillText(i + 1, x + 19, y0 + 24);
      chip(g, l.cost, x + cw - 7, y0 + 24, lit);
      g.textAlign = 'left'; g.fillStyle = C.ink; g.font = '800 13px Montserrat, Jost, sans-serif';
      const tl = wrap(g, l.name, x + 9, y0 + 48, cw - 16, 15);
      g.font = '500 12.5px Jost, sans-serif'; g.fillStyle = lit ? C.ink : C.muted;
      wrap(g, l.adds, x + 9, y0 + 50 + tl * 15, cw - 14, 15);
      g.globalAlpha = 1;
    });
  }
  function bg(g, top = '#e9e2d2', bot = '#d9cfb9') {
    g.clearRect(0, 0, W, H);
    g.save(); g.beginPath(); g.roundRect(0, 0, W, H, 14); g.clip();
    const gr = g.createLinearGradient(0, 0, 0, SH); gr.addColorStop(0, top); gr.addColorStop(1, bot); g.fillStyle = gr; g.fillRect(0, 0, W, SH);
  }
  function label(g, text, x, y, col = C.ink, size = 14, align = 'left') {
    g.font = `700 ${size}px Jost, sans-serif`; g.textAlign = align; g.textBaseline = 'alphabetic';
    const w = g.measureText(text).width, bx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    g.fillStyle = 'rgba(255,252,244,.88)'; g.beginPath(); g.roundRect(bx - 7, y - size - 2, w + 14, size + 10, 6); g.fill();
    g.fillStyle = col; g.fillText(text, x, y);
  }
  // a speaker glyph with waves: the canvas stand-in for a sound
  function sound(g, x, y, a, text) {
    if (a <= 0) return;
    g.save(); g.globalAlpha = clamp(a);
    g.fillStyle = 'rgba(21,32,68,.85)'; g.beginPath(); g.roundRect(x - 6, y - 18, 34 + text.length * 8, 30, 8); g.fill();
    g.fillStyle = '#ffb951'; g.beginPath(); g.moveTo(x, y - 7); g.lineTo(x + 5, y - 7); g.lineTo(x + 11, y - 12); g.lineTo(x + 11, y + 6); g.lineTo(x + 5, y + 1); g.lineTo(x, y + 1); g.closePath(); g.fill();
    g.strokeStyle = '#ffb951'; g.lineWidth = 2;
    [6, 10].forEach(r => { g.beginPath(); g.arc(x + 12, y - 3, r, -.8, .8); g.stroke(); });
    g.fillStyle = '#fff'; g.font = '700 13px Jost, sans-serif'; g.textAlign = 'left'; g.fillText(text, x + 27, y + 2);
    g.restore();
  }

  /* ============ 1. slasher: five cumulative stages, plus hit stop ============ */
  const SL = [
    { name: 'Basic blockout', cost: '$ · hours', adds: 'Basic shapes and active hitbox outlines, made as quickly and dirtily as possible.' },
    { name: 'Essential communication', cost: '$ · a day', adds: 'Yes, you hit the target. It flashes and moves back a tiny bit.' },
    { name: 'Preparation for tuning', cost: '$$ · days', adds: 'Fast swings get short animations. The heavy hit gets heavier visuals.' },
    { name: 'Vertical exploration', cost: '$$$$ · 1 attack', adds: 'Every effect turned all the way up, on one combo and one dummy, to see the bill.' },
    { name: 'Proof', cost: '$$$$$ · the game', adds: 'Final quality, tuned down from the peak, applied to a few places first.' },
  ];
  const SL_NOTE = [
    '<b>Stage 1, blockout.</b> Basic shapes and the active hitbox outlines. The only sign of a hit is a debug line. It is enough to test spacing and timing, and nothing else.',
    '<b>Stage 2, essential communication.</b> “Yes, you hit the target.” The dummy flashes and moves back a tiny bit. Every swing still looks the same.',
    '<b>Stage 3, preparation for tuning.</b> The two quick swings get short animations; the closer gets a long wind-up, a bigger flash and a bigger push. Now the timings can be tuned.',
    '<b>Stage 4, vertical exploration.</b> Every effect turned up, but only on this combo and one dummy. The point is to learn how high the visual effect bill can go.',
    '<b>Stage 5, proof.</b> Final quality, tuned back from the peak, proved on a few places before it spreads to the rest of the game.',
  ];
  function slTimeline(stage, hsF) {
    const hs = hsF / 60, tuned = stage >= 3;
    const atk = tuned ? [{ w: .10, s: .06, r: .20, h: 0 }, { w: .10, s: .06, r: .24, h: 0 }, { w: .34, s: .10, r: .52, h: 1 }]
      : [{ w: .2, s: .08, r: .3, h: 0 }, { w: .2, s: .08, r: .3, h: 0 }, { w: .2, s: .08, r: .3, h: 0 }];
    const segs = [{ ph: 'idle', a: 0, b: .35, k: -1 }], imp = [];
    let t = .35;
    atk.forEach((A, k) => {
      segs.push({ ph: 'wind', a: t, b: (t += A.w), k }); segs.push({ ph: 'strike', a: t, b: (t += A.s), k });
      const stop = hs * (tuned && A.h ? 1.6 : 1); imp.push({ t, stop });
      if (stop > 0) segs.push({ ph: 'stop', a: t, b: (t += stop), k });
      segs.push({ ph: 'rec', a: t, b: (t += A.r), k });
    });
    segs.push({ ph: 'idle', a: t, b: (t += .45), k: 3 });
    return { segs, len: t, atk, imp };
  }
  function slSample(TL, t) {
    t = ((t % TL.len) + TL.len) % TL.len;
    const s = TL.segs.find(x => t >= x.a && t < x.b) || TL.segs[TL.segs.length - 1];
    // time since the last impact, in action time (frozen while a stop runs)
    let since = 99, last = -1, stopFor = 0;
    TL.imp.forEach((m, k) => { if (t >= m.t) { last = k; const d = t - m.t; since = Math.max(0, d - m.stop); stopFor = d < m.stop ? d : -1; } });
    return { t, s, p: (t - s.a) / Math.max(1e-6, s.b - s.a), since, last, stopping: s.ph === 'stop', stopFor };
  }
  const swordAng = (stage, S, TL) => {
    const tuned = stage >= 3, k = S.s.k, heavy = tuned && k >= 0 && k < 3 && TL.atk[k].h;
    const rest = 1.0, up = heavy ? -2.7 : -2.1, imp = .35, E = tuned ? [eOut, eIn, eIO] : [v => v, v => v, v => v];
    switch (S.s.ph) {
      case 'wind': return lerp(rest, up, E[0](S.p));
      case 'strike': return lerp(up, imp, E[1](S.p));
      case 'stop': return imp;
      case 'rec': return tuned ? (S.p < .25 ? lerp(imp, 1.35, eOut(S.p / .25)) : lerp(1.35, rest, eIO((S.p - .25) / .75))) : lerp(imp, rest, S.p);
      default: return rest;
    }
  };
  function drawSlasher(g, stage, hsF, t) {
    const TL = slTimeline(stage, hsF), S = slSample(TL, t), tuned = stage >= 3, maxed = stage === 4, proof = stage === 5;
    const k = S.last, heavy = tuned && k === 2, fl = 360;
    bg(g, proof ? '#cfd6e4' : '#e9e2d2', proof ? '#b7bfd2' : '#d9cfb9');
    // camera: shake and a zoom punch on impact (stages 4 and 5)
    const shakeA = maxed ? 16 : proof ? (heavy ? 7 : 3) : 0;
    const sk = (stage >= 4 && S.since < .4) ? shakeA * Math.exp(-S.since * 12) : 0;
    const sx = sk * Math.sin(S.t * 91), sy = sk * Math.cos(S.t * 73) * .6;
    const zoom = maxed && S.since < .3 ? 1 + .06 * Math.exp(-S.since * 10) : 1;
    g.save(); g.beginPath(); g.rect(0, 0, W, SH); g.clip();
    g.translate(W / 2 + sx, 300 + sy); g.scale(zoom, zoom); g.translate(-W / 2, -300);
    // set: plain floor line, or a finished room for the proof stage
    if (proof) {
      g.fillStyle = '#8d96b0'; g.fillRect(-40, 70, W + 80, fl - 70);
      for (let i = 0; i < 9; i++) { g.fillStyle = '#7b84a0'; g.fillRect(40 + i * 120, 90, 70, 150); g.fillStyle = '#a3abc3'; g.fillRect(40 + i * 120, 90, 70, 6); }
      g.fillStyle = '#5c6584'; g.fillRect(-40, fl, W + 80, SH - fl + 40);
      g.strokeStyle = '#4c5574'; g.lineWidth = 2; for (let i = -1; i < 12; i++) { g.beginPath(); g.moveTo(i * 100, fl); g.lineTo(i * 100 - 60, SH + 40); g.stroke(); }
    } else {
      g.fillStyle = '#c9bea6'; g.fillRect(-40, fl, W + 80, SH - fl + 40);
      g.strokeStyle = '#a99c80'; g.lineWidth = 2; g.beginPath(); g.moveTo(-40, fl); g.lineTo(W + 40, fl); g.stroke();
    }
    // light flash from the impact
    const lightA = S.last >= 0 && S.since < .25 && stage >= 3 ? (maxed ? .75 : proof ? .35 : heavy ? .2 : 0) * (1 - S.since / .25) : 0;
    if (lightA > 0 || S.stopping && stage >= 3) {
      const a = S.stopping ? (maxed ? .75 : proof ? .35 : heavy ? .2 : 0) : lightA, rg = g.createRadialGradient(500, 320, 10, 500, 320, maxed ? 420 : 260);
      rg.addColorStop(0, `rgba(255,236,170,${a})`); rg.addColorStop(1, 'rgba(255,236,170,0)'); g.fillStyle = rg; g.fillRect(0, 0, W, SH);
    }
    // player: lunges on the tuned swings
    const lunge = tuned ? (S.s.ph === 'strike' ? S.p : S.s.ph === 'stop' ? 1 : S.s.ph === 'rec' ? 1 - eIO(S.p) : 0) * (S.s.k === 2 ? 26 : 12) : 0;
    const px = 360 + lunge, sh = { x: px + 22, y: fl - 82 };
    const ang = swordAng(stage, S, TL), L = proof ? 100 : 92, tip = { x: sh.x + Math.cos(ang) * L, y: sh.y + Math.sin(ang) * L };
    // swing trail: the sword's recent angles (stage 4 all of it, stage 5 a tuned ribbon)
    if (stage >= 4 && (S.s.ph === 'strike' || S.s.ph === 'stop' || (S.s.ph === 'rec' && S.p < .4))) {
      const pts = [];
      for (let i = 0; i <= 12; i++) { const SS = slSample(TL, S.t - (S.stopping ? S.stopFor : 0) - i * .012); if (SS.s.ph === 'wind' || SS.s.ph === 'idle') break; pts.push(swordAng(stage, SS, TL)); }
      if (pts.length > 1) {
        g.beginPath(); g.moveTo(sh.x + Math.cos(pts[0]) * L, sh.y + Math.sin(pts[0]) * L);
        pts.forEach(a => g.lineTo(sh.x + Math.cos(a) * L, sh.y + Math.sin(a) * L));
        for (let i = pts.length - 1; i >= 0; i--) g.lineTo(sh.x + Math.cos(pts[i]) * L * (maxed ? .3 : .6), sh.y + Math.sin(pts[i]) * L * (maxed ? .3 : .6));
        g.closePath(); g.fillStyle = maxed ? 'rgba(255,200,90,.75)' : 'rgba(170,220,255,.55)'; g.fill();
      }
    }
    // body
    if (proof) {
      TD.use(g); TD.shadow(px + 4, fl + 4, 36, 8, .3);
      g.fillStyle = '#2a3560'; g.beginPath(); g.moveTo(px - 26, fl - 100); g.lineTo(px - 40, fl - 10); g.lineTo(px - 6, fl - 40); g.closePath(); g.fill();   // cape
      g.fillStyle = '#3b4a82'; g.beginPath(); g.roundRect(px - 22, fl - 104, 44, 66, 14); g.fill();
      g.fillStyle = '#26305a'; g.fillRect(px - 18, fl - 40, 14, 40); g.fillRect(px + 4, fl - 40, 14, 40);
      g.fillStyle = '#e8c7a6'; g.beginPath(); g.arc(px + 2, fl - 120, 16, 0, TAU); g.fill();
      g.fillStyle = '#26305a'; g.beginPath(); g.arc(px + 2, fl - 124, 17, Math.PI, TAU); g.fill();
    } else {
      g.fillStyle = '#8b8fa8'; g.fillRect(px - 22, fl - 110, 44, 110); g.fillStyle = '#9fa3ba'; g.fillRect(px - 16, fl - 140, 32, 30);
      g.strokeStyle = C.navy; g.lineWidth = 2; g.strokeRect(px - 22, fl - 110, 44, 110); g.strokeRect(px - 16, fl - 140, 32, 30);
    }
    // sword
    g.strokeStyle = proof ? '#e8edf8' : '#5d618c'; g.lineWidth = proof ? 7 : 6; g.lineCap = 'round';
    g.beginPath(); g.moveTo(sh.x, sh.y); g.lineTo(tip.x, tip.y); g.stroke(); g.lineCap = 'butt';
    if (proof) { g.strokeStyle = '#9a5a06'; g.lineWidth = 9; g.beginPath(); g.moveTo(sh.x - Math.cos(ang) * 6, sh.y - Math.sin(ang) * 6); g.lineTo(sh.x + Math.cos(ang) * 14, sh.y + Math.sin(ang) * 14); g.stroke(); }
    // dummy: flash and knock-back from stage 2
    const kb = stage < 2 ? 0 : !tuned ? 6 : heavy ? (maxed ? 40 : 24) : (maxed ? 16 : 8);
    const push = S.last >= 0 && stage >= 2 ? kb * (S.since < .05 ? S.since / .05 : Math.exp(-(S.since - .05) * 7)) : 0;
    const wob = S.stopping && stage >= 4 ? Math.sin(S.stopFor * 70) * (maxed ? 6 : 3) : 0;
    const flash = stage >= 2 && S.last >= 0 && (S.stopping || S.since < (heavy ? .12 : .06));
    const dx = 500 + push + wob;
    if (proof) {
      g.fillStyle = '#6b4a2a'; g.fillRect(dx + 26, fl - 60, 8, 60);
      g.fillStyle = flash ? '#fff' : '#c9a24e'; g.beginPath(); g.roundRect(dx + 4, fl - 128, 52, 74, 18); g.fill();
      g.beginPath(); g.arc(dx + 30, fl - 142, 18, 0, TAU); g.fill();
      if (!flash) { g.strokeStyle = '#8a6a2a'; g.lineWidth = 2; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(dx + 10, fl - 116 + i * 16); g.lineTo(dx + 50, fl - 112 + i * 16); g.stroke(); } }
    } else {
      g.fillStyle = flash ? '#fff' : '#b9a98a'; g.fillRect(dx, fl - 130, 60, 130);
      g.strokeStyle = C.navy; g.lineWidth = 2; g.strokeRect(dx, fl - 130, 60, 130);
    }
    // stage 1: debug outlines are the only feedback
    if (stage === 1) {
      g.setLineDash([6, 5]); g.lineWidth = 2;
      g.strokeStyle = '#2ea3dc'; g.strokeRect(dx - 4, fl - 134, 68, 138);
      if (S.s.ph === 'strike' || S.s.ph === 'stop') { g.strokeStyle = C.red; g.strokeRect(tip.x - 18, tip.y - 18, 36, 36); }
      g.setLineDash([]);
      if (S.last >= 0 && S.since < .25) { g.font = '600 13px ui-monospace, monospace'; g.fillStyle = C.red; g.textAlign = 'left'; g.fillText(`hit_registered = true  (#${S.last + 1})`, 600, 170); }
    }
    // stage 3: the heavy hit gets a ring
    if (stage === 3 && heavy && S.since < .25) { g.strokeStyle = `rgba(255,185,81,${1 - S.since / .25})`; g.lineWidth = 4; g.beginPath(); g.arc(dx + 10, 300, 20 + S.since * 200, 0, TAU); g.stroke(); }
    // stages 4-5: sparks, rings, dust and damage numbers
    if (stage >= 4 && S.last >= 0 && S.since < .6) {
      const n = maxed ? 34 : 12, sp = maxed ? 520 : 300, age = S.since;
      for (let i = 0; i < n; i++) {
        const a = -1.6 + hash(i + S.last * 50) * 2.6 - .4, v = sp * (.4 + hash(i * 3 + S.last) * .8), x = dx + 4 + Math.cos(a) * v * age, y = 300 + Math.sin(a) * v * age + 500 * age * age;
        g.fillStyle = `rgba(255,${150 + (i % 3) * 35},40,${1 - age / .6})`; g.fillRect(x - 4, y - 4, maxed ? 9 : 6, maxed ? 9 : 6);
      }
      const rr = maxed ? 3 : 1;
      for (let r = 0; r < rr; r++) { const a2 = age - r * .05; if (a2 > 0 && a2 < .35) { g.strokeStyle = `rgba(255,255,255,${1 - a2 / .35})`; g.lineWidth = maxed ? 6 : 3; g.beginPath(); g.arc(dx + 6, 300, 16 + a2 * (maxed ? 420 : 200), 0, TAU); g.stroke(); } }
      if (maxed) for (let i = 0; i < 6; i++) { const a3 = age; g.fillStyle = `rgba(235,225,200,${.45 * (1 - a3 / .6)})`; g.beginPath(); g.arc(dx + 30 + (i - 2.5) * 22 + (i - 2.5) * a3 * 80, fl - 6 - a3 * 30, 10 + a3 * 40, 0, TAU); g.fill(); }
      const dmg = [12, 14, 38][S.last], yy = 200 - age * 90, sz = maxed ? (heavy ? 56 : 40) : (heavy ? 30 : 22);
      g.globalAlpha = 1 - age / .6; g.font = `800 ${sz}px Montserrat, Jost, sans-serif`; g.textAlign = 'center';
      g.lineWidth = 6; g.strokeStyle = C.navy; g.strokeText(dmg, dx + 40, yy); g.fillStyle = maxed ? '#ffdf4a' : '#fff'; g.fillText(dmg, dx + 40, yy); g.globalAlpha = 1;
    }
    g.restore();
    // HUD over the scene: a timeline of the loop, and the effect bill
    const tx = 20, ty = 18, tw = 640;
    g.fillStyle = 'rgba(255,252,244,.9)'; g.beginPath(); g.roundRect(tx - 8, ty - 8, tw + 16, 54, 8); g.fill();
    const colors = { idle: '#e0d8c6', wind: '#e0a92d', strike: '#e5322d', stop: '#152044', rec: '#8ea2e6' };
    TL.segs.forEach(s => { g.fillStyle = colors[s.ph]; g.fillRect(tx + s.a / TL.len * tw, ty, Math.max(1, (s.b - s.a) / TL.len * tw), 14); });
    g.fillStyle = C.navy; g.fillRect(tx + S.t / TL.len * tw - 1.5, ty - 4, 3, 22);
    const stopTot = TL.imp.reduce((a, m) => a + m.stop, 0);
    g.font = '600 12.5px Jost, sans-serif'; g.textAlign = 'left'; g.fillStyle = C.ink;
    g.fillText(`3-hit combo loop: ${TL.len.toFixed(2)} s   ·   hit stop: ${Math.round(stopTot / TL.len * 100)}% of it`, tx, ty + 34);
    [['wind-up', 'wind'], ['strike', 'strike'], ['hit stop', 'stop'], ['recovery', 'rec']].forEach(([n, c], i) => { const lx = tx + 400 + i * 62; g.fillStyle = colors[c]; g.fillRect(lx, ty + 25, 10, 10); g.fillStyle = C.muted; g.font = '600 11px Jost, sans-serif'; g.fillText(n, lx + 13, ty + 34); });
    if (stage >= 4) {
      const bx = 760, by = 18, bill = maxed ? 1 : .38;
      g.fillStyle = 'rgba(255,252,244,.9)'; g.beginPath(); g.roundRect(bx - 8, by - 8, 270, 54, 8); g.fill();
      g.fillStyle = C.ink; g.font = '700 13px Jost, sans-serif'; g.fillText(maxed ? 'Visual effect bill: the ceiling' : 'Visual effect bill: tuned', bx, by + 8);
      g.fillStyle = '#e0d8c6'; g.fillRect(bx, by + 18, 250, 12); g.fillStyle = maxed ? C.red : '#2fae63'; g.fillRect(bx, by + 18, 250 * bill, 12);
    }
    if (hsF >= 24) label(g, 'A rollercoaster that brakes every 10 feet', W / 2, 110, C.red, 18, 'center');
    g.restore();
  }

  /* ============ 2. first-person shooter: seven separable layers ============ */
  const FP = [
    { name: 'Basic blockout', cost: '$ · hours', adds: 'Grey boxes, a crosshair dot and shots that land.' },
    { name: 'Improved movement', cost: '$ · a day', adds: 'Eased turns and a gentle bob, to reduce nausea.' },
    { name: 'Improved shot feedback', cost: '$ · a day', adds: 'The gun kicks back and the view climbs, then settles.' },
    { name: 'Enemy impact', cost: '$$ · days', adds: 'The enemy flashes, sparks fly and a hit sound plays.' },
    { name: 'Charge attack feedback', cost: '$$ · days', adds: 'Hold to charge: the view narrows, then widens on release.' },
    { name: 'Essential UI', cost: '$$ · days', adds: 'Health, ammo, a charge meter and a hit marker.' },
    { name: 'Diegetic UI', cost: '$$$ · weeks', adds: 'The UI moves onto the helmet visor, inside the world.' },
  ];
  const FP_NOTE = [
    '<b>Basic blockout.</b> Grey boxes and shots that land. Everything else on this slide is separable: turn layers on in any order.',
    '<b>Improved movement.</b> Without it the view snaps in steps and the bob jolts. Smoothing is cheap and it is the layer that reduces nausea.',
    '<b>Improved shot feedback: recoil.</b> The gun kicks back and the view climbs, then settles. Each shot now has a weight of its own.',
    '<b>Enemy impact: flash, hit VFX and sound.</b> The target answers: it flashes, sparks fly, a sound confirms it. The shot now reads as a hit.',
    '<b>Charge attack feedback: a unique visual and an FOV change.</b> Holding narrows the view to build tension; the release widens it in a burst.',
    '<b>Essential UI.</b> Health, ammo, a charge meter and a hit marker: the information a player needs, in the corners.',
    '<b>Diegetic UI: the visor.</b> The same information moves onto the helmet’s visor, so it sits inside the fiction. It costs the most of the seven.',
  ];
  const FPS_LEN = 5;
  const FPS_SHOTS = [1.4, 1.9];
  function fpsYaw(t, smooth) {
    const tgt = t < 1.1 ? lerp(-.5, 0, (smooth ? eIO : v => v)(clamp(t / 1.1))) : t > 4.35 ? lerp(0, -.5, (smooth ? eIO : v => v)(clamp((t - 4.35) / .65))) : 0;
    return smooth ? tgt : Math.round(tgt / .1) * .1;   // raw input snaps in coarse steps
  }
  function proj(cam, p) {
    const dx = p[0] - cam.x, dy = p[1] - cam.y, dz = p[2] - cam.z, cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw);
    const x = dx * cy - dz * sy, z0 = dx * sy + dz * cy, cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    const y = dy * cp - z0 * sp, z = dy * sp + z0 * cp;
    return { x: W / 2 + x * cam.f / z, y: cam.hy - y * cam.f / z, z };
  }
  function seg3(g, cam, a, b) {
    let A = proj(cam, a), B = proj(cam, b);
    if (A.z < .2 && B.z < .2) return;
    if (A.z < .2 || B.z < .2) { const k = (.2 - A.z) / (B.z - A.z), m = [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)]; if (A.z < .2) A = proj(cam, m); else B = proj(cam, m); }
    g.moveTo(A.x, A.y); g.lineTo(B.x, B.y);
  }
  function box3(g, cam, x, y, z, w, h, d, col, edge = '#4c5574') {
    const P = [[x, y, z], [x + w, y, z], [x + w, y + h, z], [x, y + h, z], [x, y, z + d], [x + w, y, z + d], [x + w, y + h, z + d], [x, y + h, z + d]].map(p => proj(cam, p));
    if (P.some(p => p.z < .2)) return;
    const F = [[0, 1, 2, 3, 1], [5, 4, 7, 6, .7], [4, 0, 3, 7, .82], [1, 5, 6, 2, .82], [3, 2, 6, 7, 1.15]];
    F.forEach(f => {
      const a = P[f[0]], b = P[f[1]], c = P[f[2]];
      if ((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x) >= 0) return;
      g.beginPath(); g.moveTo(a.x, a.y); [1, 2, 3].forEach(i => g.lineTo(P[f[i]].x, P[f[i]].y)); g.closePath();
      g.fillStyle = shade(col, f[4]); g.fill(); g.strokeStyle = edge; g.lineWidth = 1.5; g.stroke();
    });
  }
  const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16), r = n >> 16, gg = n >> 8 & 255, b = n & 255; return `rgb(${clamp(r * k, 0, 255) | 0},${clamp(gg * k, 0, 255) | 0},${clamp(b * k, 0, 255) | 0})`; };
  function drawFps(g, on, t) {
    t = ((t % FPS_LEN) + FPS_LEN) % FPS_LEN;
    const [, smooth, recoil, fx, charge, ui, visor] = on;
    const shots = FPS_SHOTS.map(s => ({ t: s, big: false })).concat([{ t: 3.5, big: !!charge }]);
    const chP = charge ? clamp((t - 2.4) / 1.1) * (t < 3.5 ? 1 : 0) : 0;
    let kickA = 0; if (recoil) shots.forEach(s => { kickA += kick(t - s.t, .03, 8) * (s.big ? 2.2 : 1); });
    const walk = t < 1.1 ? t / 1.1 : t > 4.35 ? 1 - (t - 4.35) / .65 : 1, moving = t < 1.1 || t > 4.35;
    const bob = moving ? (smooth ? .03 * Math.sin(t * 10) : .1 * Math.abs(Math.sin(t * 7))) : 0;
    let fov = 78; if (charge) { fov -= 14 * eIO(chP); if (t >= 3.5) fov += 14 * kick(t - 3.5, .06, 4); }
    const cam = { x: 0, y: 1.6 + bob, z: -1 + walk * 1.5, yaw: fpsYaw(t, smooth), pitch: kickA * .06, hy: SH / 2 + 10, f: (W / 2) / Math.tan(fov * Math.PI / 360) };
    bg(g, '#c6cbd8', '#c6cbd8');
    g.save(); g.beginPath(); g.rect(0, 0, W, SH); g.clip();
    // sky / ceiling and floor
    const hz = proj(cam, [cam.x + Math.sin(cam.yaw) * 1000, 1.6, cam.z + Math.cos(cam.yaw) * 1000]).y;
    g.fillStyle = '#b3b9c9'; g.fillRect(0, 0, W, hz); g.fillStyle = '#d9cfb9'; g.fillRect(0, hz, W, SH - hz);
    g.strokeStyle = 'rgba(120,110,90,.5)'; g.lineWidth = 1; g.beginPath();
    for (let z = 0; z <= 40; z += 2) seg3(g, cam, [-12, 0, z], [12, 0, z]);
    for (let x = -12; x <= 12; x += 2) seg3(g, cam, [x, 0, -2], [x, 0, 40]);
    g.stroke();
    // world boxes, far to near
    const enemyAlive = t < 3.53, ex = .2 + Math.sin(t * 1.3) * .6;
    let hits = shots.filter(s => t >= s.t + .03).length;
    const lastHit = shots.reduce((a, s) => t >= s.t + .03 ? s : a, null), sinceHit = lastHit ? t - lastHit.t - .03 : 9;
    const B = [
      [-12, 0, 2, 1.5, 4, 38, '#9aa0b8'], [10.5, 0, 2, 1.5, 4, 38, '#9aa0b8'], [-12, 0, 40, 24, 4, 1, '#a6abc0'],
      [-5, 0, 6, 1.6, 1.6, 1.6, '#b9a98a'], [-4.2, 1.6, 6.4, 1, 1, 1, '#c8b998'], [3.5, 0, 9, 1.8, 1.4, 1.8, '#b9a98a'],
      [-2.5, 0, 15, 2, 2.4, 1, '#8b8fa8'], [4, 0, 17, 1.2, 3, 1.2, '#8b8fa8'],
    ];
    const items = B.map(b => ({ d: Math.hypot(b[0] + b[3] / 2 - cam.x, b[2] + b[5] / 2 - cam.z), draw: () => box3(g, cam, ...b) }));
    const eflash = fx && lastHit && sinceHit < .08;
    if (enemyAlive) items.push({ d: Math.hypot(ex - cam.x, 12 - cam.z), draw: () => { box3(g, cam, ex - .6, 0, 11.5, 1.2, 2.2, 1, eflash ? '#ffffff' : '#c95a50', eflash ? '#fff' : '#7a2a22'); const e = proj(cam, [ex, 1.75, 11.45]); g.fillStyle = eflash ? '#fff' : '#ffd84a'; g.fillRect(e.x - 14, e.y - 3, 28, 6); } });
    items.sort((a, b) => b.d - a.d).forEach(i => i.draw());
    const ep = proj(cam, [ex, 1.2, 11.5]);
    // death: a burst with layer 4, a plain pop without
    if (!enemyAlive && t < 4.3) {
      const age = t - 3.53;
      if (fx) { for (let i = 0; i < 26; i++) { const a = hash(i) * TAU, v = (60 + hash(i + 9) * 260) * age; g.fillStyle = `rgba(${i % 2 ? '201,90,80' : '255,216,74'},${clamp(1 - age / .7)})`; g.fillRect(ep.x + Math.cos(a) * v - 5, ep.y + Math.sin(a) * v + 200 * age * age - 5, 10, 10); } }
    }
    // shot tracers and impacts
    const muzzle = { x: 760 - kickA * 8, y: 352 + kickA * 14 };
    shots.forEach(s => { const d = t - s.t; if (d >= 0 && d < .09) { g.strokeStyle = s.big ? 'rgba(120,220,255,.9)' : 'rgba(255,220,120,.9)'; g.lineWidth = s.big ? 10 : 3; g.beginPath(); g.moveTo(muzzle.x, muzzle.y); g.lineTo(ep.x, ep.y); g.stroke(); } });
    if (fx && lastHit && sinceHit < .3) {
      for (let i = 0; i < 14; i++) { const a = hash(i + hits * 20) * TAU, v = (80 + hash(i + 5) * 200) * sinceHit; g.fillStyle = `rgba(255,230,140,${1 - sinceHit / .3})`; g.fillRect(ep.x + Math.cos(a) * v - 2, ep.y + Math.sin(a) * v - 2, 5, 5); }
      sound(g, ep.x + 50, ep.y - 70, 1 - sinceHit / .45, lastHit.big ? 'boom' : 'thunk');
    }
    // gun: a grey box, with recoil and a muzzle flash
    const gb = { x: 700 + kickA * 10 + bob * 120, y: 360 + kickA * 26 + bob * 200 };
    if (charge && chP > 0) { const r = 8 + chP * 26; const rg = g.createRadialGradient(muzzle.x, muzzle.y, 2, muzzle.x, muzzle.y, r); rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(1, 'rgba(120,220,255,0)'); g.fillStyle = rg; g.beginPath(); g.arc(muzzle.x, muzzle.y, r, 0, TAU); g.fill(); }
    g.fillStyle = '#6c7190'; g.beginPath(); g.moveTo(gb.x, gb.y); g.lineTo(gb.x + 70, gb.y - 14); g.lineTo(gb.x + 200, gb.y + 70); g.lineTo(gb.x + 200, SH + 20); g.lineTo(gb.x + 40, SH + 20); g.closePath(); g.fill();
    g.fillStyle = '#8b8fa8'; g.beginPath(); g.moveTo(gb.x, gb.y); g.lineTo(gb.x + 70, gb.y - 14); g.lineTo(gb.x + 86, gb.y - 4); g.lineTo(gb.x + 16, gb.y + 10); g.closePath(); g.fill();
    if (recoil) shots.forEach(s => { const d = t - s.t; if (d >= 0 && d < .06) { g.fillStyle = 'rgba(255,230,140,.95)'; g.beginPath(); g.arc(muzzle.x, muzzle.y, s.big ? 40 : 22, 0, TAU); g.fill(); } });
    // crosshair
    g.fillStyle = '#152044'; g.beginPath(); g.arc(W / 2, cam.hy, 3, 0, TAU); g.fill();
    g.restore();
    // UI: corners (layer 6), or on the visor (layer 7)
    const lag = visor ? (fpsYaw(t, true) - fpsYaw(t - .1, true)) * 300 : 0;
    const hp = 100, ammo = 24 - shots.filter(s => t >= s.t).length;
    if (visor) {
      g.save(); g.beginPath(); g.rect(0, 0, W, SH); g.clip();
      g.fillStyle = 'rgba(120,200,255,.07)'; g.fillRect(0, 0, W, SH);
      g.fillStyle = 'rgba(16,22,40,.92)'; g.beginPath(); g.rect(0, 0, W, SH); g.ellipse(W / 2, SH / 2 + 10, W * .56, SH * .62, 0, 0, TAU); g.fill('evenodd');
      g.strokeStyle = 'rgba(140,220,255,.6)'; g.lineWidth = 3; g.beginPath(); g.ellipse(W / 2, SH / 2 + 10, W * .56, SH * .62, 0, 0, TAU); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 26; g.beginPath(); g.moveTo(140, 60); g.lineTo(300, 20); g.stroke();
      g.restore();
    }
    if (ui) {
      const c = visor ? '#8fe3ff' : '#fff', ox = visor ? lag : 0;
      g.save(); g.translate(ox, 0);
      const hx = visor ? 210 : 24, hy = visor ? SH - 120 : SH - 40, ax = visor ? W - 200 : W - 24, ay = visor ? SH - 100 : SH - 26;
      if (visor) { g.save(); g.translate(hx, hy); g.rotate(.1); }
      g.fillStyle = 'rgba(21,32,68,.6)'; g.fillRect(visor ? 0 : hx, visor ? 0 : hy, 210, 18); g.fillStyle = visor ? '#8fe3ff' : '#2fae63'; g.fillRect((visor ? 0 : hx) + 3, (visor ? 0 : hy) + 3, 204 * hp / 100, 12);
      g.font = '700 13px Jost, sans-serif'; g.textAlign = 'left'; g.lineWidth = 4; g.strokeStyle = 'rgba(21,32,68,.8)'; g.strokeText('HEALTH 100', visor ? 0 : hx, (visor ? 0 : hy) - 6); g.fillStyle = c; g.fillText('HEALTH 100', visor ? 0 : hx, (visor ? 0 : hy) - 6);
      if (visor) g.restore();
      g.font = '800 34px Montserrat, Jost, sans-serif'; g.textAlign = 'right'; g.lineWidth = 5; g.strokeStyle = 'rgba(21,32,68,.7)';
      if (visor) { g.save(); g.translate(ax, ay); g.rotate(-.1); g.strokeText(ammo, 0, 0); g.fillStyle = c; g.fillText(ammo, 0, 0); g.restore(); }
      else { g.strokeText(ammo, ax, ay); g.fillStyle = c; g.fillText(ammo, ax, ay); }
      if (chP > 0) { g.strokeStyle = c; g.lineWidth = 4; g.beginPath(); g.arc(W / 2, cam.hy, 26, -Math.PI / 2, -Math.PI / 2 + chP * TAU); g.stroke(); }
      if (lastHit && sinceHit < .2) { g.strokeStyle = c; g.lineWidth = 3; [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => { g.beginPath(); g.moveTo(W / 2 + a * 8, cam.hy + b * 8); g.lineTo(W / 2 + a * 16, cam.hy + b * 16); g.stroke(); }); }
      if (enemyAlive) { g.fillStyle = 'rgba(21,32,68,.6)'; g.fillRect(ep.x - 30, ep.y - 90, 60, 7); g.fillStyle = visor ? '#8fe3ff' : C.red; g.fillRect(ep.x - 29, ep.y - 89, 58 * (1 - hits / 3), 5); }
      g.restore();
    } else if (visor) {
      g.strokeStyle = 'rgba(140,220,255,.5)'; g.lineWidth = 2; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(170 + i * 12, SH - 70); g.lineTo(170 + i * 12, SH - 80 - (i % 3) * 6); g.stroke(); }
    }
    if (!smooth && moving) label(g, 'raw input: the view snaps in steps', 24, 40, C.red, 14);
    if (charge && chP > 0) label(g, `charging · FOV ${Math.round(fov)}°`, W / 2, 60, C.ink, 14, 'center');
    g.restore();
  }

  /* ============ 3. rail shooter: seven separable layers ============ */
  const RL = [
    { name: 'Basic blockout', cost: '$ · hours', adds: 'Ship, rail, targets and straight shots.' },
    { name: '10% better polish', cost: '$ · hours', adds: 'Cheap banks and tilts get past the uncanny weirdness.' },
    { name: 'Support gameplay', cost: '$$ · days', adds: 'Two reticles show where shots go; shots bend to targets.' },
    { name: 'Mechanic confirmation', cost: '$$ · days', adds: 'Targets flash and burst, so you know each one is done.' },
    { name: 'Rich player actions', cost: '$$ · days', adds: 'A charge builds, holds, then lets go as a homing blast.' },
    { name: 'Better quality', cost: '$$ · days', adds: 'Engine flames and wingtip trails sell speed and turns.' },
    { name: 'Push the limits', cost: '$ · a day', adds: 'The view widens and a roar plays as the ship boosts.' },
  ];
  const RL_NOTE = [
    '<b>Basic blockout.</b> A ship on a rail, targets and straight shots. The ship slides like a cardboard cut-out.',
    '<b>10% better polish.</b> Cheap rotations: the ship banks into turns and tilts as it climbs, “to get past the uncanny weirdness.” Almost free, and it changes everything.',
    '<b>Support gameplay: aim indicators and assist.</b> Two reticles show the line a shot will take, and shots bend toward targets. Without it the first shot misses.',
    '<b>Mechanic confirmation: impact, pushback and death.</b> A flash, a burst of debris and a score: the player knows the target is done and can move on.',
    '<b>Rich player actions: start, hold, release.</b> Three beats: a start you can feel, a hold that builds, and a release that pays off.',
    '<b>Better quality: thrusters and trails.</b> Engine flames and wingtip trails trace every turn and sell the speed.',
    '<b>Push the limits: sprint sound and FOV.</b> During the boost the ship moves twice as fast either way. Only the wider view, the speed lines and the roar make it feel fast.',
  ];
  const RLEN = 6, ENEMY = [{ t0: .1, hit: 1.25, dx: 2.8, assist: true }, { t0: 1.2, hit: 2.25, dx: 0 }, { t0: 2.3, hit: 3.6, dx: -.6, charge: true }];
  const shipX = t => 3.2 * Math.sin(t * TAU / RLEN * 2), shipY = t => 2.4 + .5 * Math.sin(t * TAU / RLEN * 3);
  const boost = t => sstep(4.1, 4.4, t) * (1 - sstep(5.3, 5.7, t));
  const DIST = (() => { const N = 600, a = [0]; for (let i = 1; i <= N; i++) { const tt = i / N * RLEN; a.push(a[i - 1] + (14 + 18 * boost(tt)) * RLEN / N); } const k = Math.round(a[N] / 24) * 24 / a[N]; return a.map(v => v * k); })();
  const dist = t => { const u = clamp(t / RLEN) * 600, i = Math.min(599, Math.floor(u)); return lerp(DIST[i], DIST[i + 1], u - i); };
  function drawRail(g, on, t) {
    t = ((t % RLEN) + RLEN) % RLEN;
    const [, bank, aim, impact, charge, thr, sprint] = on;
    const bst = boost(t), fov = 66 + (sprint ? 30 * bst : 0), f = (W / 2) / Math.tan(fov * Math.PI / 360);
    const camX = shipX(t) * .45, camY = 4.2, hy = 150;
    const P = (x, y, z) => ({ x: W / 2 + (x - camX) * f / z, y: hy + (camY - y) * f / z, s: f / z, z });
    bg(g, '#cbd3e2', '#cbd3e2');
    g.save(); g.beginPath(); g.rect(0, 0, W, SH); g.clip();
    g.fillStyle = '#b8c1d4'; g.fillRect(0, 0, W, hy); g.fillStyle = '#d9cfb9'; g.fillRect(0, hy, W, SH - hy);
    const d = dist(t), off = d % 4;
    g.strokeStyle = 'rgba(120,110,90,.55)'; g.lineWidth = 1.2; g.beginPath();
    for (let z = 4 - off; z < 90; z += 4) { if (z < 1) continue; const a = P(-40, 0, z), b = P(40, 0, z); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); }
    for (let x = -40; x <= 40; x += 4) { const a = P(x, 0, 1), b = P(x, 0, 90); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); }
    g.stroke();
    // pillars along the rail
    const pil = [];
    for (let k = 0; k < 10; k++) { const z = ((k * 12 - d) % 120 + 120) % 120; if (z > 1.5 && z < 90) pil.push({ x: k % 2 ? 12 : -12, z }); }
    pil.sort((a, b) => b.z - a.z).forEach(p => { const a = P(p.x - 1, 6, p.z), b = P(p.x + 1, 0, p.z); g.fillStyle = shade('#8b8fa8', .8 + .4 * clamp(1 - p.z / 90)); g.fillRect(a.x, a.y, b.x - a.x, b.y - a.y); });
    // speed lines (layer 7)
    if (sprint && bst > .05) { g.strokeStyle = `rgba(255,255,255,${.6 * bst})`; g.lineWidth = 2; for (let i = 0; i < 30; i++) { const a = hash(i) * TAU, r0 = 120 + ((hash(i + 3) * 400 + t * 900) % 400); g.beginPath(); g.moveTo(W / 2 + Math.cos(a) * r0, hy + 70 + Math.sin(a) * r0 * .6); g.lineTo(W / 2 + Math.cos(a) * (r0 + 60), hy + 70 + Math.sin(a) * (r0 + 60) * .6); g.stroke(); } }
    // ship pose
    const sx = shipX(t), sy = shipY(t), vx = (shipX(t + .01) - shipX(t - .01)) / .02, vy = (shipY(t + .01) - shipY(t - .01)) / .02;
    const roll = bank ? clamp(-vx * .08, -.42, .42) : 0, pitch = bank ? clamp(vy * .15, -.25, .25) : 0, SZ = 8 - bst * (sprint ? 0 : 0);
    // enemies, their shots, their deaths
    const ePos = (E, tt) => ({ x: shipX(E.hit - .35) + E.dx, y: 3, z: 64 - (tt - E.t0) * 22 });
    const missed = E => E.assist && !aim;
    const drawn = [];
    ENEMY.forEach((E, i) => {
      if (t < E.t0) return;
      const ep = ePos(E, t), dead = t >= E.hit && !missed(E);
      if (!dead && ep.z > 2) drawn.push({ z: ep.z, f: () => { const p = P(ep.x, ep.y, ep.z), s = p.s * 1.1, fl = impact && t >= E.hit - .05 && t < E.hit && !missed(E); g.fillStyle = fl ? '#fff' : '#c95a50'; g.strokeStyle = '#7a2a22'; g.lineWidth = 2; g.beginPath(); g.moveTo(p.x, p.y - s); g.lineTo(p.x + s, p.y); g.lineTo(p.x, p.y + s * .6); g.lineTo(p.x - s, p.y); g.closePath(); g.fill(); g.stroke(); if (aim && t > E.hit - .6 && t < E.hit) { g.strokeStyle = '#ffb951'; g.lineWidth = 3; const r = s * 1.6; [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, b]) => { g.beginPath(); g.moveTo(p.x + a * r, p.y + b * r * .5); g.lineTo(p.x + a * r, p.y + b * r); g.lineTo(p.x + a * r * .5, p.y + b * r); g.stroke(); }); } } });
      // the shot
      const fire = E.charge && charge ? 3.25 : E.hit - .35;
      if (t >= fire && t < (missed(E) ? E.hit + .3 : E.hit)) {
        const k = clamp((t - fire) / (E.hit - fire)), tgt = ePos(E, E.hit), st = { x: shipX(fire), y: shipY(fire), z: 8 };
        const end = aim || E.charge && charge ? tgt : { x: st.x, y: st.y, z: tgt.z };
        const bend = aim ? Math.sin(k * Math.PI) * 1.2 : 0;
        const kk = missed(E) ? (t - fire) / (E.hit - fire) : k;
        const q = { x: lerp(st.x, end.x, kk) + bend, y: lerp(st.y, end.y, kk) + bend * .3, z: lerp(st.z, end.z, kk) };
        const big = E.charge && charge;
        if (q.z > 1) drawn.push({ z: q.z - .01, f: () => { const p = P(q.x, q.y, q.z); g.fillStyle = big ? 'rgba(130,230,255,.95)' : '#ffd84a'; g.beginPath(); g.arc(p.x, p.y, Math.max(2, p.s * (big ? .9 : .25)), 0, TAU); g.fill(); } });
      }
      if (t >= E.hit && !missed(E) && impact) {
        const age = t - E.hit, p0 = ePos(E, E.hit);
        if (age < .9) drawn.push({ z: p0.z, f: () => { const p = P(p0.x, p0.y, p0.z), big = E.charge && charge ? 1.8 : 1; if (age < .1) { g.fillStyle = 'rgba(255,240,180,.9)'; g.beginPath(); g.arc(p.x, p.y, p.s * 2.4 * big, 0, TAU); g.fill(); } for (let j = 0; j < 16; j++) { const a = hash(j + i * 30) * TAU, v = (2 + hash(j + 7) * 4) * age * big; g.fillStyle = `rgba(${j % 2 ? '201,90,80' : '255,200,90'},${clamp(1 - age / .9)})`; const q = P(p0.x + Math.cos(a) * v, p0.y + Math.sin(a) * v - age * age * 4, p0.z); g.fillRect(q.x - 4, q.y - 4, 8, 8); } g.globalAlpha = clamp(1 - age / .9); g.font = '800 22px Montserrat, Jost, sans-serif'; g.textAlign = 'center'; g.lineWidth = 5; g.strokeStyle = C.navy; g.strokeText('+100', p.x, p.y - 30 - age * 50); g.fillStyle = '#ffd84a'; g.fillText('+100', p.x, p.y - 30 - age * 50); g.globalAlpha = 1; } });
      }
    });
    drawn.sort((a, b) => b.z - a.z).forEach(o => o.f());
    // wingtip trails (layer 6): past ship poses, left behind as the ship flies on
    const tip = (tt, side) => { const r = bank ? clamp(-((shipX(tt + .01) - shipX(tt - .01)) / .02) * .08, -.42, .42) : 0; return { x: shipX(tt) + side * 1.6 * Math.cos(r), y: shipY(tt) + side * 1.6 * Math.sin(r) * -1, z: 8 - (d - dist(Math.max(0, tt))) }; };
    if (thr) [-1, 1].forEach(side => { g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 3; g.beginPath(); let first = true; for (let i = 0; i <= 12; i++) { const tt = t - i * .03; if (tt < 0) break; const q = tip(tt, side); if (q.z < 1.2) break; const p = P(q.x, q.y, q.z); if (first) { g.moveTo(p.x, p.y); first = false; } else g.lineTo(p.x, p.y); } g.stroke(); });
    // the ship
    const sp = P(sx, sy, 8), s = sp.s;
    g.save(); g.translate(sp.x, sp.y); g.rotate(roll);
    if (thr) { const fl = .7 + .3 * Math.sin(t * 60) * Math.sin(t * 23) + bst * .8; g.fillStyle = 'rgba(120,200,255,.9)'; [-.45, .45].forEach(o => { g.beginPath(); g.ellipse(o * s, .1 * s, .22 * s, .22 * s * (1 + fl), 0, 0, TAU); g.fill(); }); g.fillStyle = 'rgba(255,255,255,.9)'; [-.45, .45].forEach(o => { g.beginPath(); g.arc(o * s, .1 * s, .1 * s, 0, TAU); g.fill(); }); }
    const wy = -pitch * s * .5;
    g.fillStyle = '#8b8fa8'; g.strokeStyle = C.navy; g.lineWidth = 2;
    g.beginPath(); g.moveTo(-1.7 * s, .15 * s + wy); g.lineTo(-.4 * s, -.15 * s); g.lineTo(.4 * s, -.15 * s); g.lineTo(1.7 * s, .15 * s + wy); g.lineTo(.4 * s, .3 * s); g.lineTo(-.4 * s, .3 * s); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#6c7190'; g.beginPath(); g.roundRect(-.45 * s, -.45 * s + wy * .4, .9 * s, .8 * s, .15 * s); g.fill(); g.stroke();
    g.fillStyle = '#9fa3ba'; g.beginPath(); g.moveTo(-.08 * s, -.45 * s); g.lineTo(.08 * s, -.45 * s); g.lineTo(0, -.95 * s); g.closePath(); g.fill(); g.stroke();
    g.restore();
    // charge (layer 5): start, hold, release
    if (charge && t > 2.3 && t < 3.3) {
      const k = clamp((t - 2.3) / .5), hold = t > 2.8, pulse = hold ? .5 + .5 * Math.sin(t * 30) : 0, r = s * (1.8 + k * .8) + pulse * 6;
      g.strokeStyle = `rgba(130,230,255,${.5 + .5 * k})`; g.lineWidth = 3 + k * 4; g.beginPath(); g.arc(sp.x, sp.y, r, 0, TAU); g.stroke();
      label(g, t < 2.8 ? 'start' : t < 3.25 ? 'hold' : 'release', sp.x, sp.y - r - 12, C.ink, 13, 'center');
    }
    // aim reticles (layer 3)
    if (aim) { [[16, 1.4], [34, 1]].forEach(([z, k]) => { const p = P(sx, sy, z), r = 22 * k; g.strokeStyle = 'rgba(21,32,68,.8)'; g.lineWidth = 3; g.strokeRect(p.x - r, p.y - r, r * 2, r * 2); }); }
    if (missed(ENEMY[0]) && t > 1.0 && t < 1.9) label(g, 'missed: no aim indicator, no assist', 24, 40, C.red, 14);
    if (sprint && bst > .2) sound(g, W - 150, 50, bst, 'roar');
    if (bst > .2) label(g, sprint ? `boost · FOV ${Math.round(fov)}°` : 'boost: same speed-up, no feel', W / 2, SH - 20, C.ink, 14, 'center');
    g.restore();
  }

  /* ============ shared slide wiring ============ */
  // recordings of Andre's real builds, by layer index; a layer with no entry falls back to the rebuild
  const CLIP = 'clips/';
  // Recorded from Andre's WebGL build, number keys 1-7. Its presets are cumulative: each includes the ones before it.
  const cl = (src, k, title) => [{ src, cap: `Andre’s build · preset ${k} of 7, “${title}”` }];
  const CLIPS = {
    // the build has seven presets for the slasher; the deck groups them into five stages
    slasher: {
      0: cl('slasher-1.mp4', 1, 'no polish'),
      1: cl('slasher-3.mp4', 3, 'enemy reaction'),
      2: cl('slasher-4.mp4', 4, 'camera reaction'),
      3: [{ src: 'impact-reel-a.mp4', cap: 'Impact exploration reel · every effect turned up' }, { src: 'impact-reel-b.mp4', cap: 'Impact exploration reel · every effect turned up' }],
      4: cl('slasher-7.mp4', 7, 'dolly camera'),
    },
    fps: Object.fromEntries(['no polish', 'smooth move', 'shoot feedback', 'enemy feedback', 'charge feedback', 'simple UI', 'diegetic UI'].map((t, i) => [i, cl(`fps-${i + 1}.mp4`, i + 1, t)])),
    rail: Object.fromEntries(['no polish', 'better rotation', 'better aim', 'enemy feedback', 'charge feedback', 'better ship', 'boost feedback'].map((t, i) => [i, cl(`rail-${i + 1}.mp4`, i + 1, t)])),
  };
  const scenes = {};
  function film(s, name, st) {
    const clips = CLIPS[name] || {}, have = Object.keys(clips).map(Number);
    const btn = $(s, '.pl-film'), box = $(s, '.pl-real'), vid = $(s, '.pl-real video'), cap = $(s, '.pl-cap');
    const f = { on: false, have, cur: -1, k: 0 };
    if (!have.length) { btn.remove(); box.remove(); f.sync = () => {}; return f; }
    const play = () => {
      const list = clips[st.cur];
      box.classList.add('show'); box.classList.toggle('empty', !list);
      if (!list) { vid.pause(); cap.textContent = `No recording of stage ${st.cur + 1} yet · showing the rebuild`; return; }
      const c = list[f.k % list.length];
      if (!vid.src.endsWith(c.src)) { vid.src = CLIP + c.src; }
      vid.loop = list.length === 1; cap.textContent = c.cap;
      vid.play().catch(() => {});
    };
    vid.onended = () => { f.k++; play(); };
    f.sync = () => {
      if (!f.on) return;
      if (st.cur !== f.cur) { f.cur = st.cur; f.k = 0; play(); }
    };
    f.toggle = on => {
      f.on = on; btn.classList.toggle('on', on);
      if (!on) { vid.pause(); box.classList.remove('show'); f.cur = -1; return; }
      f.cur = -1; f.sync();
    };
    f.btn = btn;
    return f;
  }
  function slide(name, L, NOTE, opts) {
    canvasDemo(name, (s, cv, g) => {
      const n = L.length, st = { on: L.map((_, i) => i === 0), cur: 0, tour: true, held: false, t: 0, hs: 4, active: false };
      const keys = $(s, '.pl-keys'), tourBtn = $(s, '.pl-tour'), out = $(s, '.pl-out');
      keys.innerHTML = L.map((l, i) => `<button class="btn" data-i="${i}"><kbd>${i + 1}</kbd><span>${l.name}</span><b class="chip">${l.cost.split(' · ')[0]}</b></button>`).join('');
      const fl = film(s, name, st);
      const btns = $$(keys, '.btn');
      const hs = $(s, '.pl-hs'), hsv = $(s, '.pl-hsv');
      const hsText = v => v === 0 ? '0 frames: none' : v < 7 ? `${v} frames: crisp` : v < 15 ? `${v} frames: heavy` : v < 24 ? `${v} frames: starts to halt` : `${v} frames: brakes every 10 feet`;
      let lastKey = '';
      function sync() {
        btns.forEach((b, i) => b.classList.toggle('on', st.on[i]));
        fl.sync();
        if (hs) { hs.value = st.hs; hsv.textContent = hsText(st.hs); }
        const key = st.cur + '|' + (opts.cumulative ? '' : st.on.join()) + '|' + (st.hs >= 24);
        if (key !== lastKey) { lastKey = key; say(out, NOTE[st.cur] + (hs && st.hs >= 24 ? ' <b class="accent">Hit stop this long feels like “a rollercoaster that brakes every 10 feet.”</b>' : '')); }
      }
      const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); } st.held = false; };
      const press = i => {
        manual();
        // the build's presets are cumulative, so with the footage on every tab stacks its layers like the slasher
        if (opts.cumulative || fl.on) st.on = L.map((_, j) => j <= i);
        else if (i === 0) st.on = L.map((_, j) => j === 0);
        else st.on[i] = !st.on[i];
        st.cur = i; st.t = 0; sync();
      };
      btns.forEach((b, i) => b.onclick = () => press(i));
      tourBtn.onclick = () => { st.tour = true; st.held = false; st.t = 0; tourBtn.classList.add('on'); fl.on && fl.toggle(false); };
      if (fl.btn) fl.btn.onclick = () => {
        if (fl.on) return fl.toggle(false);
        // the clips run longer than a walk-through step, so the footage takes manual control, from the first recorded stage
        manual(); fl.toggle(true); press(fl.have.includes(st.cur) ? st.cur : fl.have[0]);
      };
      if (hs) hs.oninput = () => { manual(); st.hs = +hs.value; sync(); };
      addEventListener('keydown', e => {
        if (!s.classList.contains('active') || e.altKey || e.ctrlKey || e.metaKey || e.target.closest?.('input, textarea')) return;
        const i = +e.key - 1; if (e.key >= '1' && i < n) { e.preventDefault(); press(i); }
      });
      function render(t) {
        if (st.tour) { const r = opts.tour(t); st.on = r.on; st.cur = r.cur; if (r.hs != null) st.hs = r.hs; t = r.t; }
        opts.draw(g, st, t); strip(g, L, st.on, st.cur); sync();
      }
      scenes[name] = { seek(t) { st.held = true; st.tour = true; tourBtn.classList.add('on'); render(t); }, dur: () => opts.dur };
      sync();
      return dt => {
        if (st.held) return;
        st.t += Math.max(0, dt);
        if (st.tour && st.t >= opts.dur) st.t = 0;
        render(st.t);
      };
    });
  }

  // slasher walk-through: each stage for 3.6 s, then the hit stop dial turned up on the finished strike
  const SLS = 3.6;
  slide('slasher', SL, SL_NOTE, {
    cumulative: true, dur: SLS * 5 + 7,
    tour(t) {
      if (t < SLS * 5) { const k = Math.floor(t / SLS); return { on: SL.map((_, j) => j <= k), cur: k, hs: 4, t: t - k * SLS }; }
      const u = t - SLS * 5, hs = u < 3 ? 12 : 30;
      return { on: SL.map(() => true), cur: 4, hs, t: u < 3 ? u : u - 3 };
    },
    draw(g, st, t) { drawSlasher(g, st.on.lastIndexOf(true) + 1, st.hs, t); },
  });
  // separable layers: added one at a time, then two contrasting combinations
  const sepTour = (n, step, combos, len) => t => {
    const k = Math.floor(t / step);
    if (k < n) return { on: Array.from({ length: n }, (_, j) => j <= k), cur: k, t: t % len };
    const c = combos[Math.min(combos.length - 1, Math.floor((t - n * step) / 3))];
    return { on: Array.from({ length: n }, (_, j) => c.includes(j)), cur: c[c.length - 1], t: t % len };
  };
  slide('fps', FP, FP_NOTE, { dur: 2.6 * 7 + 6, tour: sepTour(7, 2.6, [[0, 3, 5], [0, 1, 2, 4, 6]], FPS_LEN), draw(g, st, t) { drawFps(g, st.on, t); } });
  slide('rail', RL, RL_NOTE, { dur: 2.6 * 7 + 6, tour: sepTour(7, 2.6, [[0, 6], [0, 1, 5, 6]], RLEN), draw(g, st, t) { drawRail(g, st.on, t); } });

  window.__seek = (t, which = 'slasher') => scenes[which].seek(t);
  window.__dur = (which = 'slasher') => scenes[which].dur();
})();
