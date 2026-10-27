/* Positioning, pressure and payoffs (MGM course 4, module 4, deck slides 299 to 304): the slide demos.
   One model (plan) works out every exchange, so the side-on line, the top-down arena, the power card
   and the comparison table can never disagree. Distances are in meters, centre to centre;
   a power's pressure is how far it threatens from where you stand: step + reach. */
(function () {
  const { $, $$, canvasDemo, demo, say, ptr, store } = FPF.kit;
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  const lerp = (a, b, t) => a + (b - a) * t;
  const fmt = n => String(Math.round(n * 10) / 10);

  /* ---------- Forsaken ability token art (Design/Abilities/images) ---------- */
  const IMG = '../assets/img/forsaken/';
  const ART = {};
  ['Token_Player1', 'Token_Player3', 'Monster', 'Spear', 'Sword', 'Rect_Friendly', 'Swoosh_Friendly', 'Hit_Friendly', 'Hit_Hostile', 'Dizzy_Swirl', 'Zap_Friendly']
    .forEach(n => { const i = new Image(); i.src = IMG + n + '.png'; ART[n] = i; });
  const ready = i => i && i.complete && i.naturalWidth;

  /* ---------- the rules ---------- */
  // kind picks the hitbox drawing; len is the held weapon's length in token radii.
  // The spear is deck slide 304; the fist and sword payoffs are illustrative.
  const WEAPONS = {
    fist: { name: 'Uppercut', weapon: 'Fists', icon: '👊', kind: 'upper', step: 5, reach: 2, wind: .16, act: .12, rec: .55, dmg: 60, stun: 10, poise: -20, anim: 'Axe Undercut', animNote: 'No uppercut mockup exists: this is the closest, Axe Undercut.' },
    sword: { name: 'Sword Thrust', weapon: 'Sword', img: 'Sword', len: 1.9, kind: 'thrust', step: 1.5, reach: 3.5, wind: .18, act: .1, rec: .35, dmg: 70, stun: 5, poise: -10, anim: 'Sword Thrust', animNote: 'Forsaken mockup: Sword Thrust.' },
    spear: { name: 'Shocking Spear Thrust', weapon: 'Spear', img: 'Spear', len: 2.8, kind: 'thrust', step: 2, reach: 8, wind: .32, act: .14, rec: .6, dmg: 100, stun: 25, poise: -5, anim: 'Spear Thrust', animNote: 'Forsaken mockup: Spear Thrust.' },
  };
  const DEFAULTS = JSON.parse(JSON.stringify(WEAPONS));
  const ENEMY = { name: 'Claw swipe', kind: 'claw', step: 2, reach: 4, wind: .28, act: .1, rec: .4, dmg: 80, stun: 0, poise: 0 };
  const pressure = w => w.step + w.reach;
  const GAP = 1;      // bodies stop this close, centre to centre
  const DAZE = 20;    // a hit with this much stun stops the target answering in this exchange
  const SHIFT = { stand: 0, back: 1.5, in: -2 };   // what the enemy does during your wind-up

  // shared across slides
  const S = { w: store.get('mgm-payoffs:w', 'fist'), pc0: -5, en0: 5, enemy: 'stand' };
  if (!WEAPONS[S.w]) S.w = 'fist';
  const listeners = [];
  const changed = () => listeners.forEach(f => f());

  function plan(w = WEAPONS[S.w], pc0 = S.pc0, en0 = S.en0, mode = S.enemy) {
    const P = pressure(w), EP = pressure(ENEMY), eps = 1e-6;
    const en1 = Math.max(pc0 + GAP, en0 + SHIFT[mode]);   // where they are when your strike comes out
    const dS = en1 - pc0;
    const step = Math.min(w.step, Math.max(0, dS - GAP));
    const pc1 = pc0 + step, d1 = en1 - pc1;
    const hit = d1 <= w.reach + eps;
    const dazed = hit && w.stun >= DAZE;
    const theyReach = d1 <= EP + eps;
    const punish = theyReach && !hit;            // a whiff that left you inside their pressure
    const trade = theyReach && hit && !dazed;    // you hit, but not hard enough to stop the answer
    const follow = d1 <= P + eps;
    const en2 = en1 - Math.min(ENEMY.step, Math.max(0, d1 - GAP));
    const pc2 = pc1 + Math.min(w.step, Math.max(0, d1 - GAP));
    return { w, P, EP, d0: en0 - pc0, pc0, en0, en1, mode, dS, step, pc1, d1, hit, dazed, theyReach, punish, trade, follow, en2, pc2 };
  }
  const payText = w => [`${w.dmg} dmg`, w.stun && `${w.stun} stun`, w.poise && `${w.poise} poise`].filter(Boolean).join(' · ');

  /* ---------- the exchange, as frames ---------- */
  // beat 0 neutral, 1 your swing, 2 their answer (301), 3 your follow-up (302); 2 and 3 both start where 1 ended
  const DIR = { pc: 1, en: -1 }, OTHER = { pc: 'en', en: 'pc' };
  const LEAD = .45;   // the "!!!" beat before an answer
  function beatLen(p, beat) {
    if (beat === 0) return 0;
    if (beat === 1) return p.w.wind + p.w.act + 1.4;
    const a = beat === 2 ? (p.punish || p.trade) && ENEMY : p.follow && p.w;
    return a ? LEAD + a.wind + a.act + 1.4 : 1.2;
  }
  function swing(F, who, w, x0, x1, hit, t, foeX) {
    const me = F[who], back = DIR[who] * .25;
    if (t < 0) return;
    if (t < w.wind) { me.x = x0 - back * ease(t / w.wind); me.wind = t / w.wind; return; }
    if (t < w.wind + w.act) { const u = (t - w.wind) / w.act; me.x = lerp(x0 - back, x1, ease(u)); F.strikes.push({ who, w, ext: ease(u), a: 1 }); return; }
    const k = t - w.wind - w.act;
    me.x = x1;
    if (k < .6) F.strikes.push({ who, w, ext: 1, a: 1 - k / .6 });
    if (k < w.rec) me.rec = 1 - k / w.rec;
    const foe = F[OTHER[who]];
    if (hit) {
      foe.hit = true;
      if (k < .6) F.fx.push({ img: who === 'pc' ? 'Hit_Friendly' : 'Hit_Hostile', x: foeX, a: 1 - k / .6, s: 1 + k });
      if (k < .25) foe.flash = 1 - k / .25;
      if (w.stun >= DAZE) foe.dazed = true;
    }
    if (k < 1.6) F.floats.push({ who: OTHER[who], text: hit ? payText(w) : 'whiff', good: who === 'pc' ? hit : !hit, k });
  }
  function frame(p, beat, t) {
    const w = p.w;
    const F = { pc: { x: p.pc0 }, en: { x: p.en0 }, strikes: [], fx: [], marks: [], rings: [], floats: [], gap: null };
    if (beat === 0) return F;
    if (beat === 1) {
      F.en.x = lerp(p.en0, p.en1, ease(t / w.wind));
      swing(F, 'pc', w, p.pc0, p.pc1, p.hit, t, p.en1);
      return F;
    }
    F.pc.x = p.pc1; F.en.x = p.en1; F.en.dazed = p.dazed;
    const fade = ease(t / .3);
    if (beat === 2) {
      F.rings.push({ who: 'en', r: p.EP, a: fade });
      if (p.punish || p.trade) {
        if (t < LEAD + ENEMY.wind + ENEMY.act) F.marks.push({ who: 'pc', a: 1 });
        if (p.punish) F.pc.rec = clamp(1 - t / (w.rec + .3), 0, 1);
        swing(F, 'en', ENEMY, p.en1, p.en2, true, t - LEAD, p.pc1);
      } else if (!p.theyReach) F.gap = { who: 'en', r: p.EP, a: fade };
      return F;
    }
    F.rings.push({ who: 'pc', r: p.P, a: fade });
    if (p.follow) {
      if (t < LEAD + w.wind + w.act) F.marks.push({ who: 'en', a: 1 });
      swing(F, 'pc', w, p.pc1, p.pc2, true, t - LEAD, p.en1);
    } else F.gap = { who: 'pc', r: p.P, a: fade };
    return F;
  }

  // what each beat means, from the PC's side
  function words(p, beat) {
    const w = p.w, n = w.name;
    if (beat === 0) {
      const at = p.pc0 === -5 && p.en0 === 5 ? 'Both of you are exactly 5 m from the centre point. ' : `You’re ${fmt(p.d0)} m apart. `;
      return at + `Your ${n} threatens <b>${fmt(p.P)} m</b> (${fmt(w.step)} m step + ${fmt(w.reach)} m reach); their claw threatens <b>${fmt(p.EP)} m</b>. `
        + (p.d0 <= p.P ? '<b class="good">They’re already under your pressure.</b>' : p.d0 <= p.EP ? '<b class="bad">You’re already under theirs.</b>' : 'Nobody can reach anybody: this is neutral.');
    }
    if (beat === 1) {
      const pre = p.mode === 'back' ? 'They back off 1.5 m as you swing. ' : p.mode === 'in' ? 'They step in as you swing. ' : '';
      if (p.hit) return pre + `<b class="good">It lands</b>: ${payText(w)}${p.dazed ? ', and the shock dazes them' : ''}. You also moved ${fmt(p.step)} m forward.`;
      return pre + `At ${fmt(p.dS)} m it’s out of range: <b>a whiff</b>, right? Not quite. There’s a side effect: you’ve stepped ${fmt(p.step)} m towards them${p.step < 2 ? ', which isn’t much' : ''}. That’s a positioning payoff.`;
    }
    if (beat === 2) {
      if (p.punish) return `<b class="bad">!!! Their opening.</b> You’re ${fmt(p.d1)} m away, inside their ${fmt(p.EP)} m, and stuck in ${w.rec} s of recovery. They punish you for ${ENEMY.dmg}.`;
      if (p.trade) return `<b class="bad">!!! They can answer.</b> You hit first, but ${w.stun} stun doesn’t stop them and you’re inside their ${fmt(p.EP)} m: it’s a trade.`;
      if (p.dazed && p.theyReach) return `You’re inside their ${fmt(p.EP)} m, but ${w.stun} stun has them dazed: <b class="good">no opening</b>.`;
      return `<b class="good">No opening for them.</b> At ${fmt(p.d1)} m you’re ${fmt(p.d1 - p.EP)} m outside their reach${p.hit ? '' : ', even though you whiffed'}.`
        + (p.follow ? ` To answer, they have to walk through your ${fmt(p.P)} m of pressure.` : '');
    }
    if (p.follow) return `<b class="good">!!! Your payoff.</b> At ${fmt(p.d1)} m they’re inside your ${fmt(p.P)} m, so a second ${n.toLowerCase()} reaches${p.punish ? ', if they didn’t take their opening first' : ''}.`;
    return `No follow-up: at ${fmt(p.d1)} m they’re ${fmt(p.d1 - p.P)} m outside your ${fmt(p.P)} m. You’d have to walk in${p.theyReach ? ', and you’re already inside their range' : ''}.`;
  }

  /* ---------- drawing ---------- */
  // a view maps meters onto the canvas: side-on along x, or top-down along -y; mirror swaps who sits where
  function view(o) {
    const v = { mirror: false, ...o };
    v.sg = () => (v.mirror ? -1 : 1);
    v.at = m => [v.ox + v.dir[0] * m * v.px * v.sg(), v.oy + v.dir[1] * m * v.px * v.sg()];
    v.face = who => { const s = DIR[who] * v.sg(); return [v.dir[0] * s, v.dir[1] * s]; };
    return v;
  }
  function panel(g, v, col) {
    g.save(); g.fillStyle = col; g.strokeStyle = '#3b3b3b'; g.lineWidth = 2;
    g.beginPath(); g.roundRect(v.x, v.y, v.w, v.h, 10); g.fill(); g.stroke(); g.restore();
  }
  function text(g, s, x, y, { col = '#1c2a44', size = 18, weight = 600, align = 'center' } = {}) {
    g.font = `${weight} ${size}px Jost, sans-serif`; g.fillStyle = col; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(s, x, y);
  }
  function axis(g, v) {
    const [x0, y0] = v.at(-7.5), [x1, y1] = v.at(7.5);
    g.save(); g.strokeStyle = '#2a2a2a'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    for (let m = -7; m <= 7; m++) {
      const [x, y] = v.at(m), big = m % 5 === 0, L = big ? 14 : 8;
      g.lineWidth = big ? 2.5 : 1.5; g.beginPath();
      if (v.dir[0]) { g.moveTo(x, y - L); g.lineTo(x, y + L); } else { g.moveTo(x - L, y); g.lineTo(x + L, y); }
      g.stroke();
      if (big && v.labels) text(g, String(m * v.sg()), x + (v.dir[0] ? 0 : 30), y + (v.dir[0] ? (v.side ? 60 : 40) : 0), { size: v.side ? 26 : 16, col: '#333' });
    }
    g.restore();
  }
  function ring(g, v, x, r, col, a) {
    if (a <= 0) return;
    const [cx, cy] = v.at(x);
    g.save(); g.beginPath(); g.rect(v.x, v.y, v.w, v.h); g.clip();
    g.globalAlpha = a; g.fillStyle = col + '14'; g.strokeStyle = col; g.lineWidth = 2.5; g.setLineDash([10, 8]);
    g.beginPath(); g.arc(cx, cy, r * v.px, 0, TAU); g.fill(); g.stroke(); g.restore();
  }
  // the reach band along the line: where this power threatens
  function band(g, v, who, x, r, col, a) {
    if (a <= 0) return;
    const [x0, y0] = v.at(x), [x1, y1] = v.at(x + DIR[who] * r);
    g.save(); g.globalAlpha = a * .5; g.strokeStyle = col; g.lineWidth = 12; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); g.restore();
  }
  function strike(g, v, F, s) {
    const me = F[s.who], [cx, cy] = v.at(me.x), [fx, fy] = v.face(s.who), ang = Math.atan2(fy, fx), L = s.w.reach * v.px * s.ext;
    g.save(); g.translate(cx, cy); g.rotate(ang); g.globalAlpha = s.a;
    if (s.w.kind === 'thrust') {
      const wd = v.tr * (s.w === WEAPONS.spear ? .7 : .9);
      if (ready(ART.Rect_Friendly)) { g.globalAlpha = s.a * .8; g.translate(0, 0); g.rotate(Math.PI / 2); g.drawImage(ART.Rect_Friendly, -wd / 2, -L, wd, L); }
      if (s.w === WEAPONS.spear && s.ext > .6 && ready(ART.Zap_Friendly)) { g.rotate(0); g.drawImage(ART.Zap_Friendly, -v.tr * .5, -L - v.tr * .4, v.tr, v.tr * 1.6); }
    } else {
      const col = s.w.kind === 'claw' ? 'rgba(220,60,70,' : 'rgba(80,200,220,';
      const half = s.w.kind === 'claw' ? .85 : .6;
      const gr = g.createRadialGradient(0, 0, v.tr * .6, 0, 0, Math.max(L, v.tr));
      gr.addColorStop(0, col + '0.05)'); gr.addColorStop(1, col + '0.75)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, Math.max(L, v.tr), -half, half); g.closePath(); g.fill();
      if (s.w.kind === 'upper' && ready(ART.Swoosh_Friendly)) { g.rotate(Math.PI / 2); g.drawImage(ART.Swoosh_Friendly, -v.tr * .4, -L, v.tr * .9, L * .9); }
    }
    g.restore();
  }
  function held(g, v, F, w, who) {
    const me = F[who], [cx, cy] = v.at(me.x), [fx, fy] = v.face(who), r = v.tr;
    const st = F.strikes.find(s => s.who === who && s.a === 1);
    g.save(); g.translate(cx, cy); g.rotate(Math.atan2(fy, fx) + Math.PI / 2);
    if (w.img && ready(ART[w.img])) {
      const len = r * w.len, wd = len * ART[w.img].naturalWidth / ART[w.img].naturalHeight;
      const tip = Math.max(r * .4 + len, st ? w.reach * v.px * st.ext : 0) - (me.wind ? me.wind * r * .3 : 0);
      g.drawImage(ART[w.img], r * .55 - wd / 2, -tip, wd, len);
    } else if (w.icon) {
      const lift = st ? Math.min(w.reach * v.px * st.ext, r * 1.6) : 0;
      g.font = `${r * 1.1}px serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(w.icon, r * .7, -r * 1.05 - lift);
    }
    g.restore();
  }
  function token(g, v, F, who, name) {
    const me = F[who], [x, y] = v.at(me.x), r = v.tr, [fx, fy] = v.face(who);
    if (who === 'pc') {
      const img = ART[me.hit ? 'Token_Player3' : 'Token_Player1'];
      g.save(); g.translate(x, y); g.rotate(Math.atan2(fy, fx) + Math.PI / 2);
      if (ready(img)) g.drawImage(img, -r, -r, 2 * r, 2 * r); else { g.fillStyle = '#2aa4e0'; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill(); }
      g.restore();
    } else if (ready(ART.Monster)) g.drawImage(ART.Monster, x - r, y - r, 2 * r, 2 * r);
    if (me.flash) { g.save(); g.globalAlpha = me.flash * .7; g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.restore(); }
    if (me.dazed && ready(ART.Dizzy_Swirl)) { g.save(); g.translate(x, y - r * 1.5); g.rotate(performance.now() / 300); g.globalAlpha = .8; g.drawImage(ART.Dizzy_Swirl, -r * .5, -r * .55, r, r * 1.1); g.restore(); }
    const ly = v.side ? y - r - 22 : y + (who === 'pc' ^ v.mirror ? r + 16 : -r - 16);
    text(g, name, x, v.side ? y + r + 52 : ly, { size: v.side ? 24 : 15, col: who === 'pc' ? '#1d5fa8' : '#a3262f', weight: 700 });
    if (me.rec > 0) {
      const bw = r * 2, by = v.side ? y - r - 16 : y + r + (v.mirror ^ who === 'pc' ? 28 : -28);
      g.save(); g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(x - bw / 2, by, bw, 6); g.fillStyle = '#d07a1c'; g.fillRect(x - bw / 2, by, bw * me.rec, 6); g.restore();
      if (v.side) text(g, 'recovering', x, by - 14, { size: 16, col: '#b5651d' });
    }
  }
  function marks(g, v, F) {
    F.marks.forEach(m => {
      const [x, y] = v.at(F[m.who].x), pulse = 1 + .12 * Math.sin(performance.now() / 70);
      text(g, '!!!', x, y - v.tr - (v.side ? 52 : 26), { size: (v.side ? 34 : 22) * pulse, col: '#d1202f', weight: 800 });
    });
  }
  function floats(g, v, F) {
    F.floats.forEach(f => {
      const [x, y] = v.at(F[f.who].x), a = clamp(1.6 - f.k, 0, 1) * clamp(f.k / .12, 0, 1);
      g.save(); g.globalAlpha = a;
      text(g, f.text, x, y - v.tr - (v.side ? 90 : 40) - f.k * 18, { size: v.side ? 24 : 14, col: f.text === 'whiff' ? '#555' : f.who === 'en' ? '#1f8a4f' : '#c0392b', weight: 700 });
      g.restore();
    });
  }
  function gapMark(g, v, F) {
    const gp = F.gap; if (!gp) return;
    const from = F[gp.who].x, end = from + DIR[gp.who] * gp.r, to = F[OTHER[gp.who]].x;
    const [x0, y0] = v.at(end), [x1, y1] = v.at(to - DIR[gp.who] * 0.0);
    const off = v.side ? -70 : 0, offx = v.side ? 0 : 34;
    g.save(); g.globalAlpha = gp.a; g.strokeStyle = '#555'; g.lineWidth = 2; g.setLineDash([5, 5]);
    g.beginPath(); g.moveTo(x0 + offx, y0 + off); g.lineTo(x1 + offx, y1 + off); g.stroke(); g.setLineDash([]);
    text(g, `${fmt(Math.abs(to - end))} m short`, (x0 + x1) / 2 + offx * 2.2, (y0 + y1) / 2 + off - (v.side ? 18 : 0), { size: v.side ? 20 : 13, col: '#444' });
    g.restore();
  }
  function bracket(g, v, F) {
    if (!v.side) return;
    const [x0, y] = v.at(F.pc.x), [x1] = v.at(F.en.x), yb = y + 122;
    g.save(); g.strokeStyle = '#6b6b6b'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(x0, yb - 8); g.lineTo(x0, yb); g.lineTo(x1, yb); g.lineTo(x1, yb - 8); g.stroke(); g.restore();
    text(g, `${fmt(Math.abs(F.en.x - F.pc.x))} m apart`, (x0 + x1) / 2, yb + 16, { size: 18, col: '#555', weight: 500 });
  }
  function scene(g, v, p, F, names = ['PC', 'Enemy']) {
    panel(g, v, v.side ? '#e9e5dd' : '#e6e6e6');
    g.save(); g.beginPath(); g.rect(v.x, v.y, v.w, v.h); g.clip();
    if (v.lane) {   // the deck's top-down panel shows the thrust's lane in cyan
      const [x0, y0] = v.at(F.pc.x), [x1, y1] = v.at(F.pc.x + p.P);
      g.save(); g.globalAlpha = .18; g.fillStyle = '#29b6d6'; g.fillRect(Math.min(x0, x1) - v.tr * 1.1, Math.min(y0, y1), v.tr * 2.2, Math.abs(y1 - y0)); g.restore();
    }
    axis(g, v);
    F.rings.forEach(r => { ring(g, v, F[r.who].x, r.r, r.who === 'pc' ? '#2f9e5b' : '#d1202f', r.a); band(g, v, r.who, F[r.who].x, r.r, r.who === 'pc' ? '#2f9e5b' : '#d1202f', r.a); });
    gapMark(g, v, F);
    F.strikes.forEach(s => strike(g, v, F, s));
    token(g, v, F, 'en', names[1]);
    token(g, v, F, 'pc', names[0]);
    held(g, v, F, p.w, 'pc');
    F.fx.forEach(f => { const [x, y] = v.at(f.x); g.save(); g.globalAlpha = f.a; const r = v.tr * 1.3 * f.s; if (ready(ART[f.img])) g.drawImage(ART[f.img], x - r, y - r, 2 * r, 2 * r); g.restore(); });
    marks(g, v, F); floats(g, v, F); bracket(g, v, F);
    g.restore();
  }

  /* ---------- weapon pickers: every .wpick on every slide stays in sync ---------- */
  function pickers(s, onPick) {
    $$(s, '.wpick').forEach(box => {
      box.innerHTML = Object.entries(WEAPONS).map(([k, w]) =>
        `<button class="btn" data-w="${k}">${w.img ? `<img src="${IMG}${w.img}.png" alt="">` : w.icon + ' '}${w.weapon}</button>`).join('');
      $$(box, '[data-w]').forEach(b => b.onclick = () => { S.w = b.dataset.w; store.set('mgm-payoffs:w', S.w); changed(); });
    });
    const sync = () => { $$(s, '[data-w]').forEach(b => b.classList.toggle('on', b.dataset.w === S.w)); onPick?.(); };
    listeners.push(sync); sync();
  }

  /* ================= 299 to 302: positioning payoffs, side-on ================= */
  canvasDemo('line', (s, c, g) => {
    const W = c.width, H = c.height, out = $(s, '.ln-out');
    const v = view({ x: 6, y: 6, w: W - 12, h: H - 12, ox: W / 2, oy: 250, dir: [1, 0], px: 86, tr: 40, side: true, labels: true });
    const markers = $$(s, '.beat-mark'), btns = $$(s, '[data-beat]');
    let beat = 0, t = 0, slow = false, p = plan(), drag = false;
    const setBeat = b => {
      beat = b; t = 0; p = plan();
      markers.forEach((m, j) => m.classList.toggle('shown', j < b));
      btns.forEach(x => x.classList.toggle('on', +x.dataset.beat === b));
      say(out, words(p, b));
    };
    new MutationObserver(() => { const b = markers.filter(m => m.classList.contains('shown')).length; if (b !== beat) setBeat(b); })
      .observe(s, { subtree: true, attributes: true, attributeFilter: ['class'] });
    btns.forEach(b => b.onclick = () => setBeat(+b.dataset.beat));
    $(s, '.ln-replay').onclick = () => setBeat(beat);
    $(s, '.ln-slow').onclick = e => { slow = !slow; e.currentTarget.classList.toggle('on', slow); };
    $$(s, '[data-en]').forEach(b => b.onclick = () => {
      S.enemy = b.dataset.en; $$(s, '[data-en]').forEach(x => x.classList.toggle('on', x === b)); changed();
    });
    pickers(s, () => setBeat(beat));
    listeners.push(() => { if (!drag) setBeat(beat); });
    // drag your token to change the starting distance
    const toM = e => (ptr(c, e).x - v.ox) / v.px;
    c.onpointerdown = e => {
      const q = ptr(c, e), [x, y] = v.at(frame(p, beat, t).pc.x);
      if (Math.hypot(q.x - x, q.y - y) > v.tr * 1.6) return;
      drag = true; c.setPointerCapture(e.pointerId); c.style.cursor = 'grabbing';
    };
    c.onpointermove = e => {
      const [x, y] = v.at(frame(p, beat, t).pc.x), q = ptr(c, e);
      if (!drag) { c.style.cursor = Math.hypot(q.x - x, q.y - y) < v.tr * 1.6 ? 'grab' : 'default'; return; }
      const m = clamp(Math.round(toM(e) * 2) / 2, -7.5, S.en0 - 1.5);
      if (m !== S.pc0) { S.pc0 = m; setBeat(0); changed(); }
    };
    c.onpointerup = () => { drag = false; c.style.cursor = 'grab'; };
    setBeat(0);
    return dt => {
      t += dt * (slow ? .25 : 1);
      const len = beatLen(p, beat);
      g.clearRect(0, 0, W, H);
      scene(g, v, p, frame(p, beat, Math.min(t, len)));
      if (beat === 0) {   // neutral: show both pressures faintly so the ranges are readable before anything happens
        const F = frame(p, 0, 0);
        band(g, v, 'pc', F.pc.x, p.P, '#2f9e5b', .5); band(g, v, 'en', F.en.x, p.EP, '#d1202f', .5);
        text(g, `your pressure ${fmt(p.P)} m`, v.at(F.pc.x + Math.min(p.P, 14.5 - p.P * 0) / 2)[0], v.oy - 24, { size: 17, col: '#2f7a4b' });
        text(g, `their pressure ${fmt(p.EP)} m`, v.at(F.en.x - p.EP / 2)[0], v.oy + 24, { size: 17, col: '#a3262f' });
      }
    };
  });

  /* ================= 303: the same exchange, side-on and top-down ================= */
  canvasDemo('views', (s, c, g) => {
    const W = c.width, H = c.height, out = $(s, '.vw-out');
    const side = view({ x: 6, y: 6, w: 900, h: H - 12, ox: 456, oy: 270, dir: [1, 0], px: 54, tr: 30, side: true, labels: true });
    const top = view({ x: 940, y: 6, w: W - 946, h: H - 12, ox: 940 + (W - 946) / 2, oy: H / 2, dir: [0, -1], px: 28, tr: 20, lane: true, labels: true });
    const SEQ = [0, 1, 2, 0, 1, 3];
    let i = 0, t = 0, as = 'pc', paused = false, p = plan();
    const restart = () => { p = plan(); t = 0; };
    $$(s, '[data-as]').forEach(b => b.onclick = () => { as = b.dataset.as; $$(s, '[data-as]').forEach(x => x.classList.toggle('on', x === b)); side.mirror = top.mirror = as === 'en'; });
    $(s, '.vw-pause').onclick = e => { paused = !paused; e.currentTarget.textContent = paused ? '▶ Play' : '❚❚ Pause'; };
    pickers(s, restart);
    listeners.push(restart);
    const caption = (beat) => {
      const me = as === 'pc';
      const lines = {
        0: 'Neutral. Same distance, same numbers, in both views.',
        1: me ? (p.hit ? 'You swing, and it lands.' : 'You swing and whiff, but you’ve moved closer.') : (p.hit ? 'They swing, and it lands on you.' : 'They swing and whiff, and step towards you.'),
        2: p.punish ? (me ? '<b class="bad">Their payoff:</b> your whiff left you inside their pressure.' : '<b class="good">Your payoff:</b> their whiff left them inside your pressure. Punish it.')
          : p.trade ? (me ? '<b class="bad">They hit back:</b> a trade.' : '<b class="good">You can hit back:</b> a trade.')
          : p.dazed ? (me ? 'They’re dazed: no answer.' : 'You’re dazed: no answer.') : (me ? 'They can’t reach you: no payoff for them.' : 'You can’t reach them: no payoff for you.'),
        3: p.follow ? (me ? '<b class="good">Your payoff:</b> they’re inside your follow-up range.' : '<b class="bad">Their payoff:</b> you’re inside their follow-up range.') : (me ? 'You can’t follow up from there.' : 'They can’t follow up from there.'),
      };
      return `${lines[beat]} <span class="muted">One side’s opening is the other side’s payoff.</span>`;
    };
    let shown = -1;
    return dt => {
      const beat = SEQ[i], len = beatLen(p, beat) + (beat ? 1 : 1.6);
      if (!paused) t += dt;
      if (t > len) { i = (i + 1) % SEQ.length; t = 0; }
      const F = frame(p, SEQ[i], Math.min(t, beatLen(p, SEQ[i])));
      const names = as === 'pc' ? ['You', 'Enemy'] : ['PC', 'You'];
      g.clearRect(0, 0, W, H);
      scene(g, side, p, F, names); scene(g, top, p, F, names);
      text(g, 'side-on', side.x + 60, side.y + 26, { size: 18, col: '#666', weight: 500 });
      text(g, 'top-down', top.x + 60, top.y + 26, { size: 18, col: '#666', weight: 500 });
      const key = SEQ[i] + as + S.w;
      if (key !== shown) { shown = key; say(out, caption(SEQ[i])); }
    };
  }, { enter(s) { /* pick up changes made on other slides */ } });

  /* ================= 304: the power breakdown, with the Spine mockup ================= */
  canvasDemo('breakdown', (s, c, g) => {
    const W = c.width, H = c.height, out = $(s, '.bd-out'), box = $(s, '.spine-box');
    const v = view({ x: 4, y: 4, w: W - 8, h: H - 8, ox: W / 2, oy: 92, dir: [1, 0], px: 44, tr: 20, side: false, labels: false });
    const SEQ = [1, 2, 1, 3];
    let i = 0, t = 0, p = plan(), player = null, anim = null, loaded = false;
    const playAnim = () => { const a = WEAPONS[S.w].anim; if (player && loaded && a !== anim) { anim = a; player.setAnimation(a, true); } };
    if (window.spine && window.SPINE_DATA) {
      player = new spine.SpinePlayer(box, {
        skeleton: 'basic-strikes.json', atlas: 'forsaken.atlas', rawDataURIs: window.SPINE_DATA,
        animation: WEAPONS[S.w].anim, showControls: false, alpha: true, backgroundColor: '#00000000', premultipliedAlpha: true,
        viewport: { x: -175, y: -170, width: 350, height: 340, padLeft: 0, padRight: 0, padTop: 0, padBottom: 0 },
        success: () => { loaded = true; anim = null; playAnim(); },
        error: (pl, msg) => { box.textContent = 'Spine error: ' + msg; },
      });
      s._player = player;
    } else box.textContent = 'The Spine player didn’t load.';
    const inputs = $$(s, '.bd-tune input');
    const show = () => {
      const w = WEAPONS[S.w]; p = plan(); t = 0;
      $(s, '.bd-name').textContent = w.name;
      $(s, '.bd-pos').textContent = `+${fmt(w.step)} meters`;
      $(s, '.bd-pre').textContent = `${fmt(pressure(w))} meters`;
      $(s, '.bd-pay').textContent = `${w.dmg} dmg, ${w.stun} stun, ${w.poise} poise`;
      $(s, '.bd-anim').textContent = w.animNote + (w === WEAPONS.spear ? '' : ' Payoff numbers are illustrative.');
      inputs.forEach(r => { r.value = w[r.dataset.k]; $(s, `[data-v="${r.dataset.k}"]`).textContent = r.dataset.k === 'step' || r.dataset.k === 'reach' ? fmt(w[r.dataset.k]) + ' m' : w[r.dataset.k]; });
      say(out, `From ${fmt(p.d0)} m: <b class="${p.hit ? 'good' : ''}">${p.hit ? 'lands' : 'whiffs'}</b>, leaving you ${fmt(p.d1)} m away. `
        + (p.punish ? '<b class="bad">Inside their reach while recovering: punished.</b> ' : p.trade ? '<b class="bad">Inside their reach: a trade.</b> ' : p.dazed && p.theyReach ? 'Inside their reach, but they’re dazed. ' : '<b class="good">Outside their reach.</b> ')
        + (p.follow ? 'A follow-up reaches.' : 'No follow-up from there.'));
      playAnim();
    };
    inputs.forEach(r => r.oninput = () => { WEAPONS[S.w][r.dataset.k] = +r.value; changed(); });
    $(s, '.bd-reset').onclick = () => { Object.assign(WEAPONS[S.w], DEFAULTS[S.w]); changed(); };
    pickers(s, show);
    listeners.push(show);
    return dt => {
      t += dt;
      const beat = SEQ[i];
      if (t > beatLen(p, beat) + .5) { i = (i + 1) % SEQ.length; t = 0; }
      g.clearRect(0, 0, W, H);
      scene(g, v, p, frame(p, SEQ[i], Math.min(t, beatLen(p, SEQ[i]))), ['You', 'Enemy']);
    };
  }, { enter(s) { s._player?.play(); }, leave(s) { s._player?.pause(); } });

  /* ================= the whole sequence, for every weapon ================= */
  demo('compare', {
    init(s) {
      const box = $(s, '.cmp-box'), note = $(s, '.cmp-note');
      const cell = (cls, b, sub) => `<td class="${cls}"><b>${b}</b><span>${sub}</span></td>`;
      s._draw = () => {
        const rows = Object.entries(WEAPONS).map(([k, w]) => {
          const p = plan(w);
          const c300 = p.hit ? cell('good', 'Lands', `${payText(w)}, +${fmt(p.step)} m`) : cell('', 'Whiffs', `but moves you +${fmt(p.step)} m`);
          const c301 = p.punish ? cell('bad', 'Punished', `${fmt(p.d1)} m is inside their ${fmt(p.EP)} m`) : p.trade ? cell('bad', 'Trade', 'they hit back') :
            p.dazed && p.theyReach ? cell('good', 'Dazed', 'in range, but stunned') : cell('good', 'Safe', `${fmt(p.d1 - p.EP)} m outside their reach`);
          const c302 = p.follow ? cell('good', 'Follow-up reaches', `${fmt(p.d1)} m ≤ ${fmt(p.P)} m`) : cell('', 'Out of range', `${fmt(p.d1 - p.P)} m short`);
          return `<tr data-row="${k}" class="${k === S.w ? 'cur' : ''}"><th>${w.img ? `<img src="${IMG}${w.img}.png" alt="">` : w.icon} ${w.weapon}<small>${w.name}</small></th>`
            + `<td class="num"><b>${fmt(pressure(w))} m</b><span>+${fmt(w.step)} step, ${fmt(w.reach)} reach</span></td>${c300}${c301}${c302}</tr>`;
        }).join('');
        box.innerHTML = `<table class="cmp"><tr><th></th><th>Pressure</th><th>300 · The swing</th><th>301 · Their opening</th><th>302 · Your follow-up</th></tr>${rows}</table>`;
        $$(box, '[data-row]').forEach(r => r.onclick = () => { S.w = r.dataset.row; store.set('mgm-payoffs:w', S.w); changed(); FPF.go(1); });
        note.textContent = `Starting ${fmt(S.en0 - S.pc0)} m apart, enemy ${S.enemy === 'stand' ? 'standing still' : S.enemy === 'back' ? 'backing off as you swing' : 'stepping in as you swing'}; their claw threatens ${fmt(pressure(ENEMY))} m. Click a row to play it.`;
      };
      listeners.push(s._draw);
    },
    enter(s) { s._draw(); },
  });
})();
