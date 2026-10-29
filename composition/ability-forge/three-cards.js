/* Three cards, three steps (MGM C4 M7, deck slides 84-103). Each of the deck's abilities fills in slot by slot: Purpose, then
   Payload, then Packaging, then its name. The three end side by side, and the [Extinguish] both fire answers carry lights up:
   notes on 104, "each acts very differently, but they share the extinguish keyword". Click a card to build it again. */
(function () {
  const { icon, text, wrap, card, chip, TONE, scene, pointer, inBox, clamp, ease } = CK;
  const C = TD.C, F = window.FORGE;
  const X = [180, 520, 860], CY = 296, W = 300, H = 500, GAP = 4.6, DUR = 19;
  const at = i => .6 + i * GAP;            // when card i starts filling

  // one slot: a dashed space until its time, then the content drops in
  function slot(g, k, x, y, w, h, fill) {
    if (k <= 0) { card(g, x, y, w, h, { dash: [6, 6], shadow: false, edge: '#cdbf9f', fill: 'rgba(255,250,240,.4)', r: 8 }); return; }
    const s = 1 + .25 * (1 - ease(k));
    g.save(); g.globalAlpha *= ease(k); g.translate(x, y); g.scale(s, s); fill(); g.restore();
  }

  function oneCard(g, i, t0, t, glow) {
    const p = F.PRESETS[i], x = X[i], L = -W / 2 + 22, s = t - t0, done = s > 3.6;
    const kP = clamp(s / .4), kY = clamp((s - 1.2) / .4), kK = clamp((s - 2.4) / .4), kN = clamp((s - 3.4) / .4);
    const live = s > 0 && !done;
    card(g, x, CY, W, H, { edge: live ? C.navy : done ? '#8ea2e6' : '#cdbf9f', lw: live ? 4 : 3 });
    // name and icon arrive last, once the three steps are in
    slot(g, kN, x, 112, 84, 84, () => icon(g, F.PACKS[p.pack].icon, 0, 0, 80));
    if (kN > 0) { text(g, p.name, x, 176, { size: 22, w: 800, display: true, a: ease(kN) }); g.save(); g.globalAlpha = ease(kN); wrap(g, p.desc, x, 202, W - 50, { size: 13, col: C.muted, align: 'center', lh: 16 }); g.restore(); }
    else text(g, 'Ability ' + (i + 1), x, 176, { size: 20, w: 800, display: true, col: '#b9b09a' });
    // 1 Purpose
    chip(g, '1  Purpose', x + L, 250, { ...TONE.blue, size: 13, align: 'left', a: s > 0 ? 1 : .45 });
    slot(g, kP, x, 286, W - 40, 44, () => wrap(g, F.PROBLEMS[p.problem].purpose, L + 2, -9, W - 50, { size: 14.5, w: 700, lh: 17 }));
    // 2 Payload
    chip(g, '2  Payload', x + L, 336, { ...TONE.gold, size: 13, align: 'left', a: s > 1.2 ? 1 : .45 });
    slot(g, kY, x, 372, W - 40, 40, () => {
      let cx = L + 2; p.keys.forEach(k => {
        if (k === 'Extinguish' && glow > 0) { g.fillStyle = `rgba(253,214,99,${glow * (.55 + .35 * Math.sin(t * 5))})`; g.beginPath(); g.roundRect(cx - 7, -18, 112, 36, 10); g.fill(); }
        cx += chip(g, `[${k}]`, cx, 0, { ...TONE[F.tone(k)], size: 14, align: 'left' }) + 6;
      });
    });
    // 3 Packaging
    chip(g, '3  Packaging', x + L, 422, { ...TONE.purple, size: 13, align: 'left', a: s > 2.4 ? 1 : .45 });
    slot(g, kK, x, 458, W - 40, 40, () => { const w = chip(g, `[${p.pack}]`, L + 2, 0, { ...TONE.purple, size: 14, align: 'left' }); text(g, F.PACKS[p.pack].line, L + w + 10, 0, { align: 'left', size: 13, col: C.ink }); });
    // the problem it answers
    if (kP > 0) { const P = F.PROBLEMS[p.problem]; icon(g, P.icon, x - 94, 516, 30, { lw: 2, a: ease(kP) }); text(g, `answers the ${P.name}`, x - 72, 516, { align: 'left', size: 13, w: 700, col: C.navy, a: ease(kP) }); }
  }

  scene('three-cards', {
    dur: DUR,
    state: () => ({ redo: -1, at: -9 }),
    init(s, st, api) {
      pointer(api.cv, (x, y, type) => { if (type !== 'down') return; X.forEach((cx, i) => { if (inBox(x, y, cx, CY, W, H)) { api.manual(); st.redo = i; st.at = st.t; } }); });
    },
    draw(g, t, st, tour) {
      const t0 = i => tour ? at(i) : (st.redo === i ? st.at : -99);
      const glow = tour ? ease(clamp((t - 14.2) / .5)) : 1;
      X.forEach((_, i) => oneCard(g, i, t0(i), t, glow));
      if (glow > 0) {
        g.save(); g.globalAlpha = glow;
        text(g, 'Both carry [Extinguish], so both answer the Flame Demon, in different ways.', 520, 572, { size: 16, w: 800, col: C.navy });
        g.restore();
      }
    },
    side(t, st, tour) {
      if (!tour) return { out: st.redo >= 0 ? `${F.PRESETS[st.redo].name}: purpose first, then the payload’s keywords, then the theme that packages them.` : 'Click a card to build it again.' };
      const i = Math.max(0, Math.min(2, Math.floor((t - .6) / GAP))), s = t - at(i);
      if (t > 14) return { out: 'Three abilities in a few minutes. Smothering Smoke and Restoring Rain act very differently but share [Extinguish].' };
      const step = s < 1.2 ? 'Purpose: what problem it solves' : s < 2.4 ? 'Payload: the keywords that do it' : s < 3.4 ? 'Packaging: the theme it wears' : 'Named';
      return { out: `<b>${F.PRESETS[i].name}</b>. ${step}.` };
    },
  });
})();
