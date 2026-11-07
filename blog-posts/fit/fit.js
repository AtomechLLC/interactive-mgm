/* Lesson 5: Fit ("Learning From My Past", xelnath.com, 2012-2013), cross-referenced with the Design Scripture. Five slides:
   1. Companion casting call ("Fit: Make it Appropriate for your Game"; Role-Based Cast Design, Characterized Barks): eight real
      companions, five worlds. A companion fits when its job exists in the world and its voice matches the world's tone.
      Job weights and tone numbers are our own reading, not measurements. Barks marked ≈ are paraphrased.
   2. Arm-wrestling chess ("Fit Your Audience"): captures settled by arm wrestling; 100 seeded games. Illustrative numbers.
   3. Wrong minigame (Relevancy and Skill Dissonance; Skill Spectrum): a five-skill radar of a core game against a segment
      dropped into it, forced or opt-in, and a crowd of 50 players. Radar values and the crowd are illustrative.
   4. Vehicle test (Consistency; Rule-Breakers): real vehicle sections sorted by "still tests your skill?" and "forced or opt-in".
   5. Role swap ("Fit Your Game"): ten raiders with WoW class icons through normal, Flame Leviathan, Malygos (and the post's
      reversed fix), the Oculus, Wintergrasp and Alysrazor. The identity meter is the share of a raider's own class buttons. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const { C, TAU, clamp, lerp, ease, IM, ready, rr, wrap, text, sprite, icon } = LP;
  const W = 1040, H = 585, F = (w, s) => `${w} ${s}px Jost, sans-serif`, M = (w, s) => `${w} ${s}px Montserrat, Jost, sans-serif`;
  const rnd = s => { const x = Math.sin(s * 91.7 + 17.3) * 43758.5453; return x - Math.floor(x); };
  const bar = (g, x, y, w, h, v, col, bg = '#ece3cf') => { g.fillStyle = bg; rr(g, x, y, w, h, h / 2); g.fill(); if (v > 0) { g.fillStyle = col; rr(g, x, y, Math.max(h, w * clamp(v)), h, h / 2); g.fill(); } };
  // a tour helper for hand-built demos: stages of fixed length, a manual mode, and a GIF runner
  function tourDemo(name, sl, tourSel, stages, len, apply) {
    const st = { tour: true, held: false, t: 0, stage: -1 }, tourBtn = $(sl, tourSel), DUR = stages.length * len;
    st.manual = () => { st.tour = false; tourBtn.classList.remove('on'); };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    st.tick = () => { if (st.tour) { const k = Math.floor((st.t % DUR) / len); st.u = (st.t % DUR) - k * len; if (k !== st.stage) { st.stage = k; apply(stages[k], k); } } };
    LP.runners[name] = { seek(t) { st.held = true; st.tour = true; st.t = t; st.stage = -1; st.frame(); }, dur: () => DUR };
    st.step = dt => { if (st.held) return; if (st.tour) st.t = (st.t + Math.max(0, Math.min(dt, .1))) % DUR; st.frame(); };
    return st;
  }

  /* ---------------- 1. Companion casting call ---------------- */
  const JOB = { fight: 'fights for you', taunt: 'narrates and taunts the puzzles', locate: 'finds runes and reads people', guide: 'guides the dungeon and the calendar', banter: 'wisecracks', hints: 'gives hints', supply: 'throws you supplies' };
  const WORLDS = [
    { id: 'pk', name: 'Pokémon', place: 'a trainer battle', tone: [.9, .85, .05], jobs: { fight: 1, banter: .3 }, home: 'pika' },
    { id: 'po', name: 'Portal 2', place: 'a test chamber', tone: [.15, .75, .45], jobs: { taunt: 1, banter: .4 }, home: 'glados' },
    { id: 'di', name: 'Dishonored', place: 'a guarded alley', tone: [.15, .1, .9], jobs: { locate: 1, hints: .2 }, home: 'heart' },
    { id: 'p5', name: 'Persona 5', place: 'a school day', tone: [.6, .65, .4], jobs: { guide: 1, fight: .5, banter: .5, hints: .4 }, home: 'morgana' },
    { id: 'jk', name: 'Jak and Daxter', place: 'a jungle island', tone: [.65, .95, .15], jobs: { banter: 1, hints: .3, fight: .2 }, home: 'daxter' },
  ];
  const COMP = {
    pika: { name: 'Pikachu', from: 'Pokémon', job: 'fight', tone: [.95, .85, .05], img: 'img/pikachu.png', px: true, disc: '#fff3b0', bark: 'Pika pika!' },
    glados: { name: 'GLaDOS', from: 'Portal 2', job: 'taunt', tone: [.05, .7, .5], img: 'img/potato.svg', disc: '#eef2f6', bark: 'Here come the test results: “You are a horrible person.” We weren’t even testing for that.' },
    heart: { name: 'The Heart', from: 'Dishonored', job: 'locate', tone: [.25, .05, .85], img: 'img/heart.svg', disc: '#e9d6c3', bark: '≈ This one sold his own brother to the plague. He sleeps well.' },
    morgana: { name: 'Morgana', from: 'Persona 5', job: 'guide', tone: [.6, .7, .3], img: 'img/morgana.svg', disc: '#1c1c24', bark: '≈ You must be tired. Let’s go to bed.' },
    daxter: { name: 'Daxter', from: 'Jak and Daxter', job: 'banter', tone: [.55, .95, .1], img: 'img/daxter.svg', disc: '#d9822b', bark: '≈ If this goes south, Jak, I was never here!' },
    navi: { name: 'Navi', from: 'Ocarina of Time', job: 'hints', tone: [.65, .5, .1], img: 'img/navi.svg', disc: '#3b7fd0', bark: 'Hey! Listen!' },
    fi: { name: 'Fi', from: 'Skyward Sword', job: 'hints', tone: [.3, .15, .2], img: 'img/fi.svg', disc: '#5b5f9e', bark: '≈ Master, the batteries in your Wii Remote are nearly depleted.' },
    eliz: { name: 'Elizabeth', from: 'BioShock Infinite', job: 'supply', tone: [.7, .35, .45], img: 'img/tear.svg', disc: '#2d6a8a', bark: 'Booker, catch!' },
  };
  const REACT = {
    pk: { fits: 'Battle on: it has a job in every encounter.', idle: 'Trainer battles need a fighter. This one just watches.', voice: 'A kids’ adventure suddenly turns strange.', ok: 'It could work, with a wink.' },
    po: { fits: 'Every chamber gets a running commentary.', idle: 'Portal teaches through the room itself: there is nothing to fight, find or hint at.', voice: 'Aperture’s dry menace goes soft.', ok: 'It could work as a side voice.' },
    di: { fits: 'Every target comes with a secret.', idle: 'Stealth needs eyes and secrets. This companion has neither.', voice: 'The plague city stops feeling dangerous.', ok: 'It could work, quietly.' },
    p5: { fits: 'Dungeons by night, a calendar by day: it runs both.', idle: 'Nothing for it to do between classes.', voice: 'Too grim for after-school life.', ok: 'It could work as a party member.' },
    jk: { fits: 'The jungle needs a wisecracking sidekick.', idle: 'Platforming needs a mouth, not this.', voice: 'A sunny island goes dark.', ok: 'It could work as a hint giver.' },
  };
  const SPECIAL = { 'navi@di': 'The guards heard that.', 'pika@po': 'There is nothing to battle. Pikachu waits by the portal.', 'daxter@di': 'A wisecrack in a plague city. Nobody laughs.', 'heart@pk': 'It whispers the rival’s darkest secret to a ten-year-old.', 'glados@pk': 'It insults Professor Oak, then has nothing to do in the battle.', 'daxter@po': 'GLaDOS already does the talking. Daxter has no job.' };
  const toneMatch = (a, b) => clamp(1 - Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) / .9);
  function judge(w, c) {
    const job = w.jobs[c.job] || 0, tone = toneMatch(w.tone, c.tone);
    const v = job < .35 ? 'idle' : tone < .45 ? 'voice' : job >= .7 && tone >= .6 ? 'fits' : 'ok';
    return { job, tone, v };
  }
  const VLABEL = { fits: ['it belongs here', C.green], ok: ['it could work', C.goldInk], idle: ['nothing to do here', C.red], voice: ['wrong voice for this world', C.red] };
  function worldBg(g, w, x, y, ww, hh, t) {
    const grad = (a, b) => { const gr = g.createLinearGradient(0, y, 0, y + hh); gr.addColorStop(0, a); gr.addColorStop(1, b); return gr; };
    if (w.id === 'pk') {
      g.fillStyle = grad('#bfe6ff', '#8fd06a'); g.fillRect(x, y, ww, hh);
      g.fillStyle = '#7cc055'; g.fillRect(x, y + hh * .55, ww, hh * .45);
      g.fillStyle = 'rgba(60,140,50,.5)'; g.beginPath(); g.ellipse(x + ww * .3, y + hh * .8, 150, 34, 0, 0, TAU); g.fill(); g.beginPath(); g.ellipse(x + ww * .75, y + hh * .45, 110, 24, 0, 0, TAU); g.fill();
      const bx = x + ww * .78, by = y + hh * .3; // a rival's ball on the far platform
      g.fillStyle = '#e3352b'; g.beginPath(); g.arc(bx, by, 22, Math.PI, 0); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(bx, by, 22, 0, Math.PI); g.fill();
      g.strokeStyle = '#1b1b1b'; g.lineWidth = 4; g.beginPath(); g.arc(bx, by, 22, 0, TAU); g.stroke(); g.beginPath(); g.moveTo(bx - 22, by); g.lineTo(bx + 22, by); g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.arc(bx, by, 6, 0, TAU); g.fill(); g.stroke();
    } else if (w.id === 'po') {
      g.fillStyle = grad('#f6f8fa', '#d3d9e1'); g.fillRect(x, y, ww, hh);
      g.strokeStyle = 'rgba(120,130,150,.35)'; g.lineWidth = 2;
      for (let yy = y; yy < y + hh; yy += 60) { g.beginPath(); g.moveTo(x, yy); g.lineTo(x + ww, yy); g.stroke(); }
      for (let xx = x; xx < x + ww; xx += 60) { g.beginPath(); g.moveTo(xx, y); g.lineTo(xx, y + hh); g.stroke(); }
      [[x + 70, '#2e8cff'], [x + ww - 70, '#ff8a1e']].forEach(([px, col]) => { g.save(); g.shadowColor = col; g.shadowBlur = 24; g.strokeStyle = col; g.lineWidth = 9; g.beginPath(); g.ellipse(px, y + hh * .5, 34, 80 + Math.sin(t * 3) * 3, 0, 0, TAU); g.stroke(); g.restore(); });
    } else if (w.id === 'di') {
      g.fillStyle = grad('#3b4458', '#1d1a17'); g.fillRect(x, y, ww, hh);
      g.fillStyle = 'rgba(0,0,0,.45)'; [[0, 260], [70, 330], [160, 220], [250, 300], [350, 250], [440, 340], [520, 280]].forEach(([bx, bh]) => g.fillRect(x + bx, y + hh - bh, 80, bh));
      const lx = x + ww - 90, ly = y + 120, gl = g.createRadialGradient(lx, ly, 4, lx, ly, 140); gl.addColorStop(0, 'rgba(255,214,120,.55)'); gl.addColorStop(1, 'rgba(255,214,120,0)');
      g.fillStyle = gl; g.fillRect(lx - 140, ly - 140, 280, 280); g.fillStyle = '#ffd36e'; g.fillRect(lx - 6, ly - 10, 12, 18); g.fillStyle = '#222'; g.fillRect(lx - 2, ly + 8, 4, 200);
      g.fillStyle = 'rgba(20,20,20,.9)'; g.beginPath(); g.arc(x + 120, y + hh - 150, 16, 0, TAU); g.fill(); g.fillRect(x + 106, y + hh - 134, 28, 70); // a guard
    } else if (w.id === 'p5') {
      g.fillStyle = '#d6151c'; g.fillRect(x, y, ww, hh);
      g.fillStyle = '#111'; [[0, 0, 180, 0, 60, 200], [ww, 60, ww - 220, hh, ww, hh], [0, hh, 140, hh - 120, 260, hh]].forEach(p => { g.beginPath(); g.moveTo(x + p[0], y + p[1]); g.lineTo(x + p[2], y + p[3]); g.lineTo(x + p[4], y + p[5]); g.fill(); });
      g.save(); g.translate(x + ww - 150, y + 70); g.rotate(-.08); g.fillStyle = '#fff'; g.fillRect(-70, -30, 150, 64); g.fillStyle = '#111'; g.font = M(800, 30); g.textAlign = 'center'; g.fillText('4/12 Tu', 5, 4); g.font = F(600, 14); g.fillText('AFTER SCHOOL', 5, 24); g.restore();
    } else {
      g.fillStyle = grad('#7fe0ff', '#bff3ff'); g.fillRect(x, y, ww, hh);
      g.fillStyle = '#2fa7d6'; g.fillRect(x, y + hh * .6, ww, hh * .1); g.fillStyle = '#f2d98c'; g.fillRect(x, y + hh * .7, ww, hh * .3);
      [[x + 60, 1], [x + ww - 70, -1]].forEach(([px, d]) => { g.strokeStyle = '#8a5a2b'; g.lineWidth = 14; g.beginPath(); g.moveTo(px, y + hh * .85); g.quadraticCurveTo(px + d * 30, y + hh * .5, px + d * 10, y + hh * .2); g.stroke();
        g.fillStyle = '#2f9e3a'; for (let k = 0; k < 5; k++) { g.beginPath(); g.ellipse(px + d * 10 + Math.cos(k * 1.3) * 40, y + hh * .2 + Math.sin(k * 1.3) * 14, 46, 12, k * 1.3, 0, TAU); g.fill(); } });
    }
  }
  function bubble(g, msg, x, y, w, tailX, tailY) {
    g.font = F(600, 18); const lines = []; let line = '';
    String(msg).split(' ').forEach(wd => { if (line && g.measureText(line + wd).width > w - 28) { lines.push(line.trim()); line = ''; } line += wd + ' '; }); if (line.trim()) lines.push(line.trim());
    const h = lines.length * 24 + 22;
    g.fillStyle = '#fff'; g.strokeStyle = C.navy; g.lineWidth = 3; rr(g, x, y, w, h, 16); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(x + 30, y + h - 2); g.lineTo(tailX, tailY); g.lineTo(x + 62, y + h - 2); g.closePath(); g.fill(); g.beginPath(); g.moveTo(x + 30, y + h); g.lineTo(tailX, tailY); g.lineTo(x + 62, y + h); g.stroke();
    g.fillStyle = C.ink; g.textAlign = 'left'; lines.forEach((l, i) => g.fillText(l, x + 14, y + 30 + i * 24));
  }
  function compScene(g, wi, ck, t) {
    const w = WORLDS[wi], c = COMP[ck], j = judge(w, c);
    g.clearRect(0, 0, W, H);
    // the world
    const X = 10, Y = 10, SW = 620, SH = 565;
    g.save(); rr(g, X, Y, SW, SH, 14); g.clip(); worldBg(g, w, X, Y, SW, SH, t); g.restore();
    g.strokeStyle = C.line; g.lineWidth = 2; rr(g, X, Y, SW, SH, 14); g.stroke();
    g.fillStyle = 'rgba(21,32,68,.85)'; rr(g, X + 14, Y + 14, 300, 52, 10); g.fill();
    text(g, w.name.toUpperCase(), X + 28, Y + 38, M(800, 18), '#fff'); text(g, w.place, X + 28, Y + 58, F(500, 15), '#d7dcf0');
    // the companion, bobbing
    const cx = X + 200, cy = Y + 330 + Math.sin(t * 2.4) * 6, r = 92;
    g.fillStyle = c.disc; g.strokeStyle = C.navy; g.lineWidth = 4; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill(); g.stroke();
    const im = IM(c.img); if (ready(im)) { g.save(); g.imageSmoothingEnabled = !c.px; g.drawImage(im, cx - 66, cy - 66, 132, 132); g.restore(); }
    g.fillStyle = C.navy; rr(g, cx - 80, cy + r - 6, 160, 30, 8); g.fill(); text(g, c.name, cx, cy + r + 15, M(700, 16), '#fff', 'center');
    bubble(g, c.bark, X + 250, Y + 110, 340, cx + 50, cy - r + 10);
    // the world's reaction
    const rx = SPECIAL[ck + '@' + w.id] || REACT[w.id][j.v], [vl, vc] = VLABEL[j.v];
    g.fillStyle = 'rgba(255,252,244,.95)'; rr(g, X + 14, Y + SH - 92, SW - 28, 78, 12); g.fill(); g.strokeStyle = vc; g.lineWidth = 3; g.stroke();
    text(g, vl.toUpperCase(), X + 30, Y + SH - 64, M(800, 16), vc);
    g.font = F(600, 17); g.fillStyle = C.ink; g.textAlign = 'left'; wrap(g, rx, X + 30, Y + SH - 40, SW - 60, 22);
    // right: job and voice
    const R = 645, RW = 385;
    g.fillStyle = C.paper; rr(g, R, Y, RW, SH, 14); g.fill(); g.strokeStyle = C.line; g.lineWidth = 2; g.stroke();
    text(g, 'ITS JOB', R + 20, Y + 34, M(800, 14), C.muted);
    text(g, JOB[c.job], R + 20, Y + 60, M(700, 18), C.ink);
    text(g, `What ${w.name} needs a companion for:`, R + 20, Y + 92, F(600, 15), C.muted);
    Object.entries(w.jobs).sort((a, b) => b[1] - a[1]).forEach(([k, v], i) => {
      const yy = Y + 108 + i * 30, me = k === c.job;
      text(g, JOB[k], R + 20, yy + 15, F(me ? 700 : 500, 15), me ? C.ink : C.muted);
      bar(g, R + 250, yy + 4, 115, 14, v, me ? C.navy : '#b9b2a2');
    });
    const jy = Y + 240;
    text(g, `job here ${Math.round(j.job * 100)}%`, R + 20, jy, M(800, 20), j.job >= .7 ? C.green : j.job >= .35 ? C.goldInk : C.red);
    g.strokeStyle = C.line; g.lineWidth = 1.5; g.beginPath(); g.moveTo(R + 20, jy + 22); g.lineTo(R + RW - 20, jy + 22); g.stroke();
    text(g, 'ITS VOICE', R + 20, jy + 54, M(800, 14), C.muted);
    ['warmth', 'whimsy', 'dread'].forEach((a, i) => {
      const yy = jy + 72 + i * 40, bx = R + 110, bw = 255;
      text(g, a, R + 20, yy + 13, F(600, 16), C.ink); bar(g, bx, yy, bw, 16, c.tone[i], '#8ea2e6');
      g.fillStyle = C.navy; g.fillRect(bx + bw * w.tone[i] - 2, yy - 6, 4, 28);
    });
    text(g, `bar: ${c.name} · line: ${w.name}`, R + 20, jy + 200, F(500, 13), C.muted);
    text(g, `voice match ${Math.round(j.tone * 100)}%`, R + 20, jy + 236, M(800, 20), j.tone >= .6 ? C.green : j.tone >= .45 ? C.goldInk : C.red);
    text(g, `from ${c.from}`, R + 20, Y + SH - 20, F(500, 14), C.muted);
  }
  canvasDemo('comp', (sl, cv, g) => {
    const wSeg = $(sl, '.cp-world'), cSeg = $(sl, '.cp-comp'), out = $(sl, '.cp-out');
    wSeg.innerHTML = WORLDS.map((w, i) => `<button class="btn" data-w="${i}">${w.name}</button>`).join('');
    cSeg.innerHTML = Object.entries(COMP).map(([k, c]) => `<button class="btn" data-c="${k}">${c.name.replace('The ', '')}</button>`).join('');
    const STAGES = [
      [0, 'pika', 'As shipped, Pokémon: a partner who fights for you, as warm as the world. “That decision is what I call Fit.”'],
      [1, 'glados', 'As shipped, Portal 2: the puzzles need a narrator, and the narrator is your cold, funny nemesis.'],
      [2, 'heart', 'As shipped, Dishonored: the Heart finds runes and tells you secrets about the people you might kill. It fronts a system and carries the dread.'],
      [3, 'morgana', 'Persona 5 (not in the post): Morgana guides the dungeons by night and the calendar by day, and famously sends you to bed.'],
      [4, 'daxter', 'The publisher’s pitch: “games with a witty animal companion sell 33% more merchandise.” Daxter is that companion, and in his own game he has a job.'],
      [1, 'daxter', 'The same Daxter in Aperture: GLaDOS already does the talking. No job, so no fit.'],
      [2, 'daxter', 'And in Dunwall: he has a mouth but the wrong voice. The 33% only holds where the companion has work to do.'],
      [2, 'navi', 'Navi in a stealth game: “Hey! Listen!”'],
      [0, 'pika', 'Every companion here is a talking sidekick. The mechanic never changed; only the fit did.'],
    ];
    const st = tourDemo('comp', sl, '.cp-tour', STAGES, 4.5, s => { st.w = s[0]; st.c = s[1]; say(out, s[2]); });
    st.w = 0; st.c = 'pika'; let T = 0;
    const manualSay = () => { const w = WORLDS[st.w], c = COMP[st.c], j = judge(w, c); say(out, `<b>${c.name}</b> in ${w.name}: ${VLABEL[j.v][0]}. ${w.home === st.c ? 'This is the companion the game shipped with.' : `${w.name} shipped with ${COMP[w.home].name}.`}`); };
    $$(wSeg, '.btn').forEach(b => b.onclick = () => { st.manual(); st.w = +b.dataset.w; manualSay(); });
    $$(cSeg, '.btn').forEach(b => b.onclick = () => { st.manual(); st.c = b.dataset.c; manualSay(); });
    $(sl, '.cp-pitch').onclick = () => { st.manual(); st.c = 'daxter'; manualSay(); };
    $(sl, '.cp-ship').onclick = () => { st.manual(); st.c = WORLDS[st.w].home; manualSay(); };
    st.frame = () => {
      st.tick(); T = st.held ? st.t : T;
      compScene(g, st.w, st.c, st.held ? st.t : performance.now() / 1000);
      $$(wSeg, '.btn').forEach(b => b.classList.toggle('on', +b.dataset.w === st.w));
      $$(cSeg, '.btn').forEach(b => b.classList.toggle('on', b.dataset.c === st.c));
    };
    return st.step;
  });

  /* ---------------- 2. Arm-wrestling chess ---------------- */
  const elo = (a, b) => 1 / (1 + Math.pow(10, (b - a) / 400));
  function chessScene(g, f, pl) {
    g.clearRect(0, 0, W, H);
    const pChess = elo(pl.aChess, pl.bChess), pArm = pl.aArm / (pl.aArm + pl.bArm);
    // each game: several captures; the more captures go to the arm, the more the arm decides (toy model)
    const pA = clamp((1 - f) * pChess + f * pArm);
    // left: the board-and-table picture
    g.fillStyle = C.paper; rr(g, 10, 10, 470, 565, 14); g.fill(); g.strokeStyle = C.line; g.lineWidth = 2; g.stroke();
    text(g, 'The rules', 30, 44, '600 14px Jost, sans-serif', C.muted);
    g.font = '600 17px Jost, sans-serif'; g.fillStyle = C.ink; g.textAlign = 'left';
    wrap(g, '“Plays just like regular chess.” “When pieces fight, the opponents arm wrestle to determine if a piece is killed.”', 30, 72, 430, 24);
    for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) { g.fillStyle = (r + c) % 2 ? '#b58863' : '#f0d9b5'; g.fillRect(40 + c * 34, 150 + r * 34, 34, 34); }
    text(g, '♞', 40 + 2 * 34 + 17, 150 + 3 * 34 + 27, '400 30px serif', '#1b1b1b', 'center'); text(g, '♝', 40 + 3 * 34 + 17, 150 + 2 * 34 + 27, '400 30px serif', '#fff', 'center');
    const mi = IM('img/muscle.svg'); if (ready(mi)) { g.fillStyle = C.navy; g.beginPath(); g.arc(360, 252, 60, 0, TAU); g.fill(); g.drawImage(mi, 320, 212, 80, 80); }
    text(g, `${Math.round(f * 100)}% of captures`, 360, 340, '800 20px Montserrat, Jost, sans-serif', C.ink, 'center');
    text(g, 'settled by arm wrestling', 360, 362, '500 15px Jost, sans-serif', C.muted, 'center');
    // the two players
    [[pl.aName, pl.aChess, pl.aArm, '#2e7fd6'], [pl.bName, pl.bChess, pl.bArm, '#d8402f']].forEach(([n, ch, arm, col], i) => {
      const y = 410 + i * 76; g.fillStyle = col; g.beginPath(); g.arc(46, y + 18, 16, 0, TAU); g.fill();
      text(g, n, 74, y + 12, '700 17px Montserrat, Jost, sans-serif', C.ink); text(g, `chess rating ${ch} · arm strength ${arm}/10`, 74, y + 34, '500 15px Jost, sans-serif', C.muted);
    });
    // right: 100 games
    const x0 = 495; g.fillStyle = C.paper; rr(g, x0, 10, 535, 565, 14); g.fill(); g.strokeStyle = C.line; g.lineWidth = 2; g.stroke();
    text(g, '100 games', x0 + 20, 44, '700 18px Montserrat, Jost, sans-serif', C.ink);
    let aw = 0; for (let i = 0; i < 100; i++) { const win = rnd(i) < pA; if (win) aw++; g.fillStyle = win ? '#2e7fd6' : '#d8402f'; g.beginPath(); g.arc(x0 + 40 + (i % 20) * 24, 74 + Math.floor(i / 20) * 24, 9, 0, TAU); g.fill(); }
    text(g, `${pl.aName} wins ${aw}`, x0 + 20, 214, '800 20px Montserrat, Jost, sans-serif', '#1d5aa0'); text(g, `${pl.bName} wins ${100 - aw}`, x0 + 280, 214, '800 20px Montserrat, Jost, sans-serif', '#a8261c');
    // what decides it
    text(g, 'What decides the winner', x0 + 20, 260, '600 15px Jost, sans-serif', C.muted);
    const dChess = Math.abs((1 - f) * (pChess - .5)), dArm = Math.abs(f * (pArm - .5)), tot = dChess + dArm || 1;
    g.fillStyle = '#6b4f2a'; rr(g, x0 + 20, 272, 495 * dChess / tot, 26, 6); g.fill(); g.fillStyle = '#c07a0c'; rr(g, x0 + 20 + 495 * dChess / tot, 272, 495 * dArm / tot, 26, 6); g.fill();
    text(g, `chess ${Math.round(100 * dChess / tot)}%`, x0 + 26, 291, '600 14px Jost, sans-serif', '#fff'); text(g, `arm ${Math.round(100 * dArm / tot)}%`, x0 + 509, 291, '600 14px Jost, sans-serif', '#fff', 'right');
    // who can follow it
    text(g, 'Who can follow the match (illustrative)', x0 + 20, 340, '600 15px Jost, sans-serif', C.muted);
    [['chess fans', 1 - f * .8, '#6b4f2a'], ['arm-wrestling fans', .2 + f * .8 - (1 - f) * .1, '#c07a0c']].forEach(([n, v, col], i) => {
      const y = 356 + i * 46; text(g, n, x0 + 20, y + 18, '600 15px Jost, sans-serif', C.ink);
      g.fillStyle = '#ece3cf'; rr(g, x0 + 180, y + 4, 330, 18, 9); g.fill(); g.fillStyle = col; rr(g, x0 + 180, y + 4, 330 * clamp(v), 18, 9); g.fill();
    });
    g.font = '600 16px Jost, sans-serif'; g.fillStyle = C.ink; g.textAlign = 'left';
    wrap(g, f > .1 && f < .9 ? '“Don’t cross the streams.” Two skills with different ways to win: the chess player loses to the arm, and neither audience can follow the whole match.' : f <= .1 ? 'Mostly chess: the rating decides, and chess fans can follow every move.' : 'Mostly arm wrestling: the arm decides, and the board is decoration.', x0 + 20, 468, 495, 23);
    text(g, '“People are drawn to watch what they know and understand.”', x0 + 20, 560, '500 italic 14px Jost, sans-serif', C.muted);
  }
  canvasDemo('chess', (sl, cv, g) => {
    const st = { tour: true, held: false, t: 0, f: 0 }, tourBtn = $(sl, '.ch-tour'), rf = $(sl, '.ch-f');
    const pl = { aName: 'The grandmaster', aChess: 2400, aArm: 3, bName: 'The champion', bChess: 1400, bArm: 9 };
    rf.oninput = () => { st.tour = false; tourBtn.classList.remove('on'); st.f = +rf.value / 100; };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    const DUR = 14;
    function frame() {
      if (st.tour) { const k = (st.t % DUR) / DUR; st.f = Math.round(clamp(k < .15 ? 0 : k > .85 ? 1 : (k - .15) / .7) * 20) / 20; }
      chessScene(g, st.f, pl); if (document.activeElement !== rf) rf.value = Math.round(st.f * 100); $(sl, '.ch-fv').textContent = `${Math.round(st.f * 100)}%`;
    }
    LP.runners.chess = { seek(t) { st.held = true; st.tour = true; st.t = t; frame(); }, dur: () => DUR };
    return dt => { if (st.held) return; if (st.tour) st.t = (st.t + Math.max(0, Math.min(dt, .1))) % DUR; frame(); };
  });

  /* ---------------- 3. Wrong minigame ---------------- */
  const AX5 = ['execution', 'decisions', 'processing', 'knowledge', 'freeform'];
  const CASES = [
    { id: 'big', game: 'Sonic Adventure', core: [.95, .2, .75, .3, .25], seg: 'Big the Cat’s fishing', sv: [.15, .15, .15, .3, .1], icon: 'fishing', mode: 'forced', note: 'Sonic sells speed. Big’s story is waiting for a fish to bite. The scripture’s phrase: “you signed up for this, not this.”' },
    { id: 'mj', game: 'Marvel’s Spider-Man', core: [.85, .4, .7, .3, .6], seg: 'Mary Jane’s stealth', sv: [.25, .5, .35, .65, .1], icon: 'hood', mode: 'forced', note: 'You came to swing through the city. These levels take every power away and ask you to memorise guard routes.' },
    { id: 'train', game: 'GTA: San Andreas', core: [.5, .45, .5, .3, .95], seg: '“Follow the damn train”', sv: [.9, .1, .75, .2, .05], icon: 'train', mode: 'forced', note: 'A sandbox about doing anything becomes one strict chase you must win to continue the story.' },
    { id: 'mako', game: 'Mass Effect', core: [.4, .9, .4, .5, .4], seg: 'Driving the Mako', sv: [.8, .1, .55, .1, .3], icon: 'rover', mode: 'forced', note: 'A game about choices becomes a game about bouncing a six-wheeled tank up a mountain.' },
    { id: 'condor', game: 'Final Fantasy VII', core: [.15, .7, .3, .7, .3], seg: 'Fort Condor', sv: [.35, .8, .8, .35, .2], icon: 'castle', mode: 'opt', note: 'A tower-defense battle inside an RPG. It still asks for decisions, and it is mostly optional, so the gap costs little.' },
    { id: 'kara', game: 'Yakuza 0', core: [.7, .4, .55, .3, .5], seg: 'Karaoke', sv: [.85, .05, .6, .2, .1], icon: 'mic', mode: 'opt', note: 'A rhythm game inside a brawler, but you only sing if you walk into the bar.' },
    { id: 'gwent', game: 'The Witcher 3', core: [.6, .65, .5, .55, .6], seg: 'Gwent', sv: [0, .95, .45, .8, .1], icon: 'cards', mode: 'opt', note: 'A card game inside an action RPG. Optional, and popular enough to become its own game.' },
    { id: 'c960', game: 'Chess', core: [0, .95, .6, .9, .1], seg: 'Chess960', sv: [0, .95, .6, .3, .25], icon: 'knight', mode: 'opt', note: 'Bobby Fischer shuffled the back row so memorised openings stop counting. Players who want that, choose it.' },
    { id: 'necro', game: 'Crypt of the NecroDancer', core: [.85, .65, .8, .45, .3], seg: 'Rhythm (fused)', sv: [.85, .65, .8, .45, .3], icon: 'notes', mode: 'fused', note: 'Rhythm is not a segment here: every move in the dungeon is on the beat. Two skills fused into one test (the scripture’s “skill combination”), so nobody is handed a different game.' },
  ];
  const gapOf = cs => clamp(AX5.reduce((a, _, i) => a + Math.abs(cs.core[i] - cs.sv[i]), 0) / 5 * 2.2);
  function radar(g, cx, cy, r, vals, fill, stroke, k = 1) {
    g.beginPath(); vals.forEach((v, i) => { const a = -Math.PI / 2 + i * TAU / 5, rr2 = r * (.08 + .92 * v * k); g[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * rr2, cy + Math.sin(a) * rr2); }); g.closePath();
    g.fillStyle = fill; g.fill(); g.strokeStyle = stroke; g.lineWidth = 3; g.stroke();
  }
  function person(g, x, y, col, a = 1) { g.globalAlpha = a; g.fillStyle = col; g.beginPath(); g.arc(x, y - 13, 7, 0, TAU); g.fill(); rr(g, x - 9, y - 4, 18, 20, 7); g.fill(); g.globalAlpha = 1; }
  function skillScene(g, cs, mode, k) {
    g.clearRect(0, 0, W, H);
    g.fillStyle = C.paper; rr(g, 10, 10, 500, 565, 14); g.fill(); g.strokeStyle = C.line; g.lineWidth = 2; g.stroke();
    text(g, 'WHAT EACH ONE TESTS', 30, 42, M(800, 14), C.muted);
    const cx = 260, cy = 290, r = 175;
    g.strokeStyle = '#ddd2ba'; g.lineWidth = 1.5;
    [.25, .5, .75, 1].forEach(f => { g.beginPath(); for (let i = 0; i <= 5; i++) { const a = -Math.PI / 2 + i * TAU / 5; g[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * r * f, cy + Math.sin(a) * r * f); } g.stroke(); });
    AX5.forEach((ax, i) => { const a = -Math.PI / 2 + i * TAU / 5; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); g.stroke();
      text(g, ax, cx + Math.cos(a) * (r + 30), cy + Math.sin(a) * (r + 24) + 6, F(600, 16), C.ink, Math.abs(Math.cos(a)) < .2 ? 'center' : Math.cos(a) > 0 ? 'left' : 'right'); });
    radar(g, cx, cy, r, cs.core, 'rgba(46,127,214,.25)', '#2e7fd6');
    if (mode !== 'fused') radar(g, cx, cy, r, cs.core.map((v, i) => lerp(v, cs.sv[i], k)), 'rgba(192,122,12,.22)', '#c07a0c');
    g.fillStyle = '#2e7fd6'; rr(g, 30, 530, 16, 16, 4); g.fill(); text(g, cs.game, 54, 544, F(600, 15), C.ink);
    if (mode !== 'fused') { g.fillStyle = '#c07a0c'; rr(g, 270, 530, 16, 16, 4); g.fill(); text(g, cs.seg, 294, 544, F(600, 15), C.ink); }
    // right: the crowd
    const R = 525, RW = 505, gap = gapOf(cs) * k;
    g.fillStyle = C.paper; rr(g, R, 10, RW, 565, 14); g.fill(); g.strokeStyle = C.line; g.lineWidth = 2; g.stroke();
    const im = IM(`img/${cs.icon}.svg`); g.fillStyle = mode === 'fused' ? C.green : mode === 'opt' ? C.goldInk : C.red; g.beginPath(); g.arc(R + 48, 58, 30, 0, TAU); g.fill(); if (ready(im)) g.drawImage(im, R + 26, 36, 44, 44);
    text(g, cs.game, R + 92, 50, M(800, 19), C.ink);
    text(g, mode === 'fused' ? 'two skills fused into one test' : `+ ${cs.seg}`, R + 92, 76, F(600, 16), C.muted);
    const tag = { forced: 'FORCED: you must finish it to go on', opt: 'OPT-IN: play it if you want', fused: 'FUSED: it is the core game' }[mode];
    text(g, tag, R + 20, 122, M(800, 15), mode === 'forced' ? C.red : mode === 'opt' ? C.goldInk : C.green);
    if (mode !== 'fused') { text(g, `skill gap ${Math.round(gap * 100)}%`, R + RW - 20, 122, M(800, 15), C.ink, 'right'); }
    text(g, `50 players who bought ${cs.game} (illustrative)`, R + 20, 156, F(600, 15), C.muted);
    let n = { play: 0, quit: 0, skip: 0, tried: 0 };
    for (let i = 0; i < 50; i++) {
      const tol = rnd(i + 3), miss = mode !== 'fused' && tol < gap * 1.15, x = R + 45 + (i % 10) * 46, y = 200 + Math.floor(i / 10) * 52;
      let col = C.green, a = 1, s = 'play';
      if (miss && mode === 'forced') { col = C.red; a = .9; s = 'quit'; } else if (miss) { col = '#9a968c'; s = 'skip'; } else if (mode === 'opt') { col = C.goldInk; s = 'tried'; }
      n[s]++; person(g, x, y + (s === 'quit' ? 8 : 0), col, a);
      if (s === 'quit') { g.strokeStyle = C.red; g.lineWidth = 2; g.beginPath(); g.moveTo(x + 10, y + 20); g.lineTo(x + 18, y + 26); g.stroke(); }
    }
    const lines = mode === 'forced' ? [[`${n.play} kept playing`, C.green], [`${n.quit} put the controller down`, C.red]] : mode === 'opt' ? [[`${n.tried} tried it, kept playing`, C.goldInk], [`${n.skip} skipped it, kept playing`, '#77736a']] : [['all 50 are playing the one game', C.green]];
    lines.forEach(([l, col], i) => text(g, l, R + 20 + i * 240, 470, M(800, 15), col));
    g.font = F(600, 16); g.fillStyle = C.ink; g.textAlign = 'left'; wrap(g, cs.note, R + 20, 506, RW - 40, 22);
  }
  canvasDemo('skill', (sl, cv, g) => {
    const cSeg = $(sl, '.sk-case'), mSeg = $(sl, '.sk-mode'), out = $(sl, '.sk-out');
    cSeg.innerHTML = CASES.map((c, i) => `<button class="btn" data-i="${i}">${c.seg.replace(' (fused)', '')}</button>`).join('');
    const STAGES = [
      ['big', 'forced', 'Sonic Adventure forces Big the Cat’s fishing into a speed game. The orange shape is what the segment tests; the blue is what the audience came for.'],
      ['mj', 'forced', 'Spider-Man without powers. The gap is the skills you bought the game for.'],
      ['train', 'forced', 'GTA: San Andreas turns its freeform sandbox into one strict execution test.'],
      ['mako', 'forced', 'Mass Effect swaps decisions for driving.'],
      ['gwent', 'opt', 'The Witcher 3’s Gwent has a huge gap, but it is opt-in: players who don’t want it skip it and keep playing.'],
      ['gwent', 'forced', 'Imagine Gwent were required to finish the main quest. Same game, same gap, and now it is a wall.'],
      ['kara', 'opt', 'Yakuza’s karaoke: a rhythm game in a brawler, sung only by those who walk into the bar.'],
      ['c960', 'opt', 'Chess960 keeps the decisions and drops the memorised openings, for the players who choose it.'],
      ['necro', 'fused', 'Crypt of the NecroDancer fuses rhythm and dungeon crawling into one test. “Don’t cross the streams”: fuse them, or keep the side game optional.'],
    ];
    const st = tourDemo('skill', sl, '.sk-tour', STAGES, 5, s => { st.i = CASES.findIndex(c => c.id === s[0]); st.mode = s[1]; say(out, s[2]); });
    st.i = 0; st.mode = 'forced'; st.since = 0;
    const pick = () => { st.manual(); st.since = 0; say(out, CASES[st.i].note); };
    $$(cSeg, '.btn').forEach(b => b.onclick = () => { st.i = +b.dataset.i; st.mode = CASES[st.i].mode; pick(); });
    $$(mSeg, '.btn').forEach(b => b.onclick = () => { if (CASES[st.i].mode === 'fused') return; st.mode = b.dataset.m; pick(); });
    st.frame = () => {
      st.tick(); const k = st.tour ? ease(clamp((st.u - .4) / 1.2)) : ease(clamp(st.since / 1.2));
      skillScene(g, CASES[st.i], st.mode, k);
      $$(cSeg, '.btn').forEach(b => b.classList.toggle('on', +b.dataset.i === st.i));
      $$(mSeg, '.btn').forEach(b => { b.classList.toggle('on', b.dataset.m === st.mode); b.disabled = CASES[st.i].mode === 'fused'; });
    };
    return dt => { st.since += Math.max(0, Math.min(dt, .1)); st.step(dt); };
  });

  /* ---------------- 4. Vehicle test ---------------- */
  const VT = [
    { id: 'wh', name: 'Warthog turret', game: 'Halo', img: 'img/jeep.svg', svg: true, skill: 1, forced: 1, why: 'Some levels make you ride, but the turret is still aiming and shooting. Halo stays Halo.' },
    { id: 'mr', name: 'Malygos, reversed', game: 'the post’s fix', img: '../img/achievement_boss_malygos_01.jpg', skill: 1, forced: 1, why: 'Fly the drakes first, then land and finish the fight as your class. The end of a fight is what players remember most (the peak-end rule).' },
    { id: 'aly', name: 'Alysrazor’s feathers', game: 'World of Warcraft', img: '../img/inv_feather_14.jpg', skill: 1, forced: 0, why: 'Pick up a feather and fly, with all your class buttons still there. A rule-breaker you chose.' },
    { id: 'wg', name: 'Wintergrasp siege engines', game: 'World of Warcraft', img: '../img/ability_vehicle_siegeenginecannon.jpg', skill: 0, forced: 0, why: 'A PvP zone where a few players choose to drive. Everyone else keeps their class. The post: vehicles fit here.' },
    { id: 'lev', name: 'Flame Leviathan', game: 'World of Warcraft', img: '../img/ability_vehicle_demolisherflamecatapult.jpg', skill: 0, forced: 1, why: 'The whole raid is put in vehicles. A healer became “a gunner” and a tank “a lowly ammunition loader”.' },
    { id: 'mal', name: 'Malygos, phase 3', game: 'World of Warcraft', img: '../img/ability_mount_drake_red.jpg', skill: 0, forced: 1, why: 'Everyone on red drakes for the climax: the last thing you do in the fight is not your class.' },
    { id: 'ocu', name: 'The Oculus', game: 'World of Warcraft', img: '../img/ability_mount_drake_bronze.jpg', skill: 0, forced: 1, why: 'A whole dungeon on drakes. Players dropped out so often that Blizzard added a bonus loot bag for finishing it through the Dungeon Finder.' },
    { id: 'mako', name: 'The Mako', game: 'Mass Effect', img: 'img/rover.svg', svg: true, skill: 0, forced: 1, why: 'Forced planet driving in a game about conversations and choices.' },
  ];
  const QUAD = [[0, 0, 'A side game you chose', C.goldInk], [1, 0, 'Your skill, your choice', C.green], [0, 1, 'Forced, and not your skill', C.red], [1, 1, 'Forced, but still your skill', '#2e7fd6']];
  function vtLayout() { const per = {}; return VT.map(v => { const q = v.skill + v.forced * 2; per[q] = (per[q] || 0); const n = per[q]++; return { v, x: 170 + v.skill * 430 + (n % 2) * 205, y: 102 + v.forced * 230 + Math.floor(n / 2) * 82 }; }); }
  function vtScene(g, sel, t) {
    g.clearRect(0, 0, W, H);
    g.fillStyle = C.paper; rr(g, 10, 10, W - 20, H - 20, 14); g.fill(); g.strokeStyle = C.line; g.lineWidth = 2; g.stroke();
    text(g, 'Does the vehicle still test the skill you came for?', 520, 44, M(800, 19), C.navy, 'center');
    QUAD.forEach(([sx, fy, lab, col]) => { const x = 150 + sx * 430, y = 66 + fy * 230; g.fillStyle = col + '14'; rr(g, x, y, 420, 220, 12); g.fill(); g.strokeStyle = col; g.lineWidth = 1.5; g.stroke(); text(g, lab.toUpperCase(), x + 14, y + 24, M(800, 13), col); });
    text(g, 'NO', 360, 538, M(800, 15), C.muted, 'center'); text(g, 'YES', 790, 538, M(800, 15), C.muted, 'center'); text(g, 'still your skill?', 575, 562, F(600, 15), C.muted, 'center');
    g.save(); g.translate(60, 180); g.rotate(-Math.PI / 2); text(g, 'OPT-IN', 0, 0, M(800, 15), C.muted, 'center'); g.restore();
    g.save(); g.translate(60, 410); g.rotate(-Math.PI / 2); text(g, 'FORCED', 0, 0, M(800, 15), C.muted, 'center'); g.restore();
    vtLayout().forEach(({ v, x, y }, i) => {
      const on = sel === i, lift = on ? Math.sin(t * 4) * 2 - 3 : 0;
      g.fillStyle = on ? '#fff' : 'rgba(255,255,255,.75)'; g.strokeStyle = on ? C.gold : C.line; g.lineWidth = on ? 4 : 1.5; rr(g, x - 5, y + lift, 195, 74, 10); g.fill(); g.stroke();
      if (v.svg) { g.fillStyle = C.navy; rr(g, x + 6, y + 13 + lift, 48, 48, 8); g.fill(); const im = IM(v.img); if (ready(im)) g.drawImage(im, x + 10, y + 17 + lift, 40, 40); }
      else icon(g, v.img, x + 6, y + 13 + lift, 48);
      g.font = M(700, 15); g.fillStyle = C.ink; g.textAlign = 'left'; const yy = wrap(g, v.name, x + 64, y + 30 + lift, 118, 18);
      text(g, v.game, x + 64, yy + 19, F(500, 13), C.muted);
    });
  }
  canvasDemo('vtest', (sl, cv, g) => {
    const list = $(sl, '.vt-list'), out = $(sl, '.vt-out');
    list.innerHTML = VT.map((v, i) => `<button class="btn" data-i="${i}">${v.name}</button>`).join('');
    const order = [0, 3, 2, 4, 5, 6, 7, 1];
    const st = tourDemo('vtest', sl, '.vt-tour', order, 4, i => { st.sel = i; show(); });
    const show = () => { const v = VT[st.sel]; say(out, `<b>${v.name}</b> (${v.game}). ${v.why}`); };
    st.sel = 0;
    $$(list, '.btn').forEach(b => b.onclick = () => { st.manual(); st.sel = +b.dataset.i; show(); });
    const pick = e => { const r = cv.getBoundingClientRect(), mx = (e.clientX - r.left) * W / r.width, my = (e.clientY - r.top) * H / r.height;
      vtLayout().forEach(({ x, y }, i) => { if (mx > x - 5 && mx < x + 190 && my > y && my < y + 74) { st.manual(); st.sel = i; show(); } }); };
    cv.addEventListener('click', pick);
    st.frame = () => { st.tick(); vtScene(g, st.sel, st.held ? st.t : performance.now() / 1000); $$(list, '.btn').forEach(b => b.classList.toggle('on', +b.dataset.i === st.sel)); };
    return st.step;
  });

  /* ---------------- 3. Role swap ---------------- */
  const I = n => `../img/${n}.jpg`;
  const RAID = [
    ['Warrior', 'tank', 'classicon_warrior', 'ability_defend'], ['Paladin', 'tank', 'classicon_paladin', 'spell_holy_holybolt'],
    ['Priest', 'healer', 'classicon_priest', 'spell_holy_flashheal'], ['Druid', 'healer', 'classicon_druid', 'spell_nature_healingtouch'], ['Shaman', 'healer', 'classicon_shaman', 'spell_nature_healingwavegreater'],
    ['Mage', 'damage', 'classicon_mage', 'spell_fire_fireball02'], ['Rogue', 'damage', 'classicon_rogue', 'ability_rogue_eviscerate'], ['Hunter', 'damage', 'classicon_hunter', 'inv_weapon_bow_05'],
    ['Warlock', 'damage', 'classicon_warlock', 'spell_shadow_shadowbolt'], ['Death Knight', 'damage', 'classicon_deathknight', 'spell_deathknight_classicon'],
  ];
  const VEH = { driver: ['driver', ['ability_vehicle_siegeenginecharge', 'ability_vehicle_siegeenginecannon']], gunner: ['gunner', ['ability_vehicle_siegeenginecannon', 'inv_misc_ammo_bullet_01']], loader: ['ammunition loader', ['inv_misc_ammo_bullet_01', 'ability_vehicle_launchplayer']], cat: ['catapult', ['ability_vehicle_demolisherflamecatapult', 'ability_vehicle_launchplayer']],
    red: ['red drake', ['ability_mount_drake_red', 'spell_fire_flamebolt']], bronze: ['bronze drake', ['ability_mount_drake_bronze', 'spell_fire_flameshock']], azure: ['azure drake', ['ability_mount_drake_azure', 'spell_fire_flamebolt']] };
  // per raider: null = own class bar; a vehicle seat key; 'fly' = own bar plus a feather button
  const SCENES = [
    { id: 'normal', label: 'A normal boss', seats: RAID.map(() => null), optin: false },
    { id: 'lev', label: 'Flame Leviathan', seats: ['loader', 'driver', 'gunner', 'gunner', 'driver', 'cat', 'loader', 'gunner', 'cat', 'driver'], optin: false },
    { id: 'mal', label: 'Malygos, phase 3', seats: RAID.map(() => 'red'), optin: false },
    { id: 'malr', label: 'Malygos, reversed', seats: RAID.map(() => 'red'), optin: false, rev: true },
    { id: 'ocu', label: 'The Oculus', seats: ['bronze', null, 'red', null, null, 'azure', 'azure', null, null, 'bronze'], only: [0, 2, 5, 6, 9], optin: false },
    { id: 'wg', label: 'Wintergrasp', seats: [null, null, null, null, null, 'driver', null, 'cat', null, 'gunner'], optin: true },
    { id: 'aly', label: 'Alysrazor', seats: [null, null, null, null, null, 'fly', 'fly', null, 'fly', null], optin: true },
  ];
  const CAP = {
    normal: 'Ten raiders, each with their own class buttons. A healer heals, a tank tanks.',
    lev: 'Flame Leviathan: everyone is put in a vehicle seat. The healer became “a gunner” and the tank “a lowly ammunition loader”. “I was trying to put a game that was not World of Warcraft inside of the World of Warcraft.”',
    mal: 'Malygos, phase 3: the whole raid is put on red drakes for the climax. The last thing every player does in the fight is not their class.',
    malr: 'The post’s fix: reverse the phases. Start on the drakes, then land and finish as yourself. The same content, but the ending, which players remember most, belongs to your class.',
    ocu: 'The Oculus: a five-player dungeon flown on drakes. Players dropped out so often that Blizzard added a bonus loot bag for finishing it through the Dungeon Finder.',
    wg: 'Wintergrasp: a PvP zone where vehicles are limited and players choose to take one. Those who stay on foot keep their class; those who drive chose to.',
    aly: 'Alysrazor: players who want to can pick up feathers and fly. Their class buttons stay, with one more on top.',
  };
  function roleScene(g, sc, u) {
    g.clearRect(0, 0, W, H);
    g.fillStyle = C.paper; rr(g, 10, 10, W - 20, H - 20, 14); g.fill(); g.strokeStyle = C.line; g.lineWidth = 2; g.stroke();
    let idSum = 0, n = 0;
    const show = sc.only || RAID.map((_, i) => i);
    show.forEach((ri, i) => {
      const [cls, role, ci, sp] = RAID[ri], seat = sc.seats[ri];
      const col = i % 2, row = Math.floor(i / 2), x = 30 + col * 505, y = 70 + row * 82, kk = ease(clamp((u - .3 - i * .08) / .6)), k = sc.rev ? 1 - kk : kk;
      icon(g, I(ci), x, y, 50);
      text(g, cls, x + 62, y + 20, M(700, 17), C.ink);
      const veh = seat && seat !== 'fly' && k >= .5;
      text(g, veh ? `${role} → ${VEH[seat][0]}` : role, x + 62, y + 42, F(600, 14), veh ? (sc.optin ? C.goldInk : C.red) : C.muted);
      const own = [I(sp), I(ci)], vbar = seat === 'fly' ? [...own, I('inv_feather_14')] : seat ? VEH[seat][1].map(I) : own;
      const shown = k < .5 ? own : vbar, fade = seat ? Math.abs(k - .5) * 2 : 1;
      shown.forEach((b, j) => { g.globalAlpha = fade; icon(g, b, x + 250 + j * 46, y + 6, 38); g.globalAlpha = 1; });
      const identity = !seat ? 1 : seat === 'fly' ? 1 : 0, idNow = lerp(1, identity, k);
      idSum += idNow; n++;
      bar(g, x + 400, y + 18, 80, 14, idNow, idNow > .6 ? C.green : idNow > .3 ? C.goldInk : C.red);
      if (seat === 'fly' && k > .5) text(g, '+ flight', x + 440, y + 50, F(600, 12), C.goldInk, 'center');
      else if (sc.optin && seat) text(g, 'chose it', x + 440, y + 50, F(600, 12), C.goldInk, 'center');
    });
    if (sc.rev) text(g, u < 1.2 ? 'start: on the drakes' : 'end: land and finish as yourself', 520, 552, M(700, 15), C.green, 'center');
    if (sc.only) text(g, 'a five-player group', 520, 552, F(600, 15), C.muted, 'center');
    text(g, sc.label.toUpperCase(), 30, 46, M(800, 18), C.navy);
    text(g, 'own class buttons', 1010, 46, F(600, 14), C.muted, 'right');
    const pct = idSum / n;
    text(g, `Class identity ${Math.round(pct * 100)}%`, 520, 46, M(800, 18), pct > .6 ? C.green : pct > .3 ? C.goldInk : C.red, 'center');
  }
  LP.scenes('roles', {
    scenes: SCENES.map(sc => ({ id: sc.id, label: sc.label, len: 6, draw: (g, u) => roleScene(g, sc, u) })),
    menu: '.rs-menu', tour: '.rs-tour', out: '.rs-out', say: s => CAP[s.id],
  });
  // load every image up front so the first frame of each scene (and GIF seeks) has them
  [...Object.values(COMP).map(c => c.img), ...CASES.map(c => `img/${c.icon}.svg`), ...VT.map(v => v.img), 'img/muscle.svg',
    ...RAID.flatMap(r => [I(r[2]), I(r[3])]), ...Object.values(VEH).flatMap(v => v[1].map(I)), I('inv_feather_14')].forEach(IM);
})();
