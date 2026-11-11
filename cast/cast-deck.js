/* The stick figure cast deck: a reference for assets/cast.js.
   Slide 1: the lineup, with a card per character. Slide 2: the pose sheet (one character in every pose, or one pose
   across the cast). Slide 3: the pose lab (strike timing, gaits, rolls and blends, with the call that draws them).
   Slide 4: casting rules shown as four small scenes. Every canvas is a function of its clock and state. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const W = 1040, H = 585, TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const C = { ink: '#262c6a', muted: '#5d618c', navy: '#152044', line: '#cdbf9f', paper: 'rgba(255,252,244,.92)', red: '#e5322d', gold: '#ffb951', goldInk: '#9a5a06' };
  const PH = { startup: '#3fbf4f', active: '#e23a3a', recovery: '#3b8cff' };
  const LIST = CAST.list, POSES = Object.keys(CAST.POSES);

  function lab(g, s, x, y, { col = C.ink, size = 15, weight = 600, align = 'left', font = 'Jost, sans-serif' } = {}) {
    g.font = `${weight} ${size}px ${font}`; g.fillStyle = col; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(s, x, y);
  }
  function panel(g, x, y, w, h, fill = C.paper) {
    g.fillStyle = fill; g.strokeStyle = C.line; g.lineWidth = 2; g.beginPath(); g.roundRect(x, y, w, h, 12); g.fill(); g.stroke();
  }
  function floor(g, x0, x1, y) {
    g.strokeStyle = 'rgba(38,44,106,.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke();
    g.fillStyle = 'rgba(205,191,159,.25)'; g.fillRect(x0, y, x1 - x0, 6);
  }
  // character buttons with a colour dot
  function castButtons(box, onPick, ids = LIST.map(c => c.id)) {
    box.innerHTML = ids.map(id => { const c = CAST.by[id]; return `<button class="btn cast-btn" data-id="${id}"><i style="background:${c.col}"></i>${c.name}</button>`; }).join('');
    const bs = $$(box, '.btn');
    const sync = id => bs.forEach(b => b.classList.toggle('on', b.dataset.id === id));
    bs.forEach(b => b.onclick = () => { sync(b.dataset.id); onPick(b.dataset.id); });
    return sync;
  }
  const fmt = v => typeof v === 'string' ? `'${v}'` : JSON.stringify(v);

  /* ================= 1. the lineup ================= */
  canvasDemo('lineup', (s, c, g) => {
    const st = { pick: 'pip', t: 0 }, GY = 468, X0 = 70, DX = 112, S = 1.15;
    const card = $(s, '.ln-card');
    const showCard = id => {
      const ch = CAST.by[id], B = CAST.BUILD[ch.build], tall = Math.round(B.thigh + B.shin + B.torso + B.neck + 2 * B.head);
      card.style.borderLeftColor = ch.col;
      say(card, `<div class="role">${ch.role}</div><h3>${ch.name}</h3>
        <dl><dt>Build</dt><dd>${ch.dummy ? 'post and sack' : ch.build}${ch.dummy ? '' : ` (${tall} px tall at s = 1)`}</dd>
        <dt>Carries</dt><dd>${ch.weapon ? CAST.WEAPON[ch.weapon].name : 'nothing'}</dd>
        <dt>Colours</dt><dd><span class="chip" style="background:${ch.col};border-color:${ch.dark};color:${ch.dark}">${ch.col}</span> <span class="chip" style="background:${ch.dark};border-color:${ch.dark};color:#fff">${ch.dark}</span></dd>
        <dt>Call</dt><dd><code>CAST.draw(g, '${ch.id}', { x, y })</code></dd></dl>
        <p>${ch.use}</p>`);
    };
    const sync = castButtons($(s, '.ln-pick'), id => { st.pick = id; st.t = 0; showCard(id); });
    sync(st.pick); showCard(st.pick);
    c.onpointerdown = e => {
      const p = FPF.ptr(c, e), i = Math.round((p.x - X0) / DX);
      if (i >= 0 && i < LIST.length && p.y > 120 && p.y < GY + 80) { st.pick = LIST[i].id; st.t = 0; sync(st.pick); showCard(st.pick); }
    };
    // the picked character runs a short showreel: guard, a slash, a hit, back up, a cheer
    function reel(id, t) {
      const ch = CAST.by[id];
      if (ch.dummy) { const k = t % 3; return { pose: { lean: k < 1.2 ? 14 * Math.sin(k * 9) * Math.exp(-k * 2.5) : 0 }, flash: k < .12 ? 1 - k / .12 : 0 }; }
      const T = t % 6.4;
      if (T < .8) return { pose: CAST.mix('idle', 'guard', T / .8) };
      if (T < 2.6) { const f = (T - .8) * 30; if (ch.weapon === 'bow') return { pose: CAST.mix('guard', 'aim', clamp(f / 14)) }; if (ch.weapon === 'staff') return { pose: CAST.mix('guard', 'cast', clamp(f / 14)) }; return { pose: CAST.swing(f, 14, 18, 54).pose }; }
      if (T < 3.4) { const k = (T - 2.6) / .8; return { pose: k < .5 ? CAST.mix('idle', 'hit', k * 2) : CAST.mix('hit', 'idle', (k - .5) * 2), flash: k < .15 ? 1 - k / .15 : 0 }; }
      if (T < 4.4) return { pose: CAST.roll((T - 3.4) / 1), dx: 0 };
      if (T < 5.6) { const k = (T - 4.4) / 1.2; return { pose: k < .3 ? CAST.mix('idle', 'cheer', k / .3) : k > .8 ? CAST.mix('cheer', 'idle', (k - .8) / .2) : 'cheer' }; }
      return { pose: 'idle' };
    }
    return (dt) => {
      st.t += dt;
      g.clearRect(0, 0, W, H); panel(g, 0, 0, W, H);
      lab(g, 'The cast, at the same scale', 24, 30, { col: C.navy, size: 18, weight: 700, font: 'Montserrat, sans-serif' });
      lab(g, 'One rig, four builds: medium, heavy, slim and monster. Height lines are at 50 px steps.', 24, 56, { col: C.muted, size: 14 });
      g.strokeStyle = 'rgba(93,97,140,.18)'; g.lineWidth = 1; g.setLineDash([4, 6]);
      for (let h = 50; h <= 200; h += 50) { const y = GY - h * S; g.beginPath(); g.moveTo(16, y); g.lineTo(W - 16, y); g.stroke(); lab(g, `${h}`, W - 20, y - 8, { col: C.muted, size: 11, align: 'right' }); }
      g.setLineDash([]);
      floor(g, 16, W - 16, GY);
      LIST.forEach((ch, i) => {
        const x = X0 + i * DX, on = ch.id === st.pick;
        if (on) { g.fillStyle = 'rgba(255,185,81,.22)'; g.beginPath(); g.ellipse(x, GY - 100, 60, 170, 0, 0, TAU); g.fill(); }
        const r = on ? reel(ch.id, st.t) : { pose: CAST.mix('idle', 'guard', .12 + .12 * Math.sin(st.t * 1.6 + i)) };
        CAST.draw(g, ch.id, { x, y: GY, s: S, pose: r.pose, flash: r.flash || 0, alpha: on ? 1 : .9 });
        CAST.tag(g, ch.id, x, GY + 34, { size: 14 });
        lab(g, ch.role.replace(/^The /, ''), x, GY + 62, { col: on ? C.ink : C.muted, size: 12, align: 'center', weight: on ? 700 : 500 });
      });
    };
  });

  /* ================= 2. the pose sheet ================= */
  canvasDemo('sheet', (s, c, g) => {
    const st = { mode: 'char', pick: 'pip', pose: 'strike', ghost: false, hover: -1 };
    const out = $(s, '.sh-out'), COLS = 6, CW = W / COLS, CH = 146;
    const modes = $$(s, '.sh-mode .btn');
    const setMode = m => { st.mode = m; modes.forEach(b => b.classList.toggle('on', b.dataset.m === m)); text(); };
    modes.forEach(b => b.onclick = () => setMode(b.dataset.m));
    const sync = castButtons($(s, '.sh-pick'), id => { st.pick = id; setMode('char'); }, LIST.filter(x => !x.dummy).map(x => x.id));
    sync(st.pick);
    $(s, '.sh-ghost').onchange = e => { st.ghost = e.target.checked; };
    function text() {
      if (st.mode === 'char') say(out, `<b>${CAST.by[st.pick].name}</b> in all ${POSES.length} poses. Click one to compare it across the cast.`);
      else say(out, `<b>${st.pose}</b>: ${CAST.POSE_NOTES[st.pose]}. <code>CAST.draw(g, id, { x, y, pose: '${st.pose}' })</code>`);
    }
    text();
    // pose-mode chips along the top
    const chips = () => { const out = []; let x = 20, y = 24; POSES.forEach(p => { g.font = '600 13px Jost'; const w = g.measureText(p).width + 18; if (x + w > W - 20) { x = 20; y += 30; } out.push({ p, x, y, w }); x += w + 6; }); return out; };
    c.onpointerdown = e => {
      const p = FPF.ptr(c, e);
      if (st.mode === 'char') {
        const i = Math.floor((p.y - 6) / CH) * COLS + Math.floor(p.x / CW);
        if (i >= 0 && i < POSES.length) { st.pose = POSES[i]; setMode('pose'); }
      } else {
        const hit = chips().find(k => p.x > k.x && p.x < k.x + k.w && Math.abs(p.y - k.y) < 13);
        if (hit) { st.pose = hit.p; text(); }
      }
    };
    return (dt, t) => {
      g.clearRect(0, 0, W, H); panel(g, 0, 0, W, H);
      if (st.mode === 'char') {
        POSES.forEach((p, i) => {
          const cx = (i % COLS) * CW + CW / 2, top = Math.floor(i / COLS) * CH + 6, gy = top + 114;
          g.strokeStyle = 'rgba(205,191,159,.6)'; g.lineWidth = 1; g.strokeRect((i % COLS) * CW + 4, top + 2, CW - 8, CH - 6);
          g.save(); g.beginPath(); g.rect((i % COLS) * CW + 4, top + 2, CW - 8, CH - 6); g.clip();
          floor(g, cx - 70, cx + 70, gy);
          const pose = p === 'tuck' ? CAST.roll((t * .5) % 1) : p;
          CAST.draw(g, st.pick, { x: cx - 6, y: gy, s: .56, pose, ghost: st.ghost });
          g.restore();
          lab(g, p, cx, gy + 18, { col: C.ink, size: 14, align: 'center', weight: 700 });
        });
      } else {
        chips().forEach(k => {
          const on = k.p === st.pose;
          g.fillStyle = on ? C.navy : '#fffaf0'; g.strokeStyle = on ? C.navy : C.line; g.lineWidth = 1.5;
          g.beginPath(); g.roundRect(k.x, k.y - 12, k.w, 24, 7); g.fill(); g.stroke();
          lab(g, k.p, k.x + k.w / 2, k.y + 1, { col: on ? '#fff' : C.ink, size: 13, align: 'center' });
        });
        lab(g, `${st.pose}: ${CAST.POSE_NOTES[st.pose]}`, W / 2, 128, { col: C.navy, size: 20, align: 'center', weight: 700, font: 'Montserrat, sans-serif' });
        const gy = 450, list = LIST.filter(x => !x.dummy), dx = (W - 80) / list.length;
        floor(g, 20, W - 20, gy);
        list.forEach((ch, i) => {
          const x = 40 + dx * i + dx / 2 - 8, pose = st.pose === 'tuck' ? CAST.roll((t * .5) % 1) : st.pose;
          CAST.draw(g, ch.id, { x, y: gy, s: .9, pose, ghost: st.ghost });
          CAST.tag(g, ch.id, x + 8, gy + 34, { size: 13 });
        });
      }
    };
  });

  /* ================= 3. the pose lab ================= */
  canvasDemo('lab', (s, c, g) => {
    const st = { pick: 'pip', motion: 'slash', S: 14, A: 4, R: 22, K: 50, a: 'guard', b: 'strike', ghost: true, joints: false, t: 0 };
    const FPS = 20, HOLD = 10, code = $(s, '.lb-code');
    const sync = castButtons($(s, '.lb-pick'), id => { st.pick = id; }, LIST.map(x => x.id));
    sync(st.pick);
    const mb = $$(s, '.lb-motion .btn');
    mb.forEach(b => b.onclick = () => { st.motion = b.dataset.m; st.t = 0; mb.forEach(x => x.classList.toggle('on', x === b)); vis(); });
    const vis = () => { $(s, '.lb-strike').style.display = st.motion === 'slash' || st.motion === 'thrust' ? '' : 'none'; $(s, '.lb-blend').style.display = st.motion === 'blend' ? '' : 'none'; };
    vis();
    $$(s, 'input[type=range]').forEach(r => { const k = r.dataset.k, v = $(s, `[data-v=${k}]`); const set = () => { st[k] = +r.value; v.textContent = k === 'K' ? (st.K / 100).toFixed(2) : `${st[k]} f`; }; r.oninput = set; set(); });
    ['a', 'b'].forEach(k => { const sel = $(s, '.lb-' + k); sel.innerHTML = POSES.map(p => `<option${p === st[k] ? ' selected' : ''}>${p}</option>`).join(''); sel.onchange = () => st[k] = sel.value; });
    $(s, '.lb-ghost').onchange = e => st.ghost = e.target.checked;
    $(s, '.lb-joints').onchange = e => st.joints = e.target.checked;

    const GY = 380, X = 600, SC = 1.55;
    function current() {
      const L = st.S + st.A + st.R, kind = st.motion === 'thrust' ? 'thrust' : 'slash';
      if (st.motion === 'slash' || st.motion === 'thrust') {
        const f = (st.t * FPS) % (L + HOLD), sw = CAST.swing(Math.min(f, L - .001), st.S, st.S + st.A, L, kind);
        return { f, L, kind, sw, pose: sw.pose, x: X, call: `const sw = CAST.swing(f, ${st.S}, ${st.S + st.A}, ${L}${kind === 'thrust' ? ", 'thrust'" : ''});\nCAST.draw(g, '${st.pick}', { x, y, pose: sw.pose });\n// sw.ph is '${sw.ph}' on frame ${Math.floor(f)}` };
      }
      if (st.motion === 'walk' || st.motion === 'run') {
        const k = st.t * (st.motion === 'run' ? 1.4 : .9);
        return { pose: CAST.cycle(st.motion, k), x: X, scroll: k * (st.motion === 'run' ? 150 : 70), call: `CAST.draw(g, '${st.pick}', { x, y, pose: CAST.cycle('${st.motion}', t) });\n// t counts cycles: one stride pair per 1` };
      }
      if (st.motion === 'roll') {
        const T = st.t % 2.4, k = clamp(T / 1), back = T > 1.4 ? clamp((T - 1.4) / 1) : 0;
        const pose = T < 1 ? CAST.roll(k) : T < 1.4 ? CAST.mix({ base: 'tuck', spin: 360 }, 'idle', clamp((T - 1) / .3)) : 'idle';
        return { pose, x: X - 140 + 260 * (T < 1 ? k : 1) - 260 * back, call: `CAST.draw(g, '${st.pick}', { x, y, pose: CAST.roll(k) });\n// k from 0 to 1 turns one full roll` };
      }
      return { pose: CAST.mix(st.a, st.b, st.K / 100), x: X, call: `CAST.draw(g, '${st.pick}', { x, y,\n  pose: CAST.mix('${st.a}', '${st.b}', ${(st.K / 100).toFixed(2)}) });` };
    }
    let lastCall = '';
    return (dt) => {
      st.t += dt;
      const cur = current(), ch = CAST.by[st.pick];
      if (cur.call !== lastCall) { code.textContent = cur.call; lastCall = cur.call; }
      g.clearRect(0, 0, W, H); panel(g, 0, 0, W, H);
      // floor, scrolling for gaits
      floor(g, 20, W - 20, GY);
      if (cur.scroll != null) { g.fillStyle = 'rgba(93,97,140,.35)'; for (let i = -1; i < 14; i++) { const x = ((i * 80 - cur.scroll) % 1120 + 1120) % 1120 - 40; g.fillRect(x, GY + 10, 30, 4); } }
      // key poses as ghosts
      if (st.ghost && !ch.dummy) {
        let keys = [];
        if (cur.sw) keys = cur.kind === 'thrust' ? ['idle', 'draw', 'thrust'] : ['idle', 'windup', 'strike', 'follow'];
        else if (st.motion === 'blend') keys = [st.a, st.b];
        else if (st.motion === 'walk' || st.motion === 'run') keys = [st.motion + '1', st.motion + '2'];
        keys.forEach((k, i) => CAST.draw(g, st.pick, { x: 90 + i * 62, y: GY, s: .6, pose: k, ghost: true, shadow: false }));
        if (keys.length) lab(g, `key poses: ${keys.join(', ')}`, 30, GY + 40, { col: C.muted, size: 13 });
      }
      // slash trail behind the weapon tip while the hitbox is live
      if (cur.sw && cur.sw.ph === 'active' && ch.weapon) {
        const pts = [];
        for (let i = 0; i <= 10; i++) { const f = cur.f - i * .3; pts.push(CAST.tip(st.pick, { x: cur.x, y: GY, s: SC, pose: CAST.swing(Math.max(st.S, f), st.S, st.S + st.A, cur.L, cur.kind).pose })); }
        for (let i = 0; i < 10; i++) { g.strokeStyle = `rgba(255,122,42,${(1 - i / 10) * .8})`; g.lineWidth = 12 * (1 - i / 10) + 2; g.lineCap = 'round'; g.beginPath(); g.moveTo(pts[i].x, pts[i].y); g.lineTo(pts[i + 1].x, pts[i + 1].y); g.stroke(); }
      }
      CAST.draw(g, st.pick, { x: cur.x, y: GY, s: SC, pose: cur.pose });
      if (st.joints && !ch.dummy) {
        const p = CAST.points(st.pick, { x: cur.x, y: GY, s: SC, pose: cur.pose }), b = CAST.box(st.pick, { x: cur.x, y: GY, s: SC, pose: cur.pose });
        g.fillStyle = 'rgba(47,174,99,.12)'; g.strokeStyle = '#2fae63'; g.lineWidth = 2; g.fillRect(b.x, b.y, b.w, b.h); g.strokeRect(b.x, b.y, b.w, b.h);
        ['hip', 'sh', 'kneeB', 'kneeF', 'footB', 'footF', 'elbowB', 'elbowF', 'handB', 'handF', 'tip'].forEach(k => { const q = p[k]; if (!q) return; g.fillStyle = k === 'tip' ? C.red : '#fff'; g.strokeStyle = C.navy; g.lineWidth = 1.5; g.beginPath(); g.arc(q.x, q.y, 4.5, 0, TAU); g.fill(); g.stroke(); });
        lab(g, 'tip', p.tip.x + 8, p.tip.y - 8, { col: C.red, size: 12, weight: 700 });
      }
      // frame strip for strikes
      if (cur.sw) {
        const x0 = 40, x1 = W - 40, y0 = 470, cw = (x1 - x0) / (cur.L + HOLD);
        lab(g, 'Frames at 60 fps, shown at ⅓ speed', x0, y0 - 18, { col: C.navy, size: 14, weight: 700 });
        for (let f = 0; f < cur.L; f++) { const ph = f < st.S ? 'startup' : f < st.S + st.A ? 'active' : 'recovery'; g.fillStyle = PH[ph]; g.fillRect(x0 + f * cw + 1, y0, cw - 2, 26); }
        g.fillStyle = 'rgba(205,191,159,.4)'; g.fillRect(x0 + cur.L * cw, y0, HOLD * cw, 26);
        [['startup', st.S / 2], ['active', st.S + st.A / 2], ['recovery', st.S + st.A + st.R / 2]].forEach(([n, f]) => lab(g, n, x0 + f * cw, y0 + 44, { col: PH[n], size: 13, align: 'center', weight: 700 }));
        const px = x0 + Math.min(cur.f, cur.L + HOLD) * cw;
        g.strokeStyle = C.navy; g.lineWidth = 3; g.beginPath(); g.moveTo(px, y0 - 6); g.lineTo(px, y0 + 32); g.stroke();
        lab(g, cur.sw.ph === 'done' ? 'back to idle' : `${cur.sw.ph} · frame ${Math.floor(cur.f)}`, W - 40, 30, { col: cur.sw.ph === 'done' ? C.muted : PH[cur.sw.ph], size: 18, align: 'right', weight: 700 });
      } else {
        lab(g, st.motion === 'blend' ? `${st.a} → ${st.b} at ${(st.K / 100).toFixed(2)}` : st.motion, W - 40, 30, { col: C.navy, size: 18, align: 'right', weight: 700 });
      }
      CAST.tag(g, st.pick, 70, 30, { size: 15 });
    };
  });

  /* ================= 4. who plays which part ================= */
  canvasDemo('guide', (s, c, g) => {
    const PW = 512, PHh = 284;
    function frame(x, y, title, sub) {
      panel(g, x + 4, y + 4, PW - 8, PHh - 8);
      lab(g, title, x + 20, y + 26, { col: C.navy, size: 16, weight: 700, font: 'Montserrat, sans-serif' });
      lab(g, sub, x + 20, y + 48, { col: C.muted, size: 13 });
    }
    return (dt, t) => {
      g.clearRect(0, 0, W, H);
      // duel: Pip swings, Rook blocks on the active frames
      {
        const x = 0, y = 0, gy = y + 240, f = (t * 20) % 60, sw = CAST.swing(f, 10, 13, 34);
        frame(x, y, 'Duel: Pip and Rook', 'PvP, frame advantage, mirror matches');
        floor(g, x + 20, x + PW - 20, gy);
        const blocking = f >= 6 && f < 34;
        CAST.draw(g, 'pip', { x: x + 190, y: gy, s: .95, pose: sw.pose });
        CAST.draw(g, 'rook', { x: x + 320, y: gy, s: .95, face: -1, pose: blocking ? CAST.mix('guard', 'block', clamp((f - 6) / 4)) : 'guard', flash: sw.ph === 'active' ? .5 : 0 });
        if (sw.ph !== 'done' && sw.ph !== 'idle') { g.fillStyle = PH[sw.ph]; g.beginPath(); g.roundRect(x + 150, y + 64, 80, 22, 7); g.fill(); lab(g, sw.ph, x + 190, y + 76, { col: '#fff', size: 13, align: 'center' }); }
        if (blocking) { g.fillStyle = '#8a4fd6'; g.beginPath(); g.roundRect(x + 280, y + 64, 80, 22, 7); g.fill(); lab(g, 'blocking', x + 320, y + 76, { col: '#fff', size: 13, align: 'center' }); }
      }
      // heavy and quick: both press on frame 0
      {
        const x = PW + 16, y = 0, gy = y + 240, f = (t * 20) % 70;
        frame(x, y, 'Heavy and quick: Bram and Wisp', 'Both press attack on frame 0');
        floor(g, x + 20, x + PW - 36, gy);
        const sb = CAST.swing(f, 26, 31, 60), sq = CAST.swing(f, 6, 8, 22);
        CAST.draw(g, 'bram', { x: x + 140, y: gy, s: .82, pose: sb.pose });
        CAST.draw(g, 'wisp', { x: x + 360, y: gy, s: .95, pose: sq.pose });
        [[x + 140, sb, 'startup 26 f'], [x + 360, sq, 'startup 6 f']].forEach(([cx, sw, n]) => {
          lab(g, n, cx, y + 76, { col: C.ink, size: 13, align: 'center' });
          if (sw.ph !== 'done') { g.fillStyle = PH[sw.ph]; g.beginPath(); g.roundRect(cx - 40, y + 88, 80, 20, 7); g.fill(); lab(g, sw.ph, cx, y + 99, { col: '#fff', size: 12, align: 'center' }); }
        });
      }
      // PvE: Grub telegraphs, Pip rolls out of the swing
      {
        const x = 0, y = PHh + 16, gy = y + 240, T = t % 3.6, f = T * 20, sw = CAST.swing(f, 34, 40, 62);
        frame(x, y, 'PvE: Grub and Pip', 'A long telegraph, a dodge roll on the active frames');
        floor(g, x + 20, x + PW - 20, gy);
        const rk = clamp((f - 30) / 14), back = clamp((f - 52) / 14);
        if (sw.ph === 'startup' && sw.k > .5) { g.fillStyle = `rgba(229,50,45,${.12 + .1 * Math.sin(t * 20)})`; g.beginPath(); g.ellipse(x + 330, gy - 2, 120, 16, 0, 0, TAU); g.fill(); }
        CAST.draw(g, 'grub', { x: x + 380, y: gy, s: .95, face: -1, pose: sw.pose, tint: sw.ph === 'startup' && sw.k > .5 && Math.floor(t * 10) % 2 ? '#b0bf6e' : undefined });
        CAST.draw(g, 'pip', { x: x + 250 - 150 * rk + 150 * back, y: gy, s: .95, pose: rk > 0 && rk < 1 ? CAST.roll(rk) : 'guard' });
        lab(g, sw.ph === 'startup' ? 'telegraph' : sw.ph, x + 380, y + 76, { col: sw.ph === 'done' ? C.muted : PH[sw.ph] || C.muted, size: 14, align: 'center', weight: 700 });
      }
      // metrics: Sam measures a doorway and cover
      {
        const x = PW + 16, y = PHh + 16, gy = y + 240;
        frame(x, y, 'Metrics: Sam is the ruler', 'Doorways, cover heights and crowds in Sam units');
        floor(g, x + 20, x + PW - 36, gy);
        for (let i = 0; i < 5; i++) CAST.draw(g, 'sam', { x: x + 370 + i * 22, y: gy, s: .4, alpha: .45, pose: CAST.cycle('walk', t * .8 + i * .3), shadow: false });
        CAST.draw(g, 'sam', { x: x + 70, y: gy, s: .95, pose: 'idle' });
        const sh = 140, dw = 70;
        g.fillStyle = '#2a2e55'; g.fillRect(x + 120, gy - sh * 1.3, dw, sh * 1.3);
        g.strokeStyle = C.navy; g.lineWidth = 4; g.strokeRect(x + 120, gy - sh * 1.3, dw, sh * 1.3);
        g.fillStyle = '#8f97ad'; g.fillRect(x + 290, gy - sh * .5, 50, sh * .5); g.strokeStyle = '#4b5470'; g.lineWidth = 3; g.strokeRect(x + 290, gy - sh * .5, 50, sh * .5);
        CAST.draw(g, 'kit', { x: x + 250, y: gy, s: .95, pose: 'crouch' });
        g.strokeStyle = C.goldInk; g.lineWidth = 1.5; g.setLineDash([4, 4]);
        [[sh, 'Sam'], [sh * 1.3, '1.3 × Sam'], [sh * .5, '½ Sam']].forEach(([h, n], i) => { const yy = gy - h; g.beginPath(); g.moveTo(x + 30, yy); g.lineTo(x + 470, yy); g.stroke(); lab(g, n, x + 470, yy - 9, { col: C.goldInk, size: 12, align: 'right', weight: 700 }); });
        g.setLineDash([]);
        lab(g, 'door', x + 155, gy + 16, { col: C.muted, size: 12, align: 'center' }); lab(g, 'low cover', x + 315, gy + 16, { col: C.muted, size: 12, align: 'center' });
      }
    };
  });
})();
