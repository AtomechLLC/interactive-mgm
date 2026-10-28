/* Lifesteal vs life per hit (MGM C4 M3, deck slides 177-180). Percentage lifesteal heals in proportion to damage,
   so as gear raises damage the healing outgrows anything the monsters deal: the Diablo III beta Barbarians who stood
   in high-level packs and never died. A flat amount of life per hit doesn't grow with damage. Same Barbarian, same
   pack, same gear on both sides; only the healing rule differs. Numbers are illustrative: HITS, STEAL, FLAT, PACK. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;
  const W = 1040, H = 585, HITS = 4, STEAL = .06, FLAT = 12, PACK = 60, MAXHP = 1000;   // hits/s, 6% lifesteal, 12 life per hit, pack DPS
  const heal = (rule, dmg) => rule === 'pct' ? dmg * STEAL * HITS : FLAT * HITS;
  const SIDES = [{ rule: 'pct', name: '6% lifesteal (beta)', col: C.red }, { rule: 'flat', name: '12 life per hit (after)', col: C.player }];

  // replay HP for both sides up to time t; dmgAt(t) gives damage per hit at that moment
  function sim(t, dmgAt) {
    const hp = [MAXHP, MAXHP], down = [-9, -9], deaths = [0, 0];
    for (let x = 0; x < t; x += 1 / 30) {
      SIDES.forEach((sd, i) => {
        if (x - down[i] < 1.5) return;
        if (x - down[i] < 1.5 + 1 / 30) hp[i] = MAXHP;
        hp[i] = Math.min(MAXHP, hp[i] + (heal(sd.rule, dmgAt(x)) - PACK) / 30);
        if (hp[i] <= 0) { hp[i] = 0; down[i] = x; deaths[i]++; }
      });
    }
    return { hp, down, deaths };
  }

  function arena(g, cx, sd, hp, isDown, t, dmg) {
    const cy = 140;
    g.fillStyle = 'rgba(255,252,244,.75)'; g.beginPath(); g.roundRect(cx - 250, 14, 500, 290, 14); g.fill();
    T.label(sd.name, cx, 40, 'center', '#fff', 16, sd.col);
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + .4, x = cx + Math.cos(a) * 92, y = cy + 10 + Math.sin(a) * 62; T.foe(x, y, 20, a + Math.PI, C.red, { mark: k % 2 ? 'horns' : null }); if (Math.floor(t * 2 + k) % 3 === 0) T.tracer(x, y, lerp(x, cx, .6), lerp(y, cy, .6), .6, C.red, 3); }
    T.player(cx, cy + 10, t * 6, 1.1, isDown ? .3 : 1);
    if (!isDown) { const a = t * HITS * Math.PI; T.cone(cx, cy + 10, a, .5, 70, .6, '255,185,81'); }
    // HP bar
    const bw = 300, bx = cx - bw / 2, by = 254;
    g.fillStyle = 'rgba(21,32,68,.8)'; g.fillRect(bx - 3, by - 3, bw + 6, 22);
    g.fillStyle = '#5a1f1c'; g.fillRect(bx, by, bw, 16); g.fillStyle = hp > 300 ? C.p2 : C.red; g.fillRect(bx, by, bw * hp / MAXHP, 16);
    g.fillStyle = '#fff'; g.font = '700 13px Jost, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(isDown ? 'Down' : `${Math.round(hp)} / ${MAXHP}`, cx, by + 8);
    const net = heal(sd.rule, dmg) - PACK;
    T.label(`${net >= 0 ? '+' : ''}${Math.round(net)} HP/s net`, cx, by + 36, 'center', net >= 0 ? C.good : C.redDk, 14);
  }
  function chart(g, dmg) {
    const A = { x0: 110, x1: 1000, y0: 548, y1: 350 }, dx = d => lerp(A.x0, A.x1, (d - 10) / 390), hy = h => lerp(A.y0, A.y1, h / 100);
    g.fillStyle = 'rgba(255,252,244,.75)'; g.beginPath(); g.roundRect(0, 318, W, H - 318, 14); g.fill();
    g.strokeStyle = '#cdbf9f'; g.lineWidth = 1; g.font = '600 13px Jost, sans-serif'; g.fillStyle = C.muted; g.textBaseline = 'middle';
    [0, 25, 50, 75, 100].forEach(h => { g.beginPath(); g.moveTo(A.x0, hy(h)); g.lineTo(A.x1, hy(h)); g.stroke(); g.textAlign = 'right'; g.fillText(h, A.x0 - 8, hy(h)); });
    g.textAlign = 'center'; [10, 100, 200, 300, 400].forEach(d => g.fillText(d, dx(d), A.y0 + 16));
    g.fillText('damage per hit (better gear →)', (A.x0 + A.x1) / 2, A.y0 + 30);
    g.save(); g.translate(A.x0 - 50, (A.y0 + A.y1) / 2); g.rotate(-Math.PI / 2); g.fillText('healing per second', 0, 0); g.restore();
    g.setLineDash([8, 6]); g.strokeStyle = C.redDk; g.lineWidth = 3; g.beginPath(); g.moveTo(A.x0, hy(PACK)); g.lineTo(A.x1, hy(PACK)); g.stroke(); g.setLineDash([]);
    T.label(`the pack deals ${PACK} HP/s`, A.x0 + 120, hy(PACK) - 16, 'center', C.redDk, 13);
    SIDES.forEach(sd => { g.strokeStyle = sd.col; g.lineWidth = 4; g.beginPath(); g.moveTo(dx(10), hy(Math.min(100, heal(sd.rule, 10)))); g.lineTo(dx(400), hy(Math.min(100, heal(sd.rule, 400)))); g.stroke(); });
    const cross = PACK / (STEAL * HITS);
    g.fillStyle = 'rgba(229,50,45,.08)'; g.fillRect(dx(cross), A.y1, A.x1 - dx(cross), A.y0 - A.y1);
    T.label('lifesteal outheals the pack: immortal', (dx(cross) + A.x1) / 2, A.y1 + 14, 'center', C.redDk, 13);
    g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.moveTo(dx(dmg), A.y1); g.lineTo(dx(dmg), A.y0); g.stroke();
    SIDES.forEach(sd => { g.fillStyle = sd.col; g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.arc(dx(dmg), hy(Math.min(100, heal(sd.rule, dmg))), 8, 0, Math.PI * 2); g.fill(); g.stroke(); });
  }
  function draw(g, t, dmgAt) {
    T.use(g); g.clearRect(0, 0, W, H);
    const r = sim(t, dmgAt), dmg = dmgAt(t);
    SIDES.forEach((sd, i) => arena(g, i ? 780 : 260, sd, r.hp[i], t - r.down[i] < 1.5, t, dmg));
    chart(g, dmg);
    return { ...r, dmg };
  }

  const DUR = 20;
  const tourDmg = x => lerp(40, 400, ease(clamp((x - 1) / 13)));

  let api = null;
  canvasDemo('life-per-hit', (s, cv, g) => {
    const st = { tour: true, t: 0, dmg: 40, held: false, last: '', log: [] };
    const sl = $(s, '.lp-dmg'), tourBtn = $(s, '.lp-tour');
    $(s, '.lp-modes').remove();
    sl.oninput = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); st.t = 0; } st.dmg = +sl.value; };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    // free play keeps its own short history so a slider change shows up in the HP bars
    const dmgAt = x => st.tour ? tourDmg(x) : st.dmg;
    function render() {
      const r = draw(g, st.t % (st.tour ? DUR : 1e9), dmgAt);
      sl.value = r.dmg; $(s, '.lp-v').textContent = Math.round(r.dmg);
      const imm = heal('pct', r.dmg) >= PACK;
      const key = `${Math.round(r.dmg / 10)}|${r.deaths}`; if (key === st.last) return; st.last = key;
      say($(s, '.st'), `<div class="r"><b>${Math.round(heal('pct', r.dmg))}</b><span>HP/s healed by 6% lifesteal</span></div><div><b>${heal('flat', r.dmg)}</b><span>HP/s healed by 12 life per hit</span></div><div class="y"><b>${PACK}</b><span>HP/s the pack deals</span></div>`);
      say($(s, '.out1'), imm
        ? 'Damage went up with gear, and lifesteal went up with it. Past 250 damage per hit the Barbarian heals more than the pack deals and simply stands there. Life per hit stays flat, so the pack still matters.'
        : 'At low damage both rules heal less than the pack deals: the fight is still a fight. Raise the damage and watch the lifesteal line cross the pack’s.');
    }
    api = { seek(t) { st.held = st.tour = true; st.t = t; render(); }, dur: () => DUR };
    return dt => { if (!st.held) st.t += dt; if (st.tour && st.t > DUR) st.t = 0; if (!st.tour && st.t > 30) st.t = 12; render(); };
  });

  window.__seek = t => api.seek(t);
  window.__dur = () => api.dur();
})();
