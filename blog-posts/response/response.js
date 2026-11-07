/* Lesson 3: Response ("Learning From My Past", xelnath.com, 2012). Five slides:
   1. Dragon of four answers ("Lesson 3. Response"): the post's dragon, its claws, breath, skin and heart, with one answer
      per scene tagged as a reaction, a preparation or a recuperation. The learner calls the type before it is shown.
   2. Sort the answers: twelve counters from the series (and the games it names) into the three types.
   3. Swap the tool ("Reactive Responses"): Trinexx from The Legend of Zelda: A Link to the Past, drawn here as three
      heads, each answering to one tool. Wrong tools deflect with a ting ("Negative Reinforcement" reuses that sound).
   4. Kick practice ("Reactive Responses"): interrupt a caster; the walk-through is a simulated player whose reaction time
      falls with practice (an illustrative curve). "Frequency leads to reinforcement, reinforcement to mastery."
   5. First meeting, second meeting ("Preparation and Recuperation"): an exploding creature, as in the post's Diablo III
      example, met without and with a warning animation. Damage numbers are illustrative. */
(function () {
  const { $, $$, canvasDemo, demo, say, store } = FPF.kit;
  const { C, TAU, clamp, lerp, ease, IM, rr, wrap, text, icon } = LP;
  const W = 1040, H = 585;
  const TYPES = {
    react: ['Reaction', C.react, 'I see it occurring and I counter it now.'],
    prep: ['Preparation', C.prep, 'I know it can occur and I act before it does.'],
    recup: ['Recuperation', C.recup, 'It happened, and I recover from the consequences.'],
  };
  const arena = (g, x = 10, y = 10, w = 600, h = 565) => { TD.use(g); g.save(); rr(g, x, y, w, h, 14); g.clip(); TD.floor(x, y, w, h); g.restore(); g.strokeStyle = C.line; g.lineWidth = 2; rr(g, x, y, w, h, 14); g.stroke(); };
  const pop = (t, x, y, col, age) => TD.popText(t, x, y - age * 30, col, 1 - age);

  /* ---------------- 1. Dragon of four answers ---------------- */
  const D = { x: 310, y: 160 };
  const P0 = { tank: [310, 262, '#5562eb', 'tank'], f1: [250, 250, '#e08a2c', 'fighter'], f2: [370, 250, '#e08a2c', 'fighter'], arch: [170, 440, '#8a4fd6', 'archer'], heal: [420, 470, '#2fae63', 'healer'] };
  function dragon(g, o = {}) {
    // wings, body, head toward the party
    g.fillStyle = '#5b2a22'; [-1, 1].forEach(s => { g.beginPath(); g.moveTo(D.x + s * 40, D.y - 10); g.lineTo(D.x + s * 150, D.y - 70); g.lineTo(D.x + s * 120, D.y + 20); g.closePath(); g.fill(); });
    TD.foe(D.x, D.y, 58, Math.PI / 2, o.rear ? '#9b3a2a' : '#7a2a1c', { edge: '#3a120c', mark: 'horns' });
    // the heart on its chest
    const hk = o.heart ?? .25; g.fillStyle = `rgba(255,${180 + 60 * hk},80,${.35 + .6 * hk})`; g.beginPath(); g.arc(D.x, D.y + 18, 10 + 8 * hk, 0, TAU); g.fill();
    if (o.glow) { const gr = g.createRadialGradient(D.x, D.y + 62, 0, D.x, D.y + 62, 12 + 28 * o.glow); gr.addColorStop(0, `rgba(255,250,200,${o.glow})`); gr.addColorStop(1, 'rgba(255,140,40,0)'); g.fillStyle = gr; g.beginPath(); g.arc(D.x, D.y + 62, 40, 0, TAU); g.fill(); }
  }
  function party(g, pos, o = {}) {
    Object.entries(P0).forEach(([k, [x0, y0, col, name]]) => {
      const [x, y] = pos[k] || [x0, y0];
      if (o.aura && o.aura[k]) { g.strokeStyle = 'rgba(255,140,40,.8)'; g.lineWidth = 4; g.beginPath(); g.arc(x, y, 26, 0, TAU); g.stroke(); }
      if (o.ring && o.ring.includes(k)) { g.strokeStyle = C.gold; g.lineWidth = 4; g.beginPath(); g.arc(x, y, 28, 0, TAU); g.stroke(); }
      TD.player(x, y, Math.atan2(D.y - y, D.x - x), .75, 1, col);
      if (o.hp) TD.hp(x, y - 28, 34, o.hp[k] ?? 100, 100);
      if (o.names) TD.label(name, x, y + 30, 'center', C.muted, 11, 'rgba(255,252,244,.7)');
    });
  }
  const mv = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
  const P = k => [P0[k][0], P0[k][1]];
  const DRAGON = [
    { id: 'claws', len: 6, label: 'The claws', type: 'react', ans: 'see it rear up, step to its side', cap: 'Its claws are slow and only swipe forward. When it rears up, the fighters step to its sides; the tank takes the swipe on a shield.', draw(g, u) {
      arena(g); const rear = u > .8 && u < 3, k = ease(clamp((u - 1.4) / 1, 0, 1));
      dragon(g, { rear }); if (rear) TD.label('rears up', D.x, D.y - 80, 'center', C.red, 14);
      const swipe = u > 3 && u < 3.6; TD.cone(D.x, D.y, Math.PI / 2, .55, 150, swipe ? 1 : .25);
      party(g, { f1: mv(P('f1'), [170, 175], k), f2: mv(P('f2'), [450, 175], k) }, { names: true });
      if (swipe) TD.flash(P0.tank[0], P0.tank[1], 30, .7);
      if (u > 3.6) TD.label('the fighters are clear', 310, 360, 'center', C.green, 14);
    } },
    { id: 'breath', len: 6, label: 'The breath', type: 'react', ans: 'see the glow, leave the cone', cap: 'Before it breathes, its throat glows. The party sees the glow and leaves the cone before the fire comes.', draw(g, u) {
      arena(g); const glow = clamp((u - .5) / 2), k = ease(clamp((u - 1.6) / 1.1)), fire = u > 3 && u < 4.4;
      dragon(g, { glow: u < 4.4 ? glow : 0 }); if (u > .6 && u < 3) TD.label('the throat glows', D.x, D.y - 80, 'center', C.goldInk, 14);
      TD.cone(D.x, D.y, Math.PI / 2, .75, 420, fire ? 1.4 : .2, '255,120,30');
      party(g, { tank: mv(P('tank'), [80, 230], k), f1: mv(P('f1'), [60, 160], k), f2: mv(P('f2'), [560, 160], k), arch: mv(P('arch'), [60, 420], k), heal: mv(P('heal'), [560, 420], k) }, { names: true });
      if (u > 4.4) TD.label('nobody in the fire', 310, 380, 'center', C.green, 14);
    } },
    { id: 'resist', len: 6, label: 'Fire resistance', type: 'prep', ans: 'put on fire resistance before the pull', cap: 'Before the fight, everyone puts on fire resistance. The breath still lands, but it takes a fraction of the health it would.', draw(g, u) {
      arena(g); const on = clamp(u / 1.2), fire = u > 3 && u < 4.2, after = u > 3.4;
      dragon(g, { glow: clamp((u - 1.6) / 1.4) * (u < 4.2) });
      TD.cone(D.x, D.y, Math.PI / 2, .75, 420, fire ? 1.4 : .15, '255,120,30');
      const aura = {}; Object.keys(P0).forEach(k => aura[k] = on > .5);
      const hp = {}; Object.keys(P0).forEach(k => hp[k] = after ? 82 : 100);
      party(g, {}, { aura, hp, names: true });
      if (u < 2.6) { TD.label('before the pull', 310, 360, 'center', C.prep, 14); icon(g, '../img/spell_fire_firearmor.jpg', 520, 330, 40); }
      if (after) { pop('-18', 310, 230, C.red, clamp((u - 3.4) / 1.4)); TD.label('without it: about -60 each', 310, 360, 'center', C.muted, 13); }
    } },
    { id: 'skin', len: 6, label: 'The skin', type: 'react', ans: 'hear the clang, switch to the heart', cap: 'Blades bounce off its armoured skin with a metal clang. The fighter hears it and switches to the glowing heart.', draw(g, u) {
      arena(g); const sw = u > 2.3, hk = sw ? .9 + .1 * Math.sin(u * 8) : .3;
      dragon(g, { heart: hk });
      const pos = sw ? mv([400, 130], [360, 228], ease(clamp((u - 2.3) / .7))) : [400, 130];
      party(g, { f2: pos, tank: [300, 290] }, { names: true });
      [[.8, '0'], [1.6, '0']].forEach(([t0, s]) => { if (u > t0 && u < t0 + .9) { pop(s, 380, 110, C.muted, (u - t0) / .9); TD.label('clang', 430, 90, 'center', C.muted, 13); } });
      [[3.3, '-120'], [4.1, '-120'], [4.9, '-120']].forEach(([t0, s]) => { if (u > t0 && u < t0 + .9) pop(s, D.x + 40, D.y + 30, C.red, (u - t0) / .9); });
    } },
    { id: 'heart', len: 6, label: 'The heart', type: 'prep', ans: 'plan who stands at the heart before it opens', cap: 'The heart opens at a known moment. Before the fight, the raid picks two fighters to stand under it, so they are already there when it glows.', draw(g, u) {
      arena(g); const open = u > 2.6, hk = open ? 1 : .2;
      dragon(g, { heart: hk });
      party(g, { f1: [275, 240], f2: [345, 240], tank: [310, 310] }, { ring: ['f1', 'f2'], names: true });
      if (u < 2.6) TD.label('the plan: these two take the heart', 310, 360, 'center', C.prep, 14);
      if (open) { TD.label('it opens: they are already there', 310, 360, 'center', C.green, 14); [[2.9, '-150'], [3.4, '-150'], [3.9, '-150'], [4.4, '-150']].forEach(([t0, s], i) => { if (u > t0 && u < t0 + .9) pop(s, D.x + (i % 2 ? 30 : -30), D.y + 30, C.red, (u - t0) / .9); }); }
    } },
    { id: 'recover', len: 6, label: 'After the breath', type: 'recup', ans: 'heal up and drink potions after the hit', cap: 'The breath landed on half the party. Nobody panics: the healer catches up and the others drink potions before the next attack.', draw(g, u) {
      arena(g); dragon(g);
      const k = clamp((u - .8) / 3.5), base = { tank: 35, f1: 30, f2: 45, arch: 40, heal: 60 }, hp = {};
      Object.keys(base).forEach(n => hp[n] = lerp(base[n], 95, ease(k)));
      party(g, {}, { hp, names: true });
      if (u > .8 && u < 4.4) Object.keys(P0).filter(n => n !== 'heal').forEach((n, i) => { if (Math.floor(u * 2) % 4 === i) TD.tracer(P0.heal[0], P0.heal[1], P0[n][0], P0[n][1], .7, '#7be39a', 3); });
      if (u > 1.4 && u < 3.4) { icon(g, '../img/inv_potion_54.jpg', 460, 300, 36); TD.label('potions', 478, 352, 'center', C.recup, 13); }
      if (u > 4.4) TD.label('back up before the next attack', 310, 360, 'center', C.green, 14);
    } },
  ];
  function dragonPanel(g, s, u, shown, guess) {
    const x0 = 630; g.fillStyle = C.paper; rr(g, x0, 10, 400, 565, 14); g.fill(); g.strokeStyle = C.line; g.lineWidth = 2; g.stroke();
    text(g, s.label.toUpperCase(), x0 + 20, 42, '600 13px Jost, sans-serif', C.muted);
    g.font = '800 22px Montserrat, Jost, sans-serif'; g.fillStyle = C.ink; g.textAlign = 'left'; const y = wrap(g, 'Answer: ' + s.ans, x0 + 20, 76, 360, 28);
    g.font = '500 16px Jost, sans-serif'; g.fillStyle = C.ink; wrap(g, s.cap, x0 + 20, y + 40, 360, 23);
    text(g, 'What kind of answer is it?', x0 + 20, 380, '600 15px Jost, sans-serif', C.muted);
    if (shown) {
      const [n, col, def] = TYPES[s.type];
      text(g, n, x0 + 20, 422, '800 32px Montserrat, Jost, sans-serif', col);
      g.font = '500 16px Jost, sans-serif'; g.fillStyle = C.ink; wrap(g, `“${def}”`, x0 + 20, 456, 360, 22);
      if (guess) text(g, guess === s.type ? 'You called it the same way.' : `You called it ${TYPES[guess][0].toLowerCase()}.`, x0 + 20, 520, '600 15px Jost, sans-serif', guess === s.type ? C.green : C.goldInk);
    } else text(g, 'Call it first →', x0 + 20, 422, '700 22px Montserrat, Jost, sans-serif', C.goldInk);
    // the three kinds as a strip
    Object.entries(TYPES).forEach(([k, [n, col]], i) => { const cnt = DRAGON.filter(d => d.type === k).length; g.fillStyle = col; rr(g, x0 + 20 + i * 124, 540, 114, 22, 6); g.fill(); text(g, `${n} ×${cnt}`, x0 + 77 + i * 124, 556, '600 13px Jost, sans-serif', '#fff', 'center'); });
  }
  LP.scenes('dragon', {
    scenes: DRAGON, menu: '.dr-menu', tour: '.dr-tour', out: '.dr-out',
    key: st => [st.guess, st.hits].join(),
    say: (s, st) => st.tour ? 'Each part of the dragon has an answer. Pick a scene to call the kind of answer yourself.' : 'Call it: <b>React</b>, <b>Prepare</b> or <b>Recuperate</b>.',
    setup(sl, st) {
      st.hits = 0; st.calls = 0; st.guess = null;
      const go = st.go; st.go = i => { go(i); st.guess = null; };
      $$(sl, '.dr-guess .btn').forEach(b => b.onclick = () => { if (st.tour || st.guess) return; st.guess = b.dataset.t; st.calls++; if (st.guess === DRAGON[st.i].type) st.hits++; $(sl, '.dr-score').innerHTML = `<div class="g"><b>${st.hits} / ${st.calls}</b><span>calls match the post’s three kinds</span></div>`; });
      $(sl, '.dr-score').innerHTML = '<div class="g"><b>0 / 0</b><span>calls match the post’s three kinds</span></div>';
    },
    frame(g, st, s) { dragonPanel(g, s, st.u, st.tour ? st.u > 2.5 : !!st.guess, st.tour ? null : st.guess); },
  });

  /* ---------------- 2. Sort the answers ---------------- */
  const CARDS = [
    ['Kick', 'World of Warcraft, Rogue', 'react', '../img/ability_kick.jpg', 'You see the cast start and interrupt it.'],
    ['Counterspell', 'Magic: The Gathering', 'react', '../img/spell_frost_iceshock.jpg', 'Played in answer to a spell on the stack.'],
    ['Step back from the exploder', 'Diablo III', 'react', null, 'The warning animation plays; you hit it and run.'],
    ['Enslave Demon', 'World of Warcraft, Warlock', 'react', '../img/spell_shadow_enslavedemon.jpg', 'A demon appears; you swap to the tool made for demons.'],
    ['Fire resistance gear', 'World of Warcraft', 'prep', '../img/spell_fire_firearmor.jpg', 'Worn before a fire boss you know is coming.'],
    ['Food buff', 'World of Warcraft', 'prep', '../img/inv_misc_food_15.jpg', 'Eaten before the pull.'],
    ['Pick up the Ice Beam early', 'Metroid', 'prep', null, 'The tool is in hand before the enemy that needs it.'],
    ['Mark crowd-control targets', 'World of Warcraft', 'prep', null, 'Decided before the pack is pulled.'],
    ['Divine Shield, then heal', 'World of Warcraft, early Paladin', 'recup', '../img/spell_holy_divineshield.jpg', 'Bubble after the damage lands, then heal yourself up.'],
    ['Bandage', 'World of Warcraft', 'recup', '../img/inv_misc_bandage_15.jpg', 'Recover health after the fight went badly for you.'],
    ['Health potion', 'many RPGs', 'recup', '../img/inv_potion_54.jpg', 'Drunk after a big hit, to stay in the fight.'],
    ['Wait out Baron Nashor', 'League of Legends', 'recup', null, 'Behind after a fight; hold, don’t panic, take the next chance.'],
  ];
  demo('sortr', {
    init(sl) {
      const box = $(sl, '.so-grid'), score = $(sl, '.so-score'), saved = store.get('lp-sort', {});
      const order = [0, 4, 8, 1, 5, 9, 2, 6, 10, 3, 7, 11];
      box.innerHTML = order.map(i => { const [n, gm, , img] = CARDS[i]; return `<div class="so-card" data-i="${i}">${img ? `<img src="${img}" alt="">` : `<span class="so-ph">${gm[0]}</span>`}<div><b>${n}</b><small>${gm}</small><div class="so-btns"><button data-t="react">React</button><button data-t="prep">Prepare</button><button data-t="recup">Recuperate</button></div><p class="so-why"></p></div></div>`; }).join('');
      const paint = () => {
        let ok = 0, n = 0;
        $$(box, '.so-card').forEach(c => {
          const i = +c.dataset.i, pick = saved[i], [, , t, , why] = CARDS[i];
          c.className = 'so-card' + (pick ? ' ' + t : '');
          $$(c, 'button').forEach(b => b.classList.toggle('on', b.dataset.t === pick));
          $(c, '.so-why').innerHTML = pick ? `${pick === t ? '✓' : '✕'} <b>${TYPES[t][0]}.</b> ${why}` : '';
          if (pick) { n++; if (pick === t) ok++; }
        });
        score.innerHTML = `${ok} of ${n} sorted the way the post would · ${12 - n} left`;
      };
      $$(box, 'button').forEach(b => b.onclick = () => { saved[b.closest('.so-card').dataset.i] = b.dataset.t; store.set('lp-sort', saved); paint(); });
      $(sl, '.so-reset').onclick = () => { Object.keys(saved).forEach(k => delete saved[k]); store.set('lp-sort', saved); paint(); };
      paint();
    },
  });

  /* ---------------- 3. Swap the tool (Trinexx) ---------------- */
  const HEADS = [
    { id: 'fire', name: 'fire head', x: 380, y: 230, col: '#d8402f', weak: ['ice'] },
    { id: 'stone', name: 'stone head', x: 520, y: 175, col: '#8b8fa8', weak: ['sword', 'bomb'] },
    { id: 'ice', name: 'ice head', x: 660, y: 230, col: '#3a8fe0', weak: ['fire'] },
  ];
  const TOOLS = { sword: 'Sword', bomb: 'Bombs', fire: 'Fire Rod', ice: 'Ice Rod' };
  const LINK = [520, 490];
  // the walk-through: a player who tries the sword everywhere, hears the ting, then swaps tools
  const SCRIPT = [[1, 'sword', 'fire'], [2, 'sword', 'ice'], [3.4, 'fire', 'fire'], [4.6, 'ice', 'fire'], [5.6, 'ice', 'fire'], [6.6, 'ice', 'fire'], [8, 'fire', 'ice'], [9, 'fire', 'ice'], [10, 'fire', 'ice'], [11.6, 'sword', 'stone'], [12.4, 'bomb', 'stone'], [13.2, 'sword', 'stone']];
  function trinexx(g, events, t, tool) {
    TD.use(g); g.clearRect(0, 0, W, H);
    g.save(); rr(g, 10, 10, W - 20, H - 20, 14); g.clip(); TD.floor(10, 10, W - 20, H - 20, .25); g.restore();
    const hp = { fire: 3, stone: 3, ice: 3 }; let swaps = 0, tings = 0, hits = 0, last = null;
    events.filter(e => e[0] <= t).forEach(([, tl, h]) => { if (last && last !== tl) swaps++; last = tl; const H0 = HEADS.find(x => x.id === h); if (H0.weak.includes(tl) && hp[h] > 0) { hp[h]--; hits++; } else tings++; });
    // body and heads
    g.fillStyle = '#4a4a5e'; g.beginPath(); g.ellipse(520, 120, 210, 70, 0, 0, TAU); g.fill();
    HEADS.forEach(hd => {
      g.strokeStyle = '#4a4a5e'; g.lineWidth = 26; g.beginPath(); g.moveTo(520, 120); g.lineTo(hd.x, hd.y); g.stroke();
      TD.foe(hd.x, hd.y, 40, Math.PI / 2, hp[hd.id] > 0 ? hd.col : '#bbb', { edge: C.navy, hp: hp[hd.id], hpMax: 3 });
      TD.label(hp[hd.id] > 0 ? hd.name : 'down', hd.x, hd.y + 62, 'center', C.ink, 13);
    });
    TD.player(LINK[0], LINK[1], -Math.PI / 2, 1, 1, '#2fae63');
    TD.label(`Link · ${TOOLS[tool]}`, LINK[0], LINK[1] + 42, 'center', C.ink, 14);
    // the latest shot
    events.filter(e => e[0] <= t && t - e[0] < .9).forEach(([t0, tl, h]) => {
      const hd = HEADS.find(x => x.id === h), k = clamp((t - t0) / .35), x = lerp(LINK[0], hd.x, k), y = lerp(LINK[1], hd.y, k), col = { sword: '#ddd', bomb: '#333', fire: '#ff7a2a', ice: '#7fd0ff' }[tl];
      if (k < 1) { g.fillStyle = col; g.beginPath(); g.arc(x, y, 9, 0, TAU); g.fill(); g.strokeStyle = C.navy; g.lineWidth = 2; g.stroke(); }
      else { const ok = hd.weak.includes(tl); TD.popText(ok ? 'hit' : 'ting', hd.x + 50, hd.y - 30 - (t - t0 - .35) * 40, ok ? C.red : C.muted, 1 - (t - t0 - .35) / .55); }
    });
    g.fillStyle = C.paper; rr(g, 24, 24, 250, 110, 12); g.fill(); g.strokeStyle = C.line; g.lineWidth = 2; g.stroke();
    text(g, `${hits} hits`, 40, 58, '800 22px Montserrat, Jost, sans-serif', C.red);
    text(g, `${tings} deflected (ting)`, 40, 88, '600 16px Jost, sans-serif', C.muted);
    text(g, `${swaps} tool swaps`, 40, 116, '600 16px Jost, sans-serif', C.ink);
    text(g, 'Trinexx, The Legend of Zelda: A Link to the Past (drawn as three heads)', 1016, 560, '500 13px Jost, sans-serif', C.muted, 'right');
  }
  canvasDemo('tools', (sl, cv, g) => {
    const st = { tour: true, held: false, t: 0, tool: 'sword', ev: [], mt: 0, key: '' }, DUR = 16, tourBtn = $(sl, '.tl-tour');
    const tBtns = $$(sl, '.tl-tool .btn');
    const manual = () => { if (st.tour) { st.tour = false; st.ev = []; st.mt = 0; tourBtn.classList.remove('on'); } };
    tBtns.forEach(b => b.onclick = () => { manual(); st.tool = b.dataset.t; });
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    $(sl, '.tl-reset').onclick = () => { st.tour = true; manual(); };
    cv.addEventListener('pointerdown', e => {
      const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H;
      const hd = HEADS.find(h => Math.hypot(h.x - x, h.y - y) < 60); if (!hd) return;
      manual(); st.ev.push([st.mt, st.tool, hd.id]);
    });
    function frame() {
      let tool = st.tool, ev = st.ev, t = st.mt;
      if (st.tour) { t = st.t % DUR; ev = SCRIPT; const past = SCRIPT.filter(e => e[0] <= t + .4); tool = past.length ? past.at(-1)[1] : 'sword'; }
      trinexx(g, ev, t, tool);
      tBtns.forEach(b => b.classList.toggle('on', b.dataset.t === tool));
    }
    LP.runners.tools = { seek(t) { st.held = true; st.tour = true; st.t = t; frame(); }, dur: () => DUR };
    return dt => { if (st.held) return; dt = Math.max(0, Math.min(dt, .1)); if (st.tour) st.t = (st.t + dt) % DUR; else st.mt += dt; frame(); };
  });

  /* ---------------- 4. Kick practice ---------------- */
  const CAST = 1.6, CD = 2;
  const rnd = s => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const castStart = i => 1.2 + i * 3.1 + rnd(i) * 1.4;
  // the simulated learner: reaction time falls with practice (illustrative)
  const simRT = i => .35 + 1.5 * Math.exp(-i / 4) + (rnd(i + 50) - .5) * .25;
  function kickResults(presses, t) {
    // walk the casts in order; a press inside a cast interrupts it; a press with no cast is wasted and starts the cooldown
    const out = []; let cdUntil = -1, pi = 0;
    for (let i = 0; castStart(i) < t; i++) {
      const s = castStart(i), e = s + CAST;
      let res = null;
      while (pi < presses.length && presses[pi] < Math.min(e, t)) {
        const p = presses[pi++];
        if (p < cdUntil) continue;
        cdUntil = p + CD;
        if (p >= s) { res = ['kick', p - s]; break; } else out.push(['early', 0, i]);
      }
      if (!res) { if (t < e) break; res = ['miss', CAST]; }
      out.push([...res, i]);
    }
    return { out, cdUntil };
  }
  function kickDraw(g, t, presses, tour) {
    TD.use(g); g.clearRect(0, 0, W, H);
    g.save(); rr(g, 10, 10, 520, 565, 14); g.clip(); TD.floor(10, 10, 520, 565); g.restore(); g.strokeStyle = C.line; g.lineWidth = 2; rr(g, 10, 10, 520, 565, 14); g.stroke();
    const { out, cdUntil } = kickResults(presses, t);
    let i = 0; while (castStart(i + 1) <= t) i++;
    const s = castStart(i), casting = t >= s && t < s + CAST && !out.some(r => r[2] === i && r[0] === 'kick');
    TD.foe(270, 170, 40, Math.PI / 2, '#6a3fb0', { edge: C.navy, mark: 'staff' });
    TD.player(270, 400, -Math.PI / 2, 1, 1, '#2e3a50'); TD.label('you (a Rogue)', 270, 446, 'center', C.ink, 13);
    // cast bar
    g.fillStyle = 'rgba(21,32,68,.8)'; rr(g, 120, 240, 300, 26, 6); g.fill();
    if (casting) { g.fillStyle = '#c99bff'; rr(g, 123, 243, 294 * clamp((t - s) / CAST), 20, 5); g.fill(); text(g, 'Shadow Bolt', 270, 259, '600 14px Jost, sans-serif', '#fff', 'center'); }
    const lastK = out.filter(r => r[0] === 'kick').at(-1);
    if (lastK && t - (castStart(lastK[2]) + lastK[1]) < .9) TD.stamp('INTERRUPTED', 270, 320, C.react, 1, 22);
    const lastM = out.filter(r => r[0] === 'miss').at(-1);
    if (lastM && t - (castStart(lastM[2]) + CAST) < .9) { TD.flash(270, 400, 40, .8); TD.stamp('IT LANDED', 270, 320, C.red, 1, 22); }
    const cdLeft = cdUntil - t; icon(g, '../img/ability_kick.jpg', 60, 480, 56);
    if (cdLeft > 0) { g.fillStyle = 'rgba(21,32,68,.65)'; g.fillRect(60, 480, 56, 56 * clamp(cdLeft / CD)); }
    text(g, tour ? 'Kick (a simulated learner)' : 'Kick: press K or the button', 128, 514, '600 15px Jost, sans-serif', C.ink);
    // results
    const x0 = 545; g.fillStyle = C.paper; rr(g, x0, 10, 485, 565, 14); g.fill(); g.strokeStyle = C.line; g.lineWidth = 2; g.stroke();
    text(g, 'Each cast, in order', x0 + 20, 44, '700 18px Montserrat, Jost, sans-serif', C.ink);
    const casts = out.filter(r => r[0] !== 'early').slice(-24), cx = x0 + 50, cy = 330, ch = 240, cw = 410;
    g.strokeStyle = '#e3d8bf'; g.lineWidth = 1; g.font = '500 12px Jost, sans-serif'; g.fillStyle = C.muted; g.textAlign = 'right';
    [0, .5, 1, 1.5].forEach(v => { const y = cy - v / 1.6 * ch; g.beginPath(); g.moveTo(cx, y); g.lineTo(cx + cw, y); g.stroke(); g.fillText(`${v}s`, cx - 6, y + 4); });
    text(g, 'time from cast start to Kick', x0 + 20, 72, '500 13px Jost, sans-serif', C.muted);
    casts.forEach((r, j) => { const x = cx + 10 + j * (cw - 20) / 23, h = r[0] === 'kick' ? r[1] / 1.6 * ch : ch; g.fillStyle = r[0] === 'kick' ? C.react : 'rgba(216,64,47,.35)'; g.fillRect(x - 6, cy - h, 12, h); });
    const kicked = out.filter(r => r[0] === 'kick').length, missed = out.filter(r => r[0] === 'miss').length, early = out.filter(r => r[0] === 'early').length;
    text(g, `${kicked} interrupted`, x0 + 20, 380, '800 22px Montserrat, Jost, sans-serif', C.react);
    text(g, `${missed} landed`, x0 + 230, 380, '800 22px Montserrat, Jost, sans-serif', C.red);
    text(g, `${early} pressed with nothing to interrupt (Kick wasted)`, x0 + 20, 410, '500 15px Jost, sans-serif', C.muted);
    g.font = '600 17px Jost, sans-serif'; g.fillStyle = C.ink; g.textAlign = 'left'; wrap(g, '“Frequency leads to reinforcement, reinforcement to mastery.” The same answer, asked for again and again, gets faster.', x0 + 20, 456, 445, 24);
  }
  canvasDemo('kick', (sl, cv, g) => {
    const st = { tour: true, held: false, t: 0, mt: 0, presses: [] }, DUR = 70, tourBtn = $(sl, '.kk-tour');
    const tourPresses = []; for (let i = 0; castStart(i) < DUR; i++) { const rt = simRT(i); if (rt < CAST) tourPresses.push(castStart(i) + rt); else if (i % 3 === 0) tourPresses.push(castStart(i) - .5); }
    tourPresses.sort((a, b) => a - b);
    const press = () => { if (st.tour) { st.tour = false; st.mt = 0; st.presses = []; tourBtn.classList.remove('on'); } st.presses.push(st.mt); };
    st.press = press;
    $(sl, '.kk-btn').onclick = press;
    $(sl, '.kk-start').onclick = () => { st.tour = false; st.mt = 0; st.presses = []; tourBtn.classList.remove('on'); };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    function frame() { st.tour ? kickDraw(g, st.t, tourPresses, true) : kickDraw(g, st.mt, st.presses, false); }
    LP.runners.kick = { seek(t) { st.held = true; st.tour = true; st.t = t; frame(); }, dur: () => DUR };
    sl._press = press;
    return dt => { if (st.held) return; dt = Math.max(0, Math.min(dt, .1)); if (st.tour) st.t = (st.t + dt) % DUR; else st.mt += dt; frame(); };
  }, {
    enter(s) { s._kd = e => { if ((e.key === 'k' || e.key === 'K') && !e.repeat) { e.preventDefault(); s._press(); } }; addEventListener('keydown', s._kd); },
    leave(s) { removeEventListener('keydown', s._kd); },
  });

  /* ---------------- 5. First meeting, second meeting ---------------- */
  function meetPanel(g, x0, u, warned) {
    TD.use(g); g.save(); rr(g, x0, 10, 505, 565, 14); g.clip(); TD.floor(x0, 10, 505, 565); g.restore(); g.strokeStyle = C.line; g.lineWidth = 2; rr(g, x0, 10, 505, 565, 14); g.stroke();
    text(g, warned ? 'SECOND MEETING: IT WARNS YOU' : 'FIRST MEETING: NO WARNING', x0 + 20, 42, '700 15px Montserrat, Jost, sans-serif', warned ? C.green : C.red);
    const cx = x0 + 252, ey = lerp(150, 250, ease(clamp(u / 2))), dieAt = 4, swell = warned ? clamp((u - 2.4) / 1.4) : 0;
    const back = warned ? ease(clamp((u - 3.1) / .8)) : 0;
    const party = [[cx - 60, 330, '#e08a2c'], [cx + 60, 330, '#e08a2c'], [cx, 350, '#5562eb']].map(([x, y, c]) => [x, lerp(y, y + 140, back), c]);
    if (u < dieAt) {
      const r = 34 + swell * 14 + (warned && u > 2.4 ? Math.sin(u * 30) * 3 : 0);
      TD.foe(cx, ey, r, Math.PI / 2, warned && Math.floor(u * 8) % 2 && u > 2.4 ? '#e8c24a' : '#7d8a3a', { edge: '#3c4418' });
      if (warned && u > 2.4) TD.label('it swells and flashes', cx, ey - 60, 'center', C.goldInk, 14);
    } else {
      // it bursts into three carrion worms that dart out
      const k = clamp((u - dieAt) / .7);
      if (u - dieAt < .6) TD.flash(cx, ey, 70, 1 - (u - dieAt) / .6);
      [-1, 0, 1].forEach((d, i) => { const a = Math.PI / 2 + d * .6, wx = cx + Math.cos(a) * 130 * ease(k), wy = ey + Math.sin(a) * 130 * ease(k); g.fillStyle = '#c9b47a'; g.strokeStyle = '#5a4a20'; g.lineWidth = 2; g.beginPath(); g.ellipse(wx, wy, 14, 8, a, 0, TAU); g.fill(); g.stroke(); });
    }
    const hit = !warned && u > dieAt + .5;
    party.forEach(([x, y, c], i) => { TD.player(x, y, -Math.PI / 2, .8, 1, c); TD.hp(x, y - 28, 34, hit && i < 3 ? 45 : 100, 100); if (hit && u < dieAt + 1.6) TD.popText('-55', x + 14, y - 40, C.red, 1); });
    if (u > dieAt + 1) TD.label(warned ? 'everyone stepped back: the worms find nobody' : 'the worms catch the whole melee group', cx, 520, 'center', warned ? C.green : C.red, 15);
  }
  LP.scenes('meet', {
    scenes: [{ id: 'both', label: 'Play both', len: 7.5, draw(g, u) { meetPanel(g, 10, u, false); meetPanel(g, 525, u, true); } }],
    tour: '.mt-tour', out: '.mt-out2', say: () => 'Preparation carries “the burden of knowledge”: players must have seen something to prepare for it. A warning animation gives them that knowledge the first time, as the post’s Diablo III creature does.',
  });
})();
