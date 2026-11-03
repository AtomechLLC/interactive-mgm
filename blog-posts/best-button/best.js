/* Best button calculator (post-mortem: "Warlock's Overhaul: Streamlining and Gameplay Balance").
   Kris's whiteboard as a picture. Each spell is a bar of spell power coefficient per second of casting, the measure
   the post ends on ("if there's a better button to push, better coefficient per cast time, push that instead").
   Coefficients are the post's own list; Shadow Bolt's 3.0 s cast against the 3.5 s baseline gives 6/7. The six talents
   are the ones Kris and Alex walk through. Crit chance (20% before Backlash) and ISB at full value are assumptions,
   stated on the page. Base damage is left out on purpose: it is flat, and spell power grows about 13% a tier. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;
  const W = 1040, H = 585;
  const IC = n => { const i = new Image(); i.src = `../img/${n}.jpg`; return i; };
  const TAL = [
    ['bane', 'Bane', 'spell_shadow_deathpact', 'Shadow Bolt 3.0 s → 2.5 s, Immolate 2.0 s → 1.5 s'],
    ['sf', 'Shadow and Flame', 'spell_shadow_shadowandflame', 'Shadow Bolt and Incinerate get 20% more from spell power'],
    ['isb', 'Improved Shadow Bolt', 'spell_shadow_shadowbolt', '+20% direct Shadow damage (counted at full uptime)'],
    ['ds', 'Demonic Sacrifice', 'spell_shadow_sacrificialshield', 'sacrifice the Succubus: +15% Shadow damage'],
    ['ruin', 'Ruin', 'spell_shadow_shadowwordpain', 'critical strikes do double damage, not 1.5×'],
    ['bl', 'Backlash', 'spell_fire_playingwithfire', '+3% critical strike chance'],
  ];
  // c: direct coefficient, dot: periodic coefficient (the post's numbers), cast in seconds, curse: one per Warlock, set by the raid
  const SPELLS = [
    { id: 'sb', name: 'Shadow Bolt', icon: 'spell_shadow_shadowbolt', school: 'shadow', c: 6 / 7, dot: 0, cast: 3.0 },
    { id: 'imm', name: 'Immolate', icon: 'spell_fire_immolation', school: 'fire', c: .2, dot: .13 * 5, cast: 2.0, dur: 15 },
    { id: 'cor', name: 'Corruption', icon: 'spell_shadow_abominationexplosion', school: 'shadow', c: 0, dot: 1 / 6 * 6, cast: 2.0, dur: 18 },
    { id: 'inc', name: 'Incinerate', icon: 'spell_fire_burnout', school: 'fire', c: .57, dot: 0, cast: 2.5 },
    { id: 'coa', name: 'Curse of Agony', icon: 'spell_shadow_curseofsargeras', school: 'shadow', c: 0, dot: 1.0, cast: 1.5, curse: true },
    { id: 'cod', name: 'Curse of Doom', icon: 'spell_shadow_auraofdarkness', school: 'shadow', c: 0, dot: 1.0, cast: 1.5, curse: true },
  ];
  const img = {}; [...SPELLS.map(s => s.icon), ...TAL.map(t => t[2])].forEach(n => { img[n] = img[n] || IC(n); });
  const draw1 = (g, n, x, y, s) => { const i = img[n]; if (i && i.complete && i.naturalWidth) g.drawImage(i, x, y, s, s); };

  // the whole calculation; on = { bane, sf, isb, ds, ruin, bl } as numbers 0..1 so the walk-through can ease between states
  function calc(on) {
    const crit = .20 + .03 * on.bl, critBonus = .5 + .5 * on.ruin, critMult = 1 + crit * critBonus;
    return SPELLS.map(s => {
      let c = s.c, cast = s.cast, dirMult = critMult, all = 1;
      if (s.id === 'sb' || s.id === 'inc') c *= 1 + .2 * on.sf;
      if (s.id === 'sb') { cast -= .5 * on.bane; dirMult *= 1 + .2 * on.isb; }
      if (s.id === 'imm') cast -= .5 * on.bane;
      if (s.school === 'shadow') all *= 1 + .15 * on.ds;
      const coeff = (c * dirMult + s.dot) * all;
      return { ...s, coeffRaw: c + s.dot, coeff, castNow: cast, perSec: coeff / cast };
    });
  }
  // a 30 s fight: DoTs whose value per cast second beats the filler are kept up, everything else is the filler
  function rotation(rows) {
    const fill = rows.filter(r => !r.dur && !r.curse).sort((a, b) => b.perSec - a.perSec)[0];
    const dots = rows.filter(r => r.dur && r.perSec > fill.perSec);
    const out = []; let t = 0; const next = {}; dots.forEach(d => next[d.id] = 0);
    while (t < 30) {
      const due = dots.find(d => next[d.id] <= t + .01);
      const sp = due || fill; out.push({ s: sp, t0: t, t1: Math.min(30, t + sp.castNow) });
      if (due) next[due.id] = t + sp.castNow + due.dur;
      t += sp.castNow;
    }
    const fillTime = out.filter(o => o.s === fill).reduce((a, o) => a + o.t1 - o.t0, 0);
    return { out, fill, share: fillTime / 30 };
  }

  function draw(g, on, hi) {
    T.use(g); g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,252,244,.85)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill();
    const rows = calc(on), sb = rows[0], max = .85;
    const order = rows.slice().sort((a, b) => (!!a.curse - !!b.curse) || (b.perSec - a.perSec));
    const x0 = 230, bw = 460, sx = v => x0 + clamp(v / max) * bw;
    g.textBaseline = 'middle';
    g.font = '800 15px Montserrat, Jost, sans-serif'; g.fillStyle = C.ink; g.textAlign = 'left';
    g.fillText('Spell power coefficient per second of casting', 24, 20);
    g.font = '600 13px Jost, sans-serif'; g.fillStyle = C.muted; g.textAlign = 'right'; g.fillText('coefficient', 945, 20); g.fillText('per second', 1016, 20);
    order.forEach((r, i) => {
      const y = 72 + i * 50 + (r.curse ? 14 : 0), isSb = r.id === 'sb';
      draw1(g, r.icon, 24, y - 18, 36);
      g.textAlign = 'left'; g.font = `${isSb ? 700 : 600} 16px Jost, sans-serif`; g.fillStyle = C.ink; g.fillText(r.name, 70, y - 6);
      g.font = '500 12px Jost, sans-serif'; g.fillStyle = C.muted; g.fillText(`${r.castNow === 1.5 && r.curse ? 'instant (1.5 s global cooldown)' : r.castNow.toFixed(1) + ' s cast'}${r.dur ? ` · lasts ${r.dur} s` : ''}`, 70, y + 12);
      const above = !r.curse && !isSb && r.perSec > sb.perSec;
      g.fillStyle = r.curse ? 'rgba(122,79,214,.28)' : isSb ? C.player : above ? C.gold : '#b9ad92';
      g.beginPath(); g.roundRect(x0, y - 13, sx(r.perSec) - x0, 26, 6); g.fill();
      if (r.curse) { g.save(); g.beginPath(); g.roundRect(x0, y - 13, sx(r.perSec) - x0, 26, 6); g.clip(); g.strokeStyle = 'rgba(122,79,214,.5)'; g.lineWidth = 2; for (let k = -30; k < bw; k += 10) { g.beginPath(); g.moveTo(x0 + k, y + 13); g.lineTo(x0 + k + 26, y - 13); g.stroke(); } g.restore(); }
      g.font = '700 15px Jost, sans-serif'; g.fillStyle = C.ink; g.textAlign = 'right';
      g.fillText(r.coeff.toFixed(2), 945, y); g.fillText(r.perSec.toFixed(3), 1016, y);
      if (above) T.label('beats Shadow Bolt', sx(r.perSec) + 8, y, 'left', C.gold, 12);
    });
    // Shadow Bolt's line: anything to the left of it costs you a Shadow Bolt's worth of damage to cast
    const lx = sx(sb.perSec);
    g.setLineDash([6, 5]); g.strokeStyle = C.player; g.lineWidth = 2; g.beginPath(); g.moveTo(lx, 50); g.lineTo(lx, 350); g.stroke(); g.setLineDash([]);
    g.font = '600 12px Jost, sans-serif'; g.fillStyle = C.player; g.textAlign = 'center'; g.fillText('Shadow Bolt', lx, 42);
    g.font = '500 12px Jost, sans-serif'; g.fillStyle = 'rgba(122,79,214,.9)'; g.textAlign = 'left';
    g.fillText('Curses: one per Warlock, chosen by the raid (Elements, Shadow, Doom), so they sit outside this choice.', 24, 374);

    // rotation strip
    const rot = rotation(rows), ry = 420, rx = 24, rw = 992;
    g.font = '800 15px Montserrat, Jost, sans-serif'; g.fillStyle = C.ink; g.textAlign = 'left';
    g.fillText('Your best 30 seconds', rx, ry - 10);
    g.font = '600 14px Jost, sans-serif'; g.fillStyle = C.muted; g.textAlign = 'right';
    g.fillText(`${Math.round(rot.share * 100)}% of cast time is ${rot.fill.name}`, rx + rw, ry - 10);
    rot.out.forEach(o => {
      const a = rx + o.t0 / 30 * rw, b = rx + o.t1 / 30 * rw;
      g.fillStyle = o.s.id === 'sb' ? 'rgba(76,141,240,.22)' : 'rgba(255,185,81,.35)'; g.fillRect(a + 1, ry + 4, b - a - 2, 44);
      if (b - a > 30) draw1(g, o.s.icon, (a + b) / 2 - 15, ry + 11, 30);
    });
    g.strokeStyle = '#cdbf9f'; g.lineWidth = 1.5; g.strokeRect(rx, ry + 4, rw, 44);
    g.font = '500 12px Jost, sans-serif'; g.fillStyle = C.muted; g.textAlign = 'center';
    for (let s = 0; s <= 30; s += 5) g.fillText(`${s} s`, rx + s / 30 * rw, ry + 62);

    // Shadow Bolt's arithmetic
    const c0 = 6 / 7, cSf = c0 * (1 + .2 * on.sf), mul = (1 + .2 * on.isb) * (1 + .15 * on.ds);
    g.textAlign = 'left'; g.font = '600 14px Jost, sans-serif'; g.fillStyle = C.ink;
    g.fillText(`Shadow Bolt: 3.0 / 3.5 = ${c0.toFixed(3)}  ×  Shadow and Flame ${(1 + .2 * on.sf).toFixed(2)} = ${cSf.toFixed(3)}  ·  then ×${mul.toFixed(2)} from ISB and Sacrifice, ×${(1 + (.2 + .03 * on.bl) * (.5 + .5 * on.ruin)).toFixed(3)} from crits, ÷ ${sb.castNow.toFixed(1)} s`, rx, 560);
    if (hi) T.label(hi, 400, 20, 'left', C.ink, 13, 'rgba(255,185,81,.9)');
  }

  // walk-through: add one talent every 3 s, in the order Kris walks through them
  const STAGE = 3, ORDER = ['bane', 'sf', 'isb', 'ds', 'ruin', 'bl'], DUR = STAGE * (ORDER.length + 2);
  function tourState(t) {
    const on = {}; let hi = 'No talents: the DoTs out-earn Shadow Bolt, so you weave them in';
    ORDER.forEach((k, i) => { const u = clamp((t - STAGE * (i + 1)) / .8); on[k] = ease(u); if (t >= STAGE * (i + 1)) hi = `+ ${TAL.find(x => x[0] === k)[1]}`; });
    if (t >= STAGE * (ORDER.length + 1)) hi = 'The full 21/40 build: nothing beats Shadow Bolt';
    return { on, hi };
  }

  const scenes = {};
  canvasDemo('best', (s, cv, g) => {
    const st = { t: 0, tour: true, held: false, key: '' };
    const box = $(s, '.bb-tals');
    box.innerHTML = TAL.map(([k, n, ic, d]) => `<label class="chk" title="${d}"><input type="checkbox" data-k="${k}"> <img src="../img/${ic}.jpg" alt="" style="width:18px;height:18px;vertical-align:-4px;border-radius:3px"> ${n}</label>`).join('');
    const boxes = $$(box, 'input'), tourBtn = $(s, '.bb-tour');
    const manual = () => { const on = {}; boxes.forEach(b => on[b.dataset.k] = b.checked ? 1 : 0); return on; };
    const stopTour = () => { st.tour = false; tourBtn.classList.remove('on'); };
    boxes.forEach(b => b.onchange = stopTour);
    $(s, '.bb-all').onclick = () => { boxes.forEach(b => b.checked = true); stopTour(); };
    $(s, '.bb-none').onclick = () => { boxes.forEach(b => b.checked = false); stopTour(); };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    function info(on) {
      const rows = calc(on), rot = rotation(rows), key = rows.map(r => r.perSec.toFixed(3)).join() + rot.share.toFixed(2);
      if (key === st.key) return; st.key = key;
      const best = rows.filter(r => !r.curse && r.id !== 'sb').sort((a, b) => b.perSec - a.perSec)[0];
      say($(s, '.bb-stats'), `<div><b>${rows[0].coeff.toFixed(2)}</b><span>Shadow Bolt coefficient</span></div><div class="${rot.share > .9 ? 'y' : ''}"><b>${Math.round(rot.share * 100)}%</b><span>of the fight on ${rot.fill.name}</span></div>`);
      say($(s, '.bb-out'), best.perSec > rows[0].perSec
        ? `${best.name} earns more per second of casting than Shadow Bolt, so it stays in the rotation.`
        : `Nothing outside the curse slot beats Shadow Bolt per second of casting. Every talent here lands on the same spell, so the rotation collapses to one button.`);
    }
    scenes.best = { seek(t) { st.held = true; st.tour = true; const { on, hi } = tourState(t); $$(s, '.bb-tals input').forEach(b => b.checked = on[b.dataset.k] > .5); draw(g, on, hi); info(on); }, dur: () => DUR };
    return dt => {
      if (st.held) return;
      let on, hi;
      if (st.tour) { st.t += Math.max(0, dt); if (st.t > DUR) st.t = 0; ({ on, hi } = tourState(st.t)); boxes.forEach(b => b.checked = on[b.dataset.k] > .5); }
      else on = manual();
      draw(g, on, hi); info(on);
    };
  });

  /* Slide 2: small multipliers compound. N talents of +2% each, added versus multiplied. */
  function drawStack(g, n, pct) {
    T.use(g); g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,252,244,.85)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill();
    const p = pct / 100, add = 1 + p * n, mul = Math.pow(1 + p, n), sx = v => 60 + (v - 1) / 1.5 * 900;
    g.textBaseline = 'middle'; g.textAlign = 'left';
    g.font = '800 18px Montserrat, Jost, sans-serif'; g.fillStyle = C.ink; g.fillText(`${Math.round(n)} talents of +${pct}% each`, 60, 50);
    [[`Added together: 1 + ${Math.round(n)} × ${p.toFixed(2)}`, add, '#b9ad92', 150], [`Multiplied: ${(1 + p).toFixed(2)} ^ ${Math.round(n)}`, mul, C.player, 260]].forEach(([lab, v, col, y]) => {
      g.font = '600 16px Jost, sans-serif'; g.fillStyle = C.ink; g.fillText(lab, 60, y - 34);
      g.fillStyle = col; g.beginPath(); g.roundRect(60, y - 18, Math.max(2, sx(v) - 60), 36, 8); g.fill();
      g.font = '800 20px Montserrat, Jost, sans-serif'; g.fillStyle = C.ink; g.fillText(`+${Math.round((v - 1) * 100)}%`, sx(v) + 12, y);
    });
    // the talents themselves, as pips
    for (let i = 0; i < 30; i++) { const x = 60 + i * 30, y = 360, got = i < n; g.fillStyle = got ? C.gold : '#e6dcc5'; g.beginPath(); g.roundRect(x, y, 24, 24, 5); g.fill(); }
    g.font = '600 14px Jost, sans-serif'; g.fillStyle = C.muted;
    g.fillText('Each talent alone is a rounding error. Thirty of them stacked multiplicatively is about +81%, not +60%.', 60, 420);
    g.fillText('Every one of the 21/40 build’s damage talents multiplied the same spell, which is how one button ran away from the rest.', 60, 446);
    g.font = '600 13px Jost, sans-serif';
    g.fillText(`Multiplied over added: ${((mul / add - 1) * 100).toFixed(1)}% more. At thirty talents that reaches the 13% the post says players start to notice.`, 60, 500);
  }
  canvasDemo('stack', (s, cv, g) => {
    const st = { t: 0, tour: true, held: false };
    const rng = $(s, '.st-n'), pr = $(s, '.st-p'), tourBtn = $(s, '.st-tour');
    rng.oninput = pr.oninput = () => { st.tour = false; tourBtn.classList.remove('on'); };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    const nAt = t => Math.min(30, Math.floor(t / .3));
    scenes.stack = { seek(t) { st.held = true; rng.value = nAt(t); pr.value = 2; $(s, '.st-nv').textContent = rng.value; $(s, '.st-pv').textContent = '2%'; drawStack(g, nAt(t), 2); }, dur: () => 12 };
    return dt => {
      if (st.held) return;
      if (st.tour) { st.t += Math.max(0, dt); if (st.t > 12) st.t = 0; rng.value = nAt(st.t); pr.value = 2; }
      $(s, '.st-nv').textContent = rng.value; $(s, '.st-pv').textContent = pr.value + '%';
      drawStack(g, +rng.value, +pr.value);
    };
  });

  window.__seek = (t, which = 'best') => scenes[which].seek(t);
  window.__dur = (which = 'best') => scenes[which].dur();
})();
