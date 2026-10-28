/* Sword forge (MGM C4 M1, deck slides 164-182): proportion, then orthogonality, in three slides.
   scale:    hero damage and enemy HP grow with level. Locked together, hits to kill never changes (slide 171).
   gauntlet: slide 172's three swords (power x durability) against three fights. No sword is best in all three.
   ortho:    slide 179's five variables, added one at a time; the swords pull apart into their own niches.
   Numbers: SWORDS (from the slides), FIGHTS, and the level formulas in hitsToKill(). */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;
  const W = 1040, H = 585;
  const SWORDS = [
    { name: 'Beginner Blade', power: 5, dur: 50, price: 10, speed: 50, range: 3, col: '#2ea3dc', icon: 'plain-dagger', rot: -Math.PI / 2 },
    { name: 'Knight Sword', power: 15, dur: 27, price: 100, speed: 10, range: 6, col: '#2fae63', icon: 'broadsword' },
    { name: 'Legend Sword', power: 48, dur: 14, price: 500, speed: 80, range: 5, col: '#8a4fd6', icon: 'relic-blade' },
  ];
  const panel = g => { g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(255,252,244,.8)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill(); };
  const txt = (g, s, x, y, font, col = C.ink, al = 'left') => { g.font = font; g.fillStyle = col; g.textAlign = al; g.textBaseline = 'middle'; g.fillText(s, x, y); };
  // a game-icons.net sword laid along the same line the old hand-drawn sword used (hilt at x, y)
  function swordIcon(g, x, y, len, col, ang = -.6, icon = 'broadsword') {
    const c = (len - 10) / 2; GI.draw(g, icon, x + Math.cos(ang) * c, y + Math.sin(ang) * c, len + 30, col);
  }
  // the sword's own icon, turned so every blade points up and to the right
  function swIcon(g, sw, x, y, size, col = sw.col) { GI.draw(g, sw.icon, x, y, size, col, sw.rot || 0);
  }
  const apis = {};

  /* ---------- 1: proportional vs disproportionate scaling ---------- */
  const hitsToKill = (hl, el) => Math.ceil((30 * el) / (10 * hl));
  canvasDemo('scale', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, hero: 10, foe: 10, lock: true, key: '' };
    const tourBtn = $(s, '.sc-tour'), hIn = $(s, '.sc-hero'), fIn = $(s, '.sc-foe'), lk = $(s, '.sc-lock');
    const free = () => { st.tour = false; tourBtn.classList.remove('on'); };
    hIn.oninput = () => { free(); st.hero = +hIn.value; if (st.lock) { st.foe = st.hero; fIn.value = st.foe; } };
    fIn.oninput = () => { free(); st.foe = +fIn.value; if (st.lock) { st.hero = st.foe; hIn.value = st.hero; } };
    lk.onchange = () => { free(); st.lock = lk.checked; if (st.lock) { st.foe = st.hero; fIn.value = st.foe; } };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    function render() {
      let hero = st.hero, foe = st.foe, lock = st.lock, t = st.t;
      if (st.tour) {
        if (t < 7) { lock = true; hero = foe = Math.round(lerp(1, 50, ease(clamp(t / 6)))); }
        else { lock = false; hero = 10; foe = Math.round(lerp(10, 50, ease(clamp((t - 7) / 6)))); }
        hIn.value = hero; fIn.value = foe; lk.checked = lock;
      }
      const dmg = 10 * hero, hp = 30 * foe, hits = hitsToKill(hero, foe);
      T.use(g); panel(g);
      // A and B circles, like slides 165-170
      const rA = 12 + 2 * hero, rB = 12 + 2 * foe * 1.3;
      g.fillStyle = 'rgba(240,140,40,.85)'; g.beginPath(); g.arc(150, 190, rA, 0, 7); g.fill();
      g.fillStyle = 'rgba(46,99,220,.85)'; g.beginPath(); g.arc(420, 190, rB, 0, 7); g.fill();
      GI.draw(g, 'visored-helm', 150, 190, rA * 1.2, '#fff'); GI.draw(g, 'daemon-skull', 420, 190, rB * 1.2, '#fff');
      txt(g, `Hero level ${hero}`, 150, 326, '800 17px Montserrat', C.ink, 'center'); txt(g, `${dmg} damage a hit`, 150, 350, '600 15px Jost', C.muted, 'center');
      txt(g, `Enemy level ${foe}`, 420, 326, '800 17px Montserrat', C.ink, 'center'); txt(g, `${hp} HP`, 420, 350, '600 15px Jost', C.muted, 'center');
      txt(g, lock ? 'Levels locked together: same proportion' : 'Levels unlocked: the proportion changes', 290, 40, '800 20px Montserrat', lock ? C.ink : C.goldInk, 'center');
      // hits to kill strip
      txt(g, 'Hits to kill', 620, 70, '800 22px Montserrat'); 
      txt(g, String(hits), 620, 140, '800 84px Montserrat', lock ? C.ink : C.redDk);
      for (let i = 0; i < Math.min(hits, 15); i++) swordIcon(g, 640 + (i % 5) * 72, 230 + Math.floor(i / 5) * 60, 46, lock ? '#e0a92d' : '#e5322d');
      // swing loop: hp bar emptying hit by hit
      const k = (t * 2) % (hits + 1), done = Math.min(Math.floor(k), hits);
      g.fillStyle = '#e8dcc0'; g.beginPath(); g.roundRect(80, 420, 880, 34, 8); g.fill();
      g.fillStyle = '#e5322d'; g.beginPath(); g.roundRect(80, 420, 880 * Math.max(0, 1 - done * dmg / hp), 34, 8); g.fill();
      for (let i = 1; i < hits; i++) { const x = 80 + 880 * i * dmg / hp; if (x < 960) { g.strokeStyle = '#fffaf0'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, 420); g.lineTo(x, 454); g.stroke(); } }
      T.label(`Enemy HP ${Math.max(0, hp - done * dmg)} / ${hp}`, 520, 478, 'center', C.ink, 15);
      if (k % 1 < .35 && done < hits) T.popText(`-${dmg}`, 80 + 880 * Math.min(1, (done + 1) * dmg / hp) - 30, 400 - 40 * (k % 1), C.redDk, 1 - (k % 1) * 2);
      txt(g, lock ? 'The numbers get bigger, but the fight feels the same.' : 'The proportion changed, so the fight changed.', 520, 530, '600 16px Jost', C.muted, 'center');
      $(s, '.sc-hv').textContent = hero; $(s, '.sc-fv').textContent = foe;
      const key = [hero, foe, lock].join(); if (key === st.key) return; st.key = key;
      say($(s, '.sc-out'), lock
        ? `Level ${hero} against level ${foe}: ${dmg} damage into ${hp} HP is still ${hits} hits. Growing at the same rate is a symmetry of scale.`
        : `Now the enemy outgrows the hero: ${dmg} damage into ${hp} HP is ${hits} hits. A change of proportion is a change the player can feel.`);
    }
    apis.scale = { seek(t) { st.held = st.tour = true; st.t = t; render(); }, dur: () => 14 };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > 14) st.t = 0; render(); };
  });

  /* ---------- 2: three swords, three fights ---------- */
  const FIGHTS = {
    horde: { name: 'Horde: 40 rats (5 HP)', foes: Array(40).fill(5) },
    brute: { name: 'Brute: one 50 HP brute', foes: [50] },
    mixed: { name: 'Mixed: 15 rats, then the brute', foes: [...Array(15).fill(5), 50] },
  };
  // swing by swing: returns { log: [{ foe, hp }], kills, swings, broke }
  function fight(sw, foes) {
    let dur = sw.dur, swings = 0, kills = 0; const log = [];
    for (let i = 0; i < foes.length; i++) {
      let hp = foes[i];
      while (hp > 0) { if (dur <= 0) return { log, kills, swings, broke: true, total: foes.length }; hp -= sw.power; dur--; swings++; log.push({ foe: i, hp: Math.max(0, hp), dur }); }
      kills++;
    }
    return { log, kills, swings, broke: dur <= 0 && false, total: foes.length, left: dur };
  }
  const STEP = .16;
  canvasDemo('gauntlet', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, fight: 'horde', key: '' };
    const tourBtn = $(s, '.ga-tour');
    $$(s, '.ga-fight .btn').forEach(b => b.onclick = () => { st.tour = false; tourBtn.classList.remove('on'); st.fight = b.dataset.f; st.t = 0; });
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    const ORDER = ['horde', 'brute', 'mixed'], PER = 9;
    function render() {
      let f = st.fight, t = st.t;
      if (st.tour) { const i = Math.floor(st.t / PER) % 3; f = ORDER[i]; t = st.t - i * PER; }
      $$(s, '.ga-fight .btn').forEach(b => b.classList.toggle('on', b.dataset.f === f));
      const F = FIGHTS[f], res = SWORDS.map(sw => fight(sw, F.foes));
      T.use(g); panel(g);
      txt(g, F.name, 30, 30, '800 22px Montserrat');
      const bestKills = Math.max(...res.map(r => r.kills)), fin = res.filter(r => r.kills === r.total), fewest = fin.length ? Math.min(...fin.map(r => r.swings)) : null;
      SWORDS.forEach((sw, i) => {
        const r = res[i], y0 = 70 + i * 165, n = Math.min(r.log.length, Math.floor(t / STEP)), cur = r.log[n - 1];
        const over = n >= r.log.length && t > 0;
        g.fillStyle = 'rgba(21,32,68,.05)'; g.beginPath(); g.roundRect(20, y0, 1000, 150, 10); g.fill();
        swIcon(g, sw, 84, y0 + 100, 56);
        txt(g, sw.name, 40, y0 + 22, '800 18px Montserrat');
        txt(g, `Power ${sw.power} · Durability ${sw.dur}`, 40, y0 + 46, '600 14px Jost', C.muted);
        // durability bar
        const durLeft = cur ? cur.dur : sw.dur;
        g.fillStyle = '#e8dcc0'; g.fillRect(150, y0 + 120, 220, 14); g.fillStyle = durLeft > 0 ? sw.col : '#e5322d'; g.fillRect(150, y0 + 120, 220 * durLeft / sw.dur, 14);
        txt(g, `durability ${durLeft}`, 380, y0 + 127, '600 13px Jost', C.muted);
        // enemies: a row of pips, the current one with an HP bar
        const foes = F.foes, cols = foes.length > 1 ? Math.min(foes.length, 40) : 1;
        foes.forEach((hp, j) => {
          const big = hp >= 50, x = big ? 800 : 470 + (j % 20) * 15, y = big ? y0 + 70 : y0 + 50 + Math.floor(j / 20) * 22;
          const dead = cur && (cur.foe > j || (cur.foe === j && cur.hp <= 0));
          const now = cur && cur.foe === j && cur.hp > 0;
          g.globalAlpha = dead ? .18 : 1;
          g.fillStyle = big ? C.red : '#a8201c'; g.beginPath(); g.arc(x, y, big ? 34 : 6, 0, 7); g.fill();
          if (big) GI.draw(g, 'daemon-skull', x, y, 44, '#fff');
          if (big && now) { g.fillStyle = '#fff'; g.fillRect(x - 40, y + 42, 80, 8); g.fillStyle = '#e5322d'; g.fillRect(x - 40, y + 42, 80 * cur.hp / hp, 8); }
          g.globalAlpha = 1;
        });
        // tallies
        txt(g, `${cur ? r.log.slice(0, n).filter((e, k) => e.hp <= 0).length : 0} / ${r.total}`, 900, y0 + 40, '800 26px Montserrat', C.ink, 'left');
        txt(g, 'enemies down', 900, y0 + 66, '600 13px Jost', C.muted);
        txt(g, `${n} swings`, 900, y0 + 96, '700 15px Jost', C.ink);
        if (over) {
          const tag = r.kills < r.total ? `Broke after ${r.kills} of ${r.total}` : (r.swings === fewest ? `Fewest swings: ${r.swings}` : `Finished: ${r.swings} swings`);
          T.label(tag, 640, y0 + 126, 'center', r.kills < r.total ? C.redDk : (r.swings === fewest ? C.good : C.ink), 15);
        }
      });
      const key = f; if (key === st.key) return; st.key = key;
      const fitText = { horde: 'Only the Beginner Blade lasts through 40 rats: 50 durability, one swing each. The Legend Sword breaks after 14.', brute: 'Against one 50 HP brute the Legend Sword needs 2 swings, the Beginner Blade 10. Every swing is another chance for the brute to hit back.', mixed: 'Rats and a brute: the Legend Sword breaks on the rats, the Beginner Blade grinds through in 25 swings, the Knight Sword finishes in 19.' };
      say($(s, '.ga-out'), fitText[f] + ' Each sword has a fight it suits best.');
    }
    apis.gauntlet = { seek(t) { st.held = st.tour = true; st.t = t; render(); }, dur: () => PER * 3 };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > PER * 3) st.t = 0; if (!st.tour && st.t > 9) st.t = 9; render(); };
  });

  /* ---------- 3: orthogonality, one variable at a time ---------- */
  const VARS = [['power', 'Power'], ['dur', 'Durability'], ['price', 'Price (g)'], ['speed', 'Speed'], ['range', 'Range (ft)']];
  const lowBest = { price: true };
  canvasDemo('ortho', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, on: new Set(['power']), key: '' };
    const tourBtn = $(s, '.or-tour');
    $(s, '.or-vars').innerHTML = VARS.map(([k, n]) => `<label class="chk"><input type="checkbox" data-k="${k}" ${k === 'power' ? 'checked' : ''}> ${n}</label>`).join('');
    $$(s, '.or-vars input').forEach(i => i.onchange = () => { st.tour = false; tourBtn.classList.remove('on'); st.on[i.checked ? 'add' : 'delete'](i.dataset.k); if (!st.on.size) { st.on.add('power'); i.checked = true; } });
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    function render() {
      let on = st.on;
      if (st.tour) { const n = clamp(Math.floor(st.t / 3.2) + 1, 1, 5); on = new Set(VARS.slice(0, n).map(v => v[0])); $$(s, '.or-vars input').forEach(i => i.checked = on.has(i.dataset.k)); }
      const vars = VARS.filter(v => on.has(v[0]));
      T.use(g); panel(g);
      const max = k => Math.max(...SWORDS.map(sw => sw[k]));
      const cx = 330, cy = 300, R = 200;
      if (vars.length === 1) {
        const [k, n] = vars[0];
        txt(g, `${n} only: the swords differ by degree`, cx, 60, '800 20px Montserrat', C.ink, 'center');
        g.strokeStyle = C.navy; g.lineWidth = 3; g.beginPath(); g.moveTo(80, cy); g.lineTo(580, cy); g.stroke();
        SWORDS.forEach((sw, i) => { const x = 80 + 500 * sw[k] / max(k); g.fillStyle = sw.col; g.beginPath(); g.arc(x, cy, 14, 0, 7); g.fill(); swIcon(g, sw, x, cy, 20, '#fff'); txt(g, `${sw.name} ${sw[k]}`, x, cy + (i % 2 ? 40 : -40), '700 15px Jost', C.ink, 'center'); });
        txt(g, 'One axis: the Legend Sword is simply more. Nothing to choose between.', cx, 470, '600 16px Jost', C.muted, 'center');
      } else if (vars.length === 2) {
        const [[kx, nx], [ky, ny]] = vars;
        txt(g, `${nx} against ${ny}: a tradeoff`, cx, 60, '800 20px Montserrat', C.ink, 'center');
        const x0 = 110, y0 = 480, w = 440, h = 360;
        g.strokeStyle = C.navy; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x0, y0 - h); g.lineTo(x0, y0); g.lineTo(x0 + w, y0); g.stroke();
        txt(g, nx, x0 + w, y0 + 22, '700 15px Jost', C.ink, 'right'); txt(g, ny, x0 - 10, y0 - h - 16, '700 15px Jost', C.ink, 'left');
        SWORDS.forEach(sw => { const x = x0 + w * sw[kx] / max(kx), y = y0 - h * sw[ky] / max(ky); g.fillStyle = sw.col; g.beginPath(); g.arc(x, y, 14, 0, 7); g.fill(); swIcon(g, sw, x, y, 20, '#fff'); txt(g, `${sw.name} (${sw[kx]}, ${sw[ky]})`, x + (x > 400 ? -20 : 20), y - 24, '700 14px Jost', C.ink, x > 400 ? 'right' : 'left'); });
      } else {
        txt(g, `${vars.length} variables: each sword has its own shape`, cx, 40, '800 20px Montserrat', C.ink, 'center');
        const ang = i => -Math.PI / 2 + i * 2 * Math.PI / vars.length;
        g.strokeStyle = '#d8ccb0'; g.lineWidth = 1.5;
        [.25, .5, .75, 1].forEach(f => { g.beginPath(); vars.forEach((v, i) => { const a = ang(i); i ? g.lineTo(cx + R * f * Math.cos(a), cy + R * f * Math.sin(a)) : g.moveTo(cx + R * f * Math.cos(a), cy + R * f * Math.sin(a)); }); g.closePath(); g.stroke(); });
        vars.forEach(([k, n], i) => { const a = ang(i); g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + R * Math.cos(a), cy + R * Math.sin(a)); g.stroke(); txt(g, n, cx + (R + 36) * Math.cos(a), cy + (R + 22) * Math.sin(a), '700 15px Jost', C.ink, 'center'); });
        SWORDS.forEach(sw => {
          g.beginPath(); vars.forEach(([k], i) => { const a = ang(i), r = R * (.12 + .88 * sw[k] / max(k)); i ? g.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a)) : g.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a)); });
          g.closePath(); g.globalAlpha = .18; g.fillStyle = sw.col; g.fill(); g.globalAlpha = 1; g.strokeStyle = sw.col; g.lineWidth = 3.5; g.stroke();
        });
      }
      // who leads on which variable
      txt(g, 'Leads on', 690, 60, '800 20px Montserrat');
      SWORDS.forEach((sw, i) => {
        const lead = vars.filter(([k]) => { const vals = SWORDS.map(x => x[k]); return sw[k] === (lowBest[k] ? Math.min(...vals) : Math.max(...vals)); }).map(v => v[1].replace(/ \(.*\)/, '') + (lowBest[v[0]] ? ' (cheapest)' : ''));
        const y = 110 + i * 120;
        g.fillStyle = sw.col; g.beginPath(); g.roundRect(680, y - 16, 10, 80, 4); g.fill(); swIcon(g, sw, 980, y + 20, 48);
        txt(g, sw.name, 704, y, '800 18px Montserrat');
        txt(g, lead.length ? lead.join(', ') : 'nothing yet', 704, y + 30, '600 16px Jost', lead.length ? C.ink : C.muted);
        txt(g, VARS.filter(v => on.has(v[0])).map(([k, n]) => `${n.replace(/ \(.*\)/, '')} ${sw[k]}`).join(' · '), 704, y + 56, '500 13px Jost', C.muted);
      });
      const key = [...on].join(); if (key === st.key) return; st.key = key;
      const niches = SWORDS.filter(sw => vars.some(([k]) => { const vals = SWORDS.map(x => x[k]); return sw[k] === (lowBest[k] ? Math.min(...vals) : Math.max(...vals)); })).length;
      say($(s, '.or-out'), vars.length === 1
        ? 'With one variable there is only a bigger and a smaller sword.'
        : `${niches} of 3 swords lead on at least one variable. ${niches === 3 ? 'Every sword has a niche of its own: that is orthogonality.' : 'Add a variable and see who gains a niche.'}`);
    }
    apis.ortho = { seek(t) { st.held = st.tour = true; st.t = t; render(); }, dur: () => 16 };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > 16) st.t = 0; render(); };
  });

  window.__seek = (t, w) => apis[w].seek(t);
  window.__dur = w => apis[w].dur();
})();
