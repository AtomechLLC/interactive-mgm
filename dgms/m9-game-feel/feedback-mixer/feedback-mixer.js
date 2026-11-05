/* Feedback channel mixer (Module 9, feedback techniques). One sword strike on a training dummy, in 3D (three.js), on a
   loop, with the deck's eight feedback channels on a mixing desk: animation, VFX and light, SFX, time, camera, UI,
   materials and decals, and haptics. Each strip has an ON button, a SOLO button, a fader, a level meter that fires when
   its channel does, and LEDs for the items its strength reaches. The master section holds A/B slots (two full mixes to
   flip between, every hit if you like), presets from a blockout to an overcooked mix, a multitrack of the hit, the FOV
   table from the deck as a dolly zoom, and playback speed. Extras from the deck sit on their strips: cut the first
   frames of a slow swing, GDKeys' "paint the UI green", and Sion's ultimate, heard map-wide.
   Every frame is a pure function of (mix, time), so window.__seek is deterministic for the GIF recorder; sound and
   rumble only fire from the live loop. Slide 2 is a checklist in the shape of Jacopo's feedback tool that reads the live
   slot and downloads as text or JSON. */
import * as THREE from '../../../assets/vendor/three/three.module.min.js';
import { GLTFLoader } from '../../../assets/vendor/three/addons/loaders/GLTFLoader.js';

const { $, $$, canvasDemo, say, store } = FPF.kit;
const C = TD.C, TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), lerp = (a, b, k) => a + (b - a) * k;
const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const eOut = k => 1 - (1 - k) * (1 - k), eIn = k => k * k, eIO = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
const VW = 1080, VH = 486, GREEN = '#39e81c', TS = 18;   // TS: swing trail samples

/* ---------- the eight channels, in walk-through order ---------- */
const CH = [
  { id: 'anim', name: 'Animation', short: 'Animation', desk: 'Animation', col: '#7ee081', items: ['Anticipation pose', 'Follow-through', 'Victim recoil'], thr: [0, .35, .6], pri: 'High',
    note: 'The two common mistakes: not moving the characters enough, and slow starts. Pull the fader down and the knight swings like a stick; push it up for a deeper wind-up, a lunge and a follow-through. Then cut the first frames.' },
  { id: 'vfx', name: 'VFX and light', short: 'VFX, light', desk: 'VFX · light', col: '#ffcf4a', items: ['Swing trail', 'Impact spark and shockwave', 'Light flash'], sh: ['Swing trail', 'Spark, shockwave', 'Light flash'], thr: [0, .3, .6], pri: 'High',
    note: 'Trails “simulate the blur”, impacts and explosions “bring weight into actions”, and a flash of light lands the hit. The sparks wait for the hit stop to end, then burst.' },
  { id: 'sfx', name: 'SFX', short: 'SFX', desk: 'SFX', col: '#ff7a59', items: ['Impact thump', 'Swing whoosh', 'Dummy creak'], thr: [0, .35, .7], pri: 'High',
    note: '“The rare feedback that doesn’t need to be on-screen.” Click once anywhere so the browser lets the sound play. Then try Sion’s ultimate: you hear it from anywhere on the map.' },
  { id: 'time', name: 'Time', short: 'Time', desk: 'Time', col: '#ff5fa2', items: ['Hit stop', 'Victim wobble during the stop', 'Slow-motion tail'], sh: ['Hit stop', 'Victim wobble', 'Slow-mo tail'], thr: [0, .4, .8], pri: 'High',
    note: 'Hit stop is “scaled depending on the impact. Don’t abuse it or it might make the game feel laggy.” The fader sets the freeze from 2 to 16 frames. The victim wobbles while frozen, Smash style.' },
  { id: 'cam', name: 'Camera', short: 'Camera', desk: 'Camera', col: '#6aa8ff', items: ['Shake on impact', 'Zoom punch'], thr: [0, .5], pri: 'High',
    note: 'Shake “must simulate the action”: the camera kicks in the direction of the blow, then settles. The zoom punch narrows the lens for a few frames. The lens buttons on the right come from the deck’s FOV table.' },
  { id: 'ui', name: 'UI', short: 'UI', desk: 'UI', col: '#39d0ff', items: ['Damage number', 'Health bar drop', 'Hit marker and combo count'], sh: ['Damage number', 'Health bar', 'Hit marker'], thr: [0, .3, .6], pri: 'Medium',
    note: 'Numbers, bars and markers confirm the hit. Paint the UI green to see how much of the screen it takes.' },
  { id: 'mat', name: 'Materials, decals', short: 'Materials', desk: 'Materials', col: '#d9a066', items: ['Hit flash on the surface', 'Slash decal', 'Straw burst and floor scuff'], sh: ['Hit flash', 'Slash decal', 'Straw, scuff'], thr: [0, .35, .7], pri: 'Low',
    note: 'The surface answers the blade: the burlap flashes white, a slash mark stays, straw bursts out and lands on the floor, and the knight’s front foot scuffs the stone.' },
  { id: 'hap', name: 'Haptics', short: 'Haptics', desk: 'Haptics', col: '#c084fc', items: ['Impact pulse, short and strong', 'Wind-up buzz, rising'], sh: ['Impact pulse', 'Wind-up buzz'], thr: [0, .5], pri: 'Medium',
    note: '“The only physical influence most games have.” Short and strong for impacts, rising or pulsing for charge-ups. A connected controller rumbles too; otherwise watch the meter.' },
];
const IDS = CH.map(c => c.id), CHI = Object.fromEntries(CH.map(c => [c.id, c]));
const FOV = [{ v: 50, game: 'Dying Light 1', why: 'claustrophobic horror' }, { v: 70, game: 'Dying Light 2', why: 'open parkour' }, { v: 90, game: 'Doom', why: 'awareness' }, { v: 100, game: 'Forza Horizon', why: 'speed' }];
const mkMix = (name, lv = {}, ex = {}) => ({ name, ch: Object.fromEntries(IDS.map(id => [id, { on: lv[id] != null, str: lv[id] != null ? lv[id] : .6 }])), cut: false, green: false, ...ex });
const ALL = v => Object.fromEntries(IDS.map(id => [id, v]));
const PRESETS = [
  { name: 'Blockout', lv: {}, tip: 'Every channel off: the swing happens and the dummy takes damage, but nothing tells you.' },
  { name: 'Readable', lv: { anim: .5, vfx: .35, sfx: .5, ui: .5 }, tip: 'The minimum that confirms the hit: a pose, a spark, a thump and a number. It reads, but it has no weight.' },
  { name: 'Crunchy', lv: { anim: .7, vfx: .65, sfx: .75, time: .45, cam: .5, ui: .6, mat: .75, hap: .6 }, tip: 'Every channel in at a moderate level. A short hit stop, a short shake, and straw on the floor.' },
  { name: 'Heavy', lv: { anim: 1, vfx: .8, sfx: 1, time: .8, cam: .9, ui: .4, mat: .9, hap: 1 }, tip: 'A big two-handed blow: deeper wind-up, longer freeze, harder shake and a slow-motion tail. Fine for a finisher; tiring on every hit.' },
  { name: 'Overcooked', lv: ALL(1), tip: 'Everything at full. Sixteen frames of hit stop on every swing is the deck’s “rollercoaster that brakes every 10 feet”. Flip to A to feel the difference.' },
];
const presetMix = (p, ex) => mkMix(p.name, p.lv, ex);

/* ---------- shared state: two slots, one live ---------- */
const S = {
  slots: { A: presetMix(PRESETS[0]), B: presetMix(PRESETS[2]) }, live: 'B', flip: false, solo: null,
  fov: 70, fovView: 70, speed: 1, yaw: 0, pitch: 0, pri: Object.fromEntries(CH.map(c => [c.id, c.pri])), name: 'Melee hit on a training dummy',
  sionAt: -99, clock: 0, pad: false,
};
const liveMix = () => S.slots[S.live];
const sheetS = () => { const m = liveMix(); return { ch: m.ch, cut: m.cut, green: m.green, fov: S.fov, pri: S.pri, name: S.name }; };
// the state the renderer reads: a mix with solo folded in
function effective(mix, solo, ex = {}) {
  const ch = {}; IDS.forEach(id => { const o = mix.ch[id]; ch[id] = { on: solo ? id === solo : o.on, str: o.str }; });
  return { ch, cut: mix.cut, green: mix.green, fov: S.fovView, sion: -1, pad: S.pad, badge: null, ...ex };
}
const lvl = (st, id) => st.ch[id].on ? st.ch[id].str : 0;
const has = (st, id, i) => st.ch[id].on && st.ch[id].str >= CHI[id].thr[i];
const gain = (st, id) => st.ch[id].on ? .35 + .65 * st.ch[id].str : 0;

/* ---------- the hit as a timeline: real time maps to action time, so hit stop freezes it and slow motion stretches it ---------- */
const stopFrames = st => has(st, 'time', 0) ? Math.round(2 + 14 * Math.pow(lvl(st, 'time'), 1.4)) : 0;
function timeline(st) {
  const wind = st.cut ? .08 : .3, strike = .07, stopF = stopFrames(st), slow = has(st, 'time', 2);
  const press = .45, imp = press + wind + strike, seg = [];   // [real a, real b, action a, action b, kind]
  let r = 0, a = 0;
  const add = (dr, da, k) => { seg.push([r, r + dr, a, a + da, k]); r += dr; a += da; };
  add(imp, imp, 'play');
  if (stopF) add(stopF / 60, 0, 'stop');
  if (slow) add(.55, .16, 'slow');
  add(1.25 - (slow ? .16 : 0), 1.25 - (slow ? .16 : 0), 'play');
  return { seg, len: r, press, wind, wEnd: press + wind, imp, stopF, slow };
}
function actionAt(TL, t) {
  t = ((t % TL.len) + TL.len) % TL.len;
  const s = TL.seg.find(x => t >= x[0] && t < x[1]) || TL.seg[TL.seg.length - 1];
  const a = lerp(s[2], s[3], (t - s[0]) / Math.max(1e-6, s[1] - s[0]));
  return { t, a, kind: s[4], stopping: s[4] === 'stop', stopFor: s[4] === 'stop' ? t - s[0] : 0 };
}
// the knight's and the dummy's poses at action time a (the 2D version's numbers, in metres and radians)
function pose(st, a, TL) {
  const animOn = st.ch.anim.on, an = lvl(st, 'anim'), ex = .4 + an, { press, wEnd, imp } = TL;
  const rest = 1.0, up = animOn ? -2.0 - .7 * an : -1.6, impA = .3, over = animOn && has(st, 'anim', 1) ? 1.0 + .5 * an : impA;
  let ang = rest, lean = 0, lunge = 0, crouch = 0;
  if (a < press) ang = rest;
  else if (a < wEnd) {
    const k = (a - press) / TL.wind;
    ang = lerp(st.cut ? lerp(rest, up, .75) : rest, up, animOn ? eOut(k) : k);
    lean = animOn ? -10 * ex * eOut(k) : 0; crouch = animOn ? .07 * ex * eOut(k) : 0;
  } else if (a < imp) {
    const k = (a - wEnd) / (imp - wEnd);
    ang = lerp(up, impA, animOn ? eIn(k) : k); lean = animOn ? lerp(-10 * ex, 8 * ex, k) : 0; lunge = animOn ? 22 * ex * k : 0; crouch = animOn ? .07 * ex * (1 - k) : 0;
  } else {
    const d = a - imp;
    if (animOn && has(st, 'anim', 1)) ang = d < .12 ? lerp(impA, over, eOut(d / .12)) : lerp(over, rest, eIO(clamp((d - .12) / .6)));
    else ang = lerp(impA, rest, clamp(d / .5));
    lean = animOn ? 8 * ex * (1 - eIO(clamp(d / .6))) : 0; lunge = animOn ? 22 * ex * (1 - eIO(clamp(d / .7))) : 0;
    crouch = animOn && has(st, 'anim', 1) ? .05 * ex * Math.sin(clamp(d / .5) * Math.PI) : 0;
  }
  const since = a - imp;
  const recoil = has(st, 'anim', 2) && since >= 0 ? 18 * ex * (since < .05 ? since / .05 : Math.exp(-(since - .05) * 5)) * Math.cos(since * 14) : 0;
  return { ang, lean: lean * .012, lunge: lunge * .012, crouch, recoil: recoil * .012, since };
}
const rumble = (st, a, TL) => {
  let v = 0;
  if (has(st, 'hap', 1) && a > TL.press && a < TL.imp) v = Math.max(v, .15 + .45 * (a - TL.press) / (TL.imp - TL.press));
  if (has(st, 'hap', 0) && a >= TL.imp) v = Math.max(v, Math.exp(-(a - TL.imp) * 16));
  return v * (.3 + .7 * lvl(st, 'hap'));
};
// how hard each channel is firing at this moment: drives the desk meters and the multitrack
function levels(st, TL, A) {
  const a = A.a, s = a - TL.imp, hit = s >= 0, out = {};
  const p = pose(st, a, TL), p2 = pose(st, Math.max(0, a - 1 / 60), TL);
  out.anim = clamp(Math.abs(p.ang - p2.ang) * 3.2 + Math.abs(p.recoil) * 4 + Math.abs(p.lunge - p2.lunge) * 30) * gain(st, 'anim');
  out.vfx = (A.stopping ? 1 : hit ? Math.exp(-s * 7) : a > TL.wEnd ? .55 : 0) * gain(st, 'vfx');
  out.sfx = Math.max(hit ? Math.exp(-s * 6) : 0, has(st, 'sfx', 1) && a > TL.press + TL.wind * .5 && !hit ? .55 : 0, has(st, 'sfx', 2) && s > .15 && s < .7 ? .4 : 0) * (has(st, 'sfx', 0) || !hit ? 1 : .6) * gain(st, 'sfx');
  out.time = (A.stopping ? 1 : A.kind === 'slow' ? .55 : 0) * (st.ch.time.on ? 1 : 0);
  out.cam = (hit ? Math.exp(-s * 9) : 0) * gain(st, 'cam');
  out.ui = Math.max(hit ? clamp(1.5 - s * 1.4) : 0, a >= TL.press && a < TL.press + .12 ? .5 : 0) * gain(st, 'ui');
  out.mat = (A.stopping ? 1 : hit ? Math.exp(-s * 3) : 0) * gain(st, 'mat');
  out.hap = rumble(st, a, TL);
  IDS.forEach(id => { if (!st.ch[id].on) out[id] = 0; });
  return out;
}

