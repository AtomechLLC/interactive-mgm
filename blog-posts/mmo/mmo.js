/* Shared world or instance (genre breakdown: "MMO Game Design").
   The same rare monster for the same players, two ways. Open world: one copy respawns every 5 minutes and whoever
   tags it first gets the kill, so everyone else waits for the next spawn. Instanced: each party of five gets its own
   copy, which takes 20 minutes to reach and clear. Players and parties are seeded; respawn and run times are
   illustrative. 1 s of page time = 1 minute of game time. */
(function () {
  const C = TD.C, { clamp, lerp } = TD;
  const RESPAWN = 5, RUN = 20, HOUR = 60;
  // open world: who tags each spawn (seeded), and each player's wait for their first kill
  function openWorld(n) {
    const R = GK.rng(n + 3), got = new Array(n).fill(null), order = [];
    for (let k = 0; k * RESPAWN < 10 * HOUR; k++) { const w = Math.floor(R() * n); order.push(w); if (got[w] == null) got[w] = (k + 1) * RESPAWN; }
    const waits = got.map(x => x ?? 10 * HOUR), kph = n ? (HOUR / RESPAWN) / n : 0;
    return { order, waits, mean: waits.reduce((a, b) => a + b, 0) / n, kph };
  }
  GK.scene('mmo', (s, g, ui) => {
    const nEl = s.querySelector('.mm-n'), nv = s.querySelector('.mm-nv'); ui.watch(nEl);
    const ACTS = [{ to: 18, n: 30 }, { to: 30, n: 10 }, { to: 42, n: 60 }];
    return {
      dur: 42,
      frame(t, tour) {
        let n = +nEl.value; if (tour) { const [a] = GK.act(ACTS, t); n = a.n; nEl.value = n; }
        nv.textContent = n + ' players';
        const ow = openWorld(n), m = tour ? t % 12 + 0 : t % 30;   // game minutes shown
        const parties = Math.ceil(n / 5);
        GK.panel(g);
        // open world
        const x0 = 16, y0 = 40, w = 500, h = 360;
        GK.head(g, 'Open world: one copy, everyone contests it', x0, 28);
        g.fillStyle = '#7fb069'; g.beginPath(); g.roundRect(x0, y0, w, h, 10); g.fill();
        const cx = x0 + w / 2, cy = y0 + h / 2, k = Math.floor(m / RESPAWN), phase = (m % RESPAWN) / RESPAWN, alive = phase < .25;
        const R = GK.rng(n * 7 + 1);
        for (let i = 0; i < n; i++) {
          const a = R() * 6.283, d = 60 + R() * 120, pull = alive ? clamp(phase / .25) * .6 : 0;
          const px = cx + Math.cos(a) * d * (1 - pull), py = cy + Math.sin(a) * d * .8 * (1 - pull);
          const winner = ow.order[k] === i && phase >= .2 && phase < .45;
          TD.player(px, py, a + Math.PI, .55, 1, winner ? C.gold : C.player);
        }
        if (alive) { TD.foe(cx, cy, 22, 0, C.purple, { mark: 'horns' }); TD.label('Rare spawn!', cx, cy - 38, 'center', C.purple, 13); }
        else TD.label(`respawns in ${Math.ceil((1 - phase) * RESPAWN)} min`, cx, cy, 'center', C.muted, 13);
        if (phase >= .2 && phase < .45) TD.label('one player tags it first; the rest wait', cx, y0 + h - 18, 'center', C.goldInk, 12);
        // instances
        const ix = 532, iw = 492;
        GK.head(g, `Instanced: ${parties} parties, a copy each`, ix, 28);
        const cols = parties > 8 ? 4 : 3, rows = Math.ceil(Math.min(parties, 12) / cols), bw = (iw - (cols - 1) * 8) / cols, bh = Math.min(116, (h - (rows - 1) * 8) / rows);
        for (let p = 0; p < Math.min(parties, 12); p++) {
          const bx = ix + (p % cols) * (bw + 8), by = y0 + Math.floor(p / cols) * (bh + 8), prog = ((m + p * 1.7) % RUN) / RUN;
          TD.floor(bx, by, bw, bh); g.strokeStyle = C.navy; g.lineWidth = 2; g.strokeRect(bx, by, bw, bh);
          const size = Math.min(5, n - p * 5);
          for (let i = 0; i < size; i++) TD.player(bx + 18 + prog * (bw - 70) + (i % 3) * 10, by + bh / 2 - 10 + Math.floor(i / 3) * 18, 0, .38, 1, C.player);
          if (prog < .92) TD.foe(bx + bw - 22, by + bh / 2, 13, Math.PI, C.purple, { mark: 'horns' });
          else TD.label('cleared', bx + bw - 30, by + bh / 2, 'center', C.good, 11);
        }
        if (parties > 12) GK.text(g, `+${parties - 12} more copies`, ix + iw, y0 + h + 14, C.muted, 12, 'right', 600);
        // readouts
        const yb = 430;
        GK.head(g, 'For each player', x0, yb);
        const instWait = RUN, instKph = HOUR / RUN;
        GK.big(g, `${Math.round(ow.mean)} min`, 'average wait for a first kill, open world', x0, yb + 36, ow.mean > 60 ? C.red : C.ink);
        GK.big(g, `${ow.kph.toFixed(2)}`, 'kills per player per hour, open world', x0 + 260, yb + 36);
        GK.big(g, `${instWait} min`, 'wait for a first kill, instanced', ix, yb + 36, C.good);
        GK.big(g, `${instKph.toFixed(2)}`, 'kills per player per hour, instanced', ix + 260, yb + 36);
        GK.wrap(g, 'The open world is shared and alive, and it rations the monster: more players means longer waits. An instance copies the content, so the wait stays the same however many players log in.', x0, yb + 96, 1000, 19, C.ink, 14);
        ui.stats(`<div class="${ow.mean > 60 ? 'r' : 'y'}"><b>${Math.round(ow.mean)} min</b><span>average first-kill wait, open world</span></div><div class="g"><b>${instWait} min</b><span>instanced, any number of parties</span></div>`);
        ui.out(n <= 10 ? 'With few players around, the shared spawn works: everyone gets a turn soon.' : 'With a crowd, the shared spawn becomes a queue nobody can see.');
      },
    };
  });
})();
