/* Core actions by genre (RGF C2 M4, 3Cs: Character, Part 6 "Core Actions Define the Character").
   One puppet, dressed per genre (plumber, karateka, knight, soldier, runner), whose action bar swaps when you pick a genre, using the slide's verb sets:
   platformers (run, jump, attack), fighting games (walk, fast, heavy, block, grab, jump), Souls-likes (attack,
   dodge, block, parry, estus), FPS (run, shoot, ADS, grenade, take cover) and parkour (run, climb, mantle, swing, slide).
   Each verb plays as a short pose animation. Poses and timings are illustrative approximations.
   The canvas is a pure function of time plus the learner's picks, so window.__seek is deterministic. */
(function () {
  const { $, $$, canvasDemo, say, ptr } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD, TAU = Math.PI * 2;
  T.prop('crate');
  const W = 1040, H = 585, GY = 418, PX = 300, S = 1.7;
  const rr = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
  const text = (g, s, x, y, size, col = C.ink, w = 600, align = 'left', fam = 'Jost') => { g.font = `${w} ${size}px ${fam}, sans-serif`; g.fillStyle = col; g.textAlign = align; g.textBaseline = 'alphabetic'; g.fillText(s, x, y); };
  const img = n => { const i = new Image(); i.src = `img/${n}`; return i; };
  const GOOMBA = img('smb-goomba.png'), GOOMBA_FLAT = img('smb-goomba-flat.png');
  const sprite = (g, i, x, y, w, h) => { if (i.complete && i.naturalWidth) { g.imageSmoothingEnabled = false; g.drawImage(i, x, y, w, h); g.imageSmoothingEnabled = true; } };
  const bump = (k, a, b) => k > a && k < b ? Math.sin((k - a) / (b - a) * Math.PI) : 0;   // 0 -> 1 -> 0 between a and b
  const seg01 = (k, a, b) => clamp((k - a) / (b - a));

  /* ---------- the puppet (angles in radians: 0 hangs straight down, + swings forward) ---------- */
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
  /* ---------- costumes: one body, dressed per genre (colours and headgear only; the joints never change) ---------- */
  const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16), f = v => Math.round(v * (1 - k)); return `rgb(${f(n >> 16)},${f(n >> 8 & 255)},${f(n & 255)})`; };
  const SKIN = '#f1c39a', SKIN2 = '#c98e63';
  const SKINS = {
    plat: { skin: SKIN, top: '#e5322d', sleeve: '#e5322d', fore: SKIN, pants: '#2f5bd3', boots: '#7a4a24', gloves: '#ffffff', hat: 'cap', hatCol: '#e5322d', hair: '#4a2a14', torso: 'overalls' },
    fight: { skin: SKIN2, top: '#f4f1ea', sleeve: '#f4f1ea', fore: SKIN2, pants: '#f4f1ea', boots: SKIN2, gloves: '#d8c7a8', hat: 'band', hatCol: '#d62828', hair: '#1b1b1b', torso: 'gi', belt: '#1b1b1b' },
    fightFoe: { skin: '#e9b48a', top: '#c0392b', sleeve: '#c0392b', fore: '#e9b48a', pants: '#c0392b', boots: '#e9b48a', gloves: '#2b2b2b', hat: 'hair', hair: '#e8c34a', torso: 'gi', belt: '#2b2b2b' },
    souls: { skin: SKIN, top: '#8d96a8', sleeve: '#6f7789', fore: '#8d96a8', pants: '#5b5f6b', boots: '#4a3524', gloves: '#5a4a3a', hat: 'helm', hatCol: '#9aa3b5', torso: 'armor', plate: '#b3bccb', belt: '#6b4a2a', cape: '#7a2430' },
    soulsFoe: { skin: '#3a2a2a', top: '#5a2a2a', sleeve: '#4a2222', fore: '#5a2a2a', pants: '#3a2222', boots: '#2a1a14', gloves: '#2a1a14', hat: 'horned', hatCol: '#4a3030', torso: 'armor', belt: '#2a1a14', cape: '#2a1418' },
    fps: { skin: SKIN2, top: '#5f6b3a', sleeve: '#6e7a45', fore: '#6e7a45', pants: '#56603a', boots: '#2b2b2b', gloves: '#2b2b2b', hat: 'soldier', hatCol: '#4f5a30', torso: 'vest', vest: '#3e4628' },
    park: { skin: SKIN, top: '#f08a24', sleeve: '#f08a24', fore: '#f08a24', pants: '#2f3a50', boots: '#f4f1ea', gloves: SKIN, hat: 'hood', hatCol: '#f08a24', torso: 'hoodie' },
  };
  // o.hip: absolute hip; o.hand: absolute position of the front hand (hanging); otherwise feet stand on the ground and o.dy lifts
  function puppet(g, x, groundY, p0, o = {}) {
    const p = { ...BASE, ...p0 }, s = o.s || S, j = joints(p), face = o.face || 1, K = o.skin || SKINS.plat;
    const rot = p.rot, c = Math.cos(rot), sn = Math.sin(rot);
    const R = q => [(q[0] * c - q[1] * sn) * s * face, (q[0] * sn + q[1] * c) * s];
    let hx, hy;
    if (o.hand) { const h = R(j.hR); hx = o.hand[0] - h[0]; hy = o.hand[1] - h[1]; }
    else if (o.hip) { hx = o.hip[0]; hy = o.hip[1]; }
    else { const low = Math.max(R(j.fL)[1] + 3 * s, R(j.fR)[1] + 3 * s, R(j.head)[1] + PL.hr * s); hx = x; hy = groundY - low - (o.dy || 0); }
    const LINE = o.ghost ? '#8a4fd6' : '#1c1a2a', LW = o.ghost ? 3.2 : 2.4;
    g.save(); g.translate(hx, hy); g.scale(s * face, s); g.rotate(rot);
    g.lineCap = 'round'; g.lineJoin = 'round';
    const bone = (a, b, w, col) => { g.strokeStyle = LINE; g.lineWidth = w + LW * 2; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); };
    const blob = (pts, col) => { g.fillStyle = col; g.strokeStyle = LINE; g.lineWidth = LW; g.beginPath(); pts.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath(); g.fill(); g.stroke(); };
    const dot = (q, r, col) => { g.fillStyle = col; g.strokeStyle = LINE; g.lineWidth = LW; g.beginPath(); g.arc(q[0], q[1], r, 0, TAU); g.fill(); g.stroke(); };
    const foot = (k, f, a, col) => { const d = [Math.cos(a), -Math.sin(a)], dn = [Math.sin(a), Math.cos(a)]; blob([[f[0] - d[0] * 4 - dn[0] * 3, f[1] - d[1] * 4 - dn[1] * 3], [f[0] + d[0] * 11 - dn[0] * 1, f[1] + d[1] * 11 - dn[1] * 1], [f[0] + d[0] * 11 + dn[0] * 4, f[1] + d[1] * 11 + dn[1] * 4], [f[0] - d[0] * 5 + dn[0] * 4, f[1] - d[1] * 5 + dn[1] * 4]], col); };
    const leg = (hA, kA, k, f, dk) => { const pc = dk ? shade(K.pants, .22) : K.pants; bone(j.hip, k, 12, pc); bone(k, f, 10, pc); foot(k, f, hA + kA, dk ? shade(K.boots, .2) : K.boots); };
    const arm = (e, h, dk) => { const sc = dk ? shade(K.sleeve, .22) : K.sleeve, fc = dk ? shade(K.fore, .22) : K.fore; bone(j.neck, e, 10, sc); bone(e, h, 8, fc); dot(h, 4.6, dk ? shade(K.gloves, .2) : K.gloves); };
    // torso outline points along the hip -> neck axis
    const ax = [j.neck[0] - j.hip[0], j.neck[1] - j.hip[1]], L = Math.hypot(ax[0], ax[1]), u = [ax[0] / L, ax[1] / L], v = [-u[1], u[0]];
    const tp = (t, w) => [j.hip[0] + ax[0] * t + v[0] * w, j.hip[1] + ax[1] * t + v[1] * w];
    // cape behind everything
    if (K.cape) blob([tp(1, -4), tp(1, -10), [j.hip[0] - v[0] * 18 - u[0] * 4 + Math.sin(p.lean) * -6, j.hip[1] - v[1] * 18 + 8], [j.hip[0] - v[0] * 6, j.hip[1] + 10]], K.cape);
    if (K.hat === 'hood') dot([j.head[0] - 6, j.head[1] + 2], 11, shade(K.hatCol, .25));
    leg(p.hl, p.kl, j.kL, j.fL, true); arm(j.eL, j.hL, true);
    if (o.under) o.under(g, j);
    // torso
    blob([tp(-.06, -9), tp(.35, -8), tp(.8, -11), tp(1.04, -7), tp(1.04, 7), tp(.8, 12), tp(.35, 9), tp(-.06, 10)], K.top);
    if (K.torso === 'overalls') { blob([tp(-.06, -9), tp(.55, -8), tp(.55, 9), tp(-.06, 10)], K.pants); g.strokeStyle = K.pants; g.lineWidth = 3; g.beginPath(); g.moveTo(...tp(.55, 6)); g.lineTo(...tp(1, 4)); g.stroke(); dot(tp(.5, 5), 1.8, '#ffd23f'); }
    if (K.torso === 'gi') { g.strokeStyle = shade(K.top, .25); g.lineWidth = 2; g.beginPath(); g.moveTo(...tp(1.02, -3)); g.lineTo(...tp(.45, 8)); g.stroke(); bone(tp(.18, -9), tp(.18, 10), 4, K.belt); bone(tp(.18, 9), tp(.02, 13), 3, K.belt); }
    if (K.torso === 'armor') { blob([tp(.4, -8), tp(.95, -9), tp(.95, 10), tp(.4, 9)], K.plate || K.top); g.strokeStyle = shade(K.top, .3); g.lineWidth = 1.6; [.55, .7, .85].forEach(t => { g.beginPath(); g.moveTo(...tp(t, -8)); g.lineTo(...tp(t, 10)); g.stroke(); }); bone(tp(.2, -9), tp(.2, 10), 4, K.belt); }
    if (K.torso === 'vest') { blob([tp(.3, -8), tp(.98, -8), tp(.98, 9), tp(.3, 10)], K.vest); [.45, .65].forEach(t => blob([tp(t, 6), tp(t + .12, 6), tp(t + .12, 11), tp(t, 11)], shade(K.vest, .2))); bone(tp(.18, -9), tp(.18, 10), 3, '#2b2b2b'); }
    if (K.torso === 'hoodie') { blob([tp(.25, 2), tp(.5, 2), tp(.5, 10), tp(.25, 10)], shade(K.top, .15)); g.strokeStyle = '#fffaf0'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(...tp(.95, 4)); g.lineTo(...tp(.7, 5)); g.stroke(); }
    // head
    g.save(); g.translate(j.head[0], j.head[1]); g.rotate(p.lean + p.nod);
    const hr = PL.hr, H = K.hat;
    if (H === 'helm' || H === 'horned') {
      if (H === 'horned') { blob([[-4, -10], [-14, -24], [-6, -9]], '#e8dcc0'); blob([[4, -11], [10, -26], [9, -9]], '#e8dcc0'); }
      g.fillStyle = K.hatCol; g.strokeStyle = LINE; g.lineWidth = LW; g.beginPath(); g.moveTo(-hr - 1, 4); g.arc(0, 0, hr + 1.5, Math.PI * .95, Math.PI * 2.05); g.lineTo(hr + 3, 9); g.lineTo(-hr + 1, 11); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#1c1a2a'; g.fillRect(1, -3, hr + 2, 3.2); g.fillRect(5, 3, 7, 1.6);
      g.strokeStyle = shade(K.hatCol, .3); g.lineWidth = 2; g.beginPath(); g.moveTo(-2, -hr - 1); g.lineTo(-2, 9); g.stroke();
      if (H === 'helm') blob([[-3, -hr - 1], [-11, -hr - 7], [-14, -hr + 2]], '#c0392b');
    } else {
      dot([0, 0], hr, K.skin);
      g.fillStyle = K.skin; g.strokeStyle = LINE; g.lineWidth = LW; g.beginPath(); g.moveTo(hr - 2, -1); g.lineTo(hr + 3, 2); g.lineTo(hr - 1, 4); g.fill(); g.stroke();
      g.fillStyle = '#1c1a2a'; g.beginPath(); g.ellipse(5.5, -2, 1.6, 2.4, 0, 0, TAU); g.fill();
      if (H === 'cap') { g.fillStyle = K.hair; g.beginPath(); g.arc(-3, 0, hr - 2, Math.PI * .5, Math.PI * 1.1); g.fill(); blob([[-hr, -1], [-hr + 1, -8], [-2, -hr - 2], [hr - 2, -9], [hr + 9, -3], [hr - 1, -3.5], [-hr, -1]], K.hatCol); g.fillStyle = '#fff'; g.beginPath(); g.arc(1, -8, 3, 0, TAU); g.fill(); }
      if (H === 'band') { g.fillStyle = K.hair; g.beginPath(); g.arc(-2, -2, hr, Math.PI * .85, Math.PI * 1.75); g.lineTo(0, -4); g.fill(); bone([-hr + 1, -5], [hr - 1, -6], 4, K.hatCol); bone([-hr + 1, -5], [-hr - 9, 2], 3, K.hatCol); bone([-hr + 1, -5], [-hr - 7, 6], 3, K.hatCol); }
      if (H === 'hair') { g.fillStyle = K.hair; g.strokeStyle = LINE; g.lineWidth = LW; g.beginPath(); g.moveTo(-hr, 2); g.lineTo(-hr - 2, -8); g.lineTo(-6, -hr - 5); g.lineTo(0, -hr - 1); g.lineTo(6, -hr - 4); g.lineTo(hr - 1, -5); g.lineTo(2, -6); g.lineTo(-3, 0); g.closePath(); g.fill(); g.stroke(); }
      if (H === 'soldier') { blob([[-hr - 2, 0], [-hr - 1, -8], [-4, -hr - 3], [6, -hr - 2], [hr + 2, -5], [hr + 4, -3], [-hr - 2, 0]], K.hatCol); g.strokeStyle = '#2b2b2b'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-4, -1); g.lineTo(2, 10); g.stroke(); }
      if (H === 'hood') { g.fillStyle = K.hatCol; g.strokeStyle = LINE; g.lineWidth = LW; g.beginPath(); g.arc(-1, -1, hr + 2.5, Math.PI * .62, Math.PI * 1.9); g.quadraticCurveTo(3, -6, 0, 8); g.closePath(); g.fill(); g.stroke(); }
    }
    g.restore();
    // near side
    leg(p.hr, p.kr, j.kR, j.fR, false);
    if (o.over) o.over(g, j, p);
    arm(j.eR, j.hR, false);
    g.restore();
    const world = q => { const r = R(q); return [hx + r[0], hy + r[1]]; };
    return { world, j, hip: [hx, hy] };
  }
  const KEYS = Object.keys(BASE).concat(['dx', 'dy']);
  function kf(frames, k) {
    let i = 0; while (i < frames.length - 2 && k > frames[i + 1][0]) i++;
    const [k0, a] = frames[i], [k1, b] = frames[Math.min(i + 1, frames.length - 1)];
    const u = k1 > k0 ? ease(clamp((k - k0) / (k1 - k0))) : 1, out = {};
    KEYS.forEach(key => { const d = BASE[key] ?? 0; out[key] = lerp(a[key] ?? d, b[key] ?? d, u); });
    return out;
  }
  function runPose(ph, amp = 1, arms = true) {
    const s = Math.sin(ph), c = Math.cos(ph);
    const p = { lean: .22 * amp, hl: .75 * s * amp, hr: -.75 * s * amp, kl: -(.2 + 1.1 * Math.max(0, c)) * amp, kr: -(.2 + 1.1 * Math.max(0, -c)) * amp };
    if (arms) Object.assign(p, { sl: -.8 * s * amp, el: 1.3, sr: .8 * s * amp, er: 1.3 });
    return p;
  }
  const walkPose = ph => ({ ...runPose(ph, .55), lean: .04, el: .4, er: .4 });
  const breathe = t => ({ sl: .12 + .03 * Math.sin(t * 2), sr: -.12 - .03 * Math.sin(t * 2) });
  const GUARD = { hl: .35, hr: -.3, kl: -.35, kr: -.25, sl: .9, el: 2.1, sr: 1.1, er: 2.0, lean: .08 };
  const AIM = { sl: 1.35, el: .25, sr: 1.5, er: .05, hl: .2, hr: -.2, kl: -.15, kr: -.1 };
  const LOW = { sl: .7, el: .9, sr: .8, er: .8 };
  const SOULS_IDLE = { sr: .5, er: .9, sl: .3, el: .8, hl: .25, hr: -.25, kl: -.2, kr: -.2, lean: .1 };
  const SHIELD_UP = { ...SOULS_IDLE, sl: 1.35, el: 1.55, sr: .4, er: 1.0, lean: .05, hl: .35, kl: -.35, hr: -.3, kr: -.25 };
  const TUCK = { hl: 1.2, kl: -2.2, hr: 1.0, kr: -2.0, sl: 1.2, el: 1.2, sr: 1.2, er: 1.2, lean: .5 };

  /* ---------- props ---------- */
  function sword(g, j, p) { const a = p.sr + p.er, h = j.hR; g.strokeStyle = '#1c1a2a'; g.lineWidth = 7; g.beginPath(); g.moveTo(h[0], h[1]); g.lineTo(h[0] + Math.sin(a + 1.5) * 48, h[1] + Math.cos(a + 1.5) * 48); g.stroke(); g.strokeStyle = '#8e99ad'; g.lineWidth = 4; g.beginPath(); g.moveTo(h[0], h[1]); g.lineTo(h[0] + Math.sin(a + 1.5) * 48, h[1] + Math.cos(a + 1.5) * 48); g.stroke(); g.strokeStyle = '#8b6136'; g.lineWidth = 5; g.beginPath(); g.moveTo(h[0] - Math.sin(a + 1.5) * 7, h[1] - Math.cos(a + 1.5) * 7); g.lineTo(h[0] + Math.sin(a + 1.5) * 4, h[1] + Math.cos(a + 1.5) * 4); g.stroke(); }
  function rifle(g, j, p) { const a = p.sr + p.er, h = j.hR, dx = Math.sin(a), dy = Math.cos(a); g.strokeStyle = '#2b2f3a'; g.lineWidth = 6; g.lineCap = 'butt'; g.beginPath(); g.moveTo(h[0] - dx * 22, h[1] - dy * 22); g.lineTo(h[0] + dx * 30, h[1] + dy * 30); g.stroke(); g.lineWidth = 3; g.beginPath(); g.moveTo(h[0] + dx * 30, h[1] + dy * 30); g.lineTo(h[0] + dx * 40, h[1] + dy * 40); g.stroke(); g.lineCap = 'round'; }
  function shield(g, j, p) { const a = p.sl + p.el, h = j.hL, ang = Math.atan2(Math.cos(a), Math.sin(a)); g.save(); g.translate(h[0] + Math.cos(a) * 3, h[1] - Math.sin(a) * 3 + 0); g.rotate(ang); g.fillStyle = '#7a5530'; g.strokeStyle = '#c9d3e6'; g.lineWidth = 2.5; g.beginPath(); g.ellipse(0, 0, 20, 8, 0, 0, TAU); g.fill(); g.stroke(); g.fillStyle = '#c9d3e6'; g.beginPath(); g.arc(0, 0, 2.5, 0, TAU); g.fill(); g.restore(); }
  function flask(g, j, p) { const a = p.sl + p.el, h = j.hL; g.save(); g.translate(h[0], h[1]); g.rotate(-a + Math.PI * .5); g.fillStyle = '#f08a24'; g.strokeStyle = '#8b5a1e'; g.lineWidth = 1.5; g.beginPath(); g.arc(0, 0, 6.5, 0, TAU); g.fill(); g.stroke(); g.fillStyle = '#8b5a1e'; g.fillRect(-2, -13, 4, 7); g.fillStyle = '#ffe0a8'; g.beginPath(); g.arc(-2, -2, 2, 0, TAU); g.fill(); g.restore(); }
  function health(g, x, y, v, flasks) { g.fillStyle = 'rgba(21,32,68,.85)'; rr(g, x - 70, y, 140, 14, 7); g.fill(); g.fillStyle = '#d2453a'; rr(g, x - 68, y + 2, 136 * clamp(v), 10, 5); g.fill(); text(g, 'health', x - 76, y + 12, 12, C.muted, 700, 'right'); text(g, `estus ×${flasks}`, x + 78, y + 12, 12, '#b5651d', 700, 'left'); }
  const muzzle = (P, p) => { const a = p.sr + p.er, h = P.j.hR; return P.world([h[0] + Math.sin(a) * 40, h[1] + Math.cos(a) * 40]); };
  function dummy(g, x, pose, o = {}) { return puppet(g, x, GY, pose, { face: -1, skin: SKINS.fightFoe, ...o }); }
  function target(g, x, y, r = 34) { ['#e5322d', '#fffaf0', '#e5322d', '#fffaf0', '#e5322d'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(x, y, r * (1 - i * .19), 0, TAU); g.fill(); }); g.strokeStyle = '#8b6136'; g.lineWidth = 5; g.beginPath(); g.moveTo(x, y + r); g.lineTo(x, GY); g.stroke(); }
  function crate(g, x, w, h) { const im = T.prop('crate'); if (im) { g.drawImage(im, x - w * .125, GY - h - h * .125, w / .8, h / .8); return; } g.fillStyle = '#b07a4a'; g.strokeStyle = '#6e4a2a'; g.lineWidth = 3; g.fillRect(x, GY - h, w, h); g.strokeRect(x, GY - h, w, h); g.beginPath(); g.moveTo(x, GY - h); g.lineTo(x + w, GY); g.moveTo(x + w, GY - h); g.lineTo(x, GY); g.stroke(); }
  function wallBlock(g, x, w, h, col = '#8b8fa8') { g.fillStyle = col; g.strokeStyle = '#4a4f6a'; g.lineWidth = 3; g.fillRect(x, GY - h, w, h); g.strokeRect(x, GY - h, w, h); g.strokeStyle = 'rgba(74,79,106,.35)'; g.lineWidth = 2; for (let yy = GY - h + 26; yy < GY; yy += 26) { g.beginPath(); g.moveTo(x, yy); g.lineTo(x + w, yy); g.stroke(); } }
  function spark(g, x, y, r, a, col = '#ffb951') { if (a <= 0) return; g.save(); g.globalAlpha = clamp(a); g.strokeStyle = col; g.lineWidth = 4; for (let i = 0; i < 8; i++) { const an = i / 8 * TAU; g.beginPath(); g.moveTo(x + Math.cos(an) * r * .35, y + Math.sin(an) * r * .35); g.lineTo(x + Math.cos(an) * r, y + Math.sin(an) * r); g.stroke(); } g.restore(); T.flash(x, y, r * .7, a); }
  function stamina(g, x, y, v, cost) { g.fillStyle = 'rgba(21,32,68,.85)'; rr(g, x - 70, y, 140, 14, 7); g.fill(); g.fillStyle = '#2fae63'; rr(g, x - 68, y + 2, 136 * clamp(v), 10, 5); g.fill(); if (cost > 0) T.popText(`-${Math.round(cost * 100)} stamina`, x + 178, y + 10, '#1a8a4c', 1); text(g, 'stamina', x - 76, y + 12, 12, C.muted, 700, 'right'); }

  /* ---------- the verbs: each returns the puppet pose and draws its own props ---------- */
  // v(k, t, g) -> { pose, dy?, dx?, hip?, hand?, props(g, P), fore(g, P), scroll? }
  const GENRES = {
    plat: { name: 'Platformer', line: 'Few verbs, each one tuned to the level: run, jump, attack.', idle: t => breathe(t),
      verbs: [
        { name: 'Run', dur: 1.3, about: 'Run: the base speed every gap and enemy in the level is measured against.', v: (k, t) => ({ pose: runPose(t * 12), scroll: 380 }) },
        { name: 'Jump', dur: 1.1, about: 'Jump: a crouch, a committed arc and a landing. Height and air time define which gaps are fair.', v: k => ({ pose: kf([[0, {}], [.12, { hl: .7, kl: -1.4, hr: .6, kr: -1.3, lean: .2, sl: -.4, sr: -.4 }], [.25, { sl: 2.9, el: .2, sr: 2.7, er: .3, hl: .1, kr: -.1 }], [.5, { ...TUCK, sl: 2.4, sr: 2.2 }], [.85, { hl: .3, kl: -.4, hr: .2, kr: -.3, sl: 1, sr: 1 }], [.95, { hl: .6, kl: -1.2, hr: .5, kr: -1.1 }], [1, {}]], k), dy: bump(k, .18, .9) * 140 }) },
        { name: 'Attack', dur: 1.5, about: 'Attack: in a platformer the attack is often the jump itself. Land on an enemy and it is gone.', v: k => {
          const out = k < .5 ? ease(seg01(k, .05, .5)) : 1 - ease(seg01(k, .55, 1)), dx = out * 250;
          const u1 = seg01(k, .05, .5), u2 = seg01(k, .5, .95);
          const dy = k < .5 ? lerp(0, 40, u1) + Math.sin(u1 * Math.PI) * 120 : lerp(40, 0, u2) + Math.sin(u2 * Math.PI) * 80;
          const pose = k < .05 || k > .95 ? {} : { ...TUCK, hl: .5, kl: -1, hr: .3, kr: -.8, sl: 2.2, sr: 2.0 };
          return { pose, dx, dy, props: g => { const flat = k > .48 && k < .9; if (flat) sprite(g, GOOMBA_FLAT, 525, GY - 26, 52, 26); else if (k <= .48 || k >= .9) { g.save(); g.globalAlpha = k >= .9 ? seg01(k, .9, 1) : 1; sprite(g, GOOMBA, 525, GY - 52, 52, 52); g.restore(); } if (k > .48 && k < .7) T.popText('stomp!', 550, GY - 120, C.goldInk, 1); } };
        } },
      ], props: (g, t, playing) => { if (!playing || playing.name !== 'Attack') sprite(g, GOOMBA, 525, GY - 52, 52, 52); } },

    fight: { name: 'Fighting game', line: 'Every verb is a commitment the opponent can read and punish.', idle: t => ({ ...GUARD, sl: GUARD.sl + .05 * Math.sin(t * 4), hl: GUARD.hl + .03 * Math.sin(t * 4) }),
      verbs: [
        { name: 'Walk', dur: 1.4, about: 'Walk: slow, careful spacing. Every step changes which attacks can reach.', v: (k, t) => ({ pose: { ...walkPose(k * 4 * TAU / 2), sl: GUARD.sl, el: GUARD.el, sr: GUARD.sr, er: GUARD.er }, dx: bump(k, 0, 1) * 60 }) },
        { name: 'Fast', dur: .75, about: 'Fast attack: little startup and little reward. It interrupts slower moves.', v: k => ({ pose: kf([[0, GUARD], [.18, { ...GUARD, sr: 1.65, er: .02, lean: .2 }], [.45, { ...GUARD, sr: 1.65, er: .02, lean: .2 }], [1, GUARD]], k), fore: (g, P) => { if (k > .16 && k < .42) spark(g, P.world(P.j.hR)[0] + 8, P.world(P.j.hR)[1], 22, 1); }, hit: k > .16 && k < .5 ? 8 : 0 }) },
        { name: 'Heavy', dur: 1.3, about: 'Heavy attack: a long wind-up the opponent can see coming, and a big payoff if it lands.', v: k => ({ pose: kf([[0, GUARD], [.35, { ...GUARD, lean: -.25, hr: 1.4, kr: -2.2, hl: -.1, kl: -.3 }], [.48, { ...GUARD, lean: -.35, hr: 1.75, kr: -.05, hl: -.15, kl: -.2 }], [.62, { ...GUARD, lean: -.35, hr: 1.75, kr: -.05, hl: -.15, kl: -.2 }], [1, GUARD]], k), fore: (g, P) => { if (k > .3 && k < .45) T.popText('wind-up', P.hip[0], P.hip[1] - 160, C.muted, 1); if (k > .46 && k < .64) spark(g, P.world(P.j.fR)[0] + 10, P.world(P.j.fR)[1], 40, 1); }, hit: k > .46 ? 40 * bump(k, .46, 1) : 0 }) },
        { name: 'Block', dur: 1.2, about: 'Block: hold back to take the hit on your guard. Safe, but you are pushed out of range.', v: k => ({ pose: { ...GUARD, sl: 1.9, el: 1.5, sr: 2.0, er: 1.4, lean: -.08 }, dx: -14 * ease(seg01(k, .4, .55)) * (1 - seg01(k, .8, 1)), oppPunch: bump(k, .2, .6), fore: (g, P) => { if (k > .38 && k < .56) { const h = P.world(P.j.hR); spark(g, h[0] + 12, h[1], 30, 1, '#57b6ff'); T.popText('blocked', h[0] + 10, h[1] - 50, '#1f6c9a', 1); } } }) },
        { name: 'Grab', dur: 1.4, about: 'Grab: beats a blocking opponent, but whiffs badly if they are out of reach.', v: k => ({ pose: kf([[0, GUARD], [.22, { lean: .35, sl: 1.6, el: .1, sr: 1.7, er: .05, hl: .5, kl: -.5, hr: -.4, kr: -.2 }], [.45, { lean: .1, sl: 1.9, el: 1.2, sr: 2.0, er: 1.1, hl: .4, kl: -.4, hr: -.4, kr: -.2 }], [.7, { lean: -.2, sl: .4, el: 1.2, sr: .5, er: 1.1 }], [1, GUARD]], k), throwK: seg01(k, .3, .8) }) },
        { name: 'Jump', dur: 1.0, about: 'Jump: gets over low attacks and moves the fight to the air, but it is committed until you land.', v: k => ({ pose: kf([[0, GUARD], [.1, { ...GUARD, kl: -1.2, kr: -1.1, hl: .7, hr: .4 }], [.3, TUCK], [.8, TUCK], [.92, { ...GUARD, kl: -1, kr: -.9, hl: .6 }], [1, GUARD]], k), dy: bump(k, .1, .92) * 150 }) },
      ], props: () => {} },

    souls: { name: 'Souls-like', line: 'Committed verbs: once one starts, the animation owns the body, and stamina pays for most of them.', idle: t => ({ ...breathe(t), ...SOULS_IDLE }),
      verbs: [
        { name: 'Attack', dur: 1.5, about: 'Attack: a committed swing. The animation carries the body forward and cannot be cancelled once it starts, and every swing costs stamina.', v: k => ({ pose: kf([[0, SOULS_IDLE], [.3, { lean: -.2, sr: 2.9, er: .3, sl: .9, el: 1.4, hl: .3, hr: -.4, kl: -.3, kr: -.2 }], [.55, { lean: .55, sr: .9, er: .1, sl: .5, el: 1.2, hl: .9, kl: -.9, hr: -.7, kr: -.2 }], [.8, { lean: .45, sr: .9, er: .1, sl: .5, el: 1.2, hl: .9, kl: -.9, hr: -.7, kr: -.2 }], [1, SOULS_IDLE]], k), dx: 110 * ease(seg01(k, .32, .58)) * (1 - ease(seg01(k, .82, 1))), cost: k > .3 ? .3 : 0, enemyHit: bump(k, .5, .8), fore: (g, P) => {
          if (k > .32 && k < .82) { g.strokeStyle = 'rgba(229,50,45,.5)'; g.lineWidth = 3; g.setLineDash([8, 6]); g.beginPath(); g.moveTo(PX, GY + 14); g.lineTo(PX + 110 * ease(seg01(k, .32, .58)), GY + 14); g.stroke(); g.setLineDash([]); T.label('the swing carries the body: no steering', PX + 60, GY + 34, 'center', C.red, 13); }
          if (k > .5 && k < .62) spark(g, P.world(P.j.hR)[0] + 30, P.world(P.j.hR)[1] + 20, 34, 1); } }) },
        { name: 'Dodge', dur: 1.2, about: 'Dodge: a roll with a few frames where hits pass through. It costs a big chunk of stamina.', v: k => { const r = ease(seg01(k, .1, .75)); return { pose: k < .08 || k > .85 ? SOULS_IDLE : { ...TUCK, rot: r * TAU }, dx: 170 * r * (1 - ease(seg01(k, .8, 1))), cost: k > .1 ? .35 : 0, iframe: k > .18 && k < .55, enemySwing: bump(k, .05, .5) }; } },
        { name: 'Block', dur: 1.4, about: 'Block: raise the shield and the blow lands on it. No damage, but every blocked hit drains stamina, and an empty bar breaks the guard.', v: k => ({ pose: kf([[0, SOULS_IDLE], [.2, SHIELD_UP], [.75, SHIELD_UP], [1, SOULS_IDLE]], k), dx: -18 * ease(seg01(k, .4, .52)) * (1 - ease(seg01(k, .78, 1))), enemySwing: bump(k, .15, .6), cost: k > .42 ? .3 : 0, fore: (g, P) => { if (k > .38 && k < .54) { const h = P.world(P.j.hL); spark(g, h[0] + 14, h[1], 30, 1, '#57b6ff'); T.popText('blocked', h[0] + 10, h[1] - 50, '#1f6c9a', 1); } if (k > .45 && k < .8) T.label('the hit is paid in stamina', PX + 10, GY + 34, 'center', '#1a8a4c', 13); } }) },
        { name: 'Parry', dur: 1.6, about: 'Parry: flick the shield out just as the blow lands. Too early or too late and you take the hit; on time and the enemy staggers open for a riposte.', v: k => ({ pose: kf([[0, SOULS_IDLE], [.26, { ...SOULS_IDLE, sl: .5, el: 2.3, lean: .02 }], [.38, { ...SOULS_IDLE, sl: 2.0, el: .5, lean: .22, hl: .4, kl: -.4 }], [.6, { ...SOULS_IDLE, sl: 1.8, el: .6, lean: .18, hl: .4, kl: -.4 }], [1, SOULS_IDLE]], k), enemySwing: k < .4 ? bump(k, .15, .65) : 0, enemyStagger: k < .4 ? 0 : 1 - ease(seg01(k, .78, 1)), cost: k > .3 ? .1 : 0, fore: (g, P) => {
          if (k > .2 && k < .4) { const w = Math.max(110, P.hip[0]); g.fillStyle = 'rgba(255,185,81,.25)'; rr(g, w - 70, 140, 140, 14, 7); g.fill(); g.fillStyle = C.gold; rr(g, w - 70 + 140 * .55, 140, 140 * .15, 14, 7); g.fill(); text(g, 'parry window', w - 76, 152, 12, C.muted, 700, 'right'); }
          if (k > .38 && k < .52) { const h = P.world(P.j.hL); spark(g, h[0] + 16, h[1], 40, 1); T.popText('parried!', h[0] + 20, h[1] - 60, C.goldInk, 1); }
          if (k > .5 && k < .82) T.label('riposte opening', 640, GY - 250, 'center', C.red, 14); } }) },
        { name: 'Estus', dur: 2.0, about: 'Estus: drink a flask to heal. It costs no stamina, but the long sip roots you in place and the flasks are limited until you rest.', v: k => ({ pose: kf([[0, SOULS_IDLE], [.18, { ...SOULS_IDLE, sl: .6, el: 1.2 }], [.32, { ...SOULS_IDLE, sl: 1.15, el: 2.45, nod: -.3, lean: -.05 }], [.7, { ...SOULS_IDLE, sl: 1.15, el: 2.45, nod: -.3, lean: -.05 }], [.85, { ...SOULS_IDLE, sl: .6, el: 1.2 }], [1, SOULS_IDLE]], k), flask: true, hp: lerp(.35, .95, ease(seg01(k, .38, .72))), flasks: k > .35 ? 4 : 5, fore: (g, P) => {
          if (k > .38 && k < .72) { g.save(); g.globalAlpha = .16 * bump(k, .38, .72); g.fillStyle = '#ffb951'; g.beginPath(); g.arc(P.hip[0], P.hip[1] - 40, 80, 0, TAU); g.fill(); g.restore(); if (k < .6) T.popText('+HP', P.hip[0] + 40, P.hip[1] - 150, '#c0392b', 1); }
          if (k > .3 && k < .8) T.label('rooted while you drink', PX, GY + 34, 'center', C.red, 13); } }) },
      ], props: () => {} },

    fps: { name: 'FPS', line: 'The body mostly carries a camera. The verbs are about the gun and cover.', idle: t => ({ ...LOW, sl: LOW.sl + .02 * Math.sin(t * 2) }),
      verbs: [
        { name: 'Run', dur: 1.3, about: 'Run: move between fights. In many shooters you cannot shoot while sprinting.', v: (k, t) => ({ pose: { ...runPose(t * 12, 1, false), ...LOW, sl: .5, sr: .6 }, scroll: 360 }) },
        { name: 'Shoot', dur: 1.0, about: 'Shoot: hip fire. Fast to start, with a wide spread.', v: k => ({ pose: { ...AIM, sl: 1.25, el: .45, sr: 1.4, er: .2 }, shots: [.2, .45, .7].filter(s => k > s && k < s + .12), spread: 22 }) },
        { name: 'ADS', dur: 1.5, about: 'ADS (aim down sights): slower to bring up and slower to move, but far more precise.', v: k => ({ pose: kf([[0, LOW], [.3, { ...AIM, nod: .1 }], [1, { ...AIM, nod: .1 }]], k), shots: [.62, .85].filter(s => k > s && k < s + .1), spread: 3, scope: seg01(k, .2, .4) }) },
        { name: 'Grenade', dur: 1.5, about: 'Grenade: an arc instead of a line, for targets you cannot see.', v: k => ({ pose: kf([[0, LOW], [.25, { ...LOW, sr: -1.0, er: 1.2, lean: -.15, sl: 1.4 }], [.4, { ...LOW, sr: 2.5, er: .2, lean: .25, sl: .6 }], [.55, { ...LOW, sr: 1.4, er: .2, lean: .2 }], [1, LOW]], k), grenade: seg01(k, .36, .85), boom: bump(k, .84, 1) }) },
        { name: 'Take cover', dur: 1.6, about: 'Take cover: step behind something solid. The enemy’s shots hit the crate instead.', v: k => ({ pose: kf([[0, LOW], [.3, { ...LOW, hl: 1.6, kl: -2.4, hr: 1.2, kr: -2.6, lean: .35 }], [.82, { ...LOW, hl: 1.6, kl: -2.4, hr: 1.2, kr: -2.6, lean: .35 }], [1, LOW]], k), dx: 52 * ease(seg01(k, 0, .3)) * (1 - ease(seg01(k, .82, 1))), incoming: k > .35 && k < .82 }) },
      ], props: (g) => { target(g, 860, 250); crate(g, 438, 66, 86); } },

    park: { name: 'Parkour', line: 'The verbs read the world: walls, ledges, bars and gaps.', idle: t => breathe(t),
      verbs: [
        { name: 'Run', dur: 1.3, about: 'Run: momentum is the resource. Every other verb wants speed going in.', v: (k, t) => ({ pose: runPose(t * 13, 1.1), scroll: 460 }) },
        { name: 'Climb', dur: 1.8, about: 'Climb: hand over hand up a wall that the level marks as climbable.', v: (k, t) => { const ph = k * 4 * Math.PI, up = ease(seg01(k, .1, .85)); return { pose: k < .08 ? {} : { lean: .15, sl: 2.7 + .35 * Math.sin(ph), el: .2, sr: 2.7 - .35 * Math.sin(ph), er: .2, hl: .9 + .4 * Math.sin(ph), kl: -1.6, hr: .9 - .4 * Math.sin(ph), kr: -1.6 }, hip: k < .08 ? null : [PX + 44, GY - 70 - up * 170], props: g => wallBlock(g, PX + 76, 140, 300) }; } },
        { name: 'Mantle', dur: 1.5, about: 'Mantle: hands on the ledge, body up and over. The game snaps you to the edge so it always looks clean.', v: k => ({ pose: kf([[0, {}], [.2, runPose(2)], [.4, { lean: .7, sl: 2.2, el: .4, sr: 2.3, er: .3, hl: 1.2, kl: -1.8, hr: .9, kr: -1.9 }], [.6, { lean: .5, sl: .2, el: .4, sr: .3, er: .3, ...TUCK, sl: .2, sr: .3 }], [.8, { hl: .3, kl: -.6, hr: .2, kr: -.5 }], [1, {}]], k), dx: 260 * ease(seg01(k, .05, .8)) * (1 - seg01(k, .92, 1)), dy: k < .3 ? 0 : k < .8 ? bump(k, .3, .8) * 70 + (k < .55 ? seg01(k, .3, .4) * 60 : 0) : 0, props: g => wallBlock(g, PX + 120, 80, 90, '#9a8662') }) },
        { name: 'Swing', dur: 1.9, about: 'Swing: catch the bar and pump. Release at the right moment to carry the momentum forward.', v: (k, t) => {
          const BAR = [PX + 14, 132]; const props = g => { g.strokeStyle = '#4a4f6a'; g.lineWidth = 8; g.beginPath(); g.moveTo(PX - 120, BAR[1]); g.lineTo(PX + 160, BAR[1]); g.stroke(); [PX - 120, PX + 160].forEach(x => { g.lineWidth = 6; g.beginPath(); g.moveTo(x, BAR[1]); g.lineTo(x, GY); g.stroke(); }); };
          const HANG = { sl: Math.PI, el: 0, sr: Math.PI, er: 0, hl: .15, kl: -.3, hr: .05, kr: -.2 };
          if (k < .12 || k > .9) return { pose: kf([[0, {}], [.12, HANG]], k < .5 ? k : (1 - k) / .1 * .12), dy: k < .12 ? seg01(k, 0, .12) * 22 : 22 * (1 - seg01(k, .9, 1)), props };
          const sw = seg01(k, .12, .9), th = .95 * Math.sin(sw * 3 * TAU) * Math.sin(sw * Math.PI);
          return { pose: { ...HANG, rot: -th, hl: .15 + .5 * Math.max(0, Math.sin(sw * 3 * TAU)), kl: -.6 * Math.max(0, -Math.sin(sw * 3 * TAU)) - .2 }, hand: BAR, props };
        } },
        { name: 'Slide', dur: 1.5, about: 'Slide: drop low at speed to pass under an obstacle without losing momentum.', v: (k, t) => { const SL = { lean: -1.0, hl: 1.55, kl: -.05, hr: 1.25, kr: -.5, sl: -.6, el: .5, sr: -.3, er: .4, nod: .5 }; const px = lerp(1000, PX - 300, seg01(k, 0, 1)); return { pose: kf([[0, runPose(0)], [.3, SL], [.72, SL], [1, runPose(2)]], k), scroll: 460, props: g => { g.fillStyle = '#5b6e8a'; g.strokeStyle = '#2f3a50'; g.lineWidth = 3; g.fillRect(px, GY - 175, 46, 105); g.strokeRect(px, GY - 175, 46, 105); g.fillRect(px + 16, 60, 14, GY - 235); }, fore: (g, P) => { if (k > .3 && k < .72) { g.fillStyle = 'rgba(160,140,110,.45)'; for (let i = 0; i < 5; i++) { const q = ((t * 5 + i / 5) % 1); g.beginPath(); g.arc(P.hip[0] - 20 - q * 120, GY - 6 - q * 14, 9 - q * 6, 0, TAU); g.fill(); } } } }; } },
      ], props: () => {} },
  };
  const ORDER = ['plat', 'fight', 'souls', 'fps', 'park'];

  /* ---------- the walk-through schedule ---------- */
  const GAP = .45, INTRO = .9, SCHED = []; let tt = 0;
  ORDER.forEach(gk => { tt += INTRO; GENRES[gk].verbs.forEach((v, i) => { SCHED.push({ g: gk, i, at: tt }); tt += v.dur + GAP; }); });
  const DUR = tt;
  const genreAt = t => { let g = ORDER[0]; let acc = 0; for (const gk of ORDER) { if (t >= acc) g = gk; acc += INTRO + GENRES[gk].verbs.reduce((s, v) => s + v.dur + GAP, 0); } return g; };

  /* ---------- drawing ---------- */
  function draw(g, gk, vi, k, t) {
    const G = GENRES[gk], V = vi >= 0 ? G.verbs[vi] : null, playing = V && k >= 0 && k <= 1 ? V : null;
    T.use(g); g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,252,244,.9)'; rr(g, 0, 0, W, H, 14); g.fill();
    const r = playing ? V.v(k, t, g) : { pose: G.idle(t) };
    // backdrop and scrolling ground
    g.save(); rr(g, 8, 8, W - 16, GY + 40, 12); g.clip();
    g.fillStyle = { plat: '#cfe7f5', fight: '#efe2d0', souls: '#d9d5cf', fps: '#dfe6e8', park: '#e3e8f2' }[gk]; g.fillRect(0, 0, W, GY + 50);
    const off = (r.scroll || 0) * (playing ? k * V.dur : 0);
    g.fillStyle = { plat: '#7cba5a', fight: '#b9a385', souls: '#8c8579', fps: '#9aa5a8', park: '#a3a9b8' }[gk]; g.fillRect(0, GY, W, 60);
    g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 3; for (let i = 0; i < 16; i++) { const x = ((i * 80 - off) % 1280 + 1280) % 1280 - 120; g.beginPath(); g.moveTo(x, GY + 14); g.lineTo(x + 36, GY + 14); g.stroke(); }
    G.props(g, t, playing);
    if (r.props) r.props(g);
    // opponents
    if (gk === 'fight') {
      const hit = r.hit || 0, th = r.throwK || 0, punch = r.oppPunch || 0;
      let opPose = { ...GUARD }, opX = 560 + hit, rot = 0, dy = 0;
      if (punch) opPose = { ...GUARD, sr: lerp(GUARD.sr, 1.65, punch), er: lerp(GUARD.er, .02, punch), lean: .2 * punch };
      if (th > 0 && th < 1) { const q = ease(th); opX = lerp(530, 760, q); rot = -q * Math.PI * .9; dy = Math.sin(q * Math.PI) * 90; }
      if (th >= 1) opX = 560 + 200 * (1 - ease(seg01(k, .8, 1)));
      dummy(g, opX, { ...opPose, rot: -rot }, { dy });
    }
    if (gk === 'souls') {
      const sw = r.enemySwing || 0, sg = r.enemyStagger || 0, eh = r.enemyHit || 0;
      const ep = { lean: -.1 + .4 * sw - .25 * eh, sr: lerp(.6, 2.8, bump(sw, 0, .7)) - 1.6 * clamp((sw - .6) / .4), er: .3, sl: .3, el: .5, hl: .3, hr: -.3, kl: -.3, kr: -.3 };
      const STAG = { lean: -.45, sr: 3.0, er: .6, sl: 2.2, el: .8, hl: -.2, kl: -.2, hr: .5, kr: -.6 };
      if (sg > 0) Object.keys(STAG).forEach(key => { ep[key] = lerp(ep[key], STAG[key], sg); });
      puppet(g, 640 + 30 * sg + 12 * eh, GY, ep, { face: -1, skin: SKINS.soulsFoe, s: 2.3, over: (g2, j, p) => sword(g2, j, p) });
    }
    if (gk === 'fps' && r.incoming) { for (let i = 0; i < 3; i++) { const q = ((t * 3 + i / 3) % 1); const x = lerp(1000, 506, q); g.strokeStyle = 'rgba(229,50,45,.8)'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, GY - 60 - i * 8); g.lineTo(x + 30, GY - 60 - i * 8); g.stroke(); if (q > .9) spark(g, 506, GY - 60 - i * 8, 16, 1); } }
    // the puppet
    const over = gk === 'fps' ? rifle : gk === 'souls' ? (g2, j, p) => { sword(g2, j, p); (r.flask ? flask : shield)(g2, j, p); } : null;
    const P = puppet(g, PX + (r.dx || 0), GY, r.pose, { dy: r.dy || 0, hip: r.hip || undefined, hand: r.hand, over, ghost: r.iframe, skin: SKINS[gk] });
    if (r.iframe) T.label('i-frames: hits pass through', P.hip[0], P.hip[1] - 120, 'center', '#8a4fd6', 13);
    if (gk === 'fps' && r.shots) {
      const m = muzzle(P, r.pose = { ...BASE, ...r.pose });
      r.shots.forEach((s, i) => { const dev = Math.sin(s * 91) * r.spread; T.tracer(m[0], m[1], 860, 250 + dev, 1, C.gold, 3); T.flash(m[0], m[1], 16, 1); g.fillStyle = '#2b2f3a'; g.beginPath(); g.arc(860 + Math.cos(s * 50) * 4, 250 + dev, 4, 0, TAU); g.fill(); });
      if (r.spread > 10) T.label('hip fire: wide spread', 700, 160, 'center', C.muted, 13);
    }
    if (gk === 'fps' && r.scope > 0) {
      const sx = 860, sy = 110, R = 64 * r.scope;
      g.save(); g.beginPath(); g.arc(sx, sy, R, 0, TAU); g.fillStyle = '#e8eef0'; g.fill(); g.clip();
      g.translate(sx, sy); g.scale(2.4, 2.4); g.translate(-860, -250); target(g, 860, 250); g.restore();
      g.strokeStyle = '#152044'; g.lineWidth = 3; g.beginPath(); g.arc(sx, sy, R, 0, TAU); g.stroke();
      g.lineWidth = 1.5; g.beginPath(); g.moveTo(sx - R, sy); g.lineTo(sx + R, sy); g.moveTo(sx, sy - R); g.lineTo(sx, sy + R); g.stroke();
      if (r.scope >= 1) T.label('aim down sights: tight spread', sx, sy + R + 18, 'center', C.ink, 13);
    }
    if (gk === 'fps' && r.grenade > 0 && r.grenade < 1) { const q = r.grenade, x = lerp(P.hip[0] + 20, 860, q), y = lerp(P.hip[1] - 100, 380, q) - Math.sin(q * Math.PI) * 170; g.fillStyle = '#3f5a2a'; g.beginPath(); g.arc(x, y, 8, 0, TAU); g.fill(); }
    if (gk === 'fps' && r.boom > 0) { spark(g, 860, 380, 70, r.boom, '#ff7a2a'); T.flash(860, 370, 80, r.boom); }
    if (r.fore) r.fore(g, P);
    if (gk === 'souls') { const cost = r.cost || 0; health(g, Math.max(110, P.hip[0]), 88, r.hp ?? .55, r.flasks ?? 5); stamina(g, Math.max(110, P.hip[0]), 112, 1 - cost, playing && cost > 0 && k < .9 ? cost : 0); }
    g.restore();
    // title
    T.label(G.name, 24, 30, 'left', '#fff', 17, C.navy);
    text(g, G.line, 24, 66, 16, C.ink, 600);
    // the action bar
    const n = G.verbs.length, bw = Math.min(160, (W - 40 - (n - 1) * 10) / n), x0 = W / 2 - (n * bw + (n - 1) * 10) / 2, by = GY + 64;
    G.verbs.forEach((v, i) => {
      const x = x0 + i * (bw + 10), on = i === vi && playing;
      g.fillStyle = on ? C.navy : '#152044cc'; rr(g, x, by, bw, 74, 10); g.fill();
      if (on) { g.fillStyle = 'rgba(255,185,81,.35)'; rr(g, x, by, bw * clamp(k), 74, 10); g.fill(); g.strokeStyle = C.gold; g.lineWidth = 3; rr(g, x, by, bw, 74, 10); g.stroke(); }
      g.fillStyle = on ? C.gold : '#fffaf0'; rr(g, x + 10, by + 10, 26, 26, 6); g.fill();
      text(g, String(i + 1), x + 23, by + 29, 16, C.navy, 800, 'center', 'Montserrat');
      text(g, v.name, x + bw / 2, by + 60, v.name.length > 9 ? 16 : 18, '#fffaf0', 700, 'center', 'Montserrat');
    });
  }

  /* ---------- wiring ---------- */
  let scene;
  canvasDemo('genre', (s, cv, g) => {
    const st = { t: 0, held: false, tour: true, g: 'plat', vi: -1, at: -99, key: '' };
    const tourBtn = $(s, '.ca-tour');
    const free = () => { st.held = false; if (!st.tour) return; st.tour = false; tourBtn.classList.remove('on'); };
    const play = i => { free(); if (i >= GENRES[st.g].verbs.length) return; st.vi = i; st.at = st.t; };
    function buttons() { say($(s, '.ca-verbs'), GENRES[st.g].verbs.map((v, i) => `<button class="btn" data-v="${i}"><b>${i + 1}</b>${v.name}</button>`).join('')); $$(s, '.ca-verbs .btn').forEach(b => b.onclick = () => play(+b.dataset.v)); }
    $$(s, '.ca-genre .btn').forEach(b => b.onclick = () => { free(); st.g = b.dataset.g; st.vi = -1; buttons(); st.key = ''; });
    addEventListener('keydown', e => { if (!s.classList.contains('active') || e.altKey || e.ctrlKey || e.metaKey) return; const n = parseInt(e.key, 10); if (n >= 1 && n <= 6) { e.preventDefault(); play(n - 1); } });
    cv.addEventListener('click', e => {
      const { x, y } = ptr(cv, e), G = GENRES[st.g], n = G.verbs.length, bw = Math.min(160, (W - 40 - (n - 1) * 10) / n), x0 = W / 2 - (n * bw + (n - 1) * 10) / 2;
      if (y < GY + 64 || y > GY + 138) return; const i = Math.floor((x - x0) / (bw + 10)); if (i >= 0 && i < n && x - x0 - i * (bw + 10) <= bw) play(i);
    });
    tourBtn.onclick = () => { st.held = false; st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    buttons();
    function render(t) {
      let gk = st.g, vi = st.vi, k = -1;
      if (st.tour) { const e = SCHED.filter(e => e.at <= t).at(-1); gk = genreAt(t); if (e && e.g === gk) { vi = e.i; k = (t - e.at) / GENRES[gk].verbs[vi].dur; } else vi = -1; if (gk !== st.g) { st.g = gk; buttons(); } }
      else if (vi >= 0) k = (t - st.at) / GENRES[gk].verbs[vi].dur;
      const playing = vi >= 0 && k >= 0 && k <= 1;
      draw(g, gk, playing ? vi : -1, k, t);
      const key = [gk, playing ? vi : -1].join(); if (key === st.key) return; st.key = key;
      $$(s, '.ca-genre .btn').forEach(b => b.classList.toggle('on', b.dataset.g === gk));
      $$(s, '.ca-verbs .btn').forEach(b => b.classList.toggle('on', playing && +b.dataset.v === vi));
      const G = GENRES[gk];
      say($(s, '.ca-stats'), `<div><b>${G.verbs.length}</b><span>core actions in this ${G.name.toLowerCase().replace("fps", "FPS")} verb set</span></div>`);
      say($(s, '.ca-out'), playing ? G.verbs[vi].about : `${G.name}: ${G.verbs.map(v => v.name.toLowerCase()).join(', ')}. ${G.line}`);
    }
    scene = { seek(t) { st.held = true; st.tour = true; render(t); }, dur: () => DUR };
    return dt => { if (st.held) return; st.t += dt; if (st.tour && st.t >= DUR) st.t = 0; render(st.t); };
  });

  window.__seek = (t) => scene.seek(t);
  window.__dur = () => scene.dur();
})();
