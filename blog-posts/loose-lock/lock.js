/* Loose Lock (replanned page for "One River, Many Answers"; Scripture: Subvert Functional Fixedness, Alternate Outcomes,
   Six Qualities of Deep Mechanics). The learner sets how many of six tools can open a gate, then plays three rooms
   built at that looseness, each with a random two-tool kit. In every room all six props are drawn, and only some are
   in a state a tool can use; the drawing shows which. The page counts the 15 possible kits exactly and records the
   learner's own tries and seconds. */
(function () {
  const C = TD.C, TAU = TD.TAU, FX = 24, FY = 56, FW = 640, FH = 410, CAP = 30, PEN = 3;
  const TOOLS = [{ n: 'Magnet', d: 'moves metal', p: 'crate' }, { n: 'Ice', d: 'freezes water', p: 'channel' }, { n: 'Stasis', d: 'stops a moving thing', p: 'platform' }, { n: 'Bomb', d: 'breaks cracked stone', p: 'wall' }, { n: 'Glider', d: 'rides rising air', p: 'tower' }, { n: 'Climb', d: 'scales vines', p: 'cliff' }];
  const KITS = []; for (let a = 0; a < 6; a++) for (let b = a + 1; b < 6; b++) KITS.push([a, b]);
  const comb2 = n => n * (n - 1) / 2, grid = N => [comb2(6 - N), N * (6 - N), comb2(N)];
  const saved = {}; let API = null;
  function room(st) { const R = st.R, ids = [0, 1, 2, 3, 4, 5]; for (let i = 5; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; } const liveSet = ids.slice(0, st.N);
    st.rm = { live: [0, 1, 2, 3, 4, 5].map(i => liveSet.includes(i)), kit: KITS[st.kits[st.i]], t: 0, pen: 0, tries: 0, sel: -1, msg: '', mt: -9, out: null }; st.rm.ans = st.rm.kit.filter(k => st.rm.live[k]).length; st.ph = 'room'; }
  function begin(st, N) { st.N = N; st.i = 0; st.log = []; const R = st.R, ks = [...KITS.keys()]; for (let i = 14; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [ks[i], ks[j]] = [ks[j], ks[i]]; } st.kits = ks.slice(0, 3); room(st); }
  function close(st, out) { const r = st.rm; r.out = out; st.log.push({ kit: r.kit, ans: r.ans, out, time: Math.min(CAP, r.t + r.pen), tries: r.tries }); st.ph = 'between'; st.at = st.t; if (st.live) PLAY.beep(out === 'through' ? 880 : 200, .2, .12, out === 'through' ? 'sine' : 'sawtooth'); }
  function prop(g, i, live, x, y, t) { g.save(); g.translate(x, y);
    if (i === 0) { g.fillStyle = live ? '#8d99ae' : '#a9713d'; g.fillRect(-28, -24, 56, 48); g.strokeStyle = live ? '#4a5568' : '#6b4423'; g.lineWidth = 3; g.strokeRect(-28, -24, 56, 48); if (live) { g.fillStyle = '#e5e9f0'; [[-20, -16], [20, -16], [-20, 16], [20, 16]].forEach(([a, b]) => { g.beginPath(); g.arc(a, b, 3.5, 0, TAU); g.fill(); }); } else { g.beginPath(); g.moveTo(-28, -8); g.lineTo(28, -8); g.moveTo(-28, 8); g.lineTo(28, 8); g.stroke(); } }
    if (i === 1) { g.fillStyle = '#7b6a50'; g.fillRect(-60, -6, 120, 34); g.fillStyle = live ? '#4aa3df' : '#8a6b45'; g.fillRect(-52, 0, 104, 22); if (live) { g.strokeStyle = '#d6efff'; g.lineWidth = 2; [-30, 0, 30].forEach(a => { g.beginPath(); g.moveTo(a - 10 + Math.sin(t * 3 + a) * 3, 8); g.quadraticCurveTo(a, 3, a + 10 + Math.sin(t * 3 + a) * 3, 8); g.stroke(); }); } else { g.fillStyle = '#6f5335'; [[-30, 8], [5, 14], [32, 7]].forEach(([a, b]) => { g.beginPath(); g.ellipse(a, b, 9, 3, 0, 0, TAU); g.fill(); }); } }
    if (i === 2) { g.strokeStyle = '#6b644f'; g.lineWidth = 3; g.beginPath(); g.moveTo(-60, 14); g.lineTo(60, 14); g.stroke(); const dx = live ? Math.sin(t * 2.4) * 34 : -30; g.save(); g.translate(dx, 0); if (!live) g.rotate(.35); g.fillStyle = '#c9a227'; g.fillRect(-24, -6, 48, 14); g.strokeStyle = '#7a5a00'; g.strokeRect(-24, -6, 48, 14); g.restore(); if (live) { g.fillStyle = '#7a5a00'; g.beginPath(); g.moveTo(-58, -14); g.lineTo(-48, -19); g.lineTo(-48, -9); g.fill(); g.beginPath(); g.moveTo(58, -14); g.lineTo(48, -19); g.lineTo(48, -9); g.fill(); } }
    if (i === 3) { g.fillStyle = '#8c8577'; g.fillRect(-34, -30, 68, 60); g.strokeStyle = '#5d574b'; g.lineWidth = 3; g.strokeRect(-34, -30, 68, 60); if (live) { g.strokeStyle = '#2f2a22'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(-6, -30); g.lineTo(4, -10); g.lineTo(-8, 4); g.lineTo(6, 18); g.lineTo(-2, 30); g.moveTo(4, -10); g.lineTo(18, -4); g.moveTo(-8, 4); g.lineTo(-22, 10); g.stroke(); } }
    if (i === 4) { g.fillStyle = '#7d6b57'; g.fillRect(-12, -30, 24, 62); g.fillRect(-20, -34, 40, 8); if (live) { g.strokeStyle = '#7ec8e3'; g.lineWidth = 3; [26, 40, 54].forEach((a, k) => { const o = (t * 26 + k * 14) % 40; g.beginPath(); g.moveTo(a, 28 - o); g.quadraticCurveTo(a + 6, 20 - o, a, 12 - o); g.stroke(); }); } }
    if (i === 5) { g.fillStyle = '#6f6a62'; g.fillRect(-30, -32, 60, 64); if (live) { g.strokeStyle = '#3f8f3a'; g.lineWidth = 4; [-16, 0, 16].forEach(a => { g.beginPath(); g.moveTo(a, -32); g.quadraticCurveTo(a + 8, -8, a - 4, 8); g.quadraticCurveTo(a + 6, 20, a, 32); g.stroke(); }); } else { g.fillStyle = '#9ad1f0'; [[-12, -10 + (t * 30) % 30], [10, 0 + (t * 24) % 26]].forEach(([a, b]) => { g.beginPath(); g.ellipse(a, b, 2.5, 5, 0, 0, TAU); g.fill(); }); g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-20, -28); g.lineTo(-20, 28); g.moveTo(18, -28); g.lineTo(18, 28); g.stroke(); } }
    g.restore(); }
  PLAY.game('lock', {
    dur: 42, keys: [],
    opts: s => ({ N: +(s.querySelector('.seg .on')?.dataset.v || 3) }),
    setup(s, api) { API = api; s.querySelectorAll('.seg button').forEach(b => b.onclick = () => { s.querySelectorAll('.seg button').forEach(x => x.classList.toggle('on', x === b)); api.start(); }); },
    init(o, live) { const st = { live, t: 0, R: live ? Math.random : GK.rng(5), pass: 0 }; begin(st, live ? o.N : 2); return st; },
    step(st, inp, dt) {
      st.t += dt; const c = inp.click, r = st.rm;
      if (st.ph === 'done') { if (c === 'again' && st.live) API.start(); if (!st.live && st.pass === 0 && st.t - st.at > 2.5) { st.pass = 1; st.rowsA = { N: st.N, log: st.log }; begin(st, 5); } return; }
      if (st.ph === 'between') { if (st.t - st.at > (st.live ? 1.4 : 1.1)) { st.i++; if (st.i >= 3) { st.ph = 'done'; st.at = st.t; if (st.live) saved[st.N] = st.log; } else room(st); } return; }
      r.t += dt; if (r.t + r.pen >= CAP) return close(st, 'timeout');
      if (typeof c === 'string' && c[0] === 'k') r.sel = +c[1];
      if (c === 'giveup') return close(st, 'gaveup');
      if (typeof c === 'number' && r.sel >= 0) { r.tries++; if (c === r.sel && r.live[c]) { r.used = c; return close(st, 'through'); } r.pen += PEN; r.msg = c !== r.sel ? `${TOOLS[r.sel].n} does nothing to the ${TOOLS[c].p}` : `this ${TOOLS[c].p} gives the ${TOOLS[c].n} nothing to work on`; r.mt = st.t; if (st.live) PLAY.beep(240, .12, .1, 'square'); }
    },
    // the scripted player does not read the room: it tries each tool on its own prop in turn, then gives up
    bot(st) { const out = { down: {}, press: {} }, r = st.rm; if (st.ph !== 'room') return out; const stepN = Math.floor(r.t / 1.1); if (stepN === r.botN) return out; r.botN = stepN;
      if (stepN === 1) out.click = 'k' + r.kit[0]; if (stepN === 2) out.click = r.kit[0]; if (stepN === 3) out.click = 'k' + r.kit[1]; if (stepN === 4) out.click = r.kit[1]; if (stepN === 5) out.click = 'giveup'; return out; },
    draw(g, st, ui, live) {
      GK.panel(g); const r = st.rm, used = Math.min(CAP, r.t + r.pen);
      GK.head(g, `Room ${Math.min(3, st.i + 1)} of 3 · ${st.N} of 6 tools can open these gates`, FX, 32, 'left', C.ink, 16); GK.text(g, `${used.toFixed(1)} s`, FX + FW, 32, used > 20 ? C.redDk : C.ink, 16, 'right', 800);
      TOOLS.forEach((tl, i) => { const x = FX + (i % 3) * 216, y = FY + Math.floor(i / 3) * 150, hot = r.sel >= 0 && st.ph === 'room'; GK.box(g, x, y, 208, 142, '#f6efdd', hot ? '#8ea2e6' : '#cdbf9f', 10, hot ? 2.5 : 1.5); if (st.ph === 'room') ui.hit(i, x, y, 208, 142); prop(g, i, r.live[i], x + 104, y + 64, st.t); GK.text(g, tl.p, x + 104, y + 130, C.muted, 12, 'center', 700);
        if (r.out === 'through' && r.used === i) { g.strokeStyle = C.good; g.lineWidth = 4; g.strokeRect(x + 3, y + 3, 202, 136); } });
      const ky = FY + 306; GK.text(g, 'your kit: pick a tool, then click a prop', FX, ky + 4, C.muted, 11, 'left', 700);
      r.kit.forEach((k, j) => { const x = FX + j * 200; ui.btn('k' + k, TOOLS[k].n, x, ky + 12, 190, 40, { px: 15, on: r.sel === k }); GK.text(g, TOOLS[k].d, x + 95, ky + 68, C.muted, 11, 'center', 600); });
      if (st.ph === 'room') ui.btn('giveup', 'No way through', FX + 420, ky + 12, 200, 40, { px: 13 }); GK.text(g, 'give up when your kit has no answer', FX + 520, ky + 68, C.muted, 11, 'center', 600);
      if (r.msg && st.t - r.mt < 1.6 && st.ph === 'room') TD.label(`${r.msg} · +${PEN} s`, FX + FW / 2, FY + 148, 'center', '#fff', 13, 'rgba(183,28,28,.95)');
      if (st.ph !== 'room' && r.out) TD.stamp(r.out === 'through' ? 'Through' : r.out === 'gaveup' ? (r.ans ? 'Gave up: there was a way' : 'Gave up: rightly, no way') : 'Out of time', FX + FW / 2, FY + 148, r.out === 'through' ? C.good : C.redDk, 1, 24);
      if (st.ph === 'done' && live) ui.btn('again', 'Three more rooms', FX + FW / 2 - 100, FY + 190, 200, 40, { px: 14, on: true });
      GK.text(g, `A failed try costs ${PEN} seconds. Each room allows ${CAP} seconds. Read the props before you spend a try: the drawing shows their state.`, FX, FY + FH + 26, C.muted, 11, 'left', 500);
      // right: the 15 kits and the log
      const RX = 690, RW = 326, gr = grid(st.N), cl = [C.redDk, C.navy, C.good], nm = ['blocked', 'one answer', 'two answers'];
      GK.text(g, 'all 15 two-tool kits at this setting (counted)', RX, 32, C.muted, 12, 'left', 700); GK.box(g, RX, 44, RW, 112, '#fffaf0', '#cdbf9f', 10, 1.5);
      let d = 0; gr.forEach((n, k) => { for (let j = 0; j < n; j++, d++) { g.fillStyle = cl[k]; g.beginPath(); g.arc(RX + 22 + d * 20, 68, 7.5, 0, TAU); g.fill(); } GK.text(g, `${n} ${nm[k]}`, RX + 16 + k * 104, 104, cl[k], 12, 'left', 800); });
      GK.text(g, `open to ${15 - gr[0]} of 15 kits (${PLAY.pct((15 - gr[0]) / 15)})`, RX + 16, 136, C.ink, 13, 'left', 800);
      GK.text(g, 'your three rooms', RX, 178, C.muted, 12, 'left', 700);
      for (let k = 0; k < 3; k++) { const y = 188 + k * 62, L = st.log[k], cur = k === st.i && st.ph === 'room'; GK.box(g, RX, y, RW, 54, cur ? '#fff6dd' : '#fffaf0', cur ? C.navy : '#cdbf9f', 9, cur ? 2.5 : 1.5); const kit = L ? L.kit : cur ? r.kit : null; if (!kit) continue; GK.text(g, kit.map(i => TOOLS[i].n).join(' + '), RX + 12, y + 22, C.ink, 13, 'left', 800);
        if (L) { GK.text(g, nm[L.ans], RX + RW - 12, y + 22, cl[L.ans], 11, 'right', 800); GK.text(g, `${L.out === 'through' ? 'through' : L.out === 'gaveup' ? 'gave up' : 'out of time'} · ${L.time.toFixed(1)} s · ${L.tries} tr${L.tries === 1 ? 'y' : 'ies'}`, RX + 12, y + 42, L.out === 'through' ? C.good : C.redDk, 12, 'left', 700); } else GK.text(g, 'in play', RX + 12, y + 42, C.muted, 12, 'left', 600); }
      const store = live ? saved : Object.assign({}, st.rowsA ? { [st.rowsA.N]: st.rowsA.log } : {}, st.ph === 'done' ? { [st.N]: st.log } : {}), Ns = Object.keys(store).map(Number).sort();
      GK.text(g, 'settings played', RX, 392, C.muted, 12, 'left', 700);
      Ns.slice(0, 6).forEach((N, k) => { const L = store[N], th = L.filter(x => x.out === 'through').length, mt = L.reduce((a, x) => a + x.time, 0) / L.length, tr = L.reduce((a, x) => a + x.tries, 0); GK.text(g, `${N} of 6: through ${th}/3 · mean ${mt.toFixed(1)} s · ${tr} tries`, RX, 412 + k * 18, C.ink, 12, 'left', 700); });
      if (!Ns.length) GK.text(g, 'none finished yet', RX, 412, C.muted, 12, 'left', 600);
      const th = st.log.filter(x => x.out === 'through').length, wasted = st.log.reduce((a, x) => a + x.tries - (x.out === 'through' ? 1 : 0), 0);
      ui.stats(`<div class="g"><b>${th} of ${st.log.length}</b><span>rooms opened</span></div><div class="r"><b>${wasted}</b><span>tries that did nothing</span></div><div><b>${PLAY.pct((15 - gr[0]) / 15)}</b><span>of kits can open it (counted)</span></div>`);
      const who = live ? 'You' : 'The script';
      if (st.ph !== 'done') { ui.out(live ? `${st.N} of the six props are in a usable state in each room. Your kit may hold none of the matching tools.` : 'A scripted player that does not read the room: it tries each tool on its own prop, then gives up.'); return; }
      const all = Ns.flatMap(N => store[N]), by = k => all.filter(x => x.ans === k), mean = a => a.length ? (a.reduce((s, x) => s + x.time, 0) / a.length).toFixed(1) + ' s' : null, parts = [0, 1, 2].map(k => mean(by(k)) ? `${nm[k]} ${mean(by(k))} (${by(k).length})` : null).filter(Boolean);
      ui.out(`${who} opened ${th} of 3 at “${st.N} of 6” with ${wasted} wasted tr${wasted === 1 ? 'y' : 'ies'}. Mean seconds by kit across the rooms so far: ${parts.join(', ')}. ` + (gr[0] >= 6 ? 'At this setting most kits are blocked, and no reading of the room changes that.' : gr[2] >= 10 ? 'At this setting nearly any tool works, so there is little to read.' : 'In this middle band most kits hold exactly one answer, which is the case where reading the room decides it.') + (live && Ns.length < 2 ? ' Try another setting to compare.' : ''));
    },
  });
})();
