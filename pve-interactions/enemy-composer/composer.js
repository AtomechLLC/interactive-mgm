/* Enemy composer (MGM course 4, module 5, deck slides 42 and 45: "This is compositional design").
   Every Super Mario Bros. enemy on the slide is one card: a movement, what a stomp does, what a fireball does.
   CARDS holds the slide's twelve rows verbatim; play() turns any card plus any look into a scene that is a pure
   function of time, so the composer, the design space and window.__seek (for the GIF) all draw the same thing.
   The sprites are original pixel shapes drawn here, not game art. */
(function () {
  const { $, $$, canvasDemo, demo, say } = FPF.kit;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const arc = (u, h) => 4 * h * u * (1 - u);
  const ez = u => u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
  const frac = v => v - Math.floor(v);

  /* ---------- sprites: one character per pixel, '.' is empty ---------- */
  const PAL = { R: '#d8322b', S: '#f2b98a', K: '#5a3216', B: '#2f56c9', Y: '#ffd23f', W: '#ffffff', G: '#3fa34d', g: '#226b2f',
    D: '#2a3566', L: '#7d93e0', O: '#ff8a1e', k: '#151515', r: '#8f1d18', N: '#a4552a', n: '#6e3414', w: '#b9bccb', P: '#e2603a', p: '#ffd7a8' };
  const HERO = [
    '...RRRR...', '..RRRRRRR.', '..KSSSSK..', '..SSkSkS..', '..SSSSSS..', '...SSSS...', '..RRBBRR..',
    '.RRBBBBRR.', '.SRBYYBRS.', '.S.BBBB.S.', '...BBBB...', '...B..B...', '..KK..KK..'];
  const HERO_STEP = HERO.slice(0, 11).concat(['....BB....', '...KKKK...']);
  const HERO_JUMP = HERO.slice(0, 7).concat(['SRRBBBBRRS', '..RBYYBR..', '...BBBB...', '...BBBB...', '..B....B..', '.KK....KK.']);
  const HERO_THROW = HERO.slice(0, 7).concat(['.RRBBBBRSS', '.SRBYYBR..']).concat(HERO.slice(9));
  const FIRE = ['.OYO.', 'OYYYO', 'YYWYY', 'OYYYO', '.OYO.'];
  const WING = ['..WW', '.WWW', 'WWWw', 'WWw.', 'Ww..'];
  const recolor = (rows, map) => rows.map(r => [...r].map(c => map[c] || c).join(''));
  const stepOf = (rows, a, b) => rows.slice(0, -1).concat([rows.at(-1).replace(a, b)]);

  const GOOMBA = ['....NNNN....', '..NNNNNNNN..', '.NNkWNNWkNN.', 'NNNkWNNWkNNN', 'NNNNNNNNNNNN', '.NNNNNNNNNN.', '...pppppp...', '..nnpppppp..', '.nnnn..pnnn.'];
  const GOOMBA_STEP = GOOMBA.slice(0, 7).concat(['..pppppnn...', '..nnn.nnnn..']);
  const KOOPA = ['.YY.........', 'YYWY........', 'YYkY........', '.YYY..GGGG..', '..YY.GgGGgG.', '..YYGGGGGGGG', '...YGgGGgGGG', '....WWWWWWWW', '.....YY..YY.', '.....YY..YY.'];
  const KOOPA_STEP = KOOPA.slice(0, 8).concat(['....YY...YY.', '....YY...YY.']);
  const RKOOPA = recolor(KOOPA, { G: 'R', g: 'r' }), RKOOPA_STEP = recolor(KOOPA_STEP, { G: 'R', g: 'r' });
  const SHELL_G = ['...GGGG...', '..GgGGgG..', '.GGGGGGGG.', 'GGgGGgGGGG', 'WWWWWWWWWW'];
  const SHELL_R = recolor(SHELL_G, { G: 'R', g: 'r' });
  const SPINY = ['...W...W...', '..WW.W.WW..', '.WRRWRWRRW.', '.RRRRRRRRR.', 'RRWRRRRWRRR', 'RRRRRRRRRRR', 'YkYWWWWWWW.', '.YY.YY.YY..'];
  const SPINY_STEP = SPINY.slice(0, 7).concat(['..YY.YY.YY.']);
  const BUZZY = ['...DDDDD...', '..DLLDDDD..', '.DLDDDDDDD.', '.DDDDDDDDDD', 'DDDDDDDDDDD', 'WWWWWWWWWWW', 'YkY........', '.YY..YY.YY.'];
  const BUZZY_STEP = BUZZY.slice(0, 7).concat(['..YY.YY..YY']);
  const SHELL_D = ['...DDDDD...', '..DLLDDDD..', '.DLDDDDDDD.', 'DDDDDDDDDDD', 'WWWWWWWWWWW'];
  const PIRANHA = ['..RRRRRR..', '.RRWRRWRR.', 'RRRRRRRRRR', 'RWkkkkkkWR', '.RWkkkkWR.', '..RRRRRR..', '....GG....', '.GG.GG.GG.', 'GGGgGGgGGG', '.GGGGGGGG.', '....GG....', '....GG....'];
  const PIRANHA_B = PIRANHA.slice(0, 2).concat(['RRRRRRRRRR', 'RRWkkkkWRR', '.RRWWWWRR.', '..RRRRRR..']).concat(PIRANHA.slice(6));
  const PODO = ['...OOOO...', '..OYYYYO..', '.OYWWWWYO.', 'OYWkWWkWYO', 'OYWWWWWWYO', '.OYWWWWYO.', '..OYYYYO..', '..R.OO.R..', '.R..RR..R.'];
  const PODO_B = PODO.slice(0, 7).concat(['.R.R..R.R.', 'R...RR...R']);
  const BLOOP = ['....ww....', '...wWWw...', '..wWWWWw..', '.wWWWWWWw.', '.wWkWWkWw.', '.wWkWWkWw.', '.wWWWWWWw.', '..wWWWWw..', '.w.w..w.w.', 'w..w..w..w', 'w.w....w.w'];
  const BLOOP_B = BLOOP.slice(0, 8).concat(['..ww..ww..', '..w.ww.w..', '.w..ww..w.']);
  const LAKITU = ['...GGGG...', '..GgGGgG..', '..SSSSSS..', '..SkSSkS..', '...SSSS...', '.wWWWWWWw.', 'wWWkWWkWWw', 'wWWWkkWWWw', '.wWWWWWWw.', '..ww.ww...'];
  const LAKITU_B = LAKITU.slice(0, 8).concat(['.wWWWWWWw.', '...ww.ww..']);
  const BOWSER = ['.....gg.........', '....gGGg..W.W...', '...GGGGGGWGWGW..', '..GGkGGGGGGGGGW.', '.OOGGGGGGGgGGGW.', 'OOOOGGGGGGGGGGW.', 'OkOOOOYYYGGGGW..',
    '.OO.OOYYYYGGG...', '....OYYYYYYGG...', '...OOYYYYYOO....', '..OO.OOOO.OO....', '.OO..O.....OO...'];
  const BOWSER_B = BOWSER.slice(0, 10).concat(['...OO.OO.OO.....', '..OO..O...OO....']);
  const BULLET = ['..kkkkkkk.w.', '.kkkkkkkkwW.', 'kkWWkkkkkwWw', 'kWWkkkkkkwWw', 'kkkkkkkkkwWw', '.kkkkkkkkwW.', '..kkkkkkk.w.'];
  const CHEEP = ['....GGG....', '..GGGGGGG.W', '.GWkGGGGGWW', 'GGkkGGgGGWW', 'WWWGGGGGGWW', '.WWWGGGGG.W', '...OO.OO...'];
  const CHEEP_B = CHEEP.slice(0, 6).concat(['..OO...OO..']);
  const MYST = ['...LLLLLL...', '..LLLLLLLL..', '.LLLkLLkLLL.', '.LLLkLLkLLL.', 'LLLLLLLLLLLL', 'LLLWWWWWWLLL', '.LLLLLLLLLL.', '..DD....DD..'];
  const MYST_B = MYST.slice(0, 7).concat(['...DD..DD...']);

  function spr(g, rows, x, foot, P, o = {}) {
    const w = rows[0].length, h = rows.length;
    g.save();
    g.translate(Math.round(x), Math.round(foot - h * P / 2));
    if (o.rot) g.rotate(o.rot);
    g.scale(o.flipX ? -1 : 1, o.flipY ? -1 : 1);
    if (o.sy) g.scale(1, o.sy);
    g.globalAlpha *= o.a ?? 1;
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
      const ch = rows[r][c]; if (ch === '.' || !ch) continue;
      g.fillStyle = o.tint && ch !== 'k' && ch !== 'W' ? o.tint : PAL[ch];
      g.fillRect(Math.round((c - w / 2) * P), Math.round((r - h / 2) * P), P, P);
    }
    g.restore();
  }

  /* ---------- the slide's table: twelve enemies, three columns ---------- */
  const MOVES = {
    walk: ['Walk', 'forward'], fly: ['Fly', 'forward'], flypatrol: ['Fly patrol', 'left / right'],
    patrol: ['Patrol', 'up / down'], jump: ['Jump', 'forward'], hold: ['Hold & shoot', 'in place'],
  };
  const STOMPS = { kill: 'Kills me', kick: 'Make kickable', wings: 'Remove wings', hurt: 'Hurt Mario' };
  const FIRES = { kill: 'Kills me', ignore: 'Ignored' };
  // look: frames, shell (what a kick leaves), pit (what a patrol rises out of)
  const LOOKS = {
    goomba: { name: 'Goomba', f: [GOOMBA, GOOMBA_STEP] },
    koopa: { name: 'Koopa Troopa', f: [KOOPA, KOOPA_STEP], shell: SHELL_G },
    buzzy: { name: 'Buzzy Beetle', f: [BUZZY, BUZZY_STEP], shell: SHELL_D },
    para: { name: 'Koopa Paratroopa', f: [RKOOPA, RKOOPA_STEP], shell: SHELL_R, wings: true },
    spiny: { name: 'Spiny', f: [SPINY, SPINY_STEP] },
    piranha: { name: 'Piranha Plant', f: [PIRANHA, PIRANHA_B], pit: 'pipe' },
    bloop: { name: 'Blooper', f: [BLOOP, BLOOP_B] },
    lakitu: { name: 'Lakitu', f: [LAKITU, LAKITU_B] },
    bowser: { name: 'Bowser', f: [BOWSER, BOWSER_B], big: true },
    bullet: { name: 'Bullet Bill', f: [BULLET, BULLET] },
    cheep: { name: 'Cheep Cheep', f: [CHEEP, CHEEP_B] },
    podo: { name: 'Lava Bubble', f: [PODO, PODO_B], pit: 'lava' },
    myst: { name: 'New enemy', f: [MYST, MYST_B] },
  };
  // [look, move, stomp, fireball], in the slide's order (left column, then right)
  const CARDS = [
    ['goomba', 'walk', 'kill', 'kill'], ['koopa', 'walk', 'kick', 'kill'], ['buzzy', 'walk', 'kick', 'ignore'],
    ['para', 'flypatrol', 'wings', 'kill'], ['spiny', 'walk', 'hurt', 'kill'], ['piranha', 'patrol', 'hurt', 'kill'],
    ['bloop', 'fly', 'hurt', 'kill'], ['lakitu', 'walk', 'kill', 'kill'], ['bowser', 'hold', 'hurt', 'kill'],
    ['bullet', 'fly', 'kill', 'kill'], ['cheep', 'jump', 'hurt', 'kill'], ['podo', 'patrol', 'hurt', 'kill'],
  ].map(([look, move, stomp, fire]) => ({ look, move, stomp, fire }));
  const CARD = Object.fromEntries(CARDS.map(c => [c.look, c]));
  const key = c => `${c.move}.${c.stomp}.${c.fire}`;
  const matches = c => CARDS.filter(x => key(x) === key(c)).map(x => x.look);
  const WHY = {
    goomba: 'The first enemy, and anything you do beats it. It teaches without testing.',
    koopa: 'One rule away from the Goomba: the stomp leaves a shell you can kick, and a kicked shell can ricochet back at you.',
    buzzy: 'A Koopa that ignores fireballs. The answer that beats the Spiny is the wrong one here.',
    para: 'It flies a patrol, and a stomp only takes its wings: it drops down as a walking Koopa you have to deal with again.',
    spiny: 'Stomping it hurts you, so it pushes you off your favourite verb and onto fire.',
    piranha: 'A jump-timing hazard rising out of a pipe. Its card is identical to the Lava Bubble’s.',
    bloop: 'It swims at you and can’t be stomped, so you burn it or get out of its way.',
    lakitu: 'The table gives it the Goomba’s card. What sets it apart, riding a cloud and dropping Spinies, is a column this table leaves out.',
    bowser: 'He holds the bridge and breathes fire. Stomping him hurts; fire is the answer.',
    bullet: 'It flies straight at you, and a stomp kills it, so it rewards a well-timed jump.',
    cheep: 'It leaps out of the water in arcs, and stomping hurts, so you dodge its jumps or burn it.',
    podo: 'A jump-timing hazard leaping out of lava. Same card as the Piranha Plant, and it still feels different.',
  };
  const names = ls => ls.map(l => LOOKS[l].name);
  const list = a => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a.at(-1);
  const chip = (txt, cls) => `<b class="${cls}">${txt}</b>`;
  const cardText = c => `${MOVES[c.move][0]} (${MOVES[c.move][1]}), stomp: ${STOMPS[c.stomp].toLowerCase()}, fireball: ${FIRES[c.fire].toLowerCase()}`;

  // what the composer says about a card worn by a look
  function readout(c) {
    const m = matches(c), own = CARD[c.look];
    const wall = c.stomp === 'hurt' && c.fire === 'ignore' ? ' <b class="bad">Nothing beats it:</b> stomping hurts and fire bounces off, so it is a wall, not a decision. Give it a weak spot or a way around.' : '';
    if (own && key(own) === key(c)) {
      const twin = m.filter(l => l !== c.look);
      return `<b class="good">This is the ${LOOKS[c.look].name}.</b> ${WHY[c.look]}${twin.length && c.look !== 'piranha' && c.look !== 'podo' && c.look !== 'lakitu' ? ` Same card as the ${list(names(twin))}.` : ''}`;
    }
    if (m.length) return `<b class="bad">Reskin.</b> It looks like ${c.look === 'myst' ? 'a new enemy' : `the ${LOOKS[c.look].name}`}, but it plays exactly like the ${list(names(m))}. Players learn nothing new from it.`;
    const diff = own ? ['move', 'stomp', 'fire'].filter(k => own[k] !== c[k]) : [];
    const what = { move: 'movement', stomp: 'stomp result', fire: 'fireball result' };
    const lead = own && diff.length === 1 ? `<b class="good">New enemy, one rule away from the ${LOOKS[c.look].name}.</b> Changing only its ${what[diff[0]]} gives a card no Super Mario Bros. enemy has.`
      : '<b class="good">New enemy.</b> No Super Mario Bros. enemy has this card.';
    return lead + wall;
  }

  /* ---------- one demo cycle: the enemy moves, Mario stomps it, Mario throws a fireball ---------- */
  const P = 5;
  const PH = { move: 0, stomp: 2.2, fire: 5.0, end: 7.6 };
  const DUR = PH.end;
  const hgt = look => LOOKS[look].f[0].length * P;
  // where the enemy is, relative to its anchor, u seconds into a phase. y is height of its feet above the ground.
  function motion(move, u, tm = TIMING.plant) {
    switch (move) {
      case 'walk': return { x: 70 - 45 * u, y: 0 };
      case 'fly': return { x: 80 - 50 * u, y: 120 + 10 * Math.sin(u * 4) };
      case 'flypatrol': return { x: 70 * Math.sin(u * 1.7 + .9), y: 125 + 8 * Math.sin(u * 5) };
      case 'patrol': return { x: 0, y: patrolY(tm, u + tm.at) * tm.lift - tm.sink };
      case 'jump': { const k = frac(u / 1.0); return { x: 70 - 45 * u, y: arc(k, 120) }; }
      case 'hold': return { x: 0, y: 0 };
    }
  }
  // a patrol's height in [0, 1] over one period; ballistic leaps hang at the top, eased rises hold there.
  // at shifts the cycle so the hazard is up when Mario reaches it; lift and sink place it above its pipe or under the lava
  const TIMING = {
    plant: { name: 'Piranha Plant', rise: .8, up: 1.2, fall: .8, down: 1.4, shape: 'eased', at: 3.45, lift: 160, sink: 60 },
    bubble: { name: 'Lava Bubble', rise: .55, up: 0, fall: .55, down: 1.0, shape: 'ballistic', at: .6, lift: 200, sink: 80 },
  };
  const period = tm => tm.rise + tm.up + tm.fall + tm.down;
  function patrolY(tm, t) {
    const T = period(tm); t = ((t % T) + T) % T;
    if (tm.shape === 'ballistic') { const L = tm.rise + tm.up + tm.fall; return t < L ? arc(t / L, 1) : 0; }
    if (t < tm.rise) return ez(t / tm.rise);
    if (t < tm.rise + tm.up) return 1;
    if (t < tm.rise + tm.up + tm.fall) return 1 - ez((t - tm.rise - tm.up) / tm.fall);
    return 0;
  }

  // the whole cycle for card c at local time t: everything the renderer needs
  function play(c, t, W, H) {
    const GY = H - 70, AX = W * .64, HX = W * .16, tm = c.look === 'podo' ? TIMING.bubble : TIMING.plant;
    // wings belong to the rule, not the look: any enemy whose stomp removes wings wears a pair
    const s = { GY, AX, c, hero: { x: HX, y: 0, pose: 'idle', step: t }, foe: null, extras: [], pops: [], phase: '', wings: c.stomp === 'wings' };
    const foeAt = (u, o = {}) => { const m = motion(c.move, u, tm); return { x: AX + m.x, y: m.y, frame: (u * 5 | 0) % 2, ...o }; };
    const shots = (u0, u) => { if (c.move !== 'hold') return; for (let k = 0; k < 4; k++) { const st = u0 + k * 1.1; if (u >= st && u < st + 1.2) s.extras.push({ k: 'shot', x: AX - 50 - 520 * (u - st), y: hgt(c.look) * .55, a: 1 - (u - st) / 1.2 }); } };
    if (t < PH.stomp) {
      s.phase = 'move';
      const u = t - PH.move;
      s.foe = foeAt(u + 1);
      shots(.3, u);
      s.hero.pose = 'idle';
      return s;
    }
    if (t < PH.fire) {
      s.phase = 'stomp';
      const u = t - PH.stomp, tj = .35, ti = 1.05, f = foeAt(ti + 1), top = f.y + hgt(c.look) - 4;
      const run = clamp(u / tj, 0, 1);
      if (u < tj) { s.hero.x = lerp(HX, HX + 80, run); s.hero.pose = 'walk'; s.foe = foeAt(u + 1); shots(.1, u); return s; }
      if (u < ti) {
        const k = (u - tj) / (ti - tj);
        Object.assign(s.hero, { x: lerp(HX + 80, f.x, k), y: lerp(0, top, k) + arc(k, 140), pose: 'jump' });
        s.foe = foeAt(u + 1); shots(.1, u); return s;
      }
      const k = u - ti;
      s.foe = { ...f };
      const land = (dx, h0) => { const v = clamp(k / .5, 0, 1); Object.assign(s.hero, { x: lerp(f.x, f.x + dx, v), y: lerp(h0, 0, v) + arc(v, 70), pose: v < 1 ? 'jump' : 'idle' }); };
      if (c.stomp === 'kill') {
        s.foe.squash = true; s.foe.a = 1 - clamp((k - .5) / .4, 0, 1); s.foe.y = Math.max(0, f.y - 300 * k * k);
        land(-120, top); pop(s, f.x, top + 70 + k * 40, 'Stomp!', '#1a8a4c', 1 - k);
      } else if (c.stomp === 'kick') {
        const fall = Math.max(0, f.y - 400 * k * k);
        s.foe.shell = true; s.foe.y = fall;
        land(-90, top);
        if (k > .9) { s.foe.x = f.x + 900 * (k - .9); s.foe.spin = true; pop(s, f.x, 90 + (k - .9) * 40, 'Kick!', '#b36b05', 1 - (k - .9) / 1); }
        else pop(s, f.x, top + 70 + k * 40, 'Shell!', '#1a8a4c', 1 - k);
      } else if (c.stomp === 'wings') {
        s.wings = false;
        s.foe.y = Math.max(0, f.y - 500 * k * k); s.foe.x = f.x - 40 * Math.max(0, k - .4); s.foe.frame = (k * 5 | 0) % 2;
        s.extras.push({ k: 'wing', x: f.x - 18 - 30 * k, y: f.y + hgt(c.look) * .7 - 90 * k, rot: -k * 2, a: 1 - k / 1.8 });
        s.extras.push({ k: 'wing', x: f.x + 18 + 30 * k, y: f.y + hgt(c.look) * .7 - 70 * k, rot: k * 2, a: 1 - k / 1.8, flip: true });
        land(-120, top); pop(s, f.x, top + 70 + k * 40, 'Wings off!', '#1a8a4c', 1 - k / 1.4);
      } else {
        s.foe = foeAt(u + 1); shots(.1, u);
        const v = clamp(k / .55, 0, 1);
        Object.assign(s.hero, { x: lerp(f.x, f.x - 170, v), y: lerp(top, 0, v) + arc(v, 70), pose: 'hurt', flash: k < 1.4 && (k * 12 | 0) % 2 === 0 });
        pop(s, f.x, top + 80 + k * 40, 'Ouch!', '#cf2f3b', 1 - k / 1.4);
      }
      return s;
    }
    if (t < PH.end) {
      s.phase = 'fire';
      const u = t - PH.fire, tt = .35, ti = 1.15, f = foeAt(ti + 1), fy0 = 30, fx0 = HX + 120, ty = f.y + hgt(c.look) * .45;
      s.hero.x = HX + 90; s.hero.pose = u > tt - .05 && u < tt + .25 ? 'throw' : 'idle';
      if (u < ti) {
        s.foe = foeAt(u + 1); shots(.05, u);
        if (u >= tt) {
          const k = (u - tt) / (ti - tt), lowFoe = f.y < 40;
          const y = lowFoe ? 14 + Math.abs(Math.sin(k * 9)) * 34 : lerp(fy0, ty, k) + Math.abs(Math.sin(k * 7)) * 20;
          s.extras.push({ k: 'fire', x: lerp(fx0, f.x - 30, k), y, spin: u * 18, a: 1 });
        }
        return s;
      }
      const k = u - ti;
      if (c.fire === 'kill') {
        s.foe = { ...f, flip: true, x: f.x + 70 * k, y: f.y + 300 * k - 1400 * k * k };
        pop(s, f.x, f.y + hgt(c.look) + 50 + k * 40, 'Burned!', '#d0561a', 1 - k);
      } else {
        s.foe = foeAt(u + 1); shots(.05, u);
        if (k < .5) s.extras.push({ k: 'fire', x: f.x - 30 - 260 * k, y: ty + 330 * k - 900 * k * k, spin: k * 30, a: 1 - k / .5 });
        pop(s, f.x, ty + 60 + k * 40, 'Plink', '#b36b05', 1 - k / .9);
      }
      return s;
    }
    s.phase = 'end'; s.foe = foeAt(t - PH.end + 1); return s;
  }
  function pop(s, x, y, text, col, a) { if (a > 0) s.pops.push({ x, y, text, col, a }); }

  /* ---------- drawing ---------- */
  const INK = '#262c6a';
  function ground(g, W, H, GY, pit, AX) {
    g.strokeStyle = 'rgba(38,44,106,.28)'; g.fillStyle = 'rgba(38,44,106,.06)'; g.lineWidth = 3;
    for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(120 + i * 360, GY, 150, 80, 0, Math.PI, 0); g.fill(); g.stroke(); }
    g.fillStyle = INK; g.fillRect(0, GY, W, H - GY);
    g.fillStyle = '#3a4290';
    for (let y = GY; y < H; y += 20) { g.fillRect(0, y, W, 2); for (let x = ((y - GY) / 20) % 2 ? 20 : 0; x < W; x += 40) g.fillRect(x, y, 2, 20); }
    g.fillStyle = '#ffb951'; g.fillRect(0, GY, W, 5);
    if (pit === 'lava') {
      g.fillStyle = '#152044'; g.fillRect(AX - 70, GY, 140, H - GY);
      g.fillStyle = '#ff6a1e'; g.fillRect(AX - 70, GY + 28, 140, H - GY - 28);
      g.fillStyle = '#ffd23f'; for (let i = 0; i < 6; i++) g.fillRect(AX - 64 + i * 24, GY + 28, 12, 5);
    }
  }
  function pipe(g, AX, GY) {
    g.fillStyle = '#3fa34d'; g.strokeStyle = '#152044'; g.lineWidth = 3;
    g.fillRect(AX - 40, GY - 70, 80, 70); g.strokeRect(AX - 40, GY - 70, 80, 70);
    g.fillRect(AX - 50, GY - 100, 100, 32); g.strokeRect(AX - 50, GY - 100, 100, 32);
    g.fillStyle = '#7fd08a'; g.fillRect(AX - 30, GY - 66, 10, 62); g.fillRect(AX - 40, GY - 96, 12, 24);
  }
  function drawHero(g, h, GY) {
    const rows = h.pose === 'jump' || h.pose === 'hurt' ? HERO_JUMP : h.pose === 'throw' ? HERO_THROW : h.pose === 'walk' && (h.step * 8 | 0) % 2 ? HERO_STEP : HERO;
    spr(g, rows, h.x, GY - h.y, P, { a: h.flash ? .3 : 1 });
  }
  function drawFoe(g, s, GY, look) {
    const f = s.foe, L = LOOKS[look]; if (!f || (f.a ?? 1) <= 0) return;
    const foot = GY - f.y, o = { a: f.a ?? 1 };
    if (f.shell) {
      const sh = L.shell || L.f[0];
      return spr(g, sh, f.x, foot, P, L.shell ? o : { ...o, sy: .5 });
    }
    if (f.squash) return spr(g, L.f[0], f.x, foot, P, { ...o, sy: .4 });
    if (f.flip) return spr(g, L.f[0], f.x, foot, P, { ...o, flipY: true });
    if (s.wings) {
      const flap = Math.sin(s.hero.step * 14) > 0;
      spr(g, WING, f.x + 4, foot - hgt(look) * .45 - (flap ? 8 : 0), P, { flipX: true, sy: flap ? 1 : .6 });
    }
    spr(g, L.f[f.frame || 0], f.x, foot, P, o);
    if (s.wings) {
      const flap = Math.sin(s.hero.step * 14) > 0;
      spr(g, WING, f.x + 22, foot - hgt(look) * .5 - (flap ? 8 : 0), P, { sy: flap ? 1 : .6 });
    }
  }
  function popText(g, p, GY) {
    g.save(); g.globalAlpha = clamp(p.a, 0, 1); g.font = '700 28px Montserrat, Jost, sans-serif'; g.textAlign = 'center';
    g.lineWidth = 7; g.strokeStyle = '#fffaf0'; g.strokeText(p.text, p.x, GY - p.y); g.fillStyle = p.col; g.fillText(p.text, p.x, GY - p.y); g.restore();
  }
  function label(g, text, x, y, o = {}) {
    g.save(); g.font = `${o.w || 600} ${o.size || 22}px Montserrat, Jost, sans-serif`; g.textAlign = o.align || 'center'; g.textBaseline = 'middle';
    const m = g.measureText(text).width, pw = 14, bw = m + pw * 2, bh = (o.size || 22) + 16;
    const bx = o.align === 'left' ? x - pw : o.align === 'right' ? x - m - pw : x - bw / 2;
    g.fillStyle = o.bg || 'rgba(21,32,68,.9)'; g.beginPath(); g.roundRect(bx, y - bh / 2, bw, bh, 8); g.fill();
    if (o.edge) { g.strokeStyle = o.edge; g.lineWidth = 3; g.stroke(); }
    g.fillStyle = o.col || '#fff'; g.fillText(text, x, y + 1); g.restore();
  }
  // the whole scene for card c at time t on a W x H canvas; badge names the current phase
  function scene(g, W, H, c, t, o = {}) {
    const s = play(c, t, W, H), GY = s.GY, look = c.look, pit = c.move === 'patrol' ? (LOOKS[look].pit || 'pipe') : null;
    g.clearRect(0, 0, W, H);
    ground(g, W, H, GY, pit === 'lava' ? 'lava' : null, s.AX);
    // a patrol rises out of its pit: draw the enemy, then the pipe in front of it
    if (pit) { g.save(); g.beginPath(); g.rect(0, 0, W, pit === 'pipe' ? GY - 100 : GY + 28); g.clip(); }
    drawFoe(g, s, GY, look);
    if (pit) g.restore();
    if (pit === 'pipe') pipe(g, s.AX, GY);
    s.extras.forEach(e => {
      if (e.k === 'fire') spr(g, FIRE, e.x, GY - e.y, P, { rot: e.spin, a: e.a });
      else if (e.k === 'wing') spr(g, WING, e.x, GY - e.y, P, { rot: e.rot, a: e.a, flipX: !e.flip });
      else if (e.k === 'shot') spr(g, FIRE, e.x, GY - e.y, P * 1.3, { rot: e.x / 30, a: e.a });
    });
    drawHero(g, s.hero, GY);
    s.pops.forEach(p => popText(g, p, GY));
    if (o.badges !== false) {
      const steps = [['move', `Moves: ${MOVES[c.move][0]}`], ['stomp', `Stomp: ${STOMPS[c.stomp]}`], ['fire', `Fireball: ${FIRES[c.fire]}`]];
      let x = 24;
      g.font = '600 20px Montserrat, Jost, sans-serif';
      steps.forEach(([k, txt]) => {
        const on = s.phase === k, w = g.measureText(txt).width + 28;
        label(g, txt, x, 34, { align: 'left', size: 20, bg: on ? '#152044' : 'rgba(255,250,240,.85)', col: on ? '#ffb951' : '#5d618c', edge: on ? '#ffb951' : '#cdbf9f' });
        x += w + 12;
      });
    }
    return s;
  }
  const icon = (cv, look, P2 = 3.4) => { const g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height); spr(g, LOOKS[look].f[0], cv.width / 2, cv.height - 3, P2); };

  /* ---------- slide 1: title ---------- */
  canvasDemo('title', (s, c, g) => (dt, t) => {
    g.clearRect(0, 0, c.width, c.height);
    CARDS.forEach((cd, i) => spr(g, LOOKS[cd.look].f[((t * 3 + i * .37) | 0) % 2], 50 + i * 72, 110 + (cd.look === 'bowser' ? 0 : 0), 3.4));
  });

  /* ---------- slide 2: the slide's twelve cards ---------- */
  canvasDemo('cards', (s, c, g) => {
    const grid = $(s, '.cd-grid'), out = $(s, '.cd-out'), st = { i: 0, t: 0 };
    grid.innerHTML = CARDS.map((cd, i) => `<button class="cd" data-i="${i}"><canvas width="64" height="56"></canvas><span class="nm">${LOOKS[cd.look].name}</span>` +
      `<span class="mv">${MOVES[cd.move][0]}</span><span class="st s-${cd.stomp}">${STOMPS[cd.stomp]}</span><span class="fi f-${cd.fire}">${FIRES[cd.fire]}</span></button>`).join('');
    $$(grid, '.cd').forEach(b => { icon($(b, 'canvas'), CARDS[b.dataset.i].look, 3.2); b.onclick = () => { st.i = +b.dataset.i; st.t = 0; sync(); }; });
    function sync() {
      $$(grid, '.cd').forEach(b => b.classList.toggle('on', +b.dataset.i === st.i));
      const cd = CARDS[st.i], twin = matches(cd).filter(l => l !== cd.look);
      say(out, `<b>${LOOKS[cd.look].name}:</b> ${WHY[cd.look]}${twin.length ? ` <span class="muted">Identical card: ${list(names(twin))}.</span>` : ''}`);
    }
    sync();
    return dt => { st.t = (st.t + dt) % DUR; scene(g, c.width, c.height, CARDS[st.i], st.t); };
  });

  /* ---------- slide 3: the composer, with a tour that changes one rule at a time ---------- */
  const TOUR = [
    { look: 'goomba', move: 'walk', stomp: 'kill', fire: 'kill', say: 'Start from the Goomba: walk forward, a stomp kills it, a fireball kills it.' },
    { look: 'koopa', move: 'walk', stomp: 'kick', fire: 'kill', say: 'Change one rule, the stomp now leaves a kickable shell, and you have the Koopa Troopa.' },
    { look: 'buzzy', move: 'walk', stomp: 'kick', fire: 'ignore', say: 'Change one more, fireballs are ignored, and you have the Buzzy Beetle.' },
    { look: 'myst', move: 'walk', stomp: 'hurt', fire: 'ignore', say: 'Make the stomp hurt too and nothing beats it. That card is a wall, not a decision, and Super Mario Bros. never uses it.' },
    { look: 'spiny', move: 'walk', stomp: 'hurt', fire: 'kill', say: 'Let fire work again and you have the Spiny: it pushes you off jumping and onto fireballs.' },
    { look: 'piranha', move: 'patrol', stomp: 'hurt', fire: 'kill', say: 'Keep the Spiny’s two results and change only the movement to an up and down patrol: the Piranha Plant.' },
    { look: 'para', move: 'flypatrol', stomp: 'wings', fire: 'kill', say: 'A flying patrol where a stomp only takes the wings: the Koopa Paratroopa.' },
  ];
  const TOUR_DUR = TOUR.length * DUR;
  let composerApi = null;
  canvasDemo('composer', (s, c, g) => {
    const out = $(s, '.cp-out'), looks = $(s, '.cp-looks');
    const st = { card: { ...CARDS[0] }, t: 0, tour: false, tt: 0, held: false, last: '' };
    looks.innerHTML = Object.keys(LOOKS).map(l => `<button class="lk" data-l="${l}" title="${LOOKS[l].name}"><canvas width="60" height="52"></canvas></button>`).join('');
    $$(looks, '.lk').forEach(b => { icon($(b, 'canvas'), b.dataset.l, 3); b.onclick = () => { stopTour(); st.card.look = b.dataset.l; st.t = 0; }; });
    const groups = { move: MOVES, stomp: STOMPS, fire: FIRES };
    Object.entries(groups).forEach(([k, opts]) => {
      const box = $(s, `.cp-${k}`);
      box.innerHTML = Object.entries(opts).map(([v, txt]) => `<button class="btn sm" data-k="${k}" data-v="${v}">${Array.isArray(txt) ? txt[0] : txt}</button>`).join('');
      $$(box, 'button').forEach(b => b.onclick = () => { stopTour(); st.card[k] = b.dataset.v; st.t = 0; });
    });
    function stopTour() { st.tour = false; }
    $(s, '.cp-tour').onclick = () => { st.tour = true; st.tt = 0; };
    $(s, '.cp-reset').onclick = () => { stopTour(); st.card = { ...CARDS[0] }; st.t = 0; };
    function sync(cd, text) {
      $$(s, '[data-k]').forEach(b => b.classList.toggle('on', cd[b.dataset.k] === b.dataset.v));
      $$(looks, '.lk').forEach(b => b.classList.toggle('on', b.dataset.l === cd.look));
      $(s, '.cp-tour').classList.toggle('on', st.tour);
      const k = key(cd) + cd.look + text;
      if (k !== st.last) { st.last = k; say(out, text); $(s, '.cp-card').innerHTML = `${chip(MOVES[cd.move][0], 'mv')}${chip(STOMPS[cd.stomp], 'st s-' + cd.stomp)}${chip(FIRES[cd.fire], 'fi f-' + cd.fire)}`; }
    }
    function render() {
      if (st.tour) {
        const tt = Math.max(0, st.tt) % TOUR_DUR, i = Math.min(TOUR.length - 1, Math.floor(tt / DUR)), step = TOUR[i];
        scene(g, c.width, c.height, step, tt - i * DUR);
        label(g, `${i + 1} / ${TOUR.length}`, c.width - 24, 34, { align: 'right', size: 20 });
        sync(step, step.say);
        return;
      }
      scene(g, c.width, c.height, st.card, st.t);
      sync(st.card, readout(st.card));
    }
    composerApi = { seek(t) { st.held = st.tour = true; st.tt = t; render(); }, dur: () => TOUR_DUR };
    return dt => { if (!st.held) { st.t = (st.t + dt) % DUR; st.tt += dt; } render(); };
  }, { enter(s) { const b = $(s, '.cp-tour'); if (b && !b.classList.contains('on')) b.click(); } });

  /* ---------- slide 4: the design space, every card the three columns allow ---------- */
  canvasDemo('space', (s, c, g) => {
    const tbl = $(s, '.sp-grid'), out = $(s, '.sp-out'), st = { cell: 'walk.kill.kill', t: 0 };
    const cols = [];
    Object.keys(STOMPS).forEach(sk => Object.keys(FIRES).forEach(fk => cols.push([sk, fk])));
    tbl.innerHTML = '<tr><th></th>' + Object.keys(STOMPS).map(sk => `<th colspan="2" class="sk">Stomp: ${STOMPS[sk]}</th>`).join('') + '</tr>'
      + '<tr><th></th>' + cols.map(([, fk]) => `<th class="fk">Fire: ${FIRES[fk].replace('Kills me', 'kills')}</th>`).join('') + '</tr>'
      + Object.keys(MOVES).map(mv => `<tr><th class="mvh">${MOVES[mv][0]}</th>` + cols.map(([sk, fk]) => {
        const k = `${mv}.${sk}.${fk}`, ls = CARDS.filter(x => key(x) === k).map(x => x.look);
        return `<td data-c="${k}" class="${ls.length ? 'used' : ''} ${sk === 'hurt' && fk === 'ignore' ? 'wall' : ''}">${ls.map(l => `<canvas width="40" height="34" data-l="${l}"></canvas>`).join('')}</td>`;
      }).join('') + '</tr>').join('');
    $$(tbl, 'canvas').forEach(cv => icon(cv, cv.dataset.l, 2.2));
    $$(tbl, 'td').forEach(td => td.onclick = () => { st.cell = td.dataset.c; st.t = 0; sync(); });
    const used = new Set(CARDS.map(key)).size;
    $(s, '.sp-stats').innerHTML = `<div><b>48</b><span>possible cards</span></div><div><b>${used}</b><span>used by the slide’s 12 enemies</span></div><div><b>${48 - used}</b><span>left to design</span></div>`;
    function card() { const [move, stomp, fire] = st.cell.split('.'), ls = CARDS.filter(x => key(x) === st.cell); return { look: ls[0]?.look || 'myst', move, stomp, fire }; }
    function sync() {
      $$(tbl, 'td').forEach(td => td.classList.toggle('on', td.dataset.c === st.cell));
      const cd = card(), ls = matches(cd);
      say(out, ls.length ? `<b>${list(names(ls))}.</b> ${cardText(cd).replace(/^./, m => m.toUpperCase())}.${ls.length > 1 ? ' Two enemies share this card; the next slide shows why they still feel different.' : ''}`
        : `<b class="good">Unused.</b> ${cardText(cd).replace(/^./, m => m.toUpperCase())}.${cd.stomp === 'hurt' && cd.fire === 'ignore' ? ' <b class="bad">Nothing beats this one,</b> so the whole column is a wall.' : ' A real enemy nobody has built yet: the same three columns, recombined.'}`);
    }
    sync();
    return dt => { st.t = (st.t + dt) % DUR; scene(g, c.width, c.height, card(), st.t, { badges: true }); };
  });

  /* ---------- slide 5: same card, different feel (slide 45) ---------- */
  let feelApi = null;
  canvasDemo('feel', (s, c, g) => {
    const out = $(s, '.fl-out'), st = { t: 0, swap: false, held: false };
    $(s, '.fl-swap').onclick = e => { st.swap = !st.swap; e.target.classList.toggle('on', st.swap); st.t = 0; };
    const W = c.width, H = c.height, LW = W / 2;
    function lane(x0, look, tm, t) {
      g.save(); g.translate(x0, 0); g.beginPath(); g.rect(0, 0, LW, H); g.clip();
      const GY = 300, AX = LW * .55, pitLava = look === 'podo';
      const T = period(tm), loop = 2 * T;
      // the hazard
      const h = patrolY(tm, t);
      g.fillStyle = INK; g.fillRect(0, GY, LW, 40); g.fillStyle = '#ffb951'; g.fillRect(0, GY, LW, 4);
      if (pitLava) { g.fillStyle = '#152044'; g.fillRect(AX - 60, GY, 120, 40); g.fillStyle = '#ff6a1e'; g.fillRect(AX - 60, GY + 22, 120, 18); }
      g.save(); g.beginPath(); g.rect(0, 0, LW, pitLava ? GY + 22 : GY - 100); g.clip();
      const foot = (pitLava ? GY + 40 : GY - 100 + 60) - h * (pitLava ? 230 : 70);
      spr(g, LOOKS[look].f[(t * 4 | 0) % 2], AX, foot, P);
      g.restore();
      if (!pitLava) pipe(g, AX, GY);
      // Mario: walk to the edge, wait for the safe window, jump across
      const win = safeWindow(tm), tc = frac(t / loop) * loop, edge = AX - 110, far = AX + 110, j = .62;
      const go = T + win.start + .05;
      let hx, hy = 0, pose = 'idle';
      if (tc < 1) { hx = lerp(30, edge, tc); pose = 'walk'; }
      else if (tc < go) hx = edge;
      else if (tc < go + j) { const k = (tc - go) / j; hx = lerp(edge, far, k); hy = arc(k, pitLava ? 120 : 150) + (pitLava ? 0 : 0); pose = 'jump'; }
      else { hx = lerp(far, LW + 40, clamp((tc - go - j) / 1.2, 0, 1)); pose = 'walk'; }
      drawHero(g, { x: hx, y: hy, pose, step: t }, GY);
      if (tc >= T && tc < go) label(g, 'wait for it…', edge, GY - 110, { size: 17, bg: 'rgba(255,250,240,.9)', col: '#262c6a', edge: '#cdbf9f' });
      // height over one period, with the safe window shaded and a cursor at now
      const gx = 30, gw = LW - 60, gy = 350, gh = 70;
      g.fillStyle = 'rgba(255,250,240,.85)'; g.fillRect(gx, gy, gw, gh); g.strokeStyle = '#cdbf9f'; g.lineWidth = 2; g.strokeRect(gx, gy, gw, gh);
      g.fillStyle = 'rgba(26,138,76,.18)';
      const sx = x => gx + gw * x / T;
      g.fillRect(sx(win.start), gy, sx(Math.min(T, win.start + win.len)) - sx(win.start), gh);
      if (win.start + win.len > T) g.fillRect(gx, gy, sx(win.start + win.len - T) - gx, gh);
      g.font = '600 14px Jost, sans-serif'; g.fillStyle = '#5d618c'; g.textAlign = 'right'; g.fillText('height over one cycle', gx + gw - 6, gy + gh - 8);
      g.strokeStyle = look === 'podo' ? '#d0561a' : '#226b2f'; g.lineWidth = 3; g.beginPath();
      for (let i = 0; i <= 120; i++) { const tt = T * i / 120; g.lineTo(sx(tt), gy + gh - 6 - (gh - 12) * patrolY(tm, tt)); }
      g.stroke();
      g.fillStyle = '#152044'; g.fillRect(sx(t % T) - 1.5, gy, 3, gh);
      g.font = '600 15px Jost, sans-serif'; g.fillStyle = '#1a8a4c'; g.textAlign = 'left'; g.fillText('safe to pass', sx(win.start) + 6, gy + 18);
      g.restore();
      return win;
    }
    function render() {
      const t = st.t;
      g.clearRect(0, 0, W, H);
      const tp = st.swap ? TIMING.bubble : TIMING.plant, tb = st.swap ? TIMING.plant : TIMING.bubble;
      const a = lane(0, 'piranha', tp, t), b = lane(LW, 'podo', tb, t);
      g.fillStyle = '#cdbf9f'; g.fillRect(LW - 1, 20, 2, H - 40);
      label(g, `Piranha Plant${st.swap ? ', with the Lava Bubble’s timing' : ''}`, LW / 2, 26, { size: 19 });
      label(g, `Lava Bubble${st.swap ? ', with the Piranha Plant’s timing' : ''}`, LW + LW / 2, 26, { size: 19 });
      const d = (w, tm) => `${w.len.toFixed(1)} s safe in every ${period(tm).toFixed(1)} s`;
      const msg = `<b>Same card:</b> patrol up and down, a stomp hurts Mario, a fireball kills it. Only the timing differs. `
        + `The plant rises slowly and lingers (${d(a, tp)}), so you wait it out; the bubble snaps up and drops straight back (${d(b, tb)}), so you jump on the beat.`
        + (st.swap ? ' <b class="good">Swap the timing and they swap feel.</b> The difference was never in the rules.' : '');
      if (msg !== st.msg) { st.msg = msg; say(out, msg); }
    }
    // both lanes loop every two periods; the plant's period is twice the bubble's, so this is one seamless loop
    feelApi = { seek(t) { st.held = true; st.t = t; render(); }, dur: () => 2 * Math.max(period(TIMING.plant), period(TIMING.bubble)) };
    return dt => { if (!st.held) st.t += dt; render(); };
  });
  // the longest stretch per period when the hazard is low enough to jump past
  function safeWindow(tm) {
    const T = period(tm), n = 400, low = i => patrolY(tm, T * i / n) < .2;
    let best = { start: 0, len: 0 };
    for (let i = 0; i < n; i++) {
      if (!low(i) || low((i - 1 + n) % n)) continue;
      let j = 0; while (j < n && low((i + j) % n)) j++;
      if (j * T / n > best.len) best = { start: i * T / n, len: j * T / n };
    }
    return best;
  }

  window.__seek = (t, which = 'composer') => (which === 'feel' ? feelApi : composerApi).seek(t);
  window.__dur = (which = 'composer') => (which === 'feel' ? feelApi : composerApi).dur();
})();
