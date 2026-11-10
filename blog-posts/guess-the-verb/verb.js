/* Guess the Verb (replanned page for the text-game post; Scripture: Affordances, The Curse of Knowledge, Curiosity vs Confusion).
   A one-room parser game with a deliberately bare vocabulary. The learner plays it, then spends five fixes binding their own
   failed commands to actions. The page reruns their transcript through the fixed parser. All counts are the learner's own. */
(function () {
  const C = TD.C, FIXES = 5;
  const ACTS = { look: 'look around', lamp: 'take the lamp', light: 'light the lamp', stone: 'push the stone', key: 'take the key', unlock: 'unlock the door', open: 'open the door', inv: 'check what you carry', exam: 'examine something' };
  const BASE = { 'look': 'look', 'take lamp': 'lamp', 'light lamp': 'light', 'push stone': 'stone', 'take key': 'key', 'unlock door': 'unlock', 'open door': 'open', 'inventory': 'inv', 'examine lamp': 'exam', 'examine stone': 'exam', 'examine door': 'exam', 'examine floor': 'exam', 'examine key': 'exam' };
  const norm = s => s.toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\b(the|a|an|at|my|please)\b/g, ' ').replace(/\s+/g, ' ').trim();
  const world = () => ({ lamp: false, lit: false, stone: false, key: false, unlocked: false, out: false });
  function act(w, id, raw) {
    switch (id) {
      case 'look': return w.lit ? 'A brick cellar. A heavy door, locked. One flagstone in the floor sits loose' + (w.stone ? ', pushed aside.' : '.') + (w.stone && !w.key ? ' A key lies in the hollow.' : '') : w.lamp ? 'Dark. You are holding a lamp.' : 'It is nearly dark. You can make out a lamp on a hook, and a door.';
      case 'lamp': if (w.lamp) return 'You already have it.'; w.lamp = true; return 'Taken.';
      case 'light': if (!w.lamp) return 'You have nothing to light.'; if (w.lit) return 'It is already lit.'; w.lit = true; return 'The lamp catches. The cellar comes into view: a door, and a loose flagstone.';
      case 'stone': if (!w.lit) return 'You cannot see well enough to find anything to push.'; if (w.stone) return 'It is already aside.'; w.stone = true; return 'The flagstone grinds aside. A key lies in the hollow.';
      case 'key': if (!w.stone) return 'You see no key here.'; if (w.key) return 'You already have it.'; w.key = true; return 'Taken.';
      case 'unlock': if (!w.key) return 'You have nothing to unlock it with.'; if (w.unlocked) return 'It is already unlocked.'; w.unlocked = true; return 'The lock turns.';
      case 'open': if (!w.unlocked) return 'The door is locked.'; w.out = true; return 'The door swings open. Stairs, and daylight. You are out.';
      case 'inv': return 'You carry: ' + ([w.lamp && 'a lamp', w.key && 'a key'].filter(Boolean).join(', ') || 'nothing') + '.';
      case 'exam': return /stone|floor/.test(raw) ? (w.lit ? 'One flagstone rocks under your foot.' : 'Too dark to tell.') : /door/.test(raw) ? 'Oak, iron-bound, with a keyhole.' : /lamp/.test(raw) ? 'An oil lamp with a striker.' : 'A small iron key.';
    }
  }
  function run(w, cmd, extra) { const n = norm(cmd), id = BASE[n] || (extra && extra[n]); if (!id) { const v = n.split(' ')[0] || cmd; return { ok: false, text: BASE[n] === undefined && Object.keys(BASE).some(k => k.split(' ')[0] === v) ? `I know "${v}", but not used like that.` : `I don't know the word "${v}".` }; } return { ok: true, id, text: act(w, id, n) }; }
  const SCRIPT = ['look', 'grab lamp', 'take lamp', 'turn on lamp', 'light lamp', 'look', 'lift stone', 'move stone', 'push stone', 'pick up key', 'take key', 'use key on door', 'unlock door', 'open door'];
  const BOTFIX = { 'grab lamp': 'lamp', 'turn on lamp': 'light', 'move stone': 'stone', 'pick up key': 'key', 'use key on door': 'unlock' };
  let queue = [];

  PLAY.game('verb', {
    dur: 44, clickStarts: true,
    setup(s, api) {
      const f = s.querySelector('.gv-form'), i = s.querySelector('.gv-in');
      f.onsubmit = e => { e.preventDefault(); if (!i.value.trim()) return; if (!api.live) api.start(); queue.push(i.value.trim()); i.value = ''; };
      s.querySelector('.play').addEventListener('click', () => { queue = []; i.focus(); });
    },
    init(o, live) { return { live, t: 0, w: world(), log: [], fails: [], phase: 'play', extra: {}, pick: null, k: 0 }; },
    step(st, inp, dt) {
      st.t += dt;
      const cmd = inp.cmd || (st.live && queue.length ? queue.shift() : null);
      if (st.phase === 'play') {
        if (cmd) { const r = run(st.w, cmd, null); st.log.push({ cmd, ...r }); if (!r.ok && !st.fails.includes(norm(cmd))) st.fails.push(norm(cmd)); if (st.live) PLAY.beep(r.ok ? 660 : 180, .06, .1, r.ok ? 'sine' : 'sawtooth'); if (st.w.out) { st.phase = st.fails.length ? 'fix' : 'end'; st.at = st.t; } }
        if (inp.click === 'stop' && st.fails.length) { st.phase = 'fix'; st.at = st.t; }
      } else if (st.phase === 'fix') {
        if (typeof inp.click === 'string' && inp.click[0] === 'f') { const f = st.fails[+inp.click.slice(1)]; if (st.extra[f]) delete st.extra[f]; else st.pick = f; }
        if (typeof inp.click === 'string' && inp.click[0] === 'a' && st.pick && Object.keys(st.extra).length < FIXES) { st.extra[st.pick] = inp.click.slice(1); st.pick = null; }
        if (inp.click === 'rerun') {
          const w = world(); st.after = st.log.map(l => ({ cmd: l.cmd, ...run(w, l.cmd, st.extra) })); st.phase = 'end'; st.at = st.t;
        }
      } else if (st.phase === 'end' && inp.click === 'refix' && st.fails.length) { st.phase = 'fix'; st.after = null; }
    },
    // a scripted player who says things the way people say them, then fixes five of the six phrasings that failed
    bot(st) {
      if (st.phase === 'play') { if (st.k < SCRIPT.length && st.t > 1 + st.k * 1.7) return { down: {}, press: {}, cmd: SCRIPT[st.k++] }; return null; }
      if (st.phase === 'fix') {
        const todo = Object.keys(BOTFIX).filter(f => !st.extra[f]); if (st.t - st.at < 1.2 + (5 - todo.length) * 2.2) return null;
        if (!todo.length) return st.t - st.at > 13 ? { down: {}, press: {}, click: 'rerun' } : null;
        return st.pick ? { down: {}, press: {}, click: 'a' + BOTFIX[st.pick] } : { down: {}, press: {}, click: 'f' + st.fails.indexOf(todo[0]) };
      }
      return null;
    },
    draw(g, st, ui, live) {
      GK.panel(g);
      const LX = 24, LW = 500;
      GK.head(g, st.phase === 'play' ? 'The cellar' : st.phase === 'fix' ? 'Fix the parser: five fixes' : 'Your transcript, rerun', LX, 32, 'left', C.ink, 17);
      GK.box(g, LX, 48, LW, 500, '#16192e', '#16192e', 12, 0);
      // the transcript, newest at the bottom
      const src = st.after || st.log; let y = 530; g.save(); g.beginPath(); g.rect(LX, 52, LW, 492); g.clip();
      if (!src.length) GK.wrap(g, 'You wake on a cold floor. Type a command in the box on the right and press Enter.', LX + 18, 86, LW - 36, 20, '#cfd6ff', 14, 500);
      for (let i = src.length - 1; i >= 0 && y > 40; i--) {
        const l = src[i], was = st.after && !st.log[i].ok, h = Math.ceil(g.measureText ? (l.text.length * 7.2) / (LW - 50) : 1) * 19;
        y -= h + 4; GK.wrap(g, l.text, LX + 30, y + 14, LW - 50, 19, l.ok ? '#e8ecff' : '#ff9d8a', 13, 500);
        y -= 22; GK.text(g, '> ' + l.cmd, LX + 16, y + 14, l.ok ? (was ? '#7dffa0' : '#ffd23f') : '#ff9d8a', 14, 'left', 700);
        if (was && l.ok) GK.text(g, 'now understood', LX + LW - 14, y + 14, '#7dffa0', 11, 'right', 700);
        y -= 8;
      }
      g.restore();
      // right column
      const RX = 548, RW = 468, nf = st.log.filter(l => !l.ok).length;
      if (st.phase === 'play') {
        GK.head(g, `Commands the parser refused: ${nf}`, RX, 32, 'left', C.ink, 15);
        st.fails.slice(-14).forEach((f, i) => GK.text(g, f, RX + (i % 2) * 234, 62 + Math.floor(i / 2) * 24, C.redDk, 13, 'left', 600));
        PLAY.note(g, 'Each of these was a sensible thing to say. The author did not think of it.', RX, 250, RW);
        if (live && st.fails.length) ui.btn('stop', 'Stop here and fix the parser', RX, 300, 250, 40, { px: 13 });
      } else {
        const used = Object.keys(st.extra).length;
        GK.text(g, st.phase === 'fix' ? `1. Click a refused command.  2. Click what it should have meant.  ${FIXES - used} left.` : 'What the same commands do now', RX, 32, C.ink, 13, 'left', 700);
        st.fails.slice(0, 12).forEach((f, i) => {
          const y2 = 48 + i * 30, to = st.extra[f];
          GK.box(g, RX, y2, 220, 25, st.pick === f ? C.navy : to ? '#e7f6ec' : '#fffaf0', to ? C.good : st.pick === f ? C.navy : '#cdbf9f', 6, 1.5);
          GK.text(g, f.length > 26 ? f.slice(0, 25) + '…' : f, RX + 8, y2 + 17, st.pick === f ? '#fff' : C.ink, 12, 'left', 600);
          if (to) GK.text(g, '→ ' + ACTS[to], RX + 230, y2 + 17, C.good, 12, 'left', 700);
          if (st.phase === 'fix') ui.hit('f' + i, RX, y2, 220, 25);
        });
        if (st.phase === 'fix' && st.pick) Object.keys(ACTS).forEach((a, i) => ui.btn('a' + a, ACTS[a], RX + 240, 48 + i * 30, 228, 25, { px: 11 }));
        if (st.phase === 'fix') ui.btn('rerun', 'Rerun my transcript through it', RX, 440, 260, 40, { px: 13 });
        if (st.phase === 'end' && st.after) {
          const left = st.after.filter(l => !l.ok);
          GK.big(g, `${nf} → ${left.length}`, 'refused commands, before and after your fixes', RX, 450, left.length ? C.ink : C.good);
          GK.text(g, left.length ? 'Still refused: ' + [...new Set(left.map(l => norm(l.cmd)))].slice(0, 4).join(' · ') : 'Every phrasing you used now works. A new player will bring new ones.', RX, 500, left.length ? C.redDk : C.muted, 12, 'left', 600);
          if (live) ui.btn('refix', 'Change my fixes', RX, 512, 160, 34, { px: 12 });
        }
      }
      // side panel
      const ok = st.log.filter(l => l.ok).length;
      ui.stats(`<div><b>${st.log.length}</b><span>commands typed</span></div><div class="r"><b>${nf}</b><span>refused by the parser</span></div><div class="g"><b>${Object.keys(st.extra).length}/${FIXES}</b><span>fixes spent</span></div>`);
      const who = live ? 'You' : 'The scripted player', left = st.after ? st.after.filter(l => !l.ok).length : null;
      ui.out(st.phase === 'play' ? (live ? (st.log.length ? 'Keep going until you are out. Say it the way you would say it.' : 'Type in the box above. There is no list of words: that is the point.') : 'A scripted player types what a person would: "grab lamp", "pick up key". Watch how many of those the parser turns down.')
        : st.phase === 'fix' ? `${who} had ${nf} refused commands in ${st.log.length}, ${st.fails.length} of them distinct, and ${st.w.out ? 'still got out' : 'stopped'}. Five fixes. Which phrasings will the next player also try?`
        : st.after ? `${nf} refusals became ${left}. ${st.fails.length > FIXES ? `${who} had ${st.fails.length} distinct failures and five fixes, so ${st.fails.length - Object.keys(st.extra).length} stayed broken.` : ''} A list of seven choices would have had none, and would also have shown "push the stone" before anyone wondered about the floor. The parser sells the feeling that anything might work, and every refusal is what that feeling costs.`
        : `${who} got out without a single refusal. Either you have played these before or you guessed the author exactly; most players do not. Start over and say things the way a newcomer would.`);
    },
  });
})();
