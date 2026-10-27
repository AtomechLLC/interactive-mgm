/* Strike Trade Balance Techniques (MGM course 4, module 4, deck slides 265 to 272): the slide demos.
   One resolver (resolve) decides every hit, so the playable trade, the outcome grid and the
   comparison table can never disagree. Tune damage, timing and the super armor hit cap at the top. */
(function () {
  const { $, $$, canvasDemo, demo, say } = FPF.kit;
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);

  /* ---------- Forsaken ability token art (Design/Abilities/images) ---------- */
  const ART = {};
  ['Token_Player1', 'Token_Player3', 'Monster', 'Hammer', 'Hit_Hostile', 'Hit_Friendly', 'Dizzy_Swirl', 'Protect_Friendly', 'Shielded_Friendly',
    'Not_Symbol', 'ShieldBreak_Left_Hostile', 'Swoosh_Hostile', 'Rect_Hostile', 'Chain', 'Zone_Friendly']
    .forEach(n => { const i = new Image(); i.src = '../../assets/img/forsaken/' + n + '.png'; ART[n] = i; });
  const ready = i => i && i.complete && i.naturalWidth;
  function sprite(g, name, x, y, w, h, { rot = 0, alpha = 1 } = {}) {
    const i = ART[name]; if (!ready(i)) return;
    g.save(); g.globalAlpha *= alpha; g.translate(x, y); g.rotate(rot); g.drawImage(i, -w / 2, -h / 2, w, h); g.restore();
  }
  function label(g, text, x, y, { col = '#1c2a44', size = 18, weight = 600, align = 'center' } = {}) {
    g.font = `${weight} ${size}px Jost, sans-serif`; g.fillStyle = col; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(text, x, y);
  }

  /* ---------- the rules ---------- */
  // your move: a heavy hammer swing. Protection covers the wind-up and the swing itself.
  const SWING = { start: 1.0, active: 1.2, end: 1.8, dmg: 30, guard: [0.12, 1.2] };
  const HP = 100;
  // the monster's attacks: when each hit lands (seconds into your wind-up), damage, knockback and hit stun
  const ATK = {
    jab: { name: 'Jab', hits: [0.45], dmg: 8, kb: 34, stun: 0.4 },
    heavy: { name: 'Heavy strike', hits: [0.62], dmg: 22, kb: 120, stun: 0.75 },
    flurry: { name: '3-hit flurry', hits: [0.3, 0.52, 0.74], dmg: 6, kb: 22, stun: 0.35 },
    throw: { name: 'Throw', hits: [0.55], dmg: 14, kb: 70, stun: 0.8, grab: true },
  };
  const MODES = {
    none: { name: 'None', col: '#b9bfc9' },
    armor: { name: 'Armor', col: '#8fd3ff', cut: 0.5 },
    super: { name: 'Super armor', col: '#ffb547' },
    immune: { name: 'Immunity', col: '#c79bff' },
  };
  const CAP = 2;   // hits super armor absorbs before it breaks (Street Fighter 6's Drive Impact); Infinity = hyper armor

  // every hit in order: what it did, and how the trade came out
  function resolve(mode, atk, { cap = CAP } = {}) {
    const A = ATK[atk], ev = [];
    let cut = null, absorbed = 0, took = 0, kb = 0;
    for (const t of A.hits) {
      const guarded = !cut && t >= SWING.guard[0] && t <= SWING.guard[1];
      let e;
      if (cut || !guarded || mode === 'none') e = { kind: cut ? 'combo' : 'hit', dmg: A.dmg, stun: true };
      else if (mode === 'armor') e = { kind: 'armor', dmg: Math.round(A.dmg * MODES.armor.cut), stun: true };
      else if (mode === 'immune') e = { kind: 'whiff', dmg: 0, stun: false };
      else if (A.grab) e = { kind: 'grab', dmg: A.dmg, stun: true };
      else if (++absorbed > cap) e = { kind: 'break', dmg: A.dmg, stun: true };
      else e = { kind: 'absorb', dmg: A.dmg, stun: false };
      e.t = t; e.kb = e.stun ? A.kb : 0;
      took += e.dmg; kb += e.kb;
      if (e.stun && !cut) cut = { t, until: t + A.stun };
      else if (e.stun) cut.until = Math.max(cut.until, t + A.stun);
      ev.push(e);
    }
    const lands = !cut, dealt = lands ? SWING.dmg : 0;
    let win, verdict;
    if (!lands) { win = 'atk'; verdict = 'Monster wins'; }
    else if (!took) { win = 'you'; verdict = 'You win clean'; }
    else { win = 'trade'; verdict = `Trade, you’re up ${dealt - took}`; }
    return { ev, cut, took, dealt, lands, kb, win, verdict };
  }

  // one sentence on why it came out that way
  function why(mode, atk, r, cap) {
    const A = ATK[atk], n = A.hits.length, hit = n > 1 ? 'hits' : 'hit', what = A.name.toLowerCase();
    const k = r.ev.map(e => e.kind);
    if (mode === 'none') return `<b>No protection.</b> The ${what} lands, the hit stun cancels your wind-up, and you’re knocked back. Your swing never comes out.`;
    if (mode === 'armor') return `<b class="ar">Armor</b> halves the damage (${n * A.dmg} becomes ${r.took}), but you still flinch. Your swing is cancelled: armor changes the cost, not who wins.`;
    if (mode === 'immune') return `<b class="im">Immunity.</b> The ${what} passes straight through you. No damage, no flinch, and your hammer lands for ${r.dealt}. All or nothing.`;
    if (k.includes('grab')) return `<b class="sa">Super armor</b> can’t stop a <b>throw</b>. Grabs ignore armor, which is exactly the counterplay you want a weighty armored move to have.`;
    if (k.includes('break')) return `<b class="sa">Super armor</b> soaked ${cap} hits, then the ${k.indexOf('break') + 1}rd broke it. Multi-hits are the other answer to armor.`;
    return `<b class="sa">Super armor.</b> You take the full ${r.took} damage, but you don’t flinch. Your hammer comes out on time and lands for ${r.dealt}: ${r.dealt > r.took ? 'the slow, weighty move wins the trade.' : 'a trade.'}`;
  }

  const KIND = {   // how each hit shows on the timeline and in the air
    hit: { col: '#e0524f', txt: d => `-${d}` }, combo: { col: '#e0524f', txt: d => `-${d}` },
    armor: { col: '#8fd3ff', txt: d => `-${d} armor` }, absorb: { col: '#ffb547', txt: d => `-${d} no flinch` },
    whiff: { col: '#c79bff', txt: () => 'MISS' }, grab: { col: '#e0524f', txt: d => `THROWN -${d}` }, break: { col: '#e0524f', txt: d => `BREAK -${d}` },
  };

  /* ---------- the playable trade ---------- */
  const LEN = 2.1, HOLD = 1.6;   // sim seconds, then a pause before it loops
  const state = { mode: 'super', atk: 'jab', cap: CAP, slow: false, t: 0 };
  let shared = null;   // the trade slide, so the grid can drive it

  canvasDemo('trade', (s, c, g) => {
    const W = c.width, H = c.height, AY = 230, MX = 330, PX = 480;   // close enough that the hammer and the monster's strikes connect
    const out = $(s, '.tr-out'), cmp = $(s, '.tr-cmp'), capBtn = $(s, '.tr-cap'), slowBtn = $(s, '.tr-slow');
    let r;
    const tx = t => 70 + (t / SWING.end) * (W - 140);   // timeline x

    function sync() {
      r = resolve(state.mode, state.atk, state);
      $$(s, '[data-mode]').forEach(b => b.classList.toggle('on', b.dataset.mode === state.mode));
      $$(s, '[data-atk]').forEach(b => b.classList.toggle('on', b.dataset.atk === state.atk));
      capBtn.textContent = state.cap === Infinity ? 'Hyper armor: never breaks' : `Super armor: breaks after ${state.cap} hits`;
      capBtn.classList.toggle('on', state.cap === Infinity);
      slowBtn.classList.toggle('on', state.slow);
      say(out, why(state.mode, state.atk, r, state.cap));
      const head = '<tr><th></th><th>Damage taken</th><th>Flinch?</th><th>Your swing</th><th>Result</th></tr>';
      cmp.innerHTML = head + Object.keys(MODES).map(m => {
        const x = resolve(m, state.atk, state);
        const fl = x.ev.some(e => e.stun) ? '<span class="bad">yes</span>' : '<span class="good">no</span>';
        return `<tr data-m="${m}" class="${m === state.mode ? 'cur' : ''}" style="--c:${MODES[m].col}"><th>${MODES[m].name}</th><td>${x.took}</td><td>${fl}</td><td>${x.lands ? `<span class="good">lands ${x.dealt}</span>` : '<span class="bad">cancelled</span>'}</td><td class="w-${x.win}">${x.verdict}</td></tr>`;
      }).join('');
      $$(cmp, 'tr[data-m]').forEach(tr => tr.onclick = () => set({ mode: tr.dataset.m }));
    }
    function set(p) { Object.assign(state, p); state.t = 0; sync(); }
    shared = { set };
    $$(s, '[data-mode]').forEach(b => b.onclick = () => set({ mode: b.dataset.mode }));
    $$(s, '[data-atk]').forEach(b => b.onclick = () => set({ atk: b.dataset.atk }));
    capBtn.onclick = () => set({ cap: state.cap === Infinity ? CAP : Infinity });
    slowBtn.onclick = () => { state.slow = !state.slow; sync(); };
    $(s, '.tr-replay').onclick = () => set({});
    addEventListener('keydown', e => {
      if (!s.classList.contains('active') || e.ctrlKey || e.metaKey) return;
      const m = { Digit1: 'none', Digit2: 'armor', Digit3: 'super', Digit4: 'immune' }[e.code];
      if (m) set({ mode: m }); else if (e.code === 'KeyR') set({});
    });
    sync();

    // what's happened by time t
    function at(t) {
      const done = r.ev.filter(e => e.t <= t);
      const cut = r.cut && t >= r.cut.t ? r.cut : null;
      const took = done.reduce((a, e) => a + e.dmg, 0);
      let push = 0;
      done.forEach(e => { push += e.kb * ease((t - e.t) / .28); });
      const guard = !cut && t >= SWING.guard[0] && t <= SWING.guard[1] && state.mode !== 'none';
      return { done, cut, took, push, guard, stunned: cut && t < cut.until, dealt: r.lands && t >= SWING.start + .1 ? SWING.dmg : 0 };
    }

    function hpBar(x, y, hp, col) {
      g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.roundRect(x - 50, y, 100, 10, 5); g.fill();
      g.fillStyle = col; g.beginPath(); g.roundRect(x - 50, y, Math.max(0, hp), 10, 5); g.fill();
    }

    function drawMonster(t, now) {
      const A = ATK[state.atk];
      let lunge = 0;
      A.hits.forEach(h => { const k = (t - (h - .16)) / .26; if (k > 0 && k < 1) lunge = Math.max(lunge, Math.sin(k * Math.PI) * 34); });
      const x = MX + lunge, flash = now.dealt && t < SWING.start + .35 ? 1 - (t - SWING.start - .1) / .25 : 0;
      // the attack itself, drawn while each hit is out
      A.hits.forEach((h, i) => {
        const k = (t - (h - .08)) / .2; if (k < 0 || k > 1) return;
        const a = 1 - Math.abs(k - .45) * 1.6, reach = PX - x - 30 + (r.ev[i].kind === 'whiff' ? 40 : 0);
        if (state.atk === 'heavy') sprite(g, 'Swoosh_Hostile', x + reach * .7, AY, 70, 140, { alpha: a, rot: .1 });
        else if (state.atk === 'throw') sprite(g, 'Chain', x + 40 + reach * .45, AY, reach * .9, 30, { alpha: a });
        else { g.save(); g.globalAlpha = a * .85; g.fillStyle = '#b0243a'; g.beginPath(); g.roundRect(x + 30, AY - 9 + (i - 1) * 10 * (A.hits.length > 1), reach, 18, 6); g.fill(); g.restore(); }
      });
      const R = 34;
      if (ready(ART.Monster)) g.drawImage(ART.Monster, x - R, AY - R, 2 * R, 2 * R);
      if (flash > 0) { g.save(); g.globalAlpha = flash * .7; g.fillStyle = '#fff'; g.beginPath(); g.arc(x, AY, R, 0, TAU); g.fill(); g.restore(); }
      hpBar(MX, AY - 70, HP - now.dealt, '#ff6b6b');
      label(g, 'Monster', MX, AY + 58, { col: '#3b3b3b', size: 17 });
    }

    function drawHero(t, now) {
      // step into the swing so the hammer head lands on the monster
      let step = 0;
      if (!now.cut) {
        const s0 = SWING.start - .1, s1 = SWING.active + .25;
        if (t > s0 && t <= s0 + .15) step = -30 * ease((t - s0) / .15);
        else if (t > s0 + .15 && t <= s1) step = -30;
        else if (t > s1) step = -30 * (1 - ease((t - s1) / .3));
      }
      const x = PX + now.push + step + (now.done.some(e => e.kind === 'absorb' && t - e.t < .12) ? Math.sin(t * 90) * 3 : 0), R = 34, mode = state.mode;
      // protection aura during the guarded window
      if (now.guard) {
        if (mode === 'super') {
          const p = .5 + .5 * Math.sin(t * 14);
          g.save(); g.strokeStyle = '#ffb547'; g.globalAlpha = .55 + .35 * p; g.lineWidth = 7; g.beginPath(); g.arc(x, AY, R + 9, 0, TAU); g.stroke(); g.restore();
          const left = state.cap === Infinity ? '∞' : Math.max(0, state.cap - now.done.filter(e => e.kind === 'absorb').length);
          label(g, `armor ${left}`, x, AY + 58, { col: '#b8741a', size: 16 });
        } else if (mode === 'armor') {
          sprite(g, 'Protect_Friendly', x - 46, AY, 120, 50, { rot: -Math.PI / 2, alpha: .9 });
          label(g, '-50% damage', x, AY + 58, { col: '#2a6fa0', size: 16 });
        } else if (mode === 'immune') {
          sprite(g, 'Zone_Friendly', x, AY + 10, 110, 110, { alpha: .35 });
          label(g, 'invulnerable', x, AY + 58, { col: '#7a4bb8', size: 16 });
        }
      }
      // the hammer: raised through the wind-up, smashed down on the swing, dropped if you're interrupted
      let rot;
      if (now.cut) rot = -2.1 * clamp(now.cut.t / SWING.start, 0, 1) * (1 - ease((t - now.cut.t) / .3)) + .9 * ease((t - now.cut.t) / .3);
      else if (t < SWING.start) rot = -2.1 * ease(t / SWING.start);
      else if (t < SWING.active) rot = -2.1 + 2.1 * ease((t - SWING.start) / .1);   // 0 points the head straight at the monster
      else rot = 0;
      g.save(); g.translate(x, AY); g.rotate(rot - Math.PI / 2);
      if (ready(ART.Hammer)) g.drawImage(ART.Hammer, -24, -118, 48, 68);
      g.fillStyle = '#5b5b5b'; g.fillRect(-3, -60, 6, 30);
      g.restore();
      const ghost = now.guard && mode === 'immune';
      g.save(); g.globalAlpha = ghost ? .45 : 1; g.translate(x, AY); g.rotate(-Math.PI / 2);
      const img = ART[now.stunned ? 'Token_Player3' : 'Token_Player1'];
      if (ready(img)) g.drawImage(img, -R, -R, 2 * R, 2 * R);
      g.restore();
      if (now.stunned) { sprite(g, 'Dizzy_Swirl', x, AY - 60, 36, 42, { rot: t * 6 }); label(g, 'HIT STUN', x, AY + 58, { col: '#c23b3b', size: 16 }); }
      if (now.cut && !now.stunned && t > now.cut.t) label(g, 'swing cancelled', x, AY + 58, { col: '#c23b3b', size: 16 });
      hpBar(PX, AY - 82, HP - now.took, '#3b8cff');
      label(g, 'You', PX, AY - 96, { col: '#3b3b3b', size: 17 });
      // impacts and floating numbers
      now.done.forEach((e, i) => {
        const k = (t - e.t) / .9; if (k > 1) return;
        const ix = x - 30, a = 1 - k;
        if (e.kind === 'whiff') sprite(g, 'Not_Symbol', ix, AY, 46, 46, { alpha: a });
        else if (e.kind === 'break') sprite(g, 'ShieldBreak_Left_Hostile', ix, AY, 44, 84, { alpha: a });
        else if (e.kind === 'absorb') sprite(g, 'Shielded_Friendly', ix, AY, 40, 56, { alpha: a });
        if (e.kind !== 'whiff' && k < .35) sprite(g, 'Hit_Hostile', ix, AY, 80, 80, { alpha: 1 - k / .35 });
        label(g, KIND[e.kind].txt(e.dmg), x + (i % 2 ? 40 : -10), AY - 120 - i * 26 - k * 40, { col: e.kind === 'whiff' ? '#7a4bb8' : e.kind === 'absorb' ? '#b8741a' : e.kind === 'armor' ? '#2a6fa0' : '#c23b3b', size: 24, weight: 700 });
      });
      // your hammer landing
      if (r.lands) {
        const k = (t - SWING.start - .1) / .9;
        if (k > 0 && k < 1) {
          if (k < .35) sprite(g, 'Hit_Friendly', MX + 10, AY, 90, 90, { alpha: 1 - k / .35 });
          label(g, `-${SWING.dmg}`, MX, AY - 100 - k * 40, { col: '#1d6fd1', size: 26, weight: 700 });
        }
      }
    }

    function drawTimeline(t, now) {
      const y = 448, h = 34, x0 = tx(0);
      label(g, 'Your heavy swing', x0, y - 26, { col: '#fbfbfd', size: 18, align: 'left' });
      label(g, `${Math.min(t, SWING.end).toFixed(2)}s`, W - 70, y - 26, { col: '#a9b7d6', size: 16, align: 'right' });
      // the guarded window sits above the frame strip
      if (state.mode !== 'none') {
        const m = MODES[state.mode], gx = tx(SWING.guard[0]), gw = tx(SWING.guard[1]) - gx;
        g.fillStyle = m.col; g.globalAlpha = .9; g.beginPath(); g.roundRect(gx, y - 10, gw, 7, 3); g.fill(); g.globalAlpha = 1;
        label(g, `${m.name} window`, gx + gw, y - 24, { col: m.col, size: 15, align: 'right' });
      }
      const seg = (a, b, col, txt, tcol = '#071a3d') => {
        g.fillStyle = col; g.fillRect(tx(a), y, tx(b) - tx(a), h);
        label(g, txt, (tx(a) + tx(b)) / 2, y + h / 2, { col: tcol, size: 15 });
      };
      seg(0, SWING.start, '#8a94a8', 'Wind-up');
      seg(SWING.start, SWING.active, '#ff7b8a', 'Swing');
      seg(SWING.active, SWING.end, '#6b778f', 'Recovery', '#fff');
      if (r.cut) {   // everything after the interrupt is lost
        const cx = tx(r.cut.t);
        g.fillStyle = 'rgba(7,26,61,.78)'; g.fillRect(cx, y, tx(SWING.end) - cx, h);
        label(g, 'cancelled by hit stun', (cx + tx(SWING.end)) / 2, y + h / 2, { col: '#ff6b6b', size: 15 });
      }
      // hit markers
      r.ev.forEach(e => {
        const ex = tx(e.t), on = t >= e.t;
        g.fillStyle = KIND[e.kind].col; g.globalAlpha = on ? 1 : .35;
        g.beginPath(); g.moveTo(ex, y + h + 4); g.lineTo(ex - 9, y + h + 18); g.lineTo(ex + 9, y + h + 18); g.fill();
        g.fillRect(ex - 1.5, y - 4, 3, h + 8); g.globalAlpha = 1;
      });
      // playhead
      const px = tx(Math.min(t, SWING.end));
      g.strokeStyle = '#fbfbfd'; g.lineWidth = 2; g.beginPath(); g.moveTo(px, y - 16); g.lineTo(px, y + h + 6); g.stroke();
      // legend
      const items = [['hit', 'Hit'], ['armor', 'Reduced'], ['absorb', 'Absorbed'], ['whiff', 'Missed']];
      let lx = x0;
      items.forEach(([k, txt]) => {
        g.fillStyle = KIND[k].col; g.beginPath(); g.moveTo(lx, y + h + 46); g.lineTo(lx - 7, y + h + 58); g.lineTo(lx + 7, y + h + 58); g.fill();
        label(g, txt, lx + 14, y + h + 52, { col: '#a9b7d6', size: 15, align: 'left' });
        lx += 120;
      });
    }

    return dt => {
      state.t += dt * (state.slow ? .5 : 1);
      if (state.t > LEN + HOLD) state.t = 0;
      const t = Math.min(state.t, LEN), now = at(t);
      g.clearRect(0, 0, W, H);
      g.fillStyle = '#ebebeb'; g.strokeStyle = '#3b3b3b'; g.lineWidth = 2; g.beginPath(); g.roundRect(10, 10, W - 20, 380, 12); g.fill(); g.stroke();
      drawMonster(t, now);
      drawHero(t, now);
      if (t >= LEN - .3) {   // verdict banner once it's played out
        const a = clamp((t - LEN + .3) / .3, 0, 1), col = r.win === 'atk' ? '#c23b3b' : r.win === 'you' ? '#2fae6a' : '#b8741a';
        g.save(); g.globalAlpha = a; label(g, r.verdict, W / 2, 352, { col, size: 30, weight: 700 }); g.restore();
      }
      drawTimeline(t, now);
    };
  });

  /* ---------- the outcome grid ---------- */
  demo('grid', {
    init(s) { s._draw = () => drawGrid(s); },
    enter(s) { s._draw(); },
  });
  function drawGrid(s) {
    const tbl = $(s, '.gr');
    tbl.innerHTML = '<tr><th></th>' + Object.values(ATK).map(a => `<th>${a.name}</th>`).join('') + '</tr>' +
      Object.keys(MODES).map(m => `<tr><th class="${{ armor: 'ar', super: 'sa', immune: 'im' }[m] || ''}">${MODES[m].name}</th>` + Object.keys(ATK).map(k => {
        const x = resolve(m, k, state), col = x.win === 'atk' ? '#f0a35e' : x.win === 'you' ? '#2fae6a' : '#e8c35e';
        return `<td style="--c:${col}" data-m="${m}" data-a="${k}"><b>${x.verdict}</b><span>took ${x.took} · ${x.lands ? 'swing lands' : 'swing cancelled'}</span></td>`;
      }).join('') + '</tr>').join('');
    $$(tbl, 'td').forEach(td => td.onclick = () => {
      const i = [...document.querySelectorAll('.slide')].findIndex(x => x.dataset.demo === 'trade');
      FPF.go(i);
      shared?.set({ mode: td.dataset.m, atk: td.dataset.a });
      if (!shared) Object.assign(state, { mode: td.dataset.m, atk: td.dataset.a, t: 0 });
    });
  }

  /* ---------- which would you use? (Spine mockups) ---------- */
  // answers follow the deck's "When to use" slides. `shows` says who does what in the mockup, since in several
  // of them the monster is the one acting and P1 (blue) only reacts.
  const CASES = [
    { anim: 'Drunk Swing And Recover', name: 'Monster’s heavy swing', a: 'super',
      shows: 'The <b class="atk">monster</b> winds up and swings its weapon (red hitbox). P1 steps back out of range, and the monster staggers (dizzy swirl) while it recovers from the miss.',
      q: 'Players keep jabbing the monster out of this wind-up, so the swing never comes out. What do you give the monster during the wind-up?',
      why: { super: 'Yes. Super armor gives slow, weighty attacks a leg up over faster ones, and throws and multi-hits are still counterplay. Note the stagger at the end: that recovery stays unprotected, so stepping back and punishing still works.', armor: 'Armor would make the jabs hurt less, but they’d still interrupt it. The swing would still never come out.', immune: 'Immunity would work, but nothing could ever stop it. Save that for high-investment moves; super armor keeps it answerable.' } },
    { anim: 'Stab n Dash', name: 'P1’s charging dash', a: 'super',
      shows: '<b class="def">P1</b> dashes through a line of monsters, stabbing as it goes (blue cone).',
      q: 'A charging stab-and-dash, like a bull rampaging across the arena. What do you give P1 during the dash?',
      why: { super: 'Yes. You still want it attackable, just not interruptible. The rampage keeps going but every hit costs health.', armor: 'Armor would let any jab stop the charge. Not much of a rampage.', immune: 'Immune and moving across the arena is a free escape. Super armor keeps the risk.' } },
    { anim: 'Mace Special', name: 'P1’s super attack', a: 'immune',
      shows: '<b class="def">P1</b> charges a special (the hitbox in front of P1 turns yellow), then it lands and the monster squashes from the hit.',
      q: 'An expensive super attack. When the player spends the meter, it should beat any weaker attack. What does P1 get while charging?',
      why: { immune: 'Yes. Immunity forces a high-investment move to always win against weaker attacks: hits simply don’t land.', super: 'Reasonable, and Tekken and Mortal Kombat do exactly this. But the deck’s default for “must always win” is immunity.', armor: 'Armor would let a jab knock the player out of a move they paid meter for.' } },
    { anim: 'Shield Hold', name: 'P1’s braced stance', a: 'armor',
      shows: 'The <b class="atk">monster</b> swings, and it lands on <b class="def">P1</b>’s raised shield (the box flashes). P1 holds still.',
      q: 'Imagine P1 holds a braced stance (or a 10-second transformation) that should make them tougher, without changing who wins exchanges. What does the stance give?',
      why: { armor: 'Yes. Armor makes characters take less damage without changing any other relationship. Players are stronger but still have to pay attention.', super: 'Seconds of no flinching changes every interaction in the fight. Too much.', immune: 'Seconds of immunity just means the opponent waits it out.' } },
    { anim: 'Dagger Parry', name: 'P1’s parry', a: 'immune',
      shows: 'The <b class="atk">monster</b> swings, <b class="def">P1</b> parries with a dagger, and the monster is stunned (dizzy swirl) by the parry.',
      q: 'A quick defensive skill. While P1’s parry is up, players need a clear and complete sense of safety. What covers the parry window?',
      why: { immune: 'Yes. Defensive skills like parries and dodge rolls get i-frames: easy to understand, all or nothing. Balance it with the recovery.', super: 'Taking full damage during a parry would feel like it failed.', armor: 'Half damage and still flinching is not a defense anyone will pick.' } },
  ];
  demo('pick', {
    init(s) {
      const box = $(s, '.pk-spine'), cap = $(s, '.pk-shows'), cases = $(s, '.pk-cases'), q = $(s, '.pk-q'), out = $(s, '.pk-out');
      let cur = 0, loaded = false;
      cases.innerHTML = CASES.map((c, i) => `<button class="btn" data-c="${i}">${c.name}</button>`).join('');
      const show = i => {
        cur = i; const c = CASES[i];
        $$(cases, '.btn').forEach((b, j) => b.classList.toggle('on', j === i));
        $$(s, '[data-pick]').forEach(b => b.classList.remove('yes', 'no'));
        say(cap, '<span class="muted">On screen:</span> ' + c.shows);
        q.textContent = c.q; say(out, '<span class="muted">Pick one.</span>');
        if (loaded) s._p.setAnimation(c.anim, true);
      };
      $$(s, '[data-pick]').forEach(b => b.onclick = () => {
        const c = CASES[cur], ok = b.dataset.pick === c.a;
        $$(s, '[data-pick]').forEach(x => x.classList.remove('yes', 'no'));
        b.classList.add(ok ? 'yes' : 'no');
        say(out, c.why[b.dataset.pick]);
      });
      $$(cases, '.btn').forEach(b => b.onclick = () => show(+b.dataset.c));
      if (!window.spine || !window.SPINE_DATA) { box.textContent = 'The Spine player didn’t load.'; show(0); return; }
      s._p = new spine.SpinePlayer(box, {
        skeleton: 'basic-strikes.json', atlas: 'forsaken.atlas', rawDataURIs: window.SPINE_DATA,
        animation: CASES[0].anim, showControls: false, alpha: true, backgroundColor: '#00000000', premultipliedAlpha: true,
        viewport: { padLeft: '6%', padRight: '6%', padTop: '6%', padBottom: '6%' },
        success: () => { loaded = true; s._p.setAnimation(CASES[cur].anim, true); },
        error: (p, msg) => { box.textContent = 'Spine error: ' + msg; },
      });
      show(0);
    },
    enter(s) { s._p?.play(); },
    leave(s) { s._p?.pause(); },
  });
})();
