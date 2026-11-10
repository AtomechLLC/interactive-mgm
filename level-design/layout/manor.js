/* From a hallway to a manor: eight floor plans, each applying one recipe to the last.
   The recipes come from measuring a senior designer's reference plan (see MANOR-STUDY.md next to this file):
   three grids only (0, +19 and -20 degrees), each volume square inside itself; a heavy round tower that bites into
   the hall and anchors the corner; wings hinged at corners, never at mid-wall, so their corners cut the hall into
   useful wedges; every change of grid is also a change of level, with the stair running along the seam; rooms carved
   into L shapes by short partitions; five boundary weights from heavy wall to a line of piers; and an outbuilding
   that closes a yard, so routes loop through the outdoors.
   The plan is our own composition, drawn in metres (S px per metre). build(n) returns the floors, walls, stairs and
   the room graph for step n; the stats are computed from that data, not typed in. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp } = TD;
  const W = 1040, H = 585, N = 8, S = 38, OX = 227, OY = 45;
  const INK = '#1c2450', LV = ['#f9f5ea', '#f5eedc', '#efe3c6', '#e9d9b4'];   // floor tone by level: lower, ground, +1, +2
  const X = p => [p[0] * S + OX, p[1] * S + OY];
  const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k];
  const rad = d => d * Math.PI / 180;

  // the three grids. A frame has an origin and two unit axes; at(u, v) is a point in metres.
  const KA = [5.6, 1.52];                       // hinge of the north-west wing: the hall's top-left corner
  const FA = { deg: 19, at: (u, v) => add(add(KA, [-.946, -.326], u), [-.326, .946], v) };   // u runs up-left along its top wall, v down its length
  const BP = [14.1, 7.0];                       // hinge of the south wing: under the tower, at the loggia
  const FB = { deg: -20, at: (p, q) => add(add(BP, [-.94, .342], p), [.342, .94], q) };      // p runs down-left along the seam, q into the wing
  const TW = { c: [12.6, 3.0], r: 2.65, k: 2.2 };   // tower: centre, radius, and the squared corner's offset

  const STEPS = [
    ['A hallway', '1.4 m wide, 6 m long, a door at each end. It moves the player and nothing else. Every later step keeps this line of travel and builds on it.'],
    ['Swell the hallway into a hall', 'Widen it four times over, to 5.6 m, and split it with a line of piers and one step instead of a wall: a nave you walk and an aisle beside it. The corridor is now inside a room, and the room has two parts without a single new wall.'],
    ['Anchor one corner with a heavy round', 'A tower twice the nave’s width, with the thickest wall on the plan, bites 2.2 m into the hall’s corner. Its squared corner carries the doors, and the hall wraps around it into an L. A circle has no direction, so it can sit where grids will meet.'],
    ['Hinge a wing on the far corner', 'A 4 by 6.6 m wing turns 19° off the grid, hinged at the hall’s corner, never at the middle of a wall. Its side slices the aisle into a wedge that widens from 2 m to 4 m. The wing is square inside itself: the turn happens between volumes, not inside one.'],
    ['Hinge a second wing the other way', 'The south wing turns 20° the opposite way, under the tower, so the two wings fan apart. It is an L: a narrow entry leg, then the room. Where its grid collides with the hall’s, a wedge of floor is left over.'],
    ['Put the stairs in the seams', 'Each leftover wedge becomes a stair that runs along the seam, with a landing where you turn before you enter. No stair sits in the middle of a room. A short partition carves each wing into an anteroom and a room, so no door faces another door.'],
    ['Thin the edges, round the hinge', 'Not every boundary is a wall. Piers open the hall to a loggia with a thin outer wall, a thin-walled porch reaches the south wing, and a row of piers marks a cross-aisle. A small apse, a third of the tower’s radius, sits where the two grids meet on the south wall.'],
    ['Close a yard with an outbuilding', 'An outbuilding of two unequal bays stands back on the main grid, 2.5 m off the house, so the space between the wings becomes a yard. A stoop, an outside stair and three more doors open onto it, and the routes now loop through the outdoors.'],
  ];

  function build(n) {
    const floors = [], walls = [], arcs = [], stairs = [], labels = [], edges = [], rooms = new Set(), grids = new Set([0]);
    const fl = (pts, lv = 1, tint) => floors.push({ pts, lv, tint });
    // a wall from a to b in one of five weights, with gaps (metres from a) left open as doors
    const wall = (a, b, type = 'std', gaps = []) => {
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]), d = [(b[0] - a[0]) / L, (b[1] - a[1]) / L]; let t = 0;
      [...gaps, [L, L]].forEach(([g0, g1]) => { if (g0 > t + .01) walls.push({ a: add(a, d, t), b: add(a, d, g0), type }); t = g1; });
    };
    const stair = (f, u0, u1, v0, v1, k, alongU = true) => stairs.push({ f, u0, u1, v0, v1, k, alongU });
    const lab = (t, p, col) => labels.push({ t, p, col });
    const link = (a, b) => { rooms.add(a); rooms.add(b); edges.push([a, b]); };

    if (n === 1) {
      fl([[8.3, 1.52], [9.7, 1.52], [9.7, 7.6], [8.3, 7.6]]);
      wall([8.3, 1.52], [8.3, 7.6]); wall([9.7, 1.52], [9.7, 7.6]);
      wall([8.3, 1.52], [9.7, 1.52], 'std', [[.25, 1.15]]); wall([8.3, 7.6], [9.7, 7.6], 'std', [[.25, 1.15]]);
      lab('hallway', [9, 4.5]); link('hallway', 'outside'); link('hallway', 'outside');
      return { floors, walls, arcs, stairs, labels, edges, rooms, grids };
    }
    const wingA = n >= 4, wingB = n >= 5, seams = n >= 6, thin = n >= 7, grounds = n >= 8, tower = n >= 3;
    const xW = wingA ? 5.6 : 4.8;                          // where the hall's top wall starts
    const aAt = v => FA.at(0, v), B = (p, q) => FB.at(p, q);
    const B2 = B(6.3, 0), LR0 = B(3.4, -1.6), LR1 = B(6.3, -1.6);   // seam end; landing room's upper corners

    /* ---- the hall: nave (ground) and aisle (one step up) ---- */
    const aisle = wingA ? [KA, [7.6, 1.52], [7.6, 7.6], [aAt(6.43)[0], 7.6]] : [[4.8, 1.52], [7.6, 1.52], [7.6, 7.6], [4.8, 7.6]];
    fl(aisle, 2);
    fl(wingB ? [[7.6, 1.52], [10.4, 1.52], [10.4, 5.2], [14.08, 5.2], BP, B2, LR1, [7.6, 7.6]] : tower ? [[7.6, 1.52], [10.4, 1.52], [10.4, 5.2], [14.08, 5.2], [14.08, 7.0], [10.4, 7.0], [10.4, 7.6], [7.6, 7.6]] : [[7.6, 1.52], [10.4, 1.52], [10.4, 7.6], [7.6, 7.6]], 1);
    wall([xW, 1.52], [10.4, 1.52], 'std', [[8.55 - xW, 9.45 - xW]]);            // north wall, with the old hallway's north door
    if (!wingA) wall([4.8, 1.52], [4.8, 7.6]);
    const xS = wingA ? aAt(6.43)[0] : 4.8;
    wall([xS, 7.6], [7.6, 7.6], 'std', thin ? [[5.95 - xS, 6.65 - xS]] : []);   // aisle's south wall, with the apse door later
    wall([7.6, 1.52], [7.6, 7.6], 'piers'); walls.push({ a: [7.52, 1.6], b: [7.52, 7.55], type: 'edge' });
    lab('nave', [9, 4.3]); lab('aisle', [6.2, 4.3]); link('nave', 'aisle'); link('nave', 'outside');
    if (!wingB) { wall([7.6, 7.6], [10.4, 7.6], 'std', [[.95, 1.85]]); link('nave', 'outside'); }
    if (!tower) wall([10.4, 1.52], [10.4, 7.6]);

    /* ---- the tower: heavy arc, squared corner with the two doors, tiered steps inside ---- */
    if (tower) {
      const [cx, cy] = TW.c, k = TW.k, e = Math.sqrt(TW.r ** 2 - k * k);
      fl(Array.from({ length: 41 }, (_, i) => { const a = rad(-146 + i * 202 / 40); return [cx + Math.cos(a) * TW.r, cy + Math.sin(a) * TW.r]; }).concat([[cx - k, cy + k]]), 3);
      arcs.push({ c: TW.c, r: TW.r, a0: rad(-146.1), a1: rad(56.1), type: 'heavy' });
      wall([cx - k, cy - e], [cx - k, cy + k], 'std', [[1.38, 2.23]]);            // west face, door to the nave
      wall([cx - k, cy + k], [cx + e, cy + k], 'std', [[1.45, 2.5]]);             // south face, door to the lower hall
      [0, .32, .64].forEach(o => walls.push({ pts: [[cx - k + .1, cy - 1 + o], [cx + 1 - o, cy - 1 + o], [cx + 1 - o, cy + k - .1]], type: 'edge' }));
      lab('tower', [cx + .2, cy - 1.6]); link('nave', 'tower'); link('lower hall', 'tower'); link('nave', 'lower hall');
      lab('lower hall', [13.15, 5.62]);
      if (!wingB) { wall([10.4, 7.0], [14.08, 7.0]); wall([10.4, 7.0], [10.4, 7.6]); }
      if (!thin) wall([14.08, 5.2], [14.08, 7.0]);
    }

    /* ---- north-west wing: +19 degrees, hinged on the hall's corner ---- */
    if (wingA) {
      grids.add(19);
      const a = FA.at, Kb = a(4, 0), Kc = a(4, 6.6), Kd = a(0, 6.6);
      fl([KA, Kb, Kc, Kd], seams ? 3 : 1);
      wall(KA, Kb); wall(Kb, Kc); wall(a(0, 1.7), Kd);
      wall(Kd, Kc, 'std', grounds ? [[.7, 1.65]] : []);
      if (seams) {
        fl([a(0, 0), a(2.5, 0), a(2.5, 1.6), a(0, 1.6)], 2);
        stair(FA, .1, 2.4, .08, 1.55, 8);
        wall(a(0, 1.7), a(2.1, 1.7)); wall(a(2.1, 1.7), a(2.1, 3.3)); wall(a(2.1, 3.3), a(4, 3.3), 'std', [[.85, 1.6]]);
        lab('gallery', a(3.1, 1.6)); lab('north-west wing', a(2.0, 5.0)); link('aisle', 'gallery'); link('gallery', 'north-west wing');
      } else { lab('north-west wing', a(2.0, 3.6)); link('aisle', 'north-west wing'); }
      if (grounds) { [a(.55, 6.6), a(1.8, 6.6)].forEach(p => walls.push({ a: p, b: add(p, [-.326, .946], 1.1), type: 'thin' })); link('north-west wing', 'outside'); }
    }

    /* ---- south wing: -20 degrees, an L under the tower; its seam cuts the hall on the diagonal ---- */
    if (wingB) {
      grids.add(-20);
      fl([B(0, 0), B(6.3, 0), B(6.3, 4.5), B(2.7, 4.5), B(2.7, 1.4), B(0, 1.4)], 0);
      wall(BP, B2, 'std', seams ? [[5.0, 5.95]] : [[4.0, 4.9]]);                  // the seam wall
      wall(B(0, 1.4), B(2.7, 1.4)); wall(B(2.7, 1.4), B(2.7, 4.5), 'std', [[.7, 1.8]]); wall(B(2.7, 4.5), B(6.3, 4.5)); wall(B2, B(6.3, 4.5));
      wall(B(0, 0), B(0, 1.4), 'std', thin ? [[.25, 1.15]] : []);
      wall(LR1, B2);                                                              // closes the wedge on the aisle side
      lab('south wing', B(4.5, 2.6)); link('south wing', 'outside');
      if (seams) {
        fl([LR0, LR1, B2, B(3.4, 0)], 1); fl([B(1.2, -1.55), B(3.4, -1.55), B(3.4, 0), B(1.2, 0)], 1);
        wall(LR0, LR1); wall(LR0, B(3.4, 0), 'std', [[.4, 1.2]]);
        stair(FB, 1.3, 3.3, -1.5, -.12, 7); stair(FB, 3.75, 4.8, -1.5, -.12, 4);
        lab('landing', B(5.45, -.8)); link('lower hall', 'landing'); link('landing', 'south wing');
      } else link('lower hall', 'south wing');
    }

    /* ---- thin edges: loggia, porch, cross-aisle; and the apse on the hinge ---- */
    if (thin) {
      fl([[14.08, 5.2], [14.08, 7.0], [15.2, 7.0], [15.2, 3.51], [15.0, 4.2], [14.6, 4.75]], 1, '#f3efe2');
      wall([14.08, 5.2], [14.08, 7.0], 'piers'); wall([15.2, 3.51], [15.2, 7.0], 'thin');
      const P2 = [15.75, 8.55], Lc = B(0, 1.4);
      fl([BP, [15.2, 7.0], P2, Lc], 0, '#f3efe2'); wall([15.2, 7.0], P2, 'thin'); wall(P2, Lc, 'thin', [[.2, 1.0]]);
      walls.push({ a: [14.12, 7.0], b: [15.2, 7.0], type: 'edge' });
      wall([FA.at(0, 5.37)[0], 6.6], [7.6, 6.6], 'piers');
      fl([[5.43, 7.6], [7.17, 7.6], [7.17, 8.5], ...Array.from({ length: 13 }, (_, i) => [6.3 + Math.cos(rad(i * 15)) * .87, 8.5 + Math.sin(rad(i * 15)) * .87]), [5.43, 8.5]], 2);
      wall([5.43, 7.6], [5.43, 8.5]); wall([7.17, 7.6], [7.17, 8.5]); arcs.push({ c: [6.3, 8.5], r: .87, a0: 0, a1: Math.PI, type: 'std' });
      lab('loggia', [14.64, 6.2]); lab('porch', [14.95, 8.0]); lab('apse', [6.3, 8.6]);
      link('lower hall', 'loggia'); link('loggia', 'porch'); link('porch', 'south wing'); link('porch', 'outside'); link('aisle', 'apse');
    }

    /* ---- the grounds: an outbuilding of two bays closes the yard; an outside stair joins the levels ---- */
    if (grounds) {
      floors.unshift({ round: [-.75, 6.9, 9.6, 6.95], lv: 1, tint: 'rgba(126,170,98,.18)' });   // the yard, under everything
      fl([[-.2, 10.2], [3.6, 10.2], [3.6, 13.5], [-.2, 13.5]], 1, '#ece5d4'); fl([[3.6, 11.2], [7.2, 11.2], [7.2, 13.3], [3.6, 13.3]], 1, '#ece5d4');
      wall([-.2, 10.2], [3.6, 10.2], 'heavy', [[1.5, 2.2]]); wall([3.6, 10.2], [3.6, 13.5], 'std', [[1.5, 2.4]]); wall([-.2, 10.2], [-.2, 13.5], 'thin'); wall([-.2, 13.5], [3.6, 13.5], 'std');
      wall([3.6, 11.2], [7.2, 11.2], 'thin', [[2.3, 3.2]]); wall([7.2, 11.2], [7.2, 13.3], 'thin'); wall([3.6, 13.3], [7.2, 13.3], 'thin');
      wall([5.4, 11.2], [5.4, 11.8], 'thin'); wall([5.4, 12.75], [5.4, 13.3], 'thin');
      const e = (q, o) => FB.at(6.3 + o, q);
      fl([e(.3, .12), e(.3, 1.1), e(2.6, 1.1), e(2.6, .12)], 1, '#f3efe2');
      walls.push({ pts: [e(.3, .12), e(.3, 1.1), e(2.6, 1.1), e(2.6, .12)], type: 'thin' });
      stairs.push({ f: FB, u0: 6.42, u1: 7.4, v0: .4, v1: 2.5, k: 6, alongU: false });
      lab('yard', [4.6, 10.3], '#4f7a43'); lab('outbuilding', [1.7, 11.9]); lab('store', [5.4, 12.25]);
      link('outside', 'outbuilding'); link('outbuilding', 'store'); link('store', 'outside');
    }
    return { floors, walls, arcs, stairs, labels, edges, rooms, grids };
  }

  const STYLE = { heavy: [9, INK], std: [5.5, INK], thin: [2, INK], piers: [6, INK, [9, 9]], edge: [1.6, 'rgba(28,36,80,.38)'] };
  function stroke(g, type) { const [w, col, dash] = STYLE[type]; g.lineWidth = w; g.strokeStyle = col; g.setLineDash(dash || []); g.lineCap = 'butt'; g.lineJoin = 'miter'; }
  function render(P) {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
    P.floors.forEach(f => { g.fillStyle = f.tint || LV[f.lv]; g.beginPath(); if (f.round) { const [x, y, w, h] = f.round; g.roundRect(...X([x, y]), w * S, h * S, 26); g.fill(); return; } f.pts.forEach((p, i) => i ? g.lineTo(...X(p)) : g.moveTo(...X(p))); g.closePath(); g.fill(); });
    P.stairs.forEach(s => {
      g.strokeStyle = 'rgba(28,36,80,.4)'; g.lineWidth = 1.6; g.setLineDash([]); g.beginPath();
      for (let i = 0; i <= s.k; i++) { const t = i / s.k; const a = s.alongU ? s.f.at(s.u0 + (s.u1 - s.u0) * t, s.v0) : s.f.at(s.u0, s.v0 + (s.v1 - s.v0) * t), b = s.alongU ? s.f.at(s.u0 + (s.u1 - s.u0) * t, s.v1) : s.f.at(s.u1, s.v0 + (s.v1 - s.v0) * t); g.moveTo(...X(a)); g.lineTo(...X(b)); }
      g.stroke();
    });
    ['edge', 'thin', 'piers', 'std', 'heavy'].forEach(type => {
      stroke(g, type);
      P.walls.filter(w => w.type === type).forEach(w => { const pts = w.pts || [w.a, w.b]; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(...X(p)) : g.moveTo(...X(p))); g.stroke(); });
      P.arcs.filter(a => a.type === type).forEach(a => { g.beginPath(); g.arc(...X(a.c), a.r * S, a.a0, a.a1); g.stroke(); });
    });
    g.setLineDash([]);
    return cv;
  }
  function stats(P) {
    const types = new Set(P.walls.map(w => w.type).concat(P.arcs.map(a => a.type)));
    const levels = P.stairs.length + P.walls.filter(w => w.type === 'edge').length;
    const loops = P.edges.length - P.rooms.size + 1;
    return [
      [P.grids.size, P.grids.size > 1 ? `grids: ${[...P.grids].map(d => (d > 0 ? '+' : '') + d + '°').join(', ')}` : 'grid: everything at 0°', P.grids.size > 1 ? 'g' : 'y'],
      [types.size, 'boundary weights in use, of 5', types.size >= 4 ? 'g' : 'y'],
      [levels, 'stairs, tiers and steps', levels > 2 ? 'g' : 'y'],
      [loops, `loop${loops === 1 ? '' : 's'} in the routes between ${P.rooms.size} spaces`, loops > 1 ? 'g' : 'y'],
    ];
  }

  canvasDemo('manor', (s, cv, g) => {
    let n = 1, t = 0, auto = false, at = 0;
    const plans = {}, get = k => plans[k] ||= (() => { const P = build(k); return { P, img: render(P) }; })();
    const steps = $(s, '.mn-steps');
    steps.innerHTML = STEPS.map((x, i) => `<button class="btn${i ? '' : ' on'}" data-n="${i + 1}">${i + 1}</button>`).join('');
    const set = k => {
      n = clamp(k, 1, N); t = 0; const p = get(n);
      $$(steps, '.btn').forEach(b => b.classList.toggle('on', +b.dataset.n === n));
      say($(s, '.mn-stats'), stats(p.P).map(([v, l, c]) => `<div class="${c}"><b>${v}</b><span>${l}</span></div>`).join(''));
      say($(s, '.mn-out'), `<b class="accent">${n}. ${STEPS[n - 1][0]}.</b> ${STEPS[n - 1][1]}`);
    };
    $$(steps, '.btn').forEach(b => b.onclick = () => { auto = false; set(+b.dataset.n); });
    $(s, '.mn-prev').onclick = () => { auto = false; set(n - 1); };
    $(s, '.mn-next').onclick = () => { auto = false; set(n + 1); };
    $(s, '.mn-play').onclick = () => { auto = !auto; at = 0; if (auto && n === N) set(1); };
    set(1);
    window.__manorSet = k => { auto = false; set(k); t = 9; };

    const LEG = [['heavy', 'heavy wall'], ['std', 'wall'], ['thin', 'thin wall, rail or glass'], ['piers', 'piers: open, but a line'], ['edge', 'step or stair']];
    return dt => {
      t += dt; if (auto && (at += dt) > 4) { at = 0; if (n < N) set(n + 1); else auto = false; }
      const p = get(n), prev = n > 1 ? get(n - 1) : null;
      T.use(g); g.clearRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,252,244,.85)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill();
      // cross-fade from the last step, so you see what the recipe changed
      const k = clamp(t / .7);
      if (prev && k < 1) { g.globalAlpha = 1 - k; g.drawImage(prev.img, 0, 0); }
      g.globalAlpha = prev ? k : 1; g.drawImage(p.img, 0, 0); g.globalAlpha = 1;
      g.font = '500 12px Jost, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      p.P.labels.forEach(l => { g.fillStyle = l.col || C.muted; g.fillText(l.t, ...X(l.p)); });
      // legend: the five boundary weights, and a scale bar
      g.textAlign = 'left';
      LEG.forEach(([type, name], i) => { const y = 64 + i * 22; stroke(g, type); g.beginPath(); g.moveTo(846, y); g.lineTo(892, y); g.stroke(); g.setLineDash([]); g.fillStyle = C.muted; g.fillText(name, 902, y + 1); });
      g.strokeStyle = C.muted; g.lineWidth = 1.5; g.beginPath(); g.moveTo(846, 180); g.lineTo(846 + 5 * S, 180); g.moveTo(846, 175); g.lineTo(846, 185); g.moveTo(846 + 5 * S, 175); g.lineTo(846 + 5 * S, 185); g.stroke(); g.fillStyle = C.muted; g.fillText('5 m', 846 + 5 * S / 2 - 10, 194);
      g.font = '800 15px Montserrat, Jost, sans-serif'; g.fillStyle = C.ink; g.textBaseline = 'alphabetic';
      g.fillText(`Step ${n} of ${N}: ${STEPS[n - 1][0]}`, 20, 32);
    };
  });
})();
