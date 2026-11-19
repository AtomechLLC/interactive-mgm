/* Weakness chain (Mega Man 2), beside the Reverse Sequencing Map (MGM C4 M3).
   The real stage select, the real damage table. Click the Robot Masters in the order you would fight them: every fight
   uses the strongest weapon you already hold, and the route list counts the hits. Then plan it backward from the boss
   you fear. DMG is damage per hit on Normal (each Robot Master has 28 health), from mmhp.net's Mega Man 2 data page. */
(function () {
  const { txt, box, pill, clamp, lerp, C, arrow, sprite } = SCN;
  const W = 1040, H = 585, IMG = new URL('img/', document.currentScript.src).href;
  const WPN = { P: ['Mega Buster', '#6fb7ff'], ME: ['Metal Blade', '#c9c2a0'], WO: ['Leaf Shield', '#55b54a'], BU: ['Bubble Lead', '#9aa7b8'], AI: ['Air Shooter', '#58a8f0'], CR: ['Crash Bomber', '#f08a3c'], HE: ['Atomic Fire', '#f05a3c'], FL: ['Time Stopper', '#c779e8'], QU: ['Quick Boomerang', '#f0c23c'] };
  const B = {
    bubble: { name: 'Bubble Man', f: 'bubbleman', gives: 'BU', dmg: { P: 2, ME: 8, CR: 4, QU: 4 } },
    air: { name: 'Air Man', f: 'airman', gives: 'AI', dmg: { P: 4, WO: 20, HE: 12, QU: 4 } },
    quick: { name: 'Quick Man', f: 'quickman', gives: 'QU', dmg: { P: 4, AI: 4, CR: 8, HE: 20, FL: 14 } },
    heat: { name: 'Heat Man', f: 'heatman', gives: 'HE', dmg: { P: 4, ME: 2, BU: 10, AI: 4, QU: 4 } },
    wood: { name: 'Wood Man', f: 'woodman', gives: 'WO', dmg: { P: 2, ME: 4, AI: 8, CR: 4, HE: 28 } },
    metal: { name: 'Metal Man', f: 'metalman', gives: 'ME', dmg: { P: 2, QU: 8, HE: 8 } },
    flash: { name: 'Flash Man', f: 'flashman', gives: 'FL', dmg: { P: 4, ME: 8, BU: 4, CR: 6, HE: 12 } },
    crash: { name: 'Crash Man', f: 'crashman', gives: 'CR', dmg: { P: 2, BU: 2, AI: 14, HE: 12, QU: 2 } },
  };
  const GRID = ['bubble', 'air', 'quick', 'heat', null, 'wood', 'metal', 'flash', 'crash'];
  const MENU = GRID.filter(Boolean), PLAN = ['metal', 'flash', 'quick', 'bubble', 'heat', 'wood', 'air', 'crash'];
  const CHAIN = [['flash', 'quick'], ['metal', 'flash'], ['metal', 'bubble'], ['bubble', 'heat'], ['heat', 'wood'], ['wood', 'air'], ['air', 'crash'], ['quick', 'metal']];   // weapon owner -> boss it beats
  // one fight with the weapons held: the strongest weapon, and how many hits it takes (Time Stopper empties in one use for 14)
  function fight(id, held) {
    const d = B[id].dmg, opts = ['P', ...held].filter(w => d[w]).sort((a, b) => d[b] - d[a]);
    if (opts[0] === 'FL') { const next = opts[1]; return { w: 'FL', w2: next, hits: 1 + Math.ceil(14 / d[next]), chunks: [14, ...Array(Math.ceil(14 / d[next])).fill(d[next])] }; }
    const w = opts[0], n = Math.ceil(28 / d[w]); return { w, hits: n, chunks: Array(n).fill(d[w]) };
  }
  function plan(route) { const held = []; return route.map(id => { const f = fight(id, held); held.push(B[id].gives); return { id, ...f }; }); }
  const TX = 20, TY = 20, TS = 132, cell = i => ({ x: TX + 14 + (i % 3) * TS, y: TY + 40 + Math.floor(i / 3) * 122 });
  const centre = id => { const c = cell(GRID.indexOf(id)); return [c.x + 48, c.y + 48]; };

  SCN.run('chain', s => {
    let route, show, hl, age, lastT;
    const add = id => { if (!route.includes(id) && route.length < 8) { route.push(id); lastT = 0; } };
    const api = {
      dur: 32,
      reset(tour) { route = []; show = tour ? false : s.querySelector('[data-chk=show]').checked; hl = []; age = 0; lastT = 9; },
      step(h) { age += h; lastT += h; },
      script: MENU.map((id, i) => [1 + i * 1.0, () => add(id)]).concat([[12, () => { route = []; hl = [['x', 'quick']]; }], [14, () => { hl = [['flash', 'quick']]; }], [16, () => { hl = [['flash', 'quick'], ['metal', 'flash']]; }], [18.5, () => { hl = []; show = true; }]], PLAN.map((id, i) => [19 + i * 1.0, () => add(id)])),
      caption: t => t < 9.4 ? 'Fight them as the menu reads and you keep arriving before you hold the weakness. Three fights are Mega Buster only: 14 hits on Bubble Man, 7 on Air Man, 7 on Quick Man.'
        : t < 12 ? '42 hits in all, and Quick Man, the hardest fight in the game, was done the long way.'
        : t < 14 ? 'Plan it backward. Start from the boss you fear: Quick Man.'
        : t < 16 ? 'What beats him? Flash Man\'s Time Stopper takes half his health in one use.'
        : t < 18.5 ? 'And what beats Flash Man? The Metal Blade. So the route starts at Metal Man.'
        : t < 27.5 ? 'Metal Man first with the buster, then every fight after it tests the tool you just earned.'
        : 'Same eight bosses: 35 hits and one buster fight, with Quick Man starting at half health. The designers built the chain; reverse sequencing is how a player (or you) reads it.',
      status() {
        if (!route.length) return 'Click the Robot Masters in the order you would fight them, or load a route. Each fight uses the strongest weapon you hold.';
        const p = plan(route), l = p[p.length - 1];
        return `${B[l.id].name}: ${WPN[l.w][0]}${l.w2 ? ', then the ' + WPN[l.w2][0] : ''}, ${l.hits} hit${l.hits > 1 ? 's' : ''}. ${l.w === 'P' ? 'Nothing you hold is stronger than the buster here.' : 'You get the ' + WPN[B[l.id].gives][0] + '.'}`;
      },
      stats() {
        const p = plan(route), hits = p.reduce((a, f) => a + f.hits, 0), bust = p.filter(f => f.w === 'P').length, q = p.find(f => f.id === 'quick');
        return `<div><b>${hits}</b><span>hits to clear ${route.length} of 8 bosses</span></div><div class="r"><b>${bust}</b><span>fights with only the Mega Buster</span></div><div class="y"><b>${q ? q.hits : '-'}</b><span>hits on Quick Man</span></div>`;
      },
      acts: { menu() { route = MENU.slice(); lastT = 9; }, plan() { route = PLAN.slice(); lastT = 9; }, clear() { route = []; } },
      set(k, v) { if (k === 'show') show = v; },
      point(p) { if (p.type !== 'down') return; GRID.forEach((id, i) => { if (!id) return; const c = cell(i); if (p.x > c.x - 6 && p.x < c.x + 102 && p.y > c.y - 6 && p.y < c.y + 112) { if (route.includes(id)) route = route.slice(0, route.indexOf(id)); else add(id); } }); },
      draw(g) {
        SCN.paper(g, W, H); g.save(); g.imageSmoothingEnabled = false;
        // stage select
        box(g, TX, TY, 412, 412, { r: 8, fill: '#0058f8' });
        g.save(); g.beginPath(); g.rect(TX, TY, 412, 412); g.clip();
        for (let r = 0; r < 3; r++) { const y = TY + 60 + r * 122; g.fillStyle = '#00e8d8'; g.fillRect(TX, y + 14, 412, 6); g.fillRect(TX, y + 68, 412, 6); g.fillStyle = '#3cbcfc'; g.fillRect(TX, y + 24, 412, 40); }
        g.restore();
        
        const p = plan(route);
        GRID.forEach((id, i) => {
          const c = cell(i);
          if (!id) { box(g, c.x, c.y, 96, 96, { r: 0, fill: '#000', stroke: '#fff', lw: 3 }); sprite(g, SCN.img(IMG + 'megaman.png'), c.x + 48, c.y + 88, 78, { pix: true }); return; }
          const n = route.indexOf(id), im = SCN.img(IMG + 'p-' + B[id].f + '.png');
          if (im) g.drawImage(im, c.x, c.y, 96, 96);
          if (n >= 0) { g.fillStyle = 'rgba(0,10,60,.38)'; g.fillRect(c.x, c.y, 96, 96); SCN.dot(g, c.x + 10, c.y + 10, 17, '#000'); SCN.dot(g, c.x + 10, c.y + 10, 14, C.gold); txt(g, n + 1, c.x + 10, c.y + 11, { size: 18, w: 800, align: 'center', display: true }); }
          if (hl.some(a => a[1] === id || a[0] === id)) { g.strokeStyle = C.gold; g.lineWidth = 6; g.strokeRect(c.x - 5, c.y - 5, 106, 106); }
          txt(g, B[id].name.toUpperCase(), c.x + 48, c.y + 107, { size: 12, w: 800, col: '#fff', align: 'center', display: true });
        });
        g.imageSmoothingEnabled = true;
        const lastF = p[p.length - 1], src = lastF && lastF.w !== 'P' ? Object.keys(B).find(k => B[k].gives === lastF.w) : null;
        const arrows = hl.length ? hl.filter(a => a[0] !== 'x') : !show ? [] : !route.length ? CHAIN : src ? [[src, lastF.id]] : [];
        arrows.forEach(([a, b]) => { const [x1, y1] = centre(a), [x2, y2] = centre(b), dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), col = WPN[B[a].gives][1];
          arrow(g, x1 + dx / L * 40, y1 + dy / L * 40, x2 - dx / L * 44, y2 - dy / L * 44, { col: '#000', lw: 9, head: 20, bend: L < 140 ? 0 : 26 }); arrow(g, x1 + dx / L * 40, y1 + dy / L * 40, x2 - dx / L * 44, y2 - dy / L * 44, { col, lw: 5, head: 16, bend: L < 140 ? 0 : 26 }); });
        const top = hl.length > 1 || (hl.length && hl[0][0] !== 'x') ? `${WPN[B[hl[hl.length - 1][0]].gives][0]} beats ${B[hl[hl.length - 1][1]].name}` : hl.length ? 'the boss you fear' : arrows.length === 1 ? `${WPN[B[arrows[0][0]].gives][0]} beats ${B[arrows[0][1]].name}` : arrows.length ? 'arrow: this boss\'s weapon beats that boss' : 'STAGE SELECT';
        txt(g, top, TX + 206, TY + 21, { size: 16, w: 800, col: '#fff', align: 'center', display: true });
        // the latest fight, acted out
        const fy = 452; box(g, TX, fy, 412, 118, { r: 8, fill: '#101830' });
        g.fillStyle = '#3a4a7a'; g.fillRect(TX, fy + 96, 412, 22);
        const cur = p[p.length - 1];
        sprite(g, SCN.img(IMG + 'megaman.png'), TX + 70, fy + 96, 66, { pix: true });
        if (cur) {
          const per = Math.max(.12, Math.min(.3, 2.2 / cur.hits)), k = lastT / per, done = Math.min(cur.hits, Math.floor(k)), left = 28 - cur.chunks.slice(0, done).reduce((a, b) => a + b, 0);
          sprite(g, SCN.img(IMG + 's-' + B[cur.id].f + '.png'), TX + 340, fy + 96, 78, { pix: true, alpha: left <= 0 ? .35 : 1 });
          if (done < cur.hits) { const fx = lerp(TX + 100, TX + 310, k % 1), wc = WPN[done === 0 || !cur.w2 ? cur.w : cur.w2][1]; SCN.dot(g, fx, fy + 62, 9, wc); SCN.dot(g, fx - 14, fy + 62, 5, wc); }
          for (let i = 0; i < 28; i++) { g.fillStyle = i < Math.max(0, left) ? '#f8d878' : '#2a2440'; g.fillRect(TX + 388, fy + 88 - i * 2.9, 14, 2); }
          txt(g, `${WPN[cur.w][0]}${cur.w2 ? ' + ' + WPN[cur.w2][0] : ''}`, TX + 14, fy + 16, { size: 14, w: 800, col: WPN[cur.w][1] }); txt(g, `vs ${B[cur.id].name}`, TX + 398, fy + 16, { size: 14, w: 700, col: '#fff', align: 'right' });
        } else txt(g, 'pick a first boss', TX + 206, fy + 40, { size: 15, w: 600, col: '#8fa2d8', align: 'center' });
        // the route
        const RX = 452, RW = W - RX - 16;
        txt(g, 'Your route', RX, 34, { size: 24, w: 800, display: true }); txt(g, 'each bar is the boss\'s 28 health, one block per hit', W - 16, 38, { size: 13, w: 600, col: C.muted, align: 'right' });
        for (let i = 0; i < 8; i++) {
          const y = 58 + i * 56, f = p[i];
          box(g, RX, y, RW, 50, { r: 9, fill: f ? (f.w === 'P' ? '#fbe2df' : '#e7f3e4') : 'rgba(239,230,210,.6)', stroke: f ? (f.w === 'P' ? '#e07b72' : '#5fb47c') : null });
          txt(g, i + 1, RX + 18, y + 26, { size: 20, w: 800, col: C.muted, align: 'center', display: true });
          if (!f) continue;
          g.imageSmoothingEnabled = false; sprite(g, SCN.img(IMG + 's-' + B[f.id].f + '.png'), RX + 58, y + 46, 42, { pix: true }); g.imageSmoothingEnabled = true;
          txt(g, B[f.id].name, RX + 90, y + 16, { size: 16, w: 800 });
          txt(g, f.w === 'P' ? 'Mega Buster only' : WPN[f.w][0] + (f.w2 ? ' + ' + WPN[f.w2][0].replace('Mega ', '') : ''), RX + 90, y + 36, { size: 14, w: 700, col: f.w === 'P' ? '#a1261e' : '#145c33' });
          let bx = RX + 262; const bw = 224 / 28;
          f.chunks.forEach((ch, j) => { const w2 = Math.min(ch, 28 - (bx - RX - 262) / bw) * bw; if (w2 <= 0) return; box(g, bx + 1, y + 14, w2 - 2, 22, { r: 3, fill: WPN[j === 0 || !f.w2 ? f.w : f.w2][1], stroke: C.navy, lw: 1.5 }); bx += w2; });
          txt(g, f.hits, W - 64, y + 26, { size: 24, w: 800, align: 'right', display: true }); txt(g, f.hits > 1 ? 'hits' : 'hit', W - 58, y + 28, { size: 13, w: 600, col: C.muted });
        }
        const hits = p.reduce((a, f) => a + f.hits, 0), bust = p.filter(f => f.w === 'P').length;
        txt(g, route.length ? `${hits} hits · ${bust} buster-only fight${bust === 1 ? '' : 's'}` : 'no route yet', RX, 548, { size: 24, w: 800, display: true, col: route.length === 8 ? C.ink : C.muted });
        g.restore();
      },
    };
    return api;
  });
})();