/* ---------- the 3D scene ---------- */
const V3 = THREE.Vector3;
function canvasTex(w, h, draw, rep) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); }
  return t;
}
const glowTex = (inner, outer) => canvasTex(128, 128, (g, w) => {
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, inner); r.addColorStop(.35, outer); r.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = r; g.fillRect(0, 0, w, w);
});
function build3D(canvas) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' }); }
  catch (e) { return null; }
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1)); renderer.setSize(VW, VH, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene(), BG = new THREE.Color('#0a1024');
  scene.background = BG; scene.fog = new THREE.Fog(BG, 8, 20);
  const cam = new THREE.PerspectiveCamera(70, VW / VH, .05, 60);
  // a soft studio environment so steel reads as steel: a gradient dome with a warm and a cold panel, prefiltered once
  {
    const env = new THREE.Scene(), dome = canvasTex(64, 256, (g, w, h) => { const r = g.createLinearGradient(0, 0, 0, h); r.addColorStop(0, '#9bb4ff'); r.addColorStop(.48, '#3a4670'); r.addColorStop(.52, '#2a2018'); r.addColorStop(1, '#0c0a08'); g.fillStyle = r; g.fillRect(0, 0, w, h); });
    env.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.MeshBasicMaterial({ map: dome, side: THREE.BackSide })));
    [[-6, 5, 5, '#ffd9a8', 9], [5, 3, -6, '#7fa6ff', 6]].forEach(([x, y, z, c, k]) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(5, 3), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m); });
    const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(env, .02).texture; pm.dispose();
  }
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .7, metalness: 0, ...o });
  const mesh = (geo, mat, parent, pos, rot, cast = true) => {
    const m = new THREE.Mesh(geo, mat); if (pos) m.position.set(...pos); if (rot) m.rotation.set(...rot);
    m.castShadow = cast; m.receiveShadow = true; parent.add(m); return m;
  };

  // light: a warm key from the front left, a cold rim from behind, the braziers, and the hit flash
  scene.add(new THREE.HemisphereLight('#8ea6ff', '#3a2618', .5));
  const key = new THREE.DirectionalLight('#ffe0b5', 3.2); key.position.set(-3.5, 7, 4.5); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -2, near: 1, far: 20 }); key.shadow.bias = -.0005;
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight('#6f9dff', 1.6); rim.position.set(2.5, 4, -6); scene.add(rim);
  const hitLight = new THREE.PointLight('#ffd27a', 0, 3.5, 2); scene.add(hitLight);

  // the arena: flagstones, a raised training ring, pillars with braziers and banners
  const stone = canvasTex(512, 512, (g, w) => {
    g.fillStyle = '#4b4f5e'; g.fillRect(0, 0, w, w);
    for (let y = 0, r = 0; y < w; y += 64, r++) for (let x = (r % 2) * -32; x < w; x += 64) {
      const v = 70 + hash(x * 3.1 + y * 7.7) * 26; g.fillStyle = `rgb(${v},${v + 3},${v + 14})`; g.fillRect(x + 2, y + 2, 60, 60);
      for (let i = 0; i < 18; i++) { g.fillStyle = `rgba(0,0,0,${.05 + hash(i + x + y) * .06})`; g.fillRect(x + 4 + hash(i * 3 + x) * 52, y + 4 + hash(i * 5 + y) * 52, 3, 3); }
    }
  }, 6);
  const floor = mesh(new THREE.CircleGeometry(16, 64), std('#ffffff', { map: stone, roughness: .92 }), scene, [0, 0, 0], [-Math.PI / 2, 0, 0], false);
  const ringTex = canvasTex(512, 512, (g, w) => {
    g.fillStyle = '#7a6a55'; g.fillRect(0, 0, w, w);
    for (let i = 0; i < 2200; i++) { g.fillStyle = `rgba(${hash(i) > .5 ? '255,240,210' : '40,28,18'},${.06 + hash(i + 9) * .08})`; g.fillRect(hash(i + 1) * w, hash(i + 2) * w, 2 + hash(i + 3) * 5, 2); }
  }, 3);
  mesh(new THREE.CylinderGeometry(3, 3.1, .08, 64), std('#ffffff', { map: ringTex, roughness: .95 }), scene, [0, .04, 0], null, false);
  mesh(new THREE.TorusGeometry(3.05, .07, 8, 80), std('#8a6a3a', { roughness: .6 }), scene, [0, .08, 0], [Math.PI / 2, 0, 0], false);
  const pillarMat = std('#3b4058', { roughness: .85 }), bannerMat = std('#8e2a2a', { roughness: .9, side: THREE.DoubleSide }), trim = std('#c9a14a', { metalness: .7, roughness: .35 });
  const flames = [];
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i - 4.5) * .36; if (Math.abs(ang + Math.PI / 2) > 1.62) continue;
    const x = Math.cos(ang) * 7.2, z = Math.sin(ang) * 7.2;
    mesh(new THREE.CylinderGeometry(.42, .5, 5, 12), pillarMat, scene, [x, 2.5, z]);
    mesh(new THREE.BoxGeometry(1.1, .28, 1.1), pillarMat, scene, [x, .14, z]);
    mesh(new THREE.BoxGeometry(1.05, .22, 1.05), pillarMat, scene, [x, 4.9, z]);
    if (i % 2) { const b = mesh(new THREE.PlaneGeometry(.8, 2.1), bannerMat, scene, [x * .93, 3.1, z * .93], null, false); b.lookAt(0, 3.1, 0); mesh(new THREE.BoxGeometry(.9, .06, .06), trim, b, [0, 1.06, .01], null, false); mesh(new THREE.BoxGeometry(.5, .5, .01), trim, b, [0, .35, .01], [0, 0, Math.PI / 4], false); }
    else {
      const bx = x * .9, bz = z * .9;
      mesh(new THREE.CylinderGeometry(.22, .12, .3, 10), std('#2a2d38', { metalness: .6, roughness: .4 }), scene, [bx, 3.05, bz]);
      const fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('rgba(255,240,190,1)', 'rgba(255,120,30,.55)'), blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
      fl.position.set(bx, 3.35, bz); fl.scale.set(.9, 1.2, 1); scene.add(fl);
      const pl = new THREE.PointLight('#ff9a3c', 6, 6, 2); pl.position.set(bx, 3.4, bz); scene.add(pl);
      flames.push({ fl, pl, seed: i });
    }
  }
  // props for depth: a weapon rack and crates
  const wood = std('#6b4a2a', { roughness: .8 }), woodDk = std('#4a321c', { roughness: .85 });
  [[-3.6, -2.4, .3], [-4.3, -1.6, -.4], [4.2, -2.2, .2]].forEach(([x, z, r], i) => mesh(new THREE.BoxGeometry(.7, .7, .7), i % 2 ? woodDk : wood, scene, [x, .35, z], [0, r, 0]));
  mesh(new THREE.BoxGeometry(.5, .5, .5), wood, scene, [-3.75, .95, -2.35], [0, .7, 0]);
  const rack = new THREE.Group(); rack.position.set(3.4, 0, -3.4); rack.rotation.y = -.5; scene.add(rack);
  mesh(new THREE.BoxGeometry(2, .08, .1), wood, rack, [0, 1.3, 0]); mesh(new THREE.BoxGeometry(2, .08, .1), wood, rack, [0, .5, 0]);
  [-.95, .95].forEach(x => mesh(new THREE.BoxGeometry(.1, 1.5, .1), wood, rack, [x, .75, 0]));
  for (let i = 0; i < 4; i++) mesh(new THREE.BoxGeometry(.05, 1.5, .02), std('#b9c0d0', { metalness: .8, roughness: .3 }), rack, [-.6 + i * .4, .85, .08], [0, 0, .1]);

  // the knight: faces +x, sword in the right hand on the camera side
  const steel = std('#aab3c8', { metalness: .78, roughness: .3 }), dark = std('#2b2f3d', { roughness: .65 }), cloth = std('#a92f2a', { roughness: .85 }), gold = std('#d7a443', { metalness: .8, roughness: .3 });
  const knight = new THREE.Group(); scene.add(knight);
  const legs = [];
  [[.17, .12], [-.17, -.12]].forEach(([x, z]) => { const L = new THREE.Group(); L.position.set(x, .9, z); knight.add(L); mesh(new THREE.CapsuleGeometry(.11, .5, 4, 10), dark, L, [0, -.42, 0]); mesh(new THREE.BoxGeometry(.3, .14, .17), steel, L, [.05, -.84, 0]); legs.push(L); });
  const hips = new THREE.Group(); hips.position.y = .9; knight.add(hips);
  mesh(new THREE.CapsuleGeometry(.27, .32, 6, 14), steel, hips, [0, .36, 0]);
  mesh(new THREE.TorusGeometry(.27, .045, 8, 24), std('#5a3a20'), hips, [0, .1, 0], [Math.PI / 2, 0, 0]);
  mesh(new THREE.BoxGeometry(.1, .36, .3), cloth, hips, [.26, .02, 0], [0, 0, -.1]);
  [-.3, .3].forEach(z => mesh(new THREE.SphereGeometry(.15, 14, 10), steel, hips, [0, .6, z]).scale.set(1.1, .6, 1));
  const head = new THREE.Group(); head.position.set(0, .92, 0); hips.add(head);
  mesh(new THREE.CylinderGeometry(.08, .1, .14, 10), dark, hips, [0, .76, 0]);
  mesh(new THREE.SphereGeometry(.2, 18, 14), steel, head);
  mesh(new THREE.BoxGeometry(.06, .035, .26), std('#05070d'), head, [.185, .02, 0]);
  mesh(new THREE.BoxGeometry(.04, .2, .03), gold, head, [.2, -.04, 0]);
  const plume = mesh(new THREE.ConeGeometry(.07, .42, 10), cloth, head, [-.12, .26, 0], [0, 0, 1.0]);
  const capeP = new THREE.Group(); capeP.position.set(-.2, .64, 0); hips.add(capeP);
  mesh(new THREE.BoxGeometry(.04, .95, .56), cloth, capeP, [-.02, -.47, 0]);
  const shield = new THREE.Group(); shield.position.set(.22, .32, -.36); shield.rotation.set(0, -.5, 0); hips.add(shield);
  mesh(new THREE.CylinderGeometry(.3, .3, .05, 24), cloth, shield, [0, 0, 0], [0, 0, Math.PI / 2]);
  mesh(new THREE.TorusGeometry(.3, .03, 8, 24), gold, shield, [0, 0, 0], [0, Math.PI / 2, 0]);
  mesh(new THREE.SphereGeometry(.07, 10, 8), gold, shield, [.03, 0, 0]);
  const arm = new THREE.Group(); arm.position.set(.03, .62, .3); arm.rotation.order = 'YXZ'; arm.rotation.y = .08; hips.add(arm);
  mesh(new THREE.CapsuleGeometry(.075, .32, 4, 10), steel, arm, [.2, 0, 0], [0, 0, Math.PI / 2]);
  mesh(new THREE.SphereGeometry(.07, 10, 8), dark, arm, [.42, 0, 0]);
  mesh(new THREE.CylinderGeometry(.025, .025, .18, 8), std('#3a2414'), arm, [.47, 0, 0], [0, 0, Math.PI / 2]);
  mesh(new THREE.SphereGeometry(.04, 8, 6), gold, arm, [.37, 0, 0]);
  mesh(new THREE.BoxGeometry(.05, .05, .3), gold, arm, [.57, 0, 0]);
  const bladeMat = std('#e3e8f4', { metalness: .9, roughness: .18, emissive: new THREE.Color('#9fd8ff'), emissiveIntensity: 0 });
  mesh(new THREE.BoxGeometry(.9, .1, .025), bladeMat, arm, [1.03, 0, 0]);
  mesh(new THREE.ConeGeometry(.05, .12, 4), bladeMat, arm, [1.52, 0, 0], [0, 0, -Math.PI / 2]);

  // the training dummy: a post, a straw body on a pivot (so it can tilt and wobble), arms, a burlap head
  const DX = .75;
  const burlap = canvasTex(256, 256, (g, w) => {
    g.fillStyle = '#c9a25a'; g.fillRect(0, 0, w, w);
    for (let i = 0; i < w; i += 4) { g.fillStyle = `rgba(90,60,20,${.12 + hash(i) * .1})`; g.fillRect(i, 0, 1.5, w); g.fillRect(0, i, w, 1.5); }
    for (let i = 0; i < 300; i++) { g.strokeStyle = `rgba(255,230,150,${.25 + hash(i) * .3})`; g.lineWidth = 1; g.beginPath(); const x = hash(i + 2) * w, y = hash(i + 7) * w; g.moveTo(x, y); g.lineTo(x + (hash(i + 3) - .5) * 20, y + hash(i + 5) * 14); g.stroke(); }
  }, 2);
  const dumMat = std('#ffffff', { map: burlap, roughness: .95, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0 });
  const dummy = new THREE.Group(); dummy.position.set(DX, 0, 0); scene.add(dummy);
  mesh(new THREE.CylinderGeometry(.34, .4, .14, 16), woodDk, dummy, [0, .07, 0]);
  mesh(new THREE.CylinderGeometry(.06, .07, 1, 10), wood, dummy, [0, .6, 0]);
  const piv = new THREE.Group(); piv.position.y = .85; dummy.add(piv);
  const body = new THREE.Group(); piv.add(body);
  mesh(new THREE.CapsuleGeometry(.3, .45, 6, 16), dumMat, body, [0, .4, 0]);
  [.18, .62].forEach(y => mesh(new THREE.TorusGeometry(.305, .025, 6, 24), std('#6a4a24'), body, [0, y, 0], [Math.PI / 2, 0, 0]));
  mesh(new THREE.CylinderGeometry(.05, .05, 1.3, 8), wood, body, [0, .66, 0], [Math.PI / 2, 0, 0]);
  [-.68, .68].forEach(z => mesh(new THREE.ConeGeometry(.09, .2, 8), dumMat, body, [0, .66, z], [z > 0 ? Math.PI / 2 : -Math.PI / 2, 0, 0]));
  mesh(new THREE.SphereGeometry(.2, 16, 12), dumMat, body, [0, 1.1, 0]);
  // slash decal: two dark cuts on the side facing the knight and the camera
  const decalMat = new THREE.MeshBasicMaterial({ color: '#2a1608', transparent: true, opacity: 0 });
  const decal = new THREE.Group(); decal.position.set(-.27, .42, .13); decal.lookAt(new V3(-1, .42, .5)); body.add(decal);
  [[0, .05, .6], [.02, -.06, .5]].forEach(([x, y, r]) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(.34, .035), decalMat); m.position.set(x, y, .012); m.rotation.z = r; decal.add(m); });
  const HP = new V3(DX - .27, 1.27, .13);   // where the blade meets the burlap, in the world

  // effects
  const add = (o) => { scene.add(o); return o; };
  const addMat = (map, color = '#ffffff') => new THREE.SpriteMaterial({ map, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false });
  const flash = add(new THREE.Sprite(addMat(glowTex('rgba(255,255,255,1)', 'rgba(255,200,90,.6)')))); flash.position.copy(HP);
  const shock = add(new THREE.Mesh(new THREE.RingGeometry(.85, 1, 64), new THREE.MeshBasicMaterial({ color: '#fff1c4', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })));
  shock.position.copy(HP);
  const NS = 56, sparks = add(new THREE.InstancedMesh(new THREE.BoxGeometry(.016, .016, 1), new THREE.MeshBasicMaterial({ color: '#ffb347', blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false }), NS));
  sparks.frustumCulled = false;
  const NW = 44, straw = add(new THREE.InstancedMesh(new THREE.BoxGeometry(.014, .014, .17), std('#e6c46c', { roughness: .8 }), NW));
  straw.castShadow = true; straw.frustumCulled = false;
  const scuff = mesh(new THREE.CircleGeometry(.32, 24), new THREE.MeshBasicMaterial({ color: '#16110c', transparent: true, opacity: 0, depthWrite: false }), scene, [0, .085, 0], [-Math.PI / 2, 0, 0], false);
  scuff.scale.set(1.6, .7, 1); scuff.receiveShadow = false;
  const dustTex = glowTex('rgba(210,190,160,.9)', 'rgba(170,150,120,.35)'), dust = [];
  for (let i = 0; i < 7; i++) { const s = add(new THREE.Sprite(new THREE.SpriteMaterial({ map: dustTex, transparent: true, depthWrite: false, opacity: 0 }))); dust.push(s); }
  // the swing trail: a ribbon from the blade's mid point to its tip, sampled back in action time
  const trailGeo = new THREE.BufferGeometry(), tPos = new Float32Array(TS * 2 * 3), tCol = new Float32Array(TS * 2 * 3), idx = [];
  for (let i = 0; i < TS - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  trailGeo.setIndex(idx); trailGeo.setAttribute('position', new THREE.BufferAttribute(tPos, 3)); trailGeo.setAttribute('color', new THREE.BufferAttribute(tCol, 3));
  const trail = add(new THREE.Mesh(trailGeo, new THREE.MeshBasicMaterial({ vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })));
  trail.frustumCulled = false;

  return { renderer, scene, cam, key, hitLight, flames, knight, legs, hips, head, plume, capeP, arm, bladeMat, dummy, piv, body, dumMat, decal, decalMat, HP, flash, shock, sparks, straw, scuff, dust, trail, tPos, tCol, trailGeo, DX, pr: 0 };
}

