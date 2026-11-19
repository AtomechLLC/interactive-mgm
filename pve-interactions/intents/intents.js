/* Enemy intents (Slay the Spire), beside Readable Enemies and Into the Breach (MGM C4 M5).
   The Ironclad against Gremlin Nob, three turns. Nob's pattern is the game's: Bellow (he gains Enrage: +2 Strength every
   time you play a Skill), then Rush for 14, then Skull Bash for 6. With intents shown, the number over his head is the
   exact damage coming, and it updates the moment a Defend feeds his Enrage. Hide the intents and the same turn is a guess.
   Rules: CARDS, PATTERN, play(), endTurn(). The fixed five-card hand each turn is ours, to keep the puzzle small. */
(function () {
  const { txt, box, bar, pill, clamp, lerp, C, sprite, dot } = SCN;
  const W = 1040, H = 585, IMG = new URL('../../student-tokens/256px/more-games/slay-the-spire-', document.currentScript.src).href;
  const CARDS = { strike: { name: 'Strike', cost: 1, dmg: 6, text: 'Deal 6 damage', kind: 'Attack' }, defend: { name: 'Defend', cost: 1, block: 5, text: 'Gain 5 Block', kind: 'Skill' }, bash: { name: 'Bash', cost: 2, dmg: 8, vuln: 2, text: 'Deal 8. Apply 2 Vulnerable', kind: 'Attack' } };
  const HAND = ['strike', 'strike', 'defend', 'defend', 'bash'];
  const PATTERN = [{ name: 'Bellow', kind: 'buff' }, { name: 'Rush', kind: 'attack', dmg: 14 }, { name: 'Skull Bash', kind: 'attack', dmg: 6, debuff: true }];
  const CX = i => 250 + i * 136, CY = 408, CWD = 124, CHT = 164;

  SCN.run('intent', s => {
    let z, shown = true; const res = {};
    function fresh() { z = { hp: 80, block: 0, nob: 82, str: 0, enrage: false, vuln: 0, turn: 0, energy: 3, hand: HAND.map(t => ({ t, used: 0 })), phase: 'play', pt: 0, dealt: 0, taken: 0, wasted: 0, fx: [], msg: '', hitP: 0, hitN: 0 }; }
    const incoming = () => { const m = PATTERN[z.turn]; return m && m.kind === 'attack' ? m.dmg + z.str : 0; };
    function play(i) {
      const c = z.hand[i]; if (z.phase !== 'play' || !c || c.used) return; const d = CARDS[c.t];
      if (d.cost > z.energy) { z.msg = 'Not enough energy for that card.'; return; }
      z.energy -= d.cost; c.used = 1e-6;
      if (d.dmg) { const dmg = Math.floor(d.dmg * (z.vuln ? 1.5 : 1)); z.nob = Math.max(0, z.nob - dmg); z.dealt += dmg; z.hitN = 1; z.fx.push({ x: 640, y: 260, s: '-' + dmg, col: '#ffd0c8', t: 0 }); if (d.vuln) z.vuln = Math.max(z.vuln, d.vuln); z.msg = `${d.name}: ${dmg} damage${z.vuln && !d.vuln ? ' (Vulnerable adds half)' : ''}.`; }
      if (d.block) { z.block += d.block; z.msg = 'Defend: 5 Block.'; if (z.enrage) { z.str += 2; z.fx.push({ x: 630, y: 200, s: '+2 Strength', col: '#ffb951', t: 0 }); z.msg = 'Defend is a Skill: Enrage gives Nob 2 Strength. ' + (shown && incoming() ? `His intent now reads ${incoming()}.` : ''); } }
      SCN.tone({ f: d.dmg ? 180 : 420, f2: d.dmg ? 90 : 620, dur: .12, type: d.dmg ? 'sawtooth' : 'sine', vol: .08 });
    }
    const playType = t => { const i = z.hand.findIndex(c => c.t === t && !c.used); if (i >= 0) play(i); };
    function endTurn() { if (z.phase === 'play') { z.phase = 'enemy'; z.pt = 0; } }
    function resolve() {
      const m = PATTERN[z.turn];
      if (m.kind === 'buff') { z.enrage = true; if (z.block) z.wasted += z.block; z.msg = 'Nob only bellowed. ' + (z.block ? `${z.block} Block stopped nothing.` : 'Nothing to block: every point of energy went into damage.'); }
      else { const dmg = m.dmg + z.str, got = Math.max(0, dmg - z.block); z.hp -= got; z.taken += got; z.hitP = 1; z.fx.push({ x: 400, y: 260, s: got ? '-' + got : 'blocked', col: '#ffd0c8', t: 0 }); z.msg = `${m.name} hits for ${dmg}${z.block ? `, ${Math.min(dmg, z.block)} blocked` : ''}.`; SCN.noise({ dur: .2, vol: .2 }); }
    }
    const api = {
      dur: 35,
      reset(tour) { if (tour) { shown = false; delete res.shown; delete res.hidden; api.mark('shown', 'no'); } fresh(); },
      step(h) {
        z.hand.forEach(c => { if (c.used) c.used += h; }); z.fx = z.fx.filter(f => (f.t += h) < 1.1); z.hitP = Math.max(0, z.hitP - h * 3); z.hitN = Math.max(0, z.hitN - h * 4);
        if (z.phase === 'enemy') {
          const p0 = z.pt; z.pt += h;
          if (p0 < .6 && z.pt >= .6) resolve();
          if (z.pt >= 1.4) { if (z.vuln) z.vuln--; z.block = 0; z.turn++; if (z.turn >= 3 || z.nob <= 0) { z.phase = 'done'; res[shown ? 'shown' : 'hidden'] = { dealt: z.dealt, taken: z.taken, str: z.str, wasted: z.wasted }; } else { z.phase = 'play'; z.energy = 3; z.hand = HAND.map(t => ({ t, used: 0 })); } }
        }
      },
      script: [[1, 'defend'], [1.8, 'defend'], [2.6, 'strike'], [3.6, 0], [5.6, 'defend'], [6.4, 'defend'], [7.2, 'strike'], [8, 0], [10, 'defend'], [10.8, 'defend'], [11.6, 'strike'], [12.4, 0],
        [17.5, 'bash'], [18.5, 'strike'], [19.6, 0], [22, 'bash'], [23, 'strike'], [24, 0], [26.2, 'bash'], [27.2, 'strike'], [28.2, 0]].map(([t, a]) => [t, () => a ? playType(a) : endTurn()])
        .concat([[15.5, () => { shown = true; api.mark('shown', 'yes'); fresh(); }]]),
      caption: t => t < 3.6 ? 'Intents hidden. Nob could do anything, so the careful play is two Defends and a Strike.'
        : t < 5.2 ? 'He only bellowed. Ten Block stopped nothing, and now every Skill you play makes him stronger.'
        : t < 13.6 ? 'Still guessing, still defending. Each Defend feeds his Enrage: +2 Strength, for the rest of the fight.'
        : t < 15.5 ? 'Three careful turns: 18 damage dealt, and a boss with 8 Strength who has barely been touched.'
        : t < 19.6 ? 'Intents shown. Turn one reads "buff": no attack is coming, so all three energy goes into Bash and a Strike.'
        : t < 24.2 ? 'Turn two reads 14, exactly. Is 5 Block worth 2 Strength forever? The number makes it a decision you can reason about.'
        : t < 29.6 ? 'Turn three reads 6. Take it and keep hitting.'
        : 'Same hand, same boss: 59 damage against 18. The intent turns "what might he do?" into "what is my best answer to exactly this?"',
      status: () => z.phase === 'done' ? `Three turns: ${z.dealt} dealt, ${z.taken} taken, Nob on ${z.nob} health with ${z.str} Strength. Switch the intents and play the same hand again.` : z.msg || (shown ? 'Read the intent over Nob, click cards to play them, then end the turn.' : 'No intent: you have to guess what Nob does next. Click cards, then end the turn.'),
      stats() { const row = (k, cls, lab) => { const r = k === (shown ? 'shown' : 'hidden') && z.phase !== 'done' ? { dealt: z.dealt, taken: z.taken, str: z.str } : res[k]; return `<div class="${cls}"><b>${r ? r.dealt : '-'}</b><span>${lab}: damage dealt${r ? `, ${r.taken} taken, Nob at +${r.str} Strength` : ''}</span></div>`; }; return row('hidden', 'r', 'Intents hidden') + row('shown', 'g', 'Intents shown'); },
      acts: { end: endTurn },
      set(k, v) { if (k === 'shown') shown = v === 'yes'; },
      point(p) { if (p.type !== 'down') return; if (p.x > 920 && p.y > 440 && p.y < 500) return endTurn(); z.hand.forEach((c, i) => { if (!c.used && p.x > CX(i) - CWD / 2 && p.x < CX(i) + CWD / 2 && p.y > CY && p.y < CY + CHT) play(i); }); },
      draw(g) {
        g.clearRect(0, 0, W, H); g.save(); SCN.clipStage(g, W, H);
        const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#3a1d1d'); gr.addColorStop(.655, '#3a1d1d'); gr.addColorStop(.66, '#1c1420'); gr.addColorStop(1, '#120d18'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
        
        const lunge = z.phase === 'enemy' && PATTERN[z.turn]?.kind === 'attack' ? Math.sin(clamp(z.pt / 1.2) * Math.PI) * 90 : 0;
        const im1 = SCN.img(IMG + 'ironclad.png'), im2 = SCN.img(IMG + 'nob.png');
        g.save(); if (z.hitP > 0) g.filter = `brightness(${1 + z.hitP * 1.5})`; sprite(g, im1, 240 - z.hitP * 14, 366, 250); g.restore();
        g.save(); if (z.hitN > 0) g.filter = `brightness(${1 + z.hitN * 1.5})`; sprite(g, im2, 790 - lunge + z.hitN * 10, 366, 262); g.restore();
        // health, block and statuses
        bar(g, 150, 372, 180, 14, z.hp / 80, { col: '#d0423a', back: '#3a2226', stroke: '#000' }); txt(g, `${z.hp}/80`, 240, 380, { size: 13, w: 800, col: '#fff', align: 'center' });
        txt(g, 'Ironclad', 240, 44, { size: 20, w: 800, col: '#f0d7a0', align: 'center', display: true });
        if (z.block) { g.fillStyle = '#7fb6e8'; g.beginPath(); g.moveTo(118, 364); g.lineTo(146, 364); g.lineTo(146, 384); g.lineTo(132, 396); g.lineTo(118, 384); g.fill(); txt(g, z.block, 132, 378, { size: 15, w: 800, align: 'center', col: '#0d2140' }); }
        bar(g, 700, 372, 180, 14, z.nob / 82, { col: '#d0423a', back: '#3a2226', stroke: '#000' }); txt(g, `${z.nob}/82`, 790, 380, { size: 13, w: 800, col: '#fff', align: 'center' });
        txt(g, 'Gremlin Nob', 790, 26, { size: 20, w: 800, col: '#f0d7a0', align: 'center', display: true });
        let sx = 900; [[z.enrage, 'Enrage 2', '#e0913a'], [z.str, 'Strength ' + z.str, '#e5322d'], [z.vuln, 'Vulnerable ' + z.vuln, '#8a4fd6']].forEach(([on, label, col], i) => { if (on) pill(g, label, 946, 196 + i * 32, { size: 13, w: 800, fill: col }); });
        if (z.enrage) txt(g, '+2 Strength', 946, 156, { size: 12, w: 600, col: '#e9c9a0', align: 'center' }); txt(g, 'per Skill you play', 946, 171, { size: 12, w: 600, col: '#e9c9a0', align: 'center' });
        // the intent
        const m = PATTERN[Math.min(z.turn, 2)], iy = 76, ix = 790 - lunge * .3;
        if (z.phase !== 'done') {
          if (!shown) { dot(g, ix, iy + 6, 26, 'rgba(0,0,0,.55)'); txt(g, '?', ix, iy + 8, { size: 34, w: 800, col: '#cfc3d8', align: 'center', display: true }); txt(g, 'intent hidden', ix, iy + 44, { size: 13, w: 700, col: '#cfc3d8', align: 'center' }); }
          else if (m.kind === 'buff') { g.strokeStyle = '#7ddc5a'; g.lineWidth = 6; g.lineCap = 'round'; [-14, 0, 14].forEach((dx, i) => { const yy = iy + 22 - (i === 1 ? 8 : 0); g.beginPath(); g.moveTo(ix + dx, yy); g.lineTo(ix + dx, yy - 26); g.moveTo(ix + dx - 7, yy - 18); g.lineTo(ix + dx, yy - 28); g.lineTo(ix + dx + 7, yy - 18); g.stroke(); }); txt(g, 'Bellow: a buff, no attack', ix, iy + 44, { size: 14, w: 800, col: '#b9f0a0', align: 'center' }); }
          else { const n = incoming(), big = z.str > 0;
            g.save(); g.translate(ix - 34, iy + 8); g.rotate(-.7); g.fillStyle = '#d9dde8'; g.fillRect(-4, -30, 8, 44); g.beginPath(); g.moveTo(-4, -30); g.lineTo(0, -40); g.lineTo(4, -30); g.fill(); g.fillStyle = '#b5762a'; g.fillRect(-11, 12, 22, 6); g.fillRect(-3, 18, 6, 12); g.restore();
            txt(g, n, ix + 8, iy + 8, { size: 44, w: 800, col: big ? '#ffb951' : '#fff', align: 'center', display: true, halo: '#000', haloW: 6 });
            txt(g, `${m.name}: ${n} damage${m.debuff ? ' and 2 Vulnerable' : ''}${z.block ? `, ${Math.max(0, n - z.block)} after Block` : ''}`, ix, iy + 46, { size: 14, w: 800, col: '#ffd0c8', align: 'center' }); }
        }
        z.fx.forEach(f => txt(g, f.s, f.x, f.y - f.t * 50, { size: 30, w: 800, col: f.col, align: 'center', display: true, halo: '#000', haloW: 5 }));
        // hand, energy, end turn
        dot(g, 96, 480, 44, '#7a1f12'); dot(g, 96, 480, 37, '#e2572a'); txt(g, `${z.energy}/3`, 96, 482, { size: 28, w: 800, col: '#fff', align: 'center', display: true }); txt(g, 'energy', 96, 540, { size: 13, w: 700, col: '#cfc3d8', align: 'center' });
        txt(g, z.phase === 'done' ? 'after three turns' : `turn ${z.turn + 1} of 3`, 96, 420, { size: 15, w: 800, col: '#f0d7a0', align: 'center' });
        z.hand.forEach((c, i) => {
          const d = CARDS[c.t], k = c.used ? clamp(c.used / .35) : 0; if (k >= 1) return;
          const x = CX(i) - CWD / 2, y = CY - k * 70, afford = d.cost <= z.energy && z.phase === 'play';
          g.save(); g.globalAlpha = (1 - k) * (afford ? 1 : .5);
          box(g, x, y, CWD, CHT, { r: 10, fill: '#2a2230', stroke: d.kind === 'Skill' ? '#6fb7d6' : '#d36a52', lw: 3 });
          const im = SCN.img(IMG + c.t + '.png'); if (im) g.drawImage(im, x + 6, y + 6, CWD - 12, CWD - 12);
          const L = SCN.lines(g, d.text, CWD - 14, { size: 13, w: 700 }); L.forEach((l, j) => txt(g, l, x + CWD / 2, y + CWD + 12 + j * 16 - (L.length - 1) * 4, { size: 13, w: 700, col: '#f3ead8', align: 'center' }));
          dot(g, x + 8, y + 8, 16, '#7a1f12'); dot(g, x + 8, y + 8, 13, '#e2572a'); txt(g, d.cost, x + 8, y + 9, { size: 17, w: 800, col: '#fff', align: 'center' });
          g.restore();
        });
        const can = z.phase === 'play'; box(g, 928, 446, 96, 46, { r: 10, fill: can ? '#2c8f8a' : '#3b3440', stroke: '#0c2a2a', lw: 3 }); txt(g, 'End turn', 976, 470, { size: 16, w: 800, col: can ? '#fff' : '#8d8496', align: 'center' });
        if (z.phase === 'done') pill(g, `${z.dealt} dealt · ${z.taken} taken · Nob +${z.str} Strength`, W / 2, 210, { size: 22, w: 800, fill: 'rgba(0,0,0,.8)', pad: 30, padY: 18 });
        g.restore();
      },
    };
    return api;
  });
})();
