/* Score a game with Quantic Foundry: the Skyrim radar (DGMS Module 2, Audience Demographics, deck slides 38-40, 49-50).
   Quantic Foundry's gamer motivation model: 12 motivations in 6 families (Action, Social, Mastery, Achievement,
   Immersion, Creativity). Slide 50 scores Skyrim on them (18 numbers: 12 motivations + 6 family scores), and its notes give
   the method: "designers should start voting each category based on how much that category is present in the project.
   Not how much they like it but how present it is… having more designers adding their data and using them as an average
   could ensure better results." Slides 39-40 swap the rows: the first motivation of each family is inward (your own
   actions, growth, identity), the second is outward (external stimulus and content).
   radar: Skyrim scored by up to four designers; the radar draws their average with a min-max spread band, a "my game"
          overlay you can edit (drag on the radar or use the slider), and a toggle that regroups the axes inward vs outward.
   vote:  the same four designers voting on how present each motivation is, vs on how much they like it.
   Numbers: SKYRIM and LOL are COURSE ESTIMATES on a 0-10 "how present" scale. Slide 50's numbers are unlabelled in the
   text export, so these are not the deck's figures. Designer offsets, tastes and MY_GAME are illustrative. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;
  const W = 1040, H = 585, TAU = Math.PI * 2;
  const MOT = ['Destruction', 'Excitement', 'Competition', 'Community', 'Challenge', 'Strategy', 'Completion', 'Power', 'Fantasy', 'Story', 'Design', 'Discovery'];
  const FAM = [['Action', '#e5322d'], ['Social', '#2fae63'], ['Mastery', '#2ea3dc'], ['Achievement', '#d9961a'], ['Immersion', '#8a4fd6'], ['Creativity', '#d9558f']];
  const INWARD = i => i % 2 === 0;    // slides 39-40: the first row (Destruction, Competition, Challenge, Completion, Fantasy, Design)
  const P = {
    // course estimates, 0-10, how present each motivation is (NOT the deck's slide 50 figures)
    SKYRIM: [6, 5, 1, 2, 5, 4, 9, 8, 10, 7, 6, 10],
    LOL:    [7, 8, 10, 6, 9, 9, 3, 5, 4, 2, 3, 3],
    // illustrative: how far each designer's vote lands from the estimate
    OFFSETS: [
      [0, 1, 0, 0, -1, 0, 0, 1, 0, -1, 0, 0],
      [1, -1, 1, 1, 0, 1, -1, 0, 0, 1, -1, 0],
      [-1, 0, 0, -1, 1, -1, 0, -1, -1, 0, 1, -1],
      [0, 1, -1, 1, 2, 0, 1, 0, 0, -2, 0, 0],
    ],
    // illustrative: each designer's own taste, used when they vote on how much they like a motivation
    TASTE: [
      [9, 9, 8, 6, 9, 8, 4, 6, 3, 3, 4, 5],
      [3, 4, 2, 6, 4, 5, 7, 6, 9, 10, 6, 8],
      [4, 5, 3, 7, 6, 8, 7, 6, 6, 5, 10, 8],
      [6, 6, 5, 4, 7, 7, 10, 9, 6, 6, 5, 7],
    ],
    LIKE_PRESENT: .25,     // illustrative: when voting on liking, how much the game itself still shows through
    MY_GAME: [5, 6, 3, 8, 6, 5, 6, 5, 4, 2, 9, 7],   // illustrative: a co-op crafting game draft
  };
  const DES_COL = ['#2ea3dc', '#2fae63', '#8a4fd6', '#e5322d'];
  const vote = (est, d) => est.map((v, i) => clamp(v + P.OFFSETS[d][i], 0, 10));
  const like = (est, d) => est.map((v, i) => Math.round(P.LIKE_PRESENT * vote(est, d)[i] + (1 - P.LIKE_PRESENT) * P.TASTE[d][i]));
  const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
  const f1 = v => (Math.round(v * 10) / 10).toFixed(1);
  const posOf = (i, mode) => mode ? (INWARD(i) ? i / 2 : 6 + (i - 1) / 2) : i;
  const angOf = p => -Math.PI / 2 + (p + .5) * TAU / 12;
  const panel = g => { g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(255,252,244,.82)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill(); };
  const txt = (g, s, x, y, font, col = C.ink, al = 'left') => { g.font = font; g.fillStyle = col; g.textAlign = al; g.textBaseline = 'middle'; g.fillText(s, x, y); };
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
  const apis = {};

// draw around the circle in angle order, so a regrouped radar stays one ring
  const ringOrder = angs => MOT.map((_, i) => i).sort((a, b) => angs[a] - angs[b]);
  // the radar frame: axis wedges tinted by family (mix 0) or by inward/outward (mix 1)
  function frame(g, cx, cy, R, angs, mix, labels = true, fs = 15) {
    for (let i = 0; i < 12; i++) {
      const a = angs[i], fam = FAM[i >> 1];
      g.fillStyle = rgba(fam[1], .13 * (1 - mix)); g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R, a - TAU / 24, a + TAU / 24); g.closePath(); g.fill();
      g.fillStyle = rgba(INWARD(i) ? '#ffb951' : '#2ea3dc', .2 * mix); g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R, a - TAU / 24, a + TAU / 24); g.closePath(); g.fill();
    }
    g.strokeStyle = 'rgba(38,44,106,.16)'; g.lineWidth = 1;
    for (let r = 2; r <= 10; r += 2) { g.beginPath(); ringOrder(angs).forEach((i, n) => { const a = angs[i], x = cx + Math.cos(a) * R * r / 10, y = cy + Math.sin(a) * R * r / 10; n ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.stroke(); }
    angs.forEach(a => { g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); g.stroke(); });
    if (!labels) return;
    angs.forEach((a, i) => {
      const x = cx + Math.cos(a) * (R + 14), y = cy + Math.sin(a) * (R + 14), c = Math.cos(a);
      txt(g, MOT[i], x, y, `600 ${fs}px Jost, sans-serif`, mix > .5 ? (INWARD(i) ? '#9a5a06' : '#1d6f9a') : FAM[i >> 1][1], c > .25 ? 'left' : c < -.25 ? 'right' : 'center');
    });
  }
    const poly = (g, cx, cy, R, angs, vals) => { g.beginPath(); ringOrder(angs).forEach((i, n) => { const v = vals[i]; const x = cx + Math.cos(angs[i]) * R * v / 10, y = cy + Math.sin(angs[i]) * R * v / 10; n ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); };

  /* ---------- 1: the radar ---------- */
  canvasDemo('radar', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, mode: 0, mix: 0, on: [1, 1, 1, 1], mine: true, my: P.MY_GAME.slice(), axis: 3, drag: false, key: '' };
    const tourBtn = $(s, '.qr-tour'), sel = $(s, '.qr-axis'), val = $(s, '.qr-val'), mineIn = $(s, '.qr-mine');
    sel.innerHTML = MOT.map((m, i) => `<option value="${i}">My game: ${m}</option>`).join('');
    const free = () => { st.tour = false; tourBtn.classList.remove('on'); };
    $$(s, '.qr-group .btn').forEach(b => b.onclick = () => { free(); st.mode = +b.dataset.g; });
    $$(s, '.qr-des .btn').forEach(b => b.onclick = () => { free(); const d = +b.dataset.d; if (st.on[d] && st.on.reduce((a, x) => a + x, 0) === 1) return; st.on[d] = st.on[d] ? 0 : 1; });
    mineIn.onchange = () => { free(); st.mine = mineIn.checked; };
    sel.onchange = () => { free(); st.axis = +sel.value; };
    val.oninput = () => { free(); st.my[st.axis] = +val.value; st.mine = true; mineIn.checked = true; };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    const CX = 330, CY = 296, R = 200;
    let angs = MOT.map((_, i) => angOf(i));
    const pt = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height]; };
    function edit(e) {
      const [x, y] = pt(e), dx = x - CX, dy = y - CY, d = Math.hypot(dx, dy); if (d > R * 1.15) return false;
      const a = Math.atan2(dy, dx); let best = 0, bd = 9;
      angs.forEach((b, i) => { const k = Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))); if (k < bd) { bd = k; best = i; } });
      free(); st.mine = true; mineIn.checked = true; st.axis = best; st.my[best] = Math.round(clamp(d / R) * 10); return true;
    }
    cv.addEventListener('pointerdown', e => { if (edit(e)) { st.drag = true; cv.setPointerCapture?.(e.pointerId); } });
    cv.addEventListener('pointermove', e => { if (st.drag) edit(e); });
    cv.addEventListener('pointerup', () => { st.drag = false; });
    function render(dt) {
      let { mode, on, mine, mix } = st, my = st.my, nOn = 4, mineA = mine ? 1 : 0, axis = st.axis; const t = st.t;
      if (st.tour) {
        mode = t >= 8 && t < 16 ? 1 : 0; my = P.MY_GAME; axis = 3;
        nOn = clamp(Math.floor(t / 1) + 1, 1, 4); on = [0, 1, 2, 3].map(d => d < nOn ? 1 : 0);
        mineA = clamp((t - 4.5) / 1); mine = mineA > 0;
        mix = t < 8 ? 0 : t < 16 ? ease(clamp((t - 8) / 2)) : 1 - ease(clamp((t - 16) / 1.8));
        st.mix = mix;
      } else { st.mix += (mode - st.mix) * clamp((dt || 0) * 5); mix = st.mix; }
      sel.value = axis; val.value = my[axis]; $(s, '.qr-av').textContent = my[axis];
      mineIn.checked = mine;
      $$(s, '.qr-group .btn').forEach(b => b.classList.toggle('on', +b.dataset.g === mode));
      $$(s, '.qr-des .btn').forEach(b => b.classList.toggle('on', !!on[+b.dataset.d]));
      angs = MOT.map((_, i) => lerp(angOf(posOf(i, 0)), angOf(posOf(i, 1)), mix));
      const sets = [0, 1, 2, 3].filter(d => on[d]).map(d => vote(P.SKYRIM, d));
      const avg = MOT.map((_, i) => mean(sets.map(v => v[i]))), lo = MOT.map((_, i) => Math.min(...sets.map(v => v[i]))), hi = MOT.map((_, i) => Math.max(...sets.map(v => v[i])));
      T.use(g); panel(g);
      frame(g, CX, CY, R, angs, mix);
      // family / half labels
      g.save(); g.globalAlpha = 1 - mix;
      FAM.forEach(([name, col], f) => { const a = (angs[2 * f] + angs[2 * f + 1]) / 2, x = CX + Math.cos(a) * (R - 16), y = CY + Math.sin(a) * (R - 16);
        T.label(`${name} ${f1(mean([avg[2 * f], avg[2 * f + 1]]))}`, x, y, 'center', col, 12, 'rgba(255,252,244,.92)'); });
      g.restore();
      if (mix > .02) { g.save(); g.globalAlpha = mix;
        txt(g, 'INWARD', CX + R + 40, 36, '800 16px Montserrat, Jost, sans-serif', '#9a5a06', 'center');
        txt(g, 'own actions, growth, identity', CX + R + 40, 56, '600 13px Jost, sans-serif', '#9a5a06', 'center');
        txt(g, 'OUTWARD', CX - R - 40, 36, '800 16px Montserrat, Jost, sans-serif', '#1d6f9a', 'center');
        txt(g, 'external stimulus, content', CX - R - 40, 56, '600 13px Jost, sans-serif', '#1d6f9a', 'center');
        g.restore(); }
      // spread band (min to max) and the average
      if (sets.length > 1) {
        const ro = ringOrder(angs), at = (i, v) => [CX + Math.cos(angs[i]) * R * v / 10, CY + Math.sin(angs[i]) * R * v / 10];
        g.beginPath(); ro.forEach((i, n) => { const [x, y] = at(i, hi[i]); n ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath();
        ro.slice().reverse().forEach((i, n) => { const [x, y] = at(i, lo[i]); n ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath();
        g.fillStyle = 'rgba(38,44,106,.18)'; g.fill('evenodd');
      }
      poly(g, CX, CY, R, angs, avg); g.fillStyle = 'rgba(38,44,106,.12)'; g.fill(); g.strokeStyle = C.navy; g.lineWidth = 3.5; g.stroke();
      avg.forEach((v, i) => { g.fillStyle = C.navy; g.beginPath(); g.arc(CX + Math.cos(angs[i]) * R * v / 10, CY + Math.sin(angs[i]) * R * v / 10, 4, 0, TAU); g.fill(); });
      if (mineA > 0) {
        g.save(); g.globalAlpha = mineA; poly(g, CX, CY, R, angs, my); g.fillStyle = 'rgba(255,185,81,.22)'; g.fill(); g.strokeStyle = '#e08a00'; g.lineWidth = 3; g.setLineDash([9, 6]); g.stroke(); g.setLineDash([]);
        my.forEach((v, i) => { g.fillStyle = i === axis ? '#e5322d' : '#e08a00'; g.beginPath(); g.arc(CX + Math.cos(angs[i]) * R * v / 10, CY + Math.sin(angs[i]) * R * v / 10, i === axis ? 7 : 4.5, 0, TAU); g.fill(); });
        g.restore();
      }
      // the table
      const TX = 672, order = MOT.map((_, i) => i).sort((a, b) => posOf(a, mode) - posOf(b, mode));
      txt(g, 'Skyrim, scored 0-10 (estimates)', TX, 30, '800 16px Montserrat, Jost, sans-serif');
      ['D1', 'D2', 'D3', 'D4'].forEach((d, k) => txt(g, d, TX + 132 + k * 34, 58, '700 13px Jost, sans-serif', on[k] ? DES_COL[k] : 'rgba(93,97,140,.35)', 'center'));
      txt(g, 'avg', TX + 286, 58, '800 13px Jost, sans-serif', C.navy, 'center'); txt(g, 'mine', TX + 334, 58, '800 13px Jost, sans-serif', mineA > 0 ? '#c07000' : 'rgba(93,97,140,.35)', 'center');
      order.forEach((i, r) => {
        const y = 84 + r * 33 + (mode && r >= 6 ? 10 : 0);
        if (mode && r === 6) { g.strokeStyle = C.ink; g.lineWidth = 1.5; g.beginPath(); g.moveTo(TX, y - 21); g.lineTo(TX + 356, y - 21); g.stroke(); }
        g.fillStyle = mode ? (INWARD(i) ? '#ffb951' : '#2ea3dc') : FAM[i >> 1][1]; g.beginPath(); g.arc(TX + 6, y, 5, 0, TAU); g.fill();
        txt(g, MOT[i], TX + 18, y, '600 15px Jost, sans-serif', C.ink);
        [0, 1, 2, 3].forEach(d => txt(g, String(vote(P.SKYRIM, d)[i]), TX + 132 + d * 34, y, '500 15px Jost, sans-serif', on[d] ? C.ink : 'rgba(93,97,140,.3)', 'center'));
        txt(g, f1(avg[i]), TX + 286, y, '800 15px Montserrat, Jost, sans-serif', C.navy, 'center');
        txt(g, String(my[i]), TX + 334, y, '700 15px Jost, sans-serif', mineA > 0 ? (i === axis ? C.red : '#c07000') : 'rgba(93,97,140,.3)', 'center');
      });
      const yb = 84 + 12 * 33 + (mode ? 10 : 0);
      if (mode) { txt(g, `inward avg ${f1(mean(avg.filter((_, i) => INWARD(i))))} · outward avg ${f1(mean(avg.filter((_, i) => !INWARD(i))))}`, TX, yb, '700 14px Jost, sans-serif', C.ink); }
      else { g.fillStyle = 'rgba(38,44,106,.18)'; g.fillRect(TX, yb - 7, 18, 14); txt(g, 'spread: lowest to highest vote', TX + 26, yb, '500 14px Jost, sans-serif'); }
      g.strokeStyle = '#e08a00'; g.lineWidth = 3; g.setLineDash([9, 6]); g.beginPath(); g.moveTo(TX, yb + 24); g.lineTo(TX + 18, yb + 24); g.stroke(); g.setLineDash([]);
      txt(g, 'my game (drag on the radar to edit)', TX + 26, yb + 24, '500 14px Jost, sans-serif');

      const key = [mode, on.join(''), mine, my.join(',')].join('|'); if (key === st.key) return; st.key = key;
      const spread = MOT.map((_, i) => hi[i] - lo[i]), wide = spread.indexOf(Math.max(...spread));
      const gaps = MOT.map((_, i) => my[i] - avg[i]), gi = gaps.map(Math.abs).indexOf(Math.max(...gaps.map(Math.abs)));
      const inS = mean(avg.filter((_, i) => INWARD(i))), outS = mean(avg.filter((_, i) => !INWARD(i)));
      say($(s, '.qr-stats'), `<div class="y"><b>${f1(inS)} / ${f1(outS)}</b><span>Skyrim inward / outward average</span></div>`
        + `<div class="${sets.length > 1 ? '' : 'r'}"><b>${sets.length > 1 ? spread[wide] : '–'}</b><span>${sets.length > 1 ? `widest disagreement: ${MOT[wide]}` : 'one designer: no spread to see'}</span></div>`
        + (mine ? `<div class="g"><b>${gaps[gi] >= 0 ? '+' : '−'}${f1(Math.abs(gaps[gi]))}</b><span>my game vs Skyrim, biggest gap: ${MOT[gi]}</span></div>` : ''));
      say($(s, '.qr-out'), mode
        ? (Math.abs(inS - outS) < .6 ? `Regrouped, Skyrim is nearly even (${f1(inS)} inward vs ${f1(outS)} outward): who you become and the world it hands you carry equal weight. Look at the shape, not just the averages.` : `Regrouped, ${mine ? 'compare the halves: ' : ''}Skyrim leans ${inS > outS ? 'inward' : 'outward'} (${f1(inS)} vs ${f1(outS)}).`)
        : sets.length < 2
          ? 'One designer gives one opinion. Add voters: the average steadies and the band shows where the team disagrees.'
          : `${sets.length} designers, averaged. The band is widest on ${MOT[wide]}: that is the axis to talk through before trusting the number.`);
    }
    apis.radar = { seek(t) { st.held = st.tour = true; st.t = t; render(0); }, dur: () => 18 };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > 18) st.t = 0; render(dt); };
  });

  /* ---------- 2: vote how present, not how liked ---------- */
  const votes = (mode, game) => [0, 1, 2, 3].map(d => (mode ? like : vote)(game ? P.LOL : P.SKYRIM, d));
  const blend = (A, B, k) => A.map((row, d) => row.map((v, i) => lerp(v, B[d][i], k)));
  const avgOf = V => MOT.map((_, i) => mean(V.map(r => r[i])));
  canvasDemo('vote', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, mode: 0, game: 0, disp: votes(0, 0), key: '' };
    const tourBtn = $(s, '.vt-tour');
    const free = () => { st.tour = false; tourBtn.classList.remove('on'); };
    $$(s, '.vt-mode .btn').forEach(b => b.onclick = () => { free(); st.mode = +b.dataset.m; });
    $$(s, '.vt-game .btn').forEach(b => b.onclick = () => { free(); st.game = +b.dataset.g; });
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    const SEG = [[0, 0], [0, 1], [1, 0], [1, 1]];
    const angs = MOT.map((_, i) => angOf(i));
    function render(dt) {
      let { mode, game } = st, V; const t = st.t;
      if (st.tour) {
        const k = Math.min(3, Math.floor(t / 4)), f = t - k * 4, prev = SEG[(k + 3) % 4];
        [mode, game] = SEG[k];
        V = blend(votes(...prev), votes(mode, game), ease(clamp(f / 1)));
        st.disp = V;
      } else {
        const tgt = votes(mode, game); st.disp = blend(st.disp, tgt, clamp((dt || 0) * 6)); V = st.disp;
      }
      $$(s, '.vt-mode .btn').forEach(b => b.classList.toggle('on', +b.dataset.m === mode));
      $$(s, '.vt-game .btn').forEach(b => b.classList.toggle('on', +b.dataset.g === game));
      const avg = avgOf(V), other = avgOf(votes(mode, 1 - game));
      const names = ['Skyrim', 'League of Legends'];
      T.use(g); panel(g);
      txt(g, mode ? 'Voting on: how much I like it' : 'Voting on: how present it is', 30, 34, '800 20px Montserrat, Jost, sans-serif', mode ? C.redDk : C.ink);
      txt(g, `scoring ${names[game]} (course estimates)`, 30, 60, '600 15px Jost, sans-serif', C.muted);
      const CX = 255, CY = 318, R = 170;
      frame(g, CX, CY, R, angs, 0, true, 14);
      poly(g, CX, CY, R, angs, other); g.strokeStyle = 'rgba(93,97,140,.7)'; g.lineWidth = 2; g.setLineDash([6, 6]); g.stroke(); g.setLineDash([]);
      poly(g, CX, CY, R, angs, avg); g.fillStyle = 'rgba(38,44,106,.16)'; g.fill(); g.strokeStyle = C.navy; g.lineWidth = 3.5; g.stroke();
      txt(g, `solid: ${names[game]} · dashed: ${names[1 - game]}`, CX, 562, '600 14px Jost, sans-serif', C.muted, 'center');
      // dot plot
      const X0 = 640, X1 = 1010, xs = v => X0 + (X1 - X0) * v / 10;
      txt(g, 'Each designer\'s vote', X0 - 130, 70, '800 15px Montserrat, Jost, sans-serif');
      for (let v = 0; v <= 10; v += 2) { g.strokeStyle = 'rgba(38,44,106,.12)'; g.lineWidth = 1; g.beginPath(); g.moveTo(xs(v), 118); g.lineTo(xs(v), 520); g.stroke(); txt(g, v + '', xs(v), 532, '500 13px Jost, sans-serif', C.muted, 'center'); }
      MOT.forEach((m, i) => {
        const y = 134 + i * 32;
        txt(g, m, X0 - 14, y, '600 14px Jost, sans-serif', FAM[i >> 1][1], 'right');
        const vs = V.map(r => r[i]);
        g.strokeStyle = 'rgba(38,44,106,.3)'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(xs(Math.min(...vs)), y); g.lineTo(xs(Math.max(...vs)), y); g.stroke(); g.lineCap = 'butt';
        vs.forEach((v, d) => { g.fillStyle = DES_COL[d]; g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.beginPath(); g.arc(xs(v) + (d - 1.5) * 2, y, 6, 0, TAU); g.fill(); g.stroke(); });
        g.fillStyle = C.navy; g.fillRect(xs(avg[i]) - 1.5, y - 11, 3, 22);
      });
      ['D1', 'D2', 'D3', 'D4'].forEach((d, k) => { g.fillStyle = DES_COL[k]; g.beginPath(); g.arc(X0 + 10 + k * 60, 98, 6, 0, TAU); g.fill(); txt(g, d, X0 + 20 + k * 60, 98, '600 13px Jost, sans-serif'); });
      txt(g, '| average', X0 + 250, 98, '700 13px Jost, sans-serif', C.navy);

      const key = [mode, game].join(); if (key === st.key) return; st.key = key;
      const tgt = votes(mode, game), tAvg = avgOf(tgt), diff = mean(MOT.map((_, i) => Math.abs(tAvg[i] - other[i]))), sd = mean(MOT.map((_, i) => { const vs = tgt.map(r => r[i]); return Math.max(...vs) - Math.min(...vs); }));
      const pDiff = mean(MOT.map((_, i) => Math.abs(avgOf(votes(0, 0))[i] - avgOf(votes(0, 1))[i])));
      say($(s, '.vt-stats'), `<div class="${mode ? 'r' : 'g'}"><b>${f1(diff)}</b><span>average gap between the two games' radars, per axis</span></div>`
        + `<div class="${sd > 3 ? 'r' : ''}"><b>${f1(sd)}</b><span>average spread between the four designers</span></div>`);
      say($(s, '.vt-out'), mode
        ? `Voting on taste, Skyrim and League of Legends differ by only ${f1(diff)} points an axis (${f1(pDiff)} when voting on presence). The radar describes the team, not the game.`
        : `Voting on presence, the two games differ by ${f1(diff)} points an axis and the designers mostly agree. That is a radar you can compare against a competitor.`);
    }
    apis.vote = { seek(t) { st.held = st.tour = true; st.t = t; render(0); }, dur: () => 16 };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > 16) st.t = 0; render(dt); };
  });

  window.__seek = (t, w) => apis[w || 'radar'].seek(t);
  window.__dur = w => apis[w || 'radar'].dur();
})();
