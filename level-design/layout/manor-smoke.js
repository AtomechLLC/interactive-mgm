// Smoke test for shared/manorgen.js. Run: node level-design/layout/manor-smoke.js [count]
// 1. Draws `count` plans with no retries and reports how often each rule holds on a first draft.
// 2. Breaks one rule at a time on purpose and confirms the matching check, and only that one, catches it.
const M = require('../shared/manorgen.js');
const N = +process.argv[2] || 500, tally = {}, labels = {}; let clean = 0, crashed = 0;
for (let s = 1; s <= N; s++) {
  let res; try { res = M.check(M.generate(s)); } catch (e) { crashed++; console.log('seed', s, 'crashed:', e.message); continue; }
  res.forEach(r => { labels[r.id] = r.label; tally[r.id] = tally[r.id] || { fail: 0, eg: '' }; if (!r.pass) { tally[r.id].fail++; tally[r.id].eg ||= `seed ${s}: ${r.detail}`; } });
  if (res.every(r => r.pass)) clean++;
}
console.log(`\nFirst drafts: ${clean} of ${N} pass every rule (${(clean / N * 100).toFixed(1)}%), ${crashed} crashed\n`);
Object.keys(tally).forEach(id => console.log(`  ${tally[id].fail ? '✗' : '✓'} ${labels[id].padEnd(46)} ${String(N - tally[id].fail).padStart(4)}/${N}${tally[id].eg ? '   e.g. ' + tally[id].eg : ''}`));
let retries = 0, stuck = 0;
for (let s = 1; s <= N; s++) { const g = M.generatePassing(s); retries += g.rejected.length; if (!g.checks.every(r => r.pass)) stuck++; }
console.log(`\nWith redraws: ${N - stuck} of ${N} seeds reach a passing plan, ${(retries / N).toFixed(2)} rejected drafts per plan on average\n`);
const expect = { turns: ['turns'], weight: ['weights', 'anchor', 'gradient'], stairs: ['seams'], doors: ['facing'] };
const alsoMoves = { turns: ['sizes'] };   // changing a turn reshapes the rooms, so sizes may shift too
let ok = true; console.log('Broken on purpose (50 seeds each):');
Object.keys(M.BREAKS).forEach(b => {
  const caught = {}; let missed = 0;
  for (let s = 1; s <= 50; s++) { const base = new Set(M.check(M.generate(s)).filter(r => !r.pass).map(r => r.id)); const f = M.check(M.generate(s, { breakRule: b })).filter(r => !r.pass && !base.has(r.id)).map(r => r.id); if (!expect[b].every(id => f.includes(id) || base.has(id))) missed++; f.forEach(id => caught[id] = (caught[id] || 0) + 1); }
  const extra = Object.keys(caught).filter(id => !expect[b].includes(id) && !(alsoMoves[b] || []).includes(id)); if (missed || extra.length) ok = false;
  console.log(`  ${missed || extra.length ? '✗' : '✓'} ${M.BREAKS[b].padEnd(18)} newly failing: ${Object.entries(caught).map(([k, v]) => `${k} ×${v}`).join(', ') || 'nothing'}${missed ? `   MISSED on ${missed} seeds` : ''}${extra.length ? `   UNEXPECTED: ${extra.join(', ')}` : ''}`);
});
process.exit(ok && !crashed && !stuck ? 0 : 1);
