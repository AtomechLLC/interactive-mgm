// node sim-test.js [battles]: runs whole battles without a browser and prints who wins, how long it takes and who gets the kills.
globalThis.window = globalThis; globalThis.TD = { C: {} };
require('../shared/plan.js'); require('./map.js'); require('./sim.js');
const N = +process.argv[2] || 20, map = FPSMAP.build(), wins = [0, 0], tot = {}; let time = 0, stuck = 0;
for (let s = 1; s <= N; s++) {
  const b = FPSSIM.create(map, { seed: s, tune: process.env.TUNE ? process.env.TUNE.split(",").map(Number) : undefined });
  while (!b.over && b.t < 3600) b.step(1 / 30);
  if (!b.over) { stuck++; continue; }
  wins[b.winner]++; time += b.t;
  b.units.forEach(u => { const k = tot[u.def.key] = tot[u.def.key] || [0, 0]; k[0] += u.kills; k[1] += u.deaths; });
  if (b.units.some(u => !isFinite(u.x) || !isFinite(u.hp))) throw new Error('NaN in battle ' + s);
}
console.log(`Modern ${wins[0]}  Sci-fi ${wins[1]}  unfinished ${stuck}  mean length ${(time / (N - stuck)).toFixed(0)} s`);
Object.entries(tot).forEach(([k, v]) => console.log(k.padEnd(16), 'K', (v[0] / N).toFixed(1).padStart(5), ' D', (v[1] / N).toFixed(1).padStart(5)));
