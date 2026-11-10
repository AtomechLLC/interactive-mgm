/* Scarcity, abundance, auctions (MGM C4 M6, Part 11, mechanisms 3 to 5).
   scarcity:  Mooncloth, a cloth on a cooldown, so time is the commodity. Its price is high while players still want
              the items and falls to the cost of its parts once they are outfitted.
   abundance: one maintained Minecraft farm feeds a whole server, until the farmer logs off.
   auction:   gold enters by a tap (drops) and leaves by a sink (the auction house cut); how many items are tradable
              decides whether the next upgrade comes from playing or from shopping.
   Every model is a small table at the top of its block and all numbers are illustrative. Each scene steps with a fixed
   dt or is a pure function of time, so window.__seek(t, which) / __dur(which) replay it (which = scarcity, abundance, auction). */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease, TAU } = TD;
  const W = 1100, H = 600;
  const ICON = {};
  [['cloth', 'inv_fabric_moonrag_01.jpg'], ['robe', 'inv_chest_cloth_04.jpg'], ['coin', 'inv_misc_coin_02.jpg'],
    ['bread', 'mc_bread.png'], ['wheat', 'mc_wheat.png'], ['chest', 'mc_chest.png'], ['steve', 'mc_steve.png']]
    .forEach(([k, f]) => { const im = new Image(); im.src = 'img/' + f; ICON[k] = im; });
  function img(g, k, x, y, s, a = 1, frame = false) {
    const im = ICON[k]; if (a <= 0) return;
    g.save(); g.globalAlpha *= clamp(a); g.imageSmoothingEnabled = frame;
    if (frame) { g.fillStyle = '#1d2140'; g.beginPath(); g.roundRect(x - s / 2 - 2, y - s / 2 - 2, s + 4, s + 4, 5); g.fill(); }
    if (im.complete && im.naturalWidth) g.drawImage(im, x - s / 2, y - s / 2, s, s);
    g.restore();
  }
  function panel(g) { g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(255,252,244,.7)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill(); }
  const text = (g, s, x, y, font = '600 14px Jost, sans-serif', col = C.muted, align = 'center') => { g.font = font; g.fillStyle = col; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(s, x, y); };
  const demos = {};

  /* ---------- forced scarcity: Mooncloth ---------- */
  {
    const PLAYERS = 200, TAILORS = 40, DAYS = 112, PMAX = 10, RUN = 9, HOLD = 3;
    const X0 = 96, X1 = 1000, Y0 = 520, Y1 = 190, X = d => lerp(X0, X1, d / DAYS), YP = p => lerp(Y0, Y1, p / PMAX), YW = w => lerp(Y0, Y1, w / PLAYERS);
    // each day the tailors make TAILORS / cooldown cloths; an item takes `need` of them; the price premium follows the backlog
    function sim(cd, need) {
      const supply = TAILORS / cd, out = [];
      for (let d = 0; d <= DAYS; d++) {
        const done = Math.min(PLAYERS, supply * d / need), wanting = PLAYERS - done, backlog = wanting * need / supply;
        out.push({ wanting, price: 1 + 9 * backlog / (backlog + 40) });
      }
      return out;
    }
    canvasDemo('scarcity', (s, cv, g) => {
      const st = { cd: 1, need: 20, t: 0, held: false, last: '' };
      const cdIn = $(s, '.ec-cd'), needIn = $(s, '.ec-need');
      cdIn.oninput = () => { st.cd = +cdIn.value; st.t = 0; };
      needIn.oninput = () => { st.need = +needIn.value; st.t = 0; };
      $(s, '.ec-sreplay').onclick = () => { st.t = 0; };
      function render() {
        T.use(g); panel(g);
        const data = sim(st.cd, st.need), day = clamp(st.t / RUN) * DAYS, di = Math.floor(day), cur = data[di];
        // the players who want an item: 40 dots, 5 players each
        text(g, '200 players want a Mooncloth robe (each dot is 5 players)', X0, 36, '700 16px Montserrat, sans-serif', C.ink, 'left');
        const got = Math.round((PLAYERS - cur.wanting) / 5);
        for (let i = 0; i < 40; i++) {
          const x = X0 + 12 + i * 22.6, y = 74;
          g.beginPath(); g.arc(x, y, 8.5, 0, TAU);
          if (i < got) { g.fillStyle = C.blue; g.fill(); } else { g.fillStyle = '#fffaf0'; g.fill(); g.strokeStyle = C.goldInk; g.lineWidth = 2.5; g.stroke(); }
        }
        img(g, 'robe', X1 + 44, 74, 44, 1, true);
        text(g, 'still waiting', X0, 106, '600 14px Jost, sans-serif', C.goldInk, 'left');
        text(g, 'wearing one', X0 + 110, 106, '600 14px Jost, sans-serif', C.blue, 'left');
        // axes
        g.strokeStyle = '#cdbf9f'; g.lineWidth = 1;
        for (let p = 0; p <= PMAX; p += 2) { g.beginPath(); g.moveTo(X0, YP(p)); g.lineTo(X1, YP(p)); g.stroke(); text(g, p ? `×${p}` : '0', X0 - 10, YP(p), undefined, C.goldInk, 'right'); text(g, String(p * 20), X1 + 10, YP(p), undefined, C.blue, 'left'); }
        for (let w = 0; w <= 16; w += 2) text(g, `wk ${w}`, X(w * 7), Y0 + 20);
        text(g, 'weeks since the recipe went live', (X0 + X1) / 2, Y0 + 46);
        text(g, 'price of one cloth, × the cost of its parts', X0, Y1 - 24, '600 14px Jost, sans-serif', C.goldInk, 'left');
        text(g, 'players still waiting', X1, Y1 - 24, '600 14px Jost, sans-serif', C.blue, 'right');
        // the cost of its parts: the floor
        g.setLineDash([5, 6]); g.strokeStyle = C.muted; g.lineWidth = 2; g.beginPath(); g.moveTo(X0, YP(1)); g.lineTo(X1, YP(1)); g.stroke(); g.setLineDash([]);
        T.label('cost of its parts', X1 - 8, YP(1) + 18, 'right', C.muted, 13);
        // players still waiting (area) and the price (line), up to today
        const upto = f => { const pts = []; for (let d = 0; d <= di; d++) pts.push([X(d), f(data[d])]); const k = day - di; if (di < DAYS) pts.push([X(day), lerp(f(data[di]), f(data[di + 1]), k)]); return pts; };
        const wp = upto(d => YW(d.wanting));
        g.fillStyle = 'rgba(85,98,235,.14)'; g.beginPath(); g.moveTo(X0, Y0); wp.forEach(([x, y]) => g.lineTo(x, y)); g.lineTo(wp.at(-1)[0], Y0); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(85,98,235,.6)'; g.lineWidth = 2; g.beginPath(); wp.forEach(([x, y], i) => g[i ? 'lineTo' : 'moveTo'](x, y)); g.stroke();
        const pp = upto(d => YP(d.price));
        g.strokeStyle = C.gold; g.lineWidth = 6; g.lineJoin = 'round'; g.beginPath(); pp.forEach(([x, y], i) => g[i ? 'lineTo' : 'moveTo'](x, y)); g.stroke();
        g.strokeStyle = C.goldInk; g.lineWidth = 1.5; g.stroke();
        const [hx, hy] = pp.at(-1);
        img(g, 'cloth', hx, hy, 40, 1, true);
        T.label(`×${cur.price.toFixed(1)}`, hx, hy - 36, 'center', C.goldInk, 16);
        // once nobody is waiting, a day of cooldown buys almost nothing
        const flat = data.findIndex(d => d.wanting <= 0);
        if (flat >= 0 && day >= flat) { g.fillStyle = 'rgba(93,97,140,.08)'; g.fillRect(X(flat), Y1, X(day) - X(flat), Y0 - Y1); if (day - flat > 8) T.label('barely worth the cooldown', (X(flat) + X(day)) / 2, Y1 + 90, 'center', C.muted, 15); }
        $(s, '.ec-cdv').textContent = `${st.cd} day${st.cd > 1 ? 's' : ''}`; $(s, '.ec-needv').textContent = st.need;
        const key = `${st.cd}|${st.need}`;
        if (key === st.last) return; st.last = key;
        const end = data[DAYS], wk = flat < 0 ? null : Math.ceil(flat / 7);
        say($(s, '.ec-sstats'), `<div><b>${st.cd * st.need}</b><span>days of one tailor’s cooldowns per robe</span></div><div class="${wk ? 'r' : 'g'}"><b>${wk ? 'wk ' + wk : 'not yet'}</b><span>${wk ? 'everyone is outfitted and the price hits the floor' : `${Math.round(end.wanting)} players still waiting after 16 weeks`}</span></div>`);
        say($(s, '.ec-sout'), wk
          ? 'The cooldown makes time the commodity, and it works while players are still waiting. Once most have their robe, a cloth is barely worth more than its parts, tailors stop making it, and newer players skip the items.'
          : 'A longer cooldown or a bigger recipe keeps the price up for the whole 16 weeks, but most players are still waiting at the end. Forced scarcity trades access for value.');
      }
      demos.scarcity = { seek(t) { st.held = true; const second = t >= RUN + HOLD; st.cd = second ? 4 : 1; st.need = 20; cdIn.value = st.cd; needIn.value = 20; st.t = second ? t - RUN - HOLD : t; render(); }, dur: () => 2 * (RUN + HOLD) };
      return dt => { if (st.held) return; st.t += dt; render(); };
    });
  }

  /* ---------- abundance share: one farm feeds the server ---------- */
  {
    const PROD = 3, EAT = .25, CAP = 40, START = 10, WIN = 30, DT = 1 / 30;
    const FX = 150, FY = 190, CX = 480, CY = 200, PX0 = 700, PY0 = 80;
    const seatOf = (i, n) => { const cols = n > 9 ? 4 : 3, sp = n > 9 ? 92 : 112; return [PX0 + 40 + (i % cols) * sp, PY0 + 46 + Math.floor(i / cols) * (n > 9 ? 76 : 96)]; };
    canvasDemo('abundance', (s, cv, g) => {
      const st = { n: 8, maint: true, stock: START, t: 0, acc: 0, hist: [], tour: true, held: false, last: '' };
      const nIn = $(s, '.ec-n'), leave = $(s, '.ec-leave');
      const reset = () => { st.stock = START; st.t = 0; st.hist = []; st.maint = true; };
      nIn.oninput = () => { st.n = +nIn.value; st.tour = false; };
      leave.onclick = () => { st.maint = !st.maint; st.tour = false; };
      $(s, '.ec-areset').onclick = () => { reset(); st.tour = true; };
      // the tour: the farmer logs off at 10 s, comes back at 24 s, and the loop restarts at 30 s
      function tick() {
        if (st.tour) { if (st.t >= WIN) reset(); st.maint = !(st.t >= 10 && st.t < 24); }
        const prod = st.maint ? PROD : 0, want = st.n * EAT;
        st.stock = clamp(st.stock + (prod - want) * DT, 0, CAP);
        st.fed = st.stock > 0 ? st.n : Math.min(st.n, Math.floor(prod / EAT));
        st.t += DT; st.hist.push([st.t, st.stock, st.maint]);
        while (st.hist.length && st.hist[0][0] < st.t - WIN) st.hist.shift();
      }
      function step(dt) { st.acc += dt; while (st.acc >= DT) { st.acc -= DT; tick(); } }
      function render() {
        T.use(g); panel(g);
        const t = st.t, n = st.n, fed = st.fed ?? n;
        // the farm and its farmer
        g.fillStyle = st.maint ? '#8a6a3a' : '#9c9484'; g.beginPath(); g.roundRect(FX - 110, FY - 110, 220, 190, 10); g.fill();
        for (let i = 0; i < 12; i++) img(g, 'wheat', FX - 78 + (i % 4) * 52, FY - 76 + Math.floor(i / 4) * 54, 46, st.maint ? 1 : .3);
        if (st.maint) img(g, 'steve', FX - 70, FY + 122, 64); else T.label('farmer is offline', FX, FY + 122, 'center', C.redDk, 15);
        text(g, st.maint ? 'the farmer keeps it running' : 'nobody replants', FX + (st.maint ? 34 : 0), st.maint ? FY + 122 : FY + 154, '600 15px Jost, sans-serif', C.muted);
        text(g, st.maint ? `+${PROD} bread / s` : '+0 bread / s', FX, FY - 132, '700 17px Montserrat, sans-serif', st.maint ? C.good : C.redDk);
        // the shared chest
        img(g, 'chest', CX, CY, 150);
        text(g, 'shared chest', CX, CY - 96, '700 17px Montserrat, sans-serif', C.ink);
        T.label(`${Math.round(st.stock)} bread`, CX, CY + 96, 'center', st.stock > 0 ? C.ink : C.redDk, 18);
        // bread on its way: farm to chest, chest to players
        if (st.maint) for (let i = 0; i < 3; i++) { const k = (t * .8 + i / 3) % 1; img(g, 'bread', lerp(FX + 120, CX - 80, k), FY - 10 - Math.sin(k * Math.PI) * 26, 30); }
        // the players
        text(g, `${n} players`, PX0 + 190, PY0 - 4, '700 17px Montserrat, sans-serif', C.ink);
        for (let i = 0; i < n; i++) {
          const [x, y] = seatOf(i, n), ok = i < fed, sz = n > 9 ? 54 : 66;
          if (ok && st.stock > 0) { const k = (t * .6 + i * .37) % 1; if (k < .5) img(g, 'bread', lerp(CX + 80, x, k * 2), lerp(CY, y, k * 2), 22, .9); }
          img(g, 'steve', x, y, sz, ok ? 1 : .35);
          if (ok) img(g, 'bread', x + sz * .42, y + sz * .3, 24);
          else text(g, 'hungry', x, y + sz * .62, '700 13px Jost, sans-serif', C.redDk);
        }
        // the chest over time
        const x0 = 90, x1 = 1040, y0 = 560, y1 = 440, tx = tt => lerp(x0, x1, (tt - Math.max(0, t - WIN)) / WIN), sy = v => lerp(y0, y1, v / CAP);
        text(g, 'bread in the chest', x0, y1 - 18, '700 15px Montserrat, sans-serif', C.ink, 'left');
        g.strokeStyle = '#cdbf9f'; g.lineWidth = 1; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y0); g.moveTo(x0, y1); g.lineTo(x1, y1); g.stroke();
        text(g, 'full', x0 - 8, y1, undefined, C.muted, 'right'); text(g, '0', x0 - 8, y0, undefined, C.muted, 'right');
        // shade the stretches with nobody farming
        let from = null;
        st.hist.forEach(([tt, , m], i) => {
          if (!m && from == null) from = tt;
          if ((m || i === st.hist.length - 1) && from != null) { g.fillStyle = 'rgba(229,50,45,.1)'; g.fillRect(tx(from), y1, tx(tt) - tx(from), y0 - y1); from = null; }
        });
        g.strokeStyle = C.goldInk; g.lineWidth = 4; g.lineJoin = 'round'; g.beginPath(); st.hist.forEach(([tt, v], i) => g[i ? 'lineTo' : 'moveTo'](tx(tt), sy(v))); g.stroke();
        if (st.hist.length) { const [tt, v] = st.hist.at(-1); img(g, 'bread', tx(tt), sy(v), 28); }
        nIn.value = n; $(s, '.ec-nv').textContent = n; leave.textContent = st.maint ? 'Farmer logs off' : 'Farmer comes back'; leave.classList.toggle('on', !st.maint);
        const state = !st.maint ? (st.stock > 0 ? 'drain' : 'empty') : n * EAT > PROD ? 'short' : 'ok';
        const key = `${n}|${state}|${Math.round(st.stock / 2)}`;
        if (key === st.last) return; st.last = key;
        const net = (st.maint ? PROD : 0) - n * EAT, left = net < 0 ? st.stock / -net : null;
        say($(s, '.ec-astats'), `<div class="${st.maint ? 'g' : 'r'}"><b>${st.maint ? n - 1 : 0}</b><span>of ${n} players never have to farm</span></div><div class="${net < 0 ? 'r' : 'g'}"><b>${net >= 0 ? '+' + net.toFixed(2).replace(/\.?0+$/, '') : left > 0 ? Math.ceil(left) + ' s' : '0'}</b><span>${net >= 0 ? 'bread to spare every second' : left > 0 ? 'until the chest is empty' : 'bread left: everyone forages alone'}</span></div>`);
        say($(s, '.ec-aout'), {
          ok: 'One player’s farm makes more than the whole server eats. Food stops being a problem for everyone, a growth exchange the game runs on its own.',
          short: 'More mouths than the farm can feed: the surplus is gone, so the chest only drains. Abundance needs the tap to outrun everyone’s use.',
          drain: 'The loop depends on one person. With the farmer gone, the chest is all that is left, and it is draining.',
          empty: 'The chest is empty. Everyone is back to finding their own food until someone maintains the loop again.',
        }[state]);
      }
      demos.abundance = { seek(t) { st.held = true; st.tour = true; st.n = 8; reset(); st.acc = 0; while (st.t < t) tick(); render(); }, dur: () => WIN };
      return dt => { if (st.held) return; step(dt); render(); };
    });
  }

  /* ---------- auction houses: taps and sinks ---------- */
  {
    const WEEKS = 12, G0 = 100, VEL = 2, RUN = 5, HOLD = 2.5, TUB = 1000;
    // each week: gold in bags += tap − cut × (gold spent on the auction house, VEL × gold in bags)
    function sim(tap, tax) { const out = [G0]; for (let w = 1; w <= WEEKS; w++) { const G = out[w - 1]; out.push(G + tap - tax * VEL * G); } return out; }
    const shopShare = tr => .95 * tr / (tr + .25);   // chance the best upgrade you can get is on the auction house
    const PRESETS = [
      ['No cut at all: gold only piles up', 30, 0, 20],
      ['World of Warcraft: a 5% cut, limited items', 30, 5, 20],
      ['Diablo III at launch: every item tradable', 300, 15, 100],
      ['Closed and scarce: a big cut, few items', 30, 15, 10],
    ];
    canvasDemo('auction', (s, cv, g) => {
      const st = { tap: 30, tax: 5, tr: 20, pi: 1, t: 0, time: 0, tour: false, held: false, last: '' };
      const tapIn = $(s, '.ec-tap'), taxIn = $(s, '.ec-tax'), trIn = $(s, '.ec-tr');
      say($(s, '.ec-presets'), PRESETS.map(([l], i) => `<button class="btn" data-i="${i}">${l}</button>`).join(''));
      const use = i => { [, st.tap, st.tax, st.tr] = PRESETS[i]; st.pi = i; st.t = 0; tapIn.value = st.tap; taxIn.value = st.tax; trIn.value = st.tr; };
      $$(s, '.ec-presets .btn').forEach(b => b.onclick = () => { st.tour = false; use(+b.dataset.i); });
      [[tapIn, 'tap'], [taxIn, 'tax'], [trIn, 'tr']].forEach(([el, k]) => el.oninput = () => { st[k] = +el.value; st.pi = -1; st.tour = false; st.t = 0; });
      function render() {
        T.use(g); panel(g);
        const data = sim(st.tap, st.tax / 100), wk = clamp(st.t / RUN) * WEEKS, wi = Math.min(WEEKS - 1, Math.floor(wk)), G = lerp(data[wi], data[wi + 1], wk - wi);
        const sink = st.tax / 100 * VEL * G, time = st.time;
        // the tub: gold in players' bags
        const tx0 = 80, tx1 = 400, ty0 = 470, ty1 = 190, lvl = clamp(G / TUB), ly = lerp(ty0, ty1 + 14, lvl);
        text(g, 'Gold in players’ bags', (tx0 + tx1) / 2, 40, '700 18px Montserrat, sans-serif', C.ink);
        // tap
        g.fillStyle = C.wall; g.beginPath(); g.roundRect(196, 70, 90, 26, 6); g.fill(); g.fillRect(228, 96, 26, 22);
        const tw = 6 + st.tap / 300 * 30;
        g.fillStyle = C.gold; g.fillRect(241 - tw / 2, 118, tw, ly - 118);
        for (let i = 0; i < 4; i++) { const k = (time * 1.4 + i / 4) % 1; img(g, 'coin', 241, lerp(124, ly - 8, k), 22, 1, true); }
        T.label(`tap: drops, +${st.tap} a week`, 300, 84, 'left', C.good, 15);
        // water
        g.fillStyle = 'rgba(255,185,81,.75)'; g.beginPath(); g.roundRect(tx0 + 6, ly, tx1 - tx0 - 12, ty0 - ly - 6, [0, 0, 12, 12]); g.fill();
        g.strokeStyle = C.wall; g.lineWidth = 8; g.lineJoin = 'round'; g.beginPath(); g.moveTo(tx0, ty1); g.lineTo(tx0, ty0); g.lineTo(tx1, ty0); g.lineTo(tx1, ty1); g.stroke();
        text(g, Math.round(G).toLocaleString('en-US'), (tx0 + tx1) / 2, Math.min(ty0 - 34, ly + 34), '800 34px Montserrat, sans-serif', C.navy);
        if (G > TUB * .97) T.stamp('OVERFLOWING', (tx0 + tx1) / 2, ty1 + 6, C.redDk, 1, 22);
        // sink
        const sw = sink > .5 ? 6 + Math.min(30, sink / 300 * 30) : 0;
        g.fillStyle = C.wall; g.fillRect(228, ty0, 26, 18);
        if (sw) { g.fillStyle = 'rgba(229,50,45,.55)'; g.fillRect(241 - sw / 2, ty0 + 18, sw, 70); for (let i = 0; i < 3; i++) { const k = (time * 1.4 + i / 3) % 1; img(g, 'coin', 241, lerp(ty0 + 26, ty0 + 84, k), 20, 1 - k, true); } }
        T.label(sw ? `sink: auction cut, −${Math.round(sink)} a week` : 'no sink: nothing leaves', 270, ty0 + 52, 'left', C.redDk, 15);
        // price of the same sword
        const cx0 = 560, cx1 = 1050, cy0 = 330, cy1 = 100, pmax = Math.max(400, ...data) * 1.12, X = w => lerp(cx0, cx1, w / WEEKS), Y = v => lerp(cy0, cy1, v / pmax);
        text(g, 'Price of the same sword', cx0, 40, '700 18px Montserrat, sans-serif', C.ink, 'left');
        g.strokeStyle = '#cdbf9f'; g.lineWidth = 1; g.beginPath(); g.moveTo(cx0, cy0); g.lineTo(cx1, cy0); g.stroke();
        g.setLineDash([4, 5]); g.beginPath(); g.moveTo(cx0, Y(G0)); g.lineTo(cx1, Y(G0)); g.stroke(); g.setLineDash([]);
        text(g, '100 g', cx0 - 8, Y(G0), undefined, C.muted, 'right');
        for (let w = 0; w <= WEEKS; w += 4) text(g, `wk ${w}`, X(w), cy0 + 18);
        const pts = []; for (let w = 0; w <= wi; w++) pts.push([X(w), Y(data[w])]); pts.push([X(wk), Y(G)]);
        g.fillStyle = 'rgba(229,50,45,.1)'; g.beginPath(); g.moveTo(X(0), Y(G0)); pts.forEach(([x, y]) => g.lineTo(x, y)); g.lineTo(pts.at(-1)[0], Y(G0)); g.closePath(); g.fill();
        g.strokeStyle = C.red; g.lineWidth = 5; g.lineJoin = 'round'; g.beginPath(); pts.forEach(([x, y], i) => g[i ? 'lineTo' : 'moveTo'](x, y)); g.stroke();
        const [px, py] = pts.at(-1);
        T.label(`${Math.round(G).toLocaleString('en-US')} g`, Math.min(px, cx1 - 40), py - 22, 'center', C.redDk, 16);
        // where the next upgrade comes from
        const shop = shopShare(st.tr / 100), bx0 = 560, bx1 = 1050, by = 440, bh = 54, mid = lerp(bx0, bx1, 1 - shop);
        text(g, 'Where your next upgrade comes from', bx0, by - 26, '700 18px Montserrat, sans-serif', C.ink, 'left');
        g.fillStyle = C.player; g.beginPath(); g.roundRect(bx0, by, mid - bx0, bh, [10, 0, 0, 10]); g.fill();
        g.fillStyle = C.gold; g.beginPath(); g.roundRect(mid, by, bx1 - mid, bh, [0, 10, 10, 0]); g.fill();
        text(g, `playing ${Math.round((1 - shop) * 100)}%`, (bx0 + mid) / 2, by + bh / 2, '700 17px Montserrat, sans-serif', '#fff');
        if (shop > .12) text(g, `shopping ${Math.round(shop * 100)}%`, (mid + bx1) / 2, by + bh / 2, '700 17px Montserrat, sans-serif', C.navy);
        if (shop > .5) T.stamp('SHOPPING BEATS PLAYING', (bx0 + bx1) / 2, by + bh + 46, C.redDk, 1, 22);
        else text(g, 'most upgrades still come from play', (bx0 + bx1) / 2, by + bh + 30, '600 15px Jost, sans-serif', C.muted);
        $(s, '.ec-tapv').textContent = st.tap; $(s, '.ec-taxv').textContent = st.tax + '%'; $(s, '.ec-trv').textContent = st.tr + '%';
        $$(s, '.ec-presets .btn').forEach((b, i) => b.classList.toggle('on', i === st.pi));
        const key = `${st.tap}|${st.tax}|${st.tr}`;
        if (key === st.last) return; st.last = key;
        const end = data[WEEKS], infl = end / G0;
        const money = st.tax === 0 ? 'With no sink, every coin that drops stays forever and prices only climb.'
          : infl > 4 ? `The cut can’t keep pace with the tap: the same sword costs ${infl.toFixed(1)}× as much after 12 weeks.`
          : `The cut burns gold on every sale, so the pile levels off near ${Math.round(st.tap / (st.tax / 100 * VEL)).toLocaleString('en-US')} gold.`;
        const items = shop > .5 ? ' With this many items tradable, the auction house nearly always has something better than your own drops, so farming gold beats playing.'
          : ' With few items tradable, the auction house fills gaps and play still gives the upgrades.';
        say($(s, '.ec-xout'), money + items);
      }
      const SEG = RUN + HOLD;
      demos.auction = { seek(t) { st.held = true; const i = Math.min(PRESETS.length - 1, Math.floor(t / SEG)); if (i !== st.pi || st.tap !== PRESETS[i][1]) use(i); st.t = t - i * SEG; st.time = t; render(); }, dur: () => SEG * PRESETS.length };
      return dt => { if (st.held) return; st.t += dt; st.time += dt; render(); };
    });
  }

  window.__seek = (t, which) => demos[which].seek(t);
  window.__dur = which => demos[which].dur();
})();
