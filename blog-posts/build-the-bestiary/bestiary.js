/* Build the Bestiary (replanned page for "Compositional Cats"; Scripture: Compositional Design, Three Tiers of Depth,
   Orthogonality, Superficial Variety vs Distinct Depth). The learner fills three slots in each of three columns, which
   makes 27 enemies, then meets nine of them and tags each "new" or "seen it". The page compares 27 with the number of
   combinations that differ by the rules and with the learner's own tags. */
(function () {
  const C = TD.C, TAU = TD.TAU, clamp = TD.clamp, FX = 24, FY = 56, FW = 640, FH = 410, GY = FY + 330, PX = FX + 110, BUDGET = 16, N = 9, SPD = 120;
  const COLS = [
    { n: 'Movement', parts: [{ n: 'Walk', d: 'Walks along the ground.', looks: ['Walker', 'Blue walker', 'Striped walker'] }, { n: 'Hop', d: 'Bounces: shots pass under it while it is up.', looks: ['Hopper', 'Spotted hopper', 'Red hopper'] }, { n: 'Fly', d: 'Stays out of reach, then swoops in close.', looks: ['Flyer', 'Pale flyer', 'Dark flyer'] }] },
    { n: 'Attack', parts: [{ n: 'Bite', d: 'Hurts on touch.', looks: ['Teeth', 'Fangs', 'Tusks'] }, { n: 'Spit', d: 'Spits along the ground: jump it.', looks: ['Spit', 'Green spit', 'Tar spit'] }, { n: 'Charge', d: 'Stops, then rushes at triple speed.', looks: ['Horns', 'Long horns', 'Curled horns'] }] },
    { n: 'Weakness', parts: [{ n: 'Stomp', d: 'Land on it. Shots bounce off.', looks: ['Soft head', 'Flat cap', 'Bald head'] }, { n: 'Shot', d: 'Shoot it. Its spikes stop a stomp.', looks: ['Spikes', 'Glowing spikes', 'Long spikes'] }, { n: 'Helmet', d: 'Shoot the helmet off, then stomp.', looks: ['Helmet', 'Gold helmet', 'Horned helmet'] }] }];
  const HUES = ['#5aa469', '#3f7fd0', '#c9a227'], MCOL = [['#5aa469', '#3f7fd0', '#8a6fb0'], ['#d07a3f', '#c94f7c', '#c0392b'], ['#7d8fa8', '#c9cfd8', '#4a5568']];
  let API = null;
  const cost = slots => slots.reduce((a, col) => a + col.reduce((b, v, i) => b + (col.indexOf(v) === i ? 2 : 1), 0), 0);
  const distinct = slots => slots.reduce((a, col) => a * new Set(col).size, 1);
  function spawn(st) { const k = st.order[st.i], sl = [Math.floor(k / 9), Math.floor(k / 3) % 3, k % 3], b = sl.map((s, c) => st.slots[c][s]), look = sl.map((s, c) => st.slots[c].slice(0, s).filter(v => v === st.slots[c][s]).length);
    st.e = { sl, b, look, key: b.join(''), x: FX + FW + 30, h: b[0] === 2 ? 120 : 0, t: 0, helm: b[2] === 2, ch: 0, spit: 1, alive: true }; st.p = { h: 0, vy: 0, cd: 0 }; st.shots = []; st.spits = []; st.ph = 'fight'; st.msg = ''; }
  function end(st, res) { const e = st.e, isNew = !st.seen[e.key]; st.seen[e.key] = true; st.log.push({ b: e.b, look: e.look, res, isNew, tag: null }); st.ph = 'tag'; st.at = st.t; }
  function drawFoe(g, x, y, b, look, o = {}) { const s = o.s || 1, col = MCOL[b[0]][look[0]]; g.save(); g.translate(x, y); g.scale(s, s);
    if (b[0] === 2) { g.fillStyle = 'rgba(255,255,255,.85)'; const f = Math.sin((o.t || 0) * 18) * 6; [[-1], [1]].forEach(([d]) => { g.beginPath(); g.ellipse(d * 18, -6 + f * .3, 12, 6 + f * .4, d * .5, 0, TAU); g.fill(); }); }
    if (b[0] === 1) { g.strokeStyle = '#3a3a3a'; g.lineWidth = 3; g.beginPath(); g.moveTo(-8, 12); g.lineTo(-13, 18); g.lineTo(-5, 20); g.moveTo(8, 12); g.lineTo(13, 18); g.lineTo(5, 20); g.stroke(); }
    if (b[0] === 0) { g.fillStyle = '#3a3a3a'; g.fillRect(-12, 13, 9, 5); g.fillRect(3, 13, 9, 5); }
    g.fillStyle = col; g.beginPath(); g.arc(0, 0, 16, 0, TAU); g.fill(); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 2; g.stroke();
    if (look[0] === 2 && b[0] === 0) { g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 3; [-6, 0, 6].forEach(a => { g.beginPath(); g.moveTo(a, -14); g.lineTo(a, 14); g.stroke(); }); }
    if (look[0] === 1 && b[0] === 1) { g.fillStyle = 'rgba(255,255,255,.75)'; [[-6, -5], [6, 3], [-2, 8]].forEach(([a, c]) => { g.beginPath(); g.arc(a, c, 3, 0, TAU); g.fill(); }); }
    g.fillStyle = '#fff'; g.beginPath(); g.arc(-7, -3, 4, 0, TAU); g.fill(); g.fillStyle = '#111'; g.beginPath(); g.arc(-8, -3, 2, 0, TAU); g.fill();
    const ac = ['#fff', '#ffe9a8', '#e8e8e8'][look[1]];
    if (b[1] === 0) { g.fillStyle = ac; const L = 5 + look[1] * 3; [[-12, 5], [-7, 7]].forEach(([a, c]) => { g.beginPath(); g.moveTo(a - 2, c); g.lineTo(a + 2, c); g.lineTo(a, c + L); g.fill(); }); }
    if (b[1] === 1) { g.fillStyle = ['#7a2f2f', '#2f7a3a', '#222'][look[1]]; g.beginPath(); g.arc(-13, 5, 5, 0, TAU); g.fill(); }
    if (b[1] === 2) { g.strokeStyle = ac; g.lineWidth = 4; g.beginPath(); g.moveTo(-10, -10); g.quadraticCurveTo(-22 - look[1] * 3, -12 - look[1] * (look[1] === 2 ? -4 : 2), -24 - look[1] * 3, -2); g.stroke(); }
    if (b[2] === 1) { g.fillStyle = look[2] === 1 ? '#ffe45c' : '#e9e9e9'; const L = look[2] === 2 ? 15 : 10; [-8, 0, 8].forEach(a => { g.beginPath(); g.moveTo(a - 4, -13); g.lineTo(a + 4, -13); g.lineTo(a, -13 - L); g.fill(); }); }
    if (b[2] === 2 && o.helm !== false) { g.fillStyle = look[2] === 1 ? '#e2b93b' : '#8d99ae'; g.beginPath(); g.arc(0, -4, 17, Math.PI, TAU); g.fill(); g.fillRect(-18, -5, 36, 4); if (look[2] === 2) { g.fillStyle = '#eee'; g.beginPath(); g.moveTo(-12, -16); g.lineTo(-16, -28); g.lineTo(-7, -19); g.moveTo(12, -16); g.lineTo(16, -28); g.lineTo(7, -19); g.fill(); } }
    if (b[2] === 0 && look[2] === 1) { g.fillStyle = '#b5651d'; g.fillRect(-11, -18, 22, 5); }
    g.restore(); }
  PLAY.game('bestiary', {
    dur: 70, keys: [' ', 'f', '1', '2'],
    setup(s, api) { API = api; },
    init(o, live) { const R = live ? Math.random : GK.rng(9), order = [...Array(27).keys()]; for (let i = 26; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; } return { live, t: 0, ph: 'pick', slots: [[0, 0, 0], [0, 0, 0], [0, 0, 0]], order: order.slice(0, N), i: 0, log: [], seen: {}, botK: 0 }; },
    step(st, inp, dt) {
      st.t += dt; const c = inp.click, pr = inp.press || {};
      if (st.ph === 'pick') { if (inp.set) st.slots = inp.set; if (typeof c === 'number') { const col = Math.floor(c / 3), sl = c % 3; st.slots[col][sl] = (st.slots[col][sl] + 1) % 3; } if (c === 'go' && cost(st.slots) <= BUDGET) { st.i = 0; spawn(st); } return; }
      if (st.ph === 'done') { if (c === 'again' && st.live) API.start(); return; }
      if (st.ph === 'tag') { const tag = c === 'new' || pr['1'] ? 'new' : c === 'seen' || pr['2'] ? 'seen' : null; if (tag && st.t - st.at > .25) { st.log[st.log.length - 1].tag = tag; st.i++; if (st.i >= N) st.ph = 'done'; else spawn(st); } return; }
      const e = st.e, p = st.p; e.t += dt; p.cd -= dt;
      if (pr[' '] && p.h <= 0) { p.vy = 520; if (st.live) PLAY.beep(520, .07, .08); }
      if (p.h > 0 || p.vy > 0) { p.h += p.vy * dt; p.vy -= 1500 * dt; if (p.h <= 0) { p.h = 0; p.vy = 0; } }
      if (pr.f && p.cd <= 0) { p.cd = .45; st.shots.push({ x: PX + 16, h: 22 + p.h }); if (st.live) PLAY.beep(880, .05, .07, 'square'); }
      let v = SPD; const dx = e.x - PX;
      if (e.b[1] === 2) { if (!e.ch && dx < 250) e.ch = .001; if (e.ch) { e.ch += dt; v = e.ch < .55 ? 0 : SPD * 3; } }
      e.x -= v * dt;
      if (e.b[0] === 1) e.h = 52 * Math.abs(Math.sin(Math.PI * e.t / .72));
      if (e.b[0] === 2) e.h = dx > 210 ? 120 : Math.max(0, e.h - 260 * dt);
      if (e.b[1] === 1) { e.spit -= dt; if (e.spit <= 0 && dx > 140) { e.spit = 1.6; st.spits.push({ x: e.x - 14 }); } }
      st.spits.forEach(s => { s.x -= 290 * dt; if (Math.abs(s.x - PX) < 13 && p.h < 18) s.hit = true; }); if (st.spits.some(s => s.hit)) return end(st, 'hit');
      st.spits = st.spits.filter(s => s.x > FX);
      st.shots.forEach(s => { s.x += 540 * dt; if (!s.dead && Math.abs(s.x - e.x) < 18 && Math.abs(s.h - (e.h + 16)) < 20) { s.dead = true; if (e.b[2] === 1) e.alive = false; else if (e.b[2] === 2 && e.helm) { e.helm = false; st.msg = 'helmet off'; st.mt = st.t; } else { st.msg = 'the shot bounced off'; st.mt = st.t; } } });
      st.shots = st.shots.filter(s => !s.dead && s.x < FX + FW);
      if (!e.alive) return end(st, 'beat');
      const top = e.h + 32;
      if (Math.abs(dx) < 30 && p.vy < 0 && p.h > top - 18 && p.h < top + 12) { if (e.b[2] === 0 || (e.b[2] === 2 && !e.helm)) return end(st, 'beat'); p.vy = 330; st.msg = e.b[2] === 1 ? 'spikes: no stomp' : 'the helmet took the stomp'; st.mt = st.t; }
      else if (Math.abs(dx) < 22 && p.h < top - 14 && e.h < p.h + 40) return end(st, 'hit');
      if (e.x < FX - 20) return end(st, 'past');
    },
    // the scripted player knows each weakness, and tags an enemy "new" only when its three behaviours have not appeared together before
    bot(st) {
      const out = { down: {}, press: {} };
      if (st.ph === 'pick') { if (st.t > 1 && st.t < 1.1) out.set = [[0, 0, 1], [0, 1, 1], [0, 1, 0]]; if (st.t > 3.4) out.click = 'go'; return out; }
      if (st.ph === 'tag') { if (st.t - st.at > 1) out.click = st.log[st.log.length - 1].isNew ? 'new' : 'seen'; return out; }
      if (st.ph !== 'fight') return out;
      const e = st.e, p = st.p, dx = e.x - PX, v = e.ch > .55 ? SPD * 3 : e.ch ? 0 : SPD, stomp = e.b[2] === 0 || (e.b[2] === 2 && !e.helm);
      if (st.spits.some(s => s.x - PX < 62 && s.x - PX > 0) && p.h <= 0) out.press[' '] = true;
      if (!stomp && p.cd <= 0 && dx < 430 && e.h < 14 && p.h <= 0) out.press.f = true;
      if (stomp && p.h <= 0 && dx > 10 && dx < v * .6 + 14 && e.h < 60) out.press[' '] = true;
      if (!stomp && p.h <= 0 && dx < 50 && dx > 0) out.press[' '] = true;
      return out;
    },
    draw(g, st, ui, live) {
      GK.panel(g); const D = distinct(st.slots), cst = cost(st.slots), RX = 690, RW = 326;
      if (st.ph === 'pick') {
        GK.head(g, 'Fill nine slots: three movements, three attacks, three weaknesses', FX, 32, 'left', C.ink, 16);
        COLS.forEach((col, c) => { const x = FX + c * 216; GK.text(g, col.n, x + 4, FY + 16, C.navy, 14, 'left', 800);
          st.slots[c].forEach((v, sl) => { const y = FY + 26 + sl * 112, part = col.parts[v], look = st.slots[c].slice(0, sl).filter(u => u === v).length, dup = look > 0;
            GK.box(g, x, y, 206, 102, dup ? '#f3ecdc' : '#fffaf0', dup ? '#b9a98a' : '#8ea2e6', 10, 2); ui.hit(c * 3 + sl, x, y, 206, 102);
            const bb = [0, 0, 0], ll = [0, 0, 0]; bb[c] = v; ll[c] = look; drawFoe(g, x + 30, y + 44, bb, ll, { s: 1.1, t: st.t });
            GK.text(g, part.looks[look], x + 62, y + 26, C.ink, 14, 'left', 800); GK.text(g, dup ? `plays as ${part.n} · 1 pt` : `new behaviour · 2 pts`, x + 62, y + 44, dup ? C.muted : C.good, 11, 'left', 700);
            GK.wrap(g, part.d, x + 62, y + 62, 138, 14, C.muted, 11, 500); GK.text(g, 'click to change', x + 196, y + 96, '#a89f88', 9, 'right', 600); }); });
        const over = cst > BUDGET; GK.text(g, `Cost ${cst} of ${BUDGET} points`, FX + 4, FY + FH - 22, over ? C.redDk : C.ink, 15, 'left', 800); PLAY.bar(g, FX + 180, FY + FH - 34, 200, 14, cst / BUDGET, over ? C.red : C.navy);
        if (over) GK.text(g, 'over budget: reuse a behaviour with a new look', FX + 4, FY + FH - 2, C.redDk, 12, 'left', 700); else ui.btn('go', 'Meet nine of them', FX + FW - 210, FY + FH - 44, 200, 40, { px: 14, on: true });
        GK.text(g, 'A behaviour you have not built yet costs 2 points. A second look for one you already have costs 1.', FX, FY + FH + 26, C.muted, 11, 'left', 500);
        GK.box(g, RX, 46, RW, 240, '#fffaf0', '#cdbf9f', 10, 1.5); GK.text(g, 'enemies you can spawn', RX + 16, 76, C.muted, 12, 'left', 700); GK.text(g, '27', RX + 16, 120, C.navy, 40, 'left', 800); GK.text(g, '3 × 3 × 3 slots', RX + 90, 116, C.muted, 12, 'left', 600);
        GK.text(g, 'that differ by the rules', RX + 16, 164, C.muted, 12, 'left', 700); GK.text(g, String(D), RX + 16, 208, C.good, 40, 'left', 800); GK.text(g, st.slots.map(col => new Set(col).size).join(' × ') + ' behaviours', RX + 90, 204, C.muted, 12, 'left', 600);
        GK.wrap(g, 'How many will feel new when you meet them is the third number. Only your own tags can supply it.', RX + 16, 240, RW - 32, 15, C.muted, 11, 500);
      } else {
        const e = st.e, p = st.p; GK.head(g, st.ph === 'done' ? 'Nine encounters played' : `Encounter ${Math.min(N, st.i + 1)} of ${N}`, FX, 32, 'left', C.ink, 17);
        g.save(); g.beginPath(); g.roundRect(FX, FY, FW, FH, 12); g.clip(); g.fillStyle = '#bfe3f2'; g.fillRect(FX, FY, FW, FH); g.fillStyle = '#7fb069'; g.fillRect(FX, GY, FW, FH); g.fillStyle = '#5d8a4c'; g.fillRect(FX, GY, FW, 6);
        if (st.ph === 'fight' || st.ph === 'tag') { if (e.b[1] === 2 && e.ch && e.ch < .55 && st.ph === 'fight') TD.label('!', e.x, GY - e.h - 54, 'center', '#fff', 14, 'rgba(183,28,28,.95)');
          g.globalAlpha = st.ph === 'tag' ? .55 : 1; drawFoe(g, st.ph === 'tag' ? clamp(e.x, FX + 60, FX + FW - 60) : e.x, GY - 18 - e.h, e.b, e.look, { t: st.t, helm: e.helm }); g.globalAlpha = 1;
          st.spits.forEach(s => { g.fillStyle = ['#7a2f2f', '#2f7a3a', '#222'][e.look[1]]; g.beginPath(); g.arc(s.x, GY - 9, 7, 0, TAU); g.fill(); });
          st.shots.forEach(s => { g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(s.x, GY - s.h, 5, 0, TAU); g.fill(); }); }
        TD.shadow(PX, GY, 13, 4); TD.player(PX, GY - 18 - p.h, 0, .9);
        if (st.msg && st.t - st.mt < 1 && st.ph === 'fight') TD.label(st.msg, e.x, GY - e.h - 60, 'center', '#fff', 12, 'rgba(60,60,70,.9)');
        g.restore();
        if (st.ph === 'tag') { const L = st.log[st.log.length - 1]; TD.stamp(L.res === 'beat' ? 'Beaten' : L.res === 'hit' ? 'It got you' : 'It got past', FX + FW / 2, FY + 60, L.res === 'beat' ? C.good : C.redDk, 1, 22);
          GK.text(g, 'Did that one play differently from the ones before it?', FX + FW / 2, FY + 110, C.ink, 14, 'center', 700); ui.btn('new', '1 · New to play', FX + FW / 2 - 190, FY + 126, 180, 44, { px: 14, on: true }); ui.btn('seen', '2 · Seen it', FX + FW / 2 + 10, FY + 126, 180, 44, { px: 14 }); }
        if (st.ph === 'done' && live) ui.btn('again', 'Build another bestiary', FX + FW / 2 - 115, FY + 120, 230, 44, { px: 14, on: true });
        GK.text(g, 'Space: jump (land on an enemy to stomp it, or clear its spit) · F: shoot · the enemy walks to you', FX, FY + FH + 26, C.muted, 11, 'left', 500);
        GK.text(g, 'tap a tag after each one', RX, 32, C.muted, 12, 'left', 700);
        for (let k = 0; k < N; k++) { const y = 44 + k * 49, L = st.log[k]; GK.box(g, RX, y, RW, 43, k === st.i && st.ph !== 'done' ? '#fff6dd' : '#fffaf0', k === st.i && st.ph !== 'done' ? C.navy : '#cdbf9f', 8, 1.5); GK.text(g, String(k + 1), RX + 12, y + 27, C.muted, 12, 'left', 700);
          if (!L) continue; drawFoe(g, RX + 44, y + 23, L.b, L.look, { s: .75 }); GK.text(g, L.res === 'beat' ? 'beaten' : L.res === 'hit' ? 'got you' : 'got past', RX + 72, y + 27, L.res === 'beat' ? C.good : C.redDk, 11, 'left', 700);
          if (L.tag) GK.text(g, (live ? 'you: ' : 'script: ') + (L.tag === 'new' ? 'new' : 'seen it'), RX + 134, y + 27, C.navy, 12, 'left', 800); if (L.tag) GK.text(g, L.isNew ? 'rules: new' : 'rules: repeat', RX + RW - 12, y + 27, L.isNew ? C.good : C.muted, 11, 'right', 700); }
      }
      const tagged = st.log.filter(L => L.tag), yn = tagged.filter(L => L.tag === 'new').length, rn = tagged.filter(L => L.isNew).length, same = tagged.filter(L => L.isNew && L.tag === 'seen').length, fooled = tagged.filter(L => !L.isNew && L.tag === 'new').length;
      ui.stats(`<div><b>27</b><span>enemies you can spawn</span></div><div class="g"><b>${D}</b><span>differ by the rules</span></div><div class="r"><b>${tagged.length ? yn + ' of ' + tagged.length : 'none yet'}</b><span>tagged “new” by ${live ? 'you' : 'the script'}</span></div>`);
      const who = live ? 'you' : 'the script';
      if (st.ph === 'pick') ui.out(live ? `Click a slot to change it. ${cst > BUDGET ? 'You are over budget.' : `Your nine parts make 27 enemies, and ${D} of them differ by the rules.`}` : 'A scripted designer fills the slots, and a scripted player meets nine enemies. It tags one “new” only when its three behaviours have not appeared together before.');
      else if (st.ph !== 'done') ui.out(`So far ${rn} of ${tagged.length} were new by the rules and ${who} tagged ${yn} as new.`);
      else ui.out(`Possible: 27. Different by the rules: ${D}. Of the nine met, ${rn} were new by the rules and ${who} tagged ${yn} as new. ` + (same ? `${same} differed on paper and still played the same to ${who}: that gap is total depth against relevant depth. ` : '') + (fooled ? `${fooled} repeated an earlier enemy by the rules and still got a “new” tag, so a new look bought something. ` : '') + (!same && !fooled ? `The tags matched the rules exactly${live ? '' : ', as the script is written to do'}. ` : '') + 'The multiplication counts looks. Players count what they had to do differently.');
    },
  });
})();
