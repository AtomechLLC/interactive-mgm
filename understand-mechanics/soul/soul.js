/* One pool, two spenders (Hollow Knight's SOUL), beside Resource Pool / Life Tap (MGM C4 M2).
   Pip plays the Knight against Grub. Nail hits generate SOUL (11 a hit, vessel of 99: the game's numbers); 33 SOUL buys
   either a Focus (one mask back, 1.1 s standing still) or a Vengeful Spirit (15 damage, 0.4 s). The boss strikes on a
   fixed clock: free hands dodge on their own, busy hands get hit, so time is the second price of every spender.
   Rules: N (numbers), act() and step(). Boss health and its clock are illustrative. */
(function () {
  const { txt, box, bar, pill, clamp, lerp, C, dot, ring, arrow } = SCN, TAU = SCN.TAU;
  const W = 1040, H = 585, FLOOR = 372, PX = 400, BX = 640;
  const N = { hit: 11, cost: 33, max: 99, nail: 5, spell: 15, masks: 5, boss: 200, nailT: .32, focusT: 1.1, spellT: .4, cycle: 3.2, tele: 2.2, strike: 3.0 };

  SCN.run('soul', s => {
    let z;
    const busy = () => z.act && z.act.t < z.act.dur;
    function act(kind) {
      if (z.over || busy() || z.stun > 0 || z.dodge > 0) return;
      if (kind !== 'nail' && z.soul < N.cost) { z.deny = .5; return; }
      z.act = { kind, t: 0, dur: N[kind + 'T'], done: false };
    }
    const api = {
      dur: 20,
      reset() { z = { soul: 0, masks: N.masks, boss: N.boss, t: 0, act: null, stun: 0, dodge: 0, deny: 0, gained: 0, heal: 0, spell: 0, hits: 0, fx: [], shot: null, flash: 0, bflash: 0, over: null, msg: '' }; },
      step(h) {
        if (z.over) { z.t += h; return; }
        const c0 = z.t % N.cycle; z.t += h; const c1 = z.t % N.cycle;
        z.stun = Math.max(0, z.stun - h); z.dodge = Math.max(0, z.dodge - h); z.deny = Math.max(0, z.deny - h); z.flash = Math.max(0, z.flash - h * 3); z.bflash = Math.max(0, z.bflash - h * 4);
        z.fx = z.fx.filter(f => (f.t += h) < f.dur);
        if (z.shot) { z.shot.x += h * 900; if (z.shot.x > BX - 40) { z.shot = null; z.boss -= N.spell; z.bflash = 1; } }
        const a = z.act;
        if (a && a.t < a.dur) {
          a.t += h;
          if (a.kind === 'nail' && !a.done && a.t >= .16) { a.done = true; z.boss -= N.nail; z.bflash = 1; const got = Math.min(N.hit, N.max - z.soul); z.soul += got; z.gained += got; z.fx.push({ k: 'gain', t: 0, dur: .6 }); SCN.tone({ f: 520, f2: 260, dur: .08, type: 'square', vol: .06 }); }
          if (a.kind === 'spell' && !a.done && a.t >= .2) { a.done = true; z.soul -= N.cost; z.spell += N.cost; z.shot = { x: PX + 50 }; z.fx.push({ k: 'spell', t: 0, dur: .6 }); SCN.tone({ f: 300, f2: 900, dur: .25, vol: .1 }); }
          if (a.kind === 'focus' && a.t >= a.dur) { z.soul -= N.cost; z.heal += N.cost; z.masks = Math.min(N.masks, z.masks + 1); z.fx.push({ k: 'heal', t: 0, dur: .8 }); z.msg = 'Focus finished: 33 SOUL and 1.1 s bought one mask.'; SCN.tone({ f: 440, f2: 880, dur: .3, vol: .1 }); }
        }
        if (c0 < N.strike && c1 >= N.strike) {           // the boss's strike lands
          if (busy() || z.stun > 0) {
            const was = z.act?.kind; z.masks--; z.hits++; z.stun = .5; z.flash = 1; SCN.noise({ dur: .2, vol: .25 });
            if (was === 'focus' && busy()) { z.soul -= N.cost; z.msg = 'Hit mid-Focus: the 33 SOUL is gone and so is a mask.'; } else z.msg = 'Hit while committed to an action: the swing cost a mask.';
            z.act = null;
          } else { z.dodge = .55; z.msg = 'Hands free when the strike came: dodged.'; }
        }
        if (z.boss <= 0) { z.boss = 0; z.over = 'won'; } else if (z.masks <= 0) z.over = 'lost';
      },
      script: [.3, .7, 1.1, 1.5, 1.9, 2.3, 4.1, 4.5, 4.9, 5.3, 6.0, 8.3, 8.7, 10.9, 11.3, 11.7, 12.1, 13.1, 13.5, 13.9, 14.3].map(t => [t, () => act('nail')])
        .concat([3.6, 9.9, 10.4].map(t => [t, () => act('spell')]), [7.0, 15.0].map(t => [t, () => act('focus')])),
      caption: t => t < 3.3 ? 'Every nail hit puts 11 SOUL in the vessel. The nail is the generator. With free hands Pip dodges the boss on its own.'
        : t < 5.6 ? 'First spender: 33 SOUL becomes a Vengeful Spirit. Three nail hits of damage, bought in 0.4 seconds.'
        : t < 6.8 ? 'One swing too many. Still mid-swing when the strike lands, so it costs a mask.'
        : t < 9.5 ? 'Second spender, same pool: 33 SOUL becomes a mask back. Focus also costs 1.1 seconds of standing still, so it has to fit inside an opening.'
        : t < 12.8 ? 'Health is full, so the pool goes back into damage. Every 33 SOUL is a choice between the two.'
        : t < 15.9 ? 'A Focus started late...'
        : 'The strike lands mid-Focus: the SOUL is spent, the mask is lost, nothing healed. Time was the real price.',
      status: () => z.over === 'won' ? 'Grub is down. Look at how you split the pool between masks and damage.' : z.over === 'lost' ? 'Out of masks. A late Focus or one swing too many is what the boss\'s clock punishes.' : z.deny > 0 ? 'Not enough SOUL: both spenders cost 33.' : z.msg || 'Strike with the nail to fill the vessel, then choose: Focus to heal, or Spirit for damage. Finish before the red strike lands.',
      stats: () => `<div><b>${z.gained}</b><span>SOUL generated by nail hits</span></div><div class="g"><b>${z.heal}</b><span>SOUL spent on masks (Focus)</span></div><div class="y"><b>${z.spell}</b><span>SOUL spent on damage (Spirit)</span></div><div class="r"><b>${z.hits}</b><span>masks lost to bad timing</span></div>`,
      acts: { nail: () => act('nail'), focus: () => act('focus'), spell: () => act('spell') },
      keys: { j: 'nail', k: 'focus', i: 'spell' },
      draw(g, t) {
        g.clearRect(0, 0, W, H); g.save(); SCN.clipStage(g, W, H);
        const gr = g.createLinearGradient(0, 0, 0, FLOOR); gr.addColorStop(0, '#0e1630'); gr.addColorStop(1, '#27365e'); g.fillStyle = gr; g.fillRect(0, 0, W, FLOOR + 40);
        const rnd = SCN.rng(7);
        for (let i = 0; i < 14; i++) { const x = rnd() * W, hgt = 40 + rnd() * 120; g.fillStyle = 'rgba(8,12,28,.75)'; g.beginPath(); g.moveTo(x - 16, 0); g.lineTo(x, hgt); g.lineTo(x + 16, 0); g.fill(); }
        for (let i = 0; i < 26; i++) { const x = rnd() * W, y = (rnd() * FLOOR + z.t * (6 + rnd() * 10)) % FLOOR; dot(g, x, FLOOR - y, 1.6, 'rgba(210,230,255,.35)'); }
        g.fillStyle = '#0a0f22'; g.fillRect(0, FLOOR + 8, W, 34); g.fillStyle = '#3d4d7c'; g.fillRect(0, FLOOR + 8, W, 4);
        g.fillStyle = 'rgba(255,252,244,.96)'; g.fillRect(0, FLOOR + 42, W, H);
        // HUD: the vessel and the masks
        const vx = 58, vy = 58, vr = 34, k = z.soul / N.max;
        dot(g, vx, vy, vr + 5, '#05070f'); g.save(); g.beginPath(); g.arc(vx, vy, vr, 0, TAU); g.clip(); g.fillStyle = '#1a2140'; g.fillRect(vx - vr, vy - vr, vr * 2, vr * 2); g.fillStyle = '#f4f7ff'; g.fillRect(vx - vr, vy + vr - 2 * vr * k, vr * 2, 2 * vr * k); g.restore();
        ring(g, vx, vy, vr, '#cfd8ee', 4); [1, 2].forEach(i => { g.strokeStyle = 'rgba(20,26,54,.55)'; g.lineWidth = 2; g.beginPath(); g.moveTo(vx - vr, vy + vr - 2 * vr * i / 3); g.lineTo(vx + vr, vy + vr - 2 * vr * i / 3); g.stroke(); });
        txt(g, `SOUL ${z.soul} / 99`, vx - 34, vy + 54, { size: 14, w: 700, col: '#dfe6fb' });
        for (let i = 0; i < N.masks; i++) { const mx = 124 + i * 36, on = i < z.masks; g.fillStyle = on ? '#f4f7ff' : 'rgba(255,255,255,.14)'; g.beginPath(); g.moveTo(mx - 12, 36); g.quadraticCurveTo(mx - 14, 62, mx, 68); g.quadraticCurveTo(mx + 14, 62, mx + 12, 36); g.quadraticCurveTo(mx + 6, 44, mx, 40); g.quadraticCurveTo(mx - 6, 44, mx - 12, 36); g.fill(); if (on) { dot(g, mx - 5, 52, 3, '#0e1630'); dot(g, mx + 5, 52, 3, '#0e1630'); } }
        txt(g, 'Grub', W - 330, 34, { size: 16, w: 800, col: '#fff' }); bar(g, W - 330, 46, 300, 14, z.boss / N.boss, { col: C.red, back: 'rgba(255,255,255,.15)', stroke: '#cfd8ee' });
        // the boss clock
        const c = z.t % N.cycle, tele = !z.over && c >= N.tele && c < N.strike, hitting = !z.over && c >= N.strike && c < N.strike + .2;
        const cx0 = W - 330, cy0 = 78; bar(g, cx0, cy0, 300, 8, c / N.cycle, { col: tele || hitting ? C.red : '#8fa2d8', back: 'rgba(255,255,255,.12)', stroke: null });
        g.fillStyle = C.red; g.fillRect(cx0 + 300 * N.strike / N.cycle - 2, cy0 - 4, 4, 16); txt(g, 'next strike', cx0, cy0 + 20, { size: 12, w: 600, col: '#aab6dd' });
        // figures
        const a = z.act && z.act.t < z.act.dur ? z.act : null; let pose = 'guard', px = PX;
        if (z.over === 'lost') pose = 'down';
        else if (z.stun > 0) pose = 'hit';
        else if (z.dodge > 0) { const kk = 1 - z.dodge / .55; px = PX - Math.sin(kk * Math.PI) * 110; pose = CAST.roll(kk); }
        else if (a?.kind === 'nail') pose = CAST.swing(a.t / a.dur * 10, 3, 6, 10).pose;
        else if (a?.kind === 'spell') pose = CAST.mix('guard', 'thrust', clamp(a.t / .2));
        else if (a?.kind === 'focus') pose = CAST.mix('guard', 'crouch', clamp(a.t / .2));
        if (a?.kind === 'focus') { const kk = a.t / a.dur; ring(g, px, FLOOR - 50, 60 - kk * 40, 'rgba(244,247,255,.8)', 4); for (let i = 0; i < 8; i++) { const an = i / 8 * TAU + z.t * 3, r = 70 - kk * 50; dot(g, px + Math.cos(an) * r, FLOOR - 50 + Math.sin(an) * r * .7, 3, '#f4f7ff'); } txt(g, `Focus ${(a.dur - a.t).toFixed(1)} s`, px, FLOOR - 170, { size: 16, w: 800, col: '#f4f7ff', align: 'center' }); }
        CAST.draw(g, 'pip', { x: px, y: FLOOR + 8, pose, flash: z.flash, face: pose === 'down' ? 1 : 1 });
        const bpose = z.over === 'won' ? 'down' : hitting ? 'strike' : tele ? CAST.mix('idle', 'windup', clamp((c - N.tele) / .5)) : 'idle';
        CAST.draw(g, 'grub', { x: BX, y: FLOOR + 8, s: 1.45, face: -1, pose: bpose, flash: z.bflash * .8 });
        if (tele) { txt(g, '!', BX - 30, FLOOR - 250, { size: 44, w: 800, col: C.red, align: 'center', display: true }); }
        if (hitting) { g.strokeStyle = 'rgba(255,90,80,.9)'; g.lineWidth = 10; g.beginPath(); g.arc(BX - 60, FLOOR - 90, 150, Math.PI * .75, Math.PI * 1.2); g.stroke(); }
        if (z.shot) { g.fillStyle = '#f4f7ff'; g.beginPath(); g.ellipse(z.shot.x, FLOOR - 70, 34, 18, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(244,247,255,.4)'; g.beginPath(); g.ellipse(z.shot.x - 30, FLOOR - 70, 44, 12, 0, 0, TAU); g.fill(); }
        z.fx.forEach(f => { const kk = f.t / f.dur; if (f.k === 'gain') { dot(g, lerp(BX - 70, vx, SCN.ease(kk)), lerp(FLOOR - 90, vy, SCN.ease(kk)), 7, '#f4f7ff'); txt(g, '+11', BX - 90, FLOOR - 120 - kk * 30, { size: 18, w: 800, col: '#f4f7ff', align: 'center' }); } if (f.k === 'heal') txt(g, '+1 mask', px, FLOOR - 170 - kk * 30, { size: 20, w: 800, col: '#9df0b8', align: 'center' }); });
        txt(g, 'Pip, as the Knight', PX, FLOOR + 27, { size: 13, w: 700, col: '#aab6dd', align: 'center' });
        // the ledger: one generator, one pool, two spenders
        const y0 = FLOOR + 62, cardW = 232, cards = [
          { x: 20, title: 'GENERATOR', name: 'Nail hit', l1: '+11 SOUL', l2: '0.3 s, in reach of the boss', col: C.blue, on: a?.kind === 'nail' },
          { x: 286, title: 'POOL', name: 'SOUL vessel', l1: `${z.soul} of 99`, l2: 'three spends when full', col: C.navy, on: false },
          { x: 548, title: 'SPENDER', name: 'Focus', l1: '33 SOUL  →  +1 mask', l2: '1.1 s standing still', col: C.green, on: a?.kind === 'focus' },
          { x: 804, title: 'SPENDER', name: 'Vengeful Spirit', l1: '33 SOUL  →  15 damage', l2: '0.4 s, from range', col: C.amber, on: a?.kind === 'spell' }];
        cards.forEach(cd => {
          box(g, cd.x, y0, cd.x === 804 ? 220 : cd.x === 548 ? 222 : cardW, 104, { r: 12, fill: cd.on ? '#fff' : '#fffaf0', stroke: cd.col, lw: cd.on ? 5 : 3 });
          txt(g, cd.title, cd.x + 14, y0 + 18, { size: 12, w: 800, col: cd.col }); txt(g, cd.name, cd.x + 14, y0 + 42, { size: 21, w: 800, display: true });
          txt(g, cd.l1, cd.x + 14, y0 + 68, { size: 16, w: 700 }); txt(g, cd.l2, cd.x + 14, y0 + 88, { size: 14, w: 500, col: C.muted });
        });
        bar(g, 286 + 130, y0 + 12, 88, 12, z.soul / N.max, { col: '#9fb4ea', stroke: C.navy });
        arrow(g, 256, y0 + 52, 282, y0 + 52, { col: C.blue, lw: 4 }); arrow(g, 520, y0 + 52, 544, y0 + 52, { col: C.navy, lw: 4 });
        txt(g, 'or', 787, y0 + 52, { size: 15, w: 800, col: C.muted, align: 'center' });
        if (z.over) pill(g, z.over === 'won' ? 'Grub falls' : 'Out of masks', W / 2, 150, { size: 26, w: 800, fill: z.over === 'won' ? C.green : C.red, pad: 36, padY: 20 });
        g.restore();
      },
    };
    return api;
  });
})();
