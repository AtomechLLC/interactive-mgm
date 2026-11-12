// Smoke test for shared/manorgen.js. Run: node level-design/layout/manor-smoke.js [count]
// 1. Draws `count` plans with no retries and reports how often each rule holds on a first draft.
// 2. Redraws until every rule passes and counts the variety that comes out: recipes, arrangements, room graphs.
// 3. Asks for every combination of towers, wings and garden and confirms the generator delivers each one.
// 4. Breaks one rule at a time on purpose and confirms the matching check catches it.
const M = require('../shared/manorgen.js');
const N = +process.argv[2] || 500, tally = {}, labels = {}; let clean = 0, crashed = 0;
for (let s = 1; s <= N; s++) {
  let res; try { res = M.check(M.generate(s)); } catch (e) { crashed++; console.log('seed', s, 'crashed:', e.message); continue; }
  res.forEach(r => { labels[r.id] = r.label; tally[r.id] = tally[r.id] || { fail: 0, eg: '' }; if (!r.pass) { tally[r.id].fail++; tally[r.id].eg ||= `seed ${s}: ${r.detail}`; } });
  if (res.every(r => r.pass)) clean++;
}
console.log(`\nFirst drafts: ${clean} of ${N} pass every rule (${(clean / N * 100).toFixed(1)}%), ${crashed} crashed\n`);
Object.keys(tally).forEach(id => console.log(`  ${tally[id].fail ? '✗' : '✓'} ${labels[id].padEnd(46)} ${String(N - tally[id].fail).padStart(4)}/${N}${tally[id].eg ? '   e.g. ' + tally[id].eg : ''}`));

let retries = 0, stuck = 0; const recipes = new Set(), skels = new Set(), graphs = new Set(), count = {};
const bump = (k, v) => { count[k] = count[k] || {}; count[k][v] = (count[k][v] || 0) + 1; };
for (let s = 1; s <= N; s++) {
  const g = M.generatePassing(s), P = g.plan, b = P.brief; retries += g.rejected.length; if (!g.checks.every(r => r.pass)) stuck++;
  recipes.add(M.describe(b)); skels.add(P.skel); graphs.add(P.edges.map(e => e.slice().sort().join('-')).sort().join(';'));
  bump('hall', b.classic ? 'study plan' : b.hall); bump('towers', b.towers); bump('wings', b.wings); bump('garden', b.garden ? 'yes' : 'no'); if (!b.classic) b.shapes.forEach(x => bump('wing shapes', x));
}
console.log(`\nWith redraws: ${N - stuck} of ${N} seeds reach a passing plan, ${(retries / N).toFixed(2)} rejected drafts per plan on average`);
console.log(`\nVariety over ${N} passing plans (the old generator scored 1, 1 and 1):`);
console.log(`  ${String(recipes.size).padStart(4)} different recipes\n  ${String(skels.size).padStart(4)} different arrangements (hall, wing sides, hinges and shapes, number of curves)\n  ${String(graphs.size).padStart(4)} different room graphs (which room opens onto which)`);
Object.entries(count).forEach(([k, v]) => console.log(`  ${k.padEnd(12)} ${Object.entries(v).map(([a, n]) => `${a}: ${n}`).join(', ')}`));

let asked = 0, delivered = 0; const short = [];
for (let towers = 1; towers <= 4; towers++) for (let wings = 1; wings <= 3; wings++) for (let garden = 0; garden <= 1; garden++) for (let s = 1; s <= 10; s++) {
  const g = M.generatePassing(s * 31 + towers, { brief: { towers, wings, garden } }), b = g.plan.brief; asked++;
  if (g.checks.every(r => r.pass) && b.towers === towers && b.garden === garden && (b.wings === wings || b.hall === 'cross')) delivered++; else short.push(`${towers} towers, ${wings} wings, garden ${garden}, seed ${s * 31 + towers}`);
}
console.log(`\nRecipes to order: ${delivered} of ${asked} delivered (1 to 4 towers, 1 to 3 wings, with and without a garden)${short.length ? '\n  missed: ' + short.slice(0, 5).join('; ') : ''}`);

// a break is made on the draft that passed, so anything newly failing is the break's doing
const expect = { turns: ['turns'], weight: ['weights', 'anchor', 'gradient'], stairs: ['seams'], doors: ['facing'] };
const alsoMoves = { turns: ['sizes', 'overlap', 'facing', 'brief', 'loops', 'seams', 'grids'] };   // equal turns redraw the wings, so other things can shift too
let ok = true; console.log('\nBroken on purpose (50 seeds each):');
Object.keys(M.BREAKS).forEach(b => {
  const caught = {}; let missed = 0;
  for (let s = 1; s <= 50; s++) { const f = M.generatePassing(s, { breakRule: b }).checks.filter(r => !r.pass).map(r => r.id); if (!expect[b].every(id => f.includes(id))) missed++; f.forEach(id => caught[id] = (caught[id] || 0) + 1); }
  const extra = Object.keys(caught).filter(id => !expect[b].includes(id) && !(alsoMoves[b] || []).includes(id)); if (missed > 2 || extra.length) ok = false;
  console.log(`  ${missed > 2 || extra.length ? '✗' : '✓'} ${M.BREAKS[b].padEnd(18)} failing: ${Object.entries(caught).map(([k, v]) => `${k} ×${v}`).join(', ') || 'nothing'}${missed ? `   not caught on ${missed} seeds` : ''}${extra.length ? `   UNEXPECTED: ${extra.join(', ')}` : ''}`);
});
process.exit(ok && !crashed && !stuck && delivered >= asked * .97 ? 0 : 1);
