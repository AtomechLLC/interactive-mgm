/* The invisible bunny: a marker creature the designer can see in the editor and players never do.
   Shared by nightbane-tools/ (three hover spots A, B, C for Nightbane) and chess-event/ (one per square, so the
   pieces have something to walk to and target). BUNNY.draw(g, x, y, { label, on, s, a, ghost }):
   s scales it, a fades it, on paints it gold (reached / occupied), ghost draws a dashed outline (what players see: nothing). */
(function () {
  const TAU = Math.PI * 2;
  function draw(g, x, y, o = {}) {
    const s = o.s || 1, a = o.a == null ? 1 : o.a, col = o.on ? (o.onCol || '#ffb951') : (o.col || '#f2ead6');
    if (a <= 0) return;
    g.save(); g.globalAlpha *= a; g.translate(x, y); g.scale(s, s);
    if (o.ghost) { g.setLineDash([3, 3]); g.strokeStyle = 'rgba(242,234,214,.7)'; g.lineWidth = 1.5 / s; }
    g.fillStyle = col; g.beginPath(); g.ellipse(0, 0, 13, 11, 0, 0, TAU);
    o.ghost ? g.stroke() : g.fill();
    g.beginPath(); g.ellipse(-5, -14, 3, 8, -.2, 0, TAU); o.ghost ? g.stroke() : g.fill();
    g.beginPath(); g.ellipse(5, -14, 3, 8, .2, 0, TAU); o.ghost ? g.stroke() : g.fill();
    g.setLineDash([]);
    if (o.label) { g.font = `800 ${o.font || 12}px Montserrat, Jost, sans-serif`; g.fillStyle = o.ghost ? 'rgba(242,234,214,.8)' : '#152044'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(o.label, 0, 1); }
    g.restore();
  }
  window.BUNNY = { draw };
})();
