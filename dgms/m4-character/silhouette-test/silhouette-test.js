/* Silhouette test (Module 4, Part 6: "Create solid black silhouettes", "Character Shape & Silhouette").
   Real Super Mario Bros. / Super Mario World sprites and League of Legends champion renders are drawn as solid black
   shapes from their own alpha. Slide 1: guess who each one is, then the colours come back; a score per group (player,
   companion, opposition) shows which group reads by shape alone. Slide 2: sort the shapes into friend and foe, then reveal.
   Both walk-throughs are fixed scripts, so every frame is a pure function of time and __seek is deterministic. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;
  const W = 1040, H = 585, INK = '#151a33';
  const GROUP = {
    player: { name: 'Player character', short: 'Player', col: C.player },
    companion: { name: 'Companion', short: 'Companion', col: C.p2 },
    opposition: { name: 'Opposition', short: 'Opposition', col: C.red },
  };
  const GKEYS = ['player', 'companion', 'opposition'];

  // px: pixel sprite drawn at an integer scale (relative sizes kept); otherwise a render fitted to a box
  const SETS = {
    mario: [
      { id: 'mario', name: 'Mario', group: 'player', alts: ['Luigi', 'Hammer Bro', 'Toad'], note: 'The cap, the moustache and the round nose make a profile you can read at sixteen pixels wide.' },
      { id: 'goomba', name: 'Goomba', group: 'opposition', alts: ['Boo', 'Koopa Troopa', 'Toad'], note: 'A wide, low mushroom with feet. It is the first shape a new player learns to stomp, so it has to read instantly.' },
      { id: 'toad', name: 'Toad', group: 'companion', alts: ['Princess Peach', 'Goomba', 'Boo'], note: 'The oversized spotted cap is the whole read: a big round head on a small body, softer than any enemy.' },
      { id: 'koopa', name: 'Koopa Troopa', group: 'opposition', alts: ['Bowser', 'Hammer Bro', 'Goomba'], note: 'The shell hump and the raised head read as a turtle even in black, and the shell is also the weapon you kick.' },
      { id: 'luigi', name: 'Luigi', group: 'player', alts: ['Mario', 'Hammer Bro', 'Princess Peach'], note: 'In Super Mario Bros. Luigi is Mario’s sprite with a new palette. The two silhouettes are identical, which works for a second player but would fail for a separate character.' },
      { id: 'boo', name: 'Boo', group: 'opposition', alts: ['Goomba', 'Toad', 'Bowser'], note: 'A round body, stubby arms and a tongue, with no feet: it floats, so its shape never needs the ground.' },
      { id: 'peach', name: 'Princess Peach', group: 'companion', alts: ['Toad', 'Luigi', 'Boo'], note: 'The crown and the long dress make a tall, soft, vertical shape that nothing hostile shares.' },
      { id: 'bowser', name: 'Bowser', group: 'opposition', alts: ['Koopa Troopa', 'Hammer Bro', 'Goomba'], note: 'Horns, spikes and a huge shell: the biggest and most jagged outline in the cast, as the final opponent should be.' },
      { id: 'hammerbro', name: 'Hammer Bro', group: 'opposition', alts: ['Koopa Troopa', 'Mario', 'Luigi'], note: 'Upright like Mario, which is unsettling. The shell and the helmet are what push it into the opposition.' },
    ].map(o => ({ ...o, px: true, src: `img/${o.id}.png` })),
    lol: [
      { id: 'jinx', name: 'Jinx', group: 'player', alts: ['Lucian', 'Draven', 'Ziggs'], note: 'Two braids longer than her legs and a rocket launcher on the shoulder: a thin, wild outline.' },
      { id: 'braum', name: 'Braum', group: 'companion', alts: ['Trundle', 'Gnar', 'Draven'], note: 'The door-sized shield dwarfs the body. The shape says protector before you ever see the moustache.' },
      { id: 'draven', name: 'Draven', group: 'opposition', alts: ['Lucian', 'Jinx', 'Braum'], note: 'Arms raised, two spinning axes: a showman’s pose that asks to be looked at.' },
      { id: 'ziggs', name: 'Ziggs', group: 'player', alts: ['Gnar', 'Jinx', 'Braum'], note: 'Short and round, with huge goggles and a bomb in hand. Yordle proportions are a read of their own.' },
      { id: 'lucian', name: 'Lucian', group: 'opposition', alts: ['Draven', 'Jinx', 'Trundle'], note: 'A long coat and two pistols held low: a tall, narrow, still shape, the opposite of Draven’s.' },
      { id: 'gnar', name: 'Gnar', group: 'companion', alts: ['Ziggs', 'Trundle', 'Braum'], note: 'A small body, a tail and a bone boomerang bigger than he is: playful and off balance.' },
      { id: 'trundle', name: 'Trundle', group: 'opposition', alts: ['Braum', 'Gnar', 'Draven'], note: 'Hunched shoulders, long arms and an ice club: a heavy brawler outline.' },
    ].map(o => ({ ...o, px: false, src: `img/lol-${o.id}.png` })),
  };
  const ALL = [...SETS.mario, ...SETS.lol];
  ALL.forEach((o, i) => {
    const k = i % 4, opts = o.alts.slice(); opts.splice(k % 4, 0, o.name); o.opts = opts;
    o.img = new Image(); o.img.src = o.src; o.sil = null;
    o.img.onload = () => {
      const c = document.createElement('canvas'); c.width = o.img.naturalWidth; c.height = o.img.naturalHeight;
      const x = c.getContext('2d'); x.drawImage(o.img, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = INK; x.fillRect(0, 0, c.width, c.height);
      o.sil = c;
    };
  });
  const ready = o => o.sil && o.img.naturalWidth;

  // draws o standing on (cx, foot): k = 0 black shape, 1 full colour; size = pixel scale for sprites, box height for renders
  function figure(g, o, cx, foot, size, k = 0, boxW = size) {
    if (!ready(o)) return;
    const iw = o.img.naturalWidth, ih = o.img.naturalHeight;
    const s = o.px ? size : Math.min(size / ih, boxW / iw), w = iw * s, h = ih * s;
    g.save(); g.imageSmoothingEnabled = !o.px;
    const x = Math.round(cx - w / 2), y = Math.round(foot - h);
    if (k < 1) { g.globalAlpha = 1 - k; g.drawImage(o.sil, x, y, w, h); }
    if (k > 0) { g.globalAlpha = k; g.drawImage(o.img, x, y, w, h); }
    g.restore();
  }
  function bg(g) {
    T.use(g); g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,252,244,.85)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill();
  }
  function txt(g, s, x, y, font, col, align = 'left') { g.font = font; g.fillStyle = col; g.textAlign = align; g.textBaseline = 'alphabetic'; g.fillText(s, x, y); }
  function mark(g, ok, x, y, r = 13) {
    g.fillStyle = ok ? C.p2 : C.red; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath();
    if (ok) { g.moveTo(x - r * .45, y); g.lineTo(x - r * .1, y + r * .38); g.lineTo(x + r * .5, y - r * .4); }
    else { g.moveTo(x - r * .4, y - r * .4); g.lineTo(x + r * .4, y + r * .4); g.moveTo(x + r * .4, y - r * .4); g.lineTo(x - r * .4, y + r * .4); }
    g.stroke();
  }
  const groupScore = (list, ans) => GKEYS.map(k => {
    const inG = list.filter(o => o.group === k), done = inG.filter(o => ans[o.id] != null);
    return { k, total: inG.length, done: done.length, hit: done.filter(o => ans[o.id] === o.name).length };
  });

  /* ---------------- slide 1: guess ---------------- */
  function drawGuess(g, st, now) {
    bg(g);
    const list = SETS[st.set], o = list[st.idx], ans = st.ans[st.set], picked = ans[o.id];
    const k = picked == null ? 0 : ease(clamp((now - st.revAt) / .45));
    // stage
    g.fillStyle = '#efe6d2'; g.beginPath(); g.roundRect(14, 14, 606, 557, 12); g.fill();
    txt(g, `Shape ${st.idx + 1} of ${list.length}`, 34, 46, '800 17px Montserrat, Jost, sans-serif', C.ink);
    txt(g, picked == null ? 'Who is this? Pick a name on the right.' : 'Revealed', 34, 70, '600 15px Jost, sans-serif', C.muted);
    const foot = st.set === 'mario' ? 430 : 450;
    g.fillStyle = 'rgba(40,30,20,.12)'; g.beginPath(); g.ellipse(317, foot + 4, 150, 14, 0, 0, Math.PI * 2); g.fill();
    figure(g, o, 317, foot, st.set === 'mario' ? 10 : 340, k, 440);
    if (picked != null) {
      const gr = GROUP[o.group], ok = picked === o.name;
      g.globalAlpha = k;
      txt(g, o.name, 317, 488, '800 30px Montserrat, Jost, sans-serif', C.ink, 'center');
      T.label(gr.name, 317, 516, 'center', '#fff', 15, gr.col);
      txt(g, ok ? `You said ${picked}. Read by shape.` : `You said ${picked}. The shape misled you.`, 317, 554, '600 16px Jost, sans-serif', ok ? '#1a8a4c' : C.red, 'center');
      mark(g, ok, 560, 60, 18);
      g.globalAlpha = 1;
    }
    // roster
    const cw = 124, ch = 112, x0 = 640, y0 = 14;
    list.forEach((p, i) => {
      const x = x0 + (i % 3) * (cw + 6), y = y0 + Math.floor(i / 3) * (ch + 6), a = ans[p.id], cur = i === st.idx;
      g.fillStyle = cur ? '#fde9b8' : '#efe6d2'; g.beginPath(); g.roundRect(x, y, cw, ch, 10); g.fill();
      if (cur) { g.strokeStyle = C.gold; g.lineWidth = 3; g.stroke(); }
      const rk = a == null ? 0 : (cur ? k : 1);
      figure(g, p, x + cw / 2, y + ch - 12, st.set === 'mario' ? (p.id === 'bowser' ? 2.6 : 2.8) : 92, rk, 108);
      if (a != null && (!cur || k > .5)) mark(g, a === p.name, x + cw - 16, y + 16, 11);
    });
    // per-group score
    const sy = 14 + 3 * (ch + 6) + 8;
    txt(g, 'Read by shape alone, per group', x0, sy + 16, '800 14px Montserrat, Jost, sans-serif', C.ink);
    groupScore(list, ans).forEach((r, i) => {
      const y = sy + 30 + i * 46, gr = GROUP[r.k];
      txt(g, gr.short, x0, y + 17, '700 15px Jost, sans-serif', gr.col);
      g.fillStyle = '#e6dcc5'; g.beginPath(); g.roundRect(x0 + 100, y + 4, 200, 16, 8); g.fill();
      if (r.done) { g.fillStyle = gr.col; g.beginPath(); g.roundRect(x0 + 100, y + 4, Math.max(16, 200 * r.hit / r.done), 16, 8); g.fill(); }
      txt(g, r.done ? `${r.hit} of ${r.done}` : 'none yet', x0 + 384, y + 17, '700 14px Jost, sans-serif', C.ink, 'right');
    });
  }

  // walk-through: the Mario cast in order, one scripted guess each (Luigi is taken for Mario), then the summary
  const SCRIPT = { luigi: 'Mario' }, STEP = 2.8, GUESS_AT = 1.15;
  const GUESS_DUR = SETS.mario.length * STEP + 3.5;
  function guessTour(st, t) {
    st.set = 'mario'; const list = SETS.mario;
    const i = Math.min(list.length - 1, Math.floor(t / STEP)), f = t - i * STEP;
    st.idx = i; st.ans.mario = {};
    list.forEach((o, j) => { if (j < i || (j === i && f >= GUESS_AT)) st.ans.mario[o.id] = SCRIPT[o.id] || o.name; });
    st.revAt = i * STEP + GUESS_AT;
    return t;
  }

  const scenes = {};
  canvasDemo('guess', (s, cv, g) => {
    const st = { set: 'mario', idx: 0, ans: { mario: {}, lol: {} }, revAt: -9, tour: true, held: false, t: 0, clock: 0, key: '' };
    const setBtns = $$(s, '.sil-set .btn'), optBox = $(s, '.sil-opts'), tourBtn = $(s, '.sil-tour');
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); st.ans = { mario: {}, lol: {} }; st.idx = 0; } };
    setBtns.forEach(b => b.onclick = () => { manual(); st.set = b.dataset.s; st.idx = 0; });
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    $(s, '.sil-next').onclick = () => { manual(); st.idx = (st.idx + 1) % SETS[st.set].length; };
    $(s, '.sil-reset').onclick = () => { manual(); st.ans[st.set] = {}; st.idx = 0; };
    optBox.addEventListener('click', e => {
      const b = e.target.closest('[data-n]'); if (!b) return;
      manual(); const o = SETS[st.set][st.idx];
      if (st.ans[st.set][o.id] != null) { st.idx = (st.idx + 1) % SETS[st.set].length; return; }
      st.ans[st.set][o.id] = b.dataset.n; st.revAt = st.clock;
    });
    cv.addEventListener('click', e => {
      const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * W / r.width, y = (e.clientY - r.top) * H / r.height;
      if (x < 640 || y > 14 + 3 * 118) return;
      const i = Math.floor((x - 640) / 130) + 3 * Math.floor((y - 14) / 118);
      if (i >= 0 && i < SETS[st.set].length) { manual(); st.idx = i; }
    });
    function info(now) {
      const list = SETS[st.set], o = list[st.idx], picked = st.ans[st.set][o.id];
      const key = [st.set, st.idx, picked, Object.keys(st.ans[st.set]).length].join('|');
      if (key === st.key) return; st.key = key;
      setBtns.forEach(b => b.classList.toggle('on', b.dataset.s === st.set));
      optBox.innerHTML = o.opts.map(n => `<button class="btn${picked == null ? '' : n === o.name ? ' hit' : n === picked ? ' miss' : ''}" data-n="${n}">${n}</button>`).join('');
      const sc = groupScore(list, st.ans[st.set]);
      say($(s, '.sil-stats'), sc.map(r => `<div class="${r.k === 'player' ? '' : r.k === 'companion' ? 'cp' : 'r'}"><b>${r.done ? r.hit + '/' + r.done : '–'}</b><span>${GROUP[r.k].name.toLowerCase()} shapes named correctly</span></div>`).join(''));
      const done = Object.keys(st.ans[st.set]).length === list.length;
      say($(s, '.sil-out'), picked == null
        ? (st.set === 'mario' ? 'Every sprite is drawn from its own pixels, filled black. Pick the name you think fits the shape.' : 'League champions, filled black from their official renders. Groups follow one sample match: your side and the enemy’s.')
        : `<b>${o.name}.</b> ${o.note}${done ? ' <b class="accent">That is the whole cast.</b> Which group read best by shape?' : ''}`);
    }
    scenes.guess = { seek(t) { st.held = true; guessTour(st, t); drawGuess(g, st, t); info(t); }, dur: () => GUESS_DUR };
    return dt => {
      if (st.held) return;
      st.t += dt; st.clock += dt;
      if (st.tour) { if (st.t >= GUESS_DUR) st.t = 0; guessTour(st, st.t); drawGuess(g, st, st.t); }
      else drawGuess(g, st, st.clock);
      info(st.clock);
    };
  });

  /* ---------------- slide 2: friend or foe ---------------- */
  const SORT = ['toad', 'goomba', 'hammerbro', 'boo', 'peach', 'koopa', 'mario', 'bowser', 'luigi'].map(id => SETS.mario.find(o => o.id === id));
  const isFoe = o => o.group === 'opposition';
  const slot = (bin, n) => ({ x: (bin === 'friend' ? 14 : 532) + 52 + (n % 6) * 78, y: 392 + Math.floor(n / 6) * 104 });
  function drawSort(g, st, now) {
    bg(g);
    const rk = st.revAt == null ? 0 : ease(clamp((now - st.revAt) / .5));
    // bins
    [['friend', 14, 'Friend', C.player], ['foe', 532, 'Foe', C.red]].forEach(([b, x, name, col]) => {
      g.fillStyle = b === 'friend' ? 'rgba(46,163,220,.12)' : 'rgba(229,50,45,.10)'; g.beginPath(); g.roundRect(x, 300, 494, 271, 12); g.fill();
      g.strokeStyle = col; g.lineWidth = 2; g.setLineDash([8, 6]); g.stroke(); g.setLineDash([]);
      txt(g, name, x + 18, 330, '800 20px Montserrat, Jost, sans-serif', col);
    });
    txt(g, 'player and companions', 114, 330, '600 14px Jost, sans-serif', C.muted);
    txt(g, 'opposition', 600, 330, '600 14px Jost, sans-serif', C.muted);
    // the queue and the shape on the pedestal
    const next = SORT.findIndex(o => !st.bin[o.id]);
    txt(g, next < 0 ? 'All sorted.' : `Shape ${next + 1} of ${SORT.length}`, 520, 40, '800 17px Montserrat, Jost, sans-serif', C.ink, 'center');
    if (next >= 0) {
      g.fillStyle = '#efe6d2'; g.beginPath(); g.roundRect(370, 52, 300, 236, 14); g.fill();
      g.fillStyle = 'rgba(40,30,20,.12)'; g.beginPath(); g.ellipse(520, 270, 100, 10, 0, 0, Math.PI * 2); g.fill();
      figure(g, SORT[next], 520, 268, 6.5, 0);
      txt(g, '◀ friend', 340, 180, '700 18px Jost, sans-serif', C.player, 'right');
      txt(g, 'foe ▶', 700, 180, '700 18px Jost, sans-serif', C.red, 'left');
      SORT.slice(next + 1, next + 7).forEach((o, j) => figure(g, o, 836 + j * 30, 120, 1.3, 0));
      if (next + 1 < SORT.length) txt(g, 'up next', 830, 140, '600 13px Jost, sans-serif', C.muted);
    } else if (st.revAt == null) txt(g, 'Reveal to bring the colours back.', 520, 170, '600 20px Jost, sans-serif', C.muted, 'center');
    else txt(g, `${SORT.filter(o => (st.bin[o.id] === 'foe') === isFoe(o)).length} of ${SORT.length} sorted correctly from shape alone`, 520, 170, '800 22px Montserrat, Jost, sans-serif', C.ink, 'center');
    // sorted shapes fly into their bins
    const count = { friend: 0, foe: 0 };
    SORT.forEach(o => {
      const b = st.bin[o.id]; if (!b) return;
      const p = slot(b, count[b]++), f = ease(clamp((now - st.at[o.id]) / .35));
      const x = lerp(520, p.x, f), y = lerp(268, p.y + 34, f), sc = lerp(6.5, o.id === 'bowser' ? 2.2 : 2.6, f);
      figure(g, o, x, y, sc, rk);
      if (rk > .5) mark(g, (b === 'foe') === isFoe(o), p.x + 34, p.y - 30, 12);
      if (rk > .5) { g.globalAlpha = rk; txt(g, o.name.replace('Princess ', '').replace(' Troopa', ''), p.x, p.y + 52, '600 12px Jost, sans-serif', C.ink, 'center'); g.globalAlpha = 1; }
    });
  }
  const SORT_SCRIPT = { hammerbro: 'friend' }, SSTEP = 1.4, SREV = SORT.length * SSTEP + .9, SORT_DUR = SREV + 6;
  function sortTour(st, t) {
    st.bin = {}; st.at = {};
    SORT.forEach((o, i) => { const at = .8 + i * SSTEP; if (t >= at) { st.bin[o.id] = SORT_SCRIPT[o.id] || (isFoe(o) ? 'foe' : 'friend'); st.at[o.id] = at; } });
    st.revAt = t >= SREV ? SREV : null;
  }
  canvasDemo('sort', (s, cv, g) => {
    const st = { bin: {}, at: {}, revAt: null, tour: true, held: false, t: 0, clock: 0, key: '' };
    const tourBtn = $(s, '.sort-tour'), revBtn = $(s, '.sort-rev');
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); st.bin = {}; st.at = {}; st.revAt = null; } };
    const put = b => { manual(); const o = SORT.find(p => !st.bin[p.id]); if (!o) return; st.bin[o.id] = b; st.at[o.id] = st.clock; };
    $$(s, '.sort-btns .btn').forEach(b => b.onclick = () => put(b.dataset.b));
    cv.addEventListener('click', e => { const r = cv.getBoundingClientRect(); put((e.clientX - r.left) / r.width < .5 ? 'friend' : 'foe'); });
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    revBtn.onclick = () => { manual(); if (st.revAt == null) st.revAt = st.clock; };
    $(s, '.sort-reset').onclick = () => { manual(); st.bin = {}; st.at = {}; st.revAt = null; };
    function info() {
      const n = Object.keys(st.bin).length, rev = st.revAt != null, key = [n, rev].join('|');
      if (key === st.key) return; st.key = key;
      revBtn.classList.toggle('on', rev);
      const sorted = SORT.filter(o => st.bin[o.id]);
      const ok = o => (st.bin[o.id] === 'foe') === isFoe(o);
      const foes = sorted.filter(isFoe), friends = sorted.filter(o => !isFoe(o));
      say($(s, '.sort-stats'), rev
        ? `<div class="g"><b>${friends.filter(ok).length}/${friends.length}</b><span>player and companions sorted as friend</span></div><div class="r"><b>${foes.filter(ok).length}/${foes.length}</b><span>opposition sorted as foe</span></div>`
        : `<div><b>${n}/${SORT.length}</b><span>shapes sorted</span></div>`);
      const hb = st.bin.hammerbro === 'friend';
      say($(s, '.sort-out'), !rev ? 'No colours, no faces: only the outline. Sort every shape, then reveal.'
        : `${sorted.filter(ok).length} of ${sorted.length} sorted correctly from shape alone. ${hb ? 'Hammer Bro stands upright like Mario, so its outline pulls it toward the friends; the shell and helmet are what mark it as opposition.' : 'Round, low and spiky shapes read as hostile; upright, capped shapes read as the player’s side.'}`);
    }
    scenes.sort = { seek(t) { st.held = true; sortTour(st, t); drawSort(g, st, t); info(); }, dur: () => SORT_DUR };
    return dt => {
      if (st.held) return;
      st.t += dt; st.clock += dt;
      if (st.tour) { if (st.t >= SORT_DUR) st.t = 0; sortTour(st, st.t); drawSort(g, st, st.t); }
      else drawSort(g, st, st.clock);
      info();
    };
  });

  window.__seek = (t, which = 'guess') => scenes[which].seek(t);
  window.__dur = (which = 'guess') => scenes[which].dur();
})();