const KX = -.95;   // the knight's rest position

/* ---------- the Elden Ring knight: the Haligtree Knight set with a Longsword, playing the straight sword's first light
   attack. Files come from the Move Explorer export (GameCombatAnimationLibrary, tools/frame_data/export_er_models.py):
   the armor glb is skinned to the c0000 skeleton, er/a023_030000.bin is the move baked to one pose per frame at 30 fps
   (FDA2: smallest-three quaternions and millimetre translations per bone, then root motion). The move's own hit
   frames are 14 to 16. The clip is driven by the hit's action time, never by a clock, so hit stop freezes it and
   window.__seek stays deterministic. If the files fail to load, the grey-box knight stays. ---------- */
const ER = { dir: 'er/', armor: 'armor-haligtree-knight.glb', weapon: 'weapon-wp_a_0200.glb', anim: 'a023_030000.bin', fps: 30,
  windTop: 10, impact: 14, end: 26, height: 1.85 };
let modelReady = Promise.resolve(false);
function decodeAnim(buf, names) {
  const dv = new DataView(buf), B = dv.getUint16(4, true), N = dv.getUint16(6, true), hasRoot = dv.getUint8(8);
  const step = dv.getUint8(9) || 1, M = Math.ceil(N / step);
  let o = 10; const ids = [], flags = [];
  for (let k = 0; k < B; k++, o += 2) ids.push(dv.getUint16(o, true));
  for (let k = 0; k < B; k++, o++) flags.push(dv.getUint8(o));
  const S2 = Math.SQRT1_2, bones = [];
  for (let k = 0; k < B; k++) {
    const nr = flags[k] & 1 ? M : 1, np = flags[k] & 2 ? M : 1, rot = new Float32Array(nr * 4), pos = new Float32Array(np * 3);
    for (let i = 0; i < nr; i++, o += 4) {
      const v = dv.getUint32(o, true), big = v >>> 30; let jj = 0, ss = 0;
      for (let c = 0; c < 4; c++) { if (c === big) continue; const x = ((v >>> (20 - 10 * jj++)) & 1023) / 1023 * 2 * S2 - S2; rot[i * 4 + c] = x; ss += x * x; }
      rot[i * 4 + big] = Math.sqrt(Math.max(0, 1 - ss));
    }
    for (let i = 0; i < np * 3; i++, o += 2) pos[i] = dv.getInt16(o, true) / 1000;
    bones.push({ name: names[ids[k]], rot, pos, nr, np });
  }
  let root = null;
  if (hasRoot) { root = new Float32Array(N * 3); for (let i = 0; i < N * 3; i++, o += 4) root[i] = dv.getFloat32(o, true); }
  return { frames: N, bones, root };
}
function loadModel(R) {
  const gl = url => new Promise((ok, no) => new GLTFLoader().load(ER.dir + url, ok, undefined, no));
  const get = url => fetch(ER.dir + url).then(r => { if (!r.ok) throw new Error(url); return url.endsWith('.json') ? r.json() : r.arrayBuffer(); });
  modelReady = Promise.all([gl(ER.armor), gl(ER.weapon), get(ER.anim), get('skeleton.json')]).then(([ag, wg, ab, sk]) => {
    const anim = decodeAnim(ab, sk.bones);
    // game space is left-handed: mirror X once; the character faces +z there, the scene wants +x
    const wrap = new THREE.Group(), mirror = new THREE.Group(), motion = new THREE.Group();
    wrap.rotation.y = Math.PI / 2; mirror.scale.x = -1; wrap.add(mirror); mirror.add(motion);
    const body = ag.scene; motion.add(body);
    body.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } });
    const tracks = anim.bones.map(b => body.getObjectByName(b.name));
    const wb = body.getObjectByName(sk.weaponBone), sword = wg.scene.clone(); sword.rotation.z = Math.PI; wb.add(sword);
    sword.traverse(o => { if (o.isMesh) o.castShadow = true; });
    // the blade's far end in the sword's own space: the longest axis of its bounds, away from the grip
    const bb = new THREE.Box3().setFromObject(wg.scene), ext = [bb.min, bb.max].map(v => v.toArray());
    const ax = [0, 1, 2].reduce((m, a) => Math.abs(bb.max.getComponent(a) - bb.min.getComponent(a)) > Math.abs(bb.max.getComponent(m) - bb.min.getComponent(m)) ? a : m, 0);
    const far = Math.abs(ext[1][ax]) > Math.abs(ext[0][ax]) ? ext[1][ax] : ext[0][ax], tip = new V3(); tip.setComponent(ax, far);
    R.knight.children.forEach(c => { c.visible = false; }); R.knight.add(wrap);
    const M = { wrap, motion, body, anim, tracks, sword, tip, k: 1 };
    R.model = M;
    // scale to the scene's knight height, then stand him so the blade lands on the dummy at the hit frame
    poseFrame(M, 1); wrap.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(body); M.k = ER.height / Math.max(.5, box.max.y - box.min.y); wrap.scale.setScalar(M.k);
    poseFrame(M, ER.impact); R.knight.position.set(KX, 0, 0); R.knight.updateMatrixWorld(true);
    const tp = modelBladePoint(R, 1, new V3()), mid = modelBladePoint(R, .55, new V3());
    // slide him along x until the blade crosses the burlap, then put the contact point where the blade meets it
    wrap.position.x += (R.DX - .05) - Math.max(tp.x, mid.x);
    R.knight.updateMatrixWorld(true); modelBladePoint(R, .8, tp);
    R.HP.set(R.DX - .27, clamp(tp.y, .95, 1.6), clamp(tp.z, -.2, .3));
    R.flash.position.copy(R.HP); R.shock.position.copy(R.HP); R.decal.position.y = R.HP.y - .85;
    return true;
  }).catch(e => { console.warn('Elden Ring model not loaded; keeping the grey-box knight', e); return false; });
  return modelReady;
}
// one pose per clip frame (1-based, fractional frames blend the two around them)
const qa = [0, 0, 0, 1], pv = new V3();
function poseFrame(M, f) {
  const A = M.anim, u = clamp(f - 1, 0, A.frames - 1), k0 = Math.floor(u), k1 = Math.min(k0 + 1, A.frames - 1), t = u - k0;
  A.bones.forEach((b, i) => {
    const o = M.tracks[i]; if (!o) return;
    if (b.nr > 1) { THREE.Quaternion.slerpFlat(qa, 0, b.rot, k0 * 4, b.rot, k1 * 4, t); o.quaternion.fromArray(qa); } else o.quaternion.fromArray(b.rot, 0);
    if (b.np > 1) { o.position.fromArray(b.pos, k0 * 3).lerp(pv.fromArray(b.pos, k1 * 3), t); } else o.position.fromArray(b.pos, 0);
  });
  // root motion: the step into the swing, stopped a few frames after the hit so he doesn't walk through the dummy
  if (A.root) { const r0 = Math.min(k0, ER.impact + 3), r1 = Math.min(k1, ER.impact + 3); M.motion.position.fromArray(A.root, r0 * 3).lerp(pv.fromArray(A.root, r1 * 3), t); M.motion.position.z *= -1; }
}
// the clip frame for action time a: the swing's three phases map onto the move's own wind-up, strike and recovery.
// With the animation channel off the knight snaps from his idle pose to the hit frame and back, no anticipation.
function clipFrame(st, a, TL) {
  const animOn = st.ch.anim.on;
  if (a < TL.press) return 1;
  if (!animOn) {
    if (a < TL.wEnd) return 1;
    if (a < TL.imp) return lerp(1, ER.impact, (a - TL.wEnd) / (TL.imp - TL.wEnd));
    return lerp(ER.impact, 1, clamp((a - TL.imp) / .4));
  }
  if (a < TL.wEnd) { const k = (a - TL.press) / TL.wind; return lerp(st.cut ? lerp(1, ER.windTop, .7) : 1, ER.windTop, k); }
  if (a < TL.imp) return lerp(ER.windTop, ER.impact, (a - TL.wEnd) / (TL.imp - TL.wEnd));
  const d = a - TL.imp;
  return has(st, 'anim', 1) ? Math.min(ER.end, ER.impact + d * ER.fps) : lerp(ER.impact, 1, clamp(d / .5));
}
function poseModel(R, st, a, TL) { if (R.model) poseFrame(R.model, clipFrame(st, a, TL)); }
// world position of a point on the Longsword, d = 0 at the grip to 1 at the tip
function modelBladePoint(R, d, out) {
  const M = R.model; M.sword.updateWorldMatrix(true, false);
  return M.sword.localToWorld(out.copy(M.tip).multiplyScalar(d));
}
const tmpO = new THREE.Object3D(), tmpV = new V3(), tmpV2 = new V3();
// a point on the blade (d metres from the shoulder) at a pose, in world space, without touching the scene graph
function bladePoint(p, d, out) {
  const hx = KX + p.lunge, hy = .9 - p.crouch, sx = .03, sy = .62, lean = -p.lean;
  // shoulder in the hips frame, rotated by the lean about z
  const cx = Math.cos(lean), sn = Math.sin(lean);
  const shx = hx + sx * cx - sy * sn, shy = hy + sx * sn + sy * cx;
  const a = -p.ang + lean, ry = .08;
  return out.set(shx + Math.cos(a) * d * Math.cos(ry), shy + Math.sin(a) * d, .3 - Math.cos(a) * d * Math.sin(ry));
}

