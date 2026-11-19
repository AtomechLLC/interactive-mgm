/* Mix and match: the article's point is that an enemy is a handful of attributes, with triggers switching between the ones
   that conflict. This slide runs the article's nine worked enemies and its four experiments as their attribute loops, side
   by side. The article writes "Bouncer" for Myu and Tweeter, a name its lists do not define; both hop, so it is read here
   as Jumper. when: marks an attribute that only switches on at that trigger. */
(function () {
  const { $, $$ } = FPF.kit;
  const { text, wrap, chip, TONE, scene } = CK;
  const { A, LOOP, tile } = RA, C = TD.C;
  const R = [
    { n: 'Myu', src: 'Zelda II: The Adventure of Link', parts: ['hardToHit', 'jumper', 'roamer'], note: 'A tiny hopping spike. Small and erratic is what makes a low-health enemy worth a second look.' },
    { n: 'Medusa Head', src: 'Castlevania', parts: ['waver', 'geoignore'], note: 'A wave that no wall interrupts. It is placed over pits, where the wave’s timing is the whole problem.' },
    { n: 'Tweeter', src: 'Super Mario Bros. 2', parts: ['jumper', 'geomimic'], note: 'It hops, and you can stand on it: the threat is also a ride and a thing to pick up.' },
    { n: 'Wizzrobe', src: 'The Legend of Zelda', parts: ['liner', 'teleporter', 'emitter'], note: 'It appears, lines up, fires and is gone. Three attributes, each one simple on its own.' },
    { n: 'Patra', src: 'The Legend of Zelda', parts: ['segmented', 'roamer', 'hardToHit'], note: 'A ring of small eyes around a core. You take the ring apart while the whole thing wanders.' },
    { n: 'Sledge Bro', src: 'Super Mario Bros. 3', parts: ['roamer', 'jumper', 'sapper'], note: 'Its landing takes away your ability to act. The jump you read is the tell for the stun.' },
    { n: 'Piranha Plant', src: 'Super Mario Bros.', parts: ['hider', 'riser', 'ducker', 'emitter'], when: { hider: 'when: the player is near' }, note: 'Four attributes on a pipe. Proximity triggers the hiding; the fire-spitting kinds add Emitter.' },
    { n: 'Golem', src: 'Super Castlevania IV', parts: ['emitter', 'walker', 'jumper', 'shrinker'], when: { shrinker: 'when: hit by the player' }, note: 'A boss that throws, walks and jumps, and gets smaller with each hit you land.' },
    { n: 'Buzz Blob', src: 'A Link to the Past', parts: ['roamer', 'invulnerable', 'sapper'], when: { invulnerable: 'when: random', sapper: 'when: hit by the player' }, note: 'It wanders, turns electric at random, and hitting it in that state is what hurts you. A trigger inside a trigger.' },
    { n: 'Experiment 1', src: 'the article’s own build', parts: ['dasher'], when: { dasher: 'when: the player is near' }, note: 'One attribute and one trigger: it dashes away when you get close. Already a chase.' },
    { n: 'Experiment 2', src: 'the article’s own build', parts: ['waver', 'pacer', 'shielder'], note: 'Crosses the screen on a wave, turns at the screen edge, and can only be hit from behind.' },
    { n: 'Experiment 3', src: 'the article’s own build', parts: ['faller', 'exploder'], note: 'Falls from the ceiling and explodes on landing: a drip with a radius.' },
    { n: 'Experiment 4', src: 'the article’s own build', parts: ['carrier', 'exploder', 'dasher'], when: { dasher: 'when: the player cannot see it' }, note: 'Dashes at you while your back is turned, grabs you, and explodes while holding on.' },
  ];
  scene('ra-mix', {
    dur: LOOP * R.length,
    state: () => ({ i: 0 }),
    init(s, st, api) {
      const el = $(s, '.mx-pick');
      el.innerHTML = R.map((r, i) => `<button class="btn" data-i="${i}">${r.n}</button>`).join('');
      $$(el, '.btn').forEach(b => b.onclick = () => { api.manual(); st.i = +b.dataset.i; });
      st.sync = () => $$(el, '.btn').forEach(b => b.classList.toggle('on', +b.dataset.i === st.i));
    },
    draw(g, t, st, tour) {
      if (tour) st.i = Math.floor(t / LOOP) % R.length;
      const r = R[st.i], n = r.parts.length, x0 = 520 - (n - 1) * 130;
      text(g, r.n, 520, 34, { size: 28, w: 800, display: true });
      text(g, r.src, 520, 64, { size: 14, col: C.muted });
      r.parts.forEach((k, i) => {
        const x = x0 + i * 260, w = r.when && r.when[k];
        if (w) {
          g.save(); g.setLineDash([8, 6]); g.strokeStyle = TONE.gold.edge; g.lineWidth = 3; g.beginPath(); g.roundRect(x - 126, 108, 252, 290, 14); g.stroke(); g.restore();
          chip(g, w, x, 108, { ...TONE.gold, size: 12.5 });
        }
        tile(g, k, x, 215, t);
        if (i) text(g, '+', x - 130, 215, { size: 30, w: 800, col: C.muted, display: true });
      });
      wrap(g, r.note, 520, 448, 760, { size: 18, col: C.ink, align: 'center', lh: 25 });
      R.forEach((_, i) => { g.fillStyle = i === st.i ? C.blue : '#cdbf9f'; g.beginPath(); g.arc(520 + (i - (R.length - 1) / 2) * 16, 540, i === st.i ? 5 : 3.5, 0, Math.PI * 2); g.fill(); });
      st.sync?.();
    },
    side(t, st) {
      const r = R[st.i];
      return { stats: `<b>${r.n}</b> = ${r.parts.map(k => (r.when && r.when[k] ? '[' + r.when[k].replace('when: ', '') + ': ' + A[k].name + ']' : A[k].name)).join(' + ')}`,
        out: 'Each loop keeps running on its own here. In the enemy they share one body, and a trigger decides which of two conflicting attributes is switched on.' };
    },
  });
})();
