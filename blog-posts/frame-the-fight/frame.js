/* Frame the Fight (replanned page for "Speed Is a Camera Job" and "Same Camera, Three Games"; Scripture: Camera Design,
   Field of View, FOV for Game Feel, Power-User vs Novice Camera). The learner picks a camera distance and plays the
   same short arena fight. The world, the enemies and the hit effects are identical at every distance; only the zoom
   changes. The page records hits taken from attackers that were off-screen when they began, click accuracy, and the
   learner's own rating of how heavy the hits felt. */
(function () {
  const C = TD.C, TAU = TD.TAU, clamp = TD.clamp, FX = 24, FY = 56, FW = 640, FH = 410, CX = FX + FW / 2, CY = FY + FH / 2, RUN = 24, REACH = 95, SP = 150;
  const CAM = [{ n: 'Close', z: 2 }, { n: 'Middle', z: 1.2 }, { n: 'Far', z: .6 }], saved = {}; let API = null;
  const vis = (st, x, y) => Math.abs(x - st.px) * st.z < FW / 2 - 6 && Math.abs(y - st.py) * st.z < FH / 2 - 6;
  function begin(st, ci) { st.ci = ci; st.z = CAM[ci].z; st.ph = st.live ? 'ready' : 'go'; st.q = 0; st.px = 0; st.py = 0; st.foes = []; st.arrows = []; st.hits = 0; st.off = 0; st.clicks = 0; st.land = 0; st.kills = 0; st.sp = .5; st.cd = 0; st.stop = 0; st.shake = 0; st.fx = []; st.rate = null; st.hurt = 0; }
  function hurt(st, wasOff) { st.hits++; if (wasOff) st.off++; st.hurt = .35; st.shake = 7; if (st.live) PLAY.beep(150, .15, .14, 'sawtooth'); st.fx.push({ t: 0, x: st.px, y: st.py, txt: wasOff ? 'from off-screen' : 'hit', bad: true }); }
  PLAY.game('frame', {
    dur: 56, keys: ['w', 'a', 's', 'd', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'], clickStarts: false,
    opts: s => ({ ci: +(s.querySelector('.seg .on')?.dataset.v || 0) }),
    setup(s, api) { API = api; s.querySelectorAll('.seg button').forEach(b => b.onclick = () => { s.querySelectorAll('.seg button').forEach(x => x.classList.toggle('on', x === b)); api.start(); }); },
    init(o, live) { const st = { live, t: 0, R: GK.rng(live ? 1 + Math.floor(Math.random() * 9999) : 23), rows: {}, pass: 0 }; begin(st, live ? o.ci : 0); return st; },
    step(st, inp, dt) {
      st.t += dt; const c = inp.click, d = inp.down || {}, R = st.R;
      if (st.ph === 'ready') { if (c || Object.keys(d).length) st.ph = 'go'; else return; }
      if (st.ph === 'rate') { if (typeof c === 'string' && c[0] === 'w') { st.rate = +c[1]; st.ph = 'done'; st.at = st.t; st.rows[st.ci].rate = st.rate; saved[st.ci] = st.rows[st.ci]; } return; }
      if (st.ph === 'done') { if (st.live && c === 'again') API.start(); if (!st.live && st.pass === 0 && st.t - st.at > 2.5) { st.pass = 1; begin(st, 2); } return; }
      if (st.stop > 0) { st.stop -= dt; return; }
      st.q += dt; st.cd -= dt; st.hurt -= dt; st.shake *= .86; st.fx.forEach(f => f.t += dt); st.fx = st.fx.filter(f => f.t < .8);
      let vx = inp.vx != null ? inp.vx : (d.d || d.ArrowRight ? 1 : 0) - (d.a || d.ArrowLeft ? 1 : 0), vy = inp.vy != null ? inp.vy : (d.s || d.ArrowDown ? 1 : 0) - (d.w || d.ArrowUp ? 1 : 0); const m = Math.hypot(vx, vy) || 1; st.px = clamp(st.px + vx / m * SP * dt, -520, 520); st.py = clamp(st.py + vy / m * SP * dt, -520, 520);
      st.sp -= dt; if (st.sp <= 0) { st.sp = 1.5; const a = R() * TAU; st.foes.push({ k: 'g', x: st.px + Math.cos(a) * 520, y: st.py + Math.sin(a) * 520, r: 13, w: 0, cool: 0 }); if (st.foes.filter(f => f.k === 'a').length < 3) { const b = R() * TAU, dd = 270 + R() * 50; st.foes.push({ k: 'a', x: clamp(st.px + Math.cos(b) * dd, -560, 560), y: clamp(st.py + Math.sin(b) * dd, -560, 560), r: 12, w: 0, cool: 1.2 + R() * 1.5 }); } }
      st.foes.forEach(f => { const dx = st.px - f.x, dy = st.py - f.y, dist = Math.hypot(dx, dy) || 1; f.cool -= dt;
        if (f.k === 'g') { if (f.w > 0) { f.w -= dt; if (f.w <= 0) { if (dist < 62) hurt(st, f.off); f.cool = 1; } } else if (dist < 36 && f.cool <= 0) { f.w = .6; f.off = !vis(st, f.x, f.y); } else if (dist >= 30) { f.x += dx / dist * 82 * dt; f.y += dy / dist * 82 * dt; } }
        else { if (f.w > 0) { f.w -= dt; f.ax = st.px; f.ay = st.py; if (f.w <= 0) { st.arrows.push({ x: f.x, y: f.y, vx: dx / dist * 430, vy: dy / dist * 430, off: f.off, life: 1.6 }); f.cool = 2.6 + R(); } } else if (f.cool <= 0) { f.w = .9; f.off = !vis(st, f.x, f.y); } } });
      st.arrows.forEach(a => { a.x += a.vx * dt; a.y += a.vy * dt; a.life -= dt; if (!a.dead && Math.hypot(a.x - st.px, a.y - st.py) < 15) { a.dead = true; hurt(st, a.off); } }); st.arrows = st.arrows.filter(a => !a.dead && a.life > 0);
      if (c && st.cd <= 0 && inp.mouse) { st.cd = .25; st.clicks++; const [mx, my] = inp.mouse; let hit = null; st.foes.forEach(f => { const sx = CX + (f.x - st.px) * st.z, sy = CY + (f.y - st.py) * st.z; if (Math.hypot(mx - sx, my - sy) <= f.r * st.z + 4 && Math.hypot(f.x - st.px, f.y - st.py) <= REACH && !hit) hit = f; });
        st.swing = { t: st.t, a: Math.atan2(my - CY, mx - CX) }; if (hit) { hit.dead = true; st.land++; st.kills++; st.stop = .06; st.shake = 5; st.fx.push({ t: 0, x: hit.x, y: hit.y, txt: '', pop: true }); if (st.live) PLAY.beep(520, .07, .12, 'square'); } else if (st.live) PLAY.beep(300, .04, .05); }
      st.foes = st.foes.filter(f => !f.dead);
      if (st.q >= RUN) { st.rows[st.ci] = { hits: st.hits, off: st.off, acc: st.clicks ? st.land / st.clicks : 0, clicks: st.clicks, kills: st.kills, rate: null }; if (st.live) st.ph = 'rate'; else { st.ph = 'done'; st.at = st.t; } }
    },
    // the scripted fighter aims with the same error in screen pixels at every zoom, and only reacts to what is on its screen
    bot(st) { const out = { down: {}, press: {}, vx: 0, vy: 0 }; if (st.ph !== 'go') return out; const R = st.R, on = st.foes.filter(f => vis(st, f.x, f.y)), near = on.filter(f => Math.hypot(f.x - st.px, f.y - st.py) <= REACH - 8).sort((a, b) => Math.hypot(a.x - st.px, a.y - st.py) - Math.hypot(b.x - st.px, b.y - st.py))[0];
      const aim = on.find(f => f.k === 'a' && f.w > 0), arrow = st.arrows.find(a => vis(st, a.x, a.y)); if (aim || arrow) { const s = aim || arrow, dx = st.px - s.x, dy = st.py - s.y, dd = Math.hypot(dx, dy) || 1; out.vx = -dy / dd; out.vy = dx / dd; }
      else { const tg = on.filter(f => f.k === 'a')[0]; if (tg && !near) { const dx = tg.x - st.px, dy = tg.y - st.py, dd = Math.hypot(dx, dy) || 1; out.vx = dx / dd; out.vy = dy / dd; } }
      if (near && st.cd <= 0) { const g1 = (R() + R() + R() - 1.5) * 2, g2 = (R() + R() + R() - 1.5) * 2; out.mouse = [CX + (near.x - st.px) * st.z + g1 * 13, CY + (near.y - st.py) * st.z + g2 * 13]; out.click = '_canvas'; } return out; },
    draw(g, st, ui, live) {
      GK.panel(g); const z = st.z, sh = st.shake, ox = (Math.sin(st.t * 90) * sh) * z, oy = (Math.cos(st.t * 77) * sh) * z, W = (x, y) => [CX + (x - st.px) * z + ox, CY + (y - st.py) * z + oy];
      GK.head(g, `${CAM[st.ci].n} camera · ${Math.max(0, RUN - st.q).toFixed(0)} s left`, FX, 32, 'left', C.ink, 17); GK.text(g, `hits taken ${st.hits}`, FX + FW, 32, st.hurt > 0 ? C.redDk : C.ink, 15, 'right', 800);
      g.save(); g.beginPath(); g.roundRect(FX, FY, FW, FH, 12); g.clip(); g.fillStyle = '#cfc4a4'; g.fillRect(FX, FY, FW, FH); g.strokeStyle = 'rgba(0,0,0,.08)'; g.lineWidth = 1;
      for (let k = -600; k <= 600; k += 60) { const [x1, y1] = W(k, -600), [x2, y2] = W(k, 600), [x3, y3] = W(-600, k), [x4, y4] = W(600, k); g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.moveTo(x3, y3); g.lineTo(x4, y4); g.stroke(); }
      { const [x1, y1] = W(-540, -540), [x2, y2] = W(540, 540); g.strokeStyle = '#8a7f66'; g.lineWidth = 4; g.strokeRect(x1, y1, x2 - x1, y2 - y1); }
      st.foes.forEach(f => { const [x, y] = W(f.x, f.y); if (f.k === 'a' && f.w > 0) { const [tx, ty] = W(st.px, st.py); g.strokeStyle = `rgba(183,28,28,${.3 + (.9 - f.w) * .6})`; g.lineWidth = 2 * z; g.setLineDash([8, 6]); g.beginPath(); g.moveTo(x, y); g.lineTo(tx, ty); g.stroke(); g.setLineDash([]); }
        if (f.k === 'g' && f.w > 0) { g.fillStyle = 'rgba(183,28,28,.25)'; g.beginPath(); g.arc(x, y, 62 * z, 0, TAU); g.fill(); } TD.foe(x, y, f.r * z, Math.atan2(st.py - f.y, st.px - f.x), f.k === 'a' ? C.purple : C.red); });
      st.arrows.forEach(a => { const [x, y] = W(a.x, a.y), an = Math.atan2(a.vy, a.vx); g.strokeStyle = '#3a2a1a'; g.lineWidth = 3 * z; g.beginPath(); g.moveTo(x - Math.cos(an) * 12 * z, y - Math.sin(an) * 12 * z); g.lineTo(x, y); g.stroke(); });
      const [px, py] = W(st.px, st.py); g.strokeStyle = 'rgba(30,40,90,.18)'; g.lineWidth = 1.5; g.beginPath(); g.arc(px, py, REACH * z, 0, TAU); g.stroke(); TD.shadow(px, py + 12 * z, 12 * z, 4 * z); TD.player(px, py, 0, .8 * z);
      if (st.swing && st.t - st.swing.t < .14) { g.strokeStyle = '#fff'; g.lineWidth = 6 * z; g.beginPath(); g.arc(px, py, 34 * z, st.swing.a - .7, st.swing.a + .7); g.stroke(); }
      st.fx.forEach(f => { const [x, y] = W(f.x, f.y); if (f.pop) { g.strokeStyle = `rgba(255,255,255,${1 - f.t / .8})`; g.lineWidth = 4 * z; g.beginPath(); g.arc(x, y, (14 + f.t * 60) * z, 0, TAU); g.stroke(); } else TD.label(f.txt, x, y - 30 * z - f.t * 20, 'center', '#fff', 12, 'rgba(183,28,28,.95)'); });
      if (st.hurt > 0) { g.fillStyle = `rgba(183,28,28,${st.hurt * .5})`; g.fillRect(FX, FY, FW, FH); }
      g.restore();
      if (st.ph === 'ready') TD.stamp('WASD to move · click an enemy inside the ring to strike', CX, FY + 46, C.navy, 1, 16);
      if (st.ph === 'rate') { GK.box(g, CX - 220, CY - 60, 440, 120, 'rgba(255,250,240,.97)', C.navy, 12, 2.5); GK.text(g, 'How heavy did your hits feel at this distance?', CX, CY - 28, C.ink, 14, 'center', 800); [1, 2, 3, 4, 5].forEach(v => ui.btn('w' + v, String(v), CX - 190 + (v - 1) * 78, CY - 8, 68, 40, { px: 16 })); GK.text(g, '1 = like tapping a map      5 = like a hammer', CX, CY + 50, C.muted, 11, 'center', 600); }
      if (st.ph === 'done' && live) ui.btn('again', 'Fight again at this distance', CX - 130, CY - 20, 260, 40, { px: 14, on: true });
      GK.text(g, 'Red swordsmen strike when they reach you: step back or strike first. Purple archers aim along the dotted line, then fire: step aside. The ring is your reach.', FX, FY + FH + 26, C.muted, 10.5, 'left', 500);
      const RX = 690, RW = 326, store = live ? saved : st.rows; GK.text(g, 'the same fight at each camera distance', RX, 32, C.muted, 12, 'left', 700);
      CAM.forEach((cm, k) => { const y = 44 + k * 132, cur = k === st.ci, r = cur && st.ph !== 'done' && st.ph !== 'rate' ? { hits: st.hits, off: st.off, acc: st.clicks ? st.land / st.clicks : 0, clicks: st.clicks, kills: st.kills, live: true } : (store[k] || (cur ? st.rows[k] : null)); GK.box(g, RX, y, RW, 122, cur ? '#fff6dd' : '#fffaf0', cur ? C.navy : '#cdbf9f', 10, cur ? 2.5 : 1.5); GK.text(g, cm.n, RX + 14, y + 24, C.ink, 14, 'left', 800); GK.text(g, `you are ${Math.round(26 * cm.z)} px tall · ${Math.round(FW / cm.z)} units across`, RX + RW - 14, y + 24, C.muted, 10.5, 'right', 600);
        if (!r) { GK.text(g, 'not fought yet', RX + RW / 2, y + 74, C.muted, 12, 'center', 600); return; }
        [[r.hits, 'hits taken', C.ink], [r.off, 'from off-screen', C.redDk], [PLAY.pct(r.acc), 'clicks that landed', C.good]].forEach(([v, l, col], i) => { GK.text(g, String(v), RX + 14 + i * 104, y + 64, col, 22, 'left', 800); GK.text(g, l, RX + 14 + i * 104, y + 81, C.muted, 10.5, 'left', 600); });
        GK.text(g, `${r.kills} struck down in ${r.clicks} clicks` + (r.rate ? ` · you rated the weight ${r.rate} of 5` : r.live ? '' : live ? '' : ' · a script gives no rating'), RX + 14, y + 106, C.ink, 11, 'left', 700); });
      ui.stats(`<div><b>${st.hits}</b><span>hits taken</span></div><div class="r"><b>${st.off}</b><span>of them from off-screen</span></div><div class="g"><b>${st.clicks ? PLAY.pct(st.land / st.clicks) : '0%'}</b><span>clicks that landed</span></div>`);
      const who = live ? 'You' : 'The script', done = [0, 1, 2].filter(k => store[k]);
      if (st.ph !== 'done') { ui.out(st.ph === 'rate' ? 'One answer, from the feel of it.' : live ? `${CAM[st.ci].n}: the fight is the same at every distance. Only the frame changes.` : 'A scripted fighter with a fixed aiming error in screen pixels. It cannot react to what is off its screen.'); return; }
      if (done.length < 2) { const r = store[st.ci]; ui.out(`${who} took ${r.hits} hits, ${r.off} from attackers that were off-screen when they began, and landed ${PLAY.pct(r.acc)} of clicks. Fight again at another distance to compare.`); return; }
      const a = store[done[0]], b = store[done[done.length - 1]], na = CAM[done[0]].n.toLowerCase(), nb = CAM[done[done.length - 1]].n.toLowerCase();
      ui.out(`${CAM[done[0]].n}: ${a.off} of ${a.hits} hits came from off-screen and ${PLAY.pct(a.acc)} of clicks landed. ${CAM[done[done.length - 1]].n}: ${b.off} of ${b.hits}, and ${PLAY.pct(b.acc)}. ` + (a.off > b.off ? `The ${na} frame hid attackers. ` : `Off-screen hits did not rise in the ${na} frame this time. `) + (a.acc > b.acc + .05 ? `The ${nb} frame made targets small enough to miss. ` : `Accuracy did not fall in the ${nb} frame this time. `) + (a.rate && b.rate ? `You rated the weight ${a.rate} up close and ${b.rate} from afar. ` : '') + 'Whatever fills the frame with the hit leaves less room for what is coming.');
    },
  });
})();
