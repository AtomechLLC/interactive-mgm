/* Lesson 4: Satisfaction ("Learning From My Past", xelnath.com, 2012), rebuilt around independent games the posts don't name.
   The lesson underneath: the response should match the size of the achievement, and the gaps between rewards are a tool too.
   1. Balatro: one scoring hand with its ceremony layers toggled (count-up, rising pitch, shake, flame, a pause).
   2. Spelunky's ghost: dissatisfaction as pacing. Move the ghost's arrival and watch 30 simulated players.
   3. A Hades-style region: difficulty and felt stress are not the same line.
   Drawings are our own. Simulated players and felt-it values are illustrative. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const { C, clamp, lerp, ease, IM, ready, rr, wrap, text } = LP;
  const W = 1040, H = 585, TAU = Math.PI * 2, F = (w, s) => `${w} ${s}px Jost, sans-serif`, M = (w, s) => `${w} ${s}px Montserrat, Jost, sans-serif`;
  const seeded = s => () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };

  /* ---------------- 1. Balatro: the ceremony dial ---------------- */
  const LAYERS = {
    count: { label: 'Count-up, card by card', w: .3 },
    pitch: { label: 'Rising pitch', w: .15 },
    shake: { label: 'Shake and wiggle', w: .2 },
    flame: { label: 'Flames when one hand beats the blind', w: .15 },
    pause: { label: 'A beat before the total', w: .1 },
  };
  const BLIND = 450;
  const HANDS = {
    high: { label: 'High Card', chips: 5, mult: 1, cards: [['K', '♠', 10, true], ['9', '♦', 9], ['6', '♣', 6], ['4', '♥', 4], ['2', '♠', 2]] },
    flush: { label: 'Flush', chips: 35, mult: 4, cards: [['K', '♥', 10, true], ['9', '♥', 9, true], ['7', '♥', 7, true], ['5', '♥', 5, true], ['2', '♥', 2, true]] },
    sflush: { label: 'Straight Flush', chips: 100, mult: 8, cards: [['9', '♥', 9, true], ['8', '♥', 8, true], ['7', '♥', 7, true], ['6', '♥', 6, true], ['5', '♥', 5, true]] },
  };
  const JOKER = 4; // the plain Joker: +4 Mult
  function handTotals(h) { const H0 = HANDS[h], chips = H0.chips + H0.cards.filter(c => c[3]).reduce((a, c) => a + c[2], 0), mult = H0.mult + JOKER; return { chips, mult, score: chips * mult }; }
  function timeline(h, L) { // when each beat happens, in seconds
    const sc = HANDS[h].cards.filter(c => c[3]).length, step = L.count ? .42 : 0, t0 = .5;
    const cardT = i => t0 + i * step, jokerT = t0 + sc * step + (L.count ? .2 : 0), pauseEnd = jokerT + (L.pause ? .8 : 0) + (L.count ? .3 : 0);
    const totalEnd = pauseEnd + (L.count ? .9 : 0); return { cardT, jokerT, pauseEnd, totalEnd, sc };
  }
  function felt(h, L) { const base = .1 + Object.entries(LAYERS).reduce((a, [k, l]) => a + (L[k] ? l.w : 0), 0), big = handTotals(h).score >= BLIND; return clamp(L.flame && !big ? base - .15 : base); }
  function card(g, x, y, c, lift, rot, dim) {
    g.save(); g.translate(x + 40, y + 56 - lift); g.rotate(rot); g.globalAlpha = dim ? .45 : 1;
    g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(-36, -50, 80, 112); // hard offset shadow
    g.fillStyle = '#1a1424'; g.fillRect(-42, -58, 84, 116); g.fillStyle = '#f4ecd8'; g.fillRect(-39, -55, 78, 110); g.fillStyle = '#d9cdb0'; g.fillRect(-39, 49, 78, 6);
    const red = c[1] === '♥' || c[1] === '♦', col = red ? '#d8402f' : '#26304a';
    text(g, c[0], -30, -30, M(800, 22), col); text(g, c[1], -30, -8, F(700, 20), col); text(g, c[1], 0, 28, F(700, 46), col, 'center');
    g.restore(); g.globalAlpha = 1;
  }
  function flame(g, x, y, w, t) {
    for (let i = 0; i < 18; i++) { const fx = x + (i + .5) * w / 18, hh = 22 + 12 * Math.sin(t * 9 + i * 1.7) + 7 * Math.sin(t * 13 + i); const gr = g.createLinearGradient(fx, y, fx, y - hh); gr.addColorStop(0, 'rgba(255,90,20,.9)'); gr.addColorStop(1, 'rgba(255,220,80,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(fx - w / 30, y); g.quadraticCurveTo(fx, y - hh * 1.4, fx + w / 30, y); g.fill(); }
  }
  function ceremonyScene(g, h, L, t, T) {
    const H0 = HANDS[h], tot = handTotals(h), tl = timeline(h, L), big = tot.score >= BLIND;
    // running chips and mult
    let chips = H0.chips, mult = H0.mult, idx = 0;
    H0.cards.forEach(c => { if (c[3]) { if (t >= tl.cardT(idx)) chips += c[2]; idx++; } });
    if (t >= tl.jokerT) mult += JOKER;
    const showTotal = t >= tl.pauseEnd, kTot = L.count ? clamp((t - tl.pauseEnd) / Math.max(.01, tl.totalEnd - tl.pauseEnd)) : 1;
    const shown = showTotal ? Math.round(tot.score * ease(kTot)) : 0, done = t >= tl.totalEnd;
    let sx = 0, sy = 0; if (L.shake && showTotal && t - tl.pauseEnd < .35) { const a = 9 * (1 - (t - tl.pauseEnd) / .35); sx = Math.sin(t * 90) * a; sy = Math.cos(t * 77) * a; }
    g.clearRect(0, 0, W, H); g.save(); g.translate(sx, sy);
    g.fillStyle = '#1f4a3c'; rr(g, 10, 10, W - 20, H - 20, 14); g.fill(); g.save(); rr(g, 10, 10, W - 20, H - 20, 14); g.clip(); g.fillStyle = 'rgba(255,255,255,.04)'; for (let yy = 0; yy < H; yy += 40) for (let xx = (yy / 40) % 2 ? 20 : 0; xx < W; xx += 40) { g.beginPath(); g.moveTo(xx, yy + 10); g.lineTo(xx + 10, yy); g.lineTo(xx + 20, yy + 10); g.lineTo(xx + 10, yy + 20); g.fill(); } g.restore();
    g.fillStyle = 'rgba(0,0,0,.18)'; rr(g, 26, 26, 250, 456, 12); g.fill();
    text(g, 'BIG BLIND', 46, 62, M(800, 15), '#ffb951'); text(g, 'Score at least', 46, 90, F(500, 15), '#cfe3da'); text(g, String(BLIND), 46, 124, M(800, 30), '#ff7a5c');
    text(g, 'THIS HAND', 46, 176, M(800, 15), '#ffb951'); text(g, H0.label, 46, 204, M(800, 22), '#fff');
    // chips x mult
    g.fillStyle = '#0d2a52'; g.fillRect(46, 230, 96, 54); g.fillStyle = '#2e7fd6'; g.fillRect(46, 226, 96, 52); g.fillStyle = '#5a9fe6'; g.fillRect(46, 226, 96, 4); g.fillStyle = '#5a1410'; g.fillRect(160, 230, 96, 54); g.fillStyle = '#d8402f'; g.fillRect(160, 226, 96, 52); g.fillStyle = '#f06a58'; g.fillRect(160, 226, 96, 4);
    text(g, String(chips), 94, 262, M(800, 26), '#fff', 'center'); text(g, String(mult), 208, 262, M(800, 26), '#fff', 'center'); text(g, '×', 151, 262, M(800, 22), '#fff', 'center');
    text(g, 'chips', 94, 298, F(600, 13), '#cfe3da', 'center'); text(g, 'mult', 208, 298, F(600, 13), '#cfe3da', 'center');
    // round score box with optional flame
    text(g, 'HAND SCORE', 46, 332, M(800, 15), '#ffb951');
    if (L.flame && big && showTotal) flame(g, 46, 372, 210, T);
    g.fillStyle = 'rgba(0,0,0,.35)'; rr(g, 46, 372, 210, 64, 10); g.fill();
    const sc = 1 + (L.shake && showTotal && !done ? .08 * Math.sin(t * 30) : 0);
    g.save(); g.translate(151, 416); g.scale(sc, sc); text(g, showTotal ? shown.toLocaleString('en-US') : '…', 0, 0, M(800, 34), showTotal && big ? '#ffe08a' : '#fff', 'center'); g.restore();
    if (done) text(g, big ? 'Blind beaten in one hand' : `Short of ${BLIND} by ${BLIND - tot.score}`, 151, 464, F(600, 15), big ? '#7ee2a0' : '#ffb3a6', 'center');
    // the joker
    const jx = 330, jy = 60, jOn = t >= tl.jokerT, jl = L.shake && jOn && t - tl.jokerT < .3 ? Math.sin((t - tl.jokerT) * 40) * .12 : 0;
    g.save(); g.translate(jx + 40, jy + 56); g.rotate(jl); g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(-36, -50, 80, 112); g.fillStyle = '#1a1424'; g.fillRect(-42, -58, 84, 116); g.fillStyle = '#5b3a8c'; g.fillRect(-39, -55, 78, 110); g.fillStyle = '#7a52b0'; g.fillRect(-39, -55, 78, 6); g.strokeStyle = '#c9a0ff'; g.lineWidth = 2; g.strokeRect(-33, -49, 66, 98);
    text(g, 'Joker', 0, -20, M(800, 15), '#fff', 'center'); text(g, '+4 Mult', 0, 20, F(600, 14), '#ffd2d2', 'center'); g.restore();
    if (jOn && L.count && t - tl.jokerT < .9) text(g, '+4 Mult', jx + 40, jy - 4 - (t - tl.jokerT) * 30, M(800, 18), '#ff8a7a', 'center');
    text(g, 'Joker slot', jx, jy + 136, F(500, 13), '#cfe3da');
    // played cards
    let si = 0;
    H0.cards.forEach((c, i) => {
      const x = 330 + i * 120, y = 270, scoring = c[3], ti = scoring ? tl.cardT(si) : 99, hit = scoring && t >= ti, k = t - ti;
      const lift = hit && L.count ? 26 * Math.max(0, 1 - k / .4) + 10 : hit ? 10 : 0, rot = L.shake && hit && k < .3 ? Math.sin(k * 50) * .1 : 0;
      card(g, x, y, c, lift, rot, !scoring);
      if (hit && L.count && k < .9) text(g, `+${c[2]}`, x + 40, y - 16 - k * 34, M(800, 20), '#8fd0ff', 'center');
      if (scoring) si++;
    });
    text(g, H0.cards.some(c => !c[3]) ? 'Faded cards do not score in a High Card hand.' : 'Every card scores.', 330, 430, F(500, 14), '#cfe3da');
    g.restore();
    g.save(); rr(g, 10, 10, W - 20, H - 20, 14); g.clip(); g.fillStyle = 'rgba(0,0,0,.10)'; for (let yy = 12; yy < H; yy += 4) g.fillRect(10, yy, W - 20, 2); const vg = g.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, 620); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.35)'); g.fillStyle = vg; g.fillRect(0, 0, W, H); g.restore();
    // felt-it meter, outside the shake
    const v = felt(h, L), secs = tl.totalEnd;
    g.fillStyle = 'rgba(255,252,244,.94)'; rr(g, 700, 34, 316, 96, 10); g.fill();
    text(g, 'Felt it (illustrative)', 716, 60, M(700, 15), C.ink);
    g.fillStyle = '#ece3cf'; rr(g, 716, 72, 284, 14, 7); g.fill(); g.fillStyle = v > .7 ? C.green : v > .4 ? C.goldInk : C.red; rr(g, 716, 72, 284 * v, 14, 7); g.fill();
    text(g, `Ceremony: ${secs.toFixed(1)} s for the same ${tot.score.toLocaleString('en-US')} points`, 716, 112, F(500, 14), C.muted);
    // layers legend at the bottom
    let lx = 46; Object.entries(LAYERS).forEach(([k, l]) => { const x = lx, y = 534, lab = l.label.replace(' when one hand beats the blind', ''); g.font = F(600, 14); lx += g.measureText(lab).width + 52; g.fillStyle = L[k] ? '#ffb951' : 'rgba(255,255,255,.15)'; rr(g, x, y - 14, 16, 16, 4); g.fill(); text(g, lab, x + 24, y, F(600, 14), L[k] ? '#fff' : '#8fb3a4'); });
  }
  let actx = null;
  function blip(n, big) { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); const o = actx.createOscillator(), gn = actx.createGain(); o.type = 'triangle'; o.frequency.value = 330 * Math.pow(2, n / 12); gn.gain.setValueAtTime(.0001, actx.currentTime); gn.gain.exponentialRampToValueAtTime(big ? .22 : .12, actx.currentTime + .01); gn.gain.exponentialRampToValueAtTime(.0001, actx.currentTime + (big ? .6 : .18)); o.connect(gn).connect(actx.destination); o.start(); o.stop(actx.currentTime + .7); } catch (e) { /* no audio */ } }
  canvasDemo('ceremony', (sl, cv, g) => {
    const lBox = $(sl, '.ce-layers'), hSeg = $(sl, '.ce-hand'), out = $(sl, '.ce-out'), tourBtn = $(sl, '.ce-tour');
    lBox.innerHTML = Object.entries(LAYERS).map(([k, l]) => `<label class="chk"><input type="checkbox" data-l="${k}"> ${l.label}</label>`).join('');
    hSeg.innerHTML = Object.entries(HANDS).map(([k, h]) => `<button class="btn" data-h="${k}">${h.label}</button>`).join('');
    const ALL = Object.fromEntries(Object.keys(LAYERS).map(k => [k, true])), NONE = Object.fromEntries(Object.keys(LAYERS).map(k => [k, false]));
    const STAGES = [
      ['flush', NONE, 'Balatro with the ceremony stripped out. A Flush plus a Joker: 68 chips × 8 mult, and the 544 appears at once. You won, and it barely registers.'],
      ['flush', { ...NONE, count: true }, 'Add the count-up. Each card lifts and adds its chips, so you watch the score being built instead of reading it.'],
      ['flush', { ...NONE, count: true, pitch: true, shake: true }, 'Add rising pitch and a shake. Each card sounds higher than the last, and the total lands with a thump. Press Play hand to hear it.'],
      ['flush', ALL, 'Add the pause and the flames. The flames only light when one hand beats the whole blind, so the biggest moment gets the biggest show.'],
      ['high', ALL, 'Same layers on a High Card that falls short: a short count, no flames. The ceremony scales with the achievement, which is the post’s point.'],
      ['sflush', ALL, 'A Straight Flush: 1,620 against a 450 blind. More cards, more steps up the scale, and the same flames held longer.'],
    ];
    const LEN = 5.5, DUR = STAGES.length * LEN;
    const st = { tour: true, held: false, t: 0, stage: -1, hand: 'flush', L: { ...NONE }, pt: 0, T: 0, sound: false, beats: new Set() };
    const manual = () => { st.tour = false; tourBtn.classList.remove('on'); };
    const replay = sound => { st.pt = 0; st.sound = sound; st.beats = new Set(); };
    $$(lBox, 'input').forEach(i => i.onchange = () => { manual(); st.L = { ...st.L, [i.dataset.l]: i.checked }; replay(false); say(out, `${i.checked ? 'Added' : 'Removed'}: ${LAYERS[i.dataset.l].label.toLowerCase()}. Felt it: ${Math.round(felt(st.hand, st.L) * 100)}%.`); });
    $$(hSeg, '.btn').forEach(b => b.onclick = () => { manual(); st.hand = b.dataset.h; replay(false); const s = handTotals(st.hand); say(out, `${HANDS[st.hand].label}: ${s.chips} chips × ${s.mult} mult = ${s.score.toLocaleString('en-US')} against a ${BLIND} blind.`); });
    $(sl, '.ce-play').onclick = () => { manual(); replay(true); };
    $(sl, '.ce-all').onclick = () => { manual(); st.L = { ...ALL }; replay(false); };
    $(sl, '.ce-none').onclick = () => { manual(); st.L = { ...NONE }; replay(false); };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; st.stage = -1; tourBtn.classList.add('on'); };
    function sounds() { // only on a manual play
      if (!st.sound || !st.L.pitch) return; const tl = timeline(st.hand, st.L);
      for (let i = 0; i < tl.sc; i++) if (st.pt >= tl.cardT(i) && !st.beats.has(i)) { st.beats.add(i); blip(i * 2, false); }
      if (st.pt >= tl.jokerT && !st.beats.has('j')) { st.beats.add('j'); blip(tl.sc * 2 + 1, false); }
      if (st.pt >= tl.pauseEnd && !st.beats.has('t')) { st.beats.add('t'); blip(handTotals(st.hand).score >= BLIND ? 19 : 7, true); }
    }
    function frame() {
      if (st.tour) { const k = Math.floor((st.t % DUR) / LEN), u = (st.t % DUR) - k * LEN; if (k !== st.stage) { st.stage = k; const s = STAGES[k]; st.hand = s[0]; st.L = { ...s[1] }; say(out, s[2]); } st.pt = u; }
      sounds(); ceremonyScene(g, st.hand, st.L, st.pt, st.T);
      $$(lBox, 'input').forEach(i => { i.checked = !!st.L[i.dataset.l]; });
      $$(hSeg, '.btn').forEach(b => b.classList.toggle('on', b.dataset.h === st.hand));
    }
    LP.runners.ceremony = { seek(t) { st.held = true; st.tour = true; st.t = t; st.T = t; st.stage = -1; frame(); }, dur: () => DUR };
    return dt => { if (st.held) return; dt = Math.max(0, Math.min(dt, .1)); st.T += dt; if (st.tour) st.t = (st.t + dt) % DUR; else st.pt = Math.min(st.pt + dt, 8); frame(); };
  });

  /* ---------------- 2. Spelunky's ghost: dissatisfaction as pacing ---------------- */
  const NP = 30, MAXT = 480;
  const PLAYERS = (() => { const r = seeded(4242); return Array.from({ length: NP }, () => ({ natural: 50 + Math.pow(r(), 1.8) * 400, run: 12 + r() * 40 })); })();
  const goldAt = t => Math.round(9000 * (1 - Math.exp(-t / 140)));
  function ghostSim(T, mode) {
    return PLAYERS.map(p => {
      if (mode === 'off' || p.natural <= T) { const b = mode === 'bonus' && p.natural <= T; return { time: p.natural, gold: goldAt(p.natural) + (b ? 1500 : 0), caught: false, hurried: false, bonus: b }; }
      if (mode === 'bonus') { const hurry = p.natural - T < 90; return hurry ? { time: T, gold: goldAt(T) + 1500, caught: false, hurried: true, bonus: true } : { time: p.natural, gold: goldAt(p.natural), caught: false, hurried: false }; }
      const rem = p.run * (1 - T / p.natural) * 1.3, chase = 30, caught = rem > chase; return { time: T + Math.min(rem, chase), gold: caught ? 0 : goldAt(T), caught, hurried: true };
    });
  }
  function ghostStats(res) {
    const ts = res.map(r => r.time).sort((a, b) => a - b), med = ts[Math.floor(NP / 2)], caught = res.filter(r => r.caught).length;
    const gpm = res.reduce((a, r) => a + r.gold, 0) / res.reduce((a, r) => a + r.time, 0) * 60, long = res.filter(r => r.time > 300).length;
    return { med, caught, gpm, long };
  }
  const mmss = s => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
  function ghostScene(g, T, mode, reveal) {
    g.clearRect(0, 0, W, H); g.fillStyle = '#2a2118'; rr(g, 10, 10, W - 20, H - 20, 14); g.fill();
    const X0 = 70, X1 = 690, Y0 = 70, RH = 13, x = s => X0 + (X1 - X0) * s / MAXT;
    text(g, 'ONE LEVEL, 30 SIMULATED PLAYERS', 40, 46, M(800, 15), '#e8c99a');
    for (let s = 0; s <= MAXT; s += 60) { g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x(s), Y0 - 6); g.lineTo(x(s), Y0 + NP * RH + 4); g.stroke(); text(g, `${s / 60} min`, x(s), Y0 + NP * RH + 24, F(500, 13), '#b9a888', 'center'); }
    const res = ghostSim(T, mode), shown = Math.round(NP * reveal);
    if (mode !== 'off') {
      const gx = x(T); g.fillStyle = mode === 'ghost' ? 'rgba(170,200,255,.12)' : 'rgba(255,200,80,.12)'; g.fillRect(gx, Y0 - 6, X1 - gx, NP * RH + 10);
      g.strokeStyle = mode === 'ghost' ? '#aac8ff' : '#ffc850'; g.lineWidth = 2; g.setLineDash([6, 4]); g.beginPath(); g.moveTo(gx, Y0 - 10); g.lineTo(gx, Y0 + NP * RH + 6); g.stroke(); g.setLineDash([]);
      if (mode === 'ghost') { const im = IM('img/ghost.svg'); if (ready(im)) { g.globalAlpha = .9; g.drawImage(im, gx - 18, Y0 + NP * RH + 34, 36, 36); g.globalAlpha = 1; } text(g, `ghost at ${mmss(T)}`, gx + 24, Y0 + NP * RH + 58, M(700, 14), '#aac8ff'); }
      else text(g, `bonus if out by ${mmss(T)}`, gx, Y0 + NP * RH + 58, M(700, 14), '#ffc850', 'center');
    }
    res.slice(0, shown).forEach((r, i) => {
      const y = Y0 + i * RH; g.fillStyle = r.caught ? '#c0392b' : r.bonus ? '#e0a92a' : r.hurried ? '#6f9fd8' : '#8a7458'; rr(g, X0, y, x(Math.min(r.time, MAXT)) - X0, RH - 4, 3); g.fill();
      if (r.caught) text(g, '✕', x(r.time) + 8, y + 10, M(800, 12), '#ff8a7a');
      if (r.time > MAXT) text(g, '→', X1 + 6, y + 10, M(800, 12), '#e8c99a');
    });
    // legend
    [['#8a7458', 'explores at their own pace'], ['#6f9fd8', 'hurries to the exit'], ['#e0a92a', 'earns the bonus'], ['#c0392b', 'caught, run over']].reduce((lx, [c, l]) => { const ly = H - 22; g.fillStyle = c; rr(g, lx, ly - 10, 14, 10, 3); g.fill(); text(g, l, lx + 20, ly, F(500, 13), '#d8c8a8'); g.font = F(500, 13); return lx + 44 + g.measureText(l).width; }, 70);
    // stats
    const s = ghostStats(res), R = 726; g.fillStyle = 'rgba(255,255,255,.06)'; rr(g, R, 30, 290, 525, 12); g.fill();
    text(g, mode === 'off' ? 'NO GHOST' : mode === 'ghost' ? 'THE GHOST' : 'MAKE IT A BONUS', R + 18, 64, M(800, 16), mode === 'bonus' ? '#ffc850' : '#aac8ff');
    const rows = [['Median time in the level', mmss(s.med)], ['Players past 5 minutes', `${s.long} of ${NP}`], ['Gold per minute, all players', Math.round(s.gpm).toLocaleString('en-US')], ['Runs ended by the timer', `${s.caught} of ${NP}`]];
    rows.forEach(([l, v], i) => { const y = 110 + i * 70; text(g, l, R + 18, y, F(500, 15), '#d8c8a8'); text(g, v, R + 18, y + 32, M(800, 26), i === 3 && s.caught > 4 ? '#ff8a7a' : '#fff'); });
    const msg = mode === 'off' ? 'Nothing pushes the slow players on. A few spend most of a session on one level, and the run loses its rhythm.'
      : mode === 'bonus' ? 'Hypothetical: a reward for leaving early instead of a threat for staying. Nobody dies, and players close to the line hurry; the slowest still dawdle.'
      : s.caught > 6 ? 'Too early: the timer starts ending runs that were going fine. The push has become a punishment.'
      : T > 360 ? 'So late it rarely matters: almost everyone has left before it arrives.' : 'The ghost moves slow players along and rarely catches anyone. Dissatisfaction used as a pacing tool.';
    g.font = F(600, 15); g.fillStyle = '#fff'; g.textAlign = 'left'; wrap(g, msg, R + 18, 410, 256, 21);
  }
  canvasDemo('ghost', (sl, cv, g) => {
    const out = $(sl, '.gh-out'), tourBtn = $(sl, '.gh-tour'), rng = $(sl, '.gh-time'), rv = $(sl, '.gh-tv'), mSeg = $(sl, '.gh-mode');
    const MODES = { off: 'No ghost', ghost: 'Ghost', bonus: 'Make it a bonus' };
    mSeg.innerHTML = Object.entries(MODES).map(([k, l]) => `<button class="btn" data-m="${k}">${l}</button>`).join('');
    const STAGES = [
      ['off', 180, 'Start with no timer at all. Most players leave in two or three minutes, but a long tail stays to scrape every last gem.'],
      ['ghost', 180, 'Spelunky sends a ghost about three minutes into a level, with a warning first. It is slow and it passes through walls. Slow players hurry, and few are caught.'],
      ['ghost', 70, 'Bring it in to just over a minute and it stops pacing and starts punishing: runs that were going fine end for no mistake of the player’s.'],
      ['bonus', 180, 'The post’s fix for dissatisfaction is to make it a bonus. Hypothetically, reward leaving early instead. Nobody dies; fewer players hurry. Spelunky already softens its ghost this way: gems it passes over turn into diamonds.'],
    ];
    const LEN = 6, DUR = STAGES.length * LEN;
    const st = { tour: true, held: false, t: 0, stage: -1, mode: 'off', T: 180, rev: 1 };
    const manual = () => { st.tour = false; tourBtn.classList.remove('on'); };
    rng.oninput = () => { manual(); st.T = +rng.value; if (st.mode === 'off') st.mode = 'ghost'; st.rev = 1; const k = ghostStats(ghostSim(st.T, st.mode)); say(out, `${st.mode === 'bonus' ? 'Bonus line' : 'Ghost'} at ${mmss(st.T)}: median ${mmss(k.med)} in the level, ${k.long} of ${NP} past five minutes, ${k.caught} run${k.caught === 1 ? '' : 's'} ended.`); };
    $$(mSeg, '.btn').forEach(b => b.onclick = () => { manual(); st.mode = b.dataset.m; st.rev = 0; say(out, b.dataset.m === 'bonus' ? 'Hypothetical: a reward for leaving by the line, not a threat. Spelunky’s own softener is that gems the ghost touches become diamonds.' : b.dataset.m === 'ghost' ? 'Drag the slider to move the ghost.' : 'No pressure at all.'); });
    tourBtn.onclick = () => { st.tour = true; st.t = 0; st.stage = -1; tourBtn.classList.add('on'); };
    function frame() {
      if (st.tour) { const k = Math.floor((st.t % DUR) / LEN), u = (st.t % DUR) - k * LEN; if (k !== st.stage) { st.stage = k; const s = STAGES[k]; st.mode = s[0]; st.T = s[1]; say(out, s[2]); } st.rev = clamp(u / 1.5); }
      rng.value = st.T; rv.textContent = mmss(st.T);
      $$(mSeg, '.btn').forEach(b => b.classList.toggle('on', b.dataset.m === st.mode));
      ghostScene(g, st.T, st.mode, st.rev);
    }
    LP.runners.ghost = { seek(t) { st.held = true; st.tour = true; st.t = t; st.stage = -1; frame(); }, dur: () => DUR };
    return dt => { if (st.held) return; dt = Math.max(0, Math.min(dt, .1)); if (st.tour) st.t = (st.t + dt) % DUR; else st.rev = Math.min(1, st.rev + dt / 1.2); frame(); };
  });

  /* ---------------- 3. Stress line: a Hades-style region ---------------- */
  const ROOM = {
    fight: { label: 'Fight', col: '#7a8aa0', d: i => 3 + i * .3 },
    elite: { label: 'Elite', col: '#b35a2e', d: () => 7 },
    rest: { label: 'Fountain', col: '#2f9e8f', d: () => 0 },
    shop: { label: 'Shop', col: '#c9a03a', d: () => .5 },
    boss: { label: 'Boss', col: '#8e2b4a', d: () => 9 },
  };
  const RKEYS = Object.keys(ROOM), NR = 12;
  const PRESETS = {
    hades: { label: 'Hades-style region', rooms: ['fight', 'fight', 'fight', 'elite', 'rest', 'fight', 'fight', 'fight', 'elite', 'fight', 'shop', 'boss'] },
    ramp: { label: 'Steady ramp', rooms: Array(NR - 1).fill('ramp').concat(['boss']) },
    flat: { label: 'All fights', rooms: Array(NR - 1).fill('flat').concat(['boss']) },
  };
  const roomD = (k, i) => k === 'ramp' ? 1.5 + i * .7 : k === 'flat' ? 5 : ROOM[k].d(i);
  const roomInfo = k => k === 'ramp' || k === 'flat' ? ROOM.fight : ROOM[k];
  const LIMIT = 10, FLOOR = 2, TOP = 12;
  function stressRun(rooms, skill) {
    let a = 1.5; return rooms.map((k, i) => { const d = roomD(k, i), de = Math.max(0, d - skill), f = clamp(1.2 * (de - a) + .5 * de + 1.2, 0, TOP); a += (de > a ? .5 : .2) * (de - a); return { d, f }; });
  }
  function stressScene(g, rooms, skill, upto, hover) {
    g.clearRect(0, 0, W, H); g.fillStyle = '#1d1726'; rr(g, 10, 10, W - 20, H - 20, 14); g.fill();
    const X0 = 70, TW = 76, x = i => X0 + i * TW + TW / 2, Y0 = 470, sy = v => Y0 - v * 28;
    text(g, 'ONE REGION, ROOM BY ROOM', 40, 46, M(800, 15), '#d9b8e8');
    // tiles
    rooms.forEach((k, i) => { const info = roomInfo(k), tx = X0 + i * TW + 4; g.fillStyle = info.col; g.globalAlpha = hover === i ? 1 : .85; rr(g, tx, 62, TW - 8, 40, 7); g.fill(); g.globalAlpha = 1; if (hover === i) { g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); } text(g, info.label, tx + (TW - 8) / 2, 87, M(700, 12), '#fff', 'center'); });
    // zones
    g.fillStyle = 'rgba(216,64,47,.13)'; g.fillRect(X0, sy(TOP), NR * TW, sy(LIMIT) - sy(TOP)); g.fillStyle = 'rgba(120,120,140,.12)'; g.fillRect(X0, sy(FLOOR), NR * TW, sy(0) - sy(FLOOR));
    text(g, 'past the limit: players quit or die', X0 + 8, sy(LIMIT) - 8, F(600, 13), '#ff9a8a'); text(g, 'flat: nothing at stake', X0 + 8, sy(0) - 8, F(600, 13), '#b8b8c8');
    g.strokeStyle = 'rgba(255,255,255,.1)'; g.lineWidth = 1; for (let v = 0; v <= TOP; v += 2) { g.beginPath(); g.moveTo(X0, sy(v)); g.lineTo(X0 + NR * TW, sy(v)); g.stroke(); }
    const run = stressRun(rooms, skill), n = Math.max(1, Math.min(NR, Math.ceil(upto)));
    const line = (key, col, w, dash) => { g.strokeStyle = col; g.lineWidth = w; g.setLineDash(dash); g.beginPath(); run.slice(0, n).forEach((r, i) => { const v = key === 'd' ? Math.max(0, r.d - skill) : r.f; i ? g.lineTo(x(i), sy(v)) : g.moveTo(x(i), sy(v)); }); g.stroke(); g.setLineDash([]); };
    line('d', '#9aa3c8', 3, [7, 6]); line('f', '#ffb951', 4, []);
    run.slice(0, n).forEach((r, i) => { g.fillStyle = r.f > LIMIT ? '#ff5a4a' : '#ffb951'; g.beginPath(); g.arc(x(i), sy(r.f), 6, 0, TAU); g.fill(); });
    // legend + stats
    g.strokeStyle = '#9aa3c8'; g.lineWidth = 3; g.setLineDash([7, 6]); g.beginPath(); g.moveTo(X0, 528); g.lineTo(X0 + 36, 528); g.stroke(); g.setLineDash([]); text(g, 'difficulty, after your skill', X0 + 44, 533, F(600, 14), '#c8cce0');
    g.strokeStyle = '#ffb951'; g.lineWidth = 4; g.beginPath(); g.moveTo(X0 + 270, 528); g.lineTo(X0 + 306, 528); g.stroke(); text(g, 'felt stress (illustrative)', X0 + 314, 533, F(600, 14), '#ffd89a');
    const over = run.filter(r => r.f > LIMIT).length, flat = run.filter(r => r.f < FLOOR).length, swing = run.slice(1).reduce((a, r, i) => a + Math.abs(r.f - run[i].f), 0) / (NR - 1);
    text(g, `over the limit: ${over}  ·  flat: ${flat}  ·  average swing: ${swing.toFixed(1)}`, W - 40, 533, M(700, 14), '#fff', 'right');
    return { over, flat, swing };
  }
  canvasDemo('stress', (sl, cv, g) => {
    const out = $(sl, '.sr-out'), tourBtn = $(sl, '.sr-tour'), pSeg = $(sl, '.sr-pre'), rng = $(sl, '.sr-skill'), rv = $(sl, '.sr-sv');
    pSeg.innerHTML = Object.entries(PRESETS).map(([k, p]) => `<button class="btn" data-p="${k}">${p.label}</button>`).join('');
    const STAGES = [
      ['hades', 1.5, 'A Hades-style region. Fights climb, an elite spikes, then a fountain room heals you, and Charon’s shop sits right before the boss door. Each valley makes the next peak feel bigger.'],
      ['ramp', 1.5, 'A steady ramp to the same boss. Stress climbs more gently than difficulty, because players adapt as you push, and the boss barely stands out from the room before it.'],
      ['flat', 1.5, 'All fights at one level. The first room bites, then stress sinks to a plateau and stays there. Difficulty and stress are not one to one.'],
      ['hades', 0, 'The same Hades-style region for a newer player. The boss goes past the limit, and the elites come close.'],
      ['hades', 3.5, 'And for an expert. Most rooms go flat: the same layout produces a different stress line for every player.'],
    ];
    const LEN = 6, DUR = STAGES.length * LEN;
    const st = { tour: true, held: false, t: 0, stage: -1, rooms: PRESETS.hades.rooms.slice(), pre: 'hades', skill: 1.5, upto: NR, hover: -1 };
    const manual = () => { st.tour = false; tourBtn.classList.remove('on'); };
    const report = () => { const r = stressScene(g, st.rooms, st.skill, NR, -1); say(out, `Over the limit in ${r.over} room${r.over === 1 ? '' : 's'}, flat in ${r.flat}, and an average swing of ${r.swing.toFixed(1)} between rooms. ${r.swing > 1.8 ? 'Peaks and valleys.' : 'A plateau: stress barely moves.'}`); };
    $$(pSeg, '.btn').forEach(b => b.onclick = () => { manual(); st.pre = b.dataset.p; st.rooms = PRESETS[st.pre].rooms.slice(); st.upto = 0; report(); });
    rng.oninput = () => { manual(); st.skill = +rng.value; st.upto = NR; report(); };
    const tileAt = e => { const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * W / r.width, y = (e.clientY - r.top) * H / r.height; const i = Math.floor((x - 70) / 76); return y > 56 && y < 108 && i >= 0 && i < NR ? i : -1; };
    cv.addEventListener('mousemove', e => { st.hover = tileAt(e); cv.style.cursor = st.hover >= 0 ? 'pointer' : ''; });
    cv.addEventListener('click', e => { const i = tileAt(e); if (i < 0) return; manual(); const k = st.rooms[i], cur = k === 'ramp' || k === 'flat' ? 'fight' : k; st.rooms[i] = RKEYS[(RKEYS.indexOf(cur) + 1) % RKEYS.length]; st.pre = null; st.upto = NR; report(); });
    tourBtn.onclick = () => { st.tour = true; st.t = 0; st.stage = -1; tourBtn.classList.add('on'); };
    function frame() {
      if (st.tour) { const k = Math.floor((st.t % DUR) / LEN), u = (st.t % DUR) - k * LEN; if (k !== st.stage) { st.stage = k; const s = STAGES[k]; st.pre = s[0]; st.rooms = PRESETS[s[0]].rooms.slice(); st.skill = s[1]; say(out, s[2]); } st.upto = 1 + u / 3 * NR; }
      rng.value = st.skill; rv.textContent = st.skill.toFixed(1);
      $$(pSeg, '.btn').forEach(b => b.classList.toggle('on', b.dataset.p === st.pre));
      stressScene(g, st.rooms, st.skill, st.upto, st.hover);
    }
    LP.runners.stress = { seek(t) { st.held = true; st.tour = true; st.t = t; st.stage = -1; frame(); }, dur: () => DUR };
    return dt => { if (st.held) return; dt = Math.max(0, Math.min(dt, .1)); if (st.tour) st.t = (st.t + dt) % DUR; else st.upto = Math.min(NR, st.upto + dt * 8); frame(); };
  });
  IM('img/ghost.svg');
})();