function render3D(R, st, t) {
  const TL = timeline(st), A = actionAt(TL, t), a = A.a, p = pose(st, a, TL), s = p.since, hit = s >= 0;
  const vfx = lvl(st, 'vfx'), mat = lvl(st, 'mat'), camL = lvl(st, 'cam'), tm = lvl(st, 'time');
  // knight
  R.knight.position.set(R.model ? KX : KX + p.lunge, 0, 0);
  R.hips.position.y = .9 - p.crouch; R.hips.rotation.z = -p.lean;
  R.arm.rotation.z = -p.ang;
  R.legs[0].rotation.z = -p.lunge * .9 - p.crouch * 1.5; R.legs[1].rotation.z = p.lunge * .7 + p.crouch;
  R.capeP.rotation.z = p.lean * 1.4 - p.lunge * .6; R.plume.rotation.z = 1.0 + p.lean * 1.5;
  if (R.model) poseModel(R, st, a, TL);
  R.bladeMat.emissiveIntensity = has(st, 'vfx', 0) && a > TL.wEnd && a < TL.imp + .12 ? .8 * (.4 + vfx) : 0;
  // dummy: recoil (animation), wobble while frozen (time), hit flash (materials)
  const wob = has(st, 'time', 1) && A.stopping ? Math.sin(A.stopFor * 90) * .035 * (.5 + tm) : 0;
  R.dummy.position.x = R.DX + wob;
  R.piv.rotation.z = -p.recoil; R.piv.rotation.x = has(st, 'anim', 2) && hit ? p.recoil * .25 : 0;
  const sq = has(st, 'anim', 2) && hit ? .08 * (.4 + lvl(st, 'anim')) * Math.exp(-s * 10) : 0;
  R.body.scale.set(1 + sq, 1 - sq, 1 + sq);
  R.dumMat.emissiveIntensity = has(st, 'mat', 0) && (A.stopping || hit && s < .07) ? (A.stopping ? 1.4 : 1.4 * (1 - s / .07)) * (.5 + mat) : 0;
  R.decalMat.opacity = has(st, 'mat', 1) && hit ? .55 + .45 * mat : 0;
  // light flash and the impact flare (VFX)
  const fk = A.stopping ? 1 : hit ? Math.exp(-s * 12) : 0;
  R.hitLight.position.copy(R.HP).add(tmpV.set(.15, .25, .45));
  R.hitLight.intensity = has(st, 'vfx', 2) ? 12 * (.4 + vfx) * fk : 0;
  R.renderer.toneMappingExposure = 1.15 + (has(st, 'vfx', 2) ? .18 * vfx * fk : 0);
  const fl = has(st, 'vfx', 1) && (A.stopping || hit && s < .16);
  R.flash.visible = fl; if (fl) { const k = A.stopping ? 1 : 1 - s / .16, sc = (.7 + 1.1 * vfx) * (A.stopping ? 1 : 1 + s * 3); R.flash.scale.set(sc, sc, 1); R.flash.material.opacity = k; }
  const sh = has(st, 'vfx', 1) && hit && s > 0 && s < .32;
  R.shock.visible = sh; if (sh) { const k = s / .32, sc = .1 + (.45 + .7 * vfx) * eOut(k); R.shock.scale.set(sc, sc, sc); R.shock.material.opacity = (1 - k) * .9; R.shock.lookAt(R.cam.position); }
  // sparks: they wait for the freeze to end, then burst
  let ns = 0;
  if (has(st, 'vfx', 1) && hit && s > 0 && s < .6) {
    const n = Math.round(10 + 46 * vfx);
    for (let i = 0; i < n && i < 56; i++) {
      const life = .25 + hash(i + 11) * .3; if (s > life) continue;
      const th = (hash(i) - .5) * 2.4, ph = (hash(i + 3) - .3) * 1.6, sp = 3 + hash(i + 5) * 5 * (.5 + vfx);
      const vx = Math.cos(ph) * Math.cos(th) * .4 - .6 * Math.cos(ph), vy = Math.sin(ph) * 1.2 + .6, vz = Math.cos(ph) * Math.sin(th) * 1.2;
      tmpV.set(vx, vy, vz).normalize().multiplyScalar(sp);
      tmpO.position.set(R.HP.x + tmpV.x * s, R.HP.y + tmpV.y * s - 4.9 * s * s, R.HP.z + tmpV.z * s);
      tmpV2.set(tmpV.x, tmpV.y - 9.8 * s, tmpV.z);
      tmpO.lookAt(tmpO.position.x + tmpV2.x, tmpO.position.y + tmpV2.y, tmpO.position.z + tmpV2.z);
      const k = 1 - s / life; tmpO.scale.set(1.4 * k + .3, 1.4 * k + .3, .05 + tmpV2.length() * .025 * k);
      tmpO.updateMatrix(); R.sparks.setMatrixAt(ns++, tmpO.matrix);
    }
  }
  R.sparks.count = ns; R.sparks.instanceMatrix.needsUpdate = true;
  // straw: bursts from the cut and lands on the floor, where it stays
  let nw = 0;
  if (has(st, 'mat', 2) && hit && s > 0) {
    const n = Math.round(14 + 30 * mat);
    for (let i = 0; i < n && i < 44; i++) {
      const th = (hash(i + 40) - .5) * 2.6, sp = 1.4 + hash(i + 41) * 2.6 * (.5 + mat), up = 1 + hash(i + 42) * 2.4;
      const vx = Math.cos(th) * sp * .6 + .5, vz = Math.sin(th) * sp, y0 = R.HP.y;
      const tl = (up + Math.sqrt(up * up + 2 * 9.8 * (y0 - .1))) / 9.8, tt = Math.min(s, tl), landed = s >= tl;
      tmpO.position.set(R.HP.x + vx * tt, Math.max(.1, y0 + up * tt - 4.9 * tt * tt), R.HP.z + vz * tt);
      const spin = hash(i + 43) * 20 + 6;
      if (landed) tmpO.rotation.set(0, hash(i + 44) * TAU, 0); else tmpO.rotation.set(spin * tt, spin * .7 * tt + i, 0);
      tmpO.scale.setScalar(.7 + hash(i + 45) * .6); tmpO.updateMatrix(); R.straw.setMatrixAt(nw++, tmpO.matrix);
    }
  }
  R.straw.count = nw; R.straw.instanceMatrix.needsUpdate = true;
  // floor scuff and dust where the front foot lands
  const footX = KX + .3 + (st.ch.anim.on ? 22 * (.4 + lvl(st, 'anim')) * .012 : 0);
  const scuffOn = has(st, 'mat', 2) && st.ch.anim.on && a > TL.wEnd + .03;
  R.scuff.material.opacity = scuffOn ? .35 + .25 * mat : 0; R.scuff.position.x = footX;
  const ds = a - (TL.wEnd + .05);
  R.dust.forEach((d, i) => {
    const on = scuffOn && ds > 0 && ds < .9; d.visible = on; if (!on) return;
    const k = ds / .9, ang = (i / 7) * Math.PI - Math.PI / 2;
    d.position.set(footX + Math.cos(ang) * .1 + k * .5 * Math.cos(ang) * .6, .12 + k * .28 * (.6 + hash(i)), .12 + Math.sin(ang) * .3 * (.3 + k));
    const sc = .25 + k * .6 * (.6 + mat); d.scale.set(sc, sc, 1); d.material.opacity = (1 - k) * .45 * (.5 + mat);
  });
  // swing trail
  const trOn = has(st, 'vfx', 0) && a > TL.wEnd && a < TL.imp + .2;
  R.trail.visible = trOn;
  if (trOn) {
    const fade = a > TL.imp ? 1 - (a - TL.imp) / .2 : 1;
    for (let i = 0; i < TS; i++) {
      const aa = Math.max(TL.wEnd, a - i * .007), pp = pose(st, aa, TL), k = Math.pow(1 - i / (TS - 1), 2) * fade * (.3 + .5 * vfx);
      if (R.model) { poseModel(R, st, aa, TL); modelBladePoint(R, .45, tmpV).toArray(R.tPos, i * 6); modelBladePoint(R, 1, tmpV).toArray(R.tPos, i * 6 + 3); }
      else { bladePoint(pp, 1.15, tmpV).toArray(R.tPos, i * 6); bladePoint(pp, 1.55, tmpV).toArray(R.tPos, i * 6 + 3); }
      R.tCol.set([.25 * k, .55 * k, .8 * k, .75 * k, .95 * k, 1 * k], i * 6);
    }
    if (R.model) poseModel(R, st, a, TL);
    R.trailGeo.attributes.position.needsUpdate = true; R.trailGeo.attributes.color.needsUpdate = true; R.trailGeo.computeBoundingSphere();
  }
  // braziers flicker on the clock, so a frozen hit still feels alive around it (held still for the GIF, which stays smaller)
  R.flames.forEach(f => { const k = R.still ? .9 : .85 + .15 * Math.sin(t * 13 + f.seed) * Math.sin(t * 7.3 + f.seed * 2); f.pl.intensity = 6 * k; f.fl.scale.set(.85 * k, 1.15 * k, 1); });
  // camera: the lens (with a dolly so the subject keeps its size), orbit, shake toward the blow, zoom punch
  const fov0 = st.fov, r = 3.05 * Math.tan(35 * Math.PI / 180) / Math.tan(fov0 / 2 * Math.PI / 180);
  const yaw = -.2 + S.yaw, pitch = .2 + S.pitch, tgt = tmpV.set(-.05, 1.05, 0);
  R.cam.position.set(tgt.x + Math.sin(yaw) * Math.cos(pitch) * r, tgt.y + Math.sin(pitch) * r, tgt.z + Math.cos(yaw) * Math.cos(pitch) * r);
  R.cam.lookAt(tgt);
  let fov = fov0;
  if (has(st, 'cam', 1) && hit) fov *= 1 - .09 * camL * Math.exp(-s * 9);
  if (has(st, 'cam', 0) && hit) {
    const shk = .11 * camL * Math.exp(-s * 10);
    R.cam.translateX(shk * Math.cos(s * 58) * .9); R.cam.translateY(shk * Math.sin(s * 45) * .45); R.cam.rotateZ(shk * .5 * Math.sin(s * 51));
  }
  R.cam.fov = fov; R.cam.updateProjectionMatrix();
  R.renderer.render(R.scene, R.cam);
  return { TL, A, p };
}
const project = (R, v) => { const q = tmpV2.copy(v).project(R.cam); return { x: (q.x + 1) / 2 * VW, y: (1 - q.y) / 2 * VH, behind: q.z > 1 }; };

