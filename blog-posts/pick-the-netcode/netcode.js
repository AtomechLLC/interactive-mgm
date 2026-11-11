/* Pick the Netcode (replanned page for "Billion Dollar Hardware Mistake"; Scripture: Spatial Simulation Optimizations,
   Programming for Designers). Four game briefs. For each the learner picks lockstep, rollback or server-authoritative
   before seeing any cost. The page then works out bandwidth, delay and simulation load from the brief's player and
   unit counts with a small stated model, and shows what the real game shipped. The constants are this page's own. */
(function () {
  const C = TD.C, TAU = TD.TAU, FX = 24, FY = 56, FW = 640, FH = 410, INB = 12, ENTB = 6, BWLINE = 512, CPULINE = 2000;
  const BR = [{ n: 'Strategy game', game: 'StarCraft II', players: 8, units: 1600, tick: 16, tol: 200, hidden: true, ship: 0, what: '8 players, 200 units each, fog of war' },
    { n: 'Fighting game', game: 'Street Fighter 6', players: 2, units: 2, tick: 60, tol: 50, hidden: false, ship: 1, what: '2 players, 2 fighters, frame-exact inputs' },
    { n: 'Tactical shooter', game: 'Valorant', players: 10, units: 40, tick: 128, tol: 60, hidden: true, ship: 2, what: '10 players, about 40 moving things, walls hide enemies' },
    { n: 'Raid in an online world', game: 'World of Warcraft', players: 40, units: 200, tick: 10, tol: 250, hidden: false, ship: 2, joins: true, what: '40 players, about 200 creatures and effects, people come and go' }];
  const OPT = [{ n: 'Lockstep', d: 'Everyone sends inputs. Every machine runs the same simulation, turn by turn.' }, { n: 'Rollback', d: 'Everyone sends inputs and guesses the rest, then rewinds and replays when a guess was wrong.' }, { n: 'Server-authoritative', d: 'One server runs the game and sends every client the state of what it can see.' }];
  function cost(b, k, ping) { const fr = 1000 / b.tick, f = [];
    if (k === 0) { const own = 2 * ping + fr; if (own > b.tol) f.push(`your input waits ${Math.round(own)} ms: over this genre’s ${b.tol} ms`); f.push('every machine must compute identically, or the match desyncs'); if (b.hidden) f.push('every client holds the whole game state: map hacks'); if (b.joins) f.push('a player joining late needs the full state sent anyway'); if (b.players >= 8) f.push(`one slow player of ${b.players} stalls every turn`);
      return { bw: b.players * INB * b.tick * 8 / 1000, own, others: own, cpu: b.units, f, dead: own > b.tol || !!b.joins }; }
    if (k === 1) { const rb = Math.ceil(2 * ping / fr), cpu = b.units * (1 + rb), links = b.players * (b.players - 1) / 2; if (cpu > CPULINE) f.push(`rewinding ${rb} steps re-simulates ${cpu.toLocaleString()} unit-steps a frame: over the ${CPULINE.toLocaleString()} line`); f.push('every machine must compute identically'); if (b.hidden) f.push('every client holds the whole game state: wall hacks'); if (links > 6) f.push(`${links} peer links to keep in step`); if (b.joins) f.push('a player joining late needs the full state sent anyway');
      return { bw: (b.players - 1) * INB * b.tick * 8 / 1000, own: fr, others: ping, cpu, f, dead: cpu > CPULINE || !!b.joins }; }
    const bw = b.units * ENTB * b.tick * 8 / 1000; if (bw > BWLINE) f.push(`${Math.round(bw).toLocaleString()} kbit/s to each player: over the ${BWLINE} kbit/s line`); f.push('someone pays for a server for every match'); if (2 * ping + fr > b.tol) f.push(`others are ${Math.round(2 * ping + fr)} ms stale: over this genre’s ${b.tol} ms`);
    return { bw, own: fr, others: 2 * ping + fr, cpu: b.units, f, dead: bw > BWLINE }; }
  let API = null, SIDE = null;
  PLAY.game('netcode', {
    dur: 34, keys: [' '],
    opts: s => ({ ping: +(s.querySelector('[data-k=ping]')?.value || 40) }),
    setup(s, api) { API = api; SIDE = s; const r = s.querySelector('[data-k=ping]'), lab = s.querySelector('.rng i'); const up = () => { lab.textContent = r.value + ' ms each way'; }; r.oninput = up; up(); },
    init(o, live) { return { live, t: 0, i: 0, picks: [], ph: 'pick', lamps: null, ping: o.ping || 40 }; },
    step(st, inp, dt) {
      st.t += dt; const c = inp.click, pr = inp.press || {}; if (st.live && SIDE) st.ping = +SIDE.querySelector('[data-k=ping]').value;
      if (st.ph === 'pick' && typeof c === 'number') { st.picks[st.i] = c; st.ph = 'show'; st.at = st.t; st.lamps = null; if (st.live) PLAY.beep(c === BR[st.i].ship ? 880 : 300, .12, .1); return; }
      if (st.ph === 'show') { if (pr[' '] || c === 'press') st.lamps = st.t; if (c === 'next') { st.i++; st.lamps = null; st.ph = st.i >= 4 ? 'done' : 'pick'; } return; }
      if (st.ph === 'done' && c === 'again' && st.live) API.start();
    },
    // the scripted designer picks the server for everything, which is the habit this page is about
    bot(st) { const out = { down: {}, press: {} }; st.bt = (st.bt || 0) + PLAY.DT; if (st.ph === 'pick' && st.bt > 2) { out.click = 2; st.bt = 0; } if (st.ph === 'show') { if (st.bt > 2 && st.bt < 2.05) out.press[' '] = true; if (st.bt > 5.5) { out.click = 'next'; st.bt = 0; } } return out; },
    draw(g, st, ui, live) {
      GK.panel(g); const i = Math.min(3, st.i), b = BR[i], show = st.ph !== 'pick', pk = st.picks[i], cs = [0, 1, 2].map(k => cost(b, k, st.ping));
      GK.head(g, st.ph === 'done' ? 'Four briefs answered' : `Brief ${i + 1} of 4: ${b.n}`, FX, 32, 'left', C.ink, 17);
      GK.box(g, FX, FY, FW, 54, '#eef2ff', '#8ea2e6', 10, 2); GK.text(g, b.what, FX + 16, FY + 24, C.ink, 14, 'left', 800); GK.text(g, `simulation steps ${b.tick} times a second · this genre tolerates about ${b.tol} ms before input feels late`, FX + 16, FY + 43, C.muted, 11, 'left', 600);
      OPT.forEach((o, k) => { const x = FX + k * 216, y = FY + 64, w = 208, h = 252, c = cs[k], mine = pk === k, ship = show && b.ship === k; GK.box(g, x, y, w, h, mine ? '#fff6dd' : '#fffaf0', ship ? C.good : mine ? C.navy : '#cdbf9f', 10, ship || mine ? 3 : 1.5); if (!show) ui.hit(k, x, y, w, h);
        GK.text(g, o.n, x + 12, y + 24, C.ink, 14.5, 'left', 800); let yy = GK.wrap(g, o.d, x + 12, y + 42, w - 24, 14, C.muted, 10.5, 500);
        if (!show) { GK.text(g, 'click to choose', x + w / 2, y + h - 16, '#8ea2e6', 12, 'center', 700); return; }
        yy = y + 96; [['to each player', `${c.bw < 10 ? c.bw.toFixed(1) : Math.round(c.bw).toLocaleString()} kbit/s`], ['your input shows after', `${Math.round(c.own)} ms`], ['others are stale by', `${Math.round(c.others)} ms`], ['unit-steps a frame', c.cpu.toLocaleString()]].forEach(([l, v], j) => { GK.text(g, l, x + 12, yy + j * 17, C.muted, 10.5, 'left', 600); GK.text(g, v, x + w - 12, yy + j * 17, C.ink, 11.5, 'right', 800); });
        yy += 4 * 17 + 2; c.f.slice(0, 4).forEach(t => { g.fillStyle = c.dead ? C.redDk : '#b07a00'; g.beginPath(); g.arc(x + 16, yy - 3, 3, 0, TAU); g.fill(); yy = GK.wrap(g, t, x + 24, yy, w - 34, 12, c.dead ? C.redDk : '#6b5a2a', 9.5, 600) + 3; });
        if (ship) TD.label(`${b.game} shipped this`, x + w / 2, y + h + 2, 'center', '#fff', 11, 'rgba(47,174,99,.97)'); if (mine) TD.label(live ? 'your pick' : 'script’s pick', x + w / 2, y - 2, 'center', '#fff', 11, 'rgba(30,40,90,.95)'); });
      const ly = FY + 340;
      if (show && st.ph !== 'done') { GK.text(g, 'Feel it: press Space. Each lamp lights when that model would show your input.', FX, ly + 4, C.ink, 12, 'left', 700); const el = st.lamps != null ? (st.t - st.lamps) * 1000 : -1;
        cs.forEach((c, k) => { const x = FX + k * 150, on = el >= c.own && el < c.own + 700; g.fillStyle = on ? '#ffd23f' : '#d9d2bd'; g.beginPath(); g.arc(x + 16, ly + 34, 13, 0, TAU); g.fill(); g.strokeStyle = '#8a7f66'; g.lineWidth = 2; g.stroke(); GK.text(g, `${OPT[k].n.split('-')[0]} ${Math.round(c.own)} ms`, x + 36, ly + 39, C.ink, 11, 'left', 700); });
        ui.btn('press', 'Space', FX + 452, ly + 16, 80, 36, { px: 12 }); ui.btn('next', i === 3 ? 'Finish' : 'Next brief', FX + FW - 100, ly + 16, 100, 36, { px: 12, on: true }); }
      if (st.ph === 'done' && live) ui.btn('again', 'Answer them again', FX + FW / 2 - 100, ly + 14, 200, 38, { px: 13, on: true });
      GK.text(g, `Model: inputs are ${INB} bytes a step, a replicated unit is ${ENTB} bytes a step after compression. Lines at ${BWLINE} kbit/s and ${CPULINE.toLocaleString()} unit-steps are this page’s.`, FX, FY + FH + 26, C.muted, 10.5, 'left', 500);
      const RX = 690, RW = 326; GK.text(g, 'your picks beside what shipped', RX, 32, C.muted, 12, 'left', 700); let match = 0, deadN = 0;
      BR.forEach((bb, k) => { const y = 44 + k * 104, p = st.picks[k], done = p != null && (k < st.i || show), cc = done ? cost(bb, p, st.ping) : null, ok = done && p === bb.ship; if (ok) match++; if (cc && cc.dead) deadN++;
        GK.box(g, RX, y, RW, 96, k === i && st.ph !== 'done' ? '#fff6dd' : '#fffaf0', k === i && st.ph !== 'done' ? C.navy : '#cdbf9f', 10, 1.5); GK.text(g, bb.n, RX + 12, y + 22, C.ink, 13, 'left', 800); GK.text(g, `${bb.players} players · ${bb.units.toLocaleString()} units`, RX + RW - 12, y + 22, C.muted, 10.5, 'right', 600);
        if (!done) { GK.text(g, 'not answered yet', RX + 12, y + 56, C.muted, 12, 'left', 600); return; }
        GK.text(g, `${live ? 'you' : 'script'}: ${OPT[p].n}`, RX + 12, y + 46, ok ? C.good : C.navy, 12.5, 'left', 800); GK.text(g, `shipped: ${OPT[bb.ship].n} (${bb.game})`, RX + 12, y + 64, C.good, 11.5, 'left', 700);
        GK.text(g, cc.dead ? 'this pick breaks a line in the model' : `${cc.f.length} caveat${cc.f.length === 1 ? '' : 's'}, none past a line`, RX + 12, y + 84, cc.dead ? C.redDk : C.muted, 11, 'left', 700); });
      const ans = st.picks.filter((p, k) => p != null && (k < st.i || show)).length, rts = cost(BR[0], 2, st.ping);
      ui.stats(`<div class="g"><b>${match} of ${ans}</b><span>picks match what shipped</span></div><div class="r"><b>${deadN}</b><span>picks past a line in the model</span></div><div><b>${Math.round(rts.bw).toLocaleString()}</b><span>kbit/s to replicate the strategy game</span></div>`);
      const who = live ? 'You' : 'The script';
      if (st.ph === 'pick') ui.out(live ? 'Pick before you see any numbers. The costs appear once you commit.' : 'A scripted designer answers “server” to every brief.');
      else if (st.ph === 'show') ui.out(`${who} picked ${OPT[pk].n.toLowerCase()}; ${b.game} shipped ${OPT[b.ship].n.toLowerCase()}. ` + (cs[pk].dead ? `In this model the pick breaks: ${cs[pk].f[0]}.` : pk === b.ship ? 'The pick holds in the model, with the caveats listed on its card.' : `The pick holds in this model too. What shipped avoids: ${cs[pk].f[0]}.`));
      else ui.out(`${who} matched ${match} of 4 and ${deadN} pick${deadN === 1 ? '' : 's'} broke a line. Sending state costs ${Math.round(rts.bw).toLocaleString()} kbit/s per player in the strategy brief and under ${Math.ceil(cost(BR[2], 2, st.ping).bw / 10) * 10} in every other one: unit count is what forces inputs-only, and inputs-only is what demands identical arithmetic on every machine.`);
    },
  });
})();
