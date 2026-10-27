/* Enemy counters (MGM course 4, module 5, the Start / Opposition / Goal slide): Mario's two verbs against three enemies.
   One rules table (RULES) and one encounter model (encounter) drive every slide, so the matchups, the level run
   and the designer's matrix can never disagree. The sprites are original pixel shapes drawn here, not game art.
   Everything is a pure function of time, so window.__ecSeek can render any frame for the GIF. */
(function () {
  const { $, $$, canvasDemo, demo, say } = FPF.kit;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const arc = (u, h) => 4 * h * u * (1 - u);

  /* ---------- sprites: one character per pixel, '.' is empty ---------- */
  const PAL = { R: '#d8322b', S: '#f2b98a', K: '#5a3216', B: '#2f56c9', Y: '#ffd23f', W: '#ffffff', G: '#3fa34d', g: '#226b2f',
    D: '#2a3566', L: '#7d93e0', O: '#ff8a1e', k: '#151515', r: '#8f1d18' };
  const HERO = [
    '...RRRR...', '..RRRRRRR.', '..KSSSSK..', '..SSkSkS..', '..SSSSSS..', '...SSSS...', '..RRBBRR..',
    '.RRBBBBRR.', '.SRBYYBRS.', '.S.BBBB.S.', '...BBBB...', '...B..B...', '..KK..KK..'];
  const HERO_STEP = HERO.slice(0, 11).concat(['....BB....', '...KKKK...']);
  const HERO_JUMP = HERO.slice(0, 7).concat(['SRRBBBBRRS', '..RBYYBR..', '...BBBB...', '...BBBB...', '..B....B..', '.KK....KK.']);
  const HERO_THROW = HERO.slice(0, 7).concat(['.RRBBBBRSS', '.SRBYYBR..']).concat(HERO.slice(9));
  const KOOPA = ['.YY.........', 'YYWY........', 'YYkY........', '.YYY..GGGG..', '..YY.GgGGgG.', '..YYGGGGGGGG', '...YGgGGgGGG', '....WWWWWWWW', '.....YY..YY.', '.....YY..YY.'];
  const KOOPA_STEP = KOOPA.slice(0, 8).concat(['....YY...YY.', '....YY...YY.']);
  const SHELL_G = ['...GGGG...', '..GgGGgG..', '.GGGGGGGG.', 'GGgGGgGGGG', 'WWWWWWWWWW'];
  const SPINY = ['...W...W...', '..WW.W.WW..', '.WRRWRWRRW.', '.RRRRRRRRR.', 'RRWRRRRWRRR', 'RRRRRRRRRRR', 'YkYWWWWWWW.', '.YY.YY.YY..'];
  const SPINY_STEP = SPINY.slice(0, 7).concat(['..YY.YY.YY.']);
  const BUZZY = ['...DDDDD...', '..DLLDDDD..', '.DLDDDDDDD.', '.DDDDDDDDDD', 'DDDDDDDDDDD', 'WWWWWWWWWWW', 'YkY........', '.YY..YY.YY.'];
  const BUZZY_STEP = BUZZY.slice(0, 7).concat(['..YY.YY..YY']);
  const SHELL_D = ['...DDDDD...', '..DLLDDDD..', '.DLDDDDDDD.', 'DDDDDDDDDDD', 'WWWWWWWWWWW'];
  const FIRE = ['.OYO.', 'OYYYO', 'YYWYY', 'OYYYO', '.OYO.'];

  // x is the sprite's centre, foot the y of its feet in canvas pixels
  function spr(g, rows, x, foot, P, o = {}) {
    const w = rows[0].length, h = rows.length;
    g.save();
    g.translate(Math.round(x), Math.round(foot - h * P / 2));
    if (o.rot) g.rotate(o.rot);
    g.scale(o.flipX ? -1 : 1, o.flipY ? -1 : 1);
    if (o.sy) g.scale(1, o.sy);
    g.globalAlpha *= o.a ?? 1;
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
      const ch = rows[r][c]; if (ch === '.' || !ch) continue;
      g.fillStyle = o.tint && ch !== 'k' && ch !== 'W' ? o.tint : PAL[ch];
      g.fillRect(Math.round((c - w / 2) * P), Math.round((r - h / 2) * P), P, P);
    }
    g.restore();
  }

  /* ---------- the rules ---------- */
  const FOES = {
    koopa: { name: 'Koopa', walk: [KOOPA, KOOPA_STEP], shell: SHELL_G },
    spiny: { name: 'Spiny', walk: [SPINY, SPINY_STEP], shell: null },
    buzzy: { name: 'Buzzy Beetle', walk: [BUZZY, BUZZY_STEP], shell: SHELL_D },
  };
  const ORDER = ['koopa', 'spiny', 'buzzy'];
  const VERBS = { jump: 'Jump', fire: 'Fireball' };
  const MARIO = { koopa: { jump: true, fire: true }, spiny: { jump: false, fire: true }, buzzy: { jump: true, fire: false } };
  const copy = r => JSON.parse(JSON.stringify(r));
  const PRESETS = {
    mario: MARIO,
    all: { koopa: { jump: true, fire: true }, spiny: { jump: true, fire: true }, buzzy: { jump: true, fire: true } },
    fire: { koopa: { jump: false, fire: true }, spiny: { jump: false, fire: true }, buzzy: { jump: false, fire: true } },
  };
  let RULES = copy(MARIO);
  const listeners = [];
  const changed = () => listeners.forEach(f => f());
  const works = (foe, verb) => RULES[foe][verb];

  // why each matchup turns out the way it does, for Mario's own rules
  const WHY = {
    'koopa.jump.1': 'Its shell is soft on top, so a stomp knocks it out.',
    'koopa.fire.1': 'Fire burns it too. Both verbs work, so the Koopa asks no question: it is the tutorial enemy.',
    'spiny.jump.0': 'Its spikes punish the verb you use most, so the Spiny forces a switch to fire.',
    'spiny.fire.1': 'Fire is the answer the spikes are asking for.',
    'buzzy.jump.1': 'The hard shell only guards its sides, so you have to go back to jumping.',
    'buzzy.fire.0': 'The fireball bounces off the shell and the beetle keeps coming. Fire, the answer to the Spiny, is the wrong one here.',
  };
  const verdict = (foe, verb, ok) => `<b class="${ok ? 'good' : 'bad'}">${VERBS[verb]} vs ${FOES[foe].name}: ${ok ? (verb === 'jump' ? 'stomped' : 'burned') : (verb === 'jump' ? 'ouch, spikes' : 'it bounces off')}.</b> `
    + (MARIO[foe][verb] === ok ? WHY[`${foe}.${verb}.${+ok}`] : 'That is your rule now, not Mario’s.');

  /* ---------- one encounter, in local units: Mario starts at 0, the enemy at D, both walking ---------- */
  const P = 5, D = 440, HV = 260, EV = 90, FV = 560, TA = .7, TJ = .55;
  const HALF_H = 22, HALF_E = 28;   // half widths for contact
  const hgt = foe => FOES[foe].walk[0].length * P;
  function encounter(foe, verb, ok) {
    const ex = t => D - EV * t, hx = HV * TA;
    let dur, end, at;
    if (verb === 'jump') {
      const tL = TA + TJ, xl = ex(tL), he = hgt(foe) - 4;
      dur = tL + (ok ? 1.05 : 1.45); end = ok ? xl + 100 : null;
      at = t => {
        const s = base(t, foe);
        if (t < TA) return s;
        if (t < tL) { const u = (t - TA) / TJ; Object.assign(s.hero, { x: lerp(hx, xl, u), y: lerp(0, he, u) + arc(u, 150), pose: 'jump' }); s.foe.x = ex(t); return s; }
        const k = t - tL;
        s.foe.x = xl;
        if (ok) {
          s.foe.mode = k < .5 ? 'squash' : 'gone';
          const u = Math.min(1, k / .5);
          Object.assign(s.hero, { x: lerp(xl, xl + 100, u), y: lerp(he, 0, u) + arc(u, 80), pose: u < 1 ? 'jump' : 'idle' });
          if (k < 1) s.pops.push({ x: xl, y: he + 70 + k * 40, text: 'Stomp!', col: '#1a8a4c', a: 1 - k });
        } else {
          s.foe.mode = 'walk'; s.foe.step = t;
          hurt(s, xl, he, k, 'Ouch!');
        }
        return s;
      };
    } else {
      const throws = ok ? [TA + .05] : [TA + .05, TA + .75], fx0 = hx + 30;
      const hitAt = ts => (D - HALF_E - 12 - fx0 + FV * ts) / (FV + EV);
      const th = throws.map(hitAt), tc = (D - HALF_E - HALF_H - hx) / EV;
      dur = ok ? th[0] + 1.1 : tc + 1.45; end = ok ? hx : null;
      at = t => {
        const s = base(t, foe);
        if (t < TA) return s;
        s.hero.x = hx; s.hero.pose = throws.some(ts => t >= ts - .05 && t < ts + .2) ? 'throw' : 'idle';
        throws.forEach((ts, i) => {
          if (t < ts) return;
          const hT = th[i], fly = Math.min(t, hT) - ts, fx = fx0 + FV * fly, fy = 14 + Math.abs(Math.sin(fly * 13)) * 34;
          if (t < hT) s.fires.push({ x: fx, y: fy, a: 1, spin: fly * 18 });
          else if (!ok) {
            const k = t - hT;
            if (k < .5) s.fires.push({ x: fx - 260 * k, y: fy + 330 * k - 900 * k * k, a: 1 - k / .5, spin: k * 30 });
            if (k < .7) s.pops.push({ x: fx + 10, y: fy + 40 + k * 40, text: 'Plink', col: '#b36b05', a: 1 - k / .7 });
          }
        });
        if (ok) {
          if (t < th[0]) s.foe.x = ex(t);
          else {
            const k = t - th[0], x0 = ex(th[0]);
            Object.assign(s.foe, { mode: 'flip', x: x0 + 70 * k, y: 300 * k - 1400 * k * k });
            if (k < 1) s.pops.push({ x: x0, y: hgt(foe) + 50 + k * 40, text: 'Burned!', col: '#d0561a', a: 1 - k });
          }
        } else {
          s.foe.x = ex(Math.min(t, tc)); s.foe.step = t;
          if (t >= tc) hurt(s, hx, 0, t - tc, 'Ouch!');
        }
        return s;
      };
    }
    return { foe, verb, ok, dur, end, at };
  }
  function base(t, foe) {
    return { hero: { x: HV * Math.min(t, TA), y: 0, pose: t < TA ? 'walk' : 'idle', step: t, flash: false },
      foe: { x: D - EV * t, y: 0, mode: 'walk', step: t, kind: foe }, fires: [], pops: [] };
  }
  function hurt(s, x0, y0, k, text) {
    const u = Math.min(1, k / .55);
    Object.assign(s.hero, { x: lerp(x0, x0 - 140, u), y: lerp(y0, 0, u) + arc(u, 70), pose: 'hurt', flash: k < 1.2 && (k * 12 | 0) % 2 === 0 });
    if (k < 1.2) s.pops.push({ x: x0, y: y0 + 90 + k * 40, text, col: '#cf2f3b', a: 1 - k / 1.2 });
  }

  /* ---------- a whole level: walk, meet each enemy with the planned verb, flagpole ---------- */
  const X0 = 160, GAPX = 720, FLAGX = X0 + GAPX * 3 + 120, WORLD = FLAGX + 420;
  // plan[foe] is the verb to use. coach: at each enemy, first try the verb that worked last time, and if it fails,
  // rewind and switch, so the run shows every decision being made
  function buildRun(plan, coach = false) {
    const segs = []; let t = 0, x = 40, fail = null, prev = 'jump';
    const add = (k, dur, o) => { segs.push({ k, t0: t, dur, ...o }); t += dur; };
    const walk = to => { if (to > x) { add('walk', (to - x) / HV, { x0: x, x1: to }); x = to; } };
    ORDER.forEach((foe, i) => {
      if (fail) return;
      const b = X0 + GAPX * i; walk(b);
      const good = Object.keys(VERBS).filter(v => works(foe, v));
      const tries = !coach ? [plan[foe]] : good.includes(prev) ? [prev] : [prev, good[0] || (prev === 'jump' ? 'fire' : 'jump')];
      tries.forEach((verb, j) => {
        if (coach) add('think', j ? 1.4 : 1.9, { b, i, foe, verb, j, tried: tries.slice(0, j), both: good.length === 2 });
        const e = encounter(foe, verb, works(foe, verb));
        add('enc', e.dur, { b, e, i });
        if (e.ok) x = b + e.end;
        else if (j < tries.length - 1) add('rewind', .8, { b, i, foe, verb });
        else fail = { foe, verb };
      });
      prev = tries.at(-1);
    });
    if (!fail) { walk(FLAGX - 50); add('flag', 2.6, { x0: x }); }
    else add('hold', 1.2, {});
    return { segs, dur: t, fail, plan };
  }
  function runAt(R, t) {
    t = clamp(t, 0, R.dur - 1e-6);
    const foes = ORDER.map((foe, i) => ({ kind: foe, x: X0 + GAPX * i + D, y: 0, mode: 'walk', step: t }));
    let hero = { x: 40, y: 0, pose: 'idle', step: t }, fires = [], pops = [], flag = 0, done = null, think = null, fade = 0;
    const reset = s => { hero = { x: s.b, y: 0, pose: 'idle', step: t }; foes[s.i] = { kind: ORDER[s.i], x: s.b + D, y: 0, mode: 'walk', step: t }; fires = []; pops = []; };
    for (const s of R.segs) {
      const k = t - s.t0;
      if (s.k === 'enc') {
        if (k < 0) break;
        const st = s.e.at(Math.min(k, s.e.dur - 1e-6)), sh = v => v + s.b;
        if (k >= s.e.dur && s.e.ok) { foes[s.i].mode = 'gone'; continue; }
        Object.assign(foes[s.i], st.foe, { x: sh(st.foe.x) });
        hero = { ...st.hero, x: sh(st.hero.x) };
        fires = st.fires.map(f => ({ ...f, x: sh(f.x) })); pops = st.pops.map(p => ({ ...p, x: sh(p.x) }));
        if (k < s.dur) break;
        fires = []; pops = [];
      } else if (s.k === 'walk') {
        if (k < 0) break;
        if (k < s.dur) { hero = { x: lerp(s.x0, s.x1, k / s.dur), y: 0, pose: 'walk', step: t }; break; }
        hero = { x: s.x1, y: 0, pose: 'idle', step: t };
      } else if (s.k === 'flag') {
        if (k < 0) break;
        const x0 = s.x0, px = FLAGX - 16;
        if (k < .45) { const u = k / .45; hero = { x: lerp(x0, px, u), y: arc(u, 260) + lerp(0, 150, u), pose: 'jump', step: t }; flag = 0; }
        else if (k < 1.35) { const u = (k - .45) / .9; hero = { x: px, y: lerp(150, 0, u), pose: 'jump', step: t }; flag = u; }
        else { const u = Math.min(1, (k - 1.35) / .6); hero = { x: lerp(px, px + 90, u), y: 0, pose: u < 1 ? 'walk' : 'idle', step: t }; flag = 1; done = 'clear'; }
        break;
      } else if (s.k === 'think') {
        if (k < 0) break;
        if (k < s.dur) { reset(s); think = { ...s, k }; break; }
      } else if (s.k === 'rewind') {
        if (k < 0) break;
        if (k < s.dur) { fade = Math.sin(Math.PI * k / s.dur); if (k >= s.dur / 2) reset(s); break; }
      } else if (s.k === 'hold') { if (k >= 0) done = 'fail'; }
    }
    return { hero, foes, fires, pops, flag, done, think, fade };
  }

  /* ---------- drawing ---------- */
  // the scene sits on the slide's own parchment: navy ink for the ground and scenery, gold for the edge
  const INK = '#262c6a';
  function sky(g, W, H, GY, cam = 0) {
    // hills and clouds drift slower than the ground, drawn as faint ink so the paper shows through
    g.fillStyle = 'rgba(38,44,106,.07)'; g.strokeStyle = 'rgba(38,44,106,.28)'; g.lineWidth = 3;
    for (let i = -1; i < 8; i++) { const x = i * 520 - (cam * .5) % 520; g.beginPath(); g.ellipse(x + 160, GY, 170, 90, 0, Math.PI, 0); g.fill(); g.stroke(); }
    for (let i = -1; i < 7; i++) {
      const x = i * 430 - (cam * .3) % 430 + 90, y = 60 + (i & 1) * 40;
      g.beginPath(); [[0, 0, 26], [28, -10, 32], [60, 0, 26]].forEach(([dx, dy, r]) => { g.moveTo(x + dx + r, y + dy); g.arc(x + dx, y + dy, r, 0, Math.PI * 2); });
      g.fillStyle = 'rgba(255,250,240,.75)'; g.fill();
    }
    for (let i = -1; i < 7; i++) {
      const x = i * 430 - (cam * .3) % 430 + 90, y = 60 + (i & 1) * 40;
      g.strokeStyle = 'rgba(38,44,106,.25)'; g.lineWidth = 2.5;
      g.beginPath(); g.arc(x, y, 26, Math.PI * .5, Math.PI * 1.5); g.arc(x + 28, y - 10, 32, Math.PI * 1.1, Math.PI * 1.9); g.arc(x + 60, y, 26, Math.PI * 1.5, Math.PI * .5); g.closePath(); g.stroke();
    }
    g.fillStyle = INK; g.fillRect(0, GY, W, H - GY);
    g.fillStyle = '#3a4290';
    const T = 40, off = cam % T;
    for (let y = GY; y < H; y += T / 2) {
      g.fillRect(0, y, W, 2);
      const sh = ((y - GY) / (T / 2)) % 2 ? T / 2 : 0;
      for (let x = -off - T + sh; x < W; x += T) g.fillRect(Math.round(x), y, 2, T / 2);
    }
    g.fillStyle = '#ffb951'; g.fillRect(0, GY, W, 5);
  }
  function hero(g, h, x, GY) {
    const rows = h.pose === 'jump' || h.pose === 'hurt' ? HERO_JUMP : h.pose === 'throw' ? HERO_THROW : h.pose === 'walk' && (h.step * 8 | 0) % 2 ? HERO_STEP : HERO;
    spr(g, rows, x, GY - h.y, P, { tint: h.flash ? '#ffffff' : null, a: h.flash ? .8 : 1 });
  }
  function foe(g, f, x, GY) {
    if (f.mode === 'gone') return;
    const F = FOES[f.kind];
    if (f.mode === 'squash') return spr(g, F.shell || F.walk[0], x, GY, P, F.shell ? {} : { sy: .45 });
    if (f.mode === 'flip') return spr(g, F.walk[0], x, GY - f.y, P, { flipY: true });
    spr(g, F.walk[(f.step * 5 | 0) % 2], x, GY - f.y, P);
  }
  function fire(g, f, x, GY) { spr(g, FIRE, x, GY - f.y, P, { rot: f.spin, a: f.a }); }
  function pop(g, p, x, GY) {
    g.save(); g.globalAlpha = clamp(p.a, 0, 1); g.font = '700 28px Montserrat, Jost, sans-serif'; g.textAlign = 'center';
    g.lineWidth = 7; g.strokeStyle = '#fffaf0'; g.strokeText(p.text, x, GY - p.y); g.fillStyle = p.col; g.fillText(p.text, x, GY - p.y); g.restore();
  }
  function label(g, text, x, y, o = {}) {
    g.save(); g.font = `${o.w || 600} ${o.size || 24}px Montserrat, Jost, sans-serif`; g.textAlign = o.align || 'center'; g.textBaseline = 'middle';
    const m = g.measureText(text).width, pw = o.pad ?? 16, bw = m + pw * 2, bh = (o.size || 24) + 16;
    const bx = o.align === 'left' ? x - pw : o.align === 'right' ? x - m - pw : x - bw / 2;
    g.fillStyle = o.bg || 'rgba(21,32,68,.88)'; g.beginPath(); g.roundRect(bx, y - bh / 2, bw, bh, 8); g.fill();
    if (o.edge) { g.strokeStyle = o.edge; g.lineWidth = 3; g.stroke(); }
    g.fillStyle = o.col || '#fff'; g.fillText(text, x, y + 1); g.restore();
  }
  function flagpole(g, x, GY, down, pole = INK) {
    g.fillStyle = pole; g.fillRect(x - 3, GY - 300, 6, 300);
    g.fillStyle = '#ffb951'; g.beginPath(); g.arc(x, GY - 304, 9, 0, Math.PI * 2); g.fill();
    const fy = GY - 290 + down * 240;
    g.fillStyle = '#ffb951'; g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 3, fy); g.lineTo(x - 58, fy + 22); g.lineTo(x - 3, fy + 44); g.fill(); g.stroke();
    g.fillStyle = INK; g.beginPath(); g.arc(x - 20, fy + 22, 7, 0, Math.PI * 2); g.fill();
    g.fillStyle = pole; g.fillRect(x - 18, GY - 30, 36, 30);
  }
  // a single encounter, drawn with Mario's start at ox
  function drawEnc(g, W, H, st, ox) {
    const GY = H - 70;
    sky(g, W, H, GY);
    foe(g, st.foe, ox + st.foe.x, GY);
    hero(g, st.hero, ox + st.hero.x, GY);
    st.fires.forEach(f => fire(g, f, ox + f.x, GY));
    st.pops.forEach(p => pop(g, p, ox + p.x, GY));
  }
  // the level at camera x cam and zoom z, scaled about the ground line
  function drawScene(g, W, H, GY, s, cam, z = 1) {
    g.save(); g.translate(0, GY); g.scale(z, z); g.translate(0, -GY);
    sky(g, W / z, GY + (H - GY) / z, GY, cam);
    flagpole(g, FLAGX - cam, GY, s.flag);
    s.foes.forEach(f => foe(g, f, f.x - cam, GY));
    hero(g, s.hero, s.hero.x - cam, GY);
    s.fires.forEach(f => fire(g, f, f.x - cam, GY));
    s.pops.forEach(p => pop(g, p, p.x - cam, GY));
    g.restore();
  }
  const follow = (s, W) => clamp(s.hero.x - 380, 0, WORLD - W);
  function drawRun(g, W, H, R, t) {
    const GY = H - 70, s = runAt(R, t), cam = follow(s, W);
    drawScene(g, W, H, GY, s, cam);
    // where you are along start, opposition, goal
    const bx = 40, bw = 360, by = 30, prog = clamp((s.hero.x - 40) / (FLAGX - 40), 0, 1);
    g.fillStyle = 'rgba(21,32,68,.8)'; g.beginPath(); g.roundRect(bx - 14, by - 16, bw + 28, 50, 10); g.fill();
    g.fillStyle = '#34437a'; g.fillRect(bx, by + 6, bw, 6);
    g.fillStyle = '#ffb951'; g.fillRect(bx, by + 6, bw * prog, 6);
    ORDER.forEach((f, i) => {
      const fx = bx + bw * (X0 + GAPX * i + D - 40) / (FLAGX - 40), st = s.foes[i].mode;
      g.fillStyle = st === 'gone' ? '#5fe0a0' : R.fail && R.fail.foe === f && s.done ? '#ff6b6b' : '#ffffff';
      g.beginPath(); g.arc(fx, by + 9, 8, 0, Math.PI * 2); g.fill();
    });
    g.fillStyle = s.done === 'clear' ? '#5fe0a0' : '#ffffff'; g.fillRect(bx + bw - 3, by - 6, 4, 26);
    g.font = '500 15px Jost, sans-serif'; g.fillStyle = '#b3bbd8'; g.textAlign = 'left'; g.fillText('Start', bx, by - 4);
    g.textAlign = 'right'; g.fillText('Goal', bx + bw - 8, by - 4);
    if (s.done === 'clear') label(g, 'Course clear: a different decision for each enemy', W / 2, 120, { size: 30, col: '#5fe0a0', edge: '#5fe0a0' });
    if (s.done === 'fail') label(g, `${VERBS[R.fail.verb]} can’t get past the ${FOES[R.fail.foe].name}`, W / 2, 120, { size: 30, col: '#ff6b6b', edge: '#ff6b6b' });
    return s;
  }

  /* ---------- the outcome matrix, shared by the lab and the rules slide ---------- */
  const mark = ok => ok ? '<span class="good">✓ Works</span>' : '<span class="bad">✗ Fails</span>';
  function matrix(tbl, { cur, seen, onPick }) {
    tbl.innerHTML = '<tr><th></th>' + Object.keys(VERBS).map(v => `<th>${VERBS[v]}</th>`).join('') + '</tr>' + ORDER.map(f =>
      `<tr><th><canvas class="mx-ic" width="72" height="56" data-f="${f}"></canvas><span>${FOES[f].name}</span></th>` + Object.keys(VERBS).map(v => {
        const k = f + '.' + v, show = !seen || seen.has(k);
        return `<td data-k="${k}" class="${cur === k ? 'cur' : ''} ${show ? (works(f, v) ? 'ok' : 'no') : 'unk'}">${show ? mark(works(f, v)) : '?'}</td>`;
      }).join('') + '</tr>').join('');
    $$(tbl, 'canvas.mx-ic').forEach(c => { const g = c.getContext('2d'); spr(g, FOES[c.dataset.f].walk[0], 36, 52, 4); });
    $$(tbl, 'td[data-k]').forEach(td => td.onclick = () => onPick(...td.dataset.k.split('.')));
  }

  /* ---------- slide 1: title sprites ---------- */
  canvasDemo('title', (s, c, g) => (dt, t) => {
    g.clearRect(0, 0, c.width, c.height);
    const GY = 130;
    hero(g, { pose: 'walk', step: t, y: 0 }, 140, GY);
    spr(g, FIRE, 230, GY - 20 - Math.abs(Math.sin(t * 6)) * 30, P, { rot: t * 10 });
    ['koopa', 'spiny', 'buzzy'].forEach((f, i) => spr(g, FOES[f].walk[((t + i * .1) * 5 | 0) % 2], 400 + i * 150, GY, P));
    g.save(); g.translate(830, GY + 6); g.scale(.42, .42); flagpole(g, 0, 0, 0, '#e9e9e9'); g.restore();
    g.save(); g.globalCompositeOperation = 'destination-in'; g.fillStyle = '#000'; g.fillRect(0, 0, c.width, GY + 6); g.restore();
  });

  /* ---------- slide 2: the deck's diagram built step by step, then laid over the level and played ---------- */
  // phase start times in seconds; the run starts at FR.play and the zoom-out follows it
  const FR = { start: 0, goal: 2.4, opp: 4.8, dec: 7.4, morph: 10.4, over: 12.8, zoom: 14.4, play: 16 };
  const ez = u => u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
  const ph = (t, a, d) => clamp((t - a) / d, 0, 1);
  let frameApi = null;
  canvasDemo('frame', (s, c, g) => {
    const W = c.width, H = c.height, GY = H - 80, out = $(s, '.fr-out');
    const zO = W / (WORLD + 200), camO = -130;     // the overview: the whole level fits the canvas
    const st = { t: 0, slow: false, paused: false, held: false };
    let R, T, lastCap = '';
    const rebuild = () => { R = buildRun(null, true); T = { end: FR.play + R.dur, dur: FR.play + R.dur + 5 }; };
    rebuild(); listeners.push(rebuild);
    $(s, '.fr-replay').onclick = () => { st.t = 0; st.paused = false; };
    $(s, '.fr-play').onclick = () => { st.t = FR.morph; st.paused = false; };
    $(s, '.fr-slow').onclick = e => { st.slow = !st.slow; e.target.classList.toggle('on', st.slow); };
    $(s, '.fr-pause').onclick = e => { st.paused = !st.paused; e.target.textContent = st.paused ? '▶ Resume' : '❚❚ Pause'; };

    // world to screen at camera cam and zoom z
    const sx = (x, cam, z) => (x - cam) * z, sy = (y, z) => GY + (y - GY) * z;
    const targets = (cam, z) => ({
      start: { cx: sx(40, cam, z), cy: sy(GY - 125, z), w: 110, h: 42, r: 8 },
      goal: { cx: sx(FLAGX, cam, z), cy: sy(GY - 350, z), w: 100, h: 42, r: 8 },
      opp: { x0: sx(X0 + D - 95, cam, z), x1: sx(X0 + 2 * GAPX + D + 95, cam, z), y0: sy(GY - 175, z), y1: sy(GY + 6, z) },
    });
    const DIA = {
      start: { cx: 200, cy: 215, w: 220, h: 160, r: 14 },
      goal: { cx: 1210, cy: 215, w: 200, h: 200, r: 100 },
      bar: { cx: 705, cy: 215, w: 70, h: 230 },
      opp: { x0: 590, x1: 820, y0: 80, y1: 350 },
    };
    const mix = (a, b, u) => Object.fromEntries(Object.keys(a).map(k => [k, lerp(a[k], b[k], u)]));
    function box(b, fill, text, size, a = 1, o = {}) {
      if (a <= 0) return;
      g.save(); g.globalAlpha = Math.min(1, a);
      g.translate(b.cx, b.cy); if (o.sc) g.scale(o.sc, o.sc);
      const gr = g.createLinearGradient(0, -b.h / 2, 0, b.h / 2); gr.addColorStop(0, fill[0]); gr.addColorStop(1, fill[1]);
      g.fillStyle = gr; g.beginPath(); g.roundRect(-b.w / 2, -b.h / 2, b.w, b.h, Math.min(b.r, b.w / 2, b.h / 2)); g.fill();
      g.strokeStyle = o.edge || '#ffb951'; g.lineWidth = 3; g.stroke();
      g.fillStyle = '#fff'; g.font = `800 ${size}px Montserrat, Jost, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      if (o.rot) g.rotate(-Math.PI / 2);
      g.fillText(text, 0, 2); g.restore();
    }
    function pipe(o, a, lw = 9) {
      if (a <= 0) return;
      g.save(); g.globalAlpha = Math.min(1, a); g.strokeStyle = '#a95be8'; g.lineWidth = lw;
      g.beginPath(); g.roundRect(o.x0, o.y0, o.x1 - o.x0, o.y1 - o.y0, 14); g.stroke(); g.restore();
    }
    function arrow(x0, x1, y, a, grow = 1) {
      if (a <= 0 || grow <= 0) return;
      const xe = lerp(x0, x1, grow);
      g.save(); g.globalAlpha = Math.min(1, a); g.strokeStyle = '#5562eb'; g.fillStyle = '#5562eb'; g.lineWidth = 7;
      g.beginPath(); g.moveTo(x0, y - 7); g.lineTo(xe - 18, y - 7); g.moveTo(x0, y + 7); g.lineTo(xe - 18, y + 7); g.stroke();
      g.beginPath(); g.moveTo(xe + 4, y); g.lineTo(xe - 26, y - 22); g.lineTo(xe - 26, y + 22); g.fill(); g.restore();
    }
    function frame(text, a) {
      if (a <= 0) return;
      g.save(); g.globalAlpha = a; g.setLineDash([18, 12]); g.strokeStyle = INK; g.lineWidth = 3;
      g.beginPath(); g.roundRect(22, 32, W - 44, GY - 44, 12); g.stroke(); g.restore();
      g.save(); g.globalAlpha = a; label(g, text, W / 2, 32, { size: 24, col: '#ffb951', edge: '#ffb951', bg: '#152044' }); g.restore();
    }

    function chips(th, hx) {
      const both = th.both && !th.j, show = th.k > .55;
      const cw = 170, gap = 14, x0 = clamp(hx - cw - gap / 2, 30, W - 2 * cw - gap - 30), y = GY - 175;
      label(g, `${FOES[th.foe].name}: jump or fireball?`, x0 + cw + gap / 2, y - 52, { size: 22, bg: '#152044' });
      Object.keys(VERBS).forEach((v, i) => {
        const x = x0 + i * (cw + gap), failed = th.tried.includes(v), pick = show && v === th.verb;
        const mark = failed ? ' ✗' : both && show ? ' ✓' : '';
        g.save();
        g.fillStyle = pick ? '#152044' : '#fffaf0'; g.strokeStyle = pick ? '#ffb951' : failed ? '#cf2f3b' : '#b9a578'; g.lineWidth = pick ? 4 : 3;
        g.beginPath(); g.roundRect(x, y - 24, cw, 48, 10); g.fill(); g.stroke();
        g.font = '700 22px Montserrat, Jost, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillStyle = pick ? '#fff' : failed ? '#cf2f3b' : '#152044';
        g.fillText(VERBS[v] + mark, x + cw / 2, y + 1); g.restore();
      });
    }

    function caption(t) {
      if (t < FR.goal) return '<b>Start:</b> where the player begins.';
      if (t < FR.opp) return '<b>Goal:</b> where the player is trying to get. With nothing in between, it’s just a walk.';
      if (t < FR.dec) return '<b>Opposition:</b> something stands between the start and the goal and resists the player.';
      if (t < FR.morph) return '<b>Decisions:</b> how the player chooses to overcome the opposition. Ideally, a variety of different decisions.';
      if (t < FR.play) return 'In Mario: start on the left, the <b>flagpole</b> is the goal, the <b>enemies</b> are the opposition, and <b>jump or fireball</b> is the decision.';
      if (t >= T.end) return R.fail ? `<b class="bad">The opposition wins.</b> Nothing gets past the ${FOES[R.fail.foe].name}, so there is no decision left to make.`
        : '<b class="good">Goal.</b> Three enemies, and the right answer changed at each one: a variety of different decisions to overcome the opposition.';
      const rt = t - FR.play, segs = R.segs, i = segs.findIndex(x => rt >= x.t0 && rt < x.t0 + x.dur), cur = segs[i];
      if (!cur) return '';
      const last = segs.slice(0, i + 1).reverse().find(x => x.k === 'enc' && rt >= x.t0 + x.e.dur * .55);
      const name = f => FOES[f].name;
      if (cur.k === 'think') {
        if (cur.j) return `So the decision changes: <b>${VERBS[cur.verb].toLowerCase()}</b> the ${name(cur.foe)} instead.`;
        if (cur.both) return `The <b>${name(cur.foe)}</b>: both verbs work, so any choice beats it. Mario jumps.`;
        return cur.i ? `The <b>${name(cur.foe)}</b>: ${VERBS[cur.verb].toLowerCase()} worked on the last enemy. Will it work here?` : `The <b>${name(cur.foe)}</b>: try ${VERBS[cur.verb].toLowerCase()}?`;
      }
      if (cur.k === 'rewind') return `<b class="bad">${VERBS[cur.verb]} won’t get past the ${name(cur.foe)}.</b> Rewind and decide again.`;
      if (cur.k === 'enc' && rt < cur.t0 + cur.e.dur * .55) return `<b>${VERBS[cur.e.verb]} vs ${name(cur.e.foe)}…</b>`;
      if (last) return verdict(last.e.foe, last.e.verb, last.e.ok);
      return 'Mario sets off from the start.';
    }

    function render() {
      const t = st.t % T.dur;
      g.clearRect(0, 0, W, H);
      const cap = caption(t);
      if (cap !== lastCap) { say(out, cap); lastCap = cap; }
      const a = (x, d = .5) => ez(ph(t, x, d));
      if (t < FR.morph) {
        // the deck's diagram, one piece at a time
        const aS = a(FR.start + .2), aG = a(FR.goal), aO = a(FR.opp), aD = a(FR.dec);
        arrow(DIA.start.cx + 110, DIA.goal.cx - 104, 215, aG * (1 - aO), ez(ph(t, FR.goal + .3, 1.2)));
        arrow(DIA.start.cx + 110, DIA.opp.x0 - 6, 215, aO); arrow(DIA.opp.x1 + 6, DIA.goal.cx - 104, 215, aO);
        pipe(DIA.opp, aO);
        box({ ...DIA.bar, r: 10 }, ['#7a3bc4', '#3b1f72'], 'Opposition', 24, aO, { rot: true, sc: lerp(.6, 1, aO) });
        box(DIA.start, ['#4f6fe0', '#2f3fa8'], 'Start', 34, aS, { sc: lerp(.6, 1, aS) });
        box(DIA.goal, ['#5562eb', '#152044'], 'Goal', 34, aG, { sc: lerp(.6, 1, aG) });
        frame('Decisions', aD);
        return;
      }
      // the level: overview, zoom in, play, zoom back out
      const rt = clamp(t - FR.play, 0, R.dur), sR = runAt(R, rt);
      let cam = camO, z = zO;
      if (t >= FR.zoom && t < FR.play) { const u = ez(ph(t, FR.zoom, FR.play - FR.zoom)); cam = lerp(camO, follow(sR, W), u); z = lerp(zO, 1, u); }
      else if (t >= FR.play) { const u = ez(ph(t, T.end + .6, 1.8)); cam = lerp(follow(sR, W), camO, u); z = lerp(1, zO, u); }
      const k = ez(ph(t, FR.morph, FR.over - FR.morph));
      g.save(); g.globalAlpha = k; drawScene(g, W, H, GY, sR, cam, z); g.restore();
      // the diagram's pieces slide onto their Mario counterparts, then stay pinned to the world
      const tg = targets(cam, z), to = targets(camO, zO);
      arrow(DIA.start.cx + 110, DIA.opp.x0 - 6, 215, 1 - k * 1.6); arrow(DIA.opp.x1 + 6, DIA.goal.cx - 104, 215, 1 - k * 1.6);
      box({ ...DIA.bar, r: 10 }, ['#7a3bc4', '#3b1f72'], 'Opposition', 24, 1 - k * 1.4, { rot: true });
      const opp = k < 1 ? mix(DIA.opp, to.opp, k) : tg.opp;
      pipe(opp, 1, lerp(9, 5, k));
      if (k > .5) label(g, 'Opposition', (opp.x0 + opp.x1) / 2, opp.y0, { size: 20, bg: '#7a3bc4', col: '#fff' });
      const S = k < 1 ? mix(DIA.start, to.start, k) : tg.start, G = k < 1 ? mix(DIA.goal, to.goal, k) : tg.goal;
      box(S, ['#4f6fe0', '#2f3fa8'], 'Start', lerp(34, 20, k), 1);
      box(G, ['#5562eb', '#152044'], sR.done === 'clear' ? 'Goal ✓' : 'Goal', lerp(34, 20, k), 1, sR.done === 'clear' ? { edge: '#5fe0a0' } : {});
      frame(k > .5 ? 'Decisions: jump or fireball?' : 'Decisions', 1);
      if (sR.think) chips(sR.think, sx(sR.hero.x, cam, z));
      if (sR.fade > 0) {
        g.save(); g.globalAlpha = sR.fade * .8; g.fillStyle = '#f3ecdc'; g.fillRect(0, 0, W, H); g.restore();
        g.save(); g.globalAlpha = sR.fade; label(g, '↺ Rewind', W / 2, GY / 2, { size: 30, bg: '#152044', col: '#ffb951', edge: '#ffb951' }); g.restore();
      }
    }
    frameApi = { seek(t) { st.held = true; st.t = t; render(); }, dur: () => T.dur };
    return dt => { if (!st.held && !st.paused) st.t += dt * (st.slow ? .5 : 1); render(); };
  });

  /* ---------- slide 3: the matchup lab, with a tour through all six ---------- */
  const TOUR_GAP = .55, TOUR_PLAN = { koopa: 'jump', spiny: 'fire', buzzy: 'jump' };
  function buildTour() {
    const items = []; let t = 0;
    ORDER.forEach(f => Object.keys(VERBS).forEach(v => {
      const e = encounter(f, v, works(f, v)); items.push({ k: 'enc', t0: t, e, dur: e.dur + TOUR_GAP }); t += e.dur + TOUR_GAP;
    }));
    const R = buildRun(TOUR_PLAN); items.push({ k: 'run', t0: t, R, dur: R.dur + 1.2 }); t += R.dur + 1.2;
    return { items, dur: t };
  }
  let labApi = null;
  canvasDemo('lab', (s, c, g) => {
    const W = c.width, H = c.height, out = $(s, '.lab-out'), tbl = $(s, '.lab-mx');
    const st = { foe: 'koopa', verb: 'jump', t: 0, slow: false, tour: true, tt: 0 };
    let E, T, seen = new Set(), lastKey = '';
    const rebuild = () => { E = encounter(st.foe, st.verb, works(st.foe, st.verb)); T = buildTour(); };
    function sync(key, seenNow) {
      const k = key + '|' + [...seenNow].join(',') + '|' + st.tour;
      if (k === lastKey) return; lastKey = k;
      matrix(tbl, { cur: key.includes('.') ? key : null, seen: st.tour ? seenNow : null, onPick: (f, v) => pick(f, v) });
      $(s, '.lab-tour').classList.toggle('on', st.tour);
      $(s, '.lab-slow').classList.toggle('on', st.slow);
    }
    function pick(f, v) { Object.assign(st, { foe: f, verb: v, t: 0, tour: false }); rebuild(); lastKey = ''; }
    $(s, '.lab-tour').onclick = () => { st.tour = true; st.tt = 0; rebuild(); lastKey = ''; };
    $(s, '.lab-replay').onclick = () => { st.t = 0; st.tt = 0; };
    $(s, '.lab-slow').onclick = () => { st.slow = !st.slow; lastKey = ''; };
    listeners.push(() => { rebuild(); lastKey = ''; });
    rebuild();

    function render() {
      g.clearRect(0, 0, W, H);
      if (!st.tour) {
        drawEnc(g, W, H, E.at(Math.min(st.t, E.dur)), 200);
        label(g, `${VERBS[st.verb]} vs ${FOES[st.foe].name}`, 24, 34, { align: 'left', size: 22 });
        sync(st.foe + '.' + st.verb, new Set());
        say(out, verdict(st.foe, st.verb, E.ok));
        return;
      }
      const tt = st.tt % T.dur, it = T.items.find(x => tt >= x.t0 && tt < x.t0 + x.dur) || T.items.at(-1), k = tt - it.t0;
      const done = new Set();
      T.items.forEach(x => { if (x.k === 'enc' && tt >= x.t0 + x.e.dur * .55) done.add(x.e.foe + '.' + x.e.verb); });
      if (it.k === 'enc') {
        const e = it.e;
        drawEnc(g, W, H, e.at(Math.min(k, e.dur)), 200);
        label(g, `${VERBS[e.verb]} vs ${FOES[e.foe].name}`, 24, 34, { align: 'left', size: 22 });
        sync(e.foe + '.' + e.verb, done);
        say(out, k < e.dur * .55 ? `<b>${VERBS[e.verb]} vs ${FOES[e.foe].name}…</b>` : verdict(e.foe, e.verb, e.ok));
      } else {
        drawRun(g, W, H, it.R, k);
        label(g, 'Now the level: read each enemy', 24, 34, { align: 'left', size: 22, col: '#ffb951' });
        sync('run', done);
        say(out, '<b>Jump the Koopa, fireball the Spiny, jump the Buzzy Beetle.</b> No single verb clears the level: each piece of opposition asks for its own decision.');
      }
    }
    labApi = { seek(t) { st.held = st.tour = true; st.tt = t; render(); }, dur: () => T.dur };
    return dt => { const d = st.held ? 0 : dt * (st.slow ? .5 : 1); st.t += d; st.tt += d; if (!st.tour && st.t > E.dur + 1.4) st.t = 0; render(); };
  }, { enter(s) { const b = $(s, '.lab-tour'); if (b && !b.classList.contains('on')) b.click(); } });

  /* ---------- slide 4: the whole level with a plan ---------- */
  canvasDemo('run', (s, c, g) => {
    const W = c.width, H = c.height, out = $(s, '.run-out'), picks = $(s, '.run-picks');
    const st = { plan: { koopa: 'jump', spiny: 'jump', buzzy: 'jump' }, t: 0 };
    let R;
    const planName = () => ORDER.every(f => st.plan[f] === 'jump') ? 'jump' : ORDER.every(f => st.plan[f] === 'fire') ? 'fire'
      : ORDER.every(f => works(f, st.plan[f])) ? 'read' : '';
    function sync() {
      R = buildRun(st.plan); st.t = 0;
      $$(s, '[data-plan]').forEach(b => b.classList.toggle('on', b.dataset.plan === planName()));
      picks.innerHTML = ORDER.map(f => `<span class="pk"><canvas width="60" height="44" data-f="${f}"></canvas>` +
        Object.keys(VERBS).map(v => `<button class="btn sm ${st.plan[f] === v ? 'on' : ''}" data-f="${f}" data-v="${v}">${VERBS[v]}</button>`).join('') + '</span>').join('');
      $$(picks, 'canvas').forEach(cv => spr(cv.getContext('2d'), FOES[cv.dataset.f].walk[0], 30, 42, 3.4));
      $$(picks, 'button').forEach(b => b.onclick = () => { st.plan[b.dataset.f] = b.dataset.v; sync(); });
      say(out, R.fail
        ? `<b class="bad">Stuck at the ${FOES[R.fail.foe].name}.</b> ${R.fail.verb === 'jump' ? 'Always jumping works until an enemy punishes jumping.' : 'Always throwing fire works until an enemy shrugs fire off.'} One verb isn’t enough to overcome this opposition.`
        : `<b class="good">Flagpole.</b> ${ORDER.map(f => `${VERBS[st.plan[f]].toLowerCase()} the ${FOES[f].name}`).join(', ').replace(/^./, m => m.toUpperCase())}. The level is a string of small decisions, each one forced by the enemy in front of you.`);
    }
    $$(s, '[data-plan]').forEach(b => b.onclick = () => {
      const p = b.dataset.plan;
      ORDER.forEach(f => st.plan[f] = p === 'read' ? (works(f, 'jump') ? 'jump' : 'fire') : p);
      sync();
    });
    $(s, '.run-replay').onclick = () => { st.t = 0; };
    listeners.push(sync);
    sync();
    return dt => { st.t += dt; if (st.t > R.dur + 1.4) st.t = 0; g.clearRect(0, 0, W, H); drawRun(g, W, H, R, st.t); };
  });

  /* ---------- slide 5: edit the rules, read off the decisions ---------- */
  demo('rules', {
    init(s) {
      const tbl = $(s, '.rl-mx'), stats = $(s, '.rl-stats'), out = $(s, '.rl-out');
      function sync() {
        matrix(tbl, { onPick: (f, v) => { RULES[f][v] = !RULES[f][v]; changed(); } });
        const n = f => +RULES[f].jump + +RULES[f].fire;
        const forced = ORDER.filter(f => n(f) === 1), free = ORDER.filter(f => n(f) === 2), walls = ORDER.filter(f => n(f) === 0);
        const needed = Object.keys(VERBS).filter(v => ORDER.some(f => RULES[f][v] && n(f) === 1));
        const idle = Object.keys(VERBS).filter(v => ORDER.every(f => !RULES[f][v]));
        $$(s, '[data-preset]').forEach(b => b.classList.toggle('on', JSON.stringify(PRESETS[b.dataset.preset]) === JSON.stringify(RULES)));
        stats.innerHTML = [
          ['Enemies that force a choice', forced.length, forced.length ? 'good' : 'bad'],
          ['Enemies either verb beats', free.length, ''],
          ['Enemies nothing beats', walls.length, walls.length ? 'bad' : ''],
          ['Verbs the level needs', `${needed.length} of 2`, needed.length === 2 ? 'good' : 'bad'],
        ].map(([a, b, c]) => `<div class="st ${c}"><b>${b}</b><span>${a}</span></div>`).join('');
        let msg;
        if (walls.length) msg = `<b class="bad">Nothing beats the ${walls.map(f => FOES[f].name).join(' or the ')}.</b> The opposition has no answer, so the player has no decision to make, only a wall. Give them a verb that works, or a way around.`;
        else if (!forced.length) msg = `<b class="bad">Every enemy accepts ${idle.length ? 'the same verb' : 'either verb'}.</b> The opposition is still there, but it never asks a question: the player can ${idle.length ? `ignore ${VERBS[idle[0]].toLowerCase()} entirely` : 'pick one verb and hold it'} for the whole level.`;
        else if (needed.length < 2) msg = `<b class="bad">${VERBS[needed[0]]} beats everything that matters.</b> Some enemies force a choice, but it is always the same choice, so the other verb is decoration.`;
        else msg = `<b class="good">Every verb is the only answer somewhere.</b> ${forced.map((f, i) => `${i ? 'the' : 'The'} ${FOES[f].name} needs ${VERBS[Object.keys(VERBS).find(v => RULES[f][v])].toLowerCase()}`).join('; ')}${free.length ? `, and the ${free.map(f => FOES[f].name).join(' and ')} lets you pick, which makes it a good first enemy` : ''}. That is a variety of decisions to overcome the opposition.`;
        say(out, msg);
      }
      $$(s, '[data-preset]').forEach(b => b.onclick = () => { RULES = copy(PRESETS[b.dataset.preset]); changed(); });
      listeners.push(sync);
      sync();
    },
  });

  // GIF hooks: render the framework sequence (or the lab tour) at time t without the animation loop
  window.__ecSeek = (t, which = 'frame') => (which === 'lab' ? labApi : frameApi).seek(t);
  window.__ecDur = (which = 'frame') => (which === 'lab' ? labApi : frameApi).dur();
})();
