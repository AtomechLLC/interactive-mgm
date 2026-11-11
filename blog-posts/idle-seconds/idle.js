/* Count the Idle Seconds (replanned page for "Why Not Just Chess?"; Scripture: Balanced Responsibilities, Teamplay
   Interval Types, Game Values). The learner takes one of ten seats in a short team board game; the other nine seats
   and the opposing side are scripts (core.js). Two rules can be switched: who decides the moves, and whether the dead
   rejoin. The page records the seconds in which the game asked nothing of the learner's judgement and the decisions
   they made, beside the team result. Win rates are measured at load by playing 300 matches per rule with a script in
   the learner's seat. */
(function () {
  const C = TD.C, TAU = TD.TAU, FX = 24, FY = 56, FW = 640, FH = 410, K = window.IDLE, CS = 64, BX = FX + 32, BY = FY + 8, TK = .8;
  const MODE = ['One leader commands', 'Everyone moves their own'], RATES = [0, 1].map(m => [false, true].map(r => K.rate(m, r, 300, K.DITHER, K.FOE)));
  const saved = {}; let API = null;
  function begin(st, mode, rejoin) { st.mode = mode; st.rejoin = rejoin; st.G = K.make(st.live ? 1 + Math.floor(Math.random() * 99999) : 77 + mode, mode, rejoin); st.G.dither = K.DITHER; st.G.foeDither = K.FOE; st.acc = 0; st.orders = K.plan(st.G); st.q = null; st.obey = false; st.dec = 0; st.obeyed = 0; st.none = 0; st.dead = 0; st.ph = st.live ? 'ready' : 'go'; }
  PLAY.game('idle', {
    dur: 46, keys: [' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'w', 'a', 's', 'd'],
    opts: s => ({ mode: +(s.querySelector('.seg.m .on')?.dataset.v || 0), rejoin: s.querySelector('.seg.r .on')?.dataset.v === '1' }),
    setup(s, api) { API = api; s.querySelectorAll('.seg').forEach(seg => seg.querySelectorAll('button').forEach(b => b.onclick = () => { seg.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); api.start(); })); },
    init(o, live) { const st = { live, t: 0, rows: {}, pass: 0 }; begin(st, live ? o.mode : 0, live ? o.rejoin : false); return st; },
    step(st, inp, dt) {
      st.t += dt; const c = inp.click, pr = inp.press || {}, G = st.G, me = G.P[G.me];
      if (st.ph === 'ready') { if (c || Object.keys(pr).length) st.ph = 'go'; else return; }
      if (st.ph === 'done') { if (st.live && c === 'again') API.start(); if (!st.live && st.pass === 0 && st.t - st.at > 2.5) { st.pass = 1; begin(st, 1, false); } return; }
      if (st.mode === 0) { if (pr[' '] || c === 'obey' || inp.auto) st.obey = true; }
      else { if (pr.ArrowRight || pr.d) st.q = { dx: 1, dy: 0 }; if (pr.ArrowLeft || pr.a) st.q = { dx: -1, dy: 0 }; if (pr.ArrowDown || pr.s) st.q = { dx: 0, dy: 1 }; if (pr.ArrowUp || pr.w) st.q = { dx: 0, dy: -1 }; if (inp.auto) st.q = st.orders[G.me]; }
      st.acc += dt; if (me.hp <= 0) st.dead += dt; if (st.mode === 0 || me.hp <= 0) st.none += dt;
      if (st.acc >= TK) { st.acc -= TK; let mine = null; if (me.hp > 0) { if (st.mode === 0) { if (st.obey) { mine = st.orders[G.me]; st.obeyed++; } } else if (st.q) { mine = st.q; st.dec++; } }
        K.step(G, st.orders, mine); st.orders = K.plan(G); st.q = null; st.obey = false; if (st.live && G.log.some(l => l.tick === G.tick)) PLAY.beep(300, .04, .05, 'square');
        if (G.over) { st.ph = 'done'; st.at = st.t; const row = { result: G.result, score: G.score, none: st.none, dec: st.dec, obeyed: st.obeyed, dead: st.dead, len: G.tick * TK }; st.rows[st.mode + '|' + st.rejoin] = row; if (st.live) saved[st.mode + '|' + st.rejoin] = row; } }
    },
    // in the walk-through a script sits in the highlighted seat: it obeys every order, or picks its own target like the other eight
    bot(st) { return { down: {}, press: {}, auto: st.ph === 'go' }; },
    draw(g, st, ui, live) {
      GK.panel(g); const G = st.G, me = G.P[G.me], left = Math.max(0, (K.TICKS - G.tick) * TK - st.acc);
      GK.head(g, `${MODE[st.mode]} · ${st.rejoin ? 'the dead rejoin' : 'the dead stay out'} · ${left.toFixed(0)} s`, FX, 32, 'left', C.ink, 15);
      for (let y = 0; y < K.GH; y++) for (let x = 0; x < K.GW; x++) { g.fillStyle = (x + y) % 2 ? '#d9cfb4' : '#e8dfc8'; g.fillRect(BX + x * CS, BY + y * CS, CS, CS); }
      G.log.filter(l => l.tick === G.tick && st.acc < .3).forEach(l => { g.fillStyle = 'rgba(255,210,63,.6)'; g.fillRect(BX + l.x * CS, BY + l.y * CS, CS, CS); });
      G.P.forEach((p, i) => { if (p.hp <= 0) return; const x = BX + p.x * CS + CS / 2, y = BY + p.y * CS + CS / 2, mine = i === G.me; g.fillStyle = p.side ? C.red : mine ? '#e2b93b' : '#3f7fd0'; g.beginPath(); g.arc(x, y, 21, 0, TAU); g.fill(); g.strokeStyle = mine ? C.navy : 'rgba(0,0,0,.3)'; g.lineWidth = mine ? 4 : 2; g.stroke();
        for (let h = 0; h < p.hp; h++) { g.fillStyle = '#fff'; g.beginPath(); g.arc(x - 9 + h * 9, y, 3.2, 0, TAU); g.fill(); } if (mine) GK.text(g, 'you', x, y + 36, C.navy, 10, 'center', 800); });
      const o = st.mode === 0 ? st.orders[G.me] : st.q; if (me.hp > 0 && o && st.ph === 'go') { const x = BX + me.x * CS + CS / 2, y = BY + me.y * CS + CS / 2; g.strokeStyle = st.mode === 0 ? (st.obey ? C.good : '#b07a00') : C.navy; g.lineWidth = 5; g.beginPath(); g.moveTo(x + o.dx * 24, y + o.dy * 24); g.lineTo(x + o.dx * 46, y + o.dy * 46); g.stroke(); g.fillStyle = g.strokeStyle; g.beginPath(); g.arc(x + o.dx * 48, y + o.dy * 48, 7, 0, TAU); g.fill(); }
      PLAY.bar(g, BX, BY + K.GH * CS + 6, K.GW * CS, 6, st.acc / TK, '#8ea2e6');
      if (st.ph === 'ready') TD.stamp(st.mode === 0 ? 'Press Space each turn to carry out the leader’s order' : 'Arrow keys: choose your piece’s move each turn', FX + FW / 2, BY + 30, C.navy, 1, 16);
      if (me.hp <= 0 && st.ph === 'go') TD.label(st.rejoin ? 'you are out: back in a few turns' : 'you are out for the rest of the match', FX + FW / 2, BY + 24, 'center', '#fff', 13, 'rgba(183,28,28,.95)');
      if (st.ph === 'done') { TD.stamp(G.result === 'win' ? 'Your team won' : G.result === 'loss' ? 'Your team lost' : 'Drawn', FX + FW / 2, BY + 150, G.result === 'win' ? C.good : C.redDk, 1, 26); if (live) ui.btn('again', 'Play this rule again', FX + FW / 2 - 110, BY + 190, 220, 40, { px: 14, on: true }); }
      if (st.mode === 0 && st.ph === 'go' && me.hp > 0) ui.btn('obey', 'Space: obey', FX + FW - 130, FY + FH - 14, 130, 30, { px: 12, on: !st.obey });
      GK.text(g, st.mode === 0 ? 'The leader, a script, plans every piece. The arrow is your order. Step into an enemy to strike it.' : 'You pick your own move. The other eight pick theirs, each for itself. Step into an enemy to strike it.', FX, FY + FH + 26, C.muted, 11, 'left', 500);
      const RX = 690, RW = 326; GK.text(g, 'team win rate with a script in your seat (300 matches each)', RX, 32, C.muted, 11, 'left', 700); GK.box(g, RX, 44, RW, 96, '#fffaf0', '#cdbf9f', 10, 1.5);
      ['dead stay out', 'dead rejoin'].forEach((h, j) => GK.text(g, h, RX + 196 + j * 84, 64, C.muted, 10.5, 'center', 700)); MODE.forEach((m, i) => { const y = 90 + i * 28; GK.text(g, m, RX + 12, y, C.ink, 11.5, 'left', 700); [0, 1].forEach(j => { const on = st.mode === i && +st.rejoin === j; GK.text(g, PLAY.pct(RATES[i][j].win), RX + 196 + j * 84, y, on ? C.navy : C.ink, on ? 16 : 13, 'center', 800); }); });
      GK.text(g, 'your matches', RX, 164, C.muted, 12, 'left', 700); const store = live ? saved : st.rows, keys = Object.keys(store);
      const cur = { none: st.none, dec: st.dec, obeyed: st.obeyed, dead: st.dead, live: true }, rowsToShow = (st.ph === 'done' ? [] : [[st.mode + '|' + st.rejoin, cur]]).concat(keys.filter(k => st.ph === 'done' || k !== st.mode + '|' + st.rejoin).map(k => [k, store[k]])).slice(0, 4);
      rowsToShow.forEach(([k, r], n) => { const [m, rj] = k.split('|'), y = 174 + n * 92; GK.box(g, RX, y, RW, 84, r.live ? '#fff6dd' : '#fffaf0', r.live ? C.navy : '#cdbf9f', 10, r.live ? 2.5 : 1.5); GK.text(g, `${MODE[+m]} · ${rj === 'true' ? 'rejoin' : 'no rejoin'}`, RX + 12, y + 20, C.ink, 12, 'left', 800); if (r.result) GK.text(g, r.result === 'win' ? 'won' : r.result === 'loss' ? 'lost' : 'drawn', RX + RW - 12, y + 20, r.result === 'win' ? C.good : C.redDk, 12, 'right', 800);
        GK.text(g, `${r.none.toFixed(0)} s`, RX + 12, y + 52, C.redDk, 22, 'left', 800); GK.text(g, 'with no decision of yours', RX + 12, y + 70, C.muted, 10.5, 'left', 600); GK.text(g, String(r.dec), RX + 170, y + 52, C.good, 22, 'left', 800); GK.text(g, 'decisions made', RX + 170, y + 70, C.muted, 10.5, 'left', 600); GK.text(g, +m === 0 ? `${r.obeyed} orders carried out` : `${r.dead.toFixed(0)} s out of the game`, RX + RW - 12, y + 52, C.muted, 10.5, 'right', 700); });
      ui.stats(`<div class="r"><b>${st.none.toFixed(0)} s</b><span>with no decision of ${live ? 'yours' : 'the seat’s'}</span></div><div class="g"><b>${st.dec}</b><span>decisions made</span></div><div><b>${PLAY.pct(RATES[st.mode][+st.rejoin].win)}</b><span>team win rate under this rule</span></div>`);
      const who = live ? 'You' : 'The scripted seat';
      if (st.ph !== 'done') { ui.out(live ? (st.mode === 0 ? 'You are one of ten. The leader decides; you press the key.' : 'You are one of ten. Nobody plans; everyone acts.') : 'A script sits in the gold seat here. Under the leader it obeys; on its own it chases the nearest enemy like the other eight.'); return; }
      const r = store[st.mode + '|' + st.rejoin] || st.rows[st.mode + '|' + st.rejoin], other = store[(1 - st.mode) + '|' + st.rejoin], rt = RATES[st.mode][+st.rejoin].win, ro = RATES[1 - st.mode][+st.rejoin].win;
      ui.out(`${who} spent ${r.none.toFixed(0)} of ${r.len.toFixed(0)} seconds with no decision to make and made ${r.dec} decisions; the team ${r.result === 'win' ? 'won' : r.result === 'loss' ? 'lost' : 'drew'}. This rule wins ${PLAY.pct(rt)} of the page’s 300 matches, against ${PLAY.pct(ro)} for the other. ` + (other ? `Under “${MODE[1 - st.mode].toLowerCase()}” it was ${other.none.toFixed(0)} seconds and ${other.dec} decisions. ` : '') + (st.mode === 0 ? 'The plan was tight, and nine people watched one person play.' : 'Everyone played, and the plan fell apart often enough to show in the win rate.') + (!st.rejoin && r.dead > 5 ? ` ${r.dead.toFixed(0)} of those seconds came after the piece fell: try it with the dead rejoining.` : ''));
    },
  });
})();
