/* Five skill curves, one chart (DGMS Module 2 "Audience Demographics", deck slides 67-89 and 84).
   curves:  skill against hours played (log scale, 0.1 to 1,000 h) for the deck's six examples: flat (Chutes and Ladders),
            easy/easy (Guess Who?), hard/easy (A Game of Thrones: The Board Game), easy/hard (Go), hard/hard (Chess) and
            regressive (Street Fighter III). Floor = skill after the first hour, ceiling = the most skill the chart reaches.
            The flow channel (slide 70) is a band of +-FLOW_BAND around the player's skill; each game's challenge line
            sits above the band (frustrating), inside it (flow) or below it (boring).
   diverse: slide 84, two curves inside one game: League of Legends' Garen vs Ryze, World of Warcraft's Warrior vs Warlock.
   Numbers: the curve shapes and the six examples' order are the deck's. Every number below (skill values, challenge
   lines, band width, hours) is illustrative: chosen so each curve reads as its type, not measured from players.
   Images: LoL portraits from Riot Data Dragon (ddragon.leagueoflegends.com, 14.1.1); WoW class icons from wow.zamimg.com. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;
  const W = 1040, H = 585;

  /* ---------- the tunable table ---------- */
  const FLOW_BAND = 6;                         // half-width of the flow channel, in skill points
  const sat = (h, k) => 1 - Math.exp(-h / k);  // quick saturating rise
  const pw = (u, e) => Math.pow(clamp(u / 4), e);
  const logi = (u, m, s) => 1 / (1 + Math.exp(-(u - m) * s));
  // u = log10(hours) + 1, so u runs 0..4 for 0.1..1000 hours. Every player walks in with 10 points of general skill.
  const GAMES = {
    flat:  { name: 'Chutes and Ladders', type: 'Flat', col: '#8f8a7e',
             skill: (h, u) => 12, challenge: (h, u) => 2,
             cap: 'Flat: there is no skill to gain. The spinner plays the game, so the curve never leaves the floor.' },
    gw:    { name: 'Guess Who?', type: 'Easy to learn, easy to master', col: '#e0a92d',
             skill: (h, u) => 10 + 22 * sat(h, .6), challenge: (h, u) => 12 + 12 * sat(h, 1.5),
             cap: 'Easy to learn, easy to master: a few rounds and you know the best questions. Floor and ceiling sit close together.' },
    got:   { name: 'A Game of Thrones: The Board Game', type: 'Hard to learn, easy to master', col: '#8a4fd6',
             skill: (h, u) => 10 + 42 * logi(u, 2, 3.2), challenge: (h, u) => 34 + 10 * pw(u, 1.2),
             cap: 'Hard to learn, easy to master: a thick rulebook up front, then the curve levels off once the rules are learned.' },
    go:    { name: 'Go', type: 'Easy to learn, hard to master', col: '#2ea3dc',
             skill: (h, u) => 10 + 15 * sat(h, .5) + 75 * pw(u, 1.6), challenge: (h, u) => 14 + 84 * pw(u, 1.3),
             cap: 'Easy to learn, hard to master: the rules fit on a card, and the curve keeps climbing for a lifetime.' },
    chess: { name: 'Chess', type: 'Hard to learn, hard to master', col: '#262c6a',
             skill: (h, u) => 10 + 90 * pw(u, 2.2), challenge: (h, u) => 22 + 78 * pw(u, 2.4),
             cap: 'Hard to learn, hard to master: six piece types and special rules first, then centuries of depth to climb.' },
    sf3:   { name: 'Street Fighter III', type: 'Regressive', col: '#e5322d',
             skill: (h, u) => 10 + 18 * sat(h, .4) - 14 * Math.exp(-Math.pow((u - 1.8) / .45, 2)) + 72 * Math.pow(Math.max(0, u - 1.5) / 2.5, 1.4),
             challenge: (h, u) => 14 + 86 * pw(u, 1.5),
             cap: 'Regressive: skills that carry you early on, like jumping, need to be unlearned. The curve dips before it climbs.' },
  };
  const ORDER = ['flat', 'gw', 'got', 'go', 'chess', 'sf3'];
  // slide 84: two characters, two curves, one game
  const DIVERSE = {
    lol: { name: 'League of Legends', a: { name: 'Garen', img: 'Garen.png', col: '#2fae63', type: 'easy to learn, low ceiling',
                                           skill: (h, u) => 10 + 40 * sat(h, 1.2) + 10 * pw(u, 2) },
                                      b: { name: 'Ryze', img: 'Ryze.png', col: '#8a4fd6', type: 'hard to learn, high ceiling',
                                           skill: (h, u) => 10 + 86 * pw(u, 2.3) } },
    wow: { name: 'World of Warcraft', a: { name: 'Warlock', img: 'classicon_warlock.jpg', col: '#8a4fd6', type: 'many spells to learn, then a steady rotation',
                                           skill: (h, u) => 10 + 60 * logi(u, 1.9, 3) },
                                      b: { name: 'Warrior', img: 'classicon_warrior.jpg', col: '#c4762b', type: 'swing on day one, rage and stances to master',
                                           skill: (h, u) => 10 + 20 * sat(h, .6) + 65 * pw(u, 1.8) } },
  };

  const hOf = v => Math.pow(10, v / 100 - 1);           // slider 0..400 -> 0.1..1000 h
  const uOf = h => Math.log10(h) + 1;
  const fmtH = h => h < 1 ? h.toFixed(1) + ' h' : h < 10 ? h.toFixed(1).replace('.0', '') + ' h' : Math.round(h).toLocaleString('en') + ' h';
  const IMG = {};
  Object.values(DIVERSE).forEach(d => [d.a, d.b].forEach(c => { const im = new Image(); im.src = '../img/skill-curves/' + c.img; IMG[c.img] = im; }));

  // chart frame
  const X0 = 70, X1 = 740, Y0 = 34, Y1 = 462;
  const xOf = u => X0 + (X1 - X0) * u / 4, yOf = s => Y1 - (Y1 - Y0) * clamp(s / 100, 0, 1.05);
  const txt = (g, s, x, y, font, col = C.ink, al = 'left') => { g.font = font; g.fillStyle = col; g.textAlign = al; g.textBaseline = 'middle'; g.fillText(s, x, y); };
  const panel = g => { g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(255,252,244,.85)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill(); };
  function axes(g) {
    g.strokeStyle = '#e3d8bf'; g.lineWidth = 1;
    [0, 1, 2, 3, 4].forEach(u => { g.beginPath(); g.moveTo(xOf(u), Y0); g.lineTo(xOf(u), Y1); g.stroke(); });
    [25, 50, 75, 100].forEach(s => { g.beginPath(); g.moveTo(X0, yOf(s)); g.lineTo(X1, yOf(s)); g.stroke(); });
    g.strokeStyle = C.ink; g.lineWidth = 2.5; g.beginPath(); g.moveTo(X0, Y0 - 6); g.lineTo(X0, Y1); g.lineTo(X1 + 6, Y1); g.stroke();
    ['0.1 h', '1 h', '10 h', '100 h', '1,000 h'].forEach((l, u) => txt(g, l, xOf(u), Y1 + 15, '600 14px Jost, sans-serif', C.muted, 'center'));
    [0, 50, 100].forEach(s => txt(g, String(s), X0 - 10, yOf(s), '600 13px Jost, sans-serif', C.muted, 'right'));
    g.save(); g.translate(22, (Y0 + Y1) / 2); g.rotate(-Math.PI / 2); txt(g, 'skill', 0, 0, '800 15px Montserrat, Jost, sans-serif', C.ink, 'center'); g.restore();
    txt(g, 'hours played (log scale)', X1, Y1 + 34, '700 14px Montserrat, Jost, sans-serif', C.ink, 'right');
  }
  function curve(g, f, col, w, a = 1, uMax = 4) {
    g.save(); g.globalAlpha = a; g.strokeStyle = col; g.lineWidth = w; g.lineJoin = 'round'; g.lineCap = 'round'; g.beginPath();
    for (let i = 0; i <= 200; i++) { const u = 4 * i / 200; if (u > uMax) break; const h = Math.pow(10, u - 1), x = xOf(u), y = yOf(f(h, u)); i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke(); g.restore();
  }
  // what a game's numbers say: floor, ceiling, zones along the hours axis
  function facts(k) {
    const G = GAMES[k], N = 400, zones = [];
    let ceil = 0, inFlow = 0, firstBore = null, frusOn = null, frusOff = null;
    for (let i = 0; i <= N; i++) {
      const u = 4 * i / N, h = Math.pow(10, u - 1), s = G.skill(h, u), c = G.challenge(h, u);
      ceil = Math.max(ceil, s);
      const z = c > s + FLOW_BAND ? 'frus' : c < s - FLOW_BAND ? 'bore' : 'flow';
      zones.push(z);
      if (z === 'flow') inFlow++;
      if (z === 'bore' && firstBore == null) firstBore = h;
      if (z === 'frus') { if (frusOn == null) frusOn = h; frusOff = h; }
    }
    const end = G.skill(1000, 4), late = G.skill(300, uOf(300));
    return { floor: G.skill(1, 1), ceil, climbing: end - late > 4, zones, flowShare: inFlow / (N + 1), firstBore, frusOn, frusOff };
  }
  const zoneWord = z => z === 'frus' ? 'frustrating' : z === 'bore' ? 'boring' : 'in flow';
  const zoneCol = z => z === 'frus' ? '#e5322d' : z === 'bore' ? '#7b86b8' : '#2fae63';
  const apis = {};

  /* ---------- 1: five curves, one chart ---------- */
  canvasDemo('curves', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, k: 'chess', fc: true, flow: false, hv: 200, key: '' };
    const tourBtn = $(s, '.sc-tour'), fcIn = $(s, '.sc-fc'), flIn = $(s, '.sc-flow'), hIn = $(s, '.sc-h');
    const free = () => { st.tour = false; tourBtn.classList.remove('on'); };
    $$(s, '.sc-game .btn').forEach(b => b.onclick = () => { free(); st.k = b.dataset.k; });
    fcIn.onchange = () => { free(); st.fc = fcIn.checked; };
    flIn.onchange = () => { free(); st.flow = flIn.checked; };
    hIn.oninput = () => { free(); st.hv = +hIn.value; };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    // pick a curve by clicking its legend row
    cv.addEventListener('pointerdown', e => {
      const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * W / r.width, y = (e.clientY - r.top) * H / r.height;
      if (x < 760) return;
      const i = Math.floor((y - 52) / 40); if (i >= 0 && i < 6) { free(); st.k = ORDER[i]; }
    });
    const DUR = 18;
    function render() {
      let { k, fc, flow, hv } = st, capA = 1;
      if (st.tour) {
        const t = st.t;
        if (t < 9) { const i = Math.min(5, Math.floor(t / 1.5)); k = ORDER[i]; fc = true; flow = false; hv = 200; capA = clamp((t - i * 1.5) / .3); }
        else { const j = Math.min(2, Math.floor((t - 9) / 3)), f = (t - 9 - j * 3) / 3; k = ['gw', 'chess', 'sf3'][j]; fc = false; flow = true; hv = lerp(0, 400, ease(clamp(f / .9))); capA = clamp(f / .1); }
        fcIn.checked = fc; flIn.checked = flow; hIn.value = Math.round(hv); Object.assign(st, { k, fc, flow, hv });
      }
      const G = GAMES[k], F = facts(k), h = hOf(hv), u = hv / 100;
      $$(s, '.sc-game .btn').forEach(b => b.classList.toggle('on', b.dataset.k === k));
      $(s, '.sc-hv').textContent = fmtH(h);
      T.use(g); panel(g); axes(g);
      // flow channel around the highlighted curve, and its challenge line
      if (flow) {
        g.fillStyle = 'rgba(47,174,99,.16)'; g.beginPath();
        for (let i = 0; i <= 200; i++) { const uu = 4 * i / 200, hh = Math.pow(10, uu - 1); g.lineTo(xOf(uu), yOf(G.skill(hh, uu) + FLOW_BAND)); }
        for (let i = 200; i >= 0; i--) { const uu = 4 * i / 200, hh = Math.pow(10, uu - 1); g.lineTo(xOf(uu), yOf(Math.max(0, G.skill(hh, uu) - FLOW_BAND))); }
        g.closePath(); g.fill();
      }
      ORDER.forEach(kk => { if (kk !== k) curve(g, GAMES[kk].skill, GAMES[kk].col, 3, flow ? .18 : .35); });
      curve(g, G.skill, G.col, 6);
      if (flow) {
        g.setLineDash([10, 7]); curve(g, G.challenge, C.navy, 3); g.setLineDash([]);
        const cEnd = G.challenge(1000, 4);
        T.label('challenge line', xOf(3.55), yOf(cEnd) + (cEnd > G.skill(1000, 4) ? -16 : 18), 'center', C.navy, 13);
        // zone strip along the hours axis
        const ys = Y1 - 14;
        F.zones.forEach((z, i) => { if (i === F.zones.length - 1) return; g.fillStyle = zoneCol(z); g.fillRect(xOf(4 * i / 400), ys, (X1 - X0) / 400 + .6, 10); });
      }
      if (fc) {
        const fy = yOf(F.floor), cy = yOf(F.ceil);
        g.setLineDash([4, 5]); g.strokeStyle = G.col; g.lineWidth = 2;
        g.beginPath(); g.moveTo(X0, cy); g.lineTo(X1, cy); g.stroke(); g.setLineDash([]);
        g.fillStyle = '#fff'; g.strokeStyle = G.col; g.lineWidth = 3; g.beginPath(); g.arc(xOf(1), fy, 8, 0, 7); g.fill(); g.stroke();
        T.label(`floor ${Math.round(F.floor)}`, xOf(1) + 14, fy + (k === 'got' || k === 'chess' ? -22 : 24), 'left', G.col, 14);
        T.label(F.climbing ? `ceiling ${Math.round(F.ceil)}+, still climbing` : `ceiling ${Math.round(F.ceil)}`, X1 - 4, cy - 17, 'right', G.col, 14);
      }
      // hours cursor
      const sNow = G.skill(h, u), cNow = G.challenge(h, u), zNow = cNow > sNow + FLOW_BAND ? 'frus' : cNow < sNow - FLOW_BAND ? 'bore' : 'flow';
      g.strokeStyle = 'rgba(21,32,68,.35)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(xOf(u), Y0); g.lineTo(xOf(u), Y1); g.stroke();
      g.fillStyle = G.col; g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.arc(xOf(u), yOf(sNow), 9, 0, 7); g.fill(); g.stroke();
      if (flow) {
        g.fillStyle = C.navy; g.beginPath(); g.arc(xOf(u), yOf(cNow), 6, 0, 7); g.fill();
        T.label(zoneWord(zNow), xOf(u), Math.min(yOf(sNow), yOf(cNow)) - 24, 'center', zoneCol(zNow), 15);
      }
      // legend
      txt(g, 'Six curves', 772, 30, '800 17px Montserrat, Jost, sans-serif');
      ORDER.forEach((kk, i) => {
        const y = 72 + i * 40, on = kk === k, GG = GAMES[kk];
        if (on) { g.fillStyle = 'rgba(255,185,81,.25)'; g.beginPath(); g.roundRect(764, y - 18, 266, 36, 8); g.fill(); }
        g.strokeStyle = GG.col; g.lineWidth = on ? 6 : 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(774, y); g.lineTo(800, y); g.stroke();
        txt(g, GG.name.replace(': The Board Game', ''), 810, y - 7, `${on ? 800 : 600} 14px Montserrat, Jost, sans-serif`, on ? C.ink : C.muted);
        txt(g, GG.type, 810, y + 9, '500 13px Jost, sans-serif', C.muted);
      });
      if (flow) {
        txt(g, 'Challenge vs skill', 772, 330, '800 15px Montserrat, Jost, sans-serif');
        [['flow', 'inside the channel: in flow'], ['bore', 'challenge below: boring'], ['frus', 'challenge above: frustrating']].forEach(([z, l], i) => {
          g.fillStyle = zoneCol(z); g.fillRect(774, 350 + i * 24, 22, 10); txt(g, l, 806, 355 + i * 24, '500 14px Jost, sans-serif', C.ink);
        });
      } else {
        txt(g, 'Markers', 772, 330, '800 15px Montserrat, Jost, sans-serif');
        txt(g, 'dot: floor, skill after 1 hour', 774, 354, '500 14px Jost, sans-serif', C.ink);
        txt(g, 'dashes: ceiling, most skill reached', 774, 378, '500 14px Jost, sans-serif', C.ink);
      }
      // caption from the notes
      g.save(); g.globalAlpha = capA;
      g.fillStyle = '#fffaf0'; g.strokeStyle = G.col; g.lineWidth = 2.5; g.beginPath(); g.roundRect(20, 512, 1000, 58, 10); g.fill(); g.stroke();
      g.fillStyle = G.col; g.beginPath(); g.roundRect(20, 512, 10, 58, [10, 0, 0, 10]); g.fill();
      txt(g, G.name, 44, 528, '800 16px Montserrat, Jost, sans-serif', C.ink);
      txt(g, G.cap, 44, 552, '500 16px Jost, sans-serif', C.ink);
      g.restore();
      const key = [k, flow, Math.round(hv)].join(); if (key === st.key) return; st.key = key;
      const fr = F.frusOn != null ? `${fmtH(F.frusOn)} to ${fmtH(F.frusOff)}` : 'none';
      say($(s, '.sc-stats'), `<div><b>${Math.round(F.floor)}</b><span>floor: skill after the first hour</span></div>`
        + `<div class="g"><b>${Math.round(F.ceil)}${F.climbing ? '+' : ''}</b><span>ceiling${F.climbing ? ', still climbing at 1,000 h' : ''}</span></div>`
        + (flow ? `<div class="${zNow === 'flow' ? 'g' : zNow === 'frus' ? 'r' : 'y'}"><b>${Math.round(100 * F.flowShare)}%</b><span>of the hours axis in flow · at ${fmtH(h)}: ${zoneWord(zNow)}</span></div>`
                + `<div class="y"><b>${F.firstBore != null ? fmtH(F.firstBore) : '—'}</b><span>first boring hour · frustrating: ${fr}</span></div>`
                : `<div class="y"><b>${Math.round(sNow)}</b><span>skill at ${fmtH(h)}</span></div>`));
      say($(s, '.sc-out'), !flow
        ? (k === 'flat' ? 'With no skill to gain, the floor is the ceiling: everyone plays at the same level forever.'
          : F.ceil - F.floor < 15 ? `${G.name} has its floor and ceiling close together: quick to pick up, little left to master.`
          : F.floor < 15 ? `${G.name} starts with a low floor (${Math.round(F.floor)}) and a high ceiling: new players struggle first, then have a long way to climb.`
          : `${G.name} starts at ${Math.round(F.floor)} after one hour and keeps going to ${Math.round(F.ceil)}: the gap between floor and ceiling is its room to master.`)
        : (k === 'gw' || k === 'flat' ? 'The challenge stops growing while skill keeps up, so the game turns boring early. That is fine for a family game.'
          : k === 'sf3' ? 'The dip is where the regressive curve hurts: skill drops while the challenge keeps rising, so these hours feel frustrating.'
          : k === 'got' ? 'The rulebook makes the first hours frustrating; once the curve levels off, the challenge falls below skill and the game turns boring.'
          : 'Early on the challenge is above skill: frustrating. Later the challenge grows with the player, so the long climb stays in flow.'));
    }
    apis.curves = { seek(t) { st.held = st.tour = true; st.t = t; render(); }, dur: () => DUR };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > DUR) st.t = 0; render(); };
  });

  /* ---------- 2: skill curves are diverse ---------- */
  canvasDemo('diverse', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, k: 'lol', hv: 100, key: '' };
    const tourBtn = $(s, '.dv-tour'), hIn = $(s, '.dv-h');
    const free = () => { st.tour = false; tourBtn.classList.remove('on'); };
    $$(s, '.dv-game .btn').forEach(b => b.onclick = () => { free(); st.k = b.dataset.k; });
    hIn.oninput = () => { free(); st.hv = +hIn.value; };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    const DUR = 14;
    function portrait(g, c, x, y, r) {
      const im = IMG[c.img];
      g.save(); g.beginPath(); g.arc(x, y, r, 0, 7); g.closePath();
      g.fillStyle = c.col; g.fill(); g.clip();
      if (im.complete && im.naturalWidth) g.drawImage(im, x - r, y - r, 2 * r, 2 * r);
      g.restore();
      g.strokeStyle = c.col; g.lineWidth = 4; g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke();
      g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, r - 2.5, 0, 7); g.stroke();
    }
    // every point where one curve overtakes the other
    function crosses(D) {
      const out = []; let prev = null;
      for (let i = 0; i <= 400; i++) {
        const u = 4 * i / 400, h = Math.pow(10, u - 1), d = D.b.skill(h, u) - D.a.skill(h, u);
        if (prev != null && Math.sign(d) !== Math.sign(prev) && d !== 0) out.push({ u, h, who: d > 0 ? D.b : D.a });
        prev = d;
      }
      return out;
    }
    function render() {
      let { k, hv } = st, uMax = 4;
      if (st.tour) { const t = st.t, j = t < 7 ? 0 : 1, f = (t - j * 7) / 7; k = j ? 'wow' : 'lol'; uMax = 4 * ease(clamp(f / .55)); hv = 400 * ease(clamp((f - .1) / .75)); hIn.value = Math.round(hv); st.k = k; st.hv = hv; }
      const D = DIVERSE[k], h = hOf(hv), u = hv / 100, XS = crosses(D), X = XS.at(-1);
      $$(s, '.dv-game .btn').forEach(b => b.classList.toggle('on', b.dataset.k === k));
      $(s, '.dv-hv').textContent = fmtH(h);
      T.use(g); panel(g); axes(g);
      [D.a, D.b].forEach(c => curve(g, c.skill, c.col, 6, 1, uMax));
      const shown = XS.filter(x => x.u <= uMax);
      shown.forEach(x => { const y = yOf(D.a.skill(x.h, x.u)); g.fillStyle = C.gold; g.strokeStyle = C.navy; g.lineWidth = 2.5; g.beginPath(); g.arc(xOf(x.u), y, 8, 0, 7); g.fill(); g.stroke(); });
      // cursor and portraits riding the curves
      g.strokeStyle = 'rgba(21,32,68,.35)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(xOf(u), Y0); g.lineTo(xOf(u), Y1); g.stroke();
      const sa = D.a.skill(h, u), sb = D.b.skill(h, u);
      const ya = yOf(sa), yb = yOf(sb), sep = Math.abs(ya - yb) < 44 ? (ya < yb ? -1 : 1) * (44 - Math.abs(ya - yb)) / 2 : 0;
      portrait(g, D.a, xOf(u), ya + sep, 20); portrait(g, D.b, xOf(u), yb - sep, 20);
      shown.forEach(x => {
        const y = yOf(D.a.skill(x.h, x.u)), left = xOf(x.u) < 420;
        T.label(`${x.who.name} overtakes at about ${fmtH(x.h)}`, xOf(x.u) + (left ? 14 : -14), y + (left ? 30 : -30), left ? 'left' : 'right', x.who.col, 14);
      });
      // right column: who is who
      txt(g, D.name, 772, 34, '800 18px Montserrat, Jost, sans-serif');
      [D.a, D.b].forEach((c, i) => {
        const y = 100 + i * 130, sk = c.skill(h, u);
        portrait(g, c, 806, y, 30);
        txt(g, c.name, 848, y - 14, '800 18px Montserrat, Jost, sans-serif', C.ink);
        txt(g, `skill ${Math.round(sk)} at ${fmtH(h)}`, 848, y + 10, '600 15px Jost, sans-serif', c.col);
        const words = c.type.split(' '), lines = []; let ln = '';
        words.forEach(w => { if ((ln + ' ' + w).trim().length > 30) { lines.push(ln.trim()); ln = w; } else ln += ' ' + w; }); lines.push(ln.trim());
        lines.forEach((l, j) => txt(g, l, 776, y + 44 + j * 19, '500 14px Jost, sans-serif', C.muted));
      });
      const lead = sa >= sb ? D.a : D.b, gap = Math.abs(sa - sb);
      g.fillStyle = '#fffaf0'; g.strokeStyle = lead.col; g.lineWidth = 2.5; g.beginPath(); g.roundRect(764, 362, 262, 88, 10); g.fill(); g.stroke();
      txt(g, `At ${fmtH(h)}`, 778, 384, '700 14px Montserrat, Jost, sans-serif', C.muted);
      txt(g, gap < 3 ? 'neck and neck' : `${lead.name} +${Math.round(gap)}`, 778, 414, '800 26px Montserrat, Jost, sans-serif', lead.col);
      txt(g, 'skill gap between the two', 778, 438, '500 13px Jost, sans-serif', C.muted);
      g.fillStyle = '#fffaf0'; g.strokeStyle = C.gold; g.lineWidth = 2.5; g.beginPath(); g.roundRect(20, 512, 1000, 58, 10); g.fill(); g.stroke();
      txt(g, 'Slide 84: skill curves are diverse', 40, 528, '800 16px Montserrat, Jost, sans-serif', C.ink);
      txt(g, `One game can hold several curves: ${D.a.name} and ${D.b.name} serve players who want different amounts of learning and mastery.`, 40, 552, '500 16px Jost, sans-serif', C.ink);
      const key = [k, Math.round(hv)].join(); if (key === st.key) return; st.key = key;
      say($(s, '.dv-stats'), `<div class="g"><b>${Math.round(sa)}</b><span>${D.a.name}: skill at ${fmtH(h)}</span></div>`
        + `<div><b>${Math.round(sb)}</b><span>${D.b.name}: skill at ${fmtH(h)}</span></div>`
        + `<div class="y"><b style="white-space:nowrap">${X ? fmtH(X.h) : '—'}</b><span>hours until ${X ? X.who.name : D.b.name} leads from then on</span></div>`);
      say($(s, '.dv-out'), sa > sb + 3
        ? `At ${fmtH(h)} ${D.a.name} expresses more skill: the pick for a player who wants to perform on day one.`
        : sb > sa + 3 ? `Past the crossover ${D.b.name} keeps climbing: the pick for a player who wants something left to master.`
        : `Around ${fmtH(h)} the two curves meet: both characters reward this player about equally.`);
    }
    apis.diverse = { seek(t) { st.held = st.tour = true; st.t = t; render(); }, dur: () => DUR };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > DUR) st.t = 0; render(); };
  });

  window.__seek = (t, w) => apis[w || 'curves'].seek(t);
  window.__dur = w => apis[w || 'curves'].dur();
})();
