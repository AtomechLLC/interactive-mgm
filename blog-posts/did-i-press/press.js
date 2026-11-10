/* Did I Press It? (replanned page for the invisible-mechanics posts; Scripture: forgiveness mechanics, coyote time, input buffering).
   Mario auto-runs the same ten gaps three times. Each run has a hidden number of coyote-time and jump-buffer frames (0, 4, 10).
   After every fall the learner says "robbed" or "fair". The reveal sets those calls against the presses they actually made.
   Nothing is modelled: every count is the learner's own presses, and each jump window is counted from this page's physics. */
(function () {
  const C = TD.C, DT = PLAY.DT;
  const V = 300, J = 560, G = 1800, HB = 12, PPF = V * DT;
  const HELP = [0, 4, 10];
  const at = (P, x) => P.findIndex(p => x + HB >= p.x0 && x - HB <= p.x1);
  // one fixed step of the runner. y is height below the ground line (0 = standing). Returns what happened, if anything.
  function tick(m, press, c, P) {
    m.f++; let ev = null;
    if (press) {
      if (m.gr) { m.vy = -J; m.gr = false; m.jumped = true; ev = 'jump'; }
      else if (!m.jumped && m.f - m.offF <= c) { m.vy = -J; m.jumped = true; ev = 'coyote'; }
      else if (!m.jumped) ev = 'late';
      else m.buf = m.f;
    }
    m.x += V * DT;
    if (!m.gr) {
      m.vy += G * DT; m.y += m.vy * DT;
      const p = at(P, m.x);
      if (m.vy > 0 && m.y >= 0 && m.y <= 12 && p >= 0) {
        m.y = 0; m.vy = 0; m.gr = true; m.plat = p; ev = ev || 'land';
        if (m.buf && m.f - m.buf <= c) { m.vy = -J; m.gr = false; m.jumped = true; ev = 'buffer'; }
        m.buf = 0;
      } else if (m.y > 4) { const n = P[m.plat + 1]; if (n && m.x + HB > n.x0) m.x = n.x0 - HB; if (m.y > 130) ev = 'fell'; }
    } else if (at(P, m.x) < 0) { m.gr = false; m.jumped = false; m.offF = m.f; }
    return ev;
  }
  const runner = x => ({ x, y: 0, vy: 0, gr: true, jumped: false, offF: 0, f: 0, plat: 0, buf: 0 });
  // how many press frames clear a gap of width w with c frames of help: counted by trying every frame
  function windowOf(w, c) {
    const P = [{ x0: -400, x1: 0 }, { x0: w, x1: w + 900 }]; let n = 0;
    for (let off = -50; off <= 20; off++) {
      const m = runner(-300); let done = false, ok = false, pressed = false;
      for (let i = 0; i < 400 && !done; i++) {
        const pr = !pressed && (m.x - HB) / PPF >= off; if (pr) pressed = true;
        const ev = tick(m, pr, c, P);
        if (m.gr && m.plat === 1) { ok = true; done = true; } else if (ev === 'fell') done = true;
      }
      if (ok) n++;
    }
    return n;
  }
  const gapFor = w => { for (let g = 240; g > 40; g -= 2) if (windowOf(g, 0) >= w) return g; return 40; };
  // the course: ten gaps, each built to a jump window in frames (with no help). The last is the tight one.
  const WIN = [8, 6, 5, 6, 12, 5, 4, 6, 5, 2], LEN = [330, 240, 220, 260, 110, 280, 220, 240, 220, 300];
  const GAPS = WIN.map(gapFor), P = []; let cx = -200;
  LEN.forEach((l, i) => { P.push({ x0: cx, x1: cx + l + (i ? 0 : 200) }); cx = P[i].x1 + GAPS[i]; });
  P.push({ x0: cx, x1: cx + 900 });
  const TIGHT = HELP.map(c => windowOf(GAPS[9], c));
  const BOT = [-4, -2, 2, -3, -6, 3, -1, -3, 5, 1];   // the scripted player's press, in frames after the ledge, the same in all three runs
  const blank = () => WIN.map(() => ({ off: null, late: null, how: null, res: null, call: null }));
  const reset = st => { st.m = runner(-120); st.hold = .6; };

  PLAY.game('press', {
    dur: 62, keys: [' ', 'r', 'f'],
    init(o, live) {
      const order = live ? HELP.map(h => [Math.random(), h]).sort((a, b) => a[0] - b[0]).map(a => a[1]) : HELP.slice();
      const st = { live, order, ci: 0, phase: live ? 'ready' : 'run', t: 0, log: [blank(), blank(), blank()], at: 0, fx: [] };
      reset(st); return st;
    },
    step(st, inp, dt) {
      st.t += dt;
      const any = inp.press[' '] || (inp.click && inp.click !== 'robbed' && inp.click !== 'fair');
      if (st.phase === 'ready') { if (any) st.phase = 'run'; return; }
      if (st.phase === 'end') { if (any && st.live && st.t - st.at > 1) { const n = this.init({}, true); n.phase = 'run'; Object.assign(st, n); } return; }
      if (st.phase === 'banner') { if (st.t - st.at > 2.2) { st.phase = 'run'; reset(st); } return; }
      if (st.phase === 'ask') {
        const call = inp.press.r || inp.click === 'robbed' ? 'robbed' : inp.press.f || inp.click === 'fair' ? 'fair' : null;
        if (!call || st.t - st.at < .35) return;
        st.log[st.ci][st.gap].call = call;
        const n = P[st.gap + 1]; st.m = runner(n.x0 + 30); st.m.plat = st.gap + 1; st.hold = .5; st.phase = 'run';
        return;
      }
      if (st.hold > 0) { st.hold -= dt; return; }
      const m = st.m, c = st.order[st.ci], L = st.log[st.ci], wasGr = m.gr, from = m.plat;
      const ev = tick(m, any, c, P);
      if (any && wasGr && from < 10) L[from].off = Math.round((m.x - HB - P[from].x1) / PPF);
      if ((ev === 'late' || ev === 'coyote') && from < 10 && L[from].late == null) L[from].late = m.f - m.offF;
      if (ev === 'coyote' && from < 10) L[from].how = 'coyote';
      if (ev === 'jump' || ev === 'coyote' || ev === 'buffer') { if (st.live) PLAY.beep(ev === 'jump' ? 620 : 700, .09, .12, 'square'); st.fx.push({ t: st.t, x: m.x, y: m.y }); }
      if (m.gr && m.plat > from) for (let i = from; i < m.plat && i < 10; i++) L[i].res = 'clear';
      if (ev === 'buffer' && m.plat < 10) { L[m.plat].how = 'buffer'; L[m.plat].off = Math.round((m.x - HB - P[m.plat].x1) / PPF); }
      if (ev === 'fell') {
        L[from].res = 'fell'; st.gap = from; st.phase = 'ask'; st.at = st.t; if (st.live) PLAY.beep(150, .25, .2, 'sawtooth');
      } else if (m.gr && m.plat === 10 && m.x > P[10].x0 + 150) {
        st.at = st.t; if (st.ci < 2) { st.ci++; st.phase = 'banner'; } else st.phase = 'end';
      }
    },
    bot(st) {
      if (st.phase === 'ask') { const r = st.log[st.ci][st.gap]; return st.t - st.at > 1.1 ? { down: {}, press: { [r.late != null && r.late <= 3 ? 'r' : 'f']: true } } : null; }
      if (st.phase !== 'run' || st.hold > 0) return null;
      const m = st.m, i = m.plat, r = st.log[st.ci][i]; if (i > 9 || m.jumped && !m.gr) return null;
      if (r.off != null || r.late != null) return null;
      return (m.x - HB - P[i].x1) / PPF >= BOT[i] - 1 ? { down: {}, press: { ' ': true } } : null;
    },
    draw(g, st, ui, live) {
      const AX = 20, AY = 46, AW = 1000, AH = 300, GY = AY + 212, S = 3;
      const m = st.m, cam = m.x - 250, X = x => AX + x - cam, end = st.phase === 'end';
      GK.panel(g);
      GK.head(g, end ? 'Three runs, one course' : `Run ${st.ci + 1} of 3: the hidden rule is different each run`, AX, 30, 'left', C.ink, 17);
      g.save(); g.beginPath(); g.roundRect(AX, AY, AW, AH, 12); g.clip(); g.imageSmoothingEnabled = false;
      g.fillStyle = '#5c94fc'; g.fillRect(AX, AY, AW, AH);
      const cl = GK.img('../cross-game-controllers/img/smb-cloud.png');
      if (cl) for (let i = 0; i < 6; i++) { const x = ((i * 420 - cam * .35) % 2100 + 2100) % 2100 - 200; g.drawImage(cl, AX + x, AY + 24 + (i * 37) % 70, cl.naturalWidth * S, cl.naturalHeight * S); }
      const tile = GK.img('../cross-game-controllers/img/smb-ground.png');
      P.forEach((p, i) => {
        const x0 = X(p.x0), x1 = X(p.x1); if (x1 < AX || x0 > AX + AW) return;
        g.save(); g.beginPath(); g.rect(x0, GY, x1 - x0, 96); g.clip();
        if (tile) { for (let x = x0; x < x1; x += 48) for (let r = 0; r < 2; r++) g.drawImage(tile, x, GY + r * 48, 48, 48); } else { g.fillStyle = '#c84c0c'; g.fillRect(x0, GY, x1 - x0, 96); }
        g.restore();
        if (i < 10) {
          const mid = (x1 + X(P[i + 1].x0)) / 2, r = st.log[st.ci][i];
          GK.text(g, i === 9 ? 'the tight one' : String(i + 1), mid, GY + 70, 'rgba(255,255,255,.85)', i === 9 ? 13 : 16, 'center', 800);
          if (r.res === 'clear') GK.text(g, '✓', mid, GY + 44, '#d6ffd9', 18, 'center', 800);
        } else { g.fillStyle = '#fff'; g.fillRect(X(p.x0 + 150), GY - 120, 4, 120); g.fillStyle = C.good; g.beginPath(); g.moveTo(X(p.x0 + 154), GY - 120); g.lineTo(X(p.x0 + 196), GY - 104); g.lineTo(X(p.x0 + 154), GY - 88); g.fill(); }
      });
      st.fx.forEach(f => { const a = 1 - (st.t - f.t) / .35; if (a > 0) { g.fillStyle = `rgba(255,255,255,${a * .8})`; g.beginPath(); g.ellipse(X(f.x), GY + f.y, 16 + 14 * (1 - a), 5, 0, 0, TD.TAU); g.fill(); } });
      const air = !m.gr, still = st.hold > 0 || st.phase === 'ready' || st.phase === 'banner';
      const spr = GK.img('../cross-game-controllers/img/' + (air ? 'smb-mario-jump' : still ? 'smb-mario' : 'smb-mario-walk' + (1 + Math.floor(m.x / 26) % 3 + 3) % 3 + '') .replace('walk0', 'walk3') + '.png');
      if (st.phase !== 'ask') { if (spr) g.drawImage(spr, X(m.x) - spr.naturalWidth * S / 2, GY + m.y - 48, spr.naturalWidth * S, 48); else { g.fillStyle = '#e52521'; g.fillRect(X(m.x) - 18, GY + m.y - 48, 36, 48); } }
      g.restore();
      if (st.phase === 'ready') TD.stamp('Press Space to start, Space to jump', AX + AW / 2, AY + 90, C.navy, 1, 22);
      if (st.phase === 'banner') TD.stamp(`Run ${st.ci + 1}: same course, a different hidden rule`, AX + AW / 2, AY + 90, C.navy, 1, 20);
      if (st.phase === 'ask') {
        GK.box(g, AX + 250, AY + 40, 500, 132, '#fffaf0', C.navy, 12, 2);
        GK.text(g, `You fell at gap ${st.gap + 1}. Whose fault was that?`, AX + 500, AY + 74, C.ink, 17, 'center', 700);
        ui.btn('robbed', 'R · the game robbed me', AX + 270, AY + 100, 225, 48, { px: 14 });
        ui.btn('fair', 'F · fair, I missed it', AX + 505, AY + 100, 225, 48, { px: 14 });
      }
      // the results: one row per run, in the order played
      const TY = AY + AH + 34, cols = [AX, AX + 96, AX + 420, AX + 520, AX + 632, AX + 800];
      ['run', 'the ten gaps', 'cleared', '"robbed" calls', end ? 'late presses rescued' : 'late presses', end ? 'the hidden rule' : 'the hidden rule'].forEach((h, i) => GK.text(g, h, cols[i], TY, C.muted, 11, 'left', 700));
      let late = 0, lateSum = 0;
      st.log.forEach((L, ci) => {
        const y = TY + 30 + ci * 44, shown = ci <= st.ci, c = st.order[ci];
        if (ci === st.ci && !end) { g.fillStyle = 'rgba(245,176,65,.16)'; g.beginPath(); g.roundRect(AX - 8, y - 22, AW + 8, 38, 8); g.fill(); }
        GK.text(g, `Run ${ci + 1}`, cols[0], y, C.ink, 14, 'left', 700);
        L.forEach((r, i) => {
          const x = cols[1] + 12 + i * 30;
          g.fillStyle = !r.res || !shown ? '#e3d8bf' : r.res === 'clear' ? C.good : C.redDk; g.beginPath(); g.arc(x, y - 5, 10, 0, TD.TAU); g.fill();
          if (r.call === 'robbed') GK.text(g, 'R', x, y - 1, '#fff', 11, 'center', 800);
          if (end && r.how) { g.strokeStyle = C.gold; g.lineWidth = 3; g.beginPath(); g.arc(x, y - 5, 13, 0, TD.TAU); g.stroke(); }
          if (r.late != null && r.late <= 12) { late++; lateSum += r.late; }
        });
        if (!shown) return;
        const cleared = L.filter(r => r.res === 'clear').length, robbed = L.filter(r => r.call === 'robbed').length;
        const lates = L.filter(r => r.late != null && r.late <= 12), saved = lates.filter(r => r.how === 'coyote').length;
        GK.text(g, `${cleared} / 10`, cols[2], y, C.ink, 15, 'left', 700);
        GK.text(g, String(robbed), cols[3], y, robbed ? C.redDk : C.ink, 15, 'left', 700);
        GK.text(g, end ? `${saved} of ${lates.length}` : '?', cols[4], y, C.ink, 15, 'left', 700);
        GK.text(g, end ? `${c} frames of help` : '?', cols[5], y, end ? C.navy : C.muted, 15, 'left', 700);
        if (end) GK.text(g, `tight gap: ${TIGHT[HELP.indexOf(c)]}-frame window`, cols[5], y + 15, C.muted, 11, 'left', 600);
      });
      GK.text(g, 'green cleared · red fell · R you called it robbed' + (end ? ' · gold ring: the hidden rule made that jump for you' : ''), AX, TY + 160, C.muted, 12, 'left', 600);
      if (end && live) GK.text(g, 'Space to run it again in a new order', AX + AW, TY + 160, C.navy, 12, 'right', 700);
      // side panel
      const all = st.log.flat(), falls = all.filter(r => r.res === 'fell').length, robbedAll = all.filter(r => r.call === 'robbed').length;
      ui.stats(`<div class="g"><b>${all.filter(r => r.res === 'clear').length}</b><span>gaps cleared</span></div><div class="r"><b>${falls}</b><span>falls</span></div><div><b>${robbedAll}</b><span>falls you blamed on the game</span></div>`);
      const row = h => st.log[st.order.indexOf(h)], n = (L, f) => L.filter(f).length;
      const z = row(0), ten = row(10), zLate = z.filter(r => r.late != null && r.late <= 12);
      const who = live ? 'You' : 'The scripted player', your = live ? 'your' : 'its';
      ui.out(!end ? (live ? 'Jump as late as you dare. The table fills in as you go; the hidden rule and your late presses are revealed after run 3.' : 'A scripted player makes the same ten presses in every run, three of them a few frames late. Watch what each hidden rule does with them.')
        : !late ? `${who} never pressed after leaving a ledge, so the hidden rule had nothing to rescue. Run it again and leave each jump later.`
        : `${who} pressed after the ledge ${late} time${late > 1 ? 's' : ''}, ${(lateSum / late).toFixed(1)} frames late on average: too small to see. With 0 frames of help ${zLate.length ? `those presses did nothing, and ${n(zLate, r => r.call === 'robbed')} of ${zLate.length} felt like the game's fault` : 'there happened to be none'}. With 10 frames ${your} run cleared ${n(ten, r => r.res === 'clear')} of 10 and ${n(ten, r => r.how)} jump${n(ten, r => r.how) === 1 ? ' was' : 's were'} made for ${live ? 'you' : 'it'} unnoticed. The price: the last gap was built as a ${TIGHT[0]}-frame jump, and with 10 frames of help it is a ${TIGHT[2]}-frame jump. Forgiveness hides input error and removes precision in one stroke.`);
    },
  });
})();
