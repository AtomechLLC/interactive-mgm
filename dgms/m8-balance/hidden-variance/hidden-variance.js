/* Dice that are kinder than they say (DGMS M8), beside the luck and input randomness pages.
   truehit  GBA Fire Emblem rolls two numbers from 0 to 99 and averages them, so a displayed 80 lands about 92% of
            the time and a displayed 30 about 18%. Pip and Rook trade blows; the real portraits sit in the forecast.
   streak   XCOM: Enemy Unknown on its lower difficulties quietly adds to your aim after each miss in a row. Kit
            shoots at Grub; the strip shows the number on screen, the number really rolled against, and the roll.
   The two-number rule and its percentages are exact. The XCOM bonus (15 points per miss in a row on shots shown at
   50% or more, capped here at 30) follows the game's Normal settings as reported by players reading its files. */
(function () {
  const { txt, box, bar, pill, clamp, lerp, C, dot, ring, wrap } = SCN, TAU = SCN.TAU;
  const W = 1040, H = 585, IMG = new URL('img/', document.currentScript.src).href;
  const TRUE2 = []; for (let h = 0; h <= 100; h++) { let n = 0; for (let a = 0; a < 100; a++) for (let b = 0; b < 100; b++) if (Math.floor((a + b) / 2) < h) n++; TRUE2[h] = n / 100; }

  /* ---------------- Fire Emblem: two dice, averaged ---------------- */
  SCN.run('truehit', s => {
    const FLOOR = 262, PX = 400, RXX = 640, SW = 1.25;
    let z, hit = 80, dice = 2, who = 'pip', rnd;
    const slider = () => s.querySelector('input[data-rng="hit"]'), setHit = v => { hit = v; const r = slider(); if (r) { r.value = v; const b = r.closest('label')?.querySelector('b'); if (b) b.textContent = v; } };
    const truth = () => dice === 2 ? TRUE2[hit] : hit;
    function roll() { const a = Math.floor(rnd() * 100), b = Math.floor(rnd() * 100), v = dice === 2 ? Math.floor((a + b) / 2) : a; return { a, b, v, hit: v < hit }; }
    function tally(r) { z.n++; if (r.hit) z.h++; z.hist.push(r.hit); if (z.hist.length > 60) z.hist.shift(); }
    const clear = () => { z.n = 0; z.h = 0; z.hist = []; z.sw = null; z.wait = .5; };
    const api = {
      dur: 33,
      reset(tour) { rnd = SCN.rng(tour ? 12 : 7 + Math.floor(performance.now()) % 999); if (tour) { dice = 2; who = 'pip'; setHit(80); api.mark('dice', 2); api.mark('who', 'pip'); } z = { t: 0, auto: true }; clear(); },
      step(h) {
        z.t += h;
        if (z.sw) { const w = z.sw; w.t += h; if (!w.done && w.t > .5) { w.done = true; tally(w.r); if (w.r.hit) SCN.noise({ dur: .12, cut: 1500, vol: .25 }); else SCN.tone({ f: 500, f2: 250, dur: .15, vol: .06 }); } if (w.t > SW) z.sw = null; }
        else if (z.auto) { z.wait -= h; if (z.wait <= 0) { z.sw = { t: 0, r: roll() }; z.wait = .15; } }
      },
      script: [[11, () => { who = 'rook'; api.mark('who', 'rook'); setHit(30); clear(); }], [21, () => { who = 'pip'; api.mark('who', 'pip'); dice = 1; api.mark('dice', 1); setHit(80); clear(); }]],
      caption: t => t < 5 ? 'The forecast says Pip hits 80 times in 100. Behind the screen, the game rolls two numbers from 0 to 99 and averages them. Pip hits if the average is under 80.'
        : t < 11 ? 'An average of two rolls bunches up around 50, so it is rarely above 80. The shot that says 80 really lands 92 times in 100.'
        : t < 16 ? 'It bends the other way for low numbers. Rook\'s 30 is really 18.'
        : t < 21 ? 'So likely things happen more than the screen says, and unlikely things happen less. Your army is mostly on the high side of that curve.'
        : t < 27 ? 'Here is the same 80 with one honest roll. One swing in five misses, and it feels like the game is cheating.'
        : 'Players read 80 as "nearly always". Fire Emblem did not fix the players. It changed the dice to agree with them, and kept the number.',
      status: () => `Shown ${hit}, really ${truth().toFixed(1)}. Drag the slider, or swing a hundred times and compare.`,
      stats: () => `<div><b>${hit}%</b><span>the hit chance on screen</span></div><div class="${Math.abs(truth() - hit) < .05 ? '' : truth() > hit ? 'g' : 'r'}"><b>${truth().toFixed(1)}%</b><span>how often it really lands</span></div><div class="y"><b>${z.n ? Math.round(z.h / z.n * 100) + '%' : 'n/a'}</b><span>${z.h} of ${z.n} swings landed so far</span></div>`,
      acts: { one() { z.auto = false; if (!z.sw) z.sw = { t: 0, r: roll() }; }, hundred() { z.auto = false; for (let i = 0; i < 100; i++) tally(roll()); }, auto() { z.auto = true; } }, keys: { j: 'one', k: 'hundred' },
      set(k, v) { if (k === 'hit') hit = +v; if (k === 'dice') dice = +v; if (k === 'who') { who = v; } },
      draw(g) {
        g.clearRect(0, 0, W, H); g.save(); SCN.clipStage(g, W, H);
        const sky = g.createLinearGradient(0, 0, 0, FLOOR); sky.addColorStop(0, '#8fd0f5'); sky.addColorStop(1, '#dff3d0'); g.fillStyle = sky; g.fillRect(0, 0, W, FLOOR);
        g.fillStyle = '#9fcf86'; g.beginPath(); g.moveTo(0, FLOOR - 50); g.quadraticCurveTo(260, FLOOR - 110, 520, FLOOR - 56); g.quadraticCurveTo(800, FLOOR - 10, 1040, FLOOR - 80); g.lineTo(1040, FLOOR); g.lineTo(0, FLOOR); g.fill();
        g.fillStyle = '#6fb35a'; g.fillRect(0, FLOOR, W, 34); g.fillStyle = '#5a9a48'; g.fillRect(0, FLOOR, W, 4);
        const w = z.sw, k = w ? w.t : 0, atkPip = who === 'pip', landed = w && w.done && w.r.hit, missed = w && w.done && !w.r.hit;
        const atkPose = !w ? 'guard' : k < .35 ? CAST.mix('guard', 'windup', k / .35) : k < .5 ? CAST.mix('windup', 'strike', (k - .35) / .15) : k < .8 ? 'follow' : 'guard';
        const defPose = landed && k < 1 ? 'hit' : missed && k < 1 ? 'crouch' : 'guard';
        const lunge = w && k > .35 && k < .9 ? 70 : 0;
        CAST.draw(g, 'pip', { x: PX + (atkPip ? lunge : missed ? -30 : 0), y: FLOOR, pose: atkPip ? atkPose : defPose, flash: !atkPip && landed && k < .65 ? 1 : 0 });
        CAST.draw(g, 'rook', { x: RXX - (atkPip ? (missed ? -30 : 0) : lunge), y: FLOOR, face: -1, pose: atkPip ? defPose : atkPose, flash: atkPip && landed && k < .65 ? 1 : 0 });
        if (w && w.done && k < 1.1) txt(g, w.r.hit ? 'HIT' : 'MISS', (atkPip ? RXX : PX) + (atkPip ? 10 : -10), FLOOR - 160 - (k - .5) * 30, { size: 30, w: 800, display: true, align: 'center', col: w.r.hit ? '#fff' : '#ffe08a', halo: C.navy, haloW: 6 });
        // forecast panels with the real portraits
        const panel = (x, name, cast, im, on, label, val) => { box(g, x, 14, 232, 150, { r: 10, fill: on ? '#2b3f9c' : '#5b678f', stroke: on ? C.gold : '#c9cfe6', lw: on ? 4 : 2 });
          box(g, x + 10, 24, 108, 90, { r: 6, fill: '#cfe3b6' }); const p = SCN.img(IMG + im); if (p) { g.save(); g.imageSmoothingEnabled = false; g.drawImage(p, x + 10, 24, 108, 90); g.restore(); }
          txt(g, name, x + 128, 40, { size: 20, w: 800, col: '#fff', display: true }); txt(g, 'played by ' + cast, x + 128, 62, { size: 12, w: 700, col: '#c9d3ff' });
          txt(g, label, x + 128, 92, { size: 13, w: 800, col: '#ffe08a' }); txt(g, val, x + 14, 138, { size: 26, w: 800, col: on ? '#fff' : '#c9cfe6', display: true }); };
        panel(14, 'Lyn', 'Pip', 'lyn.png', atkPip, atkPip ? 'attacking' : 'defending', atkPip ? 'HIT  ' + hit : 'HIT  --'); panel(W - 246, 'Batta', 'Rook', 'batta.png', !atkPip, atkPip ? 'defending' : 'attacking', atkPip ? 'HIT  --' : 'HIT  ' + hit);
        // the dice behind the screen
        const dx = 520, spin = w && !w.done, show = w ? w.r : null, num = i => spin ? Math.floor((z.t * 977 + i * 631) % 100) : show ? (i ? show.b : show.a) : '--';
        txt(g, dice === 2 ? 'behind the screen: two rolls, averaged' : 'behind the screen: one roll', dx, 26, { size: 13, w: 800, col: C.navy, align: 'center' });
        const die = (x, v, dim) => { box(g, x - 34, 40, 68, 54, { r: 10, fill: dim ? 'rgba(255,255,255,.4)' : '#fff', stroke: C.navy, lw: 3 }); txt(g, String(v).padStart(2, '0'), x, 68, { size: 28, w: 800, align: 'center', display: true, col: dim ? '#9aa0bd' : C.navy }); };
        if (dice === 2) { die(dx - 44, num(0)); die(dx + 44, num(1)); } else die(dx, num(0));
        if (show && w.done) { const m = dice === 2 ? `average ${show.v}` : `rolled ${show.v}`; pill(g, `${m}  ${show.hit ? '<' : '≥'}  ${hit}`, dx, 118, { size: 16, w: 800, fill: show.hit ? C.green : '#b26a00' }); }
        // lower panel: the curve and the tally
        g.fillStyle = 'rgba(255,252,244,.97)'; g.fillRect(0, FLOOR + 34, W, H);
        const cx = 70, cy = FLOOR + 62, cw = 400, ch = 196, X = v => cx + v / 100 * cw, Y = v => cy + ch - v / 100 * ch;
        box(g, cx, cy, cw, ch, { r: 0, fill: '#fff', stroke: C.line, lw: 2 }); g.strokeStyle = 'rgba(20,26,54,.08)'; g.lineWidth = 1; for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(X(i * 25), cy); g.lineTo(X(i * 25), cy + ch); g.moveTo(cx, Y(i * 25)); g.lineTo(cx + cw, Y(i * 25)); g.stroke(); }
        [0, 50, 100].forEach(v => { txt(g, v, X(v), cy + ch + 13, { size: 12, w: 700, col: C.muted, align: 'center' }); txt(g, v, cx - 8, Y(v), { size: 12, w: 700, col: C.muted, align: 'right' }); });
        txt(g, 'the number on screen', cx + cw / 2, cy + ch + 30, { size: 12, w: 800, col: C.muted, align: 'center' }); g.save(); g.translate(cx - 40, cy + ch / 2); g.rotate(-Math.PI / 2); txt(g, 'how often it really lands', 0, 0, { size: 12, w: 800, col: C.muted, align: 'center' }); g.restore();
        g.strokeStyle = dice === 1 ? C.blue : '#b9bdd3'; g.lineWidth = dice === 1 ? 4 : 2; g.setLineDash(dice === 1 ? [] : [6, 5]); g.beginPath(); g.moveTo(X(0), Y(0)); g.lineTo(X(100), Y(100)); g.stroke(); g.setLineDash([]);
        g.strokeStyle = dice === 2 ? C.red : '#e6b9b7'; g.lineWidth = dice === 2 ? 4 : 2; g.beginPath(); for (let v = 0; v <= 100; v++) { v ? g.lineTo(X(v), Y(TRUE2[v])) : g.moveTo(X(v), Y(0)); } g.stroke();
        txt(g, 'one roll', X(30), Y(40), { size: 12, w: 800, col: dice === 1 ? C.blue : '#8d92ad', align: 'right' }); txt(g, 'two rolls averaged', X(72), Y(52), { size: 12, w: 800, col: dice === 2 ? C.red : '#c58f8c' });
        const ty = truth(); g.strokeStyle = C.navy; g.setLineDash([4, 4]); g.lineWidth = 2; g.beginPath(); g.moveTo(X(hit), cy + ch); g.lineTo(X(hit), Y(ty)); g.lineTo(cx, Y(ty)); g.stroke(); g.setLineDash([]); dot(g, X(hit), Y(ty), 8, C.navy); dot(g, X(hit), Y(ty), 4, '#fff');
        // tally
        const tx = 520; txt(g, 'the screen says', tx, cy + 12, { size: 13, w: 800, col: C.muted }); txt(g, hit + ' in 100', tx, cy + 44, { size: 34, w: 800, display: true });
        txt(g, 'the dice give', tx + 250, cy + 12, { size: 13, w: 800, col: C.muted }); txt(g, ty.toFixed(1) + ' in 100', tx + 250, cy + 44, { size: 34, w: 800, display: true, col: Math.abs(ty - hit) < .05 ? C.ink : ty > hit ? C.green : C.red });
        txt(g, `last ${z.hist.length} swings (filled square: it landed)`, tx, cy + 92, { size: 13, w: 800, col: C.muted });
        z.hist.forEach((hh, i) => { const x = tx + (i % 30) * 16.4, y = cy + 108 + Math.floor(i / 30) * 20; if (hh) box(g, x, y, 13, 13, { r: 3, fill: atkPip ? C.blue : '#d0574f' }); else box(g, x + 1, y + 1, 11, 11, { r: 3, stroke: '#9aa0bd', lw: 2 }); });
        if (z.n) wrap(g, `${z.h} of ${z.n} landed: ${Math.round(z.h / z.n * 100)}%. ${dice === 2 ? (hit >= 50 ? 'More than the screen promised.' : 'Fewer than the screen said.') : 'Just what the screen said, and it feels worse.'}`, tx, cy + 172, 490, { size: 16, w: 700 });
        g.restore();
      },
    };
    return api;
  });

  /* ---------------- XCOM: the hidden streak breaker ---------------- */
  SCN.run('streak', s => {
    const FLOOR = 250, KX = 190, GX = 850, STEP = 15, CAP = 30, FIX = [42, 88, 85, 90, 30, 70, 72, 12, 91, 83, 79, 55];
    let z, shown = 65, help = 'yes', reveal = 'no', rnd;
    const bonusOf = st => shown >= 50 ? Math.min(CAP, STEP * st) : 0;
    function fire() { const roll = z.tour && z.i < FIX.length ? FIX[z.i] : Math.floor(rnd() * 100); z.i++;
      const bA = bonusOf(z.stA), thrA = Math.min(100, shown + bA), hA = roll < thrA, hB = roll < shown;
      z.shot = { t: 0, roll, bonus: help === 'yes' ? bA : 0, thr: help === 'yes' ? thrA : shown, hit: help === 'yes' ? hA : hB, done: false, a: hA, b: hB }; }
    function land(sh) { z.A.push(sh.a); z.B.push(sh.b); if (z.A.length > 36) { z.A.shift(); z.B.shift(); } z.stA = sh.a ? 0 : z.stA + 1; z.stB = sh.b ? 0 : z.stB + 1; z.maxA = Math.max(z.maxA, z.stA); z.maxB = Math.max(z.maxB, z.stB); z.n++; z.hA += sh.a; z.hB += sh.b; if (sh.hit) SCN.noise({ dur: .15, cut: 1800, vol: .25 }); else SCN.tone({ f: 300, f2: 150, dur: .2, vol: .06 }); }
    const api = {
      dur: 32,
      reset(tour) { rnd = SCN.rng(tour ? 4 : 11 + Math.floor(performance.now()) % 999); if (tour) { shown = 65; help = 'yes'; reveal = 'no'; api.mark('help', help); api.mark('reveal', reveal); api.mark('shown', 65); } z = { t: 0, tour, i: 0, A: [], B: [], stA: 0, stB: 0, maxA: 0, maxB: 0, n: 0, hA: 0, hB: 0, shot: null, wait: 1, auto: true }; },
      step(h) {
        z.t += h; const sh = z.shot;
        if (sh) { sh.t += h; if (!sh.done && sh.t > .55) { sh.done = true; land(sh); } if (sh.t > 1.5) z.shot = null; }
        else if (z.auto) { z.wait -= h; if (z.wait <= 0) { fire(); z.wait = .25; } }
      },
      script: [[9, () => { reveal = 'yes'; api.mark('reveal', reveal); }]],
      caption: t => t < 9 ? 'Kit has a 65% shot at the alien. That is the number XCOM shows, and at 65% two or three misses in a row are common, and they feel like a broken game.'
        : t < 17 ? 'Lift the cover. On the lower difficulties, each miss in a row quietly adds 15 points to the next shot. The screen still says 65.'
        : t < 25 ? 'The bottom rows fire the same rolls twice: once with the hidden help, once exactly as displayed. The help does not raise every shot. It cuts the tail off the losing streaks.'
        : 'Nobody is told. Players who feel robbed at 65% are being robbed less than the screen says. A fair roll and a roll that feels fair are different designs, and you have to choose.',
      status: () => { const sh = z.shot; return sh && sh.done ? (sh.hit ? (sh.roll >= shown ? `Rolled ${sh.roll}. On screen that is a miss at ${shown}%. With the hidden +${sh.bonus} it is a hit.` : `Rolled ${sh.roll}: a hit.`) : `Rolled ${sh.roll}: a miss.` + (help === 'yes' && shown >= 50 ? ' The next shot gets a hidden +' + bonusOf(z.stA) + '.' : '')) : shown < 50 ? 'Below 50% shown, the game gives no hidden help at all.' : 'Watch the strip: the hatched zone is help the screen never mentions.'; },
      stats: () => `<div><b>${shown}%</b><span>the shot on screen</span></div><div class="g"><b>${Math.min(100, shown + (help === 'yes' ? bonusOf(z.stA) : 0))}%</b><span>what the next roll is really against</span></div><div class="y"><b>${z.maxA} : ${z.maxB}</b><span>worst miss run: helped, unhelped</span></div>`,
      acts: { one() { z.auto = false; if (!z.shot) fire(); }, auto() { z.auto = true; } }, keys: { j: 'one' },
      set(k, v) { if (k === 'shown') shown = +v; if (k === 'help') help = v; if (k === 'reveal') reveal = v; },
      draw(g) {
        g.clearRect(0, 0, W, H); g.save(); SCN.clipStage(g, W, H);
        const sky = g.createLinearGradient(0, 0, 0, FLOOR); sky.addColorStop(0, '#0f1b33'); sky.addColorStop(1, '#27425e'); g.fillStyle = sky; g.fillRect(0, 0, W, FLOOR);
        g.fillStyle = 'rgba(255,255,255,.5)'; for (let i = 0; i < 40; i++) g.fillRect((i * 263) % W, (i * 97) % 120, 2, 2);
        g.fillStyle = '#1c2c40'; [[0, 120, 150, 130], [300, 150, 90, 100], [930, 100, 110, 150]].forEach(r => g.fillRect(...r));
        g.fillStyle = '#31475a'; g.fillRect(0, FLOOR, W, 30); g.fillStyle = '#48637a'; g.fillRect(0, FLOOR, W, 4);
        const sh = z.shot, k = sh ? sh.t : 0;
        CAST.draw(g, 'kit', { x: KX, y: FLOOR, pose: sh && k < .5 ? { ...CAST.POSES.aim, aim: true } : 'aim' });
        CAST.draw(g, 'grub', { x: GX, y: FLOOR, face: -1, s: .9, tint: '#8f99a8', pose: sh && sh.done && sh.hit && k < 1.1 ? 'hit' : 'guard', flash: sh && sh.done && sh.hit && k < .7 ? 1 : 0 });
        g.fillStyle = '#5d7388'; g.fillRect(KX + 40, FLOOR - 46, 60, 46); g.fillRect(GX - 110, FLOOR - 46, 60, 46); g.fillStyle = '#7b93a8'; g.fillRect(KX + 40, FLOOR - 46, 60, 5); g.fillRect(GX - 110, FLOOR - 46, 60, 5);
        if (sh && k > .45 && k < .75) { const u = (k - .45) / .3, ex = sh.hit ? GX - 20 : GX + 120, ey = sh.hit ? FLOOR - 80 : FLOOR - 170; g.strokeStyle = '#9fe8ff'; g.lineWidth = 4; g.shadowColor = '#9fe8ff'; g.shadowBlur = 12; g.beginPath(); g.moveTo(lerp(KX + 50, ex, Math.max(0, u - .3)), lerp(FLOOR - 92, ey, Math.max(0, u - .3))); g.lineTo(lerp(KX + 50, ex, u), lerp(FLOOR - 92, ey, u)); g.stroke(); g.shadowBlur = 0; }
        if (sh && sh.done && k < 1.4) txt(g, sh.hit ? 'HIT' : 'MISS', GX, FLOOR - 170 - (k - .55) * 26, { size: 30, w: 800, display: true, align: 'center', col: sh.hit ? '#9fe8ff' : '#ffb0a8', halo: '#0b1220', haloW: 6 });
        // the shot panel, XCOM style
        box(g, 330, 14, 380, 118, { r: 8, fill: 'rgba(8,20,34,.92)', stroke: '#5fd0ff', lw: 2 }); const im = SCN.img(IMG + 'sectoid.png'); box(g, 340, 24, 98, 98, { r: 6, fill: '#000' }); if (im) g.drawImage(im, 58, 50, 140, 140, 340, 24, 98, 98);
        txt(g, 'TARGET: SECTOID', 452, 36, { size: 13, w: 800, col: '#5fd0ff' }); txt(g, 'played by Grub', 600, 36, { size: 12, w: 700, col: '#8fb2c9' });
        txt(g, shown + '%', 452, 76, { size: 44, w: 800, col: '#fff', display: true }); txt(g, 'TO HIT', 452, 112, { size: 13, w: 800, col: '#8fb2c9' });
        const thr = Math.min(100, shown + (help === 'yes' ? bonusOf(z.stA) : 0)), bn = thr - shown;
        if (reveal === 'yes') { box(g, 580, 52, 120, 70, { r: 6, fill: bn ? 'rgba(47,174,99,.25)' : 'rgba(255,255,255,.06)', stroke: bn ? '#5fe39a' : '#5b7286', lw: 2 }); txt(g, 'really', 592, 66, { size: 12, w: 800, col: '#9ff0c2' }); txt(g, thr + '%', 592, 92, { size: 28, w: 800, col: '#fff', display: true }); txt(g, bn ? `${shown} + ${bn} hidden` : 'no hidden help', 592, 113, { size: 11.5, w: 700, col: '#9ff0c2' }); }
        else { box(g, 580, 52, 120, 70, { r: 6, fill: '#22384b', stroke: '#5b7286', lw: 2 }); txt(g, 'not shown', 640, 80, { size: 13, w: 800, col: '#8fb2c9', align: 'center' }); txt(g, 'to the player', 640, 98, { size: 13, w: 800, col: '#8fb2c9', align: 'center' }); }
        // the roll strip
        g.fillStyle = 'rgba(255,252,244,.97)'; g.fillRect(0, FLOOR + 30, W, H);
        const sx = 40, sw = 960, sy = FLOOR + 62, X = v => sx + v / 100 * sw;
        txt(g, 'the roll, from 0 to 99: it hits if it lands left of the line', sx, sy - 14, { size: 13, w: 800, col: C.muted });
        box(g, sx, sy, sw, 34, { r: 6, fill: '#f1d6d3' }); g.save(); g.beginPath(); g.roundRect(sx, sy, sw, 34, 6); g.clip(); g.fillStyle = '#9fd8b4'; g.fillRect(sx, sy, X(shown) - sx, 34);
        if (reveal === 'yes' && bn) { g.fillStyle = '#c9ecd6'; g.fillRect(X(shown), sy, X(thr) - X(shown), 34); g.strokeStyle = C.green; g.lineWidth = 2; for (let x = X(shown) - 34; x < X(thr); x += 10) { g.beginPath(); g.moveTo(Math.max(x, X(shown) - 34), sy + 34); g.lineTo(x + 34, sy); g.stroke(); } g.fillStyle = 'rgba(255,252,244,1)'; }
        g.restore(); if (reveal === 'yes' && bn) { g.save(); g.beginPath(); g.rect(sx, sy, X(shown) - sx, 34); g.clip(); g.fillStyle = '#9fd8b4'; g.fillRect(sx, sy, sw, 34); g.restore(); g.save(); g.beginPath(); g.rect(X(thr), sy, sx + sw - X(thr), 34); g.clip(); g.beginPath(); g.roundRect(sx, sy, sw, 34, 6); g.fillStyle = '#f1d6d3'; g.fill(); g.restore(); }
        box(g, sx, sy, sw, 34, { r: 6, stroke: C.navy, lw: 2 });
        txt(g, 'hit', sx + 12, sy + 17, { size: 14, w: 800, col: '#1b6b3c' }); txt(g, 'miss', sx + sw - 12, sy + 17, { size: 14, w: 800, col: '#9c2f2a', align: 'right' });
        g.strokeStyle = C.navy; g.lineWidth = 4; g.beginPath(); g.moveTo(X(shown), sy - 6); g.lineTo(X(shown), sy + 40); g.stroke(); txt(g, 'shown: ' + shown, X(shown), sy + 52, { size: 13, w: 800, align: 'center' });
        if (reveal === 'yes' && bn) { g.strokeStyle = C.green; g.beginPath(); g.moveTo(X(thr), sy - 6); g.lineTo(X(thr), sy + 40); g.stroke(); txt(g, 'really: ' + thr, X(thr) + (thr - shown < 12 ? 44 : 0), sy + 52, { size: 13, w: 800, align: 'center', col: '#1b6b3c' }); }
        if (sh) { const rx = sh.done ? X(sh.roll + .5) : X((z.t * 173) % 100); g.fillStyle = sh.done ? (sh.hit ? C.green : C.red) : C.navy; g.beginPath(); g.moveTo(rx, sy + 6); g.lineTo(rx - 10, sy - 14); g.lineTo(rx + 10, sy - 14); g.fill(); dot(g, rx, sy + 17, 8, g.fillStyle); if (sh.done) txt(g, sh.roll, rx, sy - 24, { size: 15, w: 800, align: 'center' }); }
        // same rolls, two rule sets
        const ry = sy + 92; [['with the hidden help (Easy and Normal)', z.A, z.maxA, z.hA, help === 'yes'], ['exactly as displayed (Classic and up)', z.B, z.maxB, z.hB, help === 'no']].forEach(([name, arr, mx, hh, on], r) => { const y = ry + r * 62;
          if (on) box(g, 14, y - 16, 1012, 56, { r: 8, fill: 'rgba(255,185,81,.2)' }); txt(g, name, 28, y, { size: 14, w: 800 }); txt(g, `${z.n ? Math.round(hh / z.n * 100) : 0}% landed`, 28, y + 22, { size: 13, w: 700, col: C.muted });
          arr.forEach((v, i) => { const x = 320 + i * 15.5; if (v) box(g, x, y - 2, 12, 22, { r: 3, fill: C.blue }); else box(g, x, y + 6, 12, 14, { r: 3, fill: C.red }); });
          txt(g, mx, 944, y + 8, { size: 30, w: 800, display: true, align: 'right', col: mx >= 3 ? C.red : C.ink }); wrap(g, 'misses in a row at worst', 952, y + 2, 76, { size: 11.5, w: 700, col: C.muted, lh: 13 }); });
        txt(g, 'tall blue: hit   short red: miss   the same roll feeds both rows', 320, ry + 112, { size: 12, w: 700, col: C.muted });
        g.restore();
      },
    };
    return api;
  });
})();
