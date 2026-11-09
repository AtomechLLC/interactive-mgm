/* Branching structure (genre breakdown: "How to Make a Visual Novel?").
   The same five decisions written two ways. A full branching tree gives every choice its own future: 63 scenes and 32
   endings. Branch and bottleneck lets each choice play out in its own scene, merges back to a shared scene, and
   records the choice as a flag; the ending reads the flags: 19 scenes and 3 endings. Click a choice to walk a path. */
(function () {
  const C = TD.C, { clamp, lerp } = TD;
  const D = [['Help the stranger', 'Walk past'], ['Tell the truth', 'Keep the secret'], ['Share your food', 'Keep it'], ['Defend your rival', 'Stay quiet'], ['Stay for the festival', 'Leave at dawn']];
  const endOf = path => { const kind = path.filter(c => c === 0).length; return kind >= 4 ? 0 : kind >= 2 ? 1 : 2; };
  const ENDS = ['Ending 1: the town takes you in', 'Ending 2: a friend, not a home', 'Ending 3: you move on alone'];
  GK.scene('vn', (s, g, ui) => {
    let path = [];
    const btns = [...s.querySelectorAll('.vn-c .btn')], reset = s.querySelector('.vn-reset');
    btns.forEach(b => b.onclick = () => { if (path.length < 5) path.push(+b.dataset.c); });
    reset.onclick = () => { path = []; };
    ui.watch(btns, reset);
    const TOUR = [[0, 0, 1, 0, 0], [1, 1, 0, 1, 1]];
    return {
      dur: 24,
      frame(t, tour) {
        if (tour) { const run = Math.floor(t / 12) % 2, k = Math.floor((t % 12) / 1.8); path = TOUR[run].slice(0, clamp(k, 0, 5)); }
        const step = path.length;
        btns.forEach((b, i) => { b.disabled = step >= 5; b.textContent = step < 5 ? D[step][i] : '—'; });
        GK.panel(g);
        // full tree
        const tx = 20, tw = 470, ty = 60, th = 440;
        GK.head(g, 'Full branching tree', tx, 30);
        const pos = (d, i) => [tx + 20 + d * (tw - 50) / 5, ty + (i + .5) * th / Math.pow(2, d)];
        for (let d = 0; d < 5; d++) for (let i = 0; i < Math.pow(2, d); i++) [0, 1].forEach(c => {
          const [x1, y1] = pos(d, i), [x2, y2] = pos(d + 1, i * 2 + c);
          let on = d < step; if (on) { let idx = 0; for (let k = 0; k < d; k++) idx = idx * 2 + path[k]; on = idx === i && path[d] === c; }
          g.strokeStyle = on ? C.gold : 'rgba(93,97,140,.35)'; g.lineWidth = on ? 4 : 1; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
        });
        for (let d = 0; d <= 5; d++) for (let i = 0; i < Math.pow(2, d); i++) { const [x, y] = pos(d, i); g.fillStyle = d === 5 ? C.purple : C.navy; g.beginPath(); g.arc(x, y, d === 5 ? 3.5 : 4.5, 0, 6.283); g.fill(); }
        let leaf = 0; path.forEach(c => leaf = leaf * 2 + c);
        if (step === 5) { const [x, y] = pos(5, leaf); TD.label(`ending ${leaf + 1} of 32`, x - 10, y, 'right', C.purple, 12); }
        GK.big(g, '63 scenes', '32 endings, each seen by 1 path in 32', tx, ty + th + 34);
        // bottleneck
        const bx = 530, bw = 490;
        GK.head(g, 'Branch and bottleneck, with flags', bx, 30);
        const cy = (i) => ty + 14 + i * 76;
        for (let d = 0; d < 5; d++) [0, 1].forEach(c => { const x = bx + 230 + c * 170; g.strokeStyle = 'rgba(93,97,140,.3)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, cy(d) + 32); g.lineTo(bx + 60, cy(d + 1)); g.stroke(); });
        for (let d = 0; d < 5; d++) {
          const y = cy(d), done = d < step, cur = d === step;
          GK.box(g, bx, y, 120, 32, cur ? '#fff4d6' : '#fffaf0', cur ? C.gold : C.navy, 8, cur ? 3 : 1.5); GK.text(g, d === 0 ? 'opening' : 'shared scene', bx + 60, y + 21, C.ink, 12, 'center', 700);
          [1, 0].forEach(c => { const on = done && path[d] === c; g.strokeStyle = on ? C.gold : 'rgba(93,97,140,.35)'; g.lineWidth = on ? 3 : 1.5; g.beginPath(); g.moveTo(bx + 120, y + 16); if (c) { g.lineTo(bx + 135, y - 6); g.lineTo(bx + 400, y - 6); g.lineTo(bx + 405, y); } else g.lineTo(bx + 150, y + 16); g.stroke(); });
          [0, 1].forEach(c => {
            const on = done && path[d] === c, x = bx + 150 + c * 170;
            GK.box(g, x, y, 160, 32, on ? '#fff4d6' : '#fffaf0', on ? C.gold : '#cdbf9f', 8, on ? 3 : 1.5); GK.text(g, D[d][c], x + 80, y + 21, on ? C.goldInk : C.muted, 12, 'center', 700);
          });
        }
        const ey = cy(5);
        ENDS.forEach((e, i) => { const on = step === 5 && endOf(path) === i; GK.box(g, bx + i * 165, ey, 158, 40, on ? '#e9dcff' : '#fffaf0', on ? C.purple : '#cdbf9f', 8, on ? 3 : 1.5); GK.wrap(g, e, bx + i * 165 + 8, ey + 16, 144, 14, on ? C.purple : C.muted, 11, 700); });
        // flags
        const flags = path.map((c, i) => c === 0 ? '♥' : '·').join(' ');
        GK.text(g, `flags: ${flags || '(none yet)'}   kindness ${path.filter(c => c === 0).length} of 5`, bx, ey + 62, C.ink, 13, 'left', 700);
        GK.big(g, '19 scenes', '3 endings, chosen by the flags', bx + 300, ty + th + 34);
        ui.stats(`<div class="r"><b>63</b><span>scenes to write as a full tree</span></div><div class="g"><b>19</b><span>scenes as branch and bottleneck</span></div>`);
        ui.out(step < 5 ? `Decision ${step + 1} of 5: pick one below the chart.` : `Full tree: ending ${leaf + 1} of 32. Bottleneck: ${ENDS[endOf(path)].split(':')[0]}, read from your flags.`);
      },
    };
  });
})();
