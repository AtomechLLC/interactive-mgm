/* Triggers on the stack (genre breakdown: "How to Make a Card Video Game?").
   You cast Fireball (3 damage) at a Golem with 3 health. Two triggered abilities fire on the cast: your Kindle relic
   (+2 damage to that spell) and the opponent's Dampen totem (halve that spell's damage, rounded down). Triggers go on
   the stack above the spell and resolve last in, first out, so whichever went on first resolves second. The order
   decides whether the Golem dies, and its death adds one more trigger. The cards are original, built for this page. */
(function () {
  const C = TD.C;
  const CARDS = {
    fire: { name: 'Fireball', who: 'you', text: 'Deal 3 damage to target creature.', col: '#e0703a' },
    kindle: { name: 'Kindle', who: 'you', text: 'When you cast a spell, it deals +2 damage.', col: '#d9a42b' },
    dampen: { name: 'Dampen', who: 'foe', text: 'When a spell is cast, halve its damage (round down).', col: '#5562eb' },
    death: { name: 'Golem\'s last rites', who: 'foe', text: 'When the Golem dies, it deals 2 damage to you.', col: '#8a7f66' },
  };
  // build the whole sequence of states for one ordering: first = the trigger that goes on the stack first
  function run(first) {
    const second = first === 'kindle' ? 'dampen' : 'kindle';
    const S = { stack: [], golem: 3, you: 20, dmg: 3, log: [], top: null };
    const out = []; const snap = (say, hi) => out.push({ ...S, stack: S.stack.map(x => ({ ...x })), log: [...S.log], say, hi });
    snap('Before: the Golem has 3 health. You hold Fireball.');
    S.stack.push({ id: 'fire', dmg: 3 }); S.log.push('Cast Fireball at the Golem'); snap('Cast Fireball. It goes on the stack; it does nothing until it resolves.', 'fire');
    S.stack.push({ id: first }); S.log.push(`${CARDS[first].name} triggers`);
    S.stack.push({ id: second }); S.log.push(`${CARDS[second].name} triggers`);
    snap(`Both triggers go on above it: ${CARDS[first].name} first, then ${CARDS[second].name} on top.`, second);
    const resolve = () => {
      const it = S.stack.pop(), f = S.stack.find(x => x.id === 'fire');
      if (it.id === 'kindle') { f.dmg += 2; S.log.push(`Kindle: Fireball now deals ${f.dmg}`); return `Top of the stack resolves: Kindle adds 2. Fireball now deals ${f.dmg}.`; }
      if (it.id === 'dampen') { const was = f.dmg; f.dmg = Math.floor(f.dmg / 2); S.log.push(`Dampen: Fireball now deals ${f.dmg}`); return `Dampen resolves: half of ${was}, rounded down, is ${f.dmg}.`; }
      if (it.id === 'fire') {
        S.golem -= it.dmg; S.log.push(`Fireball deals ${it.dmg}: Golem at ${Math.max(0, S.golem)}`);
        if (S.golem <= 0) { S.stack.push({ id: 'death' }); S.log.push('Golem dies: last rites trigger'); return `Fireball deals ${it.dmg}. The Golem dies, and its death puts a new trigger on the stack.`; }
        return `Fireball deals ${it.dmg}. The Golem survives with ${S.golem} health.`;
      }
      if (it.id === 'death') { S.you -= 2; S.log.push('Last rites: you take 2'); return 'Last rites resolves: you take 2 damage. The stack is empty.'; }
    };
    while (S.stack.length) { const top = S.stack[S.stack.length - 1].id, say = resolve(); snap(say, top); }
    snap(S.golem > 0 ? `Result: the Golem lives (${S.golem} health).` : 'Result: the Golem is dead, and you paid 2 health for it.');
    return out;
  }
  const SEQ = { kindle: run('kindle'), dampen: run('dampen') };

  function card(g, id, x, y, w, h, hi, extra) {
    const c = CARDS[id];
    GK.box(g, x, y, w, h, '#fffaf0', hi ? C.gold : c.col, 10, hi ? 4 : 2.5);
    g.fillStyle = c.col; g.beginPath(); g.roundRect(x + 2, y + 2, w - 4, 26, [8, 8, 0, 0]); g.fill();
    GK.text(g, c.name, x + 10, y + 20, '#fff', 14, 'left', 700);
    GK.text(g, c.who === 'you' ? 'yours' : 'opponent', x + w - 10, y + 20, 'rgba(255,255,255,.85)', 11, 'right', 600);
    GK.wrap(g, c.text, x + 10, y + 46, w - 20, 16, C.ink, 12);
    if (extra) GK.text(g, extra, x + w - 10, y + h - 10, C.redDk, 14, 'right', 800);
  }

  GK.scene('stack', (s, g, ui) => {
    const bA = s.querySelector('.cs-k'), bB = s.querySelector('.cs-d'), bStep = s.querySelector('.cs-step'), bReset = s.querySelector('.cs-reset');
    ui.watch(bA, bB, bStep, bReset);
    let first = 'kindle', k = 0;
    bA.onclick = () => { first = 'kindle'; k = 0; }; bB.onclick = () => { first = 'dampen'; k = 0; };
    bStep.onclick = () => { k = Math.min(k + 1, SEQ[first].length - 1); }; bReset.onclick = () => { k = 0; };
    const PER = 2.2;
    return {
      dur: (SEQ.kindle.length + SEQ.dampen.length + 2) * PER,
      frame(t, tour) {
        if (tour) {
          const a = SEQ.kindle.length + 1;
          if (t < a * PER) { first = 'kindle'; k = Math.min(SEQ.kindle.length - 1, Math.floor(t / PER)); }
          else { first = 'dampen'; k = Math.min(SEQ.dampen.length - 1, Math.floor(t / PER) - a); }
        }
        bA.classList.toggle('on', first === 'kindle'); bB.classList.toggle('on', first === 'dampen');
        const st = SEQ[first][k];
        GK.panel(g);
        // board
        GK.head(g, 'Board', 24, 34, 'left', C.ink, 16);
        card(g, 'kindle', 24, 50, 200, 100, false);
        card(g, 'dampen', 24, 166, 200, 100, false);
        // golem and you
        const gx = 24, gy = 300;
        GK.box(g, gx, gy, 200, 120, st.golem > 0 ? '#efe6d2' : '#e6e1d8', '#8a7f66', 10, 2.5);
        GK.text(g, 'Stone Golem', gx + 12, gy + 24, C.ink, 15, 'left', 700);
        g.globalAlpha = st.golem > 0 ? 1 : .35; g.fillStyle = '#8a8fa8'; g.beginPath(); g.roundRect(gx + 70, gy + 36, 60, 56, 10); g.fill(); g.fillStyle = C.gold; g.fillRect(gx + 84, gy + 54, 8, 8); g.fillRect(gx + 108, gy + 54, 8, 8); g.globalAlpha = 1;
        GK.text(g, st.golem > 0 ? `health ${st.golem}` : 'destroyed', gx + 100, gy + 110, st.golem > 0 ? C.ink : C.redDk, 14, 'center', 800);
        GK.big(g, `${st.you}`, 'your health', 24, 470, st.you < 20 ? C.redDk : C.ink);
        // the stack
        const SX = 270, SW = 250;
        GK.head(g, 'The stack (top resolves first)', SX, 34, 'left', C.ink, 16);
        g.strokeStyle = '#cdbf9f'; g.setLineDash([6, 6]); g.lineWidth = 2; g.beginPath(); g.roundRect(SX - 8, 48, SW + 16, 470, 12); g.stroke(); g.setLineDash([]);
        const items = st.stack;
        if (!items.length) GK.text(g, 'empty', SX + SW / 2, 290, C.muted, 14, 'center', 600);
        items.slice().reverse().forEach((it, i) => {
          const y = 58 + i * 112, top = i === 0;
          card(g, it.id, SX, y, SW, 100, top, it.id === 'fire' ? `deals ${it.dmg}` : '');
          if (top) TD.label('next', SX + SW + 6, y + 50, 'left', C.goldInk, 12);
        });
        // log
        const LX = 570;
        GK.head(g, `Order: ${CARDS[first].name} on first`, LX, 34, 'left', C.ink, 16);
        GK.wrap(g, st.say, LX, 64, 440, 20, C.navy, 15, 600);
        st.log.forEach((l, i) => { GK.text(g, `${i + 1}. ${l}`, LX, 150 + i * 24, C.ink, 13, 'left', 500); });
        // both outcomes side by side
        const fin = o => SEQ[o][SEQ[o].length - 1];
        ['kindle', 'dampen'].forEach((o, i) => {
          const f = fin(o), x = LX + i * 225, y = 430;
          GK.box(g, x, y, 210, 92, o === first ? '#fff3d6' : '#fffaf0', o === first ? C.gold : '#cdbf9f', 10, 2);
          GK.text(g, `${CARDS[o].name} on first`, x + 12, y + 22, C.ink, 13, 'left', 700);
          GK.text(g, o === 'kindle' ? '3 ÷ 2 = 1, then + 2 = 3 damage' : '(3 + 2) ÷ 2 = 2 damage', x + 12, y + 44, C.muted, 12);
          GK.text(g, f.golem > 0 ? `Golem lives (${f.golem})` : 'Golem dies; you take 2', x + 12, y + 70, f.golem > 0 ? C.ink : C.redDk, 14, 'left', 800);
        });
        GK.text(g, `step ${k + 1} of ${SEQ[first].length}`, 1016, 34, C.muted, 12, 'right', 600);
        ui.stats(`<div><b>${st.golem > 0 ? st.golem : '0'}</b><span>Golem health</span></div><div class="${st.stack.length ? '' : 'g'}"><b>${st.stack.length}</b><span>items on the stack</span></div>`);
        ui.out('Last in, first out: the trigger that goes on first resolves last. Swap the order and the same three cards decide a different fight.');
      },
    };
  });
})();
