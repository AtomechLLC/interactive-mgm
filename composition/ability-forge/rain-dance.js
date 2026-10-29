/* Pokémon parallel: Rain Dance (MGM C4 M7, deck slides 94-103). The deck makes up [Extinguish] and [Wet] for Restoring Rain;
   Pokémon has shipped the same idea for years. In rain, Fire-type moves do half damage, Water-type moves do half again, and
   Thunder cannot miss (70% accuracy otherwise). Those are the games' rules; the keyword labels are this page's reading.
   Pick the weather and a move, or watch the walk-through. */
(function () {
  const { $, $$ } = FPF.kit;
  const { pic, text, wrap, chip, card, TONE, panel, scene, clamp, ease, lerp } = CK;
  const T = TD, C = TD.C;
  const MON = { ch: ['pk-charmander.png', 'Charmander', 476, 190, 150, false], sq: ['pk-squirtle.png', 'Squirtle', 150, 404, 150, true], pi: ['pk-pikachu.png', 'Pikachu', 340, 424, 140, true] };
  // move: user, target, type, rule row it uses
  const MOVES = {
    ember: { name: 'Ember', user: 'ch', tgt: 'pi', type: 'Fire', col: '#e5622d' },
    water: { name: 'Water Gun', user: 'sq', tgt: 'ch', type: 'Water', col: '#3f8fd6' },
    thunder: { name: 'Thunder', user: 'pi', tgt: 'ch', type: 'Electric', col: '#d6aa28' },
    rain: { name: 'Rain Dance', user: 'sq', tgt: null, type: 'Water', col: '#3f8fd6' },
  };
  const RULES = [
    ['Fire moves do half damage', ['Extinguish'], 'ember'],
    ['Water moves do 1.5× damage', ['Wet'], 'water'],
    ['Thunder can’t miss (70% otherwise)', ['Wet', 'Shock'], 'thunder'],
  ];
  const TONES = { Extinguish: 'teal', Wet: 'blue', Shock: 'gold' };
  // walk-through: [time, move, hit]
  const TOUR = [[.5, 'ember', 1], [4, 'thunder', 0], [7.5, 'rain', 1], [11, 'ember', 1], [14.5, 'thunder', 1], [18, 'water', 1]];
  const RAIN_AT = 8.6, DUR = 24, MOVE = 3.2;

  function view(t, st, tour) {
    if (!tour) return { m: st.move, at: st.at, hit: st.hit, rain: st.rain, rainK: st.rain ? clamp((t - st.rainAt) / .8) : 0 };
    let i = -1; while (i + 1 < TOUR.length && t >= TOUR[i + 1][0]) i++;
    const rain = t >= RAIN_AT;
    return i < 0 ? { m: null, at: 0, hit: 1, rain, rainK: 0 } : { m: TOUR[i][1], at: TOUR[i][0], hit: TOUR[i][2], rain, rainK: clamp((t - RAIN_AT) / .8) };
  }
  function result(m, rain, hit) {
    if (m === 'ember') return rain ? ['×0.5 damage', C.goldInk] : ['×1 damage', C.redDk];
    if (m === 'water') return rain ? ['×1.5 damage', '#1d5ea8'] : ['×1 damage', C.redDk];
    if (m === 'thunder') return rain ? ['Hit: can’t miss in rain', C.good] : hit ? ['Hit (70% chance)', C.redDk] : ['Missed (70% chance)', C.muted];
    return ['It started to rain!', '#1d5ea8'];
  }

  function rainFx(g, t, k) {
    if (k <= 0) return;
    g.save(); g.beginPath(); g.rect(14, 14, 640, 558); g.clip();
    g.fillStyle = `rgba(60,80,120,${.16 * k})`; g.fillRect(14, 14, 640, 558);
    g.strokeStyle = `rgba(90,140,220,${.55 * k})`; g.lineWidth = 2;
    for (let i = 0; i < 70; i++) { const x = (i * 97.3 + t * 260) % 700 - 20, y = (i * 53.7 + t * 620) % 600; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 7, y + 20); g.stroke(); }
    g.restore();
  }

  function moveFx(g, m, a, rain, hit) {
    const M = MOVES[m], u = MON[M.user], tg = M.tgt && MON[M.tgt];
    if (m === 'ember') {
      for (let j = 0; j < 3; j++) {
        const k = clamp((a - .4 - j * .12) / .7); if (k <= 0 || k >= 1) continue;
        const x = lerp(u[2] - 30, tg[2] + 20, k), y = lerp(u[3] + 20, tg[3] - 40, k) - Math.sin(k * Math.PI) * 40, r = (rain ? 9 : 14) * (1 - .3 * k);
        g.fillStyle = '#ffb951'; g.beginPath(); g.arc(x, y, r + 5, 0, Math.PI * 2); g.fill(); g.fillStyle = '#e5622d'; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      }
      if (a > 1.2 && a < 2) { if (rain) { T.use(g); T.poof(tg[2] + 10, tg[3] - 50, a - 1.2, 34); } else { T.use(g); T.flash(tg[2] + 10, tg[3] - 40, 50, 1 - (a - 1.2) / .8); } }
    }
    if (m === 'water' && a > .4 && a < 1.5) {
      const k = clamp((a - .4) / .5); T.use(g); T.tracer(u[2] + 40, u[3] - 40, lerp(u[2] + 40, tg[2] - 20, k), lerp(u[3] - 40, tg[3], k), 1, '#3f8fd6', rain ? 16 : 10);
    }
    if (m === 'thunder' && a > .7 && a < 1.5) {
      const tx = hit || rain ? tg[2] : tg[2] + 110, k = 1 - (a - .7) / .8;
      g.save(); g.strokeStyle = `rgba(255,214,60,${k})`; g.lineWidth = 9; g.lineJoin = 'round'; g.beginPath(); g.moveTo(tx + 20, 14);
      for (let j = 1; j <= 6; j++) g.lineTo(tx + (j % 2 ? -24 : 22) * (1 - j / 7), 14 + (tg[3] - 30) * j / 6);
      g.stroke(); g.strokeStyle = `rgba(255,255,255,${k})`; g.lineWidth = 3; g.stroke(); g.restore();
    }
    if (m === 'rain' && a < 1.4) { g.fillStyle = `rgba(63,143,214,${.35 * (1 - a / 1.4)})`; g.beginPath(); g.arc(u[2], u[3] - 50, 60 + a * 50, 0, Math.PI * 2); g.fill(); }
  }

  scene('rain-dance', {
    dur: DUR,
    state: () => ({ move: null, at: -9, hit: 1, rain: false, rainAt: -9 }),
    init(s, st, api) {
      $$(s, '.rd-move').forEach(b => b.onclick = () => { api.manual(); const m = b.dataset.m; if (m === 'rain') { st.rain = !st.rain; st.rainAt = st.t; } st.move = m; st.at = st.t; st.hit = Math.random() < .7 ? 1 : 0; sync(); });
      function sync() { $(s, '.rd-move[data-m="rain"]').textContent = st.rain ? 'Clear the rain' : 'Rain Dance'; }
    },
    draw(g, t, st, tour) {
      const v = view(t, st, tour), a = t - v.at;
      // the field
      g.fillStyle = '#cfe8b8'; g.beginPath(); g.roundRect(14, 14, 640, 558, 14); g.fill(); g.strokeStyle = '#9cc28a'; g.lineWidth = 2; g.stroke();
      g.fillStyle = '#b7d89c'; [[476, 250, 120, 30], [150, 470, 110, 26], [340, 490, 100, 24]].forEach(([x, y, rx, ry]) => { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); });
      rainFx(g, t, v.rainK);
      // the Pokémon, a small hop for whoever moves and a shake for whoever is hit
      Object.entries(MON).forEach(([k, [n, name, x, y, w, flip]]) => {
        const M = v.m && MOVES[v.m], user = M && M.user === k, tgt = M && M.tgt === k;
        const hop = user && a < .5 ? -Math.sin(a / .5 * Math.PI) * 16 : 0;
        const landed = v.m === 'thunder' ? (v.hit || v.rain) : true, shake = tgt && landed && a > 1.2 && a < 1.7 ? Math.sin(a * 60) * 6 : 0;
        pic(g, n, x + shake, y + hop, w, { flip });
        text(g, name, x, y + w / 2 + 6, { size: 13, w: 800, col: C.navy, stroke: 4 });
      });
      if (v.m) moveFx(g, v.m, a, v.rain && v.m !== 'rain', v.hit);
      // the result on the target
      if (v.m && a > 1.2 && a < MOVE) { const [s, col] = result(v.m, v.rain, v.hit), tg = MOVES[v.m].tgt ? MON[MOVES[v.m].tgt] : MON.sq; chip(g, s, tg[2], tg[3] - tg[4] / 2 - 18, { fill: '#fffaf0', edge: col, col, size: 15, a: clamp((a - 1.2) / .3) }); }
      // the battle text box
      card(g, 334, 538, 600, 52, { edge: C.navy, lw: 3, r: 8, shadow: false });
      text(g, v.m ? `${MON[MOVES[v.m].user][1]} used ${MOVES[v.m].name}!` : v.rain ? 'It’s raining.' : 'The weather is clear.', 54, 538, { align: 'left', size: 17, w: 700 });
      chip(g, v.rain ? 'Weather: Rain' : 'Weather: Clear', 564, 538, { ...(v.rain ? TONE.blue : TONE.grey), size: 13 });
      // the rules rain turns on
      panel(g, 668, 14, 358, 558, { title: 'What Rain Dance changes' });
      RULES.forEach(([s, keys, m], i) => {
        const y = 84 + i * 118, on = v.rain, used = on && v.m === m && a > 1.2 && a < MOVE;
        card(g, 847, y + 18, 330, 100, { edge: used ? C.gold : on ? '#8ea2e6' : '#cdbf9f', lw: used ? 4 : 2, shadow: false, fill: on ? '#fffaf0' : 'rgba(255,250,240,.5)' });
        text(g, s, 694, y, { align: 'left', size: 15, w: 800, col: on ? C.ink : C.muted });
        let cx = 694; keys.forEach((k, j) => { if (j) { text(g, '+', cx + 6, y + 36, { size: 15, w: 800, col: C.muted }); cx += 16; } cx += chip(g, `[${k}]`, cx, y + 36, { ...TONE[TONES[k]], size: 14, align: 'left', a: on ? 1 : .4 }) + 6; });
      });
      const kk = tour ? clamp((t - 20.5) / .5) : 1;
      g.save(); g.globalAlpha = .35 + .65 * kk;
      card(g, 847, 488, 330, 120, { fill: '#eadcfb', edge: '#a77fe0', shadow: false });
      text(g, 'Restoring Rain, from the deck', 694, 452, { align: 'left', size: 15, w: 800, col: '#4b2286' });
      wrap(g, 'Same move, made up: [Extinguish] puts out the Flame Demon, [Wet] lets lightning arc through whoever is soaked.', 694, 478, 304, { size: 13.5, lh: 17, col: C.ink });
      g.restore();
    },
    side(t, st, tour) {
      const v = view(t, st, tour);
      if (!v.m) return { out: 'Pick the weather, then a move.' };
      const [s] = result(v.m, v.rain, v.hit);
      return { out: `<b>${MOVES[v.m].name}</b>${v.m === 'rain' ? '' : v.rain ? ' in the rain' : ' in clear weather'}: ${s.toLowerCase()}.` };
    },
  });
})();
