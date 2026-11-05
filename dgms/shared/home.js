/* Renders the DGMS course home and the module homes from window.DGMS (catalog.js).
   Course home (dgms/index.html): <main id="mods"> gets one section per module, like the MGM home: a header that
   opens the module home, then that module's pages. Module home (dgms/<module>/index.html, body data-module="<key>"):
   the band header, the module's interactive page cards, its slide GIFs, and links to the previous and next module. */
(function () {
  const { PARTS, PAGES, GIFS } = window.DGMS;
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const n = (k, w) => `${k} ${w}${k === 1 ? '' : 's'}`;
  const pagesOf = k => PAGES.filter(p => p[3] === k);
  const gifsOf = k => GIFS.filter(g => g[0].startsWith(k + '--'));
  const icon = p => `dgms--${p.replace('/', '--')}.svg`;
  const key = document.body.dataset.module;

  if (!key) {
    // course home
    const ROOT = '../assets/img/home/';
    document.getElementById('mods').innerHTML = PARTS.map(([k, code, title, deck, line]) => {
      const here = pagesOf(k), gifs = gifsOf(k);
      if (!here.length) return '';
      return `<section class="mod" id="${k}">
    <a class="head" href="${k}/index.html"><img src="${ROOT}dgms--${k}.svg" alt=""><span><span class="code">${code}</span><b>${esc(title)}</b><small><i>${esc(deck)}</i>: ${esc(line)}</small></span><span class="go">Module home →</span></a>
    <div class="pages">${here.map(([p, t]) => {
        const g = gifs.filter(x => x[0].startsWith(p.replace('/', '--') + '.') || x[0].startsWith(p.replace('/', '--') + '-')).length;
        return `<a class="pg" href="${p}/index.html"><img src="${ROOT}${icon(p)}" alt=""><span><b>${esc(t)}</b><small>${g ? n(g, 'GIF') : 'Interactive'}</small></span></a>`;
      }).join('')}</div>
  </section>`;
    }).join('');
    return;
  }

  // module home
  const i = PARTS.findIndex(p => p[0] === key), [k, code, title, deck, line] = PARTS[i];
  const ROOT = '../../assets/img/home/', here = pagesOf(k), gifs = gifsOf(k);
  const words = title.split(' '), last = words.pop();
  document.title = `${code} · ${title} · Directing Game Mechanics`;
  document.body.insertAdjacentHTML('afterbegin', `<div class="band"><header>
  <a class="up" href="../index.html">← All modules</a>
  <div class="kicker">${code}</div>
  <h1>${words.length ? esc(words.join(' ')) + ' ' : ''}<span>${esc(last)}</span></h1>
  <p>Visuals for <i>${esc(deck)}</i>: ${esc(line)}.</p>
</header></div>`);
  const prev = PARTS[i - 1], next = PARTS[i + 1];
  document.getElementById('cards').innerHTML = here.map(([p, t, b]) =>
    `<a class="card" href="${p.split('/')[1]}/index.html"><img src="${ROOT}${icon(p)}" alt=""><span><b>${esc(t)}</b><small>${esc(b)}</small></span></a>`).join('');
  document.getElementById('gifs').innerHTML = gifs.map(([f, t, c]) =>
    `<figure><a href="../gifs/${f}"><img src="../gifs/${f}" alt="${esc(t)}" loading="lazy"></a><figcaption><b>${esc(t)}</b>${esc(c)}</figcaption></figure>`).join('')
    || '<p>No GIFs yet.</p>';
  document.getElementById('next').innerHTML = (prev ? `<a href="../${prev[0]}/index.html">← ${prev[1]} · ${esc(prev[2])}</a>` : '<span></span>') +
    (next ? `<a href="../${next[0]}/index.html">${next[1]} · ${esc(next[2])} →</a>` : '');
})();
