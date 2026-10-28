/* Ghost runs level and runner (MGM C4 M1, deck slides 77-78). A side-on level: solid ground with two pits, a spike bed
   under a high ledge, and a flag. run(seed) plays one attempt: the runner moves right at its own pace and presses jump at
   seeded random moments with a seeded hold, so every attempt is a different path. Pure functions, so ghosts.js can draw
   any moment and node can test the numbers. */
(function (root) {
  const LV = {
    w: 1000, h: 430, g: 1900, jump: 700, cut: .45,
    solids: [   // [x0, x1, top y, id]  ground pieces and ledges
      [0, 260, 400, 'start'], [345, 610, 400, 'mid'], [695, 1000, 400, 'end'],
      [430, 570, 295, 'ledge'], [650, 790, 300, 'high'],
    ],
    spikes: [[455, 530, 400]],   // [x0, x1, ground y] on the mid ground under the ledge
    flag: 950,
  };
  function rng(seed) { let s = seed * 9301 + 49297; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
  // one attempt: returns { pts: [[t,x,y]], end: 'flag' | 'pit' | 'spikes', at, route: ['start', ...] }
  function run(seed) {
    const r = rng(seed), vx = 220 + r() * 90, dt = 1 / 120;
    // each attempt reads the level a little differently: for every edge it jumps somewhere in a window before it,
    // holds for a random time, and sometimes hops for no reason
    const cues = [260, 455, 610].map(e => [e - r() * 130, .04 + r() * .3]);
    const presses = []; for (let t = .3 + r(); t < 7; t += .6 + r() * 1.6) if (r() < .5) presses.push([t, .05 + r() * .2]);
    let x = 30, y = 400, vy = 0, ground = 'start', time = 0, route = ['start'], pts = [[0, x, y]], end = null;
    let pi = 0, holding = null;
    while (time < 7 && !end) {
      time += dt;
      const cue = cues.find(c => !c.used && x >= c[0]);
      if (cue && ground) { cue.used = true; vy = -LV.jump; ground = null; holding = time + cue[1]; }
      if (pi < presses.length && time >= presses[pi][0]) { if (ground) { vy = -LV.jump; ground = null; holding = time + presses[pi][1]; } pi++; }
      if (holding && time > holding) { if (vy < 0) vy *= LV.cut; holding = null; }
      const ox = x, oy = y;
      x += vx * dt; vy += LV.g * dt; y += vy * dt;
      if (ground) {   // walking: fall off the end of the piece
        const s = LV.solids.find(s => s[3] === ground);
        if (x < s[0] || x > s[1]) { ground = null; vy = 0; } else { y = s[2]; vy = 0; }
      } else if (vy > 0) {   // landing from above
        const s = LV.solids.find(s => x >= s[0] && x <= s[1] && oy <= s[2] && y >= s[2]);
        if (s) { y = s[2]; vy = 0; ground = s[3]; if (route.at(-1) !== s[3]) route.push(s[3]); }
      } else {   // bonk the underside of a ledge
        const s = LV.solids.find(s => s[2] < 400 && x >= s[0] && x <= s[1] && oy >= s[2] + 16 && y < s[2] + 16);
        if (s) { y = s[2] + 16; vy = 0; }
      }
      if (ground === 'mid' && LV.spikes.some(k => x >= k[0] && x <= k[1])) end = 'spikes';
      if (y > LV.h + 40) end = 'pit';
      if (x >= LV.flag) end = 'flag';
      if (Math.round(time * 120) % 3 === 0 || end) pts.push([time, x, y]);
    }
    return { pts, end: end || 'time', at: time, route };
  }
  const api = { LV, run };
  if (typeof module !== 'undefined') module.exports = api; else root.GHOST = api;
})(this);
