/* Ennui ("Learning From My Past", Lesson 4 follow-up, xelnath.com 2012), cross-referenced with the Design Scripture
   (Contrast Drives Attention, Reward Pacing, Late-Stage Retention Problems, Endings Trigger Quitting).
   Novelty budget: one player's interest across eight years of World of Warcraft, Nov 2004 to Oct 2012. Interest decays as
   the game repeats; each tool the learner places lifts it, and every tool habituates (the same kind lifts less each time).
   A "life" line rises when the player leaves college for 40-60 hour weeks: below it, the player stops. Slides 2-4 (the
   900th Korok, Solved rotation, The unreachable mountain) follow below. Everything here
   is an illustrative model, not data. The expansion dates are real. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const { C, clamp, ease, rr, wrap, text, icon } = LP;
  const rnd = s => { const x = Math.sin(s * 91.7 + 17.3) * 43758.5453; return x - Math.floor(x); };
  const W = 1040, H = 585, F = (w, s) => `${w} ${s}px Jost, sans-serif`, M = (w, s) => `${w} ${s}px Montserrat, Jost, sans-serif`;
  const N = 96; // months from Nov 2004
  const X0 = 70, X1 = 1010, YT = 96, YB = 380, mx = m => X0 + (X1 - X0) * m / N, iy = v => YB - (YB - YT) * v / 100;
  const TOOLS = {
    xpac: { label: 'Expansion', col: '#7a3fc4', boost: 40, tip: '<b>Expansion.</b> More stimulation, the post’s first tool: a new continent, a new level cap, a new class. Each one lifts less than the last, because the player has seen an expansion before.' },
    tool: { label: 'New tool', col: '#2e7fd6', boost: 20, tip: '<b>New tool.</b> Metroid hands you the Morph Ball; an expansion adds a new class or flying. The scripture’s Reward Pacing says a new tool every few hours of play keeps the pattern changing.' },
    mode: { label: 'New way to play', col: '#c07a0c', boost: 30, tip: '<b>New way to play.</b> Diablo III’s Adventure Mode, Stunt Race FX’s tractor-trailer, WoW’s pet battles. Reward Pacing puts a whole new way to play at 16+ hours, and it lifts the most of the small tools.' },
    season: { label: 'Season reset', col: '#2f9e5a', boost: 26, tip: '<b>Season reset.</b> Path of Exile leagues and Diablo seasons wipe the economy and start everyone fresh. Strong the first time; spam it and each reset lifts less.' },
    pb: { label: 'Pattern-breaker', col: '#d8402f', boost: 14, tip: '<b>Pattern-breaker.</b> A Hades god run, a world event, the mimic chest. Small and short, but it lands because it breaks the routine (the scripture’s Pattern-Breakers: use sparingly).' },
    brk: { label: 'Break', col: '#5aa9d6', boost: 0, tip: '<b>Break.</b> The post’s third tool: allow breaks. WoW’s rested XP and Scroll of Resurrection, Animal Crossing’s real-time clock, Wordle’s one puzzle a day, and FFXIV’s director telling players it is fine to step away. Interest recovers while you are gone.' },
    del: { label: 'Remove', col: '#5d618c', tip: '<b>Remove.</b> Click a marker on the chart to take it away.' },
  };
  const XP = [[26, 'The Burning Crusade'], [48, 'Wrath of the Lich King'], [73, 'Cataclysm'], [94, 'Mists of Pandaria']];
  const xp = () => XP.map(([m, name]) => ({ m, t: 'xpac', name }));
  const PRESETS = [
    { id: 'wow', label: 'Expansions only', ev: xp(), ceil: false, say: 'Classic to Mists, expansions only. Each one is a jump in stimulation, then repetition wears it down, and each jump is smaller because the player has seen one before. When work replaces college, the bar to keep playing rises.' },
    { id: 'ceil', label: '+ unreachable ceiling', ev: xp(), ceil: true, say: 'The post’s second tool: a ceiling so high it is never reached, with growth you see every session (Diablo III’s uncapped Paragon levels, OSRS skills to 99). The fall between expansions is slower.' },
    { id: 'brk', label: '+ breaks', ev: [...xp(), { m: 62, t: 'brk' }, { m: 84, t: 'brk' }], ceil: true, say: 'The post’s third tool: allow breaks. Interest recovers while the player is away, and rested XP and the Scroll of Resurrection (2010) make coming back cheap.' },
    { id: 'season', label: 'Season spam', ev: Array.from({ length: 22 }, (_, i) => ({ m: 6 + i * 4, t: 'season' })), ceil: false, say: 'One tool, repeated: a season reset every four months. The first lifts a lot; by the tenth it barely registers. “It can be slowed, never stopped.”' },
    { id: 'mix', label: 'Vary the kind', ev: [...xp(), { m: 12, t: 'tool' }, { m: 37, t: 'tool' }, { m: 60, t: 'tool' }, { m: 84, t: 'mode' }, { m: 18, t: 'pb' }, { m: 56, t: 'pb' }, { m: 66, t: 'brk' }, { m: 88, t: 'pb' }], ceil: true, say: 'Vary the kind, not the size: expansions, new tools, a new way to play, a few pattern-breakers and a break. The scripture’s Contrast Drives Attention: the brain tunes out what is steady, so change the pattern.' },
  ];
  const lifeBar = m => m < 48 ? 22 : m < 54 ? 22 + (m - 48) * 5 : 52;
  function sim(ev, ceil) {
    const by = {}; ev.forEach(e => (by[e.m] = by[e.m] || []).push(e));
    const out = [], seen = {}, brk = new Set(); ev.filter(e => e.t === 'brk').forEach(e => { for (let k = 0; k < 4; k++) brk.add(e.m + k); });
    let I = 85, play = true, low = 0, quits = 0, rets = 0, played = 0;
    const decay = ceil ? .045 : .075, floor = ceil ? 22 : 10, lifts = [];
    for (let m = 0; m <= N; m++) {
      const onBreak = brk.has(m);
      (by[m] || []).forEach(e => { if (e.t === 'brk') return; const n = seen[e.t] || 0; seen[e.t] = n + 1; const b = TOOLS[e.t].boost * Math.pow(.72, n); I = Math.min(100, I + b); lifts.push({ m, b, t: e.t }); });
      if (onBreak) { I += (78 - I) * .2; if (!brk.has(m + 1)) I = Math.min(100, I + 6); }
      else I -= decay * (I - floor);
      const L = lifeBar(m);
      if (play && !onBreak) { if (I < L) { if (++low >= 2) { play = false; quits++; low = 0; } } else low = 0; }
      else if (!play && I >= L + 6) { play = true; rets++; }
      if (play && !onBreak) played++;
      out.push({ I, play: play && !onBreak, brk: onBreak, L });
    }
    return { out, quits, rets, played, lifts };
  }
  function scene(g, ev, ceil, upTo, title) {
    const r = sim(ev, ceil);
    g.clearRect(0, 0, W, H);
    g.fillStyle = C.paper; rr(g, 10, 10, W - 20, H - 20, 14); g.fill(); g.strokeStyle = C.line; g.lineWidth = 2; g.stroke();
    text(g, title.toUpperCase(), 30, 42, M(800, 17), C.navy);
    text(g, `played ${r.played} of ${N + 1} months · stopped ${r.quits}× · came back ${r.rets}×`, W - 30, 42, M(700, 16), C.ink, 'right');
    if (ceil) text(g, 'unreachable ceiling: on', W - 30, 64, F(600, 14), C.green, 'right');
    // grid and years
    g.strokeStyle = '#e6dcc4'; g.lineWidth = 1;
    [0, 25, 50, 75, 100].forEach(v => { g.beginPath(); g.moveTo(X0, iy(v)); g.lineTo(X1, iy(v)); g.stroke(); text(g, String(v), X0 - 10, iy(v) + 5, F(500, 13), C.muted, 'right'); });
    for (let y = 2005; y <= 2012; y++) { const m = (y - 2004) * 12 - 10; g.beginPath(); g.moveTo(mx(m), YT); g.lineTo(mx(m), YB); g.stroke(); text(g, String(y), mx(m), YB + 20, F(600, 14), C.muted, 'center'); }
    g.save(); g.translate(28, (YT + YB) / 2); g.rotate(-Math.PI / 2); text(g, 'interest', 0, 0, F(600, 15), C.muted, 'center'); g.restore();
    // breaks
    r.out.forEach((o, m) => { if (o.brk && m <= upTo) { g.fillStyle = 'rgba(90,169,214,.18)'; g.fillRect(mx(m), YT, mx(1) - X0 + .5, YB - YT); } });
    // the life line
    g.setLineDash([8, 6]); g.strokeStyle = C.red; g.lineWidth = 2.5; g.beginPath(); r.out.forEach((o, m) => g[m ? 'lineTo' : 'moveTo'](mx(m), iy(o.L))); g.stroke(); g.setLineDash([]);
    text(g, 'what it takes to keep playing', mx(56), iy(52) - 8, F(600, 14), C.red);
    // the interest curve, in segments by state
    for (let m = 1; m <= Math.min(upTo, N); m++) {
      const a = r.out[m - 1], b = r.out[m]; g.strokeStyle = b.brk ? '#5aa9d6' : b.play ? '#2e7fd6' : '#b5ae9e'; g.lineWidth = b.play ? 4 : 3;
      g.beginPath(); g.moveTo(mx(m - 1), iy(a.I)); g.lineTo(mx(m), iy(b.I)); g.stroke();
    }
    // markers
    ev.forEach(e => {
      if (e.m > upTo) return; const t = TOOLS[e.t], x = mx(e.m);
      g.strokeStyle = t.col; g.lineWidth = 1.5; g.globalAlpha = .6; g.beginPath(); g.moveTo(x, YT - 6); g.lineTo(x, YB); g.stroke(); g.globalAlpha = 1;
      g.fillStyle = t.col; g.beginPath(); g.arc(x, YT - 12, 7, 0, Math.PI * 2); g.fill();
      if (e.name) { g.save(); g.translate(x - 19, YT + 8); g.rotate(Math.PI / 2); text(g, e.name, 0, 0, F(700, 13), t.col); g.restore(); }
    });
    r.lifts.forEach(l => { if (l.m <= upTo && l.b >= 4) text(g, `+${Math.round(l.b)}`, mx(l.m) + 4, iy(r.out[l.m].I) - 8, M(700, 13), TOOLS[l.t].col); });
    // life track
    const ly = 420; text(g, 'life', X0 - 10, ly + 22, F(600, 15), C.muted, 'right');
    g.fillStyle = '#e3eefc'; rr(g, mx(0), ly, mx(48) - mx(0) - 3, 32, 8); g.fill(); text(g, 'college: evenings free', mx(24), ly + 22, F(600, 15), C.ink, 'center');
    g.fillStyle = '#f6dcd4'; rr(g, mx(48), ly, mx(N) - mx(48), 32, 8); g.fill(); text(g, 'first job: 40-60 hour weeks', mx(72), ly + 22, F(600, 15), C.ink, 'center');
    // legend
    let lx = X0; [['playing', '#2e7fd6'], ['stopped', '#b5ae9e'], ['on a break', '#5aa9d6']].forEach(([l, col]) => { g.fillStyle = col; rr(g, lx, 482, 26, 8, 4); g.fill(); text(g, l, lx + 34, 491, F(600, 14), C.ink); lx += 150; });
    Object.entries(TOOLS).filter(([k]) => k !== 'del').forEach(([k, t], i) => { const x = X0 + i * 156; g.fillStyle = t.col; g.beginPath(); g.arc(x + 6, 522, 6, 0, Math.PI * 2); g.fill(); text(g, t.label, x + 18, 527, F(600, 14), C.ink); });
    text(g, 'An illustrative model of one player, not data. Expansion dates are real.', X0, 560, F(500, 13), C.muted);
    return r;
  }
  canvasDemo('ennui', (sl, cv, g) => {
    const pSeg = $(sl, '.en-pre'), tSeg = $(sl, '.en-tools'), ceilBox = $(sl, '.en-ceil'), out = $(sl, '.en-out'), tourBtn = $(sl, '.en-tour');
    pSeg.innerHTML = PRESETS.map((p, i) => `<button class="btn" data-i="${i}">${p.label}</button>`).join('');
    tSeg.innerHTML = Object.entries(TOOLS).map(([k, t]) => `<button class="btn" data-t="${k}" style="border-color:${t.col}">${t.label}</button>`).join('');
    const LEN = 7, DUR = PRESETS.length * LEN;
    const st = { tour: true, held: false, t: 0, pi: 0, ev: PRESETS[0].ev.slice(), ceil: false, tool: 'xpac', title: PRESETS[0].label, stage: -1 };
    const manual = () => { st.tour = false; tourBtn.classList.remove('on'); };
    const load = i => { const p = PRESETS[i]; st.pi = i; st.ev = p.ev.map(e => ({ ...e })); st.ceil = p.ceil; st.title = p.label; say(out, p.say); };
    $$(pSeg, '.btn').forEach(b => b.onclick = () => { manual(); load(+b.dataset.i); });
    $$(tSeg, '.btn').forEach(b => b.onclick = () => { manual(); st.tool = b.dataset.t; say(out, TOOLS[st.tool].tip + ' Click the chart to place it.'); });
    ceilBox.onchange = () => { manual(); st.ceil = ceilBox.checked; st.title = 'Your timeline'; };
    $(sl, '.en-clear').onclick = () => { manual(); st.ev = []; st.title = 'Your timeline'; st.pi = -1; say(out, 'An empty timeline: no new content at all. Place tools and watch where the player stops.'); };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; st.stage = -1; tourBtn.classList.add('on'); };
    cv.addEventListener('click', e => {
      const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * W / r.width, y = (e.clientY - r.top) * H / r.height;
      if (x < X0 || x > X1 || y < YT - 24 || y > YB) return;
      const m = Math.round(clamp((x - X0) / (X1 - X0)) * N); manual(); st.pi = -1; st.title = 'Your timeline';
      const near = st.ev.findIndex(ev => Math.abs(ev.m - m) <= 1);
      if (st.tool === 'del' || near >= 0) { if (near >= 0) st.ev.splice(near, 1); return; }
      st.ev.push({ m, t: st.tool });
      const r2 = sim(st.ev, st.ceil); say(out, `${TOOLS[st.tool].label} placed. The player now plays ${r2.played} of ${N + 1} months.`);
    });
    function frame() {
      let upTo = N;
      if (st.tour) { const k = Math.floor((st.t % DUR) / LEN), u = (st.t % DUR) - k * LEN; if (k !== st.stage) { st.stage = k; load(k); } upTo = Math.round(ease(clamp(u / 4.5)) * N); }
      scene(g, st.ev, st.ceil, upTo, st.title);
      ceilBox.checked = st.ceil;
      $$(pSeg, '.btn').forEach(b => b.classList.toggle('on', +b.dataset.i === st.pi));
      $$(tSeg, '.btn').forEach(b => b.classList.toggle('on', !st.tour && b.dataset.t === st.tool));
    }
    LP.runners.ennui = { seek(t) { st.held = true; st.tour = true; st.t = t; st.stage = -1; frame(); }, dur: () => DUR };
    return dt => { if (st.held) return; if (st.tour) st.t = (st.t + Math.max(0, Math.min(dt, .1))) % DUR; frame(); };
  });

  /* ---------------- 2. The 900th Korok (habituation lab) ----------------
     Felt value of a reward falls with every repeat of the same kind (Contrast Drives Attention). Four ways to fight it.
     The numbers are an illustrative model. */
  const KMODES = {
    same: { label: 'Same seed', say: 'Every Korok gives one seed. Breath of the Wild has 900 of them, and the reward for finding all 900 is Hestu’s golden poop. The felt value (filled) falls away from the actual value (outline) with every repeat.' },
    big: { label: 'Bigger numbers', say: 'Make each reward bigger: 1, 3, 9, 27, like Disgaea’s billion-point damage or Cookie Clicker. Felt value holds a little longer, then flattens, because the size of a number stops meaning anything (the scripture’s Incremental Games and Magnitude).' },
    rare: { label: 'Random rarity', say: 'Mostly small drops, with a rare orange beam (Diablo) or a Borderlands legendary. The rare one still lands, the common ones fade, and the pull toward the next roll is the uncertainty dependence the scripture lists as a retention trap.' },
    kind: { label: 'Change the kind', say: 'Change what the reward is, not how big it is: a mimic chest, a new ability, a shrine. Each new kind starts fresh, so felt value keeps coming back (the scripture’s Pattern-Breakers).' },
  };
  const KINDS = ['seed', 'seed', 'seed', 'mimic', 'seed', 'seed', 'ability', 'seed', 'seed', 'shrine', 'seed', 'seed', 'seed', 'mimic', 'seed', 'ability'];
  function korokRun(mode, n) {
    const out = [], seen = {}; let total = 0;
    for (let i = 0; i < n; i++) {
      let actual = 1, kind = 'seed', felt;
      if (mode === 'same') felt = Math.pow(.84, i);
      else if (mode === 'big') { actual = Math.pow(3, i); felt = Math.pow(.9, i) * (i ? .8 : 1); }
      else if (mode === 'rare') { const r = rnd(i * 7 + 3) < .12; kind = r ? 'legend' : 'seed'; const k = seen[kind] = (seen[kind] || 0) + 1; felt = r ? .95 * Math.pow(.93, k - 1) : Math.pow(.84, k - 1); actual = r ? 10 : 1; }
      else { kind = KINDS[i % KINDS.length]; const k = seen[kind] = (seen[kind] || 0) + 1; felt = Math.pow(.8, k - 1) * (kind === 'seed' ? 1 : .95); actual = kind === 'seed' ? 1 : 3; }
      total += actual; out.push({ actual, felt, kind, total });
    }
    return out;
  }
  const fmt = v => v >= 1e9 ? (v / 1e9).toFixed(1) + ' billion' : v >= 1e6 ? (v / 1e6).toFixed(1) + ' million' : Math.round(v).toLocaleString('en-US');
  function korok(g, x, y, s, t) { // a little leaf spirit, drawn
    g.save(); g.translate(x, y); g.scale(s, s);
    g.fillStyle = '#3f9b3a'; g.beginPath(); g.ellipse(0, -38, 16, 28, Math.sin(t * 3) * .2, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#2b6e27'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -12); g.lineTo(0, -60); g.stroke();
    g.fillStyle = '#c99a5b'; g.beginPath(); g.arc(0, 0, 22, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#7a5a2c'; g.lineWidth = 3; g.stroke();
    g.fillStyle = '#2b1d0e'; [-8, 8].forEach(ex => { g.beginPath(); g.arc(ex, -3, 4, 0, Math.PI * 2); g.fill(); }); g.beginPath(); g.arc(0, 8, 4, 0, Math.PI); g.fill();
    g.restore();
  }
  function korokScene(g, mode, n, since, t) {
    const run = korokRun(mode, Math.max(n, 1)), last = n ? run[n - 1] : null;
    g.clearRect(0, 0, W, H);
    // the find
    const gr = g.createLinearGradient(0, 10, 0, 575); gr.addColorStop(0, '#cfe9b0'); gr.addColorStop(1, '#6fae4c');
    g.save(); rr(g, 10, 10, 420, 565, 14); g.clip(); g.fillStyle = gr; g.fillRect(10, 10, 420, 565);
    g.fillStyle = 'rgba(40,90,30,.35)'; for (let k = 0; k < 9; k++) { g.beginPath(); g.ellipse(30 + k * 50, 470 + (k % 2) * 16, 40, 60, 0, 0, Math.PI * 2); g.fill(); }
    g.restore(); g.strokeStyle = C.line; g.lineWidth = 2; rr(g, 10, 10, 420, 565, 14); g.stroke();
    text(g, `find #${n}`, 30, 44, M(800, 18), C.navy);
    const pop = ease(clamp(since / .35)), fade = clamp(1.4 - since);
    if (last) {
      const cx = 220, cy = 270, k = last.kind;
      if (k === 'mimic') { g.fillStyle = '#7a4a1e'; rr(g, cx - 70, cy - 20, 140, 80, 10); g.fill(); g.fillStyle = '#a8692c'; rr(g, cx - 74, cy - 70 - 30 * pop, 148, 54, 12); g.fill(); g.fillStyle = '#fff'; for (let i = 0; i < 7; i++) { g.beginPath(); g.moveTo(cx - 63 + i * 20, cy - 20); g.lineTo(cx - 53 + i * 20, cy - 36); g.lineTo(cx - 43 + i * 20, cy - 20); g.fill(); } g.fillStyle = '#d8402f'; g.beginPath(); g.arc(cx - 30, cy - 50 - 30 * pop, 6, 0, Math.PI * 2); g.arc(cx + 30, cy - 50 - 30 * pop, 6, 0, Math.PI * 2); g.fill(); }
      else if (k === 'legend') { g.fillStyle = `rgba(255,140,30,${.5 * fade + .15})`; g.fillRect(cx - 18, 20, 36, cy - 10); korok(g, cx, cy + 30, 1.6, t); }
      else if (k === 'ability') { g.fillStyle = C.navy; g.beginPath(); g.arc(cx, cy, 70 * (.6 + .4 * pop), 0, Math.PI * 2); g.fill(); text(g, '✦', cx, cy + 22, '700 64px serif', C.gold, 'center'); }
      else if (k === 'shrine') { g.fillStyle = '#3a4a6a'; rr(g, cx - 60, cy - 70, 120, 140, 12); g.fill(); g.fillStyle = `rgba(110,200,255,${.6 + .4 * Math.sin(t * 4)})`; g.beginPath(); g.arc(cx, cy - 10, 26, 0, Math.PI * 2); g.fill(); }
      else korok(g, cx, cy + 30 - 20 * Math.sin(pop * Math.PI), 1.6, t);
      const msg = { seed: 'Yahaha! You found me!', legend: 'A legendary drop!', mimic: 'The chest bites back!', ability: 'A new ability!', shrine: 'A new shrine!' }[k];
      g.globalAlpha = .4 + .6 * fade; text(g, msg, cx, 120, M(800, 22), C.navy, 'center');
      text(g, mode === 'big' ? `+${fmt(last.actual)}` : k === 'seed' ? '+1 seed' : '', cx, 400, M(800, 26), C.goldInk, 'center'); g.globalAlpha = 1;
    } else text(g, 'Press Collect', 220, 280, M(800, 22), C.navy, 'center');
    g.fillStyle = 'rgba(255,252,244,.94)'; rr(g, 26, 500, 388, 60, 10); g.fill();
    text(g, mode === 'big' ? `${fmt(last ? last.total : 0)} points` : `Korok seeds ${last ? run.slice(0, n).filter(r => r.kind === 'seed').length : 0} / 900`, 40, 538, M(800, 20), C.ink);
    // felt vs actual
    const X = 445, PW = 585; g.fillStyle = C.paper; rr(g, X, 10, PW, 565, 14); g.fill(); g.strokeStyle = C.line; g.lineWidth = 2; g.stroke();
    text(g, 'HOW EACH FIND FELT', X + 20, 44, M(800, 15), C.muted);
    const show = run.slice(Math.max(0, n - 16), n), bx = X + 30, bw = 30, base = 400, hh = 300;
    g.strokeStyle = '#e6dcc4'; g.lineWidth = 1; [0, .5, 1].forEach(v => { g.beginPath(); g.moveTo(bx - 6, base - hh * v); g.lineTo(X + PW - 20, base - hh * v); g.stroke(); });
    show.forEach((r, i) => {
      const x = bx + i * (bw + 3), col = { seed: '#3f9b3a', legend: '#ff8c1e', mimic: '#a8692c', ability: C.navy, shrine: '#3a7ab0' }[r.kind];
      g.strokeStyle = C.muted; g.lineWidth = 1.5; g.strokeRect(x, base - hh, bw, hh);
      g.fillStyle = col; g.fillRect(x, base - hh * r.felt, bw, hh * r.felt);
      text(g, String(n - show.length + i + 1), x + bw / 2, base + 18, F(500, 12), C.muted, 'center');
    });
    text(g, 'outline: what you got · fill: how it felt (illustrative)', X + 20, base + 46, F(500, 13), C.muted);
    if (last) { text(g, `felt ${Math.round(last.felt * 100)}%`, X + 20, base + 90, M(800, 26), last.felt > .6 ? C.green : last.felt > .3 ? C.goldInk : C.red); }
    if (mode === 'big' && last) text(g, `the number: ${fmt(last.actual)}`, X + PW - 20, base + 90, M(700, 18), C.ink, 'right');
  }
  canvasDemo('korok', (sl, cv, g) => {
    const mSeg = $(sl, '.ko-mode'), out = $(sl, '.ko-out'), tourBtn = $(sl, '.ko-tour');
    mSeg.innerHTML = Object.entries(KMODES).map(([k, m]) => `<button class="btn" data-m="${k}">${m.label}</button>`).join('');
    const ORDER = Object.keys(KMODES), LEN = 9, DUR = ORDER.length * LEN;
    const st = { tour: true, held: false, t: 0, mode: 'same', n: 0, since: 9, stage: -1 };
    const manual = () => { st.tour = false; tourBtn.classList.remove('on'); };
    const setMode = m => { st.mode = m; st.n = 0; say(out, KMODES[m].say); };
    $$(mSeg, '.btn').forEach(b => b.onclick = () => { manual(); setMode(b.dataset.m); });
    $(sl, '.ko-go').onclick = () => { manual(); st.n++; st.since = 0; };
    $(sl, '.ko-reset').onclick = () => { manual(); st.n = 0; };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; st.stage = -1; tourBtn.classList.add('on'); };
    function frame() {
      if (st.tour) { const k = Math.floor((st.t % DUR) / LEN), u = (st.t % DUR) - k * LEN; if (k !== st.stage) { st.stage = k; setMode(ORDER[k]); } st.n = Math.min(16, Math.floor(u / .5) + 1); st.since = u % .5; }
      korokScene(g, st.mode, st.n, st.since, st.held ? st.t : performance.now() / 1000);
      $$(mSeg, '.btn').forEach(b => b.classList.toggle('on', b.dataset.m === st.mode));
    }
    LP.runners.korok = { seek(t) { st.held = true; st.tour = true; st.t = t; st.stage = -1; frame(); }, dur: () => DUR };
    return dt => { if (st.held) return; dt = Math.max(0, Math.min(dt, .1)); st.since += dt; if (st.tour) st.t = (st.t + dt) % DUR; frame(); };
  });

  /* ---------------- 3. Solved rotation (repetition blocking) ----------------
     A fire mage against a training dummy. A bot always presses the best button. With fixed cooldowns the cast log becomes
     periodic and a predictor that copies the last cycle is never wrong; each fix makes it wrong again.
     "Decisions" = casts the last cycle did not predict. Illustrative, not WoW's real numbers. */
  const SP = { fb: ['Fireball', 'spell_fire_flamebolt'], blast: ['Fire Blast', 'spell_fire_fireball'], scorch: ['Scorch', 'spell_fire_soulburn'], bomb: ['Living Bomb', 'ability_mage_livingbomb'], pyro: ['Pyroblast', 'spell_fire_fireball02'],
    bolt2: ['Firebolt', 'spell_fire_firebolt02'], seal: ['Seal of Fire', 'spell_fire_sealoffire'], start: ['Firestarter', 'ability_mage_firestarter'] };
  const SI = k => `../img/${SP[k][1]}.jpg`;
  const FIXES = {
    procs: { label: 'Procs', say: 'Procs: a proc is a random chance for something to trigger. With Hot Streak, a critical hit can light up Pyroblast for one free cast (a hunter’s Lock and Load works the same way). You know what to press, but not when, so you have to watch the bar again.' },
    draw: { label: 'Card draw', say: 'A hand of cards: only three of your five buttons are available each turn, the way Slay the Spire deals you a hand. You can never play the same hand twice.' },
    boons: { label: 'Random offers', say: 'Random offers: every few turns one button is swapped for a different one, the way Hades offers boons. The best sequence keeps changing under you.' },
  };
  function rotSim(fix, steps) {
    // returns the cast log for `steps` global cooldowns
    let cd = { blast: 0, bomb: 0, pyro: 0, scorch: 0 }, hot = false, slots = ['fb', 'blast', 'scorch', 'bomb', 'pyro'], log = [], seed = 1;
    const CD = ROT_CD, PRI = ['pyro', 'bomb', 'blast', 'scorch', 'fb', 'bolt2', 'seal', 'start'];
    for (let s = 0; s < steps; s++) {
      if (fix.boons && s > 0 && s % 7 === 0) { const i = Math.floor(rnd(s * 3.1) * 4), opts = ['bolt2', 'seal', 'start', 'fb', 'blast', 'scorch']; slots[i] = opts[Math.floor(rnd(s * 5.7) * opts.length)]; }
      const lit = slots.map((k, i) => { let ok = !(cd[k] > 0); if (k === 'pyro') ok = fix.procs ? hot : ok; return ok; });
      if (fix.draw) { const hand = [0, 1, 2, 3, 4].sort((a, b) => rnd(s * 11 + a) - rnd(s * 11 + b)).slice(0, 3); slots.forEach((_, i) => { if (!hand.includes(i)) lit[i] = false; }); }
      let pick = -1; PRI.forEach(k => { const i = slots.indexOf(k); if (pick < 0 && i >= 0 && lit[i]) pick = i; });
      if (pick < 0) pick = lit.findIndex(Boolean);
      const k = pick >= 0 ? slots[pick] : null, cdBefore = { ...cd };
      Object.keys(cd).forEach(c => cd[c] = Math.max(0, cd[c] - 1));
      if (k) { if (CD[k] && !(k === 'pyro' && fix.procs)) cd[k] = CD[k]; if (k === 'pyro') hot = false; if (fix.procs && (k === 'fb' || k === 'blast' || k === 'scorch') && rnd(s * 13.3 + 7) < .3) hot = true; }
      log.push({ k, slots: slots.slice(), lit, cd: cdBefore });
    }
    // decisions: was this cast predicted by the same position in the last cycle? try the best period up to 12
    const dec = log.map((e, i) => {
      if (i < 24) return true;
      let best = 99; for (let p = 1; p <= 10; p++) { let miss = 0; for (let j = i - 14; j < i; j++) if (j - p >= 0 && log[j].k !== log[j - p].k) miss++; if (miss < best) { best = miss; e.p = p; } }
      return log[i].k !== log[i - e.p].k;
    });
    return { log, dec };
  }
  const ROT_CD = { blast: 2, scorch: 3, bomb: 5, pyro: 6 };
  function rotScene(g, fix, step, frac) {
    const { log, dec } = rotSim(fix, step + 40), cur = log[log.length - 1];
    g.clearRect(0, 0, W, H);
    g.fillStyle = '#1d2236'; rr(g, 10, 10, W - 20, H - 20, 14); g.fill();
    const lite = '#aab3d6';
    text(g, 'A FIRE MAGE’S ROTATION', 30, 42, M(800, 16), lite);
    const on = Object.entries(fix).filter(([, v]) => v).map(([k]) => FIXES[k].label);
    text(g, on.length ? `fix on: ${on.join(', ')}` : 'fixed cooldowns, no procs', W - 30, 42, F(600, 15), on.length ? C.gold : lite, 'right');
    text(g, 'The rule: each turn (one global cooldown), cast the strongest spell that is off cooldown, meaning recharged and ready.', 30, 68, F(600, 15), '#fff');
    // what was pressed
    text(g, 'the rotation so far: what was cast, newest on the right', 30, 100, F(600, 14), lite);
    const lg = log.slice(-20), d20 = dec.slice(-20);
    lg.forEach((e, i) => { const x = 30 + i * 49; if (e.k) { icon(g, SI(e.k), x, 110, 42); text(g, String(e.slots.indexOf(e.k) + 1), x + 21, 172, M(800, 15), '#fff', 'center'); } else text(g, 'pass', x + 21, 138, F(600, 13), lite, 'center');
      if (d20[i] && e.k) { g.strokeStyle = C.gold; g.lineWidth = 3; rr(g, x - 3, 107, 48, 48, 8); g.stroke(); } });
    // brackets when the last cycle repeats exactly
    const p = lg[lg.length - 1].p, quiet = d20.slice(-14).every(d => !d);
    if (p && quiet) {
      for (let end = 20, k = 0; end - p >= 0 && k < 3; end -= p, k++) {
        const x0 = 30 + (end - p) * 49, x1 = 30 + end * 49 - 7;
        g.strokeStyle = C.gold; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, 182); g.lineTo(x0, 190); g.lineTo(x1, 190); g.lineTo(x1, 182); g.stroke();
        text(g, k ? 'the same again' : `the same ${p} casts`, (x0 + x1) / 2, 210, F(700, 14), C.gold, 'center');
      }
    } else text(g, 'gold frame: a cast you could not have guessed by repeating the last cycle', 30, 206, F(600, 14), C.gold);
    // the buttons
    const by = 250; text(g, 'your action bar', 30, by - 8, F(600, 14), lite);
    cur.slots.forEach((k, i) => {
      const x = 30 + i * 196, lit = cur.lit[i], left = cur.cd ? cur.cd[k] || 0 : 0;
      g.fillStyle = lit ? '#2c3456' : '#232943'; rr(g, x, by, 184, 112, 10); g.fill();
      if (k === 'pyro' && fix.procs && lit) { g.strokeStyle = C.gold; g.lineWidth = 3; rr(g, x, by, 184, 112, 10); g.stroke(); }
      g.globalAlpha = lit ? 1 : .35; icon(g, SI(k), x + 10, by + 10, 52); g.globalAlpha = 1;
      text(g, `${i + 1}`, x + 16, by + 28, M(800, 15), '#fff');
      text(g, SP[k][0], x + 72, by + 30, M(700, 15), '#fff');
      const rule = k === 'pyro' && fix.procs ? 'when a proc lights it' : ROT_CD[k] ? `cooldown: ${ROT_CD[k]} turns` : 'no cooldown';
      text(g, rule, x + 72, by + 52, F(500, 13), lite);
      const state = !lit ? (fix.draw && !left ? 'not in your hand' : left ? `ready in ${left}` : 'waiting') : 'ready';
      text(g, state, x + 12, by + 92, M(700, 14), lit ? C.green : '#7a83a8');
      if (cur.k === k) text(g, '← pressed', x + 172, by + 92, M(700, 14), C.gold, 'right');
    });
    text(g, 'strongest first: Pyroblast > Living Bomb > Fire Blast > Scorch > Fireball', 30, by + 136, F(500, 13), lite);
    // meter
    const n = d20.filter(Boolean).length, my = 440;
    text(g, 'real decisions in the last 20 casts', 30, my, F(600, 15), lite);
    g.fillStyle = '#323a5c'; rr(g, 30, my + 12, 860, 24, 12); g.fill(); g.fillStyle = n > 6 ? C.green : n > 2 ? C.gold : C.red; rr(g, 30, my + 12, Math.max(24, 860 * n / 20), 24, 12); g.fill();
    text(g, `${n} / 20`, 1010, my + 32, M(800, 20), '#fff', 'right');
    g.font = F(600, 16); g.fillStyle = '#fff'; g.textAlign = 'left';
    wrap(g, n === 0 ? 'Solved rotation. Playing perfectly is now replaying a memorised tune: you are not choosing anything, the game is playing you.' : n < 6 ? 'Mostly predictable: a little to watch for, a lot to repeat.' : 'You have to look at the buttons again: the best cast keeps changing.', 30, my + 70, 980, 22);
  }
  canvasDemo('rot', (sl, cv, g) => {
    const fSeg = $(sl, '.ro-fix'), out = $(sl, '.ro-out'), tourBtn = $(sl, '.ro-tour');
    fSeg.innerHTML = Object.entries(FIXES).map(([k, f]) => `<button class="btn" data-f="${k}">${f.label}</button>`).join('');
    const GCD = .45, STAGES = [[{}, 'A rotation is the order you cast your spells. A cooldown is how long a spell needs to recharge before you can cast it again. Here the rule is simple: each turn, cast the strongest spell that is off cooldown. Because the cooldowns never change, the rule produces the same 7 casts over and over. Once you notice, you are not deciding anything; you are replaying a memorised tune.'],
      [{ procs: true }, 'Fix 1, procs. A proc is a random trigger: here a critical hit can light up Pyroblast for one free cast (WoW’s Hot Streak). You know what to press, but not when, so you have to watch the bar again.'],
      [{ draw: true }, 'Fix 2, card draw: only three of the five buttons are available each turn, the way Slay the Spire deals you a hand. The best press changes every turn.'],
      [{ boons: true }, 'Fix 3, random offers: every few turns one button is swapped for a different one, the way Hades offers boons. The old sequence stops working.'],
      [{}, 'Chess has the same problem across a whole game: memorised openings. Bobby Fischer’s answer, Chess960, shuffles the back row. One caveat from the scripture: some players love a fixed sequence the way a musician loves scales, so this is a choice about your audience.']];
    const LEN = 11, DUR = STAGES.length * LEN;
    const st = { tour: true, held: false, t: 0, fix: {}, tt: 0, stage: -1 };
    const manual = () => { st.tour = false; tourBtn.classList.remove('on'); };
    $$(fSeg, '.btn').forEach(b => b.onclick = () => { manual(); st.fix = { ...st.fix, [b.dataset.f]: !st.fix[b.dataset.f] }; st.tt = 0; say(out, st.fix[b.dataset.f] ? FIXES[b.dataset.f].say : `${FIXES[b.dataset.f].label} off.`); });
    $(sl, '.ro-none').onclick = () => { manual(); st.fix = {}; st.tt = 0; say(out, STAGES[0][1]); };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; st.stage = -1; tourBtn.classList.add('on'); };
    function frame() {
      if (st.tour) { const k = Math.floor((st.t % DUR) / LEN); st.tt = (st.t % DUR) - k * LEN; if (k !== st.stage) { st.stage = k; st.fix = STAGES[k][0]; say(out, STAGES[k][1]); } }
      const step = Math.floor(st.tt / GCD) + 1;
      rotScene(g, st.fix, step, (st.tt % GCD) / GCD);
      $$(fSeg, '.btn').forEach(b => b.classList.toggle('on', !!st.fix[b.dataset.f]));
    }
    LP.runners.rot = { seek(t) { st.held = true; st.tour = true; st.t = t; st.stage = -1; frame(); }, dur: () => DUR };
    return dt => { if (st.held) return; dt = Math.max(0, Math.min(dt, .1)); st.tt += dt; if (st.tour) st.t = (st.t + dt) % DUR; frame(); };
  });

  /* ---------------- 4. The unreachable mountain ----------------
     A simulated year (52 weeks) under five progression structures. Top: progress toward the mountain. Bottom: what each
     week's play gave you (the inch-pebble). Illustrative model; the OSRS XP table is the real formula. */
  const osrsXP = L => { let p = 0; for (let l = 1; l < L; l++) p += Math.floor(l + 300 * Math.pow(2, l / 7)); return Math.floor(p / 4); };
  const XP99 = osrsXP(99);
  const STRUCT = {
    osrs: { label: 'OSRS skill to 99', say: 'Old School RuneScape: XP grows steadily every session, while levels slow down. Level 92 is about halfway to 99 in XP. The Mountain (99 and its cape) is far, but every session shows XP gained.' },
    paragon: { label: 'Paragon levels', say: 'Diablo III’s Paragon levels have no cap: the post’s “almost unreachable ceiling, with steady growth”. You never arrive, and every session still moves the number.' },
    tiers: { label: 'Raid tiers', say: 'WoW raid tiers: every 13 weeks a new tier replaces your gear. The jump size is the dial. Too small and a patch feels like nothing; too big and last tier’s gear is junk overnight. The scripture suggests about 12.5%.' },
    ranked: { label: 'Ranked ladder', say: 'A ranked ladder: rating goes down as well as up, so a whole evening of play can end lower. The scripture calls that an anti-pebble. Turn on checkpoints to see Faeria’s fix.' },
  };
  function mtnSim(id, o) {
    const wk = []; let v = 0;
    if (id === 'osrs') { let xp = 0; for (let w = 0; w < 52; w++) { const gain = 230000; xp += gain; let L = 1; while (L < 99 && osrsXP(L + 1) <= xp) L++; wk.push({ v: xp / XP99, lab: L, peb: .6 }); } }
    else if (id === 'paragon') { let xp = 0; for (let w = 0; w < 52; w++) { xp += 1; const lvl = Math.floor(30 * Math.sqrt(xp)); wk.push({ v: lvl / 400, lab: lvl, peb: .55 + .1 * rnd(w) }); } }
    else if (id === 'tiers') { let ilvl = 100, sunk = 0; for (let w = 0; w < 52; w++) { let peb = .45, ev = null; if (w && w % 13 === 0) { ilvl *= 1 + o.jump; peb = clamp(o.jump / .2); sunk = clamp(o.jump / .3) * (o.trans ? .4 : 1); ev = 'tier'; } else sunk *= .7; wk.push({ v: (ilvl - 100) / 110, lab: Math.round(ilvl), peb, sunk, ev }); } }
    else { let r = 1400, floor = 0, pts = 0; for (let w = 0; w < 52; w++) { let d = 0; for (let gme = 0; gme < 10; gme++) d += rnd(w * 17 + gme) < .5 ? 25 : -25; const before = r; r = Math.max(o.check ? floor : 0, r + d); if (o.check) floor = Math.max(floor, Math.floor(r / 200) * 200); pts += 10; wk.push({ v: (r - 1000) / 1000, lab: r, peb: o.check ? .3 + clamp((r - before) / 150) * .4 : (r - before) / 150, floor: o.check ? floor : null }); } }
    return wk;
  }
  function mtnScene(g, id, o, upTo) {
    const wk = mtnSim(id, o), n = Math.min(52, upTo);
    g.clearRect(0, 0, W, H);
    g.fillStyle = C.paper; rr(g, 10, 10, W - 20, H - 20, 14); g.fill(); g.strokeStyle = C.line; g.lineWidth = 2; g.stroke();
    text(g, STRUCT[id].label.toUpperCase(), 30, 42, M(800, 17), C.navy);
    const X0m = 80, X1m = 1010, T = 70, B = 330, xw = w => X0m + (X1m - X0m) * w / 51, yv = v => B - (B - T) * clamp(v);
    // the mountain
    g.fillStyle = '#e8e0cc'; g.beginPath(); g.moveTo(X0m, B); g.lineTo(X1m - 120, T + 10); g.lineTo(X1m, B); g.fill();
    if (id !== 'paragon' && id !== 'tiers') { g.setLineDash([6, 6]); g.strokeStyle = C.goldInk; g.lineWidth = 2; g.beginPath(); g.moveTo(X0m, T); g.lineTo(X1m, T); g.stroke(); g.setLineDash([]); text(g, id === 'osrs' ? 'level 99' : 'rating 2000', X1m, T - 8, M(700, 14), C.goldInk, 'right'); }
    else text(g, id === 'paragon' ? 'no ceiling: the line keeps going' : 'each tier raises the ceiling', X1m, T - 8, M(700, 14), C.goldInk, 'right');
    if (id === 'osrs') { const y92 = yv(osrsXP(92) / XP99); g.strokeStyle = C.muted; g.setLineDash([3, 4]); g.beginPath(); g.moveTo(X0m, y92); g.lineTo(X1m, y92); g.stroke(); g.setLineDash([]); text(g, 'level 92: half the XP of 99', X0m + 6, y92 - 6, F(600, 13), C.muted); }
    if (id === 'ranked' && o.check) wk.slice(0, n).forEach((w, i) => { if (i && w.floor) { g.fillStyle = 'rgba(47,158,90,.25)'; g.fillRect(xw(i - 1), yv((w.floor - 1000) / 1000), xw(1) - X0m, 3); } });
    g.strokeStyle = '#2e7fd6'; g.lineWidth = 4; g.beginPath(); wk.slice(0, n).forEach((w, i) => g[i ? 'lineTo' : 'moveTo'](xw(i), yv(w.v))); g.stroke();
    if (n) { const w = wk[n - 1]; text(g, id === 'osrs' ? `level ${w.lab}` : id === 'paragon' ? `Paragon ${w.lab}` : id === 'tiers' ? `item level ${w.lab}` : `rating ${w.lab}`, xw(n - 1) + (n > 40 ? -8 : 8), yv(w.v) + (n > 40 ? 22 : -8), M(800, 15), C.navy, n > 40 ? 'right' : 'left'); }
    wk.slice(0, n).forEach((w, i) => { if (w.ev) { g.strokeStyle = '#7a3fc4'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(xw(i), T); g.lineTo(xw(i), B); g.stroke(); text(g, 'new tier', xw(i) + 4, B - 6, F(600, 12), '#7a3fc4'); } });
    text(g, 'progress', X0m - 10, (T + B) / 2, F(600, 14), C.muted, 'right');
    // pebbles
    const PB = 470, PH = 90; text(g, 'what each week gave you', X0m, PB - PH - 12, F(600, 14), C.muted, 'left');
    g.strokeStyle = C.line; g.beginPath(); g.moveTo(X0m, PB); g.lineTo(X1m, PB); g.stroke();
    wk.slice(0, n).forEach((w, i) => { const v = clamp(w.peb, -.9, .9), x = xw(i) - 6; g.fillStyle = v >= 0 ? C.green : C.red; g.fillRect(x, v >= 0 ? PB - PH * v : PB, 12, PH * Math.abs(v));
      if (id === 'tiers' && w.sunk > .05) { g.fillStyle = 'rgba(216,64,47,.55)'; g.fillRect(x, PB + 4, 12, 60 * w.sunk); } });
    text(g, id === 'tiers' ? 'green: progress that week · red below: gear made obsolete (sunk cost)' : id === 'ranked' && !o.check ? 'red: a week that ended with a lower rating (an anti-pebble)' : 'green: visible progress that week', X0m, 560, F(600, 14), C.ink);
    if (id === 'ranked') { const neg = wk.slice(0, n).filter(w => w.peb < 0).length; text(g, `${neg} of ${n} weeks ended lower`, X1m, 560, M(800, 15), neg ? C.red : C.green, 'right'); }
    if (id === 'tiers') text(g, `tier jump ${Math.round(o.jump * 1000) / 10}%${o.trans ? ' · transmog on' : ''}`, X1m, 560, M(800, 15), C.navy, 'right');
    text(g, 'An illustrative model, not data.', X1m, 42, F(500, 13), C.muted, 'right');
  }
  canvasDemo('mount', (sl, cv, g) => {
    const sSeg = $(sl, '.mo-struct'), out = $(sl, '.mo-out'), tourBtn = $(sl, '.mo-tour'), jr = $(sl, '.mo-jump'), jv = $(sl, '.mo-jv'), trans = $(sl, '.mo-trans'), check = $(sl, '.mo-check');
    sSeg.innerHTML = Object.entries(STRUCT).map(([k, s]) => `<button class="btn" data-s="${k}">${s.label}</button>`).join('');
    const STAGES = [['osrs', { jump: .125 }], ['paragon', { jump: .125 }], ['tiers', { jump: .03 }, 'A 3% tier jump: each patch barely registers.'], ['tiers', { jump: .4 }, 'A 40% tier jump: every tier makes last tier’s gear junk overnight, and the sunk-cost bars spike.'], ['tiers', { jump: .4, trans: true }, 'The same 40% jump with transmog: the power is gone, but you keep the look, so less of the effort feels wasted.'], ['tiers', { jump: .125 }, 'About 12.5%, the scripture’s rule: a jump that matters without wiping out what came before.'], ['ranked', {}], ['ranked', { check: true }, 'Faeria’s fix: you can’t drop below a league you reached this season, so a losing evening costs nothing you earned.']];
    const LEN = 6.5, DUR = STAGES.length * LEN;
    const st = { tour: true, held: false, t: 0, id: 'osrs', o: { jump: .125 }, stage: -1, up: 52 };
    const manual = () => { st.tour = false; tourBtn.classList.remove('on'); st.up = 52; };
    const sync = () => { jr.value = st.o.jump * 100; jv.textContent = `${Math.round(st.o.jump * 1000) / 10}%`; trans.checked = !!st.o.trans; check.checked = !!st.o.check; $(sl, '.mo-tiers').style.display = st.id === 'tiers' ? '' : 'none'; $(sl, '.mo-rank').style.display = st.id === 'ranked' ? '' : 'none'; };
    $$(sSeg, '.btn').forEach(b => b.onclick = () => { manual(); st.id = b.dataset.s; say(out, STRUCT[st.id].say); sync(); });
    jr.oninput = () => { manual(); st.o = { ...st.o, jump: +jr.value / 100 }; sync(); };
    trans.onchange = () => { manual(); st.o = { ...st.o, trans: trans.checked }; };
    check.onchange = () => { manual(); st.o = { ...st.o, check: check.checked }; say(out, check.checked ? STAGES[7][2] : STRUCT.ranked.say); };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; st.stage = -1; tourBtn.classList.add('on'); };
    function frame() {
      if (st.tour) { const k = Math.floor((st.t % DUR) / LEN), u = (st.t % DUR) - k * LEN; if (k !== st.stage) { st.stage = k; const s = STAGES[k]; st.id = s[0]; st.o = { jump: .125, ...s[1] }; say(out, s[2] || STRUCT[s[0]].say); sync(); } st.up = Math.round(ease(clamp(u / 4.5)) * 52); }
      mtnScene(g, st.id, st.o, st.up);
      $$(sSeg, '.btn').forEach(b => b.classList.toggle('on', b.dataset.s === st.id));
    }
    sync();
    LP.runners.mount = { seek(t) { st.held = true; st.tour = true; st.t = t; st.stage = -1; frame(); }, dur: () => DUR };
    return dt => { if (st.held) return; if (st.tour) st.t = (st.t + Math.max(0, Math.min(dt, .1))) % DUR; frame(); };
  });
})();
