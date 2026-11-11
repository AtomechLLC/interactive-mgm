// node maps-test.js [battles] [map key]: runs whole battles on the asymmetric maps (maps.js), with the spawns as drawn and swapped,
// and prints who wins from each side, which script lines hold, and for every feature how much it was used and by which tokens.
globalThis.window = globalThis; globalThis.TD = { C: {} };
require('../shared/plan.js'); require('./map.js'); require('./sim.js'); require('./maps.js');
const N = +process.argv[2] || 10, only = process.argv[3];
const name = k => (FPSSIM.ROSTER.find(u => u.key === k) || { name: k }).name;
for (const M of FPSMAPS) {
  if (only && M.key !== only) continue;
  const map = M.build(); console.log(`\n=== ${map.name} ===`);
  // the plan itself: rooms must not overlap by more than a sliver, every door must sit between its two rooms, every lane must connect
  { const R = map.P.rooms, ids = Object.keys(R), inR = (r, x, y) => { if (r.circle) return Math.hypot(x - r.circle[0], y - r.circle[1]) <= r.circle[2]; let c = false; const p = r.pts; for (let i = 0, j = p.length - 1; i < p.length; j = i++) if ((p[i][1] > y) !== (p[j][1] > y) && x < (p[j][0] - p[i][0]) * (y - p[i][1]) / (p[j][1] - p[i][1]) + p[i][0]) c = !c; return c; };
    const over = {}; for (let x = 2; x < 1040; x += 4) for (let y = 2; y < 585; y += 4) { const hit = ids.filter(id => inR(R[id], x, y)); if (hit.length > 1) over[hit.join('+')] = (over[hit.join('+')] || 0) + 1; }
    Object.entries(over).forEach(([k, n]) => { if (n > 12) console.log('  OVERLAP', k, n * 16, 'px2'); });
    map.P.doors.forEach(d => { const n = [-d.e[1], d.e[0]], s = [1, -1].map(k => ids.filter(id => inR(R[id], d.m[0] + n[0] * 7 * k, d.m[1] + n[1] * 7 * k))); if (!((s[0].includes(d.a) && s[1].includes(d.b)) || (s[0].includes(d.b) && s[1].includes(d.a)))) console.log('  BAD DOOR', d.a, d.b, d.m.map(Math.round), JSON.stringify(s)); });
    Object.entries(map.lanes).forEach(([k, r]) => r.forEach((id, i) => { if (i && !map.P.doors.some(d => (d.a === id && d.b === r[i - 1]) || (d.b === id && d.a === r[i - 1]))) console.log('  LANE BREAK', k, r[i - 1], id); }));
    ids.forEach(id => { const r = R[id]; if (r.pts) { const p = r.pts; let sg = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length], c = p[(i + 2) % p.length], z = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]); if (z && sg && Math.sign(z) !== sg) console.log('  NOT CONVEX', id); if (z) sg = Math.sign(z); } } }); }
  for (const swap of [false, true]) {
    const wins = [0, 0], met = {}, feat = {}, ln = {}; let time = 0, stuck = 0, hz = 0, deaths = 0, lose = 0, lines;
    for (let s = 1; s <= N; s++) {
      const b = FPSSIM.create(map, { seed: s, swap }); lines = b.lines;
      while (!b.over && b.t < 1800) b.step(1 / 30);
      if (b.units.some(u => !isFinite(u.x) || !isFinite(u.hp))) throw new Error('NaN in battle ' + s);
      if (!b.over) { stuck++; continue; }
      wins[b.winner]++; time += b.t; lose += Math.min(...b.score); hz += b.hzDeaths; deaths += b.deaths.length;
      const sc = b.script(); b.lines.forEach(([k]) => { met[k] = met[k] || { n: 0, v: [] }; met[k].n += sc[k][1] ? 1 : 0; met[k].v.push(sc[k][0]); });
      b.deaths.forEach(k => { const l = map.laneOf[k.room]; ln[l] = (ln[l] || 0) + 1; });
      b.features().forEach(f => { const o = feat[f.name] = feat[f.name] || { val: 0, dead: 0, met: 0, unit: f.unit, top: {}, caught: {} }; o.val += f.val; o.dead += f.deaths || 0; o.met += f.met ? 1 : 0; f.top.forEach(([k, v]) => o.top[k] = (o.top[k] || 0) + v); (f.caught || []).forEach(([k, v]) => o.caught[k] = (o.caught[k] || 0) + v); });
    }
    const n = N - stuck || 1, top = o => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `${name(k)} ${(v / n).toFixed(1)}`).join(', ');
    console.log(`\n${swap ? 'spawns swapped (Sci-fi in the west)' : 'as drawn (Modern in the west)'}: Modern ${wins[0]}  Sci-fi ${wins[1]}  unfinished ${stuck}  mean length ${(time / n).toFixed(0)} s  hazard deaths ${Math.round(hz / (deaths || 1) * 100)}%  mean losing score ${(lose / n).toFixed(0)}`);
    console.log('  deaths by lane:', JSON.stringify(ln));
    lines.forEach(([k, title]) => console.log(`  ${title}: met in ${met[k] ? met[k].n : 0} of ${n}   e.g. ${met[k] ? met[k].v.slice(0, 4).join(' | ') : ''}`));
    Object.entries(feat).forEach(([k, o]) => console.log(`  ${k}: ${(o.val / n).toFixed(0)} ${o.unit} per battle${o.unit.startsWith('damage dealt by') ? ` and ${(o.dead / n).toFixed(1)} deaths` : ''}, counted as used in ${o.met} of ${n}. ${o.unit.startsWith('damage dealt by') ? 'Kills set up by' : 'By'}: ${top(o.top) || 'nobody'}${Object.keys(o.caught).length ? '. Caught: ' + top(o.caught) : ''}`));
  }
}
