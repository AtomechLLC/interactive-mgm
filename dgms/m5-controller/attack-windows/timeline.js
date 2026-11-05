/* Attack timeline model: window rows over a frame ruler, with draggable edges.
   Standalone (no dependencies), so another page (a cancel playground, say) can copy this file as it is.
   Frame strip drawing style follows pvp/core-actions (one tick per frame, coloured phases, white playhead).

   API
   ---
   const tl = TL.create({
     x, y, w,            // where the window area sits on the canvas (logical canvas pixels), labels go left of x
     labelW = 150,       // width of the row-label column, drawn from x - labelW to x
     rowH = 30,          // height of each row
     frames,             // length of the attack in frames (the ruler runs 0..frames)
     rows: [             // one row per window type
       { id, label, col, a, b,         // the window covers frames [a, b)
         on = true,                    // a row can be off (drawn empty); clicking its label toggles it
         tail, tailMax, tailLabel,     // optional second segment after a (e.g. hitstun: frames a .. a + tail)
         locked }                      // locked rows can't be dragged
     ],
   });
   tl.row(id)                 the row object (edit a, b, on, tail directly, then redraw)
   tl.inWin(id, f)            true while frame f is inside an enabled row's window
   tl.fx(f) / tl.xf(x)        frame to canvas x, and back (fractional)
   tl.setFrames(n)            change the attack length (clamps every row)
   tl.draw(g, { frame, cut, cutLabel, theme })   ruler, rows and playhead; cut greys out frames >= cut
   tl.drawRuler(g, y)         just the frame ruler at height y
   tl.hit(x, y)               what's under a point: { row, part: 'a' | 'b' | 'body' | 'tail' | 'label' } or null
   tl.attach(canvas, { onChange(row, part), onToggle(row), onGrab() })   pointer dragging; onGrab runs on every press,
                              before the hit test; returns a detach function
   tl.dragTo(row, part, frame)   what a drag does (used by attach, and by scripted walk-throughs)
   tl.cursor = { x, y, down } | null    a fake pointer drawn by draw(), for walk-through recordings
   tl.disabled = true                   ignore pointer input (e.g. while another view is drawn)

   TL.strip(g, x, y, w, frames, segs, { h, ticks, theme })   a frame strip: segs = [{ a, b, col, label, txt }]
   TL.ruler(g, x, y, w, frames, { every, theme })            a frame ruler on its own
   TL.hand(g, x, y, down)                                    the walk-through pointer
   TL.THEME                                                  colours (light parchment theme), override per call */
