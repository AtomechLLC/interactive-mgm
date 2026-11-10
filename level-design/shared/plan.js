/* Floor-plan kit for the Level Design Book pages, drawn the way an architect's plan reads:
   rooms share walls instead of hanging off corridors, walls meet at varied angles, some rooms are round,
   exterior walls are heavy and interior walls light, doorways are gaps with a door swing, and stairs, dashed
   thresholds, half walls, columns and planters give each room a purpose.

   const P = PLAN.make();
   P.poly(id, pts, o)                      a room from a polygon; o = { lab, tint, via: { name: [x, y] } }
   P.round(id, cx, cy, r, o)               a round room
   P.chain(fromId, edgeIndex, steps)       grow rooms off an edge, each sharing a wall with the last:
                                           step = { id, len, turn (degrees, + is clockwise), w (end width), round: r, lab, tint, kind }
   P.link(id, aId, ai, bId, bi, o)         a passage between two room edges; o = { w, ta, tb, kind } (kind of the door into b)
   P.stairs(a, b, w, n) / P.dash(a, b) / P.half(a, b) / P.prop(type, x, y, r, rot) / P.mark(kind, x, y, s)
   P.walk(route)                           points for a route of 'id' or 'id:via' items, passing through the doors
   P.render(W, H)                          a cached canvas of the static plan
   P.overlay(g, state)                     per-frame door states: state.gate (open?) and state.short (open?)
   A step or link with kind 'open' leaves the whole shared wall open (a dashed threshold), for one space split into parts.
   Every door has { a, b, m (midpoint), e (unit along the wall), gw (gap), kind }. */
