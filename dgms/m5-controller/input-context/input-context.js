/* Input plus context (DGMS M5, beside Interaction + context and input under stress).
   freeflow   Batman: Arkham. One strike button; the stick direction and who is standing where decide who gets hit.
   stratagem  Helldivers 2. A stratagem is a code typed on the D-pad, and the game does not pause while you type.
   The cast plays everyone: Pip is the player, the thugs are Rook, Bram, Wisp and Sam, the bugs are Grub.
   Targeting rule, distances, spawn times and blast sizes are ours; the stratagem codes are the game's. */
(function () {
  const { txt, box, bar, pill, key, clamp, lerp, C, dot, ring, padArrow } = SCN, TAU = SCN.TAU;
  const W = 1040, H = 585;

  SCN.run('freeflow', s => {
    const THUGS = [['rook', 300, 250], ['bram', 620, 235], ['wisp', 130, 400], ['sam', 690, 420], ['rook', 420, 505], ['sam', 250, 330]], NAMES = { rook: 'Rook', bram: 'Bram', wisp: 'Wisp', sam: 'Sam' };
    const sc = y => .62 + (y - 200) / 320 * .5;
    let z;
    const dirv = () => { const x = (z.dr ? 1 : 0) - (z.dl ? 1 : 0), y = (z.dd ? 1 : 0) - (z.du ? 1 : 0); return x || y ? [x, y] : z.mouse; };
    function pick() {
      const d = dirv(), up = z.th.filter(t => t.down <= 0); if (!up.length) return null;
      const dist = t => Math.hypot(t.x - z.x, (t.y - z.y) * 2);
      if (!d) return { t: up.slice().sort((a, b) => dist(a) - dist(b))[0], why: 'stick centred: the nearest thug' };
      const da = Math.atan2(d[1], d[0]); let best = null, bd = 9;
      up.forEach(t => { let a = Math.abs(Math.atan2((t.y - z.y) * 2, t.x - z.x) - da); if (a > Math.PI) a = TAU - a; if (a < bd) { bd = a; best = t; } });
      return bd < .9 ? { t: best, why: 'closest to where the stick points' } : null;
    }
    function strike() {
      if (z.mv) return; const p = pick();
      if (!p) { z.combo = 0; z.msg = 'Nobody in that direction: the strike hits air and the combo resets.'; z.whiff = .4; return; }
      const t = p.t, side = t.x >= z.x ? -1 : 1; z.mv = { t, x0: z.x, y0: z.y, x1: t.x + side * 62, y1: t.y + 4, k: 0, far: Math.hypot(t.x - z.x, (t.y - z.y) * 2) > 260 }; z.face = -side;
    }
    const api = {
      dur: 24,
      reset() { z = { t: 0, x: 430, y: 370, face: 1, th: THUGS.map(([id, x, y], i) => ({ id, x, y, i, down: 0, flash: 0 })), combo: 0, best: 0, ct: 0, mv: null, log: [], msg: '', whiff: 0, du: 0, dd: 0, dl: 0, dr: 0, mouse: null, sw: 0 }; },
      step(h) {
        z.t += h; z.whiff = Math.max(0, z.whiff - h); z.sw = Math.max(0, z.sw - h);
        z.th.forEach(t => { if (t.down > 0) t.down -= h; t.flash = Math.max(0, t.flash - h * 3); });
        if (z.combo && (z.ct -= h) <= 0) { z.combo = 0; z.msg = 'Too slow: the combo dropped.'; }
        const m = z.mv; if (m) { m.k += h / (m.far ? .32 : .2); z.x = lerp(m.x0, m.x1, SCN.ease(m.k)); z.y = lerp(m.y0, m.y1, SCN.ease(m.k));
          if (m.k >= 1) { m.t.down = 5.5; m.t.flash = 1; z.combo++; z.best = Math.max(z.best, z.combo); z.ct = 2.6; z.sw = .35; z.log.unshift({ name: NAMES[m.t.id], d: dirv(), far: m.far }); z.log.length = Math.min(z.log.length, 6); z.msg = `Same button. The stick${dirv() ? '' : ', centred,'} sent it to ${NAMES[m.t.id]}${m.far ? ', a leap across the room' : ''}.`; z.mv = null; SCN.noise({ dur: .12, vol: .22 }); } }
      },
      script: [[1.2, 'dr1'], [2, 'X'], [3, 'dr0 du1 dl1'], [3.8, 'X'], [4.8, 'du0'], [5.5, 'X'], [6.6, 'dl0 dd1 dr1'], [7.4, 'X'], [8.4, 'dd0 du1'], [9.2, 'X'], [10.2, 'du0 dr0 dd1'], [11, 'X'], [12, 'dd0'], [15, 'X'], [16.5, 'dl1'], [17.2, 'X'], [18.2, 'dl0 du1'], [19, 'X'], [20, 'du0']]
        .map(([t, a]) => [t, () => a.split(' ').forEach(c => { if (c === 'X') strike(); else z[c.slice(0, 2)] = +c[2]; })]),
      caption: t => t < 3 ? 'Six thugs, one strike button. The stick points right, so the punch goes to the thug on the right.'
        : t < 6.5 ? 'Nothing about the button changed. The stick moved, so the same press flies to a different thug, even across the room.'
        : t < 12 ? 'Interaction plus context equals outcome. The input is "strike"; the context is the stick and where everyone stands.'
        : t < 16 ? 'Stick centred: the context falls back to the nearest thug still standing.'
        : 'Because the game reads the context for you, one button is enough for a whole fight, and the skill becomes choosing who is next.',
      status: () => z.msg || 'Point the stick with W A S D (or move the mouse over the arena), then strike with J or a click.',
      stats: () => `<div class="y"><b>${z.combo}×</b><span>combo</span></div><div class="g"><b>${z.best}×</b><span>longest combo</span></div><div><b>1</b><span>attack button used</span></div>`,
      acts: { strike, du(v) { z.du = +!!v; }, dd(v) { z.dd = +!!v; }, dl(v) { z.dl = +!!v; }, dr(v) { z.dr = +!!v; } },
      keys: { j: 'strike' }, holds: { w: 'du', s: 'dd', a: 'dl', d: 'dr' },
      point(p) { if (p.x < 770) { const dx = p.x - z.x, dy = (p.y - z.y + 50) * 2; z.mouse = Math.hypot(dx, dy) > 50 ? [dx, dy] : null; if (p.type === 'down') strike(); } },
      draw(g) {
        g.clearRect(0, 0, W, H); g.save(); SCN.clipStage(g, W, H);
        g.fillStyle = '#1b2233'; g.fillRect(0, 0, W, H); const fl = g.createRadialGradient(400, 370, 40, 400, 370, 460); fl.addColorStop(0, '#59627c'); fl.addColorStop(1, '#262d42'); g.fillStyle = fl; g.beginPath(); g.ellipse(400, 380, 400, 196, 0, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 2; [.35, .7, 1].forEach(k => { g.beginPath(); g.ellipse(400, 380, 400 * k, 196 * k, 0, 0, TAU); g.stroke(); });
        const d = dirv(), pk = z.mv ? { t: z.mv.t } : pick();
        if (d && !z.mv) { const a = Math.atan2(d[1] / 2, d[0]); g.save(); g.translate(z.x, z.y); g.scale(1, .5); const a2 = Math.atan2(d[1], d[0]); g.fillStyle = 'rgba(255,185,81,.22)'; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 520, a2 - .9, a2 + .9); g.fill(); g.strokeStyle = C.gold; g.lineWidth = 5; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a2) * 150, Math.sin(a2) * 150); g.stroke(); g.restore(); }
        const all = z.th.map(t => ({ k: 't', y: t.y, t })).concat([{ k: 'p', y: z.y }]).sort((a, b) => a.y - b.y);
        all.forEach(e => {
          if (e.k === 'p') { const m = z.mv, pose = m ? { base: 'jump', lift: Math.sin(clamp(m.k) * Math.PI) * (m.far ? 70 : 24) } : z.sw > 0 ? CAST.swing((1 - z.sw / .35) * 10 + 3, 3, 6, 13).pose : 'guard'; CAST.draw(g, 'pip', { x: z.x, y: z.y, s: sc(z.y), face: z.face, pose, weapon: null }); return; }
          const t = e.t, tgt = pk && pk.t === t && t.down <= 0;
          if (tgt) { g.save(); g.translate(t.x, t.y); g.scale(1, .45); ring(g, 0, 0, 46, C.gold, 7); g.restore(); }
          CAST.draw(g, t.id, { x: t.x, y: t.y, s: sc(t.y), face: t.x >= z.x ? -1 : 1, pose: t.down > 0 ? (t.down > 5.1 ? 'hit' : 'down') : 'guard', flash: t.flash, weapon: null, alpha: t.down > 0 && t.down < .6 ? .5 + .5 * Math.sin(z.t * 30) : 1 });
          if (tgt) pill(g, NAMES[t.id], t.x, t.y - 170 * sc(t.y), { size: 14, w: 800, fill: C.gold, col: C.ink });
        });
        if (z.combo > 1) txt(g, `${z.combo}×`, 60, 70, { size: 60, w: 800, col: '#fff', display: true, halo: '#e0913a', haloW: 8 });
        if (z.whiff > 0) txt(g, 'whiff', z.x, z.y - 190, { size: 22, w: 800, col: '#fff', align: 'center', halo: C.red });
        // the pad
        box(g, 782, 14, 244, H - 28, { r: 14, fill: 'rgba(255,252,244,.96)', stroke: C.navy, lw: 3 });
        txt(g, 'CONTEXT: THE STICK', 904, 40, { size: 13, w: 800, col: C.muted, align: 'center' });
        const n = d ? Math.hypot(d[0], d[1]) : 1, sx = d ? d[0] / n : 0, sy = d ? d[1] / n : 0; dot(g, 904, 122, 60, '#e3dccb'); ring(g, 904, 122, 60, C.navy, 3); dot(g, 904 + sx * 30, 122 + sy * 30, 32, d ? C.gold : '#8d8fa6'); ring(g, 904 + sx * 30, 122 + sy * 30, 32, C.navy, 3);
        txt(g, 'INPUT: ONE BUTTON', 904, 214, { size: 13, w: 800, col: C.muted, align: 'center' }); key(g, 'Strike', 904, 252, { w: 150, h: 46, size: 20, down: z.sw > 0 || !!z.mv, col: C.blue });
        txt(g, 'OUTCOME: WHO GOT HIT', 904, 310, { size: 13, w: 800, col: C.muted, align: 'center' });
        z.log.forEach((l, i) => { const y = 336 + i * 36; box(g, 800, y, 208, 30, { r: 8, fill: i ? '#fffaf0' : '#fde9b8', stroke: i ? '#cdbf9f' : C.amber }); if (l.d) { const a = Math.atan2(l.d[1], l.d[0]); g.save(); g.translate(820, y + 15); g.rotate(a); padArrow(g, 'R', 0, 0, 10, C.navy); g.restore(); } else dot(g, 820, y + 15, 5, '#8d8fa6'); txt(g, l.name + (l.far ? ' (leap)' : ''), 842, y + 16, { size: 15, w: 800 }); });
        if (!z.log.length) txt(g, 'no strikes yet', 904, 350, { size: 14, w: 600, col: C.muted, align: 'center' });
        g.restore();
      },
    };
    return api;
  });

  SCN.run('stratagem', s => {
    const FLOOR = 470, PX = 190, STR = [{ name: 'Eagle Airstrike', code: 'URDR', range: 330, col: '#e5322d' }, { name: 'Orbital Precision Strike', code: 'RRU', range: 170, col: '#e0913a' }, { name: 'Eagle 500kg Bomb', code: 'URDDD', range: 900, col: '#e5322d' }];
    let z, swarm = false;
    function press(d) {
      if (z.stag > 0) return; const buf = z.buf + d;
      if (!z.buf) z.t0 = z.t;
      const m = STR.filter(st => st.code.startsWith(buf));
      if (!m.length) { z.buf = ''; z.errs++; z.bad = .5; z.msg = 'Wrong arrow: the code is wiped and you start again.'; SCN.tone({ f: 140, dur: .18, type: 'square', vol: .1 }); return; }
      z.buf = buf; SCN.tone({ f: 500 + buf.length * 90, dur: .06, vol: .08 });
      const done = m.find(st => st.code === buf);
      if (done) { z.calls.push({ st: done, t: 0, x: 620 }); z.called++; z.last = z.t - z.t0; z.msg = `${done.name} called in ${z.last.toFixed(1)} s of typing.`; z.buf = ''; z.throw = .4; }
    }
    const spawn = () => z.bugs.push({ x: W + 40, hp: 1, atk: 0, t: z.rng() * 9 });
    const api = {
      dur: 30,
      reset(tour) { if (tour) { swarm = false; api.mark('swarm', 'no'); } z = { t: 0, buf: '', bugs: [], calls: [], booms: [], errs: 0, hits: 0, called: 0, last: 0, t0: 0, bad: 0, stag: 0, flash: 0, throw: 0, sp: 0, msg: '', rng: SCN.rng(4), tour }; if (!tour || true) { spawn(); z.bugs[0].x = 900; } },
      step(h) {
        z.t += h; z.bad = Math.max(0, z.bad - h); z.stag = Math.max(0, z.stag - h); z.flash = Math.max(0, z.flash - h * 3); z.throw = Math.max(0, z.throw - h);
        if (!z.tour) { z.sp += h; if (z.sp > (swarm ? 1.1 : 3.2)) { z.sp = 0; spawn(); } }
        const per = z.tour ? 2.6 : 1.1; z.bugs.sort((a, b) => a.x - b.x).forEach((b, i) => { b.t += h; const stop = PX + 86 + i * 30; if (b.x > stop) { b.x = Math.max(stop, b.x - h * (z.tour && z.t > 11 ? 300 : swarm ? 120 : 42)); b.atk = per - 1.1; } else if (i === 0) { b.atk += h; if (b.atk > per) { b.atk = 0; z.hits++; z.flash = 1; z.stag = .45; if (z.buf) { z.buf = ''; z.msg = 'Hit mid-code: the input is knocked out and you start again.'; } SCN.noise({ dur: .18, vol: .22 }); } } });
        z.calls.forEach(c => { const t0 = c.t; c.t += h; if (t0 < 2.2 && c.t >= 2.2) { z.booms.push({ x: c.x, r: c.st.range, t: 0 }); z.bugs = z.bugs.filter(b => Math.abs(b.x - c.x) > c.st.range); SCN.noise({ dur: .7, vol: .35, cut: 500 }); } });
        z.calls = z.calls.filter(c => c.t < 2.3); z.booms = z.booms.filter(b => (b.t += h) < 1);
      },
      script: [[2, 'U'], [2.7, 'R'], [3.4, 'D'], [4.1, 'R'], [9, 's'], [10, 's'], [11, 's'], [11.6, 's'], [12.2, 's'], [12.8, 's'], [13.4, 's'], [14, 's'], [15.2, 's'], [16.4, 's'], [13.2, 'U'], [13.6, 'R'], [14.0, 'D'], [15.6, 'U'], [15.9, 'R'], [16.2, 'R'], [17.7, 'U'], [18, 'R'], [18.3, 'D'], [18.6, 'D'], [18.9, 'D'], [22, 's'], [23, 's']]
        .map(([t, a]) => [t, () => a === 's' ? spawn() : press(a)]),
      caption: t => t < 5 ? 'A stratagem is a code typed on the D-pad. With one bug far away it is easy: up, right, down, right calls an Eagle Airstrike.'
        : t < 9 ? 'The strike lands a moment later. Calm hands, four inputs, no mistakes.'
        : t < 13 ? 'Now the swarm arrives, and the game does not pause while you type.'
        : t < 15.5 ? 'Three arrows in, a bug lands a hit and the code is knocked out. Start again.'
        : t < 17.6 ? 'Rushing it: a wrong arrow wipes the code too.'
        : t < 21.6 ? 'Third try, five clean inputs under attack. The 500kg bomb clears the field.'
        : 'The code is not hard. Typing it while being hit is. Putting a small input test inside the danger is how a menu choice becomes a skill.',
      status: () => z.msg || 'Type a code with W A S D or the arrow buttons. A wrong arrow, or getting hit, wipes it.',
      stats: () => `<div class="g"><b>${z.called}</b><span>stratagems called${z.last ? `, the last in ${z.last.toFixed(1)} s` : ''}</span></div><div class="y"><b>${z.errs}</b><span>wrong arrows</span></div><div class="r"><b>${z.hits}</b><span>hits taken</span></div>`,
      acts: { U: () => press('U'), D: () => press('D'), L: () => press('L'), R: () => press('R') }, keys: { w: 'U', s: 'D', a: 'L', d: 'R' },
      set(k, v) { if (k === 'swarm') swarm = v === 'yes'; },
      draw(g) {
        g.clearRect(0, 0, W, H); g.save(); SCN.clipStage(g, W, H);
        const sky = g.createLinearGradient(0, 0, 0, FLOOR); sky.addColorStop(0, '#2a2f3d'); sky.addColorStop(1, '#8a6a4a'); g.fillStyle = sky; g.fillRect(0, 0, W, H);
        g.fillStyle = 'rgba(40,36,40,.6)'; g.beginPath(); g.moveTo(0, 400); g.lineTo(200, 300); g.lineTo(380, 390); g.lineTo(640, 280); g.lineTo(860, 380); g.lineTo(W, 320); g.lineTo(W, H); g.lineTo(0, H); g.fill();
        g.fillStyle = '#4a3b30'; g.fillRect(0, FLOOR, W, H - FLOOR); g.fillStyle = '#6b5544'; g.fillRect(0, FLOOR, W, 6);
        if (z.bad > 0 || z.flash > 0) { g.fillStyle = `rgba(229,50,45,${Math.max(z.bad, z.flash * .5) * .35})`; g.fillRect(0, 0, W, H); }
        z.calls.forEach(c => { g.strokeStyle = c.st.col; g.lineWidth = 6; g.globalAlpha = .5 + .5 * Math.sin(z.t * 20); g.beginPath(); g.moveTo(c.x, FLOOR); g.lineTo(c.x, 0); g.stroke(); g.globalAlpha = 1; dot(g, c.x, FLOOR, 8, c.st.col); pill(g, `${c.st.name} in ${Math.max(0, 2.2 - c.t).toFixed(1)} s`, c.x, 120, { size: 15, w: 800, fill: c.st.col }); });
        z.bugs.slice().sort((a, b) => b.x - a.x).forEach(b => CAST.draw(g, 'grub', { x: b.x, y: FLOOR + 6, s: .78, face: -1, tint: '#b8862f', pose: b.x > PX + 86 + 4 ? CAST.cycle('run', b.t * 1.6) : b.atk > .001 && b === z.bugs[0] ? CAST.swing(14 - Math.max(0, (z.tour ? 2.6 : 1.1) - b.atk) * 14, 8, 11, 14).pose : 'guard' }));
        g.fillStyle = '#5c5048'; g.beginPath(); g.ellipse(PX + 46, FLOOR + 4, 34, 46, 0, Math.PI, 0); g.fill();
        CAST.draw(g, 'pip', { x: PX - (z.stag > 0 ? 14 : 0), y: FLOOR + 6, pose: z.stag > 0 ? 'hit' : z.throw > 0 ? 'cast' : 'crouch', flash: z.flash, weapon: null });
        z.booms.forEach(b => { const k = b.t; dot(g, b.x, FLOOR - 20, Math.min(b.r, 60 + k * b.r), `rgba(255,${200 - k * 120},80,${1 - k})`); ring(g, b.x, FLOOR - 20, k * b.r * 1.2, `rgba(255,240,200,${1 - k})`, 8); });
        // the stratagem list
        box(g, 16, 16, 420, 172, { r: 10, fill: 'rgba(10,12,18,.82)', stroke: '#f1d64a', lw: 2 }); txt(g, 'STRATAGEMS', 30, 36, { size: 13, w: 800, col: '#f1d64a' });
        STR.forEach((st, i) => { const y = 62 + i * 42, live = st.code.startsWith(z.buf); g.globalAlpha = live || !z.buf ? 1 : .3; txt(g, st.name, 30, y, { size: 16, w: 700, col: '#fff' }); st.code.split('').forEach((c, j) => padArrow(g, c, 252 + j * 34, y + 2, 13, live && j < z.buf.length ? '#f1d64a' : '#aab0c4')); g.globalAlpha = 1; });
        // what has been typed
        const cx = 520; txt(g, z.buf ? 'typing...' : 'no code entered', cx, 36, { size: 14, w: 800, col: '#f1d64a' });
        for (let i = 0; i < 5; i++) { box(g, cx + i * 62, 52, 54, 54, { r: 8, fill: z.bad > 0 ? 'rgba(229,50,45,.5)' : 'rgba(10,12,18,.7)', stroke: i < z.buf.length ? '#f1d64a' : '#5a6078', lw: 3 }); if (i < z.buf.length) padArrow(g, z.buf[i], cx + i * 62 + 27, 79, 18, '#f1d64a'); }
        if (z.bad > 0) txt(g, 'wrong arrow: code wiped', cx, 124, { size: 15, w: 800, col: '#ffb3ae' });
        if (z.stag > 0) txt(g, 'hit: code wiped', cx, 124, { size: 15, w: 800, col: '#ffb3ae' });
        txt(g, `${z.bugs.length} bug${z.bugs.length === 1 ? '' : 's'} on the field`, W - 24, 36, { size: 15, w: 800, col: '#fff', align: 'right' });
        g.restore();
      },
    };
    return api;
  });
})();
