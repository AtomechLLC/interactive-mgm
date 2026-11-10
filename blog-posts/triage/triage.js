/* Triage the Ability (replanned page for Five Gates and the Learning From My Past series).
   Eight draft abilities, each with a playtest complaint. The learner has three fixes and must aim each at the gate that
   fails first. A fix aimed at a later gate is spent and changes nothing. */
(function () {
  const C = TD.C;
  const GATES = [['clarity', 'Clarity', 'Make it readable: a tell, an edge, a sound'], ['care', 'Care', 'Raise the stakes: more danger or a reward'], ['response', 'Response', 'Give players something to do about it'], ['satisfaction', 'Satisfaction', 'Reward the answer with feedback'], ['fit', 'Fit', 'Re-theme it or move it behind an opt-in']];
  const GN = Object.fromEntries(GATES.map(g => [g[0], g[1]]));
  const A = [
    { n: 'Flame Ring', k: 'raid boss', d: 'Fire rings three players; crossing one blows up the raid. The ring is drawn under a blizzard effect.', q: 'What killed us?', sev: 16, g: ['clarity'], why: 'Nobody could see the ring. Until they can, more danger or more answers change nothing.' },
    { n: 'Poison Pool', k: 'action RPG', d: 'A bright green pool with a hard edge. Standing in it costs 1% health a second.', q: 'They see it, stand in it and keep attacking.', sev: 14, g: ['care'], why: 'It is perfectly readable. It just costs less than moving does, so ignoring it is the right play.' },
    { n: 'Soul Scream', k: 'raid boss', d: 'Instant and unavoidable. Hits everyone for 40% of their health.', q: 'Players sigh and wait for heals.', sev: 12, g: ['response'], why: 'Clear and dangerous, with nothing to do about it. Only the healers get to play.' },
    { n: 'Dark Volley', k: 'dungeon caster', d: 'A two-second cast that any player can interrupt. An interrupted cast just stops.', q: 'Did my kick work?', sev: 9, g: ['satisfaction'], why: 'Players read it, cared and answered. The game then said nothing back.' },
    { n: 'Vanish', k: 'horde-slayer boss', d: 'The boss turns untargetable for 20 seconds, twice a fight, with a clear timer.', q: 'I came here to hit things.', sev: 11, g: ['fit'], why: 'Nothing is broken in the ability. It asks for patience in a game that promised slaughter.' },
    { n: 'Drag Hook', k: 'MOBA', d: 'A thin skillshot the colour of the river drags you in. A dodged hook leaves no mark.', q: 'It came from nowhere.', sev: 18, g: ['clarity', 'satisfaction'], why: 'Two gates fail. It can\'t be seen, and once it can, a clean dodge still earns nothing. It needs both fixes, in that order.' },
    { n: 'Dive Bomb', k: 'platformer boss', d: 'A shadow marks the landing spot a second ahead. The arena has spikes on both sides.', q: 'They see the shadow and take the hit anyway.', sev: 10, g: ['response'], why: 'It looks like they don\'t care. They do: there is nowhere to go.' },
    { n: 'Mind Rot', k: 'raid debuff', d: 'A stacking debuff, dispellable. At five stacks you turn on your friends. It shows as one small icon among fourteen.', q: 'Players ignore it, then blame the healer.', sev: 13, g: ['clarity'], why: 'It sounds like a stakes problem, but nobody ignores mind control on purpose. They never saw the stacks.' },
  ];
  const BEST = 43;
  // which complaints clear: a fix counts only when it is aimed at the first gate still failing
  function judge(fixes) {
    return A.map((a, i) => {
      const mine = fixes.filter(f => f.a === i).map(f => f.g); let left = a.g.slice(), used = 0;
      while (left.length && mine.includes(left[0])) { left.shift(); used++; }
      return { clear: !left.length, wasted: mine.length - used, left, touched: mine.length > 0 };
    });
  }
  const SCRIPT = [[2, 'a5'], [3.6, 'g-satisfaction'], [6, 'a1'], [7.4, 'g-clarity'], [9.6, 'a0'], [11, 'g-clarity'], [13.5, 'run'], [22, 'reset'], [23, 'a0'], [24, 'g-clarity'], [25.4, 'a1'], [26.4, 'g-care'], [27.8, 'a7'], [28.8, 'g-clarity'], [30.5, 'run']];

  PLAY.game('triage', {
    dur: 40, keys: [],
    init: (o, live) => ({ live, t: 0, sel: -1, fixes: [], ran: false, si: 0, tries: 0 }),
    step(st, inp, dt) {
      st.t += dt; const c = inp.click; if (!c) return;
      if (c === 'reset') { st.fixes = []; st.ran = false; st.sel = -1; return; }
      if (st.ran) { if (c[0] === 'a') st.sel = +c.slice(1); return; }
      if (c[0] === 'a') st.sel = +c.slice(1);
      else if (c.startsWith('g-') && st.sel >= 0) {
        const g = c.slice(2), at = st.fixes.findIndex(f => f.a === st.sel && f.g === g);
        if (at >= 0) st.fixes.splice(at, 1); else if (st.fixes.length < 3) st.fixes.push({ a: st.sel, g });
      } else if (c === 'run' && st.fixes.length) { st.ran = true; st.ranAt = st.t; st.tries++; }
    },
    bot(st) { const e = SCRIPT[st.si]; if (e && st.t >= e[0]) { st.si++; return { down: {}, press: {}, click: e[1] }; } return null; },
    draw(g, st, ui) {
      GK.panel(g);
      const J = judge(st.fixes), CW = 318, CH = 128;
      A.forEach((a, i) => {
        const x = 16 + (i % 2) * (CW + 10), y = 14 + Math.floor(i / 2) * (CH + 10), j = J[i], on = st.sel === i;
        const cleared = st.ran && j.clear, failed = st.ran && j.touched && !j.clear;
        GK.box(g, x, y, CW, CH, cleared ? '#d8f0df' : on ? '#fff3d6' : '#fffaf0', cleared ? '#5fb47c' : failed ? '#e07b72' : on ? C.gold : '#cdbf9f', 10, on ? 3 : 1.5);
        GK.head(g, a.n, x + 12, y + 24, 'left', C.ink, 15); GK.text(g, a.k, x + CW - 12, y + 23, C.muted, 11, 'right', 600);
        const yy = GK.wrap(g, a.d, x + 12, y + 43, CW - 24, 15, C.ink, 11.5, 500);
        g.globalAlpha = cleared ? .35 : 1; GK.wrap(g, `“${a.q}”`, x + 12, Math.max(yy + 3, y + 92), CW - 110, 15, C.redDk, 12, 700); g.globalAlpha = 1;
        GK.text(g, cleared ? 'complaint gone' : `${a.sev} of 20 testers`, x + CW - 12, y + CH - 28, cleared ? C.good : C.muted, 11, 'right', 700);
        const mine = st.fixes.filter(f => f.a === i);
        mine.forEach((f, k) => { const w = 78, fx = x + CW - 12 - (k + 1) * (w + 4) + 4; GK.box(g, fx, y + CH - 22, w, 17, '#dfe6fb', '#8ea2e6', 6, 1.5); GK.text(g, GN[f.g], fx + w / 2, y + CH - 10, '#23306e', 10.5, 'center', 700); });
        ui.hit('a' + i, x, y, CW, CH);
      });
      // right column: the selected ability and the five gates
      const RX = 676, RW = 348;
      GK.head(g, `Fixes left: ${3 - st.fixes.length} of 3`, RX, 34, 'left', C.ink, 17);
      const a = A[st.sel];
      GK.text(g, a ? `${a.n}: which gate fails first?` : 'Pick an ability on the left.', RX, 58, C.muted, 13, 'left', 600);
      GATES.forEach(([k, n, tip], i) => {
        const y = 72 + i * 56, has = st.sel >= 0 && st.fixes.some(f => f.a === st.sel && f.g === k);
        GK.box(g, RX, y, RW, 48, has ? C.navy : '#fffaf0', has ? C.navy : '#8ea2e6', 9, 2);
        GK.text(g, `${i + 1}. ${n}`, RX + 12, y + 21, has ? '#fff' : C.ink, 14, 'left', 800);
        GK.text(g, tip, RX + 12, y + 38, has ? '#d6dbef' : C.muted, 11.5, 'left', 500);
        if (!st.ran) ui.hit('g-' + k, RX, y, RW, 48);
      });
      const by = 360;
      if (!st.ran) ui.btn('run', 'Run the playtest again', RX, by, RW, 40, { fill: st.fixes.length ? '#fde9b8' : '#f1ece0', stroke: '#e0a92d', px: 15 });
      else ui.btn('reset', 'Take the fixes back and retry', RX, by, RW, 40, { px: 15 });
      const got = J.reduce((s, j, i) => s + (j.clear ? A[i].sev : 0), 0), wasted = J.reduce((s, j) => s + j.wasted, 0);
      if (st.ran) {
        GK.big(g, `${got}`, `tester complaints cleared (best possible with three fixes: ${BEST})`, RX, by + 76, got >= BEST ? C.good : C.ink);
        const j = J[st.sel];
        if (a) PLAY.note(g, `${a.n}: fails first at ${GN[a.g[0]]}${a.g[1] ? ', then ' + GN[a.g[1]] : ''}. ${a.why}`, RX, by + 122, RW);
        else PLAY.note(g, 'Click any ability to see which gate it failed at first, and why.', RX, by + 122, RW);
      } else PLAY.note(g, 'A fix only works on the first gate that fails. Players who can\'t see an ability never get as far as caring about it; players who don\'t care never try the answer.', RX, by + 64, RW);
      ui.stats(`<div><b>${st.fixes.length}/3</b><span>fixes spent</span></div>` + (st.ran ? `<div class="g"><b>${got}</b><span>complaints cleared of ${A.reduce((s, x) => s + x.sev, 0)}</span></div><div class="${wasted ? 'r' : 'g'}"><b>${wasted}</b><span>fixes aimed past the first failing gate</span></div>` : ''));
      ui.out(!st.ran ? 'Three fixes, eight complaints. The loudest complaint is not always the cheapest to clear, and the complaint\'s wording can point at the wrong gate.'
        : wasted ? `${wasted} of your fixes went to a gate players never reached, so ${wasted > 1 ? 'those complaints' : 'that complaint'} came back unchanged. Click the red-edged cards to see what failed first.`
        : got >= BEST ? 'Every fix landed on a first failing gate, on the three complaints that were cheapest to clear. Drag Hook was the loudest, and it needed two fixes.'
        : 'Every fix landed. There is a set of three that clears more testers: look for loud complaints that fail at only one gate.');
    },
  });
})();