(function () {
  const TAU = Math.PI * 2, C = TD.C;
  const INK = '#1c2450', FLOOR = '#f5eedc', FLOOR2 = '#ece2c9';
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]], add = (a, b) => [a[0] + b[0], a[1] + b[1]], mul = (a, k) => [a[0] * k, a[1] * k];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1], hyp = a => Math.hypot(a[0], a[1]), unit = a => mul(a, 1 / (hyp(a) || 1));
  const rot = (v, deg) => { const r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r); return [v[0] * c - v[1] * s, v[0] * s + v[1] * c]; };
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const cent = pts => [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];

  function make() {
    const rooms = {}, doors = [], stairs = [], dashes = [], halves = [], props = [], marks = [];
    const P = { rooms, doors, stairs, dashes, halves, props, marks };
    const center = r => r.circle ? [r.circle[0], r.circle[1]] : cent(r.pts);
    const edgeOf = (r, i) => [r.pts[i % r.pts.length], r.pts[(i + 1) % r.pts.length]];
    function door(a, b, L, R, kind) {
      const e = unit(sub(R, L)), m = mid(L, R), gw = kind === 'open' ? hyp(sub(R, L)) - 22 : Math.min(42, hyp(sub(R, L)) * .7);
      doors.push({ a, b, m, e, gw, kind: kind || 'door' });
    }
    P.poly = (id, pts, o = {}) => (rooms[id] = { id, pts, ...o, c: o.c || cent(pts) });
    P.round = (id, cx, cy, r, o = {}) => (rooms[id] = { id, circle: [cx, cy, r], ...o, c: o.c || [cx, cy] });
    P.chain = (fromId, ei, steps) => {
      let prev = rooms[fromId], [L, R] = edgeOf(prev, ei);
      let d = unit([-(R[1] - L[1]), R[0] - L[0]]);
      if (dot(d, sub(mid(L, R), center(prev))) < 0) d = mul(d, -1);
      steps.forEach(st => {
        const m = mid(L, R);
        if (st.round) {
          const r = st.round, c = add(m, mul(d, r));
          P.round(st.id, c[0], c[1], r, st); door(prev.id, st.id, L, R, st.kind); prev = rooms[st.id]; return;
        }
        const d2 = unit(rot(d, st.turn || 0)), w = st.w || hyp(sub(R, L)), m2 = add(m, mul(d2, st.len)), u = [-d2[1], d2[0]];
        const s = dot(sub(L, m), u) >= 0 ? 1 : -1, L2 = add(m2, mul(u, s * w / 2)), R2 = add(m2, mul(u, -s * w / 2));
        P.poly(st.id, [L, R, R2, L2], st); door(prev.id, st.id, L, R, st.kind);
        prev = rooms[st.id]; L = L2; R = R2; d = d2;
      });
      return prev;
    };
    P.link = (id, aId, ai, bId, bi, o = {}) => {
      const seg = (r, i, t, w) => { const [p, q] = edgeOf(rooms[r], i), e = unit(sub(q, p)), m = add(p, mul(sub(q, p), t)); return [add(m, mul(e, -w / 2)), add(m, mul(e, w / 2))]; };
      const w = o.w || 70, [a1, a2] = seg(aId, ai, o.ta ?? .5, w), [b1, b2] = seg(bId, bi, o.tb ?? .5, o.wb || w);
      const cross = hyp(sub(a2, b2)) + hyp(sub(a1, b1)) < hyp(sub(a2, b1)) + hyp(sub(a1, b2));
      const pts = cross ? [a1, a2, b2, b1] : [a1, a2, b1, b2];
      P.poly(id, pts, o); door(aId, id, a1, a2); door(id, bId, pts[2], pts[3], o.kind);
      return rooms[id];
    };
    P.stairs = (a, b, w, n = 7) => stairs.push({ a, b, w, n });
    P.dash = (a, b) => dashes.push({ a, b });
    P.half = (a, b) => halves.push({ a, b });
    P.prop = (type, x, y, r = 9, rot = 0) => props.push({ type, x, y, r, rot });
    P.mark = (kind, x, y, s = 1) => marks.push({ kind, x, y, s });
    P.doorOf = (a, b) => doors.find(d => (d.a === a && d.b === b) || (d.a === b && d.b === a));
    P.walk = route => {
      const pt = item => { const [id, v] = item.split(':'), r = rooms[id]; return v ? r.via[v] : r.c; };
      const out = [pt(route[0])];
      for (let i = 1; i < route.length; i++) {
        const a = route[i - 1].split(':')[0], b = route[i].split(':')[0];
        if (a !== b) { const d = P.doorOf(a, b); if (d && d.kind !== 'open') out.push(d.m); }
        out.push(pt(route[i]));
      }
      return out;
    };

    function shape(g, r) { g.beginPath(); if (r.circle) g.arc(r.circle[0], r.circle[1], r.circle[2], 0, TAU); else { r.pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); } }
    function drawProp(g, p) {
      g.save(); g.translate(p.x, p.y); g.rotate(p.rot);
      if (p.type === 'column') { g.fillStyle = INK; g.beginPath(); g.arc(0, 0, p.r, 0, TAU); g.fill(); }
      else if (p.type === 'planter') { g.fillStyle = '#e3d6b6'; g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, p.r, 0, TAU); g.fill(); g.stroke(); g.fillStyle = '#6aa35a'; for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; g.beginPath(); g.arc(Math.cos(a) * p.r * .35, Math.sin(a) * p.r * .35, p.r * .45, 0, TAU); g.fill(); } }
      else if (p.type === 'crate') { g.fillStyle = '#c99c6c'; g.strokeStyle = '#6b4424'; g.lineWidth = 2; g.fillRect(-p.r, -p.r, p.r * 2, p.r * 2); g.strokeRect(-p.r, -p.r, p.r * 2, p.r * 2); g.beginPath(); g.moveTo(-p.r, -p.r); g.lineTo(p.r, p.r); g.stroke(); }
      else if (p.type === 'table') { g.fillStyle = '#e3d6b6'; g.strokeStyle = INK; g.lineWidth = 2; g.fillRect(-p.r * 1.6, -p.r * .8, p.r * 3.2, p.r * 1.6); g.strokeRect(-p.r * 1.6, -p.r * .8, p.r * 3.2, p.r * 1.6); }
      g.restore();
    }
    function drawMark(g, m) {
      g.save(); g.translate(m.x, m.y); g.scale(m.s, m.s);
      g.fillStyle = 'rgba(28,36,80,.12)'; g.beginPath(); g.arc(5, 6, 32, 0, TAU); g.fill();
      if (m.kind === 'tower') {
        g.fillStyle = '#b9b3c8'; g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 28, 0, TAU); g.fill(); g.stroke();
        for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; g.fillStyle = '#d5d0e0'; g.fillRect(Math.cos(a) * 24 - 4, Math.sin(a) * 24 - 4, 8, 8); }
        g.fillStyle = INK; g.fillRect(-2, -38, 4, 36); g.fillStyle = C.gold; g.beginPath(); g.moveTo(2, -38); g.lineTo(26, -31); g.lineTo(2, -24); g.fill();
      } else if (m.kind === 'tree') {
        for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; g.fillStyle = i % 2 ? '#4f8a4a' : '#5f9c52'; g.beginPath(); g.arc(Math.cos(a) * 17, Math.sin(a) * 17, 18, 0, TAU); g.fill(); }
        g.fillStyle = '#76b062'; g.beginPath(); g.arc(-5, -5, 17, 0, TAU); g.fill();
        g.strokeStyle = '#2f5a2e'; g.lineWidth = 1.5; g.beginPath(); g.arc(0, 0, 35, 0, TAU); g.stroke();
      } else if (m.kind === 'fountain') {
        g.fillStyle = '#e3d6b6'; g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + .39; g.lineTo(Math.cos(a) * 32, Math.sin(a) * 32); } g.closePath(); g.fill(); g.stroke();
        g.fillStyle = '#86c6e6'; g.beginPath(); g.arc(0, 0, 23, 0, TAU); g.fill();
        g.fillStyle = '#e3d6b6'; g.beginPath(); g.arc(0, 0, 7, 0, TAU); g.fill(); g.stroke();
      } else if (m.kind === 'statue') {
        g.fillStyle = '#e3d6b6'; g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + .5; g.lineTo(Math.cos(a) * 24, Math.sin(a) * 24); } g.closePath(); g.fill(); g.stroke();
        g.fillStyle = C.gold; g.strokeStyle = C.goldInk; g.beginPath(); g.arc(0, 0, 10, 0, TAU); g.fill(); g.stroke();
      }
      g.restore();
    }
    P.render = (W, H) => {
      const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
      const list = Object.values(rooms);
      g.lineJoin = 'miter'; g.miterLimit = 1.4;
      // heavy outline first, floors on top (they cover the inner half of every wall), then a light line for every wall:
      // exterior walls end up heavy, the walls rooms share end up light, as on an architect's plan
      g.strokeStyle = INK; g.lineWidth = 15; list.forEach(r => { shape(g, r); g.stroke(); });
      list.forEach(r => { shape(g, r); g.fillStyle = r.tint || FLOOR; g.fill(); });
      // a faint grid of floor slabs, clipped to each room
      list.forEach(r => {
        g.save(); shape(g, r); g.clip(); g.strokeStyle = 'rgba(160,140,100,.16)'; g.lineWidth = 1;
        const [cx, cy] = r.c, ang = r.circle ? 0 : Math.atan2(r.pts[1][1] - r.pts[0][1], r.pts[1][0] - r.pts[0][0]);
        g.translate(cx, cy); g.rotate(ang); g.beginPath(); for (let k = -400; k <= 400; k += 26) { g.moveTo(k, -400); g.lineTo(k, 400); g.moveTo(-400, k); g.lineTo(400, k); } g.stroke(); g.restore();
      });
      g.strokeStyle = INK; g.lineWidth = 3.5; list.forEach(r => { shape(g, r); g.stroke(); });
      // stairs: a strip with treads across it and an arrow up the flight
      stairs.forEach(s => {
        const d = unit(sub(s.b, s.a)), n = [-d[1], d[0]], h = s.w / 2;
        g.fillStyle = FLOOR2; g.strokeStyle = 'rgba(28,36,80,.55)'; g.lineWidth = 1.5;
        g.beginPath(); [add(s.a, mul(n, h)), add(s.b, mul(n, h)), add(s.b, mul(n, -h)), add(s.a, mul(n, -h))].forEach((p, i) => i ? g.lineTo(...p) : g.moveTo(...p)); g.closePath(); g.fill(); g.stroke();
        g.beginPath(); for (let i = 1; i < s.n; i++) { const p = add(s.a, mul(sub(s.b, s.a), i / s.n)); g.moveTo(...add(p, mul(n, h))); g.lineTo(...add(p, mul(n, -h))); } g.stroke();
        const m0 = add(s.a, mul(sub(s.b, s.a), .15)), m1 = add(s.a, mul(sub(s.b, s.a), .85));
        g.beginPath(); g.moveTo(...m0); g.lineTo(...m1); g.lineTo(...add(m1, add(mul(d, -8), mul(n, 5)))); g.moveTo(...m1); g.lineTo(...add(m1, add(mul(d, -8), mul(n, -5)))); g.stroke();
      });
      g.setLineDash([7, 6]); g.strokeStyle = 'rgba(28,36,80,.55)'; g.lineWidth = 2; dashes.forEach(s => { g.beginPath(); g.moveTo(...s.a); g.lineTo(...s.b); g.stroke(); }); g.setLineDash([]);
      g.strokeStyle = INK; g.lineWidth = 6; g.lineCap = 'butt'; halves.forEach(s => { g.beginPath(); g.moveTo(...s.a); g.lineTo(...s.b); g.stroke(); });
      // doorways: cut the wall, add jambs and a door swing
      doors.forEach(d => {
        const a = add(d.m, mul(d.e, -d.gw / 2)), b = add(d.m, mul(d.e, d.gw / 2)), n = [-d.e[1], d.e[0]];
        g.strokeStyle = FLOOR; g.lineWidth = 17; g.lineCap = 'butt'; g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke();
        if (d.kind === 'open') { g.setLineDash([7, 6]); g.strokeStyle = 'rgba(28,36,80,.45)'; g.lineWidth = 2; g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke(); g.setLineDash([]); return; }
        g.strokeStyle = INK; g.lineWidth = 3; [a, b].forEach(p => { g.beginPath(); g.moveTo(...add(p, mul(n, 8))); g.lineTo(...add(p, mul(n, -8))); g.stroke(); });
        if (d.kind === 'door') { g.strokeStyle = 'rgba(28,36,80,.35)'; g.lineWidth = 1.2; const a0 = Math.atan2(d.e[1], d.e[0]); g.beginPath(); g.arc(a[0], a[1], d.gw, a0, a0 + Math.PI / 2); g.stroke(); g.beginPath(); g.moveTo(...a); g.lineTo(...add(a, mul(n, d.gw))); g.stroke(); }
      });
      props.forEach(p => drawProp(g, p));
      marks.forEach(m => drawMark(g, m));
      return cv;
    };
    P.overlay = (g, st = {}) => doors.forEach(d => {
      const a = add(d.m, mul(d.e, -d.gw / 2)), b = add(d.m, mul(d.e, d.gw / 2));
      if (d.kind === 'gate' && !st.gate) { g.strokeStyle = C.red; g.lineWidth = 8; g.lineCap = 'butt'; g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke(); }
      if (d.kind === 'short' && !st.short) { g.strokeStyle = INK; g.lineWidth = 6; g.lineCap = 'butt'; g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke(); }
    });
    return P;
  }
  window.PLAN = { make, INK, FLOOR, rot, unit, mid, cent };
})();
