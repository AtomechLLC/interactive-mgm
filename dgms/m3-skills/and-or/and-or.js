/* AND vs OR (DGMS C2 M3 "Leveraging Player Skills", deck slides 53-70).
   gate: twelve players, five skill bars each. Build a test from skill requirements and join them with AND (complementary:
         "it expects you to do this, and this, and this", slide 56) or OR (supplementary: "you don't have to be as precise
         at timing if you can button mash quickly", slide 62). Presets: Sky Diver (jump aim AND chute timing AND
         steering) and Overwatch (aim OR strategy OR positioning, one hero per route).
   slam: Dark Souls III's teleport slam (slides 66-67): on first sight only reaction gets you out; from the second
         attempt, knowledge of the timing substitutes for it. The pass rule is Reaction OR Knowledge.
   All player numbers, reaction times and the 60-point bar are illustrative; they live in PLAYERS and SLAM below.
   Images: Overwatch hero portraits (Ana, Torbjörn, Mercy, Reinhardt) from Blizzard's CDN via the OverFast API hero list,
   resized to 128 px, in ../img/and-or/. Everything else is drawn in code. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp } = TD;
  const W = 1040, H = 585;

  /* ---------- tunable numbers (all illustrative) ---------- */
  const BASE = ['Aim', 'Timing', 'Reaction', 'Strategy', 'Knowledge'];
  const PLAYERS = [            // Aim, Timing, Reaction, Strategy, Knowledge (0-100)
    ['Ash', 85, 70, 75, 30, 40], ['Bea', 35, 40, 30, 90, 70], ['Cal', 70, 45, 80, 50, 35], ['Dev', 20, 85, 40, 55, 80],
    ['Eli', 65, 75, 65, 65, 60], ['Fay', 90, 30, 85, 25, 30], ['Gus', 30, 35, 35, 40, 95], ['Hal', 50, 65, 55, 75, 45],
    ['Ivy', 45, 90, 70, 35, 50], ['Jun', 25, 30, 25, 30, 35], ['Kit', 75, 60, 50, 80, 55], ['Lou', 40, 55, 90, 45, 65],
  ].map(([name, ...v]) => ({ name, v }));
  const PRESETS = {
    sky: { labels: ['Jump aim', 'Chute timing', 'Steering', 'Strategy', 'Knowledge'], req: [0, 1, 2], join: 'and', game: 'Sky Diver' },
    ow: { labels: ['Aim', 'Timing', 'Reaction', 'Strategy', 'Positioning'], req: [0, 3, 4], join: 'or', game: 'Overwatch' },
    free: { labels: BASE, req: [0, 1], join: 'and', game: 'Your test' },
  };
  // Overwatch: one hero per route through an OR test (skill index -> heroes that lean on it)
  const HEROES = [{ k: 'ana', name: 'Ana', skill: 0 }, { k: 'mercy', name: 'Mercy', skill: 3 }, { k: 'torbjorn', name: 'Torbjörn', skill: 4 }, { k: 'reinhardt', name: 'Reinhardt', skill: 4 }];
  const SLAM = {
    rt: r => Math.round(420 - 2.6 * r),   // reaction time (ms) from the Reaction bar
    learn: [0, 1, 1.5],                   // knowledge of the timing after attempt 1, 2, 3, as a share of the Knowledge bar
    bar: 60,                              // knowledge needed to dodge on rhythm alone
    delay: 1.6,                           // seconds from the teleport to the slam: the fixed rhythm a player can learn
  };

  const IMG = {}; HEROES.forEach(h => { const im = new Image(); im.src = `../img/and-or/${h.k}.png`; IMG[h.k] = im; });
  const panel = g => { g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(255,252,244,.85)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill(); };
  const txt = (g, s, x, y, font, col = C.ink, al = 'left') => { g.font = font; g.fillStyle = col; g.textAlign = al; g.textBaseline = 'middle'; g.fillText(s, x, y); return g.measureText(s).width; };
  const HEAD = n => `800 ${n}px Montserrat, Jost, sans-serif`, BODY = (n, w = 500) => `${w} ${n}px Jost, sans-serif`;
  function portrait(g, k, x, y, r, ring = '#fffaf0') {
    const im = IMG[k];
    g.save(); g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = '#c9d3ea'; g.fill(); g.clip();
    if (im.complete && im.naturalWidth) g.drawImage(im, x - r, y - r, r * 2, r * 2);
    else { g.fillStyle = C.ink; g.font = HEAD(r); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(k[0].toUpperCase(), x, y); }
    g.restore(); g.strokeStyle = ring; g.lineWidth = 2.5; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke();
  }
  const passes = (p, req, join, th) => req.length ? (join === 'and' ? req.every(i => p.v[i] >= th) : req.some(i => p.v[i] >= th)) : false;
  const apis = {};

  /* ---------- 1: the gate ---------- */
  canvasDemo('gate', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, pre: 'sky', req: [0, 1, 2], join: 'and', th: 60, key: '', changed: 0 };
    const tourBtn = $(s, '.ao-tour'), thIn = $(s, '.ao-th'), box = $(s, '.ao-skills');
    box.innerHTML = BASE.map((_, i) => `<label class="chk"><input type="checkbox" data-i="${i}"><span></span></label>`).join('');
    const free = () => { st.tour = false; tourBtn.classList.remove('on'); };
    const setPre = p => { st.pre = p; st.req = PRESETS[p].req.slice(); st.join = PRESETS[p].join; };
    $$(s, '.ao-pre .btn').forEach(b => b.onclick = () => { free(); setPre(b.dataset.p); });
    $$(s, '.ao-join .btn').forEach(b => b.onclick = () => { free(); st.join = b.dataset.j; });
    $$(box, 'input').forEach(c => c.onchange = () => { free(); st.req = $$(box, 'input').filter(x => x.checked).map(x => +x.dataset.i); });
    thIn.oninput = () => { free(); st.th = +thIn.value; };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; st.th = 60; thIn.value = 60; tourBtn.classList.add('on'); };
    const TOUR = [[0, 'sky', 'and'], [4.5, 'sky', 'or'], [9, 'ow', 'or'], [13.5, 'ow', 'and']], DUR = 18;

    function card(p, x, y, w, h, labels, on, fade) {
      const pass = passes(p, st.req, st.join, st.th), a = lerp(.55, 1, fade);
      g.save();
      g.globalAlpha = pass ? 1 : lerp(1, .5, fade);
      g.fillStyle = pass ? `rgba(216,240,223,${a})` : '#f4efe4'; g.strokeStyle = pass ? '#2fae63' : '#cdbf9f'; g.lineWidth = pass ? 4 : 2;
      g.beginPath(); g.roundRect(x, y, w, h, 12); g.fill(); g.stroke();
      txt(g, p.name, x + 14, y + 20, HEAD(17));
      if (pass) {
        g.fillStyle = '#2fae63'; g.beginPath(); g.roundRect(x + w - 64, y + 9, 52, 22, 11); g.fill();
        txt(g, 'PASS', x + w - 38, y + 20, HEAD(12), '#fff', 'center');
        if (st.pre === 'ow') {   // heroes this player can carry, one per route they clear
          const hs = HEROES.filter(hh => st.req.includes(hh.skill) && p.v[hh.skill] >= st.th);
          hs.forEach((hh, j) => portrait(g, hh.k, x + 70 + j * 26, y + 20, 11, '#2fae63'));
        }
      }
      labels.forEach((lab, i) => {
        const yy = y + 48 + i * 21, inT = on.includes(i), bx = x + 98, bw = w - 112, v = p.v[i];
        txt(g, lab, x + 14, yy, BODY(13, inT ? 700 : 500), inT ? C.ink : C.muted);
        g.fillStyle = '#e6dcc4'; g.beginPath(); g.roundRect(bx, yy - 6, bw, 12, 6); g.fill();
        g.fillStyle = !inT ? '#b9b4c6' : v >= st.th ? '#2fae63' : '#e0a92d';
        g.beginPath(); g.roundRect(bx, yy - 6, bw * v / 100, 12, 6); g.fill();
        if (inT) { const tx = bx + bw * st.th / 100; g.fillStyle = C.navy; g.fillRect(tx - 1, yy - 9, 2, 18); }
      });
      g.restore();
      return pass;
    }

    function render() {
      let since = st.t - st.changed;
      if (st.tour) {
        let seg = TOUR[0]; TOUR.forEach(x => { if (st.t >= x[0]) seg = x; });
        if (st.pre !== seg[1]) setPre(seg[1]);
        st.join = seg[2]; since = st.t - seg[0];
      }
      const pre = PRESETS[st.pre], labels = pre.labels;
      const key = [st.pre, st.req, st.join, st.th].join('|');
      if (key !== st.key) { st.key = key; if (!st.tour) st.changed = st.t, since = 0; side(); }
      const fade = clamp(since / .5);
      T.use(g); panel(g);
      // the test as a formula
      g.fillStyle = C.navy; g.beginPath(); g.roundRect(14, 12, W - 28, 62, 12); g.fill();
      let x = 32;
      x += txt(g, pre.game + ':', x, 43, HEAD(18), '#ffb951') + 14;
      if (!st.req.length) txt(g, 'tick a skill to build a test', x, 43, BODY(17, 600), '#fffaf0');
      st.req.forEach((i, j) => {
        if (j) { x += txt(g, st.join.toUpperCase(), x, 43, HEAD(20), st.join === 'and' ? '#ff9e8a' : '#8fd3ff') + 12; }
        if (st.pre === 'ow') HEROES.filter(hh => hh.skill === i).forEach(hh => { portrait(g, hh.k, x + 13, 43, 14, '#ffb951'); x += 32; });
        x += txt(g, `${labels[i]} ≥ ${st.th}`, x, 43, BODY(17, 600), '#fffaf0') + 12;
      });
      const n = PLAYERS.filter(p => passes(p, st.req, st.join, st.th)).length;
      txt(g, `${n} of 12 pass`, W - 32, 43, HEAD(20), '#fffaf0', 'right');
      // twelve cards
      PLAYERS.forEach((p, i) => card(p, 14 + (i % 4) * 255, 86 + Math.floor(i / 4) * 166, 245, 156, labels, st.req, fade));
      $$(s, '.ao-pre .btn').forEach(b => b.classList.toggle('on', b.dataset.p === st.pre));
      $$(s, '.ao-join .btn').forEach(b => b.classList.toggle('on', b.dataset.j === st.join));
      $$(box, 'label').forEach((l, i) => { $(l, 'span').textContent = labels[i]; $(l, 'input').checked = st.req.includes(i); });
      $(s, '.ao-tv').textContent = st.th;
    }
    function side() {
      const nAnd = PLAYERS.filter(p => passes(p, st.req, 'and', st.th)).length, nOr = PLAYERS.filter(p => passes(p, st.req, 'or', st.th)).length;
      const one = PLAYERS.filter(p => st.req.filter(i => p.v[i] >= st.th).length === 1).length;
      say($(s, '.ao-stats'), `<div class="r"><b>${nAnd}</b><span>pass with AND: players who have the whole mix</span></div><div class=""><b>${nOr}</b><span>pass with OR: any one route will do</span></div><div class="y"><b>${one}</b><span>clear exactly one skill: OR lets them in, AND keeps them out</span></div>`);
      const pre = PRESETS[st.pre];
      say($(s, '.ao-out'), !st.req.length ? 'Pick at least one skill to test.'
        : st.req.length === 1 ? 'With one skill AND and OR are the same test. Add a second skill and flip the joiner.'
        : st.join === 'and'
          ? `AND is complementary: it expects this, and this, and this. Only ${nAnd} of 12 have the whole ${pre.game === 'Sky Diver' ? 'Sky Diver' : ''} mix, so the game speaks to a narrow, specialised audience.`
          : `OR is supplementary: one skill can stand in for another. ${nOr} of 12 pass${st.pre === 'ow' ? ', each through the hero that fits their strength' : ''}, ${one} of them on a single skill.`);
    }
    apis.gate = { seek(t) { st.held = st.tour = true; st.t = t; render(); }, dur: () => DUR };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > DUR) st.t = 0; render(); };
  });

  /* ---------- 2: the teleport slam ---------- */
  canvasDemo('slam', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, att: 1, warn: 260, key: '' };
    const tourBtn = $(s, '.sl-tour'), wIn = $(s, '.sl-warn');
    const free = () => { st.tour = false; tourBtn.classList.remove('on'); };
    $$(s, '.sl-att .btn').forEach(b => b.onclick = () => { free(); st.att = +b.dataset.a; });
    wIn.oninput = () => { free(); st.warn = +wIn.value; };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; st.warn = 260; wIn.value = 260; tourBtn.classList.add('on'); };
    const DUR = 18, LOOP = 3;
    const result = p => {
      const rt = SLAM.rt(p.v[2]), kn = Math.min(100, Math.round(p.v[4] * SLAM.learn[st.att - 1]));
      const byR = rt <= st.warn, byK = kn >= SLAM.bar;
      return { rt, kn, byR, byK, pass: byR || byK };
    };
    const FEAT = PLAYERS.findIndex(p => p.name === 'Gus');   // slow hands, quick study

    function knight(g, x, y, s, rot = 0, col = '#5d618c') {
      g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
      g.fillStyle = col; g.beginPath(); g.roundRect(-11, -38, 22, 32, 6); g.fill();
      g.fillStyle = '#c9cbd6'; g.beginPath(); g.arc(0, -46, 10, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#262c6a'; g.fillRect(-7, -48, 14, 3);
      g.fillStyle = '#8b6f47'; g.beginPath(); g.ellipse(-12, -22, 7, 11, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = col; g.fillRect(-10, -6, 7, 8); g.fillRect(3, -6, 7, 8);
      g.restore();
    }
    function boss(g, x, y, s, a, slamK) {
      if (a <= 0) return;
      g.save(); g.globalAlpha = a; g.translate(x, y); g.scale(s, s);
      g.fillStyle = '#1b1530'; g.beginPath(); g.moveTo(-34, 0); g.lineTo(-24, -92); g.lineTo(24, -92); g.lineTo(34, 0); g.closePath(); g.fill();
      g.fillStyle = '#2d2448'; g.beginPath(); g.arc(0, -104, 16, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffb951'; g.beginPath(); g.arc(-5, -106, 2.5, 0, Math.PI * 2); g.arc(5, -106, 2.5, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#c9cbd6'; g.lineWidth = 7; g.beginPath();
      const ang = lerp(-2.4, -.2, slamK); g.moveTo(16, -70); g.lineTo(16 + Math.cos(ang) * 110, -70 + Math.sin(ang) * 110); g.stroke();
      g.restore();
    }

    function render() {
      if (st.tour) { st.att = 1 + Math.min(2, Math.floor(st.t / 6)); }
      $$(s, '.sl-att .btn').forEach(b => b.classList.toggle('on', +b.dataset.a === st.att));
      const R = PLAYERS.map(result), u = (st.t % LOOP) / LOOP * LOOP;
      const tTel = .4, tSlam = tTel + SLAM.delay, tCue = tSlam - st.warn / 1000;
      T.use(g); panel(g);
      // arena
      const AY = 14, AH = 236, floorY = AY + AH - 34;
      const grd = g.createLinearGradient(0, AY, 0, AY + AH); grd.addColorStop(0, '#20263f'); grd.addColorStop(1, '#3a3550');
      g.fillStyle = grd; g.beginPath(); g.roundRect(14, AY, 560, AH, 12); g.fill();
      g.fillStyle = '#4a4560'; g.fillRect(14, floorY, 560, AY + AH - floorY - 6);
      const px = 200, f = R[FEAT];
      // boss: idle at the right, vanishes, reappears over the player, slams
      const away = u < tTel ? 1 : u < tTel + .25 ? 1 - (u - tTel) / .25 : 0;
      const over = u < tCue ? 0 : u < tCue + .06 ? (u - tCue) / .06 : u < tSlam + .7 ? 1 : 1 - (u - tSlam - .7) / .3;
      const slamK = clamp((u - (tSlam - .12)) / .12);
      boss(g, 470, floorY, 1, away, 0);
      if (u > tTel && u < tTel + .35) T.poof?.(470, floorY - 60, (u - tTel) / .35);
      boss(g, px + 40, floorY, 1, clamp(over), slamK);
      // the featured player: rolls away if they pass, takes the hit if not
      const dodgeAt = f.byR ? tCue + f.rt / 1000 : f.byK ? tSlam - .25 : Infinity;
      const roll = clamp((u - dodgeAt) / .35), hit = !f.pass && u > tSlam;
      knight(g, px - roll * 120, floorY, 1.15, roll * Math.PI * 2, hit && u < tSlam + .4 ? '#e5322d' : '#2ea3dc');
      if (u > tSlam && u < tSlam + .4) { g.strokeStyle = `rgba(255,185,81,${1 - (u - tSlam) / .4})`; g.lineWidth = 5; g.beginPath(); g.ellipse(px + 40, floorY, 40 + (u - tSlam) * 300, 10, 0, 0, Math.PI * 2); g.stroke(); }
      if (u > tSlam + .1 && u < LOOP - .2) T.label(f.pass ? (f.byR ? 'Gus reacts in time' : 'Gus dodges on rhythm') : 'Gus is too slow to react', 300, AY + 28, 'center', f.pass ? '#1a8a4c' : C.red, 15);
      txt(g, `Gus · reaction ${f.rt} ms · knowledge ${f.kn}`, 30, AY + AH - 18, BODY(14, 600), '#fffaf0');
      // timeline
      const LX = 600, LW = 410, ly = 90, sx = tt => LX + LW * tt / LOOP;
      txt(g, 'One cycle of the attack', LX, AY + 18, HEAD(16));
      g.fillStyle = '#e6dcc4'; g.fillRect(LX, ly - 4, LW, 8);
      g.fillStyle = 'rgba(229,50,45,.25)'; g.fillRect(sx(tCue), ly - 22, sx(tSlam) - sx(tCue), 44);
      [[tTel, 'teleport', C.muted, -1], [tCue, 'reappears: the cue', C.red, 1], [tSlam, 'slam lands', C.ink, -1]].forEach(([tt, lab, col, side]) => {
        g.fillStyle = col; g.fillRect(sx(tt) - 1.5, ly - 22, 3, 44);
        txt(g, lab, sx(tt), ly + side * 34, BODY(14, 700), col, 'center');
      });
      txt(g, `${st.warn} ms to react`, (sx(tCue) + sx(tSlam)) / 2, ly + 62, BODY(14, 700), C.red, 'center');
      if (st.att > 1) {
        g.strokeStyle = '#e0a92d'; g.lineWidth = 3; g.setLineDash([6, 5]); g.beginPath(); g.moveTo(sx(tTel), ly + 92); g.lineTo(sx(tSlam), ly + 92); g.stroke(); g.setLineDash([]);
        txt(g, `known rhythm: slam ${SLAM.delay} s after the teleport`, LX, ly + 112, BODY(14, 700), '#9a5a06');
      } else txt(g, 'First sight: nobody knows the rhythm yet', LX, ly + 112, BODY(14, 700), C.muted);
      g.fillStyle = '#2ea3dc'; g.fillRect(sx(u) - 1.5, ly - 12, 3, 24); g.beginPath(); g.moveTo(sx(u) - 8, ly - 24); g.lineTo(sx(u) + 8, ly - 24); g.lineTo(sx(u), ly - 12); g.fill();
      // twelve players
      const pass1 = PLAYERS.map(p => SLAM.rt(p.v[2]) <= st.warn);
      txt(g, `Attempt ${st.att}: Reaction OR Knowledge`, 14 + 6, 270, HEAD(17));
      txt(g, `${R.filter(r => r.pass).length} of 12 get out`, W - 20, 270, HEAD(17), C.ink, 'right');
      PLAYERS.forEach((p, i) => {
        const r = R[i], x = 14 + (i % 6) * 170, y = 290 + Math.floor(i / 6) * 146, w = 160, h = 136;
        g.fillStyle = r.pass ? '#d8f0df' : '#f4efe4'; g.strokeStyle = r.pass ? '#2fae63' : '#cdbf9f'; g.lineWidth = r.pass ? 4 : 2;
        g.beginPath(); g.roundRect(x, y, w, h, 12); g.fill(); g.stroke();
        txt(g, p.name, x + 12, y + 20, HEAD(16), i === FEAT ? '#2ea3dc' : C.ink);
        txt(g, `${r.rt} ms`, x + w - 12, y + 20, BODY(14, 700), r.byR ? '#1a8a4c' : C.red, 'right');
        [['Reaction', 100 - (r.rt - 150) / 3, r.byR, '#2fae63'], ['Knowledge', r.kn, r.byK, '#e0a92d']].forEach(([lab, v, ok, col], j) => {
          const yy = y + 48 + j * 30;
          txt(g, lab, x + 12, yy - 9, BODY(12, 600), C.muted);
          g.fillStyle = '#e6dcc4'; g.beginPath(); g.roundRect(x + 12, yy, w - 24, 9, 4); g.fill();
          g.fillStyle = ok ? col : '#b9b4c6'; g.beginPath(); g.roundRect(x + 12, yy, (w - 24) * clamp(v / 100), 9, 4); g.fill();
        });
        txt(g, r.byR ? 'reacts' : r.byK ? (pass1[i] ? 'reacts' : 'dodges on rhythm') : 'gets hit', x + 12, y + h - 18, BODY(14, 700), r.byR ? '#1a8a4c' : r.byK ? '#9a5a06' : C.red);
      });
      $(s, '.sl-wv').textContent = st.warn + ' ms';
      const key = [st.att, st.warn].join(); if (key === st.key) return; st.key = key;
      const n1 = PLAYERS.filter(p => SLAM.rt(p.v[2]) <= st.warn).length, n = R.filter(r => r.pass).length, byK = R.filter(r => r.byK && !r.byR).length;
      say($(s, '.sl-stats'), `<div class="r"><b>${n1}</b><span>react in time on sight (${st.warn} ms or faster)</span></div><div class="y"><b>${byK}</b><span>get out on knowledge alone this attempt</span></div><div class="g"><b>${n}/12</b><span>get out on attempt ${st.att}</span></div>`);
      say($(s, '.sl-out'), st.att === 1
        ? `On first sight the slam is a pure reaction test: ${n1} of 12 are fast enough. Try the second attempt.`
        : `Same attack, same hands. Knowledge of the rhythm stands in for reaction, so ${n} of 12 now get out, ${byK} of them without reacting at all.`);
    }
    apis.slam = { seek(t) { st.held = st.tour = true; st.t = t; render(); }, dur: () => DUR };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > DUR) st.t = 0; render(); };
  });

  window.__seek = (t, w) => apis[w].seek(t);
  window.__dur = w => apis[w].dur();
})();
