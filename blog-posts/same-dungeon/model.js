/* The dungeon model for Same Dungeon, Fifth Time. Pack numbers are illustrative; the four real affixes are simplified
   from World of Warcraft's Mythic+ (Bolstering, Sanguine, Explosive, Volcanic). Shared by the page and its smoke test. */
(function (root) {
  const START = [40, 190], BOSS = [600, 190], NEED = 60, PAR = 300, BOSS_T = 60, TOL = 8, DEATH_T = 15;
  // n mobs, big = elites among them, cast = casters among them, narrow room or wide
  const PACKS = [
    { id: 'A', n: 'Hallway rats', x: 140, y: 190, mobs: 8, big: 0, cast: 0, narrow: true, f: 16, t: 25, d: 1 },
    { id: 'B', n: 'Two brutes', x: 250, y: 90, mobs: 2, big: 2, cast: 0, narrow: false, f: 14, t: 35, d: 2 },
    { id: 'C', n: 'Caster circle', x: 250, y: 290, mobs: 4, big: 0, cast: 4, narrow: false, f: 14, t: 28, d: 2 },
    { id: 'D', n: 'Captain\'s guard', x: 360, y: 190, mobs: 5, big: 1, cast: 0, narrow: true, f: 16, t: 32, d: 2 },
    { id: 'E', n: 'Swarm nest', x: 440, y: 60, mobs: 10, big: 0, cast: 0, narrow: false, f: 20, t: 30, d: 2 },
    { id: 'F', n: 'Sentry pair', x: 470, y: 300, mobs: 2, big: 2, cast: 2, narrow: true, f: 12, t: 28, d: 2 },
    { id: 'G', n: 'Courtyard mob', x: 530, y: 180, mobs: 7, big: 1, cast: 1, narrow: false, f: 18, t: 38, d: 3 },
  ];
  const AFFIX = [
    { n: 'Crimson', real: false, tip: 'Every enemy is tinted red.', f: p => [0, 0] },
    { n: 'Bolstering', real: true, tip: 'When an enemy dies, the survivors near it grow stronger. Packs that mix small enemies with an elite are the danger.', f: p => p.big && p.mobs > p.big ? [(p.mobs - p.big) * 6, (p.mobs - p.big) * .8] : [p.mobs * .5, 0] },
    { n: 'Sanguine', real: true, tip: 'Dying enemies leave a pool that heals their friends. In a narrow room there is nowhere to drag them.', f: p => p.narrow ? [12 + p.mobs * 4, 0] : [p.mobs * .5, 0] },
    { n: 'Ancient', real: false, tip: 'Every enemy has a new name.', f: p => [0, 0] },
    { n: 'Explosive', real: true, tip: 'Orbs appear for every enemy you are fighting, and explode unless killed. Many small enemies mean many orbs.', f: p => [p.mobs * 1.8, p.mobs / 5] },
    { n: 'Volcanic', real: true, tip: 'Fire erupts under anyone standing at range. Casters keep you at range.', f: p => [p.cast * 4, p.cast * 1.2] },
  ];
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) * .08;   // seconds to walk
  const pack = (a, i) => { const p = PACKS[i], [dt, dd] = AFFIX[a].f(p); return { t: p.t + dt, d: p.d + dd }; };
  function cost(a, route) {
    let t = 0, d = 0, f = 0, at = START;
    route.forEach(i => { const p = PACKS[i], c = pack(a, i); t += dist(at, [p.x, p.y]) + c.t; d += c.d; f += p.f; at = [p.x, p.y]; });
    t += dist(at, BOSS) + BOSS_T;
    const deaths = Math.max(0, Math.round((d - TOL) / 2));
    return { time: t + deaths * DEATH_T, deaths, forces: f, ok: f >= NEED, timed: f >= NEED && t + deaths * DEATH_T <= PAR };
  }
  // the fastest route that meets the enemy-forces count (brute force over ordered subsets; 7 packs)
  function best(a) {
    let bt = 1e9, br = null;
    const go = (r, used) => { const c = cost(a, r); if (c.ok && c.time < bt) { bt = c.time; br = r.slice(); } if (r.length >= 5) return; for (let i = 0; i < PACKS.length; i++) if (!(used >> i & 1)) { r.push(i); go(r, used | 1 << i); r.pop(); } };
    go([], 0); return { route: br, ...cost(a, br) };
  }
  const M = { START, BOSS, NEED, PAR, PACKS, AFFIX, cost, best, pack };
  if (typeof module !== 'undefined') module.exports = M; else root.DUNGEON = M;
})(this);
