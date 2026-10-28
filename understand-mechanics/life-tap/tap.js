/* Life Tap solo vs raid (MGM C4 M2, deck slides 226-228). The same warlock, the same rotation, the same Life Tap
   (-40 HP, +40 mana, the slide's numbers): solo, a monster is always hitting you, so every tap is a real risk and the
   warlock goes down; in a raid the boss hits the tank and a priest heals the tap straight back, so it costs nothing but
   the healer's mana. sim() replays both fights event by event, so any moment can be drawn. Numbers: R. */
(function () {
  const { $, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;
  const W = 1040, H = 585, PW = 505, PX = [10, 525];
  const R = { maxHp: 100, maxMana: 100, mana0: 40, cast: 2.5, cost: 20, bolt: 25, hit: 10, hitEvery: 2, tapDelay: .5, healDelay: 1, healCost: 15, foeSolo: 200, foeRaid: 1000 };
  const WARLOCK = '#8a4fd6', PRIEST = '#f4f1e6', TANK = '#2ea3dc';

  // replay a fight up to time t; o = { raid, healer, tap }
  function sim(t, o) {
    const s = { hp: R.maxHp, mana: R.mana0, foe: o.raid ? R.foeRaid : R.foeSolo, priest: 100, taps: 0, healed: 0, down: null, ev: [] };
    const q = [];
    for (let k = 1; k * R.cast <= t + .001; k++) q.push({ at: k * R.cast, type: 'cast' });
    if (!o.raid) for (let k = 0; R.hitEvery * k + 1.5 <= t; k++) q.push({ at: R.hitEvery * k + 1.5, type: 'hit' });
    q.sort((a, b) => a.at - b.at);
    for (let i = 0; i < q.length; i++) {
      const e = q[i]; if (s.down != null) break;
      if (e.type === 'cast') {
        if (s.mana >= R.cost) { s.mana -= R.cost; s.foe = Math.max(0, s.foe - R.bolt); s.ev.push({ at: e.at, type: 'bolt' }); }
        // out of mana for the next cast: tap
        if (s.mana < R.cost && e.at + R.tapDelay <= t) insert(q, i, { at: e.at + R.tapDelay, type: 'tap' });
      } else if (e.type === 'tap') {
        s.hp -= o.tap; s.mana = Math.min(R.maxMana, s.mana + o.tap); s.taps++; s.ev.push({ at: e.at, type: 'tap' });
        if (o.raid && o.healer && e.at + R.healDelay <= t) insert(q, i, { at: e.at + R.healDelay, type: 'heal' });
      } else if (e.type === 'heal') {
        const amt = Math.min(o.tap, R.maxHp - s.hp); s.hp += amt; s.healed += amt; s.priest -= R.healCost; s.ev.push({ at: e.at, type: 'heal', n: s.ev.filter(x => x.type === 'heal').length });
      } else if (e.type === 'hit') { s.hp -= R.hit; s.ev.push({ at: e.at, type: 'hit' }); }
      if (s.hp <= 0) { s.hp = 0; s.down = e.at; }
    }
    return s;
  }
  function insert(q, i, e) { let j = i + 1; while (j < q.length && q[j].at <= e.at) j++; q.splice(j, 0, e); }
  const ago = (s, type, t) => { const e = s.ev.filter(x => x.type === type).at(-1); return e ? { a: t - e.at, e } : null; };

  function bar(g, x, y, w, v, max, col, text) {
    g.fillStyle = 'rgba(21,32,68,.85)'; g.fillRect(x - 2, y - 2, w + 4, 20);
    g.fillStyle = '#2d2f4d'; g.fillRect(x, y, w, 16);
    g.fillStyle = col; g.fillRect(x, y, w * clamp(v / max), 16);
    g.fillStyle = '#fff'; g.font = '700 12px Jost, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text ?? `${Math.round(v)} / ${max}`, x + w / 2, y + 8);
  }
  function who(g, x, y, name) { g.fillStyle = C.ink; g.font = '700 14px Montserrat, Jost, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(name, x, y); }

  function panel(g, p, o, t) {
    const x0 = PX[p], s = sim(t, o), down = s.down != null;
    g.fillStyle = 'rgba(255,252,244,.8)'; g.beginPath(); g.roundRect(x0, 0, PW, H, 14); g.fill();
    T.label(o.raid ? 'Raid: free, at the cost of healing' : 'Solo: a real risk', x0 + PW / 2, 24, 'center', '#fff', 15, o.raid ? C.good : C.redDk);
    // arena
    T.floor(x0 + 14, 46, PW - 28, 250);
    const wl = [x0 + 120, 230], fx = o.raid ? x0 + 400 : x0 + 300, fy = o.raid ? 140 : 190;
    if (o.raid) {
      T.foe(fx, fy, 46, Math.PI * .85, C.red, { mark: 'horns' });
      T.player(x0 + 330, 175, -.6, 1, 1, TANK); T.label('Tank', x0 + 330, 214, 'center', C.ink, 12); ICON.draw(g, 'warrior', x0 + 376, 214, 24);
      if (Math.floor(t * 1.4) % 2) T.tracer(fx - 30, fy + 20, x0 + 345, 168, .7, C.red, 3);
      T.player(x0 + 90, 120, 0, 1, 1, PRIEST); T.label('Priest', x0 + 90, 82, 'center', C.ink, 12); ICON.draw(g, 'priest', x0 + 46, 120, 28);
    } else {
      // a monster right in your face, hitting every two seconds
      const h = ago(s, 'hit', t), lunge = h && h.a < .25 ? Math.sin(h.a / .25 * Math.PI) * 30 : 0;
      T.foe(fx - lunge, fy, 34, Math.PI, C.red, { mark: 'horns' });
      if (h && h.a < .5) T.popText(`-${R.hit}`, wl[0] + 30, wl[1] - 40 - 30 * h.a, C.redDk, 1 - h.a * 2);
    }
    T.player(wl[0], wl[1], Math.atan2(fy - wl[1], fx - wl[0]), 1.1, down ? .3 : 1, WARLOCK);
    T.label('Warlock', wl[0], wl[1] + 40, 'center', C.ink, 12); ICON.draw(g, 'warlock', wl[0] - 54, wl[1], 30);
    if (down) T.stamp('Down', wl[0], wl[1] - 60, C.redDk, clamp((t - s.down) / .3), 30);
    const b = ago(s, 'bolt', t); if (b && b.a < .4 && !down) { T.tracer(wl[0], wl[1], lerp(wl[0], fx, b.a / .4), lerp(wl[1], fy, b.a / .4), 1, WARLOCK, 6); ICON.draw(g, 'shadowbolt', lerp(wl[0], fx, b.a / .4), lerp(wl[1], fy, b.a / .4), 24); }
    const tp = ago(s, 'tap', t); if (tp && tp.a < 1.1) { T.flash(wl[0], wl[1], 60, 1 - tp.a); T.popText(`-${o.tap} HP  +${o.tap} mana`, wl[0] + 150, wl[1] - 76 - 16 * tp.a, WARLOCK, 1.3 - tp.a); ICON.draw(g, 'lifetap', wl[0], wl[1] - 76 - 16 * tp.a, 34, clamp(1.3 - tp.a)); }
    const hl = ago(s, 'heal', t);
    if (hl && hl.a < 1.2) {
      ICON.draw(g, 'heal', x0 + 140, 120 - 14 * hl.a, 32, clamp(1.2 - hl.a));
      T.beam(x0 + 90, 120, wl[0], wl[1], t, 1 - hl.a / 1.2);
      T.popText(`+${o.tap} HP`, x0 + 200, 100 - 16 * hl.a, C.good, 1.2 - hl.a);
      T.label(hl.e.n % 2 ? 'LOL!' : 'THX, BRO~', wl[0] - 10, wl[1] + 70, 'center', '#fff', 15, WARLOCK);
    }
    // bars, like slide 227
    let y = 316;
    who(g, x0 + 20, y + 8, 'Warlock'); bar(g, x0 + 130, y, 220, s.hp, R.maxHp, s.hp > 50 ? C.p2 : s.hp > 25 ? '#e0a92d' : C.red, `${Math.round(s.hp)} / ${R.maxHp} HP`);
    bar(g, x0 + 130, y + 26, 220, s.mana, R.maxMana, '#3c6fe0', `${Math.round(s.mana)} / ${R.maxMana} mana`);
    y += 66;
    if (o.raid) { who(g, x0 + 20, y + 8, 'Priest'); bar(g, x0 + 130, y, 220, s.priest, 100, '#3c6fe0', `${Math.round(s.priest)} / 100 mana`); y += 34; }
    who(g, x0 + 20, y + 8, o.raid ? 'Boss' : 'Monster'); bar(g, x0 + 130, y, 220, s.foe, o.raid ? R.foeRaid : R.foeSolo, C.red, `${Math.round(s.foe)} / ${o.raid ? R.foeRaid : R.foeSolo} HP`);
    // tallies
    const ty = 500;
    g.font = '800 30px Montserrat, Jost, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    [[s.taps, 'Life Taps cast'], [o.raid ? s.healed : (down ? '✕' : '…'), o.raid ? 'HP healed back' : (down ? 'warlock went down' : 'still standing')]].forEach(([v, l], i) => {
      const cx = x0 + 130 + i * 250;
      g.fillStyle = i && !o.raid && down ? C.redDk : C.ink; g.fillText(v, cx, ty);
      g.font = '600 13px Jost, sans-serif'; g.fillStyle = C.muted; g.fillText(l, cx, ty + 28); g.font = '800 30px Montserrat, Jost, sans-serif';
    });
    return s;
  }

  const DUR = 18;
  let api;
  canvasDemo('tap', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, healer: true, tap: 40, key: '' };
    const tourBtn = $(s, '.lt-tour'), heal = $(s, '.lt-heal'), cost = $(s, '.lt-cost');
    const free = () => { st.tour = false; tourBtn.classList.remove('on'); st.t = 0; };
    heal.onchange = () => { free(); st.healer = heal.checked; };
    cost.oninput = () => { free(); st.tap = +cost.value; };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; st.healer = true; st.tap = 40; heal.checked = true; cost.value = 40; tourBtn.classList.add('on'); };
    function render() {
      const t = st.t, o = { healer: st.healer, tap: st.tap };
      T.use(g); g.clearRect(0, 0, W, H);
      const solo = panel(g, 0, { ...o, raid: false }, t), raid = panel(g, 1, { ...o, raid: true }, t);
      $(s, '.lt-v').textContent = `-${st.tap} HP, +${st.tap} mana`;
      const key = [solo.taps, solo.down != null, raid.taps, raid.down != null, st.healer].join(); if (key === st.key) return; st.key = key;
      say($(s, '.lt-stats'), `<div class="${solo.down != null ? 'r' : ''}"><b>${solo.taps}</b><span>taps solo${solo.down != null ? ', then down' : ''}</span></div><div class="g"><b>${raid.taps}</b><span>taps in the raid${raid.down != null ? ', then down' : ', still casting'}</span></div><div class="y"><b>${raid.healed}</b><span>HP the priest spent on the warlock</span></div>`);
      say($(s, '.lt-out'), !st.healer
        ? 'Take the healer away and the raid warlock is back to the solo problem: every tap is a chunk of health you need.'
        : solo.down != null
          ? 'Solo, a monster is always hitting you, so each tap eats into health you need: the warlock goes down. In the raid the priest heals it straight back. The risk is gone, and the warlock just keeps casting.'
          : 'Same rotation on both sides: cast until out of mana, then Life Tap health into mana. Watch who pays for it.');
    }
    api = { seek(t) { st.held = st.tour = true; st.t = t; render(); }, dur: () => DUR };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > DUR) st.t = 0; if (!st.tour && st.t > 30) st.t = 0; render(); };
  });
  window.__seek = t => api.seek(t);
  window.__dur = () => api.dur();
})();
