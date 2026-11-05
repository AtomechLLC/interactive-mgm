/* Three patch philosophies (Module 8, Part 1).
   One roster of five classes starts from the same numbers in three columns. Each column follows one plan for four patches:
   normalize toward the middle (the Riot way), tune to a DPS target while new content reshuffles the order (the Blizzard way),
   or raise everything else up to the ceiling (the Valve way). Each column prints that patch's notes and how players respond.
   Same goal, same roster: the patch notes and the strategies come out distinctly different. Pure function of t for __seek. */
(function () {
  const { $, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;
  const W = 1040, H = 585, NP = 4;
  const CLS = [['mage', 'Mage', '#3fc7eb'], ['rogue', 'Rogue', '#d9b400'], ['hunter', 'Hunter', '#7fae3a'], ['warlock', 'Warlock', '#8788ee'], ['warrior', 'Warrior', '#a8784a']];
  const img = {};
  CLS.forEach(([k]) => { const i = new Image(); i.src = `img/${k}.jpg`; img[k] = i; });
  const START = [114, 106, 100, 93, 87];
  const PLANS = [
    {
      title: 'Normalize', who: 'the Riot way', rule: 'pull the outliers toward the norm', style: 'small numbers, both directions, aimed at outliers', col: '#e5322d', line: 'norm',
      p: [START, [108, 106, 100, 93, 93], [104, 102, 100, 97, 93], [101, 102, 100, 99, 98], [100, 101, 100, 99, 99]],
      notes: [
        ['No patch yet. Mage leads, Warrior trails.'],
        ['Mage: Arcane Blast damage 80 → 74', 'Warrior: base armor 30 → 34'],
        ['Mage: Frost Nova slow 40% → 35%', 'Rogue: Eviscerate ratio 0.60 → 0.56', 'Warlock: Shadow Bolt cooldown 8s → 7s'],
        ['Mage: mana per level 25 → 22', 'Warrior: Charge cost 15 → 12', 'Warlock: Fear duration 1.5s → 1.6s'],
        ['Mage: Blink cooldown 14s → 14.5s', 'Rogue: Sprint duration 4s → 3.8s', 'Warrior: health per level 92 → 94'],
      ],
      players: ['Mage players win on stats alone.', 'Mage still leads, by less. Warrior picks rise.', 'Four classes sit within a few points.', 'No class wins on numbers. Matchups decide.', 'Players pick by taste and counters. Skill decides the game.'],
    },
    {
      title: 'Hit DPS targets', who: 'the Blizzard way', rule: 'tune each class to the target, then ship content', style: 'flat percentages, plus new raids and seasons', col: '#2e6fd6', line: 'DPS target',
      p: [START, [100, 100, 100, 100, 100], [101, 92, 112, 108, 95], [101, 99, 104, 106, 97], [99, 106, 96, 95, 110]],
      notes: [
        ['No patch yet. Mage leads, Warrior trails.'],
        ['Mage: all damage −12%', 'Rogue: all damage −6%', 'Warlock: all damage +7%', 'Warrior: all damage +15%'],
        ['New raid tier: fights with 3-5 targets', 'New tier set bonuses for every class', '(no class tuning this patch)'],
        ['Hunter: Multi-Shot damage −8%', 'Rogue: Blade Flurry damage +10%', 'Warrior: Whirlwind damage +3%'],
        ['New season: single-target council fights', 'New trinket: on-crit haste', '(no class tuning this patch)'],
      ],
      players: ['Mage players win on stats alone.', 'Every class lands on the target dummy.', 'Multi-target fights: raids stack Hunters.', 'The hotfix trims Hunter. Warlock now leads.', 'Single-target fights: Warrior tops the meters. Raiders reroll again.'],
    },
    {
      title: 'Raise to a ceiling', who: 'the Valve way', rule: 'make the other things overpowered too', style: 'new abilities and items, almost no nerfs', col: '#8a4fd6', line: 'ceiling',
      p: [START, [114, 106, 100, 93, 116], [114, 117, 100, 118, 116], [120, 117, 121, 118, 116], [120, 123, 121, 118, 124]],
      notes: [
        ['No patch yet. Mage leads, Warrior trails.'],
        ['Warrior: new ability Rampage', 'Warrior: Bloodthirst heals for 20% of damage'],
        ['Warlock: new item, Soulstone Shard: pets deal +40%', 'Rogue: Stealth lasts 1s after attacking'],
        ['Hunter: traps can be thrown', 'Mage: Blink gains a second charge'],
        ['Rogue: new ability Shadow Clone', 'Warrior: Rampage also reflects spells'],
      ],
      players: ['Mage players win on stats alone.', 'Warrior is the new toy. Everyone tries Rampage.', 'Three classes trade the top spot.', 'Every class has a broken trick to find.', 'Everything feels strong. Players hunt the newest trick.'],
    },
  ];
  const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
  const txt = (g, s, x, y, o = {}) => { g.font = o.font || '600 15px Jost, sans-serif'; g.fillStyle = o.col || C.ink; g.textAlign = o.align || 'left'; g.textBaseline = o.base || 'middle'; g.fillText(s, x, y); };
  function wrap(g, s, x, y, w, lh, o) {
    g.font = o.font; const words = s.split(' '); let line = '', n = 0;
    words.forEach(wd => { const t = line ? line + ' ' + wd : wd; if (g.measureText(t).width > w && line) { txt(g, line, x, y + n * lh, o); line = wd; n++; } else line = t; });
    if (line) { txt(g, line, x, y + n * lh, o); n++; }
    return n;
  }
  const pic = (g, k, x, y, s) => { const i = img[k]; if (i && i.complete && i.naturalWidth) g.drawImage(i, x, y, s, s); else { g.fillStyle = '#999'; g.fillRect(x, y, s, s); } };
  const topOf = v => { const m = Math.max(...v), s = [...v].sort((a, b) => b - a); return s[0] - s[1] < 2 ? -1 : v.indexOf(m); };
  const PW = 330, PG = 11, PX0 = 14, VLO = 70, VHI = 130;
  const ROW0 = 96, RH = 33;
  function draw(g, shown, noteAlpha) {
    T.use(g); g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,252,244,.92)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill();
    const whole = Math.floor(shown + 1e-6), k = ease(clamp((shown - whole) / 1));
    const nIdx = Math.min(NP, Math.ceil(shown - 1e-6)), res = [];
    PLANS.forEach((pl, c) => {
      const x0 = PX0 + c * (PW + PG);
      const vals = CLS.map((_, i) => lerp(pl.p[whole][i], pl.p[Math.min(NP, whole + 1)][i], whole >= NP ? 0 : k));
      const bx = x0 + 48, bw = PW - 66, vx = v => bx + (clamp(v, VLO, VHI) - VLO) / (VHI - VLO) * bw;
      g.fillStyle = '#efe6d2'; g.beginPath(); g.roundRect(x0, 10, PW, H - 20, 12); g.fill();
      g.fillStyle = pl.col; g.beginPath(); g.roundRect(x0, 10, PW, 6, [12, 12, 0, 0]); g.fill();
      txt(g, pl.title, x0 + 14, 36, { font: '800 19px Montserrat, Jost, sans-serif', col: pl.col });
      txt(g, pl.who, x0 + PW - 14, 36, { font: '600 13px Jost, sans-serif', col: C.muted, align: 'right' });
      txt(g, pl.rule, x0 + 14, 59, { font: '500 13px Jost, sans-serif', col: C.ink });
      // reference line
      const ref = c === 2 ? Math.max(...vals) : 100;
      g.save(); g.setLineDash([6, 5]); g.strokeStyle = pl.col; g.lineWidth = 2;
      g.beginPath(); g.moveTo(vx(ref), ROW0 - 8); g.lineTo(vx(ref), ROW0 + 5 * RH - 4); g.stroke(); g.restore();
      if (c === 2) { g.save(); g.setLineDash([3, 5]); g.strokeStyle = '#b9ab88'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(vx(100), ROW0 - 8); g.lineTo(vx(100), ROW0 + 5 * RH - 4); g.stroke(); g.restore(); }
      txt(g, `${pl.line} ${Math.round(ref)}`, clamp(vx(ref), bx + 30, bx + bw - 30), ROW0 - 15, { font: '700 11px Jost, sans-serif', col: pl.col, align: 'center' });
      CLS.forEach(([key, name, col], i) => {
        const y = ROW0 + i * RH;
        pic(g, key, x0 + 14, y, 26);
        g.fillStyle = '#e2d6bb'; g.beginPath(); g.roundRect(bx, y + 4, bw, 18, 5); g.fill();
        g.fillStyle = col; g.beginPath(); g.roundRect(bx, y + 4, Math.max(4, vx(vals[i]) - bx), 18, 5); g.fill();
        txt(g, name, bx + 7, y + 14, { font: '700 11px Jost, sans-serif', col: '#fff' });
        txt(g, String(Math.round(vals[i])), Math.min(vx(vals[i]) + 5, bx + bw - 22), y + 14, { font: '700 12px Montserrat, Jost, sans-serif', col: C.ink });
      });
      // top of the chart, patch by patch
      const sy = ROW0 + 5 * RH + 8;
      txt(g, 'on top', x0 + 14, sy + 12, { font: '600 11px Jost, sans-serif', col: C.muted });
      for (let p = 0; p <= NP; p++) {
        const sx = x0 + 70 + p * 50;
        txt(g, p ? 'patch ' + p : 'live', sx + 12, sy + 34, { font: '500 10px Jost, sans-serif', col: C.muted, align: 'center' });
        if (p > whole) { g.strokeStyle = '#cdbf9f'; g.lineWidth = 1.5; g.strokeRect(sx + 1, sy + 1, 22, 22); continue; }
        const tp = topOf(pl.p[p]);
        if (tp < 0) { g.fillStyle = '#d9cba8'; g.fillRect(sx, sy, 24, 24); txt(g, '=', sx + 12, sy + 12, { font: '800 16px Montserrat, Jost, sans-serif', col: C.ink, align: 'center' }); }
        else pic(g, CLS[tp][0], sx, sy, 24);
      }
      // patch notes
      const ny = sy + 48, nh = 128;
      g.fillStyle = '#262c6a'; g.beginPath(); g.roundRect(x0 + 10, ny, PW - 20, nh, 8); g.fill();
      txt(g, nIdx ? `PATCH ${nIdx} NOTES` : 'LIVE TODAY', x0 + 22, ny + 18, { font: '800 12px Montserrat, Jost, sans-serif', col: '#ffb951' });
      g.save(); g.globalAlpha = noteAlpha;
      let ly = ny + 40;
      pl.notes[nIdx].forEach(n => { txt(g, '•', x0 + 22, ly, { font: '700 13px Jost, sans-serif', col: '#ffb951' }); ly += 19 * wrap(g, n, x0 + 34, ly, PW - 56, 19, { font: '500 13px Jost, sans-serif', col: '#f4efe2' }) + 3; });
      g.restore();
      // players
      const py = ny + nh + 20;
      txt(g, 'PLAYERS', x0 + 14, py, { font: '800 11px Montserrat, Jost, sans-serif', col: pl.col });
      wrap(g, pl.players[whole], x0 + 14, py + 20, PW - 28, 18, { font: '600 14px Jost, sans-serif', col: C.ink });
      if (whole > 0) { const sy2 = H - 62; g.strokeStyle = '#d9cba8'; g.lineWidth = 1; g.beginPath(); g.moveTo(x0 + 14, sy2 - 14); g.lineTo(x0 + PW - 14, sy2 - 14); g.stroke();
        txt(g, 'HOW THE NOTES READ', x0 + 14, sy2, { font: '800 11px Montserrat, Jost, sans-serif', col: pl.col });
        wrap(g, pl.style, x0 + 14, sy2 + 19, PW - 28, 17, { font: 'italic 500 13px Jost, sans-serif', col: C.muted }); }
      const cur = pl.p[whole];
      res.push({ avg: mean(cur), spread: Math.max(...cur) - Math.min(...cur), top: topOf(cur) });
    });
    return res;
  }
  const T0 = 2, STEP = 3.4, DUR = T0 + NP * STEP + 4.5;
  const tourCap = t => t < T0 ? 'One roster, the same live numbers in every column, and the same goal: make five different classes equally valuable.'
    : t < T0 + STEP ? 'Patch 1. Three plans, three kinds of patch notes: small nudges to the outliers, flat percentages to a target, a brand new ability.'
    : t < T0 + 2 * STEP ? 'Patch 2. The target column ships content, not tuning, and the class order slips anyway. The ceiling column buffs two more classes.'
    : t < T0 + NP * STEP ? 'Same school of thought, different plans: one column converges, one reshuffles, one climbs.'
    : 'Four patches later: one roster sits at 100 with no clear top, one has a new class on top, one has everyone near 120. Choose the plan that delivers the game your players came for.';
  canvasDemo('patches', (s, cv, g) => {
    const st = { p: NP, shown: NP, tour: true, held: false, t: 0, key: '' };
    const tourBtn = $(s, '.pp-tour'), pI = $(s, '.pp-p');
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); } };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    pI.oninput = () => { manual(); st.p = +pI.value; if (st.p < st.shown) st.shown = st.p; };
    function info(p, res, cap) {
      const key = [p, cap].join(); if (key === st.key) return; st.key = key;
      pI.value = p; $(s, '.pp-pv').textContent = p ? p : 'live';
      say($(s, '.pp-stats'), res.map((r, k) => `<div class="${['r', '', 'y'][k]}"><b>${Math.round(r.avg)}</b><span>${PLANS[k].title}: average power · spread ${Math.round(r.spread)} · ${r.top < 0 ? 'no clear top' : CLS[r.top][1] + ' on top'}</span></div>`).join(''));
      say($(s, '.pp-out'), cap);
    }
    const manualCap = p => p === 0 ? 'Live numbers, before any patch. Drag the slider to apply the three plans.'
      : p === NP ? tourCap(DUR) : `After patch ${p}. Compare the three sets of notes: same goal, different plan, different wording, different meta.`;
    s._seek = t => {
      let shown = 0, noteA = 1;
      if (t >= T0) {
        const j = Math.min(NP, Math.floor((t - T0) / STEP)), into = (t - T0) - j * STEP;
        if (j < NP) { shown = j + clamp(into); noteA = clamp(into / .4); } else shown = NP;
      }
      const res = draw(g, shown, noteA);
      info(Math.floor(shown + 1e-6), res, tourCap(t));
    };
    window.__seek = t => { st.held = true; s._seek(t); };
    window.__dur = () => DUR;
    return dt => {
      if (st.held) return;
      st.t += Math.max(0, dt);
      if (st.tour) { if (st.t >= DUR) st.t = 0; s._seek(st.t); }
      else {
        if (st.shown < st.p) st.shown = Math.min(st.p, st.shown + Math.max(0, dt) * 1.2);
        const p = Math.floor(st.shown + 1e-6), done = st.shown === st.p;
        const res = draw(g, st.shown, 1);
        info(p, res, manualCap(p));
      }
    };
  });
})();
