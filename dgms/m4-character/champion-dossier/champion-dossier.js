/* Champion dossier (Module 4, 3Cs: Character, slides 54-123 and 141-200).
   Slide 1: Alex Yee's seven-layer Pyramid of Complexity for six League champions plus Goofy (text only, before and after).
   Click a layer for one champion's answer, click a layer name to compare every champion's answer.
   Slide 2: Devon Giehl's six pieces of Compelling Character Composition on the same champions, with the role-and-lens
   column (context, emotional framing, subjective truth) and FPGD fit lamps (clarity, motivation, response, satisfaction, fit).
   Slide 3: "Treat them like lug nuts": a blank pyramid for the learner's own cast, a progress ring per layer per character,
   and a warning when one layer races ahead of the rest.
   Log lines quoted from the deck are marked; every other answer is a short course summary, not a quote.
   Every canvas is a pure function of (state, t), so __seek is deterministic. */
(function () {
  const { $, $$, canvasDemo, say, store } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD, TAU = Math.PI * 2;
  const W = 1040, H = 585;
  const PAPER = 'rgba(255,252,244,.88)', CARD = '#efe6d2', LINE = '#cdbf9f';

  /* ---------- content ---------- */
  const LAYERS = [
    ['Core theme', 'A log line: the idea every other layer serves.'],
    ['Type of narrative', 'Event-based or character-based?'],
    ['Character roles', 'Protagonist, antagonist, reflection or avatar.'],
    ['World', 'Is the world a stage, a molder or a participant?'],
    ['Mechanic-emotion loop', 'What the player does, and what it makes them feel.'],
    ['Specificity', 'The concrete details only this character has.'],
    ['Source of power and conflicts', 'Where their strength comes from, and what pushes back.'],
  ];
  const SHORT = ['Core theme', 'Narrative', 'Roles', 'World', 'Mechanic-emotion', 'Specificity', 'Power and conflicts'];
  const LAYER_COL = ['#e0a92d', '#e88a3a', '#d9674a', '#b45c8a', '#7a63c9', '#4f7fd0', '#2ea3dc'];
  const Q = t => ({ t, q: true });   // a deck quote
  const CHAMPS = [
    { id: 'Jinx', title: 'the Loose Cannon', layers: [
      'Chaos for the fun of it: a loose cannon who escalates everything.',
      'Character-based: her story is who she is, a manic Zaunite who never stops escalating.',
      'Antagonist to Piltover\'s order. Vi, her sister, is her reflection: the same past, a different path.',
      'Participant: she repaints and blows up Piltover. The undercity of Zaun molded her first.',
      'Get Excited!: every takedown gives her a burst of speed, so each kill feeds the mania.',
      'Pow-Pow the minigun, Fishbones the rocket launcher, Flame Chompers!, the Super Mega Death Rocket.',
      'Guns she built herself. Her conflicts: Vi, Caitlyn, and anyone who tries to make her calm down.',
    ] },
    { id: 'Draven', title: 'the Glorious Executioner', layers: [
      Q('"Love me or die trying."'),
      'Character-based: a showman whose whole story is his need to be watched.',
      'Protagonist of his own show. His brother Darius is the reflection: duty where Draven wants glory.',
      'Stage: the executions of Noxus are his arena, and the crowd is the world he plays to.',
      'Catch your Spinning Axe for bonus damage; each catch is a trick for the crowd, and kills cash in Adoration.',
      'Spinning axes, the moustache, his own fan club, and "Welcome to the League of Draven."',
      'Fame and axe skill. His conflict is ego: adoration he can never get enough of, in his brother\'s shadow.',
    ] },
    { id: 'Braum', title: 'the Heart of the Freljord', layers: [
      Q('"Kindness is Strength."'),
      'Character-based: a folk hero whose legend is a string of small kindnesses.',
      'Protagonist and avatar of the Freljord\'s warmth: the friend who steps in front of you.',
      'Stage and participant: a frozen, hostile land, and the villages he walks into to help.',
      'Stand Behind Me dashes to an ally, Unbreakable blocks shots for them: protecting feels heroic.',
      'A vault door for a shield, a huge moustache, a poro on his shoulder, a laugh.',
      'Strength and the legendary door. Conflict: a cruel world that tests whether kindness can last.',
    ] },
    { id: 'Lucian', title: 'the Purifier', layers: [
      Q('"Let go of vengeance or be consumed by it."'),
      'Event-based: Thresh steals the soul of Senna, his wife, and the story starts there.',
      'Protagonist. Thresh is the antagonist. Senna is the reflection of what he could become.',
      'Molder: the Black Mist of the Shadow Isles hunts the living and keeps shaping his fight.',
      'Lightslinger: a double shot after every ability. Dash, shoot, dash: a hunter who will not stop.',
      'Twin relic pistols, one of them Senna\'s; the long coat of a Sentinel of Light.',
      'Relic weapons that burn the undead. Conflict: vengeance against Thresh, or letting go.',
    ] },
    { id: 'Gnar', title: 'the Missing Link', layers: [
      Q('"Towering Tantrums."'),
      'Event-based: a prehistoric yordle thawed out of the ice into a world he does not know.',
      'Protagonist with a cute face. His own rage is his reflection: Mega Gnar.',
      'Participant: the Freljord he wakes up in, full of things to bonk and people to befriend.',
      'Rage Gene: fighting fills a bar, then the tantrum hits and he becomes Mega Gnar.',
      'A bone boomerang, Mini and Mega forms, and a vocabulary that is mostly "Gnar!"',
      'Ancient yordle magic and the Rage Gene. Conflict: a temper he cannot fully control.',
    ] },
    { id: 'Ziggs', title: 'the Hexplosives Expert', layers: [
      'Chaotic fun with explosions: every bang is a punchline.',
      'Character-based: a tinkerer whose story is his love of a big bang.',
      'Protagonist of his own mischief. Jinx is a kindred reflection of the same love of chaos.',
      'Participant: the labs of Piltover and Zaun, where every experiment ends in a crater.',
      'Lob a Bouncing Bomb and watch it hop: every spell is a bomb, and every bomb is a joke.',
      'Satchel charges, a minefield, the Mega Inferno Bomb, yordle goggles and a grin.',
      'Hextech explosives he builds himself. Conflict: his urge to blow things up versus the rules of the city.',
    ] },
    { id: 'Goofy', title: 'the deck\'s before-and-after example', text: true,
      before: [null, null, null, null, null, 'A tall dog in a hat who trips a lot. (Only the surface was built.)', null],
      layers: [
        'A loving father who keeps trying, however clumsy he is.',
        'Character-based: his clumsiness and his devotion start every story.',
        'Protagonist of his own films. Mickey is the reflection: the friend who has it together.',
        'Participant: the world bends into slapstick around him.',
        'Fall down, bounce back up: failure is funny, never final.',
        'The tall hat, "Gawrsh!", the holler, a lanky loping walk.',
        'Optimism that does not break. Conflict: his clumsiness against what he wants for his son.',
      ] },
  ];
  const BYID = Object.fromEntries(CHAMPS.map(c => [c.id, c]));
  const LEAGUE = CHAMPS.filter(c => !c.text);
  const ans = (c, l, goofy) => { const a = c.text && goofy === 'before' ? c.before[l] : c.layers[l]; return a == null ? null : typeof a === 'string' ? { t: a, q: false } : a; };

  // Devon Giehl's six pieces (slides 99-123). Role and lens is three sub-answers (slide 102).
  const PIECES = ['Role and lens', 'Flawed over likeable', 'Depth through damage', 'Memorability through conflict', 'Medium considerations', 'Character-driven prompts'];
  const PIECE_DEF = [
    'Context, emotional framing and subjective truth: the lens the player sees the character through.',
    'Flaws make a character human. Likeable alone is forgettable.',
    'What hurt them, and what that left behind.',
    'Inner and outer conflicts are what players remember.',
    'What a game can show that a book cannot: the kit, the voice, the animation.',
    'Ask the character a question and let the answer design the kit.',
  ];
  const SIX = {
    Jinx: { lens: ['A Zaunite criminal who torments Piltover.', 'Gleeful, never grim: the chaos is a party.', 'To her, the destruction is a game.'],
      p: ['Impulsive and cruel, and players love her for it.', 'Losing Vi and a broken mind sit under every joke.', 'Her war with Vi and Caitlyn, and with being told to calm down.', 'A marksman whose kills trigger a speed burst; the voice and animation carry the mania.', '"What would Jinx do with a new toy?" A bigger gun, and a rocket that crosses the map.'] },
    Draven: { lens: ['A Noxian executioner who turned killing into a show.', 'Arrogant fun: a villain you cheer for.', 'He believes the crowd truly adores him.'],
      p: ['Vain and boastful; the ego is the charm.', 'Always second to his brother Darius.', 'Craving adoration in a world that only wants him to win.', 'Axe catching is a skill test the player shows off, exactly as Draven would.', '"How would Draven make a kill a show?" Catch the axe, then cash in Adoration.'] },
    Braum: { lens: ['A Freljord folk hero, half legend.', 'Warm: a smile in a frozen land.', 'He protects people because it is right, not for glory.'],
      p: ['Too trusting; he would help an enemy up.', 'Little damage of his own: his depth is refusing to let a hard world harden him.', 'Kindness tested by a brutal Freljord.', 'A support whose kit puts him between allies and danger.', '"What does Braum do when a friend is shot at?" Stand Behind Me, then Unbreakable.'] },
    Lucian: { lens: ['A Sentinel hunting the dead of the Shadow Isles.', 'Grief, not revenge-thriller cool.', Q('He carries Senna\'s gun "because it matters to him personally. It\'s not about weapon symmetry."')],
      p: ['Obsessed and closed off; vengeance blinds him.', 'Thresh took Senna\'s soul.', 'Vengeance against Thresh, or letting go when Senna returns.', 'Dash and double shot: relentless mobility reads as a hunter who will not stop.', '"How does Lucian fight without pausing?" A double shot after every ability.'] },
    Gnar: { lens: ['A prehistoric yordle thawed out in the modern Freljord.', 'Cute, then a terrifying tantrum.', 'To Gnar, the rage is just his feelings getting big.'],
      p: ['Tantrums he cannot control.', 'Out of his own time: everyone he knew is gone.', 'Mini against Mega: two forms, one temper.', 'A visible rage bar and a transformation the whole team can see coming.', '"What happens when Gnar gets angry?" The Rage Gene, and Mega Gnar.'] },
    Ziggs: { lens: ['A yordle bomb-maker between Piltover and Zaun.', 'Reframed from "distasteful" to "chaotic fun".', 'To him a bomb is a toy, and a big bang is a punchline.'],
      p: ['Reckless: his experiments wreck the lab.', 'Light damage: an outsider whose ideas are too loud for the city.', 'His urge to explode against the rules of the city.', 'An artillery mage: every spell is a bomb with a cartoon bounce.', '"What would Ziggs bring to a fight?" More bombs.'] },
  };
  const LENS = ['Context', 'Framing', 'Truth'];
  const FPGD = [
    ['Clarity', 'who they are matches how they play.'],
    ['Motivation', 'they do things you want to do or are someone you want to be.'],
    ['Response', 'their tools matter.'],
    ['Satisfaction', 'you feel rewarded for playing as that character.'],
    ['Fit', 'the mechanics and tools match the fantasy and game context.'],
  ];
  const FPGD_PRE = { Jinx: [2, 2, 2, 2, 2], Draven: [2, 1, 2, 2, 2], Braum: [2, 2, 2, 1, 2], Lucian: [1, 2, 2, 2, 2], Gnar: [2, 2, 1, 2, 2], Ziggs: [2, 2, 2, 2, 2] };
  const LAMP_WORD = ['off', 'partly', 'fits'], LAMP_COL = ['#c9bfa6', '#e0a92d', '#2fae63'];

  /* ---------- images ---------- */
  const img = {};
  LEAGUE.forEach(c => ['', '_splash'].forEach(s => { const i = new Image(); i.src = `img/${c.id}${s}${s ? '.jpg' : '.png'}`; img[c.id + s] = i; }));
  const ok = i => i && i.complete && i.naturalWidth;
  function cover(g, i, x, y, w, h, fy = .3) {
    if (!ok(i)) { g.fillStyle = '#3d4270'; g.fillRect(x, y, w, h); return; }
    const k = Math.max(w / i.naturalWidth, h / i.naturalHeight), sw = w / k, sh = h / k;
    g.drawImage(i, (i.naturalWidth - sw) / 2, (i.naturalHeight - sh) * fy, sw, sh, x, y, w, h);
  }
  function portrait(g, c, x, y, s) {
    g.save(); g.beginPath(); g.roundRect(x, y, s, s, s * .18); g.clip();
    if (c.text) { g.fillStyle = '#e6dcc5'; g.fillRect(x, y, s, s); g.fillStyle = C.ink; g.font = `700 ${Math.round(s * .24)}px Montserrat, Jost, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Goofy', x + s / 2, y + s / 2 + 1); }
    else if (ok(img[c.id])) g.drawImage(img[c.id], x, y, s, s);
    g.restore();
    g.strokeStyle = 'rgba(38,44,106,.5)'; g.lineWidth = 1.5; g.beginPath(); g.roundRect(x, y, s, s, s * .18); g.stroke();
  }

  /* ---------- canvas helpers ---------- */
  function bg(g) { T.use(g); g.clearRect(0, 0, W, H); g.fillStyle = PAPER; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill(); }
  function font(g, size, wt = 500, fam = 'Jost') { g.font = `${wt} ${size}px ${fam === 'M' ? 'Montserrat, Jost' : 'Jost'}, sans-serif`; }
  function text(g, s, x, y, col = C.ink, align = 'left') { g.fillStyle = col; g.textAlign = align; g.textBaseline = 'alphabetic'; g.fillText(s, x, y); }
  // word wrap; returns the y after the last line
  function wrap(g, s, x, y, w, lh, col = C.ink, max = 99) {
    const words = s.split(' '); let line = '', n = 0;
    g.fillStyle = col; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    for (let i = 0; i < words.length; i++) {
      const test = line ? line + ' ' + words[i] : words[i];
      if (g.measureText(test).width > w && line) {
        if (n === max - 1) { g.fillText(line + '…', x, y + n * lh); return y + (n + 1) * lh; }
        g.fillText(line, x, y + n * lh); n++; line = words[i];
      } else line = test;
    }
    if (line) { g.fillText(line, x, y + n * lh); n++; }
    return y + n * lh;
  }
  function tag(g, s, x, y, quote) {
    font(g, 11, 600); const w = g.measureText(s).width + 14;
    g.fillStyle = quote ? '#fde9b8' : '#dfe6fb'; g.strokeStyle = quote ? '#e0a92d' : '#8ea2e6'; g.lineWidth = 1.5;
    g.beginPath(); g.roundRect(x, y - 13, w, 18, 6); g.fill(); g.stroke();
    text(g, s, x + 7, y, quote ? '#7a4a00' : '#23306e');
    return w;
  }
  // a pointer the walk-through "clicks" with
  function cursor(g, p) {
    if (!p) return;
    const { x, y, k } = p;
    if (k > 0) { g.strokeStyle = `rgba(229,50,45,${1 - k})`; g.lineWidth = 3; g.beginPath(); g.arc(x, y, 8 + k * 26, 0, TAU); g.stroke(); }
    g.save(); g.translate(x, y); g.fillStyle = '#fff'; g.strokeStyle = C.ink; g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 22); g.lineTo(6, 17); g.lineTo(10, 26); g.lineTo(14, 24); g.lineTo(10, 15); g.lineTo(17, 15); g.closePath(); g.fill(); g.stroke(); g.restore();
  }
  function hitAt(hits, x, y) { for (let i = hits.length - 1; i >= 0; i--) { const h = hits[i]; if (x >= h.x && x < h.x + h.w && y >= h.y && y < h.y + h.h) return h; } return null; }
  function wireCanvas(cv, getHits, onHit) {
    const pos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height]; };
    cv.addEventListener('mousemove', e => { cv.style.cursor = hitAt(getHits(), ...pos(e)) ? 'pointer' : 'default'; });
    cv.addEventListener('click', e => { const h = hitAt(getHits(), ...pos(e)); if (h) onHit(h); });
  }
  // walk-through timelines: a list of [time, state patch, click point]; the state at t is every patch up to t
  function timeline(steps, t, base) {
    const st = { ...base }; let click = null;
    for (const [at, patch, pt] of steps) { if (t < at) break; Object.assign(st, patch); if (pt) click = { x: pt[0], y: pt[1], k: clamp((t - at) / .6) }; }
    return { st, click };
  }
  function champButtons(s, ids) {
    const box = $(s, '.cd-champ');
    box.innerHTML = ids.map(id => { const c = BYID[id]; return `<button class="btn" data-c="${id}">${c.text ? '<span class="gf">G</span>' : `<img src="img/${id}.png" alt="">`}${id}</button>`; }).join('');
    return $$(box, '.btn');
  }

  /* ---------- the pyramid ---------- */
  const PY = { top: 18, bot: 568, cx: 372, hwTop: 22, hwBot: 152, names: [12, 206] };
  const layerY = l => { const h = (PY.bot - PY.top) / 7; return { y0: PY.bot - (l + 1) * h, y1: PY.bot - l * h, h }; };
  const hwAt = (y, py = PY) => lerp(py.hwTop, py.hwBot, (y - py.top) / (py.bot - py.top));
  function trap(g, l, py = PY, gap = 3) {
    const h = (py.bot - py.top) / 7, y0 = py.bot - (l + 1) * h + gap / 2, y1 = py.bot - l * h - gap / 2;
    g.beginPath(); g.moveTo(py.cx - hwAt(y0, py), y0); g.lineTo(py.cx + hwAt(y0, py), y0); g.lineTo(py.cx + hwAt(y1, py), y1); g.lineTo(py.cx - hwAt(y1, py), y1); g.closePath();
    return { y0, y1, ym: (y0 + y1) / 2 };
  }
  // name pills to the left of the pyramid; returns their hit rects
  function namePills(g, sel, compare, hits, py = PY) {
    for (let l = 0; l < 7; l++) {
      const { y0, h } = layerY(l), x = py.names[0], w = py.names[1] - py.names[0], y = y0 + 10, hh = h - 20;
      const on = compare && sel === l;
      g.fillStyle = on ? C.ink : '#fffaf0'; g.strokeStyle = on ? C.ink : LINE; g.lineWidth = 2;
      g.beginPath(); g.roundRect(x, y, w, hh, 10); g.fill(); g.stroke();
      g.fillStyle = LAYER_COL[l]; g.beginPath(); g.arc(x + 16, y + hh / 2, 9, 0, TAU); g.fill();
      font(g, 11, 700); text(g, String(l + 1), x + 16, y + hh / 2 + 4, '#fff', 'center');
      font(g, 14, 600); text(g, SHORT[l], x + 31, y + hh / 2 + 5, on ? '#fff' : C.ink);
      font(g, 13, 700); text(g, '⇄', x + w - 10, y + hh / 2 + 5, on ? C.gold : C.muted, 'right');
      hits.push({ x, y, w, h: hh, act: 'name', l });
    }
  }

  /* ===== Slide 1: Pyramid of Complexity ===== */
  const ORDER = CHAMPS.map(c => c.id);
  const RX = 540, RW = 488;
  function drawPyramid(g, st, t, click) {
    bg(g); const hits = [], c = BYID[st.champ];
    namePills(g, st.layer, st.mode === 'compare', hits);
    for (let l = 0; l < 7; l++) {
      const a = ans(c, l, st.goofy), on = st.mode === 'one' && st.layer === l, cmp = st.mode === 'compare' && st.layer === l;
      const { y0, y1, ym } = trap(g, l);
      g.fillStyle = a ? LAYER_COL[l] : '#ece4d2'; g.globalAlpha = a ? (on || cmp ? 1 : .78) : 1; g.fill(); g.globalAlpha = 1;
      if (!a) { g.setLineDash([5, 5]); g.strokeStyle = '#b9ab88'; g.lineWidth = 2; g.stroke(); g.setLineDash([]); }
      if (on || cmp) { g.strokeStyle = C.ink; g.lineWidth = 4; g.stroke(); }
      const hw = hwAt(ym);
      font(g, l > 4 ? 12 : 14, 700, 'M'); text(g, String(l + 1), PY.cx, ym + 5, a ? '#fff' : '#9a8f73', 'center');
      if (hw > 70 && !a) { font(g, 12, 600); text(g, 'not built', PY.cx, ym + 21, '#9a8f73', 'center'); }
      hits.push({ x: PY.cx - hwAt(y1), y: y0, w: hwAt(y1) * 2, h: y1 - y0, act: 'layer', l });
    }
    font(g, 12, 600); text(g, 'built bottom-up', PY.cx, PY.bot + 14, C.muted, 'center');
    // right panel
    g.fillStyle = CARD; g.beginPath(); g.roundRect(RX, 12, RW, H - 24, 12); g.fill();
    if (st.mode === 'one') {
      g.save(); g.beginPath(); g.roundRect(RX, 12, RW, 168, [12, 12, 0, 0]); g.clip();
      if (c.text) { g.fillStyle = '#d9cba8'; g.fillRect(RX, 12, RW, 168); font(g, 13, 600); text(g, 'Text only: no Disney art in this course page.', RX + RW - 16, 34, C.muted, 'right'); }
      else cover(g, img[c.id + '_splash'], RX, 12, RW, 168, .25);
      if (!c.text) { const gr = g.createLinearGradient(0, 100, 0, 180); gr.addColorStop(0, 'rgba(21,32,68,0)'); gr.addColorStop(1, 'rgba(21,32,68,.85)'); g.fillStyle = gr; g.fillRect(RX, 90, RW, 90); }
      g.restore();
      portrait(g, c, RX + 16, 112, 56);
      font(g, 24, 800, 'M'); text(g, c.id, RX + 84, 146, c.text ? C.ink : '#fff');
      font(g, 14, 600); text(g, c.text ? (st.goofy === 'before' ? 'before the pyramid' : 'after the pyramid') : c.title, RX + 84, 166, c.text ? '#7a4a00' : '#fde9b8');
      const a = ans(c, st.layer, st.goofy), y = 214;
      g.fillStyle = LAYER_COL[st.layer]; g.beginPath(); g.arc(RX + 28, y - 6, 13, 0, TAU); g.fill();
      font(g, 13, 700); text(g, String(st.layer + 1), RX + 28, y - 1, '#fff', 'center');
      font(g, 20, 800, 'M'); text(g, LAYERS[st.layer][0], RX + 50, y, C.ink);
      font(g, 15, 500); wrap(g, LAYERS[st.layer][1], RX + 22, y + 26, RW - 44, 20, C.muted);
      g.fillStyle = '#fffaf0'; g.beginPath(); g.roundRect(RX + 16, y + 52, RW - 32, 196, 10); g.fill();
      if (a) {
        font(g, 22, 600); const ye = wrap(g, a.t, RX + 34, y + 92, RW - 68, 30, C.ink, 5);
        tag(g, a.q ? 'Deck log line' : 'Course summary', RX + 34, Math.min(ye + 6, y + 236), a.q);
      } else { font(g, 20, 600); wrap(g, 'Not built. The before version jumped straight to the surface details, so this layer is empty.', RX + 34, y + 92, RW - 68, 28, C.muted); }
      // the log line stays in view: the theme every layer serves
      const lg = ans(c, 0, st.goofy); font(g, 12, 700); text(g, 'CORE THEME', RX + 22, H - 52, C.muted);
      font(g, 15, 600); wrap(g, lg ? lg.t : 'none yet', RX + 22, H - 32, RW - 44, 19, C.ink, 1);
    } else {
      const l = st.layer;
      g.fillStyle = LAYER_COL[l]; g.beginPath(); g.arc(RX + 28, 38, 13, 0, TAU); g.fill();
      font(g, 13, 700); text(g, String(l + 1), RX + 28, 43, '#fff', 'center');
      font(g, 19, 800, 'M'); text(g, `${LAYERS[l][0]}: every champion`, RX + 50, 45, C.ink);
      const rh = 72;
      ORDER.forEach((id, k) => {
        const cc = BYID[id], y = 62 + k * rh, a = ans(cc, l, cc.text ? 'after' : null);
        if (id === st.champ) { g.fillStyle = '#fffaf0'; g.beginPath(); g.roundRect(RX + 8, y - 2, RW - 16, rh - 4, 8); g.fill(); }
        portrait(g, cc, RX + 14, y + 6, 44);
        font(g, 13, 700); text(g, id, RX + 66, y + 16, C.ink);
        if (a.q) { font(g, 11, 700); text(g, 'deck', RX + RW - 16, y + 16, '#9a5a06', 'right'); }
        font(g, 14, 500); wrap(g, a.t, RX + 66, y + 34, RW - 84, 17, C.ink, 2);
        hits.push({ x: RX + 8, y: y - 2, w: RW - 16, h: rh - 4, act: 'champ', id });
      });
    }
    cursor(g, click);
    return hits;
  }
  // walk-through: Jinx bottom-up, then one layer across champions, then compare two layers, then Goofy before and after
  const pill = l => { const { y0, h } = layerY(l); return [150, y0 + h / 2]; };
  const lay = l => { const { y0, h } = layerY(l); return [PY.cx + 6, y0 + h / 2 + 6]; };
  const btnPt = [990, 300];
  const PYR_TOUR = [
    [0, { champ: 'Jinx', layer: 0, mode: 'one', goofy: 'after' }],
    ...[1, 2, 3, 4, 5, 6].map(l => [1.6 * l, { layer: l }, lay(l)]),
    [11, { layer: 0 }, lay(0)],
    ...['Draven', 'Braum', 'Lucian', 'Gnar', 'Ziggs'].map((id, k) => [12.6 + k * 1.6, { champ: id }, null]),
    [20.6, { mode: 'compare', layer: 0, champ: 'Jinx' }, pill(0)],
    [25, { layer: 3 }, pill(3)],
    [29.4, { layer: 4 }, pill(4)],
    [33.8, { mode: 'one', champ: 'Goofy', goofy: 'before', layer: 5 }, lay(5)],
    [36.4, { layer: 0 }, lay(0)],
    [39, { goofy: 'after' }, null],
    [41.6, { layer: 5 }, lay(5)],
  ];
  const PYR_DUR = 45;
  const scenes = {};

  canvasDemo('cd-pyramid', (s, cv, g) => {
    const st = { champ: 'Jinx', layer: 0, mode: 'one', goofy: 'after', tour: true, held: false, t: 0, key: '' };
    let hits = [], view = st;
    const btns = champButtons(s, ORDER), gseg = $$(s, '.cd-goofy .btn'), tourBtn = $(s, '.cd-tour');
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); Object.assign(st, { champ: view.champ, layer: view.layer, mode: view.mode, goofy: view.goofy }); } };
    btns.forEach(b => b.onclick = () => { manual(); st.champ = b.dataset.c; st.mode = 'one'; });
    gseg.forEach(b => b.onclick = () => { manual(); st.champ = 'Goofy'; st.mode = 'one'; st.goofy = b.dataset.g; });
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    wireCanvas(cv, () => hits, h => {
      manual();
      if (h.act === 'layer') { st.layer = h.l; st.mode = 'one'; }
      if (h.act === 'name') { st.layer = h.l; st.mode = 'compare'; }
      if (h.act === 'champ') { st.champ = h.id; st.mode = 'one'; }
    });
    function info(v) {
      const key = [v.champ, v.layer, v.mode, v.goofy].join(); if (key === st.key) return; st.key = key;
      btns.forEach(b => b.classList.toggle('on', v.mode === 'one' && b.dataset.c === v.champ));
      gseg.forEach(b => b.classList.toggle('on', b.dataset.g === v.goofy));
      $(s, '.cd-goofy').classList.toggle('off', v.champ !== 'Goofy');
      const c = BYID[v.champ], built = LAYERS.filter((_, l) => ans(c, l, v.goofy)).length;
      say($(s, '.cd-stats'), v.mode === 'one'
        ? `<div class="${built < 7 ? 'r' : 'g'}"><b>${built}/7</b><span>layers built for ${v.champ}</span></div><div><b>${v.layer + 1}</b><span>${LAYERS[v.layer][0]}</span></div>`
        : `<div class="y"><b>${v.layer + 1}</b><span>${LAYERS[v.layer][0]}, compared across seven characters</span></div>`);
      say($(s, '.cd-out'), v.mode === 'compare'
        ? 'Read down the column. Each answer is the same layer for a different champion, so you can compare log lines or worlds at a glance.'
        : c.text && v.goofy === 'before'
          ? 'Goofy before: only the surface was designed. Every layer under it is missing, so the details have nothing to stand on.'
          : `Each layer rests on the one below it. ${v.champ}'s ${LAYERS[v.layer][0].toLowerCase()} serves the core theme at the base.`);
    }
    scenes.pyramid = { seek(t) { st.held = true; const { st: v, click } = timeline(PYR_TOUR, t, {}); view = v; hits = drawPyramid(g, v, t, click); info(v); }, dur: () => PYR_DUR };
    return dt => {
      if (st.held) return;
      st.t += Math.max(0, dt);
      if (st.tour) { if (st.t >= PYR_DUR) st.t = 0; const { st: v, click } = timeline(PYR_TOUR, st.t, {}); view = v; hits = drawPyramid(g, v, st.t, click); info(v); }
      else { view = st; hits = drawPyramid(g, st, st.t, null); info(st); }
    };
  });

  /* ===== Slide 2: six pieces and the FPGD fit check ===== */
  const fpgdStore = () => store.get('dgms-dossier-fpgd', {});
  const lamps = (id, own) => (own && own[id]) || FPGD_PRE[id];
  const LX = 12, LW = 296, GX = 322, GW = 706, CW = (GW - 10) / 2, CH = 180;
  function pieceText(id, p) { const d = SIX[id]; return p === 0 ? null : d.p[p - 1]; }
  function drawLens(g, id, x, y, w, size, lh) {
    SIX[id].lens.forEach((v, k) => {
      const a = typeof v === 'string' ? { t: v, q: false } : v;
      font(g, size - 1, 700); text(g, LENS[k], x, y, '#9a5a06');
      font(g, size, 500); y = wrap(g, a.t, x + 62, y, w - 62, lh, C.ink, 3) + 4;
    });
  }
  function drawPieces(g, st, t, click, own) {
    bg(g); const hits = [], id = st.champ, c = BYID[id];
    // dossier card
    g.fillStyle = CARD; g.beginPath(); g.roundRect(LX, 12, LW, H - 24, 12); g.fill();
    g.save(); g.beginPath(); g.roundRect(LX, 12, LW, 150, [12, 12, 0, 0]); g.clip(); cover(g, img[id + '_splash'], LX, 12, LW, 150, .2);
    const gr = g.createLinearGradient(0, 90, 0, 162); gr.addColorStop(0, 'rgba(21,32,68,0)'); gr.addColorStop(1, 'rgba(21,32,68,.85)'); g.fillStyle = gr; g.fillRect(LX, 80, LW, 82); g.restore();
    portrait(g, c, LX + 12, 104, 48);
    font(g, 20, 800, 'M'); text(g, id, LX + 70, 132, '#fff'); font(g, 13, 600); text(g, c.title, LX + 70, 151, '#fde9b8');
    const lg = ans(c, 0); font(g, 11, 700); text(g, 'LOG LINE', LX + 14, 186, C.muted);
    font(g, 15, 600); const ly = wrap(g, lg.t, LX + 14, 206, LW - 28, 19, C.ink, 3);
    font(g, 11, 700); text(g, 'FPGD FIT CHECK', LX + 14, Math.max(ly + 10, 262), C.muted);
    const lv = lamps(id, own), y0 = Math.max(ly + 22, 274);
    FPGD.forEach(([n, d], k) => {
      const y = y0 + k * 58, v = lv[k], sel = st.lamp === k;
      if (sel) { g.fillStyle = '#fffaf0'; g.beginPath(); g.roundRect(LX + 6, y - 6, LW - 12, 54, 8); g.fill(); }
      g.fillStyle = LAMP_COL[v]; g.beginPath(); g.arc(LX + 28, y + 14, 12, 0, TAU); g.fill();
      if (v === 1) { g.fillStyle = '#efe6d2'; g.beginPath(); g.arc(LX + 28, y + 14, 12, -Math.PI / 2, Math.PI / 2); g.fill(); g.fillStyle = LAMP_COL[1]; g.beginPath(); g.arc(LX + 28, y + 14, 12, Math.PI / 2, Math.PI * 1.5); g.fill(); }
      if (v === 2) { g.fillStyle = 'rgba(47,174,99,.25)'; g.beginPath(); g.arc(LX + 28, y + 14, 18, 0, TAU); g.fill(); g.fillStyle = LAMP_COL[2]; g.beginPath(); g.arc(LX + 28, y + 14, 12, 0, TAU); g.fill(); }
      g.strokeStyle = 'rgba(38,44,106,.4)'; g.lineWidth = 1.5; g.beginPath(); g.arc(LX + 28, y + 14, 12, 0, TAU); g.stroke();
      font(g, 15, 700); text(g, n, LX + 50, y + 12, C.ink); font(g, 13, 600); text(g, LAMP_WORD[v], LX + LW - 16, y + 12, v === 2 ? '#145c33' : v === 1 ? '#7a4a00' : C.muted, 'right');
      font(g, 12, 500); wrap(g, d[0].toUpperCase() + d.slice(1), LX + 50, y + 30, LW - 66, 15, C.muted, 2);
      hits.push({ x: LX + 6, y: y - 6, w: LW - 12, h: 54, act: 'lamp', k });
    });
    // six pieces, or one piece for every champion
    const cellXY = k => [GX + (k % 2) * (CW + 10), 12 + Math.floor(k / 2) * (CH + 10)];
    if (st.mode === 'one') {
      PIECES.forEach((p, k) => {
        const [x, y] = cellXY(k), sel = st.piece === k;
        g.fillStyle = sel ? '#fffaf0' : CARD; g.beginPath(); g.roundRect(x, y, CW, CH, 10); g.fill();
        if (sel) { g.strokeStyle = C.ink; g.lineWidth = 3; g.stroke(); }
        font(g, 12, 700); text(g, String(k + 1), x + 14, y + 25, '#9a5a06');
        font(g, 15, 800, 'M'); text(g, p, x + 30, y + 25, C.ink); font(g, 14, 700); text(g, '⇄', x + CW - 14, y + 25, C.muted, 'right');
        hits.push({ x, y, w: CW, h: 36, act: 'piece', k });
        if (k === 0) drawLens(g, id, x + 14, y + 52, CW - 28, 14, 17);
        else { font(g, 17, 500); wrap(g, pieceText(id, k), x + 14, y + 56, CW - 28, 22, C.ink, 4); font(g, 12, 500); wrap(g, PIECE_DEF[k], x + 14, y + CH - 28, CW - 28, 15, C.muted, 2); }
      });
      const lens = SIX[id].lens[2];
      tag(g, typeof lens === 'string' ? 'Course summaries' : 'Truth: deck quote', GX + CW - 130, 12 + CH - 10, typeof lens !== 'string');
    } else {
      const k = st.piece;
      font(g, 18, 800, 'M'); text(g, `${PIECES[k]}: every champion`, GX + 6, 34, C.ink);
      font(g, 13, 500); text(g, PIECE_DEF[k], GX + 6, 54, C.muted);
      const ch = (H - 76) / 3;
      LEAGUE.forEach((cc, j) => {
        const x = GX + (j % 2) * (CW + 10), y = 66 + Math.floor(j / 2) * ch, h = ch - 8;
        g.fillStyle = cc.id === id ? '#fffaf0' : CARD; g.beginPath(); g.roundRect(x, y, CW, h, 10); g.fill();
        portrait(g, cc, x + 10, y + 10, 36); font(g, 15, 800, 'M'); text(g, cc.id, x + 54, y + 33, C.ink);
        if (k === 0) drawLens(g, cc.id, x + 12, y + 64, CW - 24, 13, 15);
        else { font(g, 14, 500); wrap(g, pieceText(cc.id, k), x + 12, y + 66, CW - 24, 18, C.ink, 4); }
        hits.push({ x, y, w: CW, h, act: 'champ', id: cc.id });
      });
    }
    cursor(g, click);
    return hits;
  }
  const PIECE_TOUR = (() => {
    const cell = k => [GX + (k % 2) * (CW + 10) + 100, 12 + Math.floor(k / 2) * (CH + 10) + 22];
    const lampPt = k => [LX + 120, 274 + 40 + k * 58];
    return [
      [0, { champ: 'Lucian', piece: 0, mode: 'one', lamp: -1 }],
      ...[1, 2, 3, 4, 5].map((k, i) => [1.8 + i * 1.8, { piece: k }, cell(k)]),
      [11, { lamp: 0 }, lampPt(0)],
      [13, { lamp: 4 }, lampPt(4)],
      [15, { champ: 'Draven', piece: 0, lamp: -1 }, null],
      [17.5, { champ: 'Gnar' }, null],
      [20, { mode: 'compare', piece: 0 }, cell(0)],
      [25.5, { piece: 3 }, null],
      [29, { mode: 'one', champ: 'Ziggs', piece: 0 }, null],
    ];
  })();
  const PIECE_DUR = 33;

  canvasDemo('cd-pieces', (s, cv, g) => {
    const st = { champ: 'Lucian', piece: 0, mode: 'one', lamp: -1, tour: true, held: false, t: 0, key: '' };
    let hits = [], view = st, own = fpgdStore();
    const btns = champButtons(s, LEAGUE.map(c => c.id)), tourBtn = $(s, '.cd-tour');
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); Object.assign(st, { champ: view.champ, piece: view.piece, mode: view.mode, lamp: view.lamp }); } };
    btns.forEach(b => b.onclick = () => { manual(); st.champ = b.dataset.c; st.mode = 'one'; });
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    $(s, '.cd-reset').onclick = () => { own = {}; store.set('dgms-dossier-fpgd', own); st.key = ''; };
    wireCanvas(cv, () => hits, h => {
      manual();
      if (h.act === 'piece') { st.piece = h.k; st.mode = st.mode === 'compare' && st.piece === h.k ? 'one' : 'compare'; }
      if (h.act === 'champ') { st.champ = h.id; st.mode = 'one'; }
      if (h.act === 'lamp') { const v = lamps(st.champ, own).slice(); v[h.k] = (v[h.k] + 1) % 3; own = { ...own, [st.champ]: v }; store.set('dgms-dossier-fpgd', own); st.lamp = h.k; st.key = ''; }
    });
    function info(v, o) {
      const lv = lamps(v.champ, o), key = [v.champ, v.piece, v.mode, v.lamp, lv].join(); if (key === st.key) return; st.key = key;
      btns.forEach(b => b.classList.toggle('on', b.dataset.c === v.champ));
      const lit = lv.filter(x => x === 2).length;
      say($(s, '.cd-stats'), `<div class="${lit === 5 ? 'g' : 'y'}"><b>${lit}/5</b><span>fit lamps lit for ${v.champ}</span></div>`);
      say($(s, '.cd-out'), v.lamp >= 0
        ? `<b>${FPGD[v.lamp][0]}:</b> ${FPGD[v.lamp][1]} For ${v.champ} this reads <b>${LAMP_WORD[lv[v.lamp]]}</b>.`
        : v.mode === 'compare'
          ? `<b>${PIECES[v.piece]}</b> for all six champions. ${v.piece === 0 ? 'Lucian carries Senna\'s gun "because it matters to him personally. It\'s not about weapon symmetry."' : PIECE_DEF[v.piece]}`
          : `<b>${PIECES[v.piece]}.</b> ${PIECE_DEF[v.piece]}`);
    }
    scenes.pieces = { seek(t) { st.held = true; const { st: v, click } = timeline(PIECE_TOUR, t, {}); view = v; hits = drawPieces(g, v, t, click, {}); info(v, {}); }, dur: () => PIECE_DUR };
    return dt => {
      if (st.held) return;
      st.t += Math.max(0, dt);
      if (st.tour) { if (st.t >= PIECE_DUR) st.t = 0; const { st: v, click } = timeline(PIECE_TOUR, st.t, {}); view = v; hits = drawPieces(g, v, st.t, click, own); info(v, own); }
      else { view = st; hits = drawPieces(g, st, st.t, null, own); info(st, own); }
    };
  });

  /* ===== Slide 3: lug nuts ===== */
  const CAST_COL = ['#2ea3dc', '#d9674a', '#8a4fd6'];
  const LPY = { top: 18, bot: 568, cx: 470, hwTop: 64, hwBot: 250, names: [12, 206] };
  const STAR = [0, 3, 6, 2, 5, 1, 4];   // tighten in a star pattern, like a wheel's lug nuts
  const blankCast = () => [0, 1, 2].map(i => ({ name: ['Hero', 'Rival', ''][i], p: [0, 0, 0, 0, 0, 0, 0], notes: ['', '', '', '', '', '', ''] }));
  const GOOFY_BEFORE = () => [{ name: 'Goofy', p: [0, 0, 0, 0, 0, 100, 0], notes: ['', '', '', '', '', 'A tall dog in a hat who trips a lot.', ''] }, { name: 'Hero', p: [100, 25, 0, 0, 25, 0, 0], notes: ['', '', '', '', '', '', ''] }, { name: '', p: [0, 0, 0, 0, 0, 0, 0], notes: ['', '', '', '', '', '', ''] }];
  const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
  function warnings(cast) {
    const out = [];
    cast.forEach((c, ci) => {
      if (!c.name.trim()) return;
      c.p.forEach((v, l) => { const m = mean(c.p.filter((_, j) => j !== l)); if (v - m >= 50) out.push({ ci, l, v, m: Math.round(m) }); });
    });
    return out;
  }
  function ring(g, x, y, r, v, col, sel, warn) {
    g.fillStyle = '#fffaf0'; g.beginPath(); g.arc(x, y, r + 3, 0, TAU); g.fill();
    g.strokeStyle = col; g.globalAlpha = .22; g.lineWidth = 6; g.beginPath(); g.arc(x, y, r - 2, 0, TAU); g.stroke(); g.globalAlpha = 1;
    if (v > 0) { g.strokeStyle = col; g.lineCap = 'round'; g.beginPath(); g.arc(x, y, r - 2, -Math.PI / 2, -Math.PI / 2 + TAU * v / 100); g.stroke(); g.lineCap = 'butt'; }
    font(g, 11, 700); g.textBaseline = 'middle'; g.fillStyle = C.ink; g.textAlign = 'center'; g.fillText(String(Math.round(v)), x, y + 1); g.textBaseline = 'alphabetic';
    if (warn) { g.strokeStyle = C.red; g.lineWidth = 3; g.setLineDash([4, 3]); g.beginPath(); g.arc(x, y, r + 7, 0, TAU); g.stroke(); g.setLineDash([]); }
    if (sel) { g.strokeStyle = C.ink; g.lineWidth = 3; g.beginPath(); g.arc(x, y, r + 5, 0, TAU); g.stroke(); }
  }
  function drawLug(g, st, t, click) {
    bg(g); const hits = [], cast = st.cast, live = cast.map((c, i) => i).filter(i => cast[i].name.trim()), warn = warnings(cast);
    for (let l = 0; l < 7; l++) {
      const { y0, h } = layerY(l), x = LPY.names[0], w = LPY.names[1] - LPY.names[0];
      g.fillStyle = '#fffaf0'; g.strokeStyle = LINE; g.lineWidth = 2; g.beginPath(); g.roundRect(x, y0 + 10, w, h - 20, 10); g.fill(); g.stroke();
      g.fillStyle = LAYER_COL[l]; g.beginPath(); g.arc(x + 16, y0 + h / 2, 9, 0, TAU); g.fill();
      font(g, 11, 700); text(g, String(l + 1), x + 16, y0 + h / 2 + 4, '#fff', 'center');
      font(g, 14, 600); text(g, SHORT[l], x + 31, y0 + h / 2 + 5, C.ink);
      trap(g, l, LPY); g.fillStyle = LAYER_COL[l]; g.globalAlpha = .22; g.fill(); g.globalAlpha = 1; g.strokeStyle = LAYER_COL[l]; g.lineWidth = 2; g.stroke();
      const ym = y0 + h / 2;
      live.forEach((ci, k) => {
        const x0 = LPY.cx + (k - (live.length - 1) / 2) * 52, v = cast[ci].p[l];
        const sel = st.sel && st.sel.c === ci && st.sel.l === l, wn = warn.some(w => w.ci === ci && w.l === l);
        ring(g, x0, ym, 20, v, CAST_COL[ci], sel, wn);
        hits.push({ x: x0 - 24, y: ym - 24, w: 48, h: 48, act: 'cell', c: ci, l });
      });
      if (!live.length && l === 3) { font(g, 15, 600); text(g, 'Name a character to start.', LPY.cx, ym + 5, C.muted, 'center'); }
    }
    // cast legend and warnings
    const RX2 = 740, RW2 = 288;
    g.fillStyle = CARD; g.beginPath(); g.roundRect(RX2, 12, RW2, H - 24, 12); g.fill();
    font(g, 11, 700); text(g, 'CAST: AVERAGE ACROSS SEVEN LAYERS', RX2 + 14, 36, C.muted);
    live.forEach((ci, k) => {
      const c = cast[ci], y = 56 + k * 40, m = mean(c.p);
      g.fillStyle = CAST_COL[ci]; g.beginPath(); g.arc(RX2 + 22, y + 6, 7, 0, TAU); g.fill();
      font(g, 15, 700); text(g, c.name, RX2 + 36, y + 11, C.ink); font(g, 13, 600); text(g, `${Math.round(m)}%`, RX2 + RW2 - 14, y + 11, C.ink, 'right');
      g.fillStyle = '#e3d8bf'; g.fillRect(RX2 + 36, y + 18, RW2 - 50, 6); g.fillStyle = CAST_COL[ci]; g.fillRect(RX2 + 36, y + 18, (RW2 - 50) * m / 100, 6);
    });
    let y = 56 + Math.max(1, live.length) * 40 + 16;
    font(g, 11, 700); text(g, 'LUG NUT CHECK', RX2 + 14, y, C.muted); y += 22;
    if (!warn.length) {
      g.fillStyle = '#d8f0df'; g.beginPath(); g.roundRect(RX2 + 10, y - 16, RW2 - 20, 74, 8); g.fill();
      font(g, 14, 600); wrap(g, live.length ? 'Even. No layer is racing ahead of the others, so the whole wheel tightens together.' : 'Nothing to check yet.', RX2 + 20, y + 4, RW2 - 40, 18, '#145c33', 3);
    } else {
      warn.slice(0, 4).forEach(w => {
        g.fillStyle = '#f9d9d6'; g.beginPath(); g.roundRect(RX2 + 10, y - 16, RW2 - 20, 70, 8); g.fill();
        font(g, 14, 600); wrap(g, `${cast[w.ci].name}: ${LAYERS[w.l][0]} is at ${w.v}% while the other six average ${w.m}%.`, RX2 + 20, y + 4, RW2 - 40, 18, '#8a1c15', 3);
        y += 78;
      });
      if (warn.length > 4) { font(g, 13, 600); text(g, `and ${warn.length - 4} more`, RX2 + 20, y, '#8a1c15'); }
    }
    font(g, 13, 500); wrap(g, '"Treat them like lug nuts: don\'t fully develop any single element to 100%."', RX2 + 14, H - 56, RW2 - 28, 17, C.muted, 2);
    cursor(g, click);
    return { hits, warn };
  }
  // walk-through: Goofy before races one layer, then every layer of every character tightens in a star pattern to 75%
  function lugTour(t) {
    const start = GOOFY_BEFORE(); start[2] = { name: 'Rival', p: [25, 0, 50, 0, 0, 0, 25], notes: [] };
    const cast = start.map(c => ({ ...c, p: c.p.slice() }));
    let sel = { c: 0, l: 5 }, click = null;
    const T0 = 5, STEP = .55;
    if (t > T0) cast.forEach((c, ci) => STAR.forEach((l, k) => {
      const at = T0 + (k * 3 + ci) * STEP, f = ease(clamp((t - at) / .45));
      c.p[l] = Math.round(lerp(start[ci].p[l], 75, f) / 5) * 5;
      if (t >= at && t < at + STEP) { sel = { c: ci, l }; }
    }));
    const live = [0, 1, 2], cur = sel;
    if (t > T0 && t < T0 + 21 * STEP + .5) { const { y0, h } = layerY(cur.l); const x = LPY.cx + (live.indexOf(cur.c) - 1) * 52; click = { x: x + 6, y: y0 + h / 2 + 8, k: ((t - T0) % STEP) / STEP }; }
    return { cast, sel, click };
  }
  const LUG_DUR = 22;

  canvasDemo('cd-lug', (s, cv, g) => {
    const saved = store.get('dgms-dossier-lugnuts', null);
    const st = { cast: saved && saved.length === 3 ? saved : blankCast(), sel: { c: 0, l: 0 }, tour: true, held: false, t: 0, key: '' };
    let hits = [], warn = [];
    const tourBtn = $(s, '.cd-tour'), note = $(s, '.cd-note'), prog = $$(s, '.cd-prog .btn'), castBox = $(s, '.cd-cast');
    const save = () => store.set('dgms-dossier-lugnuts', st.cast);
    castBox.innerHTML = [0, 1, 2].map(i => `<label><i style="background:${CAST_COL[i]}"></i><input data-i="${i}" maxlength="18" placeholder="Character ${i + 1}"></label>`).join('');
    const names = $$(castBox, 'input');
    const fill = () => { names.forEach((n, i) => { n.value = st.cast[i].name; }); st.key = ''; };
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); names.forEach(n => n.disabled = false); note.disabled = false; fill(); } };
    names.forEach((n, i) => n.oninput = () => { manual(); st.cast[i].name = n.value; save(); st.key = ''; });
    prog.forEach(b => b.onclick = () => { manual(); if (!st.cast[st.sel.c].name.trim()) return; st.cast[st.sel.c].p[st.sel.l] = +b.dataset.p; save(); st.key = ''; });
    note.oninput = () => { manual(); st.cast[st.sel.c].notes[st.sel.l] = note.value; save(); };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); st.key = ''; };
    $(s, '.cd-goofy-pre').onclick = () => { manual(); st.cast = GOOFY_BEFORE(); st.sel = { c: 0, l: 5 }; save(); fill(); };
    $(s, '.cd-clear').onclick = () => { manual(); st.cast = blankCast(); st.sel = { c: 0, l: 0 }; save(); fill(); };
    fill();
    wireCanvas(cv, () => hits, h => { manual(); if (h.act === 'cell') { st.sel = { c: h.c, l: h.l }; st.key = ''; } });
    function info(v, w) {
      const c = v.cast[v.sel.c], key = [v.tour, v.sel.c, v.sel.l, c.p[v.sel.l], c.name, w.length, w.map(x => x.ci + '.' + x.l)].join(); if (key === st.key) return; st.key = key;
      say($(s, '.cd-selh'), `Selected layer: <b>${c.name || 'unnamed'}, ${LAYERS[v.sel.l][0]}</b>`);
      prog.forEach(b => b.classList.toggle('on', +b.dataset.p === c.p[v.sel.l]));
      if (document.activeElement !== note) note.value = (c.notes && c.notes[v.sel.l]) || '';
      note.disabled = !!v.tour; names.forEach(n => n.disabled = !!v.tour);
      if (v.tour) v.cast.forEach((cc, i) => { names[i].value = cc.name; });
      const out = $(s, '.cd-out');
      out.classList.toggle('warn', w.length > 0);
      say(out, w.length
        ? `<b>One layer is racing ahead.</b> ${v.cast[w[0].ci].name}'s ${LAYERS[w[0].l][0].toLowerCase()} is at ${w[0].v}%. Bring the other layers up before you finish it.`
        : 'Click a ring, then set how far that layer is developed. Tighten every layer a little at a time, like the lug nuts on a wheel.');
    }
    scenes.lug = { seek(t) { st.held = true; const v = lugTour(t); v.tour = true; const r = drawLug(g, v, t, v.click); hits = r.hits; info(v, r.warn); }, dur: () => LUG_DUR };
    return dt => {
      if (st.held) return;
      st.t += Math.max(0, dt);
      let v = st, click = null;
      if (st.tour) { if (st.t >= LUG_DUR) { st.t = 0; } v = lugTour(st.t); v.tour = true; click = v.click; }
      const r = drawLug(g, v, st.t, click); hits = r.hits; warn = r.warn; info(v, warn);
    };
  });

  window.__seek = (t, which = 'pyramid') => scenes[which].seek(t);
  window.__dur = (which = 'pyramid') => scenes[which].dur();
})();
