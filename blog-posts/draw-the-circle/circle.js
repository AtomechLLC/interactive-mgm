/* Draw the Circle (replanned page for "The Storm"; Scripture: Failsafes, Reconstructing a Genre: Battle Royale, Zoning and
   Spacing). Thirty players sit at fixed positions on a small map. The learner places the next safe zone. The page computes,
   from that placement and the stated walking distance, who is already inside, who must cross open ground, who cannot make
   it, and which players are pushed onto the same spot. Nothing is rolled; the player positions are fixed and invented. */
(function () {
  const C = TD.C, TAU = TD.TAU, clamp = TD.clamp;
  const MX = 24, MY = 50, MW = 600, MH = 470, CUR = { x: MX + 300, y: MY + 235, r: 228 }, NR = 100, REACH = 210, NEAR = 26;
  const TOWN = { x: MX + 380, y: MY + 90, w: 150, h: 110 }, WOODS = [[MX + 140, MY + 150, 74], [MX + 250, MY + 370, 82], [MX + 500, MY + 380, 62]];
  const R = GK.rng(12), PL = [];
  for (let i = 0; i < 9; i++) PL.push({ x: TOWN.x + 12 + R() * (TOWN.w - 24), y: TOWN.y + 12 + R() * (TOWN.h - 24), town: true });
  WOODS.forEach(([x, y, r]) => { for (let i = 0; i < 2; i++) { const a = R() * TAU, d = R() * r * .7; PL.push({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d }); } });
  while (PL.length < 30) { const a = R() * TAU, d = Math.sqrt(R()) * (CUR.r - 14), p = { x: CUR.x + Math.cos(a) * d, y: CUR.y + Math.sin(a) * d }; if (!PL.some(q => Math.hypot(q.x - p.x, q.y - p.y) < 22)) PL.push(p); }
  const cover = (x, y) => (x > TOWN.x && x < TOWN.x + TOWN.w && y > TOWN.y && y < TOWN.y + TOWN.h) || WOODS.some(([wx, wy, wr]) => Math.hypot(x - wx, y - wy) < wr);
  function judge(cx, cy) {
    const out = PL.map(p => { const d = Math.hypot(p.x - cx, p.y - cy); if (d <= NR) return { p, st: 'in', ex: p.x, ey: p.y }; const go = d - NR + 8, ex = p.x + (cx - p.x) / d * go, ey = p.y + (cy - p.y) / d * go; let open = 0; for (let i = 1; i <= 12; i++) { const k = i / 12; if (!cover(p.x + (ex - p.x) * k, p.y + (ey - p.y) * k)) open += go / 12; } return { p, st: go - 8 > REACH ? 'lost' : open > 60 ? 'open' : 'walk', ex, ey, go, open }; });
    const live = out.filter(o => o.st !== 'lost'), pairs = []; for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) { const a = live[i], b = live[j]; if ((a.st !== 'in' || b.st !== 'in') && Math.hypot(a.ex - b.ex, a.ey - b.ey) < NEAR && Math.hypot(a.p.x - b.p.x, a.p.y - b.p.y) > 70) pairs.push([a, b]); }
    const n = k => out.filter(o => o.st === k).length;
    return { out, pairs, in: n('in'), open: n('open'), walk: n('walk'), lost: n('lost'), town: out.filter(o => o.p.town && o.st === 'in').length, townLost: out.filter(o => o.p.town && o.st === 'lost').length };
  }
  const fix = (x, y) => { const d = Math.hypot(x - CUR.x, y - CUR.y), m = CUR.r - NR; return d > m ? [CUR.x + (x - CUR.x) / d * m, CUR.y + (y - CUR.y) / d * m] : [x, y]; };
  const pins = [], TOURP = [[TOWN.x + 75, TOWN.y + 55], [MX + 150, MY + 360], [MX + 300, MY + 250]];
  PLAY.game('circle', {
    dur: 30, clickStarts: true,
    init(o, live) { return { live, t: 0, ph: 'place', tp: [], m: [CUR.x, CUR.y], think: 0 }; },
    step(st, inp, dt) {
      st.t += dt; st.think += dt;
      if (st.ph === 'place') { if (inp.mouse) st.m = fix(inp.mouse[0], inp.mouse[1]); if (inp.click === '_canvas' || inp.click === 'map') { st.c = st.m.slice(); st.j = judge(st.c[0], st.c[1]); st.ph = 'move'; st.at = st.t; (st.live ? pins : st.tp).push({ c: st.c, j: st.j }); if (st.live && pins.length > 3) pins.shift(); } return; }
      if (st.ph === 'move' && st.t - st.at > 3.5) st.ph = 'done';
      if (inp.click === 'again') { st.ph = 'place'; st.think = 0; }
    },
    bot(st) { const T = TOURP[Math.min(2, st.tp.length)]; if (st.ph === 'place') { const k = clamp(st.think / 1.4), from = [CUR.x, CUR.y], m = [from[0] + (T[0] - from[0]) * k, from[1] + (T[1] - from[1]) * k]; return { down: {}, press: {}, mouse: m, click: st.think > 1.8 ? '_canvas' : null }; } return st.ph === 'done' && st.tp.length < 3 && st.t - st.at > 6.5 ? { down: {}, press: {}, click: 'again' } : null; },
    draw(g, st, ui, live) {
      GK.panel(g); const placing = st.ph === 'place', c = placing ? st.m : st.c, j = placing ? judge(c[0], c[1]) : st.j, k = st.ph === 'move' ? clamp((st.t - st.at) / 3) : placing ? 0 : 1;
      GK.head(g, placing ? 'Place the next safe zone' : 'The storm closes', MX, 32, 'left', C.ink, 17);
      g.save(); g.beginPath(); g.roundRect(MX, MY, MW, MH, 12); g.clip(); g.fillStyle = '#d9cf9f'; g.fillRect(MX, MY, MW, MH);
      WOODS.forEach(([x, y, r]) => { g.fillStyle = '#7fae6a'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.fillStyle = '#5f9150'; for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(x + Math.cos(i * 2.4) * r * .6, y + Math.sin(i * 2.4) * r * .6, 10, 0, TAU); g.fill(); } });
      g.fillStyle = '#b9a98c'; g.fillRect(TOWN.x, TOWN.y, TOWN.w, TOWN.h); g.fillStyle = '#8d7c62'; for (let i = 0; i < 6; i++) g.fillRect(TOWN.x + 12 + (i % 3) * 46, TOWN.y + 12 + (i / 3 | 0) * 50, 32, 34); GK.text(g, 'town · best loot', TOWN.x + TOWN.w / 2, TOWN.y - 6, '#5c4c33', 11, 'center', 800);
      // storm outside the current circle, and outside the next one as it closes
      if (placing) { g.fillStyle = 'rgba(110,70,160,.35)'; g.beginPath(); g.rect(MX, MY, MW, MH); g.arc(CUR.x, CUR.y, CUR.r, 0, TAU, true); g.fill('evenodd'); }
      else { const rr = CUR.r + (NR - CUR.r) * k, cx = CUR.x + (c[0] - CUR.x) * k, cy = CUR.y + (c[1] - CUR.y) * k; g.fillStyle = 'rgba(110,70,160,.35)'; g.beginPath(); g.rect(MX, MY, MW, MH); g.arc(cx, cy, rr, 0, TAU, true); g.fill('evenodd'); }
      g.strokeStyle = '#fff'; g.lineWidth = 3; g.setLineDash(placing ? [8, 6] : []); g.beginPath(); g.arc(c[0], c[1], NR, 0, TAU); g.stroke(); g.setLineDash([]);
      j.out.forEach(o => { const col = o.st === 'in' ? C.good : o.st === 'walk' ? C.navy : o.st === 'open' ? '#e67e22' : C.redDk, x = o.p.x + (o.ex - o.p.x) * (o.st === 'lost' ? Math.min(k, .5) : k), y = o.p.y + (o.ey - o.p.y) * (o.st === 'lost' ? Math.min(k, .5) : k);
        if (o.st !== 'in' && k < 1) { g.strokeStyle = col; g.globalAlpha = .55; g.lineWidth = 2; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(o.p.x, o.p.y); g.lineTo(o.ex, o.ey); g.stroke(); g.setLineDash([]); g.globalAlpha = 1; }
        g.fillStyle = col; g.beginPath(); g.arc(x, y, 6, 0, TAU); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.stroke(); if (o.st === 'lost' && k >= .5) GK.text(g, '✕', x, y - 8, C.redDk, 13, 'center', 800); });
      if (k >= 1 || placing) j.pairs.forEach(([a, b]) => { g.strokeStyle = C.red; g.lineWidth = 3; g.beginPath(); g.arc((a.ex + b.ex) / 2, (a.ey + b.ey) / 2, NEAR / 2 + 6, 0, TAU); g.stroke(); });
      g.restore();
      if (placing && live) ui.hit('map', MX, MY, MW, MH);
      if (st.ph === 'done' && live) ui.btn('again', 'Place it somewhere else', MX + MW - 220, MY + MH - 50, 206, 38, { px: 13, on: true });
      [['already inside', C.good], ['short or covered walk', C.navy], ['crosses open ground', '#e67e22'], ['cannot make it', C.redDk]].forEach(([l, col], i) => { g.fillStyle = col; g.beginPath(); g.arc(MX + 10 + i * 150, MY + MH + 20, 6, 0, TAU); g.fill(); GK.text(g, l, MX + 22 + i * 150, MY + MH + 24, C.ink, 11, 'left', 600); });
      GK.text(g, `red ring = two players who started apart and end within ${NEAR} px · a player can cover ${REACH} px before the storm`, MX, MY + MH + 46, C.muted, 11, 'left', 500);
      // readout
      const RX = 648, RW = 368, rows = [['already inside', j.in, C.good], ['short or covered walk', j.walk, C.navy], ['cross open ground', j.open, '#e67e22'], ['cannot make it', j.lost, C.redDk], ['pairs pushed together', j.pairs.length, C.red]];
      GK.text(g, placing ? 'if you put it here' : 'what this placement did', RX, 32, C.muted, 12, 'left', 700); GK.box(g, RX, 46, RW, 250, '#fffaf0', '#cdbf9f', 10, 1.5);
      rows.forEach(([l, v, col], i) => { const y = 78 + i * 36; GK.text(g, String(v), RX + 48, y + 6, col, 22, 'right', 800); GK.text(g, l, RX + 60, y + 4, C.ink, 13, 'left', 700); PLAY.bar(g, RX + 220, y - 6, 130, 10, v / 30, col); });
      GK.text(g, `of the 9 who landed in town: ${j.town} inside, ${j.townLost} lost`, RX + 14, 276, C.ink, 12, 'left', 700);
      const list = (live ? pins : st.tp).slice(-3); GK.text(g, 'your placements: inside · open ground · lost · pairs · town inside', RX, 322, C.muted, 11, 'left', 700);
      list.forEach((p, i) => { const y = 334 + i * 44; GK.box(g, RX, y, RW, 38, '#fffaf0', '#cdbf9f', 8, 1.5); [[p.j.in, C.good], [p.j.open, '#e67e22'], [p.j.lost, C.redDk], [p.j.pairs.length, C.red], [p.j.town, '#5c4c33']].forEach(([v, col], n) => { GK.text(g, String(v), RX + 40 + n * 68, y + 26, col, 18, 'center', 800); }); });
      ui.stats(`<div class="g"><b>${j.in}</b><span>already inside</span></div><div class="r"><b>${j.lost}</b><span>cannot make it</span></div><div><b>${j.pairs.length}</b><span>pairs pushed together</span></div>`);
      if (placing) { ui.out(live ? 'Move the dashed circle and click to place it. The counts update as you move, so nothing here is a surprise to you. It will be to them.' : 'Three placements: over the loot-rich town, far from it, and in the middle.'); return; }
      ui.out(`${j.in} players did nothing and were safe; ${j.open} had to cross open ground; ${j.lost} could not reach it at all; ${j.pairs.length} pair${j.pairs.length === 1 ? ' was' : 's were'} pushed onto the same spot from different places. ` + (j.town >= 6 ? `${j.town} of the 9 who landed in town never had to move: this placement paid them twice, once in loot and once in safety. ` : j.townLost >= 3 ? `${j.townLost} of the 9 who landed in town were lost: this placement turned the richest landing into a trap. ` : `The town landers split: ${j.town} inside, ${9 - j.town - j.townLost} walking, ${j.townLost} lost. `) + 'Every number here follows from where you clicked. Placing the circle is a ruling on which landing choices pay off, made after the players have already chosen.');
    },
  });
})();
