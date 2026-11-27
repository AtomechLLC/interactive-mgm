/* The Design Code: shared stage for the five animated pages in this folder.
   Each page calls DC.scene({ dur, kicker, title, imgs, draw(g, t, img) }). The canvas is a 1600x900 stage with a
   1920x1080 backing store (the GIF size). Every scene is a pure function of t, so window.__seek(t) / window.__dur()
   replay it frame by frame for design-code/tools/record.js. */
(function () {
  const W = 1600, H = 900, K = 1.2;
  const C = { navy: '#152044', ink: '#262c6a', muted: '#5d618c', gold: '#ffb951', goldInk: '#9a5a06', paper: '#f4eee0', card: '#fffcf4', line: '#cdbf9f',
    red: '#c2452d', green: '#2e8b57', blue: '#2ea3dc', grey: '#9aa0b4' };
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const ease = k => (k = clamp(k), k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
  const easeOut = k => 1 - Math.pow(1 - clamp(k), 3);
  // deterministic random numbers, so a seek always draws the same frame
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let x = Math.imul(seed ^ seed >>> 15, 1 | seed); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; };

  function text(g, s, x, y, o = {}) {
    const { size = 24, weight = 500, color = C.ink, align = 'left', font = 'Jost', base = 'alphabetic', alpha = 1, max } = o;
    g.save(); g.globalAlpha *= alpha; g.font = `${weight} ${size}px ${font}, system-ui, sans-serif`; g.fillStyle = color; g.textAlign = align; g.textBaseline = base;
    if (max) g.fillText(s, x, y, max); else g.fillText(s, x, y); g.restore();
  }
  // wrapped text; returns the y after the last line
  function para(g, s, x, y, w, o = {}) {
    const { size = 24, weight = 500, lh = 1.3, align = 'left' } = o;
    g.save(); g.font = `${weight} ${size}px ${o.font || 'Jost'}, system-ui, sans-serif`;
    const lines = []; let cur = '';
    for (const word of s.split(' ')) { const tryL = cur ? cur + ' ' + word : word; if (g.measureText(tryL).width > w && cur) { lines.push(cur); cur = word; } else cur = tryL; }
    if (cur) lines.push(cur); g.restore();
    lines.forEach((l, i) => text(g, l, align === 'center' ? x + w / 2 : x, y + i * size * lh, { ...o, align }));
    return y + lines.length * size * lh;
  }
  function rrect(g, x, y, w, h, r = 12, fill, stroke, lw = 2) {
    g.beginPath(); g.roundRect(x, y, w, h, r);
    if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); }
  }
  function panel(g, x, y, w, h, label, sub) {
    rrect(g, x, y, w, h, 14, C.card, C.line);
    if (label) text(g, label, x + 22, y + 40, { size: 28, weight: 700, font: 'Montserrat' });
    if (sub) text(g, sub, x + 22, y + 68, { size: 19, color: C.muted });
  }
  function bar(g, x, y, w, h, k, col, back = '#e6dcc6') { rrect(g, x, y, w, h, h / 2, back); if (k > 0.001) rrect(g, x, y, Math.max(h, w * clamp(k)), h, h / 2, col); }
  // a round icon cut from a square image
  function icon(g, im, x, y, r, ring) {
    g.save(); g.beginPath(); g.arc(x, y, r, 0, 7); g.clip(); if (im && im.complete && im.naturalWidth) g.drawImage(im, x - r, y - r, r * 2, r * 2); else { g.fillStyle = '#888'; g.fill(); } g.restore();
    if (ring) { g.beginPath(); g.arc(x, y, r, 0, 7); g.strokeStyle = ring; g.lineWidth = 3; g.stroke(); }
  }
  function frame(g, kicker, title, caption) {
    g.fillStyle = C.paper; g.fillRect(0, 0, W, H);
    g.fillStyle = C.navy; g.fillRect(0, 0, W, 118);
    g.fillStyle = C.gold; g.fillRect(0, 118, W, 4);
    text(g, ('The Design Code  ·  ' + kicker).toUpperCase(), 40, 44, { size: 19, weight: 600, color: C.gold });
    text(g, title, 40, 96, { size: 42, weight: 800, color: '#fff', font: 'Montserrat', max: W - 80 });
    if (caption) { rrect(g, 40, 806, W - 80, 76, 12, C.navy); para(g, caption, 64, 0, W - 128, { size: 25, color: '#fff', align: 'center', lh: 1 }); }
  }
  // caption text centred in the bottom strip (one or two lines)
  function caption(g, s, alpha = 1) {
    g.save(); g.globalAlpha = alpha; g.font = '500 25px Jost, system-ui, sans-serif';
    const two = g.measureText(s).width > W - 140; g.restore();
    if (!two) return text(g, s, W / 2, 853, { size: 25, color: '#fff', align: 'center', alpha });
    para(g, s, 70, 838, W - 140, { size: 24, color: '#fff', align: 'center', lh: 1.25, alpha });
  }
  // cross-fades between captions: list of [startTime, string]
  function captions(g, t, list) {
    rrect(g, 40, 806, W - 80, 76, 12, C.navy);
    let i = 0; while (i + 1 < list.length && t >= list[i + 1][0]) i++;
    caption(g, list[i][1], seg(t, list[i][0], list[i][0] + .4));
  }

  function scene(o) {
    const cv = document.getElementById('stage'), g = cv.getContext('2d');
    cv.width = W * K; cv.height = H * K;
    const img = {}; for (const [k, src] of Object.entries(o.imgs || {})) { img[k] = new Image(); img[k].src = src; }
    let t = 0, playing = true, last = null;
    const play = document.getElementById('play'), scrub = document.getElementById('scrub');
    function render() {
      g.setTransform(K, 0, 0, K, 0, 0); g.clearRect(0, 0, W, H);
      frame(g, o.kicker, o.title); o.draw(g, t, img);
      if (scrub && document.activeElement !== scrub) scrub.value = t / o.dur * 1000;
    }
    function tick(now) { if (playing && last != null) t = (t + (now - last) / 1000) % o.dur; last = now; render(); requestAnimationFrame(tick); }
    if (play) play.onclick = () => { playing = !playing; play.textContent = playing ? 'Pause' : 'Play'; play.setAttribute('aria-pressed', playing ? 'false' : 'true'); };
    if (scrub) scrub.oninput = () => { t = scrub.value / 1000 * o.dur; };
    window.__dur = () => o.dur;
    window.__seek = tt => { playing = false; t = tt % o.dur; render(); };
    window.__ready = Promise.all([document.fonts.load('800 42px Montserrat'), document.fonts.load('700 28px Montserrat'), document.fonts.load('500 24px Jost'), document.fonts.load('600 24px Jost'), document.fonts.load('700 24px Jost'),
      ...Object.values(img).map(im => im.decode().catch(() => {}))]).catch(() => {});
    window.__ready.then(() => requestAnimationFrame(tick));
  }
  window.DC = { W, H, C, clamp, lerp, seg, ease, easeOut, rng, text, para, rrect, panel, bar, icon, captions, scene };
})();
