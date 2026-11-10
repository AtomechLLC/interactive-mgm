/* Clutch Generator (replanned page for "The Ogre Turn"; Scripture: The Peak-End Rule, Emotional Satisfaction, Fun as
   Inconsistent Success). The learner tunes the enemy's hit chance and damage, plays ten short firefights and marks the ones
   they would tell a friend about. Every shot is a real roll at the shown odds. The page plots each fight by its tightest
   moment and whether that moment followed a choice, with the learner's own marks. The walk-through's marks follow a rule. */
(function () {
  const C = TD.C, TAU = TD.TAU, clamp = TD.clamp, N = 10, HP = 5, EHP = 4, AMBUSH = [2, 5, 8];
  const ACT = [{ k: 'shoot', n: 'Shoot', tip: '65% to hit for 2', p: .65, d: 2, mod: 0 }, { k: 'flank', n: 'Flank shot', tip: '90% for 3 · it gets +25% on you', p: .9, d: 3, mod: .25 }, { k: 'hunker', n: 'Hunker down', tip: 'no shot · it gets −40% on you', p: 0, d: 0, mod: -.4 }, { k: 'med', n: 'Medkit', tip: '+3 health · one per fight', p: 0, d: 0, mod: 0 }];
  let saved = null, API = null;
  function fight(st) { const amb = AMBUSH.includes(st.i); st.f = { hp: HP, ehp: EHP, med: 1, turn: 0, min: 1, choice: true, amb, q: amb ? [{ who: 'e', mod: 0, amb: true }, { who: 'e', mod: 0, amb: true }] : [], log: amb ? 'Ambush! It fires twice before you can act.' : 'Your move.', wait: amb ? .9 : 0 }; st.ph = amb ? 'res' : 'turn'; st.think = 0; }
  function eShot(st, mod, amb) {
    const f = st.f, p = clamp(st.o.p + mod, .05, .95);
    if (amb && f.hp <= st.o.d && 1 - p < f.min) { f.min = 1 - p; f.choice = false; }
    const hit = st.R() < p; f.fx = { who: 'e', hit, t: st.t }; if (hit) f.hp -= st.o.d; f.log = hit ? `It hits you for ${st.o.d} (it had ${Math.round(p * 100)}%).` : `It misses (it had ${Math.round(p * 100)}%).`;
    if (st.live) PLAY.beep(hit ? 160 : 500, .1, .12, hit ? 'sawtooth' : 'sine');
  }
  function done(st, how) { const f = st.f; st.recs.push({ i: st.i, min: f.min, choice: f.choice, died: how === 'died', how, amb: f.amb, mark: null }); st.ph = 'mark'; st.at = st.t; f.log = how === 'died' ? 'Your soldier is down. Squad wipe.' : how === 'won' ? 'It is down.' : 'It slips away.'; }
  PLAY.game('clutch', {
    dur: 44, keys: ['1', '2', '3', '4', 'y', 'n'], clickStarts: true,
    opts: s => ({ p: +s.querySelector('[data-k=p]').value / 100, d: +s.querySelector('[data-k=d]').value }),
    tourOpts: { p: .7, d: 3 },
    setup(s, api) { API = api; s.querySelectorAll('input[type=range]').forEach(el => { const f = () => { el.parentNode.querySelector('i').textContent = el.dataset.k === 'p' ? el.value + '%' : el.value; }; el.addEventListener('input', f); f(); }); },
    init(o, live) { const st = { live, o, R: live ? Math.random : GK.rng(17), t: 0, i: 0, recs: [], ph: 'turn', spd: live ? 1 : .55 }; fight(st); return st; },
    step(st, inp, dt) {
      st.t += dt; st.think += dt; const f = st.f;
      if (st.ph === 'end') { if (st.live && inp.click === 'again') API.start(); return; }
      if (st.ph === 'mark') { const y = inp.press.y || inp.click === 'yes' || inp.cmd === 'yes', n = inp.press.n || inp.click === 'no' || inp.cmd === 'no'; if ((!y && !n) || st.t - st.at < .3) return; st.recs[st.recs.length - 1].mark = !!y; st.i++; if (st.i >= N) { st.ph = 'end'; if (st.live) saved = st; } else fight(st); return; }
      if (st.ph === 'res') {
        f.wait -= dt; if (f.wait > 0) return;
        const e = f.q.shift();
        if (!e) { if (f.hp <= 0) return done(st, 'died'); if (f.ehp <= 0) return done(st, 'won'); if (f.turn >= 5) return done(st, 'fled'); st.ph = 'turn'; st.think = 0; return; }
        if (e.who === 'e') { if (f.ehp > 0 && f.hp > 0) eShot(st, e.mod, e.amb); } f.wait = .6 * st.spd; return;
      }
      const k = ['1', '2', '3', '4'].findIndex(x => inp.press[x]), a = inp.cmd != null && typeof inp.cmd === 'number' ? inp.cmd : (typeof inp.click === 'number' ? inp.click : k);
      if (a < 0 || a == null || !ACT[a] || (a === 3 && !f.med)) return;
      const A = ACT[a]; f.turn++;
      if (f.hp <= st.o.d) { const kill = f.ehp <= 2 ? .65 : 0, live = kill + (1 - kill) * (1 - st.o.p); if (live < f.min) { f.min = live; f.choice = true; } }
      if (A.k === 'med') { f.med = 0; f.hp = Math.min(HP, f.hp + 3); f.log = 'Medkit: +3 health.'; f.fx = null; }
      else if (A.k === 'hunker') { f.log = 'You hunker down.'; f.fx = null; }
      else { const hit = st.R() < A.p; if (hit) f.ehp -= A.d; f.fx = { who: 'p', hit, t: st.t }; f.log = hit ? `${A.n}: hit for ${A.d}.` : `${A.n}: miss.`; if (st.live) PLAY.beep(hit ? 900 : 400, .08, .12, 'square'); }
      f.q = [{ who: 'e', mod: A.mod }]; f.wait = .6 * st.spd; st.ph = 'res';
    },
    // a scripted soldier and a written rule for marking: tight odds, after a choice, and survived
    bot(st) {
      const f = st.f, P = cmd => ({ down: {}, press: {}, cmd });
      if (st.ph === 'mark') { const r = st.recs[st.recs.length - 1]; return st.t - st.at > .8 ? P(r.min <= .5 && r.choice && !r.died ? 'yes' : 'no') : null; }
      if (st.ph !== 'turn' || st.think < .45) return null;
      if (f.hp <= st.o.d) return P(f.ehp <= 3 ? 1 : f.med ? 3 : 2);
      return P(0);
    },
    draw(g, st, ui, live) {
      GK.panel(g); const f = st.f, o = st.o, AX = 24, AY = 60, AW = 580, AH = 220;
      GK.head(g, st.ph === 'end' ? 'Ten firefights done' : `Firefight ${st.i + 1} of ${N}${f.amb ? ' · ambush' : ''}`, AX, 32, 'left', C.ink, 17);
      GK.text(g, `enemy: ${Math.round(o.p * 100)}% to hit for ${o.d}`, AX + AW, 32, C.muted, 13, 'right', 700);
      g.save(); g.beginPath(); g.roundRect(AX, AY, AW, AH, 12); g.clip(); g.fillStyle = '#2f3b4a'; g.fillRect(AX, AY, AW, AH); g.fillStyle = '#3d4b5c'; g.fillRect(AX, AY + 150, AW, 70);
      const px = AX + 130, ex = AX + 450, yy = AY + 132; g.fillStyle = '#6b7786'; g.fillRect(px + 34, yy - 30, 16, 62); g.fillRect(ex - 54, yy - 30, 16, 62);
      if (f.hp > 0) { TD.shadow(px, yy + 26, 22, 6); TD.player(px, yy, 0, 1.4); } else GK.text(g, '✕', px, yy + 12, C.red, 40, 'center', 800);
      if (f.ehp > 0) { TD.shadow(ex, yy + 30, 26, 7); TD.foe(ex, yy, 26, Math.PI, '#6fbf4a'); } else GK.text(g, '✕', ex, yy + 12, '#6fbf4a', 40, 'center', 800);
      if (f.fx && st.t - f.fx.t < .3) { const a = 1 - (st.t - f.fx.t) / .3, fromP = f.fx.who === 'p'; TD.tracer(fromP ? px : ex, yy, fromP ? ex : px, yy + (f.fx.hit ? 0 : -46), a, fromP ? '#ffd23f' : '#9be28f', 4); }
      for (let i = 0; i < HP; i++) { g.fillStyle = i < f.hp ? C.good : 'rgba(255,255,255,.2)'; g.beginPath(); g.roundRect(px - 48 + i * 20, AY + 22, 16, 12, 3); g.fill(); }
      for (let i = 0; i < EHP; i++) { g.fillStyle = i < f.ehp ? '#9be28f' : 'rgba(255,255,255,.2)'; g.beginPath(); g.roundRect(ex - 38 + i * 20, AY + 22, 16, 12, 3); g.fill(); }
      GK.text(g, f.log, AX + AW / 2, AY + AH - 16, '#fff', 14, 'center', 700);
      if (f.hp > 0 && f.hp <= o.d && st.ph !== 'mark' && st.ph !== 'end') TD.label('one more hit kills', px, AY + 56, 'center', '#fff', 12, 'rgba(183,28,28,.95)');
      g.restore();
      const BY = AY + AH + 12;
      if (st.ph === 'turn' || st.ph === 'res') ACT.forEach((A, i) => { const x = AX + (i % 2) * 294, y = BY + (i / 2 | 0) * 62, off = (i === 3 && !f.med) || st.ph !== 'turn'; g.globalAlpha = off ? .4 : 1; GK.box(g, x, y, 286, 54, '#fffaf0', '#8ea2e6', 9, 2); GK.text(g, `${i + 1} · ${A.n}`, x + 14, y + 23, C.ink, 14, 'left', 800); GK.text(g, A.tip, x + 14, y + 42, C.muted, 12, 'left', 600); g.globalAlpha = 1; if (!off && live) ui.hit(i, x, y, 286, 54); });
      if (st.ph === 'mark') { GK.box(g, AX, BY, AW, 116, '#fffaf0', C.navy, 12, 2); GK.text(g, 'Would you tell a friend about that one?', AX + AW / 2, BY + 34, C.ink, 16, 'center', 800); if (live) { ui.btn('yes', 'Y · yes', AX + 110, BY + 54, 170, 42, { px: 14, on: true }); ui.btn('no', 'N · no', AX + 300, BY + 54, 170, 42, { px: 14 }); } }
      if (st.ph === 'end' && live) ui.btn('again', 'Move the sliders, then play ten more', AX + 110, BY + 30, 360, 42, { px: 14, on: true });
      GK.text(g, 'Every shot is a real roll at the odds shown. Three of the ten fights open with an ambush.', AX, 560, C.muted, 11, 'left', 500);
      // scatter
      const SX = 640, SY = 60, SW = 376, SH = 300, recs = st.recs;
      GK.text(g, 'each fight, by its tightest moment', SX, 32, C.muted, 12, 'left', 700); GK.box(g, SX, SY - 14, SW, SH + 28, '#fffaf0', '#cdbf9f', 10, 1.5);
      const rows = [['after your choice', SY + 66], ['an ambush roll, no choice', SY + 160], ['never one hit from death', SY + 250]];
      rows.forEach(([l, y]) => { GK.text(g, l, SX + 14, y - 50, C.ink, 12, 'left', 700); g.strokeStyle = '#e3d8bf'; g.lineWidth = 1; g.beginPath(); g.moveTo(SX + 20, y + 14); g.lineTo(SX + SW - 20, y + 14); g.stroke(); });
      GK.text(g, 'likely to live', SX + 20, SY + SH + 4, C.muted, 10, 'left', 600); GK.text(g, 'odds of living by just shooting →  unlikely', SX + SW - 20, SY + SH + 4, C.muted, 10, 'right', 600);
      const cnt = {};
      recs.forEach(r => { const row = r.min >= 1 ? 2 : r.choice ? 0 : 1, key = row + ':' + Math.round(r.min * 20), n = cnt[key] = (cnt[key] || 0) + 1, x = r.min >= 1 ? SX + 30 + (cnt['2n'] = (cnt['2n'] || 0) + 1) * 26 : SX + 28 + (1 - r.min) * (SW - 80) + Math.floor((n - 1) / 3) * 21, y = rows[row][1] - (r.min >= 1 ? 0 : ((n - 1) % 3) * 19);
        g.fillStyle = r.mark ? '#f5b301' : '#fffaf0'; g.strokeStyle = r.died ? C.redDk : C.navy; g.lineWidth = 2.5; g.beginPath(); g.arc(x, y, 9, 0, TAU); g.fill(); g.stroke(); GK.text(g, r.died ? '✕' : String(r.i + 1), x, y + 4, r.died ? C.redDk : C.ink, 10, 'center', 800); });
      GK.text(g, 'gold = you would tell a friend · ✕ = squad wipe', SX, SY + SH + 34, C.muted, 12, 'left', 600);
      const wipes = recs.filter(r => r.died).length, marks = recs.filter(r => r.mark).length;
      ui.stats(`<div><b>${recs.length} of ${N}</b><span>fights played</span></div><div class="g"><b>${marks}</b><span>you would retell</span></div><div class="r"><b>${wipes}</b><span>squad wipes</span></div>`);
      if (st.ph !== 'end') { ui.out(live ? 'Play each fight, then say whether it was worth retelling. Raise the enemy sliders for more close calls, and count what that does to the wipes.' : 'A scripted soldier against an enemy set to 70% for 3. Its marks follow a written rule: tight odds, after a choice, and survived.'); return; }
      const grp = k => recs.filter(r => (r.min >= 1 ? 2 : r.choice ? 0 : 1) === k), frac = a => `${a.filter(r => r.mark).length} of ${a.length}`, who = live ? 'You' : 'The rule';
      const c = grp(0), a = grp(1), s = grp(2), rate = x => x.length ? x.filter(r => r.mark).length / x.length : null, rc = rate(c), ra = rate(a);
      ui.out(`${who} marked ${frac(c)} fights whose tightest moment came after a choice, ${frac(a)} where it was an ambush roll, and ${frac(s)} that never got close. ${wipes} of ${N} ended in a wipe. ` + (!live ? 'The rule only ever marks danger that came with a choice, so its marks prove nothing; yours are the test. ' : rc != null && ra != null ? (rc > ra ? 'The marks leaned toward danger you had a hand in. ' : rc < ra ? 'The marks leaned toward the ambush rolls this time, which is the opposite of the usual claim. ' : 'Choice and no-choice fights were marked at the same rate this time. ') : 'Not every row has a fight in it, so there is no comparison to make yet. ') + 'Ten fights is a small sample. The sliders that make close calls also make wipes: that is the price of a story.');
    },
  });
})();
