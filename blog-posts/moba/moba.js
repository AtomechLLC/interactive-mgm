/* MOBA (genre breakdown: "MOBA Game Design").
   Slide 1, last hits: one wave of three melee and three caster minions. Gold goes only to the killing blow: 21 for a
   melee minion and 14 for a caster (League of Legends' values). Their health (477 and 296, roughly a level-1 wave) drops
   as your own minions hit them; your champion's attack does 60 after a 0.25 s wind-up, once a second. Ally minion
   damage and timings are illustrative. Click a red minion to attack it.
   Slide 2, answers: five champions, the disruption each brings and which of the others answers it. Take a champion
   out of the pool and any disruption left with no answer lights up: "no champion should do something the opponent has
   no tools to deal with". The ability descriptions are simplified. */
(function () {
  const C = TD.C, { clamp, lerp } = TD;
  const IMG = n => GK.img('img/' + n + '.png');

  /* ---------- slide 1: last hits ---------- */
  const AD = 60, WIND = .25, CD = 1, END = 10;
  const WAVE = [0, 1, 2, 3, 4, 5].map(i => {
    const melee = i < 3, r = GK.rng(i + 4);
    return { melee, hp: melee ? 477 : 296, gold: melee ? 21 : 14, start: 1 + r() * .6, dps: (melee ? 70 : 48) + r() * 20, x: melee ? 700 : 810, y: 140 + (i % 3) * 85 + (melee ? 0 : 20) };
  });
  function wave(t, attacks) {     // replay: each minion's health and who killed it, given the player's attacks
    const st = WAVE.map(m => ({ hp: m.hp, dead: null, by: null }));
    const events = attacks.map(a => ({ t: a.t + WIND, i: a.i })).sort((a, b) => a.t - b.t);
    for (let k = 0, x = 0; x <= t + 1e-9; x = Math.round((x + .02) * 100) / 100) {
      WAVE.forEach((m, i) => { const s = st[i]; if (s.dead == null && x >= m.start) { s.hp -= m.dps * .02; if (s.hp <= 0) { s.dead = x; s.by = 'ally'; } } });
      while (k < events.length && events[k].t <= x) { const e = events[k++], s = st[e.i]; if (s.dead == null) { s.hp -= AD; if (s.hp <= 0) { s.dead = e.t; s.by = 'you'; } } }
    }
    return st;
  }
  function policy(kind) {          // the walk-through's attacks: hit whenever ready, or wait for the killing blow
    const at = []; let ready = .5;
    for (let x = .5; x < END; x = Math.round((x + .05) * 100) / 100) {
      if (x < ready) continue;
      const st = wave(x, at); let pick = -1;
      if (kind === 'eager') pick = st.findIndex((s, i) => s.dead == null && x >= WAVE[i].start);   // hit the minion in front
      else st.forEach((s, i) => { if (pick < 0 && s.dead == null && s.hp - WAVE[i].dps * WIND <= AD && s.hp - WAVE[i].dps * (WIND + .03) > 0) pick = i; });
      if (pick >= 0) { at.push({ t: x, i: pick }); ready = x + CD; }
    }
    return at;
  }
  const POL = { eager: policy('eager'), patient: policy('patient') };
  const goldOf = st => st.reduce((a, s, i) => a + (s.by === 'you' ? WAVE[i].gold : 0), 0);
  const MAXG = WAVE.reduce((a, m) => a + m.gold, 0);

  GK.scene('lasthit', (s, g, ui) => {
    const cv = s.querySelector('canvas.demo'); let mine = [], t0 = 0;
    const reset = s.querySelector('.lh-reset');
    reset.onclick = () => { ui.stopTour(); mine = []; t0 = ui.t; };
    cv.addEventListener('pointerdown', e => {
      const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * 1040, y = (e.clientY - r.top) / r.height * 585;
      if (ui.tour) { ui.stopTour(); mine = []; t0 = ui.t; }
      const lt = ui.t - t0, st = wave(lt, mine), last = mine[mine.length - 1];
      if (last && lt < last.t + CD) return;
      WAVE.forEach((m, i) => { if (Math.hypot(x - m.x, y - m.y) < 34 && st[i].dead == null) mine.push({ t: lt, i }); });
    });
    const DUR = END * 2;
    return {
      dur: DUR,
      frame(t, tour) {
        let lt, attacks, label;
        if (tour) { const pass = t < END ? 'eager' : 'patient'; lt = t % END; attacks = POL[pass]; label = pass === 'eager' ? 'Hit the minion in front whenever you can' : 'Wait for the killing blow'; }
        else { lt = ui.t - t0; if (lt > END + 1.5) { mine = []; t0 = ui.t; lt = 0; } attacks = mine; label = 'Your turn: click a red minion'; }
        const st = wave(lt, attacks);
        GK.panel(g);
        g.fillStyle = '#6f8f55'; g.beginPath(); g.roundRect(16, 16, 1008, 360, 12); g.fill();
        g.fillStyle = '#b8a77d'; g.fillRect(16, 110, 1008, 200);
        GK.head(g, label, 34, 46, 'left', '#fff', 18);
        // ally minions
        [0, 1, 2].forEach(k => { [[430, 120 + k * 85, 'melee'], [350, 150 + k * 85, 'caster']].forEach(([x, y, kind]) => { const im = IMG(`lol-minion-${kind}-blue`); if (im) g.drawImage(im, x - 26, y - 26, 52, 52); }); });
        // player
        TD.player(250, 210, 0, 1.2);
        const cool = attacks.filter(a => a.t <= lt).pop();
        if (cool && lt - cool.t < CD) { g.strokeStyle = C.gold; g.lineWidth = 4; g.beginPath(); g.arc(250, 210, 30, -Math.PI / 2, -Math.PI / 2 + (lt - cool.t) / CD * 6.283); g.stroke(); }
        attacks.forEach(a => { const k = (lt - a.t) / WIND; if (k < 0 || k > 1) return; const m = WAVE[a.i]; g.fillStyle = C.gold; g.beginPath(); g.arc(lerp(270, m.x, k), lerp(210, m.y, k), 6, 0, 6.283); g.fill(); });
        WAVE.forEach((m, i) => {
          const s2 = st[i];
          if (s2.dead != null) {
            const age = lt - s2.dead; if (age < 1.2) { g.save(); g.globalAlpha = 1 - age / 1.2; GK.head(g, s2.by === 'you' ? `+${m.gold} gold` : 'missed', m.x, m.y - age * 30, 'center', s2.by === 'you' ? C.gold : '#fff', 18); g.restore(); }
            return;
          }
          const im = IMG(`lol-minion-${m.melee ? 'melee' : 'caster'}-red`); if (im) g.drawImage(im, m.x - 30, m.y - 30, 60, 60);
          const k = clamp(s2.hp / m.hp), low = s2.hp <= AD;
          g.fillStyle = '#222'; g.fillRect(m.x - 30, m.y - 44, 60, 8); g.fillStyle = low ? C.gold : C.red; g.fillRect(m.x - 30, m.y - 44, 60 * k, 8);
          g.fillStyle = '#fff'; g.fillRect(m.x - 30 + 60 * AD / m.hp, m.y - 44, 1.5, 8);
        });
        GK.text(g, 'the white tick on each health bar is one hit of yours: under it, your hit kills', 34, 362, '#fff', 13, 'left', 600);
        // tally
        const g1 = goldOf(st), yours = st.filter(x => x.by === 'you').length, missed = st.filter(x => x.by === 'ally').length;
        GK.big(g, `${g1} / ${MAXG}`, 'gold from this wave', 40, 430);
        GK.big(g, `${yours}`, 'last hits', 260, 430, C.good);
        GK.big(g, `${missed}`, 'minions your own wave finished', 380, 430, C.red);
        GK.big(g, `${attacks.filter(a => a.t <= lt).length}`, 'attacks thrown', 660, 430);
        const fe = goldOf(wave(END, POL.eager)), fp = goldOf(wave(END, POL.patient));
        GK.wrap(g, 'Only the killing blow pays. Hitting early just hands the kill to your own minions; waiting for the health bar to cross the tick earns the gold, over every wave of a 30 minute game.', 40, 500, 960, 20, C.ink, 15);
        ui.stats(`<div class="r"><b>${fe}</b><span>gold hitting the front minion whenever ready</span></div><div class="g"><b>${fp}</b><span>gold waiting for the last hit</span></div>`);
        ui.out(tour ? 'Click any red minion to take over.' : 'Attack once a second; gold only if your hit is the one that kills.');
      },
    };
  });

  /* ---------- slide 2: every disruption has an answer ---------- */
  const CH = ['Malphite', 'Zed', 'Vayne', 'Morgana', 'Janna'];
  const THREATS = [
    ['Malphite', 'Unstoppable Force', 'charges in and knocks up a whole team', { Janna: 'Monsoon throws him back off the carries', Morgana: 'Black Shield keeps one ally free of the knock-up' }],
    ['Zed', 'Death Mark', 'marks one carry and bursts them down', { Janna: 'Eye of the Storm shields the marked carry' }],
    ['Vayne', 'Silver Bolts', 'true damage that shreds even tanks', { Malphite: 'Unstoppable Force lands on a short-range carry', Morgana: 'Dark Binding roots her in place', Zed: 'Death Mark bursts a fragile carry' }],
    ['Morgana', 'Dark Binding', 'roots one target for a long time', { Morgana: 'Black Shield on the target blocks the root', Janna: 'Monsoon pushes her back before the follow-up' }],
    ['Janna', 'Monsoon', 'knocks the whole fight apart', { Morgana: 'Black Shield blocks the knock-back', Zed: 'Death Mark is already ticking when she pushes him' }],
  ];
  GK.scene('answers', (s, g, ui) => {
    const btns = [...s.querySelectorAll('.mb-ch .btn')]; ui.watch(btns);
    const pool = new Set(CH);
    btns.forEach(b => b.onclick = () => { const n = b.dataset.c; pool.has(n) ? pool.delete(n) : pool.add(n); });
    const ACTS = [{ to: 5, out: [] }, { to: 11, out: ['Janna'] }, { to: 17, out: ['Morgana'] }, { to: 23, out: ['Janna', 'Morgana'] }, { to: 27, out: [] }];
    return {
      dur: 27,
      frame(t, tour) {
        if (tour) { const [a] = GK.act(ACTS, t); pool.clear(); CH.filter(c => !a.out.includes(c)).forEach(c => pool.add(c)); }
        btns.forEach(b => b.classList.toggle('on', pool.has(b.dataset.c)));
        GK.panel(g);
        const x0 = 250, cw = 154, y0 = 92, rh = 94;
        GK.head(g, 'Disruption', 24, 40); GK.head(g, 'Who answers it', x0, 40);
        CH.forEach((c, j) => {
          const x = x0 + j * cw, im = IMG('lol-champ-' + c), on = pool.has(c);
          g.save(); g.globalAlpha = on ? 1 : .25; if (im) { g.beginPath(); g.arc(x + cw / 2 - 40, 66, 18, 0, 6.283); g.clip(); g.drawImage(im, x + cw / 2 - 58, 48, 36, 36); } g.restore();
          GK.text(g, c, x + cw / 2 - 16, 71, on ? C.ink : '#b9ad92', 13, 'left', 700);
        });
        let gaps = 0;
        THREATS.forEach(([who, name, what, ans], i) => {
          const y = y0 + i * rh, on = pool.has(who), live = Object.keys(ans).filter(c => pool.has(c)), gap = on && !live.length;
          if (gap) gaps++;
          GK.box(g, 14, y, 1012, rh - 8, gap ? '#f9d9d6' : on ? '#fffaf0' : 'rgba(255,250,240,.4)', gap ? C.red : '#cdbf9f', 10, gap ? 3 : 2);
          g.save(); g.globalAlpha = on ? 1 : .3;
          const im = IMG('lol-champ-' + who); if (im) g.drawImage(im, 24, y + 10, 64, 64);
          GK.head(g, name, 98, y + 30, 'left', C.ink, 15); GK.wrap(g, what, 98, y + 50, 140, 16, C.muted, 12);
          CH.forEach((c, j) => {
            const x = x0 + j * cw; if (!ans[c]) return;
            const ok = pool.has(c);
            GK.box(g, x + 4, y + 8, cw - 8, rh - 24, ok ? '#d8f0df' : '#eee6d6', ok ? '#5fb47c' : '#d8ccb0', 8, 1.5);
            GK.wrap(g, ans[c], x + 12, y + 28, cw - 24, 15, ok ? '#145c33' : '#a89c80', 12, 600);
          });
          g.restore();
          if (gap) GK.text(g, 'no answer in this pool', 1016, y + rh - 16, C.redDk, 13, 'right', 800);
          if (!on) GK.text(g, `${who} is out of the pool`, 1016, y + rh - 16, '#a89c80', 12, 'right', 600);
        });
        ui.stats(`<div class="${gaps ? 'r' : 'g'}"><b>${gaps}</b><span>disruptions with no answer</span></div><div><b>${pool.size}</b><span>champions in the pool</span></div>`);
        ui.out(gaps ? 'Take out the only answer and a disruption becomes something the other side can do nothing about. That is the balance problem the post warns about, not the champion’s raw power.'
          : 'Every disruption in the pool has at least one answer, so each one is a threat to play around, not a coin flip.');
      },
    };
  });
})();
