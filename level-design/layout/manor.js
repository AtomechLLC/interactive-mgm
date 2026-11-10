/* From a hallway to the manor: seven floor plans (../shared/plan.js), each adding one rule to the last.
   1 hallway · 2 rooms off a corridor (all one box) · 3 hierarchy: a great hall swallows the middle of the hallway, rooms of
   different sizes · 4 break the grid: two wings turned off it · 5 a round tower and a niche · 6 level changes: stairs where
   volumes meet and a raised dais · 7 the grounds: an entry porch, a yard with a fountain, a detached outbuilding.
   build(n) composes stage n from the same base, so the hallway stays put and you see what each rule changed.
   Rooms carry the stage that added them, and the newest ones pulse gold. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp } = TD;
  const W = 1040, H = 585, N = 7;

  const STEPS = [
    ['A hallway', 'The simplest level: one corridor, one direction. It moves the player, but there is nowhere to be.'],
    ['Rooms off a corridor', 'Eight rooms hang off the hallway, every one the same box at right angles. The corridor is the only thing a player will remember, and the rooms are whatever space it leaves over.'],
    ['Give it a hierarchy', 'A great hall swallows the middle of the hallway, so the corridor becomes part of a room instead of the space between rooms. The other rooms take different sizes: a study, a dining room, a stair hall. Now there is a most important place.'],
    ['Break the grid', 'Two wings turn off the grid: one north-east, one long diagonal to the south-west. Right angles stay where they suit; the turned wings make the joints between volumes into places of their own.'],
    ['Add a round tower and a niche', 'The study becomes a round tower with a stair curving up its inside wall, and a small half-round niche pushes out of the great hall. A different shape tells the player this room is different before they enter.'],
    ['Change levels at the joints', 'Every place two volumes meet gets a stair: up into each wing, up into the stair hall, and a raised dais at the head of the great hall. The player feels each threshold underfoot.'],
    ['The manor: add the grounds', 'An entry porch, a yard with a fountain, and an outbuilding standing apart. The building reads as one that grew over time, a tower here and a wing there, which is why it feels like a real place.'],
  ];

  function build(n) {
    const P = PLAN.make(), st = (r, k) => { r.st = k; return r; };
    if (n === 1) { st(P.rect('Hc', 200, 262, 840, 318, { lab: 'hallway' }), 1); return P; }
    if (n === 2) {
      st(P.rect('Hc', 200, 262, 840, 318, { lab: 'hallway' }), 1);
      [200, 360, 520, 680].forEach((x, i) => {
        st(P.rect('n' + i, x, 142, x + 160, 262), 2); P.door('n' + i, 'Hc', [x + 80, 262], 0);
        st(P.rect('s' + i, x, 318, x + 160, 438), 2); P.door('s' + i, 'Hc', [x + 80, 318], 0);
      });
      return P;
    }
    // stage 3 and up: the great hall splits the hallway into a west and an east corridor
    st(P.rect('Wc', 200, 262, 400, 318), 1); st(P.rect('Ec', 640, 262, 840, 318), 1);
    st(P.rect('G', 400, 150, 640, 430, { lab: 'great hall', tint: '#f6e6bc' }), 3);
    P.door('Wc', 'G', [400, 290], 90); P.door('Ec', 'G', [640, 290], 90);
    st(P.rect('SE', 640, 318, 860, 470, { lab: 'dining' }), 3); P.door('SE', 'Ec', [750, 318], 0);
    st(P.rect('Er', 840, 214, 930, 318, { lab: 'stair hall' }), 3); P.door('Ec', 'Er', [840, 290], 90);
    [[450, 200], [590, 200], [450, 380], [590, 380]].forEach(([x, y]) => P.prop('column', x, y, 9));
    if (n < 5) { st(P.rect('NW', 220, 152, 400, 262, { lab: 'study' }), 3); P.door('NW', 'Wc', [310, 262], 0); }
    if (n < 4) {
      st(P.rect('SW', 230, 318, 400, 420), 3); P.door('SW', 'Wc', [315, 318], 0);
      st(P.rect('NE', 640, 130, 820, 262), 3); P.door('NE', 'Ec', [730, 262], 0);
    } else {
      st(P.chain('Ec', 0, [{ id: 'NE', len: 150, turn: 15, w: 130, w0: 130, lab: 'east wing' }]), 4);
      st(P.chain('Wc', 2, [{ id: 'SW', len: 175, turn: 30, w: 110, w0: 110, lab: 'long wing' }]), 4);
    }
    if (n >= 5) {
      st(P.chain('Wc', 0, [{ id: 'Tw', round: 85, lab: 'tower' }]), 5);
      st(P.chain('G', 2, [{ id: 'Ap', round: 40 }]), 5);
      const [cx, cy] = P.rooms.Tw.circle; P.arcStairs(cx, cy, 52, 78, 200, 340, 10);
    }
    if (n >= 6) {
      const ne = P.doorOf('Ec', 'NE'), sw = P.doorOf('Wc', 'SW'), dir = (d, r) => PLAN.unit([P.rooms[r].c[0] - d.m[0], P.rooms[r].c[1] - d.m[1]]);
      [[ne, 'NE', 110], [sw, 'SW', 95]].forEach(([d, r, w]) => { const v = dir(d, r); P.stairs([d.m[0] + v[0] * 14, d.m[1] + v[1] * 14], [d.m[0] + v[0] * 70, d.m[1] + v[1] * 70], w, 6); });
      P.stairs([903, 305], [903, 228], 40, 8);
      P.dash([412, 230], [628, 230]); P.stairs([480, 245], [480, 232], 50, 2); P.stairs([560, 245], [560, 232], 50, 2);
    }
    if (n >= 7) {
      st(P.rect('Po', 120, 250, 200, 330, { lab: 'porch' }), 7); P.door('Po', 'Wc', [200, 290], 90);
      st(P.rect('Ob', 700, 492, 905, 565, { lab: 'outbuilding', tint: '#ece5d4' }), 7); P.half([790, 492], [790, 530]);
      P.mark('fountain', 640, 520, .85); P.prop('planter', 580, 548, 11); P.prop('planter', 300, 520, 13); P.prop('planter', 360, 545, 10);
    }
    return P;
  }

  function stats(P) {
    const rooms = Object.values(P.rooms);
    const off = rooms.filter(r => r.circle || r.pts.some((p, i) => { const q = r.pts[(i + 1) % r.pts.length], a = Math.atan2(q[1] - p[1], q[0] - p[0]) * 180 / Math.PI; return Math.abs(((a % 90) + 90) % 90) > 1 && Math.abs(((a % 90) + 90) % 90) < 89 && Math.hypot(q[0] - p[0], q[1] - p[1]) > 45; })).length;
    const area = r => r.circle ? Math.PI * r.circle[2] ** 2 : Math.abs(r.pts.reduce((s, p, i) => { const q = r.pts[(i + 1) % r.pts.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0) / 2);
    const sizes = new Set(rooms.map(r => { const a = area(r); return a < 8000 ? 'xs' : a < 20000 ? 's' : a < 40000 ? 'm' : 'l'; })).size;
    return [
      [rooms.length, 'volumes in the plan', ''],
      [sizes, 'size classes, from niche to great hall', sizes > 2 ? 'g' : 'y'],
      [off, 'volumes off the grid or round', off ? 'g' : 'y'],
      [P.flights.length, 'stairs and level changes', P.flights.length ? 'g' : 'y'],
    ];
  }

  canvasDemo('manor', (s, cv, g) => {
    let n = 1, t = 0, auto = false, at = 0;
    const plans = {}, get = k => plans[k] ||= { P: build(k), img: null };
    const steps = $(s, '.mn-steps');
    steps.innerHTML = STEPS.map((x, i) => `<button class="btn${i ? '' : ' on'}" data-n="${i + 1}">${i + 1}</button>`).join('');
    const set = k => {
      n = clamp(k, 1, N); t = 0; const p = get(n);
      if (!p.img) p.img = p.P.render(W, H);
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

    return dt => {
      t += dt; if (auto && (at += dt) > 3.2) { at = 0; if (n < N) set(n + 1); else auto = false; }
      const p = get(n);
      T.use(g); g.clearRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,252,244,.85)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill();
      if (n >= 7) { g.fillStyle = 'rgba(126,170,98,.16)'; g.beginPath(); g.roundRect(100, 470, 820, 105, 30); g.fill(); }
      g.drawImage(p.img, 0, 0);
      // the newest volumes pulse gold for a few seconds
      const pulse = clamp(1 - t / 3) * (.5 + .5 * Math.sin(t * 6));
      if (pulse > 0) Object.values(p.P.rooms).filter(r => r.st === n).forEach(r => {
        g.strokeStyle = `rgba(255,185,81,${.9 * pulse})`; g.lineWidth = 7; g.beginPath();
        if (r.circle) g.arc(r.circle[0], r.circle[1], r.circle[2] + 6, 0, Math.PI * 2); else { r.pts.forEach((q, i) => i ? g.lineTo(...q) : g.moveTo(...q)); g.closePath(); }
        g.stroke();
      });
      Object.values(p.P.rooms).forEach(r => { if (r.lab) T.label(r.lab, r.c[0], r.c[1] + (r.circle ? 0 : r.id === 'G' ? -20 : 0), 'center', C.muted, 13); });
      if (n >= 6) T.label('dais', 520, 190, 'center', C.goldInk, 12);
      if (n >= 7) T.label('yard', 470, 540, 'center', '#4f7a43', 13);
      g.font = '800 15px Montserrat, Jost, sans-serif'; g.fillStyle = C.ink; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillText(`Step ${n} of ${N}: ${STEPS[n - 1][0]}`, 20, 32);
    };
  });
})();
