/* The 40th Coin (replanned page for "Ennui: Repetition and Dissatisfaction"; Scripture: Pattern-Breakers, Contrast Drives Attention).
   Forty coins, three variant cards the learner places before the run. The chart is the learner's own reaction time per coin.
   Nothing is modelled: if their times do not drift, the page says so. The walk-through's clicks are scripted and flat. */
(function () {
  const C = TD.C, TAU = TD.TAU, N = 40, AX = 20, AY = 46, AW = 1000, AH = 250, DIST = 210;
  const VAR = [{ id: 'sound', n: 'new sound', col: C.purple }, { id: 'colour', n: 'rare colour', col: C.blue }, { id: 'big', n: 'bigger payout', col: C.good }];
  const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0, ms = v => Math.round(v * 1000) + ' ms';
  const SX = i => AX + 12 + i * 24.6, SY = AY + AH + 34;
  const vOf = id => VAR.find(q => q.id === id);

  // Super Mario Bros. coin and Super Mario World Dragon Coin sprites (student-tokens); the rare colour is the same coin recoloured blue.
  const SPR = {}, BASE = new URL('../../student-tokens/256px/mario/', document.currentScript.src).href;
  ['coin', 'dragon-coin'].forEach(n => { const im = new Image(); im.onload = () => { SPR[n] = im; if (n === 'coin') SPR.blue = tint(im, '#3d8bff'); }; im.src = BASE + n + '.png'; });
  function tint(im, col) {
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d');
    x.drawImage(im, 0, 0); x.globalCompositeOperation = 'hue'; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height);
    x.globalCompositeOperation = 'destination-in'; x.drawImage(im, 0, 0); return c;
  }
  // draw a sprite so its visible art is h tall, centred on (x, y); sx squashes it sideways for the spin
  function sprite(g, key, x, y, h, sx = 1) {
    const im = SPR[key]; if (!im) return false;
    const box = key === 'dragon-coin' ? [53, 13, 150, 230] : [44, 12, 168, 232], w = h * box[2] / box[3];
    g.save(); g.imageSmoothingEnabled = false; g.translate(x, y); g.scale(sx, 1);
    g.drawImage(im, box[0], box[1], box[2], box[3], -w / 2, -h / 2, w, h); g.restore(); return true;
  }
  const coinKey = v => v === 'big' ? 'dragon-coin' : v === 'colour' ? 'blue' : 'coin';
  // an arrow pointer with a navy outline: the scripted hand's mouse
  function pointer(g, x, y, press) {
    g.save(); g.translate(x, y); g.scale(press ? 1.25 : 1.4, press ? 1.25 : 1.4);
    g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 22); g.lineTo(5.5, 17); g.lineTo(9.5, 26); g.lineTo(13, 24.5); g.lineTo(9, 16); g.lineTo(16, 16); g.closePath();
    g.fillStyle = '#fff'; g.strokeStyle = '#0d1330'; g.lineWidth = 2; g.lineJoin = 'round'; g.fill(); g.stroke(); g.restore();
  }
  function outlined(g, str, x, y, size, col, align = 'center', a = 1) {
    g.save(); g.globalAlpha = a; g.font = `800 ${size}px Montserrat, Jost, sans-serif`; g.textAlign = align; g.textBaseline = 'middle';
    g.lineJoin = 'round'; g.lineWidth = Math.max(4, size / 4.5); g.strokeStyle = '#0d1330'; g.strokeText(str, x, y); g.fillStyle = col; g.fillText(str, x, y); g.restore();
  }
  function tag(g, str, x, y, col) {
    g.save(); g.font = '700 15px Jost, sans-serif'; const w = g.measureText(str).width + 22, bx = TD.clamp(x - w / 2, AX + 8, AX + AW - 8 - w);
    g.fillStyle = col; g.beginPath(); g.roundRect(bx, y - 14, w, 28, 14); g.fill();
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(str, bx + w / 2, y + 1); g.restore();
  }

  function drawPlay(g, st, live, end, plan) {
    const [mx, my] = st.mouse;
    // the ring every coin appears on: the same distance from the pointer, so reaction times compare
    if (!plan && !end) {
      const [rx, ry] = st.coin ? st.coin.from : st.mouse;
      g.save(); g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 2; g.setLineDash([6, 8]);
      g.beginPath(); g.arc(rx, ry, DIST, 0, TAU); g.stroke(); g.restore();
      if (!st.coin) {
        const ang = [-Math.PI / 2, Math.PI / 2, 0, Math.PI].find(q => { const x = rx + Math.cos(q) * DIST, y = ry + Math.sin(q) * DIST; return x > AX + 150 && x < AX + AW - 150 && y > AY + 60 && y < AY + AH - 40; });
        if (ang != null) GK.text(g, 'next coin appears somewhere on this ring', rx + Math.cos(ang) * DIST, ry + Math.sin(ang) * DIST + 5, 'rgba(255,255,255,.6)', 13, 'center', 600);
      }
    }
    if (st.coin) {
      const v = st.plan[st.i], age = st.t - st.coin.at, k = TD.ease(TD.clamp(age / .14)), h = (v === 'big' ? 92 : 62) * (.4 + .6 * k);
      const { x, y } = st.coin, spin = Math.cos(st.t * 7);
      // the variants each arrive looking different: a halo, sound rings, or the big Dragon Coin
      if (v) {
        const vc = vOf(v).col;
        g.save(); g.globalAlpha = .35 + .2 * Math.sin(st.t * 10); g.fillStyle = vc; g.beginPath(); g.arc(x, y, h * .78, 0, TAU); g.fill(); g.restore();
        if (v === 'sound') for (let j = 0; j < 3; j++) {
          const r = h * .6 + ((age * 90 + j * 26) % 78); g.save(); g.globalAlpha = TD.clamp(1 - (r - h * .6) / 78); g.strokeStyle = '#d4b3ff'; g.lineWidth = 3;
          g.beginPath(); g.arc(x, y, r, -.9, .9); g.stroke(); g.beginPath(); g.arc(x, y, r, Math.PI - .9, Math.PI + .9); g.stroke(); g.restore();
        }
        if (v === 'sound') outlined(g, '♪', x + h * .62, y - h * .55, 30, '#d4b3ff');
        tag(g, 'variant: ' + vOf(v).n, x, y - h / 2 - 26, vc);
      }
      if (!sprite(g, coinKey(v), x, y, h, v === 'big' ? 1 : .55 + .45 * Math.abs(spin))) {
        g.fillStyle = v === 'colour' ? '#4fc3f7' : '#ffd23f'; g.beginPath(); g.ellipse(x, y, h * .35, h * .5, 0, 0, TAU); g.fill();
      }
    }
    // payout feedback: a big outlined number that rises and fades, and a click ripple where the pointer pressed
    st.fx.forEach(f => {
      const a = 1 - (st.t - f.t) / .8; if (a <= 0) return;
      g.save(); g.globalAlpha = TD.clamp(a * 1.4); g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.arc(f.x, f.y, 14 + 40 * (1 - a), 0, TAU); g.stroke(); g.restore();
      outlined(g, f.v === 'big' ? '+10' : '+1', f.x, Math.max(AY + 26, f.y - 46 - 40 * (1 - a)), f.v === 'big' ? 46 : 34, f.v === 'big' ? '#7cf0a8' : '#ffd23f', 'center', TD.clamp(a * 1.6));
    });
    if (!live && !end && !plan) pointer(g, mx, my, st.fx.length && st.t - st.fx[st.fx.length - 1].t < .12);
    // coin counter, Mario style, and a caption that says who is clicking
    if (!plan) {
      const bump = st.fx.length ? TD.clamp(1 - (st.t - st.fx[st.fx.length - 1].t) / .25) : 0;
      sprite(g, 'coin', AX + 30, AY + 30, 30) || (g.fillStyle = '#ffd23f', g.beginPath(), g.arc(AX + 30, AY + 30, 12, 0, TAU), g.fill());
      outlined(g, '× ' + st.score, AX + 50, AY + 31, 24 + 6 * bump, '#fff', 'left');
      if (end) { outlined(g, `Forty coins collected, payout ${st.score}`, AX + AW / 2, AY + (live ? 62 : AH / 2), 28, '#ffd23f'); if (!live) GK.text(g, 'the chart below is the whole run', AX + AW / 2, AY + AH / 2 + 36, 'rgba(255,255,255,.7)', 14, 'center', 600); }
    }
  }
  function spawn(st) {
    const [mx, my] = st.mouse; let x, y, k = 0;
    do { const a = st.R() * TAU; x = mx + Math.cos(a) * DIST; y = my + Math.sin(a) * DIST; } while (++k < 60 && (x < AX + 50 || x > AX + AW - 50 || y < AY + 55 || y > AY + AH - 45 || (x < AX + 170 && y < AY + 95)));
    if (k >= 60) { x = AX + AW / 2; y = AY + AH / 2; }
    st.coin = { x, y, at: st.t, from: [mx, my] }; const v = st.plan[st.i];
    if (st.live) PLAY.beep(v === 'sound' ? 1320 : 880, v === 'sound' ? .3 : .08, .14, v === 'sound' ? 'triangle' : 'square');
  }

  PLAY.game('coin', {
    dur: 50, keys: [' '],
    init(o, live) {
      const plan = {}; if (!live) { plan[8] = 'sound'; plan[20] = 'colour'; plan[32] = 'big'; }
      return { live, R: live ? Math.random : GK.rng(9), phase: live ? 'plan' : 'run', plan, t: 0, i: 0, rt: [], coin: null, next: .8, mouse: [AX + AW / 2, AY + AH / 2], score: 0, fx: [] };
    },
    step(st, inp, dt) {
      st.t += dt; if (st.live && inp.mouse) st.mouse = inp.mouse;
      if (st.phase === 'plan') {
        if (typeof inp.click === 'number') {
          if (st.plan[inp.click]) delete st.plan[inp.click];
          else { const free = VAR.find(v => !Object.values(st.plan).includes(v.id)); if (free) st.plan[inp.click] = free.id; }
        }
        if (inp.click === 'go' || inp.press[' ']) { st.phase = 'run'; st.next = st.t + .9; }
        return;
      }
      if (st.phase === 'end') { if (st.live && inp.click === 'again') Object.assign(st, this.init({}, true)); return; }
      if (!st.coin && st.t >= st.next) spawn(st);
      // the scripted hand's pointer glides to the coin over its reaction time, so the click is something you can watch
      if (!st.live && st.coin) {
        const due = st.coin.due ?? .48, k = TD.ease(TD.clamp((st.t - st.coin.at - .1) / Math.max(.1, due - .16)));
        st.mouse = [TD.lerp(st.coin.from[0], st.coin.x, k), TD.lerp(st.coin.from[1], st.coin.y, k)];
      }
      if (st.coin && inp.click && (inp.click === 'coin' || Math.hypot(st.mouse[0] - st.coin.x, st.mouse[1] - st.coin.y) < 36)) {
        const v = st.plan[st.i]; st.rt.push(st.t - st.coin.at); st.score += v === 'big' ? 10 : 1;
        st.fx.push({ x: st.coin.x, y: st.coin.y, t: st.t, v }); if (!st.live) st.mouse = [st.coin.x, st.coin.y];
        if (st.live) PLAY.beep(v === 'big' ? 1560 : 1180, .1, .12, 'sine');
        st.coin = null; st.i++; st.next = st.t + .35 + st.R() * .5;
        if (st.i >= N) st.phase = 'end';
      }
    },
    // a scripted hand: the same reaction every time plus a little seeded noise. It is flat on purpose.
    bot(st) { if (!st.coin) return null; if (st.coin.due == null) st.coin.due = .42 + st.R() * .12; return st.t - st.coin.at >= st.coin.due ? { down: {}, press: {}, click: 'coin' } : null; },
    draw(g, st, ui, live) {
      GK.panel(g);
      const end = st.phase === 'end', plan = st.phase === 'plan', placed = Object.keys(st.plan).length;
      GK.head(g, plan ? `Place your three variants (${placed} of 3 placed)` : end ? 'Forty coins' : `Coin ${Math.min(N, st.i + 1)} of ${N}`, AX, 30, 'left', C.ink, 17);
      if (!plan) GK.text(g, end ? (live ? 'your run is over' : 'walk-through over') : live ? 'your run: click each coin as soon as it appears' : 'walk-through: a scripted hand clicks each coin about half a second after it appears', AX + AW, 30, C.muted, 13, 'right', 600);
      g.save(); g.beginPath(); g.roundRect(AX, AY, AW, AH, 12); g.clip(); g.fillStyle = '#1b2350'; g.fillRect(AX, AY, AW, AH);
      drawPlay(g, st, live, end, plan);
      g.restore();
      if (plan) { TD.stamp('Click three slots below, then start', AX + AW / 2, AY + 80, '#fff', 1, 20); ui.btn('go', placed ? 'Start the run (Space)' : 'Start with no variants (Space)', AX + AW / 2 - 150, AY + 130, 300, 50, { px: 15 }); }
      // the strip of forty
      for (let i = 0; i < N; i++) {
        const v = VAR.find(q => q.id === st.plan[i]), x = SX(i);
        g.fillStyle = v ? v.col : i < st.i ? '#e9c95a' : '#e3d8bf'; g.beginPath(); g.arc(x, SY, v ? 11 : 8, 0, TAU); g.fill();
        if (i === st.i && st.phase === 'run') { g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.arc(x, SY, 14, 0, TAU); g.stroke(); }
        if (i % 5 === 4 || i === 0) GK.text(g, String(i + 1), x, SY + 26, C.muted, 10, 'center', 600);
        if (plan) ui.hit(i, x - 12, SY - 16, 24.6, 32);
      }
      VAR.forEach((v, i) => { g.fillStyle = v.col; g.beginPath(); g.arc(AX + 10 + i * 140, SY + 48, 6, 0, TAU); g.fill(); GK.text(g, v.n, AX + 22 + i * 140, SY + 52, C.ink, 12, 'left', 600); });
      GK.text(g, 'gold: collected · beige: still to come · a plain coin pays 1, the Dragon Coin pays 10', AX + AW, SY + 52, C.muted, 12, 'right', 600);
      // the chart: your reaction time per coin
      const CX = AX + 44, CY = SY + 88, CW = AW - 60, CH = 138, top = Math.max(1, Math.ceil(Math.max(...st.rt, 0) * 5) / 5);
      const ax = GK.axes(g, CX, CY, CW, CH, { x0: .5, x1: N + .5, y0: 0, y1: top, xt: [1, 5, 10, 15, 20, 25, 30, 35, 40], yt: [0, top / 2, top], fmtY: v => v.toFixed(1) + ' s' });
      GK.text(g, live ? 'your reaction time per coin' : 'a scripted hand\'s reaction time per coin', CX, CY - 8, C.muted, 12, 'left', 700);
      Object.keys(st.plan).forEach(i => { const v = VAR.find(q => q.id === st.plan[i]); g.strokeStyle = v.col; g.lineWidth = 2; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(ax.sx(+i + 1), CY); g.lineTo(ax.sx(+i + 1), CY + CH); g.stroke(); g.setLineDash([]); });
      const avg = st.rt.map((_, i) => mean(st.rt.slice(Math.max(0, i - 4), i + 1)));
      if (avg.length > 1) GK.line(g, avg.map((v, i) => [ax.sx(i + 1), ax.sy(v)]), C.navy, 2.5);
      st.rt.forEach((v, i) => { const q = VAR.find(z => z.id === st.plan[i]); g.fillStyle = q ? q.col : 'rgba(27,35,80,.45)'; g.beginPath(); g.arc(ax.sx(i + 1), ax.sy(Math.min(top, v)), q ? 6 : 4, 0, TAU); g.fill(); });
      if (st.rt.length > 5) GK.text(g, 'line: average of the last five', CX + CW, CY - 8, C.navy, 11, 'right', 600);
      if (end && live) ui.btn('again', 'Plan another run', AX + AW / 2 - 110, AY + 100, 220, 48, { px: 15 });
      // side panel
      const first = mean(st.rt.slice(0, 10)), last = mean(st.rt.slice(-10)), ks = Object.keys(st.plan).map(Number).filter(i => i < st.rt.length && i >= 3);
      const before = mean(ks.flatMap(i => st.rt.slice(i - 3, i))), after = mean(ks.flatMap(i => st.rt.slice(i + 1, i + 4)));
      ui.stats(`<div><b>${st.rt.length >= 10 ? ms(first) : '–'}</b><span>average, coins 1 to 10</span></div><div class="${end && last > first * 1.05 ? 'r' : ''}"><b>${end ? ms(last) : '–'}</b><span>average, coins 31 to 40</span></div><div class="g"><b>${end && ks.length && after ? ms(after - before).replace(/^(\d)/, '+$1') : '–'}</b><span>three coins after a variant against three before</span></div>`);
      const drift = last - first, who = live ? 'Your' : 'The scripted';
      ui.out(plan ? 'Spend all three early and the back half is forty-odd identical clicks; hold them all for the end and the first thirty drag. Where does a change do the most?'
        : !end ? (live ? 'Click each coin as it appears.' : 'The walk-through put its three variants on coins 9, 21 and 33 (the coloured dots on the strip). The scripted hand reacts the same way every time, so its line is flat. A person\'s rarely is: play a run and look at yours.')
        : !live ? 'Flat, because the script does not get bored. Run it yourself: the variants are the only thing in forty coins that is not the coin before it.'
        : `${who} last ten coins averaged ${ms(last)} against ${ms(first)} for the first ten: ${Math.abs(drift) < first * .05 ? 'no real drift in this run' : drift > 0 ? 'slower as the coin repeated' : 'faster with practice, which is the other thing repetition does'}. ${ks.length ? `Around your variants the next three coins were ${ms(Math.abs(after - before))} ${after < before ? 'quicker' : 'slower'} than the three before.` : 'You placed no variants, so nothing broke the pattern.'} The reward never changed value; only contrast gives a designer a way to make coin 40 land like coin 1, and there are never enough variants to put one everywhere.`);
    },
  });
})();
