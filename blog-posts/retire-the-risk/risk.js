/* Retire the Risk (replanned page for "Atomech's First Year"; Scripture: Scoping, Fix the Weakest Element, Playtesting
   as Hypothesis Testing, Cash Flow). The learner orders six task cards into a year. When the core prototype is
   finished a coin decides whether the core works. The page plays the rolled year month by month, then shows the year
   the other face of the coin would have given, so nothing about the odds is hidden. All figures are this page's own. */
(function () {
  const C = TD.C, FX = 24, FY = 56, FW = 640, FH = 410, CASH = 11, MW = 36;
  const T = { core: { n: 'Core prototype', m: 2, col: '#c0392b', d: 'Is the game fun at all? Nobody knows until this is played.' }, art: { n: 'Art pass', m: 3, col: '#8e5bd0', d: 'Half of it is thrown away if the core changes.' }, trailer: { n: 'Trailer', m: 1, col: '#e67e22', d: 'Shows the game as it is. Useless if the core changes.' }, net: { n: 'Netcode', m: 2, col: '#3f7fd0', d: 'Built on the core. All of it goes if the core changes.' }, content: { n: 'Levels', m: 3, col: '#2fae63', d: 'Built on the core. All of it goes if the core changes.' }, menus: { n: 'Menus', m: 1, col: '#7d8fa8', d: 'Survives any change to the core.' } };
  const IDS = Object.keys(T), LOSS = { art: .5, trailer: 1, net: 1, content: 1, menus: 0 };
  function sim(order, works) { let cash = CASH, month = 0, funded = null, truth = null, redo = 0; const q = order.map(id => ({ id, left: T[id].m })), done = {}, cells = [], ev = [];
    while (q.length) { if (month >= cash) return { cells, ev, truth, redo, cashEnd: cash, dead: month, leftWork: q.reduce((a, x) => a + x.left, 0), funded }; month++; const cur = q[0]; cur.left--; cells.push({ id: cur.id, redo: cur.redo, pivot: cur.pivot });
      if (cur.left === 0) { q.shift(); done[cur.id] = true;
        if (cur.id === 'core' && !truth) { truth = { month, runway: cash - month, works }; ev.push({ m: month, t: works ? 'core tested: it works' : 'core tested: it does not work', bad: !works });
          if (!works) { const re = []; order.forEach(id => { if (id !== 'core' && done[id] && LOSS[id]) { const lost = Math.ceil(T[id].m * LOSS[id]); redo += lost; done[id] = false; re.push({ id, left: lost, redo: true }); } }); q.unshift({ id: 'core', left: 2, pivot: true }, ...re); redo += 2; done.core = false; } } }
      [[4, 5, 'early'], [8, 3, 'late']].forEach(([m, add, tag]) => { if (month === m && !funded) { if (done.art && done.trailer) { cash += add; funded = tag; ev.push({ m, t: `publisher pitch: funded, +${add} months` }); } else ev.push({ m, t: 'publisher pitch: nothing to show', bad: true }); } }); }
    return { cells, ev, truth, redo, cashEnd: cash, shipped: month, left: cash - month, funded }; }
  let API = null;
  PLAY.game('risk', {
    dur: 44, keys: [],
    setup(s, api) { API = api; },
    init(o, live) { return { live, t: 0, ph: 'plan', order: [], R: live ? Math.random : GK.rng(3), pass: 0, hist: [] }; },
    step(st, inp, dt) {
      st.t += dt; const c = inp.click;
      if (st.ph === 'plan') { if (inp.setOrder) st.order = inp.setOrder; if (typeof c === 'number') { const id = IDS[c], k = st.order.indexOf(id); if (k >= 0) st.order.splice(k, 1); else st.order.push(id); } if (c === 'clear') st.order = [];
        if (c === 'go' && st.order.length === 6) { st.works = inp.force != null ? inp.force : st.R() < .5; st.run = sim(st.order, st.works); st.alt = sim(st.order, !st.works); st.ph = 'run'; st.rt = 0; } return; }
      if (st.ph === 'run') { st.rt += dt; const end = (st.run.cells.length + 1) * .5; if (st.rt > end + .8) { st.ph = 'done'; st.at = st.t; st.hist.push({ order: st.order.slice(), run: st.run, alt: st.alt }); } return; }
      if (st.ph === 'done') { if (st.live) { if (c === 'replan') { st.ph = 'plan'; } if (c === 'again') API.start(); } }
    },
    // the scripted studio head builds what shows well first, then tries the year again with the core first
    bot(st) { const out = { down: {}, press: {} }; st.bt = (st.bt || 0) + PLAY.DT;
      if (st.ph === 'plan') { const plan = st.pass === 0 ? ['art', 'trailer', 'core', 'net', 'content', 'menus'] : ['core', 'art', 'trailer', 'net', 'content', 'menus']; if (st.bt > 1 && st.order.length < 6) out.setOrder = plan; if (st.bt > 3) { out.click = 'go'; out.force = false; st.bt = 0; } }
      if (st.ph === 'done' && st.pass === 0 && st.t - st.at > 4) { st.pass = 1; st.ph = 'plan'; st.order = []; st.bt = 0; } return out; },
    draw(g, st, ui, live) {
      GK.panel(g); const RX = 690, RW = 326;
      const row = (r, y, upto, label) => { GK.text(g, label, FX, y - 8, C.ink, 12, 'left', 800); for (let m = 1; m <= 17; m++) { const x = FX + (m - 1) * MW; g.fillStyle = '#efe6d2'; g.fillRect(x + 1, y, MW - 2, 38); GK.text(g, String(m), x + MW / 2, y + 52, C.muted, 10, 'center', 600); }
        r.cells.slice(0, upto).forEach((c, k) => { const x = FX + k * MW; g.fillStyle = T[c.id].col; g.globalAlpha = c.redo || c.pivot ? .55 : 1; g.fillRect(x + 1, y, MW - 2, 38); g.globalAlpha = 1; if (c.redo || c.pivot) { g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(x + 6, y + 32); g.lineTo(x + MW - 6, y + 6); g.stroke(); } GK.text(g, T[c.id].n.slice(0, 4), x + MW / 2, y + 23, '#fff', 9.5, 'center', 800); });
        let cash = CASH; r.ev.forEach(e => { if (e.m <= upto && e.t.includes('+')) cash += +e.t.split('+')[1][0]; }); const cx = FX + Math.min(17, cash) * MW; g.strokeStyle = C.redDk; g.lineWidth = 3; g.beginPath(); g.moveTo(cx, y - 6); g.lineTo(cx, y + 44); g.stroke(); GK.text(g, 'cash ends', cx - 4, y - 10, C.redDk, 10, 'right', 800);
        r.ev.filter(e => e.m <= upto).forEach((e, k) => { GK.text(g, `month ${e.m}: ${e.t}`, FX + (k % 2) * 320, y + 70 + Math.floor(k / 2) * 15, e.bad ? C.redDk : C.good, 11, 'left', 700); });
        if (upto >= r.cells.length) GK.text(g, r.dead != null ? `Studio closes at month ${r.dead} with ${r.leftWork} month${r.leftWork === 1 ? '' : 's'} of work left` : `Shipped in month ${r.shipped} with ${r.left} month${r.left === 1 ? '' : 's'} of cash left`, FX, y + 108, r.dead != null ? C.redDk : C.good, 13, 'left', 800); };
      if (st.ph === 'plan') {
        GK.head(g, 'Plan the year: click the cards in the order you will build them', FX, 32, 'left', C.ink, 16);
        IDS.forEach((id, k) => { const x = FX + (k % 3) * 216, y = FY + Math.floor(k / 3) * 112, at = st.order.indexOf(id), on = at >= 0; GK.box(g, x, y, 208, 104, on ? '#eef2ff' : '#fffaf0', on ? C.navy : '#cdbf9f', 10, on ? 2.5 : 1.5); ui.hit(k, x, y, 208, 104); g.fillStyle = T[id].col; g.fillRect(x + 12, y + 14, 10, 30);
          GK.text(g, T[id].n, x + 30, y + 27, C.ink, 14, 'left', 800); GK.text(g, `${T[id].m} month${T[id].m === 1 ? '' : 's'}`, x + 30, y + 43, C.muted, 11, 'left', 700); GK.wrap(g, T[id].d, x + 12, y + 64, 184, 13, C.muted, 10.5, 500); if (on) { g.fillStyle = C.navy; g.beginPath(); g.arc(x + 186, y + 22, 12, 0, Math.PI * 2); g.fill(); GK.text(g, String(at + 1), x + 186, y + 26.5, '#fff', 13, 'center', 800); } });
        const y = FY + 236; GK.text(g, 'your year', FX, y + 2, C.muted, 12, 'left', 700); let m = 0; st.order.forEach(id => { const w = T[id].m * MW; g.fillStyle = T[id].col; g.fillRect(FX + m * MW + 1, y + 10, w - 2, 34); GK.text(g, T[id].n.split(' ')[0], FX + m * MW + w / 2, y + 31, '#fff', 10.5, 'center', 800); m += T[id].m; });
        for (let k = 1; k <= 12; k++) GK.text(g, String(k), FX + (k - 1) * MW + MW / 2, y + 58, C.muted, 10, 'center', 600); [[4, '+5'], [8, '+3']].forEach(([mm, a]) => { const x = FX + mm * MW; g.strokeStyle = '#b07a00'; g.lineWidth = 2; g.setLineDash([4, 3]); g.beginPath(); g.moveTo(x, y + 6); g.lineTo(x, y + 48); g.stroke(); g.setLineDash([]); GK.text(g, `pitch ${a}`, x, y + 72, '#b07a00', 10, 'center', 800); });
        ui.btn('clear', 'Clear', FX, y + 86, 90, 38, { px: 13 }); if (st.order.length === 6) ui.btn('go', 'Run the year', FX + FW - 190, y + 86, 190, 38, { px: 14, on: true }); else GK.text(g, `${6 - st.order.length} card${6 - st.order.length === 1 ? '' : 's'} left to place`, FX + FW, y + 110, C.muted, 12, 'right', 700);
        GK.wrap(g, `You have ${CASH} months of cash for 12 months of work. A publisher looks at month 4 and again at month 8, and funds the first time it sees finished art and a trailer. When the core prototype is done, a coin decides whether the core works. If not, it takes 2 months to rebuild.`, FX, FY + FH - 22, FW, 14, C.muted, 11, 500);
      } else { const upto = st.ph === 'run' ? Math.min(st.run.cells.length, Math.floor(st.rt / .5)) : st.run.cells.length;
        GK.head(g, st.ph === 'run' ? `Month ${Math.max(1, upto)}` : 'The year, and the year the coin did not give you', FX, 32, 'left', C.ink, 16);
        row(st.run, FY + 26, upto, `This roll: the core ${upto >= (st.run.truth ? st.run.truth.month : 99) ? (st.works ? 'works' : 'does not work') : 'is untested'}`);
        if (st.ph === 'done') { row(st.alt, FY + 186, st.alt.cells.length, `The other face: the core ${st.works ? 'does not work' : 'works'}`); if (live) { ui.btn('replan', 'Change the plan', FX, FY + 350, 180, 38, { px: 13, on: true }); ui.btn('again', 'Start over', FX + 196, FY + 350, 130, 38, { px: 13 }); } }
        GK.text(g, 'Hatched months are work done a second time. The red line is the month the cash runs out.', FX, FY + FH + 26, C.muted, 11, 'left', 500); }
      // right
      GK.text(g, 'both faces of the coin for this plan', RX, 32, C.muted, 12, 'left', 700); GK.box(g, RX, 44, RW, 220, '#fffaf0', '#cdbf9f', 10, 1.5);
      const A = st.ph === 'done' ? (st.works ? st.run : st.alt) : st.order.length === 6 && st.ph === 'plan' ? null : (st.ph === 'done' ? st.run : null), B = st.ph === 'done' ? (st.works ? st.alt : st.run) : null;
      ['', 'core works', 'core fails'].forEach((h, k) => GK.text(g, h, RX + [14, 190, 290][k], 70, C.ink, 12, k ? 'center' : 'left', 800));
      [['truth learned in month', r => r.truth.month], ['cash left at that moment', r => r.truth.runway + ' mo'], ['months of work redone', r => r.redo], ['publisher', r => r.funded ? r.funded + ' yes' : 'no'], ['the year ends', r => r.dead != null ? 'closes m' + r.dead : 'ships m' + r.shipped], ['cash left at ship', r => r.dead != null ? 'none' : r.left + ' mo']].forEach(([l, f], k) => { const y = 98 + k * 27; GK.text(g, l, RX + 14, y, C.muted, 11.5, 'left', 600); [A, B].forEach((r, j) => GK.text(g, r ? String(f(r)) : '?', RX + [190, 290][j], y, r ? (r.dead != null && k >= 4 ? C.redDk : C.ink) : '#b9ad92', 12.5, 'center', 800)); });
      GK.text(g, 'plans run so far', RX, 290, C.muted, 12, 'left', 700); st.hist.slice(-5).forEach((h, k) => { const w = h.run.truth.works ? h.run : h.alt, f = h.run.truth.works ? h.alt : h.run, y = 310 + k * 40; GK.text(g, h.order.map(id => T[id].n.split(' ')[0]).join(' › '), RX, y, C.ink, 10.5, 'left', 700); GK.text(g, `works: ${w.dead != null ? 'closes' : 'ships, ' + w.left + ' left'} · fails: ${f.dead != null ? 'closes m' + f.dead : 'ships, ' + f.left + ' left'}`, RX, y + 15, C.muted, 11, 'left', 600); });
      if (!st.hist.length) GK.text(g, 'none yet', RX, 310, C.muted, 12, 'left', 600);
      const r = st.run, shown = st.ph === 'done';
      ui.stats(`<div><b>${shown ? r.truth.runway + ' mo' : '?'}</b><span>cash left when the truth arrived</span></div><div class="r"><b>${shown ? r.redo : '?'}</b><span>months of work redone</span></div><div class="g"><b>${shown ? (r.dead != null ? 'closed' : 'shipped') : '?'}</b><span>how this roll ended</span></div>`);
      const who = live ? 'You' : 'The script';
      if (st.ph === 'plan') { ui.out(live ? 'Order all six cards, then run the year. The core either works or it does not, and you find out the month the prototype is finished.' : 'A scripted studio head builds what shows well first. Its coin is fixed to “the core does not work” so the two plans can be compared.'); return; }
      if (st.ph === 'run') { ui.out('The year is playing out a month at a time.'); return; }
      const w = st.works ? st.run : st.alt, f = st.works ? st.alt : st.run, corePos = st.order.indexOf('core') + 1;
      ui.out(`${who} tested the core ${corePos === 1 ? 'first' : 'as card ' + corePos} and learned the truth in month ${r.truth.month} with ${r.truth.runway} months of cash. If the core works this plan ${w.dead != null ? 'closes in month ' + w.dead : `ships with ${w.left} months left`}; if it fails it ${f.dead != null ? `closes in month ${f.dead} after redoing ${f.redo} months` : `ships with ${f.left} left after redoing ${f.redo} months`}. ` + (f.dead != null && w.dead == null ? 'The plan only survives one face of the coin: everything stacked on the untested core was a bet.' : f.dead == null && w.dead == null ? `Both faces ship. The price was ${w.funded === 'early' ? 'small' : 'the month-4 pitch: nothing to show yet, so less cash at the end'}.` : 'Neither face ships: too much work for the cash in this order.'));
    },
  });
})();
