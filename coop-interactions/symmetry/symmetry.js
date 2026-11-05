/* Symmetry spectrum (MGM C3 M6, deck Part 2, slides 19-45, mainly 27 and 37-41). Twelve real co-op games placed
   from identical kits to different experiences. For each one the two players' verbs are split into "only P1",
   "both" and "only P2", and two circles overlap by the share of verbs they have in common.
   draw(g, i, from, k) draws game i, easing in from game `from` by k, so the page, the tour and window.__seek
   (the GIF) all draw the same thing. Covers are the games' box art from Wikipedia (Overcooked! 2 from Steam),
   reused for teaching. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;
  const W = 1040, H = 640, X0 = 56, X1 = 984, BAR = 174;
  const sprite = f => { const i = new Image(); i.src = new URL(`img/${f}`, document.currentScript.src).href; return i; };

  // zones along the spectrum: [label, from, to] in 0-100
  const ZONES = [['Identical', 0, 19], ['Tuned', 19, 30], ['Same job, different kit', 30, 53], ['Different jobs', 53, 76], ['Different experiences', 76, 100]];
  // [name, year, cover, position 0-100, P1, P2, shared verbs, only P1, only P2, same job?, what differs, payoff, cost]
  const GAMES = [
    ['Bubble Bobble', 1986, 'bubble-bobble.png', 3, 'Bub', 'Bob', ['Move and jump', 'Blow bubbles', 'Pop trapped enemies', "Ride a partner's bubble"], [], [], 'Yes',
      'Only the colour. Co-op adds tricks the same moves could not do alone, like riding your partner\'s bubble up to a ledge.', 'Drop in with no rules to learn.', 'Nothing tells either player what to do.'],
    ['Left 4 Dead', 2008, 'left-4-dead.jpg', 7, 'Bill', 'Zoey', ['Any gun', 'Heal with a medkit', 'Revive a downed ally', 'Free a pinned ally'], [], [], 'Yes',
      'Faces and voices. Every survivor carries the same kit, and the Special Infected pin one survivor so another has to free them.', 'Anyone can cover anyone.', 'Roles fall to whoever grabs the medkit.'],
    ['Portal 2 (co-op)', 2011, 'portal-2.jpg', 11, 'Atlas', 'P-Body', ['Two-portal gun', 'Walk and jump', 'Ping a spot for your partner'], [], [], 'Yes',
      'Nothing in the kit. The test chambers need four portals, so the level, not the kit, makes the two robots need each other.', 'Symmetric kits can still demand teamwork.', 'One player can solve the room and steer the other.'],
    ['Overcooked! 2', 2018, 'overcooked-2.jpg', 15, 'Chef 1', 'Chef 2', ['Chop', 'Cook', 'Plate and serve', 'Wash dishes', 'Throw ingredients'], [], [], 'Yes',
      'The kitchen. Every chef can do every job; the layout splits the stations and the players pick their roles.', 'Roles emerge on the fly.', 'Unclear responsibilities: arguments over who washes up.'],
    ['Super Mario 3D World', 2013, 'mario-3d-world.jpg', 24, 'Mario', 'Luigi', ['Run', 'Stomp', 'Power-ups', 'Pick up and throw'], ['All-round speed and jump'], ['Jumps a block higher', 'Slides on landing'], 'Yes',
      'Tuning on one moveset. Luigi jumps higher, Peach floats, Toad runs faster: a player picks a feel, not a job.', 'A favourite character without a new rulebook.', 'The differences rarely change who solves what.'],
    ['Diablo III', 2012, 'diablo-3.png', 36, 'Barbarian', 'Wizard', ['Kill the horde', 'Pick up loot', 'Drink potions', 'Revive allies'], ['Melee cleave', 'Leap in'], ['Ranged spells', 'Teleport out'], 'Yes',
      'Classes differ on paper, but everyone does the same job: kill everything. That makes the game co-optional; each player could clear it alone.', 'Play solo or together with no penalty.', 'No one needs anyone, so teamplay is optional.'],
    ['Deep Rock Galactic', 2020, 'deep-rock.jpg', 46, 'Driller', 'Engineer', ['Shoot bugs', 'Mine minerals', 'Revive allies'], ['Drill through rock', 'Flamethrower'], ['Platform gun', 'Sentry turret'], 'Mostly',
      'Each class owns one traversal tool the team leans on: the Driller tunnels, the Engineer builds platforms, the Scout lights the cave, the Gunner ziplines.', 'Every dwarf has a moment to shine.', 'A missing class makes some caves slow.'],
    ['World of Warcraft (dungeon)', 2004, 'wow.png', 60, 'Tank', 'Healer', ['Dodge the fire', 'Interrupt casts'], ['Hold the boss\'s attention', 'Soak the hits'], ['Restore health', 'Dispel curses'], 'No',
      'The holy trinity: tank, healer and damage each cover a weakness the others cannot. The pull fails if a role is missing.', 'Every player is needed and knows it.', 'Groups wait for a tank or a healer.'],
    ['It Takes Two', 2021, 'it-takes-two.png', 70, 'Cody', 'May', ['Run, jump, dash', 'Swing and grind'], ['Shoot sticky sap'], ['Fire matches that ignite sap'], 'No',
      'Each chapter hands out a pair of tools that only work together. In the tree, Cody coats the wasps in sap and May sets it alight.', 'Every puzzle needs both halves.', 'Twice the tools to build, chapter after chapter.'],
    ["Bowser's Fury", 2021, 'bowsers-fury.jpg', 80, 'Mario', 'Bowser Jr.', ['Attack enemies'], ['Run and jump', 'Power-ups', 'Steer the camera', 'Collect Cat Shines'], ['Fly anywhere', 'Paint to reveal secrets', 'Cannot be defeated'], 'No',
      'Bowser Jr. is a helper with no camera of his own: a lighter role that a younger or newer player can take beside an expert.', 'Mixed skill levels play together.', 'Skill gap risks: the helper can feel like a passenger.'],
    ['Super Mario Galaxy (Co-Star)', 2007, 'mario-galaxy.jpg', 88, 'Mario', 'Co-Star', ['Gather Star Bits'], ['Run, jump, spin', 'Collect Power Stars'], ['Point to grab Star Bits', 'Freeze enemies in place', 'Make Mario jump'], 'No',
      'The second player holds only a pointer. Same screen, same world, but a different game: aiming, not platforming.', 'A one-button seat for a non-gamer.', 'One player has far more agency.'],
    ['Keep Talking and Nobody Explodes', 2015, 'keep-talking.jpg', 96, 'Defuser', 'Expert', ['Talk to each other'], ['Sees the bomb', 'Cuts wires, presses buttons'], ['Reads the manual', 'Never sees the bomb'], 'No',
      'Information asymmetry: each player holds half of what the puzzle needs, and the only shared verb is talking.', 'Communication is the whole game.', 'Both roles must be filled, and each needs its own content.'],
  ].map(([name, year, f, pos, p1, p2, both, a, b, job, differs, payoff, cost]) => ({ name, year, img: sprite(f), pos, p1, p2, both, a, b, job, differs, payoff, cost }));
  const N = GAMES.length;
  const share = G => G.both.length / (G.both.length + G.a.length + G.b.length);
  const px = pos => lerp(X0, X1, pos / 100);

  function cover(g, img, x, y, w, h) {
    if (!img.complete || !img.naturalWidth) { g.fillStyle = '#d8ccb3'; g.fillRect(x, y, w, h); return; }
    const s = Math.max(w / img.naturalWidth, h / img.naturalHeight), sw = w / s, sh = h / s;
    g.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, x, y, w, h);
  }
  function chip(g, text, x, y, fill, ink, a = 1) {
    g.save(); g.globalAlpha = a; g.font = '600 16px Jost, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const w = g.measureText(text).width + 22;
    g.fillStyle = fill; g.strokeStyle = ink; g.lineWidth = 1.5; g.beginPath(); g.roundRect(x - w / 2, y - 15, w, 30, 15); g.fill(); g.stroke();
    g.fillStyle = ink; g.fillText(text, x, y + 1); g.restore();
  }

  // the spectrum strip: zones, bar, covers in two rows, marker at position m (0-100), game `sel` highlighted
  function strip(g, sel, m, o = {}) {
    const by = o.by ?? BAR, tw = o.tw ?? 52, th = o.th ?? 70, rowA = by - 168, rowB = by - 90;
    const grd = g.createLinearGradient(X0, 0, X1, 0);
    grd.addColorStop(0, '#2ea3dc'); grd.addColorStop(.5, '#8a4fd6'); grd.addColorStop(1, '#e5322d');
    g.fillStyle = grd; g.beginPath(); g.roundRect(X0 - 8, by - 7, X1 - X0 + 16, 14, 7); g.fill();
    ZONES.forEach(([z, a, b], i) => {
      const xa = px(a), xb = px(b);
      if (i) { g.strokeStyle = 'rgba(38,44,106,.35)'; g.lineWidth = 1.5; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(xa, by - 12); g.lineTo(xa, by + 36); g.stroke(); g.setLineDash([]); }
      const on = m >= a && m < b || (b === 100 && m >= 100);
      g.font = `${on ? 700 : 600} 14px Jost, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = on ? C.ink : C.muted; g.fillText(z, (xa + xb) / 2, by + 26);
    });
    g.font = '700 13px Montserrat, sans-serif'; g.fillStyle = '#1b7fb3'; g.textAlign = 'left'; g.fillText('SYMMETRICAL', X0 - 8, by + 50);
    g.fillStyle = C.redDk; g.textAlign = 'right'; g.fillText('ASYMMETRICAL', X1 + 8, by + 50);
    GAMES.forEach((G, i) => {
      const x = px(G.pos), y = i % 2 ? rowB : rowA, on = i === sel;
      g.strokeStyle = on ? C.gold : 'rgba(38,44,106,.3)'; g.lineWidth = on ? 3 : 1.5;
      g.beginPath(); g.moveTo(x, y + th); g.lineTo(x, by - 7); g.stroke();
      g.save(); g.globalAlpha = sel < 0 || on ? 1 : .55;
      g.fillStyle = '#fff'; g.fillRect(x - tw / 2 - 2, y - 2, tw + 4, th + 4);
      cover(g, G.img, x - tw / 2, y, tw, th); g.restore();
      if (on) { g.strokeStyle = C.gold; g.lineWidth = 4; g.strokeRect(x - tw / 2 - 3, y - 3, tw + 6, th + 6); }
    });
    // marker
    if (m != null) {
      const x = px(m);
      g.fillStyle = C.navy; g.strokeStyle = C.gold; g.lineWidth = 3;
      g.beginPath(); g.arc(x, by, 11, 0, Math.PI * 2); g.fill(); g.stroke();
    }
  }

  // the lower half: two circles overlapping by the share of verbs, and the verbs in three columns
  function venn(g, G, k, from) {
    const cx = W / 2, cy = 470, r = 136;
    const sh = lerp(from ? share(from) : share(G), share(G), ease(clamp(k * 1.4)));
    const d = (1 - sh) * 2 * r * 1.08;
    g.save();
    g.globalAlpha = .22; g.fillStyle = C.player; g.beginPath(); g.arc(cx - d / 2, cy, r, 0, Math.PI * 2); g.fill();
    g.fillStyle = C.red; g.beginPath(); g.arc(cx + d / 2, cy, r, 0, Math.PI * 2); g.fill();
    g.globalAlpha = .9; g.lineWidth = 3; g.strokeStyle = C.player; g.beginPath(); g.arc(cx - d / 2, cy, r, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = C.red; g.beginPath(); g.arc(cx + d / 2, cy, r, 0, Math.PI * 2); g.stroke();
    g.restore();
    const a = clamp(k * 2.2 - .5);
    const col = (list, x, fill, ink) => list.forEach((t, j) => chip(g, t, x, cy - (list.length - 1) * 19 + j * 38, fill, ink, clamp(a * 1.6 - j * .25)));
    g.font = '700 15px Montserrat, sans-serif'; g.textBaseline = 'middle'; g.textAlign = 'center';
    g.globalAlpha = a; g.fillStyle = '#1b7fb3'; g.fillText(`ONLY ${G.p1.toUpperCase()}`, 150, 306);
    g.fillStyle = C.ink; g.fillText('BOTH', cx, 306);
    g.fillStyle = C.redDk; g.fillText(`ONLY ${G.p2.toUpperCase()}`, W - 150, 306); g.globalAlpha = 1;
    col(G.a.length ? G.a : ['nothing'], 150, G.a.length ? '#dbeffa' : 'rgba(255,252,244,.7)', G.a.length ? '#155f86' : C.muted);
    col(G.both.length ? G.both : ['nothing'], cx, '#fffaf0', C.ink);
    col(G.b.length ? G.b : ['nothing'], W - 150, G.b.length ? '#f9dcd9' : 'rgba(255,252,244,.7)', G.b.length ? '#8a1c15' : C.muted);
    // readouts
    const n = G.both.length + G.a.length + G.b.length;
    T.label(`Shared verbs: ${G.both.length} of ${n}`, 150, 620, 'center', C.ink, 16);
    T.label(`Same job? ${G.job}`, W - 150, 620, 'center', G.job === 'Yes' ? C.good : G.job === 'No' ? C.redDk : C.goldInk, 16);
  }

  function draw(g, i, from, k) {
    T.use(g); g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,252,244,.6)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill();
    const G = GAMES[i], F = from == null ? null : GAMES[from];
    const m = F ? lerp(F.pos, G.pos, ease(clamp(k * 1.6))) : G.pos;
    strip(g, i, m);
    g.font = '800 26px Montserrat, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = C.ink;
    g.globalAlpha = clamp(k * 3); g.fillText(G.name, W / 2, 262); g.globalAlpha = 1;
    venn(g, G, k, F);
  }

  // title: the strip alone, the marker sweeping from end to end
  canvasDemo('title', (s, cv, g) => (dt, t) => {
    T.use(g); g.clearRect(0, 0, cv.width, cv.height);
    g.fillStyle = '#fbf7ee'; g.beginPath(); g.roundRect(0, 0, W, 300, 14); g.fill();
    const u = (t % 14) / 14, m = 50 - 50 * Math.cos(u * Math.PI * 2) * -1;
    const sel = GAMES.reduce((b, G, j) => Math.abs(G.pos - m) < Math.abs(GAMES[b].pos - m) ? j : b, 0);
    strip(g, sel, m, { by: 204 });
  });

  let api = null;
  canvasDemo('spectrum', (s, cv, g) => {
    const st = { i: 0, from: null, k: 1, tour: false, tt: 0, held: false };
    const STEP = 3.6;
    const side = () => {
      const G = GAMES[st.i];
      say($(s, '.sy-name'), `${G.name} <small>${G.year}</small>`);
      const z = ZONES.find(([, a, b]) => G.pos >= a && G.pos < b) || ZONES[ZONES.length - 1];
      say($(s, '.sy-zone'), `<span class="chip ${G.pos < 30 ? '' : G.pos < 53 ? 'gold' : 'red'}">${z[0]}</span> <span class="sy-job">Same job? <b>${G.job}</b></span>`);
      say($(s, '.sy-diff'), `<b>What differs:</b> ${G.differs}`);
      say($(s, '.sy-pro'), `<b class="good">Payoff:</b> ${G.payoff}`);
      say($(s, '.sy-con'), `<b class="warn">Cost:</b> ${G.cost}`);
      $(s, '.sy-tour').classList.toggle('on', st.tour);
    };
    const go = i => { st.from = st.i; st.i = (i + N) % N; st.k = 0; side(); };
    $(s, '.sy-prev').onclick = () => { st.tour = false; go(st.i - 1); };
    $(s, '.sy-next').onclick = () => { st.tour = false; go(st.i + 1); };
    $(s, '.sy-tour').onclick = () => { st.tour = !st.tour; st.tt = st.i * STEP; side(); };
    // click a cover (or near the bar) to jump to that game
    cv.addEventListener('click', e => {
      const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * W / r.width, y = (e.clientY - r.top) * H / r.height;
      if (y > BAR + 40) return;
      let best = 0; GAMES.forEach((G, j) => { if (Math.abs(px(G.pos) - x) < Math.abs(px(GAMES[best].pos) - x)) best = j; });
      st.tour = false; go(best);
    });
    function tick(t) {
      const i = Math.floor(t / STEP) % N, k = (t % STEP) / 1.6;
      if (i !== st.i) { st.from = st.i; st.i = i; side(); }
      st.k = clamp(k);
    }
    api = { seek(t) { st.held = st.tour = true; if (t === 0) { st.i = 0; st.from = N - 1; } tick(t); draw(g, st.i, st.from, st.k); }, dur: () => N * STEP };
    side();
    return dt => {
      if (!st.held) {
        if (st.tour) { st.tt += dt; tick(st.tt); } else st.k = Math.min(1, st.k + dt / 1.6);
      }
      draw(g, st.i, st.from, st.k);
    };
  }, { enter(s) { const b = $(s, '.sy-tour'); if (b && !b.classList.contains('on')) b.click(); } });

  window.__seek = t => api.seek(t);
  window.__dur = () => api.dur();
})();
