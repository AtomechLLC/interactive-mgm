/* The first turn-based RPGs (genre breakdown: "What Was the First Turn-Based RPG Video Game?").
   A timeline of the games the post names, then a split frame: one world shown two ways, as Ultima I did in 1981 (a
   top-down overworld and first-person, one-point perspective dungeons). The art is our own simple drawing of the two
   views, not the game's. The post dates Wizardry to 1986; Wizardry: Proving Grounds of the Mad Overlord shipped in 1981,
   which is the date used here. Dragon Quest (1986) is added for context; it is not in the post. */
(function () {
  const C = TD.C, { clamp, lerp } = TD;
  const GAMES = [
    [1975, 'Dungeon', 'Don Daglow, PDP-10. Text, a party moving through a dungeon, turn-based combat and XP.', C.purple],
    [1981, 'Ultima I', 'Richard Garriott, Apple II. A top-down overworld and first-person dungeons.', C.red],
    [1981, 'Wizardry', 'Sir-Tech, Apple II. A first-person party crawler, D&D on a home computer.', C.player],
    [1986, 'Dragon Quest', 'Enix, Famicom. Turn-based RPGs move to consoles (not in the post; for context).', '#9a8f78'],
    [1996, 'Super Mario RPG', 'Square and Nintendo, SNES. Timed button presses inside turn-based battles.', C.p2],
  ];
  const MAP = ['~~~~~~~~~~~~~~~~', '~~..^^^....TT.~~', '~...^^...TTTT..~', '~..........TT..~', '~~...H.........~', '~~.......^^..D.~', '~~~..TT..^^....~', '~~~~~~~~~~~~~~~~'];
  function overworld(g, x0, y0, w, h, t) {
    const ts = Math.min(w / 16, h / 8);
    MAP.forEach((row, r) => [...row].forEach((ch, c) => {
      const x = x0 + c * ts, y = y0 + r * ts;
      g.fillStyle = ch === '~' ? '#3f74c9' : ch === '^' ? '#8b8fa8' : ch === 'T' ? '#2f7d3a' : '#7fb069'; g.fillRect(x, y, ts, ts);
      if (ch === '^') { g.fillStyle = '#d6dbef'; g.beginPath(); g.moveTo(x + ts / 2, y + 4); g.lineTo(x + ts - 4, y + ts - 4); g.lineTo(x + 4, y + ts - 4); g.fill(); }
      if (ch === 'T') { g.fillStyle = '#1d5527'; g.beginPath(); g.arc(x + ts / 2, y + ts / 2, ts * .35, 0, 6.283); g.fill(); }
      if (ch === 'H') { g.fillStyle = '#c9a36a'; g.fillRect(x + 6, y + ts * .4, ts - 12, ts * .5); g.fillStyle = C.redDk; g.beginPath(); g.moveTo(x + 3, y + ts * .45); g.lineTo(x + ts / 2, y + 6); g.lineTo(x + ts - 3, y + ts * .45); g.fill(); }
      if (ch === 'D') { g.fillStyle = '#222'; g.beginPath(); g.arc(x + ts / 2, y + ts * .7, ts * .35, Math.PI, 0); g.fill(); }
    }));
    const path = [[5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4], [12, 4], [13, 4], [13, 5]], k = Math.min(path.length - 1, Math.floor(t * 2.5) % (path.length + 4));
    const [c, r] = path[Math.min(k, path.length - 1)];
    g.fillStyle = '#fff'; g.beginPath(); g.arc(x0 + (c + .5) * ts, y0 + (r + .5) * ts, ts * .28, 0, 6.283); g.fill(); g.strokeStyle = C.navy; g.lineWidth = 2; g.stroke();
  }
  function dungeon(g, x0, y0, w, h, t) {
    g.fillStyle = '#000'; g.fillRect(x0, y0, w, h);
    g.strokeStyle = '#3ff07a'; g.lineWidth = 2;
    const cx = x0 + w / 2, cy = y0 + h / 2, step = (t * .6) % 1;
    const frame = d => { const s = 1 / (1 + d * .9); return [cx - w / 2 * s, cy - h / 2 * s, cx + w / 2 * s, cy + h / 2 * s]; };
    for (let i = 0; i < 4; i++) {
      const a = frame(i - step + 1), b = frame(i - step + 2);
      g.strokeRect(a[0], a[1], a[2] - a[0], a[3] - a[1]);
      [[0, 1], [2, 1], [0, 3], [2, 3]].forEach(([xi, yi]) => { g.beginPath(); g.moveTo(a[xi], a[yi]); g.lineTo(b[xi], b[yi]); g.stroke(); });
    }
    const e = frame(4 - step + 1); g.strokeRect(e[0], e[1], e[2] - e[0], e[3] - e[1]);
    // a door on the left wall
    const a = frame(2 - step), b = frame(2.6 - step);
    g.beginPath(); g.moveTo(a[0] + (b[0] - a[0]) * .2, lerp(a[3], b[3], .2)); g.lineTo(a[0] + (b[0] - a[0]) * .2, lerp(a[1], b[1], .2) + (a[3] - a[1]) * .35); g.lineTo(a[0] + (b[0] - a[0]) * .8, lerp(a[1], b[1], .8) + (b[3] - b[1]) * .35); g.lineTo(a[0] + (b[0] - a[0]) * .8, lerp(a[3], b[3], .8)); g.stroke();
  }

  GK.scene('first', (s, g, ui) => {
    const btns = [...s.querySelectorAll('.fr-view .btn')]; let view = 'over';
    btns.forEach(b => b.onclick = () => { view = b.dataset.v; }); ui.watch(btns);
    return {
      dur: 22,
      frame(t, tour) {
        const shown = tour ? clamp(Math.floor(t / 1.6) + 1, 1, GAMES.length) : GAMES.length;
        if (tour) view = t < 10 ? 'over' : t < 14 ? 'over' : t < 18 ? 'dungeon' : 'over';
        btns.forEach(b => b.classList.toggle('on', b.dataset.v === view));
        GK.panel(g);
        // timeline
        const ax = 40, aw = 960, ly = 70, yr = y => ax + (y - 1974) / (1997 - 1974) * aw;
        GK.head(g, 'Early turn-based RPGs', ax, 30);
        g.strokeStyle = C.navy; g.lineWidth = 3; g.beginPath(); g.moveTo(ax, ly); g.lineTo(ax + aw, ly); g.stroke();
        [1975, 1980, 1985, 1990, 1995].forEach(y => { g.fillStyle = C.navy; g.fillRect(yr(y) - 1, ly - 6, 2, 12); GK.text(g, y, yr(y), ly - 12, C.muted, 11, 'center', 600); });
        GAMES.slice(0, shown).forEach(([y, n, d, col], i) => {
          const x = yr(y), bx = clamp(x - 90 + (n === 'Wizardry' ? 100 : n === 'Ultima I' ? -90 : 0), ax, ax + aw - 186), by = 90 + (i % 2) * 80;
          g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); g.moveTo(x, ly); g.lineTo(x, by); g.stroke();
          g.fillStyle = col; g.beginPath(); g.arc(x, ly, 7, 0, 6.283); g.fill();
          GK.box(g, bx, by, 186, 72, '#fffaf0', col, 8, 2);
          GK.head(g, `${n} · ${y}`, bx + 8, by + 18, 'left', C.ink, 13); GK.wrap(g, d, bx + 8, by + 34, 172, 14, C.muted, 11);
        });
        // split frame
        const fy = 270, fh = 300;
        GK.head(g, 'Ultima I’s two views of one world', ax, fy - 10);
        GK.box(g, ax, fy, 470, fh - 10, '#fffaf0', view === 'over' ? C.gold : '#cdbf9f', 10, view === 'over' ? 4 : 2);
        GK.box(g, ax + 490, fy, 470, fh - 10, '#fffaf0', view === 'dungeon' ? C.gold : '#cdbf9f', 10, view === 'dungeon' ? 4 : 2);
        g.save(); g.globalAlpha = view === 'over' ? 1 : .35; overworld(g, ax + 11, fy + 34, 448, 224, t); g.restore();
        g.save(); g.globalAlpha = view === 'dungeon' ? 1 : .35; dungeon(g, ax + 501, fy + 34, 448, 224, t); g.restore();
        GK.text(g, 'Overworld: top-down, third person. Walk to the cave.', ax + 12, fy + 24, C.ink, 13, 'left', 700);
        GK.text(g, 'Dungeon: first person, one-point perspective.', ax + 502, fy + 24, C.ink, 13, 'left', 700);
        GK.text(g, 'our own drawings of the two kinds of view, not the game’s art', ax + aw, fy + fh + 6, C.muted, 11, 'right');
        ui.stats(`<div><b>1975</b><span>Dungeon, the post’s first turn-based RPG</span></div><div class="y"><b>1981</b><span>Ultima I splits the world into two views</span></div>`);
        ui.out(view === 'over' ? 'Up top, the map is about where to go: towns, mountains, the cave mouth.' : 'Underground, the view is about what is in front of you: corridors, doors and the next fight.');
      },
    };
  });
})();
