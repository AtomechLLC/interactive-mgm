/* Keep only five (post-mortem: "First WoW Class Overhaul: Redefining the Warlock Class").
   "If I could keep only five things from the class for each spec, what would be left?" The learner picks five spells
   from the pre-Mists Warlock spellbook for a spec, then reveals the post's five and the minigame they make:
   Affliction juggles DoTs and Fear across targets, Destruction is "Simon Says", and Demonology's core turns out to be
   uninteractive, with a tank's fantasy. Slide 2 is the post's list of the physical games inside WoW, each as a loop.
   Both canvases are pure functions of time (plus the learner's picks), so __seek is deterministic. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD, TAU = Math.PI * 2;
  const W = 1040, H = 585;
  const BOOK = [
    ['Shadow Bolt', 'spell_shadow_shadowbolt'], ['Immolate', 'spell_fire_immolation'], ['Incinerate', 'spell_fire_burnout'], ['Corruption', 'spell_shadow_abominationexplosion'],
    ['Bane of Agony', 'spell_shadow_curseofsargeras'], ['Bane of Doom', 'spell_shadow_auraofdarkness'], ['Bane of Havoc', 'ability_warlock_baneofhavoc'], ['Unstable Affliction', 'spell_shadow_unstableaffliction_3'],
    ['Haunt', 'ability_warlock_haunt'], ['Drain Life', 'spell_shadow_lifedrain02'], ['Drain Soul', 'spell_shadow_haunting'], ['Seed of Corruption', 'spell_shadow_seedofdestruction'],
    ['Fear', 'spell_shadow_possession'], ['Howl of Terror', 'spell_shadow_deathscream'], ['Death Coil', 'spell_shadow_deathcoil'], ['Banish', 'spell_shadow_cripple'],
    ['Conflagrate', 'spell_fire_fireball'], ['Chaos Bolt', 'ability_warlock_chaosbolt'], ['Rain of Fire', 'spell_shadow_rainoffire'], ['Shadowburn', 'spell_shadow_scourgebuild'],
    ['Soul Fire', 'spell_fire_fireball02'], ['Shadowfury', 'spell_shadow_shadowfury'], ['Hellfire', 'spell_fire_incinerate'], ['Shadowflame', 'ability_warlock_shadowflame'],
    ['Life Tap', 'spell_shadow_burningspirit'], ['Summon Imp', 'spell_shadow_summonimp'], ['Summon Voidwalker', 'spell_shadow_summonvoidwalker'], ['Summon Felhunter', 'spell_shadow_summonfelhunter'],
    ['Summon Succubus', 'spell_shadow_summonsuccubus'], ['Summon Felguard', 'spell_shadow_summonfelguard'], ['Demonic Empowerment', 'ability_warlock_demonicempowerment'], ['Metamorphosis', 'spell_shadow_demonform'],
    ['Soul Link', 'spell_shadow_gathershadows'], ['Demon Soul', 'spell_warlock_demonsoul'], ['Soulburn', 'spell_fire_soulburn'], ['Fel Armor', 'spell_shadow_felarmour'],
    ['Demonic Circle', 'spell_shadow_demoniccircleteleport'], ['Curse of the Elements', 'spell_shadow_chilltouch'], ['Curse of Tongues', 'spell_shadow_curseoftounges'], ['Soulstone', 'spell_shadow_soulgem'],
  ];
  const idx = n => BOOK.findIndex(b => b[0] === n);
  const SUMMONS = ['Summon Imp', 'Summon Voidwalker', 'Summon Felhunter', 'Summon Succubus', 'Summon Felguard'].map(idx);
  // the post's five; an entry that is an array accepts any one of its spells
  const SPECS = {
    aff: { name: 'Affliction', fantasy: 'pain and suffering', game: 'juggling', five: [[idx('Corruption')], [idx('Bane of Agony')], [idx('Unstable Affliction')], [idx('Fear')], [idx('Drain Life'), idx('Drain Soul')]], labels: ['Corruption', 'Agony', 'Unstable Affliction', 'Fear', 'Drain Life / Soul'] },
    des: { name: 'Destruction', fantasy: 'raw, unrestrained force', game: 'Simon Says', five: [[idx('Immolate')], [idx('Incinerate')], [idx('Conflagrate')], [idx('Rain of Fire')], [idx('Chaos Bolt')]], labels: ['Immolate', 'Incinerate', 'Conflagrate', 'Rain of Fire', 'Chaos Bolt'] },
    demo: { name: 'Demonology', fantasy: 'power and pets', game: 'nothing to play', five: [SUMMONS, [idx('Demonic Empowerment')], [idx('Metamorphosis')], null, null], labels: ['Summon Demon', 'Empower demon', 'Metamorphosis', '…', '… oh'] },
  };
  const img = {}; BOOK.forEach(([, n]) => { const i = new Image(); i.src = `../img/${n}.jpg`; img[n] = i; });
  const icon = (g, n, x, y, s, a = 1) => { const i = img[n]; if (i && i.complete && i.naturalWidth) { g.globalAlpha = a; g.drawImage(i, x, y, s, s); g.globalAlpha = 1; } };
  const GX = 24, GY = 74, GS = 50, GP = 60, COLS = 8;
  const cell = i => ({ x: GX + (i % COLS) * GP, y: GY + Math.floor(i / COLS) * GP });
  const matches = (spec, picks) => SPECS[spec].five.map(e => e ? e.some(i => picks.has(i)) : false);

  /* the three minigames, each a loop drawn in a box */
  function gameAff(g, x0, y0, w, h, t) {
    const wl = { x: x0 + 60, y: y0 + h / 2 };
    T.player(wl.x, wl.y, 0, .8, 1, '#8a4fd6');
    const icons = ['spell_shadow_abominationexplosion', 'spell_shadow_curseofsargeras', 'spell_shadow_unstableaffliction_3'];
    for (let k = 0; k < 3; k++) {
      // each target is dotted, then feared away, then walks back: the warlock keeps three in the air
      const ph = ((t / 6 + k / 3) % 1), out = ph < .5 ? ease(ph * 2) : 1 - ease((ph - .5) * 2);
      const ang = -.7 + k * .7, r = 150 + out * 120, fx = wl.x + Math.cos(ang) * r, fy = wl.y + Math.sin(ang) * r * .7;
      T.foe(fx, fy, 16, Math.PI + (ph < .5 ? Math.PI : 0), '#c9a27a', { edge: '#7a5a3a' });
      icons.forEach((n, j) => { icon(g, n, fx - 27 + j * 19, fy - 40, 17); const left = 1 - ((t * .17 + k * .3 + j * .21) % 1); g.fillStyle = C.gold; g.fillRect(fx - 27 + j * 19, fy - 21, 17 * left, 3); });
      if (ph < .08) { icon(g, 'spell_shadow_possession', fx + 18, fy - 8, 18); T.label('Fear', fx + 30, fy + 22, 'center', C.ink, 11); }
      // the juggling arc from warlock to target
      g.strokeStyle = 'rgba(138,79,214,.35)'; g.setLineDash([4, 6]); g.lineWidth = 2; g.beginPath(); g.moveTo(wl.x, wl.y); g.quadraticCurveTo((wl.x + fx) / 2, Math.min(wl.y, fy) - 60, fx, fy); g.stroke(); g.setLineDash([]);
    }
    icon(g, 'spell_shadow_lifedrain02', wl.x - 12, wl.y + 26, 24);
  }
  function gameDes(g, x0, y0, w, h, t) {
    const names = ['spell_fire_immolation', 'spell_fire_burnout', 'spell_fire_fireball', 'ability_warlock_chaosbolt', 'spell_shadow_rainoffire'];
    const seq = [0, 1, 1, 2, 1, 3, 1, 4, 2, 1], beat = .7, k = Math.floor(t / beat) % seq.length, f = (t % beat) / beat;
    names.forEach((n, i) => {
      const x = x0 + 40 + i * 86, y = y0 + h / 2 - 10, lit = seq[k] === i;
      if (lit) { g.fillStyle = `rgba(255,185,81,${.9 - f * .6})`; g.beginPath(); g.roundRect(x - 8, y - 8, 72, 72, 10); g.fill(); }
      icon(g, n, x, y, 56, lit ? 1 : .35);
      if (lit && f < .6) T.label('now!', x + 28, y - 22, 'center', C.red, 13);
    });
    g.font = '600 13px Jost, sans-serif'; g.fillStyle = C.muted; g.textAlign = 'center';
    g.fillText('"The game is telling you to push this button now."', x0 + w / 2, y0 + h - 24);
  }
  function gameDemo(g, x0, y0, w, h, t) {
    const cx = x0 + 80, cy = y0 + h / 2 + 10;
    T.player(cx, cy, 0, .8, 1, '#8a4fd6');
    T.foe(cx + 60, cy - 10, 20, 0, '#5b8a3a', { edge: '#2f5a1c', mark: 'horns' });
    T.foe(x0 + 220, cy + 60, 26, Math.PI, '#c9a27a', { edge: '#7a5a3a' });
    const idle = (t % 12);
    g.font = '600 13px Jost, sans-serif'; g.fillStyle = C.muted; g.textAlign = 'center';
    g.fillText(`set it and forget it: ${idle.toFixed(1)} s with nothing to decide`, cx + 100, y0 + 30);
    ['Being tough', 'Being unstoppable', 'Sacrificing your minions to save you'].forEach((s, i) => {
      const a = clamp((idle - 3 - i * 1.5) / .6);
      if (a > 0) { g.globalAlpha = a; T.label(s, x0 + w - 120, y0 + 70 + i * 36, 'center', C.ink, 13); g.globalAlpha = 1; }
    });
    if (idle > 8) T.label('… a tank’s fantasy', x0 + w - 120, y0 + 190, 'center', C.red, 14);
  }
  const GAMES = { aff: gameAff, des: gameDes, demo: gameDemo };

  function draw(g, st, t) {
    T.use(g); g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,252,244,.85)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill();
    const sp = SPECS[st.spec], picks = st.picks[st.spec], rev = st.revealed[st.spec], post = matches(st.spec, picks);
    g.textBaseline = 'alphabetic'; g.textAlign = 'left';
    g.font = '800 16px Montserrat, Jost, sans-serif'; g.fillStyle = C.ink; g.fillText(`Spellbook before Mists · ${sp.name}`, GX, 40);
    g.font = '600 13px Jost, sans-serif'; g.fillStyle = C.muted; g.fillText(`Fantasy: ${sp.fantasy}. Keep only five.`, GX, 60);
    BOOK.forEach(([name, n], i) => {
      const { x, y } = cell(i), on = picks.has(i), inPost = rev && sp.five.some(e => e && e.includes(i));
      if (on) { g.fillStyle = C.player; g.beginPath(); g.roundRect(x - 4, y - 4, GS + 8, GS + 8, 8); g.fill(); }
      if (inPost) { g.strokeStyle = C.gold; g.lineWidth = 4; g.beginPath(); g.roundRect(x - 6, y - 6, GS + 12, GS + 12, 9); g.stroke(); }
      icon(g, n, x, y, GS, picks.size >= 5 && !on ? .35 : 1);
      if (st.hover === i) { g.strokeStyle = C.navy; g.lineWidth = 2; g.strokeRect(x - 1, y - 1, GS + 2, GS + 2); }
    });
    if (st.hover >= 0) T.label(BOOK[st.hover][0], GX + 240, GY + 5 * GP + 6, 'center', C.ink, 14);
    // slots
    const sx = 530;
    g.font = '700 14px Jost, sans-serif'; g.fillStyle = C.ink; g.fillText('Your five', sx, 40);
    [...picks].forEach((i, k) => { icon(g, BOOK[i][1], sx + k * 58, 50, 46); if (rev) { const hit = sp.five.some(e => e && e.includes(i)); g.font = '800 16px Jost, sans-serif'; g.fillStyle = hit ? C.good : C.muted; g.textAlign = 'center'; g.fillText(hit ? '✓' : '–', sx + k * 58 + 23, 114); g.textAlign = 'left'; } });
    for (let k = picks.size; k < 5; k++) { g.strokeStyle = '#cdbf9f'; g.setLineDash([4, 4]); g.lineWidth = 2; g.strokeRect(sx + k * 58, 50, 46, 46); g.setLineDash([]); }
    g.font = '700 14px Jost, sans-serif'; g.fillStyle = C.ink; g.fillText('The post’s five', sx, 146);
    sp.five.forEach((e, k) => {
      const x = sx + k * 98;
      if (!rev) { g.fillStyle = '#e6dcc5'; g.fillRect(x, 156, 46, 46); g.font = '800 18px Jost, sans-serif'; g.fillStyle = C.muted; g.textAlign = 'center'; g.fillText('?', x + 23, 186); g.textAlign = 'left'; return; }
      if (e) icon(g, BOOK[e[0]][1], x, 156, 46);
      else { g.strokeStyle = '#cdbf9f'; g.setLineDash([4, 4]); g.lineWidth = 2; g.strokeRect(x, 156, 46, 46); g.setLineDash([]); }
      g.font = '500 11px Jost, sans-serif'; g.fillStyle = C.ink; g.textAlign = 'left'; g.fillText(sp.labels[k], x, 216);
    });
    // minigame box
    const bx = 520, by = 236, bw = 500, bh = 330;
    g.fillStyle = '#efe6d2'; g.beginPath(); g.roundRect(bx, by, bw, bh, 12); g.fill();
    g.font = '800 15px Montserrat, Jost, sans-serif'; g.fillStyle = C.ink;
    if (rev) {
      g.fillText(`The minigame: ${sp.game}`, bx + 16, by + 26);
      g.save(); g.beginPath(); g.roundRect(bx, by + 34, bw, bh - 34, 12); g.clip(); GAMES[st.spec](g, bx, by + 34, bw, bh - 34, t); g.restore();
    } else {
      g.fillText('Pick five, then reveal the post’s', bx + 16, by + 26);
      g.font = '500 14px Jost, sans-serif'; g.fillStyle = C.muted; g.textAlign = 'center';
      g.fillText(`${picks.size} of 5 picked`, bx + bw / 2, by + bh / 2);
    }
    const got = post.filter(Boolean).length;
    g.textAlign = 'left'; g.font = '600 13px Jost, sans-serif'; g.fillStyle = C.muted;
    if (rev) g.fillText(`You matched ${got} of the post’s ${sp.five.filter(Boolean).length}.`, GX, H - 18);
  }

  // walk-through: each spec in turn, the post's five picked one at a time, then the minigame
  const SPEC_KEYS = ['aff', 'des', 'demo'], LEN = 12, DUR = LEN * 3;
  function tourState(st, t) {
    const k = Math.floor(t / LEN) % 3, f = t % LEN, spec = SPEC_KEYS[k];
    st.spec = spec;
    SPEC_KEYS.forEach(s => { st.picks[s] = new Set(); st.revealed[s] = false; });
    SPECS[spec].five.forEach((e, j) => { if (e && f > .6 + j * .55) st.picks[spec].add(e[0]); });
    st.revealed[spec] = f > 3.6;
    return f;
  }

  const scenes = {};
  canvasDemo('keep', (s, cv, g) => {
    const st = { spec: 'aff', picks: { aff: new Set(), des: new Set(), demo: new Set() }, revealed: { aff: false, des: false, demo: false }, hover: -1, tour: true, held: false, t: 0, key: '' };
    const segs = $$(s, '.kf-spec .btn'), tourBtn = $(s, '.kf-tour'), revBtn = $(s, '.kf-reveal'), clrBtn = $(s, '.kf-clear');
    const manual = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); SPEC_KEYS.forEach(k => { st.picks[k] = new Set(); st.revealed[k] = false; }); } };
    const setSpec = k => { st.spec = k; segs.forEach(b => b.classList.toggle('on', b.dataset.s === k)); };
    segs.forEach(b => b.onclick = () => { manual(); setSpec(b.dataset.s); });
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    revBtn.onclick = () => { manual(); st.revealed[st.spec] = true; };
    clrBtn.onclick = () => { manual(); st.picks[st.spec] = new Set(); st.revealed[st.spec] = false; };
    const at = e => { const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * W / r.width, y = (e.clientY - r.top) * H / r.height; return BOOK.findIndex((b, i) => { const c = cell(i); return x >= c.x && x < c.x + GS && y >= c.y && y < c.y + GS; }); };
    cv.addEventListener('mousemove', e => { st.hover = at(e); cv.style.cursor = st.hover >= 0 ? 'pointer' : ''; });
    cv.addEventListener('mouseleave', () => { st.hover = -1; });
    cv.addEventListener('click', e => {
      const i = at(e); if (i < 0) return; manual();
      const p = st.picks[st.spec]; if (p.has(i)) p.delete(i); else if (p.size < 5) p.add(i);
    });
    function info() {
      const sp = SPECS[st.spec], rev = st.revealed[st.spec], key = [st.spec, rev, st.picks[st.spec].size].join();
      if (key === st.key) return; st.key = key; setSpec(st.spec);
      say($(s, '.kf-stats'), `<div><b>${st.picks[st.spec].size}/5</b><span>picked for ${sp.name}</span></div>`);
      say($(s, '.kf-out'), !rev ? `Click five spells that hold the essence of ${sp.name} (${sp.fantasy}). Everything else goes.`
        : { aff: 'Affliction keeps five and becomes a juggler: DoTs running on several targets while Fear pushes each one away. Skill is timing, target limits and pressure.',
            des: 'Destruction’s five all tell the same story: the game says push this button now. Blowing things up had turned into Simon Says, so it needed a new minigame.',
            demo: 'Cut the noise from Demonology and almost nothing is left to play: set it and forget it. Its fantasy (tough, unstoppable, sacrificing minions) is a tank’s.' }[st.spec]);
    }
    scenes.keep = { seek(t) { st.held = true; const f = tourState(st, t); draw(g, st, f); info(); }, dur: () => DUR };
    return dt => {
      if (st.held) return;
      st.t += Math.max(0, dt);
      let f = st.t;
      if (st.tour) { if (st.t >= DUR) st.t = 0; f = tourState(st, st.t); }
      draw(g, st, f); info();
    };
  });

  /* Slide 2: the games inside WoW */
  const WALL = [
    ['DoTs and Fear', 'juggling'], ['Crowd control', 'multi-tasking'], ['Procs', 'Simon Says'], ['Death Knight runes', 'Guitar Hero'],
    ['Rogue combo points', 'piano sequences'], ['Warrior rage', 'drums'], ['Fire mage', 'slot machine'],
  ];
  function tile(g, k, x, y, w, h, t) {
    const cx = x + w / 2, cy = y + 34 + (h - 34) / 2;
    if (k === 0) { for (let i = 0; i < 3; i++) { const p = (t * .7 + i / 3) % 1, q = p < .7 ? p / .7 : (p - .7) / .3, bx = p < .7 ? lerp(cx - 55, cx + 55, q) : lerp(cx + 55, cx - 55, q), byy = p < .7 ? cy + 40 - 4 * q * (1 - q) * 100 : cy + 40 - 4 * q * (1 - q) * 12; g.fillStyle = ['#8a4fd6', '#e5322d', '#2fae63'][i]; g.beginPath(); g.arc(bx, byy, 10, 0, TAU); g.fill(); } g.fillStyle = C.muted; [-1, 1].forEach(sg => { g.beginPath(); g.ellipse(cx + sg * 55, cy + 54, 16, 6, 0, 0, TAU); g.fill(); }); }
    if (k === 1) for (let i = 0; i < 3; i++) { const wob = Math.sin(t * 3 + i * 2) * (.15 + ((t + i * 1.3) % 4) / 10); const px = cx - 70 + i * 70; g.strokeStyle = C.ink; g.lineWidth = 3; g.beginPath(); g.moveTo(px, cy + 45); g.lineTo(px, cy - 5); g.stroke(); g.save(); g.translate(px, cy - 8); g.rotate(wob); g.fillStyle = '#f2ead6'; g.strokeStyle = C.muted; g.lineWidth = 2; g.beginPath(); g.ellipse(0, 0, 26, 7, 0, 0, TAU); g.fill(); g.stroke(); g.restore(); }
    if (k === 2) { const lit = Math.floor(t * 1.6) % 4; ['#e5322d', '#2fae63', '#2ea3dc', '#ffb951'].forEach((c, i) => { g.fillStyle = c; g.globalAlpha = i === lit ? 1 : .25; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, 52, i * Math.PI / 2, (i + 1) * Math.PI / 2); g.closePath(); g.fill(); }); g.globalAlpha = 1; g.fillStyle = '#fffaf0'; g.beginPath(); g.arc(cx, cy, 16, 0, TAU); g.fill(); }
    if (k === 3) { for (let l = 0; l < 3; l++) { const lx = cx - 50 + l * 50; g.strokeStyle = 'rgba(38,44,106,.25)'; g.lineWidth = 2; g.beginPath(); g.moveTo(lx, cy - 55); g.lineTo(lx, cy + 55); g.stroke(); for (let n = 0; n < 3; n++) { const p = (t * .6 + n / 3 + l * .17) % 1, ny = cy - 55 + p * 110; g.fillStyle = ['#e5322d', '#2fae63', '#2ea3dc'][l]; g.beginPath(); g.arc(lx, ny, 9, 0, TAU); g.fill(); } } g.strokeStyle = C.ink; g.lineWidth = 3; g.beginPath(); g.moveTo(cx - 75, cy + 40); g.lineTo(cx + 75, cy + 40); g.stroke(); }
    if (k === 4) { const n = Math.floor(t * 2) % 7; for (let i = 0; i < 5; i++) { g.fillStyle = i < n ? C.red : '#e6dcc5'; g.beginPath(); g.arc(cx - 60 + i * 30, cy - 30, 9, 0, TAU); g.fill(); } for (let i = 0; i < 7; i++) { const down = n >= 5 && i === 3; g.fillStyle = down ? C.gold : '#fffaf0'; g.strokeStyle = C.ink; g.lineWidth = 1.5; g.fillRect(cx - 84 + i * 24, cy - 5 + (down ? 3 : 0), 22, 52); g.strokeRect(cx - 84 + i * 24, cy - 5 + (down ? 3 : 0), 22, 52); } }
    if (k === 5) { const ph = t % 4, roll = ph > 3, hit = roll ? (t * 8) % 1 < .5 : (t * 2) % 1 < .25; g.fillStyle = hit ? C.gold : '#d9cba8'; g.beginPath(); g.ellipse(cx, cy + 10, 52, 18, 0, 0, TAU); g.fill(); g.strokeStyle = C.ink; g.lineWidth = 2; g.stroke(); g.fillStyle = '#e6dcc5'; g.fillRect(cx - 60, cy - 50, 120, 10); g.fillStyle = C.red; g.fillRect(cx - 60, cy - 50, 120 * (roll ? 1 - (ph - 3) : ph / 3), 10); if (roll) T.label('rage dump', cx, cy - 28, 'center', C.red, 12); }
    if (k === 6) { const ph = t % 3; for (let i = 0; i < 3; i++) { const stop = ph > .8 + i * .5, sym = stop ? ['★', '7', '★'][i] : '★✙7♢'[Math.floor(t * 14 + i * 3) % 4]; g.fillStyle = '#fffaf0'; g.strokeStyle = C.ink; g.lineWidth = 2; g.fillRect(cx - 75 + i * 52, cy - 30, 46, 60); g.strokeRect(cx - 75 + i * 52, cy - 30, 46, 60); g.font = '800 26px Montserrat, Jost, sans-serif'; g.fillStyle = stop ? C.red : C.muted; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(sym, cx - 52 + i * 52, cy); } if (ph > 2) T.label('Ignite rolls!', cx, cy + 46, 'center', C.red, 12); }
  }
  function drawWall(g, t) {
    T.use(g); g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,252,244,.85)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill();
    const tw = 248, th = 270;
    WALL.forEach(([sys, game], k) => {
      const x = 12 + (k % 4) * (tw + 10), y = 12 + Math.floor(k / 4) * (th + 20);
      g.fillStyle = '#efe6d2'; g.beginPath(); g.roundRect(x, y, tw, th, 12); g.fill();
      g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.font = '800 15px Montserrat, Jost, sans-serif'; g.fillStyle = C.ink; g.fillText(game, x + 14, y + 24);
      g.font = '600 13px Jost, sans-serif'; g.fillStyle = C.muted; g.fillText(sys, x + 14, y + 42);
      g.save(); g.beginPath(); g.roundRect(x, y + 48, tw, th - 48, 12); g.clip(); tile(g, k, x, y + 30, tw, th - 30, t); g.restore();
    });
    const x = 12 + 3 * (tw + 10), y = 12 + th + 20;
    g.textAlign = 'left'; g.font = '600 13px Jost, sans-serif'; g.fillStyle = C.ink;
    ['The Death Knight’s first rune system', 'gave no wiggle room: hit the pattern', 'exactly or lose output. A small', 'over-charge window made it flexible.', '', 'The rework’s aim: a physical feel', 'for the core rotation, not just a', 'bunch of spell buttons.'].forEach((l, i) => g.fillText(l, x + 8, y + 30 + i * 22));
  }
  canvasDemo('wall', (s, cv, g) => {
    const st = { t: 0, held: false };
    scenes.wall = { seek(t) { st.held = true; drawWall(g, t); }, dur: () => 12 };
    return dt => { if (st.held) return; st.t += Math.max(0, dt); drawWall(g, st.t); };
  });

  window.__seek = (t, which = 'keep') => scenes[which].seek(t);
  window.__dur = (which = 'keep') => scenes[which].dur();
})();
