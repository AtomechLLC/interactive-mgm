/* Module 0, slides 4-17: the road from designer to director, as one picture.
   Studio: the roles of slide 7 fly in and connect to the designer, who grows into a "Junior Director" (slide 10).
   Small project: the same roles slide inward and stack on one person (slide 8, 17).
   Seniority: direction becomes more critical as a designer becomes more senior (slide 16). */
(function () {
  const { $, $$, say } = FPF.kit;
  const C = TD.C, { clamp, lerp, ease } = TD, TAU = Math.PI * 2;
  const { txt, wrap, box } = SCENE;
  const W = 1040, H = 585, IMG = '../img/';
  const ROLES = [['Programmer', 'laptop', '#2ea3dc'], ['Animator', 'walk', '#8a4fd6'], ['Environment Artist', 'pine-tree', '#2fae63'], ['Character Designer', 'paint-brush', '#e5322d'], ['Level Designer', 'maze', '#9a5a06'], ['Balancer', 'scales', '#5562eb']];
  ROLES.forEach(r => SCENE.img(IMG + r[1] + '-w.svg')); ['person', 'megaphone'].forEach(n => SCENE.img(IMG + n + '-w.svg'));
  const LADDER = [['Junior', .15, 'gives the project little direction'], ['Mid', .35, 'directs their own features'], ['Senior', .6, 'sets direction for a whole area'], ['Lead', .8, 'brings the team together around one direction'], ['Director', 1, 'holds the vision for the whole project']];
  const DUR = 22;
  const tourMode = t => t < 8 ? 'studio' : t < 14.5 ? 'small' : 'ladder';
  function badge(g, x, y, r, [n, ic, col], a = 1, label = true) {
    g.save(); g.globalAlpha *= a;
    g.fillStyle = col; g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.stroke();
    SCENE.draw(g, IMG + ic + '-w.svg', x - r * .62, y - r * .62, r * 1.24);
    if (label) txt(g, n, x, y + r + 20, { size: 14, align: 'center' });
    g.restore();
  }
  function designer(g, x, y, r, director) {
    g.fillStyle = C.navy; g.strokeStyle = director ? C.gold : '#fff'; g.lineWidth = director ? 6 : 4; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.stroke();
    SCENE.draw(g, IMG + 'person-w.svg', x - r * .6, y - r * .62, r * 1.2);
    if (director) { g.fillStyle = C.gold; g.beginPath(); g.arc(x + r * .75, y - r * .75, r * .38, 0, TAU); g.fill(); SCENE.draw(g, IMG + 'megaphone-w.svg', x + r * .75 - r * .26, y - r * .75 - r * .26, r * .52); }
  }
  function draw(g, st, t) {
    SCENE.paper(g, W, H);
    const mode = st.tour ? tourMode(t) : st.mode;
    const CX = 380, CY = 300;
    if (mode === 'studio') {
      const n = st.tour ? clamp((t - .6) / 1, 0, 6) : st.n;
      ROLES.forEach((r, i) => {
        const k = clamp(n - i); if (k <= 0) return;
        const a = -Math.PI / 2 + i * TAU / 6, R = 210, x = CX + Math.cos(a) * lerp(420, R, ease(k)), y = CY + Math.sin(a) * lerp(420, R, ease(k)) * .9;
        g.strokeStyle = r[2]; g.lineWidth = 4; g.globalAlpha = ease(k); g.setLineDash([8, 6]); g.beginPath(); g.moveTo(CX, CY); g.lineTo(lerp(CX, x, ease(k)), lerp(CY, y, ease(k))); g.stroke(); g.setLineDash([]); g.globalAlpha = 1;
        badge(g, x, y, 36, r, ease(k));
      });
      const full = n >= 6;
      designer(g, CX, CY, 58 + n * 3, full);
      txt(g, full ? 'Junior Director' : 'Designer', CX, CY + 96 + n * 3, { size: 18, align: 'center', col: full ? C.goldInk : C.ink });
      side(g, 'Designers interface with many roles', ['Programmers, animators, environment artists, character designers, level designers, balancers, and many more…', 'So the job is bringing the team together and creating a direction for the project.', full ? 'In other words, a designer is like a Junior Director.' : ''], Math.floor(n));
    } else if (mode === 'small') {
      const k = st.tour ? ease(clamp((t - 8.4) / 2.6)) : 1;
      ROLES.forEach((r, i) => {
        const a = -Math.PI / 2 + i * TAU / 6, R = lerp(210, 92, k), x = CX + Math.cos(a) * R, y = CY + Math.sin(a) * R * lerp(.9, 1, k);
        if (k < 1) { g.strokeStyle = r[2]; g.lineWidth = 4; g.globalAlpha = 1 - k; g.beginPath(); g.moveTo(CX, CY); g.lineTo(x, y); g.stroke(); g.globalAlpha = 1; }
        badge(g, x, y, lerp(36, 26, k), r, 1, k < .6);
      });
      designer(g, CX, CY, lerp(76, 60, k), true);
      txt(g, k >= 1 ? 'One person, every role' : 'Small project', CX, CY + 150, { size: 18, align: 'center', col: C.goldInk });
      side(g, 'In small projects, those roles are all the same person', ['…or just you!', 'Indie game designers are frequently also the directors, and the programmers, artists, animators and level designers.'], 2);
    } else {
      const k = st.tour ? clamp((t - 14.8) / 5) : 1;
      txt(g, 'Direction becomes more critical as a designer becomes more senior', 30, 50, { size: 20 });
      LADDER.forEach(([n, d, why], i) => {
        const y = 90 + i * 92, a = clamp(k * 5 - i), bw = 520 * d * ease(a);
        designer(g, 70, y + 36, 26 + i * 3, i === 4 && a >= 1);
        txt(g, n, 120, y + 30, { size: 18, a: Math.max(.3, a) });
        txt(g, why, 120, y + 54, { size: 14, font: 'b', w: 600, col: C.muted, a: Math.max(.3, a) });
        g.fillStyle = '#e6dcc5'; g.beginPath(); g.roundRect(460, y + 22, 520, 22, 11); g.fill();
        g.fillStyle = C.gold; g.beginPath(); g.roundRect(460, y + 22, Math.max(0, bw), 22, 11); g.fill();
      });
      txt(g, 'direction given to the project →', 980, 570, { size: 13, align: 'right', col: C.muted });
    }
  }
  function side(g, head, lines, n) {
    const X = 690; wrap(g, head, X, 70, 320, { size: 22, font: 'd', w: 800, lh: 28 });
    let y = 170; lines.forEach((l, i) => { if (!l || i > n) return; y = wrap(g, l, X, y, 320, { size: 17, lh: 24, col: i === 2 ? C.goldInk : C.ink, w: i === 2 ? 700 : 500 }) + 14; });
  }
  SCENE('director', {
    dur: DUR,
    init(st) {
      st.mode = 'studio'; st.n = 6;
      const bs = $$(st.s, '.dd-mode .btn'), r = $(st.s, '.dd-n input'), o = $(st.s, '.dd-n b');
      st.setMode = m => { st.mode = m; bs.forEach(b => b.classList.toggle('on', b.dataset.m === m)); };
      bs.forEach(b => b.onclick = () => { st.manual(); st.setMode(b.dataset.m); });
      r.oninput = () => { st.manual(); st.setMode('studio'); st.n = +r.value; o.textContent = r.value; };
    },
    side(st, t) {
      const mode = st.tour ? tourMode(t) : st.mode;
      if (st.tour) $$(st.s, '.dd-mode .btn').forEach(b => b.classList.toggle('on', b.dataset.m === mode));
      if (mode === st.k) return; st.k = mode;
      say($(st.s, '.dd-out'), { studio: 'Each role a designer works with is one more line to hold together. Hold all of them and you are giving the project its direction.', small: 'On a small team the lines collapse: the designer is the programmer, the artist and the director at once.', ladder: 'Junior designers don’t give the project much direction. As they become more senior, direction becomes the job.' }[mode]);
    },
    draw,
  });
})();
