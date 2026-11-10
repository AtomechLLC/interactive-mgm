/* Climb Your Own Ladder (replanned page for "Ring of Blood"; Scripture: Flow Channel, Skill Test Difficulty Levers, Skill Curves).
   The learner sets how fast six opponents get, then climbs them in a timing duel. The page records their own tries and
   reaction times per rung, for the last two climbs. The walk-through's fighter is a script with a written reaction time. */
(function () {
  const C = TD.C, TAU = TD.TAU, clamp = TD.clamp, RUNGS = 6, NEED = 2, LIVES = 2, TRIES = 4;
  const climbs = []; let API = null;
  const win = (o, i) => Math.max(110, o.start - i * o.step);
  const median = a => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[b.length >> 1] : 0; };
  const TOUR = [{ start: 600, step: 20 }, { start: 600, step: 85 }];
  function newClimb(st, o) { st.o = o; st.c = { o, tries: Array(RUNGS).fill(0), hits: Array(RUNGS).fill(0), rt: [], top: 0, stuck: -1, done: false }; st.rung = 0; newTry(st); }
  function newTry(st) { st.c.tries[st.rung]++; st.dodges = 0; st.lives = LIVES; arm(st); }
  function arm(st) { st.ph = 'wait'; st.wait = .7 + st.R() * 1.1; st.sig = -9; st.msg = st.msg; }
  function resolve(st, ok, text) {
    st.ph = 'res'; st.resT = st.t; st.ok = ok; st.msg = text;
    if (ok) { st.dodges++; if (st.live) PLAY.beep(900, .1, .15); } else { st.lives--; st.c.hits[st.rung]++; if (st.live) PLAY.beep(140, .22, .2, 'sawtooth'); }
  }
  function after(st) {
    const c = st.c;
    if (st.dodges >= NEED) { c.top = st.rung + 1; if (st.rung === RUNGS - 1) return end(st); st.rung++; return newTry(st); }
    if (st.lives <= 0) { if (c.tries[st.rung] >= TRIES) { c.stuck = st.rung; return end(st); } return newTry(st); }
    arm(st);
  }
  function end(st) { st.c.done = true; st.ph = 'done'; st.at = st.t; if (st.live) { climbs.push(st.c); if (climbs.length > 2) climbs.shift(); } else st.shown.push(st.c); }
  PLAY.game('ladder', {
    dur: 72, keys: [' '],
    opts: s => ({ start: +s.querySelector('[data-k=start]').value, step: +s.querySelector('[data-k=step]').value }),
    setup(s, api) { API = api; s.querySelectorAll('input[type=range]').forEach(el => { const f = () => { el.parentNode.querySelector('i').textContent = el.value + ' ms'; }; el.addEventListener('input', f); f(); }); },
    init(o, live) { const st = { live, R: live ? Math.random : GK.rng(4), t: 0, shown: [], ph: 'ready', msg: '', skill: 0 }; if (live) { st.o = o; st.c = { o, tries: Array(RUNGS).fill(0), hits: Array(RUNGS).fill(0), rt: [], top: 0, stuck: -1 }; st.rung = 0; st.lives = LIVES; st.dodges = 0; } else newClimb(st, TOUR[0]); return st; },
    step(st, inp, dt) {
      st.t += dt; const hit = inp.press[' '] || inp.click;
      if (st.ph === 'ready') { if (hit) newClimb(st, st.o); return; }
      if (st.ph === 'done') { if (st.live && inp.click === 'again') API.start(); if (!st.live && st.shown.length < 2 && st.t - st.at > 2) { st.skill = 0; newClimb(st, TOUR[1]); } return; }
      if (st.ph === 'res') { if (st.t - st.resT > .75) after(st); return; }
      const w = win(st.o, st.rung) / 1000;
      if (st.ph === 'wait') { st.wait -= dt; if (hit) { st.c.early = (st.c.early || 0) + 1; return resolve(st, false, 'too early'); } if (st.wait <= 0) { st.ph = 'sig'; st.sig = st.t; if (st.live) PLAY.beep(1250, .05, .12, 'square'); } return; }
      if (st.ph === 'sig') {
        const rt = st.t - st.sig;
        if (hit) { st.c.rt.push(rt * 1000); return resolve(st, rt <= w, rt <= w ? `dodged in ${Math.round(rt * 1000)} ms` : `${Math.round(rt * 1000)} ms, too slow`); }
        if (rt > Math.max(w, .9)) resolve(st, false, 'no dodge');
      }
    },
    // a scripted fighter: a written reaction time that improves a little with each rung cleared
    bot(st) {
      if (st.ph !== 'sig') return null;
      if (st.botAt == null || st.botSig !== st.sig) { st.botSig = st.sig; st.botAt = (370 - st.c.top * 14 + (st.R() - .5) * 110) / 1000; }
      return st.t - st.sig >= st.botAt ? { down: {}, press: { ' ': true } } : null;
    },
    draw(g, st, ui, live) {
      GK.panel(g); const o = st.o, c = st.c, rung = st.rung || 0, w = win(o, rung);
      const AX = 24, AY = 50, AW = 520, AH = 330;
      GK.head(g, st.ph === 'ready' ? 'Set the ladder, then climb it' : `Opponent ${rung + 1} of ${RUNGS} · you have ${w} ms to dodge`, AX, 32, 'left', C.ink, 16);
      TD.floor(AX, AY, AW, AH);
      g.save(); g.beginPath(); g.rect(AX, AY, AW, AH); g.clip();
      g.strokeStyle = 'rgba(120,90,50,.5)'; g.lineWidth = 4; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(AX, AY + 40 + i * 22); g.lineTo(AX + AW, AY + 40 + i * 22); g.stroke(); }
      const px = AX + 170, py = AY + 220, ex = AX + 350, ey = AY + 180, age = st.t - (st.resT || -9);
      const dodge = st.ph === 'res' && st.ok ? Math.sin(clamp(age / .5) * Math.PI) * 46 : 0, hurt = st.ph === 'res' && !st.ok;
      // the opponent: the glove drifts while waiting and fires on the signal
      const big = 1 + rung * .07, sig = st.ph === 'sig' || (st.ph === 'res' && st.msg !== 'too early');
      const reach = sig ? clamp((st.t - (st.sig > 0 ? st.sig : st.resT)) / .12) : 0, gx = ex - 40 - reach * 90 + (st.ph === 'wait' ? Math.sin(st.t * 5) * 5 + 16 : 0), gy = ey + 26 + (st.ph === 'wait' ? Math.cos(st.t * 3.3) * 4 : 0);
      TD.shadow(ex, ey + 46 * big, 34 * big, 10); TD.foe(ex, ey, 30 * big, Math.PI, ['#c98b2b', '#d9722b', '#d24a2b', '#c0392b', '#96281b', '#6d1f1f'][rung]);
      g.fillStyle = sig ? '#e5322d' : '#8c2a22'; g.beginPath(); g.arc(gx, gy, 17 * big, 0, TAU); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke();
      if (st.ph === 'sig') { g.strokeStyle = '#e5322d'; g.lineWidth = 5; g.beginPath(); g.arc(ex, ey - 62 * big, 16, 0, TAU); g.stroke(); GK.text(g, '!', ex, ey - 54 * big, '#e5322d', 24, 'center', 800); }
      TD.shadow(px, py + 36, 26, 8); TD.player(px - dodge * .7, py + dodge * .5, -.3, 1.5, hurt ? .55 : 1);
      if (st.ph === 'res') TD.label(st.msg, px - 20, py - 62, 'center', '#fff', 14, st.ok ? 'rgba(47,174,99,.95)' : 'rgba(183,28,28,.95)');
      g.restore();
      if (st.ph === 'ready') TD.stamp(live ? 'Space to climb' : '', AX + AW / 2, AY + 70, C.navy, 1, 22);
      // dodge window bar
      const BY = AY + AH + 22; GK.text(g, 'dodge window', AX, BY + 4, C.muted, 12, 'left', 700);
      const rt = st.ph === 'sig' ? (st.t - st.sig) * 1000 : 0, full = 760;
      g.fillStyle = '#efe6d2'; g.beginPath(); g.roundRect(AX + 110, BY - 8, AW - 110, 16, 8); g.fill();
      g.fillStyle = C.good; g.beginPath(); g.roundRect(AX + 110, BY - 8, (AW - 110) * w / full, 16, 8); g.fill();
      if (st.ph === 'sig') { g.fillStyle = C.ink; g.fillRect(AX + 110 + (AW - 110) * clamp(rt / full) - 2, BY - 13, 4, 26); }
      GK.text(g, w + ' ms', AX + 116 + (AW - 110) * w / full, BY + 4, C.ink, 12, 'left', 800);
      if (c && st.ph !== 'ready') { GK.text(g, `dodges ${st.dodges} of ${NEED}`, AX, BY + 40, C.ink, 14, 'left', 700); GK.text(g, `hits you can still take: ${Math.max(0, st.lives)}`, AX + 150, BY + 40, C.ink, 14, 'left', 700); GK.text(g, `try ${c.tries[rung]} of ${TRIES}`, AX + AW, BY + 40, C.ink, 14, 'right', 700); }
      const all = (live ? climbs : st.shown).slice(-2), cur = c && !c.done && st.ph !== 'ready' ? c : null, list = cur ? [...all.slice(-1), cur] : all;
      const myRt = median((cur || list[list.length - 1] || { rt: [] }).rt);
      if (myRt) GK.text(g, `${live ? 'your' : 'the script’s'} median reaction this climb: ${Math.round(myRt)} ms`, AX, BY + 68, C.muted, 13, 'left', 600);
      if (st.ph === 'done' && live) ui.btn('again', 'Move the sliders, then climb again', AX + 60, BY + 84, 400, 40, { px: 14, on: true });
      // ladders
      const LX = 580, LW = 430;
      GK.text(g, 'tries per opponent (✕ = knocked down, ● = beaten)', LX, 32, C.muted, 12, 'left', 700);
      list.forEach((cl, k) => {
        const y0 = 50 + k * 262; GK.box(g, LX, y0, LW, 248, cl === cur ? '#fff6dd' : '#fffaf0', '#cdbf9f', 10, 1.5);
        GK.text(g, `${cl === cur ? 'This climb' : list.length > 1 && k === 0 ? 'Climb before' : 'Last climb'} · starts at ${cl.o.start} ms, ${cl.o.step} ms faster each`, LX + 14, y0 + 24, C.ink, 13, 'left', 800);
        for (let i = 0; i < RUNGS; i++) {
          const y = y0 + 52 + i * 31, wi = win(cl.o, i), here = cl === cur && i === st.rung;
          GK.text(g, `${i + 1}`, LX + 20, y + 5, here ? C.navy : C.ink, 14, 'center', 800); GK.text(g, wi + ' ms', LX + 86, y + 5, C.ink, 13, 'right', 700);
          PLAY.bar(g, LX + 96, y - 5, 110, 10, wi / 760, i < cl.top ? C.good : cl.stuck === i ? C.red : '#b9c4e8');
          for (let j = 0; j < cl.tries[i]; j++) { const last = j === cl.tries[i] - 1, won = last && i < cl.top; GK.text(g, won ? '●' : (last && here ? '…' : '✕'), LX + 226 + j * 24, y + 5, won ? C.good : C.redDk, 15, 'center', 800); }
          if (cl.stuck === i) GK.text(g, 'stuck here', LX + LW - 14, y + 5, C.redDk, 12, 'right', 800);
        }
      });
      if (!list.length) GK.wrap(g, 'Your climb appears here, with the one before it for comparison.', LX + 14, 80, LW - 28, 20, C.muted, 14, 500);
      ui.stats(`<div><b>${c ? c.top : 0} of ${RUNGS}</b><span>opponents beaten</span></div><div><b>${c ? c.tries.reduce((a, b) => a + b, 0) : 0}</b><span>tries this climb</span></div><div class="r"><b>${c ? c.hits.reduce((a, b) => a + b, 0) : 0}</b><span>hits taken</span></div>`);
      const who = live ? 'You' : 'The script', fin = list.filter(x => x.done);
      if (!fin.length || st.ph !== 'done') { ui.out(live ? 'Wait for the red glove to fire, then press Space inside the window. Pressing early counts as a hit. Two dodges beat an opponent; two hits knock you down.' : 'Two ladders with the same first opponent. The first speeds up by 20 ms a rung, the second by 85 ms. The fighter is a script whose reaction starts near 370 ms and improves 14 ms per win.'); return; }
      const d = fin[fin.length - 1], clean = d.tries.filter((t, i) => i < d.top && t === 1 && d.hits[i] === 0).length, med = Math.round(median(d.rt));
      let s = `${who} beat ${d.top} of ${RUNGS} in ${d.tries.reduce((a, b) => a + b, 0)} tries, with a median reaction of ${med} ms. `;
      const hitN = d.hits.reduce((a, b) => a + b, 0);
      if (d.stuck >= 0 && (d.early || 0) > hitN / 2) s += `The climb stopped at opponent ${d.stuck + 1}, but ${d.early} of the ${hitN} hits were presses before the glove fired, so this run says more about guessing than about the ladder. `;
      else if (d.stuck === 0) s += `The first opponent’s ${win(d.o, 0)} ms window was already out of reach, and a ladder teaches nothing if its first rung cannot be climbed. `;
      else if (d.stuck >= 0) s += `The stall came at opponent ${d.stuck + 1}, whose ${win(d.o, d.stuck)} ms window is ${win(d.o, d.stuck) < med ? 'shorter than that reaction' : 'close to that reaction'}: the step up to it was larger than what the rungs below taught. `;
      else if (clean >= 5) s += `${clean} of them fell on the first try without a hit, so each step was smaller than the skill already in hand and nothing was being asked. `;
      else s += `${clean} fell cleanly on the first try and the rest took work, which is a ladder asking for a little more each rung. `;
      if (fin.length > 1) { const p = fin[fin.length - 2]; s += `The climb before (${p.o.step} ms steps) ended at ${p.top} of ${RUNGS} in ${p.tries.reduce((a, b) => a + b, 0)} tries. `; }
      ui.out(s + (live ? 'Change the step and climb again to find where your own ladder starts to bite.' : 'Play it yourself: the numbers that fit you will not be the script’s.'));
    },
  });
})();
