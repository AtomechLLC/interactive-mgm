/* Roll a manor: draws plans from shared/manorgen.js and shows the verdict of every rule check beside them.
   "New plan" keeps redrawing until a draft passes all the checks and says how many drafts it threw away.
   The "break one rule" buttons make the generator ignore a single rule, so you can see the plan it gives
   and which check catches it. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, G = MANORGEN;
  const W = 1040, H = 585, INK = '#1c2450', LV = ['#f9f5ea', '#f5eedc', '#efe3c6', '#e9d9b4'];
  const STYLE = { heavy: [9, INK], std: [5.5, INK], thin: [2, INK], piers: [6, INK, [9, 9]], edge: [1.6, 'rgba(28,36,80,.38)'] };

  function draw(g, P) {
    const S = Math.min((W - 60) / P.w, (H - 84) / P.h), ox = (W - P.w * S) / 2, oy = 52 + (H - 84 - P.h * S) / 2, k = S / 38;
    const X = p => [p[0] * S + ox, p[1] * S + oy];
    const path = pts => { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(...X(p)) : g.moveTo(...X(p))); };
    const soft = pts => { g.beginPath(); const n = pts.length, P0 = X(pts[n - 1]), P1 = X(pts[0]); g.moveTo((P0[0] + P1[0]) / 2, (P0[1] + P1[1]) / 2); pts.forEach((p, i) => g.arcTo(...X(p), ...X(pts[(i + 1) % n]), 22 * k)); };
    P.floors.forEach(f => { g.fillStyle = f.tint || LV[f.lv]; if (f.yard) soft(f.pts); else path(f.pts); g.closePath(); g.fill(); });
    g.strokeStyle = 'rgba(28,36,80,.4)'; g.lineWidth = 1.6; g.setLineDash([]);
    P.stairs.forEach(s => s.treads.forEach(t => { path(t); g.stroke(); }));
    ['edge', 'thin', 'piers', 'std', 'heavy'].forEach(type => {
      const [w, col, dash] = STYLE[type]; g.lineWidth = Math.max(1.2, w * k); g.strokeStyle = col; g.setLineDash(dash ? dash.map(d => d * k) : []); g.lineCap = 'butt'; g.lineJoin = 'miter';
      P.walls.filter(w => w.type === type).forEach(w => { path(w.pts); g.stroke(); });
    });
    g.setLineDash([]); g.font = `500 ${Math.max(10, 12 * k)}px Jost, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    P.labels.forEach(l => { g.fillStyle = l.col || C.muted; g.fillText(l.t, ...X(l.p)); });
    // scale bar
    g.strokeStyle = C.muted; g.lineWidth = 1.5; g.beginPath(); g.moveTo(W - 30 - 5 * S, 30); g.lineTo(W - 30, 30); g.moveTo(W - 30 - 5 * S, 25); g.lineTo(W - 30 - 5 * S, 35); g.moveTo(W - 30, 25); g.lineTo(W - 30, 35); g.stroke();
    g.fillStyle = C.muted; g.font = '500 12px Jost, sans-serif'; g.fillText('5 m', W - 30 - 2.5 * S, 43);
  }

  canvasDemo('gen', (s, cv, g) => {
    let seed = 1, brk = null, cur = null, img = null, prevImg = null, t = 9; const hist = [];
    const pick = $(s, '.gn-break');
    pick.innerHTML = `<button class="btn on" data-b="">Follow every rule</button>` + Object.entries(G.BREAKS).map(([k, v]) => `<button class="btn" data-b="${k}">${v}</button>`).join('');
    const snap = P => { const c = document.createElement('canvas'); c.width = W; c.height = H; draw(c.getContext('2d'), P); return c; };
    const show = () => {
      cur = G.generatePassing(seed, { breakRule: brk }); prevImg = img; img = snap(cur.plan); t = 0;
      const fails = cur.checks.filter(c => !c.pass).length;
      say($(s, '.gn-checks'), cur.checks.map(c => `<li class="${c.pass ? 'g' : 'r'}"><b>${c.pass ? '✓' : '✗'}</b><span>${c.label}<i>${c.detail}</i></span></li>`).join(''));
      const p = cur.plan.params, rej = cur.rejected.length;
      say($(s, '.gn-out'), brk
        ? `<b class="accent">Plan ${seed}, with one rule ignored.</b> ${fails} check${fails === 1 ? '' : 's'} caught it.`
        : `<b class="accent">Plan ${seed}.</b> Wings turned ${p.alpha.toFixed(0)}° and ${p.beta.toFixed(0)}°, tower ${(p.r * 2).toFixed(1)} m across. ${rej ? `${rej} draft${rej > 1 ? 's' : ''} thrown away first: ${cur.rejected[0][0].toLowerCase()}.` : 'The first draft passed every check.'}`);
    };
    $$(pick, '.btn').forEach(b => b.onclick = () => { brk = b.dataset.b || null; $$(pick, '.btn').forEach(x => x.classList.toggle('on', x === b)); show(); });
    $(s, '.gn-new').onclick = () => { hist.push(seed); seed = seed % 9999 + 1 + Math.floor(Math.random() * 40); show(); };
    $(s, '.gn-prev').onclick = () => { if (hist.length) { seed = hist.pop(); show(); } };
    show();
    window.__genSet = (sd, b) => { seed = sd; brk = b || null; $$(pick, '.btn').forEach(x => x.classList.toggle('on', (x.dataset.b || null) === brk)); show(); t = 9; return cur.checks; };

    return dt => {
      t += dt; T.use(g); g.clearRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,252,244,.85)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill();
      const k = Math.min(1, t / .5);
      if (prevImg && k < 1) { g.globalAlpha = 1 - k; g.drawImage(prevImg, 0, 0); }
      g.globalAlpha = k; g.drawImage(img, 0, 0); g.globalAlpha = 1;
      g.font = '800 15px Montserrat, Jost, sans-serif'; g.fillStyle = C.ink; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillText(`Plan ${seed}${brk ? ' · ' + G.BREAKS[brk].toLowerCase() : ''}`, 20, 32);
    };
  });
})();
