/* The Fifth Rule (replanned page for "Netherspite"; Scripture: Complexity Budget, Working Memory Limits, Skill Test
   Difficulty Levers). A dodge pattern the learner plays, then five rule cards offered one at a time: keep or reject, and
   play a round after each. The brief asks for three twists and there are four slots. The page records the learner's own
   hits per round. The walk-through's player is a steering script that notices each zone 0.4 s late and attends to two at a time. */
(function () {
  const C = TD.C, TAU = TD.TAU, clamp = TD.clamp;
  const AX = 24, AY = 56, AW = 560, AH = 392, CX = AX + AW / 2, CY = AY + AH / 2, PR = 10, SPD = 215, ZR = 66, ABSORB = 3, SLOTS = 4, BRIEF = 3;
  const CARDS = [{ id: 'drift', n: 'Drifting zones', twist: true, tip: 'Red zones creep toward you while they charge.', from: 'the encounter designer' }, { id: 'knock', n: 'Knockback', twist: true, tip: 'Every 6 s a pulse shoves you away from the centre.', from: 'the boss artist' }, { id: 'purple', n: 'Stand in purple', twist: true, tip: 'Every third zone is purple. Be inside it when it goes off.', from: 'the lead' }, { id: 'long', n: 'Longer warning', twist: false, tip: 'Forgiveness: every zone charges half a second longer. Uses a slot.', from: 'QA' }, { id: 'double', n: 'Second zone', twist: true, tip: 'Each red zone comes with a twin placed where you are heading.', from: 'the producer' }];
  let lastLive = null;
  const has = (st, id) => st.kept.includes(id);
  function newRound(st) { st.r = { t: 0, hits: 0, zones: [], next: .8, n: 0, knock: 5, shove: null, hitT: -9 }; st.ph = 'play'; }
  function hit(st, why) { st.r.hits++; st.r.hitT = st.t; st.r.why = why; if (st.live) PLAY.beep(150, .18, .18, 'sawtooth'); }
  function endRound(st) { st.log.push({ hits: st.r.hits, kept: st.kept.slice(), card: st.offer > 0 ? CARDS[st.offer - 1] : null, took: st.took }); if (st.offer >= CARDS.length) { st.ph = 'end'; if (st.live) lastLive = st; } else { st.ph = 'offer'; st.at = st.t; } }
  PLAY.game('fifth', {
    dur: 58, keys: ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'w', 'a', 's', 'd', 'k', 'r', ' '],
    init(o, live) { const st = { live, R: live ? Math.random : GK.rng(6), t: 0, ROUND: live ? 14 : 7.5, kept: [], offer: 0, log: [], x: CX, y: CY + 60, vx: 0, vy: 0, ph: live ? 'ready' : 'play', took: null }; newRound(st); if (live) st.ph = 'ready'; return st; },
    step(st, inp, dt) {
      st.t += dt;
      if (st.ph === 'ready') { if (inp.press[' '] || inp.click) st.ph = 'play'; return; }
      if (st.ph === 'end') { if (st.live && inp.click === 'again') Object.assign(st, this.init({}, true), { ph: 'play' }); return; }
      if (st.ph === 'offer') {
        const full = st.kept.length >= SLOTS, keep = (inp.press.k || inp.click === 'keep' || inp.cmd === 'keep') && !full, rej = inp.press.r || inp.click === 'rej' || inp.cmd === 'rej';
        if (st.t - st.at < .4 || (!keep && !rej)) return;
        st.took = !!keep; if (keep) st.kept.push(CARDS[st.offer].id); st.offer++; newRound(st); return;
      }
      const r = st.r, d = inp.down || {}; r.t += dt;
      let vx = inp.vx != null ? inp.vx : (d.ArrowRight || d.d ? 1 : 0) - (d.ArrowLeft || d.a ? 1 : 0), vy = inp.vy != null ? inp.vy : (d.ArrowDown || d.s ? 1 : 0) - (d.ArrowUp || d.w ? 1 : 0);
      const m = Math.hypot(vx, vy); if (m > 1) { vx /= m; vy /= m; } st.vx = vx; st.vy = vy;
      if (r.shove) { const k = Math.min(dt, r.shove.left); st.x += r.shove.dx * k / .25; st.y += r.shove.dy * k / .25; r.shove.left -= k; if (r.shove.left <= 0) r.shove = null; }
      else { st.x += vx * SPD * dt; st.y += vy * SPD * dt; }
      st.x = clamp(st.x, AX + PR, AX + AW - PR); st.y = clamp(st.y, AY + PR, AY + AH - PR);
      const T = .9 + (has(st, 'long') ? .5 : 0);
      r.next -= dt;
      if (r.next <= 0 && r.t < st.ROUND - .6) {
        r.next = 1.3; r.n++;
        if (has(st, 'purple') && r.n % 3 === 0) { const a = st.R() * TAU, dd = 170 + st.R() * 70; r.zones.push({ x: clamp(st.x + Math.cos(a) * dd, AX + ZR, AX + AW - ZR), y: clamp(st.y + Math.sin(a) * dd, AY + ZR, AY + AH - ZR), born: r.t, T: T + .9, purple: true }); }
        else { r.zones.push({ x: st.x, y: st.y, born: r.t, T }); if (has(st, 'double')) r.zones.push({ x: clamp(st.x + (vx || 1) * 125, AX + 20, AX + AW - 20), y: clamp(st.y + vy * 125, AY + 20, AY + AH - 20), born: r.t, T }); }
      }
      r.zones.forEach(z => {
        if (z.done) return;
        if (!z.purple && has(st, 'drift')) { const dd = Math.hypot(st.x - z.x, st.y - z.y) || 1; z.x += (st.x - z.x) / dd * 60 * dt; z.y += (st.y - z.y) / dd * 60 * dt; }
        if (r.t - z.born >= z.T) { z.done = r.t; const inside = Math.hypot(st.x - z.x, st.y - z.y) < ZR; if (z.purple ? !inside : inside) hit(st, z.purple ? 'outside purple' : 'caught in red'); else if (st.live && z.purple) PLAY.beep(900, .08, .1); }
      });
      r.zones = r.zones.filter(z => !z.done || r.t - z.done < .35);
      if (has(st, 'knock')) { r.knock -= dt; if (r.knock <= 0) { r.knock = 6; const dx = st.x - CX, dy = st.y - CY, dd = Math.hypot(dx, dy) || 1; r.shove = { dx: dx / dd * 150, dy: dy / dd * 150, left: .25 }; r.pulse = r.t; if (st.live) PLAY.beep(260, .2, .14, 'square'); } }
      if (r.t >= st.ROUND) endRound(st);
    },
    // a steering script: runs from red zones about to go off and toward purple ones; it notices each zone 0.4 s late and attends to the two most urgent
    bot(st) {
      if (st.ph === 'offer') return st.t - st.at > 1.3 ? { down: {}, press: {}, cmd: CARDS[st.offer].id === 'long' ? 'rej' : 'keep' } : null;
      if (st.ph !== 'play') return null;
      const r = st.r; let fx = (CX - st.x) * .004, fy = (CY - st.y) * .004, goal = null;
      r.zones.filter(z => !z.done && r.t - z.born >= .4).sort((a, b) => (a.T - (r.t - a.born)) - (b.T - (r.t - b.born))).slice(0, 2).forEach(z => { const dx = st.x - z.x, dy = st.y - z.y, dd = Math.hypot(dx, dy) || 1, left = z.T - (r.t - z.born); if (z.purple) { if (left < dd / SPD + .7) goal = z; } else if (dd < ZR + 34) { const w = 1.6 / Math.max(.15, left); fx += dx / dd * w; fy += dy / dd * w; } });
      if (goal) { const dx = goal.x - st.x, dy = goal.y - st.y, dd = Math.hypot(dx, dy) || 1; if (dd > 14) { fx += dx / dd * 2.2; fy += dy / dd * 2.2; } else { fx = 0; fy = 0; } }
      else if (Math.hypot(fx, fy) < .25) { fx += Math.cos(r.t * 1.3) * .5; fy += Math.sin(r.t * 1.3) * .5; }
      const m = Math.hypot(fx, fy) || 1; return { down: {}, press: {}, vx: fx / Math.max(1, m), vy: fy / Math.max(1, m) };
    },
    draw(g, st, ui, live) {
      GK.panel(g); const r = st.r, twists = st.kept.filter(id => CARDS.find(c => c.id === id).twist).length;
      GK.head(g, st.ph === 'end' ? 'The fight as you shipped it' : `Round ${st.log.length + 1} of ${CARDS.length + 1} · ${Math.max(0, st.ROUND - r.t).toFixed(0)} s`, AX, 32, 'left', C.ink, 17);
      for (let i = 0; i < ABSORB; i++) { g.fillStyle = i < ABSORB - r.hits ? C.good : '#d9cdb2'; g.beginPath(); g.arc(AX + AW - 150 + i * 20, 27, 7, 0, TAU); g.fill(); } GK.text(g, `hits ${r.hits}`, AX + AW, 32, r.hits > ABSORB ? C.redDk : C.ink, 14, 'right', 800);
      TD.floor(AX, AY, AW, AH); g.save(); g.beginPath(); g.rect(AX, AY, AW, AH); g.clip();
      r.zones.forEach(z => { const p = clamp((r.t - z.born) / z.T), col = z.purple ? '142,91,208' : '229,50,45'; if (z.done) { g.fillStyle = `rgba(${col},${.7 * (1 - (r.t - z.done) / .35)})`; g.beginPath(); g.arc(z.x, z.y, ZR, 0, TAU); g.fill(); return; } g.fillStyle = `rgba(${col},${.12 + .3 * p})`; g.beginPath(); g.arc(z.x, z.y, ZR, 0, TAU); g.fill(); g.strokeStyle = `rgba(${col},.9)`; g.lineWidth = 3; g.stroke(); g.beginPath(); g.arc(z.x, z.y, ZR * (1 - p) + 2, 0, TAU); g.lineWidth = 2; g.stroke(); if (z.purple) GK.text(g, 'stand here', z.x, z.y + 4, `rgba(${col},1)`, 12, 'center', 800); });
      if (has(st, 'knock')) { const left = r.knock; if (left < 1) { g.strokeStyle = 'rgba(245,176,65,.9)'; g.lineWidth = 5; g.beginPath(); g.arc(CX, CY, 30 + (1 - left) * 60, 0, TAU); g.stroke(); GK.text(g, 'pulse', CX, CY + 5, '#8a6500', 13, 'center', 800); } if (r.pulse != null && r.t - r.pulse < .4) { g.strokeStyle = `rgba(245,176,65,${1 - (r.t - r.pulse) / .4})`; g.lineWidth = 8; g.beginPath(); g.arc(CX, CY, 90 + (r.t - r.pulse) * 600, 0, TAU); g.stroke(); } }
      TD.shadow(st.x, st.y + 12, 12, 4); TD.player(st.x, st.y, Math.atan2(st.vy, st.vx || .001), .8, st.t - r.hitT < .3 ? .4 : 1);
      if (st.t - r.hitT < .8) TD.label(r.why, st.x, st.y - 30, 'center', '#fff', 12, 'rgba(183,28,28,.95)');
      g.restore();
      if (st.ph === 'ready') TD.stamp('Space, then arrows or WASD', CX, AY + 60, C.navy, 1, 20);
      // kept slots
      GK.text(g, `slots ${st.kept.length} of ${SLOTS} · the brief wants ${BRIEF} twists · you have ${twists}`, AX, AY + AH + 22, C.ink, 13, 'left', 700);
      for (let i = 0; i < SLOTS; i++) { const id = st.kept[i], c = id && CARDS.find(c => c.id === id), x = AX + i * 142; GK.box(g, x, AY + AH + 32, 134, 34, c ? (c.twist ? '#fff3cf' : '#e6f3e4') : '#fffaf0', '#cdbf9f', 8, 1.5); GK.text(g, c ? c.n : 'empty', x + 67, AY + AH + 54, c ? C.ink : C.muted, 12, 'center', 700); }
      if (st.ph === 'offer') {
        const c = CARDS[st.offer], full = st.kept.length >= SLOTS; GK.box(g, CX - 200, CY - 100, 400, 200, '#fffaf0', C.navy, 14, 3);
        GK.text(g, `Card ${st.offer + 1} of ${CARDS.length}, from ${c.from}`, CX, CY - 70, C.muted, 12, 'center', 700); GK.text(g, c.n, CX, CY - 38, C.ink, 22, 'center', 800); GK.wrap(g, c.tip, CX - 170, CY - 8, 340, 19, C.ink, 14, 600);
        if (full) GK.text(g, 'No slot left.', CX - 100, CY + 66, C.redDk, 13, 'center', 700); else ui.btn('keep', 'K · keep it', CX - 180, CY + 44, 170, 40, { px: 14, on: true }); ui.btn('rej', 'R · reject', CX + 10, CY + 44, 170, 40, { px: 14 });
      }
      if (st.ph === 'end' && live) ui.btn('again', 'Start over', CX - 100, CY - 20, 200, 40, { px: 14, on: true });
      // hits per round
      const RX = 616, RW = 400, base = 300, col = 56;
      GK.text(g, 'hits in each round', RX, 32, C.muted, 12, 'left', 700); GK.box(g, RX, 46, RW, 330, '#fffaf0', '#cdbf9f', 10, 1.5);
      const sc = 22, ly = base - ABSORB * sc; g.strokeStyle = C.redDk; g.setLineDash([6, 5]); g.lineWidth = 1.5; g.beginPath(); g.moveTo(RX + 14, ly); g.lineTo(RX + RW - 14, ly); g.stroke(); g.setLineDash([]); GK.text(g, `the fight absorbs ${ABSORB}`, RX + RW - 16, ly - 6, C.redDk, 11, 'right', 700);
      const rows = st.ph === 'play' || st.ph === 'ready' ? [...st.log, { hits: r.hits, cur: true, card: st.offer > 0 ? CARDS[st.offer - 1] : null, took: st.took }] : st.log;
      rows.forEach((q, i) => { const x = RX + 30 + i * col, h = Math.min(10.5, q.hits) * sc; g.fillStyle = q.cur ? '#f5b041' : q.hits > ABSORB ? C.red : C.navy; g.fillRect(x, base - h, 36, h); GK.text(g, String(q.hits), x + 18, base - h - 6, C.ink, 13, 'center', 800); GK.text(g, i === 0 ? 'base' : (q.took ? '+ ' : '✕ '), x + 18, base + 18, C.muted, 11, 'center', 700); if (i > 0) { g.save(); g.translate(x + 22, base + 30); g.rotate(.5); GK.text(g, q.card.n, 0, 0, q.took ? C.ink : C.muted, 10, 'left', q.took ? 800 : 500); g.restore(); } });
      GK.wrap(g, '+ kept, ✕ rejected. Every round uses all the cards kept so far.', RX, 400, RW, 17, C.muted, 12, 500);
      ui.stats(`<div class="r"><b>${r.hits}</b><span>hits this round</span></div><div><b>${twists} of ${BRIEF}</b><span>twists the brief wants</span></div><div><b>${st.kept.length} of ${SLOTS}</b><span>slots used</span></div>`);
      const who = live ? 'You' : 'The script';
      if (st.ph !== 'end') { ui.out(st.ph === 'offer' ? 'Each card sounds reasonable on its own. Keep it or send it back, then play the fight with it.' : (live ? 'Red zones drop on you and go off when the inner ring closes. Step out in time.' : 'A steering script plays each round and keeps every twist it is handed. It turns down the forgiveness card.')); return; }
      const L = st.log; let jump = 0, ji = 0; for (let i = 1; i < L.length; i++) if (L[i].hits - L[i - 1].hits > jump) { jump = L[i].hits - L[i - 1].hits; ji = i; }
      const over = L.filter(q => q.hits > ABSORB).length, fin = L[L.length - 1];
      ui.out(`${who} took ${L.map(q => q.hits).join(', ')} hits across the rounds and finished with ${twists} twist${twists === 1 ? '' : 's'}${twists >= BRIEF ? ', which meets the brief' : `, short of the ${BRIEF} the brief asked for`}. ` + (jump > 0 ? `The largest jump, +${jump}, came in round ${ji + 1}${L[ji].took ? ` when ${L[ji].card.n} joined ${L[ji].kept.length - 1} other card${L[ji].kept.length - 1 === 1 ? '' : 's'}` : ' with no new card added, so that change was in the play and not in the rules'}. ` : 'No round was worse than the one before it. ') + (over ? `${over} round${over === 1 ? '' : 's'} went past what the fight absorbs. ` : 'No round went past what the fight absorbs. ') + 'No card was unreasonable alone. What a card costs depends on the cards already in play, so a complexity budget is counted on the whole fight.');
    },
  });
})();
