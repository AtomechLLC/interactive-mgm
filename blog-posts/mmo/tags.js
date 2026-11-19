/* Write the tag rule (genre breakdown: "MMO Game Design"), a lesson-richness spike for slide 2.
   Slide 1 compares open world and instance. This slide hands the learner the rules a live MMO actually tunes for one
   rare spawn in the open world: who gets credit (first tag, or everyone who hits it), the respawn timer, a layer cap
   (the server splits the zone into copies once it holds that many players), and whether the monster's health grows
   with the number of attackers. Six readouts move together and no setting keeps them all in range: every rule buys
   one thing with another. The model is a per-hour average, not a simulation; every rate is illustrative.
     layers = ceil(players / cap), p = players per layer, contesters per spawn c = min(p, 1 + 0.35 p)
     first tag: one kill per spawn, the other c - 1 lose the tag. Shared: all c get credit and fight side by side.
     fight length = 60 s of solo damage / attackers (x attackers again when health scales). */
(function () {
  const C = TD.C, { clamp, lerp } = TD;
  const HPSEC = 60;
  function model(o) {
    const layers = o.cap ? Math.max(1, Math.ceil(o.n / o.cap)) : 1, p = o.n / layers;
    const c = Math.min(p, 1 + .35 * p), S = 60 / o.respawn;
    const shared = o.rule === 'shared';
    const kph = shared ? S * c / p : S / p;                       // kills per player per hour
    return {
      layers, p, c,
      wait: 60 / kph,                                             // minutes to a first kill, on average
      seen: p,                                                    // players you share the zone with
      allies: shared ? S * c * (c - 1) / p : 0,                   // strangers you fought beside, per hour
      lost: shared ? 0 : S * (c - 1) / p,                         // spawns you engaged and someone else got, per hour
      drops: layers * S * (shared ? c : 1),                       // rare drops entering the server's economy, per hour
      fight: shared ? (o.scale ? HPSEC : HPSEC / c) : HPSEC,      // seconds the monster survives once engaged
    };
  }
  const fmt = v => v >= 100 ? Math.round(v) : v >= 10 ? v.toFixed(0) : v.toFixed(1);
  // [key, label, unit, band(v) -> 0 in range, 1 strained, 2 broken, note per band]
  const ROWS = [
    ['wait', 'Wait for your first kill', 'min', v => v <= 30 ? 0 : v <= 90 ? 1 : 2, ['a fair turn', 'a long queue', 'most players never get it']],
    ['seen', 'Players around you', '', v => v < 8 ? 2 : v <= 25 ? 0 : 1, ['a living world', 'a crowd', 'the world feels empty']],
    ['allies', 'Strangers you fought beside / hr', '', v => v >= 1 ? 0 : 1, ['others are help', 'others are only rivals', '']],
    ['lost', 'Tags you lost to someone else / hr', '', v => v < .5 ? 0 : v < 2 ? 1 : 2, ['no losing to a stranger', 'some resentment', 'kill-stealing all day']],
    ['drops', 'Rare drops entering the economy / hr', '', v => v <= 15 ? 0 : v <= 40 ? 1 : 2, ['still rare', 'getting common', 'no longer rare']],
    ['fight', 'How long the fight lasts', 's', v => v >= 30 ? 0 : v >= 10 ? 1 : 2, ['a real fight', 'over quickly', 'dead before anyone plays it']],
  ];
  const COL = [C.good, C.goldInk, C.redDk], FILL = ['#d8f0df', '#fde9b8', '#f9d9d6'];

  GK.scene('tags', (s, g, ui) => {
    const nEl = s.querySelector('.tg-n'), nv = s.querySelector('.tg-nv'), rEl = s.querySelector('.tg-r'), rv = s.querySelector('.tg-rv');
    const ruleBtns = [...s.querySelectorAll('.tg-rule .btn')], capBtns = [...s.querySelectorAll('.tg-cap .btn')], scEl = s.querySelector('.tg-scale');
    const st = { n: 40, rule: 'first', respawn: 5, cap: 0, scale: false };
    const sync = () => {
      nEl.value = st.n; nv.textContent = st.n + ' players'; rEl.value = st.respawn; rv.textContent = st.respawn + ' min';
      ruleBtns.forEach(b => b.classList.toggle('on', b.dataset.r === st.rule)); capBtns.forEach(b => b.classList.toggle('on', +b.dataset.c === st.cap));
      scEl.checked = st.scale; scEl.disabled = st.rule !== 'shared';
    };
    nEl.oninput = () => { st.n = +nEl.value; sync(); }; rEl.oninput = () => { st.respawn = +rEl.value; sync(); };
    ruleBtns.forEach(b => b.onclick = () => { st.rule = b.dataset.r; sync(); }); capBtns.forEach(b => b.onclick = () => { st.cap = +b.dataset.c; sync(); });
    scEl.onchange = () => { st.scale = scEl.checked; sync(); };
    ui.watch(nEl, rEl, ruleBtns, capBtns, scEl);
    const ACTS = [
      { to: 6, o: { n: 40, rule: 'first', respawn: 5, cap: 0, scale: false }, say: 'First tag wins, forty players, one spawn: most players never get it, and every spawn makes fourteen people lose to a stranger.' },
      { to: 12, o: { n: 40, rule: 'first', respawn: 5, cap: 15, scale: false }, say: 'Split the zone into layers of 15. Waits fall, but each layer holds 13 people, and three copies of the spawn triple the drops.' },
      { to: 18, o: { n: 40, rule: 'shared', respawn: 5, cap: 0, scale: false }, say: 'One world again, and everyone who hits it gets credit. Strangers become allies and no one loses a tag. The monster dies in 4 seconds and the item floods the market.' },
      { to: 23, o: { n: 40, rule: 'shared', respawn: 5, cap: 0, scale: true }, say: 'Scale its health with the attackers: the fight is a fight again. The drops are still flooding.' },
      { to: 30, o: { n: 40, rule: 'shared', respawn: 15, cap: 0, scale: true }, say: 'A 15-minute respawn pulls the drops down and puts the wait back up. Every rule bought one thing with another.' },
    ];
    sync();
    return {
      dur: 30,
      frame(t, tour) {
        let say = '';
        if (tour) { const [a] = GK.act(ACTS, t); Object.assign(st, a.o); say = a.say; sync(); }
        const m = model(st);
        GK.panel(g);
        // the zone: one layer's players around the spawn
        const zx = 16, zy = 40, zw = 420, zh = 300, cx = zx + zw / 2, cy = zy + zh / 2;
        GK.head(g, m.layers > 1 ? `One of ${m.layers} layers: ${Math.round(m.p)} players` : `One zone: ${st.n} players`, zx, 28);
        for (let L = Math.min(m.layers, 4) - 1; L > 0; L--) { g.fillStyle = 'rgba(127,176,105,.45)'; g.beginPath(); g.roundRect(zx + L * 7, zy - L * 7, zw, zh, 10); g.fill(); }
        g.fillStyle = '#7fb069'; g.beginPath(); g.roundRect(zx, zy, zw, zh, 10); g.fill();
        const cyc = (t % 6) / 6, engaged = cyc > .15 && cyc < .7, k = clamp((cyc - .15) / .2);
        const R = GK.rng(st.n * 13 + st.cap), np = Math.round(m.p), nc = Math.round(m.c), win = Math.floor(R() * nc);
        for (let i = 0; i < np; i++) {
          const a = R() * 6.283, d = 50 + R() * 90, near = i < nc, pull = near && engaged ? k * .62 : 0;
          const px = cx + Math.cos(a) * d * (1 - pull), py = cy + Math.sin(a) * d * .78 * (1 - pull);
          let col = C.player;
          if (near && cyc > .5 && cyc < .7) col = st.rule === 'shared' ? C.gold : i === win ? C.gold : C.red;
          TD.player(px, py, a + Math.PI, .48, 1, col);
        }
        if (cyc < .7) TD.foe(cx, cy, 20, 0, C.purple, { mark: 'horns' });
        else TD.label(`respawns in ${st.respawn} min`, cx, cy, 'center', C.navy, 13);
        if (cyc > .5 && cyc < .7) TD.label(st.rule === 'shared' ? `${nc} players share the kill` : `1 gets it, ${nc - 1} lose the tag`, cx, zy + zh - 16, 'center', C.navy, 13);
        // rule summary
        const lines = [
          st.rule === 'shared' ? 'Credit: everyone who hits it' : 'Credit: whoever tags it first',
          `Respawn: every ${st.respawn} min${m.layers > 1 ? `, in each of ${m.layers} layers` : ''}`,
          st.rule === 'shared' ? (st.scale ? 'Health grows with attackers' : 'Health is fixed') : 'Health is fixed',
        ];
        lines.forEach((l, i) => GK.text(g, l, zx, zy + zh + 24 + i * 19, C.ink, 13, 'left', 600));
        // readouts
        const rx = 462, rw = 562;
        GK.head(g, 'What this rule set does, per player', rx, 28);
        let broken = 0;
        ROWS.forEach(([key, label, unit, band, notes], i) => {
          const v = m[key], b = band(v), y = 42 + i * 58; if (b === 2) broken++;
          GK.box(g, rx, y, rw, 50, FILL[b], null, 8);
          g.fillStyle = COL[b]; g.fillRect(rx, y, 6, 50);
          GK.text(g, label, rx + 16, y + 21, C.ink, 13, 'left', 700);
          GK.text(g, notes[b], rx + 16, y + 40, COL[b], 12, 'left', 700);
          GK.head(g, `${fmt(v)}${unit ? ' ' + unit : ''}`, rx + rw - 14, y + 34, 'right', COL[b], 22);
        });
        GK.wrap(g, say || (broken === 0 ? 'Every readout is in range at once. Now try a different player count: the same rules will not hold.' : `${broken} readout${broken > 1 ? 's are' : ' is'} out of range. Fixing one usually moves another.`), 20, 470, 1000, 22, C.ink, 17, 700);
        GK.wrap(g, 'Slide 1 asked whether to share the world. A live MMO answers with rules like these, and each rule decides whether the player next to you is a rival or a help.', 20, 548, 1000, 18, C.muted, 13);
        ui.stats(`<div class="${m.wait <= 30 ? 'g' : m.wait <= 90 ? 'y' : 'r'}"><b>${fmt(m.wait)} min</b><span>to a first kill</span></div><div class="${m.drops <= 15 ? 'g' : m.drops <= 40 ? 'y' : 'r'}"><b>${fmt(m.drops)}</b><span>rare drops an hour, server-wide</span></div>`);
        ui.out(st.rule === 'shared' ? 'Shared credit turns rivals into allies; the bill comes as fight length and rarity.' : 'First tag keeps the item rare; the bill comes as waiting and resentment.');
      },
    };
  });
})();
