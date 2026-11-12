/* Two views of one bestiary (MGM C4 M7, deck slides 6-7: deep content serves players with variety, and studios with reuse).
   Players see twelve Super Mario Bros. enemies. Flip to the studio's view and each one is three answers: how it moves, what a
   stomp does, what a fireball does. Twelve answers in all, reused across the roster; those twelve parts allow 48 enemies.
   CARDS is the PvE module's compositional design slide (../../pve-interactions/enemy-composer/composer.js). */
(function () {
  const { $, $$ } = FPF.kit;
  const { pic, text, card, chip, TONE, timeline, panel, scene, clamp, lerp, ease } = CK;
  const C = TD.C;
  const CARDS = [
    ['goomba', 'Goomba', 'walk', 'kill', 'kill'], ['koopa', 'Koopa Troopa', 'walk', 'kick', 'kill'], ['buzzy', 'Buzzy Beetle', 'walk', 'kick', 'ignore'],
    ['para', 'Koopa Paratroopa', 'flypatrol', 'wings', 'kill'], ['spiny', 'Spiny', 'walk', 'hurt', 'kill'], ['piranha', 'Piranha Plant', 'patrol', 'hurt', 'kill'],
    ['bloop', 'Blooper', 'fly', 'hurt', 'kill'], ['lakitu', 'Lakitu', 'fly', 'kill', 'kill'], ['bowser', 'Bowser', 'hold', 'hurt', 'kill'],
    ['bullet', 'Bullet Bill', 'fly', 'kill', 'ignore'], ['cheep', 'Cheep Cheep', 'jump', 'kill', 'kill'], ['podo', 'Podoboo', 'patrol', 'hurt', 'ignore'],
  ].map(([look, name, move, stomp, fire]) => ({ look, name, move, stomp, fire }));
  const SPR = {
    goomba: ['smb-goomba.png', 'smb-goomba-step.png'], koopa: ['smb-koopa.png', 'smb-koopa-step.png'], buzzy: ['smb-buzzy.png', 'smb-buzzy-step.png'],
    para: ['smb-paratroopa.png', 'smb-paratroopa-step.png'], spiny: ['smb-spiny.png', 'smb-spiny-step.png'], piranha: ['smb-piranha.png', 'smb-piranha-shut.png'],
    bloop: ['smb-blooper.png', 'smb-blooper-squish.png'], lakitu: ['smb-lakitu.png'], bowser: ['smb-bowser.png', 'smb-bowser-step.png'],
    bullet: ['smb-bullet-bill.png'], cheep: ['smb-cheep-cheep.png', 'smb-cheep-step.png'], podo: ['smb-podoboo.png'],
  };
  // [slot, value, label, tone]
  const PARTS = [
    ['move', 'walk', 'Walk', 'blue'], ['move', 'fly', 'Fly', 'teal'], ['move', 'patrol', 'Patrol', 'purple'], ['move', 'flypatrol', 'Fly patrol', 'pink'],
    ['move', 'hold', 'Hold & shoot', 'orange'], ['move', 'jump', 'Jump', 'grey'],
    ['stomp', 'kill', 'Defeats it', 'green'], ['stomp', 'kick', 'Leaves a shell', 'gold'], ['stomp', 'wings', 'Removes wings', 'pink'], ['stomp', 'hurt', 'Hurts Mario', 'red'],
    ['fire', 'kill', 'Defeats it', 'green'], ['fire', 'ignore', 'No effect', 'grey'],
  ];
  const SLOT = { move: 'Moves', stomp: 'Stomp', fire: 'Fireball' };
  const part = (slot, v) => PARTS.find(p => p[0] === slot && p[1] === v);
  const uses = p => CARDS.filter(c => c[p[0]] === p[1]).length;
  const pid = p => p[0] + ':' + p[1];
  const CW = 162, CH = 152, cx = i => 100 + (i % 4) * 178, cy = i => 120 + Math.floor(i / 4) * 166;
  const HL = ['fire:kill', 'move:walk', 'stomp:hurt'];
  const STEPS = [[0, 'players'], [3.6, 'flip'], [6.2, 'tally'], [7.6, 'hl0'], [10.2, 'hl1'], [12.6, 'hl2'], [15.2, 'space'], [19.5, 'end']];
  const DUR = 20;

  function enemy(g, c, x, y, s, t) {
    const fr = SPR[c.look], f = fr[((Math.floor(t * 3) % fr.length) + fr.length) % fr.length];
    const im = CK.img(f); if (!im.naturalWidth) return;
    const k = Math.min(s / im.naturalWidth, s / im.naturalHeight) * (c.look === 'bowser' ? 1 : .82);
    const bob = c.move === 'fly' || c.move === 'flypatrol' ? Math.sin(t * 3 + x) * 3 : 0;
    pic(g, f, x, y + bob, im.naturalWidth * k, { px: true });
  }
  function drawCard(g, c, i, flip, dim, t) {
    const x = cx(i), y = cy(i), sx = Math.abs(Math.cos(Math.PI * flip)), back = flip >= .5;
    g.save(); g.translate(x, y); g.scale(Math.max(sx, .02), 1); g.globalAlpha = dim ? .28 : 1;
    card(g, 0, 0, CW, CH, { edge: back ? C.navy : '#cdbf9f', lw: back ? 2.5 : 3 });
    if (!back) {
      enemy(g, c, 0, -12, 70, t);
      text(g, c.name, 0, CH / 2 - 20, { size: c.name.length > 13 ? 13 : 15, w: 700, display: true });
    } else {
      // header: sprite + name, shrunk to fit beside the sprite; then three label-over-chip rows with even gaps
      enemy(g, c, -CW / 2 + 24, -CH / 2 + 22, 30, t);
      g.save(); let ns = 13; g.font = `700 ${ns}px Montserrat, Jost, sans-serif`;
      while (ns > 9 && g.measureText(c.name).width > CW - 54) { ns -= .5; g.font = `700 ${ns}px Montserrat, Jost, sans-serif`; }
      g.restore();
      text(g, c.name, -CW / 2 + 44, -CH / 2 + 22, { align: 'left', size: ns, w: 700, display: true });
      ['move', 'stomp', 'fire'].forEach((sl, j) => {
        const p = part(sl, c[sl]), yy = -CH / 2 + 44 + j * 37;
        text(g, SLOT[sl], -CW / 2 + 12, yy, { align: 'left', size: 10.5, w: 600, col: C.muted });
        chip(g, p[2], 0, yy + 16, { ...TONE[p[3]], size: 12, width: CW - 22 });
      });
    }
    g.restore();
  }
  function tally(g, a, hl) {
    if (a <= 0) return;
    g.save(); g.globalAlpha = a;
    panel(g, 768, cy(0) - CH / 2, 256, cy(8) - cy(0) + CH, { title: 'How often each part is used' });
    let y = cy(0) - CH / 2 + 50;
    ['move', 'stomp', 'fire'].forEach(sl => {
      text(g, SLOT[sl], 784, y, { align: 'left', size: 13, w: 700, col: C.ink, display: true }); y += 23;
      PARTS.filter(p => p[0] === sl).forEach(p => {
        const n = uses(p), on = hl === pid(p);
        g.save(); g.globalAlpha *= hl && !on ? .35 : 1;
        chip(g, p[2], 784, y, { ...TONE[p[3]], size: 12, width: 112, align: 'left' });
        for (let k = 0; k < n; k++) { g.fillStyle = TONE[p[3]].edge; g.beginPath(); g.roundRect(904 + k * 9, y - 7, 7, 14, 2); g.fill(); }
        text(g, '×' + n, 904 + n * 9 + 5, y + 1, { align: 'left', size: 12, w: 700, col: C.muted });
        g.restore(); y += 27;
      });
      y += 10;
    });
    g.restore();
  }

  scene('bestiary', {
    dur: DUR,
    state: () => ({ view: 'player', hl: '' }),
    init(s, st, api) {
      const sel = $(s, '.be-part');
      sel.innerHTML = '<option value="">None</option>' + PARTS.map(p => `<option value="${pid(p)}">${SLOT[p[0]]}: ${p[2]} (×${uses(p)})</option>`).join('');
      sel.onchange = () => { api.manual(); st.view = 'studio'; st.hl = sel.value; };
      $$(s, '.be-view .btn').forEach(b => b.onclick = () => { api.manual(); st.view = b.dataset.v; if (st.view === 'player') st.hl = ''; });
      api.sync = () => { $$(s, '.be-view .btn').forEach(b => b.classList.toggle('on', b.dataset.v === st.view)); if (!st.tour && sel.value !== st.hl) sel.value = st.hl; };
      st.api = api;
    },
    draw(g, t, st, tour) {
      const L = timeline(STEPS, t);
      let flipAt = i => st.view === 'studio' ? 1 : 0, tallyA = st.view === 'studio' ? 1 : 0, hl = st.hl, space = 0;
      if (tour) {
        flipAt = i => ease(clamp((t - 3.6 - i * .12) / .7));
        tallyA = L.in('tally', .6);
        hl = L.on('space') ? '' : L.on('hl2') ? HL[2] : L.on('hl1') ? HL[1] : L.on('hl0') ? HL[0] : '';
        space = L.in('space', .6);
        st.view = L.on('flip') ? 'studio' : 'player';
      }
      const studio = tallyA > 0;
      text(g, studio ? 'What the studio built: 3 questions, 12 answers' : 'What players see: 12 enemies', 356, 24, { size: 20, w: 800, display: true, col: studio ? C.navy : C.ink });
      g.save(); if (studio) { g.translate(lerp(0, -10, tallyA), 0); }
      CARDS.forEach((c, i) => {
        const p = hl ? hl.split(':') : null;
        drawCard(g, c, i, flipAt(i), p && c[p[0]] !== p[1], t);
      });
      g.restore();
      tally(g, tallyA, hl);
      if (hl) {
        const p = PARTS.find(q => pid(q) === hl);
        text(g, `${SLOT[p[0]]}: “${p[2]}” is reused by ${uses(p)} of 12 enemies`, 356, 556, { size: 17, w: 700, col: TONE[p[3]].col });
      }
      if (space > 0) {
        g.save(); g.globalAlpha = space; g.fillStyle = 'rgba(255,252,244,.86)'; g.fillRect(0, 0, 1040, 585); g.restore();
        TD.stamp('12 parts, 48 possible enemies', 520, 230, C.navy, space, 34);
        text(g, '6 movements × 4 stomp results × 2 fireball results', 520, 300, { size: 20, w: 600, col: C.muted, a: space });
        text(g, 'Super Mario Bros. ships 12 of them, and each one plays differently', 520, 336, { size: 20, w: 600, col: C.ink, a: space });
      }
      st.api?.sync?.();
    },
    side(t, st, tour) {
      const stats = `<div><b>12</b><span>enemies the player meets</span></div><div class="y"><b>12</b><span>parts the studio built and reused</span></div><div class="g"><b>48</b><span>enemies those parts allow</span></div>`;
      const out = st.view === 'player' && !st.hl
        ? 'Players get variety: every enemy asks for a different answer, and each one feels different.'
        : 'Studios get reuse: the same twelve answers build the whole roster. “Fireball defeats it” alone appears on nine enemies.';
      return { stats, out };
    },
  });
})();
