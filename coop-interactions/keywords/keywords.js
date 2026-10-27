/* Keywords need situations (MGM C3 M6, deck slides 270-285). Slide 2 is the deck's keyword sheets for three WoW tanks
   (slides 275-280), sorted into role, class and spec layers, with Blizzard's class and spec icons. Slide 3 gives four original classes keyword cards and lets
   you build an encounter with sliders (role badges are League of Legends class icons): each keyword's meter shows how much the content asks for it (slide 283: area
   damage needs clustered enemies, taunt needs allies under threat, durability needs dangerous damage, self healing
   needs danger and the breathing room to use it). DEMAND below is the whole model. */
(function () {
  const { $, $$, canvasDemo, demo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;

  /* ---------- slide 2: the deck's sheets ---------- */
  // [keyword, value, layer]
  const SHEETS = {
    warrior: { name: 'Warrior', icon: 'classicon_warrior', spec: ['Protection', 'ability_warrior_defensivestance'], role: 'Tank', rows: [['Durable', '3', 'role'], ['Uncrushable', '✔', 'role'], ['Taunt', '✔', 'role'], ['Slow', '30%', 'class'], ['Interrupt', '✔', 'class'], ['Gap closer', '3', 'class'], ['Has pet', '✗', 'class'], ['Heals others', '✗', 'class'], ['Self healing', '1', 'spec']],
      note: 'It’s a warrior. Durability, uncrushability and taunt are shared by every class that fills the tank role. Slows, interrupts and gap closers are the warrior’s own, in any role; no pet and no healing others, ever.' },
    druid: { name: 'Guardian Druid', icon: 'classicon_druid', spec: ['Guardian', 'ability_racial_bearform'], role: 'Tank', rows: [['Durable', '4', 'role'], ['Uncrushable', '✔', 'role'], ['Taunt', '✔', 'role'], ['Slow', '10%', 'class'], ['Interrupt', '✔', 'class'], ['Gap closer', '1', 'class'], ['Has pet', '✗', 'class'], ['Heals others', '✔', 'class'], ['Self healing', '3', 'spec']],
      note: 'Still highly durable, uncrushable and able to taunt: the role is met. But only one gap closer and far more self healing. Keywords let each class meet the role and still sit in its own niche.' },
    dk: { name: 'Blood Death Knight', icon: 'classicon_deathknight', spec: ['Blood', 'spell_deathknight_bloodpresence'], role: 'Tank', rows: [['Durable', '4', 'role'], ['Uncrushable', '✔', 'role'], ['Taunt', '✔', 'role'], ['Slow', '10%', 'class'], ['Interrupt', '✔', 'class'], ['Gap closer', '3', 'class'], ['Has pet', '✔', 'class'], ['Heals others', '✗', 'class'], ['Self healing', '1', 'spec']],
      note: 'Similar tools again, but here pet access is a class feature, and the spec carries its own healing. It keeps the core role keywords, so the role is still filled.' },
  };
  const LAYER = { role: ['Role', 'shared by every tank'], class: ['Class', 'the class in any role'], spec: ['Spec', 'this specialisation only'] };
  demo('sheet', {
    init(s) {
      const st = { k: 'warrior', sorted: false, guessed: false };
      const tabs = $(s, '.ks-tabs'), sheet = $(s, '.ks-sheet'), guess = $(s, '.ks-guess'), out = $(s, '.ks-out');
      tabs.innerHTML = Object.entries(SHEETS).map(([k, v], i) => `<button class="ks-tab" data-k="${k}">Sheet ${i + 1}</button>`).join('');
      guess.innerHTML = `<h4>Which class is it?</h4>` + Object.entries(SHEETS).map(([k, v]) => `<button class="ks-g" data-k="${k}"><img src="img/wow-${v.icon}.jpg" alt="">${v.name}</button>`).join('');
      // a fixed shuffle so "mixed up" looks random but is the same every time
      const MIX = [4, 0, 7, 2, 5, 8, 1, 6, 3];
      function paint() {
        const S = SHEETS[st.k];
        $$(tabs, '.ks-tab').forEach(b => { b.classList.toggle('on', b.dataset.k === st.k); b.textContent = st.guessed || b.dataset.k !== st.k ? `Sheet ${Object.keys(SHEETS).indexOf(b.dataset.k) + 1}` : b.textContent; });
        const cell = ([n, v, l]) => `<div class="kw ${st.sorted ? l : ''} ${v === '✗' ? 'no' : ''}"><span>${n}</span><b>${v}</b></div>`;
        sheet.innerHTML = st.sorted
          ? ['role', 'class', 'spec'].map(l => `<div class="layer ${l}"><div class="lh">${l === 'class' && st.guessed ? `<img src="img/wow-${S.icon}.jpg" alt="">` : l === 'spec' && st.guessed ? `<img src="img/wow-${S.spec[1]}.jpg" alt="">` : ''}<b>${LAYER[l][0]}</b><small>${l === 'spec' && st.guessed ? S.spec[0] + ' only' : LAYER[l][1]}</small></div><div class="lk">${S.rows.filter(r => r[2] === l).map(cell).join('')}</div></div>`).join('')
          : `<div class="cloud">${MIX.map(i => cell(S.rows[i])).join('')}</div>`;
        $$(guess, '.ks-g').forEach(b => { b.classList.toggle('yes', st.guessed && b.dataset.k === st.k); });
        say(out, st.guessed ? `<b>${S.name}.</b> ${S.note}` : 'A random scattering of keywords from one class. The exact keywords aren’t the point: they convey what the class can access, and how well.');
        $(s, '.ks-sort').classList.toggle('on', st.sorted);
      }
      $$(tabs, '.ks-tab').forEach(b => b.onclick = () => { st.k = b.dataset.k; st.guessed = false; st.sorted = false; paint(); });
      $$(guess, '.ks-g').forEach(b => b.onclick = () => { if (b.dataset.k === st.k) { st.guessed = true; st.sorted = true; } else { b.classList.add('nope'); setTimeout(() => b.classList.remove('nope'), 500); } paint(); });
      $(s, '.ks-sort').onclick = () => { st.sorted = true; paint(); };
      $(s, '.ks-mix').onclick = () => { st.sorted = false; paint(); };
      paint();
    },
  });

  /* ---------- slide 3: the model ---------- */
  const SIT = [
    ['cluster', 'Clustered enemies', 'packs standing close together'],
    ['damage', 'Dangerous damage', 'hits that can kill'],
    ['casters', 'Enemy casters', 'spells worth stopping'],
    ['adds', 'Adds chasing allies', 'threats on the squishy ones'],
    ['elite', 'Lone elite', 'one high-value target'],
  ];
  // how much a situation asks for each keyword, 0..1
  const DEMAND = {
    'Area damage': x => x.cluster,
    'Taunt': x => x.adds,
    'Durable': x => x.damage,
    'Heals others': x => x.damage * .9,
    'Self healing': x => x.damage * (1 - .6 * x.adds),
    'Interrupt': x => x.casters,
    'Slow': x => x.adds * .8 + x.cluster * .2,
    'Stun': x => Math.max(x.casters * .6, x.elite * .7),
    'Burst': x => x.elite,
    'Stealth': x => x.elite * .7 + x.casters * .3,
    'Gap closer': x => Math.max(x.casters * .7, x.elite * .6),
    'Escapes': x => x.damage * .5 + x.adds * .5,
  };
  const CLASSES = [
    { name: 'Warden', role: 'Tank', icon: 'tank', col: C.player, kws: [['Durable', '4', 'role'], ['Taunt', '✔', 'role'], ['Interrupt', '✔', 'class'], ['Gap closer', '2', 'spec']] },
    { name: 'Pyromancer', role: 'Mage', icon: 'mage', col: '#e8641c', kws: [['Area damage', '5', 'role'], ['Slow', '30%', 'class'], ['Interrupt', '✔', 'class'], ['Self healing', '0', 'spec']] },
    { name: 'Cleric', role: 'Enchanter', icon: 'support', col: C.p2, kws: [['Heals others', '4', 'role'], ['Self healing', '2', 'class'], ['Stun', '✔', 'class'], ['Escapes', '1', 'spec']] },
    { name: 'Stalker', role: 'Assassin', icon: 'assassin', col: C.p3, kws: [['Burst', '5', 'role'], ['Stealth', '✔', 'class'], ['Gap closer', '3', 'class'], ['Escapes', '2', 'spec']] },
  ];
  const PRESETS = [
    ['Trash pull', { cluster: 1, damage: .3, casters: 0, adds: .6, elite: 0 }],
    ['Boss', { cluster: 0, damage: 1, casters: 0, adds: 0, elite: 1 }],
    ['Caster pack', { cluster: .5, damage: .5, casters: 1, adds: .3, elite: 0 }],
    ['Harmless pack', { cluster: 0, damage: 0, casters: 0, adds: 0, elite: 0 }],
  ];
  // a keyword with a zero weight never matters, whatever the content asks
  const useful = (kw, x) => (kw[1] === '0' || kw[1] === '✗') ? 0 : clamp(DEMAND[kw[0]](x));

  // the encounter, drawn from the sliders: where enemies stand, who casts, who chases whom
  function encounter(g, x, t, o = {}) {
    T.use(g);
    const W = 900, H = 300;
    T.floor(0, 0, W, H); T.wall(0, 0, W, 18); T.wall(0, H - 18, W, 18);
    const party = [[160, 110, C.player], [120, 190, '#e8641c'], [210, 220, C.p2], [230, 150, C.p3]];
    // red wash for dangerous damage
    if (x.damage > .05) { g.fillStyle = `rgba(229,50,45,${.12 * x.damage + .04 * x.damage * Math.sin(t * 4)})`; g.fillRect(0, 0, W, H); }
    // the pack: spread out or clustered
    const n = 6;
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2 + t * .3, r = lerp(110, 30, x.cluster);
      const px = 600 + Math.cos(a) * r, py = 150 + Math.sin(a) * r * .7;
      if (i < Math.round(x.casters * 3)) {
        T.foe(px, py, 16, Math.PI, '#b33bd0', { mark: 'staff', edge: '#6e1f80' });
        if (Math.sin(t * 3 + i) > .3) { g.strokeStyle = 'rgba(179,59,208,.7)'; g.lineWidth = 3; g.beginPath(); g.arc(px, py, 22, -Math.PI / 2, -Math.PI / 2 + (t * 2 + i) % 1 * Math.PI * 2); g.stroke(); }
      } else T.foe(px, py, 16, Math.PI, C.red, { mark: 'horns' });
    }
    if (x.cluster > .6 && !o.quiet) T.label('clustered', 600, 268, 'center', C.redDk, 14);
    // adds chasing the healer
    const nAdds = Math.round(x.adds * 3);
    for (let i = 0; i < nAdds; i++) { const k = (t * .25 + i * .33) % 1, ax = lerp(470, 250, k), ay = 230 + (i - 1) * 22; T.foe(ax, ay, 12, Math.PI, '#d8452f', {}); }
    if (nAdds && !o.quiet) T.label('adds after the healer', 360, 280, 'center', C.redDk, 14);
    // the lone elite
    if (x.elite > .05) T.foe(790, 150, 22 + 20 * x.elite, Math.PI, '#8a1c15', { mark: 'horns', a: .4 + .6 * x.elite });
    party.forEach(([px, py, c]) => T.player(px, py, 0, .8, 1, c));
  }

  canvasDemo('title', (s, cv, g) => (dt, t) => { const i = Math.floor(t / 3) % PRESETS.length; encounter(g, PRESETS[i][1], t, { quiet: true }); });

  let api = null;
  canvasDemo('board', (s, cv, g) => {
    const st = { x: { ...PRESETS[0][1] }, tour: true, tt: 0, t: 0, held: false };
    const pre = $(s, '.kb-presets'), sls = $(s, '.kb-sliders'), cards = $(s, '.kb-cards');
    pre.innerHTML = PRESETS.map(([n], i) => `<button class="kb-pre" data-i="${i}">${n}</button>`).join('');
    sls.innerHTML = SIT.map(([k, n, d]) => `<label><span>${n} <small>${d}</small></span><input type="range" min="0" max="100" data-k="${k}"></label>`).join('');
    cards.innerHTML = CLASSES.map((c, ci) => `<div class="kc" style="--c:${c.col}"><div class="kh"><img src="img/lol-${c.icon}.png" alt=""><b>${c.name}</b><span>${c.role}</span></div>` +
      c.kws.map(([n, v, l], ki) => `<div class="kr" data-c="${ci}" data-k="${ki}"><span class="ly ${l}">${l}</span><span class="kn">${n}</span><b>${v}</b><div class="m"><i></i></div><em></em></div>`).join('') + '</div>').join('');
    $$(pre, '.kb-pre').forEach(b => b.onclick = () => { st.tour = false; st.x = { ...PRESETS[+b.dataset.i][1] }; });
    $$(sls, 'input').forEach(el => el.oninput = () => { st.tour = false; st.x[el.dataset.k] = el.value / 100; });
    const DT = 5;
    function render() {
      let x = st.x;
      if (st.tour) {
        // glide from one preset to the next
        const n = PRESETS.length, f = (st.tt / DT) % n, i = Math.floor(f), k = ease(clamp((f - i - .7) / .3));
        const a = PRESETS[i][1], b = PRESETS[(i + 1) % n][1];
        x = Object.fromEntries(SIT.map(([key]) => [key, lerp(a[key], b[key], k)]));
        st.x = x;
      }
      g.clearRect(0, 0, cv.width, cv.height);
      encounter(g, x, st.t);
      $$(sls, 'input').forEach(el => { if (document.activeElement !== el) el.value = Math.round(x[el.dataset.k] * 100); });
      $$(pre, '.kb-pre').forEach((b, i) => b.classList.toggle('on', SIT.every(([k]) => Math.abs(PRESETS[i][1][k] - x[k]) < .02)));
      $$(cards, '.kr').forEach(r => {
        const kw = CLASSES[+r.dataset.c].kws[+r.dataset.k], u = useful(kw, x);
        r.querySelector('i').style.width = `${Math.round(u * 100)}%`;
        r.classList.toggle('dead', u < .08); r.classList.toggle('hot', u > .7);
        r.querySelector('em').textContent = kw[1] === '0' ? 'weight 0' : u < .08 ? 'never matters here' : u > .7 ? 'in demand' : '';
      });
    }
    api = { seek(t) { st.held = true; st.tour = true; st.tt = t; st.t = t; render(); }, dur: () => DT * PRESETS.length };
    return dt => { dt = dt || 0; if (!st.held) { st.tt += dt; st.t += dt; } render(); };
  });

  window.__seek = t => api.seek(t);
  window.__dur = () => api.dur();
})();
