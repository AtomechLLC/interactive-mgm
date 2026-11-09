/* Parser or choice list (genre breakdown: "Text-Based Game Design").
   One cellar, two inputs. On the left a parser reads typed verb-noun commands, with a few synonyms for each; on the
   right a choice list offers only the actions that mean something right now. Both drive the same little world. The
   readouts compare what each input exposes: the parser's whole vocabulary against the handful of moves that matter.
   The room and its text are original, written for this page. */
(function () {
  const C = TD.C;
  const VERBS = { look: ['look', 'l', 'examine', 'x', 'inspect'], take: ['take', 'get', 'grab'], search: ['search', 'move'], open: ['open'], unlock: ['unlock'], light: ['light'], go: ['go', 'walk', 'climb'] };
  const NOUNS = { room: ['room', 'cellar'], lantern: ['lantern', 'lamp'], straw: ['straw', 'hay'], key: ['key'], chest: ['chest', 'trunk'], door: ['door', 'north', 'stairs'], map: ['map'] };
  const find = (tab, w) => Object.keys(tab).find(k => tab[k].includes(w));
  const fresh = () => ({ lantern: false, lit: false, found: false, key: false, unlocked: false, open: false, map: false, out: false });
  // every meaningful action: [verb, noun, available(state), result(state) -> text]
  const ACTIONS = [
    ['look', 'room', () => true, s => 'A low cellar. A lantern hangs on a nail, straw is heaped in a corner, an iron chest sits by the wall, and stairs lead north.'],
    ['take', 'lantern', s => !s.lantern, s => { s.lantern = true; return 'You take the lantern. It is cold and unlit.'; }],
    ['light', 'lantern', s => s.lantern && !s.lit, s => { s.lit = true; return 'The wick catches. Warm light fills the cellar.'; }],
    ['search', 'straw', s => !s.found, s => { s.found = true; return 'Under the straw: a small brass key.'; }],
    ['take', 'key', s => s.found && !s.key, s => { s.key = true; return 'You pocket the brass key.'; }],
    ['unlock', 'chest', s => s.key && !s.unlocked, s => { s.unlocked = true; return 'The key turns with a clunk.'; }],
    ['open', 'chest', s => !s.open, s => { if (!s.unlocked) return 'The chest is locked.'; s.open = true; return 'Inside, a folded map.'; }],
    ['take', 'map', s => s.open && !s.map, s => { s.map = true; return 'You take the map.'; }],
    ['go', 'door', s => !s.out, s => { if (!s.lit) return 'The stairs climb into pitch dark. You stop.'; if (!s.map) return 'You have not found what you came for.'; s.out = true; return 'Lantern high, map in hand, you climb out. The end.'; }],
  ];
  const CHOICE_TEXT = { 'look room': 'Look around', 'take lantern': 'Take the lantern', 'light lantern': 'Light the lantern', 'search straw': 'Search the straw', 'take key': 'Take the key', 'unlock chest': 'Unlock the chest', 'open chest': 'Open the chest', 'take map': 'Take the map', 'go door': 'Climb the stairs' };
  function parse(s, line) {
    const w = line.toLowerCase().replace(/[^a-z ]/g, ' ').split(/\s+/).filter(x => x && !['the', 'a', 'an', 'at', 'up', 'with', 'to', 'pick'].includes(x));
    if (!w.length) return 'Say something.';
    const v = find(VERBS, w[0]); if (!v) return `I don't know the verb "${w[0]}".`;
    let n = w[1] ? find(NOUNS, w[1]) : (v === 'look' ? 'room' : null);
    if (v === 'go' && !w[1]) n = 'door';
    if (w[1] && !n) return `I don't know the word "${w[1]}".`;
    if (!n) return `${w[0][0].toUpperCase() + w[0].slice(1)} what?`;
    const a = ACTIONS.find(x => x[0] === v && x[1] === n);
    if (!a) return v === 'look' ? `Nothing special about the ${n}.` : 'That does nothing.';
    if (!a[2](s)) return 'You already did that, or you cannot yet.';
    return a[3](s);
  }
  const avail = s => ACTIONS.filter(a => a[2](s));
  const nV = Object.values(VERBS).flat().length, nN = Object.values(NOUNS).flat().length;

  GK.scene('text', (s, g, ui) => {
    const inp = s.querySelector('.tx-in'), go = s.querySelector('.tx-go'), rst = s.querySelector('.tx-reset'); ui.watch(inp, go, rst);
    let P, Q, logP, logQ, fails;
    const reset = () => { P = fresh(); Q = fresh(); logP = []; logQ = []; fails = 0; };
    reset();
    const typed = line => { const r = parse(P, line); logP.push(['> ' + line, r]); if (/^I don't know|what\?$|^Say/.test(r)) fails++; };
    const chose = key => { const a = ACTIONS.find(x => x[0] + ' ' + x[1] === key); logQ.push(['▸ ' + CHOICE_TEXT[key], a[3](Q)]); };
    go.onclick = () => { if (inp.value.trim()) { typed(inp.value); inp.value = ''; } };
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') go.onclick(); });
    rst.onclick = reset;
    const cv = g.canvas; let boxes = [];
    cv.addEventListener('click', e => {
      const r = cv.getBoundingClientRect(), mx = (e.clientX - r.left) * cv.width / r.width, my = (e.clientY - r.top) * cv.height / r.height;
      const b = boxes.find(b => mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h); if (b) { ui.stopTour(); chose(b.key); }
    });
    // walk-through: typed lines on the left, clicks on the right, one every 2.4 s
    const SCRIPT = [['look', 'look room'], ['get lamp', 'take lantern'], ['open box', 'search straw'], ['search hay', 'take key'], ['take key', 'unlock chest'], ['use key on chest', 'open chest'], ['unlock chest', 'take map'], ['open trunk', 'light lantern'], ['take map', 'go door'], ['light lamp', null], ['go north', null]];
    const PER = 2.4; let played = -1;
    return {
      dur: PER * (SCRIPT.length + 2),
      frame(t, tour) {
        if (tour) {
          const n = Math.min(SCRIPT.length, Math.floor(t / PER));
          if (n < played || played < 0) { reset(); played = 0; }
          while (played < n) { const [a, b] = SCRIPT[played]; typed(a); if (b) chose(b); played++; }
        } else played = -1;
        GK.panel(g);
        const pane = (x, title, log, sub) => {
          GK.head(g, title, x, 34, 'left', C.ink, 17); GK.text(g, sub, x, 54, C.muted, 12, 'left', 600);
          GK.box(g, x, 64, 490, 330, '#1d2238', null, 10);
          let y = 384; const lines = [];
          log.slice(-8).forEach(([cmd, res]) => lines.push([cmd, '#ffb951', 700], ...wrapLines(res, 460).map(l => [l, /^I don't know|what\?$|does nothing|cannot yet/.test(res) ? '#ff9d8a' : '#e9e6dc', 500])));
          lines.slice(-17).reverse().forEach(([l, col, w]) => { if (y < 80) return; GK.text(g, l, x + 14, y, col, 13, 'left', w); y -= 18; });
        };
        const wrapLines = (str, maxW) => { g.font = GK.font(500, 13); const out = []; let line = ''; str.split(' ').forEach(w => { const t2 = line ? line + ' ' + w : w; if (g.measureText(t2).width > maxW && line) { out.push(line); line = w; } else line = t2; }); if (line) out.push(line); return out; };
        pane(20, 'Parser', logP, 'type a verb and a noun');
        pane(530, 'Choice list', logQ, 'click an option');
        // choices
        boxes = []; const opts = Q.out ? [] : avail(Q).filter(a => !(a[0] === 'look' && logQ.length));
        opts.forEach((a, i) => { const k = a[0] + ' ' + a[1], x = 530 + (i % 2) * 248, y = 404 + Math.floor(i / 2) * 36; boxes.push({ x, y, w: 240, h: 30, key: k }); GK.box(g, x, y, 240, 30, '#fffaf0', C.blue, 8, 2); GK.text(g, CHOICE_TEXT[k], x + 12, y + 20, C.ink, 13, 'left', 600); });
        if (Q.out) GK.text(g, 'The end.', 530, 424, C.good, 15, 'left', 700);
        // readouts
        const meaningful = avail(P).length;
        GK.big(g, `${nV} × ${nN}`, `words it knows: ${nV * nN} verb-noun pairs`, 20, 428);
        GK.big(g, `${meaningful}`, 'of them matter right now', 260, 428, C.good);
        GK.big(g, `${fails}`, 'commands not understood', 20, 500, fails ? C.redDk : C.ink);
        GK.big(g, `${opts.length}`, 'options on screen', 260, 500);
        GK.wrap(g, 'The parser lets players say anything it knows, so it can hide a step behind the right word. The list never hides a step, but it shows every one.', 530, 520, 490, 18, C.ink, 13);
        ui.stats(`<div><b>${nV * nN}</b><span>phrasings the parser accepts</span></div><div class="g"><b>${opts.length}</b><span>choices shown</span></div>`);
        ui.out(fails ? `The parser turned down ${fails} command${fails > 1 ? 's' : ''} for words it did not know: the "guess the verb" problem. Clear language and many synonyms shrink it.` : 'Type into the parser on the left, or click the choices on the right.');
      },
    };
  });
})();
