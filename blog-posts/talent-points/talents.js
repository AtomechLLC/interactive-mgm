/* Spend the Talent Points (replanned page for the Best Button post; Scripture: Small Compounding Factors, Incentive Alignment).
   Ten points, four spells, a 30-second target dummy. The learner plays their own build; "best play" for that build is
   computed by a greedy caster (most damage per second of casting), so the collapse to one button is shown, not asserted. */
(function () {
  const C = TD.C, { clamp } = TD;
  const LEN = 30, GCD = 1;
  const SP = [
    { n: 'Fire Bolt', ic: 'spell_fire_firebolt02', cast: 1.5, dmg: 100, cd: 0 },
    { n: 'Frost Shock', ic: 'spell_frost_iceshock', cast: 0, dmg: 90, cd: 6 },
    { n: 'Immolate', ic: 'spell_fire_immolation', cast: 0, dmg: 180, cd: 0, dot: 12 },
    { n: 'Pyroblast', ic: 'spell_fire_fireball02', cast: 2, dmg: 330, cd: 15 },
  ];
  const TAL = [
    { k: 'bp', n: 'Bolt Power', d: '+15% Fire Bolt damage', max: 5 },
    { k: 'bs', n: 'Bolt Speed', d: 'Fire Bolt casts 8% faster', max: 5 },
    { k: 'all', n: 'Spell Mastery', d: '+4% to every spell', max: 10 },
    { k: 'cd', n: 'Quick Recovery', d: 'Cooldowns 6% shorter', max: 5 },
  ];
  const stats = (p, i) => {
    const s = SP[i], all = 1 + .04 * p.all;
    return { time: Math.max(GCD * (s.cast ? 0 : 1), s.cast * (i === 0 ? 1 - .08 * p.bs : 1)) || GCD, dmg: s.dmg * all * (i === 0 ? 1 + .15 * p.bp : 1), cd: s.cd * (1 - .06 * p.cd) };
  };
  // the fight as a pure function of a policy: pick(state) -> spell index. Returns total damage and the cast list.
  function fight(p, pick) {
    let t = 0, dmg = 0, dotEnd = -1; const ready = [0, 0, 0, 0], casts = [];
    while (t < LEN - 1e-6) {
      const i = pick({ t, ready, dotEnd }); const s = stats(p, i);
      if (t + s.time > LEN + 1e-6) break;
      if (SP[i].dot) { const start = t + s.time; dmg += s.dmg * Math.min(SP[i].dot, LEN - start) / SP[i].dot - (dotEnd > start ? s.dmg * (Math.min(dotEnd, LEN) - start) / SP[i].dot : 0); dotEnd = start + SP[i].dot; }
      else dmg += s.dmg;
      t += s.time; ready[i] = t + s.cd; casts.push(i);
    }
    return { dmg, casts };
  }
  const greedy = p => fight(p, ({ t, ready, dotEnd }) => {
    let best = 0, bv = -1;
    SP.forEach((s, i) => { if (ready[i] > t + 1e-6) return; const st = stats(p, i); let v = st.dmg / st.time; if (s.dot) v = dotEnd > t + st.time ? 0 : st.dmg * Math.min(s.dot, LEN - t - st.time) / s.dot / st.time; if (v > bv) { bv = v; best = i; } });
    return best;
  });
  const mix = casts => SP.map((_, i) => casts.filter(c => c === i).length);
  const used = casts => mix(casts).filter(n => n > 0).length;
  const label = p => TAL.map(t => p[t.k]).join(' / ');
  const runs = [];
  const DEMO = [{ p: { bp: 0, bs: 0, all: 10, cd: 0 } }, { p: { bp: 5, bs: 5, all: 0, cd: 0 } }].map(r => { const b = greedy(r.p); return { ...r, you: b.dmg * .93, best: b.dmg, used: used(b.casts) }; });
  const TOUR = [...Array(5).fill('+bp'), ...Array(5).fill('+bs'), 'go'];

  PLAY.game('talents', {
    dur: 44, keys: ['1', '2', '3', '4'],
    init: (o, live) => ({ live, t: 0, p: { bp: 0, bs: 0, all: 0, cd: 0 }, phase: 'build', ft: 0, cast: null, lock: 0, ready: [0, 0, 0, 0], dotEnd: -1, dotDmg: 0, dmg: 0, casts: [], fx: [], si: 0 }),
    step(st, inp, dt) {
      st.t += dt; const c = inp.click, left = 10 - TAL.reduce((s, t) => s + st.p[t.k], 0);
      if (st.phase === 'build') {
        if (c && c[0] === '+' && left > 0) { const t = TAL.find(x => x.k === c.slice(1)); if (st.p[t.k] < t.max) st.p[t.k]++; }
        if (c && c[0] === '-' && st.p[c.slice(1)] > 0) st.p[c.slice(1)]--;
        if (c === 'go' && left === 0) { st.phase = 'fight'; st.ft = 0; }
        return;
      }
      if (st.phase === 'done') { if (c === 'again') { const p = st.p; Object.assign(st, { phase: 'build', ft: 0, cast: null, lock: 0, ready: [0, 0, 0, 0], dotEnd: -1, dmg: 0, casts: [], fx: [] }); st.p = p; } return; }
      st.ft += dt;
      if (st.dotEnd > st.ft) st.dmg += st.dotDmg / 12 * dt;
      if (st.cast && st.ft >= st.cast.end) {
        const i = st.cast.i, s = stats(st.p, i);
        if (SP[i].dot) { st.dotEnd = st.ft + 12; st.dotDmg = s.dmg; } else { st.dmg += s.dmg; st.fx.push({ t: st.ft, v: Math.round(s.dmg), i }); }
        st.casts.push(i); st.cast = null;
      }
      ['1', '2', '3', '4'].forEach((k, i) => { if (inp.press[k] || c === 's' + i) st.buf = { i, t: st.ft }; });
      const want = st.buf && st.ft - st.buf.t < .5 ? st.buf.i : -1;   // a press just before the last cast ends still counts
      if (want >= 0 && !st.cast && st.ft >= st.lock && st.ready[want] <= st.ft) {
        const s = stats(st.p, want);
        if (SP[want].cast) st.cast = { i: want, start: st.ft, end: st.ft + s.time };
        else { st.cast = { i: want, start: st.ft, end: st.ft }; st.lock = st.ft + GCD; }
        st.ready[want] = st.ft + (SP[want].cast ? s.time : 0) + s.cd; st.buf = null;
      }
      if (st.ft >= LEN) {
        st.phase = 'done'; const b = greedy(st.p);
        st.res = { p: { ...st.p }, you: st.dmg, best: b.dmg, used: used(b.casts), mine: mix(st.casts), bestMix: mix(b.casts) };
        if (st.live) runs.push(st.res);
      }
    },
    bot(st) {
      if (st.phase === 'build') { if (st.t > .8 + st.si * .28 && st.si < TOUR.length) return { down: {}, press: {}, click: TOUR[st.si++] }; return null; }
      if (st.phase !== 'fight' || st.cast || st.ft < st.lock) return null;
      let best = 0, bv = -1; SP.forEach((s, i) => { if (st.ready[i] > st.ft) return; const x = stats(st.p, i); let v = x.dmg / x.time; if (s.dot && st.dotEnd > st.ft + 1) v = 0; if (v > bv) { bv = v; best = i; } });
      return { down: {}, press: { [String(best + 1)]: true } };
    },
    draw(g, st, ui, live) {
      GK.panel(g);
      const left = 10 - TAL.reduce((s, t) => s + st.p[t.k], 0), build = st.phase === 'build';
      // talents
      GK.head(g, `Talents: ${left} point${left === 1 ? '' : 's'} left`, 24, 36, 'left', C.ink, 17);
      TAL.forEach((t, i) => {
        const y = 52 + i * 60;
        GK.box(g, 24, y, 380, 52, '#fffaf0', '#cdbf9f', 9, 1.5);
        GK.text(g, t.n, 38, y + 22, C.ink, 14, 'left', 800); GK.text(g, t.d + ' per point', 38, y + 40, C.muted, 12, 'left', 500);
        for (let k = 0; k < t.max; k++) { g.fillStyle = k < st.p[t.k] ? C.gold : '#e3d8bf'; g.beginPath(); g.arc(244 + k * (t.max > 5 ? 8 : 16), y + 26, t.max > 5 ? 3.5 : 6, 0, TD.TAU); g.fill(); }
        if (build) { ui.btn('-' + t.k, '−', 330, y + 10, 30, 32, { px: 18 }); ui.btn('+' + t.k, '+', 366, y + 10, 30, 32, { px: 18 }); }
      });
      // spells with what this build makes of them
      const SY = 322;
      GK.head(g, 'Your spells with this build', 24, SY - 12, 'left', C.ink, 15);
      SP.forEach((s, i) => {
        const x = 24 + i * 96, x0 = stats(st.p, i), im = GK.img('../img/' + s.ic + '.jpg'), cdLeft = st.ready[i] - st.ft;
        if (im) g.drawImage(im, x, SY, 56, 56); else GK.box(g, x, SY, 56, 56, '#ddd', '#999', 6);
        g.strokeStyle = st.cast && st.cast.i === i ? C.gold : C.navy; g.lineWidth = st.cast && st.cast.i === i ? 4 : 2; g.strokeRect(x, SY, 56, 56);
        if (st.phase === 'fight' && cdLeft > 0 && SP[i].cd) { g.fillStyle = 'rgba(21,32,68,.7)'; g.fillRect(x, SY, 56, 56 * clamp(cdLeft / x0.cd)); GK.text(g, cdLeft.toFixed(0), x + 28, SY + 35, '#fff', 18, 'center', 800); }
        TD.label(String(i + 1), x + 8, SY + 10, 'center', '#fff', 12, C.navy);
        GK.text(g, s.n, x, SY + 74, C.ink, 12, 'left', 800);
        GK.text(g, `${Math.round(x0.dmg)} dmg${s.dot ? ' / 12 s' : ''}`, x, SY + 90, C.muted, 11, 'left', 600);
        GK.text(g, s.cast ? `${x0.time.toFixed(2)} s cast` : 'instant', x, SY + 104, C.muted, 11, 'left', 600);
        GK.text(g, s.cd ? `${x0.cd.toFixed(1)} s cooldown` : s.dot ? 'lasts 12 s' : 'no cooldown', x, SY + 118, C.muted, 11, 'left', 600);
        GK.text(g, `${Math.round(x0.dmg / x0.time)} per second`, x, SY + 134, i === 0 && st.p.bp + st.p.bs >= 8 ? C.redDk : C.ink, 11, 'left', 800);
        if (st.phase === 'fight') ui.hit('s' + i, x, SY, 56, 56);
      });
      // fight strip
      const FY = 478;
      if (build) ui.btn('go', left ? `Spend ${left} more point${left === 1 ? '' : 's'} to fight` : 'Fight the dummy for 30 seconds', 24, FY, 380, 44, { fill: left ? '#f1ece0' : '#fde9b8', stroke: '#e0a92d', px: 15 });
      else {
        PLAY.bar(g, 24, FY, 380, 14, st.ft / LEN, C.player); GK.text(g, `${Math.min(LEN, st.ft).toFixed(0)} / ${LEN} s`, 404, FY + 32, C.muted, 12, 'right', 700);
        if (st.cast && SP[st.cast.i].cast) { PLAY.bar(g, 24, FY + 44, 380, 12, (st.ft - st.cast.start) / (st.cast.end - st.cast.start), C.gold); GK.text(g, 'casting ' + SP[st.cast.i].n, 24, FY + 74, C.goldInk, 12, 'left', 700); }
        if (st.phase === 'done') ui.btn('again', 'Respec and fight again', 24, FY + 46, 380, 40, { px: 15 });
      }
      // right: the dummy, the meter, and every run so far
      const RX = 440, RW = 580;
      GK.box(g, RX, 20, RW, 190, '#f4ecd9', '#cdbf9f', 12, 1.5);
      TD.use(g); TD.foe(RX + 90, 120, 40, Math.PI, '#b9a98c', { edge: '#8c7a5c' }); GK.text(g, 'target dummy', RX + 90, 190, C.muted, 12, 'center', 600);
      st.fx.forEach(f => { const a = 1 - (st.ft - f.t) / 1; TD.popText(String(f.v), RX + 90 + (f.i - 1.5) * 22, 80 - 40 * (1 - a), C.redDk, a); });
      if (st.dotEnd > st.ft && st.phase === 'fight') TD.label('burning', RX + 90, 48, 'center', '#fff', 12, C.red);
      GK.big(g, Math.round(st.dmg).toLocaleString(), 'your damage this fight', RX + 190, 70);
      const mine = mix(st.casts), tot = st.casts.length || 1;
      GK.text(g, 'your casts', RX + 190, 118, C.muted, 12, 'left', 700);
      let bx = RX + 190; SP.forEach((s, i) => { const w = 360 * mine[i] / tot; g.fillStyle = [C.red, C.player, C.gold, C.purple][i]; g.fillRect(bx, 126, w, 20); if (w > 44) GK.text(g, `${i + 1} ×${mine[i]}`, bx + w / 2, 141, '#fff', 12, 'center', 800); bx += w; });
      g.strokeStyle = '#cdbf9f'; g.strokeRect(RX + 190, 126, 360, 20);
      const b = greedy(st.p), bm = mix(b.casts);
      GK.text(g, 'best play for this build', RX + 190, 168, C.muted, 12, 'left', 700);
      bx = RX + 190; SP.forEach((s, i) => { const w = 360 * bm[i] / b.casts.length; g.fillStyle = [C.red, C.player, C.gold, C.purple][i]; g.fillRect(bx, 176, w, 20); if (w > 44) GK.text(g, `${i + 1} ×${bm[i]}`, bx + w / 2, 191, '#fff', 12, 'center', 800); bx += w; });
      g.strokeStyle = '#cdbf9f'; g.strokeRect(RX + 190, 176, 360, 20);
      // runs table
      GK.head(g, live ? 'Your fights' : 'A scripted player\'s fights', RX, 244, 'left', C.ink, 15); GK.text(g, 'build = points in Power / Speed / Mastery / Recovery', RX + RW, 244, C.muted, 11, 'right', 600);
      const cols = [RX, RX + 130, RX + 260, RX + 400];
      ['build', 'your damage', 'best play', 'buttons in best play'].forEach((h, i) => GK.text(g, h, cols[i], 266, C.muted, 11, 'left', 700));
      const list = (live ? runs : DEMO.slice(0, st.phase === 'done' ? 2 : 1)).slice(-7), top = Math.max(1, ...list.map(r => r.best));
      list.forEach((r, i) => {
        const y = 290 + i * 34;
        GK.text(g, label(r.p), cols[0], y, C.ink, 14, 'left', 700); GK.text(g, Math.round(r.you).toLocaleString(), cols[1], y, C.ink, 14, 'left', 700);
        PLAY.bar(g, cols[2], y - 12, 110, 12, r.best / top, r.used === 1 ? C.redDk : C.good); GK.text(g, Math.round(r.best).toLocaleString(), cols[2], y + 14, C.muted, 11, 'left', 600);
        for (let k = 0; k < 4; k++) { g.fillStyle = k < r.used ? C.navy : '#e3d8bf'; g.beginPath(); g.roundRect(cols[3] + k * 26, y - 14, 20, 20, 5); g.fill(); }
      });
      if (live && !runs.length) PLAY.note(g, 'Finish a fight to list it here. Then respec and fight again: try all ten points on Fire Bolt, then a spread.', RX, 292, RW - 20);
      const bu = used(b.casts);
      ui.stats(`<div><b>${Math.round(b.dmg).toLocaleString()}</b><span>best play with this build</span></div><div class="${bu === 1 ? 'r' : 'g'}"><b>${bu} of 4</b><span>buttons worth pressing in best play</span></div><div class="y"><b>${PLAY.pct(bm[0] / b.casts.length)}</b><span>of best-play casts are Fire Bolt</span></div>`);
      ui.out(build && left ? 'Two talents make one spell better. Two make everything a little better. The meter will tell you which the game wants.'
        : bu === 1 ? 'With this build every other spell is a damage loss. The right way to play is one key, thirty-three times. The talents did that, and no single point looked dangerous.'
        : bu === 4 ? 'All four buttons still earn their cast, so each second asks what is ready and what is running. This build also does less damage than the Fire Bolt stack, and players can see the meter.'
        : `Best play uses ${bu} of the four spells with this build. Push more points into Fire Bolt and watch the others drop out one by one.`);
    },
  });
})();
