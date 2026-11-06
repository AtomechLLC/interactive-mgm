/* Log line (RGF C2 M4, 3Cs: Character, Part 3: the Core Theme layer of the Pyramid of Complexity).
   One verb, many log lines: the same walk-and-pick-up input plays under Katamari Damacy's "Roll it up into a star" and
   The Last of Us's "Survive at all costs" (both from the deck), then under big story games (God of War, Red Dead
   Redemption 2, The Witcher 3) and other genres (Hades, Celeste, Stardew Valley, DOOM). Log lines beyond the deck's two
   are our own summaries. The log line decides the tone, the scale, the world and what failure means.
   The scene is a pure function of time and the chosen log line, so window.__seek is deterministic. Original figures;
   the game art comes from the course deck. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD, TAU = Math.PI * 2;
  const W = 1040, H = 585;
  const IMG = {};
  const load = n => { if (IMG[n]) return IMG[n]; const i = new Image(); i.src = `img/${n}`; IMG[n] = i; return i; };
  const ok = i => i && i.complete && i.naturalWidth;
  const cover = (g, n, x, y, w, h, fx = .5, fy = .3) => {
    const i = load(n); if (!ok(i)) { g.fillStyle = '#3d4270'; g.fillRect(x, y, w, h); return; }
    const k = Math.max(w / i.naturalWidth, h / i.naturalHeight), sw = w / k, sh = h / k;
    g.drawImage(i, (i.naturalWidth - sw) * fx, (i.naturalHeight - sh) * fy, sw, sh, x, y, w, h);
  };
  const font = (s, w = 600, f = 'Jost') => `${w} ${s}px ${f}, sans-serif`;
  const text = (g, s, x, y, size, col = C.ink, w = 600, align = 'left', fam = 'Jost') => { g.font = font(size, w, fam === 'M' ? 'Montserrat, Jost' : fam); g.fillStyle = col; g.textAlign = align; g.textBaseline = 'alphabetic'; g.fillText(s, x, y); };
  function wrap(g, s, x, y, maxW, lh, size, col = C.ink, w = 500) {
    g.font = font(size, w); g.fillStyle = col; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    let line = '', yy = y;
    s.split(' ').forEach(word => { const test = line ? line + ' ' + word : word; if (g.measureText(test).width > maxW && line) { g.fillText(line, x, yy); line = word; yy += lh; } else line = test; });
    if (line) g.fillText(line, x, yy);
    return yy;
  }
  const rr = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
  const hash = i => { const x = Math.sin(i * 127.1 + 31.7) * 43758.5453; return x - Math.floor(x); };

  const THEMES = {
    kat: { deck: true, genre: 'Rolling action', game: 'Katamari Damacy', tone: 'Whimsical fantasy', log: 'Roll it up into a star', art: 'katamari.jpg', fy: .5, col: '#e04f8c',
      decides: [['Tone', 'Whimsical and silly'], ['Scale', 'Thumbtacks, then cows, then buildings'], ['World', 'Larger-than-life caricatures'], ['Failure', 'Your ball is smaller than you hoped']],
      note: 'Katamari Damacy is about whimsically sticking things together into bigger and bigger balls, so the character and the world are larger-than-life caricatures that let the player break free of the constraints of reality.' },
    tlou: { deck: true, genre: 'Survival story', game: 'The Last of Us', tone: 'Serious reflection', log: 'Survive at all costs', art: 'last-of-us.jpg', fy: .3, col: '#c2852f',
      decides: [['Tone', 'Somber and serious'], ['Scale', 'Human: one bottle, one rag, one shiv'], ['World', 'A grounded, broken city'], ['Failure', 'Death']],
      note: 'The Last of Us is somber and serious: the trauma of an older generation who lost something precious, against the hope of the young to survive and endure. Every pickup is scarce, and every step is a risk.' },
    gow: { genre: 'Story action', game: 'God of War (2018)', tone: 'Grief and restraint', log: 'Teach your son to be better than you', art: 'god-of-war.jpg', fy: .4, col: '#d9483b',
      decides: [['Tone', 'Grief, restraint and slow trust'], ['Scale', 'A father and a son on one long walk'], ['World', 'A cold Norse wild of gods and giants'], ['Failure', 'Death, but the real stakes are the boy']],
      note: 'God of War (2018) turns a rage-driven series into a story about a father learning restraint. Atreus walks beside you and reads the runes Kratos cannot, so every walk is also a conversation between the two.' },
    rdr2: { genre: 'Open-world western', game: 'Red Dead Redemption 2', tone: 'Elegy for the West', log: 'Stay loyal as the outlaw era ends', art: 'red-dead-2.jpg', fy: .3, col: '#e0503a',
      decides: [['Tone', 'Elegiac, slow and grounded'], ['Scale', 'Days on horseback across a frontier'], ['World', 'A living West that goes on without you'], ['Failure', 'Lose your honor, lose the gang']],
      note: 'Red Dead Redemption 2 is about loyalty to a gang as the age of outlaws ends. The same walk becomes a slow ride, a stranger in need becomes a choice, and honor tracks who Arthur becomes.' },
    witcher: { genre: 'Story RPG', game: 'The Witcher 3: Wild Hunt', tone: 'Dark folk tale', log: 'Find your daughter before the Wild Hunt does', art: 'witcher-3.jpg', fy: .3, fx: .2, col: '#c23b3b',
      decides: [['Tone', 'Grim, morally grey and wry'], ['Scale', 'One monster contract at a time'], ['World', 'War-torn villages full of hard choices'], ['Failure', 'A choice that comes back to haunt you']],
      note: 'The Witcher 3 sends Geralt after Ciri, his adopted daughter, through a land at war. The same walk is an investigation: Witcher senses light up clues in red, and each one moves the contract forward.' },
    hades: { genre: 'Roguelike', game: 'Hades', tone: 'Defiant and witty', log: 'Escape from your father\'s house', art: 'hades.jpg', fy: .3, col: '#e8463f',
      decides: [['Tone', 'Defiant, warm and witty'], ['Scale', 'One room, one run, then again'], ['World', 'An underworld that remembers you'], ['Failure', 'You die, go home and try again']],
      note: 'Hades makes the roguelike loop the story: Zagreus keeps trying to escape his father\'s house. Dying is part of the theme, so the run ends, you keep your Darkness, and everyone at home reacts to how far you got.' },
    celeste: { genre: 'Precision platformer', game: 'Celeste', tone: 'Hopeful, about anxiety', log: 'Climb the mountain and face yourself', art: 'celeste.jpg', fy: .3, col: '#b55bd6',
      decides: [['Tone', 'Hopeful and honest'], ['Scale', 'One screen, one jump at a time'], ['World', 'A mountain that mirrors Madeline\'s mind'], ['Failure', 'Instant respawn, no penalty']],
      note: 'Celeste is about Madeline climbing a mountain while facing her anxiety. Failure is instant and cheap: you respawn at the start of the screen in a blink, and the game tells you to be proud of your death count.' },
    stardew: { genre: 'Farming life sim', game: 'Stardew Valley', tone: 'Cozy and restorative', log: 'Make a new life on your grandfather\'s farm', art: 'stardew.jpg', fy: .5, col: '#4f9a3a',
      decides: [['Tone', 'Calm, cozy and unhurried'], ['Scale', 'One day at a time, season by season'], ['World', 'A small town with neighbours'], ['Failure', 'You pass out and wake up tomorrow']],
      note: 'Stardew Valley is about leaving a grey office job for a farm and a small town. The same walk is a day of chores: the clock and your energy are the only pressure, and running out just means tomorrow.' },
    doom: { genre: 'Arena shooter', game: 'DOOM (2016)', tone: 'Heavy metal power fantasy', log: 'Rip and tear until it is done', art: 'doom.jpg', fy: .4, col: '#ff7a2f',
      decides: [['Tone', 'Loud, fast and unapologetic'], ['Scale', 'Arenas full of demons'], ['World', 'A Mars base overrun by Hell'], ['Failure', 'Death, but aggression heals you']],
      note: 'DOOM (2016) casts you as the thing the demons fear. The same walk is a charge: every pickup is a demon, and glory kills drop the health that keeps you pushing forward.' },
  };
  const ORDER = ['kat', 'tlou', 'gow', 'rdr2', 'witcher', 'hades', 'celeste', 'stardew', 'doom'];
  const TOURS = { log: ORDER, story: ['tlou', 'gow', 'rdr2', 'witcher'], genres: ['kat', 'hades', 'celeste', 'stardew', 'doom'] };
  ORDER.forEach(id => load(THEMES[id].art));

  // the shared input: one path and the same pickup presses in both worlds
  const PATH = [[60, 470], [180, 400], [300, 430], [380, 330], [300, 240], [400, 170], [470, 250]];
  const LOOP = 9;
  const ITEMS = [[150, 418], [250, 405], [330, 395], [360, 300], [320, 250], [380, 180], [440, 190], [465, 235]];
  const KAT = ['pencil', 'dice', 'cat', 'bike', 'cow', 'tree', 'house', 'cloud'];
  const TLOU = ['scrap', null, 'bottle', null, 'rag', null, null, 'blade'];
  // how far along the path the walker is at time t. Most walk it once; Hades dies and starts a new run, Celeste dies at the
  // spikes and respawns a little way back.
  const SEGS = {
    hades: [[0, 4.0, 0, .62], [4.9, 7.8, 0, 1]],
    celeste: [[0, 2.2, 0, .36], [2.45, 4.3, .26, .62], [4.55, 5.2, .5, .62], [5.45, 7.8, .5, 1]],
  };
  const EVENTS = {
    hades: [[4.0, 'Slain. Back to the House.', '#ff8a80'], [4.9, 'Run 2: you kept the Darkness.', '#ffd27a']],
    celeste: [[2.2, 'Death 1', '#ffc2f0'], [4.3, 'Death 2', '#ffc2f0'], [5.2, 'Death 3. Keep climbing.', '#ffc2f0']],
  };
  function prog(id, t) {
    const sg = SEGS[id];
    if (!sg) return { k: ease(clamp(t / (LOOP - 1.2))), down: false };
    for (let i = 0; i < sg.length; i++) {
      const [t0, t1, k0, k1] = sg[i];
      if (t < t0) return { k: i ? sg[i - 1][3] : k0, down: true, at: i ? t - sg[i - 1][1] : 0 };
      if (t <= t1) return { k: lerp(k0, k1, ease((t - t0) / (t1 - t0))), down: false };
    }
    return { k: sg[sg.length - 1][3], down: false };
  }
  const REACH = {};
  function reachOf(id) {
    if (REACH[id]) return REACH[id];
    return (REACH[id] = ITEMS.map(([ix, iy]) => { for (let s = 0; s <= 400; s++) { const tt = s / 400 * LOOP, p = prog(id, tt); if (p.down) continue; const [ax, ay] = along(p.k); if (Math.hypot(ax - ix, ay - iy) < 34) return tt; } return 99; }));
  }
  function along(k) {
    const segs = PATH.length - 1, f = clamp(k) * segs, i = Math.min(segs - 1, Math.floor(f)), q = f - i;
    return [lerp(PATH[i][0], PATH[i + 1][0], q), lerp(PATH[i][1], PATH[i + 1][1], q)];
  }
  function scene(g, id, t, x0, y0, w, h) {
    const th = THEMES[id], k = clamp(t / (LOOP - 1.2)), [px, py] = along(ease(k));
    g.save(); g.translate(x0, y0); rr(g, 0, 0, w, h, 10); g.clip();
    // when each item is reached (first time the walker passes within 34px)
    const reach = reachOf(id);
    const pathLine = col => { g.save(); g.setLineDash([6, 8]); g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); PATH.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); g.restore(); };
    if (id === 'kat') {
      g.fillStyle = '#9ee07a'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#c8f0a8'; for (let i = 0; i < 40; i++) { g.beginPath(); g.arc(hash(i) * w, hash(i + 50) * h, 10 + hash(i + 9) * 20, 0, TAU); g.fill(); }
      // rainbow
      ['#ff6b6b', '#ffb951', '#ffe066', '#7bd389', '#6fa8ff', '#b28dff'].forEach((c, i) => { g.strokeStyle = c; g.lineWidth = 7; g.globalAlpha = .55; g.beginPath(); g.arc(w - 90, 140, 120 - i * 7, Math.PI, TAU); g.stroke(); });
      g.globalAlpha = 1; pathLine('rgba(59,53,82,.3)');
      const got = ITEMS.filter((_, i) => t >= reach[i]).length, r = 16 + got * 4.5;
      ITEMS.forEach(([ix, iy], i) => {
        const s = 1 + i * .35, gone = t >= reach[i];
        if (gone) return;
        g.save(); g.translate(ix, iy); g.scale(s, s);
        g.fillStyle = ['#ffd84d', '#fff', '#ff9f43', '#4dabf7', '#fff', '#2f9e44', '#e8590c', '#e9ecef'][i]; g.strokeStyle = '#3b3552'; g.lineWidth = 1.5;
        rr(g, -8, -8, 16, 16, 4); g.fill(); g.stroke();
        g.restore();
        T.label(KAT[i], ix, iy - 14 - i * 4, 'center', '#3b3552', 11, 'rgba(255,255,255,.75)');
      });
      // the ball, studded with what it has rolled up
      g.fillStyle = 'rgba(0,0,0,.15)'; g.beginPath(); g.ellipse(px + 4, py + r * .8, r, r * .35, 0, 0, TAU); g.fill();
      g.fillStyle = '#ff8fc7'; g.strokeStyle = '#3b3552'; g.lineWidth = 2; g.beginPath(); g.arc(px + 10, py - r * .4, r, 0, TAU); g.fill(); g.stroke();
      for (let i = 0; i < got; i++) { const a = i * 2.1 + t * 2; g.fillStyle = ['#ffd84d', '#fff', '#ff9f43', '#4dabf7', '#fff', '#2f9e44', '#e8590c', '#e9ecef'][i]; rr(g, px + 10 + Math.cos(a) * r * .6 - 5, py - r * .4 + Math.sin(a) * r * .6 - 5, 10, 10, 2); g.fill(); }
      // the tiny prince pushing it
      g.fillStyle = '#7bd389'; g.beginPath(); g.arc(px - r * .9, py - 8, 7, 0, TAU); g.fill(); g.fillStyle = '#3b3552'; g.fillRect(px - r * .9 - 1, py - 22, 2, 8);
      ITEMS.forEach((_, i) => { const a = t - reach[i]; if (a >= 0 && a < .8) T.popText('+ ' + KAT[i] + '!', px, py - r - 20 - a * 30, '#c2255c', (1 - a / .8) * 1.4); });
      text(g, `Ball size: ${Math.round(r * 2)} cm`, 14, h - 14, 15, '#3b3552', 800, 'left', 'M');
    } else if (id === 'tlou') {
      g.fillStyle = '#4a4d52'; g.fillRect(0, 0, w, h);
      // rubble and broken blocks
      for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(${110 + hash(i) * 40},${105 + hash(i) * 30},${98},.9)`; g.fillRect(hash(i + 3) * w, hash(i + 7) * h, 20 + hash(i + 11) * 50, 14 + hash(i + 13) * 30); }
      g.strokeStyle = 'rgba(80,110,60,.6)'; g.lineWidth = 3; for (let i = 0; i < 8; i++) { g.beginPath(); g.moveTo(hash(i + 20) * w, hash(i + 30) * h); g.quadraticCurveTo(hash(i + 40) * w, hash(i + 50) * h, hash(i + 60) * w, hash(i + 70) * h); g.stroke(); }
      pathLine('rgba(230,220,190,.35)');
      // an infected wanders
      const ex = 260 + Math.sin(t * .7) * 120, ey = 120 + Math.cos(t * .5) * 40;
      g.fillStyle = 'rgba(255,90,90,.12)'; g.beginPath(); g.arc(ex, ey, 70, 0, TAU); g.fill();
      g.fillStyle = '#b35a3c'; g.beginPath(); g.arc(ex, ey, 9, 0, TAU); g.fill();
      ITEMS.forEach(([ix, iy], i) => { if (!TLOU[i] || t >= reach[i]) return; g.fillStyle = '#e0c060'; g.beginPath(); g.arc(ix, iy, 5, 0, TAU); g.fill(); T.label(TLOU[i], ix, iy - 12, 'center', '#3b3552', 11, 'rgba(255,240,200,.8)'); });
      // the survivor, crouched
      g.fillStyle = '#d9c7a3'; g.beginPath(); g.arc(px, py, 8, 0, TAU); g.fill(); g.fillStyle = '#5a6b3a'; g.beginPath(); g.ellipse(px, py + 10, 9, 6, 0, 0, TAU); g.fill();
      // darkness with a flashlight cone
      g.save(); g.globalCompositeOperation = 'source-over';
      const dark = g.createRadialGradient(px, py, 30, px, py, 190); dark.addColorStop(0, 'rgba(0,0,0,0)'); dark.addColorStop(1, 'rgba(0,0,0,.5)');
      g.fillStyle = dark; g.fillRect(0, 0, w, h); g.restore();
      const inv = ITEMS.filter((_, i) => TLOU[i] && t >= reach[i]).map((_, i) => i);
      ITEMS.forEach((_, i) => { const a = t - reach[i]; if (a >= 0 && a < .8) T.popText(TLOU[i] ? '+ ' + TLOU[i] : 'nothing here', px, py - 30 - a * 24, TLOU[i] ? '#ffe599' : '#9aa0a8', (1 - a / .8) * 1.4); });
      const near = Math.hypot(px - ex, py - ey) < 90;
      if (near) T.label('Stay low. It will hear you.', px, py + 34, 'center', '#ffb4ae', 13, 'rgba(40,20,20,.85)');
      // tiny inventory
      text(g, 'Pack', 14, h - 40, 13, '#d9d2c2', 700);
      for (let i = 0; i < 4; i++) { g.strokeStyle = '#d9d2c2'; g.lineWidth = 1.5; rr(g, 14 + i * 34, h - 34, 28, 22, 4); g.stroke(); if (i < inv.length) { g.fillStyle = '#e0c060'; rr(g, 18 + i * 34, h - 30, 20, 14, 3); g.fill(); } }
    }
    else generic(g, id, t, w, h, pathLine);
    g.restore();
  }

  /* ---------- the other games: one scene template, themed ---------- */
  const LABELS = {
    gow: ['hacksilver', null, 'rune', null, 'chest', 'rune', null, 'hacksilver'],
    rdr2: ['stranger', 'herbs', null, 'rabbit', 'stranger', null, 'supplies', 'letter'],
    witcher: ['footprints', 'blood', 'claw marks', null, 'feather', null, 'torn cloth', 'lair'],
    hades: ['boon', 'obol', null, 'Darkness', 'boon', null, 'Darkness', 'exit'],
    celeste: [null, 'strawberry', null, null, 'strawberry', null, 'strawberry', 'summit'],
    stardew: ['parsnip', 'wood', 'stone', 'parsnip', 'forage', 'stone', 'parsnip', 'shipping bin'],
    doom: ['imp', 'imp', 'armor', 'imp', 'hell knight', 'imp', 'imp', 'gore nest'],
  };
  const POPS = {
    gow: i => LABELS.gow[i] === 'rune' ? 'Atreus: "I can read that."' : '+ ' + LABELS.gow[i],
    rdr2: i => LABELS.rdr2[i] === 'stranger' ? 'Helped a stranger: + honor' : '+ ' + LABELS.rdr2[i],
    witcher: i => i === 7 ? 'Lair found: contract ready' : 'Clue: ' + LABELS.witcher[i],
    hades: i => '+ ' + LABELS.hades[i],
    celeste: i => i === 7 ? 'Summit reached' : '+ strawberry',
    stardew: i => i === 7 ? 'Shipped. See you tomorrow.' : '+ ' + LABELS.stardew[i],
    doom: i => i === 2 ? '+ armor' : 'Glory kill: + health',
  };
  const tree = (g, x, y, s, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(x, y - s * 1.6); g.lineTo(x - s, y); g.lineTo(x + s, y); g.closePath(); g.fill(); };
  function backdrop(g, id, t, w, h) {
    if (id === 'gow') {
      g.fillStyle = '#c7d2d6'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#e8eef0'; for (let i = 0; i < 30; i++) { g.beginPath(); g.ellipse(hash(i) * w, hash(i + 5) * h, 30 + hash(i + 2) * 40, 12, 0, 0, TAU); g.fill(); }
      for (let i = 0; i < 26; i++) { const x = hash(i + 80) * w, y = hash(i + 90) * h; if (Math.hypot(x - 300, y - 330) < 160 && x < 520) continue; tree(g, x, y, 12 + hash(i) * 10, '#2f4a45'); }
      g.fillStyle = 'rgba(255,255,255,.7)'; for (let i = 0; i < 50; i++) { const y = (hash(i + 9) * h + t * 30 * (1 + hash(i))) % h; g.fillRect(hash(i + 3) * w, y, 2, 2); }
    } else if (id === 'rdr2') {
      const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#f2b36b'); sky.addColorStop(.25, '#e8c58a'); sky.addColorStop(.26, '#cfa96a'); sky.addColorStop(1, '#b98f55');
      g.fillStyle = sky; g.fillRect(0, 0, w, h);
      g.fillStyle = '#9a5b3a'; [[60, 120, 90], [250, 110, 60], [470, 126, 110]].forEach(([x, y, s]) => { g.beginPath(); g.moveTo(x - s, y + 20); g.lineTo(x - s * .6, y - 30); g.lineTo(x + s * .6, y - 30); g.lineTo(x + s, y + 20); g.fill(); });
      g.fillStyle = '#8a9a5a'; for (let i = 0; i < 60; i++) { g.beginPath(); g.arc(hash(i) * w, 150 + hash(i + 4) * (h - 150), 4 + hash(i + 8) * 6, 0, TAU); g.fill(); }
    } else if (id === 'witcher') {
      g.fillStyle = '#5d6a4c'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#3f5a5c'; for (let i = 0; i < 9; i++) { g.beginPath(); g.ellipse(hash(i + 40) * w, hash(i + 41) * h, 40 + hash(i) * 50, 20 + hash(i + 1) * 20, 0, 0, TAU); g.fill(); }
      g.strokeStyle = '#2c3a2a'; g.lineWidth = 2; for (let i = 0; i < 40; i++) { const x = hash(i + 60) * w, y = hash(i + 61) * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 3, y - 10); g.moveTo(x, y); g.lineTo(x + 4, y - 9); g.stroke(); }
      g.fillStyle = 'rgba(220,225,215,.12)'; for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse((hash(i + 70) * w + t * 12) % (w + 200) - 100, hash(i + 71) * h, 140, 30, 0, 0, TAU); g.fill(); }
    } else if (id === 'hades') {
      g.fillStyle = '#2a1626'; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(255,120,90,.12)'; g.lineWidth = 1; for (let x = 0; x < w; x += 40) for (let y = 0; y < h; y += 40) g.strokeRect(x + 2, y + 2, 36, 36);
      g.strokeStyle = 'rgba(255,90,40,.55)'; g.lineWidth = 2; for (let i = 0; i < 10; i++) { const x = hash(i + 20) * w, y = hash(i + 21) * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 18, y + 10); g.lineTo(x + 26, y + 30); g.moveTo(x + 18, y + 10); g.lineTo(x + 36, y + 6); g.stroke(); }
    } else if (id === 'celeste') {
      const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#1d1b4a'); sky.addColorStop(1, '#4a3d7a'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
      g.fillStyle = '#fff'; for (let i = 0; i < 40; i++) { g.globalAlpha = .3 + .5 * hash(i); g.fillRect(hash(i + 7) * w, hash(i + 8) * h * .5, 2, 2); } g.globalAlpha = 1;
      g.fillStyle = '#6c6aa8'; g.beginPath(); g.moveTo(0, h); g.lineTo(200, 40); g.lineTo(330, 180); g.lineTo(480, 20); g.lineTo(w, h); g.fill();
      g.fillStyle = '#e8ecff'; g.beginPath(); g.moveTo(170, 95); g.lineTo(200, 40); g.lineTo(235, 85); g.fill(); g.beginPath(); g.moveTo(445, 80); g.lineTo(480, 20); g.lineTo(520, 75); g.fill();
      // the spikes where Madeline dies
      [.36, .62].forEach(k => { const [x, y] = along(k); g.fillStyle = '#f2f2ff'; for (let j = -2; j <= 2; j++) { g.beginPath(); g.moveTo(x + j * 10 - 5, y + 14); g.lineTo(x + j * 10, y + 2); g.lineTo(x + j * 10 + 5, y + 14); g.fill(); } });
    } else if (id === 'stardew') {
      g.fillStyle = '#86bf55'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#8b5e34'; for (let r = 0; r < 6; r++) for (let c = 0; c < 9; c++) { if ((r + c) % 4 === 0) continue; g.fillRect(40 + c * 58, 60 + r * 72, 44, 30); }
      g.fillStyle = '#5c9a3a'; for (let r = 0; r < 6; r++) for (let c = 0; c < 9; c++) if ((r * 3 + c) % 5 === 1) { g.beginPath(); g.arc(62 + c * 58, 70 + r * 72, 6, 0, TAU); g.fill(); }
      g.strokeStyle = '#7a5230'; g.lineWidth = 4; g.beginPath(); g.moveTo(8, 24); g.lineTo(w - 8, 24); g.stroke(); for (let x = 12; x < w; x += 36) { g.beginPath(); g.moveTo(x, 14); g.lineTo(x, 34); g.stroke(); }
    } else if (id === 'doom') {
      g.fillStyle = '#4a2a22'; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 2; for (let x = 0; x < w; x += 60) for (let y = 0; y < h; y += 60) g.strokeRect(x, y, 60, 60);
      [[90, 90, 60], [520, 420, 70], [200, 520, 50]].forEach(([x, y, r], i) => { const gl = g.createRadialGradient(x, y, 4, x, y, r); gl.addColorStop(0, '#ffd27a'); gl.addColorStop(.5, '#ff6a1f'); gl.addColorStop(1, 'rgba(255,60,20,0)'); g.fillStyle = gl; g.beginPath(); g.arc(x, y, r * (1 + .05 * Math.sin(t * 3 + i)), 0, TAU); g.fill(); });
    }
  }
  function walker(g, id, x, y, t, p) {
    const bob = Math.sin(t * 10) * 1.5;
    g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(x, y + 12, 12, 5, 0, 0, TAU); g.fill();
    if (id === 'gow') {
      // Atreus walks a little behind
      const [ax, ay] = along(Math.max(0, p.k - .06));
      g.fillStyle = '#6b4a2c'; g.beginPath(); g.arc(ax, ay + 4, 6, 0, TAU); g.fill(); g.fillStyle = '#e4c9a5'; g.beginPath(); g.arc(ax, ay - 4, 4, 0, TAU); g.fill();
      g.fillStyle = '#d9c2a5'; g.beginPath(); g.arc(x, y + bob, 12, 0, TAU); g.fill(); g.fillStyle = '#c0392b'; g.fillRect(x - 2, y - 12 + bob, 4, 18);
      g.strokeStyle = '#9ad7ff'; g.lineWidth = 3; g.beginPath(); g.moveTo(x + 10, y + bob); g.lineTo(x + 20, y - 10 + bob); g.stroke();
    } else if (id === 'rdr2') {
      g.fillStyle = '#6b3f22'; g.beginPath(); g.ellipse(x, y + 2, 18, 8, 0, 0, TAU); g.fill(); g.beginPath(); g.ellipse(x + 17, y - 4 + bob, 6, 4, -.5, 0, TAU); g.fill();
      g.fillStyle = '#2f2a28'; g.beginPath(); g.arc(x - 2, y - 8 + bob, 7, 0, TAU); g.fill(); g.fillStyle = '#5a3d26'; g.beginPath(); g.ellipse(x - 2, y - 12 + bob, 10, 3, 0, 0, TAU); g.fill();
    } else if (id === 'witcher') {
      g.fillStyle = '#2b2b30'; g.beginPath(); g.arc(x, y + bob, 10, 0, TAU); g.fill(); g.fillStyle = '#eceff1'; g.beginPath(); g.arc(x, y - 4 + bob, 6, 0, TAU); g.fill();
      g.strokeStyle = '#b0b8c0'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 6, y + 8); g.lineTo(x + 8, y - 16); g.moveTo(x - 9, y + 6); g.lineTo(x + 3, y - 18); g.stroke();
    } else if (id === 'hades') {
      if (p.down) { g.fillStyle = 'rgba(255,90,80,.6)'; g.beginPath(); g.arc(x, y, 14 + p.at * 20, 0, TAU); g.fill(); return; }
      g.fillStyle = '#e8463f'; g.beginPath(); g.arc(x, y + bob, 10, 0, TAU); g.fill(); g.fillStyle = '#ffd34d'; g.beginPath(); g.arc(x, y - 6 + bob, 5, 0, TAU); g.fill();
    } else if (id === 'celeste') {
      if (p.down) { for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, r = 6 + p.at * 60; g.fillStyle = '#ff7ab8'; g.beginPath(); g.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, 4, 0, TAU); g.fill(); } return; }
      g.fillStyle = '#3b6fd6'; g.beginPath(); g.arc(x, y + bob, 9, 0, TAU); g.fill(); g.fillStyle = '#d6455a'; g.beginPath(); g.arc(x, y - 7 + bob, 6, 0, TAU); g.fill();
    } else if (id === 'stardew') {
      g.fillStyle = '#3c6fb0'; g.beginPath(); g.arc(x, y + bob, 9, 0, TAU); g.fill(); g.fillStyle = '#f1c27d'; g.beginPath(); g.arc(x, y - 7 + bob, 6, 0, TAU); g.fill(); g.fillStyle = '#c8a050'; g.beginPath(); g.ellipse(x, y - 11 + bob, 9, 3, 0, 0, TAU); g.fill();
    } else if (id === 'doom') {
      g.fillStyle = '#4f7a3a'; g.beginPath(); g.arc(x, y + bob, 11, 0, TAU); g.fill(); g.fillStyle = '#2f3a2a'; g.fillRect(x + 4, y - 3, 18, 6);
      if (Math.floor(t * 8) % 2) { g.fillStyle = '#ffd27a'; g.beginPath(); g.arc(x + 24, y, 4, 0, TAU); g.fill(); }
    }
  }
  function item(g, id, i, x, y, t, near) {
    const lab = LABELS[id][i];
    if (id === 'witcher') {
      const glow = near ? .5 + .5 * Math.sin(t * 6) : 0;
      if (near) { g.strokeStyle = `rgba(255,60,60,${.4 + .5 * glow})`; g.lineWidth = 3; g.beginPath(); g.arc(x, y, 14 + glow * 4, 0, TAU); g.stroke(); }
      g.fillStyle = near ? '#ff5050' : 'rgba(40,40,30,.4)'; g.beginPath(); g.arc(x, y, 5, 0, TAU); g.fill();
      if (near) T.label(lab, x, y - 22, 'center', '#fff', 11, 'rgba(120,20,20,.85)');
      return;
    }
    if (id === 'doom') {
      if (lab === 'armor') { g.fillStyle = '#5fb0ff'; rr(g, x - 8, y - 8, 16, 16, 4); g.fill(); }
      else { const big = lab !== 'imp'; g.fillStyle = big ? '#a0402a' : '#c06a3a'; g.beginPath(); g.arc(x, y, big ? 13 : 9, 0, TAU); g.fill(); g.fillStyle = '#2a1410'; g.beginPath(); g.moveTo(x - 7, y - 6); g.lineTo(x - 10, y - 16); g.lineTo(x - 3, y - 8); g.moveTo(x + 7, y - 6); g.lineTo(x + 10, y - 16); g.lineTo(x + 3, y - 8); g.fill(); g.fillStyle = '#ffd27a'; g.fillRect(x - 4, y - 2, 2, 2); g.fillRect(x + 2, y - 2, 2, 2); }
      T.label(lab, x, y - 22, 'center', '#fff', 11, 'rgba(60,20,10,.8)');
      return;
    }
    const col = { gow: '#c9a227', rdr2: '#e6d3a3', hades: lab === 'Darkness' ? '#9a5bd6' : '#ffd34d', celeste: '#e8455a', stardew: lab === 'parsnip' ? '#f0e6b0' : '#a68a64' }[id];
    if (lab === 'stranger') { g.fillStyle = '#5a3d2a'; g.beginPath(); g.arc(x, y, 7, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.font = font(13, 800); g.textAlign = 'center'; g.fillText('?', x, y - 12 + Math.sin(t * 4) * 2); }
    else if (id === 'celeste' && i < 7) { g.save(); g.translate(x, y + Math.sin(t * 3 + i) * 3); g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(-9, -4, 7, 3, -.4, 0, TAU); g.ellipse(9, -4, 7, 3, .4, 0, TAU); g.fill(); g.fillStyle = col; g.beginPath(); g.arc(0, 0, 6, 0, TAU); g.fill(); g.restore(); }
    else { g.fillStyle = col; g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, 6, 0, TAU); g.fill(); g.stroke(); }
    T.label(lab, x, y - 16, 'center', '#3b3552', 11, 'rgba(255,250,235,.85)');
  }
  function hud(g, id, t, got, w, h) {
    const n = l => got.filter(i => LABELS[id][i] === l).length;
    const bar = (lab, v, col, x, y) => { text(g, lab, x, y, 13, '#fffaf0', 700); g.fillStyle = 'rgba(0,0,0,.35)'; rr(g, x + 70, y - 11, 140, 12, 6); g.fill(); g.fillStyle = col; rr(g, x + 70, y - 11, 140 * clamp(v), 12, 6); g.fill(); };
    g.fillStyle = 'rgba(13,20,36,.62)'; rr(g, 8, h - 46, 330, 38, 8); g.fill();
    const y = h - 22;
    if (id === 'gow') text(g, `Runes Atreus has read: ${n('rune')}   Hacksilver: ${n('hacksilver') * 120}`, 20, y, 14, '#fffaf0', 700);
    if (id === 'rdr2') bar('Honor', .45 + n('stranger') * .2, '#f2f2f2', 20, y);
    if (id === 'witcher') text(g, `Contract: ${Math.min(got.length, 5)} of 5 clues${got.includes(7) ? ', lair found' : ''}`, 20, y, 14, '#fffaf0', 700);
    if (id === 'hades') text(g, `Run ${t >= 4.9 ? 2 : 1}   Boons: ${t >= 4.0 ? got.filter(i => i > 3 && LABELS.hades[i] === 'boon').length : n('boon')}   Darkness: ${n('Darkness') * 15}`, 20, y, 14, '#fffaf0', 700);
    if (id === 'celeste') text(g, `Deaths: ${EVENTS.celeste.filter(e => t >= e[0]).length}   Strawberries: ${n('strawberry')}`, 20, y, 14, '#fffaf0', 700);
    if (id === 'stardew') { const mins = 6 * 60 + t / LOOP * 15 * 60, hh = Math.floor(mins / 60), mm = Math.floor(mins % 60 / 10) * 10; text(g, `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'AM' : 'PM'}`, 20, y, 14, '#fffaf0', 700); bar('Energy', 1 - got.length * .09, '#7bd389', 100, y); }
    if (id === 'doom') { const kills = got.filter(i => LABELS.doom[i] !== 'armor').length, hp = clamp(.35 + kills * .09 - (t % 2.5) * .03); bar('Health', hp, '#ff6a6a', 20, y); text(g, `Kills: ${kills}`, 250, y, 14, '#fffaf0', 700); }
  }
  function generic(g, id, t, w, h, pathLine) {
    const p = prog(id, t), [px, py] = along(p.k), reach = reachOf(id);
    backdrop(g, id, t, w, h);
    pathLine(id === 'hades' || id === 'celeste' || id === 'doom' ? 'rgba(255,240,220,.3)' : 'rgba(59,53,82,.3)');
    if (id === 'hades') { // a shade guards the far rooms
      const sx = 380 + Math.sin(t * 1.3) * 20, sy = 300 + Math.cos(t * 1.1) * 14;
      g.fillStyle = 'rgba(160,220,255,.15)'; g.beginPath(); g.arc(sx, sy, 46, 0, TAU); g.fill(); g.fillStyle = '#9fd8ff'; g.beginPath(); g.arc(sx, sy, 10, 0, TAU); g.fill();
      text(g, 'the House', 40, 446, 12, '#ffd27a', 700);
    }
    const got = [];
    ITEMS.forEach(([ix, iy], i) => {
      if (!LABELS[id][i]) return;
      if (t >= reach[i]) { got.push(i); return; }
      item(g, id, i, ix, iy, t, Math.hypot(px - ix, py - iy) < 150);
    });
    if (id === 'witcher') { g.strokeStyle = 'rgba(255,80,80,.25)'; g.lineWidth = 2; g.setLineDash([4, 6]); g.beginPath(); g.arc(px, py, 150, 0, TAU); g.stroke(); g.setLineDash([]); }
    walker(g, id, px, py, t, p);
    ITEMS.forEach((_, i) => { const a = t - reach[i]; if (LABELS[id][i] && a >= 0 && a < .9) { g.save(); g.globalAlpha = clamp((1 - a / .9) * 1.6); T.label(POPS[id](i), px, py - 34 - a * 26, 'center', '#fffaf0', 14, 'rgba(21,32,68,.85)'); g.restore(); } });
    (EVENTS[id] || []).forEach(([te, msg, col]) => { const a = t - te; if (a >= 0 && a < 1.1) { if (a < .15) { g.fillStyle = `rgba(255,255,255,${.35 * (1 - a / .15)})`; g.fillRect(0, 0, w, h); } T.label(msg, w / 2, 60, 'center', '#fff', 18, 'rgba(20,10,30,.85)'); } });
    hud(g, id, t, got, w, h);
  }
  function draw(g, id, t, since) {
    const th = THEMES[id];
    T.use(g); g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,252,244,.92)'; rr(g, 0, 0, W, H, 14); g.fill();
    // left: the log line card
    const lx = 12, lw = 400;
    g.fillStyle = '#152044'; rr(g, lx, 12, lw, H - 24, 12); g.fill();
    g.save(); rr(g, lx, 12, lw, 210, [12, 12, 0, 0]); g.clip(); cover(g, th.art, lx, 12, lw, 210, th.fx ?? .5, th.fy);
    g.fillStyle = 'rgba(13,20,36,.72)'; g.fillRect(lx, 196, lw, 26); text(g, th.deck ? 'From the course deck' : 'Store art · log line is our summary', lx + 12, 214, 13, '#fffaf0', 600); g.restore();
    text(g, th.game, lx + 20, 252, 15, '#c9d3f0', 700);
    text(g, th.genre + ' · ' + th.tone, lx + 20, 274, 13, th.col, 800, 'left', 'M');
    const fade = clamp(since / .5);
    g.save(); g.globalAlpha = fade;
    g.font = font(28, 800, 'Montserrat, Jost'); g.fillStyle = '#fffaf0'; g.textAlign = 'left';
    wrap(g, '"' + th.log + '"', lx + 20, 312, lw - 40, 34, 28, '#fffaf0', 800);
    text(g, 'The log line decides', lx + 20, 384, 13, '#c9d3f0', 700);
    th.decides.forEach(([k, v], i) => {
      const y = 404 + i * 40, a = clamp((since - .3 - i * .25) / .4);
      g.save(); g.globalAlpha *= a;
      g.fillStyle = 'rgba(255,255,255,.07)'; rr(g, lx + 16, y, lw - 32, 34, 8); g.fill();
      text(g, k, lx + 28, y + 22, 14, th.col, 800, 'left', 'M'); text(g, v, lx + 120, y + 22, 15, '#fffaf0', 500);
      g.restore();
    });
    g.restore();
    // right: the same input in the world this log line builds
    const sx = 426, sw = W - sx - 12;
    text(g, 'Same input in every game: walk this path and pick things up.', sx, 34, 16, C.ink, 700);
    scene(g, id, t % LOOP, sx, 46, sw, H - 58);
  }
  const scenes = {};
  const DUR = w => LOOP * TOURS[w].length;
  canvasDemo('log', (s, cv, g) => {
    const st = { id: 'kat', t: 0, at: 0, tour: true, held: false, key: '' };
    const tourBtn = $(s, '.ll-tour');
    const free = () => { st.held = false; st.tour = false; tourBtn.classList.remove('on'); };
    $$(s, '.ll-pick .btn').forEach(b => b.onclick = () => { free(); st.id = b.dataset.id; st.at = st.t; st.t0 = st.t; });
    tourBtn.onclick = () => { st.held = false; st.tour = true; st.t = 0; st.list = 'log'; tourBtn.classList.add('on'); };
    st.list = 'log';
    function render(t) {
      let id = st.id, local = t - (st.t0 || 0), since = t - st.at;
      if (st.tour) { const L = TOURS[st.list], tt = t % DUR(st.list); id = L[Math.floor(tt / LOOP)]; local = tt % LOOP; since = local; }
      draw(g, id, local, since);
      if (st.key === id) return; st.key = id;
      $$(s, '.ll-pick .btn').forEach(b => b.classList.toggle('on', b.dataset.id === id));
      say($(s, '.ll-out'), THEMES[id].note);
    }
    Object.keys(TOURS).forEach(w => { scenes[w] = { seek(t) { st.held = true; st.tour = true; st.list = w; render(t); }, dur: () => DUR(w) }; });
    return dt => { if (st.held) return; st.t += dt; if (st.tour && st.t >= DUR(st.list)) st.t = 0; render(st.t); };
  });
  window.__seek = (t, which = 'log') => scenes[which].seek(t);
  window.__dur = (which = 'log') => scenes[which].dur();
})();
