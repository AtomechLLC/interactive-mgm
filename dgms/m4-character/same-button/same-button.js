/* Same button, five meanings (RGF C2 M4, 3Cs: Character, slides 9-20 and 30-31).
   Slide 1: one jump key and a state picker. Each press travels Input -> Controller -> Character on the module's X-ray
   renderer (../shared/xray.js), and the controller reads the character's state to pick the action: a standing jump, a
   running leap, climbing out onto the shore, nothing at all in a tank, or a rocket launch with the booster.
   Slide 2: the full loop of slides 30-31 (player, commands, controller, character, interaction, game world, camera,
   back to the player), with one jump travelling around it.
   Both canvases are pure functions of time plus the learner's presses, so window.__seek is deterministic. */
(function () {
  const { $, $$, canvasDemo, say, ptr } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD, TAU = Math.PI * 2;
  const W = 1040, H = 585, SCENE = 268;
  const rr = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
  const text = (g, s, x, y, size, col = C.ink, w = 600, align = 'left', fam = 'Jost') => { g.font = `${w} ${size}px ${fam}, sans-serif`; g.fillStyle = col; g.textAlign = align; g.textBaseline = 'alphabetic'; g.fillText(s, x, y); };

  /* ---------- a side-view stick puppet (angles in radians: 0 hangs straight down, + swings forward) ---------- */
  const PL = { th: 30, sh: 30, to: 42, ua: 24, fa: 24, hr: 12 };
  const BASE = { lean: 0, hl: 0, kl: 0, hr: 0, kr: 0, sl: .12, el: .3, sr: -.12, er: .3, nod: 0, rot: 0 };
  const limb = (p, a, L) => [p[0] + Math.sin(a) * L, p[1] + Math.cos(a) * L];
  function joints(p) {
    const hip = [0, 0];
    const kL = limb(hip, p.hl, PL.th), fL = limb(kL, p.hl + p.kl, PL.sh), kR = limb(hip, p.hr, PL.th), fR = limb(kR, p.hr + p.kr, PL.sh);
    const neck = [Math.sin(p.lean) * PL.to, -Math.cos(p.lean) * PL.to];
    const eL = limb(neck, p.sl, PL.ua), hL = limb(eL, p.sl + p.el, PL.fa), eR = limb(neck, p.sr, PL.ua), hR = limb(eR, p.sr + p.er, PL.fa);
    const head = [neck[0] + Math.sin(p.lean + p.nod) * (PL.hr + 4), neck[1] - Math.cos(p.lean + p.nod) * (PL.hr + 4)];
    return { hip, kL, fL, kR, fR, neck, eL, hL, eR, hR, head };
  }
  // o.hip: absolute hip position; otherwise the lowest foot stands on groundY and o.dy lifts the body
  function puppet(g, x, groundY, p0, o = {}) {
    const p = { ...BASE, ...p0 }, s = o.s || 1, j = joints(p);
    const low = Math.max(j.fL[1], j.fR[1]);
    const hx = o.hip ? o.hip[0] : x, hy = o.hip ? o.hip[1] : groundY - low * s - (o.dy || 0);
    const col = o.col || C.navy, back = o.back || '#5d6aa8';
    g.save(); g.translate(hx, hy); g.scale(s, s); g.rotate(p.rot);
    g.lineCap = 'round'; g.lineJoin = 'round';
    const seg = (pts, c, w) => { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); pts.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.stroke(); };
    seg([j.hip, j.kL, j.fL], back, 8); seg([j.neck, j.eL, j.hL], back, 7);
    seg([j.hip, j.neck], col, 10);
    g.fillStyle = col; g.beginPath(); g.arc(j.head[0], j.head[1], PL.hr, 0, TAU); g.fill();
    g.fillStyle = '#fffaf0'; g.beginPath(); g.arc(j.head[0] + 5, j.head[1] - 2, 2.6, 0, TAU); g.fill();
    seg([j.hip, j.kR, j.fR], col, 8); seg([j.neck, j.eR, j.hR], col, 7);
    g.restore();
    const world = q => { const c = Math.cos(p.rot), sn = Math.sin(p.rot); return [hx + (q[0] * c - q[1] * sn) * s, hy + (q[0] * sn + q[1] * c) * s]; };
    return { world, j, hip: [hx, hy] };
  }
  const KEYS = Object.keys(BASE).concat(['dx', 'dy']);
  // keyframes: [[k, {pose fields, dx, dy}], ...]; missing fields fall back to the base pose
  function kf(frames, k) {
    let i = 0; while (i < frames.length - 2 && k > frames[i + 1][0]) i++;
    const [k0, a] = frames[i], [k1, b] = frames[Math.min(i + 1, frames.length - 1)];
    const u = k1 > k0 ? ease(clamp((k - k0) / (k1 - k0))) : 1, out = {};
    KEYS.forEach(key => { const d = BASE[key] ?? 0; out[key] = lerp(a[key] ?? d, b[key] ?? d, u); });
    return out;
  }
  function runPose(ph, amp = 1) {
    const s = Math.sin(ph), c = Math.cos(ph);
    return { lean: .22 * amp, hl: .75 * s * amp, hr: -.75 * s * amp, kl: -(.2 + 1.1 * Math.max(0, c)) * amp, kr: -(.2 + 1.1 * Math.max(0, -c)) * amp, sl: -.8 * s * amp, el: 1.3, sr: .8 * s * amp, er: 1.3 };
  }
  const idlePose = t => ({ sl: .12 + .03 * Math.sin(t * 2), sr: -.12 - .03 * Math.sin(t * 2), nod: .04 * Math.sin(t * 1.3) });

  /* ---------- the five states ---------- */
  const ANIM_AT = 2.75;
  const STATES = {
    idle: { label: 'Idle', long: 'Idle', act: 'Standing jump', dur: 1.1, out: 'Idle: the same press becomes a standing jump. The character goes straight up and lands where it started.' },
    run: { label: 'Running', long: 'Running', act: 'Running leap', dur: 1.2, out: 'Running: the controller turns the press into a running leap that carries the character forward.' },
    swim: { label: 'Swimming', long: 'Swimming near a ledge', act: 'Climb out', dur: 1.7, out: 'Swimming near a ledge: the press makes the character pull itself out onto the shore. No jump at all.' },
    tank: { label: 'Tank', long: 'Driving a tank', act: 'Nothing', dur: 1.4, out: 'Driving a tank: the jump input might do nothing at all. The controller has no action mapped to it, so the signal stops there.' },
    boost: { label: 'Tank+rocket', long: 'Tank with rocket booster', act: 'Rocket launch', dur: 2.1, out: 'Tank with a rocket booster attachment: the same press now launches the whole tank into the air.' },
  };
  const ORDER = ['idle', 'run', 'swim', 'tank', 'boost'];

  /* ---------- slide 1 scene ---------- */
  const GY = 236;
  function keycap(g, x, y, k, down = 0) {
    g.fillStyle = '#9a8f78'; rr(g, x - 26, y - 22, 52, 50, 8); g.fill();
    g.fillStyle = down ? '#ffb951' : '#fffaf0'; g.strokeStyle = C.ink; g.lineWidth = 2; rr(g, x - 24, y - 24 + down * 4, 48, 42, 7); g.fill(); g.stroke();
    text(g, k, x, y + 6 + down * 4, 22, C.ink, 800, 'center', 'Montserrat');
  }
  function crossBar(g, x, y, tilt = 0) {
    g.save(); g.translate(x, y); g.rotate(tilt);
    g.strokeStyle = '#8b6136'; g.lineWidth = 7; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-46, 0); g.lineTo(46, 0); g.moveTo(0, -16); g.lineTo(0, 16); g.stroke();
    g.restore();
  }
  function strings(g, from, pts) {
    g.strokeStyle = 'rgba(38,44,106,.35)'; g.lineWidth = 1.5;
    pts.forEach((q, i) => { const fx = from[0] + [-44, 44, 0, -20, 20][i % 5], fy = from[1]; g.beginPath(); g.moveTo(fx, fy); g.lineTo(q[0], q[1]); g.stroke(); });
  }
  function tank(g, x, y, booster, fire, tilt = 0) {
    g.save(); g.translate(x, y); g.rotate(tilt);
    if (booster) {
      g.fillStyle = '#8b8fa8'; g.strokeStyle = C.ink; g.lineWidth = 2; rr(g, -92, -52, 34, 26, 6); g.fill(); g.stroke();
      g.fillStyle = C.red; g.beginPath(); g.moveTo(-92, -52); g.lineTo(-104, -39); g.lineTo(-92, -26); g.closePath(); g.fill();
      if (fire > 0) { for (let i = 0; i < 3; i++) { const l = (30 + 20 * Math.sin(fire * 40 + i * 2)) * Math.min(1, fire * 4); g.fillStyle = ['#ffb951', '#ff7a2a', '#fff2c4'][i]; g.beginPath(); g.moveTo(-74 - 8 + i * 2, -26); g.lineTo(-75, -26 + l * (1 - i * .25)); g.lineTo(-68 - i * 2, -26); g.closePath(); g.fill(); } }
    }
    g.fillStyle = '#5b6e3a'; g.strokeStyle = '#2f3a1c'; g.lineWidth = 2.5;
    rr(g, -66, -30, 132, 30, 8); g.fill(); g.stroke();
    rr(g, -34, -54, 64, 26, 10); g.fill(); g.stroke();
    g.fillRect(28, -46, 58, 9); g.strokeRect(28, -46, 58, 9);
    g.fillStyle = '#2f3a1c'; rr(g, -70, -4, 140, 18, 9); g.fill();
    g.fillStyle = '#8b8fa8'; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(-56 + i * 22.4, 5, 6, 0, TAU); g.fill(); }
    g.restore();
  }
  // returns the points the control strings attach to
  function sceneState(g, key, k, t, groundShift) {
    const S = STATES[key];
    // background
    g.fillStyle = '#e6f0f5'; g.fillRect(0, 0, W, SCENE);
    if (key === 'swim') {
      g.fillStyle = '#9a8662'; g.fillRect(640, 150, W - 640, SCENE - 150); g.fillStyle = '#6fa457'; g.fillRect(640, 146, W - 640, 10);
      g.fillStyle = '#5aa9d6'; g.fillRect(0, 176, 640, SCENE - 176);
      g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 2; for (let i = 0; i < 9; i++) { const x = (i * 80 + t * 30) % 660 - 10; g.beginPath(); g.moveTo(x, 182); g.quadraticCurveTo(x + 15, 176, x + 30, 182); g.stroke(); }
    } else {
      g.fillStyle = '#cfe0ae'; g.fillRect(0, GY, W, SCENE - GY);
      g.strokeStyle = '#94b06e'; g.lineWidth = 3; for (let i = 0; i < 16; i++) { const x = ((i * 90 - groundShift) % 1440 + 1440) % 1440 - 100; g.beginPath(); g.moveTo(x, GY + 10); g.lineTo(x + 30, GY + 10); g.stroke(); }
      g.strokeStyle = '#6f8a52'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, GY); g.lineTo(W, GY); g.stroke();
    }
    // the character, its action, and where the strings go
    let pts = [], barAt = [520, 30];
    if (key === 'idle' || key === 'run') {
      const run = key === 'run', x = run ? 470 : 520;
      let pose = run ? runPose(t * 11) : idlePose(t), dy = 0;
      if (k >= 0 && k <= 1) {
        if (!run) { pose = kf([[0, { hl: .5, kl: -1, hr: .5, kr: -1, lean: .1, sl: -.4, sr: -.4 }], [.15, { hl: .1, kl: -.1, hr: .1, kr: -.1, sl: 2.8, sr: 2.8, el: .2, er: .2 }], [.5, { hl: .4, kl: -.8, hr: .4, kr: -.8, sl: 2.6, sr: 2.6 }], [.85, { hl: .2, kl: -.3, hr: .2, kr: -.3 }], [1, { hl: .5, kl: -1, hr: .5, kr: -1, sl: .3, sr: .3 }]], k); dy = k > .1 && k < .9 ? Math.sin((k - .1) / .8 * Math.PI) * 78 : 0; }
        else { pose = kf([[0, runPose(t * 11)], [.12, { lean: .35, hl: 1.1, kl: -.4, hr: -.7, kr: -.6, sl: 2.2, sr: -.6, el: .3, er: 1 }], [.85, { lean: .25, hl: .9, kl: -.6, hr: -.5, kr: -1, sl: 2, sr: -.4, el: .3, er: 1 }], [1, runPose(t * 11)]], k); dy = Math.sin(clamp(k / .95) * Math.PI) * 70; }
        if (k > .02 && k < .2) T.popText(S.act + '!', x, 40, C.goldInk, 1);
      }
      const P = puppet(g, x, GY, pose, { dy, s: 1.05 });
      pts = [P.world(P.j.hL), P.world(P.j.hR), P.world(P.j.head)]; barAt = [P.hip[0] + 10, Math.min(30, P.world(P.j.head)[1] - 50)];
    }
    if (key === 'swim') {
      let pose, hip;
      const bob = Math.sin(t * 3) * 4;
      if (k < 0) { pose = { lean: .1, hl: .4 + .3 * Math.sin(t * 4), kl: -.8, hr: -.2 - .3 * Math.sin(t * 4), kr: -.6, sl: 1.6 + .4 * Math.sin(t * 4), el: .6, sr: 1.6 - .4 * Math.sin(t * 4), er: .6 }; hip = [590, 212 + bob]; }
      else {
        const kk = clamp(k);
        pose = kf([[0, { lean: .1, hl: .4, kl: -.8, hr: -.2, kr: -.6, sl: 1.6, el: .6, sr: 1.6, er: .6 }], [.25, { lean: .2, sl: 2.7, el: .2, sr: 2.7, er: .2, hl: .1, kl: -.3, hr: .1, kr: -.3 }], [.6, { lean: .6, sl: .6, el: 1.2, sr: .6, er: 1.2, hl: 1.4, kl: -2.2, hr: .2, kr: -.3 }], [1, idlePose(t)]], kk);
        const hx = lerp(590, 700, ease(clamp((kk - .3) / .6))), hy = kk < .25 ? lerp(212, 214, kk / .25) : kk < .6 ? lerp(214, 120, ease((kk - .25) / .35)) : lerp(120, 150 - 61, ease((kk - .6) / .4));
        hip = [hx, hy];
        if (k > .02 && k < .3) T.popText(S.act + '!', 600, 40, C.goldInk, 1);
      }
      const P = puppet(g, 0, 0, pose, { hip, s: 1.05 });
      if (k < 0 || k < .3) { g.fillStyle = 'rgba(90,169,214,.55)'; g.fillRect(0, 186, 640, SCENE - 186); }
      pts = [P.world(P.j.hL), P.world(P.j.hR), P.world(P.j.head)]; barAt = [P.hip[0] + 10, 30];
      text(g, 'shore', 960, 140, 14, '#5b4a2a', 700, 'center');
    }
    if (key === 'tank' || key === 'boost') {
      const boost = key === 'boost'; let y = GY - 14, tilt = 0, fire = 0;
      if (boost && k >= 0 && k <= 1) { fire = k < .75 ? k + .05 : 0; const up = k < .55 ? ease(k / .55) : 1 - ease((k - .55) / .45); y -= up * 150; tilt = -.12 * Math.sin(k * Math.PI); if (k < .2) T.popText(S.act + '!', 520, 40, C.goldInk, 1); }
      if (!boost && k >= 0 && k <= 1) { T.popText('nothing happens', 520, 60, C.muted, Math.sin(k * Math.PI) * 1.4); }
      g.fillStyle = 'rgba(40,30,20,.2)'; g.beginPath(); g.ellipse(520, GY + 2, 70 - (GY - 14 - y) * .2, 7, 0, 0, TAU); g.fill();
      tank(g, 520, y, boost, fire, tilt);
      pts = [[460, y - 30], [580, y - 30], [520, y - 54]]; barAt = [520, Math.min(30, y - 120)];
    }
    // the controller as control rods above the puppet
    strings(g, barAt, pts); crossBar(g, barAt[0], barAt[1], Math.sin(t * 1.5) * .04);
    T.label(`State: ${S.long}`, 16, 24, 'left', '#fff', 14, C.navy);
  }

  /* ---------- slide 1: X-ray of the press ---------- */
  const NODES = [
    { id: 'input', x: 18, y: 330, w: 150, h: 130, part: 'entity', title: 'Input', sub: 'your hand', art: (g, x, y) => keycap(g, x, y, 'J') },
    { id: 'sig', x: 178, y: 360, w: 90, h: 76, part: 'signal', title: 'Jump' },
    { id: 'ctrl', back: true, x: 282, y: 318, w: 462, h: 254, part: 'entity', title: 'Controller', tag: 'the control rods' },
    { id: 'recv', x: 296, y: 356, w: 100, h: 76, part: 'receiver', title: 'Jump input' },
    { id: 'ctx', x: 296, y: 452, w: 170, h: 80, part: 'state', title: '', sub: 'character state', value: 'Idle' },
    { id: 'map', x: 430, y: 356, w: 130, h: 76, part: 'transform', title: 'Maps to' },
    { id: 'act', x: 574, y: 356, w: 164, h: 86, part: 'state', title: 'Action', value: '' },
    { id: 'char', x: 762, y: 330, w: 262, h: 112, part: 'entity', title: 'Character', sub: 'the puppet', value: '' },
  ];
  const RULES = {
    state: (s, a) => [{ dt: 0, dur: .01, set: { ctx: STATES[a.s].label, act: '', char: '' } }],
    jump: (s, a) => {
      const S = STATES[a.s], none = a.s === 'tank';
      const hops = [
        { dt: 0, dur: .45, from: 'input', to: 'sig', kind: 'command' },
        { dt: .5, dur: .45, from: 'sig', to: 'recv', kind: 'command', label: 'Jump' },
        { dt: 1.0, dur: .45, from: 'recv', to: 'map', kind: 'system' },
        { dt: 1.0, dur: .45, from: 'ctx', to: 'map', kind: 'system', label: S.label },
        { dt: 1.55, dur: .55, from: 'map', to: 'act', kind: 'system', set: { act: S.act }, bounce: none ? 'no action mapped' : undefined },
      ];
      if (none) hops.push({ dt: 2.2, dur: .01, set: { act: 'Nothing', char: 'Stays put' } });
      else hops.push({ dt: 2.2, dur: .5, from: 'act', to: 'char', kind: 'system', set: { char: S.act } });
      return hops;
    },
  };
  const PER = 5.6, TOUR = [];
  ORDER.forEach((s, i) => { TOUR.push({ at: i * PER, type: 'state', s }, { at: i * PER + .5, type: 'jump', s }); });
  const BTN_DUR = PER * ORDER.length;

  function results(g, seen, x, y) {
    text(g, 'Same key, so far:', x, y, 14, C.ink, 700);
    ORDER.forEach((k, i) => {
      const on = seen.has(k), yy = y + 18 + i * 17;
      text(g, STATES[k].label, x, yy, 13, on ? C.ink : 'rgba(38,44,106,.35)', 600);
      text(g, on ? STATES[k].act : '?', x + 110, yy, 13, on ? (k === 'tank' ? C.red : C.good) : 'rgba(38,44,106,.35)', 700);
    });
  }

  const scenes = {};
  canvasDemo('button', (s, cv, g) => {
    const st = { t: 0, held: false, tour: true, acts: [], flow: [], key: '', seenFree: new Set() };
    const tourBtn = $(s, '.sb-tour');
    const rebuild = () => { st.flow = XR.script(NODES, st.tour ? TOUR : st.acts, RULES); };
    const list = () => st.tour ? TOUR : st.acts;
    const stateAt = t => { const a = list().filter(a => a.type === 'state' && a.at <= t).at(-1); return a ? a.s : 'idle'; };
    const free = () => { st.held = false; if (!st.tour) return; const cur = stateAt(st.t); st.tour = false; tourBtn.classList.remove('on'); st.t = 0; st.acts = [{ at: 0, type: 'state', s: cur }]; rebuild(); };
    const busy = () => { const j = st.acts.filter(a => a.type === 'jump').at(-1); return Math.max(st.t, XR.end(st.flow), j ? j.at + ANIM_AT + STATES[j.s].dur : 0); };
    const jump = () => { free(); const at = busy() + .05; st.acts.push({ at, type: 'jump', s: stateAt(at) }); rebuild(); const b = $(s, '.sb-jump'); b.classList.add('hit'); setTimeout(() => b.classList.remove('hit'), 150); };
    $$(s, '.sb-state .btn').forEach(b => b.onclick = () => { free(); st.acts.push({ at: busy() + .01, type: 'state', s: b.dataset.s }); rebuild(); });
    $(s, '.sb-jump').onclick = jump;
    addEventListener('keydown', e => { if (!s.classList.contains('active') || e.altKey || e.ctrlKey || e.metaKey) return; if (e.key === 'j' || e.key === 'J' || e.key === 'ArrowUp') { e.preventDefault(); jump(); } });
    tourBtn.onclick = () => { st.held = false; st.tour = true; st.t = 0; tourBtn.classList.add('on'); rebuild(); };
    rebuild();
    function render() {
      const t = st.t; T.use(g); g.clearRect(0, 0, W, H);
      const key = stateAt(t), jumps = list().filter(a => a.type === 'jump' && a.at <= t);
      const j = jumps.at(-1), lastState = list().filter(a => a.type === 'state' && a.at <= t).at(-1);
      const fresh = j && (!lastState || j.at >= lastState.at);
      const k = fresh ? (t - j.at - ANIM_AT) / STATES[key].dur : -1;
      g.save(); rr(g, 0, 0, W, SCENE, 14); g.clip(); sceneState(g, key, k > 1 ? -1 : k, t, key === 'run' ? t * 260 : 0); g.restore();
      XR.frame(g, 0, SCENE + 8, W, H - SCENE - 8);
      XR.legend(g, 20, SCENE + 30, ['entity', 'signal', 'receiver', 'transform', 'state']);
      const { val } = XR.draw(g, NODES, st.flow, t);
      // keycap goes down while the press leaves the hand
      if (j && t - j.at < .3) keycap(g, 93, 403, 'J', 1);
      const seen = new Set(jumps.filter(a => t >= a.at + 2.2).map(a => a.s));
      results(g, seen, 772, 466);
      const sk = [key, val.act, val.char, seen.size].join(); if (sk === st.key) return; st.key = sk;
      $$(s, '.sb-state .btn').forEach(b => b.classList.toggle('on', b.dataset.s === key));
      say($(s, '.sb-stats'), `<div><b style="font-size:20px">J</b><span>the same key every time</span></div><div class="${val.char ? (key === 'tank' ? 'r' : 'g') : ''}"><b style="font-size:20px">${val.char || '…'}</b><span>what the character does</span></div>`);
      say($(s, '.sb-out'), val.char ? STATES[key].out : `State: ${STATES[key].long}. Press Jump and follow the signal: the controller reads the state before it picks an action.`);
    }
    scenes.button = { seek(t) { st.held = true; if (!st.tour) { st.tour = true; rebuild(); } st.t = t; render(); }, dur: () => BTN_DUR };
    return dt => { if (!st.held) st.t += dt; if (st.tour && st.t > BTN_DUR) st.t = 0; render(); };
  });

  /* ---------- slide 2: the whole loop (slides 30-31) ---------- */
  const RING = [
    ['player', 'Player', 'decides', 'The player decides what they want to do: jump over that gap.'],
    ['cmd', 'Commands', 'inputs', 'Commands are the raw inputs: a button press, a stick push.'],
    ['ctrl', 'Controller', 'maps', 'The controller maps the input to an action, using the character’s current state.'],
    ['char', 'Character', 'acts', 'The character performs the action with its own animation and metrics.'],
    ['inter', 'Interaction', 'touches', 'The character touches the world: a landing, a hit, a pickup.'],
    ['world', 'Game world', 'reacts', 'The game world reacts: an enemy is squashed, a platform moves, a rule fires.'],
    ['cam', 'Camera', 'frames', 'The camera frames the result so the player can read what happened, and the loop starts again.'],
  ];
  const HOPS = ['intent: jump the gap', 'press: Jump', 'Running + Jump = leap', 'leap lands on enemy', 'stomp', 'new scene to frame', 'the player sees it'];
  const CX = 520, CY = 296, RX = 392, RY = 204, NW = 184, NH = 128;
  const centre = i => { const a = Math.PI - i * TAU / 7; return [CX + RX * Math.cos(a), CY - RY * Math.sin(a)]; };
  const ART = {
    player: (g, x, y) => { g.save(); g.font = '600 40px Jost, sans-serif'; g.fillStyle = C.ink; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('👁', x, y); g.restore(); },
    cmd: (g, x, y) => keycap(g, x, y + 2, 'J'),
    ctrl: (g, x, y) => { crossBar(g, x, y - 4); g.strokeStyle = 'rgba(38,44,106,.4)'; g.lineWidth = 1.5; [-40, 0, 40].forEach(d => { g.beginPath(); g.moveTo(x + d, y - 4); g.lineTo(x + d * .6, y + 22); g.stroke(); }); },
    char: (g, x, y) => puppet(g, x, y + 30, runPose(2), { s: .5 }),
    inter: (g, x, y) => { g.save(); g.font = '600 40px Jost, sans-serif'; g.fillStyle = '#e07a2a'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('💥', x, y); g.restore(); },
    world: (g, x, y) => { g.fillStyle = '#94b06e'; g.fillRect(x - 50, y + 10, 100, 14); g.fillStyle = '#a4552a'; g.beginPath(); g.ellipse(x + 10, y + 6, 16, 7, 0, 0, TAU); g.fill(); g.save(); g.font = '600 26px Jost, sans-serif'; g.fillStyle = '#3f8a3a'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🌳', x - 30, y - 6); g.restore(); },
    cam: (g, x, y) => { g.fillStyle = C.ink; rr(g, x - 26, y - 14, 44, 30, 5); g.fill(); g.beginPath(); g.moveTo(x + 18, y - 2); g.lineTo(x + 34, y - 12); g.lineTo(x + 34, y + 14); g.lineTo(x + 18, y + 4); g.closePath(); g.fill(); g.fillStyle = '#8fd3ff'; g.beginPath(); g.arc(x - 4, y + 1, 8, 0, TAU); g.fill(); },
  };
  const LNODES = RING.map(([id, title, sub], i) => { const [x, y] = centre(i); return { id, x: x - NW / 2, y: y - NH / 2, w: NW, h: NH, part: 'entity', title, sub, art: ART[id] }; });
  const HOP = 1.25, LAP = HOP * 7 + 1.2;
  const lapRules = {
    lap: () => RING.map((r, i) => {
      const a = centre(i), b = centre((i + 1) % 7), m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const via = [CX + (m[0] - CX) * 1.18, CY + (m[1] - CY) * 1.22];
      return { dt: i * HOP, dur: HOP - .1, from: r[0], to: RING[(i + 1) % 7][0], kind: i === 0 ? 'command' : 'system', label: HOPS[i], via };
    }),
  };
  const LOOP_TOUR = [{ at: .3, type: 'lap' }], LOOP_DUR = LAP + .3;
  canvasDemo('loop', (s, cv, g) => {
    const st = { t: 0, held: false, tour: true, acts: [], flow: [], pick: -1, key: '' };
    const tourBtn = $(s, '.lp-tour');
    const rebuild = () => { st.flow = XR.script(LNODES, st.tour ? LOOP_TOUR : st.acts, lapRules); };
    const free = () => { st.held = false; if (!st.tour) return; st.tour = false; tourBtn.classList.remove('on'); st.t = 0; st.acts = []; rebuild(); };
    $(s, '.lp-send').onclick = () => { free(); st.acts.push({ at: Math.max(st.t, XR.end(st.flow)) + .05, type: 'lap' }); st.pick = -1; rebuild(); };
    tourBtn.onclick = () => { st.held = false; st.tour = true; st.t = 0; st.pick = -1; tourBtn.classList.add('on'); rebuild(); };
    cv.addEventListener('click', e => {
      const { x, y } = ptr(cv, e), i = LNODES.findIndex(n => x >= n.x && x <= n.x + n.w && y >= n.y && y <= n.y + n.h);
      if (i < 0) return; free(); st.pick = i;
    });
    rebuild();
    // which hop is in flight at t (-1 when none)
    const hopAt = t => { const f = st.flow.filter(f => f.from && t >= f.t).at(-1); return f && t <= f.t + f.dur + .6 ? RING.findIndex(r => r[0] === f.from) : -1; };
    function render() {
      const t = st.t; T.use(g); g.clearRect(0, 0, W, H);
      XR.frame(g, 0, 0, W, H);
      const hop = hopAt(t), focus = st.pick >= 0 ? st.pick : hop;
      XR.draw(g, LNODES, st.flow, t, { only: st.pick >= 0 ? [RING[st.pick][0]] : undefined });
      // centre: the step in words
      text(g, 'The 3Cs loop', CX, CY - 40, 26, C.ink, 800, 'center', 'Montserrat');
      text(g, 'player · controller · character · camera', CX, CY - 12, 15, C.muted, 600, 'center');
      if (focus >= 0) {
        const r = RING[focus];
        g.font = '600 16px Jost, sans-serif'; const words = r[3].split(' '); let line = '', yy = CY + 22; const lines = [];
        words.forEach(w => { const tt = line ? line + ' ' + w : w; if (g.measureText(tt).width > 380) { lines.push(line); line = w; } else line = tt; }); lines.push(line);
        lines.forEach((l, i) => text(g, l, CX, yy + i * 22, 16, C.ink, 600, 'center'));
      }
      const k = [focus].join(); if (k === st.key) return; st.key = k;
      say($(s, '.lp-stats'), focus >= 0 ? `<div><b>${focus + 1}/7</b><span>${RING[focus][1]}</span></div>` : `<div><b>7</b><span>steps in one loop</span></div>`);
      say($(s, '.lp-out'), focus >= 0 ? RING[focus][3] : 'Follow one jump from the player’s intent, through the controller and the character, into the world and the camera, and back to the player’s eyes.');
    }
    scenes.loop = { seek(t) { st.held = true; if (!st.tour) { st.tour = true; rebuild(); } st.pick = -1; st.t = t; render(); }, dur: () => LOOP_DUR };
    return dt => { if (!st.held) st.t += dt; if (st.tour && st.t > LOOP_DUR) st.t = 0; render(); };
  });

  window.__seek = (t, which = 'button') => scenes[which].seek(t);
  window.__dur = (which = 'button') => scenes[which].dur();
})();
