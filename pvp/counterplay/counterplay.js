/* Three Forms of Counterplay (MGM C4 M4, part 4): the slide demos.
   Slide 2: old Sion's point-and-click stun vs new Sion's charge-up Decimating Smash, against a target with a reaction time.
   Slide 3: sort the deck's examples into systemic, situational and specialized counterplay.
   Slide 4: the deck's counterplay chain (attack, five responses, five answers); delete an answer to make a silver bullet.
   Slide 5: the skillshot counterplay cycle, played against a Lux who reads your habits.
   Each demo is a pure function of its settings and a time, exposed to the GIF recorder as window.__seek / __dur. */
(function () {
  const { $, $$, canvasDemo, demo, say } = FPF.kit;
  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const W = 1040, H = 585;
  const C = {
    navy: '#152044', ink: '#262c6a', muted: '#5d618c', line: '#cdbf9f', paper: 'rgba(255,252,244,.82)', floor: '#ddd2bc',
    blue: '#2ea3dc', red: '#e5322d', redLt: 'rgba(229,50,45,.18)', purple: '#8a4fd6', gold: '#e0a92d', goldInk: '#9a5a06', green: '#2fae63',
  };
  const IMG = {};
  const LOL = '../../student-tokens/256px/league-of-legends/';
  [['sionOld', 'img/Sion-old.png'], ['sionNew', 'img/Sion.png'], ['gaze', 'img/CrypticGaze.png'], ['smash', 'img/SionQ.png'], ['roar', 'img/SionE.png'],
    ['bind', 'img/LuxLightBinding.png'], ['lux', LOL + 'champ-lux-token-enemy.png'], ['luxP', LOL + 'champ-lux-token-player.png'], ['jinx', LOL + 'champ-jinx-token-player.png']]
    .forEach(([k, src]) => { const i = new Image(); i.src = src; IMG[k] = i; });
  const ready = i => i && i.complete && i.naturalWidth;
  function img(g, k, x, y, s, { a = 1, round = false, ring = null } = {}) {
    if (!ready(IMG[k])) return;
    g.save(); g.globalAlpha *= a;
    if (round) { g.beginPath(); g.arc(x, y, s / 2, 0, TAU); g.clip(); }
    g.drawImage(IMG[k], x - s / 2, y - s / 2, s, s); g.restore();
    if (ring) { g.strokeStyle = ring; g.lineWidth = 5; g.beginPath(); g.arc(x, y, s / 2, 0, TAU); g.stroke(); }
  }
  function text(g, t, x, y, { col = C.ink, size = 15, weight = 600, align = 'center' } = {}) {
    g.font = `${weight} ${size}px Jost, sans-serif`; g.fillStyle = col; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(t, x, y);
  }
  function pill(g, t, x, y, bg, fg = '#fff', size = 14) {
    g.font = `700 ${size}px Jost, sans-serif`; const w = g.measureText(t).width + 18, h = size + 12;
    g.fillStyle = bg; g.beginPath(); g.roundRect(x - w / 2, y - h / 2, w, h, h / 2); g.fill();
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, x, y + 1);
  }
  function panel(g, x, y, w, h) { g.fillStyle = C.paper; g.beginPath(); g.roundRect(x, y, w, h, 14); g.fill(); }
  function swirl(g, x, y, t) {
    g.strokeStyle = C.gold; g.lineWidth = 3;
    for (let i = 0; i < 3; i++) { const a = t * 6 + i * TAU / 3; g.beginPath(); g.arc(x + Math.cos(a) * 16, y - 46 + Math.sin(a) * 5, 5, 0, TAU); g.stroke(); }
  }
  const hash = n => { let x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

  /* =====================================================================
     Slide 2: old Sion vs new Sion
     ===================================================================== */
  const SION = { cyc: 2.8, cast: 0.35, dist: 600, half: 85, tgtR: 34, speed: 330, jitter: 0.12, casts: 10 };
  const sion = { react: 450, charge: 0.8, t: 0, held: false };
  const reactOf = (n, s) => s.react / 1000 + (hash(n) - 0.5) * 2 * SION.jitter;
  // new Sion: does the target walk out of the telegraph before the smash lands?
  const needOut = () => (SION.half + SION.tgtR) / SION.speed;
  const smashHits = (n, s) => reactOf(n, s) + needOut() > s.charge;
  function sionDraw(g, s, t) {
    g.clearRect(0, 0, W, H);
    const n = Math.floor(t / SION.cyc), lt = t - n * SION.cyc, k = 0.95;
    const rows = [
      { y0: 0, key: 'old', title: 'Old Sion · Cryptic Gaze', sub: 'point and click: the stun works 100% of the time', icon: 'gaze', champ: 'sionOld', ring: C.red },
      { y0: 296, key: 'new', title: 'New Sion · Decimating Smash', sub: `charge up for ${s.charge.toFixed(1)} s, then stun everyone still inside`, icon: 'smash', champ: 'sionNew', ring: C.red },
    ];
    rows.forEach(r => {
      panel(g, 0, r.y0, W, 280);
      img(g, r.icon, 34, r.y0 + 32, 40);
      text(g, r.title, 64, r.y0 + 24, { col: C.navy, size: 18, align: 'left', weight: 700 });
      text(g, r.sub, 64, r.y0 + 46, { col: C.muted, size: 14, align: 'left' });
      const LY = r.y0 + 182, SX = 120, TX = SX + SION.dist * k;
      g.fillStyle = C.floor; g.fillRect(40, r.y0 + 64, 800, 206);
      // the target's reaction: it starts walking out after its reaction time
      const re = reactOf(n, s), go = SION.cast + re;
      let off = 0, hit = null, stunT = null;
      if (r.key === 'old') {
        hit = true; stunT = SION.cast + 0.08;
        // the target tries to move, but the stun lands first
        off = lt > go && lt < stunT ? (lt - go) * SION.speed : 0;
        if (lt >= SION.cast && lt < SION.cast + 0.18) {
          g.strokeStyle = C.purple; g.lineWidth = 8; g.globalAlpha = 1 - (lt - SION.cast) / 0.18;
          g.beginPath(); g.moveTo(SX + 40, LY); g.lineTo(TX - 30, LY); g.stroke(); g.globalAlpha = 1;
        }
      } else {
        const land = SION.cast + s.charge;
        hit = smashHits(n, s);
        const moveEnd = hit ? land : Math.max(land, go + needOut() + 0.15);
        off = lt > go ? (Math.min(lt, moveEnd) - go) * SION.speed : 0;
        if (hit && lt > land) off = (land - go) * SION.speed;
        off = Math.max(0, off);
        stunT = hit ? land : null;
        // the telegraph fills while Sion charges
        if (lt >= SION.cast && lt < land + 0.35) {
          const q = clamp((lt - SION.cast) / s.charge);
          g.fillStyle = 'rgba(229,50,45,.12)'; g.fillRect(SX + 30, LY - SION.half * k, (SION.dist + 80) * k, 2 * SION.half * k);
          g.fillStyle = 'rgba(229,50,45,.28)'; g.fillRect(SX + 30, LY - SION.half * k, (SION.dist + 80) * k * q, 2 * SION.half * k);
          g.strokeStyle = C.red; g.lineWidth = 2; g.strokeRect(SX + 30, LY - SION.half * k, (SION.dist + 80) * k, 2 * SION.half * k);
          if (lt >= land) { g.fillStyle = `rgba(229,50,45,${.5 * (1 - (lt - land) / .35)})`; g.fillRect(SX + 30, LY - SION.half * k, (SION.dist + 80) * k, 2 * SION.half * k); }
        }
        // walking back to the lane for the next cast
        if (lt > SION.cyc - 0.6) off *= clamp((SION.cyc - lt) / 0.6);
      }
      if (r.key === 'old' && lt > SION.cyc - 0.6) off = 0;
      const ty = LY - off * k;   // the target walks up, out of the lane
      img(g, r.champ, SX, LY, 76, { round: true, ring: r.ring });
      img(g, 'luxP', TX, ty, 68);
      const stunned = stunT !== null && lt >= stunT && lt < stunT + 1.3;
      if (stunned) { swirl(g, TX, ty, lt); pill(g, 'STUNNED', TX + 96, ty, C.red); }
      if (r.key === 'new' && !hit && lt >= SION.cast + s.charge && lt < SION.cast + s.charge + 1.3) pill(g, 'DODGED', TX + 96, ty, C.green);
      if (lt > go && lt < go + 0.5 && lt > SION.cast) text(g, `reacts at ${Math.round(re * 1000)} ms`, TX, LY - 64, { col: C.blue, size: 13 });
      // tally: the last ten casts
      const tx0 = 860;
      text(g, 'last 10 casts', 950, r.y0 + 78, { col: C.muted, size: 13 });
      let stuns = 0;
      for (let i = 0; i < SION.casts; i++) {
        const m = n - (SION.casts - 1) + i, done = m < n || lt >= (r.key === 'old' ? SION.cast + 0.1 : SION.cast + s.charge);
        const h = m < 0 ? null : r.key === 'old' ? true : smashHits(m, s);
        if (h && done && m >= 0) stuns++;
        const x = tx0 + (i % 5) * 36 + 18, y = r.y0 + 112 + Math.floor(i / 5) * 40;
        g.fillStyle = m < 0 || !done ? '#eee6d3' : h ? C.red : C.green; g.beginPath(); g.arc(x, y, 14, 0, TAU); g.fill();
        if (m >= 0 && done) text(g, h ? '✕' : '✓', x, y + 1, { col: '#fff', size: 14, weight: 700 });
      }
      text(g, `${stuns} stunned`, 950, r.y0 + 214, { col: stuns ? C.red : C.green, size: 20, weight: 700 });
    });
    return null;
  }
  function sionTally(s) { let h = 0; for (let i = 0; i < 20; i++) h += smashHits(i, s) ? 1 : 0; return h / 20; }
  let sionApi = null;
  canvasDemo('sion', (sl, cv, g) => {
    const st = sion, ui = { react: $(sl, '.i-react'), charge: $(sl, '.i-charge') };
    let last = '';
    ui.react.value = st.react; ui.charge.value = st.charge;
    ui.react.oninput = () => { st.react = +ui.react.value; };
    ui.charge.oninput = () => { st.charge = +ui.charge.value; };
    function render() {
      sionDraw(g, st, st.t);
      const key = st.react + '|' + st.charge; if (key === last) return; last = key;
      $(sl, '.v-react').textContent = st.react + ' ms'; $(sl, '.v-charge').textContent = st.charge.toFixed(1) + ' s';
      const rate = sionTally(st), window_ = Math.round((st.charge - needOut()) * 1000);
      say($(sl, '.st'), `<div class="r"><b>100%</b><span>old Sion: stuns landed, at any reaction time</span></div><div class="${rate > .5 ? 'r' : 'g'}"><b>${Math.round(rate * 100)}%</b><span>new Sion: stuns landed at ${st.react} ms</span></div>`);
      say($(sl, '.out1'), `Old Sion’s stun had no play pattern to answer: click, stunned. New Sion telegraphs the same stun, so the target has a ${window_ > 0 ? `${window_} ms` : 'zero'} window to react and walk out. ${window_ <= 0 ? 'With a charge this short, nobody can react in time: counterplay is gone again.' : rate > .8 ? 'A slow reaction still gets caught, so skill decides the outcome.' : 'A quick reaction escapes almost every time; Sion has to land it when the target is distracted or trapped.'} Counterplay is a side effect of well-thought-out play patterns.`);
    }
    const DUR = SION.cyc * 4;
    sionApi = { seek(t) { st.held = true; st.t = t; render(); }, dur: () => DUR };
    return dt => { if (!st.held) st.t += dt; render(); };
  });

  /* =====================================================================
     Slide 3: sort the deck's examples
     ===================================================================== */
  const I = '../../student-tokens/256px/';
  const FORMS = { sys: 'Systemic', sit: 'Situational', spe: 'Specialized' };
  const CARDS = [
    { n: 'Blocking', g: 'Dark Souls', i: 'icons-actions-and-keywords/shield-impact', f: 'sys', why: 'Every character can raise a guard against almost any attack. It comes with the core controls.' },
    { n: 'Anti-air attacks', g: 'Guilty Gear Strive', i: 'icons-actions-and-keywords/high-kick', f: 'sit', why: 'Only works when the opponent jumps. The situation has to happen before the answer exists.' },
    { n: 'Shotel', g: 'Dark Souls', i: 'icons-weapons/curvy-knife', f: 'spe', why: 'A weapon you choose because its curved swings get around raised shields: preparation that beats one habit.' },
    { n: 'Smoke grenades', g: 'Counter-Strike 2', i: 'icons-elements-and-hazards/smoke-bomb', f: 'sit', why: 'Shuts a sightline only where it lands and only while it lasts. It answers a position at a moment.' },
    { n: 'Universal defense', g: 'Street Fighter', i: 'icons-actions-and-keywords/dodging', f: 'sys', why: 'Every fighter can block, walk back and jump. The same options answer every opponent.' },
    { n: 'Parrying', g: 'Dark Souls', i: 'icons-actions-and-keywords/sword-clash', f: 'spe', why: 'A precise, timed tool tied to specific equipment. High reward against attacks you can read, high risk otherwise.' },
    { n: 'Knockdown options', g: 'Super Smash Bros. Melee', i: 'icons-actions-and-keywords/heavy-fall', f: 'sit', why: 'Get-up rolls, get-up attacks and teching only exist once you are knocked down.' },
    { n: 'Molotovs', g: 'Counter-Strike 2', i: 'icons-elements-and-hazards/fire-bomb', f: 'spe', why: 'A tool you buy to flush players out of specific corners: it answers one kind of position very well.' },
    { n: 'Scouting', g: 'StarCraft: Brood War', i: 'icons-actions-and-keywords/radar-sweep', f: 'sit', why: 'Only pays off when the opponent commits to something you can see and react to.' },
    { n: 'Shields', g: 'Dark Souls', i: 'icons-weapons/round-shield', f: 'spe', why: 'Gear you choose to carry, trading a weapon hand and stamina for a stronger guard.' },
    { n: 'Moving and aiming', g: 'Counter-Strike 2', i: 'icons-actions-and-keywords/crosshair', f: 'sys', why: 'Strafing, peeking and aiming are available to every player in every round.' },
    { n: 'Anti-magic shield', g: 'League of Legends', i: 'icons-actions-and-keywords/magic-shield', f: 'sit', why: 'Only matters when a spell is coming at you; against autoattacks it does nothing.' },
    { n: 'Character moveset', g: 'Guilty Gear Strive', i: 'icons-actions-and-keywords/punch-blast', f: 'spe', why: 'Moves only some characters have, built to answer particular threats. You pick them when you pick the character.' },
  ];
  const sort = { pick: 0, placed: {}, last: null };
  let sortApi = null;
  demo('sort', {
    init(sl) {
      const st = sort, box = $(sl, '.so-cards'), out = $(sl, '.so-out');
      box.innerHTML = CARDS.map((c, i) => `<button class="so-card" data-i="${i}"><img src="${I}${c.i}.png" alt=""><b>${c.n}</b><small>${c.g}</small><span class="tag"></span></button>`).join('');
      function draw() {
        $$(box, '.so-card').forEach((b, i) => {
          const p = st.placed[i]; b.className = 'so-card' + (i === st.pick ? ' pick' : '') + (p ? ' placed ' + p : '');
          const tag = $(b, '.tag'); tag.className = 'tag' + (p ? (p === CARDS[i].f ? ' ok' : ' no') : ''); tag.textContent = p ? (p === CARDS[i].f ? '✓' : '✕') : '';
        });
        const n = Object.keys(st.placed).length, right = Object.entries(st.placed).filter(([i, f]) => CARDS[i].f === f).length;
        if (st.last !== null) {
          const c = CARDS[st.last], p = st.placed[st.last];
          say(out, `${p === c.f ? '<b class="good">Yes.</b>' : `<b class="bad">Not quite:</b> the deck files it as`} <b class="b-${c.f}">${FORMS[c.f]}</b>. ${c.why}${n === CARDS.length ? `<br><b>${right} of ${CARDS.length} right.</b>` : ''}`);
        } else say(out, `<b>${CARDS[st.pick].n}</b> (${CARDS[st.pick].g}). Systemic, situational or specialized?`);
      }
      function place(f) {
        if (st.pick === null) return;
        st.placed[st.pick] = f; st.last = st.pick;
        const next = CARDS.findIndex((_, i) => !(i in st.placed)); st.pick = next < 0 ? null : next; draw();
      }
      $$(box, '.so-card').forEach(b => b.onclick = () => { st.pick = +b.dataset.i; st.last = st.placed[st.pick] ? st.pick : null; draw(); });
      $$(sl, '.so-bin').forEach(b => b.onclick = () => place(b.dataset.bin));
      $(sl, '.so-reveal').onclick = () => { CARDS.forEach((c, i) => { if (!(i in st.placed)) st.placed[i] = c.f; }); st.pick = null; st.last = null; say(out, ''); draw(); say(out, 'Every card, filed the way the deck files it. Click any card to read why.'); };
      $(sl, '.so-reset').onclick = () => { st.placed = {}; st.pick = 0; st.last = null; draw(); };
      addEventListener('keydown', e => {
        if (!sl.classList.contains('active') || e.ctrlKey || e.metaKey) return;
        const f = { Digit1: 'sys', Digit2: 'sit', Digit3: 'spe' }[e.code]; if (f) place(f);
      });
      draw();
      // GIF: file one card every 0.9 s with the deck's answer
      sortApi = { seek(t) { const k = Math.min(CARDS.length, Math.floor(t / 0.9)); st.placed = {}; for (let i = 0; i < k; i++) st.placed[i] = CARDS[i].f; st.pick = k < CARDS.length ? k : null; st.last = k ? k - 1 : null; draw(); }, dur: () => CARDS.length * 0.9 + 2.5 };
    },
  });

  /* =====================================================================
     Slide 4: the counterplay chain
     ===================================================================== */
  const P2 = [
    { k: 'block', n: 'Block', i: 'icons-actions-and-keywords/shield-impact', d: 'Raise a guard and take the hit safely.' },
    { k: 'dodge', n: 'Dodge', i: 'icons-actions-and-keywords/dodge', d: 'Roll through the swing.' },
    { k: 'parry', n: 'Parry', s: 'timed block', i: 'icons-actions-and-keywords/sword-clash', d: 'Time a block to deflect the swing and open a riposte.' },
    { k: 'move', n: 'Movement', i: 'icons-actions-and-keywords/sprint', d: 'Walk out of reach before it lands.' },
    { k: 'interrupt', n: 'Interrupt', i: 'icons-actions-and-keywords/punch', d: 'Hit first and cancel the wind-up.' },
  ];
  const P1 = [
    { k: 'break', n: 'Break', i: 'icons-actions-and-keywords/broken-shield', d: 'a guard break, or a heavy hit that drains the guard, punishes turtling' },
    { k: 'stun', n: 'Stun', i: 'icons-actions-and-keywords/round-star', d: 'a wide stun, or a hit timed for the end of the roll, catches the dodge' },
    { k: 'juke', n: 'Juke / Feint / Bait', i: 'icons-actions-and-keywords/split-arrows', d: 'delaying or faking the swing makes the parry come out early' },
    { k: 'immobilize', n: 'Immobilize', i: 'icons-actions-and-keywords/pin', d: 'a root or slow stops them walking away' },
    { k: 'poise', n: 'Poise build', i: 'icons-actions-and-keywords/turtle-shell', d: 'armoring through the hit lets the attack come out anyway' },
  ];
  const chain = { on: 0, gone: {} };
  let chainApi = null;
  demo('chain', {
    init(sl) {
      const st = chain, c2 = $(sl, '.c2'), c3 = $(sl, '.c3'), svg = $(sl, '.ch-lines'), out = $(sl, '.ch-out'), board = $(sl, '.ch-board');
      c2.insertAdjacentHTML('beforeend', P2.map((p, i) => `<button class="ch-node p2" data-i="${i}"><img src="${I}${p.i}.png" alt=""><span><b>${p.n}</b>${p.s ? `<small>${p.s}</small>` : ''}</span></button>`).join(''));
      c3.insertAdjacentHTML('beforeend', P1.map((p, i) => `<button class="ch-node p1" data-j="${i}"><img src="${I}${p.i}.png" alt=""><span><b>${p.n}</b></span><span class="x" title="Delete this answer from the game">✕</span></button>`).join(''));
      const start = $(sl, '.ch-node.start');
      const centre = (el, side) => {
        const col = el.parentElement, x = col.offsetLeft + el.offsetLeft + (side === 'r' ? el.offsetWidth : 0), y = col.offsetTop + el.offsetTop + el.offsetHeight / 2;
        return [x, y];
      };
      function lines() {
        if (!board.offsetWidth) return;
        svg.setAttribute('viewBox', `0 0 ${board.offsetWidth} ${board.offsetHeight}`);
        const [sx, sy] = centre(start, 'r');
        let html = '';
        $$(c2, '.ch-node').forEach((n, i) => {
          const [x, y] = centre(n, 'l'), [x2, y2] = centre(n, 'r'), m = $$(c3, '.ch-node')[i], [x3, y3] = centre(m, 'l');
          const on = st.on === i, gone = st.gone[i];
          html += `<path d="M${sx},${sy} C${sx + 60},${sy} ${x - 60},${y} ${x},${y}" stroke="${on ? '#2ea3dc' : '#b9b3a3'}" stroke-width="${on ? 4 : 2}" fill="none"/>`;
          html += `<path d="M${x2},${y2} L${x3},${y3}" stroke="${gone ? '#d8cfbd' : on ? '#e5322d' : '#b9b3a3'}" stroke-width="${on ? 4 : 2}" stroke-dasharray="${gone ? '6 6' : ''}" fill="none"/>`;
          html += `<text x="${(x2 + x3) / 2}" y="${y2 - 8}" text-anchor="middle" font-family="Jost" font-weight="600" font-size="12" fill="#5d618c">countered by</text>`;
        });
        svg.innerHTML = html;
      }
      function draw() {
        $$(c2, '.ch-node').forEach((n, i) => {
          n.classList.toggle('on', st.on === i); n.classList.toggle('silver', !!st.gone[i]);
          const f = $(n, '.flag'); if (st.gone[i] && !f) n.insertAdjacentHTML('beforeend', '<span class="flag">silver bullet</span>'); else if (!st.gone[i] && f) f.remove();
        });
        $$(c3, '.ch-node').forEach((n, j) => { n.classList.toggle('on', st.on === j); n.classList.toggle('gone', !!st.gone[j]); });
        const p = P2[st.on], a = P1[st.on];
        if (st.gone[st.on]) say(out, `<b>Player 1 attacks. Player 2 answers with ${p.n.toLowerCase()}.</b> ${p.d}<br><br>But <b>${a.n}</b> is gone from the game, so nothing beats ${p.n.toLowerCase()}. It is now a <b>silver bullet</b>: the safe answer to every attack, and the only one anyone uses. The other four responses stop mattering.`);
        else say(out, `<b>Player 1 attacks. Player 2 answers with ${p.n.toLowerCase()}.</b> ${p.d}<br><br><b>Player 1 counters with ${a.n.toLowerCase()}:</b> ${a.d}. Each step is a read on the last one, so the exchange stays a decision instead of a reflex.`);
        lines();
      }
      $$(c2, '.ch-node').forEach((n, i) => n.onclick = () => { st.on = i; draw(); });
      $$(c3, '.ch-node').forEach((n, j) => n.onclick = e => { if (e.target.classList.contains('x')) st.gone[j] = !st.gone[j]; st.on = j; draw(); });
      start.onclick = () => { st.on = (st.on + 1) % P2.length; draw(); };
      $(sl, '.ch-restore').onclick = () => { st.gone = {}; draw(); };
      sl._draw = draw;
      draw();
      chainApi = { seek(t) { const k = Math.floor(t / 2.2); st.on = k % 5; st.gone = k >= 5 ? { 0: true } : {}; if (k >= 5) st.on = 0; draw(); }, dur: () => 2.2 * 6.5 };
    },
    enter(sl) { requestAnimationFrame(() => sl._draw && sl._draw()); },
  });

  /* =====================================================================
     Slide 5: the skillshot cycle
     ===================================================================== */
  const CYC = [
    { k: 'direct', who: 'Lux', n: 'Aim directly', x: 828, y: 130 },
    { k: 'move', who: 'Jinx', n: 'Move (sidestep)', x: 963, y: 300 },
    { k: 'lead', who: 'Lux', n: 'Aim (lead target)', x: 828, y: 470 },
    { k: 'stop', who: 'Jinx', n: 'Stop movement', x: 693, y: 300 },
  ];
  const ROUND = 1.9, TOUR = ['move', 'move', 'stop', 'move', 'stop', 'stop', 'move', 'stop', 'move', 'move'];
  // Lux's aim for round i, given your earlier choices: she expects you to repeat what you've done most in your last three
  function luxAim(hist, i, read) {
    if (!read) return hash(i * 7 + 3) < 0.5 ? 'direct' : 'lead';
    const recent = hist.slice(Math.max(0, i - 3), i);
    if (!recent.length) return 'direct';
    const moves = recent.filter(c => c === 'move').length;
    return moves * 2 > recent.length ? 'lead' : moves * 2 < recent.length ? 'direct' : (recent[recent.length - 1] === 'move' ? 'lead' : 'direct');
  }
  const hits = (you, aim) => (you === 'move') === (aim === 'lead');
  const cyc = { hist: [], read: true, t0: -9, now: 0, tour: false, held: false };
  function cycleDraw(g, st, hist, cur, lt) {
    g.clearRect(0, 0, W, H);
    panel(g, 0, 0, 600, H); panel(g, 616, 0, 424, H);
    const LX = 110, JX = 470, Y0 = 380;
    g.fillStyle = C.floor; g.fillRect(30, 70, 540, 430);
    text(g, 'Lux casts Light Binding · you are Jinx, walking up the lane', 300, 34, { col: C.navy, size: 15 });
    const i = cur, you = hist[i], aim = i !== null ? luxAim(hist, i, st.read) : null;
    // Jinx's path: walking up; if she stops, she stops when the cast starts
    const v = 170, castT = 0.25, fly = 0.55;
    const jy = s => you === 'stop' ? Y0 - v * Math.min(s, castT) : Y0 - v * s;
    const s = i === null ? 0 : lt;
    const yNow = jy(Math.min(s, castT + fly + 0.6));
    if (i !== null) {
      // where she aims: at Jinx (direct) or where Jinx would be if she keeps walking (lead)
      const ay = aim === 'direct' ? jy(castT) : Y0 - v * (castT + fly);
      g.setLineDash([6, 6]); g.strokeStyle = 'rgba(138,79,214,.5)'; g.lineWidth = 2; g.beginPath(); g.moveTo(LX, 300); g.lineTo(JX, ay); g.stroke(); g.setLineDash([]);
      g.strokeStyle = C.purple; g.lineWidth = 2; g.beginPath(); g.arc(JX, ay, 10, 0, TAU); g.stroke();
      if (s >= castT) {
        const q = clamp((s - castT) / fly), bx = lerp(LX, JX, q), by = lerp(300, ay, q);
        if (q < 1) { g.fillStyle = 'rgba(199,155,255,.55)'; g.beginPath(); g.arc(bx, by, 18, 0, TAU); g.fill(); img(g, 'bind', bx, by, 26); }
      }
      if (s >= castT + fly) {
        const h = hits(you, aim);
        pill(g, h ? 'ROOTED' : 'DODGED', JX - 10, yNow - 56, h ? C.red : C.green, '#fff', 16);
        if (h) { g.strokeStyle = C.purple; g.lineWidth = 4; for (let k = 0; k < 3; k++) { g.beginPath(); g.ellipse(JX, yNow, 40, 14, 0, 0, TAU); g.stroke(); } }
      }
      text(g, aim === 'direct' ? 'Lux aims straight at you' : 'Lux leads her aim ahead of you', LX + 10, 528, { col: C.purple, size: 15, align: 'left' });
      text(g, you === 'move' ? 'you keep moving' : 'you stop', JX + 40, 528, { col: C.blue, size: 15, align: 'right' });
    }
    img(g, 'lux', LX, 300, 76); img(g, 'jinx', JX, yNow, 70);
    // history along the top of the arena
    hist.slice(0, i === null ? hist.length : i + (s >= castT + fly ? 1 : 0)).forEach((c, j) => {
      const h = hits(c, luxAim(hist, j, st.read)), x = 50 + (j % 14) * 38;
      g.fillStyle = h ? C.red : C.green; g.beginPath(); g.arc(x, 90, 13, 0, TAU); g.fill();
      text(g, c === 'move' ? 'M' : 'S', x, 91, { col: '#fff', size: 13, weight: 700 });
    });
    // the cycle
    text(g, 'The skillshot counterplay cycle', 828, 30, { col: C.navy, size: 15 });
    const active = i !== null && s >= castT ? [aim, you] : [];
    CYC.forEach((nd, k) => {
      const nx = CYC[(k + 1) % 4], on = active.includes(nd.k), onArrow = active.includes(nd.k) && active.includes(nx.k);
      g.strokeStyle = onArrow ? C.gold : '#b9b3a3'; g.lineWidth = onArrow ? 5 : 3;
      const a = Math.atan2(nx.y - nd.y, nx.x - nd.x), x0 = nd.x + Math.cos(a) * 62, y0 = nd.y + Math.sin(a) * 46, x1 = nx.x - Math.cos(a) * 62, y1 = nx.y - Math.sin(a) * 46;
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
      g.fillStyle = g.strokeStyle; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x1 - Math.cos(a - .4) * 14, y1 - Math.sin(a - .4) * 14); g.lineTo(x1 - Math.cos(a + .4) * 14, y1 - Math.sin(a + .4) * 14); g.fill();
      { const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, d = Math.hypot(mx - 828, my - 300) || 1; text(g, 'countered by', mx + (mx - 828) / d * 44, my + (my - 300) / d * 22, { col: C.muted, size: 11 }); }
    });
    CYC.forEach(nd => {
      const on = active.includes(nd.k), col = nd.who === 'Lux' ? C.purple : C.blue;
      g.fillStyle = on ? col : '#fffaf0'; g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); g.roundRect(nd.x - 66, nd.y - 30, 132, 60, 12); g.fill(); g.stroke();
      text(g, nd.who, nd.x, nd.y - 11, { col: on ? '#fff' : col, size: 12 });
      text(g, nd.n, nd.x, nd.y + 10, { col: on ? '#fff' : C.ink, size: 14, weight: 700 });
    });
    if (i !== null && s >= castT + fly) {
      const h = hits(you, aim);
      text(g, h ? 'Lux’s choice counters yours' : 'Your choice counters Lux’s', 828, 556, { col: h ? C.red : C.green, size: 16, weight: 700 });
    }
  }
  let cycleApi = null;
  canvasDemo('cycle', (sl, cv, g) => {
    const st = cyc, ui = { move: $(sl, '.cy-move'), stop: $(sl, '.cy-stop'), read: $(sl, '.cy-read'), coin: $(sl, '.cy-coin'), tour: $(sl, '.cy-tour') };
    let last = '';
    const busy = () => st.now - st.t0 < ROUND - 0.2;
    function play(c) { if (busy() && st.hist.length) return; st.tour = false; st.hist.push(c); st.t0 = st.now; }
    ui.move.onclick = () => play('move'); ui.stop.onclick = () => play('stop');
    ui.read.onclick = () => { st.read = true; st.hist = []; st.t0 = -9; };
    ui.coin.onclick = () => { st.read = false; st.hist = []; st.t0 = -9; };
    $(sl, '.cy-reset').onclick = () => { st.hist = []; st.t0 = -9; st.tour = false; };
    ui.tour.onclick = () => { st.tour = true; st.hist = []; st.t0 = st.now; };
    addEventListener('keydown', e => {
      if (!sl.classList.contains('active') || e.ctrlKey || e.metaKey) return;
      if (e.code === 'KeyM') play('move'); else if (e.code === 'KeyS') play('stop');
    });
    function stats(hist) {
      const n = hist.length, dodged = hist.filter((c, j) => !hits(c, luxAim(hist, j, st.read))).length;
      return { n, dodged };
    }
    function render() {
      let hist = st.hist, cur = hist.length ? hist.length - 1 : null, lt = st.now - st.t0;
      if (st.tour) { const k = Math.floor((st.now - st.t0) / ROUND); hist = TOUR.slice(0, Math.min(TOUR.length, k + 1)); cur = hist.length - 1; lt = (st.now - st.t0) - cur * ROUND; if (k >= TOUR.length + 1) st.t0 = st.now; }
      if (cur !== null && lt > ROUND * 3) cur = null;
      cycleDraw(g, st, hist, cur, lt);
      const s = stats(cur === null ? hist : hist.slice(0, lt >= 0.8 ? cur + 1 : cur));
      const key = [s.n, s.dodged, st.read, st.tour].join('|'); if (key === last) return; last = key;
      ui.read.classList.toggle('on', st.read); ui.coin.classList.toggle('on', !st.read); ui.tour.classList.toggle('on', st.tour);
      say($(sl, '.st'), `<div class="g"><b>${s.dodged}</b><span>dodged</span></div><div class="r"><b>${s.n - s.dodged}</b><span>rooted</span></div>`);
      say($(sl, '.out1'), s.n === 0 ? 'Press <b>M</b> to keep moving or <b>S</b> to stop. Moving dodges a straight shot; stopping dodges a led shot. Lux is watching what you do.'
        : st.read ? `Lux bets you’ll repeat yourself. ${s.n >= 4 && s.dodged / s.n < .5 ? 'Patterns get punished: mix it up.' : 'Break your own pattern and her read becomes your dodge.'} Each option beats one and loses to one, so the cycle never settles on a single answer.`
          : 'Against a coin-flip Lux you dodge about half the time whatever you do. The cycle only becomes a skill test when both players read each other.');
    }
    const DUR = ROUND * TOUR.length;
    cycleApi = { seek(t) { st.held = true; st.tour = true; st.t0 = 0; st.now = t; render(); }, dur: () => DUR };
    return dt => { if (!st.held) st.now += dt; render(); };
  });

  const apis = () => ({ sion: sionApi, sort: sortApi, chain: chainApi, cycle: cycleApi });
  window.__seek = (t, which = 'sion') => apis()[which].seek(t);
  window.__dur = (which = 'sion') => apis()[which].dur();
})();
