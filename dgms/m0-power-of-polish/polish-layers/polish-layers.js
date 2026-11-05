/* Module 0, slides 75-78 and 81: "Amplified Game Feel". One melee strike against a training dummy on a loop, with
   eight layers of feel added one at a time: anticipation, hit stop, screen shake, knockback, hit flash, particles,
   a hit sound and a camera nudge. "Raw vs polished" shows both strikes at once.
   The strike is a pure function of the loop time and the layer set, so __seek is deterministic. */
(function () {
  const { $, $$, say } = FPF.kit;
  const C = TD.C, { clamp, lerp, ease } = TD, TAU = Math.PI * 2;
  const { txt, wrap, box } = SCENE;
  const W = 1040, H = 585, CYCLE = 1.7;
  const LAYERS = [
    ['antic', 'Anticipation', 'a wind-up before the swing, so the player reads the attack coming'],
    ['stop', 'Hit stop', 'both bodies freeze for a few frames on contact, so the hit feels solid'],
    ['shake', 'Screen shake', 'the whole view jolts, so the hit reads as forceful'],
    ['knock', 'Knockback', 'the dummy is pushed away and springs back, so the hit has weight'],
    ['flash', 'Hit flash', 'the target flashes white, so the player sees exactly what got hit'],
    ['parts', 'Particles', 'splinters fly from the point of contact'],
    ['sound', 'Hit sound', 'a thump on contact (tick “Play sound” to hear it)'],
    ['cam', 'Camera nudge', 'the camera punches in toward the impact and eases back'],
  ];
  const ALL = new Set(LAYERS.map(l => l[0]));
  const STEP = 2 * CYCLE, DUR = STEP * (LAYERS.length + 1) + 7;
  const tourLayers = t => new Set(LAYERS.slice(0, clamp(Math.floor(t / STEP), 0, LAYERS.length)).map(l => l[0]));
  const tourSplit = t => t > STEP * (LAYERS.length + 1);

  // the strike timeline for one loop: returns sword angle, contact time and how long since contact (frozen in hit stop)
  function strike(c, L) {
    const a = L.has('antic') ? .34 : .03, s = .09, hs = L.has('stop') ? .11 : 0;
    const REST = -.4, BACK = -2.5, END = 1.35;
    let ang, since = -1, frozen = false;
    if (c < a) ang = L.has('antic') ? lerp(REST, BACK, ease(c / a)) : REST;
    else if (c < a + s) { const k = (c - a) / s; ang = lerp(L.has('antic') ? BACK : REST, END, k * k); }
    else if (c < a + s + hs) { ang = END; since = 0; frozen = true; }
    else { const r = c - a - s - hs; since = r; ang = lerp(END, REST, ease(clamp(r / .7))); }
    return { ang, since, frozen, contact: a + s };
  }
  function scene(g, L, c, ox, oy, sc, label) {
    const k = strike(c, L), sn = k.since;
    g.save(); g.beginPath(); g.rect(ox, oy, W * sc, H * sc); g.clip();
    g.translate(ox, oy); g.scale(sc, sc);
    // camera: nudge toward the impact, then shake
    const IX = 600, IY = 300;
    if (L.has('cam') && sn >= 0) { const z = 1 + .07 * Math.exp(-sn * 7); g.translate(IX, IY); g.scale(z, z); g.translate(-IX, -IY); }
    if (L.has('shake') && sn >= 0 && sn < .35) { const a = 11 * (1 - sn / .35); g.translate(Math.sin(sn * 95) * a, Math.cos(sn * 77) * a * .7); }
    // arena
    g.fillStyle = '#efe6d2'; g.fillRect(-40, -40, W + 80, H + 80);
    g.fillStyle = '#d9cba8'; g.fillRect(-40, 420, W + 80, 200); g.fillStyle = '#c6b78f'; g.fillRect(-40, 420, W + 80, 6);
    // dummy, knocked back on a spring
    let dx = 0, lean = 0;
    if (L.has('knock') && sn >= 0) { const d = Math.exp(-sn * 4.5) * Math.cos(sn * 14); dx = 34 * d; lean = .22 * d; }
    g.save(); g.translate(640 + dx * .4, 420); g.rotate(lean);
    g.fillStyle = '#8a6a43'; g.fillRect(-8, -150, 16, 150);
    g.fillStyle = '#c9a27a'; g.strokeStyle = '#6b4e2e'; g.lineWidth = 4;
    g.beginPath(); g.roundRect(-38, -150, 76, 90, 18); g.fill(); g.stroke();
    g.fillStyle = '#d8b98f'; g.beginPath(); g.arc(0, -184, 30, 0, TAU); g.fill(); g.stroke();
    g.strokeStyle = '#e5322d'; g.lineWidth = 4; g.beginPath(); g.arc(0, -112, 18, 0, TAU); g.stroke(); g.beginPath(); g.arc(0, -112, 6, 0, TAU); g.stroke();
    g.fillStyle = '#8a6a43'; g.fillRect(-60, -130, 120, 12);
    if (L.has('flash') && sn >= 0 && sn < .09) { g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.roundRect(-38, -150, 76, 90, 18); g.fill(); g.beginPath(); g.arc(0, -184, 30, 0, TAU); g.fill(); }
    g.restore();
    // hero: a knight disc on legs with a sword arm
    const HX = 470, HY = 330, back = L.has('antic') && c < k.contact ? -8 * Math.sin(clamp(c / .34) * Math.PI / 2) : 0, lunge = sn >= 0 ? 14 * Math.exp(-sn * 3) : (c > k.contact - .09 && c < k.contact ? 14 : 0);
    const hx = HX + back + lunge;
    g.strokeStyle = C.navy; g.lineWidth = 9; g.lineCap = 'round';
    g.beginPath(); g.moveTo(hx - 10, HY + 40); g.lineTo(hx - 26, 420); g.moveTo(hx + 10, HY + 40); g.lineTo(hx + 22, 420); g.stroke();
    g.fillStyle = C.player; g.strokeStyle = '#fff'; g.lineWidth = 4; g.beginPath(); g.roundRect(hx - 30, HY - 40, 60, 86, 22); g.fill(); g.stroke();
    g.fillStyle = '#f3d2b0'; g.beginPath(); g.arc(hx, HY - 66, 24, 0, TAU); g.fill(); g.strokeStyle = C.navy; g.lineWidth = 3; g.stroke();
    g.fillStyle = C.navy; g.beginPath(); g.arc(hx, HY - 72, 25, Math.PI, 0); g.fill();
    // sword, pivoting at the shoulder; a motion arc while it swings
    const sx = hx + 18, sy = HY - 20;
    if (c >= (L.has('antic') ? .34 : .03) && sn < 0) { g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 22; g.beginPath(); g.arc(sx, sy, 110, -Math.PI / 2 + (L.has('antic') ? -2.5 : -.4), -Math.PI / 2 + k.ang); g.stroke(); }
    g.save(); g.translate(sx, sy); g.rotate(k.ang);
    g.fillStyle = '#d7dbe8'; g.strokeStyle = C.navy; g.lineWidth = 3; g.beginPath(); g.moveTo(-6, -16); g.lineTo(6, -16); g.lineTo(5, -140); g.lineTo(0, -156); g.lineTo(-5, -140); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = C.gold; g.fillRect(-18, -20, 36, 8); g.fillStyle = C.navy; g.fillRect(-4, -12, 8, 22);
    g.restore();
    g.strokeStyle = C.navy; g.lineWidth = 10; g.beginPath(); g.moveTo(hx + 8, HY - 14); g.lineTo(sx, sy); g.stroke();
    // particles: splinters from the contact point
    if (L.has('parts') && sn >= 0 && sn < .6) {
      for (let i = 0; i < 16; i++) {
        const a = -Math.PI * .9 + (i * 2.399) % (Math.PI * 1.1), sp = 260 + (i * 53) % 220, life = clamp(1 - sn / (.35 + (i % 5) * .05));
        if (life <= 0) continue;
        const px = 612 + Math.cos(a) * sp * sn, py = 300 + Math.sin(a) * sp * sn + 600 * sn * sn;
        g.fillStyle = i % 3 ? '#c9a27a' : C.gold; g.globalAlpha = life; g.save(); g.translate(px, py); g.rotate(i + sn * 12); g.fillRect(-6, -2, 12, 4); g.restore(); g.globalAlpha = 1;
      }
    }
    // the hit sound, drawn as rings and a word
    if (L.has('sound') && sn >= 0 && sn < .5) {
      const k2 = sn / .5;
      for (let i = 0; i < 3; i++) { const r = 30 + (k2 + i * .18) * 120; g.strokeStyle = `rgba(229,50,45,${(1 - k2) * (1 - i * .25)})`; g.lineWidth = 4; g.beginPath(); g.arc(612, 300, r, -1, 1); g.stroke(); }
      txt(g, 'THOK!', 720, 230 - k2 * 20, { size: 36, col: C.red, a: 1 - k2, align: 'center' });
    }
    g.restore();
    if (label) { box(g, ox + 14, oy + 12, 150, 34, { fill: C.navy }); txt(g, label, ox + 89, oy + 35, { size: 15, col: C.gold, align: 'center' }); }
  }
  let actx = null;
  function thump() {
    try {
      actx = actx || new AudioContext();
      const t = actx.currentTime, o = actx.createOscillator(), gn = actx.createGain(), n = actx.createBufferSource(), nb = actx.createBuffer(1, actx.sampleRate * .12, actx.sampleRate), ng = actx.createGain();
      const d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
      n.buffer = nb; ng.gain.value = .35; n.connect(ng).connect(actx.destination); n.start(t);
      o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(50, t + .18);
      gn.gain.setValueAtTime(.6, t); gn.gain.exponentialRampToValueAtTime(.001, t + .22); o.connect(gn).connect(actx.destination); o.start(t); o.stop(t + .25);
    } catch (e) { /* no audio */ }
  }
  SCENE('strike', {
    dur: DUR,
    init(st) {
      st.L = new Set(); st.split = false; st.lastC = 0;
      const boxes = $$(st.s, '.pl-layers input'), views = $$(st.s, '.pl-view .btn');
      st.syncUI = (L, split) => { boxes.forEach(b => b.checked = L.has(b.value)); views.forEach(v => v.classList.toggle('on', (v.dataset.v === 'split') === split)); };
      boxes.forEach(b => b.onchange = () => { st.manual(); b.checked ? st.L.add(b.value) : st.L.delete(b.value); });
      views.forEach(v => v.onclick = () => { st.manual(); st.split = v.dataset.v === 'split'; st.syncUI(st.L, st.split); });
      $(st.s, '.pl-all').onclick = () => { st.manual(); st.L = new Set(ALL); st.syncUI(st.L, st.split); };
      $(st.s, '.pl-none').onclick = () => { st.manual(); st.L = new Set(); st.syncUI(st.L, st.split); };
    },
    onManual(st) { st.L = new Set(st.lastL || []); st.split = !!st.lastSplit; },
    side(st, t) {
      const L = st.tour ? tourLayers(t) : st.L, split = st.tour ? tourSplit(t) : st.split;
      st.lastL = L; st.lastSplit = split;
      if (st.tour) st.syncUI(L, split);
      const n = L.size, key = n + '' + split + [...L].join(); if (key === st.key) return; st.key = key;
      say($(st.s, '.pl-stats'), `<div class="${n >= 6 ? 'g' : n >= 3 ? 'y' : ''}"><b>${n}/8</b><span>layers of feel on</span></div>`);
      const last = LAYERS.filter(l => L.has(l[0])).pop();
      say($(st.s, '.pl-out'), split ? 'The same swing and the same damage. Only the feedback differs (anticipation adds a wind-up), and the feedback is what tells the player what just happened.'
        : !n ? 'The raw strike: the sword moves and the dummy is hit, and nothing tells the player it mattered.' : `<b>${last[1]}</b>: ${last[2]}.`);
    },
    draw(g, st, t) {
      const L = st.tour ? tourLayers(t) : st.L, split = st.tour ? tourSplit(t) : st.split, c = t % CYCLE;
      if (!st.tour && $(st.s, '.pl-audio').checked && L.has('sound')) { const ct = strike(0, L).contact + (L.has('stop') ? .11 : 0); if (st.lastC < ct && c >= ct) thump(); }
      st.lastC = c;
      if (split) { SCENE.paper(g, W, H); scene(g, new Set(), c, 0, 146, .5, 'Raw'); scene(g, ALL, c, W / 2, 146, .5, 'Polished'); g.fillStyle = C.navy; g.fillRect(W / 2 - 2, 146, 4, H / 2); txt(g, 'Same swing, same damage: only the feedback differs', W / 2, 110, { size: 20, align: 'center' }); }
      else scene(g, L, c, 0, 0, 1, L.size ? `${L.size} of 8 layers` : 'Raw');
      if (!split) { const n = L.size; for (let i = 0; i < 8; i++) { g.fillStyle = i < n ? C.gold : 'rgba(38,44,106,.18)'; g.beginPath(); g.roundRect(W - 30 - (8 - i) * 26, 22, 20, 20, 5); g.fill(); } }
    },
  });
})();
