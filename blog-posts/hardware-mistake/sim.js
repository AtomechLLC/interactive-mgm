/* Billion Dollar Hardware Mistake: the lockstep simulation used by the desync spike. Runs in the browser and in Node.
   Two clients run the same soft-ball physics from the same start and the same inputs. The only difference: client B adds
   up the forces on each ball in the opposite order (as a different CPU, compiler or GPU reduction might). In real numbers
   that changes nothing. In 32-bit floats it changes the last bit, and the chaos of bouncing balls grows that bit into a
   different game. In fixed-point (whole numbers of 1/4096 units) addition is exact, so both clients stay identical.
   run(mode) returns, per frame, both clients' positions and a checksum of each. */
(function (root) {
  const N = 28, BOX = 400, R = 30, STEPS = 900, K = 0.06, DT = 1;
  const f = Math.fround;
  function start() {
    // seeded start: same for both clients
    let s = 12345; const r = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
    return Array.from({ length: N }, (_, i) => ({ x: 40 + (i % 6) * 64 + r() * 8, y: 40 + Math.floor(i / 6) * 64 + r() * 8, vx: (r() - .5) * 3, vy: (r() - .5) * 3 }));
  }
  // float32 step; order = 1 sums j ascending, -1 descending
  function stepF(B, order) {
    const fx = new Array(N).fill(0), fy = new Array(N).fill(0);
    for (let i = 0; i < N; i++) {
      let ax = f(0), ay = f(0);
      for (let n = 0; n < N; n++) {
        const j = order > 0 ? n : N - 1 - n; if (j === i) continue;
        const dx = f(B[i].x - B[j].x), dy = f(B[i].y - B[j].y), d2 = f(f(dx * dx) + f(dy * dy));
        if (d2 >= 4 * R * R || d2 === 0) continue;
        const d = f(Math.sqrt(d2)), push = f(f(K) * f(f(2 * R) - d));
        ax = f(ax + f(f(dx / d) * push)); ay = f(ay + f(f(dy / d) * push));
      }
      fx[i] = ax; fy[i] = ay;
    }
    for (let i = 0; i < N; i++) {
      const b = B[i]; b.vx = f(b.vx + fx[i]); b.vy = f(b.vy + fy[i]);
      b.x = f(b.x + b.vx); b.y = f(b.y + b.vy);
      if (b.x < R) { b.x = f(2 * R - b.x); b.vx = f(-b.vx); } if (b.x > BOX - R) { b.x = f(2 * (BOX - R) - b.x); b.vx = f(-b.vx); }
      if (b.y < R) { b.y = f(2 * R - b.y); b.vy = f(-b.vy); } if (b.y > BOX - R) { b.y = f(2 * (BOX - R) - b.y); b.vy = f(-b.vy); }
    }
  }
  // fixed-point step: everything is an integer number of 1/4096 units; integer sums do not care about order
  const S = 4096, KN = 246; // K = 246/4096 ≈ 0.06
  function stepI(B, order) {
    const fx = new Array(N).fill(0), fy = new Array(N).fill(0), RR = 2 * R * S;
    for (let i = 0; i < N; i++) {
      let ax = 0, ay = 0;
      for (let n = 0; n < N; n++) {
        const j = order > 0 ? n : N - 1 - n; if (j === i) continue;
        const dx = B[i].x - B[j].x, dy = B[i].y - B[j].y, d2 = dx * dx + dy * dy;
        if (d2 >= RR * RR || d2 === 0) continue;
        const d = Math.floor(Math.sqrt(d2)), push = Math.trunc(KN * (RR - d) / S);
        ax += Math.trunc(dx * push / d); ay += Math.trunc(dy * push / d);
      }
      fx[i] = ax; fy[i] = ay;
    }
    const lo = R * S, hi = (BOX - R) * S;
    for (let i = 0; i < N; i++) {
      const b = B[i]; b.vx += fx[i]; b.vy += fy[i]; b.x += b.vx; b.y += b.vy;
      if (b.x < lo) { b.x = 2 * lo - b.x; b.vx = -b.vx; } if (b.x > hi) { b.x = 2 * hi - b.x; b.vx = -b.vx; }
      if (b.y < lo) { b.y = 2 * lo - b.y; b.vy = -b.vy; } if (b.y > hi) { b.y = 2 * hi - b.y; b.vy = -b.vy; }
    }
  }
  const sum = B => { let h = 0; B.forEach(b => { h = (Math.imul(h, 31) + Math.round(b.x * 4096)) | 0; h = (Math.imul(h, 31) + Math.round(b.y * 4096)) | 0; }); return h >>> 0; };
  const cache = {};
  function run(mode) {
    if (cache[mode]) return cache[mode];
    const s0 = start(), fixed = mode === 'fixed';
    const mk = () => s0.map(b => fixed ? { x: Math.round(b.x * S), y: Math.round(b.y * S), vx: Math.round(b.vx * S), vy: Math.round(b.vy * S) } : { x: f(b.x), y: f(b.y), vx: f(b.vx), vy: f(b.vy) });
    const A = mk(), Bc = mk(), frames = [];
    let first = -1;
    for (let k = 0; k <= STEPS; k++) {
      const pa = A.map(b => fixed ? [b.x / S, b.y / S] : [b.x, b.y]), pb = Bc.map(b => fixed ? [b.x / S, b.y / S] : [b.x, b.y]);
      const ca = sum(pa.map(([x, y]) => ({ x, y }))), cb = sum(pb.map(([x, y]) => ({ x, y })));
      let gap = 0; pa.forEach((p, i) => { gap = Math.max(gap, Math.hypot(p[0] - pb[i][0], p[1] - pb[i][1])); });
      if (first < 0 && ca !== cb) first = k;
      frames.push({ a: pa, b: pb, ca, cb, gap });
      if (fixed) { stepI(A, 1); stepI(Bc, -1); } else { stepF(A, 1); stepF(Bc, -1); }
    }
    return (cache[mode] = { frames, first, N, BOX, R, STEPS });
  }
  root.LOCKSTEP = { run, N, BOX, R, STEPS };
})(typeof window !== 'undefined' ? window : globalThis);
