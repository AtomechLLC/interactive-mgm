/* Type weakness X-ray (MGM C4 M2, deck slides 104-107). The slide's worked example: a 10 HP creature takes a 5 damage hit.
   The damage signal carries a context (its type). The receiver checks it: electric damage on an electric-vulnerable target
   is transformed as (-5) x2 and the creature is Dying at 0; anything else is (-5) x1 and it is only Wounded at 5.
   Numbers are the slide's: HP, DMG. The tour plays three hits that differ only in context. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD;
  const W = 1040, H = 585, HP = 10, DMG = 5;
  const TYPES = { electric: { name: 'Electric', col: '#e0a92d' }, fire: { name: 'Fire', col: '#e5322d' }, physical: { name: 'Physical', col: '#8b8fa8' } };
  const doubled = c => c.type === 'electric' && c.vuln;

  // the slide 107 diagram: Damage + Damage Type into Attackable, then the Type Vulnerability box with its two rows
  function nodes(c) {
    return [
      { id: 'tv', back: true, x: 300, y: 262, w: 560, h: 310, part: 'entity', title: 'Type Vulnerability' },
      { id: 'dtype', x: 10, y: 268, w: 130, h: 76, part: 'context', title: 'Damage Type', links: ['dsig'] },
      { id: 'atk', x: 10, y: 410, w: 140, h: 110, part: 'entity', title: 'Pikachu', sub: `${TYPES[c.type].name.toLowerCase()} attack`, art: (g, x, y) => { const i = ART.pikachu; if (i.complete && i.naturalWidth) g.drawImage(i, x - 30, y - 30, 60, 60); } },
      { id: 'dsig', x: 168, y: 332, w: 90, h: 80, part: 'signal', title: 'Damage' },
      { id: 'rcv', x: 262, y: 336, w: 76, h: 76, part: 'receiver', title: 'Attackable' },
      { id: 'chk', x: 356, y: 336, w: 140, h: 76, part: 'receiver', title: 'Is electric damage?', sub: c.vuln ? 'Electric Vulnerable' : 'not vulnerable', fs: 12 },
      { id: 'hpA', x: 500, y: 296, w: 70, h: 76, part: 'state', title: '', value: HP },
      { id: 'x2', x: 572, y: 296, w: 110, h: 76, part: 'transform', title: `(-${DMG}) x2` },
      { id: 'a0', x: 684, y: 296, w: 74, h: 76, part: 'state', title: '', value: '' },
      { id: 'dying', x: 880, y: 296, w: 120, h: 76, part: 'signal', title: 'Dying' },
      { id: 'hpB', x: 500, y: 460, w: 70, h: 76, part: 'state', title: '', value: HP },
      { id: 'x1', x: 572, y: 460, w: 110, h: 76, part: 'transform', title: `(-${DMG}) x1` },
      { id: 'b0', x: 684, y: 460, w: 74, h: 76, part: 'state', title: '', value: '' },
      { id: 'wounded', x: 880, y: 460, w: 120, h: 76, part: 'signal', title: 'Wounded' },
    ];
  }
  function flow(c) {
    const two = doubled(c), hp = HP - DMG * (two ? 2 : 1), r = two ? ['hpA', 'x2', 'a0', 'dying'] : ['hpB', 'x1', 'b0', 'wounded'];
    return [
      { t: .4, dur: .7, from: 'atk', to: 'dsig', kind: 'command', ctx: `type: ${TYPES[c.type].name}` },
      { t: 1.15, dur: .45, from: 'dsig', to: 'rcv', kind: 'effect', label: `Damage ${DMG}`, ctx: `type: ${TYPES[c.type].name}` },
      { t: 1.65, dur: .6, from: 'rcv', to: 'chk', kind: 'system', ctx: `type: ${TYPES[c.type].name}` },
      { t: 2.3, dur: .5, from: 'chk', to: r[0], kind: 'system', label: two ? 'yes and yes' : 'no' },
      { t: 2.85, dur: .4, from: r[0], to: r[1], kind: 'system' },
      { t: 3.3, dur: .5, from: r[1], to: r[2], kind: 'system', set: { [r[2]]: hp, hp } },
      { t: 3.85, dur: .5, from: r[2], to: r[3], kind: 'system', set: { cond: hp <= 0 ? 'Dying' : 'Wounded' } },
    ];
  }
  const RUN = 7;

  // Pikachu and Squirtle (official artwork via PokeAPI, ../img/); educational use, per Xelnath
  const ART = {}; ['pikachu', 'squirtle'].forEach(n => { const i = new Image(); i.src = new URL(`../img/${n}.png`, location.href).href; ART[n] = i; });
  function critter(g, x, y, kind, a = 1, shake = 0, tilt = 0) {
    const img = ART[kind === 'atk' ? 'pikachu' : 'squirtle'];
    g.save(); g.globalAlpha = a; g.translate(x + Math.sin(shake * 60) * 6 * clamp(shake * 3), y); g.rotate(tilt);
    T.shadow(4, 52, 52, 12, .22);
    if (img.complete && img.naturalWidth) { g.save(); if (kind !== 'atk') g.scale(-1, 1); g.drawImage(img, -70, -82, 140, 140); g.restore(); }
    g.restore();
  }
  function hpBar(g, x, y, v) {
    g.fillStyle = 'rgba(21,32,68,.85)'; g.fillRect(x - 3, y - 3, 166, 22);
    g.fillStyle = '#5a1f1c'; g.fillRect(x, y, 160, 16);
    g.fillStyle = v > 5 ? C.p2 : v > 0 ? '#e0a92d' : C.red; g.fillRect(x, y, 160 * clamp(v / HP), 16);
    g.fillStyle = 'rgba(21,32,68,.8)'; for (let i = 1; i < HP; i++) g.fillRect(x + 16 * i - .75, y, 1.5, 16);
    g.fillStyle = '#fff'; g.font = '700 13px Jost, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(`${Math.max(0, v)} / ${HP} HP`, x + 80, y + 8);
  }
  // the attack itself, in sync with the first two signal hops (t .4 to 1.6)
  function shot(g, c, t) {
    const k = clamp((t - .4) / 1.2); if (k <= 0 || k >= 1) return;
    const x0 = 260, x1 = 760, y = 120, x = lerp(x0, x1, ease(k)), col = TYPES[c.type].col;
    if (c.type === 'electric') {
      g.strokeStyle = col; g.lineWidth = 6; g.lineJoin = 'round'; g.shadowColor = col; g.shadowBlur = 14;
      g.beginPath(); g.moveTo(x - 70, y); for (let i = 1; i <= 6; i++) g.lineTo(x - 70 + i * 14, y + (i % 2 ? -14 : 14)); g.stroke(); g.shadowBlur = 0;
    } else if (c.type === 'fire') {
      T.flash(x, y, 40, 1); g.fillStyle = col; g.beginPath(); g.arc(x, y, 14, 0, Math.PI * 2); g.fill();
    } else {
      g.fillStyle = C.stone; g.strokeStyle = C.navy; g.lineWidth = 3; g.save(); g.translate(x, y - Math.sin(k * Math.PI) * 50); g.rotate(k * 8);
      g.beginPath(); g.moveTo(-14, -8); g.lineTo(4, -16); g.lineTo(16, -2); g.lineTo(8, 14); g.lineTo(-12, 10); g.closePath(); g.fill(); g.stroke(); g.restore();
    }
  }

  function draw(g, c, t) {
    T.use(g); g.clearRect(0, 0, W, H);
    const N = nodes(c), F = flow(c);
    // battle scene
    g.fillStyle = 'rgba(255,252,244,.75)'; g.beginPath(); g.roundRect(0, 0, W, 214, 14); g.fill();
    g.fillStyle = 'rgba(143,174,106,.35)'; g.beginPath(); g.ellipse(200, 172, 120, 22, 0, 0, Math.PI * 2); g.ellipse(820, 172, 120, 22, 0, 0, Math.PI * 2); g.fill();
    const { val } = XR.replay(N, F, t), hp = val.hp ?? HP, hit = t - 4.35, dying = val.cond === 'Dying';
    val.hp = hp; val.cond = val.cond || 'Healthy';
    critter(g, 200, 128, 'atk', 1, 0, Math.sin(clamp((t - .2) / .3) * Math.PI) * -.15);
    critter(g, 820, 128, 'tgt', dying ? lerp(1, .45, clamp(hit / .8)) : 1, hit > 0 && hit < .5 ? hit : 0, dying ? lerp(0, 1.2, ease(clamp(hit / .8))) : 0);
    hpBar(g, 740, 22, hp);
    T.label(c.vuln ? 'Squirtle · electric vulnerable' : 'Squirtle · not vulnerable', 820, 196, 'center', '#fff', 13, c.vuln ? '#1f6c9a' : C.muted);
    T.label(`Pikachu · ${TYPES[c.type].name.toLowerCase()} attack · ${DMG} damage`, 200, 196, 'center', '#fff', 13, TYPES[c.type].col === '#e0a92d' ? '#b77d07' : TYPES[c.type].col);
    shot(g, c, t);
    if (hit > 0 && hit < 1.6) T.popText(dying ? `-${HP} · Dying!` : `-${DMG} · Wounded`, 935, 110 - 18 * hit, dying ? C.redDk : '#9a5a06', 1.6 - hit);
    // the X-ray
    XR.frame(g, 0, 224, W, H - 224);
    XR.legend(g, 20, 246, ['state', 'signal', 'receiver', 'transform', 'context', 'entity']);
    XR.draw(g, N, F, t);
    return val;
  }

  const TOUR = [{ type: 'electric', vuln: true }, { type: 'fire', vuln: true }, { type: 'electric', vuln: false }];
  const DUR = RUN * TOUR.length;

  let api;
  canvasDemo('weak', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, c: { type: 'electric', vuln: true }, key: '' };
    const tourBtn = $(s, '.tw-tour'), vuln = $(s, '.tw-vuln');
    const sync = () => { $$(s, '.tw-type .btn').forEach(b => b.classList.toggle('on', b.dataset.v === st.c.type)); vuln.checked = st.c.vuln; };
    const free = () => { st.tour = false; tourBtn.classList.remove('on'); st.t = 0; };
    $$(s, '.tw-type .btn').forEach(b => b.onclick = () => { free(); st.c = { ...st.c, type: b.dataset.v }; sync(); });
    vuln.onchange = () => { free(); st.c = { ...st.c, vuln: vuln.checked }; sync(); };
    $(s, '.tw-hit').onclick = () => { free(); };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    function render() {
      const run = st.tour ? Math.floor(st.t / RUN) % TOUR.length : 0, c = st.tour ? TOUR[run] : st.c, lt = st.tour ? st.t % RUN : Math.min(st.t, RUN);
      if (st.tour && (st.c.type !== c.type || st.c.vuln !== c.vuln)) { st.c = { ...c }; sync(); }
      const v = draw(g, c, lt), two = doubled(c);
      const key = `${c.type}${c.vuln}|${v.cond}`; if (key === st.key) return; st.key = key;
      say($(s, '.tw-stats'), `<div class="y"><b>${DMG}</b><span>damage in the signal, every time</span></div><div class="${two ? 'r' : ''}"><b>x${two ? 2 : 1}</b><span>transform picked by the context</span></div><div class="${v.cond === 'Dying' ? 'r' : v.cond === 'Wounded' ? 'y' : ''}"><b>${v.hp}</b><span>HP left: ${v.cond}</span></div>`);
      say($(s, '.tw-out'), v.cond === 'Healthy'
        ? 'The damage signal carries a context: its type. Watch what the receiver does with it.'
        : two
          ? 'Electric damage on an electric-vulnerable target: the context check says yes and yes, so the transform is (-5) x2. Ten health, gone. Dying.'
          : `The same 5 damage arrives, but the context says ${c.type !== 'electric' ? `${TYPES[c.type].name.toLowerCase()}, not electric` : 'the target is not vulnerable'}, so the transform is (-5) x1. Only wounded.`);
    }
    sync();
    api = { seek(t) { st.held = st.tour = true; st.t = t; render(); }, dur: () => DUR };
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > DUR) st.t = 0; render(); };
  });
  window.__seek = t => api.seek(t);
  window.__dur = () => api.dur();
})();
