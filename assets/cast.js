/* The stick figure cast: one side-view rig and nine named characters that every demo can share,
   so a duel on one page and a frame strip on another show the same people. Browse them on cast/index.html.

   Load with <script src="../../assets/cast.js"></script> (any depth: the file needs nothing else) and draw with
     CAST.draw(g, 'pip', { x, y, pose: 'guard' })                        // y is the floor under the figure
     CAST.draw(g, 'rook', { x, y, face: -1, s: .8, pose: CAST.swing(f, 8, 11, 25).pose })
   Options: x, y (floor point), s (scale, 1 = about 145 px tall for a medium build), face (1 right, -1 left),
     pose (a name from CAST.POSES, a partial pose object, or CAST.mix(a, b, k)), alpha, flash (0..1 whitens the
     body for a hit), tint (replaces the body colour), ghost (true draws a faint key-pose silhouette),
     weapon (override; null for empty hands), shadow (default true), squash (vertical scale, 1 = none), trim (belt colour override).

   A pose is a set of angles in degrees. Every limb angle is absolute: 0 points straight down, 90 points
   forward (the way the figure faces), 180 points up, 270 (or -90) points back. Angles may run past 180 so a
   blend goes the way you mean: idle 125 -> windup 230 raises the blade over the head, not under the feet.
     lean   torso tilt, + forward          head   head tilt on top of the lean
     bl fl  back / front leg [thigh, shin] ba fa  back / front arm [upper, forearm]
     w      weapon direction from the front hand (default: the forearm angle)
     lift   pixels off the floor (jumps)   spin   whole-body turn in degrees (rolls, knockdowns)
     aim    true strings the bow to the back hand
   The figure is put on the floor automatically: the lowest foot, knee, hip or head touches y.

   Helpers: CAST.mix(a, b, k) blends two poses; CAST.swing(f, startup end, active end, total, kind) gives the
   pose of a strike on frame f with the phase it is in (kind 'slash' or 'thrust'); CAST.cycle('walk' | 'run', t)
   loops a gait (t in cycles); CAST.roll(k) is a dodge roll, k 0..1; CAST.hold(w, extra) is a whole-body pose
   holding the weapon at angle w (for pages that already animate one weapon angle); CAST.points(id, o) and CAST.tip(id, o)
   return world positions of the joints and the weapon tip (trails, hitboxes); CAST.box(id, o) is a hurtbox
   rect; CAST.tag(g, id, x, y) draws the character's name pill. */
