/* Write a Ghost (replanned page for "Pathfinding in Pac-Man"; Scripture: Memorable Enemies, Purposeful Enemy Design).
   The learner builds one ghost's target rule from parts and plays three lives against it and Blinky. Blinky and the shared
   step rule are the documented arcade behaviour (The Pac-Man Dossier); the maze is our own. Every row in the table is a
   round the learner played; the walk-through's rows are a scripted Pac-Man that runs from the nearest ghost. */
(function () {
  const C = TD.C, TAU = TD.TAU;
  const HALF = ['############', '#.....#.....', '#.###.#.###.', '#.###.#.###.', '#...........', '#.###.#####.', '#.....#.....', '#####.#.###.', '#####.#.#...',
    '#####.#.#.##', '#.......#...', '#.###.#####.', '#...#.......', '###.#.#.###.', '#.....#...#.', '#.#######.#.', '#...........', '############'];
  const MAP = HALF.map(r => r + r.slice(0, -1).split('').reverse().join(''));
  const MW = MAP[0].length, MH = MAP.length, TS = 29, OX = 22, OY = 44;
  const open = (x, y) => y >= 0 && y < MH && x >= 0 && x < MW && MAP[y][x] === '.';
  const DIRS = [[0, -1], [-1, 0], [0, 1], [1, 0]];
  const px = x => OX + (x + .5) * TS, py = y => OY + (y + .5) * TS;
  const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
  const PAC0 = [11, 16], B0 = [11, 8], G0 = [10, 10], CORNER = [0, MH], LIVES = 3, LIMIT = 45;
  const DOTS = MAP.join('').split('').filter(c => c === '.').length - 1;
  const rounds = [];
  const SCHED = [{ n: 0, d: 0, m: false, b: false }, { n: 4, d: 0, m: false, b: true }, { n: 4, d: 0, m: false, b: false }], SEG = 16;
  const say = o => (o.b ? 'shortest path to ' : 'aims ') + (o.n ? `${o.n} ahead` : (o.b ? 'Pac-Man' : 'at Pac-Man')) + (o.m ? ', mirrored' : '') + (o.d ? `, shy within ${o.d}` : '');

  const choices = (x, y, dir) => { const back = (dir + 2) % 4; const c = [0, 1, 2, 3].filter(k => k !== back && open(x + DIRS[k][0], y + DIRS[k][1])); return c.length ? c : [back]; };
  function choose(x, y, dir, t) { let best = -1, bd = 1e9; choices(x, y, dir).forEach(k => { const d = d2([x + DIRS[k][0], y + DIRS[k][1]], t); if (d < bd - 1e-9) { bd = d; best = k; } }); return best; }
  // true shortest path: the first step of a breadth-first search to the nearest open tile to the target
  function bfs(x, y, t) {
    const seen = new Map([[x + ',' + y, -1]]), q = [[x, y, -1]]; let best = -1, bd = d2([x, y], t);
    for (let i = 0; i < q.length; i++) {
      const [cx, cy, first] = q[i];
      DIRS.forEach((d, k) => { const nx = cx + d[0], ny = cy + d[1], key = nx + ',' + ny; if (!open(nx, ny) || seen.has(key)) return; const f = first < 0 ? k : first; seen.set(key, f); q.push([nx, ny, f]); const dd = d2([nx, ny], t); if (dd < bd) { bd = dd; best = f; } });
    }
    return best;
  }
  function move(e, dt, pick) { e.p += e.sp * dt; while (e.p >= 1) { e.x += DIRS[e.dir][0]; e.y += DIRS[e.dir][1]; e.p -= 1; e.dir = pick(e); if (e.dir < 0) { e.p = 0; break; } } }
  const posOf = e => e.dir < 0 ? [e.x, e.y] : [e.x + DIRS[e.dir][0] * e.p, e.y + DIRS[e.dir][1] * e.p];
  const ahead = (pac, n) => { const d = DIRS[pac.dir < 0 ? pac.want : pac.dir]; return [pac.x + d[0] * n, pac.y + d[1] * n]; };
  function target(st, o) {
    const pac = st.pac, me = st.gs[1], b = st.gs[0];
    if (o.d && d2([me.x, me.y], [pac.x, pac.y]) <= o.d * o.d) return CORNER;
    let a = ahead(pac, o.n); if (o.m) a = [2 * a[0] - b.x, 2 * a[1] - b.y];
    return a;
  }
  function place(st) {
    st.pac = { x: PAC0[0], y: PAC0[1], dir: 1, p: 0, want: 1, sp: 6.5 };
    st.gs = [{ x: B0[0], y: B0[1], dir: 1, p: 0, sp: 6, col: '#e5322d', t: [0, 0] }, { x: G0[0], y: G0[1], dir: 1, p: 0, sp: 6, col: '#8a4fd6', t: [0, 0] }];
    st.hold = .7;
  }
  function begin(st, o) { Object.assign(st, { o, rt: 0, lives: LIVES, dots: new Set(), deaths: [], near: 0, ticks: 0, over: false }); place(st); }
  function finish(st) {
    const r = { o: st.o, rule: say(st.o), dots: st.dots.size, time: st.rt, lost: LIVES - st.lives, near: st.ticks ? st.near / st.ticks : 0, mine: st.deaths.filter(d => d.by === 1).length, deaths: st.deaths.slice() };
    st.result = r; (st.live ? rounds : st.rows).push(r);
  }

  PLAY.game('ghost', {
    dur: SEG * 3, keys: ['w', 'a', 's', 'd', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', ' '],
    opts: s => ({ n: +s.querySelector('.wg-n').value, d: +s.querySelector('.wg-d').value, m: s.querySelector('.wg-m').checked, b: s.querySelector('.wg-b').checked }),
    setup(s, api) {
      const show = () => { s.querySelector('.wg-nv').textContent = s.querySelector('.wg-n').value + ' tiles'; s.querySelector('.wg-dv').textContent = +s.querySelector('.wg-d').value ? s.querySelector('.wg-d').value + ' tiles' : 'never'; };
      s.querySelectorAll('.wg-n, .wg-d, .wg-m, .wg-b').forEach(e => e.oninput = () => { show(); api.start(); }); show();
    },
    init(o, live) {
      const st = { live, t: 0, ready: live, rows: [], seg: 0, R: GK.rng(7) };
      begin(st, live ? o : SCHED[0]); return st;
    },
    step(st, inp, dt) {
      if (st.ready) { if (Object.keys(inp.press).length || inp.click) st.ready = false; return; }
      st.t += dt;
      if (!st.live && Math.floor(st.t / SEG) !== st.seg && st.seg < 2) { finish(st); st.seg++; begin(st, SCHED[st.seg]); }
      if (st.over) { if (st.live && (inp.press[' '] || inp.click)) begin(st, st.o); return; }
      if (st.hold > 0) { st.hold -= dt; return; }
      st.rt += dt;
      const pac = st.pac, o = st.o;
      if (st.live) {
        const D = inp.down, k = D.w || D.ArrowUp ? 0 : D.a || D.ArrowLeft ? 1 : D.s || D.ArrowDown ? 2 : D.d || D.ArrowRight ? 3 : -1;
        if (k >= 0) pac.want = k;
        if (pac.dir >= 0 && pac.want === (pac.dir + 2) % 4) { pac.x += DIRS[pac.dir][0]; pac.y += DIRS[pac.dir][1]; pac.p = 1 - pac.p; pac.dir = pac.want; }
      }
      const pick = e => {
        if (!st.live) { let best = -1, bs = -1e9; choices(e.x, e.y, e.dir).forEach(k => { const n = [e.x + DIRS[k][0], e.y + DIRS[k][1]], sc = Math.min(...st.gs.map(g => d2(n, [g.x, g.y]))) + st.R() * 5 + (st.dots.has(n[0] + ',' + n[1]) ? 0 : 4); if (sc > bs) { bs = sc; best = k; } }); return best; }
        if (open(e.x + DIRS[e.want][0], e.y + DIRS[e.want][1])) return e.want;
        return open(e.x + DIRS[e.dir][0], e.y + DIRS[e.dir][1]) ? e.dir : -1;
      };
      if (pac.dir < 0) { if (open(pac.x + DIRS[pac.want][0], pac.y + DIRS[pac.want][1])) pac.dir = pac.want; } else move(pac, dt, pick);
      st.dots.add(pac.x + ',' + pac.y);
      const b = st.gs[0], me = st.gs[1];
      b.t = [pac.x, pac.y]; move(b, dt, e => choose(e.x, e.y, e.dir, [pac.x, pac.y]));
      me.t = target(st, o); move(me, dt, e => { const t = target(st, o); return o.b ? bfs(e.x, e.y, t) : choose(e.x, e.y, e.dir, t); });
      if (me.dir < 0) me.dir = o.b ? bfs(me.x, me.y, me.t) : choose(me.x, me.y, 0, me.t);
      st.ticks++; if (d2(posOf(b), posOf(me)) <= 9) st.near++;
      const pp = posOf(pac), by = st.gs.findIndex(g => d2(posOf(g), pp) < .36);
      if (by >= 0) { st.deaths.push({ x: pp[0], y: pp[1], by, t: st.t }); st.lives--; if (st.live) PLAY.beep(160, .25, .2, 'sawtooth'); place(st); }
      if (st.live && (st.lives <= 0 || st.rt >= LIMIT || st.dots.size >= DOTS)) { st.over = true; finish(st); }
    },
    bot() { return null; },
    draw(g, st, ui, live) {
      GK.panel(g);
      const o = st.o;
      GK.head(g, 'Purple: ' + say(o), OX, 30, 'left', C.ink, 17);
      g.fillStyle = '#2b3aa8'; g.beginPath(); g.roundRect(OX, OY, MW * TS, MH * TS, 8); g.fill();
      g.fillStyle = '#10163a'; for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (open(x, y)) g.fillRect(OX + x * TS - .5, OY + y * TS - .5, TS + 1, TS + 1);
      g.fillStyle = '#f5d9a8'; for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (open(x, y) && !st.dots.has(x + ',' + y)) { g.beginPath(); g.arc(px(x), py(y), 3, 0, TAU); g.fill(); }
      const cross = (x, y, col, s = 7, w = 3) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(x - s, y - s); g.lineTo(x + s, y + s); g.moveTo(x + s, y - s); g.lineTo(x - s, y + s); g.stroke(); };
      st.deaths.forEach(d => { g.fillStyle = 'rgba(255,255,255,.14)'; g.beginPath(); g.arc(px(d.x), py(d.y), 15, 0, TAU); g.fill(); cross(px(d.x), py(d.y), st.gs[d.by].col, 8, 4); });
      g.save(); g.beginPath(); g.rect(OX, OY, MW * TS, MH * TS); g.clip();
      st.gs.forEach(gh => { const [gx, gy] = posOf(gh); g.setLineDash([5, 6]); g.strokeStyle = gh.col; g.lineWidth = 2; g.beginPath(); g.moveTo(px(gx), py(gy)); g.lineTo(px(gh.t[0]), py(gh.t[1])); g.stroke(); g.setLineDash([]); cross(px(gh.t[0]), py(gh.t[1]), gh.col); });
      g.restore();
      st.gs.forEach(gh => {
        const [gx, gy] = posOf(gh), x = px(gx), y = py(gy), r = 11; g.fillStyle = gh.col;
        g.beginPath(); g.arc(x, y - 2, r, Math.PI, 0); g.lineTo(x + r, y + r); for (let i = 0; i < 4; i++) g.lineTo(x + r - (i + .5) * r / 2, y + r - (i % 2 ? 0 : 5)); g.lineTo(x - r, y + r); g.closePath(); g.fill();
        [-4, 4].forEach(ex => { g.fillStyle = '#fff'; g.beginPath(); g.arc(x + ex, y - 3, 3.5, 0, TAU); g.fill(); });
      });
      const pp = posOf(st.pac), pd = st.pac.dir < 0 ? st.pac.want : st.pac.dir, ang = [-Math.PI / 2, Math.PI, Math.PI / 2, 0][pd], mo = .25 + .2 * Math.sin(st.t * 18);
      g.fillStyle = '#ffd23f'; g.beginPath(); g.moveTo(px(pp[0]), py(pp[1])); g.arc(px(pp[0]), py(pp[1]), 11, ang + mo, ang + TAU - mo); g.closePath(); g.fill();
      if (st.ready) TD.stamp('Press W A S D to start', OX + MW * TS / 2, OY + 150, '#fff', 1, 22);
      if (st.over && live) TD.stamp('Round over. Change the rule, or Space to replay it', OX + MW * TS / 2, OY + 150, '#fff', 1, 18);
      // right column: this round, then the rounds played
      const RX = OX + MW * TS + 22, RW = 1024 - RX;
      GK.text(g, 'This round', RX, 58, C.muted, 12, 'left', 700);
      for (let i = 0; i < LIVES; i++) { g.fillStyle = i < st.lives ? '#ffd23f' : '#e3d8bf'; g.beginPath(); g.moveTo(RX + 12 + i * 30, 82); g.arc(RX + 12 + i * 30, 82, 11, .5, TAU - .5); g.closePath(); g.fill(); }
      GK.text(g, `${st.dots.size} / ${DOTS} dots`, RX + 110, 87, C.ink, 15, 'left', 700);
      PLAY.bar(g, RX, 104, RW, 10, st.rt / (live ? LIMIT : SEG), C.blue); GK.text(g, `${Math.floor(st.rt)} s of ${live ? LIMIT : SEG}`, RX + RW, 130, C.muted, 11, 'right', 600);
      GK.text(g, 'the two ghosts within 3 tiles of each other', RX, 152, C.muted, 11, 'left', 700);
      const near = st.ticks ? st.near / st.ticks : 0; PLAY.bar(g, RX, 160, RW - 50, 10, near, near > .5 ? C.redDk : C.purple); GK.text(g, PLAY.pct(near), RX + RW, 170, C.ink, 14, 'right', 700);
      GK.head(g, live ? 'Your rounds' : 'A scripted Pac-Man\'s rounds', RX, 214, 'left', C.ink, 15);
      const cols = [RX, RX + 150, RX + 196, RX + 244];
      ['rule', 'dots', 'caught', 'together'].forEach((h, i) => GK.text(g, h, cols[i], 236, C.muted, 11, 'left', 700));
      const list = (live ? rounds : st.rows).slice(-7);
      list.forEach((r, i) => {
        const y = 260 + i * 40;
        GK.wrap(g, r.rule, cols[0], y - 6, 142, 13, C.ink, 11, 600);
        GK.text(g, String(r.dots), cols[1], y, C.ink, 14, 'left', 700);
        GK.text(g, String(r.lost), cols[2], y, r.lost >= LIVES ? C.redDk : C.ink, 14, 'left', 700);
        GK.text(g, PLAY.pct(r.near), cols[3], y, r.near > .5 ? C.redDk : C.ink, 14, 'left', 700);
        GK.text(g, `${Math.round(r.time)} s · ${r.mine} to purple`, cols[1], y + 15, C.muted, 10, 'left', 600);
      });
      if (!list.length) PLAY.note(g, live ? 'Finish a round to log it, then change one part of the rule and play again.' : 'Three designs, sixteen seconds each.', RX, 262, RW);
      // side panel
      ui.stats(`<div class="g"><b>${st.dots.size}</b><span>dots eaten this round</span></div><div class="r"><b>${LIVES - st.lives}</b><span>lives lost, ${st.deaths.filter(d => d.by === 1).length} to your ghost</span></div><div><b>${PLAY.pct(near)}</b><span>of the time both ghosts ran together</span></div>`);
      const r = st.result;
      ui.out(!live ? ['Aimed at Pac-Man\u2019s tile, purple copies Blinky\u2019s rule. Watch how much of the round the two spend together: that share is one threat drawn twice.', 'With the true shortest path it never takes a wrong turn, so nothing about it can be baited. A scripted Pac-Man that only runs away is a weak test of that: play this one yourself.', 'Aimed four tiles ahead, it heads for where Pac-Man is going. That is Pinky\u2019s rule: short enough to read, and to fool by turning toward it.'][st.seg]
        : !st.over ? 'Eat dots, stay alive. Watch the purple cross: that is where your ghost is heading, and the rule you wrote decides it.'
        : r.near > .5 ? `Your ghost spent ${PLAY.pct(r.near)} of the round within three tiles of Blinky. Two ghosts in one line are one threat: this rule added a sprite and no new problem.`
        : r.lost >= LIVES && r.time < 20 ? `Three lives gone in ${Math.round(r.time)} seconds, ${r.mine} to your ghost. If you could not tell what it would do next, there was nothing to learn in that time.`
        : r.lost === 0 ? `No lives lost and ${r.dots} dots. Either you read this ghost completely or it stayed out of the way: try making it a threat you still understand.`
        : `${r.dots} dots for ${r.lost} ${r.lost > 1 ? 'lives' : 'life'}, with the ghosts apart ${PLAY.pct(1 - r.near)} of the time. A second ghost earns its place when it covers ground Blinky does not, by a rule you can say in one line.`);
    },
  });
})();
