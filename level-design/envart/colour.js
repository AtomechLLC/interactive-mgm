/* Colour and value (The Level Design Book: Environment art, "Color and value")
   Three of the book's points on one street: avoid deeply saturated surfaces so lighting has somewhere to go, keep a value
   order between the planes (in its Overwatch example the ground is darker than the walls), and reserve a colour for one
   meaning ("only explosive barrels are red").
   Every number is measured from the drawn pixels. The greyscale switch is our own check. */
(function () {
  const { $, canvasDemo, say } = FPF.kit, E = EA, W = E.W, H = E.H, GY = E.GY;
  canvasDemo('colour', (s, cv, g) => {
    const st = { sat: 1.9, ground: 80, reserve: false, grey: false }; let m = {};
    const sc = E.canvas(W, H), x = sc.getContext('2d', { willReadFrequently: true });
    function scene() {
      E.K.sat = st.sat; x.clearRect(0, 0, W, H);
      const info = E.street(x, { d: 3, red: !st.reserve, groundL: st.ground });
      // the enemy stands in the open; it wears a dark neutral so that red can mean one thing
      E.figure(x, 600, GY + 96, { pose: 'aim', face: -1, col: [278, 30, 36], s: 1.1 }); E.figure(x, 236, GY + 110, { pose: 'aim', face: 1, col: [205, 72, 50], s: 1.14 });
      E.K.sat = 1;
      const D = x.getImageData(0, 0, W, H).data; let wall = 0, nw = 0, gr = 0, ng = 0, sat = 0, ns = 0;
      for (let yy = 120; yy < H; yy += 3) for (let xx = 0; xx < W; xx += 3) {
        const i = (yy * W + xx) * 4, l = E.lum(D, i), mx = Math.max(D[i], D[i + 1], D[i + 2]), mn = Math.min(D[i], D[i + 1], D[i + 2]);
        if (yy < GY - 10) { wall += l; nw++; } else if (yy > GY + 8) { gr += l; ng++; }
        sat += mx ? (mx - mn) / mx : 0; ns++;
      }
      m = { gap: (wall / nw - gr / ng) / 2.55, sat: sat / ns * 100, red: info.count };
      if (st.grey) E.grey(x, W, H);
      $(s, '.co-sv').textContent = st.sat < .75 ? 'washed out' : st.sat > 1.45 ? 'deeply saturated' : 'moderate'; $(s, '.co-gv').textContent = m.gap > 4 ? 'darker than the walls' : m.gap < -4 ? 'lighter than the walls' : 'same as the walls';
      const hot = st.sat > 1.45, flat = m.gap < 5, mixed = !st.reserve;
      say($(s, '.co-stats'),
        `<div class="${mixed ? 'r' : 'g'}"><b>${m.red}</b><span>things wearing red${mixed ? '; 2 of them explode' : ': the 2 explosive barrels'}</span></div>` +
        `<div class="${flat ? (m.gap < -4 ? 'r' : 'y') : 'g'}"><b>${Math.abs(m.gap).toFixed(0)} pts</b><span>ground ${m.gap >= 0 ? 'darker' : 'lighter'} than the walls, on a 0 to 100 value scale</span></div>` +
        `<div class="${hot ? 'r' : st.sat < .75 ? 'y' : 'g'}"><b>${m.sat.toFixed(0)}%</b><span>average saturation across the frame</span></div>`);
      say($(s, '.co-out'), (hot ? '<b class="accent">Nowhere left for light to go.</b> The book’s warning: a very red texture cannot get much redder. With every surface at full strength, a sunset or a muzzle flash has nothing to add. Pull the saturation down.'
        : mixed ? '<b class="accent">Which red explodes?</b> Shutters, an awning, posters, a sign and a door frame all wear the barrels’ colour. Reserve it, and red means one thing everywhere in the game.'
        : m.gap < -4 ? '<b class="accent">The floor glares.</b> When the ground is the lightest plane, it pulls the eye down and away from doors and people. In the book’s Overwatch example the ground sits darker than the walls.'
        : flat ? '<b class="accent">Walls and ground merge.</b> At the same value the planes stop separating: check it in greyscale. Darken the ground a little.'
        : st.sat < .75 ? '<b class="accent">Readable, and lifeless.</b> The value order holds, but the place has lost its warmth. The book says to avoid deep saturation, not colour.'
        : '<b class="accent">Each colour has a job.</b> Moderate surfaces leave room for lighting, the ground sits under the walls in value, and red is spent on two barrels and nothing else.')
        + (st.grey ? ' <i>Greyscale: only value is left. This is how the planes separate before colour helps.</i>' : ''));
    }
    $(s, '.co-s').oninput = e => { st.sat = +e.target.value; scene(); };
    $(s, '.co-g').oninput = e => { st.ground = +e.target.value; scene(); };
    $(s, '.co-res').onchange = e => { st.reserve = e.target.checked; scene(); };
    $(s, '.co-grey').onchange = e => { st.grey = e.target.checked; scene(); };
    scene();
    window.__colourSet = o => { Object.assign(st, o); $(s, '.co-s').value = st.sat; $(s, '.co-g').value = st.ground; $(s, '.co-res').checked = st.reserve; $(s, '.co-grey').checked = st.grey; scene(); return m; };
    return () => { g.clearRect(0, 0, W, H); g.save(); g.beginPath(); g.roundRect(0, 0, W, H, 14); g.clip(); g.drawImage(sc, 0, 0); if (st.grey) E.label(g, 'greyscale check', 76, 24, { size: 14 }); g.restore(); };
  });
})();
