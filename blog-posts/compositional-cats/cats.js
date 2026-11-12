/* Compositional Cats (Alex Brazie on Mewgenics), three spikes.
   reels:   nine body-part slots, each a reel of real mutation names. Authoring adds the parts up; players meet the
            product. Counts in parts.js (MEW_PARTS).
   anchors: class pieces and items only meet through a few shared anchors (elements, Meat, Holy). Scarce anchors make
            each link a find; wire everything to everything and no link stands out. Cut a piece and see whether an
            anchor loses its last source. Pieces in PIECES.
   board:   the elemental anchor on a tactics board: Water soaks, Cold freezes the wet, Fire is put out by water,
            Electric chains through wet and metal, and a mechanical unit struck by electricity takes an extra turn
            (the Tinker's rule), so a Mage's bolt powers the Tinker's turret. Rules in castAt(). */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;
  const W = 1040, H = 585;
  const panel = g => { g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(255,252,244,.8)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill(); };
  const txt = (g, s, x, y, font, col = C.ink, al = 'left') => { g.font = font; g.fillStyle = col; g.textAlign = al; g.textBaseline = 'middle'; g.fillText(s, x, y); };
  const box = (g, x, y, w, h, fill, stroke, r = 10, lw = 2) => { g.beginPath(); g.roundRect(x, y, w, h, r); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); } };
  const tint = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${a})`; };
  const img = src => { const i = new Image(); i.src = src; return i; };
  const pic = (g, im, x, y, w, h) => { if (im.complete && im.naturalWidth) g.drawImage(im, x - w / 2, y - h / 2, w, h); };
  const big = n => BigInt(n).toLocaleString('en-US');
  const freeOf = (st, btn) => () => { st.tour = false; btn.classList.remove('on'); };
  const apis = {};

  /* ---------- 1: the number that shouldn't be possible ---------- */
  const SLOTS = ['eye', 'leg', 'ear', 'tail', 'mouth', 'body', 'head', 'eyebrow', 'fur'];
  const SIMG = Object.fromEntries(SLOTS.map(k => [k, img(`img/slot-${k}.svg`)]));
  const CLASSES = 14;   // collar classes on the wiki's abilities page
  const ARTICLE = 203583570981120n;
  // the reels land on parts that have exported art; KIT_FRAMES (kitten-art.js) maps each name to its sprite frame
  const ART = window.KIT_FRAMES || {};
  const PICKABLE = Object.fromEntries(SLOTS.map(k => [k, MEW_PARTS[k].map((_, i) => i).filter(i => ART[k] && ART[k][i] != null)]));
  const LAND = 2.4545;   // spin offset that centres a reel's pick in the gold window
  // a fixed pair of cats for the walk-through, so the tour (and its GIF) is the same every run
  const REEL_TOUR = [0, 1].map(r => Object.fromEntries(SLOTS.map((k, i) => { const a = PICKABLE[k]; return [k, a.length ? a[(i * 17 + 5 + r * 23) % a.length] : 0]; })));
  const rnd = k => { const a = PICKABLE[k]; return a.length ? a[Math.floor(Math.random() * a.length)] : 0; };
  const rollDur = i => .8 + i * .09;
  const fitFont = (g, s, w, weight, size, min) => { for (; size > min; size -= 1) { g.font = `${weight} ${size}px Montserrat`; if (g.measureText(s).width <= w) break; } return size; };
  canvasDemo('reels', (s, cv, g) => {
    // pick[k]: the name index a live reel lands on; roll[k]: when it started spinning; prev[k]: what the cat wore before
    const st = { tour: true, t: 0, held: false, on: new Set(), cls: false, key: '', pick: {}, roll: {}, prev: {}, catKey: null, catImg: null };
    const tourBtn = $(s, '.re-tour'), free = freeOf(st, tourBtn), list = $(s, '.re-slots');
    list.innerHTML = SLOTS.map(k => `<label class="chk"><input type="checkbox" data-k="${k}"> ${k[0].toUpperCase() + k.slice(1)} <small style="color:var(--muted);font-weight:500">(${MEW_PARTS[k].length})</small></label>`).join('');
    const sync = () => { $$(list, 'input').forEach(i => i.checked = st.on.has(i.dataset.k)); $(s, '.re-cls').checked = st.cls; };
    const settled = k => st.on.has(k) && st.pick[k] != null ? (st.t - st.roll[k] >= rollDur(SLOTS.indexOf(k)) ? st.pick[k] : st.prev[k]) : undefined;
    const roll = (k, delay = 0) => { st.prev[k] = settled(k); st.pick[k] = rnd(k); st.roll[k] = st.t + delay; };
    $$(list, 'input').forEach(i => i.onchange = () => { free(); const k = i.dataset.k; if (i.checked) { st.on.add(k); roll(k); } else st.on.delete(k); });
    $(s, '.re-cls').onchange = e => { free(); st.cls = e.target.checked; };
    $(s, '.re-all').onclick = () => { free(); SLOTS.forEach((k, i) => { if (!st.on.has(k)) { st.on.add(k); roll(k, i * .08); } }); sync(); };
    $(s, '.re-roll').onclick = () => { free(); if (!st.on.size) st.on = new Set(SLOTS); [...st.on].forEach(k => roll(k, SLOTS.indexOf(k) * .08)); sync(); };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    const STEP = 1.7, REROLL = STEP * SLOTS.length + 4, DUR = STEP * SLOTS.length + 8;
    // draw the cat the settled reels describe; unlit slots keep the base kitten's part
    function catFor(on) {
      const pick = {}, names = [];
      SLOTS.forEach(k => { const v = settled(k); if (v != null) { pick[k] = ART[k][v]; names.push(v); } else names.push('-'); });
      const key = names.join();
      if (key === st.catKey || !window.KITTEN) return;
      st.catKey = key;
      const url = URL.createObjectURL(new Blob([KITTEN.svg(pick)], { type: 'image/svg+xml' })), im = new Image();
      im.onload = () => { if (st.catKey === key) { if (st.catImg) URL.revokeObjectURL(st.catImg.src); st.catImg = im; } else URL.revokeObjectURL(url); };
      im.src = url;
    }
    function render() {
      const t = st.t;
      if (st.tour) {
        const n = clamp(Math.floor(t / STEP) + 1, 0, SLOTS.length), cls = t > STEP * SLOTS.length + 2.5, r2 = t >= REROLL;
        SLOTS.forEach((k, i) => { st.pick[k] = REEL_TOUR[r2 ? 1 : 0][k]; st.roll[k] = r2 ? REROLL + i * .08 : i * STEP; st.prev[k] = r2 ? REEL_TOUR[0][k] : undefined; });
        if (st.on.size !== n || st.cls !== cls) { st.on = new Set(SLOTS.slice(0, n)); st.cls = cls; sync(); }
      }
      const on = SLOTS.filter(k => st.on.has(k));
      const sum = on.reduce((a, k) => a + MEW_PARTS[k].length, 0) + (st.cls ? CLASSES : 0);
      const prod = on.length ? on.reduce((a, k) => a * BigInt(MEW_PARTS[k].length), 1n) * (st.cls ? BigInt(CLASSES) : 1n) : 0n;
      T.use(g); panel(g);
      txt(g, 'One cat, nine body-part slots', 24, 28, '800 19px Montserrat');
      txt(g, 'each reel lists that slot’s real mutations and birth defects', W - 24, 28, '600 14px Jost', C.muted, 'right');
      // the reels
      const RW = 104, RX = 30, RY = 52, RH = 250;
      SLOTS.forEach((k, i) => {
        const x = RX + i * (RW + 4), live = st.on.has(k), names = MEW_PARTS[k];
        box(g, x, RY, RW, RH, live ? '#fffaf0' : 'rgba(205,191,159,.22)', live ? C.navy : '#d8ccb2', 10, live ? 2.5 : 1.5);
        g.globalAlpha = live ? 1 : .35;
        box(g, x + 6, RY + 6, RW - 12, 62, 'rgba(21,32,68,.06)', null, 8);
        pic(g, SIMG[k], x + RW / 2, RY + 37, 48, 48);
        txt(g, k.toUpperCase(), x + RW / 2, RY + 84, '800 13px Montserrat', C.ink, 'center');
        txt(g, `${names.length} options`, x + RW / 2, RY + 102, '600 12px Jost', C.muted, 'center');
        // the reel window: a live reel spins, then lands its pick in the gold window
        g.save(); g.beginPath(); g.rect(x + 4, RY + 116, RW - 8, RH - 122); g.clip();
        let spin = i * 3.1;
        if (live && st.pick[k] != null) { const u = clamp((t - st.roll[k]) / rollDur(i), 0, 1); spin = st.pick[k] - LAND - (14 + i * 2) * Math.pow(1 - u, 3); }
        const base = Math.floor(spin), frac = spin - base;
        for (let r = -1; r < 7; r++) {
          const nm = names[(base + r + names.length * 9) % names.length], y = RY + 128 + (r - frac) * 22, mid = Math.abs(y - (RY + 182)) < 11;
          txt(g, nm.length > 14 ? nm.slice(0, 13) + '…' : nm, x + RW / 2, y, (mid ? '700 ' : '500 ') + '11.5px Jost', mid && live ? C.ink : C.muted, 'center');
        }
        g.restore();
        g.strokeStyle = 'rgba(255,185,81,.9)'; g.lineWidth = 2; g.strokeRect(x + 6, RY + 171, RW - 12, 22);
        g.globalAlpha = 1;
        if (i < SLOTS.length - 1) txt(g, '×', x + RW + 2, RY + RH / 2, '800 16px Montserrat', live && st.on.has(SLOTS[i + 1]) ? C.goldInk : '#d8ccb2', 'center');
      });
      // the two totals
      const Y2 = 322, BW = 200, GX = 242, GW = 512;
      box(g, 30, Y2, BW, 128, 'rgba(46,163,220,.1)', '#2ea3dc', 12, 2);
      txt(g, 'Parts the team authored', 44, Y2 + 24, '700 15px Jost', C.muted);
      txt(g, sum.toLocaleString('en-US'), 44, Y2 + 68, '800 44px Montserrat', '#1f6f99');
      txt(g, 'added up, one at a time', 44, Y2 + 108, '600 14px Jost', C.muted);
      box(g, GX, Y2, GW, 128, 'rgba(255,185,81,.18)', '#e0a92d', 12, 2);
      txt(g, 'Different cats a player can meet', GX + 16, Y2 + 24, '700 15px Jost', C.muted);
      const big1 = on.length ? big(prod) : '0';
      txt(g, big1, GX + 16, Y2 + 68, `800 ${fitFont(g, big1, GW - 32, 800, 44, 22)}px Montserrat`, C.goldInk);
      const mul = on.length ? `multiplied: ${on.map(k => MEW_PARTS[k].length).join(' × ')}${st.cls ? ' × ' + CLASSES + ' classes' : ''}` : 'turn on a slot';
      g.font = '600 14px Jost'; const mulSize = g.measureText(mul).width > GW - 32 ? 12 : 14;
      txt(g, mul, GX + 16, Y2 + 108, `600 ${mulSize}px Jost`, C.muted);
      // a log strip: thousand, million, billion, trillion, quadrillion
      const LX = 30, LW = 724, LY = 490, digits = on.length ? prod.toString().length - 1 + Math.log10(+('0.' + prod.toString().slice(0, 6)) * 10) : 0;
      box(g, LX, LY, LW, 16, '#e8dcc0', null, 8);
      const xs = d => LX + LW * d / 17;
      box(g, LX, LY, Math.max(16, xs(Math.log10(Math.max(1, sum))) - LX), 16, '#2ea3dc', null, 8);
      box(g, LX, LY + 22, Math.max(16, xs(digits) - LX), 16, '#e0a92d', null, 8);
      [[3, 'thousand'], [6, 'million'], [9, 'billion'], [12, 'trillion'], [15, 'quadrillion']].forEach(([d, n]) => {
        g.fillStyle = C.navy; g.fillRect(xs(d) - 1, LY - 6, 2, 50); txt(g, n, xs(d), LY + 56, '600 13px Jost', C.muted, 'center');
      });
      txt(g, 'log scale', LX, LY - 16, '600 12px Jost', C.muted);
      // the cat those reels describe
      const CX = 770, CW = 240, CY = Y2, CH = 252;
      box(g, CX, CY, CW, CH, '#fffaf0', C.navy, 12, 2);
      txt(g, 'The cat on the gold line', CX + CW / 2, CY + 22, '800 15px Montserrat', C.ink, 'center');
      catFor(on);
      if (st.catImg && st.catImg.complete && st.catImg.naturalWidth) {
        const ih = CH - 64, iw = ih * KITTEN.aspect, w2 = Math.min(iw, CW - 16), h2 = w2 / KITTEN.aspect;
        g.drawImage(st.catImg, CX + (CW - w2) / 2, CY + 34 + (ih - h2) / 2, w2, h2);
      }
      const rolled = SLOTS.filter(k => settled(k) != null).length;
      txt(g, !rolled ? 'the base kitten: no slot in play' : rolled === SLOTS.length ? 'all nine slots from the reels' : `${rolled} slot${rolled > 1 ? 's' : ''} from the reels, the rest base`, CX + CW / 2, CY + CH - 18, '600 13px Jost', C.muted, 'center');
      const key = on.join() + st.cls; if (key === st.key) return; st.key = key;
      say($(s, '.re-out'), !on.length ? 'Turn on a slot.' : on.length < SLOTS.length
        ? `${on.length} slot${on.length > 1 ? 's' : ''}: ${sum} parts authored, ${big(prod)} combinations. Each new slot multiplies; it never just adds.`
        : `${sum} parts and a rule to combine them: <b>${big(prod)}</b> bodies${st.cls ? ' across 14 collar classes' : ''}, before abilities, passives, items or injuries. Nobody authored those cats. (The article counts ${big(ARTICLE)} with its own slot counts.)`);
    }
    apis.reels = { seek(t) { st.held = st.tour = true; st.t = t; render(); }, dur: () => DUR };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > DUR) st.t = 0; render(); };
  });

  /* ---------- 2: parts and anchors ---------- */
  const ANCH = {
    fire: { n: 'Fire', ic: 'small-fire', col: '#dc2626' }, water: { n: 'Water', ic: 'drop', col: '#0891b2' },
    cold: { n: 'Cold', ic: 'snowflake-1', col: '#0369a1' }, elec: { n: 'Electric', ic: 'lightning-helix', col: '#d97706' },
    meat: { n: 'Meat', ic: 'meat', col: '#a8201c' }, holy: { n: 'Holy', ic: 'heart-plus', col: '#c48a00' },
  };
  // the pieces the article names, and the anchors each one touches
  const PIECES = [
    { c: 'Cleric', n: 'Basic strike: heal ally, harm foe', a: ['holy'] },
    { c: 'Cleric', n: 'Passive: holy heals hurt enemies', a: ['holy'] },
    { c: 'Cleric', n: 'Passive: a heal grants a stat buff', a: ['holy'] },
    { c: 'Butcher', n: 'Melee strike drops Meat', a: ['meat'] },
    { c: 'Butcher', n: 'Double pickups on existing Meat', a: ['meat'] },
    { c: 'Butcher', n: 'Burn cooks Meat: double potency', a: ['meat', 'fire'] },
    { c: 'Butcher', n: 'Spoil: Meat becomes flies', a: ['meat'] },
    { c: 'Tinker', n: 'Build a turret (mechanical)', a: ['elec'] },
    { c: 'Tinker', n: 'Mech suit (mechanical)', a: ['elec'] },
    { c: 'Tinker', n: 'Battery: shock your machines', a: ['elec'] },
    { c: 'Mage', n: 'Lightning bolt', a: ['elec', 'water'] },
    { c: 'Mage', n: 'Fireball', a: ['fire'] },
    { c: 'Mage', n: 'Frost ray', a: ['cold', 'water'] },
    { c: 'Mage', n: 'Rain: soak an area', a: ['water'] },
    { c: 'Item', n: 'Charged collar (electric)', a: ['elec'] },
    { c: 'Item', n: 'Flint: strikes burn', a: ['fire'] },
    { c: 'Item', n: 'Ice pack: strikes chill', a: ['cold'] },
  ];
  const CCOL = { Cleric: '#c48a00', Butcher: '#a8201c', Tinker: '#5d618c', Mage: '#5562eb', Item: '#2fae63' };
  const AK = Object.keys(ANCH);
  canvasDemo('anchors', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, mode: 'scarce', focus: null, cut: new Set(), key: '' };
    const tourBtn = $(s, '.an-tour'), free = freeOf(st, tourBtn);
    const setMode = m => { st.mode = m; $$(s, '.an-mode .btn').forEach(b => b.classList.toggle('on', b.dataset.m === m)); };
    $$(s, '.an-mode .btn').forEach(b => b.onclick = () => { free(); setMode(b.dataset.m); st.cut.clear(); });
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    // layout: pieces in two columns, anchors in the middle
    const PX = i => i < 9 ? 22 : 778, PY = i => 64 + (i % 9) * 57, PW = 240, PH = 46;
    const AX = 520, AY = k => 82 + AK.indexOf(k) * 82;
    const links = i => st.mode === 'all' ? AK : PIECES[i].a;
    const hit = (mx, my) => {
      for (let i = 0; i < PIECES.length; i++) if (mx > PX(i) && mx < PX(i) + PW && my > PY(i) && my < PY(i) + PH) return ['p', i];
      for (const k of AK) if (Math.hypot(mx - AX, my - AY(k)) < 34) return ['a', k];
      return null;
    };
    const pos = e => { const b = cv.getBoundingClientRect(); return [(e.clientX - b.left) * W / b.width, (e.clientY - b.top) * H / b.height]; };
    cv.addEventListener('mousemove', e => { const h = hit(...pos(e)); if (!st.tour) st.focus = h && h[0] === 'a' ? h[1] : null; cv.style.cursor = h ? 'pointer' : ''; });
    cv.addEventListener('click', e => { const h = hit(...pos(e)); if (!h) return; free(); if (h[0] === 'p') { st.cut.has(h[1]) ? st.cut.delete(h[1]) : st.cut.add(h[1]); } });
    const DUR = 27;
    function render() {
      const t = st.t;
      if (st.tour) {
        st.focus = t < 2 ? null : t < 12 ? AK[Math.floor((t - 2) / (10 / 6)) % 6] : null;
        if (t < 15) { if (st.mode !== 'scarce') setMode('scarce'); st.cut = new Set(); }
        else if (t < 20) { if (st.mode !== 'all') setMode('all'); st.cut = new Set(); }
        else { if (st.mode !== 'scarce') setMode('scarce'); st.cut = new Set(t < 23.5 ? [14] : [14, 7, 8, 9]); }
      }
      T.use(g); panel(g);
      txt(g, 'Pieces', 22, 30, '800 18px Montserrat'); txt(g, 'Anchors', AX, 30, '800 18px Montserrat', C.ink, 'center'); txt(g, 'Pieces', W - 22, 30, '800 18px Montserrat', C.ink, 'right');
      // which anchors still have a source
      const fed = Object.fromEntries(AK.map(k => [k, PIECES.some((p, i) => !st.cut.has(i) && links(i).includes(k))]));
      // links first
      PIECES.forEach((p, i) => {
        if (st.cut.has(i)) return;
        links(i).forEach(k => {
          const lit = st.focus ? st.focus === k : true, col = ANCH[k].col;
          const x0 = i < 9 ? PX(i) + PW : PX(i), y0 = PY(i) + PH / 2;
          g.strokeStyle = tint(col, st.mode === 'all' ? (lit && st.focus ? .8 : .18) : lit ? .75 : .1); g.lineWidth = lit && st.focus ? 3 : 2;
          g.beginPath(); g.moveTo(x0, y0); g.bezierCurveTo((x0 + AX) / 2, y0, (x0 + AX) / 2, AY(k), AX, AY(k)); g.stroke();
        });
      });
      // pieces
      PIECES.forEach((p, i) => {
        const x = PX(i), y = PY(i), cut = st.cut.has(i), lit = !st.focus || links(i).includes(st.focus);
        g.globalAlpha = cut ? .3 : lit ? 1 : .35;
        box(g, x, y, PW, PH, '#fffaf0', CCOL[p.c], 8, 2);
        box(g, x, y, 6, PH, CCOL[p.c], null, 3);
        txt(g, p.c.toUpperCase(), x + 14, y + 13, '800 10.5px Montserrat', CCOL[p.c]);
        txt(g, p.n, x + 14, y + 31, '600 13px Jost');
        if (cut) { g.globalAlpha = 1; g.strokeStyle = C.redDk; g.lineWidth = 3; g.beginPath(); g.moveTo(x + 8, y + PH / 2); g.lineTo(x + PW - 8, y + PH / 2); g.stroke(); txt(g, 'cut', x + PW - 26, y + 12, '800 12px Montserrat', C.redDk); }
        g.globalAlpha = 1;
      });
      // anchors
      AK.forEach(k => {
        const a = ANCH[k], y = AY(k), lit = !st.focus || st.focus === k, srcs = PIECES.filter((p, i) => !st.cut.has(i) && links(i).includes(k));
        const classes = new Set(srcs.filter(p => p.c !== 'Item').map(p => p.c));
        g.globalAlpha = lit ? 1 : .4;
        g.fillStyle = fed[k] ? a.col : '#c9bfa7'; g.beginPath(); g.arc(AX, y, 30, 0, 7); g.fill();
        if (!fed[k]) { g.strokeStyle = C.redDk; g.lineWidth = 3; g.setLineDash([5, 4]); g.beginPath(); g.arc(AX, y, 34, 0, 7); g.stroke(); g.setLineDash([]); }
        GI.draw(g, a.ic, AX, y, 32, '#fff');
        txt(g, a.n, AX + 42, y - 8, '800 14px Montserrat', fed[k] ? a.col : C.redDk);
        txt(g, fed[k] ? `${classes.size} class${classes.size === 1 ? '' : 'es'}${srcs.some(p => p.c === 'Item') ? ' + items' : ''}` : 'no source left', AX + 42, y + 10, '600 12px Jost', fed[k] ? C.muted : C.redDk);
        g.globalAlpha = 1;
      });
      // the count
      const live = PIECES.map((p, i) => i).filter(i => !st.cut.has(i));
      let pairs = 0, meet = 0;
      for (let a = 0; a < live.length; a++) for (let b = a + 1; b < live.length; b++) { pairs++; if (links(live[a]).some(k => links(live[b]).includes(k))) meet++; }
      const share = pairs ? meet / pairs : 0;
      box(g, AX - 120, 540, 240, 36, st.mode === 'all' ? 'rgba(229,50,45,.12)' : 'rgba(47,174,99,.12)', st.mode === 'all' ? '#e07b72' : '#5fb47c', 10, 2);
      txt(g, `${Math.round(share * 100)}% of piece pairs interact`, AX, 558, '800 15px Montserrat', st.mode === 'all' ? C.redDk : C.good, 'center');
      const key = [st.mode, st.focus, [...st.cut].join()].join('|'); if (key === st.key) return; st.key = key;
      const orphan = AK.filter(k => !fed[k]).map(k => ANCH[k].n);
      say($(s, '.an-out'), orphan.length
        ? `Cut the whole Tinker kit and the charged collar, and <b>Electric</b> loses its last source. The Mage’s lightning still works, but the turret combo is gone.`
        : st.cut.size
          ? `Cut a piece: every anchor still has another source, so nothing else breaks. That is why any single piece is disposable.`
          : st.mode === 'all'
            ? `Wire every piece to every anchor and ${Math.round(share * 100)}% of pairs interact. When everything connects, no connection feels like a discovery.`
            : st.focus
              ? `<b>${ANCH[st.focus].n}</b> links ${PIECES.filter(p => p.a.includes(st.focus)).length} pieces from ${(n => n + (n === 1 ? ' class' : ' classes'))(new Set(PIECES.filter(p => p.a.includes(st.focus) && p.c !== 'Item').map(p => p.c)).size)}${st.focus === 'elec' ? ': only the Tinker and the Mage reach it, which is what makes the turret combo a find' : ''}.`
              : `Pieces only meet through six anchors, so ${Math.round(share * 100)}% of pairs interact. Hover an anchor; click a piece to cut it.`);
    }
    apis.anchors = { seek(t) { st.held = st.tour = true; st.t = t; render(); }, dur: () => DUR };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > DUR) st.t = 0; render(); };
  });

  /* ---------- 3: the elemental anchor on a board ---------- */
  const COLS = 8, ROWS = 5, TS = 86, BX = 26, BY = 66;
  const START = () => ({
    units: [
      { id: 'mage', n: 'Mage', side: 'cat', x: 1, y: 2, hp: 8, ic: 'wizard-staff' },
      { id: 'tinker', n: 'Tinker', side: 'cat', x: 0, y: 0, hp: 8, ic: 'claw-hammer' },
      { id: 'turret', n: 'Turret', side: 'cat', x: 4, y: 1, hp: 6, ic: 'turret', metal: true, mech: true },
      { id: 'a', n: 'Rat', side: 'foe', x: 5, y: 2, hp: 9, ic: 'wolf-head' },
      { id: 'b', n: 'Rat', side: 'foe', x: 6, y: 2, hp: 9, ic: 'wolf-head' },
      { id: 'c', n: 'Rat', side: 'foe', x: 6, y: 4, hp: 9, ic: 'wolf-head' },
    ].map(u => ({ ...u, max: u.hp, wet: false, frozen: false, burn: 0, slow: false })),
  });
  const EL = {
    water: { n: 'Water', ic: 'drop', col: '#0891b2' }, cold: { n: 'Cold', ic: 'snowflake-1', col: '#0369a1' },
    fire: { n: 'Fire', ic: 'small-fire', col: '#dc2626' }, elec: { n: 'Lightning', ic: 'lightning-helix', col: '#d97706' },
  };
  const DMG = { elec: 3, fire: 2, cold: 1, turret: 2 };
  // one cast from the Mage at tile (x, y); returns the new state and what happened, for the animation
  function castAt(S, el, x, y) {
    const U = S.units.map(u => ({ ...u })), at = (x, y) => U.find(u => u.x === x && u.y === y && u.hp > 0);
    const ev = { el, x, y, hits: [], chain: [], extra: [], notes: [] };
    const t = at(x, y);
    if (el === 'water') {
      [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const u = at(x + dx, y + dy); if (u) { if (u.burn) ev.notes.push(`${u.n}’s fire goes out`); u.wet = true; u.burn = 0; ev.hits.push(u.id); } });
      ev.notes.push(`${ev.hits.length} soaked: Wet`);
    } else if (el === 'cold' && t) {
      t.hp -= DMG.cold; ev.hits.push(t.id);
      if (t.wet) { t.wet = false; t.frozen = true; ev.notes.push(`Wet ${t.n} freezes solid`); } else { t.slow = true; ev.notes.push(`${t.n} is slowed`); }
    } else if (el === 'fire' && t) {
      ev.hits.push(t.id);
      if (t.wet) { t.wet = false; ev.notes.push(`Wet ${t.n}: the fire fizzles to steam`); }
      else if (t.frozen) { t.frozen = false; ev.notes.push(`the ice melts away`); }
      else { t.hp -= DMG.fire; t.burn = 2; ev.notes.push(`${t.n} catches fire: Burn`); }
    } else if (el === 'elec' && t) {
      // chain through anything conductive (wet or metal) that touches a struck unit
      const struck = [t], seen = new Set([t.id]);
      for (let i = 0; i < struck.length; i++) {
        const u = struck[i]; if (i && !(u.wet || u.metal)) continue; if (!i && !(u.wet || u.metal)) break;
        U.filter(v => v.hp > 0 && !seen.has(v.id) && Math.max(Math.abs(v.x - u.x), Math.abs(v.y - u.y)) === 1 && (v.wet || v.metal)).forEach(v => { seen.add(v.id); struck.push(v); ev.chain.push([u.id, v.id]); });
      }
      struck.forEach(u => { if (u.frozen) return; if (u.side === 'foe' || !u.mech) u.hp -= DMG.elec; ev.hits.push(u.id); });
      ev.notes.push(struck.length > 1 ? `the bolt chains to ${struck.length - 1} more` : `${t.n} is hit`);
      // the Tinker's anchor: a mechanical unit struck by electricity takes an extra turn
      struck.filter(u => u.mech).forEach(m => {
        const foes = U.filter(f => f.side === 'foe' && f.hp > 0).sort((a, b) => Math.hypot(a.x - m.x, a.y - m.y) - Math.hypot(b.x - m.x, b.y - m.y));
        if (foes[0]) { foes[0].hp -= DMG.turret; ev.extra.push([m.id, foes[0].id]); ev.notes.push(`${m.n} is mechanical: extra turn, shoots`); }
      });
    }
    U.forEach(u => { u.hp = Math.max(0, u.hp); });
    return { S: { units: U }, ev };
  }
  const TOUR = [['elec', 5, 2], ['water', 5, 2], ['elec', 5, 2], ['cold', 6, 2], ['fire', 5, 2], ['fire', 6, 4]];
  const TOURSAY = [
    'Lightning on a dry rat: one target, 3 damage.',
    'Water soaks the rat, its neighbour and the turret: all Wet.',
    'Lightning again: it chains through the wet rats and the metal turret. The turret is mechanical, so it takes an extra turn and fires. A Mage just doubled a Tinker’s output.',
    'Cold on a wet rat: it freezes solid.',
    'Fire on a wet rat: the water puts it out.',
    'Fire on a dry rat: it catches and burns.',
  ];
  canvasDemo('board', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, el: 'elec', hist: [{ S: START(), ev: null }], at: 0, key: '' };
    const tourBtn = $(s, '.bd-tour'), free = freeOf(st, tourBtn);
    const setEl = e => { st.el = e; $$(s, '.bd-el .btn').forEach(b => b.classList.toggle('on', b.dataset.e === e)); };
    $$(s, '.bd-el .btn').forEach(b => b.onclick = () => { free(); setEl(b.dataset.e); });
    $(s, '.bd-reset').onclick = () => { free(); st.hist = [{ S: START(), ev: null }]; st.at = st.t; };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    cv.addEventListener('click', e => {
      const b = cv.getBoundingClientRect(), mx = (e.clientX - b.left) * W / b.width, my = (e.clientY - b.top) * H / b.height;
      const x = Math.floor((mx - BX) / TS), y = Math.floor((my - BY) / TS); if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return;
      free(); const cur = st.hist.at(-1).S; st.hist.push(castAt(cur, st.el, x, y)); st.at = st.t;
    });
    // the tour's states, worked out once
    const TS_STATES = (() => { const out = [{ S: START(), ev: null }]; TOUR.forEach(([e, x, y]) => out.push(castAt(out.at(-1).S, e, x, y))); return out; })();
    const PER = 4.2, DUR = PER * TOUR.length + 2;
    const cen = u => [BX + u.x * TS + TS / 2, BY + u.y * TS + TS / 2];
    function render() {
      const t = st.t;
      let step, u;
      if (st.tour) { const k = Math.min(TOUR.length, Math.floor(t / PER) + 1); step = TS_STATES[k]; u = t - (k - 1) * PER; if (st.el !== TOUR[k - 1][0]) setEl(TOUR[k - 1][0]); }
      else { step = st.hist.at(-1); u = t - st.at; }
      const prev = st.tour ? TS_STATES[Math.min(TOUR.length, Math.floor(t / PER) + 1) - 1] : st.hist.at(-2) || step;
      const ev = step.ev, settled = !ev || u > 1.4, S = settled ? step.S : prev.S;
      T.use(g); panel(g);
      txt(g, 'The elemental anchor', BX, 32, '800 19px Montserrat');
      txt(g, 'the Mage casts; click a tile', BX + 230, 33, '600 14px Jost', C.muted);
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        const px = BX + x * TS, py = BY + y * TS;
        g.fillStyle = (x + y) % 2 ? '#e3d8c0' : '#ddd2bc'; g.fillRect(px, py, TS, TS);
      }
      g.strokeStyle = C.floorLn; g.lineWidth = 2; g.strokeRect(BX, BY, COLS * TS, ROWS * TS);
      // the cast's area
      if (ev && u < 1.6) {
        const a = clamp(1 - Math.abs(u - .5) / 1.1), col = EL[ev.el].col;
        g.fillStyle = tint(col, .28 * a);
        if (ev.el === 'water') [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => g.fillRect(BX + (ev.x + dx) * TS, BY + (ev.y + dy) * TS, TS, TS));
        else g.fillRect(BX + ev.x * TS, BY + ev.y * TS, TS, TS);
      }
      // units
      S.units.forEach(un => {
        const [x, y] = cen(un), dead = un.hp <= 0, cat = un.side === 'cat';
        g.globalAlpha = dead ? .25 : 1;
        if (un.wet) { g.fillStyle = 'rgba(8,145,178,.25)'; g.beginPath(); g.ellipse(x, y + 26, 36, 12, 0, 0, 7); g.fill(); }
        g.fillStyle = cat ? (un.mech ? '#62688a' : C.player) : C.red; g.beginPath(); g.arc(x, y - 2, 27, 0, 7); g.fill();
        if (un.frozen) { g.fillStyle = 'rgba(180,225,255,.75)'; g.beginPath(); g.roundRect(x - 33, y - 35, 66, 66, 10); g.fill(); g.strokeStyle = '#0369a1'; g.lineWidth = 2; g.stroke(); }
        GI.draw(g, un.ic, x, y - 2, 30, '#fff');
        txt(g, un.n, x, y + 34, '700 12px Jost', C.ink, 'center');
        // HP bar and status icons
        box(g, x - 26, y - 40, 52, 6, '#efe4cc', null, 3); box(g, x - 26, y - 40, 52 * un.hp / un.max, 6, cat ? '#2fae63' : '#e5322d', null, 3);
        const tags = [un.wet && 'drop', un.frozen && 'ice-cube', un.burn && 'small-fire', un.slow && 'snowflake-1', un.metal && 'cog'].filter(Boolean);
        tags.forEach((ic, i) => { g.fillStyle = '#fffaf0'; g.beginPath(); g.arc(x + 28 - i * 0, y - 24 + i * 18, 9, 0, 7); g.fill(); GI.draw(g, ic, x + 28, y - 24 + i * 18, 13, ic === 'small-fire' ? '#dc2626' : ic === 'cog' ? C.muted : '#0891b2'); });
        g.globalAlpha = 1;
      });
      // the bolt, the chain, the turret's extra shot
      if (ev) {
        const byId = id => S.units.find(x => x.id === id) || step.S.units.find(x => x.id === id);
        const mage = cen(byId('mage')), col = EL[ev.el].col;
        if (u < 1.2) {
          const a = clamp(u / .3) * clamp((1.2 - u) / .3), tgt = [BX + ev.x * TS + TS / 2, BY + ev.y * TS + TS / 2];
          g.globalAlpha = a; g.strokeStyle = col; g.lineWidth = 5; g.setLineDash(ev.el === 'elec' ? [] : [8, 8]); g.beginPath(); g.moveTo(...mage);
          if (ev.el === 'elec') for (let k = 1; k <= 6; k++) { const q = k / 6; g.lineTo(lerp(mage[0], tgt[0], q) + (k < 6 ? Math.sin(k * 7 + u * 30) * 10 : 0), lerp(mage[1], tgt[1], q) + (k < 6 ? Math.cos(k * 5) * 10 : 0)); }
          else g.lineTo(...tgt);
          g.stroke(); g.setLineDash([]); GI.draw(g, EL[ev.el].ic, tgt[0], tgt[1] - 44, 28, col); g.globalAlpha = 1;
        }
        ev.chain.forEach(([a, b], i) => { const k = clamp((u - .5 - i * .2) / .3) * clamp((2.2 - u) / .4); if (k <= 0) return; const p = cen(byId(a)), q = cen(byId(b)); g.globalAlpha = k; g.strokeStyle = '#f5b301'; g.lineWidth = 4; g.beginPath(); g.moveTo(...p); g.lineTo((p[0] + q[0]) / 2 + 8, (p[1] + q[1]) / 2 - 8); g.lineTo(...q); g.stroke(); g.globalAlpha = 1; });
        ev.extra.forEach(([m, f]) => { const k = clamp((u - 1.4) / .3) * clamp((2.8 - u) / .4); if (k <= 0) return; const p = cen(byId(m)), q = cen(byId(f)); T.tracer(p[0], p[1], q[0], q[1], k, C.gold, 5); T.popText('EXTRA TURN', p[0], p[1] - 56, C.goldInk, k); });
        if (u > .5) ev.hits.forEach(id => { const un = byId(id); if (!un) return; const [x, y] = cen(un); T.popText(ev.el === 'water' ? 'Wet' : '', x, y - 52, '#0891b2', clamp(1.6 - u)); });
      }
      // the rules on the right
      const R = BX + COLS * TS + 18;
      txt(g, 'Rules (from the game’s tips)', R, 80, '800 14px Montserrat');
      [['drop', '#0891b2', 'Water: target and neighbours go Wet'], ['snowflake-1', '#0369a1', 'Cold + Wet: Frozen'], ['small-fire', '#dc2626', 'Fire + Wet: put out'], ['lightning-helix', '#d97706', 'Electric chains through Wet and metal'], ['cog', C.muted, 'Mechanical + Electric: extra turn']].forEach(([ic, col, s2], i) => {
        const y = 112 + i * 52; GI.draw(g, ic, R + 12, y, 20, col);
        const ws = s2.split(': '); txt(g, ws[0] + (ws[1] ? ':' : ''), R + 28, y - 8, '700 12.5px Jost'); if (ws[1]) txt(g, ws[1], R + 28, y + 9, '500 12.5px Jost', C.muted);
      });
      const foes = S.units.filter(x => x.side === 'foe'), dmg = foes.reduce((a, f) => a + f.max - f.hp, 0);
      box(g, R, 380, 1040 - R - 14, 90, 'rgba(21,32,68,.05)', null, 10);
      txt(g, 'Damage dealt', R + 12, 400, '700 13px Jost', C.muted);
      txt(g, String(dmg), R + 12, 438, '800 34px Montserrat', C.goldInk);
      txt(g, `${foes.filter(f => f.hp <= 0).length} down`, R + 100, 438, '700 15px Jost', C.ink);
      if (ev) ev.notes.slice(0, 3).forEach((n, i) => txt(g, n, R, 492 + i * 20, '600 12.5px Jost', clamp(u * 2) ? C.ink : 'transparent'));
      const key = st.tour ? 'tour' + Math.floor(t / PER) : 'free' + st.hist.length; if (key === st.key) return; st.key = key;
      say($(s, '.bd-out'), st.tour ? TOURSAY[Math.min(TOUR.length - 1, Math.floor(t / PER))] : ev ? ev.notes.join('; ') + '.' : 'Pick an element, then click a tile.');
    }
    apis.board = { seek(t) { st.held = st.tour = true; st.t = t; render(); }, dur: () => DUR };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > DUR) st.t = 0; render(); };
  });

  window.__seek = (t, w) => apis[w].seek(t);
  window.__dur = w => apis[w].dur();
})();
