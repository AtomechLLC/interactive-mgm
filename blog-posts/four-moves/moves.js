/* Four Moves for the League (replanned page for "Warlock talent trees"; Scripture: Situational Value, Strengths and Weaknesses,
   Counter Strategies and Predator-Prey Factions). The learner picks four moves, then five Elite Four rooms play out with the
   real type chart and the real FireRed teams. Damage is simplified and stated on the page; nothing is rolled.
   The readout is which moves were actually used, beside their printed power. */
(function () {
  const C = TD.C, TAU = TD.TAU;
  const SE = { Normal: ['', 'Rock Steel', 'Ghost'], Bug: ['Grass Psychic Dark', 'Fire Fighting Poison Flying Ghost Steel Fairy', ''], Fire: ['Grass Ice Bug Steel', 'Fire Water Rock Dragon', ''], Water: ['Fire Ground Rock', 'Water Grass Dragon', ''], Electric: ['Water Flying', 'Electric Grass Dragon', 'Ground'], Ice: ['Grass Ground Flying Dragon', 'Fire Water Ice Steel', ''], Fighting: ['Normal Ice Rock Dark Steel', 'Poison Flying Psychic Bug Fairy', 'Ghost'], Ground: ['Fire Electric Poison Rock Steel', 'Grass Bug', 'Flying'], Psychic: ['Fighting Poison', 'Psychic Steel', 'Dark'], Rock: ['Fire Ice Flying Bug', 'Fighting Ground Steel', ''], Ghost: ['Psychic Ghost', 'Dark', 'Normal'], Dragon: ['Dragon', 'Steel', 'Fairy'] };
  const TC = { Normal: '#9a9a78', Bug: '#8a9a1e', Fire: '#e0702a', Water: '#4f84e0', Electric: '#d9b21c', Ice: '#6fc4c4', Fighting: '#b0362c', Ground: '#b99a4a', Psychic: '#e0507e', Rock: '#9c8a3a', Ghost: '#64508a', Dragon: '#6040d8', Poison: '#93408f', Flying: '#9684d8', Grass: '#62a844' };
  const eff = (a, ts) => ts.reduce((m, t) => m * (SE[a][2].split(' ').includes(t) ? 0 : SE[a][0].split(' ').includes(t) ? 2 : SE[a][1].split(' ').includes(t) ? .5 : 1), 1);
  const MV = [['Hyper Beam', 'Normal', 150], ['Megahorn', 'Bug', 120], ['Outrage', 'Dragon', 120], ['Close Combat', 'Fighting', 120], ['Earthquake', 'Ground', 100], ['Thunderbolt', 'Electric', 90], ['Ice Beam', 'Ice', 90], ['Flamethrower', 'Fire', 90], ['Surf', 'Water', 90], ['Psychic', 'Psychic', 90], ['Shadow Ball', 'Ghost', 80], ['Rock Slide', 'Rock', 75]];
  const RM = [['Lorelei', [['Dewgong', 'Water Ice'], ['Cloyster', 'Water Ice'], ['Slowbro', 'Water Psychic'], ['Jynx', 'Ice Psychic'], ['Lapras', 'Water Ice']]], ['Bruno', [['Onix', 'Rock Ground'], ['Hitmonchan', 'Fighting'], ['Hitmonlee', 'Fighting'], ['Onix', 'Rock Ground'], ['Machamp', 'Fighting']]], ['Agatha', [['Gengar', 'Ghost Poison'], ['Golbat', 'Poison Flying'], ['Haunter', 'Ghost Poison'], ['Arbok', 'Poison'], ['Gengar', 'Ghost Poison']]], ['Lance', [['Gyarados', 'Water Flying'], ['Dragonair', 'Dragon'], ['Dragonair', 'Dragon'], ['Aerodactyl', 'Rock Flying'], ['Dragonite', 'Dragon Flying']]], ['Champion', [['Pidgeot', 'Normal Flying'], ['Alakazam', 'Psychic'], ['Rhydon', 'Ground Rock'], ['Exeggutor', 'Grass Psychic'], ['Gyarados', 'Water Flying'], ['Charizard', 'Fire Flying']]]];
  const K = .6, SLACK = 2, budget = r => RM[r][1].length + SLACK;
  const hitOf = (m, ts) => MV[m][2] * eff(MV[m][1], ts.split(' ')) * K, cost = m => m === 0 ? 2 : 1;
  const turnsOf = (m, ts) => { const h = hitOf(m, ts); return h <= 0 ? 99 : Math.ceil(100 / h) * cost(m); };
  const best = (set, ts) => set.reduce((a, m) => turnsOf(m, ts) < turnsOf(a, ts) || (turnsOf(m, ts) === turnsOf(a, ts) && MV[m][2] > MV[a][2]) ? m : a);
  const runs = [], seen = [false, false, false, false, false];
  const TOURSETS = [[0, 1, 2, 3], [2, 5, 6, 9]];
  function launch(st) { st.phase = 'run'; st.run = { set: st.pick.slice(), room: 0, foe: 0, hp: 100, used: 0, rooms: [], uses: {}, tk: .5, last: null }; st.run.set.forEach(m => st.run.uses[m] = 0); if (st.live) seen[0] = true; else st.tseen[0] = true; }
  function endRoom(st, win) {
    const r = st.run; r.rooms.push({ t: r.used, B: budget(r.room), win, at: r.foe }); r.msg = win ? `${RM[r.room][0]} beaten in ${r.used} turns` : `Fainted against ${RM[r.room][0]}`; r.msgT = st.t;
    if (st.live) PLAY.beep(win ? 1000 : 150, .25, .16, win ? 'sine' : 'sawtooth');
    if (r.room === RM.length - 1) { r.wins = r.rooms.filter(x => x.win).length; st.phase = 'done'; st.at = st.t; (st.live ? runs : st.truns).push(r); if (st.live && runs.length > 2) runs.shift(); return; }
    r.room++; r.foe = 0; r.hp = 100; r.used = 0; r.tk = 1; r.last = null; if (st.live) seen[r.room] = true; else st.tseen[r.room] = true;
  }
  PLAY.game('moves', {
    dur: 36, clickStarts: true,
    init(o, live) { return { live, t: 0, pick: [], phase: 'pick', truns: [], tseen: [false, false, false, false, false], think: 0 }; },
    step(st, inp, dt) {
      st.t += dt; st.think += dt; const k = inp.click;
      if (st.phase === 'pick') {
        if (typeof k === 'number') { const i = st.pick.indexOf(k); if (i >= 0) st.pick.splice(i, 1); else if (st.pick.length < 4) st.pick.push(k); st.think = 0; }
        if (k === 'go' && st.pick.length === 4) launch(st);
        return;
      }
      if (st.phase === 'done') { if (k === 'again') { st.phase = 'pick'; st.think = 0; if (!st.live) st.pick = []; } return; }
      const r = st.run; r.tk -= dt; if (r.tk > 0) return; r.tk = st.live ? .32 : .15;
      const ts = RM[r.room][1][r.foe][1], m = best(r.set, ts), h = hitOf(m, ts);
      if (h <= 0) { r.last = { m, e: 0 }; r.used = budget(r.room) + 1; return endRoom(st, false); }
      r.hp -= h; r.used += cost(m); r.uses[m]++; r.last = { m, e: eff(MV[m][1], ts.split(' ')), t: st.t };
      if (r.used > budget(r.room)) return endRoom(st, false);
      if (r.hp <= 0) { r.foe++; r.hp = 100; if (r.foe >= RM[r.room][1].length) endRoom(st, true); }
    },
    // the walk-through picks the four highest-power moves first, then a mixed set
    bot(st) {
      if (st.think < .45) return null; const P = click => ({ down: {}, press: {}, click });
      if (st.phase === 'pick') { const want = TOURSETS[Math.min(1, st.truns.length)], nx = want.find(m => !st.pick.includes(m)); st.think = .2; return P(nx != null ? nx : 'go'); }
      if (st.phase === 'done' && st.truns.length < 2 && st.t - st.at > 2.4) return P('again');
      return null;
    },
    draw(g, st, ui, live) {
      GK.panel(g); const X0 = 24, r = st.run, sn = live ? seen : st.tseen;
      const chip = (t, x, y, w = 58) => { g.fillStyle = TC[t]; g.beginPath(); g.roundRect(x, y, w, 15, 7); g.fill(); GK.text(g, t, x + w / 2, y + 11, '#fff', 10, 'center', 700); };
      GK.head(g, st.phase === 'pick' ? `Choose four moves (${st.pick.length} of 4)` : st.phase === 'run' ? `Room ${r.room + 1} of 5 · ${RM[r.room][0]}` : 'The League is over', X0, 32, 'left', C.ink, 17);
      // move grid
      MV.forEach((m, i) => {
        const x = X0 + (i % 4) * 132, y = 46 + (i / 4 | 0) * 58, on = (st.phase === 'pick' ? st.pick : r.set).includes(i);
        GK.box(g, x, y, 124, 50, on ? '#fff3cf' : '#fffaf0', on ? C.navy : '#cdbf9f', 9, on ? 3 : 1.5); g.globalAlpha = on || st.phase === 'pick' ? 1 : .35;
        GK.text(g, m[0], x + 10, y + 20, C.ink, 13, 'left', 800); chip(m[1], x + 10, y + 28); GK.text(g, String(m[2]), x + 114, y + 40, C.navy, 15, 'right', 800); g.globalAlpha = 1;
        if (st.phase === 'pick') ui.hit(i, x, y, 124, 50);
      });
      // arena
      const AY = 226, AW = 520, AH = 150; GK.box(g, X0, AY, AW, AH, '#eef2fb', '#cdbf9f', 12, 1.5);
      if (st.phase === 'pick') {
        GK.wrap(g, 'One Pokémon, four moves, five rooms in a row and no swapping. The number on each move is its printed power. In each room your Pokémon lasts for the number of foes plus two turns, then faints; it is healed for the next room.', X0 + 20, AY + 30, AW - 40, 20, C.ink, 13, 600);
        if (st.pick.length === 4 && live) ui.btn('go', 'Enter the League', X0 + 150, AY + 98, 220, 40, { px: 14, on: true }); else if (live) GK.text(g, 'click moves above to choose', X0 + AW / 2, AY + 124, C.muted, 13, 'center', 600);
      } else {
        const foes = RM[r.room][1], f = foes[Math.min(r.foe, foes.length - 1)], B = budget(r.room), done = st.phase === 'done';
        g.fillStyle = C.blue; g.beginPath(); g.arc(X0 + 90, AY + 82, 30, 0, TAU); g.fill(); GK.text(g, 'yours', X0 + 90, AY + 86, '#fff', 12, 'center', 800);
        GK.text(g, 'turns before it faints', X0 + 30, AY + 26, C.muted, 11, 'left', 700); for (let i = 0; i < B; i++) { g.fillStyle = i < B - r.used ? C.good : '#d9cdb2'; g.beginPath(); g.roundRect(X0 + 30 + i * 16, AY + 126, 12, 12, 3); g.fill(); }
        if (!done) {
          const f0 = f[1].split(' '); g.fillStyle = TC[f0[0]]; g.beginPath(); g.arc(X0 + 410, AY + 82, 30, 0, TAU); g.fill(); if (f0[1]) { g.fillStyle = TC[f0[1]]; g.beginPath(); g.arc(X0 + 410, AY + 82, 30, -.5 * Math.PI, .5 * Math.PI); g.fill(); }
          GK.text(g, f[0], X0 + 410, AY + 26, C.ink, 14, 'center', 800); f0.forEach((t, i) => chip(t, X0 + 410 - f0.length * 31 + i * 62, AY + 32)); PLAY.bar(g, X0 + 350, AY + 126, 120, 10, r.hp / 100, C.red);
          GK.text(g, `foe ${Math.min(r.foe + 1, foes.length)} of ${foes.length}`, X0 + 490, AY + 114, C.muted, 11, 'right', 600);
          if (r.last && st.t - (r.last.t || 0) < .6) { const e = r.last.e; TD.label(MV[r.last.m][0], X0 + 250, AY + 70, 'center', '#fff', 14, TC[MV[r.last.m][1]]); GK.text(g, e >= 2 ? 'super effective' : e === 0 ? 'no effect' : e < 1 ? 'not very effective' : '', X0 + 250, AY + 104, e >= 2 ? C.good : C.redDk, 12, 'center', 800); }
        }
        if (r.msg && st.t - r.msgT < 1.3) TD.label(r.msg, X0 + AW / 2, AY + 20, 'center', C.ink, 14);
        if (done && live) ui.btn('again', 'Choose four again', X0 + 150, AY + 60, 220, 40, { px: 14, on: true });
      }
      // rooms
      RM.forEach(([n, foes], i) => {
        const x = X0 + i * 105, y = 388, res = st.phase !== 'pick' && r.rooms[i], cur = st.phase === 'run' && r.room === i;
        GK.box(g, x, y, 99, 86, res ? (res.win ? '#e6f3e4' : '#fbe4e1') : cur ? '#fff6dd' : '#fffaf0', cur ? C.navy : '#cdbf9f', 9, cur ? 3 : 1.5); GK.text(g, n, x + 50, y + 20, C.ink, 13, 'center', 800);
        if (sn[i]) foes.forEach((f, j) => { const t = f[1].split(' '), fx = x + 50 + (j - (foes.length - 1) / 2) * 15; g.fillStyle = TC[t[0]]; g.beginPath(); g.arc(fx, y + 38, 6, 0, TAU); g.fill(); if (t[1]) { g.fillStyle = TC[t[1]]; g.beginPath(); g.arc(fx, y + 38, 6, -.5 * Math.PI, .5 * Math.PI); g.fill(); } }); else GK.text(g, 'not seen yet', x + 50, y + 42, C.muted, 11, 'center', 600);
        if (res) { GK.text(g, res.win ? 'won' : 'fainted', x + 50, y + 62, res.win ? C.good : C.redDk, 13, 'center', 800); GK.text(g, res.win ? `${res.t} of ${res.B} turns` : `at foe ${Math.min(res.at + 1, foes.length)} of ${foes.length}`, x + 50, y + 78, C.muted, 11, 'center', 600); }
      });
      GK.wrap(g, 'Type chart and teams are the real ones (FireRed, rival’s team when you chose Bulbasaur). Simplified: every foe has 100 health, a hit does power × type × 0.6, Hyper Beam costs two turns, and accuracy and other drawbacks are ignored.', X0, 496, 520, 16, C.muted, 11, 500);
      // runs
      const RX = 566, RW = 450, list = (live ? runs : st.truns).slice(-2), show = st.phase === 'run' ? [...list.slice(-1), r] : list;
      GK.text(g, 'power printed on the move, beside how often it was the one used', RX, 32, C.muted, 12, 'left', 700);
      show.forEach((q, k) => {
        const y = 46 + k * 262; GK.box(g, RX, y, RW, 250, q === r && st.phase === 'run' ? '#fff6dd' : '#fffaf0', '#cdbf9f', 10, 1.5);
        const wins = q.rooms.filter(x => x.win).length, tot = Math.max(1, Object.values(q.uses).reduce((a, b) => a + b, 0));
        GK.text(g, q === r && st.phase === 'run' ? 'This run' : show.length > 1 && k === 0 ? 'Run before' : 'Last run', RX + 14, y + 26, C.ink, 14, 'left', 800); GK.text(g, `${wins} of ${q.rooms.length || 0} rooms won`, RX + RW - 14, y + 26, C.navy, 14, 'right', 800);
        GK.text(g, 'power', RX + 150, y + 50, C.muted, 11, 'left', 700); GK.text(g, 'turns it was used', RX + 280, y + 50, C.muted, 11, 'left', 700);
        q.set.slice().sort((a, b) => MV[b][2] - MV[a][2]).forEach((m, i) => { const yy = y + 76 + i * 34; GK.text(g, MV[m][0], RX + 14, yy + 4, C.ink, 13, 'left', 700); PLAY.bar(g, RX + 150, yy - 6, 110, 12, MV[m][2] / 150, '#9aa7d8'); GK.text(g, String(MV[m][2]), RX + 154, yy + 4, C.ink, 10, 'left', 800); PLAY.bar(g, RX + 280, yy - 6, 130, 12, q.uses[m] / tot, TC[MV[m][1]]); GK.text(g, String(q.uses[m]), RX + 418, yy + 4, C.ink, 12, 'left', 800); });
        GK.text(g, q.rooms.map((x, i) => `${RM[i][0]} ${x.win ? '✓' : '✕'}`).join('   '), RX + 14, y + 232, C.ink, 12, 'left', 700);
      });
      if (!show.length) GK.wrap(g, 'Your run appears here, with the one before it for comparison.', RX + 14, 76, RW - 28, 20, C.muted, 14, 500);
      const d = st.phase === 'done' ? r : null;
      ui.stats(`<div><b>${st.phase === 'pick' ? st.pick.length + ' of 4' : r.rooms.filter(x => x.win).length + ' of 5'}</b><span>${st.phase === 'pick' ? 'moves chosen' : 'rooms won'}</span></div><div><b>${st.phase === 'pick' ? '–' : r.used}</b><span>turns used in this room</span></div>`);
      if (!d) { ui.out(st.phase === 'pick' ? (live ? 'Pick by power, by coverage, or by what you remember of each room. Rooms you have seen keep their types on show.' : 'First the four moves with the highest printed power. Then a set with one strong move and three that cover more types.') : 'Each turn your Pokémon uses whichever of its four moves drops the foe fastest.'); return; }
      const by = d.set.slice().sort((a, b) => MV[b][2] - MV[a][2]), top = by[0], most = d.set.reduce((a, m) => d.uses[m] > d.uses[a] ? m : a), dead = d.set.filter(m => !d.uses[m]).map(m => MV[m][0]), lost = d.rooms.map((x, i) => x.win ? null : RM[i][0]).filter(Boolean);
      const prev = list.length > 1 ? list[list.length - 2] : null;
      ui.out(`${d.wins} of 5 rooms won${lost.length ? ` (fainted against ${lost.join(', ')})` : ''}. The strongest move carried, ${MV[top][0]} at ${MV[top][2]}, was used ${d.uses[top]} times; the most used was ${MV[most][0]} at ${MV[most][2]}, ${d.uses[most]} times. ` + (dead.length ? `Never used: ${dead.join(', ')}. ` : '') + (top !== most ? 'Printed power and use came apart: what a move is worth depended on who was standing in the room. ' : 'Here the strongest move was also the most used, so power and use lined up for this set. ') + (prev ? `The run before won ${prev.wins}. ` : '') + 'A talent that is strongest on paper can be dead weight in the wrong room for the same reason.');
    },
  });
})();
