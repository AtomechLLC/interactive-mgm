/* Destruction Warlock & Chaotic Energy (MGM C4 M2, deck slides 224 and 256, "Limiting Player Actions"). Mists of Pandaria
   (patch 5.4) Destruction: the Chaotic Energy passive replaced Life Tap, so mana stopped being the limit and Burning Embers
   took its place. Incinerate and Conflagrate build ember bits (a crit doubles them), Chaos Bolt spends a whole ember, always
   crits and adds your crit chance on top. Fight() steps one fight in 10 ms ticks, with the cast decided either by the
   SimulationCraft 5.4.8 priority list (apl) or by the learner's key presses, so any moment can be drawn. Every number is in
   R with its source; the full table is SOURCES.md and slide 3. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp } = TD;
  const W = 1040, H = 585;

  // Spell data: SimulationCraft tag release-548-8 (engine/dbc/sc_spell_data.inc, engine/class_modules/sc_warlock.cpp) and
  // Wowhead MoP tooltips. sp, crit, mastery and haste are an illustrative raid-buffed character; the sliders retune them.
  const R = {
    sp: 20000, crit: .25, mastery: 16, haste: .10,
    critMult: 2,                                                    // spell crits deal 200%
    gcd: 1.0,                                                       // 1.5 s minus 0.5 s from Chaotic Energy (111546, effect 3)
    inc: { cast: 2.0, base: 1645, coef: 1.54 },                     // Incinerate 29722
    con: { base: 1843, coef: 1.725, recharge: 12, charges: 2 },     // Conflagrate 17962: 2 charges, 12 s recharge
    imm: { cast: 1.5, base: 502, coef: .47, every: 3, dur: 15 },    // Immolate 348: hit, then 5 ticks of the same size
    cb: { cast: 3.0, base: 2764, coef: 2.5875, cost: 10 },          // Chaos Bolt 116858: 2488 to 3040 base, 1 ember
    sb: { base: 3739, coef: 3.5, cost: 10 },                        // Shadowburn 17877: 3365 to 4112 base, 1 ember, under 20%
    bits: { hit: 1, crit: 2, bonus: .15, max: 40, start: 10 },      // 10 bits an ember, 4 embers; 15% bonus bit (hotfix 2013-09-13)
    bd: { stacks: 3, max: 6, cut: .3, dur: 15, cb: 3 },             // Backdraft 117828; Pyroclasm lets Chaos Bolt use 3 stacks
    hav: { cd: 25, dur: 15, stacks: 3, cb: 3 },                     // Havoc 80240: 3 spells, or 1 Chaos Bolt
    ds: { crit: .30, dur: 20, cd: 120 },                            // Dark Soul: Instability 113858
    mast: { filler: .01, spender: .03 },                            // Mastery: Emberstorm 77220, per point
    pool: 35,                                                       // the APL's burning_ember>3.5 (single target)
    // Chaotic Energy and mana: 300,000 base mana and 15,000 mp5 at level 90 (SimC gt_octbase_mpby_class, gt_base_mp5);
    // regen +625% (111546 effect 1) and divided by spell speed (warlock_t::mana_regen_per_second); filler costs +300%
    // (effect 2). Costs as % of base mana: Incinerate 5, Conflagrate 1, Immolate 3 (all x4), Havoc 4, Dark Soul 5.
    mana: { max: 300000, mp5: 15000, ce: 6.25, cost: { inc: .20, con: .04, imm: .12, hav: .04, ds: .05 } },
  };
  const SP = {
    inc: { name: 'Incinerate', icon: 'incinerate', col: '#f08a24' },
    con: { name: 'Conflagrate', icon: 'conflagrate', col: '#e5532d' },
    imm: { name: 'Immolate', icon: 'immolate', col: '#c99a1e' },
    tick: { name: 'Immolate ticks', icon: 'immolate', col: '#e2c25a' },
    cb: { name: 'Chaos Bolt', icon: 'chaosbolt', col: '#36a84a' },
    sb: { name: 'Shadowburn', icon: 'shadowburn', col: '#8a4fd6' },
    hav: { name: 'Havoc', icon: 'havoc', col: '#6b3fa0' },
    ds: { name: 'Dark Soul', icon: 'darksoul', col: '#e0a92d' },
  };
  const ORDER = ['cb', 'sb', 'inc', 'con', 'imm', 'tick'];

  function rng(seed) { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const hash = s => [...s].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261);

  /* One fight. o = { crit, mastery, haste, pool, ds, dsAt, havoc, exec, hp, breaks: [[at, len]], dur, seed }.
     o.exec forces the target under 20%; with o.hp the target has that much health and drops under 20% on its own. */
  function Fight(o) {
    const streams = {}, roll = k => (streams[k] ??= rng(hash(k + ':' + (o.seed || 1))))();
    const haste = 1 + o.haste;
    const s = {
      n: 0, t: 0, bits: R.bits.start, wasted: 0, cast: null, gcd: 0, queue: null,
      conCh: R.con.charges, conAt: 0, bd: 0, bdEnd: 0, immEnd: -1, immNext: 0,
      havSt: 0, havEnd: 0, havReady: o.havoc ? 1 : Infinity, dsReady: o.ds ? o.dsAt : Infinity, dsEnd: -1,
      mana: R.mana.max, mlog: [R.mana.max], dry: 0, casts: [], hits: [], gains: [], emb: [[0, R.bits.start]], dmg: 0, main: 0, by: {}, time: {}, kill: null,
    };
    const dsUp = () => s.t < s.dsEnd;
    const critNow = () => Math.min(1, o.crit + (dsUp() ? R.ds.crit : 0));
    const exec = () => o.exec || (o.hp > 0 && s.main >= o.hp * .8);
    const castTime = k => k === 'inc' ? R.inc.cast / haste * (s.bd >= 1 ? 1 - R.bd.cut : 1)
      : k === 'cb' ? R.cb.cast / haste * (s.bd >= R.bd.cb ? 1 - R.bd.cut : 1)
      : k === 'imm' ? R.imm.cast / haste : 0;
    const regen = R.mana.mp5 / 5 * (1 + R.mana.ce) * haste * (o.regen ?? 1);   // mana per second; o.regen scales it for what-ifs
    const cost = k => (R.mana.cost[k] || 0) * R.mana.max * (k === 'inc' && s.bd >= 1 ? 1 - R.bd.cut : 1);
    const inBreak = () => (o.breaks || []).some(([b, l]) => s.t >= b - 1e-9 && s.t < b + l - 1e-9);

    function gain(n, why, tgt) {
      const g = Math.min(n, R.bits.max - s.bits); s.bits += g;
      s.gains.push({ at: s.t, n, kept: g, why, tgt });
      if (n > g) s.wasted += n - g;
      s.emb.push([s.t, s.bits]);
    }
    function spend(n) { s.bits -= n; s.emb.push([s.t, s.bits]); }
    function hit(k, base, coef, mult, tgt, forceCrit) {
      const cc = critNow(), crit = forceCrit || roll(k + tgt) < cc;
      const amt = Math.round((base + coef * R.sp) * mult * (crit ? R.critMult : 1));
      s.dmg += amt; if (tgt === 0) s.main += amt; s.by[k] = (s.by[k] || 0) + amt;
      s.hits.push({ at: s.t, k, amt, crit, tgt });
      return { amt, crit };
    }
    // what a key does: '' if it can be cast now, else the reason it can't
    function why(k) {
      if (s.kill != null) return 'The target is down';
      if (k === 'ds') return !o.ds ? 'Dark Soul is off' : s.t < s.dsReady ? `Dark Soul is on cooldown (${Math.ceil(s.dsReady - s.t)} s)` : '';
      if (k === 'hav') return !o.havoc ? 'No second target' : s.t < s.havReady ? `Havoc is on cooldown (${Math.ceil(s.havReady - s.t)} s)` : '';
      if (k === 'con' && s.conCh < 1) return `Conflagrate is recharging (${Math.ceil(s.conAt - s.t)} s)`;
      if ((k === 'cb' || k === 'sb') && s.bits < 10) return 'Not enough Burning Embers';
      if (s.mana < cost(k)) return 'Not enough mana';
      if (k === 'sb' && !exec()) return 'Shadowburn needs the target under 20% health';
      return '';
    }

    function finish(c) {
      const k = c.k, fm = 1 + R.mast.filler * o.mastery, spm = 1 + R.mast.spender * o.mastery;
      s.mana = Math.max(0, s.mana - c.cost);
      // Havoc: the next 3 single-target spells, or one Chaos Bolt, also hit the second target
      const hv = s.havSt > 0 && s.t < s.havEnd && (k !== 'cb' || s.havSt >= R.hav.cb) && k !== 'hav' && k !== 'ds';
      const tg = hv ? [0, 1] : [0];
      if (hv) { s.havSt -= k === 'cb' ? R.hav.cb : 1; c.havoc = true; }
      if (k === 'hav') { s.havSt = R.hav.stacks; s.havEnd = s.t + R.hav.dur; s.havReady = s.t + R.hav.cd; }
      if (k === 'ds') { s.dsEnd = s.t + R.ds.dur; s.dsReady = s.t + R.ds.cd; }
      if (k === 'inc' || k === 'con') {
        tg.forEach(tgt => {
          const r = hit(k, R[k].base, R[k].coef, fm, tgt); c.dmg += r.amt; if (!tgt) c.crit = r.crit;
          gain(r.crit ? R.bits.crit : R.bits.hit, r.crit ? 'crit' : 'hit', tgt);
          if (roll(k + 'bonus') < R.bits.bonus) gain(1, 'bonus', tgt);
        });
        if (k === 'inc' && c.bd) s.bd = Math.max(0, s.bd - 1);
        if (k === 'con') {
          if (s.conCh === R.con.charges) s.conAt = s.t + R.con.recharge;
          s.conCh--; s.bd = Math.min(R.bd.max, s.bd + R.bd.stacks); s.bdEnd = s.t + R.bd.dur;
        }
      }
      if (k === 'imm') {
        tg.forEach(tgt => { const r = hit('imm', R.imm.base, R.imm.coef, fm, tgt); c.dmg += r.amt; if (!tgt) c.crit = r.crit; if (r.crit) gain(1, 'crit', tgt); });
        const rem = Math.max(0, s.immEnd - s.t);
        if (rem <= 0) s.immNext = s.t + R.imm.every / haste;
        s.immEnd = s.t + R.imm.dur + Math.min(rem, R.imm.dur / 2);
        c.imm2 = hv;
      }
      if (k === 'cb' || k === 'sb') {
        spend(R[k].cost);
        tg.forEach(tgt => {
          const r = k === 'cb' ? hit('cb', R.cb.base, R.cb.coef, spm * (1 + critNow()), tgt, true) : hit('sb', R.sb.base, R.sb.coef, spm, tgt);
          c.dmg += r.amt; if (!tgt) c.crit = r.crit;
        });
        if (k === 'cb' && c.bd) s.bd = Math.max(0, s.bd - R.bd.cb);
      }
      c.done = true;
      s.time[k] = (s.time[k] || 0) + Math.max(c.end - c.at, k === 'ds' ? 0 : R.gcd);
    }

    function start(k) {
      const ct = castTime(k), c = { k, at: s.t, end: s.t + ct, dmg: 0, crit: false, done: false, cost: cost(k),
        bd: (k === 'inc' && s.bd >= 1) || (k === 'cb' && s.bd >= R.bd.cb) };
      s.casts.push(c);
      if (k !== 'ds') s.gcd = s.t + R.gcd;
      if (ct > 0) s.cast = c; else finish(c);
    }

    function tick(decide) {
      s.n++; s.t = s.n / 100;
      s.mana = Math.min(R.mana.max, s.mana + regen / 100);
      if (s.n % 10 === 0) s.mlog.push(s.mana);
      if (!s.cast && s.t >= s.gcd && s.mana < R.mana.max * R.mana.cost.inc) s.dry += .01;
      if (s.conCh < R.con.charges && s.t >= s.conAt - 1e-9) { s.conCh++; if (s.conCh < R.con.charges) s.conAt += R.con.recharge; }
      if (s.t >= s.bdEnd) s.bd = 0;
      if (s.t >= s.havEnd) s.havSt = 0;
      while (s.immEnd > 0 && s.immNext <= s.immEnd + 1e-9 && s.t >= s.immNext - 1e-9) {
        const r = hit('tick', R.imm.base, R.imm.coef, 1 + R.mast.filler * o.mastery, 0);
        if (r.crit) gain(1, 'tick', 0);
        s.immNext += R.imm.every / haste;
      }
      const brk = inBreak();
      if (s.cast && brk) { s.cast.end = s.t; s.cast.cut = true; s.cast = null; }
      if (s.cast && s.t >= s.cast.end - 1e-9) { const c = s.cast; s.cast = null; finish(c); }
      if (o.hp && s.kill == null && s.main >= o.hp) { s.kill = s.t; if (s.cast) { s.cast.end = s.t; s.cast.cut = true; s.cast = null; } }
      if (s.kill != null || brk || s.t >= (o.dur ?? Infinity) - 1e-9) return;
      for (let i = 0; i < 3 && !s.cast; i++) {
        if (s.t < s.gcd - 1e-9) {
          // only Dark Soul is off the global cooldown
          const k = decide(s, api);
          if (k === 'ds' && !why('ds')) { start('ds'); continue; }
          break;
        }
        const k = decide(s, api);
        if (!k || why(k)) break;
        if (o.dur != null && s.t + castTime(k) > o.dur) break;   // no cast the fight can't finish
        start(k);
        if (k !== 'ds') break;
      }
    }
    const api = {
      s, o, why, castTime, exec, dsUp, critNow,
      advance(to, decide) { while (s.t + .005 < to) tick(decide); return s; },
      // ember bits at time t, from the step log
      regen,
      manaAt(t) { return s.mlog[Math.min(s.mlog.length - 1, Math.max(0, Math.round(t * 10)))]; },
      bitsAt(t) { let v = R.bits.start; for (const [at, b] of s.emb) { if (at > t + 1e-9) break; v = b; } return v; },
    };
    return api;
  }

  // the SimulationCraft 5.4.8 Destruction priority list (profiles/Tier16H/Warlock_Destruction_T16H.simc), single target,
  // without trinkets, potions and pets. o.pool off = spend every ember the moment you have one.
  function apl(s, F) {
    const o = F.o, em = s.bits, ds = F.dsUp(), ok = k => !F.why(k);
    // the fight is about to end: spend what's banked (the APL's target.time_to_die)
    const ending = o.dur != null && o.dur - s.t < em / 10 * R.cb.cast + R.cb.cast;
    if (ok('ds')) return 'ds';
    if (s.t < s.gcd - 1e-9) return null;
    if (ok('hav')) return 'hav';
    if (ok('sb') && (!o.pool || em > R.pool || ds || ending || s.havSt >= 1)) return 'sb';
    if (s.immEnd - s.t < R.imm.dur * .3 / (1 + o.haste) + R.imm.cast) return 'imm';
    if (s.conCh === R.con.charges && s.havSt === 0) return 'con';
    // low on mana: Chaos Bolt costs none, so spend an ember while mana comes back (SimC uses mana.pct<=20 for Shadowburn)
    if (!F.exec() && ok('cb') && s.mana < R.mana.max * R.mana.cost.inc) return 'cb';
    if (!F.exec() && ok('cb') && s.bd < 3 && (!o.pool || em > R.pool || ds || ending)) return 'cb';
    if (!F.exec() && ok('cb') && s.havSt >= R.hav.cb && s.havEnd - s.t > F.castTime('cb')) return 'cb';
    if (ok('con')) return 'con';
    return 'inc';
  }
  const run = (o, to) => { const F = Fight(o); F.advance(to ?? o.dur, apl); return F; };

  /* ---------------- drawing ---------------- */
  const k$ = v => v >= 1e6 ? (v / 1e6).toFixed(v >= 1e7 ? 1 : 2) + 'M' : v >= 1e3 ? Math.round(v / 1e3) + 'k' : String(Math.round(v));
  const pct = v => Math.round(v * 100) + '%';
  function panelBg(g, x, y, w, h) { g.fillStyle = 'rgba(255,252,244,.82)'; g.beginPath(); g.roundRect(x, y, w, h, 12); g.fill(); g.strokeStyle = '#cdbf9f'; g.lineWidth = 1; g.stroke(); }
  function head(g, text, x, y, col = C.ink, size = 13, align = 'left') { g.fillStyle = col; g.font = `700 ${size}px Montserrat, Jost, sans-serif`; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(text, x, y); }
  function txt(g, text, x, y, col = C.muted, size = 12, align = 'left', w = 600) { g.fillStyle = col; g.font = `${w} ${size}px Jost, sans-serif`; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(text, x, y); }

  // the arena: warlock, target(s), the cast bar, projectiles and damage numbers
  function arena(g, F, t, x0, y0, w, h) {
    const s = F.s, o = F.o;
    T.floor(x0, y0, w, h);
    const wl = [x0 + 70, y0 + h / 2 - 8], tg = [[x0 + w - 90, y0 + h / 2 - 22], [x0 + w - 70, y0 + h - 28]];
    T.player(wl[0], wl[1], 0, 1.1, 1, C.purple); ICON.draw(g, 'warlock', wl[0] - 46, wl[1] - 26, 26);
    T.label('Warlock', wl[0], wl[1] + 36, 'center', C.ink, 12);
    const foes = o.havoc ? 2 : 1;
    for (let i = 0; i < foes; i++) {
      T.foe(tg[i][0], tg[i][1], i ? 22 : 32, Math.PI, i ? '#c45a52' : C.red, { mark: 'horns' });
      if (i && s.havSt > 0 && t < s.havEnd) ICON.draw(g, 'havoc', tg[i][0] - 40, tg[i][1], 20);
    }
    if (o.hp) {
      const left = Math.max(0, o.hp - hitsTo(s, t, 0)), f = left / o.hp;
      const hx = tg[0][0] - 150, hy = y0 + 8;
      g.fillStyle = 'rgba(21,32,68,.88)'; g.beginPath(); g.roundRect(hx, hy, 200, 18, 4); g.fill();
      g.fillStyle = f < .2 ? '#8a4fd6' : C.red; g.fillRect(hx + 2, hy + 2, 196 * f, 14);
      g.fillStyle = '#fff'; g.fillRect(hx + 2 + 196 * .2, hy, 2, 18);
      txt(g, `${k$(left)} HP`, hx + 100, hy + 9, '#fff', 12, 'center', 700);
    } else if (F.o.exec) T.label('Under 20% health', tg[0][0], tg[0][1] - 50, 'center', '#fff', 12, '#8a4fd6');
    // projectiles fly over the last 0.3 s of each cast; instants flash on the target
    s.casts.forEach(c => {
      if (c.cut || c.k === 'ds' || c.k === 'hav') return;
      const a = (t - (c.end - .3)) / .3;
      if (a < 0 || a > 1.6) return;
      (c.havoc ? [0, 1] : [0]).forEach(i => {
        const [tx, ty] = tg[i];
        if (a <= 1) { const px = lerp(wl[0] + 20, tx, a), py = lerp(wl[1], ty, a) - Math.sin(a * Math.PI) * 30; T.tracer(wl[0] + 20, wl[1], px, py, .6, SP[c.k].col, c.k === 'cb' ? 8 : 4); ICON.draw(g, SP[c.k].icon, px, py, c.k === 'cb' ? 30 : 22); }
        else T.flash(tx, ty, c.k === 'cb' ? 60 : 36, 1.6 - a);
      });
    });
    // damage numbers
    s.hits.forEach(hh => {
      const a = t - hh.at; if (a < 0 || a > 1.1 || (hh.k === 'tick' && a > .8)) return;
      const [tx, ty] = tg[hh.tgt], big = hh.k === 'cb' || hh.k === 'sb';
      g.save(); g.globalAlpha = clamp(1.2 - a);
      g.font = `800 ${big ? 24 : hh.crit ? 17 : 14}px Montserrat, Jost, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      const yy = ty - 4 - a * 30 + (hh.k === 'tick' ? 26 : 0), xx = tx - (hh.k === 'tick' ? 0 : hh.tgt ? 70 : 92);
      g.lineWidth = 4; g.strokeStyle = 'rgba(255,252,244,.95)'; const str = (hh.crit ? '✸' : '') + k$(hh.amt);
      g.strokeText(str, xx, yy); g.fillStyle = big ? SP[hh.k].col : hh.crit ? C.goldInk : C.ink; g.fillText(str, xx, yy);
      g.restore();
    });
    // cast bar under the warlock
    const cur = s.casts.find(c => !c.cut && c.at <= t && c.end > t && c.end > c.at);
    const bx = x0 + 16, by = y0 + h - 30, bw = 200;
    g.fillStyle = 'rgba(21,32,68,.88)'; g.beginPath(); g.roundRect(bx, by, bw, 22, 5); g.fill();
    if (cur) {
      const f = (t - cur.at) / (cur.end - cur.at);
      g.fillStyle = SP[cur.k].col; g.beginPath(); g.roundRect(bx + 2, by + 2, (bw - 4) * f, 18, 4); g.fill();
      ICON.draw(g, SP[cur.k].icon, bx - 2, by + 11, 22);
      txt(g, `${SP[cur.k].name}${cur.bd ? ' (Backdraft)' : ''}`, bx + 22, by + 11, '#fff', 12, 'left', 700);
      txt(g, `${(cur.end - t).toFixed(1)} s`, bx + bw - 6, by + 11, '#fff', 12, 'right', 600);
    } else {
      const brk = (o.breaks || []).some(([b, l]) => t >= b && t < b + l);
      txt(g, brk ? 'Moving: no casting' : s.kill != null && t >= s.kill ? 'Target down' : 'Instant / global cooldown', bx + bw / 2, by + 11, brk ? '#ffb951' : '#c9cde6', 12, 'center', 600);
    }
  }
  const hitsTo = (s, t, tgt) => s.hits.reduce((a, h) => a + (h.at <= t && h.tgt === tgt ? h.amt : 0), 0);

  // the four Burning Embers, 10 bits each, plus the buffs that steer the rotation
  function emberBar(g, F, t, x0, y0, w) {
    const s = F.s, bits = F.bitsAt(t);
    ICON.draw(g, 'embers', x0 + 14, y0 + 14, 24);
    head(g, 'Burning Embers', x0 + 34, y0 + 14, C.ink, 15);
    txt(g, `${(bits / 10).toFixed(1)} / 4 embers  (${bits} / 40 bits)`, x0 + w - 4, y0 + 14, C.ink, 14, 'right', 700);
    const ew = (w - 3 * 12) / 4, eh = 38, ey = y0 + 30;
    for (let i = 0; i < 4; i++) {
      const ex = x0 + i * (ew + 12), f = clamp((bits - i * 10) / 10), full = f >= 1;
      g.fillStyle = '#241a2e'; g.beginPath(); g.roundRect(ex, ey, ew, eh, 9); g.fill();
      if (f > 0) {
        const gr = g.createLinearGradient(0, ey, 0, ey + eh);
        gr.addColorStop(0, full ? '#ffe08a' : '#f0a24a'); gr.addColorStop(1, full ? '#ff6a1a' : '#a8461c');
        g.save(); g.beginPath(); g.roundRect(ex, ey, ew, eh, 9); g.clip();
        g.fillStyle = gr; g.fillRect(ex, ey, ew * f, eh);
        if (full) { g.fillStyle = `rgba(255,240,180,${.25 + .15 * Math.sin(t * 6 + i)})`; g.fillRect(ex, ey, ew, eh); }
        g.restore();
      }
      g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 1;
      for (let j = 1; j < 10; j++) { g.beginPath(); g.moveTo(ex + ew * j / 10, ey + 6); g.lineTo(ex + ew * j / 10, ey + eh - 6); g.stroke(); }
      g.strokeStyle = full ? '#ffb951' : '#4a3a58'; g.lineWidth = full ? 3 : 2; g.beginPath(); g.roundRect(ex, ey, ew, eh, 9); g.stroke();
      if (full) txt(g, 'Ember', ex + ew / 2, ey + eh / 2, '#5a2306', 13, 'center', 800);
    }
    // recent gains pop over the ember they landed in, spends flash the ember they left
    s.gains.forEach(gn => {
      const a = t - gn.at; if (a < 0 || a > .9) return;
      const b = F.bitsAt(gn.at), slot = clamp(Math.floor((Math.max(0, b - 1)) / 10), 0, 3), ex = x0 + slot * (ew + 12) + ew / 2;
      const lost = gn.kept < gn.n, lab = lost ? `+${gn.n} lost at cap` : gn.why === 'crit' ? `+${gn.n} crit` : gn.why === 'tick' ? '+1 Immolate crit' : gn.why === 'bonus' ? '+1 bonus' : `+${gn.n}`;
      g.save(); g.globalAlpha = clamp(1.1 - a * 1.2);
      T.label(lab, ex + (gn.why === 'bonus' ? 34 : 0), ey + 4 - a * 6 + (gn.why === 'bonus' ? 16 : 0), 'center', '#fff', 12, lost ? C.redDk : gn.why === 'crit' || gn.why === 'tick' ? C.goldInk : '#b55a17');
      g.restore();
    });
    s.casts.forEach(c => {
      if (!(c.k === 'cb' || c.k === 'sb') || c.cut || c.end > t || t - c.end > .8) return;
      const a = t - c.end, b = F.bitsAt(c.end), slot = clamp(Math.floor(b / 10), 0, 3), ex = x0 + slot * (ew + 12);
      g.save(); g.globalAlpha = clamp(1 - a * 1.2); g.strokeStyle = SP[c.k].col; g.lineWidth = 5; g.beginPath(); g.roundRect(ex - 3, ey - 3, ew + 6, eh + 6, 11); g.stroke(); g.restore();
      g.save(); g.globalAlpha = clamp(1.1 - a * 1.2); T.label(`−1 ember: ${SP[c.k].name}`, ex + ew / 2, ey + eh / 2, 'center', '#fff', 12, SP[c.k].col); g.restore();
    });
    // buffs
    // the mana bar: Chaotic Energy's fast regen against the fillers' raised costs; Chaos Bolt costs no mana
    const my = ey + eh + 10, mf = F.manaAt(t) / R.mana.max;
    // Chaotic Energy's fel yellow-green, as on the in-game bar
    g.fillStyle = '#26301a'; g.beginPath(); g.roundRect(x0, my, w, 22, 6); g.fill();
    const mg = g.createLinearGradient(0, my, 0, my + 22); mg.addColorStop(0, '#e2f25a'); mg.addColorStop(1, '#8cc21e');
    g.save(); g.beginPath(); g.roundRect(x0, my, w, 22, 6); g.clip(); g.fillStyle = mg; g.fillRect(x0, my, w * mf, 22); g.restore();
    ICON.draw(g, 'chaoticenergy', x0 + 12, my + 11, 18);
    // dark text over the yellow-green fill, light text over the empty bar
    const halo = (str, x, align, onFill, col) => { g.font = '700 12px Jost, sans-serif'; g.textAlign = align; g.textBaseline = 'middle'; g.lineWidth = 3; g.strokeStyle = onFill ? 'rgba(245,255,210,.85)' : 'rgba(20,26,8,.85)'; g.strokeText(str, x, my + 11); g.fillStyle = col || (onFill ? '#1f2a06' : '#eef7c8'); g.fillText(str, x, my + 11); };
    halo(`Chaotic Energy: +${k$(F.regen)} per second`, x0 + 28, 'left', w * mf > 300);
    halo(`${k$(F.manaAt(t))} / ${k$(R.mana.max)}`, x0 + w - 8, 'right', mf > .97);
    s.casts.forEach(c => {
      const a = t - c.end; if (!c.done || !c.cost || a < 0 || a > .7) return;
      g.save(); g.globalAlpha = clamp(1 - a * 1.4); halo(`−${k$(c.cost)} ${SP[c.k].name}`, x0 + 310, 'left', w * mf > 420, w * mf > 420 ? '#a8201c' : '#ffb4a8'); g.restore();
    });
    const by = my + 46, items = [];
    const bdOn = s.casts.length && t < bdEndAt(s, t);
    items.push(['backdraft', 'Backdraft', bdOn ? `×${bdAt(s, t)}` : '', bdOn]);
    items.push(['conflagrate', 'Conflagrate', `${conAt(s, t)} / 2`, conAt(s, t) > 0]);
    items.push(['immolate', 'Immolate', immAt(s, t) > 0 ? `${Math.ceil(immAt(s, t))} s` : 'off', immAt(s, t) > 0]);
    if (F.o.ds) {
      const c = s.casts.filter(c => c.k === 'ds' && c.at <= t).at(-1), on = c ? c.at + R.ds.dur - t : 0;
      const wait = c ? c.at + R.ds.cd - t : F.o.dsAt - t;
      items.push(['darksoul', 'Dark Soul', on > 0 ? `${Math.ceil(on)} s left` : wait > 0 ? `ready in ${Math.ceil(wait)} s` : 'ready', on > 0]);
    }
    if (F.o.havoc) { const h = havAt(s, t); items.push(['havoc', 'Havoc', h ? `×${h}` : '', h > 0]); }
    items.forEach(([ic, name, v, on], i) => {
      const ix = x0 + 14 + i * (w / items.length);
      ICON.draw(g, ic, ix, by, 24, on ? 1 : .35);
      txt(g, name, ix + 18, by - 6, on ? C.ink : C.muted, 12, 'left', 700);
      txt(g, v, ix + 18, by + 9, on ? C.ink : C.muted, 12, 'left', 600);
    });
  }
  // buff state at a past moment, recomputed from the cast log so drawing never needs the live state
  function bdAt(s, t) { let n = 0, end = 0; s.casts.forEach(c => { if (!c.done || c.end > t) return; if (c.end >= end) n = 0; if (c.k === 'con') { n = Math.min(R.bd.max, n + R.bd.stacks); end = c.end + R.bd.dur; } else if (c.bd) n = Math.max(0, n - (c.k === 'cb' ? R.bd.cb : 1)); }); return t < end ? n : 0; }
  function bdEndAt(s, t) { let end = 0; s.casts.forEach(c => { if (c.done && c.end <= t && c.k === 'con') end = c.end + R.bd.dur; }); return bdAt(s, t) > 0 ? end : 0; }
  function conAt(s, t) {
    let ch = R.con.charges, at = Infinity;
    const upTo = v => { while (ch < R.con.charges && at <= v + 1e-9) { ch++; at = ch < R.con.charges ? at + R.con.recharge : Infinity; } };
    s.casts.forEach(c => { if (c.k !== 'con' || c.end > t) return; upTo(c.end); if (ch === R.con.charges) at = c.end + R.con.recharge; ch--; });
    upTo(t); return ch;
  }
  function immAt(s, t) { let end = -1; s.casts.forEach(c => { if (c.k === 'imm' && c.done && c.end <= t) { const rem = Math.max(0, end - c.end); end = c.end + R.imm.dur + Math.min(rem, R.imm.dur / 2); } }); return end - t; }
  function havAt(s, t) { let n = 0, end = 0; s.casts.forEach(c => { if (!c.done || c.end > t) return; if (c.k === 'hav') { n = R.hav.stacks; end = c.end + R.hav.dur; } else if (c.havoc) n -= c.k === 'cb' ? R.hav.cb : 1; }); return t < end ? Math.max(0, n) : 0; }

  // the scrolling timeline: casts, ember level, damage per hit
  const WIN = 20, LEAD = 14;
  function timeline(g, F, t, x0, y0, w, h, opt = {}) {
    const s = F.s, o = F.o, lx = x0 + 100, pw = w - 110;
    const t0 = Math.max(0, t - LEAD), sx = v => lx + (v - t0) / WIN * pw;
    const L = { cast: [y0 + 8, 40], emb: [y0 + 60, 62], mana: [y0 + 130, 22], dmg: [y0 + 160, 56] };
    g.save(); g.beginPath(); g.rect(lx, y0, pw, h); g.clip();
    // Dark Soul windows and breaks behind everything
    s.casts.filter(c => c.k === 'ds' && c.at <= t).forEach(c => {
      const a = sx(c.at), e = Math.min(sx(c.at + R.ds.dur), sx(t));
      g.fillStyle = 'rgba(255,185,81,.24)'; g.fillRect(a, y0, e - a, h);
      if (e - Math.max(a, lx) > 130) T.label('Dark Soul: +30% crit', (Math.max(a, lx) + e) / 2, y0 + 53, 'center', '#fff', 10, C.goldInk);
    });
    (o.breaks || []).forEach(([b, l]) => {
      const a = sx(b), e = sx(b + l);
      g.fillStyle = 'rgba(93,97,140,.16)'; g.fillRect(a, y0, e - a, h);
      g.strokeStyle = 'rgba(93,97,140,.35)'; g.lineWidth = 1;
      for (let x = a - h; x < e; x += 10) { g.beginPath(); g.moveTo(Math.max(a, x), y0 + (Math.max(a, x) - x)); g.lineTo(Math.min(e, x + h), y0 + Math.min(h, e - x)); g.stroke(); }
      if (e > lx + 40) T.label('Break: moving', (Math.max(a, lx) + e) / 2, y0 + 53, 'center', '#fff', 10, C.muted);
    });
    // casts
    const [cy, ch] = L.cast;
    s.casts.forEach(c => {
      if (c.at > t || c.k === 'ds') return;
      const end = Math.min(t, c.end > c.at ? c.end : c.at + R.gcd), x = sx(c.at), xe = sx(end);
      if (xe < lx - 40) return;
      const instant = c.end === c.at;
      g.fillStyle = instant ? 'rgba(98,104,138,.18)' : SP[c.k].col; g.globalAlpha = c.cut ? .45 : 1;
      g.beginPath(); g.roundRect(x + 1, cy, Math.max(2, xe - x - 2), ch, 6); g.fill();
      if (instant) { g.strokeStyle = SP[c.k].col; g.lineWidth = 2; g.stroke(); }
      g.globalAlpha = 1;
      ICON.draw(g, SP[c.k].icon, x + 16, cy + ch / 2, 26, c.cut ? .5 : 1);
      if (c.done && c.crit && c.k !== 'cb') { txt(g, '✸', x + 32, cy + 8, C.goldInk, 14, 'left', 800); }
      if (c.havoc) txt(g, '×2', x + 32, cy + ch - 9, '#fff', 11, 'left', 800);
      if (c.k === 'cb' && xe - x > 70) txt(g, c.done ? k$(c.dmg) : 'Chaos Bolt', x + 34, cy + ch / 2, '#fff', 13, 'left', 800);
    });
    s.casts.filter(c => c.k === 'ds' && c.at <= t).forEach(c => ICON.draw(g, 'darksoul', sx(c.at) + 2, cy - 2, 18));
    // ember level: a step line, with the 3.5-ember pooling line and the cap
    const [ey, eh] = L.emb, yv = b => ey + eh - b / 40 * eh;
    g.strokeStyle = 'rgba(93,97,140,.25)'; g.lineWidth = 1;
    [10, 20, 30, 40].forEach(b => { g.beginPath(); g.moveTo(lx, yv(b)); g.lineTo(lx + pw, yv(b)); g.stroke(); });
    if (o.pool) { g.setLineDash([5, 4]); g.strokeStyle = 'rgba(168,32,28,.45)'; g.beginPath(); g.moveTo(lx, yv(R.pool)); g.lineTo(lx + pw, yv(R.pool)); g.stroke(); g.setLineDash([]); }
    const pts = []; let pv = R.bits.start; pts.push([sx(0), yv(pv)]);
    for (const [at, b] of s.emb) { if (at > t) break; pts.push([sx(at), yv(pv)], [sx(at), yv(b)]); pv = b; }
    pts.push([sx(t), yv(pv)]);
    g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.lineTo(sx(t), yv(0)); g.lineTo(sx(0), yv(0)); g.closePath();
    g.fillStyle = 'rgba(240,138,36,.22)'; g.fill();
    g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.strokeStyle = '#d4651a'; g.lineWidth = 3; g.stroke();
    // mana on the same lane, 0 to full
    const [my, mh] = L.mana, k0 = Math.floor(t0 * 10), k1 = Math.floor(t * 10);
    g.fillStyle = '#26301a'; g.fillRect(lx, my, pw, mh);
    g.beginPath(); g.moveTo(sx(k0 / 10), my + mh);
    for (let k = k0; k <= k1; k++) g.lineTo(sx(k / 10), my + mh - F.manaAt(k / 10) / R.mana.max * mh);
    g.lineTo(sx(k1 / 10), my + mh); g.closePath(); g.fillStyle = '#b5dc2e'; g.fill();
    s.gains.forEach(gn => { if (gn.at <= t && gn.kept < gn.n) { g.fillStyle = C.red; g.beginPath(); g.arc(sx(gn.at), yv(40) - 4, 4, 0, Math.PI * 2); g.fill(); } });
    // damage per hit
    const [dy, dh] = L.dmg, top = opt.scale || 320000;
    s.hits.forEach(hh => {
      if (hh.at > t) return; const x = sx(hh.at), hgt = Math.max(2, Math.min(1, hh.amt / top) * dh);
      g.fillStyle = SP[hh.k].col; g.globalAlpha = hh.tgt ? .55 : 1; g.fillRect(x - 3 + hh.tgt * 5, dy + dh - hgt, hh.k === 'tick' ? 4 : 7, hgt); g.globalAlpha = 1;
    });
    g.restore();
    // lane labels and the cap / pool labels outside the clip
    head(g, 'Casts', x0, cy + ch / 2, C.ink, 13); head(g, 'Embers', x0, ey + eh / 2, C.ink, 13); head(g, 'Damage', x0, dy + 14, C.ink, 13);
    txt(g, 'per hit', x0, dy + 30, C.muted, 11);
    [1, 2, 3, 4].forEach(e => txt(g, String(e), lx - 6, yv(e * 10), C.muted, 11, 'right', 600));
    head(g, 'Chaotic Energy', x0, L.mana[0] + L.mana[1] / 2, '#5f8a10', 12);
    if (o.pool) T.label('pool to 3.5', lx + pw - 40, yv(R.pool), 'center', C.redDk, 10);
    // playhead and time axis
    const ph = sx(t); g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.moveTo(ph, y0); g.lineTo(ph, y0 + h); g.stroke();
    for (let k = Math.ceil(t0 / 2) * 2; k <= t0 + WIN; k += 2) txt(g, `${k} s`, sx(k), y0 + h + 9, C.muted, 11, 'center', 600);
  }

  // damage and cast-time shares by spell: Chaos Bolt's slice of damage is far wider than its slice of time
  function shares(g, F, t, x0, y0, w) {
    const s = F.s, by = {}, tm = {};
    s.hits.forEach(h => { if (h.at <= t) by[h.k] = (by[h.k] || 0) + h.amt; });
    s.casts.forEach(c => { if (c.at > t || c.k === 'ds') return; const e = Math.min(t, c.end > c.at ? c.end : c.at + R.gcd); tm[c.k] = (tm[c.k] || 0) + Math.max(0, e - c.at); });
    const tot = Object.values(by).reduce((a, b) => a + b, 0), tt = Object.values(tm).reduce((a, b) => a + b, 0);
    const lx = x0 + 150, bw = w - 160;
    const row = (y, label, sub, map, total, keys) => {
      head(g, label, x0, y + 10, C.ink, 14); txt(g, sub, x0, y + 28, C.muted, 11);
      g.fillStyle = '#e9e1d2'; g.beginPath(); g.roundRect(lx, y, bw, 34, 7); g.fill();
      let x = lx;
      keys.forEach(k => {
        const v = map[k] || 0; if (!v || !total) return; const ww = v / total * bw;
        g.fillStyle = SP[k].col; g.fillRect(x, y, ww, 34);
        if (ww > 58) { ICON.draw(g, SP[k].icon, x + 15, y + 17, 20); txt(g, pct(v / total), x + 30, y + 17, '#fff', 13, 'left', 800); }
        else if (ww > 30) txt(g, pct(v / total), x + ww / 2, y + 17, '#fff', 11, 'center', 800);
        x += ww;
      });
    };
    row(y0, 'Share of Damage', tot ? `${k$(tot)} total` : '', by, tot, ORDER);
    row(y0 + 50, 'Share of Time', 'spent casting', tm, tt, ['cb', 'sb', 'inc', 'con', 'imm', 'hav']);
    return { by, tm, tot, tt };
  }

  /* ---------------- slide 1: the auto rotation ---------------- */
  const DUR = 60, SPEED = 2, HOLD = 3;
  const TOUR = { crit: R.crit, mastery: R.mastery, haste: R.haste, pool: true, ds: true, dsAt: 28, havoc: false, exec: false, breaks: [[52, 4]], dur: DUR, seed: 7 };
  let emberApi;
  canvasDemo('embers', (sl, cv, g) => {
    const st = { tour: true, t: 0, held: false, o: { ...TOUR }, F: null, cmp: null, key: '' };
    const tourBtn = $(sl, '.de-tour'), crit = $(sl, '.de-crit'), mast = $(sl, '.de-mast'), rg = $(sl, '.de-regen'), ds = $(sl, '.de-ds'), hav = $(sl, '.de-hav'), ex = $(sl, '.de-exec'), brk = $(sl, '.de-break');
    const seg = $$(sl, '.de-pool .btn');
    // the two spending styles compared as DPS over 12 seeded 5-minute fights each, so crit luck and the fight's last
    // few seconds don't decide it
    const LONG = 300, avg = o => { let d = 0; for (let k = 1; k <= 12; k++) d += run({ ...o, breaks: [], dur: LONG, seed: 100 + k }).s.dmg; return d / 12 / LONG; };
    function rebuild() {
      st.F = run(st.o); st.cmp = { pool: avg({ ...st.o, pool: true }), spend: avg({ ...st.o, pool: false }) };
      st.brk = st.o.breaks?.length ? { lost: run({ ...st.o, breaks: [] }).s.dmg - st.F.s.dmg, time: st.o.breaks.reduce((a, b) => a + b[1], 0) } : null;
      st.key = '';
    }
    function sync() {
      crit.value = Math.round(st.o.crit * 100); mast.value = st.o.mastery; ds.checked = st.o.ds; hav.checked = st.o.havoc; ex.checked = st.o.exec;
      seg.forEach(b => b.classList.toggle('on', (b.dataset.v === 'pool') === st.o.pool));
      $(sl, '.de-crit-v').textContent = `${Math.round(st.o.crit * 100)}%`;
      rg.value = Math.round((st.o.regen ?? 1) * 100);
      $(sl, '.de-regen-v').textContent = `${rg.value}%${+rg.value === 100 ? ' (5.4)' : ''}: ${Math.round(R.mana.mp5 / 5 * (1 + R.mana.ce) * (1 + st.o.haste) * (st.o.regen ?? 1) / 1000)}k Chaotic Energy per second`;
      $(sl, '.de-mast-v').textContent = `${st.o.mastery} pts: Chaos Bolt +${Math.round(R.mast.spender * st.o.mastery * 100)}%, fillers +${Math.round(R.mast.filler * st.o.mastery * 100)}%`;
    }
    const free = () => { if (st.tour) { st.tour = false; tourBtn.classList.remove('on'); st.o.breaks = []; st.t = 0; } };
    const change = f => () => { free(); f(); rebuild(); sync(); };
    crit.oninput = change(() => st.o.crit = crit.value / 100);
    mast.oninput = change(() => st.o.mastery = +mast.value);
    rg.oninput = change(() => st.o.regen = rg.value / 100);
    ds.onchange = change(() => st.o.ds = ds.checked);
    hav.onchange = change(() => st.o.havoc = hav.checked);
    ex.onchange = change(() => st.o.exec = ex.checked);
    seg.forEach(b => b.onclick = change(() => st.o.pool = b.dataset.v === 'pool'));
    brk.onclick = () => { free(); st.o.breaks = [...(st.o.breaks || []), [Math.round((st.t + .5) * 10) / 10, 4]]; rebuild(); };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; st.o = { ...TOUR }; tourBtn.classList.add('on'); rebuild(); sync(); };
    rebuild(); sync();

    function render() {
      const F = st.F, t = Math.min(st.t, DUR), s = F.s;
      T.use(g); g.clearRect(0, 0, W, H);
      panelBg(g, 0, 0, 470, 178); arena(g, F, t, 10, 10, 450, 158);
      panelBg(g, 482, 0, 558, 178); emberBar(g, F, t, 498, 8, 526);
      panelBg(g, 0, 188, W, 250); timeline(g, F, t, 12, 196, W - 20, 222);
      panelBg(g, 0, 448, W, 137);
      const sh = shares(g, F, t, 14, 460, W - 28);
      const cbN = s.casts.filter(c => (c.k === 'cb' || c.k === 'sb') && c.done && c.end <= t).length;
      const wasted = s.gains.reduce((a, gn) => a + (gn.at <= t ? gn.n - gn.kept : 0), 0);
      txt(g, `${k$(sh.tot / Math.max(1, t))} damage per second  ·  ${cbN} ember${cbN === 1 ? '' : 's'} spent  ·  ${wasted} bit${wasted === 1 ? '' : 's'} lost at the cap`, W / 2, 566, C.ink, 14, 'center', 700);
      // side panel text, refreshed when something changes
      const inDs = s.casts.some(c => c.k === 'ds' && c.at <= t && t < c.at + R.ds.dur);
      const inBrk = (st.o.breaks || []).some(([b, l]) => t >= b && t < b + l);
      const cur = s.casts.find(c => c.at <= t && c.end > t);
      const phase = t >= DUR ? 'end' : inBrk ? 'break' : inDs ? 'ds' : cur?.k === 'cb' ? 'cb' : st.o.exec ? 'exec' : 'build';
      const key = [phase, cbN, wasted, st.o.pool, st.o.ds, st.o.havoc, st.o.exec, st.o.crit, st.o.mastery].join();
      if (key === st.key) return; st.key = key;
      const cbShare = sh.tot ? ((sh.by.cb || 0) + (sh.by.sb || 0)) / sh.tot : 0, cbTime = sh.tt ? ((sh.tm.cb || 0) + (sh.tm.sb || 0)) / sh.tt : 0;
      say($(sl, '.de-stats'), `<div class="g"><b>${pct(cbShare)}</b><span>of damage from embers spent, in ${pct(cbTime)} of the casting time</span></div>`
        + `<div class="y"><b>${k$(st.cmp.pool)}</b><span>DPS pooling for Dark Soul, against ${k$(st.cmp.spend)} spending at once (5-minute average)</span></div>`
        + (st.brk && t >= DUR ? `<div class="r"><b>${pct(st.brk.lost / (st.brk.lost + s.dmg))}</b><span>of damage lost to ${st.brk.time} s of breaks (${pct(st.brk.time / DUR)} of the fight)</span></div>` : ''));
      const OUT = {
        build: 'Incinerate and Conflagrate add ember bits: 1 per hit, 2 on a crit, sometimes 1 bonus. Ten bits make an ember, and the bar holds four. Below it, mana: Chaotic Energy replaced Life Tap, so mana refills fast and the embers set the pace.',
        cb: st.o.pool ? 'Near the cap at 3.5 embers, one Chaos Bolt spends an ember so no bits are lost. It always crits, and your crit chance multiplies it again.' : 'Spending each ember the moment it fills: a Chaos Bolt every few casts, whatever else is happening.',
        ds: 'Dark Soul: +30% crit for 20 seconds. Fillers crit more, so embers come faster, and every Chaos Bolt hits harder. The banked embers are spent here.',
        break: 'A break: the warlock moves and casts nothing. Only the filler casts are lost. The banked embers wait, and the payoff happens after.',
        exec: 'Under 20% health, Shadowburn replaces Chaos Bolt: an instant ember spender.',
        end: `Embers turn a stream of small casts into a few big ones you choose when to fire. Over five minutes, pooling for Dark Soul and spending at once land within ${Math.max(1, Math.round(Math.abs(st.cmp.pool / st.cmp.spend - 1) * 100))}% of each other: the timing is the player’s choice, and either choice works.`,
      };
      say($(sl, '.de-out'), OUT[phase]);
    }
    emberApi = { seek(t) { st.held = st.tour = true; if (st.o.dsAt !== TOUR.dsAt || !st.o.pool) { st.o = { ...TOUR }; rebuild(); sync(); } st.t = Math.min(DUR, t * SPEED); render(); }, dur: () => DUR / SPEED + HOLD };
    return dt => {
      if (!st.held) st.t += Math.max(0, dt) * (st.tour ? SPEED : 1);
      if (st.t > DUR + HOLD * (st.tour ? SPEED : 1)) { st.t = 0; if (!st.tour) { st.o.breaks = []; rebuild(); } }
      render();
    };
  });

  /* ---------------- slide 2: play it yourself ---------------- */
  const KEYS = [['1', 'inc'], ['2', 'con'], ['3', 'imm'], ['4', 'cb'], ['5', 'sb'], ['6', 'ds']];
  const BOSS = 2.6e6;
  canvasDemo('play', (sl, cv, g) => {
    const base = () => ({ crit: R.crit, mastery: R.mastery, haste: R.haste, pool: true, ds: true, dsAt: 0, havoc: false, exec: false, hp: BOSS, breaks: [], seed: 11 });
    const st = { o: base(), F: null, err: null, errAt: -9, t: 0, started: false, ref: null, best: null, key: '' };
    try { st.best = +localStorage.getItem('mgm-destro-best') || null; } catch (e) { }
    const ghost = () => { const F = Fight({ ...st.o, dur: 180 }); F.advance(180, (s, FF) => s.kill != null ? null : apl(s, FF)); return F.s.kill; };
    function reset() { st.F = Fight(st.o); st.t = 0; st.started = false; st.err = null; st.ref = ghost(); st.key = ''; }
    reset();
    $(sl, '.dp-reset').onclick = reset;
    $(sl, '.dp-hav').onchange = e => { st.o.havoc = e.target.checked; reset(); };
    const press = k => {
      const F = st.F, w = F.why(k);
      if (k === 'hav' && !st.o.havoc) return;
      if (w) { st.err = w; st.errAt = st.t; return; }
      st.started = true; F.s.queue = k;
    };
    sl._key = e => {
      if (e.target.closest?.('input, textarea, select')) return;
      const m = KEYS.find(([key]) => key === e.key) || (e.key === '7' && st.o.havoc ? ['7', 'hav'] : null);
      if (m) { e.preventDefault(); press(m[1]); }
    };
    // the action bar is drawn on the canvas; clicks map back to buttons
    const bar = () => { const ks = st.o.havoc ? [...KEYS, ['7', 'hav']] : KEYS; return ks.map(([key, k], i) => ({ key, k, x: 500 + i * 76, y: 520 })); };
    cv.addEventListener('pointerdown', e => {
      const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H;
      const b = bar().find(b => Math.abs(x - b.x) < 30 && Math.abs(y - b.y) < 30); if (b) press(b.k);
    });
    const decide = s => { const k = s.queue; if (!k) return null; if (st.F.why(k)) { s.queue = null; return null; } if (k === 'ds' || s.t >= s.gcd - 1e-9) { s.queue = null; return k; } return null; };
    function render() {
      const F = st.F, s = F.s, t = st.t;
      T.use(g); g.clearRect(0, 0, W, H);
      panelBg(g, 0, 0, 470, 178); arena(g, F, t, 10, 10, 450, 158);
      panelBg(g, 482, 0, 558, 178); emberBar(g, F, t, 498, 8, 526);
      panelBg(g, 0, 188, W, 250); timeline(g, F, t, 12, 196, W - 20, 222);
      panelBg(g, 0, 448, W, 137);
      bar().forEach(b => {
        const w = F.why(b.k), gcd = b.k !== 'ds' && t < s.gcd && !s.cast;
        ICON.draw(g, SP[b.k].icon, b.x, b.y, 50, w ? .35 : 1, s.queue === b.k ? C.gold : '#152044');
        if (gcd || s.cast) { g.fillStyle = 'rgba(21,32,68,.35)'; g.fillRect(b.x - 25, b.y - 25, 50, 50); }
        T.label(b.key, b.x - 18, b.y - 18, 'center', '#fff', 12, C.navy);
        txt(g, SP[b.k].name, b.x, b.y + 38, w ? C.muted : C.ink, 11, 'center', 700);
        if (b.k === 'con') txt(g, `${s.conCh}`, b.x + 18, b.y + 18, '#fff', 14, 'center', 800);
        if (b.k === 'cb' || b.k === 'sb') txt(g, '1 ember', b.x, b.y - 33, C.goldInk, 11, 'center', 700);
      });
      const left = Math.max(0, BOSS - s.main);
      head(g, s.kill != null ? `Down in ${s.kill.toFixed(1)} s` : st.started ? `${t.toFixed(1)} s` : 'Press a key to start', 14, 474, s.kill != null ? C.good : C.ink, 18);
      txt(g, `Training dummy: ${k$(left)} of ${k$(BOSS)} HP`, 14, 500, C.ink, 13, 'left', 600);
      txt(g, `Under 20% (${k$(BOSS * .2)}), Shadowburn unlocks`, 14, 518, C.muted, 12);
      if (st.ref) txt(g, `SimC priority list: ${st.ref.toFixed(1)} s`, 14, 540, C.muted, 12, 'left', 700);
      if (st.best) txt(g, `Your fastest: ${st.best.toFixed(1)} s`, 14, 558, C.goldInk, 12, 'left', 700);
      if (st.err && t - st.errAt < 1.6) T.label(st.err, 650, 466, 'center', '#fff', 13, C.redDk);
      const key = [s.kill != null, Math.round(s.dmg / 1e5)].join(); if (key === st.key) return; st.key = key;
      say($(sl, '.dp-out'), s.kill != null
        ? `Down in ${s.kill.toFixed(1)} s, against ${st.ref.toFixed(1)} s for the SimulationCraft priority list. ${((s.by.cb || 0) + (s.by.sb || 0)) / s.dmg > .4 ? 'Most of it came from the embers you spent.' : 'Spend more embers: Chaos Bolt is where the damage is.'}`
        : 'Build with 1 Incinerate and 2 Conflagrate, keep 3 Immolate up, then spend embers on 4 Chaos Bolt. 6 Dark Soul raises your crit for 20 s: bank embers for it.');
    }
    return dt => {
      if (st.started && st.F.s.kill == null) { st.t += Math.max(0, Math.min(dt, .1)); st.F.advance(st.t, decide); }
      if (st.F.s.kill != null && (!st.best || st.F.s.kill < st.best)) { st.best = st.F.s.kill; try { localStorage.setItem('mgm-destro-best', st.best.toFixed(1)); } catch (e) { } }
      render();
    };
  }, {
    enter(s) { s._k = e => s._key(e); addEventListener('keydown', s._k); },
    leave(s) { removeEventListener('keydown', s._k); },
  });

  window.DESTRO = { R, Fight, apl, run };
  window.__seek = (t, w) => emberApi.seek(t);
  window.__dur = w => emberApi.dur();
})();
