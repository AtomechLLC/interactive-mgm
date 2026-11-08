/* Feedback loop sandbox (MGM C4 M3, deck slides 155-176): the rules, kept apart from the drawing so the chart, the trend
   label and the GIF recorder always agree. Two players (or one, for the wildfire and thermostat) play 30 rounds. Each round
   everyone earns a base income, then the switched-on loops adjust it. Numbers are illustrative. */
(function (root) {
  const ROUNDS = 30, BASE = 10, LIMIT = 40, SET = 100;
  const noise = (r, who) => { const x = Math.sin((r + 1) * 12.9898 + who * 78.233) * 43758.5453; return (x - Math.floor(x) - 0.5) * 6; };

  // o: { pos, neg, dim, cap, solo }
  function run(o) {
    const A = [18], B = [10], gain = [];
    for (let r = 1; r <= ROUNDS; r++) {
      const a = A[r - 1], b = B[r - 1];
      let ia = BASE + noise(r, 0), ib = BASE + noise(r, 1);
      const fired = { pos: 0, neg: 0 };
      if (o.solo) {
        // one thing on its own: a fire that spreads, or a room a thermostat holds steady
        if (o.pos) { ia += 0.16 * a; fired.pos = 0.16 * a; }
        if (o.neg) { const d = 0.45 * (SET - a) - BASE; ia += d; fired.neg = d; }
      } else {
        // positive: whoever is ahead takes a share of the lead from whoever is behind (units lost, money invested)
        // diminishing returns: the bigger the leader already is, the less each extra advantage buys
        // limit: once the lead reaches LIMIT the snowball stops (a knockdown resets to neutral, the arrow count is capped)
        if (o.pos) {
          let t = 0.2 * (a - b);
          if (o.dim) t /= 1 + Math.max(a, b) / 40;
          if (o.cap && Math.abs(a - b) >= LIMIT) t = 0;
          ia += t; ib -= t; fired.pos = Math.abs(t);
        }
        if (o.neg) {
          const lead = a - b, pull = 0.3 * Math.abs(lead);
          if (lead > 0) { ib += pull; ia -= 0.1 * lead; } else { ia += pull; ib += 0.1 * lead; }
          fired.neg = pull;
        }
      }
      const na = a + ia, nb = b + ib;
      A.push(Math.max(0, na)); B.push(Math.max(0, nb)); gain.push(fired);
    }
    return { A, B, gain, gap: A.map((v, i) => v - B[i]) };
  }
  // the deck labels each loop by the trend it produces
  function trend(res, solo, upTo = ROUNDS) {
    const s = solo ? res.A : res.gap.map(Math.abs), i0 = Math.max(0, upTo - 10), d = (s[upTo] - s[i0]) / (upTo - i0);
    const grow = solo ? (res.A[upTo] - res.A[Math.max(0, upTo - 10)]) / 10 : d;
    if (solo) return grow > 14 ? 'up' : 'flat';
    return d > 1.2 ? 'up' : d < -1.2 ? 'down' : 'flat';
  }
  const api = { run, trend, ROUNDS, LIMIT, SET, BASE };
  if (typeof module !== 'undefined') module.exports = api; else root.LoopModel = api;
})(this);
