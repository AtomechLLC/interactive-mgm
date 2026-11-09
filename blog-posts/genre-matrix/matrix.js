/* Genre by verb (genre breakdown: "22 Types of Video Games (Different Game Genres)").
   The post's 22 genres against six verbs. A filled dot is the verb the genre's description leads with, a ring is one
   it also names; the reading of each description is ours. Genres with their own interactive on this site link to it:
   click a row. Pick a verb to light up every genre that leans on it. */
(function () {
  const C = TD.C;
  const VERBS = ['move', 'aim', 'plan', 'build', 'choose', 'manage'];
  // [genre, words from the post's description, verbs: 2 = leads with, 1 = also names, page folder or null]
  const G = [
    ['Action', 'coordination, reflexes, precision', { move: 2, aim: 1 }, 'arcade-risk'],
    ['Adventure', 'exploration, problem-solving, puzzles', { plan: 2, move: 1, choose: 1 }, 'adventure-deps'],
    ['Simulation', 'many variables, options, realism', { manage: 2, plan: 1 }, null],
    ['Fighting', 'reflexes, movesets, hitboxes, timing', { move: 2, aim: 1 }, null],
    ['Sports', 'strategy, timing and reflexes', { move: 2, plan: 1 }, 'sports-assist'],
    ['Survival', 'health, hunger, resources, shelter', { manage: 2, build: 1, plan: 1 }, 'survival'],
    ['Puzzle', 'deduction, spatial reasoning', { plan: 2 }, 'puzzle-reverse'],
    ['Racing', 'skill, reaction time, track knowledge', { move: 2 }, 'racing-camera'],
    ['Roleplaying', 'actions, development and decisions', { choose: 2, manage: 1 }, 'rpg-power'],
    ['Sandbox', 'open-ended, players set their goals', { build: 2, choose: 1 }, 'sandbox-tools'],
    ['First-person shooter', 'reflexes, accuracy, spatial awareness', { aim: 2, move: 1 }, 'valorant-strafe'],
    ['Platformer', 'precision timing, fluid movement', { move: 2 }, 'platformer'],
    ['MMO', 'shared world: economy, social, combat', { choose: 2, manage: 1, move: 1 }, 'mmo'],
    ['MOBA', 'team battles, objectives, lanes', { plan: 2, aim: 1, move: 1 }, 'moba'],
    ['Shooter', 'ranged weapons, reaction, aim', { aim: 2, move: 1 }, 'fortnite-storm'],
    ['Strategy', 'resources, planning, tactics', { plan: 2, manage: 1 }, null],
    ['Stealth', 'cunning, patience, patterns', { plan: 2, move: 1 }, 'stealth'],
    ['Casual', 'simple rules, forgiving difficulty', { plan: 2 }, 'casual-curve'],
    ['Text-based', 'text input and imagination', { choose: 2, plan: 1 }, 'text-input'],
    ['Visual novel', 'text story, branching paths', { choose: 2 }, 'visual-novel'],
    ['Real-time strategy', 'gather, build, deploy, at once', { manage: 2, build: 1, plan: 1 }, 'rts-attention'],
    ['Extraction', 'scavenge, fight or avoid, get out', { plan: 2, aim: 1, move: 1 }, null],
  ];
  const X0 = 20, NAMEW = 190, DESCW = 250, CW = 82, Y0 = 50, RH = 22.6;
  GK.scene('matrix', (s, g, ui) => {
    const vb = [...s.querySelectorAll('.gx-v')]; ui.watch(vb);
    let pick = null, hover = -1;
    vb.forEach(b => b.onclick = () => { pick = pick === b.dataset.v ? null : b.dataset.v; });
    const cv = g.canvas;
    const rowAt = e => { const r = cv.getBoundingClientRect(), my = (e.clientY - r.top) * cv.height / r.height, mx = (e.clientX - r.left) * cv.width / r.width; const i = Math.floor((my - Y0) / RH); return mx < X0 + NAMEW + DESCW + CW * 6 && i >= 0 && i < G.length ? i : -1; };
    cv.addEventListener('mousemove', e => { hover = rowAt(e); cv.style.cursor = hover >= 0 && G[hover][3] ? 'pointer' : ''; });
    cv.addEventListener('mouseleave', () => { hover = -1; });
    cv.addEventListener('click', e => { const i = rowAt(e); if (i >= 0 && G[i][3]) location.href = `../${G[i][3]}/index.html`; });
    return {
      dur: 24,
      frame(t, tour) {
        if (tour) pick = VERBS[Math.floor(t / 4) % 6];
        vb.forEach(b => b.classList.toggle('on', b.dataset.v === pick));
        GK.panel(g);
        const cx = j => X0 + NAMEW + DESCW + j * CW + CW / 2;
        GK.text(g, 'genre', X0 + 8, 40, C.muted, 12, 'left', 700); GK.text(g, 'in the post\'s words', X0 + NAMEW, 40, C.muted, 12, 'left', 700);
        VERBS.forEach((v, j) => { if (v === pick) { g.fillStyle = 'rgba(255,185,81,.22)'; g.fillRect(cx(j) - CW / 2 + 3, 22, CW - 6, Y0 + G.length * RH - 18); } GK.text(g, v, cx(j), 40, v === pick ? C.goldInk : C.ink, 14, 'center', 800); });
        G.forEach((r, i) => {
          const y = Y0 + i * RH, hit = pick && r[2][pick];
          if (i === hover) { g.fillStyle = 'rgba(85,98,235,.1)'; g.fillRect(X0, y, NAMEW + DESCW + CW * 6, RH); }
          else if (i % 2) { g.fillStyle = 'rgba(205,191,159,.16)'; g.fillRect(X0, y, NAMEW + DESCW + CW * 6, RH); }
          GK.text(g, r[0], X0 + 8, y + 16, pick && !hit ? 'rgba(38,44,106,.4)' : C.ink, 13, 'left', 700);
          if (r[3]) GK.text(g, '↗', X0 + NAMEW - 14, y + 16, C.blue, 13, 'center', 800);
          GK.text(g, r[1], X0 + NAMEW, y + 16, pick && !hit ? 'rgba(93,97,140,.45)' : C.muted, 12, 'left', 500);
          VERBS.forEach((v, j) => {
            const w = r[2][v]; if (!w) return;
            const on = !pick || v === pick;
            g.globalAlpha = on ? 1 : .3; g.lineWidth = 2.5; g.strokeStyle = C.ink; g.fillStyle = v === pick ? C.gold : C.ink;
            g.beginPath(); g.arc(cx(j), y + RH / 2, w === 2 ? 7 : 6, 0, 7); w === 2 ? g.fill() : g.stroke(); g.globalAlpha = 1;
          });
        });
        // column counts
        const yb = Y0 + G.length * RH + 16;
        VERBS.forEach((v, j) => { const n2 = G.filter(r => r[2][v] === 2).length, n1 = G.filter(r => r[2][v] === 1).length; GK.text(g, `${n2} ● ${n1} ○`, cx(j), yb, v === pick ? C.goldInk : C.muted, 12, 'center', 700); });
        GK.text(g, '● leads with   ○ also names   ↗ has its own interactive: click the row', X0 + 8, yb, C.muted, 12, 'left', 600);
        const n = pick ? G.filter(r => r[2][pick]).length : 0, lead = pick ? G.filter(r => r[2][pick] === 2).map(r => r[0]) : [];
        ui.stats(`<div><b>22</b><span>genres in the post</span></div><div class="g"><b>${G.filter(r => r[3]).length}</b><span>with an interactive here</span></div>`);
        ui.out(pick ? `<b>${pick[0].toUpperCase() + pick.slice(1)}</b>: ${n} of 22 genres use it, ${lead.length} lead with it (${lead.join(', ')}).` : 'Pick a verb to see which genres lean on it, or click a genre to open its interactive.');
      },
    };
  });
})();
