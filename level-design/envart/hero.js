/* One hero per place (The Level Design Book: Environment art, "Hero props / landmarks")
   The book: a hero prop grounds an important place, a landmark gives a multiplayer area its callout (the short nickname
   players shout to each other), and its Valorant example is used once on the whole map. It also says where not to spend
   the effort: "don't guitar solo a dumpster".
   Three areas built from one modular kit. Click an area to change its hero. The callouts are what a team could say. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit, E = EA, W = E.W, H = E.H, GY = 418, PW = 336, GAP = 16;
  const HERO = ['none', 'tower', 'fountain', 'statue', 'bin'], NAME = { tower: 'Clock', fountain: 'Fountain', statue: 'Statue', bin: 'Bin' };
  const TEAL = [176, 52, 40];
  function tower(g, x) {
    const w = 78, top = 66;
    g.fillStyle = E.hsl(34, 14, 60); g.fillRect(x - w / 2, top, w, GY - top); g.fillStyle = 'rgba(30,26,60,.14)'; g.fillRect(x + w / 6, top, w / 3, GY - top);
    g.fillStyle = E.hsl(34, 14, 50); for (let y = top + 96; y < GY - 150; y += 60) g.fillRect(x - w / 2, y, w, 5);
    g.fillStyle = E.hsl(34, 14, 70); g.fillRect(x - w / 2 - 6, top - 6, w + 12, 10);
    g.fillStyle = E.hsl(...TEAL); g.beginPath(); g.moveTo(x - w / 2 - 8, top - 6); g.lineTo(x, top - 58); g.lineTo(x + w / 2 + 8, top - 6); g.fill();
    g.fillStyle = E.hsl(TEAL[0], TEAL[1], TEAL[2] - 12); g.beginPath(); g.moveTo(x, top - 58); g.lineTo(x + w / 2 + 8, top - 6); g.lineTo(x + 8, top - 6); g.fill();
    g.fillStyle = E.hsl(44, 60, 92); g.strokeStyle = E.hsl(...TEAL); g.lineWidth = 5; g.beginPath(); g.arc(x, top + 44, 25, 0, 7); g.fill(); g.stroke();
    g.strokeStyle = E.INK; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, top + 44); g.lineTo(x, top + 27); g.moveTo(x, top + 44); g.lineTo(x + 11, top + 50); g.stroke();
  }
  function fountain(g, x, gy) {
    E.shadow(g, x, gy + 4, 92, 16, .2);
    g.fillStyle = E.hsl(34, 14, 58); g.beginPath(); g.ellipse(x, gy - 8, 84, 20, 0, 0, 7); g.fill(); g.fillRect(x - 84, gy - 26, 168, 18);
    g.fillStyle = E.hsl(34, 14, 72); g.beginPath(); g.ellipse(x, gy - 26, 84, 20, 0, 0, 7); g.fill();
    g.fillStyle = E.hsl(TEAL[0], 56, 62); g.beginPath(); g.ellipse(x, gy - 26, 72, 15, 0, 0, 7); g.fill();
    g.fillStyle = E.hsl(34, 14, 62); g.fillRect(x - 9, gy - 96, 18, 72); g.fillStyle = E.hsl(34, 14, 74); g.beginPath(); g.ellipse(x, gy - 96, 34, 9, 0, 0, 7); g.fill();
    g.strokeStyle = E.hsl(TEAL[0], 60, 76, .9); g.lineWidth = 4; g.lineCap = 'round';
    for (const d of [-1, 1]) for (const k of [1, .55]) { g.beginPath(); g.moveTo(x, gy - 108); g.quadraticCurveTo(x + d * 30 * k, gy - 140 * (k * .3 + .7), x + d * 56 * k, gy - 30); g.stroke(); }
    g.fillStyle = E.hsl(...TEAL); g.beginPath(); g.arc(x, gy - 110, 8, 0, 7); g.fill();
  }
  function statue(g, x, gy, face) {
    E.shadow(g, x + 4, gy + 3, 44, 9);
    g.fillStyle = E.hsl(34, 12, 60); g.fillRect(x - 30, gy - 62, 60, 62); g.fillStyle = E.hsl(34, 12, 72); g.fillRect(x - 36, gy - 68, 72, 10); g.fillRect(x - 36, gy - 8, 72, 8); g.fillStyle = 'rgba(30,26,60,.14)'; g.fillRect(x + 8, gy - 58, 22, 50);
    E.figure(g, x, gy - 68, { face, s: 1.16, col: TEAL, line: E.hsl(TEAL[0], 50, 20), gun: false, shadow: false });
  }
  canvasDemo('hero', (s, cv, g) => {
    const st = { h: [0, 0, 0] }; const sc = E.canvas(W, H), x = sc.getContext('2d'); let calls = [];
    function panel(i) {
      const x0 = i * (PW + GAP), h = HERO[st.h[i]], mid = x0 + PW / 2;
      x.save(); x.beginPath(); x.roundRect(x0, 0, PW, H, 14); x.clip();
      E.sky(x, W, GY, 3, { seed: 20 + i * 9 });
      if (h === 'tower') tower(x, mid);
      // the same two kit buildings in every area, with a gap between them where a hero can stand
      const kit = { hue: 38, s: 30, l: 78, bays: 1, dw: 3, shut: [200, 14, 46] };
      E.building(x, { ...kit, x: x0 - 30, w: 122, h: 250, seed: 3 + i, door: i === 1 ? null : { bay: 0, kind: 'shut', col: [26, 34, 36] } }, GY);
      E.building(x, { ...kit, x: x0 + PW - 92, w: 122, h: 290, seed: 7 + i, roof: 'tile' }, GY);
      if (h !== 'tower') { x.fillStyle = E.hsl(38, 26, 70); x.fillRect(x0 + 92, GY - 96, PW - 184, 96); x.fillStyle = E.hsl(38, 26, 80); x.fillRect(x0 + 92, GY - 102, PW - 184, 8); }   // low kit wall
      else { x.fillStyle = E.hsl(38, 26, 70); x.fillRect(x0 + 92, GY - 96, PW / 2 - 92 - 39, 96); x.fillRect(mid + 39, GY - 96, PW / 2 - 92 - 39, 96); x.fillStyle = E.hsl(38, 26, 80); x.fillRect(x0 + 92, GY - 102, PW / 2 - 92 - 39, 8); x.fillRect(mid + 39, GY - 102, PW / 2 - 92 - 39, 8); x.fillStyle = '#1d2147'; x.beginPath(); x.moveTo(mid - 20, GY); x.lineTo(mid - 20, GY - 54); x.arc(mid, GY - 54, 20, Math.PI, 0); x.lineTo(mid + 20, GY); x.fill(); }
      E.ground(x, W, H, GY, 3, { l: 57 });
      E.crate(x, x0 + 52, GY + 46, .9, 3); E.barrel(x, x0 + PW - 44, GY + 30, .9, 3);
      if (h === 'fountain') fountain(x, mid, GY + 60);
      if (h === 'statue') statue(x, mid, GY + 54, 1);
      if (h === 'bin') E.dumpster(x, mid, GY + 60, 1.2, 3, { ornate: 1 });
      if (h === 'none') E.dumpster(x, mid + 10, GY + 40, .9, 3);
      x.restore();
    }
    function scene() {
      x.clearRect(0, 0, W, H); [0, 1, 2].forEach(panel);
      const hs = st.h.map(v => HERO[v]), cnt = k => hs.filter(v => v === k).length;
      calls = hs.map((h, i) => h === 'none' ? { t: '“The… beige street?”', k: 'r' } : cnt(h) > 1 ? { t: `“${NAME[h]}!” “Which ${NAME[h].toLowerCase()}?”`, k: 'r' } : h === 'bin' ? { t: '“Fancy bin”', k: 'y' } : { t: `“${NAME[h]}”`, k: 'g' });
      const uniq = calls.filter(c => c.k !== 'r').length, kinds = new Set(hs.filter(h => h !== 'none' && h !== 'bin')).size, rep = Math.max(0, ...['tower', 'fountain', 'statue', 'bin'].map(cnt)), bin = cnt('bin');
      say($(s, '.hr-stats'),
        `<div class="${uniq === 3 ? 'g' : uniq ? 'y' : 'r'}"><b>${uniq} of 3</b><span>areas a teammate can name without confusion</span></div>` +
        `<div><b>${kinds + bin}</b><span>hero ${kinds + bin === 1 ? 'asset' : 'assets'} for the art team to build</span></div>` +
        `<div class="${rep > 1 ? 'r' : 'g'}"><b>${rep || '–'}${rep ? '×' : ''}</b><span>most times one hero is used on the map</span></div>`);
      say($(s, '.hr-out'), hs.every(h => h === 'none') ? '<b class="accent">Three areas, one kit, no names.</b> A modular kit is quick to build with, and every street it makes looks like the last. Click an area to give it a hero.'
        : rep > 1 ? '<b class="accent">A landmark used twice is a texture.</b> The same hero in two areas tells a player nothing about which one they are in. The Valorant tower the book shows appears once on the whole map.'
        : bin ? '<b class="accent">Don’t guitar solo a dumpster.</b> That is the book’s line. The bin now has gold trim and a week of someone’s time, and it sits in a back street. Spend hero effort where the level needs a centre.'
        : uniq < 3 ? '<b class="accent">Getting there.</b> The dressed areas have callouts; the bare one is still “that other street”.'
        : '<b class="accent">One hero each, used once.</b> Every area has a name a teammate can shout. Each hero also breaks the kit’s palette with the same teal, so it reads as important from across the map.');
    }
    cv.style.cursor = 'pointer';
    cv.onpointerdown = e => { const p = FPF.ptr(cv, e), i = Math.floor(p.x / (PW + GAP)); if (i >= 0 && i < 3 && p.x - i * (PW + GAP) < PW) { st.h[i] = (st.h[i] + 1) % HERO.length; scene(); } };
    $$(s, '.hr-pre .btn').forEach(b => b.onclick = () => { st.h = b.dataset.v.split('').map(Number); scene(); });
    scene();
    window.__heroSet = a => { st.h = a.slice(); scene(); };
    return () => {
      g.clearRect(0, 0, W, H); g.drawImage(sc, 0, 0);
      calls.forEach((c, i) => {
        const mid = i * (PW + GAP) + PW / 2;
        // the teammate in each area looks right, toward where the callout points
        E.figure(g, i * (PW + GAP) + 78, GY + 122, { pose: 'stand', face: 1, col: [205, 72, 50], s: 1.1 });
        E.label(g, c.t, mid, H - 24, { size: 15, col: c.k === 'g' ? '#14663a' : c.k === 'y' ? '#7a4a00' : '#a8201c', line: c.k === 'g' ? '#2fae63' : c.k === 'y' ? '#e0a92d' : '#e5322d' });
        E.label(g, 'Area ' + 'ABC'[i], i * (PW + GAP) + 46, 24, { size: 13 });
      });
    };
  });
})();
