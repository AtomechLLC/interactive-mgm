/* Tension curve (genre breakdown: "Horror Game Design").
   A scripted 20 second corridor: a door creaks, a shadow crosses, the lights flicker, the threat shows itself, a chase.
   The curve is a designer's model of tension, not a measurement: uncertainty builds it (each unexplained event adds,
   and it decays slowly), seeing the threat in full turns uncertainty into a known problem (a drop, and later events add
   less), a heartbeat cue ramps anticipation before events, and an exact HUD health number reassures (it caps how high
   tension can go). The post's point is the direction of each effect; every weight here is illustrative. */
(function () {
  const C = TD.C, { clamp, lerp } = TD;
  const END = 20;
  const EVENTS = [[2.5, 'a door creaks', .18], [6, 'a shadow crosses', .2], [10, 'the lights flicker', .16], [13, 'the threat', .3], [16, 'the chase', .18]];
  function curve(o) {
    const pts = []; let v = .08, known = false;
    for (let t = 0; t <= END; t += .05) {
      v = Math.max(.08, v - .035 * .05);                                       // slow decay
      EVENTS.forEach(([et, , add], i) => {
        if (o.beat && t > et - 1.5 && t < et) v += .06 * .05;           // heartbeat before each event
        if (Math.abs(t - et) < .025) {
          if (i === 3) { if (o.show === 'full') { known = true; v -= .15; } else if (o.show === 'glimpse') v += .2; else v += .22; }
          else if (i === 1 && o.show === 'full') { known = true; v += .1; }   // the full reveal at the shadow
          else v += add * (known ? .45 : 1);
        }
      });
      const cap = o.hud ? .7 : 1;
      pts.push([t, clamp(Math.min(v, cap))]);
    }
    return pts;
  }
  GK.scene('tension', (s, g, ui) => {
    const btns = [...s.querySelectorAll('.ht-show .btn')], beat = s.querySelector('.ht-beat'), hud = s.querySelector('.ht-hud');
    let show = 'glimpse'; btns.forEach(b => b.onclick = () => { show = b.dataset.s; }); ui.watch(btns, beat, hud);
    const ACTS = [{ to: 20, o: { show: 'full', beat: false, hud: true } }, { to: 40, o: { show: 'glimpse', beat: true, hud: false } }];
    return {
      dur: 40,
      frame(t, tour) {
        let o = { show, beat: beat.checked, hud: hud.checked };
        if (tour) { const [a] = GK.act(ACTS, t); o = a.o; show = o.show; beat.checked = o.beat; hud.checked = o.hud; }
        btns.forEach(b => b.classList.toggle('on', b.dataset.s === show));
        const lt = t % 20, pts = curve(o), base = curve({ show: 'full', beat: false, hud: true });
        GK.panel(g);
        // corridor
        const x0 = 16, y0 = 16, w = 1008, h = 250;
        g.fillStyle = '#0b0d18'; g.beginPath(); g.roundRect(x0, y0, w, h, 10); g.fill();
        const flick = lt > 10 && lt < 11.4 && Math.floor(lt * 14) % 3 === 0;
        g.save(); g.beginPath(); g.roundRect(x0, y0, w, h, 10); g.clip();
        if (!flick) { const px = x0 + 120 + lt * 30; const gr = g.createRadialGradient(px + 150, y0 + 140, 10, px + 150, y0 + 140, 240); gr.addColorStop(0, 'rgba(255,240,200,.45)'); gr.addColorStop(1, 'rgba(255,240,200,0)'); g.fillStyle = gr; g.fillRect(x0, y0, w, h); }
        for (let d = 0; d < 6; d++) { const dx = x0 + 80 + d * 170 - (lt * 30) % 170; g.fillStyle = '#1b1f35'; g.fillRect(dx, y0 + 70, 60, 140); g.fillStyle = '#2a2e55'; g.fillRect(dx + 46, y0 + 140, 6, 6); }
        g.fillStyle = '#14172a'; g.fillRect(x0, y0 + 210, w, 40);
        const px = x0 + 120 + lt * 30;
        g.fillStyle = '#9fdcf3'; g.beginPath(); g.arc(px, y0 + 175, 14, 0, 6.283); g.fill(); g.fillRect(px - 10, y0 + 186, 20, 26);
        if (lt > 6 && lt < 7.2) { g.fillStyle = 'rgba(0,0,0,.75)'; g.beginPath(); g.ellipse(px + 260 - (lt - 6) * 200, y0 + 140, 30, 80, 0, 0, 6.283); g.fill(); }
        if (lt > 13) {
          const ex = px + 330 - Math.max(0, lt - 16) * 20;
          if (o.show === 'full') { TD.foe(ex, y0 + 160, 40, Math.PI, '#5a1f2a', { mark: 'horns' }); }
          else if (o.show === 'glimpse') { if (lt < 13.6 || (lt > 16 && Math.floor(lt * 3) % 3 === 0)) { g.fillStyle = 'rgba(160,30,40,.8)'; g.beginPath(); g.arc(ex - 8, y0 + 130, 4, 0, 6.283); g.arc(ex + 8, y0 + 130, 4, 0, 6.283); g.fill(); } }
          else if (lt < 15) GK.text(g, '…something breathing…', ex, y0 + 120, '#c9c9e8', 14, 'center', 600);
        }
        if (o.hud) { g.fillStyle = '#222'; g.fillRect(x0 + 16, y0 + 16, 150, 14); g.fillStyle = C.p2; g.fillRect(x0 + 16, y0 + 16, 150, 14); GK.text(g, '100 / 100', x0 + 174, y0 + 28, '#fff', 13, 'left', 700); }
        else GK.text(g, 'health: only your breathing and a limp tell you', x0 + 16, y0 + 28, '#c9c9e8', 13, 'left', 600);
        if (o.beat) { const b = (Math.sin(lt * (6 + lt * .5)) + 1) / 2; g.fillStyle = `rgba(229,50,45,${.15 + .35 * b})`; g.beginPath(); g.arc(x0 + w - 40, y0 + 34, 12 + 5 * b, 0, 6.283); g.fill(); }
        EVENTS.forEach(([et, n]) => { if (lt >= et && lt < et + 1.6) TD.label(n, x0 + w / 2, y0 + h - 18, 'center', C.navy, 13); });
        g.restore();
        // curve
        const ax = 70, ay = 300, aw = 930, ah = 210;
        GK.head(g, 'Tension over the corridor (a design model, not a measurement)', ax, ay - 10);
        const A = GK.axes(g, ax, ay, aw, ah, { x0: 0, x1: END, y0: 0, y1: 1, xt: [0, 5, 10, 15, 20], yt: [0, .5, 1], fmtX: v => v + ' s', fmtY: v => v === 1 ? 'dread' : v === 0 ? 'calm' : '' });
        EVENTS.forEach(([et, n]) => { g.strokeStyle = 'rgba(93,97,140,.3)'; g.setLineDash([3, 4]); g.beginPath(); g.moveTo(A.sx(et), ay); g.lineTo(A.sx(et), ay + ah); g.stroke(); g.setLineDash([]); GK.text(g, n, A.sx(et) + 4, ay + 14, C.muted, 11, 'left', 600); });
        if (o.hud) { g.strokeStyle = 'rgba(47,174,99,.6)'; g.beginPath(); g.moveTo(ax, A.sy(.7)); g.lineTo(ax + aw, A.sy(.7)); g.stroke(); GK.text(g, 'HUD health caps it', ax + aw - 6, A.sy(.7) - 6, C.good, 11, 'right', 700); }
        GK.line(g, base.map(([x, y]) => [A.sx(x), A.sy(y)]), '#b9ad92', 2.5, [6, 5]);
        GK.line(g, pts.filter(([x]) => x <= lt).map(([x, y]) => [A.sx(x), A.sy(y)]), C.purple, 4);
        GK.text(g, 'dashed: everything shown, no cue, HUD health', ax + 6, ay + ah - 8, '#8c8068', 11, 'left', 600);
        const peak = Math.max(...pts.map(p => p[1])), endV = pts[pts.length - 1][1];
        ui.stats(`<div class="${peak > .8 ? 'g' : 'r'}"><b>${Math.round(peak * 100)}</b><span>peak tension (of 100)</span></div><div><b>${Math.round(endV * 100)}</b><span>at the chase</span></div>`);
        ui.out(o.show === 'full' ? 'Shown in full, the monster becomes a known problem: tension drops at the reveal and later events add less.' : 'Kept uncertain, every event stacks: the threat is felt more than it is seen.');
      },
    };
  });
})();
