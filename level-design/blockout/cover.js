/* How tall is cover? (The Level Design Book: Cover, quoting Uncharted 4's height bands)
   Side view in metres (110 px per metre; the balcony is 2.5 m up). Not cover: 0.5 m and below (knee). Low cover: 1.0 to 1.25 m (waist).
   High cover: 1.75 m and up (head). Our body: 1.8 m standing, 1.1 m crouched, eyes 0.15 m below the top.
   Exposure samples 40 points up the player's body and checks each line from the enemy's eye against the crate.
   Shoot back: the player's eye line toward the enemy has to clear the crate. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp } = TD;
  const W = 1040, H = 585, M = 110, GY = 560;
  const PX = 260, CX = 328, CW = .7 * M, FX = 900;
  const yOf = m => GY - m * M;

  // does the segment (x0,y0)-(x1,y1) cross the rect [rx, rx+rw] x [ry, GY]?
  function hits(x0, y0, x1, y1, rx, rw, ry) {
    for (let i = 0; i <= 60; i++) { const k = i / 60, x = x0 + (x1 - x0) * k, y = y0 + (y1 - y0) * k; if (x >= rx && x <= rx + rw && y >= ry && y <= GY) return true; }
    return false;
  }
  const band = h => h <= .5 ? ['r', 'not cover: knee height or lower'] : h < 1 ? ['y', 'between bands: neither knee nor waist height, harder to read at a glance'] : h <= 1.25 ? ['g', 'low cover: waist height, you can shoot over it'] : h < 1.75 ? ['y', 'between bands: too tall to shoot over, too short to stand behind'] : ['g', 'high cover: head height, lean around its corner to shoot'];

  function figure(g, x, top, col, foot = GY) {
    const h = foot - top;
    g.fillStyle = col; g.strokeStyle = C.navy; g.lineWidth = 2.5;
    g.beginPath(); g.roundRect(x - 16, top + h * .17, 32, h * .83, 12); g.fill(); g.stroke();
    g.beginPath(); g.arc(x, top + h * .09, Math.min(15, h * .09), 0, Math.PI * 2); g.fill(); g.stroke();
  }

  canvasDemo('cover', (s, cv, g) => {
    let ch = 1.1, stance = 'crouch', el = 0, t = 0;
    const seg = (sel, f) => $$(s, sel + ' .btn').forEach(b => b.onclick = () => { $$(s, sel + ' .btn').forEach(x => x.classList.toggle('on', x === b)); f(b.dataset.v); ui(); });
    seg('.cv-stance', v => stance = v); seg('.cv-foe', v => el = +v);
    function calc() {
      const top = stance === 'stand' ? 1.8 : 1.1, eye = { x: FX, y: yOf(el + 1.65) }, cy = yOf(ch);
      const pts = []; for (let i = 0; i < 40; i++) { const m = top * (i + .5) / 40; pts.push({ m, y: yOf(m), vis: !hits(eye.x, eye.y, PX, yOf(m), CX, CW, cy) }); }
      const myEye = yOf(top - .15), canShoot = !hits(PX + 12, myEye, eye.x, eye.y, CX, CW, cy);
      return { top, eye, cy, pts, exp: pts.filter(p => p.vis).length / pts.length, canShoot, myEye };
    }
    function ui() {
      ch = +$(s, '.cv-h').value; $(s, '.cv-hv').textContent = `${ch.toFixed(2)} m`;
      const r = calc(), [bc, bl] = band(ch);
      say($(s, '.cv-stats'), `<div class="${bc}"><b>${ch.toFixed(2)} m</b><span>${bl}</span></div>` +
        `<div class="${r.exp < .1 ? 'g' : r.exp < .5 ? 'y' : 'r'}"><b>${Math.round(r.exp * 100)}%</b><span>of your body the enemy can see</span></div>` +
        `<div class="${r.canShoot ? 'g' : 'y'}"><b>${r.canShoot ? 'yes' : 'no'}</b><span>${r.canShoot ? 'you can see and shoot the enemy from here' : 'you cannot see the enemy from here'}</span></div>`);
      say($(s, '.cv-out'), el && r.exp < .05 ? '<b class="accent">Tall enough, even from above.</b> This crate still hides you from the balcony, but lower it and the high angle finds you long before a ground-level enemy would.'
        : el ? '<b class="accent">Cover only works against the angle it was built for.</b> From above, the same crate hides much less of you. Height changes every cover decision on the map.'
        : stance === 'stand' ? 'Standing up to shoot trades safety for a shot. Over low cover you expose only your head and shoulders; over high cover you cannot shoot at all and have to step out to the side.'
        : 'Crouched, you are hidden by anything taller than your head. The question is whether you can pop up and shoot over it, or must lean out around it.');
    }
    $(s, '.cv-h').oninput = ui; ui();
    window.__coverSet = (h, st, e) => { $(s, '.cv-h').value = h; stance = st; el = e; $$(s, '.cv-stance .btn').forEach(b => b.classList.toggle('on', b.dataset.v === st)); $$(s, '.cv-foe .btn').forEach(b => b.classList.toggle('on', +b.dataset.v === e)); ui(); };

    return dt => {
      t += dt; T.use(g); g.clearRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,252,244,.85)'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill();
      const r = calc();
      // height bands on the left
      [[0, .5, 'not cover', 'rgba(229,50,45,.10)'], [1, 1.25, 'low cover', 'rgba(47,174,99,.14)'], [1.75, 2.3, 'high cover', 'rgba(47,174,99,.14)']].forEach(([a, b, l, c]) => {
        g.fillStyle = c; g.fillRect(56, yOf(b), 120, yOf(a) - yOf(b));
        g.font = '600 13px Jost, sans-serif'; g.fillStyle = C.muted; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(l, 64, (yOf(a) + yOf(b)) / 2);
      });
      g.font = '500 12px Jost, sans-serif'; g.fillStyle = C.muted; g.textAlign = 'right';
      for (let m = 0; m <= 2; m += .5) { g.fillText(`${m} m`, 50, yOf(m)); g.strokeStyle = 'rgba(205,191,159,.7)'; g.lineWidth = 1; g.beginPath(); g.moveTo(56, yOf(m)); g.lineTo(176, yOf(m)); g.stroke(); }
      // ground and balcony
      g.strokeStyle = C.wall; g.lineWidth = 4; g.beginPath(); g.moveTo(0, GY); g.lineTo(W, GY); g.stroke();
      if (el) { g.fillStyle = C.wall; g.fillRect(FX - 70, yOf(el), 150, GY - yOf(el)); g.fillStyle = C.wallHi; g.fillRect(FX - 70, yOf(el), 150, 4); }
      // sight lines from the enemy's eye to head, chest and waist
      [r.top - .1, r.top * .65, r.top * .35].forEach(m => {
        const blocked = hits(r.eye.x, r.eye.y, PX, yOf(m), CX, CW, r.cy);
        let ex = PX, ey = yOf(m);
        if (blocked) for (let i = 0; i <= 200; i++) { const k = i / 200, x = r.eye.x + (PX - r.eye.x) * k, y = r.eye.y + (yOf(m) - r.eye.y) * k; if (x <= CX + CW && y >= r.cy) { ex = x; ey = y; break; } }
        g.setLineDash([10, 7]); g.lineDashOffset = -t * 30; g.strokeStyle = blocked ? 'rgba(46,163,220,.8)' : 'rgba(229,50,45,.85)'; g.lineWidth = 2.5;
        g.beginPath(); g.moveTo(r.eye.x, r.eye.y); g.lineTo(ex, ey); g.stroke(); g.setLineDash([]);
      });
      // the player, then their seen part painted red
      figure(g, PX, yOf(r.top), C.player);
      r.pts.forEach(p => { if (p.vis) { g.fillStyle = 'rgba(229,50,45,.55)'; g.fillRect(PX - 18, p.y - r.top * M / 80, 36, r.top * M / 40); } });
      // the player's own line toward the enemy
      g.setLineDash([3, 6]); g.strokeStyle = r.canShoot ? C.good : 'rgba(93,97,140,.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(PX + 14, r.myEye);
      g.lineTo(r.canShoot ? r.eye.x - 20 : CX, r.canShoot ? r.eye.y : r.myEye + (r.eye.y - r.myEye) * (CX - PX) / (r.eye.x - PX)); g.stroke(); g.setLineDash([]);
      // the crate
      g.fillStyle = '#b07a4a'; g.strokeStyle = '#5e3a1c'; g.lineWidth = 3; g.fillRect(CX, r.cy, CW, GY - r.cy); g.strokeRect(CX, r.cy, CW, GY - r.cy);
      g.lineWidth = 1.5; for (let y = r.cy + 18; y < GY; y += 18) { g.beginPath(); g.moveTo(CX, y); g.lineTo(CX + CW, y); g.stroke(); }
      // the enemy
      figure(g, FX, yOf(el + 1.8), C.red, yOf(el));
      g.fillStyle = C.navy; g.fillRect(FX - 46, yOf(el + 1.3) - 4, 34, 8);
      T.label('you', PX, yOf(r.top) - 22, 'center', C.ink, 14); T.label('enemy', FX, yOf(el + 1.8) - 22, 'center', C.redDk, 14);
      T.label(`${Math.round(r.exp * 100)}% seen`, PX + 120, yOf(r.top) - 22, 'center', r.exp > .05 ? C.redDk : C.good, 15);
    };
  });
})();
