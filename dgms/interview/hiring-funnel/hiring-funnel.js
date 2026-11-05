/* The hiring funnel (bonus deck "Getting Hired as a Game Designer", slides 2-3).
   Each stage is a band of an SVG funnel with a tip; the webcam tips sit on the phone/video band. The deck shows its own
   stages only in a slide image, so STAGES below is a plausible AA/AAA process, tagged "stages unconfirmed" on the slide.
   Dots flow down the funnel and peel off at each stage (illustrative, no real rates). The dots and the walk-through
   are pure functions of t, so __seek is deterministic. */
(function () {
  const { $, $$, demo } = FPF.kit, gi = IV.gi;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // UNCONFIRMED: the deck's own stage list is only in the slide 2 image.
  const STAGES = [
    { name: 'Application', icon: 'files', sub: 'résumé and portfolio',
      what: 'Your résumé and portfolio link go into the studio\'s applicant system. A recruiter usually reads them first.',
      tip: 'Apply for one specific title (systems, combat, level). Use the listing\'s own words, and link one portfolio piece for each skill it asks for.' },
    { name: 'Recruiter screen', icon: 'smartphone', sub: 'a short call',
      what: 'A short call about your background, the role, salary range and timing. It happens before any design interview.',
      tip: 'Say which kind of designer you are in one sentence, and have a salary range ready.' },
    { name: 'Design test / portfolio review', icon: 'notebook', sub: 'take-home or walk-through',
      what: 'A take-home design test, or a walk-through of your portfolio with a designer from the team.',
      tip: 'Show the process, not only the result: the problem, the options, why you picked one, and what playtests changed.' },
    { name: 'Phone / video interview', icon: 'laptop', sub: 'Zoom or MS Teams',
      what: 'Typically done over Zoom or MS Teams these days, with a designer or the hiring manager.',
      tip: 'Treat the camera as the interviewer\'s eyes.',
      cam: [['eyeball', 'Look into the webcam, not at the screen.'], ['mona-lisa', 'Prepare a blank background.'], ['top-hat', 'Wear professional clothing.'], ['sun', 'Try to be calm and personable.'], ['headphones', 'Test your audio and camera before the call.']] },
    { name: 'Onsite loop', icon: 'three-friends', sub: 'several interviews in a row',
      what: 'Several interviews back to back with designers, leads and other disciplines, often with a live design question.',
      tip: 'Explore the problem before jumping in, name more than one path, talk tradeoffs, and make it a collaboration.' },
    { name: 'Offer', icon: 'trophy-cup', sub: 'you are hired',
      what: 'The studio makes an offer: the role, level, pay and start date.',
      tip: 'Ask about the team, the project and how you would grow there. Get the offer in writing before you resign anywhere.' },
  ];
  const N = STAGES.length, TOP = 18, BH = 80, GAP = 6, X0 = 100, W0 = 470, W1 = 130, CX = X0 + W0 / 2 + 20;
  const yOf = i => TOP + i * (BH + GAP);
  const wAt = y => W0 + (W1 - W0) * ((y - TOP) / (N * (BH + GAP) - GAP));
  const COLS = ['#1f5fbf', '#2a6fc9', '#3b5bb5', '#e08a1e', '#c97314', '#2fae63'];

  // deterministic dots: dot j leaves at stage EXIT[j] (illustrative: most leave early)
  const ND = 46, hash = j => { let x = Math.sin(j * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const EXIT = Array.from({ length: ND }, (_, j) => { const h = hash(j); return h < .34 ? 0 : h < .58 ? 1 : h < .76 ? 2 : h < .88 ? 3 : h < .96 ? 4 : 5; });
  const LANE = Array.from({ length: ND }, (_, j) => hash(j + 99) * 2 - 1);

  demo('funnel', {
    init(s) {
      const svg = $(s, '.hf-svg'), card = $(s, '.hf-card'), out = $(s, '.hf-out'), board = $(s, '.hf-board');
      const bandPath = i => { const y0 = yOf(i), y1 = y0 + BH, a = wAt(y0) / 2, b = wAt(y1) / 2; return `M${CX - a},${y0} L${CX + a},${y0} L${CX + b},${y1} L${CX - b},${y1} Z`; };
      const bracket = (i0, i1, label) => { const y0 = yOf(i0) + 6, y1 = yOf(i1) + BH - 6, x = 26; return `<g class="hf-br"><path d="M${x + 12},${y0} h-8 v${y1 - y0} h8" fill="none" stroke="#cdbf9f" stroke-width="2.5"/><text transform="translate(${x - 4},${(y0 + y1) / 2}) rotate(-90)" text-anchor="middle">${label}</text></g>`; };
      svg.innerHTML = bracket(0, 1, 'Before any interview') + bracket(3, 4, 'The interview') +
        STAGES.map((st, i) => `<g class="hf-band" data-i="${i}"><path class="f" d="${bandPath(i)}" fill="${COLS[i]}"/></g>`).join('') +
        `<g class="hf-dots" pointer-events="none"></g><g class="hf-labels" pointer-events="none">` +
        STAGES.map((st, i) => `<g class="hf-band-t"><text x="${CX}" y="${yOf(i) + 38}" text-anchor="middle">${i + 1}. ${esc(st.name.replace(' / portfolio review', ''))}</text>` +
          `<text class="sm" x="${CX}" y="${yOf(i) + 58}" text-anchor="middle">${esc(i === 2 ? 'or portfolio review' : st.sub)}</text></g>`).join('') + '</g>';
      const bands = $$(svg, '.hf-band'), dotsG = $(svg, '.hf-dots');
      dotsG.innerHTML = Array.from({ length: ND }, () => '<circle r="4.5"/>').join('');
      const dots = $$(dotsG, 'circle');
      const drawDots = t => {
        const H = N * (BH + GAP);
        dots.forEach((c, j) => {
          const p = (t * .075 + j / ND) % 1, e = EXIT[j];
          const yExit = yOf(e) + BH * .62, yIn = TOP - 10 + p * (H + 60);
          let x, y, a = 1;
          if (yIn < yExit) { y = yIn; x = CX + LANE[j] * (wAt(Math.max(TOP, y)) / 2 - 18); }
          else {
            // peel off to the right, outside the funnel, and fade
            const d = Math.min(150, yIn - yExit); y = yExit + d * .25; const side = LANE[j] < 0 ? -1 : 1;
            x = CX + LANE[j] * (wAt(yExit) / 2 - 18) + side * d * 2.2; a = e === N - 1 ? 1 : Math.max(0, 1 - d / 70);
            if (e === N - 1) { x = CX + LANE[j] * 30; y = Math.min(yExit + d * .3, yOf(N - 1) + BH - 12); a = Math.max(0, 1 - d / 140); }
          }
          if (yIn < TOP - 6) a = Math.max(0, (yIn - (TOP - 10)) / 4);
          c.setAttribute('cx', x.toFixed(1)); c.setAttribute('cy', y.toFixed(1));
          const out = yIn >= yExit && e !== N - 1;
          c.setAttribute('fill', e === N - 1 ? '#ffb951' : out ? '#5d618c' : '#ffffff');
          c.setAttribute('opacity', (a * (e === N - 1 || out ? 1 : .5)).toFixed(2));
        });
      };
      let shown = -2;
      const strip = i => `<div class="hf-strip">${STAGES.map((st, j) => `<button data-i="${j}" class="${j === i ? 'on' : ''}${j === 3 || j === 4 ? ' iv' : ''}"><span class="iv-ico">${gi(st.icon)}</span>${j + 1}</button>`).join('')}</div>`;
      const render = i => {
        bands.forEach((b, j) => b.classList.toggle('on', j === i));
        if (shown === i) return; shown = i;
        if (i < 0) {
          card.innerHTML = `<span class="hf-step">Six stages</span><h3>From application to offer</h3><p class="hf-what">Most candidates leave the funnel before an interview even happens. Each band has one thing you can do to get through it.</p><p class="hf-what">The first two happen before any interview. The interview itself is the last assessment step.</p>${strip(i)}`;
          out.innerHTML = 'Click a band to see what happens there and one tip for it.';
          return;
        }
        const st = STAGES[i];
        card.innerHTML = `<div class="rm-ch" style="display:flex;gap:12px;align-items:center"><span class="iv-ico">${gi(st.icon)}</span><div><span class="hf-step">Stage ${i + 1} of ${N}${i < 2 ? ' · before any interview' : i === 3 || i === 4 ? ' · the interview' : ''}</span><h3>${esc(st.name)}</h3></div></div>
          <p class="hf-what">${esc(st.what)}</p><div class="hf-tip"><b>Tip</b><p>${esc(st.tip)}</p></div>
          ${st.cam ? `<ul class="hf-cam">${st.cam.map(([ic, t]) => `<li><span class="iv-ico">${gi(ic)}</span>${esc(t)}</li>`).join('')}</ul>` : ''}${strip(i)}`;
        out.innerHTML = `<b>${esc(st.name)}.</b> ${esc(st.tip)}`;
      };
      const user = { i: -1, t0: null };
      bands.forEach((b, i) => b.addEventListener('click', () => { user.i = i; render(i); }));
      card.addEventListener('click', e => { const b = e.target.closest('.hf-strip button'); if (b) { user.i = +b.dataset.i; render(user.i); } });
      const cur = IV.cursor(board);
      // walk-through: each band in turn, top to bottom, with a longer stop on the webcam band
      const STOPS = [1, 3.4, 5.8, 8.2, 11.8, 14.2], DUR = 17;
      const keys = STOPS.map((t, i) => [t, bands[i].querySelector('path')]);
      s._sc = IV.scene(s, 'funnel', {
        dur: DUR,
        frame(t) {
          let i = -1; STOPS.forEach((st, j) => { if (t >= st) i = j; });
          render(i); drawDots(t); cur.glide(keys, t);
        },
        manual() { cur.hide(); render(user.i); },
      });
      // outside the walk-through the dots keep flowing on their own clock
      let tm = 0;
      s._dots = () => FPF.raf(dt => { if (s._sc.tour) return; tm += dt; drawDots(tm); });
      render(-1); drawDots(0);
    },
    enter(s) { s._sc.start(); s._stopDots = s._dots(); },
    leave(s) { s._sc.stop(); s._stopDots && s._stopDots(); },
  });
})();
