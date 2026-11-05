/* Sequencing in real games: the appendix to "Sequencing with Tokens" (MGM C4 M6 Update, Part 8).
   Three built scenes with real game art, each a pure function of time so window.__seek can record it,
   and a click-to-play wall of YouTube clips (thumbnails only until clicked).
   - Mario (one-two combo): Luigi stomps a Koopa into a shell, Mario kicks it through a row of Goombas.
   - Pokémon (setup changes a payoff's odds): Thunder is 70% accurate, 100% in rain.
   - Classic WoW (setup A + B + C → payoff): Sunder Armor, Faerie Fire and Curse of Recklessness strip a raid boss's
     armor before an Eviscerate. Armor values are Classic's; Eviscerate's damage before armor is illustrative. */
(function () {
  const { $, $$, canvasDemo, demo } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease, TAU } = TD;
  const W = 1420, H = 600;
  const IMG = {};
  const img = n => { if (!IMG[n]) { const i = new Image(); i.src = `img/${n}`; IMG[n] = i; } return IMG[n]; };
  const ok = i => i.complete && i.naturalWidth;
  const take = (takes, t) => { const tot = takes.reduce((s, x) => s + x.dur, 0); let u = ((t % tot) + tot) % tot; for (const k of takes) { if (u < k.dur) return { k, t: u }; u -= k.dur; } return { k: takes[0], t: 0 }; };
  const banner = (text, x = 24, y = 40) => T.label(text, x, y, 'left', '#fff', 18, 'rgba(21,32,68,.92)');

  /* =====================================================================
     Slide 2: Mario, stomp then kick
     ===================================================================== */
  const S = 4, GROUND = 500;
  ['mario', 'mario-walk1', 'mario-walk2', 'mario-walk3', 'mario-jump', 'luigi', 'luigi-walk1', 'luigi-walk2', 'luigi-walk3', 'luigi-jump', 'koopa', 'koopa-step', 'koopa-shell', 'goomba', 'goomba-step'].forEach(n => img(`smb-${n}.png`));
  function sprite(g, n, x, foot, o = {}) {
    const i = img(`smb-${n}.png`); if (!ok(i)) return;
    const w = i.naturalWidth * S, h = i.naturalHeight * S;
    g.save(); g.imageSmoothingEnabled = false; g.globalAlpha *= o.a ?? 1;
    g.translate(x, foot - (o.flipY ? -h : 0)); if (o.flip) g.scale(-1, 1); if (o.flipY) g.scale(1, -1); if (o.rot) g.rotate(o.rot);
    g.drawImage(i, -w / 2, -h, w, h); g.restore();
  }
  function world(g) {
    g.fillStyle = '#5c94fc'; g.fillRect(0, 0, W, H);
    // clouds and a hill, drawn in the same flat style
    g.fillStyle = '#fff'; [[260, 120], [820, 90], [1200, 150]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 26, 0, TAU); g.arc(x + 30, y - 12, 30, 0, TAU); g.arc(x + 62, y, 26, 0, TAU); g.fill(); });
    g.fillStyle = '#00a800'; g.beginPath(); g.ellipse(130, GROUND, 150, 90, 0, Math.PI, 0); g.fill();
    for (let x = 0; x < W; x += 50) for (let y = GROUND; y < H; y += 50) {
      g.fillStyle = '#c84c0c'; g.fillRect(x, y, 50, 50); g.fillStyle = '#fcbcb0'; g.fillRect(x, y, 50, 3); g.fillRect(x, y, 3, 50);
      g.fillStyle = '#000'; g.fillRect(x + 47, y, 3, 50); g.fillRect(x, y + 47, 50, 3); g.fillRect(x + 24, y + 22, 26, 3);
    }
  }
  const walkFrame = (base, t, moving) => moving ? `${base}-walk${1 + Math.floor(t * 12) % 3}` : base;
  const GOOMBAS = [980, 1070, 1160, 1250, 1340];
  const MARIO = [
    { name: 'No setup: Mario runs into a walking Koopa', dur: 3.8, kind: 'bump' },
    { name: 'Luigi stomps (setup), Mario kicks (payoff)', dur: 6.6, kind: 'chain' },
  ];
  function koopaX(t) { return 760 - 40 * t; }
  function drawMario(g, t, o = {}) {
    const { k, t: u } = take(MARIO, t);
    world(g);
    let shell = null, cleared = 0;
    if (k.kind === 'bump') {
      const kx = koopaX(u), hitAt = (kx - 260 - 52) / (260 + 40);  // when Mario reaches the Koopa
      sprite(g, Math.floor(u * 5) % 2 ? 'koopa-step' : 'koopa', kx, GROUND);
      let mx = 260 + 260 * Math.min(u, hitAt), blink = false;
      if (u > hitAt) { const v = u - hitAt; mx -= Math.min(140, v * 420); blink = v < 1.6 && Math.floor(v * 12) % 2 === 0; }
      if (!blink) sprite(g, u > hitAt ? 'mario-jump' : walkFrame('mario', u, true), mx, GROUND - (u > hitAt && u < hitAt + .35 ? Math.sin((u - hitAt) / .35 * Math.PI) * 40 : 0));
      sprite(g, 'luigi', 150, GROUND);
      if (u > hitAt) T.stamp('Ouch: a walking Koopa hurts', kx - 120, 300, C.red, clamp((u - hitAt) / .2), 26);
    } else {
      // Luigi's stomp: jump from x 540 at .5, land on the Koopa at 1.1, bounce back to 600 by 1.7
      const st = 1.1, kx = koopaX(st);
      let lx = 540, ly = GROUND, lf = 'luigi';
      if (u >= .5 && u < st) { const v = (u - .5) / (st - .5); lx = lerp(540, kx, v); ly = GROUND - 64 - Math.sin(v * Math.PI) * 150 + v * 64 - 0; lf = 'luigi-jump'; ly = lerp(GROUND, GROUND - 92, v) - Math.sin(v * Math.PI) * 140; }
      else if (u >= st && u < 1.7) { const v = (u - st) / .6; lx = lerp(kx, 610, v); ly = GROUND - 92 * (1 - v) - Math.sin(v * Math.PI) * 90; lf = 'luigi-jump'; }
      else if (u >= 1.7) lx = 610;
      // Mario runs from 160 at 1.7 and touches the shell; the shell then slides right at 560 px/s
      const kick = 1.7 + (kx - 52 - 160) / 300;
      const mx = u < 1.7 ? 160 : u < kick ? 160 + 300 * (u - 1.7) : kx - 52;
      const sx = u < kick ? kx : kx + 560 * (u - kick);
      if (u < st) sprite(g, Math.floor(u * 5) % 2 ? 'koopa-step' : 'koopa', koopaX(u), GROUND);
      else { shell = sx; sprite(g, 'koopa-shell', sx, GROUND); }
      GOOMBAS.forEach((gx0, i) => {
        const gx = gx0 - 22 * u, hit = u >= kick && sx >= gx - 50;
        if (hit) { cleared++; const hitT = kick + (gx0 - 50 - kx) / (560 + 22); const v = u - hitT; sprite(g, 'goomba', gx + v * 60, GROUND - 120 * v + 600 * v * v, { flipY: true }); }
        else sprite(g, Math.floor(u * 4) % 2 ? 'goomba-step' : 'goomba', gx, GROUND);
      });
      sprite(g, lf, lx, ly);
      sprite(g, u >= 1.7 && u < kick ? walkFrame('mario', u, true) : 'mario', mx, GROUND);
      if (u >= st && u < st + 1.6) T.label('Setup: Luigi’s stomp leaves a shell', kx, 360, 'center', '#fff', 17, '#5562eb');
      if (u >= kick && u < kick + 1.6) T.label('Payoff: Mario’s kick', mx, 360, 'center', '#fff', 17, '#e5322d');
      if (cleared) T.label(`Goombas cleared: ${cleared}`, W - 24, 40, 'right', C.ink, 20);
    }
    T.label('Luigi', lxLabel(k, u), GROUND + 30, 'center', '#fff', 14, '#2f8a2f');
    if (!o.quiet) banner(k.name);
  }
  function lxLabel(k, u) { if (k.kind === 'bump') return 150; return u < .5 ? 540 : u >= 1.7 ? 610 : -100; }

  /* =====================================================================
     Slide 3: Pokémon, rain then Thunder
     ===================================================================== */
  ['pk-pikachu.png', 'pk-squirtle.png', 'pk-tauros.png'].forEach(img);
  const PK_T0 = 1.8, PK_STEP = .8, PK_N = 10, PK_DUR = PK_T0 + PK_STEP * PK_N + 1.6;
  const MISS = [2, 5, 8];  // 7 of 10 land without rain
  function pokePanel(g, x0, t, rain, title) {
    const w = 690, h = 600;
    g.save(); g.beginPath(); g.roundRect(x0, 0, w, h, 14); g.clip();
    const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, rain ? '#9fb3c8' : '#f7f3e3'); sky.addColorStop(1, rain ? '#7e98ae' : '#e2efcf');
    g.fillStyle = sky; g.fillRect(x0, 0, w, h);
    g.fillStyle = 'rgba(80,120,60,.35)'; g.beginPath(); g.ellipse(x0 + 520, 270, 140, 34, 0, 0, TAU); g.fill(); g.beginPath(); g.ellipse(x0 + 210, 470, 200, 44, 0, 0, TAU); g.fill();
    const rainK = rain ? clamp((t - .6) / .6) : 0;
    if (rainK > 0) { g.strokeStyle = `rgba(230,240,255,${.7 * rainK})`; g.lineWidth = 2; for (let i = 0; i < 90; i++) { const rx = x0 + ((i * 97) % w), ry = ((i * 53 + t * 900) % (h + 40)) - 40; g.beginPath(); g.moveTo(rx, ry); g.lineTo(rx - 8, ry + 22); g.stroke(); } }
    const draw = (n, x, y, s, flip) => { const i = img(n); if (!ok(i)) return; g.save(); g.translate(x, y); if (flip) g.scale(-1, 1); g.drawImage(i, -s / 2, -s, s, s); g.restore(); };
    // attempts so far
    const i = Math.floor((t - PK_T0) / PK_STEP), k = (t - PK_T0 - i * PK_STEP) / PK_STEP;
    const hitNow = i >= 0 && i < PK_N && (rain || !MISS.includes(i));
    let shake = 0;
    if (i >= 0 && i < PK_N && k > .25 && k < .55 && hitNow) shake = Math.sin(k * 80) * 6;
    draw('pk-tauros.png', x0 + 520 + shake, 285, 190, false);
    draw('pk-squirtle.png', x0 + 140, 490, 170, true);
    draw('pk-pikachu.png', x0 + 300, 495, 170, true);
    if (rain && t >= .2 && t < 1.6) { g.fillStyle = 'rgba(47,143,214,.25)'; g.beginPath(); g.arc(x0 + 140, 410, 90, 0, TAU); g.fill(); }
    if (i >= 0 && i < PK_N && k < .6) {
      g.fillStyle = 'rgba(233,181,42,.25)'; g.beginPath(); g.arc(x0 + 300, 415, 85, 0, TAU); g.fill();
      if (k > .2) {
        const tx = hitNow ? x0 + 520 : x0 + 400, ty = hitNow ? 200 : 300;
        g.strokeStyle = '#fff6a0'; g.lineWidth = 9; g.lineJoin = 'round'; g.beginPath(); g.moveTo(tx + 10, -10);
        for (let s = 1; s <= 6; s++) g.lineTo(tx + (s % 2 ? -26 : 22), ty * s / 6);
        g.stroke(); g.strokeStyle = '#e9b52a'; g.lineWidth = 4; g.stroke();
        if (hitNow) { T.use(g); T.flash(x0 + 520, 200, 90, 1 - (k - .2) / .4); } else T.popText('Missed!', x0 + 390, 330, '#5d618c', 1 - (k - .2) / .4);
      }
    }
    // the message box and the tally
    const msg = rain && t < 1.6 && t >= .2 ? 'Squirtle used Rain Dance!' : i >= 0 && i < PK_N ? `Pikachu used Thunder! ${hitNow ? '' : 'The attack missed.'}` : t >= PK_T0 ? 'Ten Thunders.' : rain ? '' : 'No setup this turn.';
    g.fillStyle = '#fffaf0'; g.strokeStyle = '#262c6a'; g.lineWidth = 3; g.beginPath(); g.roundRect(x0 + 16, 520, w - 32, 64, 10); g.fill(); g.stroke();
    g.fillStyle = C.ink; g.font = '600 20px Jost, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(msg, x0 + 32, 552);
    const done = Math.min(PK_N, Math.max(0, i + (k > .3 ? 1 : 0)));
    let hits = 0;
    for (let j = 0; j < PK_N; j++) {
      const cx = x0 + 52 + j * 40, cy = 120, hit = rain || !MISS.includes(j);
      g.fillStyle = j < done ? (hit ? '#e9b52a' : '#c9c3b3') : 'rgba(255,255,255,.55)'; g.strokeStyle = '#262c6a'; g.lineWidth = 2;
      g.beginPath(); g.arc(cx, cy, 15, 0, TAU); g.fill(); g.stroke();
      if (j < done) { if (hit) hits++; g.fillStyle = hit ? '#fff' : '#7a7f9e'; g.font = '800 16px Montserrat, sans-serif'; g.textAlign = 'center'; g.fillText(hit ? '⚡' : '✕', cx, cy + 1); }
    }
    T.use(g); T.label(title, x0 + 22, 40, 'left', '#fff', 17, 'rgba(21,32,68,.92)');
    g.fillStyle = C.ink; g.font = '700 18px Jost, sans-serif'; g.textAlign = 'left'; g.fillText(`${hits} of ${done} hit`, x0 + 455, 121);
    g.restore();
    g.strokeStyle = '#cdbf9f'; g.lineWidth = 2; g.beginPath(); g.roundRect(x0, 0, w, h, 14); g.stroke();
  }
  function drawPokemon(g, t) {
    const u = t % PK_DUR;
    pokePanel(g, 10, u, false, 'No rain: Thunder is 70% accurate');
    pokePanel(g, 720, u, true, 'Squirtle sets up rain first');
  }

  /* =====================================================================
     Slide 4: Classic WoW, three debuffs then Eviscerate
     ===================================================================== */
  ['wow-onyxia.png', 'classicon_warrior.jpg', 'classicon_druid.jpg', 'classicon_warlock.jpg', 'classicon_rogue.jpg', 'ability_warrior_sunder.jpg', 'spell_nature_faeriefire.jpg', 'spell_shadow_unholystrength.jpg', 'ability_rogue_eviscerate.jpg'].forEach(img);
  const ARMOR = 3731, K60 = 400 + 85 * 60, EVIS = 1500;           // Classic: reduction = armor / (armor + 400 + 85 × attacker level)
  const DR = a => a / (a + K60);
  const DEBUFF = [
    { at: [1.3, 1.7, 2.1, 2.5, 2.9], icon: 'ability_warrior_sunder.jpg', name: 'Sunder Armor', per: 450, who: 0, max: 5 },
    { at: [3.6], icon: 'spell_nature_faeriefire.jpg', name: 'Faerie Fire', per: 505, who: 1 },
    { at: [4.4], icon: 'spell_shadow_unholystrength.jpg', name: 'Curse of Recklessness', per: 640, who: 2 },
  ];
  const RAID = [
    { cls: 'classicon_warrior.jpg', name: 'Warrior', role: 'Setup A: Sunder Armor ×5', col: '#c79c6e' },
    { cls: 'classicon_druid.jpg', name: 'Druid', role: 'Setup B: Faerie Fire', col: '#ff7d0a' },
    { cls: 'classicon_warlock.jpg', name: 'Warlock', role: 'Setup C: Curse of Recklessness', col: '#9482c9' },
    { cls: 'classicon_rogue.jpg', name: 'Rogue', role: 'Payoff: Eviscerate', col: '#c9b100' },
  ];
  const EV1 = .5, EV2 = 5.4, WOW_DUR = 8.6;
  function drawWow(g, t) {
    const u = t % WOW_DUR;
    g.fillStyle = '#1b1e2e'; g.fillRect(0, 0, W, H);
    const bg = g.createRadialGradient(420, 230, 40, 420, 230, 520); bg.addColorStop(0, '#4a2a22'); bg.addColorStop(1, '#1b1e2e'); g.fillStyle = bg; g.fillRect(0, 0, 900, H);
    const draw = (n, x, y, s) => { const i = img(n); if (ok(i)) g.drawImage(i, x, y, s, s); };
    // boss
    draw('wow-onyxia.png', 70, 60, 230);
    g.fillStyle = '#ffd100'; g.font = '700 30px Montserrat, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillText('Onyxia', 330, 110);
    g.fillStyle = '#c9c3b3'; g.font = '600 18px Jost, sans-serif'; g.fillText('Raid boss · 3731 armor in Classic', 330, 140);
    // armor right now
    let armor = ARMOR; const applied = [];
    DEBUFF.forEach(d => { const n = d.at.filter(a => u >= a).length; if (n) { armor -= d.per * n; applied.push({ ...d, n }); } });
    armor = Math.max(0, armor);
    const bx = 330, by = 170, bw = 520;
    g.fillStyle = '#2b2f45'; g.fillRect(bx, by, bw, 30); g.fillStyle = '#8b8fa8'; g.fillRect(bx, by, bw * armor / ARMOR, 30);
    g.strokeStyle = '#000'; g.lineWidth = 2; g.strokeRect(bx, by, bw, 30);
    g.fillStyle = '#fff'; g.font = '700 18px Jost, sans-serif'; g.fillText(`Armor ${armor}`, bx + 10, by + 21);
    g.fillStyle = '#ffd100'; g.font = '700 22px Jost, sans-serif'; g.fillText(`Physical damage reduced by ${(DR(armor) * 100).toFixed(1)}%`, bx, by + 66);
    // debuff row, like the target frame's
    applied.forEach((d, i) => {
      const x = bx + i * 84, y = 268, last = d.at[d.n - 1], pop = clamp((u - last) / .25);
      g.save(); g.globalAlpha = pop; draw(d.icon, x, y, 64); g.strokeStyle = '#e5322d'; g.lineWidth = 3; g.strokeRect(x, y, 64, 64);
      if (d.max) { g.fillStyle = '#fff'; g.font = '800 22px Montserrat, sans-serif'; g.textAlign = 'right'; g.lineWidth = 4; g.strokeStyle = '#000'; g.strokeText(d.n, x + 60, y + 60); g.fillText(d.n, x + 60, y + 60); g.textAlign = 'left'; }
      g.restore();
      g.fillStyle = '#c9c3b3'; g.font = '600 13px Jost, sans-serif'; g.fillText(`−${d.per * d.n}`, x + 14, y + 84);
    });
    if (!applied.length) { g.fillStyle = '#8b8fa8'; g.font = 'italic 600 17px Jost, sans-serif'; g.fillText('No debuffs yet', bx, 300); }
    // the two Eviscerates
    const ev = (at, label, arm, y) => {
      if (u < at) return;
      const dmg = Math.round(EVIS * (1 - DR(arm))), k = clamp((u - at) / .5), w = 520 * dmg / EVIS * ease(k);
      g.fillStyle = '#c9c3b3'; g.font = '600 17px Jost, sans-serif'; g.fillText(label, 70, y - 10);
      draw('ability_rogue_eviscerate.jpg', 70, y, 44);
      g.fillStyle = '#2b2f45'; g.fillRect(124, y + 6, 520, 32); g.fillStyle = arm === ARMOR ? '#8b8fa8' : '#ffd100'; g.fillRect(124, y + 6, w, 32);
      g.fillStyle = arm === ARMOR ? '#fff' : '#1b1e2e'; g.font = '800 20px Montserrat, sans-serif'; g.fillText(`${Math.round(dmg * ease(k))}`, 134, y + 30);
      if (k < 1 && u - at < .4) { T.use(g); T.popText(`${dmg}`, 260, 210, arm === ARMOR ? '#c9c3b3' : '#ffd100', 1 - (u - at) / .4); }
    };
    ev(EV1, 'Eviscerate on the bare boss', ARMOR, 400);
    ev(EV2, 'The same Eviscerate after the three debuffs', ARMOR - 2250 - 505 - 640, 490);
    // the raid, with who is acting
    const acting = u >= EV1 && u < EV1 + .6 ? 3 : u >= EV2 && u < EV2 + .8 ? 3 : DEBUFF.findIndex(d => d.at.some(a => u >= a - .1 && u < a + .35));
    RAID.forEach((r, i) => {
      const x = 930, y = 70 + i * 120, on = i === acting;
      g.fillStyle = on ? 'rgba(255,209,0,.18)' : 'rgba(255,255,255,.05)'; g.strokeStyle = on ? '#ffd100' : '#3a3f5a'; g.lineWidth = 2;
      g.beginPath(); g.roundRect(x, y, 460, 100, 12); g.fill(); g.stroke();
      draw(r.cls, x + 16, y + 18, 64);
      g.fillStyle = r.col; g.font = '700 22px Montserrat, sans-serif'; g.fillText(r.name, x + 96, y + 44);
      g.fillStyle = '#e9e5d8'; g.font = '600 17px Jost, sans-serif'; g.fillText(r.role, x + 96, y + 72);
    });
    g.fillStyle = '#8b8fa8'; g.font = '500 14px Jost, sans-serif';
    g.fillText('Armor values from Classic. Eviscerate’s 1500 damage before armor is illustrative.', 70, 585);
  }

  /* =====================================================================
     Slide 5: the clip wall (all ids checked against YouTube's oEmbed on 2026-11-05)
     ===================================================================== */
  const VIDS = [
    { id: '-6PZpEjnbiY', g: 'hand', t: 'Volleyball basics: bump, set, spike', by: 'Justice', stage: 'Setup → exploit → payoff', why: 'The deck’s analogy: three touches, and no player may touch the ball twice in a row.' },
    { id: 'Dof8TdMyQZU', g: 'hand', t: 'When your randoms reload your Recoilless Rifle', by: 'Harvey Play (Helldivers 2)', stage: 'A hand-off', why: 'One player carries the backpack and reloads, so the gunner fires far faster than alone.' },
    { id: 'gUSRK7fXtqc', g: 'hand', t: 'Team Reloading Is Magic', by: 'CommissarKai (Helldivers 2)', stage: 'A hand-off, explained', why: 'A longer look at why the two-person weapons reward coordination.' },
    { id: 'FFghGp8pwW8', g: 'pair', t: 'Electrified Puddle Effect', by: 'Zesix (Divinity: Original Sin 2)', stage: 'Setup → payoff', why: 'Water on the ground is the setup; a lightning spell turns it into a stun for everyone standing in it.' },
    { id: 'lbQsCguODO0', g: 'pair', t: 'New Strat (Rain Dance / Thunder)', by: 'TheZulfiqars Gaming (Pokémon)', stage: 'Setup → payoff', why: 'Rain makes Thunder always hit: the one-two combo built in slide 3.' },
    { id: 'Jqot-R3UuuU', g: 'pair', t: 'Wet, Freeze and Explode', by: 'Sling225 (Magicka)', stage: 'Setup → exploit → payoff', why: 'The deck’s own example, in play.' },
    { id: 'LGXhZjLoEaw', g: 'pair', t: 'Guide to Frozen + Shattered', by: 'AoShenCraft (Genshin Impact)', stage: 'Setup A + setup B → payoff', why: 'Hydro plus Cryo makes Frozen in either order; a heavy or Geo hit shatters it.' },
    { id: 'w1NgyK67dMM', g: 'exploit', t: 'Final Fantasy XIII: Combat Tips', by: 'IGN Strategize', stage: 'Exploit', why: 'The stagger gauge: one role builds it, another keeps it from draining, and the payoff lands on a staggered enemy.' },
    { id: 'kJrY-lVJF9U', g: 'exploit', t: 'Driver Combos 101', by: 'TheZorsGaming (Xenoblade Chronicles 2)', stage: 'Break → Topple → Launch → Smash', why: 'Each stage only works on the state the last one left, the deck’s Break → Topple example taken two steps further.' },
    { id: 'VJ9fy9DYRWI', g: 'exploit', t: 'Shatter Combo Tutorial', by: 'Evertras (World of Warcraft)', stage: 'Setup → exploit → payoff in one kit', why: 'A frost mage freezes the target, and Shatter turns Frozen into a crit window: the same chain inside one character.' },
    { id: 'QvOdmIwGGuk', g: 'chain', t: 'A perfect Graviton + Dragonstrike combo', by: 'Flats Clips (Overwatch 2)', stage: 'Setup → payoff', why: 'Zarya pulls the team into one spot, and Hanzo’s slow ultimate cannot miss.' },
    { id: 'd14-g7nbnNE', g: 'chain', t: 'Echo Slam & Black Hole wombo combo', by: 'Clinton Alvares (Dota 2)', stage: 'Setup → payoff', why: 'Black Hole holds everyone together, and Echo Slam scales with how many enemies are close.' },
    { id: 'KhAavFeXtuY', g: 'chain', t: 'Sleep bombing with the Great Sword', by: 'DanteReaver (Monster Hunter: World)', stage: 'Setup → payoff', why: 'A sleeping monster holds still, so the slowest, strongest hits finally land.' },
  ];
  const GROUPS = { hand: 'Hand-offs', pair: 'Setup → payoff', exploit: 'Exploits', chain: 'Full chains in team games' };
  demo('videos', {
    init(s) {
      const list = $(s, '.vid-list'), ph = $(s, '.vid-player');
      list.innerHTML = Object.entries(GROUPS).map(([g, name]) => `<div class="vg"><div class="vg-h">${name}</div>` +
        VIDS.map((v, i) => v.g !== g ? '' : `<button class="vid" data-i="${i}"><img src="https://i.ytimg.com/vi/${v.id}/mqdefault.jpg" alt="" loading="lazy"><span><b>${v.t}</b><small>${v.by}</small></span></button>`).join('') + '</div>').join('');
      s._pick = (i, play) => {
        const v = VIDS[i];
        $$(list, '.vid').forEach(b => b.classList.toggle('on', +b.dataset.i === i));
        ph.innerHTML = play
          ? `<iframe src="https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&rel=0" title="${v.t}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`
          : `<button class="vid-ph" style="background-image:url(https://i.ytimg.com/vi/${v.id}/hqdefault.jpg)" aria-label="play ${v.t}"><span>▶</span></button>`;
        if (!play) $(ph, '.vid-ph').onclick = () => s._pick(i, true);
        $(s, '.vid-title').textContent = `${v.t} · ${v.by}`;
        $(s, '.vid-stage').textContent = v.stage;
        $(s, '.vid-why').textContent = v.why;
        $(s, '.vid-link').href = 'https://www.youtube.com/watch?v=' + v.id;
      };
      list.onclick = e => { const b = e.target.closest('.vid'); if (b) s._pick(+b.dataset.i, true); };
      s._pick(0, false);
    },
    leave(s) { const f = $(s, '.vid-player iframe'); if (f) s._pick(VIDS.findIndex(v => f.src.includes(v.id)), false); },
  });

  /* ---------- wiring ---------- */
  const SEEK = {};
  const fitTo = (g, cv, fn) => { const sc = Math.min(cv.width / W, cv.height / H); g.save(); g.translate((cv.width - W * sc) / 2, (cv.height - H * sc) / 2); g.scale(sc, sc); g.beginPath(); g.roundRect(0, 0, W, H, 12); g.clip(); fn(); g.restore(); };
  function scene(name, draw, dur) {
    canvasDemo(name, (s, cv, g) => {
      const st = { t: 0, held: false };
      const render = () => { T.use(g); g.clearRect(0, 0, cv.width, cv.height); fitTo(g, cv, () => draw(g, st.t)); };
      SEEK[name] = { seek(t) { st.held = true; st.t = t; render(); }, dur: () => dur };
      return dt => { if (!st.held) st.t += dt; render(); };
    });
  }
  scene('title', (g, t) => drawMario(g, MARIO[0].dur + (t % MARIO[1].dur), { quiet: true }), MARIO[1].dur);
  scene('mario', drawMario, MARIO.reduce((s, k) => s + k.dur, 0));
  scene('pokemon', drawPokemon, PK_DUR);
  scene('wow', drawWow, WOW_DUR);
  window.__seek = (t, which) => SEEK[which].seek(t);
  window.__dur = which => SEEK[which].dur();
})();
