/* Hit Reactions spike: Phalanx and the claw probe trade a hit.
 * The whole exchange is a pure function of one clock (pose(T)), so it can play, pause, slow down and scrub.
 */
(function () {
  const $ = (r, q) => r.querySelector(q), $$ = (r, q) => [...r.querySelectorAll(q)];
  const FPS = 60, F = s => Math.round(s * FPS);
  const LEAD = 0.45, TAIL = 0.7;                 // idle before the attack starts, and after both are free
  const POS = { phalanx: 360, claw: 605 }, GROUND = 40;

  const ATTACK = {
    phalanx: { anim: 'Sword and Board Punch Attack', idle: 'Sword and Board Idle', label: 'Phalanx' },
    claw: { anim: 'Attack', idle: 'Idle', label: 'The probe' },
  };
  const REACT = {   // the defender's choices
    phalanx: [
      { key: 'light', name: 'Light', anim: 'Sword and Board Hit Reaction Light' },
      { key: 'heavy', name: 'Heavy', anim: 'Hit Reaction Heavy' },
      { key: 'massive', name: 'Massive', anim: 'Hit Reaction Massive' },
    ],
    claw: [
      { key: 'wound', name: 'Wound', anim: 'Wound' },
      { key: 'death', name: 'Lethal (Death)', anim: 'Death', final: true },
    ],
  };
  const COL = { idle: '#2c416b', startup: '#ffb547', active: '#ff5a4a', recovery: '#8a9cc0', hitstop: '#ffe04a', hitstun: '#4aa8ff', text: '#e8eefc', muted: '#9fb0d4' };

  FPF.demo('hits', {
    init(s) {
      const gl = $(s, '.hr-gl'), fx = $(s, '.hr-fx'), tl = $(s, '.hr-tl');
      const g = fx.getContext('2d'), t2 = tl.getContext('2d');
      const out = $(s, '.hr-out');
      const S = s._st = { who: 'phalanx', react: { phalanx: 'heavy', claw: 'wound' }, hs: 6, boxes: false, slow: false, playing: true, T: 0 };

      AtomechRigs.create(gl).then(scene => {
        S.scene = scene;
        const R = { phalanx: scene.rig('phalanx'), claw: scene.rig('claw') };
        R.phalanx.x = POS.phalanx; R.phalanx.y = GROUND; R.phalanx.faceRight = true;
        R.claw.x = POS.claw; R.claw.y = GROUND; R.claw.faceRight = false;      // facing each other
        // the probe hovers: lift it until its body is level with Phalanx's head
        R.phalanx.pose(ATTACK.phalanx.idle, 0); R.claw.pose(ATTACK.claw.idle, 0);
        R.claw.y = GROUND + (R.claw.bone('Body').y - R.phalanx.bone('Head').y);
        S.R = R;

        // contact window per attacker: Phalanx keys a hitbox; the probe has none, so we measure when its claw is furthest forward
        S.win = {};
        S.win.phalanx = R.phalanx.hitWindows(ATTACK.phalanx.anim)[0];
        {
          const c = R.claw, d = c.duration(ATTACK.claw.anim), reach = [];
          for (let t = 0; t <= d + 1e-6; t += 1 / FPS) { c.pose(ATTACK.claw.anim, t); reach.push([t, c.x - c.bone('bFrontClaw').x]); }
          const max = Math.max(...reach.map(r => r[1]));
          const i0 = reach.findIndex(r => r[1] >= max - 8);
          let i1 = i0; while (i1 + 1 < reach.length && reach[i1 + 1][1] >= max - 30) i1++;
          S.win.claw = { on: reach[i0][0], off: reach[i1][0] + 1 / FPS, shape: 'claw reach (measured)' };
        }
        build();
        S.stop = S.stop || null;
        start();
        render();
      }).catch(e => { out.textContent = 'The Spine rigs didn’t load: ' + e.message; });

      /* ---------- the exchange as a function of time ---------- */
      function plan() {
        const atkKey = S.who, defKey = S.who === 'phalanx' ? 'claw' : 'phalanx';
        const A = ATTACK[atkKey], D = ATTACK[defKey], R = S.R;
        const rx = REACT[defKey].find(r => r.key === S.react[defKey]);
        const win = S.win[atkKey], h = S.hs / FPS;
        const dur = R[atkKey].duration(A.anim), rdur = R[defKey].duration(rx.anim);
        const hit = LEAD + win.on;                                   // clock time of contact
        const atkFree = hit + h + (dur - win.on);
        const defFree = hit + h + rdur;
        return { atkKey, defKey, A, D, rx, win, h, dur, rdur, hit, atkFree, defFree, total: Math.max(atkFree, defFree) + TAIL };
      }

      function poseAt(T) {
        const P = S.P, R = S.R, a = R[P.atkKey], d = R[P.defKey];
        a.x = POS[P.atkKey]; d.x = POS[P.defKey];
        const idle = (rig, key, t) => rig.pose(ATTACK[key].idle, t % rig.duration(ATTACK[key].idle));
        // attacker
        if (T < LEAD) idle(a, P.atkKey, T);
        else if (T < P.hit) a.pose(P.A.anim, T - LEAD);
        else if (T < P.hit + P.h) a.pose(P.A.anim, P.win.on);
        else if (T < P.atkFree) a.pose(P.A.anim, T - LEAD - P.h);
        else idle(a, P.atkKey, T - P.atkFree);
        // defender
        if (T < P.hit) idle(d, P.defKey, T);
        else if (T < P.hit + P.h) {
          const k = (T - P.hit) / Math.max(P.h, 1e-3);
          d.x = POS[P.defKey] + Math.sin((T - P.hit) * 90) * 5 * (1 - k);   // hitstop shake
          d.pose(P.rx.anim, 0);
        } else if (T < P.defFree) d.pose(P.rx.anim, T - P.hit - P.h);
        else if (P.rx.final) d.pose(P.rx.anim, P.rdur);
        else idle(d, P.defKey, T - P.defFree);
      }

      function phase(T, who) {
        const P = S.P;
        if (T >= P.hit && T < P.hit + P.h) return 'hitstop';
        if (who === 'atk') {
          if (T < LEAD || T >= P.atkFree) return 'idle';
          const at = T < P.hit ? T - LEAD : T - LEAD - P.h;
          return at < P.win.on ? 'startup' : at < P.win.off ? 'active' : 'recovery';
        }
        if (T < P.hit) return 'idle';
        if (T < P.defFree) return 'hitstun';
        return P.rx.final ? 'down' : 'idle';
      }

      /* ---------- drawing ---------- */
      function render() {
        if (!S.R) return;
        S.P = plan();
        const P = S.P, T = S.T, R = S.R;
        poseAt(T);
        S.scene.draw();
        g.clearRect(0, 0, fx.width, fx.height);
        // ground
        g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(0, fx.height - GROUND); g.lineTo(fx.width, fx.height - GROUND); g.stroke();
        if (S.boxes) drawBoxes();
        // impact spark: during hitstop and a moment after
        const since = T - P.hit;
        if (since >= 0 && since < P.h + 0.12) {
          const p = contactPoint();
          const k = Math.min(1, since / Math.max(P.h + 0.12, 0.01));
          spark(p.x, p.y, 26 + 30 * (1 - k), 1 - k * 0.8);
        }
        // phase tags over each fighter
        const tag = (rig, key, who) => {
          const ph = phase(T, who); if (ph === 'idle') return;
          const head = rig.bone(key === 'phalanx' ? 'Head' : 'bHead');
          const txt = ph === 'down' ? 'DOWN' : ph === 'hitstun' && S.P.rx.final ? 'DEATH' : ph.toUpperCase();
          g.font = '600 17px Orbitron, sans-serif'; g.textAlign = 'center';
          const w = g.measureText(txt).width + 18, x = POS[key], y = 34;
          g.fillStyle = COL[ph] || COL.recovery; g.globalAlpha = .92; roundRect(g, x - w / 2, y - 16, w, 28, 8); g.fill(); g.globalAlpha = 1;
          g.fillStyle = '#0b1830'; g.fillText(txt, x, y + 4);
        };
        tag(R[P.atkKey], P.atkKey, 'atk'); tag(R[P.defKey], P.defKey, 'def');
        drawTimeline();
      }

      function contactPoint() {
        const P = S.P, R = S.R;
        if (P.atkKey === 'claw') { const b = R.claw.bone('bFrontClaw'); return { x: Math.max(b.x, POS.phalanx + 40), y: Math.min(b.y, gl.height - GROUND - 120) }; }
        const b = R.claw.bone('Body'); return { x: b.x - 30, y: b.y - 10 };
      }

      function drawBoxes() {
        const R = S.R;
        R.phalanx.boxes().forEach(b => {
          const hit = /^Hitbox/.test(b.name), hurt = b.name === 'AttackableBox';
          if (!hit && !hurt) return;
          g.beginPath(); b.pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.closePath();
          g.fillStyle = hit ? 'rgba(255,90,74,.35)' : 'rgba(74,168,255,.14)'; g.fill();
          g.strokeStyle = hit ? '#ff5a4a' : '#4aa8ff'; g.lineWidth = 2; g.stroke();
          const c = b.pts.reduce((a, p) => ({ x: a.x + p.x / b.pts.length, y: a.y + p.y / b.pts.length }), { x: 0, y: 0 });
          g.font = '600 13px Jost, sans-serif'; g.textAlign = 'center'; g.fillStyle = hit ? '#ffb3aa' : '#bfe0ff';
          g.fillText(hit ? 'hitbox' : 'hurtbox', c.x, hit ? c.y : Math.min(...b.pts.map(p => p.y)) - 6);
        });
        // the probe has no boxes in its rig: show its claw tip during the measured contact window
        const P = S.P;
        if (P.atkKey === 'claw' && phase(S.T, 'atk') === 'active' || (P.atkKey === 'claw' && phase(S.T, 'atk') === 'hitstop')) {
          const b = R.claw.bone('bFrontClaw');
          g.beginPath(); g.arc(b.x, b.y, 22, 0, Math.PI * 2); g.fillStyle = 'rgba(255,90,74,.35)'; g.fill(); g.strokeStyle = '#ff5a4a'; g.lineWidth = 2; g.stroke();
          g.font = '600 13px Jost, sans-serif'; g.textAlign = 'center'; g.fillStyle = '#ffb3aa'; g.fillText('claw (measured)', b.x, b.y - 28);
        }
      }

      function spark(x, y, r, a) {
        g.save(); g.globalAlpha = a; g.translate(x, y);
        g.fillStyle = '#fff6c8'; g.strokeStyle = '#ffd24a'; g.lineWidth = 3; g.beginPath();
        for (let i = 0; i < 16; i++) { const ang = i * Math.PI / 8, rr = i % 2 ? r * .42 : r; g.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr); }
        g.closePath(); g.fill(); g.stroke(); g.restore();
      }

      function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

      const TL = { x0: 128, x1: 920, rowA: 44, rowD: 96, bar: 30 };
      const tx = T => TL.x0 + (TL.x1 - TL.x0) * T / S.P.total;
      function drawTimeline() {
        const P = S.P, W = tl.width, H = tl.height;
        t2.clearRect(0, 0, W, H);
        t2.font = '500 15px Jost, sans-serif'; t2.textAlign = 'right'; t2.fillStyle = COL.text;
        t2.fillText(P.A.label === 'The probe' ? 'Probe' : 'Phalanx', TL.x0 - 12, TL.rowA + 20);
        t2.fillText(P.atkKey === 'phalanx' ? 'Probe' : 'Phalanx', TL.x0 - 12, TL.rowD + 20);
        t2.font = '400 12px Jost, sans-serif'; t2.fillStyle = COL.muted;
        t2.fillText('attacker', TL.x0 - 12, TL.rowA + 34);
        t2.fillText('defender', TL.x0 - 12, TL.rowD + 34);
        const seg = (row, a, b, col, label) => {
          if (b <= a) return;
          const x = tx(a), w = tx(b) - x;
          t2.fillStyle = col; t2.fillRect(x, row, w, TL.bar);
          if (label && w > 46) { t2.fillStyle = '#0b1830'; t2.font = '600 12px Jost, sans-serif'; t2.textAlign = 'center'; t2.fillText(label, x + w / 2, row + 14); t2.font = '500 11px Jost, sans-serif'; t2.fillText(F(b - a) + ' f', x + w / 2, row + 26); }
        };
        // attacker
        seg(TL.rowA, 0, LEAD, COL.idle);
        seg(TL.rowA, LEAD, P.hit, COL.startup, 'startup');
        seg(TL.rowA, P.hit, P.hit + P.h, COL.hitstop, 'stop');
        const activeLeft = P.win.off - P.win.on;
        seg(TL.rowA, P.hit + P.h, P.hit + P.h + activeLeft, COL.active, 'active');
        seg(TL.rowA, P.hit + P.h + activeLeft, P.atkFree, COL.recovery, 'recovery');
        seg(TL.rowA, P.atkFree, P.total, COL.idle);
        // defender
        seg(TL.rowD, 0, P.hit, COL.idle);
        seg(TL.rowD, P.hit, P.hit + P.h, COL.hitstop, 'stop');
        seg(TL.rowD, P.hit + P.h, P.defFree, COL.hitstun, P.rx.final ? 'death' : 'hitstun');
        seg(TL.rowD, P.defFree, P.total, P.rx.final ? '#1d2c4a' : COL.idle);
        // contact line
        t2.strokeStyle = '#ffe04a'; t2.setLineDash([4, 4]); t2.lineWidth = 1.5;
        t2.beginPath(); t2.moveTo(tx(P.hit), TL.rowA - 10); t2.lineTo(tx(P.hit), TL.rowD + TL.bar + 6); t2.stroke(); t2.setLineDash([]);
        t2.font = '500 12px Jost, sans-serif'; t2.textAlign = 'center'; t2.fillStyle = '#ffe04a'; t2.fillText('contact', tx(P.hit), TL.rowA - 14);
        // who is free first
        if (!P.rx.final) {
          const a = tx(P.atkFree), d = tx(P.defFree), y = TL.rowD + TL.bar + 22;
          t2.strokeStyle = COL.text; t2.lineWidth = 2;
          [a, d].forEach(x => { t2.beginPath(); t2.moveTo(x, TL.rowA); t2.lineTo(x, y + 4); t2.stroke(); });
          t2.beginPath(); t2.moveTo(a, y); t2.lineTo(d, y); t2.stroke();
          const adv = F(P.defFree) - F(P.atkFree);
          t2.font = '600 15px Jost, sans-serif'; t2.fillStyle = COL.text; t2.textAlign = 'left';
          t2.fillText((adv >= 0 ? '+' : '') + adv + ' f for the attacker', Math.max(a, d) + 8, y + 5);
        }
        // playhead
        const x = tx(S.T);
        t2.strokeStyle = '#ffffff'; t2.lineWidth = 2; t2.beginPath(); t2.moveTo(x, 18); t2.lineTo(x, H - 8); t2.stroke();
        t2.fillStyle = '#ffffff'; t2.beginPath(); t2.moveTo(x - 6, 12); t2.lineTo(x + 6, 12); t2.lineTo(x, 20); t2.fill();
        t2.font = '400 12px Jost, sans-serif'; t2.fillStyle = COL.muted; t2.textAlign = 'right';
        t2.fillText('frame ' + F(Math.max(0, S.T - LEAD)) + ' of the attack · 60 fps', W - 10, H - 6);
      }

      function explain() {
        const P = S.P, atk = P.A.label, def = P.atkKey === 'phalanx' ? 'the probe' : 'Phalanx';
        const startup = F(P.win.on), active = F(P.win.off - P.win.on), recov = F(P.dur - P.win.off), afterHit = F(P.dur - P.win.on), stun = F(P.rdur);
        const src = P.atkKey === 'phalanx' ? `its <b>${P.win.shape}</b> hitbox key` : 'when its claw reaches furthest (the probe’s rig has no hitbox keys)';
        let s = `<b class="k-atk">${atk}</b>: ${startup} f startup, ${active} f active, ${recov} f recovery. Contact comes from ${src}. ` +
          `<b class="k-hs">Hitstop</b> freezes both for ${S.hs} f. `;
        if (P.rx.final) s += `<b class="k-def">${def[0].toUpperCase() + def.slice(1)}</b> dies, so there’s nothing left to trade.`;
        else {
          const adv = stun - afterHit;
          s += `<b class="k-def">${def[0].toUpperCase() + def.slice(1)}</b> is stuck in hitstun for ${stun} f while ${P.atkKey === 'phalanx' ? 'Phalanx' : 'the probe'} finishes ${afterHit} f of swing. ` +
            (adv > 0 ? `${atk} acts <b>${adv} f</b> first.` : adv < 0 ? `${def[0].toUpperCase() + def.slice(1)} acts <b>${-adv} f</b> first: the hit lands but the attacker is the one at a disadvantage.` : 'Both act on the same frame.');
        }
        out.innerHTML = s;
      }

      /* ---------- controls ---------- */
      function build() {
        $$(s, '.hr-who .btn').forEach(b => b.classList.toggle('on', b.dataset.who === S.who));
        const defKey = S.who === 'phalanx' ? 'claw' : 'phalanx', box = $(s, '.hr-react');
        box.innerHTML = '';
        REACT[defKey].forEach((r, i) => {
          const b = document.createElement('button'); b.className = 'btn' + (S.react[defKey] === r.key ? ' on' : '');
          b.innerHTML = r.name + (S.R ? ` · ${F(S.R[defKey].duration(r.anim))} f` : '') + ` <kbd>${'QWE'[i]}</kbd>`; b.onclick = () => { S.react[defKey] = r.key; restart(); };
          box.append(b);
        });
        $(s, '.hr-box').classList.toggle('on', S.boxes);
        $(s, '.hr-slow').classList.toggle('on', S.slow);
        $(s, '.hr-play').innerHTML = (S.playing ? '❚❚ Pause' : '▶ Play') + ' <kbd>K</kbd>';
        $(s, '.hr-hs-v').textContent = S.hs + (S.hs === 1 ? ' frame' : ' frames');
        if (S.R) { S.P = plan(); explain(); }
      }
      function restart() { S.T = 0; S.playing = true; build(); render(); }
      $$(s, '.hr-who .btn').forEach(b => b.onclick = () => { S.who = b.dataset.who; restart(); });
      $(s, '.hr-hs').oninput = e => { S.hs = +e.target.value; build(); render(); };
      $(s, '.hr-box').onclick = () => { S.boxes = !S.boxes; build(); render(); };
      $(s, '.hr-slow').onclick = () => { S.slow = !S.slow; build(); };
      $(s, '.hr-play').onclick = () => { S.playing = !S.playing; build(); };
      gl.onclick = restart;
      let drag = false;
      const scrub = e => { const p = FPF.ptr(tl, e); S.T = Math.max(0, Math.min(S.P.total, (p.x - TL.x0) / (TL.x1 - TL.x0) * S.P.total)); S.playing = false; build(); render(); };
      tl.onpointerdown = e => { if (!S.P) return; drag = true; tl.setPointerCapture(e.pointerId); scrub(e); };
      tl.onpointermove = e => { if (drag) scrub(e); };
      tl.onpointerup = () => { drag = false; };
      S.key = e => {
        const k = e.key.toLowerCase();
        if (k === '1' || k === '2') { S.who = k === '1' ? 'phalanx' : 'claw'; restart(); }
        else if ('qwe'.includes(k) && k.length === 1) { const defKey = S.who === 'phalanx' ? 'claw' : 'phalanx'; const r = REACT[defKey]['qwe'.indexOf(k)]; if (r) { S.react[defKey] = r.key; restart(); } }
        else if (k === 'k') { S.playing = !S.playing; build(); }
        else if (k === 'r') restart();
        else if (k === 'b') { S.boxes = !S.boxes; build(); render(); }
      };
      function start() {
        if (S.stop) return;
        S.stop = FPF.raf(dt => {
          if (!S.R) return;
          if (S.playing) { S.T += dt * (S.slow ? 0.25 : 1); if (S.T > S.P.total) S.T = 0; }
          render();
        });
      }
      s._start = start;
    },
    enter(s) { const S = s._st; s._start && s._start(); addEventListener('keydown', S.key); },
    leave(s) { const S = s._st; S.stop && S.stop(); S.stop = null; removeEventListener('keydown', S.key); },
  });
})();
