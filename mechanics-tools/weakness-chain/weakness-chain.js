/* Weakness chain (mock-up for MGM C4 M3, beside Reverse Sequencing).
   Mega Man 2's stage select as a 3x3 grid. Each boss drops a weapon; WEAK maps each boss to the boss whose weapon beats it.
   Build a route by clicking bosses or pick a preset: forward in grid order, or backward from Quick Man. Each fight costs
   14 buster shots or 4 with the weakness (illustrative). Drawing is a function of the route and t. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD, TAU = Math.PI * 2;
  const W = 1040, H = 585;
  const B = {
    bubble: { name: 'Bubble Man', wpn: 'Bubble Lead', col: '#2fae63' },
    air: { name: 'Air Man', wpn: 'Air Shooter', col: '#2e7fd6' },
    quick: { name: 'Quick Man', wpn: 'Quick Boomerang', col: '#d8582e' },
    heat: { name: 'Heat Man', wpn: 'Atomic Fire', col: '#e5322d' },
    wood: { name: 'Wood Man', wpn: 'Leaf Shield', col: '#8a5a2b' },
    metal: { name: 'Metal Man', wpn: 'Metal Blade', col: '#c2401f' },
    flash: { name: 'Flash Man', wpn: 'Time Stopper', col: '#5fa8e8' },
    crash: { name: 'Crash Man', wpn: 'Crash Bomber', col: '#e58a2a' },
  };
  const GRID = [['bubble', 'air', 'quick'], ['heat', null, 'wood'], ['metal', 'flash', 'crash']];
  const WEAK = { bubble: 'metal', air: 'wood', quick: 'crash', heat: 'bubble', wood: 'heat', metal: 'quick', flash: 'metal', crash: 'air' };
  const BUSTER = 14, WEAKN = 4;
  const FWD = ['bubble', 'air', 'quick', 'heat', 'wood', 'metal', 'flash', 'crash'];
  const BACK = ['metal', 'bubble', 'heat', 'wood', 'air', 'crash', 'quick', 'flash'];
  const CX = 30, CY = 30, CW = 170, CH = 165;
  const cell = k => { for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if (GRID[r][c] === k) return [CX + c * CW + CW / 2, CY + r * CH + CH / 2]; };
  const txt = (g, s, x, y, o = {}) => { g.font = o.font || '600 15px Jost, sans-serif'; g.fillStyle = o.col || C.ink; g.textAlign = o.align || 'left'; g.textBaseline = o.base || 'middle'; g.fillText(s, x, y); };
  const cost = route => route.map((k, i) => { const has = route.slice(0, i).includes(WEAK[k]); return { k, has, shots: has ? WEAKN : BUSTER }; });

  function head(g, x, y, col, s = 1, dim = false) {
    g.save(); g.translate(x, y); g.scale(s, s); if (dim) g.globalAlpha = .35;
    g.fillStyle = col; g.strokeStyle = C.navy; g.lineWidth = 3;
    g.beginPath(); g.arc(0, 0, 34, Math.PI, 0); g.lineTo(34, 18); g.quadraticCurveTo(0, 30, -34, 18); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#ffd9b3'; g.beginPath(); g.roundRect(-20, -6, 40, 30, 8); g.fill(); g.stroke();
    g.fillStyle = C.navy; g.fillRect(-11, 2, 6, 9); g.fillRect(5, 2, 6, 9);
    g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.ellipse(-12, -20, 10, 5, -.4, 0, TAU); g.fill();
    g.restore();
  }
  function megaman(g, x, y) { head(g, x, y, '#2f7bff', 1.1); g.fillStyle = '#8fd3ff'; g.beginPath(); g.ellipse(x, y - 26, 10, 5, 0, 0, TAU); g.fill(); }
  function arrow(g, from, to, col, a = 1, w = 3) {
    const [x1, y1] = cell(from), [x2, y2] = cell(to), mx = (x1 + x2) / 2 + (y2 - y1) * .18, my = (y1 + y2) / 2 - (x2 - x1) * .18;
    const ang = Math.atan2(y2 - my, x2 - mx), ex = x2 - Math.cos(ang) * 48, ey = y2 - Math.sin(ang) * 48;
    g.save(); g.globalAlpha = a; g.strokeStyle = col; g.fillStyle = col; g.lineWidth = w;
    g.beginPath(); g.moveTo(x1, y1); g.quadraticCurveTo(mx, my, ex, ey); g.stroke();
    g.beginPath(); g.moveTo(ex + Math.cos(ang) * 12, ey + Math.sin(ang) * 12); g.lineTo(ex + Math.cos(ang + 2.5) * 10, ey + Math.sin(ang + 2.5) * 10); g.lineTo(ex + Math.cos(ang - 2.5) * 10, ey + Math.sin(ang - 2.5) * 10); g.closePath(); g.fill();
    g.restore();
  }

  function draw(g, route, shown, opt) {
    T.use(g); g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,252,244,.9)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill();
    g.fillStyle = '#10163a'; g.beginPath(); g.roundRect(CX - 12, CY - 12, 3 * CW + 24, 3 * CH + 24, 14); g.fill();
    const done = route.slice(0, shown), costs = cost(route);
    GRID.forEach((row, r) => row.forEach((k, c) => {
      const x = CX + c * CW, y = CY + r * CH;
      g.fillStyle = '#1d2558'; g.strokeStyle = '#3d4aa0'; g.lineWidth = 2; g.beginPath(); g.roundRect(x + 8, y + 8, CW - 16, CH - 16, 10); g.fill(); g.stroke();
      if (!k) { megaman(g, x + CW / 2, y + CH / 2 - 8); txt(g, 'MEGA MAN', x + CW / 2, y + CH - 24, { font: '800 14px Montserrat', col: '#8fd3ff', align: 'center' }); return; }
      const i = done.indexOf(k), beat = i >= 0, focus = opt.focus === k;
      if (focus) { g.strokeStyle = C.gold; g.lineWidth = 4; g.beginPath(); g.roundRect(x + 5, y + 5, CW - 10, CH - 10, 12); g.stroke(); }
      head(g, x + CW / 2, y + CH / 2 - 14, B[k].col, 1, beat);
      if (beat) { const cc = costs[i]; g.fillStyle = cc.has ? C.good : C.red; g.beginPath(); g.arc(x + 26, y + 26, 15, 0, TAU); g.fill(); txt(g, String(i + 1), x + 26, y + 27, { font: '800 15px Montserrat', col: '#fff', align: 'center' }); }
    }));
    if (opt.arrows) Object.entries(WEAK).forEach(([k, by]) => { const lit = opt.chain && opt.chain.includes(k) && opt.chain.includes(by); arrow(g, by, k, lit ? C.gold : '#8fd3ff', lit ? 1 : .35, lit ? 4 : 2.5); });
    GRID.forEach((row, r) => row.forEach((k, c) => {
      if (!k) return; const x = CX + c * CW, y = CY + r * CH;
      g.fillStyle = 'rgba(16,22,58,.88)'; g.beginPath(); g.roundRect(x + 14, y + CH - 52, CW - 28, 40, 6); g.fill();
      txt(g, B[k].name.toUpperCase(), x + CW / 2, y + CH - 40, { font: '800 13px Montserrat', col: '#fff', align: 'center' });
      txt(g, 'drops ' + B[k].wpn, x + CW / 2, y + CH - 22, { font: '600 12px Jost', col: '#a9b7d6', align: 'center' });
      const i = done.indexOf(k); if (i >= 0) { const cc = costs[i]; g.fillStyle = cc.has ? C.good : C.red; g.beginPath(); g.arc(x + 26, y + 26, 15, 0, TAU); g.fill(); txt(g, String(i + 1), x + 26, y + 27, { font: '800 15px Montserrat', col: '#fff', align: 'center' }); }
    }));
    // route panel
    const PX = 3 * CW + 64, PW = W - PX - 20;
    txt(g, 'Your route', PX, 34, { font: '800 20px Montserrat', col: C.navy });
    txt(g, 'shots to win each fight', PX + PW, 36, { font: '600 12px Jost', col: C.muted, align: 'right' });
    for (let i = 0; i < 8; i++) {
      const y = 58 + i * 50, cc = costs[i];
      g.fillStyle = i < shown ? 'rgba(239,230,210,.95)' : 'rgba(239,230,210,.4)'; g.beginPath(); g.roundRect(PX, y, PW, 42, 8); g.fill();
      txt(g, String(i + 1), PX + 16, y + 21, { font: '800 16px Montserrat', col: C.muted, align: 'center' });
      if (!cc || i >= shown) continue;
      head(g, PX + 46, y + 22, B[cc.k].col, .45);
      txt(g, B[cc.k].name, PX + 70, y + 14, { font: '700 14px Jost' });
      txt(g, cc.has ? 'with ' + B[WEAK[cc.k]].wpn : 'Mega Buster only', PX + 70, y + 31, { font: '600 12px Jost', col: cc.has ? C.good : C.redDk });
      const bx = PX + 210, bw = PW - 250; g.fillStyle = cc.has ? C.good : C.red; g.fillRect(bx, y + 13, bw * cc.shots / BUSTER, 16);
      txt(g, String(cc.shots), bx + bw * cc.shots / BUSTER + 8, y + 21, { font: '800 14px Jost' });
    }
    const tot = costs.slice(0, shown).reduce((n, c) => n + c.shots, 0), slogs = costs.slice(0, shown).filter(c => !c.has).length;
    txt(g, `${tot} shots · ${slogs} buster fight${slogs === 1 ? '' : 's'}`, PX, 470, { font: '800 20px Montserrat', col: C.navy });
    if (shown >= 8) { const crash = route.indexOf('crash') >= 0; txt(g, crash ? 'Wily 4: the Boobeam Trap falls only to the Crash Bomber ✓' : '', PX, 500, { font: '600 13px Jost', col: C.muted }); }
  }

  canvasDemo('chain', (s, cv, g) => {
    const st = { route: [], tour: true, held: false, t: 0, arrows: true, key: '' };
    const tourBtn = $(s, '.wc-tour');
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); st.route = []; } };
    const preset = r => { manual(); st.route = r.slice(); st.t = 0; };
    $$(s, '.wc-plan .btn').forEach(b => b.onclick = () => { preset(b.dataset.v === 'fwd' ? FWD : BACK); $$(s, '.wc-plan .btn').forEach(x => x.classList.toggle('on', x === b)); });
    $(s, '.wc-arrows').onchange = e => { st.arrows = e.target.checked; };
    $(s, '.wc-clear').onclick = () => { manual(); st.route = []; $$(s, '.wc-plan .btn').forEach(x => x.classList.remove('on')); };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    cv.addEventListener('click', e => {
      const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * W / r.width, y = (e.clientY - r.top) * H / r.height;
      const c = Math.floor((x - CX) / CW), rr = Math.floor((y - CY) / CH); if (c < 0 || c > 2 || rr < 0 || rr > 2) return;
      const k = GRID[rr][c]; if (!k) return; manual(); $$(s, '.wc-plan .btn').forEach(x => x.classList.remove('on'));
      if (!st.route.includes(k)) st.route.push(k);
    });
    function info(cap, route, shown) {
      const k = cap + route.join() + shown; if (k === st.key) return; st.key = k;
      const sum = r => cost(r).reduce((n, c) => n + c.shots, 0), sl = r => cost(r).filter(c => !c.has).length;
      say($(s, '.wc-stats'), `<div class="r"><b>${sum(FWD)}</b><span>Forward, as the grid reads: ${sl(FWD)} buster fights</span></div><div class="g"><b>${sum(BACK)}</b><span>Backward from Quick Man: ${sl(BACK)} buster fight</span></div>${route.length && !st.tour ? `<div><b>${sum(route.slice(0, shown))}</b><span>Your route so far</span></div>` : ''}`);
      say($(s, '.wc-out'), cap);
    }
    // walk-through: forward route fills (0-9 s), backward chain traced from Quick Man (9-17 s), backward route fills (17-26 s)
    const DUR = 30;
    s._seek = t => {
      if (t < 10) { const n = clamp(Math.floor(t / 1.1), 0, 8); draw(g, FWD, n, { arrows: false }); info('Forward: fight them as the menu reads, Bubble Man first. You keep arriving before you hold the weakness: three long buster fights.', FWD, n); return; }
      if (t < 18) { const n = clamp(Math.floor((t - 10) / 1.1) + 1, 1, 7), chain = ['quick', 'crash', 'air', 'wood', 'heat', 'bubble', 'metal'].slice(0, n); draw(g, [], 0, { arrows: true, chain, focus: chain[chain.length - 1] }); info(`Backward: start at the boss you fear, Quick Man. What beats him? ${chain.slice(1).map(k => B[k].wpn).join(', then ') || '…'}`, [], 0); return; }
      const n = clamp(Math.floor((t - 18) / 1.1), 0, 8); draw(g, BACK, n, { arrows: true, chain: BACK }); info('Walk the chain forward again from Metal Man. One buster fight, seven with the weakness in hand.', BACK, n);
    };
    window.__seek = t => { st.held = true; s._seek(t); };
    window.__dur = () => DUR;
    return dt => {
      if (st.held) return;
      st.t += Math.max(0, dt);
      if (st.tour) { if (st.t >= DUR) st.t = 0; s._seek(st.t); return; }
      const n = Math.min(st.route.length, Math.floor(st.t / .5) + 1);
      draw(g, st.route, st.route.length ? n : 0, { arrows: st.arrows });
      const c = cost(st.route), sl = c.filter(x => !x.has).length;
      info(st.route.length ? `${st.route.length} of 8 beaten, ${sl} with the buster alone. ${st.route.length < 8 ? 'Click the next boss.' : sl <= 1 ? 'A clean chain.' : 'Try starting from the boss you find hardest and work back.'}` : 'Click a boss to fight it first. Each weapon you earn beats one other boss.', st.route, n);
    };
  });
})();
