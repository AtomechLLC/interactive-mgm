/* Ceremony Tax (replanned page for "Satisfaction"; Scripture: Contrast Drives Attention, Satisfaction as Closing the Feedback
   Loop, The Peak-End Rule). The learner sets how long the reveal lasts for common, rare and legendary drops, plays a loot run
   on a fixed clock and taps a face after every drop. The page records seconds spent watching against seconds playing and
   the learner's own faces per tier. The drop order is fixed and stated; the walk-through's faces follow a written rule. */
(function () {
  const C = TD.C, TAU = TD.TAU, clamp = TD.clamp;
  const SEQ = 'CCRCCCRCLCCRCCCCRCLC', TIER = { C: { n: 'Common', col: '#8d949c', k: 0 }, R: { n: 'Rare', col: '#3b6fd4', k: 1 }, L: { n: 'Legendary', col: '#f39c12', k: 2 } };
  const FACES = ['flat', 'pleased', 'thrilled'], TOUR = [[1.5, 2, 3], [0, .6, 3.5]];
  const runs = []; let API = null;
  const AX = 24, AY = 64, AW = 590, AH = 300;
  function spawn(st) { st.mon = { x: AX + 70 + st.R() * (AW - 140), y: AY + 70 + st.R() * (AH - 130), born: st.t }; }
  function newRun(st, cer) { st.cer = cer; st.q = { cer, drops: 0, watch: 0, play: 0, faces: [[], [], []], bag: [] }; st.ph = 'play'; spawn(st); }
  function finish(st) { const q = st.q; q.avg = q.faces.map(a => a.length ? a.reduce((x, y) => x + y, 0) / a.length + 1 : null); q.share = q.watch / Math.max(.01, q.watch + q.play); st.ph = 'done'; st.at = st.t; if (st.live) { runs.push(q); if (runs.length > 3) runs.shift(); } else st.truns.push(q); }
  function face(g, x, y, i, r = 16, col = C.navy) { g.strokeStyle = col; g.lineWidth = 2.5; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); g.fillStyle = col; g.beginPath(); g.arc(x - r * .35, y - r * .25, r * .12, 0, TAU); g.arc(x + r * .35, y - r * .25, r * .12, 0, TAU); g.fill(); g.beginPath(); if (i === 0) { g.moveTo(x - r * .4, y + r * .4); g.lineTo(x + r * .4, y + r * .4); } else g.arc(x, y + r * (i === 2 ? .05 : .15), r * (i === 2 ? .55 : .4), .12 * Math.PI, .88 * Math.PI); g.stroke(); if (i === 2) { g.beginPath(); g.moveTo(x - r * .52, y + r * .22); g.lineTo(x + r * .52, y + r * .22); g.stroke(); } }
  PLAY.game('ceremony', {
    dur: 56, keys: ['1', '2', '3'], clickStarts: true,
    opts: s => ({ cer: ['c', 'r', 'l'].map(k => +s.querySelector(`[data-k=${k}]`).value) }),
    setup(s, api) { API = api; s.querySelectorAll('input[type=range]').forEach(el => { const f = () => { el.parentNode.querySelector('i').textContent = (+el.value).toFixed(1) + ' s'; }; el.addEventListener('input', f); f(); }); },
    init(o, live) { const st = { live, R: live ? Math.random : GK.rng(3), t: 0, RUN: live ? 40 : 18, truns: [], ph: 'ready' }; if (live) { st.cer = o.cer; newRun(st, o.cer); st.ph = 'ready'; } else newRun(st, TOUR[0]); return st; },
    step(st, inp, dt) {
      st.t += dt; const q = st.q;
      if (st.ph === 'ready') { if (inp.click) st.ph = 'play'; else return; }
      if (st.ph === 'done') { if (st.live && inp.click === 'again') API.start(); if (!st.live && st.truns.length < 2 && st.t - st.at > 2) newRun(st, TOUR[1]); return; }
      if (st.ph === 'face') { const k = inp.press['1'] || inp.click === 'f0' ? 0 : inp.press['2'] || inp.click === 'f1' ? 1 : inp.press['3'] || inp.click === 'f2' ? 2 : null; if (k == null || st.t - st.fAt < .15) return; q.faces[TIER[st.tier].k].push(k); if (q.watch + q.play >= st.RUN) return finish(st); st.ph = 'play'; spawn(st); return; }
      if (st.ph === 'cer') { q.watch += dt; st.ct += dt; if (st.live && st.cl > 0 && Math.floor(st.ct / .22) > Math.floor((st.ct - dt) / .22)) PLAY.beep(400 + st.ct / st.cl * (st.tier === 'L' ? 900 : 400), .1, .1); if (st.ct >= st.cl) { st.ph = 'face'; st.fAt = st.t; } return; }
      q.play += dt;
      if (q.watch + q.play >= st.RUN) return finish(st);
      if (inp.click === 'mon') { st.tier = SEQ[q.drops % SEQ.length]; q.drops++; q.bag.push(st.tier); st.cl = q.cer[TIER[st.tier].k]; st.ct = 0; st.ph = 'cer'; st.cx = st.mon.x; st.cy = st.mon.y; st.mon = null; if (st.live) PLAY.beep(st.tier === 'L' ? 880 : 620, .08, .12, 'square'); }
    },
    // a scripted player: clicks half a second after a monster appears and taps faces by a written rule about contrast
    bot(st) {
      const P = (o) => Object.assign({ down: {}, press: {} }, o), q = st.q;
      if (st.ph === 'play' && st.mon && st.t - st.mon.born > .5) return P({ click: 'mon' });
      if (st.ph === 'face' && st.t - st.fAt > .3) { const [c, r, l] = q.cer, k = st.tier === 'L' ? (l >= 2 && l >= 2.5 * Math.max(c, r, .4) ? 2 : 1) : st.tier === 'R' ? (r >= 2 ? 0 : 1) : (c >= 1 ? 0 : 1); return P({ press: { [String(k + 1)]: true } }); }
      return null;
    },
    draw(g, st, ui, live) {
      GK.panel(g); const q = st.q, used = q.watch + q.play;
      GK.head(g, st.ph === 'done' ? 'Run over' : `Loot run · ${Math.max(0, st.RUN - used).toFixed(0)} s left on the clock`, AX, 32, 'left', C.ink, 17);
      GK.text(g, `reveals: common ${q.cer[0].toFixed(1)} s · rare ${q.cer[1].toFixed(1)} s · legendary ${q.cer[2].toFixed(1)} s`, AX, 54, C.muted, 13, 'left', 600);
      TD.floor(AX, AY, AW, AH);
      if (st.mon && (st.ph === 'play' || st.ph === 'ready')) { const m = st.mon, pop = clamp((st.t - m.born) / .15); TD.shadow(m.x, m.y + 26, 22, 7); TD.foe(m.x, m.y, 22 * pop, Math.PI / 2, '#7a4b9a'); ui.hit('mon', m.x - 34, m.y - 34, 68, 68); }
      if (st.ph === 'cer' || st.ph === 'face') {
        const T = TIER[st.tier], p = st.cl > 0 ? clamp(st.ct / st.cl) : 1, big = clamp(st.cl / 3), x = st.cx, y = st.cy;
        g.save(); g.beginPath(); g.rect(AX, AY, AW, AH); g.clip();
        if (st.ph === 'cer' && st.cl > 0) { g.fillStyle = `rgba(20,16,30,${.55 * big * Math.sin(p * Math.PI) + .2 * big})`; g.fillRect(AX, AY, AW, AH); const w = 14 + 60 * big * Math.sin(p * Math.PI); const gr = g.createLinearGradient(x - w, 0, x + w, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.5, T.col); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.globalAlpha = .9; g.fillRect(x - w, AY, w * 2, y - AY); g.globalAlpha = 1; for (let i = 0; i < 10 * big; i++) { const a = i * 2.4 + st.t * 2, rr = 30 + 80 * p * big; g.fillStyle = T.col; g.beginPath(); g.arc(x + Math.cos(a) * rr, y + Math.sin(a) * rr * .6, 3, 0, TAU); g.fill(); } }
        g.restore();
        g.fillStyle = T.col; g.beginPath(); g.roundRect(x - 17, y - 17, 34, 34, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 3; g.stroke(); GK.text(g, st.tier, x, y + 6, '#fff', 16, 'center', 800);
        TD.label(T.n, clamp(x, AX + 60, AX + AW - 60), y + 40, 'center', '#fff', 13, T.col);
      }
      if (st.ph === 'ready') TD.stamp('Click the monster', AX + AW / 2, AY + 40, C.navy, 1, 22);
      if (st.ph === 'face') { GK.box(g, AX + 110, AY + AH - 104, 370, 96, '#fffaf0', C.navy, 12, 2); GK.text(g, 'How did that drop feel? (clock paused)', AX + 295, AY + AH - 82, C.ink, 13, 'center', 700); FACES.forEach((f, i) => { const x = AX + 130 + i * 116; ui.btn('f' + i, '', x, AY + AH - 72, 100, 58, {}); face(g, x + 24, AY + AH - 43, i, 14); GK.text(g, `${i + 1} · ${f}`, x + 68, AY + AH - 38, C.ink, 11, 'center', 700); }); }
      // tax meter and bag
      const MY = AY + AH + 26; GK.text(g, 'where the clock went', AX, MY, C.muted, 12, 'left', 700);
      g.fillStyle = '#efe6d2'; g.beginPath(); g.roundRect(AX, MY + 8, AW, 20, 10); g.fill();
      const span = Math.max(st.RUN, used); g.fillStyle = C.good; g.fillRect(AX, MY + 8, AW * q.play / span, 20); g.fillStyle = '#c0398b'; g.fillRect(AX + AW * q.play / span, MY + 8, AW * q.watch / span, 20);
      GK.text(g, `playing ${q.play.toFixed(1)} s`, AX, MY + 46, C.good, 13, 'left', 800); GK.text(g, `watching reveals ${q.watch.toFixed(1)} s (${PLAY.pct(q.watch / Math.max(.01, used))})`, AX + 150, MY + 46, '#c0398b', 13, 'left', 800); GK.text(g, `${q.drops} drops`, AX + AW, MY + 46, C.ink, 13, 'right', 800);
      q.bag.slice(-34).forEach((t, i) => { g.fillStyle = TIER[t].col; g.beginPath(); g.roundRect(AX + i * 17, MY + 58, 14, 14, 3); g.fill(); });
      if (st.ph === 'done' && live) ui.btn('again', 'Move the sliders, then run again', AX + 120, MY + 84, 350, 40, { px: 14, on: true });
      GK.text(g, 'Drops arrive in a fixed order: mostly common, a rare every few, a legendary on the 9th and 19th.', AX, 574, C.muted, 11, 'left', 500);
      // runs
      const RX = 640, RW = 376, list = (live ? runs : st.truns).slice(-3), show = st.ph === 'done' ? list : [...list.slice(-2), q];
      GK.text(g, 'average face per tier, 1 to 3', RX, 32, C.muted, 12, 'left', 700);
      show.forEach((r, k) => {
        const y = 46 + k * 172, cur = r === q && st.ph !== 'done'; GK.box(g, RX, y, RW, 160, cur ? '#fff6dd' : '#fffaf0', '#cdbf9f', 10, 1.5);
        GK.text(g, cur ? 'This run' : `Run ${k + 1}`, RX + 14, y + 24, C.ink, 14, 'left', 800); GK.text(g, `${r.drops} drops · ${PLAY.pct(r.watch / Math.max(.01, r.watch + r.play))} watching`, RX + RW - 14, y + 24, C.navy, 13, 'right', 800);
        ['C', 'R', 'L'].forEach((t, i) => { const a = r.faces[i], v = a.length ? a.reduce((x, z) => x + z, 0) / a.length + 1 : null, yy = y + 56 + i * 34; g.fillStyle = TIER[t].col; g.beginPath(); g.roundRect(RX + 14, yy - 11, 14, 14, 3); g.fill(); GK.text(g, `${TIER[t].n} · ${r.cer[i].toFixed(1)} s`, RX + 36, yy + 1, C.ink, 12, 'left', 700); PLAY.bar(g, RX + 170, yy - 9, 130, 12, v ? (v - 1) / 2 + .04 : 0, TIER[t].col); GK.text(g, v ? v.toFixed(1) : '–', RX + 310, yy + 1, C.ink, 13, 'left', 800); if (v) face(g, RX + 350, yy - 3, Math.round(v) - 1, 10, C.ink); });
      });
      if (!show.length) GK.wrap(g, 'Your runs appear here, up to three, so you can compare settings.', RX + 14, 76, RW - 28, 20, C.muted, 14, 500);
      ui.stats(`<div class="g"><b>${q.play.toFixed(0)} s</b><span>playing</span></div><div class="r"><b>${q.watch.toFixed(0)} s</b><span>watching reveals</span></div><div><b>${q.drops}</b><span>drops this run</span></div>`);
      const who = live ? 'You' : 'The script';
      if (st.ph !== 'done') { ui.out(live ? 'Click each monster. The reveal plays for as long as you set, and the clock keeps running while it does. Then tap a face.' : 'Two runs on the same clock. First every tier gets a show. Then the lower tiers go quiet and only the legendary keeps one. The faces follow a written rule, not a person.'); return; }
      const d = q, f = v => v == null ? 'none seen' : v.toFixed(1), prev = list.length > 1 ? list[list.length - 2] : null;
      let s = `${who} spent ${PLAY.pct(d.share)} of the clock watching reveals and collected ${d.drops} drops. Faces: common ${f(d.avg[0])}, rare ${f(d.avg[1])}, legendary ${f(d.avg[2])}. `;
      if (d.avg[2] != null && d.avg[0] != null) s += d.avg[2] - d.avg[0] >= .8 ? 'The legendary stood clear of the commons. ' : 'The legendary landed close to a common. ';
      if (prev && prev.avg[2] != null && d.avg[2] != null) s += `The run before: ${PLAY.pct(prev.share)} watching, ${prev.drops} drops, legendary ${f(prev.avg[2])}. ` + (Math.abs(d.avg[2] - prev.avg[2]) < .25 ? 'The legendary face did not move between them, so on this evidence the settings changed the cost more than the feeling. ' : `The legendary face ${d.avg[2] > prev.avg[2] ? 'rose' : 'fell'} with the ${d.cer[0] + d.cer[1] < prev.cer[0] + prev.cer[1] ? 'quieter' : 'louder'} lower tiers. `);
      ui.out(s + (live ? 'A handful of taps is thin evidence; the seconds are exact.' : 'Set the reveals yourself and tap your own faces.'));
    },
  });
})();
