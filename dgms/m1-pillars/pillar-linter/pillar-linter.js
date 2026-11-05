/* Module 1, slides 16-25 and 32: run the "4 Rules to create effective Pillars" against any pillar.
   Short: a word meter, amber past 5 words (the notes on 21) and red past 15. Not a feature: flags feature nouns.
   Not generic: flags slide 23's words. Load bearing: a question only the designer can answer.
   Presets are the deck's own examples; the God of War rewrites are this page's suggestions.
   Lamps say "passes" or "flags", never "good" or "bad". */
(function () {
  const { $, $$, say } = FPF.kit;
  const C = TD.C, { clamp, lerp, ease } = TD, TAU = Math.PI * 2;
  const { txt, wrap, box } = SCENE;
  const W = 1040, H = 585;
  const FEATURES = ['system', 'systems', 'mode', 'modes', 'crafting', 'inventory', 'multiplayer', 'skill tree', 'leaderboard', 'combat', 'exploration', 'quests', 'quest', 'loot', 'pvp', 'co-op', 'coop', 'menu', 'hud', 'level editor', 'oxygen', 'feature', 'mechanic', 'mechanics'];
  const GENERIC = ['deep', 'exciting', 'replayable', 'retention', 'engaging', 'innovative', 'easy to learn', 'hard to master', 'fun', 'pick up and play', 'awesome', 'polished', 'immersive'];
  const PRESETS = [
    ['Thrill of the Unknown', 'deck example', 'yes'],
    ['Oxygen system', 'deck example', 'no'],
    ['Dark Modern Fairytale', 'deck example', 'yes'],
    ['Avoid Lockout - Players should never be shut out of playing the game', 'deck example', 'yes'],
    ['Kids should be able to play the game because kids are the future and they will form our future audience for generations to come and this will mean the game is implicitly simple to learn hard to master if kids are dedicating all their time to it and and and and and', 'deck example', ''],
    ['Fun!', 'deck example', 'no'],
    ['Easy to Learn, Hard to Master', 'deck example', 'no'],
    ['Players leave their mark everywhere they go', 'deck example', 'yes'],
    ['Combat', 'God of War (2018)', 'yes'],
    ['Father and Son', 'God of War (2018)', 'yes'],
    ['Exploration', 'God of War (2018)', 'yes'],
  ];
  const REWRITE = { 'combat': 'Every fight is a desperate struggle', 'exploration': 'A world that rewards curiosity', 'oxygen system': 'Thrill of the Unknown' };
  function lint(text, lb) {
    const t = text.trim(), low = ' ' + t.toLowerCase().replace(/[^a-z0-9' -]/g, ' ') + ' ';
    const words = t ? t.split(/\s+/).filter(w => /\w/.test(w)).length : 0;
    const feats = FEATURES.filter(f => low.includes(' ' + f + ' '));
    const gens = GENERIC.filter(f => low.includes(' ' + f + ' ') || low.includes(' ' + f + ','));
    return [
      ['Keep the pillar short', words <= 5 ? 0 : words <= 15 ? 1 : 2, `${words} word${words === 1 ? '' : 's'}`, words <= 5 ? 'Short enough to remember and repeat.' : words <= 15 ? 'More than five words: think about it again.' : 'A paragraph, not a pillar.'],
      ['A pillar is not a feature', feats.length ? 2 : 0, feats.length ? 'flags: ' + feats.join(', ') : 'no feature words', feats.length ? 'Names something the team builds, not what the player feels.' : 'Describes an experience, not a feature.'],
      ['Avoid words that could describe any project', gens.length ? 2 : 0, gens.length ? 'flags: ' + gens.join(', ') : 'no generic words', gens.length ? 'Every game wants this; it tells the team nothing.' : 'Specific to this game.'],
      ['Pillars should be load bearing', lb === 'yes' ? 0 : lb === 'no' ? 2 : -1, lb === 'yes' ? 'changing it changes the game' : lb === 'no' ? 'removing it changes nothing' : 'your call', lb === 'yes' ? 'If changing it changes the whole project, it is a powerful pillar.' : lb === 'no' ? 'Decorative: nothing rests on it.' : 'Would changing this pillar change the whole project? Answer below.'],
      words,
    ];
  }
  const LAMP = [['passes', '#1a8a4c', '#d8f0df'], ['think again', '#9a5a06', '#fde9b8'], ['flags', '#c0392b', '#f9d9d6'], ['?', '#5d618c', '#e6e3f2']];
  const PER = 3.2, DUR = PER * PRESETS.length;
  function draw(g, st, t) {
    SCENE.paper(g, W, H);
    const i = st.tour ? Math.floor(t / PER) % PRESETS.length : -1;
    const text = st.tour ? PRESETS[i][0] : st.text, lb = st.tour ? PRESETS[i][2] : st.lb;
    const r = lint(text, lb), words = r[4];
    // the pillar itself on a plinth
    box(g, 30, 22, 980, 112, { fill: '#fff', stroke: C.ink, lw: 2.5 });
    wrap(g, text ? '“' + text + '”' : 'Type a pillar…', 50, 58, 820, { size: words > 15 ? 15 : 22, font: 'd', w: 800, lh: words > 15 ? 19 : 28, col: text ? C.ink : C.muted });
    if (st.tour) txt(g, PRESETS[i][1], 990, 122, { size: 13, align: 'right', font: 'b', w: 600, col: C.muted });
    // word meter
    const mx = 30, my = 150, mw = 980;
    g.fillStyle = '#e6dcc5'; g.beginPath(); g.roundRect(mx, my, mw, 16, 8); g.fill();
    const seg = (a, b, col) => { const x0 = mx + mw * a / 40, x1 = mx + mw * Math.min(words, b) / 40; if (x1 > x0) { g.fillStyle = col; g.fillRect(x0, my, x1 - x0, 16); } };
    seg(0, 5, '#5fb47c'); seg(5, 15, '#e0a92d'); seg(15, 40, '#e07b72');
    [5, 15].forEach(n => { const x = mx + mw * n / 40; g.fillStyle = C.navy; g.fillRect(x - 1, my - 4, 2, 24); txt(g, n + ' words', x, my + 36, { size: 12, align: 'center', col: C.muted }); });
    // four lamps
    r.slice(0, 4).forEach(([rule, s, tag, why], k) => {
      const x = 30 + (k % 2) * 495, y = 214 + Math.floor(k / 2) * 180, [lab, col, bg] = LAMP[s < 0 ? 3 : s];
      box(g, x, y, 485, 166, { fill: bg, stroke: col, lw: 3 });
      g.fillStyle = col; g.beginPath(); g.arc(x + 44, y + 46, 24, 0, TAU); g.fill();
      txt(g, k + 1, x + 44, y + 47, { size: 20, col: '#fff', align: 'center', base: 'middle' });
      wrap(g, rule, x + 82, y + 40, 280, { size: 17, font: 'd', w: 800, lh: 20 });
      box(g, x + 375, y + 24, 96, 32, { fill: col, r: 16 }); txt(g, lab.toUpperCase(), x + 423, y + 45, { size: 12.5, col: '#fff', align: 'center' });
      txt(g, tag, x + 24, y + 104, { size: 14, font: 'b', w: 700, col });
      wrap(g, why, x + 24, y + 130, 440, { size: 15 });
    });
  }
  SCENE('lint', {
    dur: DUR,
    init(st) {
      st.text = PRESETS[0][0]; st.lb = 'yes';
      const inp = $(st.s, '.pl-text'), sel = $(st.s, '.pl-pre'), lbb = $$(st.s, '.pl-lb .btn');
      sel.innerHTML = PRESETS.map((p, i) => `<option value="${i}">${p[0].length > 40 ? p[0].slice(0, 38) + '…' : p[0]} (${p[1]})</option>`).join('');
      st.setLB = v => { st.lb = v; lbb.forEach(b => b.classList.toggle('on', b.dataset.v === v)); };
      st.load = i => { st.text = PRESETS[i][0]; inp.value = st.text; st.setLB(PRESETS[i][2]); };
      inp.oninput = () => { st.manual(); st.text = inp.value; };
      sel.onchange = () => { st.manual(); st.load(+sel.value); };
      lbb.forEach(b => b.onclick = () => { st.manual(); st.setLB(st.lb === b.dataset.v ? '' : b.dataset.v); });
      st.load(0);
    },
    side(st, t) {
      const i = st.tour ? Math.floor(t / PER) % PRESETS.length : -1;
      if (st.tour && i !== st.ti) { st.ti = i; $(st.s, '.pl-text').value = PRESETS[i][0]; $(st.s, '.pl-pre').value = i; st.setLB(PRESETS[i][2]); }
      const text = st.tour ? PRESETS[i][0] : st.text, k = text + st.lb; if (k === st.k) return; st.k = k;
      const rw = REWRITE[text.trim().toLowerCase()];
      say($(st.s, '.pl-out'), rw ? `<b>One possible rewrite:</b> “${rw}”. ${/combat|exploration/i.test(text) ? 'God of War’s pillars served their purpose, but feature pillars risk isolated teams working in silos.' : ''}` : 'Every rule sounds obvious until you check your own draft against it.');
    },
    draw,
  });
})();
