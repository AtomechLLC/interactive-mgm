/* The gold item trap (DGMS Module 2, Audience Demographics, deck slide 260).
   League of Legends once had items that paid gold over time. The notes: "5 gold every 10 seconds. Stack three, that's
   180 gold a minute… over 7,000 gold", and "EVERYONE wanted them". The arithmetic in the notes is off: 3 items x 5 gold
   per 10 s is 15 gold per 10 s, which is 90 gold a minute (about 3,150 over 35 minutes), not 180. This page uses the
   corrected rate and shows the notes' figure only as a labelled comparison line.
   gold: gold earned by the items against the 2,250 spent on them, with the break-even minute marked.
   tune: the designer's side. Price and rate decide the payback minute; set that against how long games last.
   Numbers: RATE (5 gold / 10 s) and the 2,250 total for three items are the deck's (we split it evenly as 750 each).
   NOTES_RATE (the notes' 180/min for three items, i.e. 10 gold / 10 s each) is the notes' figure, kept for comparison.
   GAME_MEAN / GAME_SD (the spread of game lengths) are illustrative.
   Images: League of Legends item icons (Philosopher's Stone 3096, Kage's Lucky Pick 3098, Avarice Blade 3093) from
   Riot's Data Dragon, patch 3.6.14 (ddragon.leagueoflegends.com/cdn/3.6.14/img/item/<id>.png), in ../img/gold-items/. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;
  const W = 1040, H = 585;
  const P = {
    RATE: 5,            // gold per 10 seconds, per item (deck)
    COST: 750,          // per item: three items = 2,250 (deck total, split evenly)
    NOTES_RATE: 10,     // what the notes' "180 gold a minute" for three items implies per item (notes, arithmetic slip)
    COUNT: 3, LENGTH: 35, BUY: 0,
    MAX_MIN: 60,
    GAME_MEAN: 32, GAME_SD: 7,   // illustrative spread of game lengths, minutes
    TUNE: { rate: 5, cost: 750, buy: 5 },
  };
  const perMin = r => r * 6;                       // gold per 10 s -> gold per minute
  const payback = (rate, cost, buy) => buy + cost / perMin(rate);
  const ICONS = ['3096', '3098', '3093'].map(id => { const im = new Image(); im.src = `../img/gold-items/${id}.png`; return im; });
  const fmt = v => Math.round(v).toLocaleString('en-US');
  const panel = g => { g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(255,252,244,.82)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill(); };
  const txt = (g, s, x, y, font, col = C.ink, al = 'left') => { g.font = font; g.fillStyle = col; g.textAlign = al; g.textBaseline = 'middle'; g.fillText(s, x, y); };
  const niceMax = v => { const m = Math.pow(10, Math.floor(Math.log10(v))); for (const k of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (k * m >= v) return k * m; return 10 * m; };
  const apis = {};

  function icon(g, i, x, y, s, a = 1) {
    const im = ICONS[i % 3];
    g.save(); g.globalAlpha = a;
    g.fillStyle = '#10131f'; g.beginPath(); g.roundRect(x - 3, y - 3, s + 6, s + 6, 6); g.fill();
    if (im.complete && im.naturalWidth) g.drawImage(im, x, y, s, s);
    g.strokeStyle = '#c8a85a'; g.lineWidth = 2; g.strokeRect(x, y, s, s);
    g.restore();
  }

  /* ---------- 1: gold earned vs gold spent ---------- */
  canvasDemo('gold', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, n: P.COUNT, len: P.LENGTH, buy: P.BUY, notes: false, key: '' };
    const tourBtn = $(s, '.gi-tour'), nIn = $(s, '.gi-n'), lIn = $(s, '.gi-l'), bIn = $(s, '.gi-b'), notesIn = $(s, '.gi-notes');
    const free = () => { st.tour = false; tourBtn.classList.remove('on'); };
    nIn.oninput = () => { free(); st.n = +nIn.value; };
    lIn.oninput = () => { free(); st.len = +lIn.value; };
    bIn.oninput = () => { free(); st.buy = +bIn.value; };
    notesIn.onchange = () => { free(); st.notes = notesIn.checked; };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    const X0 = 86, X1 = 742, Y0 = 92, Y1 = 506;
    function render() {
      let { n, len, buy, notes } = st, cur = len; const t = st.t;
      if (st.tour) {
        n = 3; len = 35; buy = 0; notes = false; cur = 35;
        if (t < 5) cur = lerp(0, 35, ease(clamp(t / 4.6)));
        else if (t < 9) n = Math.round(lerp(1, 6, clamp((t - 5) / 3.4)));
        else if (t < 12.5) buy = Math.round(lerp(0, 10, ease(clamp((t - 9) / 2.6))));
        else notes = true;
        nIn.value = n; lIn.value = len; bIn.value = buy; notesIn.checked = notes;
      }
      $(s, '.gi-nv').textContent = n; $(s, '.gi-lv').textContent = len + ' min'; $(s, '.gi-bv').textContent = buy;
      const rate = perMin(P.RATE) * n, cost = P.COST * n, pb = payback(P.RATE, P.COST, buy);
      const earned = m => rate * Math.max(0, m - buy), notesE = m => perMin(P.NOTES_RATE) * n * Math.max(0, m - buy);
      const yMax = niceMax(Math.max(cost * 1.5, earned(P.MAX_MIN) * .62, notes ? notesE(len) * 1.05 : 0));
      const xm = m => X0 + (X1 - X0) * m / P.MAX_MIN, yg = v => Y1 - (Y1 - Y0) * Math.min(v, yMax) / yMax;
      T.use(g); panel(g);
      txt(g, 'Gold earned by the items vs gold spent on them', X0 - 40, 40, '800 21px Montserrat, Jost, sans-serif');
      txt(g, `${n} item${n > 1 ? 's' : ''} × ${P.RATE} gold every 10 s = ${fmt(rate)} gold a minute`, X0 - 40, 66, '600 16px Jost, sans-serif', C.muted);
      // after the game ends
      g.fillStyle = 'rgba(93,97,140,.10)'; g.fillRect(xm(len), Y0, X1 - xm(len), Y1 - Y0);
      txt(g, 'game over', (xm(len) + X1) / 2, Y0 + 16, '600 14px Jost, sans-serif', C.muted, 'center');
      // grid
      g.strokeStyle = 'rgba(38,44,106,.12)'; g.lineWidth = 1; g.font = '500 13px Jost, sans-serif';
      for (let k = 0; k <= 4; k++) { const v = yMax * k / 4, y = yg(v); g.beginPath(); g.moveTo(X0, y); g.lineTo(X1, y); g.stroke(); txt(g, fmt(v), X0 - 8, y, '500 13px Jost, sans-serif', C.muted, 'right'); }
      for (let m = 0; m <= P.MAX_MIN; m += 10) txt(g, m + '', xm(m), Y1 + 16, '500 13px Jost, sans-serif', C.muted, 'center');
      txt(g, 'minutes into the game', (X0 + X1) / 2, Y1 + 38, '600 14px Jost, sans-serif', C.muted, 'center');
      g.strokeStyle = C.ink; g.lineWidth = 2; g.beginPath(); g.moveTo(X0, Y0); g.lineTo(X0, Y1); g.lineTo(X1, Y1); g.stroke();
      // shaded: before break-even the gold sits in items with no fighting stats; after, profit
      const mEnd = Math.min(cur, P.MAX_MIN);
      g.fillStyle = 'rgba(229,50,45,.14)'; g.beginPath(); g.moveTo(xm(buy), yg(cost));
      for (let m = buy; m <= Math.min(pb, mEnd); m += .25) g.lineTo(xm(m), yg(earned(m)));
      g.lineTo(xm(Math.min(pb, mEnd)), yg(cost)); g.closePath(); g.fill();
      if (mEnd > pb) { g.fillStyle = 'rgba(47,174,99,.18)'; g.beginPath(); g.moveTo(xm(pb), yg(cost)); for (let m = pb; m <= mEnd; m += .25) g.lineTo(xm(m), yg(earned(m))); g.lineTo(xm(mEnd), yg(cost)); g.closePath(); g.fill(); }
      // spent line
      g.strokeStyle = C.red; g.lineWidth = 3; g.setLineDash([10, 7]); g.beginPath(); g.moveTo(xm(buy), yg(cost)); g.lineTo(X1, yg(cost)); g.stroke(); g.setLineDash([]);
      T.label(`spent: ${fmt(cost)} gold`, xm(buy) + 70, yg(cost) - 18, 'center', C.redDk, 15);
      // notes' line
      if (notes) {
        g.strokeStyle = 'rgba(138,79,214,.85)'; g.lineWidth = 3; g.setLineDash([3, 6]); g.beginPath();
        for (let m = buy; m <= len; m += .5) { const y = yg(notesE(m)); m === buy ? g.moveTo(xm(m), y) : g.lineTo(xm(m), y); } g.stroke(); g.setLineDash([]);
        const lm = Math.min(len, buy + yMax / (perMin(P.NOTES_RATE) * n) * .92);
        T.label(`notes' figure, ${fmt(perMin(P.NOTES_RATE) * n)}/min: ${fmt(notesE(len))} by min ${len}`, Math.min(xm(lm) + 10, X1 - 150), yg(notesE(lm)) - 4, 'center', C.purple, 14);
      }
      // earned line
      g.strokeStyle = C.goldInk; g.lineWidth = 4; g.beginPath(); g.moveTo(xm(0), yg(0));
      for (let m = 0; m <= mEnd; m += .25) g.lineTo(xm(m), yg(earned(m))); g.stroke();
      g.strokeStyle = 'rgba(154,90,6,.35)'; g.lineWidth = 2; g.setLineDash([4, 6]); g.beginPath(); g.moveTo(xm(mEnd), yg(earned(mEnd)));
      for (let m = mEnd; m <= len; m += .5) g.lineTo(xm(m), yg(earned(m))); g.stroke(); g.setLineDash([]);
      // break-even marker
      if (pb <= P.MAX_MIN) {
        g.strokeStyle = C.ink; g.lineWidth = 2; g.setLineDash([5, 5]); g.beginPath(); g.moveTo(xm(pb), Y1); g.lineTo(xm(pb), yg(cost) - 8); g.stroke(); g.setLineDash([]);
        g.fillStyle = mEnd >= pb ? C.p2 : '#fffaf0'; g.strokeStyle = C.ink; g.lineWidth = 2.5; g.beginPath(); g.arc(xm(pb), yg(cost), 8, 0, Math.PI * 2); g.fill(); g.stroke();
        T.label(`break-even: minute ${fmt(pb)}`, xm(pb), Y1 - 22, 'center', C.ink, 15);
      }
      // the coin on the earned line
      const cy = yg(earned(mEnd)), cx = xm(mEnd);
      g.fillStyle = C.gold; g.strokeStyle = C.goldInk; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, 10, 0, Math.PI * 2); g.fill(); g.stroke();
      T.label(`${fmt(earned(mEnd))} earned`, Math.min(cx + 6, X1 - 60), cy - 26, 'center', C.goldInk, 15);
      // inventory
      const ix = 790;
      txt(g, 'Inventory', ix, 112, '800 17px Montserrat, Jost, sans-serif');
      for (let i = 0; i < 6; i++) {
        const x = ix + (i % 3) * 74, y = 132 + Math.floor(i / 3) * 74;
        g.fillStyle = '#1c2033'; g.beginPath(); g.roundRect(x, y, 62, 62, 8); g.fill();
        if (i < n) icon(g, i, x + 5, y + 5, 52);
      }
      const net = earned(len) - cost;
      txt(g, 'At the final minute', ix, 312, '800 17px Montserrat, Jost, sans-serif');
      [['earned', fmt(earned(len)), C.goldInk], ['spent', '−' + fmt(cost), C.redDk], ['net', (net >= 0 ? '+' : '−') + fmt(Math.abs(net)), net >= 0 ? C.good : C.redDk]].forEach(([k, v, c], i) => {
        txt(g, k, ix, 344 + i * 32, '600 16px Jost, sans-serif', C.muted); txt(g, v, ix + 212, 344 + i * 32, '800 20px Montserrat, Jost, sans-serif', c, 'right');
      });
      g.fillStyle = 'rgba(229,50,45,.14)'; g.fillRect(ix, 450, 18, 14); txt(g, 'gold tied up, no fighting stats', ix + 26, 457, '500 14px Jost, sans-serif', C.ink);
      g.fillStyle = 'rgba(47,174,99,.25)'; g.fillRect(ix, 474, 18, 14); txt(g, 'profit after break-even', ix + 26, 481, '500 14px Jost, sans-serif', C.ink);
      txt(g, 'Item icons: League of Legends,', ix, 520, '500 12px Jost, sans-serif', C.muted); txt(g, 'patch 3.6 (Riot Data Dragon)', ix, 536, '500 12px Jost, sans-serif', C.muted);

      const key = [n, len, buy, notes].join(); if (key === st.key) return; st.key = key;
      say($(s, '.gi-stats'), `<div class="y"><b>${fmt(rate)}</b><span>gold a minute from ${n} item${n > 1 ? 's' : ''}</span></div>`
        + `<div class="${pb <= len ? 'g' : 'r'}"><b>${fmt(pb)}</b><span>break-even minute (${fmt(P.COST / perMin(P.RATE))} min after buying, whatever the stack)</span></div>`
        + `<div class="${net >= 0 ? 'g' : 'r'}"><b>${net >= 0 ? '+' : '−'}${fmt(Math.abs(net))}</b><span>net gold by minute ${len}</span></div>`);
      say($(s, '.gi-out'), notes
        ? `The notes say three items make 180 gold a minute. At 5 gold every 10 seconds they make 90, so the notes' line (purple) doubles the real income.`
        : pb > len
          ? `In a ${len}-minute game these items never pay back their ${fmt(cost)} gold. Price and income both grow with the stack, so the break-even stays ${fmt(P.COST / perMin(P.RATE))} minutes after you buy.`
          : `They pay back at minute ${fmt(pb)} and end ${fmt(Math.max(0, net))} up. Until then ${fmt(cost)} gold sits in items with no fighting stats, so a rival who bought fighting items is stronger for ${fmt(pb - buy)} minutes.`);
    }
    apis.gold = { seek(t) { st.held = st.tour = true; st.t = t; render(); }, dur: () => 16 };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > 16) st.t = 0; render(); };
  });

  /* ---------- 2: the designer's side: payback minute vs game length ---------- */
  const erf = x => { const s = Math.sign(x); x = Math.abs(x); const t = 1 / (1 + .3275911 * x); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - .284496736) * t + .254829592) * t * Math.exp(-x * x); return s * y; };
  const cdf = m => .5 * (1 + erf((m - P.GAME_MEAN) / (P.GAME_SD * Math.SQRT2)));
  const pdf = m => Math.exp(-((m - P.GAME_MEAN) ** 2) / (2 * P.GAME_SD ** 2));
  canvasDemo('tune', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, ...P.TUNE, key: '' };
    const tourBtn = $(s, '.tu-tour'), rIn = $(s, '.tu-r'), cIn = $(s, '.tu-c'), bIn = $(s, '.tu-b');
    const free = () => { st.tour = false; tourBtn.classList.remove('on'); };
    rIn.oninput = () => { free(); st.rate = +rIn.value; };
    cIn.oninput = () => { free(); st.cost = +cIn.value; };
    bIn.oninput = () => { free(); st.buy = +bIn.value; };
    $$(s, '.tu-pre .btn').forEach(b => b.onclick = () => { free(); st.rate = +b.dataset.r; st.cost = +b.dataset.c; st.buy = P.TUNE.buy; });
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    const X0 = 70, X1 = 1000, Y0 = 120, Y1 = 470;
    function render() {
      let { rate, cost, buy } = st; const t = st.t;
      if (st.tour) {
        rate = 5; cost = 750; buy = 5;
        if (t >= 4 && t < 8) rate = Math.round(lerp(5, 10, ease(clamp((t - 4) / 3))));
        else if (t >= 8 && t < 12) cost = Math.round(lerp(750, 400, ease(clamp((t - 8) / 3))) / 25) * 25;
        else if (t >= 12) { cost = 400; buy = Math.round(lerp(5, 15, ease(clamp((t - 12) / 2.5)))); }
      }
      rIn.value = rate; cIn.value = cost; bIn.value = buy;
      $(s, '.tu-rv').textContent = rate; $(s, '.tu-cv').textContent = cost; $(s, '.tu-bv').textContent = buy;
      $$(s, '.tu-pre .btn').forEach(b => b.classList.toggle('on', +b.dataset.r === rate && +b.dataset.c === cost));
      const pb = payback(rate, cost, buy), share = 1 - cdf(pb), netMean = perMin(rate) * Math.max(0, P.GAME_MEAN - buy) - cost;
      const xm = m => X0 + (X1 - X0) * m / P.MAX_MIN, yp = v => Y1 - (Y1 - Y0) * v;
      T.use(g); panel(g);
      txt(g, 'How long games last, and where one gold item pays back', 30, 40, '800 21px Montserrat, Jost, sans-serif');
      txt(g, `${rate} gold every 10 s = ${perMin(rate)} gold a minute. Price ${cost}. Bought at minute ${buy}.`, 30, 68, '600 16px Jost, sans-serif', C.muted);
      // distribution
      const curve = (from, to, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(xm(from), Y1); for (let m = from; m <= to; m += .25) g.lineTo(xm(m), yp(pdf(m) * .92)); g.lineTo(xm(to), Y1); g.closePath(); g.fill(); };
      curve(0, P.MAX_MIN, 'rgba(93,97,140,.18)');
      const cut = clamp(pb, 0, P.MAX_MIN); if (cut < P.MAX_MIN) curve(cut, P.MAX_MIN, 'rgba(47,174,99,.45)');
      if (cut > 0) curve(0, cut, 'rgba(229,50,45,.20)');
      g.strokeStyle = C.ink; g.lineWidth = 2; g.beginPath(); for (let m = 0; m <= P.MAX_MIN; m += .25) { const y = yp(pdf(m) * .92); m ? g.lineTo(xm(m), y) : g.moveTo(xm(m), y); } g.stroke();
      g.beginPath(); g.moveTo(X0, Y1); g.lineTo(X1, Y1); g.stroke();
      for (let m = 0; m <= P.MAX_MIN; m += 5) txt(g, m + '', xm(m), Y1 + 16, '500 13px Jost, sans-serif', C.muted, 'center');
      txt(g, 'game length, minutes (illustrative spread around 32 min)', (X0 + X1) / 2, Y1 + 40, '600 14px Jost, sans-serif', C.muted, 'center');
      // buy and payback markers
      g.strokeStyle = C.muted; g.lineWidth = 2; g.setLineDash([4, 5]); g.beginPath(); g.moveTo(xm(buy), Y1); g.lineTo(xm(buy), Y0 - 6); g.stroke();
      T.label('bought', xm(buy), Y0 - 16, 'center', C.muted, 14);
      if (pb <= P.MAX_MIN) {
        g.strokeStyle = C.ink; g.lineWidth = 3; g.beginPath(); g.moveTo(xm(pb), Y1); g.lineTo(xm(pb), Y0 - 6); g.stroke(); g.setLineDash([]);
        T.label(`pays back at minute ${pb.toFixed(1).replace(/\.0$/, '')}`, xm(pb), Y0 - 16, 'center', C.ink, 15);
      } else { g.setLineDash([]); T.label(`pays back after minute 60`, X1 - 110, Y0 - 16, 'center', C.redDk, 15); }
      g.setLineDash([]);
      // the share callout
      g.font = '800 54px Montserrat, Jost, sans-serif'; g.fillStyle = share > .5 ? C.good : C.redDk; g.textAlign = 'right'; g.fillText(Math.round(share * 100) + '%', X1, 168);
      txt(g, 'of games last long enough', X1, 202, '600 16px Jost, sans-serif', C.ink, 'right');
      txt(g, 'for the item to pay back', X1, 222, '600 16px Jost, sans-serif', C.ink, 'right');
      g.fillStyle = 'rgba(229,50,45,.20)'; g.fillRect(X1 - 150, 246, 16, 13); txt(g, 'game ends first', X1 - 128, 253, '500 14px Jost, sans-serif');
      g.fillStyle = 'rgba(47,174,99,.45)'; g.fillRect(X1 - 150, 270, 16, 13); txt(g, 'item pays back', X1 - 128, 277, '500 14px Jost, sans-serif');

      const key = [rate, cost, buy].join(); if (key === st.key) return; st.key = key;
      say($(s, '.tu-stats'), `<div class="${pb <= P.GAME_MEAN ? 'g' : 'r'}"><b>${pb.toFixed(1).replace(/\.0$/, '')}</b><span>payback minute (price ÷ gold a minute + buy minute)</span></div>`
        + `<div class="${share > .5 ? 'g' : 'r'}"><b>${Math.round(share * 100)}%</b><span>of games long enough to pay back</span></div>`
        + `<div class="${netMean >= 0 ? 'g' : 'r'}"><b>${netMean >= 0 ? '+' : '−'}${fmt(Math.abs(netMean))}</b><span>net gold per item in a ${P.GAME_MEAN}-minute game</span></div>`);
      say($(s, '.tu-out'), rate >= 10 && cost >= 700
        ? `At the notes' rate the item pays back by minute ${pb.toFixed(0)}, in ${Math.round(share * 100)}% of games: a far stronger item than the deck's 5 gold every 10 seconds.`
        : share < .5
          ? `Most games end before this item pays back: a net loss, even though the counter ticking up every 10 seconds feels like winning.`
          : `It pays back in ${Math.round(share * 100)}% of games, but only after ${(pb - buy).toFixed(0)} minutes of carrying ${fmt(cost)} gold with no fighting stats. Payback is the floor, not proof the item is worth it.`);
    }
    apis.tune = { seek(t) { st.held = st.tour = true; st.t = t; render(); }, dur: () => 15 };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > 15) st.t = 0; render(); };
  });

  window.__seek = (t, w) => apis[w || 'gold'].seek(t);
  window.__dur = w => apis[w || 'gold'].dur();
})();
