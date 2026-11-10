/* Spend the Stash (replanned page for "Gacha Pity"; Scripture: Behavioral Valuation, Noise, Positive and Negative Reinforcement).
   Eight banners played twice: once with a pity counter that resets when a banner ends, once with one that carries over.
   Every pull is a real roll at the stated rate. The page records the learner's own pulls per banner and what they won.
   Rates are compressed (2% and pity at 30) from Genshin Impact's 0.6% and 90 so a run takes a minute. */
(function () {
  const C = TD.C, TAU = TD.TAU, NB = 8, INCOME = 12, PITY = 30, RATE = .02, WANT = [1, 3, 1, 2, 1, 3, 2, 3];
  const HUE = ['#3b6fd4', '#e5322d', '#2fae63', '#8e5bd0', '#17a2a2', '#f5b041', '#d9722b', '#c0398b'];
  const RULES = [{ id: 'reset', n: 'Pity resets each banner', tip: 'Pulls that end short of the character are gone when the banner closes.' }, { id: 'carry', n: 'Pity carries over', tip: 'Pulls that miss stay on the counter for the next banner.' }];
  const saved = [];
  const camp = () => ({ b: 0, stash: INCOME, pity: 0, pulls: Array(NB).fill(0), won: Array(NB).fill(false), lost: 0, q: 0, qt: 0, last: -9, think: 0 });
  function pull(st) {
    const c = st.c; c.stash--; c.pity++; c.pulls[c.b]++; c.last = st.t;
    const hit = c.pity >= PITY || st.R() < RATE;
    if (hit) { c.won[c.b] = true; c.wonAt = c.pity; c.pity = 0; c.q = 0; c.winT = st.t; if (st.live) PLAY.beep(1100, .3, .18); } else if (st.live) PLAY.beep(420, .03, .05, 'square');
  }
  function next(st) {
    const c = st.c;
    if (RULES[st.r].id === 'reset' && !c.won[c.b]) { c.lost += c.pity; c.pity = 0; }
    if (c.b === NB - 1) {
      const row = { r: st.r, pulls: c.pulls, won: c.won, lost: c.lost, left: c.stash, pity: c.pity, hearts: WANT.reduce((a, w, i) => a + (c.won[i] ? w : 0), 0), zero: c.pulls.filter(p => !p).length };
      st.rows[st.r] = row; if (st.live) saved[st.r] = row;
      if (st.r === 0) { st.phase = 'between'; st.at = st.t; } else st.phase = 'end';
      return;
    }
    c.b++; c.stash += INCOME; c.think = 0; c.winT = -9;
  }
  PLAY.game('stash', {
    dur: 60, clickStarts: true,
    init(o, live) { return { live, R: live ? Math.random : GK.rng(21), t: 0, r: 0, c: camp(), rows: [], phase: 'go' }; },
    step(st, inp, dt) {
      st.t += dt; const c = st.c;
      if (st.phase === 'between') { if (st.live ? inp.click === 'go2' : st.t - st.at > 2.2) { st.r = 1; st.c = camp(); st.phase = 'go'; } return; }
      if (st.phase === 'end') { if (st.live && inp.click === 'again') Object.assign(st, this.init({}, true)); return; }
      c.think += dt;
      if (c.q > 0) { c.qt -= dt; if (c.qt <= 0) { c.qt = .06; c.q--; if (c.stash > 0 && !c.won[c.b]) pull(st); else c.q = 0; } return; }
      const k = inp.click;
      if (k === 'p1' && c.stash > 0 && !c.won[c.b]) pull(st);
      else if (k === 'p10' && c.stash > 0 && !c.won[c.b]) { c.q = Math.min(10, c.stash); c.qt = 0; }
      else if (k === 'next') next(st);
    },
    // a scripted player: skips one-heart banners; under reset it only pulls when the stash can reach the guarantee
    bot(st) {
      const c = st.c; if (st.phase !== 'go' || c.q > 0 || c.think < .7) return null;
      const want = WANT[c.b] >= 2 && !c.won[c.b] && c.stash > 0, sure = RULES[st.r].id === 'carry' || c.stash + c.pity >= PITY || c.pulls[c.b] > 0;
      return { down: {}, press: {}, click: want && sure ? 'p10' : (c.think > 1.1 ? 'next' : null) };
    },
    draw(g, st, ui, live) {
      GK.panel(g); const c = st.c, rule = RULES[st.r], X0 = 24, CW = 118, GAP = 6;
      GK.head(g, `Campaign ${st.r + 1} of 2 · ${rule.n}`, X0, 32, 'left', C.ink, 17); GK.text(g, rule.tip, X0, 54, C.muted, 13, 'left', 600);
      for (let i = 0; i < NB; i++) {
        const x = X0 + i * (CW + GAP), y = 68, cur = i === c.b && st.phase === 'go', past = i < c.b || st.phase !== 'go';
        GK.box(g, x, y, CW, 104, cur ? '#fff6dd' : '#fffaf0', cur ? C.navy : '#cdbf9f', 10, cur ? 3 : 1.5);
        g.globalAlpha = past && !c.won[i] ? .35 : 1; g.fillStyle = HUE[i]; g.beginPath(); g.arc(x + CW / 2, y + 36, 20, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(x + CW / 2, y + 30, 8, 0, TAU); g.fill(); g.beginPath(); g.arc(x + CW / 2, y + 50, 13, Math.PI, 0); g.fill(); g.globalAlpha = 1;
        GK.text(g, '♥'.repeat(WANT[i]), x + CW / 2, y + 76, C.red, 15, 'center', 800);
        GK.text(g, c.won[i] ? `won · ${c.pulls[i]} pulls` : (i <= c.b || st.phase !== 'go' ? (c.pulls[i] ? `${c.pulls[i]} pulls, no win` : (past ? 'skipped' : '')) : ''), x + CW / 2, y + 95, c.won[i] ? C.good : C.muted, 11, 'center', 700);
      }
      // the current banner
      const MY = 196; GK.box(g, X0, MY, 610, 150, '#fffaf0', '#cdbf9f', 12, 1.5);
      GK.text(g, 'stash', X0 + 20, MY + 28, C.muted, 12, 'left', 700); GK.text(g, `${c.stash} pulls`, X0 + 20, MY + 58, C.navy, 26, 'left', 800);
      GK.text(g, `+${INCOME} arrive with every banner`, X0 + 20, MY + 80, C.muted, 12, 'left', 600);
      GK.text(g, `pity counter · the character is certain at ${PITY}`, X0 + 230, MY + 28, C.muted, 12, 'left', 700);
      PLAY.bar(g, X0 + 230, MY + 40, 360, 18, c.pity / PITY, c.pity >= PITY - c.stash ? C.good : C.gold); GK.text(g, `${c.pity} of ${PITY}`, X0 + 230, MY + 80, C.ink, 14, 'left', 800);
      GK.text(g, c.pity + c.stash >= PITY ? 'the stash reaches the guarantee' : `${PITY - c.pity - c.stash} short of the guarantee`, X0 + 590, MY + 80, C.muted, 12, 'right', 600);
      if (st.phase === 'go') {
        const can = c.stash > 0 && !c.won[c.b];
        if (live) { if (can) { ui.btn('p1', 'Pull 1', X0 + 20, MY + 98, 120, 40, { px: 14 }); ui.btn('p10', `Pull ${Math.min(10, c.stash)}`, X0 + 150, MY + 98, 120, 40, { px: 14 }); } ui.btn('next', c.b === NB - 1 ? 'Finish the campaign' : 'Next banner', X0 + 420, MY + 98, 170, 40, { px: 14, on: true }); }
        if (st.t - (c.winT || -9) < 1.6) TD.label(`${'♥'.repeat(WANT[c.b])} won on pull ${c.pulls[c.b]}`, X0 + 340, MY + 118, 'center', '#fff', 15, 'rgba(47,174,99,.95)');
        else if (!can && c.won[c.b] && live) GK.text(g, 'you have this one', X0 + 290, MY + 124, C.good, 13, 'left', 700);
      }
      if (st.phase === 'between' && live) ui.btn('go2', 'Now the same eight banners with pity that carries over', X0 + 20, MY + 98, 570, 40, { px: 14, on: true });
      if (st.phase === 'end' && live) ui.btn('again', 'Play both campaigns again', X0 + 20, MY + 98, 570, 40, { px: 14, on: true });
      // odds note
      GK.box(g, 650, MY, 366, 150, '#fffaf0', '#cdbf9f', 12, 1.5);
      GK.wrap(g, `Each pull is a ${RATE * 100}% roll for the banner’s character. Hearts are how much you want each one. You cannot pull for the same character twice.`, 668, MY + 28, 332, 19, C.ink, 13, 600);
      GK.wrap(g, `Compressed from Genshin Impact’s 0.6% rate and pity at 90.`, 668, MY + 118, 332, 17, C.muted, 12, 500);
      // the two rows
      const RY = 366; GK.text(g, 'pulls spent on each banner (★ = won)', X0, RY + 10, C.muted, 12, 'left', 700);
      RULES.forEach((ru, k) => {
        const y = RY + 22 + k * 94, row = st.rows[k] || (k === st.r ? { pulls: c.pulls, won: c.won, cur: true } : null);
        GK.box(g, X0, y, 992, 84, k === st.r && st.phase === 'go' ? '#fff6dd' : '#fffaf0', '#cdbf9f', 10, 1.5);
        GK.text(g, ru.n, X0 + 14, y + 26, C.ink, 13, 'left', 800);
        if (!row) return;
        for (let i = 0; i < NB; i++) { const x = X0 + 230 + i * 62, h = row.pulls[i] / 40 * 56; g.fillStyle = row.won[i] ? C.good : '#9aa7d8'; g.fillRect(x, y + 68 - h, 40, h); g.fillStyle = '#d9cdb2'; g.fillRect(x, y + 68, 40, 2); if (row.pulls[i]) GK.text(g, String(row.pulls[i]), x + 20, y + 62 - h, C.ink, 11, 'center', 700); if (row.won[i]) GK.text(g, '★', x + 20, y + 82, C.good, 12, 'center', 800); GK.text(g, '♥'.repeat(WANT[i]), x + 20, y + 14, 'rgba(229,50,45,.55)', 9, 'center', 700); }
        if (!row.cur) { GK.text(g, `${row.hearts} ♥ won`, X0 + 14, y + 52, C.red, 16, 'left', 800); GK.text(g, `${row.zero} of ${NB} banners with no spending`, X0 + 750, y + 30, C.ink, 13, 'left', 700); GK.text(g, ru.id === 'reset' ? `${row.lost} pulls lost to resets` : `${row.pity} pulls still on the counter`, X0 + 750, y + 52, C.ink, 13, 'left', 700); GK.text(g, `${row.left} pulls never spent`, X0 + 750, y + 72, C.muted, 12, 'left', 600); }
      });
      ui.stats(`<div><b>${c.stash}</b><span>pulls in the stash</span></div><div><b>${c.pity} of ${PITY}</b><span>pity counter</span></div><div class="g"><b>${WANT.reduce((a, w, i) => a + (c.won[i] ? w : 0), 0)} ♥</b><span>won this campaign</span></div>`);
      const [a, b] = st.rows, who = live ? 'you' : 'the script';
      if (st.phase !== 'end') { ui.out(live ? `Banner ${c.b + 1} of ${NB}. Pull now, or move on and keep the stash. ${rule.tip}` : 'A scripted player skips the one-heart banners. With pity that resets it also refuses to start pulling until the stash can reach the guarantee.'); return; }
      ui.out(`With resets ${who} spent on ${NB - a.zero} of ${NB} banners, won ${a.hearts} ♥ and lost ${a.lost} pulls when banners closed. With carry-over ${who} spent on ${NB - b.zero}, won ${b.hearts} ♥, and no pull was ever lost. ` + (a.zero > b.zero ? 'Resets made a half-funded pull a gamble, so more banners went by untouched.' : a.zero < b.zero ? 'Carry-over made waiting free, so more banners went by untouched.' : 'The number of banners skipped came out the same this time.') + ' Every roll here was real, so one run is one sample. The rule a player prefers and the rule that gets every banner some spending are not always the same rule.');
    },
  });
})();
