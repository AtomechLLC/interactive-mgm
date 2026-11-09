/* Jump lab (genre breakdown: "Platformer Game Design").
   Twenty attempts at two gaps by a player whose presses are a few frames off, seeded. Mario runs at a fixed speed.
   Jump 1: the press lands e1 frames from the ledge (negative = early, from the ground; positive = late, in the air).
   Without coyote time a late press does nothing and Mario falls; coyote time accepts presses up to N frames late.
   Jump 2: the press lands e2 frames from touching down on the short middle platform (negative = still in the air).
   Without a jump buffer an early press is dropped; the buffer keeps it for N frames and jumps on landing.
   Gravity changes the arc: heavier gravity, shorter jumps. 60 frames a second; speeds are in screen pixels and
   illustrative. Sprites: Super Mario Bros. (Nintendo, 1985). */
(function () {
  const C = TD.C, { clamp, lerp } = TD;
  const FPS = 60, RUN = 250, V0 = 640, GROUND = 470, P = [[20, 380], [530, 650], [735, 1030]], N = 20;
  const SPR = n => GK.img('img/smb-' + n + '.png');
  function attempt(i, o) {
    const R = GK.rng(i * 13 + 5), e1 = Math.round(R() * 12 - 7), e2 = Math.round(R() * 11 - 8);
    const pts = []; let x = 120, y = GROUND, vy = 0, air = false, f = 0, fate = 'made it', jumps = 0, pressed2 = null, landF = null, offF = null;
    const edge1F = Math.round((P[0][1] - x) / RUN * FPS), press1 = edge1F + e1;
    for (; f < 600; f++) {
      const onPlat = !air && P.some(([a, b]) => x >= a && x <= b);
      if (!air && !onPlat && offF == null) offF = f;
      // jump 1
      if (jumps === 0 && f === press1) { if ((!air && onPlat) || (offF != null && f - offF <= o.coyote)) { air = true; vy = -V0; jumps = 1; } }
      // jump 2: press relative to landing on platform 2
      if (jumps === 1 && landF == null && pressed2 == null && air && x > P[1][0] - 160 && vy > 0) { /* waiting */ }
      if (jumps === 1 && landF != null && f === landF + Math.max(0, e2) && e2 >= 0 && !air) { air = true; vy = -V0; jumps = 2; }
      if (jumps === 1 && landF != null && f === landF && e2 < 0 && -e2 <= o.buffer && !air) { air = true; vy = -V0; jumps = 2; }
      if (!air && !onPlat) { air = true; vy = 0; }
      if (air) { vy += o.grav / FPS; y += vy / FPS; }
      x += RUN / FPS;
      if (air && vy > 0 && y >= GROUND) {
        const plat = P.findIndex(([a, b]) => x >= a && x <= b);
        if (plat >= 0 && y - vy / FPS <= GROUND + 1) { y = GROUND; air = false; vy = 0; offF = null; if (plat === 1 && landF == null) landF = f + 1; if (plat === 2) { pts.push([x, y, f]); fate = 'made it'; break; } }
      }
      pts.push([x, y, f]);
      if (y > GROUND + 120) { fate = jumps === 0 ? (e1 > 0 ? 'pressed late, no coyote time' : 'fell') : jumps === 1 && landF != null ? (e2 < 0 ? 'pressed early, no buffer' : 'fell') : 'fell short'; break; }
      if (jumps === 0 && f > press1 + 30) { /* no jump at all */ }
    }
    return { pts, fate, ok: fate === 'made it', e1, e2 };
  }
  GK.scene('jump', (s, g, ui) => {
    const gEl = s.querySelector('.pj-g'), gv = s.querySelector('.pj-gv'), cEl = s.querySelector('.pj-c'), cv2 = s.querySelector('.pj-cv'), bEl = s.querySelector('.pj-b'), bv = s.querySelector('.pj-bv');
    ui.watch(gEl, cEl, bEl);
    const ACTS = [{ to: 7, o: { grav: 1700, coyote: 0, buffer: 0 } }, { to: 14, o: { grav: 1700, coyote: 6, buffer: 0 } }, { to: 21, o: { grav: 1700, coyote: 6, buffer: 6 } }, { to: 28, o: { grav: 2300, coyote: 6, buffer: 6 } }];
    let key = '', runs = [];
    return {
      dur: 28,
      frame(t, tour) {
        let o = { grav: +gEl.value, coyote: +cEl.value, buffer: +bEl.value };
        if (tour) { const [a] = GK.act(ACTS, t); o = a.o; gEl.value = o.grav; cEl.value = o.coyote; bEl.value = o.buffer; }
        gv.textContent = o.grav + ' px/s²'; cv2.textContent = o.coyote + ' frames'; bv.textContent = o.buffer + ' frames';
        const k = JSON.stringify(o); if (k !== key) { key = k; runs = Array.from({ length: N }, (_, i) => attempt(i, o)); }
        GK.panel(g);
        g.fillStyle = '#9fd3f0'; g.beginPath(); g.roundRect(14, 14, 1012, 520, 10); g.fill();
        g.imageSmoothingEnabled = false;
        const cl = SPR('cloud'); if (cl) { g.drawImage(cl, 140, 60, 96, 72); g.drawImage(cl, 700, 90, 96, 72); }
        const gt = SPR('ground');
        P.forEach(([a, b]) => { for (let x = a; x < b; x += 32) for (let y = GROUND; y < 534; y += 32) if (gt) g.drawImage(gt, x, y, Math.min(32, b - x), Math.min(32, 534 - y)); });
        // ghosts
        runs.forEach(r => { g.strokeStyle = r.ok ? 'rgba(47,174,99,.55)' : 'rgba(229,50,45,.5)'; g.lineWidth = 2; g.beginPath(); r.pts.forEach(([x, y], j) => j ? g.lineTo(x, y - 16) : g.moveTo(x, y - 16)); g.stroke(); });
        // the live attempt
        const per = 1.6, idx = Math.floor(t / per) % N, r = runs[idx], f = Math.floor((t % per) / per * (r.pts.length + 20));
        const p = r.pts[Math.min(f, r.pts.length - 1)];
        const inAir = p[1] < GROUND - .5 || p[1] > GROUND + .5, spr = inAir ? SPR('mario-jump') : SPR('mario-walk' + (1 + Math.floor(p[2] / 5) % 3));
        if (spr) g.drawImage(spr, p[0] - 16, p[1] - 32, 32, 32);
        g.imageSmoothingEnabled = true;
        TD.label(`attempt ${idx + 1}: ${r.e1 > 0 ? r.e1 + ' frames late' : -r.e1 + ' frames early'} at the ledge, ${r.e2 < 0 ? -r.e2 + ' early' : r.e2 + ' late'} on the landing`, 520, 40, 'center', C.navy, 13);
        if (f >= r.pts.length - 1) TD.label(r.fate, p[0], p[1] - 56, 'center', r.ok ? C.good : C.redDk, 14);
        // tally
        const made = runs.filter(x => x.ok).length, byFate = {}; runs.forEach(x => { if (!x.ok) byFate[x.fate] = (byFate[x.fate] || 0) + 1; });
        GK.big(g, `${made} of ${N}`, 'attempts made it across both gaps', 24, 562 - 4, made >= 15 ? C.good : C.red);
        GK.text(g, Object.entries(byFate).map(([k2, v]) => `${v} × ${k2}`).join('   ·   ') || 'no misses', 260, 566, C.ink, 13, 'left', 600);
        ui.stats(`<div class="${made >= 15 ? 'g' : 'r'}"><b>${made}/${N}</b><span>made it, same presses every time</span></div>`);
        ui.out(o.grav > 2000 ? 'Heavier gravity shortens every arc: now the gaps themselves are the challenge, which is difficulty you chose on purpose.'
          : o.coyote === 0 && o.buffer === 0 ? 'Every press here is within a few frames of right, and the game punishes them anyway.'
          : 'The presses did not change. Coyote time and the buffer read them as what the player meant.');
      },
    };
  });
})();
