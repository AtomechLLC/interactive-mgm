/* Interaction + context = outcome (RGF C2 M5, deck slides 235-243). One axe button, a draggable hero, a tree and an enemy
   seen from above. Each press sends Axe to the controller box (same Input -> Controller layout as the puppet tracer, drawn
   with ../shared/xray.js); the context the hero stands in rides along, and the controller routes it to one of four outcomes.
   The walk-through is a path plus timed presses, so the page is a pure function of time and GIFs can seek. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;
  const W = 1040, H = 585, SH = 300, TAU = Math.PI * 2;
  const TREE = [210, 150], FOE = [740, 150], FOE_ANG = Math.PI;   // the enemy faces left, toward the tree
  const SPOT = { tree: [292, 168], back: [828, 150], front: [652, 150], open: [470, 236], below: [740, 262] };
  const CTX = {
    tree: { name: 'next to a tree', out: 'chop', text: 'Next to a tree, the axe button chops the tree.' },
    back: { name: 'behind an enemy', out: 'back', text: 'Behind an enemy, the same press becomes an overhead swing: a backstab.' },
    front: { name: 'facing an enemy', out: 'front', text: 'In front of an enemy, it is a plain attack, and the enemy sees it coming.' },
    open: { name: 'open ground', out: 'air', text: 'Nothing nearby, so the axe simply swings at the air.' },
  };
  function zoneOf(x, y) {
    if (Math.hypot(x - TREE[0], y - TREE[1]) < 120) return 'tree';
    const dx = x - FOE[0], dy = y - FOE[1], d = Math.hypot(dx, dy);
    if (d < 130) { const a = Math.atan2(dy, dx), rel = Math.abs(((a - FOE_ANG) % TAU + TAU + Math.PI) % TAU - Math.PI); return rel < Math.PI / 2 ? 'front' : 'back'; }
    return 'open';
  }
  const NODES = [
    { id: 'input', x: 20, y: 356, w: 180, h: 96, part: 'entity', title: 'Input', sub: 'Axe button' },
    { id: 'ctx', x: 120, y: 478, w: 200, h: 86, part: 'context', title: 'Context', sub: '' },
    { id: 'ctrl', x: 250, y: 346, w: 230, h: 116, part: 'entity', title: 'Controller', value: 'Idle', sub: 'reads the context' },
    { id: 'chop', x: 640, y: 318, w: 380, h: 60, part: 'entity', title: 'Chop', sub: 'the tree takes the hit, wood chips fly' },
    { id: 'back', x: 640, y: 384, w: 380, h: 60, part: 'entity', title: 'Overhead backstab', sub: 'a bigger swing from behind' },
    { id: 'front', x: 640, y: 450, w: 380, h: 60, part: 'entity', title: 'Attack', sub: 'a plain swing the enemy can react to' },
    { id: 'air', x: 640, y: 516, w: 380, h: 60, part: 'entity', title: 'Swing', sub: 'nothing there, the axe hits the air' },
  ];
  const RULES = {
    axe: (s, a) => {
      const c = CTX[a.zone];
      return [
        { dt: 0, dur: .45, from: 'input', to: 'ctrl', kind: 'command', label: 'Axe', set: { ctrl: 'Reading context' } },
        { dt: .15, dur: .4, from: 'ctx', to: 'ctrl', kind: 'system', label: c.name },
        { dt: .65, dur: .45, from: 'ctrl', to: c.out, kind: 'command', ctx: c.name, set: { ctrl: 'Idle', last: a.zone } },
      ];
    },
  };
  // walk-through: where the hero stands, and when it presses
  const PATH = [[0, 'open'], [.8, 'open'], [1.6, 'tree'], [4.2, 'tree'], [5.2, 'open'], [6.4, 'front'], [9.2, 'front'], [9.9, 'below'], [10.6, 'back'], [13.4, 'back'], [14.6, 'open'], [17.6, 'open']];
  const PRESS = [{ at: .8, type: 'axe' }, { at: 2.2, type: 'axe' }, { at: 6.8, type: 'axe' }, { at: 11.0, type: 'axe' }];
  const DUR = 17.6;
  const tourPos = t => {
    for (let i = 1; i < PATH.length; i++) if (t <= PATH[i][0]) { const [t0, a] = PATH[i - 1], [t1, b] = PATH[i], k = ease(clamp((t - t0) / (t1 - t0))); return [lerp(SPOT[a][0], SPOT[b][0], k), lerp(SPOT[a][1], SPOT[b][1], k)]; }
    return SPOT[PATH.at(-1)[1]];
  };

  let api;
  canvasDemo('axe', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, acts: [], flow: [], pos: SPOT.open.slice(), drag: false, key: '' };
    const tourBtn = $(s, '.ax-tour'), out = $(s, '.ax-out');
    const tourActs = () => PRESS.map(p => ({ ...p, zone: zoneOf(...tourPos(p.at)) }));
    const rebuild = () => { st.flow = XR.script(NODES, st.tour ? tourActs() : st.acts, RULES); };
    const free = () => { st.held = false; if (!st.tour) return; st.pos = tourPos(st.t); st.tour = false; tourBtn.classList.remove('on'); st.t = 0; st.acts = []; rebuild(); };
    const press = () => { free(); st.acts.push({ at: Math.max(st.t, XR.end(st.flow) - .3) + .02, type: 'axe', zone: zoneOf(...st.pos) }); rebuild(); };
    $(s, '.ax-press').onclick = press;
    $$(s, '.ax-spot .btn').forEach(b => b.onclick = () => { free(); st.pos = SPOT[b.dataset.v].slice(); });
    tourBtn.onclick = () => { st.tour = true; st.held = false; st.t = 0; tourBtn.classList.add('on'); rebuild(); };
    $(s, '.ax-reset').onclick = () => { st.tour = true; free(); st.pos = SPOT.open.slice(); };
    document.addEventListener('keydown', e => { if (!s.classList.contains('active') || e.code !== 'KeyK' || e.repeat) return; e.preventDefault(); press(); });
    const toCanvas = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height]; };
    cv.addEventListener('pointerdown', e => { const [x, y] = toCanvas(e); if (y > SH) return; free(); st.drag = true; try { cv.setPointerCapture(e.pointerId); } catch (er) { /* synthetic events */ } st.pos = [clamp(x, 30, W - 30), clamp(y, 30, SH - 30)]; });
    cv.addEventListener('pointermove', e => { if (!st.drag) return; const [x, y] = toCanvas(e); st.pos = [clamp(x, 30, W - 30), clamp(y, 30, SH - 30)]; });
    const up = () => { st.drag = false; };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    rebuild();

    function render() {
      const t = st.t, pos = st.tour ? tourPos(t) : st.pos, zone = zoneOf(...pos);
      T.use(g); g.clearRect(0, 0, W, H);
      // the scene
      g.save(); g.beginPath(); g.roundRect(0, 0, W, SH, 14); g.clip();
      T.floor(0, 0, W, SH);
      zones(g, zone);
      // the outcome playing out
      const hop = st.flow.filter(f => f.from === 'ctrl' && t >= f.t + f.dur).at(-1), age = hop ? t - hop.t - hop.dur : 9, out0 = hop?.to;
      const shake = out0 === 'chop' && age < .5 ? Math.sin(age * 60) * 4 * (1 - age / .5) : 0;
      tree(g, TREE[0] + shake, TREE[1]);
      if (out0 === 'chop' && age < .9) for (let i = 0; i < 7; i++) { const a = -2.6 + i * .5, d = 20 + age * 120; g.fillStyle = `rgba(160,110,50,${1 - age / .9})`; g.fillRect(TREE[0] + 40 + Math.cos(a) * d, TREE[1] + Math.sin(a) * d, 7, 4); }
      const hit = (out0 === 'back' || out0 === 'front') && age < .6;
      T.foe(FOE[0] + (hit ? (out0 === 'back' ? -1 : 1) * 8 * (1 - age / .6) : 0), FOE[1], 30, FOE_ANG, out0 === 'back' && hit ? '#ff8a7a' : C.red);
      T.label('Enemy (faces left)', FOE[0], FOE[1] + 52, 'center', C.redDk, 13);
      const face = zone === 'tree' ? Math.atan2(TREE[1] - pos[1], TREE[0] - pos[0]) : zone === 'back' || zone === 'front' ? Math.atan2(FOE[1] - pos[1], FOE[0] - pos[0]) : 0;
      T.player(pos[0], pos[1], face, 1.1);
      // the axe: a sweep in front of the hero, overhead for a backstab
      if (hop && age < .5) {
        const k = age / .5, over = out0 === 'back';
        g.save(); g.translate(pos[0], pos[1]); g.rotate(face);
        g.strokeStyle = `rgba(255,255,255,${.8 * (1 - k)})`; g.lineWidth = over ? 10 : 7; g.beginPath(); g.arc(0, 0, over ? 52 : 44, -1.2, lerp(-1.2, 1.2, ease(k))); g.stroke();
        const a = lerp(-1.2, 1.2, ease(k)); g.rotate(a); g.fillStyle = '#8b6136'; g.fillRect(14, -3, 34, 6); g.fillStyle = '#b9bccb'; g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.moveTo(44, -4); g.lineTo(58, -14); g.lineTo(58, 10); g.lineTo(44, 4); g.closePath(); g.fill(); g.stroke();
        g.restore();
      }
      if (hop && age < 1.2) {
        const [txt, col, x, y] = { chop: ['Chop!', '#7a4a00', TREE[0], TREE[1] - 90], back: ['Backstab!', '#8a4fd6', FOE[0], FOE[1] - 70], front: ['Attack', C.red, FOE[0], FOE[1] - 70], air: ['Swing… nothing there', C.muted, pos[0], pos[1] - 60] }[out0];
        T.popText(txt, x, y - age * 16, col, (1.2 - age) * 2);
      }
      T.label(`Standing: ${CTX[zone].name}`, 16, 22, 'left', '#fff', 14, C.navy);
      g.restore();
      // the X-ray: Input + Context -> Controller -> Outcome
      XR.frame(g, 0, SH + 8, W, H - SH - 8);
      g.fillStyle = '#d9d2e9'; g.fillRect(960, SH + 16, 70, 26);
      NODES[1].sub = CTX[zone].name;
      const { val } = XR.draw(g, NODES, st.flow, t);
      const shown = hop && age < 2.5 ? hop.ctx : CTX[zone].name, res = hop && age < 2.5 ? NODES.find(n => n.id === out0).title : '?';
      g.font = '800 17px Montserrat, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = '#20124d';
      g.fillText(`Axe + ${shown} = ${res}`, 24, SH + 32);
      const txt = hop && age < 3 ? CTX[Object.keys(CTX).find(k => CTX[k].out === out0)].text : st.tour ? 'Watch the hero walk from spot to spot and press the same axe button each time.' : 'Drag the hero next to the tree, behind or in front of the enemy, or onto open ground, then press K.';
      if (out.textContent !== txt) say(out, txt);
      if (zone !== st.key) { st.key = zone; $$(s, '.ax-spot .btn').forEach(b => b.classList.toggle('on', b.dataset.v === zone)); }
    }
    api = { seek(t) { st.held = true; if (!st.tour) { st.tour = true; tourBtn.classList.add('on'); rebuild(); } st.t = t; render(); }, dur: () => DUR };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > DUR) st.t = 0; render(); };
  });

  function tree(g, x, y) {
    T.shadow(x + 6, y + 10, 62, 50, .25);
    g.fillStyle = '#6e3414'; g.beginPath(); g.arc(x, y, 14, 0, TAU); g.fill();
    [[0, 0, 52, '#3f8a3a'], [-22, -14, 30, '#57a347'], [18, -18, 26, '#57a347'], [8, 16, 28, '#4a9a40']].forEach(([dx, dy, r, c]) => { g.fillStyle = c; g.beginPath(); g.arc(x + dx, y + dy, r, 0, TAU); g.fill(); });
    g.strokeStyle = '#226b2f'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, 52, 0, TAU); g.stroke();
    T.label('Tree', x, y + 70, 'center', '#226b2f', 13);
  }
  function zones(g, zone) {
    const ring = (x, y, r, a0, a1, col, on) => { g.save(); g.fillStyle = on ? col.replace(')', ',.22)').replace('rgb', 'rgba') : col.replace(')', ',.08)').replace('rgb', 'rgba'); g.strokeStyle = col; g.globalAlpha = on ? 1 : .55; g.setLineDash([6, 6]); g.lineWidth = 2; g.beginPath(); if (a1 - a0 < TAU - .01) g.moveTo(x, y); g.arc(x, y, r, a0, a1); g.closePath(); g.fill(); g.stroke(); g.restore(); };
    ring(TREE[0], TREE[1], 120, 0, TAU, 'rgb(47,174,99)', zone === 'tree');
    ring(FOE[0], FOE[1], 130, FOE_ANG - Math.PI / 2, FOE_ANG + Math.PI / 2, 'rgb(229,50,45)', zone === 'front');
    ring(FOE[0], FOE[1], 130, -Math.PI / 2, Math.PI / 2, 'rgb(138,79,214)', zone === 'back');
    g.font = '700 12px Jost, sans-serif'; g.textAlign = 'center'; g.fillStyle = '#8a1c15'; g.fillText('front', FOE[0] - 96, FOE[1] - 92);
    g.fillStyle = '#5a2a9a'; g.fillText('back', FOE[0] + 96, FOE[1] - 92);
  }

  window.__seek = (t, w) => api.seek(t);
  window.__dur = w => api.dur();
})();
