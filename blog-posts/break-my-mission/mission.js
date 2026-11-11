/* Break My Mission (replanned page for "A Mission Is a List of Conditions"; Scripture: Boundaries, Missions and Side
   Quests, Mental Playtesting, Progression Exploits). The learner writes a delivery mission by choosing, for each of
   four freedoms the open world gives the player, no rule, a wall, a fail state or a recovery. Seven scripted
   playtesters with fixed habits then run it. Each outcome follows from the chosen rules by the logic in resolve();
   nothing is rolled. The rule costs and the budget are this page's own. */
(function () {
  const C = TD.C, TAU = TD.TAU, FX = 24, FY = 56, FW = 640, FH = 410, BUDGET = 6, COST = [0, 1, 1, 2], KIND = ['No rule', 'Wall', 'Fail', 'Recover'];
  const HZ = [{ id: 'contact', n: 'The contact can be killed', o: ['Nothing is written for it.', 'The contact cannot be hurt.', 'The mission fails if the contact dies.', 'The package drops where the contact falls.'] },
    { id: 'area', n: 'The player can leave the district', o: ['Nothing is written for it.', 'An invisible wall rings the district.', 'Leaving the district fails the mission.', 'Leave and the mission waits for you.'] },
    { id: 'wanted', n: 'The player can get the police on them', o: ['Nothing is written for it.', 'Police are switched off for the mission.', 'Arriving wanted fails the mission.', 'The buyer waits until the police are gone.'] },
    { id: 'car', n: 'The player can lose the mission car', o: ['Nothing is written for it.', 'The player cannot get out of the car.', 'The mission fails if the car is destroyed.', 'Any vehicle will do: the package rides with you.'] }];
  const BOTS = [{ n: 'By the book', h: 'does what the mission says' }, { n: 'Trigger-happy', h: 'shoots the contact on sight' }, { n: 'Shortcut', h: 'cuts across outside the district' }, { n: 'Sticky fingers', h: 'robs a shop on the way' }, { n: 'Wrecker', h: 'blows up the car, takes a bike' }, { n: 'Rammer', h: 'hits the contact with the car' }, { n: 'Pilot', h: 'parks the car and steals a helicopter' }];
  function resolve(b, ch) { const [ct, ar, wa, ca] = ch, R = (route, result, why, blocked) => ({ route, result, why, blocked: !!blocked });
    const outside = ar === 0 ? R(null, 'broken', 'crossed unbuilt world and reached the buyer from behind a wall: the hand-over never fires') : null;
    if (b === 0) return R('SCB', 'done', 'picked up, drove, delivered');
    if (b === 1) return ct === 0 ? R('SC', 'broken', 'the contact is dead and no package exists: the mission can never end') : ct === 1 ? R('SCB', 'done', 'the bullets did nothing, so he played it straight', true) : ct === 2 ? R('SC', 'fail', 'mission failed: the contact died') : R('SCB', 'done', 'took the package off the body and delivered it');
    if (b === 2) return ar === 0 ? { ...outside, route: 'SCOB' } : ar === 1 ? R('SCB', 'done', 'bounced off the wall and took the road', true) : ar === 2 ? R('SCO', 'fail', 'mission failed: left the district') : R('SCOB', 'done', 'the mission waited while he was outside');
    if (b === 3) { if (wa === 0) return R('SCHB', 'broken', 'police shot the buyer during the hand-over and the mission hung'); if (wa === 1) return R('SCHB', 'done', 'no police came, so the robbery changed nothing', true); if (wa === 2) return R('SCHB', 'fail', 'mission failed: arrived wanted');
      return ar === 0 ? R('SCHOB', 'broken', 'lost the police outside the map and came back through a wall') : ar === 1 ? R('SCHB', 'done', 'hid in an alley until the stars faded', true) : ar === 2 ? R('SCHO', 'fail', 'left to lose the police: your wait rule sent him into your fail rule') : R('SCHOB', 'done', 'lost the police outside, came back, delivered'); }
    if (b === 4) return ca === 0 ? R('SCH', 'broken', 'the package burned with the car and the buyer waits forever') : ca === 1 ? R('SCB', 'done', 'could not get out to plant the bomb', true) : ca === 2 ? R('SCH', 'fail', 'mission failed: the car was destroyed') : R('SCHB', 'done', 'the package came along on the bike');
    if (b === 5) { if (ct === 0) return R('SC', 'broken', 'the contact is dead and no package exists'); if (ct === 2) return R('SC', 'fail', 'mission failed: the contact died'); if (ct === 3) return R('SCB', 'done', 'the package dropped on the road; he took it');
      return ar === 0 ? R('SCO', 'broken', 'an unkillable contact was shoved off the map: nobody can reach him') : ar === 1 ? R('SCB', 'done', 'the contact ended up pinned to the wall, still in reach', true) : ar === 2 ? R('SCO', 'fail', 'left the district chasing the contact he had shoved out of it') : R('SCOB', 'done', 'followed the shoved contact outside and came back'); }
    return ca === 0 ? R('SCHB', 'broken', 'arrived by air; the package is in a parked car and nothing says so') : ca === 1 ? R('SCB', 'done', 'could not leave the car, so he drove', true) : ca === 2 ? R('SCHB', 'broken', 'the car was left, not destroyed: your fail rule never fires') : R('SCHB', 'done', 'the package flew with him'); }
  const tally = ch => { const r = BOTS.map((b, i) => resolve(i, ch)); return { r, broken: r.filter(x => x.result === 'broken').length, fail: r.filter(x => x.result === 'fail').length, blocked: r.filter(x => x.blocked).length, cost: ch.reduce((a, v) => a + COST[v], 0), walls: ch.filter(v => v === 1).length }; };
  const ALL = []; for (let k = 0; k < 256; k++) { const ch = [k & 3, k >> 2 & 3, k >> 4 & 3, k >> 6 & 3], t = tally(ch); if (t.cost <= BUDGET) ALL.push(t); }
  const sealed = ALL.filter(t => !t.broken), noRestart = sealed.filter(t => !t.fail), minWalls = Math.min(...noRestart.map(t => t.walls)), freeSealed = sealed.filter(t => !t.walls), minFailFree = Math.min(...freeSealed.map(t => t.fail));
  const MY = FY + 222, PT = { S: [FX + 60, MY + 100], C: [FX + 170, MY + 100], H: [FX + 330, MY + 150], O: [FX + 330, MY + 14], B: [FX + 560, MY + 100] };
  let API = null;
  PLAY.game('mission', {
    dur: 50, keys: [],
    setup(s, api) { API = api; },
    init(o, live) { return { live, t: 0, ch: [0, 0, 0, 0], run: null, res: null, pass: 0 }; },
    step(st, inp, dt) {
      st.t += dt; const c = inp.click; if (inp.setCh) { st.ch = inp.setCh; st.res = null; }
      if (typeof c === 'number' && !st.run) { st.ch[Math.floor(c / 4)] = c % 4; st.res = null; }
      if (c === 'go' && !st.run && tally(st.ch).cost <= BUDGET) { st.run = { i: 0, t: 0, T: tally(st.ch) }; st.res = []; }
      const r = st.run; if (!r) return; r.t += dt; if (r.t > 2.5) { st.res.push(r.T.r[r.i]); if (st.live) PLAY.beep(r.T.r[r.i].result === 'done' ? 760 : 220, .1, .08, r.T.r[r.i].result === 'done' ? 'sine' : 'sawtooth'); r.i++; r.t = 0; if (r.i >= BOTS.length) { st.run = null; st.at = st.t; } }
    },
    // the scripted designer first answers every hole with a fail state, then swaps two of them for recoveries
    bot(st) { const out = { down: {}, press: {} }; if (st.run) return out; st.bt = (st.bt || 0) + PLAY.DT;
      if (!st.res || st.res.length < 7) { if (st.bt > 1 && st.bt < 1.05) out.setCh = st.pass === 0 ? [2, 2, 2, 2] : [3, 2, 2, 3]; if (st.bt > 2.8) { out.click = 'go'; st.bt = 0; } }
      else if (st.pass === 0 && st.t - st.at > 3) { st.pass = 1; st.bt = 0; st.first = tally(st.ch); st.res = null; } return out; },
    draw(g, st, ui, live) {
      GK.panel(g); const T = tally(st.ch), over = T.cost > BUDGET, done = st.res && st.res.length === 7 && !st.run;
      GK.head(g, 'Deliver the package: what does your mission say about…', FX, 32, 'left', C.ink, 16);
      HZ.forEach((h, i) => { const y = FY + i * 52; GK.text(g, h.n, FX, y + 14, C.ink, 12.5, 'left', 800); GK.text(g, h.o[st.ch[i]], FX, y + 31, st.ch[i] ? C.navy : C.redDk, 11, 'left', 600);
        KIND.forEach((k, v) => ui.btn(i * 4 + v, v ? `${k} · ${COST[v]}` : k, FX + 290 + v * 88, y + 4, 84, 30, { px: 11, on: st.ch[i] === v })); });
      GK.box(g, FX, MY, FW, 188, '#d8d2c0', '#b9ad92', 10, 1.5); GK.box(g, FX + 24, MY + 30, FW - 48, 150, '#e9e2cd', st.ch[1] === 1 ? C.navy : '#8a7f66', 8, st.ch[1] === 1 ? 4 : 1.5); GK.text(g, 'outside the district', FX + 34, MY + 20, '#6b644f', 10, 'left', 700); GK.text(g, 'the district', FX + 34, MY + 46, '#6b644f', 10, 'left', 700);
      g.strokeStyle = '#b5ab92'; g.lineWidth = 14; g.lineCap = 'round'; g.beginPath(); g.moveTo(...PT.S); g.lineTo(...PT.B); g.stroke(); g.lineCap = 'butt';
      [['C', 'contact', '#8e5bd0'], ['B', 'buyer', '#2fae63'], ['H', 'shop', '#b07a00']].forEach(([k, n, col]) => { const [x, y] = PT[k]; g.fillStyle = col; g.beginPath(); g.arc(x, y, 11, 0, TAU); g.fill(); GK.text(g, n, x, y + 26, C.ink, 10.5, 'center', 700); });
      if (st.run) { const r = st.run, res = r.T.r[r.i], pts = [...res.route].map(k => PT[k]), u = Math.min(1, r.t / 1.7) * (pts.length - 1), k = Math.min(pts.length - 2, Math.floor(u)), f = u - k, x = pts[k][0] + (pts[k + 1][0] - pts[k][0]) * f, y = pts[k][1] + (pts[k + 1][1] - pts[k][1]) * f;
        g.strokeStyle = 'rgba(30,40,90,.5)'; g.lineWidth = 3; g.setLineDash([6, 5]); g.beginPath(); pts.forEach((p, j) => j ? g.lineTo(...p) : g.moveTo(...p)); g.stroke(); g.setLineDash([]); TD.player(x, y - 10, 0, .7); TD.label(BOTS[r.i].n, x, y - 34, 'center', '#fff', 11, 'rgba(30,40,90,.95)');
        if (r.t > 1.7) TD.stamp(res.result === 'done' ? 'Delivered' : res.result === 'fail' ? 'Mission failed' : 'Broken', FX + FW / 2, MY + 76, res.result === 'done' ? C.good : res.result === 'fail' ? '#b07a00' : C.redDk, 1, 22); }
      GK.text(g, `Rules cost ${T.cost} of ${BUDGET} points`, FX, FY + FH + 26, over ? C.redDk : C.ink, 12.5, 'left', 800); GK.text(g, 'A wall or a fail state costs 1 to build. A recovery costs 2.', FX + 190, FY + FH + 26, C.muted, 11, 'left', 500);
      const RX = 690, RW = 326; if (!st.run) { if (over) GK.text(g, 'over budget', RX + RW, 32, C.redDk, 13, 'right', 800); else ui.btn('go', 'Send in seven playtesters', RX + 110, 10, RW - 110, 30, { px: 12, on: true }); } GK.text(g, 'playtesters', RX, 32, C.muted, 12, 'left', 700);
      BOTS.forEach((b, i) => { const y = 46 + i * 68, r = st.res && st.res[i], cur = st.run && st.run.i === i, col = !r ? C.muted : r.result === 'done' ? C.good : r.result === 'fail' ? '#b07a00' : C.redDk; GK.box(g, RX, y, RW, 62, cur ? '#fff6dd' : '#fffaf0', cur ? C.navy : r ? col : '#cdbf9f', 9, cur || r ? 2 : 1.5);
        GK.text(g, b.n, RX + 10, y + 18, C.ink, 12.5, 'left', 800); GK.text(g, b.h, RX + 118, y + 18, C.muted, 10.5, 'left', 600); if (!r) return; GK.text(g, (r.result === 'done' ? 'DELIVERED' : r.result === 'fail' ? 'RESTART' : 'BROKEN') + (r.blocked ? ' · hit a wall' : ''), RX + 10, y + 35, col, 10.5, 'left', 800); GK.wrap(g, r.why, RX + 10, y + 49, RW - 20, 11, C.ink, 9.8, 500); });
      const shown = done ? T : null;
      ui.stats(`<div class="r"><b>${shown ? shown.broken : '?'}</b><span>runs that broke the mission</span></div><div><b>${shown ? shown.fail : '?'}</b><span>runs sent back to restart</span></div><div class="g"><b>${shown ? shown.blocked : '?'}</b><span>runs that hit one of your walls</span></div>`);
      const who = live ? 'Your' : 'The script’s';
      if (!done) { ui.out(st.run ? 'Each playtester has one habit. What happens to it follows from your rules alone.' : live ? `Pick a rule for each freedom, or leave it unwritten. You have ${BUDGET} points.` : 'A scripted designer answers every hole with a fail state, then swaps two for recoveries.'); return; }
      const two = T.r.filter(x => x.why.includes('your')).length;
      ui.out(`${who} mission: ${T.broken} broken, ${T.fail} restarts, ${T.blocked} walled, with ${T.walls} freedom${T.walls === 1 ? '' : 's'} removed outright. ` + (T.broken ? 'A broken run is a mission that can no longer end, and the player cannot tell. ' : '') + (two ? `${two} outcome${two === 1 ? '' : 's'} came from two of your own rules meeting. ` : '') + `Within ${BUDGET} points the page finds ${sealed.length} rule sets with nothing broken. With no restarts as well, every one needs at least ${minWalls} wall${minWalls === 1 ? '' : 's'}; with no walls, the fewest restarts is ${minFailFree}. You pay in freedoms, in restarts or in build cost.` + (st.first ? ` The all-fail version had ${st.first.broken} broken and ${st.first.fail} restarts.` : ''));
    },
  });
  window.MISSION = { sealed: sealed.length, noRestart: noRestart.length, minWalls, minFailFree, all: ALL.length };
})();
