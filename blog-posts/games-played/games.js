/* All The Games I've Played Before (Alex Brazie), two spikes. Data in data.js (GP).
   draw:  ten games from the play history and the one lesson each one left, on a timeline. The article's five rounds as
          written, or a random ten.
   range: the same 48 games by genre. Pick the genres you play and see which kinds of lesson you collect: a one-genre
          rut gathers one kind of lesson, range gathers all six. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;
  const { KINDS, GENRES, ROWS, ROUND_SIZES } = GP;
  const W = 1040, H = 585;
  const G = ROWS.map(([t, p, y, genre, lesson, kind, pol], i) => ({ i, t, p, y, genre, lesson, kind, pos: pol === '+' }));
  const ROUNDS = (() => { let i = 0; return ROUND_SIZES.map(n => G.slice(i, i += n)); })();
  const panel = g => { g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(255,252,244,.8)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill(); };
  const txt = (g, s, x, y, font, col = C.ink, al = 'left') => { g.font = font; g.fillStyle = col; g.textAlign = al; g.textBaseline = 'middle'; g.fillText(s, x, y); };
  const box = (g, x, y, w, h, fill, stroke, r = 10, lw = 2) => { g.beginPath(); g.roundRect(x, y, w, h, r); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); } };
  const wrap = (g, s, font, maxW) => {
    g.font = font; const out = []; let line = '';
    s.split(' ').forEach(w => { const tryL = line ? line + ' ' + w : w; if (g.measureText(tryL).width > maxW && line) { out.push(line); line = w; } else line = tryL; });
    if (line) out.push(line); return out;
  };
  const lines = (g, s, x, y, font, maxW, lh, col = C.ink, max = 9) => { const ls = wrap(g, s, font, maxW); ls.slice(0, max).forEach((l, k) => txt(g, k === max - 1 && ls.length > max ? l + '…' : l, x, y + k * lh, font, col)); return Math.min(ls.length, max); };
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const tint = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${a})`; };
  const freeOf = (st, btn) => () => { st.tour = false; btn.classList.remove('on'); };
  const POS = '#1a8a4c', NEG = '#b0423b';
  const apis = {};
  const kindTally = list => Object.keys(KINDS).map(k => [k, list.filter(x => x.kind === k).length]);

  /* ---------- 1: draw ten ---------- */
  const THEMES = [
    'Challenge must be paired with clarity. Clarity doesn’t always mean obvious.',
    'Some of these ideas never came back: mech summoning, squad turn order. Timberborn says there is still room.',
    'Our games inspire people to create, and that is one of the most powerful forces there is.',
    'What I don’t enjoy can still succeed; sharp insights can level up a tired genre.',
    'Is there one that sparked an insight for you?',
  ];
  const Y0 = 1980, Y1 = 2026, TLX = 46, TLW = 948, TLY = 92;
  const yx = y => TLX + (y - Y0) / (Y1 - Y0) * TLW;
  canvasDemo('draw', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, mode: 0, seed: 1, dealt: 0, key: '' };
    const tourBtn = $(s, '.dr-tour'), free = freeOf(st, tourBtn);
    const pick = () => st.mode < 5 ? ROUNDS[st.mode] : (() => { const r = rng(st.seed * 977), idx = G.map(x => x.i).sort(() => r() - .5).slice(0, 10).sort((a, b) => G[a].y - G[b].y); return idx.map(i => G[i]); })();
    const setMode = m => { st.mode = m; st.dealt = st.t; $$(s, '.dr-mode .btn').forEach(b => b.classList.toggle('on', +b.dataset.m === m)); };
    $$(s, '.dr-mode .btn').forEach(b => b.onclick = () => { free(); if (+b.dataset.m === 5) st.seed++; setMode(+b.dataset.m); });
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    const PER = 6.5, DUR = PER * 5;
    function render() {
      const t = st.t;
      if (st.tour) { const m = Math.min(4, Math.floor(t / PER)); if (m !== st.mode) setMode(m); st.dealt = m * PER; }
      const list = pick(), u = t - st.dealt;
      T.use(g); panel(g);
      txt(g, st.mode < 5 ? `Round ${st.mode + 1} of 5, as the article lists them` : 'Ten at random from the same 48', 24, 28, '800 19px Montserrat');
      txt(g, `${G.length} games, ${Y0}–2025`, W - 24, 28, '600 15px Jost', C.muted, 'right');
      // timeline
      g.strokeStyle = '#cdbf9f'; g.lineWidth = 3; g.beginPath(); g.moveTo(TLX, TLY); g.lineTo(TLX + TLW, TLY); g.stroke();
      for (let y = 1980; y <= 2025; y += 5) { g.fillStyle = '#cdbf9f'; g.fillRect(yx(y) - 1, TLY - 6, 2, 12); txt(g, String(y), yx(y), TLY + 20, '600 12px Jost', C.muted, 'center'); }
      G.forEach(x => { g.fillStyle = 'rgba(93,97,140,.25)'; g.beginPath(); g.arc(yx(x.y + .5), TLY, 4, 0, 7); g.fill(); });
      const CW = 192, CH = 206, X0 = 20, GAP = 8.5;
      list.forEach((x, k) => {
        const a = clamp((u - k * .14) / .35); if (a <= 0) return;
        const col = KINDS[x.kind].col;
        // dot on the timeline, stacked when years collide
        const same = list.slice(0, k).filter(o => Math.abs(o.y - x.y) < 1.2).length;
        const dx = yx(x.y + .5), dy = TLY - 12 - same * 16;
        g.globalAlpha = a;
        g.fillStyle = col; g.beginPath(); g.arc(dx, dy, 8, 0, 7); g.fill();
        txt(g, String(k + 1), dx, dy + 1, '800 10px Montserrat', '#fff', 'center');
        // the card
        const cx = X0 + (k % 5) * (CW + GAP), cy = 136 + Math.floor(k / 5) * (CH + 10) + (1 - ease(a)) * 24;
        box(g, cx, cy, CW, CH, '#fffaf0', '#cdbf9f', 10, 2);
        box(g, cx, cy, CW, 34, tint(col, .16), null, 10);
        g.fillStyle = col; g.fillRect(cx, cy + 32, CW, 2);
        g.fillStyle = col; g.beginPath(); g.arc(cx + 17, cy + 17, 10, 0, 7); g.fill();
        txt(g, String(k + 1), cx + 17, cy + 18, '800 11px Montserrat', '#fff', 'center');
        GI.draw(g, GENRES[x.genre], cx + CW - 18, cy + 17, 20, C.ink);
        txt(g, x.genre, cx + CW - 32, cy + 17, '600 11px Jost', C.muted, 'right');
        const tl = lines(g, x.t, cx + 10, cy + 50, '800 14px Montserrat', CW - 20, 17, C.ink, 2);
        txt(g, `${x.p} · ${x.y}`, cx + 10, cy + 52 + tl * 17, '600 12px Jost', C.muted);
        lines(g, x.lesson, cx + 10, cy + 74 + tl * 17, '500 13px Jost', CW - 20, 16, C.ink, 6);
        GI.draw(g, KINDS[x.kind].icon, cx + 18, cy + CH - 16, 16, col);
        txt(g, KINDS[x.kind].name, cx + 31, cy + CH - 16, '700 11px Jost', col);
        txt(g, x.pos ? '+' : '−', cx + CW - 14, cy + CH - 17, '800 20px Montserrat', x.pos ? POS : NEG, 'center');
        g.globalAlpha = 1;
      });
      // the article's own takeaway for the round
      const qa = clamp((u - 1.8) / .5);
      if (st.mode < 5 && qa > 0) { g.globalAlpha = qa; txt(g, '“' + THEMES[st.mode] + '”', W / 2, H - 16, 'italic 600 15px Jost', C.goldInk, 'center'); g.globalAlpha = 1; }
      const key = st.mode + ':' + st.seed; if (key === st.key) return; st.key = key;
      const tally = kindTally(list).filter(([, n]) => n).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${n} ${KINDS[k].name.toLowerCase()}`);
      const neg = list.filter(x => !x.pos).length, genres = new Set(list.map(x => x.genre)).size;
      const span = `${Math.min(...list.map(x => x.y))}–${Math.max(...list.map(x => x.y))}`;
      say($(s, '.dr-out'), `${list.length} games from ${span} across ${genres} genres. Lessons: ${tally.join(', ')}. <b>${neg}</b> of them came from something the game missed (−), not something it nailed (+).`);
    }
    apis.draw = { seek(t) { st.held = st.tour = true; st.t = t; render(); }, dur: () => DUR };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > DUR) st.t = 0; render(); };
  });

  /* ---------- 2: range or rut ---------- */
  const GORDER = ['Platformers', 'RPGs', 'Adventure', 'Shooters', 'Action', 'Roguelites', 'Puzzle', 'Sim & Builder', 'Racing & Party', 'Arcade & Brawlers'];
  const BY = Object.fromEntries(GORDER.map(n => [n, G.filter(x => x.genre === n)]));
  // the walk-through adds genres one at a time, each time the one that brings the most new lesson kinds, then the most lessons
  const TOUR = (() => {
    const order = ['Platformers'], have = new Set(['Platformers']);
    while (order.length < GORDER.length) {
      const kinds = new Set(G.filter(x => have.has(x.genre)).map(x => x.kind));
      const best = GORDER.filter(n => !have.has(n)).map(n => [n, new Set(BY[n].map(x => x.kind).filter(k => !kinds.has(k))).size, BY[n].length]).sort((a, b) => b[1] - a[1] || b[2] - a[2])[0][0];
      order.push(best); have.add(best);
    }
    return order;
  })();
  const ROWY = 58, RH = 50, LX = 20, CX0 = 162, CHW = 60, CHG = 2;
  canvasDemo('range', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, on: new Set(['Platformers']), hover: null, key: '' };
    const tourBtn = $(s, '.rg-tour'), free = freeOf(st, tourBtn);
    const box2 = $(s, '.rg-genres');
    box2.innerHTML = GORDER.map(n => `<label class="chk"><input type="checkbox" data-g="${n}"> ${n} <small style="color:var(--muted);font-weight:500">(${BY[n].length})</small></label>`).join('');
    const sync = () => $$(box2, 'input').forEach(i => i.checked = st.on.has(i.dataset.g));
    $$(box2, 'input').forEach(i => i.onchange = () => { free(); i.checked ? st.on.add(i.dataset.g) : st.on.delete(i.dataset.g); });
    const PRE = { rut: ['Platformers'], comfort: ['Platformers', 'RPGs'], all: GORDER };
    $$(s, '.rg-pre .btn').forEach(b => b.onclick = () => { free(); st.on = new Set(PRE[b.dataset.p]); sync(); });
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    // hover a chip to read its lesson
    const chipAt = (mx, my) => { for (const [r, n] of GORDER.entries()) BY[n].forEach((x, c) => { const x0 = CX0 + c * (CHW + CHG), y0 = ROWY + r * RH; if (mx >= x0 && mx < x0 + CHW && my >= y0 && my < y0 + RH - 4) st.hover = x; }); };
    cv.addEventListener('mousemove', e => { const b = cv.getBoundingClientRect(); st.hover = null; chipAt((e.clientX - b.left) * W / b.width, (e.clientY - b.top) * H / b.height); st.key = ''; });
    cv.addEventListener('mouseleave', () => { st.hover = null; st.key = ''; });
    const STEP = 2.2, DUR = STEP * TOUR.length + 4;
    function render() {
      const t = st.t;
      if (st.tour) { const n = clamp(Math.floor(t / STEP) + 1, 1, TOUR.length); if (st.on.size !== n || !TOUR.slice(0, n).every(x => st.on.has(x))) { st.on = new Set(TOUR.slice(0, n)); sync(); } }
      const got = G.filter(x => st.on.has(x.genre));
      T.use(g); panel(g);
      txt(g, 'The 48 games by genre', LX, 30, '800 18px Montserrat');
      txt(g, 'hover a game to read its lesson', 262, 31, '600 14px Jost', C.muted);
      GORDER.forEach((n, r) => {
        const on = st.on.has(n), y = ROWY + r * RH, justOn = st.tour && TOUR[Math.floor(t / STEP)] === n ? clamp((t % STEP) / .5) : 1;
        box(g, LX, y, CX0 - LX - 8, RH - 6, on ? 'rgba(21,32,68,.9)' : 'rgba(21,32,68,.06)', null, 8);
        GI.draw(g, GENRES[n], LX + 18, y + RH / 2 - 3, 20, on ? C.gold : C.muted);
        txt(g, n, LX + 34, y + RH / 2 - 3, '700 13px Jost', on ? '#fff' : C.muted);
        BY[n].forEach((x, c) => {
          const x0 = CX0 + c * (CHW + CHG), col = KINDS[x.kind].col, a = on ? justOn : 0;
          box(g, x0, y, CHW, RH - 6, on ? tint(col, .12 + .1 * a) : 'rgba(205,191,159,.25)', on ? col : null, 6, st.hover === x ? 3 : 1.5);
          GI.draw(g, KINDS[x.kind].icon, x0 + 11, y + 11, 13, on ? col : '#c9bfa7');
          txt(g, x.pos ? '+' : '−', x0 + CHW - 9, y + 11, '800 13px Montserrat', on ? (x.pos ? POS : NEG) : '#c9bfa7', 'center');
          const tl = wrap(g, x.t.replace(/^The /, ''), '600 9.5px Jost', CHW - 6).slice(0, 2);
          tl.forEach((l, k) => txt(g, l, x0 + 4, y + 26 + k * 10, '600 9.5px Jost', on ? C.ink : '#b3a98f'));
        });
      });
      // what you collected
      const R = 790, RW = 230;
      box(g, R, 46, RW, 524, 'rgba(21,32,68,.05)', null, 12);
      txt(g, 'You collected', R + 14, 68, '800 16px Montserrat');
      txt(g, `${got.length} of ${G.length}`, R + RW - 14, 68, '700 15px Jost', C.muted, 'right');
      kindTally(got).forEach(([k, n], i) => {
        const tot = G.filter(x => x.kind === k).length, y = 96 + i * 62, col = KINDS[k].col;
        GI.draw(g, KINDS[k].icon, R + 24, y + 10, 20, n ? col : '#c9bfa7');
        txt(g, KINDS[k].name, R + 40, y + 10, '700 13px Jost', n ? C.ink : '#b3a98f');
        box(g, R + 14, y + 26, RW - 60, 14, '#e8dcc0', null, 6);
        if (n) box(g, R + 14, y + 26, (RW - 60) * n / tot, 14, col, null, 6);
        txt(g, `${n}/${tot}`, R + RW - 14, y + 33, '700 13px Jost', n ? C.ink : '#b3a98f', 'right');
        if (!n) txt(g, 'none yet', R + 20 + (RW - 60) / 2, y + 33, '600 11px Jost', NEG, 'center');
      });
      const pos = got.filter(x => x.pos).length, neg = got.length - pos;
      txt(g, `+ ${pos} from what a game nailed`, R + 14, 486, '700 14px Jost', POS);
      txt(g, `− ${neg} from what a game missed`, R + 14, 508, '700 14px Jost', NEG);
      const kinds = kindTally(got).filter(([, n]) => n).length;
      T.stamp(kinds === 6 ? 'Full toolkit' : kinds <= 2 ? 'One kind of lesson' : `${kinds} of 6 kinds`, R + RW / 2, 546, kinds === 6 ? C.good : kinds <= 2 ? C.redDk : C.goldInk, 1, 18);
      const key = [...st.on].sort().join() + '|' + (st.hover ? st.hover.i : ''); if (key === st.key) return; st.key = key;
      if (st.hover) { const x = st.hover; say($(s, '.rg-out'), `<b>${x.t}</b> (${x.p}, ${x.y}): ${x.lesson} <span class="chip" style="border-color:${KINDS[x.kind].col}">${KINDS[x.kind].name}</span>`); return; }
      const top = kindTally(got).filter(([, n]) => n).sort((a, b) => b[1] - a[1]);
      const miss = kindTally(got).filter(([, n]) => !n).map(([k]) => KINDS[k].name.toLowerCase());
      say($(s, '.rg-out'), !got.length ? 'Pick a genre.' : miss.length
        ? `${st.on.size} genre${st.on.size > 1 ? 's' : ''}, ${got.length} games. Most of what you learn is ${KINDS[top[0][0]].name.toLowerCase()}. Nothing yet on ${miss.join(', ')}.`
        : `${st.on.size} genres, ${got.length} games: every kind of lesson shows up, and ${neg} of them came from games that missed.`);
    }
    apis.range = { seek(t) { st.held = st.tour = true; st.t = t; render(); }, dur: () => DUR };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > DUR) st.t = 0; render(); };
  });

  window.__seek = (t, w) => apis[w].seek(t);
  window.__dur = w => apis[w].dur();
})();
