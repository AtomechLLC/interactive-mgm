/* Renders the practice portal from window.PROGRAM (program.js).
   PRACTICE.schedule(el)          the day-by-day table on practice/index.html
   PRACTICE.track(el, bar, which) the day cards on workshop.html ('workshop') or self-study.html ('study')
   A second course reuses this file by setting PROGRAM.config (see dgms/practice/program.js):
   root (path to the site root), key (the localStorage key), fallback (course icon in assets/img/home),
   after (the capstone's label in the progress bar) and pageLabel (the heading over a part's `page` line). */
(function () {
  const { DAYS, KINDS } = window.PROGRAM;
  const CFG = Object.assign({ root: '../', key: 'mgm-practice-done', fallback: 'mgm.svg' }, window.PROGRAM.config);
  const HOME = CFG.root + 'assets/img/home/';
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const dayLabel = d => d.label || `Day ${d.day}`;
  const dayShort = d => d.label ? 'After' : String(d.day);
  const anchor = d => `day-${d.day}`;

  /* page icon from assets/img/home: section--page.svg, then the module icon, then the course icon */
  function icon(href) {
    const p = (href.startsWith(CFG.root) ? href.slice(CFG.root.length) : href).replace(/\/index\.html.*$/, '').split('/');
    return { src: `${HOME}${p.join('--')}.svg`, alt1: `${HOME}${p[0]}.svg` };
  }
  const img = (l, cls) => {
    if (l.icon) return `<img src="${HOME}${l.icon}" alt="" >`;
    const i = icon(l.href);
    return `<img${cls ? ` class="${cls}"` : ''} src="${i.src}" alt=""  onerror="if(!this.dataset.f){this.dataset.f=1;this.src='${i.alt1}'}else{this.onerror=null;this.src='${HOME}${CFG.fallback}'}">`;
  };

  /* progress for the self-study path, kept in this browser only */
  const KEY = CFG.key;
  function loadDone() { try { return new Set(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch (e) { return new Set(); } }
  function saveDone(s) { try { localStorage.setItem(KEY, JSON.stringify([...s])); } catch (e) { /* storage blocked: progress just isn't kept */ } }

  function schedule(el) {
    el.innerHTML = `<div class="shead"><span>Day</span><span>Live workshop</span><span>Self-study</span><span>Interactives to open</span></div>` +
      DAYS.map(d => {
        const w = d.workshop, s = d.study;
        return `<div class="srow">
  <div class="d"><b>${esc(d.label ? 'After' : 'Day ' + d.day)}</b><small>${esc(d.theme)}</small></div>
  <div class="w"><span class="lab">Workshop</span>${w ? `<a class="t" href="workshop.html#${anchor(d)}">${esc(w.title)}</a>${w.meta ? `<span class="mod">${esc(w.meta.type)} · ${esc(w.meta.time)}</span>` : ''}` : `<span class="none">${esc(d.noWorkshop || 'On your own from here')}</span>`}</div>
  <div class="s"><span class="lab">Self-study${s.part ? ' · ' + esc(s.part) : ''}</span>${s.none ? `<span class="none">${esc(s.title)}</span>` : `<a class="t" href="self-study.html#${anchor(d)}">${esc(s.title)}</a>`}<span class="mod">${mod(d, s)}</span></div>
  <div class="icons">${d.links.map(l => `<a href="${l.href}" title="${esc(l.label)}: ${esc(l.note || '')}">${img(l)}</a>`).join('')}</div>
</div>`;
      }).join('');
  }

  /* the module line; a self-study part can name its own module when it differs from the day's */
  const mod = (d, s) => { const m = (s && s.module) || d.module, h = s && s.module ? s.moduleHref : d.moduleHref; return h ? `<a href="${h}">${esc(m)}</a>` : esc(m); };
  const extras = list => list && list.length ? `<div class="res">${list.map(r => `<a href="${r.href}">${esc(r.label)} ↗</a>`).join('')}</div>` : '';
  const steps = list => `<ol class="steps">${list.map(x => `<li>${x}</li>`).join('')}</ol>`;
  function framework(f) {
    if (!f) return '';
    return `<h4>Framework: ${esc(f.name)}</h4><div class="fw">${f.items.map(([k, v]) => `<b>${esc(k)}</b><span>${esc(v)}</span>`).join('')}${f.note ? `<span class="note">${esc(f.note)}</span>` : ''}${f.sample ? `<span class="note">${esc(f.sample)}</span>` : ''}</div>`;
  }
  function links(d, list) {
    return `<h4>Interactives for this ${list ? 'part' : 'day'}</h4><div class="links">${(list || d.links).map(l => `<a class="lk" href="${l.href}">${img(l)}<span><b>${esc(l.label)}</b><small>${esc(l.note || '')}</small></span></a>`).join('')}</div>`;
  }

  function workshopCard(d) {
    const w = d.workshop;
    const zones = w.meta ? w.meta.zoom.split(/,\s*/) : [];
    return `<article class="day" id="${anchor(d)}" data-zoom="${esc(zones.join('|'))}">
  <div class="dh"><div class="num"><small>Day</small>${dayShort(d)}</div><div><h3>${esc(w.title)}</h3><div class="sub">${w.kinds.map(k => `<span class="chip k">${esc(KINDS[k])}</span>`).join(' ')} · ${mod(d)}</div></div><div></div></div>
  <div class="db"><div>
    <h4>Goal</h4><p class="goal">${w.goal}</p>${w.why ? `<p>${w.why}</p>` : ''}
    ${w.example ? `<h4>Instructor’s example</h4><p>${w.example}</p>` : ''}
    ${framework(w.framework)}
    ${(w.hints || []).map(h => `<p class="aside"><b>Hint:</b> ${h}</p>`).join('')}
    <h4>Task</h4>
    ${w.parts ? w.parts.map(p => `<p><b>${esc(p.title)}</b></p>${steps(p.steps)}${p.aside ? `<p class="aside">${p.aside}</p>` : ''}`).join('') : steps(w.steps)}
    ${extras(w.res)}
    ${w.meta ? `<div class="meta"><span class="chip">${esc(w.meta.type)}</span><span class="chip">${esc(w.meta.time)}</span>${zones.map(z => `<span class="chip">Zoom: ${esc(z)}</span>`).join('')}</div>` : ''}
  </div><div>
    ${links(d)}
    <div class="pair">After class: <a href="self-study.html#${anchor(d)}">${d.study.none ? 'no self-study today' : `Self-study ${esc(d.study.part)}, ${esc(d.study.title)}`} →</a></div>
  </div></div>
</article>`;
  }

  function rings(el) {
    /* concentric rings for a skill / RPS / RNG split, like the deck's ring charts */
    const v = el.dataset.r.split(',').map(Number), names = ['Skill test', 'Rock-paper-scissors', 'RNG'], cols = ['#152044', '#ffb951', '#2f6f5e'];
    const arcs = v.map((p, i) => {
      const r = 50 - i * 12, c = 2 * Math.PI * r;
      return `<circle cx="60" cy="60" r="${r}" fill="none" stroke="#e8dfcc" stroke-width="9"/><circle cx="60" cy="60" r="${r}" fill="none" stroke="${cols[i]}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${c * p / 100} ${c}" transform="rotate(-90 60 60)"/>`;
    }).join('');
    el.innerHTML = `<svg viewBox="0 0 120 120" role="img" aria-label="${v.map((p, i) => names[i] + ' ' + p + '%').join(', ')}">${arcs}</svg><ul>${v.map((p, i) => `<li style="--c:${cols[i]}">${names[i]} ${p}%</li>`).join('')}</ul>`;
  }

  function studyCard(d, done) {
    const s = d.study;
    if (s.none) {
      return `<article class="day" id="${anchor(d)}"><div class="dh"><div class="num"><small>Day</small>${dayShort(d)}</div><div><h3>${esc(s.title)}</h3><div class="sub">${esc(d.module)}</div></div><div></div></div>
  <div class="db"><div><p>${s.note}</p></div><div>${links(d)}${d.workshop ? `<div class="pair">Same day in class: <a href="workshop.html#${anchor(d)}">Workshop, ${esc(d.workshop.title)} →</a></div>` : ''}</div></div></article>`;
    }
    const res = [
      s.template ? `<a href="${s.template}">Blank template ↗</a>` : '',
      s.tab ? `<a href="${s.tab}">Worked example in the templates doc ↗</a>` : '',
      s.reading ? `<a href="${s.reading.href}">${esc(s.reading.label)} ↗</a>` : ''
    ].join('');
    return `<article class="day${done.has(d.day) ? ' is-done' : ''}" id="${anchor(d)}">
  <div class="dh"><div class="num"><small>${d.label ? 'After' : 'Day'}</small>${d.label ? 'class' : d.day}</div><div><h3>${esc(s.title)}</h3><div class="sub">Self-study project · ${esc(s.part)} · ${mod(d, s)}</div></div>
  <label class="done"><input type="checkbox" data-day="${d.day}"${done.has(d.day) ? ' checked' : ''}> Done</label></div>
  <div class="db"><div>
    ${s.goal ? `<h4>Goal</h4><p class="goal">${s.goal}</p>` : ''}
    ${s.after ? `<h4>After the workshop</h4><p class="goal">${s.after}</p>` : ''}
    ${framework(s.framework)}
    <h4>Exercise</h4>
    ${s.choose ? `<p>Choose the version that fits your game.</p><div class="variants">${s.variants.map(v => `<div><b>${esc(v.title)}</b>${steps(v.steps)}</div>`).join('')}</div><p>Get feedback in your Discord thread.</p>` : steps(s.steps)}
    ${s.quote ? `<blockquote>${esc(s.quote)}</blockquote>` : ''}
    ${s.page ? `<h4>${esc(CFG.pageLabel || 'Hand in')}</h4><p>${s.page}</p>` : ''}
    ${extras(s.res)}
    ${res ? `<div class="res">${res}</div>` : ''}
    ${s.example ? `<details class="ex"${d.day === 1 ? ' open' : ''}><summary>Worked example: ${esc(s.example.title)}</summary><div class="exb">${s.example.html}</div></details>` : ''}
  </div><div>
    ${links(d, s.links)}
    ${d.workshop ? `<div class="pair">Same day in class: <a href="workshop.html#${anchor(d)}">Workshop, ${esc(d.workshop.title)} →</a></div>` : ''}
  </div></div>
</article>`;
  }

  function track(el, bar, which) {
    const days = DAYS.filter(d => which === 'workshop' ? d.workshop : true);
    const done = loadDone();
    el.innerHTML = days.map(d => which === 'workshop' ? workshopCard(d) : studyCard(d, done)).join('');
    el.querySelectorAll('.rings').forEach(rings);

    if (which === 'study') {
      const counted = days.filter(d => !d.study.none);
      bar.innerHTML = `<span class="lbl">Your progress</span><span class="meter"><i></i></span><span class="count"></span>` +
        counted.map(d => `<a class="jump" href="#${anchor(d)}" data-day="${d.day}" title="${esc(d.study.title)}">${d.label ? (CFG.after || '17+') : d.day}</a>`).join('');
      const refresh = () => {
        const n = counted.filter(d => done.has(d.day)).length;
        bar.querySelector('.meter i').style.width = (100 * n / counted.length) + '%';
        bar.querySelector('.count').textContent = `${n} of ${counted.length} parts done`;
        bar.querySelectorAll('a.jump').forEach(a => a.classList.toggle('done', done.has(+a.dataset.day)));
      };
      el.addEventListener('change', e => {
        const box = e.target.closest('input[data-day]');
        if (!box) return;
        const day = +box.dataset.day;
        box.checked ? done.add(day) : done.delete(day);
        box.closest('article').classList.toggle('is-done', box.checked);
        saveDone(done); refresh();
      });
      refresh();
    } else {
      const norm = z => z === 'Game' ? 'Game Project' : z;
      const order = ['System', 'Action', 'Feature', 'Encounter', 'Game Project', 'Creative'];
      bar.innerHTML = `<span class="lbl">Zoom level</span>` + ['All', ...order.filter(z => days.some(d => d.workshop.meta && d.workshop.meta.zoom.split(/,\s*/).map(norm).includes(z)))].map(z => `<button class="chip" data-z="${z}" aria-pressed="${z === 'All'}">${z}</button>`).join('') +
        `<span style="flex:1"></span>` + days.map(d => `<a class="jump" href="#${anchor(d)}" title="${esc(d.workshop.title)}">${d.day}</a>`).join('');
      bar.addEventListener('click', e => {
        const b = e.target.closest('button[data-z]');
        if (!b) return;
        bar.querySelectorAll('button[data-z]').forEach(x => x.setAttribute('aria-pressed', x === b));
        el.querySelectorAll('article.day').forEach(a => {
          const zs = a.dataset.zoom.split('|').map(norm);
          a.hidden = b.dataset.z !== 'All' && !zs.includes(b.dataset.z);
        });
      });
    }
    /* land on the requested day after rendering */
    const pad = () => { document.documentElement.style.scrollPaddingTop = (bar.offsetHeight + 12) + 'px'; };
    const land = () => { pad(); if (location.hash) { const t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView({ behavior: 'instant' }); } };
    land(); addEventListener('load', land); addEventListener('resize', pad);
  }

  window.PRACTICE = { schedule, track };
})();