(function () {
  const THEME = { ink: '#262c6a', muted: '#5d618c', line: '#cdbf9f', track: 'rgba(38,44,106,.07)', panel: '#fffaf0', head: '#152044', off: 'rgba(93,97,140,.35)', font: 'Jost, sans-serif' };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function text(g, s, x, y, { col = THEME.ink, size = 14, weight = 600, align = 'left', font = THEME.font } = {}) {
    g.font = `${weight} ${size}px ${font}`; g.fillStyle = col; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(s, x, y);
  }

  function ruler(g, x, y, w, frames, { every = 5, theme = THEME, h = 18 } = {}) {
    const pf = w / frames;
    g.fillStyle = theme.track; g.fillRect(x, y, w, h);
    for (let i = 0; i <= frames; i++) {
      const big = i % every === 0, X = x + i * pf;
      g.fillStyle = big ? theme.ink : theme.muted; g.globalAlpha = big ? .8 : .45;
      g.fillRect(X - .75, y + (big ? 0 : h * .45), 1.5, big ? h : h * .55);
      g.globalAlpha = 1;
      if (big && i < frames && pf * every > 22) text(g, String(i), X + 3, y + 6, { col: theme.muted, size: 11, weight: 600 });
    }
  }

  // a frame strip: one cell per frame, coloured by segment, like the core-actions timing chart
  function strip(g, x, y, w, frames, segs, { h = 26, ticks = true, theme = THEME, labels = true } = {}) {
    const pf = w / frames;
    g.fillStyle = theme.track; g.fillRect(x, y, w, h);
    segs.forEach(s => {
      if (s.b <= s.a) return;
      g.fillStyle = s.col; g.globalAlpha = s.alpha ?? 1; g.fillRect(x + s.a * pf, y, (s.b - s.a) * pf, h); g.globalAlpha = 1;
      if (s.hatch) hatch(g, x + s.a * pf, y, (s.b - s.a) * pf, h, s.hatch);
      if (labels && s.label && (s.b - s.a) * pf > g.measureText(s.label).width * .8 + 10)
        text(g, s.label, x + (s.a + s.b) / 2 * pf, y + h / 2, { col: s.txt || '#fff', size: 13, align: 'center' });
    });
    if (ticks && pf > 5) { g.fillStyle = 'rgba(255,255,255,.55)'; for (let i = 1; i < frames; i++) g.fillRect(x + i * pf - .5, y, 1, h); }
    g.strokeStyle = theme.line; g.lineWidth = 1.5; g.strokeRect(x, y, w, h);
  }
  function hatch(g, x, y, w, h, col) {
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    g.strokeStyle = col; g.lineWidth = 2;
    for (let i = -h; i < w; i += 8) { g.beginPath(); g.moveTo(x + i, y + h); g.lineTo(x + i + h, y); g.stroke(); }
    g.restore();
  }
  // the walk-through pointer: a white arrow with a dark edge
  function hand(g, x, y, down = false) {
    g.save(); g.translate(x, y); if (down) g.scale(.9, .9);
    g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 22); g.lineTo(6, 17); g.lineTo(10, 26); g.lineTo(14, 24); g.lineTo(10, 15); g.lineTo(17, 15); g.closePath();
    g.fillStyle = '#fff'; g.fill(); g.strokeStyle = '#152044'; g.lineWidth = 2; g.stroke();
    if (down) { g.strokeStyle = 'rgba(255,185,81,.9)'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 13, 0, Math.PI * 2); g.stroke(); }
    g.restore();
  }

  function create(o) {
    const tl = { x: o.x, y: o.y, w: o.w, labelW: o.labelW ?? 150, rowH: o.rowH ?? 30, frames: o.frames, rows: o.rows.map(r => ({ on: true, ...r })), cursor: null, hover: null };
    const pf = () => tl.w / tl.frames;
    tl.fx = f => tl.x + f * pf();
    tl.xf = x => (x - tl.x) / pf();
    tl.row = id => tl.rows.find(r => r.id === id);
    tl.rowY = i => tl.y + i * tl.rowH;
    tl.height = () => tl.rows.length * tl.rowH;
    tl.inWin = (id, f) => { const r = typeof id === 'string' ? tl.row(id) : id; return !!r && r.on && f >= r.a && f < r.b; };
    tl.setFrames = n => { tl.frames = n; tl.rows.forEach(r => { r.b = clamp(r.b, 1, n); r.a = clamp(r.a, 0, r.b - 1); }); };

    tl.hit = (x, y) => {
      const i = Math.floor((y - tl.y) / tl.rowH);
      if (i < 0 || i >= tl.rows.length) return null;
      const r = tl.rows[i];
      if (x < tl.x - 4 && x > tl.x - tl.labelW) return { row: r, part: 'label' };
      if (!r.on || r.locked) return null;
      const xa = tl.fx(r.a), xb = tl.fx(r.b), grip = 9;
      if (r.tail != null) { const xt = tl.fx(r.a + r.tail); if (Math.abs(x - xt) < grip && Math.abs(x - xb) >= 4) return { row: r, part: 'tail' }; }
      if (Math.abs(x - xa) < grip) return { row: r, part: 'a' };
      if (Math.abs(x - xb) < grip) return { row: r, part: 'b' };
      if (x > xa && x < xb) return { row: r, part: 'body' };
      return null;
    };
    // move one part of a row to a frame; body drags pass the frame of the grab point minus the grab offset
    tl.dragTo = (r, part, f, off = 0) => {
      f = Math.round(f);
      if (part === 'a') r.a = clamp(f, 0, r.b - 1);
      else if (part === 'b') r.b = clamp(f, r.a + 1, tl.frames);
      else if (part === 'tail') r.tail = clamp(f - r.a, 1, r.tailMax ?? tl.frames);
      else if (part === 'body') { const len = r.b - r.a, a = clamp(Math.round(f - off), 0, tl.frames - len); r.a = a; r.b = a + len; }
    };

    tl.drawRuler = (g, y, theme = THEME) => ruler(g, tl.x, y, tl.w, tl.frames, { theme });

    tl.draw = (g, { frame = null, cut = null, cutLabel = '', theme = THEME, rulerY = tl.y - 22 } = {}) => {
      const P = pf();
      if (rulerY != null) tl.drawRuler(g, rulerY, theme);
      tl.rows.forEach((r, i) => {
        const y = tl.rowY(i), h = tl.rowH - 6, my = y + tl.rowH / 2 - 3;
        g.fillStyle = i % 2 ? 'rgba(38,44,106,.035)' : 'rgba(38,44,106,.07)'; g.fillRect(tl.x, y, tl.w, tl.rowH - 2);
        // label column: a coloured dot that reads as an on/off switch
        g.fillStyle = r.on ? r.col : 'transparent'; g.strokeStyle = r.on ? r.col : theme.off; g.lineWidth = 2;
        g.beginPath(); g.arc(tl.x - tl.labelW + 9, my + 1, 6, 0, Math.PI * 2); g.fill(); g.stroke();
        text(g, r.label, tl.x - tl.labelW + 22, my + 1, { col: r.on ? theme.ink : theme.off, size: 14 });
        if (!r.on) { text(g, 'off', tl.x + 8, my + 1, { col: theme.off, size: 13, weight: 500 }); return; }
        const xa = tl.fx(r.a), xb = tl.fx(r.b), hov = tl.hover && tl.hover.row === r;
        g.fillStyle = r.col; g.globalAlpha = .88; g.beginPath(); g.roundRect(xa, y + 2, xb - xa, h, 5); g.fill(); g.globalAlpha = 1;
        if (r.tail != null) {   // e.g. hitstun, drawn hatched from the window's first frame
          const xt = tl.fx(Math.min(tl.frames, r.a + r.tail));
          g.fillStyle = r.tailCol || r.col; g.globalAlpha = .28; g.fillRect(xa, y + 2 + h * .55, xt - xa, h * .45); g.globalAlpha = 1;
          hatch(g, xa, y + 2 + h * .55, xt - xa, h * .45, r.tailCol || r.col);
          g.fillStyle = r.tailCol || r.col; g.fillRect(xt - 2, y + 2, 4, h);
          if (r.tailLabel) { g.font = `600 12px ${theme.font}`; if (xt + 8 + g.measureText(r.tailLabel).width < tl.x + tl.w) text(g, r.tailLabel, xt + 8, my + 1, { col: r.tailCol || r.col, size: 12 }); }
        }
        // edge grips
        [xa, xb].forEach((ex, k) => {
          const hot = hov && tl.hover.part === (k ? 'b' : 'a');
          g.fillStyle = hot ? '#fff' : 'rgba(255,255,255,.85)'; g.strokeStyle = theme.head; g.lineWidth = hot ? 2 : 1;
          g.beginPath(); g.roundRect(ex - 3.5, y + 5, 7, h - 6, 2); g.fill(); g.stroke();
        });
        if (xb - xa > 60) text(g, `${r.a}-${r.b}`, (xa + xb) / 2, my + (r.tail != null ? -4 : 1), { col: '#fff', size: 12, align: 'center' });
      });
      if (cut != null && cut < tl.frames) {
        const xc = tl.fx(cut), y0 = (rulerY ?? tl.y), y1 = tl.y + tl.height();
        g.fillStyle = 'rgba(237,231,220,.78)'; g.fillRect(xc, y0, tl.x + tl.w - xc, y1 - y0);
        g.strokeStyle = '#a8201c'; g.lineWidth = 2; g.setLineDash([6, 4]); g.beginPath(); g.moveTo(xc, y0); g.lineTo(xc, y1); g.stroke(); g.setLineDash([]);
        if (cutLabel) text(g, cutLabel, Math.min(xc + 8, tl.x + tl.w - 8), y0 + 9, { col: '#a8201c', size: 13, align: xc + 8 > tl.x + tl.w - 200 ? 'right' : 'left' });
      }
      if (frame != null) {
        const px = tl.fx(clamp(frame, 0, tl.frames)), y0 = (rulerY ?? tl.y) - 4, y1 = tl.y + tl.height();
        g.fillStyle = theme.head; g.fillRect(px - 1.5, y0, 3, y1 - y0);
        g.beginPath(); g.moveTo(px - 7, y0 - 8); g.lineTo(px + 7, y0 - 8); g.lineTo(px, y0); g.fill();
      }
      if (tl.cursor) hand(g, tl.cursor.x, tl.cursor.y, tl.cursor.down);
    };

    tl.attach = (c, { onChange, onToggle, onGrab } = {}) => {
      let drag = null;
      const pos = e => { const b = c.getBoundingClientRect(); return { x: (e.clientX - b.left) * c.width / b.width, y: (e.clientY - b.top) * c.height / b.height }; };
      const down = e => {
        if (tl.disabled) return;
        onGrab?.();   // called first, so a page can swap tl.rows before the hit test
        const p = pos(e), h = tl.hit(p.x, p.y); if (!h) return;
        if (h.part === 'label') { h.row.on = !h.row.on; onToggle?.(h.row); return; }
        drag = { ...h, off: tl.xf(p.x) - h.row.a };
        c.setPointerCapture?.(e.pointerId); e.preventDefault();
      };
      const move = e => {
        const p = pos(e);
        if (tl.disabled) { c.style.cursor = ''; return; }
        if (drag) { tl.dragTo(drag.row, drag.part, tl.xf(p.x), drag.off); onChange?.(drag.row, drag.part); return; }
        tl.hover = tl.hit(p.x, p.y);
        c.style.cursor = !tl.hover ? '' : tl.hover.part === 'label' ? 'pointer' : tl.hover.part === 'body' ? 'grab' : 'ew-resize';
      };
      const up = () => { drag = null; };
      c.addEventListener('pointerdown', down); c.addEventListener('pointermove', move); c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
      return () => { c.removeEventListener('pointerdown', down); c.removeEventListener('pointermove', move); c.removeEventListener('pointerup', up); c.removeEventListener('pointercancel', up); };
    };
    return tl;
  }

  window.TL = { create, strip, ruler, hand, hatch, text, THEME };
})();
