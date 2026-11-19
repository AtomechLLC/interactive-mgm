/* Controls as metaphor: three games where the pad stands for the body (DGMS M5, beside Controls as Metaphor).
   grip      Shadow of the Colossus: R1 is the hand. Hold to cling, let go to drop; the grip gauge is a tiring arm.
   straps    Death Stranding: L2 and R2 are the left and right hands on the pack straps.
   katamari  Katamari Damacy: each stick is one hand on the ball, driven like a tank.
   Pip plays the hero in all three. Drain rates, shake times, terrain and item sizes are illustrative. */
(function () {
  const { txt, box, bar, pill, key, clamp, lerp, C, dot, ring, arrow, bubble } = SCN, TAU = SCN.TAU;
  const W = 1040, H = 585;
  const CLIMB = { lean: 10, bl: [40, -30], fl: [70, -10], ba: [150, 175], fa: [165, 190], w: 180 };
  const DANGLE = { lean: -6, bl: [-10, 6], fl: [14, -6], ba: [170, 180], fa: [178, 184], w: 180 };

  /* ---------- Shadow of the Colossus: the button is the hand ---------- */
  SCN.run('grip', s => {
    const GX = 640, FLOOR = 548, GS = 3.3, RATE = .075, DRAIN = .075, LEDGE = [.38, .72], NAMES = ['its hip', 'its shoulder'];
    let z;
    const shakeAt = t => { const c = (t + 1) % 7; return t < 4 ? 0 : c < 1 ? 1 : c < 2.6 ? 2 : 0; };   // 1 = rumble (warning), 2 = shaking
    const api = {
      dur: 34,
      reset() { z = { t: 0, p: 0, grip: 1, hold: false, fall: 0, falls: 0, won: 0, rest: -1, msg: '', why: '' }; },
      step(h) {
        z.t += h; if (z.won) { z.won += h; return; }
        if (z.fall > 0) { z.fall -= h; if (z.fall <= 0) { z.p = 0; z.grip = 1; } return; }
        const sh = shakeAt(z.t);
        const drop = why => { z.fall = 1.3; z.falls++; z.fy = z.p; z.rest = -1; z.why = why; z.msg = why; SCN.noise({ dur: .3, vol: .2 }); };
        if (z.hold) {
          z.rest = -1; z.grip -= h * DRAIN * (sh === 2 ? 2 : 1);
          if (sh !== 2) z.p = Math.min(1, z.p + h * RATE);
          if (z.grip <= 0) { z.grip = 0; return drop('The grip gauge ran dry: Pip\'s arm gave out.'); }
          if (z.p >= 1) { z.won = 1e-6; z.msg = 'At the weak point. Every metre of that climb was your finger on R1.'; SCN.tone({ f: 330, f2: 990, dur: .5, vol: .12 }); }
        } else if (z.p > 0) {
          if (z.rest < 0) { const i = LEDGE.findIndex(l => Math.abs(z.p - l) < .05); if (i >= 0) { z.rest = i; z.p = LEDGE[i]; z.msg = `Standing on ${NAMES[i]}: hand open, grip coming back.`; } else return drop('R1 released on the fur: the hand opened, so Pip dropped.'); }
          if (sh === 2) return drop('It shook while the hand was open.');
          z.grip = Math.min(1, z.grip + h * .5);
        }
      },
      script: [[.8, 1], [2.3, 0], [4, 1], [10.75, 0], [12.6, 1], [21.7, 0], [24.5, 1]].map(([t, v]) => [t, () => { z.hold = !!v; }]),
      caption: t => t < 2.3 ? 'Hold R1 and Pip\'s hand closes on the fur. He climbs for as long as the button is down.'
        : t < 4 ? 'Let go of the button and the hand lets go too. There is no "climb mode" to stay in: the finger is the grip.'
        : t < 10.7 ? 'The pink gauge is a tiring arm. It drains while you hold, and twice as fast when the colossus shakes.'
        : t < 12.6 ? 'On a ledge the hand can open. The gauge refills, and your own finger gets a rest with it.'
        : t < 21.7 ? 'Grip again before the next shake, and hang on through it.'
        : t < 24.5 ? 'Nearly empty. Rest on the shoulder before the last stretch.'
        : t < 29.8 ? 'The player\'s hand and the hero\'s hand do the same thing at the same moment. That is the metaphor.'
        : 'The climb is felt in the finger. One held button carries tension, fatigue and relief.',
      status: () => z.won ? z.msg : z.fall > 0 ? z.why : z.msg || 'Hold R1 (the button, or the R key) to grip and climb. Rest on a ledge by letting go there. Hold on when it shakes.',
      stats: () => `<div><b>${Math.round(z.p * 100)}%</b><span>of the way to the weak point</span></div><div class="${z.grip < .25 ? 'r' : 'y'}"><b>${Math.round(z.grip * 100)}%</b><span>grip left</span></div><div class="r"><b>${z.falls}</b><span>falls</span></div>`,
      acts: { grip(v) { z.hold = !!v; } }, holds: { r: 'grip' },
      draw(g) {
        g.clearRect(0, 0, W, H); g.save(); SCN.clipStage(g, W, H);
        const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#b9c6c9'); sky.addColorStop(1, '#e6e2d0'); g.fillStyle = sky; g.fillRect(0, 0, W, H);
        g.fillStyle = 'rgba(120,135,130,.35)'; g.beginPath(); g.moveTo(0, 420); g.lineTo(140, 300); g.lineTo(300, 430); g.lineTo(430, 340); g.lineTo(560, 450); g.lineTo(W, 380); g.lineTo(W, H); g.lineTo(0, H); g.fill();
        g.fillStyle = '#8f9a72'; g.fillRect(0, FLOOR, W, H - FLOOR); g.fillStyle = '#7c875f'; g.fillRect(0, FLOOR, W, 6);
        const sh = z.won ? 0 : shakeAt(z.t), wob = sh === 2 ? Math.sin(z.t * 26) : sh === 1 ? Math.sin(z.t * 40) * .15 : 0;
        const pose = z.won > .6 ? CAST.mix('idle', 'crumple', clamp((z.won - .6) / 1.5)) : { base: 'idle', lean: 4 + wob * 9, head: wob * 12, ba: [-4 + wob * 30, 14 + wob * 20], fa: [16 - wob * 30, 26] };
        const o = { x: GX + wob * 10, y: FLOOR + 6, s: GS, face: -1, pose };
        CAST.draw(g, 'grub', o);
        const P = CAST.points('grub', o), off = (a, dx, dy) => ({ x: a.x + dx, y: a.y + dy });
        const path = [off(P.footF, 34, -20), off(P.kneeF, 34, 0), off(P.hip, 62, 0), off(P.hip, 76, -70), off(P.sh, 74, 10), off(P.sh, 30, -40), off(P.head, 18, -P.head.r - 4)];
        const at = p => { const f = clamp(p) * (path.length - 1), i = Math.min(path.length - 2, Math.floor(f)), k = f - i; return { x: lerp(path[i].x, path[i + 1].x, k), y: lerp(path[i].y, path[i + 1].y, k) }; };
        // fur along the climb, ledges, weak point
        g.strokeStyle = 'rgba(44,53,18,.55)'; g.lineWidth = 3; for (let i = 0; i <= 40; i++) { const q = at(i / 40); g.beginPath(); g.moveTo(q.x - 8, q.y - 4); g.lineTo(q.x + 4, q.y + 9); g.stroke(); }
        LEDGE.forEach((l, i) => { const q = at(l); box(g, q.x - 6, q.y + 20, 62, 10, { r: 4, fill: '#cfc7a8', stroke: '#6b6648' }); txt(g, 'ledge', q.x + 64, q.y + 26, { size: 13, w: 700, col: '#3d4426' }); });
        const top = at(1); const pulse = .6 + .4 * Math.sin(z.t * 5); dot(g, top.x, top.y + 6, 16 + pulse * 5, `rgba(120,220,255,${.35 * pulse})`); dot(g, top.x, top.y + 6, 9, '#bff2ff'); txt(g, 'weak point', top.x + 60, top.y - 6, { size: 13, w: 800, col: '#1b4a5c', align: 'center' });
        if (sh) pill(g, sh === 1 ? 'it is about to shake' : 'SHAKING: grip drains twice as fast', GX - 60, 40, { size: 16, w: 800, fill: sh === 1 ? C.amber : C.red });
        // Pip
        let q = at(z.p), py = q.y + 84, px = q.x + 20, pp = z.hold ? (sh === 2 ? { base: DANGLE, bl: [-10 + wob * 30, 6 + wob * 30], fl: [14 + wob * 30, -6 + wob * 30] } : CAST.mix(CLIMB, DANGLE, .5 + .5 * Math.sin(z.t * 9))) : 'idle';
        if (z.p <= 0 && z.fall <= 0) { px = at(0).x + 70; py = FLOOR + 6; pp = z.hold ? CLIMB : 'idle'; }
        else if (z.fall > 0) { const k = 1 - z.fall / 1.3, a = at(z.fy); px = a.x + 30 + k * 60; py = Math.min(FLOOR + 6, a.y + 84 + k * k * 700); pp = py >= FLOOR ? 'down' : 'fall'; }
        else if (z.rest >= 0) { py = q.y + 20; px = q.x + 26; }
        if (z.won) { px = top.x + 6; py = top.y + 8; pp = z.won < .5 ? 'windup' : 'crouch'; }
        CAST.draw(g, 'pip', { x: px, y: py, s: .62, face: -1, pose: pp, shadow: z.p <= 0 || z.fall > 0 });
        if (!z.won && z.fall <= 0) { const gx = px + 52, gy = py - 66; dot(g, gx, gy, 19, 'rgba(255,255,255,.75)'); g.strokeStyle = z.grip < .25 ? C.red : C.pink; g.lineWidth = 7; g.beginPath(); g.arc(gx, gy, 14, -Math.PI / 2, -Math.PI / 2 + TAU * z.grip); g.stroke(); txt(g, 'grip', gx, gy + 31, { size: 12, w: 800, col: C.ink, align: 'center' }); }
        // the pad and the hand, side by side
        box(g, 20, 20, 300, 214, { r: 14, fill: 'rgba(255,252,244,.94)', stroke: C.navy, lw: 3 });
        txt(g, 'YOUR FINGER', 90, 44, { size: 13, w: 800, col: C.muted, align: 'center' }); txt(g, 'PIP\'S HAND', 242, 44, { size: 13, w: 800, col: C.muted, align: 'center' });
        key(g, 'R1', 90, 100, { w: 96, h: 62, size: 28, down: z.hold, col: C.pink });
        txt(g, '=', 166, 100, { size: 34, w: 800, align: 'center', col: C.ink, display: true });
        // hand: open fingers or a fist round a tuft of fur
        const hx = 242, hy = 104; g.strokeStyle = '#2c3512'; g.lineWidth = 5; [-12, 0, 12].forEach(dx => { g.beginPath(); g.moveTo(hx + dx, hy - 44); g.lineTo(hx + dx + 3, hy + 44); g.stroke(); });
        g.fillStyle = '#f2c79a'; g.strokeStyle = C.navy; g.lineWidth = 3;
        if (z.hold) { g.beginPath(); g.roundRect(hx - 30, hy - 22, 60, 44, 16); g.fill(); g.stroke(); [-18, -6, 6, 18].forEach(dx => { g.beginPath(); g.moveTo(hx + dx - 6, hy - 22); g.lineTo(hx + dx - 6, hy - 2); g.stroke(); }); }
        else { g.beginPath(); g.roundRect(hx + 22, hy - 16, 36, 40, 12); g.fill(); g.stroke(); [-14, -5, 4, 13].forEach((dy, i) => { g.beginPath(); g.roundRect(hx + 46, hy + dy - 3, 26 + (i === 1 ? 6 : 0), 8, 4); g.fill(); g.stroke(); }); }
        txt(g, z.hold ? 'held: fingers closed' : 'released: hand open', 170, 160, { size: 16, w: 800, align: 'center', col: z.hold ? C.pink : C.ink });
        bar(g, 40, 184, 260, 16, z.grip, { col: z.grip < .25 ? C.red : C.pink }); txt(g, 'grip gauge', 40, 216, { size: 13, w: 700, col: C.muted }); txt(g, z.hold ? (sh === 2 ? 'draining fast' : 'draining') : z.rest >= 0 ? 'recovering' : '', 300, 216, { size: 13, w: 800, col: z.hold ? C.red : C.green, align: 'right' });
        if (z.fall > 0 && z.fall < 1.1) bubble(g, 'Let go, and you fall.', px, Math.min(py - 60, FLOOR - 70), { size: 16, W });
        if (z.won > .5) pill(g, 'weak point struck', top.x - 20, top.y - 60, { size: 20, w: 800, fill: '#1b6f8c' });
        g.restore();
      },
    };
    return api;
  });

  /* ---------- Death Stranding: one trigger per hand ---------- */
  SCN.run('straps', s => {
    const FLOOR = 470, BUMPS = [3.2, 6.1, 9.3, 11.8, 14.6, 17.2, 19.9, 22.4, 25.3, 28.2, 31, 34.1], DIR = [1, -1, 1, 1, -1, 1, -1, -1, 1, -1, 1, -1];
    let z;
    const api = {
      dur: 30,
      reset(tour) { z = { t: 0, th: 0, om: 0, L: false, R: false, d: 0, down: 0, spills: 0, auto: tour ? 'none' : null, msg: '', bi: 0 }; },
      step(h) {
        z.t += h; if (z.down > 0) { z.down -= h; if (z.down <= 0) { z.th = 0; z.om = 0; } return; }
        if (z.auto === 'react') { z.L = z.th > .12 || (z.th > 0 && z.om > .25); z.R = z.th < -.12 || (z.th < 0 && z.om < -.25); }
        if (z.auto === 'both') z.L = z.R = true;
        if (z.auto === 'none') z.L = z.R = false;
        const both = z.L && z.R, sp = both ? .45 : 1;
        z.d += h * sp * 1.4;
        const u = z.d % 36 / 1.4; const bi = BUMPS.findIndex((b, i) => i >= 0 && Math.abs(u - b) < .02 * sp + h);   // a rock underfoot knocks the load one way
        if (bi >= 0 && bi !== z.lastB) { z.lastB = bi; z.om += DIR[bi] * (both ? .5 : 1.25); } if (bi < 0) z.lastB = -1;
        const pull = both ? 0 : (z.L ? -2.6 : 0) + (z.R ? 2.6 : 0);
        z.om += h * (2.0 * z.th + pull - (both ? 5 : .5) * z.om); z.th += h * z.om; if (both) z.th -= h * z.th * 1.6;
        if (Math.abs(z.th) >= 1) { z.down = 1.8; z.spills++; z.msg = `The load went over to the ${z.th > 0 ? 'right' : 'left'}. A pull on the ${z.th > 0 ? 'left' : 'right'} strap would have caught it.`; SCN.noise({ dur: .4, vol: .25 }); }
      },
      script: [[9.5, () => { z.auto = 'react'; z.th = 0; z.om = 0; z.down = 0; }], [21, () => { z.auto = 'both'; }]],
      caption: t => t < 4 ? 'Pip carries a tall load over rough ground. Every rock underfoot tips it left or right.'
        : t < 9.5 ? 'With both hands off the straps, the lean feeds itself and the cargo goes over.'
        : t < 21 ? 'L2 is the left hand, R2 is the right hand. Load tipping right? Squeeze L2: the left hand hauls it back. The mapping is the body.'
        : 'Squeeze both and Pip braces with both hands. The load stays put, and he walks at less than half speed. Safety has a price too.',
      status: () => z.down > 0 ? z.msg : z.L && z.R ? 'Both hands on the straps: steady, and slow.' : z.L ? 'Left hand pulling: the load comes back to the left.' : z.R ? 'Right hand pulling: the load comes back to the right.' : 'Hold L2 (the button, or A) and R2 (or D). Pull the strap opposite the lean; hold both to brace.',
      stats: () => `<div><b>${Math.round(z.d)} m</b><span>carried</span></div><div class="r"><b>${z.spills}</b><span>spills</span></div><div class="y"><b>${z.L && z.R ? '45%' : '100%'}</b><span>walking speed</span></div>`,
      acts: { L(v) { z.auto = null; z.L = !!v; }, R(v) { z.auto = null; z.R = !!v; } }, holds: { a: 'L', d: 'R' },
      draw(g) {
        g.clearRect(0, 0, W, H); g.save(); SCN.clipStage(g, W, H);
        const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#8b98a3'); sky.addColorStop(1, '#c9cdc4'); g.fillStyle = sky; g.fillRect(0, 0, W, H);
        g.fillStyle = 'rgba(70,84,90,.45)'; g.beginPath(); g.moveTo(0, 360); g.lineTo(120, 230); g.lineTo(260, 340); g.lineTo(400, 200); g.lineTo(560, 350); g.lineTo(620, 300); g.lineTo(620, H); g.lineTo(0, H); g.fill();
        g.fillStyle = '#566246'; g.fillRect(0, FLOOR, 620, H - FLOOR); g.fillStyle = '#3f4a33'; g.fillRect(0, FLOOR, 620, 6);
        const scroll = z.d * 60; for (let i = 0; i < 12; i++) { const wx = BUMPS[i] * 1.4 * 60, x = ((wx - scroll + 260) % (36 * 60) + 36 * 60) % (36 * 60) - 200; if (x < 640) { g.fillStyle = '#7d8672'; g.beginPath(); g.ellipse(x, FLOOR + 2, 26, 14, 0, Math.PI, 0); g.fill(); } }
        g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 1.5; for (let i = 0; i < 40; i++) { const x = (i * 97 + z.t * 90) % 640, y = (i * 53 + z.t * 420) % FLOOR; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 5, y + 16); g.stroke(); }
        const downK = z.down > 0 ? clamp((1.8 - z.down) / .4) : 0, both = z.L && z.R;
        const px = 300, pose = z.down > 0 ? CAST.mix('idle', 'crumple', downK) : { base: CAST.cycle('walk', z.d * .9), lean: 12, ba: [30, 110], fa: [40, 120] };
        // the stack on his back (side view): it wobbles with the lean
        g.save(); g.translate(px - 42, FLOOR - 96); g.scale(1.4, 1.4); g.rotate((-.08 + Math.abs(z.th) * .12 + downK * 1.2)); [['#d9a441', 46, 34], ['#c7c9cc', 44, 30], ['#d9a441', 40, 28], ['#3b5b8c', 36, 26]].forEach(([c, w, hh], i) => { const y = -i * 31; box(g, -w / 2, y - hh, w, hh, { r: 4, fill: c, stroke: C.navy, lw: 2.5 }); }); g.restore();
        CAST.draw(g, 'pip', { x: px, y: FLOOR + 6, s: 1.55, pose, weapon: null });
        txt(g, `${Math.round(z.d)} m`, 30, 40, { size: 30, w: 800, col: '#fff', display: true }); txt(g, both ? 'braced: slow and steady' : 'walking', 30, 68, { size: 15, w: 700, col: '#eef' });
        // from behind: the pack, two straps, two hands, two triggers
        const bx = 830, by = 430; box(g, 632, 14, 394, H - 28, { r: 14, fill: 'rgba(255,252,244,.95)', stroke: C.navy, lw: 3 });
        txt(g, 'FROM BEHIND', bx, 38, { size: 13, w: 800, col: C.muted, align: 'center' });
        key(g, 'L2', 690, 84, { w: 84, h: 56, size: 24, down: z.L, col: C.blue }); key(g, 'R2', 970, 84, { w: 84, h: 56, size: 24, down: z.R, col: C.amber });
        txt(g, 'left hand', 690, 130, { size: 14, w: 800, col: C.blue, align: 'center' }); txt(g, 'right hand', 970, 130, { size: 14, w: 800, col: C.amber, align: 'center' });
        const ang = (z.down > 0 ? Math.sign(z.th) * (1 + downK * .5) : z.th) * .5;
        // tilt scale
        g.strokeStyle = '#cdbf9f'; g.lineWidth = 10; g.beginPath(); g.arc(bx, by - 60, 250, -Math.PI / 2 - .5, -Math.PI / 2 + .5); g.stroke();
        g.strokeStyle = C.red; [-1, 1].forEach(sg => { g.beginPath(); g.arc(bx, by - 60, 250, -Math.PI / 2 + sg * .5 - (sg > 0 ? .1 : 0), -Math.PI / 2 + sg * .5 + (sg > 0 ? 0 : .1)); g.stroke(); });
        dot(g, bx + Math.sin(ang) * 250, by - 60 - Math.cos(ang) * 250, 9, Math.abs(z.th) > .7 ? C.red : C.navy);
        // legs, body, head
        g.strokeStyle = '#152044'; g.lineWidth = 16; g.lineCap = 'round'; g.beginPath(); g.moveTo(bx - 20, by + 20); g.lineTo(bx - 24, by + 110); g.moveTo(bx + 20, by + 20); g.lineTo(bx + 24, by + 110); g.stroke();
        box(g, bx - 46, by - 70, 92, 100, { r: 20, fill: '#2ea3dc', stroke: '#152044', lw: 4 }); dot(g, bx, by - 96, 28, '#2ea3dc'); ring(g, bx, by - 96, 28, '#152044', 4);
        g.save(); g.translate(bx, by + 10); g.rotate(ang);
        box(g, -52, -110, 104, 112, { r: 12, fill: '#5d618c', stroke: C.navy, lw: 4 });
        [['#d9a441', 112, 54], ['#c7c9cc', 100, 48], ['#d9a441', 92, 44], ['#3b5b8c', 80, 40]].forEach(([c, w, hh], i) => { const y = -112 - [0, 54, 102, 146][i]; box(g, -w / 2, y - hh, w, hh, { r: 6, fill: c, stroke: C.navy, lw: 3 }); g.strokeStyle = 'rgba(21,32,68,.4)'; g.lineWidth = 3; g.beginPath(); g.moveTo(-w / 2 + 8, y - hh / 2); g.lineTo(w / 2 - 8, y - hh / 2); g.stroke(); });
        const sl = { x: -52, y: -90 }, sr = { x: 52, y: -90 }; g.restore();
        // straps from the pack's top corners down to the hands
        const rot = (p) => ({ x: bx + p.x * Math.cos(ang) - p.y * Math.sin(ang), y: by + 10 + p.x * Math.sin(ang) + p.y * Math.cos(ang) });
        [[rot(sl), { x: bx - 78, y: by - 6 }, z.L, C.blue], [rot(sr), { x: bx + 78, y: by - 6 }, z.R, C.amber]].forEach(([a, hnd, on, col]) => {
          g.strokeStyle = on ? col : '#8d8fa6'; g.lineWidth = on ? 8 : 5; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(hnd.x, hnd.y); g.stroke();
          g.strokeStyle = '#152044'; g.lineWidth = 12; g.beginPath(); g.moveTo(bx + Math.sign(hnd.x - bx) * 44, by - 50); g.lineTo(hnd.x, hnd.y + 4); g.stroke();
          dot(g, hnd.x, hnd.y, on ? 13 : 15, on ? col : '#f2c79a'); ring(g, hnd.x, hnd.y, on ? 13 : 15, '#152044', 3);
          txt(g, on ? 'gripping' : 'open', hnd.x + Math.sign(hnd.x - bx) * 56, hnd.y, { size: 14, w: 800, col: on ? col : C.muted, align: 'center' });
        });
        if (z.down > 0) pill(g, 'cargo spilled', bx, 250, { size: 20, w: 800, fill: C.red });
        else if (Math.abs(z.th) > .25 && !both) { const right = z.th > 0; pill(g, right ? 'tipping right: pull with the LEFT hand' : 'tipping left: pull with the RIGHT hand', bx, 168, { size: 14, w: 800, fill: (right ? z.L : z.R) ? C.green : C.red }); }
        g.restore();
      },
    };
    return api;
  });

  /* ---------- Katamari Damacy: one stick per hand ---------- */
  SCN.run('katamari', s => {
    const FW = 700, rnd0 = () => SCN.rng(5);
    const KIND = [['#e5322d', 8], ['#e0a92d', 11], ['#2fae63', 14], ['#8a4fd6', 19], ['#2ea3dc', 26], ['#d0574f', 36]];
    let z;
    const api = {
      dur: 26,
      reset() { const r = rnd0(); z = { t: 0, x: 120, y: 470, a: -Math.PI / 2, r: 26, spin: 0, lu: 0, ld: 0, ru: 0, rd: 0, got: 0, items: Array.from({ length: 46 }, (_, i) => { const k = KIND[Math.min(5, Math.floor(r() * r() * 6.5))]; return { x: 40 + r() * (FW - 80), y: 40 + r() * (H - 80), col: k[0], sz: k[1], on: false, sa: r() * TAU, sr: r() }; }).filter(it => Math.hypot(it.x - 120, it.y - 470) > 80), msg: '' }; },
      step(h) {
        z.t += h; const L = z.lu - z.ld, R = z.ru - z.rd, v = (L + R) / 2 * 185, w = (L - R) * 1.5;
        z.a += w * h; z.x = clamp(z.x + Math.cos(z.a) * v * h, z.r + 6, FW - z.r - 6); z.y = clamp(z.y + Math.sin(z.a) * v * h, z.r + 6, H - z.r - 6); z.spin += v * h / z.r;
        z.items.forEach(it => { if (!it.on && Math.hypot(it.x - z.x, it.y - z.y) < z.r + it.sz * .4) { if (it.sz <= z.r * .62) { it.on = true; z.got++; z.r += it.sz * .12; SCN.tone({ f: 500 + z.got * 14, dur: .07, vol: .06 }); } else { z.x -= Math.cos(z.a) * v * h * 1.5; z.y -= Math.sin(z.a) * v * h * 1.5; z.msg = 'Too big to pick up yet: roll up smaller things first.'; } } });
      },
      script: [[.6, 'lu1 ru1'], [3, 'ru0'], [4.2, 'ru1'], [6.6, 'lu0'], [7.7, 'lu1'], [10, 'lu0 ru0'], [10.4, 'lu1 rd1'], [11.5, 'lu0 rd0'], [11.8, 'lu1 ru1'], [15, 'lu0 ru0'], [15.3, 'ld1 rd1'], [16.4, 'ld0 rd0'], [16.7, 'ld1 ru1'], [17.6, 'ld0 ru0'], [17.9, 'lu1 ru1'], [20.3, 'ru0'], [21.3, 'ru1'], [24.5, 'lu0 ru0']]
        .map(([t, a]) => [t, () => a.split(' ').forEach(c => { z[c.slice(0, 2)] = +c[2]; })]),
      caption: t => t < 3 ? 'Each stick is one of the Prince\'s hands on the ball. Both hands push: the ball rolls straight ahead.'
        : t < 10 ? 'Push with one hand only and the ball swings round the idle hand, the way a wheelbarrow or a shopping trolley turns.'
        : t < 11.8 ? 'One hand forward and one back: the Prince spins the ball on the spot.'
        : t < 16.5 ? 'Nobody needs a tutorial for long. You already know how two hands push a heavy ball.'
        : t < 18 ? 'Both back pulls it backward. The whole control scheme is the two hands.'
        : 'Two sticks, no buttons, and the pad has become a body. Small things stick first, so the ball grows into the bigger ones.',
      status: () => { const L = z.lu - z.ld, R = z.ru - z.rd; return L > 0 && R > 0 ? 'Both hands push: straight ahead.' : L < 0 && R < 0 ? 'Both hands pull: backward.' : L && R && L !== R ? 'Hands in opposite directions: spin on the spot.' : L || R ? `Only the ${L ? 'left' : 'right'} hand: the ball arcs to the ${L > 0 || R < 0 ? 'right' : 'left'}.` : z.msg || 'Left stick: W and S. Right stick: I and K. Or hold the buttons. Push both to roll.'; },
      stats: () => `<div><b>${z.got}</b><span>things rolled up</span></div><div class="y"><b>${(z.r / 26 * 10).toFixed(0)} cm</b><span>ball size</span></div>`,
      acts: { lu(v) { z.lu = +!!v; }, ld(v) { z.ld = +!!v; }, ru(v) { z.ru = +!!v; }, rd(v) { z.rd = +!!v; } }, holds: { w: 'lu', s: 'ld', i: 'ru', k: 'rd' },
      draw(g) {
        g.clearRect(0, 0, W, H); g.save(); SCN.clipStage(g, W, H);
        g.fillStyle = '#cfe6a8'; g.fillRect(0, 0, FW, H); g.fillStyle = 'rgba(255,255,255,.22)'; for (let i = 0; i < 8; i++) for (let j = 0; j < 7; j++) if ((i + j) % 2) g.fillRect(i * 100, j * 100, 100, 100);
        const shape = (it, x, y, k = 1) => { g.fillStyle = it.col; g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); if (it.sz < 12) g.arc(x, y, it.sz * k, 0, TAU); else if (it.sz < 20) g.roundRect(x - it.sz * k, y - it.sz * k * .7, it.sz * 2 * k, it.sz * 1.4 * k, 4); else { for (let i = 0; i < 5; i++) { const a = it.sa + i / 5 * TAU; g.lineTo(x + Math.cos(a) * it.sz * k, y + Math.sin(a) * it.sz * k); } g.closePath(); } g.fill(); g.stroke(); };
        z.items.filter(it => !it.on).forEach(it => shape(it, it.x, it.y));
        // the Prince and his two hands
        const L = z.lu - z.ld, R = z.ru - z.rd, bx = z.x - Math.cos(z.a) * (z.r + 30), by = z.y - Math.sin(z.a) * (z.r + 30), nx = -Math.sin(z.a), ny = Math.cos(z.a);
        [[-1, L, C.blue], [1, R, C.amber]].forEach(([sd, on, col]) => { const hx = z.x - Math.cos(z.a) * z.r * .86 + nx * sd * z.r * .5, hy = z.y - Math.sin(z.a) * z.r * .86 + ny * sd * z.r * .5; g.strokeStyle = on ? col : '#3c6a3a'; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); g.moveTo(bx + nx * sd * 11, by + ny * sd * 11); g.lineTo(hx, hy); g.stroke(); dot(g, hx, hy, 8, on ? col : '#3c6a3a'); });
        dot(g, bx, by, 17, '#59b24a'); ring(g, bx, by, 17, C.navy, 3); g.save(); g.translate(bx, by); g.rotate(z.a); box(g, -8, -24, 16, 48, { r: 6, fill: '#8a4fd6', stroke: C.navy, lw: 2.5 }); g.restore();
        // the ball with what it has picked up
        dot(g, z.x + 4, z.y + 6, z.r, 'rgba(0,0,0,.15)'); dot(g, z.x, z.y, z.r, '#e86fa8'); ring(g, z.x, z.y, z.r, C.navy, 3);
        for (let i = 0; i < 9; i++) { const a = z.spin + i / 9 * TAU; dot(g, z.x + Math.cos(a) * z.r * .62 * Math.cos(z.a) - Math.sin(a) * 0, z.y + Math.sin(a * 1.0) * z.r * .62, z.r * .13, '#f6a8cd'); }
        z.items.filter(it => it.on).slice(-26).forEach(it => { const a = it.sa + z.spin * .6; shape(it, z.x + Math.cos(a) * z.r * (.5 + it.sr * .5), z.y + Math.sin(a) * z.r * (.5 + it.sr * .5), .7); });
        // the two sticks
        box(g, FW + 12, 14, W - FW - 26, H - 28, { r: 14, fill: 'rgba(255,252,244,.96)', stroke: C.navy, lw: 3 });
        [[FW + 96, 'LEFT STICK', 'left hand', L, C.blue, 'W', 'S'], [FW + 246, 'RIGHT STICK', 'right hand', R, C.amber, 'I', 'K']].forEach(([cx, t1, t2, v, col, ku, kd]) => {
          txt(g, t1, cx, 44, { size: 13, w: 800, col: C.muted, align: 'center' }); txt(g, '= ' + t2, cx, 64, { size: 16, w: 800, col, align: 'center' });
          dot(g, cx, 150, 56, '#e3dccb'); ring(g, cx, 150, 56, C.navy, 3); dot(g, cx, 150 - v * 30, 32, v ? col : '#8d8fa6'); ring(g, cx, 150 - v * 30, 32, C.navy, 3);
          txt(g, ku, cx, 150 - v * 30 - 9, { size: 13, w: 800, col: '#fff', align: 'center' }); txt(g, kd, cx, 150 - v * 30 + 11, { size: 13, w: 800, col: '#fff', align: 'center' });
        });
        const mv = L > 0 && R > 0 ? ['both push', 'roll ahead'] : L < 0 && R < 0 ? ['both pull', 'roll back'] : L && R ? ['one each way', 'spin on the spot'] : L || R ? ['one hand', 'arc round the other'] : ['hands off', 'the ball rests'];
        txt(g, mv[0], FW + 171, 252, { size: 15, w: 700, col: C.muted, align: 'center' }); txt(g, mv[1], FW + 171, 280, { size: 23, w: 800, align: 'center', display: true });
        [['both forward', 'roll ahead', 1, 1], ['one forward', 'arc', 1, 0], ['opposite', 'spin', 1, -1], ['both back', 'reverse', -1, -1]].forEach(([a, b, l, r], i) => { const y = 330 + i * 54, on = Math.sign(L) === l && Math.sign(R) === r || (i === 1 && !!L !== !!R) || (i === 2 && L && R && L !== R);
          box(g, FW + 30, y, 282, 46, { r: 10, fill: on ? '#fde9b8' : '#fffaf0', stroke: on ? C.amber : '#cdbf9f' });
          [[l, C.blue, 0], [r, C.amber, 1]].forEach(([d, col, j]) => { const ax = FW + 54 + j * 26; if (d) arrow(g, ax, y + 23 + d * 12, ax, y + 23 - d * 12, { col, lw: 5, head: 10 }); else dot(g, ax, y + 23, 5, '#8d8fa6'); });
          txt(g, a, FW + 110, y + 16, { size: 14, w: 700, col: C.muted }); txt(g, b, FW + 110, y + 33, { size: 16, w: 800 }); });
        g.restore();
      },
    };
    return api;
  });
})();
