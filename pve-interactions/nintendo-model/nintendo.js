/* The Nintendo model (MGM course 4, module 5, deck slide 40): introduce, escalate, permutate, both. Three spikes:
   a four-beat ladder from the speaker notes (Goomba, Koopa, Red Koopa, Spiny), a sort of the slide's enemies into the
   four steps, and a lineage tree where every branch is one changed rule. Ladder and tree are pure functions of time so
   window.__seek can record them. Sprites come from ../shared/mario.js. */
(function () {
  const { $, $$, canvasDemo, demo, say } = FPF.kit;
  const M = MARIO, spr = M.spr;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const arc = (u, h) => 4 * h * u * (1 - u);
  const k01 = (u, a, b) => clamp((u - a) / (b - a), 0, 1);
  const P = 4, INK = '#262c6a';

  function txt(g, s, x, y, o = {}) {
    g.font = `${o.w || 600} ${o.size || 18}px ${o.f || 'Jost'}, sans-serif`; g.textAlign = o.align || 'center'; g.textBaseline = 'middle';
    g.fillStyle = o.col || INK; g.fillText(s, x, y);
  }
  function pop(g, s, x, y, col, a) {
    if (a <= 0) return;
    g.save(); g.globalAlpha = clamp(a, 0, 1); g.font = '800 20px Montserrat, Jost, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 6; g.strokeStyle = '#fffaf0'; g.strokeText(s, x, y); g.fillStyle = col; g.fillText(s, x, y); g.restore();
  }
  const hero = (g, x, foot, pose, t, o = {}) => spr(g, pose === 'jump' ? M.HERO_JUMP : pose === 'throw' ? M.HERO_THROW : pose === 'walk' && (t * 8 | 0) % 2 ? M.HERO_STEP : M.HERO, x, foot, P, o);
  const walkF = (a, b, t) => (t * 5 | 0) % 2 ? b : a;
  function ground(g, w, GY) {
    g.fillStyle = INK; g.fillRect(0, GY, w, 40); g.fillStyle = '#3a4290';
    for (let x = 0; x < w; x += 32) g.fillRect(x, GY, 2, 40);
    g.fillStyle = '#ffb951'; g.fillRect(0, GY, w, 4);
  }
  function pipe(g, x, GY, h = 60) {
    g.fillStyle = '#3fa34d'; g.strokeStyle = '#152044'; g.lineWidth = 3;
    g.fillRect(x - 26, GY - h, 52, h); g.strokeRect(x - 26, GY - h, 52, h); g.fillRect(x - 32, GY - h - 20, 64, 22); g.strokeRect(x - 32, GY - h - 20, 64, 22);
  }

  /* ---------- the ladder: four beats, each a little scene of u in [0, L) ---------- */
  const L = 4.8, PW = 330, GY = 250;
  const BEATS = [
    { step: 'Introduce', name: 'Goomba', resp: 'Jump on it. The lesson is the stomp.', scene: goombaScene },
    { step: 'Escalate', name: 'Koopa Troopa', resp: 'Stomp it, kick the shell, then dodge it when it bounces back.', scene: koopaScene },
    { step: 'Permutate', name: 'Red Koopa Troopa', resp: 'It turns at ledges, so you time the jump to its patrol.', scene: redScene },
    { step: 'Both', name: 'Spiny', resp: 'Stomping hurts and more keep falling: switch to fire and keep moving.', scene: spinyScene },
  ];
  function goombaScene(g, u) {
    ground(g, PW, GY);
    const gx = 280 - 40 * Math.min(u, 1.6);
    if (u < 1.6) spr(g, walkF(M.GOOMBA, M.GOOMBA_STEP, u), gx, GY, P);
    else if (u < 2.3) spr(g, M.GOOMBA, gx, GY, P, { sy: .4, a: 1 - k01(u, 1.9, 2.3) });
    let hx, hy = 0, pose = 'walk';
    if (u < 1.0) hx = lerp(40, 110, u);
    else if (u < 1.6) { const k = k01(u, 1, 1.6); hx = lerp(110, gx, k); hy = lerp(0, 34, k) + arc(k, 90); pose = 'jump'; }
    else if (u < 2.1) { const k = k01(u, 1.6, 2.1); hx = lerp(gx, gx + 40, k); hy = lerp(34, 0, k) + arc(k, 40); pose = 'jump'; }
    else { hx = lerp(gx + 40, 330, k01(u, 2.4, 4.4)); }
    hero(g, hx, GY - hy, pose, u);
    pop(g, 'Stomp!', gx, GY - 110 - (u - 1.6) * 30, '#1a8a4c', u > 1.6 ? 1 - (u - 1.6) / 1.2 : 0);
  }
  function koopaScene(g, u) {
    ground(g, PW, GY); pipe(g, 300, GY);
    const kx = 210 - 20 * Math.min(u, 1.3);
    let sx = kx, shell = u >= 1.3;
    if (u >= 1.95) sx = u < 2.25 ? lerp(kx + 10, 270, k01(u, 1.95, 2.25)) : lerp(270, -40, k01(u, 2.25, 3.25));
    if (!shell) spr(g, walkF(M.KOOPA, M.KOOPA_STEP, u), kx, GY, P);
    else if (sx > -30) spr(g, M.SHELL_G, sx, GY, P);
    let hx, hy = 0, pose = 'walk';
    if (u < .8) hx = lerp(40, 100, u / .8);
    else if (u < 1.3) { const k = k01(u, .8, 1.3); hx = lerp(100, kx, k); hy = lerp(0, 40, k) + arc(k, 80); pose = 'jump'; }
    else if (u < 1.7) { const k = k01(u, 1.3, 1.7); hx = lerp(kx, kx - 45, k); hy = lerp(40, 0, k) + arc(k, 40); pose = 'jump'; }
    else if (u < 1.95) { hx = lerp(kx - 45, kx - 22, k01(u, 1.7, 1.95)); }
    else if (u < 2.55) hx = kx - 22, pose = 'idle';
    else if (u < 3.05) { const k = k01(u, 2.55, 3.05); hx = kx - 22; hy = arc(k, 90); pose = 'jump'; }
    else hx = lerp(kx - 22, 250, k01(u, 3.3, 4.6));
    hero(g, hx, GY - hy, pose, u);
    pop(g, 'Shell!', kx, GY - 100, '#1a8a4c', u > 1.3 && u < 1.9 ? 1 : 0);
    pop(g, 'Kick!', kx + 20, GY - 90, '#b36b05', u > 1.95 && u < 2.3 ? 1 : 0);
    pop(g, 'It bounces back!', 165, GY - 130, '#cf2f3b', u > 2.25 && u < 3.1 ? 1 : 0);
  }
  function redScene(g, u) {
    ground(g, PW, GY);
    const PY = GY - 80, x0 = 150, x1 = 300;
    g.fillStyle = '#a4552a'; g.fillRect(x0 - 20, PY, x1 - x0 + 40, 16); g.strokeStyle = '#152044'; g.lineWidth = 3; g.strokeRect(x0 - 20, PY, x1 - x0 + 40, 16);
    // it walks left to the edge, turns, walks back
    const kx = u < 2.4 ? lerp(280, 158, u / 2.4) : lerp(158, 280, k01(u, 2.4, 4.8));
    const stomped = u >= 2.4 && u < 4.5;
    if (!stomped) spr(g, walkF(M.RKOOPA, M.RKOOPA_STEP, u), kx, PY, P, { flipX: u >= 2.4 });
    else spr(g, M.SHELL_R, 158, PY, P, { a: 1 - k01(u, 4.0, 4.5) });
    g.setLineDash([5, 5]); g.strokeStyle = '#cf2f3b'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0 - 20, PY - 60); g.lineTo(x0 - 20, PY); g.stroke(); g.setLineDash([]);
    if (u > 1.8 && u < 2.6) pop(g, 'It turns here', x0 - 20, PY - 74, '#cf2f3b', 1);
    let hx, hy = 0, pose = 'walk';
    if (u < 1.4) hx = lerp(30, 80, u / 1.4);
    else if (u < 1.8) hx = 80, pose = 'idle';
    else if (u < 2.4) { const k = k01(u, 1.8, 2.4); hx = lerp(80, 158, k); hy = lerp(0, 80 + 38, k) + arc(k, 70); pose = 'jump'; }
    else if (u < 2.9) { const k = k01(u, 2.4, 2.9); hx = lerp(158, 200, k); hy = lerp(118, 80, k) + arc(k, 40); pose = 'jump'; }
    else hx = lerp(200, 290, k01(u, 3.1, 4.3)), hy = 80;
    hero(g, hx, GY - hy, pose, u);
    pop(g, 'Timed!', 158, PY - 110, '#1a8a4c', u > 2.4 && u < 3.3 ? 1 : 0);
  }
  function spinyScene(g, u) {
    ground(g, PW, GY);
    const lx = 210 + 30 * Math.sin(u * 1.6);
    spr(g, M.LAKITU, lx, 112, P);
    // egg falls, becomes a Spiny that walks at you; a second one is on its way
    const drop = (t0, x) => {
      if (u < t0) return null;
      if (u < t0 + .6) { const k = (u - t0) / .6; return { x, y: lerp(GY - 150, GY, k * k), egg: true }; }
      return { x: x - 35 * (u - t0 - .6), y: GY };
    };
    const a = drop(.2, 220), b = drop(2.9, 240), burnt = 2.1;
    if (a) { if (u < burnt) spr(g, a.egg ? M.SPINY : walkF(M.SPINY, M.SPINY_STEP, u), a.x, a.y, P, a.egg ? { sy: .7 } : {}); else if (u < burnt + .8) { const k = u - burnt; spr(g, M.SPINY, a.x + 30 * k, a.y - 120 * k + 300 * k * k, P, { flipY: true }); } }
    if (b) spr(g, b.egg ? M.SPINY : walkF(M.SPINY, M.SPINY_STEP, u), b.x, b.y, P, b.egg ? { sy: .7 } : {});
    let hx = lerp(30, 90, k01(u, 0, 1.2)), hy = 0, pose = u < 1.2 ? 'walk' : 'idle';
    if (u > 1.45 && u < 1.75) pose = 'throw';
    if (u > 1.5 && u < burnt) { const k = k01(u, 1.5, burnt); spr(g, M.FIRE, lerp(110, a.x - 10, k), GY - 10 - Math.abs(Math.sin(k * 9)) * 26, P, { rot: u * 18 }); }
    if (u > 3.6) { const k = k01(u, 3.6, 4.4); hx = lerp(90, 300, k); hy = arc(clamp((u - 3.9) / .55, 0, 1), 80); pose = hy > 1 ? 'jump' : 'walk'; }
    hero(g, hx, GY - hy, pose, u);
    pop(g, 'Don’t stomp it', 200, GY - 120, '#cf2f3b', u > .9 && u < 1.5 ? 1 : 0);
    pop(g, 'Burned!', a ? a.x : 0, GY - 70, '#d0561a', u > burnt && u < burnt + .9 ? 1 : 0);
    pop(g, 'More keep coming', 200, GY - 130, '#b36b05', u > 3.0 && u < 3.8 ? 1 : 0);
  }
  let ladderApi = null;
  canvasDemo('ladder', (s, c, g) => {
    const W = c.width, H = c.height, gap = (W - 4 * PW) / 3, st = { t: 0, only: -1, held: false };
    c.onclick = e => { const { x } = FPF.ptr(c, e), i = Math.floor(x / (PW + gap)); st.only = st.only === i ? -1 : i; st.t = 0; };
    function render(t) {
      g.clearRect(0, 0, W, H);
      const cur = st.only >= 0 ? st.only : Math.floor((t % (4 * L)) / L), u = st.only >= 0 ? t % L : (t % (4 * L)) - cur * L;
      BEATS.forEach((b, i) => {
        const x = i * (PW + gap), on = i === cur;
        g.save(); g.translate(x, 0);
        g.fillStyle = on ? '#152044' : 'rgba(21,32,68,.12)'; g.beginPath(); g.roundRect(0, 0, PW, 44, 10); g.fill();
        txt(g, `${i + 1}. ${b.step}`, PW / 2, 23, { w: 800, f: 'Montserrat', size: 22, col: on ? '#ffb951' : '#5d618c' });
        g.save(); g.beginPath(); g.rect(0, 50, PW, 250); g.clip(); g.translate(0, 0); g.globalAlpha = on ? 1 : .35;
        b.scene(g, on ? u : 0); g.restore();
        txt(g, b.name, PW / 2, 320, { w: 800, f: 'Montserrat', size: 20, col: on ? INK : '#8a8fae' });
        // the new response, wrapped
        g.font = '500 17px Jost, sans-serif'; const words = b.resp.split(' '); let line = '', y = 348;
        words.forEach(w => { if (g.measureText(line + w).width > PW - 20) { txt(g, line.trim(), PW / 2, y, { w: 500, size: 17, col: on ? INK : '#8a8fae' }); line = ''; y += 22; } line += w + ' '; });
        txt(g, line.trim(), PW / 2, y, { w: 500, size: 17, col: on ? INK : '#8a8fae' });
        if (i < 3) { g.fillStyle = '#b9a578'; g.beginPath(); g.moveTo(PW + gap / 2 - 6, 150); g.lineTo(PW + gap / 2 + 6, 160); g.lineTo(PW + gap / 2 - 6, 170); g.fill(); }
        g.restore();
      });
    }
    ladderApi = { seek(t) { st.held = true; st.only = -1; st.t = t; render(t); }, dur: () => 4 * L };
    return dt => { if (!st.held) st.t += Math.max(0, dt); render(st.t); };
  });

  /* ---------- the sort: drop the slide's enemies into the four steps ---------- */
  const STEPS = ['Introduce', 'Escalate', 'Permutate', 'Both'];
  const ITEMS = [
    ['goomba', 'Goomba', M.GOOMBA, 0, 'The first enemy. The lesson is simply “jump on it”.'],
    ['koopa', 'Koopa Troopa', M.KOOPA, 1, 'The same stomp, with higher stakes: the shell it leaves can come back at you.'],
    ['para', 'Koopa Paratroopa', M.RKOOPA, 1, 'A Koopa with wings. The stomp still works; it is just harder to land.'],
    ['red', 'Red Koopa Troopa', M.RKOOPA, 2, 'Same Koopa, one new rule: it turns at ledges, so your timing changes.'],
    ['buzzy', 'Buzzy Beetle', M.BUZZY, 2, 'A Koopa that ignores fireballs: the answer that beat the Spiny stops working.'],
    ['piranha', 'Piranha Plant', M.PIRANHA, 2, 'A new movement rule: it rises out of pipes, so you jump on its rhythm.'],
    ['spiny', 'Spiny', M.SPINY, 3, 'Changes what works (don’t jump) and is thrown at you to keep the pressure on.'],
    ['bowser', 'Bowser', M.BOWSER, 3, 'The final exam: fire to dodge and a bridge to cross, everything you learned at once.'],
  ];
  demo('sort', {
    init(s) {
      const tray = $(s, '.so-tray'), cols = $(s, '.so-cols'), out = $(s, '.so-out');
      let sel = null;
      cols.innerHTML = STEPS.map((n, i) => `<div class="so-col" data-i="${i}"><h4>${n}</h4><div class="so-drop"></div></div>`).join('');
      const chip = ([id, name, rows]) => `<div class="so-chip" draggable="true" data-id="${id}"><canvas width="64" height="56"></canvas><span>${name}</span></div>`;
      function reset() {
        tray.innerHTML = ITEMS.map(chip).join(''); $$(cols, '.so-drop').forEach(d => d.innerHTML = '');
        $$(s, '.so-chip').forEach(el => {
          const it = ITEMS.find(x => x[0] === el.dataset.id), cg = $(el, 'canvas').getContext('2d');
          spr(cg, it[2], 32, 52, it[0] === 'bowser' ? 3 : 3.6);
          if (it[0] === 'para') spr(cg, M.WING, 40, 30, 3);
          el.ondragstart = e => { e.dataTransfer.setData('text', el.dataset.id); };
          el.onclick = e => { e.stopPropagation(); sel = sel === el ? null : el; $$(s, '.so-chip').forEach(x => x.classList.toggle('sel', x === sel)); };
        });
        say(out, 'Drag each enemy (or click it, then click a column) into the step of the Nintendo model it represents. Then press <b>Check</b>.');
      }
      const place = (el, drop) => { drop.appendChild(el); el.classList.remove('sel', 'ok', 'no'); el.title = ''; sel = null; };
      $$(cols, '.so-col').forEach(col => {
        const drop = $(col, '.so-drop');
        col.ondragover = e => e.preventDefault();
        col.ondrop = e => { e.preventDefault(); const el = $(s, `.so-chip[data-id="${e.dataTransfer.getData('text')}"]`); if (el) place(el, drop); };
        col.onclick = () => { if (sel) place(sel, drop); };
      });
      $(s, '.so-check').onclick = () => {
        let right = 0, placed = 0; const notes = [];
        $$(cols, '.so-chip').forEach(el => {
          const it = ITEMS.find(x => x[0] === el.dataset.id), i = +el.closest('.so-col').dataset.i; placed++;
          const ok = it[3] === i; right += ok; el.classList.toggle('ok', ok); el.classList.toggle('no', !ok);
          if (!ok) notes.push(`<b>${it[1]}</b> reads as <b>${STEPS[it[3]]}</b>: ${it[4]}`);
        });
        say(out, placed ? `<b>${right} of ${placed}</b> match the course’s reading${placed < ITEMS.length ? ` (${ITEMS.length - placed} still in the tray)` : ''}. ${notes.slice(0, 2).join(' ')}` : 'Place some enemies first.');
      };
      $(s, '.so-reveal').onclick = () => {
        ITEMS.forEach(it => { const el = $(s, `.so-chip[data-id="${it[0]}"]`); $$(cols, '.so-drop')[it[3]].appendChild(el); el.classList.add('ok'); el.classList.remove('no', 'sel'); el.title = it[4]; });
        say(out, 'The course’s reading. Hover a chip for why. The order is the point: one lesson, then the same lesson with higher stakes, then a changed rule, then both at once.');
      };
      $(s, '.so-reset').onclick = reset;
      reset();
    },
  });

  /* ---------- the lineage: every branch is one changed rule ---------- */
  const NODES = [
    { id: 'goomba', name: 'Goomba', f: [M.GOOMBA, M.GOOMBA_STEP], x: 150, y: 300 },
    { id: 'koopa', name: 'Koopa Troopa', f: [M.KOOPA, M.KOOPA_STEP], x: 500, y: 300, from: 'goomba', rule: 'stomp leaves a shell' },
    { id: 'lakitu', name: 'Lakitu', f: [M.LAKITU, M.LAKITU_B], x: 500, y: 500, from: 'goomba', rule: 'flies instead of walking' },
    { id: 'red', name: 'Red Koopa Troopa', f: [M.RKOOPA, M.RKOOPA_STEP], x: 880, y: 110, from: 'koopa', rule: 'turns at ledges' },
    { id: 'para', name: 'Koopa Paratroopa', f: [M.RKOOPA, M.RKOOPA_STEP], wings: true, x: 880, y: 240, from: 'koopa', rule: 'flies; a stomp takes its wings' },
    { id: 'buzzy', name: 'Buzzy Beetle', f: [M.BUZZY, M.BUZZY_STEP], x: 880, y: 370, from: 'koopa', rule: 'ignores fireballs' },
    { id: 'spiny', name: 'Spiny', f: [M.SPINY, M.SPINY_STEP], x: 880, y: 500, from: 'koopa', rule: 'stomp hurts Mario' },
    { id: 'piranha', name: 'Piranha Plant', f: [M.PIRANHA, M.PIRANHA_B], x: 1250, y: 500, from: 'spiny', rule: 'moves up and down a pipe' },
  ];
  const GROW = 1.4, TREE_DUR = NODES.length * GROW + 3;
  let treeApi = null;
  canvasDemo('tree', (s, c, g) => {
    const W = c.width, H = c.height, out = $(s, '.tr-out'), st = { t: 0, held: false, pick: null };
    c.onclick = e => {
      const { x, y } = FPF.ptr(c, e), n = NODES.find(n => Math.hypot(n.x - x, n.y - y) < 60);
      st.pick = n || null;
      say(out, n ? (n.from ? `<b>${n.name}</b> is the ${NODES.find(m => m.id === n.from).name} with one change: it ${n.rule}.` : '<b>Goomba</b>: the root. Walk forward, a stomp kills it, a fireball kills it.') : '');
    };
    function render(t) {
      g.clearRect(0, 0, W, H);
      NODES.forEach((n, i) => {
        const a = clamp((t - i * GROW) / .6, 0, 1); if (a <= 0 || !n.from) return;
        const p = NODES.find(m => m.id === n.from), e = clamp((t - i * GROW + .6) / .6, 0, 1);
        const x0 = p.x + 60, y0 = p.y - 20, x1 = n.x - 60, y1 = n.y - 20, mx = (x0 + x1) / 2;
        g.strokeStyle = '#8ea2e6'; g.lineWidth = 4; g.beginPath(); g.moveTo(x0, y0);
        const xe = lerp(x0, x1, e), ye = lerp(y0, y1, e);
        g.bezierCurveTo(mx, y0, mx, ye, xe, ye); g.stroke();
        if (e > .7) {
          g.font = '600 16px Jost, sans-serif'; const tw = g.measureText(n.rule).width + 18, ly = (y0 + y1) / 2 - 16;
          g.fillStyle = 'rgba(253,233,184,.95)'; g.strokeStyle = '#e0a92d'; g.lineWidth = 2; g.beginPath(); g.roundRect(mx - tw / 2, ly - 13, tw, 26, 13); g.fill(); g.stroke();
          txt(g, n.rule, mx, ly + 1, { size: 16, col: '#7a4a00' });
        }
      });
      NODES.forEach((n, i) => {
        const a = clamp((t - i * GROW) / .5, 0, 1); if (a <= 0) return;
        const sc = .6 + .4 * a, on = st.pick === n;
        g.save(); g.globalAlpha = a; g.translate(n.x, n.y); g.scale(sc, sc);
        g.fillStyle = on ? '#fde9b8' : '#fffaf0'; g.strokeStyle = on ? '#152044' : '#cdbf9f'; g.lineWidth = on ? 4 : 3;
        g.beginPath(); g.roundRect(-62, -78, 124, 96, 12); g.fill(); g.stroke();
        const big = n.id === 'piranha' ? 3.4 : 4;
        spr(g, n.f[(t * 4 | 0) % 2], 0, -10, big);
        if (n.wings) spr(g, M.WING, 14, -42, 3.4);
        g.restore();
        if (a > .5) txt(g, n.name, n.x, n.y + 34, { w: 800, f: 'Montserrat', size: 17 });
      });
    }
    treeApi = { seek(t) { st.held = true; st.t = t; render(t); }, dur: () => TREE_DUR };
    return dt => { if (!st.held) { st.t += Math.max(0, dt); if (st.t > TREE_DUR + 4) st.t = 0; } render(Math.min(st.t, TREE_DUR)); };
  });

  /* ---------- title ---------- */
  canvasDemo('title', (s, c, g) => (dt, t) => {
    g.clearRect(0, 0, c.width, c.height);
    [M.GOOMBA, M.KOOPA, M.RKOOPA, M.SPINY].forEach((f, i) => spr(g, f, 90 + i * 170, 100, 5));
    ['→', '→', '→'].forEach((a, i) => txt(g, a, 175 + i * 170, 80, { size: 34, col: '#ffb951', w: 800 }));
  });

  window.__seek = (t, which) => (which === 'tree' ? treeApi : ladderApi).seek(t);
  window.__dur = which => (which === 'tree' ? treeApi : ladderApi).dur();
})();
