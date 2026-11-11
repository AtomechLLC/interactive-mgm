/* First-person follow view for the battle (battle.js calls FPV.draw). The floor plan is extruded into walls and
   ray-cast one screen column at a time from the followed unit's position and facing; every other unit is a capsule body
   wearing its token as a face, and every shot and telegraph is a billboard or a floor ellipse placed by the same projection and hidden behind nearer walls.
   Nothing here changes the battle: it reads the same state the top-down view draws.
   FPV.walls(P, shutDoor) -> wall segments (room edges with the doorways cut out)
   FPV.draw(g, B, u, cam, o) with o = { W, H, walls, plan, drawUnit, tok, TEAM, dt } */
(function () {
  const TAU = Math.PI * 2, FOV = 1.2, WALL = 64, EYE = WALL / 2, STEP = 2, NEARK = 7;   // NEARK: the most a billboard is magnified
  const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k)), rgb = c => `rgb(${c[0]},${c[1]},${c[2]})`;
  const FOG = [226, 218, 200], STONE = [86, 92, 140], STONE2 = [62, 67, 112];

  function walls(P, shut) {
    const out = [];
    Object.values(P.rooms).forEach(r => {
      if (!r.pts) return;
      r.pts.forEach((a, i) => {
        const b = r.pts[(i + 1) % r.pts.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L;
        const gaps = P.doors.filter(d => d !== shut && (d.a === r.id || d.b === r.id)).map(d => { const t = (d.m[0] - a[0]) * ux + (d.m[1] - a[1]) * uy, off = Math.abs((d.m[0] - a[0]) * uy - (d.m[1] - a[1]) * ux); return off < 3 && t > 0 && t < L ? [t - d.gw / 2, t + d.gw / 2] : null; }).filter(Boolean).sort((p, q) => p[0] - q[0]);
        let t = 0; [...gaps, [L, L]].forEach(([g0, g1]) => { if (g0 > t + .5) out.push({ x1: a[0] + ux * t, y1: a[1] + uy * t, x2: a[0] + ux * g0, y2: a[1] + uy * g0, side: Math.abs(ux) > Math.abs(uy) ? 1 : 0 }); t = Math.max(t, g1); });
      });
    });
    return out;
  }

  function draw(g, B, u, cam, o) {
    const { W, H, TEAM } = o, proj = (W / 2) / Math.tan(FOV / 2), hor = H / 2;
    // the camera turns toward the unit's facing instead of snapping to it
    let da = u.face - cam.ang; da = Math.atan2(Math.sin(da), Math.cos(da)); cam.ang += da * Math.min(1, o.dt * 7);
    cam.x = u.x; cam.y = u.y;
    const ca = Math.cos(cam.ang), sa = Math.sin(cam.ang);
    // ceiling and floor
    let gr = g.createLinearGradient(0, 0, 0, hor); gr.addColorStop(0, '#f6f1e2'); gr.addColorStop(1, rgb(FOG)); g.fillStyle = gr; g.fillRect(0, 0, W, hor);
    gr = g.createLinearGradient(0, hor, 0, H); gr.addColorStop(0, rgb(FOG)); gr.addColorStop(1, '#cdbf9f'); g.fillStyle = gr; g.fillRect(0, hor, W, H - hor);
    // walls: one ray per STEP columns, nearest hit wins
    const z = new Float32Array(W);
    for (let c = 0; c < W; c += STEP) {
      const off = Math.atan((c + STEP / 2 - W / 2) / proj), ra = cam.ang + off, rx = Math.cos(ra), ry = Math.sin(ra);
      let best = 1e9, side = 0;
      for (const s of o.walls) {
        const ex = s.x2 - s.x1, ey = s.y2 - s.y1, den = rx * ey - ry * ex; if (Math.abs(den) < 1e-6) continue;
        const t = ((s.x1 - cam.x) * ey - (s.y1 - cam.y) * ex) / den, k = ((s.x1 - cam.x) * ry - (s.y1 - cam.y) * rx) / den;
        if (t > .5 && t < best && k >= 0 && k <= 1) { best = t; side = s.side; }
      }
      const d = best * Math.cos(off); for (let i = 0; i < STEP && c + i < W; i++) z[c + i] = d;
      if (best > 1e8) continue;
      const h = WALL * proj / d, fog = Math.min(.85, d / 620);
      g.fillStyle = rgb(mix(side ? STONE : STONE2, FOG, fog)); g.fillRect(c, hor - h / 2, STEP, h);
      g.fillStyle = `rgba(28,36,80,${.5 * (1 - fog)})`; g.fillRect(c, hor - h / 2, STEP, Math.max(1, h * .05)); g.fillRect(c, hor + h / 2 - Math.max(1, h * .07), STEP, Math.max(1, h * .07));
    }
    // world point -> { x on screen, f distance ahead, k pixels per world unit there }
    const P = (x, y) => { const dx = x - cam.x, dy = y - cam.y, f = dx * ca + dy * sa, s = -dx * sa + dy * ca; return { f, x: W / 2 + s / Math.max(f, 1) * proj, k: proj / Math.max(f, 1) }; };
    // draw fn only where no nearer wall covers the columns x0..x1 at depth f
    const seen = (x0, x1, f, fn) => {
      x0 = Math.max(0, Math.floor(x0)); x1 = Math.min(W - 1, Math.ceil(x1)); if (x1 < x0) return;
      g.save(); g.beginPath(); let run = -1, any = false;
      for (let c = x0; c <= x1 + 1; c++) { const vis = c <= x1 && z[c] > f; if (vis && run < 0) run = c; if (!vis && run >= 0) { g.rect(run, 0, c - run, H); run = -1; any = true; } }
      if (any) { g.clip(); fn(); } g.restore();
    };
    const tel = (n, team) => o.tok(`telegraphs/${n}-${TEAM[team].tel}`, 256);
    // everything that is not a wall, far to near
    const items = [];
    B.zones.forEach(zn => items.push({ kind: 'zone', x: zn.x, y: zn.y, r: zn.r, team: zn.team, k: 1 - zn.t / zn.t0 }));
    B.units.forEach(e => { if (e === u || !e.alive) return; const cl = B.cloaked(e); if (cl && e.team !== u.team) return; if (e.def.bubble && !(e.st.stun > 0)) items.push({ kind: 'zone', x: e.x, y: e.y, r: e.def.bubble, team: e.team, k: .25, soft: true }); items.push({ kind: 'unit', x: e.x, y: e.y, e, a: cl ? .35 : 1 }); });
    B.shots.forEach(s => items.push({ kind: 'shot', x: s.x, y: s.y, s }));
    B.fx.forEach(f => { if (f.type === 'dead' || f.type === 'burst' || f.type === 'text' || f.type === 'ring') items.push({ kind: 'fx', x: f.x, y: f.y, f }); });
    items.forEach(it => it.p = P(it.x, it.y));
    items.filter(it => it.p.f > 6).sort((a, b) => b.p.f - a.p.f).forEach(it => {
      // near plane: a billboard closer than about a tile fades out and stops growing, so nothing fills the screen or is cut by the frame
      const { f, x } = it.p, k = it.kind === 'zone' ? it.p.k : Math.min(it.p.k, NEARK), near = it.kind === 'zone' ? 1 : Math.max(0, Math.min(1, (f - 20) / 30)), floor = hor + EYE * k;
      if (near <= 0) return;
      if (it.kind === 'zone') {
        const rx = it.r * k, ry = Math.max(2, it.r * k * EYE / f);
        seen(x - rx, x + rx, Math.max(6, f - it.r * .6), () => { g.globalAlpha = it.soft ? .22 : .35 + .4 * it.k; g.fillStyle = TEAM[it.team].soft; g.beginPath(); g.ellipse(x, floor, rx, ry, 0, 0, TAU); g.fill(); g.globalAlpha = it.soft ? .5 : .95; g.strokeStyle = TEAM[it.team].col; g.lineWidth = it.soft ? 2 : 4; g.setLineDash(it.soft ? [] : [10, 7]); g.stroke(); });
      } else if (it.kind === 'unit') {
        // a capsule body in the squad's colour, with the token worn as its face. The face slides round the body with the
        // unit's facing and is gone when it has its back to the camera.
        const e = it.e, sz = e.def.size || 1, bw = 24 * sz * k, bh = (e.def.fly ? 26 : 46) * sz * k, r = bw / 2, base = floor - (e.def.fly ? 22 * k : 0), top = base - bh, cy = top + r * 1.05;
        let turn = Math.atan2(cam.y - e.y, cam.x - e.x) - e.face; turn = Math.atan2(Math.sin(turn), Math.cos(turn));   // 0 = looking straight at the camera
        seen(x - r - 4, x + r + 4, f, () => {
          g.globalAlpha = near * it.a;
          g.fillStyle = 'rgba(40,30,20,.22)'; g.beginPath(); g.ellipse(x, floor, r * 1.1, Math.max(1.5, r * 1.1 * EYE / f), 0, 0, TAU); g.fill();
          const col = TEAM[e.team].col, sh = g.createLinearGradient(x - r, 0, x + r, 0); sh.addColorStop(0, 'rgba(0,0,0,.34)'); sh.addColorStop(.3, 'rgba(255,255,255,.2)'); sh.addColorStop(.55, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.4)');
          g.beginPath(); g.roundRect(x - r, top, bw, bh, r); g.fillStyle = col; g.fill(); g.fillStyle = sh; g.fill(); g.strokeStyle = '#1d2433'; g.lineWidth = Math.max(1, Math.min(3, r * .12)); g.stroke();
          g.fillStyle = 'rgba(29,36,51,.3)'; g.fillRect(x - r, top + bh * .62, bw, Math.max(1, bh * .05));   // a belt, so the body reads as upright
          if (Math.abs(turn) < 1.75) {
            const off = Math.sin(turn) * r * .55, wide = Math.max(.25, Math.cos(turn * .8)), fr = r * .86;
            g.save(); g.beginPath(); g.roundRect(x - r, top, bw, bh, r); g.clip(); g.translate(x - off, cy); g.scale(wide, 1);
            o.drawUnit(g, e.def, 0, 0, fr, 1, false); g.restore();
          }
          g.globalAlpha = near;
          const w = Math.max(18, bw * 1.2), hp = Math.max(0, e.hp / e.hpMax), by = top - Math.max(6, 6 * Math.min(k, 2)); g.fillStyle = '#1d2433'; g.fillRect(x - w / 2 - 1, by - 1, w + 2, 6); g.fillStyle = col; g.fillRect(x - w / 2, by, w * hp, 4);
          let n = 0; o.BADGE.forEach(([key, icon]) => { if (e.st[key] > 0 && n < 3) { const bs = Math.max(10, r * .7), im = o.tok('status/' + icon, 64); if (im) g.drawImage(im, x + r - n * bs, base - bs, bs, bs); n++; } });
          if (e === u.target) { g.strokeStyle = '#ffb951'; g.lineWidth = 2.5; g.beginPath(); g.roundRect(x - r - 5, top - 5, bw + 10, bh + 10, r + 5); g.stroke(); }
        });
      } else if (it.kind === 'shot') {
        const s = it.s, lift = s.type === 'grenade' ? Math.sin((s.k || 0) * Math.PI) * 40 : s.type === 'dog' ? -EYE * .7 : s.type === 'drone' ? 34 : 0, r = (s.type === 'rocket' || s.big ? 7 : s.type === 'dog' ? 9 : s.type === 'grenade' ? 7 : s.type === 'drone' ? 9 : 4) * Math.min(k, 2.2), cy = hor - lift * k;
        seen(x - r - 2, x + r + 2, f, () => {
          g.globalAlpha = near;
          if (s.type === 'dog') { g.fillStyle = TEAM[s.team].col; g.beginPath(); g.arc(x, cy, r * 1.15, 0, TAU); g.fill(); const im = o.tok('tokens/neutral-creature'); if (im) g.drawImage(im, x - r, cy - r, r * 2, r * 2); }
          else if (s.type === 'grenade') { const im = o.tok('props/bomb'); if (im) g.drawImage(im, x - r * 1.4, cy - r * 1.4, r * 2.8, r * 2.8); }
          else { g.fillStyle = s.type === 'drone' ? '#1d2433' : TEAM[s.team].soft; g.strokeStyle = TEAM[s.team].col; g.lineWidth = Math.max(1.5, r * .4); g.beginPath(); g.arc(x, cy, Math.max(2, r), 0, TAU); g.fill(); g.stroke(); }
        });
      } else {
        const fx = it.f, a = 1 - fx.age / fx.ttl;
        seen(x - 60 * k, x + 60 * k, f, () => {
          g.globalAlpha = Math.max(0, a) * near;
          if (fx.type === 'dead') { const im = o.tok('status/dead', 64), r = 13 * k; if (im) g.drawImage(im, x - r, hor - r - fx.age * 14 * k, r * 2, r * 2); }
          else if (fx.type === 'burst') { const im = tel('burst', fx.team), r = fx.r * k * (.5 + .5 * fx.age / fx.ttl); if (im) g.drawImage(im, x - r, hor + EYE * k * .4 - r, r * 2, r * 2); }
          else if (fx.type === 'ring') { const rx = fx.r * k, ry = Math.max(2, rx * EYE / f); g.strokeStyle = TEAM[fx.team].col; g.lineWidth = 5; g.beginPath(); g.ellipse(x, floor, rx, ry, 0, 0, TAU); g.stroke(); }
          else if (f < 420) { g.font = `700 ${Math.round(Math.max(13, Math.min(26, 20 * k * 3)))}px Montserrat, Jost, sans-serif`; g.textAlign = 'center'; g.lineWidth = 5; g.strokeStyle = '#fffaf0'; const yy = hor - 26 * k - fx.age * 20; g.strokeText(fx.text, x, yy); g.fillStyle = fx.team != null ? TEAM[fx.team].col : '#262c6a'; g.fillText(fx.text, x, yy); }
        });
      }
    });
    // lines of fire: tracers, aimed shots, arcs, and any aim line or channel in progress. A line from this unit starts at its gun.
    const gun = { x: W / 2 + 70, y: H - 46 };
    const line = (ax, ay, bx, by, col, w, a, dash) => {
      let A = P(ax, ay), Bp = P(bx, by); const mine = Math.hypot(ax - u.x, ay - u.y) < 3;
      if (A.f < 4 && Bp.f < 4) return;
      const near = (p, q, px, py, qx, qy) => { const t = (4 - p.f) / (q.f - p.f); return P(px + (qx - px) * t + ca * .01, py + (qy - py) * t + sa * .01); };
      if (A.f < 4) A = near(A, Bp, ax, ay, bx, by); if (Bp.f < 4) Bp = near(Bp, A, bx, by, ax, ay);
      const y = p => hor + 8 * p.k;
      g.save(); g.globalAlpha = a; g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; if (dash) g.setLineDash(dash);
      g.beginPath(); if (mine) g.moveTo(gun.x, gun.y); else g.moveTo(A.x, y(A)); g.lineTo(Bp.x, y(Bp)); g.stroke(); g.restore();
    };
    B.fx.forEach(f => {
      const a = 1 - f.age / f.ttl;
      if (f.type === 'tracer') line(f.x, f.y, f.x2, f.y2, TEAM[f.team].col, 2, a * .7);
      else if (f.type === 'rail') line(f.x, f.y, f.x2, f.y2, TEAM[f.team].col, 6, a);
      else if (f.type === 'arc') line(f.x, f.y, f.x2, f.y2, TEAM[f.team].col, 4, a, [9, 5]);
      else if (f.type === 'dash' || f.type === 'leap' || f.type === 'blink') line(f.x, f.y, f.x2, f.y2, TEAM[f.team].col, 3, a * .8, [5, 8]);
    });
    let warn = '';
    B.units.forEach(e => {
      if (!e.alive) return;
      if (e.aim) { const p = e.aim.lock || e.aim.tgt, k = 1 - e.aim.t / e.aim.t0; line(e.x, e.y, p.x, p.y, TEAM[e.team].col, e.aim.lock ? 7 : 2 + 3 * k, e.aim.lock ? .95 : .35 + .4 * k); if (e.aim.tgt === u) warn = e.aim.lock ? 'Aim locked on you: step off the line' : `${e.def.name} is aiming at you`; }
      if (e.chan) { line(e.x, e.y, e.chan.tgt.x, e.chan.tgt.y, TEAM[e.team].col, 3 + 4 * (1 - e.chan.t / e.chan.t0), .8, [3, 7]); if (e.chan.tgt === u) warn = `${e.def.name} is channelling on you`; }
      if (B.t - (e.beamT || -9) < .12 && e.beamTo && e.beamTo.alive) line(e.x, e.y, e.beamTo.x, e.beamTo.y, '#2fb36a', 4, .8, [6, 5]);
    });
    if (B.zones.some(zn => zn.team !== u.team && Math.hypot(u.x - zn.x, u.y - zn.y) < zn.r)) warn = 'Inside a blast circle: get out';
    // hit flash, then the head-up display
    const hit = B.t - (u.hitT || -9); if (hit < .25) { const v = g.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, H * .75); v.addColorStop(0, 'rgba(229,50,45,0)'); v.addColorStop(1, `rgba(229,50,45,${.5 * (1 - hit / .25)})`); g.fillStyle = v; g.fillRect(0, 0, W, H); }
    g.strokeStyle = 'rgba(28,36,80,.75)'; g.lineWidth = 2; g.beginPath(); g.moveTo(W / 2 - 12, hor); g.lineTo(W / 2 - 4, hor); g.moveTo(W / 2 + 4, hor); g.lineTo(W / 2 + 12, hor); g.moveTo(W / 2, hor - 12); g.lineTo(W / 2, hor - 4); g.moveTo(W / 2, hor + 4); g.lineTo(W / 2, hor + 12); g.stroke();
    // the unit's own weapon: its token, low and to the right, kicking when it fires
    const kick = Math.max(0, 1 - (B.t - u.lastFire) / .12); o.drawUnit(g, u.def, gun.x + 40, H - 24 + kick * 8, 54, B.cloaked(u) ? .45 : 1, false);   // no team disc behind your own token: it read as a stray blue shape
    return warn;
  }

  // a small top-down map in the corner, with every unit as a dot and the followed one as an arrow
  function mini(g, B, u, o, x0, y0, s) {
    const { W, H, TEAM } = o;
    g.save(); g.fillStyle = 'rgba(255,252,244,.92)'; g.strokeStyle = '#1c2450'; g.lineWidth = 2; g.beginPath(); g.roundRect(x0 - 4, y0 - 4, W * s + 8, H * s + 8, 8); g.fill(); g.stroke();
    g.drawImage(o.plan, x0, y0, W * s, H * s);
    B.units.forEach(e => { if (!e.alive || e === u) return; if (B.cloaked(e) && e.team !== u.team) return; g.fillStyle = TEAM[e.team].col; g.beginPath(); g.arc(x0 + e.x * s, y0 + e.y * s, 3.2, 0, TAU); g.fill(); });
    g.translate(x0 + u.x * s, y0 + u.y * s); g.rotate(u.face); g.fillStyle = '#ffb951'; g.strokeStyle = '#1c2450'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(9, 0); g.lineTo(-6, -6); g.lineTo(-3, 0); g.lineTo(-6, 6); g.closePath(); g.fill(); g.stroke();
    g.restore();
  }
  window.FPV = { walls, draw, mini };
})();
