/* Mechanics X-ray diagrams (MGM C4 M2, Universal Mechanics Description Framework, deck slides 20-33, 52-54, 100, 107).
   A diagram is a list of boxes plus a flow: timed signals that travel from box to box. Each box is coloured by the framework
   part it plays (state, signal, receiver, transform, context, entity, system). Everything is a pure function of t, so pages
   can seek for GIFs: XR.replay(nodes, flow, t) says what every box holds at t, XR.draw(g, nodes, flow, t) paints it.
   node: { id, x, y, w, h, part, title, value?, sub? }   (x, y = top-left, in canvas units)
   flow: { t, dur, from, to, kind: 'command' | 'effect' | 'system', label?, ctx?, set?: { id: value }, via?: [x, y], bounce? }
   A bounce hop stops short of its target and is refused (no receiver for that signal). A hop with no from just sets values. */
(function () {
  const TAU = Math.PI * 2;
  const PART = {
    state: { col: '#d18f12', bg: '#fff3d6', name: 'State' },
    signal: { col: '#2fae63', bg: '#e2f5e8', name: 'Signal' },
    receiver: { col: '#2ea3dc', bg: '#e0f2fb', name: 'Receiver' },
    transform: { col: '#8a4fd6', bg: '#efe5fb', name: 'Transform' },
    context: { col: '#e5322d', bg: '#fbe4e2', name: 'Context' },
    entity: { col: '#152044', bg: '#e6e8f3', name: 'Entity' },
    system: { col: '#5562eb', bg: '#e5e7fd', name: 'System' },
  };
  // signal kinds from the notes on slide 28: commands come from the player, side effects from impacts, then systems pass it on
  const KIND = { command: { col: '#2fae63', name: 'Command signal' }, effect: { col: '#e0a92d', name: 'Side-effect signal' }, system: { col: '#5562eb', name: 'System signal' } };
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
  function ends(a, b) {
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

  function box(g, n, v, litAgo, dim) {
    const P = PART[n.part] || PART.entity, glow = litAgo == null ? 0 : clamp(1 - litAgo / .9);
    g.save(); g.globalAlpha = dim ? .35 : 1;
    if (glow > 0) { g.shadowColor = P.col; g.shadowBlur = 26 * glow; }
    g.fillStyle = '#fffcf4'; g.strokeStyle = P.col; g.lineWidth = 2.5 + 2.5 * glow;
    g.beginPath(); g.roundRect(n.x, n.y, n.w, n.h, 10); g.fill(); g.stroke();
    g.shadowBlur = 0;
    g.fillStyle = P.bg; g.beginPath(); g.roundRect(n.x, n.y, n.w, 20, [10, 10, 0, 0]); g.fill();
    g.fillStyle = P.col; g.font = '700 11px Jost, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillText((n.tag || P.name).toUpperCase(), n.x + 9, n.y + 11);
    const hasVal = v != null && v !== '';
    g.fillStyle = '#262c6a'; g.textAlign = 'center';
    g.font = `700 ${n.fs || 15}px Montserrat, Jost, sans-serif`;
    const lines = String(n.title).split('\n'), top = n.y + 20, room = n.h - 20;
    const lh = (n.fs || 15) * 1.15, blockH = lines.length * lh + (hasVal ? 26 : 0) + (n.sub ? 16 : 0);
    let y = top + (room - blockH) / 2 + lh / 2;
    lines.forEach(l => { g.fillText(l, n.x + n.w / 2, y); y += lh; });
    if (n.sub) { g.font = '500 12px Jost, sans-serif'; g.fillStyle = '#5d618c'; g.fillText(n.sub, n.x + n.w / 2, y - 2); y += 16; }
    if (hasVal) {
      g.font = '800 22px Montserrat, Jost, sans-serif'; g.fillStyle = P.col;
      const pop = glow > 0 ? 1 + .25 * glow : 1;
      g.save(); g.translate(n.x + n.w / 2, y + 6); g.scale(pop, pop); g.fillText(String(v), 0, 0); g.restore();
    }
    g.restore();
  }

  function arrowHead(g, x, y, ang, col, s = 9) {
    g.fillStyle = col; g.beginPath(); g.moveTo(x, y); g.lineTo(x - s * Math.cos(ang - .45), y - s * Math.sin(ang - .45)); g.lineTo(x - s * Math.cos(ang + .45), y - s * Math.sin(ang + .45)); g.closePath(); g.fill();
  }

  // the green waves from slide 28: a short wavy packet that rides the line
  function packet(g, p0, p1, via, k, col) {
    const N = 26, span = .16, pts = [];
    for (let i = 0; i <= N; i++) {
      const kk = clamp(k - span + span * i / N); const p = along(p0, p1, via, kk);
      const q = along(p0, p1, via, clamp(kk + .01)); const ang = Math.atan2(q[1] - p[1], q[0] - p[0]);
      const amp = 6 * Math.sin(i / N * Math.PI), w = Math.sin(i * 1.4 - k * 30) * amp;
      pts.push([p[0] - Math.sin(ang) * w, p[1] + Math.cos(ang) * w]);
    }
    g.save(); g.strokeStyle = col; g.lineWidth = 4; g.lineCap = 'round'; g.lineJoin = 'round'; g.shadowColor = col; g.shadowBlur = 10;
    g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); g.restore();
    const h = along(p0, p1, via, k); g.fillStyle = '#fff'; g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); g.arc(h[0], h[1], 6, 0, TAU); g.fill(); g.stroke();
    return h;
  }

  // o.only: ids to show at full strength, o.focus: parts to show at full strength (others dimmed); o.hideEdges: skip unused lines
  function draw(g, nodes, flow, t, o = {}) {
    const { val, lit } = replay(nodes, flow, t);
    const seen = new Set();
    // lines: every from→to pair in the flow, drawn once, brighter once a signal has used them
    flow.forEach(f => {
      if (!f.from) return;
      const key = f.from + '>' + f.to; if (seen.has(key)) return; seen.add(key);
      const used = flow.some(x => x.from === f.from && x.to === f.to && t >= x.t);
      if (o.hideEdges && !used) return;
      const [p0, p1, via] = pathOf(nodes, f), col = (KIND[f.kind] || KIND.command).col;
      g.save(); g.globalAlpha = used ? .9 : .28; g.strokeStyle = col; g.lineWidth = used ? 3 : 2; g.setLineDash(used ? [] : [6, 6]);
      g.beginPath(); g.moveTo(p0[0], p0[1]); via ? g.quadraticCurveTo(via[0], via[1], p1[0], p1[1]) : g.lineTo(p1[0], p1[1]); g.stroke(); g.setLineDash([]);
      const q = along(p0, p1, via, .97); arrowHead(g, p1[0], p1[1], Math.atan2(p1[1] - q[1], p1[0] - q[0]), col); g.restore();
      if (f.edgeLabel) { const m = along(p0, p1, via, .5); g.save(); g.globalAlpha = used ? 1 : .5; pill(g, f.edgeLabel, m[0] + (f.lx || 0), m[1] + (f.ly || 0), col, 12); g.restore(); }
    });
    nodes.forEach(n => box(g, n, val[n.id], lit[n.id], (o.only && !o.only.includes(n.id)) || (o.focus && !o.focus.includes(n.part))));
    // packets in flight, with their label and any context riding along
    flow.forEach(f => {
      if (!f.from || t < f.t || t > f.t + f.dur) return;
      const raw = clamp((t - f.t) / f.dur), k = f.bounce ? .8 * ease(clamp(raw / .7)) : ease(raw), [p0, p1, via] = pathOf(nodes, f), col = (KIND[f.kind] || KIND.command).col;
      const h = packet(g, p0, p1, via, k, col);
      if (f.bounce && raw > .7) pill(g, '✕ ' + (f.bounce === true ? 'not accepted' : f.bounce), h[0], h[1] + 22, PART.context.col, 13, '#fff');
      if (f.label) pill(g, f.label, h[0], h[1] - 20, col, 13);
      if (f.ctx) pill(g, f.ctx, h[0], h[1] + 20, PART.context.col, 12, PART.context.bg);
    });
    return { val, lit };
  }

  function legend(g, x, y, parts, kinds = []) {
    let cx = x;
    g.font = '600 12px Jost, sans-serif';
    parts.forEach(p => { const P = PART[p]; g.fillStyle = P.bg; g.strokeStyle = P.col; g.lineWidth = 2; const w = g.measureText(P.name).width + 26; g.beginPath(); g.roundRect(cx, y - 10, w, 20, 10); g.fill(); g.stroke(); g.fillStyle = P.col; g.beginPath(); g.arc(cx + 10, y, 4, 0, TAU); g.fill(); g.fillStyle = '#262c6a'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(P.name, cx + 18, y + 1); cx += w + 8; });
    kinds.forEach(k => { const K = KIND[k]; g.strokeStyle = K.col; g.lineWidth = 3; g.beginPath(); g.moveTo(cx, y); g.lineTo(cx + 22, y); g.stroke(); arrowHead(g, cx + 26, y, 0, K.col, 8); g.fillStyle = '#262c6a'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(K.name, cx + 32, y + 1); cx += g.measureText(K.name).width + 50; });
    return cx;
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

  window.XR = { PART, KIND, replay, draw, legend, pill, box, end, script };
})();
