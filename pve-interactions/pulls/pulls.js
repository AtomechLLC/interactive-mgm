/* Reading a Pull (MGM C4 M5): the deck's two "Example" pull slides, 1-D (the void frog and its casters) and 2-E (rabbits, foxes
   and the Shadow-Infused Makrura), played by a World of Warcraft party. The student picks a kill order, which casts to
   interrupt and (2-E) whether to step out of the rabbits' pounces, then watches the fight from sim.js. During a fight,
   clicking a creature calls focus on it, clicking its cast bar interrupts it, and D (or the Step out button) steps out of a pounce. Each finished
   fight is added to the attempts list; "The slide's read" shows the synergy and solution cards from the deck.
   The walk-through (window.__seek / __dur for the GIF) plays the obvious plan, then the slide's solution, then the read. */
(function () {
  const { $, $$ } = FPF.kit;
  const { pic, text, wrap, card, chip, TONE, scene, pointer, clamp, ease } = CK;
  const S = window.PULLS, K = S.KINDS, TAU = Math.PI * 2;
  const IMG = n => 'img/' + n + (n.startsWith('map-') ? '' : '.jpg');
  const ph = (t, a, b) => clamp((t - a) / (b - a));
  const AH = S.H, HUD = 585 - S.H;   // arena on top, party frames underneath

  const KICK_LABEL = { none: 'No interrupts', key: null, all: 'Interrupt every cast' };
  const MOVE_LABEL = { stand: 'Stand in pounces', step: 'Step out of pounces' };
  const RESULT = {
    cleared: ['Cleared', TONE.green], close: ['Close call', TONE.gold], wipe: ['Wipe', TONE.red], timeout: ['Out-healed', TONE.purple],
  };
  const kickLabel = (pk, k) => k === 'key' ? `Interrupt ${S.PULLS[pk].keyName}` : KICK_LABEL[k];
  const orderKey = (pk, order) => Object.keys(S.PULLS[pk].orders).find(k => S.PULLS[pk].orders[k].order.join() === order.join());
  const planLabel = (pk, p) => [S.PULLS[pk].orders[orderKey(pk, p.order)].label, kickLabel(pk, p.kick), pk === 'e2' ? MOVE_LABEL[p.move] : null].filter(Boolean);

  // the walk-through: the plan most players try first, then the slide's solution, then the read
  const TOURS = {
    d1: [{ o: 'frog', kick: 'none', move: 'stand', note: 'The obvious read: the big frog in front gets hit first.' },
      { o: 'casters', kick: 'key', move: 'stand', note: 'The slide’s solution: focus the ranged enemies, interrupt the dragonfly.' }],
    e2: [{ o: 'melee', kick: 'none', move: 'stand', note: 'The obvious read: the rabbits and foxes are biting, so kill them first.' },
      { o: 'melee', kick: 'none', move: 'step', note: 'Step out of the pounces: the party lives longer, and Shadow Mend undoes its damage.' },
      { o: 'melee', kick: 'key', move: 'step', note: 'The slide’s solution: step out of the pounces, interrupt Shadow Mend.' }],
  };
  const TOUR_SPEED = 4, HOLD = 3.6, READ = 8;
  function tourOf(pk) {
    let at = 0;
    const segs = TOURS[pk].map(sg => {
      const plan = { order: S.PULLS[pk].orders[sg.o].order, kick: sg.kick, move: sg.move }, run = S.run(pk, plan);
      const len = run.end.t / TOUR_SPEED + HOLD, s = { ...sg, plan, run, t0: at, len }; at += len; return s;
    });
    return { segs, read: at, dur: at + READ };
  }

  /* ---------- drawing pieces ---------- */
  function token(g, n, x, y, r, ring, o = {}) {
    g.save(); g.globalAlpha *= o.a ?? 1;
    g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(x + 3, y + r * .8, r * .9, r * .35, 0, 0, TAU); g.fill();
    g.fillStyle = '#111'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    g.save(); g.beginPath(); g.arc(x, y, r - 1, 0, TAU); g.clip(); pic(g, IMG(n), x, y, r * 2.25, { grey: o.grey }); g.restore();
    g.strokeStyle = ring; g.lineWidth = o.lw || 4; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke();
    g.restore();
  }
  function sq(g, n, x, y, s, o = {}) {
    g.save(); g.globalAlpha *= o.a ?? 1;
    pic(g, IMG(n), x, y, s, { round: 4, grey: o.grey });
    g.strokeStyle = o.edge || '#1b1b22'; g.lineWidth = o.lw || 2; g.beginPath(); g.roundRect(x - s / 2, y - s / 2, s, s, 4); g.stroke(); g.restore();
  }
  function bar(g, x, y, w, k, col, h = 5, bg = 'rgba(20,20,30,.7)') {
    g.fillStyle = bg; g.fillRect(x - w / 2 - 1, y - 1, w + 2, h + 2);
    g.fillStyle = col; g.fillRect(x - w / 2, y, w * clamp(k), h);
  }
  const lbl = (g, s, x, y, o = {}) => text(g, s, x, y, { size: 13, w: 700, col: '#fffaf0', stroke: 4, strokeCol: 'rgba(20,16,30,.85)', ...o });

  function ground(g, pk) {
    pic(g, IMG(pk === 'd1' ? 'map-pond.jpg' : 'map-ruins.jpg'), S.W / 2, AH / 2, S.W, { h: AH });
    g.fillStyle = 'rgba(25,18,40,.18)'; g.fillRect(0, 0, S.W, AH);
  }

  // one frame of a fight. t is fight time (seconds)
  function arena(g, pk, run, t, o = {}) {
    const fi = Math.min(run.frames.length - 1, Math.max(0, Math.floor(t / S.DT))), fr = run.frames[fi];
    const P = {}; fr.party.forEach(m => P[m.id] = m);
    const FO = {}; fr.foes.forEach(f => FO[f.id] = f);
    const meta = id => S.PARTY[+id.slice(1)];
    const kind = id => K[S.PULLS[pk].foes[+id.slice(1)][0]];
    g.save(); g.beginPath(); g.rect(0, 0, S.W, AH); g.clip();
    ground(g, pk);

    // pounce telegraphs on the ground
    fr.foes.forEach(f => {
      if (!f.alive || !f.warn) return;
      const R = K.rabbit.pounce, k = clamp((t - f.warn.t0) / R.warn);
      g.fillStyle = `rgba(229,50,45,${.18 + .2 * k})`; g.beginPath(); g.arc(f.warn.x, f.warn.y, R.radius, 0, TAU); g.fill();
      g.strokeStyle = '#ff5a4e'; g.lineWidth = 3; g.beginPath(); g.arc(f.warn.x, f.warn.y, R.radius, 0, TAU); g.stroke();
      g.strokeStyle = '#fff3c0'; g.lineWidth = 4; g.beginPath(); g.arc(f.warn.x, f.warn.y, R.radius * k, 0, TAU); g.stroke();
      g.strokeStyle = 'rgba(255,90,78,.6)'; g.lineWidth = 2; g.setLineDash([5, 5]); g.beginPath(); g.moveTo(f.x, f.y); g.lineTo(f.warn.x, f.warn.y); g.stroke(); g.setLineDash([]);
    });
    // the healer's beam
    fr.party.forEach(m => {
      if (m.alive && m.healOn && P[m.healOn]) { const h = P[m.healOn]; g.strokeStyle = 'rgba(120,255,150,.6)'; g.lineWidth = 2; g.setLineDash([6, 6]); g.lineDashOffset = -t * 30; g.beginPath(); g.moveTo(m.x, m.y); g.lineTo(h.x, h.y); g.stroke(); g.setLineDash([]); }
    });
    // creatures
    fr.foes.forEach(f => {
      const k = kind(f.id);
      if (f.hidden) { lbl(g, '?', f.x, f.y, { size: 22, a: .55 }); g.strokeStyle = 'rgba(255,255,255,.35)'; g.setLineDash([4, 4]); g.lineWidth = 2; g.beginPath(); g.arc(f.x, f.y, k.r, 0, TAU); g.stroke(); g.setLineDash([]); return; }
      if (!f.alive) {
        token(g, k.icon, f.x, f.y, k.r * .8, '#555', { grey: true, a: .8 });
        g.strokeStyle = 'rgba(30,20,20,.85)'; g.lineWidth = 4; const q = k.r * .45; g.beginPath(); g.moveTo(f.x - q, f.y - q); g.lineTo(f.x + q, f.y + q); g.moveTo(f.x + q, f.y - q); g.lineTo(f.x - q, f.y + q); g.stroke();
        return;
      }
      if (fr.focus === f.id) {
        g.save(); g.translate(f.x, f.y); g.rotate(t * 1.4); g.strokeStyle = '#ffd23f'; g.lineWidth = 3; g.setLineDash([10, 7]);
        g.beginPath(); g.arc(0, 0, k.r + 10, 0, TAU); g.stroke(); g.restore();
      }
      if (f.lock > 0) { g.strokeStyle = 'rgba(140,110,255,.9)'; g.lineWidth = 3; g.beginPath(); g.arc(f.x, f.y, k.r + 5, -Math.PI / 2, -Math.PI / 2 + TAU * f.lock / S.LOCK); g.stroke(); }
      token(g, k.icon, f.x, f.y, k.r, '#d8322a');
      bar(g, f.x, f.y - k.r - 12, k.r * 2.2, f.hp / kind(f.id).hp, '#e5322d', 5);
      lbl(g, k.short, f.x, f.y + k.r + 10, { size: 12 });
      if (f.cast) {
        const key = f.cast.key === S.PULLS[pk].key, y = f.y + k.r + 22;
        bar(g, f.x + 9, y, 66, f.cast.k, key ? '#ff9a2e' : '#8fb3ff', 9);
        sq(g, f.cast.icon, f.x - 33, y + 4, 16);
        if (key) lbl(g, f.cast.name, f.x + 4, y + 20, { size: 12, col: '#ffd9a0' });
      } else if (f.lock > 0) lbl(g, 'interrupted', f.x, f.y + k.r + 26, { size: 12, col: '#d9ccff' });
    });
    // the party
    fr.party.forEach(m => {
      const M = meta(m.id);
      if (!m.alive) { token(g, M.icon, m.x, m.y, 17, '#666', { grey: true, a: .55 }); lbl(g, 'dead', m.x, m.y + 26, { size: 11 }); return; }
      if (m.slow > 0) { g.strokeStyle = '#6fd0ff'; g.lineWidth = 3; g.setLineDash([4, 4]); g.beginPath(); g.arc(m.x, m.y, 25, 0, TAU); g.stroke(); g.setLineDash([]); }
      token(g, M.icon, m.x, m.y, 19, M.role === 'tank' ? '#7fb2ff' : M.role === 'healer' ? '#7ef0a0' : '#4aa3f0');
      bar(g, m.x, m.y - 30, 40, m.hp / M.hp, '#36c46a', 5);
      if (m.stun > 0) for (let i = 0; i < 3; i++) { const a = t * 6 + i * TAU / 3; lbl(g, '★', m.x + Math.cos(a) * 13, m.y - 22 + Math.sin(a) * 4, { size: 11, col: '#ffd23f' }); }
    });
    // spells in flight: Void Water Bolt as a blue orb, Sapping Sting as a violet dart, each with a short trail
    fr.bolts.forEach(b => {
      const water = b.key === 'bolt', col = water ? '#5ec8ff' : '#c27bff';
      g.save(); g.shadowColor = col; g.shadowBlur = 14;
      g.fillStyle = water ? 'rgba(94,200,255,.35)' : 'rgba(194,123,255,.35)';
      g.beginPath(); g.arc(b.x, b.y, water ? 16 : 12, 0, TAU); g.fill();
      g.fillStyle = water ? '#dff6ff' : '#f1dcff'; g.beginPath(); g.arc(b.x, b.y, water ? 8 : 6, 0, TAU); g.fill();
      g.restore();
    });
    run.fx.forEach(e => {
      const u = t - e.t; if (e.kind !== 'splash' || u < 0 || u > .45) return;
      const water = e.key === 'bolt';
      g.strokeStyle = water ? `rgba(94,200,255,${1 - u / .45})` : `rgba(194,123,255,${1 - u / .45})`; g.lineWidth = 4;
      g.beginPath(); g.arc(e.x, e.y, 18 + u * 50, 0, TAU); g.stroke();
    });
    // effects on the map (the words go in the callout)
    run.fx.forEach(e => {
      const u = t - e.t; if (u < 0 || u > 1.6) return;
      if (e.kind === 'kick' && P[e.id] && u < .45) { const m = P[e.id]; g.strokeStyle = `rgba(170,140,255,${1 - u / .45})`; g.lineWidth = 4; g.beginPath(); g.moveTo(m.x, m.y); g.lineTo(e.x, e.y); g.stroke(); }
      if (e.kind === 'mend') fr.foes.forEach(o => { if (!o.alive || o.hidden) return; g.strokeStyle = `rgba(200,120,255,${.8 * (1 - u / 1.6)})`; g.lineWidth = 3; g.beginPath(); g.arc(o.x, o.y, 26 + u * 14, 0, TAU); g.stroke(); });
      if (e.kind === 'wave' && u < .8) { const f = FO[e.fid]; g.strokeStyle = `rgba(160,90,255,${.7 * (1 - u / .8)})`; g.lineWidth = 6; g.beginPath(); g.arc(f.x, f.y, 40 + u * 900, 0, TAU); g.stroke(); }
      if (e.kind === 'lash' && u < .9 && P[e.id]) {
        const f = FO[e.fid], m = P[e.id]; g.strokeStyle = `rgba(214,90,150,${1 - u / .9})`; g.lineWidth = 6; g.lineCap = 'round';
        g.beginPath(); g.moveTo(f.x, f.y); g.lineTo(u < .2 ? e.x0 : m.x, u < .2 ? e.y0 : m.y); g.stroke();
      }
      if (e.kind === 'pounce' && u < .9) { g.fillStyle = `rgba(255,120,80,${.5 * (1 - u / .9)})`; g.beginPath(); g.arc(e.x, e.y, K.rabbit.pounce.radius + u * 20, 0, TAU); g.fill(); }
      if (e.kind === 'say') lbl(g, e.s, e.x, e.y - u * 10, { size: 14, col: '#ffe08a', a: 1 - ph(u, 1, 1.6) });
    });
    const cur = current(events(pk, run), t, o.speed);
    if (cur && !o.noCallout) callout(g, cur, t);
    g.restore();
    hud(g, pk, run, fr, t, o);
  }

  // the events worth calling out, built once per fight from its effect log: what happened, where, and whose
  function events(pk, run) {
    if (run._ev) return run._ev;
    const P = S.PULLS[pk], who = id => S.PARTY[+id.slice(1)].name, foe = id => K[P.foes[+id.slice(1)][0]];
    const ev = []; let lastAmbush = -9;
    run.fx.forEach(e => {
      const at = (x, y) => ({ t: e.t, x, y });
      if (e.kind === 'kick') ev.push({ ...at(e.x, e.y), lane: 1, tone: 'party', icon: S.KICK_ICON[e.name], s: `${e.name} interrupts ${e.spell}` });
      if (e.kind === 'slowed') { const m = run.frames[Math.min(run.frames.length - 1, Math.round(e.t / S.DT))].party.find(q => q.id === e.id); ev.push({ ...at(m.x, m.y), lane: 0, tone: 'foe', icon: 'spell_nature_slow', s: `Sapping Sting slows the ${who(e.id)}` }); }
      if (e.kind === 'mend') { const f = run.frames[Math.min(run.frames.length - 1, Math.round(e.t / S.DT))].foes.find(q => q.id === e.fid); ev.push({ ...at(f.x, f.y), lane: 0, tone: 'heal', icon: 'spell_shadow_shadowmend', s: `Shadow Mend heals the pack for ${e.h}` }); }
      if (e.kind === 'lash') ev.push({ ...at(e.x0, e.y0), lane: 0, tone: 'foe', icon: 'inv_pet_toad_black', s: `Tongue Lash pulls the ${who(e.id)} back to the frog` });
      if (e.kind === 'pounce') ev.push({ ...at(e.x, e.y), lane: 0, tone: e.hits ? 'foe' : 'party', icon: 'ability_druid_supriseattack', s: e.hits ? `Void Pounce hits ${e.hits} player${e.hits > 1 ? 's' : ''}` : 'Void Pounce lands on empty ground' });
      if (e.kind === 'ambush' && e.t - lastAmbush > 1) { lastAmbush = e.t; ev.push({ ...at(e.x, e.y), lane: 0, tone: 'foe', icon: 'spell_magic_polymorphrabbit', s: 'Ambush! The rabbits and foxes leap out' }); }
      if (e.kind === 'kill') ev.push({ ...at(e.x, e.y), lane: 1, tone: 'party', icon: foe(e.fid).icon, grey: true, s: `The ${foe(e.fid).short} dies` });
      if (e.kind === 'die') ev.push({ ...at(e.x, e.y), lane: 0, tone: 'foe', icon: S.PARTY[+e.id.slice(1)].icon, grey: true, s: `The ${who(e.id)} dies` });
      if (e.kind === 'call') { const f = run.frames[Math.min(run.frames.length - 1, Math.round(e.t / S.DT))].foes.find(q => q.id === e.fid); ev.push({ ...at(f.x, f.y), lane: 1, tone: 'call', icon: foe(e.fid).icon, s: `You call focus on the ${foe(e.fid).short}` }); }
      if (e.kind === 'movecall') ev.push({ ...at(S.W / 2, AH / 2), lane: 1, tone: 'call', icon: 'ability_rogue_sprint', s: 'You call: step out!' });
    });
    return (run._ev = ev);
  }
  // the timeline strip's place under the arena, shared by the drawing and the scrubbing
  const TL = { tx0: 92, tx1: S.W - 14, ty: AH + 64, h: 42, span: run => Math.max(run.end.t, 10) };
  const TONES = { foe: '#ff6b5e', party: '#48d17a', heal: '#c27bff', call: '#ffd23f' };
  // the event being called out now: the latest one, held for a moment of real time
  const current = (ev, t, speed) => { let c = null; ev.forEach(e => { if (e.t <= t && t - e.t < 1.4 * (speed || 1)) c = e; }); return c; };

  // the callout in the arena: a banner along the bottom with a leader line to where it happened
  function callout(g, e, t) {
    const col = TONES[e.tone], u = t - e.t;
    g.save();
    g.strokeStyle = col; g.lineWidth = 3; g.globalAlpha = .9;
    const r = 30 + 4 * Math.sin(t * 8);
    g.beginPath(); g.arc(e.x, e.y, r, 0, TAU); g.stroke();
    g.font = '700 18px Jost, sans-serif'; const w = g.measureText(e.s).width + 64, bx = S.W / 2, by = AH - 30;
    g.setLineDash([6, 5]); g.beginPath(); g.moveTo(e.x, e.y + (e.y < by ? r : -r)); g.lineTo(clamp(e.x, bx - w / 2 + 20, bx + w / 2 - 20), by - 18); g.stroke(); g.setLineDash([]);
    g.globalAlpha = 1;
    g.fillStyle = 'rgba(15,20,45,.92)'; g.beginPath(); g.roundRect(bx - w / 2, by - 18, w, 36, 10); g.fill();
    g.strokeStyle = col; g.lineWidth = 3; g.stroke();
    sq(g, e.icon, bx - w / 2 + 22, by, 24, { grey: e.grey });
    text(g, e.s, bx - w / 2 + 42, by + 1, { align: 'left', size: 18, w: 700, col: '#fffaf0' });
    g.restore();
  }

  // under the arena: compact party frames, then the fight's timeline with every event so far
  function hud(g, pk, run, fr, t, o) {
    g.fillStyle = '#152044'; g.fillRect(0, AH, S.W, HUD);
    const fw = 168, gap = 8, x0 = 12, fh = 50;
    fr.party.forEach((m, i) => {
      const M = S.PARTY[i], x = x0 + i * (fw + gap), y = AH + 6;
      g.fillStyle = m.alive ? '#202c5a' : '#2a2a35'; g.beginPath(); g.roundRect(x, y, fw, fh, 7); g.fill();
      sq(g, M.icon, x + 17, y + 17, 24, { grey: !m.alive });
      text(g, M.name, x + 34, y + 11, { align: 'left', size: 13, w: 700, col: '#fffaf0' });
      const st = !m.alive ? ['dead', '#ff8a80'] : m.slow > 0 ? [`slowed ${Math.ceil(m.slow)}s`, '#8fe0ff'] : m.stun > 0 ? ['stunned', '#ffd23f'] : [M.role, '#9aa3d6'];
      text(g, st[0], x + 34, y + 25, { align: 'left', size: 11, col: st[1] });
      bar(g, x + fw / 2, y + 36, fw - 14, m.hp / M.hp, m.hp / M.hp > .5 ? '#36c46a' : m.hp / M.hp > .25 ? '#e0a92d' : '#e5322d', 7, '#0c1230');
      if (M.mana) bar(g, x + fw / 2, y + 45, fw - 14, m.mana / M.mana, '#4f8cff', 3, '#0c1230');
      if (M.kick) {
        sq(g, S.KICK_ICON[M.kick.name], x + fw - 17, y + 15, 20, { grey: m.kickCd > 0 });
        if (m.kickCd > 0) lbl(g, Math.ceil(m.kickCd), x + fw - 17, y + 15, { size: 11 });
      }
    });
    const xr = x0 + 5 * (fw + gap) + 6;
    text(g, `Pull ${S.PULLS[pk].label}`, xr, AH + 18, { align: 'left', size: 15, w: 800, display: true, col: '#ffb951' });
    text(g, `${Math.min(t, run.end.t).toFixed(1)} s${o.speed ? `  ×${o.speed}` : ''}`, xr, AH + 40, { align: 'left', size: 17, w: 700, col: '#fffaf0' });
    // the timeline: creature events on the top lane, the party's on the bottom
    const { tx0, tx1, ty } = TL, T = TL.span(run), X = s => tx0 + (tx1 - tx0) * clamp(s / T);
    text(g, 'creatures', tx0 - 8, ty + 10, { align: 'right', size: 11, col: '#ff9d94' });
    text(g, 'party', tx0 - 8, ty + 32, { align: 'right', size: 11, col: '#8fe5a8' });
    g.fillStyle = '#0c1230'; g.beginPath(); g.roundRect(tx0 - 4, ty, tx1 - tx0 + 8, 42, 6); g.fill();
    g.fillStyle = 'rgba(255,185,81,.25)'; g.fillRect(tx0, ty + 20, X(Math.min(t, run.end.t)) - tx0, 2);
    for (let s = 0; s <= T; s += 10) { g.fillStyle = '#3a4580'; g.fillRect(X(s), ty + 2, 1, 38); if (s) text(g, `${s}s`, X(s) + 3, ty + 7, { align: 'left', size: 9, col: '#6f79b0' }); }
    const ev = events(pk, run), cur = current(ev, t, o.speed);
    // events up to the playhead, and dimmed ones further on that were already watched (after scrubbing back)
    const seen = Math.max(t, o.seen || 0);
    ev.forEach(e => {
      if (e.t > seen) return;
      const x = X(e.t), y = ty + 11 + e.lane * 20, on = e === cur, later = e.t > t;
      if (later) { sq(g, e.icon, x, y, 12, { grey: true, edge: '#3a4580', lw: 1, a: .45 }); return; }
      g.fillStyle = TONES[e.tone]; g.fillRect(x - 1, y - 9, 2, 18);
      if (on) { g.fillStyle = TONES[e.tone]; g.beginPath(); g.roundRect(x - 11, y - 11, 22, 22, 4); g.fill(); }
      sq(g, e.icon, x, y, on ? 18 : 14, { grey: e.grey, edge: TONES[e.tone], lw: on ? 2 : 1.5, a: on ? 1 : .85 });
    });
    const px = X(Math.min(t, run.end.t));
    g.fillStyle = '#ffb951'; g.fillRect(px - 1, ty - 3, 2, 48);
    g.beginPath(); g.moveTo(px - 5, ty - 6); g.lineTo(px + 5, ty - 6); g.lineTo(px, ty); g.fill();
  }

  // the plan chips at the top left, and the result card once the fight is over
  function banner(g, pk, plan, o = {}) {
    let x = 12; planLabel(pk, plan).forEach(s => { x += chip(g, s, x, 22, { ...TONE.navy, edge: '#ffb951', size: 13, align: 'left' }) + 6; });
    if (o.calls) chip(g, `${o.calls} live call${o.calls > 1 ? 's' : ''}`, x, 22, { ...TONE.gold, size: 13, align: 'left' });
    if (o.note) lbl(g, o.note, 12, 50, { align: 'left', size: 15, col: '#fff3c0' });
  }
  function resultCard(g, pk, run, a = 1) {
    const [s, tone] = RESULT[run.end.result], st = run.stats;
    g.save(); g.globalAlpha *= a;
    card(g, S.W / 2, AH / 2, 440, 200, { fill: 'rgba(255,250,240,.96)', edge: tone.edge, lw: 4 });
    chip(g, s, S.W / 2, AH / 2 - 62, { ...tone, size: 22 });
    const line = run.end.result === 'timeout' ? `Still fighting at ${S.MAX_T} s: the Makrura heals faster than you deal damage` : `${run.end.result === 'wipe' ? 'Wiped' : 'Done'} at ${run.end.t.toFixed(1)} s · party health ${st.hpLeft}%${st.deaths ? ` · ${st.deaths} dead` : ''}`;
    const nl = wrap(g, line, S.W / 2, AH / 2 - 26, 400, { size: 16, w: 600, align: 'center', lh: 20 }).length;
    const extra = pk === 'd1'
      ? [`Party slowed for ${Math.round(st.slowSec)} s in total`, `Sapping Stings that landed: ${st.missedKey} of ${st.keyCasts}`, st.lashes ? `Tongue Lash pulled someone back ${st.lashes}×` : 'Nobody got past the frog']
      : [`Health the Makrura healed back: ${Math.round(st.healed)}`, `Void Pounce hits taken: ${st.pounceHits}`, `Shadow Mends that landed: ${st.missedKey} of ${st.keyCasts}`];
    extra.forEach((l, i) => text(g, l, S.W / 2, AH / 2 + 12 + (nl - 1) * 14 + i * 21, { size: 15, col: '#5d618c' }));
    g.restore();
  }
  // the slide's read: tags, synergy and solution
  function readCard(g, pk, a = 1, rows = []) {
    const P = S.PULLS[pk];
    g.save(); g.globalAlpha *= a;
    g.fillStyle = 'rgba(15,20,45,.55)'; g.fillRect(0, 0, S.W, AH);
    const kinds = [...new Set(P.foes.map(f => f[0]))];
    const cw = (S.W - 40) / kinds.length;
    kinds.forEach((k, i) => {
      const x = 20 + cw * i + cw / 2, n = P.foes.filter(f => f[0] === k).length;
      card(g, x, 76, cw - 12, 116, { fill: '#e9e0fb', edge: '#a77fe0' });
      token(g, K[k].icon, x - cw / 2 + 40, 60, 24, '#d8322a', { lw: 3 });
      wrap(g, (n > 1 ? n + '× ' : '') + K[k].name, x - cw / 2 + 72, 48, cw - 92, { size: 14, w: 700, lh: 17 });
      let cx = x - cw / 2 + 14, cy = 108;
      K[k].tags.forEach(tg => { const w = chip(g, tg, cx, cy, { ...(tg === 'Non Elite' ? TONE.teal : tg === 'Single Target' || tg === 'AOE' ? TONE.green : TONE.orange), size: 10, h: 16, pad: 10, align: 'left' }); cx += w + 4; if (cx > x + cw / 2 - 60) { cx = x - cw / 2 + 14; cy += 19; } });
    });
    [['Synergy', P.synergy], ['Solution', P.solution]].forEach(([h, s], i) => {
      const x = S.W / 2 + (i ? 1 : -1) * 250;
      card(g, x, 290, 470, 190, { fill: '#fdf6b8', edge: '#d9c95a' });
      chip(g, h, x, 219, { fill: '#d6f0b0', edge: '#8fbf5a', col: '#2b4a10', size: 18 });
      wrap(g, s, x - 210, s.length > 160 ? 248 : 262, 420, { size: s.length > 160 ? 15 : 18, w: 600, lh: s.length > 160 ? 20 : 25 });
    });
    if (rows.length) rows.forEach((r, i) => { const [s, tone] = RESULT[r.end.result]; chip(g, `${planLabel(pk, r.plan)[0]}${r.plan.kick !== 'none' ? ' + interrupts' : ''}${pk === 'e2' && r.plan.move === 'step' ? ' + step out' : ''}: ${s}, ${r.end.result === 'timeout' ? 'no end' : r.end.t.toFixed(0) + ' s'}`, S.W / 2 + (rows.length === 2 ? (i ? 250 : -250) : (i - 1) * 340), 418, { ...tone, size: rows.length > 2 ? 13 : 15 }); });
    g.restore();
  }

  /* ---------- one scene per pull ---------- */
  function pullScene(pk) {
    const T = tourOf(pk), P = S.PULLS[pk];
    scene('pull-' + pk, {
      dur: T.dur,
      state: () => ({ order: Object.keys(P.orders)[0], kick: 'none', move: 'stand', calls: [], speed: 2, hist: [], read: false, logged: null }),
      init(s, st, api) {
        const seg = (sel, key, cb) => $$(s, sel + ' .btn').forEach(b => b.onclick = () => { api.manual(); st[key] = b.dataset.v; cb?.(); restart(); });
        const restart = () => { st.calls = []; st.t = 0; st.read = false; st.logged = null; pause(false); sync(); };
        // pause: the scene's clock stops while held
        const pause = on => { st.held = on; st.paused = on; const b = $(s, '.pl-pause'); if (b) { b.classList.toggle('on', on); b.textContent = on ? '▶ Resume' : '⏸ Pause'; } };
        $(s, '.pl-pause').onclick = () => {
          if (st.tour) { toManual(); pause(true); return; }
          const run = S.run(pk, plan(), st.calls);
          if (!st.paused && st.ft >= run.end.t) { st.t = 0; return; }   // at the end, the button replays
          pause(!st.paused);
        };
        // leaving the walk-through at the fight it is showing, so the student can scrub that fight
        const toManual = () => {
          const tt = st.t, sg = T.segs.find(q => tt < q.t0 + q.len) || T.segs[T.segs.length - 1];
          api.manual(); st.order = sg.o; st.kick = sg.kick; st.move = sg.move; st.calls = []; st.read = false; st.logged = null;
          st.t = Math.min((tt - sg.t0) * TOUR_SPEED, sg.run.end.t) / st.speed; st.ft = st.t * st.speed; sync();
        };
        seg('.pl-order', 'order'); seg('.pl-kick', 'kick'); seg('.pl-move', 'move');
        $$(s, '.pl-speed .btn').forEach(b => b.onclick = () => { st.speed = +b.dataset.v; if (!st.tour) st.t = st.ft / st.speed; sync(); });
        $(s, '.pl-go').onclick = () => { api.manual(); restart(); };
        $(s, '.pl-read').onclick = () => { if (st.tour) api.manual(); st.read = !st.read; sync(); };
        $(s, '.ck-tour').addEventListener('click', () => { pause(false); setTimeout(sync); });
        const plan = () => ({ order: P.orders[st.order].order, kick: st.kick, move: st.move });
        st.plan = plan;
        // live calls: click a creature for focus, its cast bar to interrupt; D to step out
        // a call made after scrubbing back replaces whatever was called later in that fight
        const call = c => { if (st.tour || st.read) return; const run = S.run(pk, plan(), st.calls); if (st.ft >= run.end.t) return; st.calls = [...st.calls.filter(q => q.t < st.ft), { ...c, t: +st.ft.toFixed(3) }]; st.logged = null; };
        // scrub: press on the timeline and drag; the fight pauses where you let go
        const onTimeline = (x, y) => y >= TL.ty - 8 && y <= TL.ty + TL.h + 4 && x >= TL.tx0 - 10 && x <= TL.tx1 + 10;
        const scrubTo = x => { const run = S.run(pk, plan(), st.calls); st.ft = clamp((x - TL.tx0) / (TL.tx1 - TL.tx0), 0, 1) * TL.span(run); st.ft = Math.min(st.ft, run.end.t); st.t = st.ft / st.speed; };
        pointer(api.cv, (x, y, type) => {
          if (type === 'down' && onTimeline(x, y) && !st.read) { if (st.tour) toManual(); pause(true); st.drag = true; scrubTo(x); return; }
          if (type === 'move' && st.drag) { scrubTo(x); return; }
          if (type === 'up') { st.drag = false; return; }
          if (type !== 'down' || st.tour || st.read) return;
          const run = S.run(pk, plan(), st.calls), fr = run.frames[Math.min(run.frames.length - 1, Math.floor(st.ft / S.DT))];
          for (const f of fr.foes) {
            if (!f.alive || f.hidden) continue; const k = K[P.foes[+f.id.slice(1)][0]];
            if (f.cast && Math.abs(x - (f.x + 4)) < 46 && y > f.y + k.r + 14 && y < f.y + k.r + 46) return call({ type: 'kick', id: f.id });
            if (Math.hypot(x - f.x, y - f.y) < k.r + 8) return call({ type: 'focus', id: f.id });
          }
        });
        s._key = e => { if ((e.key === 'd' || e.key === 'D') && pk === 'e2') call({ type: 'move' }); };
        const dodge = $(s, '.pl-dodge'); if (dodge) dodge.onclick = () => call({ type: 'move' });
        st._after = () => { if (st.histDirty) { st.histDirty = false; sync(); } };
        function sync() {
          $$(s, '.pl-order .btn').forEach(b => b.classList.toggle('on', !st.tour && b.dataset.v === st.order));
          $$(s, '.pl-kick .btn').forEach(b => b.classList.toggle('on', !st.tour && b.dataset.v === st.kick));
          $$(s, '.pl-move .btn').forEach(b => b.classList.toggle('on', !st.tour && b.dataset.v === st.move));
          $$(s, '.pl-speed .btn').forEach(b => b.classList.toggle('on', +b.dataset.v === st.speed));
          $(s, '.pl-read').classList.toggle('on', st.read);
          $(s, '.pl-hist').innerHTML = st.hist.length ? st.hist.map(h => {
            const [r, tone] = RESULT[h.end.result];
            return `<div class="${h.end.result}"><b>${r}</b><span>${planLabel(pk, h.plan).join(' · ')}${h.calls ? ` · ${h.calls} live call${h.calls > 1 ? 's' : ''}` : ''}</span><i>${h.end.result === 'timeout' ? '∞' : h.end.t.toFixed(0) + ' s'} · ${h.stats.hpLeft}%</i></div>`;
          }).join('') : '<p class="tip">Finished fights show up here, so you can compare plans.</p>';
        }
        api.sync = sync; sync();
      },
      draw(g, t, st, tour) {
        if (tour) {
          if (t >= T.read) {
            const sg = T.segs[T.segs.length - 1]; arena(g, pk, sg.run, sg.run.end.t); readCard(g, pk, ease(ph(t, T.read, T.read + .6)), T.segs.map(s => s.run)); return;
          }
          const sg = T.segs.find(s => t < s.t0 + s.len) || T.segs[0], ft = Math.min((t - sg.t0) * TOUR_SPEED, sg.run.end.t);
          arena(g, pk, sg.run, ft, { speed: TOUR_SPEED });
          banner(g, pk, sg.plan, { note: sg.note });
          const after = t - sg.t0 - sg.run.end.t / TOUR_SPEED;
          if (after > 0) resultCard(g, pk, sg.run, ease(clamp(after / .4)));
          return;
        }
        const run = S.run(pk, st.plan(), st.calls);
        st.ft = t * st.speed;
        const ft = Math.min(st.ft, run.end.t);
        if (st.ft >= run.end.t && st.logged !== run) {
          st.logged = run; st.histDirty = true; st.hist = [{ plan: run.plan, end: run.end, stats: run.stats, calls: st.calls.length }, ...st.hist].slice(0, 6);
        }
        if (st.seenRun !== run) { st.seenRun = run; st.seen = 0; }
        st.seen = Math.max(st.seen, ft);
        arena(g, pk, run, ft, { speed: st.speed, seen: st.seen });
        banner(g, pk, run.plan, { calls: st.calls.length });
        if (st.paused) { chip(g, st.drag ? 'Scrubbing' : 'Paused', S.W - 108, 22, { ...TONE.gold, size: 14, align: 'left', width: 96 }) ; }
        if (st.ft > run.end.t + .3 && !st.read) resultCard(g, pk, run, ease(clamp((st.ft - run.end.t - .3) / (.5 * st.speed))));
        if (st.read) readCard(g, pk, 1, []);
      },
      after(st) { st._after?.(); },
      side(t, st, tour) {
        if (tour) {
          const sg = t >= T.read ? null : T.segs.find(s => t < s.t0 + s.len);
          return { out: sg ? `<b>Walk-through.</b> ${sg.note}` : '<b>The slide’s read.</b> The creature tags explain the synergy, and the solution names the one target and the one cast that break it. Pick a plan and press ▶ Pull to try your own. Drag along the timeline to pause and scrub any fight.' };
        }
        const run = S.run(pk, st.plan(), st.calls), done = st.ft >= run.end.t;
        const help = pk === 'd1'
          ? 'Click a creature to call focus on it. Click a cast bar to interrupt that cast. Drag along the timeline to pause and scrub.'
          : 'Click a creature to call focus on it. Click a cast bar to interrupt it. Press <kbd>D</kbd> (or Step out) when a red circle appears under someone. Drag along the timeline to pause and scrub.';
        return { out: done ? `<b>${RESULT[run.end.result][0]}.</b> Change one choice and pull again, or open the slide’s read.` : help };
      },
    });
  }
  pullScene('d1');
  pullScene('e2');


  /* ---------- title: the two pulls' creatures ---------- */
  CK.scene('pulls-title', {
    dur: 8,
    draw(g, t) {
      const W = 560, H = 120, ks = ['inv_pet_toad_black', 'inv_misc_head_murloc_01', 'ability_hunter_pet_wasp', 'spell_magic_polymorphrabbit', 'inv_foxpet', 'ability_hunter_pet_crab'];
      ks.forEach((n, i) => token(g, n, 50 + i * 92, 60 + Math.sin(t * 2 + i) * 5, 34, '#d8322a'));
    },
  });

  // D for the 2-E slide's live call
  addEventListener('keydown', e => { const s = document.querySelector('section.slide.active[data-demo="pull-e2"]'); if (s && s._key) s._key(e); });
})();
