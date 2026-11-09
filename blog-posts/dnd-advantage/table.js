/* The GM's table (system teardown: "Dungeons & Dragons Combat System"), a lesson-richness spike for slide 2.
   Slide 1 is the maths of one Advantage. At the table the question is how to reward players who stack up good ideas.
   Three players each add an idea to one roll; the GM rewards each with nothing, Advantage, or +2. Under the 5e rule,
   several sources of Advantage still roll only two dice, while flat bonuses add up. Each idea's share of the change is
   counted in order (what it adds on top of the ideas before it).
     chance to hit T or more: one die (21 - T) / 20, Advantage 1 - ((T - 1) / 20)^2, a bonus b lowers T by b.
   The ideas are this page's own. */
(function () {
  const C = TD.C, { clamp } = TD;
  const p1 = T => clamp((21 - T) / 20), pA = T => 1 - Math.pow(clamp((T - 1) / 20), 2);
  // the roll needs T or more on the die (natural 1 always misses, natural 20 always hits)
  const chance = (T, adv, bonus) => { const t = clamp(T - bonus, 2, 20); return adv ? pA(t) : p1(t); };
  const IDEAS = ['Bryn distracts the guard with a song', 'Ansel spots the loose stone in the wall', 'Thistle oils the hinges first'];
  const KIND = ['nothing', 'Advantage', '+2'];

  GK.scene('table', (s, g, ui) => {
    const tEl = s.querySelector('.gt-t'), tv = s.querySelector('.gt-tv');
    const rows = [...s.querySelectorAll('.gt-i')].map(el => [...el.querySelectorAll('.btn')]);
    const st = { pick: [1, 1, 1] };
    const sync = () => rows.forEach((bs, i) => bs.forEach((b, k) => b.classList.toggle('on', k === st.pick[i])));
    rows.forEach((bs, i) => bs.forEach((b, k) => b.onclick = () => { st.pick[i] = k; sync(); }));
    ui.watch(tEl, rows.flat());
    const ACTS = [
      { to: 7, T: 12, p: [1, 1, 1], say: 'Three good ideas, three Advantages. The rule rolls two dice however many sources there are: the second and third ideas change nothing.' },
      { to: 14, T: 12, p: [2, 2, 2], say: 'Three +2s instead: every idea counts, 10 points each. Nothing caps them, so a few more ideas would make the roll a formality.' },
      { to: 21, T: 12, p: [1, 2, 0], say: 'Advantage for the first idea, +2 for the second, a thank-you for the third: each idea is felt, and the roll can still fail.' },
      { to: 28, T: 18, p: [1, 2, 2], say: 'A long shot of 18 or more: Advantage adds 13 points here, against 25 on a coin flip, and the +2s carry the rest.' },
    ];
    sync();
    return {
      dur: 28,
      frame(t, tour) {
        let say = '';
        if (tour) { const [a] = GK.act(ACTS, t); tEl.value = a.T; st.pick = a.p.slice(); say = a.say; sync(); }
        const T = +tEl.value; tv.textContent = `${T} or more on the d20`;
        // chance after each idea, in order
        let adv = false, bonus = 0; const steps = [chance(T, false, 0)];
        st.pick.forEach(k => { if (k === 1) adv = true; if (k === 2) bonus += 2; steps.push(chance(T, adv, bonus)); });
        const base = steps[0], fin = steps[3];
        GK.panel(g);
        GK.head(g, 'Three ideas, one roll: what each reward adds', 20, 28);
        let felt = 0, nothing = 0;
        IDEAS.forEach((idea, i) => {
          const y = 48 + i * 92, d = steps[i + 1] - steps[i], k = st.pick[i];
          if (k && d >= .05) felt++; if (k && d < .02) nothing++;
          GK.box(g, 20, y, 470, 80, k && d < .02 ? '#f9d9d6' : k ? '#fffaf0' : '#f1e9d6', k && d < .02 ? C.red : '#cdbf9f', 10, 2);
          GK.text(g, idea, 36, y + 26, C.ink, 14, 'left', 700);
          GK.text(g, k ? `Reward: ${KIND[k]}` : 'No reward', 36, y + 50, C.muted, 13, 'left', 600);
          GK.head(g, `${d >= 0 ? '+' : ''}${Math.round(d * 100)} pts`, 474, y + 34, 'right', k && d < .02 ? C.redDk : d >= .1 ? C.good : C.ink, 22);
          if (k && d < .02) GK.text(g, 'changes nothing', 474, y + 60, C.redDk, 12, 'right', 800);
        });
        // waterfall: base chance, then each idea's step
        const wx = 560, wy = 50, ww = 450, wh = 250, sy = v => wy + wh - v * wh, bw = 80, gp = 30;
        GK.text(g, 'chance the roll succeeds', wx, wy - 8, C.muted, 12, 'left', 600);
        [0, .5, 1].forEach(v => { g.strokeStyle = 'rgba(205,191,159,.6)'; g.beginPath(); g.moveTo(wx, sy(v)); g.lineTo(wx + ww, sy(v)); g.stroke(); GK.text(g, Math.round(v * 100) + '%', wx - 6, sy(v) + 4, C.muted, 11, 'right', 600); });
        steps.forEach((v, i) => {
          const x = wx + 10 + i * (bw + gp), prev = i ? steps[i - 1] : 0;
          g.fillStyle = i === 0 ? C.stone : steps[i] - prev < .02 ? 'rgba(229,50,45,.5)' : C.player;
          const y1 = sy(Math.max(v, prev)), y2 = sy(i === 0 ? 0 : Math.min(v, prev));
          g.beginPath(); g.roundRect(x, y1, bw, Math.max(3, y2 - y1), 5); g.fill();
          GK.text(g, Math.round(v * 100) + '%', x + bw / 2, y1 - 6, C.ink, 13, 'center', 800);
          GK.text(g, i ? `idea ${i}` : 'no help', x + bw / 2, wy + wh + 18, C.muted, 12, 'center', 700);
        });
        const yb = 380;
        GK.big(g, `${Math.round(base * 100)}% → ${Math.round(fin * 100)}%`, 'chance the roll succeeds', 20, yb, fin >= .95 ? C.goldInk : C.ink);
        GK.big(g, `${felt} of 3`, 'ideas the players can feel (+5 pts or more)', 300, yb, felt === 3 ? C.good : C.ink);
        GK.big(g, `${nothing}`, 'rewards that changed nothing', 640, yb, nothing ? C.redDk : C.good);
        const verdict = fin >= .95 ? 'The roll is now a formality: no tension left to reward.' : nothing ? 'Players who had an idea saw it do nothing. Advantage does not stack.' : felt >= 2 && fin < .9 ? 'Every idea is felt, and the roll can still fail.' : 'Adjust the rewards: who should feel their idea?';
        GK.wrap(g, say || verdict, 20, 450, 1000, 22, C.ink, 17, 700);
        GK.wrap(g, 'Advantage is capped (more sources, still two dice), so it never runs away, and so it cannot reward a second idea. Flat bonuses reward every idea and add up until the roll stops mattering. The GM chooses between those two failures.', 20, 520, 1000, 18, C.muted, 13);
        ui.stats(`<div class="${fin >= .95 ? 'y' : 'g'}"><b>${Math.round(fin * 100)}%</b><span>chance the roll succeeds</span></div><div class="${nothing ? 'r' : 'g'}"><b>${nothing}</b><span>rewards that changed nothing</span></div>`);
        ui.out('Advantage is bounded and does not stack; +2s stack and are unbounded. Choose which failure you can live with.');
      },
    };
  });
})();
