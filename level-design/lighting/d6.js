/* Six ways to light a hall (The Level Design Book: Lighting, D6 lighting)
   The book names six lighting strategies after the faces of a die and treats them as lighting for flow: where should
   the player go? It describes the first three (a lone focal light, two lights framing an opening, spotlights washing a
   wall); its notes for the last three are still to be written, so the "space" drawings here are our own reading.
   The hall is drawn with ../shared/plan.js, then covered in darkness that each light cuts a hole in.
   Stats are sampled from the same light list on a grid over the hall: brightness at a point is 1 - product(1 - falloff). */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp } = TD;
  const W = 1040, H = 585;
  const P = PLAN.make();
  P.rect('Hh', 250, 110, 790, 470, { cham: [0, 1, 2, 3], k: 46 });
  P.rect('S', 470, 470, 570, 555, { lab: 'start' });
  P.rect('X', 790, 150, 930, 250, { tint: '#f6e6bc' });
  P.round('N', 190, 290, 58, { tint: '#efe6d2' });
  P.door('Hh', 'S', [520, 470], 0, 'arch'); P.door('Hh', 'X', [790, 200], 90, 'arch'); P.door('Hh', 'N', [249, 290], 90, 'arch');
  [[360, 200], [360, 380], [470, 200], [470, 380], [580, 200], [580, 380], [690, 380]].forEach(([x, y]) => P.prop('column', x, y, 8));
  P.mark('statue', 188, 290, .8);
  const EXIT = [770, 200], STATUE = [200, 290], START = [520, 440];
  const ROUTE = { exit: [[520, 440], [560, 360], [640, 290], [720, 230], [770, 200]], statue: [[520, 440], [460, 370], [380, 320], [300, 295], [240, 290]] };
  const FACES = [['point', 'Focal point'], ['frame', 'Focal frame'], ['path', 'Path'], ['space', 'Space'], ['spacepoint', 'Space + focal point'], ['spacepath', 'Space + framed path']];
  // each light: [x, y, radius, strength, fixture?]
  function lights(k, goal) {
    const G = goal === 'exit' ? EXIT : STATUE, out = goal === 'exit' ? [1, 0] : [-1, 0], n = [0, 1], L = [];
    const point = () => L.push([G[0] - out[0] * 24, G[1], 120, 1, 1]);
    const frame = () => [-1, 1].forEach(sg => L.push([G[0] - out[0] * 14 + n[0] * sg * 44, G[1] + n[1] * sg * 44, 62, .95, 1]));
    const path = () => ROUTE[goal].slice(0, -1).forEach(p => L.push([p[0], p[1], 70, .8, 1]));
    const space = () => { for (let x = 330; x <= 710; x += 126) for (let y = 190; y <= 390; y += 100) L.push([x, y, 150, .34, 0]); L.push([520, 500, 90, .3, 0]); };
    if (k === 'point') point(); if (k === 'frame') frame(); if (k === 'path') path(); if (k === 'space') space();
    if (k === 'spacepoint') { space(); point(); } if (k === 'spacepath') { space(); path(); frame(); }
    L.push([START[0], START[1] + 60, 60, .5, 0]);   // a little light where the player stands, so the start is never black
    return L;
  }
  const bright = (L, x, y) => 1 - L.reduce((m, l) => m * (1 - l[3] * clamp(1 - Math.hypot(x - l[0], y - l[1]) / l[2])), 1);

  canvasDemo('d6', (s, cv, g) => {
    let k = 'point', goal = 'exit', L = [], t = 0, m = {};
    const plan = P.render(W, H), dark = document.createElement('canvas'); dark.width = W; dark.height = H; const dg = dark.getContext('2d');
    const pick = $(s, '.d6-pick');
    pick.innerHTML = FACES.map(([id, n], i) => `<button class="btn${i ? '' : ' on'}" data-v="${id}">${'⚀⚁⚂⚃⚄⚅'[i]} ${n}</button>`).join('');
    function set() {
      L = lights(k, goal);
      dg.globalCompositeOperation = 'source-over'; dg.clearRect(0, 0, W, H); dg.fillStyle = 'rgba(9,12,34,.9)'; dg.fillRect(0, 0, W, H);
      dg.globalCompositeOperation = 'destination-out';
      L.forEach(([x, y, r, a]) => { const gr = dg.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(.5, `rgba(0,0,0,${a * .6})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); dg.fillStyle = gr; dg.beginPath(); dg.arc(x, y, r, 0, T.TAU); dg.fill(); });
      // measure: share of the hall floor that is lit, and how far the goal stands out from the average
      let lit = 0, n = 0, sum = 0;
      for (let x = 262; x < 790; x += 12) for (let y = 122; y < 470; y += 12) { const b = bright(L, x, y); n++; sum += b; if (b > .25) lit++; }
      const G = goal === 'exit' ? EXIT : STATUE, gb = Math.max(...[-50, -25, 0, 25, 50].flatMap(dx => [-50, -25, 0, 25, 50].map(dy => bright(L, G[0] + dx, G[1] + dy)))), other = goal === 'exit' ? STATUE : EXIT, ob = bright(L, other[0] + (goal === 'exit' ? 24 : -24), other[1]);
      m = { lit: lit / n, n: L.length - 1, fixtures: L.filter(l => l[4]).length, ratio: gb / Math.max(.05, sum / n), gb, ob };
      const stands = m.gb > .4 && m.ratio > 1.5, name = goal === 'exit' ? 'the exit' : 'the statue';
      say($(s, '.d6-stats'),
        `<div><b>${m.n}</b><span>light sources, ${m.fixtures} of them with a visible fixture</span></div>` +
        `<div><b>${Math.round(m.lit * 100)}%</b><span>of the hall floor is lit</span></div>` +
        `<div class="${stands ? 'g' : 'y'}"><b>${m.ratio.toFixed(1)}×</b><span>${stands ? `${name} is this much brighter than the room’s average` : `${name} against the room’s average: nothing pulls the eye`}</span></div>`);
      const TXT = {
        point: `<b class="accent">One: a focal point.</b> A lone light on ${name} says “go here”, and the dark around it does the rest. A spotlight also implies the angle to approach from. The cost: the player cannot read the room they are crossing.`,
        frame: `<b class="accent">Two: a focal frame.</b> A pair of matching lights either side of ${name} makes a gateway of the space between them and suggests walking straight through it. Torches or sconces beside a door are the usual fixtures.`,
        path: `<b class="accent">Three: a path.</b> A row of lights makes a line to follow. The book’s version washes a wall evenly with angled spotlights, so the lit boundary leads the eye along it. Here the pools run from the start to ${name}.`,
        space: `<b class="accent">Four: a space.</b> Even light shows the whole hall, columns and all, but gives no direction: ${name} is no brighter than anything else. The player explores instead of being led. (Our reading; the book’s note is unwritten.)`,
        spacepoint: `<b class="accent">Five: a space with a focal point.</b> The hall is readable and ${name} still wins. This is the cheapest way to get both orientation and direction. (Our reading; the book’s note is unwritten.)`,
        spacepath: `<b class="accent">Six: a space with a framed path.</b> General light, a line of pools and a framed opening at the end: the most guidance and the most light sources. (Our reading; the book’s note is unwritten.)`,
      };
      say($(s, '.d6-out'), TXT[k]);
    }
    $$(pick, '.btn').forEach(b => b.onclick = () => { k = b.dataset.v; $$(pick, '.btn').forEach(x => x.classList.toggle('on', x === b)); set(); });
    $$(s, '.d6-goal .btn').forEach(b => b.onclick = () => { goal = b.dataset.v; $$(s, '.d6-goal .btn').forEach(x => x.classList.toggle('on', x === b)); set(); });
    set();
    window.__d6Set = (kk, gg) => { k = kk; goal = gg || 'exit'; $$(pick, '.btn').forEach(x => x.classList.toggle('on', x.dataset.v === k)); $$(s, '.d6-goal .btn').forEach(x => x.classList.toggle('on', x.dataset.v === goal)); set(); return m; };

    return dt => {
      t += dt; T.use(g); g.clearRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,252,244,.85)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill();
      g.drawImage(plan, 0, 0); T.flag(880, 196);
      const p = ROUTE[goal], kk = (t * .22) % 1.25, f = clamp(kk) * (p.length - 1), i = Math.min(p.length - 2, Math.floor(f)), u = f - i;
      T.player(p[i][0] + (p[i + 1][0] - p[i][0]) * u, p[i][1] + (p[i + 1][1] - p[i][1]) * u, Math.atan2(p[i + 1][1] - p[i][1], p[i + 1][0] - p[i][0]), .75);
      g.save(); g.beginPath(); g.roundRect(0, 0, W, H, 14); g.clip(); g.drawImage(dark, 0, 0); g.restore();
      // warm glow and a fixture dot for every motivated light
      L.forEach(([x, y, r, a, fix]) => {
        const gr = g.createRadialGradient(x, y, 0, x, y, r * .8); gr.addColorStop(0, `rgba(255,214,130,${.28 * a})`); gr.addColorStop(1, 'rgba(255,214,130,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r * .8, 0, T.TAU); g.fill();
        if (fix) { g.fillStyle = '#fff3c4'; g.strokeStyle = C.goldInk; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 5 + .6 * Math.sin(t * 9 + x), 0, T.TAU); g.fill(); g.stroke(); }
      });
      g.font = '600 13px Jost, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(255,255,255,.8)';
      g.fillText('exit', 860, 268); g.fillText('statue', 190, 366); g.fillText('start', 520, 570);
    };
  });
})();
