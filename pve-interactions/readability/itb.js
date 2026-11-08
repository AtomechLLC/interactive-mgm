/* Readable Enemies: Into the Breach as the worked example of PvE readability.
   1. Title: five Vek and the telegraphs they draw.
   2. One Turn, Fully Told: a whole turn (Vek move and aim, your three Mechs, the Vek attack, new Vek emerge), played with
      the telegraphs shown and with them hidden. Same board, same rules, two plans.
   3. Read the Shape: thirteen Vek grouped by the shape of their attack, each on a small board with its rule from the
      game's scripts, plus a quiz that hides the telegraph.
   4. One Telegraph, Many Answers: the Firefly's "first thing in the line" rule answered five ways.
   Everything on the boards is a pure function of time: run(scene, steps, t) replays the scripted steps from the start
   state, so stepping, the walk-throughs and window.__seek (for the GIF) all show the same thing.
   Tiles, icons, sprites and portraits are the game's own art (img/CREDITS.txt). Unit rules: weapons_enemy.lua and the
   mech weapon scripts, as read into C:\Projects\GameDesignSkills\IntoTheBreach\unit_behaviour_rules.md. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const TAU = Math.PI * 2;
  const F = (w, s) => `${w} ${s}px Jost, sans-serif`, M = (w, s) => `${w} ${s}px Montserrat, Jost, sans-serif`;
  const rr = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
  function text(g, s, x, y, font, col, align = 'left') { g.font = font; g.fillStyle = col; g.textAlign = align; g.fillText(s, x, y); }
  function wrap(g, s, x, y, w, lh) {
    const words = String(s).split(' '); let line = '', yy = y;
    words.forEach(wd => { const t = line ? line + ' ' + wd : wd; if (g.measureText(t).width > w && line) { g.fillText(line, x, yy); line = wd; yy += lh; } else line = t; });
    if (line) g.fillText(line, x, yy); return yy;
  }
  const PAPER = '#1d252c', GOLD = '#ffb951', HURT = '#ff6a3d';

  /* ---------------- art ---------------- */
  const IM = {};
  const load = (k, p) => { const i = new Image(); i.src = 'img/' + p; IM[k] = i; return i; };
  [['ground', 'ground_0'], ['water', 'water_0'], ['mtn', 'mountain_0'], ['mtnB', 'mountain_0_broken'], ['forest', 'forest_0'], ['bld', 'building_sheet'],
   ['square', 'square'], ['stripes', 'warningstripes'], ['boom', 'arrow_hit'], ['pdot', 'projectile_arrow_dot'], ['adot', 'artillery_dot'],
   ['emerge', 'emerge_loop'], ['iEmerge', 'icon_emerge'], ['web', 'icon_grapple'], ['acid', 'icon_acid'], ['block', 'icon_spawnblock'], ['power', 'icon_gridpower_yellow'],
   ['d1', 'damage_1'], ['d2', 'damage_2'], ['d3', 'damage_3'],
   ['hit0', 'arrow_hit_up'], ['hit1', 'arrow_hit_right'], ['hit2', 'arrow_hit_down'], ['hit3', 'arrow_hit_left'],
   ['push0', 'arrow_up'], ['push1', 'arrow_right'], ['push2', 'arrow_down'], ['push3', 'arrow_left']].forEach(([k, f]) => load(k, `ui/${f}.png`));
  const sprite = k => IM['sp_' + k] || load('sp_' + k, `sprites/${k}.png`);
  const portrait = k => IM['po_' + k] || load('po_' + k, `portraits/${k}.png`);
  const ok = i => i && i.complete && i.naturalWidth;
  const preload = kinds => kinds.forEach(k => { sprite(k); if (!/Mech$|^Wall$|^Blob1$|^WebbEgg1$|^Spiderling1$/.test(k)) portrait(k); });
  const TINT = {};
  function tinted(key, col) { // a tinted copy of a white UI image (target squares, stripes)
    const id = key + col; if (TINT[id]) return TINT[id];
    const src = IM[key]; if (!ok(src)) return null;
    const c = document.createElement('canvas'); c.width = src.naturalWidth; c.height = src.naturalHeight;
    const x = c.getContext('2d'); x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height);
    return (TINT[id] = c);
  }

  /* ---------------- units ---------------- */
  // kind -> name, health, whether it flies, and how it attacks (see telegraph()). Health and rules from the game's scripts.
  const UNITS = {
    PunchMech: { name: 'Combat Mech', hp: 3, mech: 1 }, TankMech: { name: 'Cannon Mech', hp: 3, mech: 1 }, ArtiMech: { name: 'Artillery Mech', hp: 2, mech: 1 },
    Hornet1: { name: 'Hornet', hp: 2, fly: 1, atk: 'adj', dmg: 1 },
    Scorpion1: { name: 'Scorpion', hp: 3, atk: 'adj', web: 1, dmg: 1 },
    Leaper1: { name: 'Leaper', hp: 1, atk: 'adj', web: 1, dmg: 3 },
    Burrower1: { name: 'Burrower', hp: 3, atk: 'row3', dmg: 1 },
    Firefly1: { name: 'Firefly', hp: 3, fly: 1, atk: 'proj', dmg: 1 },
    Centipede1: { name: 'Centipede', hp: 3, atk: 'proj', acid: 1, dmg: 1 },
    Beetle1: { name: 'Beetle', hp: 4, atk: 'charge', dmg: 1 },
    Scarab1: { name: 'Scarab', hp: 2, atk: 'art', dmg: 1 },
    Crab1: { name: 'Crab', hp: 3, atk: 'art2', dmg: 1 },
    Digger1: { name: 'Digger', hp: 2, atk: 'digger', dmg: 1 },
    Starfish1: { name: 'Starfish', hp: 2, atk: 'diag', dmg: 1 },
    Blobber1: { name: 'Blobber', hp: 3, atk: 'spawn', spawn: 'Blob1' },
    Blob1: { name: 'Blob', hp: 1, atk: 'self', dmg: 1 },
    Spider1: { name: 'Spider', hp: 2, atk: 'spawn', spawn: 'WebbEgg1', webs: 1 },
    WebbEgg1: { name: 'Spiderling Egg', hp: 1, atk: 'hatch' },
    Spiderling1: { name: 'Spiderling', hp: 1, atk: 'adj', dmg: 1 },
    Wall: { name: 'Rock', hp: 1, rock: 1 },
  };
  preload(Object.keys(UNITS));
  const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // up, right, down, left: the game's DIR_UP..DIR_LEFT (c is x, r is y)

  /* ---------------- board state ---------------- */
  function scene(def) { // a fresh state from a scene definition
    const S = { n: def.n, map: def.map || [], blds: (def.blds || []).map(([c, r]) => ({ c, r, alive: true })), mtns: (def.mtns || []).map(([c, r]) => ({ c, r, hp: 2 })),
      units: {}, grid: def.grid || 5, gridMax: def.gridMax || 7, flags: {}, emerge: (def.emerge || []).map(([c, r, kind]) => ({ c, r, kind, done: false })), log: {} };
    Object.entries(def.units || {}).forEach(([id, u]) => { S.units[id] = { id, kind: u[0], c: u[1], r: u[2], hp: u[3] ?? UNITS[u[0]].hp, max: UNITS[u[0]].hp, dir: u[4] ?? 3, dist: u[5] ?? 3, order: u[6] || 0, alive: true, acted: false, web: false, born: -1 }; });
    return S;
  }
  const clone = S => JSON.parse(JSON.stringify(S));
  const inb = (S, c, r) => c >= 0 && r >= 0 && c < S.n && r < S.n;
  const terr = (S, c, r) => (S.map[r] || '')[c] || '.';
  const unitAt = (S, c, r) => Object.values(S.units).find(u => u.alive && Math.round(u.c) === c && Math.round(u.r) === r);
  const bldAt = (S, c, r) => S.blds.find(b => b.c === c && b.r === r);
  const mtnAt = (S, c, r) => S.mtns.find(m => m.c === c && m.r === r && m.hp > 0);
  const blocked = (S, c, r) => !inb(S, c, r) || unitAt(S, c, r) || bldAt(S, c, r) || mtnAt(S, c, r);
  function whatAt(S, c, r) {
    if (!inb(S, c, r)) return 'nothing';
    const u = unitAt(S, c, r); if (u) return UNITS[u.kind].mech ? `the ${UNITS[u.kind].name}` : UNITS[u.kind].rock ? 'its own rock' : `the ${UNITS[u.kind].name}`;
    const b = bldAt(S, c, r); if (b) return b.alive ? 'a building' : 'rubble';
    if (mtnAt(S, c, r)) return 'a mountain';
    return 'empty ground';
  }

  // what a Vek will do this turn, from where it stands now: tiles hit (with damage and direction), its path, and any
  // instant setup (webs, rocks, spawns). Recomputed every frame, so a push moves the telegraph with the Vek.
  function telegraph(S, u) {
    const K = UNITS[u.kind], c = Math.round(u.c), r = Math.round(u.r), [dc, dr] = DIRS[u.dir], T = { tiles: [], path: [], arc: null, webs: [], rocks: [], spawn: null, after: [] };
    const hit = (x, y, dmg = K.dmg, dir = u.dir, extra = {}) => { if (inb(S, x, y)) T.tiles.push({ c: x, r: y, dmg, dir, ...extra }); };
    switch (K.atk) {
      case 'adj': hit(c + dc, r + dr); if (K.web) T.webs.push([c + dc, r + dr]); break;
      case 'row3': hit(c + dc, r + dr); hit(c + dc + dr, r + dr + dc, K.dmg, null); hit(c + dc - dr, r + dr - dc, K.dmg, null); break;
      case 'proj': {
        let x = c + dc, y = r + dr;
        while (inb(S, x, y) && !blocked(S, x, y)) { T.path.push([x, y]); if (!inb(S, x + dc, y + dr)) break; x += dc; y += dr; }
        if (!inb(S, x, y)) { x -= dc; y -= dr; }
        if (T.path.length && T.path[T.path.length - 1][0] === x && T.path[T.path.length - 1][1] === y) T.path.pop();
        hit(x, y, K.dmg, u.dir, { acid: K.acid });
        if (K.acid) { hit(x + dr, y + dc, K.dmg, null, { acid: 1 }); hit(x - dr, y - dc, K.dmg, null, { acid: 1 }); }
        break;
      }
      case 'art': T.arc = [c + dc * u.dist, r + dr * u.dist]; hit(...T.arc, K.dmg, null); break;
      case 'art2': T.arc = [c + dc * u.dist, r + dr * u.dist]; hit(...T.arc, K.dmg, null); hit(T.arc[0] + dc, T.arc[1] + dr, K.dmg, null); break;
      case 'charge': {
        let x = c, y = r;
        while (inb(S, x + dc, y + dr) && !blocked(S, x + dc, y + dr) && terr(S, x + dc, y + dr) !== 'w') { x += dc; y += dr; T.path.push([x, y]); }
        T.stop = [x, y];
        if (inb(S, x + dc, y + dr) && blocked(S, x + dc, y + dr)) hit(x + dc, y + dr, K.dmg, u.dir, { push: u.dir });
        break;
      }
      case 'digger': DIRS.forEach(([a, b]) => { const x = c + a, y = r + b; if (inb(S, x, y) && !blocked(S, x, y) && terr(S, x, y) !== 'w') T.rocks.push([x, y]); hit(x, y, K.dmg, null); }); break;
      case 'diag': [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a, b]) => hit(c + a, r + b, K.dmg, null)); break;
      case 'self': DIRS.forEach(([a, b]) => hit(c + a, r + b, K.dmg, null)); break;
      case 'spawn': {
        const x = c + dc * u.dist, y = r + dr * u.dist; T.arc = [x, y]; T.spawn = [x, y, K.spawn];
        if (K.webs) DIRS.forEach(([a, b]) => { if (inb(S, x + a, y + b)) T.webs.push([x + a, y + b]); });
        if (K.spawn === 'Blob1') DIRS.forEach(([a, b]) => { if (inb(S, x + a, y + b)) T.after.push([x + a, y + b]); });
        break;
      }
    }
    return T;
  }
  function describe(S, u) { // one line for the threat list
    const T = telegraph(S, u), K = UNITS[u.kind];
    if (K.atk === 'spawn') return `throws a ${UNITS[K.spawn].name.toLowerCase()} onto ${whatAt(S, ...T.spawn)}`;
    const t = T.tiles[0]; if (!t) return 'hits nothing';
    return `hits ${whatAt(S, t.c, t.r)}`;
  }

  // damage, pushes and deaths. Every rule below runs on a fresh copy of the state each frame.
  function damage(S, c, r, dmg) {
    const u = unitAt(S, c, r);
    if (u) { if (UNITS[u.kind].rock) { u.alive = false; return 'rock'; } u.hp = Math.max(0, u.hp - dmg); if (u.hp <= 0) u.alive = false; return u.alive ? 'unit' : 'kill'; }
    const b = bldAt(S, c, r); if (b && b.alive && dmg > 0) { b.alive = false; S.grid = Math.max(0, S.grid - 1); return 'bld'; }
    const m = mtnAt(S, c, r); if (m && dmg > 0) { m.hp -= 1; return 'mtn'; }
    return 'none';
  }
  function push(S, c, r, dir, k) { // slides the unit on (c, r) one tile; nothing moves into a blocked tile
    const u = unitAt(S, c, r); if (!u || UNITS[u.kind].rock) return;
    const [dc, dr] = DIRS[dir], x = c + dc, y = r + dr;
    if (!inb(S, x, y) || blocked(S, x, y)) return;
    u.c = lerp(c, x, ease(k)); u.r = lerp(r, y, ease(k));
  }

  /* ---------------- the step runner ---------------- */
  // a step: { ph, dur, cap, acts: [[from, to, fn(S, k, fx)]] }, from / to as fractions of the step.
  // fx is null for finished steps (state only) and an array for the step being shown (things to draw).
  function run(def, steps, t) {
    const S = scene(def); let i = 0, acc = 0;
    for (; i < steps.length; i++) {
      const st = steps[i], cur = t < acc + st.dur || i === steps.length - 1, u = cur ? clamp((t - acc) / st.dur) : 1, fx = cur ? [] : null;
      st.acts.forEach(([a, b, fn]) => { if (u >= a) fn(S, clamp((u - a) / Math.max(1e-6, b - a)), fx); });
      if (cur) return { S, fx, i, u, step: st };
      acc += st.dur;
    }
  }
  const total = steps => steps.reduce((a, s) => a + s.dur, 0);
  const startOf = (steps, i) => steps.slice(0, i).reduce((a, s) => a + s.dur, 0);

  // act builders
  const flag = (k, v = true) => [0, 0, S => { S.flags[k] = v; }];
  function moveAct(a, b, id, path) {
    return [a, b, (S, k) => {
      const u = S.units[id]; if (!u || !u.alive) return;
      const n = path.length - 1, p = ease(k) * n, i = Math.min(n - 1, Math.floor(p)), f = p - i;
      u.c = lerp(path[i][0], path[i + 1][0], f); u.r = lerp(path[i][1], path[i + 1][1], f);
    }];
  }
  function aimAct(a, b, tiles, pushes = []) { return [a, b, (S, k, fx) => { if (fx && k < 1) fx.push({ t: 'aim', tiles, pushes, k }); }]; }
  // a mech weapon: 'proj' fires down a line from (c, r) in dir, 'art' lobs at a tile, 'punch' hits the tile next to it.
  let SHOT = 0;
  function mechShot(a, b, kind, from, dir, opt = {}) {
    const acts = [], mid = lerp(a, b, .55), id = 'shot' + SHOT++;
    acts.push([a, mid, (S, k, fx) => {
      if (!fx || k >= 1) return;
      const tgt = mechTarget(S, kind, from, dir, opt);
      fx.push({ t: kind === 'art' ? 'arc' : kind === 'punch' ? 'lunge' : 'ball', from, to: tgt, k, col: '#9fe0ff' });
    }]);
    acts.push([mid, b, (S, k, fx) => {
      const tgt = mechTarget(S, kind, from, dir, opt);
      const dmg = kind === 'punch' ? 2 : 1;
      if (fx) fx.push({ t: 'boom', c: tgt[0], r: tgt[1], k }, { t: 'pop', c: tgt[0], r: tgt[1], k, s: dmg ? `-${dmg}` : '' });
      // damage lands on the first frame of the window; pushes slide during it
      if (!S.log[id]) S.log[id] = damage(S, tgt[0], tgt[1], dmg);
      if (kind === 'art') DIRS.forEach(([dc, dr], d) => push(S, tgt[0] + dc, tgt[1] + dr, d, k));
      else push(S, tgt[0], tgt[1], dir, k);
    }]);
    return acts;
  }
  function mechTarget(S, kind, [c, r], dir, opt) {
    const [dc, dr] = DIRS[dir];
    if (kind === 'punch') return [c + dc, r + dr];
    if (kind === 'art') return [c + dc * opt.dist, r + dr * opt.dist];
    let x = c + dc, y = r + dr; while (inb(S, x + dc, y + dr) && !blocked(S, x, y)) { x += dc; y += dr; } return [x, y];
  }
  // a Vek carries out the attack its telegraph shows
  function vekAct(a, b, id) {
    const mid = lerp(a, b, .5);
    return [[a, mid, (S, k, fx) => {
      const u = S.units[id]; if (!u || !u.alive || !fx || k >= 1) return;
      const T = telegraph(S, u), K = UNITS[u.kind], t0 = T.tiles[0];
      if (!t0) return;
      const from = [Math.round(u.c), Math.round(u.r)];
      fx.push({ t: K.atk === 'art' || K.atk === 'art2' ? 'arc' : K.atk === 'proj' ? 'ball' : 'lunge', from, to: [t0.c, t0.r], k, col: '#c6ff5a', vek: id });
    }], [mid, b, (S, k, fx) => {
      const u = S.units[id]; if (!u) return;
      if (!u.alive && !S.log['v' + id]) { S.log['v' + id] = 'dead'; return; }
      if (S.log['v' + id] === 'dead') return;
      const T = telegraph(S, u);
      if (!S.log['v' + id]) { S.log['v' + id] = T.tiles.map(t => whatAt(S, t.c, t.r)).join(', ') || 'nothing'; T.tiles.forEach(t => damage(S, t.c, t.r, t.dmg)); u.acted = true; S.log['vt' + id] = T.tiles; }
      if (fx) (S.log['vt' + id] || []).forEach(t => fx.push({ t: 'boom', c: t.c, r: t.r, k }, { t: 'pop', c: t.c, r: t.r, k, s: `-${t.dmg}` }));
    }]];
  }
  function emergeAct(a, b) {
    return [a, b, (S, k, fx) => {
      if (!S.log.emerged) {
        S.log.emerged = 1; S.flags.emerge = false;
        S.emerge.forEach((e, i) => {
          const u = unitAt(S, e.c, e.r); e.done = true;
          if (u) { u.hp -= 1; if (u.hp <= 0) u.alive = false; e.blocked = u.id; }
          else S.units['new' + i] = { id: 'new' + i, kind: e.kind, c: e.c, r: e.r, hp: UNITS[e.kind].hp, max: UNITS[e.kind].hp, dir: 2, dist: 3, order: 0, alive: true, acted: true, web: false, born: 1 };
        });
      }
      S.emerge.forEach(e => { if (e.blocked && fx) fx.push({ t: 'blockpop', c: e.c, r: e.r, k }); });
      Object.values(S.units).forEach(u => { if (u.born > 0) u.born = k; });
    }];
  }

  /* ---------------- drawing ---------------- */
  function board(ox, oy, n, s = 2) { const HW = 28 * s, HH = 21 * s; return { ox, oy, n, s, HW, HH, mid: (c, r) => [ox + (c - r) * HW, oy + (c + r) * HH] }; }
  function img(g, i, x, y, w, h) { if (ok(i)) g.drawImage(i, Math.round(x), Math.round(y), w, h); }
  function tileImg(g, B, c, r, i, alpha = 1, inset = 0) {
    if (!i) return; const [x, y] = B.mid(c, r), s = B.s; g.globalAlpha = alpha;
    g.drawImage(i, Math.round(x - 27 * s + inset), Math.round(y - 20.5 * s + inset * .75), 54 * s - inset * 2, 41 * s - inset * 1.5); g.globalAlpha = 1;
  }
  function drawGround(g, B, S) {
    const L = [];
    for (let c = 0; c < B.n; c++) for (let r = 0; r < B.n; r++) L.push([c, r]);
    L.sort((a, b) => a[0] + a[1] - b[0] - b[1]);
    L.forEach(([c, r]) => { const [x, y] = B.mid(c, r), t = terr(S, c, r), i = t === 'w' ? IM.water : IM.ground; img(g, i, x - 28 * B.s, y - 21 * B.s, 56 * B.s, 74 * B.s); });
  }
  function spriteAt(g, B, kind, c, r, o = {}) {
    const i = sprite(kind); if (!ok(i)) return;
    const [x, y] = B.mid(c, r), s = B.s, K = UNITS[kind] || {}, w = i.naturalWidth * s, h = i.naturalHeight * s;
    const bob = K.fly ? Math.sin((o.time || 0) * 3 + c + r) * 3 : 0;
    g.save(); g.globalAlpha = o.alpha ?? 1;
    if (o.flash) g.filter = 'brightness(2.2)';
    if (o.silhouette) g.filter = 'brightness(0) opacity(.85)';
    const sc = o.scale ?? 1;
    g.translate(x + 3 * s, y + 9 * s + bob); g.scale(sc, sc);
    g.drawImage(i, -w / 2, -h, w, h);
    g.restore();
  }
  function pips(g, x, y, hp, max, mech) {
    const w = max * 9 + 4; g.fillStyle = 'rgba(10,14,18,.85)'; rr(g, x - w / 2, y, w, 10, 3); g.fill();
    for (let i = 0; i < max; i++) { g.fillStyle = i < hp ? (mech ? '#7ee05a' : '#ffb03a') : '#3a4048'; g.fillRect(x - w / 2 + 3 + i * 9, y + 2, 7, 6); }
  }
  function building(g, B, b) {
    const i = IM.bld; if (!ok(i)) return; const [x, y] = B.mid(b.c, b.r), s = B.s, f = b.alive ? 0 : 2;
    [[9, -7], [-8, 2]].forEach(([dx, dy], k) => g.drawImage(i, f * 31, 0, 31, 40, Math.round(x + dx * s - 17.5 * s), Math.round(y + dy * s - 37 * s + 8 * s), 31 * s, 40 * s));
  }
  function mountain(g, B, m) { const i = m.hp >= 2 ? IM.mtn : IM.mtnB; if (!ok(i)) return; const [x, y] = B.mid(m.c, m.r), s = B.s; if (m.hp <= 0) return; g.drawImage(i, Math.round(x - 38 * s + 5 * s), Math.round(y - 65 * s + 26 * s), 76 * s, 65 * s); }
  function badge(g, x, y, n, col = GOLD) { g.fillStyle = '#10161c'; rr(g, x - 13, y - 13, 26, 26, 6); g.fill(); g.fillStyle = col; rr(g, x - 11, y - 11, 22, 22, 5); g.fill(); text(g, String(n), x, y + 6, M(800, 16), '#10161c', 'center'); }
  const icon = (g, i, x, y, k = 2) => { if (ok(i)) g.drawImage(i, Math.round(x - i.naturalWidth * k / 2), Math.round(y - i.naturalHeight * k / 2), i.naturalWidth * k, i.naturalHeight * k); };

  // the telegraph of one Vek, in two layers: on the tiles (under units) and above them (numbers, icons, arcs)
  function telTiles(g, B, S, T, a, time) {
    const pulse = .45 + .2 * Math.sin(time * 5);
    T.path.forEach(([c, r]) => { const [x, y] = B.mid(c, r); g.globalAlpha = a * .9; icon(g, IM.pdot, x, y, B.s * .9); g.globalAlpha = 1; });
    T.tiles.forEach(t => {
      tileImg(g, B, t.c, t.r, tinted('square', '#e2452b'), a * pulse);
      const st = tinted('stripes', '#ffb03a'); if (st) { const [x, y] = B.mid(t.c, t.r); g.globalAlpha = a * .55; g.drawImage(st, 0, 0, 54, 41, Math.round(x - 27 * B.s), Math.round(y - 20.5 * B.s), 54 * B.s, 41 * B.s); g.globalAlpha = 1; }
      if (t.dir != null) tileImg(g, B, t.c, t.r, IM['hit' + t.dir], a);
      else { const [x, y] = B.mid(t.c, t.r); g.globalAlpha = a; icon(g, IM.boom, x, y, B.s * .8); g.globalAlpha = 1; }
    });
    T.after.forEach(([c, r]) => tileImg(g, B, c, r, tinted('square', '#ffb03a'), a * .28));
    if (T.stop && T.path.length) { const [x, y] = B.mid(...T.stop); g.globalAlpha = a; g.strokeStyle = '#ffd36b'; g.setLineDash([6, 5]); g.lineWidth = 3; g.beginPath(); g.ellipse(x, y, 30, 18, 0, 0, TAU); g.stroke(); g.setLineDash([]); g.globalAlpha = 1; }
  }
  function telTop(g, B, S, u, T, a, opt = {}) {
    T.tiles.forEach(t => { const [x, y] = B.mid(t.c, t.r); g.globalAlpha = a; icon(g, IM['d' + Math.min(3, t.dmg)], x + 22 * B.s / 2 + 8, y - 14, B.s * .9); if (t.acid) icon(g, IM.acid, x - 22, y - 16, B.s * .8); g.globalAlpha = 1; });
    if (T.arc) {
      const [x0, y0] = B.mid(Math.round(u.c), Math.round(u.r)), [x1, y1] = B.mid(...T.arc), hgt = 45 * B.s + Math.hypot(x1 - x0, y1 - y0) * .25;
      g.globalAlpha = a; for (let i = 1; i < 12; i++) { const k = i / 12, x = lerp(x0, x1, k), y = lerp(y0 - 20 * B.s, y1, k) - Math.sin(k * Math.PI) * hgt; icon(g, IM.adot, x, y, .55 * B.s); } g.globalAlpha = 1;
    }
    T.webs.forEach(([c, r]) => { const [x, y] = B.mid(c, r); g.globalAlpha = a; icon(g, IM.web, x, y - 30, B.s); g.globalAlpha = 1; });
    if (opt.order && u.order) { const [x, y] = B.mid(u.c, u.r); g.globalAlpha = a; badge(g, x - 30, y - 64, u.order); g.globalAlpha = 1; }
  }
  // all objects back to front: mountains, buildings, rocks, units (with health pips)
  function drawObjects(g, B, S, o = {}) {
    const L = [];
    S.mtns.forEach(m => L.push([m.c + m.r, () => mountain(g, B, m)]));
    S.blds.forEach(b => L.push([b.c + b.r, () => building(g, B, b)]));
    Object.values(S.units).forEach(u => {
      if (!u.alive && !(o.dying && o.dying[u.id] != null)) return;
      const fade = !u.alive ? 1 - o.dying[u.id] : 1;
      L.push([u.c + u.r + .01, () => {
        const [x, y] = B.mid(u.c, u.r), born = u.born >= 0 && u.born < 1 ? u.born : 1;
        spriteAt(g, B, u.kind, u.c, u.r, { time: o.time, alpha: fade * (o.ghost && o.ghost[u.id] ? .4 : 1), scale: .4 + .6 * born, silhouette: o.hideSprite === u.id });
        if (u.alive && !UNITS[u.kind].rock && o.pips !== false) pips(g, x, y + 22, u.hp, u.max, UNITS[u.kind].mech);
      }]);
    });
    L.sort((a, b) => a[0] - b[0]).forEach(e => e[1]());
  }
  function drawFx(g, B, fx, time) {
    (fx || []).forEach(f => {
      if (f.t === 'aim') { // your own shot, previewed
        const p = .5 + .3 * Math.sin(time * 6);
        f.tiles.forEach(([c, r]) => tileImg(g, B, c, r, tinted('square', '#4fb3f0'), p));
        f.pushes.forEach(([c, r, d]) => { const [x, y] = B.mid(c, r), [dc, dr] = DIRS[d]; icon(g, IM['push' + d], x + (dc - dr) * 22, y + (dc + dr) * 16 - 10, B.s * .7); });
      } else if (f.t === 'ball' || f.t === 'arc') {
        const [x0, y0] = B.mid(...f.from), [x1, y1] = B.mid(...f.to), k = f.k;
        let x = lerp(x0, x1, k), y = lerp(y0 - 18 * B.s, y1 - 10 * B.s, k); if (f.t === 'arc') y -= Math.sin(k * Math.PI) * (45 * B.s + Math.hypot(x1 - x0, y1 - y0) * .25);
        g.fillStyle = f.col; g.shadowColor = f.col; g.shadowBlur = 16; g.beginPath(); g.arc(x, y, 9, 0, TAU); g.fill(); g.shadowBlur = 0;
      } else if (f.t === 'lunge') { // a melee strike: a bright slash at the target tile
        const [x1, y1] = B.mid(...f.to); g.globalAlpha = Math.sin(f.k * Math.PI); icon(g, IM.boom, x1, y1 - 20, B.s * (.6 + f.k * .6)); g.globalAlpha = 1;
      } else if (f.t === 'boom') {
        const [x, y] = B.mid(f.c, f.r); if (f.k < .5) { g.globalAlpha = 1 - f.k * 2; icon(g, IM.boom, x, y - 24, B.s * (1 + f.k * 1.5)); g.globalAlpha = 1; }
      } else if (f.t === 'pop' && f.s) {
        const [x, y] = B.mid(f.c, f.r); g.globalAlpha = clamp(1.4 - f.k * 1.2); text(g, f.s, x, y - 60 - f.k * 30, M(800, 26), HURT, 'center'); g.globalAlpha = 1;
      } else if (f.t === 'blockpop') {
        const [x, y] = B.mid(f.c, f.r); g.globalAlpha = clamp(1.5 - f.k); icon(g, IM.block, x + 30, y - 70, B.s * 1.2); text(g, 'blocked, -1', x, y - 96 - f.k * 16, M(800, 20), HURT, 'center'); g.globalAlpha = 1;
      }
    });
  }
  function emergeMarks(g, B, S, a, time) {
    S.emerge.forEach(e => {
      if (e.done) return; const [x, y] = B.mid(e.c, e.r), i = IM.emerge;
      if (ok(i)) { const f = Math.floor(time * 8) % 6; g.globalAlpha = a; g.drawImage(i, f * 56, 0, 56, 43, Math.round(x - 28 * B.s), Math.round(y - 21.5 * B.s), 56 * B.s, 43 * B.s); g.globalAlpha = 1; }
    });
  }
  function emergeTop(g, B, S, a) { S.emerge.forEach(e => { if (e.done) return; const [x, y] = B.mid(e.c, e.r); g.globalAlpha = a; icon(g, IM.iEmerge, x, y - 34, B.s * 1.1); g.globalAlpha = 1; }); }
  function gridBar(g, x, y, S) {
    text(g, 'POWER GRID', x, y, M(800, 13), '#c9d1d9');
    for (let i = 0; i < S.gridMax; i++) { g.globalAlpha = i < S.grid ? 1 : .2; icon(g, IM.power, x + 10 + i * 24, y + 24, 1.4); } g.globalAlpha = 1;
  }

  /* ================= 1. title ================= */
  canvasDemo('title', (sl, cv, g) => {
    const B = board(0, 0, 3, 2), CAST = [['Hornet1', 'adj', 1], ['Firefly1', 'proj', 1], ['Scarab1', 'art', 1], ['Digger1', 'digger'], ['Spider1', 'spawn', 1]];
    let t = 0;
    return dt => {
      t += Math.min(dt, .1); g.clearRect(0, 0, cv.width, cv.height); g.imageSmoothingEnabled = false;
      CAST.forEach(([kind, , dir], i) => {
        const ox = 110 + i * 220, oy = 46, b = board(ox, oy, 3, 1.25), S = scene({ n: 3, units: { v: [kind, 1, 1, null, dir ?? 1, 2] } });
        if (kind === 'Firefly1') { S.units.v.c = 0; S.units.v.r = 1; }
        if (kind === 'Scarab1' || kind === 'Spider1') { S.units.v.c = 0; S.units.v.r = 1; S.units.v.dist = 2; }
        drawGround(g, b, S);
        const u = S.units.v, T = telegraph(S, u), a = .55 + .45 * Math.sin(t * 2 + i);
        telTiles(g, b, S, T, a, t); drawObjects(g, b, S, { time: t, pips: false }); telTop(g, b, S, u, T, a);
        text(g, UNITS[kind].name.toUpperCase(), ox, 252, M(800, 15), '#ffb951', 'center');
      });
    };
  });

  /* ================= 2. one turn, fully told ================= */
  const TURN = {
    n: 6, map: ['m..m..', '......', '......', '......', '..f...', '.....w'], blds: [[1, 1], [1, 2], [4, 4]], mtns: [[0, 0], [3, 0]], grid: 5,
    units: { P: ['PunchMech', 2, 3], T: ['TankMech', 5, 3], A: ['ArtiMech', 0, 3], F: ['Firefly1', 5, 1, null, 3, 0, 1], H: ['Hornet1', 5, 4, null, 0, 0, 2], S: ['Scarab1', 0, 5, null, 0, 3, 3] },
    emerge: [[3, 5, 'Scorpion1'], [5, 0, 'Leaper1']],
  };
  const PHASES = ['Vek move & aim', 'Your turn', 'Vek attack', 'Vek emerge'];
  const vekMove = [moveAct(0, .8, 'F', [[5, 1], [4, 1]]), moveAct(.1, .9, 'H', [[5, 4], [5, 5], [4, 5]]), moveAct(.2, 1, 'S', [[0, 5], [1, 5]])];
  const OPEN = [
    { ph: 0, dur: 2.4, cap: 'The Vek move. A Firefly, a Hornet and a Scarab take their places around three buildings.', acts: vekMove },
    { ph: 0, dur: 5, cap: { shown: 'Then they aim, and the game draws every attack: striped tiles they will hit, an arrow for the direction, the damage, and a number for the order they act in. The Firefly’s goo will hit the building at the end of its row, the Hornet stings the one above it, the Scarab lobs at the third.', hidden: 'Then they aim, but here nothing is drawn. You can see three bugs and three buildings. You cannot see which building each one will hit, or in what order.' }, acts: [flag('aim')] },
    { ph: 0, dur: 3.4, cap: { shown: 'Cracked ground marks where two more Vek will dig up next turn. A unit standing there blocks it and takes 1 damage.', hidden: 'Two more Vek are about to dig up somewhere. Nothing tells you where.' }, acts: [flag('emerge')] },
  ];
  const SOLVE = [...OPEN,
    { ph: 1, dur: 4.6, cap: 'Artillery Mech: shoot the empty tile beside the Scarab. The blast pushes the Scarab one tile over, and its lob slides with it, onto empty ground.', acts: [moveAct(0, .22, 'A', [[0, 3], [0, 2]]), aimAct(.22, .5, [[0, 5]], [[1, 5, 1]]), ...mechShot(.5, .95, 'art', [0, 2], 2, { dist: 3 })] },
    { ph: 1, dur: 4.6, cap: 'Cannon Mech: shoot the Firefly from below. 1 damage, and the push moves it out of the building’s row. Watch its telegraph: the new line ends at a mountain.', acts: [moveAct(0, .22, 'T', [[5, 3], [4, 3]]), aimAct(.22, .5, [[4, 1]], [[4, 1, 0]]), ...mechShot(.5, .95, 'proj', [4, 3], 0)] },
    { ph: 1, dur: 4.8, cap: 'Combat Mech: step onto the cracked tile and punch the Hornet for 2. It dies, so its attack is gone, and the Mech now blocks one of the emerging Vek.', acts: [moveAct(0, .3, 'P', [[2, 3], [3, 3], [3, 4], [3, 5]]), aimAct(.3, .55, [[4, 5]], [[4, 5, 1]]), ...mechShot(.55, .95, 'punch', [3, 5], 1)] },
    { ph: 2, dur: 2.8, cap: 'Vek 1, the Firefly, fires exactly as shown: the goo hits the mountain.', acts: vekAct(.1, .9, 'F') },
    { ph: 2, dur: 2.2, cap: 'Vek 2, the Hornet, is dead. Nothing happens.', acts: vekAct(.1, .9, 'H') },
    { ph: 2, dur: 2.8, cap: 'Vek 3, the Scarab, lobs onto the empty tile its telegraph moved to.', acts: vekAct(.1, .9, 'S') },
    { ph: 3, dur: 3.4, cap: 'New Vek dig up. The Combat Mech on the cracked tile blocks one and takes 1 damage; a Leaper climbs out of the other.', acts: [emergeAct(.1, .9)] },
    { ph: 3, dur: 5, cap: 'All three buildings stand. Every move was planned against attacks the screen had already shown.', acts: [[0, 1, (S, k, fx) => fx && fx.push({ t: 'sum', k })]] },
  ];
  const GUESS = [...OPEN,
    { ph: 1, dur: 4.6, cap: 'With no telegraphs, you guess. Combat Mech punches the closest bug, the Scarab: 2 damage kills it. Lucky: that one was aiming at a building.', acts: [moveAct(0, .3, 'P', [[2, 3], [2, 4], [1, 4]]), aimAct(.3, .55, [[1, 5]], []), ...mechShot(.55, .95, 'punch', [1, 4], 2)] },
    { ph: 1, dur: 4.6, cap: 'Cannon Mech shoots the Firefly from the side for 1 damage. The push moves it along its own firing row, so it will still hit the same building.', acts: [moveAct(0, .3, 'T', [[5, 3], [5, 2], [5, 1]]), aimAct(.3, .55, [[4, 1]], [[4, 1, 3]]), ...mechShot(.55, .95, 'proj', [5, 1], 3)] },
    { ph: 1, dur: 4.6, cap: 'Artillery Mech hits the Hornet for 1. It survives with 1 health.', acts: [moveAct(0, .3, 'A', [[0, 3], [0, 4], [0, 5]]), aimAct(.3, .55, [[4, 5]], []), ...mechShot(.55, .95, 'art', [0, 5], 1, { dist: 4 })] },
    { ph: 2, dur: 2.8, cap: 'Vek 1, the Firefly: its goo hits the building at the end of the row. One grid power lost.', acts: vekAct(.1, .9, 'F') },
    { ph: 2, dur: 2.8, cap: 'Vek 2, the Hornet, stings the building above it. Another grid power lost.', acts: vekAct(.1, .9, 'H') },
    { ph: 2, dur: 2.2, cap: 'Vek 3, the Scarab, is dead. Nothing happens.', acts: vekAct(.1, .9, 'S') },
    { ph: 3, dur: 3.4, cap: 'Two new Vek dig up, one on each cracked tile. Nobody knew to stand there.', acts: [emergeAct(.1, .9)] },
    { ph: 3, dur: 5, cap: 'Two buildings lost and four Vek on the board. The moves were sensible; the player just had nothing to read.', acts: [[0, 1, (S, k, fx) => fx && fx.push({ t: 'sum', k })]] },
  ];
  const PLANS = { shown: SOLVE, hidden: GUESS };

  function turnScene(g, mode, t, time) {
    const steps = PLANS[mode], R = run(TURN, steps, t), S = R.S, B = board(370, 140, 6), shown = mode === 'shown';
    g.clearRect(0, 0, 1000, 680); g.imageSmoothingEnabled = false;
    g.fillStyle = PAPER; rr(g, 0, 0, 1000, 680, 14); g.fill();
    // phase bar
    PHASES.forEach((p, i) => { const x = 18 + i * 170, on = i === R.step.ph; g.fillStyle = on ? GOLD : 'rgba(255,255,255,.08)'; rr(g, x, 16, 162, 34, 8); g.fill(); text(g, `${i + 1}  ${p}`, x + 12, 39, M(700, 14), on ? '#10161c' : '#8b96a3'); });
    text(g, shown ? 'TELEGRAPHS SHOWN' : 'TELEGRAPHS HIDDEN', 982, 39, M(800, 14), shown ? '#7ee05a' : HURT, 'right');
    drawGround(g, B, S);
    const vek = Object.values(S.units).filter(u => u.alive && !UNITS[u.kind].mech && u.order && !u.acted);
    const tels = S.flags.aim && shown ? vek.map(u => [u, telegraph(S, u)]) : [];
    if (S.flags.emerge && shown) emergeMarks(g, B, S, 1, time);
    const fade = R.i === 1 ? clamp(R.u * 3) : 1;
    tels.forEach(([u, T]) => telTiles(g, B, S, T, fade, time));
    drawObjects(g, B, S, { time });
    tels.forEach(([u, T]) => telTop(g, B, S, u, T, fade, { order: 1 }));
    if (S.flags.emerge && shown) emergeTop(g, B, S, 1);
    drawFx(g, B, R.fx, time);
    // threats, read straight from the telegraphs
    const X = 730; g.fillStyle = 'rgba(255,255,255,.05)'; rr(g, X - 12, 70, 282, 596, 12); g.fill();
    gridBar(g, X, 98, S);
    text(g, 'THREATS THIS TURN', X, 160, M(800, 13), '#c9d1d9');
    ['F', 'H', 'S'].forEach((id, i) => {
      const u = S.units[id], y = 178 + i * 92, done = S.log['v' + id];
      img(g, portrait(u.kind), X, y, 64, 64); badge(g, X + 60, y + 6, u.order);
      text(g, UNITS[u.kind].name, X + 80, y + 22, M(800, 16), '#fff');
      g.font = F(500, 15); g.textAlign = 'left';
      let line, col = '#c9d1d9';
      if (done) { line = done === 'dead' ? 'Was dead: no attack.' : `Hit ${done}.`; col = /building/.test(done) ? HURT : '#9fb0bf'; }
      else if (!u.alive) { line = 'Dead. Its attack is gone.'; col = '#7ee05a'; }
      else if (!S.flags.aim) line = 'Moving…';
      else if (!shown) { line = 'Intent hidden.'; col = '#8b96a3'; }
      else { const d = describe(S, u); line = d[0].toUpperCase() + d.slice(1) + '.'; col = /building/.test(d) ? HURT : '#7ee05a'; }
      g.fillStyle = col; wrap(g, line, X + 80, y + 44, 180, 19);
    });
    text(g, 'NEXT TURN', X, 470, M(800, 13), '#c9d1d9');
    const left = S.emerge.filter(e => !e.done).length;
    g.font = F(500, 15); g.fillStyle = '#c9d1d9'; g.textAlign = 'left';
    if (S.log.emerged) wrap(g, S.emerge.map(e => e.blocked ? 'One emerging Vek blocked.' : `A ${UNITS[e.kind].name} emerged.`).join(' '), X, 494, 250, 19);
    else if (!S.flags.emerge) wrap(g, '—', X, 494, 250, 19);
    else if (shown) { icon(g, IM.iEmerge, X + 12, 490, 1.6); wrap(g, `${left} Vek will emerge on the cracked tiles.`, X + 30, 494, 220, 19); }
    else wrap(g, 'Vek will emerge somewhere. Not shown.', X, 494, 250, 19);
    const sum = (R.fx || []).find(f => f.t === 'sum');
    if (sum) {
      const a = clamp(sum.k * 4), st = S.blds.filter(b => b.alive).length, vk = Object.values(S.units).filter(u => u.alive && !UNITS[u.kind].mech).length;
      g.globalAlpha = a; g.fillStyle = 'rgba(16,22,28,.9)'; rr(g, 120, 250, 500, 150, 14); g.fill(); g.strokeStyle = st === 3 ? '#7ee05a' : HURT; g.lineWidth = 3; g.stroke();
      text(g, `${st} of 3 buildings stand`, 370, 300, M(800, 26), st === 3 ? '#7ee05a' : HURT, 'center');
      text(g, `Grid power ${S.grid} · ${vk} Vek on the board`, 370, 338, F(600, 19), '#fff', 'center');
      text(g, shown ? 'Planned against attacks you could read.' : 'Planned against attacks nobody could see.', 370, 370, F(500, 17), '#c9d1d9', 'center');
      g.globalAlpha = 1;
    }
    return R;
  }
  let turnApi = null;
  canvasDemo('turn', (sl, cv, g) => {
    const out = $(sl, '.tn-out'), playBtn = $(sl, '.tn-play');
    const st = { mode: 'shown', t: 0, play: true, held: false, time: 0, lastCap: '' };
    const steps = () => PLANS[st.mode];
    const setPlay = p => { st.play = p; playBtn.classList.toggle('on', p); playBtn.textContent = p ? '❚❚ Pause' : '▶ Play'; };
    const cur = () => run(TURN, steps(), st.t).i;
    $$(sl, '.tn-mode .btn').forEach(b => b.onclick = () => { st.mode = b.dataset.m; $$(sl, '.tn-mode .btn').forEach(x => x.classList.toggle('on', x === b)); st.t = Math.min(st.t, total(steps()) - .01); });
    $(sl, '.tn-prev').onclick = () => { setPlay(false); const i = cur(), s0 = startOf(steps(), i); st.t = st.t - s0 > .3 || i === 0 ? s0 : startOf(steps(), i - 1); };
    $(sl, '.tn-next').onclick = () => {
      setPlay(false); const end = i => startOf(steps(), i) + steps()[i].dur - .02;
      let i = cur(); if (st.t >= end(i) - .03) i = Math.min(steps().length - 1, i + 1); st.t = end(i);
    };
    playBtn.onclick = () => { if (st.t >= total(steps()) - .05) st.t = 0; setPlay(!st.play); };
    $(sl, '.tn-restart').onclick = () => { st.t = 0; setPlay(true); };
    function frame() {
      const R = turnScene(g, st.mode, st.t, st.time), c = R.step.cap, cap = typeof c === 'string' ? c : c[st.mode];
      const html = `<b>Step ${R.i + 1} of ${steps().length}.</b> ${cap}`;
      if (html !== st.lastCap) { say(out, html); st.lastCap = html; }
    }
    // the GIF plays the shown turn, then the hidden one
    turnApi = {
      dur: w => w === 'both' ? total(SOLVE) + total(GUESS) : total(PLANS[w] || SOLVE),
      seek(t, w = 'both') { st.held = true; setPlay(false); let m = w; if (w === 'both') { m = t < total(SOLVE) ? 'shown' : 'hidden'; if (m === 'hidden') t -= total(SOLVE); } st.mode = m; st.t = t; st.time = t; $$(sl, '.tn-mode .btn').forEach(x => x.classList.toggle('on', x.dataset.m === m)); frame(); },
    };
    return dt => {
      if (st.held) return; dt = Math.max(0, Math.min(dt, .1)); st.time += dt;
      if (st.play) { st.t += dt; if (st.t >= total(steps())) { st.t = total(steps()) - .001; setPlay(false); } }
      frame();
    };
  });

  /* ================= 3. read the shape ================= */
  // each Vek on a 5x5 board with something worth hitting. dir: 0 up, 1 right, 2 down, 3 left. Rules: weapons_enemy.lua unless named.
  const SHAPES = { near: 'Next to it', line: 'Down a line', lob: 'Lobbed', around: 'All around it', spawn: 'Leaves something behind' };
  const VEK = [
    { k: 'Hornet1', g: 'near', set: { v: [2, 2, 0], blds: [[2, 1]], mechs: [['PunchMech', 1, 3]] }, rule: 'Stabs the tile next to it for 1. No push.', src: 'weapons_enemy.lua:158-173' },
    { k: 'Scorpion1', g: 'near', set: { v: [2, 2, 3], mechs: [['PunchMech', 1, 2]], blds: [[3, 1]] }, rule: 'Webs the target at once, so it cannot move away, then stabs it for 1 after your turn. No push.', src: 'weapons_enemy.lua:54-91', two: 1 },
    { k: 'Leaper1', g: 'near', set: { v: [2, 2, 1], mechs: [['TankMech', 3, 2]], blds: [[1, 3]] }, rule: 'Leaps when it moves. Webs the target at once, then bites it for 3 after your turn.', src: 'weapons_enemy.lua:370-395', two: 1 },
    { k: 'Burrower1', g: 'near', set: { v: [2, 3, 0], blds: [[1, 2], [2, 2]], mechs: [['ArtiMech', 3, 2]] }, rule: 'Slams three tiles in a row in front of it for 1 each. No push. Cannot be pushed, and burrows after taking damage.', src: 'weapons_enemy.lua:115-140' },
    { k: 'Firefly1', g: 'line', set: { v: [4, 2, 3], blds: [[0, 2]], mtns: [[0, 0]] }, rule: 'Spits goo down a line. It hits the first thing in the way for 1, or the last tile if nothing is there. No push.', src: 'weapons_enemy.lua:423-462' },
    { k: 'Centipede1', g: 'line', set: { v: [4, 2, 3], blds: [[1, 2], [1, 1]], mechs: [['PunchMech', 1, 3]] }, rule: 'Spits goo down a line like the Firefly, but the hit spreads to both tiles beside it: 1 damage and A.C.I.D. on all three.', src: 'weapons_enemy.lua:312-362' },
    { k: 'Beetle1', g: 'line', set: { v: [4, 1, 3], mechs: [['TankMech', 0, 1]], blds: [[2, 3]] }, rule: 'Charges along the ground and stops in front of the first thing in its way, then hits it for 1 and pushes it. With nothing in the way it runs to the edge.', src: 'weapons_enemy.lua:490-560' },
    { k: 'Scarab1', g: 'lob', set: { v: [2, 4, 0, 3], blds: [[2, 1]], mtns: [[2, 2]] }, rule: 'Lobs a shot 2 to 5 tiles away in a straight line, over anything in between. 1 damage to one tile. No push.', src: 'weapons_enemy.lua:218-228, 252-286' },
    { k: 'Crab1', g: 'lob', set: { v: [2, 4, 0, 2], blds: [[2, 2], [2, 1]], mtns: [[2, 3]] }, rule: 'Lobs a shot 2 to 5 tiles away that hits the target and the tile beyond it, 1 damage each. No push.', src: 'weapons_enemy.lua:197-248' },
    { k: 'Digger1', g: 'around', set: { v: [2, 2], blds: [[2, 1]], mechs: [['PunchMech', 3, 2]] }, rule: 'Raises rock walls on the empty tiles around it at once, then hits all four neighbours for 1 after your turn, its own rocks included.', src: 'weapons_enemy.lua:580-622', two: 1 },
    { k: 'Starfish1', g: 'around', set: { v: [2, 2], blds: [[1, 1], [3, 3]], mechs: [['TankMech', 3, 1]] }, rule: 'Hits the four diagonal tiles around it for 1. No push.', src: 'advanced/ae_weapons_enemy.lua:19-53' },
    { k: 'Blobber1', g: 'spawn', set: { v: [2, 4, 0, 3], blds: [[1, 1], [3, 1]] }, rule: 'Throws a blob 2 to 8 tiles away onto an empty tile, at once. Next turn the blob bursts for 1 on the four tiles around it, unless you kill it first.', src: 'weapons_enemy.lua:628-754', two: 1 },
    { k: 'Spider1', g: 'spawn', set: { v: [0, 2, 1, 3], mechs: [['PunchMech', 3, 1]], blds: [[4, 2]] }, rule: 'Throws an egg 2 to 8 tiles away onto an empty tile, at once, and webs the four tiles around it. The egg hatches into a Spiderling next turn.', src: 'weapons_enemy.lua:758-860', two: 1 },
  ];
  const SH_LOOP = 5.2;
  function vekScene(v) {
    const [c, r, dir = 0, dist = 3] = v.set.v, units = { v: [v.k, c, r, null, dir, dist] };
    (v.set.mechs || []).forEach(([k, x, y], i) => { units['m' + i] = [k, x, y]; });
    return { n: 5, blds: v.set.blds, mtns: v.set.mtns, units };
  }
  function shapeScene(g, v, t, time, hidden) {
    const B = board(330, 150, 5), def = vekScene(v), S = scene(def), u = S.units.v, K = UNITS[v.k];
    g.clearRect(0, 0, 1000, 680); g.imageSmoothingEnabled = false; g.fillStyle = PAPER; rr(g, 0, 0, 1000, 680, 14); g.fill();
    const ph = t % SH_LOOP, show = hidden ? 0 : ph < .5 ? ph / .5 : ph < 4.6 ? 1 : 1 - (ph - 4.6) / .6;
    let T = telegraph(S, u);
    // instant setup lands with the telegraph: webs, rocks, a thrown blob or egg
    const setup = !hidden && ph > .5 && ph < 4.6;
    if (setup) {
      T.rocks.forEach(([x, y], i) => { S.units['rock' + i] = { id: 'rock' + i, kind: 'Wall', c: x, r: y, hp: 1, max: 1, alive: true, born: clamp((ph - .5) * 3) }; });
      if (T.spawn) S.units.spawned = { id: 'spawned', kind: T.spawn[2], c: T.spawn[0], r: T.spawn[1], hp: 1, max: 1, alive: true, born: clamp((ph - .5) * 3) };
      T.webs.forEach(([x, y]) => { const w = unitAt(S, x, y); if (w) w.web = true; });
    }
    drawGround(g, B, S);
    const attackK = clamp((ph - 2.8) / .8), resolved = !hidden && ph > 3.6 && ph < 4.6;
    if (show > 0 && !resolved) telTiles(g, B, S, T, show, time);
    const S2 = resolved ? clone(S) : S;
    // a spawner's hit comes a turn later: the blob bursts, the egg hatches
    const later = K.atk === 'spawn' ? (K.spawn === 'Blob1' ? T.after.map(([x, y]) => ({ c: x, r: y, dmg: 1 })) : []) : T.tiles;
    if (resolved) {
      later.forEach(tt => damage(S2, tt.c, tt.r, tt.dmg));
      if (K.atk === 'charge' && T.stop) { S2.units.v.c = T.stop[0]; S2.units.v.r = T.stop[1]; }
      if (S2.units.spawned) { if (K.spawn === 'Blob1') S2.units.spawned.alive = false; else S2.units.spawned.kind = 'Spiderling1'; }
    }
    if (!hidden && K.atk === 'charge' && ph > 2.8 && ph <= 3.6 && T.stop) { const p = ease(attackK); u.c = lerp(u.c, T.stop[0], p); u.r = lerp(u.r, T.stop[1], p); }
    drawObjects(g, B, S2, { time, hideSprite: null });
    if (show > 0 && !resolved) telTop(g, B, S, u, T, show);
    if (!hidden && ph > 2.8 && ph <= 3.6 && later[0]) {
      const k = attackK, fx = [];
      if (K.atk === 'proj') fx.push({ t: 'ball', from: [c0(u), r0(u)], to: [T.tiles[0].c, T.tiles[0].r], k, col: '#c6ff5a' });
      else if (K.atk === 'art' || K.atk === 'art2') fx.push({ t: 'arc', from: [c0(u), r0(u)], to: T.arc, k, col: '#c6ff5a' });
      else later.forEach(tt => fx.push({ t: 'lunge', to: [tt.c, tt.r], k }));
      drawFx(g, B, fx, time);
    }
    if (resolved) { const k = (ph - 3.6) / 1; drawFx(g, B, later.flatMap(tt => [{ t: 'boom', c: tt.c, r: tt.r, k }, { t: 'pop', c: tt.c, r: tt.r, k: k * .8, s: `-${tt.dmg}` }]), time); }
    // timeline under the board
    const stage = hidden ? 'Guess the shape' : ph < .5 ? 'Vek aims' : ph < 2.8 ? (v.two ? 'Setup lands now; the hit is telegraphed' : 'Telegraph: your turn to answer') : ph < 3.6 ? (K.atk === 'spawn' ? (K.spawn === 'Blob1' ? 'Next turn: the blob bursts' : 'Next turn: the egg hatches') : 'Vek attacks') : 'Result';
    text(g, stage.toUpperCase(), 330, 650, M(800, 15), hidden ? GOLD : '#c9d1d9', 'center');
    // the card
    const X = 640; g.fillStyle = 'rgba(255,255,255,.05)'; rr(g, X, 24, 340, 632, 12); g.fill();
    img(g, portrait(v.k), X + 18, 42, 122, 122);
    text(g, UNITS[v.k].name, X + 156, 74, M(800, 24), '#fff');
    text(g, `${K.hp} health`, X + 156, 102, F(600, 16), '#c9d1d9');
    const pill = hidden ? '? shape' : SHAPES[v.g]; g.font = M(800, 14); const pw = g.measureText(pill).width + 24;
    g.fillStyle = hidden ? '#4a525c' : GOLD; rr(g, X + 20, 178, pw, 30, 8); g.fill();
    text(g, pill, X + 20 + pw / 2, 199, M(800, 14), '#10161c', 'center');
    g.font = F(500, 18); g.fillStyle = hidden ? '#5d6670' : '#e6edf3'; g.textAlign = 'left';
    const yy = wrap(g, hidden ? 'The telegraph is hidden. From the creature alone, which shape does its attack take? Answer on the right.' : v.rule, X + 20, 246, 300, 25);
    if (!hidden) { g.font = F(500, 14); g.fillStyle = '#8b96a3'; wrap(g, `Source: ${v.src}`, X + 20, yy + 34, 300, 19); }
    if (!hidden && v.two) { g.font = F(600, 15); g.fillStyle = GOLD; wrap(g, 'Two parts: the setup happens as it aims, the hit after your turn.', X + 20, yy + 76, 300, 20); }
    // legend of what the screen shows
    const L = [['hit1', 'Attack tile and direction'], ['d1', 'Damage'], ['pdot', 'Projectile path'], ['adot', 'Lobbed over everything'], ['web', 'Webbed: cannot move']];
    text(g, 'WHAT THE SCREEN SHOWS', X + 20, 500, M(800, 12), '#8b96a3');
    L.forEach(([k, s], i) => { const y = 524 + i * 26; icon(g, IM[k], X + 34, y - 4, k === 'hit1' ? .7 : k === 'adot' ? 1.4 : 1.1); text(g, s, X + 62, y + 2, F(500, 15), '#c9d1d9'); });
  }
  const c0 = u => Math.round(u.c), r0 = u => Math.round(u.r);
  let shapeApi = null;
  canvasDemo('shapes', (sl, cv, g) => {
    const box = $(sl, '.sh-groups'), out = $(sl, '.sh-out'), qb = $(sl, '.sh-qbtns'), qz = $(sl, '.sh-quiz');
    box.innerHTML = Object.entries(SHAPES).map(([k, s]) => `<div class="vk-group"><b>${s}</b><div>${VEK.map((v, i) => v.g === k ? `<button class="vk" data-i="${i}" title="${UNITS[v.k].name}"><img src="img/portraits/${v.k}.png" alt="${UNITS[v.k].name}"></button>` : '').join('')}</div></div>`).join('');
    const st = { i: 0, t: 0, time: 0, held: false, quiz: false, score: [0, 0], answered: false, tour: true, tt: 0 };
    const pick = (i, manual) => { st.i = i; st.t = 0; if (manual) st.tour = false; $$(box, '.vk').forEach(b => b.classList.toggle('on', +b.dataset.i === i)); if (!st.quiz) say(out, `<b>${UNITS[VEK[i].k].name}: ${SHAPES[VEK[i].g].toLowerCase()}.</b> ${VEK[i].rule}`); };
    $$(box, '.vk').forEach(b => b.onclick = () => { if (st.quiz) return; pick(+b.dataset.i, true); });
    const ask = () => {
      st.answered = false; let i; do { i = Math.floor(Math.random() * VEK.length); } while (i === st.i && VEK.length > 1); pick(i);
      qb.innerHTML = Object.entries(SHAPES).map(([k, s]) => `<button class="btn" data-g="${k}">${s}</button>`).join('');
      $$(qb, '.btn').forEach(b => b.onclick = () => {
        if (st.answered) return; st.answered = true; const right = b.dataset.g === VEK[st.i].g; st.score[1]++; if (right) st.score[0]++;
        b.classList.add(right ? 'right' : 'wrong'); $$(qb, '.btn').forEach(x => { if (x.dataset.g === VEK[st.i].g) x.classList.add('right'); });
        say(out, `${right ? '<b>Right.</b>' : `<b>It is ${SHAPES[VEK[st.i].g].toLowerCase()}.</b>`} ${UNITS[VEK[st.i].k].name}: ${VEK[st.i].rule} <br><b>${st.score[0]} of ${st.score[1]}</b> so far. <a href="#" class="sh-again">Another Vek</a>`);
        st.t = 0; const a = $(out, '.sh-again'); if (a) a.onclick = e => { e.preventDefault(); ask(); };
      });
      say(out, 'The telegraph is hidden. Which shape does this Vek’s attack take?');
    };
    qz.onclick = () => {
      st.quiz = !st.quiz; st.tour = false; qz.classList.toggle('on', st.quiz); qz.textContent = st.quiz ? 'Back to the list' : 'Quiz: hide the telegraph';
      box.style.display = st.quiz ? 'none' : ''; $(sl, '.sh-pick').style.display = st.quiz ? 'none' : '';
      if (st.quiz) { st.score = [0, 0]; ask(); } else { qb.innerHTML = ''; pick(st.i, true); }
    };
    pick(0);
    shapeApi = { dur: () => VEK.length * SH_LOOP, seek(t) { st.held = true; const i = Math.min(VEK.length - 1, Math.floor(t / SH_LOOP)); if (i !== st.i) pick(i); shapeScene(g, VEK[i], t - i * SH_LOOP, t, false); } };
    return dt => {
      if (st.held) return; dt = Math.max(0, Math.min(dt, .1)); st.time += dt; st.t += dt;
      if (st.tour && st.t >= SH_LOOP) pick((st.i + 1) % VEK.length);
      shapeScene(g, VEK[st.i], st.quiz && !st.answered ? 0 : st.t, st.time, st.quiz && !st.answered);
    };
  });

  /* ================= 4. one telegraph, many answers ================= */
  const ANS_SCENE = { n: 5, map: [], blds: [[0, 1]], mtns: [[1, 0]], grid: 5, units: { F: ['Firefly1', 3, 1, null, 3, 0, 1], H: ['Scorpion1', 1, 2, null, 1, 0, 0], P: ['PunchMech', 1, 3], T: ['TankMech', 4, 3] } };
  const fire = { ph: 2, dur: 2.8, acts: vekAct(.1, .9, 'F') };
  const ANSWERS = {
    none: { label: 'Do nothing (baseline)', verdict: 'Building lost', cost: 'No cost, one grid power lost.', saved: false,
      steps: [{ ph: 1, dur: 2.2, cap: 'Leave it. The telegraph already says what happens next.', acts: [] }, { ...fire, cap: 'The goo flies down the row and hits the building.' }] },
    block: { label: 'Stand in the line', verdict: 'Building stands', cost: 'The Combat Mech takes 1 damage.', saved: true,
      steps: [{ ph: 1, dur: 3, cap: 'Combat Mech walks into the Firefly’s row. The telegraph now ends on the Mech, not the building.', acts: [moveAct(0, .7, 'P', [[1, 3], [2, 3], [2, 2], [2, 1]])] }, { ...fire, cap: 'The goo hits the first thing in the line: the Mech, for 1.' }] },
    feed: { label: 'Push a Vek into the line', verdict: 'Building stands', cost: 'No Mech is hurt, and the Scorpion dies.', saved: true,
      steps: [{ ph: 1, dur: 4, cap: 'Combat Mech punches a Scorpion up into the Firefly’s row. The telegraph now ends on the Scorpion.', acts: [aimAct(0, .35, [[1, 2]], [[1, 2, 0]]), ...mechShot(.35, .9, 'punch', [1, 3], 0)] }, { ...fire, cap: 'The Firefly hits its own ally. The punch already cost the Scorpion 2 of its 3 health, so the goo finishes it.' }] },
    off: { label: 'Push it off its row', verdict: 'Building stands', cost: 'No Mech is hurt; the Firefly takes 1.', saved: true,
      steps: [{ ph: 1, dur: 4, cap: 'Cannon Mech shoots the Firefly from below. The push moves it up one row, and its line now ends at a mountain.', acts: [moveAct(0, .25, 'T', [[4, 3], [3, 3]]), aimAct(.25, .5, [[3, 1]], [[3, 1, 0]]), ...mechShot(.5, .92, 'proj', [3, 3], 0)] }, { ...fire, cap: 'The goo hits the mountain. Nothing else is touched.' }] },
    along: { label: 'Push it along its row', verdict: 'Building lost', cost: 'The Firefly takes 1, but the building still falls.', saved: false,
      steps: [{ ph: 1, dur: 4, cap: 'Cannon Mech shoots the Firefly from the side. The push slides it along its own firing row, so the telegraph still ends on the building.', acts: [moveAct(0, .3, 'T', [[4, 3], [4, 2], [4, 1]]), aimAct(.3, .5, [[3, 1]], [[3, 1, 3]]), ...mechShot(.5, .92, 'proj', [4, 1], 3)] }, { ...fire, cap: 'Closer, same row, same target: the building falls. Reading the rule shows why this push does not help.' }] },
    kill: { label: 'Kill it', verdict: 'Building stands', cost: 'Takes both Mechs’ turns.', saved: true,
      steps: [{ ph: 1, dur: 4, cap: 'Combat Mech steps under the Firefly and punches it for 2, pushing it up a row.', acts: [moveAct(0, .3, 'P', [[1, 3], [2, 3], [3, 3], [3, 2]]), aimAct(.3, .5, [[3, 1]], [[3, 1, 0]]), ...mechShot(.5, .92, 'punch', [3, 2], 0)] },
        { ph: 1, dur: 4, cap: 'Cannon Mech walks to the top row and shoots it for the last 1 health.', acts: [moveAct(0, .35, 'T', [[4, 3], [4, 2], [4, 1], [4, 0]]), aimAct(.35, .55, [[3, 0]], []), ...mechShot(.55, .92, 'proj', [4, 0], 3)] },
        { ...fire, cap: 'The Firefly is dead, so its attack never happens.' }] },
  };
  const AKEYS = Object.keys(ANSWERS);
  ANSWERS.none.steps.unshift({ ph: 0, dur: 2.6, cap: 'The Firefly aims down its row. Its goo will hit the first thing in the line: right now, the building at the end.', acts: [flag('aim')] });
  AKEYS.slice(1).forEach(k => ANSWERS[k].steps.unshift({ ph: 0, dur: 1.4, cap: 'The Firefly aims down its row at the building.', acts: [flag('aim')] }));
  function answerScene(g, key, t, time) {
    const A = ANSWERS[key], R = run(ANS_SCENE, A.steps, t), S = R.S, B = board(330, 150, 5);
    g.clearRect(0, 0, 1000, 680); g.imageSmoothingEnabled = false; g.fillStyle = PAPER; rr(g, 0, 0, 1000, 680, 14); g.fill();
    drawGround(g, B, S);
    const vek = Object.values(S.units).filter(u => u.alive && u.order && !u.acted), tels = S.flags.aim ? vek.map(u => [u, telegraph(S, u)]) : [];
    tels.forEach(([u, T]) => telTiles(g, B, S, T, 1, time));
    drawObjects(g, B, S, { time });
    tels.forEach(([u, T]) => telTop(g, B, S, u, T, 1, { order: 1 }));
    drawFx(g, B, R.fx, time);
    const X = 640; g.fillStyle = 'rgba(255,255,255,.05)'; rr(g, X, 24, 340, 632, 12); g.fill();
    text(g, 'ANSWER', X + 20, 58, M(800, 13), '#8b96a3');
    text(g, A.label, X + 20, 88, M(800, 22), '#fff');
    const done = R.i === A.steps.length - 1 && R.u > .7;
    const F1 = S.units.F, line = F1.alive && !F1.acted ? describe(S, F1) : null;
    text(g, 'THE FIREFLY’S TELEGRAPH NOW', X + 20, 136, M(800, 12), '#8b96a3');
    g.font = F(600, 19); g.fillStyle = line ? (/building/.test(line) ? HURT : '#7ee05a') : '#9fb0bf'; g.textAlign = 'left';
    wrap(g, line ? line[0].toUpperCase() + line.slice(1) + '.' : F1.alive ? `It ${S.log.vF ? 'hit ' + S.log.vF : 'fired'}.` : 'Dead: no attack.', X + 20, 164, 300, 24);
    gridBar(g, X + 20, 230, S);
    if (done) {
      g.fillStyle = A.saved ? 'rgba(126,224,90,.15)' : 'rgba(255,106,61,.15)'; rr(g, X + 14, 300, 312, 130, 10); g.fill();
      text(g, A.verdict.toUpperCase(), X + 30, 334, M(800, 18), A.saved ? '#7ee05a' : HURT);
      g.font = F(500, 17); g.fillStyle = '#e6edf3'; wrap(g, A.cost, X + 30, 364, 280, 22);
    }
    text(g, 'ALL FIVE, PLUS DOING NOTHING', X + 20, 474, M(800, 12), '#8b96a3');
    AKEYS.forEach((k, i) => { const y = 500 + i * 25, a = ANSWERS[k]; text(g, (a.saved ? '✓ ' : '✗ ') + a.label, X + 20, y, F(k === key ? 700 : 500, 15), k === key ? GOLD : a.saved ? '#9fe08a' : '#ff9a7d'); });
    return R;
  }
  let ansApi = null;
  canvasDemo('answers', (sl, cv, g) => {
    const box = $(sl, '.an-btns'), out = $(sl, '.an-out'), tourBtn = $(sl, '.an-tour');
    box.innerHTML = AKEYS.map(k => `<button class="btn" data-k="${k}">${ANSWERS[k].label}</button>`).join('');
    const st = { key: 'none', t: 0, time: 0, tour: true, held: false, last: '' };
    const pick = (k, manual) => { st.key = k; st.t = 0; if (manual) { st.tour = false; tourBtn.classList.remove('on'); } $$(box, '.btn').forEach(b => b.classList.toggle('on', b.dataset.k === k)); };
    $$(box, '.btn').forEach(b => b.onclick = () => pick(b.dataset.k, true));
    $(sl, '.an-play').onclick = () => { st.t = 0; };
    tourBtn.onclick = () => { st.tour = true; tourBtn.classList.add('on'); pick('none'); };
    const LEN = k => total(ANSWERS[k].steps) + 2;
    function frame() {
      const R = answerScene(g, st.key, st.t, st.time), html = `<b>${ANSWERS[st.key].label}.</b> ${R.step.cap}`;
      if (html !== st.last) { say(out, html); st.last = html; }
    }
    pick('none');
    ansApi = { dur: () => AKEYS.reduce((a, k) => a + LEN(k), 0), seek(t) { st.held = true; let k = AKEYS[0]; for (const kk of AKEYS) { if (t < LEN(kk)) { k = kk; break; } t -= LEN(kk); } if (k !== st.key) pick(k); st.t = t; st.time = t; frame(); } };
    return dt => {
      if (st.held) return; dt = Math.max(0, Math.min(dt, .1)); st.time += dt; st.t += dt;
      if (st.t > LEN(st.key)) { if (st.tour) pick(AKEYS[(AKEYS.indexOf(st.key) + 1) % AKEYS.length]); else st.t = LEN(st.key); }
      frame();
    };
  });

  // GIF hooks: which = 'both' | 'shown' | 'hidden' (the turn), 'shapes', 'answers'
  window.__seek = (t, w = 'both') => w === 'shapes' ? shapeApi.seek(t) : w === 'answers' ? ansApi.seek(t) : turnApi.seek(t, w);
  window.__dur = (w = 'both') => w === 'shapes' ? shapeApi.dur() : w === 'answers' ? ansApi.dur() : turnApi.dur(w);
})();
