/* StarCraft II co-op mutators (MGM C4 M5, deck slide id g3ca178c8255_0_0, "Procedural Permutation: Mutators").
   'mutator-answers': the same Zerg wave against the same squad, once per mutator on the slide. Left plays the base mission's
   habit, right plays what the mutator asks for (sim.js). A mutator that breaks the habit is a permutation; one that only makes
   the habit cost more is closer to an escalation.
   'weekly-mutation': a weekly mutation rolls three mutators at once. Each pair is read with the deck's Evaluating Enemy
   Permutations questions: some stack nicely, some fight each other, others create impossible situations. PAIRS is this
   page's reading, not Blizzard's. */
(function () {
  const { $, $$ } = FPF.kit;
  const { pic, text, wrap, card, chip, TONE, panel, scene, clamp, ease, lerp } = CK;
  const T = TD, C = TD.C, TAU = Math.PI * 2;
  const M = window.MUT, SEG = M.DUR;
  const ph = (t, a, b) => clamp((t - a) / (b - a));
  const IMG = n => 'img/sc2-' + n + '.png';
  const MUT = Object.fromEntries(M.MUTATORS.map(m => [m[0], { key: m[0], name: m[1], text: m[2], answer: m[3], perm: m[4] }]));
  const UNIT_IMG = { marine: 'marine', tank: 'siege-tank', zergling: 'zergling', roach: 'roach', broodling: 'broodling' };
  const RING = { 1: '#2ea3dc', 2: '#2fae63', foe: '#a8201c' };

  // a round portrait token with a coloured ring
  function token(g, kind, x, y, r, ring, o = {}) {
    g.save(); g.globalAlpha *= o.a ?? 1;
    g.fillStyle = '#111'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    g.save(); g.beginPath(); g.arc(x, y, r - 1, 0, TAU); g.clip();
    if (o.grey) g.filter = 'grayscale(1)'; else if (kind === 'broodling') g.filter = 'brightness(2.2) saturate(1.3)';
    pic(g, IMG(UNIT_IMG[kind]), x, y, r * 2.1); g.restore();
    g.strokeStyle = ring; g.lineWidth = o.lw || 3; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke();
    g.restore();
  }
  function bar(g, x, y, w, k, col) {
    g.fillStyle = 'rgba(20,20,30,.55)'; g.fillRect(x - w / 2, y, w, 4);
    g.fillStyle = col; g.fillRect(x - w / 2, y, w * clamp(k), 4);
  }

  // ---------- one arena: a frame of the simulation drawn at ox, oy ----------
  function arena(g, f, ox, oy) {
    const W = M.W, H = M.H;
    g.save(); g.translate(ox, oy);
    g.beginPath(); g.roundRect(0, 0, W, H, 10); g.clip();
    g.fillStyle = '#d8cbb0'; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(150,130,95,.25)'; g.lineWidth = 1;
    for (let x = 40; x < W; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    for (let y = 40; y < H; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    // creep at the far edge, where the wave comes from
    const cr = g.createLinearGradient(W - 120, 0, W, 0); cr.addColorStop(0, 'rgba(110,60,120,0)'); cr.addColorStop(1, 'rgba(110,60,120,.35)');
    g.fillStyle = cr; g.fillRect(W - 120, 0, 120, H);
    // the base
    g.fillStyle = C.navy; g.fillRect(0, 0, 22, H);
    g.save(); g.translate(11, H / 2); g.rotate(-Math.PI / 2); text(g, 'YOUR BASE', 0, 0, { size: 11, w: 800, col: '#ffb951' }); g.restore();
    if (f.bomb && f.bomb.done === 'boom') { g.fillStyle = 'rgba(229,50,45,.35)'; g.fillRect(0, 0, 22, H); }
    // storm
    if (f.storm) {
      const s = f.storm, gr = g.createRadialGradient(s.x, s.y, 4, s.x, s.y, s.r);
      gr.addColorStop(0, 'rgba(240,250,255,.85)'); gr.addColorStop(.6, 'rgba(120,190,240,.55)'); gr.addColorStop(1, 'rgba(80,150,220,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(s.x, s.y, s.r, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 2;
      for (let k = 0; k < 3; k++) { const a = f.t * 3 + k * TAU / 3; g.beginPath(); g.arc(s.x, s.y, s.r * (.35 + k * .18), a, a + 1.6); g.stroke(); }
    }
    // boom bot
    if (f.bomb && f.bomb.done !== 'boom') {
      const b = f.bomb;
      g.save(); if (b.done) g.globalAlpha = .45;
      g.fillStyle = '#222'; g.beginPath(); g.arc(b.x, b.y, 15, 0, TAU); g.fill();
      g.save(); g.beginPath(); g.arc(b.x, b.y, 14, 0, TAU); g.clip(); pic(g, IMG('mut-boom-bots'), b.x, b.y, 30); g.restore();
      g.strokeStyle = b.done ? C.good : '#ff8a3a'; g.lineWidth = 3; g.beginPath(); g.arc(b.x, b.y, 15, 0, TAU); g.stroke();
      g.restore();
      if (b.reading && !b.done) {
        M.BOMB.seq.forEach((a, i) => {
          const x = b.x - 39 + i * 26, y = b.y - 36, on = i < b.entered, shown = b.read > .35;
          card(g, x, y, 22, 22, { r: 4, lw: 2, shadow: false, fill: on ? '#d8f0df' : '#fffaf0', edge: on ? '#5fb47c' : '#9a8a6a' });
          if (shown) text(g, a, x, y + 1, { size: 15, w: 800, col: on ? C.good : C.ink });
        });
      }
    }
    // enemies
    f.foes.forEach(e => {
      const r = M.STAT[e.kind].r + e.stacks * 1.4;
      if (e.stacks) { g.fillStyle = `rgba(229,50,45,${.18 + e.stacks * .07})`; g.beginPath(); g.arc(e.x, e.y, r + 6, 0, TAU); g.fill(); }
      if (e.carrier) { g.save(); g.strokeStyle = '#3fbf3f'; g.lineWidth = 3; g.setLineDash([4, 3]); g.beginPath(); g.arc(e.x, e.y, r + 5, 0, TAU); g.stroke(); g.restore(); }
      token(g, e.kind, e.x, e.y, r, RING.foe, { a: e.kind === 'broodling' ? .45 + .55 * clamp(e.life * 2) : 1 });
      if (e.shield) { g.fillStyle = 'rgba(87,182,255,.28)'; g.strokeStyle = '#57b6ff'; g.lineWidth = 3; g.beginPath(); g.arc(e.x, e.y, r + 5, 0, TAU); g.fill(); g.stroke(); }
      if (e.carrier) text(g, '☣', e.x - r - 2, e.y - r + 2, { size: 14, w: 800, col: '#1d7a1d', stroke: 3 });
      if (e.kind !== 'broodling') bar(g, e.x, e.y - r - 9, r * 2, e.hp, '#e5322d');
    });
    // squad
    f.units.forEach(u => {
      const r = M.STAT[u.kind].r;
      if (!u.alive) { token(g, u.kind, u.x, u.y, r, '#777', { a: .35, grey: true }); text(g, '✕', u.x, u.y, { size: 22, w: 800, col: C.redDk, a: .8 }); return; }
      if (u.plague) { g.fillStyle = 'rgba(63,191,63,.35)'; g.beginPath(); g.arc(u.x, u.y, r + 6, 0, TAU); g.fill(); }
      token(g, u.kind, u.x, u.y, r, RING[u.who]);
      if (u.frozen) { g.fillStyle = 'rgba(200,235,255,.55)'; g.strokeStyle = '#8fd3ff'; g.lineWidth = 3; g.beginPath(); g.arc(u.x, u.y, r + 2, 0, TAU); g.fill(); g.stroke(); }
      bar(g, u.x, u.y - r - 9, r * 2, u.hp, u.plague ? '#3fbf3f' : '#2fae63');
      if (u.mode === 'reading') text(g, 'reads the code', u.x, u.y + r + 12, { size: 11, w: 800, col: C.good, stroke: 3 });
      if (u.mode === 'tagging') text(g, 'tag', u.x, u.y + r + 11, { size: 11, w: 800, col: '#1f6fb0', stroke: 3 });
    });
    // effects
    f.fx.forEach(e => {
      const k = clamp(e.age / e.ttl);
      g.save();
      switch (e.k) {
        case 'shot': g.strokeStyle = '#f2b400'; g.lineWidth = 2; g.beginPath(); g.moveTo(e.x0, e.y0); g.lineTo(e.x, e.y); g.stroke(); break;
        case 'shell':
          g.globalAlpha = 1 - k; g.strokeStyle = '#ff8a3a'; g.lineWidth = 4; g.beginPath(); g.moveTo(e.x0, e.y0); g.lineTo(e.x, e.y); g.stroke();
          g.fillStyle = 'rgba(255,138,58,.35)'; g.beginPath(); g.arc(e.x, e.y, M.STAT.tank.splash * (.4 + .6 * k), 0, TAU); g.fill(); break;
        case 'poof': g.globalAlpha = 1 - k; g.strokeStyle = e.col; g.lineWidth = 3; g.beginPath(); g.arc(e.x, e.y, 8 + 18 * k, 0, TAU); g.stroke(); break;
        case 'fade': g.globalAlpha = 1 - k; g.strokeStyle = '#888'; g.lineWidth = 2; g.beginPath(); g.arc(e.x, e.y, 6 + 8 * k, 0, TAU); g.stroke(); break;
        case 'ring': g.globalAlpha = (1 - k) * .8; g.strokeStyle = e.col; g.fillStyle = 'rgba(63,191,63,.18)'; g.lineWidth = 4; g.beginPath(); g.arc(e.x, e.y, e.r * ease(k), 0, TAU); g.fill(); g.stroke(); break;
        case 'pop': text(g, e.s, e.x, e.y - 14 * k, { size: 13, w: 800, col: e.col, stroke: 3, a: 1 - k * k }); break;
        case 'claw': g.globalAlpha = 1 - k; g.strokeStyle = '#e5322d'; g.lineWidth = 3; for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(e.x - 8 + i * 5, e.y - 8); g.lineTo(e.x + 4 + i * 5, e.y + 8); g.stroke(); } break;
        case 'drop': g.globalAlpha = 1 - k * .5; g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(e.x, e.y + 6, 14 * k + 4, 5, 0, 0, TAU); g.fill(); g.fillStyle = '#6a3d7a'; g.beginPath(); g.arc(e.x, e.y - 70 * (1 - k), 8, 0, TAU); g.fill(); break;
        case 'nuke': g.globalAlpha = 1 - k; g.fillStyle = '#ff8a3a'; g.beginPath(); g.arc(e.x, e.y, 150 * ease(clamp(k * 2)), 0, TAU); g.fill(); g.fillStyle = '#fff3c4'; g.beginPath(); g.arc(e.x, e.y, 70 * ease(clamp(k * 2)), 0, TAU); g.fill(); break;
      }
      g.restore();
    });
    g.restore();
    g.strokeStyle = '#cdbf9f'; g.lineWidth = 2; g.beginPath(); g.roundRect(ox, oy, W, H, 10); g.stroke();
    if (f.bomb && f.bomb.done === 'boom' && f.t - f.boom < 2.2) text(g, 'The bomb reached the base', ox + 150, oy + 40, { size: 20, w: 800, col: C.redDk, stroke: 4, a: ph(f.t - f.boom, 0, .2) });
  }

  // ---------- slide: same wave, new answer ----------
  const KEYS = M.KEYS;
  const view = (t, st, tour) => tour ? { m: KEYS[Math.min(KEYS.length - 1, Math.floor(t / SEG))], s: t % SEG } : { m: st.m, s: t % SEG };
  function outcome(f, total) {
    const lost = f.lost, boom = f.bomb && f.bomb.done === 'boom', dis = f.bomb && f.bomb.done === 'disarmed';
    return { lost, hurt: Math.round(f.hurt * 100), boom, dis, total };
  }
  function outChips(g, f, x, y) {
    const o = outcome(f);
    let cx = x;
    cx += chip(g, `Units lost: ${o.lost} of ${f.units.length}`, cx, y, { align: 'left', size: 15, ...(o.lost ? TONE.red : TONE.grey) }) + 8;
    cx += chip(g, `Damage taken: ${o.hurt}%`, cx, y, { align: 'left', size: 15, ...(o.hurt >= 15 ? TONE.red : TONE.grey) }) + 8;
    if (o.boom) chip(g, 'Base hit by the bomb', cx, y, { align: 'left', size: 15, ...TONE.red });
    else if (o.dis) chip(g, 'Bomb disarmed', cx, y, { align: 'left', size: 15, ...TONE.green });
    else if (f.left) chip(g, `Enemies left: ${f.left}`, cx, y, { align: 'left', size: 15, ...TONE.gold });
  }
  scene('mutator-answers', {
    dur: SEG * KEYS.length, loop: SEG,
    state: () => ({ m: 'alien-incubation' }),
    init(s, st, api) {
      const box = $(s, '.ma-pick');
      box.innerHTML = KEYS.map(k => `<button class="btn" data-k="${k}">${MUT[k].name}</button>`).join('');
      $$(box, 'button').forEach(b => b.onclick = () => { api.manual(); st.m = b.dataset.k; st.t = 0; });
      api.st.mark = () => $$(box, 'button').forEach(b => b.classList.toggle('on', !st.tour && b.dataset.k === st.m));
    },
    after(st) { st.mark?.(); },
    draw(g, t, st, tour) {
      const v = view(t, st, tour), mu = MUT[v.m], s = v.s, fade = tour ? ph(s, 0, .35) * (1 - ph(s, SEG - .3, SEG)) : 1;
      // the slide's mutators, in its order
      KEYS.forEach((k, i) => {
        const x = 76 + i * 127, on = k === v.m, y = 50;
        card(g, x, y, 122, 84, { r: 10, lw: 2, shadow: on, fill: on ? C.navy : 'rgba(255,250,240,.7)', edge: on ? C.navy : '#cdbf9f' });
        if (k === 'none') { g.fillStyle = '#2b3566'; g.beginPath(); g.roundRect(x - 21, y - 35, 42, 42, 6); g.fill(); text(g, '—', x, y - 14, { size: 22, w: 800, col: '#d6dbef' }); }
        else pic(g, IMG('mut-' + k), x, y - 14, 42, { round: 6, a: on ? 1 : .55 });
        text(g, MUT[k].name, x, y + 24, { size: MUT[k].name.length > 16 ? 11 : 12, w: 700, col: on ? '#fff' : C.muted });
      });
      // the slide's text for this mutator
      g.save(); g.globalAlpha = fade;
      const lines = wrap(g, mu.text, 0, 0, 900, { size: 16, it: true, draw: false });
      lines.forEach((l, i) => text(g, l, 520, 112 + i * 20 - (lines.length - 1) * 10, { size: 16, it: true, w: 500, col: C.ink }));
      g.restore();
      // the two arenas
      const fl = M.frame(v.m, 'habit', s), fr = M.frame(v.m, 'answer', s);
      text(g, 'Base-mission habit', 18, 148, { align: 'left', size: 17, w: 800, display: true, col: C.ink });
      g.font = '700 14px Jost, sans-serif'; const hw = g.measureText('Let them come, focus the nearest').width + 18;
      chip(g, 'Let them come, focus the nearest', 514 - hw, 148, { align: 'left', size: 14, ...TONE.grey });
      const same = v.m === 'none';
      text(g, same ? 'Same habit' : 'What the mutator asks for', 530, 148, { align: 'left', size: 17, w: 800, display: true, col: same ? C.ink : C.good });
      const ans = v.m === 'none' ? 'Let them come, focus the nearest' : mu.answer; g.font = '700 14px Jost, sans-serif'; const aw = g.measureText(ans).width + 18;
      chip(g, ans, 1026 - aw, 148, { align: 'left', size: 14, ...(v.m === 'none' ? TONE.grey : same ? TONE.gold : TONE.green) });
      arena(g, fl, 14, 164); arena(g, fr, 526, 164);
      outChips(g, fl, 14, 486); outChips(g, fr, 526, 486);
      // the reading
      const k = ph(s, SEG - 2.4, SEG - 1.9);
      if (k > 0) {
        const msg = v.m === 'none' ? ['One habit clears the base wave.', 'Now apply one mutator at a time.']
          : mu.perm ? ['The habit stops working: the mutator changes how you play.', 'That is a permutation.']
          : ['The habit still holds; there is simply more of it to do.', 'That is closer to an escalation.'];
        card(g, 520, 540, 980, 50, { fill: mu.perm === false ? '#fde9b8' : v.m === 'none' ? '#dfe6fb' : '#d8f0df', edge: mu.perm === false ? '#e0a92d' : v.m === 'none' ? '#8ea2e6' : '#5fb47c', a: k, shadow: false });
        g.font = '600 18px Jost, sans-serif'; const w0 = g.measureText(msg[0]).width; g.font = '800 18px Montserrat, Jost, sans-serif'; const w1 = g.measureText(msg[1]).width;
        const x0 = 520 - (w0 + 12 + w1) / 2;
        text(g, msg[0], x0, 540, { size: 18, w: 600, col: C.ink, a: k, align: 'left' });
        text(g, msg[1], x0 + w0 + 12, 540, { size: 18, w: 800, col: C.navy, a: k, align: 'left', display: true });
      } else {
        // legend while the fight plays
        let x = 30;
        [['Player 1', RING[1]], ['Player 2', RING[2]], ['Zerg wave', RING.foe]].forEach(([n, c]) => {
          g.strokeStyle = c; g.lineWidth = 3; g.beginPath(); g.arc(x, 540, 8, 0, TAU); g.stroke();
          text(g, n, x + 14, 540, { align: 'left', size: 14, w: 600, col: C.muted }); x += 110;
        });
        text(g, 'Same squad, same wave, same mutator on both sides. Only the play differs.', 1010, 540, { align: 'right', size: 14, w: 600, col: C.muted });
      }
    },
    side(t, st, tour) {
      const v = view(t, st, tour), mu = MUT[v.m], l = M.run(v.m, 'habit'), r = M.run(v.m, 'answer');
      return {
        stats: `<div class="${l.lost ? 'r' : ''}"><b>${l.lost}</b><span>units lost with the habit</span></div><div class="${r.lost ? 'r' : 'g'}"><b>${r.lost}</b><span>units lost with the answer</span></div>`,
        out: v.m === 'none' ? 'The base mission: the habit works.' : `<b>${mu.name}</b>: ${mu.answer.toLowerCase()}. ${mu.perm ? 'A new behaviour, so a permutation.' : 'The same behaviour, more of it: closer to an escalation.'}`,
      };
    },
  });

  // ---------- slide: a weekly mutation rolls three ----------
  // verdicts: stack (one answer, harder), clash (the answers pull apart), overload (can tip into unwinnable), apart (both apply, unrelated)
  const VERDICT = {
    stack: ['Stacks nicely', TONE.green, 'Some adjustments stack nicely'],
    clash: ['Fights each other', TONE.gold, 'Some fight each other'],
    overload: ['Can be impossible', TONE.red, 'Others create impossible situations for player victory'],
    apart: ['Side by side', TONE.grey, 'Different answers, played at the same time'],
  };
  const A = { ad: 'aggressive-deployment', ai: 'alien-incubation', av: 'avenger', ba: 'barrier', bd: 'black-death', bl: 'blizzard', bb: 'boom-bots' };
  const PAIRS = {
    'ad ai': ['stack', 'Drops die into more Broodlings, front and back: splash covers both.'],
    'ad av': ['stack', 'More bodies around every death: kill the bigger pack together.'],
    'ad ba': ['stack', 'More shields to tag first: same answer, more of it.'],
    'ad bd': ['clash', 'Black Death wants carriers killed at range; drops land them inside your army.'],
    'ad bl': ['apart', 'Turn on the drops, then step out of the storm: two jobs, one at a time.'],
    'ad bb': ['overload', 'One player leaves to disarm while extra units land on the other.'],
    'ai av': ['overload', 'Every death spawns Broodlings next to the pack, and every Broodling death powers it up.'],
    'ai ba': ['clash', 'Barrier wants you to wait; Broodlings never expire, so waiting lets them pile up.'],
    'ai bd': ['apart', 'Pick the carriers off at range, then splash the swarm.'],
    'ai bl': ['apart', 'Splash the swarm and stay out of the storm.'],
    'ai bb': ['clash', 'Broodlings never expire and walk toward your base, right where the bomb reader works.'],
    'av ba': ['clash', 'Avenger wants one burst; Barrier eats the opening burst. New plan: tag, wait, then burst.'],
    'av bd': ['clash', 'Avenger wants the pack dead together; Black Death wants carriers picked off first.'],
    'av bl': ['apart', 'Burst the pack, then step out of the storm.'],
    'av bb': ['apart', 'Burst the pack with one player while the other disarms.'],
    'ba bd': ['apart', 'Tag the shields, then pick the carriers at range.'],
    'ba bl': ['apart', 'Waiting out the shields and dodging the storm both buy time.'],
    'ba bb': ['apart', 'Shields slow the fight while the bomb walks: tight, still fair.'],
    'bd bl': ['clash', 'Dodging the storm bunches your army, and the plague spreads through a bunch.'],
    'bd bb': ['apart', 'The reader keeps away from the carriers while the fighter kills them.'],
    'bl bb': ['overload', 'The storm can freeze the reader halfway through the sequence.'],
  };
  const ABBR = Object.fromEntries(Object.entries(A).map(([a, k]) => [k, a]));
  const pair = (a, b) => { const x = ABBR[a], y = ABBR[b], k = Object.keys(A); const [p, q] = k.indexOf(x) < k.indexOf(y) ? [x, y] : [y, x]; return PAIRS[p + ' ' + q]; };
  const ROLLS = [[A.ad, A.ai, A.bl], [A.av, A.ba, A.bl], [A.ai, A.av, A.ba], [A.bb, A.bl, A.ad]];
  const ROLL = 7.5, POOL = KEYS.slice(1);
  function summary(ms) {
    const vs = [[0, 1], [0, 2], [1, 2]].map(([a, b]) => pair(ms[a], ms[b])[0]);
    if (vs.includes('overload')) return ['Can tip into impossible', 'Cap one of the three, or give the players a tool that answers both.', TONE.red];
    if (vs.includes('clash')) return ['The answers pull apart', 'Players have to invent a combined plan: the week plays like a new enemy.', TONE.gold];
    if (vs.every(v => v === 'stack')) return ['One answer, pushed harder', 'Three mutators, one lesson: this week behaves like an escalation.', TONE.green];
    return ['Separate answers at once', 'More to track, but each lesson still holds on its own.', TONE.grey];
  }
  scene('weekly-mutation', {
    dur: ROLL * ROLLS.length, loop: ROLL,
    state: () => ({ ms: ROLLS[2], n: 0 }),
    init(s, st, api) {
      $(s, '.wm-roll').onclick = () => {
        api.manual(); st.n++;
        let seed = st.n * 7 + 3; const r = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
        const pool = POOL.slice(), pick = [];
        for (let i = 0; i < 3; i++) pick.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
        st.ms = pick; st.t = 0;
      };
    },
    draw(g, t, st, tour) {
      const ri = tour ? Math.min(ROLLS.length - 1, Math.floor(t / ROLL)) : 0, s = tour ? t - ri * ROLL : t % ROLL, ms = tour ? ROLLS[ri] : st.ms;
      // left: the reels and the triangle
      panel(g, 14, 14, 520, 558, { title: tour ? `Weekly mutation ${ri + 1} of ${ROLLS.length}` : 'Weekly mutation' });
      const RX = [124, 274, 424], stop = i => .9 + i * .45;
      RX.forEach((x, i) => {
        const y = 108; card(g, x, y, 120, 104, { fill: '#152044', edge: '#152044', r: 10 });
        g.save(); g.beginPath(); g.roundRect(x - 56, y - 48, 112, 96, 8); g.clip();
        const k = ph(s, 0, stop(i)), spin = (1 - ease(k)) * 22, base = POOL.indexOf(ms[i]);
        for (let j = -1; j <= 1; j++) {
          const pos = base - Math.floor(spin) + j, idx = ((pos % POOL.length) + POOL.length) % POOL.length, dy = (spin % 1) * 96 + j * 96;
          pic(g, IMG('mut-' + POOL[idx]), x, y + dy - 8, 64, { round: 6 });
        }
        g.restore();
        if (s >= stop(i)) text(g, MUT[ms[i]].name, x, y + 64, { size: 14, w: 800, col: C.ink, a: ph(s, stop(i), stop(i) + .2) });
      });
      // triangle
      const P = [[274, 262], [140, 482], [408, 482]], k0 = ph(s, 2.4, 2.8);
      [[0, 1], [0, 2], [1, 2]].forEach(([a, b], n) => {
        const at = 2.6 + n * .5, kk = ease(ph(s, at, at + .4)); if (kk <= 0) return;
        const [v] = pair(ms[a], ms[b]), tone = VERDICT[v][1], [x0, y0] = P[a], [x1, y1] = P[b];
        g.save(); g.strokeStyle = tone.edge; g.lineWidth = 7; g.lineCap = 'round'; if (v === 'apart') g.setLineDash([2, 12]);
        g.beginPath(); g.moveTo(x0, y0); g.lineTo(lerp(x0, x1, kk), lerp(y0, y1, kk)); g.stroke(); g.restore();
        if (kk >= 1) chip(g, VERDICT[v][0], (x0 + x1) / 2 + (n === 2 ? 0 : n === 0 ? -34 : 34), (y0 + y1) / 2 + (n === 2 ? 22 : -4), { size: 13, ...tone });
      });
      P.forEach(([x, y], i) => {
        g.save(); g.globalAlpha = k0;
        card(g, x, y, 84, 84, { fill: '#152044', edge: '#152044', r: 10 }); pic(g, IMG('mut-' + ms[i]), x, y, 70, { round: 6 });
        chip(g, MUT[ms[i]].answer, x, y + 58, { size: 12, ...TONE.blue });
        g.restore();
      });
      // right: the deck's three outcomes, then this week's pairs
      panel(g, 546, 14, 480, 558, { title: 'Can these changes be mixed in meaningful ways?' });
      ['stack', 'clash', 'overload'].forEach((v, i) => {
        const y = 62 + i * 34, [n, tone, q] = VERDICT[v];
        chip(g, n, 566, y, { align: 'left', size: 13, width: 140, ...tone });
        text(g, q, 716, y, { align: 'left', size: 13, w: 500, it: true, col: C.muted });
      });
      text(g, 'Evaluating Enemy Permutations (this deck)', 1010, 162, { align: 'right', size: 11, w: 600, col: C.muted });
      [[0, 1], [0, 2], [1, 2]].forEach(([a, b], n) => {
        const at = 2.6 + n * .5, kk = ph(s, at + .3, at + .7); if (kk <= 0) return;
        const [v, why] = pair(ms[a], ms[b]), tone = VERDICT[v][1], y = 196 + n * 92;
        g.save(); g.globalAlpha = kk;
        card(g, 786, y + 30, 452, 82, { fill: '#fffaf0', edge: tone.edge, r: 10, shadow: false });
        pic(g, IMG('mut-' + ms[a]), 586, y + 12, 26, { round: 4 }); pic(g, IMG('mut-' + ms[b]), 616, y + 12, 26, { round: 4 });
        text(g, `${MUT[ms[a]].name} + ${MUT[ms[b]].name}`, 638, y + 12, { align: 'left', size: 14, w: 800, col: C.ink });
        wrap(g, why, 578, y + 38, 420, { size: 14, w: 500, col: C.ink, lh: 17 });
        g.restore();
      });
      const ks = ph(s, 4.4, 4.9);
      if (ks > 0) {
        const [h, sub, tone] = summary(ms);
        g.save(); g.globalAlpha = ks;
        card(g, 786, 518, 452, 80, { fill: tone.fill, edge: tone.edge, r: 12 });
        text(g, h, 786, 500, { size: 20, w: 800, display: true, col: tone.col });
        wrap(g, sub, 786, 528, 420, { size: 14, w: 600, col: C.ink, align: 'center', lh: 17 });
        g.restore();
      }
    },
    side(t, st, tour) {
      const ri = tour ? Math.min(ROLLS.length - 1, Math.floor(t / ROLL)) : 0, ms = tour ? ROLLS[ri] : st.ms, [h, sub] = summary(ms);
      return { out: `<b>${ms.map(m => MUT[m].name).join(' + ')}</b>: ${h.toLowerCase()}. ${sub}` };
    },
  });
})();
