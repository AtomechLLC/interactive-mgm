/* Unbalanced Meta: Elusives (Legends of Runeterra case study): the slide demos.
   A stripped-down board where an Elusive attacker walks past normal blockers, and a toy
   meta model showing the field fold into "Elusives and the spells that answer them". */
(function () {
  const { $, $$, demo, say, raf, rr } = FPF.kit;

  /* ---------- block: try to stop one attacker ---------- */
  const ATK = { name: 'Shadow Scout', cost: 2, pow: 3, hp: 2, art: '🗡️' };
  const HAND = [
    { id: 'wall', name: 'Stone Wall', cost: 3, pow: 0, hp: 6, art: '🧱' },
    { id: 'brute', name: 'Brute', cost: 5, pow: 5, hp: 5, art: '🦍' },
    { id: 'sprite', name: 'Swift Sprite', cost: 2, pow: 2, hp: 1, art: '🧚', elusive: true },
    { id: 'strike', name: 'Quick Strike', cost: 3, spell: true, text: 'Deal 3 to a unit', art: '⚡' },
  ];
  const card = (c, cls = '') => `<button class="el-card ${c.spell ? 'spell' : ''} ${c.elusive ? 'elusive' : ''} ${cls}" data-id="${c.id || 'atk'}">
      <span class="cost">${c.cost}</span><span class="art">${c.art}</span><b>${c.name}</b>
      ${c.elusive ? '<span class="kw">Elusive</span>' : ''}
      ${c.spell ? `<span class="txt">${c.text}</span>` : `<span class="stats"><i>${c.pow}</i><i>${c.hp}</i></span>`}
    </button>`;

  demo('block', {
    init(s) {
      const atkSlot = $(s, '.el-atk-slot'), blockSlot = $(s, '.el-block-slot'), hand = $(s, '.el-hand');
      const out = $(s, '.el-out'), has = $(s, '.el-has'), pass = $(s, '.el-pass'), next = $(s, '.el-next'), nexus = $(s, '.el-nexus b');
      let hp = 20, done = false;
      const mark = (a, ok) => { const li = $(s, `.el-answers [data-a="${a}"]`); li.className = ok ? 'yes' : 'no'; $(li, 'i').textContent = ok ? '✓' : '✗'; };
      const elusive = () => has.checked;
      const finish = () => { done = true; pass.hidden = true; next.hidden = false; $$(hand, '.el-card').forEach(b => (b.disabled = true)); };
      const hit = () => { hp = Math.max(0, hp - ATK.pow); nexus.textContent = hp; nexus.parentElement.classList.remove('ouch'); void nexus.offsetWidth; nexus.parentElement.classList.add('ouch'); };

      function reset() {
        done = false; pass.hidden = false; next.hidden = true;
        atkSlot.innerHTML = card({ ...ATK, elusive: elusive() }, 'atk');
        blockSlot.innerHTML = '<span>Block slot</span>'; blockSlot.className = 'el-block-slot';
        hand.innerHTML = HAND.map(c => card(c)).join('');
        $$(hand, '.el-card').forEach(b => (b.onclick = () => play(HAND.find(c => c.id === b.dataset.id), b)));
      }
      function play(c, b) {
        if (done) return;
        const atk = $(atkSlot, '.el-card');
        if (c.spell) {
          b.classList.add('cast'); atk.classList.add('dead'); finish();
          if (elusive()) mark('spell', true);
          return say(out, `<b class="good">It works.</b> Spells can still target Elusive units. But you spent ${c.cost} mana and a card to answer a ${ATK.cost}-mana unit, and in the real game Ionia could <i>Deny</i> your spell.`);
        }
        if (elusive() && !c.elusive) {
          b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake');
          mark('ground', false);
          return say(out, `<b class="bad">Can’t block.</b> ${c.name} isn’t Elusive, and only Elusive units can block an Elusive attacker. Its ${c.hp} health doesn’t matter at all.`);
        }
        blockSlot.innerHTML = ''; blockSlot.appendChild(b); blockSlot.classList.add('filled'); finish();
        const kills = c.pow >= ATK.hp, dies = ATK.pow >= c.hp;
        if (kills) atk.classList.add('dead');
        if (dies) setTimeout(() => b.classList.add('dead'), 250);
        if (c.elusive && elusive()) {
          mark('elusive', true);
          say(out, `<b class="good">Blocked.</b> Only another Elusive unit could do that. Notice what you needed: <b>a card from the same Elusive region</b>. The answer to Elusives is more Elusives.`);
        } else {
          say(out, `<b class="good">Blocked.</b> Without Elusive, ${c.name} simply stands in the way${kills ? ' and wins the fight' : ''}. ${c.id === 'wall' ? 'A 0|6 wall takes no lasting damage and stops this attacker every single turn.' : ''}`);
        }
      }
      pass.onclick = () => {
        hit(); finish(); if (elusive()) mark('pass', false);
        say(out, `<b class="bad">${ATK.pow} damage to your Nexus.</b> It’ll come back next turn, and the turn after. ${hp ? `${Math.ceil(hp / ATK.pow)} more hits and you lose.` : 'You lose.'}`);
      };
      next.onclick = () => { if (!hp) { hp = 20; nexus.textContent = hp; } reset(); say(out, elusive() ? 'A new Shadow Scout attacks. Click one of your units to block it, or cast the spell on it.' : 'A new Shadow Scout attacks, this time without Elusive. Try the wall.'); };
      has.onchange = () => { reset(); say(out, elusive() ? 'Elusive is back on. Only Elusive units can block it now.' : 'Elusive is off: the same 3|2 attacker, no keyword. Now try your normal units.'); };
      reset();
    },
  });

  /* ---------- meta: a toy replicator model of the ladder ---------- */
  const DECKS = [
    { n: 'Elusive aggro', c: '#b98cff' },
    { n: 'Ground aggro', c: '#ff8a4c' },
    { n: 'Big midrange', c: '#5fe0a0' },
    { n: 'Spell control', c: '#4fb3ff' },
  ];
  // Elusive's win rate against ground aggro, midrange and spell control, under each patch.
  // The other three decks beat each other in a circle, so without Elusive the field stays mixed.
  const FIX = {
    none: [0.62, 0.68, 0.45],
    tax: [0.54, 0.56, 0.42],
    answers: [0.47, 0.5, 0.45],
  };
  const SAY = {
    none: 'Ground decks can’t block Elusives, so they bleed out. What’s left is <b>Elusive decks</b> and the <b>spell decks</b> that can remove them. Together they’re about four fifths of the ladder, all shaped by one keyword.',
    tax: 'Weaker Elusive stats take the edge off, but the ground decks still have no way to block. Better, not fixed.',
    answers: 'Every region gets its own way to block or punish Elusives. The circle of ground aggro, midrange and control comes back, and Elusive is just one deck among four.',
  };
  const WEEKS = 20;
  function season(fix) {
    const [ea, em, ec] = FIX[fix];
    const W = [[0.5, ea, em, ec], [1 - ea, 0.5, 0.4, 0.6], [1 - em, 0.6, 0.5, 0.4], [1 - ec, 0.4, 0.6, 0.5]];
    let x = [0.1, 0.3, 0.3, 0.3];
    const out = [x];
    for (let w = 0; w < WEEKS; w++) {
      const f = x.map((_, i) => x.reduce((s, xj, j) => s + xj * W[i][j], 0));
      const avg = x.reduce((s, xi, i) => s + xi * f[i], 0);
      x = x.map((xi, i) => xi * Math.pow(f[i] / avg, 3));
      const t = x.reduce((a, b) => a + b);
      x = x.map(v => 0.88 * v / t + 0.03);   // a few players always play what they like
      out.push(x);
    }
    return out;
  }

  demo('meta', {
    init(s) {
      const c = $(s, '.mt-canvas'), g = c.getContext('2d'), legend = $(s, '.mt-legend'), out = $(s, '.mt-out'), play = $(s, '.mt-play');
      const L = 60, T = 20, R = c.width - 40, B = c.height - 46;
      let fix = 'none', data = season(fix), shown = WEEKS;
      legend.innerHTML = DECKS.map(d => `<li><i style="background:${d.c}"></i>${d.n}<b></b></li>`).join('');
      function draw() {
        g.clearRect(0, 0, c.width, c.height);
        const n = Math.max(1, shown), xs = w => L + (R - L) * w / WEEKS;
        let base = data.slice(0, Math.floor(n) + 1).map(() => 0);
        DECKS.forEach((d, k) => {
          g.beginPath();
          base.forEach((b, w) => { const y = B - (B - T) * (b + data[w][k]); w ? g.lineTo(xs(w), y) : g.moveTo(xs(w), y); });
          for (let w = base.length - 1; w >= 0; w--) g.lineTo(xs(w), B - (B - T) * base[w]);
          g.closePath(); g.fillStyle = d.c; g.globalAlpha = 0.85; g.fill(); g.globalAlpha = 1;
          base = base.map((b, w) => b + data[w][k]);
        });
        g.fillStyle = '#a9b7d6'; g.font = '16px Jost'; g.textAlign = 'right';
        [0, 50, 100].forEach(p => { const y = B - (B - T) * p / 100; g.fillText(p + '%', L - 10, y + 5); });
        g.textAlign = 'center';
        [0, 5, 10, 15, 20].forEach(w => g.fillText('week ' + w, xs(w), B + 28));
        g.strokeStyle = '#2b4785'; g.beginPath(); g.moveTo(L, B); g.lineTo(R, B); g.stroke();
        const now = data[Math.floor(n)];
        $$(legend, 'b').forEach((b, k) => (b.textContent = Math.round(now[k] * 100) + '%'));
      }
      let stop;
      function run() {
        stop?.(); shown = 0; play.disabled = true; say(out, '');
        stop = raf(dt => {
          shown = Math.min(WEEKS, shown + dt * 6); draw();
          if (shown >= WEEKS) { stop(); stop = null; play.disabled = false; say(out, SAY[fix]); }
        });
      }
      play.onclick = run;
      $$(s, '.mt-fix').forEach(b => (b.onclick = () => {
        $$(s, '.mt-fix').forEach(x => x.classList.toggle('on', x === b));
        fix = b.dataset.fix; data = season(fix); run();
      }));
      s._run = run; s._stopMeta = () => stop?.();
      draw(); say(out, SAY[fix]);
    },
    enter(s) { s._run(); },
    leave(s) { s._stopMeta(); },
  });
})();
