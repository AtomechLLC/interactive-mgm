/* Pick Your Bonus (replanned page for the D&D Advantage post; Scripture: Noise, Game Math Formulae, Break Points).
   Twelve checks at shown target numbers; the learner picks Advantage or a flat +3 before each roll. The odds shown are exact
   (no automatic success on a natural 20, as for a 5e ability check). The picks and rolls are the learner's own. */
(function () {
  const C = TD.C, clamp = TD.clamp;
  const pAdv = n => clamp(1 - ((n - 1) / 20) ** 2), pFlat = n => clamp((24 - n) / 20), pPlain = n => clamp((21 - n) / 20);
  const CHECKS = [['Pick the lock', 11], ['Leap the chasm', 18], ['Calm the horse', 6], ['Spot the ambush', 15], ['Bluff the archmage', 20], ['Climb the wall', 9],
    ['Tie the knot', 4], ['Recall the rune', 13], ['Disarm the trap', 19], ['Track the wolf', 8], ['Swim the rapids', 17], ['Outstare the dragon', 22]];
  const better = n => pAdv(n) > pFlat(n) + 1e-9 ? 'adv' : pFlat(n) > pAdv(n) + 1e-9 ? 'flat' : 'tie';
  const ACOL = C.purple, FCOL = C.gold;

  PLAY.game('bonus', {
    dur: 46, keys: ['a', '3'],
    init(o, live) {
      const R = live ? Math.random : GK.rng(4);
      const order = CHECKS.map((c, i) => [live ? Math.random() : i, c]).sort((a, b) => a[0] - b[0]).map(a => a[1]);
      return { live, R, order, i: 0, phase: 'pick', t: 0, at: 0, log: [] };
    },
    step(st, inp, dt) {
      st.t += dt;
      if (st.phase === 'end') { if (st.live && inp.click === 'again') Object.assign(st, this.init({}, true)); return; }
      if (st.phase === 'pick') {
        const pick = inp.click === 'adv' || inp.press.a ? 'adv' : inp.click === 'flat' || inp.press['3'] ? 'flat' : null;
        if (!pick) return;
        const n = st.order[st.i][1], d = () => 1 + Math.floor(st.R() * 20), r1 = d(), r2 = d();
        const total = pick === 'adv' ? Math.max(r1, r2) : r1 + 3;
        st.log.push({ name: st.order[st.i][0], n, pick, r1, r2: pick === 'adv' ? r2 : null, ok: total >= n, best: better(n) });
        st.phase = 'roll'; st.at = st.t; if (st.live) PLAY.beep(500, .08, .12, 'square');
      } else if (st.t - st.at > (st.live ? 2.2 : 2.4) || (st.live && st.t - st.at > .8 && inp.click)) {
        if (st.live && st.t - st.at < 2.2) { /* a click skips the wait */ }
        st.i++; st.phase = st.i >= st.order.length ? 'end' : 'pick'; st.at = st.t;
      }
    },
    // the scripted player does what most tables do: Advantage whenever it looks hard, +3 when it looks easy
    bot(st) { return st.phase === 'pick' && st.t - st.at > 1 ? { down: {}, press: { [st.order[st.i][1] >= 12 ? 'a' : '3']: true } } : null; },
    draw(g, st, ui, live) {
      GK.panel(g);
      const end = st.phase === 'end', cur = st.order[Math.min(st.i, 11)], L = st.log[st.log.length - 1], rolling = st.phase === 'roll';
      const LX = 24, LW = 430;
      GK.head(g, end ? 'Twelve checks, your picks' : `Check ${st.i + 1} of 12`, LX, 32, 'left', C.ink, 17);
      if (!end) {
        GK.box(g, LX, 48, LW, 150, '#fffaf0', '#cdbf9f', 12, 2);
        GK.text(g, cur[0], LX + 20, 84, C.ink, 20, 'left', 800);
        GK.text(g, 'You need', LX + 20, 124, C.muted, 14, 'left', 600);
        GK.text(g, String(cur[1]), LX + 100, 136, C.navy, 44, 'left', 800);
        GK.text(g, 'or higher on a d20', LX + 100 + (cur[1] > 9 ? 62 : 36), 124, C.muted, 14, 'left', 600);
        GK.text(g, `With no bonus: ${PLAY.pct(pPlain(cur[1]))}`, LX + 20, 176, C.muted, 13, 'left', 600);
        if (st.phase === 'pick') {
          ui.btn('adv', 'A · Advantage', LX, 216, 208, 64, { px: 17 }); ui.btn('flat', '3 · Flat +3', LX + 222, 216, 208, 64, { px: 17 });
          GK.text(g, 'roll twice, keep the higher', LX + 104, 300, C.muted, 12, 'center', 600); GK.text(g, 'roll once, add three', LX + 326, 300, C.muted, 12, 'center', 600);
        } else {
          const k = clamp((st.t - st.at) / .7), die = (v, x, hi) => { GK.box(g, x, 216, 64, 64, hi ? C.navy : '#fffaf0', C.navy, 10, 2); GK.text(g, String(k < 1 ? 1 + Math.floor((st.t * 37 + x) % 20) : v), x + 32, 258, hi ? '#fff' : C.ink, 26, 'center', 800); };
          if (L.pick === 'adv') { die(L.r1, LX, k >= 1 && L.r1 >= L.r2); die(L.r2, LX + 76, k >= 1 && L.r2 > L.r1); } else { die(L.r1, LX, k >= 1); GK.text(g, '+ 3', LX + 96, 258, C.ink, 24, 'left', 800); }
          if (k >= 1) {
            GK.text(g, L.ok ? 'Success' : 'Failure', LX + 180, 244, L.ok ? C.good : C.redDk, 22, 'left', 800);
            GK.text(g, `${L.pick === 'adv' ? Math.max(L.r1, L.r2) : L.r1 + 3} against ${L.n}`, LX + 180, 268, C.muted, 13, 'left', 600);
            // the exact odds of both, shown only after the pick
            [['Advantage', pAdv(L.n), ACOL, 'adv'], ['Flat +3', pFlat(L.n), FCOL, 'flat']].forEach(([nm, p, col, id], j) => {
              const y = 318 + j * 34; GK.text(g, nm + (L.pick === id ? '  (your pick)' : ''), LX, y, C.ink, 13, 'left', L.pick === id ? 800 : 500);
              PLAY.bar(g, LX + 170, y - 11, 200, 13, p, col); GK.text(g, (p * 100).toFixed(p * 100 % 1 ? 1 : 0) + '%', LX + LW, y, C.ink, 14, 'right', 700);
            });
          }
        }
      }
      // the log of picks
      const TY = end ? 62 : 404, rows = end ? st.log : st.log.slice(-4), RH = end ? 30 : 34;
      if (rows.length) ['check', 'need', 'pick', 'better', 'roll'].forEach((h, i) => GK.text(g, h, LX + [0, 176, 226, 300, 380][i], TY, C.muted, 11, 'left', 700));
      rows.forEach((r, i) => {
        const y = TY + 24 + i * RH, right = r.best === 'tie' || r.best === r.pick;
        GK.text(g, r.name, LX, y, C.ink, 13, 'left', 600); GK.text(g, String(r.n), LX + 176, y, C.ink, 14, 'left', 700);
        GK.text(g, r.pick === 'adv' ? 'Adv' : '+3', LX + 226, y, r.pick === 'adv' ? ACOL : '#a8741a', 14, 'left', 800);
        GK.text(g, (r.best === 'adv' ? 'Adv' : '+3') + ` by ${Math.round(Math.abs(pAdv(r.n) - pFlat(r.n)) * 100)} pts`, LX + 300, y, right ? C.good : C.redDk, 12, 'left', 700);
        GK.text(g, r.ok ? '✓' : '✗', LX + 384, y, r.ok ? C.good : C.redDk, 16, 'left', 800);
      });
      if (end && live) ui.btn('again', 'Twelve more, new order', LX, 470, 240, 44, { px: 14 });
      // the chart: both curves appear once the twelve are done; until then only your picks
      const RX = 530, RY = 70, RW = 470, RH2 = 360;
      GK.head(g, end ? 'Chance of success by number needed' : 'Your picks so far', RX, 32, 'left', C.ink, 17);
      const ax = GK.axes(g, RX, RY, RW, RH2, { x0: 1, x1: 23, y0: 0, y1: 1, xt: [2, 5, 8, 11, 14, 17, 20, 23], yt: [0, .25, .5, .75, 1], xl: 'number needed on the d20', fmtY: PLAY.pct });
      const curve = f => Array.from({ length: 23 }, (_, k) => [ax.sx(k + 1), ax.sy(f(k + 1))]);
      if (end) {
        g.fillStyle = 'rgba(245,176,65,.16)'; g.fillRect(ax.sx(17.5), RY, ax.sx(23) - ax.sx(17.5), RH2); g.fillRect(ax.sx(1), RY, ax.sx(4.5) - ax.sx(1), RH2);
        GK.line(g, curve(pPlain), '#b9b2a0', 2, [5, 5]); GK.line(g, curve(pAdv), ACOL, 3); GK.line(g, curve(pFlat), FCOL, 3);
        GK.text(g, '+3 ahead', ax.sx(20.2), RY + 18, '#a8741a', 12, 'center', 800); GK.text(g, '+3 ahead', ax.sx(2.8), RY + RH2 - 10, '#a8741a', 12, 'center', 800); GK.text(g, 'Advantage ahead', ax.sx(11), RY + 18, ACOL, 12, 'center', 800);
      }
      st.log.forEach(r => {
        const p = r.pick === 'adv' ? pAdv(r.n) : pFlat(r.n), right = r.best === 'tie' || r.best === r.pick;
        g.fillStyle = r.pick === 'adv' ? ACOL : FCOL; g.strokeStyle = right ? '#fff' : C.redDk; g.lineWidth = right ? 2 : 3; g.beginPath(); g.arc(ax.sx(r.n), ax.sy(p), 8, 0, TD.TAU); g.fill(); g.stroke();
      });
      [['Advantage', ACOL], ['Flat +3', FCOL]].forEach(([nm, col], i) => { g.fillStyle = col; g.beginPath(); g.arc(RX + 8 + i * 120, RY + RH2 + 56, 6, 0, TD.TAU); g.fill(); GK.text(g, nm, RX + 20 + i * 120, RY + RH2 + 60, C.ink, 12, 'left', 600); });
      GK.text(g, 'red ring: the other pick had the higher chance', RX + 240, RY + RH2 + 60, C.muted, 12, 'left', 600);
      if (end) GK.text(g, 'dashed: no bonus at all', RX, RY + RH2 + 82, C.muted, 12, 'left', 600);
      // side panel
      const right = st.log.filter(r => r.best === 'tie' || r.best === r.pick).length, wins = st.log.filter(r => r.ok).length;
      const exp = st.log.reduce((a, r) => a + (r.pick === 'adv' ? pAdv(r.n) : pFlat(r.n)), 0), top = st.log.reduce((a, r) => a + Math.max(pAdv(r.n), pFlat(r.n)), 0);
      ui.stats(`<div class="g"><b>${right}/${st.log.length}</b><span>picks with the higher chance</span></div><div><b>${wins}</b><span>checks passed</span></div><div class="r"><b>${(top - exp).toFixed(2)}</b><span>successes given up, on average, by your picks</span></div>`);
      const longs = st.log.filter(r => r.n >= 18), longAdv = longs.filter(r => r.pick === 'adv').length, sure = st.log.filter(r => r.n <= 4 && r.pick === 'adv').length;
      const who = live ? 'You' : 'The scripted player';
      ui.out(!end ? (live ? 'Pick with A or 3, or click. The exact odds of both appear after each pick, so you can change your mind for the next one.' : 'A scripted player takes Advantage whenever the check looks hard and +3 when it looks easy, which is how most tables play it.')
        : `${who} took the higher chance on ${right} of 12. Advantage is worth most near a coin flip (+25 points over no bonus at 11, against +15 for the +3) and fades toward both ends. On the long shots of 18 and up, +3 is ahead, and ${who.toLowerCase()} reached for Advantage on ${longAdv} of those ${longs.length}${sure ? '; on the near-certain check +3 made it certain' : ''}. Rolling twice cannot reach a number one die cannot reach.`);
    },
  });
})();
