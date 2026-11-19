/* Disguises as signals (Hitman), beside The Guarded Door (MGM C4 M2).
   One hallway, four doors, four receivers. Pip plays Agent 47: the outfit (or the lockpick) is the signal he sends,
   and each door has a receiver with its own rule. The cast acts out every test and the grid under the hallway fills in.
   Rules: SIG (signals), DOORS (receiver, accepts, enforcer), verdict(). Our own mansion, not a level from the game. */
(function () {
  const { txt, box, pill, bubble, clamp, lerp, C, dot } = SCN;
  const W = 1040, H = 585, FLOOR = 292, S = .9, HOME = 70;
  const SIG = [
    { id: 'suit', name: 'Suit', col: '#2b2d3a', trim: '#e5322d' },
    { id: 'waiter', name: 'Waiter', col: '#f3efe4', trim: '#2b2d3a' },
    { id: 'guard', name: 'Guard uniform', col: '#3f5fa8', trim: '#ffb951' },
    { id: 'pick', name: 'Suit + lockpick', col: '#2b2d3a', trim: '#e5322d' },
  ];
  const DOORS = [
    { id: 'kitchen', name: 'Kitchen', x: 318, who: 'sam', job: 'Porter', tint: '#f3efe4', ok: ['waiter', 'guard'], no: 'Staff only, sir.', wood: '#b9824d' },
    { id: 'office', name: 'Security office', x: 536, who: 'rook', job: 'Guard', tint: '#3f5fa8', ok: ['guard'], no: 'Security only.', wood: '#6b7ea8' },
    { id: 'lounge', name: 'VIP lounge', x: 754, who: 'bram', job: 'Bodyguard', enf: 'guard', ok: ['waiter'], no: 'Not on the list.', wood: '#8a3d52' },
    { id: 'cellar', name: 'Cellar', x: 962, who: null, ok: ['pick'], no: '', wood: '#6f5a45' },
  ];
  function verdict(sig, door) {
    if (door.who && sig.id === 'pick') return { r: 'caught', say: 'Hey! Away from that lock.' };
    if (door.enf === sig.id) return { r: 'seen', say: 'I know every guard here.' };
    if (door.ok.includes(sig.id)) return { r: 'in', say: door.who ? 'Go ahead.' : '' };
    return { r: 'no', say: door.no };
  }
  const CELL = { in: ['✓ let in', '#d8f0df', '#145c33'], no: ['✕ turned away', '#efe6d2', '#6d5a3a'], seen: ['! seen through', '#f9d9d6', '#8a1c15'], caught: ['! caught picking', '#f9d9d6', '#8a1c15'] };
  const GX = 214, GY = 388, CW = 200, CH = 40, GAP = 6;

  SCN.run('disguise', s => {
    let sig, grid, trial, last;
    const stopX = d => d.x - (d.who ? 150 : 52);
    function start(si, di) {
      if (trial) finish();
      sig = si; api.mark?.('sig', SIG[si].id);
      const d = DOORS[di]; trial = { si, di, t: 0, walk: (stopX(d) - HOME) / 430, v: verdict(SIG[si], d) };
    }
    function finish() { grid[trial.si][trial.di] = trial.v.r; last = trial; trial = null; }
    const api = {
      dur: 40,
      reset() { sig = 0; grid = SIG.map(() => DOORS.map(() => null)); trial = null; last = null; api.mark?.('sig', 'suit'); },
      step(h) { if (!trial) return; trial.t += h; if (trial.t > trial.walk + .5) grid[trial.si][trial.di] = trial.v.r; if (trial.t > trial.walk + 2.0) finish(); },
      script: [[.6, [0, 0]], [4.2, [1, 0]], [7.8, [1, 1]], [11.6, [2, 1]], [15.4, [2, 2]], [19.6, [1, 2]], [23.4, [2, 3]], [27.4, [3, 3]], [31.4, [3, 1]]].map(([t, [a, b]]) => [t, () => start(a, b)])
        .concat([[35.5, () => { SIG.forEach((sg, i) => DOORS.forEach((d, j) => { grid[i][j] = verdict(sg, d).r; })); }]]),
      caption: t => t < 4.2 ? 'In his own suit, Pip sends a signal no door accepts. The porter reads it and turns him away.'
        : t < 7.8 ? 'Same door, new signal. The porter\'s rule accepts a waiter, so the door opens.'
        : t < 11.6 ? 'The waiter outfit is a narrow tool: the guard at the security office does not accept it.'
        : t < 15.4 ? 'The guard uniform is broader. It opens the office and the kitchen.'
        : t < 19.6 ? 'But the bodyguard is an enforcer: he knows every real guard, so this one signal fails on him.'
        : t < 23.4 ? 'The waiter gets into the lounge. A narrow tool works where the broad one is seen through.'
        : t < 27.4 ? 'A lock is a receiver too. It ignores every outfit.'
        : t < 31.4 ? 'The lockpick is the only signal the cellar lock accepts.'
        : t < 35.5 ? 'And it fails anywhere a person can watch you use it.'
        : 'No signal opens every door, and every receiver has a rule you can read. That is what makes the mansion a puzzle.',
      status() {
        if (trial) return `${SIG[trial.si].name} at the ${DOORS[trial.di].name.toLowerCase()} door...`;
        if (!last) return 'Pick what Pip wears, then send him to a door. Or click any square in the grid.';
        const d = DOORS[last.di], sg = SIG[last.si];
        return { in: `${sg.name}: the ${d.who ? d.job.toLowerCase() : 'lock'} accepts that signal.`, no: `${sg.name}: the ${d.who ? d.job.toLowerCase() + '\'s' : 'lock\'s'} rule does not accept that signal.`,
          seen: `${sg.name}: an enforcer knows the people who really wear that outfit.`, caught: 'A lockpick only works where nobody is watching.' }[last.v.r];
      },
      stats() {
        const open = DOORS.filter((d, j) => grid.some(r => r[j] === 'in')).length, tested = grid.flat().filter(Boolean).length;
        const best = Math.max(...grid.map(r => r.filter(v => v === 'in').length));
        return `<div class="g"><b>${open}/4</b><span>doors Pip has got through</span></div><div><b>${tested}/16</b><span>signal and receiver pairs tested</span></div><div class="y"><b>${best}</b><span>most doors any one signal has opened</span></div>`;
      },
      acts: { go(di) { start(sig, +di); } },
      set(k, v) { if (k === 'sig') sig = SIG.findIndex(x => x.id === v); },
      point(p) {
        if (p.type !== 'down') return;
        const j = Math.floor((p.x - GX) / (CW + GAP)), i = Math.floor((p.y - GY) / (CH + GAP));
        if (i >= 0 && i < 4 && j >= 0 && j < 4 && p.x >= GX) start(i, j);
      },
      draw(g, t) {
        g.clearRect(0, 0, W, H); g.save(); SCN.clipStage(g, W, H);
        // hallway
        g.fillStyle = '#e9dcc0'; g.fillRect(0, 0, W, FLOOR);
        g.fillStyle = 'rgba(160,120,70,.13)'; for (let x = 10; x < W; x += 44) g.fillRect(x, 0, 14, FLOOR - 70);
        g.fillStyle = '#c9b48e'; g.fillRect(0, FLOOR - 70, W, 70); g.fillStyle = '#a98f66'; g.fillRect(0, FLOOR - 74, W, 6);
        g.fillStyle = '#7a4b3a'; g.fillRect(0, FLOOR, W, 44); g.fillStyle = '#93604a'; for (let x = 0; x < W; x += 90) g.fillRect(x, FLOOR, 84, 5);
        g.fillStyle = 'rgba(255,252,244,.96)'; g.fillRect(0, FLOOR + 44, W, H - FLOOR - 44);
        const tr = trial, act = tr ? clamp((tr.t - tr.walk) / 1.3) : 0, opened = tr && tr.v.r === 'in' && tr.t > tr.walk + .5;
        DOORS.forEach((d, j) => {
          const open = opened && tr.di === j;
          box(g, d.x - 44, FLOOR - 158, 88, 158, { r: 4, fill: '#4a3626' });
          box(g, d.x - 38, FLOOR - 152, 76, 152, { r: 3, fill: open ? '#1a1410' : d.wood });
          if (!open) { g.strokeStyle = 'rgba(0,0,0,.22)'; g.lineWidth = 2; g.strokeRect(d.x - 28, FLOOR - 140, 56, 56); g.strokeRect(d.x - 28, FLOOR - 72, 56, 58); dot(g, d.x + 26, FLOOR - 70, 4.5, '#f1d48a'); }
          else { g.fillStyle = d.wood; g.beginPath(); g.moveTo(d.x + 38, FLOOR - 152); g.lineTo(d.x + 56, FLOOR - 144); g.lineTo(d.x + 56, FLOOR + 6); g.lineTo(d.x + 38, FLOOR); g.fill(); }
          if (!d.who && !open) { box(g, d.x - 11, FLOOR - 84, 22, 20, { r: 4, fill: '#d8b446', stroke: '#6b4f10' }); g.strokeStyle = '#6b4f10'; g.lineWidth = 4; g.beginPath(); g.arc(d.x, FLOOR - 86, 8, Math.PI, 0); g.stroke(); }
          pill(g, d.name, d.x, 22, { size: 16, w: 700, fill: C.navy });
          // the receiver's rule: which signals it accepts, and which one it sees through
          const acc = SIG.filter(sg => verdict(sg, d).r === 'in'), bw = 62 + acc.length * 21 + (d.enf ? 96 : 0), bx = d.x - bw / 2;
          box(g, bx, 40, bw, 24, { r: 6, fill: 'rgba(255,250,240,.9)', stroke: '#cdbf9f', lw: 1.5 });
          txt(g, 'accepts', bx + 8, 53, { size: 12, w: 700, col: C.muted });
          const sw = (sg, cx) => { box(g, cx - 8, 44, 16, 16, { r: 4, fill: sg.col, stroke: '#1b2147', lw: 1.5 }); g.fillStyle = sg.trim; g.fillRect(cx - 6, 54, 12, 3); if (sg.id === 'pick') { g.strokeStyle = '#ffd98a'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx - 4, 53); g.lineTo(cx + 4, 46); g.stroke(); } };
          acc.forEach((sg, i) => sw(sg, bx + 66 + i * 21));
          if (d.enf) { const ex = bx + 62 + acc.length * 21 + 6; txt(g, 'sees through', ex, 53, { size: 12, w: 700, col: C.red }); sw(SIG.find(x => x.id === d.enf), ex + 80); }
          if (d.who) {
            const mine = tr && tr.di === j && tr.t > tr.walk, r = mine ? tr.v.r : null;
            const pose = !mine ? 'idle' : r === 'in' ? CAST.mix('idle', 'point', act) : r === 'seen' ? CAST.mix('idle', 'guard', act) : CAST.mix('idle', 'block', act);
            CAST.draw(g, d.who, { x: d.x - 70, y: FLOOR + 8, s: S, face: -1, tint: d.tint, pose, weapon: null });
            txt(g, d.job, d.x - 70, FLOOR + 30, { size: 13, w: 700, col: '#f6e9d2', align: 'center' });
            if (d.enf) { dot(g, d.x - 70, FLOOR - 152, 7, '#fff'); SCN.ring(g, d.x - 70, FLOOR - 152, 7, C.navy, 2); txt(g, 'enforcer', d.x - 58, FLOOR - 152, { size: 12, w: 700, col: C.ink }); }
            if (mine && tr.v.say && tr.t < tr.walk + 1.9) bubble(g, tr.v.say, d.x - 74, FLOOR - 162, { size: 15, max: 150, fill: r === 'in' ? '#e6f6ea' : r === 'no' ? '#fff' : '#fde3e0', W });
          } else txt(g, 'no one watching', d.x, FLOOR + 30, { size: 13, w: 700, col: '#f6e9d2', align: 'center' });
        });
        // Pip, wearing the signal
        const sg = SIG[tr ? tr.si : sig];
        let px = HOME, face = 1, pose = 'idle', alpha = 1;
        if (tr) {
          const d = DOORS[tr.di], sx = stopX(d);
          if (tr.t < tr.walk) { px = lerp(HOME, sx, tr.t / tr.walk); pose = CAST.cycle('walk', tr.t * 2.4); }
          else if (tr.t < tr.walk + 1.2) { px = sx; pose = sg.id === 'pick' ? CAST.mix('idle', 'crouch', clamp((tr.t - tr.walk) * 4)) : 'idle'; }
          else { const k = clamp((tr.t - tr.walk - 1.2) / .8); if (tr.v.r === 'in') { px = lerp(sx, d.x, k); alpha = 1 - k; pose = CAST.cycle('walk', tr.t * 2.4); } else { px = lerp(sx, HOME, SCN.ease(k)); face = -1; pose = CAST.cycle('run', tr.t * 2.6); } }
        }
        CAST.draw(g, 'pip', { x: px, y: FLOOR + 8, s: S, face, tint: sg.col, trim: sg.trim, pose, weapon: null, alpha });
        if (alpha > .5) txt(g, 'Pip', px, FLOOR + 30, { size: 14, w: 800, col: '#ffd98a', align: 'center' });
        if (sg.id === 'pick' && alpha > .5) { g.strokeStyle = '#ffd98a'; g.lineWidth = 3; g.beginPath(); g.moveTo(px + 20 * face, FLOOR - 52); g.lineTo(px + 38 * face, FLOOR - 62); g.stroke(); }
        // the grid: signal rows by receiver columns
        txt(g, 'signal  \\  receiver', 20, GY - 20, { size: 13, w: 700, col: C.muted });
        DOORS.forEach((d, j) => txt(g, d.who ? `${d.job} · ${d.name}` : `Lock · ${d.name}`, GX + j * (CW + GAP) + CW / 2, GY - 20, { size: 14, w: 700, align: 'center' }));
        SIG.forEach((r, i) => {
          const y = GY + i * (CH + GAP), on = (tr ? tr.si : sig) === i;
          box(g, 14, y, GX - 22, CH, { r: 8, fill: on ? '#fde9b8' : 'rgba(239,230,210,.7)', stroke: on ? C.amber : null });
          box(g, 24, y + 9, 22, 22, { r: 5, fill: r.col, stroke: C.ink, lw: 2 }); g.fillStyle = r.trim; g.fillRect(26, y + 22, 18, 4);
          txt(g, r.name, 56, y + CH / 2 + 1, { size: 15, w: 700 });
          DOORS.forEach((d, j) => {
            const x = GX + j * (CW + GAP), v = grid[i][j], live = tr && tr.si === i && tr.di === j;
            const c = v ? CELL[v] : null;
            box(g, x, y, CW, CH, { r: 8, fill: c ? c[1] : '#fffaf0', stroke: live ? C.blue : '#cdbf9f', lw: live ? 4 : 2 });
            if (c) txt(g, c[0], x + CW / 2, y + CH / 2 + 1, { size: 15, w: 700, align: 'center', col: c[2] });
          });
        });
        g.restore();
      },
    };
    return api;
  });
})();
