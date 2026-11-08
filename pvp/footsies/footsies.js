/* Spacing and Footsies (MGM C4 M4, part 5): Ryu's crouching medium kick vs Chun-Li's standing medium kick.
   The rules are at the top (FS, limbTip, plan) so the fighters, the frame strip and the range map always agree.
   Frame data and ranges are illustrative, shaped after Street Fighter 6: Ryu's kick is quicker and shorter, Chun-Li's
   reaches further and recovers slower. Distances are between the two body centres, in the same units as the canvas.
   The demo is a pure function of its settings and a time, exposed to the GIF recorder as window.__seek / __dur. */
(function () {
  const { $, canvasDemo, say } = FPF.kit;
  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const W = 1040, H = 585;
  const C = {
    navy: '#152044', ink: '#262c6a', muted: '#5d618c', line: '#cdbf9f', paper: 'rgba(255,252,244,.82)', floor: '#ddd2bc',
    blue: '#2ea3dc', red: '#e5322d', green: '#2fae63', gold: '#e0a92d', purple: '#8a4fd6', sand: '#cdbf9f',
  };

  /* ---------- the rules ---------- */
  // s: first active frame, a: active frames, r: recovery frames, reach: hitbox tip, limb: hurtbox tip with the leg out,
  // from: the frame the leg starts to leave the body, h: kick height above the floor
  const FS = {
    body: 40,
    ryu: { key: 'ryu', name: 'Ryu', btn: 'crouching MK', s: 8, a: 3, r: 17, reach: 175, limb: 160, from: 4, h: 22 },
    chun: { key: 'chun', name: 'Chun-Li', btn: 'standing MK', s: 9, a: 3, r: 19, reach: 205, limb: 195, from: 4, h: 84 },
  };
  const total = m => m.s + m.a + m.r - 1;
  const fr = ms => Math.round(ms / (1000 / 60));
  // how far the leg's hurtbox sticks out on frame f: out during startup, held through active and most of recovery, then back
  function limbTip(m, f) {
    const b = FS.body, hold = m.s + m.a + m.r * 0.6;
    if (f < m.from || f > total(m)) return b;
    if (f < m.s) return lerp(b, m.limb, (f - m.from) / (m.s - m.from));
    if (f < hold) return m.limb;
    return lerp(m.limb, b, (f - hold) / (total(m) - hold));
  }
  // att presses first at distance d; def waits and presses the moment it sees the leg (after its reaction time)
  function plan(att, def, d, reactMs) {
    if (d <= att.reach + FS.body) return { kind: 'lands', hitF: att.s, press: null };
    if (def.reach < d - att.limb) return { kind: 'safe', press: null, why: 'reach' };
    const press = att.from + fr(reactMs);
    for (let f = press + def.s; f < press + def.s + def.a; f++) if (def.reach >= d - limbTip(att, f)) return { kind: 'punished', hitF: f, press };
    return { kind: 'safe', press, why: 'late' };
  }
  const opp = k => k === 'ryu' ? FS.chun : FS.ryu;
  const KIND = {
    lands: { col: C.blue, label: 'lands' },
    punished: { col: C.red, label: 'whiff punished' },
    safe: { col: C.sand, label: 'whiffs, unpunished' },
  };
  function bands(att, def, react) {
    const out = []; let cur = null;
    for (let d = 100; d <= 460; d++) {
      const k = plan(att, def, d, react).kind;
      if (!cur || cur.k !== k) { cur = { k, a: d, b: d }; out.push(cur); } else cur.b = d;
    }
    return out;
  }

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
    for (let i = 0; i < 16; i++) { const r = i % 2 ? 10 : 30 + 8 * k, a = i / 16 * TAU; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    g.fill(); g.restore();
  }
  // a fighter at x, facing dir (+1 right), with the leg reaching tip (from the body centre) at height h
  function fighter(g, m, x, dir, floor, tip, hit) {
    const ryu = m.key === 'ryu', crouch = ryu && tip > FS.body + 1;
    const top = floor - (crouch ? 104 : 140), hip = floor - (crouch ? 36 : 62);
    const fill = ryu ? '#f6f1e6' : '#3473d6', edge = C.navy;
    const sh = hit ? -dir * 8 : 0;
    g.save(); g.translate(sh, 0);
    g.lineCap = 'round'; g.lineJoin = 'round';
    // standing leg(s)
    g.strokeStyle = ryu ? '#e8dfcc' : '#f1cfa8'; g.lineWidth = 16;
    g.beginPath(); g.moveTo(x - dir * 6, hip); g.lineTo(x - dir * (crouch ? 34 : 14), crouch ? floor - 14 : floor - 4); g.stroke();
    if (tip <= FS.body + 1) { g.beginPath(); g.moveTo(x + dir * 6, hip); g.lineTo(x + dir * 14, floor - 4); g.stroke(); }
    // torso and head
    g.fillStyle = fill; g.strokeStyle = edge; g.lineWidth = 2.5;
    g.beginPath(); g.roundRect(x - 24, top + 34, 48, hip - top - 22, 14); g.fill(); g.stroke();
    g.fillStyle = '#f1cfa8'; g.beginPath(); g.arc(x, top + 18, 18, 0, TAU); g.fill(); g.stroke();
    if (ryu) { g.fillStyle = C.red; g.fillRect(x - 18, top + 6, 36, 6); g.beginPath(); g.moveTo(x - dir * 16, top + 9); g.lineTo(x - dir * 34, top + 18); g.lineTo(x - dir * 30, top + 6); g.fill(); }
    else { g.fillStyle = '#3a2a22'; [-1, 1].forEach(s => { g.beginPath(); g.arc(x + s * 17, top + 6, 8, 0, TAU); g.fill(); }); }
    // guard arms
    g.strokeStyle = '#f1cfa8'; g.lineWidth = 10; g.beginPath(); g.moveTo(x + dir * 8, top + 50); g.lineTo(x + dir * 30, top + 60); g.lineTo(x + dir * 30, top + 40); g.stroke();
    // the kicking leg
    if (tip > FS.body + 1) {
      g.strokeStyle = ryu ? '#e8dfcc' : '#f1cfa8'; g.lineWidth = 16;
      g.beginPath(); g.moveTo(x, hip); g.lineTo(x + dir * tip, floor - m.h); g.stroke();
      g.fillStyle = ryu ? '#f1cfa8' : '#ffffff'; g.beginPath(); g.arc(x + dir * tip, floor - m.h, 8, 0, TAU); g.fill();
    }
    g.restore();
  }
  function boxes(g, m, x, dir, floor, f, pressF) {
    const lf = pressF === null ? -1 : f - pressF;
    const tip = pressF === null ? FS.body : limbTip(m, lf);
    // body hurtbox
    g.fillStyle = 'rgba(47,174,99,.14)'; g.strokeStyle = C.green; g.lineWidth = 2;
    g.beginPath(); g.rect(x - FS.body, floor - 146, FS.body * 2, 146); g.fill(); g.stroke();
    // leg hurtbox
    if (tip > FS.body + 1) {
      const x0 = x + dir * FS.body, x1 = x + dir * tip;
      g.beginPath(); g.rect(Math.min(x0, x1), floor - m.h - 14, Math.abs(x1 - x0), 28); g.fill(); g.stroke();
    }
    // hitbox on active frames
    if (lf >= m.s && lf < m.s + m.a) {
      const x0 = x + dir * (m.reach - 52), x1 = x + dir * m.reach;
      g.fillStyle = 'rgba(229,50,45,.28)'; g.strokeStyle = C.red; g.lineWidth = 2.5;
      g.beginPath(); g.rect(Math.min(x0, x1), floor - m.h - 18, Math.abs(x1 - x0), 36); g.fill(); g.stroke();
    }
    return tip;
  }

  const LOOP = 64, GFPS = 15; // game frames shown per loop, game frames played per real second (a quarter speed)
  const SEG = LOOP / GFPS;
  function draw(g, st, f) {
    g.clearRect(0, 0, W, H);
    const att = FS[st.who], def = opp(st.who), p = plan(att, def, st.dist, st.react);
    const floor = 230, cx = W / 2;
    const xa = st.who === 'ryu' ? cx - st.dist / 2 : cx + st.dist / 2, xd = st.who === 'ryu' ? cx + st.dist / 2 : cx - st.dist / 2;
    const da = st.who === 'ryu' ? 1 : -1;
    /* stage */
    panel(g, 0, 0, W, 250);
    g.fillStyle = C.floor; g.fillRect(20, floor, W - 40, 12);
    const attHit = p.kind === 'punished' && f >= p.hitF, defHit = p.kind === 'lands' && f >= p.hitF;
    const attFrozen = attHit ? p.hitF : f, defFrozen = defHit ? -1 : f;
    const tipA = attHit ? limbTip(att, p.hitF) : limbTip(att, f);
    const tipD = p.press === null || defHit ? FS.body : limbTip(def, f - p.press);
    fighter(g, att, xa, da, floor, tipA, attHit && f - p.hitF < 10);
    fighter(g, def, xd, -da, floor, tipD, defHit && f - p.hitF < 10);
    boxes(g, att, xa, da, floor, attFrozen, 0);
    boxes(g, def, xd, -da, floor, defFrozen, defHit ? null : p.press);
    if (attHit && f - p.hitF < 12) spark(g, xa + da * Math.max(FS.body, d2tip(p, att)), floor - att.h, (f - p.hitF) / 12);
    if (defHit && f - p.hitF < 12) spark(g, xd - da * FS.body, floor - att.h, (f - p.hitF) / 12);
    // distance ruler
    g.strokeStyle = C.muted; g.lineWidth = 1.5; g.setLineDash([5, 5]);
    g.beginPath(); g.moveTo(cx - st.dist / 2, 30); g.lineTo(cx + st.dist / 2, 30); g.stroke(); g.setLineDash([]);
    [cx - st.dist / 2, cx + st.dist / 2].forEach(x => { g.beginPath(); g.moveTo(x, 22); g.lineTo(x, 38); g.stroke(); });
    pill(g, `distance ${st.dist}`, cx, 30, C.navy);
    text(g, `frame ${Math.min(f, LOOP)}`, W - 24, 24, { col: C.muted, size: 14, align: 'right' });
    text(g, '¼ speed', W - 24, 44, { col: C.muted, size: 13, align: 'right', weight: 500 });
    // legend
    [['hurtbox', C.green], ['hitbox', C.red]].forEach(([t, c], i) => {
      g.fillStyle = c; g.fillRect(24 + i * 104, 18, 14, 14); text(g, t, 44 + i * 104, 25, { col: C.ink, size: 14, align: 'left' });
    });
    const res = f >= (p.hitF ?? 99) ? (p.kind === 'lands' ? `${att.name}’s kick lands` : `${def.name} whiff punishes the leg`) : f > total(att) && p.kind === 'safe' ? (p.press === null ? 'Whiffed, and nothing reaches back' : `${def.name} pressed too late: the leg is already back`) : null;
    if (res) pill(g, res, cx, 64, p.kind === 'lands' ? C.blue : p.kind === 'punished' ? C.red : C.muted, '#fff', 16);

    /* frame strip */
    panel(g, 0, 262, W, 128);
    text(g, 'Frames (60 per second)', 24, 280, { col: C.navy, size: 15, align: 'left', weight: 700 });
    const X0 = 190, CW = (W - X0 - 20) / LOOP;
    const row = (y, m, press, label, cut) => {
      text(g, label, 24, y + 11, { col: C.ink, size: 14, align: 'left' });
      for (let i = 0; i < LOOP; i++) {
        let col = '#ebe4d3';
        if (press !== null) {
          const lf = i - press;
          if (lf >= 1 && lf < m.s) col = C.gold; else if (lf >= m.s && lf < m.s + m.a) col = C.red; else if (lf >= m.s + m.a && lf <= total(m)) col = C.blue;
          if (cut !== null && i > cut && lf >= 1 && lf <= total(m)) col = '#b9b2a2';
        }
        g.fillStyle = col; g.fillRect(X0 + i * CW + 0.5, y, CW - 1, 22);
      }
    };
    row(300, att, 0, `${att.name} · ${att.btn}`, attHit ? p.hitF : null);
    // limb-out bar under the attacker's row
    for (let i = 0; i < LOOP; i++) if (limbTip(att, i) > FS.body + 1 && !(attHit && i > p.hitF)) { g.fillStyle = C.green; g.fillRect(X0 + i * CW + 0.5, 324, CW - 1, 4); }
    row(336, def, p.press, p.press === null ? `${def.name} · waits` : `${def.name} · ${def.btn}`, null);
    if (p.press !== null) {
      const x0 = X0 + att.from * CW, x1 = X0 + (p.press + 1) * CW;
      g.strokeStyle = C.purple; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, 347); g.lineTo(x1 - 4, 347); g.lineTo(x1 - 10, 342); g.moveTo(x1 - 4, 347); g.lineTo(x1 - 10, 352); g.stroke();
      text(g, `reacts in ${p.press - att.from} frames`, (x0 + x1) / 2, 370, { col: C.purple, size: 13 });
    }
    if (p.hitF != null) { const x = X0 + (p.hitF + 0.5) * CW, y = p.kind === 'lands' ? 311 : 347; text(g, '✱', x, y, { col: '#fff', size: 16, weight: 700 }); }
    [['startup', C.gold], ['active', C.red], ['recovery', C.blue], ['leg out (hurtbox)', C.green]].forEach(([t, c], i) => {
      g.fillStyle = c; g.fillRect(W - 560 + i * 130, 274, 12, 12); text(g, t, W - 542 + i * 130, 280, { col: C.muted, size: 13, align: 'left', weight: 500 });
    });
    const cxF = X0 + (Math.min(f, LOOP - 0.01) + 0.5) * CW; g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.moveTo(cxF, 294); g.lineTo(cxF, 362); g.stroke();

    /* range map */
    panel(g, 0, 402, W, 183);
    text(g, 'What happens at each distance', 24, 420, { col: C.navy, size: 15, align: 'left', weight: 700 });
    const R0 = 190, R1 = W - 30, xs = d => R0 + (d - 100) / 360 * (R1 - R0);
    ['ryu', 'chun'].forEach((k, i) => {
      const a = FS[k], y = 446 + i * 50, on = k === st.who;
      text(g, `${a.name} presses first`, 24, y + 12, { col: on ? C.navy : C.muted, size: 14, align: 'left', weight: on ? 700 : 500 });
      g.globalAlpha = on ? 1 : 0.55;
      bands(a, opp(k), st.react).forEach(b => { g.fillStyle = KIND[b.k].col; g.fillRect(xs(b.a), y, xs(b.b + 1) - xs(b.a), 24); });
      g.globalAlpha = 1;
      if (on) { g.strokeStyle = C.navy; g.lineWidth = 2.5; g.strokeRect(R0, y, R1 - R0, 24); }
    });
    for (let d = 100; d <= 460; d += 60) { const x = xs(d); g.strokeStyle = C.line; g.lineWidth = 1; g.beginPath(); g.moveTo(x, 540); g.lineTo(x, 546); g.stroke(); text(g, d, x, 554, { col: C.muted, size: 12, weight: 500 }); }
    const mx = xs(clamp(st.dist, 100, 460)); g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.moveTo(mx, 438); g.lineTo(mx, 532); g.stroke();
    g.fillStyle = C.navy; g.beginPath(); g.moveTo(mx - 6, 436); g.lineTo(mx + 6, 436); g.lineTo(mx, 444); g.fill();
    Object.entries(KIND).forEach(([k, v], i) => { g.fillStyle = v.col; g.fillRect(R0 + i * 210, 568, 14, 12); text(g, v.label, R0 + 20 + i * 210, 574, { col: C.muted, size: 13, align: 'left', weight: 500 }); });
  }
  // where the punish connects: the leg's tip on the hit frame
  function d2tip(p, att) { return limbTip(att, p.hitF); }

  /* ---------- the slide ---------- */
  const TOUR = [['ryu', 200], ['ryu', 290], ['chun', 235], ['chun', 270], ['chun', 330]];
  const st = { who: 'chun', dist: 290, react: 250, rec: 19, t: 0, tour: true, held: false };
  let api = null;
  canvasDemo('footsies', (sl, cv, g) => {
    const ui = { ryu: $(sl, '.fs-ryu'), chun: $(sl, '.fs-chun'), dist: $(sl, '.i-dist'), react: $(sl, '.i-react'), rec: $(sl, '.i-rec'), tour: $(sl, '.fs-tour') };
    let last = '';
    const sync = () => { ui.dist.value = st.dist; ui.react.value = st.react; ui.rec.value = st.rec; };
    sync();
    const manual = () => { st.tour = false; st.t = 0; };
    ui.ryu.onclick = () => { manual(); st.who = 'ryu'; };
    ui.chun.onclick = () => { manual(); st.who = 'chun'; };
    ui.dist.oninput = () => { manual(); st.dist = +ui.dist.value; };
    ui.react.oninput = () => { st.react = +ui.react.value; };
    ui.rec.oninput = () => { st.rec = +ui.rec.value; };
    ui.tour.onclick = () => { st.tour = true; st.t = 0; };
    addEventListener('keydown', e => {
      if (!sl.classList.contains('active') || e.ctrlKey || e.metaKey) return;
      if (e.code === 'Digit1') ui.ryu.click(); else if (e.code === 'Digit2') ui.chun.click();
    });
    function render() {
      FS.chun.r = st.rec;
      let lt = st.t % SEG;
      if (st.tour) { const k = Math.floor(st.t / SEG) % TOUR.length; [st.who, st.dist] = TOUR[k]; }
      const f = Math.floor(lt * GFPS);
      draw(g, st, f);
      const key = [st.who, st.dist, st.react, st.rec, st.tour].join('|'); if (key === last) return; last = key;
      sync();
      ui.ryu.classList.toggle('on', st.who === 'ryu'); ui.chun.classList.toggle('on', st.who === 'chun'); ui.tour.classList.toggle('on', st.tour);
      $(sl, '.v-dist').textContent = st.dist; $(sl, '.v-react').textContent = `${st.react} ms (${fr(st.react)} frames)`; $(sl, '.v-rec').textContent = `${st.rec} frames`;
      const att = FS[st.who], def = opp(st.who), p = plan(att, def, st.dist, st.react);
      const bs = bands(att, def, st.react), pun = bs.find(b => b.k === 'punished');
      const landTo = att.reach + FS.body;
      say($(sl, '.st'), `<div class="${p.kind === 'lands' ? '' : p.kind === 'punished' ? 'r' : 'k'}"><b>${KIND[p.kind].label}</b><span>${att.name}’s ${att.btn} at distance ${st.dist}</span></div>`
        + `<div class="p"><b>${pun ? `${pun.a}–${pun.b}` : 'none'}</b><span>distances where ${def.name} can punish the whiff</span></div>`);
      const other = st.who === 'ryu'
        ? 'Ryu’s kick is short but it comes back fast, so only a narrow band just past its range is punishable.'
        : 'Chun-Li’s kick reaches further, but her leg stays out longer: whiff it just outside her range and a ready Ryu kicks the leg.';
      say($(sl, '.out1'), `${att.name}’s ${att.btn} lands up to distance ${landTo}. `
        + (p.kind === 'lands' ? `At ${st.dist} it connects before ${def.name} can do anything.`
          : p.kind === 'punished' ? `At ${st.dist} it whiffs, the leg’s hurtbox is still out, and ${def.name}’s kick reaches it.`
            : p.why === 'late' ? `At ${st.dist} it whiffs, and ${def.name} sees it but reacts too late: the leg is already back.`
              : `At ${st.dist} it whiffs, and nothing can reach back either.`)
        + ` ${other} Spacing is choosing the distance where your button does something and theirs doesn’t.`);
    }
    const DUR = SEG * TOUR.length;
    api = { seek(t) { st.held = true; st.tour = true; st.t = t; render(); }, dur: () => DUR };
    return dt => { if (!st.held) st.t += dt; render(); };
  });
  window.__seek = t => api.seek(t);
  window.__dur = () => api.dur();
  if (typeof module !== 'undefined') module.exports = { FS, plan, limbTip };
})();
