/* High Level Meta: counter cycles. Interactive counter wheels for RTS, fighting games and MOBAs. */
(function () {
  const { $, $$, demo, say } = FPF.kit;
  const NS = 'http://www.w3.org/2000/svg';
  let clipSeq = 0;
  const svgEl = (tag, attrs, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };

  /* ---------- the three systems ----------
     order: clockwise around the wheel, each option beats the next `reach` options clockwise.
     chain: the slide's original notation, where "a < b" reads "a loses to b". */
  const SYS = {
    rts: {
      label: 'RTS', noun: 'strategy',
      order: ['expand', 'turtle', 'rush'], reach: 1,
      chain: ['rush', 'turtle', 'expand', 'rush'],
      nodes: {
        rush:   { name: 'Rush',   img: 'img/rts-rush.jpg', col: '#ff7a2a', tag: 'Spend everything on an early army and attack before the opponent is ready.' },
        turtle: { name: 'Turtle', img: 'img/rts-turtle.jpg', col: '#36c9c6', tag: 'Wall in, build static defence, and stay safe on one base.' },
        expand: { name: 'Expand', img: 'img/rts-expand.jpg', col: '#ffb547', tag: 'Skip the early army and invest in a second base for a bigger economy later.' },
      },
      why: {
        'turtle>rush': 'Static defence and a wall hold the attack cheaply. The rusher spent everything and is now behind.',
        'expand>turtle': 'The turtle never punishes the greed, so the expander out-earns them and arrives later with a far bigger army.',
        'rush>expand': 'The expander’s money went into a base, not units. Hit them before it pays off.',
      },
    },
    fight: {
      label: 'Fighting game', noun: 'option',
      order: ['grab', 'block', 'attack'], reach: 1,
      chain: ['attack', 'block', 'grab', 'attack'],
      nodes: {
        attack: { name: 'Attack', shape: 'circle', col: '#6e7380', tag: 'Throw out a strike.' },
        block:  { name: 'Block',  shape: 'triangle', col: '#4f9a4a', tag: 'Hold guard and wait for the opponent to commit.' },
        grab:   { name: 'Grab',   shape: 'square', col: '#c9545b', tag: 'Walk up and throw.' },
      },
      why: {
        'block>attack': 'The guard absorbs the strike and leaves the attacker open to a punish.',
        'grab>block': 'Throws ignore guard. A player who is holding block is standing still, ready to be grabbed.',
        'attack>grab': 'A grab has to get close and has slow startup. A strike hits it out of the attempt.',
      },
    },
    moba: {
      label: 'MOBA', noun: 'role',
      order: ['bruiser', 'tank', 'assassin', 'mage', 'marksman'], reach: 2,
      chain: ['marksman', 'mage', 'assassin', 'tank', 'bruiser', 'marksman'],
      nodes: {
        marksman: { name: 'Marksman', img: 'img/moba-marksman.jpg', role: 'img/role-marksman.png', col: '#ffb547', tag: 'Long range, high sustained damage, fragile and immobile.' },
        mage:     { name: 'Mage',     img: 'img/moba-mage.jpg', role: 'img/role-mage.png', col: '#a77bff', tag: 'Ranged burst and crowd control, fragile.' },
        assassin: { name: 'Assassin', img: 'img/moba-assassin.jpg', role: 'img/role-assassin.png', col: '#ff5fa2', tag: 'Mobile, dives in, bursts one target down.' },
        tank:     { name: 'Tank',     img: 'img/moba-tank.jpg', role: 'img/role-tank.png', col: '#2f7bff', tag: 'Huge durability and crowd control, low damage.' },
        bruiser:  { name: 'Bruiser',  img: 'img/moba-bruiser.jpg', role: 'img/role-bruiser.png', col: '#36c9c6', tag: 'Durable melee with steady damage and sustain.' },
      },
      why: {
        // stage 1: the outer ring
        'mage>marksman': 'Burst and out-range: the immobile carry gets caught and deleted.',
        'assassin>mage': 'Dives the mage, who can’t escape and dies before the next spell.',
        'tank>assassin': 'Crowd control locks the assassin and the burst can’t get through the health.',
        'bruiser>tank': 'Steady damage and sustain grind the tank down. The tank can’t kill back.',
        'marksman>bruiser': 'Kites at range. The bruiser never gets to stick.',
        // stage 2: the inner star
        'assassin>marksman': 'Jumps past the frontline and kills the carry.',
        'tank>mage': 'Soaks the burst and walks right in.',
        'bruiser>assassin': 'The assassin can’t burst through the bulk and loses the long fight.',
        'marksman>tank': 'Sustained damage melts all that health.',
        'mage>bruiser': 'Pokes and slows the bruiser before it can close the gap.',
      },
    },
  };

  // every edge: { w, l, stage } where w beats l
  function edgesOf(sys) {
    const n = sys.order.length, out = [];
    sys.order.forEach((w, i) => { for (let k = 1; k <= sys.reach; k++) out.push({ w, l: sys.order[(i + k) % n], stage: k }); });
    return out;
  }
  const beats = (sys, id, stage) => edgesOf(sys).filter(e => e.w === id && e.stage <= stage).map(e => e.l);
  const losesTo = (sys, id, stage) => edgesOf(sys).filter(e => e.l === id && e.stage <= stage).map(e => e.w);
  const nm = (sys, id) => sys.nodes[id].name;
  // the fighting game options keep the course deck's shapes: Simple is a sphere, Safe a triangle, Risky a square
  const SHAPES = {
    circle: (s, f) => `<circle r="${s}" fill="${f}"/>`,
    triangle: (s, f) => `<polygon points="0,${-s * 1.05} ${s * 1.1},${s * .85} ${-s * 1.1},${s * .85}" fill="${f}" stroke-linejoin="round"/>`,
    square: (s, f) => `<rect x="${-s * .9}" y="${-s * .9}" width="${s * 1.8}" height="${s * 1.8}" fill="${f}"/>`,
  };
  // the small inline picture that stands for an option in text: game art, or the deck shape
  const mini = (sys, id) => {
    const N = sys.nodes[id];
    return N.img ? `<img class="cc-mi" src="${N.img}" alt="">`
      : `<svg class="cc-mi" viewBox="-12 -12 24 24">${SHAPES[N.shape](10, N.col)}</svg>`;
  };
  const tagged = (sys, id) => `<b style="color:${sys.nodes[id].col}">${mini(sys, id)}${nm(sys, id)}</b>`;

  /* ---------- the wheel: an SVG, 720 × 720 units ---------- */
  function wheel(svg, sys, opts = {}) {
    const n = sys.order.length, C = 360, R = n > 3 ? 250 : 225, r = n > 3 ? 84 : 100;
    svg.setAttribute('viewBox', '0 0 720 720');
    svg.innerHTML = '';
    const pos = {};
    sys.order.forEach((id, i) => {
      const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
      pos[id] = { x: C + R * Math.cos(a), y: C + R * Math.sin(a), a };
    });
    svgEl('circle', { cx: C, cy: C, r: R, class: 'cc-ring' }, svg);
    const gE = svgEl('g', {}, svg), gN = svgEl('g', {}, svg);

    const W = { svg, sys, pos, stage: opts.stage || sys.reach, edges: [], nodes: {} };
    for (const e of edgesOf(sys)) {
      const P = pos[e.w], Q = pos[e.l];
      // stage 1 bows outward along the ring, stage 2 cuts straight across
      let cx, cy;
      if (e.stage === 1) {
        const mx = (P.x + Q.x) / 2 - C, my = (P.y + Q.y) / 2 - C, d = Math.hypot(mx, my) || 1, push = n > 3 ? 62 : 120;
        cx = C + mx / d * (d + push); cy = C + my / d * (d + push);
      } else { cx = (P.x + Q.x) / 2; cy = (P.y + Q.y) / 2; }
      const toward = (A, tx, ty, by) => { const dx = tx - A.x, dy = ty - A.y, d = Math.hypot(dx, dy); return { x: A.x + dx / d * by, y: A.y + dy / d * by }; };
      const S = toward(P, cx, cy, r + 6), T = toward(Q, cx, cy, r + 4);
      const dx = T.x - cx, dy = T.y - cy, d = Math.hypot(dx, dy), ux = dx / d, uy = dy / d;
      const E = { x: T.x - ux * 18, y: T.y - uy * 18 };
      const g = svgEl('g', { class: `cc-edge s${e.stage}` }, gE);
      const dPath = e.stage === 1 ? `M${S.x},${S.y} Q${cx},${cy} ${E.x},${E.y}` : `M${S.x},${S.y} L${E.x},${E.y}`;
      svgEl('path', { d: dPath, class: 'cc-hit' }, g);
      svgEl('path', { d: dPath, class: 'cc-line' }, g);
      svgEl('polygon', { points: `${T.x},${T.y} ${E.x - uy * 11},${E.y + ux * 11} ${E.x + uy * 11},${E.y - ux * 11}`, class: 'cc-head' }, g);
      g.addEventListener('pointerenter', () => opts.onEdge?.(e));
      g.addEventListener('pointerleave', () => opts.onEdge?.(null));
      W.edges.push({ ...e, g });
    }
    for (const id of sys.order) {
      const N = sys.nodes[id], P = pos[id];
      const g = svgEl('g', { class: 'cc-node', transform: `translate(${P.x},${P.y})`, tabindex: 0, role: 'button', 'aria-label': N.name }, gN);
      svgEl('circle', { r: r + 9, class: 'cc-halo' }, g);
      // the disc: game art clipped to a circle under a name band, or the deck shape on cream
      const disc = svgEl('g', { class: 'cc-disc' }, g), cid = `cc-clip-${++clipSeq}`, band = n > 3 ? 30 : 36;
      svgEl('circle', { r }, svgEl('clipPath', { id: cid }, disc));
      const art = svgEl('g', { 'clip-path': `url(#${cid})` }, disc);
      if (N.img) {
        svgEl('image', { href: N.img, x: -r, y: -r, width: r * 2, height: r * 2, preserveAspectRatio: 'xMidYMid slice' }, art);
        svgEl('rect', { x: -r, y: r - band - 6, width: r * 2, height: band + 6, class: 'cc-band' }, art);
      } else {
        svgEl('circle', { r, class: 'cc-cream' }, art);
        const sh = svgEl('g', { transform: `translate(0,${-band / 2 + 2})`, class: 'cc-shape' }, art);
        sh.innerHTML = SHAPES[N.shape](r * .42, N.col);
        svgEl('rect', { x: -r, y: r - band - 6, width: r * 2, height: band + 6, class: 'cc-band', fill: N.col }, art);
      }
      svgEl('circle', { r, class: 'cc-rim', stroke: N.col }, disc);
      svgEl('text', { y: r - band / 2 - 1, class: 'cc-nm', 'font-size': n > 3 ? 16 : 21 }, disc).textContent = N.name;
      if (N.role) {
        const bx = -r * .74, by = -r * .74;
        svgEl('circle', { cx: bx, cy: by, r: 23, class: 'cc-badge' }, disc);
        svgEl('image', { href: N.role, x: bx - 17, y: by - 17, width: 34, height: 34 }, disc);
      }
      // the verdict pill sits on the side of the node away from the centre
      const out = { x: Math.cos(P.a), y: Math.sin(P.a) }, py = Math.abs(out.y) > .6 ? out.y * (r + 30) : r + 30;
      const pill = svgEl('g', { class: 'cc-pill', transform: `translate(0,${py})` }, g);
      svgEl('rect', { x: -95, y: -17, width: 190, height: 34, rx: 17 }, pill);
      svgEl('text', { y: 7 }, pill);
      g.addEventListener('pointerenter', () => opts.onNode?.(id, false));
      g.addEventListener('pointerleave', () => opts.onNode?.(null, false));
      g.addEventListener('click', () => opts.onNode?.(id, true));
      g.addEventListener('keydown', ev => { if (ev.key === 'Enter') opts.onNode?.(id, true); });
      W.nodes[id] = { g, pill };
    }
    W.setStage = s => { W.stage = s; W.edges.forEach(e => e.g.classList.toggle('hide', e.stage > s)); };
    W.clear = () => {
      svg.classList.remove('focus');
      W.edges.forEach(e => e.g.classList.remove('win', 'lose', 'hot'));
      Object.values(W.nodes).forEach(x => x.g.classList.remove('sel', 'beaten', 'counter', 'pop', 'next'));
    };
    // highlight one option: green arrows to what it beats, red arrows from what beats it
    W.select = id => {
      W.clear(); if (!id) return;
      svg.classList.add('focus');
      W.nodes[id].g.classList.add('sel');
      for (const e of W.edges) {
        if (e.stage > W.stage) continue;
        if (e.w === id) { e.g.classList.add('win'); pill(e.l, `${nm(sys, id)} beats this`, 'beaten'); }
        if (e.l === id) { e.g.classList.add('lose'); pill(e.w, `beats ${nm(sys, id)}`, 'counter'); }
      }
    };
    W.edge = e => {
      W.clear(); if (!e) return;
      svg.classList.add('focus');
      W.edges.find(x => x.w === e.w && x.l === e.l).g.classList.add('hot');
      pill(e.w, 'winner', 'counter'); pill(e.l, 'loser', 'beaten');
      W.nodes[e.w].g.classList.add('sel');
    };
    function pill(id, text, cls) { W.nodes[id].g.classList.add(cls); W.nodes[id].pill.querySelector('text').textContent = text; }
    W.pill = pill;
    W.setStage(W.stage);
    return W;
  }

  /* ---------- panel text ---------- */
  function nodeHTML(sys, id, stage) {
    const N = sys.nodes[id];
    const li = (ids, f) => ids.map(x => `<li>${tagged(sys, x)}<span>${sys.why[f(x)]}</span></li>`).join('');
    return `<div class="cc-name" style="color:${N.col}">${mini(sys, id)}${N.name}</div><p class="cc-tag">${N.tag}</p>
      <div class="cc-row win"><b>Beats</b><ul>${li(beats(sys, id, stage), x => `${id}>${x}`)}</ul></div>
      <div class="cc-row lose"><b>Loses to</b><ul>${li(losesTo(sys, id, stage), x => `${x}>${id}`)}</ul></div>`;
  }
  const edgeHTML = (sys, e) => `<div class="cc-name">${tagged(sys, e.w)} <span class="cc-verb">beats</span> ${tagged(sys, e.l)}</div><p class="cc-why">${sys.why[`${e.w}>${e.l}`]}</p>`;

  /* the slide's own notation, with every "<" explained on hover */
  function notation(box, sys, W, out, idle) {
    box.innerHTML = sys.chain.map((id, i) => {
      const t = `<span class="cc-tok" style="color:${sys.nodes[id].col}">${nm(sys, id)}</span>`;
      return i ? `<button class="cc-lt" data-a="${sys.chain[i - 1]}" data-b="${id}">&lt;</button>${t}` : t;
    }).join('');
    $$(box, '.cc-lt').forEach(b => {
      b.onpointerenter = b.onfocus = () => {
        const a = b.dataset.a, c = b.dataset.b;
        W.edge({ w: c, l: a });
        say(out, `<div class="cc-name"><span class="cc-tok">${nm(sys, a)} &lt; ${nm(sys, c)}</span></div><p class="cc-why">reads <b>“${nm(sys, a)} loses to ${nm(sys, c)}”</b>, the arrow from ${tagged(sys, c)} to ${tagged(sys, a)}. ${sys.why[`${c}>${a}`]}</p>`);
      };
      b.onpointerleave = b.onblur = idle;
    });
  }

  /* one wheel slide: hover previews, click pins, plus the notation strip and the meta walk */
  function wheelSlide(key, extra = {}) {
    return {
      init(s) {
        const sys = SYS[key], out = $(s, '.cc-panel');
        let pinned = null;
        const idle = () => {
          if (pinned) { W.select(pinned); say(out, nodeHTML(sys, pinned, W.stage)); }
          else { W.clear(); say(out, `<p class="cc-idle">${out.dataset.idle}</p>`); }
        };
        const W = wheel($(s, 'svg.cc-wheel'), sys, {
          stage: extra.stage,
          onNode(id, click) {
            stopWalk();
            if (click) pinned = pinned === id ? null : id;
            if (id && !click) { W.select(id); say(out, nodeHTML(sys, id, W.stage)); } else idle();
          },
          onEdge(e) { if (e) { stopWalk(); W.edge(e); say(out, edgeHTML(sys, e)); } else idle(); },
        });
        s._w = W;
        const nb = $(s, '.cc-notation'); if (nb) notation(nb, sys, W, out, idle);

        // stage toggle (MOBA)
        $$(s, '[data-stage]').forEach(b => b.onclick = () => {
          $$(s, '[data-stage]').forEach(x => x.classList.toggle('on', x === b));
          W.setStage(+b.dataset.stage); idle(); extra.onStage?.(s, +b.dataset.stage);
        });

        // walk the meta: whatever is popular gets answered by its counter, which becomes popular next
        let timer = null;
        const walkBtn = $(s, '.cc-walk');
        function stopWalk() { clearTimeout(timer); timer = null; if (walkBtn) walkBtn.classList.remove('on'); }
        s._stopWalk = stopWalk;
        if (walkBtn) walkBtn.onclick = () => {
          if (timer) { stopWalk(); idle(); return; }
          pinned = null; walkBtn.classList.add('on');
          const n = sys.order.length, prevOf = id => sys.order[(sys.order.indexOf(id) - 1 + n) % n];
          let cur = sys.chain[0], step = 0;
          const tick = () => {
            const nxt = prevOf(cur);
            W.clear(); W.svg.classList.add('focus');
            W.pill(cur, 'everyone plays this', 'pop'); W.pill(nxt, 'so this rises', 'next');
            W.edges.find(e => e.w === nxt && e.l === cur).g.classList.add('hot');
            say(out, `<div class="cc-kick">meta, week ${step + 1}</div><div class="cc-name">Everyone plays ${tagged(sys, cur)}</div><p class="cc-why">so players switch to ${tagged(sys, nxt)}. ${sys.why[`${nxt}>${cur}`]}</p>`);
            cur = nxt; step++;
            timer = step < n * 2 ? setTimeout(tick, 2600) : (setTimeout(() => { stopWalk(); idle(); }, 2600), null);
          };
          tick();
        };
        idle();
        extra.init?.(s, W);
      },
      leave(s) { s._stopWalk?.(); },
    };
  }

  demo('cc-rts', wheelSlide('rts'));
  demo('cc-fight', wheelSlide('fight'));
  demo('cc-moba', wheelSlide('moba', { stage: 1 }));

  /* ---------- MOBA: why two stages. The matchup grid next to the wheel ---------- */
  demo('cc-grid', wheelSlide('moba', {
    stage: 1,
    init(s, W) { grid(s, W, 1); },
    onStage(s, st) { grid(s, s._w, st); },
  }));
  function grid(s, W, stage) {
    const sys = SYS.moba, ids = ['marksman', 'mage', 'assassin', 'tank', 'bruiser'], box = $(s, '.cc-grid');
    const res = (a, b) => a === b ? 'self' : beats(sys, a, stage).includes(b) ? 'w' : beats(sys, b, stage).includes(a) ? 'l' : 'n';
    box.innerHTML = `<table><tr><th class="cc-corner">you ↓ · them →</th>${ids.map(b => `<th>${mini(sys, b)}<small>${nm(sys, b)}</small></th>`).join('')}</tr>${ids.map(a => `<tr><th>${mini(sys, a)}${nm(sys, a)}</th>${ids.map(b => {
      const r = res(a, b);
      return `<td class="${r}" data-a="${a}" data-b="${b}">${{ w: 'WIN', l: 'LOSE', n: 'even', self: '' }[r]}</td>`;
    }).join('')}</tr>`).join('')}</table>`;
    let decisive = 0, neutral = 0;
    ids.forEach((a, i) => ids.slice(i + 1).forEach(b => (res(a, b) === 'n' ? neutral++ : decisive++)));
    say($(s, '.cc-count'), stage === 1
      ? `<b class="bad">${neutral} of 10 matchups are even.</b> Each role beats one and loses to one. Against the other two, your pick barely matters, so counter-picking is a weak tool.`
      : `<b class="good">All ${decisive} matchups are decided.</b> Each role beats two and loses to two. Every pick in draft answers something and is answered by something.`);
    const out = $(s, '.cc-panel');
    $$(box, 'td').forEach(td => {
      td.onpointerenter = () => {
        const a = td.dataset.a, b = td.dataset.b;
        if (td.classList.contains('w')) { W.edge({ w: a, l: b }); say(out, edgeHTML(sys, { w: a, l: b })); }
        else if (td.classList.contains('l')) { W.edge({ w: b, l: a }); say(out, edgeHTML(sys, { w: b, l: a })); }
        else if (td.classList.contains('n')) { W.clear(); W.svg.classList.add('focus'); W.pill(a, 'even', 'pop'); W.pill(b, 'even', 'pop'); say(out, `<div class="cc-name">${tagged(sys, a)} <span class="cc-verb">vs</span> ${tagged(sys, b)}</div><p class="cc-why">No arrow connects them with one stage. Neither pick answers the other; the game is decided elsewhere.</p>`); }
      };
      td.onpointerleave = () => { W.clear(); say(out, `<p class="cc-idle">${out.dataset.idle}</p>`); };
    });
  }

  /* ---------- counter-pick drill ---------- */
  demo('cc-quiz', {
    init(s) {
      const out = $(s, '.cc-q-out'), opts = $(s, '.cc-q-opts'), svg = $(s, 'svg.cc-wheel'), score = $(s, '.cc-q-score');
      let right = 0, total = 0, sys, enemy, W, done;
      function ask() {
        const keys = Object.keys(SYS);
        let k; do { k = keys[Math.floor(Math.random() * keys.length)]; } while (keys.length > 1 && SYS[k] === sys && Math.random() < .5);
        sys = SYS[k];
        let e; do { e = sys.order[Math.floor(Math.random() * sys.order.length)]; } while (e === enemy && sys.order.length > 1);
        enemy = e; done = false;
        W = wheel(svg, sys, {});
        W.clear(); svg.classList.add('focus', 'quiz'); W.pill(enemy, 'enemy', 'pop');
        const many = sys.reach > 1;
        say($(s, '.cc-q-prompt'), `<span class="cc-kick">${sys.label}</span><br>The enemy goes ${tagged(sys, enemy)}.<br>${many ? `Which ${sys.noun}s counter it? There are two.` : `What do you pick?`}`);
        opts.innerHTML = sys.order.filter(x => x !== enemy).map(x => `<button class="btn" data-id="${x}">${mini(sys, x)}${nm(sys, x)}</button>`).join('');
        say(out, '');
        $$(opts, 'button').forEach(b => b.onclick = () => pick(b));
      }
      let found = [];
      function pick(b) {
        if (done) return;
        const id = b.dataset.id, good = losesTo(sys, enemy, sys.reach), ok = good.includes(id);
        b.classList.add(ok ? 'good' : 'bad');
        if (!ok) {
          const beatsYou = beats(sys, enemy, sys.reach).includes(id);
          say(out, beatsYou ? `${tagged(sys, enemy)} beats ${tagged(sys, id)}. ${sys.why[`${enemy}>${id}`]}` : `${tagged(sys, id)} doesn’t answer ${tagged(sys, enemy)}.`);
          W.select(enemy); finish(false); return;
        }
        found.push(id);
        W.select(enemy);
        say(out, `${tagged(sys, id)} beats ${tagged(sys, enemy)}. ${sys.why[`${id}>${enemy}`]}`);
        if (found.length === good.length) finish(true);
      }
      function finish(ok) {
        done = true; total++; if (ok) right++; found = [];
        say(score, `${right} / ${total}`);
        $$(opts, 'button').forEach(b => { if (losesTo(sys, enemy, sys.reach).includes(b.dataset.id)) b.classList.add('good'); });
      }
      $(s, '.cc-q-next').onclick = ask;
      ask();
    },
  });

  /* ---------- summary: the three wheels side by side ---------- */
  demo('cc-sum', {
    init(s) {
      $$(s, 'svg.cc-wheel').forEach(svg => {
        const sys = SYS[svg.dataset.sys], W = wheel(svg, sys, { onNode: id => W.select(id) });
      });
    },
  });
})();
