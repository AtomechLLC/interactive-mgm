/* The Word Budget (replanned page for "Branch and Bottleneck"; Scripture: Dialogue Hubs and Branching, Variable Hubs
   and Reactive Dialogue, Linear Story System Layout). The learner lays out a four-act story with three choices and a
   fixed 30,000 words: each choice is a full branch, a bottleneck or a remembered flag. Then they read it once and say
   which choices seemed to matter. Word counts follow exactly from the layout; the unit sizes are this page's own. */
(function () {
  const C = TD.C, TAU = TD.TAU, FX = 24, FY = 56, FW = 640, FH = 410, BUDGET = 30000, MODE = ['Branch', 'Bottleneck', 'Flag'], NECK = 1, CALL = .1;
  const MD = ['The story splits in two and stays split.', 'One scene differs, then the paths rejoin and forget.', 'One path, with a line in every later act that remembers.'];
  const ACT = ['You carry a sealed letter north. The border closes at nightfall.', 'In the garrison town a deserter grabs your sleeve and begs you to hide him.', 'On the north road a checkpoint captain asks to see the letter.', 'The border closes behind you. Whatever the letter said, it is done.'];
  const CH = [['Pay the smuggler for his boat', 'Climb the mountain pass'], ['Hide him', 'Turn him in'], ['Burn the letter', 'Hand it over']];
  const FULL = [[ 'The boat lands you under the garrison wall at dusk, soaked and unseen. In the fish market a deserter grabs your sleeve: he watched you come ashore, and he will talk unless you hide him.', 'The pass drops you into the garrison town from above with frost on your coat. At the well a deserter begs you to hide him. He says he knows the high paths out.' ],
    ['With the deserter under the tarp of a borrowed cart you reach the checkpoint. The captain asks for the letter, and the tarp moves.', 'The garrison paid you with a pass stamp. At the checkpoint the captain waves the stamp aside and asks for the letter instead.'],
    ['You feed the letter to the brazier, and the captain’s face tells you what it was worth. The border closes behind you and you carry nothing.', 'The captain reads it twice and salutes. The border closes behind you, and by morning the war has a new side.']];
  const OPEN = [['The smuggler’s boat scrapes ashore below the wall.', 'The pass lets you out above the rooftops.'], ['The deserter slips away at the first milestone with a nod.', 'The sergeant buys you a drink and forgets your face.'], ['Ash on your fingers.', 'The captain pockets the letter.']];
  const NOW = [[' He smells the river on you.', ' He sees the frost on your coat.'], [' The deserter, in a stolen uniform, stands guard behind him.', ' A poster of the man you gave up hangs on the gatepost.'], [' You still smell smoke.', ' Your satchel is very light.']];
  const LATER = [[[' Your boots are still wet from the river.', ' Your hands are still cracked from the pass.'], [' Behind you the river keeps its secret.', ' Behind you the pass fills with snow.']], [[' Somewhere a deserter owes you his life.', ' Somewhere a deserter curses your name.']]];
  function layout(m) { const acts = [{ auth: 1, read: 1, mult: 1 }]; let mult = 1; for (let k = 1; k <= 3; k++) { const prev = m[k - 1]; if (prev === 0) mult *= 2; const remembered = m.slice(0, k).filter((v, j) => v === 2 || (v === 0 && j < k - 1)).length, neck = prev === 1; acts.push({ auth: mult * (1 + (neck ? NECK : 0) + CALL * remembered), read: 1 + (neck ? NECK / 2 : 0) + CALL * remembered, mult }); }
    const total = acts.reduce((a, x) => a + x.auth, 0), wpu = BUDGET / total, read = acts.reduce((a, x) => a + x.read, 0); return { acts, total, wpu, readWords: read * wpu, share: read / total, back: m.map((v, j) => v === 1 ? 0 : 3 - j) }; }
  function text(m, picks, k) { if (k === 0) return ACT[0]; const j = k - 1, p = picks[j]; let s = m[j] === 0 ? FULL[j][p] : m[j] === 1 ? OPEN[j][p] + ' ' + ACT[k] : ACT[k] + NOW[j][p]; for (let e = 0; e < j; e++) if (m[e] !== 1) s += LATER[e][k - e - 2][picks[e]]; return s; }
  let API = null;
  PLAY.game('words', {
    dur: 56, keys: [],
    setup(s, api) { API = api; },
    init(o, live) { return { live, t: 0, ph: 'lay', m: [0, 1, 2], picks: [], k: 0, rate: [], pass: 0 }; },
    step(st, inp, dt) {
      st.t += dt; const c = inp.click; if (inp.setM) st.m = inp.setM;
      if (st.ph === 'lay') { if (typeof c === 'number') st.m[Math.floor(c / 3)] = c % 3; if (c === 'go') { st.ph = 'read'; st.picks = []; st.k = 0; st.rate = []; st.at = st.t; } return; }
      if (st.ph === 'read') { if (c === 'a' || c === 'b') { st.picks[st.k] = c === 'a' ? 0 : 1; st.k++; st.at = st.t; if (st.live) PLAY.beep(660, .08, .08); } if (st.k === 3 && c === 'end') st.ph = 'rate'; return; }
      if (st.ph === 'rate') { if (typeof c === 'string' && c[0] === 'r') { st.rate[+c[1]] = c[2] === 'y'; } if (st.rate.filter(v => v != null).length === 3 && c === 'sum') { st.ph = 'done'; st.at = st.t; (st.hist = st.hist || []).push({ m: st.m.slice(), L: layout(st.m), rate: st.rate.slice() }); } return; }
      if (st.ph === 'done' && st.live) { if (c === 'relay') st.ph = 'lay'; if (c === 'again') API.start(); }
    },
    // the scripted writer branches everything, then tries flags; it rates a choice as mattering only if it came back in a later act
    bot(st) { const out = { down: {}, press: {} }; st.bt = (st.bt || 0) + PLAY.DT; const go = (d, f) => { if (st.bt > d) { f(); st.bt = 0; } };
      if (st.ph === 'lay') { if (st.bt > .8 && st.bt < .85) out.setM = st.pass === 0 ? [0, 0, 0] : [2, 1, 2]; go(3, () => out.click = 'go'); }
      else if (st.ph === 'read') go(st.k < 3 ? 3.2 : 3.6, () => out.click = st.k < 3 ? (st.k === 1 ? 'b' : 'a') : 'end');
      else if (st.ph === 'rate') { const L = layout(st.m), n = st.rate.filter(v => v != null).length; go(.9, () => out.click = n < 3 ? 'r' + n + (L.back[n] > 0 ? 'y' : 'n') : 'sum'); }
      else if (st.ph === 'done' && st.pass === 0 && st.t - st.at > 3.5) { st.pass = 1; st.ph = 'lay'; st.bt = 0; } return out; },
    draw(g, st, ui, live) {
      GK.panel(g); const L = layout(st.m), reading = st.ph !== 'lay';
      GK.head(g, st.ph === 'lay' ? 'Lay out the story: what does each choice do?' : st.ph === 'read' ? 'Read it once' : st.ph === 'rate' ? 'Which choices seemed to matter?' : 'What your one reading saw', FX, 32, 'left', C.ink, 16);
      // flowchart
      GK.box(g, FX, FY, FW, 178, '#f6efdd', '#cdbf9f', 10, 1.5); const colX = k => FX + 60 + k * 172, nodeY = (k, i) => FY + 20 + (i + .5) * 150 / L.acts[k].mult, h = Math.max(5, Math.min(40, L.wpu / 7500 * 40));
      let idx = 0; const pathIdx = [0]; for (let k = 1; k <= 3; k++) { if (st.m[k - 1] === 0) idx = idx * 2 + (st.picks[k - 1] || 0); pathIdx.push(idx); }
      for (let k = 0; k <= 3; k++) { const n = L.acts[k].mult; for (let i = 0; i < n; i++) { const x = colX(k), y = nodeY(k, i), on = reading && st.k >= k && pathIdx[k] === i;
          if (k > 0) { const pi = st.m[k - 1] === 0 ? Math.floor(i / 2) : i, px = colX(k - 1) + 44, py = nodeY(k - 1, pi), pon = on && pathIdx[k - 1] === pi; g.strokeStyle = pon ? C.navy : '#b9ad92'; g.lineWidth = pon ? 3 : 1.5; g.beginPath(); g.moveTo(px, py); g.lineTo(x - 44, y); g.stroke();
            if (st.m[k - 1] === 1) { [-1, 1].forEach((d, v) => { const mx = (px + x - 44) / 2, my = y + d * Math.max(7, Math.min(13, 60 / n)); g.fillStyle = on && st.picks[k - 1] === v ? C.navy : '#d8cba9'; g.beginPath(); g.moveTo(mx - 9, my); g.lineTo(mx, my - 5); g.lineTo(mx + 9, my); g.lineTo(mx, my + 5); g.fill(); }); } }
          g.fillStyle = on ? C.navy : '#c9bfa6'; g.beginPath(); g.roundRect(x - 44, y - h / 2, 88, h, Math.min(5, h / 2)); g.fill(); const fl = st.m.slice(0, k).filter(v => v === 2).length; for (let f = 0; f < fl; f++) { g.fillStyle = '#e2b93b'; g.fillRect(x + 30 - f * 9, y - h / 2 - 6, 6, 6); } } GK.text(g, ['Act 1', 'Act 2', 'Act 3', 'Ending'][k], colX(k), FY + 172, C.muted, 10, 'center', 700); }
      GK.text(g, 'bar height = words in that scene · diamonds = the one scene that differs · gold = a remembered line', FX + FW - 10, FY + 14, C.muted, 9.5, 'right', 600);
      const y0 = FY + 190;
      if (st.ph === 'lay') { CH.forEach((ch, j) => { const y = y0 + j * 50; GK.text(g, `Choice ${j + 1}: ${ch[0].toLowerCase()}, or ${ch[1].toLowerCase()}`, FX, y + 14, C.ink, 12.5, 'left', 800); GK.text(g, MD[st.m[j]], FX, y + 31, C.muted, 11, 'left', 600); MODE.forEach((n, v) => ui.btn(j * 3 + v, n, FX + 350 + v * 98, y + 4, 94, 30, { px: 11.5, on: st.m[j] === v })); });
        ui.btn('go', 'Read it once', FX + FW - 180, y0 + 164, 180, 38, { px: 14, on: true }); GK.text(g, `${Math.round(L.wpu).toLocaleString()} words per scene · ${L.total.toFixed(1)} scenes’ worth written`, FX, y0 + 188, C.ink, 12.5, 'left', 800); }
      else if (st.ph === 'read') { const k = st.k; GK.box(g, FX, y0, FW, 130, '#fffaf0', '#cdbf9f', 10, 1.5); GK.text(g, ['Act 1', 'Act 2', 'Act 3', 'Ending'][k] + ` · about ${Math.round(L.acts[k].read * L.wpu).toLocaleString()} words on your path, shown here as a few lines`, FX + 14, y0 + 20, C.muted, 10.5, 'left', 700); GK.wrap(g, text(st.m, st.picks, k), FX + 14, y0 + 44, FW - 28, 19, C.ink, 14, 500);
        if (k < 3) { ui.btn('a', CH[k][0], FX, y0 + 142, 314, 40, { px: 13, on: true }); ui.btn('b', CH[k][1], FX + 326, y0 + 142, 314, 40, { px: 13, on: true }); } else ui.btn('end', 'The end: rate the choices', FX + FW - 250, y0 + 142, 250, 40, { px: 13, on: true }); }
      else { CH.forEach((ch, j) => { const y = y0 + j * 50, r = st.rate[j]; GK.text(g, `Choice ${j + 1}: ${ch[st.picks[j]].toLowerCase()}`, FX, y + 14, C.ink, 12.5, 'left', 800); GK.text(g, st.ph === 'done' ? `${MODE[st.m[j]]}: ${L.back[j] ? `it came back in ${L.back[j]} later act${L.back[j] === 1 ? '' : 's'}` : 'one scene differed, then nothing remembered it'}` : 'Did it seem to matter to the story you read?', FX, y + 31, C.muted, 11, 'left', 600);
          if (st.ph === 'rate') { ui.btn('r' + j + 'y', 'It mattered', FX + 400, y + 4, 116, 30, { px: 11.5, on: r === true }); ui.btn('r' + j + 'n', 'It did not', FX + 522, y + 4, 116, 30, { px: 11.5, on: r === false }); } else GK.text(g, (live ? 'you: ' : 'script: ') + (r ? 'it mattered' : 'it did not'), FX + FW, y + 22, r ? C.good : C.redDk, 12.5, 'right', 800); });
        if (st.ph === 'rate' && st.rate.filter(v => v != null).length === 3) ui.btn('sum', 'Show the budget', FX + FW - 180, y0 + 164, 180, 38, { px: 14, on: true }); if (st.ph === 'done' && live) { ui.btn('relay', 'Lay it out differently', FX, y0 + 164, 210, 38, { px: 13, on: true }); ui.btn('again', 'Start over', FX + 222, y0 + 164, 130, 38, { px: 13 }); } }
      // right
      const RX = 690, RW = 326; GK.text(g, 'where 30,000 words go in this layout', RX, 32, C.muted, 12, 'left', 700); GK.box(g, RX, 44, RW, 196, '#fffaf0', '#cdbf9f', 10, 1.5);
      GK.text(g, `${PLAY.pct(L.share)}`, RX + 16, 96, C.navy, 44, 'left', 800); GK.text(g, 'of the words are on any one', RX + 130, 78, C.muted, 12, 'left', 600); GK.text(g, `reading: ${Math.round(L.readWords).toLocaleString()} of 30,000`, RX + 130, 96, C.muted, 12, 'left', 600); PLAY.bar(g, RX + 16, 112, RW - 32, 14, L.share, C.navy);
      ['Act 1', 'Act 2', 'Act 3', 'Ending'].forEach((n, k) => { const y = 150 + k * 21; GK.text(g, n, RX + 16, y, C.ink, 11.5, 'left', 700); GK.text(g, `${L.acts[k].mult} version${L.acts[k].mult === 1 ? '' : 's'}`, RX + 80, y, C.muted, 11, 'left', 600); GK.text(g, `${Math.round(L.acts[k].read * L.wpu).toLocaleString()} words on a path`, RX + RW - 16, y, C.ink, 11.5, 'right', 700); });
      GK.text(g, 'layouts read so far', RX, 264, C.muted, 12, 'left', 700); (st.hist || []).slice(-4).forEach((h, k) => { const y = 284 + k * 44, agree = h.rate.filter((r, j) => r === (h.L.back[j] > 0)).length; GK.text(g, h.m.map(v => MODE[v]).join(' › '), RX, y, C.ink, 11.5, 'left', 800); GK.text(g, `${PLAY.pct(h.L.share)} read · ${Math.round(h.L.wpu).toLocaleString()} words a scene · ${h.rate.filter(Boolean).length} of 3 felt to matter`, RX, y + 16, C.muted, 11, 'left', 600); });
      if (!(st.hist || []).length) GK.text(g, 'none yet', RX, 284, C.muted, 12, 'left', 600);
      const felt = st.rate.filter(Boolean).length;
      ui.stats(`<div><b>${PLAY.pct(L.share)}</b><span>of the budget on one reading</span></div><div class="g"><b>${Math.round(L.wpu).toLocaleString()}</b><span>words per scene</span></div><div class="r"><b>${st.ph === 'done' ? felt + ' of 3' : '?'}</b><span>choices that seemed to matter</span></div>`);
      const who = live ? 'You' : 'The script';
      if (st.ph === 'lay') ui.out(live ? `This layout writes ${L.total.toFixed(1)} scenes’ worth, so each scene gets ${Math.round(L.wpu).toLocaleString()} words, and one reader meets ${PLAY.pct(L.share)} of them.` : 'A scripted writer branches at every choice, reads it once, then tries flags and a bottleneck.');
      else if (st.ph !== 'done') ui.out(st.ph === 'read' ? 'The lines are a sample of each scene. The word counts beside them are what the layout affords.' : 'Answer from the story you read, not from the layout.');
      else { const necks = st.m.map((v, j) => v === 1 ? j : -1).filter(j => j >= 0), neckNo = necks.filter(j => st.rate[j] === false).length, flags = st.m.map((v, j) => v === 2 ? j : -1).filter(j => j >= 0), flagYes = flags.filter(j => st.rate[j]).length;
        ui.out(`${who} read ${Math.round(L.readWords).toLocaleString()} of 30,000 words, ${PLAY.pct(L.share)} of what was written, at ${Math.round(L.wpu).toLocaleString()} words a scene. ${felt} of 3 choices seemed to matter. ` + (necks.length ? `${neckNo} of ${necks.length} bottleneck${necks.length === 1 ? '' : 's'} read as not mattering. ` : '') + (flags.length ? `${flagYes} of ${flags.length} flag${flags.length === 1 ? '' : 's'} read as mattering, for a tenth of a scene each time one came back. ` : '') + (L.share < .5 ? 'Most of this budget sits on paths this reader will never see.' : L.share > .9 ? 'Nearly every word reached the reader. Whether the choices carried weight is in the tags.' : 'Some words went unread to buy difference between paths.')); }
    },
  });
})();
