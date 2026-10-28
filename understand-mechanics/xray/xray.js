/* Mechanics X-ray stepper (MGM C4 M2, deck slides 20-33, 49-54, 99-100). Four scenes, one engine: a small game scene on
   top, its X-ray below (../shared/xray.js). Buttons are signals; each press becomes an action, and RULES turn actions into
   hops through the diagram (which box sends what to which, and what it changes). The scene is drawn from the diagram's
   own values, so what you see on top is always what the X-ray says. Walk-throughs are fixed action lists, so GIFs can seek. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;
  const W = 1040, H = 585, SCENE = 206;

  // hops in flight between from and to at time t
  const flying = (flow, from, to, t) => flow.find(f => f.from === from && f.to === to && t >= f.t && t <= f.t + f.dur);
  const progress = (f, t) => clamp((t - f.t) / f.dur);

  /* ---------- one demo = nodes + rules + tour + scene ---------- */
  function xrDemo(name, cfg) {
    let api;
    canvasDemo(name, (s, cv, g) => {
      const st = { tour: true, t: 0, held: false, acts: [], opts: { ...cfg.opts }, flow: [], key: '' };
      const tourBtn = $(s, '.xr-tour');
      const rebuild = () => { st.flow = XR.script(cfg.nodes, st.tour ? cfg.tour : st.acts, cfg.rules); };
      const free = () => { if (!st.tour) return; st.tour = false; tourBtn.classList.remove('on'); st.t = 0; st.acts = []; st.opts = { ...cfg.opts }; syncOpts(); rebuild(); };
      const syncOpts = () => (cfg.toggles || []).forEach(([sel, k]) => { const el = $(s, sel); if (el) el.checked = !!st.opts[k]; });
      // a press waits for the last hop to land, so signals never cross
      const busyUntil = () => Math.max(st.t, XR.end(st.flow));
      $$(s, '.xr-act').forEach(b => b.onclick = () => { free(); st.acts.push({ at: busyUntil() + .05, type: b.dataset.a, ...st.opts }); rebuild(); });
      (cfg.toggles || []).forEach(([sel, k, type]) => { const el = $(s, sel); if (!el) return; el.onchange = () => { free(); st.opts[k] = el.checked; if (type) { st.acts.push({ at: busyUntil() + .01, type, ...st.opts }); rebuild(); } }; });
      $(s, '.xr-reset').onclick = () => { st.tour = true; free(); };
      tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); rebuild(); };
      rebuild();
      function render() {
        const t = st.t; T.use(g); g.clearRect(0, 0, W, H);
        const { val } = XR.replay(cfg.nodes, st.flow, t);
        g.fillStyle = 'rgba(255,252,244,.75)'; g.beginPath(); g.roundRect(0, 0, W, SCENE, 14); g.fill();
        g.save(); g.beginPath(); g.roundRect(0, 0, W, SCENE, 14); g.clip(); cfg.scene(g, val, st.flow, t); g.restore();
        g.fillStyle = 'rgba(255,252,244,.6)'; g.beginPath(); g.roundRect(0, SCENE + 10, W, H - SCENE - 10, 14); g.fill();
        XR.legend(g, 16, SCENE + 30, cfg.parts, cfg.kinds);
        const phase = st.tour && cfg.phases ? cfg.phases.filter(p => t >= p.at).at(-1) : null;
        XR.draw(g, cfg.nodes, st.flow, t, { focus: phase?.focus });
        if (phase?.cap) T.label(phase.cap, W / 2, 24, 'center', '#fff', 15, C.navy);
        const key = JSON.stringify(val) + (phase?.cap || ''); if (key === st.key) return; st.key = key;
        say($(s, '.xr-stats'), cfg.stats(val));
        say($(s, '.xr-out'), cfg.out(val, phase, st.tour));
      }
      api = { seek(t) { st.held = true; if (!st.tour) { st.tour = true; rebuild(); } st.t = t; render(); }, dur: () => cfg.dur };
      return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > cfg.dur) st.t = 0; render(); };
    });
    return { seek: t => api.seek(t), dur: () => api.dur() };
  }
  const stat = (cls, v, l) => `<div class="${cls}"><b>${v}</b><span>${l}</span></div>`;

  /* ---------- 1. the candle (slides 20-25) ---------- */
  const LIT_AT = 6;
  const candle = xrDemo('candle', {
    parts: ['entity', 'receiver', 'transform', 'state'], kinds: ['command', 'system'],
    opts: { warm: true, cool: true },
    toggles: [['.xr-warm', 'warm', 'recv'], ['.xr-cool', 'cool', 'recv']],
    nodes: [
      { id: 'fire', x: 14, y: 262, w: 130, h: 74, part: 'entity', title: 'Fire spell', sub: 'sends Heat' },
      { id: 'frost', x: 14, y: 470, w: 130, h: 74, part: 'entity', title: 'Frost spell', sub: 'sends Cool' },
      { id: 'warm', x: 214, y: 262, w: 150, h: 74, part: 'receiver', title: 'Warmable', value: 'on' },
      { id: 'cool', x: 214, y: 470, w: 150, h: 74, part: 'receiver', title: 'Coolable', value: 'on' },
      { id: 'up', x: 430, y: 262, w: 130, h: 74, part: 'transform', title: 'Heat: add', value: '+1' },
      { id: 'down', x: 430, y: 470, w: 130, h: 74, part: 'transform', title: 'Cool: add', value: '-1' },
      { id: 'temp', x: 630, y: 352, w: 160, h: 102, part: 'state', title: 'Temperature', value: 5 },
      { id: 'lit', x: 850, y: 352, w: 176, h: 102, part: 'state', title: 'Candle', sub: `lit at ${LIT_AT} or more`, value: 'Unlit' },
    ],
    rules: {
      recv: (s, a) => [{ dt: 0, dur: .01, set: { warm: a.warm ? 'on' : 'off', cool: a.cool ? 'on' : 'off' } }],
      heat: (s, a) => heat(s, a, 1),
      heatx: (s, a) => heat(s, a, 2),
      cool: (s, a) => {
        if (s.cool !== 'on') return [{ dt: 0, dur: 1.2, from: 'frost', to: 'cool', kind: 'command', label: 'Cool', bounce: 'not Coolable' }];
        const v = s.temp - 1;
        return [
          { dt: 0, dur: .9, from: 'frost', to: 'cool', kind: 'command', label: 'Cool' },
          { dt: .95, dur: .7, from: 'cool', to: 'down', kind: 'system' },
          { dt: 1.7, dur: .8, from: 'down', to: 'temp', kind: 'system', label: '-1', set: { temp: v } },
          { dt: 2.55, dur: .7, from: 'temp', to: 'lit', kind: 'system', label: `${v} ≥ ${LIT_AT}?`, set: { lit: v >= LIT_AT ? 'Lit' : 'Unlit' } },
        ];
      },
    },
    phases: [
      { at: 0, focus: ['state'], cap: 'States: values that describe the world' },
      { at: 3.5, focus: ['state', 'entity'], cap: 'Signals: messages that ask a system to do something' },
      { at: 7.5, focus: ['state', 'entity', 'receiver'], cap: 'Receivers: entities that accept certain kinds of signals' },
      { at: 14, focus: ['state', 'entity', 'receiver', 'transform'], cap: 'Transforms: instructions on how to change states' },
      { at: 20.5, focus: null, cap: 'Context: extra information riding on the signal' },
    ],
    tour: [
      { at: 4, type: 'heat' },
      { at: 8.2, type: 'cool' },
      { at: 11.3, type: 'recv', warm: true, cool: false },
      { at: 11.5, type: 'cool' },
      { at: 13.4, type: 'recv', warm: true, cool: true },
      { at: 14.5, type: 'heat' },
      { at: 17.5, type: 'heat' },
      { at: 21, type: 'heatx' },
    ],
    dur: 27,
    scene: candleScene,
    stats: v => stat('y', v.temp, 'temperature (state)') + stat(v.lit === 'Lit' ? 'g' : '', v.lit, 'candle (state)') + stat('', `${(v.warm === 'on') + (v.cool === 'on')} of 2`, 'receivers switched on'),
    out: (v, ph, tour) => tour && ph ? ({
      0: 'Start with the states: a temperature of 5, and a candle that is unlit. Nothing changes until something asks.',
      3.5: 'A fire spell sends a Heat signal. It is only a message: “please get warmer”.',
      7.5: 'The candle only reacts because it has a Warmable and a Coolable receiver. Switch Coolable off and the Cool signal bounces off, with no change.',
      14: 'The transform is the instruction: Heat adds 1. At 6 or more, the candle lights.',
      20.5: 'Context rides along with the signal: a strong fire says “x2”, so the same receiver applies +2. Same parts, different outcome.',
    })[ph.at] : 'Send Heat or Cool, or switch a receiver off and try again. Every change goes signal, receiver, transform, state.',
  });
  function heat(s, a, n) {
    if (s.warm !== 'on') return [{ dt: 0, dur: 1.2, from: 'fire', to: 'warm', kind: 'command', label: 'Heat', bounce: 'not Warmable' }];
    const v = s.temp + n;
    return [
      { dt: 0, dur: .9, from: 'fire', to: 'warm', kind: 'command', label: 'Heat', ctx: n > 1 ? 'context: strong fire, x2' : null },
      { dt: .95, dur: .7, from: 'warm', to: 'up', kind: 'system', ctx: n > 1 ? 'x2' : null, set: { up: `+${n}` } },
      { dt: 1.7, dur: .8, from: 'up', to: 'temp', kind: 'system', label: `+${n}`, set: { temp: v } },
      { dt: 2.55, dur: .7, from: 'temp', to: 'lit', kind: 'system', label: `${v} ≥ ${LIT_AT}?`, set: { lit: v >= LIT_AT ? 'Lit' : 'Unlit', up: '+1' } },
    ];
  }
  function candleScene(g, v, flow, t) {
    // table and candle
    g.fillStyle = '#b98a5a'; g.fillRect(380, 168, 300, 16); g.fillStyle = '#8b6136'; g.fillRect(400, 184, 14, 30); g.fillRect(646, 184, 14, 30);
    g.fillStyle = '#f7efd8'; g.strokeStyle = '#c9b88e'; g.lineWidth = 3; g.beginPath(); g.roundRect(505, 90, 50, 78, 6); g.fill(); g.stroke();
    g.strokeStyle = '#3a2e22'; g.lineWidth = 3; g.beginPath(); g.moveTo(530, 90); g.lineTo(530, 78); g.stroke();
    if (v.lit === 'Lit') {
      const fl = 1 + .08 * Math.sin(t * 17);
      T.flash(530, 60, 70, .55);
      g.fillStyle = '#ffb951'; g.beginPath(); g.ellipse(530, 62, 11 * fl, 22 * fl, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff4c4'; g.beginPath(); g.ellipse(530, 68, 5, 11, 0, 0, Math.PI * 2); g.fill();
    } else { g.strokeStyle = 'rgba(120,110,100,.4)'; g.lineWidth = 3; for (let i = 0; i < 2; i++) { g.beginPath(); g.moveTo(530, 74 - i * 14); g.quadraticCurveTo(538, 66 - i * 14, 530, 58 - i * 14); g.stroke(); } }
    // thermometer
    const tx = 760, ty0 = 40, ty1 = 170, ty = k => lerp(ty1, ty0, k / 10);
    g.fillStyle = '#fff'; g.strokeStyle = C.navy; g.lineWidth = 3; g.beginPath(); g.roundRect(tx - 12, ty0 - 10, 24, ty1 - ty0 + 20, 12); g.fill(); g.stroke();
    g.fillStyle = v.temp >= LIT_AT ? '#e5322d' : '#2ea3dc'; g.fillRect(tx - 6, ty(v.temp), 12, ty1 - ty(v.temp) + 4);
    g.beginPath(); g.arc(tx, ty1 + 12, 16, 0, Math.PI * 2); g.fill(); g.stroke();
    g.setLineDash([5, 4]); g.strokeStyle = '#e0a92d'; g.beginPath(); g.moveTo(tx - 26, ty(LIT_AT)); g.lineTo(tx + 26, ty(LIT_AT)); g.stroke(); g.setLineDash([]);
    T.label(`lights at ${LIT_AT}`, tx + 80, ty(LIT_AT), 'center', '#9a5a06', 13);
    T.label(`${v.temp}`, tx - 48, ty(v.temp), 'center', C.ink, 18);
    // spells flying in with the first hop
    [['fire', 'warm', '#e5322d'], ['frost', 'cool', '#2ea3dc']].forEach(([a, b, col]) => {
      const f = flying(flow, a, b, t); if (!f) return;
      const k = progress(f, t), reach = f.bounce ? .82 : 1, x = lerp(120, 500, ease(Math.min(k / .9, 1)) * reach), y = 110 + (a === 'frost' ? 20 : -10);
      if (a === 'fire') { T.flash(x, y, 34, 1); g.fillStyle = col; g.beginPath(); g.arc(x, y, 11, 0, Math.PI * 2); g.fill(); }
      else { g.strokeStyle = col; g.lineWidth = 4; for (let i = 0; i < 3; i++) { const an = i * Math.PI / 3 + t * 4; g.beginPath(); g.moveTo(x - Math.cos(an) * 14, y - Math.sin(an) * 14); g.lineTo(x + Math.cos(an) * 14, y + Math.sin(an) * 14); g.stroke(); } }
      if (f.bounce && k > .75) T.popText('no effect', 470, 60, C.muted, (1 - k) * 4);
      if (f.ctx && k < .9) T.label('strong fire', x, y - 30, 'center', '#fff', 12, C.red);
    });
    T.label('Fire spell', 70, 100, 'center', '#fff', 13, C.red); T.label('Frost spell', 70, 140, 'center', '#fff', 13, '#2ea3dc');
  }

  /* ---------- 2. Mario 3 (slides 28-33) ---------- */
  const GOOMBA_X = 640;
  const mario = xrDemo('mario', {
    parts: ['signal', 'entity', 'receiver', 'system'], kinds: ['command', 'effect', 'system'],
    nodes: [
      { id: 'jump', x: 10, y: 266, w: 96, h: 60, part: 'signal', tag: 'Command', title: 'Jump' },
      { id: 'shoot', x: 10, y: 470, w: 96, h: 60, part: 'signal', tag: 'Command', title: 'Shoot' },
      { id: 'mario', x: 134, y: 258, w: 112, h: 78, part: 'entity', title: 'Mario', sub: 'attack zone below' },
      { id: 'ball', x: 134, y: 460, w: 112, h: 78, part: 'entity', title: 'Fireball', sub: 'created at (x, y)', value: '' },
      { id: 'goomba', x: 280, y: 352, w: 124, h: 92, part: 'receiver', tag: 'Receiver · enemy', title: 'Goomba', value: 'walking' },
      { id: 'health', x: 436, y: 352, w: 126, h: 92, part: 'system', tag: 'Health system', title: 'Health', value: 1 },
      { id: 'death', x: 594, y: 364, w: 100, h: 68, part: 'signal', tag: 'Signal', title: 'Death' },
      { id: 'anim', x: 726, y: 262, w: 130, h: 80, part: 'system', tag: 'Animation system', title: 'Goomba', value: 'walking' },
      { id: 'reward', x: 726, y: 456, w: 130, h: 80, part: 'system', tag: 'Reward system', title: 'Reward XP' },
      { id: 'level', x: 888, y: 344, w: 142, h: 110, part: 'system', tag: 'Party level-up', title: 'XP', value: 0, sub: 'level up at 100' },
    ],
    rules: {
      spawn: () => [{ dt: 0, dur: .01, set: { goomba: 'walking', health: 1, anim: 'walking', ball: '' } }],
      jump: (s, a) => hit(s, [
        { dt: 0, dur: .55, from: 'jump', to: 'mario', kind: 'command', label: 'Jump' },
        { dt: .6, dur: .7, from: 'mario', to: 'goomba', kind: 'effect', label: 'Stomp', ctx: 'detects Goomba' },
      ], 1.35),
      shoot: (s, a) => hit(s, [
        { dt: 0, dur: .55, from: 'shoot', to: 'mario', kind: 'command', label: 'Shoot' },
        { dt: .6, dur: .55, from: 'mario', to: 'ball', kind: 'system', label: 'Create', set: { ball: 'flying' } },
        { dt: 1.2, dur: .8, from: 'ball', to: 'goomba', kind: 'effect', label: 'Hit', ctx: 'detects Goomba', set: { ball: '' } },
      ], 2.05),
    },
    tour: [{ at: .6, type: 'jump' }, { at: 7.4, type: 'spawn' }, { at: 8.4, type: 'shoot' }],
    dur: 15.5,
    scene: marioScene,
    stats: v => stat(v.health ? 'g' : 'r', v.health, 'Goomba health') + stat('y', v.level, 'party XP') + stat('', v.anim, 'what the animation system shows'),
    out: v => v.level >= 200 ? 'Shoot runs a different route (Mario creates a Fireball, the Fireball hits) but it lands in the same Health, Death, Animation, Reward and Level-Up systems.'
      : v.level >= 100 ? 'One button press, and six parts of the game changed: Mario, the Goomba, its health, the death signal, the animation, the reward and the party’s level. Jump and Shoot are command signals; Stomp and Hit are side effects.'
        : 'Press Jump or Shoot. Watch the signal leave the player, become a stomp or a fireball, and ripple through the game’s systems.',
  });
  function hit(s, lead, d) {
    const xp = s.level + 100;
    return [...lead,
      { dt: d, dur: .7, from: 'goomba', to: 'health', kind: 'system', label: 'Damage -1', set: { goomba: 'hit', health: 0 } },
      { dt: d + .75, dur: .55, from: 'health', to: 'death', kind: 'system', label: '0 HP' },
      { dt: d + 1.35, dur: .7, from: 'death', to: 'anim', kind: 'system', set: { anim: 'squashed' } },
      { dt: d + 1.35, dur: .7, from: 'death', to: 'reward', kind: 'system' },
      { dt: d + 2.1, dur: .8, from: 'reward', to: 'level', kind: 'system', label: '+100 XP', set: { level: xp } },
    ];
  }
  function walker(g, x, y, squash, a = 1) {
    g.save(); g.globalAlpha = a; g.translate(x, y); g.scale(1 + squash * .5, 1 - squash * .7);
    g.fillStyle = '#9b5a2c'; g.strokeStyle = '#4e2a10'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(-26, 0); g.quadraticCurveTo(-30, -44, 0, -46); g.quadraticCurveTo(30, -44, 26, 0); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#f2d9b0'; g.fillRect(-14, -8, 28, 10);
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(-8, -24, 6, 9, 0, 0, Math.PI * 2); g.ellipse(8, -24, 6, 9, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#2a1a0c'; g.beginPath(); g.arc(-7, -22, 3, 0, Math.PI * 2); g.arc(7, -22, 3, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#3a2412'; g.beginPath(); g.ellipse(-14, 4, 11, 6, 0, 0, Math.PI * 2); g.ellipse(14, 4, 11, 6, 0, 0, Math.PI * 2); g.fill();
    g.restore();
  }
  function hero(g, x, y, fire) {
    g.save(); g.translate(x, y);
    g.fillStyle = fire ? '#fff' : '#e5322d'; g.strokeStyle = C.navy; g.lineWidth = 3;
    g.beginPath(); g.roundRect(-14, -36, 28, 24, 6); g.fill(); g.stroke();
    g.fillStyle = fire ? '#e5322d' : '#2e5fd6'; g.beginPath(); g.roundRect(-14, -14, 28, 18, 5); g.fill(); g.stroke();
    g.fillStyle = '#f2c79a'; g.beginPath(); g.arc(0, -46, 13, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = fire ? '#fff' : '#e5322d'; g.beginPath(); g.arc(0, -50, 13, Math.PI, 0); g.fill(); g.stroke(); g.fillRect(0, -52, 18, 5);
    g.fillStyle = '#5a3416'; g.fillRect(-14, 4, 11, 7); g.fillRect(3, 4, 11, 7);
    g.restore();
  }
  function marioScene(g, v, flow, t) {
    const gy = 176;
    g.fillStyle = '#9fd3f5'; g.fillRect(0, 0, W, gy);
    g.fillStyle = 'rgba(255,255,255,.8)'; [[120, 50], [430, 36], [820, 58]].forEach(([x, y]) => { g.beginPath(); g.ellipse(x, y, 46, 16, 0, 0, Math.PI * 2); g.ellipse(x + 30, y - 8, 30, 14, 0, 0, Math.PI * 2); g.fill(); });
    g.fillStyle = '#d98b3a'; g.fillRect(0, gy, W, 30); g.strokeStyle = '#8a4f18'; g.lineWidth = 2; for (let x = 0; x < W; x += 40) { g.strokeRect(x, gy, 40, 15); g.strokeRect(x + 20, gy + 15, 40, 15); }
    // Mario: jumps in an arc onto the Goomba during the Jump and Stomp hops
    let mx = 330, my = gy;
    const j = flow.find(f => f.from === 'jump' && t >= f.t && t <= f.t + 2.2);
    if (j) { const k = clamp((t - j.t) / 1.3); mx = lerp(330, GOOMBA_X - 10, ease(k)); my = gy - Math.sin(Math.min(k, 1) * Math.PI) * 110 * (k < 1 ? 1 : 0); if (t - j.t > 1.3) { const b = clamp((t - j.t - 1.3) / .9); mx = lerp(GOOMBA_X - 10, 330, ease(b)); my = gy - Math.sin(b * Math.PI) * 60; } }
    const shooter = flow.some(f => f.from === 'shoot' && t >= f.t);
    hero(g, mx, my, shooter);
    // the fireball, its own entity with its own attack zone
    const fb = flow.find(f => f.from === 'ball' && f.to === 'goomba' && t >= f.t - .55 && t <= f.t + f.dur);
    if (fb) { const k = clamp((t - (fb.t - .55)) / (fb.dur + .55)); const x = lerp(350, GOOMBA_X - 20, k), y = gy - 22 - Math.abs(Math.sin(k * Math.PI * 3)) * 40; T.flash(x, y, 26, 1); g.fillStyle = '#e5322d'; g.beginPath(); g.arc(x, y, 9, 0, Math.PI * 2); g.fill(); }
    // the Goomba: walks until the animation system says squashed
    const sq = v.anim === 'squashed', gx = GOOMBA_X + Math.sin(t * 2) * (v.goomba === 'walking' ? 14 : 0);
    const since = sq ? Math.max(0, t - (flow.filter(f => f.to === 'anim' && t >= f.t + f.dur).at(-1)?.t + .7 || t)) : 0;
    walker(g, gx, gy, sq ? 1 : v.goomba === 'hit' ? .3 : 0, sq ? clamp(1 - (since - 1) / .6) : 1);
    if (v.goomba === 'hit' && !sq) T.popText('stomp!', gx, gy - 70, '#9a5a06', 1);
    const lv = flow.filter(f => f.to === 'level' && t >= f.t + f.dur).at(-1);
    if (lv && t - lv.t - lv.dur < 1.6) { const a = t - lv.t - lv.dur; T.popText('+100 XP · Level-Up!', 880, 90 - 20 * a, '#9a5a06', 1.6 - a); }
    T.label('Mario 3 mechanics X-ray', 120, 22, 'center', '#fff', 13, C.navy);
  }

  /* ---------- 3. the one-time switch (slides 49-54) ---------- */
  const sw = xrDemo('switch', {
    parts: ['signal', 'entity', 'receiver', 'transform', 'state', 'system'], kinds: ['command', 'effect', 'system'],
    nodes: [
      { id: 'btnA', x: 12, y: 268, w: 110, h: 66, part: 'signal', tag: 'Command', title: 'Walk (stick)' },
      { id: 'btnY', x: 12, y: 466, w: 110, h: 66, part: 'signal', tag: 'Command', title: 'Y: hammer' },
      { id: 'boots', x: 152, y: 268, w: 128, h: 66, part: 'entity', title: 'Link’s feet', sub: 'step' },
      { id: 'hammer', x: 152, y: 466, w: 128, h: 66, part: 'entity', title: 'Hammer', sub: 'tool' },
      { id: 'recv', x: 330, y: 354, w: 150, h: 92, part: 'receiver', title: 'Switchable', sub: 'rusted: tool only' },
      { id: 'set', x: 530, y: 354, w: 140, h: 92, part: 'transform', title: 'Set Active' },
      { id: 'state', x: 720, y: 354, w: 140, h: 92, part: 'state', title: 'Switch', value: 'Inactive' },
      { id: 'door', x: 900, y: 354, w: 128, h: 92, part: 'system', tag: 'Door', title: 'Gate', value: 'Shut' },
    ],
    rules: {
      step: () => [
        { dt: 0, dur: .6, from: 'btnA', to: 'boots', kind: 'command', label: 'Walk' },
        { dt: .65, dur: 1.2, from: 'boots', to: 'recv', kind: 'effect', label: 'Step', bounce: 'rusted: needs a tool' },
      ],
      hammer: s => {
        const first = s.state !== 'Active';
        return [
          { dt: 0, dur: .6, from: 'btnY', to: 'hammer', kind: 'command', label: 'Y' },
          { dt: .65, dur: .8, from: 'hammer', to: 'recv', kind: 'effect', label: 'Lever tool used' },
          { dt: 1.5, dur: .7, from: 'recv', to: 'set', kind: 'system' },
          { dt: 2.25, dur: .7, from: 'set', to: 'state', kind: 'system', label: first ? 'Inactive → Active' : 'already Active', set: { state: 'Active' } },
          ...(first ? [{ dt: 3, dur: .7, from: 'state', to: 'door', kind: 'system', label: 'open', set: { door: 'Open' } }] : []),
        ];
      },
    },
    tour: [{ at: .8, type: 'step' }, { at: 4.2, type: 'hammer' }, { at: 9.4, type: 'hammer' }],
    dur: 13.5,
    scene: switchScene,
    stats: v => stat(v.state === 'Active' ? 'g' : '', v.state, 'switch (state)') + stat(v.door === 'Open' ? 'g' : 'y', v.door, 'gate'),
    out: v => v.state === 'Active'
      ? 'The hammer sends a “lever tool used” signal, the Switchable receiver accepts it, the transform sets it Active, and the gate opens. It is a one-time switch: hit it again and Active stays Active.'
      : 'Stepping on a rusted switch sends a signal, but this receiver only accepts a tool. Some mechanics need both the right situation and the right tool.',
  });
  function switchScene(g, v, flow, t) {
    T.floor(0, 0, W, SCENE);
    T.wall(0, 0, W, 40); T.wall(860, 40, 40, SCENE - 40);
    // gate: bars slide up when the gate system says Open
    const op = flow.find(f => f.to === 'door' && t >= f.t + f.dur), k = op ? clamp((t - op.t - op.dur) / .8) : 0;
    g.fillStyle = '#62688a'; for (let i = 0; i < 5; i++) g.fillRect(866 + i * 7, 60 - 120 * ease(k), 4, 140 - 20);
    T.label(v.door === 'Open' ? 'Gate open' : 'Gate shut', 880, 190, 'center', '#fff', 12, v.door === 'Open' ? C.good : C.muted);
    // the rusted switch plate
    const sx = 560, sy = 130, act = v.state === 'Active';
    g.fillStyle = act ? '#7fbf6a' : '#a5643a'; g.strokeStyle = C.navy; g.lineWidth = 3; g.beginPath(); g.roundRect(sx - 34, sy - 22, 68, 44, 8); g.fill(); g.stroke();
    g.fillStyle = act ? '#2fae63' : '#8a4b28'; g.beginPath(); g.ellipse(sx, sy - (act ? 0 : 6), 22, 12, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    if (!act) { g.fillStyle = 'rgba(120,60,20,.6)'; [[-20, -12], [16, 10], [-8, 14], [22, -14]].forEach(([dx, dy]) => { g.beginPath(); g.arc(sx + dx, sy + dy, 4, 0, Math.PI * 2); g.fill(); }); }
    T.label(act ? 'Active' : 'Rusted switch', sx, sy + 50, 'center', '#fff', 12, act ? C.good : '#8a4b28');
    // Link: walks onto it (step), or swings the hammer from beside it
    const st = flow.find(f => f.from === 'btnA' && t >= f.t && t <= f.t + 2.4), hm = flow.filter(f => f.from === 'btnY' && t >= f.t && t <= f.t + 2.6).at(-1);
    let px = 300, py = 130, face = 0;
    if (st) { const k = clamp((t - st.t) / 1.6); px = lerp(300, sx, ease(Math.min(k * 1.4, 1))); if (t - st.t > 1.8) px = lerp(sx, 300, ease(clamp((t - st.t - 1.8) / .6))); if (k > .7 && k < 1) T.popText('no effect', sx, 70, C.muted, 1); }
    if (hm) { const k = clamp((t - hm.t) / .9); px = lerp(300, sx - 70, ease(Math.min(k * 1.3, 1))); }
    T.player(px, py, face, 1.05);
    if (hm && t - hm.t > .6 && t - hm.t < 1.5) {
      const k = clamp((t - hm.t - .6) / .5), a = lerp(-1.6, .3, ease(k));
      g.save(); g.translate(px, py); g.rotate(a); g.fillStyle = '#8b6136'; g.fillRect(0, -4, 58, 8); g.fillStyle = C.stone; g.strokeStyle = C.navy; g.lineWidth = 2; g.fillRect(48, -14, 22, 28); g.strokeRect(48, -14, 22, 28); g.restore();
      if (k > .9) { T.flash(sx, sy, 50, 1); T.popText('clang!', sx, sy - 50, '#9a5a06', 1); }
    }
  }

  /* ---------- 4. flammable (slides 99-100) ---------- */
  const flame = xrDemo('flame', {
    parts: ['entity', 'receiver', 'transform', 'state'], kinds: ['command', 'effect', 'system'],
    opts: { dry: true },
    toggles: [['.xr-dry', 'dry', 'dry']],
    nodes: [
      { id: 'arrow', x: 10, y: 268, w: 110, h: 72, part: 'entity', title: 'Fire arrow', sub: 'sends Burn' },
      { id: 'ra', x: 160, y: 268, w: 150, h: 72, part: 'receiver', title: 'Grass A', sub: 'Flammable' },
      { id: 'ta', x: 350, y: 268, w: 130, h: 72, part: 'transform', title: 'Set on fire' },
      { id: 'sa', x: 520, y: 268, w: 150, h: 72, part: 'state', title: 'Grass A', value: 'Not on fire' },
      { id: 'rb', x: 160, y: 372, w: 150, h: 72, part: 'receiver', title: 'Grass B', sub: 'Flammable', value: '' },
      { id: 'tb', x: 350, y: 372, w: 130, h: 72, part: 'transform', title: 'Set on fire' },
      { id: 'sb', x: 520, y: 372, w: 150, h: 72, part: 'state', title: 'Grass B', value: 'Not on fire' },
      { id: 'stone', x: 160, y: 476, w: 150, h: 72, part: 'entity', title: 'Stone', sub: 'no Flammable receiver' },
      { id: 'look', x: 760, y: 300, w: 260, h: 104, part: 'system', tag: 'Visual + mechanical', title: 'On fire: particles,\nburns, spreads', fs: 14 },
    ],
    rules: {
      dry: (s, a) => [{ dt: 0, dur: .01, set: { rb: a.dry ? '' : 'wet' } }],
      reset: () => [{ dt: 0, dur: .01, set: { sa: 'Not on fire', sb: 'Not on fire' } }],
      arrow: s => {
        if (s.sa === 'On fire') return [{ dt: 0, dur: 1.1, from: 'arrow', to: 'ra', kind: 'command', label: 'Burn', bounce: 'already on fire' }];
        const hops = [
          { dt: 0, dur: .9, from: 'arrow', to: 'ra', kind: 'command', label: 'Burn' },
          { dt: .95, dur: .6, from: 'ra', to: 'ta', kind: 'system' },
          { dt: 1.6, dur: .6, from: 'ta', to: 'sa', kind: 'system', set: { sa: 'On fire' } },
          { dt: 2.25, dur: .6, from: 'sa', to: 'look', kind: 'system', via: [720, 300] },
          { dt: 2.9, dur: .9, from: 'sa', to: 'rb', kind: 'effect', label: 'Burn (spreads)', via: [420, 345], bounce: s.rb === 'wet' ? 'not Flammable (wet)' : undefined },
        ];
        if (s.rb !== 'wet') hops.push(
          { dt: 3.85, dur: .6, from: 'rb', to: 'tb', kind: 'system' },
          { dt: 4.5, dur: .6, from: 'tb', to: 'sb', kind: 'system', set: { sb: 'On fire' } },
          { dt: 5.15, dur: .9, from: 'sb', to: 'stone', kind: 'effect', label: 'Burn (spreads)', via: [470, 460], bounce: 'not Flammable' },
        );
        return hops;
      },
    },
    tour: [{ at: .8, type: 'arrow' }, { at: 8.5, type: 'reset' }, { at: 8.6, type: 'dry', dry: false }, { at: 9.4, type: 'arrow' }, { at: 15.5, type: 'dry', dry: true }],
    dur: 16,
    scene: flameScene,
    stats: v => stat(v.sa === 'On fire' ? 'r' : '', v.sa, 'Grass A') + stat(v.sb === 'On fire' ? 'r' : '', v.sb, `Grass B${v.rb === 'wet' ? ' (wet)' : ''}`) + stat('', 'Stable', 'Stone, always'),
    out: v => v.sb === 'On fire'
      ? 'The arrow sends Burn. Grass is Flammable, so it accepts it and is set on fire, and anything on fire sends Burn to its neighbours. The stone has no Flammable receiver, so the fire stops there.'
      : v.rb === 'wet'
        ? 'Wet grass B has lost its Flammable receiver: the spreading Burn signal bounces off, and the fire stops at A.'
        : 'Shoot a fire arrow into the grass and follow the Burn signal.',
  });
  const FIRE_X = [400, 560, 720];
  function flameScene(g, v, flow, t) {
    g.fillStyle = '#cfe0ae'; g.fillRect(0, 0, W, SCENE);
    // stone and two tufts in a row
    const burning = [v.sa === 'On fire', v.sb === 'On fire'];
    [0, 1].forEach(i => {
      const x = FIRE_X[i], y = 120, wet = i === 1 && v.rb === 'wet';
      g.lineCap = 'round';
      for (let b = 0; b < 9; b++) { g.strokeStyle = burning[i] ? (b % 2 ? '#5b3a1a' : '#3a2a18') : wet ? (b % 2 ? '#2f7a8a' : '#3e8f9e') : (b % 2 ? '#3f8a3a' : '#57a347'); g.lineWidth = 7; g.beginPath(); g.moveTo(x + (b - 4) * 6, y + 30); g.lineTo(x + (b - 4) * 9, y + 30 - (burning[i] ? 22 : 56 - Math.abs(b - 4) * 5)); g.stroke(); }
      if (wet) { g.fillStyle = '#57b6ff'; [[-20, -30], [14, -42], [26, -10]].forEach(([dx, dy]) => { g.beginPath(); g.ellipse(x + dx, y + dy, 4, 6, 0, 0, Math.PI * 2); g.fill(); }); }
      if (burning[i]) { for (let f = 0; f < 6; f++) { const ph = t * 6 + f * 1.7, fx = x + (f - 2.5) * 12, fh = 34 + 16 * Math.sin(ph); g.fillStyle = f % 2 ? '#ff7a2a' : '#ffb951'; g.beginPath(); g.moveTo(fx - 9, y + 12); g.quadraticCurveTo(fx, y + 12 - fh * 1.6, fx + 9, y + 12); g.fill(); } T.flash(x, y - 6, 70, .35); }
      T.label(['Grass A', 'Grass B'][i], x, 186, 'center', '#fff', 12, burning[i] ? C.red : wet ? '#1f6c9a' : '#3f8a3a');
    });
    T.pillar(FIRE_X[2] - 30, 100, 60, 50); T.label('Stone', FIRE_X[2], 186, 'center', '#fff', 12, C.stoneDk);
    T.player(120, 120, 0, 1.05); T.label('Player', 120, 160, 'center', C.ink, 12);
    const f = flying(flow, 'arrow', 'ra', t);
    if (f) { const k = progress(f, t), x = lerp(150, FIRE_X[0] - 20, Math.min(k / .9, 1)); g.strokeStyle = '#8b6136'; g.lineWidth = 4; g.beginPath(); g.moveTo(x - 40, 110); g.lineTo(x, 110); g.stroke(); T.flash(x, 110, 22, 1); }
    // spread: a spark hopping from A to B, then B to the stone
    [['sa', 'rb', 0], ['sb', 'stone', 1]].forEach(([a, b, i]) => { const s = flying(flow, a, b, t); if (!s) return; const k = progress(s, t), reach = s.bounce ? .75 : 1; const x = lerp(FIRE_X[i] + 20, FIRE_X[i + 1] - 20, Math.min(k / .8, 1) * reach); T.flash(x, 100 - Math.sin(k * Math.PI) * 30, 24, 1); if (s.bounce && k > .75) T.popText('no effect', FIRE_X[i + 1], 52, C.muted, (1 - k) * 4); });
  }

  window.__seek = (t, w) => ({ candle, mario, switch: sw, flame })[w].seek(t);
  window.__dur = w => ({ candle, mario, switch: sw, flame })[w].dur();
})();
