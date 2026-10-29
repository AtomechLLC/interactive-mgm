/* Testing Previous Tools (MGM course 4, module 5, Part 5 Growing, deck slide id g2e56547ebf8_0_717, "Utilizing Lessons:
   Testing Previous Tools", The Legend of Zelda: Tears of the Kingdom). Each regional temple teaches one sage's power and its
   boss is built so that power is the answer, then asks for it again in a harder form at half health. The four temples live in
   TEMPLES; the tour (slide 2), the quiz (3), the ladder (4) and the clips (5) all read from it. Boss behaviour is taken from
   Zelda Wiki's boss pages; images are Zelda Wiki uploads, listed in img/sources.json. window.__seek / __dur drive the GIF. */
(function () {
  const { $, $$, demo, say, raf } = FPF.kit;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const IMG = 'img/';

  const TEMPLES = [
    {
      key: 'wind', temple: 'Wind Temple', sage: 'Tulin', icon: 'tulin-icon.png', power: "Tulin’s Power of Wind", powerImg: 'tulin-power.jpg',
      what: 'A gust behind Link that carries the paraglider farther.',
      taught: ['Glide farther across the open sky on the climb to the temple', 'Push sails to move platforms', 'Blow small enemies away'],
      boss: 'Colgera', bossImg: 'colgera-intro.jpg', portrait: 'colgera.png',
      exam: 'Colgera lives in open sky. Glide up its updrafts, gust out of the bite it aims from below, then shoot or skydive into the glowing weak spots.',
      harder: 'It summons tornadoes and turns more aggressive, so you gust and reposition more often.',
      out: 'The temple taught you to fly farther. The boss is a fight you can only reach by flying.',
      prob: 'It flies through open sky, slips through portals and bites up at you from below.',
      rungs: ['A gust behind your glide', 'Cross the sky, push sails', 'Glide its updrafts, dodge the bite', 'Tornadoes join in'],
      clips: [['qunyrUPrwWM', 'Colgera Boss Fight', 'Boss Fight Database', 'full fight'], ['U3sLUER5KuM', 'Colgera Boss Fight', 'Gamerpillar', 'guide']],
    },
    {
      key: 'fire', temple: 'Fire Temple', sage: 'Yunobo', icon: 'yunobo-icon.png', power: "Yunobo’s Power of Fire", powerImg: 'yunobo-power.jpg',
      what: 'A fiery rolling charge you aim. It breaks rock.',
      taught: ['Smash rock that blocks the way', 'Aim him from a mine cart along the temple’s rails'],
      boss: 'Marbled Gohma', bossImg: 'gohma-arena.jpg', portrait: 'gohma-portrait.jpg',
      exam: 'Its eye is too high and shielded from arrows. Launch Yunobo into its rock legs; break two and it collapses so you can climb to the eye. He also smashes the Gloom Rocks it throws.',
      harder: 'It clings to the ceiling. Angle Yunobo so he rolls up the wall and into a leg.',
      out: 'The temple taught you to break rock with Yunobo. The boss stands on legs of rock.',
      prob: 'Its eye is out of reach and shielded from arrows. It stands on four legs of Gloom Rock.',
      rungs: ['A charge that breaks rock', 'Smash walls, fire from a mine cart', 'Break its legs, reach the eye', 'Roll up the wall to its ceiling'],
      clips: [['2-ZwSIo16vw', 'Marbled Gohma Boss Fight', 'Boss Fight Database', 'full fight'], ['x8sgLeoXt8M', 'How To Defeat Marbled Gohma', 'Gamers Heroes', 'guide']],
    },
    {
      key: 'water', temple: 'Water Temple', sage: 'Sidon', icon: 'sidon-icon.png', power: "Sidon’s Power of Water", powerImg: 'sidon-power.jpg',
      what: 'A water sphere that cancels the next hit. Swing to fire it as a wave.',
      taught: ['Block a hit with the water shield', 'Swing to send the water out as a wave', 'Wash Sludge away'],
      boss: 'Mucktorok', bossImg: 'mucktorok-transform.jpg', portrait: 'mucktorok.png',
      exam: 'Mucktorok hides inside a shark made of Sludge that resists most attacks. Water washes the Sludge off and exposes it, and an arrow stuns it as it flees.',
      harder: 'It sprays Sludge across the arena and hops between puddles, so the water has to land on a moving target.',
      out: 'The temple taught you to fight with water. The boss is wrapped in Sludge that only water clears.',
      prob: 'It hides inside a shark made of Sludge that shrugs off most attacks.',
      rungs: ['A water shield and wave', 'Block hits, wash Sludge', 'Wash the shark off, expose it', 'Hit it between puddles'],
      clips: [['Hym16ejKShM', 'Mucktorok Boss Fight', 'Boss Fight Database', 'full fight'], ['mHWIOuKk6_U', 'Mucktorok Boss Fight', 'Gamerpillar', 'guide']],
    },
    {
      key: 'lightning', temple: 'Lightning Temple', sage: 'Riju', icon: 'riju-icon.png', power: "Riju’s Power of Lightning", powerImg: 'riju-power.jpg',
      what: 'Shoot an arrow into Riju’s field and lightning strikes where it lands.',
      taught: ['Let Riju’s field charge, then fire an arrow into it', 'Lightning turns Gibdos pale and vulnerable', 'One strike hits a whole group'],
      boss: 'Queen Gibdo', bossImg: 'gibdo-intro.jpg', portrait: 'gibdo.png',
      exam: 'Queen Gibdo cannot be harmed until lightning hits her. One strike turns her pale and vulnerable; a second stuns her.',
      harder: 'She takes to the air to dodge the lightning while hives pour out Gibdos, so the arrow has to find a flying target in a crowd.',
      out: 'The temple taught you that lightning opens up a Gibdo. The boss is a giant Gibdo.',
      prob: 'Nothing you swing or shoot harms her as she is. She is a giant Gibdo.',
      rungs: ['Arrow plus field calls lightning', 'Turn Gibdos pale, then strike', 'Shock the queen open', 'Hit her in flight, in a swarm'],
      clips: [['YzCF9hZ7-iA', 'Queen Gibdo Boss Fight', 'Boss Fight Database', 'full fight'], ['SL6U_gBZoCo', 'Easily Defeat Queen Gibdo', 'Azzavhar', 'guide']],
    },
  ];

  /* ---------- 1: title, the four bosses with their sages ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    const t = $(document, '.ls-title');
    if (t) t.innerHTML = TEMPLES.map(x => `<figure><img class="ls-boss" src="${IMG}${x.portrait}" alt=""><img class="ls-sage" src="${IMG}${x.icon}" alt=""><figcaption><b>${x.boss}</b>${x.temple}</figcaption></figure>`).join('');
  });

  /* ---------- 2: taught, then tested ---------- */
  const SPAN = 7, TOUR = SPAN * TEMPLES.length;
  let exApi = { seek() {}, dur: () => TOUR };
  demo('exam', {
    init(s) {
      const tabs = $(s, '.ex-tabs');
      tabs.innerHTML = TEMPLES.map((x, i) => `<button class="ex-tab" data-i="${i}"><img src="${IMG}${x.icon}" alt=""><span><b>${x.temple}</b><small>${x.sage} · ${x.boss}</small></span><i></i></button>`).join('');
      const el = sel => $(s, sel), cols = ['.ex-c1', '.ex-a1', '.ex-c2', '.ex-a2', '.ex-c3', '.ex-out'].map(el);
      let shown = -1, playing = true, t0 = 0, clock = 0;
      // when each piece fades in, in seconds into a temple's span
      const AT = [.15, 1.5, 1.75, 3.5, 3.75, 5.0];
      function fill(i) {
        if (i === shown) return;
        shown = i;
        const x = TEMPLES[i];
        el('.ex-power').src = IMG + x.powerImg;
        el('.ex-name').textContent = x.power;
        el('.ex-what').textContent = x.what;
        el('.ex-taught').innerHTML = x.taught.map(t => `<li>${t}</li>`).join('');
        el('.ex-boss').src = IMG + x.bossImg;
        el('.ex-bossname').textContent = x.boss;
        el('.ex-exam').textContent = x.exam;
        el('.ex-portrait').src = IMG + x.portrait;
        el('.ex-harder').textContent = x.harder;
        say(el('.ex-out'), `<b>${x.sage}:</b> ${x.out}`);
        $$(s, '.ex-tab').forEach((b, j) => b.classList.toggle('on', j === i));
      }
      function render(t, still) {
        const i = Math.floor(((t % TOUR) + TOUR) % TOUR / SPAN), u = still ? SPAN - 1 : t % SPAN;
        fill(i);
        const out = still ? 1 : clamp((SPAN - u) / .3);   // fade everything out at the end of a span
        cols.forEach((c, k) => {
          const a = clamp((u - AT[k]) / .4) * out;
          c.style.opacity = a.toFixed(3);
          c.style.transform = `translateY(${((1 - clamp((u - AT[k]) / .4)) * 14).toFixed(1)}px)`;
        });
        $$(s, '.ex-tab i').forEach((b, j) => b.style.width = j === i ? (still ? 100 : clamp(u / SPAN) * 100).toFixed(1) + '%' : '0');
      }
      const tourBtn = el('.ex-tour');
      const setPlaying = p => { playing = p; tourBtn.textContent = p ? '❚❚ Pause' : '▶ Tour'; tourBtn.classList.toggle('on', p); };
      $$(s, '.ex-tab').forEach(b => b.onclick = () => { setPlaying(false); clock = +b.dataset.i * SPAN; render(clock, true); });
      tourBtn.onclick = () => { if (playing) { setPlaying(false); render(clock, true); } else { clock = Math.floor(clock / SPAN) * SPAN; setPlaying(true); } };
      s._tick = dt => { if (playing) { clock = (clock + dt) % TOUR; render(clock); } };
      exApi = { seek(t) { setPlaying(false); render(t); }, dur: () => TOUR };
      setPlaying(true); render(0);
    },
    enter(s) { s._stop = raf(s._tick); },
    leave(s) { s._stop?.(); },
  });

  /* ---------- 3: name the tool ---------- */
  const ORDER = [1, 3, 0, 2];   // Gohma, Gibdo, Colgera, Mucktorok: not in temple order
  demo('quiz', {
    init(s) {
      let q = 0, tried = new Set(), score = 0, done = 0;
      const picks = $(s, '.qz-picks');
      picks.innerHTML = TEMPLES.map((x, i) => `<button class="qz-pick" data-i="${i}"><img src="${IMG}${x.icon}" alt=""><span><b>${x.power}</b><small>${x.what}</small></span></button>`).join('');
      function show() {
        const x = TEMPLES[ORDER[q]];
        tried = new Set();
        $(s, '.qz-img').src = IMG + x.bossImg;
        $(s, '.qz-boss').textContent = x.boss;
        $(s, '.qz-prob').textContent = x.prob;
        $(s, '.qz-count').textContent = `Boss ${q + 1} of ${ORDER.length}`;
        $$(s, '.qz-pick').forEach(b => b.className = 'qz-pick');
        say($(s, '.qz-out'), 'Which sage’s power was this fight built around?');
        $(s, '.qz-score').textContent = done ? `First-try answers: ${score} of ${done}` : '';
      }
      $$(s, '.qz-pick').forEach(b => b.onclick = () => {
        const i = +b.dataset.i, want = ORDER[q], x = TEMPLES[want];
        if (tried.has(want)) return;
        const first = tried.size === 0;
        tried.add(i);
        if (i === want) {
          b.classList.add('right');
          if (first) score++;
          done++;
          say($(s, '.qz-out'), `<b class="good">${x.power}.</b> ${x.exam}`);
          $(s, '.qz-score').textContent = `First-try answers: ${score} of ${done}`;
        } else {
          b.classList.add('wrong');
          say($(s, '.qz-out'), `<b class="bad">Not this one.</b> ${TEMPLES[i].power} is the ${TEMPLES[i].temple}’s lesson, for ${TEMPLES[i].boss}. Look again at what stops you here.`);
        }
      });
      $(s, '.qz-next').onclick = () => { q = (q + 1) % ORDER.length; if (q === 0) { score = 0; done = 0; } show(); };
      show();
    },
  });

  /* ---------- 4: the ladder ---------- */
  const RUNGS = ['Meet the power', 'Practise it in the temple', 'The exam', 'The harder exam'];
  demo('ladder', {
    init(s) {
      const g = $(s, '.ld-grid');
      g.innerHTML = '<div class="ld-h"></div>' + RUNGS.map((r, k) => `<div class="ld-h">${k + 1} · ${r}</div>`).join('') +
        TEMPLES.map((x, i) => `<div class="ld-row" data-i="${i}"><img src="${IMG}${x.icon}" alt=""><span><b>${x.temple}</b><small>${x.sage} · ${x.boss}</small></span></div>` +
          x.rungs.map((r, k) => `<div class="ld-c k${k}" data-i="${i}">${r}</div>`).join('')).join('');
      $$(g, '[data-i]').forEach(c => c.onmouseenter = () => {
        const i = +c.dataset.i;
        $$(g, '[data-i]').forEach(d => d.classList.toggle('dim', +d.dataset.i !== i));
        say($(s, '.ld-out'), `<b>${TEMPLES[i].boss}:</b> ${TEMPLES[i].out}`);
      });
      g.onmouseleave = () => $$(g, '[data-i]').forEach(d => d.classList.remove('dim'));
    },
  });

  /* ---------- 5: clips ---------- */
  // a thumbnail turns into the embedded player when clicked
  const wire = root => $$(root, '.cl-ph').forEach(b => b.onclick = () => {
    b.outerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${b.dataset.id}?autoplay=1&rel=0" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
  });
  demo('clips', {
    init(s) {
      const g = $(s, '.cl-grid');
      g.innerHTML = TEMPLES.map(x => `<div class="cl-col"><h3><img src="${IMG}${x.portrait}" alt="">${x.boss}<small>${x.temple} · ${x.sage}</small></h3>` +
        x.clips.map(([id, t, by, kind]) => `<div class="cl-item"><button class="cl-ph" data-id="${id}" style="background-image:url(https://i.ytimg.com/vi/${id}/mqdefault.jpg)" aria-label="play ${t}"><span>▶</span></button>` +
          `<a href="https://www.youtube.com/watch?v=${id}" target="_blank" rel="noopener"><b>${t}</b></a><small>${by} · ${kind}</small></div>`).join('') + '</div>').join('');
      wire(g);
    },
    leave(s) {   // stop playback by putting the thumbnails back
      $$(s, '.cl-item iframe').forEach(f => {
        const id = f.src.split('/embed/')[1].split('?')[0];
        f.outerHTML = `<button class="cl-ph" data-id="${id}" style="background-image:url(https://i.ytimg.com/vi/${id}/mqdefault.jpg)"><span>▶</span></button>`;
      });
      wire(s);
    },
  });

  window.__seek = (t, which) => exApi.seek(t);
  window.__dur = which => exApi.dur();
})();
