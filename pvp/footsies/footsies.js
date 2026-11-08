/* Spacing and Footsies (MGM C4 M4, part 5): Ryu's crouching medium kick vs Chun-Li's crouching medium kick in
   Street Fighter III: 3rd Strike, drawn from the move viewer's sprites and hitboxes (moves.js, window.FOOTSIE_MOVES).
   The rules are at the top (front, reach, plan) and read the same per-frame boxes the sprites are drawn with, so the
   fighters, the frame strip and the range map always agree. Distances are between the two pushbox centres, in game pixels.
   The demo is a pure function of its settings and a time, exposed to the GIF recorder as window.__seek / __dur. */
(function () {
  const { $, canvasDemo, say } = FPF.kit;
  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const W = 1040, H = 585, SC = 2;
  const C = {
    navy: '#152044', ink: '#262c6a', muted: '#5d618c', line: '#cdbf9f', paper: 'rgba(255,252,244,.82)', floor: '#ddd2bc',
    blue: '#2ea3dc', red: '#e5322d', green: '#2fae63', gold: '#e0a92d', purple: '#8a4fd6', sand: '#cdbf9f',
  };

  /* ---------- the moves ---------- */
  const MV = window.FOOTSIE_MOVES;
  const FS = {
    ryu: Object.assign({ key: 'ryu', name: 'Ryu', btn: 'crouching MK' }, MV.ryu),
    chun: Object.assign({ key: 'chun', name: 'Chun-Li', btn: 'crouching MK' }, MV.chun),
  };
  Object.values(FS).forEach(m => { const i = new Image(); i.src = m.sheet; m.img = i; });
  // the designer lever: how long Ryu holds the kick out after its last active frame (source frames 13-15, 3 by default)
  const HOLD = [13, 15];
  function seqOf(m, extra) {
    const n = m.frames.length, s = [];
    for (let f = 1; f <= n; f++) {
      if (m.key === 'ryu' && f === HOLD[0]) { const len = Math.max(0, HOLD[1] - HOLD[0] + 1 + extra); for (let k = 0; k < len; k++) s.push(HOLD[0] + Math.min(k, HOLD[1] - HOLD[0])); f = HOLD[1]; continue; }
      s.push(f);
    }
    return s;
  }
  let SEQ = { ryu: seqOf(FS.ryu, 0), chun: seqOf(FS.chun, 0) };
  const total = m => SEQ[m.key].length;
  // boxes on move frame f (1-based); before the press and after the move, the idle frame (frame 1)
  const boxes = (m, f) => m.frames[(f >= 1 && f <= total(m) ? SEQ[m.key][f - 1] : 1) - 1];
  // how far forward the hurtbox reaches, and the attack box, from the pushbox centre
  const front = (m, f) => Math.max(...boxes(m, f).filter(b => b[0] !== 'a').map(b => b[3] - m.cx));
  const reach = (m, f) => { const a = boxes(m, f).filter(b => b[0] === 'a'); return a.length ? Math.max(...a.map(b => b[3] - m.cx)) : null; };
  const activeFrames = m => { const o = []; for (let f = 1; f <= total(m); f++) if (reach(m, f) !== null) o.push(f); return o; };
  const fr = ms => Math.round(ms / (1000 / 60));
  // att presses on frame 1 at distance d; def waits, sees it, and presses its own kick after its reaction time
  function plan(att, def, d, reactMs) {
    for (const f of activeFrames(att)) if (reach(att, f) >= d - front(def, 0)) return { kind: 'lands', hitF: f, press: null };
    const press = fr(reactMs), act = activeFrames(def);
    let inRange = false;
    for (const k of act) {
      const g = press + k;
      for (let f = 1; f <= total(att); f++) if (reach(def, k) >= d - front(att, f)) inRange = true;
      if (g <= total(att) && reach(def, k) >= d - front(att, g)) return { kind: 'punished', hitF: g, press };
    }
    return inRange ? { kind: 'safe', press, why: 'late' } : { kind: 'safe', press: null, why: 'reach' };
  }
  const opp = k => k === 'ryu' ? FS.chun : FS.ryu;
  const KIND = {
    lands: { col: C.blue, label: 'lands' },
    punished: { col: C.red, label: 'whiff punished' },
    safe: { col: C.sand, label: 'whiffs, unpunished' },
  };
  const D0 = 60, D1 = 240;
  function bands(att, def, react) {
    const out = []; let cur = null;
    for (let d = D0; d <= D1; d++) {
      const k = plan(att, def, d, react).kind;
      if (!cur || cur.k !== k) { cur = { k, a: d, b: d }; out.push(cur); } else cur.b = d;
    }
    return out;
  }
  // frames after the last active frame where the leg's hurtbox is still further out than at rest
  const legAfter = m => { const a = activeFrames(m), last = a[a.length - 1], rest = front(m, 0); let n = 0; for (let f = last + 1; f <= total(m); f++) if (front(m, f) > rest + 2) n++; return n; };

  /* ---------- drawing ---------- */
  function text(g, t, x, y, { col = C.ink, size = 15, weight = 600, align = 'center' } = {}) {
    g.font = `${weight} ${size}px Jost, sans-serif`; g.fillStyle = col; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(t, x, y);
  }
  function pill(g, t, x, y, bg, fg = '#fff', size = 14) {
    g.font = `700 ${size}px Jost, sans-serif`; const w = g.measureText(t).width + 18, h = size + 12;
    g.fillStyle = bg; g.beginPath(); g.roundRect(x - w / 2, y - h / 2, w, h, h / 2); g.fill();
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, x, y + 1);
  }
  function panel(g, x, y, w, h) { g.fillStyle = C.paper; g.beginPath(); g.roundRect(x, y, w, h, 14); g.fill(); }
  function spark(g, x, y, k) {
    g.save(); g.translate(x, y); g.fillStyle = C.gold; g.globalAlpha = 1 - k * 0.6; g.beginPath();
    for (let i = 0; i < 16; i++) { const r = i % 2 ? 9 : 26 + 8 * k, a = i / 16 * TAU; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    g.fill(); g.restore();
  }
  // the fighter's sprite on move frame f, standing at x on the floor and facing dir, with its boxes
  function fighter(g, m, x, dir, floor, f, shake) {
    const src = f >= 1 && f <= total(m) ? SEQ[m.key][f - 1] : 1, i = src - 1;
    g.save(); g.translate(x + shake, floor); g.scale(dir * SC, SC);
    if (m.img.complete && m.img.naturalWidth) {
      g.imageSmoothingEnabled = false;
      g.drawImage(m.img, (i % m.cols) * m.w, Math.floor(i / m.cols) * m.h, m.w, m.h, -m.cx, -m.ground, m.w, m.h);
    }
    g.lineWidth = 1 / SC;
    m.frames[i].forEach(([k, x1, y1, x2, y2]) => {
      g.fillStyle = k === 'a' ? 'rgba(229,50,45,.28)' : 'rgba(47,174,99,.12)'; g.strokeStyle = k === 'a' ? C.red : C.green;
      g.beginPath(); g.rect(x1 - m.cx, y1 - m.ground, x2 - x1 + 1, y2 - y1 + 1); g.fill(); g.stroke();
    });
    g.restore();
  }

  const LOOP = 56, GFPS = 14; // game frames shown per loop, game frames played per real second (about a quarter speed)
  const SEG = LOOP / GFPS;
  function draw(g, st, f) {
    g.clearRect(0, 0, W, H);
    const att = FS[st.who], def = opp(st.who), p = plan(att, def, st.dist, st.react);
    const floor = 232, cx = W / 2, xr = cx - st.dist / 2 * SC, xc = cx + st.dist / 2 * SC;
    /* stage */
    panel(g, 0, 0, W, 250);
    g.fillStyle = C.floor; g.fillRect(20, floor, W - 40, 12);
    const attHit = p.kind === 'punished' && f >= p.hitF, defHit = p.kind === 'lands' && f >= p.hitF;
    const fa = attHit ? p.hitF : f, fd = defHit || p.press === null ? 0 : f - p.press;
    const sh = (hit, at) => hit && f - at < 10 ? ((f % 2) ? 3 : -3) : 0;
    const xa = att.key === 'ryu' ? xr : xc, xd = att.key === 'ryu' ? xc : xr, da = att.key === 'ryu' ? 1 : -1;
    fighter(g, FS.ryu, xr, 1, floor, att.key === 'ryu' ? fa : fd, att.key === 'ryu' ? sh(attHit, p.hitF) : sh(defHit, p.hitF));
    fighter(g, FS.chun, xc, -1, floor, att.key === 'chun' ? fa : fd, att.key === 'chun' ? sh(attHit, p.hitF) : sh(defHit, p.hitF));
    if (attHit && f - p.hitF < 12) spark(g, xa + da * front(att, p.hitF) * SC, floor - 16, (f - p.hitF) / 12);
    if (defHit && f - p.hitF < 12) spark(g, xd - da * front(def, 0) * SC, floor - 16, (f - p.hitF) / 12);
    // distance ruler
    g.strokeStyle = C.muted; g.lineWidth = 1.5; g.setLineDash([5, 5]);
    g.beginPath(); g.moveTo(xr, 30); g.lineTo(xc, 30); g.stroke(); g.setLineDash([]);
    [xr, xc].forEach(x => { g.beginPath(); g.moveTo(x, 22); g.lineTo(x, 38); g.stroke(); });
    pill(g, `distance ${st.dist}`, cx, 30, C.navy);
    text(g, `frame ${Math.min(f, LOOP)}`, W - 24, 24, { col: C.muted, size: 14, align: 'right' });
    text(g, '¼ speed', W - 24, 44, { col: C.muted, size: 13, align: 'right', weight: 500 });
    [['hurtbox', C.green], ['hitbox', C.red]].forEach(([t, c], i) => {
      g.fillStyle = c; g.fillRect(24 + i * 104, 18, 14, 14); text(g, t, 44 + i * 104, 25, { col: C.ink, size: 14, align: 'left' });
    });
    text(g, 'Street Fighter III: 3rd Strike · sprites and boxes via Baston', 24, 48, { col: C.muted, size: 12, align: 'left', weight: 500 });
    const res = f >= (p.hitF ?? 99) ? (p.kind === 'lands' ? `${att.name}’s kick lands` : `${def.name} whiff punishes the leg`) : f > total(att) && p.kind === 'safe' ? (p.press === null ? 'Whiffed, and nothing reaches back' : `${def.name} pressed too late: the leg is already back`) : null;
    if (res) pill(g, res, cx, 72, p.kind === 'lands' ? C.blue : p.kind === 'punished' ? C.red : C.muted, '#fff', 16);

    /* frame strip */
    panel(g, 0, 262, W, 128);
    text(g, 'Frames (60 per second)', 24, 280, { col: C.navy, size: 15, align: 'left', weight: 700 });
    [['startup', C.gold], ['active', C.red], ['recovery', C.blue], ['leg out (hurtbox)', C.green]].forEach(([t, c], i) => {
      g.fillStyle = c; g.fillRect(W - 560 + i * 130, 274, 12, 12); text(g, t, W - 542 + i * 130, 280, { col: C.muted, size: 13, align: 'left', weight: 500 });
    });
    const X0 = 190, CW = (W - X0 - 20) / LOOP;
    const phaseCol = (m, k) => { const a = activeFrames(m); return k < a[0] ? C.gold : reach(m, k) !== null ? C.red : C.blue; };
    const row = (y, m, press, label, cut) => {
      text(g, label, 24, y + 11, { col: C.ink, size: 14, align: 'left' });
      for (let i = 0; i < LOOP; i++) {
        let col = '#ebe4d3';
        if (press !== null) {
          const k = i - press;
          if (k >= 1 && k <= total(m)) col = cut !== null && i > cut ? '#b9b2a2' : phaseCol(m, k);
        }
        g.fillStyle = col; g.fillRect(X0 + i * CW + 0.5, y, CW - 1, 22);
      }
    };
    row(300, att, 0, `${att.name} · ${att.btn}`, attHit ? p.hitF : null);
    const rest = front(att, 0);
    for (let i = 1; i < LOOP; i++) if (i <= total(att) && front(att, i) > rest + 2 && !(attHit && i > p.hitF)) { g.fillStyle = C.green; g.fillRect(X0 + i * CW + 0.5, 324, CW - 1, 4); }
    row(336, def, p.press, p.press === null ? `${def.name} · waits` : `${def.name} · ${def.btn}`, null);
    if (p.press !== null) {
      const x0 = X0 + 1 * CW, x1 = X0 + (p.press + 1) * CW;
      g.strokeStyle = C.purple; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, 347); g.lineTo(x1 - 4, 347); g.lineTo(x1 - 10, 342); g.moveTo(x1 - 4, 347); g.lineTo(x1 - 10, 352); g.stroke();
      text(g, `reacts in ${p.press} frames`, (x0 + x1) / 2, 370, { col: C.purple, size: 13 });
    }
    if (p.hitF != null) { const x = X0 + (p.hitF + 0.5) * CW, y = p.kind === 'lands' ? 311 : 347; text(g, '✱', x, y, { col: '#fff', size: 16, weight: 700 }); }
    const cxF = X0 + (Math.min(f, LOOP - 0.01) + 0.5) * CW; g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.moveTo(cxF, 294); g.lineTo(cxF, 362); g.stroke();

    /* range map */
    panel(g, 0, 402, W, 183);
    text(g, 'What happens at each distance', 24, 420, { col: C.navy, size: 15, align: 'left', weight: 700 });
    const R0 = 190, R1 = W - 30, xs = d => R0 + (d - D0) / (D1 - D0) * (R1 - R0);
    ['ryu', 'chun'].forEach((k, i) => {
      const a = FS[k], y = 446 + i * 50, on = k === st.who;
      text(g, `${a.name} presses first`, 24, y + 12, { col: on ? C.navy : C.muted, size: 14, align: 'left', weight: on ? 700 : 500 });
      g.globalAlpha = on ? 1 : 0.55;
      bands(a, opp(k), st.react).forEach(b => { g.fillStyle = KIND[b.k].col; g.fillRect(xs(b.a), y, xs(b.b + 1) - xs(b.a), 24); });
      g.globalAlpha = 1;
      if (on) { g.strokeStyle = C.navy; g.lineWidth = 2.5; g.strokeRect(R0, y, R1 - R0, 24); }
    });
    for (let d = D0; d <= D1; d += 30) { const x = xs(d); g.strokeStyle = C.line; g.lineWidth = 1; g.beginPath(); g.moveTo(x, 540); g.lineTo(x, 546); g.stroke(); text(g, d, x, 554, { col: C.muted, size: 12, weight: 500 }); }
    const mx = xs(clamp(st.dist, D0, D1)); g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.moveTo(mx, 438); g.lineTo(mx, 532); g.stroke();
    g.fillStyle = C.navy; g.beginPath(); g.moveTo(mx - 6, 436); g.lineTo(mx + 6, 436); g.lineTo(mx, 444); g.fill();
    Object.entries(KIND).forEach(([k, v], i) => { g.fillStyle = v.col; g.fillRect(R0 + i * 210, 568, 14, 12); text(g, v.label, R0 + 20 + i * 210, 574, { col: C.muted, size: 13, align: 'left', weight: 500 }); });
  }

  /* ---------- the slide ---------- */
  const TOUR = [['ryu', 120], ['ryu', 146], ['ryu', 200], ['chun', 126], ['chun', 146]];
  const st = { who: 'ryu', dist: 146, react: 250, extra: 0, t: 0, tour: true, held: false };
  let api = null;
  canvasDemo('footsies', (sl, cv, g) => {
    const ui = { ryu: $(sl, '.fs-ryu'), chun: $(sl, '.fs-chun'), dist: $(sl, '.i-dist'), react: $(sl, '.i-react'), rec: $(sl, '.i-rec'), tour: $(sl, '.fs-tour') };
    const BASE_REC = FS.ryu.frames.length - FS.ryu.active[1];
    let last = '';
    const sync = () => { ui.dist.value = st.dist; ui.react.value = st.react; ui.rec.value = BASE_REC + st.extra; };
    ui.rec.min = BASE_REC - 3; ui.rec.max = BASE_REC + 9;
    sync();
    const manual = () => { st.tour = false; st.t = 0; };
    ui.ryu.onclick = () => { manual(); st.who = 'ryu'; };
    ui.chun.onclick = () => { manual(); st.who = 'chun'; };
    ui.dist.oninput = () => { manual(); st.dist = +ui.dist.value; };
    ui.react.oninput = () => { st.react = +ui.react.value; };
    ui.rec.oninput = () => { st.extra = +ui.rec.value - BASE_REC; };
    ui.tour.onclick = () => { st.tour = true; st.t = 0; };
    addEventListener('keydown', e => {
      if (!sl.classList.contains('active') || e.ctrlKey || e.metaKey) return;
      if (e.code === 'Digit1') ui.ryu.click(); else if (e.code === 'Digit2') ui.chun.click();
    });
    function render() {
      SEQ.ryu = seqOf(FS.ryu, st.extra);
      if (st.tour) { const k = Math.floor(st.t / SEG) % TOUR.length; [st.who, st.dist] = TOUR[k]; }
      const f = Math.floor((st.t % SEG) * GFPS);
      draw(g, st, f);
      const key = [st.who, st.dist, st.react, st.extra, st.tour].join('|'); if (key === last) return; last = key;
      sync();
      ui.ryu.classList.toggle('on', st.who === 'ryu'); ui.chun.classList.toggle('on', st.who === 'chun'); ui.tour.classList.toggle('on', st.tour);
      $(sl, '.v-dist').textContent = st.dist; $(sl, '.v-react').textContent = `${st.react} ms (${fr(st.react)} frames)`;
      $(sl, '.v-rec').textContent = `${BASE_REC + st.extra} frames${st.extra ? ` (game: ${BASE_REC})` : ''}`;
      const att = FS[st.who], def = opp(st.who), p = plan(att, def, st.dist, st.react);
      const bs = bands(att, def, st.react), pun = bs.find(b => b.k === 'punished'), landTo = (bs.find(b => b.k === 'lands') || {}).b;
      say($(sl, '.st'), `<div class="${p.kind === 'lands' ? '' : p.kind === 'punished' ? 'r' : 'k'}"><b>${KIND[p.kind].label}</b><span>${att.name}’s ${att.btn} at distance ${st.dist}</span></div>`
        + `<div class="p"><b>${pun ? `${pun.a}–${pun.b}` : 'none'}</b><span>distances where ${def.name} can punish the whiff</span></div>`);
      const legs = `${att.name}’s leg stays out ${legAfter(att)} frames after the kick’s last active frame; ${def.name}’s, ${legAfter(def)}.`;
      say($(sl, '.out1'), `${att.name}’s ${att.btn} lands up to distance ${landTo}. `
        + (p.kind === 'lands' ? `At ${st.dist} it connects before ${def.name} can do anything.`
          : p.kind === 'punished' ? `At ${st.dist} it whiffs, the leg’s hurtbox is still out, and ${def.name}’s kick reaches it.`
            : p.why === 'late' ? `At ${st.dist} it whiffs, and ${def.name} sees it but reacts too late: the leg is already back.`
              : `At ${st.dist} it whiffs, and nothing can reach back either.`)
        + ` ${legs} Spacing is choosing the distance where your button does something and theirs doesn’t.`);
    }
    const DUR = SEG * TOUR.length;
    api = { seek(t) { st.held = true; st.tour = true; st.t = t; render(); }, dur: () => DUR };
    return dt => { if (!st.held) st.t += dt; render(); };
  });
  window.__seek = t => api.seek(t);
  window.__dur = () => api.dur();
  window.__footsies = { FS, plan, bands, front, reach, activeFrames, legAfter, total };
})();
