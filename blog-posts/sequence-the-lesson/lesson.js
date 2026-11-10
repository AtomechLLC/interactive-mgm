/* Sequence the Lesson (replanned page for "Author the Puzzle Backward"; Scripture: Learn Through Play and Layered
   Introduction, Lessons and Skill Checks, Tutorialization). Eight ready-made push-block levels, each tagged with the
   ideas it needs. The learner builds a course that ends in the final level; the page flags any level that asks for two
   ideas the course has not shown yet. Then the learner plays the course and the page sets their own time and resets
   on each level beside the flags. Every level is checked solvable at load by a breadth-first search. */
(function () {
  const C = TD.C, TAU = TD.TAU, FX = 24, FY = 56, FW = 640, FH = 410, GW = 7, GH = 5;
  const IDEAS = { P: 'push', A: 'walk around', H: 'fill a hole', O: 'order' };
  const LV = [
    { tags: 'P', rows: ['.......', '.......', '.@.$.*.', '.......', '.......'] },
    { tags: 'PA', rows: ['.......', '.......', '*.@$...', '.......', '.......'] },
    { tags: 'PH', rows: ['...#...', '...#...', '@$.o$*.', '...#...', '...#...'] },
    { tags: 'PAH', rows: ['...#...', '.$.#...', '...o$*.', '..@#...', '...#...'] },
    { tags: 'PAO', rows: ['.......', '....###', '@$.$.**', '....###', '.......'] },
    { tags: 'PAO', rows: ['..#*#..', '..#*#..', '.......', '.$...$.', '...@...'] },
    { tags: 'PAH', rows: ['...#...', '.$.#...', '@..oo$*', '.$.#...', '...#...'] },
    { tags: 'PAHO', rows: ['...#...', '.$.#.$.', '@..o...', '.$.##*#', '...##*#'], final: true }];
  function load(k) { const S = { k, wall: [], hole: [], tgt: [], crates: [], moves: 0 }; LV[k].rows.forEach((row, y) => [...row].forEach((ch, x) => { const i = y * GW + x; S.wall[i] = ch === '#'; S.hole[i] = ch === 'o'; S.tgt[i] = ch === '*'; if (ch === '$') S.crates.push(i); if (ch === '@') S.p = i; })); return S; }
  function move(S, dx, dy) { const x = S.p % GW, y = Math.floor(S.p / GW), nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) return false; const n = ny * GW + nx; if (S.wall[n] || S.hole[n]) return false;
    const ci = S.crates.indexOf(n); if (ci >= 0) { const bx = nx + dx, by = ny + dy; if (bx < 0 || by < 0 || bx >= GW || by >= GH) return false; const b = by * GW + bx; if (S.wall[b] || S.crates.includes(b)) return false; if (S.hole[b]) { S.hole[b] = false; S.crates.splice(ci, 1); S.filled = b; } else S.crates[ci] = b; }
    S.p = n; S.moves++; return true; }
  const won = S => S.tgt.every((t, i) => !t || S.crates.includes(i));
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  function solve(k) { const S0 = load(k), key = S => S.p + '|' + S.crates.slice().sort((a, b) => a - b).join(',') + '|' + S.hole.map((h, i) => h ? i : '').join(''), seen = new Set([key(S0)]), q = [[S0, []]];
    while (q.length) { const [S, path] = q.shift(); if (won(S)) return path; for (let d = 0; d < 4; d++) { const T = { ...S, hole: S.hole.slice(), crates: S.crates.slice() }; if (!move(T, DIRS[d][0], DIRS[d][1])) continue; const kk = key(T); if (seen.has(kk)) continue; seen.add(kk); q.push([T, path.concat(d)]); } } return null; }
  const SOL = LV.map((l, k) => solve(k)); window.SEQ = { SOL: SOL.map(s => s ? s.length : null) };
  function flags(course) { const seen = new Set(); return course.map(k => { const nw = [...LV[k].tags].filter(t => !seen.has(t)); nw.forEach(t => seen.add(t)); return nw; }); }
  const full = st => st.pick.concat(7);
  let API = null; const played = new Set();
  function drawLevel(g, S, x0, y0, cs, t) { for (let i = 0; i < GW * GH; i++) { const x = x0 + (i % GW) * cs, y = y0 + Math.floor(i / GW) * cs; g.fillStyle = S.wall[i] ? '#5d574b' : '#e9dfc6'; g.fillRect(x, y, cs, cs); if (!S.wall[i]) { g.strokeStyle = 'rgba(0,0,0,.07)'; g.lineWidth = 1; g.strokeRect(x + .5, y + .5, cs - 1, cs - 1); }
      if (S.hole[i]) { g.fillStyle = '#2b2118'; g.beginPath(); g.roundRect(x + cs * .12, y + cs * .12, cs * .76, cs * .76, cs * .15); g.fill(); }
      if (S.tgt[i]) { g.strokeStyle = '#e2b93b'; g.lineWidth = Math.max(2, cs * .08); g.strokeRect(x + cs * .2, y + cs * .2, cs * .6, cs * .6); } }
    S.crates.forEach(i => { const x = x0 + (i % GW) * cs, y = y0 + Math.floor(i / GW) * cs; g.fillStyle = S.tgt[i] ? '#2fae63' : '#b0763c'; g.beginPath(); g.roundRect(x + cs * .14, y + cs * .14, cs * .72, cs * .72, cs * .1); g.fill(); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = Math.max(1, cs * .05); g.stroke(); });
    const px = x0 + (S.p % GW) * cs + cs / 2, py = y0 + Math.floor(S.p / GW) * cs + cs / 2; if (cs > 30) TD.player(px, py, 0, cs / 64); else { g.fillStyle = '#2b6fd6'; g.beginPath(); g.arc(px, py, cs * .32, 0, TAU); g.fill(); } }
  function startLevel(st) { st.S = load(st.course[st.i]); st.lt = 0; st.resets = 0; st.bi = 0; st.bt = 0; }
  PLAY.game('lesson', {
    dur: 30, keys: ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'w', 'a', 's', 'd', 'r'],
    setup(s, api) { API = api; },
    init(o, live) { return { live, t: 0, ph: 'build', pick: live ? [] : [], log: [], course: [], i: 0 }; },
    step(st, inp, dt) {
      st.t += dt; const c = inp.click, pr = inp.press || {};
      if (st.ph === 'build') { if (inp.setPick) st.pick = inp.setPick; if (typeof c === 'number' && c < 7) { const k = st.pick.indexOf(c); if (k >= 0) st.pick.splice(k, 1); else st.pick.push(c); } if (c === 'clear') st.pick = []; if (c === 'go') { st.course = full(st); st.fl = flags(st.course); st.i = 0; st.log = []; st.ph = 'play'; startLevel(st); } return; }
      if (st.ph === 'done') { if (st.live && c === 'again') API.start(); return; }
      if (st.ph === 'won') { if (st.t - st.at > .9) { st.i++; if (st.i >= st.course.length) st.ph = 'done'; else { st.ph = 'play'; startLevel(st); } } return; }
      st.lt += dt; const S = st.S; let d = -1;
      if (pr.ArrowRight || pr.d) d = 0; if (pr.ArrowLeft || pr.a) d = 1; if (pr.ArrowDown || pr.s) d = 2; if (pr.ArrowUp || pr.w) d = 3; if (inp.dir != null) d = inp.dir;
      if (d >= 0) move(S, DIRS[d][0], DIRS[d][1]);
      if (pr.r || c === 'reset') { const k = st.course[st.i]; st.S = load(k); st.resets++; }
      const skip = c === 'skip';
      if (won(st.S) || skip) { const k = st.course[st.i]; st.log.push({ k, time: st.lt, resets: st.resets, nw: st.fl[st.i], skipped: skip, again: played.has(k) }); if (st.live && !skip) { played.add(k); PLAY.beep(880, .15, .12); } st.ph = 'won'; st.at = st.t; }
    },
    // the scripted player builds the shortest course and plays each level from a solved move list, so it never stalls
    bot(st) { const out = { down: {}, press: {} }; if (st.ph === 'build') { if (st.t > 1 && st.t < 1.1) out.setPick = [0, 1, 2, 4]; if (st.t > 3.2 && st.t < 3.3) out.setPick = [0]; if (st.t > 6) out.click = 'go'; return out; }
      if (st.ph !== 'play') return out; st.bt += PLAY.DT; if (st.bt > .22) { st.bt = 0; const sol = SOL[st.course[st.i]]; if (st.bi < sol.length) out.dir = sol[st.bi++]; } return out; },
    draw(g, st, ui, live) {
      GK.panel(g); const RX = 690, RW = 326, course = st.ph === 'build' ? full(st) : st.course, fl = flags(course), nflag = fl.filter(f => f.length >= 2).length;
      if (st.ph === 'build') {
        GK.head(g, 'Build a course: click levels in the order you want them', FX, 32, 'left', C.ink, 16);
        LV.forEach((l, k) => { const x = FX + (k % 4) * 160, y = FY + Math.floor(k / 4) * 126, at = st.pick.indexOf(k), on = at >= 0 || l.final; GK.box(g, x, y, 152, 118, on ? '#eef2ff' : '#fffaf0', on ? C.navy : '#cdbf9f', 10, on ? 2.5 : 1.5); if (!l.final) ui.hit(k, x, y, 152, 118);
          drawLevel(g, load(k), x + 27, y + 8, 14, 0); GK.text(g, l.final ? 'Final · always last' : `Level ${String.fromCharCode(65 + k)}`, x + 10, y + 96, C.ink, 11.5, 'left', 800); GK.text(g, [...l.tags].map(t => IDEAS[t].split(' ').pop()).join(', '), x + 10, y + 110, C.muted, 9.5, 'left', 600);
          if (on) { g.fillStyle = C.navy; g.beginPath(); g.arc(x + 136, y + 16, 11, 0, TAU); g.fill(); GK.text(g, String(l.final ? course.length : at + 1), x + 136, y + 20.5, '#fff', 12, 'center', 800); } });
        const y = FY + 262; GK.text(g, 'your course', FX, y + 4, C.muted, 12, 'left', 700);
        course.forEach((k, j) => { const x = FX + j * 79, f = fl[j], bad = f.length >= 2; GK.box(g, x, y + 12, 73, 62, bad ? '#fde9e7' : '#eaf6e6', bad ? C.redDk : C.good, 8, 2); GK.text(g, LV[k].final ? 'Final' : String.fromCharCode(65 + k), x + 36, y + 34, C.ink, 14, 'center', 800); GK.text(g, f.length ? `${f.length} new` : 'practice', x + 36, y + 50, bad ? C.redDk : C.good, 11, 'center', 800); GK.text(g, f.map(t => IDEAS[t].split(' ').pop()).join('+'), x + 36, y + 64, C.muted, 8.5, 'center', 600); });
        ui.btn('go', 'Play this course', FX + FW - 190, y + 92, 190, 40, { px: 14, on: true }); ui.btn('clear', 'Clear', FX, y + 92, 90, 40, { px: 13 });
        GK.text(g, `${course.length} level${course.length === 1 ? '' : 's'} · ${nflag} flagged for two or more new ideas at once`, FX + 104, y + 117, nflag ? C.redDk : C.good, 12, 'left', 800);
      } else {
        const k = course[Math.min(st.i, course.length - 1)], S = st.S, cs = 64, x0 = FX + (FW - GW * cs) / 2, y0 = FY + 8;
        GK.head(g, st.ph === 'done' ? 'Course finished' : `Level ${st.i + 1} of ${course.length} · ${LV[k].final ? 'Final' : String.fromCharCode(65 + k)}`, FX, 32, 'left', C.ink, 17); GK.text(g, `${st.lt.toFixed(0)} s · ${st.resets} reset${st.resets === 1 ? '' : 's'}`, FX + FW, 32, C.ink, 14, 'right', 800);
        drawLevel(g, S, x0, y0, cs, st.t); if (st.ph === 'won') TD.stamp(st.log[st.log.length - 1].skipped ? 'Skipped' : 'Solved', FX + FW / 2, y0 + 150, st.log[st.log.length - 1].skipped ? C.redDk : C.good, 1, 26);
        if (st.ph === 'play') { ui.btn('reset', 'Reset (R)', FX, y0 + 334, 120, 36, { px: 13 }); if (st.lt > 40) ui.btn('skip', 'Skip this level', FX + 132, y0 + 334, 150, 36, { px: 13 }); }
        if (st.ph === 'done' && live) ui.btn('again', 'Build another course', FX + FW - 210, y0 + 334, 210, 36, { px: 13, on: true });
        GK.text(g, 'Arrow keys or WASD: move and push. Cover every gold square with a crate. Nothing else is explained.', FX, FY + FH + 26, C.muted, 11, 'left', 500);
      }
      GK.text(g, st.ph === 'build' ? 'what the flags mean' : 'your time on each level, beside its flag', RX, 32, C.muted, 12, 'left', 700);
      if (st.ph === 'build') { GK.box(g, RX, 44, RW, 250, '#fffaf0', '#cdbf9f', 10, 1.5); let y = 66; y = GK.wrap(g, 'Each level needs the ideas listed on it. A level is flagged when two or more of them have not appeared earlier in your course.', RX + 14, y, RW - 28, 16, C.ink, 12, 600) + 10;
        Object.entries(IDEAS).forEach(([t, n], i) => { GK.text(g, n, RX + 14, y + i * 22, C.navy, 13, 'left', 800); GK.text(g, ['a crate moves when you walk into it', 'you must reach the far side of a crate', 'a crate dropped in a pit becomes floor', 'the first crate must go to the far end'][i], RX + 110, y + i * 22, C.muted, 10.5, 'left', 600); });
        GK.wrap(g, 'These lines are for you as the designer. The levels themselves explain nothing.', RX + 14, y + 100, RW - 28, 15, C.muted, 11, 500); }
      else course.forEach((k, j) => { const y = 44 + j * 50, L = st.log[j], f = st.fl[j], bad = f.length >= 2, cur = j === st.i && st.ph !== 'done'; GK.box(g, RX, y, RW, 44, cur ? '#fff6dd' : '#fffaf0', cur ? C.navy : '#cdbf9f', 8, cur ? 2.5 : 1.5); GK.text(g, LV[k].final ? 'Final' : String.fromCharCode(65 + k), RX + 12, y + 27, C.ink, 14, 'left', 800);
        GK.text(g, bad ? `flag: ${f.length} new` : f.length ? '1 new' : 'practice', RX + 64, y + 27, bad ? C.redDk : C.good, 12, 'left', 800); if (L) { PLAY.bar(g, RX + 140, y + 15, 60, 12, L.time / 60, bad ? C.red : C.navy); GK.text(g, `${L.skipped ? 'skipped' : L.time.toFixed(0) + ' s'} · ${L.resets} reset${L.resets === 1 ? '' : 's'}${L.again ? ' · seen' : ''}`, RX + RW - 10, y + 27, C.ink, 11, 'right', 700); } });
      const fb = st.log.filter(L => L.nw.length >= 2), ok = st.log.filter(L => L.nw.length < 2), mean = a => a.reduce((s, L) => s + L.time, 0) / a.length, tot = st.log.reduce((s, L) => s + L.time, 0);
      ui.stats(`<div><b>${course.length}</b><span>levels in the course</span></div><div class="r"><b>${nflag}</b><span>flagged: two or more new ideas</span></div><div class="g"><b>${st.log.length ? tot.toFixed(0) + ' s' : 'not played'}</b><span>${live ? 'your' : 'script'} time so far</span></div>`);
      if (st.ph === 'build') { ui.out(live ? (nflag ? `This course has ${nflag} flagged level${nflag === 1 ? '' : 's'}. Add a level before it that carries one of its new ideas, or play it as it is and see.` : `No flags, at a cost of ${course.length} levels.`) : 'A scripted designer tries a five-level course with no flags, then cuts it to two levels and takes the flag.'); return; }
      if (st.ph !== 'done') { ui.out(live ? 'Your seconds and resets on each level are being recorded beside its flag.' : 'The script plays from a solved move list, so it never stalls. Only your own play can test a flag.'); return; }
      if (!live) { ui.out(`The script finished ${course.length} levels in ${tot.toFixed(0)} s with ${nflag} flag${nflag === 1 ? '' : 's'}. It knows every solution, so its time shows the length of the course and nothing about learning. Play your own course to test the flags.`); return; }
      const seenN = st.log.filter(L => L.again).length, tail = seenN ? ` ${seenN} of these levels you had solved before, which blunts the test.` : '';
      if (!fb.length) ui.out(`No flagged levels: ${course.length} levels took you ${tot.toFixed(0)} s, a mean of ${mean(st.log).toFixed(0)} s each. The smooth course costs length. Build a shorter one and compare your time on its flagged level.` + tail);
      else if (!ok.length) ui.out(`Every level was flagged, and they took you a mean of ${mean(fb).toFixed(0)} s with ${fb.reduce((s, L) => s + L.resets, 0)} resets. There is no unflagged level here to compare against.` + tail);
      else ui.out(`Flagged levels took you a mean of ${mean(fb).toFixed(0)} s and ${fb.reduce((s, L) => s + L.resets, 0)} resets. The others took ${mean(ok).toFixed(0)} s and ${ok.reduce((s, L) => s + L.resets, 0)} resets. ` + (mean(fb) > mean(ok) * 1.25 ? 'The stall landed where the course asked for two leaps at once.' : 'The flags did not predict your stall this time. Level size differs too, and a flag is a warning, not a measurement.') + tail);
    },
  });
})();
