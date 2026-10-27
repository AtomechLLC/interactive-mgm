/* Mechanical counters (MGM course 4, module 5, deck slide 96): "Magic buffs removed by dispel, hostile curses removed by
   remove curse, poisons removed by cleanse, spell bars cancelled by interrupts." The speaker note says these have no
   good visuals, so this is a tiny raid encounter: the boss throws one of the four at the party every second or two and
   you press the counter. sim() replays a fixed event schedule plus the presses up to any time t, so the live game,
   the autoplay demo and window.__seek (for the GIF) all show the same fight. Icons and frames are drawn here. */
(function () {
  const { $, $$, canvasDemo, demo, say } = FPF.kit;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const TAU = Math.PI * 2;

  // the slide's four rows: what the boss does, what removes it, and what it costs if you leave it
  const KINDS = {
    buff: { name: 'Magic buff', on: 'the boss', counter: 'dispel', col: '#3d8bff', cost: 'the boss hits 50% harder' },
    curse: { name: 'Hostile curse', on: 'an ally', counter: 'decurse', col: '#8a4fd6', cost: 'the ally loses health every second' },
    poison: { name: 'Poison', on: 'an ally', counter: 'cleanse', col: '#2f9e44', cost: 'the ally loses health faster' },
    cast: { name: 'Spell bar', on: 'the boss', counter: 'interrupt', col: '#e8780c', cost: 'Shadow Volley hits the whole party' },
  };
  const COUNTERS = { dispel: 'Dispel', decurse: 'Remove Curse', cleanse: 'Cleanse', interrupt: 'Interrupt' };
  const CKEYS = Object.keys(COUNTERS);
  const KIND_OF = Object.fromEntries(Object.entries(KINDS).map(([k, v]) => [v.counter, k]));
  // classic-era toolkits, simplified: who brings which counter
  const CLASSES = {
    all: { name: 'Everything', col: '#ffb951', has: CKEYS },
    priest: { name: 'Priest', col: '#e8e8f0', has: ['dispel'] },
    mage: { name: 'Mage', col: '#69ccf0', has: ['decurse', 'interrupt'] },
    druid: { name: 'Druid', col: '#ff7d0a', has: ['decurse', 'cleanse'] },
    shaman: { name: 'Shaman', col: '#2459ff', has: ['dispel', 'cleanse', 'interrupt'] },
    rogue: { name: 'Rogue', col: '#fff569', has: ['interrupt'] },
  };
  const ALLIES = [['Thrall', 'shaman'], ['Jaina', 'mage'], ['Anduin', 'priest'], ['Malfurion', 'druid'], ['Valeera', 'rogue']];
  const CAST = 2.4, GCD = .8, VOLLEY = 22;

  /* ---------- the boss's schedule: seeded, so every replay is the same fight ---------- */
  function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function schedule(seed = 7, len = 400) {
    const r = rng(seed), ev = []; let t = 1.2, castEnd = -1;
    const order = ['buff', 'curse', 'poison', 'cast'];
    while (t < len) {
      let kind = ev.length < 4 ? order[ev.length] : order[Math.floor(r() * 4)];
      if (kind === 'cast' && t < castEnd + .4) kind = 'curse';
      const e = { t, kind, ally: kind === 'curse' || kind === 'poison' ? Math.floor(r() * 5) : -1, id: ev.length };
      if (kind === 'cast') castEnd = t + CAST;
      ev.push(e);
      t += 1.5 + r() * 1.1;
    }
    return ev;
  }
  const EVENTS = schedule();

  /* ---------- replay: events plus presses up to time t ---------- */
  // presses: [{t, c}] sorted by time. Returns the active effects, party health and a log of what happened.
  function sim(presses, t, step = 1 / 30) {
    const hp = ALLIES.map(() => 100), active = [], log = [];
    let ei = 0, pi = 0, lastPress = -9, wipes = 0;
    for (let now = 0; now <= t + 1e-9; now += step) {
      while (ei < EVENTS.length && EVENTS[ei].t <= now) { const e = EVENTS[ei++]; active.push({ ...e, since: e.t }); }
      while (pi < presses.length && presses[pi].t <= now) {
        const p = presses[pi++];
        if (p.t - lastPress < GCD) { log.push({ t: p.t, c: p.c, res: 'gcd' }); continue; }
        lastPress = p.t;
        const kind = KIND_OF[p.c], hit = active.filter(a => a.kind === kind).sort((a, b) => a.since - b.since)[0];
        if (hit) { active.splice(active.indexOf(hit), 1); log.push({ t: p.t, c: p.c, res: 'ok', e: hit }); }
        else log.push({ t: p.t, c: p.c, res: 'waste' });
      }
      const enraged = active.some(a => a.kind === 'buff');
      // casts that finish go off
      for (let i = active.length - 1; i >= 0; i--) {
        const a = active[i];
        if (a.kind === 'cast' && now - a.since >= CAST) { active.splice(i, 1); hp.forEach((v, j) => hp[j] = v - VOLLEY * (enraged ? 1.5 : 1)); log.push({ t: now, res: 'volley', e: a }); }
      }
      hp.forEach((v, j) => {
        let d = -6 * step;                                   // the healers keep up with a clean fight
        if (j === 0) d += (enraged ? 12 : 4) * step;          // the tank takes the boss's melee
        active.forEach(a => { if (a.ally === j) d += (a.kind === 'curse' ? 9 : 13) * step; });
        hp[j] = clamp(v - d, 0, 100);
      });
      if (hp.filter(v => v <= 0).length >= 3) { wipes++; hp.fill(100); active.length = 0; log.push({ t: now, res: 'wipe' }); }
    }
    return { hp, active, log, lastPress, wipes, t };
  }

  // the demo's player: presses the right counter about 1 s after each effect appears, but misses one cast and one curse
  function botPresses(cls = 'all', until = 60) {
    const has = CLASSES[cls].has, out = []; let last = -9;
    EVENTS.filter(e => e.t < until).forEach((e, i) => {
      const c = KINDS[e.kind].counter;
      if (!has.includes(c) || i === 6 || i === 11) return;
      const t = Math.max(e.t + 1.1, last + GCD + .05);
      out.push({ t, c }); last = t;
    });
    return out.sort((a, b) => a.t - b.t);
  }

  /* ---------- drawing ---------- */
  function icon(g, kind, x, y, r, a = 1) {
    g.save(); g.globalAlpha *= a; g.translate(x, y);
    const k = KINDS[kind];
    g.fillStyle = '#152044'; g.strokeStyle = k.col; g.lineWidth = Math.max(2, r * .14);
    g.beginPath(); g.roundRect(-r, -r, 2 * r, 2 * r, r * .25); g.fill(); g.stroke();
    g.fillStyle = k.col; g.strokeStyle = k.col;
    if (kind === 'buff') { for (let i = 0; i < 4; i++) { g.save(); g.rotate(i * Math.PI / 4); g.beginPath(); g.moveTo(0, -r * .7); g.lineTo(r * .14, 0); g.lineTo(0, r * .7); g.lineTo(-r * .14, 0); g.fill(); g.restore(); } }
    if (kind === 'curse') { g.beginPath(); g.arc(0, -r * .1, r * .45, 0, TAU); g.fill(); g.fillRect(-r * .28, r * .2, r * .56, r * .32); g.fillStyle = '#152044'; g.beginPath(); g.arc(-r * .17, -r * .12, r * .11, 0, TAU); g.arc(r * .17, -r * .12, r * .11, 0, TAU); g.fill(); }
    if (kind === 'poison') { g.beginPath(); g.moveTo(0, -r * .7); g.quadraticCurveTo(r * .55, 0, r * .4, r * .25); g.arc(0, r * .25, r * .4, 0, Math.PI); g.quadraticCurveTo(-r * .55, 0, 0, -r * .7); g.fill(); }
    if (kind === 'cast') { g.lineWidth = r * .18; g.beginPath(); g.moveTo(-r * .5, r * .5); g.lineTo(r * .35, -r * .35); g.stroke(); g.beginPath(); g.arc(r * .4, -r * .4, r * .22, 0, TAU); g.fill(); }
    g.restore();
  }
  function text(g, s, x, y, o = {}) {
    g.font = `${o.w || 600} ${o.size || 18}px ${o.f || 'Jost'}, sans-serif`; g.textAlign = o.align || 'left'; g.textBaseline = 'middle';
    g.fillStyle = o.col || '#262c6a'; g.fillText(s, x, y);
  }
  function popT(g, s, x, y, col, a) {
    if (a <= 0) return;
    g.save(); g.globalAlpha = clamp(a, 0, 1); g.font = '800 24px Montserrat, Jost, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 6; g.strokeStyle = '#fffaf0'; g.strokeText(s, x, y); g.fillStyle = col; g.fillText(s, x, y); g.restore();
  }
  // the encounter: boss at the top, cast bar under it, the party's frames along the bottom
  function scene(g, W, H, S, t, o = {}) {
    g.clearRect(0, 0, W, H);
    const BX = W / 2, BY = 150;
    const enraged = S.active.some(a => a.kind === 'buff');
    // boss
    g.save(); g.translate(BX, BY);
    const pulse = enraged ? 1 + .04 * Math.sin(t * 10) : 1;
    g.scale(pulse, pulse);
    g.fillStyle = 'rgba(40,30,20,.2)'; g.beginPath(); g.ellipse(6, 70, 90, 20, 0, 0, TAU); g.fill();
    g.fillStyle = enraged ? '#c22a24' : '#5b2a6e'; g.strokeStyle = '#152044'; g.lineWidth = 5;
    g.beginPath(); g.arc(0, 0, 66, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#fff2d8'; [-1, 1].forEach(sg => { g.beginPath(); g.moveTo(sg * 30, -46); g.lineTo(sg * 64, -96); g.lineTo(sg * 48, -40); g.fill(); g.stroke(); });
    g.fillStyle = enraged ? '#ffd23f' : '#ff6a5c'; g.beginPath(); g.arc(-22, -6, 9, 0, TAU); g.arc(22, -6, 9, 0, TAU); g.fill();
    g.restore();
    text(g, 'Lord of the Raid', BX, BY - 124, { align: 'center', w: 800, f: 'Montserrat', size: 20 });
    // boss buffs
    S.active.filter(a => a.kind === 'buff').forEach((a, i) => { icon(g, 'buff', BX + 96 + i * 46, BY - 44, 19); });
    if (enraged) popT(g, 'Empowered!', BX - 150, BY - 40, '#3d8bff', 1);
    // cast bar
    const cast = S.active.find(a => a.kind === 'cast');
    const cbx = BX - 190, cby = BY + 92;
    g.fillStyle = 'rgba(21,32,68,.85)'; g.beginPath(); g.roundRect(cbx - 4, cby - 4, 388, 34, 8); g.fill();
    if (cast) {
      const k = clamp((t - cast.since) / CAST, 0, 1);
      g.fillStyle = '#e8780c'; g.fillRect(cbx, cby, 380 * k, 26);
      text(g, `Shadow Volley  ${(CAST * (1 - k)).toFixed(1)} s`, BX, cby + 13, { align: 'center', col: '#fff', size: 17 });
    } else text(g, 'not casting', BX, cby + 13, { align: 'center', col: '#8a93bd', size: 16 });
    // party frames
    const fw = 230, gap = 18, fx0 = (W - (fw * 5 + gap * 4)) / 2, fy = H - 128;
    ALLIES.forEach(([name, cl], j) => {
      const x = fx0 + j * (fw + gap), v = S.hp[j];
      g.fillStyle = '#fffaf0'; g.strokeStyle = '#cdbf9f'; g.lineWidth = 2; g.beginPath(); g.roundRect(x, fy, fw, 104, 10); g.fill(); g.stroke();
      g.fillStyle = CLASSES[cl].col; g.fillRect(x, fy, 8, 104);
      text(g, name, x + 20, fy + 20, { w: 700, size: 19, f: 'Montserrat' });
      text(g, CLASSES[cl].name + (j === 0 ? ' · tank' : ''), x + 20, fy + 42, { size: 15, col: '#5d618c' });
      g.fillStyle = '#e6dcc6'; g.fillRect(x + 20, fy + 58, fw - 40, 14);
      g.fillStyle = v > 50 ? '#2f9e44' : v > 25 ? '#e0a92d' : '#cf2f3b'; g.fillRect(x + 20, fy + 58, (fw - 40) * v / 100, 14);
      S.active.filter(a => a.ally === j).forEach((a, i) => icon(g, a.kind, x + 34 + i * 34, fy + 88, 13));
    });
    // what just happened
    S.log.forEach(l => {
      const k = t - l.t; if (k < 0 || k > 1.1) return;
      const a = 1 - k / 1.1, dy = -30 * k;
      if (l.res === 'ok') {
        const e = l.e;
        const x = e.ally >= 0 ? fx0 + e.ally * (fw + gap) + fw / 2 : BX, y = e.ally >= 0 ? fy - 18 : BY + 150;
        popT(g, `${COUNTERS[l.c]}!`, x, y + dy, '#1a8a4c', a);
      } else if (l.res === 'waste') popT(g, `Nothing to ${COUNTERS[l.c].toLowerCase()}`, BX + 260, BY + 40 + dy, '#b36b05', a);
      else if (l.res === 'volley') popT(g, `Shadow Volley: −${Math.round(VOLLEY * (enraged ? 1.5 : 1))} to everyone`, W / 2, fy - 40 + dy, '#cf2f3b', a);
      else if (l.res === 'wipe') popT(g, 'Wipe! Run it back', W / 2, H / 2 + dy, '#cf2f3b', a);
    });
    // the next effect's warning lines, so you can see what each counter is for
    if (o.legend !== false) {
      let y = 40;
      Object.entries(KINDS).forEach(([k, v]) => { icon(g, k, 34, y, 13); text(g, `${v.name} → ${COUNTERS[v.counter]}`, 56, y, { size: 16 }); y += 34; });
    }
  }

  /* ---------- slide 2: the slide's four rows, each animated ---------- */
  canvasDemo('rows', (s, c, g) => {
    const W = c.width, H = c.height, rows = Object.keys(KINDS), RH = H / 4;
    return (dt, t) => {
      g.clearRect(0, 0, W, H);
      rows.forEach((k, i) => {
        const y = i * RH + RH / 2, u = (t + i * .7) % 4, v = KINDS[k];
        // effect lands, sits, the counter flies in and removes it
        const appear = clamp(u / .3, 0, 1), fly = clamp((u - 1.2) / .6, 0, 1), gone = u > 1.8;
        icon(g, k, 140, y, 34, gone ? clamp(1 - (u - 1.8) / .3, 0, 1) : appear);
        if (k === 'cast' && !gone) { g.fillStyle = 'rgba(21,32,68,.2)'; g.fillRect(200, y + 22, 300, 10); g.fillStyle = '#e8780c'; g.fillRect(200, y + 22, 300 * clamp(u / 2.4, 0, 1), 10); }
        text(g, v.name, 200, y - 8, { w: 800, f: 'Montserrat', size: 26 });
        text(g, `on ${v.on}; left alone, ${v.cost}`, 200, y + (k === 'cast' ? 48 : 22), { size: 17, col: '#5d618c' });
        g.strokeStyle = '#b9a578'; g.lineWidth = 3; g.setLineDash([8, 8]); g.beginPath(); g.moveTo(760, y); g.lineTo(980, y); g.stroke(); g.setLineDash([]);
        text(g, k === 'cast' ? 'cancelled by' : 'removed by', 870, y - 18, { align: 'center', size: 15, col: '#5d618c' });
        // the counter waits on the right, flies onto the effect, and is back in place for the next round
        const bx = u > 1.8 ? 1180 : lerp(1180, 150, fly), bAlpha = u < 1.8 ? 1 : clamp((u - 2.8) / .3, 0, 1);
        g.save(); g.globalAlpha = bAlpha; g.fillStyle = '#152044'; g.strokeStyle = '#ffb951'; g.lineWidth = 3;
        g.beginPath(); g.roundRect(bx - 110, y - 24, 220, 48, 10); g.fill(); g.stroke();
        text(g, COUNTERS[v.counter], bx, y + 1, { align: 'center', col: '#ffb951', w: 800, f: 'Montserrat', size: 21 }); g.restore();
        if (u > 1.8 && u < 2.8) popT(g, k === 'cast' ? 'Interrupted!' : 'Removed!', 140, y - 46, '#1a8a4c', 1 - (u - 1.8));
      });
    };
  });

  /* ---------- slide 3: the encounter ---------- */
  let fightApi = null;
  canvasDemo('fight', (s, c, g) => {
    const W = c.width, H = c.height, out = $(s, '.ft-out'), btns = $(s, '.ft-btns'), cls = $(s, '.ft-cls');
    const st = { t: 0, presses: [], cls: 'all', demo: true, held: false, msg: '' };
    let demoP = botPresses('all', 400);
    btns.innerHTML = CKEYS.map((k, i) => `<button class="ab" data-c="${k}"><kbd>${i + 1}</kbd><span>${COUNTERS[k]}</span><i></i></button>`).join('');
    cls.innerHTML = Object.entries(CLASSES).map(([k, v]) => `<button class="btn sm" data-k="${k}">${v.name}</button>`).join('');
    const press = c => {
      if (!CLASSES[st.cls].has.includes(c)) return;
      if (st.demo) { st.demo = false; st.t = 0; st.presses = []; }
      st.presses.push({ t: st.t, c });
    };
    $$(btns, '.ab').forEach(b => b.onclick = () => press(b.dataset.c));
    $$(cls, 'button').forEach(b => b.onclick = () => { st.cls = b.dataset.k; demoP = botPresses(st.cls, 400); st.t = 0; st.presses = []; });
    $(s, '.ft-demo').onclick = () => { st.demo = true; st.t = 0; };
    $(s, '.ft-play').onclick = () => { st.demo = false; st.t = 0; st.presses = []; };
    s._key = e => { const i = +e.key - 1; if (i >= 0 && i < 4) press(CKEYS[i]); };
    function render() {
      const P = st.demo ? demoP : st.presses, S = sim(P, st.t);
      scene(g, W, H, S, st.t);
      const has = CLASSES[st.cls].has, now = st.t;
      $$(btns, '.ab').forEach(b => {
        const c = b.dataset.c, own = has.includes(c), need = S.active.some(a => KINDS[a.kind].counter === c);
        b.classList.toggle('off', !own); b.classList.toggle('need', own && need);
        const recent = P.filter(p => p.c === c && p.t <= now && now - p.t < .25).length;
        b.classList.toggle('hit', recent > 0);
        b.querySelector('i').style.transform = `scaleY(${clamp(1 - (now - S.lastPress) / GCD, 0, 1)})`;
      });
      $$(cls, 'button').forEach(b => b.classList.toggle('on', b.dataset.k === st.cls));
      $(s, '.ft-demo').classList.toggle('on', st.demo);
      const missing = CKEYS.filter(c => !has.includes(c)), stuck = S.active.filter(a => missing.includes(KINDS[a.kind].counter));
      const msg = st.cls === 'all'
        ? (st.demo ? '<b>Watch the demo player:</b> each effect gets its counter about a second later. One curse and one cast slip through, and you can see what they cost.' : '<b>Your turn.</b> Press 1 to 4 (or click). Each counter removes the oldest effect of its kind; pressing the wrong one wastes your global cooldown.')
        : `<b>As a ${CLASSES[st.cls].name}</b> you bring ${has.map(c => COUNTERS[c]).join(' and ')}. ${missing.length ? `${missing.map(c => KINDS[KIND_OF[c]].name.toLowerCase() + 's').join(', ')} need someone else in the raid` : ''}${stuck.length ? `, and right now ${stuck.length} of them ${stuck.length === 1 ? 'is' : 'are'} hurting the party.` : '.'} Each class gets its own things to watch for.`;
      if (msg !== st.msg) { st.msg = msg; say(out, msg); }
    }
    fightApi = { seek(t) { st.held = true; st.demo = true; st.cls = 'all'; demoP = botPresses('all', 400); st.t = t; render(); }, dur: () => 24 };
    // the fight resets every 90 s so the replay stays cheap
    return dt => { if (!st.held) st.t += dt; if (st.t > 90) { st.t = 0; st.presses = []; } render(); };
  }, {
    enter(s) { s._k = e => s._key(e); addEventListener('keydown', s._k); },
    leave(s) { removeEventListener('keydown', s._k); },
  });

  /* ---------- slide 1: title ---------- */
  canvasDemo('title', (s, c, g) => (dt, t) => {
    g.clearRect(0, 0, c.width, c.height);
    Object.keys(KINDS).forEach((k, i) => icon(g, k, 80 + i * 190, 60 + Math.sin(t * 2 + i) * 6, 40));
  });

  window.__seek = t => fightApi.seek(t);
  window.__dur = () => fightApi.dur();
})();
