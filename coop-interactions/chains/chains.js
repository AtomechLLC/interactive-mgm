/* Co-op chains (MGM C3 M6, deck slides 186-229 and 288-291). Three players with two keywords each and one enemy.
   A plan is a grid of who does what in which beat. simulate(plan) resolves it beat by beat: an ability checks the
   enemy's state at the start of its beat and its effect lands at the end, so a setup always comes before the exploit
   it enables. draw(g, sim, t) is a pure function of time, so the builder, the title loop and window.__seek (the GIF)
   all show the same thing. The ability rules are the ABIL table below. */
(function () {
  const { $, $$, canvasDemo, demo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;
  const WW = 900, WH = 330, BEATS = 8, BEAT = .9, TAIL = 1.4;
  const ST = { slowed: { name: 'Slowed', col: '#5562eb' }, wet: { name: 'Wet', col: '#2f8fd6' }, rooted: { name: 'Rooted', col: '#2f8a4c' }, frozen: { name: 'Frozen', col: '#57b6ff' } };
  const immobile = s => s.rooted || s.frozen;
  // each ability: stage, and resolve(state) -> { dmg, add: {state: beats}, take: [states], word, ok }
  const ABIL = {
    slow: { name: 'Slow', who: 0, stage: 'setup', run: s => ({ dmg: 5, add: { slowed: 3 }, word: 'Slowed', ok: true }) },
    shot: { name: 'Charged shot', who: 0, stage: 'payoff', run: s => immobile(s) ? { dmg: 60, word: '60! It can’t dodge', ok: true, big: true } : s.slowed ? { dmg: 20, word: 'Grazed', ok: false } : { dmg: 0, word: 'Dodged', ok: false, miss: true } },
    soak: { name: 'Soak', who: 1, stage: 'setup', run: s => ({ dmg: 0, add: { wet: 3 }, word: 'Wet', ok: true }) },
    freeze: { name: 'Freeze', who: 1, stage: 'exploit', run: s => s.wet ? { dmg: 10, add: { frozen: 2 }, take: ['wet'], word: 'Frozen', ok: true } : { dmg: 5, word: 'Chilled', ok: false } },
    bind: { name: 'Bind', who: 2, stage: 'exploit', run: s => s.slowed || s.frozen ? { dmg: 10, add: { rooted: 2 }, word: 'Rooted', ok: true } : { dmg: 0, word: 'Dodged', ok: false, miss: true } },
    shatter: { name: 'Shatter', who: 2, stage: 'payoff', run: s => s.frozen ? { dmg: 80, take: ['frozen'], word: '80! Shattered', ok: true, big: true } : { dmg: 5, word: 'Bonk', ok: false } },
  };
  const PLAYERS = [
    { name: 'Ranger', col: C.player, kit: ['slow', 'shot'], pos: [170, 92] },
    { name: 'Mage', col: C.p2, kit: ['soak', 'freeze'], pos: [130, 168] },
    { name: 'Warden', col: C.p3, kit: ['bind', 'shatter'], pos: [170, 244] },
  ];
  const plan = (rows) => rows.map(r => r.split(' ').map(x => x === '.' ? '' : x));
  const PRESETS = [
    { name: 'Everyone on their own', sub: 'each player loops their own best damage', plan: plan(['shot shot shot shot shot shot shot shot', 'freeze freeze freeze freeze freeze freeze freeze freeze', 'shatter shatter shatter shatter shatter shatter shatter shatter']) },
    { name: 'Slow → Bind → Charged shot', sub: 'Ashe and Morgana (slides 218-221)', plan: plan(['slow . shot . slow . shot .', '. . . . . . . .', '. bind . . . bind . .']) },
    { name: 'Wet → Freeze → Shatter', sub: 'Magicka (slides 210, 222)', plan: plan(['. . . . . . . .', 'soak freeze . . soak freeze . .', '. . shatter . . . shatter .']) },
    { name: 'All three chains', sub: 'setups feed two different payoffs', plan: plan(['slow . shot . . . shot .', 'soak freeze . . soak freeze . .', '. bind shatter . . . shatter .']) },
  ];

  /* ---------- the rules, beat by beat ---------- */
  function simulate(P) {
    const beats = [], st = {}; let total = 0;
    for (let b = 0; b < BEATS; b++) {
      const before = {}; Object.keys(st).forEach(k => { if (st[k].until >= b) before[k] = st[k]; });
      const flags = Object.fromEntries(Object.keys(before).map(k => [k, true]));
      const acts = [];
      P.forEach((row, who) => {
        const id = row[b]; if (!id) return;
        const r = ABIL[id].run(flags), a = { who, id, ...r };
        // the chain this hit belongs to: the abilities that set up the states it used
        const used = Object.keys(before).filter(k => (id === 'shot' && (k === 'rooted' || k === 'frozen' || k === 'slowed')) || (id === 'freeze' && k === 'wet') || (id === 'bind' && (k === 'slowed' || k === 'frozen')) || (id === 'shatter' && k === 'frozen'));
        const src = r.ok ? used.map(k => before[k].chain).sort((x, y) => y.length - x.length)[0] || [] : [];
        a.chain = [...src, a];
        acts.push(a); total += r.dmg;
      });
      // effects land at the end of the beat
      acts.forEach(a => {
        (a.take || []).forEach(k => delete st[k]);
        Object.entries(a.add || {}).forEach(([k, n]) => { st[k] = { until: b + n, chain: a.chain }; });
      });
      Object.keys(st).forEach(k => { if (st[k].until <= b) delete st[k]; });
      beats.push({ acts, states: before, total });
    }
    const chains = beats.flatMap(x => x.acts).filter(a => a.big).map(a => a.chain);
    return { P, beats, total, chains, dur: BEATS * BEAT + TAIL };
  }
  const statesAt = (S, t) => { const b = Math.floor(t / BEAT); if (b < 0) return {}; if (b >= BEATS) return {}; const k = (t - b * BEAT) / BEAT; return k > .7 ? (S.beats[b + 1]?.states || {}) : S.beats[b].states; };

  /* ---------- drawing ---------- */
  function enemyPos(S, t) {
    // it strafes up and down, slower when slowed, not at all when rooted or frozen
    let y = 0, ph = 0;
    for (let s = 0; s < Math.min(t, BEATS * BEAT); s += .03) { const st = statesAt(S, s); ph += .03 * (immobile(st) ? 0 : st.slowed ? .7 : 2.4); }
    y = Math.sin(ph) * 58;
    return [650, 168 + y];
  }
  function draw(g, S, t, o = {}) {
    T.use(g);
    T.floor(0, 0, WW, WH); T.wall(0, 0, WW, 22); T.wall(0, WH - 22, WW, 22);
    const st = statesAt(S, t), [ex, ey] = enemyPos(S, t);
    const b = Math.min(BEATS - 1, Math.floor(t / BEAT)), k = (t - b * BEAT) / BEAT, done = t >= BEATS * BEAT;
    // the enemy, tinted by its states
    if (st.frozen) { g.fillStyle = 'rgba(160,215,255,.55)'; g.beginPath(); g.roundRect(ex - 44, ey - 44, 88, 88, 14); g.fill(); g.strokeStyle = '#57b6ff'; g.lineWidth = 3; g.stroke(); }
    if (st.rooted) { g.strokeStyle = '#2f8a4c'; g.lineWidth = 4; for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; g.beginPath(); g.moveTo(ex + Math.cos(a) * 44, ey + Math.sin(a) * 44); g.quadraticCurveTo(ex + Math.cos(a + .6) * 26, ey + Math.sin(a + .6) * 26, ex + Math.cos(a) * 12, ey + Math.sin(a) * 12); g.stroke(); } }
    T.foe(ex, ey, 32, Math.PI, st.wet ? '#c9443e' : C.red, { mark: 'horns' });
    if (st.wet) { g.fillStyle = 'rgba(47,143,214,.8)'; [[-14, -40], [10, -44], [22, -30]].forEach(([dx, dy]) => { g.beginPath(); g.ellipse(ex + dx, ey + dy + (t * 30 % 10), 3, 5, 0, 0, Math.PI * 2); g.fill(); }); }
    if (st.slowed) { g.strokeStyle = 'rgba(85,98,235,.7)'; g.lineWidth = 3; g.setLineDash([4, 6]); g.beginPath(); g.arc(ex, ey, 40, 0, Math.PI * 2); g.stroke(); g.setLineDash([]); }
    // state badges
    const keys = Object.keys(st);
    keys.forEach((s, i) => T.label(ST[s].name, ex + (i - (keys.length - 1) / 2) * 92, ey + 62, 'center', '#fff', 14, ST[s].col));
    // the players and this beat's actions
    PLAYERS.forEach((p, i) => {
      T.player(p.pos[0], p.pos[1], Math.atan2(ey - p.pos[1], ex - p.pos[0]), 1, 1, p.col);
      if (!o.quiet) T.label(p.name, p.pos[0] - 58, p.pos[1], 'right', C.ink, 14);
    });
    if (!done && S.beats[b]) S.beats[b].acts.forEach(a => {
      const p = PLAYERS[a.who].pos, A = ABIL[a.id], col = A.stage === 'setup' ? '#5562eb' : A.stage === 'exploit' ? '#c98a10' : C.red;
      const u = clamp((k - .15) / .4);
      if (u <= 0) return;
      const tx = a.miss ? ex + 20 : ex, ty = a.miss ? ey + (a.who - 1) * 50 + 70 : ey;
      if (u < 1) {
        const x = lerp(p[0] + 24, tx, ease(u)), y = lerp(p[1], ty, ease(u));
        T.tracer(lerp(p[0] + 24, tx, Math.max(0, ease(u) - .25)), lerp(p[1], ty, Math.max(0, ease(u) - .25)), x, y, 1, col, A.stage === 'payoff' ? 9 : 5);
      } else {
        const v = clamp((k - .55) / .45);
        if (!a.miss && v < .3) T.flash(ex, ey, a.big ? 70 : 40, 1 - v / .3);
        T.popText(a.word, ex + (a.who - 1) * 130, ey - 54 + (a.who === 1 ? 108 : 0) - v * 18, a.big ? C.goldInk : a.ok ? col : '#7a7f9e', 1 - v * .6);
      }
      if (!o.quiet) T.label(A.name, p[0] + 34, p[1] - 30, 'left', '#fff', 13, col);
    });
    // running total
    const tot = done ? S.total : (b > 0 ? S.beats[b - 1].total : 0) + (k > .55 && S.beats[b] ? S.beats[b].acts.reduce((s, a) => s + a.dmg, 0) : 0);
    T.label(`Damage: ${tot}`, WW - 24, 48, 'right', C.ink, 20);
    if (o.cap) T.label(o.cap, 24, WH - 48, 'left', '#fff', 17, 'rgba(21,32,68,.9)');
    if (done && !o.quiet) T.stamp(`${S.total} damage`, WW / 2 + 40, WH / 2, S.total >= 120 ? C.good : C.red, clamp((t - BEATS * BEAT) / .3), 30);
  }
  const fit = (g, cv, fn) => { const sc = Math.min(cv.width / WW, cv.height / WH); g.save(); g.translate((cv.width - WW * sc) / 2, (cv.height - WH * sc) / 2); g.scale(sc, sc); fn(); g.restore(); };
  const chainText = ch => ch.map(a => `<span class="chip ${ABIL[a.id].stage === 'setup' ? '' : ABIL[a.id].stage === 'exploit' ? 'gold' : 'red'}">${PLAYERS[a.who].name}: ${ABIL[a.id].name}</span>`).join('<i>→</i>');

  /* ---------- slide 1: title ---------- */
  const SIMS = PRESETS.map(p => simulate(p.plan));
  canvasDemo('title', (s, cv, g) => (dt, t) => { g.clearRect(0, 0, cv.width, cv.height); const S = SIMS[3]; fit(g, cv, () => draw(g, S, t % S.dur, { quiet: true })); });

  /* ---------- slide 2: the builder, with a tour of the first three presets ---------- */
  let api = null;
  canvasDemo('builder', (s, cv, g) => {
    const grid = $(s, '.ch-grid'), out = $(s, '.ch-out'), total = $(s, '.ch-total');
    const st = { P: PRESETS[1].plan.map(r => r.slice()), t: 0, playing: true, tour: false, tt: 0, held: false, last: '' };
    let S = simulate(st.P);
    $(s, '.ch-presets').innerHTML = PRESETS.map((p, i) => `<button class="pre" data-i="${i}"><b>${p.name}</b><span>${p.sub}</span></button>`).join('');
    const TOUR = [0, 1, 2], tourAt = tt => { const D = SIMS[0].dur, i = Math.floor((tt % (D * 3)) / D); return { i: TOUR[i], t: tt % D }; };
    function buildGrid() {
      grid.innerHTML = `<div class="gh"></div>` + Array.from({ length: BEATS }, (_, b) => `<div class="gh">Beat ${b + 1}</div>`).join('') +
        PLAYERS.map((p, w) => `<div class="gp" style="--c:${p.col}">${p.name}</div>` + Array.from({ length: BEATS }, (_, b) => `<button class="cell" data-w="${w}" data-b="${b}"></button>`).join('')).join('');
      $$(grid, '.cell').forEach(c => c.onclick = () => {
        const w = +c.dataset.w, b = +c.dataset.b, kit = ['', ...PLAYERS[w].kit], cur = st.P[w][b];
        st.P[w][b] = kit[(kit.indexOf(cur) + 1) % kit.length]; st.tour = false; set();
      });
    }
    function paintGrid(Sx, t) {
      const b = Math.floor(t / BEAT);
      $$(grid, '.cell').forEach(c => {
        const w = +c.dataset.w, bb = +c.dataset.b, id = Sx.P[w][bb], a = Sx.beats[bb].acts.find(x => x.who === w);
        c.className = `cell ${id ? ABIL[id].stage : ''} ${bb === b ? 'now' : ''} ${a && bb < b ? (a.big ? 'big' : a.ok ? 'ok' : 'meh') : ''}`;
        c.textContent = id ? ABIL[id].name : '';
      });
    }
    function report(Sx, name) {
      const key = name + JSON.stringify(Sx.P); if (key === st.last) return; st.last = key;
      say(total, `<b>${Sx.total}</b><span>damage in ${BEATS} beats${name ? ` · ${name}` : ''}</span>`);
      const own = Sx.chains.length === 0;
      say(out, own ? `<b class="bad">No chains.</b> Every payoff hit a target that could still dodge or wasn’t frozen. Each player is running their own loop, side by side: this is the weakly designed co-op of slide 187.`
        : `<b class="good">${Sx.chains.length} payoff${Sx.chains.length > 1 ? 's' : ''} landed on a set-up target:</b>` + Sx.chains.map(ch => `<div class="chain">${chainText(ch)}</div>`).join(''));
    }
    const set = () => { S = simulate(st.P); st.t = 0; st.playing = true; };
    $$(s, '.pre').forEach(b => b.onclick = () => { st.P = PRESETS[+b.dataset.i].plan.map(r => r.slice()); st.tour = false; set(); });
    $(s, '.ch-play').onclick = () => { st.tour = false; st.t = 0; st.playing = true; };
    $(s, '.ch-clear').onclick = () => { st.P = PLAYERS.map(() => Array(BEATS).fill('')); st.tour = false; set(); };
    buildGrid();
    function render() {
      let Sx = S, t = st.t, name = '';
      if (st.tour) { const a = tourAt(st.tt); Sx = SIMS[a.i]; t = a.t; name = PRESETS[a.i].name; }
      else { const i = PRESETS.findIndex(p => JSON.stringify(p.plan) === JSON.stringify(st.P)); name = i >= 0 ? PRESETS[i].name : 'your plan'; }
      $$(s, '.pre').forEach((b, i) => b.classList.toggle('on', JSON.stringify(PRESETS[i].plan) === JSON.stringify(Sx.P)));
      g.clearRect(0, 0, cv.width, cv.height);
      fit(g, cv, () => draw(g, Sx, Math.min(t, Sx.dur), { cap: st.tour ? name : '' }));
      paintGrid(Sx, Math.min(t, Sx.dur)); report(Sx, name);
    }
    api = { seek(t) { st.held = st.tour = true; st.tt = t; render(); }, dur: () => SIMS[0].dur * 3 };
    return dt => { if (!st.held) { st.tt += dt; if (st.playing) st.t += dt; if (!st.tour && st.t > S.dur + 1.2) st.t = 0; } render(); };
  }, { enter(s) { /* starts on the Ashe and Morgana chain */ } });

  /* ---------- slide 3: the deck's keyword chains (slide 291) ---------- */
  const KW = [['Wet', 'Freeze', 'Laser'], ['Interrupt', 'Silence', 'Burn'], ['Grab', 'Throw', 'Heavy'], ['Sunder', 'Burn', 'Taunt'], ['Slow', 'Root / Stun', 'Blast'], ['Break', 'Topple', 'Daze'], ['Break', 'Topple', 'Launch', 'Smash']];
  demo('keywords', {
    init(s) {
      const cls = ['', 'gold', 'red', 'red'];
      $(s, '.kw-list').innerHTML = `<div class="kw-row kw-h"><span>Setup</span><i></i><span>Exploit</span><i></i><span>Payoff</span></div>` +
        KW.map((r, j) => `<div class="kw-row" style="--d:${j * .25}s">` + r.map((k, i) => `<span class="chip ${i === r.length - 1 ? 'red' : i ? 'gold' : ''}" style="--i:${i}">${k}</span>`).join('<i>→</i>') + '</div>').join('');
    },
    enter(s) { const l = $(s, '.kw-list'); l.classList.remove('go'); void l.offsetWidth; l.classList.add('go'); },
  });

  window.__seek = t => api.seek(t);
  window.__dur = () => api.dur();
})();
