/* Lesson 2: Care ("Learning From My Past", xelnath.com, 2012). Three slides:
   1. Why chase a mushroom? Super Mario Bros. (1985): the Super Mushroom looks like a Goomba, yet players learn to chase it
      because it saves a life. Then the later red-and-white look, and the Star's three changes over about ten seconds.
      Sprites: Super Mario Bros. (Nintendo), from blog-posts/img/smb (sources there). The later mushroom and the Star are
      drawn here as pixel maps in that style.
   2. Tuning bench: the post's six steps on Fireball (100 damage, instant, 10 s cooldown) against Corruption (15 damage a
      second, one per target). Damage is counted until the target dies. How many of 20 players pick each spell is a toy
      model (a logistic on the damage ratio), so the crowd is illustrative; the damage numbers are the post's.
   3. Fire that heals: a dragon whose fire heals the players ("Emotional Resonance"). Raiders route around red fire, step
      into green fire, and stand in red fire only when it covers the floor. Movement and health are illustrative. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const { C, TAU, clamp, lerp, ease, IM, rr, wrap, text, sprite, pixels, icon } = LP;
  const W = 1040, H = 585;
  const SMB = n => `../img/smb/${n}.png`;
  ['smb-mario', 'smb-mario-walk1', 'smb-mario-walk2', 'smb-mario-walk3', 'smb-mario-big', 'smb-mario-big-walk1', 'smb-mario-big-walk2', 'smb-mario-big-walk3', 'smb-mario-dead', 'smb-ground', 'smb-block', 'smb-goomba', 'smb-goomba-flat', 'smb-mushroom'].forEach(n => IM(SMB(n)));

  /* ---------------- 1. Why chase a mushroom? ---------------- */
  const S4 = 4, GROUND = 457, SKY = '#5c94fc';
  const MUSH2 = ['....rrrrrr....', '..rrwwrrwwrr..', '.rrwwwwrrwwwr.', 'rrrwwwwrrrwwrr', 'rwwrrrrrrrrrrr', 'wwwrrwwwwrrrww', 'wwrrwwwwwwrrww', 'rrrrwwwwwwrrrr', '.rrrrrrrrrrrr.', '...ffkffkff...', '...ffkffkff...', '...ffffffff...', '....ffffff....'];
  const STAR = ['......yy......', '.....yyyy.....', '.....yyyy.....', 'yyyyyyyyyyyyyy', '.yyyyyyyyyyyy.', '..yyykyykyyy..', '...yykyykyy...', '...yyyyyyyy...', '..yyyyyyyyyy..', '..yyyy..yyyy..', '.yyy......yyy.', '.yy........yy.'];
  function mushroom(g, x, ver, s = 64) {
    if (ver === 'later') { g.save(); pixels(g, MUSH2, { r: '#d8261e', w: '#fff', f: '#f6d6a4', k: '#1b1b1b' }, x, GROUND - s + 4, s / 14); g.restore(); }
    else sprite(g, SMB('smb-mushroom'), x - 4, GROUND - s - 2, s + 8, s + 8);
  }
  function star(g, x, y, s = 60, t = 0) { pixels(g, STAR, { y: Math.floor(t * 8) % 2 ? '#ffd23f' : '#f8b800', k: '#1b1b1b' }, x, y, s / 14); }
  function scenery(g) {
    g.fillStyle = SKY; g.fillRect(0, 0, W, H);
    for (let x = 0; x < W; x += 64) { sprite(g, SMB('smb-ground'), x, GROUND, 64, 64); sprite(g, SMB('smb-ground'), x, GROUND + 64, 64, 64); }
    sprite(g, SMB('smb-block'), 600, 200, 64, 64);
  }
  function mario(g, x, u, big, o = {}) {
    const walk = o.walk !== false, f = walk ? ['', '-walk1', '-walk2', '-walk3'][1 + Math.floor(u * 10) % 3] : '';
    if (big) sprite(g, SMB('smb-mario-big' + f), x, GROUND - 128, 64, 128, o);
    else sprite(g, SMB(f ? 'smb-mario' + f : 'smb-mario'), x, GROUND - 64, f ? 64 : 48, 64, o);
  }
  const goomba = (g, x, u, o = {}) => sprite(g, SMB('smb-goomba'), x, GROUND - 64, 64, 64, { flip: Math.floor(u * 4) % 2 === 1, ...o });
  const tag = (g, t, x, y, col = C.ink) => { g.font = '600 18px Jost, sans-serif'; const w = g.measureText(t).width; g.fillStyle = 'rgba(255,252,244,.94)'; rr(g, x - w / 2 - 10, y - 20, w + 20, 32, 16); g.fill(); text(g, t, x, y + 2, '600 18px Jost, sans-serif', col, 'center'); };
  const title = (g, t) => { g.font = '800 24px Montserrat, Jost, sans-serif'; const w = g.measureText(t).width; g.fillStyle = 'rgba(21,32,68,.85)'; rr(g, 20, 20, w + 36, 46, 12); g.fill(); text(g, t, 38, 52, '800 24px Montserrat, Jost, sans-serif', '#fff'); };

  const MUSHROOM = [
    { id: 'look', label: 'Which one helps?', len: 7, draw(g, u, st) {
      scenery(g); title(g, 'One of these helps you. Which?');
      mario(g, 160, 0, false, { walk: false });
      mushroom(g, 560 - 22 * u, st.ver); goomba(g, 780 - 22 * u, u);
      if (u > 2.5) { tag(g, 'brown, round, sliding toward you', 590 - 22 * u, GROUND - 100); tag(g, 'brown, round, walking toward you', 812 - 22 * u, GROUND - 150); }
    } },
    { id: 'saves', label: 'It saves a life', len: 7, draw(g, u, st) {
      scenery(g); title(g, 'Touch the mushroom, then the Goomba');
      const mx = 160 + 110 * u, hitM = 2.35, hitG = 4.25;
      const big = u > hitM && (u > hitM + .6 || Math.floor(u * 12) % 2 === 0) && !(u > hitG && (u > hitG + .7 || Math.floor(u * 12) % 2 === 0));
      if (u < hitM) mushroom(g, 560 - 40 * u, st.ver);
      mario(g, mx, u, big, { a: u > hitG + .7 ? (Math.floor(u * 14) % 2 ? .35 : 1) : 1 });
      goomba(g, 900 - 50 * u, u);
      if (u > hitM && u < hitM + 1.8) tag(g, 'Mario grows: one more hit to spare', mx + 30, GROUND - 170, C.green);
      if (u > hitG) tag(g, 'hit: Mario shrinks, but the life is kept', mx + 30, GROUND - 110, C.green);
    } },
    { id: 'without', label: 'Without it', len: 7, draw(g, u) {
      scenery(g); title(g, 'Small Mario meets the Goomba');
      const hit = 4.32, mx = 160 + 110 * Math.min(u, hit);
      goomba(g, 900 - 50 * u, u);
      if (u < hit) mario(g, mx, u, false);
      else { const k = u - hit, y = GROUND - 64 - 160 * Math.sin(Math.min(k, 1.2) / 1.2 * Math.PI / 2) + Math.max(0, k - 1.2) * 600; sprite(g, SMB('smb-mario-dead'), mx, y, 60, 56); tag(g, 'one hit, and the life is gone', mx + 30, 140, C.red); }
    } },
    { id: 'later', label: 'Later games', len: 7, draw(g, u) {
      scenery(g); title(g, 'Later games changed the look');
      const k = ease(clamp(u / 1.2));
      sprite(g, SMB('smb-mushroom'), 160, GROUND - 130, 128, 128, { a: k });
      sprite(g, SMB('smb-goomba'), 420, GROUND - 128, 128, 128, { a: k });
      if (u > 1.4) pixels(g, MUSH2, { r: '#d8261e', w: '#fff', f: '#f6d6a4', k: '#1b1b1b' }, 720, GROUND - 124, 128 / 14);
      tag(g, '1985 mushroom', 224, GROUND - 160); tag(g, 'Goomba', 484, GROUND - 160);
      if (u > 1.4) tag(g, 'red and white, with a face', 784, GROUND - 160, C.green);
      if (u > 3) tag(g, 'nothing else on screen looks like it', 784, 120, C.green);
    } },
    { id: 'star', label: 'The Star', len: 10, draw(g, u) {
      scenery(g); title(g, 'The Star: count what changes');
      const hit = 2.74, mx = 160 + 90 * Math.min(u, 6.2);
      if (u < hit) { const sx = 760 - 120 * u, sy = GROUND - 64 - Math.abs(Math.sin(u * 3.2)) * 150; star(g, sx, sy, 60, u); }
      const on = u > hit, cols = ['#ff4040', '#40d040', '#ffffff', '#3060ff'];
      mario(g, mx, u, false, on ? { tint: cols[Math.floor(u * 10) % 4], tintA: .6 } : {});
      const gx = 1040 - 110 * Math.max(0, u - 2.5), gHit = 5.1;
      if (u < gHit) goomba(g, gx, u);
      else { const k = u - gHit; sprite(g, SMB('smb-goomba'), 1040 - 110 * (gHit - 2.5) + 60 * k, GROUND - 64 - 140 * Math.sin(Math.min(k, .5) / .5 * Math.PI / 2) + Math.max(0, k - .5) * 700, 64, 64, { flipV: true }); }
      if (on) for (let i = 0; i < 4; i++) { const k = ((u - hit) * .8 + i * .25) % 1; text(g, '♪', mx + 20 + i * 18, GROUND - 80 - k * 140, '700 30px Jost, sans-serif', `rgba(255,255,255,${1 - k})`); }
      const items = [[3.0, '1 · Mario flashes colours'], [3.7, '2 · the music speeds up'], [gHit, '3 · enemies fall when they touch him']];
      items.forEach(([t0, s], i) => { if (u > t0) { g.font = '600 19px Jost, sans-serif'; const w = g.measureText(s).width; g.fillStyle = 'rgba(255,252,244,.94)'; rr(g, 640, 86 + i * 44, w + 24, 34, 10); g.fill(); text(g, s, 652, 109 + i * 44, '600 19px Jost, sans-serif', C.ink); } });
      if (on) { const left = clamp(1 - (u - hit) / 7.2); g.fillStyle = 'rgba(21,32,68,.7)'; rr(g, 20, 84, 300, 30, 8); g.fill(); g.fillStyle = '#ffd23f'; rr(g, 24, 88, 292 * left, 22, 6); g.fill(); text(g, 'about 10 seconds', 170, 105, '600 15px Jost, sans-serif', C.navy, 'center'); }
    } },
  ];
  const MUSH_SAY = {
    look: 'A brown, round thing slides toward Mario. Many first-time players dodged it, because it looks like the Goomba behind it. That is a clarity problem.',
    saves: 'Touch it and Mario grows. The next hit only shrinks him. Players learned to care about the mushroom because it saved a life, and started chasing it.',
    without: 'Without it, small Mario dies to one Goomba. Years of losing lives taught players to care: care carried a clarity gap.',
    later: 'Later Mario games made the mushroom red and white and gave it a face. The care was already there; the iteration fixed clarity.',
    star: 'The Star bounces, flashes and runs away, so you have to chase it. Grab it and you get about 10 seconds. The post asks how many major changes Mario shows: at least 3.',
  };
  LP.scenes('mush', {
    scenes: MUSHROOM, menu: '.mu-menu', tour: '.mu-tour', out: '.mu-out',
    say: s => MUSH_SAY[s.id],
    setup(sl, st) {
      st.ver = '1985';
      $$(sl, '.mu-ver .btn').forEach(b => b.onclick = () => { st.ver = b.dataset.v; $$(sl, '.mu-ver .btn').forEach(x => x.classList.toggle('on', x === b)); });
      $$(sl, '.mu-quiz .btn').forEach(b => b.onclick = () => {
        st.go(0);
        say($(sl, '.mu-ans'), b.dataset.a === 'touch' ? '<b class="accent">Touch it.</b> The mushroom on the left makes Mario grow. If you hesitated, so did many players in 1985.' : '<b class="accent">It helps, so touch it.</b> You read it as a Goomba, as many players did in 1985.');
      });
    },
  });

  /* ---------------- 2. Tuning bench ---------------- */
  const STEPS = [
    { n: 'Observe the status quo', pF: 1, life: 10, txt: 'Fireball does 100 now. Corruption does 15 a second, so 150 over ten seconds: “pure math” says 50% more. Most players pick Corruption.' },
    { n: 'Maximise the power', pF: 5, life: 10, txt: 'Five times the damage, and every player casts Fireball and nothing else. “Any mechanic, no matter how lame, is considered fun when sufficiently overpowered.” (Wyatt Cheng)' },
    { n: 'Minimise the power', pF: .2, life: 10, txt: 'A fifth of the damage, and nobody presses it. Both extremes changed what players do, so the number matters.' },
    { n: 'If 2 or 3 change nothing, stop', pF: .2, life: 10, txt: 'If neither extreme changes behaviour, stop here: the problem is not the number. Here both did, so carry on.' },
    { n: 'Balance power with clarity and usability', pF: 1.5, life: 10, txt: 'Find the value where both spells get used at the fight length that matters. The other lever is time: if targets die in 4 seconds, Fireball matches Corruption at only 0.6×.' },
    { n: 'Beware the theme', pF: 1.5, life: 10, txt: 'A Fireball at five times its damage stops reading as a Fireball. “Choose a tiny spark of light and not a nuclear holocaust.”' },
  ];
  const dmgF = (pF, L) => 100 * pF * Math.ceil(Math.max(L, .001) / 10);   // cast at 0, 10, 20 s: each lands instantly
  const dmgC = L => 15 * L;                                                 // one per target, refreshed: 15 a second
  const shareF = (pF, L) => 1 / (1 + Math.exp(-4 * Math.log(dmgF(pF, L) / dmgC(L))));
  canvasDemo('tune', (sl, cv, g) => {
    const st = { tour: true, held: false, t: 0, step: 0, pF: 1, life: 10, key: '' };
    const stepBox = $(sl, '.tn-steps'), rF = $(sl, '.tn-pf'), rL = $(sl, '.tn-life'), tourBtn = $(sl, '.tn-tour');
    stepBox.innerHTML = STEPS.map((s, i) => `<button class="btn" data-i="${i}">${i + 1}</button>`).join('');
    const sBtns = $$(stepBox, '.btn');
    const manual = () => { st.tour = false; tourBtn.classList.remove('on'); };
    const setStep = i => { st.step = i; st.pF = STEPS[i].pF; st.life = STEPS[i].life; };
    sBtns.forEach((b, i) => b.onclick = () => { manual(); setStep(i); });
    rF.oninput = () => { manual(); st.pF = +rF.value; };
    rL.oninput = () => { manual(); st.life = +rL.value; };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    const STEP_LEN = 6, DUR = STEPS.length * STEP_LEN + 8;
    function tourState(t) {
      t = ((t % DUR) + DUR) % DUR;
      if (t < STEPS.length * STEP_LEN) { const i = Math.floor(t / STEP_LEN); return { step: i, pF: STEPS[i].pF, life: 10 }; }
      const k = (t - STEPS.length * STEP_LEN) / 8;   // the time lever: sweep the target's life from 30 s down to 2 s
      return { step: 4, pF: 1.5, life: Math.round(lerp(30, 2, ease(k)) * 2) / 2 };
    }
    function draw() {
      g.clearRect(0, 0, W, H);
      const { pF, life } = st, s = STEPS[st.step], sh = shareF(pF, life), F = dmgF(pF, life), Cd = dmgC(life);
      // left: the step and the crowd
      g.fillStyle = C.paper; rr(g, 10, 10, 470, 565, 14); g.fill(); g.strokeStyle = C.line; g.lineWidth = 2; g.stroke();
      text(g, `STEP ${st.step + 1} OF 6`, 30, 44, '600 14px Jost, sans-serif', C.muted);
      g.font = '800 22px Montserrat, Jost, sans-serif'; g.fillStyle = C.ink; g.textAlign = 'left'; wrap(g, s.n, 30, 76, 430, 28);
      g.font = '500 16px Jost, sans-serif'; g.fillStyle = C.ink; wrap(g, s.txt, 30, 128, 430, 23);
      for (let i = 0; i < 6; i++) { g.fillStyle = i === st.step ? C.navy : i < st.step ? '#9aa3d6' : '#e3d8bf'; rr(g, 30 + i * 72, 236, 64, 8, 4); g.fill(); }
      text(g, '20 players choose a spell', 30, 282, '600 15px Jost, sans-serif', C.muted);
      for (let i = 0; i < 20; i++) {
        const useF = sh > (i + .5) / 20, x = 54 + (i % 10) * 42, y = 312 + Math.floor(i / 10) * 50;
        g.fillStyle = useF ? '#e8742a' : '#8a4fd6'; g.beginPath(); g.arc(x, y, 16, 0, TAU); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 3; g.stroke();
      }
      let cnt = 0; for (let i = 0; i < 20; i++) if (sh > (i + .5) / 20) cnt++;
      icon(g, '../img/spell_fire_fireball02.jpg', 30, 410, 40); text(g, `Fireball: ${cnt}`, 80, 437, '700 18px Jost, sans-serif', '#c25a12');
      icon(g, '../img/spell_shadow_abominationexplosion.jpg', 250, 410, 40); text(g, `Corruption: ${20 - cnt}`, 300, 437, '700 18px Jost, sans-serif', '#6a35b0');
      g.font = '500 14px Jost, sans-serif'; g.fillStyle = C.muted; wrap(g, 'Multiplayer, from the post’s P.S.: start low, tune up until people care, then trim players about 10% and raise monsters about 25%.', 30, 500, 430, 20);
      // right: damage until the target dies
      const x0 = 500, cx = 560, cy = 470, cw = 450, ch = 330, T = 30, M = Math.max(500, 300 * pF, dmgC(T)) * 1.05;
      g.fillStyle = C.paper; rr(g, x0, 10, 530, 565, 14); g.fill(); g.strokeStyle = C.line; g.lineWidth = 2; g.stroke();
      text(g, 'Damage to one target, by the time it dies', 520, 44, '700 18px Montserrat, Jost, sans-serif', C.ink);
      const X = t => cx + t / T * cw, Y = d => cy - d / M * ch;
      g.strokeStyle = '#e3d8bf'; g.lineWidth = 1; g.font = '500 13px Jost, sans-serif'; g.fillStyle = C.muted; g.textAlign = 'center';
      for (let t = 0; t <= T; t += 5) { g.beginPath(); g.moveTo(X(t), cy); g.lineTo(X(t), cy - ch); g.stroke(); g.fillText(`${t} s`, X(t), cy + 20); }
      g.textAlign = 'right'; for (let d = 0, step = M > 700 ? 250 : 100; d <= M; d += step) { g.beginPath(); g.moveTo(cx, Y(d)); g.lineTo(cx + cw, Y(d)); g.stroke(); g.fillText(d, cx - 8, Y(d) + 4); }
      // Corruption: a line; Fireball: steps every 10 s
      g.lineWidth = 4; g.strokeStyle = '#8a4fd6'; g.beginPath(); g.moveTo(X(0), Y(0)); g.lineTo(X(T), Y(dmgC(T))); g.stroke();
      g.strokeStyle = '#e8742a'; g.beginPath(); g.moveTo(X(0), Y(0));
      for (let c = 0; c < 3; c++) { g.lineTo(X(c * 10), Y(100 * pF * c)); g.lineTo(X(c * 10), Y(100 * pF * (c + 1))); } g.lineTo(X(T), Y(300 * pF)); g.stroke();
      // the target's death
      g.setLineDash([6, 6]); g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.moveTo(X(life), cy); g.lineTo(X(life), cy - ch - 10); g.stroke(); g.setLineDash([]);
      text(g, `target dies at ${life} s`, X(life), cy - ch - 16, '600 14px Jost, sans-serif', C.navy, 'center');
      [[F, '#e8742a'], [Cd, '#8a4fd6']].forEach(([d, col]) => { g.fillStyle = col; g.beginPath(); g.arc(X(life), Y(d), 7, 0, TAU); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); });
      text(g, `Fireball ${Math.round(F)}`, 520, 534, '700 20px Jost, sans-serif', '#c25a12');
      text(g, `Corruption ${Math.round(Cd)}`, 700, 534, '700 20px Jost, sans-serif', '#6a35b0');
      const r = Cd / F; text(g, r >= 1 ? `Corruption +${Math.round((r - 1) * 100)}%` : `Fireball +${Math.round((1 / r - 1) * 100)}%`, 870, 534, '700 18px Jost, sans-serif', C.ink);
      text(g, 'Fireball: 100 × power, instant, every 10 s   ·   Corruption: 15 a second, one per target', 520, 562, '500 13px Jost, sans-serif', C.muted);
      // side panel sync
      sBtns.forEach((b, i) => b.classList.toggle('on', i === st.step));
      if (document.activeElement !== rF) rF.value = pF; if (document.activeElement !== rL) rL.value = life;
      $(sl, '.tn-pfv').textContent = `${pF.toFixed(1)}×`; $(sl, '.tn-lifev').textContent = `${life} s`;
    }
    function frame() { if (st.tour) Object.assign(st, tourState(st.t)); draw(); }
    LP.runners.tune = { seek(t) { st.held = true; st.tour = true; st.t = t; frame(); }, dur: () => DUR };
    return dt => { if (st.held) return; dt = Math.max(0, Math.min(dt, .1)); if (st.tour) { st.t += dt; if (st.t >= DUR) st.t = 0; } frame(); };
  });

  /* ---------------- 3. Fire that heals ---------------- */
  const PATCH = [[300, 300], [520, 380], [740, 300]], R0 = 62;
  const RAID = [[200, 520, 0], [250, 545, 0], [330, 530, 0], [420, 540, 1], [500, 520, 1], [560, 548, 1], [620, 528, 1], [700, 540, 2], [780, 520, 2], [850, 545, 2]];
  const HP0 = [.35, .5, .3, .45, .4, .55, .3, .5, .38, .42];
  const COLS = ['#2ea3dc', '#2fae63', '#8a4fd6', '#e08a2c', '#5562eb'];
  function fireScene(mode) {
    return (g, u) => {
      TD.use(g);
      g.save(); rr(g, 10, 10, W - 20, H - 20, 14); g.clip(); TD.floor(10, 10, W - 20, H - 20); g.restore();
      const green = mode === 'green', forced = mode === 'forced';
      const R = forced ? R0 + 230 * ease(clamp((u - 3) / 3)) : R0;
      // the fire
      PATCH.forEach(([x, y], i) => {
        const fl = 1 + .05 * Math.sin(u * 9 + i * 2), gr = g.createRadialGradient(x, y, 0, x, y, R * fl);
        if (green) { gr.addColorStop(0, 'rgba(160,255,170,.85)'); gr.addColorStop(.6, 'rgba(60,200,100,.55)'); gr.addColorStop(1, 'rgba(40,160,80,0)'); }
        else { gr.addColorStop(0, 'rgba(255,240,150,.9)'); gr.addColorStop(.5, 'rgba(255,120,30,.6)'); gr.addColorStop(1, 'rgba(220,40,20,0)'); }
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, R * fl, 0, TAU); g.fill();
      });
      // the dragon
      TD.foe(520, 110, 54, Math.PI / 2, '#7a2a1c', { edge: '#3a120c', mark: 'horns' });
      TD.label('the dragon: its fire heals you', 520, 190, 'center', C.ink, 15);
      // the raid
      let inside = 0, total = 0;
      RAID.forEach(([sx, sy, pi], i) => {
        const [px, py] = PATCH[pi], ang = Math.atan2(sy - py, sx - px) + (i % 2 ? .35 : -.35);
        const rim = [px + Math.cos(ang) * (R0 + 34), py + Math.sin(ang) * (R0 + 34)], mid = [px + Math.cos(ang) * 22, py + Math.sin(ang) * 22];
        const tgt = green ? mid : rim, k = ease(clamp(u / 2.6)), x = lerp(sx, tgt[0], k), y = lerp(sy, tgt[1], k);
        const dIn = Math.hypot(x - px, y - py) < R ? 1 : 0;
        // time spent inside so far: green from about 2 s, forced once the fire reaches the rim
        const tIn = green ? Math.max(0, u - 2) : forced ? Math.max(0, u - 3.75) : 0;   // the spreading fire reaches the rim at about 3.75 s
        const hp = clamp(HP0[i] + tIn * .14);
        TD.player(x, y, Math.atan2(py - y, px - x), .8, 1, COLS[i % 5]); TD.hp(x, y - 26, 34, hp * 100, 100);
        if (dIn && (green || forced) && Math.floor(u * 3 + i) % 3 === 0) TD.popText('+', x + 14, y - 34 - (u * 30 % 20), C.green, .9);
        total += hp; inside += tIn;
      });
      // readouts
      g.fillStyle = C.paper; rr(g, 24, 24, 300, 96, 12); g.fill(); g.strokeStyle = C.line; g.lineWidth = 2; g.stroke();
      text(g, green ? 'GREEN FIRE' : forced ? 'RED FIRE, COVERING THE FLOOR' : 'RED FIRE', 40, 50, '600 13px Jost, sans-serif', C.muted);
      text(g, `Raid health ${Math.round(total / RAID.length * 100)}%`, 40, 80, '800 22px Montserrat, Jost, sans-serif', C.ink);
      text(g, `${inside.toFixed(1)} raider-seconds in the fire`, 40, 106, '600 15px Jost, sans-serif', C.muted);
      if (mode === 'red' && u > 3) TD.label('they stand around it, not in it', 520, 250, 'center', C.red, 16);
      if (green && u > 3) TD.label('they walk straight in', 520, 250, 'center', C.green, 16);
      if (forced && u > 5.5) TD.label('in it only because there is nowhere else', 520, 250, 'center', C.goldInk, 16);
    };
  }
  const FIRE_SAY = {
    red: 'The fire heals, but it is red and orange and it flickers. Raiders read it as danger and walk around it, still hurt.',
    green: 'Same rule, green fire. Nothing tells them to stay out, so they step in and heal. The cue now matches the rule.',
    forced: 'Red fire again, but it spreads across the floor. They end up in it only when the fight leaves no other place, which is what the post saw.',
  };
  LP.scenes('fire', {
    scenes: [{ id: 'red', label: 'Red fire', len: 8, draw: fireScene('red') }, { id: 'green', label: 'Green fire', len: 8, draw: fireScene('green') }, { id: 'forced', label: 'Red, covering the floor', len: 9, draw: fireScene('forced') }],
    menu: '.fi-menu', tour: '.fi-tour', out: '.fi-out', say: s => FIRE_SAY[s.id],
  });
})();
