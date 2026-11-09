/* Two days, three needs (genre breakdown: "Survival Game Design").
   Hunger falls all the time, warmth falls hard at night, and health falls while either is empty. Daylight hours are
   the budget: build a shelter (day one only), chop wood for a night fire, and forage food. The chart plays 48 hours
   from dawn of day one; the pressure band rises toward nightfall when the stocks look thin. All rates illustrative. */
(function () {
  const C = TD.C, { clamp } = TD;
  const R = { hunger: 2, forage: 12, warmDay: 1, warmNight: 7, warmShelter: 3, fire: 6, chop: 3, hurt: 5, heal: 1, shelterH: 6 };
  // hour h counts from 6:00 on day one; daylight is 6:00 to 18:00
  const isDay = h => (h % 24) < 12;
  function plan(o, h) {   // the action at hour h
    if (!isDay(h)) return 'night';
    const d = Math.floor(h / 24), hh = h % 24; let at = 0;
    if (o.shelter && d === 0) { if (hh < (at += R.shelterH)) return 'shelter'; }
    if (hh < (at += o.chop)) return 'chop';
    if (hh < (at += o.forage)) return 'forage';
    return 'idle';
  }
  function sim(o) {
    let hu = 80, wa = 80, he = 100, wood = 0, built = false, zero = 0;
    const out = [], dt = .25;
    for (let h = 0; h <= 48 + 1e-9; h += dt) {
      const act = plan(o, h), hh = h % 24;
      // pressure: needs running low, sharpened as night nears
      const dusk = isDay(h) ? clamp((hh - 4) / 8) : 1;
      const low = 1 - Math.min(hu, wa) / 100, fireShort = clamp(1 - wood / 12);
      const pr = clamp(.45 * low + .55 * dusk * (built ? .35 : 1) * (.4 + .6 * fireShort));
      out.push({ h, hu, wa, he, wood, act, pr, built });
      hu -= R.hunger * dt; if (act === 'forage') hu += R.forage * dt;
      if (act === 'chop') wood += R.chop * dt;
      if (act === 'shelter' && hh + dt >= R.shelterH - 1e-9) built = true;
      if (act === 'night') {
        wa -= (built ? R.warmShelter : R.warmNight) * dt;
        if (wood > 0) { const b = Math.min(wood, dt); wood -= b; wa += R.fire * b; }
      } else wa += R.warmDay * dt;
      hu = clamp(hu, 0, 100); wa = clamp(wa, 0, 100);
      if (hu <= 0 || wa <= 0) { he -= R.hurt * dt * ((hu <= 0) + (wa <= 0)); zero += dt; }
      else if (hu > 50 && wa > 50) he += R.heal * dt;
      he = clamp(he, 0, 100);
    }
    return { out, zero, end: out[out.length - 1].he, minWa: Math.min(...out.map(p => p.wa)), minHe: Math.min(...out.map(p => p.he)) };
  }
  const ACOL = { shelter: '#8b5a2b', chop: '#d9822b', forage: '#4f9a4a', idle: '#efe6d2', night: '#26305e' };
  const ANAME = { shelter: 'building the shelter', chop: 'chopping wood', forage: 'foraging', idle: 'free time', night: 'night: by the fire' };
  const clock = h => { const m = (h + 6) % 24; return `day ${Math.floor((h + 6) / 24) + 1}, ${String(Math.floor(m)).padStart(2, '0')}:${String(Math.floor((m % 1) * 60)).padStart(2, '0')}`; };

  GK.scene('needs', (s, g, ui) => {
    const sF = s.querySelector('.sv-f'), sW = s.querySelector('.sv-w'), bS = s.querySelector('.sv-s');
    const vF = s.querySelector('.sv-fv'), vW = s.querySelector('.sv-wv');
    ui.watch(sF, sW, bS);
    let shelter = false; bS.onclick = () => { shelter = !shelter; };
    const CFG = [
      { to: 11, forage: 2, chop: 0, shelter: false, say: 'Two hours of foraging and nothing else: the first night drains warmth to zero, then health.' },
      { to: 22, forage: 4, chop: 5, shelter: false, say: 'Four hours of food and five of wood: the fire carries both nights, with little daylight to spare.' },
      { to: 33, forage: 4, chop: 1, shelter: true, say: 'A shelter on day one costs six hours, then pays every night after: less wood, more free time.' },
    ];
    const cache = {};
    const run = o => { const k = `${o.forage},${o.chop},${o.shelter}`; return cache[k] || (cache[k] = sim(o)); };
    const X0 = 80, X1 = 1000, Y0 = 170, Y1 = 410;
    return {
      dur: 33,
      frame(t, tour) {
        let cur, say = null;
        if (tour) {
          const [a, k] = GK.act(CFG, t); say = a.say; shelter = a.shelter; sF.value = a.forage; sW.value = a.chop; cur = clamp(k * 1.15) * 48;
        } else cur = (t % 16) / 16 * 48;
        // the day only holds 12 hours
        const sh = shelter ? R.shelterH : 0;
        if (+sF.value + +sW.value + sh > 12) sW.value = Math.max(0, 12 - sh - +sF.value);
        const o = { forage: +sF.value, chop: +sW.value, shelter };
        vF.textContent = `${o.forage} h`; vW.textContent = `${o.chop} h`; bS.classList.toggle('on', shelter);
        const S = run(o), P = S.out[Math.min(S.out.length - 1, Math.round(cur / .25))];
        GK.panel(g);
        // header: clock, action, stocks
        GK.head(g, clock(P.h), 30, 44, 'left', C.ink, 20);
        g.fillStyle = ACOL[P.act]; g.beginPath(); g.roundRect(30, 56, 14, 14, 3); g.fill();
        GK.text(g, (P.act === 'night' && P.wood <= 0 ? 'night: no fire' : ANAME[P.act]) + (P.built ? '  ·  shelter built' : ''), 52, 68, C.ink, 14, 'left', 600);
        GK.text(g, `wood ${P.wood.toFixed(1)}  ·  daylight plan: ${sh ? 'shelter ' + sh + ' h, ' : ''}chop ${o.chop} h, forage ${o.forage} h, free ${12 - sh - o.chop - o.forage} h`, 30, 92, C.muted, 13);
        // meters
        [['Hunger (fullness)', P.hu, C.gold], ['Warmth', P.wa, '#e0703a'], ['Health', P.he, C.good], ['Pressure', P.pr * 100, C.purple]].forEach(([n, v, col], i) => {
          const x = 560 + (i % 2) * 230, y = 34 + Math.floor(i / 2) * 44;
          GK.text(g, n, x, y, C.muted, 12, 'left', 600); GK.box(g, x, y + 6, 200, 14, '#efe6d2', null, 7);
          g.fillStyle = col; g.beginPath(); g.roundRect(x, y + 6, Math.max(0, 2 * v), 14, 7); g.fill();
        });
        // chart
        const { sx, sy } = GK.axes(g, X0, Y0, X1 - X0, Y1 - Y0, { x0: 0, x1: 48, y0: 0, y1: 100, xt: [0, 12, 24, 36, 48], yt: [0, 50, 100], fmtX: v => (v % 24 === 0 ? '6:00' : '18:00'), xl: '' });
        for (let d = 0; d < 2; d++) { g.fillStyle = 'rgba(38,48,94,.12)'; g.fillRect(sx(d * 24 + 12), Y0, sx(24) - sx(12), Y1 - Y0); }
        GK.text(g, 'night', sx(18), Y0 + 16, C.muted, 12, 'center', 600); GK.text(g, 'night', sx(42), Y0 + 16, C.muted, 12, 'center', 600);
        // schedule strip
        S.out.forEach(p => { if (p.h >= 48) return; g.fillStyle = ACOL[p.act]; g.fillRect(sx(p.h), Y0 - 22, sx(.25) - sx(0) + .6, 12); });
        g.beginPath(); S.out.forEach(p => g.lineTo(sx(p.h), sy(p.pr * 100))); g.lineTo(sx(48), sy(0)); g.lineTo(sx(0), sy(0)); g.fillStyle = 'rgba(138,79,214,.13)'; g.fill();
        GK.line(g, S.out.map(p => [sx(p.h), sy(p.hu)]), C.gold, 3);
        GK.line(g, S.out.map(p => [sx(p.h), sy(p.wa)]), '#e0703a', 3);
        GK.line(g, S.out.map(p => [sx(p.h), sy(p.he)]), C.good, 3.5);
        g.strokeStyle = C.ink; g.lineWidth = 2; g.beginPath(); g.moveTo(sx(cur), Y0 - 26); g.lineTo(sx(cur), Y1); g.stroke();
        // legend
        [['hunger', C.gold], ['warmth', '#e0703a'], ['health', C.good], ['pressure', 'rgba(138,79,214,.45)']].forEach(([n, col], i) => {
          g.fillStyle = col; g.fillRect(X0 + i * 110, Y1 + 30, 18, 8); GK.text(g, n, X0 + 24 + i * 110, Y1 + 38, C.muted, 12, 'left', 600);
        });
        // readouts
        GK.big(g, `${Math.round(S.end)}`, 'health at dawn of day three', 80, 500, S.end > 80 ? C.good : S.end > 0 ? C.goldInk : C.redDk);
        GK.big(g, `${S.zero.toFixed(1)} h`, 'spent with a need at zero', 330, 500, S.zero > 0 ? C.redDk : C.good);
        const free1 = 12 - sh - o.chop - o.forage, free2 = 12 - o.chop - o.forage;
        GK.big(g, free1 === free2 ? `${free1} h a day` : `${free1} h, then ${free2} h`, 'free daylight to explore (day 1, day 2)', 580, 500);
        if (say) TD.label(say, 520, 136, 'center', C.navy, 14);
        ui.stats(`<div><b>${Math.round(S.end)}</b><span>health at dawn, day 3</span></div><div class="${S.zero > 0 ? '' : 'g'}"><b>${S.zero.toFixed(1)} h</b><span>with a need at zero</span></div>`);
        ui.out(S.zero > 0 ? 'Something ran out. The pressure band climbs toward nightfall because the stocks cannot carry the night.'
          : 12 - o.chop - o.forage >= 6 ? 'Needs covered with daylight to spare: the pressure eases, and exploring becomes a choice instead of a risk.'
          : 'Needs covered, but the whole day goes to chores. Survival games tune this squeeze on purpose.');
      },
    };
  });
})();
