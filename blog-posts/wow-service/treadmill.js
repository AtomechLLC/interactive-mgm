/* Feed the treadmill (genre breakdown: "How to Make a Game Like World of Warcraft?"), a lesson-richness spike for slide 2.
   Slide 1 shows that launch is the start. This slide hands the learner the live team and asks where it goes, month by
   month, for three years. A 120-person team splits three ways:
     content:   handcrafted zones, quests and raids. 0.3 hours of fresh play per person per month, banked and shipped in a
                patch every 4 months (a patch also brings lapsed players back).
     systems:   things that make old content replayable (raid lockouts, ranked PvP, dailies, alternate characters). They
                carry a share R of play time when nothing new is out; R approaches 0.85 (1 - e^(-people / 30)) slowly.
     stability: servers, databases, bug fixes. The work needed grows with the population (20 people per million
                players); below that, outages drive players away.
   Each player eats 45 hours of fresh content a month, more than any split can make, so droughts always come; what
   changes is how many players a drought costs. All rates are illustrative; the shape of the trade-off is the point. */
(function () {
  const C = TD.C, { clamp } = TD;
  const TEAM = 120, MONTHS = 36;
  function run(cs, ss) {
    const cP = TEAM * cs, sP = TEAM * ss, stP = TEAM * (1 - cs - ss), Rt = .85 * (1 - Math.exp(-sP / 30));
    let P = 1, F = 150, R = 0, bank = 0; const out = [];
    for (let m = 1; m <= MONTHS; m++) {
      bank += cP * .3; let patch = false, boost = 0;
      if (m % 4 === 0 && bank > 0) { F += bank; boost = .07 * clamp(bank / 140); patch = true; bank = 0; }
      F = Math.max(0, F - 45);
      R += (Rt - R) * .12;
      const need = 20 * P, short = clamp((need - stP) / need), drought = F <= 0;
      const churn = .018 + (drought ? .07 * (1 - R) : 0) + short * .12;
      const join = (drought ? .008 : .028) + .02 * R + boost;
      P *= 1 - churn + join;
      out.push({ m, P, F, R, drought, patch, outage: short > .1 });
    }
    return out;
  }
  const REF = run(.75, 0);   // the all-content plan, drawn as a ghost

  GK.scene('treadmill', (s, g, ui) => {
    const cEl = s.querySelector('.tm-c'), cv = s.querySelector('.tm-cv'), sEl = s.querySelector('.tm-s'), sv = s.querySelector('.tm-sv'), stv = s.querySelector('.tm-stv');
    ui.watch(cEl, sEl);
    const fix = changed => { let c = +cEl.value, x = +sEl.value; if (c + x > 95) { if (changed === cEl) sEl.value = x = 95 - c; else cEl.value = c = 95 - x; } return [c, x]; };
    cEl.addEventListener('input', () => fix(cEl)); sEl.addEventListener('input', () => fix(sEl));
    const ACTS = [
      { to: 7, c: 75, s: 0, say: 'Three quarters of the team on content. Every patch brings players back, and every gap between patches loses them: players eat content faster than 90 people make it.' },
      { to: 13, c: 90, s: 0, say: 'Push content to 90%. The patches get bigger, but 12 people cannot keep the servers up for the launch crowd: outages.' },
      { to: 21, c: 40, s: 40, say: 'Move people to systems that make old content replayable. Patches are smaller, but droughts stop draining the game.' },
      { to: 28, c: 15, s: 65, say: 'Systems alone are not enough either: with too little new content, the game goes stale and the droughts get long.' },
    ];
    return {
      dur: 28,
      frame(t, tour) {
        let say = '';
        if (tour) { const [a] = GK.act(ACTS, t); cEl.value = a.c; sEl.value = a.s; say = a.say; }
        const [c, x] = fix(null), st = 100 - c - x;
        cv.textContent = `${c}% · ${Math.round(TEAM * c / 100)} people`; sv.textContent = `${x}% · ${Math.round(TEAM * x / 100)} people`;
        stv.textContent = `${st}% · ${Math.round(TEAM * st / 100)} people`;
        const o = run(c / 100, x / 100);
        GK.panel(g);
        const ax = 70, ay = 46, aw = 940, ah = 240;
        GK.head(g, 'Players over the first three years (launch = 1.0)', 20, 28);
        const A = GK.axes(g, ax, ay, aw, ah, { x0: 0, x1: MONTHS, y0: 0, y1: 1.4, xt: [0, 6, 12, 18, 24, 30, 36], yt: [0, .5, 1], fmtX: v => v ? `month ${v}` : 'launch', fmtY: v => v.toFixed(1) });
        // drought months shaded, outage months marked, patches ticked
        o.forEach(p => {
          const x1 = A.sx(p.m - 1), x2 = A.sx(p.m);
          if (p.drought) { g.fillStyle = 'rgba(224,169,45,.18)'; g.fillRect(x1, ay, x2 - x1, ah); }
          if (p.outage) { g.fillStyle = 'rgba(229,50,45,.75)'; g.fillRect(x1 + 2, ay + ah - 10, x2 - x1 - 4, 8); }
          if (p.patch) { g.strokeStyle = C.p2; g.lineWidth = 2; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(x2, ay); g.lineTo(x2, ay + ah); g.stroke(); g.setLineDash([]); GK.text(g, 'patch', x2, ay - 4, C.good, 10, 'center', 700); }
        });
        GK.line(g, [[A.sx(0), A.sy(1)], ...REF.map(p => [A.sx(p.m), A.sy(Math.min(1.4, p.P))])], 'rgba(93,97,140,.45)', 2, [6, 5]);
        GK.line(g, [[A.sx(0), A.sy(1)], ...o.map(p => [A.sx(p.m), A.sy(Math.min(1.4, p.P))])], C.player, 4);
        // legend
        const ly = ay + ah + 44;
        [['your split', C.player, false], ['three quarters on content (reference)', 'rgba(93,97,140,.6)', true]].forEach(([l, col, dash], i) => { GK.line(g, [[ax + i * 210, ly], [ax + i * 210 + 26, ly]], col, 3, dash ? [6, 5] : null); GK.text(g, l, ax + i * 210 + 32, ly + 4, C.muted, 12, 'left', 600); });
        g.fillStyle = 'rgba(224,169,45,.35)'; g.fillRect(ax + 500, ly - 7, 18, 14); GK.text(g, 'no fresh content left', ax + 524, ly + 4, C.muted, 12, 'left', 600);
        g.fillStyle = 'rgba(229,50,45,.75)'; g.fillRect(ax + 680, ly - 4, 18, 8); GK.text(g, 'outages', ax + 704, ly + 4, C.muted, 12, 'left', 600);
        // readouts
        const m12 = o[11].P, m36 = o[35].P, dr = o.filter(p => p.drought).length, out = o.filter(p => p.outage).length, peak = Math.max(...o.map(p => p.P));
        const yb = 380;
        GK.big(g, peak.toFixed(2), 'highest point', 20, yb);
        GK.big(g, m12.toFixed(2), 'players at month 12', 165, yb, m12 >= .9 ? C.good : C.ink);
        GK.big(g, m36.toFixed(2), 'players at month 36', 330, yb, m36 >= .75 ? C.good : m36 < .5 ? C.redDk : C.ink);
        GK.big(g, `${dr}`, 'months with nothing new', 495, yb, dr > 26 ? C.redDk : C.ink);
        GK.big(g, `${out}`, 'months with outages', 680, yb, out ? C.redDk : C.good);
        GK.big(g, `${Math.round(o[35].R * 100)}%`, 'of play carried by old content', 845, yb);
        GK.wrap(g, say || (out ? 'The servers are the first job: success raises the work they need every month.' : dr > 26 ? 'Too little new content: the systems have nothing fresh to recycle.' : m36 >= .75 ? 'A split that holds: new content to come back for, systems to stay for, servers that stay up.' : 'Players eat content faster than you make it. What keeps them between patches?'), 20, 460, 1000, 22, C.ink, 17, 700);
        GK.wrap(g, 'Each player eats 45 hours of fresh play a month; even 108 people on content make about 32. The droughts are certain; the split decides what they cost.', 20, 540, 1000, 18, C.muted, 13);
        ui.stats(`<div class="${m36 >= .75 ? 'g' : m36 < .5 ? 'r' : 'y'}"><b>${m36.toFixed(2)}</b><span>players at month 36 (launch = 1.0)</span></div><div class="${out ? 'r' : 'g'}"><b>${out}</b><span>months with outages</span></div>`);
        ui.out('Content brings players back; systems keep them between patches; stability is a tax that grows with success.');
      },
    };
  });
})();
