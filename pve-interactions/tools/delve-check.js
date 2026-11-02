// Balance check for pve-interactions/delve: every pull, both classes, the board's solution against "just DPS".
// node pve-interactions/tools/delve-check.js [pullId]
const D = require('../delve/data.js');
const S = require('../delve/sim.js');
const only = process.argv[2];
const rows = [];
const fights = D.PULLS.map(p => ({ id: p.id, spec: { kinds: p.m }, plan: p.plan }));
fights.push({ id: 'boss', spec: { kinds: [], boss: true, barrels: [[180, 120], [180, 584], [760, 120], [760, 584]] }, plan: D.BOSS.plan });
fights.push({ id: 'barrel', spec: { kinds: [], barrels: [[560, 352]] }, plan: { order: ['slime', 'barrel'], int: [] } });
for (const f of fights) {
  if (only && f.id !== only) continue;
  for (const role of ['melee', 'ranged']) {
    const r = {};
    for (const mode of ['solution', 'dps']) {
      let hp = 0, t = 0, wins = 0, tk = 0; const N = 4;
      for (let seed = 1; seed <= N; seed++) {
        const s = S.runBot(f.spec, f.plan, mode, role, seed);
        if (s.over === 'win') wins++;
        hp += s.hero.hp / s.hero.max; t += s.t; tk += s.stats.taken / s.hero.max;
        if (only && seed === 1) console.log(mode, role, s.over, Math.round(s.t), Math.round(s.hero.hp), JSON.stringify(Object.fromEntries(Object.entries(s.stats.by).map(([k, v]) => [k, Math.round(v)]))), 'ints', s.stats.ints, 'disp', s.stats.dispels, 'stun', s.stats.stuns, JSON.stringify(s.stats.missed));
      }
      r[mode] = `${wins}/${N} took ${Math.round(tk / N * 100)}% ${Math.round(t / N)}s`;
    }
    rows.push(`${f.id.padEnd(6)} ${role.padEnd(6)}  solution ${r.solution.padEnd(16)} dps ${r.dps}`);
  }
}
console.log(rows.join('\n'));
