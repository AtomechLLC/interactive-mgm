/* Atomech Spine rigs: Phalanx and the claw probe, drawn together in one WebGL canvas.
 *
 * Needs, in this order:
 *   <script src="…/assets/vendor/spine-player.min.js"></script>   (Spine 4.3 runtime; we only use its spine-webgl parts)
 *   <script src="…/assets/spine/atomech-data.js"></script>        (skeletons + atlases as data URIs, built by tools/build_atomech_spine.py)
 *   <script src="…/assets/atomech-rigs.js"></script>
 *
 * API
 *   const scene = await AtomechRigs.create(canvas, { rigs: ['phalanx', 'claw'] });
 *   const ph = scene.rig('phalanx');           // { name, skeleton, state, data, x, y, scale, flip, anims }
 *   ph.x = 300; ph.y = 40; ph.faceRight = true; // canvas pixels; y = height of the feet above the canvas bottom
 *   ph.play('Sword and Board Idle', true);     // play an animation (mix 0, so it snaps)
 *   ph.pose('Hit Reaction Heavy', 0.4);        // freeze any animation at a time in seconds (no clock involved)
 *   ph.update(dt);                             // advance the playing animation by dt seconds (skip it to hold, e.g. hitstop)
 *   ph.duration('Wound');                      // seconds
 *   ph.bone('FHand');                          // { x, y } in canvas pixels (y down), after the last pose/update
 *   ph.boxes();                                // active bounding boxes: [{ name, pts:[{x,y}…] }] in canvas pixels (y down)
 *   ph.hitWindows('Sword and Board Punch Attack');  // [{ on: 0.233, off: 0.333, shape: 'HitboxSB_Thrust', slot }] seconds
 *       Phalanx's attacks key a bounding box on and off in HitboxSB / HitboxDW / HitboxPH / HitboxGS (one slot per
 *       stance); AttackableBox is her hurtbox. All 47 windows are listed in assets/spine/phalanx-hitboxes.json.
 *       The claw probe has no hitbox keys: its Attack and Dive fire a 'Warning' event on frame 0.
 *   scene.draw();                              // clear and draw every rig
 *
 * Facing: Phalanx is authored facing right and the claw probe facing left. Set rig.faceRight = true / false and the
 * loader mirrors whichever needs it (rig.flip is the raw mirror flag).
 *
 * Useful animations
 *   phalanx: 'Sword and Board Idle', 'Sword and Board Punch Attack', 'Sword and Board Hit Reaction Light',
 *            'Hit Reaction Heavy', 'Hit Reaction Massive', 'Death Forceful' (and ~215 more: rig.anims)
 *            ('… Full Motion' versions carry root motion and travel across the screen; the plain ones stay in place)
 *   claw:    'Idle', 'Attack', 'Dive', 'Wound', 'Death', 'Dead', 'Move'
 */
