/* Too Weak to Waste, part two: how power, stakes and type widen a consumable's action triggers.
   tmap:   The Trigger Map. Every moment of a fight is a cell (foe HP left × your HP left). A cell is a trigger when using
           the item raises the win chance by more than loss aversion asks for, and that bar drops as losing costs more.
           Power and stakes both grow the gold area. Model in FIGHT, winP(), STAKES.
   types:  Which Loss Does It Erase? Eight kinds of consumable, each named by the loss it undoes, with when in a fight its
           trigger fires and how power widens it. Sort mode deals sixteen failures to sort into the eight. Data in TYPES, CARDS.
   ladder: Power Is Relative. A water starter from Route 1 to the Champion against the four Gen VII potions. A fixed heal buys
           fewer enemy hits as max HP grows; the Max Potion heals a share, so it keeps its trigger. Data in POT, MILES, hpAt().
   Numbers in FIGHT and the hit size are illustrative. Potion heal amounts are Gen VII onward; ace levels follow FireRed / LeafGreen. */
(function () {
  const { $, $$, canvasDemo, say, ptr } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;
  const W = 1040, H = 585;
  const panel = g => { g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(255,252,244,.8)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill(); };
  const txt = (g, s, x, y, font, col = C.ink, al = 'left') => { g.font = font; g.fillStyle = col; g.textAlign = al; g.textBaseline = 'middle'; g.fillText(s, x, y); };
  const box = (g, x, y, w, h, fill, stroke, r = 10, lw = 2) => { g.beginPath(); g.roundRect(x, y, w, h, r); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); } };
  const wrap = (g, s, x, y, maxW, lh, font, col = C.ink) => {
    g.font = font; let line = '', yy = y;
    s.split(' ').forEach(w => { const t2 = line ? line + ' ' + w : w; if (g.measureText(t2).width > maxW && line) { txt(g, line, x, yy, font, col); line = w; yy += lh; } else line = t2; });
    if (line) txt(g, line, x, yy, font, col); return yy;
  };
  const lc = s2 => s2[0].toLowerCase() + s2.slice(1);
  const pct = v => Math.round(v * 100) + '%';
  const img = src => { const i = new Image(); i.src = src; return i; };
  const pic = (g, im, x, y, s) => { if (im.complete && im.naturalWidth) { g.imageSmoothingEnabled = im.naturalWidth > 100; g.drawImage(im, x - s / 2, y - s / 2, s, s); g.imageSmoothingEnabled = true; } };
  const icon = (g, ic, x, y, s, col) => ic instanceof Image ? pic(g, ic, x, y, s) : GI.draw(g, ic, x, y, s, col);
  const freeOf = (st, btn) => () => { st.tour = false; btn.classList.remove('on'); };
  const apis = {};

  /* ---------- 1: the trigger map ---------- */
  // A fight is a race. Each turn you take FIGHT.hit % of the foe's HP and it takes FIGHT.hit % of yours; you swing first.
  // How the race goes varies by FIGHT.swing turns (your performance on the day). Using the item is a free action.
  const FIGHT = { hit: 12, swing: 1.5, n: 12, value: 1, aversion: 2 };
  const erf = x => { const s = Math.sign(x); x = Math.abs(x); const t = 1 / (1 + .3275911 * x); return s * (1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - .284496736) * t + .254829592) * t * Math.exp(-x * x)); };
  const Phi = z => .5 * (1 + erf(z / Math.SQRT2));
  const winP = (foe, me) => foe <= 0 ? 1 : me <= 0 ? 0 : Phi(((me - foe) / FIGHT.hit + .5) / FIGHT.swing);
  const STAKES = [
    { name: 'Lose a life', game: 'Super Mario World', note: 'restart at the midway gate', L: 2.2, ic: 'heart-plus' },
    { name: 'White out', game: 'Pokémon', note: 'back to the Pokémon Center, half your money gone', L: 3, ic: 'money-stack' },
    { name: 'Drop your souls', game: 'Dark Souls', note: 'run back to the bloodstain or lose them', L: 4, ic: 'drop' },
    { name: 'Run ends', game: 'Hades', note: 'back to the House of Hades, the run’s boons gone', L: 6, ic: 'crowned-skull' },
    { name: 'Gone for good', game: 'Fire Emblem, Classic mode', note: 'that unit never comes back', L: 10, ic: 'broken-heart' },
  ];
  const ITEMS = { bomb: { name: 'Firebomb', ic: 'fire-bomb', col: '#e0a92d', verb: 'throw' }, potion: { name: 'Healing Potion', ic: 'heart-bottle', col: '#e5322d', verb: 'drink' } };
  // the bar a situation has to clear: the item's worth, doubled by loss aversion, against what a loss costs
  const bar = L => FIGHT.aversion * FIGHT.value / L;
  function cell(item, pow, L, foe, me) {
    const keep = winP(foe, me), use = item === 'bomb' ? winP(foe - pow, me) : winP(foe, Math.min(100, me + pow)), d = use - keep;
    const k = d >= bar(L) ? 'trig' : keep >= .5 ? 'won' : d < .1 ? 'lost' : 'maybe';
    return { keep, use, d, k };
  }
  const centre = i => (i + .5) / FIGHT.n * 100;
  function area(item, pow, L) {
    let n = 0; for (let i = 0; i < FIGHT.n; i++) for (let j = 0; j < FIGHT.n; j++) if (cell(item, pow, L, centre(i), centre(FIGHT.n - 1 - j)).k === 'trig') n++;
    return n / (FIGHT.n * FIGHT.n);
  }
  const CURVES = {};
  const curve = (item, si) => CURVES[item + si] ||= Array.from({ length: 31 }, (_, i) => area(item, i * 2, STAKES[si].L));
  const BIN = {
    trig: { fill: '#f2b733', stroke: '#b97d06', name: 'Trigger: use it' },
    maybe: { fill: '#fbeac4', stroke: '#e3c98c', name: 'Helps, not enough' },
    won: { fill: '#dcebe0', stroke: '#b5d3be', name: 'Ahead without it' },
    lost: { fill: '#a9aec4', stroke: '#8a90aa', name: 'Lost either way' },
  };
  const G = { x: 86, y: 64, c: 36 };
  canvasDemo('tmap', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, item: 'bomb', pow: 10, si: 2, pick: [2, 9], hover: null, key: '' };
    const tourBtn = $(s, '.tm-tour'), pIn = $(s, '.tm-pow'), free = freeOf(st, tourBtn);
    pIn.oninput = () => { free(); st.pow = +pIn.value; };
    $$(s, '.tm-item .btn').forEach(b => b.onclick = () => { free(); st.item = b.dataset.i; });
    $$(s, '.tm-stake .btn').forEach(b => b.onclick = () => { free(); st.si = +b.dataset.s; });
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    const at = e => { const p = ptr(cv, e), i = Math.floor((p.x - G.x) / G.c), j = Math.floor((p.y - G.y) / G.c); return i >= 0 && j >= 0 && i < FIGHT.n && j < FIGHT.n ? [i, j] : null; };
    cv.addEventListener('pointermove', e => { st.hover = at(e); cv.style.cursor = st.hover ? 'pointer' : ''; });
    cv.addEventListener('pointerleave', () => { st.hover = null; });
    cv.addEventListener('click', e => { const c = at(e); if (c) { free(); st.pick = c; } });
    const DUR = 30;
    function render() {
      let { item, pow, si, pick } = st; const t = st.t;
      if (st.tour) {
        if (t < 10) { item = 'bomb'; si = 2; pow = Math.round(lerp(4, 56, ease(clamp((t - 1.5) / 6.5)))); pick = [3, 10]; }
        else if (t < 16) { item = 'potion'; si = 2; pow = Math.round(lerp(10, 50, ease(clamp((t - 11) / 4)))); pick = [5, 8]; }
        else { item = 'bomb'; pow = 30; si = clamp(Math.floor((t - 16.5) / 2.6), 0, 4); pick = [4, 8]; }
        pIn.value = pow;
      }
      const L = STAKES[si].L, it = ITEMS[item], N = FIGHT.n;
      $$(s, '.tm-item .btn').forEach(b => b.classList.toggle('on', b.dataset.i === item));
      $$(s, '.tm-stake .btn').forEach(b => b.classList.toggle('on', +b.dataset.s === si));
      T.use(g); panel(g);
      txt(g, `Every moment of a fight, and whether the ${it.name} ${item === 'bomb' ? 'turns it' : 'turns it'} into a win`, 26, 30, '800 19px Montserrat');
      // the grid
      let trig = 0; const cells = [];
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
        const c = cell(item, pow, L, centre(i), centre(N - 1 - j)); cells.push([i, j, c]); if (c.k === 'trig') trig++;
        const b = BIN[c.k]; box(g, G.x + i * G.c + 1.5, G.y + j * G.c + 1.5, G.c - 3, G.c - 3, b.fill, b.stroke, 5, 1.2);
      }
      const show = st.hover || pick;
      [[pick, C.navy, 3.5], [st.hover, C.blue, 2.5]].forEach(([p, col, lw]) => { if (p) { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.roundRect(G.x + p[0] * G.c - 1, G.y + p[1] * G.c - 1, G.c + 2, G.c + 2, 7); g.stroke(); } });
      // axes
      const gw = G.c * N;
      txt(g, '0%', G.x, G.y + gw + 14, '600 13px Jost', C.muted, 'left'); txt(g, '100%', G.x + gw, G.y + gw + 14, '600 13px Jost', C.muted, 'right');
      txt(g, 'Foe HP left  →', G.x + gw / 2, G.y + gw + 16, '700 15px Jost', C.ink, 'center');
      GI.draw(g, 'dragon-head', G.x + gw - 70, G.y + gw + 16, 20, C.redDk);
      g.save(); g.translate(G.x - 30, G.y + gw / 2); g.rotate(-Math.PI / 2); txt(g, 'Your HP left  →', 0, 0, '700 15px Jost', C.ink, 'center'); g.restore();
      txt(g, '100%', G.x - 6, G.y + 8, '600 13px Jost', C.muted, 'right'); txt(g, '0%', G.x - 6, G.y + gw - 8, '600 13px Jost', C.muted, 'right');
      // legend
      let lx = 30; Object.values(BIN).forEach(b => { box(g, lx, 548, 18, 18, b.fill, b.stroke, 4, 1.2); txt(g, b.name, lx + 24, 557, '600 13px Jost', C.ink); lx += 24 + g.measureText(b.name).width + 16; });
      // the moment you picked
      const R = 560, [pi, pj] = show, c = cell(item, pow, L, centre(pi), centre(N - 1 - pj)), foe = centre(pi), me = centre(N - 1 - pj);
      box(g, R, 52, 456, 206, 'rgba(21,32,68,.05)', null, 12);
      txt(g, st.hover ? 'This moment' : 'The moment you picked', R + 16, 72, '700 14px Jost', C.muted);
      GI.draw(g, 'dragon-head', R + 40, 112, 46, C.redDk);
      box(g, R + 72, 104, 140, 12, '#e8dcc0', null, 4); g.fillStyle = '#e5322d'; g.fillRect(R + 72, 104, 140 * foe / 100, 12);
      if (item === 'bomb') { g.fillStyle = 'rgba(224,169,45,.85)'; g.fillRect(R + 72 + 140 * Math.max(0, foe - pow) / 100, 104, 140 * Math.min(pow, foe) / 100, 12); }
      txt(g, `Foe ${Math.round(foe)}%`, R + 72, 130, '600 13px Jost', C.muted);
      GI.draw(g, 'visored-helm', R + 260, 112, 40, C.player);
      box(g, R + 288, 104, 140, 12, '#e8dcc0', null, 4); g.fillStyle = '#2fae63'; g.fillRect(R + 288, 104, 140 * me / 100, 12);
      if (item === 'potion') { g.fillStyle = 'rgba(224,169,45,.85)'; g.fillRect(R + 288 + 140 * me / 100, 104, 140 * Math.min(pow, 100 - me) / 100, 12); }
      txt(g, `You ${Math.round(me)}%`, R + 288, 130, '600 13px Jost', C.muted);
      [['Keep it', c.keep, '#8a90aa'], [`${it.verb[0].toUpperCase() + it.verb.slice(1)} it now`, c.use, '#e0a92d']].forEach(([n, v, col], i) => {
        const y = 160 + i * 30; txt(g, n, R + 16, y, '700 15px Jost'); box(g, R + 130, y - 9, 220, 18, '#efe4cc', null, 6);
        g.fillStyle = col; g.beginPath(); g.roundRect(R + 130, y - 9, Math.max(6, 220 * v), 18, 6); g.fill(); txt(g, `${pct(v)} win`, R + 362, y, '700 15px Jost');
      });
      const need = bar(L);
      txt(g, `Gain ${c.d >= 0 ? '+' : ''}${Math.round(c.d * 100)} points · this death needs +${Math.round(Math.min(1, need) * 100)}`, R + 16, 226, '600 15px Jost', C.muted);
      T.stamp(BIN[c.k].name, R + 360, 72, c.k === 'trig' ? '#b97d06' : c.k === 'maybe' ? '#9a7a2a' : C.stoneDk, 1, 16);
      // trigger area
      const a = trig / (N * N);
      txt(g, pct(a), R, 300, '800 54px Montserrat', a > 0 ? '#b97d06' : C.stoneDk);
      txt(g, 'of all moments are triggers', R + 128, 290, '700 16px Jost');
      txt(g, `${it.name} at ${pow}% power`, R + 128, 312, '600 14px Jost', C.muted); txt(g, `Death: ${STAKES[si].name.toLowerCase()} (${STAKES[si].game})`, R + 128, 332, '600 14px Jost', C.muted);
      // trigger area against power, one line per death penalty
      const cx = R + 40, cy = 372, cw = 330, ch = 150, mx = 60, my = .6;
      box(g, R, cy - 18, 456, ch + 64, 'rgba(21,32,68,.04)', null, 12);
      txt(g, 'Trigger area as power grows', R + 16, cy - 2, '700 14px Jost', C.muted);
      const X = p => cx + cw * p / mx, Y = v => cy + 16 + ch - ch * Math.min(v, my) / my;
      g.strokeStyle = '#d9cdb1'; g.lineWidth = 1; [0, .2, .4, .6].forEach(v => { g.beginPath(); g.moveTo(cx, Y(v)); g.lineTo(cx + cw, Y(v)); g.stroke(); txt(g, pct(v), cx - 6, Y(v), '600 11px Jost', C.muted, 'right'); });
      [0, 20, 40, 60].forEach(p => txt(g, p + '%', X(p), cy + ch + 28, '600 11px Jost', C.muted, 'center'));
      STAKES.forEach((sk, k) => {
        const cu = curve(item, k), on = k === si;
        g.strokeStyle = on ? '#b97d06' : 'rgba(93,97,140,.35)'; g.lineWidth = on ? 3.5 : 1.5; g.beginPath();
        cu.forEach((v, i) => i ? g.lineTo(X(i * 2), Y(v)) : g.moveTo(X(0), Y(v))); g.stroke();
        txt(g, ['Mario', 'Pokémon', 'Dark Souls', 'Hades', 'Fire Emblem'][k], X(60) + 6, Y(cu[30]) + [6, 0, 0, 0, -4][k], on ? '700 12px Jost' : '600 11px Jost', on ? '#b97d06' : C.muted);
      });
      g.fillStyle = C.navy; g.beginPath(); g.arc(X(Math.min(pow, 60)), Y(a), 6, 0, Math.PI * 2); g.fill();
      $(s, '.tm-pv').textContent = pow + '%';
      const key = [item, pow, si].join(); if (key === st.key) return; st.key = key;
      const area5 = area(item, 5, L);
      say($(s, '.tm-out'), a === 0
        ? `At ${pow}% the ${it.name} never clears the bar: no moment in the whole fight says “${it.verb} it now.” It stays in the bag.`
        : `At ${pow}%, ${pct(a)} of moments are triggers${pow > 5 ? ` (a 5% ${it.name.toLowerCase()} gets ${pct(area5)})` : ''}. ${si < 2 ? 'With a cheap death, only near-certain flips are worth it.' : si > 2 ? 'Losing costs so much that smaller gains are worth spending on.' : 'Power adds whole regions of moments where using it makes sense.'}`);
    }
    apis.tmap = { seek(t) { st.held = st.tour = true; st.t = t; render(); }, dur: () => DUR };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > DUR) st.t = 0; render(); };
  });

  /* ---------- 2: which loss does it erase? ---------- */
  const I = {
    wow: img('img/wow-super-healing-potion.jpg'), potion: img('img/it-potion.png'), master: img('img/pk-master-ball.png'), rope: img('img/it-escape-rope.png'),
    ward: img('img/lol-control-ward.png'), revive: img('img/it-revive.png'), candy: img('img/it-rare-candy.png'),
  };
  // when the trigger fires, over one fight: 0-.2 before, .2-.65 the fight, .65-.85 losing, .85-1 after the loss
  const bump = (x, c, w) => Math.exp(-(((x - c) / w) ** 2));
  const TYPES = [
    { k: 'sustain', name: 'Sustain', erases: 'Ran out of HP', ic: I.wow, col: '#e5322d',
      ex: [[I.wow, 'Healing potions', 'World of Warcraft'], ['heart-bottle', 'Estus Flask', 'Dark Souls'], [I.potion, 'Potion', 'Pokémon']],
      when: 'Often and in small doses, all through the fight.', power: 'A bigger heal opens the window earlier: drink while the danger is still building, not only at a sliver of HP.',
      shape: x => x > .2 && x < .85 ? (Math.sin(x * 70) > .55 ? .95 : .2) : 0 },
    { k: 'burst', name: 'Burst', erases: 'Ran out of damage or time', ic: 'fire-bomb', col: '#e0a92d',
      ex: [['fire-bomb', 'Firebomb', 'Dark Souls'], ['drop', 'Holy Water', 'Castlevania'], ['unlit-bomb', 'Bomb', 'The Legend of Zelda']],
      when: 'Near the end, when the foe is almost down.', power: 'More damage finishes foes with more HP left, so the bomb wins fights from further out.',
      shape: x => x > .2 && x < .85 ? clamp((x - .4) / .3) : 0 },
    { k: 'prep', name: 'Preparation', erases: 'Came in too weak for this one fight', ic: 'round-bottom-flask', col: '#c2410c',
      ex: [['round-bottom-flask', 'Flasks and elixirs', 'World of Warcraft'], ['meat', 'A canteen meal before the hunt', 'Monster Hunter'], ['drop', 'Charcoal Pine Resin', 'Dark Souls']],
      when: 'Before the fight, on a guess: you commit before you know whether you would lose without it.', power: 'A bigger buff covers more of the fights you might lose. Knowing the fight ahead (a boss you have already seen) is what makes the guess sure enough to drink.',
      shape: x => x < .2 ? 1 : x < .85 ? .22 : 0 },
    { k: 'cert', name: 'Certainty', erases: 'The dice took it away', ic: I.master, col: C.purple,
      ex: [[I.master, 'Master Ball', 'Pokémon'], ['crosshair', 'X Accuracy', 'Pokémon'], ['missile-swarm', 'Wand of Magic Missile', 'Pathfinder']],
      when: 'At the one roll that decides the outcome.', power: 'A guarantee covers more targets: the Master Ball catches anything, and a wand that never misses finishes anything at 6 HP or less.',
      shape: x => x > .2 && x < .85 ? Math.max(bump(x, .45, .025), bump(x, .76, .025)) : 0 },
    { k: 'escape', name: 'Escape', erases: 'The fight is already lost', ic: I.rope, col: C.stoneDk,
      ex: [[I.rope, 'Escape Rope', 'Pokémon'], ['steam', 'Smoke bomb', 'Monster Hunter'], ['house', 'Hearthstone', 'World of Warcraft']],
      when: 'Only once losing is clear, and only with something worth saving.', power: 'A surer escape works from worse spots: out of a boss arena, not only a random encounter.',
      shape: x => x >= .65 && x < .85 ? 1 : 0 },
    { k: 'info', name: 'Information', erases: 'You didn’t know', ic: I.ward, col: C.blue,
      ex: [[I.ward, 'Control Ward', 'League of Legends'], ['book-cover', 'Scroll of Identify', 'Diablo'], ['magnifying-glass', 'Scouting', 'many RPGs']],
      when: 'Before the fight, when you choose where to go and what to bring.', power: 'More range or a longer duration reveals more of the ambushes and weaknesses that decide fights.',
      shape: x => x < .2 ? 1 : x < .32 ? .35 : 0 },
    { k: 'ins', name: 'Insurance', erases: 'You died', ic: I.revive, col: C.good,
      ex: [[I.revive, 'Revive', 'Pokémon'], ['heart-beats', 'Phoenix Down', 'Final Fantasy'], ['heart-bottle', 'Fairy in a bottle', 'The Legend of Zelda']],
      when: 'After the loss: the one moment with no doubt left.', power: 'A fuller revive brings you back ready to fight, not one hit from falling again.',
      shape: x => x >= .85 ? 1 : 0 },
    { k: 'conv', name: 'Conversion', erases: 'You weren’t strong enough yet', ic: I.candy, col: C.goldInk,
      ex: [[I.candy, 'Rare Candy', 'Pokémon'], ['book-cover', 'XP tome', 'many RPGs'], ['rocket', 'Level boost', 'Dan’s level-10 example']],
      when: 'Any time, but worth less the longer you wait.', power: 'A bigger boost stays ahead of natural growth for longer, so it still matters later in the game.',
      shape: x => .15 + .8 * (1 - x) },
  ];
  const CARDS = [
    ['prep', 'Pulled a boss you knew was hard without drinking the damage flask, and fell short of its enrage timer.'],
    ['sustain', 'Worn down over five fights in a row, with nothing left for the sixth.'],
    ['burst', 'Fell to the boss with 4% of its HP left.'],
    ['cert', 'Raikou broke out of the ball and fled.'],
    ['info', 'Walked into an ambush hiding in the river brush.'],
    ['escape', 'A wipe you could see coming, deep in a cave with three hours of loot.'],
    ['ins', 'A trap killed you one room from the exit. Back to the last save.'],
    ['conv', 'Five levels behind the gym leader’s team.'],
    ['burst', 'The boss enraged at 10% and wiped the party before it went down.'],
    ['sustain', 'Took one hit too many while the healer was busy.'],
    ['info', 'Brought fire to a boss that turned out to be immune to fire.'],
    ['cert', 'Missed the last swing on a foe at 2 HP, and it struck down the cleric.'],
    ['ins', 'The healer fell in the first ten seconds, then everyone else.'],
    ['escape', 'Cornered by a foe you could never outfight.'],
    ['conv', 'A new recruit joins at level 12 when the rest of the party is 30.'],
    ['prep', 'Walked into the dragon’s lair without the fire-resistance elixir you were carrying.'],
  ];
  const TT = { x: 26, y: 54, w: 118, h: 250, gap: 6 };
  canvasDemo('types', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, mode: 'explore', sel: 0, hover: -1, card: 0, tries: 0, right: 0, done: [], miss: -1, missT: 0, key: '' };
    const tourBtn = $(s, '.ty-tour'), free = freeOf(st, tourBtn);
    const reset = () => { st.card = 0; st.tries = 0; st.right = 0; st.done = []; st.miss = -1; };
    $$(s, '.ty-mode .btn').forEach(b => b.onclick = () => { free(); st.mode = b.dataset.m; reset(); st.key = ''; });
    $(s, '.ty-reset').onclick = () => { free(); reset(); st.key = ''; };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; st.mode = 'explore'; tourBtn.classList.add('on'); };
    const at = e => { const p = ptr(cv, e); if (p.y < TT.y || p.y > TT.y + TT.h) return -1; const i = Math.floor((p.x - TT.x) / (TT.w + TT.gap)); return i >= 0 && i < TYPES.length && p.x - TT.x - i * (TT.w + TT.gap) <= TT.w ? i : -1; };
    cv.addEventListener('pointermove', e => { st.hover = at(e); cv.style.cursor = st.hover >= 0 ? 'pointer' : ''; });
    cv.addEventListener('pointerleave', () => { st.hover = -1; });
    cv.addEventListener('click', e => {
      const i = at(e); if (i < 0) return; free();
      if (st.mode === 'explore') { st.sel = i; return; }
      if (st.card >= CARDS.length) return;
      if (TYPES[i].k === CARDS[st.card][0]) { if (!st.tries) st.right++; st.done.push(i); st.card++; st.tries = 0; st.miss = -1; }
      else { st.tries++; st.miss = i; st.missT = st.t; }
      st.key = '';
    });
    const DUR = TYPES.length * 3.2;
    function tile(i, sel, ty) {
      const x = TT.x + i * (TT.w + TT.gap), y = TT.y, shake = st.miss === i ? Math.sin((st.t - st.missT) * 40) * 5 * clamp(1 - (st.t - st.missT) * 2) : 0;
      box(g, x + shake, y, TT.w, TT.h, sel ? '#fffaf0' : 'rgba(255,250,240,.6)', sel ? ty.col : st.hover === i ? C.blue : '#cdbf9f', 12, sel ? 4 : 2);
      icon(g, ty.ic, x + TT.w / 2 + shake, y + 44, 50, ty.col);
      txt(g, ty.name, x + TT.w / 2 + shake, y + 94, '800 15px Montserrat', C.ink, 'center');
      txt(g, 'erases', x + TT.w / 2, y + 116, '600 12px Jost', C.muted, 'center');
      g.textAlign = 'center'; const words = ty.erases; g.font = '700 14px Jost';
      const lines = []; let ln = ''; words.split(' ').forEach(w => { const t2 = ln ? ln + ' ' + w : w; if (g.measureText(t2).width > TT.w - 16 && ln) { lines.push(ln); ln = w; } else ln = t2; }); lines.push(ln);
      lines.forEach((l, k) => txt(g, l, x + TT.w / 2, y + 134 + k * 17, '700 14px Jost', ty.col === C.stoneDk ? C.ink : ty.col, 'center'));
      // when its trigger fires
      const sx = x + 10, sw = TT.w - 20, sy = y + 182;
      box(g, sx, sy, sw, 26, '#efe4cc', null, 5);
      for (let p = 0; p < sw; p++) { const v = ty.shape(p / sw); if (v > 0) { g.fillStyle = ty.col; g.globalAlpha = v; g.fillRect(sx + p, sy + 26 - 24 * v, 1.2, 24 * v); } }
      g.globalAlpha = 1;
      [.2, .65, .85].forEach(f => { g.strokeStyle = 'rgba(21,32,68,.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(sx + sw * f, sy - 2); g.lineTo(sx + sw * f, sy + 28); g.stroke(); });
      txt(g, 'before', sx, sy + 38, '600 11px Jost', C.muted, 'left'); txt(g, 'after', sx + sw, sy + 38, '600 11px Jost', C.muted, 'right');
      // cards sorted here
      const got = st.done.filter(d => d === i).length;
      for (let k = 0; k < 2; k++) box(g, x + TT.w / 2 - 26 + k * 28, y + 226, 22, 14, k < got ? ty.col : null, k < got ? null : '#cdbf9f', 3, 1.5);
    }
    function render() {
      let { mode, sel } = st;
      if (st.tour) { mode = 'explore'; sel = Math.floor(st.t / 3.2) % TYPES.length; }
      $$(s, '.ty-mode .btn').forEach(b => b.classList.toggle('on', b.dataset.m === mode));
      T.use(g); panel(g);
      txt(g, mode === 'explore' ? 'Eight kinds of consumable, named by the loss each one erases' : 'Which kind would have erased this loss? Click it.', 26, 30, '800 19px Montserrat');
      TYPES.forEach((ty, i) => tile(i, mode === 'explore' ? i === sel : false, ty));
      const by = 324;
      box(g, 26, by, 988, 238, 'rgba(21,32,68,.05)', null, 12);
      if (mode === 'explore') {
        const ty = TYPES[sel];
        icon(g, ty.ic, 74, by + 52, 64, ty.col);
        txt(g, ty.name, 120, by + 38, '800 24px Montserrat'); txt(g, `erases: ${lc(ty.erases)}`, 120, by + 66, '700 16px Jost', ty.col === C.stoneDk ? C.ink : ty.col);
        txt(g, 'Its trigger', 46, by + 110, '700 14px Jost', C.muted); wrap(g, ty.when, 46, by + 134, 420, 22, '600 17px Jost');
        txt(g, 'How power widens it', 46, by + 176, '700 14px Jost', C.muted); wrap(g, ty.power, 46, by + 200, 440, 22, '600 16px Jost');
        txt(g, 'In real games', 530, by + 30, '700 14px Jost', C.muted);
        ty.ex.forEach(([ic, n, game], k) => {
          const y = by + 72 + k * 56; box(g, 530, y - 24, 460, 48, '#fffaf0', '#e3d8bf', 10, 1.5);
          icon(g, ic, 562, y, 36, ty.col); txt(g, n, 594, y - 8, '700 17px Jost'); txt(g, game, 594, y + 12, '600 14px Jost', C.muted);
        });
      } else if (st.card < CARDS.length) {
        const [k, text] = CARDS[st.card];
        txt(g, `Loss ${st.card + 1} of ${CARDS.length}`, 46, by + 30, '700 14px Jost', C.muted);
        GI.draw(g, 'skull-crossed-bones', 90, by + 110, 70, '#b0423b');
        wrap(g, `“${text}”`, 150, by + 92, 560, 30, '700 23px Jost');
        if (st.miss >= 0) wrap(g, `Not that one: ${TYPES[st.miss].name} erases “${lc(TYPES[st.miss].erases)}.” Which loss is this?`, 150, by + 176, 560, 22, '600 16px Jost', C.redDk);
        CARDS.forEach((c, i) => box(g, 730 + (i % 8) * 32, by + 60 + Math.floor(i / 8) * 40, 26, 32, i < st.card ? TYPES[st.done[i]].col : i === st.card ? '#fffaf0' : null, i === st.card ? C.navy : '#cdbf9f', 4, i === st.card ? 3 : 1.5));
        txt(g, `${st.right} right on the first try`, 730, by + 160, '700 15px Jost');
      } else {
        T.stamp(`${st.right} of ${CARDS.length} on the first try`, 520, by + 80, C.good, 1, 28);
        wrap(g, 'Every kind owns a different moment: information and preparation before the fight, sustain and burst during it, escape once it is lost, insurance after. Choosing a type chooses which situations the item will own.', 80, by + 150, 880, 26, '600 18px Jost');
      }
      const key = [mode, sel, st.card, st.miss].join(); if (key === st.key) return; st.key = key;
      say($(s, '.ty-out'), mode === 'explore'
        ? `<b>${TYPES[sel].name}</b>: ${TYPES[sel].when} ${TYPES[sel].power}`
        : st.card < CARDS.length ? 'Each loss was erasable by exactly one kind of item. Click the kind that would have turned it around.' : 'Done. Press Reset to sort the run again.');
    }
    apis.types = { seek(t) { st.held = st.tour = true; st.t = t; render(); }, dur: () => DUR };
    return dt => { st.t += Math.max(0, st.held ? 0 : dt); if (st.tour && st.t > DUR) st.t = 0; render(); };
  });

  /* ---------- 3: power is relative ---------- */
  // Gen III onward: HP = floor((2·base + IV + EV/4) · L / 100) + L + 10. IV 15, no EVs.
  const LINE = [[1, 44, 'Squirtle', 7], [16, 59, 'Wartortle', 8], [36, 79, 'Blastoise', 9]];
  const form = L => LINE.filter(f => L >= f[0]).pop();
  const hpAt = L => Math.floor((2 * form(L)[1] + 15) * L / 100) + L + 10;
  const HIT = .38; // an even-level foe's hit takes about this share of your max HP (illustrative)
  const POT = [
    { name: 'Potion', heal: 20, im: img('img/it-potion.png'), col: '#8a4fd6', sold: 5 },
    { name: 'Super Potion', heal: 60, im: img('img/it-super-potion.png'), col: '#e5322d', sold: 14 },
    { name: 'Hyper Potion', heal: 120, im: img('img/it-hyper-potion.png'), col: '#e0a92d', sold: 29 },
    { name: 'Max Potion', heal: Infinity, im: img('img/it-max-potion.png'), col: '#2ea3dc', sold: 47 },
  ];
  const healAt = (p, L) => Math.min(p.heal, hpAt(L));
  const hits = (p, L) => healAt(p, L) / (HIT * hpAt(L));
  const MILES = [[5, 'Route 1', 16], [14, 'Brock', 95], [21, 'Misty', 121], [24, 'Lt. Surge', 26], [29, 'Erika', 45], [43, 'Koga', 110], [47, 'Blaine', 59], [50, 'Giovanni', 112], [54, 'Lorelei', 131], [63, 'Champion', 3]];
  const PK = {}; [7, 8, 9, ...MILES.map(m => m[2])].forEach(n => PK[n] = img(`img/pk-${n}.png`));
  canvasDemo('ladder', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, lvl: 5, shop: true, key: '' };
    const tourBtn = $(s, '.la-tour'), lIn = $(s, '.la-lvl'), sIn = $(s, '.la-shop'), free = freeOf(st, tourBtn);
    lIn.oninput = () => { free(); st.lvl = +lIn.value; };
    sIn.onchange = () => { free(); st.shop = sIn.checked; };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    const DUR = 20;
    function render() {
      let { lvl, shop } = st; const t = st.t;
      if (st.tour) { shop = true; lvl = Math.round(lerp(5, 63, ease(clamp((t - 1.5) / 14)))); lIn.value = lvl; sIn.checked = shop; }
      const hp = hpAt(lvl), hit = Math.round(HIT * hp), mile = MILES.filter(m => m[0] <= lvl).pop(), me = form(lvl);
      T.use(g); panel(g);
      txt(g, 'The same four potions, from Route 1 to the Champion', 26, 30, '800 19px Montserrat');
      // the matchup
      box(g, 26, 52, 470, 150, 'rgba(21,32,68,.05)', null, 12);
      pic(g, PK[me[3]], 92, 122, 110); pic(g, PK[mile[2]], 430, 112, 96);
      txt(g, `${me[2]}, level ${lvl}`, 150, 82, '800 18px Montserrat');
      txt(g, `vs ${mile[1]}${mile[1] === 'Route 1' ? '’s wild Pokémon' : '’s ace'}`, 150, 106, '600 15px Jost', C.muted);
      const bx = 150, bw = 230;
      box(g, bx, 128, bw, 16, '#e8dcc0', null, 6); g.fillStyle = '#2fae63'; g.beginPath(); g.roundRect(bx, 128, bw, 16, 6); g.fill();
      g.fillStyle = '#e5322d'; g.fillRect(bx + bw * (1 - HIT), 128, bw * HIT, 16);
      txt(g, `${hp} HP · one enemy hit (red) ≈ ${hit} HP`, bx, 162, '700 15px Jost');
      // each potion: how many enemy hits it undoes
      txt(g, 'Enemy hits each potion undoes', 26, 230, '700 15px Jost', C.muted);
      POT.forEach((p, i) => {
        const y = 266 + i * 52, h2 = hits(p, lvl), sold = !shop || lvl >= p.sold, x0 = 120, sc = 80;
        g.globalAlpha = sold ? 1 : .35;
        pic(g, p.im, 44, y, 34); txt(g, p.name, 70, y - 9, '700 15px Jost'); txt(g, p.heal === Infinity ? 'full heal' : `${p.heal} HP`, 70, y + 11, '600 13px Jost', C.muted);
        box(g, x0 + 60, y - 10, sc * 3, 20, '#efe4cc', null, 6);
        g.fillStyle = h2 >= 1 ? p.col : '#a9aec4'; g.beginPath(); g.roundRect(x0 + 60, y - 10, Math.max(5, sc * Math.min(3, h2)), 20, 6); g.fill();
        g.strokeStyle = C.navy; g.lineWidth = 2; g.setLineDash([4, 3]); g.beginPath(); g.moveTo(x0 + 60 + sc, y - 15); g.lineTo(x0 + 60 + sc, y + 15); g.stroke(); g.setLineDash([]);
        txt(g, sold ? h2.toFixed(1) : 'not sold yet', x0 + 60 + sc * 3 + 10, y, sold ? '800 16px Montserrat' : '700 13px Jost', h2 >= 1 && sold ? C.ink : C.muted);
        g.globalAlpha = 1;
      });
      txt(g, '↑ 1 hit: survives the next blow', 120 + 60 + 80, 456, '600 12px Jost', C.navy, 'center');
      // the chart: hits undone against level
      const cx = 560, cy = 70, cw = 440, ch = 300, X = L => cx + cw * (L - 5) / 60, Y = v => cy + ch - ch * Math.min(v, 3) / 3;
      box(g, cx - 40, 52, 494, 400, 'rgba(21,32,68,.04)', null, 12);
      [0, 1, 2, 3].forEach(v => { g.strokeStyle = v === 1 ? C.navy : '#d9cdb1'; g.lineWidth = v === 1 ? 2 : 1; g.setLineDash(v === 1 ? [6, 4] : []); g.beginPath(); g.moveTo(cx, Y(v)); g.lineTo(cx + cw, Y(v)); g.stroke(); g.setLineDash([]); txt(g, v === 3 ? '3+' : String(v), cx - 6, Y(v), '600 12px Jost', C.muted, 'right'); });
      g.fillStyle = 'rgba(169,174,196,.18)'; g.fillRect(cx, Y(1), cw, ch - (Y(1) - cy));
      txt(g, 'below 1 hit: you still faint, so it is no trigger', cx + cw - 6, Y(.12), '600 12px Jost', C.stoneDk, 'right');
      POT.forEach(p => {
        g.strokeStyle = p.col; g.lineWidth = 3; g.beginPath(); let started = false;
        for (let L = 5; L <= 65; L++) { if (shop && L < p.sold) continue; const v = hits(p, L); started ? g.lineTo(X(L), Y(v)) : g.moveTo(X(L), Y(v)); started = true; }
        g.stroke();
      });
      MILES.forEach(([L, n, d], i) => { g.strokeStyle = 'rgba(21,32,68,.15)'; g.lineWidth = 1; g.beginPath(); g.moveTo(X(L), cy); g.lineTo(X(L), cy + ch + (i % 2 ? 30 : 6)); g.stroke(); pic(g, PK[d], X(L), cy + ch + (i % 2 ? 44 : 20), 32); });
      txt(g, 'enemy hits undone', cx, cy - 10, '700 13px Jost', C.muted);
      g.strokeStyle = C.navy; g.lineWidth = 3; g.beginPath(); g.moveTo(X(lvl), cy - 6); g.lineTo(X(lvl), cy + ch + 4); g.stroke();
      txt(g, `Lv ${lvl}`, X(lvl), cy - 12, '800 13px Montserrat', C.navy, 'center');
      txt(g, 'level →', cx + cw, cy + ch + 64, '600 12px Jost', C.muted, 'right');
      // verdict
      const dead = POT.filter(p => (!shop || lvl >= p.sold) && hits(p, lvl) < 1).map(p => p.name);
      T.stamp(dead.length ? `${dead.join(', ')}: too weak to waste` : 'Every potion in the shop still saves you', 520, 520, dead.length ? C.stoneDk : C.good, 1, 22);
      txt(g, 'Heal amounts: Gen VII onward. Ace levels: FireRed / LeafGreen. Hit size and shop levels are illustrative.', 520, 566, '600 12px Jost', C.muted, 'center');
      $(s, '.la-lv').textContent = `${lvl} (${mile[1]})`;
      const key = [lvl, shop].join(); if (key === st.key) return; st.key = key;
      const pot = hits(POT[0], lvl);
      say($(s, '.la-out'), pot >= 1
        ? `At level ${lvl} a Potion still undoes ${pot.toFixed(1)} enemy hits, so it pulls a Pokémon back from fainting.`
        : `At level ${lvl} a Potion undoes only ${pot.toFixed(1)} of a hit: drink it at low HP and you faint anyway. The Max Potion heals a share, not a number, so it still undoes ${hits(POT[3], lvl).toFixed(1)}.`);
    }
    apis.ladder = { seek(t) { st.held = st.tour = true; st.t = t; render(); }, dur: () => DUR };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > DUR) st.t = 0; render(); };
  });

  // consumables.js already set window.__seek for its own three; chain to it
  const prevSeek = window.__seek, prevDur = window.__dur;
  window.__seek = (t, w) => apis[w] ? apis[w].seek(t) : prevSeek(t, w);
  window.__dur = w => apis[w] ? apis[w].dur() : prevDur(w);
})();
