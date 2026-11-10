/* Five Potions (replanned page for Too Weak to Waste; Scripture: Action Triggers and Consumable Hoarding).
   Eight rooms of dodging, five potions, three refill rules. The readout is what the learner did with their own potions:
   how many were left, and how low their health was when they drank. */
(function () {
  const C = TD.C, { clamp, lerp } = TD;
  const ROOMS = 8, IFR = .3, LOCK = .7, HEAL = 40;
  const RULES = ['Never come back', 'Refill at checkpoints', 'Drink themselves at 30%'];
  const results = [null, null, null];
  const AX = 20, AY = 50, AW = 600, AH = 430;

  function fresh(rule, R) {
    return { rule, R, hp: 100, pots: 5, room: 1, sw: null, left: 3, next: 1.6, dodge: -9, drinks: [], fx: [], dead: false, done: false, banner: 0, hits: 0 };
  }
  PLAY.game('potions', {
    dur: 50, keys: [' ', 'q'],
    opts: s => ({ rule: +s.querySelector('.fp-rule .on').dataset.v }),
    tourOpts: { rule: 0 },
    setup(s, api) { const b = [...s.querySelectorAll('.fp-rule .btn')]; b.forEach(x => x.onclick = () => { b.forEach(y => y.classList.toggle('on', y === x)); api.start(); }); },
    init(o, live) { const R = live ? Math.random : GK.rng(8); return { live, t: 0, ready: live, res: live ? results : [null, null, null], ...fresh(o.rule, R) }; },
    step(st, inp, dt) {
      if (st.ready) { if (inp.press[' '] || inp.click) st.ready = false; return; }
      if (st.done) { if (st.live && inp.press[' ']) { const k = { live: true, t: 0, res: st.res }; Object.assign(st, fresh(st.rule, st.R), k); } return; }
      st.t += dt;
      const drink = auto => { if (st.pots > 0 && st.hp < 100) { st.pots--; st.drinks.push({ hp: st.hp, room: st.room, auto }); st.hp = Math.min(100, st.hp + HEAL); st.fx.push({ t: st.t, s: '+' + HEAL, c: C.good }); if (st.live) PLAY.beep(700, .15, .15); } };
      if (inp.press[' '] && st.t - st.dodge >= LOCK) { st.dodge = st.t; if (st.sw) st.sw.pressed = true; }
      if (inp.press.q && st.rule !== 2) drink(false);
      if (st.rule === 2 && st.hp <= 30 && st.pots > 0) drink(true);
      if (!st.sw && st.t >= st.next) { const boss = st.room === ROOMS; st.sw = { at: st.t, wind: [.34, .46, .6, .8][Math.floor(st.R() * 4)], dmg: boss ? 34 : 18 + Math.floor(st.R() * 3) * 6 }; st.sw.land = st.t + st.sw.wind; }
      if (st.sw && st.t >= st.sw.land) {
        if (st.t - st.dodge >= IFR) { st.hp -= st.sw.dmg; st.hits++; st.fx.push({ t: st.t, s: '−' + st.sw.dmg, c: C.redDk, hit: true }); if (st.live) PLAY.beep(140, .18, .25, 'sawtooth'); }
        st.sw = null; st.left--; st.next = st.t + .6 + st.R() * .7;
        const end = () => { st.done = true; st.res[st.rule] = { left: st.pots, drinks: st.drinks.slice(), room: st.room, dead: st.dead, hp: Math.max(0, st.hp) }; };
        if (st.hp <= 0) { st.dead = true; end(); }
        else if (st.left <= 0) {
          if (st.room >= ROOMS) end();
          else { st.room++; st.left = st.room === ROOMS ? 5 : 3; st.next = st.t + 1.5; st.banner = st.t; if (st.rule === 1 && (st.room === 4 || st.room === 7)) { st.pots = 5; st.fx.push({ t: st.t, s: 'checkpoint: potions refilled', c: C.blue }); } }
        }
      }
    },
    bot(st) {
      // a hoarder: dodges most swings, and only drinks when one more hit would kill
      const press = {};
      if (st.sw && !st.sw.pressed && st.t - st.dodge >= LOCK) { const slip = (st.hits * 2 + st.room * 3 + st.left) % 5 === 0; if (st.t >= st.sw.land - .12 - (slip ? .35 : 0)) press[' '] = true; }
      if (st.hp <= 16 && st.pots > 0 && !st.sw) press.q = true;
      return { down: {}, press };
    },
    draw(g, st, ui, live) {
      GK.panel(g);
      GK.head(g, `Room ${st.room} of ${ROOMS}${st.room === ROOMS ? ': the boss' : ''}`, AX, 34, 'left', C.ink, 17);
      GK.text(g, RULES[st.rule], AX + AW, 34, C.muted, 13, 'right', 700);
      g.save(); g.beginPath(); g.roundRect(AX, AY, AW, AH, 12); g.clip();
      TD.floor(AX, AY, AW, AH, st.room === ROOMS ? .12 : 0);
      const bx = AX + 190, by = AY + AH / 2, px = AX + 400, k = st.sw ? clamp((st.t - st.sw.at) / st.sw.wind) : 0;
      if (st.sw) { TD.cone(bx, by, 0, .5, 300, 1); g.fillStyle = 'rgba(229,50,45,.3)'; g.beginPath(); g.moveTo(bx, by); g.arc(bx, by, 300 * k, -.5, .5); g.closePath(); g.fill(); }
      const dk = st.t - st.dodge, py = by - (dk < LOCK ? Math.sin(clamp(dk / LOCK) * Math.PI) * 90 : 0);
      if (dk < IFR) TD.bubble(px, py, 26, st.t);
      if (!st.dead) TD.player(px, py, Math.PI);
      TD.foe(bx, by, st.room === ROOMS ? 54 : 34 + (st.room % 3) * 4, st.sw ? lerp(-1.1, 0, k * k) : 0, st.room === ROOMS ? '#8a1c15' : [C.red, '#c9572c', '#b23a6b'][st.room % 3], { mark: st.room === ROOMS ? 'horns' : st.room % 2 ? 'shield' : 'staff' });
      st.fx.forEach(f => { const a = 1 - (st.t - f.t) / 1.1; if (f.hit) TD.flash(px, by, 60, a); TD.popText(f.s, px, by - 60 - 30 * (1 - a), f.c, a); });
      if (st.t - st.banner < 1.2 && st.banner) TD.stamp(`Room ${st.room}`, AX + AW / 2, AY + 60, C.navy, clamp((1.2 - (st.t - st.banner)) * 2), 24);
      g.restore();
      // health and the bag
      GK.text(g, 'Health', AX, AY + AH + 26, C.muted, 12, 'left', 700);
      PLAY.bar(g, AX + 52, AY + AH + 14, 220, 16, st.hp / 100, st.hp > 35 ? C.good : C.red);
      GK.text(g, String(Math.max(0, Math.round(st.hp))), AX + 282, AY + AH + 28, C.ink, 14, 'left', 800);
      const pim = GK.img('../img/inv_potion_54.jpg');
      for (let i = 0; i < 5; i++) { const x = AX + 360 + i * 40; g.globalAlpha = i < st.pots ? 1 : .18; if (pim) g.drawImage(pim, x, AY + AH + 6, 32, 32); else { g.fillStyle = C.red; g.fillRect(x, AY + AH + 6, 32, 32); } g.globalAlpha = 1; g.strokeStyle = C.navy; g.lineWidth = 1.5; g.strokeRect(x, AY + AH + 6, 32, 32); }
      GK.text(g, st.rule === 2 ? 'auto' : 'Q', AX + 566, AY + AH + 28, C.muted, 13, 'left', 800);
      GK.text(g, st.rule === 1 ? 'Checkpoints after rooms 3 and 6 refill the bag.' : st.rule === 2 ? 'The game drinks for you at 30 health. Q does nothing.' : 'What you drink is gone for the run.', AX, AY + AH + 58, C.muted, 12, 'left', 600);
      if (st.ready) TD.stamp('Space to start. Space dodges, Q drinks', AX + AW / 2, AY + AH / 2 - 130, C.navy, 1, 22);
      if (st.done) TD.stamp(st.dead ? `Died in room ${st.room} holding ${st.pots} potion${st.pots === 1 ? '' : 's'}` : `Cleared with ${st.pots} potion${st.pots === 1 ? '' : 's'} unused`, AX + AW / 2, AY + 70, st.dead ? C.redDk : C.good, 1, 22);
      // results
      const RX = 650, RW = 370, res = st.res;
      GK.head(g, live ? 'Your runs' : 'A scripted hoarder\'s run', RX, 34, 'left', C.ink, 17);
      RULES.forEach((n, i) => {
        const y = 56 + i * 150, on = st.rule === i, r = on && !st.done ? { left: st.pots, drinks: st.drinks, room: st.room, dead: false, live: true } : res[i];
        GK.box(g, RX - 8, y, RW + 8, 138, on ? '#fff3d6' : '#fffaf0', on ? C.gold : '#cdbf9f', 9, on ? 2.5 : 1.5);
        GK.text(g, n, RX + 4, y + 22, C.ink, 14, 'left', 800);
        if (!r) { GK.text(g, 'not played yet', RX + RW - 12, y + 22, C.muted, 12, 'right', 600); return; }
        GK.text(g, r.live ? `room ${r.room}` : r.dead ? `died in room ${r.room}` : 'cleared', RX + RW - 12, y + 22, r.dead ? C.redDk : C.good, 12, 'right', 800);
        GK.big(g, String(r.left), r.live ? 'potions in the bag' : r.dead ? 'potions unused at death' : 'potions unused at the end', RX + 4, y + 58, r.left >= 2 && !r.live ? C.redDk : C.ink);
        // health when each potion was drunk
        const x0 = RX + 4, w = RW - 28, yy = y + 108; g.strokeStyle = '#cdbf9f'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x0, yy); g.lineTo(x0 + w, yy); g.stroke();
        GK.text(g, '0', x0, yy + 16, C.muted, 10, 'left', 600); GK.text(g, 'health when each potion was drunk', x0 + w / 2, yy + 16, C.muted, 10, 'center', 600); GK.text(g, '100', x0 + w, yy + 16, C.muted, 10, 'right', 600);
        r.drinks.forEach(d => { g.fillStyle = d.auto ? C.purple : d.hp <= 30 ? C.redDk : C.good; g.globalAlpha = .8; g.beginPath(); g.arc(x0 + clamp(d.hp / 100) * w, yy, 7, 0, TD.TAU); g.fill(); g.globalAlpha = 1; });
      });
      GK.text(g, 'Green: drunk with room to spare. Red: at 30 or below. Purple: the game drank it.', RX - 4, 56 + 3 * 150 + 10, C.muted, 11, 'left', 500);
      const low = st.drinks.filter(d => d.hp <= 30).length;
      ui.stats(`<div><b>${st.pots}</b><span>potions in the bag</span></div><div class="${low ? 'r' : ''}"><b>${st.drinks.length ? Math.round(st.drinks.reduce((s, d) => s + d.hp, 0) / st.drinks.length) : '–'}</b><span>average health when you drank</span></div><div><b>${st.hits}</b><span>hits taken</span></div>`);
      const a = res[0], b = res[1], c = res[2];
      ui.out(!a && !b && !c ? 'Start with potions that never come back. Watch how low you let your health fall before you spend one.'
        : a && !b ? `${a.dead ? `You died in room ${a.room} with ${a.left} potion${a.left === 1 ? '' : 's'} in the bag.` : `You cleared it with ${a.left} potion${a.left === 1 ? '' : 's'} unused.`} When a potion can never be replaced, the right moment to drink never seems to come. Now try the checkpoints.`
        : a && b && !c ? `With refills you ${b.drinks.length > a.drinks.length ? `drank ${b.drinks.length} times against ${a.drinks.length}` : 'knew more were coming'}, and drank at higher health. The bag stopped being precious, and so did the fear of an empty one. Now let the game drink for you.`
        : c ? `Auto-use left ${c.left} unused and wasted none on hoarding. It also took Q away: you made no potion decision at all in that run. Each rule fixed hoarding by removing something.`
        : 'Play the other rules to compare what you did with the same five potions.');
    },
  });
})();
