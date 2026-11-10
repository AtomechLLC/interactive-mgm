/* Grind or Go (replanned page for "XP Curves" and "What an RPG Needs"; Scripture: Power Curves and Bottlenecks, Feedback Loops,
   Great Progression System Criteria). A five-area campaign played under three XP rules. Fights are simulated tick by tick
   from the level formulas below; nothing is rolled. The page records the learner's own battles, boss tries and fight time. */
(function () {
  const C = TD.C, TAU = TD.TAU, clamp = TD.clamp, NA = 5;
  const need = L => 20 + 10 * L, PL = L => ({ hp: 50 + 15 * L, d: 8 + 3 * L });
  const mob = M => ({ hp: 30 + 12 * M, d: 2 + 1.5 * M, xp: 10 + 6 * M, lv: M }), boss = B => ({ hp: 56 + 21 * B, d: 4 + 2 * B, xp: 10 + 6 * B, lv: B, boss: true });
  const RULES = [{ id: 'flat', n: 'Flat XP', tip: 'A monster is worth the same XP whatever your level.' }, { id: 'scaled', n: 'XP scaled by level gap', tip: 'Monsters below your level pay less, down to a tenth; monsters above pay more.' }, { id: 'level', n: 'The world levels with you', tip: 'Every monster and boss is set from your own level.' }];
  const AREA = ['Meadow', 'Caves', 'Marsh', 'Peaks', 'Citadel'], HUE = ['#7ab86a', '#8a7f6e', '#5f8f7b', '#8fa3c4', '#8a5a7a'];
  const saved = [];
  const mult = (id, M, L) => id === 'scaled' ? clamp(1 + .3 * (M - L), .1, 2.2) : 1;
  const foeOf = (st, isBoss) => { const id = RULES[st.r].id, L = st.c.L, a = st.c.a + 1; return isBoss ? boss(id === 'level' ? L : 2 * a + 1) : mob(id === 'level' ? Math.max(1, L - 1) : 2 * a - 1); };
  const camp = () => ({ a: 0, L: 2, xp: 0, battles: 0, tries: 0, ticks: 0, per: Array(NA).fill(0), bossTries: Array(NA).fill(0), mobHits: [], f: null, think: 0, msg: '', msgT: -9 });
  function begin(st, isBoss) { const c = st.c, e = foeOf(st, isBoss); c.f = { e, eh: e.hp, ph: PL(c.L).hp, n: 0, tk: st.live ? .3 : .12, turn: 0 }; if (isBoss) { c.tries++; c.bossTries[c.a]++; } else { c.battles++; c.per[c.a]++; } }
  function over(st, win) {
    const c = st.c, f = c.f, e = f.e; c.f = null; c.think = 0; c.msgT = st.t;
    if (!e.boss) c.mobHits[c.a] = f.n;
    if (!win) { c.msg = `The ${e.boss ? 'boss' : 'monster'} won. No XP.`; if (st.live) PLAY.beep(140, .3, .18, 'sawtooth'); return; }
    const got = Math.round(e.xp * mult(RULES[st.r].id, e.lv, c.L)), L0 = c.L; c.xp += got; while (c.xp >= need(c.L)) { c.xp -= need(c.L); c.L++; }
    c.msg = `+${got} XP${c.L > L0 ? ` · level ${c.L}!` : ''}`; if (st.live) PLAY.beep(c.L > L0 ? 1100 : 700, .12, .14);
    if (e.boss) { if (c.a === NA - 1) { const row = { r: st.r, battles: c.battles, tries: c.tries, secs: c.ticks * .22, L: c.L, per: c.per, hits: c.mobHits }; st.rows[st.r] = row; if (st.live) saved[st.r] = row; st.phase = st.r < 2 ? 'between' : 'end'; st.at = st.t; } else c.a++; }
  }
  PLAY.game('grind', {
    dur: 60, keys: ['1', '2'], clickStarts: true,
    init(o, live) { return { live, t: 0, r: 0, c: camp(), rows: [], phase: 'go', at: 0 }; },
    step(st, inp, dt) {
      st.t += dt; const c = st.c;
      if (st.phase === 'between') { if (st.live ? inp.click === 'nx' : st.t - st.at > 1.8) { st.r++; st.c = camp(); st.phase = 'go'; } return; }
      if (st.phase === 'end') { if (st.live && inp.click === 'again') Object.assign(st, this.init({}, true)); return; }
      if (c.f) {
        const f = c.f; f.tk -= dt; if (f.tk > 0) return; f.tk = st.live ? .22 : .07; c.ticks++;
        if (f.turn === 0) { f.eh -= PL(c.L).d; f.n++; f.hitE = st.t; if (f.eh <= 0) return over(st, true); f.turn = 1; if (st.live) PLAY.beep(520, .03, .06, 'square'); }
        else { f.ph -= f.e.d; f.hitP = st.t; if (f.ph <= 0) return over(st, false); f.turn = 0; }
        return;
      }
      c.think += dt;
      if (inp.press['1'] || inp.click === 'mob') begin(st, false); else if (inp.press['2'] || inp.click === 'boss') begin(st, true);
    },
    // a scripted player: fights monsters until the formulas say the boss can be beaten, then goes
    bot(st) {
      const c = st.c; if (st.phase !== 'go' || c.f || c.think < .22) return null;
      const b = foeOf(st, true), p = PL(c.L), nP = Math.ceil(b.hp / p.d), can = (nP - 1) * b.d < p.hp;
      return { down: {}, press: {}, click: can ? 'boss' : 'mob' };
    },
    draw(g, st, ui, live) {
      GK.panel(g); const c = st.c, rule = RULES[st.r], X0 = 24, m = foeOf(st, false), b = foeOf(st, true), id = rule.id;
      GK.head(g, `Campaign ${st.r + 1} of 3 · ${rule.n}`, X0, 32, 'left', C.ink, 17); GK.text(g, rule.tip, X0, 54, C.muted, 13, 'left', 600);
      // the road
      for (let i = 0; i < NA; i++) { const x = X0 + i * 112, cur = i === c.a && st.phase === 'go'; GK.box(g, x, 68, 104, 50, i < c.a || st.phase !== 'go' ? '#e6f3e4' : cur ? '#fff6dd' : '#fffaf0', cur ? C.navy : '#cdbf9f', 9, cur ? 3 : 1.5); GK.text(g, AREA[i], x + 52, 89, C.ink, 13, 'center', 800); GK.text(g, i < c.a || st.phase !== 'go' ? `${c.per[i]} battles` : cur ? 'you are here' : '', x + 52, 108, C.muted, 11, 'center', 600); }
      // arena
      const AY = 130, AW = 556, AH = 220; g.save(); g.beginPath(); g.roundRect(X0, AY, AW, AH, 12); g.clip(); g.fillStyle = HUE[c.a]; g.fillRect(X0, AY, AW, AH); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(X0, AY + 150, AW, 70);
      const f = c.f, e = f ? f.e : null, px = X0 + 150, ex = X0 + 400, yy = AY + 140, p = PL(c.L);
      const lunge = f && st.t - (f.hitE || -9) < .1 ? 26 : 0, elunge = f && st.t - (f.hitP || -9) < .1 ? 26 : 0;
      TD.shadow(px, yy + 30, 24, 7); TD.player(px + lunge, yy, 0, 1.5);
      GK.text(g, `You · level ${c.L}`, px, AY + 40, '#fff', 14, 'center', 800); PLAY.bar(g, px - 60, AY + 50, 120, 10, f ? f.ph / p.hp : 1, C.good, 'rgba(0,0,0,.3)');
      if (f) { const big = e.boss ? 40 : 24; TD.shadow(ex, yy + big + 4, big, 8); TD.foe(ex - elunge, yy, big, Math.PI, e.boss ? '#7a1f1f' : C.red); GK.text(g, `${e.boss ? 'Boss' : 'Monster'} · level ${e.lv}`, ex, AY + 40, '#fff', 14, 'center', 800); PLAY.bar(g, ex - 60, AY + 50, 120, 10, f.eh / e.hp, C.red, 'rgba(0,0,0,.3)'); }
      g.restore();
      if (!f && st.t - c.msgT < 1.4 && c.msg) TD.label(c.msg, X0 + AW / 2, AY + 100, 'center', C.ink, 15);
      // you
      const SY = 364; GK.text(g, `level ${c.L}`, X0, SY + 12, C.navy, 20, 'left', 800); PLAY.bar(g, X0 + 100, SY, 300, 14, c.xp / need(c.L), C.gold); GK.text(g, `${Math.round(c.xp)} of ${need(c.L)} XP to level ${c.L + 1}`, X0 + 410, SY + 12, C.muted, 12, 'left', 600);
      if (st.phase === 'go' && !f) {
        const xp = Math.round(m.xp * mult(id, m.lv, c.L));
        if (live) { ui.btn('mob', `1 · Fight a monster`, X0, SY + 30, 270, 44, { px: 14 }); ui.btn('boss', `2 · Challenge the boss`, X0 + 286, SY + 30, 270, 44, { px: 14, on: true }); }
        GK.text(g, `level ${m.lv} · pays ${xp} XP${id === 'scaled' ? ` (×${mult(id, m.lv, c.L).toFixed(1)})` : ''}`, X0 + 135, SY + 94, C.ink, 12, 'center', 600); GK.text(g, `level ${b.lv} · a loss costs only the time`, X0 + 421, SY + 94, C.ink, 12, 'center', 600);
      }
      if (st.phase === 'between' && live) ui.btn('nx', `Next campaign: ${RULES[st.r + 1].n}`, X0, SY + 30, 556, 44, { px: 14, on: true });
      if (st.phase === 'end' && live) ui.btn('again', 'Play all three again', X0, SY + 30, 556, 44, { px: 14, on: true });
      GK.wrap(g, 'Fights follow fixed formulas: your health and damage rise with level, and so do theirs. You heal after every fight.', X0, SY + 130, 556, 18, C.muted, 12, 500);
      // table
      const TX = 604, TW = 412; GK.text(g, 'your campaigns', TX, 80, C.muted, 12, 'left', 700);
      RULES.forEach((ru, k) => {
        const y = 92 + k * 152, row = st.rows[k] || (k === st.r ? { battles: c.battles, tries: c.tries, secs: c.ticks * .22, L: c.L, per: c.per, hits: c.mobHits, cur: true } : null);
        GK.box(g, TX, y, TW, 140, k === st.r && st.phase === 'go' ? '#fff6dd' : '#fffaf0', '#cdbf9f', 10, 1.5); GK.text(g, ru.n, TX + 14, y + 24, C.ink, 14, 'left', 800);
        if (!row) return;
        [['monster battles', row.battles], ['boss tries', row.tries], ['seconds in fights', row.secs.toFixed(0)], ['level at the end', row.L]].forEach(([l, v], i) => { GK.text(g, String(v), TX + 14 + i * 100, y + 60, C.navy, 22, 'left', 800); GK.text(g, l, TX + 14 + i * 100, y + 78, C.muted, 11, 'left', 600); });
        GK.text(g, 'battles per area', TX + 14, y + 104, C.muted, 11, 'left', 700); row.per.forEach((n, i) => { g.fillStyle = HUE[i]; g.fillRect(TX + 110 + i * 26, y + 108 - Math.min(24, n * 3), 20, Math.min(24, n * 3)); GK.text(g, String(n), TX + 120 + i * 26, y + 124, C.ink, 11, 'center', 700); });
        const h = row.hits.filter(v => v != null); if (h.length) GK.text(g, `hits to drop a monster: ${row.hits[0] != null ? row.hits[0] : '–'} in area 1, ${row.hits[4] != null ? row.hits[4] : (row.cur ? '…' : '–')} in area 5`, TX + TW - 14, y + 24, C.muted, 11, 'right', 600);
      });
      ui.stats(`<div><b>${c.battles}</b><span>monster battles</span></div><div><b>${c.tries}</b><span>boss tries</span></div><div><b>${(c.ticks * .22).toFixed(0)} s</b><span>spent in fights</span></div>`);
      const R = st.rows, who = live ? 'You' : 'The script';
      if (st.phase !== 'end') { ui.out(live ? `${rule.tip} Fight monsters for XP, or go at the boss now.` : 'A scripted player fights monsters until the formulas say the boss will fall, then goes. Watch how many battles each rule asks for.'); return; }
      const mostB = [0, 1, 2].reduce((a, k) => R[k].battles > R[a].battles ? k : a);
      ui.out(`${who} fought ${R[0].battles} monster battles under flat XP, ${R[1].battles} under scaled XP and ${R[2].battles} when the world levelled, with ${R[0].tries}, ${R[1].tries} and ${R[2].tries} boss tries. ` + (R[2].battles <= Math.min(R[0].battles, R[1].battles) ? `The levelling world asked for the least grinding, and ended at level ${R[2].L} against level ${R[0].L}: with every foe set from your level, a battle changes nothing about the next one. ` : `The levelling world did not come out lowest for ${live ? 'you' : 'it'} (most battles: ${RULES[mostB].n}), though no battle there changed the next fight. `) + 'Flat XP makes grinding always pay; scaling by level gap keeps the choice and caps it. Over-grind the Meadow under each rule to feel the cap.');
    },
  });
})();
