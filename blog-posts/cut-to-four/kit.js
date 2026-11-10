/* Cut to Four (replanned page for "Keep Only Five"; Scripture: Failsafes (Embrace Weakness), Strengths and Weaknesses,
   Xerath Rework Case Study). The learner keeps four of ten abilities for an artillery mage. The page then simulates the kit
   against three opponents in a one-lane duel written for this page (rules on the canvas; nothing is rolled) and reports,
   for each matchup, whether both sides got to play. The readout judges the kit as a designer would, not as a player. */
(function () {
  const C = TD.C, TAU = TD.TAU, clamp = TD.clamp;
  const AB = [{ n: 'Long Shot', k: 'dmg', dps: 18, range: 600, tag: 'damage', tip: '18 a second out to 600' }, { n: 'Barrage', k: 'dmg', dps: 26, range: 900, min: 300, tag: 'damage', tip: '26 a second from 300 to 900' }, { n: 'Arcane Bolt', k: 'dmg', dps: 24, range: 420, tag: 'damage', tip: '24 a second inside 420' },
    { n: 'Slow Field', k: 'slow', tag: 'peel', tip: 'foes inside 500 move at 60%' }, { n: 'Stun Orb', k: 'stun', tag: 'peel', tip: 'stuns for 1.5 s at 350 · 8 s' }, { n: 'Blink', k: 'blink', tag: 'escape', tip: 'jump back 350 when caught · 9 s' }, { n: 'Barrier', k: 'barrier', tag: 'peel', tip: 'soaks 35 damage · 10 s' }, { n: 'Shove', k: 'shove', tag: 'peel', tip: 'knocks a foe back 250 · 7 s' }, { n: 'Haste', k: 'haste', tag: 'escape', tip: 'back away at 150, not 90' }, { n: 'Mana Spring', k: 'heal', tag: 'sustain', tip: 'heals 4 a second' }];
  const TAGC = { damage: '#e5322d', peel: '#3b6fd4', escape: '#8e5bd0', sustain: '#2fae63' };
  const FOES = [{ n: 'Assassin', col: '#c0398b', hp: 110, speed: 420, burst: 110, burstT: 1.2, dps: 15, reach: 60, keep: 0, tip: 'fast, 110 a second for her first 1.2 s on you' }, { n: 'Bruiser', col: '#b0562c', hp: 220, speed: 215, dps: 24, reach: 60, keep: 0, grab: 1, leap: 420, tip: 'tough, leaps from 420 and holds you for 1 s' }, { n: 'Sniper', col: '#17a2a2', hp: 110, speed: 0, dps: 16, reach: 720, keep: 700, tip: 'stands at 700 and hits for 16 a second' }];
  const VERD = { Y: ['They never got to play', '#b87d00'], B: ['Both sides had a play', C.good], T: ['Your mage never got to play', C.redDk] };
  function duel(kit, F) {
    const has = k => kit.some(i => AB[i].k === k), dm = kit.map(i => AB[i]).filter(a => a.k === 'dmg');
    const m = { hp: 100, x: 0, shield: has('barrier') ? 35 : 0, cd: {}, stun: 0 }, e = { hp: F.hp, x: 900, stun: 0, melee: 0 }, DT = .05, maxR = Math.max(0, ...dm.map(a => a.range)), rec = []; let t = 0;
    for (; t < 30 && m.hp > 0 && e.hp > 0; t += DT) {
      const d = e.x - m.x; let ev = null; for (const k in m.cd) m.cd[k] -= DT;
      if (m.stun <= 0) {
        if (has('stun') && d < 350 && !(m.cd.stun > 0)) { e.stun = 1.5; m.cd.stun = 8; ev = 'Stun Orb'; }
        if (has('shove') && d < 120 && !(m.cd.shove > 0) && F.keep === 0) { e.x += 250; m.cd.shove = 7; ev = 'Shove'; }
        if (has('blink') && d < 120 && !(m.cd.blink > 0) && F.keep === 0) { m.x -= 350; m.cd.blink = 9; ev = 'Blink'; }
        if (has('barrier') && m.shield <= 0 && !(m.cd.barrier > 0)) { m.shield = 35; m.cd.barrier = 10; }
      }
      const d2 = e.x - m.x; let cast = 0;
      if (m.stun <= 0) { dm.forEach(a => { if (d2 <= a.range && d2 >= (a.min || 0)) cast = Math.max(cast, a.dps); }); e.hp -= cast * DT; const sp = has('haste') ? 150 : 90; if (F.keep === 0) m.x -= sp * DT; else if (d2 > maxR - 20 && maxR > 0) m.x += 150 * DT; } else m.stun -= DT;
      if (has('heal')) m.hp = Math.min(100, m.hp + 4 * DT);
      let hitM = false;
      if (e.stun > 0) e.stun -= DT; else {
        if (F.leap && !e.leapt && d2 < F.leap) { e.leapt = true; e.x = m.x + 50; ev = 'leap'; }
        const sp = F.speed * (has('slow') && d2 < 500 ? .6 : 1); if (e.x - m.x > Math.max(F.reach, F.keep)) e.x -= sp * DT;
        if (e.x - m.x <= F.reach) { let dps = F.dps; if (F.burst && e.melee < F.burstT) dps = F.burst; if (F.keep === 0) e.melee += DT; if (F.grab && !e.grabbed) { e.grabbed = true; m.stun = 1; ev = 'grabbed'; } let dmg = dps * DT; if (m.shield > 0) { const a = Math.min(m.shield, dmg); m.shield -= a; dmg -= a; } m.hp -= dmg; hitM = true; }
      }
      rec.push([m.x, e.x, Math.max(0, m.hp), Math.max(0, e.hp), cast > 0, hitM, ev, e.stun > 0]);
    }
    const mw = e.hp <= 0 ? true : m.hp <= 0 ? false : m.hp / 100 >= e.hp / F.hp, share = mw ? (100 - Math.max(0, m.hp)) / 100 : (F.hp - Math.max(0, e.hp)) / F.hp;
    return { win: mw, mhp: Math.max(0, m.hp), ehp: Math.max(0, e.hp), t, v: share >= .35 ? 'B' : mw ? 'Y' : 'T', rec, timeout: t >= 30 };
  }
  const hist = [], TOURK = [[1, 4, 5, 8], [0, 2, 4, 5]];
  PLAY.game('kit', {
    dur: 34, clickStarts: true,
    init(o, live) { return { live, t: 0, pick: [], ph: 'pick', th: [], think: 0 }; },
    step(st, inp, dt) {
      st.t += dt; st.think += dt; const k = inp.click;
      if (st.ph === 'pick') { if (typeof k === 'number') { const i = st.pick.indexOf(k); if (i >= 0) st.pick.splice(i, 1); else if (st.pick.length < 4) st.pick.push(k); st.think = 0; } if (k === 'go' && st.pick.length === 4) { st.res = FOES.map(F => duel(st.pick, F)); st.kit = st.pick.slice(); st.pt = 0; st.ph = 'play'; st.len = Math.max(...st.res.map(r => r.rec.length)); } return; }
      if (st.ph === 'play') { st.pt += dt * 3; if (st.pt * 20 >= st.len + 14) { st.ph = 'done'; st.at = st.t; (st.live ? hist : st.th).push({ kit: st.kit, v: st.res.map(r => r.v), win: st.res.map(r => r.win) }); if (st.live && hist.length > 4) hist.shift(); } return; }
      if (k === 'again') { st.ph = 'pick'; st.think = 0; if (!st.live) st.pick = []; }
    },
    bot(st) { const P = click => ({ down: {}, press: {}, click }); if (st.ph === 'pick') { if (st.think < .5) return null; const want = TOURK[Math.min(1, st.th.length)], nx = want.find(c => !st.pick.includes(c)); st.think = .2; return P(nx != null ? nx : 'go'); } return st.ph === 'done' && st.th.length < 2 && st.t - st.at > 3 ? P('again') : null; },
    draw(g, st, ui, live) {
      GK.panel(g); const X0 = 24, picking = st.ph === 'pick', kit = picking ? st.pick : st.kit;
      GK.head(g, picking ? `Keep four of the ten (${st.pick.length} of 4)` : 'Your kit against three opponents', X0, 32, 'left', C.ink, 17);
      AB.forEach((a, i) => { const x = X0 + (i % 5) * 120, y = 46 + (i / 5 | 0) * 70, on = kit.includes(i); g.globalAlpha = on || picking ? 1 : .35; GK.box(g, x, y, 114, 62, on ? '#fff3cf' : '#fffaf0', on ? C.navy : '#cdbf9f', 9, on ? 3 : 1.5); GK.text(g, a.n, x + 9, y + 20, C.ink, 13, 'left', 800); g.fillStyle = TAGC[a.tag]; g.beginPath(); g.roundRect(x + 9, y + 27, 52, 13, 6); g.fill(); GK.text(g, a.tag, x + 35, y + 37, '#fff', 9, 'center', 800); GK.wrap(g, a.tip, x + 9, y + 50, 100, 10, C.muted, 9, 500); g.globalAlpha = 1; if (picking) ui.hit(i, x, y, 114, 62); });
      // lanes
      const LY = 200, LW = 596, fi = st.ph === 'play' ? Math.floor(st.pt * 20) : 1e9;
      FOES.forEach((F, j) => {
        const y = LY + j * 104; GK.box(g, X0, y, LW, 96, '#f3f0e6', '#cdbf9f', 10, 1.5); GK.text(g, F.n, X0 + 12, y + 20, F.col, 14, 'left', 800); GK.text(g, F.tip, X0 + 90, y + 20, C.muted, 11, 'left', 600);
        if (picking) return;
        const r = st.res[j], fr = r.rec[Math.min(r.rec.length - 1, fi)], end = fi >= r.rec.length, lo = Math.min(...r.rec.map(f => f[0])) - 60, hi = 960, X = v => X0 + 20 + (v - lo) / (hi - lo) * (LW - 40), ly = y + 62;
        g.strokeStyle = '#d2c9b0'; g.lineWidth = 2; g.beginPath(); g.moveTo(X0 + 14, ly + 14); g.lineTo(X0 + LW - 14, ly + 14); g.stroke();
        if (fr[4] && !end) TD.tracer(X(fr[0]), ly, X(fr[1]), ly, .8, '#4f84e0', 3); if (fr[5] && !end) { g.strokeStyle = F.col; g.lineWidth = 3; g.beginPath(); g.moveTo(X(fr[1]), ly + 6); g.lineTo(X(fr[0]), ly + 6); g.stroke(); }
        if (fr[2] > 0) { g.fillStyle = C.blue; g.beginPath(); g.arc(X(fr[0]), ly, 10, 0, TAU); g.fill(); } else GK.text(g, '✕', X(fr[0]), ly + 6, C.blue, 18, 'center', 800);
        if (fr[3] > 0) { g.fillStyle = F.col; g.beginPath(); g.arc(X(fr[1]), ly, 10, 0, TAU); g.fill(); if (fr[7]) GK.text(g, 'stunned', X(fr[1]), ly - 16, C.muted, 10, 'center', 700); } else GK.text(g, '✕', X(fr[1]), ly + 6, F.col, 18, 'center', 800);
        const ev = r.rec.slice(Math.max(0, Math.min(r.rec.length - 1, fi) - 9), Math.min(r.rec.length, fi + 1)).map(f => f[6]).filter(Boolean).pop(); if (ev && !end) GK.text(g, ev, (X(fr[0]) + X(fr[1])) / 2, ly - 16, C.ink, 11, 'center', 800);
        PLAY.bar(g, X0 + 12, y + 30, 150, 8, fr[2] / 100, C.blue); GK.text(g, `mage ${Math.round(fr[2])}`, X0 + 168, y + 38, C.ink, 10, 'left', 700); PLAY.bar(g, X0 + LW - 162, y + 30, 150, 8, fr[3] / F.hp, F.col); GK.text(g, `${Math.round(fr[3])}`, X0 + LW - 168, y + 38, C.ink, 10, 'right', 700);
        if (end) { const [txt, col] = VERD[r.v]; TD.label(`${r.win ? 'Mage wins' : F.n + ' wins'}${r.timeout ? ' on health at 30 s' : ''} · ${txt}`, X0 + LW / 2, y + 86, 'center', '#fff', 12, col); }
      });
      if (picking && live) { if (st.pick.length === 4) ui.btn('go', 'Run the three matchups', X0 + 190, LY + 120, 220, 42, { px: 14, on: true }); else TD.label('choose four abilities above', X0 + LW / 2, LY + 140, 'center', C.ink, 13); }
      if (st.ph === 'done' && live) ui.btn('again', 'Cut a different four', X0 + LW - 200, 520, 200, 36, { px: 13, on: true });
      GK.wrap(g, 'The duel: both start 900 apart. The mage casts her strongest spell that reaches, one at a time, and backs away from anyone who chases. Nothing is rolled.', X0, 528, 380, 15, C.muted, 11, 500);
      // grid
      const RX = 644, RW = 372, list = (live ? hist : st.th).slice(-4);
      GK.text(g, 'counter grid: did each side get to play?', RX, 32, C.muted, 12, 'left', 700); GK.box(g, RX, 46, RW, 470, '#fffaf0', '#cdbf9f', 10, 1.5);
      FOES.forEach((F, j) => GK.text(g, F.n, RX + 150 + j * 76, 72, F.col, 12, 'center', 800));
      list.forEach((h, k) => { const y = 92 + k * 104; GK.wrap(g, h.kit.map(i => AB[i].n).join(', '), RX + 12, y + 14, 100, 14, C.ink, 11, 700); h.v.forEach((v, j) => { const x = RX + 116 + j * 76; g.fillStyle = v === 'B' ? '#dff1df' : v === 'Y' ? '#fbefc9' : '#fbe1de'; g.beginPath(); g.roundRect(x, y, 70, 84, 8); g.fill(); GK.text(g, h.win[j] ? 'won' : 'lost', x + 35, y + 24, C.ink, 13, 'center', 800); GK.wrap(g, v === 'B' ? 'both played' : v === 'Y' ? 'foe had no play' : 'mage had no play', x + 6, y + 44, 60, 13, VERD[v][1], 10, 800); }); });
      if (!list.length) GK.wrap(g, 'Each kit you run adds a row here, up to four.', RX + 14, 110, RW - 28, 20, C.muted, 14, 500);
      const cur = st.ph === 'done' ? list[list.length - 1] : null;
      ui.stats(`<div><b>${kit ? kit.length : 0} of 4</b><span>abilities kept</span></div><div class="g"><b>${cur ? cur.v.filter(v => v === 'B').length + ' of 3' : '–'}</b><span>matchups where both sides play</span></div>`);
      if (!cur) { ui.out(picking ? (live ? 'Ten ideas, four slots. What does this mage give up?' : 'First a kit with a stun, a blink and haste around one long-range spell. Then a shorter-range kit with fewer ways out.') : 'Blue is the mage. Lines are damage.'); return; }
      const nb = cur.v.filter(v => v === 'B').length, ny = cur.v.filter(v => v === 'Y').length, nt = cur.v.filter(v => v === 'T').length, esc = cur.kit.filter(i => AB[i].tag !== 'damage').length, lostTo = FOES.filter((F, j) => !cur.win[j]).map(F => F.n);
      ui.out(`This kit keeps ${esc} defensive or sustain tool${esc === 1 ? '' : 's'} and ${4 - esc} damage spell${4 - esc === 1 ? '' : 's'}. Both sides had a play in ${nb} of 3 matchups` + (ny ? `; in ${ny} the opponent never got to act` : '') + (nt ? `; in ${nt} the mage never got going` : '') + '. ' + (lostTo.length ? `It loses to the ${lostTo.join(' and the ')}. ` : 'It loses to nobody. ') + (ny >= 2 ? 'A kit that shuts opponents out is strong to play and dull to face: the weakness an opponent could have aimed at was cut along with the abilities. ' : nb >= 2 ? 'The weakness left in the kit is what gives the other side something to do. ' : '') + 'The grid judges the kit as a designer would. A win where the other side had no play is a mark against it.');
    },
  });
})();
