// node maps-test.js [battles] [map key]: runs whole battles on the asymmetric maps (maps.js), with the spawns as drawn and swapped,
// and prints who wins from each side, which script lines hold, and for every feature how much it was used and by which tokens.
globalThis.window = globalThis; globalThis.TD = { C: {} };
require('../shared/plan.js'); require('./map.js'); require('./sim.js'); require('./maps.js');
const N = +process.argv[2] || 10, only = process.argv[3];
const name = k => (FPSSIM.ROSTER.find(u => u.key === k) || { name: k }).name;
for (const M of FPSMAPS) {
  if (only && M.key !== only) continue;
  const map = M.build(); console.log(`\n=== ${map.name} ===`);
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
