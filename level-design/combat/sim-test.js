// node sim-test.js [battles]: runs whole battles without a browser and prints how often each line of the ideal session (SCRIPT in sim.js)
// is met, where the deaths fall, who wins, how long it takes and who gets the kills. SWAP=1 swaps the spawns, SHUT=1 walls up the middle doorway.
globalThis.window = globalThis; globalThis.TD = { C: {} };
require('../shared/plan.js'); require('./map.js'); require('./sim.js');
const N = +process.argv[2] || 20, map = FPSMAP.build(), wins = [0, 0], tot = {}, met = {}, th = [0, 0, 0], ln = {}; let time = 0, stuck = 0, loser = 0;
for (let s = 1; s <= N; s++) {
  const b = FPSSIM.create(map, { seed: s, swap: !!process.env.SWAP, midShut: !!process.env.SHUT });
  while (!b.over && b.t < 3600) b.step(1 / 30);
  if (!b.over) { stuck++; continue; }
  wins[b.winner]++; time += b.t;
  const sc = b.script(); FPSSIM.SCRIPT.forEach(([k]) => { met[k] = met[k] || { n: 0, v: [] }; met[k].n += sc[k][1] ? 1 : 0; met[k].v.push(sc[k][0]); }); sc.thirds.forEach((v, i) => th[i] += v / N); b.deaths.forEach(k => { const l = map.laneOf[k.room]; ln[l] = (ln[l] || 0) + 1; }); loser += Math.min(...b.score);
  b.units.forEach(u => { const k = tot[u.def.key] = tot[u.def.key] || [0, 0]; k[0] += u.kills; k[1] += u.deaths; });
  if (b.units.some(u => !isFinite(u.x) || !isFinite(u.hp))) throw new Error('NaN in battle ' + s);
}
console.log('deaths west / middle / east:', th.map(v => Math.round(v * 100) + '%').join(' / '));
FPSSIM.SCRIPT.forEach(([k, name]) => console.log(`${name}: met in ${met[k].n} of ${N - stuck}   e.g. ${met[k].v.slice(0, 5).join(' | ')}`));
console.log('deaths by lane:', JSON.stringify(ln), ' mean losing score', (loser / N).toFixed(0));
console.log(`Modern ${wins[0]}  Sci-fi ${wins[1]}  unfinished ${stuck}  mean length ${(time / (N - stuck)).toFixed(0)} s`);
Object.entries(tot).forEach(([k, v]) => console.log(k.padEnd(16), 'K', (v[0] / N).toFixed(1).padStart(5), ' D', (v[1] / N).toFixed(1).padStart(5)));
