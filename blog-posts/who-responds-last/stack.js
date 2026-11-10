/* Who Responds Last (replanned page for the card-game post; Scripture: Decision Trees, Interesting Choices and Tension).
   Five fixed scenes of a generic card duel with a last-in, first-out stack. Each turn: build (play a creature) or hold two
   mana for an instant; if held, choose when to cast it. Outcomes are worked out by hand from the stack order and written
   into each scene. The table is the learner's own choices. */
(function () {
  const C = TD.C;
  // k: B built, HR held and responded, HA held and cast after, HN held and passed
  const SC = [
    { t: 'His Ogre attacks', you: [['Bear', 2, 2]], opp: [['Ogre', 3, 3]], om: 0, oc: 0, inst: 'Growth: +3/+3 until end of turn', ev: 'His 3/3 Ogre attacks. Your 2/2 Bear blocks.', opts: [['HR', 'Cast Growth on your Bear']], evStack: null,
      out: { B: [false, 'No mana left. The Bear dies in the block; the Ogre lives. You do have a second Bear.'], HR: [true, 'Growth resolves: your Bear is 5/5. It kills the Ogre and survives.', ['Growth']], HN: [false, 'You passed. The Bear dies, and two mana went unspent.'] } },
    { t: 'A quiet turn', you: [['Bear', 2, 2]], opp: [['Bear', 2, 2]], om: 0, oc: 0, inst: 'Growth: +3/+3 until end of turn', ev: 'He is tapped out with no cards in hand. He plays nothing and does not attack.', opts: [],
      out: { B: [true, 'He had nothing, and you could see it. You are a creature ahead.'], HN: [false, 'Nothing to respond to. Two mana went unspent and you are a creature behind where you could be.'] } },
    { t: 'He bolts your Bear', you: [['Bear', 2, 2]], opp: [['Ogre', 3, 3]], om: 1, oc: 1, inst: 'Growth: +3/+3 until end of turn', ev: 'He casts Bolt (3 damage) at your Bear. It is on the stack.', evStack: 'Bolt → your Bear', opts: [['HR', 'Respond: Growth on your Bear'], ['HA', 'Let Bolt resolve, then cast Growth']],
      out: { B: [false, 'No mana left. Bolt resolves: the Bear dies. Your new Bear stands alone.'], HR: [true, 'Growth was cast last, so it resolves first: the Bear is 5/5. Then Bolt deals 3. The Bear lives.', ['Growth → your Bear', 'Bolt → your Bear']], HA: [false, 'Bolt resolves first: the Bear is dead. Growth has no target. Same card, same mana, wrong moment.', ['Bolt → your Bear']], HN: [false, 'You passed. The Bear dies and two mana went unspent.'] } },
    { t: 'You bolt his Bear', you: [['Bear', 2, 2]], opp: [['Bear', 2, 2]], om: 1, oc: 1, inst: 'Counter: cancel a spell on the stack', ev: 'You cast Bolt at his Bear. He responds with Growth on it.', evStack: ['Growth → his Bear', 'Bolt → his Bear'], pre: 'You have already cast Bolt at his Bear (free this turn). He has one mana up and one card.', opts: [['HR', 'Respond: Counter his Growth'], ['HA', 'Let Growth resolve, then Counter']],
      out: { B: [false, 'No mana left. Growth resolves first: his Bear is 5/5. Your Bolt deals 3 and does nothing.'], HR: [true, 'Counter was cast last, so it resolves first and cancels Growth. Then Bolt deals 3 to a 2/2. His Bear dies.', ['Counter → Growth', 'Growth → his Bear', 'Bolt → his Bear']], HA: [false, 'Growth has already resolved; there is nothing left to counter. Your Bolt hits a 5/5.', ['Growth → his Bear', 'Bolt → his Bear']], HN: [false, 'You passed. Growth resolves, Bolt fails, two mana unspent.'] } },
    { t: 'He is tapped out', you: [['Bear', 2, 2]], opp: [['Ogre', 3, 3]], om: 0, oc: 0, inst: 'Counter: cancel a spell on the stack', ev: 'He has no untapped mana and no cards. He attacks with nothing and passes.', opts: [],
      out: { B: [true, 'Nothing he could have done needed an answer. You added a creature.'], HN: [false, 'You held a counterspell against an empty hand. Two mana unspent.'] } },
  ];
  const BOTPLAY = [['B'], ['H'], ['H', 'HA'], ['H', 'HR'], ['B']];
  const results = [];

  PLAY.game('stack', {
    dur: 46, keys: ['1', '2', '3', ' '],
    init(o, live) { return { live, t: 0, i: 0, phase: 'main', log: [], at: 0, held: false }; },
    step(st, inp, dt) {
      st.t += dt; const s = SC[st.i], hitK = n => inp.press[String(n)] || inp.click === 'o' + n;
      const settle = k => { const [win, text, stack] = s.out[k]; st.log.push({ k, win, text, stack, unspent: k === 'HN' || k === 'HA' && !win && false ? 2 : k === 'HN' ? 2 : 0 }); st.phase = 'result'; st.at = st.t; if (st.live) { results.length = 0; results.push(...st.log); PLAY.beep(win ? 880 : 170, .14, .15, win ? 'sine' : 'sawtooth'); } };
      if (st.phase === 'end') { if (st.live && inp.click === 'again') Object.assign(st, this.init({}, true)); return; }
      if (st.phase === 'main') { if (hitK(1)) settle('B'); else if (hitK(2)) { st.held = true; if (s.opts.length) { st.phase = 'event'; st.at = st.t; } else settle('HN'); } }
      else if (st.phase === 'event') { s.opts.forEach(([k], n) => { if (st.phase === 'event' && hitK(n + 1)) settle(k); }); if (st.phase === 'event' && hitK(s.opts.length + 1)) settle('HN'); }
      else if (st.phase === 'result' && (inp.press[' '] || inp.click === 'next') && st.t - st.at > .4) { st.i++; st.held = false; st.phase = st.i >= SC.length ? 'end' : 'main'; st.at = st.t; if (st.phase === 'end') st.i = SC.length - 1; }
    },
    bot(st) {
      const P = k => ({ down: {}, press: { [k]: true } }), plan = BOTPLAY[st.i], w = st.t - st.at;
      if (st.phase === 'main') return w > 2.6 ? P(plan[0] === 'B' ? '1' : '2') : null;
      if (st.phase === 'event') return w > 2.4 ? P(String(SC[st.i].opts.findIndex(o => o[0] === plan[1]) + 1)) : null;
      if (st.phase === 'result') return w > 3.2 ? P(' ') : null;
      return null;
    },
    draw(g, st, ui, live) {
      GK.panel(g);
      const s = SC[st.i], L = st.log[st.i], LX = 24, LW = 600, end = st.phase === 'end';
      GK.head(g, `Turn ${st.i + 1} of 5: ${s.t}`, LX, 32, 'left', C.ink, 17);
      GK.box(g, LX, 48, LW, 230, '#23423a', '#23423a', 12, 0);
      const card = (x, y, n, p, t, col) => { GK.box(g, x, y, 84, 62, '#fffaf0', col, 8, 3); GK.text(g, n, x + 42, y + 24, C.ink, 14, 'center', 800); GK.text(g, `${p}/${t}`, x + 42, y + 48, C.ink, 16, 'center', 800); };
      GK.text(g, 'HIM', LX + 16, 72, '#cfe8dc', 11, 'left', 800); s.opp.forEach(([n, p, t], i) => card(LX + 70 + i * 96, 58, n, p, t, C.red));
      GK.text(g, 'untapped mana', LX + 330, 76, '#cfe8dc', 11, 'left', 700); for (let i = 0; i < 2; i++) { g.fillStyle = i < s.om ? '#7ac8ff' : 'rgba(255,255,255,.18)'; g.beginPath(); g.arc(LX + 440 + i * 22, 72, 8, 0, TD.TAU); g.fill(); }
      GK.text(g, 'cards in hand', LX + 330, 104, '#cfe8dc', 11, 'left', 700); GK.text(g, String(s.oc), LX + 440, 106, '#fff', 16, 'left', 800);
      GK.text(g, 'YOU', LX + 16, 222, '#cfe8dc', 11, 'left', 800); s.you.forEach(([n, p, t], i) => card(LX + 70 + i * 96, 200, n, p, t, C.blue));
      if (L && L.k === 'B') card(LX + 166, 200, 'Bear', 2, 2, C.blue);
      GK.text(g, 'your mana', LX + 330, 224, '#cfe8dc', 11, 'left', 700); for (let i = 0; i < 2; i++) { const spent = L ? (L.k === 'B' || L.k === 'HR' || L.k === 'HA') : false; g.fillStyle = spent ? 'rgba(255,255,255,.18)' : '#7ac8ff'; g.beginPath(); g.arc(LX + 440 + i * 22, 220, 8, 0, TD.TAU); g.fill(); }
      GK.text(g, 'in hand: ' + s.inst, LX + 330, 252, '#fff3b0', 12, 'left', 700);
      // the stack
      const stack = L ? L.stack : st.phase === 'event' ? [].concat(s.evStack || []) : null;
      if (stack && stack.length) { GK.text(g, 'THE STACK (top resolves first)', LX + 70, 140, '#cfe8dc', 10, 'left', 800); stack.forEach((c, i) => { GK.box(g, LX + 70 + i * 14, 148 + i * 14, 190, 24, i ? '#e9e2cf' : '#fff3b0', C.navy, 6, 1.5); GK.text(g, `${i + 1}. ${c}`, LX + 80 + i * 14, 165 + i * 14, C.ink, 12, 'left', 700); }); }
      // prompt and choices
      const PY = 300;
      if (st.phase === 'main') {
        GK.wrap(g, s.pre || 'Your main phase. Two mana. A creature costs both.', LX, PY, LW, 19, C.ink, 14, 600);
        ui.btn('o1', '1 · Play a Bear (2 mana)', LX, PY + 40, 290, 50, { px: 14 }); ui.btn('o2', '2 · Hold two mana for the instant', LX + 304, PY + 40, 296, 50, { px: 14 });
      } else if (st.phase === 'event') {
        GK.wrap(g, s.ev, LX, PY, LW, 19, C.ink, 14, 700);
        s.opts.forEach(([k, label], n) => ui.btn('o' + (n + 1), `${n + 1} · ${label}`, LX, PY + 40 + n * 50, 380, 42, { px: 13 }));
        ui.btn('o' + (s.opts.length + 1), `${s.opts.length + 1} · Pass`, LX + 394, PY + 40, 206, 42, { px: 13 });
      } else if (L) {
        GK.wrap(g, (L.k === 'B' || !s.opts.length ? s.ev + ' ' : '') + L.text, LX, PY, LW, 20, L.win ? C.good : C.redDk, 14, 700);
        if (!end) ui.btn('next', st.i < 4 ? 'Space · next turn' : 'Space · see the five', LX, PY + 110, 220, 42, { px: 13 });
        else if (live) ui.btn('again', 'Play the five again', LX, PY + 110, 220, 42, { px: 13 });
      }
      // the table
      const RX = 650, src = live ? results : st.log;
      GK.head(g, live ? 'Your five turns' : 'A scripted player\'s turns', RX, 32, 'left', C.ink, 17);
      ['turn', 'you chose', 'result', 'mana unspent'].forEach((h, i) => GK.text(g, h, RX + [0, 46, 196, 276][i], 60, C.muted, 11, 'left', 700));
      SC.forEach((sc, i) => {
        const y = 90 + i * 44, r = src[i]; GK.text(g, String(i + 1), RX + 8, y, C.ink, 14, 'left', 700);
        if (!r) return;
        GK.text(g, { B: 'built', HR: 'held, responded', HA: 'held, cast after', HN: 'held, passed' }[r.k], RX + 46, y, C.ink, 13, 'left', 700);
        GK.text(g, r.win ? 'ahead' : 'behind', RX + 196, y, r.win ? C.good : C.redDk, 13, 'left', 800); GK.text(g, String(r.unspent), RX + 300, y, r.unspent ? C.redDk : C.ink, 14, 'left', 700);
        GK.text(g, sc.t, RX + 46, y + 15, C.muted, 10, 'left', 500);
      });
      // side panel
      const wins = src.filter(r => r.win).length, un = src.reduce((a, r) => a + r.unspent, 0), late = src.filter(r => r.k === 'HA').length, who = live ? 'You' : 'The scripted player';
      ui.stats(`<div class="g"><b>${wins}/${src.length}</b><span>turns that left you ahead</span></div><div class="r"><b>${un}</b><span>mana held and never used</span></div><div><b>${late}</b><span>instants cast after the moment had passed</span></div>`);
      ui.out(!end ? (live ? 'Look at his untapped mana and his hand before you decide. What could he do this turn?' : 'A scripted player who builds when unsure and holds when nervous. Watch turn 3: the right card, held correctly, cast one step late.')
        : `${who} came out ahead on ${wins} of 5, left ${un} mana unused${late ? `, and ${late === 1 ? 'once' : late + ' times'} cast the instant after the spell it was meant to answer had already resolved` : ''}. The same card saved a creature, did nothing, or was never needed, and the difference was when it entered the stack and whether he could have done anything at all. Timing is a resource here because holding it open has a price every single turn.`);
    },
  });
})();
