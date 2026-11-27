// A 50% win rate proves nothing: twenty matches each for two heroes, drawn as the gold lead over time.
// Both finish 10 wins and 10 losses. One hero's matches are settled in the opening minutes; the other's stay open.
(function () {
  const { C, clamp, lerp, seg, ease, easeOut, rng, text, para, rrect, panel, bar, captions } = DC;
  const DUR = 18, N = 20, MIN = 30, T0 = 1, PER = .5, BAND = 3, OPEN = 20;   // ideal session: within 3k gold either way until minute 20
  // a match is the lead (in thousands of gold) at each minute; it ends as a win when the lead is above zero
  function match(kind, win, r) {
    const pts = [0]; let v = 0, vel = 0;
    for (let m = 1; m <= MIN; m++) {
      if (kind === 'snow') { const target = (win ? 1 : -1) * (m < 5 ? m * 1.5 : 7.5 + (m - 5) * .09); v = lerp(v, target, .7) + (r() - .5) * .35; }
      else { const pull = m > 23 ? (win ? 1 : -1) * (m - 23) * .16 : 0; vel = vel * .55 + (r() - .5) * 1.9 + pull - v * .16; v += vel; v = clamp(v, -8, 8); }
      pts.push(v);
    }
    if ((pts[MIN] > 0) !== win) for (let m = 0; m <= MIN; m++) pts[m] = -pts[m];
    return pts;
  }
  function build(kind, seed) {
    const r = rng(seed), order = [1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0];
    return order.map(w => { const pts = match(kind, !!w, r); let flips = 0, decided = MIN;
      for (let m = 2; m <= MIN; m++) if (Math.sign(pts[m]) !== Math.sign(pts[m - 1]) && pts[m - 1] !== 0) flips++;
      for (let m = MIN; m >= 0; m--) if (Math.sign(pts[m]) !== Math.sign(pts[MIN]) || Math.abs(pts[m]) < BAND) { decided = m + 1; break; }
      let fits = true; for (let m = 0; m <= OPEN; m++) if (Math.abs(pts[m]) > BAND) fits = false;
      return { w, pts, flips, decided, fits }; });
  }
  const HEROES = [{ id: 'bram', name: 'Bram', sub: 'Wins the first fight or loses it, and the match with it', x: 40, data: build('snow', 11) },
    { id: 'wisp', name: 'Wisp', sub: 'Trades leads all match and settles it late', x: 820, data: build('swing', 5) }];

  function hero(g, t, h) {
    const w = 740, x = h.x, y = 140, hh = 650, cx = x + 80, cy = y + 330, cw = w - 120, ch = 190;   // chart centre line cy, half height ch
    panel(g, x, y, w, hh, h.name, h.sub);
    const done = clamp(Math.floor((t - T0) / PER), 0, N), cur = (t - T0) / PER - done;
    let wins = 0, losses = 0; for (let i = 0; i < done; i++) h.data[i].w ? wins++ : losses++;
    // figure in the corner: both face into the page centre; the cast draws right-facing, so the right-hand hero is mirrored
    CAST.draw(g, h.id, { x: x + w - 70, y: y + 118, s: .62, face: h.x < 400 ? 1 : -1, pose: 'guard', shadow: false });
    const X = m => cx + m / MIN * cw, Y = v => cy - v / 10 * ch;
    // the ideal session band
    const bandA = ease(seg(t, 12, 12.8));
    if (bandA > 0) { g.fillStyle = `rgba(46,139,87,${.16 * bandA})`; g.fillRect(X(0), Y(BAND), X(OPEN) - X(0), Y(-BAND) - Y(BAND)); g.strokeStyle = `rgba(46,139,87,${bandA})`; g.lineWidth = 2; g.setLineDash([8, 6]); g.strokeRect(X(0), Y(BAND), X(OPEN) - X(0), Y(-BAND) - Y(BAND)); g.setLineDash([]);
      text(g, 'The session we designed: still open at minute 20', X(0) + 8, Y(BAND) - 10, { size: 17, weight: 600, color: C.green, alpha: bandA }); }
    g.strokeStyle = C.line; g.lineWidth = 2; g.strokeRect(cx, cy - ch, cw, ch * 2);
    g.strokeStyle = C.muted; g.lineWidth = 2; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + cw, cy); g.stroke();
    text(g, 'ahead', cx - 10, cy - ch + 18, { size: 16, color: C.muted, align: 'right' }); text(g, 'even', cx - 10, cy + 5, { size: 16, color: C.muted, align: 'right' }); text(g, 'behind', cx - 10, cy + ch - 6, { size: 16, color: C.muted, align: 'right' });
    for (let m = 0; m <= MIN; m += 10) text(g, m + ' min', X(m), cy + ch + 24, { size: 16, color: C.muted, align: 'center' });
    const line = (d, upto, alpha, lw) => { g.beginPath(); const last = upto * MIN; for (let m = 0; m <= Math.floor(last); m++) g[m ? 'lineTo' : 'moveTo'](X(m), Y(d.pts[m]));
      const f = last - Math.floor(last); if (f > 0 && last < MIN) { const m = Math.floor(last); g.lineTo(X(m + f), Y(lerp(d.pts[m], d.pts[m + 1], f))); }
      g.strokeStyle = d.w ? `rgba(46,163,220,${alpha})` : `rgba(194,69,45,${alpha})`; g.lineWidth = lw; g.lineJoin = 'round'; g.stroke(); };
    for (let i = 0; i < done; i++) line(h.data[i], 1, bandA > 0 ? (h.data[i].fits ? .75 : .22) : .4, 2.5);
    if (done < N && t >= T0) line(h.data[done], clamp(cur * 1.15), 1, 4);
    // tally
    const ty = y + 590; const rate = done ? Math.round(wins / done * 100) : 0;
    text(g, 'Wins', x + 30, ty, { size: 17, color: C.muted }); text(g, String(wins), x + 30, ty + 34, { size: 32, weight: 700, color: C.blue });
    text(g, 'Losses', x + 110, ty, { size: 17, color: C.muted }); text(g, String(losses), x + 110, ty + 34, { size: 32, weight: 700, color: C.red });
    text(g, 'Win rate', x + 210, ty, { size: 17, color: C.muted }); text(g, done ? rate + '%' : '–', x + 210, ty + 34, { size: 32, weight: 800, font: 'Montserrat' });
    const st = ease(seg(t, T0 + N * PER + .2, T0 + N * PER + .8));
    if (st > 0) { const early = h.data.filter(d => d.decided <= 5).length, flips = h.data.reduce((a, d) => a + d.flips, 0) / N, fits = h.data.filter(d => d.fits).length;
      text(g, 'Settled by minute 5', x + 320, ty, { size: 17, color: C.muted, alpha: st }); text(g, early + ' of ' + N, x + 320, ty + 34, { size: 32, weight: 700, alpha: st });
      if (bandA > 0) { text(g, 'Fit the session', x + 530, ty, { size: 17, color: C.green, alpha: bandA }); text(g, fits + ' of ' + N, x + 530, ty + 34, { size: 32, weight: 700, color: C.green, alpha: bandA }); }
      else { text(g, 'Lead changes', x + 530, ty, { size: 17, color: C.muted, alpha: st }); text(g, flips.toFixed(1) + ' a match', x + 530, ty + 34, { size: 32, weight: 700, alpha: st }); } }
  }

  DC.scene({
    dur: DUR, kicker: '9 · Balance for purpose, not equality', title: 'A 50% win rate proves nothing',
    draw(g, t) {
      HEROES.forEach(h => hero(g, t, h));
      captions(g, t, [[0, 'Two heroes, twenty matches each. The line is the gold lead over thirty minutes: blue ends in a win, red in a loss.'],
        [6, 'Both tallies are heading for the same number.'],
        [T0 + N * PER, 'Ten wins, ten losses, 50% each. A spreadsheet calls both heroes balanced.'],
        [12, 'Balance means alignment with the ideal session. Lay that session over the matches and count again.'],
        [15, 'Same win rate. One hero produces the game you designed, and the other ends it at minute five.']]);
    },
  });
})();
