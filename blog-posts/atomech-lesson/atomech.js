/* Atomech: the first year of an indie game (Alex Brazie), three spikes.
   runway: February 2015 to February 2016 as the article tells it: who was on the team when, the savings burning down,
           and what happened each month. Dates the article gives are exact; the rest are placed by its order.
           Data in PEOPLE, MONEY, EVENTS.
   order:  hardest problem first, or snowball the small wins? A toy project: ten small features and one hard core
           problem. Snowballing builds momentum but whatever the hard problem changes must be rebuilt; attacking it first
           is slow but nothing gets thrown away. Sliders for rework and momentum. Model in plan().
   multi:  the Multi-Actor Gameplay rules from the design doc: one Active unit, two Passive. Call brings a Passive in
           for a while, holding a share of the life pool (Echelon 20%, Coil 30%, Phalanx 40%); a second Call swaps;
           Command makes the called unit attack. Rules in SHARE and the scripted SCENE. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;
  const W = 1040, H = 585;
  const panel = g => { g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(255,252,244,.8)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill(); };
  const txt = (g, s, x, y, font, col = C.ink, al = 'left') => { g.font = font; g.fillStyle = col; g.textAlign = al; g.textBaseline = 'middle'; g.fillText(s, x, y); };
  const box = (g, x, y, w, h, fill, stroke, r = 10, lw = 2) => { g.beginPath(); g.roundRect(x, y, w, h, r); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); } };
  const wrap = (g, s, font, maxW) => { g.font = font; const out = []; let line = ''; s.split(' ').forEach(w => { const tl = line ? line + ' ' + w : w; if (g.measureText(tl).width > maxW && line) { out.push(line); line = w; } else line = tl; }); if (line) out.push(line); return out; };
  const freeOf = (st, btn) => () => { st.tour = false; btn.classList.remove('on'); };
  const apis = {};

  /* ---------- 1: the runway ---------- */
  const MONTHS = ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'];
  // [name, job, from, to, faded from] in months since February 2015
  const PEOPLE = [
    ['John Trickett', 'business, funding, story', 0, 13],
    ['Alex', 'code, rigs, animation, placeholder art', 0, 13],
    ['Max Song', 'concept art', 0, 7.5, 5.4],
    ['Vexe (Ali)', 'Unity editor tools', 2, 3.6],
    ['David Spachek', 'prototype help (student)', 3, 8],
    ['J.D. Merwe', 'animation', 4.3, 13],
    ['Sarah', 'illustration details', 5, 6.4],
    ['Art tests', 'Gwyn Conaway, Kelli Toki', 6, 7.6],
    ['Simone Maendl', 'backgrounds → art director', 6.2, 13],
    ['Taedu', 'characters', 7.4, 11.2],
  ];
  // savings in thousands of dollars: $70k at the start, half gone by July, gone in September
  const MONEY = [[0, 70], [5, 35], [7.3, 0], [10.6, 0], [11, 0]];
  const EVENTS = [
    [0, 'Three founders', 'Alex codes the prototype, John covers business and story, and Max, found through a Facebook post, joins as the artist with no screening.', 'Hiring without a test'],
    [2, 'Fast help, gone fast', 'Vexe clears Unity roadblocks, wraps one key feature and leaves. Riot stock options must be bought within 30 days; family and a friend cover it.', ''],
    [4.3, 'Animation surges', 'J.D. Merwe’s animations make the monsters feel alive. Alex is splitting time between animation, in-game assets and features: everything waits on him.', 'Easy to get lost in low-friction problems'],
    [5.4, 'Halfway through the runway', 'Max hasn’t learned the engine; concepts slow, then stop. Early tests show waiting for teammates is boring, so co-op puzzle becomes action battler.', 'Core gameplay still unproven'],
    [5.95, 'Expectations on paper', 'July 31: each founder lists what they will do. Max only wants to oversee concepts. A few weeks later he steps back.', ''],
    [6.3, 'A proper art test', 'Three artists, screened by friends, try the same brief. Vector art is still a fixed choice.', 'Don’t pick the tech first, then make the art follow it'],
    [7.3, 'Savings gone', 'Spending gets tracked. Simone nails a paintover; Taedu joins on characters. September 18: the story is cut to a third, and the game gets its name and URL.', 'Cut scope to fit'],
    [9, 'Teaching to pay rent', 'November: game design lessons on Twitter cover rent and a plane ticket. No idea yet where funding will come from.', ''],
    [10.3, 'Manchester', 'December: Alex moves in with John. His first consulting client’s game ships, a small boost.', ''],
    [11, 'The buyout lands', 'January 2016: Riot’s buyout clears, a tax bill and enough to fund the game. John: “Small bets, spread out over time. Not one big bet.”', 'Small bets'],
    [12, 'Clitheroe jam', 'February 2016: JD and Simone fly in for a game jam; Simone takes over the style guide as art director, a step that should have come sooner.', ''],
  ];
  canvasDemo('runway', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, m: 0, drag: false, key: '' };
    const tourBtn = $(s, '.rw-tour'), free = freeOf(st, tourBtn);
    const X0 = 196, XW = 812, mx = m => X0 + m / 13 * XW;
    const toM = e => { const b = cv.getBoundingClientRect(); return clamp(((e.clientX - b.left) * W / b.width - X0) / XW * 13, 0, 12.99); };
    cv.addEventListener('pointerdown', e => { free(); st.drag = true; st.m = toM(e); });
    cv.addEventListener('pointermove', e => { if (st.drag) st.m = toM(e); });
    addEventListener('pointerup', () => { st.drag = false; });
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    const PER = 2.6, DUR = PER * EVENTS.length + 2;
    function render() {
      const t = st.t;
      if (st.tour) { const k = Math.min(EVENTS.length - 1, Math.floor(t / PER)); st.m = lerp(EVENTS[k][0], (EVENTS[k + 1] || [13])[0] - .01, clamp((t - k * PER) / PER)) * 0 + EVENTS[k][0] + .02; }
      const m = st.m, ev = EVENTS.filter(e => e[0] <= m + .03).at(-1) || EVENTS[0];
      T.use(g); panel(g);
      // month axis
      MONTHS.forEach((n, i) => { const x = mx(i); g.fillStyle = i % 2 ? 'rgba(21,32,68,.035)' : 'rgba(21,32,68,.07)'; g.fillRect(x, 26, XW / 13, 398); txt(g, n, x + XW / 26, 40, '700 13px Jost', i === 11 || i === 12 ? C.goldInk : C.muted, 'center'); });
      txt(g, '2015', mx(0) + 4, 18, '800 12px Montserrat', C.muted); txt(g, '2016', mx(11) + 4, 18, '800 12px Montserrat', C.goldInk);
      // savings
      txt(g, 'Savings', 24, 82, '800 14px Montserrat'); txt(g, '$70k at the start', 24, 100, '600 12px Jost', C.muted);
      const my = v => 120 - v / 70 * 56;
      g.fillStyle = 'rgba(47,174,99,.18)'; g.beginPath(); g.moveTo(mx(0), my(0)); MONEY.forEach(([a, v]) => g.lineTo(mx(a), my(v))); g.lineTo(mx(11), my(0)); g.fill();
      g.strokeStyle = C.good; g.lineWidth = 3; g.beginPath(); MONEY.forEach(([a, v], i) => i ? g.lineTo(mx(a), my(v)) : g.moveTo(mx(a), my(v))); g.stroke();
      // the buyout
      g.strokeStyle = C.goldInk; g.lineWidth = 3; g.beginPath(); g.moveTo(mx(11), my(0)); g.lineTo(mx(11.2), 56); g.lineTo(mx(13) - 4, 56); g.stroke();
      txt(g, 'buyout cash', mx(11.3), 66, '700 12px Jost', C.goldInk);
      txt(g, 'broke', mx(8.6), my(0) - 10, '700 12px Jost', C.redDk, 'center');
      // people
      PEOPLE.forEach(([n, job, a, b, fade], i) => {
        const y = 146 + i * 27;
        txt(g, n, 24, y, '700 13px Jost');
        const on = m >= a && m < b;
        if (fade) { box(g, mx(a), y - 9, mx(fade) - mx(a), 18, on ? '#5562eb' : 'rgba(85,98,235,.55)', null, 6); box(g, mx(fade), y - 9, mx(b) - mx(fade), 18, 'rgba(85,98,235,.18)', null, 6); txt(g, 'no new concepts', mx(fade) + 6, y, '600 11px Jost', C.muted); }
        else box(g, mx(a), y - 9, Math.max(6, mx(b) - mx(a) - 2), 18, on ? '#5562eb' : 'rgba(85,98,235,.55)', null, 6);
        if (mx(b) - mx(a) > 140 && !fade) txt(g, job, mx(a) + 8, y, '600 11px Jost', '#fff');
      });
      // the proof-of-fun track
      const py = 146 + PEOPLE.length * 27 + 4;
      txt(g, 'Core fun proven?', 24, py, '800 13px Montserrat', C.redDk);
      g.setLineDash([6, 5]); g.strokeStyle = C.redDk; g.lineWidth = 2; g.beginPath(); g.moveTo(mx(0), py); g.lineTo(mx(13), py); g.stroke(); g.setLineDash([]);
      txt(g, 'not yet', mx(12.5), py - 10, '700 11px Jost', C.redDk, 'center');
      GI.draw(g, 'jigsaw-piece', mx(5.6), py, 16, C.redDk); txt(g, 'co-op puzzle → action battler', mx(5.6) + 12, py - 12, '600 11px Jost', C.redDk);
      // event pins
      EVENTS.forEach(e => { const x = mx(e[0]), cur = e === ev; g.fillStyle = cur ? C.gold : C.navy; g.beginPath(); g.arc(x, 52, cur ? 7 : 4, 0, 7); g.fill(); });
      // cursor
      const cx = mx(m); g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.moveTo(cx, 26); g.lineTo(cx, 430); g.stroke();
      // the month's story
      box(g, 24, 440, 992, 132, '#fffaf0', '#cdbf9f', 12, 2);
      const mi = Math.floor(ev[0]);
      txt(g, `${MONTHS[mi]} ${mi >= 11 ? 2016 : 2015}`, 44, 464, '800 14px Montserrat', C.goldInk);
      txt(g, ev[1], 150, 464, '800 19px Montserrat');
      wrap(g, ev[2], '500 16px Jost', ev[3] ? 600 : 940).slice(0, 3).forEach((l, i) => txt(g, l, 44, 496 + i * 22, '500 16px Jost'));
      if (ev[3]) { box(g, 680, 482, 318, 72, 'rgba(255,185,81,.18)', '#e0a92d', 10, 2); txt(g, 'Lesson', 696, 498, '800 12px Montserrat', C.goldInk); wrap(g, ev[3], '700 15px Jost', 290).slice(0, 2).forEach((l, i) => txt(g, l, 696, 520 + i * 20, '700 15px Jost')); }
      const key = EVENTS.indexOf(ev); if (key === st.key) return; st.key = key;
      say($(s, '.rw-out'), key < 6 ? 'Drag across the timeline. Watch which problems got attention, and which one, proving the core fun, never did.' : key < 9 ? 'By the time the art pipeline worked, the money was gone. The hardest problem was still the first one.' : 'A year in: a real team, a style guide and funding, and still no proof the core gameplay was fun.');
    }
    apis.runway = { seek(t) { st.held = st.tour = true; st.t = t; render(); }, dur: () => DUR };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > DUR) st.t = 0; render(); };
  });

  /* ---------- 2: hardest first, or snowball? ---------- */
  // ten small features (six of them sit on top of the core), one hard core problem worth 4 months at base speed
  const PROJ = { small: 10, onCore: 6, hard: 4, runway: 12 };
  function plan(strategy, rework, momentum) {
    // returns the blocks of work in order with start and end month, and the month the project is done
    let t = 0, wins = 0; const blocks = [];
    const speed = () => 1 + momentum * Math.min(wins, 6) / 6;   // quick wins speed you up, up to +momentum
    const add = (kind, size, label) => { const d = size / speed(); blocks.push({ kind, a: t, b: t + d, label }); t += d; if (kind === 'small') wins++; };
    if (strategy === 'hard') { add('hard', PROJ.hard, 'core problem'); for (let i = 0; i < PROJ.small; i++) add('small', 1, ''); }
    else {
      for (let i = 0; i < PROJ.small; i++) add('small', 1, '');
      add('hard', PROJ.hard, 'core problem');
      const redo = PROJ.onCore * rework; if (redo > .01) add('redo', redo, 'rebuild');
    }
    return { blocks, done: t };
  }
  canvasDemo('order', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, rework: .5, mom: .5, key: '' };
    const tourBtn = $(s, '.od-tour'), free = freeOf(st, tourBtn), rIn = $(s, '.od-rw'), mIn = $(s, '.od-mom');
    rIn.oninput = () => { free(); st.rework = rIn.value / 100; }; mIn.oninput = () => { free(); st.mom = mIn.value / 100; };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    const DUR = 20;
    function render() {
      const t = st.t;
      if (st.tour) {
        if (t < 6) { st.rework = .1; st.mom = .6; } else if (t < 13) { st.rework = lerp(.1, 1, ease(clamp((t - 6) / 5))); st.mom = .6; } else { st.rework = 1; st.mom = lerp(.6, 0, ease(clamp((t - 13) / 5))); }
        rIn.value = st.rework * 100; mIn.value = st.mom * 100;
      }
      $(s, '.od-rv').textContent = Math.round(st.rework * 100) + '%'; $(s, '.od-mv').textContent = '+' + Math.round(st.mom * 100) + '%';
      const P = { snow: plan('snow', st.rework, st.mom), hard: plan('hard', st.rework, st.mom) };
      T.use(g); panel(g);
      txt(g, 'Ten small features and one hard core problem', 24, 30, '800 19px Montserrat');
      const X0 = 230, XW = 770, MAXM = 20, mx = m => X0 + m / MAXM * XW;
      for (let m = 0; m <= MAXM; m += 2) { g.fillStyle = '#efe4cc'; g.fillRect(mx(m), 60, 1, 370); txt(g, String(m), mx(m), 448, '600 12px Jost', C.muted, 'center'); }
      txt(g, 'months', X0 + XW, 468, '600 12px Jost', C.muted, 'right');
      // the runway
      g.fillStyle = 'rgba(229,50,45,.08)'; g.fillRect(mx(PROJ.runway), 60, mx(MAXM) - mx(PROJ.runway), 370);
      g.strokeStyle = C.redDk; g.lineWidth = 2; g.setLineDash([6, 4]); g.beginPath(); g.moveTo(mx(PROJ.runway), 54); g.lineTo(mx(PROJ.runway), 436); g.stroke(); g.setLineDash([]);
      txt(g, 'money runs out', mx(PROJ.runway) + 6, 66, '700 12px Jost', C.redDk);
      const COL = { small: ['#d8f0df', '#5fb47c'], hard: ['#fde9b8', '#e0a92d'], redo: ['#f9d9d6', '#e07b72'] };
      [['snow', 'Snowball first', 'small wins, then the core'], ['hard', 'Hardest first', 'the core, then small wins']].forEach(([k, n, sub], r) => {
        const y = 110 + r * 170, p = P[k];
        txt(g, n, 24, y + 10, '800 17px Montserrat'); txt(g, sub, 24, y + 32, '600 13px Jost', C.muted);
        p.blocks.forEach(b => { const [fill, stroke] = COL[b.kind]; box(g, mx(b.a) + 1, y - 10, Math.max(3, mx(b.b) - mx(b.a) - 2), 56, fill, stroke, 6, 1.5); if (b.label && mx(b.b) - mx(b.a) > 80) txt(g, b.label, (mx(b.a) + mx(b.b)) / 2, y + 18, '700 12px Jost', C.ink, 'center'); });
        // first proof that the core works
        const core = p.blocks.find(b => b.kind === 'hard');
        GI.draw(g, 'trophy', mx(core.b), y - 26, 20, C.goldInk); txt(g, `core proven: month ${core.b.toFixed(1)}`, mx(core.b) + 14, y - 26, '700 12px Jost', C.goldInk);
        const late = p.done > PROJ.runway;
        txt(g, `done: month ${p.done.toFixed(1)}`, mx(Math.min(MAXM, p.done)) + 6, y + 64, '800 14px Montserrat', late ? C.redDk : C.good);
      });
      // legend
      [['small', 'small feature'], ['hard', 'hard core problem'], ['redo', 'rework']].forEach(([k, n], i) => { box(g, 230 + i * 190, 500, 22, 16, COL[k][0], COL[k][1], 4, 1.5); txt(g, n, 260 + i * 190, 508, '600 14px Jost'); });
      const sd = P.snow.done, hd = P.hard.done, win = Math.abs(sd - hd) < .3 ? 'tie' : sd < hd ? 'snow' : 'hard';
      T.stamp(win === 'tie' ? 'About even' : win === 'snow' ? 'Snowball finishes first' : 'Hardest-first finishes first', 520, 548, win === 'hard' ? C.good : win === 'snow' ? '#2ea3dc' : C.goldInk, 1, 20);
      const key = [Math.round(st.rework * 20), Math.round(st.mom * 20)].join(); if (key === st.key) return; st.key = key;
      say($(s, '.od-out'), win === 'snow'
        ? `When the core changes little of what you built (${Math.round(st.rework * 100)}% rework) and quick wins speed you up, snowballing works: small features stack and carry momentum into the hard part.`
        : win === 'hard'
          ? `When the core reshapes everything on top of it (${Math.round(st.rework * 100)}% rework), snowballing pays twice. Attack the hard problem first, and build for multiplayer first if it is multiplayer.`
          : 'Here the two plans land about the same. Either way, note when the core is proven: hardest-first knows months earlier whether the game works.');
    }
    apis.order = { seek(t) { st.held = st.tour = true; st.t = t; render(); }, dur: () => DUR };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > DUR) st.t = 0; render(); };
  });

  /* ---------- 3: call and swap ---------- */
  const UNITS = {
    phalanx: { n: 'Phalanx', share: .4, col: '#2ea3dc', ic: 'checked-shield', note: 'shield soldier' },
    coil: { n: 'Coil', share: .3, col: '#2fae63', ic: 'crosshair', note: 'sniper veteran' },
    echelon: { n: 'Echelon', share: .2, col: '#8a4fd6', ic: 'laptop', note: 'hacker' },
  };
  const CALL_DUR = 5;
  // the scripted scene: [time, action, unit]
  const SCENE = [[1, 'call', 'coil'], [2.2, 'command', 'coil'], [3.4, 'hit', 'coil'], [4.2, 'hit', 'coil'], [5, 'hit', 'coil'], [9, 'call', 'echelon'], [10.5, 'call', 'echelon'], [12.4, 'call', 'phalanx'], [17.6, 'end', '']];
  function simulate(events, upto) {
    // life pool 100; the called unit holds share × pool; damage to it drains its share; if its share empties it leaves and that life is lost;
    // if its time runs out the rest goes back to the Active unit
    let active = 'phalanx', called = null, callAt = 0, pool = 100, held = 0, log = [];
    for (const [tm, a, u] of events) {
      if (tm > upto) break;
      if (called && tm - callAt >= CALL_DUR) { log.push([callAt + CALL_DUR, `${UNITS[called].n}’s time is up: ${Math.round(held)} life returns`]); called = null; held = 0; }
      if (a === 'call') {
        if (called === u) { log.push([tm, `Second Call: swap. ${UNITS[u].n} becomes the Active unit`]); active = u; called = null; held = 0; }
        else if (u !== active) { called = u; callAt = tm; held = pool * UNITS[u].share; log.push([tm, `Call ${UNITS[u].n}: joins, holding ${Math.round(UNITS[u].share * 100)}% of the life pool`]); }
      } else if (a === 'command' && called) log.push([tm, `Command: ${UNITS[called].n} attacks with you`]);
      else if (a === 'hit' && !called) { pool -= 11; log.push([tm, `${UNITS[active].n} (Active) is hit: −11`]); }
      else if (a === 'hit' && called) { const d = 11; held -= d; pool -= d; log.push([tm, `${UNITS[called].n} is hit: −${d}`]); if (held <= 0) { log.push([tm, `${UNITS[called].n}’s share is gone: leaves early`]); called = null; held = 0; } }
    }
    if (called && upto - callAt >= CALL_DUR) { log.push([callAt + CALL_DUR, `${UNITS[called].n}’s time is up`]); called = null; held = 0; }
    return { active, called, callAt, pool, held, log };
  }
  canvasDemo('multi', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, ev: [], t0: 0, key: '' };
    const tourBtn = $(s, '.mu-tour'), free = freeOf(st, tourBtn);
    const now = () => st.t - st.t0;
    $$(s, '.mu-call').forEach(b => b.onclick = () => { if (st.tour) { free(); st.ev = []; st.t0 = st.t; } st.ev.push([now(), 'call', b.dataset.u]); });
    $(s, '.mu-cmd').onclick = () => { if (st.tour) { free(); st.ev = []; st.t0 = st.t; } st.ev.push([now(), 'command', '']); };
    $(s, '.mu-hit').onclick = () => { if (st.tour) { free(); st.ev = []; st.t0 = st.t; } st.ev.push([now(), 'hit', '']); };
    $(s, '.mu-reset').onclick = () => { free(); st.ev = []; st.t0 = st.t; };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    const DUR = 18;
    function render() {
      const u = st.tour ? st.t : now(), ev = st.tour ? SCENE : st.ev.map(([a, k, x]) => [a, k, x || (simulate(st.ev, a - 1e-6).called || '')]);
      const S = simulate(ev, u), A = UNITS[S.active];
      T.use(g); panel(g);
      // layers: background (passive units wait here) and foreground
      g.fillStyle = '#c9d6f2'; g.beginPath(); g.roundRect(24, 24, 992, 310, 12); g.fill();
      g.fillStyle = 'rgba(21,32,68,.12)'; g.fillRect(24, 150, 992, 70);
      txt(g, 'background layer: Passive units, no input', 40, 140, '700 13px Jost', C.muted);
      g.fillStyle = '#ddd2bc'; g.fillRect(24, 280, 992, 54);
      txt(g, 'foreground: the Active unit, full controller input', 40, 316, '700 13px Jost', C.muted);
      const ax = 380;
      const fig = (k, x, y, sc, alpha, ring) => { const U = UNITS[k]; g.globalAlpha = alpha; g.fillStyle = U.col; g.beginPath(); g.arc(x, y, 30 * sc, 0, 7); g.fill(); GI.draw(g, U.ic, x, y, 34 * sc, '#fff'); if (ring) { g.strokeStyle = C.gold; g.lineWidth = 4; g.beginPath(); g.arc(x, y, 36 * sc, 0, 7); g.stroke(); } txt(g, U.n, x, y + 44 * sc, '800 13px Montserrat', C.ink, 'center'); g.globalAlpha = 1; };
      // passive units in the background
      Object.keys(UNITS).filter(k => k !== S.active && k !== S.called).forEach((k, i) => fig(k, 640 + i * 120, 185, .7, .55));
      // the enemy
      T.foe(820, 252, 30, Math.PI, C.red); txt(g, 'enemy', 820, 296, '700 12px Jost', C.redDk, 'center');
      // the active unit and the called unit
      fig(S.active, ax, 248, 1, 1, true);
      if (S.called) {
        const k = clamp((u - S.callAt) / .4);
        fig(S.called, lerp(ax, ax + 110, ease(k)), lerp(185, 248, ease(k)), lerp(.7, 1, k), 1);
        const left = CALL_DUR - (u - S.callAt); txt(g, `${left.toFixed(1)} s`, ax + 110, 196, '700 12px Jost', C.goldInk, 'center');
        const cmd = ev.some(([a, k2]) => k2 === 'command' && a <= u && a >= S.callAt);
        if (cmd) { const ph = (u * 2) % 1; T.tracer(ax + 140, 244, lerp(ax + 140, 800, ph), 250, 1 - ph, C.gold, 4); }
      }
      const lastHit = ev.filter(([a, k2]) => k2 === 'hit' && a <= u).at(-1);
      if (lastHit && u - lastHit[0] < .6) T.popText('−11', ax + 110, 200, C.redDk, 1 - (u - lastHit[0]) / .6);
      // the life pool
      const LX = 24, LY = 352, LW = 992;
      txt(g, 'Life pool', LX, LY, '800 15px Montserrat'); txt(g, `${Math.round(S.pool)} / 100`, LX + LW, LY, '700 14px Jost', C.muted, 'right');
      box(g, LX, LY + 14, LW, 30, '#efe4cc', null, 8);
      const act = S.pool - S.held;
      box(g, LX, LY + 14, LW * act / 100, 30, A.col, null, 8);
      txt(g, `${A.n} (Active)`, LX + 10, LY + 29, '700 13px Jost', '#fff');
      if (S.called) { const U = UNITS[S.called]; box(g, LX + LW * act / 100, LY + 14, LW * S.held / 100, 30, U.col, '#fff', 8, 2); txt(g, U.n, LX + LW * act / 100 + 8, LY + 29, '700 13px Jost', '#fff'); }
      if (S.pool < 100) { g.fillStyle = 'rgba(229,50,45,.25)'; g.fillRect(LX + LW * S.pool / 100, LY + 14, LW * (100 - S.pool) / 100, 30); txt(g, 'lost', LX + LW * (S.pool + 100) / 200, LY + 29, '700 12px Jost', C.redDk, 'center'); }
      // shares
      Object.entries(UNITS).forEach(([k, U], i) => { const x = 24 + i * 200; GI.draw(g, U.ic, x + 12, 420, 18, U.col); txt(g, `${U.n}: ${Math.round(U.share * 100)}% when called`, x + 28, 420, '600 13px Jost'); });
      txt(g, 'share = how vulnerable the unit is', 1016, 420, '600 12px Jost', C.muted, 'right');
      // log
      box(g, 24, 440, 992, 132, '#fffaf0', '#cdbf9f', 12, 2);
      S.log.slice(-4).forEach(([tm, l], i, arr) => txt(g, `${tm.toFixed(1)} s   ${l}`, 44, 462 + i * 28, (i === arr.length - 1 ? '700' : '500') + ' 15px Jost', i === arr.length - 1 ? C.ink : C.muted));
      if (!S.log.length) txt(g, 'Call a Passive unit to bring it in.', 44, 462, '600 15px Jost', C.muted);
      const key = S.log.length + S.active; if (key === st.key) return; st.key = key;
      const last = S.log.at(-1);
      say($(s, '.mu-out'), last ? last[1] + '.' : 'Phalanx is Active. Coil and Echelon wait in the background, out of reach of the controller.');
    }
    apis.multi = { seek(t) { st.held = st.tour = true; st.t = t; render(); }, dur: () => DUR };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > DUR) st.t = 0; render(); };
  });

  window.__seek = (t, w) => apis[w].seek(t);
  window.__dur = w => apis[w].dur();
})();
