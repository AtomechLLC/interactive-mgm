/* Module 0, slides 27-29: "Is thing X good or bad?" "It depends." One mechanic dropped into three real games, each
   verdict reading fits the pillars or fights the pillars. The site avoids "good" and "bad" in visuals, so the learner's
   question is asked as "Should my game have X?". The verdicts and reasons are this page's examples, not the deck's. */
(function () {
  const { $, $$, say } = FPF.kit;
  const C = TD.C, { clamp, lerp, ease } = TD, TAU = Math.PI * 2;
  const { txt, wrap, box } = SCENE;
  const W = 1040, H = 585;
  const MECH = {
    perma: ['Permadeath', [
      ['Hades', 1, 'The run is the loop. Dying sends you home, and every death advances the story.', '#c0392b'],
      ['Pokémon (Nuzlocke rules)', 1, 'A challenge the player chose: fainted Pokémon are released because the player opted in.', '#e0a92d'],
      ['Animal Crossing', 0, 'It would erase the reason to play: a town and friendships built up over months.', '#2fae63']]],
    aim: ['Auto-aim', [
      ['Vampire Survivors', 1, 'Weapons aim themselves, so the game is about movement and the build.', '#8a4fd6'],
      ['Counter-Strike 2', 0, 'Precise aim is the skill being tested. Aiming for the player removes the test.', '#e0a92d'],
      ['Halo on a gamepad', 1, 'Aim assist makes thumbstick aiming feel as sure as the fantasy of a super-soldier.', '#2fae63']]],
    fall: ['Fall damage', [
      ['Dark Souls', 1, 'A hostile world that owes you nothing: a careless drop is one more way to die.', '#3d4270'],
      ['Super Mario World', 0, 'Jumping and falling are the fun. Mario lands from any height and keeps running.', '#e5322d'],
      ['Minecraft', 1, 'A tall drop is a survival risk you plan around, with water, ladders or a bucket.', '#5fb47c']]],
    travel: ['Fast travel', [
      ['Skyrim', 1, 'A huge world you return to again and again, after walking it the first time.', '#5d618c'],
      ['Death Stranding', 0, 'The journey on foot, with its cargo and terrain, is the game itself.', '#2ea3dc'],
      ['Hollow Knight', 1, 'It fits once earned: stag stations open only as you explore and find them.', '#262c6a']]],
  };
  const KEYS = Object.keys(MECH), PER = 7.5, DUR = PER * KEYS.length;
  function draw(g, st, t) {
    SCENE.paper(g, W, H);
    const key = st.tour ? KEYS[Math.floor(t / PER) % KEYS.length] : st.key, lt = st.tour ? t % PER : 99;
    const [name, games] = MECH[key];
    // the learner's question, then the answer
    box(g, 30, 22, 470, 64, { fill: '#fff', stroke: C.ink, lw: 2.5, r: 30 });
    txt(g, `“Should my game have ${name.toLowerCase()}?”`, 265, 62, { size: 20, align: 'center' });
    g.fillStyle = '#fff'; g.strokeStyle = C.ink; g.beginPath(); g.moveTo(90, 84); g.lineTo(72, 104); g.lineTo(120, 84); g.fill();
    const ans = st.tour ? clamp((lt - 5.4) / .5) : (st.shown.size === 3 ? 1 : 0);
    box(g, 560, 22, 450, 64, { fill: C.navy, r: 30, a: ans });
    txt(g, '“It depends.” On what? The pillars.', 785, 62, { size: 19, col: C.gold, align: 'center', a: ans });
    games.forEach(([gname, fits, why, col], i) => {
      const x = 30 + i * 336, y = 128, w = 316, h = 420;
      const drop = st.tour ? clamp((lt - .5 - i * 1.5) / .5) : 1, rev = st.tour ? clamp((lt - 1.1 - i * 1.5) / .4) : (st.shown.has(i) ? 1 : 0);
      box(g, x, y, w, h, { fill: '#fffaf0', stroke: col, lw: 3 });
      box(g, x, y, w, 64, { fill: col, r: 12 }); g.fillStyle = col; g.fillRect(x, y + 40, w, 24);
      wrap(g, gname, x + 18, y + 40, w - 36, { size: 19, font: 'd', w: 800, col: '#fff' });
      // the mechanic token drops in
      const ty = lerp(y - 40, y + 120, ease(drop));
      g.save(); g.globalAlpha = drop; box(g, x + w / 2 - 90, ty - 22, 180, 44, { fill: C.gold, stroke: C.navy, lw: 2.5, r: 22 }); txt(g, name, x + w / 2, ty + 6, { size: 16, align: 'center', col: C.navy }); g.restore();
      if (rev <= 0) { txt(g, st.tour ? '' : 'Click to reveal: fits or fights?', x + w / 2, y + 260, { size: 15, font: 'b', w: 600, col: C.muted, align: 'center' }); return; }
      g.save(); g.globalAlpha = rev;
      const sc = lerp(1.4, 1, ease(rev));
      g.translate(x + w / 2, y + 205); g.scale(sc, sc); g.rotate(-.05);
      const vc = fits ? '#1a8a4c' : '#c0392b';
      g.strokeStyle = vc; g.lineWidth = 4; g.beginPath(); g.roundRect(-130, -26, 260, 52, 8); g.stroke();
      txt(g, fits ? 'FITS THE PILLARS' : 'FIGHTS THE PILLARS', 0, 8, { size: 20, col: vc, align: 'center' });
      g.restore();
      g.save(); g.globalAlpha = rev; wrap(g, why, x + 20, y + 270, w - 40, { size: 16.5, lh: 23 }); g.restore();
    });
  }
  SCENE('depends', {
    dur: DUR,
    init(st) {
      st.key = 'perma'; st.shown = new Set();
      const bs = $$(st.s, '.id-mech .btn');
      st.setKey = k => { st.key = k; bs.forEach(b => b.classList.toggle('on', b.dataset.k === k)); };
      bs.forEach(b => b.onclick = () => { st.manual(); st.setKey(b.dataset.k); st.shown = new Set(); });
      st.cv.addEventListener('click', e => { const p = SCENE.at(st.cv, e); if (p.y < 128) return; const i = Math.floor((p.x - 30) / 336); if (i < 0 || i > 2) return; if (st.tour) { st.manual(); st.shown = new Set(); } st.shown.add(i); });
      $(st.s, '.id-all').onclick = () => { st.manual(); st.shown = new Set([0, 1, 2]); };
    },
    onManual(st) { st.shown = new Set(); },
    side(st, t) {
      const key = st.tour ? KEYS[Math.floor(t / PER) % KEYS.length] : st.key;
      if (st.tour) $$(st.s, '.id-mech .btn').forEach(b => b.classList.toggle('on', b.dataset.k === key));
      const k = key + st.tour; if (k === st.k2) return; st.k2 = k;
      say($(st.s, '.id-out'), `The same <b>${MECH[key][0].toLowerCase()}</b> fits two of these games and fights the third. Nothing about the mechanic changed: what changed is what each game is for. Module 1’s pillars are the tool that answers “depends on what?”.`);
    },
    draw,
  });
})();