/* ---------- the 2D layer over the 3D view: UI channel, captions, meters, labels ---------- */
const sion = new Image(); sion.src = 'img/Sion.png';
function pill(g, text, x, y, { col = '#fff', bg = 'rgba(8,12,28,.78)', size = 13, align = 'left', weight = 700, font = 'Jost, sans-serif' } = {}) {
  g.font = `${weight} ${size}px ${font}`; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  const w = g.measureText(text).width, bx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  g.fillStyle = bg; g.beginPath(); g.roundRect(bx - 8, y - size - 3, w + 16, size + 11, 7); g.fill();
  g.fillStyle = col; g.fillText(text, bx, y);
  return w + 16;
}
function wrap(g, text, x, y, mw, lh) {
  const words = text.split(' '); let line = '', n = 0;
  words.forEach(w => { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > mw && line) { g.fillText(line, x, y + n++ * lh); line = w; } else line = t; });
  if (line) g.fillText(line, x, y + n++ * lh);
  return n;
}
function speaker(g, x, y, a, text) {
  if (a <= 0) return;
  g.save(); g.globalAlpha = clamp(a);
  g.font = '700 13px Jost, sans-serif'; const w = g.measureText(text).width;
  g.fillStyle = 'rgba(40,14,8,.85)'; g.beginPath(); g.roundRect(x - 8, y - 18, w + 44, 30, 8); g.fill();
  g.fillStyle = '#ff7a59'; g.beginPath(); g.moveTo(x, y - 7); g.lineTo(x + 5, y - 7); g.lineTo(x + 11, y - 12); g.lineTo(x + 11, y + 6); g.lineTo(x + 5, y + 1); g.lineTo(x, y + 1); g.closePath(); g.fill();
  g.strokeStyle = '#ff7a59'; g.lineWidth = 2; [6, 10].forEach(r => { g.beginPath(); g.arc(x + 12, y - 3, r, -.8, .8); g.stroke(); });
  g.fillStyle = '#fff'; g.textAlign = 'left'; g.fillText(text, x + 28, y + 2);
  g.restore();
}
function drawOverlay(g, R, st, t, fr) {
  const { TL, A } = fr, a = A.a, since = a - TL.imp, hit = since >= 0, ui = lvl(st, 'ui');
  const uiCol = c => st.green ? GREEN : c, uiRects = [];
  g.clearRect(0, 0, VW, VH);
  if (!R) { g.fillStyle = '#0a1024'; g.fillRect(0, 0, VW, VH); pill(g, 'This page needs WebGL for the 3D view. The desk still works.', VW / 2, VH / 2, { align: 'center', size: 16 }); }
  const hp = R ? project(R, R.HP) : { x: VW * .6, y: VH * .5 };
  // UI: damage number, hit marker, combo, health bar, button prompt
  if (has(st, 'ui', 0) && hit && since < 1) {
    const y = hp.y - 40 - since * 80, sz = 26 + 22 * ui, pop = since < .08 ? 1 + (1 - since / .08) * .5 : 1;
    g.save(); g.globalAlpha = clamp(1.6 - since * 1.6); g.translate(hp.x + 46, y); g.scale(pop, pop);
    g.font = `800 ${sz}px Montserrat, Jost, sans-serif`; g.textAlign = 'center'; g.lineWidth = 6; g.strokeStyle = '#151a33'; g.strokeText('27', 0, 0); g.fillStyle = uiCol('#ffdf4a'); g.fillText('27', 0, 0);
    g.restore(); uiRects.push(sz * 1.6 * sz);
  }
  if (has(st, 'ui', 2) && hit && since < .25) {
    g.strokeStyle = uiCol('#fff'); g.lineWidth = 4; const k = 12 + since * 40;
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([u, v]) => { g.beginPath(); g.moveTo(hp.x + u * k, hp.y + v * k); g.lineTo(hp.x + u * (k + 12), hp.y + v * (k + 12)); g.stroke(); });
    uiRects.push(60 * 60);
  }
  if (has(st, 'ui', 2) && hit) {
    const pop = since < .1 ? 1 + (1 - since / .1) * .4 : 1;
    g.save(); g.translate(VW - 40, 168); g.scale(pop, pop); g.font = '800 34px Montserrat, Jost, sans-serif'; g.textAlign = 'right'; g.lineWidth = 6; g.strokeStyle = '#151a33'; g.strokeText('1 HIT', 0, 0); g.fillStyle = uiCol('#ffb951'); g.fillText('1 HIT', 0, 0); g.restore();
    uiRects.push(130 * 40);
  }
  if (has(st, 'ui', 1)) {
    const lost = hit ? clamp(since / .25) : 0, chip = hit && !A.stopping ? clamp((since - .35) / .4) : 0;
    const bw = 320, bx = VW / 2 - bw / 2, by = 30;
    g.fillStyle = 'rgba(8,12,28,.8)'; g.beginPath(); g.roundRect(bx - 5, by - 5, bw + 10, 24, 6); g.fill();
    g.fillStyle = st.green ? GREEN : '#fff'; g.fillRect(bx, by, bw * lerp(1, .73, chip), 14);
    g.fillStyle = st.green ? GREEN : '#e5322d'; g.fillRect(bx, by, bw * lerp(1, .73, lost), 14);
    g.font = '700 12px Jost, sans-serif'; g.fillStyle = uiCol('#dfe7f8'); g.textAlign = 'center'; g.fillText('TRAINING DUMMY', VW / 2, by + 34);
    uiRects.push((bw + 10) * 40);
  }
  if (st.ch.ui.on) {
    const pr = a >= TL.press && a < TL.press + .12;
    g.fillStyle = st.green ? GREEN : pr ? '#39d0ff' : 'rgba(8,12,28,.75)'; g.beginPath(); g.arc(VW - 52, VH - 50, 24, 0, TAU); g.fill();
    g.strokeStyle = st.green ? GREEN : '#39d0ff'; g.lineWidth = 2; g.stroke();
    g.fillStyle = st.green ? '#103a08' : pr ? '#04121c' : '#fff'; g.font = '800 20px Montserrat, Jost, sans-serif'; g.textAlign = 'center'; g.fillText('X', VW - 52, VH - 43);
    uiRects.push(52 * 52);
  }
  if (st.green) {
    g.fillStyle = 'rgba(57,232,28,.07)'; g.fillRect(0, 0, VW, VH);
    const pct = Math.round(uiRects.reduce((s2, v) => s2 + v, 0) / (VW * VH) * 100);
    pill(g, st.ch.ui.on ? `UI painted green: about ${pct}% of the screen right now` : 'UI painted green: the UI channel is off', VW / 2, 124, { col: '#103a08', bg: 'rgba(57,232,28,.85)', align: 'center' });
  }
  // SFX captions at their sources
  const kn = R ? project(R, tmpV.set(KX + .4, 2.1, .3)) : { x: 380, y: 150 };
  if (has(st, 'sfx', 0) && hit && since < .5) speaker(g, hp.x + 100, hp.y - 20, 1 - since / .5, 'thump');
  if (has(st, 'sfx', 1) && a > TL.press + TL.wind * .5 && a < TL.imp + .05) speaker(g, kn.x - 60, kn.y, 1, 'whoosh');
  if (has(st, 'sfx', 2) && since > .15 && since < .7) speaker(g, hp.x + 100, hp.y + 22, 1 - (since - .15) / .55, 'creak');
  // hit stop counter
  if (A.stopping) {
    const f = Math.min(TL.stopF, Math.floor(A.stopFor * 60) + 1);
    pill(g, `HIT STOP  frame ${f} of ${TL.stopF}`, VW / 2, VH - 26, { col: '#fff', bg: 'rgba(255,95,162,.92)', align: 'center', size: 14, weight: 800, font: 'Montserrat, Jost, sans-serif' });
  }
  // badge: which slot is live, and solo
  let bx = 16;
  if (st.badge) {
    const ab = st.badge.slot, col = ab === 'A' ? '#4fb3ff' : '#ffb951';
    g.fillStyle = 'rgba(8,12,28,.82)'; g.beginPath(); g.roundRect(bx, 14, 54, 54, 10); g.fill(); g.strokeStyle = col; g.lineWidth = 3; g.stroke();
    g.fillStyle = col; g.font = '800 34px Montserrat, sans-serif'; g.textAlign = 'center'; g.fillText(ab, bx + 27, 54);
    pill(g, st.badge.name, bx + 74, 40, { size: 16, weight: 800, font: 'Montserrat, Jost, sans-serif' });
    if (st.badge.solo) pill(g, `SOLO: ${CHI[st.badge.solo].name}`, bx + 74, 64, { col: '#111', bg: '#ffe14a', size: 12 });
  }
  // lens and frames readout
  const F = FOV.reduce((b, f) => Math.abs(f.v - st.fov) < Math.abs(b.v - st.fov) ? f : b);
  pill(g, `FOV ${Math.round(st.fov)}° · ${F.game} · ${F.why}`, 24, VH - 52, { col: '#b9c6e6', size: 12, weight: 600 });
  const frames = Math.round((TL.wind + .07) * 60);
  pill(g, `press to impact: ${frames} frames${st.cut ? ' (first frames cut)' : ''}${TL.stopF ? ` · hit stop ${TL.stopF} frames` : ''}`, 24, VH - 22, { col: st.cut ? '#7ee081' : '#dfe7f8', size: 12, weight: 600 });
  if (TL.stopF >= 12) pill(g, '“A rollercoaster that brakes every 10 feet”', VW / 2, 96, { col: '#fff', bg: 'rgba(229,50,45,.88)', align: 'center', size: 15 });
  if (!IDS.some(id => st.ch[id].on)) pill(g, 'Every channel off: the hit happens, and nothing tells you', VW / 2, 96, { col: '#fff', bg: 'rgba(229,50,45,.88)', align: 'center', size: 16 });
  if (S.speed < 1) pill(g, S.speed === .5 ? '½× speed' : '¼× speed', VW - 24, VH - 92, { align: 'right', col: '#111', bg: '#2f7bff', size: 13 });
  // rumble meter
  const rv = rumble(st, a, TL), mx = VW - 212, my = 14;
  g.fillStyle = 'rgba(8,12,28,.78)'; g.beginPath(); g.roundRect(mx, my, 198, 86, 9); g.fill();
  g.fillStyle = st.ch.hap.on ? '#e6d4ff' : '#6c7aa6'; g.font = '700 13px Jost, sans-serif'; g.textAlign = 'left'; g.fillText('Rumble', mx + 10, my + 19);
  g.font = '500 11px Jost, sans-serif'; g.fillStyle = '#8d9cc4'; g.textAlign = 'right'; g.fillText(st.pad ? 'controller connected' : 'no controller: meter only', mx + 188, my + 19);
  for (let i = 0; i < 40; i++) { const aa = a - (39 - i) * .02, v = aa < 0 ? 0 : rumble(st, aa, TL); g.fillStyle = v > .02 ? '#c084fc' : '#28305a'; const h = 4 + v * 44; g.fillRect(mx + 10 + i * 4.5, my + 78 - h, 3.5, h); }
  const jx = rv > .05 ? Math.sin(t * 120) * 3 * rv : 0;
  g.save(); g.translate(mx + 162 + jx, my + 46); g.fillStyle = st.ch.hap.on ? '#8f6bd1' : '#3a4470';
  g.beginPath(); g.roundRect(-20, -9, 40, 18, 9); g.fill(); g.beginPath(); g.arc(-15, 8, 7, 0, TAU); g.arc(15, 8, 7, 0, TAU); g.fill(); g.restore();
  // Sion's ultimate: heard from off screen
  const sa = st.sion;
  if (sa >= 0 && sa < 3) {
    const k = clamp(Math.min(sa / .2, (3 - sa) / .3));
    g.save(); g.globalAlpha = k;
    for (let r = 0; r < 3; r++) { const q = (sa * 1.2 + r / 3) % 1; g.strokeStyle = `rgba(255,90,70,${(1 - q) * .75})`; g.lineWidth = 4; g.beginPath(); g.arc(VW + 40, VH / 2, 60 + q * 520, Math.PI * .7, Math.PI * 1.3); g.stroke(); }
    const cx = VW / 2 - 240, cy = VH - 170;
    g.fillStyle = 'rgba(8,12,28,.93)'; g.beginPath(); g.roundRect(cx, cy, 480, 96, 12); g.fill(); g.strokeStyle = '#ff7a59'; g.lineWidth = 2; g.stroke();
    if (sion.complete && sion.naturalWidth) g.drawImage(sion, cx + 12, cy + 12, 72, 72);
    g.fillStyle = '#ffb951'; g.font = '800 16px Montserrat, Jost, sans-serif'; g.textAlign = 'left'; g.fillText('Sion’s ultimate, from off screen', cx + 98, cy + 32);
    g.fillStyle = '#fff'; g.font = '500 13.5px Jost, sans-serif'; wrap(g, 'Every player on the map hears it charging. Sound is the rare feedback that does not need to be on screen.', cx + 98, cy + 54, 362, 17);
    g.restore();
  }
}

