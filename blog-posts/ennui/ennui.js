/* Ennui ("Learning From My Past", Lesson 4 follow-up, xelnath.com 2012), cross-referenced with the Design Scripture
   (Contrast Drives Attention, Reward Pacing, Late-Stage Retention Problems, Endings Trigger Quitting).
   Novelty budget: one player's interest across eight years of World of Warcraft, Nov 2004 to Oct 2012. Interest decays as
   the game repeats; each tool the learner places lifts it, and every tool habituates (the same kind lifts less each time).
   A "life" line rises when the player leaves college for 40-60 hour weeks: below it, the player stops. Everything here
   is an illustrative model, not data. The expansion dates are real. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const { C, clamp, ease, rr, wrap, text } = LP;
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
})();
