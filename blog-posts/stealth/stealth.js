/* Readable detection (genre breakdown: "Stealth Game Design").
   One guard patrols a hall; the player crosses it along a fixed route. The detection meter fills while the player is
   inside the guard's view cone, faster when closer and when lit, and fills from noise when the player runs within
   hearing range, whatever the guard is facing. It drains when neither applies. Full meter: spotted.
   Tools: walk instead of run (no noise), switch off the hall light (the lit zone drops to shadow), and throw a bottle
   (at 3 s the guard turns and walks to the noise for 6 s). Every rate is illustrative; what matters is that each rule
   is visible on screen. */
(function () {
  const C = TD.C, { clamp, lerp } = TD;
  const DT = 1 / 30, RANGE = 230, HALF = .5, HEAR = 170, LIT = [330, 120, 260, 300];
  const ROUTE = [[60, 470], [300, 470], [420, 330], [560, 260], [760, 200], [980, 120]];
  const BOTTLE = [870, 480], END = 16;
  function along(pts, d) { for (let i = 1; i < pts.length; i++) { const [a, b] = [pts[i - 1], pts[i]], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (d <= L) return [lerp(a[0], b[0], d / L), lerp(a[1], b[1], d / L)]; d -= L; } return pts[pts.length - 1].slice(); }
  function guardAt(t, o) {
    if (o.bottle && t >= 3 && t < 9) { const k = clamp((t - 3) / 3); const p = [lerp(560, BOTTLE[0] - 40, k), lerp(330, BOTTLE[1] - 20, k)]; return { p, ang: Math.atan2(BOTTLE[1] - p[1], BOTTLE[0] - p[0]) }; }
    const ph = ((t + (o.bottle && t >= 9 ? 0 : 0)) % 8) / 8, k = ph < .5 ? ph * 2 : 2 - ph * 2, p = [lerp(380, 700, k), 330 + Math.sin(ph * 6.283) * 10];
    return { p, ang: ph < .5 ? 0 : Math.PI };
  }
  const lightAt = (x, y, o) => (x > LIT[0] && x < LIT[0] + LIT[2] && y > LIT[1] && y < LIT[1] + LIT[3] && !o.dark) ? 1 : .45;
  function sim(o) {
    const speed = o.run ? 140 : 80, frames = []; let meter = 0, spotted = null;
    for (let t = 0; t <= END; t += DT) {
      const pp = along(ROUTE, speed * t), gd = guardAt(t, o);
      const dx = pp[0] - gd.p[0], dy = pp[1] - gd.p[1], dist = Math.hypot(dx, dy);
      let da = Math.atan2(dy, dx) - gd.ang; da = Math.atan2(Math.sin(da), Math.cos(da));
      const seen = dist < RANGE && Math.abs(da) < HALF, heard = o.run && dist < HEAR;
      let rate = 0; if (seen) rate += (1.25 - dist / RANGE) * lightAt(pp[0], pp[1], o) * 1.6; if (heard) rate += 1.3;
      meter = spotted != null ? 1 : clamp(meter + (rate ? rate : -.35) * DT);
      if (meter >= 1 && spotted == null) spotted = t;
      frames.push({ t, pp, gd, meter, seen, heard, done: pp[0] >= 975 });
      if (spotted != null && t > spotted + 1.5) break;
    }
    return { frames, spotted, crossed: frames.some(f => f.done) && spotted == null };
  }
  GK.scene('stealth', (s, g, ui) => {
    const run = s.querySelector('.st-run'), dark = s.querySelector('.st-dark'), bottle = s.querySelector('.st-bottle');
    ui.watch(run, dark, bottle);
    const ACTS = [{ to: 8, o: { run: true, dark: false, bottle: false } }, { to: 22, o: { run: false, dark: false, bottle: false } }, { to: 37, o: { run: false, dark: false, bottle: true } }, { to: 52, o: { run: false, dark: true, bottle: false } }];
    let key = '', S;
    return {
      dur: 52,
      frame(t, tour) {
        let o = { run: run.checked, dark: dark.checked, bottle: bottle.checked }, lt;
        if (tour) { const [a, , i] = GK.act(ACTS, t); o = a.o; run.checked = o.run; dark.checked = o.dark; bottle.checked = o.bottle; lt = t - (i ? ACTS[i - 1].to : 0); } else lt = t % (END + 2);
        const k = JSON.stringify(o); if (k !== key) { key = k; S = sim(o); }
        const f = S.frames[Math.min(S.frames.length - 1, Math.floor(lt / DT))];
        GK.panel(g);
        const x0 = 16, y0 = 16, w = 1008, h = 520;
        TD.floor(x0, y0, w, h, o.dark ? .35 : .18);
        if (!o.dark) { g.fillStyle = 'rgba(255,230,140,.35)'; g.fillRect(LIT[0], LIT[1], LIT[2], LIT[3]); GK.text(g, 'lit', LIT[0] + 8, LIT[1] + 18, C.goldInk, 13, 'left', 800); }
        TD.wall(x0, y0, w, 26); TD.wall(x0, y0 + h - 26, w, 26); TD.pillar(220, 300, 60, 60); TD.pillar(820, 300, 50, 50);
        TD.flag(985, 112);
        g.strokeStyle = 'rgba(46,163,220,.4)'; g.setLineDash([6, 6]); g.lineWidth = 2; g.beginPath(); ROUTE.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); g.setLineDash([]);
        const gd = f.gd;
        g.save(); g.beginPath(); g.rect(x0, y0 + 26, w, h - 52); g.clip();
        TD.cone(gd.p[0], gd.p[1], gd.ang, HALF, RANGE, f.seen ? 1 : .8, f.seen ? '229,50,45' : '224,169,45');
        g.restore();
        if (o.run) { g.strokeStyle = 'rgba(138,79,214,.35)'; g.setLineDash([3, 5]); g.beginPath(); g.arc(gd.p[0], gd.p[1], HEAR, 0, 6.283); g.stroke(); g.setLineDash([]); }
        if (o.bottle && lt >= 2.4) { const k2 = clamp((lt - 2.4) / .6), bx = lerp(f.pp[0], BOTTLE[0], k2), by = lerp(f.pp[1], BOTTLE[1], k2) - Math.sin(k2 * Math.PI) * 60; g.fillStyle = '#3f9b5a'; g.beginPath(); g.arc(bx, by, 7, 0, 6.283); g.fill(); if (k2 >= 1 && lt < 4.5) TD.label('clink!', BOTTLE[0], BOTTLE[1] - 24, 'center', C.purple, 13); }
        TD.foe(gd.p[0], gd.p[1], 18, gd.ang, C.red, { mark: 'shield' });
        TD.player(f.pp[0], f.pp[1], Math.atan2(-1, 1), .85);
        // meter over the guard
        const mx = gd.p[0] - 34, my = gd.p[1] - 46; g.fillStyle = '#222'; g.fillRect(mx, my, 68, 9); g.fillStyle = f.meter >= 1 ? C.red : C.gold; g.fillRect(mx, my, 68 * f.meter, 9);
        if (S.spotted != null && f.t >= S.spotted) TD.label('Spotted!', gd.p[0], gd.p[1] - 66, 'center', C.redDk, 16);
        else if (f.seen || f.heard) TD.label(f.heard && !f.seen ? 'heard something' : 'what was that?', gd.p[0], gd.p[1] - 66, 'center', C.goldInk, 13);
        if (f.done && S.spotted == null) TD.label('crossed unseen', 985, 80, 'center', C.good, 15);
        GK.text(g, `meter fills: in the cone (closer and lit = faster)${o.run ? ', or running within earshot' : ''}`, x0 + 14, y0 + h + 30, C.ink, 14, 'left', 600);
        ui.stats(`<div class="${S.crossed ? 'g' : 'r'}"><b>${S.crossed ? 'unseen' : 'spotted'}</b><span>${S.crossed ? 'crossed the hall' : `at ${S.spotted?.toFixed(1)} s`}</span></div>`);
        ui.out(o.run ? 'Running is loud: the guard hears you through the back of his head.' : o.bottle ? 'The bottle moves the guard. You used his rules against him.' : o.dark ? 'In the dark, the cone fills the meter too slowly to catch you.' : 'Walking is quiet, but the lit hall fills the meter as you pass through his cone.');
      },
    };
  });
})();