/* ---------- the multitrack: each channel's level across one hit, with the freeze shaded ---------- */
function drawTrack(g, st, t) {
  const TW = 430, TH = 150, L = 70, top = 6, lh = 15, pw = TW - L - 6, TL = timeline(st), len = TL.len;
  g.clearRect(0, 0, TW, TH);
  g.fillStyle = '#0a0e1e'; g.beginPath(); g.roundRect(0, 0, TW, TH, 8); g.fill();
  const X = rt => L + rt / len * pw;
  TL.seg.forEach(s => { if (s[4] === 'play') return; g.fillStyle = s[4] === 'stop' ? 'rgba(255,95,162,.28)' : 'rgba(255,95,162,.12)'; g.fillRect(X(s[0]), top, Math.max(2, X(s[1]) - X(s[0])), lh * 8); });
  const N = 110, curves = IDS.map(() => new Float32Array(N + 1));
  for (let i = 0; i <= N; i++) { const lv = levels(st, TL, actionAt(TL, i / N * len * .9999)); IDS.forEach((id, j) => curves[j][i] = lv[id]); }
  CH.forEach((c, j) => {
    const y0 = top + j * lh, on = st.ch[c.id].on;
    g.fillStyle = j % 2 ? 'rgba(255,255,255,.025)' : 'rgba(255,255,255,.05)'; g.fillRect(L, y0, pw, lh);
    g.fillStyle = on ? c.col : '#4a5580'; g.font = '700 10.5px Jost, sans-serif'; g.textAlign = 'right'; g.fillText(c.short, L - 6, y0 + 11);
    if (!on) return;
    g.beginPath(); g.moveTo(X(0), y0 + lh - 1);
    for (let i = 0; i <= N; i++) g.lineTo(X(i / N * len), y0 + lh - 1 - curves[j][i] * (lh - 3));
    g.lineTo(X(len), y0 + lh - 1); g.closePath(); g.fillStyle = c.col; g.globalAlpha = .85; g.fill(); g.globalAlpha = 1;
  });
  const ix = X(TL.imp);
  g.setLineDash([3, 3]); g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 1; g.beginPath(); g.moveTo(ix, top); g.lineTo(ix, top + lh * 8); g.stroke(); g.setLineDash([]);
  g.fillStyle = '#8d9cc4'; g.font = '600 10px Jost, sans-serif'; g.textAlign = 'left'; g.fillText('impact', ix + 2, TH - 4);
  g.textAlign = 'right'; g.fillText('press', X(TL.press) - 2, TH - 4);
  if (TL.stopF) { g.fillStyle = '#ff5fa2'; g.fillText(`freeze ${TL.stopF}f`, X(TL.imp) + 4, TH - 16); }
  g.textAlign = 'right'; g.fillStyle = '#6c7aa6'; g.fillText(`${len.toFixed(2)} s`, TW - 6, TH - 4);
  const px = X(((t % len) + len) % len);
  g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(px, top - 2); g.lineTo(px, top + lh * 8 + 2); g.stroke();
}

/* ---------- sound (WebAudio, only after a user gesture) and rumble (Gamepad API) ---------- */
let ac = null, noise = null, bus = null;
const unlock = () => {
  try {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; ac = new AC();
      const b = ac.createBuffer(1, ac.sampleRate, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; noise = b;
      bus = ac.createDynamicsCompressor(); bus.threshold.value = -14; bus.ratio.value = 6; bus.connect(ac.destination);
    }
    if (ac.state === 'suspended') ac.resume().catch(() => {});
  } catch (e) { ac = null; }
};
addEventListener('pointerdown', unlock, true); addEventListener('keydown', unlock, true);
const canPlay = () => { try { return ac && ac.state === 'running' && !store.get('muted', false); } catch (e) { return false; } };
function tone(type, f0, f1, dur, vol, at = 0) {
  const t0 = ac.currentTime + at, o = ac.createOscillator(), gn = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
  gn.gain.setValueAtTime(vol, t0); gn.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
  o.connect(gn).connect(bus); o.start(t0); o.stop(t0 + dur + .02);
}
function hiss(f0, f1, dur, vol, q = 1.5, type = 'bandpass', at = 0) {
  const t0 = ac.currentTime + at, s = ac.createBufferSource(), bp = ac.createBiquadFilter(), gn = ac.createGain();
  s.buffer = noise; bp.type = type; bp.Q.value = q; bp.frequency.setValueAtTime(f0, t0); bp.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
  gn.gain.setValueAtTime(.0001, t0); gn.gain.exponentialRampToValueAtTime(vol, t0 + Math.min(.01, dur * .3)); gn.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
  s.connect(bp).connect(gn).connect(bus); s.start(t0, Math.random() * .5); s.stop(t0 + dur + .02);
}
const SFX = {
  thump(v) { tone('sine', 140, 38, .28, .7 * v); tone('triangle', 420, 90, .06, .25 * v); hiss(3000, 500, .12, .45 * v, .7); hiss(900, 200, .25, .25 * v, .9, 'lowpass', .01); },
  whoosh(v) { hiss(300, 2600, .2, .3 * v, 2.2); },
  creak(v) { tone('sawtooth', 210, 160, .18, .05 * v, .05); tone('sawtooth', 214, 150, .2, .04 * v, .09); },
  sion() { tone('sawtooth', 55, 40, 1.8, .2); tone('sawtooth', 82, 60, 1.8, .12); hiss(300, 120, 1.6, .3, .7); },
};
const play = (k, v) => { if (!canPlay()) return; try { SFX[k](v); } catch (e) { /* audio glitches never break the page */ } };
function pads() { try { return [...(navigator.getGamepads ? navigator.getGamepads() : [])].filter(p => p && p.connected); } catch (e) { return []; } }
function vibrate(strong, ms) {
  pads().forEach(p => { try { const v = p.vibrationActuator; if (v && v.playEffect) v.playEffect('dual-rumble', { duration: ms, strongMagnitude: clamp(strong), weakMagnitude: clamp(strong * .7) }).catch(() => {}); } catch (e) { /* no rumble */ } });
}

/* ---------- the walk-through: one change per step, each step restarts the hit ---------- */
const TOUR = [];
{
  let tt = 0;
  const step = (dur, focus, fn) => { TOUR.push({ t0: tt, dur, focus, fn }); tt += dur; };
  step(2.4, 'intro', () => presetMix(PRESETS[0]));
  IDS.forEach((id, i) => step(1.8, id, () => mkMix('Walk-through', Object.fromEntries(IDS.slice(0, i + 1).map(x => [x, .6])))));
  step(2.3, 'abA', () => ({ ...presetMix(PRESETS[0]), badge: { slot: 'A', name: 'Blockout' } }));
  step(2.6, 'abB', () => ({ ...presetMix(PRESETS[2]), badge: { slot: 'B', name: 'Crunchy' } }));
  step(2.2, 'green', () => presetMix(PRESETS[2], { green: true }));
  step(2.0, 'cut', () => presetMix(PRESETS[2], { cut: true }));
  FOV.forEach((f, i) => step(1.15, 'fov', () => ({ ...presetMix(PRESETS[2]), fov: f.v })));
  step(3.0, 'over', () => ({ ...presetMix(PRESETS[4]), badge: { slot: 'B', name: 'Overcooked' } }));
  step(2.6, 'sion', () => ({ ...presetMix(PRESETS[2]), sion: true }));
}
const TDUR = TOUR[TOUR.length - 1].t0 + TOUR[TOUR.length - 1].dur;
function tourAt(t) {
  const k = TOUR.findLastIndex(s => t >= s.t0), s = TOUR[Math.max(0, k)], lt = t - s.t0, m = s.fn();
  const st = effective(m, null, { fov: m.fov || 70, badge: m.badge || null, sion: m.sion ? lt : -1 });
  return { st, mix: m, lt, focus: s.focus, step: k };
}

