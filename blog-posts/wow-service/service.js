/* An MMORPG is a service (genre breakdown: "How to Make a Game Like World of Warcraft?").
   The post's ten steps on a development timeline of 4 to 7 years (the post's range), with launch as the start of live
   service, not the end. Team size runs from 100 to 150 people (the post's "smaller team"), so the readout is
   person-years before launch and each year after. How the steps overlap is illustrative. */
(function () {
  const C = TD.C, { clamp, lerp } = TD;
  // [step, start, end] as shares of development time; live: keeps going after launch
  const STEPS = [
    ['1. Game design document', 0, .15, true], ['2. Assemble the team', .02, .35], ['3. Secure the budget', 0, .1, true],
    ['4. Pick the engine', .05, .2], ['5. Servers, networking, databases', .12, 1, true], ['6. Build the open world', .25, 1, true],
    ['7. Characters, NPCs, creatures', .25, 1, true], ['8. Core loops and progression', .15, .95, true], ['9. Social and multiplayer systems', .35, .95, true],
    ['10. Alpha and beta tests', .78, 1],
  ];
  GK.scene('service', (s, g, ui) => {
    const yEl = s.querySelector('.ws-y'), yv = s.querySelector('.ws-yv'), tEl = s.querySelector('.ws-t'), tv = s.querySelector('.ws-tv');
    ui.watch(yEl, tEl);
    const ACTS = [{ to: 8, y: 4, n: 100 }, { to: 16, y: 7, n: 150 }];
    return {
      dur: 16,
      frame(t, tour) {
        let yrs = +yEl.value, team = +tEl.value;
        if (tour) { const [a, k] = GK.act(ACTS, t); yrs = a.y; team = a.n; yEl.value = yrs; tEl.value = team; }
        yv.textContent = yrs + ' years'; tv.textContent = team + ' people';
        const span = yrs + 3, sweep = tour ? clamp((t % 8) / 6.5) * span : span;
        GK.panel(g);
        const lx = 250, ax = lx, aw = 760, ty = 56, rh = 34, sx = y => ax + y / span * aw;
        GK.head(g, `${yrs} years of development, then a service that never stops`, 20, 30);
        for (let y = 0; y <= span; y++) { g.strokeStyle = 'rgba(205,191,159,.6)'; g.beginPath(); g.moveTo(sx(y), ty - 6); g.lineTo(sx(y), ty + STEPS.length * rh + 8); g.stroke(); GK.text(g, y === yrs ? 'launch' : `year ${y}`, sx(y), ty - 10, y === yrs ? C.redDk : C.muted, 11, 'center', 700); }
        g.fillStyle = 'rgba(47,174,99,.1)'; g.fillRect(sx(yrs), ty - 4, sx(span) - sx(yrs), STEPS.length * rh + 10);
        STEPS.forEach(([n, a, b, live], i) => {
          const y = ty + i * rh; GK.text(g, n, 20, y + 21, C.ink, 13, 'left', 600);
          const x1 = sx(a * yrs), x2 = sx(Math.min(sweep, b * yrs)); if (x2 > x1) { g.fillStyle = C.player; g.beginPath(); g.roundRect(x1, y + 7, x2 - x1, rh - 14, 5); g.fill(); }
          if (live && sweep > yrs) { g.fillStyle = C.p2; g.beginPath(); g.roundRect(sx(yrs) + 2, y + 7, sx(sweep) - sx(yrs) - 2, rh - 14, 5); g.fill(); }
        });
        g.strokeStyle = C.redDk; g.lineWidth = 3; g.beginPath(); g.moveTo(sx(yrs), ty - 4); g.lineTo(sx(yrs), ty + STEPS.length * rh + 6); g.stroke();
        if (sweep > yrs) GK.text(g, 'live service: patches, servers, support', sx(yrs) + 8, ty + STEPS.length * rh + 22, C.good, 12, 'left', 700);
        const yb = 470, py = yrs * team;
        GK.big(g, `${py.toLocaleString()}`, 'person-years before launch', 20, yb);
        GK.big(g, `${team}`, 'people every year after it', 260, yb);
        GK.big(g, `${STEPS.filter(x => x[3]).length} of 10`, 'steps that keep going after launch', 480, yb, C.good);
        GK.wrap(g, 'The post’s figures: a 4 to 7 year development cycle, and even a "smaller" team of 100 to 150 people costs tens of millions of dollars a year. Launch is when the bills for servers and support start, not when they stop.', 20, yb + 50, 1000, 19, C.ink, 14);
        ui.stats(`<div><b>${py.toLocaleString()}</b><span>person-years before launch</span></div><div class="g"><b>${team}/yr</b><span>to keep the service running</span></div>`);
        ui.out('An MMORPG is not a product you ship; it is a service you start.');
      },
    };
  });
})();
