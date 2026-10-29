/* Keyword reach (MGM C4 M7, deck slides 104-105). "Simply by attaching a keyword to a new skill, you contextually interact
   with existing system." Abilities on the left, keywords in the middle, the world on the right; the rules from keyword to
   world are written once. Add one of the deck's three abilities and every rule its keywords reach lights up, with no new rule
   written. Add a new keyword instead and nothing responds until someone writes its rules. The world's rules live in
   forge-data.js, shared with the forge. */
(function () {
  const { $, $$ } = FPF.kit;
  const { icon, text, card, chip, TONE, panel, scene, clamp, ease } = CK;
  const C = TD.C, F = window.FORGE;
  const OLD = [['Fireball', 'wow-spell_fire_flamebolt.jpg', ['Burn']], ['Lightning Bolt', 'wow-spell_nature_lightning.jpg', ['Shock']], ['Healing Wave', 'wow-spell_nature_healingwavegreater.jpg', ['Heal']]];
  const NEW = F.PRESETS.map(p => [p.name, F.PACKS[p.pack].icon, p.keys]);
  const KEYS = ['Burn', 'Shock', 'Heal', 'Drain', 'Lifesteal', 'Extinguish', 'Stealth', 'Wet', 'Freeze'];
  const FREEZE = { demon: 'frost douses it', field: 'frost kills the crops' };   // the new keyword's rules, once written
  const AXc = 136, KX = 470, WX = 868, AY = i => 74 + i * 62, KY = i => 64 + i * 56, WY = i => 62 + i * 64;
  const DUR = 27.5;
  const STEPS = [[2, 0], [7, 1], [12, 2]];   // [time, new ability]
  const rule = (k, th) => k === 'Freeze' ? FREEZE[th.k] : th.rules[k];

  function view(t, st, tour) {
    if (!tour) return st;
    const on = STEPS.filter(s => t >= s[0]).map(s => s[1]), last = on.length ? STEPS[on.length - 1] : null;
    return { on, mine: [], fresh: t < 17.5 ? (last ? last[1] : null) : null, freshT: last ? last[0] : -9, freeze: t >= 17.5 ? (t >= 20 ? 2 : 1) : 0, freezeT: t >= 20 ? 20 : 17.5, end: t >= 24.5 ? t - 24.5 : -1 };
  }
  // interactions an ability's keywords reach: [keyword, thing index]
  const reach = keys => { const out = []; keys.forEach(k => F.THINGS.forEach((th, j) => { if (rule(k, th)) out.push([k, j]); })); return out; };

  scene('keyword-reach', {
    dur: DUR,
    state: () => ({ on: [], mine: [], fresh: null, freshT: -9, freeze: 0, freezeT: -9 }),
    init(s, st, api) {
      const take = () => { if (st.tour) { api.manual(); Object.assign(st, { on: [], mine: [], fresh: null, freeze: 0 }); } };
      const ab = $(s, '.kr-abil'), ky = $(s, '.kr-keys'), nk = $(s, '.kr-new');
      ab.innerHTML = NEW.map((a, i) => `<button class="btn" data-i="${i}">+ ${a[0]}</button>`).join('');
      ky.innerHTML = KEYS.slice(0, 8).map(k => `<button class="btn" data-k="${k}">${k}</button>`).join('');
      $$(ab, '.btn').forEach(b => b.onclick = () => { take(); const i = +b.dataset.i; st.on = st.on.includes(i) ? st.on.filter(x => x !== i) : [...st.on, i]; st.fresh = st.on.includes(i) ? i : null; st.freshT = st.t; sync(); });
      $$(ky, '.btn').forEach(b => b.onclick = () => { take(); const k = b.dataset.k; st.mine = st.mine.includes(k) ? st.mine.filter(x => x !== k) : [...st.mine, k]; st.fresh = 'mine'; st.freshT = st.t; sync(); });
      nk.onclick = () => { take(); st.freeze = (st.freeze + 1) % 3; st.freezeT = st.t; st.fresh = null; sync(); };
      function sync() {
        $$(ab, '.btn').forEach(b => b.classList.toggle('on', st.on.includes(+b.dataset.i)));
        $$(ky, '.btn').forEach(b => b.classList.toggle('on', st.mine.includes(b.dataset.k)));
        nk.textContent = ['+ A new keyword: [Freeze]', '✎ Write [Freeze]’s rules', '✕ Remove [Freeze]'][st.freeze];
      }
      sync();
    },
    draw(g, t, st, tour) {
      const v = view(t, st, tour);
      const abil = [...OLD.map(a => ({ a, old: true })), ...NEW.map((a, i) => ({ a, i, on: v.on.includes(i) }))];
      if (v.mine.length) abil.push({ a: ['Your ability', null, v.mine], i: 'mine', on: true });
      const fk = v.fresh, fresh = fk == null ? null : fk === 'mine' ? v.mine : NEW[fk][2];
      const grow = ease(clamp((t - v.freshT) / 1.2));
      const lit = fresh ? reach(fresh) : [];
      const keysShown = KEYS.filter(k => k !== 'Freeze' || v.freeze);
      const ky = k => KY(keysShown.indexOf(k));
      text(g, 'Abilities', AXc, 26, { size: 17, w: 800, display: true, col: C.navy });
      text(g, 'Keywords', KX, 26, { size: 17, w: 800, display: true, col: C.navy });
      text(g, 'The world: rules written once', WX, 26, { size: 17, w: 800, display: true, col: C.navy });
      // rules: keyword -> world, faint unless the new ability reaches them
      keysShown.forEach(k => F.THINGS.forEach((th, j) => {
        if (!rule(k, th)) return;
        const hot = lit.some(([lk, lj]) => lk === k && lj === j), isF = k === 'Freeze';
        const a = isF ? ease(clamp((t - v.freezeT) / .8)) * (v.freeze === 2 ? 1 : 0) : 1;
        if (!a) return;
        g.save(); g.globalAlpha = a; g.strokeStyle = hot ? `rgba(224,169,45,${.35 + .65 * grow})` : isF ? C.red : 'rgba(150,140,115,.28)'; g.lineWidth = hot ? 2 + 3 * grow : isF ? 3 : 1.5;
        const x0 = KX + 62, y0 = ky(k), x1 = WX - 140, y1 = WY(j);
        g.beginPath(); g.moveTo(x0, y0); g.bezierCurveTo(x0 + 80, y0, x1 - 80, y1, hot ? x0 + (x1 - x0) * Math.min(1, grow * 1.4) : x1, hot ? y0 + (y1 - y0) * Math.min(1, grow * 1.4) : y1); g.stroke(); g.restore();
      }));
      // ability -> keyword
      abil.forEach((A, i) => {
        if (!A.old && !A.on) return;
        const isFresh = A.i === fk && fk != null, a = isFresh ? grow : 1;
        A.a[2].forEach(k => { g.save(); g.globalAlpha = a; g.strokeStyle = isFresh ? C.gold : A.old ? 'rgba(150,140,115,.5)' : 'rgba(85,98,235,.45)'; g.lineWidth = isFresh ? 4 : 2; g.beginPath(); g.moveTo(AXc + 112, AY(i)); g.bezierCurveTo(AXc + 180, AY(i), KX - 140, ky(k), KX - 62, ky(k)); g.stroke(); g.restore(); });
      });
      // ability cards
      abil.forEach((A, i) => {
        const [n, ic] = A.a, on = A.old || A.on, isFresh = A.i === fk && fk != null;
        card(g, AXc, AY(i), 224, 52, { edge: isFresh ? C.gold : on ? (A.old ? '#cdbf9f' : C.blue) : '#d8cfb8', lw: isFresh ? 4 : 2, dash: on ? [] : [6, 5], fill: on ? '#fffaf0' : 'rgba(255,250,240,.45)', shadow: on });
        if (ic) icon(g, ic, AXc - 86, AY(i), 36, { grey: !on, lw: 2 }); else { g.fillStyle = C.gold; g.beginPath(); g.arc(AXc - 86, AY(i), 18, 0, Math.PI * 2); g.fill(); text(g, '?', AXc - 86, AY(i) + 1, { size: 20, w: 800, col: '#fff' }); }
        text(g, n, AXc - 60, AY(i) - 9, { align: 'left', size: 14.5, w: 800, col: on ? C.ink : C.muted });
        text(g, A.old ? 'already in the game' : A.a[2].map(k => `[${k}]`).join(' '), AXc - 60, AY(i) + 11, { align: 'left', size: 11.5, col: C.muted });
      });
      // keyword chips
      keysShown.forEach(k => {
        const isF = k === 'Freeze', a = isF ? ease(clamp((t - v.freezeT) / .5)) : 1, hot = fresh && fresh.includes(k);
        chip(g, `[${k}]`, KX, ky(k), { ...(isF ? TONE.red : TONE[F.tone(k)]), size: 15, width: 124, a: isF && v.freeze === 1 && !st.tour ? 1 : a, lw: hot ? 4 : 2, edge: hot ? C.gold : undefined });
        if (isF && v.freeze === 1) text(g, 'no rules yet', KX, ky(k) + 22, { size: 12, col: C.redDk, it: true });
      });
      // world things
      F.THINGS.forEach((th, j) => {
        const hits = lit.filter(l => l[1] === j), y = WY(j);
        const fz = v.freeze === 2 && FREEZE[th.k];
        card(g, WX, y, 280, 54, { edge: hits.length && grow > .7 ? C.gold : fz ? C.red : '#cdbf9f', lw: hits.length ? 4 : 2 });
        if (th.icon) icon(g, th.icon, WX - 112, y, 36, { lw: 2 }); else { g.fillStyle = th.col; g.beginPath(); g.arc(WX - 112, y, 18, 0, Math.PI * 2); g.fill(); GI.draw(g, th.gi, WX - 112, y, 24, '#fff'); }
        text(g, th.name, WX - 86, y - 10, { align: 'left', size: 14.5, w: 800 });
        const note = hits.length && grow > .7 ? hits.map(([k]) => rule(k, th)).join('; ') : fz ? FREEZE[th.k] : Object.keys(th.rules).map(k => `[${k}]`).join(' ');
        text(g, note.length > 40 ? note.slice(0, 39) + '…' : note, WX - 86, y + 11, { align: 'left', size: 11.5, col: hits.length && grow > .7 ? C.goldInk : fz ? C.redDk : C.muted, w: hits.length ? 700 : 500 });
      });
      // the counter
      const freezeMode = v.freeze && fk == null;
      const gained = freezeMode ? (v.freeze === 2 ? Object.keys(FREEZE).length : 0) : lit.length, rules = freezeMode ? (v.freeze === 2 ? Object.keys(FREEZE).length : 0) : 0;
      panel(g, 18, 436, 240, 136, { title: freezeMode ? 'A new keyword: [Freeze]' : fresh ? (fk === 'mine' ? 'Your ability' : NEW[fk][0]) : 'Add an ability' });
      text(g, `+${gained}`, 78, 494, { size: 40, w: 800, display: true, col: gained ? C.good : C.muted });
      text(g, 'interactions', 78, 526, { size: 13, col: C.muted });
      text(g, `${rules}`, 196, 494, { size: 40, w: 800, display: true, col: rules ? C.redDk : C.good });
      text(g, 'new rules written', 196, 526, { size: 13, col: C.muted });
      if (v.end >= 0) TD.use(g), TD.stamp('Reuse a keyword: depth for free', 520, 548, C.good, clamp(v.end / .4), 24);
    },
    side(t, st, tour) {
      const v = view(t, st, tour);
      const all = [...v.on.map(i => NEW[i][2]), ...(v.mine.length ? [v.mine] : [])].reduce((n, ks) => n + reach(ks).length, 0);
      const stats = `<div class="g"><b>${all}</b><span>interactions from the new abilities</span></div><div class="y"><b>${v.freeze === 2 ? 2 : 0}</b><span>rules written for them</span></div>`;
      let out = 'Low labor investment + clear attributes that matter = relevant depth at scale. Add an ability and count what it reaches.';
      if (v.freeze === 1) out = 'A new keyword reaches nothing. Every interaction it has will be a rule someone writes, tests and maintains.';
      else if (v.freeze === 2 && v.fresh == null) out = 'Two rules written, two interactions. A new keyword costs one rule per interaction; a reused one costs none.';
      else if (v.fresh != null) { const ks = v.fresh === 'mine' ? v.mine : NEW[v.fresh][2]; out = `<b>${v.fresh === 'mine' ? 'Your ability' : NEW[v.fresh][0]}</b> reaches ${reach(ks).length} things through ${ks.map(k => `[${k}]`).join(' ')}, and no one wrote a new rule.`; }
      return { stats, out };
    },
  });
})();
