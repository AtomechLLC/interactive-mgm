/* Too Weak to Waste (Dan Felder's consumables post), three spikes.
   flip:  100 attempts at a boss; a Firebomb saves the ones its damage covers. The player spends it only when it saves
          enough of the losses to clear the certainty they need (the action trigger). More swing needs a stronger bomb.
   dice:  a guarantee against a roll. Ultra Ball vs Master Ball on Mewtwo (Gen III-IV catch formula), and a longsword
          swing vs a wand of Magic Missile on a nearly dead foe (Pathfinder).
   keys:  a roguelike run with three bombs and an optional vault guarding a permanent heart. Weak bombs, or a reward the
          player cannot see, and the bombs stay in the bag.
   Numbers: FLIP, catchOdds(), SWORD / WAND, RUN. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;
  const W = 1040, H = 585;
  const panel = g => { g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(255,252,244,.8)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill(); };
  const txt = (g, s, x, y, font, col = C.ink, al = 'left') => { g.font = font; g.fillStyle = col; g.textAlign = al; g.textBaseline = 'middle'; g.fillText(s, x, y); };
  const box = (g, x, y, w, h, fill, stroke, r = 10, lw = 2) => { g.beginPath(); g.roundRect(x, y, w, h, r); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); } };
  const pct = v => (v >= .995 ? '100' : v < .1 ? (v * 100).toFixed(1) : Math.round(v * 100)) + '%';
  // seeded random, so every attempt and every throw is the same each time the page runs
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const img = src => { const i = new Image(); i.src = src; return i; };
  const IMG = { mewtwo: img('img/pk-mewtwo.png'), ultra: img('img/pk-ultra-ball.png'), master: img('img/pk-master-ball.png') };
  const pic = (g, im, x, y, s) => { if (im.complete && im.naturalWidth) { g.imageSmoothingEnabled = im.naturalWidth > 100; g.drawImage(im, x - s / 2, y - s / 2, s, s); g.imageSmoothingEnabled = true; } };
  const freeOf = (st, btn) => () => { st.tour = false; btn.classList.remove('on'); };
  const apis = {};

  /* ---------- 1: will it flip the fight? ---------- */
  // boss HP left (0..1) at the moment each attempt died; at or below 0 the player won without the bomb
  const FLIP = { n: 100, mean: .2, sd: v => .06 + .0034 * v };
  const Z = (() => { const r = rng(7), z = []; for (let i = 0; i < FLIP.n; i++) { const u = Math.max(1e-6, r()), v = r(); z.push(Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)); } return z.sort((a, b) => a - b); })();
  const attempts = v => Z.map(z => Math.min(1, FLIP.mean + FLIP.sd(v) * z));
  const TILE = { x: 30, y: 62, w: 58, h: 47 };
  canvasDemo('flip', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, pow: 15, vr: 15, thr: 80, key: '' };
    const tourBtn = $(s, '.fl-tour'), pIn = $(s, '.fl-pow'), vIn = $(s, '.fl-var'), tIn = $(s, '.fl-thr'), free = freeOf(st, tourBtn);
    pIn.oninput = () => { free(); st.pow = +pIn.value; };
    vIn.oninput = () => { free(); st.vr = +vIn.value; };
    tIn.oninput = () => { free(); st.thr = +tIn.value; };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    const DUR = 22;
    function render() {
      let { pow, vr, thr } = st; const t = st.t;
      if (st.tour) {
        thr = 80;
        if (t < 8) { vr = 15; pow = Math.round(lerp(5, 60, ease(clamp((t - 1) / 6)))); }
        else if (t < 15) { pow = 60; vr = Math.round(lerp(15, 95, ease(clamp((t - 9) / 5)))); }
        else { vr = 95; pow = Math.round(lerp(60, 100, ease(clamp((t - 15.5) / 4.5)))); }
        pIn.value = pow; vIn.value = vr; tIn.value = thr;
      }
      const P = pow / 100, rs = attempts(vr);
      const won = rs.filter(r => r <= 0).length, saved = rs.filter(r => r > 0 && r <= P).length, lost = FLIP.n - won - saved;
      const conf = saved / Math.max(1, saved + lost), use = conf * 100 >= thr;
      T.use(g); panel(g);
      txt(g, '100 attempts at the boss, sorted by boss HP left when you fell', 30, 30, '800 19px Montserrat');
      rs.forEach((r, i) => {
        const x = TILE.x + (i % 10) * TILE.w, y = TILE.y + Math.floor(i / 10) * TILE.h, k = r <= 0 ? 'won' : r <= P ? 'saved' : 'lost';
        const [fill, stroke] = { won: ['#d8f0df', '#5fb47c'], saved: ['#fde9b8', '#e0a92d'], lost: ['#f9d9d6', '#e07b72'] }[k];
        box(g, x, y, TILE.w - 6, TILE.h - 6, fill, stroke, 7, 2);
        if (k === 'won') { GI.draw(g, 'crowned-skull', x + 26, y + 20, 24, '#5fb47c'); return; }
        // boss HP left at death, then the bomb's share of it
        const bx = x + 6, bw = TILE.w - 18, by = y + 26;
        g.fillStyle = '#efe4cc'; g.fillRect(bx, by, bw, 8);
        g.fillStyle = '#e5322d'; g.fillRect(bx, by, bw * r, 8);
        g.fillStyle = '#e0a92d'; g.fillRect(bx, by, bw * Math.min(P, r), 8);
        GI.draw(g, k === 'saved' ? 'fire-bomb' : 'skull-crossed-bones', x + 26, y + 13, 16, k === 'saved' ? C.goldInk : '#b0423b');
      });
      // the boss and the bomb
      const R = 650;
      box(g, R, 62, 360, 120, 'rgba(21,32,68,.05)', null, 12);
      GI.draw(g, 'dragon-head', R + 56, 122, 76, C.redDk);
      GI.draw(g, 'fire-bomb', R + 156, 122, 58, '#e0a92d');
      txt(g, 'Firebomb', R + 200, 100, '800 20px Montserrat');
      txt(g, `${pow}% of the boss’s HP`, R + 200, 128, '600 16px Jost', C.muted);
      txt(g, `Swing: ${vr < 34 ? 'steady' : vr < 67 ? 'uneven' : 'wild'}`, R + 200, 154, '600 16px Jost', C.muted);
      // certainty gauge
      txt(g, 'Of the attempts I lose, the bomb saves', R, 214, '700 16px Jost');
      txt(g, pct(conf), R, 262, '800 54px Montserrat', use ? C.good : C.redDk);
      const gy = 300, gw = 360;
      box(g, R, gy, gw, 22, '#e8dcc0', null, 8);
      g.fillStyle = use ? '#2fae63' : '#e5322d'; g.beginPath(); g.roundRect(R, gy, Math.max(8, gw * conf), 22, 8); g.fill();
      const tx = R + gw * thr / 100;
      g.strokeStyle = C.navy; g.lineWidth = 3; g.setLineDash([5, 4]); g.beginPath(); g.moveTo(tx, gy - 10); g.lineTo(tx, gy + 32); g.stroke(); g.setLineDash([]);
      txt(g, `needs ${thr}%`, tx, gy + 46, '700 14px Jost', C.navy, 'center');
      // legend
      [['crowned-skull', '#5fb47c', `${won} won without it`], ['fire-bomb', C.goldInk, `${saved} saved by the bomb`], ['skull-crossed-bones', '#b0423b', `${lost} lost anyway`]].forEach(([ic, col, s2], i) => {
        GI.draw(g, ic, R + 14, 388 + i * 30, 22, col); txt(g, s2, R + 34, 388 + i * 30, '600 17px Jost');
      });
      T.stamp(use ? 'Action trigger: use it' : 'Too weak to waste', R + 180, 515, use ? C.good : C.redDk, 1, 26);
      $(s, '.fl-pv').textContent = pow + '%'; $(s, '.fl-vv').textContent = vr; $(s, '.fl-tv').textContent = thr + '%';
      const key = [pow, vr, thr].join(); if (key === st.key) return; st.key = key;
      say($(s, '.fl-out'), use
        ? `A ${pow}% bomb saves ${saved} of ${saved + lost} losses. That clears the ${thr}% the player needs, so the bomb gets thrown.`
        : vr >= 50 && pow >= 50
          ? `Swingy attempts die with more boss HP left. The same ${pow}% bomb now saves only ${saved} of ${saved + lost}, so it stays in the bag.`
          : `A ${pow}% bomb only saves the near misses: ${saved} of ${saved + lost} losses. Not sure enough, so it stays in the bag.`);
    }
    apis.flip = { seek(t) { st.held = st.tour = true; st.t = t; render(); }, dur: () => DUR };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > DUR) st.t = 0; render(); };
  });

  /* ---------- 2: bypass the dice ---------- */
  const MEW = { maxHp: 200, rate: 3 };
  // Generation III-IV: a = (3M - 2H) * rate * ball * status / 3M, caught outright with chance a / 255
  const catchOdds = (hpPct, asleep, ball) => {
    const M = MEW.maxHp, Hp = Math.max(1, Math.round(M * hpPct / 100));
    return Math.min(1, Math.floor((3 * M - 2 * Hp) * MEW.rate * ball * (asleep ? 2 : 1) / (3 * M)) / 255);
  };
  const SWORD = { hitOn: 12, die: 8, plus: 4 }, WAND = { missiles: 3, die: 4, plus: 1 };
  const d4x3 = (() => { const c = {}; for (let a = 1; a <= 4; a++) for (let b = 1; b <= 4; b++) for (let d = 1; d <= 4; d++) c[a + b + d] = (c[a + b + d] || 0) + 1; return c; })();
  const swordOdds = hp => (21 - SWORD.hitOn) / 20 * clamp((SWORD.die + SWORD.plus - hp + 1) / SWORD.die);
  const wandOdds = hp => Object.entries(d4x3).reduce((a, [k, n]) => a + (+k + WAND.missiles * WAND.plus >= hp ? n / 64 : 0), 0);
  const TRIALS = (() => { const r = rng(11); return Array.from({ length: 20 }, () => [r(), r(), r(), r(), r()]); })();
  canvasDemo('dice', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, scene: 'catch', hp: 100, sleep: false, foe: 12, shown: 0, key: '' };
    const tourBtn = $(s, '.di-tour'), hIn = $(s, '.di-hp'), sIn = $(s, '.di-sleep'), fIn = $(s, '.di-foe'), free = freeOf(st, tourBtn);
    const reroll = () => { st.shown = st.t; };
    hIn.oninput = () => { free(); st.hp = +hIn.value; };
    sIn.onchange = () => { free(); st.sleep = sIn.checked; };
    fIn.oninput = () => { free(); st.foe = +fIn.value; };
    $$(s, '.di-scene .btn').forEach(b => b.onclick = () => { free(); st.scene = b.dataset.s; reroll(); });
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    const DUR = 22, HALF = 11;
    function token(g, x, y, ok, label, icon, iconCol) {
      box(g, x, y, 82, 50, ok ? '#d8f0df' : '#f9d9d6', ok ? '#5fb47c' : '#e07b72', 8, 2);
      if (icon instanceof Image) pic(g, icon, x + 15, y + 25, 22); else GI.draw(g, icon, x + 15, y + 25, 22, iconCol);
      txt(g, label, x + 52, y + 25, '700 14px Jost', ok ? C.good : C.redDk, 'center');
    }
    function column(g, x0, o, reveal) {
      box(g, x0, 196, 470, 375, 'rgba(21,32,68,.05)', null, 12);
      if (o.icon instanceof Image) pic(g, o.icon, x0 + 40, 232, 48); else GI.draw(g, o.icon, x0 + 40, 232, 46, o.col);
      txt(g, o.name, x0 + 76, 220, '800 19px Montserrat');
      txt(g, o.sub, x0 + 76, 246, '600 14px Jost', C.muted);
      txt(g, pct(o.p), x0 + 450, 232, '800 34px Montserrat', o.p >= .8 ? C.good : C.redDk, 'right');
      o.trials.forEach((tr, i) => {
        if (i >= reveal) { box(g, x0 + 20 + (i % 5) * 88, 272 + Math.floor(i / 5) * 58, 82, 50, null, '#cdbf9f', 8, 1.5); return; }
        token(g, x0 + 20 + (i % 5) * 88, 272 + Math.floor(i / 5) * 58, tr.ok, tr.label, o.icon, o.col);
      });
      const n = o.trials.slice(0, reveal).filter(t => t.ok).length;
      txt(g, reveal ? `${n} of ${reveal} worked` : '', x0 + 20, 520, '700 16px Jost');
      txt(g, o.p >= .995 ? 'Certain: worth spending' : o.p >= .8 ? 'Near certain: worth spending' : `A gamble: ${o.need}`, x0 + 20, 548, '700 16px Jost', o.p >= .8 ? C.good : C.redDk);
    }
    const tries90 = p => p >= 1 ? '1 try' : p <= 0 ? 'never works' : `${Math.ceil(Math.log(.1) / Math.log(1 - p))} tries for a 90% chance`;
    function render() {
      let { scene, hp, sleep, foe } = st; const t = st.t; let since = t - st.shown;
      if (st.tour) {
        scene = t < HALF ? 'catch' : 'finish';
        if (scene === 'catch') { hp = Math.round(lerp(100, 1, ease(clamp((t - 4) / 3)))); sleep = t > 8; since = t < 4 ? t : t < 8 ? 99 : t - 8; }
        else { const u = t - HALF; foe = Math.round(lerp(12, 6, ease(clamp((u - 5) / 3)))); since = u < 5 ? u : u < 8.5 ? 99 : u - 8.5; }
        hIn.value = hp; sIn.checked = sleep; fIn.value = foe;
      }
      $$(s, '.di-scene .btn').forEach(b => b.classList.toggle('on', b.dataset.s === scene));
      $(s, '.di-catch').hidden = scene !== 'catch'; $(s, '.di-finish').hidden = scene !== 'finish';
      const reveal = Math.min(20, Math.floor(Math.max(0, since) * 6));
      T.use(g); panel(g);
      let A, B, head;
      if (scene === 'catch') {
        const pu = catchOdds(hp, sleep, 2);
        A = { name: 'Ultra Ball', sub: 'a roll every throw', icon: IMG.ultra, p: pu, need: tries90(pu), trials: TRIALS.map(r => ({ ok: r[0] < pu, label: r[0] < pu ? 'caught' : 'escaped' })) };
        B = { name: 'Master Ball', sub: 'no roll: always catches', icon: IMG.master, p: 1, trials: TRIALS.map(() => ({ ok: true, label: 'caught' })) };
        pic(g, IMG.mewtwo, 120, 108, 150);
        txt(g, 'A wild Mewtwo appeared', 220, 66, '800 22px Montserrat');
        txt(g, 'Legendary: catch rate 3 of 255, one chance per save file', 220, 94, '600 16px Jost', C.muted);
        const M = MEW.maxHp, cur = Math.max(1, Math.round(M * hp / 100));
        box(g, 220, 118, 380, 16, '#e8dcc0', null, 6);
        g.fillStyle = hp > 50 ? '#2fae63' : hp > 20 ? '#e0a92d' : '#e5322d'; g.beginPath(); g.roundRect(220, 118, Math.max(6, 380 * cur / M), 16, 6); g.fill();
        txt(g, `HP ${cur} / ${M}${sleep ? ' · asleep' : ''}`, 220, 156, '700 16px Jost');
        head = sleep && hp < 5 ? 'Even asleep at 1 HP, an Ultra Ball is a long shot.' : 'Every Ultra Ball rolls against catch rate 3.';
      } else {
        const ps = swordOdds(foe), pw = wandOdds(foe);
        A = { name: 'Longsword swing', sub: `hit on 12+, then 1d8+4`, icon: 'dice-twenty-faces-twenty', col: C.ink, p: ps, need: tries90(ps), trials: TRIALS.map(r => { const d20 = 1 + Math.floor(r[0] * 20), dmg = SWORD.plus + 1 + Math.floor(r[1] * SWORD.die), hit = d20 >= SWORD.hitOn; return { ok: hit && dmg >= foe, label: hit ? `${dmg} dmg` : 'miss' }; }) };
        B = { name: 'Wand of Magic Missile', sub: '3 × (1d4+1), never misses', icon: 'missile-swarm', col: C.purple, p: pw, need: tries90(pw), trials: TRIALS.map(r => { const dmg = [r[2], r[3], r[4]].reduce((a, u) => a + WAND.plus + 1 + Math.floor(u * WAND.die), 0); return { ok: dmg >= foe, label: `${dmg} dmg` }; }) };
        GI.draw(g, 'daemon-skull', 120, 110, 110, C.redDk);
        txt(g, 'One foe left standing', 220, 66, '800 22px Montserrat');
        txt(g, 'Pathfinder: Wrath of the Righteous style turn, one action to finish it', 220, 94, '600 16px Jost', C.muted);
        box(g, 220, 118, 380, 16, '#e8dcc0', null, 6);
        g.fillStyle = '#e5322d'; g.beginPath(); g.roundRect(220, 118, Math.max(6, 380 * foe / 40), 16, 6); g.fill();
        txt(g, `HP ${foe} left of 40`, 220, 156, '700 16px Jost');
        head = foe <= 6 ? 'At 6 HP or less the missiles cannot fall short.' : 'Above 6 HP even the missiles roll for damage.';
      }
      txt(g, head, 1010, 156, '700 16px Jost', C.ink, 'right');
      column(g, 30, A, reveal); column(g, 540, B, reveal);
      $(s, '.di-hv').textContent = hp + '%'; $(s, '.di-fv').textContent = foe;
      const key = [scene, hp, sleep, foe].join(); if (key === st.key) return; st.key = key;
      say($(s, '.di-out'), scene === 'catch'
        ? `Ultra Ball: ${pct(A.p)} a throw, ${A.need}. The Master Ball is 100%, so the player saves it for exactly this.`
        : B.p >= .995
          ? `The foe has ${foe} HP. The swing finishes it ${pct(A.p)} of the time; the wand always does. That certainty is the trigger.`
          : `The foe has ${foe} HP. The swing finishes it ${pct(A.p)} of the time, the wand ${pct(B.p)}. Neither is a sure thing yet.`);
    }
    apis.dice = { seek(t) { st.held = st.tour = true; st.t = t; render(); }, dur: () => DUR };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > DUR) st.t = 0; render(); };
  });

  /* ---------- 3: make items keys ---------- */
  const RUN = { bombs: 3, guardian: 90, hearts: 3, power: { weak: 10, strong: 35 }, len: 12 };
  const LINE = 420, ROOMS = [[90, 'Floor 1'], [270, 'Floor 2'], [650, 'Floor 3'], [810, 'Floor 4'], [955, 'Final boss']];
  const FORK = 460, VAULT = [460, 190];
  // the run as a timeline: where the player is at time u (0..RUN.len), and what they decided
  function plan(power, info) {
    const strong = RUN.power[power] * RUN.bombs >= RUN.guardian, enter = strong && info;
    return { strong, enter, finalUse: strong && !enter };
  }
  function posAt(u, enter) {
    const walk = (a, b, t0, t1) => lerp(a, b, ease(clamp((u - t0) / (t1 - t0))));
    if (u < 3) return [walk(90, FORK, .4, 2.6), LINE];
    if (u < 7.5) return enter ? [FORK, u < 5.5 ? walk(LINE, VAULT[1] + 110, 3.2, 4) : walk(VAULT[1] + 110, LINE, 6.6, 7.4)] : [FORK, LINE];
    return [walk(FORK, 955 - 72, 7.6, 10), LINE];
  }
  canvasDemo('keys', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, power: 'weak', info: false, key: '' };
    const tourBtn = $(s, '.ke-tour'), iIn = $(s, '.ke-info'), free = freeOf(st, tourBtn);
    $$(s, '.ke-pow .btn').forEach(b => b.onclick = () => { free(); st.power = b.dataset.p; st.t = 0; });
    iIn.onchange = () => { free(); st.info = iIn.checked; st.t = 0; };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    const ORDER = [['weak', true], ['strong', false], ['strong', true]], DUR = RUN.len * 3;
    function room(x, y, w, h, icon, col, name, dim) {
      g.globalAlpha = dim ? .35 : 1;
      box(g, x - w / 2, y - h / 2, w, h, '#efe4cc', '#3d4270', 12, 3);
      GI.draw(g, icon, x, y - 6, 50, col);
      txt(g, name, x, y + h / 2 + 18, '700 15px Jost', C.ink, 'center');
      g.globalAlpha = 1;
    }
    function render() {
      let { power, info } = st, u = st.t;
      if (st.tour) { const i = Math.floor(st.t / RUN.len) % 3; [power, info] = ORDER[i]; u = st.t - i * RUN.len; iIn.checked = info; }
      $$(s, '.ke-pow .btn').forEach(b => b.classList.toggle('on', b.dataset.p === power));
      const pl = plan(power, info), dmg = RUN.power[power];
      // bombs thrown: at the vault (4.2, 4.8, 5.4) or at the final boss (10.3, 10.8, 11.3)
      const throws = pl.enter ? [4.2, 4.8, 5.4] : pl.finalUse ? [10.2, 10.6, 11] : [];
      const used = throws.filter(x => u >= x + .35).length;
      const gHp = pl.enter ? Math.max(0, RUN.guardian - dmg * used) : RUN.guardian;
      const gotHeart = pl.enter && u >= 6.6;
      T.use(g); panel(g);
      // map: the main corridor and the side passage to the vault
      g.strokeStyle = '#cdbf9f'; g.lineWidth = 18; g.lineCap = 'round';
      g.beginPath(); g.moveTo(90, LINE); g.lineTo(955, LINE); g.moveTo(FORK, LINE); g.lineTo(FORK, VAULT[1] + 70); g.stroke();
      g.strokeStyle = '#efe4cc'; g.lineWidth = 8; g.setLineDash([2, 12]);
      g.beginPath(); g.moveTo(90, LINE); g.lineTo(955, LINE); g.moveTo(FORK, LINE); g.lineTo(FORK, VAULT[1] + 70); g.stroke(); g.setLineDash([]); g.lineCap = 'butt';
      txt(g, 'optional side room', FORK + 18, 320, '600 14px Jost', C.muted);
      ROOMS.forEach(([x, n], i) => room(x, LINE, i === 4 ? 120 : 96, i === 4 ? 100 : 80, i === 4 ? 'crowned-skull' : 'daemon-skull', i === 4 ? C.redDk : '#b0423b', n));
      // the vault
      const vx = VAULT[0], vy = VAULT[1];
      box(g, vx - 150, vy - 70, 300, 140, gHp <= 0 ? '#e7f3ea' : '#efe4cc', '#3d4270', 14, 3);
      if (gHp > 0) {
        GI.draw(g, 'dragon-head', vx - 80, vy - 8, 70, C.redDk);
        box(g, vx - 125, vy + 38, 90, 10, '#e8dcc0', null, 4); g.fillStyle = '#e5322d'; g.fillRect(vx - 125, vy + 38, 90 * gHp / RUN.guardian, 10);
        txt(g, `Guardian ${gHp} HP`, vx - 80, vy + 58, '600 13px Jost', C.ink, 'center');
      } else T.poof(vx - 80, vy - 8, u - 5.75, 40);
      if (info) {
        if (!(pl.enter && u >= 6)) GI.draw(g, 'heart-plus', vx + 70, vy - 12, 64, '#e5322d');
        txt(g, 'Heart Container', vx + 70, vy + 36, '800 14px Montserrat', C.ink, 'center');
        txt(g, '+1 max heart, every run', vx + 70, vy + 54, '600 13px Jost', C.muted, 'center');
      } else {
        GI.draw(g, 'locked-chest', vx + 70, vy - 12, 60, C.stoneDk);
        txt(g, '???', vx + 70, vy + 42, '800 18px Montserrat', C.muted, 'center');
      }
      txt(g, 'Vault', vx - 138, vy - 52, '800 16px Montserrat');
      if (pl.enter && u >= 6 && u < 6.6) { const k = ease((u - 6) / .6); GI.draw(g, 'heart-plus', lerp(vx + 70, 140 + RUN.hearts * 36, k), lerp(vy - 12, 88, k) - Math.sin(k * Math.PI) * 40, lerp(64, 30, k), '#e5322d'); }
      // the player
      const [px, py] = posAt(u, pl.enter);
      T.shadow(px, py + 18, 20, 7); T.player(px, py, py < LINE - 5 ? -Math.PI / 2 : 0, 1.05);
      // bombs in flight
      throws.forEach(x => {
        const k = (u - x) / .35; if (k < 0 || k > 1) return;
        const [tx, ty] = pl.enter ? [vx - 80, vy - 8] : [955, LINE - 10];
        GI.draw(g, 'fire-bomb', lerp(px, tx, k), lerp(py, ty, k) - Math.sin(k * Math.PI) * 60, 30, '#e0a92d');
        if (k > .8) T.flash(tx, ty, 50, (1 - k) * 5);
        if (k > .6) T.popText(`-${dmg}`, tx + 30, ty - 40, C.redDk, 1);
      });
      // thoughts at the fork, and at the final boss
      if (u > 2.6 && u < 4.2) {
        const s2 = !pl.strong ? `3 × ${dmg} = ${3 * dmg} of 90 HP. Not enough.` : !info ? 'No idea what’s in there. Keep the bombs.' : 'Bombs × 3 beats 90 HP, and a heart is forever.';
        T.label(s2, FORK, LINE + 110, 'center', pl.enter ? C.good : C.redDk, 17);
      }
      if (u > 9.6 && u < 10.2 && !pl.finalUse && !pl.enter) T.label(dmg * 3 < 50 ? 'These barely scratch the boss. Save them.' : 'Save them, just in case.', 760, LINE + 110, 'center', C.redDk, 17);
      // HUD: bombs and hearts
      box(g, 20, 20, 330, 96, 'rgba(255,252,244,.95)', '#cdbf9f', 12, 2);
      txt(g, 'Bombs', 36, 44, '700 15px Jost', C.muted);
      for (let i = 0; i < RUN.bombs; i++) GI.draw(g, 'fire-bomb', 120 + i * 40, 44, 32, i < RUN.bombs - used ? '#e0a92d' : '#d8ccb2');
      txt(g, `${dmg} dmg each`, 245, 44, '600 13px Jost', C.muted);
      txt(g, 'Max hearts', 36, 88, '700 15px Jost', C.muted);
      const hearts = RUN.hearts + (gotHeart ? 1 : 0);
      for (let i = 0; i < hearts; i++) GI.draw(g, 'heart-organ', 140 + i * 36, 88, 30, i >= RUN.hearts ? '#e0a92d' : '#e5322d');
      // end of the run
      if (u > 11.2 || (st.tour && u > 11.2)) {
        const end = pl.enter ? ['Bombs became a permanent heart', C.good] : pl.finalUse ? ['Bombs spent, nothing kept', C.goldInk] : [`Run over: ${RUN.bombs - used} bombs never thrown`, C.redDk];
        T.stamp(end[0], 560, 535, end[1], clamp((u - 11.2) * 4), 24);
      }
      txt(g, `${power === 'weak' ? 'Weak' : 'Strong'} bombs · vault reward ${info ? 'shown' : 'hidden'}`, 1020, 40, '800 18px Montserrat', C.ink, 'right');
      const key = [power, info].join(); if (key === st.key) return; st.key = key;
      say($(s, '.ke-out'), pl.enter
        ? 'Strong bombs and a reward the player can see: three temporary bombs buy a heart that lasts every run.'
        : pl.strong
          ? 'The bombs could win the vault fight, but nothing says what it holds. The trade never forms, and the bombs go to the final boss.'
          : `Three ${dmg}-damage bombs cannot kill a 90 HP guardian, so the vault is not a trade. The bombs ride along unused.`);
    }
    apis.keys = { seek(t) { st.held = st.tour = true; st.t = t; render(); }, dur: () => DUR };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.t > (st.tour ? DUR : RUN.len + 2)) st.t = 0; render(); };
  });

  window.__seek = (t, w) => apis[w].seek(t);
  window.__dur = w => apis[w].dur();
})();
