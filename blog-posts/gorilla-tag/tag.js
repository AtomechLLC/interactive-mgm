/* Infection tag (genre breakdown: "How to Make a Game Like Gorilla Tag?").
   A top-down forest clearing. Nobody has a walk button: every gorilla moves only by arm strokes. A stroke against the
   ground gives a small shove; a stroke against a tree trunk or the rock wall pushes off a solid surface and gives a big
   one, so the fast players are the ones who travel from trunk to trunk. Speed bleeds away between strokes. One gorilla
   starts infected (lava orange) and every gorilla it touches joins its side. Play it yourself (hold W, A, S, D, or hold
   the mouse) or watch the walk-through run the same round twice: runners who stroke only against the
   ground, then runners who push off trunks. All values are illustrative. */
(function () {
  const C = TD.C, { clamp } = TD;
  const AX0 = 20, AY0 = 20, AX1 = 640, AY1 = 565, R = 14, DT = 1 / 120;
  const CD = .26, GROUND = 150, SURF = 310, CAP_G = 290, CAP_S = 470, FR = 1.7, REACH = 34, INF_K = 1.1, FREEZE = 1;
  const TREES = [[150, 130, 24], [330, 95, 20], [520, 150, 26], [250, 280, 28], [440, 300, 22], [110, 420, 26], [330, 470, 24], [560, 440, 22], [200, 525, 18], [600, 290, 18]];
  const STARTS = [[330, 200], [560, 540], [70, 250], [480, 520], [80, 540]];   // 0 is the infected one, 1 is you
  const ROUND = 30, DANGER = 190;
  const len = (x, y) => Math.hypot(x, y) || 1e-9;

  function world(seed, policy) {
    const rnd = GK.rng(seed);
    const G = STARTS.map(([x, y], i) => ({ x, y, vx: 0, vy: 0, cd: rnd() * CD, hand: 0, hands: [null, null], inf: i === 0, frz: 0, strokes: 0, pushes: 0, out: null, face: [1, 0] }));
    return { G, time: 0, policy, rnd, tags: [] };
  }
  // the nearest pushable surface within reach: trunk or arena wall, with its outward normal and contact point
  function surface(b) {
    let best = null;
    TREES.forEach(([x, y, r], ti) => { const dx = b.x - x, dy = b.y - y, d = len(dx, dy), gap = d - r - R; if (gap < REACH && (!best || gap < best.gap)) best = { gap, n: [dx / d, dy / d], p: [x + dx / d * r, y + dy / d * r], ti }; });
    [[b.x - AX0, [1, 0], [AX0, b.y]], [AX1 - b.x, [-1, 0], [AX1, b.y]], [b.y - AY0, [0, 1], [b.x, AY0]], [AY1 - b.y, [0, -1], [b.x, AY1]]].forEach(([d, n, p]) => { const gap = d - R; if (gap < REACH && (!best || gap < best.gap)) best = { gap, n, p, ti: -1 }; });
    return best;
  }
  function stroke(W, b, dir, useSurf) {
    const k = b.inf ? INF_K : 1, sp = len(b.vx, b.vy), s = surface(b);
    let imp = GROUND * k, cap = Math.max(CAP_G * k, sp), d = dir, hand;
    if (useSurf && s && d[0] * s.n[0] + d[1] * s.n[1] > .25) {
      // push off the surface: aim between where you want to go and straight away from it
      const bx = d[0] + s.n[0] * .6, by = d[1] + s.n[1] * .6, l = len(bx, by); d = [bx / l, by / l];
      imp = SURF * k; cap = Math.max(CAP_S * k, sp); hand = s.p.slice(); b.pushes++;
    } else {
      const side = b.hand ? 1 : -1; hand = [b.x - d[0] * 26 - d[1] * 12 * side, b.y - d[1] * 26 + d[0] * 12 * side];
    }
    b.vx += d[0] * imp; b.vy += d[1] * imp;
    const v = len(b.vx, b.vy); if (v > cap) { b.vx *= cap / v; b.vy *= cap / v; }
    b.hands[b.hand] = { p: hand, t: W.time, surf: imp > GROUND * k * 1.5 }; b.hand ^= 1; b.cd = CD; b.strokes++;
  }
  // a stroke straight into a trunk you are touching goes nowhere: slide the aim along the bark instead
  function slide(b, d) {
    TREES.forEach(([x, y, r]) => { const dx = b.x - x, dy = b.y - y, l = len(dx, dy); if (l - r - R < 6) { const nx = dx / l, ny = dy / l, dn = d[0] * nx + d[1] * ny; if (dn < 0) { d = [d[0] - dn * nx, d[1] - dn * ny]; const m = len(...d); d = m < .2 ? [-ny, nx] : [d[0] / m, d[1] / m]; } } });
    return d;
  }
  // where each AI wants to go
  function aim(W, b) {
    const G = W.G;
    if (b.inf) {
      let tg = null, bd = 1e9;
      G.forEach(o => { if (!o.inf) { const d = len(o.x - b.x, o.y - b.y); if (d < bd) { bd = d; tg = o; } } });
      if (!tg) return null;
      const lead = Math.min(.5, bd / 500), tx = tg.x + tg.vx * lead - b.x, ty = tg.y + tg.vy * lead - b.y, l = len(tx, ty);
      let d = [tx / l, ty / l];
      // steer round a trunk in the way
      TREES.forEach(([x, y, r]) => { const ox = x - b.x, oy = y - b.y, along = ox * d[0] + oy * d[1]; if (along > 0 && along < bd) { const perp = ox * d[1] - oy * d[0]; if (Math.abs(perp) < r + R + 6) { const sgn = perp > 0 ? 1 : -1; d = [d[0] + d[1] * sgn * .9, d[1] - d[0] * sgn * .9]; } } });
      const l2 = len(...d); return slide(b, [d[0] / l2, d[1] / l2]);
    }
    // runners: hide on the far side of a trunk; when the lava gets close, break away (off the trunk, if allowed)
    let th = null, dd = 1e9;
    G.forEach(o => { if (o.inf && o.frz <= 0) { const d = len(o.x - b.x, o.y - b.y); if (d < dd) { dd = d; th = o; } } });
    if (!th) return null;
    const wall = d => 90 / Math.max(10, d - R);
    if (dd < DANGER) {
      let fx = (b.x - th.x) / dd, fy = (b.y - th.y) / dd;
      fx += wall(b.x - AX0) - wall(AX1 - b.x); fy += wall(b.y - AY0) - wall(AY1 - b.y);
      const l = len(fx, fy); return slide(b, [fx / l, fy / l]);
    }
    if (b.goal == null || W.time > b.goalT) {
      // the trunk that is far from the lava and not much farther from me; ties broken by a little noise
      let bi = 0, bs = -1e9;
      TREES.forEach(([x, y], i) => { const sc = len(x - th.x, y - th.y) - .8 * len(x - b.x, y - b.y) + W.rnd() * 30; if (sc > bs) { bs = sc; bi = i; } });
      b.goal = bi; b.goalT = W.time + 2.5;
    }
    const [x, y, r] = TREES[b.goal], ax = x - th.x, ay = y - th.y, al = len(ax, ay);
    const gx = x + ax / al * (r + R + 4) - b.x, gy = y + ay / al * (r + R + 4) - b.y, gl = len(gx, gy);
    if (gl < 10) { b.vx *= .8; b.vy *= .8; return null; }
    return [gx / gl, gy / gl];
  }
  function step(W, you) {
    const G = W.G, t = W.time;
    G.forEach((b, i) => {
      if (b.out != null && !b.inf) return;
      if (b.frz > 0) { b.frz -= DT; b.vx *= .9; b.vy *= .9; }
      else {
        b.cd -= DT;
        const dir = i === 1 && you ? you() : aim(W, b);
        if (dir) b.face = dir;
        if (dir && b.cd <= 0) stroke(W, b, dir, i === 1 && you ? true : b.inf ? false : W.policy === 'trunks');
      }
      const f = Math.exp(-FR * DT); b.vx *= f; b.vy *= f;
      b.x += b.vx * DT; b.y += b.vy * DT;
      // solid trunks and rock
      TREES.forEach(([x, y, r]) => { const dx = b.x - x, dy = b.y - y, d = len(dx, dy), m = r + R; if (d < m) { const nx = dx / d, ny = dy / d; b.x = x + nx * m; b.y = y + ny * m; const vn = b.vx * nx + b.vy * ny; if (vn < 0) { b.vx -= vn * nx; b.vy -= vn * ny; } } });
      if (b.x < AX0 + R) { b.x = AX0 + R; b.vx = Math.max(0, b.vx); } if (b.x > AX1 - R) { b.x = AX1 - R; b.vx = Math.min(0, b.vx); }
      if (b.y < AY0 + R) { b.y = AY0 + R; b.vy = Math.max(0, b.vy); } if (b.y > AY1 - R) { b.y = AY1 - R; b.vy = Math.min(0, b.vy); }
    });
    // tags
    G.forEach(a => { if (!a.inf || a.frz > 0) return; G.forEach(b => { if (!b.inf && len(a.x - b.x, a.y - b.y) < 2 * R + 4) { b.inf = true; b.out = t; b.frz = FREEZE; b.vx *= .2; b.vy *= .2; W.tags.push({ t, x: b.x, y: b.y }); } }); });
    W.time += DT;
  }

  // drawing
  const FUR = '#3d3631', FUR_DK = '#26211d', FACE = '#8c7a6b', LAVA = '#ff6a1f', LAVA_DK = '#b8360b';
  function gorilla(g, b, t, you) {
    const lava = b.inf, body = lava ? LAVA : FUR, dk = lava ? LAVA_DK : FUR_DK;
    if (lava) { const gl = g.createRadialGradient(b.x, b.y, R * .6, b.x, b.y, R * 2.4); gl.addColorStop(0, 'rgba(255,120,30,.45)'); gl.addColorStop(1, 'rgba(255,120,30,0)'); g.fillStyle = gl; g.beginPath(); g.arc(b.x, b.y, R * 2.4, 0, 6.283); g.fill(); }
    // arms: a planted hand stays where it pushed for a moment, the other swings back to the shoulder
    const [fx, fy] = b.face;
    for (let h = 0; h < 2; h++) {
      const side = h ? 1 : -1, sh = [b.x - fy * R * .8 * side, b.y + fx * R * .8 * side], H = b.hands[h];
      const age = H ? t - H.t : 9, planted = H && age < .2;
      const hp = planted ? H.p : [sh[0] + fx * 12, sh[1] + fy * 12];
      g.strokeStyle = dk; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(sh[0], sh[1]); g.lineTo(hp[0], hp[1]); g.stroke();
      g.fillStyle = planted && H.surf ? C.gold : dk; g.beginPath(); g.arc(hp[0], hp[1], planted && H.surf ? 6 : 4.5, 0, 6.283); g.fill();
    }
    g.fillStyle = body; g.beginPath(); g.arc(b.x, b.y, R, 0, 6.283); g.fill();
    g.strokeStyle = dk; g.lineWidth = 2; g.stroke();
    g.fillStyle = lava ? '#ffd2a8' : FACE; g.beginPath(); g.ellipse(b.x + fx * 7, b.y + fy * 7, 6.5, 6.5, 0, 0, 6.283); g.fill();
    if (you) { g.strokeStyle = '#2e8ff0'; g.lineWidth = 3; g.beginPath(); g.arc(b.x, b.y, R + 5, 0, 6.283); g.stroke(); GK.text(g, 'you', b.x, b.y - R - 9, '#1c6fc4', 12, 'center', 800); }
    if (b.frz > 0) GK.text(g, 'tagged!', b.x, b.y + R + 16, LAVA_DK, 12, 'center', 800);
  }

  GK.scene('tag', (s, g, ui) => {
    const nb = s.querySelector('.gt-new'); ui.watch(nb);
    let t0 = 0, keys = new Set(), mouse = null, W = null, key = '';
    const cv = g.canvas;
    const toCanvas = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; };
    const start = () => { ui.stopTour(); t0 = ui.t; W = null; key = ''; };
    nb.onclick = start;
    cv.addEventListener('mousedown', e => { if (ui.tour) start(); mouse = toCanvas(e); });
    cv.addEventListener('mousemove', e => { if (mouse) mouse = toCanvas(e); });
    window.addEventListener('mouseup', () => { mouse = null; });
    const KD = { w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] };   // not the arrow keys: those turn the slides
    window.addEventListener('keydown', e => { const k = e.key.toLowerCase(); if (!KD[k] || e.target.tagName === 'INPUT') return; if (!s.classList.contains('active')) return; e.preventDefault(); if (ui.tour) start(); keys.add(k); });
    window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
    const you = () => {
      const b = W.G[1];
      if (mouse) { const dx = mouse[0] - b.x, dy = mouse[1] - b.y, l = len(dx, dy); return l > 8 ? [dx / l, dy / l] : null; }
      let x = 0, y = 0; keys.forEach(k => { x += KD[k][0]; y += KD[k][1]; }); const l = Math.hypot(x, y); return l ? [x / l, y / l] : null;
    };
    const ACTS = [{ to: ROUND + 3, policy: 'ground' }, { to: 2 * ROUND + 6, policy: 'trunks' }];
    const best = {};
    ['ground', 'trunks'].forEach(pol => { const F = world(7, pol); while (F.time < ROUND - 1e-9 && F.G.some(b => !b.inf)) step(F, null); best[pol] = F.G.slice(1).map(b => b.out == null ? ROUND : b.out); });
    return {
      dur: 2 * ROUND + 6,
      frame(t, tour) {
        let target, policy, k2, player = false;
        if (tour) { const [a, , i] = GK.act(ACTS, t); policy = a.policy; target = Math.min(ROUND, t - (i ? ACTS[0].to : 0)); k2 = 'tour' + i; }
        else { policy = 'trunks'; player = true; target = Math.min(ROUND, t - t0); k2 = 'you' + t0; }
        if (!W || key !== k2 || W.time > target + 1e-6) { W = world(7, policy); key = k2; }
        let n = 0; while (W.time < target - 1e-9 && n++ < 8000 && W.G.some(b => !b.inf)) step(W, player ? you : null);
        const G = W.G, left = G.filter(b => !b.inf).length, over = left === 0 || W.time >= ROUND - 1e-6;
        GK.panel(g);
        // arena
        g.fillStyle = '#7d766c'; g.beginPath(); g.roundRect(AX0 - 10, AY0 - 10, AX1 - AX0 + 20, AY1 - AY0 + 20, 14); g.fill();
        g.fillStyle = '#9fc77d'; g.fillRect(AX0, AY0, AX1 - AX0, AY1 - AY0);
        const rr = GK.rng(3); for (let i = 0; i < 90; i++) { g.fillStyle = 'rgba(70,120,50,.25)'; g.beginPath(); g.arc(AX0 + rr() * (AX1 - AX0), AY0 + rr() * (AY1 - AY0), 2 + rr() * 5, 0, 6.283); g.fill(); }
        W.tags.forEach(p => { const a = W.time - p.t; if (a < 1) { g.strokeStyle = `rgba(255,106,31,${1 - a})`; g.lineWidth = 3; g.beginPath(); g.arc(p.x, p.y, R + 40 * a, 0, 6.283); g.stroke(); } });
        // trunks, with a gold ring when the player can push off it
        const me = G[1], ms = !me.inf || !tour ? surface(me) : null;
        TREES.forEach(([x, y, r], ti) => {
          g.fillStyle = 'rgba(40,90,30,.22)'; g.beginPath(); g.arc(x, y, r + 14, 0, 6.283); g.fill();
          g.fillStyle = '#6e4a2b'; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill();
          g.strokeStyle = '#4d321c'; g.lineWidth = 3; g.stroke();
          g.strokeStyle = '#8a6342'; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, r * .55, 0, 6.283); g.stroke();
          if (ms && ms.ti === ti) { g.strokeStyle = C.gold; g.lineWidth = 3; g.setLineDash([5, 4]); g.beginPath(); g.arc(x, y, r + 6, 0, 6.283); g.stroke(); g.setLineDash([]); }
        });
        G.forEach((b, i) => { if (i !== 1) gorilla(g, b, W.time, false); }); gorilla(g, me, W.time, true);
        // HUD
        const HX = 664;
        GK.head(g, tour ? (policy === 'ground' ? 'Runners stroke on the ground only' : 'Runners push off trunks') : 'You are playing', HX, 44, 'left', C.ink, 17);
        GK.text(g, tour ? 'walk-through: the same round, two habits' : 'hold W A S D, or hold the mouse button', HX, 66, C.muted, 13, 'left', 600);
        GK.big(g, `${Math.max(0, ROUND - W.time).toFixed(1)} s`, 'left in the round', HX, 120, C.ink);
        GK.big(g, `${left} of 4`, 'runners still free', HX + 190, 120, left ? C.good : C.redDk);
        const sp = len(me.vx, me.vy);
        GK.text(g, `${tour ? 'blue-ringed runner' : 'your'} speed`, HX, 162, C.muted, 12, 'left', 700);
        GK.box(g, HX, 170, 340, 16, '#efe6d2', null, 8);
        g.fillStyle = sp > CAP_G + 5 ? C.gold : '#5f8f4a'; g.beginPath(); g.roundRect(HX, 170, 340 * clamp(sp / (CAP_S * 1.05)), 16, 8); g.fill();
        g.strokeStyle = C.ink; g.lineWidth = 2; const gx = HX + 340 * CAP_G / (CAP_S * 1.05); g.beginPath(); g.moveTo(gx, 166); g.lineTo(gx, 190); g.stroke();
        GK.text(g, 'ground strokes top out here', gx, 204, C.muted, 11, 'center', 600);
        GK.text(g, `${me.strokes} strokes · ${me.pushes} off a trunk or the rock`, HX, 226, C.ink, 13, 'left', 600);
        // survival per runner
        GK.head(g, 'Time each runner stayed free', HX, 262, 'left', C.ink, 14);
        G.slice(1).forEach((b, i) => {
          const y = 276 + i * 26, v = b.out == null ? W.time : b.out;
          GK.text(g, i === 0 ? 'you' : `runner ${i + 1}`, HX, y + 13, i === 0 ? '#1c6fc4' : C.muted, 12, 'left', 700);
          GK.box(g, HX + 70, y, 270, 16, '#efe6d2', null, 8);
          g.fillStyle = b.out == null ? C.good : LAVA; g.beginPath(); g.roundRect(HX + 70, y, 270 * v / ROUND, 16, 8); g.fill();
        });
        if (tour) {
          const avg = a => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1) + ' s';
          GK.text(g, 'average time free over the full round', HX, 400, C.muted, 12, 'left', 700);
          GK.big(g, avg(best.ground), 'ground strokes only', HX, 440, C.ink);
          GK.big(g, avg(best.trunks), 'pushing off trunks', HX + 190, 440, C.goldInk);
        }
        GK.wrap(g, 'A stroke against the ground is a small shove. A stroke against a trunk or the rock is a big one (gold hand). Speed fades between strokes, so the fast route runs from trunk to trunk.', HX, tour ? 488 : 410, 350, 18, C.ink, 13, 500);
        if (over) TD.label(tour ? (left ? `Time: ${left} runner${left > 1 ? 's' : ''} stayed free` : 'Everyone is lava') : left ? (me.out == null ? 'Time! You stayed free.' : 'Time! You were tagged, but others got away.') : 'Everyone is lava. Press New round.', (AX0 + AX1) / 2, 50, 'center', left ? C.good : C.redDk, 15);
        ui.stats(`<div class="${me.out == null ? 'g' : 'r'}"><b>${(me.out == null ? W.time : me.out).toFixed(1)} s</b><span>${tour ? 'blue-ringed runner' : 'you'} ${me.out == null ? 'free so far' : 'stayed free, then tagged'}</span></div><div><b>${me.pushes}</b><span>trunk or rock push-offs</span></div>`);
        ui.out(tour ? (policy === 'ground' ? 'Stroking against open ground, runners cap out at the same speed as the tagger, and the tagger is a little stronger. They get caught.' : 'Pushing off trunks gives bursts the tagger cannot match on open ground. The runners last much longer.')
          : me.out != null ? `Tagged after ${me.out.toFixed(1)} s, so now you are lava too: chase the rest. Next round, pass close to trunks and stroke away from a gold-ringed one.` : 'Stay near trunks: a stroke away from a gold-ringed trunk is a push-off, twice the shove of the ground.');
      },
    };
  });
})();
