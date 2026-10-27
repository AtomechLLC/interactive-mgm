/* Free gear plateau (MGM C3 M6, deck slides 316-317). In the WoW alpha, high-level players handed new players quest
   rewards they couldn't use: no level requirement, not soulbound. The newbie's power spikes at hour one, then every
   quest reward for the next many hours is worse than what they already wear. Two power curves over play time: one
   earning gear by questing, one given a tier-9 weapon at hour one. REWARD_EVERY, GIFT_TIER and GIFT_AT are the model. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;
  const W = 1100, H = 560, HOURS = 30, MAXP = 14, REWARD_EVERY = 2.5, GIFT_TIER = 9, GIFT_AT = 1;
  const X0 = 90, X1 = 1060, Y0 = 470, Y1 = 70;
  const hx = h => lerp(X0, X1, h / HOURS), py = p => lerp(Y0, Y1, p / MAXP);
  const rewards = Array.from({ length: Math.floor(HOURS / REWARD_EVERY) }, (_, i) => ({ h: (i + 1) * REWARD_EVERY, tier: i + 2 }));
  const earned = h => 1 + rewards.filter(r => r.h <= h).length;
  const gifted = (h, soul) => soul || h < GIFT_AT ? earned(h) : Math.max(earned(h), GIFT_TIER);
  // which quest rewards were an upgrade, for each player
  function tally(upTo, soul) {
    const g = rewards.filter(r => r.h <= upTo), wasted = g.filter(r => r.tier <= gifted(r.h - .01, soul));
    const flatFrom = soul ? null : GIFT_AT, flatTo = soul ? null : (rewards.find(r => r.tier > GIFT_TIER)?.h ?? HOURS);
    return { normal: g.length, giftUps: g.length - wasted.length, wasted, flat: soul ? 0 : Math.max(0, Math.min(upTo, flatTo) - flatFrom) };
  }

  function draw(g, h, soul, o = {}) {
    T.use(g); g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,252,244,.7)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill();
    // axes
    g.strokeStyle = '#cdbf9f'; g.lineWidth = 1; g.font = '600 14px Jost, sans-serif'; g.fillStyle = C.muted; g.textAlign = 'right'; g.textBaseline = 'middle';
    for (let p = 0; p <= MAXP; p += 2) { g.beginPath(); g.moveTo(X0, py(p)); g.lineTo(X1, py(p)); g.stroke(); g.fillText(`tier ${p}`, X0 - 10, py(p)); }
    g.textAlign = 'center';
    for (let x = 0; x <= HOURS; x += 5) g.fillText(`${x} h`, hx(x), Y0 + 20);
    g.fillText('hours played', (X0 + X1) / 2, Y0 + 44);
    // the flat stretch
    const t = tally(h, soul);
    if (!soul && h > GIFT_AT) {
      const to = Math.min(h, rewards.find(r => r.tier > GIFT_TIER).h);
      g.fillStyle = 'rgba(229,50,45,.08)'; g.fillRect(hx(GIFT_AT), Y1, hx(to) - hx(GIFT_AT), Y0 - Y1);
      if (to - GIFT_AT > 4) T.label(`${Math.round(to - GIFT_AT)} hours with nothing new to equip`, (hx(GIFT_AT) + hx(to)) / 2, py(GIFT_TIER) - 34, 'center', C.redDk, 16);
    }
    // the two curves, as steps
    const curve = (f, col, w, dash) => {
      g.strokeStyle = col; g.lineWidth = w; g.setLineDash(dash || []); g.beginPath();
      let last = f(0); g.moveTo(hx(0), py(last));
      for (let s = .05; s <= h + 1e-6; s += .05) { const v = f(s); if (v !== last) { g.lineTo(hx(s), py(last)); g.lineTo(hx(s), py(v)); last = v; } }
      g.lineTo(hx(h), py(last)); g.stroke(); g.setLineDash([]);
      return last;
    };
    const vN = curve(earned, C.player, 5), vG = curve(s => gifted(s, soul), C.p2, 5, soul ? [10, 8] : null);
    // rewards along the way: gold when they are an upgrade, a grey cross when they are not
    rewards.filter(r => r.h <= h).forEach(r => {
      g.fillStyle = C.gold; g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.arc(hx(r.h), py(r.tier), 7, 0, Math.PI * 2); g.fill(); g.stroke();
      if (!soul && r.tier <= gifted(r.h - .01, soul)) {
        const x = hx(r.h), y = py(gifted(r.h, soul));
        g.strokeStyle = '#8b8fa8'; g.lineWidth = 4; g.beginPath(); g.moveTo(x - 8, y - 8 - 18); g.lineTo(x + 8, y + 8 - 18); g.moveTo(x + 8, y - 8 - 18); g.lineTo(x - 8, y + 8 - 18); g.stroke();
      }
    });
    // the gift
    if (h >= GIFT_AT - .3) {
      const k = clamp((h - (GIFT_AT - .3)) / .6);
      if (soul) T.label('Can’t trade it: soulbound', hx(GIFT_AT) + 20, py(GIFT_TIER), 'left', C.muted, 16);
      else { T.label('“Want some free stuff?”', hx(GIFT_AT) + 16, py(GIFT_TIER) + 28 * (1 - k), 'left', '#fff', 16, C.p2); }
    }
    // the players at the head of each curve
    T.player(hx(h), py(vN), 0, .8);
    T.player(hx(h), py(vG) - (vG === vN ? 26 : 0), 0, .8, 1, C.p2);
    if (!o.quiet) {
      T.label('Quested for it', X0 + 14, Y1 + 6, 'left', '#fff', 15, C.player);
      T.label(soul ? 'Offered gifts, soulbound' : 'Given a tier-9 weapon at hour 1', X0 + 150, Y1 + 6, 'left', '#fff', 15, C.p2);
    }
    return t;
  }

  canvasDemo('title', (s, cv, g) => (dt, t) => draw(g, Math.min(HOURS, (t % 14) * 2.6), false, { quiet: true }));

  let api = null;
  const SPEED = HOURS / 11;
  canvasDemo('plateau', (s, cv, g) => {
    const st = { h: 0, soul: false, playing: true, tour: true, tt: 0, held: false, last: '' };
    const soulBox = $(s, '.fg-soul');
    soulBox.onchange = () => { st.soul = soulBox.checked; st.tour = false; st.h = 0; st.playing = true; };
    $(s, '.fg-play').onclick = () => { st.tour = false; st.h = 0; st.playing = true; };
    $(s, '.fg-tour').onclick = () => { st.tour = true; st.tt = 0; };
    // tour: play it with gifts, hold, then again with soulbound rewards
    const tourAt = tt => tt < 13 ? { h: Math.min(HOURS, tt * SPEED), soul: false } : { h: Math.min(HOURS, (tt - 13) * SPEED * 1.6), soul: true };
    function render() {
      let { h, soul } = st;
      if (st.tour) ({ h, soul } = tourAt(st.tt));
      const t = draw(g, h, soul);
      soulBox.checked = soul; $(s, '.fg-tour').classList.toggle('on', st.tour);
      const key = `${t.normal}|${t.giftUps}|${Math.round(t.flat)}|${soul}`;
      if (key === st.last) return; st.last = key;
      say($(s, '.fg-stats'), `<div><b>${t.normal}</b><span>upgrades from questing</span></div><div class="g"><b>${t.giftUps}</b><span>upgrades for the gifted player</span></div><div class="r"><b>${Math.round(t.flat)} h</b><span>with nothing new to equip</span></div>`);
      say($(s, '.fg-out'), soul
        ? 'Soulbound quest rewards can’t be handed over, so every new player climbs the same steady steps and every quest pays off.'
        : 'The power spike felt great. Then quest after quest handed out gear worse than the gift, for hours: boredom and tedium instead of steady growth. The recipients paid the real price.');
    }
    api = { seek(t) { st.held = st.tour = true; st.tt = t; render(); }, dur: () => 22 };
    return dt => { if (!st.held) { st.tt += dt; if (st.tour && st.tt > 23) st.tt = 0; if (st.playing && !st.tour) st.h = Math.min(HOURS, st.h + dt * SPEED); } render(); };
  });

  window.__seek = t => api.seek(t);
  window.__dur = () => api.dur();
})();
