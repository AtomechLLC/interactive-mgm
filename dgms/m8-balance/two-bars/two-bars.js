/* Two bars, two behaviours (DGMS M8), beside the health and resource balance pages.
   posture  Sekiro: every fighter has Vitality and Posture. Blows and deflections fill the enemy's Posture, it drains
            when you back off, and it drains slower the less Vitality he has. Fill it and you get a deathblow whatever
            his Vitality is. Pip duels Bram.
   shield   Halo: a shield that recharges after a few seconds without damage, over health that does not. The delay
            sets the rhythm of the fight. Kit holds a rock against an Elite (the game's own art).
   The rules are the games'. Every number (damage, rates, delays, timings) is ours. */
(function () {
  const { txt, box, bar, pill, clamp, lerp, C, dot, ring, wrap } = SCN, TAU = SCN.TAU;
  const W = 1040, H = 585, IMG = new URL('img/', document.currentScript.src).href;

  /* ---------------- Sekiro: vitality and posture ---------------- */
  SCN.run('posture', s => {
    const FLOOR = 286, BX = 620, NEAR = 500, FAR = 300;
    let z, plan = 'poke';
    const rate = () => z.bv > 50 ? 1 : z.bv > 25 ? .5 : .2;
    const fight = () => { Object.assign(z, { bv: 100, bp: 0, bq: 9, pv: 100, pp: 0, pq: 9, ft: 0, b: { st: 'idle', t: 0 }, p: { st: 'idle', t: 0, x: plan === 'poke' && z.auto ? FAR : NEAR, n: 0, cd: .4 }, fx: [], over: 0, how: '' }); };
    function attack() { const p = z.p; if (p.st !== 'idle' || z.over || p.x < NEAR - 20) return; p.st = 'atk'; p.t = 0; p.hit = false; }
    function deflect() { const p = z.p; if ((p.st !== 'idle' && p.st !== 'atk') || z.over) return; p.st = 'deflect'; p.t = 0; }
    const hurtB = (v, po) => { z.bv = Math.max(0, z.bv - v); z.bp = Math.min(100, z.bp + po); z.bq = 0; };
    const api = {
      dur: 31,
      reset(tour) { if (tour) { plan = 'poke'; api.mark('plan', plan); } z = { t: 0, auto: true, log: {} }; fight(); },
      step(h) {
        z.t += h; z.fx = z.fx.filter(f => (f.t += h) < .5); const b = z.b, p = z.p;
        if (z.over) { z.over += h; if (b.st === 'broken' && z.over > .7) { b.st = 'dead'; SCN.noise({ dur: .3, cut: 500, vol: .3 }); } if (z.over > 3.4) fight(); return; }
        z.ft += h; z.bq += h; z.pq += h; b.t += h; p.t += h;
        if (z.bq > 1) z.bp = Math.max(0, z.bp - 16 * rate() * h); if (z.pq > 1.2) z.pp = Math.max(0, z.pp - 20 * h);
        // Bram: idle, wind up, swing
        if (b.st === 'idle' && b.t > 1.7) { b.st = 'wind'; b.t = 0; }
        else if (b.st === 'wind' && b.t > .7) { b.st = 'swing'; b.t = 0;
          if (p.x > NEAR - 60) { if (p.st === 'deflect' && p.t < .32) { hurtB(0, 20); z.pp = Math.min(100, z.pp + 8); z.pq = 0; z.fx.push({ t: 0, x: 560, y: FLOOR - 100, k: 'spark' }); SCN.tone({ f: 1800, f2: 900, dur: .12, type: 'square', vol: .12 }); z.msg = 'Deflected: the clash goes into Bram\'s Posture, not Pip\'s Vitality.'; }
            else { z.pv = Math.max(0, z.pv - 25); z.pp = Math.min(100, z.pp + 30); z.pq = 0; p.st = 'hurt'; p.t = 0; SCN.noise({ dur: .2, cut: 600, vol: .3 }); z.msg = 'Hit. Deflect just before the blade lands.'; if (z.pv <= 0) { z.pv = 100; } } } }
        else if (b.st === 'swing' && b.t > .5) { b.st = 'idle'; b.t = 0; }
        // Pip
        if (p.st === 'atk') { if (!p.hit && p.t > .22) { p.hit = true; hurtB(z.auto && plan === 'poke' ? 6 : 5, 9); p.n++; z.fx.push({ t: 0, x: 590, y: FLOOR - 90, k: 'cut' }); SCN.noise({ dur: .07, cut: 2500, vol: .15 }); } if (p.t > .42) { p.st = 'idle'; p.t = 0; p.cd = .12; } }
        else if (p.st === 'deflect' && p.t > .5) { p.st = 'idle'; p.t = 0; p.cd = .15; }
        else if (p.st === 'hurt' && p.t > .5) { p.st = 'idle'; p.t = 0; p.cd = .2; }
        else if (p.st === 'idle') { p.cd -= h;
          if (z.auto && plan === 'press') { p.x = Math.min(NEAR, p.x + 400 * h); if (b.st === 'wind' && b.t > .45) deflect(); else if (p.cd <= 0 && !(b.st === 'wind' && b.t > .1)) attack(); }
          else if (z.auto) { const goIn = b.st === 'idle' && b.t < 1.25 && p.n < 2; if (b.st === 'swing' && b.t < h * 2) p.n = 0; p.x = goIn ? Math.min(NEAR, p.x + 520 * h) : Math.max(FAR, p.x - 520 * h); if (goIn && p.x >= NEAR && p.cd <= 0) attack(); }
          else p.x = Math.min(NEAR, p.x + 400 * h); }
        const key = z.auto ? plan : 'you'; z.log[key] = { t: z.ft, vit: z.bv, done: false };
        if (z.bp >= 100 || z.bv <= 0) { z.how = z.bp >= 100 ? 'posture' : 'vitality'; z.over = 1e-6; b.st = 'broken'; z.log[key].done = z.how; SCN.tone({ f: 220, f2: 55, dur: .6, type: 'sawtooth', vol: .15 }); z.msg = z.how === 'posture' ? `Posture broken. Deathblow, with ${Math.round(z.bv)}% of his Vitality untouched.` : 'Vitality gone. It took the long way round.'; }
      },
      script: [[12.5, () => { plan = 'press'; api.mark('plan', plan); fight(); }]],
      caption: t => t < 6 ? 'Bram has two bars. Red is Vitality. Orange is Posture, which fills as he is struck. Pip steps in, lands two cuts, and steps back out of reach.'
        : t < 12.5 ? 'And every time Pip backs off, the Posture drains away again. Playing safe means emptying the whole red bar, one small bite at a time.'
        : t < 20 ? 'Now Pip stays on him. Every cut fills Posture, and so does every deflected blow. With no pause, it never drains.'
        : t < 25 ? 'A full Posture bar is a deathblow, however much Vitality is left. The second bar is a reward for staying close.'
        : 'The bars also talk to each other: the lower his Vitality, the slower his Posture recovers. Two bars, and the game is telling you to attack.',
      status: () => z.msg || 'J attacks, K deflects. Deflect just before Bram\'s blade lands.',
      stats: () => `<div class="r"><b>${Math.round(z.bv)}%</b><span>Bram's Vitality</span></div><div class="y"><b>${Math.round(z.bp)}%</b><span>Bram's Posture: full means a deathblow</span></div><div><b>${Math.round(rate() * 100)}%</b><span>how fast his Posture recovers right now</span></div>`,
      acts: { atk() { z.auto = false; attack(); }, def() { z.auto = false; deflect(); } }, keys: { j: 'atk', k: 'def' },
      set(k, v) { if (k === 'plan') plan = v; },
      draw(g) {
        g.clearRect(0, 0, W, H); g.save(); SCN.clipStage(g, W, H);
        const sky = g.createLinearGradient(0, 0, 0, FLOOR); sky.addColorStop(0, '#2b2a4a'); sky.addColorStop(.6, '#8a4f5c'); sky.addColorStop(1, '#e6a36a'); g.fillStyle = sky; g.fillRect(0, 0, W, FLOOR);
        dot(g, 820, 120, 46, 'rgba(255,240,210,.9)'); g.fillStyle = 'rgba(30,24,44,.55)'; g.beginPath(); g.moveTo(0, FLOOR); g.lineTo(0, 190); g.lineTo(140, 150); g.lineTo(260, 200); g.lineTo(420, 160); g.lineTo(520, 215); g.lineTo(1040, 230); g.lineTo(1040, FLOOR); g.fill();
        g.strokeStyle = 'rgba(240,220,170,.75)'; g.lineWidth = 2; for (let i = 0; i < 60; i++) { const x = (i * 53) % W, hgt = 26 + (i * 37) % 44, sway = Math.sin(z.t * 1.4 + i) * 5; g.beginPath(); g.moveTo(x, FLOOR + 6); g.quadraticCurveTo(x + sway * .4, FLOOR - hgt * .5, x + sway, FLOOR - hgt); g.stroke(); }
        g.fillStyle = '#3b3147'; g.fillRect(0, FLOOR, W, 40); g.fillStyle = '#5a4a62'; g.fillRect(0, FLOOR, W, 4);
        const b = z.b, p = z.p;
        const bpose = b.st === 'wind' ? CAST.mix('guard', 'windup', Math.min(1, b.t / .5)) : b.st === 'swing' ? (b.t < .12 ? CAST.mix('windup', 'strike', b.t / .12) : 'follow') : b.st === 'broken' ? 'crumple' : b.st === 'dead' ? 'down' : 'guard';
        const ppose = z.over && z.over > .35 && z.over < 1.2 ? 'thrust' : p.st === 'atk' ? CAST.swing(p.t, .15, .28, .42).pose : p.st === 'deflect' ? 'block' : p.st === 'hurt' ? 'hit' : Math.abs(p.x - (z.auto && plan === 'poke' ? (b.st === 'idle' && b.t < 1.25 && p.n < 2 ? NEAR : FAR) : NEAR)) > 4 ? CAST.cycle('run', z.t * 1.6) : 'guard';
        if (b.st === 'wind') { ring(g, BX - 30, FLOOR - 150, 16 + (1 - b.t / .7) * 40, C.red, 4, .8); }
        CAST.draw(g, 'bram', { x: BX, y: FLOOR, face: -1, pose: bpose, s: 1.08, flash: z.fx.some(f => f.k === 'cut' && f.t < .12) ? .8 : 0 });
        CAST.draw(g, 'pip', { x: p.x + (z.over > .35 && z.over < 1.2 ? 40 : 0), y: FLOOR, pose: ppose, flash: p.st === 'hurt' && p.t < .15 ? 1 : 0 });
        z.fx.forEach(f => { if (f.k === 'spark') { g.strokeStyle = `rgba(255,220,120,${1 - f.t / .5})`; g.lineWidth = 3; for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + 1; g.beginPath(); g.moveTo(f.x + Math.cos(a) * (8 + f.t * 60), f.y + Math.sin(a) * (8 + f.t * 60)); g.lineTo(f.x + Math.cos(a) * (20 + f.t * 110), f.y + Math.sin(a) * (20 + f.t * 110)); g.stroke(); } } else { g.strokeStyle = `rgba(255,255,255,${1 - f.t / .5})`; g.lineWidth = 4; g.beginPath(); g.moveTo(f.x - 26, f.y - 26); g.lineTo(f.x + 26, f.y + 26); g.stroke(); } });
        if (b.st === 'broken' || (b.st === 'dead' && z.over < 2.6)) { const r = 14 + Math.sin(z.t * 20) * 3; g.save(); g.shadowColor = '#ff2a2a'; g.shadowBlur = 24; dot(g, BX - 6, FLOOR - 90, b.st === 'broken' ? r : 10, '#ff2a2a'); g.restore(); txt(g, 'DEATHBLOW', 520, 150, { size: 44, w: 800, display: true, align: 'center', col: '#ff3b30', halo: '#1a0d14', haloW: 8 }); if (z.how === 'posture') txt(g, `with ${Math.round(z.bv)}% of his Vitality untouched`, 520, 188, { size: 16, w: 700, align: 'center', col: '#fff', halo: '#1a0d14', haloW: 5 }); }
        // the bars
        const bars = (x, w, name, vit, pos, right) => { txt(g, name, right ? x + w : x, 24, { size: 14, w: 800, col: '#fff', align: right ? 'right' : 'left' }); bar(g, x, 36, w, 14, vit / 100, { col: '#d0312d', back: 'rgba(0,0,0,.45)', stroke: '#f3e3c9', lw: 2 }); txt(g, 'Vitality', x + 6, 43.5, { size: 10.5, w: 800, col: '#fff' });
          bar(g, x + w * .08, 58, w * .84, 11, pos / 100, { col: pos > 80 ? '#ff3b30' : '#f2a33a', back: 'rgba(0,0,0,.45)', stroke: '#f3e3c9', lw: 2, centre: true }); txt(g, 'Posture', x + w * .08 + 6, 82, { size: 10.5, w: 800, col: '#f6d9a8' }); };
        bars(24, 250, 'Pip, the shinobi', z.pv, z.pp); bars(W - 474, 450, 'Bram, the general', z.bv, z.bp, true);
        if (z.bq > 1 && z.bp > 1 && !z.over) txt(g, `draining${rate() < 1 ? ' slowly' : ''} ▾`, W - 30, 82, { size: 12, w: 800, col: '#f6d9a8', align: 'right' });
        // lower panel
        g.fillStyle = 'rgba(255,252,244,.97)'; g.fillRect(0, FLOOR + 40, W, H); const y0 = FLOOR + 64;
        txt(g, 'what fills his Posture', 24, y0, { size: 13, w: 800, col: C.muted });
        [['a cut that lands', '+9'], ['a blow of his that Pip deflects', '+20'], ['Pip backing off for a second', 'it drains']].forEach(([a, v], i) => { const y = y0 + 28 + i * 26; txt(g, a, 24, y, { size: 15, w: 700 }); txt(g, v, 330, y, { size: 15, w: 800, col: i === 2 ? C.red : '#b26a00', align: 'right' }); });
        txt(g, 'how fast it drains depends on his Vitality', 24, y0 + 118, { size: 13, w: 800, col: C.muted });
        [['above half', 1], ['below half', .5], ['below a quarter', .2]].forEach(([a, v], i) => { const x = 24 + i * 106, on = rate() === v; box(g, x, y0 + 132, 100, 48, { r: 8, fill: on ? '#fff0c9' : '#fffaf0', stroke: on ? C.gold : C.line, lw: on ? 3 : 2 }); txt(g, a, x + 50, y0 + 147, { size: 12, w: 700, align: 'center', col: C.muted }); txt(g, v * 100 + '%', x + 50, y0 + 167, { size: 17, w: 800, align: 'center', display: true }); });
        const lx = 400; txt(g, 'two ways to fight him', lx, y0, { size: 13, w: 800, col: C.muted });
        [['poke', 'Two cuts, then back off'], ['press', 'Stay on him: cut and deflect'], ['you', 'Your own hands']].forEach(([k, name], i) => { const y = y0 + 34 + i * 54, L = z.log[k], on = (z.auto ? plan : 'you') === k;
          box(g, lx - 10, y - 20, 640, 48, { r: 8, fill: on ? 'rgba(255,185,81,.2)' : 'transparent' }); txt(g, name, lx, y - 4, { size: 16, w: 800 });
          if (!L) { txt(g, 'not tried yet', lx, y + 16, { size: 13, w: 700, col: C.muted }); return; }
          txt(g, L.done === 'posture' ? `deathblow at ${L.t.toFixed(1)} s, with ${Math.round(L.vit)}% Vitality left on him` : L.done ? `won at ${L.t.toFixed(1)} s by emptying all his Vitality` : `${L.t.toFixed(1)} s in: Vitality ${Math.round(L.vit)}%, no deathblow yet`, lx, y + 16, { size: 13.5, w: 700, col: L.done === 'posture' ? '#1b6b3c' : C.muted });
          bar(g, lx + 330, y - 10, 250, 12, L.t / 30, { col: L.done === 'posture' ? C.green : C.blue, stroke: null }); txt(g, '30 s', lx + 586, y - 4, { size: 11, w: 700, col: C.muted }); });
        g.restore();
      },
    };
    return api;
  });

  /* ---------------- Halo: the recharging shield ---------------- */
  SCN.run('shield', s => {
    const FLOOR = 262, KX = 250, EX = 850, WIN = 24;
    let z, delay = 5, plan = 'stand';
    const slider = () => s.querySelector('input[data-rng="delay"]'), setDelay = v => { delay = v; const r = slider(); if (r) { r.value = v; const b = r.closest('label')?.querySelector('b'); if (b) b.textContent = v + ' s'; } };
    const life = () => { Object.assign(z, { sh: 100, hp: 100, since: 9, want: false, dead: 0 }); };
    const api = {
      dur: 38,
      reset(tour) { if (tour) { plan = 'stand'; api.mark('plan', plan); setDelay(5); } z = { t: 0, cov: 0, bolts: [], fire: .6, shot: .5, arrows: [], hist: [], samp: 0, dealt: 0, tf: 0, th: 0, deaths: 0, manual: false, hold: false, charging: false, beep: 0, flare: 0 }; life(); },
      step(h) {
        z.t += h; z.flare = Math.max(0, z.flare - h * 3);
        z.samp -= h; if (z.samp <= 0) { z.samp = .1; z.hist.push({ sh: z.sh, hp: z.hp, cov: z.cov > .5, dead: !!z.dead }); if (z.hist.length > WIN * 10) z.hist.shift(); }
        if (z.dead) { z.dead += h; if (z.dead > 2.4) life(); z.bolts = []; return; }
        z.want = z.manual ? z.hold : plan === 'duck' ? (z.sh < 25 || (z.want && z.sh < 100)) : false;
        z.cov = clamp(z.cov + (z.want ? 1 : -1) * h / .28); if (z.cov > .5) z.th += h; else z.tf += h;
        z.since += h; const was = z.charging; z.charging = z.since > delay && z.sh < 100; if (z.charging) z.sh = Math.min(100, z.sh + 60 * h); if (z.charging && !was) SCN.tone({ f: 300, f2: 1200, dur: .9, type: 'triangle', vol: .08 });
        if (z.sh < 25 && !z.charging) { z.beep -= h; if (z.beep <= 0) { z.beep = .35; SCN.tone({ f: 1100, dur: .08, type: 'square', vol: .05 }); } }
        z.fire -= h; if (z.fire <= 0) { z.fire = z.cov > .5 ? .9 : .5; z.bolts.push({ x: EX - 70, y: FLOOR - 118 }); SCN.tone({ f: 900, f2: 300, dur: .12, type: 'sawtooth', vol: .05 }); }
        z.bolts = z.bolts.filter(b => { b.x -= 900 * h; const hid = z.cov > .6; if (hid && b.x < KX + 96) { b.splash = true; return false; } if (b.x < KX + 10) { if (z.sh > 0) z.sh = Math.max(0, z.sh - 22); else z.hp = Math.max(0, z.hp - 12); z.since = 0; z.hitT = z.t; if (z.hp <= 0) { z.dead = 1e-6; z.deaths++; SCN.noise({ dur: .4, cut: 400, vol: .3 }); } return false; } return true; });
        if (z.cov < .3) { z.shot -= h; if (z.shot <= 0) { z.shot = .45; z.arrows.push({ x: KX + 40 }); } }
        z.arrows = z.arrows.filter(a => { a.x += 1100 * h; if (a.x > EX - 40) { z.dealt++; z.flare = 1; return false; } return true; });
      },
      script: [[9.5, () => { plan = 'duck'; api.mark('plan', plan); life(); }], [27, () => { setDelay(2); }]],
      caption: t => t < 4.5 ? 'Kit has a blue shield over red health. The shield takes the first hits. Standing in the open, it is gone in a couple of seconds.'
        : t < 9.5 ? 'Health does not come back by itself, so every hit after that is permanent. Standing and trading is a short career.'
        : t < 18 ? 'But the shield recharges after five seconds without being hit. So when it breaks Kit ducks behind the rock, waits for the hum, and stands back up.'
        : t < 27 ? 'Look at the trace below. One rule about a timer has produced a rhythm: fight, hide, fight. That rhythm is Halo\'s combat loop.'
        : 'The delay is the dial. At two seconds Kit spends far more of the fight shooting. Stretch it and every exchange becomes a long wait behind a rock.',
      status: () => z.dead ? 'Down. The shield forgives a mistake; health does not.' : z.cov > .5 ? (z.charging ? 'Recharging…' : `In cover. Shield starts to recharge in ${Math.max(0, delay - z.since).toFixed(1)} s.`) : z.sh <= 0 ? 'Shield down: every hit now comes out of health.' : 'Hold S to duck behind the rock. The shield needs ' + delay + ' quiet seconds.',
      stats: () => { const tot = z.tf + z.th || 1; return `<div><b>${Math.round(z.tf / tot * 100)}%</b><span>of the time spent out and shooting</span></div><div class="y"><b>${z.dealt}</b><span>arrows landed on the Elite</span></div><div class="r"><b>${z.deaths}</b><span>times Kit went down</span></div>`; },
      acts: { duck(v) { z.manual = true; z.hold = !!v; } }, holds: { s: 'duck' },
      set(k, v) { if (k === 'plan') { plan = v; } if (k === 'delay') delay = +v; },
      draw(g) {
        g.clearRect(0, 0, W, H); g.save(); SCN.clipStage(g, W, H);
        const sky = g.createLinearGradient(0, 0, 0, FLOOR); sky.addColorStop(0, '#3f7fc4'); sky.addColorStop(1, '#bfe0f2'); g.fillStyle = sky; g.fillRect(0, 0, W, FLOOR);
        g.save(); g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 26; g.beginPath(); g.ellipse(700, 900, 900, 880, -.25, Math.PI * 1.12, Math.PI * 1.62); g.stroke(); g.strokeStyle = 'rgba(90,150,110,.45)'; g.lineWidth = 12; g.beginPath(); g.ellipse(700, 900, 900, 880, -.25, Math.PI * 1.12, Math.PI * 1.62); g.stroke(); g.restore();
        g.fillStyle = '#7fae84'; g.beginPath(); g.moveTo(0, FLOOR); g.lineTo(0, 210); g.quadraticCurveTo(300, 160, 560, 215); g.quadraticCurveTo(820, 250, 1040, 190); g.lineTo(1040, FLOOR); g.fill();
        g.fillStyle = '#6b8f5c'; g.fillRect(0, FLOOR, W, 36); g.fillStyle = '#577a4a'; g.fillRect(0, FLOOR, W, 4);
        const hid = z.cov > .5, el = SCN.img(IMG + 'elite.png');
        if (el) { SCN.sprite(g, el, EX, FLOOR + 6, 210); if (z.flare > 0) { g.save(); g.globalAlpha = z.flare * .6; g.strokeStyle = '#8fd8ff'; g.lineWidth = 5; g.shadowColor = '#8fd8ff'; g.shadowBlur = 18; g.beginPath(); g.ellipse(EX, FLOOR - 100, 62, 108, 0, 0, TAU); g.stroke(); g.restore(); } }
        CAST.draw(g, 'kit', { x: KX, y: FLOOR, pose: z.dead ? 'down' : z.cov > 0 ? CAST.mix('aim', 'crouch', z.cov) : { ...CAST.POSES.aim, aim: true }, flash: z.t - z.hitT < .1 ? .8 : 0 });
        if (!z.dead && !hid && z.sh > 0 && z.t - z.hitT < .25) { g.save(); g.strokeStyle = '#7fd4ff'; g.shadowColor = '#7fd4ff'; g.shadowBlur = 16; g.lineWidth = 4; g.globalAlpha = 1 - (z.t - z.hitT) / .25; g.beginPath(); g.ellipse(KX, FLOOR - 66, 46, 78, 0, 0, TAU); g.stroke(); g.restore(); }
        g.fillStyle = '#7d7f86'; g.beginPath(); g.moveTo(KX + 44, FLOOR); g.lineTo(KX + 52, FLOOR - 78); g.lineTo(KX + 92, FLOOR - 92); g.lineTo(KX + 118, FLOOR - 60); g.lineTo(KX + 124, FLOOR); g.fill(); g.fillStyle = '#9a9ca4'; g.beginPath(); g.moveTo(KX + 52, FLOOR - 78); g.lineTo(KX + 92, FLOOR - 92); g.lineTo(KX + 96, FLOOR - 70); g.lineTo(KX + 60, FLOOR - 62); g.fill();
        z.bolts.forEach(b => { g.save(); g.shadowColor = '#6dffb0'; g.shadowBlur = 14; g.fillStyle = '#b8ffd8'; g.beginPath(); g.ellipse(b.x, b.y, 16, 6, 0, 0, TAU); g.fill(); g.restore(); });
        z.arrows.forEach(a => { g.strokeStyle = '#5c3a05'; g.lineWidth = 3; g.beginPath(); g.moveTo(a.x - 26, FLOOR - 92); g.lineTo(a.x, FLOOR - 92); g.stroke(); });
        // HUD
        box(g, 20, 14, 320, 74, { r: 8, fill: 'rgba(10,30,60,.72)', stroke: '#7fd4ff', lw: 2 }); txt(g, 'SHIELD', 34, 34, { size: 12, w: 800, col: '#7fd4ff' });
        const low = z.sh < 25 && !z.charging && Math.sin(z.t * 18) > 0; bar(g, 96, 26, 230, 16, z.sh / 100, { col: low ? '#ff5a4d' : z.charging ? '#c8f0ff' : '#49b6ff', back: low ? 'rgba(255,90,77,.3)' : 'rgba(255,255,255,.14)', stroke: '#7fd4ff', lw: 2 });
        txt(g, 'HEALTH', 34, 64, { size: 12, w: 800, col: '#ff9a8f' }); for (let i = 0; i < 8; i++) box(g, 96 + i * 29, 56, 25, 16, { r: 3, fill: z.hp > i * 12.5 ? '#ff6a5c' : 'rgba(255,255,255,.12)', stroke: '#ffb1a8', lw: 1.5 });
        const st = z.dead ? 'down' : z.charging ? 'recharging' : z.sh >= 100 ? 'full' : `recharge in ${Math.max(0, delay - z.since).toFixed(1)} s`; pill(g, st, 352, 34, { size: 13, w: 800, fill: z.charging ? '#2a8fd0' : 'rgba(10,30,60,.72)', align: 'left' });
        txt(g, 'Kit, behind the rock', KX + 30, FLOOR + 20, { size: 12, w: 800, col: '#eaf5e4', align: 'center' }); txt(g, 'an Elite', EX, FLOOR + 20, { size: 12, w: 800, col: '#eaf5e4', align: 'center' });
        // trace
        g.fillStyle = 'rgba(255,252,244,.97)'; g.fillRect(0, FLOOR + 36, W, H);
        const gx = 60, gw = 940, gy = FLOOR + 76, gh = 150, n = WIN * 10, X = i => gx + (i + n - z.hist.length) / n * gw;
        txt(g, `the last ${WIN} seconds`, gx, gy - 18, { size: 13, w: 800, col: C.muted }); txt(g, 'blue: shield   red line: health   shaded: behind the rock', gx + gw, gy - 18, { size: 13, w: 700, col: C.muted, align: 'right' });
        box(g, gx, gy, gw, gh, { r: 0, fill: '#fff', stroke: C.line, lw: 2 });
        let st0 = -1; z.hist.forEach((p, i) => { if (p.cov && st0 < 0) st0 = i; if ((!p.cov || i === z.hist.length - 1) && st0 >= 0) { g.fillStyle = 'rgba(160,130,80,.22)'; g.fillRect(X(st0), gy, X(i) - X(st0), gh); if (X(i) - X(st0) > 50) txt(g, 'hiding', (X(i) + X(st0)) / 2, gy + gh - 12, { size: 12, w: 800, col: '#7c6a45', align: 'center' }); st0 = -1; } });
        if (z.hist.length > 1) { g.fillStyle = 'rgba(73,182,255,.45)'; g.beginPath(); g.moveTo(X(0), gy + gh); z.hist.forEach((p, i) => g.lineTo(X(i), gy + gh - p.sh / 100 * (gh - 8))); g.lineTo(X(z.hist.length - 1), gy + gh); g.fill();
          g.strokeStyle = '#1f8fd6'; g.lineWidth = 3; g.beginPath(); z.hist.forEach((p, i) => i ? g.lineTo(X(i), gy + gh - p.sh / 100 * (gh - 8)) : g.moveTo(X(i), gy + gh - p.sh / 100 * (gh - 8))); g.stroke();
          g.strokeStyle = '#e5322d'; g.lineWidth = 3; g.beginPath(); z.hist.forEach((p, i) => i ? g.lineTo(X(i), gy + gh - p.hp / 100 * (gh - 8)) : g.moveTo(X(i), gy + gh - p.hp / 100 * (gh - 8))); g.stroke(); }
        const tot = z.tf + z.th || 1, fy = gy + gh + 28; txt(g, 'share of the fight', gx, fy, { size: 13, w: 800, col: C.muted }); box(g, gx + 150, fy - 10, 560, 20, { r: 5, fill: 'rgba(160,130,80,.35)' }); box(g, gx + 150, fy - 10, Math.max(4, 560 * z.tf / tot), 20, { r: 5, fill: C.blue });
        txt(g, `shooting ${Math.round(z.tf / tot * 100)}%`, gx + 160, fy + 1, { size: 12.5, w: 800, col: '#fff' }); txt(g, `hiding ${Math.round(z.th / tot * 100)}%`, gx + 700, fy + 1, { size: 12.5, w: 800, col: '#5a4a2a', align: 'right' }); txt(g, `recharge delay: ${delay} s`, gx + gw, fy + 1, { size: 14, w: 800, align: 'right' });
        g.restore();
      },
    };
    return api;
  });
})();
