/* The 13% rule (DGMS Module 2, Audience Demographics, deck slides 226-237).
   ladder: raid tiers as columns of 14 item-level bars. The gap between tiers is a slider; the felt-upgrade threshold
           depends on how long players wait between upgrades: small jumps read as upgrades while levelling, but after
           weeks of raiding a tier needs about 1/8 (12.5%, "roughly 13%") more total power (Kris Zierhut, slide 232 notes).
   doll:   the paper doll. With about 14 usable slots, a 13% tier is about 1% per item (slide 232 notes).
   mog:    Thunderfury's stats are outclassed in the next expansion; transmogrification keeps its look (slides 233-237,
           "bring back packaging only").
   Numbers: THRESHOLD_RAID (12.5%) and SLOTS (14) are the deck's. THRESHOLD_LEVEL (3%), RAMP_WEEKS (3), BASE_ILVL (63,
   a dungeon set "+5 levels" over 58), power proportional to item level, and the level-60-to-70 sword curve in mog are
   illustrative.
   Images: World of Warcraft item icons from wow.zamimg.com/images/wow/icons/large/<name>.jpg (Wowhead's icon CDN),
   in ../img/thirteen-percent/. inv_sword_39 is Thunderfury, Blessed Blade of the Windseeker. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;
  const W = 1040, H = 585;
  const P = {
    SLOTS: 14,               // deck: about 14 usable item slots
    THRESHOLD_RAID: 12.5,    // deck: 1/8 more total power after weeks between upgrades
    THRESHOLD_LEVEL: 3,      // illustrative: while levelling, a few percent already reads as an upgrade
    RAMP_WEEKS: 3,           // illustrative: weeks of waiting until the full 12.5% applies
    BASE_ILVL: 63,           // illustrative: a dungeon set, "+5 levels" over the dungeon's level
    TIERS: ['Dungeon set', 'Raid tier 1', 'Raid tier 2', 'Raid tier 3'],
    GAP: 13, WEEKS: 4,
    TF_POWER: 100,           // illustrative power index of Thunderfury at level 60
    NEW_SWORD: L => 72 + 7.5 * (L - 60),   // illustrative: a quest reward that grows with each new level
  };
  const thr = w => lerp(P.THRESHOLD_LEVEL, P.THRESHOLD_RAID, clamp(w / P.RAMP_WEEKS));
  const verdict = (gain, th) => gain >= th ? 'reads as an upgrade' : 'reads as a sidegrade';
  const f1 = v => (Math.round(v * 10) / 10).toFixed(1);
  const SLOT = [
    ['Head', 'inv_helmet_08'], ['Neck', 'inv_jewelry_necklace_07'], ['Shoulders', 'inv_shoulder_25'], ['Back', 'inv_misc_cape_18'],
    ['Chest', 'inv_chest_plate16'], ['Wrist', 'inv_bracer_07'], ['Hands', 'inv_gauntlets_29'], ['Waist', 'inv_belt_27'],
    ['Legs', 'inv_pants_04'], ['Feet', 'inv_boots_plate_06'], ['Ring', 'inv_jewelry_ring_15'], ['Ring', 'inv_jewelry_ring_28'],
    ['Trinket', 'inv_misc_gem_pearl_04'], ['Weapon', 'inv_sword_39'],
  ];
  const IMG = {};
  [...SLOT.map(s => s[1]), 'inv_sword_04'].forEach(n => { const im = new Image(); im.src = `../img/thirteen-percent/${n}.jpg`; IMG[n] = im; });
  const JIT = Array.from({ length: P.SLOTS }, (_, i) => 1 + .03 * Math.sin(i * 2.7 + 1.3));
  const panel = g => { g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(255,252,244,.82)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill(); };
  const txt = (g, s, x, y, font, col = C.ink, al = 'left') => { g.font = font; g.fillStyle = col; g.textAlign = al; g.textBaseline = 'middle'; g.fillText(s, x, y); };
  const QUAL = { rare: '#0070dd', epic: '#a335ee', legendary: '#ff8000', common: '#9d9d9d' };
  function itemIcon(g, name, x, y, s, qual = 'rare', a = 1) {
    const im = IMG[name];
    g.save(); g.globalAlpha *= a;
    g.fillStyle = '#0b0d16'; g.beginPath(); g.roundRect(x - 4, y - 4, s + 8, s + 8, 7); g.fill();
    if (im && im.complete && im.naturalWidth) g.drawImage(im, x, y, s, s);
    g.strokeStyle = QUAL[qual]; g.lineWidth = 3; g.strokeRect(x - 1.5, y - 1.5, s + 3, s + 3);
    g.restore();
  }
  const ptr = (cv, e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height]; };
  const apis = {};

  /* ---------- 1: the tier ladder ---------- */
  canvasDemo('ladder', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, gap: P.GAP, weeks: P.WEEKS, key: '' };
    const tourBtn = $(s, '.ld-tour'), gIn = $(s, '.ld-g'), wIn = $(s, '.ld-w');
    const free = () => { st.tour = false; tourBtn.classList.remove('on'); };
    gIn.oninput = () => { free(); st.gap = +gIn.value; };
    wIn.oninput = () => { free(); st.weeks = +wIn.value; };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    const BASE = 500, TOP = 120, YMAX = 130, yv = v => BASE - (BASE - TOP) * v / YMAX;
    function render() {
      let { gap, weeks } = st, reveal = 4; const t = st.t;
      if (st.tour) {
        gap = 13; weeks = 4;
        if (t < 4) reveal = 1 + t;
        else if (t < 8.5) gap = lerp(13, 4, ease(clamp((t - 4) / 3.5)));
        else if (t < 12.5) { gap = 4; weeks = lerp(4, 0, ease(clamp((t - 8.5) / 3))); }
        else { gap = lerp(4, 13, ease(clamp((t - 12.5) / 2))); weeks = lerp(0, 4, ease(clamp((t - 12.5) / 2))); }
        gap = Math.round(gap * 2) / 2; weeks = Math.round(weeks * 2) / 2;
        gIn.value = gap; wIn.value = weeks;
      }
      $(s, '.ld-gv').textContent = f1(gap) + '%';
      $(s, '.ld-wv').textContent = weeks === 0 ? 'levelling' : weeks + (weeks === 1 ? ' week' : ' weeks');
      const th = thr(weeks), up = gap >= th, ilvl = k => P.BASE_ILVL * Math.pow(1 + gap / 100, k);
      T.use(g); panel(g);
      txt(g, 'Each raid tier: 14 items, one bar per slot (item level)', 36, 36, '800 20px Montserrat, Jost, sans-serif');
      txt(g, `dashed line: the previous tier + ${f1(th)}%, the jump that reads as an upgrade at this pace`, 36, 62, '600 15px Jost, sans-serif', C.muted);
      // axis
      g.strokeStyle = 'rgba(38,44,106,.12)'; g.lineWidth = 1;
      for (let v = 0; v <= 120; v += 20) { g.beginPath(); g.moveTo(66, yv(v)); g.lineTo(720, yv(v)); g.stroke(); txt(g, v + '', 58, yv(v), '500 13px Jost, sans-serif', C.muted, 'right'); }
      g.save(); g.translate(22, (BASE + TOP) / 2); g.rotate(-Math.PI / 2); txt(g, 'item level', 0, 0, '600 14px Jost, sans-serif', C.muted, 'center'); g.restore();
      g.strokeStyle = C.ink; g.lineWidth = 2; g.beginPath(); g.moveTo(66, BASE); g.lineTo(720, BASE); g.stroke();
      P.TIERS.forEach((name, k) => {
        const x0 = 84 + k * 160, a = clamp(reveal - k);
        if (a <= 0) return;
        g.save(); g.globalAlpha = a;
        const lv = ilvl(k), col = k === 0 ? '#5aa0e0' : (up ? '#a335ee' : '#c9a227');
        for (let i = 0; i < P.SLOTS; i++) {
          const h = lv * JIT[i] * clamp(a * 1.2);
          g.fillStyle = col; g.fillRect(x0 + i * 10, yv(h), 7.5, BASE - yv(h));
        }
        txt(g, name, x0 + 70, BASE + 20, '700 15px Montserrat, Jost, sans-serif', C.ink, 'center');
        txt(g, `ilvl ${Math.round(lv)}`, x0 + 70, BASE + 42, '600 14px Jost, sans-serif', C.muted, 'center');
        if (k > 0) {
          const prev = ilvl(k - 1), need = prev * (1 + th / 100);
          g.strokeStyle = C.ink; g.lineWidth = 2; g.setLineDash([6, 5]); g.beginPath(); g.moveTo(x0 - 8, yv(need)); g.lineTo(x0 + 146, yv(need)); g.stroke(); g.setLineDash([]);
          g.strokeStyle = 'rgba(38,44,106,.35)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x0 - 8, yv(prev)); g.lineTo(x0 + 146, yv(prev)); g.stroke();
          T.label(`+${f1(gap)}%`, x0 + 70, yv(Math.max(lv * 1.03, need)) - 22, 'center', up ? '#7a1fc0' : '#8a6a00', 16);
        }
        g.restore();
      });
      // gauge
      const gx = 800, gw = 64, gy0 = 470, gy1 = 150, gmax = 25, gyv = v => gy0 - (gy0 - gy1) * clamp(v / gmax);
      txt(g, `Gain per tier: +${f1(gap)}%`, gx + gw / 2 + 50, 110, '800 18px Montserrat, Jost, sans-serif', C.ink, 'center');
      g.fillStyle = '#e8dcc0'; g.beginPath(); g.roundRect(gx, gy1, gw, gy0 - gy1, 8); g.fill();
      g.fillStyle = up ? '#a335ee' : '#c9a227'; g.beginPath(); g.roundRect(gx, gyv(gap), gw, gy0 - gyv(gap), [0, 0, 8, 8]); g.fill();
      for (let v = 0; v <= gmax; v += 5) txt(g, v + '%', gx - 8, gyv(v), '500 13px Jost, sans-serif', C.muted, 'right');
      g.strokeStyle = C.ink; g.lineWidth = 3; g.setLineDash([7, 5]); g.beginPath(); g.moveTo(gx - 4, gyv(th)); g.lineTo(gx + gw + 14, gyv(th)); g.stroke(); g.setLineDash([]);
      txt(g, `needed: ${f1(th)}%`, gx + gw + 20, gyv(th), '700 15px Jost, sans-serif', C.ink);
      g.strokeStyle = 'rgba(229,50,45,.6)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(gx, gyv(P.THRESHOLD_RAID)); g.lineTo(gx + gw, gyv(P.THRESHOLD_RAID)); g.stroke();
      txt(g, '12.5% raid line', gx + gw + 20, gyv(P.THRESHOLD_RAID) + (Math.abs(th - P.THRESHOLD_RAID) < 1.5 ? 20 : 0), '500 13px Jost, sans-serif', C.redDk);
      g.fillStyle = up ? '#efe0fb' : '#f7ecc4'; g.strokeStyle = up ? '#a335ee' : '#c9a227'; g.lineWidth = 2.5;
      g.beginPath(); g.roundRect(760, 500, 250, 56, 12); g.fill(); g.stroke();
      txt(g, verdict(gap, th), 885, 528, '800 18px Montserrat, Jost, sans-serif', up ? '#6a1fa6' : '#7a5a00', 'center');

      const key = [gap, weeks].join(); if (key === st.key) return; st.key = key;
      say($(s, '.ld-stats'), `<div class="${up ? 'g' : 'y'}"><b>+${f1(gap)}%</b><span>total power from one tier to the next</span></div>`
        + `<div><b>${f1(th)}%</b><span>needed to read as an upgrade ${weeks === 0 ? 'while levelling' : 'after ' + weeks + ' week' + (weeks === 1 ? '' : 's') + ' of waiting'}</span></div>`
        + `<div class="y"><b>${f1(gap / P.SLOTS)}%</b><span>per item, spread over ${P.SLOTS} slots</span></div>`);
      say($(s, '.ld-out'), up
        ? (weeks < 1 ? `While levelling, a ${f1(gap)}% jump reads as an upgrade: the last one was minutes ago.` : `+${f1(gap)}% clears the ${f1(th)}% line: after weeks of raiding, the new tier reads as an upgrade.`)
        : `+${f1(gap)}% is real power, but after ${weeks} week${weeks === 1 ? '' : 's'} of waiting it reads as a sidegrade. Raise the gap toward 13%, or upgrade more often.`);
    }
    apis.ladder = { seek(t) { st.held = st.tour = true; st.t = t; render(); }, dur: () => 16 };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > 16) st.t = 0; render(); };
  });

  /* ---------- 2: the paper doll ---------- */
  const ORDER = [12, 4, 0, 13, 7, 2, 9, 5, 11, 1, 8, 3, 10, 6];
  const POS = SLOT.map((_, i) => i < 6 ? [56, 52 + i * 70] : i < 13 ? [524, 52 + (i - 6) * 70] : [290, 472]);
  function silhouette(g) {
    g.save(); g.fillStyle = '#2a3058';
    g.beginPath(); g.arc(320, 120, 38, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(250, 170); g.lineTo(390, 170); g.lineTo(410, 300); g.lineTo(385, 305); g.lineTo(372, 220); g.lineTo(370, 330); g.lineTo(380, 450); g.lineTo(340, 450); g.lineTo(320, 345);
    g.lineTo(300, 450); g.lineTo(260, 450); g.lineTo(270, 330); g.lineTo(268, 220); g.lineTo(255, 305); g.lineTo(230, 300); g.closePath(); g.fill();
    g.restore();
  }
  canvasDemo('doll', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, gap: P.GAP, drops: 1, up: new Set(), weeks: 0, last: -1, lastT: 0, key: '' };
    const tourBtn = $(s, '.dl-tour'), gIn = $(s, '.dl-g');
    const free = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); st.up = new Set(); st.weeks = 0; } };
    gIn.oninput = () => { free(); st.gap = +gIn.value; };
    $$(s, '.dl-drops .btn').forEach(b => b.onclick = () => { free(); st.drops = +b.dataset.n; });
    $(s, '.dl-next').onclick = () => {
      free(); if (st.up.size >= P.SLOTS) return; st.weeks++;
      for (let k = 0; k < st.drops; k++) { const i = ORDER.find(j => !st.up.has(j)); if (i == null) break; st.up.add(i); st.last = i; st.lastT = st.t; }
    };
    $(s, '.dl-reset').onclick = () => { free(); st.up = new Set(); st.weeks = 0; st.last = -1; };
    cv.addEventListener('pointerdown', e => {
      const [x, y] = ptr(cv, e), i = POS.findIndex(([px, py]) => x >= px - 6 && x <= px + 62 && y >= py - 6 && y <= py + 62);
      if (i < 0) return; free();
      if (st.up.has(i)) st.up.delete(i); else { st.up.add(i); st.last = i; st.lastT = st.t; }
    });
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    function render() {
      let { gap, drops } = st, up = st.up, weeks = st.weeks, last = st.last, pop = clamp(1 - (st.t - st.lastT) / 1.2); const t = st.t;
      if (st.tour) {
        gap = 13; drops = 1; gIn.value = gap;
        const n = clamp(Math.floor(t / 1), 0, P.SLOTS); up = new Set(ORDER.slice(0, n)); weeks = n; last = n ? ORDER[n - 1] : -1; pop = n && n <= P.SLOTS && t < P.SLOTS + 1 ? clamp(1 - (t % 1) / .9) : 0;
      }
      $(s, '.dl-gv').textContent = f1(gap) + '%';
      $$(s, '.dl-drops .btn').forEach(b => b.classList.toggle('on', +b.dataset.n === drops));
      const per = gap / P.SLOTS, total = per * up.size, done = total >= P.THRESHOLD_RAID - 1e-9;
      T.use(g); panel(g);
      // character pane
      g.fillStyle = '#151a30'; g.beginPath(); g.roundRect(24, 22, 588, 541, 14); g.fill();
      g.strokeStyle = '#c8a85a'; g.lineWidth = 2; g.stroke();
      silhouette(g);
      txt(g, 'Character', 318, 44, '800 16px Montserrat, Jost, sans-serif', '#f1e3bf', 'center');
      SLOT.forEach(([name, ic], i) => {
        const [x, y] = POS[i], on = up.has(i);
        itemIcon(g, ic, x, y, 56, on ? 'epic' : 'rare');
        if (on && i === last && pop > 0) { g.save(); g.globalAlpha = pop; g.strokeStyle = '#e7c4ff'; g.lineWidth = 4; g.beginPath(); g.roundRect(x - 10, y - 10, 76, 76, 10); g.stroke(); g.restore(); }
        const right = i >= 6 && i < 13, lx = i === 13 ? x + 72 : right ? x - 12 : x + 72;
        txt(g, name, lx, y + 18, '700 14px Jost, sans-serif', '#f1e3bf', right ? 'right' : 'left');
        txt(g, `ilvl ${Math.round(P.BASE_ILVL * (on ? 1 + gap / 100 : 1))}`, lx, y + 38, '500 13px Jost, sans-serif', on ? '#d8b4fe' : '#8fc2f0', right ? 'right' : 'left');
        if (on && i === last && pop > 0) T.popText(`+${f1(per)}%`, x + 28, y - 12 - 16 * (1 - pop), '#a335ee', pop);
      });
      // meter
      const mx = 646, mw = 360;
      txt(g, 'Total power vs your last tier', mx, 52, '800 19px Montserrat, Jost, sans-serif');
      g.font = '800 64px Montserrat, Jost, sans-serif'; g.fillStyle = done ? '#7a1fc0' : C.ink; g.textAlign = 'left'; g.fillText(`+${f1(total)}%`, mx, 120);
      txt(g, `${up.size} of ${P.SLOTS} slots upgraded · raid week ${weeks}`, mx, 166, '600 16px Jost, sans-serif', C.muted);
      const bx = mx, by = 200, bw = mw, bh = 40, bmax = Math.max(gap, P.THRESHOLD_RAID) * 1.15, bxv = v => bx + bw * v / bmax;
      g.fillStyle = '#e8dcc0'; g.beginPath(); g.roundRect(bx, by, bw, bh, 8); g.fill();
      for (let k = 0; k < up.size; k++) { g.fillStyle = k % 2 ? '#a335ee' : '#b85cf2'; g.fillRect(bxv(k * per), by, bxv((k + 1) * per) - bxv(k * per), bh); }
      g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 1; for (let k = 1; k < P.SLOTS; k++) { g.beginPath(); g.moveTo(bxv(k * per), by); g.lineTo(bxv(k * per), by + bh); g.stroke(); }
      g.strokeStyle = C.ink; g.lineWidth = 3; g.setLineDash([6, 4]); g.beginPath(); g.moveTo(bxv(P.THRESHOLD_RAID), by - 10); g.lineTo(bxv(P.THRESHOLD_RAID), by + bh + 10); g.stroke(); g.setLineDash([]);
      txt(g, '12.5%: reads as an upgrade', Math.min(bxv(P.THRESHOLD_RAID), bx + bw - 6), by + bh + 24, '700 14px Jost, sans-serif', C.ink, 'right');
      // the arithmetic
      const rows = [['Tier gap', `${f1(gap)}%`], ['÷ usable slots', `${P.SLOTS}`], ['= one item', `+${f1(per)}%`], ['Weeks to finish the set', `${Math.ceil(P.SLOTS / drops)}`]];
      rows.forEach(([k, v], i) => {
        const y = 310 + i * 40; g.strokeStyle = 'rgba(38,44,106,.15)'; g.lineWidth = 1; g.beginPath(); g.moveTo(mx, y + 20); g.lineTo(mx + mw, y + 20); g.stroke();
        txt(g, k, mx, y, '600 17px Jost, sans-serif', C.ink); txt(g, v, mx + mw, y, '800 20px Montserrat, Jost, sans-serif', i === 2 ? '#7a1fc0' : C.ink, 'right');
      });
      txt(g, 'One drop alone is about 1%: too small to feel.', mx, 490, '600 15px Jost, sans-serif', C.muted);
      txt(g, 'The whole set is what has to clear the line.', mx, 514, '600 15px Jost, sans-serif', C.muted);

      const key = [gap, drops, up.size, weeks].join(); if (key === st.key) return; st.key = key;
      say($(s, '.dl-stats'), `<div class="y"><b>+${f1(per)}%</b><span>one item, ${f1(gap)}% ÷ ${P.SLOTS} slots</span></div>`
        + `<div class="${done ? 'g' : ''}"><b>+${f1(total)}%</b><span>total after ${up.size} of ${P.SLOTS} upgrades</span></div>`
        + `<div><b>${Math.ceil(P.SLOTS / drops)}</b><span>raid weeks to finish the set at ${drops} drop${drops > 1 ? 's' : ''} a week</span></div>`);
      say($(s, '.dl-out'), done
        ? `The set clears 12.5%: next to the old tier, it reads as an upgrade. Each piece added only about ${f1(per)}%.`
        : gap * 1 < P.THRESHOLD_RAID
          ? `Even the full set is only +${f1(gap)}%, under the 12.5% line: weeks of raiding for a tier that reads as a sidegrade.`
          : `+${f1(total)}% so far. Designers work backwards: a 13% tier over ${P.SLOTS} slots means about 1% per item.`);
    }
    apis.doll = { seek(t) { st.held = st.tour = true; st.t = t; render(); }, dur: () => 16 };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > 16) st.t = 0; render(); };
  });

  /* ---------- 3: Thunderfury and transmog ---------- */
  canvasDemo('mog', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, lvl: 60, wield: 'tf', mog: false, key: '' };
    const tourBtn = $(s, '.mg-tour'), lIn = $(s, '.mg-l'), mIn = $(s, '.mg-mog');
    const free = () => { st.tour = false; tourBtn.classList.remove('on'); };
    lIn.oninput = () => { free(); st.lvl = +lIn.value; };
    mIn.onchange = () => { free(); st.mog = mIn.checked; if (st.mog) st.wield = 'new'; };
    $$(s, '.mg-wield .btn').forEach(b => b.onclick = () => { free(); st.wield = b.dataset.w; });
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    const X0 = 430, X1 = 990, Y0 = 120, Y1 = 470, PMAX = 160;
    const xl = L => X0 + (X1 - X0) * (L - 60) / 10, yp = v => Y1 - (Y1 - Y0) * v / PMAX;
    function render() {
      let { lvl, wield, mog } = st; const t = st.t;
      if (st.tour) {
        lvl = 60; wield = 'tf'; mog = false;
        if (t < 7) lvl = Math.round(lerp(60, 70, ease(clamp((t - .5) / 6))));
        else if (t < 10.5) { lvl = 70; wield = 'new'; }
        else { lvl = 70; wield = 'new'; mog = true; }
        lIn.value = lvl; mIn.checked = mog;
      }
      if (mog) wield = 'new';
      $(s, '.mg-lv').textContent = lvl;
      $$(s, '.mg-wield .btn').forEach(b => b.classList.toggle('on', b.dataset.w === wield));
      const tf = P.TF_POWER, nw = P.NEW_SWORD(lvl), best = Math.max(tf, nw), have = wield === 'tf' ? tf : nw;
      const lost = 100 * (1 - have / best), gainNew = 100 * (nw / tf - 1), lookTF = wield === 'tf' || mog;
      T.use(g); panel(g);
      // character card
      g.fillStyle = '#151a30'; g.beginPath(); g.roundRect(24, 22, 370, 541, 14); g.fill(); g.strokeStyle = '#c8a85a'; g.lineWidth = 2; g.stroke();
      txt(g, 'What other players see', 209, 52, '800 16px Montserrat, Jost, sans-serif', '#f1e3bf', 'center');
      itemIcon(g, lookTF ? 'inv_sword_39' : 'inv_sword_04', 139, 80, 140, lookTF ? 'legendary' : 'rare');
      txt(g, lookTF ? 'Thunderfury, Blessed Blade' : 'A new quest sword', 209, 252, '800 18px Montserrat, Jost, sans-serif', lookTF ? '#ff9a2e' : '#8fc2f0', 'center');
      txt(g, lookTF ? 'of the Windseeker' : '(looks like any other sword)', 209, 276, '600 16px Jost, sans-serif', lookTF ? '#ff9a2e' : '#8fc2f0', 'center');
      g.strokeStyle = 'rgba(241,227,191,.25)'; g.lineWidth = 1; g.beginPath(); g.moveTo(50, 304); g.lineTo(368, 304); g.stroke();
      txt(g, 'What the numbers use', 209, 330, '800 16px Montserrat, Jost, sans-serif', '#f1e3bf', 'center');
      itemIcon(g, wield === 'tf' ? 'inv_sword_39' : 'inv_sword_04', 179, 352, 60, wield === 'tf' ? 'legendary' : 'rare');
      txt(g, wield === 'tf' ? 'Thunderfury stats' : 'Quest sword stats', 209, 440, '700 16px Jost, sans-serif', '#f1e3bf', 'center');
      txt(g, `power ${Math.round(have)}`, 209, 464, '800 22px Montserrat, Jost, sans-serif', lost > .5 ? '#ff8a80' : '#9be3b4', 'center');
      if (mog) { g.fillStyle = '#a335ee'; g.beginPath(); g.roundRect(84, 498, 250, 40, 10); g.fill(); txt(g, 'transmog: look kept', 209, 518, '800 16px Montserrat, Jost, sans-serif', '#fff', 'center'); }
      // chart
      txt(g, 'Weapon power as the next expansion levels you up', X0 - 20, 46, '800 19px Montserrat, Jost, sans-serif');
      txt(g, 'illustrative power index; Thunderfury = 100 at level 60', X0 - 20, 72, '600 14px Jost, sans-serif', C.muted);
      g.strokeStyle = 'rgba(38,44,106,.12)'; g.lineWidth = 1;
      for (let v = 0; v <= PMAX; v += 40) { g.beginPath(); g.moveTo(X0, yp(v)); g.lineTo(X1, yp(v)); g.stroke(); txt(g, v + '', X0 - 8, yp(v), '500 13px Jost, sans-serif', C.muted, 'right'); }
      for (let L = 60; L <= 70; L += 2) txt(g, 'lvl ' + L, xl(L), Y1 + 18, '500 13px Jost, sans-serif', C.muted, 'center');
      g.strokeStyle = C.ink; g.lineWidth = 2; g.beginPath(); g.moveTo(X0, Y0); g.lineTo(X0, Y1); g.lineTo(X1, Y1); g.stroke();
      // 12.5% band above Thunderfury
      g.fillStyle = 'rgba(163,53,238,.10)'; g.fillRect(X0, yp(tf * 1.125), X1 - X0, yp(tf) - yp(tf * 1.125));
      g.strokeStyle = '#ff8000'; g.lineWidth = 4; g.beginPath(); g.moveTo(X0, yp(tf)); g.lineTo(X1, yp(tf)); g.stroke();
      T.label('Thunderfury', X1 - 60, yp(tf) + 22, 'center', '#b35a00', 15);
      g.strokeStyle = '#0070dd'; g.lineWidth = 4; g.beginPath(); g.moveTo(xl(60), yp(P.NEW_SWORD(60))); g.lineTo(xl(70), yp(P.NEW_SWORD(70))); g.stroke();
      T.label('new quest sword', xl(68.2), yp(P.NEW_SWORD(68.2)) - 24, 'center', '#0058b0', 15);
      const cross = 60 + (tf * 1.125 - 72) / 7.5;
      g.strokeStyle = C.ink; g.lineWidth = 1.5; g.setLineDash([4, 5]); g.beginPath(); g.moveTo(xl(cross), Y1); g.lineTo(xl(cross), yp(tf * 1.125)); g.stroke(); g.setLineDash([]);
      T.label(`+12.5% at lvl ${cross.toFixed(1)}`, xl(cross), yp(tf * 1.125) - 30, 'center', '#6a1fa6', 14);
      // you
      g.strokeStyle = 'rgba(38,44,106,.5)'; g.lineWidth = 2; g.beginPath(); g.moveTo(xl(lvl), Y0); g.lineTo(xl(lvl), Y1); g.stroke();
      g.fillStyle = wield === 'tf' ? '#ff8000' : '#0070dd'; g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.arc(xl(lvl), yp(have), 10, 0, Math.PI * 2); g.fill(); g.stroke();
      if (lost > .5) { g.strokeStyle = C.red; g.lineWidth = 3; g.beginPath(); g.moveTo(xl(lvl), yp(have) - 12); g.lineTo(xl(lvl), yp(best) + 4); g.stroke(); T.label(`−${Math.round(lost)}% power`, xl(lvl) + (lvl < 64 ? 70 : -70), (yp(have) + yp(best)) / 2, 'center', C.redDk, 15); }
      txt(g, `You: level ${lvl}`, X0 + 10, Y1 + 50, '700 16px Jost, sans-serif', C.ink);
      txt(g, '"Bring back packaging only."', X1, Y1 + 50, '700 16px Jost, sans-serif', C.muted, 'right');

      const key = [lvl, wield, mog].join(); if (key === st.key) return; st.key = key;
      say($(s, '.mg-stats'), `<div class="${gainNew >= P.THRESHOLD_RAID ? 'g' : 'y'}"><b>${gainNew >= 0 ? '+' : '−'}${Math.round(Math.abs(gainNew))}%</b><span>new sword vs Thunderfury at level ${lvl}</span></div>`
        + `<div class="${lost > .5 ? 'r' : 'g'}"><b>${lost > .5 ? '−' + Math.round(lost) + '%' : '0%'}</b><span>power given up by the choice</span></div>`
        + `<div class="${lookTF ? 'g' : 'r'}"><b>${lookTF ? 'kept' : 'lost'}</b><span>Thunderfury's look</span></div>`);
      say($(s, '.mg-out'), mog
        ? 'With transmog the numbers move on and the look stays. The sunk cost was never the stats; it was the sword people recognise.'
        : wield === 'tf'
          ? (lost > .5 ? `Keeping Thunderfury costs ${Math.round(lost)}% power. Players hold on anyway, because of everything they spent to get it.` : 'At level 60 Thunderfury is still the strongest blade around.')
          : (gainNew > 0 ? `The quest sword is stronger, but the legendary look is gone: weeks of raiding now sit in the bank.` : 'The quest sword is weaker here and looks plain: no reason yet to swap.'));
    }
    apis.mog = { seek(t) { st.held = st.tour = true; st.t = t; render(); }, dur: () => 15 };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > 15) st.t = 0; render(); };
  });

  window.__seek = (t, w) => apis[w || 'ladder'].seek(t);
  window.__dur = w => apis[w || 'ladder'].dur();
})();
