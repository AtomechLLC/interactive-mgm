/* Cancels with a price (DGMS M5, beside the Cancel Playground and the cancel anti-patterns).
   roman  Guilty Gear's Roman Cancel: Pip's heavy slash is punishable when Rook blocks it. A Roman Cancel ends the
          recovery on the spot, for half the Tension bar. Set the price to nothing and Rook never gets a turn.
   ko     Go's ko rule: a capture that could be taken straight back would loop forever, so the rule forbids repeating
          the position. Retaking the ko costs a move somewhere else first.
   Frame counts, damage and Tension gains in roman are illustrative; the 50% price is the game's. */
(function () {
  const { txt, box, bar, pill, key, clamp, lerp, C, dot, ring } = SCN, TAU = SCN.TAU;
  const W = 1040, H = 585;

  SCN.run('roman', s => {
    const FLOOR = 330, FPS = 22, MV = { su: 9, act: 12, total: 32 }, STUN = 12, JAB = 5;
    let z, cost = 50, auto = true;
    function slash() { if (z.over || z.p.st !== 'idle') return; z.p = { st: 'slash', f: 0, hit: false, cut: -1 }; z.strip = { cut: -1, res: '', rs: -1 }; }
    function rc() {
      const p = z.p; if (p.st !== 'slash' || !p.hit) { z.msg = 'A Roman Cancel needs a move that has connected.'; return; }
      if (z.ten < cost) { z.msg = `Not enough Tension: a Roman Cancel costs ${cost}%.`; z.deny = .6; return; }
      z.ten -= cost; z.rcs++; z.strip.cut = p.f; z.ringT = 1e-6; z.slow = .5; z.p = { st: 'idle', f: 0, wait: 2 }; z.msg = cost ? `Roman Cancel: ${cost}% Tension buys back ${Math.round(MV.total - p.f)} frames of recovery.` : 'Cancelled for nothing. Rook is still in blockstun.';
      SCN.tone({ f: 880, f2: 220, dur: .3, type: 'sawtooth', vol: .1 });
    }
    const api = {
      dur: 30,
      reset(tour) { if (tour) { cost = 50; auto = true; api.mark('cost', '50'); } z = { t: 0, ten: 50, p: { st: 'idle', f: 0, wait: 10 }, r: { st: 'guard', f: 0 }, php: 100, rhp: 100, rcs: 0, pun: 0, hits: 0, turns: 0, strip: { cut: -1, res: '', rs: -1 }, ringT: 0, slow: 0, fx: [], msg: '', over: 0, deny: 0, pf: 0, rf: 0 }; },
      step(h) {
        z.t += h; z.deny = Math.max(0, z.deny - h); z.pf = Math.max(0, z.pf - h * 3); z.rf = Math.max(0, z.rf - h * 3); z.fx = z.fx.filter(f => (f.t += h) < 1);
        if (z.ringT) { z.ringT += h; if (z.ringT > .7) z.ringT = 0; }
        if (z.over) { z.over += h; if (z.over > 2.5) { z.php = z.rhp = 100; z.over = 0; z.p = { st: 'idle', f: 0, wait: 10 }; z.r = { st: 'guard', f: 0 }; } return; }
        z.slow = Math.max(0, z.slow - h); const df = h * FPS * (z.slow > 0 ? .25 : 1), p = z.p, r = z.r;
        if (p.st === 'idle') { p.f += df; if (auto && p.f > (p.wait ?? 10)) slash(); }
        else if (p.st === 'stun') { p.f += df; if (p.f > 16) z.p = { st: 'idle', f: 0, wait: 8 }; }
        else if (p.st === 'slash') {
          p.f += df;
          if (!p.hit && p.f >= MV.su) { p.hit = true;
            if (r.st === 'jab' || r.st === 'stun') { z.rhp -= 14; z.hits++; z.ten = Math.min(100, z.ten + 8); z.r = { st: 'stun', f: 0 }; z.rf = 1; z.strip.res = 'hit'; z.fx.push({ x: 600, s: 'counter hit', col: C.green, t: 0 }); z.msg = 'Rook was already reaching for his punish, so the next slash hits him clean.'; SCN.noise({ dur: .15, vol: .2 }); }
            else { z.r = { st: 'block', f: 0 }; z.ten = Math.min(100, z.ten + 14); z.strip.res = 'blocked'; z.strip.rs = p.f; z.msg = 'Blocked. Now 20 frames of recovery, and Rook only needs 17.'; SCN.tone({ f: 300, dur: .06, type: 'square', vol: .06 }); } }
          if (auto && p.hit && z.strip.res === 'blocked' && p.f >= MV.act && z.ten >= cost) rc();
          else if (p.f >= MV.total) z.p = { st: 'idle', f: 0, wait: 10 };
        }
        if (r.st === 'block') { r.f += df; if (r.f >= STUN) z.r = { st: 'jab', f: 0 }; }
        else if (r.st === 'jab') { r.f += df; if (r.f >= JAB && !r.done) { r.done = true; if (z.p.st === 'slash') { z.php -= 10; z.pun++; z.turns++; z.p = { st: 'stun', f: 0 }; z.pf = 1; z.strip.res = 'punished'; z.fx.push({ x: 420, s: 'punished', col: C.red, t: 0 }); z.msg = 'Punished: Rook\'s jab lands inside the recovery. That risk is what the slash costs.'; SCN.noise({ dur: .15, vol: .2 }); } } if (r.f > JAB + 8) z.r = { st: 'guard', f: 0 }; }
        else if (r.st === 'stun') { r.f += df; if (r.f > 18) z.r = { st: 'guard', f: 0 }; }
        if (z.php <= 0 || z.rhp <= 0) z.over = 1e-6;
      },
      script: [[15, () => { cost = 0; api.mark('cost', '0'); z.ten = 0; z.pun = z.rcs = z.hits = 0; z.php = z.rhp = 100; }]],
      caption: t => t < 4 ? 'Pip\'s heavy slash is strong and slow to recover. When Rook blocks it, Rook\'s jab lands before Pip can move again.'
        : t < 9 ? 'A Roman Cancel ends the recovery on the spot, with a red burst. The second slash catches Rook reaching for his punish.'
        : t < 15 ? 'It costs half the Tension bar. So most slashes still carry their risk, and Pip has to choose which one to make safe.'
        : t < 22 ? 'Now set the price to nothing. Every slash is cancelled, so every slash is safe.'
        : 'Rook never gets a turn. A universal cancel is only fair because of what it costs: remove the price and the other player stops playing.',
      status: () => z.msg || 'J to slash, K to Roman Cancel once the slash has connected. Watch the Tension bar.',
      stats: () => `<div class="r"><b>${z.pun}</b><span>times Rook punished the recovery</span></div><div class="y"><b>${z.rcs}</b><span>Roman Cancels (${cost}% Tension each)</span></div><div class="g"><b>${z.hits}</b><span>clean hits Pip landed after a cancel</span></div>`,
      acts: { slash() { auto = false; api.mark('auto', 'no'); slash(); }, rc() { rc(); } }, keys: { j: 'slash', k: 'rc' },
      set(k, v) { if (k === 'cost') cost = +v; if (k === 'auto') auto = v === 'yes'; },
      draw(g) {
        g.clearRect(0, 0, W, H); g.save(); SCN.clipStage(g, W, H);
        const bg = g.createLinearGradient(0, 0, 0, FLOOR); bg.addColorStop(0, '#2b2540'); bg.addColorStop(1, '#5a3f5c'); g.fillStyle = bg; g.fillRect(0, 0, W, FLOOR + 30);
        g.fillStyle = 'rgba(255,255,255,.05)'; for (let i = 0; i < 9; i++) g.fillRect(40 + i * 120, 60, 60, FLOOR - 60);
        g.fillStyle = '#2a2233'; g.fillRect(0, FLOOR + 6, W, 30); g.fillStyle = '#8a6a8c'; g.fillRect(0, FLOOR + 6, W, 4);
        g.fillStyle = 'rgba(255,252,244,.96)'; g.fillRect(0, FLOOR + 36, W, H);
        // health and tension
        bar(g, 40, 26, 380, 18, z.php / 100, { col: '#f0c23c', back: 'rgba(0,0,0,.4)', stroke: '#fff' }); bar(g, W - 420, 26, 380, 18, z.rhp / 100, { col: '#f0c23c', back: 'rgba(0,0,0,.4)', stroke: '#fff' });
        txt(g, 'PIP', 40, 60, { size: 16, w: 800, col: '#9fd8f5', display: true }); txt(g, 'ROOK', W - 40, 60, { size: 16, w: 800, col: '#f5b0aa', display: true, align: 'right' });
        const p = z.p, r = z.r, PX = 430, RX = 590;
        const ppose = p.st === 'slash' ? CAST.swing(p.f, MV.su, MV.act, MV.total).pose : p.st === 'stun' ? 'hit' : 'guard';
        const rpose = r.st === 'block' ? 'block' : r.st === 'jab' ? CAST.swing(r.f, JAB, JAB + 3, JAB + 9, 'thrust').pose : r.st === 'stun' ? 'hit' : 'guard';
        if (z.ringT) { const k = z.ringT / .7; ring(g, PX, FLOOR - 70, 20 + k * 260, `rgba(255,60,50,${1 - k})`, 14 * (1 - k) + 2); g.fillStyle = `rgba(255,40,40,${.25 * (1 - k)})`; g.fillRect(0, 0, W, FLOOR + 36); txt(g, 'ROMAN CANCEL', W / 2, 110, { size: 44, w: 800, col: `rgba(255,255,255,${1 - k})`, align: 'center', display: true, halo: `rgba(200,20,20,${1 - k})`, haloW: 8 }); }
        CAST.draw(g, 'rook', { x: RX, y: FLOOR + 6, face: -1, pose: rpose, flash: z.rf, s: 1.25 });
        CAST.draw(g, 'pip', { x: PX, y: FLOOR + 6, pose: ppose, flash: z.pf, s: 1.25 });
        z.fx.forEach(f => txt(g, f.s, f.x, FLOOR - 220 - f.t * 30, { size: 26, w: 800, col: '#fff', align: 'center', display: true, halo: f.col, haloW: 7 }));
        // Tension
        const ty = FLOOR + 58; txt(g, 'TENSION', 40, ty + 10, { size: 15, w: 800, display: true }); bar(g, 140, ty, 460, 22, z.ten / 100, { col: z.ten >= cost ? '#35c9a5' : '#9bb8b0', r: 6 });
        if (cost) { const cx = 140 + 460 * cost / 100; g.fillStyle = C.red; g.fillRect(cx - 2, ty - 6, 4, 34); txt(g, `Roman Cancel: ${cost}%`, cx + 8, ty + 38, { size: 13, w: 800, col: C.red, align: cost > 60 ? 'right' : 'left' }); } else txt(g, 'Roman Cancel: free', 140, ty + 38, { size: 13, w: 800, col: C.red });
        txt(g, `${Math.round(z.ten)}%`, 612, ty + 11, { size: 18, w: 800 }); if (z.deny > 0) ring(g, 370, ty + 11, 240, C.red, 3, z.deny);
        box(g, 690, ty - 8, 330, 62, { r: 10, fill: z.turns || !z.rcs ? '#fffaf0' : '#fde3e0', stroke: '#cdbf9f' }); txt(g, 'Rook\'s turns to act', 706, ty + 10, { size: 14, w: 700, col: C.muted }); txt(g, z.pun, 706, ty + 34, { size: 26, w: 800, display: true, col: z.pun ? C.ink : C.red }); txt(g, z.pun ? 'punishes landed' : 'none: he only ever blocks', 746, ty + 36, { size: 14, w: 700, col: C.muted });
        // frame strips
        const sx = 140, sy = FLOOR + 132, cw = 22.5, st = z.strip;
        txt(g, 'Pip: heavy slash', 40, sy - 16, { size: 14, w: 800 }); txt(g, 'Rook', 40, sy + 62, { size: 14, w: 800 });
        for (let i = 0; i < MV.total; i++) { const ph = i < MV.su ? '#7ccf8a' : i < MV.act ? '#e5322d' : '#6f9fe0', cut = st.cut >= 0 && i >= Math.ceil(st.cut); box(g, sx + i * cw, sy, cw - 2, 30, { r: 4, fill: cut ? 'rgba(20,26,54,.08)' : ph, stroke: cut ? '#cdbf9f' : C.navy, lw: 1.5 }); }
        txt(g, 'startup 9', sx, sy + 42, { size: 12, w: 700, col: '#2f7a40' }); txt(g, 'active 3', sx + 9 * cw, sy + 42, { size: 12, w: 700, col: C.red }); txt(g, st.cut >= 0 ? 'recovery: cancelled' : 'recovery 20', sx + 12 * cw, sy + 42, { size: 12, w: 700, col: st.cut >= 0 ? C.red : '#2f5fa8' });
        if (st.cut >= 0) { const x = sx + Math.ceil(st.cut) * cw; g.strokeStyle = C.red; g.lineWidth = 4; g.beginPath(); g.moveTo(x - 1, sy - 8); g.lineTo(x - 1, sy + 38); g.stroke(); pill(g, 'RC', x - 1, sy - 16, { size: 12, w: 800, fill: C.red, pad: 10, padY: 6 }); }
        for (let i = MV.su; i < MV.total; i++) { const k = i - MV.su, col = k < STUN ? '#c9b98c' : k < STUN + JAB ? '#f0a23c' : k === STUN + JAB ? '#e5322d' : null; if (col) box(g, sx + i * cw, sy + 62 - 14, cw - 2, 28, { r: 4, fill: st.res && st.res !== 'hit' ? col : 'rgba(20,26,54,.08)', stroke: '#8d8fa6', lw: 1.5 }); }
        txt(g, 'blockstun 12', sx + 9 * cw, sy + 90, { size: 12, w: 700, col: '#7a6a3a' }); txt(g, 'jab startup 5', sx + 21 * cw, sy + 90, { size: 12, w: 700, col: '#a15a00' }); txt(g, 'lands on frame 26', sx + 27 * cw, sy + 90, { size: 12, w: 800, col: C.red });
        if (p.st === 'slash') { const x = sx + p.f * cw; g.fillStyle = C.navy; g.fillRect(x - 1.5, sy - 6, 3, 88); }
        if (z.over) pill(g, z.rhp <= 0 ? 'Rook is down' : 'Pip is down', W / 2, 170, { size: 24, w: 800, fill: 'rgba(0,0,0,.8)', pad: 30, padY: 18 });
        g.restore();
      },
    };
    return api;
  });

  SCN.run('ko', s => {
    const OX = 50, OY = 62, CL = 54, B0 = [[3, 2], [2, 3], [3, 4], [1, 1], [6, 2], [2, 6], [6, 6]], W0 = [[4, 2], [5, 3], [4, 4], [6, 5], [5, 7], [1, 5]];
    let z, rule = true, speed;
    // each step is one event; pos is what sits on the two ko points ('W' on a = white stone at (3,3), 'B' on b = black at (4,3))
    function next() {
      const last = z.hist[z.hist.length - 1];
      if (!rule) { const pos = last.pos === 'A' ? 'B' : 'A'; z.hist.push({ pos, who: pos === 'B' ? 'Black' : 'White', what: 'takes the ko', loop: z.hist.filter(h => h.pos === pos).length }); z.banned = 0; return; }
      const n = z.phase++ % 4;
      if (n === 0) z.hist.push({ pos: last.pos === 'A' ? 'B' : 'A', who: last.pos === 'A' ? 'Black' : 'White', what: 'takes the ko' });
      else if (n === 1) { z.banned = 1e-6; z.hist.push({ pos: last.pos, who: last.pos === 'B' ? 'White' : 'Black', what: 'may not take straight back', ban: true }); }
      else if (n === 2) { const k = z.extra.length / 2; z.extra.push({ c: last.pos === 'B' ? 'W' : 'B', at: [[7, 4], [1, 7], [7, 7], [0, 3]][k % 4] }); z.hist.push({ pos: last.pos, who: last.pos === 'B' ? 'White' : 'Black', what: 'plays a threat elsewhere' }); }
      else { const k = (z.extra.length - 1) / 2; z.extra.push({ c: last.pos === 'B' ? 'B' : 'W', at: [[7, 3], [0, 7], [8, 7], [0, 2]][k % 4] }); z.hist.push({ pos: last.pos, who: last.pos === 'B' ? 'Black' : 'White', what: 'answers it' }); }
    }
    const api = {
      dur: 34,
      reset(tour) { if (tour) { rule = true; api.mark('rule', 'on'); } speed = 0; z = { t: 0, acc: 0, phase: 0, banned: 0, extra: [], hist: [{ pos: 'A', who: '', what: 'start' }] }; },
      step(h) { z.t += h; if (z.banned) { z.banned += h; if (z.banned > 2.2) z.banned = 0; } if (speed) { z.acc += h * speed; while (z.acc >= 1) { z.acc--; next(); } } },
      script: [[2, 0], [5.5, 0], [9, 0], [12, 0], [15, 0], [18, () => { rule = false; api.mark('rule', 'off'); z = { t: 0, acc: 0, phase: 0, banned: 0, extra: [], hist: [{ pos: 'A', who: '', what: 'start' }] }; }], [20, 0], [21.5, 0], [23, 0], [24, () => { speed = 1.5; }], [27, () => { speed = 6; }], [31, () => { speed = 0; }]].map(([t, f]) => [t, f || next]),
      caption: t => t < 2 ? 'A ko. The white stone in the middle has one liberty left, so Black can capture it.'
        : t < 5.5 ? 'Black takes. But now the capturing stone has one liberty, and White could take it straight back.'
        : t < 9 ? 'The ko rule: you may not play a move that repeats the position from one turn ago. White\'s recapture is forbidden, for now.'
        : t < 15 ? 'So White plays a threat somewhere else, and Black has to decide whether to answer it.'
        : t < 18 ? 'The board has changed, so White may take the ko. Every retake is paid for with a move elsewhere.'
        : t < 24 ? 'Now remove the rule. Black takes, White takes back, Black takes back.'
        : 'The same two positions, forever. One sentence in the rulebook is the price that stops an infinite loop, just as the Tension bar does for a cancel.',
      status() { const l = z.hist[z.hist.length - 1]; return l.what === 'start' ? 'Step through the ko with the rule on, then switch it off.' : rule ? `${l.who} ${l.what}.` + (l.ban ? ' That move would repeat the position from one turn ago.' : '') : `${l.who} takes the ko. This exact position has now been on the board ${l.loop + 1} times.`; },
      stats() { const rep = Math.max(0, z.hist.length - 2); return rule ? `<div class="g"><b>${z.extra.length}</b><span>moves played elsewhere to earn a retake</span></div><div><b>${z.hist.filter(h => h.what === 'takes the ko').length}</b><span>ko captures so far</span></div>` : `<div class="r"><b>${rep}</b><span>times a position has repeated</span></div><div class="r"><b>0</b><span>moves played anywhere else</span></div>`; },
      acts: { next() { speed = 0; next(); } }, keys: { j: 'next' },
      set(k, v) { if (k === 'rule') rule = v === 'on'; },
      draw(g) {
        SCN.paper(g, W, H);
        const bw = CL * 8; box(g, OX - 34, OY - 34, bw + 68, bw + 68, { r: 10, fill: '#dcb36a', stroke: '#8a6428', lw: 4 });
        g.strokeStyle = '#5a4016'; g.lineWidth = 1.6; for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(OX + i * CL, OY); g.lineTo(OX + i * CL, OY + bw); g.moveTo(OX, OY + i * CL); g.lineTo(OX + bw, OY + i * CL); g.stroke(); }
        [[2, 2], [6, 2], [4, 4], [2, 6], [6, 6]].forEach(([x, y]) => dot(g, OX + x * CL, OY + y * CL, 4, '#5a4016'));
        const stone = (x, y, c, a = 1, r = 24) => { const px = OX + x * CL, py = OY + y * CL; g.save(); g.globalAlpha *= a; dot(g, px + 2, py + 3, r, 'rgba(0,0,0,.25)'); const gr = g.createRadialGradient(px - 7, py - 8, 2, px, py, r); if (c === 'B') { gr.addColorStop(0, '#555a66'); gr.addColorStop(1, '#0d0f14'); } else { gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#cfd3da'); } dot(g, px, py, r, gr); g.restore(); };
        B0.forEach(p => stone(p[0], p[1], 'B')); W0.forEach(p => stone(p[0], p[1], 'W')); z.extra.forEach(e => stone(e.at[0], e.at[1], e.c));
        const l = z.hist[z.hist.length - 1]; if (l.pos === 'A') stone(3, 3, 'W'); else stone(4, 3, 'B');
        const ex = l.pos === 'A' ? 4 : 3, kx = OX + ex * CL, ky = OY + 3 * CL;
        ring(g, OX + 3.5 * CL, ky, 62, 'rgba(229,50,45,.5)', 3); pill(g, 'the ko', OX + 3.5 * CL, ky - 84, { size: 13, w: 800, fill: '#7a1c15', pad: 12, padY: 7 });
        if (z.banned) { stone(ex, 3, l.pos === 'B' ? 'W' : 'B', .35); g.strokeStyle = C.red; g.lineWidth = 7; g.lineCap = 'round'; g.beginPath(); g.moveTo(kx - 17, ky - 17); g.lineTo(kx + 17, ky + 17); g.moveTo(kx + 17, ky - 17); g.lineTo(kx - 17, ky + 17); g.stroke(); pill(g, 'ko rule: not yet', kx, ky + 44, { size: 14, w: 800, fill: C.red }); }
        if (z.extra.length && rule) { const e = z.extra[z.extra.length - 1]; ring(g, OX + e.at[0] * CL, OY + e.at[1] * CL, 30, C.blue, 3); }
        // history of positions: the little 4 x 3 corner of the board, one card per move
        const hx = 560; txt(g, rule ? 'Ko rule on: each position, in order' : 'Ko rule off: each position, in order', hx, 36, { size: 20, w: 800, display: true });
        const show = z.hist.slice(-12), cw2 = 112, ch2 = 118;
        show.forEach((h, i) => {
          const x = hx + (i % 4) * (cw2 + 6), y = 62 + Math.floor(i / 4) * (ch2 + 8), rep = !rule && h.loop;
          box(g, x, y, cw2, ch2, { r: 10, fill: h.ban ? '#fde3e0' : rep ? '#fbe2df' : '#fffaf0', stroke: h.ban || rep ? C.red : i === show.length - 1 ? C.blue : '#cdbf9f', lw: i === show.length - 1 ? 4 : 2 });
          const mx = x + 18, my = y + 16, c2 = 25; box(g, mx - 10, my - 10, c2 * 3 + 20, c2 * 2 + 20, { r: 4, fill: '#dcb36a' });
          g.strokeStyle = '#5a4016'; g.lineWidth = 1; for (let a = 0; a < 4; a++) { g.beginPath(); g.moveTo(mx + a * c2, my); g.lineTo(mx + a * c2, my + 2 * c2); g.stroke(); } for (let b = 0; b < 3; b++) { g.beginPath(); g.moveTo(mx, my + b * c2); g.lineTo(mx + 3 * c2, my + b * c2); g.stroke(); }
          const mini = (cx, cy, c) => { dot(g, mx + cx * c2, my + cy * c2, 10.5, c === 'B' ? '#14161c' : '#f4f5f7'); ring(g, mx + cx * c2, my + cy * c2, 10.5, '#14161c', 1); };
          mini(1, 0, 'B'); mini(0, 1, 'B'); mini(1, 2, 'B'); mini(2, 0, 'W'); mini(3, 1, 'W'); mini(2, 2, 'W'); if (h.pos === 'A') mini(1, 1, 'W'); else mini(2, 1, 'B');
          const L = SCN.lines(g, h.what === 'start' ? 'start' : `${h.who} ${h.what}`, cw2 - 10, { size: 12, w: 700 }); L.slice(0, 2).forEach((ln, j) => txt(g, ln, x + cw2 / 2, y + 88 + j * 14, { size: 12, w: 700, align: 'center', col: h.ban ? C.red : C.ink }));
          if (rep) pill(g, `seen ${h.loop + 1}×`, x + cw2 - 26, y + 12, { size: 11, w: 800, fill: C.red, pad: 8, padY: 6 });
        });
        const by = 456; box(g, hx, by, 464, 116, { r: 12, fill: rule ? '#e7f3e4' : '#fbe2df', stroke: rule ? '#5fb47c' : C.red, lw: 3 });
        txt(g, rule ? 'Taking the ko back has a price' : 'Taking the ko back is free', hx + 18, by + 26, { size: 20, w: 800, display: true, col: rule ? '#145c33' : '#8a1c15' });
        SCN.wrap(g, rule ? 'You must first play a move somewhere else, and your opponent gets to answer it. The fight moves around the whole board and always ends.' : `Each player simply undoes the other's last move. ${Math.max(0, z.hist.length - 2)} repeats so far and nothing can ever end it.`, hx + 18, by + 52, 430, { size: 15, w: 600, lh: 20 });
      },
    };
    return api;
  });
})();
