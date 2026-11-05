/* Asynchronous cycles (DGMS C2 M3 "Leveraging Player Skills", deck slide 256). Five oscillators start in phase and drift
   apart because their periods differ. Dressed as a lava bubble (Podoboo), a moving lift and a Hammer Bro, the same drift
   becomes a castle level: "Asynchrony creates predictable irregularities" (notes).
   Numbers (illustrative): BASE period 2.0 s, each loop SPREAD seconds slower than the one before (default 0.3 s).
   The whole pattern repeats after the least common multiple of the periods.
   Images: Super Mario Bros. (NES) sprites from the Super Mario Wiki (mario.wiki.gallery): Podoboo_Sprite_SMB.png,
   ClassicNES_SMB_Small_Mario_Sprite.png, SMB_Hammer_Bro_Sprite.png, SMB_Sprite_Lava.png, SMB_Ground_Castle.png,
   SMB_Castle_Brick_Block.png, and the lift cropped from SMM2_Lift_SMB_icon.png. In ../img/async-cycles/. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp } = TD;
  const W = 1040, H = 585;

  /* ---------- tunable numbers ---------- */
  const BASE = 2.0;               // seconds, the fastest loop
  const SPREAD = .3;              // default extra seconds per loop
  const KINDS = ['bubble', 'lift', 'guard', 'bubble', 'lift'];
  const NAMES = { bubble: 'lava bubble', lift: 'moving lift', guard: 'Hammer Bro' };
  const COLS = ['#e5322d', '#2ea3dc', '#2fae63', '#e0a92d', '#8a4fd6'];
  const PX = 3;                   // sprite scale: one NES pixel = 3 canvas pixels
  const DUR = 18;

  const IMG = {};
  ['podoboo', 'mario', 'hammer-bro', 'lava', 'castle-ground', 'castle-brick', 'lift'].forEach(k => { const im = new Image(); im.src = `../img/async-cycles/${k}.png`; IMG[k] = im; });
  const ok = im => im.complete && im.naturalWidth > 0;
  const txt = (g, s, x, y, font, col = C.ink, al = 'left') => { g.font = font; g.fillStyle = col; g.textAlign = al; g.textBaseline = 'middle'; g.fillText(s, x, y); };
  const HEAD = n => `800 ${n}px Montserrat, Jost, sans-serif`, BODY = (n, w = 500) => `${w} ${n}px Jost, sans-serif`;
  const periods = sp => KINDS.map((_, i) => Math.round((BASE + i * sp) * 10) / 10);
  const gcd = (a, b) => b ? gcd(b, a % b) : a;
  function repeatAfter(ps) { const t = ps.map(p => Math.round(p * 10)); return t.reduce((a, b) => a / gcd(a, b) * b) / 10; }
  function fmtDur(s) {
    if (s < 120) return `${+s.toFixed(1)} s`;
    if (s < 7200) return `${Math.round(s / 60)} min`;
    if (s < 172800) return `${+(s / 3600).toFixed(1)} h`;
    return `${Math.round(s / 86400)} days`;
  }
  // a loop's position 0..1 at phase f (0..1). Bubbles leap and then wait in the lava; lifts and guards swing smoothly.
  function value(kind, f) {
    if (kind === 'bubble') { const q = f / .6; return f < .6 ? 4 * q * (1 - q) : 0; }
    return .5 - .5 * Math.cos(f * Math.PI * 2);
  }

  canvasDemo('cycles', (s, cv, g) => {
    const st = { tour: true, t: 0, held: false, spread: SPREAD, skin: false, key: '' };
    const tourBtn = $(s, '.ac-tour'), spIn = $(s, '.ac-spread'), skIn = $(s, '.ac-skin');
    const free = () => { st.tour = false; tourBtn.classList.remove('on'); };
    spIn.oninput = () => { free(); st.spread = +spIn.value; st.t = 0; };
    skIn.onchange = () => { free(); st.skin = skIn.checked; };
    $(s, '.ac-restart').onclick = () => { free(); st.t = 0; };
    tourBtn.onclick = () => { st.tour = true; st.t = 0; st.spread = SPREAD; spIn.value = SPREAD; tourBtn.classList.add('on'); };

    const X0 = 14, BW = (W - 28) / 5, FLOOR = 318, SCENE_B = 366;
    const cx = i => X0 + BW * (i + .5);
    function sprite(k, x, y, flipX = false, flipY = false, a = 1) {
      const im = IMG[k]; if (!ok(im)) return false;
      const w = im.naturalWidth * PX, h = im.naturalHeight * PX;
      g.save(); g.globalAlpha *= a; g.imageSmoothingEnabled = false; g.translate(x, y); g.scale(flipX ? -1 : 1, flipY ? -1 : 1);
      g.drawImage(im, -w / 2, -h / 2, w, h); g.restore(); return true;
    }
    function tiles(k, x0, x1, y, a = 1) {
      const im = IMG[k]; if (!ok(im)) return;
      const w = im.naturalWidth * PX, h = im.naturalHeight * PX;
      g.save(); g.globalAlpha *= a; g.imageSmoothingEnabled = false; g.beginPath(); g.rect(x0, y, x1 - x0, SCENE_B - y); g.clip();
      for (let x = x0; x < x1; x += w) g.drawImage(im, x, y, w, h);
      g.restore();
    }

    function render() {
      // skin per column: the walk-through dresses them one at a time
      let sk = KINDS.map(() => st.skin ? 1 : 0);
      if (st.tour) {
        const at = [5, 8, 11, 14, 14.6];
        sk = at.map(a => clamp((st.t - a) / .8));
        skIn.checked = sk[4] > .5;
      }
      const ps = periods(st.spread), t = st.t;
      const ph = ps.map(p => (t / p) % 1);
      T.use(g); g.clearRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,252,244,.85)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill();

      // scene, one band per loop
      g.save(); g.beginPath(); g.roundRect(X0, 14, W - 28, SCENE_B - 14, 12); g.clip();
      KINDS.forEach((kind, i) => {
        const x0 = X0 + BW * i, x1 = x0 + BW, c = cx(i), k = sk[i], v = value(kind, ph[i]);
        g.fillStyle = '#f4efe4'; g.fillRect(x0, 14, BW, SCENE_B - 14);
        g.fillStyle = `rgba(0,0,0,${k})`; g.fillRect(x0, 14, BW, SCENE_B - 14);
        if (i) { g.fillStyle = `rgba(205,191,159,${1 - k})`; g.fillRect(x0, 22, 1.5, SCENE_B - 30); }
        // floor (with a lava pit under bubbles and lifts)
        const pit = kind !== 'guard', pw = kind === 'lift' ? 144 : 96;
        if (k > 0) {
          if (pit) { tiles('castle-ground', x0, c - pw / 2, FLOOR, k); tiles('castle-ground', c + pw / 2, x1, FLOOR, k); tiles('lava', c - pw / 2, c + pw / 2, FLOOR + 10, k); }
          else tiles('castle-ground', x0, x1, FLOOR, k);
        }
        // plain track and marker
        const a = 1 - k;
        let mx, my;
        if (kind === 'guard') { mx = c - 70 + v * 140; my = FLOOR - 36; }
        else if (kind === 'lift') { mx = c; my = FLOOR - 18 - v * 190; }
        else { mx = c; my = FLOOR + 20 - v * 250; }
        if (a > 0) {
          g.globalAlpha = a; g.strokeStyle = '#cdbf9f'; g.lineWidth = 4; g.setLineDash([8, 8]); g.beginPath();
          if (kind === 'guard') { g.moveTo(c - 70, my); g.lineTo(c + 70, my); } else if (kind === 'lift') { g.moveTo(c, FLOOR - 18); g.lineTo(c, FLOOR - 208); } else { g.moveTo(c, FLOOR + 20); g.lineTo(c, FLOOR - 230); }
          g.stroke(); g.setLineDash([]);
          g.fillStyle = COLS[i]; g.strokeStyle = '#fff'; g.lineWidth = 4; g.beginPath(); g.arc(mx, my, 17, 0, Math.PI * 2); g.fill(); g.stroke();
          // phase dial
          const dx = x0 + 34, dy = 44;
          g.fillStyle = '#fffaf0'; g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.arc(dx, dy, 18, 0, Math.PI * 2); g.fill(); g.stroke();
          g.strokeStyle = COLS[i]; g.lineWidth = 4; g.beginPath(); g.moveTo(dx, dy); g.lineTo(dx + Math.sin(ph[i] * Math.PI * 2) * 15, dy - Math.cos(ph[i] * Math.PI * 2) * 15); g.stroke();
          txt(g, `${ps[i].toFixed(1)} s loop`, dx + 26, dy, BODY(15, 700), C.ink);
          g.globalAlpha = 1;
        }
        if (k > 0) {
          if (kind === 'bubble') { if (v > 0.02) sprite('podoboo', mx, my, false, ph[i] > .3, k); }
          else if (kind === 'lift') sprite('lift', mx, my, false, false, k);
          else { const dir = Math.sin(ph[i] * Math.PI * 2) > 0; sprite('hammer-bro', mx, FLOOR - 36, dir, false, k); }
          txt(g, `${NAMES[kind]} · ${ps[i].toFixed(1)} s`, c, 34, BODY(15, 700), `rgba(255,250,240,${k})`, 'center');
        }
      });
      // Mario waits at the start of the level
      if (sk[0] > 0) sprite('mario', X0 + 26, FLOOR - 21, false, false, sk[0]);
      g.restore();

      // phase chart: the last 10 seconds of each loop
      const CX0 = 196, CX1 = W - 20, CY = 382, RH = 34, WIN = 10;
      txt(g, 'last 10 seconds of each loop', CX0, CY + 2, BODY(14, 600), C.muted);
      txt(g, 'now', CX1, CY + 2, BODY(14, 700), C.ink, 'right');
      KINDS.forEach((kind, i) => {
        const y0 = CY + 14 + i * RH, k = sk[i];
        txt(g, k > .5 ? NAMES[kind] : `loop ${i + 1}`, 30, y0 + RH / 2, HEAD(15), COLS[i]);
        txt(g, `${ps[i].toFixed(1)} s`, CX0 - 12, y0 + RH / 2, BODY(14, 600), C.muted, 'right');
        g.fillStyle = i % 2 ? 'rgba(21,32,68,.04)' : 'rgba(21,32,68,.08)'; g.fillRect(CX0, y0, CX1 - CX0, RH - 4);
        g.strokeStyle = COLS[i]; g.lineWidth = 2.5; g.beginPath();
        for (let j = 0; j <= 240; j++) {
          const tt = t - WIN + WIN * j / 240; if (tt < 0) continue;
          const x = lerp(CX0, CX1, j / 240), y = y0 + RH - 7 - value(kind, (tt / ps[i]) % 1) * (RH - 12);
          if (j === 0 || tt - WIN / 240 < 0) g.moveTo(x, y); else g.lineTo(x, y);
        }
        g.stroke();
      });
      // t = 0 line, where every loop starts together
      if (t < WIN) { const x = lerp(CX0, CX1, (WIN - t) / WIN); g.strokeStyle = C.navy; g.setLineDash([4, 4]); g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, CY + 12); g.lineTo(x, CY + 14 + 5 * RH); g.stroke(); g.setLineDash([]); T.label('all in phase', x, CY + 14 + 5 * RH + 10, 'center', C.navy, 13); }

      $(s, '.ac-sv').textContent = `${st.spread.toFixed(1)} s`;
      // in step: how tightly the five phases cluster (1 = together, 0 = scattered)
      const re = ph.reduce((a, f) => a + Math.cos(f * Math.PI * 2), 0) / 5, im = ph.reduce((a, f) => a + Math.sin(f * Math.PI * 2), 0) / 5;
      const inStep = Math.round(Math.hypot(re, im) * 100);
      const rep = repeatAfter(ps);
      say($(s, '.ac-stats'), `<div><b>${st.spread ? `${ps[0].toFixed(1)}–${ps[4].toFixed(1)}` : ps[0].toFixed(1)} s</b><span>each loop on its own</span></div><div class="y"><b>${fmtDur(rep)}</b><span>until the whole pattern repeats</span></div><div class="g"><b>${inStep}%</b><span>in step right now</span></div>`);
      const key = [st.spread, sk.map(x => x > .5).join()].join('|'); if (key === st.key) return; st.key = key;
      const dressed = sk.filter(x => x > .5).length;
      say($(s, '.ac-out'), st.spread === 0
        ? 'Same period for all five: they never drift, and the level is one rhythm every 2 seconds. Learn it once and it is solved.'
        : dressed ? `Each loop is simple, but together they repeat only every ${fmtDur(rep)}. Asynchrony creates predictable irregularities: every gap is learnable, no two runs look the same.`
        : 'Five simple loops, all started in phase. Their periods differ, so they drift apart. Tick the castle box to see what that drift does to a level.');
    }
    window.__seek = (tt) => { st.held = st.tour = true; st.t = tt; render(); };
    window.__dur = () => DUR;
    return dt => { if (!st.held) st.t += Math.max(0, dt); if (st.tour && st.t > DUR) st.t = 0; render(); };
  });
})();
