/* Write the Item (replanned page for "Brian Feeney's Magic Items"; Scripture: Subvert Functional Fixedness, Six Qualities of
   Deep Mechanics, Alternate Outcomes). The learner builds an item from one or two verb cards and a limit card so that it gets
   past a chasm. The page then lays the item against five other scenes and marks each one changed, ended or untouched.
   Those marks are the page's own design judgements, each with its reason printed in the cell. Nothing is simulated. */
(function () {
  const C = TD.C, TAU = TD.TAU;
  const SC = ['Chasm', 'Gate with a far switch', 'Patrolling guard', 'Dark maze', 'Flooded hall', 'Narrow pipe'];
  const VERBS = [
    { n: 'Pull', tip: 'pull yourself to a point', e: [[2, 'you fly straight across'], [1, 'reach a ledge near the switch; it still has to be thrown'], [1, 'routes open over his head'], [0, 'the walls are still walls'], [1, 'swing above the water between hooks'], [0, 'nothing in there to pull to']] },
    { n: 'Reveal', tip: 'show what is hidden', e: [[1, 'hidden footholds appear; you still jump them'], [1, 'shows which switch is live'], [1, 'his route is drawn on the floor'], [2, 'the path is drawn for you'], [0, 'water is water'], [0, 'you can see in, and that is all']] },
    { n: 'Swap', tip: 'trade places with a thing', e: [[1, 'needs something on the far side to trade with'], [2, 'trade places with the crate beside the switch'], [2, 'trade places with him and walk on'], [0, 'nothing to trade with that you can see'], [1, 'hop between floating crates'], [1, 'trade with whatever sits at the far end']] },
    { n: 'Shrink', tip: 'become small', e: [[0, 'a small fall is still a fall'], [1, 'a grate leads round to the switch'], [1, 'slip under his line of sight'], [0, 'a small maze is still a maze'], [0, 'now you are small and wet'], [2, 'you walk through it']] },
    { n: 'Carry', tip: 'lift and throw things', e: [[1, 'lay a plank, if you can find one'], [2, 'throw a rock at the switch'], [1, 'a thrown pot turns his head'], [0, 'nothing here to lift'], [1, 'stack crates into a causeway'], [0, 'you do not fit, whatever you carry']] },
    { n: 'Freeze', tip: 'freeze things in place', e: [[0, 'there is nothing in it to freeze'], [1, 'freeze the gate while it is open'], [2, 'he stands still while you pass'], [0, 'the walls do not move anyway'], [2, 'walk across the ice'], [0, 'it stays narrow']] }];
  const LIMITS = [{ n: 'No limit', tip: 'works anywhere, any time', f: (v) => v }, { n: 'Needs an anchor', tip: 'only on targets the level places', f: v => v === 2 ? [1, 'only where the level places a target, so each use is a puzzle someone built'] : null }, { n: 'Short range', tip: 'three steps and no more', f: (v, s) => v === 2 && (s === 0 || s === 4) ? [1, 'too far in one go; you need a midpoint'] : null }, { n: 'One use a room', tip: 'then it is spent', f: (v, s) => v === 1 && (s === 2 || s === 3 || s === 4) ? [0, 'one use is not enough here'] : null }];
  const MARK = [['untouched', '#8d949c', '#f1eee6'], ['changed', C.good, '#e2f2e1'], ['ended', '#b87d00', '#fbefc9']];
  function judge(verbs, lim) {
    return SC.map((_, s) => { let best = [0, verbs.length ? 'none of your verbs applies' : 'no verb chosen', null];
      verbs.forEach(vi => { let [v, why] = VERBS[vi].e[s]; const m = LIMITS[lim].f(v, s); if (m && m !== v && Array.isArray(m)) { v = m[0]; why = m[1]; } if (v > best[0]) best = [v, why, vi]; }); return best; });
  }
  const pins = [], TOUR = [[[0], 0], [[0], 1], [[2, 4], 0]];
  PLAY.game('item', {
    dur: 30, clickStarts: true,
    init(o, live) { return { live, t: 0, verbs: [], lim: 0, tp: [], think: 0, step: 0 }; },
    step(st, inp, dt) {
      st.t += dt; st.think += dt; const k = inp.click;
      if (typeof k === 'number') { if (k < 6) { const i = st.verbs.indexOf(k); if (i >= 0) st.verbs.splice(i, 1); else if (st.verbs.length < 2) st.verbs.push(k); } else st.lim = k - 6; st.think = 0; }
      if (k === 'pin' && st.verbs.length) { const j = judge(st.verbs, st.lim); (st.live ? pins : st.tp).push({ verbs: st.verbs.slice(), lim: st.lim, j: j.map(x => x[0]) }); if (st.live && pins.length > 4) pins.shift(); if (!st.live) { st.verbs = []; st.lim = 0; } st.think = 0; }
    },
    bot(st) { if (st.think < .9) return null; const P = click => ({ down: {}, press: {}, click }), T = TOUR[st.tp.length]; if (!T) return null; const nv = T[0].find(v => !st.verbs.includes(v)); st.think = .35; if (nv != null) return P(nv); if (st.lim !== T[1]) return P(6 + T[1]); if (st.wait !== st.tp.length) { st.wait = st.tp.length; st.think = -4; return null; } return P('pin'); },
    draw(g, st, ui, live) {
      GK.panel(g); const X0 = 24, j = judge(st.verbs, st.lim), ok = j[0][0] > 0;
      GK.head(g, 'Build an item to cross the chasm', X0, 32, 'left', C.ink, 17);
      GK.text(g, 'verbs: choose one or two', X0, 56, C.muted, 12, 'left', 700);
      VERBS.forEach((v, i) => { const x = X0 + (i % 3) * 124, y = 64 + (i / 3 | 0) * 62, on = st.verbs.includes(i); GK.box(g, x, y, 118, 54, on ? '#fff3cf' : '#fffaf0', on ? C.navy : '#cdbf9f', 9, on ? 3 : 1.5); GK.text(g, v.n, x + 10, y + 22, C.ink, 15, 'left', 800); GK.text(g, v.tip, x + 10, y + 42, C.muted, 10, 'left', 600); ui.hit(i, x, y, 118, 54); });
      GK.text(g, 'limit: choose one', X0, 208, C.muted, 12, 'left', 700);
      LIMITS.forEach((l, i) => { const x = X0 + (i % 2) * 186, y = 216 + (i / 2 | 0) * 58, on = st.lim === i; GK.box(g, x, y, 180, 50, on ? '#e3ebff' : '#fffaf0', on ? C.navy : '#cdbf9f', 9, on ? 3 : 1.5); GK.text(g, l.n, x + 10, y + 21, C.ink, 14, 'left', 800); GK.text(g, l.tip, x + 10, y + 39, C.muted, 10, 'left', 600); ui.hit(6 + i, x, y, 180, 50); });
      const name = st.verbs.length ? `${st.verbs.map(v => VERBS[v].n).join(' + ')} · ${LIMITS[st.lim].n.toLowerCase()}` : 'no item yet';
      GK.box(g, X0, 342, 366, 62, ok ? '#e2f2e1' : '#fbe1de', ok ? C.good : C.redDk, 10, 2); GK.text(g, name, X0 + 14, 366, C.ink, 15, 'left', 800); GK.text(g, !st.verbs.length ? 'pick a verb' : ok ? 'It gets you past the chasm.' : 'It does not get you past the chasm yet.', X0 + 14, 390, ok ? C.good : C.redDk, 13, 'left', 700);
      if (live && st.verbs.length) ui.btn('pin', 'Keep this item for comparison', X0, 414, 366, 38, { px: 13, on: true });
      // pinned
      const list = (live ? pins : st.tp).slice(-4); GK.text(g, 'items kept: ended · changed · untouched', X0, 476, C.muted, 12, 'left', 700);
      list.forEach((p, i) => { const y = 486 + i * 22, c = [2, 1, 0].map(v => p.j.filter(x => x === v).length); GK.text(g, `${p.verbs.map(v => VERBS[v].n).join(' + ')}, ${LIMITS[p.lim].n.toLowerCase()}`, X0, y + 12, C.ink, 12, 'left', 700); [2, 1, 0].forEach((v, k) => { g.fillStyle = MARK[v][1]; g.beginPath(); g.roundRect(X0 + 262 + k * 36, y, 30, 17, 5); g.fill(); GK.text(g, String(c[k]), X0 + 277 + k * 36, y + 13, '#fff', 12, 'center', 800); }); });
      // scene grid
      const GX = 418, CW = 196, CH = 236; GK.text(g, 'the same item, laid against six scenes', GX, 32, C.muted, 12, 'left', 700);
      SC.forEach((s, i) => { const x = GX + (i % 3) * (CW + 8), y = 46 + (i / 3 | 0) * (CH + 10), [v, why, vi] = j[i], M = MARK[v];
        GK.box(g, x, y, CW, CH, M[2], M[1], 10, i === 0 ? 3 : 1.5); GK.text(g, s, x + 12, y + 24, C.ink, 14, 'left', 800); if (i === 0) GK.text(g, 'your obstacle', x + CW - 12, y + 24, C.muted, 10, 'right', 700);
        // a small picture of each scene
        const cx = x + CW / 2, cy = y + 86; g.save(); g.beginPath(); g.roundRect(x + 12, y + 36, CW - 24, 100, 8); g.clip(); g.fillStyle = '#3f4658'; g.fillRect(x, y + 36, CW, 100); g.fillStyle = '#8b93a6';
        if (i === 0) { g.fillRect(x, cy + 14, 62, 60); g.fillRect(x + CW - 62, cy + 14, 62, 60); }
        if (i === 1) { g.fillRect(x, cy + 30, CW, 30); g.fillStyle = '#c9a54a'; for (let b = 0; b < 5; b++) g.fillRect(cx - 20 + b * 9, cy - 30, 4, 60); g.fillStyle = '#e5322d'; g.fillRect(x + CW - 40, cy - 20, 12, 12); }
        if (i === 2) { g.fillRect(x, cy + 30, CW, 30); TD.cone(cx + 30, cy + 16, Math.PI, .5, 70, .7); g.fillStyle = C.red; g.beginPath(); g.arc(cx + 30, cy + 16, 10, 0, TAU); g.fill(); }
        if (i === 3) { g.strokeStyle = '#8b93a6'; g.lineWidth = 5; g.beginPath(); g.moveTo(x + 30, y + 46); g.lineTo(x + 30, y + 110); g.lineTo(x + 80, y + 110); g.moveTo(x + 70, y + 46); g.lineTo(x + 70, y + 86); g.lineTo(x + 130, y + 86); g.lineTo(x + 130, y + 126); g.moveTo(x + 110, y + 46); g.lineTo(x + 110, y + 62); g.lineTo(x + 170, y + 62); g.stroke(); }
        if (i === 4) { g.fillRect(x, cy + 14, 40, 60); g.fillRect(x + CW - 40, cy + 14, 40, 60); g.fillStyle = '#4a90d9'; g.fillRect(x + 40, cy + 22, CW - 80, 60); }
        if (i === 5) { g.fillRect(x, y + 36, CW, 34); g.fillRect(x, cy + 2, CW, 60); }
        g.fillStyle = C.blue; g.beginPath(); g.arc(x + 34, i === 5 ? cy + 44 : cy + (i === 3 ? 30 : 4), 8, 0, TAU); if (i !== 5) g.fill(); g.restore();
        g.fillStyle = M[1]; g.beginPath(); g.roundRect(x + 12, y + 146, 84, 20, 10); g.fill(); GK.text(g, M[0], x + 54, y + 160, '#fff', 12, 'center', 800); if (vi != null && st.verbs.length > 1) GK.text(g, `by ${VERBS[vi].n}`, x + 104, y + 160, C.muted, 11, 'left', 700);
        GK.wrap(g, why, x + 12, y + 186, CW - 24, 15, C.ink, 12, 600); });
      const c = [2, 1, 0].map(v => j.filter(x => x[0] === v).length);
      ui.stats(`<div><b>${c[1]}</b><span>scenes changed</span></div><div class="r"><b>${c[0]}</b><span>scenes ended outright</span></div><div><b>${c[2]}</b><span>untouched</span></div>`);
      if (!st.verbs.length) { ui.out(live ? 'Start with the chasm. Then look at what the same item does to the other five scenes.' : 'Three items in turn: a pull with no limit, a pull that needs an anchor, and a swap that can also carry.'); return; }
      ui.out(`${name}: ${c[1]} of 6 scenes changed, ${c[0]} ended, ${c[2]} untouched. ` + (!ok ? 'It does not yet beat the obstacle it was written for. ' : '') + (c[0] >= 3 ? 'An item that ends this many scenes leaves nobody a decision in them; the designer now has to build around it everywhere. ' : c[2] >= 4 ? 'An item this narrow is a key: it opens its one door and is dead weight after. ' : c[1] >= 4 && c[0] <= 1 ? 'This is the shape worth carrying: it gives many scenes a new question and answers few of them outright. ' : 'A mixed result: look at which scenes it ends, and whether a limit would turn those into questions. ') + 'These marks are judgement calls, with the reasons in the cells. Disagreeing with one is the exercise.');
    },
  });
})();
