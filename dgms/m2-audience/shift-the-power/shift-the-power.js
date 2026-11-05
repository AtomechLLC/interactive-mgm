/* Shift the power (DGMS Module 2 "Audience Demographics", deck slides 174-178, folding in 88-89 and 183).
   shift:    a champion kit as power blocks in two piles: reliable elements (auto attacks, stats) and niche elements
             (animation cancel, sequenced combo). Win rate against player skill: reliable power counts for everyone,
             niche power only counts as far as a player can execute it, exec(p) = p^EXEC. The left end of the curve is
             the floor (Iron), the right end the ceiling (Challenger). Slide 176's four ways are the four action buttons.
   elements: slides 88-89's floor elements (WoW auto attacks, button mashing, LoL passive gold) and ceiling elements
             (LoL animation cancelling, StarCraft II Chrono Boost, Street Fighter III parries) added to an average kit.
   review:   slide 183's rule of thumb: at or under 55% win rate is "close enough for now", over 60% is up for review.
   Numbers: 55% and 60% are the deck's. Everything else (power points, presets, leverage, exec curve, patch win rates)
   is illustrative, chosen so the presets tell the notes' story: Aphelios (power in niche, low floor, high ceiling),
   pre-rework Master Yi (power in reliable, a floor that crushes low ranks), post-rework Master Yi (closer to even).
   Images: LoL portraits from Riot Data Dragon (ddragon.leagueoflegends.com, 14.1.1); WoW icon inv_sword_04 from
   wow.zamimg.com; game-icons.net (CC BY 3.0): gamepad and two-coins by Delapouite, stopwatch and sword-clash by Lorc. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;
  const W = 1040, H = 585;

  /* ---------- the tunable table ---------- */
  const EXEC = 2;              // exec(p) = p^EXEC: share of niche power a player of skill p (0..1) can use
  const LEVER = 1.4;           // a point of niche power, fully executed, is worth this many reliable points
  const AVG = { R: 65, N: 35 };// the average champion everyone is measured against (50% at every rank)
  const WR_PER_POINT = .35;    // win-rate points per point of effective power above the average champion
  const STEP = 15;             // power moved or added by one of slide 176's four ways
  const BLOCK = 5;             // power in one block
  const MAXP = 150;            // most power one pile can hold
  const PRESETS = {
    aph: { name: 'Aphelios', img: 'Aphelios.png', R: 25, N: 75,
           quote: 'Built for hardcore players: most of his power sits in a five-weapon rotation that few players run cleanly.' },
    yi0: { name: 'Master Yi, pre-rework', img: 'MasterYi.png', R: 88, N: 22,
           quote: 'Tuned for competitive play, he was nearly unstoppable by players in low rank: almost all of his power was reliable.' },
    yi1: { name: 'Master Yi, post-rework', img: 'MasterYi.png', R: 61, N: 41,
           quote: 'The leap moved to Q, the attack-speed skill became the ultimate on a long cooldown, and Meditate became interruptible.' },
  };
  const WAYS = {
    addN: { label: 'Put power in niche elements', eff: 'empowers hardcore players', f: s => ({ R: s.R, N: Math.min(MAXP, s.N + STEP) }) },
    addR: { label: 'Put power in reliable elements', eff: 'empowers everyone', f: s => ({ R: Math.min(MAXP, s.R + STEP), N: s.N }) },
    n2r:  { label: 'Move power from niche to reliable', eff: 'raises the floor', f: s => { const d = Math.min(STEP, s.N, MAXP - s.R); return { R: s.R + d, N: s.N - d }; } },
    r2n:  { label: 'Move power from reliable to niche', eff: 'raises the ceiling', f: s => { const d = Math.min(STEP, s.R, MAXP - s.N); return { R: s.R - d, N: s.N + d }; } },
  };
  const RANKS = ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Challenger'];
  const pOf = i => (i + .5) / RANKS.length;          // rank -> player skill 0..1
  const P_FLOOR = pOf(0), P_CEIL = pOf(RANKS.length - 1);
  // slides 88-89: example elements, added to the average kit
  const ELEMENTS = [
    { name: 'WoW auto attacks', kind: 'floor', img: 'inv_sword_04.jpg', pts: 8, cap: ['Swings on its own. Every player', 'gets the damage.'] },
    { name: 'Button mashing', kind: 'floor', img: 'gamepad.svg', pts: 8, cap: ['Fighting games pay out a little', 'for mashing, at any skill.'] },
    { name: 'LoL passive gold', kind: 'floor', img: 'coins.svg', pts: 8, cap: ['Gold ticks in for everyone,', 'whatever they do.'] },
    { name: 'LoL animation cancelling', kind: 'ceiling', img: 'Riven.png', pts: 8, cap: ['Arcane rules: cut an attack’s', 'end lag with the next action.'] },
    { name: 'StarCraft II Chrono Boost', kind: 'ceiling', img: 'stopwatch.svg', pts: 8, cap: ['Large amounts of attention:', 'spent on time, every base, mid-fight.'] },
    { name: 'Street Fighter III parries', kind: 'ceiling', img: 'sword-clash.svg', pts: 8, cap: ['Precise timing: tap forward in', 'a few-frame window.'] },
  ];
  // slide 183: win rates per patch (all ranks) and tilt (+ = stronger in low ranks than high ranks)
  const REVIEW = [
    { name: 'Master Yi', img: 'MasterYi.png', wr: [54, 56, 51, 50.5], tilt: [4.5, 4.5, 1.5, 1.5] },
    { name: 'Aphelios', img: 'Aphelios.png', wr: [48, 48.5, 49.5, 50], tilt: [-4, -4, -4, -3.5] },
    { name: 'Malphite', img: 'Malphite.png', wr: [52, 56, 60.5, 54.5], tilt: [1.5, 1.5, 1.5, 1] },
    { name: 'Annie', img: 'Annie.png', wr: [51.5, 52, 52.5, 51], tilt: [2, 2, 2, 2] },
    { name: 'Ashe', img: 'Ashe.png', wr: [50.5, 51, 50, 50.5], tilt: [1, 1, 1, 1] },
    { name: 'Jinx', img: 'Jinx.png', wr: [50, 50.5, 51, 51.5], tilt: [.5, .5, .5, .5] },
    { name: 'Lux', img: 'Lux.png', wr: [49.5, 50, 50.5, 50], tilt: [0, 0, 0, 0] },
    { name: 'Yasuo', img: 'Yasuo.png', wr: [48.5, 48, 49, 49.5], tilt: [-2, -2, -2, -2] },
    { name: 'Zed', img: 'Zed.png', wr: [49, 50, 49.5, 49], tilt: [-2.5, -2.5, -2.5, -2.5] },
  ];
  const OK_LINE = 55, REVIEW_LINE = 60;

  /* ---------- model ---------- */
  const exec = p => Math.pow(clamp(p), EXEC);
  const eff = (k, p) => k.R + LEVER * k.N * exec(p);
  const wr = (k, p) => clamp(50 + WR_PER_POINT * (eff(k, p) - eff(AVG, p)), 25, 75);
  const fmt = v => v.toFixed(1) + '%';

  const IMG = {};
  const img = f => { if (!IMG[f]) { IMG[f] = new Image(); IMG[f].src = '../img/shift-the-power/' + f; } return IMG[f]; };
  [...Object.values(PRESETS).map(p => p.img), ...ELEMENTS.map(e => e.img), ...REVIEW.map(r => r.img)].forEach(img);
  const txt = (g, s, x, y, font, col = C.ink, al = 'left') => { g.font = font; g.fillStyle = col; g.textAlign = al; g.textBaseline = 'middle'; g.fillText(s, x, y); };
  const panel = g => { g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(255,252,244,.85)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill(); };
  function wrap(g, s, maxW, font) {
    g.font = font; const out = []; let ln = '';
    s.split(' ').forEach(w => { const t = ln ? ln + ' ' + w : w; if (g.measureText(t).width > maxW && ln) { out.push(ln); ln = w; } else ln = t; });
    if (ln) out.push(ln); return out;
  }
  function portrait(g, f, x, y, r, col, sq) {
    const im = img(f);
    g.save(); g.beginPath(); sq ? g.roundRect(x - r, y - r, 2 * r, 2 * r, 8) : g.arc(x, y, r, 0, 7); g.closePath();
    g.fillStyle = col; g.fill(); g.clip();
    if (im.complete && im.naturalWidth) { const pad = /\.svg$/.test(f) ? r * .28 : 0; g.drawImage(im, x - r + pad, y - r + pad, 2 * (r - pad), 2 * (r - pad)); }
    g.restore();
    g.strokeStyle = col; g.lineWidth = 3.5; g.beginPath(); sq ? g.roundRect(x - r, y - r, 2 * r, 2 * r, 8) : g.arc(x, y, r, 0, 7); g.stroke();
  }
  // win rate against player skill, ranks on the x axis
  function wrChart(g, box, curves, o = {}) {
    const { x0, x1, y0, y1, lo = 30, hi = 70 } = box;
    const xOf = p => x0 + (x1 - x0) * p, yOf = v => y1 - (y1 - y0) * (v - lo) / (hi - lo);
    g.strokeStyle = '#e3d8bf'; g.lineWidth = 1;
    for (let v = lo; v <= hi; v += 10) { g.beginPath(); g.moveTo(x0, yOf(v)); g.lineTo(x1, yOf(v)); g.stroke(); txt(g, v + '%', x0 - 8, yOf(v), '600 13px Jost, sans-serif', C.muted, 'right'); }
    g.setLineDash([3, 5]); g.strokeStyle = C.muted; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x0, yOf(50)); g.lineTo(x1, yOf(50)); g.stroke(); g.setLineDash([]);
    g.strokeStyle = C.ink; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x0, y0 - 4); g.lineTo(x0, y1); g.lineTo(x1 + 4, y1); g.stroke();
    RANKS.forEach((r, i) => txt(g, r, xOf(pOf(i)), y1 + 14, '600 13px Jost, sans-serif', C.muted, 'center'));
    g.save(); g.translate(x0 - 48, (y0 + y1) / 2); g.rotate(-Math.PI / 2); txt(g, 'win rate', 0, 0, '800 14px Montserrat, Jost, sans-serif', C.ink, 'center'); g.restore();
    txt(g, 'player skill (rank)', x1, y1 + 32, '700 13px Montserrat, Jost, sans-serif', C.ink, 'right');
    curves.forEach(c => {
      g.save(); g.globalAlpha = c.a ?? 1; g.strokeStyle = c.col; g.lineWidth = c.w || 5; g.lineCap = 'round'; if (c.dash) g.setLineDash(c.dash);
      g.beginPath(); for (let i = 0; i <= 80; i++) { const p = P_FLOOR + (P_CEIL - P_FLOOR) * i / 80, y = yOf(c.f(p)); i ? g.lineTo(xOf(p), y) : g.moveTo(xOf(p), y); } g.stroke(); g.restore();
    });
    const main = curves.find(c => c.main);
    if (main) {
      const fy = yOf(main.f(P_FLOOR)), cy = yOf(main.f(P_CEIL));
      [[P_FLOOR, fy, 'floor', 'left'], [P_CEIL, cy, 'ceiling', 'right']].forEach(([p, y, l, al]) => {
        g.fillStyle = '#fff'; g.strokeStyle = main.col; g.lineWidth = 3.5; g.beginPath(); g.arc(xOf(p), y, 8, 0, 7); g.fill(); g.stroke();
        T.label(`${l} ${fmt(main.f(p))}`, xOf(p) + (al === 'left' ? 4 : -4), y + (y < yOf(55) ? 22 : -22), al, main.col, 14);
      });
    }
    return { xOf, yOf };
  }
  const apis = {};

  /* ---------- 1: shift the power ---------- */
  canvasDemo('shift', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, pre: 'aph', R: 25, N: 75, dR: 25, dN: 75, gR: null, gN: null, way: null, wayT: 0, drag: null, key: '' };
    const tourBtn = $(s, '.sp-tour'), nIn = $(s, '.sp-n');
    const free = () => { st.tour = false; tourBtn.classList.remove('on'); };
    const setK = (k, keepGhost) => { if (!keepGhost) { st.gR = st.R; st.gN = st.N; } st.R = k.R; st.N = k.N; };
    $$(s, '.sp-pre .btn').forEach(b => b.onclick = () => { free(); st.pre = b.dataset.k; st.way = null; setK(PRESETS[st.pre]); });
    $$(s, '.sp-ways .btn').forEach(b => b.onclick = () => { free(); st.pre = null; st.way = b.dataset.w; st.wayT = 0; setK(WAYS[st.way].f(st)); });
    nIn.oninput = () => { free(); st.pre = null; st.way = null; const tot = st.R + st.N, n = Math.round(tot * nIn.value / 100); if (st.gR == null) { st.gR = st.R; st.gN = st.N; } st.R = tot - n; st.N = n; };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    // the tour: three presets, then slide 176's four ways from post-rework Yi
    const STEPS = [{ t: 0, pre: 'aph' }, { t: 3.5, pre: 'yi0' }, { t: 7, pre: 'yi1' }, { t: 10.5, way: 'addN' }, { t: 13, way: 'addR' }, { t: 15.5, way: 'n2r' }, { t: 18, way: 'r2n' }];
    const DUR = 20.5;
    STEPS.forEach((p, i) => { const k = p.pre ? PRESETS[p.pre] : WAYS[p.way].f(STEPS[i - 1].k); p.k = { R: k.R, N: k.N }; });
    // blocks: reliable pile on the left, niche pile on the right
    const PILE = { R: { x: 28, label: 'Reliable elements', subs: ['Auto attacks', 'Stats'], cols: ['#2ea3dc', '#7cc6ea'] },
                   N: { x: 548, label: 'Niche elements', subs: ['Animation cancel', 'Sequenced combo'], cols: ['#8a4fd6', '#b78ee8'] } };
    const BY = 380, BW = 42, BH = 30, GAP = 4, PER = 10;
    const blockPos = (side, i) => [PILE[side].x + (i % PER) * (BW + GAP), BY + Math.floor(i / PER) * (BH + GAP)];
    function hitBlock(x, y) {
      for (const side of ['R', 'N']) { const n = Math.round(st[side] / BLOCK); for (let i = 0; i < n; i++) { const [bx, by] = blockPos(side, i); if (x >= bx && x <= bx + BW && y >= by && y <= by + BH) return side; } }
      return null;
    }
    const pt = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height]; };
    cv.addEventListener('pointerdown', e => { const [x, y] = pt(e), side = hitBlock(x, y); if (!side) return; free(); st.drag = { side, x, y, x0: x, y0: y }; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', e => { if (!st.drag) return; const [x, y] = pt(e); st.drag.x = x; st.drag.y = y; });
    cv.addEventListener('pointerup', e => {
      const d = st.drag; st.drag = null; if (!d) return;
      const click = Math.hypot(d.x - d.x0, d.y - d.y0) < 6, other = d.side === 'R' ? 'N' : 'R', dropOther = d.side === 'R' ? d.x > 520 : d.x < 520;
      if ((click || dropOther) && st[other] + BLOCK <= MAXP) { st.pre = null; st.way = null; st.gR = st.R; st.gN = st.N; st[d.side] -= BLOCK; st[other] += BLOCK; }
    });
    function render(dt = 0) {
      let k, ghost = null, pre = st.pre, way = st.way, wayA = 0;
      if (st.tour) {
        const i = STEPS.findLastIndex(p => st.t >= p.t), cur = STEPS[i], prev = STEPS[Math.max(0, i - 1)], f = ease(clamp((st.t - cur.t) / .8));
        k = { R: lerp(prev.k.R, cur.k.R, i ? f : 1), N: lerp(prev.k.N, cur.k.N, i ? f : 1) };
        ghost = i ? prev.k : null; pre = cur.pre || null; way = cur.way || null; wayA = way ? clamp((st.t - cur.t) / .3) * clamp((cur.t + 2.4 - st.t) / .3) : 0;
        st.R = cur.k.R; st.N = cur.k.N; st.dR = k.R; st.dN = k.N; st.gR = ghost ? ghost.R : null; st.gN = ghost ? ghost.N : null; st.pre = pre; st.way = way; st.wayT = st.t - cur.t;
      } else {
        const a = Math.min(1, dt * 7); st.dR += (st.R - st.dR) * a; st.dN += (st.N - st.dN) * a;
        k = { R: st.dR, N: st.dN }; ghost = st.gR != null ? { R: st.gR, N: st.gN } : null;
        st.wayT += dt; wayA = way ? clamp((2.4 - st.wayT) / .4) : 0;
      }
      const tot = k.R + k.N, share = Math.round(100 * k.N / tot);
      nIn.value = Math.round(100 * st.N / (st.R + st.N)); $(s, '.sp-nv').textContent = share + '%';
      $$(s, '.sp-pre .btn').forEach(b => b.classList.toggle('on', b.dataset.k === pre));
      $$(s, '.sp-ways .btn').forEach(b => b.classList.toggle('flash', b.dataset.w === way && wayA > 0));
      T.use(g); panel(g);
      const fl = wr(k, P_FLOOR), ce = wr(k, P_CEIL);
      const curves = [];
      if (ghost) curves.push({ f: p => wr(ghost, p), col: C.muted, w: 3, dash: [8, 6], a: .7 });
      curves.push({ f: p => wr(k, p), col: '#e0892d', w: 6, main: true });
      wrChart(g, { x0: 92, x1: 650, y0: 28, y1: 292 }, curves);
      txt(g, ghost ? 'solid: now  ·  dashed: before the last change' : 'solid: this kit  ·  dotted: the average champion (50%)', 92, 324, '600 13px Jost, sans-serif', C.muted);
      // champion panel
      const P = PRESETS[pre];
      g.fillStyle = '#fffaf0'; g.strokeStyle = '#cdbf9f'; g.lineWidth = 2; g.beginPath(); g.roundRect(680, 18, 342, 300, 12); g.fill(); g.stroke();
      if (P) {
        portrait(g, P.img, 728, 66, 34, '#e0892d');
        txt(g, P.name, 774, 54, '800 18px Montserrat, Jost, sans-serif');
        txt(g, `${P.R} reliable · ${P.N} niche`, 774, 80, '600 14px Jost, sans-serif', C.muted);
        wrap(g, P.quote, 306, '500 15px Jost, sans-serif').forEach((l, i) => txt(g, l, 698, 124 + i * 21, '500 15px Jost, sans-serif', C.ink));
      } else {
        txt(g, 'Your kit', 698, 54, '800 18px Montserrat, Jost, sans-serif');
        txt(g, `${Math.round(k.R)} reliable · ${Math.round(k.N)} niche`, 698, 80, '600 14px Jost, sans-serif', C.muted);
        if (way) {
          const Wy = WAYS[way], n = Object.keys(WAYS).indexOf(way) + 1;
          g.save(); g.globalAlpha = .35 + .65 * wayA;
          g.fillStyle = 'rgba(138,79,214,.12)'; g.strokeStyle = '#8a4fd6'; g.lineWidth = 2.5; g.beginPath(); g.roundRect(692, 102, 318, 104, 10); g.fill(); g.stroke();
          txt(g, `Way ${n} of 4`, 706, 122, '700 13px Montserrat, Jost, sans-serif', '#6a37b0');
          wrap(g, Wy.label, 290, '800 17px Montserrat, Jost, sans-serif').forEach((l, i) => txt(g, l, 706, 148 + i * 22, '800 17px Montserrat, Jost, sans-serif', C.ink));
          txt(g, Wy.eff, 706, 192, '600 15px Jost, sans-serif', '#6a37b0');
          g.restore();
        } else wrap(g, 'Click or drag a block to the other pile, or use one of the four ways to shift power.', 306, '500 15px Jost, sans-serif').forEach((l, i) => txt(g, l, 698, 124 + i * 21, '500 15px Jost, sans-serif', C.ink));
      }
      // floor / ceiling read-out
      [[`floor (Iron)`, fl, 698], [`ceiling (Challenger)`, ce, 862]].forEach(([l, v, x]) => {
        txt(g, l, x, 238, '600 13px Jost, sans-serif', C.muted);
        txt(g, fmt(v), x, 270, '800 30px Montserrat, Jost, sans-serif', v > REVIEW_LINE ? C.redDk : v < 45 ? '#5d618c' : C.ink);
      });
      const verdict = fl > 55 && ce > 55 ? ['too strong at every rank', C.redDk] : fl > ce + 2 ? ['crushes low ranks', C.redDk] : ce > fl + 2 ? ['rewards mastery', '#6a37b0'] : ['even across ranks', '#1a8a4c'];
      txt(g, verdict[0], 698, 302, '700 13px Montserrat, Jost, sans-serif', verdict[1]);
      // piles
      ['R', 'N'].forEach(side => {
        const Pl = PILE[side], pts = side === 'R' ? k.R : k.N, n = Math.round(pts / BLOCK), half = Math.ceil(n / 2);
        g.fillStyle = side === 'R' ? 'rgba(46,163,220,.08)' : 'rgba(138,79,214,.08)'; g.beginPath(); g.roundRect(Pl.x - 12, 334, 488, 240, 12); g.fill();
        txt(g, Pl.label, Pl.x, 356, '800 18px Montserrat, Jost, sans-serif');
        txt(g, `${Math.round(pts)} power`, Pl.x + 462, 356, '700 16px Montserrat, Jost, sans-serif', side === 'R' ? '#1f7fb0' : '#6a37b0', 'right');
        for (let i = 0; i < n; i++) {
          if (st.drag && st.drag.side === side && i === n - 1) continue;
          const [bx, by] = blockPos(side, i);
          g.fillStyle = Pl.cols[i < half ? 0 : 1]; g.strokeStyle = C.navy; g.lineWidth = 1.5; g.beginPath(); g.roundRect(bx, by, BW, BH, 5); g.fill(); g.stroke();
        }
        Pl.subs.forEach((l, j) => { g.fillStyle = Pl.cols[j]; g.fillRect(Pl.x + j * 210, 548, 16, 12); txt(g, l, Pl.x + 24 + j * 210, 554, '600 14px Jost, sans-serif'); });
        txt(g, side === 'R' ? 'counts for every player' : 'counts as far as a player can execute it', Pl.x, 526, '500 13px Jost, sans-serif', C.muted);
      });
      if (st.drag) { const d = st.drag; g.fillStyle = PILE[d.side].cols[0]; g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.roundRect(d.x - BW / 2, d.y - BH / 2, BW, BH, 5); g.fill(); g.stroke(); }
      txt(g, '⇄', 520, 452, '800 26px Montserrat, Jost, sans-serif', C.muted, 'center');
      // slide 176 action stamp
      const key = [Math.round(k.R), Math.round(k.N), pre, way].join(); if (key === st.key) return; st.key = key;
      const gf = ghost ? wr(ghost, P_FLOOR) : null, gc = ghost ? wr(ghost, P_CEIL) : null, d = (a, b) => b == null ? '' : ` (${a - b >= 0 ? '+' : ''}${(a - b).toFixed(1)})`;
      say($(s, '.sp-stats'), `<div class="${fl > 55 ? 'r' : ''}"><b>${fmt(fl)}</b><span>floor: win rate in Iron${d(fl, gf)}</span></div>`
        + `<div class="g"><b>${fmt(ce)}</b><span>ceiling: win rate in Challenger${d(ce, gc)}</span></div>`
        + `<div class="y"><b>${share}%</b><span>of ${Math.round(tot)} power in niche elements</span></div>`);
      say($(s, '.sp-out'), way ? `${WAYS[way].label} ${WAYS[way].eff}: the floor moved ${(fl - gf).toFixed(1)} and the ceiling ${(ce - gc).toFixed(1)} points.`
        : fl > 55 && ce > 55 ? 'There is simply too much power in this kit: it wins at every rank. Take some out before shifting it.'
        : fl > 55 ? 'Most of this kit is reliable, so low ranks lose to it before they learn anything about it: a high floor.'
        : ce - fl > 8 ? 'Most of this kit is niche: weak in low ranks, strong where players can execute it. A low floor and a high ceiling.'
        : 'Power is split so the curve stays near 50% across ranks: no bracket is crushed or left behind.');
    }
    apis.shift = { seek(t) { st.held = st.tour = true; st.t = t; render(); }, dur: () => DUR };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > DUR) st.t = 0; render(Math.max(0, dt)); };
  });

  /* ---------- 2: floor and ceiling elements ---------- */
  canvasDemo('elements', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, on: [false, false, false, false, false, false], key: '' };
    const tourBtn = $(s, '.el-tour'), boxes = $$(s, '.el-c');
    const free = () => { st.tour = false; tourBtn.classList.remove('on'); };
    boxes.forEach(b => b.onchange = () => { free(); st.on[+b.dataset.i] = b.checked; });
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    const card = i => ({ x: 20 + (i % 3) * 340, y: i < 3 ? 40 : 196, w: 324, h: 112 });
    cv.addEventListener('pointerdown', e => {
      const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * W / r.width, y = (e.clientY - r.top) * H / r.height;
      ELEMENTS.forEach((el, i) => { const c = card(i); if (x > c.x && x < c.x + c.w && y > c.y && y < c.y + c.h) { free(); st.on[i] = !st.on[i]; boxes[i].checked = st.on[i]; } });
    });
    const DUR = 13, ORDERT = [0, 1, 2, 3, 4, 5];
    function render() {
      let on = st.on;
      if (st.tour) {
        const t = st.t;
        // floor elements one by one, clear, then ceiling elements one by one
        on = ELEMENTS.map((e, i) => i < 3 ? (t >= 1 + i * 1.3 && t < 6) : (t >= 7 + (i - 3) * 1.3));
        boxes.forEach((b, i) => b.checked = on[i]); st.on = on.slice();
      }
      const k = { R: AVG.R, N: AVG.N };
      ELEMENTS.forEach((e, i) => { if (on[i]) e.kind === 'floor' ? k.R += e.pts : k.N += e.pts; });
      T.use(g); panel(g);
      txt(g, 'Floor elements raise everyone equally', 20, 22, '800 16px Montserrat, Jost, sans-serif', '#1f7fb0');
      txt(g, 'Ceiling elements need arcane rules, precise timing and large amounts of attention', 20, 178, '800 16px Montserrat, Jost, sans-serif', '#6a37b0');
      ELEMENTS.forEach((el, i) => {
        const c = card(i), col = el.kind === 'floor' ? '#2ea3dc' : '#8a4fd6';
        g.fillStyle = on[i] ? (el.kind === 'floor' ? '#dff1fa' : '#efe5fb') : '#fffaf0'; g.strokeStyle = on[i] ? col : '#cdbf9f'; g.lineWidth = on[i] ? 3.5 : 2;
        g.beginPath(); g.roundRect(c.x, c.y, c.w, c.h, 12); g.fill(); g.stroke();
        portrait(g, el.img, c.x + 46, c.y + 56, 30, col, true);
        txt(g, el.name, c.x + 88, c.y + 26, '800 15px Montserrat, Jost, sans-serif');
        el.cap.forEach((l, j) => txt(g, l, c.x + 88, c.y + 52 + j * 19, '500 14px Jost, sans-serif', C.ink));
        txt(g, on[i] ? `✓ in the kit · +${el.pts} power` : 'click to add', c.x + 88, c.y + 96, '700 13px Jost, sans-serif', on[i] ? col : C.muted);
      });
      const base = { f: p => wr(AVG, p), col: C.muted, w: 3, dash: [8, 6] };
      const now = { f: p => wr(k, p), col: '#e0892d', w: 6, main: true };
      wrChart(g, { x0: 92, x1: 760, y0: 336, y1: 520, lo: 45, hi: 62.5 }, [base, now]);
      T.label('average kit', 700, 520 - (520 - 336) * (50 - 45) / 17.5 + 16, 'center', C.muted, 12);
      const fl = wr(k, P_FLOOR), ce = wr(k, P_CEIL);
      txt(g, 'Kit power', 800, 352, '800 16px Montserrat, Jost, sans-serif');
      txt(g, `${k.R} reliable`, 800, 380, '600 15px Jost, sans-serif', '#1f7fb0');
      txt(g, `${k.N} niche`, 800, 402, '600 15px Jost, sans-serif', '#6a37b0');
      txt(g, `floor lift  ${(fl - 50) >= 0 ? '+' : ''}${(fl - 50).toFixed(1)}`, 800, 448, '700 16px Montserrat, Jost, sans-serif', C.ink);
      txt(g, `ceiling lift  ${(ce - 50) >= 0 ? '+' : ''}${(ce - 50).toFixed(1)}`, 800, 476, '700 16px Montserrat, Jost, sans-serif', C.ink);
      const key = on.join(); if (key === st.key) return; st.key = key;
      const nF = on.filter((x, i) => x && ELEMENTS[i].kind === 'floor').length, nC = on.filter((x, i) => x && ELEMENTS[i].kind === 'ceiling').length;
      say($(s, '.el-stats'), `<div><b>${fmt(fl)}</b><span>win rate in Iron (floor)</span></div><div class="g"><b>${fmt(ce)}</b><span>win rate in Challenger (ceiling)</span></div>`);
      say($(s, '.el-out'), !nF && !nC ? 'Add an element: floor elements lift the whole curve, ceiling elements lift only the right end.'
        : nF && !nC ? `${nF} floor element${nF > 1 ? 's' : ''}: the whole curve rises by the same amount, from Iron to Challenger.`
        : nC && !nF ? `${nC} ceiling element${nC > 1 ? 's' : ''}: Iron barely moves, Challenger gains. Only players who can execute them get the power.`
        : 'Both kinds: the floor rises for everyone, and the ceiling rises further for players who can execute the niche elements.');
    }
    apis.elements = { seek(t) { st.held = st.tour = true; st.t = t; render(); }, dur: () => DUR };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > DUR) st.t = 0; render(); };
  });

  /* ---------- 3: the 55% and 60% lines ---------- */
  canvasDemo('review', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, patch: 0, br: 'all', dp: 0, key: '' };
    const tourBtn = $(s, '.rv-tour');
    const free = () => { st.tour = false; tourBtn.classList.remove('on'); };
    $$(s, '.rv-patch .btn').forEach(b => b.onclick = () => { free(); st.patch = +b.dataset.p; });
    $$(s, '.rv-br .btn').forEach(b => b.onclick = () => { free(); st.br = b.dataset.b; });
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    const DUR = 14, LO = 44, HI = 64, AX0 = 60, AX1 = 980, AY = 330;
    const xOf = v => AX0 + (AX1 - AX0) * (v - LO) / (HI - LO);
    const at = (c, p, br) => { const i = Math.floor(p), f = p - i, j = Math.min(3, i + 1), base = lerp(c.wr[i], c.wr[j], f), tl = lerp(c.tilt[i], c.tilt[j], f); return br === 'low' ? base + tl : br === 'high' ? base - tl : base; };
    const zone = v => v > REVIEW_LINE ? 'up for review' : v > OK_LINE ? 'worth watching' : 'close enough for now';
    function render(dt = 0) {
      let p, br = st.br;
      if (st.tour) { const t = st.t; br = t < 10 ? 'all' : 'low'; const step = Math.min(3, Math.floor(t / 2.5)); p = t < 10 ? step + ease(clamp((t - step * 2.5) / .7)) - 1 : 1; p = clamp(p, 0, 3); if (t < 10 && step === 0) p = 0; st.dp = p; st.patch = Math.round(p); st.br = br; }
      else { st.dp += (st.patch - st.dp) * Math.min(1, dt * 6); p = st.dp; }
      const pi = Math.round(p);
      $$(s, '.rv-patch .btn').forEach(b => b.classList.toggle('on', +b.dataset.p === pi));
      $$(s, '.rv-br .btn').forEach(b => b.classList.toggle('on', b.dataset.b === br));
      T.use(g); panel(g);
      txt(g, `Patch ${pi + 1} · ${br === 'all' ? 'all ranks' : br === 'low' ? 'low ranks' : 'high ranks'}`, 30, 32, '800 20px Montserrat, Jost, sans-serif');
      // zones
      [[LO, OK_LINE, 'rgba(47,174,99,.12)', 'close enough for now'], [OK_LINE, REVIEW_LINE, 'rgba(224,169,45,.16)', 'worth watching'], [REVIEW_LINE, HI, 'rgba(229,50,45,.14)', 'up for review']].forEach(([a, b, col, l]) => {
        g.fillStyle = col; g.fillRect(xOf(a), 70, xOf(b) - xOf(a), AY - 70);
        txt(g, l, (xOf(a) + xOf(b)) / 2, 86, '700 14px Montserrat, Jost, sans-serif', C.ink, 'center');
      });
      [OK_LINE, REVIEW_LINE].forEach(v => { g.strokeStyle = v === REVIEW_LINE ? C.red : '#e0a92d'; g.lineWidth = 3; g.beginPath(); g.moveTo(xOf(v), 70); g.lineTo(xOf(v), AY + 8); g.stroke(); txt(g, v + '%', xOf(v), AY + 24, '800 16px Montserrat, Jost, sans-serif', v === REVIEW_LINE ? C.redDk : '#9a5a06', 'center'); });
      g.strokeStyle = C.ink; g.lineWidth = 2.5; g.beginPath(); g.moveTo(AX0, AY); g.lineTo(AX1, AY); g.stroke();
      for (let v = LO; v <= HI; v += 2) if (v !== OK_LINE && v !== REVIEW_LINE) txt(g, v + '%', xOf(v), AY + 20, '600 13px Jost, sans-serif', C.muted, 'center');
      txt(g, 'win rate', AX1, AY + 44, '700 13px Montserrat, Jost, sans-serif', C.ink, 'right');
      // portraits, stacked so none overlap
      const pts = REVIEW.map(c => ({ c, v: at(c, p, br) })).sort((a, b) => a.v - b.v), rows = [];
      pts.forEach(o => { let r = 0; while (rows[r] != null && xOf(o.v) - rows[r] < 52) r++; rows[r] = xOf(o.v); o.row = r; });
      pts.forEach(o => {
        const x = xOf(o.v), y = AY - 34 - o.row * 58, col = o.v > REVIEW_LINE ? C.red : o.v > OK_LINE ? '#e0a92d' : '#2fae63';
        g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y + 24); g.lineTo(x, AY); g.stroke();
        portrait(g, o.c.img, x, y, 24, col);
        if (o.v > OK_LINE) T.label(`${o.c.name} ${fmt(o.v)}`, x, y - 36, 'center', o.v > REVIEW_LINE ? C.redDk : '#9a5a06', 13);
      });
      // the rule, from the notes
      g.fillStyle = '#fffaf0'; g.strokeStyle = '#cdbf9f'; g.lineWidth = 2; g.beginPath(); g.roundRect(30, 400, 980, 164, 12); g.fill(); g.stroke();
      txt(g, 'The rule of thumb', 52, 428, '800 16px Montserrat, Jost, sans-serif');
      wrap(g, '“If a character didn’t go over a 55% win rate… then it was ‘close enough’ for now. But characters which exceeded 60% win rate were definitely up for review patch-to-patch.”', 930, 'italic 500 17px Jost, sans-serif')
        .forEach((l, i) => txt(g, l, 52, 458 + i * 24, 'italic 500 17px Jost, sans-serif', C.ink));
      const rev = pts.filter(o => o.v > REVIEW_LINE), watch = pts.filter(o => o.v > OK_LINE && o.v <= REVIEW_LINE);
      txt(g, `Up for review: ${rev.length ? rev.map(o => o.c.name).join(', ') : 'none'}   ·   Worth watching: ${watch.length ? watch.map(o => o.c.name).join(', ') : 'none'}`, 52, 532, '700 15px Jost, sans-serif', rev.length ? C.redDk : C.ink);
      const key = [pi, br, rev.length, watch.length].join(); if (key === st.key) return; st.key = key;
      say($(s, '.rv-stats'), `<div class="r"><b>${rev.length}</b><span>over 60%: up for review</span></div><div class="y"><b>${watch.length}</b><span>55% to 60%: worth watching</span></div><div class="g"><b>${pts.length - rev.length - watch.length}</b><span>at or under 55%: close enough for now</span></div>`);
      say($(s, '.rv-out'), br === 'low' && pi < 2 ? 'Split by rank, pre-rework Master Yi’s high floor shows: low ranks see him near or over 60% while the all-ranks number looks calm.'
        : rev.length ? `${rev.map(o => o.c.name).join(' and ')} crossed 60%, so the next patch looks at ${rev.length > 1 ? 'them' : 'it'} first.`
        : 'Nobody is over 60% here: a few points above 50% is close enough, and the team spends its time elsewhere.');
    }
    apis.review = { seek(t) { st.held = st.tour = true; st.t = t; render(); }, dur: () => DUR };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > DUR) st.t = 0; render(Math.max(0, dt)); };
  });

  window.__seek = (t, w) => apis[w || 'shift'].seek(t);
  window.__dur = w => apis[w || 'shift'].dur();
})();
