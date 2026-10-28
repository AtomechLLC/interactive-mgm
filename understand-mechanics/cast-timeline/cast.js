/* Time as a resource (MGM C4 M2, deck slides 225-256): the WoW caster case study on one 10-second window.
   1. Imbalance: Fireball 4 x 10 vs Shadow Bolt 3 x 13 plus a Life Tap (40 vs 39, "close enough"), then ally mana
      restoration removes the Life Tap and the warlock does 52 (30% more).
   2. Tokens: 4 tokens per window, 25 damage each = 100 whatever you do; shorter casts and back to back casting keep 100
      but free up time.
   3. Weakness windows: three short "2x damage taken" windows, each shorter than a cast. The locked rotation's casts end
      wherever the cast bar puts them; with tokens the player holds each cast so it ends inside a window.
   Slide numbers are the slides'; the token cast time (1.5 s) and window length (0.8 s) are illustrative. Every scene is a pure function of time, so the GIFs can seek. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;
  const W = 1040, H = 585, X0 = 150, X1 = 1010, WIN = 10, sx = s => lerp(X0, X1, s / WIN);
  const COL = { fb: '#e5322d', sb: '#8a4fd6', lt: '#2fae63', gap: '#cdbf9f' };
  const NAME = { fb: 'Fireball', sb: 'Shadow Bolt', lt: 'Life Tap' };
  const SPELL = { fb: 'fireball', sb: 'shadowbolt', lt: 'lifetap' };

  function axis(g, y) {
    g.strokeStyle = '#b9ab88'; g.lineWidth = 1.5; g.font = '600 13px Jost, sans-serif'; g.fillStyle = C.muted; g.textAlign = 'center'; g.textBaseline = 'middle';
    [0, 2.5, 5, 7.5, 10].forEach(s => { g.fillText(`${s} sec`, sx(s), y); });
    T.label('Start', sx(0), y - 22, 'center', '#fff', 12, C.navy); T.label('End', sx(WIN), y - 22, 'center', '#fff', 12, C.navy);
  }
  function grid(g, y0, y1) { g.strokeStyle = 'rgba(160,140,100,.35)'; g.lineWidth = 1; g.setLineDash([4, 5]); [0, 2.5, 5, 7.5, 10].forEach(s => { g.beginPath(); g.moveTo(sx(s), y0); g.lineTo(sx(s), y1); g.stroke(); }); g.setLineDash([]); }

  // one caster's row: blocks fill as the playhead passes them; cut blocks end with ✕
  function lane(g, y, h, name, col, casts, play, cls) {
    g.fillStyle = 'rgba(255,252,244,.85)'; g.beginPath(); g.roundRect(10, y, W - 20, h, 10); g.fill();
    g.fillStyle = col; g.beginPath(); g.roundRect(10, y, 128, h, [10, 0, 0, 10]); g.fill();
    g.fillStyle = '#fff'; g.font = '800 17px Montserrat, Jost, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(name, 74, y + h / 2 + (cls ? 24 : 0));
    if (cls) ICON.draw(g, cls, 74, y + h / 2 - 14, 38, 1, 'rgba(255,255,255,.85)');
    let dmg = 0;
    casts.forEach(c => {
      const x = sx(c.s), w = sx(Math.min(c.e, WIN)) - x, k = clamp((play - c.s) / (c.e - c.s));
      if (c.kind === 'gap') { if (k > 0) { g.fillStyle = 'rgba(47,174,99,.14)'; g.fillRect(x, y + 8, w * k, h - 16); g.fillStyle = C.good; g.font = '600 12px Jost, sans-serif'; if (k > .5 && w > 60) g.fillText(c.label || 'free', x + w / 2, y + h / 2); } return; }
      if (k <= 0) return;
      const cc = COL[c.kind];
      g.fillStyle = cc + '33'; g.strokeStyle = cc; g.lineWidth = 2.5; g.beginPath(); g.roundRect(x + 2, y + 8, w - 4, h - 16, 8); g.fill(); g.stroke();
      g.fillStyle = cc + 'cc'; g.beginPath(); g.roundRect(x + 2, y + 8, Math.max(0, (w - 4) * k), h - 16, 8); g.fill();
      const done = k >= 1 && c.e <= WIN + 1e-6, isz = Math.min(34, h - 34), ix = x + 8 + isz / 2 + 4, tx = x + (w + isz + 8) / 2;
      ICON.draw(g, SPELL[c.kind], ix, y + h / 2, isz, 1, 'rgba(21,32,68,.7)');
      g.fillStyle = '#fff'; g.font = `700 ${w > 150 ? 14 : 12}px Jost, sans-serif`;
      g.fillText(`${w > 150 || !c.dmg ? NAME[c.kind] : NAME[c.kind].split(' ').at(-1)} ${done ? '✔' : c.e > WIN && play >= WIN ? '✕' : ''}`, tx, y + h / 2 - (c.dmg ? 9 : 0));
      if (c.dmg && done) { dmg += c.dmg; g.font = '800 15px Montserrat, Jost, sans-serif'; g.fillText(c.bonus ? `${c.dmg}!` : c.dmg, tx, y + h / 2 + 11); }
    });
    return dmg;
  }
  function playhead(g, play, y0, y1) { if (play <= 0 || play >= WIN) return; const x = sx(play); g.strokeStyle = C.navy; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y0); g.lineTo(x, y1); g.stroke(); g.fillStyle = C.navy; g.beginPath(); g.moveTo(x - 7, y0 - 10); g.lineTo(x + 7, y0 - 10); g.lineTo(x, y0); g.fill(); }
  function tile(g, x, y, w, v, label, col = C.ink) {
    g.fillStyle = 'rgba(255,252,244,.9)'; g.strokeStyle = '#cdbf9f'; g.lineWidth = 1.5; g.beginPath(); g.roundRect(x, y, w, 96, 12); g.fill(); g.stroke();
    g.fillStyle = col; g.font = '800 34px Montserrat, Jost, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(v, x + w / 2, y + 40);
    g.fillStyle = C.muted; g.font = '600 13px Jost, sans-serif'; g.fillText(label, x + w / 2, y + 76);
  }
  // a stage plays the 10-second window in SWEEP real seconds, then holds
  const SWEEP = 5, HOLD = 2.4, STAGE = .3 + SWEEP + HOLD;
  const playOf = lt => clamp((lt - .3) / SWEEP) * WIN;

  // shared walk-through / free-play plumbing for the three slides
  function stageDemo(name, cfg) {
    let api;
    canvasDemo(name, (s, cv, g) => {
      const st = { tour: true, t: 0, held: false, o: { ...cfg.stages[0] }, key: '' };
      const tourBtn = $(s, '.ct-tour');
      const free = () => { st.tour = false; tourBtn.classList.remove('on'); st.t = 0; };
      cfg.wire(s, st, free, () => cfg.sync(s, st.o));
      tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
      function render() {
        const i = st.tour ? Math.floor(st.t / STAGE) % cfg.stages.length : -1, lt = st.tour ? st.t % STAGE : Math.min(st.t, STAGE);
        if (st.tour && JSON.stringify(st.o) !== JSON.stringify(cfg.stages[i])) { st.o = { ...cfg.stages[i] }; cfg.sync(s, st.o); }
        T.use(g); g.clearRect(0, 0, W, H);
        const r = cfg.draw(g, st.o, playOf(lt));
        const key = r.stats + r.out; if (key === st.key) return; st.key = key;
        say($(s, '.ct-stats'), r.stats); say($(s, '.ct-out'), r.out);
      }
      cfg.sync(s, st.o);
      api = { seek(t) { st.held = st.tour = true; st.t = t; render(); }, dur: () => STAGE * cfg.stages.length };
      return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > STAGE * cfg.stages.length) st.t = 0; if (!st.tour && st.t > STAGE) st.t = 0; render(); };
    });
    return { seek: t => api.seek(t), dur: () => api.dur() };
  }
  const stat = (cls, v, l) => `<div class="${cls}"><b>${v}</b><span>${l}</span></div>`;

  /* ---------- 1. class imbalance ---------- */
  const mageCasts = brk => brk
    ? [{ s: 0, e: 2.5, kind: 'fb', dmg: 10 }, { s: 2.5, e: 3.3, kind: 'gap', label: 'break' }, { s: 3.3, e: 5.8, kind: 'fb', dmg: 10 }, { s: 5.8, e: 6.6, kind: 'gap', label: 'break' }, { s: 6.6, e: 9.1, kind: 'fb', dmg: 10 }, { s: 9.1, e: 9.9, kind: 'gap', label: 'break' }, { s: 9.9, e: 12.4, kind: 'fb', dmg: 10 }]
    : [0, 1, 2, 3].map(i => ({ s: i * 2.5, e: i * 2.5 + 2.5, kind: 'fb', dmg: 10 }));
  const warlockCasts = bc => [0, 1, 2, 3].map(i => ({ s: i * 2.5, e: i * 2.5 + 2.5, kind: !bc && i === 3 ? 'lt' : 'sb', dmg: !bc && i === 3 ? 0 : 13 }));
  const imbalance = stageDemo('imbalance', {
    stages: [{ brk: false, wl: false, bc: false }, { brk: true, wl: false, bc: false }, { brk: false, wl: true, bc: false }, { brk: false, wl: true, bc: true }],
    wire(s, st, free, sync) {
      [['.ct-break', 'brk'], ['.ct-warlock', 'wl'], ['.ct-bc', 'bc']].forEach(([sel, k]) => { $(s, sel).onchange = e => { free(); st.o = { ...st.o, [k]: e.target.checked }; if (k === 'bc' && st.o.bc) st.o.wl = true; sync(); }; });
    },
    sync(s, o) { $(s, '.ct-break').checked = o.brk; $(s, '.ct-warlock').checked = o.wl; $(s, '.ct-bc').checked = o.bc; },
    draw(g, o, play) {
      axis(g, 34); grid(g, 50, o.wl ? 312 : 160);
      const md = lane(g, 60, 92, 'Mage', COL.fb, mageCasts(o.brk), play, 'mage');
      let wd = null;
      if (o.wl) {
        wd = lane(g, 172, 92, 'Warlock', COL.sb, warlockCasts(o.bc), play, 'warlock');
        // warlock mana under the lane: 3 bolts empty it, Life Tap refills it; with ally restore it never runs out
        const casts = warlockCasts(o.bc), spent = casts.filter(c => c.kind === 'sb' && play >= c.e).length, tapped = casts.some(c => c.kind === 'lt' && play >= c.e);
        const mana = o.bc ? 60 : Math.max(0, 60 - 20 * spent) + (tapped ? 60 : 0);
        g.fillStyle = 'rgba(21,32,68,.85)'; g.fillRect(X0 - 2, 276, 304, 20); g.fillStyle = '#2d2f4d'; g.fillRect(X0, 278, 300, 16); g.fillStyle = '#3c6fe0'; g.fillRect(X0, 278, 300 * mana / 60, 16);
        g.fillStyle = '#fff'; g.font = '700 12px Jost, sans-serif'; g.textAlign = 'center'; g.fillText(o.bc ? 'mana: allies keep it topped up' : `warlock mana ${mana} / 60`, X0 + 150, 287);
      }
      playhead(g, play, 52, o.wl ? 268 : 156);
      // damage totals as bars
      const by = 340;
      g.fillStyle = 'rgba(255,252,244,.85)'; g.beginPath(); g.roundRect(10, by, W - 20, 230, 12); g.fill();
      T.label('Damage in the window', 110, by + 26, 'center', C.ink, 15);
      const bar = (y, v, col, name, max = 56) => { g.fillStyle = col; g.beginPath(); g.roundRect(X0, y, (X1 - X0 - 120) * v / max, 44, 8); g.fill(); g.fillStyle = C.ink; g.font = '800 26px Montserrat, Jost, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(v, X0 + (X1 - X0 - 120) * v / max + 12, y + 23); g.font = '700 15px Jost, sans-serif'; g.textAlign = 'right'; g.fillText(name, X0 - 14, y + 23); };
      bar(by + 56, md, COL.fb, 'Mage');
      if (wd != null) bar(by + 120, wd, COL.sb, 'Warlock');
      const done = play >= WIN;
      if (done && wd != null) T.label(o.bc ? `+${Math.round((wd / md - 1) * 100)}%: the warlock just wins` : wd >= md - 1 ? 'close enough!' : '', X1 - 120, by + 190, 'center', '#fff', 15, o.bc ? C.redDk : C.good);
      if (done && wd == null && o.brk) T.label('a break cost a whole Fireball', X1 - 140, by + 190, 'center', '#fff', 15, '#9a5a06');
      const out = !done ? 'Play the 10-second window: every cast takes 2.5 seconds of a resource you can’t refill, time.'
        : wd == null ? (o.brk ? 'Take short breaks and only 3 Fireballs fit, even with mana for 4 or more. Solo, who cares; with 39 other raiders counting on you, it matters.' : 'Spam Fireball back to back: 4 casts, 40 damage. Any pause is damage lost.')
          : o.bc ? 'Ally mana restoration means Life Tap isn’t needed: 4 Shadow Bolts at 13 is 52 against 40. Warlocks win in PvP and mages hand out water from the bench.'
            : 'The warlock spends a cast slot on Life Tap, so Shadow Bolt is tuned to 13: 3 for 39 against the mage’s 4 for 40. Close enough, until something removes the tap.';
      return { done, stats: stat('r', done ? md : '…', 'mage damage') + (wd != null ? stat('', done ? wd : '…', 'warlock damage') : '') + stat('y', '10 s', 'the window, for everyone'), out };
    },
  });

  /* ---------- 2. tokens ---------- */
  const TOK_CAST = 1.5, TOK_DMG = 25;
  const STEP = [
    { name: 'Locked casts', casts: [0, 1, 2, 3].map(i => ({ s: i * 2.5, e: i * 2.5 + 2.5, kind: 'sb', dmg: TOK_DMG })), tokens: false },
    { name: 'One token per cast', casts: [0, 1, 2, 3].map(i => ({ s: i * 2.5, e: i * 2.5 + 2.5, kind: 'sb', dmg: TOK_DMG })), tokens: true },
    { name: 'Shorter casts', casts: [0, 1, 2, 3].flatMap(i => [{ s: i * 2.5, e: i * 2.5 + TOK_CAST, kind: 'sb', dmg: TOK_DMG }, { s: i * 2.5 + TOK_CAST, e: (i + 1) * 2.5, kind: 'gap' }]), tokens: true },
    { name: 'Back to back', casts: [...[0, 1, 2, 3].map(i => ({ s: i * TOK_CAST, e: (i + 1) * TOK_CAST, kind: 'sb', dmg: TOK_DMG })), { s: 4 * TOK_CAST, e: WIN, kind: 'gap', label: 'free: move, dodge, breathe' }], tokens: true },
  ];
  const tokens = stageDemo('tokens', {
    stages: [0, 1, 2, 3].map(step => ({ step })),
    wire(s, st, free, sync) { $$(s, '.ct-steps .btn').forEach(b => b.onclick = () => { free(); st.o = { step: +b.dataset.v }; sync(); }); },
    sync(s, o) { $$(s, '.ct-steps .btn').forEach(b => b.classList.toggle('on', +b.dataset.v === o.step)); },
    draw(g, o, play) {
      const S = STEP[o.step] || STEP[0];
      axis(g, 34); grid(g, 50, 170);
      T.label(`Step ${o.step + 1}: ${S.name}`, 22, 210, 'left', '#fff', 14, C.navy);
      const dmg = lane(g, 60, 100, 'Warlock', COL.sb, S.casts, play, 'warlock');
      playhead(g, play, 52, 164);
      // the token tray: 4 per window, one spent as each cast starts
      const bolts = S.casts.filter(c => c.kind === 'sb'), used = bolts.filter(c => play > c.s).length;
      if (S.tokens) {
        for (let i = 0; i < 4; i++) { const x = 330 + i * 70, y = 210, on = i >= used; g.fillStyle = on ? '#ffb951' : 'rgba(205,191,159,.5)'; g.strokeStyle = on ? '#9a5a06' : '#b9ab88'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, 24, 0, Math.PI * 2); g.fill(); g.stroke(); g.fillStyle = on ? '#9a5a06' : '#b9ab88'; g.font = '800 15px Montserrat, Jost, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(TOK_DMG, x, y + 1); ICON.draw(g, 'shadowbolt', x, y - 2, 30, on ? 1 : .25, on ? '#9a5a06' : '#b9ab88'); }
        T.label(used >= 4 ? 'out of tokens until the window resets' : `${4 - used} tokens left`, 720, 210, 'center', '#fff', 14, used >= 4 ? C.muted : '#9a5a06');
      } else T.label('no tokens: the only limit is the cast bar', 470, 210, 'center', '#fff', 14, C.muted);
      const castT = bolts[0].e - bolts[0].s, freeT = S.casts.filter(c => c.kind === 'gap').reduce((a, c) => a + c.e - c.s, 0), done = play >= WIN;
      tile(g, 20, 270, 236, done ? dmg : dmg + '…', 'damage in the window', COL.sb);
      tile(g, 272, 270, 236, `${used}`, 'button presses');
      tile(g, 524, 270, 236, `${freeT.toFixed(1)} s`, 'time not casting', freeT ? C.good : C.ink);
      tile(g, 776, 270, 244, `${Math.round(TOK_DMG / castT * 10) / 10}`, 'damage per second while casting');
      g.fillStyle = 'rgba(255,252,244,.85)'; g.beginPath(); g.roundRect(20, 386, 1000, 70, 12); g.fill();
      T.label('average over the window', 150, 421, 'center', C.muted, 14);
      g.fillStyle = COL.sb; g.beginPath(); g.roundRect(290, 406, 480 * (done ? 1 : play / WIN), 30, 8); g.fill();
      g.fillStyle = C.ink; g.font = '800 20px Montserrat, Jost, sans-serif'; g.textAlign = 'left'; g.fillText(done ? `${dmg / WIN} DPS, every step` : '', 785, 422);
      const out = [
        'The starting point: 4 casts of 2.5 seconds each, 25 damage, 100 in the window. The cast bar is the only limit, so you must press a button every moment.',
        'Hand out 4 tokens per window, one per Shadow Bolt. Nothing has changed yet: still 100 damage. But now tokens are the limit, not time.',
        'Because tokens limit the damage, each cast can get shorter. Same 4 bolts, same 100 damage, and 4 seconds when you are not casting.',
        'You can even shove them back to back: a higher burst while you blast away, the same 10 DPS average, because more tokens only come when the window resets.',
      ][o.step];
      return { done, stats: stat('', done ? dmg : '…', 'damage per window') + stat('y', used, 'button presses') + stat('g', `${freeT.toFixed(1)} s`, 'free to move'), out };
    },
  });

  /* ---------- 3. the weakness windows ---------- */
  // three short 2x windows, each shorter than one cast: the skill is making a cast END inside one
  const WLEN = .8, WINS = off => [0, 1, 2].map(i => off + 1 + i * 3);
  const inAny = (e, off) => WINS(off).some(ws => e >= ws - 1e-6 && e <= ws + WLEN + 1e-6);
  function plans(off) {
    const mark = c => ({ ...c, kind: 'sb', dmg: inAny(c.e, off) ? 2 * TOK_DMG : TOK_DMG, bonus: inAny(c.e, off) });
    // locked: the cast bar decides when each bolt lands
    const locked = [0, 1, 2, 3].map(i => mark({ s: i * 2.5, e: i * 2.5 + 2.5 }));
    // tokens: hold each bolt and release it so it ends mid-window; the spare token goes right after the first
    const ends = WINS(off).map(ws => ws + WLEN / 2);
    const tok = [...ends.map(e => ({ s: e - TOK_CAST, e })), { s: ends[0], e: ends[0] + TOK_CAST }].sort((a, b) => a.s - b.s).map(mark);
    return { locked, tok };
  }
  const win = stageDemo('window', {
    stages: [2, 1.2, .5].map(ws => ({ ws })),
    wire(s, st, free, sync) { $(s, '.ct-ws').oninput = e => { free(); st.o = { ws: +e.target.value }; sync(); }; },
    sync(s, o) { $(s, '.ct-ws').value = o.ws; $(s, '.ct-v').textContent = `+${o.ws} sec`; },
    draw(g, o, play) {
      const { locked, tok } = plans(o.ws);
      axis(g, 34);
      // the boss's weakness windows across both lanes, each shorter than any cast
      WINS(o.ws).forEach(ws => {
        const wx = sx(ws), ww = sx(ws + WLEN) - wx, open = play >= ws && play <= ws + WLEN;
        g.fillStyle = open ? 'rgba(229,50,45,.28)' : 'rgba(229,50,45,.12)'; g.fillRect(wx, 48, ww, 262); g.strokeStyle = C.red; g.lineWidth = 2; g.setLineDash([6, 5]); g.strokeRect(wx, 48, ww, 262); g.setLineDash([]);
        T.label('2x', wx + ww / 2, 322, 'center', '#fff', 13, C.redDk);
      });
      T.label('2x damage taken: each window is shorter than a cast', W / 2, 352, 'center', C.redDk, 14);
      grid(g, 50, 300);
      const a = lane(g, 64, 100, 'Locked', '#62688a', locked, play, 'warlock'), b = lane(g, 192, 100, 'Tokens', COL.sb, tok, play, 'warlock');
      // where each cast ends: a tick, red if it landed in a window
      [[locked, 64], [tok, 192]].forEach(([cs, y]) => cs.forEach(c => { if (play < c.e || c.e > WIN) return; g.strokeStyle = c.bonus ? C.red : '#9a9cb0'; g.lineWidth = 3; g.beginPath(); g.moveTo(sx(c.e) - 2, y + 2); g.lineTo(sx(c.e) - 2, y + 98); g.stroke(); }));
      playhead(g, play, 52, 296);
      const nA = locked.filter(c => c.bonus && play >= c.e).length, nB = tok.filter(c => c.bonus && play >= c.e).length, done = play >= WIN;
      tile(g, 20, 380, 240, `${nA} of 3`, 'locked casts ending in a window', '#62688a');
      tile(g, 276, 380, 240, `${nB} of 3`, 'token casts ending in a window', COL.sb);
      tile(g, 532, 380, 240, done ? a : '…', 'locked damage');
      tile(g, 788, 380, 232, done ? b : '…', 'token damage', COL.sb);
      if (done) T.label(`+${b - a} damage from timing when each cast ends`, W / 2, 516, 'center', '#fff', 16, C.good);
      const out = done
        ? `The windows are shorter than a cast, so what matters is when a cast ends. Locked, the cast bar decides: ${nA} of 3 bolts happened to land in a window. With tokens the player held each bolt and released it to end inside the window: 3 of 3, ${b} against ${a}.`
        : 'The boss opens three short weakness windows. Watch where each rotation’s casts end.';
      return { done, stats: stat('', done ? a : '…', 'locked rotation') + stat('g', done ? b : '…', 'token rotation') + stat('r', `${WLEN} s`, 'each window (a cast is 1.5 to 2.5 s)'), out };
    },
  });

  window.__seek = (t, w) => ({ imbalance, tokens, window: win })[w].seek(t);
  window.__dur = w => ({ imbalance, tokens, window: win })[w].dur();
})();
