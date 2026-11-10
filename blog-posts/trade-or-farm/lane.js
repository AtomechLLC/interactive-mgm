/* Trade or Farm (replanned page for "MOBA"; Scripture: Interesting Choices and Tension, League of Legends Structural Analysis,
   Decision Intervals). A 45-second lane against a scripted opponent. One attack every 1.2 s: spend it on a dying minion for
   gold or on the enemy champion. The page records the learner's own gold, health and choices. A second mode pays minion
   gold for standing nearby, which removes the choice. Minion gold (21 and 14) is League of Legends'; the rest is compressed. */
(function () {
  const C = TD.C, TAU = TD.TAU, clamp = TD.clamp, LANE = 45, WAVE = 9, CD = 1.2, HPMAX = 500, HIT = 55, MDMG = 45, DRAIN = 40, AGGRO = 5, KILL = 300, DOWN = 8;
  const MODES = [{ id: 'last', n: 'Gold for the last hit' }, { id: 'near', n: 'Gold for being nearby' }];
  const saved = {};
  const side = () => ({ hp: HPMAX, gold: 0, cd: 0, dead: 0, lh: 0, har: 0, kills: 0 });
  function wave(st, t0) { for (let i = 0; i < 6; i++) st.min.push({ hp: 100, at: t0 + .5 + i * 1.3, g: i < 3 ? 21 : 14, melee: i < 3, dead: false, slot: i, w: st.nw }); st.nw++; }
  const live = st => st.min.filter(m => !m.dead && m.w === st.nw - 1 || (!m.dead && st.t >= m.at - 9));
  const target = st => st.min.filter(m => !m.dead && st.t >= m.at).sort((a, b) => a.hp - b.hp)[0];
  function strike(st, who, vic, dmg, why) { vic.hp -= dmg; st.fx.push({ t: st.t, who, why }); if (vic.hp <= 0 && !vic.dead) { vic.dead = DOWN; vic.hp = 0; who.gold += KILL; who.kills++; st.fx.push({ t: st.t, who, why: 'kill' }); if (st.live) PLAY.beep(300, .5, .2, 'sawtooth'); } }
  PLAY.game('lane', {
    dur: 48, keys: ['a', 's'],
    opts: s => ({ mode: s.querySelector('.seg .on')?.dataset.v || 'last' }),
    setup(s, api) { s.querySelectorAll('.seg button').forEach(b => b.onclick = () => { s.querySelectorAll('.seg button').forEach(x => x.classList.toggle('on', x === b)); api.start(); }); },
    init(o, isLive) { const st = { live: isLive, mode: o.mode || 'last', R: isLive ? Math.random : GK.rng(8), t: 0, me: side(), him: side(), min: [], nw: 0, nextW: 0, fx: [], log: [], marks: [], contested: 0, miss: 0, phase: isLive ? 'ready' : 'go', hisNext: 1.15, sample: 0 }; return st; },
    step(st, inp, dt) {
      if (st.phase === 'ready') { if (inp.press.a || inp.press.s || inp.click) st.phase = 'go'; return; }
      if (st.phase === 'end') { if (st.live && inp.click === 'again') Object.assign(st, this.init({ mode: st.mode }, true), { phase: 'go' }); return; }
      st.t += dt; const me = st.me, him = st.him, near = st.mode === 'near';
      if (st.t >= st.nextW && st.nextW < LANE - 4) { wave(st, st.t); st.nextW += WAVE; }
      [me, him].forEach(p => { p.cd = Math.max(0, p.cd - dt); if (p.dead > 0) { p.dead -= dt; if (p.dead <= 0) { p.dead = 0; p.hp = HPMAX; } } });
      // minions wear each other down; unclaimed ones die for nobody
      st.min.forEach(m => { if (m.dead || st.t < m.at) return; m.hp -= DRAIN * dt; if (m.hp <= 0) { m.dead = true; if (near) { if (!me.dead) me.gold += m.g; } else { st.miss++; m.lost = st.t; } } });
      // your attack
      const tg = target(st), inWin = tg && tg.hp <= MDMG, wantA = inp.press.a || inp.click === 'a' || inp.cmd === 'a', wantS = inp.press.s || inp.click === 's' || inp.cmd === 's';
      if (!me.dead && me.cd <= 0 && (wantA || wantS)) {
        if (wantA && tg) {
          me.cd = CD; tg.hp -= MDMG; st.fx.push({ t: st.t, who: me, why: 'min', m: tg });
          if (tg.hp <= 0) { tg.dead = true; tg.got = st.t; me.lh++; if (!near) me.gold += tg.g; else me.gold += tg.g; st.marks.push([st.t, 'a']); if (st.live) PLAY.beep(1000, .07, .12); }
          // he sometimes gives up a last hit of his own to punish yours
          if (!him.dead && him.cd <= 0 && st.R() < .2) { him.cd = CD; him.har++; strike(st, him, me, HIT, 'hit'); st.hisNext += 1.3; }
        } else if (wantS && !him.dead) {
          me.cd = CD; me.har++; st.marks.push([st.t, 's']); if (inWin && !near) st.contested++;
          strike(st, me, him, HIT, 'hit'); const n = st.min.filter(m => !m.dead && st.t >= m.at - 8).length; me.hp -= AGGRO * n; st.aggro = [st.t, n];
          if (st.live) PLAY.beep(520, .08, .12, 'square');
          if (!him.dead && him.cd <= .4 && st.R() < .6) { him.cd = CD; him.har++; strike(st, him, me, HIT, 'hit'); st.hisNext += 1.3; }
          if (me.hp <= 0 && !me.dead) { me.hp = 0; me.dead = DOWN; him.gold += KILL; him.kills++; }
        }
      }
      // his farming: one chance every 1.3 s while a wave is up, taken four times in five
      if (st.t >= st.hisNext) { st.hisNext += 1.3; const up = st.min.some(m => !m.dead && st.t >= m.at - .65); if (up && !him.dead) { if (near) him.gold += 17.5; else if (him.cd <= 0 && st.R() < .8) { him.cd = CD; him.lh++; him.gold += st.R() < .5 ? 21 : 14; } } }
      st.fx = st.fx.filter(f => st.t - f.t < .5);
      if (st.t >= st.sample) { st.sample += .5; st.log.push([st.t, me.gold, him.gold, me.hp, him.hp]); }
      if (st.t >= LANE) { st.phase = 'end'; const row = { mode: st.mode, gold: me.gold, his: him.gold, lh: me.lh, har: me.har, miss: st.miss, contested: st.contested, kills: me.kills, deaths: him.kills, hp: me.hp }; st.row = row; if (st.live) saved[st.mode] = row; }
    },
    // a scripted laner: takes every last hit it can, and hits the champion only between waves
    bot(st) { const tg = target(st), soon = st.min.some(m => !m.dead && m.at - st.t < 1.3 && m.at - st.t > -3); if (st.phase !== 'go' || st.me.cd > 0) return null; if (tg && tg.hp <= MDMG) return { down: {}, press: {}, cmd: 'a' }; return !soon && !tg ? { down: {}, press: {}, cmd: 's' } : null; },
    draw(g, st, ui, isLive) {
      GK.panel(g); const X0 = 24, AY = 64, AW = 620, AH = 250, me = st.me, him = st.him, near = st.mode === 'near';
      GK.head(g, `${MODES.find(m => m.id === st.mode).n} · ${Math.max(0, LANE - st.t).toFixed(0)} s left`, X0, 32, 'left', C.ink, 17);
      GK.text(g, near ? 'Minion gold arrives whoever lands the blow.' : 'A minion pays only if your attack is the one that finishes it.', X0, 54, C.muted, 13, 'left', 600);
      g.save(); g.beginPath(); g.roundRect(X0, AY, AW, AH, 12); g.clip(); g.fillStyle = '#9cc48a'; g.fillRect(X0, AY, AW, AH); g.fillStyle = '#d7c79a'; g.fillRect(X0, AY + 80, AW, 110);
      const px = X0 + 110, ex = X0 + 520, yy = AY + 135, tg = target(st);
      // your minions (scenery) and theirs
      for (let i = 0; i < 6; i++) { g.fillStyle = C.blue; g.beginPath(); g.arc(X0 + 235 + (i % 3) * 8, yy - 36 + i * 14, 7, 0, TAU); g.fill(); }
      st.min.forEach(m => {
        if (st.t < m.at - 8) return; const x = X0 + (m.melee ? 300 : 370), y = yy - 44 + (m.slot % 3) * 44, age = m.dead ? st.t - (m.got || m.lost || 0) : 0;
        if (m.dead) { if (age < .8) { TD.label(m.got ? `+${m.g}` : (near ? `+${m.g}` : 'no gold'), x, y - 20 - age * 20, 'center', m.got || near ? '#8a6500' : C.muted, 13); } return; }
        const win = st.t >= m.at && m.hp <= MDMG;
        g.fillStyle = m.melee ? '#c0392b' : '#d9722b'; g.beginPath(); g.arc(x, y, m.melee ? 13 : 10, 0, TAU); g.fill();
        if (win && !near) { g.strokeStyle = '#ffd23f'; g.lineWidth = 4; g.beginPath(); g.arc(x, y, 19, 0, TAU); g.stroke(); }
        g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(x - 16, y - 24, 32, 5); g.fillStyle = win ? '#ffd23f' : '#fff'; g.fillRect(x - 16, y - 24, 32 * clamp(m.hp / 100), 5); g.fillStyle = C.ink; g.fillRect(x - 16 + 32 * MDMG / 100, y - 26, 1.5, 9);
      });
      const drawChamp = (p, x, col, ang) => { if (p.dead) { GK.text(g, `back in ${p.dead.toFixed(0)} s`, x, yy + 4, '#fff', 13, 'center', 800); return; } TD.shadow(x, yy + 30, 24, 7); if (p === me) TD.player(x, yy, ang, 1.5); else TD.foe(x, yy, 26, ang, '#7a1f6a'); g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 4; g.beginPath(); g.arc(x, yy, 36, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - p.cd / CD)); g.stroke(); };
      drawChamp(me, px, C.blue, 0); drawChamp(him, ex, C.red, Math.PI);
      st.fx.forEach(f => { const a = 1 - (st.t - f.t) / .5; if (f.why === 'hit') TD.tracer(f.who === me ? px : ex, yy, f.who === me ? ex : px, yy, a, f.who === me ? '#4f84e0' : '#c0398b', 5); if (f.why === 'min' && f.m) TD.tracer(px, yy, X0 + (f.m.melee ? 300 : 370), yy - 44 + (f.m.slot % 3) * 44, a, '#4f84e0', 4); });
      if (st.aggro && st.t - st.aggro[0] < 1 && st.aggro[1]) TD.label(`minions turn on you · −${st.aggro[1] * AGGRO}`, px + 60, yy - 70, 'center', '#fff', 12, 'rgba(183,28,28,.95)');
      [[me, X0 + 16, 'You'], [him, X0 + AW - 266, 'Opponent']].forEach(([p, x, n]) => { GK.text(g, `${n} · ${Math.round(p.gold)} gold`, x, AY + 24, '#1d2a44', 14, 'left', 800); PLAY.bar(g, x, AY + 32, 220, 12, p.hp / HPMAX, p === me ? C.good : '#c0398b', 'rgba(0,0,0,.25)'); GK.text(g, `${Math.max(0, Math.round(p.hp))}`, x + 226, AY + 43, '#1d2a44', 11, 'left', 700); });
      g.restore();
      if (st.phase === 'ready') TD.stamp('A or S to start', X0 + AW / 2, AY + 70, C.navy, 1, 22);
      const inWin = tg && tg.hp <= MDMG;
      if (isLive && st.phase !== 'end') { ui.btn('a', near ? 'A · hit a minion (no extra gold)' : 'A · hit the lowest minion', X0, AY + AH + 14, 300, 44, { px: 14, on: inWin && !near }); ui.btn('s', 'S · hit the champion', X0 + 320, AY + AH + 14, 300, 44, { px: 14 }); }
      if (st.phase === 'end' && isLive) ui.btn('again', 'Play this lane again', X0, AY + AH + 14, 300, 44, { px: 14, on: true });
      GK.wrap(g, `One attack every ${CD} s. The dark tick on a minion's bar is where your attack finishes it; the gold ring means now. Hitting the champion does ${HIT} and draws ${AGGRO} from every enemy minion in the wave. A kill pays ${KILL}.`, X0, AY + AH + 84, AW, 17, C.muted, 12, 500);
      // timelines
      const TX = 676, TW = 340, chart = (y, h, title, iA, iB, max) => {
        GK.text(g, title, TX, y - 8, C.muted, 12, 'left', 700); g.strokeStyle = '#d9cdb2'; g.lineWidth = 1; g.strokeRect(TX, y, TW, h);
        const X = t => TX + t / LANE * TW, Y = v => y + h - clamp(v / max) * h;
        if (st.log.length > 1) { GK.line(g, st.log.map(r => [X(r[0]), Y(r[iB])]), '#c0398b', 2); GK.line(g, st.log.map(r => [X(r[0]), Y(r[iA])]), C.navy, 3); }
        return [X, y, h];
      };
      const gmax = Math.max(400, ...st.log.map(r => Math.max(r[1], r[2])));
      const [X, y1, h1] = chart(64, 130, `gold · you (blue) ${Math.round(me.gold)}, opponent ${Math.round(him.gold)}`, 1, 2, gmax);
      st.marks.forEach(([t, k]) => { g.fillStyle = k === 'a' ? '#c99a00' : C.red; g.fillRect(X(t) - 1, y1 + h1 + 3, 2, k === 'a' ? 8 : 14); });
      GK.text(g, 'your attacks: short gold = last hit, tall red = champion', TX, y1 + h1 + 34, C.muted, 11, 'left', 600);
      chart(262, 110, 'health · you (blue), opponent', 3, 4, HPMAX);
      const o = saved, keys = ['last', 'near'].filter(k => o[k]);
      if (isLive && keys.length) { GK.text(g, 'your finished lanes', TX, 404, C.muted, 12, 'left', 700); keys.forEach((k, i) => { const r = o[k]; GK.text(g, `${MODES.find(m => m.id === k).n}: ${Math.round(r.gold)} gold, ${r.lh} last hits, ${r.har} hits on him`, TX, 424 + i * 20, C.ink, 12, 'left', 600); }); }
      ui.stats(`<div class="g"><b>${me.lh}</b><span>last hits</span></div><div class="r"><b>${me.har}</b><span>hits on the champion</span></div><div><b>${near ? '–' : st.miss}</b><span>minions that paid nobody</span></div>`);
      const who = isLive ? 'You' : 'The script';
      if (st.phase !== 'end') { ui.out(isLive ? (near ? 'Gold now arrives on its own. See what is left to decide.' : 'Every attack is one or the other. Take the gold, or take his health?') : 'A scripted laner takes every last hit it can and only swings at the champion between waves. The opponent is a script too.'); return; }
      const r = st.row;
      ui.out(near ? `${who} ended on ${Math.round(r.gold)} gold against ${Math.round(r.his)} and hit the champion ${r.har} times. No attack had to choose between gold and damage, because the gold came either way: the lane had one sensible button. ${saved.last && isLive ? `With last hits you took ${saved.last.lh} of 30 and hit him ${saved.last.har} times.` : 'Switch back to last hits to compare.'}`
        : `${who} took ${r.lh} of 30 last hits for ${Math.round(r.gold)} gold against ${Math.round(r.his)}, and hit the champion ${r.har} times${r.kills ? `, killing him ${r.kills === 1 ? 'once' : r.kills + ' times'}` : ''}${r.deaths ? `, dying ${r.deaths === 1 ? 'once' : r.deaths + ' times'}` : ''}. ${r.contested} of those hits came while a minion was in range, so each one was traded for a last hit; ${r.miss} minions died paying nobody. That running trade is the lane. ` + (isLive ? 'Now try gold for being nearby.' : 'Play it, then switch to gold for being nearby.'));
    },
  });
})();