(function () {
  const TAU = Math.PI * 2, RAD = Math.PI / 180;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const easeOut = k => 1 - Math.pow(1 - clamp(k), 3);
  const ease = k => (k = clamp(k), k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
  const hex = c => { const n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const mixHex = (a, b, k) => { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(lerp(v, B[i], k)).toString(16).padStart(2, '0')).join(''); };

  /* ---------- builds: body proportions in px at s = 1 ---------- */
  const BUILD = {
    medium: { thigh: 30, shin: 30, torso: 50, torsoW: 30, neck: 4, head: 15, upper: 25, fore: 23, limb: 8, hunch: 0 },
    heavy: { thigh: 30, shin: 28, torso: 54, torsoW: 44, neck: 2, head: 16, upper: 27, fore: 25, limb: 12, hunch: 0 },
    slim: { thigh: 32, shin: 32, torso: 46, torsoW: 22, neck: 5, head: 13, upper: 24, fore: 22, limb: 6, hunch: 0 },
    monster: { thigh: 24, shin: 26, torso: 48, torsoW: 46, neck: 0, head: 19, upper: 32, fore: 32, limb: 11, hunch: 22 },
  };

  /* ---------- weapons: drawn from the front hand along the pose's w angle ---------- */
  const WEAPON = {
    sword: { name: 'Sword', len: 64, w: 5, guard: 14 },
    greatsword: { name: 'Greatsword', len: 100, w: 8, guard: 22 },
    dagger: { name: 'Dagger', len: 28, w: 5, guard: 9 },
    axe: { name: 'Axe', len: 54 },
    staff: { name: 'Staff', len: 92 },
    bow: { name: 'Bow', len: 0 },
    claws: { name: 'Claws', len: 16 },
  };

  /* ---------- the cast ---------- */
  // col fills the torso and helm, dark draws the limbs and outlines, trim is the belt and accents.
  // use: who the character stands for, so pages cast the same person in the same job.
  const CAST_LIST = [
    { id: 'pip', name: 'Pip', role: 'The player', build: 'medium', weapon: 'sword', head: 'visor', col: '#2ea3dc', dark: '#152044', trim: '#ffb951',
      use: 'The player character, the attacker in a duel, the one the camera follows. Blue always means "you".' },
    { id: 'rook', name: 'Rook', role: 'The opponent', build: 'medium', weapon: 'sword', head: 'plume', col: '#d0574f', dark: '#7c2420', trim: '#f0d7a0',
      use: 'The other player in PvP, the defender on a frame strip, any mirror match. Same build as Pip so only timing differs.' },
    { id: 'bram', name: 'Bram', role: 'The heavy', build: 'heavy', weapon: 'greatsword', head: 'bucket', col: '#e0913a', dark: '#5a300a', trim: '#5d618c',
      use: 'Slow, long startup, big hitbox: the greatsword, super armour and "commitment" examples.' },
    { id: 'wisp', name: 'Wisp', role: 'The quick one', build: 'slim', weapon: 'dagger', head: 'hood', col: '#2fae63', dark: '#123f26', trim: '#c9b98c',
      use: 'Fast startup, short reach: daggers, dodges, quicksteps and anything that wins on speed.' },
    { id: 'sage', name: 'Sage', role: 'The caster', build: 'slim', weapon: 'staff', head: 'hat', col: '#8a4fd6', dark: '#2e1760', trim: '#ffb951',
      use: 'Spells, channels, cast bars and area effects. Stands back from the melee.',
      poses: { idle: { fa: [12, 30], w: 172 }, guard: { fa: [40, 120], w: 160 } } },
    { id: 'kit', name: 'Kit', role: 'The ranged', build: 'slim', weapon: 'bow', head: 'cap', col: '#e0a92d', dark: '#5c3a05', trim: '#2fae63',
      use: 'Projectiles, aiming, range and line-of-sight examples.',
      poses: { idle: { fa: [16, 40], w: 70 }, guard: { fa: [60, 85], w: 88, ba: [40, 60] } } },
    { id: 'grub', name: 'Grub', role: 'The monster', build: 'monster', weapon: 'claws', head: 'horns', col: '#7f8f4e', dark: '#2c3512', trim: '#efe3c2',
      use: 'PvE enemies: telegraphs, enemy attacks, hit reactions on something that is not a person.',
      poses: { idle: { ba: [-4, 14], fa: [16, 26], w: 30 }, guard: { ba: [30, 60], fa: [50, 80], w: 90 } } },
    { id: 'sam', name: 'Sam', role: 'The stand-in', build: 'medium', weapon: null, head: 'bare', col: '#a3a9c7', dark: '#3d4270', trim: '#5d618c',
      use: 'Scale and metrics (door widths, cover heights, jump arcs), crowds and anyone with no part in the fight.',
      poses: { idle: { ba: [-6, -2], fa: [8, 4] }, guard: { ba: [10, 50], fa: [30, 90] } } },
    { id: 'dummy', name: 'Dummy', role: 'The target', build: 'medium', weapon: null, head: 'sack', col: '#d9b57a', dark: '#7a5a3a', trim: '#b5482f', dummy: true,
      use: 'A target that only reacts: hit feedback, damage numbers, hitstop and knockback with no AI in the way. Only lean and flash apply.' },
  ];
  const BY = Object.fromEntries(CAST_LIST.map(c => [c.id, c]));

  /* ---------- poses (facing right) ---------- */
  const BASE = { lean: 0, head: 0, bl: [-8, -8], fl: [8, 8], ba: [-12, 8], fa: [18, 70], w: null, lift: 0, spin: 0, aim: false };
  const POSES = {
    idle: { lean: 0, bl: [-8, -8], fl: [8, 8], ba: [-12, 8], fa: [18, 70], w: 125 },
    guard: { lean: 6, bl: [-24, -8], fl: [30, 0], ba: [-4, 40], fa: [34, 100], w: 145 },
    walk1: { lean: 4, bl: [-22, -30], fl: [24, 6], ba: [16, 40], fa: [-10, 30], w: 110 },
    walk2: { lean: 4, bl: [22, 6], fl: [-22, -30], ba: [-16, 10], fa: [26, 80], w: 130 },
    run1: { lean: 14, bl: [-40, -80], fl: [55, 0], ba: [50, 120], fa: [-30, 40], w: 100 },
    run2: { lean: 14, bl: [50, -10], fl: [-35, -75], ba: [-30, 30], fa: [50, 120], w: 150 },
    windup: { lean: -10, bl: [-24, -8], fl: [24, 2], ba: [10, 40], fa: [200, 222], w: 230 },
    strike: { lean: 12, bl: [-30, -14], fl: [36, 8], ba: [-30, -10], fa: [95, 95], w: 95 },
    follow: { lean: 18, bl: [-34, -18], fl: [40, 10], ba: [-40, -20], fa: [50, 40], w: 58 },
    draw: { lean: -8, bl: [-26, -10], fl: [26, 2], ba: [30, 70], fa: [-40, 60], w: 90 },
    thrust: { lean: 16, bl: [-46, -22], fl: [52, 2], ba: [-60, -50], fa: [92, 90], w: 90 },
    block: { lean: -4, bl: [-22, -10], fl: [22, 4], ba: [40, 110], fa: [70, 160], w: 168 },
    hit: { lean: -22, head: -20, bl: [-14, -6], fl: [26, 14], ba: [-70, -40], fa: [-40, -20], w: 215 },
    crumple: { lean: 32, head: 30, bl: [52, -34], fl: [62, -20], ba: [10, 0], fa: [24, 40], w: 75 },
    down: { lean: 0, head: -10, bl: [-4, 0], fl: [10, 6], ba: [-150, -170], fa: [-120, -160], w: -100, spin: -90 },
    crouch: { lean: 20, bl: [40, -40], fl: [80, -10], ba: [0, 40], fa: [40, 90], w: 120 },
    jump: { lean: 6, bl: [30, -40], fl: [72, -8], ba: [-30, 10], fa: [60, 110], w: 140, lift: 40 },
    fall: { lean: -4, bl: [-10, -24], fl: [22, 0], ba: [120, 140], fa: [130, 150], w: 165, lift: 28 },
    tuck: { lean: 40, head: 20, bl: [80, -40], fl: [100, -20], ba: [60, 20], fa: [80, 40], w: 100 },
    cast: { lean: -4, bl: [-20, -10], fl: [20, 4], ba: [96, 110], fa: [150, 170], w: 176 },
    aim: { lean: -2, bl: [-22, -10], fl: [20, 4], ba: [96, 270], fa: [90, 90], w: 90, aim: true },
    cheer: { lean: -4, bl: [-12, -10], fl: [12, 6], ba: [160, 180], fa: [200, 190], w: 190 },
    point: { lean: 2, bl: [-10, -8], fl: [10, 6], ba: [-10, 6], fa: [100, 96], w: 96 },
  };
  // what each pose is for, in the order the pose sheet shows them
  const POSE_NOTES = {
    idle: 'Standing, weapon low', guard: 'Ready stance', walk1: 'Walk, step A', walk2: 'Walk, step B', run1: 'Run, stride A', run2: 'Run, stride B',
    windup: 'Startup: wound up', strike: 'Active: mid-swing', follow: 'Recovery: end of swing', draw: 'Startup of a thrust', thrust: 'Thrust, fully out',
    block: 'Blocking', hit: 'Hitstun: reeling', crumple: 'Crumple stun', down: 'Knocked down', crouch: 'Crouch', jump: 'Jump, rising', fall: 'Falling',
    tuck: 'Rolling (spin it)', cast: 'Casting', aim: 'Aiming a bow', cheer: 'Cheer', point: 'Point',
  };

  // a pose for this character: base, then the named pose, then the character's own take on it
  function resolve(ch, p) {
    if (p == null) p = 'idle';
    if (typeof p === 'string') return { ...BASE, ...POSES[p], ...(ch.poses?.[p] || {}) };
    if (p.mix) { const [a, b, k] = p.mix; return blend(resolve(ch, a), resolve(ch, b), k); }
    if (p.base) return { ...resolve(ch, p.base), ...p, base: undefined };
    return { ...BASE, ...p };
  }
  function blend(A, B, k) {
    const o = {};
    for (const key of Object.keys(BASE)) {
      const a = A[key], b = B[key];
      if (Array.isArray(a)) o[key] = a.map((v, i) => lerp(v, b[i], k));
      else if (typeof a === 'number' || typeof b === 'number') {
        const av = a ?? A.fa[1], bv = b ?? B.fa[1];
        o[key] = lerp(av, bv, k);
      } else o[key] = k < .5 ? a : b;
    }
    return o;
  }
  const mix = (a, b, k) => ({ mix: [a, b, clamp(k)] });

  /* ---------- the rig: joint positions in the figure's own space (hip-relative, then put on the floor) ---------- */
  const dir = a => [Math.sin(a * RAD), Math.cos(a * RAD)];
  const add = (p, a, len) => { const d = dir(a); return [p[0] + d[0] * len, p[1] + d[1] * len]; };
  function rig(ch, P) {
    const B = BUILD[ch.build];
    const lean = P.lean + B.hunch, hipB = [-3, 0], hipF = [3, 0];
    const kneeB = add(hipB, P.bl[0], B.thigh), footB = add(kneeB, P.bl[1], B.shin);
    const kneeF = add(hipF, P.fl[0], B.thigh), footF = add(kneeF, P.fl[1], B.shin);
    const up = a => [Math.sin(a * RAD), -Math.cos(a * RAD)];
    const tu = up(lean), sh = [tu[0] * B.torso, tu[1] * B.torso];
    const ha = lean + P.head, hu = up(ha), head = [sh[0] + hu[0] * (B.neck + B.head), sh[1] + hu[1] * (B.neck + B.head)];
    const shF = [sh[0] + tu[0] * -6, sh[1] + tu[1] * -6];   // shoulders sit a little below the top of the torso
    const elbowB = add(shF, P.ba[0], B.upper), handB = add(elbowB, P.ba[1], B.fore);
    const elbowF = add(shF, P.fa[0], B.upper), handF = add(elbowF, P.fa[1], B.fore);
    let pts = { hipB, hipF, kneeB, footB, kneeF, footF, sh, shF, head, elbowB, handB, elbowF, handF, hip: [0, 0] };
    let w = P.w ?? P.fa[1];
    // spin turns the whole figure about the middle of the torso
    if (P.spin) {
      const c = [sh[0] / 2, sh[1] / 2], r = P.spin * RAD, cs = Math.cos(r), sn = Math.sin(r);
      for (const k in pts) { const [x, y] = pts[k]; pts[k] = [c[0] + (x - c[0]) * cs - (y - c[1]) * sn, c[1] + (x - c[0]) * sn + (y - c[1]) * cs]; }
      w -= P.spin;
    }
    // onto the floor: the lowest foot, knee, hip, shoulder or head bottom touches y = 0
    const low = Math.max(pts.footB[1], pts.footF[1], pts.kneeB[1], pts.kneeF[1], pts.hip[1], pts.sh[1], pts.head[1] + B.head);
    const dy = -low - (P.lift || 0);
    for (const k in pts) pts[k] = [pts[k][0], pts[k][1] + dy];
    const torsoA = Math.atan2(pts.sh[0] - pts.hip[0], -(pts.sh[1] - pts.hip[1])) / RAD;   // degrees, 0 = upright
    return { B, P, pts, w, torsoA, headA: torsoA + P.head, shinB: P.bl[1] - P.spin, shinF: P.fl[1] - P.spin };
  }

  /* ---------- drawing ---------- */
  function stroke(g, a, b, col, w) { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
  function limb(g, a, b, c, col, w) { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.stroke(); }
  function foot(g, ankle, shinA, col, w) { const d = dir(shinA + 90); stroke(g, ankle, [ankle[0] + d[0] * (w + 4), ankle[1] + d[1] * (w + 4)], col, w); }

  function torsoShape(g, R, col, dark, lw) {
    const { B, pts } = R;
    g.save(); g.translate(pts.hip[0], pts.hip[1]); g.rotate(R.torsoA * RAD);
    g.fillStyle = col; g.strokeStyle = dark; g.lineWidth = lw;
    g.beginPath(); g.roundRect(-B.torsoW / 2, -B.torso - 4, B.torsoW, B.torso + 10, Math.min(12, B.torsoW / 2.6)); g.fill(); g.stroke();
    g.restore();
  }
  function torsoTrim(g, R, trim) {
    const { B, pts } = R;
    g.save(); g.translate(pts.hip[0], pts.hip[1]); g.rotate(R.torsoA * RAD);
    g.fillStyle = trim; g.fillRect(-B.torsoW / 2 + 2, -12, B.torsoW - 4, 5);
    g.restore();
  }
  function headShape(g, ch, R, col, dark, trim, lw, ghost) {
    const r = R.B.head, [hx, hy] = R.pts.head, SKIN = ghost ? col : '#f2d2b0';
    g.save(); g.translate(hx, hy); g.rotate(R.headA * RAD);
    g.fillStyle = col; g.strokeStyle = dark; g.lineWidth = lw;
    const circle = (fill = col) => { g.fillStyle = fill; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill(); g.stroke(); };
    const eye = (x = r * .5, y = -r * .12, rr = Math.max(1.6, r * .13)) => { if (ghost) return; g.fillStyle = dark; g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill(); };
    switch (ch.head) {
      case 'visor':
        circle(); if (!ghost) { g.fillStyle = dark; g.fillRect(r * .28, -r * .3, r * .78, r * .34); }
        break;
      case 'plume':
        if (!ghost) { g.strokeStyle = trim; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(r * .1, -r * .95); g.quadraticCurveTo(-r * .7, -r * 1.6, -r * 1.5, -r * .5); g.stroke(); g.strokeStyle = dark; g.lineWidth = lw; }
        circle(); if (!ghost) { g.fillStyle = dark; g.fillRect(r * .28, -r * .3, r * .78, r * .34); }
        break;
      case 'bucket':
        g.beginPath(); g.roundRect(-r, -r * 1.05, r * 2, r * 2.1, 4); g.fill(); g.stroke();
        if (!ghost) { g.fillStyle = dark; g.fillRect(r * .05, -r * .32, r * .95, r * .26); g.fillRect(r * .5, -r * .32, r * .24, r * .9); g.fillStyle = trim; g.fillRect(-r, -r * 1.05, r * 2, r * .3); }
        break;
      case 'hood':
        g.beginPath(); g.moveTo(-r * .5, -r * .85); g.lineTo(-r * 1.9, r * .35); g.lineTo(-r * .7, r * .7); g.closePath(); g.fill(); g.stroke();
        circle();
        if (!ghost) { g.fillStyle = dark; g.beginPath(); g.ellipse(r * .42, r * .05, r * .52, r * .62, 0, 0, TAU); g.fill(); g.fillStyle = '#e8f5e9'; g.beginPath(); g.arc(r * .62, -r * .1, r * .12, 0, TAU); g.fill(); }
        break;
      case 'hat':
        circle(SKIN); eye();
        g.fillStyle = col; g.strokeStyle = dark;
        g.beginPath(); g.moveTo(-r * .85, -r * .6); g.quadraticCurveTo(-r * .4, -r * 2.2, -r * 1.5, -r * 3); g.quadraticCurveTo(r * .2, -r * 2.2, r * .85, -r * .6); g.closePath(); g.fill(); g.stroke();
        g.beginPath(); g.ellipse(0, -r * .6, r * 1.35, r * .28, 0, 0, TAU); g.fill(); g.stroke();
        if (!ghost) { g.fillStyle = trim; g.fillRect(-r * .8, -r * .98, r * 1.6, r * .26); }
        break;
      case 'cap':
        circle(SKIN); eye();
        g.fillStyle = col; g.beginPath(); g.arc(0, -r * .1, r * 1.02, Math.PI * 1.02, Math.PI * 1.98); g.closePath(); g.fill(); g.stroke();
        g.beginPath(); g.moveTo(r * .7, -r * .2); g.lineTo(r * 1.45, -r * .05); g.lineTo(r * .8, r * .05); g.closePath(); g.fill(); g.stroke();
        if (!ghost) { g.strokeStyle = trim; g.lineWidth = 3.5; g.lineCap = 'round'; g.beginPath(); g.moveTo(-r * .6, -r * .8); g.quadraticCurveTo(-r * 1.4, -r * 1.6, -r * 2, -r * 1.3); g.stroke(); }
        break;
      case 'horns':
        if (!ghost) {
          g.fillStyle = trim; g.strokeStyle = dark; g.lineWidth = 2;
          [[-r * .45, -1], [r * .25, 1]].forEach(([x, k]) => { g.beginPath(); g.moveTo(x - r * .22, -r * .75); g.quadraticCurveTo(x - r * .1, -r * 1.7, x + k * r * .55, -r * 1.75); g.quadraticCurveTo(x + r * .1, -r * 1.2, x + r * .28, -r * .8); g.closePath(); g.fill(); g.stroke(); });
          g.lineWidth = lw;
        }
        circle();
        if (!ghost) {
          g.fillStyle = '#ffd84a'; g.beginPath(); g.arc(r * .5, -r * .15, r * .24, 0, TAU); g.fill(); g.fillStyle = dark; g.beginPath(); g.arc(r * .58, -r * .15, r * .11, 0, TAU); g.fill();
          g.fillStyle = trim; g.beginPath(); g.moveTo(r * .55, r * .45); g.lineTo(r * .78, r * .05); g.lineTo(r * .88, r * .5); g.closePath(); g.fill();
        }
        break;
      case 'bare': default:
        circle(ghost ? col : '#e9ecf7'); eye();
    }
    g.restore();
  }
  function weaponShape(g, kind, hand, w, ch, R, dark, ghost) {
    const W = WEAPON[kind]; if (!W) return;
    const steel = ghost ? dark : '#e4e8f2';
    g.save(); g.translate(hand[0], hand[1]); g.rotate(-w * RAD);   // local +y points along the weapon
    g.lineCap = 'round';
    if (kind === 'sword' || kind === 'greatsword' || kind === 'dagger') {
      g.strokeStyle = ghost ? dark : '#7a4a1e'; g.lineWidth = W.w + 1; g.beginPath(); g.moveTo(0, -8); g.lineTo(0, 0); g.stroke();
      g.strokeStyle = dark; g.lineWidth = W.w + 3; g.beginPath(); g.moveTo(0, 3); g.lineTo(0, W.len); g.stroke();
      g.strokeStyle = steel; g.lineWidth = W.w; g.beginPath(); g.moveTo(0, 3); g.lineTo(0, W.len); g.stroke();
      g.strokeStyle = ghost ? dark : ch.trim; g.lineWidth = 4; g.beginPath(); g.moveTo(-W.guard / 2, 3); g.lineTo(W.guard / 2, 3); g.stroke();
    } else if (kind === 'axe') {
      g.strokeStyle = dark; g.lineWidth = 7; g.beginPath(); g.moveTo(0, -6); g.lineTo(0, W.len); g.stroke();
      g.strokeStyle = ghost ? dark : '#a9743e'; g.lineWidth = 4; g.beginPath(); g.moveTo(0, -5); g.lineTo(0, W.len - 1); g.stroke();
      g.fillStyle = ghost ? dark : '#c3cadb'; g.strokeStyle = dark; g.lineWidth = 2.2;   // the head, blade toward the swing (local -x is forward-down)
      g.beginPath(); g.moveTo(-2, W.len - 22); g.quadraticCurveTo(-22, W.len - 26, -24, W.len - 8); g.quadraticCurveTo(-22, W.len + 10, -2, W.len + 4); g.closePath(); g.fill(); g.stroke();
    } else if (kind === 'staff') {
      g.strokeStyle = dark; g.lineWidth = 7; g.beginPath(); g.moveTo(0, -34); g.lineTo(0, W.len); g.stroke();
      g.strokeStyle = ghost ? dark : '#a9743e'; g.lineWidth = 4; g.beginPath(); g.moveTo(0, -33); g.lineTo(0, W.len - 1); g.stroke();
      if (!ghost) { g.fillStyle = 'rgba(255,185,81,.35)'; g.beginPath(); g.arc(0, W.len + 8, 15, 0, TAU); g.fill(); }
      g.fillStyle = ghost ? dark : ch.trim; g.strokeStyle = dark; g.lineWidth = 2.5; g.beginPath(); g.arc(0, W.len + 8, 9, 0, TAU); g.fill(); g.stroke();
    } else if (kind === 'bow') {
      // limbs across the aim line, bulging toward it; the grip sits in the hand
      g.strokeStyle = dark; g.lineWidth = 6; g.beginPath(); g.moveTo(-40, -14); g.quadraticCurveTo(0, 28, 40, -14); g.stroke();
      g.strokeStyle = ghost ? dark : '#a9743e'; g.lineWidth = 3; g.stroke();
      if (!R.P.aim) { g.strokeStyle = ghost ? dark : 'rgba(40,40,60,.7)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-40, -14); g.lineTo(40, -14); g.stroke(); }
    } else if (kind === 'claws') {
      g.strokeStyle = ghost ? dark : ch.trim; g.lineWidth = 3.5;
      [-.5, 0, .5].forEach(a => { g.beginPath(); g.moveTo(0, 2); g.lineTo(Math.sin(a) * W.len, Math.cos(a) * W.len); g.stroke(); });
    }
    g.restore();
  }
  // the bow string, pulled to the back hand while aiming, with an arrow nocked
  function bowString(g, R, w, dark, ghost) {
    const hand = R.pts.handF, back = R.pts.handB, ax = Math.sin(w * RAD), ay = Math.cos(w * RAD), px = Math.cos(w * RAD), py = -Math.sin(w * RAD);
    const end = s => [hand[0] - ax * 14 + px * 40 * s, hand[1] - ay * 14 + py * 40 * s];
    g.strokeStyle = ghost ? dark : 'rgba(40,40,60,.75)'; g.lineWidth = 1.5; g.beginPath(); const a = end(1), b = end(-1);
    g.moveTo(a[0], a[1]); g.lineTo(back[0], back[1]); g.lineTo(b[0], b[1]); g.stroke();
    g.strokeStyle = ghost ? dark : '#7a4a1e'; g.lineWidth = 3; g.beginPath(); g.moveTo(back[0], back[1]); g.lineTo(hand[0] + ax * 22, hand[1] + ay * 22); g.stroke();
    if (!ghost) { g.fillStyle = '#cfd6e6'; g.beginPath(); g.moveTo(hand[0] + ax * 30, hand[1] + ay * 30); g.lineTo(hand[0] + ax * 20 + px * 5, hand[1] + ay * 20 + py * 5); g.lineTo(hand[0] + ax * 20 - px * 5, hand[1] + ay * 20 - py * 5); g.closePath(); g.fill(); }
  }

  function dummyShape(g, ch, P, col, dark, lw, flash, ghost) {
    g.fillStyle = ghost ? col : '#8b6136'; g.fillRect(-4, -60, 8, 60); g.fillRect(-18, -4, 36, 6);
    g.save(); g.translate(0, -58); g.rotate((P.lean || 0) * RAD); g.translate(0, 58);
    g.fillStyle = col; g.strokeStyle = dark; g.lineWidth = lw;
    g.beginPath(); g.roundRect(-20, -116, 40, 62, 14); g.fill(); g.stroke();
    g.beginPath(); g.arc(0, -132, 15, 0, TAU); g.fill(); g.stroke();
    if (!ghost) {
      g.strokeStyle = dark; g.lineWidth = 2; g.beginPath(); g.moveTo(-20, -86); g.lineTo(20, -86); g.stroke();
      g.fillStyle = ch.trim; g.beginPath(); g.arc(0, -96, 7, 0, TAU); g.fill();
      g.strokeStyle = dark; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-6, -135); g.lineTo(-2, -131); g.moveTo(-2, -135); g.lineTo(-6, -131); g.moveTo(4, -135); g.lineTo(8, -131); g.moveTo(8, -135); g.lineTo(4, -131); g.stroke();
    }
    if (flash > 0) { g.globalAlpha *= flash; g.fillStyle = '#fff'; g.beginPath(); g.roundRect(-20, -116, 40, 62, 14); g.fill(); g.beginPath(); g.arc(0, -132, 15, 0, TAU); g.fill(); }
    g.restore();
  }

  const GHOST = { col: '#c3c8de', dark: '#9aa3c7' };
  function draw(g, id, o = {}) {
    const ch = BY[id]; if (!ch) return;
    const { x = 0, y = 0, s = 1, face = 1, alpha = 1, flash = 0, ghost = false, shadow = true } = o;
    const P = resolve(ch, o.pose);
    const col = ghost ? GHOST.col : (o.tint || ch.col), dark = ghost ? GHOST.dark : ch.dark, trim = o.trim || ch.trim;
    const kind = 'weapon' in o ? o.weapon : ch.weapon, lw = 2.6;
    g.save(); g.globalAlpha *= alpha * (ghost ? .55 : 1); g.translate(x, y); g.scale(face * s, s * (o.squash ?? 1));
    g.lineCap = 'round'; g.lineJoin = 'round';
    if (ch.dummy) {
      if (shadow) { g.fillStyle = 'rgba(40,30,20,.18)'; g.beginPath(); g.ellipse(0, 2, 26, 6, 0, 0, TAU); g.fill(); }
      dummyShape(g, ch, P, col, dark, lw, flash, ghost); g.restore(); return;
    }
    const R = rig(ch, P), { B, pts } = R, back = ghost ? dark : mixHex(dark, '#ffffff', .35);
    if (shadow) {
      const k = clamp(1 - (P.lift || 0) / 160, .35, 1);
      g.fillStyle = `rgba(40,30,20,${.18 * k})`; g.beginPath(); g.ellipse((pts.footB[0] + pts.footF[0]) / 2, 2, 30 * k + B.torsoW * .2, 6 * k, 0, 0, TAU); g.fill();
    }
    // far side first: back arm, back leg
    limb(g, pts.shF, pts.elbowB, pts.handB, back, B.limb * .85);
    g.fillStyle = back; g.beginPath(); g.arc(pts.handB[0], pts.handB[1], B.limb * .62, 0, TAU); g.fill();
    limb(g, pts.hipB, pts.kneeB, pts.footB, back, B.limb); foot(g, pts.footB, R.shinB, back, B.limb);
    torsoShape(g, R, col, dark, lw); if (!ghost) torsoTrim(g, R, trim);
    limb(g, pts.hipF, pts.kneeF, pts.footF, dark, B.limb); foot(g, pts.footF, R.shinF, dark, B.limb);
    headShape(g, ch, R, col, dark, trim, lw, ghost);
    if (flash > 0) {
      g.save(); g.globalAlpha *= flash; torsoShape(g, R, '#ffffff', '#ffffff', lw);
      g.fillStyle = '#fff'; g.beginPath(); g.arc(pts.head[0], pts.head[1], B.head + 1, 0, TAU); g.fill(); g.restore();
    }
    // near side: weapon behind the hand, then the front arm
    if (kind) weaponShape(g, kind, pts.handF, R.w, ch, R, dark, ghost);
    if (kind === 'bow' && P.aim) bowString(g, R, R.w, dark, ghost);
    limb(g, pts.shF, pts.elbowF, pts.handF, dark, B.limb * .85);
    g.fillStyle = dark; g.beginPath(); g.arc(pts.handF[0], pts.handF[1], B.limb * .62, 0, TAU); g.fill();
    g.restore();
  }

  /* ---------- geometry for trails, hitboxes and labels ---------- */
  function points(id, o = {}) {
    const ch = BY[id], { x = 0, y = 0, s = 1, face = 1 } = o, P = resolve(ch, o.pose);
    const W = v => ({ x: x + v[0] * s * face, y: y + v[1] * s });
    if (ch.dummy) return { head: { ...W([0, -132]), r: 15 * s }, hip: W([0, -60]), tip: W([0, -96]) };
    const R = rig(ch, P), out = {};
    for (const k in R.pts) out[k] = W(R.pts[k]);
    out.head.r = R.B.head * s;
    const kind = 'weapon' in o ? o.weapon : ch.weapon, len = (WEAPON[kind]?.len ?? 0) + (kind === 'staff' ? 8 : 0);
    out.tip = W(add(R.pts.handF, R.w, len));
    out.w = R.w;
    return out;
  }
  const tip = (id, o) => points(id, o).tip;
  function box(id, o = {}) {
    const p = points(id, o), xs = [], ys = [];
    ['footB', 'footF', 'kneeB', 'kneeF', 'hip', 'sh', 'elbowB', 'elbowF'].forEach(k => { if (p[k]) { xs.push(p[k].x); ys.push(p[k].y); } });
    xs.push(p.head.x - p.head.r, p.head.x + p.head.r); ys.push(p.head.y - p.head.r);
    if (BY[id].dummy) { xs.push((o.x || 0) - 20 * (o.s || 1), (o.x || 0) + 20 * (o.s || 1)); ys.push(o.y || 0); }
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }

  /* ---------- motion helpers ---------- */
  // a strike on frame f: startup [0, a), active [a, b), recovery [b, L). Startup reaches 90% of the wind-up quickly,
  // then creeps the last 10%: the compression before the release.
  function swing(f, a, b, L, kind = 'slash') {
    const W = kind === 'thrust' ? 'draw' : 'windup', S = kind === 'thrust' ? 'thrust' : 'strike', F = kind === 'thrust' ? 'thrust' : 'follow';
    if (f < 0 || f >= L) return { ph: f < 0 ? 'idle' : 'done', k: 0, pose: 'idle' };
    if (f < a) { const k = f / a, e = k < .7 ? .9 * easeOut(k / .7) : .9 + .1 * (k - .7) / .3; return { ph: 'startup', k, pose: mix('idle', W, e) }; }
    if (f < b) { const k = (f - a) / Math.max(1e-6, b - a), e = easeOut(k); return { ph: 'active', k, pose: e < .6 ? mix(W, S, e / .6) : mix(S, F, (e - .6) / .4) }; }
    const k = (f - b) / Math.max(1, L - b); return { ph: 'recovery', k, pose: mix(F, 'idle', ease(k)) };
  }
  function cycle(name, t) {
    const k = .5 - .5 * Math.cos(t * TAU);
    return mix(name + '1', name + '2', k);
  }
  const roll = k => ({ base: 'tuck', spin: 360 * clamp(k) });
  // a full-body pose that holds the weapon at angle w (degrees, same convention as poses), for pages that already
  // animate a single weapon angle: it slides through follow, strike, idle, guard and windup by w, then sets w exactly.
  // extra fields (lean, lift, ...) override the result.
  const HOLD = [['follow', 58], ['strike', 95], ['idle', 125], ['guard', 145], ['windup', 230]];
  function hold(w, extra = {}) {
    let i = 0; while (i < HOLD.length - 2 && w > HOLD[i + 1][1]) i++;
    const [a, wa] = HOLD[i], [b, wb] = HOLD[i + 1];
    return { base: mix(a, b, (w - wa) / (wb - wa)), w, ...extra };
  }

  // a name pill in the character's colours
  function tag(g, id, x, y, { size = 14, text } = {}) {
    const ch = BY[id]; if (!ch) return;
    g.save(); g.font = `600 ${size}px Jost, sans-serif`; const s = text || ch.name, w = g.measureText(s).width + 18;
    g.fillStyle = ch.col; g.strokeStyle = ch.dark; g.lineWidth = 2; g.beginPath(); g.roundRect(x - w / 2, y - size * .85, w, size * 1.7, 8); g.fill(); g.stroke();
    g.fillStyle = ch.id === 'kit' || ch.id === 'dummy' || ch.id === 'sam' ? ch.dark : '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s, x, y + 1);
    g.restore();
  }

  window.CAST = { list: CAST_LIST, by: BY, BUILD, WEAPON, POSES, POSE_NOTES, draw, points, tip, box, swing, cycle, roll, hold, mix, resolve: (id, p) => resolve(BY[id], p), tag };
})();
