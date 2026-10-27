/* Unbalanced Meta: the Bruiser Meta (League of Legends). One illustrative stat model drives every
   slide, so the class radar, the popularity lobbies and the "breaking the meta" levers agree. */
(function () {
  const { $, $$, demo, say } = FPF.kit;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------- the model: 0 to 10 scores, illustrative only ---------- */
  const AXES = ['Health', 'Damage', 'Range', 'Mobility', 'Ease of play'];
  const BUDGET = 26;
  const CLS = {
    marksman: { name: 'Marksman', col: '#ffb547', s: [2, 8, 9, 3, 4], hole: 'Paper-thin. Dive onto them and they melt.' },
    mage: { name: 'Mage', col: '#b48cff', s: [3, 9, 7, 2, 5], hole: 'Rooted in place. Catch them out of position and they can’t escape.' },
    assassin: { name: 'Assassin', col: '#ff6b6b', s: [3, 9, 2, 9, 3], hole: 'Fragile and hard to play. One misstep and they’re dead.' },
    tank: { name: 'Tank', col: '#5fe0a0', s: [10, 3, 2, 3, 8], hole: 'Hits like a pillow. You can simply ignore them and hit something else.' },
    fair: { name: 'Bruiser (as intended)', col: '#8fd3ff', s: [6, 6, 2, 5, 7], hole: 'Short range. Kite them, and they can’t reach you.' },
    meta: { name: 'Bruiser (the meta)', col: '#ff7a2a', s: [8, 8, 2, 7, 8], hole: 'Short range… but gap-closers and healing cover it. <b class="accent">No real hole.</b>' },
  };
  const sum = a => a.reduce((x, y) => x + y, 0);

  // strength above the fair budget -> win rate; strength and ease together -> how often it's picked
  const winRate = pow => 50 + (pow - 5) * 1.3;
  function share(pow, ease) {   // share of top / jungle picks, 0..1
    const w = Math.exp(0.42 * (pow - 5) + 0.28 * (ease - 5));
    return clamp(0.22 * w / (0.22 * w + 0.78), 0.02, 0.92);
  }

  /* ---------- radar ---------- */
  const R = 190, N = AXES.length, ang = i => -Math.PI / 2 + i * 2 * Math.PI / N;
  const pt = (i, v) => [Math.cos(ang(i)) * R * v / 10, Math.sin(ang(i)) * R * v / 10];
  const poly = s => s.map((v, i) => pt(i, v).map(n => n.toFixed(1)).join(',')).join(' ');
  function radarBase(svg) {
    let h = '';
    [2, 4, 6, 8, 10].forEach(v => h += `<polygon class="grid" points="${poly(Array(N).fill(v))}"/>`);
    AXES.forEach((a, i) => {
      const [x, y] = pt(i, 10), [lx, ly] = pt(i, 11.6);
      h += `<line class="spoke" x1="0" y1="0" x2="${x}" y2="${y}"/><text class="ax" x="${lx}" y="${ly + 6}" text-anchor="middle">${a}</text>`;
    });
    h += `<polygon class="ghost" points="${poly(CLS.fair.s)}"/><polygon class="shape" points="${poly(Array(N).fill(0))}"/><g class="dots"></g>`;
    svg.innerHTML = h;
  }
  function radarSet(svg, s, col) {
    const p = $(svg, '.shape');
    p.setAttribute('points', poly(s)); p.style.fill = col + '55'; p.style.stroke = col;
    $(svg, '.dots').innerHTML = s.map((v, i) => { const [x, y] = pt(i, v); return `<circle cx="${x}" cy="${y}" r="7" fill="${col}"/>`; }).join('');
  }

  /* ---------- 2: class shapes ---------- */
  demo('shape', {
    init(s) {
      const svg = $(s, '.radar'), btns = $(s, '.cls-btns'), out = $(s, '.shape-out');
      radarBase(svg);
      $(s, '.ghost-tog input').onchange = e => $(svg, '.ghost').style.display = e.target.checked ? '' : 'none';
      btns.innerHTML = Object.entries(CLS).map(([k, c]) => `<button class="btn small" data-k="${k}" style="--c:${c.col}">${c.name}</button>`).join('');
      const pick = k => {
        const c = CLS[k], tot = sum(c.s), over = tot - BUDGET;
        $$(btns, 'button').forEach(b => b.classList.toggle('on', b.dataset.k === k));
        radarSet(svg, c.s, c.col);
        $(s, '.budget-n').textContent = `${tot} / ${BUDGET}`;
        const f = $(s, '.budget-fill'); f.style.width = (tot / 34 * 100) + '%'; f.style.background = over > 0 ? `linear-gradient(90deg, var(--accent-2) 0 ${BUDGET / tot * 100}%, var(--bad) 0)` : '';
        const low = c.s.indexOf(Math.min(...c.s));
        say(out, `<b style="color:${c.col}">${c.name}.</b> Weak stat: <b>${AXES[low]}</b>. ${c.hole}` + (over > 0 ? ` <span class="bad">${over} points over budget.</span>` : ''));
      };
      $(s, '.budget-line').style.left = (BUDGET / 34 * 100) + '%';
      btns.onclick = e => { const b = e.target.closest('button'); if (b) pick(b.dataset.k); };
      pick('marksman');
    },
  });

  /* ---------- 3: strong + easy = everywhere ---------- */
  // seeded random so the lobbies only change when the numbers do
  const rng = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  demo('popular', {
    init(s) {
      const quad = $(s, '.quad'), lob = $(s, '.lobbies'), rp = $(s, '.r-pow'), re = $(s, '.r-ease'), out = $(s, '.pop-out');
      const X = e => 50 + e * 48, Y = p => 380 - p * 35;
      let h = `<rect class="q-hot" x="${X(5)}" y="${Y(10)}" width="${X(10) - X(5)}" height="${Y(5) - Y(10)}"/>`;
      h += `<line class="q-ax" x1="${X(0)}" y1="${Y(0)}" x2="${X(10)}" y2="${Y(0)}"/><line class="q-ax" x1="${X(0)}" y1="${Y(0)}" x2="${X(0)}" y2="${Y(10)}"/>`;
      h += `<line class="q-mid" x1="${X(5)}" y1="${Y(0)}" x2="${X(5)}" y2="${Y(10)}"/><line class="q-mid" x1="${X(0)}" y1="${Y(5)}" x2="${X(10)}" y2="${Y(5)}"/>`;
      h += `<text class="q-t" x="${X(10) - 8}" y="${Y(10) + 26}" text-anchor="end">picked by everyone</text>`;
      h += `<text class="q-t dim" x="${X(0) + 10}" y="${Y(10) + 26}">picked by experts</text>`;
      h += `<text class="q-t dim" x="${X(10) - 8}" y="${Y(0) - 14}" text-anchor="end">picked by beginners</text>`;
      h += `<text class="q-l" x="${X(5)}" y="${Y(0) + 32}" text-anchor="middle">ease of play →</text>`;
      h += `<text class="q-l" transform="translate(18 ${Y(5)}) rotate(-90)" text-anchor="middle">strength →</text>`;
      // the other classes, for reference: strength 5 (balanced), ease from the class table
      // Marksman's label sits above the line so it doesn't collide with its neighbours
      ['assassin', 'marksman', 'mage', 'tank'].forEach((k, i) => { const c = CLS[k]; h += `<circle cx="${X(c.s[4])}" cy="${Y(5)}" r="9" fill="${c.col}" opacity=".7"/><text class="q-n" x="${X(c.s[4])}" y="${Y(5) + (i === 1 ? -18 : 28)}" text-anchor="middle">${c.name}</text>`; });
      h += `<g class="q-me"><circle r="16"/><text y="-24" text-anchor="middle">Bruiser</text></g>`;
      quad.innerHTML = h;
      lob.innerHTML = Array.from({ length: 10 }, () => `<div class="lobby">${'<i></i>'.repeat(4)}</div>`).join('');
      const dots = $$(lob, 'i');
      const set = (pow, ease) => {
        rp.value = pow; re.value = ease;
        $(s, '.v-pow').textContent = (+pow).toFixed(1); $(s, '.v-ease').textContent = (+ease).toFixed(1);
        $(quad, '.q-me').setAttribute('transform', `translate(${X(ease)} ${Y(pow)})`);
        const sh = share(+pow, +ease), r = rng(7);
        let n = 0; dots.forEach(d => { const b = r() < sh; d.classList.toggle('b', b); n += b; });
        const wr = winRate(+pow);
        say(out, `Win rate ≈ <b>${wr.toFixed(1)}%</b> · bruisers in <b class="${sh > .45 ? 'bad' : 'accent-2'}">${Math.round(sh * 100)}%</b> of top &amp; jungle picks (${n} of 40 here).` + (sh > .55 ? ' <span class="bad">You will face one almost every game.</span>' : ''));
        $$(s, '.pop-btns .btn').forEach(b => b.classList.remove('on'));
      };
      rp.oninput = re.oninput = () => set(rp.value, re.value);
      $$(s, '.pop-btns .btn').forEach(b => b.onclick = () => {
        const p = b.dataset.p === 'meta' ? [8.5, 8.5] : [5, 7];
        set(...p); b.classList.add('on');
      });
      set(5, 7); $(s, '[data-p=fair]').classList.add('on');
    },
  });

  /* ---------- 4: breaking the meta takes many levers ---------- */
  // d: change to the bruiser's [health, damage, range, mobility, ease]; pw: extra strength lost to counters
  const LEVERS = [
    { k: 'sys', t: 'Anti-heal made easy to buy', w: 'Grievous Wounds on cheap items for every class', d: [-1, 0, 0, 0, 0] },
    { k: 'sys', t: 'Fighter item nerfs', w: 'Season 12: Goredrinker, Divine Sunderer and friends lose stats', d: [0, -1, 0, 0, 0] },
    { k: 'sys', t: 'Champion Durability Update', w: 'Patch 12.10 (2022): everyone gets tankier, so the bruiser’s edge shrinks', d: [-1, 0, 0, 0, 0] },
    { k: 'sys', t: 'Mythic items removed', w: 'Preseason 2024: no more “must-buy” power spikes', d: [0, -1, 0, 0, 0] },
    { k: 'con', t: 'Class updates with clear weaknesses', w: 'like the 2015 Juggernaut update: durable but immobile', d: [0, 0, 0, -2, 0] },
    { k: 'con', t: 'Targeted nerfs to the top picks', w: 'the most-played bruisers lose free damage and forgiveness', d: [0, -0.5, 0, 0, -1] },
    { k: 'con', t: 'New champions that counter them', w: 'kits built to kite or shred durable fighters', d: [0, 0, 0, 0, 0], pw: -0.8 },
  ];
  demo('levers', {
    init(s) {
      const svg = $(s, '.radar'), box = $(s, '.levers'), out = $(s, '.lev-out');
      radarBase(svg);
      box.innerHTML = LEVERS.map((l, i) => `<label class="lever ${l.k}"><input type="checkbox" data-i="${i}"><span class="tag">${l.k === 'sys' ? 'systems' : 'content'}</span><b>${l.t}</b><small>${l.w}</small></label>`).join('');
      const fairShare = share(5, CLS.fair.s[4]);
      $(s, '.meter-fair').style.left = fairShare * 100 + '%';
      const update = () => {
        const on = $$(box, 'input').filter(c => c.checked).map(c => LEVERS[c.dataset.i]);
        const st = CLS.meta.s.map((v, i) => clamp(v + on.reduce((a, l) => a + l.d[i], 0), 0, 10));
        // strength: how far over budget the shape is, plus counters; ease is its own axis
        const pow = clamp(5 + (sum(st) - BUDGET) / 2 + on.reduce((a, l) => a + (l.pw || 0), 0), 0, 10);
        const sh = share(pow, st[4]);
        const col = sh > .45 ? '#ff7a2a' : sh > fairShare + .06 ? '#ffb547' : '#8fd3ff';
        radarSet(svg, st, col);
        $(s, '.share-n').textContent = Math.round(sh * 100) + '%';
        const f = $(s, '.meter-fill'); f.style.width = sh * 100 + '%'; f.style.background = col;
        const n = on.length, sys = on.some(l => l.k === 'sys'), con = on.some(l => l.k === 'con');
        say(out, n === 0 ? 'The meta bruiser, untouched. The dashed outline is the fair bruiser.'
          : sh > .45 ? `${n} fix${n > 1 ? 'es' : ''} in and bruisers are still everywhere.`
          : sh > fairShare + .06 ? `Better, but still overtuned.${sys && con ? '' : ` Try mixing <b>${sys ? 'content' : 'systems'}</b> changes in too.`}`
          : `<b class="accent-2">Meta broken</b> with ${n} changes${sys && con ? ', using both systems and content' : ''}. Now it’s one choice among many.`);
      };
      box.onchange = update; update();
    },
  });

  /* ---------- 5: video wall ---------- */
  const VIDS = [
    { id: 'FZ7MbrhFIzQ', g: 'dominating', t: '#1 Sett World: Flawless High-Elo Stomp (1v5 build)', by: 'foggedftw2', why: 'Sett, the face of the meta: walk in, soak everything, punch out.' },
    { id: 'CQXKb4pMPt0', g: 'dominating', t: 'Full HP Sett is the most insane thing you’ll ever see', by: 'Nightblue3', why: 'The recipe in one clip: so much health it turns straight into damage.' },
    { id: 'YMicn5Oo2Zk', g: 'dominating', t: 'Darius Montage Best Moments', by: 'League Of Fails', why: 'What the meta looked like from the other side: one bruiser, five victims.' },
    { id: 'sK-PAM5138M', g: 'dominating', t: 'Darius Montage: Pentakill Top 30 (pro play)', by: 'Prank Demand', why: 'Even at the pro level, one durable fighter cleaning up whole teams.' },
    { id: '9s4oGXRpGfA', g: 'dominating', t: 'Why bruisers are BROKEN OP in the meta', by: 'NEACE (Challenger coaching)', why: 'A Challenger coach walks a Wukong game: tanky enough to dive, strong enough to win.' },
    { id: 'mmicE0CThpM', g: 'explainers', t: 'League of Legends has a Bruiser problem', by: 'Minimo (patch 13.13)', why: 'A player-side explainer of why bruisers felt lame to play and to play against.' },
    { id: 'xWZhEcCRoQQ', g: 'explainers', t: 'Juggernauts: The Class Balanced Around Going Second', by: 'Vars', why: 'How a fair fighter class gets a hole on purpose: durable, but immobile.' },
    { id: 'cat8G8DGnYo', g: 'explainers', t: 'AP Bruisers: Why Are There So Few Of Them?', by: 'Vars', why: 'Why the class leans so heavily on one kind of item budget.' },
    { id: 'SiyAJY0BmWg', g: 'explainers', t: 'Divine Sunderer Analysis vs Trinity Force', by: 'RhokuTV', why: 'The numbers behind one of the items that fed the meta.' },
    { id: 'G3huvu5qkl0', g: 'riot', t: 'Preseason & Ranked Changes | Dev Update', by: 'League of Legends (Riot)', why: 'Riot explains removing Mythic items: a systems-level lever.' },
    { id: '3kp8-oCviqQ', g: 'riot', t: 'How Riot’s Juggernaut Patch Turned Worlds 2015 Upside Down', by: 'theScore esports', why: 'A content lever that reshaped the meta right before Worlds.' },
    { id: '71b0Fa02dQQ', g: 'riot', t: 'Worlds 2015: When the Juggernaut update broke LoL', by: 'Dot Esports', why: 'Fixing one meta can create the next one.' },
  ];
  const GROUPS = { dominating: 'Bruisers dominating', explainers: 'Explainers', riot: 'Riot changes' };
  demo('videos', {
    init(s) {
      const list = $(s, '.vid-list'), ph = $(s, '.vid-player');
      list.innerHTML = Object.entries(GROUPS).map(([g, name]) => `<div class="vg"><div class="vg-h">${name}</div>` +
        VIDS.map((v, i) => v.g !== g ? '' : `<button class="vid" data-i="${i}"><img src="https://i.ytimg.com/vi/${v.id}/mqdefault.jpg" alt="" loading="lazy"><span><b>${v.t}</b><small>${v.by}</small></span></button>`).join('') + '</div>').join('');
      s._pick = (i, play) => {
        const v = VIDS[i];
        $$(list, '.vid').forEach(b => b.classList.toggle('on', +b.dataset.i === i));
        ph.innerHTML = play
          ? `<iframe src="https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&rel=0" title="${v.t}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`
          : `<button class="vid-ph" style="background-image:url(https://i.ytimg.com/vi/${v.id}/hqdefault.jpg)" aria-label="play ${v.t}"><span>▶</span></button>`;
        if (!play) $(ph, '.vid-ph').onclick = () => s._pick(i, true);
        $(s, '.vid-title').textContent = v.t + ' · ' + v.by;
        $(s, '.vid-why').textContent = v.why;
        $(s, '.vid-link').href = 'https://www.youtube.com/watch?v=' + v.id;
      };
      list.onclick = e => { const b = e.target.closest('.vid'); if (b) s._pick(+b.dataset.i, true); };
      s._pick(0, false);
    },
    leave(s) { const f = $(s, '.vid-player iframe'); if (f) s._pick(VIDS.findIndex(v => f.src.includes(v.id)), false); },
  });
})();
