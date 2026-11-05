/* The murder bears (Module 8, Part 5, slides 197-199).
   Slide 1: a player walks up to an Elder Brown Bear on Bloodmyst Isle. With attack speed 1000 (milliseconds between
   attacks) the bear hits once a second; with 1 it hits a thousand times a second and the player drops on contact.
   Slide 2: Val'anyr's absorb shield, cap 2,000 typed as 20,000. Under boss damage the shield never nears either cap,
   so the one-order error hid; an order-of-magnitude ruler sets it beside the bears' three-order error.
   Each frame is a pure function of t, so __seek is deterministic. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD, TAU = Math.PI * 2;
  const W = 1040, H = 585;
  const img = {};
  ['ability_hunter_pet_bear', 'inv_mace_99', 'spell_holy_powerwordshield'].forEach(n => { const i = new Image(); i.src = `img/${n}.jpg`; img[n] = i; });
  const icon = (g, n, x, y, s) => { const i = img[n]; if (i && i.complete && i.naturalWidth) g.drawImage(i, x, y, s, s); };
  const panel = g => { g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(255,252,244,.9)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill(); };
  const txt = (g, s, x, y, o = {}) => { g.font = o.font || '600 15px Jost, sans-serif'; g.fillStyle = o.col || C.ink; g.textAlign = o.align || 'left'; g.textBaseline = o.base || 'middle'; g.fillText(s, x, y); };
  const fmt = n => Math.round(n).toLocaleString('en-US');

  /* ---------- slide 1: the bears ---------- */
  const P_HP = 600, B_HIT = 52, WALK = 2.2, FX = 20, FY = 20, FW = 600, FH = 545;
  const hitsBy = (A, rt) => rt < WALK ? 0 : Math.floor((rt - WALK) * 1000 / A + 1e-9) + 1;
  const NEED = Math.ceil(P_HP / B_HIT);
  const deathAt = A => WALK + (NEED - 1) * A / 1000;
  function ground(g) {
    g.save(); g.beginPath(); g.roundRect(FX, FY, FW, FH, 12); g.clip();
    g.fillStyle = '#c9a9b8'; g.fillRect(FX, FY, FW, FH);
    // Bloodmyst's red-violet grass, drawn as soft tufts on a fixed pattern
    for (let i = 0; i < 90; i++) { const x = FX + (i * 137.5) % FW, y = FY + (i * 71.3 + (i % 7) * 31) % FH; g.fillStyle = i % 3 ? 'rgba(150,60,90,.16)' : 'rgba(110,40,80,.22)'; g.beginPath(); g.ellipse(x, y, 26 + (i % 5) * 6, 10 + (i % 3) * 4, 0, 0, TAU); g.fill(); }
    // a few crystal shards
    [[110, 120], [520, 90], [560, 470], [90, 470], [330, 500]].forEach(([x, y], k) => { g.fillStyle = k % 2 ? '#d34a6f' : '#b02a58'; g.beginPath(); g.moveTo(x, y - 34); g.lineTo(x + 12, y); g.lineTo(x, y + 8); g.lineTo(x - 12, y); g.closePath(); g.fill(); g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.moveTo(x, y - 34); g.lineTo(x + 4, y - 4); g.lineTo(x, y + 4); g.closePath(); g.fill(); });
    g.restore();
    txt(g, 'Bloodmyst Isle', FX + 16, FY + 22, { font: '700 14px Montserrat, Jost, sans-serif', col: '#5a1f3a' });
  }
  function drawBears(g, A, rt, ed) {
    T.use(g); panel(g); ground(g);
    const bx = 470, by = 300, sx = 90, ex = bx - 100;
    const k = clamp(rt / WALK), px = lerp(sx, ex, ease(k)), py = by + Math.sin(k * 6) * 4 * (1 - k);
    const hits = hitsBy(A, rt), dead = rt >= deathAt(A), shown = Math.min(hits, NEED), hp = Math.max(0, P_HP - shown * B_HIT);
    // aggro radius
    T.zone(bx, by, 120, rt < WALK ? .6 : .25);
    // bear
    T.foe(bx, by, 42, Math.PI, '#8a5a3a', { edge: '#4a2c18' });
    g.save(); g.beginPath(); g.arc(bx, by, 32, 0, TAU); g.clip(); icon(g, 'ability_hunter_pet_bear', bx - 32, by - 32, 64); g.restore();
    T.hp(bx, by - 62, 80, 1, 1);
    txt(g, 'Elder Brown Bear', bx, by + 64, { font: '700 15px Montserrat, Jost, sans-serif', align: 'center' });
    // swipes: one flash per hit at 1000 ms, a constant blur of claws at 1 ms
    if (rt >= WALK) {
      const since = A >= 60 ? ((rt - WALK) * 1000 % A) / 1000 : (rt - WALK) % .06;
      const a = A >= 60 ? clamp(1 - since / .25) : (dead && rt - deathAt(A) > .5 ? 0 : 1);
      if (a > 0) { g.save(); g.globalAlpha = a; g.strokeStyle = C.red; g.lineWidth = 5; g.lineCap = 'round'; for (let j = -1; j <= 1; j++) { g.beginPath(); g.moveTo(px + 26, py - 26 + j * 14); g.lineTo(px - 10, py - 6 + j * 14); g.stroke(); } g.restore(); }
    }
    // player
    if (!dead) T.player(px, py, 0); else { g.save(); g.globalAlpha = .55; T.player(px, py + 6, Math.PI / 2); g.restore(); }
    T.hp(px, py - 40, 70, hp, P_HP);
    if (rt >= WALK && A >= 60 && !dead) { const since = ((rt - WALK) * 1000 % A) / 1000; T.popText('-' + B_HIT, px, py - 62 - since * 50, C.red, clamp(1 - since / .7)); }
    if (dead) T.stamp('You die.', px + 30, py - 110, C.red, clamp((rt - deathAt(A)) / .2), 30);
    // combat log
    const lx = FX + 14, ly = FY + FH - 150;
    g.fillStyle = 'rgba(21,32,68,.82)'; g.beginPath(); g.roundRect(lx, ly, 290, 136, 8); g.fill();
    txt(g, 'combat log', lx + 12, ly + 16, { font: '700 12px Montserrat, Jost, sans-serif', col: '#9fa6d6' });
    const lines = [];
    for (let i = Math.max(1, shown - 4); i <= shown; i++) {
      const at = WALK + (i - 1) * A / 1000;
      lines.push(`${(at - WALK).toFixed(A < 10 ? 3 : 1)}s  Elder Brown Bear hits you for ${B_HIT}.`);
    }
    if (dead) lines.push('You die.');
    lines.slice(-5).forEach((l, i) => txt(g, l, lx + 12, ly + 38 + i * 20, { font: '500 13px Jost, sans-serif', col: l === 'You die.' ? '#ff8a80' : '#fbfbfd' }));
    // editor card
    const ex0 = 640, ey0 = 20;
    g.fillStyle = '#efe6d2'; g.beginPath(); g.roundRect(ex0, ey0, 380, 330, 12); g.fill();
    txt(g, 'Creature editor', ex0 + 18, ey0 + 26, { font: '800 18px Montserrat, Jost, sans-serif' });
    icon(g, 'ability_hunter_pet_bear', ex0 + 18, ey0 + 50, 48);
    txt(g, 'Elder Brown Bear', ex0 + 78, ey0 + 64, { font: '700 16px Montserrat, Jost, sans-serif' });
    txt(g, 'Bloodmyst Isle', ex0 + 78, ey0 + 86, { font: '500 14px Jost, sans-serif', col: C.muted });
    const field = (y, name, val, hot, caret) => {
      txt(g, name, ex0 + 18, y + 18, { font: '600 15px Jost, sans-serif', col: C.muted });
      g.fillStyle = '#fffaf0'; g.strokeStyle = hot ? C.red : '#cdbf9f'; g.lineWidth = hot ? 3 : 2; g.beginPath(); g.roundRect(ex0 + 210, y, 150, 36, 6); g.fill(); g.stroke();
      txt(g, val, ex0 + 222, y + 19, { font: '700 18px Montserrat, Jost, sans-serif', col: hot ? C.red : C.ink });
      if (caret) { g.font = '700 18px Montserrat, Jost, sans-serif'; const w = g.measureText(val).width; g.fillStyle = C.ink; g.fillRect(ex0 + 224 + w, y + 8, 2, 22); }
    };
    field(ey0 + 120, 'health', '1,100', false);
    field(ey0 + 166, 'damage per hit', String(B_HIT), false);
    field(ey0 + 212, 'attack speed (ms)', ed.text, ed.hot, ed.caret);
    txt(g, `= ${A >= 1000 ? (1000 / A).toFixed(A === 1000 ? 0 : 2) : fmt(1000 / A)} attack${A === 1000 ? '' : 's'} per second`, ex0 + 360, ey0 + 268, { font: '700 15px Jost, sans-serif', col: A < 100 ? C.red : C.goldInk, align: 'right' });
    txt(g, 'The field counts milliseconds between attacks.', ex0 + 18, ey0 + 304, { font: '500 14px Jost, sans-serif', col: C.muted });
    // outcome card
    const oy = 370;
    g.fillStyle = '#efe6d2'; g.beginPath(); g.roundRect(ex0, oy, 380, 195, 12); g.fill();
    txt(g, 'After contact', ex0 + 18, oy + 26, { font: '800 18px Montserrat, Jost, sans-serif' });
    const dt = deathAt(A) - WALK;
    txt(g, 'time to drop the player', ex0 + 18, oy + 66, { font: '600 15px Jost, sans-serif', col: C.muted });
    txt(g, dt >= 1 ? `${dt.toFixed(1)} s` : `${(dt * 1000).toFixed(0)} ms`, ex0 + 360, oy + 66, { font: '800 22px Montserrat, Jost, sans-serif', col: dt < 1 ? C.red : C.ink, align: 'right' });
    txt(g, 'frames at 60 fps', ex0 + 18, oy + 106, { font: '600 15px Jost, sans-serif', col: C.muted });
    const fr = dt * 60;
    txt(g, fr < 1 ? 'less than one' : fmt(fr), ex0 + 360, oy + 106, { font: '800 22px Montserrat, Jost, sans-serif', col: fr < 1 ? C.red : C.ink, align: 'right' });
    txt(g, 'one wrong field, off by', ex0 + 18, oy + 146, { font: '600 15px Jost, sans-serif', col: C.muted });
    const off = 1000 / A;
    txt(g, A === 1000 ? 'nothing' : `${off >= 1 ? fmt(off) : off.toFixed(2)}x`, ex0 + 360, oy + 146, { font: '800 22px Montserrat, Jost, sans-serif', col: A < 100 ? C.red : C.ink, align: 'right' });
  }
  // walk-through: the intended pull, the edit, the shipped pull
  const BDUR = 21;
  function bTour(t) {
    if (t < 8) return { A: 1000, rt: t, ed: { text: '1000', hot: false, caret: false }, cap: 'Attack speed 1000: one attack every 1000 milliseconds, one per second. The player trades blows and has time to react.' };
    if (t < 11) { const n = t < 8.8 ? 4 : t < 9.4 ? 3 : t < 10 ? 2 : 1; return { A: 1000, rt: 8, ed: { text: '1000'.slice(0, n), hot: true, caret: (t * 3) % 1 < .6 }, cap: 'Someone enters 1 instead of 1000. The field still reads milliseconds between attacks.' }; }
    const rt = t - 11;
    return { A: 1, rt, ed: { text: '1', hot: true, caret: false }, cap: rt < WALK ? 'Same bear, same walk.' : rt < 5 ? 'Attack speed 1 means a thousand attacks a second. The player drops on contact, before a single frame is drawn.' : 'Three orders of magnitude will be noticed every single time. Also: test your work.' };
  }
  const scenes = {};
  canvasDemo('bears', (s, cv, g) => {
    const st = { A: 1000, rt: 0, tour: true, held: false, t: 0, key: '' };
    const tourBtn = $(s, '.mb-tour'), segs = $$(s, '.mb-seg .btn'), rng = $(s, '.mb-a');
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); } };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    const setA = a => { st.A = a; st.rt = 0; };
    segs.forEach(b => b.onclick = () => { manual(); setA(+b.dataset.a); });
    rng.oninput = () => { manual(); setA(Math.max(1, Math.round(Math.pow(10, +rng.value)))); };
    $(s, '.mb-replay').onclick = () => { manual(); st.rt = 0; };
    function info(A, cap) {
      const key = A + cap; if (key === st.key) return; st.key = key;
      segs.forEach(b => b.classList.toggle('on', +b.dataset.a === A)); rng.value = Math.log10(A); $(s, '.mb-av').textContent = A;
      const dt = deathAt(A) - WALK;
      say($(s, '.mb-stats'), `<div class="${A < 100 ? 'r' : 'g'}"><b>${A >= 1000 ? (1000 / A).toFixed(A === 1000 ? 0 : 2) : fmt(1000 / A)}</b><span>bear attacks per second</span></div><div class="${dt < 1 ? 'r' : ''}"><b>${dt >= 1 ? dt.toFixed(1) + 's' : (dt * 1000).toFixed(0) + 'ms'}</b><span>from contact to a dead player (${P_HP} health)</span></div>`);
      say($(s, '.mb-out'), cap);
    }
    const capFor = A => A >= 1000 ? 'Attack speed 1000: one attack per second, as intended. Try 1, or slide the field down and watch where the fight stops being a fight.'
      : A >= 200 ? 'Faster, but still a fight the player can read.' : A >= 20 ? 'Now the bear out-damages any reaction. This is a tuning problem, but at least someone would notice it.' : 'A thousand attacks a second, near enough. Nobody survives contact, so this is found on the first pull. Test your work.';
    scenes.bears = { seek(t) { st.held = true; const f = bTour(t); drawBears(g, f.A, f.rt, f.ed); info(f.A, f.cap); }, dur: () => BDUR };
    return dt => {
      if (st.held) return;
      st.t += Math.max(0, dt); st.rt += Math.max(0, dt);
      if (st.tour) { if (st.t >= BDUR) st.t = 0; const f = bTour(st.t); drawBears(g, f.A, f.rt, f.ed); info(f.A, f.cap); }
      else { if (st.rt > deathAt(st.A) + 4) st.rt = 0; drawBears(g, st.A, st.rt, { text: String(st.A), hot: st.A !== 1000, caret: false }); info(st.A, capFor(st.A)); }
    };
  });

  /* ---------- slide 2: Val'anyr ---------- */
  const SIM = 40, HEAL_EVERY = 1.5, ABSORB = 900, DT = .05;
  // shield over time for a cap, with incoming damage per second given by dmg(time)
  function shield(cap, dmg) {
    const out = []; let sh = 0, next = 0;
    for (let i = 0; i * DT <= SIM + 1e-9; i++) {
      const tt = i * DT;
      if (tt >= next - 1e-9) { sh = Math.min(cap, sh + ABSORB); next += HEAL_EVERY; }
      sh = Math.max(0, sh - dmg(tt) * DT); out.push(sh);
    }
    return out;
  }
  const CX = 70, CY = 70, CWD = 560, CHT = 400, YMAX = 24000;
  const cx = tt => CX + tt / SIM * CWD, cy = v => CY + CHT - v / YMAX * CHT;
  function drawVal(g, dmg, upto, dLabel) {
    T.use(g); panel(g);
    icon(g, 'inv_mace_99', 20, 14, 44);
    txt(g, 'Val’anyr, Hammer of Ancient Kings', 76, 28, { font: '800 18px Montserrat, Jost, sans-serif' });
    txt(g, `each heal grants an absorb shield of ${fmt(ABSORB)}, stacking up to the cap`, 76, 50, { font: '500 14px Jost, sans-serif', col: C.muted });
    // axes
    g.strokeStyle = '#cdbf9f'; g.lineWidth = 1;
    [0, 5000, 10000, 15000, 20000].forEach(v => { g.beginPath(); g.moveTo(CX, cy(v)); g.lineTo(CX + CWD, cy(v)); g.stroke(); txt(g, fmt(v), CX - 8, cy(v), { font: '500 12px Jost, sans-serif', col: C.muted, align: 'right' }); });
    [0, 10, 20, 30, 40].forEach(v => txt(g, v + 's', cx(v), CY + CHT + 16, { font: '500 12px Jost, sans-serif', col: C.muted, align: 'center' }));
    txt(g, 'shield on the tank over a 40 second pull', CX + CWD / 2, CY + CHT + 40, { font: '700 14px Montserrat, Jost, sans-serif', align: 'center' });
    // caps
    g.setLineDash([8, 6]); g.lineWidth = 2;
    g.strokeStyle = C.p2; g.beginPath(); g.moveTo(CX, cy(2000)); g.lineTo(CX + CWD, cy(2000)); g.stroke();
    g.strokeStyle = C.red; g.beginPath(); g.moveTo(CX, cy(20000)); g.lineTo(CX + CWD, cy(20000)); g.stroke(); g.setLineDash([]);
    T.label('intended cap 2,000', CX + 10, cy(2000) - 14, 'left', '#145c33', 13);
    T.label('shipped cap 20,000', CX + 10, cy(20000) - 14, 'left', C.red, 13);
    // lines
    const a = shield(2000, dmg), b = shield(20000, dmg), n = Math.min(a.length, Math.round(upto / DT) + 1);
    const line = (arr, col, w) => { g.strokeStyle = col; g.lineWidth = w; g.lineJoin = 'round'; g.beginPath(); for (let i = 0; i < n; i++) { const x = cx(i * DT), y = cy(arr[i]); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); };
    line(b, C.red, 5); line(a, C.p2, 3);
    const last = n - 1;
    if (last > 0) { icon(g, 'spell_holy_powerwordshield', cx(last * DT) - 13, cy(b[last]) - 32, 26); }
    if (dLabel) dLabel.forEach(([t0, t1, s]) => { if (upto >= t0) { g.fillStyle = 'rgba(85,98,235,.07)'; g.fillRect(cx(t0), CY, cx(Math.min(t1, upto)) - cx(t0), CHT); txt(g, s, cx(t0) + 8, cy(15000), { font: '700 13px Montserrat, Jost, sans-serif', col: C.blue }); } });
    const diff = Math.max(...b.slice(0, n)) - Math.max(...a.slice(0, n));
    // ruler
    const RX = 700, RY0 = 90, RY1 = 520, lg = v => RY1 - (Math.log10(v) / 5) * (RY1 - RY0);
    txt(g, 'Orders of magnitude', RX + 150, 66, { font: '800 16px Montserrat, Jost, sans-serif', align: 'center' });
    g.strokeStyle = C.navy; g.lineWidth = 3; g.beginPath(); g.moveTo(RX, RY0); g.lineTo(RX, RY1); g.stroke();
    [1, 10, 100, 1000, 10000, 100000].forEach(v => { g.lineWidth = 2; g.beginPath(); g.moveTo(RX - 8, lg(v)); g.lineTo(RX + 8, lg(v)); g.stroke(); txt(g, fmt(v), RX - 14, lg(v), { font: '600 13px Jost, sans-serif', col: C.muted, align: 'right' }); });
    const arrow = (v0, v1, x, col, l1, l2, ic) => {
      g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 4; g.beginPath(); g.moveTo(x, lg(v0)); g.lineTo(x, lg(v1)); g.stroke();
      const dir = Math.sign(lg(v1) - lg(v0)); g.beginPath(); g.moveTo(x - 9, lg(v1) - dir * 12); g.lineTo(x + 9, lg(v1) - dir * 12); g.lineTo(x, lg(v1)); g.closePath(); g.fill();
      g.beginPath(); g.arc(x, lg(v0), 6, 0, TAU); g.fill();
      icon(g, ic, x + 16, (lg(v0) + lg(v1)) / 2 - 18, 36);
      txt(g, l1, x + 60, (lg(v0) + lg(v1)) / 2 - 9, { font: '800 15px Montserrat, Jost, sans-serif', col });
      txt(g, l2, x + 60, (lg(v0) + lg(v1)) / 2 + 11, { font: '500 13px Jost, sans-serif', col: C.ink });
    };
    arrow(1000, 1, RX + 30, C.red, 'bears: 1,000 to 1', 'three orders, found on the first pull', 'ability_hunter_pet_bear');
    arrow(2000, 20000, RX + 30, C.goldInk, 'Val’anyr: 2,000 to 20,000', 'one order, nobody noticed', 'inv_mace_99');
    return diff;
  }
  const VDUR = 20;
  const vTourDmg = tt => tt < 20 ? 900 : 60;
  const PHASES = [[0, 20, 'boss fight: 900 damage per second'], [20, 40, 'light damage: 60 per second']];
  canvasDemo('valanyr', (s, cv, g) => {
    const st = { d: 900, tour: true, held: false, t: 0, key: '' };
    const tourBtn = $(s, '.va-tour'), rng = $(s, '.va-d');
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); } };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    rng.oninput = () => { manual(); st.d = +rng.value; };
    $$(s, '.va-seg .btn').forEach(b => b.onclick = () => { manual(); st.d = +b.dataset.d; });
    function info(diff, cap, d) {
      const key = Math.round(diff) + cap + d; if (key === st.key) return; st.key = key;
      if (d != null) { rng.value = d; $(s, '.va-dv').textContent = d; }
      say($(s, '.va-stats'), `<div class="${diff > 1 ? 'r' : 'g'}"><b>${fmt(diff)}</b><span>most extra shield the 20,000 cap has given so far</span></div>`);
      say($(s, '.va-out'), cap);
    }
    const vCap = (up, diff) => up < 20 ? 'In a boss fight the shield is eaten almost as fast as it grows. It never nears either cap, so both lines are the same line.'
      : diff < 1 ? 'Still the same line.' : 'Only when damage is light does the shield climb past 2,000. A tenfold error that rarely shows is one that ships. Three orders of magnitude will be noticed every single time.';
    scenes.valanyr = { seek(t) { st.held = true; const up = clamp(t / (VDUR - 2)) * SIM; const diff = drawVal(g, vTourDmg, up, PHASES); info(diff, vCap(up, diff), null); }, dur: () => VDUR };
    return dt => {
      if (st.held) return;
      st.t += Math.max(0, dt);
      if (st.tour) { if (st.t >= VDUR) st.t = 0; const up = clamp(st.t / (VDUR - 2)) * SIM; const diff = drawVal(g, vTourDmg, up, PHASES); info(diff, vCap(up, diff), null); }
      else { const d = st.d, diff = drawVal(g, () => d, SIM, null); info(diff, diff < 1 ? `At ${d} damage per second the shield never passes 2,000, so the typo is invisible. Lower the damage to find where it shows.` : `At ${d} damage per second the shield climbs past 2,000 and the typo shows. In a raid, this is the quiet time between pulls.`, d); }
    };
  });

  window.__seek = (t, which = 'bears') => scenes[which].seek(t);
  window.__dur = (which = 'bears') => scenes[which].dur();
})();