/* ---------- slide 1: the mixer ---------- */
const scenes = {};
canvasDemo('mixer', (s, cv, g) => {
  const view = $(s, '.fmx-view'), glc = $(s, 'canvas.gl'), desk = $(s, '.fmx-desk'), out = $(s, '.fm-out'), tourBtn = $(s, '.fm-tour');
  const trackCv = $(s, '.fm-track'), tg = trackCv.getContext('2d');
  let R = null; try { R = build3D(glc); } catch (e) { R = null; }
  if (R) loadModel(R);
  const L = { tour: true, held: false, t: 0, focus: null, prevA: -1, prevT: 0 };

  // the desk
  const XTRA = { anim: ['cut', 'Cut first frames'], sfx: ['sion', 'Sion’s ultimate'], ui: ['green', 'Paint the UI green'] };
  desk.innerHTML = CH.map((c, i) => `<div class="fm-strip" data-id="${c.id}" style="--c:${c.col}">
    <div class="hd"><span>${c.desk}</span><i>${i + 1}</i></div>
    <div class="btns"><button class="on-b" title="Turn ${c.name} on or off (key ${i + 1})">ON</button><button class="solo-b" title="Hear and see only ${c.name}">SOLO</button></div>
    <div class="body"><div class="meter"></div><div class="fader" tabindex="0" role="slider" aria-label="${c.name} strength" aria-valuemin="0" aria-valuemax="100"><div class="lit"></div><div class="cap"></div></div>
      <div class="scale"><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div></div>
    <div class="val">60%</div>
    <ul>${c.items.map((it, j) => `<li title="${it} (from ${Math.round(c.thr[j] * 100)}%)">${c.sh ? c.sh[j] : it}</li>`).join('')}</ul>
    ${XTRA[c.id] ? `<button class="xtra" data-x="${XTRA[c.id][0]}">${XTRA[c.id][1]}</button>` : '<div class="xtra ro"></div>'}
  </div>`).join('');
  const strips = Object.fromEntries($$(desk, '.fm-strip').map(el => [el.dataset.id, { el, fader: $(el, '.fader'), cap: $(el, '.cap'), lit: $(el, '.lit'), val: $(el, '.val'), on: $(el, '.on-b'), solo: $(el, '.solo-b'), lis: $$(el, 'li'), x: $(el, '.xtra'), key: '' }]));

  const manual = () => { if (L.tour) { L.tour = false; tourBtn.classList.remove('on'); L.t = 0; L.prevA = -1; } L.held = false; };
  const restart = () => { L.t = 0; L.prevA = -1; };
  const setStr = (id, v) => { manual(); const o = liveMix().ch[id]; o.str = Math.round(clamp(v) * 100) / 100; o.on = true; L.focus = id; };
  IDS.forEach(id => {
    const k = strips[id];
    k.on.onclick = () => { manual(); const o = liveMix().ch[id]; o.on = !o.on; L.focus = id; restart(); };
    k.solo.onclick = () => { manual(); S.solo = S.solo === id ? null : id; L.focus = S.solo ? 'solo' : id; restart(); };
    const fromY = e => { const r = k.fader.getBoundingClientRect(), sc = r.height / 112; return 1 - (e.clientY - r.top - 8 * sc) / (96 * sc); };
    k.fader.addEventListener('pointerdown', e => { e.preventDefault(); k.fader.setPointerCapture(e.pointerId); setStr(id, fromY(e)); k.fader.focus(); const mv = ev => setStr(id, fromY(ev)); const up = () => { k.fader.removeEventListener('pointermove', mv); k.fader.removeEventListener('pointerup', up); }; k.fader.addEventListener('pointermove', mv); k.fader.addEventListener('pointerup', up); });
    k.fader.addEventListener('wheel', e => { e.preventDefault(); setStr(id, liveMix().ch[id].str + (e.deltaY < 0 ? .05 : -.05)); }, { passive: false });
    k.fader.addEventListener('keydown', e => { const d = { ArrowUp: .05, ArrowRight: .05, ArrowDown: -.05, ArrowLeft: -.05, PageUp: .2, PageDown: -.2 }[e.key]; if (d == null) return; e.preventDefault(); e.stopPropagation(); setStr(id, liveMix().ch[id].str + d); });
    if (k.x.dataset.x) k.x.onclick = () => {
      manual(); const x = k.x.dataset.x, m = liveMix();
      if (x === 'cut') { m.cut = !m.cut; L.focus = 'cut'; restart(); }
      if (x === 'green') { m.green = !m.green; L.focus = 'green'; }
      if (x === 'sion') { S.sionAt = S.clock; L.focus = 'sion'; play('sion'); vibrate(.4, 600); }
    };
  });
  // master section
  const slotBtns = $$(s, '.fm-slot'), flipBtn = $(s, '.fm-flip');
  const pickSlot = ab => { manual(); S.live = ab; L.focus = 'slot'; restart(); };
  slotBtns.forEach(b => b.onclick = () => pickSlot(b.dataset.slot));
  flipBtn.onclick = () => { manual(); S.flip = !S.flip; L.focus = 'flip'; restart(); };
  $(s, '.fm-copy').onclick = () => { manual(); const o = S.live === 'A' ? 'B' : 'A'; S.slots[o] = JSON.parse(JSON.stringify(liveMix())); L.focus = 'copy'; };
  const presetBox = $(s, '.fm-presets');
  presetBox.innerHTML = PRESETS.map((p, i) => `<button class="fx-btn" data-p="${i}" title="${p.tip}">${p.name}</button>`).join('');
  $$(presetBox, '.fx-btn').forEach(b => b.onclick = () => { manual(); const p = PRESETS[+b.dataset.p]; S.slots[S.live] = presetMix(p); S.solo = null; L.focus = 'preset:' + b.dataset.p; restart(); });
  const fovBox = $(s, '.fm-fov');
  fovBox.innerHTML = FOV.map(f => `<button class="fx-btn" data-f="${f.v}" title="${f.game}: ${f.why}">${f.v}° ${f.game}</button>`).join('');
  $$(fovBox, '.fx-btn').forEach(b => b.onclick = () => { manual(); S.fov = +b.dataset.f; L.focus = 'fov'; });
  const speedBox = $(s, '.fm-speed');
  speedBox.innerHTML = [[1, '1×'], [.5, '½×'], [.25, '¼×']].map(([v, l]) => `<button data-v="${v}" title="Playback speed">${l}</button>`).join('');
  $$(speedBox, 'button').forEach(b => b.onclick = () => { S.speed = +b.dataset.v; L.focus = 'speed'; });
  tourBtn.onclick = () => { L.tour = !L.tour; L.held = false; L.t = 0; L.prevA = -1; tourBtn.classList.toggle('on', L.tour); };
  // keys: 1-8 channels, A/B slots
  document.addEventListener('keydown', e => {
    if (!s.classList.contains('active') || e.ctrlKey || e.metaKey || e.altKey || e.target.closest('input, textarea')) return;
    const n = +e.key; if (n >= 1 && n <= 8) { const id = IDS[n - 1]; manual(); const o = liveMix().ch[id]; o.on = !o.on; L.focus = id; restart(); return; }
    const k = e.key.toUpperCase(); if (k === 'A' || k === 'B') pickSlot(k);
  });
  // drag the view to orbit, double-click to reset
  let drag = null;
  view.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, yaw: S.yaw, pitch: S.pitch, sc: view.getBoundingClientRect().width / VW }; view.setPointerCapture(e.pointerId); view.classList.add('drag'); });
  view.addEventListener('pointermove', e => { if (!drag) return; S.yaw = clamp(drag.yaw + (e.clientX - drag.x) / drag.sc * .006, -1.2, 1.2); S.pitch = clamp(drag.pitch + (e.clientY - drag.y) / drag.sc * .004, -.12, .7); });
  const endDrag = () => { drag = null; view.classList.remove('drag'); };
  view.addEventListener('pointerup', endDrag); view.addEventListener('pointercancel', endDrag);
  view.addEventListener('dblclick', () => { S.yaw = 0; S.pitch = 0; });

  // the desk follows whatever is playing (the walk-through moves the faders too)
  let lastOut = '';
  function sync(mix, st, lv, focus, liveSlot, TL) {
    IDS.forEach(id => {
      const k = strips[id], o = mix.ch[id], eff = st.ch[id], key = [o.on, o.str, eff.on, focus === id, S.solo].join();
      k.el.style.setProperty('--v', (lv[id] || 0).toFixed(3));
      if (key === k.key) return; k.key = key;
      k.el.classList.toggle('off', !eff.on); k.el.classList.toggle('focus', focus === id);
      k.el.classList.toggle('dim', !!S.solo && !L.tour && S.solo !== id);
      k.on.classList.toggle('on', o.on); k.solo.classList.toggle('on', !L.tour && S.solo === id);
      k.cap.style.top = `${8 + (1 - o.str) * 96}px`; k.lit.style.height = `${o.str * 96}px`;
      k.val.textContent = `${Math.round(o.str * 100)}%`; k.fader.setAttribute('aria-valuenow', Math.round(o.str * 100));
      k.lis.forEach((li, j) => li.classList.toggle('got', has(st, id, j)));
    });
    // read-outs and extras
    const ro = { vfx: has(st, 'vfx', 1) ? `${Math.round(10 + 46 * lvl(st, 'vfx'))} sparks` : 'no sparks', time: TL.stopF ? `freeze ${TL.stopF} frames` : 'no freeze', cam: `lens ${Math.round(st.fov)}°`, mat: has(st, 'mat', 2) ? `${Math.round(14 + 30 * lvl(st, 'mat'))} straws` : 'no straw', hap: S.pad ? 'controller connected' : 'no controller' };
    Object.entries(ro).forEach(([id, txt]) => { if (strips[id].x.textContent !== txt) strips[id].x.textContent = txt; });
    strips.anim.x.classList.toggle('on', !!mix.cut); strips.ui.x.classList.toggle('on', !!mix.green); strips.sfx.x.classList.toggle('on', st.sion >= 0 && st.sion < 3);
    slotBtns.forEach(b => { b.classList.toggle('on', liveSlot === b.dataset.slot); const nm = $(b, 'span'), txt = L.tour ? (b.dataset.slot === 'A' ? 'Blockout' : 'Crunchy') : S.slots[b.dataset.slot].name; if (nm.textContent !== txt) nm.textContent = txt; });
    flipBtn.classList.toggle('on', S.flip && !L.tour);
    $$(fovBox, '.fx-btn').forEach(b => b.classList.toggle('on', +b.dataset.f === Math.round(st.fov)));
    $$(speedBox, 'button').forEach(b => b.classList.toggle('on', +b.dataset.v === S.speed));
    // the explanation
    const c = CHI[focus], F = FOV.find(f => f.v === Math.round(st.fov)) || FOV[1], pi = focus && focus.startsWith('preset:') ? PRESETS[+focus.slice(7)] : null;
    const html = c ? `<b>${c.name}.</b> ${c.note}`
      : pi ? `<b>${pi.name}.</b> ${pi.tip}`
      : focus === 'intro' ? '<b>Blockout.</b> A knight swings at a training dummy with every feedback channel off. The hit happens, the dummy loses health, and nothing tells you. Watch the desk: each channel comes in on its own strip.'
      : focus === 'abA' ? '<b>A: Blockout.</b> The same swing with every channel off. A/B compare is the fastest way to feel what a mix adds: press <b>A</b> and <b>B</b>, or turn on “Flip every hit”.'
      : focus === 'abB' ? '<b>B: Crunchy.</b> All eight channels at a moderate level. Same animation timing, same damage: only the feedback changed.'
      : focus === 'slot' ? `<b>Slot ${liveSlot}: ${S.slots[liveSlot].name}.</b> Every change you make goes into the live slot. Load a preset, tweak it, then press <b>A</b> and <b>B</b> to compare.`
      : focus === 'flip' ? (S.flip ? '<b>Flip every hit.</b> A, then B, then A. Listen and watch for what disappears when the mix drops out.' : '<b>Flip off.</b> The live slot stays put.')
      : focus === 'copy' ? '<b>Copied.</b> Both slots now hold the same mix. Change one channel in the live slot and flip to hear only that difference.'
      : focus === 'solo' ? `<b>Solo: ${CHI[S.solo].name}.</b> Only this channel plays, so you can judge it on its own. Click SOLO again to bring the others back.`
      : focus === 'green' ? '<b>Paint the UI green.</b> GDKeys’ trick: colour every UI element bright green and look at how much of the screen it covers. If it is a lot, the UI is carrying feedback the world should carry.'
      : focus === 'cut' ? `<b>Cut the first frames.</b> A pack animation starts slowly. Cutting its first frames makes the same swing land in ${Math.round(.15 * 60)} frames instead of ${Math.round(.37 * 60)}: the deck’s fix for a slow start.`
      : focus === 'fov' ? `<b>FOV ${F.v}°, ${F.game}:</b> ${F.why}. The camera dollies so the dummy keeps its size, which shows what the lens does on its own: a narrow view flattens and closes in, a wide one stretches the space and sells speed.`
      : focus === 'over' ? '<b>Overcooked.</b> Every fader at full. Sixteen frames of hit stop on every swing is the deck’s “rollercoaster that brakes every 10 feet”. Some hits deserve this; most do not.'
      : focus === 'sion' ? '<b>Sion’s ultimate.</b> Heard map-wide, from off screen. Sound is the rare feedback that does not need to be on-screen.'
      : focus === 'speed' ? `<b>${S.speed === 1 ? 'Full speed' : S.speed === .5 ? 'Half speed' : 'Quarter speed'}.</b> Slow the loop down to see each channel land, then go back to full speed to feel it.`
      : '<b>The mixer desk.</b> One sword hit, eight channels. Push a fader to bring a channel in, SOLO it to judge it alone, and flip between slots A and B to compare two mixes. The deck’s point is that they combine.';
    if (html !== lastOut) { lastOut = html; say(out, html); }
  }

  const frame = (st, t, mix, focus, liveSlot) => {
    const TL = timeline(st), A = actionAt(TL, t);
    let fr = { TL, A };
    if (R) {
      // keep the 3D buffer sharp at whatever size the stage is drawn
      const w = view.getBoundingClientRect().width, pr = clamp(w / VW * (devicePixelRatio || 1), .75, 2.25);
      if (w > 0 && Math.abs(pr - R.pr) > .05) { R.pr = pr; R.renderer.setPixelRatio(pr); R.renderer.setSize(VW, VH, false); }
      fr = render3D(R, st, t);
    }
    drawOverlay(g, R, st, t, fr);
    drawTrack(tg, st, t);
    const lv = levels(st, fr.TL, fr.A);
    sync(mix, st, lv, focus, liveSlot, fr.TL);
    return fr;
  };
  const liveState = () => {
    const m = liveMix();
    return { mix: m, st: effective(m, S.solo, { badge: { slot: S.live, name: m.name, solo: S.solo }, sion: S.sionAt >= 0 ? S.clock - S.sionAt : -1 }) };
  };
  scenes.mixer = {
    seek(t) { L.held = true; if (R) R.still = true; L.tour = true; tourBtn.classList.add('on'); const T = tourAt(t); frame(T.st, T.lt, T.mix, T.focus, T.mix.badge ? T.mix.badge.slot : 'B'); },
    dur: () => TDUR,
  };
  frame(tourAt(0).st, 0, tourAt(0).mix, 'intro', 'A');
  return dt => {
    if (L.held) return;
    const d = Math.max(0, dt) * S.speed;
    S.clock += Math.max(0, dt); S.pad = pads().length > 0;
    S.fovView += (S.fov - S.fovView) * (1 - Math.exp(-dt * 7)); if (Math.abs(S.fov - S.fovView) < .05) S.fovView = S.fov;
    let st, mix, lt, focus, slot;
    if (L.tour) {
      const prevStep = tourAt(L.t).step;
      L.t += d; if (L.t >= TDUR) { L.t = 0; L.prevA = -1; }
      const T = tourAt(L.t); ({ st, mix, lt, focus } = T); slot = mix.badge ? mix.badge.slot : 'B';
      if (T.step !== prevStep) { L.prevA = -1; if (T.focus === 'sion') play('sion'); }
    } else {
      L.t += d;
      let TL = timeline(effective(liveMix(), S.solo));
      if (L.t >= TL.len) { L.t -= TL.len; L.prevA = -1; if (S.flip) S.live = S.live === 'A' ? 'B' : 'A'; }
      ({ st, mix } = liveState()); lt = L.t; focus = L.focus; slot = S.live;
    }
    const fr = frame(st, lt, mix, focus, slot), TL = fr.TL, a1 = fr.A.a, a0 = L.prevA;
    // live only: sound and rumble fire when the action crosses a beat
    if (a0 >= 0 && a1 >= a0) {
      const cross = x => a0 < x && x <= a1;
      if (cross(TL.imp)) {
        if (has(st, 'sfx', 0)) play('thump', .4 + .6 * lvl(st, 'sfx'));
        if (has(st, 'sfx', 2)) play('creak', lvl(st, 'sfx'));
        if (has(st, 'hap', 0)) vibrate(.4 + .6 * lvl(st, 'hap'), 110);
      }
      if (cross(TL.press + TL.wind * .5)) { if (has(st, 'sfx', 1)) play('whoosh', lvl(st, 'sfx')); if (has(st, 'hap', 1)) vibrate(.25 * lvl(st, 'hap'), 120); }
    }
    L.prevA = a1;
  };
});

