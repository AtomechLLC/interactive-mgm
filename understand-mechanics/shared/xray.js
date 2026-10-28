/* Mechanics X-ray diagrams (MGM C4 M2, Universal Mechanics Description Framework, deck slides 20-33, 52-54, 100, 107).
   A diagram is a list of boxes plus a flow: timed signals that travel from box to box. Each box is drawn with the deck's own symbol
   for its part (slide 25: blue state squares, green signal triangles, yellow receivers, red transform arrows, blue context
   capsules, pink entity boxes with red name tabs, inside the lavender X-Ray panel). Everything is a pure function of t, so pages
   can seek for GIFs: XR.replay(nodes, flow, t) says what every box holds at t, XR.draw(g, nodes, flow, t) paints it.
   node: { id, x, y, w, h, part, title, value?, sub? }   (x, y = top-left, in canvas units)
   flow: { t, dur, from, to, kind: 'command' | 'effect' | 'system', label?, ctx?, set?: { id: value }, via?: [x, y], bounce? }
   A bounce hop stops short of its target and is refused (no receiver for that signal). A hop with no from just sets values. */
(function () {
  const TAU = Math.PI * 2;
  // the deck's own symbology (slide 25 and the X-ray slides 33, 54, 100, 107), in the Google Slides palette it was drawn with
  const PART = {
    state: { col: '#3d85c6', fill: '#cfe2f3', name: 'State' },            // light blue rounded square holding a value
    signal: { col: '#38761d', fill: '#93c47d', name: 'Signal' },          // green triangle
    receiver: { col: '#bf9000', fill: '#ffe599', name: 'Receiver' },      // yellow "pac-man" that takes the triangle
    transform: { col: '#cc0000', fill: '#cc0000', name: 'Transform' },    // red double arrow with a tick
    context: { col: '#3d85c6', fill: '#cfe2f3', name: 'Context' },        // light blue capsule of cells
    entity: { col: '#a64d79', fill: '#ead1dc', name: 'Entity' },          // pink box with a red name tab
    system: { col: '#a64d79', fill: '#ead1dc', name: 'System' },
  };
  const INK = '#20124d', LINE = '#741b47', XRAY = { fill: '#d9d2e9', edge: '#674ea7' }, TAB = { fill: '#ea9999', edge: '#cc0000', ink: '#990000' };
  const KIND = { command: { name: 'Command signal' }, effect: { name: 'Side-effect signal' }, system: { name: 'System signal' } };
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;

  // what every box holds at time t, and how long ago each box was last reached
  function replay(nodes, flow, t) {
    const val = {}, lit = {};
    nodes.forEach(n => { val[n.id] = n.value; });
    flow.forEach(f => {
      if (t >= f.t && f.from) lit[f.from] = Math.min(lit[f.from] ?? 1e9, t - f.t);
      const end = f.t + f.dur;
      if (t >= end && !f.bounce) { Object.assign(val, f.set || {}); if (f.to) lit[f.to] = t - end; }
    });
    return { val, lit };
  }

  const byId = (nodes, id) => nodes.find(n => n.id === id);
  // where a line from box a to box b leaves a and enters b
  // the glyph's own rectangle: containers fill their box, symbols sit centred under their label
  function bounds(n) {
    const cx = n.x + n.w / 2, cy = n.y + n.h / 2 + 8;
    if (n.part === 'entity' || n.part === 'system' || !n.part) return n;
    const [w, h] = n.part === 'state' ? [Math.min(n.w - 8, 96), 42] : n.part === 'transform' ? (n.vertical ? [26, Math.min(n.h - 20, 60)] : [Math.min(n.w - 10, 80), 26]) : n.part === 'context' ? [56, 24] : [40, 40];
    return { x: cx - w / 2, y: cy - h / 2, w, h };
  }
  function ends(a0, b0) {
    const a = bounds(a0), b = bounds(b0);
    const ca = [a.x + a.w / 2, a.y + a.h / 2], cb = [b.x + b.w / 2, b.y + b.h / 2];
    const edge = (n, c, o) => {
      const dx = o[0] - c[0], dy = o[1] - c[1];
      const k = Math.min(Math.abs((n.w / 2 + 4) / (dx || 1e-9)), Math.abs((n.h / 2 + 4) / (dy || 1e-9)));
      return [c[0] + dx * k, c[1] + dy * k];
    };
    return [edge(a, ca, cb), edge(b, cb, ca)];
  }
  // point along a straight or bent (via) path
  function along(p0, p1, via, k) {
    if (!via) return [lerp(p0[0], p1[0], k), lerp(p0[1], p1[1], k)];
    const u = 1 - k;
    return [u * u * p0[0] + 2 * u * k * via[0] + k * k * p1[0], u * u * p0[1] + 2 * u * k * via[1] + k * k * p1[1]];
  }
  function pathOf(nodes, f) {
    const a = byId(nodes, f.from), b = byId(nodes, f.to);
    if (!f.via) { const [p0, p1] = ends(a, b); return [p0, p1, null]; }
    const [p0] = ends(a, { x: f.via[0] - 1, y: f.via[1] - 1, w: 2, h: 2 }), [, p1] = ends({ x: f.via[0] - 1, y: f.via[1] - 1, w: 2, h: 2 }, b);
    return [p0, p1, f.via];
  }

  function pill(g, text, x, y, col, size = 13, fill = '#fffaf0') {
    g.font = `700 ${size}px Jost, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    const w = g.measureText(text).width + 14;
    g.fillStyle = fill; g.strokeStyle = col; g.lineWidth = 2;
    g.beginPath(); g.roundRect(x - w / 2, y - size * .85, w, size * 1.7, size * .85); g.fill(); g.stroke();
    g.fillStyle = col; g.fillText(text, x, y + 1);
    return w;
  }

  // the deck's glyphs, drawn centred at x, y
  function triangle(g, x, y, s = 18, ang = 0) {
    g.save(); g.translate(x, y); g.rotate(ang); g.fillStyle = PART.signal.fill; g.strokeStyle = PART.signal.col; g.lineWidth = 2.5; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(s, 0); g.lineTo(-s * .8, -s * .95); g.lineTo(-s * .8, s * .95); g.closePath(); g.fill(); g.stroke(); g.restore();
  }
  function pacman(g, x, y, r = 18) {
    g.fillStyle = PART.receiver.fill; g.strokeStyle = PART.receiver.col; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(x, y); g.arc(x, y, r, Math.PI + .75, Math.PI - .75); g.closePath(); g.fill(); g.stroke();
  }
  function transformArrow(g, x, y, w = 64) {
    g.save(); g.translate(x, y);
    g.strokeStyle = PART.transform.col; g.fillStyle = PART.transform.col; g.lineWidth = 3;
    g.beginPath(); g.moveTo(-w / 2 + 8, 0); g.lineTo(w / 2 - 8, 0); g.stroke();
    [-1, 1].forEach(sg => { g.beginPath(); g.moveTo(sg * w / 2, 0); g.lineTo(sg * (w / 2 - 11), -6); g.lineTo(sg * (w / 2 - 11), 6); g.closePath(); g.fill(); });
    g.beginPath(); g.moveTo(0, -11); g.lineTo(0, 11); g.stroke(); g.restore();
  }
  function capsule(g, x, y, w = 54, h = 22, cells = 3) {
    g.fillStyle = PART.context.fill; g.strokeStyle = PART.context.col; g.lineWidth = 2;
    g.beginPath(); g.roundRect(x - w / 2, y - h / 2, w, h, 6); g.fill(); g.stroke();
    for (let i = 1; i < cells; i++) { g.beginPath(); g.moveTo(x - w / 2 + w * i / cells, y - h / 2 + 3); g.lineTo(x - w / 2 + w * i / cells, y + h / 2 - 3); g.stroke(); }
  }
  function stateChip(g, x, y, text, w, h = 42) {
    const t = String(text);
    g.font = `700 ${t.length > 7 ? 14 : t.length > 4 ? 17 : 20}px Montserrat, Jost, sans-serif`;
    const ww = Math.max(w || 0, g.measureText(t).width + 22, 46);
    g.fillStyle = PART.state.fill; g.strokeStyle = PART.state.col; g.lineWidth = 2.5;
    g.beginPath(); g.roundRect(x - ww / 2, y - h / 2, ww, h, 8); g.fill(); g.stroke();
    g.fillStyle = INK; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, x, y + 1);
    return ww;
  }
  function label(g, text, x, y, size = 13, italic = true, col = INK) {
    g.font = `${italic ? 'italic ' : ''}600 ${size}px Montserrat, Jost, sans-serif`; g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle';
    String(text).split('\n').forEach((l, i, a) => g.fillText(l, x, y + (i - (a.length - 1) / 2) * size * 1.15));
  }

  function box(g, n, v, litAgo, dim) {
    const P = PART[n.part] || PART.entity, glow = litAgo == null ? 0 : clamp(1 - litAgo / .9);
    const cx = n.x + n.w / 2, cy = n.y + n.h / 2 + 8, hasVal = v != null && v !== '';
    g.save(); g.globalAlpha = dim ? .3 : 1;
    if (glow > 0) { g.shadowColor = n.part === 'transform' ? '#ff5050' : P.col; g.shadowBlur = 24 * glow; }
    if (n.part === 'entity' || n.part === 'system') {
      // pink component box with its red name tab across the top edge
      g.fillStyle = P.fill; g.strokeStyle = P.col; g.lineWidth = 2.5 + 2 * glow;
      g.beginPath(); g.roundRect(n.x, n.y + 8, n.w, n.h - 8, 12); g.fill(); g.stroke(); g.shadowBlur = 0;
      const name = String(n.title).replace(/\n/g, ' ');
      g.font = '600 13px Montserrat, Jost, sans-serif'; const tw = Math.min(n.w - 12, g.measureText(name).width + 18);
      g.fillStyle = TAB.fill; g.strokeStyle = TAB.edge; g.lineWidth = 1.5; g.beginPath(); g.roundRect(n.x + n.w - tw - 6, n.y, tw, 22, 4); g.fill(); g.stroke();
      g.fillStyle = TAB.ink; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(name, n.x + n.w - 6 - tw / 2, n.y + 12);
      if (n.tag) { g.font = '600 10px Jost, sans-serif'; g.fillStyle = P.col; g.textAlign = 'left'; g.fillText(n.tag, n.x + 8, n.y + 30); }
      const inner = n.y + 36, room = n.y + n.h - inner;
      if (hasVal) { const pop = 1 + .2 * glow; if (n.sub) label(g, n.sub, cx, inner + 2, 11); g.save(); g.translate(cx, inner + room / 2 + (n.sub ? 6 : 0)); g.scale(pop, pop); stateChip(g, 0, 0, v, 0, 34); g.restore(); }
      else if (n.art) { n.art(g, cx, inner + room / 2 - (n.sub ? 6 : 0)); if (n.sub) label(g, n.sub, cx, n.y + n.h - 12, 11); }
      else if (n.sub) label(g, n.sub, cx, inner + room / 2, 12);
    } else {
      const top = n.y + 10;
      if (n.part === 'state') { if (hasVal) { const pop = 1 + .2 * glow; g.save(); g.translate(cx, cy); g.scale(pop, pop); stateChip(g, 0, 0, v, Math.min(n.w - 8, 64)); g.restore(); } else { g.setLineDash([5, 4]); g.strokeStyle = PART.state.col; g.lineWidth = 2; g.beginPath(); g.roundRect(cx - 28, cy - 21, 56, 42, 8); g.stroke(); g.setLineDash([]); } }
      if (n.part === 'signal') triangle(g, cx, cy, 18);
      if (n.part === 'receiver') pacman(g, cx, cy, 19);
      if (n.part === 'transform') { if (n.vertical) { g.save(); g.translate(cx, cy); g.rotate(-Math.PI / 2); transformArrow(g, 0, 0, Math.min(n.h - 20, 60)); g.restore(); } else transformArrow(g, cx, cy, Math.min(n.w - 10, 80)); }
      if (n.part === 'context') capsule(g, cx, cy);
      g.shadowBlur = 0;
      label(g, n.title, cx, top, n.fs ? n.fs - 1 : 13, n.part !== 'state');
      const below = cy + (n.part === 'state' ? 32 : 30);
      if (n.part === 'transform' && hasVal) { g.font = '800 17px Montserrat, Jost, sans-serif'; g.fillStyle = PART.transform.col; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(v), cx, below); }
      else if (n.part === 'receiver' && hasVal) label(g, v, cx, below, 12, true, v === 'off' ? '#cc0000' : '#7f6000');
      else if (n.sub) label(g, n.sub, cx, below, 11, true, '#5d618c');
    }
    g.restore();
  }

  function arrowHead(g, x, y, ang, col, s = 9) {
    g.fillStyle = col; g.beginPath(); g.moveTo(x, y); g.lineTo(x - s * Math.cos(ang - .45), y - s * Math.sin(ang - .45)); g.lineTo(x - s * Math.cos(ang + .45), y - s * Math.sin(ang + .45)); g.closePath(); g.fill();
  }

  // a signal in flight: the deck's green triangle riding the arrow
  function packet(g, p0, p1, via, k) {
    const h = along(p0, p1, via, k), q = along(p0, p1, via, clamp(k + .02)), ang = Math.atan2(q[1] - h[1], q[0] - h[0]);
    g.save(); g.shadowColor = '#93c47d'; g.shadowBlur = 14; triangle(g, h[0], h[1], 13, ang); g.restore();
    return h;
  }

  // o.only: ids to show at full strength, o.focus: parts to show at full strength (others dimmed); o.hideEdges: skip unused lines
  function draw(g, nodes, flow, t, o = {}) {
    const { val, lit } = replay(nodes, flow, t);
    const seen = new Set(), dim = n => (o.only && !o.only.includes(n.id)) || (o.focus && !o.focus.includes(n.part));
    // containers first (pink component boxes), then the arrows, then the symbols on top
    nodes.filter(n => n.back).forEach(n => box(g, n, val[n.id], lit[n.id], dim(n)));
    // fixed arrows the diagram always shows (n.links), like the deck's before -> after state arrows
    nodes.forEach(n => (n.links || []).forEach(id => {
      const [p0, p1] = ends(n, byId(nodes, id));
      g.save(); g.globalAlpha = dim(n) ? .3 : .9; g.strokeStyle = LINE; g.lineWidth = 3; g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]); g.stroke();
      arrowHead(g, p1[0], p1[1], Math.atan2(p1[1] - p0[1], p1[0] - p0[0]), LINE); g.restore();
    }));
    // lines: every from→to pair in the flow, drawn once, brighter once a signal has used them
    flow.forEach(f => {
      if (!f.from) return;
      const key = f.from + '>' + f.to; if (seen.has(key)) return; seen.add(key);
      const used = flow.some(x => x.from === f.from && x.to === f.to && t >= x.t);
      if (o.hideEdges && !used) return;
      const [p0, p1, via] = pathOf(nodes, f), col = LINE;
      g.save(); g.globalAlpha = used ? .9 : .28; g.strokeStyle = col; g.lineWidth = used ? 3 : 2; g.setLineDash(used ? [] : [6, 6]);
      g.beginPath(); g.moveTo(p0[0], p0[1]); via ? g.quadraticCurveTo(via[0], via[1], p1[0], p1[1]) : g.lineTo(p1[0], p1[1]); g.stroke(); g.setLineDash([]);
      const q = along(p0, p1, via, .97); arrowHead(g, p1[0], p1[1], Math.atan2(p1[1] - q[1], p1[0] - q[0]), col); g.restore();
      if (f.edgeLabel) { const m = along(p0, p1, via, .5); g.save(); g.globalAlpha = used ? 1 : .5; pill(g, f.edgeLabel, m[0] + (f.lx || 0), m[1] + (f.ly || 0), col, 12); g.restore(); }
    });
    nodes.filter(n => !n.back).forEach(n => box(g, n, val[n.id], lit[n.id], (o.only && !o.only.includes(n.id)) || (o.focus && !o.focus.includes(n.part))));
    // packets in flight, with their label and any context riding along
    flow.forEach(f => {
      if (!f.from || t < f.t || t > f.t + f.dur) return;
      const raw = clamp((t - f.t) / f.dur), k = f.bounce ? .8 * ease(clamp(raw / .7)) : ease(raw), [p0, p1, via] = pathOf(nodes, f);
      const h = packet(g, p0, p1, via, k);
      if (f.bounce && raw > .7) pill(g, '✕ ' + (f.bounce === true ? 'not accepted' : f.bounce), h[0], h[1] + 24, '#cc0000', 13, '#fff');
      if (f.label) pill(g, f.label, h[0], h[1] - 24, INK, 13);
      if (f.ctx) { const w = pill(g, f.ctx, h[0] + 16, h[1] + 24, PART.context.col, 12, PART.context.fill); capsule(g, h[0] + 16 - w / 2 - 18, h[1] + 24, 26, 14, 2); }
    });
    return { val, lit };
  }

  // the slide 25 key: each framework part drawn with its own glyph
  function legend(g, x, y, parts) {
    let cx = x;
    parts.forEach(p => {
      const name = p === 'entity' ? 'Entity / system' : PART[p].name, gx = cx + 12;
      if (p === 'state') stateChip(g, gx + 10, y, '5', 0, 22);
      if (p === 'signal') triangle(g, gx, y, 9);
      if (p === 'receiver') pacman(g, gx, y, 10);
      if (p === 'transform') transformArrow(g, gx + 4, y, 30);
      if (p === 'context') capsule(g, gx + 2, y, 28, 14, 2);
      if (p === 'entity' || p === 'system') { g.fillStyle = PART.entity.fill; g.strokeStyle = PART.entity.col; g.lineWidth = 2; g.beginPath(); g.roundRect(gx - 12, y - 9, 24, 18, 4); g.fill(); g.stroke(); }
      const tx = cx + (p === 'transform' ? 38 : p === 'state' ? 46 : 28);
      g.font = '600 12px Montserrat, Jost, sans-serif'; g.fillStyle = INK; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(name, tx, y + 1);
      cx = tx + g.measureText(name).width + 18;
    });
    return cx;
  }
  // the lavender X-Ray panel the deck draws its diagrams in
  function frame(g, x, y, w, h) {
    g.fillStyle = XRAY.fill; g.strokeStyle = XRAY.edge; g.lineWidth = 3; g.beginPath(); g.roundRect(x + 2, y + 2, w - 4, h - 4, 18); g.fill(); g.stroke();
    g.font = '800 18px Montserrat, Jost, sans-serif'; g.fillStyle = INK; g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillText('X-Ray', x + w - 20, y + 22);
  }

  // turn timed actions into a flow. rules[type](state, action) returns hops { dt, dur, from, to, kind, label?, ctx?, set?, bounce? }
  // with dt relative to the action; state is what every box holds once all earlier hops have landed.
  function script(nodes, actions, rules) {
    const state = {}, flow = [];
    nodes.forEach(n => { state[n.id] = n.value; });
    actions.slice().sort((a, b) => a.at - b.at).forEach(a => {
      (rules[a.type](state, a) || []).forEach(h => {
        flow.push({ ...h, t: a.at + (h.dt || 0) });
        if (h.set && !h.bounce) Object.assign(state, h.set);
      });
    });
    return flow;
  }

  // last time any signal in the flow arrives
  const end = flow => Math.max(0, ...flow.map(f => f.t + f.dur));

  window.XR = { PART, KIND, replay, draw, legend, frame, pill, box, end, script, triangle, pacman, transformArrow, capsule, stateChip };
})();
