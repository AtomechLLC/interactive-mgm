/* What's next (MGM C4 M7, deck slides 264-266): make the problem first.
   Slide 266: "Start by creating the challenges first for your game. Next create the tools for overcoming those challenges.
   Then expand the breadth or depth of those tools… Then cut things out that aren't strong contenders, refine and improve
   what you have, then repeat."
   PF.loop(name, cfg) draws every slide on this page the same way: the game on the left, a ledger above it that pairs each
   challenge with the tools that answer it, and the four-step loop on the right. Each step lasts PH seconds; step 4 ends with
   "then again": a new challenge that starts the next loop.
   cfg: { bg, steps: [4 captions], next: caption for the new challenge, challenges: [[name, step, at, {next}]],
          tools: [[name, step, at, {spec, cut: [step, at], back: [step, at]}]], game(g, i, a, t, on) }
   Steps are 0-based; at is seconds into that step. on([step, at]) is true once that moment is reached.
   'challenge-loop' is the deck's own example, played on Super Mario Bros. ground. genres.js adds five more. */
(function () {
  const { pic, text, wrap, card, chip, TONE, panel, scene, clamp, ease, lerp, arrow } = CK;
  const C = TD.C;
  const PH = 4, TEASE = 2.2, STEP = ['Create the challenges', 'Shape your toolkit', 'Expand breadth & depth', 'Prune, refine, repeat'];
  const ph = (t, a, b) => clamp((t - a) / (b - a));
  const when = ([s, at]) => s * PH + at;
  // a label on a cream pill, readable on any game background; note() is the same for a few lines of text
  function tag(g, s, x, y, o = {}) {
    const size = o.size || 15; g.save(); g.font = `800 ${size}px Jost, sans-serif`; const w = g.measureText(s).width + 24; g.restore();
    card(g, x, y, w, size * 1.9, { fill: 'rgba(255,250,240,.96)', edge: C.navy, lw: 2, shadow: false, r: size, a: o.a });
    text(g, s, x, y + 1, { size, w: 800, col: C.navy, a: o.a });
  }
  function note(g, s, x, y, w, o = {}) {
    const size = o.size || 15, lh = size * 1.3, lines = wrap(g, s, x, y, w - 28, { size, w: 700, draw: false });
    card(g, x, y, w, lines.length * lh + 20, { fill: 'rgba(255,250,240,.96)', edge: C.navy, lw: 2, shadow: false, r: 12, a: o.a });
    wrap(g, s, x, y, w - 28, { size, w: 700, lh, valign: 'middle', align: 'center', col: C.navy, a: o.a });
  }

  function ledger(g, cfg, t) {
    card(g, 334, 70, 616, 100, { fill: 'rgba(255,250,240,.95)', edge: C.navy, lw: 2.5, shadow: false });
    text(g, 'Challenges', 38, 46, { align: 'left', size: 13, w: 800, col: C.muted });
    text(g, 'Tools', 38, 94, { align: 'left', size: 13, w: 800, col: C.muted });
    g.strokeStyle = '#e4dac2'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(32, 70); g.lineTo(636, 70); g.stroke();
    let x = 124;
    cfg.challenges.forEach(([n, s, at, o = {}]) => {
      const t0 = when([s, at]); if (t < t0) return;
      const w = chip(g, o.next ? `Next: ${n}` : n, x, 46, { ...(o.next ? TONE.purple : TONE.orange), size: 13, align: 'left', a: ph(t, t0, t0 + .35) });
      x += w + 8;
    });
    x = 124;
    cfg.tools.forEach(([n, s, at, o = {}]) => {
      const t0 = when([s, at]); if (t < t0) return;
      const cut = o.cut && t >= when(o.cut), back = o.back && t >= when(o.back);
      const tone = back ? TONE.gold : cut ? TONE.red : o.spec ? TONE.grey : TONE.green;
      const label = back ? `${n}: now it has a job` : cut ? n : o.spec ? `${n}?` : n;
      const w = chip(g, label, x, 94, { ...tone, size: 13, align: 'left', a: ph(t, t0, t0 + .35) });
      if (cut && !back) { g.strokeStyle = C.redDk || '#8a1c15'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x + 6, 95); g.lineTo(x + w - 6, 95); g.stroke(); }
      x += w + 8;
    });
  }

  function loopPanel(g, cfg, t) {
    const i = Math.min(3, Math.floor(t / PH)), a = t - i * PH, tease = i === 3 && a >= TEASE;
    panel(g, 666, 14, 360, 558, { title: 'The loop (slide 266)' });
    const cx = 846, cy = 222, R = 108;
    STEP.forEach((n, j) => {
      const an = -Math.PI / 2 + j * Math.PI / 2, x = cx + Math.cos(an) * R, y = cy + Math.sin(an) * R;
      const an2 = an + Math.PI / 2, x2 = cx + Math.cos(an2) * R, y2 = cy + Math.sin(an2) * R;
      const lit = (j + 1 === i) || (j === 3 && tease);
      arrow(g, [x, y], [x2, y2], lit ? C.navy : '#b9b09a', lit ? 4 : 3, { pad0: 50, pad1: 50, bend: -34 });
    });
    STEP.forEach((n, j) => {
      const an = -Math.PI / 2 + j * Math.PI / 2, x = cx + Math.cos(an) * R, y = cy + Math.sin(an) * R;
      const on = j === i && !tease, next = j === 0 && tease;
      card(g, x, y, 132, 70, { fill: on ? '#fff3c4' : next ? '#efe6fb' : '#fffaf0', edge: on ? C.gold : next ? '#a77fe0' : '#cdbf9f', lw: on || next ? 4 : 2, shadow: false });
      text(g, String(j + 1), x - 55, y - 23, { size: 13, w: 800, col: C.muted });
      wrap(g, n, x, y, 112, { valign: 'middle', size: 14, w: 800, align: 'center', lh: 17 });
    });
    text(g, tease ? 'Again' : `Step ${i + 1}`, cx, cy, { size: 20, w: 800, display: true, col: tease ? '#4b2286' : C.navy });
    card(g, cx, 432, 336, 132, { fill: tease ? '#efe6fb' : '#fff3c4', edge: tease ? '#a77fe0' : C.gold, lw: 2, shadow: false });
    text(g, tease ? 'Then again: a new challenge' : STEP[i], cx, 380, { size: 12.5, w: 800, col: C.muted });
    wrap(g, tease ? cfg.next : cfg.steps[i], cx, 442, 312, { valign: 'middle', size: 14, w: 700, lh: 17.5, align: 'center', col: C.navy });
    const k = 528;
    text(g, 'A challenge with no tool is a gap.', cx, k, { size: 13, col: C.muted, it: true });
    text(g, 'A tool with no challenge waits to be cut.', cx, k + 20, { size: 13, col: C.muted, it: true });
  }

  // one slide of this page: game + ledger + loop
  function loop(name, cfg) {
    scene(name, {
      dur: PH * 4 + .6,
      draw(g, t) {
        t = Math.min(t, PH * 4 - .01);
        const i = Math.min(3, Math.floor(t / PH)), a = t - i * PH;
        g.save(); g.beginPath(); g.roundRect(14, 14, 640, 558, 12); g.clip();
        g.fillStyle = cfg.bg || '#5c94fc'; g.fillRect(14, 14, 640, 558);
        cfg.game(g, i, a, t, at => t >= when(at));
        ledger(g, cfg, t);
        g.restore();
        loopPanel(g, cfg, t);
      },
      side(t) {
        t = Math.min(t, PH * 4 - .01);
        const i = Math.min(3, Math.floor(t / PH)), a = t - i * PH;
        return { out: i === 3 && a >= TEASE ? `<b>Then again.</b> ${cfg.next}` : `<b>${i + 1}. ${STEP[i]}.</b> ${cfg.steps[i]}` };
      },
    });
  }
  window.PF = { loop, tag, note, PH, TEASE, ph };

  // ---------- Super Mario Bros.: the deck's own example ----------
  const GY = 480;
  function ground(g, gapL, gapR) {
    for (let x = 14; x < 654; x += 32) for (let r = 0; r < 3; r++) {
      if (x + 32 > gapL && x < gapR) continue;
      const y = GY + r * 32; g.fillStyle = '#c84c0c'; g.fillRect(x, y, 32, 32); g.fillStyle = '#fcbcb0'; g.fillRect(x, y, 32, 3); g.fillRect(x, y, 3, 32); g.fillStyle = '#000'; g.fillRect(x + 29, y, 3, 32); g.fillRect(x, y + 29, 32, 3);
    }
  }
  const walk = t => `smb-mario-walk${1 + Math.floor(t * 10) % 3}.png`;
  const say = (g, s, x, y, o = {}) => tag(g, s, x, y, o);
  const huh = (g, x, y) => text(g, '?', x, y, { size: 34, w: 800, col: '#fff', stroke: 5, strokeCol: C.navy });
  loop('challenge-loop', {
    bg: '#5c94fc',
    steps: [
      'A gap in the ground. Mario can only walk, so the gap stops him: the challenge comes before any tool.',
      'Give Mario a jump. The gap now has an answer, and the jump has a reason to exist.',
      'Depth: a running jump clears a wider gap. Breadth: the same jump stomps a Goomba. A fireball goes in too, just in case.',
      'Every challenge here is answered by jumping. Nothing asks for the fireball, so it is cut.',
    ],
    next: 'A Spiny arrives. Stomping it hurts Mario, so the fireball comes back with a job. Start the loop again from step 1.',
    challenges: [['A gap', 0, .3], ['A wider gap', 2, .2], ['A Goomba', 2, .2], ['A Spiny', 3, TEASE, { next: true }]],
    tools: [['Jump', 1, .5], ['Running jump', 2, .4], ['Stomp', 2, 1.6], ['Fireball', 2, 2.8, { spec: true, cut: [3, .6], back: [3, TEASE + 1] }]],
    game(g, i, a, t, on) {
      const wide = i >= 2, gapL = wide ? 270 : 302, gapR = wide ? 430 : i === 0 ? lerp(302, 398, ease(ph(a, .2, .9))) : 398;
      ground(g, gapL, gapR);
      let mx = 120, my = GY, moving = false, jump = false;
      if (i === 0) {
        mx = lerp(80, 284, ph(a, 1, 2.2)); moving = a > 1 && a < 2.2;
        if (a > .5) say(g, 'Challenge: a gap', 350, 300, { a: ph(a, .5, .8) });
        if (a > 2.4) huh(g, mx, GY - 74);
      }
      if (i === 1) {
        mx = lerp(150, 540, ph(a, .7, 3)); moving = a > .7 && a < 3;
        if (mx > 282 && mx < 432) { jump = true; my = GY - Math.sin((mx - 282) / 150 * Math.PI) * 120; }
        if (a > .4) say(g, 'Tool: Jump', 350, 220, { a: ph(a, .4, .7) });
      }
      if (i === 2) {
        // a running jump over the wider gap that lands on the Goomba, then a bounce off it
        mx = lerp(40, 620, ph(a, .3, 3)); moving = a > .3 && a < 3;
        const J0 = 244, J1 = 530, B1 = 600, gx = 530;
        if (mx > J0 && mx < J1) { const u = (mx - J0) / (J1 - J0); jump = true; my = lerp(GY, GY - 30, u) - Math.sin(u * Math.PI) * 150; }
        else if (mx >= J1 && mx < B1) { const u = (mx - J1) / (B1 - J1); jump = true; my = lerp(GY - 30, GY, u) - Math.sin(u * Math.PI) * 60; }
        const squash = mx >= J1;
        pic(g, squash ? 'smb-goomba-flat.png' : 'smb-goomba.png', gx, GY, 40, { px: true, bottom: true });
        if (squash && mx < 620) say(g, 'stomp!', gx, GY - 70);
        if (mx < J0 && a > .3) for (let k = 0; k < 3; k++) { g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 3; g.beginPath(); g.moveTo(mx - 30 - k * 4, GY - 14 - k * 10); g.lineTo(mx - 52 - k * 4, GY - 14 - k * 10); g.stroke(); }
        if (a > 2.8) { pic(g, 'smb-fireball.png', 120, 250, 24, { px: true }); say(g, 'Fireball, just in case', 120, 286, { size: 14 }); }
      }
      if (i === 3) {
        mx = 470;
        if (a < TEASE) {
          pic(g, 'smb-fireball.png', 120, 250, 24, { px: true, a: 1 - ph(a, .4, 1) });
          if (a > .8) note(g, 'Jump, Running jump and Stomp answer every challenge on this stretch. The fireball answers nothing, so it waits.', 334, 240, 460, { a: ph(a, .8, 1.1) });
        } else {
          const sx = lerp(660, 590, ph(a, TEASE, TEASE + 1));
          pic(g, Math.floor(t * 6) % 2 ? 'smb-spiny-step.png' : 'smb-spiny.png', sx, GY, 40, { px: true, bottom: true });
          if (a > TEASE + .5) say(g, 'Spiny: a stomp hurts Mario', 520, 400, { size: 15, a: ph(a, TEASE + .5, TEASE + .8) });
          const fx = 500 + (a - TEASE - 1) * 110; if (a > TEASE + 1 && fx < sx - 14) pic(g, 'smb-fireball.png', fx, GY - 22, 20, { px: true, rot: a * 12 });
        }
      }
      pic(g, jump ? 'smb-mario-jump.png' : moving ? walk(t) : 'smb-mario.png', mx, my, jump || moving ? 54 : 41, { px: true, bottom: true, flip: false });
    },
  });
})();
