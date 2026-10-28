/* MTG keyword combat (MGM C4 M1, deck slides 193-194). Two creatures with the same stats, one attacking and one that
   may block. Toggle keywords on either and the same 2/2 vs 2/2 fight plays out differently: rules in rules.js, timeline
   here. The walk-through steps through PRESETS. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD, { KW, TEXT, resolve } = MTG;
  const W = 1040, H = 585, CW = 210, CH = 290;
  const PRESETS = [
    { a: [], b: [], note: 'No keywords: two 2/2s trade.' },
    { a: ['First Strike'], b: [], note: 'First Strike: the attacker deals its damage first, so the blocker dies before it can hit back.' },
    { a: ['Flying'], b: [], note: 'Flying: the ground creature can’t block it.' },
    { a: ['Flying'], b: ['Reach'], note: 'Reach: now the blocker can stop the flyer, and they trade.' },
    { a: ['Deathtouch'], b: ['Indestructible'], note: 'Deathtouch kills anything it damages, unless that thing is Indestructible.' },
    { a: ['Menace'], b: [], note: 'Menace: one blocker isn’t enough.' },
    { a: ['Trample', 'Deathtouch'], b: [], ap: 3, note: 'Trample with Deathtouch: 1 damage is lethal, so 2 of the 3 go through to the player.' },
  ];
  const PER = 5.2;

  function card(g, x, y, c, role, kws, a = 1, tapped = false, dead = 0) {
    g.save(); g.globalAlpha = a * (1 - dead * .75);
    g.translate(x + CW / 2, y + CH / 2); if (tapped) g.rotate(Math.PI / 2 * tapped); if (dead) g.rotate(-dead * .2);
    g.translate(-CW / 2, -CH / 2);
    const col = role === 'a' ? '#c8d6ef' : '#e9d2c0', ink = role === 'a' ? '#1d3a7a' : '#7a3a14';
    g.fillStyle = '#1b1b22'; g.beginPath(); g.roundRect(0, 0, CW, CH, 12); g.fill();
    g.fillStyle = col; g.beginPath(); g.roundRect(8, 8, CW - 16, CH - 16, 8); g.fill();
    g.fillStyle = '#fffaf0'; g.fillRect(14, 14, CW - 28, 26);
    g.fillStyle = ink; g.font = '700 15px Montserrat, Jost, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillText(role === 'a' ? 'Attacker' : 'Blocker', 20, 28);
    // art: a simple crest
    g.fillStyle = role === 'a' ? '#5b7fc4' : '#c27a4a'; g.fillRect(14, 46, CW - 28, 98);
    g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath();
    if (role === 'a') { g.moveTo(CW / 2, 58); g.lineTo(CW / 2 + 22, 100); g.lineTo(CW / 2, 132); g.lineTo(CW / 2 - 22, 100); }
    else { g.moveTo(CW / 2 - 28, 62); g.lineTo(CW / 2 + 28, 62); g.lineTo(CW / 2 + 28, 102); g.lineTo(CW / 2, 132); g.lineTo(CW / 2 - 28, 102); }
    g.closePath(); g.fill();
    if (kws.includes('Flying')) { g.fillStyle = '#fff'; g.beginPath(); g.ellipse(CW / 2 - 40, 82, 24, 9, -.4, 0, 7); g.ellipse(CW / 2 + 40, 82, 24, 9, .4, 0, 7); g.fill(); }
    g.fillStyle = '#fffaf0'; g.fillRect(14, 150, CW - 28, CH - 198);
    g.fillStyle = '#262c6a'; g.font = '700 13px Jost, sans-serif';
    if (!kws.length) { g.fillStyle = '#8b8fa8'; g.fillText('(no keywords)', 22, 166); }
    kws.slice(0, 5).forEach((k, i) => g.fillText(k, 22, 166 + i * 18));
    g.fillStyle = '#fffaf0'; g.strokeStyle = '#1b1b22'; g.lineWidth = 2; g.beginPath(); g.roundRect(CW - 76, CH - 44, 62, 30, 6); g.fill(); g.stroke();
    g.fillStyle = '#1b1b22'; g.font = '800 20px Montserrat, Jost, sans-serif'; g.textAlign = 'center'; g.fillText(`${c.p}/${c.t}`, CW - 45, CH - 28);
    g.restore();
  }

  // where everything is at time t into one combat
  function frame(g, A, B, o, r, t) {
    const aKw = [...A.kw], bKw = [...B.kw];
    const homeA = [70, 250], homeB = [780, 250], blockAt = [560, 250];
    const go = ease(clamp((t - .4) / .7)), blk = r.blocked ? ease(clamp((t - 1) / .6)) : 0;
    const ax = r.attacks ? lerp(homeA[0], r.blocked ? 230 : 420, go) : homeA[0];
    const bx = lerp(homeB[0], blockAt[0], blk), by = homeB[1] + (o.inHand && !r.blocked ? 80 : 0);
    const deadA = r.aDies ? clamp((t - 3.1) / .5) : 0, deadB = r.bDies ? clamp((t - (r.steps.some(s => s.step === 'first' && s.to === 'b') && !r.steps.some(s => s.step === 'first' && s.to === 'a') ? 2.3 : 3.1)) / .5) : 0;
    const tap = r.attacks && r.tapped ? clamp((t - .2) / .3) : 0;
    // player
    g.fillStyle = '#fffaf0'; g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.roundRect(800, 30, 200, 70, 10); g.fill(); g.stroke();
    const hit = r.toPlayer && t > (r.blocked ? 2.9 : 2.1) ? r.toPlayer : 0;
    g.fillStyle = C.ink; g.font = '700 15px Jost, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('Defending player', 816, 50);
    g.font = '800 26px Montserrat, Jost, sans-serif'; g.fillStyle = hit ? C.redDk : C.ink; g.fillText(`${20 - hit} life`, 816, 80);
    if (o.inHand) { g.font = '600 14px Jost, sans-serif'; g.fillStyle = C.muted; g.textAlign = 'center'; g.fillText(r.blocked ? 'played from hand with Flash' : 'still in hand', homeB[0] + CW / 2, 230); }
    card(g, bx, by, B, 'b', bKw, o.inHand && !r.blocked ? .45 : 1, 0, deadB);
    card(g, ax, homeA[1], A, 'a', aKw, 1, tap, deadA);
    if (!r.attacks) { T.use(g); T.stamp('Can’t attack yet', 195, 210, C.redDk, clamp((t - .6) / .3), 24); }
    // damage pops
    T.use(g);
    r.steps.forEach(s => {
      const at = s.step === 'first' ? 1.9 : (r.blocked ? 2.7 : 1.9), k = t - at; if (k < 0 || k > 1.4) return;
      const P = { a: [ax + CW / 2, 230], b: [bx + CW / 2, 230], player: [900, 120] }[s.to];
      T.popText(`-${s.dmg}`, P[0], P[1] - 30 * k, s.to === 'player' ? C.redDk : '#a8201c', 1.4 - k);
      if (k < .25) T.flash(P[0], P[1] + 80, 70, 1 - k * 4);
    });
    if (t > 1.5 && r.steps.some(s => s.step === 'first')) T.label('first-strike damage', 520, 560, 'center', C.ink, 14);
    if (t > 3.8) {
      const msg = !r.attacks ? 'no attack' : !r.blocked ? `unblocked: ${r.toPlayer} to the player` : r.aDies && r.bDies ? 'both die' : r.aDies ? 'attacker dies' : r.bDies ? 'blocker dies' : 'both survive';
      T.stamp(msg, 560, 130, C.navy, clamp((t - 3.8) / .3), 26);
    }
    if (t > 3.8) {
      const k = clamp((t - 3.8) / .3), rows = [
        ['Attacker', !r.attacks ? 'stays home' : (r.aDies ? 'dies' : 'lives') + (r.tapped ? ', tapped' : ', untapped'), r.aDies],
        ['Blocker', r.blocked ? (r.bDies ? 'dies' : 'lives') : 'doesn’t block', r.bDies],
        ['Player', `takes ${r.toPlayer}`, r.toPlayer > 0],
      ];
      g.save(); g.globalAlpha = k; g.textBaseline = 'middle';
      rows.forEach(([n, v, red], i) => {
        g.textAlign = 'left'; g.font = '600 16px Jost, sans-serif'; g.fillStyle = C.muted; g.fillText(n, 30, 40 + i * 30);
        g.font = '800 19px Montserrat, Jost, sans-serif'; g.fillStyle = red ? C.redDk : C.ink; g.fillText(v, 120, 40 + i * 30);
      });
      g.restore();
    }
    if (r.attacks && !r.tapped && t > 1) T.label('Vigilance: stays untapped', ax + CW / 2, 230 + CH / 2 + 90, 'center', C.good, 14);
  }

  let api;
  canvasDemo('mtg', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, a: new Set(), b: new Set(), ap: 2, at: 2, bp: 2, bt: 2, sick: false, inHand: false, key: '', note: '' };
    const tourBtn = $(s, '.mg-tour');
    const boxes = role => KW.filter(k => role === 'b' || k !== 'Reach').map(k => `<label class="chk" title="${TEXT[k]}"><input type="checkbox" data-r="${role}" data-k="${k}"> ${k}</label>`).join('');
    $(s, '.mg-a').innerHTML = boxes('a'); $(s, '.mg-b').innerHTML = boxes('b');
    const free = () => { st.tour = false; tourBtn.classList.remove('on'); st.t = 0; };
    $$(s, '.mt-side input[data-k]').forEach(i => i.onchange = () => { free(); st[i.dataset.r][i.checked ? 'add' : 'delete'](i.dataset.k); });
    $(s, '.mg-sick').onchange = e => { free(); st.sick = e.target.checked; };
    $(s, '.mg-hand').onchange = e => { free(); st.inHand = e.target.checked; };
    $(s, '.mg-ap').oninput = e => { free(); st.ap = +e.target.value; };
    $(s, '.mg-replay').onclick = () => { st.tour = false; tourBtn.classList.remove('on'); st.t = 0; };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    const sync = (pr) => {
      st.a = new Set(pr.a); st.b = new Set(pr.b); st.ap = pr.ap || 2; st.sick = false; st.inHand = false;
      $$(s, '.mt-side input[data-k]').forEach(i => i.checked = st[i.dataset.r].has(i.dataset.k));
      $(s, '.mg-sick').checked = false; $(s, '.mg-hand').checked = false; $(s, '.mg-ap').value = st.ap;
    };
    function render() {
      let t = st.t, note = '';
      if (st.tour) { const i = Math.floor(st.t / PER) % PRESETS.length, pr = PRESETS[i]; t = st.t - i * PER; if (st.note !== i) { st.note = i; sync(pr); } note = pr.note; }
      const A = { p: st.ap, t: st.at, kw: st.a }, B = { p: st.bp, t: st.bt, kw: st.b }, o = { sick: st.sick, inHand: st.inHand };
      const r = resolve(A, B, o);
      T.use(g); g.clearRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,252,244,.8)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill();
      g.fillStyle = 'rgba(21,32,68,.06)'; g.fillRect(20, 200, 1000, 370);
      frame(g, A, B, o, r, t);
      $(s, '.mg-apv').textContent = `${st.ap}/2`;
      const key = [...st.a, '|', ...st.b, st.ap, st.sick, st.inHand, note].join(); if (key === st.key) return; st.key = key;
      say($(s, '.mg-out'), note || r.why || (r.blocked ? 'Same 2/2 bodies: only the keywords decide this fight.' : ''));
    }
    api = { seek(t) { st.held = st.tour = true; st.t = t; render(); }, dur: () => PER * PRESETS.length };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > PER * PRESETS.length) st.t = 0; if (!st.tour && st.t > 7) st.t = 7; render(); };
  });
  window.__seek = t => api.seek(t);
  window.__dur = () => api.dur();
})();
