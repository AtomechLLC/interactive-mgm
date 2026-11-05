/* Is there a clear best answer? Slide 1: Pikachu against a water team (DGMS Module 3, Leveraging Player Skills).
   Notes: "Am I making something with a clear best answer?"
   Pikachu has four moves: Thunderbolt, Grass Knot, Iron Tail and Quick Attack. Three opponent setups:
   - Gyarados every turn: Thunderbolt is the top pick every turn, so the menu is a formality.
   - Water team (Gyarados, Quagsire, Lapras): the top pick changes with the opponent, but each turn still has one clear answer
     (Quagsire is Water/Ground, so Thunderbolt does nothing and Grass Knot hits four times over). That is a knowledge test.
   - Team that reads you: half the time the trainer switches to the Pokemon that walls your obvious move before it lands,
     so the top pick depends on what the opponent expects, and two moves are often worth considering. That is a decision.
   Damage is simplified to power x type multiplier x same-type bonus (1.5 for Thunderbolt) x accuracy, scaled so Thunderbolt
   knocks out Gyarados (540 = a full bar). Type multipliers, base powers, accuracy and Grass Knot's weight tiers are the
   games' own; the HP scale and the 50% switch chance are illustrative.
   Sprites: Pokemon Black and White front sprites (Gyarados, Quagsire, Lapras) and Pikachu's back sprite, from the PokeAPI
   sprites repository, in ../img/best-answer/. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const W = 1040, H = 585, TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k;
  const ease = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  const INK = '#262c6a', NAVY = '#152044', MUTED = '#5d618c', GOLD = '#ffb951', GOLDINK = '#9a5a06', RED = '#e5322d', GREEN = '#1a8a4c';

  const IMG = {};
  ['gyarados', 'quagsire', 'lapras', 'pikachu-back'].forEach(k => { const im = new Image(); im.src = `../img/best-answer/${k}.png`; IMG[k] = im; });

  const TYPE = { Electric: '#e8b41a', Grass: '#4fa83a', Steel: '#7f8aa3', Normal: '#9c9a72', Water: '#4a86e0', Flying: '#8b9ee8', Ground: '#c49a3c', Ice: '#4fb8c0' };
  const CHART = { Electric: { Water: 2, Flying: 2, Ground: 0 }, Grass: { Water: 2, Flying: .5, Ground: 2 }, Steel: { Water: .5, Ice: 2 }, Normal: {} };
  const MON = {
    gy: { name: 'Gyarados', img: 'gyarados', types: ['Water', 'Flying'], kg: 235 },
    qu: { name: 'Quagsire', img: 'quagsire', types: ['Water', 'Ground'], kg: 75 },
    la: { name: 'Lapras', img: 'lapras', types: ['Water', 'Ice'], kg: 220 },
  };
  const MOVES = [
    { k: 'tb', name: 'Thunderbolt', ab: 'TB', type: 'Electric', pow: () => 90, acc: 1, stab: 1.5 },
    { k: 'gk', name: 'Grass Knot', ab: 'GK', type: 'Grass', pow: m => m.kg >= 200 ? 120 : m.kg >= 100 ? 100 : m.kg >= 50 ? 80 : 60, acc: 1, stab: 1 },
    { k: 'it', name: 'Iron Tail', ab: 'IT', type: 'Steel', pow: () => 100, acc: .75, stab: 1 },
    { k: 'qa', name: 'Quick Attack', ab: 'QA', type: 'Normal', pow: () => 40, acc: 1, stab: 1 },
  ];
  const APIS = window.BA_APIS = window.BA_APIS || {};
  const P = { FULL: 540, CONSIDER: .75, Q: .5, ROUND: 8, TL: 2.3, INTRO: 1.2 };
  const MODES = {
    one: { label: 'Gyarados every turn', team: ['gy'], q: 0 },
    team: { label: 'Water team', team: ['gy', 'qu', 'la'], q: 0 },
    reads: { label: 'Team that reads you', team: ['gy', 'qu', 'la'], q: P.Q },
  };
  const mult = (mv, m) => m.types.reduce((a, t) => a * (CHART[mv.type][t] ?? 1), 1);
  const dmg = (mv, m) => clamp(mv.pow(m) * mv.stab * mult(mv, m) * mv.acc / P.FULL);   // share of the HP bar, expected
  const best = (m) => MOVES.reduce((b, mv) => dmg(mv, MON[m]) > dmg(b, MON[m]) ? mv : b);
  // the trainer who reads you switches to whichever teammate takes the least from your obvious move
  function counter(mode, face) {
    const ob = best(face);
    return MODES[mode].team.reduce((c, k) => dmg(ob, MON[k]) < dmg(ob, MON[c]) ? k : c, face);
  }
  function forecast(mode, face) {
    const q = MODES[mode].q, cn = counter(mode, face), sw = q > 0 && cn !== face;
    const ev = MOVES.map(mv => sw ? (1 - q) * dmg(mv, MON[face]) + q * dmg(mv, MON[cn]) : dmg(mv, MON[face]));
    const top = ev.indexOf(Math.max(...ev));
    return { ev, top, cn, sw, consider: ev.filter(v => v >= P.CONSIDER * ev[top]).length,
      stay: MOVES.map(mv => dmg(mv, MON[face])), swap: MOVES.map(mv => dmg(mv, MON[cn])) };
  }
  function resolve(mode, face, switched, pick) {
    const f = forecast(mode, face), target = switched && f.sw ? f.cn : face, mv = MOVES[pick];
    return { face, target, switched: target !== face, pick, top: f.top, consider: f.consider, dealt: dmg(mv, MON[target]), mult: mult(mv, MON[target]) };
  }

  // the walk-through: four turns per setup, picks follow the forecast's top move
  const TOUR = [
    ['one', [['gy', 0], ['gy', 0], ['gy', 0], ['gy', 0]]],
    ['team', [['qu', 0], ['gy', 0], ['la', 0], ['qu', 0]]],
    ['reads', [['gy', 1], ['la', 0], ['qu', 1], ['gy', 0]]],
  ];
  const PHASE = P.INTRO + 4 * P.TL, DUR = PHASE * 3 + 1.6;

  function rng(seed) { return () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  /* ---------- drawing ---------- */
  const txt = (g, s, x, y, font, col = INK, al = 'left') => { g.font = font; g.fillStyle = col; g.textAlign = al; g.textBaseline = 'middle'; g.fillText(s, x, y); };
  const rr = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
  function pill(g, s, x, y, col, h = 20, font = '700 12px Jost, sans-serif') {
    g.font = font; const w = g.measureText(s).width + 16;
    g.fillStyle = col; rr(g, x, y - h / 2, w, h, h / 2); g.fill();
    txt(g, s, x + w / 2, y + 1, font, col === TYPE.Electric ? NAVY : '#fff', 'center'); return w;
  }
  function sprite(g, k, cx, by, s, a = 1, flash = 0) {
    const im = IMG[k]; if (!im.complete || !im.naturalWidth) return;
    g.save(); g.globalAlpha = a; g.imageSmoothingEnabled = false;
    const w = 96 * s; g.drawImage(im, cx - w / 2, by - w, w, w);
    if (flash > 0) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = `rgba(255,255,255,${flash})`; g.fillRect(cx - w / 2, by - w, w, w); }
    g.restore();
  }
  function hpBox(g, x, y, w, name, types, hp, tag = 'Lv50') {
    g.fillStyle = 'rgba(255,252,244,.96)'; rr(g, x, y, w, 64, 10); g.fill(); g.strokeStyle = NAVY; g.lineWidth = 2.5; g.stroke();
    txt(g, name, x + 14, y + 19, '800 17px Montserrat, Jost, sans-serif', INK);
    txt(g, tag, x + w - 14, y + 19, '700 13px Jost, sans-serif', MUTED, 'right');
    let px = x + 14; types.forEach(t => { px += pill(g, t, px, y + 44, TYPE[t], 18, '700 11px Jost, sans-serif') + 5; });
    const bx = x + w - 136, bw = 122;
    txt(g, 'HP', bx - 6, y + 44, '800 11px Montserrat, sans-serif', GOLDINK, 'right');
    g.fillStyle = '#3a3f5c'; rr(g, bx, y + 38, bw, 12, 6); g.fill();
    const col = hp > .5 ? '#3cc46a' : hp > .2 ? '#f0b42a' : RED;
    if (hp > 0) { g.fillStyle = col; rr(g, bx + 2, y + 40, (bw - 4) * hp, 8, 4); g.fill(); }
  }
  function scene(g, v) {
    // backdrop
    const sky = g.createLinearGradient(0, 0, 0, 340); sky.addColorStop(0, '#cfe8f6'); sky.addColorStop(1, '#eef6e4');
    g.fillStyle = sky; rr(g, 0, 0, 620, 400, 14); g.fill();
    g.fillStyle = '#b9d98f'; g.beginPath(); g.ellipse(470, 238, 130, 30, 0, 0, TAU); g.fill();
    g.fillStyle = '#a3c977'; g.beginPath(); g.ellipse(470, 238, 100, 20, 0, 0, TAU); g.fill();
    g.fillStyle = '#b9d98f'; g.beginPath(); g.ellipse(170, 372, 170, 36, 0, 0, TAU); g.fill();
    // opponent: switching shrinks the old one out and grows the new one in
    const c = v.cur, k = c.k;
    let shown = c.face, s = 2.3, a = 1, flash = 0, drop = 0;
    if (c.pick != null && c.res.switched) {
      if (k < .35) { s = lerp(2.3, .2, ease(k / .35)); a = 1 - k / .35; }
      else { shown = c.res.target; s = lerp(.2, 2.3, ease(clamp((k - .35) / .3))); a = clamp((k - .35) / .2); }
    }
    const tgt = c.pick != null && k >= .35 ? c.res.target : c.face;
    let hp = 1;
    if (c.pick != null) {
      const hk = clamp((k - .75) / .45);
      hp = 1 - c.res.dealt * ease(hk);
      if (k > .7 && k < 1.15 && c.res.dealt > 0) flash = Math.floor((k - .7) * 16) % 2 ? .85 : 0;
      if (c.res.dealt >= 1 && k > 1.45) { drop = ease(clamp((k - 1.45) / .4)); a *= 1 - drop; }
    }
    sprite(g, MON[shown].img, 470, 246 + drop * 60, s, a, flash);
    // attack burst
    if (c.pick != null && k > .6 && k < 1.05) {
      const col = TYPE[MOVES[c.pick].type], bk = (k - .6) / .45;
      g.save(); g.globalAlpha = 1 - bk; g.strokeStyle = col; g.lineWidth = 6;
      for (let i = 0; i < 8; i++) { const an = i / 8 * TAU + bk; g.beginPath(); g.moveTo(470 + Math.cos(an) * 30 * (1 + bk * 2), 150 + Math.sin(an) * 30 * (1 + bk * 2)); g.lineTo(470 + Math.cos(an) * 60 * (1 + bk * 2), 150 + Math.sin(an) * 60 * (1 + bk * 2)); g.stroke(); }
      g.restore();
    }
    sprite(g, 'pikachu-back', 175, 420, 3);
    hpBox(g, 22, 22, 300, MON[tgt].name, MON[tgt].types, hp);
    hpBox(g, 352, 264, 252, 'Pikachu', ['Electric'], 1);
    // battle text
    g.fillStyle = NAVY; rr(g, 0, 340, 620, 60, 0); g.fill();
    g.fillStyle = '#fffaf0'; rr(g, 8, 346, 604, 48, 8); g.fill();
    txt(g, v.msg, 24, 370, '700 18px Jost, sans-serif', INK);
  }
  const BTN = MOVES.map((mv, i) => ({ x: 6 + (i % 2) * 307, y: 410 + Math.floor(i / 2) * 86, w: 301, h: 80 }));
  function menu(g, v) {
    const f = v.fc, cur = v.cur;
    MOVES.forEach((mv, i) => {
      const b = BTN[i], top = i === f.top, consider = f.ev[i] >= P.CONSIDER * f.ev[f.top], picked = cur.pick === i, hover = v.hover === i && cur.pick == null;
      g.fillStyle = picked ? '#fff1d0' : hover ? '#fffaf0' : 'rgba(255,252,244,.92)'; rr(g, b.x, b.y, b.w, b.h, 12); g.fill();
      g.strokeStyle = top ? GOLD : consider ? '#e9c98a' : '#cdbf9f'; g.lineWidth = top ? 4 : 2;
      if (consider && !top) g.setLineDash([7, 5]);
      g.stroke(); g.setLineDash([]);
      g.fillStyle = TYPE[mv.type]; rr(g, b.x, b.y, 10, b.h, [12, 0, 0, 12]); g.fill();
      txt(g, `${i + 1}  ${mv.name}`, b.x + 22, b.y + 20, '800 17px Montserrat, Jost, sans-serif', INK);
      pill(g, mv.type, b.x + b.w - 14 - (g.measureText(mv.type).width + 16) - 0, b.y + 20, TYPE[mv.type], 18, '700 11px Jost, sans-serif');
      // expected damage bar
      const bx = b.x + 22, by = b.y + 42, bw = 170;
      g.fillStyle = '#e8dcc0'; rr(g, bx, by, bw, 12, 6); g.fill();
      if (f.ev[i] > 0) { g.fillStyle = top ? '#e5962a' : '#b9a26f'; rr(g, bx, by, Math.max(6, bw * f.ev[i]), 12, 6); g.fill(); }
      txt(g, `${Math.round(f.ev[i] * 100)}%`, bx + bw + 10, by + 6, '800 15px Montserrat, Jost, sans-serif', f.ev[i] ? INK : RED);
      txt(g, f.sw ? `stays ${Math.round(f.stay[i] * 100)}% · ${MON[f.cn].name} ${Math.round(f.swap[i] * 100)}%` : f.ev[i] === 0 ? 'no effect' : mult(mv, MON[cur.face]) >= 2 ? 'super effective' : mult(mv, MON[cur.face]) < 1 ? 'not very effective' : 'neutral',
        bx, b.y + 68, '500 12px Jost, sans-serif', MUTED);
      if (top) { g.font = '800 11px Montserrat, sans-serif'; const w = g.measureText('TOP PICK').width + 14; g.fillStyle = GOLD; rr(g, b.x + b.w - w - 10, b.y + b.h - 26, w, 18, 9); g.fill(); txt(g, 'TOP PICK', b.x + b.w - w / 2 - 10, b.y + b.h - 16, '800 11px Montserrat, sans-serif', NAVY, 'center'); }
    });
  }
  function side(g, v) {
    const x0 = 650;
    txt(g, MODES[v.mode].label, x0, 30, '800 21px Montserrat, Jost, sans-serif', INK);
    const team = MODES[v.mode].team;
    txt(g, team.length === 1 ? 'the same opponent every turn' : MODES[v.mode].q ? 'switches before your move half the time' : 'a random teammate each turn, no switching', x0, 56, '600 14px Jost, sans-serif', MUTED);
    // turn log
    txt(g, 'Turn log', x0, 92, '800 15px Montserrat, Jost, sans-serif', INK);
    txt(g, 'gold ring = you used the top pick', x0 + 372, 92, '500 12px Jost, sans-serif', MUTED, 'right');
    const n = v.round, big = n <= 4, ch = big ? 200 : 96;
    for (let i = 0; i < n; i++) {
      const cx = x0 + (i % 4) * 94, cy = 108 + Math.floor(i / 4) * 104, e = v.log[i];
      g.fillStyle = e ? 'rgba(255,252,244,.95)' : 'rgba(255,252,244,.45)'; rr(g, cx, cy, 86, ch, 10); g.fill();
      g.strokeStyle = e && e.pick === e.top ? GOLD : '#cdbf9f'; g.lineWidth = e && e.pick === e.top ? 3.5 : 1.5; g.stroke();
      if (!e) { txt(g, `${i + 1}`, cx + 43, cy + ch / 2, '700 18px Montserrat, sans-serif', '#cdbf9f', 'center'); continue; }
      if (big) txt(g, `turn ${i + 1}`, cx + 43, cy + 22, '700 12px Jost, sans-serif', MUTED, 'center');
      sprite(g, MON[e.target].img, cx + 43, cy + ch - 40, big ? .95 : .62, 1);
      if (e.switched) txt(g, '⇄', cx + 10, cy + 14, '800 14px Jost, sans-serif', RED);
      const mv = MOVES[e.pick];
      g.fillStyle = TYPE[mv.type]; rr(g, cx + 8, cy + ch - 32, 70, 24, 12); g.fill();
      txt(g, `${mv.ab} ${Math.round(e.dealt * 100)}%`, cx + 43, cy + ch - 19, '800 13px Montserrat, sans-serif', mv.type === 'Electric' ? NAVY : '#fff', 'center');
    }
    // tallies
    const done = v.log.length, ever = new Set(v.log.map(e => e.top)).size, multi = v.log.filter(e => e.consider > 1).length;
    const y = 338;
    txt(g, done ? `${ever}` : '–', x0, y + 20, '800 38px Montserrat, Jost, sans-serif', ever > 1 ? GREEN : RED);
    txt(g, 'of 4 moves were ever the top pick', x0 + 58, y + 12, '600 15px Jost, sans-serif', INK);
    txt(g, 'different answers across the turns', x0 + 58, y + 31, '500 13px Jost, sans-serif', MUTED);
    txt(g, done ? `${multi}/${done}` : '–', x0, y + 84, '800 38px Montserrat, Jost, sans-serif', multi ? GREEN : RED);
    txt(g, 'turns with a real decision', x0 + 86, y + 76, '600 15px Jost, sans-serif', INK);
    txt(g, `two or more moves within ${Math.round((1 - P.CONSIDER) * 100)}% of the top pick`, x0 + 86, y + 95, '500 13px Jost, sans-serif', MUTED);
    // legend
    g.strokeStyle = GOLD; g.lineWidth = 4; rr(g, x0, y + 128, 26, 16, 4); g.stroke();
    txt(g, 'top pick', x0 + 34, y + 136, '600 13px Jost, sans-serif', INK);
    g.strokeStyle = '#e9c98a'; g.lineWidth = 2; g.setLineDash([7, 5]); rr(g, x0 + 110, y + 128, 26, 16, 4); g.stroke(); g.setLineDash([]);
    txt(g, 'worth considering', x0 + 144, y + 136, '600 13px Jost, sans-serif', INK);
    txt(g, '⇄ trainer switched', x0 + 272, y + 136, '600 13px Jost, sans-serif', RED);
    txt(g, 'Damage: power × type × same-type bonus × accuracy, as a share', x0, y + 172, 'italic 500 12px Jost, sans-serif', MUTED);
    txt(g, 'of the HP bar. Type chart and powers are the games’; scale illustrative.', x0, y + 190, 'italic 500 12px Jost, sans-serif', MUTED);
  }
  function message(v) {
    const c = v.cur, k = c.k;
    if (c.pick == null) return v.over ? 'Round over. Pick a setup or press New round.' : `${MON[c.face].name} is out. What will Pikachu do?`;
    const r = c.res, mv = MOVES[c.pick];
    if (r.switched && k < .65) return `The trainer withdrew ${MON[c.face].name}! Go, ${MON[r.target].name}!`;
    if (k < 1.25) return `Pikachu used ${mv.name}!`;
    const tail = r.dealt >= 1 ? ` ${MON[r.target].name} fainted!` : '';
    return (r.mult === 0 ? `It doesn’t affect ${MON[r.target].name}…` : r.mult >= 2 ? 'It’s super effective!' : r.mult < 1 ? 'It’s not very effective…' : `${MON[r.target].name} took ${Math.round(r.dealt * 100)}%.`) + tail;
  }
  const OUT = {
    one: 'Thunderbolt is the top pick every turn. Four buttons, one answer, and the player stops deciding: the menu is a formality.',
    team: 'The top pick changes with the opponent, but every turn still has one clear answer. Reading the type chart is a knowledge test, not a decision.',
    reads: 'The trainer counters your obvious move. Now the top pick depends on what they expect, and the obvious answer can score zero: that is a decision.',
  };

  canvasDemo('battle', (s, cv, g) => {
    const st = { tour: true, held: false, t: 0, mode: 'one', seed: 1, log: [], cur: null, hover: -1, key: '' };
    const tourBtn = $(s, '.bt-tour');
    const deal = () => {   // the next turn of a free-play round
      const r = rng(st.seed * 977 + st.log.length * 31 + 7), team = MODES[st.mode].team;
      st.cur = { face: team[Math.floor(r() * team.length)], sw: r() < MODES[st.mode].q, pick: null, k: 0 };
    };
    const newRound = () => { st.log = []; st.seed++; deal(); st.key = ''; };
    const free = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); newRound(); } };
    $$(s, '.bt-mode .btn').forEach(b => b.onclick = () => { free(); st.mode = b.dataset.m; newRound(); });
    $(s, '.bt-reset').onclick = () => { free(); newRound(); };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; st.key = ''; tourBtn.classList.add('on'); };
    const pick = i => {
      if (st.tour) free();
      if (st.log.length >= P.ROUND) newRound();
      if (st.cur.pick != null) return;
      st.cur.pick = i; st.cur.k = 0; st.cur.res = resolve(st.mode, st.cur.face, st.cur.sw, i);
    };
    const at = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height]; };
    const hit = (x, y) => BTN.findIndex(b => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
    cv.addEventListener('click', e => { const i = hit(...at(e)); if (i >= 0) pick(i); });
    cv.addEventListener('pointermove', e => { st.hover = hit(...at(e)); cv.style.cursor = st.hover >= 0 ? 'pointer' : ''; });
    addEventListener('keydown', e => {
      if (!s._live || e.altKey || e.ctrlKey || e.metaKey) return;
      const i = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(e.code); if (i >= 0) pick(i);
    });

    function tourView(t) {
      const ph = Math.min(2, Math.floor(t / PHASE)), [mode, turns] = TOUR[ph], tt = t - ph * PHASE;
      const log = [], it = Math.floor((tt - P.INTRO) / P.TL);
      if (tt < P.INTRO || t >= PHASE * 3) {
        const lastPh = t >= PHASE * 3;
        const m = lastPh ? 'reads' : mode, tn = lastPh ? TOUR[2][1] : [];
        tn.forEach(([f, sw]) => log.push(resolve(m, f, sw, forecast(m, f).top)));
        const f0 = lastPh ? TOUR[2][1][3][0] : turns[0][0];
        return { mode: m, log, cur: { face: f0, pick: null, k: 0 }, over: lastPh, intro: !lastPh };
      }
      for (let i = 0; i < it; i++) { const [f, sw] = turns[i]; log.push(resolve(mode, f, sw, forecast(mode, f).top)); }
      const [f, sw] = turns[it], k = tt - P.INTRO - it * P.TL, pk = forecast(mode, f).top;
      const cur = { face: f, pick: k > .8 ? pk : null, k: k - .8, cursor: k > .35 ? pk : -1 };
      if (cur.pick != null) cur.res = resolve(mode, f, sw, pk);
      return { mode, log, cur };
    }
    function render(dt) {
      let v;
      if (st.tour) v = tourView(st.t);
      else {
        if (!st.cur) deal();
        const c = st.cur;
        if (c.pick != null) { c.k += dt; if (c.k > P.TL - .5) { st.log.push(c.res); if (st.log.length < P.ROUND) deal(); else st.cur = { face: c.res.target, pick: null, k: 0 }; } }
        v = { mode: st.mode, log: st.log, cur: st.cur, over: st.log.length >= P.ROUND };
      }
      v.round = st.tour ? 4 : P.ROUND;
      v.hover = st.tour ? v.cur.cursor : st.hover;
      v.fc = forecast(v.mode, v.cur.face);
      v.msg = v.intro ? `Setup: ${MODES[v.mode].label.toLowerCase()}.` : message(v);
      g.clearRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,252,244,.85)'; rr(g, 0, 0, W, H, 14); g.fill();
      scene(g, v); menu(g, v); side(g, v);
      $$(s, '.bt-mode .btn').forEach(b => b.classList.toggle('on', b.dataset.m === v.mode));
      const done = v.log.length, ever = new Set(v.log.map(e => e.top)).size, multi = v.log.filter(e => e.consider > 1).length;
      const avg = done ? v.log.reduce((a, e) => a + e.dealt, 0) / done : 0;
      const key = [v.mode, done].join(); if (key === st.key) return; st.key = key;
      say($(s, '.bt-stats'), `<div class="${ever > 1 ? 'g' : 'r'}"><b>${done ? ever : '–'}</b><span>different top picks across ${done || 'the'} turns</span></div>`
        + `<div class="${multi ? 'g' : 'r'}"><b>${done ? multi : '–'}</b><span>turns where two or more moves were worth considering</span></div>`
        + `<div class="y"><b>${done ? Math.round(avg * 100) + '%' : '–'}</b><span>average damage per turn, as a share of the HP bar</span></div>`);
      say($(s, '.bt-out'), OUT[v.mode]);
    }
    APIS.battle = { seek(t) { st.held = st.tour = true; st.t = t; st.key = ''; render(0); }, dur: () => DUR };
    return dt => { dt = Math.max(0, dt); if (st.tour && !st.held) { st.t += dt; if (st.t > DUR) st.t = 0; } render(dt); };
  }, { enter(s) { s._live = true; }, leave(s) { s._live = false; } });
  window.__seek = (t, w = 'battle') => APIS[w].seek(t);
  window.__dur = (w = 'battle') => APIS[w].dur();
  window.__btForecast = (mode, face) => forecast(mode, face);
})();
