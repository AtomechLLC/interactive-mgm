/* Board rules for Count the Idle Seconds, shared by the page and by the matches it simulates at load. */
(function (root) {
  const GW = 9, GH = 6, TICKS = 50, RESPAWN = 8, HP = 6;
  function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function make(seed, mode, rejoin) { const P = []; for (let side = 0; side < 2; side++) { const c0 = side ? GW - 1 : 0, c1 = side ? GW - 2 : 1; for (let y = 0; y < GH; y++) P.push({ side, x: c0, y, hp: HP, dead: 0, home: [c0, y] }); for (let y = 1; y < 5; y++) P.push({ side, x: c1, y, hp: HP, dead: 0, home: [c1, y] }); }
    return { P, R: rng(seed), mode, rejoin, tick: 0, kills: [0, 0], me: 7, over: false, log: [] }; }
  const at = (G, x, y) => G.P.find(p => p.hp > 0 && p.x === x && p.y === y), alive = (G, side) => G.P.filter(p => p.side === side && p.hp > 0), md = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  function focus(G, side) { const foes = alive(G, 1 - side), mine = alive(G, side); if (!foes.length || !mine.length) return null; const cx = mine.reduce((a, p) => a + p.x, 0) / mine.length, cy = mine.reduce((a, p) => a + p.y, 0) / mine.length; return foes.slice().sort((a, b) => a.hp - b.hp || (Math.abs(a.x - cx) + Math.abs(a.y - cy)) - (Math.abs(b.x - cx) + Math.abs(b.y - cy)))[0]; }
  // an order is {dx, dy}: step that way, or strike whoever stands there
  function orderToward(G, p, tg) { if (!tg) return null; const adj = DIRS.map(([dx, dy]) => ({ dx, dy, o: at(G, p.x + dx, p.y + dy) })).filter(a => a.o && a.o.side !== p.side); if (adj.length) { const f = adj.find(a => a.o === tg) || adj.sort((a, b) => a.o.hp - b.o.hp)[0]; return { dx: f.dx, dy: f.dy }; }
    const opts = DIRS.map(([dx, dy]) => ({ dx, dy, x: p.x + dx, y: p.y + dy })).filter(o => o.x >= 0 && o.y >= 0 && o.x < GW && o.y < GH && !at(G, o.x, o.y)).sort((a, b) => md(a, tg) - md(b, tg)); return opts.length && md(opts[0], tg) < md(p, tg) + 1 ? { dx: opts[0].dx, dy: opts[0].dy } : null; }
  function soloOrder(G, p) { const foes = alive(G, 1 - p.side); if (!foes.length) return null; if (G.R() < G.dither) return null; const near = foes.slice().sort((a, b) => md(p, a) - md(p, b) || G.R() - .5)[0]; const adj = DIRS.map(([dx, dy]) => ({ dx, dy, o: at(G, p.x + dx, p.y + dy) })).filter(a => a.o && a.o.side !== p.side); if (adj.length) { const f = adj[Math.floor(G.R() * adj.length)]; return { dx: f.dx, dy: f.dy }; } return orderToward(G, p, near); }
  function apply(G, p, o) { if (!o || p.hp <= 0) return; const x = p.x + o.dx, y = p.y + o.dy; if (x < 0 || y < 0 || x >= GW || y >= GH) return; const t = at(G, x, y); if (t) { if (t.side !== p.side) { t.hp--; G.log.push({ x, y, tick: G.tick }); if (t.hp <= 0) { t.dead = G.tick; G.kills[p.side]++; } } return; } p.x = x; p.y = y; }
  // myOrder: undefined = a bot sits in the seat; null = the seat does nothing this tick
  function plan(G) { const f0 = focus(G, 0); return G.P.map(p => p.hp <= 0 ? null : p.side === 1 ? null : G.mode === 0 ? orderToward(G, p, f0) : soloOrder(G, p)); }
  function step(G, orders, myOrder) { if (G.over) return; G.tick++;
    G.P.forEach((p, i) => { if (p.side === 0) apply(G, p, i === G.me && myOrder !== undefined ? myOrder : orders[i]); });
    const f1 = focus(G, 1); G.P.forEach(p => { if (p.side === 1 && p.hp > 0 && G.R() >= G.foeDither) apply(G, p, orderToward(G, p, f1)); });
    if (G.rejoin) G.P.forEach(p => { if (p.hp <= 0 && G.tick - p.dead >= RESPAWN && !at(G, p.home[0], p.home[1])) { p.hp = HP; p.x = p.home[0]; p.y = p.home[1]; } });
    const a = alive(G, 0).length, b = alive(G, 1).length; if (G.tick >= TICKS || (!G.rejoin && (!a || !b))) { G.over = true; const s0 = G.rejoin ? G.kills[0] : alive(G, 0).reduce((s, p) => s + p.hp, 0), s1 = G.rejoin ? G.kills[1] : alive(G, 1).reduce((s, p) => s + p.hp, 0); G.result = s0 > s1 ? 'win' : s0 < s1 ? 'loss' : 'draw'; G.score = [s0, s1]; } }
  function rate(mode, rejoin, n, dither, foeDither) { let w = 0, d = 0; for (let k = 0; k < n; k++) { const G = make(1000 + k * 7, mode, rejoin); G.dither = dither; G.foeDither = foeDither; while (!G.over) step(G, plan(G)); if (G.result === 'win') w++; else if (G.result === 'draw') d++; } return { win: w / n, draw: d / n }; }
  root.IDLE = { GW, GH, TICKS, RESPAWN, HP, make, plan, step, rate, alive, at, DITHER: .1, FOE: .1 };
})(typeof window !== 'undefined' ? window : globalThis);
