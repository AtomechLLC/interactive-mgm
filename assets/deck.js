/* First Principles of Fun — deck engine
 *
 * A deck page contains:
 *   <div class="viewport"><div class="stage"> <section class="slide" data-title="…" data-demo="name"> … <aside class="notes">…</aside></section> … </div></div>
 *   <script>window.DECK = { title, audio: "path.m4a" | ["slide1.mp3", …] | null, cues: [secondsPerSlide…] | null }</script>
 *
 * Demos register themselves with FPF.demo(name, { init(el), enter(el), leave(el) }).
 * init runs once (first time the slide is shown); enter/leave run on every visit.
 */
(function () {
  const FPF = (window.FPF = window.FPF || {});
  const demos = {};
  FPF.demo = (name, def) => { demos[name] = def; };

  // Small helpers shared by demo scripts
  FPF.raf = function loop(fn) {          // returns a stop() function
    let id, last = performance.now(), on = true;
    const tick = t => { if (!on) return; fn(Math.min(0.05, (t - last) / 1000), t / 1000); last = t; id = requestAnimationFrame(tick); };
    id = requestAnimationFrame(tick);
    return () => { on = false; cancelAnimationFrame(id); };
  };
  FPF.ptr = (el, e) => {                 // pointer position in an element's own pixel space (stage is CSS-scaled)
    const r = el.getBoundingClientRect();
    const w = el.width || el.offsetWidth, h = el.height || el.offsetHeight;
    return { x: (e.clientX - r.left) * (w / r.width), y: (e.clientY - r.top) * (h / r.height) };
  };
  FPF.store = {
    get(k, d) { try { const v = localStorage.getItem('fpf:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('fpf:' + k, JSON.stringify(v)); } catch {} },
  };

  document.addEventListener('DOMContentLoaded', () => {
    const cfg = window.DECK || {};
    const stage = document.querySelector('.stage');
    const slides = [...document.querySelectorAll('.slide')];
    let cur = -1;
    const inited = new Set();

    /* ---------- scale stage to the window ---------- */
    function fit() {
      const vp = document.querySelector('.viewport').getBoundingClientRect();
      const s = Math.min(vp.width / 1600, vp.height / 900) * (innerHeight < 500 ? 1 : 0.96);   // phones: every pixel counts
      stage.style.transform = `translate(-50%, -50%) scale(${s})`;
    }
    addEventListener('resize', fit);

    /* ---------- touch screens ---------- */
    const touch = matchMedia('(pointer: coarse)').matches;
    if (touch) document.body.classList.add('touch');
    // instructions written for a mouse: "Click it" becomes "Tap it"
    const WORDS = [[/\bMove your mouse\b/g, 'Drag your finger'], [/\bHover (a|over|the)\b/g, 'Touch $1'], [/\bClick\b/g, 'Tap'], [/\bclick (the|it|a|each|one|either|inside|what|things)\b/g, 'tap $1']];
    function touchWords(root) {
      const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let n; (n = w.nextNode());) {
        if (n.parentElement.closest('.notes, script, style')) continue;
        let t = n.nodeValue; WORDS.forEach(([a, b]) => (t = t.replace(a, b)));
        if (t !== n.nodeValue) n.nodeValue = t;
      }
    }
    // keyboard demos: a slide with data-touch-keys="ArrowLeft:←,ArrowDown+ArrowRight:↘,KeyZ:Z 👊" gets an on-screen pad
    const pad = document.createElement('div');
    pad.className = 'touch-pad';
    if (touch) document.querySelector('.viewport').appendChild(pad);
    function showPad(s) {
      const spec = s.dataset.touchKeys;
      pad.hidden = !spec;
      if (!spec || pad._for === s) return;
      pad._for = s; pad.innerHTML = '';
      spec.split(',').forEach(k => {
        const [codes, label] = k.split(':'), b = document.createElement('button');
        b.type = 'button'; b.textContent = label || codes; b.className = /^Arrow/.test(codes) ? 'dir' : 'act';
        const send = type => codes.split('+').forEach(code => (document.activeElement || document.body).dispatchEvent(
          new KeyboardEvent(type, { code, key: code.startsWith('Key') ? code.slice(3).toLowerCase() : code === 'Space' ? ' ' : code, bubbles: true, cancelable: true })));
        b.addEventListener('pointerdown', e => { e.preventDefault(); b.setPointerCapture(e.pointerId); b.classList.add('on'); send('keydown'); });
        const up = () => { if (!b.classList.contains('on')) return; b.classList.remove('on'); send('keyup'); };
        b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
        pad.appendChild(b);
      });
    }

    /* ---------- chrome ---------- */
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.innerHTML = `
      <button class="ic" data-act="home" title="All modules">⌂</button>
      <span class="title"></span>
      <button class="ic" data-act="prev" title="Previous (←)">‹</button>
      <span class="count"></span>
      <button class="ic" data-act="next" title="Next (→)">›</button>
      <button class="ic" data-act="play" title="Play / pause the talk (P)">▶</button>
      <span class="secs"></span>
      <div class="timeline" title="Jump to any slide"><div class="track"></div><div class="fill"></div></div>
      <span class="time"></span>
      <span class="vol"><button class="ic" data-act="mute" title="Mute (M)">🔊</button><input type="range" min="0" max="1" step="0.05" value="1" aria-label="Volume" title="Volume"></span>
      <button class="ic" data-act="notes" title="Speaker notes (N)">✎</button>
      <button class="ic" data-act="overview" title="All slides (O)">▦</button>
      <button class="ic" data-act="full" title="Fullscreen (F)">⛶</button>
      <button class="ic" data-act="help" title="Keys (?)">?</button>`;
    document.body.appendChild(bar);
    bar.querySelector('.title').textContent = cfg.title || document.title;
    if (!document.fullscreenEnabled) bar.querySelector('[data-act=full]').remove();   // iPhone Safari can't fullscreen a page

    // phones held upright: the slides are 16:9, so ask for landscape (with a way to carry on anyway)
    const rotate = document.createElement('div');
    rotate.className = 'rotate-hint';
    rotate.innerHTML = `<svg viewBox="0 0 120 120" aria-hidden="true"><rect class="ph" x="38" y="18" width="44" height="84" rx="8"/><circle class="arr" cx="60" cy="90" r="3"/></svg>
      <b>Turn your phone sideways</b><p>The slides are made for a wide screen.</p><button type="button" class="btn">Continue in portrait</button>`;
    rotate.querySelector('button').onclick = () => { document.body.classList.add('portrait-ok'); FPF.store.set('portrait-ok', 1); };
    if (FPF.store.get('portrait-ok')) document.body.classList.add('portrait-ok');
    document.body.appendChild(rotate);

    const notesPanel = document.createElement('aside');
    notesPanel.className = 'notes-panel';
    notesPanel.innerHTML = '<h4>Speaker notes</h4><div class="body"></div>';
    document.body.appendChild(notesPanel);

    // lesson sections: a slide with data-section="1.2" starts that lesson
    const secs = slides.map((s, i) => s.dataset.section ? { i, label: s.dataset.section, title: s.dataset.sectionTitle || s.dataset.title || '' } : null).filter(Boolean);
    const secBox = bar.querySelector('.secs');
    secs.forEach(sec => {
      const b = document.createElement('button');
      b.className = 'sec-btn'; b.textContent = sec.label; b.title = `${sec.label} ${sec.title}`;
      b.onclick = () => go(sec.i);
      secBox.appendChild(b);
    });
    if (!secs.length) secBox.remove();
    const secAt = i => { let k = -1; secs.forEach((x, j) => { if (x.i <= i) k = j; }); return k; };

    const overview = document.createElement('div');
    overview.className = 'overview';
    slides.forEach((s, i) => {
      const sec = secs.find(x => x.i === i);
      if (sec) { const h = document.createElement('h3'); h.className = 'ov-sec'; h.textContent = `${sec.label}  ${sec.title}`; overview.appendChild(h); }
      const b = document.createElement('button');
      b.innerHTML = `<div class="n">${i + 1}</div><div class="t"></div>`;
      b.querySelector('.t').textContent = s.dataset.title || s.querySelector('h1,h2,h3')?.textContent || 'Slide ' + (i + 1);
      b.onclick = () => { go(i); document.body.classList.remove('overview-open'); };
      overview.appendChild(b);
    });
    document.body.appendChild(overview);

    const help = document.createElement('div');
    help.className = 'help';
    help.innerHTML = `<kbd>←</kbd> <kbd>→</kbd> previous / next &nbsp;·&nbsp; <kbd>Space</kbd> next<br>
      <kbd>P</kbd> play / pause talk &nbsp;·&nbsp; <kbd>L</kbd> hold on this slide &nbsp;·&nbsp; <kbd>M</kbd> mute<br>
      <kbd>N</kbd> notes &nbsp;·&nbsp; <kbd>O</kbd> overview &nbsp;·&nbsp; <kbd>F</kbd> fullscreen`;
    document.body.appendChild(help);

    const timeline = bar.querySelector('.timeline');
    const fill = bar.querySelector('.fill');
    const timeEl = bar.querySelector('.time');
    const playBtn = bar.querySelector('[data-act=play]');

    /* ---------- per-slide clips that behave like one long <audio> on the deck's clock ---------- */
    function segAudio(files, cues) {
      // one <audio> element plays every clip in turn: iPhone Safari only lets an element play on its own
      // (here: when the previous clip ends) after a tap has started that same element once
      const bus = new EventTarget(), player = new Audio();
      let idx = -1, playing = false, gen = 0;
      const emit = t => bus.dispatchEvent(new Event(t));
      const last = new Audio(files[files.length - 1]); last.preload = 'metadata';
      let total = cues[cues.length - 1] + 6;   // until the last clip's length is known
      last.addEventListener('loadedmetadata', () => { total = cues[cues.length - 1] + last.duration; emit('loadedmetadata'); }, { once: true });
      let warm = null;   // fetches the next clip ahead of time
      player.addEventListener('timeupdate', () => emit('timeupdate'));
      player.addEventListener('ended', () => {
        if (idx + 1 < files.length) { use(idx + 1, 0); emit('timeupdate'); }
        else { playing = false; emit('pause'); }
      });
      function use(i, off) {
        const g = ++gen;
        const seek = () => { if (g === gen) try { player.currentTime = Math.max(0, off); } catch (e) {} };
        if (i !== idx) { idx = i; player.src = files[i]; player.preload = 'auto'; player.addEventListener('loadedmetadata', seek, { once: true }); }
        else if (player.readyState) seek(); else player.addEventListener('loadedmetadata', seek, { once: true });
        if (playing) player.play().catch(() => {});
        if (i + 1 < files.length) { warm = new Audio(files[i + 1]); warm.preload = 'auto'; }
      }
      use(0, 0);
      return {
        addEventListener: (t, f) => bus.addEventListener(t, f),
        get duration() { return total; },
        get paused() { return !playing; },
        get volume() { return player.volume; },
        set volume(v) { player.volume = v; },
        get muted() { return player.muted; },
        set muted(m) { player.muted = m; },
        get currentTime() { return cues[idx] + (player.currentTime || 0); },
        set currentTime(t) { let i = 0; while (i + 1 < cues.length && cues[i + 1] <= t + 0.05) i++; use(i, t - cues[i]); },
        play() { playing = true; emit('play'); return player.play().catch(() => {}); },
        pause() { playing = false; player.pause(); emit('pause'); },
      };
    }

    /* ---------- audio ---------- */
    const cues = Array.isArray(cfg.cues) && cfg.cues.length === slides.length ? cfg.cues : null;
    // one file for the whole talk, or one clip per slide (cfg.audio is an array) played back to back
    const audio = !cfg.audio || !cues ? null : Array.isArray(cfg.audio) ? segAudio(cfg.audio, cues) : new Audio(cfg.audio);
    let hold = false;          // L: stay on the current slide, pause at its end
    let audioDriven = false;   // true while a slide change came from the audio clock
    if (audio) {
      audio.preload = 'metadata';
      audio.addEventListener('loadedmetadata', drawTicks);
      audio.addEventListener('play', () => (playBtn.textContent = '❚❚'));
      audio.addEventListener('pause', () => (playBtn.textContent = '▶'));
      audio.addEventListener('timeupdate', onTime);
    } else {
      // audio: false marks a deck that was never recorded (read at your own pace)
      timeEl.innerHTML = `<span class="audio-missing">${cfg.audio === false ? 'no talk for this module: read at your own pace' : 'talk audio not synced yet'}</span>`;
      playBtn.disabled = true; playBtn.style.opacity = .35;
      if (cfg.audio === false) { playBtn.style.display = 'none'; timeline.style.display = 'none'; }
      bar.querySelector('.vol').style.display = 'none';
    }
    /* ---------- volume (remembered across modules) ---------- */
    const volIn = bar.querySelector('.vol input'), muteBtn = bar.querySelector('[data-act=mute]');
    const setVol = (v, m) => {
      v = Math.max(0, Math.min(1, v));
      volIn.value = v;
      muteBtn.textContent = m || v === 0 ? '🔇' : v < 0.5 ? '🔉' : '🔊';
      volIn.style.setProperty('--v', (m ? 0 : v) * 100 + '%');
      if (audio) { audio.volume = v; audio.muted = m; }
      FPF.store.set('volume', v); FPF.store.set('muted', m);
    };
    let muted = FPF.store.get('muted', false);
    setVol(FPF.store.get('volume', 1), muted);
    volIn.addEventListener('input', () => { muted = false; setVol(+volIn.value, muted); });
    const toggleMute = () => { muted = !muted; if (!muted && +volIn.value === 0) volIn.value = 0.5; setVol(+volIn.value, muted); };
    volIn.addEventListener('change', () => volIn.blur());   // hand the arrow keys back to the deck
    FPF.toggleMute = toggleMute;

    const slideAt = t => { let i = 0; while (i + 1 < cues.length && cues[i + 1] <= t + 0.05) i++; return i; };
    const fmt = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

    function onTime() {
      const t = audio.currentTime, d = audio.duration || 1;
      fill.style.width = (t / d) * 100 + '%';
      timeEl.textContent = `${fmt(t)} / ${fmt(d)}`;
      const i = slideAt(t);
      if (i !== cur) {
        if (hold && i > cur) { audio.pause(); audio.currentTime = cues[cur + 1] - 0.05; return; }
        audioDriven = true; go(i); audioDriven = false;
      }
      revealStepsByTime(t);
      // demos can follow the narration: seconds into this slide's stretch of the talk
      slides[cur].dispatchEvent(new CustomEvent('talk', { detail: t - cues[cur] }));
    }
    function revealStepsByTime(t) {
      // spread a slide's .step reveals evenly across its stretch of the talk
      const s = slides[cur], steps = s.querySelectorAll('.step');
      if (!steps.length) return;
      const a = cues[cur], b = cues[cur + 1] ?? audio.duration;
      const k = Math.floor(((t - a) / Math.max(1, b - a)) * (steps.length + 1));
      steps.forEach((el, j) => el.classList.toggle('shown', j < k));
    }

    function drawTicks() {
      timeline.querySelectorAll('.tick').forEach(t => t.remove());
      if (audio && !audio.duration) return;
      const d = audio ? audio.duration : slides.length - 1;
      slides.forEach((s, i) => {
        const tk = document.createElement('div');
        tk.className = 'tick';
        tk.style.left = ((audio ? cues[i] : i) / d) * 100 + '%';
        tk.title = `${i + 1}. ${s.dataset.title || ''}`;
        timeline.appendChild(tk);
      });
      secs.forEach(sec => {
        const m = document.createElement('div');
        m.className = 'tick sec-mark';
        m.style.left = ((audio ? cues[sec.i] : sec.i) / d) * 100 + '%';
        m.title = `${sec.label} ${sec.title}`;
        m.innerHTML = `<span>${sec.label}</span>`;
        timeline.appendChild(m);
      });
      markTick();
    }
    function markTick() {
      timeline.querySelectorAll('.tick:not(.sec-mark)').forEach((t, i) => t.classList.toggle('cur', i === cur));
      const k = secAt(cur);
      bar.querySelectorAll('.sec-btn').forEach((b, j) => b.classList.toggle('cur', j === k));
    }

    timeline.addEventListener('click', e => {
      const r = timeline.getBoundingClientRect(), f = (e.clientX - r.left) / r.width;
      if (audio && audio.duration) { audio.currentTime = f * audio.duration; onTime(); }
      else go(Math.round(f * (slides.length - 1)));
    });

    /* ---------- notes: window.NOTES[i] = { script, said } or an <aside class="notes"> in the slide ---------- */
    const esc = t => t.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    function notesFor(i) {
      const N = (window.NOTES || [])[i];
      if (N && (N.script || N.said)) return (N.script ? `<div>${esc(N.script)}</div>` : '') + (N.said ? `<div class="said">${esc(N.said)}</div>` : '');
      const n = slides[i].querySelector('.notes');
      return n && n.textContent.trim() ? n.innerHTML : '<span class="empty">No notes for this slide.</span>';
    }

    /* ---------- navigation ---------- */
    // dark slides (title and .dk): widgets styled white for parchment slides get navy cards and light ink
    function darken(s) {
      const lum = c => { const m = c.match(/[\d.]+/g); if (!m) return [-1, 0]; const [r, g, b, a = 1] = m.map(Number); return [(r * .3 + g * .59 + b * .11) / 255, a]; };
      s.querySelectorAll('*').forEach(e => {
        if (e.closest('svg, canvas') || /^(IMG|VIDEO|CANVAS|svg|path)$/.test(e.tagName) || e.closest('.crc, .flip-media, .post, .fc, .wtt, .pcard, .wpt')) return;
        const cs = getComputedStyle(e), [bl, ba] = lum(cs.backgroundColor), [cl] = lum(cs.color);
        const gr = (cs.backgroundImage.match(/rgba?\([^)]*\)/g) || []).map(lum);   // light gradients count as white cards too
        if ((ba > .6 && bl > .8) || (gr.length && gr.every(([l, a]) => l > .75 && a > .6))) e.classList.add('dk-card');
        if (cl >= 0 && cl < .42 && !e.closest('.btn.on')) e.classList.add('dk-ink');
      });
    }
    function go(i) {
      i = Math.max(0, Math.min(slides.length - 1, i));
      if (i === cur) return;
      const prev = slides[cur];
      if (prev) { demos[prev.dataset.demo]?.leave?.(prev); }
      slides.forEach((s, j) => { s.classList.toggle('active', j === i); s.classList.toggle('before', j < i); });
      const s = slides[i];
      const back = i < cur;
      cur = i;
      // steps: going forward hides them, going back shows them all
      s.querySelectorAll('.step').forEach(el => el.classList.toggle('shown', back && !audioDriven));
      const d = demos[s.dataset.demo];
      if (d) {
        if (!inited.has(i)) { inited.add(i); d.init?.(s); }
        d.enter?.(s);
      }
      if (s.matches('.center, .dk')) requestAnimationFrame(() => darken(s));
      if (touch) { touchWords(s); showPad(s); }
      notesPanel.querySelector('.body').innerHTML = notesFor(i);
      bar.querySelector('.count').textContent = `${i + 1} / ${slides.length}`;
      overview.querySelectorAll('button').forEach((b, j) => b.classList.toggle('cur', j === i));   // section headers are h3, so buttons still line up with slides
      markTick();
      if (!audio) fill.style.width = (i / (slides.length - 1)) * 100 + '%';
      // keep the talk in step when the viewer navigates by hand
      if (audio && !audioDriven) { audio.currentTime = cues[i]; }
      history.replaceState(null, '', '#' + (i + 1));
      markArrows();
    }
    function next() {
      const hidden = slides[cur].querySelector('.step:not(.shown)');
      if (hidden) { hidden.classList.add('shown'); return; }
      go(cur + 1);
    }
    function prev() { go(cur - 1); }
    FPF.go = go; FPF.audio = audio;

    // big on-screen arrows at the edges of the slide, so the way forward is always visible
    const vpEl = document.querySelector('.viewport');
    var arrows = ['prev', 'next'].map(dir => {
      const b = document.createElement('button');
      b.className = 'edge-nav ' + dir; b.type = 'button';
      b.setAttribute('aria-label', dir === 'next' ? 'Next slide' : 'Previous slide');
      b.innerHTML = dir === 'next' ? '&#8250;' : '&#8249;';
      b.onclick = () => (dir === 'next' ? next() : prev());
      vpEl.appendChild(b); return b;
    });
    function markArrows() { if (!arrows) return; arrows[0].hidden = cur <= 0; arrows[1].hidden = cur >= slides.length - 1 && !slides[cur].querySelector('.step:not(.shown)'); }
    markArrows();

    bar.addEventListener('click', e => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'prev') prev();
      if (act === 'next') next();
      if (act === 'play') togglePlay();
      if (act === 'mute') toggleMute();
      if (act === 'notes') document.body.classList.toggle('notes-open'), document.body.classList.remove('overview-open'), setTimeout(fit, 320);
      if (act === 'overview') document.body.classList.remove('notes-open');
      if (act === 'overview') document.body.classList.toggle('overview-open');
      if (act === 'full') toggleFull();
      if (act === 'help') document.body.classList.toggle('help-open');
      if (act === 'home') location.href = cfg.home || '../index.html';
    });
    function togglePlay() { if (!audio) return; audio.paused ? audio.play() : audio.pause(); }
    function toggleFull() { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.(); }

    addEventListener('keydown', e => {
      if (e.target.closest?.('input, textarea, select, [contenteditable]')) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const k = e.key;
      if (k === 'ArrowRight' || k === 'PageDown' || k === ' ') { e.preventDefault(); next(); }
      else if (k === 'ArrowLeft' || k === 'PageUp') { e.preventDefault(); prev(); }
      else if (k === 'Home') go(0);
      else if (k === 'End') go(slides.length - 1);
      else if (k === 'p' || k === 'P') togglePlay();
      else if (k === 'm' || k === 'M') toggleMute();
      else if (k === 'n' || k === 'N') { document.body.classList.toggle('notes-open'); setTimeout(fit, 320); }
      else if (k === 'o' || k === 'O') document.body.classList.toggle('overview-open');
      else if (k === 'f' || k === 'F') toggleFull();
      else if (k === 'l' || k === 'L') { hold = !hold; bar.querySelector('[data-act=play]').classList.toggle('on', hold); }
      else if (k === '?') document.body.classList.toggle('help-open');
      else if (k === 'Escape') document.body.classList.remove('overview-open', 'help-open');
    });

    // swipe on touch screens (only from the slide background, not from demos)
    let sx = null;
    stage.addEventListener('touchstart', e => { sx = e.target.closest('canvas, button, input, iframe, .interactive') ? null : e.touches[0].clientX; }, { passive: true });
    stage.addEventListener('touchend', e => {
      if (sx == null) return;
      const dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 60) (dx < 0 ? next() : prev());
      sx = null;
    });

    // fingers are bigger than scaled-down buttons: a tap that lands just beside one still presses it
    if (touch) {
      stage.addEventListener('click', e => {
        if (!e.isTrusted || e.target.closest('button, a, input, select, label, canvas, video, iframe, .interactive, [onclick]')) return;
        const R = 16;   // screen pixels
        let best = null, bd = R;
        for (const el of slides[cur].querySelectorAll('button, a[href], input, select, .interactive')) {
          const r = el.getBoundingClientRect();
          if (!r.width || el.disabled) continue;
          const dx = Math.max(r.left - e.clientX, 0, e.clientX - r.right), dy = Math.max(r.top - e.clientY, 0, e.clientY - r.bottom);
          const d = Math.hypot(dx, dy);
          if (d < bd) { bd = d; best = el; }
        }
        if (best) { e.stopPropagation(); best.focus?.({ preventScroll: true }); best.click(); }
      }, true);

      // sliders: a scaled-down thumb is too small to grab, so a touch anywhere on (or near) the track sets the value
      let rng = null;
      const setRange = e => {
        const r = rng.getBoundingClientRect(), u = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
        const min = +rng.min || 0, max = rng.max === '' ? 100 : +rng.max, step = rng.step === 'any' ? 0 : +rng.step || 1;
        let v = min + u * (max - min); if (step) v = min + Math.round((v - min) / step) * step;
        if (String(v) === rng.value) return;
        rng.value = v; rng.dispatchEvent(new Event('input', { bubbles: true }));
      };
      stage.addEventListener('pointerdown', e => {
        let el = e.target.closest('input[type=range]');
        if (!el && !e.target.closest('button, a, select, canvas, video, iframe, .interactive')) {
          el = [...slides[cur].querySelectorAll('input[type=range]')].find(x => {
            const r = x.getBoundingClientRect();
            return r.width && e.clientX > r.left - 8 && e.clientX < r.right + 8 && Math.abs(e.clientY - (r.top + r.bottom) / 2) < 18;
          });
        }
        if (!el || el.disabled) return;
        e.preventDefault(); rng = el; stage.setPointerCapture(e.pointerId); setRange(e);
      }, true);
      stage.addEventListener('pointermove', e => rng && setRange(e));
      const endRange = () => { if (rng) rng.dispatchEvent(new Event('change', { bubbles: true })); rng = null; };
      stage.addEventListener('pointerup', endRange); stage.addEventListener('pointercancel', endRange);
    }

    fit();
    drawTicks();
    go(Math.max(0, (parseInt(location.hash.slice(1), 10) || 1) - 1));
  });
})();
