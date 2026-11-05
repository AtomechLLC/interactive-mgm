/* The affordance grid, played in a Mario level (DGMS Module 2, Audience Demographics, deck slides 102-111).
   level: a short Super Mario World-style course. Four things in it, one per cell of slide 105's grid
          (player perceives the action? x action possible?):
            enterable pipe  -> visible affordance  (intended)
            dark scenery pipe -> correct rejection (intended)
            ground lip over the pit that gives way -> false affordance (misleading; troll levels, slide 108)
            invisible block with a 1-Up -> hidden affordance (secret; Super Metroid's wall jump, slide 109)
          Each discovery drops a token into the grid. The walk-through is an autopilot run of the same physics,
          stepped at a fixed 60 Hz from t = 0, so every frame is a pure function of time.
   words: "Natural language is important!": two real Ooblets cards (One Step Pep, Flummoxtrot) as printed, in battle
          words, and with the flavour word kept plus what it does. See the slide 2 header below for what the cards do.
   Numbers: the level layout, physics and lives are illustrative (tuned to feel like SMW, not measured from it).
   The grid's four cells are the deck's (slide 105); the labels intended / misleading / secret replace the deck's
   Good / BAD on slides 106-107.
   Images: Super Mario World sprites from the Super Mario Wiki (mariowiki.com, mario.wiki.gallery):
   Mario_SMW.gif (split into mario-walk0/1.png), SMM-SMW-Mario-Jump.png, Warp_Pipe_SMW.png, SMW_1-up.png,
   SMW_Empty_Block.png, and SMM_ground_SMW_Ground.png (Super Mario Maker's SMW ground tileset). (c) Nintendo. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;
  const W = 1040, H = 585;

  /* ---------- tunables (all illustrative) ---------- */
  const N = {
    tile: 48,              // canvas px per 16-px tile (sprites drawn at 3x)
    viewW: 680,            // level viewport width in canvas px; the grid sits to the right
    groundY: 10,           // ground top, in tiles from the top of the screen
    levelW: 42,            // level length in tiles
    accel: 28, friction: 30, maxSpeed: 6.5,   // tiles/s^2, tiles/s^2, tiles/s
    gravity: 60, jumpV: 20,                   // tiles/s^2, tiles/s  (jump height 3.3 tiles, run-jump reach ~4.3 tiles)
    lives: 5,
    bgPipe: { x: 7, w: 2, h: 3 },             // scenery pipe (not solid, cannot be entered)
    block: { x: 14, y: 6 },                   // invisible block, 3 tiles above the ground
    pit: { x0: 21, x1: 25 },                  // the real gap
    fake: { x0: 21, x1: 23 },                 // ground lip that looks solid and gives way
    pipe: { x: 33, w: 2, h: 2 },              // the pipe you can enter
    oneUpSpeed: 2.5, respawnX: 17.5,
    tourDur: 15.5, tourPause: 1.1,
  };
  const S = N.tile, DT = 1 / 60;
  const IMG = {};
  ['mario-walk0', 'mario-walk1', 'mario-jump', 'pipe', 'ground', 'oneup', 'used-block'].forEach(n => { const i = new Image(); i.src = '../img/affordance-grid/' + n + '.png'; IMG[n] = i; });
  const ok = i => i && i.complete && i.naturalWidth > 0;
  const apis = {};
  const panel = g => { g.clearRect(0, 0, W, H); g.fillStyle = 'rgba(255,252,244,.8)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill(); };
  const txt = (g, s, x, y, font, col = C.ink, al = 'left') => { g.font = font; g.fillStyle = col; g.textAlign = al; g.textBaseline = 'middle'; g.fillText(s, x, y); };

  /* ---------- the four cells ---------- */
  const CELLS = {
    visible: { r: 0, c: 0, name: ['Visible', 'affordance'], tag: 'intended', col: C.good, cap: ['Pipe with a rim:', '↓ goes in'] },
    false: { r: 0, c: 1, name: ['False', 'affordance'], tag: 'misleading', col: C.red, cap: ['Ground that', 'gave way'], extra: 'the stuff of troll levels' },
    hidden: { r: 1, c: 0, name: ['Hidden', 'affordance'], tag: 'secret', col: '#b07a0c', cap: ['Invisible block', 'held a 1-Up'], extra: 'like Super Metroid’s wall jump' },
    reject: { r: 1, c: 1, name: ['Correct', 'rejection'], tag: 'intended', col: C.good, cap: ['Dark pipe is', 'only scenery'] },
  };
  const OUT = {
    start: 'Walk right and try things. Each thing you learn about this level drops a token into the grid.',
    reject: 'Correct rejection: the dark pipe reads as scenery, and it is scenery. Nobody wastes a try on it.',
    hidden: 'Hidden affordance: nothing showed the block, yet it was there. Secrets and Easter eggs live here, and so do advanced techniques like Super Metroid’s wall jump.',
    false: 'False affordance: the ground looked solid and dropped you. In a troll level that is the joke; anywhere else it costs the player’s trust.',
    visible: 'Visible affordance: a pipe in front, with a rim on top, reads as “go in”, and it goes in. Beginners need this cell most.',
    all: 'All four found. Intended: visible affordances and correct rejections. Misleading: false affordances. Secret: hidden affordances, for the players who go looking.',
  };

  /* ---------- the world ---------- */
  function newWorld() {
    return {
      t: 0, x: 2, y: N.groundY, vx: 0, vy: 0, ground: true, face: 1, walkT: 0, lives: N.lives,
      state: 'play', stateT: 0, fakeGone: -1, block: -1, oneUp: null, found: {}, order: [], pops: [], downHeld: 0, last: 'start',
      ap: { hold: 0 },
    };
  }
  const HW = .36, HH = 1.2;   // Mario's half width and height in tiles
  function solids(w) {
    const r = [[-5, N.groundY, N.pit.x0, 30], [N.pit.x1, N.groundY, 60, 30], [N.pipe.x, N.groundY - N.pipe.h, N.pipe.x + N.pipe.w, 30]];
    if (w.fakeGone < 0) r.push([N.fake.x0, N.groundY, N.fake.x1, 30, 'fake']);
    if (w.block >= 0) r.push([N.block.x, N.block.y, N.block.x + 1, N.block.y + 1]);
    return r;
  }
  const overlap = (w, r) => w.x + HW > r[0] && w.x - HW < r[2] && w.y > r[1] && w.y - HH < r[3];
  function find(w, key, x, y, label) {
    if (w.found[key] != null) return;
    w.found[key] = w.t; w.order.push(key); w.last = w.order.length === 4 ? 'all' : key;
    w.pops.push({ t: w.t, x, y, text: label, col: CELLS[key].col });
  }

  function step(w, inp) {
    w.t += DT; w.stateT += DT;
    if (w.state === 'dead') { if (w.stateT > .9) { w.state = 'play'; w.stateT = 0; w.x = N.respawnX; w.y = N.groundY; w.vx = w.vy = 0; w.ground = true; w.face = 1; } stepOneUp(w); return; }
    if (w.state === 'enter') { w.y += 1.5 * DT; if (w.stateT > .8) { w.state = 'clear'; w.stateT = 0; } return; }
    if (w.state === 'clear') return;
    // walking
    const dir = (inp.r ? 1 : 0) - (inp.l ? 1 : 0);
    if (dir) { w.vx += dir * N.accel * DT; w.face = dir; }
    else { const f = N.friction * DT; w.vx = Math.abs(w.vx) <= f ? 0 : w.vx - Math.sign(w.vx) * f; }
    w.vx = clamp(w.vx, -N.maxSpeed, N.maxSpeed);
    if (inp.jump && w.ground && !w.jumpLatch) { w.vy = -N.jumpV; w.ground = false; w.jumpLatch = true; }
    if (!inp.jump) w.jumpLatch = false;
    w.vy = Math.min(w.vy + N.gravity * DT, 22);
    // x then y, against solid rects
    const sol = solids(w);
    w.x += w.vx * DT; w.x = clamp(w.x, .4, N.levelW - .4);
    sol.forEach(r => { if (overlap(w, r)) { if (w.vx > 0) w.x = r[0] - HW; else if (w.vx < 0) w.x = r[2] + HW; w.vx = 0; } });
    const py = w.y; w.y += w.vy * DT; w.ground = false;
    sol.forEach(r => {
      if (!overlap(w, r)) return;
      if (w.vy >= 0 && py <= r[1] + .001) { w.y = r[1]; w.vy = 0; w.ground = true; w.on = r[4] || 'solid'; }
      else if (w.vy < 0) { w.y = r[3] + HH; w.vy = 0; }
    });
    // the invisible block: only there when you hit it from below
    const b = N.block;
    if (w.block < 0 && w.vy < 0 && w.x + HW > b.x + .1 && w.x - HW < b.x + .9 && w.y - HH < b.y + 1 && py - HH >= b.y + 1 - .05) {
      w.y = b.y + 1 + HH; w.vy = 2; w.block = w.t; w.oneUp = { x: b.x + .5, y: b.y, born: w.t, vy: 0, got: -1, lost: false };
    }
    // the ground lip gives way the moment you stand on it
    if (w.ground && w.on === 'fake' && w.fakeGone < 0 && w.x > N.fake.x0 + .15) { w.fakeGone = w.t; w.ground = false; }
    w.on = w.ground ? w.on : null;
    // correct rejection: press down on the dark pipe (or simply walk past it)
    const bp = N.bgPipe, onBp = w.x > bp.x && w.x < bp.x + bp.w;
    w.downHeld = inp.down ? w.downHeld + DT : 0;
    if ((onBp && inp.down && w.ground) || w.x > bp.x + bp.w + .6) find(w, 'reject', bp.x + 1, N.groundY - bp.h - .6, inp.down ? 'nothing to enter' : 'just scenery');
    // enter the pipe
    const p = N.pipe;
    if (inp.down && w.ground && w.y === N.groundY - p.h && Math.abs(w.x - (p.x + p.w / 2)) < .7) {
      w.state = 'enter'; w.stateT = 0; w.vx = 0; w.x = p.x + p.w / 2; find(w, 'visible', p.x + 1, N.groundY - p.h - 2, 'it goes in!');
    }
    if (w.ground) w.walkT += Math.abs(w.vx) * DT;
    stepOneUp(w);
    // fell in the pit
    if (w.y > 12.8 && w.state === 'play') {
      w.state = 'dead'; w.stateT = 0; w.lives--;
      find(w, 'false', N.fake.x0 + 1, N.groundY - 1.4, 'looked solid');
      w.pops.push({ t: w.t, x: N.fake.x0 - 1.5, y: N.groundY - 3, text: '−1 life', col: C.red });
    }
  }
  function stepOneUp(w) {
    const u = w.oneUp; if (!u || u.got >= 0 || u.lost) return;
    const age = w.t - u.born;
    if (age < .5) { u.y = N.block.y - age * 2; }
    else {
      u.x += N.oneUpSpeed * DT;
      const floor = u.x > N.block.x - .45 && u.x < N.block.x + 1.45 ? N.block.y : (u.x > N.pit.x0 + .5 && u.x < N.pit.x1 - .5) ? 99 : N.groundY;
      u.vy += N.gravity * .6 * DT; u.y += u.vy * DT;
      if (u.y >= floor && u.y - u.vy * DT <= floor + .01) { u.y = floor; u.vy = 0; }
      if (u.y > 13) u.lost = true;
    }
    if (age > .5 && w.state === 'play' && Math.abs(u.x - w.x) < .8 && u.y > w.y - HH - .2 && u.y - 1 < w.y) {
      u.got = w.t; w.lives++; find(w, 'hidden', N.block.x + .5, N.block.y - 1.4, 'secret 1-Up');
      w.pops.push({ t: w.t, x: u.x, y: u.y - 1.6, text: '1UP', col: C.good });
    }
  }

  /* ---------- autopilot: Mario finds all four in order ---------- */
  function goto(w, tx) {
    const dx = tx - w.x; if (Math.abs(dx) < .1) return {};
    const stop = w.vx * w.vx / (2 * N.friction);
    if (Math.sign(w.vx) === Math.sign(dx) && stop >= Math.abs(dx)) return {};
    return dx > 0 ? { r: 1 } : { l: 1 };
  }
  function auto(w) {
    if (w.state !== 'play') return {};
    const a = w.ap;
    if (w.t < .6) return {};
    const lastFind = Math.max(-9, ...Object.values(w.found));
    if (w.t - lastFind < N.tourPause && w.ground) return {};   // let the token land before moving on
    if (w.found.reject == null) {
      const g = goto(w, N.bgPipe.x + 1); if (g.r || g.l || Math.abs(w.vx) > .2) return g;
      a.hold += DT; return a.hold > .35 ? { down: 1 } : {};
    }
    if (w.block < 0) {
      const tx = N.block.x + .5, g = goto(w, tx);
      if (Math.abs(w.x - tx) < .25 && w.ground) { a.hold = 0; return { jump: 1 }; }
      return g;
    }
    const u = w.oneUp;
    if (u && u.got < 0 && !u.lost) return w.t - u.born > .7 ? goto(w, u.x + .3) : {};
    if (w.found.false == null) return { r: 1 };
    if (w.x < N.pit.x1 + .2) return w.x > N.pit.x0 - .35 && w.ground ? { r: 1, jump: 1 } : { r: 1 };
    const pc = N.pipe.x + N.pipe.w / 2;
    if (w.ground && w.y === N.groundY - N.pipe.h) return Math.abs(w.x - pc) < .3 && Math.abs(w.vx) < .5 ? { down: 1 } : goto(w, pc);
    if (w.ground && w.x > N.pipe.x - 1.9) return { r: 1, jump: 1 };
    return goto(w, pc);
  }

  /* ---------- drawing the level ---------- */
  function tile(g, tx, ty, x, y) {
    if (ok(IMG.ground)) g.drawImage(IMG.ground, tx * 16, ty * 16, 16, 16, x, y, S, S);
    else { g.fillStyle = ty === 4 || ty === 5 ? '#00c800' : '#d8a038'; g.fillRect(x, y, S, S); }
  }
  // a strip of ground from tile column a to b (exclusive); edges: 'l' and/or 'r' get the cliff tiles
  function groundStrip(g, a, b, edgeL, edgeR, cam, dy = 0) {
    for (let c = a; c < b; c++) for (let r = 0; r < 3; r++) {
      const x = (c - cam) * S, y = (N.groundY + r) * S + dy; if (x < -S || x > N.viewW) continue;
      const L = edgeL && c === a, R = edgeR && c === b - 1;
      if (r === 0) tile(g, L ? 0 : R ? 7 : 3, L ? 5 : R ? 4 : 4, x, y);
      else tile(g, L ? 0 : R ? 7 : 3, L ? 6 : R ? 5 : 6, x, y);
    }
  }
  function pipe(g, px, top, h, cam, dark) {
    const x = (px - cam) * S;
    g.save();
    if (dark) g.filter = 'brightness(.42) saturate(.55) hue-rotate(40deg)';
    for (let i = 0; i < h; i++) {
      const y = (top + i) * S;
      if (ok(IMG.pipe)) g.drawImage(IMG.pipe, 0, i === 0 ? 0 : 16, 32, 16, x, y, S * 2, S);
      else { g.fillStyle = '#00a800'; g.fillRect(x + (i ? 6 : 0), y, S * 2 - (i ? 12 : 0), S); }
    }
    g.restore();
  }
  function mario(g, w, cam) {
    if (w.state === 'clear') return;
    if (w.state === 'dead' && w.stateT > .25) return;
    const air = !w.ground && w.state === 'play', moving = Math.abs(w.vx) > .3;
    const im = air ? IMG['mario-jump'] : moving && Math.floor(w.walkT * 2.2) % 2 ? IMG['mario-walk1'] : IMG['mario-walk0'];
    const x = (w.x - cam) * S, y = w.y * S;
    if (!ok(im)) { g.fillStyle = C.red; g.fillRect(x - 20, y - 58, 40, 58); return; }
    const iw = im.naturalWidth * 3, ih = im.naturalHeight * 3;
    g.save(); g.translate(x, y); if (w.face > 0) g.scale(-1, 1);   // the SMW sprites face left
    g.drawImage(im, -iw / 2, -ih + 3, iw, ih); g.restore();
  }
  function hills(g, cam) {
    // SMW-style background hills and clouds, at half the scroll speed
    const off = cam * S * .5;
    [[60, 300, 170], [420, 250, 210], [780, 320, 150], [1100, 270, 200], [1450, 300, 180]].forEach(([hx, hy, r]) => {
      const x = hx - off; if (x < -r * 1.4 || x > N.viewW + r * 1.4) return;
      g.fillStyle = '#7fd38a'; g.strokeStyle = '#2f7a43'; g.lineWidth = 4;
      g.beginPath(); g.ellipse(x, N.groundY * S, r * .9, N.groundY * S - hy, 0, Math.PI, 0); g.fill(); g.stroke();
      g.fillStyle = '#2f7a43'; for (let k = 0; k < 3; k++) { g.beginPath(); g.ellipse(x - r * .35 + k * r * .3, hy + 60 + k * 18, 6, 10, 0, 0, Math.PI * 2); g.fill(); }
    });
    const coff = cam * S * .25;
    [[120, 90], [520, 60], [900, 110], [1300, 70]].forEach(([cx, cy]) => {
      const x = cx - coff; if (x < -120 || x > N.viewW + 120) return;
      g.fillStyle = '#fff'; g.strokeStyle = '#3b5f8a'; g.lineWidth = 3;
      g.beginPath(); g.ellipse(x, cy, 52, 22, 0, 0, Math.PI * 2); g.ellipse(x + 30, cy - 12, 30, 20, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(x, cy, 52, 22, 0, 0, Math.PI * 2); g.stroke(); g.fill();
      g.fillStyle = '#262c6a'; g.fillRect(x - 10, cy - 6, 4, 8); g.fillRect(x + 6, cy - 6, 4, 8);
    });
  }
  function level(g, w, cam, xray) {
    g.save(); g.beginPath(); g.roundRect(0, 0, N.viewW, H, [14, 0, 0, 14]); g.clip();
    const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#5c94fc'); sky.addColorStop(1, '#a4d0ff');
    g.fillStyle = sky; g.fillRect(0, 0, N.viewW, H);
    hills(g, cam);
    g.imageSmoothingEnabled = false;
    // scenery pipe, behind everything
    pipe(g, N.bgPipe.x, N.groundY - N.bgPipe.h, N.bgPipe.h, cam, true);
    // ground
    const gone = w.fakeGone >= 0;
    groundStrip(g, -1, N.pit.x0, false, gone, cam);
    if (!gone) groundStrip(g, N.fake.x0, N.fake.x1, false, true, cam);
    else { const k = w.t - w.fakeGone; if (k < 1.2) { g.save(); g.globalAlpha = clamp(1.4 - k); groundStrip(g, N.fake.x0, N.fake.x1, false, true, cam, 4 * S * k * k + 30 * k); g.restore(); } }
    groundStrip(g, N.pit.x1, N.levelW + 2, true, false, cam);
    // the 1-Up and the block it came from
    const u = w.oneUp;
    if (u && u.got < 0 && !u.lost && ok(IMG.oneup)) g.drawImage(IMG.oneup, (u.x - cam) * S - S / 2, u.y * S - S, S, S);
    if (w.block >= 0) {
      const k = w.t - w.block, bump = k < .2 ? Math.sin(k / .2 * Math.PI) * 12 : 0;
      if (ok(IMG['used-block'])) g.drawImage(IMG['used-block'], (N.block.x - cam) * S, N.block.y * S - bump, S, S);
    }
    // Mario goes into the pipe behind it
    const entering = w.state === 'enter';
    if (!entering) pipe(g, N.pipe.x, N.groundY - N.pipe.h, N.pipe.h, cam, false);
    mario(g, w, cam);
    if (entering) pipe(g, N.pipe.x, N.groundY - N.pipe.h, N.pipe.h, cam, false);
    g.imageSmoothingEnabled = true;
    if (xray) designer(g, w, cam);
    // ↓ pressed over the dark pipe: nothing happens
    if (w.downHeld > 0 && w.state === 'play') T.label('↓', (w.x - cam) * S, (w.y - HH) * S - 22, 'center', C.ink, 18);
    // pop-up words
    w.pops.forEach(p => { const k = w.t - p.t; if (k < 1.6) T.popText(p.text, (p.x - cam) * S, p.y * S - 30 * k, p.col, 1.6 - k); });
    // HUD
    g.font = '800 22px Montserrat, Jost, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.lineWidth = 5; g.strokeStyle = '#152044';
    g.strokeText('MARIO × ' + w.lives, 18, 28); g.fillStyle = '#fff'; g.fillText('MARIO × ' + w.lives, 18, 28);
    const f = 'FOUND ' + w.order.length + ' / 4'; g.textAlign = 'right'; g.strokeText(f, N.viewW - 18, 28); g.fillStyle = C.gold; g.fillText(f, N.viewW - 18, 28);
    if (w.state === 'clear') T.stamp('COURSE CLEAR!', N.viewW / 2, 200, C.good, clamp(w.stateT * 3), 40);
    g.restore();
  }
  // designer view: what is really possible
  function designer(g, w, cam) {
    const box = (x0, y0, x1, y1, col, text) => {
      const x = (x0 - cam) * S, y = y0 * S, ww = (x1 - x0) * S, hh = (y1 - y0) * S;
      g.save(); g.setLineDash([8, 6]); g.strokeStyle = col; g.lineWidth = 3; g.fillStyle = col + '22'; g.beginPath(); g.rect(x, y, ww, hh); g.fill(); g.stroke(); g.restore();
      T.label(text, x + ww / 2, y - 16, 'center', col, 14);
    };
    box(N.bgPipe.x, N.groundY - N.bgPipe.h, N.bgPipe.x + 2, N.groundY, '#5d618c', 'scenery: no action');
    if (w.block < 0) box(N.block.x, N.block.y, N.block.x + 1, N.block.y + 1, '#b07a0c', 'invisible block');
    if (w.fakeGone < 0) box(N.fake.x0, N.groundY, N.fake.x1, N.groundY + 1, C.red, 'not solid');
    box(N.pipe.x, N.groundY - N.pipe.h, N.pipe.x + 2, N.groundY, C.good, '↓ enters');
  }

  /* ---------- drawing the grid ---------- */
  const GX = 730, GY = 112, CW = 146, CH = 196;
  function token(g, key, x, y) {
    g.imageSmoothingEnabled = false;
    if (key === 'visible' && ok(IMG.pipe)) g.drawImage(IMG.pipe, x - 32, y - 32, 64, 64);
    if (key === 'reject' && ok(IMG.pipe)) { g.save(); g.filter = 'brightness(.42) saturate(.55) hue-rotate(40deg)'; g.drawImage(IMG.pipe, x - 32, y - 32, 64, 64); g.restore(); }
    if (key === 'hidden' && ok(IMG.oneup)) g.drawImage(IMG.oneup, x - 28, y - 28, 56, 56);
    if (key === 'false' && ok(IMG.ground)) { g.drawImage(IMG.ground, 48, 64, 16, 32, x - 34, y - 30, 32, 64); g.drawImage(IMG.ground, 112, 64, 16, 32, x + 2, y - 26, 32, 64); g.fillStyle = 'rgba(229,50,45,.9)'; g.fillRect(x - 2, y - 30, 4, 60); }
    g.imageSmoothingEnabled = true;
  }
  function grid(g, w) {
    txt(g, 'The affordance grid', GX - 40, 30, '800 20px Montserrat, Jost, sans-serif');
    txt(g, 'Action possible?', GX + CW, 64, '800 14px Montserrat, Jost, sans-serif', C.muted, 'center');
    txt(g, 'yes', GX + CW / 2, 90, '700 14px Jost, sans-serif', C.ink, 'center'); txt(g, 'no', GX + CW * 1.5, 90, '700 14px Jost, sans-serif', C.ink, 'center');
    g.save(); g.translate(GX - 32, GY + CH); g.rotate(-Math.PI / 2); txt(g, 'Player perceives it?', 0, 0, '800 14px Montserrat, Jost, sans-serif', C.muted, 'center'); g.restore();
    txt(g, 'yes', GX - 12, GY + CH / 2, '700 14px Jost, sans-serif', C.ink, 'center'); txt(g, 'no', GX - 12, GY + CH * 1.5, '700 14px Jost, sans-serif', C.ink, 'center');
    Object.entries(CELLS).forEach(([key, c]) => {
      const x = GX + c.c * CW, y = GY + c.r * CH, at = w.found[key], got = at != null, k = got ? clamp((w.t - at) / .5) : 0;
      const fresh = got && w.t - at < 1.2;
      g.fillStyle = got ? '#fffaf0' : 'rgba(255,250,240,.55)'; g.strokeStyle = fresh ? c.col : '#cdbf9f'; g.lineWidth = fresh ? 4 : 2;
      g.beginPath(); g.roundRect(x + 4, y + 4, CW - 8, CH - 8, 10); g.fill(); g.stroke();
      txt(g, c.name[0], x + CW / 2, y + 24, '800 15px Montserrat, Jost, sans-serif', C.ink, 'center');
      txt(g, c.name[1], x + CW / 2, y + 42, '800 15px Montserrat, Jost, sans-serif', C.ink, 'center');
      // tag chip
      g.font = '700 13px Jost, sans-serif'; const tw = g.measureText(c.tag).width + 16;
      g.fillStyle = c.col + '22'; g.strokeStyle = c.col; g.lineWidth = 1.5; g.beginPath(); g.roundRect(x + CW / 2 - tw / 2, y + 54, tw, 20, 10); g.fill(); g.stroke();
      txt(g, c.tag, x + CW / 2, y + 64.5, '700 13px Jost, sans-serif', c.col, 'center');
      const ty = y + 112;
      if (!got) { g.save(); g.setLineDash([5, 5]); g.strokeStyle = '#cdbf9f'; g.lineWidth = 2; g.beginPath(); g.roundRect(x + CW / 2 - 30, ty - 30, 60, 60, 8); g.stroke(); g.restore(); txt(g, '?', x + CW / 2, ty, '800 26px Montserrat, Jost, sans-serif', '#cdbf9f', 'center'); return; }
      // the token drops in and bounces
      const drop = k < 1 ? -120 * (1 - ease(k)) + Math.sin(k * Math.PI) * -10 : 0;
      g.save(); g.beginPath(); g.rect(x + 4, y + 76, CW - 8, CH - 80); g.clip(); token(g, key, x + CW / 2, ty + drop); g.restore();
      txt(g, c.cap[0], x + CW / 2, y + 155, '600 13px Jost, sans-serif', C.ink, 'center');
      txt(g, c.cap[1], x + CW / 2, y + 171, '600 13px Jost, sans-serif', C.ink, 'center');
    });
    // the extras the deck's notes add
    const ex = [];
    if (w.found.false != null) ex.push(['False affordances: ', 'the stuff of troll levels.', C.red]);
    if (w.found.hidden != null) ex.push(['Hidden: ', 'secrets, Easter eggs, Super Metroid’s wall jump.', '#b07a0c']);
    ex.forEach(([a, b, col], i) => { const y = GY + CH * 2 + 22 + i * 22; txt(g, a, GX - 40, y, '700 13px Jost, sans-serif', col); const aw = g.measureText(a).width; txt(g, b, GX - 40 + aw, y, '500 13px Jost, sans-serif', C.ink); });
  }

  /* ---------- slide 1: the level ---------- */
  canvasDemo('level', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, w: newWorld(), frames: 0, keys: {}, xray: false, key: '' };
    const tourBtn = $(s, '.ag-tour'), xr = $(s, '.ag-xray');
    const free = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); st.w = newWorld(); } };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; st.w = newWorld(); st.frames = 0; tourBtn.classList.add('on'); };
    $(s, '.ag-reset').onclick = () => { st.tour = false; tourBtn.classList.remove('on'); st.w = newWorld(); };
    xr.onchange = () => { st.xray = xr.checked; };
    const MAP = { ArrowLeft: 'l', ArrowRight: 'r', ArrowUp: 'jump', ArrowDown: 'down', Space: 'jump', KeyZ: 'jump', KeyX: 'jump' };
    document.addEventListener('keydown', e => {
      if (!s.classList.contains('active') || !MAP[e.code]) return;
      e.stopPropagation(); e.preventDefault(); free(); st.keys[MAP[e.code]] = 1;
    });
    document.addEventListener('keyup', e => { if (MAP[e.code]) st.keys[MAP[e.code]] = 0; });
    function render() {
      const w = st.w;
      const cam = clamp(w.x - 6, 0, N.levelW - N.viewW / S);
      T.use(g); panel(g);
      level(g, w, cam, st.xray);
      grid(g, w);
      const key = [w.order.join(), w.lives, w.state].join(); if (key === st.key) return; st.key = key;
      say($(s, '.ag-stats'), `<div class="g"><b>${w.order.length} / 4</b><span>cells of the grid found</span></div><div><b>${w.lives}</b><span>lives (1-Up found: +1, false ground: −1)</span></div><div class="y"><b>${w.order.length ? CELLS[w.order.at(-1)].tag : '–'}</b><span>last find</span></div>`);
      say($(s, '.ag-out'), OUT[w.last]);
    }
    apis.level = {
      seek(t) { st.held = st.tour = true; st.w = newWorld(); const n = Math.round(t * 60); for (let i = 0; i < n; i++) step(st.w, auto(st.w)); render(); },
      dur: () => N.tourDur,
    };
    return dt => {
      if (st.held) return render();
      dt = Math.min(Math.max(0, dt), .1);
      if (st.tour) {
        st.t += dt; if (st.t > N.tourDur) { st.t = 0; st.w = newWorld(); }
        const n = Math.round(st.t * 60); while (st.w.t * 60 < n - .5) step(st.w, auto(st.w));
      } else { st.acc = (st.acc || 0) + dt; while (st.acc >= DT) { step(st.w, st.keys); st.acc -= DT; } }
      render();
    };
  }, { leave(s) { } });

  /* ---------- slide 2: natural language ----------
     Real Ooblets cards (Glumberland, 2022; card images from the Ooblets Wiki, ooblets.fandom.com):
       One Step Pep (basic move, 2 beats): "Gain 1 hype"
       Flummoxtrot (Nuppo's level 3 signature move, 3 beats): "Earn 5 points and add 1 fluster to opponent team"
       Lil Lindy (basic move, 1 beat): "Earn 2 points", used for the worked example.
     What they do in the game (Ooblets Wiki, "Dance Battle"): a dance-off is a turn-based card game. Each turn a team
     draws a hand and spends beats to play moves; the first team to the point goal wins (25 points in a 2 vs 2).
     Hype adds 1 point to every move the team plays, per hype, for the rest of the battle. Fluster takes 1 point off
     every move, per fluster. Hype and fluster offset each other. The overlays in sets 1 and 2 are our rewrites. */
  const OOB = {};
  ['one-step-pep', 'flummoxtrot', 'lil-lindy'].forEach(n => { const i = new Image(); i.src = '../img/affordance-grid/ooblets-' + n + '.png'; OOB[n] = i; });
  const CARDS = [
    { img: 'one-step-pep', bg: '#f9f5e4', ink: '#5a4a3a', em: '#7b4fd6' },
    { img: 'flummoxtrot', bg: '#2e0646', ink: '#ffffff', em: '#c9a8ff' },
  ];
  const SETS = [
    { name: 'Ooblets’ words, as printed', rules: null,
      think: '“Gain 1 hype... what is hype for? And what does fluster do to them?”',
      cell: 'hidden', learn: 2, read: 0, tone: 'kept',
      out: 'Both cards work, but a first-time reader can’t see what “hype” or “fluster” will do. The action is possible and not perceived: a hidden affordance until the game teaches it.' },
    { name: 'Battle words', rules: [['+1 damage on', 'every attack'], ['Deal 5 damage.', 'Enemy attacks', 'deal 1 less']],
      think: '“More damage for me, less for them. Got it.”',
      cell: 'visible', learn: 0, read: 2, tone: 'lost',
      out: 'Combat words read at a glance, so both cards become visible affordances. But damage and attacks are fighting-game language in a cozy dance-off, so the tone pays for the clarity.' },
    { name: 'Ooblets’ word + what it does', rules: [['Gain 1 hype:', 'your moves score', '+1 point'], ['Earn 5 points.', '1 fluster: their', 'moves score 1 less']],
      think: '“Hype makes my moves score more. Fluster makes theirs score less.”',
      cell: 'visible', learn: 0, read: 2, tone: 'kept',
      out: 'Keep the flavour word and say what it does in words players already know. The action becomes visible and the dance-off keeps its tone.' },
  ];
  function oobCard(g, k, rules, x, y, w) {
    const c = CARDS[k], im = OOB[c.img], h = w * 372 / 268, s = w / 268;
    g.fillStyle = 'rgba(40,30,20,.18)'; g.beginPath(); g.roundRect(x + 5, y + 7, w, h, 14 * s); g.fill();
    if (ok(im)) g.drawImage(im, x, y, w, h); else { g.fillStyle = c.bg; g.fillRect(x, y, w, h); }
    if (!rules) return;
    // our rewrite, printed over the card's own rules box in its own colours
    g.fillStyle = c.bg; g.fillRect(x + 22 * s, y + 246 * s, 224 * s, 100 * s);
    rules.forEach((l, i) => txt(g, l, x + w / 2, y + (296 + (i - (rules.length - 1) / 2) * 27) * s, `800 ${Math.round(21 * s)}px Jost, sans-serif`, i === 0 ? c.em : c.ink, 'center'));
  }
  function miniGrid(g, x0, y0, cell, a) {
    const cw = 140, ch = 74, cells = [['visible', 0, 0, 'Visible', C.good], ['false', 0, 1, 'False', C.red], ['hidden', 1, 0, 'Hidden', '#b07a0c'], ['reject', 1, 1, 'Correct rejection', C.good]];
    txt(g, 'Where the cards land for a first-time reader', x0 - 110, y0 - 44, '800 17px Montserrat, Jost, sans-serif');
    txt(g, 'possible: yes', x0 + cw / 2, y0 - 12, '700 13px Jost, sans-serif', C.muted, 'center'); txt(g, 'no', x0 + cw * 1.5, y0 - 12, '700 13px Jost, sans-serif', C.muted, 'center');
    cells.forEach(([k, r, c, name, col]) => {
      const x = x0 + c * cw, y = y0 + r * ch, on = k === cell;
      g.fillStyle = on ? col + '26' : 'rgba(255,250,240,.7)'; g.strokeStyle = on ? col : '#cdbf9f'; g.lineWidth = on ? 4 : 2;
      g.beginPath(); g.roundRect(x + 3, y + 3, cw - 6, ch - 6, 10); g.fill(); g.stroke();
      txt(g, name, x + cw / 2, y + 22, `${on ? 800 : 600} ${name.length > 10 ? 13 : 15}px Montserrat, Jost, sans-serif`, on ? col : C.muted, 'center');
      if (on) { g.save(); g.globalAlpha = a; g.fillStyle = col; g.beginPath(); g.arc(x + cw / 2, y + 50, 13, 0, Math.PI * 2); g.fill(); g.restore(); txt(g, '2', x + cw / 2, y + 51, '800 14px Montserrat, Jost, sans-serif', '#fff', 'center'); }
    });
    txt(g, 'perceives: yes', x0 - 8, y0 + ch / 2, '700 13px Jost, sans-serif', C.muted, 'right');
    txt(g, 'no', x0 - 8, y0 + ch * 1.5, '700 13px Jost, sans-serif', C.muted, 'right');
  }
  function howItWorks(g, x, y, t) {
    g.fillStyle = 'rgba(255,250,240,.9)'; g.strokeStyle = '#cdbf9f'; g.lineWidth = 2; g.beginPath(); g.roundRect(x, y, 450, 192, 12); g.fill(); g.stroke();
    txt(g, 'What the cards do in Ooblets', x + 16, y + 22, '800 17px Montserrat, Jost, sans-serif');
    [['A dance-off is a turn-based card game. Each turn you draw', C.ink], ['a hand and spend beats on moves; first team to 25 points wins.', C.ink],
     ['Hype: every move your team plays scores +1 point per hype.', '#c2410c'], ['Fluster: every move scores 1 point less per fluster.', '#15803d']]
      .forEach(([l, col], i) => txt(g, l, x + 16, y + 50 + i * 22, '500 15px Jost, sans-serif', col));
    const im = OOB['lil-lindy'], cw = 44, chh = cw * 372 / 268, cy = y + 132;
    if (ok(im)) g.drawImage(im, x + 18, cy - 6, cw, chh);
    txt(g, 'Lil Lindy, “Earn 2 points”, scores:', x + 84, cy + 4, '600 14px Jost, sans-serif', C.muted);
    const k = Math.floor(t / 1.6) % 3;
    [['no status', '2', C.ink], ['1 hype', '3', '#c2410c'], ['1 fluster', '1', '#15803d']].forEach(([lab, v, col], i) => {
      const bx = x + 84 + i * 118, on = i === k;
      g.fillStyle = on ? col + '1f' : 'rgba(255,255,255,.6)'; g.strokeStyle = on ? col : '#d8ccb0'; g.lineWidth = on ? 3 : 1.5;
      g.beginPath(); g.roundRect(bx, cy + 18, 108, 36, 8); g.fill(); g.stroke();
      txt(g, v, bx + 18, cy + 37, '800 20px Montserrat, Jost, sans-serif', col, 'center');
      txt(g, lab, bx + 34, cy + 37, '600 14px Jost, sans-serif', on ? col : C.muted);
    });
  }
  canvasDemo('words', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, set: 0, swapT: -9, key: '' };
    const tourBtn = $(s, '.wd-tour');
    const free = () => { st.tour = false; tourBtn.classList.remove('on'); };
    $$(s, '.wd-set .btn').forEach(b => b.onclick = () => { free(); st.set = +b.dataset.i; st.swapT = st.t; });
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    const DUR = 18;
    function render() {
      let set = st.set, since = st.t - st.swapT;
      if (st.tour) { set = Math.floor(st.t / 6) % 3; since = st.t % 6; }
      const S2 = SETS[set], a = clamp(since / .35);
      $$(s, '.wd-set .btn').forEach(b => b.classList.toggle('on', +b.dataset.i === set));
      T.use(g); panel(g);
      txt(g, 'Same two Ooblets cards, same rules. Only the words change.', 30, 30, '800 20px Montserrat, Jost, sans-serif');
      txt(g, S2.name, 30, 56, '600 17px Jost, sans-serif', C.muted);
      const flip = since < .35 ? Math.abs(Math.cos(since / .35 * Math.PI)) : 1, cw = 200;
      [0, 1].forEach(i => {
        const x = 30 + i * 230, y = 74;
        g.save(); g.translate(x + cw / 2, 0); g.scale(Math.max(.04, flip), 1); g.translate(-(x + cw / 2), 0);
        oobCard(g, i, S2.rules && S2.rules[i], x, y, cw); g.restore();
      });
      howItWorks(g, 20, 378, st.t);
      miniGrid(g, 640, 120, S2.cell, a);
      // the first-time reader
      const by = 300;
      T.player(530, by + 46, -Math.PI / 2, 1);
      g.fillStyle = '#fffaf0'; g.strokeStyle = C.navy; g.lineWidth = 2.5;
      g.beginPath(); g.roundRect(566, by, 450, 92, 16); g.fill(); g.stroke();
      g.save(); g.globalAlpha = a;
      g.font = 'italic 600 17px Jost, sans-serif'; const ws = S2.think.split(' '), ls = []; let cur = '';
      ws.forEach(wd => { const tr = cur ? cur + ' ' + wd : wd; if (g.measureText(tr).width > 410) { ls.push(cur); cur = wd; } else cur = tr; }); ls.push(cur);
      ls.forEach((l, i) => txt(g, l, 586, by + 46 + (i - (ls.length - 1) / 2) * 24, 'italic 600 17px Jost, sans-serif', C.ink));
      g.restore();
      txt(g, 'a first-time reader', 586, by + 108, '600 14px Jost, sans-serif', C.muted);
      txt(g, 'Natural language is important!', 500, 470, '800 22px Montserrat, Jost, sans-serif', C.ink);
      txt(g, 'Flavour words work once they are taught;', 500, 502, '500 16px Jost, sans-serif', C.muted);
      txt(g, 'words players already know need no teaching.', 500, 526, '500 16px Jost, sans-serif', C.muted);
      const key = String(set); if (key === st.key) return; st.key = key;
      say($(s, '.wd-stats'), `<div class="${S2.learn ? 'y' : 'g'}"><b>${S2.learn}</b><span>new words to learn before the cards make sense</span></div><div class="${S2.read ? 'g' : 'r'}"><b>${S2.read} / 2</b><span>cards a first-time reader can act on</span></div><div class="${S2.tone === 'kept' ? 'g' : 'r'}"><b>${S2.tone}</b><span>the cozy dance-off tone</span></div>`);
      say($(s, '.wd-out'), S2.out);
    }
    apis.words = { seek(t) { st.held = st.tour = true; st.t = t; render(); }, dur: () => DUR };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > DUR) st.t = 0; render(); };
  });

  window.__seek = (t, w) => apis[w || 'level'].seek(t);
  window.__dur = w => apis[w || 'level'].dur();
})();
