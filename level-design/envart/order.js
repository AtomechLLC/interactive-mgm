/* Start big, stop at half (The Level Design Book: Environment art, "How to art pass")
   The book's advice: start with big shapes and save small detail for later passes, and work iteratively, getting many
   assets to about half finished and then stepping back, because an asset can only be judged next to the others.
   Four groups of assets, each with three stages of work after the blockout. The slider is hours spent; the two buttons are
   two ways to spend them. The two-hours-a-stage figure is our own round number. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit, E = EA, W = E.W, H = E.H, GY = E.GY;
  const G = [['walls', 'Walls and roofs'], ['ground', 'Ground'], ['open', 'Doors and windows'], ['props', 'Props']], STAGE = ['blockout', 'big shapes', 'medium detail', 'small detail'], PER = 2;
  function stages(mode, hours) {
    const steps = hours / PER, d = [0, 0, 0, 0];
    for (let k = 0; k < steps; k++) { if (mode === 'one') d[Math.floor(k / 3)]++; else d[k % 4]++; }
    return d;
  }
  canvasDemo('order', (s, cv, g) => {
    const st = { mode: 'one', hours: 12 }; const sc = E.canvas(W, H), x = sc.getContext('2d');
    function scene() {
      const d = stages(st.mode, st.hours), o = {}; G.forEach(([k], i) => o[k] = d[i]);
      x.clearRect(0, 0, W, H); E.street(x, { d: o, red: false });
      E.figure(x, 236, GY + 110, { pose: 'aim', face: 1, col: [205, 72, 50], s: 1.14 }); E.figure(x, 600, GY + 96, { pose: 'aim', face: -1, col: [278, 30, 36], s: 1.1 });
      const grey = d.filter(v => v === 0).length, small = d.filter(v => v === 3).length, risk = grey ? small * PER : 0, judge = !grey;
      $(s, '.or-hv').textContent = st.hours + ' of 24 hours';
      say($(s, '.or-grid'), G.map(([, n], i) => `<div><span>${n}</span><i>${[1, 2, 3].map(k => `<u class="${d[i] >= k ? 'on' : ''}"></u>`).join('')}</i><b>${STAGE[d[i]]}</b></div>`).join(''));
      say($(s, '.or-stats'),
        `<div class="${grey ? 'r' : 'g'}"><b>${grey} of 4</b><span>asset groups still blockout grey</span></div>` +
        `<div class="${judge ? 'g' : 'y'}"><b>${judge ? 'Yes' : 'Not yet'}</b><span>can the palette and readability be judged as a whole?</span></div>` +
        `<div class="${risk ? 'r' : 'g'}"><b>${risk} h</b><span>of small detail made before the whole scene could be seen</span></div>`);
      say($(s, '.or-out'), st.hours === 0 ? '<b class="accent">The tested blockout.</b> Twenty-four hours of art are planned for this street. Drag the slider and choose how to spend them.'
        : st.hours === 24 ? '<b class="accent">Both roads end here.</b> The difference was in the middle: one of them let you check the street at hour eight, the other at hour twenty.'
        : st.mode === 'one' ? (grey ? '<b class="accent">Finished walls in an unfinished street.</b> The cracks and brick patches are done, and the doors and props are still grey boxes. Nobody can say yet whether those wall colours suit the props, so the detail may be redone.' : '<b class="accent">Colour everywhere, at last.</b> This is the first hour the whole street can be judged, and most of the budget is already spent on detail.')
        : (grey ? '<b class="accent">Big shapes first.</b> Two hours an asset buys roofs, flat colour and the main silhouettes. Keep going until nothing is grey.' : st.hours <= 16 ? '<b class="accent">About half done, and whole.</b> Every asset has its colour and some of its detail. The book’s advice is to stop here, step back and look: an asset at 50% next to its neighbours can turn out to be finished enough.' : '<b class="accent">Small detail goes last.</b> Cracks, grain and glints land on shapes and colours that were already checked together.'));
    }
    $(s, '.or-h').oninput = e => { st.hours = +e.target.value; scene(); };
    $$(s, '.or-mode .btn').forEach(b => b.onclick = () => { st.mode = b.dataset.v; $$(s, '.or-mode .btn').forEach(q => q.classList.toggle('on', q === b)); scene(); });
    scene();
    window.__orderSet = o => { Object.assign(st, o); $(s, '.or-h').value = st.hours; $$(s, '.or-mode .btn').forEach(q => q.classList.toggle('on', q.dataset.v === st.mode)); scene(); };
    return () => { g.clearRect(0, 0, W, H); g.save(); g.beginPath(); g.roundRect(0, 0, W, H, 14); g.clip(); g.drawImage(sc, 0, 0); g.restore(); };
  });
})();