(function () {
  const AUTHORED_RIGHT = { phalanx: true, claw: false };   // which way each rig faces with scaleX = 1
  const SCALE = { phalanx: 0.3, claw: 0.55 };               // so the two read at a sensible size against each other
  const FOOT = { phalanx: 0, claw: 72 };                    // pixels from the rig's origin down to its feet, so rig.y = ground height

  function makeRig(name, data) {
    const skeleton = new spine.Skeleton(data);
    const state = new spine.AnimationState(new spine.AnimationStateData(data));
    const setup = () => (skeleton.setupPose ? skeleton.setupPose() : skeleton.setToSetupPose());
    const world = () => skeleton.updateWorldTransform(spine.Physics ? spine.Physics.update : undefined);
    const r = {
      name, skeleton, state, data, x: 0, y: 0, scale: SCALE[name] || 1, flip: false, H: 0,
      anims: data.animations.map(a => a.name),
      get faceRight() { return AUTHORED_RIGHT[name] !== r.flip; },
      set faceRight(v) { r.flip = AUTHORED_RIGHT[name] !== !!v; },
      duration: a => data.findAnimation(a).duration,
      play(a, loop = false) { const e = state.setAnimation(0, a, loop); e.mixDuration = 0; r.update(0); return e; },
      pose(a, t) {
        const cur = state.getTrack ? state.getTrack(0) : state.getCurrent(0);
        const e = cur && cur.animation.name === a ? cur : state.setAnimation(0, a, false);
        e.mixDuration = 0; e.trackTime = t; r.apply();
      },
      time() { const e = state.getTrack ? state.getTrack(0) : state.getCurrent(0); return e ? e.trackTime : 0; },
      update(dt) { state.update(dt); r.apply(); },
      apply() {
        skeleton.x = r.x; skeleton.y = r.y + (FOOT[name] || 0);
        skeleton.scaleX = r.scale * (r.flip ? -1 : 1); skeleton.scaleY = r.scale;
        setup(); state.apply(skeleton); world();
      },
      boxes() {                                   // active bounding boxes (hitbox, hurtbox…) as canvas-pixel polygons, y down
        const sb = new spine.SkeletonBounds(); sb.update(skeleton, true);
        return sb.boundingBoxes.map((bb, i) => {
          const v = sb.polygons[i], pts = [];
          for (let k = 0; k < v.length; k += 2) pts.push({ x: v[k], y: r.H - v[k + 1] });
          return { name: bb.name, pts };
        });
      },
      hitWindows(a) {                             // [{on, off, shape}] seconds, from the Hitbox* slot's attachment keys
        const an = data.findAnimation(a); const out = [];
        for (const tl of an.timelines) {
          if (!tl.attachmentNames) continue;
          const slot = data.slots[tl.slotIndex]; if (!/^Hitbox/.test(slot.name)) continue;
          let on = null;
          tl.attachmentNames.forEach((nm, i) => {
            const t = tl.frames[i];
            if (nm && !on) on = { on: t, shape: nm, slot: slot.name };
            else if (!nm && on) { on.off = t; out.push(on); on = null; }
          });
          if (on) { on.off = an.duration; out.push(on); }
        }
        return out.sort((x, y) => x.on - y.on);
      },
      bone(n) {                                   // canvas pixels, y down
        const b = skeleton.findBone(n); if (!b) return null;
        const p = b.appliedPose || b.applied || b;
        const wx = b.worldX ?? p.worldX, wy = b.worldY ?? p.worldY;
        return { x: wx, y: r.H - wy };
      },
    };
    return r;
  }

  async function create(canvas, opts = {}) {
    const want = opts.rigs || ['phalanx', 'claw'];
    const DATA = window.ATOMECH_SPINE;
    if (!window.spine || !DATA) throw new Error('Spine runtime or atomech-data.js missing');
    const ctx = new spine.ManagedWebGLRenderingContext(canvas, { alpha: true });
    const renderer = new spine.SceneRenderer(canvas, ctx, true);
    const am = new spine.AssetManager(ctx, '');
    want.forEach(n => {
      Object.entries(DATA[n]).forEach(([k, v]) => am.setRawDataURI(k, v));
      am.loadBinary(n + '.skel'); am.loadTextureAtlas(n + '.atlas');
    });
    await new Promise((ok, bad) => {
      const t = setInterval(() => {
        if (am.isLoadingComplete()) { clearInterval(t); am.hasErrors() ? bad(new Error(JSON.stringify(am.getErrors()))) : ok(); }
      }, 30);
    });
    const rigs = {};
    want.forEach(n => {
      const atlas = am.require(n + '.atlas');
      // the rigs are drawn at a third of their authored size: mipmaps stop the downscaled edges from shimmering
      atlas.pages.forEach(pg => pg.texture && pg.texture.setFilters(spine.TextureFilter.MipMapLinearLinear, spine.TextureFilter.Linear));
      const bin = new spine.SkeletonBinary(new spine.AtlasAttachmentLoader(atlas));
      rigs[n] = makeRig(n, bin.readSkeletonData(am.require(n + '.skel')));
    });
    const scene = {
      rigs, renderer,
      rig: n => rigs[n],
      draw(bg = [0, 0, 0, 0]) {
        const W = canvas.width, H = canvas.height, cam = renderer.camera;
        cam.position.x = W / 2; cam.position.y = H / 2; cam.viewportWidth = W; cam.viewportHeight = H; cam.zoom = 1;
        ctx.gl.viewport(0, 0, W, H);
        ctx.gl.clearColor(...bg); ctx.gl.clear(ctx.gl.COLOR_BUFFER_BIT);
        cam.position.x = W / 2; cam.position.y = H / 2; cam.viewportWidth = W; cam.viewportHeight = H; cam.update();
        renderer.begin();
        Object.values(rigs).forEach(r => { r.H = H; renderer.drawSkeleton(r.skeleton); });
        renderer.end();
      },
    };
    Object.values(rigs).forEach(r => { r.H = canvas.height; });
    return scene;
  }

  window.AtomechRigs = { create };
})();
