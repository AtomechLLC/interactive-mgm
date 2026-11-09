/* Collapsible GIF sections for the module home pages.
 *
 * Every <section> whose <h2> mentions "GIF" (Slide GIFs, GIFs, Slide GIFs: Enemies and Resistance...)
 * gets a clickable header and starts collapsed, so the big looping GIFs only load when wanted.
 * Open/closed is one shared choice for all GIF sections on every page, saved in this browser
 * (localStorage 'mgm:gifSectionsOpen'): expand one and they all stay expanded on later visits.
 *
 * Include once per page, after the page's own scripts:  <script src="../assets/gif-sections.js" defer></script>
 */
(() => {
  const KEY = 'mgm:gifSectionsOpen';
  const load = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };
  const save = v => { try { localStorage.setItem(KEY, v ? '1' : '0'); } catch {} };

  const css = `
  .gif-sec > h2 { margin-bottom: 4px; }
  .gif-toggle { all: unset; box-sizing: border-box; cursor: pointer; display: inline-flex; align-items: center; gap: 10px; font: inherit; color: inherit; border-radius: 8px; padding: 2px 6px 2px 0; }
  .gif-toggle:hover { opacity: .85; }
  .gif-toggle:focus-visible { outline: 2px solid currentColor; outline-offset: 3px; }
  .gif-toggle .gif-chev { display: inline-block; width: .9em; font-size: .8em; transition: transform .15s; }
  .gif-sec.open .gif-toggle .gif-chev { transform: rotate(90deg); }
  .gif-toggle .gif-hint { font-size: .55em; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; opacity: .6; }
  .gif-body[hidden] { display: none !important; }
  .gif-sec:not(.open) { padding-bottom: 16px; }`;

  function init() {
    const sections = [...document.querySelectorAll('section')].filter(s => {
      const h = s.querySelector(':scope > h2');
      return h && /\bGIFs?\b/i.test(h.textContent);
    });
    if (!sections.length) return;

    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    let open = load();
    const parts = sections.map((s, i) => {
      const h = s.querySelector(':scope > h2');
      const body = document.createElement('div');
      body.className = 'gif-body';
      body.id = 'gif-body-' + i;
      // everything but the heading (and a trailing "next module" nav) folds away
      [...s.children].forEach(c => { if (c !== h && !c.matches('nav.next')) body.appendChild(c); });
      h.after(body);

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'gif-toggle';
      btn.setAttribute('aria-controls', body.id);
      const chev = document.createElement('span');
      chev.className = 'gif-chev';
      chev.setAttribute('aria-hidden', 'true');
      chev.textContent = '▸';
      const label = document.createElement('span');
      while (h.firstChild) label.appendChild(h.firstChild);
      const hint = document.createElement('span');
      hint.className = 'gif-hint';
      btn.append(chev, label, hint);
      h.appendChild(btn);
      s.classList.add('gif-sec');
      btn.addEventListener('click', () => { open = !s.classList.contains('open'); save(open); apply(open); });
      return { s, body, btn, hint };
    });

    function apply(v) {
      parts.forEach(({ s, body, btn, hint }) => {
        s.classList.toggle('open', v);
        body.hidden = !v;
        btn.setAttribute('aria-expanded', String(v));
        const n = body.querySelectorAll('figure').length;
        hint.textContent = v ? 'hide' : (n ? `show ${n}` : 'show');
      });
    }
    apply(open);

    // a link straight to something inside a collapsed section (#gifs) opens it for this visit
    const reveal = () => {
      const id = decodeURIComponent(location.hash.slice(1));
      const t = id && document.getElementById(id);
      if (t && !open && parts.some(p => p.body.contains(t))) { apply(true); t.scrollIntoView(); }
    };
    reveal();
    addEventListener('hashchange', reveal);
    // keep other open tabs in step
    addEventListener('storage', e => { if (e.key === KEY) { open = load(); apply(open); } });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
