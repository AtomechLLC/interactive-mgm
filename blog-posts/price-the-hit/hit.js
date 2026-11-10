/* Price the Hit (replanned page for the Shade of Aran and Attumen posts; Scripture: Proportional Punishment).
   The learner sets one boss swing's windup, tell and damage, then dodges it twelve times. Their dodge rate per round is
   plotted against the windup. Nothing here is a model of players: the dots are the learner's own rounds. */
(function () {
  const C = TD.C, { clamp, lerp } = TD;
  const N = 12, IFR = .3, LOCK = .7;
  const TELLS = { none: 'no tell', sound: 'sound', decal: 'ground decal', both: 'sound + decal' };
  const TCOL = { none: '#8b8fa8', sound: C.purple, decal: C.red, both: C.good };
  const rounds = [];   // the learner's own rounds
  const DEMO = [{ wind: .2, tell: 'none', dmg: 40, rate: .17 }, { wind: .35, tell: 'sound', dmg: 30, rate: .5 }, { wind: .5, tell: 'decal', dmg: 30, rate: .75 }, { wind: 1.1, tell: 'both', dmg: 30, rate: 1 }];

  PLAY.game('price', {
    dur: 34, keys: [' '],
    tourOpts: { wind: .5, tell: 'decal', dmg: 30 },
    opts: s => ({ wind: +s.querySelector('.ph-w').value, tell: s.querySelector('.ph-tell .on').dataset.v, dmg: +s.querySelector('.ph-d').value }),
    setup(s, api) {
      const w = s.querySelector('.ph-w'), d = s.querySelector('.ph-d'), seg = [...s.querySelectorAll('.ph-tell .btn')];
      const show = () => { s.querySelector('.ph-wv').textContent = (+w.value).toFixed(2) + ' s'; s.querySelector('.ph-dv').textContent = d.value + '% of health'; };
      w.oninput = d.oninput = () => { show(); api.start(); };
      seg.forEach(b => b.onclick = () => { seg.forEach(x => x.classList.toggle('on', x === b)); api.start(); });
      show();
    },
    init(o, live) {
      const R = live ? Math.random : GK.rng(11);
      return { o, live, R, ready: live, t: 0, hp: 100, deaths: 0, i: 0, next: 1.2, sw: null, dodge: -9, log: [], fx: [], done: false };
    },
    step(st, inp, dt) {
      if (st.ready) { if (inp.press[' '] || inp.click) st.ready = false; return; }
      if (st.done) { if (inp.press[' '] || inp.click) { Object.assign(st, { t: 0, hp: 100, deaths: 0, i: 0, next: 1.2, sw: null, dodge: -9, log: [], fx: [], done: false }); } return; }
      st.t += dt;
      if (inp.press[' '] && st.t - st.dodge >= LOCK) { st.dodge = st.t; if (st.sw) st.sw.pressed = st.t; }
      if (!st.sw && st.t >= st.next) {
        st.sw = { at: st.t, land: st.t + st.o.wind, pressed: null };
        if (st.live && (st.o.tell === 'sound' || st.o.tell === 'both')) PLAY.beep(520, Math.min(.25, st.o.wind), .2, 'triangle');
      }
      if (st.sw && st.t >= st.sw.land) {
        const safe = st.t - st.dodge < IFR;
        const res = safe ? 'dodged' : st.sw.pressed != null ? 'early' : 'none';
        st.log.push({ res, at: st.t }); st.fx.push({ t: st.t, res });
        if (!safe) { st.hp -= st.o.dmg; if (st.live) PLAY.beep(140, .18, .25, 'sawtooth'); if (st.hp <= 0) { st.deaths++; st.hp = 100; } }
        st.sw = null; st.i++; st.next = st.t + .9 + st.R() * 1.5;
        if (st.i >= N) {
          st.done = true;
          const dodged = st.log.filter(l => l.res === 'dodged').length;
          const r = { ...st.o, rate: dodged / N, hits: N - dodged, none: st.log.filter(l => l.res === 'none').length, deaths: st.deaths };
          st.result = r; if (st.live) rounds.push(r);
        }
      }
    },
    bot(st) {
      // a scripted player: 0.27 s reaction; with a decal it times the ring, otherwise it presses as soon as it reacts
      if (!st.sw || st.sw.pressed != null || st.t - st.dodge < LOCK) return null;
      const sees = st.o.tell !== 'none' || st.i % 3 !== 0;
      const aim = st.o.tell === 'decal' || st.o.tell === 'both' ? Math.max(st.sw.at + .27, st.sw.land - .12 + (st.i % 4 === 3 ? .16 : 0)) : st.sw.at + .27;
      return sees && st.t >= aim ? { press: { ' ': true }, down: {} } : null;
    },
    draw(g, st, ui, live) {
      const o = st.o, AX = 30, AY = 60, AW = 560, AH = 430;
      GK.panel(g);
      GK.head(g, `Windup ${o.wind.toFixed(2)} s · ${TELLS[o.tell]} · ${o.dmg}% damage`, AX, 38, 'left', C.ink, 17);
      g.save(); g.beginPath(); g.roundRect(AX, AY, AW, AH, 12); g.clip();
      TD.floor(AX, AY, AW, AH);
      const bx = AX + 170, by = AY + AH / 2, px0 = AX + 380, py0 = by;
      const k = st.sw ? clamp((st.t - st.sw.at) / o.wind) : 0;
      // the decal: a cone that fills, with a ring that closes on the moment it lands
      if (st.sw && (o.tell === 'decal' || o.tell === 'both')) {
        TD.cone(bx, by, 0, .55, 300, 1);
        g.fillStyle = 'rgba(229,50,45,.28)'; g.beginPath(); g.moveTo(bx, by); g.arc(bx, by, 300 * k, -.55, .55); g.closePath(); g.fill();
      }
      const dk = st.t - st.dodge, rolling = dk < LOCK;
      const py = py0 - (rolling ? Math.sin(clamp(dk / LOCK) * Math.PI) * 90 : 0);
      if (dk < IFR) TD.bubble(px0, py, 26, st.t);
      TD.player(px0, py, Math.PI, 1, 1);
      // the boss: the wedge is his weapon arm, raised through the windup in every version
      TD.foe(bx, by, 46, st.sw ? lerp(-1.1, 0, k * k) : .0, C.red, { mark: 'horns' });
      if (st.sw && (o.tell === 'sound' || o.tell === 'both')) { g.strokeStyle = `rgba(138,79,214,${.8 * (1 - k)})`; g.lineWidth = 3; g.beginPath(); g.arc(bx, by, 56 + 30 * k, 0, TD.TAU); g.stroke(); }
      st.fx.forEach(f => {
        const a = 1 - (st.t - f.t) / .9; if (a <= 0) return;
        if (f.res !== 'dodged') TD.flash(px0, py0, 70, a);
        TD.popText(f.res === 'dodged' ? 'dodged' : f.res === 'early' ? 'hit: dodge mistimed' : 'hit: no reaction', px0, py0 - 70 - 30 * (1 - a), f.res === 'dodged' ? C.good : C.redDk, a);
      });
      g.restore();
      // health and swing pips
      GK.text(g, 'Your health', AX, AY + AH + 26, C.muted, 12, 'left', 700);
      PLAY.bar(g, AX + 86, AY + AH + 15, 200, 14, st.hp / 100, st.hp > 35 ? C.good : C.red);
      for (let i = 0; i < N; i++) {
        const l = st.log[i], x = AX + 316 + i * 20;
        g.fillStyle = !l ? '#e3d8bf' : l.res === 'dodged' ? C.good : l.res === 'early' ? C.gold : C.redDk; g.beginPath(); g.arc(x, AY + AH + 22, 7, 0, TD.TAU); g.fill();
      }
      GK.text(g, 'green dodged · gold mistimed · red never reacted' + (st.deaths ? ` · deaths ${st.deaths}` : ''), AX, AY + AH + 52, C.muted, 12, 'left', 600);
      if (st.ready) TD.stamp('Press Space to start, Space to dodge', AX + AW / 2, AY + AH / 2 - 130, C.navy, 1, 22);
      if (st.done && live) TD.stamp('Round over. Change the swing, or Space to retry', AX + AW / 2, AY + 60, C.navy, 1, 18);
      // the chart: the learner's own rounds
      const RX = 650, RY = 80, RW = 350, RH = 300;
      GK.head(g, live ? 'Your rounds' : 'A scripted player\'s rounds', RX, 38, 'left', C.ink, 17);
      const ax = GK.axes(g, RX, RY, RW, RH, { x0: .1, x1: 1.25, y0: 0, y1: 1, xt: [.2, .4, .6, .8, 1, 1.2], yt: [0, .25, .5, .75, 1], xl: 'windup (seconds)', fmtY: PLAY.pct, fmtX: v => v.toFixed(1) });
      g.fillStyle = 'rgba(47,174,99,.14)'; g.fillRect(RX, ax.sy(.9), RW, ax.sy(.6) - ax.sy(.9));
      GK.text(g, 'read it and still fear it', RX + RW - 8, ax.sy(.9) + 16, C.good, 12, 'right', 700);
      GK.text(g, 'no longer a threat', RX + RW - 8, ax.sy(1) + 14, C.muted, 11, 'right', 600);
      GK.text(g, 'hits you cannot answer', RX + RW - 8, ax.sy(.08), C.redDk, 11, 'right', 600);
      const list = live ? rounds : DEMO.slice(0, 1 + Math.floor(st.t / 9)).concat(st.result && !live ? [] : []);
      list.forEach((r, i) => {
        g.fillStyle = TCOL[r.tell]; g.strokeStyle = '#fff'; g.lineWidth = 2; g.globalAlpha = i === list.length - 1 ? 1 : .6;
        g.beginPath(); g.arc(ax.sx(r.wind), ax.sy(r.rate), 5 + r.dmg / 6, 0, TD.TAU); g.fill(); g.stroke(); g.globalAlpha = 1;
      });
      GK.text(g, 'swings dodged', RX, RY - 10, C.muted, 12, 'left', 700);
      let ly = RY + RH + 56; Object.keys(TELLS).forEach((kx, i) => { g.fillStyle = TCOL[kx]; g.beginPath(); g.arc(RX + 8 + (i % 2) * 170, ly + Math.floor(i / 2) * 20, 6, 0, TD.TAU); g.fill(); GK.text(g, TELLS[kx], RX + 20 + (i % 2) * 170, ly + 4 + Math.floor(i / 2) * 20, C.ink, 12, 'left', 600); });
      GK.text(g, 'Bigger dot = more damage per hit.', RX, ly + 46, C.muted, 12, 'left', 500);
      if (live && !rounds.length) PLAY.note(g, 'Finish a round to plot it. Then change the windup, the tell or the damage and play again: the comparison is between your own rounds.', RX, ly + 70, RW);
      // side panel
      const r = st.result, dodged = st.log.filter(l => l.res === 'dodged').length, none = st.log.filter(l => l.res === 'none').length;
      ui.stats(`<div class="g"><b>${dodged}/${st.log.length}</b><span>swings dodged</span></div><div class="r"><b>${none}</b><span>hits with no reaction at all</span></div><div class="${st.deaths ? 'r' : ''}"><b>${Math.round((st.log.length - dodged) * o.dmg)}%</b><span>of a health bar lost${st.deaths ? `, ${st.deaths} death${st.deaths > 1 ? 's' : ''}` : ''}</span></div>`);
      ui.out(!st.done ? (live ? 'Dodge when the swing lands, not when it starts. Your round becomes one dot on the chart.' : 'A scripted player with a 0.27 s reaction dodges your default swing. Take over to plot your own rounds.')
        : r.rate >= .92 ? `You dodged ${r.rate === 1 ? 'everything' : 'nearly everything'}. With this much warning the swing is no longer a threat, so its ${o.dmg}% damage never matters. Shorten the windup or drop a tell.`
        : r.rate < .6 ? `${r.hits} hits, ${r.none} of them with no reaction from you at all. Those are hits a player can't trace to a mistake, so at this warning the damage has to stay low${r.deaths ? '; here it killed you ' + r.deaths + (r.deaths > 1 ? ' times' : ' time') : ''}.`
        : `You dodged most swings and still got clipped ${r.hits} time${r.hits > 1 ? 's' : ''}. This is the band where a swing can hit hard: you knew what you did wrong each time.`);
    },
  });
})();
