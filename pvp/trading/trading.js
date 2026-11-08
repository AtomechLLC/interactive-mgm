/* Trading Hits (MGM C4 M4, part 6): a greatsword swing against a chain of dagger stabs, resolved by four reaction rules.
   The rules are at the top (MV, RULES, sim) so the knights, the frame strips and the comparison table always agree.
   Frame data, damage and poise are illustrative, shaped after Souls-style weapons: the heavy swing is slow and hits hard,
   the dagger is fast and chips. The demo is a pure function of its settings and a time, exposed as window.__seek / __dur. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const W = 1040, H = 585;
  const C = {
    navy: '#152044', ink: '#262c6a', muted: '#5d618c', line: '#cdbf9f', paper: 'rgba(255,252,244,.82)', floor: '#ddd2bc',
    blue: '#2ea3dc', red: '#e5322d', green: '#2fae63', gold: '#e0a92d', purple: '#8a4fd6', sand: '#cdbf9f', steel: '#6d7894',
  };

  /* ---------- the rules ---------- */
  // s: startup frames, a: active, r: recovery, w: weight for "heavier hit wins", dmg and poise damage dealt
  const MV = {
    gs: { name: 'Greatsword', s: 28, a: 6, r: 30, w: 3, dmg: 300, poise: 50 },
    dg: { name: 'Dagger', s: 8, a: 3, r: 10, w: 1, dmg: 45, poise: 10 },
  };
  const STAB_N = 3, STAG = 24, T0 = 10, TOT = 110, DG_POISE = 30, HP = 1000;
  const RULES = {
    first: { name: 'First to hit', game: 'any hit interrupts' },
    heavy: { name: 'Heavier hit wins', game: 'God of War' },
    both: { name: 'Both attacks land', game: 'Street Fighter' },
    poise: { name: 'Poise decides', game: 'Elden Ring, Dark Souls' },
  };
  const phaseOf = (at, f) => { const lf = f - at.t0, m = at.mv; return lf < m.s ? 'startup' : lf < m.s + m.a ? 'active' : 'recovery'; };
  // P[0] swings the greatsword once at T0; P[1] starts a chain of dagger stabs at T0 + off
  function sim(rule, off, gsPoise) {
    const P = [
      { mv: MV.gs, cap: gsPoise, meter: 0, hp: HP, left: 1, next: T0, at: null, stag: -1, phase: [], hpS: [], meterS: [], dealt: 0, poiseDealt: 0, stagN: 0 },
      { mv: MV.dg, cap: DG_POISE, meter: 0, hp: HP, left: STAB_N, next: T0 + off, at: null, stag: -1, phase: [], hpS: [], meterS: [], dealt: 0, poiseDealt: 0, stagN: 0 },
    ];
    const ev = [];
    for (let f = 0; f < TOT; f++) {
      P.forEach(p => {
        if (p.at && f - p.at.t0 >= p.mv.s + p.mv.a + p.mv.r) { p.at = null; if (p.left) p.next = Math.max(p.next, f); }
        if (!p.at && f > p.stag && p.left && f >= p.next) { p.at = { mv: p.mv, t0: f, hit: false }; p.left--; }
      });
      const before = P.map(p => p.at ? phaseOf(p.at, f) : f <= p.stag ? 'stagger' : 'idle');
      const hits = [];
      P.forEach((p, i) => { if (p.at && before[i] === 'active' && !p.at.hit) { p.at.hit = true; hits.push(i); } });
      const inter = [false, false];
      hits.forEach(i => {
        const a = P[i], v = P[1 - i], m = a.mv;
        v.hp -= m.dmg; v.meter += m.poise; a.dealt += m.dmg; a.poiseDealt += m.poise;
        let x = false;
        if (rule === 'first') x = true;
        else if (rule === 'heavy') x = m.w >= (before[1 - i] === 'startup' || before[1 - i] === 'active' ? v.mv.w : 0);
        else if (rule === 'poise') x = v.meter >= v.cap;
        if (x) { inter[1 - i] = true; v.meter = 0; }
        ev.push({ f, by: i, dmg: m.dmg, poise: m.poise, inter: x });
      });
      P.forEach((p, i) => {
        if (inter[i]) { p.at = null; p.stag = f + STAG; p.next = p.stag + 1; p.stagN++; }
        p.phase.push(inter[i] ? 'stagger' : p.at ? phaseOf(p.at, f) : f <= p.stag ? 'stagger' : 'idle');
        p.hpS.push(p.hp); p.meterS.push(p.meter);
      });
    }
    return { P, ev };
  }

  /* ---------- drawing ---------- */
  function text(g, t, x, y, { col = C.ink, size = 15, weight = 600, align = 'center' } = {}) {
    g.font = `${weight} ${size}px Jost, sans-serif`; g.fillStyle = col; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(t, x, y);
  }
  function pill(g, t, x, y, bg, fg = '#fff', size = 14) {
    g.font = `700 ${size}px Jost, sans-serif`; const w = g.measureText(t).width + 18, h = size + 12;
    g.fillStyle = bg; g.beginPath(); g.roundRect(x - w / 2, y - h / 2, w, h, h / 2); g.fill();
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, x, y + 1);
  }
  function panel(g, x, y, w, h) { g.fillStyle = C.paper; g.beginPath(); g.roundRect(x, y, w, h, 14); g.fill(); }
  function spark(g, x, y, k, col = C.gold) {
    g.save(); g.translate(x, y); g.fillStyle = col; g.globalAlpha = 1 - k * 0.7; g.beginPath();
    for (let i = 0; i < 16; i++) { const r = i % 2 ? 9 : 26 + 10 * k, a = i / 16 * TAU; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    g.fill(); g.restore();
  }
  const PH = { idle: '#ebe4d3', startup: C.gold, active: C.red, recovery: C.blue, stagger: C.purple };
  // a knight at x facing dir; weapon pose from the phase and how far into it
  function knight(g, i, x, dir, floor, ph, k) {
    const body = i === 0 ? '#5b6788' : '#9c3b3b', trim = i === 0 ? C.gold : '#f0d7a0';
    const lean = ph === 'stagger' ? -dir * 14 * (1 - k * 0.6) : 0;
    const lunge = i === 1 && (ph === 'startup' || ph === 'active') ? dir * (ph === 'active' ? 70 : 70 * k) : i === 1 && ph === 'recovery' ? dir * 70 * (1 - k) : 0;
    const bx = x + lunge, top = floor - 150;
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    // legs
    g.strokeStyle = '#3b3f52'; g.lineWidth = 14;
    g.beginPath(); g.moveTo(bx - 8, floor - 62); g.lineTo(bx - dir * 22, floor - 4); g.moveTo(bx + 8, floor - 62); g.lineTo(bx + dir * 24, floor - 4); g.stroke();
    g.translate(bx, floor - 62); g.rotate(lean * Math.PI / 180); g.translate(-bx, -(floor - 62));
    // torso, head
    g.fillStyle = body; g.strokeStyle = C.navy; g.lineWidth = 2.5;
    g.beginPath(); g.roundRect(bx - 22, top + 40, 44, 52, 10); g.fill(); g.stroke();
    g.fillStyle = '#a7aec2'; g.beginPath(); g.arc(bx, top + 22, 19, 0, TAU); g.fill(); g.stroke();
    g.strokeStyle = C.navy; g.lineWidth = 3; g.beginPath(); g.moveTo(bx + dir * 2, top + 20); g.lineTo(bx + dir * 16, top + 20); g.stroke();
    g.fillStyle = trim; g.fillRect(bx - 22, top + 70, 44, 6);
    // weapon
    const hx = bx + dir * 18, hy = top + 62;
    if (i === 0) {
      // greatsword: raised behind at rest, wound further back in startup, sweeps down and forward when active
      let ang = -110;
      if (ph === 'startup') ang = lerp(-110, -150, k); else if (ph === 'active') ang = lerp(-150, 35, clamp(k * 1.4)); else if (ph === 'recovery') ang = lerp(35, -110, clamp((k - 0.5) * 2));
      else if (ph === 'stagger') ang = -60;
      const a = ang * Math.PI / 180, ex = hx + dir * Math.cos(a) * 165, ey = hy + Math.sin(a) * 165;
      g.strokeStyle = '#d9dde8'; g.lineWidth = 11; g.beginPath(); g.moveTo(hx + dir * Math.cos(a) * 22, hy + Math.sin(a) * 22); g.lineTo(ex, ey); g.stroke();
      g.strokeStyle = C.navy; g.lineWidth = 1.5; g.stroke();
      const gx = hx + dir * Math.cos(a) * 24, gy = hy + Math.sin(a) * 24, px = -Math.sin(a) * 14, py = Math.cos(a) * 14;
      g.strokeStyle = trim; g.lineWidth = 6; g.beginPath(); g.moveTo(gx + dir * px, gy + py); g.lineTo(gx - dir * px, gy - py); g.stroke();
      if (ph === 'active') { g.strokeStyle = 'rgba(229,50,45,.22)'; g.lineWidth = 14; g.beginPath(); g.arc(hx, hy, 150, dir > 0 ? -150 * Math.PI / 180 : Math.PI + 150 * Math.PI / 180, dir > 0 ? a : Math.PI - a, dir < 0); g.stroke(); }
    } else {
      // dagger: held at the hip, thrust straight out when active
      const out = ph === 'active' ? 40 : ph === 'startup' ? -10 * k : 0, y = hy + 4;
      g.strokeStyle = '#f1cfa8'; g.lineWidth = 9; g.beginPath(); g.moveTo(bx, top + 56); g.lineTo(hx + dir * out, y); g.stroke();
      g.strokeStyle = '#d9dde8'; g.lineWidth = 6; g.beginPath(); g.moveTo(hx + dir * out, y); g.lineTo(hx + dir * (out + 46), y); g.stroke();
      if (ph === 'active') { g.fillStyle = 'rgba(229,50,45,.3)'; g.fillRect(Math.min(hx + dir * (out + 10), hx + dir * (out + 56)), y - 12, 46, 24); }
    }
    g.restore();
    return bx;
  }
  function bars(g, x, p, f, label, col) {
    const hp = p.hpS[f], m = p.meterS[f];
    text(g, label, x, 18, { col, size: 15, weight: 700 });
    g.fillStyle = '#e6dcc6'; g.fillRect(x - 90, 32, 180, 10); g.fillStyle = C.red; g.fillRect(x - 90, 32, 180 * hp / HP, 10);
    g.fillStyle = '#e6dcc6'; g.fillRect(x - 90, 48, 180, 7); g.fillStyle = C.purple; g.fillRect(x - 90, 48, 180 * clamp(m / p.cap), 7);
    text(g, `HP ${hp}`, x - 96, 37, { col: C.muted, size: 12, align: 'right', weight: 500 });
    text(g, `poise ${m}/${p.cap}`, x + 96, 52, { col: C.purple, size: 12, align: 'left', weight: 600 });
  }

  const GFPS = 24, SEG = TOT / GFPS + 0.8;
  function draw(g, st, f) {
    g.clearRect(0, 0, W, H);
    const R = sim(st.rule, st.off, st.poise), [A, B] = R.P;
    const fi = Math.min(f, TOT - 1);
    /* stage */
    panel(g, 0, 0, W, 252);
    const floor = 236; g.fillStyle = C.floor; g.fillRect(20, floor, W - 40, 10);
    const phK = (p, i) => { let j = fi; while (j > 0 && p.phase[j - 1] === p.phase[fi]) j--; let e = fi; while (e < TOT - 1 && p.phase[e + 1] === p.phase[fi]) e++; return (fi - j + 1) / (e - j + 1); };
    const xA = knight(g, 0, 420, 1, floor, A.phase[fi], phK(A, fi));
    const xB = knight(g, 1, 610, -1, floor, B.phase[fi], phK(B, fi));
    bars(g, 200, A, fi, 'Greatsword', C.navy); bars(g, 820, B, fi, 'Dagger', '#9c3b3b');
    R.ev.forEach(e => {
      const age = fi - e.f; if (age < 0 || age > 20) return;
      const vx = e.by === 0 ? xB : xA, y = floor - (e.by === 0 ? 110 : 88);
      if (age < 10) spark(g, vx + (e.by === 0 ? -10 : 10), y, age / 10, e.inter ? C.purple : C.gold);
      text(g, `−${e.dmg}`, vx + (e.by === 0 ? 34 : -34), y - 24 - age * 1.6, { col: C.red, size: 18, weight: 700 });
      if (e.inter && age < 20) pill(g, 'interrupted', vx, floor + 2, C.purple, '#fff', 13);
    });
    text(g, `frame ${fi}`, W - 24, 84, { col: C.muted, size: 14, align: 'right' });
    text(g, '0.4× speed', W - 24, 104, { col: C.muted, size: 13, align: 'right', weight: 500 });
    pill(g, `${RULES[st.rule].name} · ${RULES[st.rule].game}`, W / 2, 40, C.navy, '#fff', 15);

    /* frame strips */
    panel(g, 0, 262, W, 124);
    text(g, 'Frames (60 per second)', 24, 280, { col: C.navy, size: 15, align: 'left', weight: 700 });
    [['startup', C.gold], ['active', C.red], ['recovery', C.blue], ['interrupted', C.purple]].forEach(([t, c], i) => {
      g.fillStyle = c; g.fillRect(W - 540 + i * 130, 274, 12, 12); text(g, t, W - 522 + i * 130, 280, { col: C.muted, size: 13, align: 'left', weight: 500 });
    });
    const X0 = 150, CW = (W - X0 - 20) / TOT;
    [[A, 'Greatsword', 300], [B, 'Dagger', 336]].forEach(([p, lab, y], i) => {
      text(g, lab, 24, y + 11, { col: C.ink, size: 14, align: 'left' });
      for (let j = 0; j < TOT; j++) { g.fillStyle = PH[p.phase[j]]; g.fillRect(X0 + j * CW + 0.3, y, CW - 0.6, 22); }
      R.ev.filter(e => e.by === i).forEach(e => text(g, '✱', X0 + (e.f + 0.5) * CW, y + 11, { col: '#fff', size: 15, weight: 700 }));
    });
    const cx = X0 + (fi + 0.5) * CW; g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.moveTo(cx, 294); g.lineTo(cx, 364); g.stroke();
    text(g, `dagger starts ${st.off >= 0 ? st.off + ' frames after' : -st.off + ' frames before'} the swing`, X0, 375, { col: C.muted, size: 13, align: 'left', weight: 500 });

    /* the same moment under every rule */
    panel(g, 0, 398, W, 187);
    text(g, 'The same exchange under each reaction rule', 24, 416, { col: C.navy, size: 15, align: 'left', weight: 700 });
    const cols = [24, 300, 465, 630, 880];
    ['Reaction rule', 'Greatsword dealt', 'Dagger dealt', 'Interrupted', 'Trade'].forEach((h, i) => text(g, h, cols[i], 442, { col: C.muted, size: 13, align: 'left', weight: 700 }));
    Object.keys(RULES).forEach((k, r) => {
      const S = sim(k, st.off, st.poise), [a, b] = S.P, y = 470 + r * 28, on = k === st.rule;
      if (on) { g.fillStyle = 'rgba(46,163,220,.14)'; g.fillRect(14, y - 13, W - 28, 26); }
      const w = on ? 700 : 500;
      text(g, `${RULES[k].name} (${RULES[k].game})`, cols[0], y, { col: C.ink, size: 14, align: 'left', weight: w });
      text(g, `${a.dealt} dmg, ${a.poiseDealt} poise`, cols[1], y, { col: C.ink, size: 14, align: 'left', weight: w });
      text(g, `${b.dealt} dmg, ${b.poiseDealt} poise`, cols[2], y, { col: C.ink, size: 14, align: 'left', weight: w });
      const who = [a.stagN ? `greatsword ×${a.stagN}` : '', b.stagN ? `dagger ×${b.stagN}` : ''].filter(Boolean).join(', ') || 'nobody';
      text(g, who, cols[3], y, { col: C.ink, size: 14, align: 'left', weight: w });
      const d = a.dealt - b.dealt;
      text(g, d > 0 ? 'greatsword ahead' : d < 0 ? 'dagger ahead' : 'even', cols[4], y, { col: d > 0 ? C.navy : d < 0 ? '#9c3b3b' : C.muted, size: 14, align: 'left', weight: 700 });
    });
  }

  /* ---------- the slide ---------- */
  const TOUR = [['first', 4, 100], ['heavy', 4, 100], ['both', 4, 100], ['poise', 4, 100], ['poise', 4, 10]];
  const st = { rule: 'poise', off: 4, poise: 100, t: 0, tour: true, held: false };
  let api = null;
  canvasDemo('trade', (sl, cv, g) => {
    const ui = { off: $(sl, '.i-off'), poise: $(sl, '.i-poise'), tour: $(sl, '.td-tour'), rules: $$(sl, '[data-rule]') };
    let last = '';
    const sync = () => { ui.off.value = st.off; ui.poise.value = st.poise; };
    sync();
    const manual = () => { st.tour = false; st.t = 0; };
    ui.rules.forEach(b => b.onclick = () => { manual(); st.rule = b.dataset.rule; });
    ui.off.oninput = () => { manual(); st.off = +ui.off.value; };
    ui.poise.oninput = () => { manual(); st.poise = +ui.poise.value; };
    ui.tour.onclick = () => { st.tour = true; st.t = 0; };
    addEventListener('keydown', e => {
      if (!sl.classList.contains('active') || e.ctrlKey || e.metaKey) return;
      const i = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(e.code); if (i >= 0) ui.rules[i].click();
    });
    function render() {
      if (st.tour) { const k = Math.floor(st.t / SEG) % TOUR.length; [st.rule, st.off, st.poise] = TOUR[k]; }
      const f = Math.floor((st.t % SEG) * GFPS);
      draw(g, st, f);
      const key = [st.rule, st.off, st.poise, st.tour].join('|'); if (key === last) return; last = key;
      sync();
      ui.rules.forEach(b => b.classList.toggle('on', b.dataset.rule === st.rule)); ui.tour.classList.toggle('on', st.tour);
      $(sl, '.v-off').textContent = st.off >= 0 ? `${st.off} frames after` : `${-st.off} frames before`;
      $(sl, '.v-poise').textContent = st.poise;
      const [a, b] = sim(st.rule, st.off, st.poise).P;
      say($(sl, '.st'), `<div><b>${a.dealt}</b><span>damage the greatsword dealt</span></div><div class="r"><b>${b.dealt}</b><span>damage the dagger dealt</span></div>`);
      const msg = {
        first: 'The first hit interrupts whatever it lands on. The dagger is quicker, so it stops the swing every time: heavy weapons become useless against anyone faster.',
        heavy: 'A lighter hit can’t stop a heavier attack. The greatsword swings through the stabs and knocks the dagger out of its chain; the dagger only gets free hits once the swing is in recovery.',
        both: 'Nothing interrupts anything: both attacks finish and both sides take full damage. The trade is decided by raw numbers, so the slow, big hit comes out ahead.',
        poise: a.stagN ? `With only ${st.poise} poise, the stabs fill the greatsword user’s meter and the swing is interrupted. Poise turns the trade into a resource: spend it and the next hit staggers you.`
          : `Each stab adds ${MV.dg.poise} poise, not enough to fill ${st.poise}, so the swing lands and its ${MV.gs.poise} poise staggers the dagger user. The dagger traded ${b.poiseDealt} poise damage for ${MV.gs.poise} of its own.`,
      }[st.rule];
      say($(sl, '.out1'), `${msg} Lower the greatsword user’s poise, or start the dagger earlier or later, and watch the table change.`);
    }
    const DUR = SEG * TOUR.length;
    api = { seek(t) { st.held = true; st.tour = true; st.t = t; render(); }, dur: () => DUR };
    return dt => { if (!st.held) st.t += dt; render(); };
  });
  window.__seek = t => api.seek(t);
  window.__dur = () => api.dur();
})();
