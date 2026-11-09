/* XP curves (genre breakdown: "RPG Game Design").
   XP needed for the next level as a linear, polynomial or exponential curve, against XP income that also grows with
   level (stronger enemies, bigger quests): income = 600 × level XP per hour. Hours per level = XP needed / income.
   Content needed is hours × 4 quests an hour. Every number here is illustrative; the shapes are the point. */
(function () {
  const C = TD.C, { clamp } = TD;
  const CAP = 50, INCOME = L => 600 * L, QPH = 4;
  const KIND = {
    linear: { f: (L, k) => 300 * L, label: () => 'XP = 300 × L', k: null },
    poly: { f: (L, k) => 300 * Math.pow(L, k), label: k => `XP = 300 × L^${k.toFixed(1)}`, k: [1.2, 3, .1, 2] },
    exp: { f: (L, k) => 300 * L * Math.pow(k, L - 1), label: k => `XP = 300 × L × ${k.toFixed(2)}^(L-1)`, k: [1.02, 1.15, .01, 1.07] },
  };
  GK.scene('xp', (s, g, ui) => {
    const btns = [...s.querySelectorAll('.rx-kind .btn')], kEl = s.querySelector('.rx-k'), kv = s.querySelector('.rx-kv');
    let kind = 'poly'; btns.forEach(b => b.onclick = () => { kind = b.dataset.k; const r = KIND[kind].k; if (r) { kEl.min = r[0]; kEl.max = r[1]; kEl.step = r[2]; kEl.value = r[3]; } });
    ui.watch(btns, kEl);
    const ACTS = [{ to: 5, kind: 'linear' }, { to: 10, kind: 'poly', k: 2 }, { to: 15, kind: 'poly', k: 2.6 }, { to: 20, kind: 'exp', k: 1.07 }, { to: 25, kind: 'exp', k: 1.12 }];
    return {
      dur: 25,
      frame(t, tour) {
        if (tour) { const [a] = GK.act(ACTS, t); if (a.kind !== kind) { kind = a.kind; const r = KIND[kind].k; if (r) { kEl.min = r[0]; kEl.max = r[1]; kEl.step = r[2]; } } if (a.k) kEl.value = a.k; }
        const K = KIND[kind], k = +kEl.value; kEl.disabled = !K.k; kv.textContent = K.k ? (kind === 'exp' ? k.toFixed(2) : k.toFixed(1)) : '—';
        btns.forEach(b => b.classList.toggle('on', b.dataset.k === kind));
        const hrs = []; for (let L = 1; L < CAP; L++) hrs.push(K.f(L, k) / INCOME(L));
        const cum = []; hrs.reduce((a, h, i) => (cum[i] = a + h), 0);
        const total = cum[cum.length - 1];
        GK.panel(g);
        const ax = 70, ay = 56, aw = 600, ah = 380, maxH = Math.max(1, ...hrs) * 1.1;
        GK.head(g, 'Hours to reach the next level', ax, 30); GK.text(g, K.label(k) + '   ·   income = 600 × L XP per hour', ax, 46, C.muted, 12);
        const A = GK.axes(g, ax, ay, aw, ah, { x0: 0, x1: CAP, y0: 0, y1: maxH, xt: [1, 10, 20, 30, 40, 49], yt: [0, maxH / 2, maxH].map(v => +v.toPrecision(2)), fmtY: v => v < 10 ? v.toFixed(1) : Math.round(v), xl: 'level' });
        hrs.forEach((h, i) => { const x = A.sx(i + .6), y = A.sy(h); g.fillStyle = C.player; g.fillRect(x, y, aw / CAP - 2, ay + ah - y); });
        // milestones: where the campaign's hours go
        const half = cum.findIndex(c => c >= total / 2) + 2;
        g.strokeStyle = C.goldInk; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(A.sx(half), ay); g.lineTo(A.sx(half), ay + ah); g.stroke(); g.setLineDash([]);
        GK.text(g, `half of all hours are spent past level ${half}`, A.sx(half) + (half > 35 ? -6 : 6), ay + 18, C.goldInk, 12, half > 35 ? 'right' : 'left', 700);
        // right: totals and content
        const rx = 710;
        GK.head(g, 'The whole climb to level 50', rx, 30);
        GK.big(g, `${total < 100 ? total.toFixed(1) : Math.round(total)} h`, 'of play to the cap', rx, 76);
        GK.big(g, `${Math.round(total * QPH)}`, 'quests to fill it (4 an hour)', rx + 160, 76);
        const rows = [[1, 10], [11, 20], [21, 30], [31, 40], [41, 49]];
        GK.head(g, 'Content needed per 10 levels', rx, 140, 'left', C.ink, 14);
        const maxR = Math.max(...rows.map(([a, b]) => cum[b - 1] - (a > 1 ? cum[a - 2] : 0)));
        rows.forEach(([a, b], i) => {
          const h = cum[b - 1] - (a > 1 ? cum[a - 2] : 0), y = 156 + i * 52, w = h / maxR * 140;
          GK.text(g, `levels ${a}-${b === 49 ? 50 : b}`, rx, y + 20, C.ink, 13, 'left', 600);
          g.fillStyle = C.p2; g.fillRect(rx + 90, y + 6, Math.max(3, w), 20);
          GK.text(g, `${h < 10 ? h.toFixed(1) : Math.round(h)} h · ${Math.round(h * QPH)} quests`, rx + 96 + Math.max(3, w), y + 21, C.muted, 12);
        });
        GK.wrap(g, kind === 'linear' ? 'Linear XP against growing income: every level takes the same short time, and the late game is over quickly.'
          : kind === 'poly' ? 'Polynomial XP: each level takes a little longer than the last, so the content plan grows steadily toward the cap.'
          : 'Exponential XP: the last few levels swallow most of the hours, and someone has to build the content to fill them.', rx, 440, 300, 19, C.ink, 14);
        ui.stats(`<div><b>${total < 100 ? total.toFixed(1) : Math.round(total)} h</b><span>to level 50</span></div><div class="${half > 40 ? 'r' : 'g'}"><b>L${half}</b><span>where half the hours have been played</span></div>`);
        ui.out('The XP table is a content budget: every hour it asks the player to spend needs something to do in it.');
      },
    };
  });
})();
