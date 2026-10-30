/* Shade of Aran (post-mortem: "Shade of Aran: Unveiling the Ingredients of a Well-Crafted Boss Encounter", parts 1 and 3).
   One verb every class shares, movement, and three supers that each ask a different movement answer:
   Arcane Explosion (pulled to the middle, run out), the clockwise Blizzard (follow it round) and Flame Wreath
   (don't cross your ring). The fight is a fixed-step simulation, step(), so the walk-through and __seek are
   deterministic: the walk-through steps from t = 0 with the AI driving you; play mode steps with WASD instead.
   Numbers (radii, damage, timings) are illustrative, chosen to read clearly, not taken from the game. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp } = TD, TAU = Math.PI * 2;
  const W = 1040, H = 585, CX = 300, CY = 292, R = 262, DT = 1 / 60;
  const PH = 12, CYCLE = PH * 3, SUPERS = ['arcane', 'frost', 'fire'];
  const NAME = { arcane: 'Arcane Explosion', frost: 'Blizzard', fire: 'Flame Wreath' };
  const ICON = { arcane: 'spell_nature_starfall', frost: 'spell_frost_icestorm', fire: 'spell_fire_fire' };
  const ANSWER = { arcane: 'leave', frost: 'follow', fire: 'hold still' };
  const COLS = ['#ffb951', '#2fae63', '#2fae63', '#8a4fd6', '#8a4fd6', '#8a4fd6', '#8a4fd6', '#8a4fd6', '#8a4fd6'];
  const img = {}; Object.values(ICON).forEach(n => { const i = new Image(); i.src = `../img/${n}.jpg`; img[n] = i; });

  // seeded random so every run of the walk-through is the same picture
  const rng = seed => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const inRoom = (p, pad = 22) => { const d = Math.hypot(p.x - CX, p.y - CY), m = R - pad; if (d > m) { p.x = CX + (p.x - CX) * m / d; p.y = CY + (p.y - CY) * m / d; } };

  function fresh(o) {
    const r = rng(7), ppl = [];
    for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + .3; ppl.push({ x: CX + Math.cos(a) * 150, y: CY + Math.sin(a) * 150, hp: 100, lift: 0, home: a, you: i === 0, col: i === 0 ? C.player : COLS[i - 1], moved: 0, wreath: null, ang: 0 }); }
    return { t: 0, ppl, r, o, fx: [], log: { arcane: null, frost: null, fire: null }, inBliz: 0, detonations: 0, youHits: 0 };
  }
  const phaseAt = t => { const c = ((t % CYCLE) + CYCLE) % CYCLE, k = Math.floor(c / PH); return { sup: SUPERS[k], f: c - k * PH, n: Math.floor(t / CYCLE) }; };
  const blizAt = f => { const a = -Math.PI / 2 + (f - 1.5) / 9.5 * TAU * .85; return { x: CX + Math.cos(a) * R * .58, y: CY + Math.sin(a) * R * .58, a }; };

  // where the AI wants each person to stand this frame (the post's intended answers)
  function aiTarget(S, p, i, ph) {
    const { sup, f } = ph;
    if (sup === 'arcane' && f > 1.2 && f < 9.2) { const a = p.home; return { x: CX + Math.cos(a) * R * .86, y: CY + Math.sin(a) * R * .86 }; }
    if (sup === 'frost' && f > 1.2 && f < 11) {
      // stand on the Blizzard's ring, just behind it, and walk round after it
      const b = blizAt(f), a = b.a - .7 - (i % 5) * .24, rr = R * (.3 + (i % 4) * .17);
      return { x: CX + Math.cos(a) * rr, y: CY + Math.sin(a) * rr };
    }
    if (sup === 'fire' && f > 1) return { x: p.x, y: p.y };
    const a = p.home; return { x: CX + Math.cos(a) * 150, y: CY + Math.sin(a) * 150 };
  }

  function step(S, keys) {
    const t = S.t, ph = phaseAt(t), prev = phaseAt(t - DT), { sup, f } = ph, o = S.o;
    const newPhase = prev.sup !== sup || t === 0;
    if (newPhase) { S.ppl.forEach(p => { p.wreath = null; p.moved = 0; }); S.inBliz = 0; if (ph.n > 0 || sup !== 'arcane') {} }
    if (sup === 'arcane' && prev.f < 1 && f >= 1) {
      // pulled to the middle, slowed
      S.ppl.forEach((p, i) => { const a = i / 10 * TAU; p.x = CX + Math.cos(a) * 34; p.y = CY + Math.sin(a) * 34; });
      S.fx.push({ k: 'pull', t });
    }
    if (sup === 'fire' && prev.f < 1 && f >= 1) {
      // three random people are wreathed, and you are always one of them
      const pick = [0]; while (pick.length < 3) { const j = 1 + Math.floor(S.r() * 9); if (!pick.includes(j)) pick.push(j); }
      pick.forEach(j => { const p = S.ppl[j]; p.wreath = { x: p.x, y: p.y }; });
    }
    const slow = sup === 'arcane' && f > 1 && f < 9.2 ? .55 : 1;
    S.ppl.forEach((p, i) => {
      if (p.lift > 0) { p.lift = Math.max(0, p.lift - DT); return; }
      let vx = 0, vy = 0;
      if (p.you && keys) { vx = (keys.d ? 1 : 0) - (keys.a ? 1 : 0); vy = (keys.s ? 1 : 0) - (keys.w ? 1 : 0); }
      else {
        const tg = aiTarget(S, p, i, ph), dx = tg.x - p.x, dy = tg.y - p.y, d = Math.hypot(dx, dy);
        // under the shipped bug everyone learned to freeze while Flame Wreath is up
        const frozen = sup === 'fire' && f > 1 && (p.wreath || o.bug);
        if (d > 4 && !frozen) { vx = dx / d; vy = dy / d; }
      }
      const m = Math.hypot(vx, vy);
      if (m > 0) {
        const sp = 165 * slow * DT; p.x += vx / m * sp; p.y += vy / m * sp; p.ang = Math.atan2(vy, vx); inRoom(p);
        if (sup === 'fire' && f > 1) p.moved += sp;
      }
      // Flame Wreath: crossing your ring (or, with the bug, anyone moving) detonates it on everyone near you
      if (sup === 'fire' && f > 1 && f < 10.5) {
        const crossed = p.wreath ? dist(p, p.wreath) > 46 : (o.bug && m > 0);
        if (crossed) {
          S.fx.push({ k: 'boom', t, x: p.x, y: p.y }); S.detonations++;
          S.ppl.forEach(q => { if (dist(q, p) < 110) { q.hp -= 30; if (q.you && !p.you) S.youHits++; } });
          p.lift = 1.2; p.wreath = null; if (p.you) S.log.fire = 'crossed';
          if (o.bug) S.ppl.forEach(q => { q.wreath = null; });
        }
      }
      if (sup === 'frost' && f > 1.5 && f < 11) { const b = blizAt(f); if (dist(p, b) < 78) { p.hp -= 14 * DT; if (p.you) S.inBliz += DT; } }
      p.hp = Math.min(100, p.hp + 2.5 * DT);
    });
    if (sup === 'arcane' && prev.f < 9.2 && f >= 9.2) {
      S.fx.push({ k: 'nova', t });
      S.ppl.forEach(p => { if (Math.hypot(p.x - CX, p.y - CY) < R * .66) { p.hp -= 60; if (p.you) S.youHits++; } });
      const y = S.ppl[0]; S.log.arcane = Math.hypot(y.x - CX, y.y - CY) >= R * .66 ? 'left' : 'stayed';
    }
    if (sup === 'frost' && prev.f < 11 && f >= 11) S.log.frost = S.inBliz < .4 ? 'followed' : 'stood in it';
    if (sup === 'fire' && prev.f < 10.5 && f >= 10.5 && !S.log.fire) S.log.fire = S.ppl[0].moved < 2 || !keys ? 'held still' : 'held still';
    S.ppl.forEach(p => { if (p.hp <= 0) p.hp = 100; });
    S.fx = S.fx.filter(e => t - e.t < 1.4);
    S.t += DT;
  }

  function sketch(g, sup, f, x0, y0) {
    // the slide sketch for the current super, from the post's three drawings
    g.fillStyle = 'rgba(255,252,244,.92)'; g.strokeStyle = '#cdbf9f'; g.lineWidth = 2; g.beginPath(); g.roundRect(x0, y0, 330, 250, 12); g.fill(); g.stroke();
    const ic = img[ICON[sup]]; if (ic.complete && ic.naturalWidth) g.drawImage(ic, x0 + 16, y0 + 14, 48, 48);
    g.font = '800 21px Montserrat, Jost, sans-serif'; g.fillStyle = C.ink; g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillText(NAME[sup], x0 + 76, y0 + 28);
    g.font = '600 16px Jost, sans-serif'; g.fillStyle = C.muted; g.fillText('the answer: ' + ANSWER[sup], x0 + 76, y0 + 52);
    const cx = x0 + 165, cy = y0 + 158, r = 70, k = (f % 4) / 4;
    g.strokeStyle = C.navy; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.stroke();
    g.lineWidth = 3;
    if (sup === 'arcane') { g.strokeStyle = 'rgba(138,79,214,.9)'; g.beginPath(); g.arc(cx, cy, r * .2 + r * .6 * k, 0, TAU); g.stroke(); arrows(g, cx, cy, r * .55, r * .95); }
    if (sup === 'frost') { const a = k * TAU; g.fillStyle = 'rgba(87,182,255,.45)'; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, r, a - .5, a + .5); g.closePath(); g.fill(); g.strokeStyle = '#3c8ce6'; g.beginPath(); g.arc(cx, cy, r + 12, a - 1.1, a - .4); g.stroke(); }
    if (sup === 'fire') { [[-30, -12], [28, -20], [4, 30]].forEach(([dx, dy]) => { g.strokeStyle = C.red; g.setLineDash([5, 5]); g.beginPath(); g.arc(cx + dx, cy + dy, 18, 0, TAU); g.stroke(); g.setLineDash([]); g.fillStyle = C.player; g.beginPath(); g.arc(cx + dx, cy + dy, 6, 0, TAU); g.fill(); }); }
  }
  function arrows(g, cx, cy, r0, r1) {
    g.strokeStyle = C.player; g.lineWidth = 3;
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); g.stroke(); }
  }

  function draw(g, S) {
    const ph = phaseAt(S.t), { sup, f } = ph;
    T.use(g); g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,252,244,.8)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill();
    // the library: a round room
    g.save(); g.beginPath(); g.arc(CX, CY, R, 0, TAU); g.clip(); T.floor(CX - R, CY - R, R * 2, R * 2); g.restore();
    g.strokeStyle = C.wall; g.lineWidth = 14; g.beginPath(); g.arc(CX, CY, R + 7, 0, TAU); g.stroke();
    if (sup === 'arcane' && f > 1 && f < 9.2) {
      // the safe line: outside it the explosion misses
      const k = (f - 1) / 8.2;
      g.fillStyle = `rgba(138,79,214,${.06 + .2 * k})`; g.beginPath(); g.arc(CX, CY, R * .66, 0, TAU); g.fill();
      g.setLineDash([10, 8]); g.strokeStyle = 'rgba(138,79,214,.9)'; g.lineWidth = 3; g.stroke(); g.setLineDash([]);
      T.label(`Arcane Explosion in ${Math.max(0, 9.2 - f).toFixed(1)} s · slowed`, CX, CY - R * .66 - 18, 'center', '#5b2aa8', 15);
    }
    if (sup === 'frost' && f > 1.5 && f < 11) {
      const b = blizAt(f);
      g.setLineDash([4, 10]); g.strokeStyle = 'rgba(60,140,230,.5)'; g.lineWidth = 2; g.beginPath(); g.arc(CX, CY, R * .58, 0, TAU); g.stroke(); g.setLineDash([]);
      g.fillStyle = 'rgba(120,190,255,.38)'; g.beginPath(); g.arc(b.x, b.y, 78, 0, TAU); g.fill(); g.strokeStyle = '#3c8ce6'; g.lineWidth = 3; g.stroke();
      for (let i = 0; i < 14; i++) { const a = i * 2.4 + S.t * 3, rr = (i * 37 % 70); g.fillStyle = '#fff'; g.beginPath(); g.arc(b.x + Math.cos(a) * rr, b.y + Math.sin(a) * rr, 2.5, 0, TAU); g.fill(); }
      // arrow showing it moves clockwise
      const a2 = b.a + .5; T.label('↻ clockwise', CX + Math.cos(a2) * R * .58, CY + Math.sin(a2) * R * .58, 'center', '#1d5fae', 14);
    }
    S.ppl.forEach(p => { if (p.wreath) { g.setLineDash([6, 6]); g.strokeStyle = C.red; g.lineWidth = 3; g.fillStyle = 'rgba(229,50,45,.1)'; g.beginPath(); g.arc(p.wreath.x, p.wreath.y, 46, 0, TAU); g.fill(); g.stroke(); g.setLineDash([]); } });
    // Aran
    T.foe(CX, CY, 26, S.t * .5, '#7a4fd6', { mark: 'staff', edge: '#3d2470' });
    S.fx.forEach(e => {
      const a = 1 - (S.t - e.t) / 1.4;
      if (e.k === 'nova') { g.fillStyle = `rgba(160,110,240,${.45 * a})`; g.beginPath(); g.arc(CX, CY, R * .66, 0, TAU); g.fill(); }
      if (e.k === 'boom') { T.flash(e.x, e.y, 110, a); }
    });
    S.ppl.forEach(p => {
      const up = p.lift > 0 ? Math.sin((1.2 - p.lift) / 1.2 * Math.PI) * 40 : 0;
      if (up) T.shadow(p.x, p.y + 8, 16, 7, .3);
      T.player(p.x, p.y - up, p.ang, p.you ? 1 : .78, 1, p.col);
      if (p.you) T.label('you', p.x, p.y - up - 34, 'center', C.player, 13);
      T.hp(p.x, p.y - up + 26, 34, p.hp, 100);
    });
    sketch(g, sup, f, 690, 22);
    // what you did, per super
    g.font = '800 18px Montserrat, Jost, sans-serif'; g.fillStyle = C.ink; g.textAlign = 'left'; g.fillText('What you did', 690, 312);
    SUPERS.forEach((s, i) => {
      const y = 350 + i * 46, v = S.log[s], hit = v && !['left', 'followed', 'held still'].includes(v);
      const ic = img[ICON[s]]; if (ic.complete && ic.naturalWidth) g.drawImage(ic, 690, y - 17, 34, 34);
      g.font = '600 17px Jost, sans-serif'; g.fillStyle = C.ink; g.fillText(NAME[s], 734, y);
      g.fillStyle = !v ? C.muted : hit ? C.red : C.good; g.font = '700 17px Jost, sans-serif'; g.textAlign = 'right';
      g.fillText(v || '…', 1020, y); g.textAlign = 'left';
    });
    g.font = '600 15px Jost, sans-serif'; g.fillStyle = C.muted;
    g.fillText(`Detonations: ${S.detonations}${S.o.bug ? '  ·  shipped bug on: anyone moving detonates' : ''}`, 690, 500);
  }

  const DUR = CYCLE;
  const scenes = {};
  canvasDemo('aran', (s, cv, g) => {
    const st = { tour: true, held: false, S: fresh({ bug: false }), keys: { w: 0, a: 0, s: 0, d: 0 }, acc: 0, key: '' };
    const tourBtn = $(s, '.ar-tour'), playBtn = $(s, '.ar-play'), bug = $(s, '.ar-bug');
    const restart = () => { st.S = fresh({ bug: bug.checked }); st.acc = 0; };
    tourBtn.onclick = () => { st.tour = true; tourBtn.classList.add('on'); playBtn.classList.remove('on'); restart(); };
    playBtn.onclick = () => { st.tour = false; playBtn.classList.add('on'); tourBtn.classList.remove('on'); restart(); };
    bug.onchange = () => { st.S.o.bug = bug.checked; };
    s._key = (e, down) => { const k = e.key.toLowerCase(); if ('wasd'.includes(k) && k.length === 1) { if (st.tour && down) playBtn.onclick(); st.keys[k] = down ? 1 : 0; e.preventDefault(); } };
    function info() {
      const S = st.S, ph = phaseAt(S.t), key = [ph.sup, S.log.arcane, S.log.frost, S.log.fire, st.tour].join();
      if (key === st.key) return; st.key = key;
      say($(s, '.ar-stats'), SUPERS.map(x => `<div class="${x === ph.sup ? 'y' : ''}"><b>${ANSWER[x]}</b><span>${NAME[x]}</span></div>`).join(''));
      say($(s, '.ar-out'), {
        arcane: 'Arcane: everyone is pulled to the middle and slowed. The answer is to <b>leave</b>: get past the purple line before the explosion.',
        frost: 'Frost: the Blizzard moves clockwise around the room in a pattern you can predict. The answer is to <b>follow</b> it round, staying just behind it.',
        fire: 'Fire: three players get a ring of flame. Cross your ring and you explode on everyone near you and get knocked into the air, so the raid sees who did it. The answer is to <b>hold still</b>.',
      }[ph.sup] + (st.tour ? ' <i>Press W A S D to take over.</i>' : ''));
    }
    scenes.aran = { seek(t) { st.held = true; st.tour = true; st.S = fresh({ bug: bug.checked }); while (st.S.t < t) step(st.S, null); draw(g, st.S); }, dur: () => DUR };
    return dt => {
      if (!st.held) { st.acc += Math.min(.1, Math.max(0, dt)); while (st.acc >= DT) { step(st.S, st.tour ? null : st.keys); st.acc -= DT; } }
      if (st.tour && st.S.t > DUR) restart();
      draw(g, st.S); info();
    };
  }, {
    enter(s) { s._kd = e => s._key(e, true); s._ku = e => s._key(e, false); addEventListener('keydown', s._kd); addEventListener('keyup', s._ku); },
    leave(s) { removeEventListener('keydown', s._kd); removeEventListener('keyup', s._ku); },
  });

  /* Slide 2: why the ring of fire won. Three fire ideas from the post against one player who takes three steps to dodge:
     a debuff that explodes when you move (no warning you can see), damage that grows the more you move (the DotA Invoker
     idea), and the ring (a visible line, time to stop, and a culprit everyone can see). Pure function of time. */
  const IDEAS = [
    ['Debuff: explodes if you move', 'warning: a small icon', 'boundary: none', 'who caused it: unclear'],
    ['More damage the more you move', 'warning: none', 'boundary: none', 'who caused it: unclear'],
    ['Ring: cross it and explode', 'warning: a ring on the floor', 'boundary: the ring', 'who caused it: knocked up'],
  ];
  function drawIdeas(g, t) {
    T.use(g); g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,252,244,.8)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill();
    const c = t % 8;
    IDEAS.forEach(([title, ...rows], i) => {
      const x0 = 20 + i * 340, y0 = 20, w = 320, cx = x0 + w / 2, cy = y0 + 210;
      g.save(); g.beginPath(); g.roundRect(x0, y0, w, 330, 12); g.clip(); T.floor(x0, y0, w, 330); g.restore();
      g.strokeStyle = '#cdbf9f'; g.lineWidth = 2; g.beginPath(); g.roundRect(x0, y0, w, 330, 12); g.stroke();
      g.font = '800 17px Montserrat, Jost, sans-serif'; g.fillStyle = C.ink; g.textAlign = 'center'; g.fillText(title, cx, y0 + 28);
      // the player tries to step right three times
      const want = Math.min(3, Math.floor(c / 1.2)) * 34 + clamp((c % 1.2) / .5) * (c < 3.6 ? 34 : 0);
      let px = cx - 60 + Math.min(want, 102), boom = -1, hp = 100;
      if (i === 0) { if (want > 2) { boom = .4; px = cx - 58; } }
      if (i === 1) { hp = 100 - want * .7; }
      if (i === 2) { px = cx - 60 + Math.min(want, 40); if (want > 40 && c < 2.6) boom = -1; }
      if (i === 2) { g.setLineDash([6, 6]); g.strokeStyle = C.red; g.lineWidth = 3; g.fillStyle = 'rgba(229,50,45,.1)'; g.beginPath(); g.arc(cx - 60, cy, 46, 0, TAU); g.fill(); g.stroke(); g.setLineDash([]); }
      if (i === 0) { const ic = img.spell_fire_fire; if (ic.complete && ic.naturalWidth) g.drawImage(ic, px + 14, cy - 36, 14, 14); }
      if (boom > 0 && c > boom && c < boom + 1.2) T.flash(px, cy, 100, 1 - (c - boom) / 1.2);
      T.player(px, cy, 0, .9, 1, C.player);
      [[-1, -70], [1, -70], [0, 74]].forEach(([dx, dy], j) => T.player(cx + 40 + dx * 50, cy + dy * .7, Math.PI, .7, 1, j ? '#8a4fd6' : '#2fae63'));
      T.hp(px, cy + 28, 40, hp, 100);
      if (i === 2 && want > 40) T.label('stops at the line', px, cy - 40, 'center', C.good, 13);
      rows.forEach((r, j) => { g.font = '600 15px Jost, sans-serif'; g.fillStyle = (i === 2) ? C.good : C.muted; g.fillText(r, cx, y0 + 370 + j * 26); });
    });
    g.font = '600 16px Jost, sans-serif'; g.fillStyle = C.muted; g.textAlign = 'center';
    g.fillText('The ring gives plenty of time to see the line and stop, and the knock-up shows the raid who crossed it.', W / 2, 560);
  }
  canvasDemo('ideas', (s, cv, g) => {
    const st = { t: 0, held: false };
    scenes.ideas = { seek(t) { st.held = true; st.t = t; drawIdeas(g, t); }, dur: () => 8 };
    return dt => { if (!st.held) st.t += Math.max(0, dt); drawIdeas(g, st.t); };
  });

  window.__seek = (t, which = 'aran') => scenes[which].seek(t);
  window.__dur = (which = 'aran') => scenes[which].dur();
})();
