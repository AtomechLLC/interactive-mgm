/* Shared slide widgets for every module deck: hotspots, greyscale tests, votes, wipes, swaps,
   checklists and journals, plus the demo() / canvasDemo() helpers. Exposed as FPF.kit. */
(function () {
  const { raf, ptr, store } = FPF;
  const $ = (el, s) => el.querySelector(s);
  const $$ = (el, s) => [...el.querySelectorAll(s)];
  const rnd = (a, b) => a + Math.random() * (b - a);
  const COL = { navy: '#0c2756', deep: '#061636', blue: '#2f7bff', ice: '#8fd3ff', gold: '#ffb547', paper: '#fbfbfd', text: '#fbfbfd', muted: '#a9b7d6', line: '#2b4785', good: '#5fe0a0', bad: '#ff6b6b', fire: '#ff7a2a' };
  const IMG = '../assets/img/';

  const MODULES = [
    ['Clarity', 'the foundation that supports everything else', 'clarity'],
    ['Motivation', 'drawing the player’s attention to the most important elements', 'motivation'],
    ['Response', 'create responses that give the player agency over their gaming experience', 'response'],
    ['Satisfaction', 'ensuring the player feels they got what they deserved: a reward or punishment', 'satisfaction'],
    ['Viscerality', 'stimulating the emotional brain to create more satisfying, powerful moments', 'viscerality'],
    ['Strategy', 'reaching the intellectual mind, letting the player craft a personal path', 'strategy'],
    ['Fantasy', 'everything tightly tied together, strongly reinforcing the core themes', 'fantasy'],
    ['Levelling Up', 'traits and skills that are essential to the game design lifestyle', 'levelling-up'],
  ];

  // any [data-go] button jumps to that slide: a slide id, or a 0-based index
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-go]'); if (!b) return;
    const g = b.dataset.go, i = isNaN(g) ? [...document.querySelectorAll('.slide')].indexOf(document.getElementById(g)) : +g;
    if (i >= 0) FPF.go(i);
  });

  /* ---------- widgets any slide can use ---------- */
  function wire(s) {
    // hotspots on screenshots write their text into .hs-out
    const hsOut = $(s, '.hs-out');
    $$(s, '.hs').forEach(h => h.onclick = () => {
      $$(s, '.hs').forEach(x => x.classList.toggle('on', x === h));
      h.classList.add('seen');
      if (hsOut) hsOut.textContent = h.dataset.t;
    });
    // greyscale test: drop the colour and see what still stands out
    $$(s, '.squint-btn').forEach(b => b.onclick = () => {
      const on = !b.classList.contains('on');
      b.classList.toggle('on', on);
      $$(s, '.shots').forEach(x => x.classList.toggle('squint', on));
      b.textContent = on ? 'Back to colour' : 'Greyscale test';
    });
    // votes: data-v="yes" is the right answer
    const vOut = $(s, '.vote-out');
    $$(s, '.vote').forEach(v => v.onclick = () => {
      $$(s, '.vote').forEach(x => x.classList.remove('yes', 'no'));
      v.classList.add(v.dataset.v);
      if (vOut) vOut.textContent = vOut.dataset[v.dataset.v];
    });
    // before / after wipes
    $$(s, '.wipe').forEach(w => {
      const r = $(w, 'input'), top = $(w, '.top'), bar = $(w, '.wipe-bar');
      const set = () => { top.style.clipPath = `inset(0 ${100 - r.value}% 0 0)`; bar.style.left = r.value + '%'; };
      r.oninput = set; set();
    });
    // image swaps
    const sImg = $(s, '.swap-img'), sOut = $(s, '.swap-out');
    $$(s, '.swap-btns .btn').forEach(b => b.onclick = () => {
      $$(s, '.swap-btns .btn').forEach(x => x.classList.toggle('on', x === b));
      sImg.src = b.dataset.src; sOut.textContent = b.dataset.t;
    });
    // checklists and journals remember what you wrote, in this browser only
    $$(s, '.checklist').forEach(ul => {
      const k = ul.dataset.store, boxes = $$(ul, 'input'), v = store.get(k, []);
      boxes.forEach((b, i) => { b.checked = !!v[i]; b.onchange = () => store.set(k, boxes.map(x => x.checked)); });
    });
    $$(s, '.jform').forEach(f => {
      const k = f.dataset.store, v = store.get(k, {});
      $$(f, '[data-k]').forEach(el => { el.value = v[el.dataset.k] || ''; el.oninput = () => { v[el.dataset.k] = el.value; store.set(k, v); }; });
    });
  }
  const vids = (s, on) => $$(s, 'video').forEach(v => { if (on) { v.currentTime = 0; v.play().catch(() => {}); } else v.pause(); });

  // register a demo with the shared widgets and video play / pause folded in
  const demo = (name, def = {}) => FPF.demo(name, {
    init(s) { wire(s); def.init?.(s); },
    enter(s) { vids(s, true); def.enter?.(s); },
    leave(s) { vids(s, false); def.leave?.(s); },
  });
  // a canvas demo: setup(s, canvas, ctx) returns a draw(dt, t) function, run only while the slide is showing
  const canvasDemo = (name, setup, extra = {}) => demo(name, {
    init(s) { const c = $(s, 'canvas.demo'); s._draw = setup(s, c, c.getContext('2d')); extra.init?.(s); },
    enter(s) { s._stop = raf(s._draw); extra.enter?.(s); },
    leave(s) { s._stop?.(); extra.leave?.(s); },
  });
  ['none', 'shots', 'vote', 'wipe', 'clip', 'clips2', 'check', 'summary', 'journal', 'swap'].forEach(n => demo(n));

  const say = (el, html) => { if (el) el.innerHTML = html; };
  function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }

  /* ---------- where this module sits in the course: .modmap[data-here] is the 0-based week ---------- */
  demo('modmap', {
    init(s) {
      const box = $(s, '.modmap'), out = $(s, '.modmap-out'), here = +(box.dataset.here || 0);
      box.innerHTML = MODULES.map(([n, , ic], i) => `<button data-i="${i}" class="${i === here ? 'here' : ''}"><img src="${IMG}intro/icon-${ic}.svg" alt=""><span>${n}</span><small>module ${i + 1}</small></button>`).join('');
      const pick = i => {
        $$(box, 'button').forEach((b, j) => b.classList.toggle('on', j === i));
        say(out, `<b class="accent-2">Module ${i + 1}: ${MODULES[i][0]}.</b> ${MODULES[i][1]}.${i === here ? ' <b class="accent">You are here.</b>' : ''}`);
      };
      $$(box, 'button').forEach((b, i) => b.onclick = () => pick(i));
      pick(here);
    },
  });

  FPF.kit = { $, $$, rnd, COL, IMG, MODULES, demo, canvasDemo, say, rr, raf, ptr, store, vids };
})();
