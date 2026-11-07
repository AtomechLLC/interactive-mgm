/* Five Gates ("Learning From My Past", conclusion: "What was the point?").
   The series' five tools, used in order: clarity, care, response, satisfaction, fit. A mechanic walks the road and
   stops at the first gate it fails; the gates after it are not reached, because the series says not to move on until
   the step before holds. Presets come from the series and the existing post-mortem pages. In "Guess first" mode the
   learner calls each gate before the reveal; "Your mechanic" lets them run their own. Labels avoid good / bad: the
   verdicts are "passes" and "stops here". The walk-through is a pure function of time, so __seek is deterministic. */
(function () {
  const { $, $$, canvasDemo, say, store } = FPF.kit;
  const W = 1040, H = 585, TAU = Math.PI * 2;
  const C = { ink: '#262c6a', navy: '#152044', muted: '#5d618c', gold: '#ffb951', goldInk: '#9a5a06', pass: '#2f9e5a', stop: '#d8402f', line: '#cdbf9f', paper: 'rgba(255,252,244,.94)' };
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k, ease = k => k * k * (3 - 2 * k);
  const imgs = {}; const IM = src => { if (!imgs[src]) { const i = new Image(); i.src = src; imgs[src] = i; } return imgs[src]; };
  const ready = i => i.complete && i.naturalWidth;

  const GATES = [
    ['Clarity', 'clarity', 'Can the player tell what it is and what it will do?'],
    ['Care', 'care', 'Does the player have a reason to act on it?'],
    ['Response', 'response', 'Is there something the player can do about it?'],
    ['Satisfaction', 'satisfaction', 'Does doing it feel rewarding?'],
    ['Fit', 'fit', 'Does it belong in this game, its theme and its audience?'],
  ];
  GATES.forEach(g => IM(`../../assets/img/home/learning-past--${g[1]}.svg`));

  // [pass, why]; the list ends at the first gate that stops the mechanic
  const P = [
    { id: 'fireball', name: 'Fireball', src: 'World of Warcraft, the Mage · “The Simplest Thing First”', icon: '../img/spell_fire_fireball02.jpg', gates: [
      [1, 'The mage stops moving, the hands light up, a cast bar fills and the sound changes. Everyone can read what is coming.'],
      [1, 'It is the mage’s main damage, and every monster it hits turns and comes for the mage.'],
      [1, 'The mage answers the charge with range: from far enough away, a second Fireball lands before the monster arrives.'],
      [1, 'A burst of flame, an impact sound, a scorch mark left behind. The hit announces itself.'],
      [1, 'Throwing fire is the oldest wizard fantasy there is.'],
    ], end: '“Basic things are ornate, we just rarely take the time to see them.”' },
    { id: 'strike', name: 'Strike', src: 'A generic melee hit · “The Simplest Thing First”', icon: '../img/ability_rogue_ambush.jpg', gates: [
      [0, 'No wind-up, no glow, no sound change: the hit simply happens. The series’ verdict on Strike: no telegraphing, no gameplay. And the name says nothing about who swings it.'],
    ], end: 'Give it a tell and a name that fits the creature (“Clawing Strike” for a bird).' },
    { id: 'mushroom', name: 'Super Mushroom, 1985', src: 'Super Mario Bros. · “Lesson 2. Care”', icon: '../../student-tokens/256px/mario/mushroom.png', pixel: true, pair: '../../understand-mechanics/img/smb-goomba.png', gates: [
      [0, 'Brown, round and sliding toward Mario, it reads as a Goomba, and many first-time players dodged it. Players learned to chase it anyway once it saved a life: care carried a clarity gap.'],
    ], end: 'Later Mario games did it: a red and white cap and a face. Try “Super Mushroom, later”.' },
    { id: 'mushroom2', name: 'Super Mushroom, later', src: 'Later Mario games · “Lesson 2. Care”', draw: 'mush2', gates: [
      [1, 'A red and white cap with a face. Nothing else on screen looks like it, so it reads as a pickup, not a foe.'],
      [1, 'It is a spare life: one more hit before Mario is lost.'],
      [1, 'It slides away and bounces off walls, so the player has to chase it to collect it.'],
      [1, 'The power-up sound plays, Mario grows, and big Mario can break bricks.'],
      [1, 'Mushrooms are the Mushroom Kingdom’s own currency of power.'],
    ], end: 'Once the iteration fixed clarity, nothing else stood in the way.' },
    { id: 'healfire', name: 'Healing dragon fire', src: 'A boss whose fire heals the players · “Emotional Resonance”', icon: '../img/inv_misc_head_dragon_01.jpg', gates: [
      [0, 'The fire heals, but fire and red say danger. Players stepped around it unless the fight forced them in. The cue tells the player the opposite of the rule.'],
    ], end: 'The colour and shape have to say “step in”, or the rule has to match the fire.' },
    { id: 'attumen', name: 'Shadow Cleave, version 1', src: 'Attumen the Huntsman, Karazhan · post-mortem', icon: '../img/ability_warrior_cleave.jpg', gates: [
      [1, 'The boss swings and the hit lands on the tank, then jumps to two more players.'],
      [1, 'It hits three people every time, so the raid feels it.'],
      [0, 'It jumps to the two nearest fighters wherever they stand. Nothing the players do changes who is hit.'],
    ], end: 'Version 2 made it a cone, so fighters behind the boss are safe (see Same Names, Different Fight).' },
    { id: 'nether', name: 'Netherspite’s beams', src: 'Netherspite, Karazhan, version 3 · post-mortem', icon: '../img/spell_shadow_netherprotection.jpg', gates: [
      [1, 'Three coloured beams run from portals to the boss, and each colour has one job.'],
      [1, 'A beam nobody blocks powers the boss up, so someone has to stand in it.'],
      [0, 'Reactions exist, but almost nothing can be recovered: a late swap or a step into a void zone costs the raid. Too many steps must be exact. Players learned it, then skipped it.'],
    ], end: 'Make room to recuperate from mistakes (see Netherspite Beams).' },
    { id: 'rested', name: 'Rested XP, first version', src: 'World of Warcraft · “Negative Reinforcement”', icon: '../img/spell_nature_sleep.jpg', gates: [
      [1, 'The experience bar shows which state you are in.'],
      [1, 'Experience is how a character grows, so a rate change matters.'],
      [1, 'Log off and rest to get the full rate back.'],
      [0, 'It was a penalty: play too long and you earned 50% experience. The same numbers relabelled as double experience when rested became a reward.'],
    ], end: 'Blizzard’s phrase for the fix: “Make it a Bonus.”' },
    { id: 'victory', name: 'Destroying the enemy base', src: 'League of Legends, beta · “Lesson 4: Satisfaction”', draw: 'victory', gates: [
      [1, 'The goal is in plain sight from the first minute: take down the enemy base.'],
      [1, 'It ends the match, after half an hour of team play.'],
      [1, 'The team pushes, defends and chooses when to strike.'],
      [0, 'Several enemies had quit, and the win landed on a black screen with VICTORY. Tom Cadwell named the missing piece: “the expectation of ceremony.”'],
    ], end: 'A win needs its ceremony: sound, a moment to watch the base fall, a screen that celebrates.' },
    { id: 'leviathan', name: 'Flame Leviathan', src: 'Ulduar, World of Warcraft · “Fit Your Game”', icon: '../img/ability_vehicle_siegeenginecharge.jpg', gates: [
      [1, 'Each vehicle seat has its own short action bar.'],
      [1, 'It is a raid boss: the loot and the raid’s progress are on the line.'],
      [1, 'Drivers, gunners and passengers all have buttons that answer the boss’s attacks.'],
      [1, 'Siege engines, explosions and a giant machine brought down.'],
      [0, 'A healer became “a gunner” and a tank “a lowly ammunition loader”. Players lost the class they had built. “A game that was not World of Warcraft inside of the World of Warcraft.”'],
    ], end: 'Vehicles worked where players opted in, as in Wintergrasp.' },
    { id: 'own', name: 'Your mechanic', src: 'Answer each gate yourself', draw: 'own', gates: null },
  ];
  P.forEach(p => { if (p.icon) IM(p.icon); if (p.pair) IM(p.pair); });

  /* ---------- layout ---------- */
  const GX = i => 150 + i * 190, ROAD = 292, START = 36, FIN = 1004;
  const stand = g => g < 0 ? START : g > 4 ? FIN : GX(g) - 84;

  function wrap(g, text, x, y, w, lh) {
    const words = String(text).split(' '); let line = '';
    words.forEach(wd => { if (line && g.measureText(line + wd).width > w) { g.fillText(line.trim(), x, y); y += lh; line = ''; } line += wd + ' '; });
    if (line.trim()) g.fillText(line.trim(), x, y);
    return y;
  }
  function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }

  // a red and white mushroom with a face, drawn as pixels (the later Mario look)
  const MUSH = ['....rrrrrr....', '..rrwwrrwwrr..', '.rrwwwwrrwwwr.', 'rrrwwwwrrrwwrr', 'rwwrrrrrrrrrrr', 'wwwrrwwwwrrrww', 'wwrrwwwwwwrrww', 'rrrrwwwwwwrrrr', '.rrrrrrrrrrrr.', '...ffkffkff...', '...ffkffkff...', '...ffffffff...', '....ffffff....'];
  function mush2(g, cx, cy, s) {
    const n = 14, px = s / n, col = { r: '#d8261e', w: '#ffffff', f: '#f6d6a4', k: '#1b1b1b' };
    MUSH.forEach((row, j) => [...row].forEach((ch, i) => { if (col[ch]) { g.fillStyle = col[ch]; g.fillRect(cx - s / 2 + i * px, cy - s / 2 + j * px + px, px + .5, px + .5); } }));
  }
  function mechIcon(g, p, cx, cy, s) {
    g.save();
    if (p.draw === 'mush2') { g.fillStyle = '#7fc4ef'; rr(g, cx - s / 2, cy - s / 2, s, s, 8); g.fill(); mush2(g, cx, cy, s * .82); }
    else if (p.draw === 'victory') { g.fillStyle = '#0c0c12'; rr(g, cx - s / 2, cy - s / 2, s, s, 8); g.fill(); g.fillStyle = '#e8c66a'; g.font = `800 ${Math.round(s * .2)}px Montserrat, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('VICTORY', cx, cy + 1); }
    else if (p.draw === 'own') { g.fillStyle = C.navy; rr(g, cx - s / 2, cy - s / 2, s, s, 8); g.fill(); g.fillStyle = C.gold; g.font = `800 ${Math.round(s * .6)}px Montserrat, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', cx, cy + 2); }
    else {
      const i = IM(p.icon);
      if (p.pixel) { g.fillStyle = '#7fc4ef'; rr(g, cx - s / 2, cy - s / 2, s, s, 8); g.fill(); }
      rr(g, cx - s / 2, cy - s / 2, s, s, 8); g.clip();
      if (ready(i)) { g.imageSmoothingEnabled = !p.pixel; const k = p.pixel ? .82 : 1; g.drawImage(i, cx - s * k / 2, cy - s * k / 2, s * k, s * k); }
    }
    g.restore();
    g.strokeStyle = C.navy; g.lineWidth = 2; rr(g, cx - s / 2, cy - s / 2, s, s, 8); g.stroke();
  }

  /* ---------- one frame: preset p, gate g reached, phase ('walk' | 'ask' | 'show' | 'end'), u in [0,1] of the walk ---------- */
  function draw(g, s) {
    const p = s.p, verdicts = s.verdicts, n = verdicts.length;   // verdicts known so far, [pass, why]
    g.clearRect(0, 0, W, H);
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    // header
    g.fillStyle = C.paper; rr(g, 10, 10, W - 20, 104, 14); g.fill(); g.strokeStyle = C.line; g.lineWidth = 2; g.stroke();
    mechIcon(g, p, 66, 62, 76);
    let hx = 120;
    if (p.pair) { const i = IM(p.pair); g.font = '600 13px Jost, sans-serif'; g.fillStyle = C.muted; g.fillText('looks like', 116, 66); if (ready(i)) { g.imageSmoothingEnabled = false; g.drawImage(i, 180, 34, 56, 56); g.imageSmoothingEnabled = true; } hx = 252; }
    g.font = '800 28px Montserrat, Jost, sans-serif'; g.fillStyle = C.ink; g.fillText(s.name, hx, 58);
    g.font = '500 16px Jost, sans-serif'; g.fillStyle = C.muted; g.fillText(p.src, hx, 86);

    // the road
    g.strokeStyle = '#d9cba8'; g.lineWidth = 16; g.lineCap = 'round'; g.beginPath(); g.moveTo(START, ROAD); g.lineTo(FIN, ROAD); g.stroke();
    g.setLineDash([10, 12]); g.strokeStyle = '#fffaf0'; g.lineWidth = 2; g.beginPath(); g.moveTo(START, ROAD); g.lineTo(FIN, ROAD); g.stroke(); g.setLineDash([]); g.lineCap = 'butt';
    const stopAt = verdicts.findIndex(v => !v[0]);
    GATES.forEach(([label, key], i) => {
      const x = GX(i), done = i < n, passed = done && verdicts[i][0], stopped = done && !verdicts[i][0];
      const unreached = stopAt >= 0 && i > stopAt, current = i === s.g && !done && s.phase !== 'end';
      g.globalAlpha = unreached ? .3 : 1;
      // pillars and lintel
      g.fillStyle = stopped ? '#f3d2cd' : passed ? '#d6eedd' : '#efe6d2';
      g.strokeStyle = stopped ? C.stop : passed ? C.pass : current ? C.goldInk : '#b9a882'; g.lineWidth = current ? 3 : 2;
      [[x - 46, 196], [x + 30, 196]].forEach(([px, py]) => { rr(g, px, py, 16, ROAD + 22 - py, 4); g.fill(); g.stroke(); });
      rr(g, x - 56, 182, 112, 22, 6); g.fill(); g.stroke();
      // gate icon above
      g.fillStyle = C.navy; g.beginPath(); g.arc(x, 150, 30, 0, TAU); g.fill();
      if (current || done) { g.strokeStyle = stopped ? C.stop : passed ? C.pass : C.gold; g.lineWidth = 4; g.beginPath(); g.arc(x, 150, 33, 0, TAU); g.stroke(); }
      const ic = IM(`../../assets/img/home/learning-past--${key}.svg`); if (ready(ic)) g.drawImage(ic, x - 19, 131, 38, 38);
      // label
      g.textAlign = 'center'; g.font = '800 15px Montserrat, Jost, sans-serif'; g.fillStyle = C.ink; g.fillText(`${i + 1} · ${label}`, x, 340);
      g.font = '600 13px Jost, sans-serif';
      if (passed) { g.fillStyle = C.pass; g.fillText('✓ passes', x, 360); }
      if (stopped) { g.fillStyle = C.stop; g.fillText('✕ stops here', x, 360); }
      if (unreached) { g.fillStyle = C.muted; g.fillText('not reached', x, 360); }
      // the bar across a closed gate
      if (stopped) { const k = s.phase === 'walk' ? 0 : 1; g.fillStyle = C.stop; rr(g, x - 32, ROAD - 40 + (1 - k) * 0, 64, 10, 3); g.fill(); rr(g, x - 32, ROAD - 14, 64, 10, 3); g.fill(); }
      g.globalAlpha = 1; g.textAlign = 'left';
    });

    // the walker
    const from = s.phase === 'end' && stopAt < 0 ? stand(4) : stand(s.g - 1), to = s.phase === 'end' && stopAt < 0 ? FIN - 20 : stand(s.g);
    const k = s.phase === 'walk' || (s.phase === 'end' && stopAt < 0) ? ease(clamp(s.u)) : 1;
    const wx = s.phase === 'end' && stopAt >= 0 ? stand(stopAt) : s.g === 0 && s.phase === 'walk' ? lerp(START + 20, stand(0), k) : lerp(from, to, k);
    const bob = (s.phase === 'walk' || s.phase === 'end') && k < 1 ? Math.abs(Math.sin(s.u * 14)) * 5 : 0;
    g.fillStyle = 'rgba(21,32,68,.18)'; g.beginPath(); g.ellipse(wx, ROAD + 8, 26, 7, 0, 0, TAU); g.fill();
    mechIcon(g, p, wx, ROAD - 26 - bob, 46);

    // the card
    g.fillStyle = C.paper; rr(g, 10, 380, W - 20, 195, 14); g.fill(); g.strokeStyle = C.line; g.lineWidth = 2; g.stroke();
    const gi = Math.min(s.g, 4), [gl, , gq] = GATES[gi];
    if (s.phase === 'end') {
      const fail = stopAt >= 0;
      g.font = '600 14px Jost, sans-serif'; g.fillStyle = C.muted; g.fillText(fail ? `STOPPED AT GATE ${stopAt + 1} OF 5` : 'THROUGH ALL FIVE GATES', 34, 412);
      g.font = '800 30px Montserrat, Jost, sans-serif'; g.fillStyle = fail ? C.stop : C.pass; g.fillText(fail ? `Fix ${GATES[stopAt][0].toLowerCase()} first` : 'Passes all five', 34, 452);
      g.font = '500 19px Jost, sans-serif'; g.fillStyle = C.ink; wrap(g, s.end, 34, 488, W - 80, 27);
      return;
    }
    g.font = '600 14px Jost, sans-serif'; g.fillStyle = C.muted; g.fillText(`GATE ${gi + 1} · ${gl.toUpperCase()}`, 34, 412);
    g.font = '700 23px Montserrat, Jost, sans-serif'; g.fillStyle = C.ink; g.fillText(gq, 34, 446);
    if (s.phase === 'walk') { g.font = '500 18px Jost, sans-serif'; g.fillStyle = C.muted; g.fillText('Walking to the gate…', 34, 484); }
    if (s.phase === 'ask') { g.font = '500 19px Jost, sans-serif'; g.fillStyle = C.goldInk; g.fillText(s.own ? 'Your call: does your mechanic pass this gate?' : 'Your call first: does it pass, or stop here?', 34, 484); }
    if (s.phase === 'show') {
      const v = verdicts[gi];
      g.font = '800 26px Montserrat, Jost, sans-serif'; g.fillStyle = v[0] ? C.pass : C.stop; g.fillText(v[0] ? '✓ Passes' : '✕ Stops here', 34, 486);
      if (s.guess != null) { const gx = 34 + g.measureText(v[0] ? '✓ Passes' : '✕ Stops here').width + 18, hit = s.guess === !!v[0]; g.font = '600 16px Jost, sans-serif'; g.fillStyle = hit ? C.pass : C.goldInk; g.fillText(hit ? 'You called it the same way.' : 'You called it the other way.', gx, 484); }
      g.font = '500 18px Jost, sans-serif'; g.fillStyle = C.ink; wrap(g, v[1], 34, 518, W - 80, 25);
    }
  }

  /* ---------- the walk-through: every preset but "your mechanic", one after another ---------- */
  const WALK = 1.0, SHOW = 3.4, END = 3.2, TOUR = P.filter(p => p.gates);
  const span = p => p.gates.length * (WALK + SHOW) + END;
  const DUR = TOUR.reduce((a, p) => a + span(p), 0);
  function tourAt(t) {
    t = ((t % DUR) + DUR) % DUR;
    for (const p of TOUR) {
      if (t >= span(p)) { t -= span(p); continue; }
      const per = WALK + SHOW, gi = Math.floor(t / per);
      if (gi >= p.gates.length) return { p, g: p.gates.length, phase: 'end', u: (t - p.gates.length * per) / 1.2, verdicts: p.gates };
      const w = t - gi * per;
      return w < WALK ? { p, g: gi, phase: 'walk', u: w / WALK, verdicts: p.gates.slice(0, gi) } : { p, g: gi, phase: 'show', u: 1, verdicts: p.gates.slice(0, gi + 1) };
    }
  }

  const scenes = {};
  canvasDemo('gates', (sl, cv, g) => {
    const st = { tour: true, held: false, t: 0, pi: 0, g: 0, phase: 'walk', u: 0, guess: null, mode: 'guess', own: store.get('fg-own', { name: '', answers: [] }), hits: 0, calls: 0, key: '' };
    const menu = $(sl, '.fg-menu'), tourBtn = $(sl, '.fg-tour'), nextBtn = $(sl, '.fg-next'), guessRow = $(sl, '.fg-guess'), ownBox = $(sl, '.fg-own'), ownIn = $(sl, '.fg-own input');
    menu.innerHTML = P.map((p, i) => `<button class="btn" data-i="${i}">${p.name}</button>`).join('');
    const mBtns = $$(menu, '.btn'), modeBtns = $$(sl, '.fg-mode .btn');
    ownIn.value = st.own.name || '';
    ownIn.oninput = () => { st.own.name = ownIn.value; store.set('fg-own', st.own); };
    const isOwn = () => P[st.pi].id === 'own';
    // verdicts so far for the manual run
    const known = () => isOwn() ? st.own.answers.slice(0, st.g + (st.phase === 'show' || st.phase === 'end' ? 1 : 0)).map(a => [a, a ? 'You say it passes.' : 'You say it stops here. Fix this before you work on the gates after it.'])
      : P[st.pi].gates.slice(0, st.g + (st.phase === 'show' || st.phase === 'end' ? 1 : 0));
    const manual = () => { st.tour = false; tourBtn.classList.remove('on'); };
    const pick = i => { manual(); st.pi = i; st.g = 0; st.phase = 'walk'; st.u = 0; st.guess = null; if (isOwn()) st.own.answers = []; };
    mBtns.forEach((b, i) => b.onclick = () => pick(i));
    modeBtns.forEach(b => b.onclick = () => { st.mode = b.dataset.m; modeBtns.forEach(x => x.classList.toggle('on', x === b)); });
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    nextBtn.onclick = () => {
      if (st.tour) { st.pi = P.indexOf(tourAt(st.t).p); manual(); st.g = 0; st.phase = 'walk'; st.u = 0; return; }
      if (st.phase !== 'show') return;
      const v = known(), last = v[v.length - 1];
      st.guess = null;
      if (!last[0] || st.g >= 4) { st.phase = 'end'; st.u = 0; } else { st.g++; st.phase = 'walk'; st.u = 0; }
    };
    $$(guessRow, '.btn').forEach(b => b.onclick = () => {
      if (st.phase !== 'ask') return;
      const call = b.dataset.g === '1';
      if (isOwn()) { st.own.answers[st.g] = call; store.set('fg-own', st.own); }
      else { st.guess = call; st.calls++; if (call === !!P[st.pi].gates[st.g][0]) st.hits++; }
      st.phase = 'show';
    });

    function scene() {
      if (st.tour) { const a = tourAt(st.t); return { ...a, name: a.p.name, end: a.p.end, guess: null }; }
      const p = P[st.pi], own = isOwn();
      return { p, g: st.g, phase: st.phase, u: st.u, verdicts: known(), guess: own ? null : st.guess, own,
        name: own ? (st.own.name.trim() || 'Your mechanic') : p.name,
        end: own ? ((st.own.answers.findIndex(a => !a) >= 0) ? '“Don’t move on to the next step until the previous has been satisfied.” Work on this gate before the ones after it.' : 'By your own calls it passes all five. Now try each gate on a player who has never seen it.') : p.end };
    }
    function frame() {
      const s = scene(); draw(g, s);
      mBtns.forEach((b, i) => b.classList.toggle('on', P[i] === s.p));
      ownBox.style.display = s.p.id === 'own' ? 'block' : 'none';
      guessRow.classList.toggle('show', !st.tour && st.phase === 'ask');
      nextBtn.disabled = !st.tour && st.phase !== 'show';
      nextBtn.textContent = !st.tour && st.phase === 'show' && (s.verdicts.length && !s.verdicts[s.verdicts.length - 1][0] || st.g >= 4) ? 'See the result →' : 'Next gate →';
      const key = [st.tour, st.calls, st.hits, s.p.id, s.phase].join();
      if (key === st.key) return; st.key = key;
      $(sl, '.fg-stats').innerHTML = `<div class="g"><b>${st.hits} / ${st.calls}</b><span>of your calls match the series</span></div>`;
      say($(sl, '.fg-out'), st.tour ? 'Ten mechanics from the series walk the five gates. Pick one to call each gate yourself, or pick <b>Your mechanic</b> to run your own.'
        : s.p.id === 'own' ? 'Name a mechanic you are designing, then answer each gate honestly. The walk stops at the first gate it fails.'
        : st.mode === 'guess' ? 'Call each gate before the reveal: <b>Passes</b> or <b>Stops here</b>.' : 'Press <b>Next gate</b> to walk on.');
    }
    scenes.gates = { seek(t) { st.held = true; st.tour = true; st.t = t; frame(); }, dur: () => DUR };
    return dt => {
      if (st.held) return; dt = Math.max(0, Math.min(dt, .1));
      if (st.tour) { st.t += dt; if (st.t >= DUR) st.t = 0; }
      else if (st.phase === 'walk') { st.u += dt / WALK; if (st.u >= 1) { st.u = 1; st.phase = (st.mode === 'guess' || isOwn()) ? 'ask' : 'show'; } }
      else if (st.phase === 'end') st.u += dt / 1.2;
      frame();
    };
  });
  window.__seek = (t, which = 'gates') => scenes[which].seek(t);
  window.__dur = (which = 'gates') => scenes[which].dur();
})();
