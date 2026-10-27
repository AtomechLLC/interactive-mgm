/* Core Gameplay Actions (MGM course 4, module 4, slides 428 to 434): the slide demos.
   One set of rules (hitboxes, moves, outcomes) drives every demo, so the outcome grid on the
   "overpowered dodges" slide, the 433 diagram and the duel can never disagree. */
(function () {
  const { $, $$, canvasDemo, demo, say, ptr, store } = FPF.kit;
  const TAU = Math.PI * 2, UP = -Math.PI / 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ---------- Forsaken ability token art (Design/Abilities/images) ---------- */
  const ART = {};
  ['Token_Player1', 'Token_Player3', 'Monster', 'Trapezoid_Friendly', 'Shielded_Friendly', 'Hit_Hostile', 'Hit_Friendly', 'Dizzy_Swirl', 'Arena']
    .forEach(n => { const i = new Image(); i.src = '../../assets/img/forsaken/' + n + '.png'; ART[n] = i; });
  const ready = i => i.complete && i.naturalWidth;
  const TR = 26;   // token radius

  // the hero token: blue, turning yellow when hit (the slides' convention)
  function hero(g, x, y, { face = UP, hit = false, alpha = 1, r = TR } = {}) {
    const img = ART[hit ? 'Token_Player3' : 'Token_Player1'];
    g.save(); g.globalAlpha *= alpha; g.translate(x, y); g.rotate(face + Math.PI / 2);
    if (ready(img)) g.drawImage(img, -r, -r, 2 * r, 2 * r);
    else { g.fillStyle = hit ? '#e2cf1f' : '#2aa4e0'; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill(); }
    g.restore();
  }
  function foe(g, x, y, { flash = 0, glow = 0, r = TR + 2 } = {}) {
    if (glow > 0) { g.save(); g.globalAlpha = glow; g.fillStyle = '#ff3b3b'; g.beginPath(); g.arc(x, y, r + 10 + glow * 6, 0, TAU); g.fill(); g.restore(); }
    if (ready(ART.Monster)) g.drawImage(ART.Monster, x - r, y - r, 2 * r, 2 * r);
    else { g.fillStyle = '#777'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
    if (flash > 0) { g.save(); g.globalAlpha = flash * .6; g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.restore(); }
  }
  function sprite(g, name, x, y, w, h, { rot = 0, alpha = 1 } = {}) {
    const i = ART[name]; if (!ready(i)) return;
    g.save(); g.globalAlpha *= alpha; g.translate(x, y); g.rotate(rot); g.drawImage(i, -w / 2, -h / 2, w, h); g.restore();
  }
  // the green trapezoid the slides use for "movement", with QS written on it
  function qsMark(g, x, y, alpha = 1, rot = 0) {
    sprite(g, 'Trapezoid_Friendly', x, y, 44, 28, { alpha, rot });
    g.save(); g.globalAlpha *= alpha; g.translate(x, y); g.rotate(rot); g.fillStyle = '#0d4a3a'; g.font = '600 13px Jost'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('QS', 0, 0); g.restore();
  }
  function label(g, text, x, y, { col = '#1c2a44', size = 18, weight = 600, align = 'center' } = {}) {
    g.font = `${weight} ${size}px Jost, sans-serif`; g.fillStyle = col; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(text, x, y);
  }
  function arena(g, x, y, w, h) {   // the light panel the slide diagrams sit on
    g.save(); g.fillStyle = '#ebebeb'; g.strokeStyle = '#3b3b3b'; g.lineWidth = 2; g.beginPath(); g.roundRect(x, y, w, h, 10); g.fill(); g.stroke(); g.restore();
  }
  function arrow(g, x1, y1, x2, y2, { dash = false, col = '#222', bend = 0 } = {}) {
    const mx = (x1 + x2) / 2 - (y2 - y1) * bend, my = (y1 + y2) / 2 + (x2 - x1) * bend;
    g.save(); g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 2.5; if (dash) g.setLineDash([7, 6]);
    g.beginPath(); g.moveTo(x1, y1); g.quadraticCurveTo(mx, my, x2, y2); g.stroke(); g.setLineDash([]);
    const a = Math.atan2(y2 - my, x2 - mx);
    g.beginPath(); g.moveTo(x2, y2); g.lineTo(x2 - 13 * Math.cos(a - .4), y2 - 13 * Math.sin(a - .4)); g.lineTo(x2 - 13 * Math.cos(a + .4), y2 - 13 * Math.sin(a + .4)); g.fill();
    g.restore();
  }

  /* ---------- the rules ---------- */
  // reach and width in pixels; a sweep's arc is its half-angle
  const ATK = {
    thrust: { name: 'Thrust', reach: 290, half: 15, dmg: 20, block: 18 },
    sweep: { name: 'Sweep', reach: 165, arc: 1.3, dmg: 25, block: 34 },
  };
  const DIST = 130;   // where the defender starts, in front of the attacker
  // moves, in the attacker's frame: away = further from the attacker, side = sideways
  const MOVES = {
    none: { name: 'No action' },
    block: { name: 'Block', short: 'Block' },
    dodge: { name: 'Dodge roll', short: 'Dodge', away: 170, dur: .42, rec: .38, iframes: [.03, .36], stam: 25 },
    back: { name: 'Quickstep back', short: 'QS back', qs: true, away: 80, dur: .13, rec: .1, stam: 10 },
    left: { name: 'Quickstep left', short: 'QS left', qs: true, side: -80, dur: .13, rec: .1, stam: 10 },
    right: { name: 'Quickstep right', short: 'QS right', qs: true, side: 80, dur: .13, rec: .1, stam: 10 },
    fwd: { name: 'Quickstep in', short: 'QS in', qs: true, away: -55, dur: .13, rec: .1, stam: 10 },
  };

  // does a token at (x, y) overlap the attack fired from (ax, ay) facing f?
  // A: optional shape override ({ reach, half } or { reach, arc }), for slides that let students retune it
  function inHitbox(kind, ax, ay, f, x, y, r = TR, A = ATK[kind]) {
    const dx = x - ax, dy = y - ay, c = Math.cos(f), s = Math.sin(f);
    const along = dx * c + dy * s, side = -dx * s + dy * c;
    if (kind === 'thrust') return along > -r && along < A.reach + r && Math.abs(side) < A.half + r;
    const d = Math.hypot(dx, dy);
    if (d > A.reach + r) return false;
    if (d < r + 20) return true;
    return Math.abs(Math.atan2(side, along)) < A.arc + Math.asin(Math.min(1, r / d));
  }
  // where a move leaves a defender who started at base, facing an attacker that faces f
  function moved(move, bx, by, f) {
    const m = MOVES[move] || {}, a = m.away || 0, sd = m.side || 0;
    return { x: bx + a * Math.cos(f) - sd * Math.sin(f), y: by + a * Math.sin(f) + sd * Math.cos(f) };
  }

  // adv: +2 strong advantage defender (counterattack), +1 minor defender, 0 neutral, -1 attacker, -2 punished
  const ADV = {
    2: { col: '#2fae6a', tag: 'Advantage defender' }, 1: { col: '#86c98f', tag: 'Minor advantage defender' }, 0: { col: '#b9bfc9', tag: 'Neutral' },
    '-1': { col: '#f0a35e', tag: 'Advantage attacker' }, '-2': { col: '#e0524f', tag: 'Strong advantage attacker' },
  };
  function outcome(kind, move, { oldQS = false } = {}) {
    const m = MOVES[move], A = ATK[kind], R = (adv, res, why) => ({ adv, res, why, tag: ADV[adv].tag, col: ADV[adv].col });
    if (move === 'block') return kind === 'thrust'
      ? R(1, 'Blocked', 'Thrusts are light: you absorb it cheaply and recover first.')
      : R(0, 'Blocked', 'The sweep’s weight costs a lot of stamina and pushes you back. Nobody gains.');
    if (move === 'dodge') return R(-1, 'Evaded', 'The roll’s i-frames beat anything, but its long recovery lets the attacker reset first.');
    if (m.qs && oldQS) return R(2, 'Evaded', 'With i-frames, a quickstep in any direction is safe, and it’s fast enough to punish. It beats everything.');
    const p = moved(move, DIST, 0, 0);
    if (!inHitbox(kind, 0, 0, 0, p.x, p.y)) return R(2, 'Evaded', `You stepped out of the ${A.name.toLowerCase()} and are free first: counterattack!`);
    if (!m.qs) return R(-1, 'Hit', `No defense: the ${A.name.toLowerCase()} lands.`);
    const why = kind === 'thrust'
      ? (move === 'back' ? 'Thrusts have long reach: backing up keeps you on the line. Step aside.' : 'Stepping in walks onto the blade.')
      : (move === 'fwd' ? 'Stepping in puts you right inside the arc.' : 'Sweeps are wide: a sidestep stays inside the arc. Step back.');
    return R(-2, 'Punished', why);
  }

  /* ---------- drawing an attack ---------- */
  // t: 0..1 progress through the swing; tele: draw as a faint telegraph of the whole shape instead
  function drawAttack(g, kind, ax, ay, f, { t = 1, alpha = 1, tele = false, A = ATK[kind] } = {}) {
    g.save(); g.translate(ax, ay); g.rotate(f); g.globalAlpha *= alpha;
    if (kind === 'thrust') {
      const len = tele ? A.reach : A.reach * ease(t / .6);
      const gr = g.createLinearGradient(20, 0, 20 + A.reach, 0);
      gr.addColorStop(0, 'rgba(150,30,50,.08)'); gr.addColorStop(1, 'rgba(176,36,58,.85)');
      g.fillStyle = tele ? 'rgba(200,40,60,.18)' : gr;
      g.beginPath(); g.roundRect(20, -A.half, len, A.half * 2, 4); g.fill();
      if (tele) { g.setLineDash([8, 6]); g.strokeStyle = 'rgba(176,36,58,.7)'; g.lineWidth = 2; g.stroke(); }
    } else {
      const a0 = -A.arc, a1 = tele ? A.arc : -A.arc + 2 * A.arc * ease(t);
      const gr = g.createRadialGradient(0, 0, 24, 0, 0, A.reach);
      gr.addColorStop(0, 'rgba(150,30,50,0)'); gr.addColorStop(.55, 'rgba(160,32,52,.25)'); gr.addColorStop(1, 'rgba(176,36,58,.85)');
      g.fillStyle = tele ? 'rgba(200,40,60,.15)' : gr;
      g.beginPath(); g.arc(0, 0, A.reach, a0, a1); g.arc(0, 0, 24, a1, a0, true); g.closePath(); g.fill();
      if (tele) { g.setLineDash([8, 6]); g.strokeStyle = 'rgba(176,36,58,.7)'; g.lineWidth = 2; g.stroke(); }
      else { g.strokeStyle = 'rgba(120,10,30,.9)'; g.lineWidth = 4; g.beginPath(); g.moveTo(24 * Math.cos(a1), 24 * Math.sin(a1)); g.lineTo(A.reach * Math.cos(a1), A.reach * Math.sin(a1)); g.stroke(); }
    }
    g.restore();
  }
  // the hero's own counter swing, in friendly blue
  function counterSwing(g, x, y, f, t) {
    g.save(); g.translate(x, y); g.rotate(f); g.globalAlpha = 1 - t;
    g.strokeStyle = '#4fc3ff'; g.lineWidth = 10; g.lineCap = 'round';
    g.beginPath(); g.arc(0, 0, 70, -1 + t * .6, .9 * t + .2); g.stroke(); g.restore();
  }

  /* ================= 428: timing chart of an attack ================= */
  canvasDemo('timing', (s, c, g) => {
    const W = c.width, H = c.height, FPS = 60, REACT = 15;   // ~250 ms to see, decide and press
    const inp = n => $(s, `[data-k=${n}]`);
    const out = $(s, '.tm-out');
    let play = null, slow = false, result = '';
    const P = () => ({ ant: +inp('ant').value, act: +inp('act').value, rec: +inp('rec').value, lat: +inp('lat').value });
    function readouts() {
      const p = P();
      $$(s, '[data-v]').forEach(el => {
        const k = el.dataset.v; el.textContent = k === 'lat' ? `${p.lat} ms` : `${p[k]} f · ${Math.round(p[k] * 1000 / FPS)} ms`;
      });
    }
    $$(s, 'input[data-k]').forEach(i => i.oninput = () => { readouts(); result = ''; });
    readouts();
    const start = () => { play = { t: 0, pressed: null }; result = ''; };
    $(s, '.tm-play').onclick = start;
    $(s, '.tm-slow').onclick = e => { slow = !slow; e.currentTarget.classList.toggle('on', slow); };
    const react = () => {
      if (!play || play.pressed != null) return;
      const p = P(), f = play.t * FPS, seen = p.lat / (1000 / FPS);
      play.pressed = f;
      if (f < seen) result = `<b class="bad">Too early.</b> You blocked before the attack even reached your screen: that’s a guess, not a reaction.`;
      else if (f < p.ant) result = `<b class="good">Blocked!</b> You reacted ${Math.round((f - seen) * 1000 / FPS)} ms after the wind-up appeared on your screen.`;
      else result = `<b class="bad">Too late</b> by ${Math.round((f - p.ant) * 1000 / FPS)} ms. ${p.ant - seen < REACT ? 'With this little anticipation, nobody can react: they have to predict.' : 'Try again, or lengthen the anticipation.'}`;
    };
    $(s, '.tm-react').onclick = react;
    document.addEventListener('keydown', e => {
      if (!s.classList.contains('active') || e.code !== 'KeyK' || e.repeat) return;
      e.stopPropagation(); react();
    });

    return dt => {
      const p = P(), total = p.ant + p.act + p.rec, seen = p.lat / (1000 / FPS);
      if (play) { play.t += dt * (slow ? .25 : 1); if (play.t * FPS > total + 30) { if (play.pressed == null && !result) result = '<b class="bad">No block.</b> Press K (or the button) when you see the wind-up.'; play = null; } }
      const f = play ? play.t * FPS : -1;
      g.clearRect(0, 0, W, H);

      // the duel, as the defender sees it (the attack shows up `lat` late)
      arena(g, 10, 10, 400, H - 20);
      const mx = 210, my = H - 90, px = 210, py = my - DIST;
      const vf = f - seen;   // frame of the attack as drawn on the defender's screen
      const hitNow = play && f >= p.ant && f < p.ant + p.act;
      const blocked = play && play.pressed != null && play.pressed < p.ant && play.pressed >= seen;
      foe(g, mx, my, { glow: vf >= 0 && vf < p.ant ? .25 + .25 * Math.sin(play.t * 30) : 0 });
      if (vf >= 0 && vf < p.ant) drawAttack(g, 'thrust', mx, my, UP, { tele: true, alpha: .3 + .7 * vf / p.ant });
      if (play && f >= p.ant && f < p.ant + p.act + 8) drawAttack(g, 'thrust', mx, my, UP, { t: (f - p.ant) / p.act });
      hero(g, px, py, { face: Math.PI / 2, hit: hitNow && !blocked });
      if (blocked && f >= p.ant - 4) sprite(g, 'Shielded_Friendly', px, py + 34, 46, 30, { rot: Math.PI / 2 * 0 });
      if (hitNow && !blocked) sprite(g, 'Hit_Hostile', px, py, 70, 70, { alpha: .8 });
      label(g, play ? (vf < 0 ? 'waiting for the server…' : 'press K to block') : 'press ▶ to attack', 210, 36, { col: '#40506e', size: 18 });

      // the timing chart
      const x0 = 470, x1 = W - 30, y = 190, pf = (x1 - x0) / total, X = fr => x0 + fr * pf;
      label(g, 'Timing chart for an attack', (x0 + x1) / 2, 40, { col: '#fff', size: 30, weight: 600 });
      const seg = (a, b, col, name, ly) => {
        g.fillStyle = col; g.fillRect(X(a), y - 4, X(b) - X(a), 8);
        label(g, name, (X(a) + X(b)) / 2, ly, { col, size: 20 });
      };
      seg(0, p.ant, '#3fbf4f', 'Anticipation', y - 52);
      seg(p.ant, p.ant + p.act, '#e23a3a', 'Slash', y - 52);
      seg(p.ant + p.act, total, '#3b8cff', 'Recovery', y - 52);
      for (let i = 0; i <= total; i++) {
        const col = i <= p.ant ? '#3fbf4f' : i <= p.ant + p.act ? '#e23a3a' : '#3b8cff';
        const big = i % 5 === 0 || i === p.ant || i === p.ant + p.act;
        g.fillStyle = col; g.fillRect(X(i) - 1.5, y - (big ? 26 : 16), 3, big ? 52 : 32);
      }
      // compression: the last third of the wind-up bunches up before the release
      const c0 = Math.floor(p.ant * .66);
      for (let i = c0; i < p.ant; i++) { g.fillStyle = '#3fbf4f'; g.fillRect(X(i + .5) - 1, y - 20, 2, 40); }
      label(g, 'compression before release', X((c0 + p.ant) / 2), y + 44, { col: '#3fbf4f', size: 16 });

      // the reaction window: from when the attack appears on screen, ~15 frames to respond
      const r0 = seen, r1 = seen + REACT, okR = r1 <= p.ant, ry = y + 96;
      g.fillStyle = okR ? 'rgba(95,224,160,.18)' : 'rgba(255,107,107,.2)'; g.fillRect(X(r0), ry - 16, X(Math.min(r1, total)) - X(r0), 32);
      g.strokeStyle = okR ? '#5fe0a0' : '#ff6b6b'; g.lineWidth = 2; g.strokeRect(X(r0), ry - 16, X(Math.min(r1, total)) - X(r0), 32);
      label(g, `human reaction ≈ ${REACT} f`, X(r0) + 8, ry, { col: okR ? '#5fe0a0' : '#ff6b6b', size: 16, align: 'left' });
      if (seen > 0) {
        g.fillStyle = 'rgba(169,183,214,.25)'; g.fillRect(X(0), ry - 16, X(seen) - X(0), 32);
        label(g, 'latency', X(seen / 2), ry + 30, { col: '#a9b7d6', size: 15 });
      }
      label(g, okR ? `Reactable: ${Math.round((p.ant - seen) * 1000 / FPS)} ms of wind-up is visible, enough to respond.`
        : `Not reactable: only ${Math.max(0, Math.round((p.ant - seen) * 1000 / FPS))} ms of wind-up is visible. Defenders must predict.`,
        (x0 + x1) / 2, ry + 66, { col: okR ? '#5fe0a0' : '#ff6b6b', size: 20 });
      // playhead
      if (f >= 0) { g.fillStyle = '#fff'; g.fillRect(X(Math.min(f, total)) - 1.5, y - 70, 3, 200); }
      if (play && play.pressed != null) { g.fillStyle = '#ffb547'; g.beginPath(); g.arc(X(Math.min(play.pressed, total)), y - 34, 7, 0, TAU); g.fill(); }
      say(out, result || 'Each tick is one frame at 60 fps. Drag the sliders, then press ▶ and block (K) the moment you see the wind-up.');
    };
  });

  /* ================= 429: sweeps vs thrusts ================= */
  canvasDemo('offense', (s, c, g) => {
    const W = c.width, H = c.height, PW = W / 2, out = $(s, '.off-out');
    const panels = [{ kind: 'sweep', cx: PW / 2 }, { kind: 'thrust', cx: PW + PW / 2 }];
    const MY = H - 70;
    let off = { x: 0, y: -DIST }, drag = false, t = 0, reach = true;   // hero offset from the attacker, same in both panels
    const place = e => {
      const q = ptr(c, e), cx = q.x < PW ? panels[0].cx : panels[1].cx;
      off = { x: clamp(q.x - cx, -PW / 2 + 30, PW / 2 - 30), y: clamp(q.y - MY, -MY + 60, -40) };
    };
    c.onpointerdown = e => { drag = true; c.setPointerCapture(e.pointerId); place(e); };
    c.onpointermove = e => drag && place(e);
    c.onpointerup = () => drag = false;
    $$(s, '[data-pos]').forEach(b => b.onclick = () => {
      const p = moved(b.dataset.pos, DIST, 0, 0);   // attacker frame: x = away, y = side
      off = { x: p.y, y: -p.x };
    });
    $(s, '.off-reach').onclick = e => { reach = !reach; e.currentTarget.classList.toggle('on', reach); };
    // this slide's own copies of the shapes, so retuning them here leaves the other slides alone
    const SH = {}, R2D = 180 / Math.PI;
    const tune = () => {
      const v = k => +$(s, `[data-shape=${k}]`).value;
      SH.sweep = { ...ATK.sweep, reach: v('sreach'), arc: v('sarc') / 2 / R2D };
      SH.thrust = { ...ATK.thrust, reach: v('treach'), half: v('twidth') / 2 };
      $(s, '[data-sv=sreach]').textContent = v('sreach') + ' px';
      $(s, '[data-sv=sarc]').textContent = v('sarc') + '°';
      $(s, '[data-sv=treach]').textContent = v('treach') + ' px';
      $(s, '[data-sv=twidth]').textContent = v('twidth') + ' px';
    };
    const defaults = () => {
      const set = (k, val) => $(s, `[data-shape=${k}]`).value = Math.round(val);
      set('sreach', ATK.sweep.reach); set('sarc', ATK.sweep.arc * 2 * R2D); set('treach', ATK.thrust.reach); set('twidth', ATK.thrust.half * 2);
      tune();
    };
    $$(s, '[data-shape]').forEach(i => i.oninput = tune);
    $(s, '.off-default').onclick = defaults;
    defaults();

    return dt => {
      t = (t + dt) % 2.2;
      g.clearRect(0, 0, W, H);
      const res = [];
      panels.forEach(({ kind, cx }) => {
        arena(g, cx - PW / 2 + 12, 12, PW - 24, H - 24);
        const A = SH[kind], hx = cx + off.x, hy = MY + off.y;
        const hit = inHitbox(kind, cx, MY, UP, hx, hy, TR, A);
        res.push([A.name, hit]);
        if (reach) drawAttack(g, kind, cx, MY, UP, { tele: true, alpha: .55, A });
        const sw = t > .7 && t < 1.25;
        if (sw) drawAttack(g, kind, cx, MY, UP, { t: (t - .7) / .35, alpha: t > 1.05 ? (1.25 - t) / .2 : 1, A });
        foe(g, cx, MY, { glow: t < .7 && t > .2 ? .2 : 0 });
        const f = Math.atan2(MY - hy, cx - hx);
        hero(g, hx, hy, { face: f, hit: hit && sw });
        if (hit && sw && t > .85) sprite(g, 'Hit_Hostile', hx, hy, 64, 64, { alpha: .7 });
        const title = kind === 'sweep' ? 'Sweep: wide arc, short reach' : 'Thrust: narrow line, long reach';
        g.font = '600 24px Jost, sans-serif';
        g.fillStyle = 'rgba(235,235,235,.92)'; g.fillRect(cx - g.measureText(title).width / 2 - 10, 24, g.measureText(title).width + 20, 32);   // a long reach runs under the title
        label(g, title, cx, 40, { size: 24 });
        label(g, hit ? 'in the hitbox' : 'safe', hx, hy - 44, { col: hit ? '#b0243a' : '#1f8a4f', size: 17 });
      });
      say(out, res.map(([n, h]) => `<b>${n}:</b> <span class="${h ? 'bad' : 'good'}">${h ? 'hits you' : 'misses'}</span>`).join(' &nbsp;·&nbsp; ')
        + (res[0][1] !== res[1][1] ? ' &nbsp;→ <b class="accent-3">one attack can’t cover both.</b>' : ''));
    };
  });

  /* ================= 430 / 431: the defensive verbs, each looping against both attacks ================= */
  // the right quickstep for each attack, so the loop shows the option working
  const QS_ANSWER = { thrust: 'right', sweep: 'back' };
  function defenseLoop(c, g, verb) {
    const W = c.width, H = c.height, k = W / 560, MY = 460, MX = 280;
    let t = 0, round = 0;
    return dt => {
      t += dt; if (t > 2.4) { t = 0; round++; }
      const kind = round % 2 ? 'sweep' : 'thrust', move = verb === 'qs' ? QS_ANSWER[kind] : verb;
      const m = MOVES[move], o = outcome(kind, move);
      g.clearRect(0, 0, W, H); g.save(); g.scale(k, k);
      arena(g, 8, 8, 544, 544);
      const bx = MX, by = MY - DIST, to = moved(move, bx, by, UP);
      // the defender reacts during the wind-up, at 0.45 s
      const mt = t - .45, back = t > 1.8 ? ease((t - 1.8) / .5) : 0;
      let x = bx, y = by;
      if (m.dur && mt > 0) { x = lerp(bx, to.x, ease(mt / m.dur)); y = lerp(by, to.y, ease(mt / m.dur)); }
      if (verb === 'block' && t > .62) { y -= (kind === 'sweep' ? 30 : 12) * ease((t - .62) / .2); }
      x = lerp(x, bx, back); y = lerp(y, by, back);
      const swing = t > .6 && t < 1.05;
      if (t < .6) drawAttack(g, kind, MX, MY, UP, { tele: true, alpha: t / .6 });
      if (swing) drawAttack(g, kind, MX, MY, UP, { t: (t - .6) / .3, alpha: t > .9 ? (1.05 - t) / .15 : 1 });
      // counterattack when the defender came out ahead
      const counter = o.adv === 2 && t > 1.05 && t < 1.45;
      foe(g, MX, MY, { glow: t < .6 ? .2 : 0, flash: counter ? 1 - (t - 1.05) / .4 : 0 });
      if (counter) counterSwing(g, x, y, Math.atan2(MY - y, MX - x), (t - 1.05) / .4);
      const iframe = verb === 'dodge' && mt > m.iframes[0] && mt < m.iframes[1];
      if (verb === 'qs' && mt > 0 && mt < .5) qsMark(g, lerp(bx, to.x, .5), lerp(by, to.y, .5) + 4, 1 - mt / .5);
      if (verb === 'dodge' && mt > 0 && mt < m.dur + m.rec) {
        for (let i = 1; i <= 3; i++) hero(g, lerp(bx, x, 1 - i * .22), lerp(by, y, 1 - i * .22), { alpha: .18 });
      }
      hero(g, x, y, { face: Math.PI / 2, alpha: iframe ? .45 + .3 * Math.sin(t * 60) : 1, hit: o.res === 'Hit' && swing });
      if (verb === 'block' && t > .35 && t < 1.6) sprite(g, 'Shielded_Friendly', x, y + 38, 54, 36, { rot: Math.PI / 2 * 0 });
      if (verb === 'block' && t > .62 && t < .8) sprite(g, 'Hit_Friendly', x, y + 44, 50, 50, { alpha: 1 - (t - .62) / .18 });
      if (verb === 'dodge' && mt > m.dur && mt < m.dur + m.rec) label(g, 'recovering…', x, y - 46, { col: '#b5651d', size: 22 });
      label(g, `vs ${ATK[kind].name}`, 280, 44, { size: 30 });
      label(g, o.tag, 280, 520, { col: o.adv > 0 ? '#1f8a4f' : o.adv < 0 ? '#b5651d' : '#555', size: 26 });
      g.restore();
    };
  }
  demo('defense', {
    init(s) { s._loops = $$(s, 'canvas.verb').map(c => ({ draw: defenseLoop(c, c.getContext('2d'), c.dataset.verb) })); },
    enter(s) { s._stop = FPF.raf(dt => s._loops.forEach(l => l.draw(dt))); },
    leave(s) { s._stop?.(); },
  });

  /* ================= 432: quick steps used to be overpowered dodges ================= */
  const ROWS = ['block', 'dodge', 'back', 'left', 'right'];
  function grid(el, oldQS) {
    const best = ROWS.map(r => Math.min(...['thrust', 'sweep'].map(k => outcome(k, r, { oldQS }).adv)));
    const top = Math.max(...best), dom = top >= 1 && best.filter(b => b === top).length >= 1 && best.filter(b => b === top).length < ROWS.length ? top : null;
    el.innerHTML = `<table class="og"><tr><th></th><th>vs Thrust</th><th>vs Sweep</th><th></th></tr>` + ROWS.map((r, i) => `<tr${dom != null && best[i] === dom ? ' class="dom"' : ''}><th>${MOVES[r].name}</th>` +
      ['thrust', 'sweep'].map(k => { const o = outcome(k, r, { oldQS }); return `<td style="--c:${o.col}" title="${o.why}"><b>${o.res}</b><span>${o.tag}</span></td>`; }).join('') +
      `<td class="flag">${dom != null && best[i] === dom ? 'never loses' : ''}</td></tr>`).join('') + '</table>';
    return dom != null;
  }
  demo('oldqs', {
    init(s) {
      const box = $(s, '.og-box'), out = $(s, '.og-out');
      const set = oldQS => {
        $$(s, '[data-old]').forEach(b => b.classList.toggle('on', (b.dataset.old === '1') === oldQS));
        const dom = grid(box, oldQS);
        say(out, oldQS
          ? `<b class="bad">A silver bullet.</b> Quickstepping is faster than a dodge and has i-frames, so every direction beats every attack. ${dom ? 'Why would anyone block or roll?' : ''}`
          : `<b class="good">A real decision.</b> Without i-frames, sidestep beats thrust and backstep beats sweep, but guess wrong and you’re punished. Dodge stays the safe, universal (but weaker) answer.`);
      };
      $$(s, '[data-old]').forEach(b => b.onclick = () => set(b.dataset.old === '1'));
      set(true);
    },
  });

  /* ================= 433: which way to step ================= */
  canvasDemo('qs433', (s, c, g) => {
    const W = c.width, H = c.height, PW = W / 2, out = $(s, '.qs-out');
    const dirs = ['back', 'left', 'right'];
    let pick = 'all', t = 0;
    const choose = d => { pick = d; t = 0; $$(s, '[data-qs]').forEach(b => b.classList.toggle('on', b.dataset.qs === d)); };
    $$(s, '[data-qs]').forEach(b => b.onclick = () => choose(b.dataset.qs));
    const KEYS = { KeyS: 'back', KeyA: 'left', KeyD: 'right', KeyW: 'none', KeyQ: 'all' };
    document.addEventListener('keydown', e => {
      if (!s.classList.contains('active') || !KEYS[e.code]) return;
      e.stopPropagation(); choose(KEYS[e.code]);
    });
    choose('all');
    return dt => {
      t += dt; if (t > 3.2) t = 0;
      g.clearRect(0, 0, W, H);
      const shown = pick === 'all' ? dirs : [pick];
      const lines = [];
      [['thrust', PW / 2], ['sweep', PW + PW / 2]].forEach(([kind, cx]) => {
        arena(g, cx - PW / 2 + 12, 12, PW - 24, H - 24);
        const MY = H - 150, bx = cx, by = MY - DIST;
        // the attacker aims at where the hero stood when it committed
        const mt = t - .3, swing = t > .9 && t < 1.5;
        if (t < .9) drawAttack(g, kind, cx, MY, UP, { tele: true, alpha: Math.min(1, t / .5) * .8 });
        foe(g, cx, MY);
        shown.forEach(d => {
          const m = MOVES[d], to = moved(d, bx, by, UP), o = outcome(kind, d);
          const p = mt > 0 && m.dur ? ease(mt / .35) : 0, x = lerp(bx, to.x, p), y = lerp(by, to.y, p);
          if (d !== 'none' && p >= .99) {   // the path and its QS label appear once the step has happened
            arrow(g, bx + (to.x - bx) * .3, by + (to.y - by) * .3, bx + (to.x - bx) * .82, by + (to.y - by) * .82, { bend: d === 'back' ? 0 : (d === 'left' ? .25 : -.25) });
            qsMark(g, lerp(bx, to.x, .55), lerp(by, to.y, .55) - (d === 'back' ? 0 : 22), .95);
          }
          const hit = o.res === 'Punished' || o.res === 'Hit';
          hero(g, x, y, { face: Math.PI / 2, hit: hit && t > 1.05 });
          if (t > 1.1) label(g, hit ? 'punished' : 'counter!', x, y + (d === 'back' ? -44 : 46), { col: hit ? '#b0243a' : '#1f8a4f', size: 18 });
          if (t > 1.1 && pick !== 'all') lines.push(`<b>${MOVES[d].name} vs ${ATK[kind].name.toLowerCase()}:</b> <span class="${hit ? 'bad' : 'good'}">${o.res}</span>. ${o.why}`);
        });
        if (pick === 'all' || pick === 'none') arrow(g, bx - 34, by + 4, bx - 70, by + 14, { dash: true, col: '#444' }), arrow(g, bx + 34, by + 4, bx + 70, by + 14, { dash: true, col: '#444' });
        if (pick === 'none') { const o = outcome(kind, 'none'); hero(g, bx, by, { face: Math.PI / 2, hit: t > 1.05 }); if (t > 1.1) lines.push(`<b>Standing still vs ${ATK[kind].name.toLowerCase()}:</b> <span class="bad">${o.res}</span>.`); }
        if (swing) drawAttack(g, kind, cx, MY, UP, { t: (t - .9) / .35, alpha: t > 1.3 ? (1.5 - t) / .2 : 1 });
        label(g, `vs ${ATK[kind].name}`, cx, 40, { size: 26 });
      });
      say(out, lines.length ? lines.join('<br>') : 'Sidestep a thrust, backstep a sweep. Pick a direction (A / S / D) to see each one on its own.');
    };
  });

  /* ================= the duel: read your opponent ================= */
  const CATS = [['none', 'No action'], ['block', 'Block'], ['dodge', 'Dodge'], ['back', 'QS back'], ['side', 'QS left / right'], ['fwd', 'QS in']];
  const catOf = m => (m === 'left' || m === 'right') ? 'side' : m;
  canvasDemo('duel', (s, c, g) => {
    const W = c.width, H = c.height, MX = W / 2, MY = H - 190, BX = MX, BY = MY - DIST;
    const ui = { out: $(s, '.du-out'), map: $(s, '.du-map'), read: $(s, '.du-read'), hp: $(s, '.du-hp i'), mhp: $(s, '.du-mhp i'), st: $(s, '.du-st i') };
    const MODE = { react: { wind: .78, tele: true }, predict: { wind: .3, tele: false } };
    let mode = 'react', adapt = true, S;
    const map = store.get('mgm:duel-map', {});
    function reset() {
      S = { hp: 100, mhp: 100, st: 100, over: null, t: 0,
        m: { ph: 'idle', t: 0, dur: 1, kind: 'thrust', res: null, flash: 0 },
        p: { x: BX, y: BY, mv: null, block: false, swing: -1, hitT: 0, act: null, ctr: -1 },
        win: 0, hist: [], text: 'Watch the wind-up, then defend: <b>K</b> block (hold), <b>L</b> dodge, <b>A / D</b> quickstep aside, <b>S</b> quickstep back, <b>J</b> counterattack.' };
      draw();
    }
    // the opponent picks the attack that beats what you've been doing lately
    function sweepOdds() {
      if (!adapt || S.hist.length < 2) return .5;
      const h = S.hist.slice(-8), f = c => h.filter(x => x === c).length / h.length;
      return clamp(.5 + .7 * (f('side') + f('block') * .4 - f('back')), .12, .88);
    }
    function act(name) {
      const p = S.p;
      if (S.over) { if (name === 'attack') reset(); return; }
      if (name === 'attack') {
        if (p.mv || p.swing >= 0) return;
        p.swing = 0;
        if (S.win > 0) { const big = S.winAdv === 2; S.mhp = Math.max(0, S.mhp - (big ? 24 : 12)); S.m.flash = 1; S.win = 0; p.ctr = 0; S.text += ` <b class="good">Counterattack! −${big ? 24 : 12}</b>`; }
        return;
      }
      if (p.mv || p.swing >= 0 || p.block) return;
      const m = MOVES[name];
      if (S.st < m.stam) { S.text = '<b class="bad">Out of stamina.</b> Wait for it to come back.'; return; }
      S.st -= m.stam;
      const to = moved(name, BX, BY, UP);
      p.mv = { name, t: 0, fx: p.x, fy: p.y, tx: to.x, ty: to.y };
      p.last = name;
    }
    const KEYS = { KeyA: 'left', KeyD: 'right', KeyS: 'back', KeyW: 'fwd', KeyL: 'dodge', KeyJ: 'attack' };
    document.addEventListener('keydown', e => {
      if (!s.classList.contains('active')) return;
      if (e.code === 'KeyK') { e.stopPropagation(); e.preventDefault(); if (!S.p.mv && S.p.swing < 0) S.p.block = true; return; }
      const a = KEYS[e.code]; if (!a) return;
      e.stopPropagation(); e.preventDefault(); if (!e.repeat) act(a);
    });
    document.addEventListener('keyup', e => { if (e.code === 'KeyK') S.p.block = false; });
    $$(s, '[data-act-btn]').forEach(b => {
      const a = b.dataset.actBtn;
      if (a === 'block') {
        b.onpointerdown = e => { e.preventDefault(); if (!S.p.mv) S.p.block = true; };
        b.onpointerup = b.onpointerleave = () => S.p.block = false;
      } else b.onclick = () => act(a);
    });
    $$(s, '[data-mode]').forEach(b => b.onclick = () => { mode = b.dataset.mode; $$(s, '[data-mode]').forEach(x => x.classList.toggle('on', x === b)); });
    $(s, '.du-adapt').onclick = e => { adapt = !adapt; e.currentTarget.classList.toggle('on', adapt); };
    $(s, '.du-reset').onclick = reset;
    $(s, '.du-clear').onclick = () => { Object.keys(map).forEach(k => delete map[k]); store.set('mgm:duel-map', map); draw(); };

    function resolve() {
      const m = S.m, p = S.p, kind = m.kind, A = ATK[kind];
      const used = p.block && !p.mv ? 'block' : (p.last || 'none');
      const mv = p.mv && MOVES[p.mv.name];
      const inv = mv && mv.iframes && p.mv.t > mv.iframes[0] && p.mv.t < mv.iframes[1];
      let o;
      if (inv) o = outcome(kind, 'dodge');
      else if (used === 'block') {
        S.st -= A.block;
        if (S.st < 0) { S.st = 0; S.hp -= A.dmg / 2; p.hitT = .5; o = { adv: -2, res: 'Guard broken', tag: ADV[-2].tag, col: ADV[-2].col, why: 'You ran out of stamina holding the block.' }; }
        else o = outcome(kind, 'block');
      } else if (inHitbox(kind, MX, MY, UP, p.x, p.y)) {
        const qs = MOVES[used].qs;
        S.hp -= Math.round(A.dmg * (qs ? 1.4 : 1)); p.hitT = .5;
        o = outcome(kind, used === 'dodge' ? 'none' : used);
        if (o.adv >= 0) o = { ...outcome(kind, 'none'), why: used === 'none' ? 'No defense: it lands.' : 'You were still in the hitbox when it landed: too late.' };
      } else {
        o = outcome(kind, used);
        if (o.adv < 2 && used !== 'dodge') o = { ...o, adv: 2, res: 'Evaded', tag: ADV[2].tag, col: ADV[2].col, why: 'You got clear and are free first: counterattack!' };
      }
      m.res = o;
      const cat = catOf(used);
      S.hist.push(cat);
      map[kind + '|' + cat] = { res: o.res, tag: o.tag, col: o.col };
      store.set('mgm:duel-map', map);
      if (o.adv > 0) { S.win = o.adv === 2 ? .6 : .3; S.winAdv = o.adv; }
      S.text = `<b>${A.name} → ${(MOVES[used] || MOVES.none).name}:</b> <span style="color:${o.col}">${o.res}</span>. ${o.why}${o.adv > 0 ? ' <b class="accent-3">Press J now!</b>' : ''}`;
    }

    function step(dt) {
      const m = S.m, p = S.p;
      if (S.over) return;
      S.st = Math.min(100, S.st + (p.block ? 0 : 16) * dt);
      if (p.mv) {
        const mv = MOVES[p.mv.name]; p.mv.t += dt;
        const u = ease(p.mv.t / mv.dur); p.x = lerp(p.mv.fx, p.mv.tx, u); p.y = lerp(p.mv.fy, p.mv.ty, u);
        if (p.mv.t > mv.dur + mv.rec) p.mv = null;
      }
      if (p.swing >= 0) { p.swing += dt; if (p.swing > .4) p.swing = -1; }
      if (p.ctr >= 0) { p.ctr += dt; if (p.ctr > .4) p.ctr = -1; }
      p.hitT = Math.max(0, p.hitT - dt); m.flash = Math.max(0, m.flash - dt * 3); S.win = Math.max(0, S.win - dt);
      m.t += dt;
      if (m.t < m.dur) return;
      m.t = 0;
      if (m.ph === 'idle') { m.ph = 'wind'; m.dur = MODE[mode].wind; m.kind = Math.random() < sweepOdds() ? 'sweep' : 'thrust'; m.res = null; }
      else if (m.ph === 'wind') { m.ph = 'active'; m.dur = .14; resolve(); }
      else if (m.ph === 'active') { m.ph = 'recover'; m.dur = .7; }
      else if (m.ph === 'recover') { m.ph = 'reset'; m.dur = .45; S.win = 0; p.rx = p.x; p.ry = p.y; }
      else { m.ph = 'idle'; m.dur = .6 + Math.random() * .7; p.x = BX; p.y = BY; p.last = null; }
      if (S.hp <= 0 || S.mhp <= 0) { S.hp = Math.max(0, S.hp); S.over = S.mhp <= 0 ? 'win' : 'lose'; }
    }

    function draw() {
      ui.hp.style.width = S.hp + '%'; ui.mhp.style.width = S.mhp + '%'; ui.st.style.width = S.st + '%';
      say(ui.out, S.text);
      const pr = sweepOdds();
      say(ui.read, adapt ? (S.hist.length < 2 ? 'The opponent is still reading you.' : `The opponent reads you: <b>${Math.round(pr * 100)}% sweep</b> / ${100 - Math.round(pr * 100)}% thrust.`) : 'The opponent picks at random (50 / 50).');
      ui.map.innerHTML = `<table class="og small"><tr><th></th><th>Thrust</th><th>Sweep</th></tr>` + CATS.map(([k, n]) => `<tr><th>${n}</th>` +
        ['thrust', 'sweep'].map(kind => { const v = map[kind + '|' + k]; return v ? `<td style="--c:${v.col}"><b>${v.res}</b><span>${v.tag}</span></td>` : '<td class="unk">?</td>'; }).join('') + '</tr>').join('') + '</table>';
    }

    reset();
    return dt => {
      step(dt);
      const m = S.m, p = S.p;
      g.clearRect(0, 0, W, H);
      if (ready(ART.Arena)) g.drawImage(ART.Arena, MX - 330, 6, 660, 660); else arena(g, MX - 330, 6, 660, 660);
      // telegraph: in react mode you see the shape; in predict mode only that something is coming
      if (m.ph === 'wind') {
        const u = m.t / m.dur;
        if (MODE[mode].tele) drawAttack(g, m.kind, MX, MY, UP, { tele: true, alpha: .25 + .75 * u });
        else label(g, '!', MX, MY - 50, { col: '#ff3b3b', size: 40, weight: 700 });
      }
      if (m.ph === 'active' || (m.ph === 'recover' && m.t < .25)) drawAttack(g, m.kind, MX, MY, UP, { t: m.ph === 'active' ? m.t / m.dur : 1, alpha: m.ph === 'recover' ? 1 - m.t / .25 : 1 });
      foe(g, MX, MY, { glow: m.ph === 'wind' ? .2 + .2 * Math.sin(S.t * 30) : 0, flash: m.flash });
      if (m.ph === 'recover') label(g, 'recovering', MX, MY + 46, { col: '#333', size: 17 });
      if (p.ctr >= 0) { counterSwing(g, p.x, p.y, Math.atan2(MY - p.y, MX - p.x), p.ctr / .4); sprite(g, 'Hit_Friendly', MX, MY, 70, 70, { alpha: 1 - p.ctr / .4 }); }
      // hero
      if (m.ph === 'reset') { const u = ease(m.t / m.dur); p.x = lerp(p.rx, BX, u); p.y = lerp(p.ry, BY, u); }
      const mv = p.mv && MOVES[p.mv.name];
      if (mv && mv.qs && p.mv.t < .4) qsMark(g, lerp(p.mv.fx, p.mv.tx, .5), lerp(p.mv.fy, p.mv.ty, .5), 1 - p.mv.t / .4);
      const inv = mv && mv.iframes && p.mv.t > mv.iframes[0] && p.mv.t < mv.iframes[1];
      if (mv && mv.iframes) for (let i = 1; i <= 3; i++) hero(g, lerp(p.mv.fx, p.x, 1 - i * .2), lerp(p.mv.fy, p.y, 1 - i * .2), { alpha: .15 });
      if (S.win > 0) { g.save(); g.strokeStyle = '#2fae6a'; g.lineWidth = 4; g.globalAlpha = .5 + .5 * Math.sin(S.t * 20); g.beginPath(); g.arc(p.x, p.y, TR + 10, 0, TAU); g.stroke(); g.restore(); label(g, 'COUNTER! (J)', p.x, p.y - 50, { col: '#1f8a4f', size: 20, weight: 700 }); }
      hero(g, p.x, p.y, { face: Math.atan2(MY - p.y, MX - p.x), hit: p.hitT > 0, alpha: inv ? .45 + .3 * Math.sin(S.t * 60) : 1 });
      if (p.block && !p.mv) sprite(g, 'Shielded_Friendly', p.x, p.y + 36, 52, 34);
      if (p.swing >= 0 && p.ctr < 0) counterSwing(g, p.x, p.y, Math.atan2(MY - p.y, MX - p.x), p.swing / .4);
      if (p.hitT > 0) sprite(g, 'Hit_Hostile', p.x, p.y, 74, 74, { alpha: p.hitT * 2 });
      if (S.over) {
        g.fillStyle = 'rgba(6,22,54,.78)'; g.fillRect(0, 0, W, H);
        label(g, S.over === 'win' ? 'You win!' : 'You lose', MX, H / 2 - 20, { col: '#fff', size: 54, weight: 700 });
        label(g, 'press J or Restart to go again', MX, H / 2 + 34, { col: '#a9b7d6', size: 22 });
      }
      S.t += dt;
      draw();
    };
  });

  /* ================= the original Spine mockups ================= */
  demo('spine', {
    init(s) {
      const box = $(s, '.spine-box'), btns = $$(s, '[data-anim]');
      const pick = name => { btns.forEach(b => b.classList.toggle('on', b.dataset.anim === name)); s._p?.setAnimation(name, true); };
      if (!window.spine || !window.SPINE_DATA) { box.textContent = 'The Spine player didn’t load.'; return; }
      s._p = new spine.SpinePlayer(box, {
        skeleton: 'basic-strikes.json', atlas: 'forsaken.atlas', rawDataURIs: window.SPINE_DATA,
        animation: 'Sword Sweep', showControls: false, alpha: true, backgroundColor: '#00000000', premultipliedAlpha: true,
        viewport: { x: -175, y: -170, width: 350, height: 340, padLeft: 0, padRight: 0, padTop: 0, padBottom: 0 },   // just the arena: other mockups park their props outside it
        success: () => pick('Sword Sweep'),
        error: (p, msg) => { box.textContent = 'Spine error: ' + msg; },
      });
      btns.forEach(b => b.onclick = () => pick(b.dataset.anim));
      const sp = $(s, '.spine-speed');
      sp.oninput = () => { if (s._p) s._p.speed = +sp.value; $(s, '.spine-speed-v').textContent = (+sp.value).toFixed(2) + '×'; };
    },
    enter(s) { s._p?.play(); },
    leave(s) { s._p?.pause(); },
  });
})();
