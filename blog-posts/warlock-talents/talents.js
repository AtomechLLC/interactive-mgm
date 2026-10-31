/* Warlock talent trees (post-mortem: "The Core Fantasy: What Went Wrong in Warlock Talent Trees Along the Way").
   Written for readers who have never played World of Warcraft.
   Slide 1 (weigh): the same two talent choices, "tougher" (Demonology) and "stronger" (Destruction), played alone, in a
   group of five and in a raid of forty. How much each changes the outcome is illustrative, not measured: the post's
   point is the direction (survival is worth less as healing rises; small damage gains matter more as the group grows
   and players compare themselves on the damage chart).
   Slide 2 (cycle): Life Tap turns your own health into mana. Alone, every point of health you trade has to be won back
   later; with healers it is refilled for free, so the spend, trade, recover cycle shrinks to spend, trade.
   Both scenes are pure functions of time, so __seek is deterministic. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD, TAU = Math.PI * 2;
  const W = 1040, H = 585;
  const img = {}; const IC = n => { if (!img[n]) { const i = new Image(); i.src = `../img/${n}.jpg`; img[n] = i; } return img[n]; };
  const icon = (g, n, x, y, s) => { const i = IC(n); if (i.complete && i.naturalWidth) g.drawImage(i, x, y, s, s); };
  const LOCK = '#8a4fd6', TANK = '#5562eb', FIGHT = '#e08a2c', HEAL = '#2fae63';
  const scenes = {};

  function room(g) {
    g.save(); g.beginPath(); g.roundRect(10, 10, 600, 565, 14); g.clip(); T.floor(10, 10, 600, 565); g.restore();
    g.strokeStyle = '#cdbf9f'; g.lineWidth = 2; g.beginPath(); g.roundRect(10, 10, 600, 565, 14); g.stroke();
  }
  function panel(g, x0) { g.fillStyle = 'rgba(255,252,244,.92)'; g.beginPath(); g.roundRect(x0, 10, 400, 565, 14); g.fill(); }
  function wrap(g, text, x, y, w, lh) {
    let line = '';
    text.split(' ').forEach(wd => { if (line && g.measureText(line + wd).width > w) { g.fillText(line, x, y); y += lh; line = ''; } line += wd + ' '; });
    g.fillText(line, x, y); return y + lh;
  }
  function bar(g, x, y, w, h, v, col, back = '#e6dcc5') { g.fillStyle = back; g.fillRect(x, y, w, h); g.fillStyle = col; g.fillRect(x, y, w * clamp(v), h); }
  const you = (g, x, y, ang) => { T.player(x, y, ang, .8, 1, LOCK); g.strokeStyle = C.gold; g.lineWidth = 3; g.beginPath(); g.arc(x, y, 26, 0, TAU); g.stroke(); T.label('you, the warlock', x, y + 36, 'center', C.ink, 12, 'rgba(255,252,244,.85)'); };
  const blink = (u, every, len) => (u % every) < len ? 1 - (u % every) / len : 0;

  /* ---------- slide 1: what each talent is worth, by where you play ---------- */
  const CTX = [
    {
      id: 'alone', label: 'Alone', tough: .85, strong: .3, pick: 'Tougher',
      toughTxt: 'No one heals you, so you stop to rest after fights. More health means fewer stops.',
      strongTxt: 'Each fight ends a few seconds sooner. Nobody is keeping score.',
      note: 'Alone, staying alive is the limit, so the Demonology tree makes sense here.',
    },
    {
      id: 'group', label: 'Group of 5', tough: .45, strong: .55, pick: 'Either one',
      toughTxt: 'The one healer spends a little less on you when you get hit.',
      strongTxt: 'The group finishes each fight a little faster.',
      note: 'With one healer, both choices help a little.',
    },
    {
      id: 'raid', label: 'Raid of 40', tough: .04, strong: .95, pick: 'Stronger',
      toughTxt: 'Eight healers already refill you. It changes nothing you can see.',
      strongTxt: 'You climb from 14th to 9th on the damage chart, the list everyone checks after each fight.',
      note: 'This is why Demonology, the tree built around staying alive, was rarely seen in raids.',
    },
  ];
  const LEN1 = 9;

  // left scenes: return your health (0..1) so the bar under the scene can show it
  function sceneAlone(g, u) {
    const M = { x: 310, y: 190 }, Y = { x: 310, y: 390 };
    const resting = u > 6.3;
    const hpv = resting ? lerp(.3, 1, ease(clamp((u - 6.3) / 2.4))) : 1 - .7 * clamp(u / 6.3);
    if (!resting) {
      const k = (u % 1.4) / 1.4; T.tracer(lerp(Y.x, M.x, clamp(k * 2 - .4)), lerp(Y.y, M.y, clamp(k * 2 - .4)), lerp(Y.x, M.x, clamp(k * 2)), lerp(Y.y, M.y, clamp(k * 2)), 1, LOCK, 6);
    }
    T.foe(M.x, M.y, 34, Math.PI / 2, '#7a4a3a', { edge: C.navy, mark: 'horns', hp: resting ? 0 : 100 - 14 * u, hpMax: 100, a: resting ? .25 : 1 });
    T.label('a monster', M.x + 46, M.y, 'left', C.ink, 12, 'rgba(255,252,244,.8)');
    if (!resting) T.flash(Y.x, Y.y, 34, .8 * blink(u, 1.6, .5));
    you(g, Y.x, Y.y, -Math.PI / 2);
    if (resting) { icon(g, 'inv_drink_06', Y.x + 40, Y.y - 60, 34); T.label('resting: no one else can heal you', Y.x, Y.y - 80, 'center', C.red, 13); }
    else T.label('you take every hit yourself', Y.x, 300, 'center', C.ink, 13);
    return hpv;
  }
  function sceneGroup(g, u) {
    const M = { x: 310, y: 150 };
    const P = [{ x: 310, y: 235, col: TANK, n: 'tank' }, { x: 200, y: 260, col: FIGHT, n: 'fighter' }, { x: 430, y: 330, col: C.player, n: 'archer' }, { x: 310, y: 490, col: HEAL, n: 'healer' }];
    const Y = { x: 190, y: 380 };
    const hit = blink(u, 3, .6), healA = blink((u + 2.4) % 3, 3, .9);
    T.foe(M.x, M.y, 40, Math.PI / 2, '#7a4a3a', { edge: C.navy, mark: 'horns' });
    T.label('a dungeon boss', M.x, M.y - 70, 'center', C.ink, 12, 'rgba(255,252,244,.8)');
    // the healer keeps the tank topped up, and you after a stray hit
    T.tracer(P[3].x, P[3].y, P[0].x, P[0].y, .35 + .3 * Math.sin(u * 5), HEAL, 4);
    if (healA) T.tracer(P[3].x, P[3].y, Y.x, Y.y, healA, HEAL, 5);
    P.forEach(p => { T.player(p.x, p.y, Math.atan2(M.y - p.y, M.x - p.x), .7, 1, p.col); T.label(p.n, p.x, p.y + 28, 'center', C.muted, 11, 'rgba(255,252,244,.75)'); });
    T.flash(Y.x, Y.y, 34, .8 * hit);
    you(g, Y.x, Y.y, Math.atan2(M.y - Y.y, M.x - Y.x));
    const ph = u % 3; return ph < 1.4 ? 1 - .25 * clamp(ph / .4) : lerp(.75, 1, clamp((ph - 1.4) / .8));
  }
  // raid layout: 2 tanks, 10 fighters, 20 ranged, 8 healers; you are one of the ranged
  const RAID = (() => {
    const out = [], B = { x: 380, y: 120 };
    [-1, 1].forEach(s => out.push({ x: B.x + s * 26, y: B.y + 62, col: TANK }));
    for (let i = 0; i < 10; i++) { const a = Math.PI * (.12 + .76 * i / 9); out.push({ x: B.x + Math.cos(a) * 105, y: B.y + Math.sin(a) * 105, col: FIGHT }); }
    for (let r = 0; r < 2; r++) for (let i = 0; i < 10; i++) out.push({ x: 175 + i * 46 + r * 20, y: 300 + r * 52, col: C.player });
    for (let i = 0; i < 8; i++) out.push({ x: 215 + i * 50, y: 460, col: HEAL, healer: true });
    return out;
  })();
  const YOU_R = 26; // index into RAID (second ranged row)
  function sceneRaid(g, u) {
    const B = { x: 380, y: 120 }, Y = RAID[YOU_R];
    T.foe(B.x, B.y, 46, Math.PI / 2, '#5a3a5a', { edge: C.navy, mark: 'horns' });
    T.label('a raid boss', B.x + 76, B.y - 30, 'left', C.ink, 12, 'rgba(255,252,244,.8)');
    // a storm of heals: every healer always has a target
    RAID.forEach((p, i) => { if (!p.healer) return; for (let j = 0; j < 3; j++) { const tgt = RAID[(i * 7 + j * 11 + Math.floor(u * 2.5 + j)) % 32]; T.tracer(p.x, p.y, tgt.x, tgt.y, .22, HEAL, 3); } });
    T.tracer(RAID[34].x, RAID[34].y, Y.x, Y.y, .5 + .4 * Math.sin(u * 7), HEAL, 4);
    RAID.forEach((p, i) => { if (i !== YOU_R) T.player(p.x, p.y, Math.atan2(B.y - p.y, B.x - p.x), .5, 1, p.col); });
    T.player(Y.x, Y.y, Math.atan2(B.y - Y.y, B.x - Y.x), .6, 1, LOCK); g.strokeStyle = C.gold; g.lineWidth = 3; g.beginPath(); g.arc(Y.x, Y.y, 20, 0, TAU); g.stroke();
    T.label('you', Y.x, Y.y + 28, 'center', C.ink, 12, 'rgba(255,252,244,.85)');
    T.label('8 healers', 390, 500, 'center', HEAL, 12, 'rgba(255,252,244,.85)');
    // the damage chart everyone checks
    const x = 22, y = 24, rows = [['7 Ava', .98], ['8 Kiro', .95], ['9 you', .93], ['10 Moss', .9], ['11 Juno', .88], ['12 Tess', .86]];
    g.fillStyle = 'rgba(255,252,244,.92)'; g.beginPath(); g.roundRect(x, y, 170, 150, 10); g.fill();
    g.font = '600 12px Jost, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillStyle = C.muted; g.fillText('the damage chart', x + 10, y + 18);
    rows.forEach(([n, v], i) => { const yy = y + 30 + i * 19, me = n.endsWith('you'); bar(g, x + 60, yy, 98, 12, v, me ? LOCK : '#b9b0d0', 'rgba(0,0,0,0)'); g.fillStyle = me ? C.ink : C.muted; g.font = `${me ? 700 : 500} 12px Jost, sans-serif`; g.fillText(n, x + 10, yy + 10); });
    return 1 - .05 * blink(u, 1.1, .5);
  }

  function drawWeigh(g, ci, u) {
    T.use(g); g.clearRect(0, 0, W, H); room(g);
    const cx = CTX[ci];
    const hpv = [sceneAlone, sceneGroup, sceneRaid][ci](g, u);
    // your health, under the scene
    g.fillStyle = 'rgba(255,252,244,.9)'; g.beginPath(); g.roundRect(100, 528, 420, 36, 10); g.fill();
    g.font = '600 13px Jost, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillStyle = C.ink; g.fillText('your health', 112, 551);
    bar(g, 196, 539, 310, 14, hpv, hpv < .4 ? C.red : HEAL);
    // right: the two choices
    const x0 = 630; panel(g, x0); g.textAlign = 'left';
    g.font = '600 13px Jost, sans-serif'; g.fillStyle = C.muted; g.fillText(`WHERE YOU PLAY: ${cx.label.toUpperCase()}`, x0 + 18, 36);
    g.font = '800 17px Montserrat, Jost, sans-serif'; g.fillStyle = C.ink; g.fillText('Two talents, same price', x0 + 18, 60);
    const grow = ease(clamp(u / 1.2));
    [['Tougher', 'spell_shadow_metamorphosis', '+15% health, a sturdier demon pet (Demonology)', cx.tough, cx.toughTxt, '#5562eb'],
     ['Stronger', 'spell_shadow_rainoffire', '+5% damage (Destruction)', cx.strong, cx.strongTxt, LOCK]].forEach(([nm, ic, sub, v, txt, col], i) => {
      const y = 78 + i * 170;
      g.strokeStyle = cx.pick === nm ? C.gold : '#e3d8bf'; g.lineWidth = cx.pick === nm ? 3 : 2; g.beginPath(); g.roundRect(x0 + 12, y, 376, 158, 10); g.stroke();
      icon(g, ic, x0 + 24, y + 12, 40);
      g.font = '800 17px Montserrat, Jost, sans-serif'; g.fillStyle = C.ink; g.fillText(nm, x0 + 76, y + 30);
      g.font = '500 12px Jost, sans-serif'; g.fillStyle = C.muted; g.fillText(sub, x0 + 76, y + 48);
      g.font = '600 12px Jost, sans-serif'; g.fillStyle = C.muted; g.fillText('how much it changes here', x0 + 24, y + 76);
      bar(g, x0 + 24, y + 84, 350, 14, v * grow, col);
      g.font = '500 14px Jost, sans-serif'; g.fillStyle = C.ink; wrap(g, txt, x0 + 24, y + 122, 350, 19);
    });
    g.font = '600 13px Jost, sans-serif'; g.fillStyle = C.muted; g.fillText('What players pick here', x0 + 18, 438);
    g.font = '800 30px Montserrat, Jost, sans-serif'; g.fillStyle = C.ink; g.fillText(cx.pick, x0 + 18, 474);
    g.font = '500 14px Jost, sans-serif'; g.fillStyle = C.ink; wrap(g, cx.note, x0 + 18, 506, 360, 19);
  }

  canvasDemo('weigh', (s, cv, g) => {
    const st = { t: 0, tour: true, held: false, ci: 0, u: 0, key: '' };
    const seg = $(s, '.wt-ctx'), tourBtn = $(s, '.wt-tour');
    seg.innerHTML = CTX.map((c, i) => `<button class="btn" data-i="${i}">${c.label}</button>`).join('');
    const btns = $$(seg, '.btn');
    btns.forEach((b, i) => b.onclick = () => { st.tour = false; tourBtn.classList.remove('on'); st.ci = i; st.u = 0; });
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    function frame() {
      if (st.tour) { st.ci = Math.floor(st.t / LEN1) % CTX.length; st.u = st.t % LEN1; }
      drawWeigh(g, st.ci, st.u); btns.forEach((b, i) => b.classList.toggle('on', i === st.ci));
      if (st.key === CTX[st.ci].id) return; st.key = CTX[st.ci].id;
      say($(s, '.wt-out'), ['Alone, the price of a talent is paid in time spent resting.', 'In a small group, the healer covers some of it.', 'In a big raid, healers cover everything, and the damage chart decides.'][st.ci]);
    }
    const DUR = LEN1 * CTX.length;
    scenes.weigh = { seek(t) { st.held = true; st.tour = true; st.t = t; frame(); }, dur: () => DUR };
    return dt => { if (st.held) return; dt = Math.max(0, dt); if (st.tour) { st.t = (st.t + dt) % DUR; } else st.u = (st.u + dt) % LEN1; frame(); };
  });

  /* ---------- slide 2: Life Tap, the price that disappeared ---------- */
  // one step of the warlock's routine: [kind, seconds, health change, mana change]
  const STEP = { spend: ['spend mana on spells', LOCK], trade: ['trade health for mana', C.red], recover: ['win health back', HEAL] };
  const ALONE = [['spend', 2, 0, -.25], ['spend', 2, 0, -.25], ['trade', 1.2, -.3, .45], ['spend', 2, 0, -.25], ['spend', 2, 0, -.25], ['trade', 1.2, -.3, .45], ['recover', 4, .55, -.05], ['spend', 2, 0, -.25], ['trade', 1.2, -.3, .45], ['recover', 2.4, .35, -.05]];
  const RAIDED = [['spend', 2, 0, -.25], ['spend', 2, 0, -.25], ['trade', 1.2, -.3, .5], ['spend', 2, 0, -.25], ['spend', 2, 0, -.25], ['trade', 1.2, -.3, .5], ['spend', 2, 0, -.25], ['spend', 2, 0, -.25], ['trade', 1.2, -.3, .5], ['spend', 2, 0, -.25], ['spend', 2, 0, -.25], ['trade', 1.2, -.3, .5]];
  const len = seq => seq.reduce((a, s) => a + s[1], 0);
  // state at time t; with healers, any missing health is refilled over about a second
  function stateAt(seq, t, healed) {
    let hp = 1, mp = 1, at = 0;
    for (const [k, d, dh, dm] of seq) {
      const f = clamp((t - at) / d);
      if (f <= 0) break;
      mp = clamp(mp + dm * f); hp = clamp(hp + dh * f);
      if (healed && k === 'trade' && f >= 1) hp = clamp(hp + .3 * clamp((t - at - d) / 1));
      if (f < 1) break;
      at += d;
    }
    return { hp, mp };
  }
  function current(seq, t) { let at = 0; for (let i = 0; i < seq.length; i++) { if (t < at + seq[i][1]) return { i, at }; at += seq[i][1]; } return { i: seq.length - 1, at }; }
  const share = (seq, k) => seq.filter(s => s[0] === k).reduce((a, s) => a + s[1], 0) / len(seq);
  const CYC = 21.6;

  function drawCycle(g, healed, t) {
    T.use(g); g.clearRect(0, 0, W, H); room(g);
    const seq = healed ? RAIDED : ALONE, L = len(seq), tt = t % L;
    const { i } = current(seq, tt), step = seq[i], st = stateAt(seq, tt, healed);
    // the scene: you, a target, and (with healers) a healer behind you
    const Y = { x: 200, y: 300 }, M = { x: 440, y: 190 }, Hh = { x: 80, y: 380 };
    T.foe(M.x, M.y, 38, Math.PI * .8, '#5a3a5a', { edge: C.navy, mark: 'horns' });
    if (step[0] === 'spend') { const k = ((tt % 2) / 2); T.tracer(lerp(Y.x, M.x, clamp(k * 2 - .4)), lerp(Y.y, M.y, clamp(k * 2 - .4)), lerp(Y.x, M.x, clamp(k * 2)), lerp(Y.y, M.y, clamp(k * 2)), 1, LOCK, 6); }
    if (step[0] === 'trade') { T.flash(Y.x, Y.y, 40, .7); }
    if (step[0] === 'recover') { const k = (tt * 1.5) % 1; for (let j = 0; j < 3; j++) { const kk = (k + j / 3) % 1; g.fillStyle = `rgba(47,174,99,${1 - kk})`; g.beginPath(); g.arc(lerp(M.x, Y.x, kk), lerp(M.y, Y.y, kk) + Math.sin(kk * 9) * 8, 6, 0, TAU); g.fill(); } }
    if (healed) { T.player(Hh.x, Hh.y, -Math.PI / 4, .7, 1, HEAL); T.label('a healer', Hh.x, Hh.y + 28, 'center', C.muted, 11, 'rgba(255,252,244,.75)'); if (st.hp < .999) T.tracer(Hh.x, Hh.y, Y.x, Y.y, .8, HEAL, 6); }
    you(g, Y.x, Y.y, Math.atan2(M.y - Y.y, M.x - Y.x));
    icon(g, { spend: 'spell_shadow_shadowbolt', trade: 'spell_shadow_burningspirit', recover: 'spell_shadow_lifedrain02' }[step[0]], Y.x - 20, Y.y - 92, 40);
    T.label(STEP[step[0]][0], Y.x, Y.y - 112, 'center', STEP[step[0]][1], 13);
    // big health and mana bars
    const bx = 420, by = 300;
    [['health', st.hp, st.hp < .4 ? C.red : HEAL], ['mana (fuel for spells)', st.mp, '#3d7fe0']].forEach(([n, v, col], j) => {
      g.font = '600 13px Jost, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillStyle = C.ink; g.fillText(n, bx - 30, by + j * 56);
      bar(g, bx - 30, by + 8 + j * 56, 170, 18, v, col);
    });
    // the routine as a strip of blocks
    const sx = 30, sw = 560, sy = 470, scale = sw / CYC;
    g.fillStyle = 'rgba(255,252,244,.9)'; g.beginPath(); g.roundRect(sx - 10, sy - 30, sw + 20, 96, 10); g.fill();
    g.font = '600 13px Jost, sans-serif'; g.fillStyle = C.muted; g.fillText('your routine, second by second', sx, sy - 12);
    let at = 0; seq.forEach(([k, d]) => { g.fillStyle = STEP[k][1]; g.globalAlpha = at <= tt ? 1 : .35; g.fillRect(sx + at * scale + 1, sy, d * scale - 2, 22); at += d; }); g.globalAlpha = 1;
    g.fillStyle = C.navy; g.fillRect(sx + tt * scale - 1, sy - 4, 3, 30);
    let lx = sx; Object.entries(STEP).forEach(([k, [n, col]]) => { if (healed && k === 'recover') return; g.fillStyle = col; g.fillRect(lx, sy + 36, 12, 12); g.fillStyle = C.ink; g.font = '500 13px Jost, sans-serif'; g.fillText(n, lx + 18, sy + 47); lx += g.measureText(n).width + 44; });
    // right panel
    const x0 = 630; panel(g, x0); g.textAlign = 'left';
    g.font = '600 13px Jost, sans-serif'; g.fillStyle = healed ? C.good : C.red; g.fillText(healed ? 'WITH HEALERS: a raid' : 'WITHOUT HEALERS: playing alone', x0 + 18, 36);
    icon(g, 'spell_shadow_burningspirit', x0 + 18, 50, 44);
    g.font = '800 18px Montserrat, Jost, sans-serif'; g.fillStyle = C.ink; g.fillText('Life Tap', x0 + 74, 70);
    g.font = '500 13px Jost, sans-serif'; g.fillStyle = C.muted; g.fillText('turn your own health into mana', x0 + 74, 90);
    g.font = '500 16px Jost, sans-serif'; g.fillStyle = C.ink;
    const y = wrap(g, healed
      ? 'Healers refill the health you trade almost at once. The trade costs nothing, so the routine shrinks to spend, trade, spend. The recovery step is gone.'
      : 'Alone, the trade has a price. Every bit of health you turn into mana has to be won back later, and that time is not spent attacking.', x0 + 18, 136, 360, 24);
    g.font = '600 14px Jost, sans-serif'; g.fillStyle = C.muted; g.fillText('Time spent attacking', x0 + 18, 330);
    g.font = '800 34px Montserrat, Jost, sans-serif'; g.fillStyle = C.ink; g.fillText(`${Math.round(share(seq, 'spend') * 100)}%`, x0 + 18, 370);
    g.font = '500 14px Jost, sans-serif'; g.fillStyle = C.ink;
    wrap(g, healed
      ? 'The class was balanced around this version. The all-out pace that was meant to cost you became the normal pace.'
      : 'This was the warlock’s intended rhythm: push hard, pay for it, recover.', x0 + 18, 410, 360, 20);
  }

  canvasDemo('cycle', (s, cv, g) => {
    const st = { t: 0, tour: true, held: false, healed: false, u: 0, key: '' };
    const btns = $$(s, '.cy-heal .btn'), tourBtn = $(s, '.cy-tour');
    btns.forEach(b => b.onclick = () => { st.tour = false; tourBtn.classList.remove('on'); st.healed = b.dataset.v === 'on'; st.u = 0; });
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    function frame() {
      if (st.tour) { st.healed = Math.floor(st.t / CYC) % 2 === 1; st.u = st.t % CYC; }
      drawCycle(g, st.healed, st.u); btns.forEach(b => b.classList.toggle('on', (b.dataset.v === 'on') === st.healed));
      const key = String(st.healed); if (key === st.key) return; st.key = key;
      say($(s, '.cy-out'), st.healed ? 'With healers, the red trades never need paying back.' : 'Alone, every red trade is followed by green time spent recovering.');
    }
    scenes.cycle = { seek(t) { st.held = true; st.tour = true; st.t = t; frame(); }, dur: () => CYC * 2 };
    return dt => { if (st.held) return; dt = Math.max(0, dt); if (st.tour) st.t = (st.t + dt) % (CYC * 2); else st.u = (st.u + dt) % CYC; frame(); };
  });

  window.__seek = (t, which = 'weigh') => scenes[which].seek(t);
  window.__dur = (which = 'weigh') => scenes[which].dur();
})();
