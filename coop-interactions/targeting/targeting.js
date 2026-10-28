/* Teamplay targeting matrix (MGM C3 M6, deck slides 116-133 and 161-171). Pick a mechanic and walk it through every
   source (who does it) and target (to whom): each cell becomes a concrete ability, drawn as a tiny scene. The deck's
   own fire walkthrough (fireball, pool of flames, Hellfire, cauterize, slides 120-124) comes first, then the other
   twelve cells. Abilities live in IDEAS; card(g, t, ...) draws one as a pure function of time, so the walkthrough,
   the title loop and window.__seek (for the GIF) all show the same thing. Slide 3 is slides 161-171. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;
  const KEYS = ['S', 'A', 'E', 'W'], WHO = { S: 'Self', A: 'Ally', E: 'Enemy', W: 'Environment' };
  const MECH = {
    fire: { name: 'Fire', icon: '🔥', col: '#e8641c', rgb: '232,100,28' },
    heal: { name: 'Heal', icon: '💚', col: '#1f9d55', rgb: '31,157,85' },
    shield: { name: 'Shield', icon: '🛡️', col: '#3c8ce6', rgb: '60,140,230' },
  };
  // IDEAS[mechanic][source + target] = [name, one line, fx, world object (for Environment), from the deck?]
  const IDEAS = {
    fire: {
      SS: ['Hellfire', 'Wreathe yourself in flames: everything near you burns, and so do you.', 'aura', '', 1],
      SA: ['Cauterize', 'Sear an ally’s wound shut: removes bleeds and poisons, at the cost of a little health.', 'beam', '', 1],
      SE: ['Fireball', 'Hurl a ball of fire at an enemy.', 'bolt', '', 1],
      SW: ['Pool of Flames', 'Set the ground ablaze. Anything that walks through it burns.', 'zone', '', 1],
      AS: ['Flame Weapon', 'An ally coats your weapon in fire, so your hits burn.', 'beam'],
      AA: ['Torch Relay', 'One ally lights another’s torch: the only light in a dark dungeon.', 'beam'],
      AE: ['Flare', 'An ally marks an enemy with fire: everyone’s hits on it burn hotter.', 'mark'],
      AW: ['Firewall', 'An ally raises a wall of fire you can fight behind.', 'wall'],
      ES: ['Immolate', 'An enemy sets you alight. Put it out, or keep burning.', 'bolt'],
      EA: ['Burning Brand', 'An enemy brands your ally. It explodes unless someone cleanses it.', 'mark'],
      EE: ['Infernal Pact', 'An enemy shaman fires up its pack: they hit harder until it dies.', 'beam'],
      EW: ['Scorched Trail', 'A charging enemy leaves burning footprints behind it.', 'trail'],
      WS: ['Lava Vent', 'A vent in the floor erupts under you. Watch for the glow.', 'vent', '🌋'],
      WA: ['Campfire', 'Allies resting by the fire recover between fights.', 'beam', '🏕️'],
      WE: ['Explosive Barrel', 'Lure enemies next to the barrel, then light it.', 'burst', '🛢️'],
      WW: ['Wildfire', 'Fire spreads from grass tile to grass tile on its own.', 'spread', '🌾'],
    },
    heal: {
      SS: ['Second Wind', 'Catch your breath and heal yourself.', 'aura'],
      SA: ['Mend', 'Heal an ally directly.', 'beam'],
      SE: ['Turn Undead', 'Healing light burns undead enemies.', 'bolt'],
      SW: ['Sanctuary', 'Plant a circle of healing on the ground.', 'zone'],
      AS: ['Lifeline', 'An ally heals you from across the room.', 'beam'],
      AA: ['Chain Heal', 'An ally’s heal bounces from ally to ally.', 'chain'],
      AE: ['Siphon', 'An ally drains an enemy to heal the party.', 'drain'],
      AW: ['Healing Zone', 'An ally drops a zone of healing on the ground.', 'zone', '', 1],
      ES: ['Lifesteal', 'An enemy heals itself by hitting you.', 'drain'],
      EA: ['Leech', 'An enemy latches onto your ally and drains them.', 'drain'],
      EE: ['Pack Mender', 'An enemy healer mends its pack: kill it first.', 'beam', '', 1],
      EW: ['Regrowth Totem', 'An enemy plants a totem that heals its side.', 'totem', '🗿'],
      WS: ['Fountain', 'Drink from the fountain to heal.', 'beam', '⛲'],
      WA: ['Revival Shrine', 'A shrine brings a fallen ally back.', 'beam', '⛩️'],
      WE: ['Spawning Pool', 'Enemies standing in the pool regenerate. Pull them out.', 'beam', '🫧'],
      WW: ['Regrowth', 'Moss slowly regrows the ground that burned.', 'spread', '🌿'],
    },
    shield: {
      SS: ['Iron Skin', 'Harden yourself against the next hits.', 'aura'],
      SA: ['Bubble', 'Wrap an ally in a shield before the hit lands.', 'bubble'],
      SE: ['Prison', 'Trap an enemy in a bubble: it can’t act, and can’t be hit.', 'bubble'],
      SW: ['Barrier', 'Raise a wall you can shoot through and they can’t.', 'wall'],
      AS: ['Ward', 'An ally’s ward absorbs the next hit on you.', 'bubble'],
      AA: ['Shield Link', 'Two allies split the damage either one takes.', 'chain'],
      AE: ['Smother', 'An ally bubbles an enemy bomb so it explodes inside.', 'bubble'],
      AW: ['Dome', 'An ally raises a dome the whole team can stand in.', 'zone'],
      ES: ['Stasis', 'An enemy seals you in crystal: safe, but stuck.', 'bubble'],
      EA: ['Encase', 'An enemy encases your ally. Break them out.', 'bubble'],
      EE: ['Guardian', 'An enemy shields its pack. Break the generator first.', 'beam'],
      EW: ['Cut the Arena', 'An enemy raises a barrier that splits the room in two.', 'wall'],
      WS: ['Cover', 'Crates stop bullets. Duck behind them.', 'wall', '📦'],
      WA: ['Glyph', 'Whoever stands on the glyph is shielded. Take turns.', 'bubble', '🔷'],
      WE: ['Pillars', 'Enemies hide behind pillars. Flank them.', 'wall', '🏛️'],
      WW: ['Crystal Walls', 'The walls regrow every ten seconds, reshaping the room.', 'spread', '💎'],
    },
  };
  // the deck's walk order for fire (slides 120-123), then row by row
  const ORDER = mech => {
    const all = KEYS.flatMap(s => KEYS.map(t => s + t));
    const first = mech === 'fire' ? ['SE', 'SW', 'SS', 'SA'] : [];
    return [...first, ...all.filter(k => !first.includes(k))];
  };
  const STEP = 1.7;

  /* ---------- one ability as a small scene ---------- */
  const CW = 640, CH = 300, SP = [150, 160], TP = [490, 160];
  function token(g, kind, x, y, face, obj) {
    if (kind === 'S') T.player(x, y, face);
    else if (kind === 'A') T.player(x, y, face, 1, 1, C.p2);
    else if (kind === 'E') T.foe(x, y, 26, face, C.red, { mark: 'horns' });
    else {
      g.fillStyle = '#b9ad94'; g.strokeStyle = '#8f846c'; g.lineWidth = 3; g.beginPath(); g.roundRect(x - 34, y - 26, 68, 52, 8); g.fill(); g.stroke();
      if (obj) { g.font = '34px "Segoe UI Emoji", "Apple Color Emoji", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(obj, x, y + 2); }
    }
    T.label(WHO[kind] === 'Self' ? 'You' : WHO[kind], x, y + 48, 'center', C.ink, 14);
  }
  function card(g, t, mech, key, o = {}) {
    T.use(g);
    const M = MECH[mech], [name, , fx, obj] = IDEAS[mech][key], s = key[0], tg = key[1], k = (t % 2.4) / 2.4;
    T.floor(0, 0, CW, CH);
    const same = s === tg && s === 'S';
    // the barrel sits next to the enemies it is meant to blow up
    const sp = same ? [CW / 2, CH / 2] : fx === 'burst' ? [360, 160] : SP, tp = same ? sp : TP;
    const col = M.col, rgb = M.rgb;
    const face = Math.atan2(tp[1] - sp[1], tp[0] - sp[0] || 1);
    // effects under the tokens
    if (fx === 'zone' || (fx === 'totem')) { const r = 30 + 26 * ease(clamp(k / .5)); T.zone(tp[0], tp[1] + 6, r, 1, rgb); if (mech === 'fire') flames(g, tp[0], tp[1] + 6, r, t); }
    if (fx === 'trail') for (let i = 0; i < 5; i++) { const x = lerp(tp[0] - 200, tp[0], i / 4); if (k > i / 6) { g.fillStyle = `rgba(${rgb},.5)`; g.beginPath(); g.ellipse(x, tp[1] + 28, 16, 8, 0, 0, Math.PI * 2); g.fill(); } }
    if (fx === 'spread') for (let i = 0; i < 6; i++) { const x = lerp(sp[0], tp[0], i / 5), on = k > i / 8; g.fillStyle = on ? `rgba(${rgb},.55)` : 'rgba(120,110,90,.25)'; g.fillRect(x - 26, tp[1] + 74, 52, 26); if (on && mech === 'fire') flames(g, x, tp[1] + 80, 16, t); }
    if (fx === 'vent' && k > .35) { const v = clamp((k - .35) / .3); g.fillStyle = `rgba(${rgb},${.7 * (1 - Math.max(0, k - .7) / .3)})`; g.beginPath(); g.ellipse(tp[0], tp[1] + 8, 34, 16, 0, 0, Math.PI * 2); g.fill(); g.fillRect(tp[0] - 14, tp[1] - 70 * v, 28, 70 * v); }
    // the source and the target
    if (s === 'W' && fx === 'vent') token(g, 'S', tp[0], tp[1], Math.PI);
    if (same) token(g, s, sp[0], sp[1], 0, obj);
    else {
      token(g, s, sp[0], sp[1], face, obj);
      if (!(s === 'W' && fx === 'vent')) token(g, tg, tp[0], tp[1], face + Math.PI, tg === 'W' ? (obj && s === 'W' ? obj : '') : '');
      if (s === 'W' && fx === 'vent') T.label('Environment', sp[0], sp[1] + 48, 'center', C.ink, 14);
    }
    // effects over the tokens
    const travel = ease(clamp(k / .45));
    if (fx === 'bolt' || fx === 'mark') {
      if (k < .45) { const x = lerp(sp[0], tp[0], travel), y = lerp(sp[1], tp[1], travel); T.tracer(lerp(sp[0], tp[0], Math.max(0, travel - .2)), lerp(sp[1], tp[1], Math.max(0, travel - .2)), x, y, 1, col, 7); g.fillStyle = col; g.beginPath(); g.arc(x, y, 11, 0, Math.PI * 2); g.fill(); }
      else if (k < .65) T.flash(tp[0], tp[1], 44, 1 - (k - .45) / .2);
      if (fx === 'mark' && k > .45) { g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); g.arc(tp[0], tp[1], 38, 0, Math.PI * 2); g.moveTo(tp[0] - 48, tp[1]); g.lineTo(tp[0] - 28, tp[1]); g.moveTo(tp[0] + 28, tp[1]); g.lineTo(tp[0] + 48, tp[1]); g.moveTo(tp[0], tp[1] - 48); g.lineTo(tp[0], tp[1] - 28); g.stroke(); }
    }
    if (fx === 'beam' || fx === 'drain' || fx === 'totem') {
      g.save(); g.strokeStyle = col; g.lineWidth = 5; g.setLineDash([10, 9]); g.lineDashOffset = (fx === 'drain' ? 1 : -1) * t * 60;
      g.beginPath(); g.moveTo(sp[0] + 24, sp[1]); g.lineTo(tp[0] - 24, tp[1]); g.stroke(); g.restore();
      const e = fx === 'drain' ? sp : tp; g.save(); g.globalAlpha = .35 + .25 * Math.sin(t * 6); g.strokeStyle = col; g.lineWidth = 5; g.beginPath(); g.arc(e[0], e[1], 30, 0, Math.PI * 2); g.stroke(); g.restore();
    }
    if (fx === 'chain') {
      const third = [lerp(sp[0], tp[0], .5), sp[1] - 90];
      token(g, tg, third[0], third[1], 0);
      const pts = [sp, tp, third], seg = Math.min(1.999, k / .35), i = Math.floor(seg), u = seg - i;
      for (let j = 0; j < i; j++) T.tracer(pts[j][0], pts[j][1], pts[j + 1][0], pts[j + 1][1], .5, col, 4);
      if (k < .7) { const a = pts[i], b = pts[i + 1]; T.tracer(a[0], a[1], lerp(a[0], b[0], u), lerp(a[1], b[1], u), 1, col, 6); }
    }
    if (fx === 'aura') { g.save(); g.globalAlpha = .9; g.strokeStyle = col; g.lineWidth = 6; g.setLineDash([4, 7]); g.lineDashOffset = t * 30; g.beginPath(); g.arc(sp[0], sp[1], 36 + 10 * Math.sin(t * 5), 0, Math.PI * 2); g.stroke(); g.restore(); if (mech === 'fire') flames(g, sp[0], sp[1], 52, t); }
    if (fx === 'bubble' && k > .2) T.bubble(tp[0], tp[1], 34, t, Math.min(1, (k - .2) / .15));
    if (fx === 'wall') { const h = 110 * ease(clamp(k / .4)), x = tp[0] - 70; g.fillStyle = `rgba(${rgb},.7)`; g.fillRect(x - 8, tp[1] - h / 2, 16, h); if (mech === 'fire') flames(g, x, tp[1], 20, t, h); }
    if (fx === 'burst') { T.foe(tp[0] + 30, tp[1] - 62, 22, Math.PI, C.red, { mark: 'horns' }); if (k > .3) { const v = clamp((k - .3) / .4); T.flash(sp[0], sp[1], 170 * v + 20, 1 - v); } }
    if (o.title) { T.label(`${WHO[s]} → ${WHO[tg]}`, 16, 28, 'left', '#fff', 15, 'rgba(21,32,68,.9)'); T.label(name, CW - 16, 28, 'right', C.ink, 18); }
  }
  function flames(g, x, y, r, t, h) {
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * Math.PI * 2, fx = h ? x + (i % 3 - 1) * 6 : x + Math.cos(a) * r * .8, fy = h ? y - h / 2 + (i / 9) * h : y + Math.sin(a) * r * .5;
      const fl = 8 + 6 * Math.sin(t * 9 + i * 1.7);
      g.fillStyle = i % 2 ? 'rgba(255,185,81,.9)' : 'rgba(232,100,28,.85)';
      g.beginPath(); g.moveTo(fx - 5, fy); g.quadraticCurveTo(fx, fy - fl * 2, fx + 5, fy); g.closePath(); g.fill();
    }
  }
  const fitTo = (g, cv, fn) => { const sc = Math.min(cv.width / CW, cv.height / CH); g.save(); g.translate((cv.width - CW * sc) / 2, (cv.height - CH * sc) / 2); g.scale(sc, sc); g.beginPath(); g.roundRect(0, 0, CW, CH, 12); g.clip(); fn(); g.restore(); };

  /* ---------- slide 1: title ---------- */
  canvasDemo('title', (s, cv, g) => (dt, t) => {
    const ord = ORDER('fire'), i = Math.floor(t / STEP) % ord.length;
    g.clearRect(0, 0, cv.width, cv.height); fitTo(g, cv, () => card(g, t - Math.floor(t / STEP) * STEP, 'fire', ord[i], { title: true }));
  });

  /* ---------- slide 2: the walkthrough ---------- */
  let api = null;
  canvasDemo('matrix', (s, cv, g) => {
    const grid = $(s, '.tg-grid'), mechBox = $(s, '.tg-mech');
    const st = { mech: 'fire', open: new Set(), cur: 'SE', walk: true, tw: 0, ct: 0, held: false, last: '' };
    mechBox.innerHTML = `<span>Mechanic</span>` + Object.entries(MECH).map(([k, m]) => `<button class="mk" data-m="${k}">${m.icon} ${m.name}</button>`).join('');
    grid.innerHTML = `<div class="corner"><span>Source ↓</span><span>Target →</span></div>` + KEYS.map(k => `<div class="hd col">${WHO[k]}</div>`).join('') +
      KEYS.map(sk => `<div class="hd row">${WHO[sk]}</div>` + KEYS.map(tk => `<button class="cell" data-k="${sk + tk}"></button>`).join('')).join('');
    const start = mech => { st.mech = mech; st.open = new Set(); st.walk = true; st.tw = 0; st.ct = 0; st.cur = ORDER(mech)[0]; };
    $$(mechBox, '.mk').forEach(b => b.onclick = () => start(b.dataset.m));
    $$(grid, '.cell').forEach(c => c.onclick = () => { st.walk = false; st.cur = c.dataset.k; st.open.add(st.cur); st.ct = 0; });
    $(s, '.tg-walk').onclick = () => start(st.mech);
    $(s, '.tg-fill').onclick = () => { st.walk = false; ORDER(st.mech).forEach(k => st.open.add(k)); };
    $(s, '.tg-empty').onclick = () => { st.walk = false; st.open = new Set(); };
    function paint() {
      const M = MECH[st.mech];
      $$(mechBox, '.mk').forEach(b => b.classList.toggle('on', b.dataset.m === st.mech));
      $$(grid, '.cell').forEach(c => {
        const k = c.dataset.k, idea = IDEAS[st.mech][k], open = st.open.has(k);
        c.classList.toggle('open', open); c.classList.toggle('cur', k === st.cur); c.classList.toggle('deck', open && !!idea[4]);
        c.style.setProperty('--mc', M.col);
        const html = open ? `<b>${idea[0]}</b>` : '<i>?</i>';
        if (c.innerHTML !== html) c.innerHTML = html;
      });
      const [name, line, , , deck] = IDEAS[st.mech][st.cur], key = st.mech + st.cur;
      if (key !== st.last) {
        st.last = key;
        $(s, '.tg-dir').innerHTML = `<span class="chip">${WHO[st.cur[0]]}</span><i>→</i><span class="chip gold">${WHO[st.cur[1]]}</span>${deck ? '<span class="deckb">★ from the deck</span>' : ''}`;
        $(s, '.tg-name').innerHTML = `${M.icon} ${name}`;
        say($(s, '.tg-line'), line);
      }
    }
    function at(tt) {
      // walking: one cell every STEP seconds, then hold on the full matrix
      const ord = ORDER(st.mech), i = Math.min(ord.length - 1, Math.floor(tt / STEP));
      st.open = new Set(ord.slice(0, i + 1)); st.cur = ord[i]; return tt - i * STEP;
    }
    function render() {
      const ct = st.walk ? at(st.tw) : st.ct;
      paint();
      g.clearRect(0, 0, cv.width, cv.height); fitTo(g, cv, () => card(g, ct, st.mech, st.cur));
    }
    api = { seek(t) { st.held = true; st.mech = 'fire'; st.walk = true; st.tw = t; render(); }, dur: () => ORDER('fire').length * STEP + 1.5 };
    return dt => { if (!st.held) { st.tw += dt; st.ct += dt; if (st.walk && st.tw > ORDER(st.mech).length * STEP + 3) st.tw = 0; } render(); };
  }, { enter(s) { const b = $(s, '.tg-walk'); b?.click(); } });

  /* ---------- slide 3: trap, hazard, insight (slides 165-170) ---------- */
  const PW = 460, PH = 330, LOOP = 6;
  function trapPanel(g, t) {
    T.use(g); T.floor(0, 0, PW, PH);
    const trap = [230, 190];
    // you set it, the ally runs past it, the enemy chasing them steps on it
    if (t > .6) { g.fillStyle = '#6f6656'; g.fillRect(trap[0] - 24, trap[1] - 24, 48, 48); g.fillStyle = '#e8e2cf'; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.beginPath(); g.moveTo(trap[0] - 18 + i * 12, trap[1] - 16 + j * 12); g.lineTo(trap[0] - 14 + i * 12, trap[1] - 24 + j * 12); g.lineTo(trap[0] - 10 + i * 12, trap[1] - 16 + j * 12); g.fill(); } }
    T.player(90, 280, -.5); T.label('You', 90, 318, 'center', C.ink, 13);
    if (t < .6) T.tracer(90, 280, lerp(90, trap[0], t / .6), lerp(280, trap[1], t / .6), 1, C.gold, 4);
    const ax = lerp(-30, PW + 40, clamp((t - 1) / 3)), ex = lerp(-120, trap[0], clamp((t - 1.3) / 2.6));
    T.player(ax, trap[1], 0, 1, 1, C.p2); T.label('Ally', ax, trap[1] - 40, 'center', C.ink, 13);
    const caught = t > 3.9;
    T.foe(caught ? trap[0] : ex, trap[1], 26, 0, C.red, { mark: 'horns' });
    if (caught && t < 4.4) T.flash(trap[0], trap[1], 60, 1 - (t - 3.9) / .5);
    if (caught) T.popText('Trapped!', trap[0], trap[1] - 60, C.goldInk, Math.min(1, (LOOP - t) / .4));
  }
  function hazardPanel(g, t) {
    T.use(g); T.floor(0, 0, PW, PH);
    const ang = t * .9, mx = 230 + Math.cos(ang) * 140, my = 165 + Math.sin(ang) * 90;
    const drops = [.5, 1.5, 2.5, 3.5].map(d => ({ d, x: 230 + Math.cos(d * .9) * 140, y: 165 + Math.sin(d * .9) * 90 }));
    drops.forEach(m => {
      if (t < m.d) return;
      const age = t - m.d;
      if (age < 2) { g.fillStyle = Math.floor(age * 6) % 2 ? C.red : '#5a1f1c'; g.beginPath(); g.arc(m.x, m.y, 9, 0, Math.PI * 2); g.fill(); T.zone(m.x, m.y, 40, .5); }
      else if (age < 2.5) T.flash(m.x, m.y, 60, 1 - (age - 2) / .5);
    });
    T.foe(mx, my, 24, ang + Math.PI / 2, C.red, { mark: 'horns' });
    // you sidestep each blast
    const yx = 230 + Math.sin(t * 1.3) * 40, yy = 165 + Math.cos(t * 1.1) * 30;
    T.player(yx, yy, ang); T.label('You', yx, yy + 38, 'center', C.ink, 13);
  }
  function insightPanel(g, t) {
    T.use(g);
    g.fillStyle = '#fffaf0'; g.fillRect(0, 0, PW, PH);
    g.strokeStyle = '#cdbf9f'; g.lineWidth = 2; g.beginPath(); g.moveTo(PW / 2, 20); g.lineTo(PW / 2, PH - 20); g.stroke();
    g.font = '700 15px Montserrat, sans-serif'; g.textAlign = 'center'; g.fillStyle = C.muted;
    g.fillText('YOU SEE', PW / 4, 34); g.fillText('YOUR ALLY SEES', PW * 3 / 4, 34);
    // the bomb with three wires
    const cut = t > 3.4;
    g.fillStyle = '#3d4270'; g.beginPath(); g.roundRect(40, 90, 150, 110, 12); g.fill();
    g.fillStyle = cut ? C.good : (Math.floor(t * 2) % 2 ? C.red : '#ff8a80'); g.font = '700 20px Jost, sans-serif'; g.fillText(cut ? 'SAFE' : '0:0' + Math.max(0, 9 - Math.floor(t)), 115, 125);
    [['#e5322d', 150], ['#2f78c4', 168], ['#e0b000', 186]].forEach(([c, y], i) => { g.strokeStyle = c; g.lineWidth = 6; g.beginPath(); g.moveTo(50, y); if (cut && i === 2) { g.lineTo(105, y - 6); g.moveTo(125, y + 6); } g.lineTo(180, y); g.stroke(); });
    T.player(115, 260, -Math.PI / 2); T.label('You', 115, 298, 'center', C.ink, 13);
    // the manual
    g.fillStyle = '#efe6d2'; g.beginPath(); g.roundRect(PW / 2 + 30, 80, 170, 150, 6); g.fill(); g.strokeStyle = '#b9ad94'; g.stroke();
    g.fillStyle = C.ink; g.font = '600 14px Jost, sans-serif'; g.textAlign = 'left';
    ['Three wires:', 'if the clock blinks,', 'cut the yellow one.'].forEach((l, i) => g.fillText(l, PW / 2 + 44, 110 + i * 22));
    T.player(PW * 3 / 4, 270, -Math.PI / 2, 1, 1, C.p2); T.label('Ally', PW * 3 / 4, 308, 'center', C.ink, 13);
    if (t > 1.8 && t < 3.6) T.label('Cut the yellow one!', PW * 3 / 4, 248, 'center', '#fff', 14, C.p2);
    if (cut) T.popText('Defused', 115, 70, C.good, Math.min(1, (LOOP - t) / .4));
  }
  canvasDemo('shift', (s, cv, g) => (dt, t) => {
    const u = t % LOOP, W = cv.width / 3;
    g.clearRect(0, 0, cv.width, cv.height);
    [trapPanel, hazardPanel, insightPanel].forEach((fn, i) => {
      g.save(); g.translate(i * W + 8, 0); const sc = Math.min((W - 16) / PW, cv.height / PH); g.scale(sc, sc);
      g.beginPath(); g.roundRect(0, 0, PW, PH, 12); g.clip(); fn(g, u); g.restore();
    });
  });

  window.__seek = t => api.seek(t);
  window.__dur = () => api.dur();
})();
