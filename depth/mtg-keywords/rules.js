/* MTG keyword combat rules (MGM C4 M1, deck slides 193-194). One attacker, one possible blocker, the slide's nine
   keywords plus Reach (named on the Flying line). resolve() is a small, honest slice of Magic's combat rules: summoning
   sickness and Haste, Flash to block from hand, evasion (Flying / Reach, Menace against a single blocker), first-strike
   and regular damage steps, Deathtouch, Indestructible, Trample with lethal-damage assignment, and Vigilance. */
(function (root) {
  const KW = ['Deathtouch', 'First Strike', 'Vigilance', 'Menace', 'Flying', 'Haste', 'Flash', 'Indestructible', 'Trample', 'Reach'];
  const TEXT = {
    Deathtouch: 'Any damage it deals to a creature is lethal.',
    'First Strike': 'Deals combat damage before creatures without it.',
    Vigilance: 'Attacking doesn’t tap it, so it can still block.',
    Menace: 'Can only be blocked by two or more creatures.',
    Flying: 'Can only be blocked by creatures with Flying or Reach.',
    Haste: 'Can attack the turn it is played.',
    Flash: 'Can be played on the other player’s turn.',
    Indestructible: 'Damage doesn’t destroy it.',
    Trample: 'Damage beyond lethal to its blocker hits the player.',
    Reach: 'Can block creatures with Flying.',
  };
  // a, b: { p, t, kw: Set }   o: { sick: attacker played this turn, inHand: blocker still in hand }
  function resolve(a, b, o = {}) {
    const A = k => a.kw.has(k), B = k => b.kw.has(k);
    const r = { attacks: true, blocked: false, why: '', steps: [], aDies: false, bDies: false, toPlayer: 0, tapped: !A('Vigilance') };
    if (o.sick && !A('Haste')) { r.attacks = false; r.tapped = false; r.why = 'It was played this turn and has no Haste, so it can’t attack yet.'; return r; }
    const ready = !o.inHand || B('Flash');
    if (!ready) r.why = 'The blocker is still in hand and has no Flash, so it can’t be played in time to block.';
    else if (A('Flying') && !B('Flying') && !B('Reach')) r.why = 'Flying: only a creature with Flying or Reach can block it.';
    else if (A('Menace')) r.why = 'Menace: it needs two blockers, and there is only one.';
    else r.blocked = true;
    if (!r.blocked) { r.toPlayer = a.p; r.steps.push({ step: 'regular', from: 'a', to: 'player', dmg: a.p }); return r; }
    const dmgB = { n: 0, dt: false }, dmgA = { n: 0, dt: false };
    const lethal = (c, d, isB) => !(isB ? B : A)('Indestructible') && d.n > 0 && (d.n >= c.t || d.dt);
    const hitB = () => {   // attacker assigns damage: lethal to the blocker first, the rest tramples over
      const need = A('Deathtouch') ? 1 : Math.max(0, b.t);
      const toB = A('Trample') ? Math.min(a.p, need) : a.p, over = a.p - toB;
      dmgB.n += toB; dmgB.dt = dmgB.dt || A('Deathtouch');
      r.steps.push({ from: 'a', to: 'b', dmg: toB }); if (over > 0) { r.toPlayer += over; r.steps.push({ from: 'a', to: 'player', dmg: over }); }
    };
    const hitA = () => { dmgA.n += b.p; dmgA.dt = dmgA.dt || B('Deathtouch'); r.steps.push({ from: 'b', to: 'a', dmg: b.p }); };
    const fa = A('First Strike'), fb = B('First Strike');
    if (fa !== fb) {
      if (fa) hitB(); else hitA();
      r.steps.forEach(s => s.step = 'first');
      r.aDies = lethal(a, dmgA, false); r.bDies = lethal(b, dmgB, true);
      const n = r.steps.length;
      if (fa && !r.bDies) hitA();
      if (fb && !r.aDies) hitB();
      r.steps.slice(n).forEach(s => s.step = 'regular');
    } else { hitB(); hitA(); r.steps.forEach(s => s.step = fa ? 'first' : 'regular'); }
    r.aDies = lethal(a, dmgA, false); r.bDies = lethal(b, dmgB, true);
    return r;
  }
  const api = { KW, TEXT, resolve };
  if (typeof module !== 'undefined') module.exports = api; else root.MTG = api;
})(this);
