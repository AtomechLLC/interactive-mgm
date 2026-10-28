/* The guarded door and the tool matrix (MGM C4 M2, deck slides 58-63, 73-74, 83-90, 190).
   1. A room with a door, a chest and an enemy. Use a key, a lockpick or a hammer on each and a grid fills in: the key acts
      on one thing, the lockpick on two, the hammer on all three. Add the notes' security guard and the door gets three
      different consequences: the key gets you waved in, the lockpick gets you interrogated, the hammer gets you shot at.
      Rules: WORKS (what each tool can act on) and GUARD (how the guard reacts at the door).
   2. The tool matrix: narrow/broad (how many targets) x shallow/versatile (how many purposes) with the slides' examples,
      a cost meter (slide 74: tools, situations, teaching) and the 80/20 share of core tools. Catalogue: KIT. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;
  const W = 1040, H = 585;

  /* ---------- 1. the guarded door ---------- */
  const TOOLS = { key: 'Key', pick: 'Lockpick', hammer: 'Hammer' };
  const TARGETS = { door: 'Door', chest: 'Chest', enemy: 'Enemy' };
  const WORKS = { key: { door: 'unlocks it' }, pick: { door: 'picks the lock', chest: 'picks the lock' }, hammer: { door: 'smashes it', chest: 'smashes it', enemy: 'fights it' } };
  const GUARD = {
    key: { face: 'calm', line: 'Go ahead.', out: 'lets you in', col: '#1a8a4c' },
    pick: { face: 'suspicious', line: 'Hey! What’s that?', out: 'interrogates you', col: '#b77d07' },
    hammer: { face: 'hostile', line: 'Intruder!', out: 'opens fire', col: '#a8201c' },
  };
  const RX = 20, RY = 10, RW = 560, RH = 400;
  const SPOT = { door: [RX + 280, RY + 64], chest: [RX + 100, RY + 230], enemy: [RX + 460, RY + 250] };
  const HOME = [RX + 280, RY + 340], GUARD_AT = [RX + 390, RY + 92];
  const ACT = 2.6;

  function keyIcon(g, x, y, s = 1) { g.save(); g.translate(x, y); g.scale(s, s); g.strokeStyle = '#9a5a06'; g.fillStyle = '#ffb951'; g.lineWidth = 3; g.beginPath(); g.arc(-10, 0, 8, 0, Math.PI * 2); g.fill(); g.stroke(); g.fillRect(-2, -3, 22, 6); g.strokeRect(-2, -3, 22, 6); g.fillRect(12, 3, 4, 6); g.fillRect(17, 3, 3, 5); g.restore(); }
  function pickIcon(g, x, y, s = 1) { g.save(); g.translate(x, y); g.scale(s, s); g.strokeStyle = '#62688a'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(-16, 6); g.lineTo(14, -2); g.lineTo(18, -8); g.stroke(); g.beginPath(); g.moveTo(-16, -6); g.lineTo(12, 4); g.stroke(); g.restore(); }
  function hammerIcon(g, x, y, s = 1, rot = 0) { g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s); g.fillStyle = '#8b6136'; g.fillRect(-3, -4, 6, 34); g.fillStyle = C.stone; g.strokeStyle = C.navy; g.lineWidth = 2; g.fillRect(-16, -14, 32, 14); g.strokeRect(-16, -14, 32, 14); g.restore(); }
  const ICON = { key: keyIcon, pick: pickIcon, hammer: hammerIcon };

  function room(g, st) {
    T.floor(RX, RY, RW, RH); T.wall(RX, RY, RW, 40);
    // door: opens (swings) or is smashed
    const [dx, dy] = SPOT.door;
    g.fillStyle = '#2a2e55'; g.fillRect(dx - 44, RY, 88, 40);
    if (st.door === 'shut') { g.fillStyle = '#9b6a3a'; g.strokeStyle = '#4e2a10'; g.lineWidth = 3; g.fillRect(dx - 40, RY + 2, 80, 36); g.strokeRect(dx - 40, RY + 2, 80, 36); g.fillStyle = '#ffb951'; g.beginPath(); g.arc(dx + 24, RY + 22, 5, 0, Math.PI * 2); g.fill(); }
    else if (st.door === 'open') { g.fillStyle = '#9b6a3a'; g.save(); g.translate(dx - 40, RY + 38); g.rotate(-1.2); g.fillRect(0, -6, 80, 10); g.restore(); }
    else { g.fillStyle = '#9b6a3a'; [[-30, 60, .4], [10, 74, -.6], [34, 56, 1]].forEach(([ox, oy, r]) => { g.save(); g.translate(dx + ox, RY + oy); g.rotate(r); g.fillRect(-14, -4, 28, 8); g.restore(); }); }
    // chest
    const [cx, cy] = SPOT.chest;
    g.fillStyle = '#9b6a3a'; g.strokeStyle = '#4e2a10'; g.lineWidth = 3;
    if (st.chest === 'smashed') { [[-20, 8, .3], [16, 12, -.5], [0, -6, 1.2]].forEach(([ox, oy, r]) => { g.save(); g.translate(cx + ox, cy + oy); g.rotate(r); g.fillRect(-16, -5, 32, 10); g.restore(); }); T.flash(cx, cy, 30, .5); }
    else {
      g.fillRect(cx - 34, cy - 14, 68, 36); g.strokeRect(cx - 34, cy - 14, 68, 36);
      if (st.chest === 'open') { g.fillStyle = '#7a4f28'; g.fillRect(cx - 34, cy - 40, 68, 22); g.strokeRect(cx - 34, cy - 40, 68, 22); T.flash(cx, cy - 16, 40, .8); }
      else { g.fillRect(cx - 34, cy - 26, 68, 14); g.strokeRect(cx - 34, cy - 26, 68, 14); g.fillStyle = '#ffb951'; g.fillRect(cx - 6, cy - 16, 12, 12); }
    }
    // enemy
    const [ex, ey] = SPOT.enemy;
    if (st.enemy !== 'down') T.foe(ex, ey, 26, Math.PI * .9, C.red, { mark: 'horns' }); else { T.foe(ex, ey, 26, Math.PI * .9, '#c9b2ad', { mark: 'horns', a: .5 }); }
    // guard
    if (st.guard) {
      const [gx, gy] = GUARD_AT, mood = st.mood;
      T.foe(gx, gy, 24, Math.atan2(HOME[1] - gy, HOME[0] - gx) + (mood ? 0 : 1), mood === 'hostile' ? C.red : '#5562eb', { mark: 'shield', edge: mood === 'hostile' ? C.redDk : '#2a3590' });
      T.label('Guard', gx, gy + 40, 'center', C.ink, 12);
      if (mood === 'suspicious') T.popText('?', gx + 26, gy - 34, '#b77d07', 1);
      if (mood === 'hostile') T.popText('!!!', gx + 30, gy - 34, C.redDk, 1);
    }
    T.label('Door', dx, RY + 92, 'center', C.ink, 12); T.label('Chest', cx, cy + 46, 'center', C.ink, 12); T.label('Enemy', ex, ey + 46, 'center', C.ink, 12);
  }

  // what happens during one action, at local time a (0..ACT)
  function actionState(act, a, guard) {
    const st = { door: 'shut', chest: 'shut', enemy: 'up', guard, mood: null };
    const ok = !!WORKS[act.tool][act.target], res = a > 1.25;
    if (ok && res) {
      if (act.target === 'door') st.door = act.tool === 'hammer' ? 'smashed' : 'open';
      if (act.target === 'chest') st.chest = act.tool === 'hammer' ? 'smashed' : 'open';
      if (act.target === 'enemy') st.enemy = 'down';
    }
    if (guard && act.target === 'door' && a > .8) st.mood = GUARD[act.tool].face === 'calm' ? null : GUARD[act.tool].face;
    // where the hero is
    const [tx, ty] = SPOT[act.target], stand = act.target === 'door' ? [tx, ty + 70] : act.target === 'chest' ? [tx + 70, ty] : [tx - 70, ty];
    const k = a < .7 ? ease(a / .7) : a < 2.2 ? 1 : 1 - ease(clamp((a - 2.2) / .4));
    st.hero = [lerp(HOME[0], stand[0], k), lerp(HOME[1], stand[1], k)];
    st.face = Math.atan2(ty - st.hero[1], tx - st.hero[0]);
    st.ok = ok; st.res = res; st.stand = stand;
    return st;
  }

  function grid(g, done, cur, guard) {
    const x0 = 596, y0 = 10, cw = 70, rh = 64, hw = 104, gx = x0 + hw + cw * 3 + 62;
    g.fillStyle = 'rgba(255,252,244,.9)'; g.beginPath(); g.roundRect(x0, y0, W - x0 - 10, 400, 12); g.fill();
    g.font = '700 14px Montserrat, Jost, sans-serif'; g.fillStyle = C.ink; g.textAlign = 'center'; g.textBaseline = 'middle';
    Object.values(TARGETS).forEach((n, j) => g.fillText(n, x0 + hw + cw * j + cw / 2, y0 + 30));
    g.fillText('Guard', gx, y0 + 30);
    Object.entries(TOOLS).forEach(([tk, tn], i) => {
      const y = y0 + 56 + rh * i;
      ICON[tk](g, x0 + 24, y + rh / 2 - 18, .8); g.fillStyle = C.ink; g.font = '700 14px Jost, sans-serif'; g.textAlign = 'left'; g.fillText(tn, x0 + 12, y + rh / 2 + 14);
      g.textAlign = 'center';
      Object.keys(TARGETS).forEach((gk, j) => {
        const x = x0 + hw + cw * j, d = done[tk + gk], isCur = cur && cur.tool === tk && cur.target === gk;
        g.fillStyle = d == null ? 'rgba(205,191,159,.25)' : d ? 'rgba(47,174,99,.2)' : 'rgba(160,160,170,.15)';
        g.strokeStyle = isCur ? C.navy : '#cdbf9f'; g.lineWidth = isCur ? 3 : 1.5; g.beginPath(); g.roundRect(x + 4, y + 4, cw - 8, rh - 8, 8); g.fill(); g.stroke();
        if (d != null) { g.font = '800 22px Montserrat, Jost, sans-serif'; g.fillStyle = d ? C.good : '#9a9cb0'; g.fillText(d ? '✔' : '✕', x + cw / 2, y + rh / 2); }
      });
      // what the guard does, once tried with the guard watching
      const gr = done['g' + tk];
      if (gr) { g.font = '700 13px Jost, sans-serif'; g.fillStyle = GUARD[tk].col; g.fillText(GUARD[tk].out, gx, y + rh / 2); }
    });
    // situations per tool
    const yS = y0 + 56 + rh * 3 + 12;
    g.font = '600 13px Jost, sans-serif'; g.fillStyle = C.muted; g.textAlign = 'left'; g.fillText('situations it acts on', x0 + 14, yS + 10);
    Object.keys(TOOLS).forEach((tk, i) => { const n = Object.keys(TARGETS).filter(gk => done[tk + gk]).length; g.fillStyle = C.ink; g.font = '700 14px Jost, sans-serif'; g.fillText(`${TOOLS[tk]}: ${n} of 3`, x0 + 14 + i * 140, yS + 38); });
    if (!guard) { g.fillStyle = C.muted; g.font = '600 12px Jost, sans-serif'; g.textAlign = 'center'; g.fillText('(no guard yet)', gx, y0 + 50); }
  }

  const TOUR = [
    ['key', 'door'], ['key', 'chest'], ['key', 'enemy'], ['pick', 'door'], ['pick', 'chest'], ['pick', 'enemy'], ['hammer', 'door'], ['hammer', 'chest'], ['hammer', 'enemy'],
    ['key', 'door', 1], ['pick', 'door', 1], ['hammer', 'door', 1],
  ].map(([tool, target, guard]) => ({ tool, target, guard: !!guard }));
  const DUR = TOUR.length * ACT + 2;
  const doneAfter = (acts, t) => { const d = {}; acts.forEach((a, i) => { if (t >= a.at + 1.25) { d[a.tool + a.target] = !!WORKS[a.tool][a.target]; if (a.guard && a.target === 'door') d['g' + a.tool] = true; } }); return d; };

  let api1;
  canvasDemo('door', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, tool: 'key', guard: false, acts: [], key: '' };
    const tourBtn = $(s, '.gd-tour'), guardEl = $(s, '.gd-guard');
    const sync = () => { $$(s, '.gd-tool .btn').forEach(b => b.classList.toggle('on', b.dataset.v === st.tool)); guardEl.checked = st.guard; };
    const free = () => { if (!st.tour) return; st.tour = false; tourBtn.classList.remove('on'); st.t = 0; st.acts = []; };
    const use = target => { free(); const last = st.acts.at(-1), at = Math.max(st.t, last ? last.at + ACT : 0); st.acts.push({ tool: st.tool, target, guard: st.guard, at }); };
    $$(s, '.gd-tool .btn').forEach(b => b.onclick = () => { free(); st.tool = b.dataset.v; sync(); });
    $$(s, '.gd-target .btn').forEach(b => b.onclick = () => use(b.dataset.v));
    guardEl.onchange = () => { free(); st.guard = guardEl.checked; };
    $(s, '.gd-reset').onclick = () => { st.tour = true; free(); };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    cv.addEventListener('pointerdown', e => {
      const r = cv.getBoundingClientRect(), mx = (e.clientX - r.left) * W / r.width, my = (e.clientY - r.top) * H / r.height;
      Object.entries(SPOT).forEach(([k, [x, y]]) => { if (Math.hypot(mx - x, my - y) < 50) use(k); });
    });
    function render() {
      const t = st.t, acts = st.tour ? TOUR.map((a, i) => ({ ...a, at: i * ACT })) : st.acts;
      const cur = acts.filter(a => t >= a.at).at(-1), a = cur ? t - cur.at : 9;
      T.use(g); g.clearRect(0, 0, W, H);
      const guardOn = cur ? cur.guard : st.guard;
      if (st.tour && cur && (cur.tool !== st.tool || cur.guard !== st.guard)) { st.tool = cur.tool; st.guard = cur.guard; sync(); }
      const S = cur && a < ACT ? actionState(cur, a, guardOn) : { door: 'shut', chest: 'shut', enemy: 'up', guard: guardOn, hero: HOME, face: -Math.PI / 2 };
      room(g, S);
      T.player(S.hero[0], S.hero[1], S.face, 1.05);
      if (cur && a < ACT) {
        const tool = cur.tool, using = a > .7 && a < 1.3, [hx, hy] = S.hero;
        if (tool === 'hammer') hammerIcon(g, hx + Math.cos(S.face) * 26, hy + Math.sin(S.face) * 26, 1, S.face + Math.PI / 2 + (using ? Math.sin((a - .7) / .6 * Math.PI) * 1.2 : 0));
        else ICON[tool](g, hx + Math.cos(S.face) * 30, hy + Math.sin(S.face) * 30 + (using ? Math.sin(a * 30) * 2 : 0), 1);
        if (S.res && a < 2.2) {
          const [tx, ty] = SPOT[cur.target];
          T.popText(S.ok ? `✔ ${WORKS[tool][cur.target]}` : `✕ the ${TOOLS[tool].toLowerCase()} does nothing`, clamp(S.hero[0], 150, RX + RW - 150), S.hero[1] + 52 + 10 * (a - 1.25), S.ok ? C.good : C.muted, 2.2 - a);
        }
        // the guard's reaction, with the hammer's open fire
        if (guardOn && cur.target === 'door' && a > .8 && a < 2.4) {
          const G = GUARD[tool];
          T.label(G.line, GUARD_AT[0] + 70, GUARD_AT[1] + 66, 'center', '#fff', 14, G.col);
          if (tool === 'hammer' && Math.floor(a * 8) % 2) T.tracer(GUARD_AT[0], GUARD_AT[1], S.hero[0], S.hero[1], .9, C.red, 3);
        }
      }
      const done = doneAfter(acts, t);
      grid(g, done, cur && a < ACT ? cur : null, guardOn);
      // caption strip
      g.fillStyle = 'rgba(255,252,244,.9)'; g.beginPath(); g.roundRect(20, 424, W - 30, 150, 12); g.fill();
      const cap = !cur ? 'Pick a tool, then use it on the door, the chest or the enemy.'
        : cur.guard && cur.target === 'door' ? `Guard watching: the ${TOOLS[cur.tool].toLowerCase()} ${GUARD[cur.tool].out}. ${cur.tool === 'key' ? 'No fuss.' : cur.tool === 'pick' ? 'Pass or distract him first.' : 'Defeat him first.'}`
          : `The ${TOOLS[cur.tool].toLowerCase()} on the ${cur.target}: ${WORKS[cur.tool][cur.target] || 'nothing happens'}.`;
      T.label(cap, W / 2, 452, 'center', '#fff', 16, C.navy);
      const ks = Object.keys(TOOLS);
      ks.forEach((tk, i) => {
        const n = Object.keys(TARGETS).filter(gk => done[tk + gk]).length, x = 40 + i * 330, y = 490;
        ICON[tk](g, x + 20, y + 22, 1.1);
        g.fillStyle = '#e7dec9'; g.beginPath(); g.roundRect(x + 50, y + 10, 240, 24, 12); g.fill();
        g.fillStyle = [C.muted, '#2ea3dc', C.good][Math.max(0, n - 1)] || C.muted; g.beginPath(); g.roundRect(x + 50, y + 10, 240 * n / 3, 24, 12); g.fill();
        g.fillStyle = C.ink; g.font = '700 14px Jost, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(`${TOOLS[tk]}: useful in ${n} of 3 situations`, x + 50, y + 54);
      });
      const key = JSON.stringify(done) + (cur ? cur.tool + cur.target + cur.guard : ''); if (key === st.key) return; st.key = key;
      const nG = ['key', 'pick', 'hammer'].filter(k => done['g' + k]).length;
      say($(s, '.gd-stats'), ks.map(k => `<div class="${Object.keys(TARGETS).filter(gk => done[k + gk]).length === 3 ? 'g' : ''}"><b>${Object.keys(TARGETS).filter(gk => done[k + gk]).length}/3</b><span>${TOOLS[k]}: situations it acts on</span></div>`).join(''));
      say($(s, '.gd-out'), nG >= 3
        ? 'Three tools, one door, three real choices with visible consequences: walked in, interrogated, or shot at. That is a meaningful interaction.'
        : nG ? 'Now a guard watches the door. The same three tools still open it, but each one changes what happens next.'
          : 'The key is the weakest tool: one key, one lock. The lockpick works on any lock. The hammer smashes doors and chests and fights enemies: useful in more situations, more often.');
    }
    sync();
    api1 = { seek(t) { st.held = st.tour = true; st.t = t; render(); }, dur: () => DUR };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > DUR) st.t = 0; render(); };
  });

  /* ---------- 2. the tool matrix ---------- */
  // purposes = how many different jobs; targets = how many kinds of thing it acts on. Examples from slides 68, 73, 88.
  const KIT = [
    { id: 'key', name: 'Small key', from: 'one door, one lock', purposes: ['open a locked door'], targets: ['locked door'] },
    { id: 'boss', name: 'Boss key', from: 'Zelda (slide 88)', purposes: ['open the boss door'], targets: ['boss door'] },
    { id: 'cane', name: 'Cane of Somaria', from: 'A Link to the Past (slide 68)', purposes: ['hold down a plate'], targets: ['pressure plate'] },
    { id: 'pick', name: 'Lockpick', from: 'Skyrim (slide 88)', purposes: ['open a lock'], targets: ['locked door', 'chest', 'gate'] },
    { id: 'hammer', name: 'Hammer', from: 'Ocarina of Time (slides 87-88)', purposes: ['weapon', 'remove barriers', 'slam rusty switches', 'break shields'], targets: ['enemy', 'barrier', 'rusty switch', 'shield'] },
    { id: 'bomb', name: 'Bombs', from: 'A Link to the Past (slide 68)', purposes: ['weapon', 'blow open walls', 'clear rocks'], targets: ['enemy', 'cracked wall', 'rock'] },
  ];
  const quad = k => (k.targets.length > 1 ? 'broad' : 'narrow') + ' and ' + (k.purposes.length > 1 ? 'versatile' : 'shallow');
  const core = k => k.targets.length > 1 && k.purposes.length > 1;
  const MX = { x0: 70, x1: 560, y0: 470, y1: 40 };
  function matrix(g, kit, t) {
    const px = n => lerp(MX.x0, MX.x1, (n - .5) / 4.5), py = n => lerp(MX.y0, MX.y1, (n - .5) / 4.5);
    g.fillStyle = 'rgba(255,252,244,.9)'; g.beginPath(); g.roundRect(10, 10, 580, 565, 12); g.fill();
    const mx = px(1.5), my = py(1.5);
    [[MX.x0, my, mx - MX.x0, MX.y0 - my, 'Narrow,|shallow', '#e7dec9'], [mx, my, MX.x1 - mx, MX.y0 - my, 'Broad, shallow', '#dceaf6'], [MX.x0, MX.y1, mx - MX.x0, my - MX.y1, 'Narrow,|versatile', '#ece4f6'], [mx, MX.y1, MX.x1 - mx, my - MX.y1, 'Broad and versatile: core', '#dff1e4']].forEach(([x, y, w, h, n, c]) => { g.fillStyle = c; g.fillRect(x, y, w, h); g.fillStyle = C.muted; g.font = '700 13px Jost, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; n.split('|').forEach((l, i) => g.fillText(l, x + w / 2, y + 16 + i * 16)); });
    g.strokeStyle = C.navy; g.lineWidth = 2; g.strokeRect(MX.x0, MX.y1, MX.x1 - MX.x0, MX.y0 - MX.y1);
    g.fillStyle = C.ink; g.font = '700 14px Jost, sans-serif'; g.fillText('kinds of target it acts on (narrow → broad)', (MX.x0 + MX.x1) / 2, MX.y0 + 24);
    [1, 2, 3, 4].forEach(n => { g.fillStyle = C.muted; g.font = '600 12px Jost, sans-serif'; g.fillText(n, px(n), MX.y0 + 8); g.fillText(n, MX.x0 - 12, py(n)); });
    g.save(); g.translate(MX.x0 - 40, (MX.y0 + MX.y1) / 2); g.rotate(-Math.PI / 2); g.fillStyle = C.ink; g.font = '700 14px Jost, sans-serif'; g.fillText('purposes (shallow → versatile)', 0, 0); g.restore();
    // dots, nudged apart where tools share a cell
    const seen = {};
    kit.forEach(k => {
      const cell = k.targets.length + ',' + k.purposes.length, n = seen[cell] = (seen[cell] || 0) + 1;
      const x = px(k.targets.length), y = py(k.purposes.length) + 34 - (n - 1) * 22;
      const a = clamp((t - k.at) / .4);
      g.save(); g.globalAlpha = a; g.fillStyle = core(k) ? C.good : k.targets.length > 1 ? '#2ea3dc' : '#9a9cb0'; g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, 12 + 4 * (1 - a), 0, Math.PI * 2); g.fill(); g.stroke(); g.restore();
      if (a > .5) T.label(k.name, x + 18, y, 'left', C.ink, 13);
    });
  }
  function costs(g, kit) {
    const x0 = 610, y0 = 10, w = W - x0 - 10;
    g.fillStyle = 'rgba(255,252,244,.9)'; g.beginPath(); g.roundRect(x0, y0, w, 565, 12); g.fill();
    const targets = new Set(kit.flatMap(k => k.targets)), purposes = kit.reduce((a, k) => a + k.purposes.length, 0);
    const c = { tools: kit.length * 1, situations: targets.size * 2, teach: purposes * 3 }, total = c.tools + c.situations + c.teach;
    T.label('What the kit costs to make', x0 + w / 2, y0 + 28, 'center', '#fff', 14, C.navy);
    [['tools', '$ per tool you design', '#ffb951'], ['situations', '$$ per kind of situation you build', '#2ea3dc'], ['teach', '$$$ per use you must teach', '#e5322d']].forEach(([k, l, col], i) => {
      const y = y0 + 62 + i * 54;
      g.fillStyle = '#e7dec9'; g.beginPath(); g.roundRect(x0 + 16, y, w - 32, 20, 10); g.fill();
      g.fillStyle = col; g.beginPath(); g.roundRect(x0 + 16, y, (w - 32) * Math.min(1, c[k] / 40), 20, 10); g.fill();
      g.fillStyle = C.ink; g.font = '700 13px Jost, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(`${l}: ${c[k]}`, x0 + 16, y + 34);
    });
    g.font = '800 30px Montserrat, Jost, sans-serif'; g.textAlign = 'center'; g.fillStyle = C.ink; g.fillText(`${total}`, x0 + w / 2, y0 + 246);
    g.font = '600 13px Jost, sans-serif'; g.fillStyle = C.muted; g.fillText('total cost, in made-up units', x0 + w / 2, y0 + 274);
    // 80/20: what share of the kit is core (broad and versatile)
    const coreN = kit.filter(core).length, share = kit.length ? coreN / kit.length : 0, by = y0 + 330;
    T.label('80/20 it', x0 + w / 2, by - 18, 'center', '#fff', 14, C.navy);
    g.fillStyle = '#9a9cb0'; g.beginPath(); g.roundRect(x0 + 16, by + 10, w - 32, 34, 10); g.fill();
    g.fillStyle = C.good; g.beginPath(); g.roundRect(x0 + 16, by + 10, (w - 32) * share, 34, 10); g.fill();
    g.strokeStyle = C.navy; g.setLineDash([5, 4]); g.lineWidth = 2; g.beginPath(); g.moveTo(x0 + 16 + (w - 32) * .2, by + 2); g.lineTo(x0 + 16 + (w - 32) * .2, by + 52); g.stroke(); g.setLineDash([]);
    g.fillStyle = C.ink; g.font = '700 13px Jost, sans-serif'; g.textAlign = 'left'; g.fillText(`core (broad and versatile): ${Math.round(share * 100)}%`, x0 + 16, by + 66);
    g.textAlign = 'right'; g.fillStyle = C.muted; g.fillText('slide 90 aims for about 20%', x0 + w - 16, by + 86);
    const covered = targets.size;
    g.textAlign = 'center'; g.font = '800 26px Montserrat, Jost, sans-serif'; g.fillStyle = C.ink; g.fillText(`${covered}`, x0 + w / 2, by + 140);
    g.font = '600 13px Jost, sans-serif'; g.fillStyle = C.muted; g.fillText('kinds of situation the kit can act on', x0 + w / 2, by + 166);
    return { total, coreN, share, covered };
  }
  const MTOUR = ['key', 'boss', 'cane', 'pick', 'hammer', 'bomb'], MSTEP = 3.4, MDUR = MTOUR.length * MSTEP + 3;
  let api2;
  canvasDemo('matrix', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, on: new Set(['key', 'pick', 'hammer']), key: '' };
    const tourBtn = $(s, '.gd-tour'), box = $(s, '.gd-kit');
    box.innerHTML = KIT.map(k => `<label class="chk" style="margin:4px 0"><input type="checkbox" data-k="${k.id}"> ${k.name} <span style="font-weight:400;color:var(--muted);font-size:14px">${k.from}</span></label>`).join('');
    const sync = on => $$(box, 'input').forEach(i => { i.checked = on.has(i.dataset.k); });
    $$(box, 'input').forEach(i => i.onchange = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); st.on = new Set(MTOUR.filter((k, j) => st.t >= j * MSTEP)); } i.checked ? st.on.add(i.dataset.k) : st.on.delete(i.dataset.k); st.t = 99; });
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    function render() {
      const t = st.t;
      const kit = st.tour ? KIT.filter(k => MTOUR.indexOf(k.id) * MSTEP <= t).map(k => ({ ...k, at: MTOUR.indexOf(k.id) * MSTEP })) : KIT.filter(k => st.on.has(k.id)).map(k => ({ ...k, at: -1 }));
      if (st.tour) sync(new Set(kit.map(k => k.id)));
      T.use(g); g.clearRect(0, 0, W, H);
      matrix(g, kit, t); const r = costs(g, kit);
      const last = st.tour ? kit.at(-1) : null;
      if (last && t - last.at < MSTEP) T.label(`${last.name}: ${last.purposes.length} purpose${last.purposes.length > 1 ? 's' : ''}, ${last.targets.length} kind${last.targets.length > 1 ? 's' : ''} of target → ${quad(last)}`, 300, 545, 'center', '#fff', 14, C.navy);
      const key = kit.map(k => k.id).join() + (last?.id || ''); if (key === st.key) return; st.key = key;
      say($(s, '.gd-stats'), `<div><b>${kit.length}</b><span>tools in the kit</span></div><div class="g"><b>${r.coreN}</b><span>core: broad and versatile</span></div><div class="y"><b>${r.total}</b><span>cost to design, build and teach</span></div>`);
      say($(s, '.gd-out'), !kit.length ? 'Tick tools to build a kit.'
        : last && ['key', 'boss', 'cane'].includes(last.id) ? 'Narrow and shallow: one job, one target. Each one still costs a tool, a situation to use it in and a lesson. Some are on purpose: a boss key that opened every boss door would not be meaningful.'
          : last && last.id === 'pick' ? 'A lockpick is broad: the same job on doors, chests and gates. Still shallow, it only removes locks.'
            : 'The hammer and bombs are broad and versatile: many jobs on many targets. Build these first; they carry the core gameplay. Then 80/20 it: most of the kit stays simple.');
    }
    api2 = { seek(t) { st.held = st.tour = true; st.t = t; render(); }, dur: () => MDUR };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > MDUR) st.t = 0; render(); };
  });

  window.__seek = (t, w) => (w === 'matrix' ? api2 : api1).seek(t);
  window.__dur = w => (w === 'matrix' ? api2 : api1).dur();
})();
