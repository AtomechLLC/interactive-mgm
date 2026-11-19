/* SOUL: heal or strike (mock-up for MGM C4 M2, beside Resource Pool and the Life Tap trade).
   Hollow Knight's one-pool, two-spender loop as a deterministic duel: nail hits generate SOUL, 33 SOUL buys a Focus
   (one mask back, rooted while it charges) or a spell (3x a nail hit). Three spending rules fight the same boss and
   the run is precomputed (sim), so drawing is a pure function of t. All numbers are illustrative (see the page's src note). */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD, TAU = Math.PI * 2;
  const W = 1040, H = 585;
  const BASE = { bossHP: 300, nail: 5, spell: 15, soulHit: 11, cost: 33, max: 99, focusT: 1.0, spellT: .5, nailT: .45, open: 2.4, atk: .8, masks: 5, missEvery: 3, bossDmg: 2 };
  const POL = {
    spell: { name: 'Strike: every spell', short: 'Strike', col: '#8a4fd6', f: s => s.inOpen ? 'spell' : 'wait' },
    asap: { name: 'Heal the moment it can', short: 'Heal ASAP', col: '#e5322d', f: s => s.masks < s.c.masks ? 'focus' : (s.inOpen ? 'spell' : 'wait') },
    safe: { name: 'Heal only in openings', short: 'Heal in openings', col: '#1a8a4c', f: s => s.masks < s.c.masks && s.inOpen && s.left >= s.c.focusT ? 'focus' : (s.inOpen && s.soul >= 66 ? 'spell' : 'wait') },
  };
  const ORDER = ['spell', 'asap', 'safe'];

  function sim(key, c) {
    const pol = POL[key].f, dt = .01, cyc = c.open + c.atk;
    let t = 0, hp = c.bossHP, soul = 0, masks = c.masks, act = null, last = 0, heals = 0, broken = 0, wasted = 0;
    const acts = [], atks = [], samp = [];
    while (hp > 0 && masks > 0 && t < 90) {
      const ct = t % cyc, inOpen = ct < c.open, left = c.open - ct, ci = Math.floor(t / cyc);
      if (ci > last) {   // the telegraphed attack lands at the end of each cycle
        last = ci;
        const mistake = ci % c.missEvery === 0;
        if (act && act.k === 'focus') { masks -= c.bossDmg; broken++; wasted += c.cost; act.e = t; act.broken = true; acts.push(act); act = null; atks.push({ t, r: 'broke' }); }
        else if (mistake) { masks -= c.bossDmg; atks.push({ t, r: 'hit' }); }
        else atks.push({ t, r: 'dodge' });
        if (masks <= 0) break;
      }
      if (!act) {
        const d = pol({ soul, masks, left, inOpen, c });
        if (d === 'focus' && soul >= c.cost && masks < c.masks) { soul -= c.cost; act = { k: 'focus', s: t, e: t + c.focusT }; }
        else if (d === 'spell' && soul >= c.cost && inOpen) { soul -= c.cost; act = { k: 'spell', s: t, e: t + c.spellT }; }
        else if (inOpen && left > .05) act = { k: 'nail', s: t, e: t + c.nailT };
        else act = { k: 'wait', s: t, e: t + dt };
      }
      t += dt;
      if (act && t >= act.e) {
        if (act.k === 'nail') { hp -= c.nail; soul = Math.min(c.max, soul + c.soulHit); }
        if (act.k === 'spell') hp -= c.spell;
        if (act.k === 'focus') { masks = Math.min(c.masks, masks + 1); heals++; }
        if (act.k !== 'wait') acts.push(act);
        act = null;
      }
      if (Math.round(t * 100) % 5 === 0) samp.push([t, soul, masks, Math.max(0, hp)]);
    }
    samp.push([t, soul, Math.max(0, masks), Math.max(0, hp)]);
    return { key, end: t, win: hp <= 0, masks: Math.max(0, masks), heals, broken, wasted, acts, atks, samp, c };
  }
  const at = (run, t) => { const s = run.samp; let lo = 0, hi = s.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (s[m][0] <= t) lo = m; else hi = m - 1; } return s[lo]; };
  const txt = (g, s, x, y, o = {}) => { g.font = o.font || '600 15px Jost, sans-serif'; g.fillStyle = o.col || C.ink; g.textAlign = o.align || 'left'; g.textBaseline = o.base || 'middle'; g.fillText(s, x, y); };

  /* ---------- characters ---------- */
  function knight(g, x, y, o = {}) {
    g.save(); g.translate(x, y + (o.jump || 0));
    // cloak
    g.fillStyle = '#3a4380'; g.strokeStyle = '#9aa3c8'; g.lineWidth = 2; g.beginPath(); g.moveTo(-22, 0); g.quadraticCurveTo(-26, -40, 0, -46); g.quadraticCurveTo(26, -40, 22, 0); g.closePath(); g.fill(); g.stroke();
    // legs
    g.fillStyle = '#10142c'; g.fillRect(-11, -4, 7, 12); g.fillRect(4, -4, 7, 12);
    // mask with horns
    g.fillStyle = o.flash ? '#ffb4b4' : '#f4f6ff'; g.strokeStyle = '#10142c'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(-14, -76); g.quadraticCurveTo(-20, -104, -12, -112); g.quadraticCurveTo(-10, -94, -6, -84); g.lineTo(6, -84); g.quadraticCurveTo(10, -94, 12, -112); g.quadraticCurveTo(20, -104, 14, -76); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.ellipse(0, -66, 19, 21, 0, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#10142c'; g.beginPath(); g.ellipse(-7, -64, 4.5, 7, 0, 0, TAU); g.ellipse(7, -64, 4.5, 7, 0, 0, TAU); g.fill();
    // nail
    if (o.swing != null) {
      const a = lerp(-1.6, .6, ease(o.swing));
      g.strokeStyle = '#d7dcf0'; g.lineWidth = 4; g.beginPath(); g.moveTo(16, -34); g.lineTo(16 + Math.cos(a) * 46, -34 + Math.sin(a) * 46); g.stroke();
      g.strokeStyle = `rgba(255,255,255,${.7 * (1 - o.swing)})`; g.lineWidth = 10; g.beginPath(); g.arc(16, -34, 52, -1.6, a); g.stroke();
    } else { g.strokeStyle = '#d7dcf0'; g.lineWidth = 4; g.beginPath(); g.moveTo(14, -28); g.lineTo(30, 6); g.stroke(); }
    // focus glow
    if (o.focus != null) {
      const k = o.focus; g.fillStyle = `rgba(255,236,170,${.25 + .25 * k})`; g.beginPath(); g.arc(0, -50, 46 + 10 * Math.sin(k * 12), 0, TAU); g.fill();
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + k * 3, r = 70 * (1 - k); g.fillStyle = '#fff3c4'; g.beginPath(); g.arc(Math.cos(a) * r, -50 + Math.sin(a) * r, 4, 0, TAU); g.fill(); }
    }
    g.restore();
  }
  function hornet(g, x, y, o = {}) {
    g.save(); g.translate(x, y);
    if (o.tele) { g.strokeStyle = `rgba(229,50,45,${.5 + .5 * Math.sin(o.tele * 30)})`; g.lineWidth = 6; g.beginPath(); g.arc(0, -55, 64, 0, TAU); g.stroke(); }
    g.fillStyle = o.flash ? '#ff9a9a' : '#b3262d'; g.beginPath(); g.moveTo(-26, 0); g.quadraticCurveTo(-30, -58, 0, -62); g.quadraticCurveTo(30, -58, 26, 0); g.closePath(); g.fill();
    g.fillStyle = '#10142c'; g.fillRect(-8, -4, 5, 12); g.fillRect(4, -4, 5, 12);
    g.fillStyle = '#f4f6ff'; g.strokeStyle = '#10142c'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(-10, -90); g.quadraticCurveTo(-26, -120, -8, -138); g.quadraticCurveTo(-12, -112, -2, -96); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(10, -90); g.quadraticCurveTo(26, -120, 8, -138); g.quadraticCurveTo(12, -112, 2, -96); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.ellipse(0, -80, 15, 18, 0, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#10142c'; g.beginPath(); g.ellipse(-6, -78, 3.5, 6, 0, 0, TAU); g.ellipse(6, -78, 3.5, 6, 0, 0, TAU); g.fill();
    g.strokeStyle = '#d7dcf0'; g.lineWidth = 3; g.beginPath(); g.moveTo(-20, -30); g.lineTo(-62, -14); g.stroke();
    g.restore();
  }
  function vessel(g, x, y, soul, max) {
    g.fillStyle = '#0b0f24'; g.beginPath(); g.arc(x, y, 34, 0, TAU); g.fill();
    g.save(); g.beginPath(); g.arc(x, y, 30, 0, TAU); g.clip();
    const lv = y + 30 - 60 * soul / max; g.fillStyle = '#e9ecff'; g.fillRect(x - 32, lv, 64, 70);
    g.restore();
    g.strokeStyle = '#f4f6ff'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, 34, 0, TAU); g.stroke();
    for (let k = 1; k < 3; k++) { const ly = y + 30 - 60 * k * 33 / max; g.strokeStyle = 'rgba(138,79,214,.8)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 30, ly); g.lineTo(x + 30, ly); g.stroke(); }
  }
  function mask(g, x, y, full) {
    g.save(); g.translate(x, y); g.fillStyle = full ? '#f4f6ff' : 'rgba(244,246,255,.15)'; g.strokeStyle = full ? '#f4f6ff' : 'rgba(244,246,255,.35)'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(-7, -6); g.lineTo(-9, -16); g.lineTo(-3, -9); g.lineTo(3, -9); g.lineTo(9, -16); g.lineTo(7, -6); g.quadraticCurveTo(10, 12, 0, 13); g.quadraticCurveTo(-10, 12, -7, -6); g.closePath(); g.fill(); g.stroke();
    if (full) { g.fillStyle = '#10142c'; g.beginPath(); g.ellipse(-3.5, 1, 2, 3.5, 0, 0, TAU); g.ellipse(3.5, 1, 2, 3.5, 0, 0, TAU); g.fill(); }
    g.restore();
  }

  /* ---------- the scene at time t ---------- */
  const AX = 14, AY = 12, AW = W - 28, AH = 330, KX = 400, HX = 650, GY = AY + 285;
  const TLX = 150, TLW = W - 180, TMAX = 36;
  const tx = t => TLX + TLW * clamp(t / TMAX);
  function draw(g, run, t) {
    T.use(g); g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,252,244,.9)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill();
    const c = run.c, tt = Math.min(t, run.end), [, soul, masks, hp] = at(run, tt), cyc = c.open + c.atk;
    // arena
    const grd = g.createLinearGradient(0, AY, 0, AY + AH); grd.addColorStop(0, '#26305e'); grd.addColorStop(1, '#0d1230');
    g.fillStyle = grd; g.beginPath(); g.roundRect(AX, AY, AW, AH, 12); g.fill();
    g.fillStyle = '#3a4478'; g.fillRect(AX, GY + 10, AW, AH - (GY + 10 - AY)); g.fillStyle = '#5a65a8'; g.fillRect(AX, GY + 8, AW, 3);
    // what is happening now
    const act = run.acts.find(a => tt >= a.s && tt < a.e), ct = tt % cyc, tele = ct >= c.open && tt < run.end ? (ct - c.open) / c.atk : null;
    const atk = run.atks.find(a => tt >= a.t && tt < a.t + .45);
    const ko = { }, ho = { };
    if (act?.k === 'nail') ko.swing = (tt - act.s) / (act.e - act.s);
    if (act?.k === 'focus') ko.focus = (tt - act.s) / (act.e - act.s);
    if (tele != null) ho.tele = tele;
    if (atk && atk.r !== 'dodge') ko.flash = true;
    if (atk && atk.r === 'dodge') ko.jump = -60 * Math.sin(Math.PI * (tt - atk.t) / .45);
    if (act?.k === 'nail' && ko.swing > .5) ho.flash = true;
    let hx = HX; if (atk) hx = HX - 230 * Math.sin(Math.PI * (tt - atk.t) / .45);
    knight(g, KX, GY, ko); if (run.win && t >= run.end) { g.globalAlpha = .25; } hornet(g, hx, GY, ho); g.globalAlpha = 1;
    if (act?.k === 'spell') { const k = (tt - act.s) / (act.e - act.s), sx = lerp(KX + 30, HX - 20, k); g.fillStyle = 'rgba(233,236,255,.9)'; g.beginPath(); g.ellipse(sx, GY - 60, 34, 18, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(138,79,214,.55)'; g.beginPath(); g.ellipse(sx - 26, GY - 60, 28, 12, 0, 0, TAU); g.fill(); }
    if (atk) T.popText(atk.r === 'dodge' ? 'dodged' : atk.r === 'hit' ? `−${c.bossDmg} masks` : `Focus broken · −${c.bossDmg}`, KX, GY - 150 - 30 * ((tt - atk.t) / .45), atk.r === 'dodge' ? '#8fd3ff' : '#ff6b6b', 1);
    if (tele != null && tele < .9 && !atk) txt(g, '!', HX, GY - 160, { font: '800 34px Montserrat', col: '#ff6b6b', align: 'center' });
    // HUD
    vessel(g, AX + 56, AY + 56, soul, c.max);
    for (let i = 0; i < c.masks; i++) mask(g, AX + 108 + i * 26, AY + 44, i < masks);
    txt(g, `SOUL ${Math.round(soul)}`, AX + 100, AY + 76, { font: '700 14px Jost', col: '#e9ecff' });
    const bw = 300, bx = AX + AW - bw - 24; g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(bx, AY + 24, bw, 14); g.fillStyle = '#e5322d'; g.fillRect(bx, AY + 24, bw * hp / c.bossHP, 14);
    txt(g, `Boss ${Math.ceil(hp)} / ${c.bossHP}`, bx + bw, AY + 54, { font: '700 14px Jost', col: '#e9ecff', align: 'right' });
    txt(g, POL[run.key].name, AX + AW / 2, AY + 30, { font: '800 22px Montserrat', col: '#fff', align: 'center' });
    if (t >= run.end) {
      g.fillStyle = 'rgba(10,14,34,.55)'; g.beginPath(); g.roundRect(AX + AW / 2 - 230, AY + 110, 460, 70, 12); g.fill();
      txt(g, run.win ? `Won in ${run.end.toFixed(1)} s with ${run.masks} mask${run.masks === 1 ? '' : 's'} left` : `Knight falls at ${run.end.toFixed(1)} s`, AX + AW / 2, AY + 145, { font: '800 24px Montserrat', col: run.win ? '#5fe0a0' : '#ff6b6b', align: 'center' });
    }
    // timeline
    const y0 = AY + AH + 22;
    txt(g, 'Boss', TLX - 14, y0 + 14, { font: '700 14px Jost', col: C.muted, align: 'right' });
    txt(g, 'Knight', TLX - 14, y0 + 54, { font: '700 14px Jost', col: C.muted, align: 'right' });
    txt(g, 'SOUL', TLX - 14, y0 + 118, { font: '700 14px Jost', col: C.muted, align: 'right' });
    for (let k = 0; k * cyc < TMAX; k++) {
      const a = tx(k * cyc + c.open), b = tx((k + 1) * cyc);
      g.fillStyle = 'rgba(229,50,45,.28)'; g.fillRect(a, y0, b - a, 28);
      g.fillStyle = 'rgba(46,163,220,.12)'; g.fillRect(tx(k * cyc), y0, a - tx(k * cyc), 28);
    }
    run.atks.filter(a => a.t <= tt).forEach(a => { const x = tx(a.t); txt(g, a.r === 'dodge' ? '✓' : '✗', x, y0 + 14, { font: '800 16px Jost', col: a.r === 'dodge' ? C.good : C.red, align: 'center' }); });
    run.acts.filter(a => a.s <= tt).forEach(a => {
      const x1 = tx(a.s), x2 = tx(Math.min(a.e, tt)), col = a.k === 'nail' ? '#9aa3c8' : a.k === 'spell' ? '#8a4fd6' : a.broken ? C.red : '#e0a92d';
      g.fillStyle = col; g.fillRect(x1, a.k === 'nail' ? y0 + 46 : y0 + 38, Math.max(2, x2 - x1 - 1), a.k === 'nail' ? 14 : 30);
    });
    // SOUL line
    const sy = y0 + 140, sh = 50; g.strokeStyle = 'rgba(38,44,106,.25)'; g.lineWidth = 1; [33, 66, 99].forEach(v => { g.beginPath(); g.moveTo(TLX, sy - sh * v / 99); g.lineTo(TLX + TLW, sy - sh * v / 99); g.stroke(); });
    g.strokeStyle = '#5562eb'; g.lineWidth = 2.5; g.beginPath();
    run.samp.forEach(([st, so], i) => { if (st > tt) return; const x = tx(st), y = sy - sh * so / 99; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke();
    g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.moveTo(TLX, sy); g.lineTo(TLX + TLW, sy); g.stroke();
    for (let s = 0; s <= TMAX; s += 6) txt(g, s + ' s', tx(s), sy + 14, { font: '600 12px Jost', col: C.muted, align: 'center' });
    const px = tx(tt); g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.moveTo(px, y0 - 6); g.lineTo(px, sy + 4); g.stroke();
    // legend
    [['nail', '#9aa3c8'], ['spell', '#8a4fd6'], ['Focus', '#e0a92d'], ['broken Focus', C.red]].forEach(([l, col], i) => { const lx = TLX + 10 + i * 130; g.fillStyle = col; g.fillRect(lx, H - 14, 14, 10); txt(g, l, lx + 20, H - 9, { font: '600 12px Jost', col: C.ink }); });
  }

  /* ---------- demo ---------- */
  const SPEED = 1.6;
  canvasDemo('soul', (s, cv, g) => {
    const st = { pol: 'spell', focusT: 1, dmg: 2, tour: true, t: 0, held: false, key: '', runs: null };
    const build = () => { const c = { ...BASE, focusT: st.focusT, bossDmg: st.dmg }; st.runs = Object.fromEntries(ORDER.map(k => [k, sim(k, c)])); };
    build();
    const tourBtn = $(s, '.so-tour');
    const mark = () => $$(s, '.so-pol .btn').forEach(b => b.classList.toggle('on', b.dataset.v === st.pol));
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); } };
    $$(s, '.so-pol .btn').forEach(b => b.onclick = () => { manual(); st.pol = b.dataset.v; st.t = 0; mark(); });
    $(s, '.so-f').oninput = e => { manual(); st.focusT = +e.target.value; $(s, '.so-fv').textContent = st.focusT.toFixed(1) + ' s'; build(); st.t = 0; };
    $(s, '.so-dmg').onchange = e => { manual(); st.dmg = e.target.checked ? 2 : 1; build(); st.t = 0; };
    $(s, '.so-replay').onclick = () => { st.t = 0; };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); st.focusT = 1; st.dmg = 2; $(s, '.so-f').value = 1; $(s, '.so-fv').textContent = '1.0 s'; $(s, '.so-dmg').checked = true; build(); };
    mark();
    const CAP = {
      spell: r => `Every 33 SOUL goes into a spell. Fastest kill (${r.end.toFixed(1)} s), but the hits it could not dodge leave it on ${r.masks} mask${r.masks === 1 ? '' : 's'}.`,
      asap: r => `Heals whenever it has 33 SOUL, even with an attack on the way. ${r.broken} Focus${r.broken === 1 ? '' : 'es'} broken, ${r.wasted} SOUL thrown away${r.win ? '' : ', and the Knight falls'}.`,
      safe: r => `Heals only when the opening has time left for a full Focus, spends the rest on spells. Slower (${r.end.toFixed(1)} s), ${r.masks} masks left.`,
    };
    function info(key, cap) {
      const k = key + cap; if (k === st.key) return; st.key = k;
      say($(s, '.so-stats'), ORDER.map(p => { const r = st.runs[p]; return `<div class="${{ spell: 'y', asap: 'r', safe: 'g' }[p]}"><b>${r.win ? r.end.toFixed(0) + ' s' : '✗'}</b><span>${POL[p].short}: ${r.win ? `won, ${r.masks} masks left` : 'Knight falls'} · ${r.heals} heals, ${r.broken} broken</span></div>`; }).join(''));
      say($(s, '.so-out'), cap);
    }
    // walk-through: each rule plays its whole fight, then holds 2.5 s
    const segs = () => { let a = 0; return ORDER.map(p => { const d = st.runs[p].end / SPEED + 2.5, r = { p, a, d }; a += d; return r; }); };
    const tourDur = () => segs().reduce((n, x) => n + x.d, 0) + 3;
    s._seek = t => {
      const sg = segs(), cur = sg.find(x => t < x.a + x.d);
      if (!cur) { const r = st.runs.safe; draw(g, r, r.end + 1); info('end', 'Same pool, same numbers. The skill is spending time, not only SOUL: a heal is worth a mask only if the opening is long enough to finish it.'); return; }
      st.pol = cur.p; mark(); const r = st.runs[cur.p], lt = (t - cur.a) * SPEED; draw(g, r, lt); info(cur.p, CAP[cur.p](r));
    };
    window.__seek = t => { st.held = true; s._seek(t); };
    window.__dur = () => tourDur();
    return dt => {
      if (st.held) return;
      st.t += Math.max(0, dt);
      if (st.tour) { if (st.t >= tourDur()) st.t = 0; s._seek(st.t); }
      else { const r = st.runs[st.pol]; if (st.t * SPEED > r.end + 4) st.t = 0; draw(g, r, st.t * SPEED); info(st.pol + st.focusT + st.dmg, CAP[st.pol](r)); }
    };
  });
})();