/* ---------- slide 2: the checklist sheet, read from the live slot ---------- */
{
const W = 1040, H = 585;
    const PRI = ['High', 'Medium', 'Low'], PRI_COL = { High: '#e5322d', Medium: '#e0a92d', Low: '#8ea2e6' };
    const ROW0 = 112, ROWH = 52;
    function drawSheet(g, st) {
      g.clearRect(0, 0, W, H);
      g.fillStyle = '#fffaf0'; g.beginPath(); g.roundRect(0, 0, W, H, 14); g.fill();
      g.fillStyle = C.navy; g.beginPath(); g.roundRect(0, 0, W, 56, [14, 14, 0, 0]); g.fill();
      g.fillStyle = '#ffb951'; g.font = '800 18px Montserrat, Jost, sans-serif'; g.textAlign = 'left'; g.fillText('Feedback checklist', 20, 35);
      g.fillStyle = '#fff'; g.font = '600 16px Jost, sans-serif'; g.fillText(`Event: ${st.name}`, 230, 35);
      const cols = [20, 220, 300, 760, 900];
      g.fillStyle = C.muted; g.font = '700 12px Jost, sans-serif';
      ['CHANNEL', 'STRENGTH', 'WHAT IT DOES ON THIS EVENT', 'PRIORITY', 'STATUS'].forEach((h, i) => g.fillText(h, cols[i], 92));
      let on = 0; const missing = [];
      CH.forEach((c, i) => {
        const y = ROW0 + i * ROWH, o = st.ch[c.id];
        g.fillStyle = i % 2 ? '#f6efdf' : '#fbf6ea'; g.fillRect(10, y - 6, W - 20, ROWH - 2);
        g.fillStyle = o.on ? C.good : '#fff'; g.strokeStyle = o.on ? C.good : '#cdbf9f'; g.lineWidth = 2; g.beginPath(); g.roundRect(cols[0], y + 6, 20, 20, 4); g.fill(); g.stroke();
        if (o.on) { on++; g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.moveTo(cols[0] + 5, y + 16); g.lineTo(cols[0] + 9, y + 21); g.lineTo(cols[0] + 16, y + 11); g.stroke(); }
        g.fillStyle = C.ink; g.font = '800 15px Montserrat, Jost, sans-serif'; g.textAlign = 'left'; g.fillText(c.name, cols[0] + 30, y + 22);
        g.fillStyle = '#e6dcc5'; g.fillRect(cols[1], y + 12, 64, 8); g.fillStyle = o.on ? '#e0a92d' : '#cdbf9f'; g.fillRect(cols[1], y + 12, 64 * o.str, 8);
        g.font = '500 13px Jost, sans-serif';
        let x = cols[2], ln = 0;
        c.items.forEach((it, j) => { const ok = has(st, c.id, j), txt = (ok ? '✓ ' : '○ ') + it; g.fillStyle = ok ? C.ink : '#ab9f86'; if (x > cols[2] && x + g.measureText(txt).width > cols[3] - 10) { x = cols[2]; ln++; } g.fillText(txt, x, y + 16 + ln * 18); x += g.measureText(txt).width + 18; });
        const p = st.pri[c.id]; g.fillStyle = PRI_COL[p]; g.beginPath(); g.roundRect(cols[3], y + 4, 86, 24, 12); g.fill();
        g.fillStyle = '#fff'; g.font = '700 13px Jost, sans-serif'; g.textAlign = 'center'; g.fillText(p, cols[3] + 43, y + 21);
        const got = c.items.filter((_, j) => has(st, c.id, j)).length, status = !o.on ? 'missing' : got < c.items.length ? `${got} of ${c.items.length}` : 'complete';
        g.textAlign = 'left'; g.fillStyle = !o.on ? (p === 'High' ? C.red : C.muted) : got < c.items.length ? '#9a5a06' : C.good; g.font = '700 14px Jost, sans-serif'; g.fillText(status, cols[4], y + 21);
        if (!o.on) missing.push(c);
      });
      const next = missing.slice().sort((a, b) => PRI.indexOf(st.pri[a.id]) - PRI.indexOf(st.pri[b.id]))[0];
      g.fillStyle = C.navy; g.fillRect(10, H - 54, W - 20, 44);
      g.fillStyle = '#fff'; g.font = '700 15px Jost, sans-serif'; g.textAlign = 'left';
      g.fillText(`${on} of 8 channels on.`, 24, H - 26);
      g.fillStyle = '#ffb951';
      g.fillText(missing.length ? `Missing: ${missing.map(m => m.short).join(', ')}.${next ? `  Next to add: ${next.name} (${st.pri[next.id].toLowerCase()} priority).` : ''}` : 'Every channel is in. Now check that none of them is overused.', 190, H - 26);
      return { on, missing, next };
    }
    function exportData(st) {
      return {
        event: st.name, fov: st.fov, uiPaintedGreen: st.green, firstFramesCut: st.cut,
        channels: CH.map(c => ({ channel: c.name, on: st.ch[c.id].on, strength: Math.round(st.ch[c.id].str * 100), priority: st.pri[c.id],
          items: c.items.map((it, j) => ({ item: it, done: has(st, c.id, j) })) })),
      };
    }
    function exportText(st) {
      const d = exportData(st), L = [`Feedback checklist: ${d.event}`, `FOV ${d.fov}°${d.firstFramesCut ? ', first frames of the swing cut' : ''}`, ''];
      d.channels.forEach(c => { L.push(`[${c.on ? 'x' : ' '}] ${c.channel}  (strength ${c.strength}%, priority ${c.priority})`); c.items.forEach(i => L.push(`    [${i.done ? 'x' : ' '}] ${i.item}`)); });
      const miss = d.channels.filter(c => !c.on).map(c => c.channel);
      L.push('', miss.length ? `Missing: ${miss.join(', ')}` : 'Every channel is in.');
      return L.join('\n');
    }
    function download(name, text, type) {
      try {
        const url = URL.createObjectURL(new Blob([text], { type })), a = document.createElement('a');
        a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
      } catch (e) { /* downloads blocked: nothing to do */ }
    }
  
    canvasDemo('sheet', (s, cv, g) => {
      const tourBtn = $(s, '.sh-tour'), out = $(s, '.sh-out'), name = $(s, '.fm-name');
      let tour = true, held = false, t = 0;
      const manual = () => { if (tour) { tour = false; tourBtn.classList.remove('on'); } held = false; };
      // walk-through: the sheet fills in as channels go on, highest priority first
      const ORDER = CH.slice().sort((a, b) => PRI.indexOf(a.pri) - PRI.indexOf(b.pri)).map(c => c.id), SDUR = 14;
      const tourSheet = tt => { const st = JSON.parse(JSON.stringify(sheetS())); CH.forEach(c => { st.ch[c.id].on = false; st.ch[c.id].str = .6; }); ORDER.forEach((id, i) => { if (tt >= 1 + i * 1.3) st.ch[id].on = true; }); if (tt > 12) CH.forEach(c => st.ch[c.id].str = 1); st.name = S.name; st.pri = S.pri; return st; };
      let lastKey = '';
      const info = r => { const key = r.on + '|' + (r.next ? r.next.id : ''); if (key === lastKey) return; lastKey = key; say(out, r.missing.length ? `${r.on} of 8 channels on. Missing: ${r.missing.map(m => m.short).join(', ')}. “It helps me understand which effects are missing and what are the best things to prioritize.”` : 'Every channel is in. The next question is which ones are overused: paint the UI green, check the hit stop.'); };
      const render = () => { const st = tour ? tourSheet(t) : sheetS(); info(drawSheet(g, st)); };
      tourBtn.onclick = () => { tour = true; held = false; t = 0; tourBtn.classList.add('on'); };
      name.oninput = () => { S.name = name.value.trim() || 'Untitled event'; };
      $(s, '.sh-txt').onclick = () => { manual(); download('feedback-checklist.txt', exportText(sheetS()), 'text/plain'); };
      $(s, '.sh-json').onclick = () => { manual(); download('feedback-checklist.json', JSON.stringify(exportData(sheetS()), null, 2), 'application/json'); };
      cv.addEventListener('click', e => {
        const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * W / r.width, y = (e.clientY - r.top) * H / r.height, i = Math.floor((y - ROW0 + 6) / ROWH);
        if (i < 0 || i >= CH.length) return; manual();
        if (x >= 760 && x <= 846) { const id = CH[i].id; S.pri[id] = PRI[(PRI.indexOf(S.pri[id]) + 1) % 3]; }
        else if (x < 220) liveMix().ch[CH[i].id].on = !liveMix().ch[CH[i].id].on;
      });
      cv.addEventListener('mousemove', e => { const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * W / r.width, y = (e.clientY - r.top) * H / r.height, i = Math.floor((y - ROW0 + 6) / ROWH); cv.style.cursor = i >= 0 && i < CH.length && (x < 220 || x >= 760 && x <= 846) ? 'pointer' : ''; });
      scenes.sheet = { seek(tt) { held = true; tour = true; t = tt; render(); }, dur: () => SDUR };
      return dt => { if (held) return; if (tour) { t += Math.max(0, dt); if (t >= SDUR) t = 0; } render(); };
    });
  
}

window.__seek = (t, which = 'mixer') => scenes[which].seek(t);
window.__dur = (which = 'mixer') => modelReady.then(() => scenes[which].dur());   // waits for an imported model, if there is one
