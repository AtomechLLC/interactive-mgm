/* Three dials (MGM C4 M7, deck slides 56-65). The Ability Planning Framework as three dials: purpose (the problem), payload
   (the mechanics) and packaging (the theme). Turn one and the other two stay locked, and a real ability from another game
   lands in the card. The walk-through follows the deck's Nayru's Love -> Mario's Cape example, then keeps turning.
   Abilities live in abilities.js so the other slides on this page can share them. */
(function () {
  const { $$ } = FPF.kit;
  const { pic, icon, text, wrap, card, chip, TONE, scene, pointer, inBox, clamp, ease } = CK;
  const C = TD.C, A = window.ABIL;
  const DIALS = [['purpose', 'Purpose', 'the problem', '#4a68d8', TONE.blue], ['payload', 'Payload', 'the mechanics', '#e0a92d', TONE.gold], ['packaging', 'Packaging', 'the theme', '#a77fe0', TONE.purple]];
  const DX = 74, DY = [150, 300, 450], DR = 46;
  const PURPOSES = [...new Set(A.map(a => a.purpose))];
  // walk-through: [time, ability index, dial turned, caption]
  const STEPS = [
    [0, 0, null, 'Nayru’s Love: purpose, payload and packaging. Now turn one dial at a time.'],
    [3.2, 1, 'packaging', 'Packaging turned: the same reflect, as a swish of Mario’s cape.'],
    [6.4, 2, 'packaging', 'Packaging again: Fox’s hexagon device. Still a reflect.'],
    [9.6, 3, 'payload', 'Payload turned: block instead of reflect. Still counters projectiles.'],
    [12.8, 4, 'packaging', 'The wind becomes a vault door: Braum’s Unbreakable.'],
    [16, 5, 'purpose', 'Purpose turned: now the problem is a player who blocks. A grab beats it.'],
    [19.2, 6, 'payload', 'Payload turned: the grab gains range, and the theme follows. Link’s Hookshot.'],
    [22.4, 8, 'purpose', 'Purpose turned: close the gap. A warrior’s charge.'],
    [25.6, 9, 'payload', 'Payload turned: teleport instead of a dash.'],
    [28.8, 9, 'end', 'Change one dial, keep the other two, and you have a new ability to try.'],
  ];
  const DUR = 31.5;
  const fields = a => ({ purpose: a.purpose, payload: a.payload, packaging: a.packaging });

  // the state the canvas shows: from the walk-through clock, or from the dials the viewer turned
  function view(t, st, tour) {
    if (!tour) return st;
    let i = 0; while (i + 1 < STEPS.length && t >= STEPS[i + 1][0]) i++;
    const end = STEPS[i][2] === 'end', s = STEPS[i], q = end ? STEPS[i - 1] : s, p = STEPS[Math.max(0, STEPS.indexOf(q) - 1)];
    return { cur: s[1], prev: i ? p[1] : null, turned: q[2], turnT: end ? q[0] - 9 : s[0], msg: s[3], turns: STEPS.slice(1, i + 1).reduce((o, x) => (x[2] && x[2] !== 'end' && (o[x[2]] = (o[x[2]] || 0) + 1), o), {}) };
  }
  function turn(st, d, t) {
    const a = A[st.cur];
    let next = null;
    if (d === 'purpose') { const p = PURPOSES[(PURPOSES.indexOf(a.purpose) + 1) % PURPOSES.length]; next = A.findIndex(x => x.purpose === p); }
    if (d === 'payload') {
      const pays = [...new Set(A.filter(x => x.purpose === a.purpose).map(x => x.payload))];
      if (pays.length > 1) { const p = pays[(pays.indexOf(a.payload) + 1) % pays.length]; next = A.findIndex(x => x.purpose === a.purpose && x.payload === p); }
    }
    if (d === 'packaging') {
      const same = A.map((x, i) => i).filter(i => A[i].purpose === a.purpose && A[i].payload === a.payload);
      if (same.length > 1) next = same[(same.indexOf(st.cur) + 1) % same.length];
    }
    st.turns[d] = (st.turns[d] || 0) + 1; st.turnT = t;
    if (next == null) { st.turned = d; st.stuck = true; st.msg = d === 'payload' ? `Only one payload on file for “${a.purpose}”. A second one is yours to design.` : `Only one packaging on file for this payload. A new theme for it is yours to design.`; return; }
    st.stuck = false; st.prev = st.cur; st.cur = next; st.turned = d;
    const n = A[next]; st.msg = `${DIALS.find(x => x[0] === d)[1]} turned: ${n.name} (${n.game}).`;
  }

  function art(g, a, x, y, s) {
    if (a.art.startsWith('gi:')) { g.fillStyle = a.col; g.beginPath(); g.arc(x, y, s / 2, 0, Math.PI * 2); g.fill(); g.strokeStyle = C.navy; g.lineWidth = 3; g.stroke(); GI.draw(g, a.art.slice(3), x, y, s * .62, '#fff'); }
    else if (a.art.startsWith('pk-')) { g.fillStyle = '#fde9b8'; g.beginPath(); g.arc(x, y, s / 2, 0, Math.PI * 2); g.fill(); g.strokeStyle = C.navy; g.lineWidth = 3; g.stroke(); pic(g, a.art, x, y + 2, s * .86); }
    else icon(g, a.art, x, y, s * .86);
  }
  function dial(g, i, v, t) {
    const [k, name, sub, col, tone] = DIALS[i], y = DY[i];
    const active = v.turned === k, since = t - v.turnT;
    const glow = active ? clamp(1 - since / 2.2) : 0;
    // the knob turns a quarter each time it is turned
    const n = v.turns[k] || 0, ang = -Math.PI / 2 + (n - 1 + (active ? ease(clamp(since / .5)) : 1)) * Math.PI / 2;
    if (glow) { g.fillStyle = `rgba(253,214,99,${.55 * glow})`; g.beginPath(); g.arc(DX, y, DR + 14, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#fffaf0'; g.strokeStyle = col; g.lineWidth = 5; g.beginPath(); g.arc(DX, y, DR, 0, Math.PI * 2); g.fill(); g.stroke();
    for (let j = 0; j < 12; j++) { const a = j / 12 * Math.PI * 2; g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); g.moveTo(DX + Math.cos(a) * (DR - 4), y + Math.sin(a) * (DR - 4)); g.lineTo(DX + Math.cos(a) * (DR - 11), y + Math.sin(a) * (DR - 11)); g.stroke(); }
    g.fillStyle = col; g.beginPath(); g.arc(DX, y, DR - 18, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(DX, y); g.lineTo(DX + Math.cos(ang) * (DR - 22), y + Math.sin(ang) * (DR - 22)); g.stroke();
    text(g, name, DX + 62, y - 26, { align: 'left', size: 20, w: 800, display: true, col: col === '#e0a92d' ? '#9a6a06' : col });
    text(g, sub, DX + 62, y - 6, { align: 'left', size: 13, col: C.muted });
    const val = A[v.cur][k];
    wrap(g, val, DX + 62, y + 16, 196, { size: 14, lh: 17, w: 600, col: C.ink });
    // the other two dials lock while one turns
    const moved = v.prev != null && !v.stuck && A[v.prev][k] !== val;
    if (v.turned && !active && !moved && since < 2.2) { const a = clamp(Math.min(since / .25, (2.2 - since) / .4)); g.save(); g.globalAlpha = a; g.fillStyle = '#fffaf0'; g.beginPath(); g.arc(DX + 36, y - 34, 15, 0, Math.PI * 2); g.fill(); g.restore(); GI.draw(g, 'padlock', DX + 36, y - 34, 22 * a + .01, C.navy); }
  }
  function abilityCard(g, a, x, y, o = {}) {
    const W = 330, H = 476, k = o.k ?? 1;
    g.save(); g.globalAlpha *= k; g.translate(x, y + (1 - k) * 24);
    card(g, 0, 0, W, H, { edge: C.navy, lw: 3 });
    art(g, a, 0, -164, 104);
    text(g, a.name, 0, -92, { size: a.name.length > 13 ? 23 : 27, w: 800, display: true });
    text(g, a.game, 0, -66, { size: 14, col: C.muted });
    const rows = [['purpose', a.purpose, null], ['payload', a.payload, a.detail], ['packaging', a.packaging, null]];
    let ry = -30;
    rows.forEach(([f, v, d], i) => {
      const [, name, , , tone] = DIALS[i], hot = o.hot === f ? o.glow : 0;
      const lines = wrap(g, v, 0, 0, 280, { size: 16, w: 700, draw: false }), hgt = 34 + lines.length * 20 + (d ? 20 : 0);
      if (hot) { g.fillStyle = `rgba(253,214,99,${.65 * hot})`; g.beginPath(); g.roundRect(-W / 2 + 12, ry - 4, W - 24, hgt, 10); g.fill(); }
      chip(g, name, -W / 2 + 26, ry + 12, { ...tone, size: 13, align: 'left' });
      lines.forEach((l, j) => text(g, l, -W / 2 + 28, ry + 38 + j * 20, { align: 'left', size: 16, w: 700 }));
      if (d) text(g, d, -W / 2 + 28, ry + 38 + lines.length * 20, { align: 'left', size: 13.5, col: C.muted, it: true });
      ry += hgt + 8;
    });
    g.restore();
  }

  scene('three-dials', {
    dur: DUR,
    state: () => ({ cur: 0, prev: null, turned: null, turnT: -9, turns: {}, msg: '', stuck: false }),
    init(s, st, api) {
      const go = d => { if (st.tour) { const v = view(st.t, st, true); api.manual(); Object.assign(st, { cur: v.cur, prev: v.prev, turns: { ...v.turns } }); } turn(st, d, st.t); };
      $$(s, '.td-turn').forEach(b => b.onclick = () => go(b.dataset.d));
      pointer(api.cv, (x, y, type) => { if (type === 'down') DIALS.forEach(([k], i) => { if (inBox(x, y, DX + 100, DY[i], 260, 120)) go(k); }); });
    },
    draw(g, t, st, tour) {
      const v = view(t, st, tour), a = A[v.cur], since = t - v.turnT, k = v.prev == null || v.stuck ? 1 : ease(clamp(since / .45));
      DIALS.forEach((d, i) => dial(g, i, v, t));
      // the card, and what it was a moment ago
      abilityCard(g, a, 522, 300, { k, hot: v.stuck ? null : v.turned, glow: clamp(1 - (since - .4) / 2) });
      text(g, 'Before', 862, 42, { size: 14, w: 700, col: C.muted, display: true });
      if (v.prev != null) {
        const p = A[v.prev];
        card(g, 862, 106, 300, 96, { edge: '#cdbf9f' });
        art(g, p, 762, 106, 62);
        text(g, p.name, 806, 92, { align: 'left', size: 17, w: 800, display: true });
        wrap(g, p.game, 806, 116, 190, { size: 12.5, col: C.muted, lh: 15 });
        text(g, 'What changed', 862, 186, { size: 14, w: 700, col: C.muted, display: true });
        const was = fields(p), now = fields(a);
        let y = 212;
        DIALS.forEach(([f, name, , col, tone], i) => {
          const changed = was[f] !== now[f];
          chip(g, name, 724, y + 12, { ...(changed ? tone : TONE.grey), size: 12.5, align: 'left' });
          text(g, changed ? 'changed' : 'kept', 1020, y + 12, { align: 'right', size: 13, w: 700, col: changed ? C.redDk : C.good });
          if (changed) {
            const l1 = wrap(g, was[f], 724, y + 38, 290, { size: 12.5, col: C.muted, lh: 15 });
            text(g, '→', 722, y + 40 + l1.length * 15, { align: 'left', size: 15, w: 800, col: C.navy });
            const l2 = wrap(g, now[f], 740, y + 40 + l1.length * 15, 276, { size: 13, w: 700, lh: 15 });
            y += 46 + (l1.length + l2.length) * 15 + 4;
          } else y += 34;
        });
      } else {
        card(g, 862, 230, 300, 300, { edge: '#b9b09a', dash: [8, 6], shadow: false, fill: 'rgba(255,250,240,.4)' });
        wrap(g, 'Turn a dial. The card keeps two of its three parts and swaps the third for a real ability that shares them.', 862, 180, 250, { size: 15, align: 'center', col: C.muted, lh: 20 });
      }
      if (v.msg) text(g, v.msg, 520, 564, { size: 15, col: v.stuck ? C.goldInk : C.navy, a: tour ? clamp(since / .4) : 1, w: 700 });
    },
    side(t, st, tour) {
      const v = view(t, st, tour), a = A[v.cur];
      const pays = new Set(A.map(x => x.payload)).size;
      const stats = `<div class="b"><b>${PURPOSES.length}</b><span>purposes</span></div><div class="y"><b>${pays}</b><span>payloads</span></div><div class="g"><b>${A.length}</b><span>real abilities on file</span></div>`;
      const out = `<b>${a.name}</b> (${a.game}). Purpose: ${a.purpose.toLowerCase()}. Payload: ${a.payload.toLowerCase()}, ${a.detail.charAt(0).toLowerCase() + a.detail.slice(1)}. Packaging: ${a.packaging.charAt(0).toLowerCase() + a.packaging.slice(1)}.`;
      return { stats, out };
    },
  });
})();
