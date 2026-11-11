/* Puzzle dependency chart (genre breakdown: "Adventure Game Design").
   Each puzzle needs items and gives items. Solving every puzzle whose needs are met, wave after wave, lays the chart out
   in columns: the column is the earliest wave a puzzle can be solved in, and several puzzles in one column are
   parallel branches the player can take in any order. A puzzle no wave reaches is a dead end; the classic one is a key
   locked behind its own lock. The office-building puzzles are original, built for this page: a corporate
   adventure from the lobby lost-and-found up to a pitch in the 30th-floor boardroom. */
(function () {
  const C = TD.C;
  // [puzzle, needs, gives, where in the building]
  const PRESETS = {
    linear: { label: 'One long chain', acts: [
      ['Search the lobby lost-and-found', [], ['badge'], 'lobby'], ['Slip into the supply closet', ['badge'], ['keycard'], '3rd floor'],
      ['Open the server room', ['keycard'], ['drive'], 'basement'], ['Trade the drive to the receptionist', ['drive'], ['code'], 'lobby'],
      ['Crack the manager\'s desk', ['code'], ['memo'], '12th floor'], ['Call the executive elevator', ['memo'], ['lift'], 'elevator bank'],
      ['Pitch in the boardroom', ['lift'], ['goal'], '30th floor']] },
    parallel: { label: 'Parallel branches', acts: [
      ['Search the lobby lost-and-found', [], ['badge'], 'lobby'], ['Chat up the receptionist', [], ['code'], 'lobby'],
      ['Slip into the supply closet', ['badge'], ['keycard'], '3rd floor'], ['Open the server room', ['keycard'], ['drive'], 'basement'],
      ['Crack the manager\'s desk', ['code'], ['memo'], '12th floor'], ['Call the executive elevator', ['code'], ['lift'], 'elevator bank'],
      ['Pitch in the boardroom', ['drive', 'memo', 'lift'], ['goal'], '30th floor']] },
    dead: { label: 'A key behind its lock', acts: [
      ['Search the lobby lost-and-found', [], ['badge'], 'lobby'], ['Chat up the receptionist', [], ['code'], 'lobby'],
      ['Slip into the supply closet', ['badge', 'keycard'], ['keycard'], '3rd floor'], ['Open the server room', ['keycard'], ['drive'], 'basement'],
      ['Crack the manager\'s desk', ['code'], ['memo'], '12th floor'], ['Call the executive elevator', ['code'], ['lift'], 'elevator bank'],
      ['Pitch in the boardroom', ['drive', 'memo', 'lift'], ['goal'], '30th floor']] },
  };
  function solve(acts) {
    const have = new Set(), depth = acts.map(() => -1); let w = 0, changed = true;
    while (changed) {
      changed = false; const now = [];
      acts.forEach((a, i) => { if (depth[i] < 0 && a[1].every(x => have.has(x))) { depth[i] = w; now.push(i); changed = true; } });
      now.forEach(i => acts[i][2].forEach(x => have.add(x))); w++;
    }
    const waves = Math.max(...depth) + 1, width = Math.max(...Array.from({ length: waves }, (_, d) => depth.filter(x => x === d).length));
    const dead = depth.map((d, i) => d < 0 && acts[i][1].some(x => acts[i][2].includes(x)));
    return { depth, waves, width, dead, won: have.has('goal') };
  }
  const SOL = {}; Object.keys(PRESETS).forEach(k => SOL[k] = solve(PRESETS[k].acts));

  GK.scene('deps', (s, g, ui) => {
    const btns = [...s.querySelectorAll('.ad-p')]; ui.watch(btns);
    let pre = 'linear'; btns.forEach(b => b.onclick = () => { pre = b.dataset.p; });
    const ORDER = ['linear', 'parallel', 'dead'], PER = 9;
    return {
      dur: PER * 3,
      frame(t, tour) {
        let reveal = 99;
        if (tour) { pre = ORDER[Math.floor(t / PER) % 3]; reveal = (t % PER) / 1.1; }
        btns.forEach(b => b.classList.toggle('on', b.dataset.p === pre));
        const acts = PRESETS[pre].acts, S = SOL[pre];
        GK.panel(g);
        const cols = S.waves + (S.depth.some(d => d < 0) ? 1 : 0), CW = Math.min(175, 985 / cols), BW = Math.min(135, CW - 30);
        const colOf = i => S.depth[i] < 0 ? S.waves : S.depth[i];
        const rowIdx = acts.map((a, i) => acts.slice(0, i).filter((b, j) => colOf(j) === colOf(i)).length);
        const colN = i => acts.filter((b, j) => colOf(j) === colOf(i)).length;
        const at = i => { const n = colN(i); return [30 + colOf(i) * CW, 80 + (380 - n * 100) / 2 + rowIdx[i] * 100 + 50]; };
        // column headers
        for (let c = 0; c < cols; c++) {
          const never = c === S.waves;
          GK.text(g, never ? 'never solvable' : `wave ${c + 1}`, 30 + c * CW + BW / 2, 50, never ? C.redDk : C.muted, 12, 'center', 700);
          if (never) { g.fillStyle = 'rgba(229,50,45,.06)'; g.fillRect(30 + c * CW - 6, 60, BW + 12, 410); }
        }
        // edges: producer -> consumer, labelled with the item
        acts.forEach((a, i) => a[1].forEach(item => {
          acts.forEach((b, j) => {
            if (!b[2].includes(item)) return;
            const [x1, y1] = at(j), [x2, y2] = at(i), vis = Math.min(colOf(i), colOf(j)) <= reveal;
            if (!vis) return;
            const self = i === j, col = S.dead[i] ? C.redDk : '#8e86a8';
            if (self) { g.strokeStyle = col; g.lineWidth = 2.5; g.beginPath(); g.arc(x1 + BW / 2, y1 - 46, 16, Math.PI * .1, Math.PI * .9, true); g.stroke(); TD.label(item + ' is inside', x1 + BW / 2, y1 - 68, 'center', C.redDk, 11); return; }
            g.strokeStyle = col; g.lineWidth = 2; g.beginPath();
            if (colOf(i) === colOf(j)) { const X = x1 + BW; g.moveTo(X, y1); g.bezierCurveTo(X + 34, y1, X + 34, y2, X + 2, y2); g.stroke(); g.fillStyle = col; g.beginPath(); g.moveTo(X, y2); g.lineTo(X + 7, y2 - 4); g.lineTo(X + 7, y2 + 4); g.fill(); return; }
            const sx = x1 + BW, ex = x2;
            g.moveTo(sx, y1); g.bezierCurveTo(sx + 22, y1, ex - 22, y2, ex, y2); g.stroke();
            g.fillStyle = col; g.beginPath(); g.moveTo(ex, y2); g.lineTo(ex - 7, y2 - 4); g.lineTo(ex - 7, y2 + 4); g.fill();
          });
        }));
        // puzzle boxes
        acts.forEach((a, i) => {
          const [x, y] = at(i), vis = colOf(i) <= reveal, goal = a[2].includes('goal'), dead = S.depth[i] < 0;
          g.globalAlpha = vis ? 1 : .25;
          GK.box(g, x, y - 40, BW, 80, dead ? '#fbe3e0' : goal ? '#fff3d6' : '#fffaf0', dead ? C.red : goal ? C.gold : '#cdbf9f', 9, 2);
          GK.text(g, a[3].toUpperCase(), x + 8, y - 26, dead ? C.redDk : goal ? C.goldInk : '#8e86a8', 9.5, 'left', 700);
          GK.wrap(g, a[0], x + 8, y - 10, BW - 16, 14, C.ink, 11.5, 700);
          GK.text(g, `needs: ${a[1].length ? a[1].join(', ') : 'nothing'}`, x + 8, y + 20, dead ? C.redDk : C.muted, 10.5, 'left', 600);
          GK.text(g, goal ? 'the goal' : `gives: ${a[2].join(', ')}`, x + 8, y + 34, goal ? C.goldInk : C.good, 10.5, 'left', 700);
          g.globalAlpha = 1;
        });
        // readouts
        GK.big(g, S.won ? `${S.waves}` : '—', 'waves to the goal', 30, 512, S.won ? C.ink : C.redDk);
        GK.big(g, `${S.width}`, 'most puzzles open at once', 200, 512, S.width > 1 ? C.good : C.ink);
        GK.big(g, `${S.depth.filter(d => d < 0).length}`, 'puzzles never solvable', 420, 512, S.depth.some(d => d < 0) ? C.redDk : C.good);
        GK.wrap(g, S.won ? (S.width > 1 ? 'Parallel branches: when one puzzle stumps the player, another is open.' : 'A single chain: one stuck puzzle stops the whole game.')
          : 'Dead end: the keycard that opens the supply closet is locked inside the supply closet, so the boardroom is out of reach.', 640, 506, 380, 19, S.won ? C.ink : C.redDk, 14, 600);
        ui.stats(`<div><b>${S.width}</b><span>most open at once</span></div><div class="${S.won ? 'g' : ''}"><b>${S.won ? 'yes' : 'no'}</b><span>can the game be finished?</span></div>`);
        ui.out('Each puzzle is a lock with its keys. Lay them out by the earliest wave they open and the chart shows both the breadth a player can wander and any lock that never opens.');
      },
    };
  });
})();
