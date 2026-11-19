/* Same blockout, new skin (The Level Design Book: Environment art, "What is environment art?")
   One street drawn twice: as the tested blockout and after the art pass. Drag the divider across it.
   The book's definition is that environment art decorates a level "while preserving its core functionality and gameplay",
   so the shapes that matter to play (two doorways, a low and a high piece of cover) sit in the same place on both sides.
   The third control lets the art pass change two of them, which is the failure the definition warns about. */
(function () {
  const { $, canvasDemo, say } = FPF.kit, E = EA, W = E.W, H = E.H, GY = E.GY;
  canvasDemo('pass', (s, cv, g) => {
    const st = { x: 520, outline: true, drift: false }; let shapes, drag = false;
    const art = E.canvas(W, H), blk = E.canvas(W, H), ag = art.getContext('2d'), bg = blk.getContext('2d');
    function scene() {
      ag.clearRect(0, 0, W, H); shapes = E.street(ag, { d: 3, drift: st.drift, red: false });
      bg.clearRect(0, 0, W, H); E.street(bg, { d: 0 });
      const ch = shapes.art.filter(a => a.changed).length;
      say($(s, '.ps-stats'),
        `<div class="${ch ? 'r' : 'g'}"><b>${ch} of 4</b><span>play shapes the art pass changed</span></div>` +
        `<div><b>1</b><span>door the art added, boarded so it reads as shut</span></div>` +
        `<div class="${ch ? 'r' : 'g'}"><b>${ch ? 'Retest' : 'Still valid'}</b><span>${ch ? 'the playtests no longer describe this street' : 'every playtest of the blockout'}</span></div>`);
      say($(s, '.ps-out'), ch
        ? '<b class="accent">Prettier, and a different level.</b> The arch narrowed the doorway and a planter replaced the crate. The planter is knee height, so the cover in the middle of the street is gone. Changes like these go back to the level designer first.'
        : '<b class="accent">Decoration on top of the design.</b> Drag the divider. Walls gain plaster, windows and roofs; the doorways and both pieces of cover stay exactly where the tests left them. The boarded door is new: the blockout had plain wall there, so the art has to say “closed”.');
    }
    const dash = (r, col, lbl) => { g.save(); g.setLineDash([9, 6]); g.lineWidth = 3; g.strokeStyle = '#fff'; g.strokeRect(r.x - 4, r.y - 4, r.w + 8, r.h + 4); g.strokeStyle = col; g.lineDashOffset = 7.5; g.strokeRect(r.x - 4, r.y - 4, r.w + 8, r.h + 4); g.restore(); if (lbl) E.label(g, lbl, r.x + r.w / 2, r.y - 20, { size: 13, col }); };
    const move = e => { st.x = E.clamp(FPF.ptr(cv, e).x, 30, W - 30); };
    cv.style.cursor = 'ew-resize'; cv.style.touchAction = 'none';
    cv.onpointerdown = e => { drag = true; cv.setPointerCapture(e.pointerId); move(e); };
    cv.onpointermove = e => { if (drag) move(e); };
    cv.onpointerup = cv.onpointercancel = () => { drag = false; };
    $(s, '.ps-outline').onchange = e => { st.outline = e.target.checked; };
    $(s, '.ps-drift').onchange = e => { st.drift = e.target.checked; scene(); };
    scene();
    window.__passSet = o => { Object.assign(st, o); $(s, '.ps-outline').checked = st.outline; $(s, '.ps-drift').checked = st.drift; scene(); };
    return () => {
      g.clearRect(0, 0, W, H); g.save(); g.beginPath(); g.roundRect(0, 0, W, H, 14); g.clip();
      g.drawImage(blk, 0, 0);
      g.save(); g.beginPath(); g.rect(0, 0, st.x, H); g.clip(); g.drawImage(art, 0, 0); g.restore();
      if (st.outline) shapes.block.forEach((b, i) => {
        const a = shapes.art[i], onArt = b.x + b.w / 2 < st.x;
        if (onArt && a.changed) { dash(b, '#8a93b8'); dash(a, '#c9271f', a.name + ', changed'); } else dash(b, '#b06a00', b.name);
      });
      // the player aims right at the enemy; the enemy aims left at the player
      E.figure(g, 250, GY + 104, { pose: 'aim', face: 1, col: [205, 72, 50], s: 1.12 });
      E.figure(g, 842, GY + 92, { pose: 'aim', face: -1, col: [278, 34, 40], s: 1.08 });
      g.fillStyle = '#fff'; g.fillRect(st.x - 2.5, 0, 5, H); g.fillStyle = E.INK; g.fillRect(st.x - 1, 0, 2, H);
      g.fillStyle = '#fff'; g.strokeStyle = E.INK; g.lineWidth = 2.5; g.beginPath(); g.arc(st.x, H - 46, 19, 0, 7); g.fill(); g.stroke();
      g.fillStyle = E.INK; g.beginPath(); g.moveTo(st.x - 12, H - 46); g.lineTo(st.x - 4, H - 53); g.lineTo(st.x - 4, H - 39); g.moveTo(st.x + 12, H - 46); g.lineTo(st.x + 4, H - 53); g.lineTo(st.x + 4, H - 39); g.fill();
      if (st.x > 130) E.label(g, 'after the art pass', Math.min(86, st.x - 80) + 0, 24, { size: 14 });
      if (st.x < W - 110) E.label(g, 'blockout', Math.max(W - 56, st.x + 56), 24, { size: 14 });
      g.restore();
    };
  });
})();
