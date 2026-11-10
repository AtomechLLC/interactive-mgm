/* Where Are You Looking? (replanned page for the Clarity lesson and the FPS barks post; Scripture: Follow the Eyes,
   Contrast Drives Attention). The learner steers a disc through hazards with the mouse and presses Space when their
   dash state changes. The cue's placement is the only thing that differs between rounds; their reaction times are the data. */
(function () {
  const C = TD.C, { clamp } = TD;
  const AX = 20, AY = 50, AW = 640, AH = 500, EVENTS = 8, MISS = 2.5;
  const PLACES = ['HUD corner', 'On the character', 'Among five others', 'Sound'];
  const results = [null, null, null, null];
  const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
  const BOT_RT = [.82, .36, .62, .4];

  function fresh(place, live, R) {
    const balls = Array.from({ length: 5 }, (_, i) => { const a = R() * 6.28; return { x: AX + 80 + R() * (AW - 160), y: AY + 60 + R() * (AH - 120), vx: Math.cos(a) * 150, vy: Math.sin(a) * 150 }; });
    return { place, balls, px: AX + AW / 2, py: AY + AH / 2, cue: null, next: 2 + R() * 1.5, n: 0, rts: [], fa: 0, hits: 0, safe: 0, fx: [], pips: [0, 0, 0, 0, 0], pipT: 1, rt: 0, done: false };
  }
  PLAY.game('looking', {
    dur: 48, keys: [' '],
    opts: s => ({ place: +s.querySelector('.wl-place .on').dataset.v }),
    tourOpts: { place: 0 },
    setup(s, api) { const b = [...s.querySelectorAll('.wl-place .btn')]; b.forEach(x => x.onclick = () => { b.forEach(y => y.classList.toggle('on', y === x)); api.start(); }); },
    init(o, live) { const R = live ? Math.random : GK.rng(3); return { live, R, t: 0, ready: live, res: live ? results : [null, null, null, null], ...fresh(o.place, live, R) }; },
    step(st, inp, dt) {
      if (st.ready) { if (inp.press[' '] || inp.click) st.ready = false; return; }
      st.t += dt;
      if (st.done) {
        if (!st.live && st.t - st.doneAt > 1.2) { const res = st.res, t = st.t; Object.assign(st, fresh((st.place + 1) % 4, false, st.R)); st.res = res; st.t = t; st.next += t; st.pipT += t; }
        else if (st.live && inp.press[' ']) { const t = st.t; Object.assign(st, fresh(st.place, true, st.R)); st.t = t; st.next += t; st.pipT += t; }
        return;
      }
      // steer: the disc eases toward the mouse (the scripted player circles and sidesteps)
      let [mx, my] = inp.mouse || [st.px, st.py];
      mx = clamp(mx, AX + 20, AX + AW - 20); my = clamp(my, AY + 20, AY + AH - 20);
      st.px += (mx - st.px) * Math.min(1, dt * 12); st.py += (my - st.py) * Math.min(1, dt * 12);
      st.balls.forEach(b => {
        b.x += b.vx * dt; b.y += b.vy * dt;
        if (b.x < AX + 14 || b.x > AX + AW - 14) { b.vx *= -1; b.x = clamp(b.x, AX + 14, AX + AW - 14); }
        if (b.y < AY + 14 || b.y > AY + AH - 14) { b.vy *= -1; b.y = clamp(b.y, AY + 14, AY + AH - 14); }
        if (st.t > st.safe && Math.hypot(b.x - st.px, b.y - st.py) < 32) { st.hits++; st.safe = st.t + 1; st.fx.push({ t: st.t, s: 'hit' }); }
      });
      if (st.place === 2 && st.t >= st.pipT) { st.pips[Math.floor(st.R() * 5)] = Math.floor(st.R() * 3); st.pipT = st.t + .5 + st.R() * .9; }
      if (!st.cue && st.t >= st.next) { st.cue = { at: st.t }; if (st.place === 3 && st.live) { PLAY.beep(880, .09, .25, 'square'); setTimeout(() => PLAY.beep(660, .12, .25, 'square'), 90); } }
      const end = rt => { st.rts.push(rt); st.cue = null; st.n++; st.next = st.t + 1.8 + st.R() * 2.2; if (st.n >= EVENTS) { st.done = true; st.doneAt = st.t; st.res[st.place] = { rts: st.rts.slice(), fa: st.fa, hits: st.hits }; } };
      if (inp.press[' ']) { if (st.cue) { st.fx.push({ t: st.t, s: Math.round((st.t - st.cue.at) * 1000) + ' ms' }); end(st.t - st.cue.at); } else { st.fa++; st.fx.push({ t: st.t, s: 'false alarm' }); } }
      else if (st.cue && st.t - st.cue.at > MISS) { st.fx.push({ t: st.t, s: 'missed' }); end(MISS); }
    },
    bot(st) {
      const a = st.t * 1.1, mouse = [AX + AW / 2 + Math.cos(a) * 200, AY + AH / 2 + Math.sin(a * 1.3) * 150];
      const rt = BOT_RT[st.place] * (.85 + .3 * ((st.n * 37) % 10) / 10);
      const fa = st.place === 2 && !st.cue && st.n === 3 && st.fa < 1 && st.t > st.next - 1;
      return { down: {}, press: (st.cue && st.t - st.cue.at >= rt) || fa ? { ' ': true } : {}, mouse };
    },
    draw(g, st, ui, live) {
      GK.panel(g);
      GK.head(g, `Round: ${PLACES[st.place].toLowerCase()}`, AX, 34, 'left', C.ink, 17);
      GK.text(g, `change ${Math.min(EVENTS, st.n + (st.cue ? 1 : 0))} of ${EVENTS}`, AX + AW, 34, C.muted, 12, 'right', 700);
      g.save(); g.beginPath(); g.roundRect(AX, AY, AW, AH, 12); g.clip();
      TD.floor(AX, AY, AW, AH);
      st.balls.forEach(b => TD.foe(b.x, b.y, 14, Math.atan2(b.vy, b.vx), C.red));
      const spent = !!st.cue, col = spent ? C.red : C.player;
      TD.player(st.px, st.py, -Math.PI / 2, 1, st.t < st.safe ? .5 : 1, st.place === 1 ? col : '#8b8fa8');
      if (st.place === 2) {
        const cols = [C.player, C.gold, C.red];
        for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + i * Math.PI / 3; g.fillStyle = i === 0 ? col : cols[st.pips[i - 1]]; g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(st.px + Math.cos(a) * 31, st.py + Math.sin(a) * 31, 7, 0, TD.TAU); g.fill(); g.stroke(); }
      }
      if (st.place === 0) {
        GK.box(g, AX + 12, AY + 12, 120, 46, 'rgba(21,32,68,.85)', null, 8);
        g.fillStyle = col; g.beginPath(); g.arc(AX + 36, AY + 35, 12, 0, TD.TAU); g.fill();
        GK.text(g, spent ? 'dash spent' : 'dash ready', AX + 56, AY + 40, '#fff', 13, 'left', 700);
      }
      st.fx.forEach(f => { const a = 1 - (st.t - f.t) / .9; TD.popText(f.s, st.px, st.py - 50 - 20 * (1 - a), f.s === 'hit' || f.s === 'missed' || f.s === 'false alarm' ? C.redDk : C.good, a); });
      g.restore();
      GK.text(g, st.place === 2 ? 'The top pip is your dash. The other five are ammo, buffs and so on.' : st.place === 3 ? 'Nothing on screen changes: listen for the two-tone cue.' : st.place === 1 ? 'The disc itself turns red when the dash is spent.' : 'The dash state is in the top-left corner.', AX, AY + AH + 22, C.muted, 12, 'left', 600);
      if (st.ready) TD.stamp('Space to start. Mouse steers.', AX + AW / 2, AY + AH / 2 - 90, C.navy, 1, 22);
      if (st.done && live) TD.stamp('Round over. Pick another placement on the right', AX + AW / 2, AY + 70, C.navy, 1, 18);
      // results: one row per placement, a dot per noticed change
      const RX = 690, RW = 330, res = st.res;
      GK.head(g, live ? 'Your reaction times' : 'A scripted player\'s times', RX, 34, 'left', C.ink, 17);
      const sx = v => RX + clamp(v / MISS) * RW;
      PLACES.forEach((n, i) => {
        const y = 62 + i * 112, r = res[i], on = st.place === i;
        GK.box(g, RX - 8, y, RW + 16, 100, on ? '#fff3d6' : '#fffaf0', on ? C.gold : '#cdbf9f', 9, on ? 2.5 : 1.5);
        GK.text(g, n, RX, y + 20, C.ink, 14, 'left', 800);
        g.strokeStyle = '#cdbf9f'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(RX, y + 62); g.lineTo(RX + RW, y + 62); g.stroke();
        [0, .5, 1, 1.5, 2, 2.5].forEach(v => { g.beginPath(); g.moveTo(sx(v), y + 58); g.lineTo(sx(v), y + 66); g.stroke(); GK.text(g, v ? v + ' s' : '0', sx(v), y + 80, C.muted, 10, v === 2.5 ? 'right' : v ? 'center' : 'left', 600); });
        const rts = on && !st.done ? st.rts : r ? r.rts : [];
        rts.forEach(v => { g.fillStyle = v >= MISS ? C.redDk : C.player; g.globalAlpha = .75; g.beginPath(); g.arc(sx(v), y + 62, 6, 0, TD.TAU); g.fill(); g.globalAlpha = 1; });
        if (rts.length) {
          const m = mean(rts); g.strokeStyle = C.navy; g.lineWidth = 3; g.beginPath(); g.moveTo(sx(m), y + 46); g.lineTo(sx(m), y + 74); g.stroke();
          GK.text(g, `${Math.round(m * 1000)} ms`, RX + RW, y + 20, C.ink, 15, 'right', 800);
          const fa = on && !st.done ? st.fa : r ? r.fa : 0; if (fa) GK.text(g, `${fa} false alarm${fa > 1 ? 's' : ''}`, RX + RW, y + 38, C.redDk, 11, 'right', 700);
        } else GK.text(g, 'not played yet', RX + RW, y + 20, C.muted, 12, 'right', 600);
      });
      GK.text(g, 'Blue dots: each change you noticed. Line: your average. Red: missed.', RX, 62 + 4 * 112 + 12, C.muted, 11, 'left', 500);
      const have = res.map(r => r ? mean(r.rts) : null), m = st.rts.length ? mean(st.rts) : 0;
      ui.stats(`<div><b>${st.rts.length ? Math.round(m * 1000) + ' ms' : '–'}</b><span>average this round</span></div><div class="${st.fa ? 'r' : ''}"><b>${st.fa}</b><span>false alarms</span></div><div class="${st.hits ? 'r' : 'g'}"><b>${st.hits}</b><span>hazards that hit you</span></div>`);
      const played = have.filter(v => v != null).length;
      ui.out(played < 2 ? 'Play at least two placements. The only thing that changes between rounds is where the cue lives.'
        : have[0] != null && have[1] != null && have[2] != null && have[2] > have[1] ? `On the character you noticed in ${Math.round(have[1] * 1000)} ms, against ${Math.round(have[0] * 1000)} ms in the corner. Put five more states there and it rose to ${Math.round(have[2] * 1000)} ms: the spot is fast and it only holds a few cues.${have[3] != null ? ' Sound cost your eyes nothing.' : ''}`
        : have[0] != null && have[1] != null ? `Corner ${Math.round(have[0] * 1000)} ms, character ${Math.round(have[1] * 1000)} ms. Your eyes were on the disc you were steering, so the corner had to wait for a glance. Now crowd the character and try sound.`
        : 'Compare the corner with the character first: that pair shows where your eyes were.');
    },
  });
})();
