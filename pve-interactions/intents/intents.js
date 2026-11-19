/* Enemy intents (mock-up for MGM C4 M5, beside Readable Enemies).
   One Slay the Spire turn: the Ironclad's opening hand against a Jaw Worm, a Red Louse and a Cultist. With intents shown
   the player can plan; hidden, intents read "?" until the turn ends. play(state, action) is pure, and the walk-through
   applies two scripted lines by time, so the drawing is a function of t. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD, TAU = Math.PI * 2;
  const W = 1040, H = 585;
  const IMG = new URL('../../student-tokens/256px/more-games/', document.currentScript.src).href, imgs = {};
  const im = n => { if (!imgs[n]) { imgs[n] = new Image(); imgs[n].src = IMG + 'slay-the-spire-' + n + '.png'; } return imgs[n].complete && imgs[n].naturalWidth ? imgs[n] : null; };
  ['ironclad', 'strike', 'defend', 'bash'].forEach(im);
  const CARDS = { strike: { name: 'Strike', cost: 1, dmg: 6, text: 'Deal 6' }, defend: { name: 'Defend', cost: 1, block: 5, text: 'Gain 5 Block' }, bash: { name: 'Bash', cost: 2, dmg: 8, vuln: 2, text: 'Deal 8, Vulnerable 2' } };
  const HAND = ['strike', 'bash', 'defend', 'strike', 'defend'];
  const FOES = [
    { id: 'worm', name: 'Jaw Worm', hp: 42, intent: { k: 'atk', n: 11, say: 'Chomp' }, col: '#8a6a3a', x: 600 },
    { id: 'louse', name: 'Red Louse', hp: 12, intent: { k: 'atk', n: 6, say: 'Bite' }, col: '#c8443a', x: 760 },
    { id: 'cult', name: 'Cultist', hp: 50, intent: { k: 'buff', say: 'Incantation' }, col: '#3a4a8a', x: 915 },
  ];
  const fresh = () => ({ hp: 80, energy: 3, block: 0, hand: HAND.map((c, i) => ({ c, i, used: false })), foes: FOES.map(f => ({ id: f.id, hp: f.hp, vuln: 0 })), ended: false, lost: 0, log: [] });
  function play(s, a) {
    s = JSON.parse(JSON.stringify(s));
    if (a.end) {
      if (s.ended) return s;
      let dmg = 0; s.foes.forEach((f, i) => { if (f.hp > 0 && FOES[i].intent.k === 'atk') dmg += FOES[i].intent.n; });
      const through = Math.max(0, dmg - s.block); s.hp -= through; s.lost = through; s.ended = true; s.incoming = dmg; return s;
    }
    const h = s.hand[a.card], cd = CARDS[h.c]; if (h.used || s.ended || cd.cost > s.energy) return s;
    if (cd.dmg) { const f = s.foes[a.target]; if (!f || f.hp <= 0) return s; f.hp = Math.max(0, f.hp - Math.floor(cd.dmg * (f.vuln ? 1.5 : 1))); if (cd.vuln) f.vuln += cd.vuln; }
    if (cd.block) s.block += cd.block;
    s.energy -= cd.cost; h.used = true; return s;
  }
  // the two scripted lines: [time, action]
  const LINES = {
    shown: [[2, { card: 0, target: 1 }], [3.4, { card: 3, target: 1 }], [4.8, { card: 2 }], [6.4, { end: true }]],
    hidden: [[2, { card: 1, target: 2 }], [3.6, { card: 0, target: 2 }], [5.4, { end: true }]],
  };
  const stateAt = (mode, t) => LINES[mode].filter(([at]) => at <= t).reduce((s, [, a]) => play(s, a), fresh());
  const txt = (g, s, x, y, o = {}) => { g.font = o.font || '600 15px Jost, sans-serif'; g.fillStyle = o.col || C.ink; g.textAlign = o.align || 'left'; g.textBaseline = o.base || 'middle'; g.fillText(s, x, y); };

  const GY = 300;
  function foe(g, f, st, show, sel, hit) {
    const x = f.x, alive = st.hp > 0;
    g.save(); if (!alive) g.globalAlpha = .25;
    T.shadow(x, GY + 6, 56, 14, .3);
    g.fillStyle = f.col; g.strokeStyle = C.navy; g.lineWidth = 3;
    if (f.id === 'worm') { g.beginPath(); g.ellipse(x, GY - 40, 62, 40, 0, 0, TAU); g.fill(); g.stroke(); g.fillStyle = '#f2e3c0'; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(x - 58 + i * 8, GY - 52); g.lineTo(x - 52 + i * 8, GY - 38); g.lineTo(x - 46 + i * 8, GY - 52); g.fill(); } }
    if (f.id === 'louse') { g.beginPath(); g.ellipse(x, GY - 30, 44, 30, 0, 0, TAU); g.fill(); g.stroke(); g.strokeStyle = C.navy; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(x + i * 14, GY - 4); g.lineTo(x + i * 18, GY + 6); g.stroke(); } }
    if (f.id === 'cult') { g.beginPath(); g.moveTo(x - 40, GY); g.quadraticCurveTo(x - 46, GY - 110, x, GY - 120); g.quadraticCurveTo(x + 46, GY - 110, x + 40, GY); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#e9e1c8'; g.beginPath(); g.moveTo(x - 18, GY - 130); g.lineTo(x, GY - 160); g.lineTo(x + 18, GY - 130); g.closePath(); g.fill(); g.stroke(); }
    g.fillStyle = '#fff'; g.beginPath(); g.arc(x - 12, GY - (f.id === 'cult' ? 92 : 48), 6, 0, TAU); g.arc(x + 12, GY - (f.id === 'cult' ? 92 : 48), 6, 0, TAU); g.fill();
    if (hit) { g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.arc(x, GY - 50, 60, 0, TAU); g.fill(); }
    g.restore();
    if (sel) { g.strokeStyle = C.gold; g.lineWidth = 3; g.setLineDash([6, 5]); g.beginPath(); g.ellipse(x, GY - 50, 78, 84, 0, 0, TAU); g.stroke(); g.setLineDash([]); }
    // hp bar
    const bw = 120, by = GY + 24; g.fillStyle = '#2a1c1c'; g.fillRect(x - bw / 2, by, bw, 12); g.fillStyle = '#d23a2a'; g.fillRect(x - bw / 2, by, bw * st.hp / f.hp, 12);
    txt(g, `${st.hp}/${f.hp}${st.vuln ? ' · Vulnerable ' + st.vuln : ''}`, x, by + 26, { font: '700 13px Jost', align: 'center', col: '#f3e6c8' });
    txt(g, f.name, x, by + 46, { font: '800 14px Montserrat', align: 'center', col: '#fff' });
    // intent
    if (!alive) return;
    const iy = GY - (f.id === 'cult' ? 196 : 130);
    if (!show) { g.fillStyle = '#6b6f8f'; g.beginPath(); g.arc(x, iy, 22, 0, TAU); g.fill(); txt(g, '?', x, iy + 1, { font: '800 26px Montserrat', col: '#fff', align: 'center' }); return; }
    const it = f.intent;
    if (it.k === 'atk') {
      g.save(); g.translate(x - 12, iy); g.rotate(-.7); g.fillStyle = '#e8e8f0'; g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.moveTo(-4, 18); g.lineTo(-4, -20); g.lineTo(0, -28); g.lineTo(4, -20); g.lineTo(4, 18); g.closePath(); g.fill(); g.stroke(); g.fillStyle = '#9a5a06'; g.fillRect(-10, 16, 20, 5); g.restore();
      txt(g, String(it.n), x + 12, iy + 4, { font: '800 26px Montserrat', col: '#fff', align: 'left' }); g.lineWidth = 1;
      g.strokeStyle = C.navy; g.font = '800 26px Montserrat'; g.strokeText(String(it.n), x + 12, iy + 4);
    } else { g.fillStyle = '#2fae63'; g.beginPath(); g.moveTo(x, iy - 22); g.lineTo(x + 18, iy); g.lineTo(x + 8, iy); g.lineTo(x + 8, iy + 18); g.lineTo(x - 8, iy + 18); g.lineTo(x - 8, iy); g.lineTo(x - 18, iy); g.closePath(); g.fill(); g.strokeStyle = C.navy; g.lineWidth = 2; g.stroke(); }
    T.label(it.say, x, iy - 36, 'center', C.ink, 12);
  }
  const cardRect = i => [150 + i * 150, 395, 128, 172];
  function draw(g, s, show, ui = {}) {
    T.use(g); g.clearRect(0, 0, W, H);
    const grd = g.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, '#3b3550'); grd.addColorStop(.6, '#5a4a52'); grd.addColorStop(1, '#2a2430'); g.fillStyle = grd; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill();
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, GY + 6, W, 80);
    // ironclad
    const ic = im('ironclad'); if (ic) { g.save(); g.beginPath(); g.arc(200, GY - 90, 92, 0, TAU); g.clip(); g.drawImage(ic, 108, GY - 182, 184, 184); g.restore(); g.strokeStyle = '#e9d9b0'; g.lineWidth = 4; g.beginPath(); g.arc(200, GY - 90, 92, 0, TAU); g.stroke(); }
    const bw = 160; g.fillStyle = '#2a1c1c'; g.fillRect(120, GY + 24, bw, 12); g.fillStyle = '#d23a2a'; g.fillRect(120, GY + 24, bw * s.hp / 80, 12);
    txt(g, `Ironclad ${s.hp}/80`, 200, GY + 50, { font: '800 14px Montserrat', align: 'center', col: '#fff' });
    if (s.block) { g.fillStyle = '#4a8fd6'; g.beginPath(); g.arc(110, GY + 30, 16, 0, TAU); g.fill(); txt(g, String(s.block), 110, GY + 31, { font: '800 14px Montserrat', col: '#fff', align: 'center' }); }
    const showNow = show || s.ended;
    FOES.forEach((f, i) => foe(g, f, s.foes[i], showNow, ui.target === i, ui.hit === i));
    // energy
    g.fillStyle = '#e5322d'; g.beginPath(); g.arc(70, 470, 40, 0, TAU); g.fill(); g.strokeStyle = '#ffb951'; g.lineWidth = 4; g.stroke();
    txt(g, `${s.energy}/3`, 70, 472, { font: '800 24px Montserrat', col: '#fff', align: 'center' });
    // hand
    s.hand.forEach((h, i) => {
      const [x, y, w, hh] = cardRect(i), cd = CARDS[h.c], lift = ui.card === i ? -18 : 0;
      if (h.used) return;
      g.save(); g.translate(0, lift); if (cd.cost > s.energy || s.ended) g.globalAlpha = .45;
      g.fillStyle = cd.dmg ? '#7a2a22' : '#2a5a8a'; g.strokeStyle = '#e9d9b0'; g.lineWidth = 3; g.beginPath(); g.roundRect(x, y, w, hh, 10); g.fill(); g.stroke();
      const art = im(h.c); if (art) g.drawImage(art, x + 6, y + 6, w - 12, w - 12);
      txt(g, cd.text, x + w / 2, y + hh - 22, { font: '700 13px Jost', col: '#fff', align: 'center' });
      g.fillStyle = '#e5322d'; g.beginPath(); g.arc(x + 6, y + 6, 15, 0, TAU); g.fill(); g.strokeStyle = '#ffb951'; g.lineWidth = 2; g.stroke();
      txt(g, String(cd.cost), x + 6, y + 7, { font: '800 15px Montserrat', col: '#fff', align: 'center' });
      g.restore();
    });
    if (s.ended) {
      g.fillStyle = 'rgba(10,8,20,.7)'; g.beginPath(); g.roundRect(330, 12, 400, 90, 14); g.fill();
      txt(g, `Enemies deal ${s.incoming} · block ${s.block}`, 530, 40, { font: '700 17px Jost', col: '#e9d9b0', align: 'center' });
      txt(g, `You lose ${s.lost} HP`, 530, 76, { font: '800 28px Montserrat', col: s.lost > 10 ? '#ff6b6b' : '#5fe0a0', align: 'center' });
    }
  }

  canvasDemo('intents', (s, cv, g) => {
    const st = { mode: 'shown', s: fresh(), card: null, tour: true, held: false, t: 0, key: '' };
    const tourBtn = $(s, '.si-tour');
    const mark = () => $$(s, '.si-mode .btn').forEach(b => b.classList.toggle('on', b.dataset.v === st.mode));
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); st.s = fresh(); st.card = null; } };
    $$(s, '.si-mode .btn').forEach(b => b.onclick = () => { manual(); st.mode = b.dataset.v; st.s = fresh(); st.card = null; mark(); });
    $(s, '.si-end').onclick = () => { manual(); st.s = play(st.s, { end: true }); st.card = null; };
    $(s, '.si-reset').onclick = () => { manual(); st.s = fresh(); st.card = null; };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    mark();
    cv.addEventListener('click', e => {
      const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * W / r.width, y = (e.clientY - r.top) * H / r.height;
      manual();
      const ci = st.s.hand.findIndex((h, i) => { const [cx, cy, w, hh] = cardRect(i); return !h.used && x >= cx && x <= cx + w && y >= cy - 18 && y <= cy + hh; });
      if (ci >= 0) { const cd = CARDS[st.s.hand[ci].c]; if (cd.dmg) st.card = ci; else { st.s = play(st.s, { card: ci }); st.card = null; } return; }
      const fi = FOES.findIndex(f => Math.abs(x - f.x) < 75 && y > GY - 170 && y < GY + 60);
      if (fi >= 0 && st.card != null) { st.s = play(st.s, { card: st.card, target: fi }); st.card = null; }
    });
    const lost = m => stateAt(m, 99).lost;
    function info(cap) {
      const k = cap + st.mode; if (k === st.key) return; st.key = k;
      say($(s, '.si-stats'), `<div class="g"><b>−${lost('shown')}</b><span>Intents shown: kill the Louse, block the rest</span></div><div class="r"><b>−${lost('hidden')}</b><span>Intents hidden: the hand goes into the Cultist</span></div>`);
      say($(s, '.si-out'), cap);
    }
    const SEG = 10, DUR = 2 * SEG + 4;
    s._seek = t => {
      if (t >= 2 * SEG) { const z = stateAt('shown', 99); draw(g, z, true); info('Same hand, same monsters. Showing the next move turns a guess into a puzzle with an answer; that is what makes an enemy readable.'); return; }
      const m = t < SEG ? 'shown' : 'hidden', lt = t % SEG; st.mode = m; mark();
      const z = stateAt(m, lt), next = LINES[m].find(([at]) => at > lt), ui = {};
      if (next && !next[1].end && next[0] - lt < .8) { ui.card = next[1].card; ui.target = next[1].target; }
      const prev = LINES[m].filter(([at]) => at <= lt).pop(); if (prev && lt - prev[0] < .25 && prev[1].target != null) ui.hit = prev[1].target;
      draw(g, z, m === 'shown', ui);
      info(m === 'shown' ? 'Intents shown: the Worm will Chomp for 11, the Louse Bite for 6, the Cultist only chants. Two Strikes kill the Louse, a Defend soaks 5 of the Chomp.' : 'Intents hidden: the Cultist looks like the biggest threat, so Bash and Strike go into it. It was only ever going to chant. Both attackers land.');
    };
    window.__seek = t => { st.held = true; s._seek(t); };
    window.__dur = () => DUR;
    return dt => {
      if (st.held) return;
      st.t += Math.max(0, dt);
      if (st.tour) { if (st.t >= DUR) st.t = 0; s._seek(st.t); return; }
      draw(g, st.s, st.mode === 'shown', { card: st.card });
      info(st.s.ended ? `You lost ${st.s.lost} HP this turn. Reset and try the other mode.` : st.card != null ? 'Now click an enemy to attack it.' : st.mode === 'shown' ? 'Intents shown: plan the turn against what each monster will do.' : 'Intents hidden: every monster is a question mark until the turn ends.');
    };
  });
})();
