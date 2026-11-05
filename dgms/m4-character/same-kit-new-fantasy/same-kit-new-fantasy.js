/* Same kit, new fantasy (RGF C2 M4, 3Cs: Character, slides 37-48, 102, 127-137).
   Slide 1: a kit strip that never changes above a fantasy card that steps through each version of the character, with a
   short "reads as" label under each card (Ziggs, Trundle, Braum and Ori, then Caustic, Revenant and Pathfinder as text).
   Slide 2: mechanics-first (Braum, Caitlyn) vs fantasy-first (Aurelion Sol), and why a cohesive character needs both.
   Both canvases are pure functions of time plus the learner's picks, so window.__seek is deterministic. */
(function () {
  const { $, $$, canvasDemo, say } = FPF.kit;
  const T = TD, C = TD.C, { clamp, lerp, ease } = TD, TAU = Math.PI * 2;
  const W = 1040, H = 585;
  const IMG = {};
  const load = n => { if (IMG[n]) return IMG[n]; const i = new Image(); i.src = `img/${n}`; IMG[n] = i; return i; };
  const ok = i => i && i.complete && i.naturalWidth;
  const pic = (g, n, x, y, w, h, a = 1) => { const i = load(n); if (!ok(i)) return; g.save(); g.globalAlpha *= a; g.drawImage(i, x, y, w, h); g.restore(); };
  // cover-crop an image into a box
  const cover = (g, n, x, y, w, h, fx = .5, fy = .3) => {
    const i = load(n); if (!ok(i)) return;
    const k = Math.max(w / i.naturalWidth, h / i.naturalHeight), sw = w / k, sh = h / k;
    g.drawImage(i, (i.naturalWidth - sw) * fx, (i.naturalHeight - sh) * fy, sw, sh, x, y, w, h);
  };
  const font = (s, w = 600, f = 'Jost') => `${w} ${s}px ${f}, sans-serif`;
  const text = (g, s, x, y, size, col = C.ink, w = 600, align = 'left', fam = 'Jost') => { g.font = font(size, w, fam === 'M' ? 'Montserrat, Jost' : fam); g.fillStyle = col; g.textAlign = align; g.textBaseline = 'alphabetic'; g.fillText(s, x, y); };
  function wrap(g, s, x, y, maxW, lh, size, col = C.ink, w = 500) {
    g.font = font(size, w); g.fillStyle = col; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    let line = '', yy = y;
    s.split(' ').forEach(word => { const test = line ? line + ' ' + word : word; if (g.measureText(test).width > maxW && line) { g.fillText(line, x, yy); line = word; yy += lh; } else line = test; });
    if (line) g.fillText(line, x, yy);
    return yy;
  }
  const rr = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };

  /* ---------- the cases (slides 45-48, 102, 127-137) ---------- */
  const CASES = {
    ziggs: { name: 'Ziggs', at: 'slides 102, 133-134', kit: [['ZiggsPassiveReady.png', 'Short Fuse'], ['ZiggsQ.png', 'Bouncing Bomb'], ['ZiggsW.png', 'Satchel Charge'], ['ZiggsE.png', 'Hexplosive Minefield'], ['ZiggsR.png', 'Mega Inferno Bomb']],
      kitLine: 'Bombs that bounce, blast him around and blanket an area in mines.',
      versions: [
        { name: 'A weird human man', sketch: 'bomber', reads: 'Distasteful', fit: 'clash', text: 'The first Ziggs was a weird human man. A grown man throwing bombs read as real-world warfare, and that framing made the same explosions feel distasteful.' },
        { name: 'A Yordle', img: 'Ziggs', reads: 'Chaotic fun', fit: 'fit', text: 'As a small, gleeful Yordle the bombs did not change at all, but the emotional framing did: the same explosions now read as chaotic fun.' },
      ] },
    trundle: { name: 'Trundle', at: 'slides 136-137', kit: [['Trundle_Passive.png', 'King’s Tribute'], ['TrundleTrollSmash.png', 'Chomp'], ['trundledesecrate.png', 'Frozen Domain'], ['TrundleCircle.png', 'Pillar of Ice'], ['TrundlePain.png', 'Subjugate']],
      kitLine: 'Bites that steal strength, an icy zone to fight in and a pillar that cuts off escape.',
      versions: [
        { name: 'A gross troll', sketch: 'troll', reads: 'Repulsive', fit: 'clash', text: 'The first Trundle was a gross troll. The look pushed players away, and nothing about it explained the ice in his kit.' },
        { name: 'A troll with a magic ice club', img: 'Trundle', reads: 'Frozen troll king', fit: 'fit', text: 'The rework gave him a magic ice club, "which worked with all of the existing mechanics." Not one ability had to change.' },
      ] },
    braum: { name: 'Braum', at: 'slides 37-41', kit: [['Braum_Passive.png', 'Concussive Blows'], ['BraumQ.png', 'Winter’s Bite'], ['BraumW.png', 'Stand Behind Me'], ['BraumE.png', 'Unbreakable'], ['BraumRWrapper.png', 'Glacial Fissure']],
      kitLine: 'Leap to an ally, then raise a shield that stops incoming shots.',
      versions: [
        { name: 'A shield', sketch: 'shield', reads: 'Pure mechanic', fit: 'start', text: 'Braum began as a mechanic: a shield that blocks projectiles for your allies. There was no character yet, only the thing he does.' },
        { name: 'A girl from Piltover', sketch: 'pilt', reads: 'Gadget inventor', fit: 'explored', text: 'One iteration was "a girl from Piltover with a big energy shield and trampolines." The same leap and block, read as technology.' },
        { name: 'Braum', img: 'Braum', reads: 'Kind protector', fit: 'fit', text: 'The final Braum is a big-hearted hero of the Freljord with a vault door for a shield. His theme, "Kindness is Strength", makes stepping in front of allies the whole fantasy.' },
      ] },
    ori: { name: 'Ori', at: 'slide 131', glyph: [['🔥', 'Spirit Flame'], ['🧗', 'Wall Jump'], ['👊', 'Bash'], ['💨', 'Glide']],
      kitLine: 'A small, fast platforming hero who jumps, climbs, bashes and glides.',
      versions: [
        { name: 'A boy', sketch: 'boy', reads: 'Ordinary child', fit: 'explored', text: 'Ori started as a boy.' },
        { name: 'A white box', sketch: 'box', reads: 'Placeholder', fit: 'start', text: 'Then a plain white box: no character at all, only the moves.' },
        { name: 'A horned demon', sketch: 'demon', reads: 'Menacing', fit: 'explored', text: 'Then a horned demon, which pulled the same moves toward something threatening.' },
        { name: 'A forest spirit', sketch: 'spirit', reads: 'Gentle guardian', fit: 'fit', text: 'Finally a small, glowing forest spirit. The jumps and glides had not changed, and now they read as light and gentle.' },
      ] },
    caustic: { name: 'Caustic', at: 'slide 45', apex: true, glyph: [['👁', 'Nox Vision'], ['⚠', 'Nox Gas Trap'], ['💣', 'Nox Gas Grenade']],
      kitLine: 'Place gas traps, then wait for enemies to walk into them.',
      versions: [
        { name: 'An aggressive soldier', reads: 'Charge in', fit: 'clash', text: 'Caustic’s trap-and-wait loop clashed with an aggressive soldier fantasy: the look said charge in, the kit said wait.' },
        { name: 'A mad scientist', reads: 'Patient menace', fit: 'fit', text: 'As a mad scientist, setting traps and watching the gas work is exactly who he is. The kit stayed, the fantasy moved.' },
      ] },
    revenant: { name: 'Revenant', at: 'slide 47', apex: true, glyph: [['🧗', 'Stalker'], ['🔇', 'Silence'], ['💀', 'Death Totem']],
      kitLine: 'Climb high, silence a target and ambush from above.',
      versions: [
        { name: 'A skeleton ninja', reads: 'Mixed signals', fit: 'clash', text: 'Revenant’s ambush kit did not fit a skeleton ninja.' },
        { name: 'A horror character', reads: 'Stalking dread', fit: 'fit', text: 'Reframed as a horror character, the ambush became the point: something that stalks you and strikes from the dark.' },
      ] },
    pathfinder: { name: 'Pathfinder', at: 'slide 48', apex: true, glyph: [['🛰', 'Insider Knowledge'], ['🪢', 'Grappling Hook'], ['🔀', 'Zipline Gun']],
      kitLine: 'Open routes for the whole team: scan ahead, grapple up, lay a zipline.',
      versions: [
        { name: 'A friendly robot', reads: 'Helpful scout', fit: 'fit', text: 'Pathfinder’s kit is about leading and helping the team.' },
        { name: 'A colder, harder look', reads: 'Cold machine', fit: 'clash', text: 'An art pass moved him away from friendly, and the look stopped matching a kit built to lead the team.' },
        { name: 'Friendly again', reads: 'Cheerful team leader', fit: 'fit', text: 'The art moved back to friendly to match the team-leader kit. The kit was never the problem.' },
      ] },
  };
  const ORDER = ['ziggs', 'trundle', 'braum', 'ori', 'caustic', 'revenant', 'pathfinder'];
  const FIT = { clash: ['Kit and fantasy clash', C.red, '#f9d9d6'], fit: ['Kit and fantasy fit', C.good, '#d8f0df'], explored: ['An explored version', '#9a5a06', '#fde9b8'], start: ['Mechanics only', '#23306e', '#dfe6fb'] };
  ORDER.forEach(k => { const c = CASES[k]; (c.kit || []).forEach(([f]) => load(f)); c.versions.forEach(v => { if (v.img) { load(v.img + '.png'); load(v.img + '_splash.jpg'); } }); });

  /* ---------- original concept sketches (no game art) ---------- */
  const PAPER = '#f6eedb', PEN = '#3b3552';
  function stroke(g, w = 3, col = PEN) { g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; }
  function sketch(g, kind, x, y, w, h, t) {
    g.fillStyle = PAPER; g.fillRect(x, y, w, h);
    // faint pencil guide lines
    g.strokeStyle = 'rgba(59,53,82,.08)'; g.lineWidth = 1; for (let yy = y + 24; yy < y + h; yy += 24) { g.beginPath(); g.moveTo(x, yy); g.lineTo(x + w, yy); g.stroke(); }
    const cx = x + w / 2, gy = y + h - 40;
    g.strokeStyle = 'rgba(59,53,82,.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x + 30, gy); g.lineTo(x + w - 30, gy); g.stroke();
    g.save();
    if (kind === 'bomber') {
      stroke(g); g.fillStyle = '#c9c3b2';
      // tall thin man in a long coat, one arm raised with a bomb
      g.beginPath(); g.moveTo(cx - 26, gy - 120); g.lineTo(cx - 34, gy - 20); g.lineTo(cx + 34, gy - 20); g.lineTo(cx + 26, gy - 120); g.closePath(); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(cx - 12, gy - 20); g.lineTo(cx - 14, gy); g.moveTo(cx + 12, gy - 20); g.lineTo(cx + 14, gy); g.stroke();
      g.fillStyle = '#e8dcc0'; g.beginPath(); g.ellipse(cx, gy - 140, 15, 20, 0, 0, TAU); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(cx - 18, gy - 160); g.lineTo(cx + 18, gy - 160); g.lineTo(cx + 12, gy - 172); g.lineTo(cx - 12, gy - 172); g.closePath(); g.fillStyle = '#5c5a52'; g.fill(); g.stroke();
      g.beginPath(); g.moveTo(cx + 24, gy - 112); g.lineTo(cx + 56, gy - 150); g.stroke();
      g.fillStyle = '#2d2b36'; g.beginPath(); g.arc(cx + 64, gy - 162, 15, 0, TAU); g.fill();
      g.beginPath(); g.moveTo(cx + 70, gy - 176); g.quadraticCurveTo(cx + 80, gy - 192, cx + 90, gy - 186); g.stroke();
      T.flash(cx + 92, gy - 188, 10 + 3 * Math.sin(t * 12), 1);
      g.beginPath(); g.moveTo(cx - 24, gy - 112); g.lineTo(cx - 40, gy - 70); g.stroke();
      // a smoky battlefield behind
      g.fillStyle = 'rgba(90,85,80,.25)'; [[-120, -40, 34], [-90, -70, 26], [110, -50, 30], [140, -80, 22]].forEach(([dx, dy, r]) => { g.beginPath(); g.arc(cx + dx, gy + dy, r, 0, TAU); g.fill(); });
    }
    if (kind === 'troll') {
      stroke(g); g.fillStyle = '#9aa36e';
      // hunched lumpy troll with long arms and flies around it
      g.beginPath(); g.moveTo(cx - 70, gy); g.quadraticCurveTo(cx - 90, gy - 110, cx - 20, gy - 130); g.quadraticCurveTo(cx + 60, gy - 140, cx + 70, gy - 70); g.quadraticCurveTo(cx + 74, gy - 20, cx + 50, gy); g.closePath(); g.fill(); g.stroke();
      g.beginPath(); g.ellipse(cx + 40, gy - 120, 26, 22, 0, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(cx + 48, gy - 124, 4, 0, TAU); g.fill();
      g.beginPath(); g.moveTo(cx + 50, gy - 106); g.lineTo(cx + 62, gy - 100); g.stroke();
      g.beginPath(); g.moveTo(cx + 60, gy - 80); g.quadraticCurveTo(cx + 100, gy - 40, cx + 92, gy - 4); g.stroke();
      g.fillStyle = 'rgba(110,100,60,.55)'; [[-40, -60], [-10, -90], [20, -40], [-50, -20]].forEach(([dx, dy]) => { g.beginPath(); g.arc(cx + dx, gy + dy, 7, 0, TAU); g.fill(); });
      g.fillStyle = PEN; for (let i = 0; i < 5; i++) { const a = t * 3 + i * 1.3, r = 60 + 10 * Math.sin(t * 5 + i); g.beginPath(); g.arc(cx + 30 + Math.cos(a) * r, gy - 150 + Math.sin(a) * r * .4, 2.5, 0, TAU); g.fill(); }
      g.strokeStyle = 'rgba(110,120,60,.6)'; g.lineWidth = 2; [-30, 0, 30].forEach(dx => { const yy = gy - 150 - ((t * 20 + dx) % 30); g.beginPath(); g.moveTo(cx + dx - 20, yy); g.quadraticCurveTo(cx + dx - 14, yy - 10, cx + dx - 20, yy - 20); g.stroke(); });
    }
    if (kind === 'shield') {
      // just the mechanic: a shield and the shots it stops
      stroke(g, 4); g.fillStyle = '#cfe2f3';
      g.beginPath(); g.moveTo(cx, gy - 170); g.quadraticCurveTo(cx + 70, gy - 160, cx + 66, gy - 100); g.quadraticCurveTo(cx + 60, gy - 40, cx, gy - 14); g.quadraticCurveTo(cx - 60, gy - 40, cx - 66, gy - 100); g.quadraticCurveTo(cx - 70, gy - 160, cx, gy - 170); g.closePath(); g.fill(); g.stroke();
      for (let i = 0; i < 3; i++) { const p = (t * .9 + i / 3) % 1, sx = x + w - 30 - p * (w / 2 - 90), sy = gy - 140 + i * 40; g.fillStyle = C.red; g.beginPath(); g.arc(sx, sy, 6, 0, TAU); g.fill(); if (p > .9) T.flash(cx + 70, sy, 14, 1); }
      g.setLineDash([6, 6]); stroke(g, 2, 'rgba(59,53,82,.5)'); g.beginPath(); g.moveTo(x + 40, gy - 90); g.lineTo(cx - 80, gy - 90); g.stroke(); g.setLineDash([]);
      text(g, 'ally', x + 40, gy - 100, 15, C.muted, 600);
    }
    if (kind === 'pilt') {
      // a small inventor behind a big hexagonal energy shield, on a trampoline
      const bob = Math.abs(Math.sin(t * 3)) * 26;
      stroke(g, 3); g.fillStyle = '#b06a3a';
      g.beginPath(); g.ellipse(cx - 30, gy - 8, 60, 10, 0, 0, TAU); g.stroke();
      [-70, 10].forEach(dx => { g.beginPath(); g.moveTo(cx - 30 + dx * .8, gy - 8); g.lineTo(cx - 30 + dx * .8, gy + 10); g.stroke(); });
      const by = gy - 18 - bob;
      g.fillStyle = '#e8dcc0'; g.beginPath(); g.arc(cx - 30, by - 70, 13, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = '#8a4fd6'; g.beginPath(); g.moveTo(cx - 44, by - 56); g.lineTo(cx - 16, by - 56); g.lineTo(cx - 10, by - 18); g.lineTo(cx - 50, by - 18); g.closePath(); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(cx - 40, by - 18); g.lineTo(cx - 42, by); g.moveTo(cx - 20, by - 18); g.lineTo(cx - 18, by); g.stroke();
      g.fillStyle = '#ffb951'; g.beginPath(); g.ellipse(cx - 30, by - 84, 16, 6, 0, 0, TAU); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(cx - 16, by - 48); g.lineTo(cx + 20, by - 50); g.stroke();
      const sx = cx + 50, sy = by - 60, R = 66;
      g.fillStyle = 'rgba(87,182,255,.25)'; g.strokeStyle = '#2ea3dc'; g.lineWidth = 3;
      g.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + Math.PI / 6; g.lineTo(sx + Math.cos(a) * R * .45, sy + Math.sin(a) * R); } g.closePath(); g.fill(); g.stroke();
      g.globalAlpha = .4 + .3 * Math.sin(t * 6); g.beginPath(); g.ellipse(sx, sy, R * .32, R * .75, 0, 0, TAU); g.stroke(); g.globalAlpha = 1;
    }
    if (kind === 'boy') {
      stroke(g, 4); const hop = Math.max(0, Math.sin(t * 2.4)) * 20, by = gy - hop;
      g.fillStyle = '#e8dcc0'; g.beginPath(); g.arc(cx, by - 118, 22, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = '#6e8bd0'; rr(g, cx - 20, by - 94, 40, 52, 10); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(cx - 10, by - 42); g.lineTo(cx - 14, by); g.moveTo(cx + 10, by - 42); g.lineTo(cx + 14, by); g.stroke();
      g.beginPath(); g.moveTo(cx - 20, by - 86); g.lineTo(cx - 40, by - 56); g.moveTo(cx + 20, by - 86); g.lineTo(cx + 40, by - 60); g.stroke();
      g.fillStyle = PEN; g.beginPath(); g.arc(cx + 8, by - 120, 2.5, 0, TAU); g.fill();
    }
    if (kind === 'box') {
      const hop = Math.max(0, Math.sin(t * 2.4)) * 40;
      g.fillStyle = 'rgba(40,30,20,.18)'; g.beginPath(); g.ellipse(cx, gy, 36 - hop * .3, 7, 0, 0, TAU); g.fill();
      g.fillStyle = '#ffffff'; stroke(g, 3, '#9a93a8'); rr(g, cx - 32, gy - 64 - hop, 64, 64, 4); g.fill(); g.stroke();
      text(g, 'placeholder', cx, gy - 120 - hop, 15, C.muted, 600, 'center');
    }
    if (kind === 'demon') {
      stroke(g, 3); const sway = Math.sin(t * 2) * 4;
      g.fillStyle = '#3a2f45';
      g.beginPath(); g.moveTo(cx - 34, gy); g.quadraticCurveTo(cx - 50 + sway, gy - 80, cx - 24, gy - 120); g.lineTo(cx + 24, gy - 120); g.quadraticCurveTo(cx + 50 + sway, gy - 80, cx + 34, gy); g.closePath(); g.fill(); g.stroke();
      g.beginPath(); g.arc(cx, gy - 140, 26, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = '#e8dcc0'; [-1, 1].forEach(s => { g.beginPath(); g.moveTo(cx + s * 16, gy - 158); g.quadraticCurveTo(cx + s * 40, gy - 176, cx + s * 34, gy - 206); g.quadraticCurveTo(cx + s * 30, gy - 180, cx + s * 6, gy - 164); g.closePath(); g.fill(); g.stroke(); });
      g.fillStyle = C.red; [-1, 1].forEach(s => { g.beginPath(); g.ellipse(cx + s * 10, gy - 142, 5, 3, s * .3, 0, TAU); g.fill(); });
      g.strokeStyle = '#3a2f45'; g.lineWidth = 6; g.beginPath(); g.moveTo(cx + 30, gy - 20); g.quadraticCurveTo(cx + 80, gy - 10, cx + 86, gy - 50 + sway); g.stroke();
    }
    if (kind === 'spirit') {
      const fl = Math.sin(t * 2) * 8, sx = cx, sy = gy - 100 + fl;
      const grd = g.createRadialGradient(sx, sy, 6, sx, sy, 110); grd.addColorStop(0, 'rgba(255,255,240,.95)'); grd.addColorStop(.4, 'rgba(180,230,255,.45)'); grd.addColorStop(1, 'rgba(180,230,255,0)');
      g.fillStyle = grd; g.beginPath(); g.arc(sx, sy, 110, 0, TAU); g.fill();
      stroke(g, 2.5, '#7fb2c9'); g.fillStyle = '#ffffff';
      g.beginPath(); g.ellipse(sx, sy + 8, 22, 28, 0, 0, TAU); g.fill(); g.stroke();
      g.beginPath(); g.arc(sx, sy - 30, 18, 0, TAU); g.fill(); g.stroke();
      [-1, 1].forEach(s => { g.beginPath(); g.moveTo(sx + s * 8, sy - 44); g.quadraticCurveTo(sx + s * 34, sy - 74, sx + s * 26, sy - 34); g.closePath(); g.fill(); g.stroke(); });
      g.fillStyle = '#3b6c86'; [-1, 1].forEach(s => { g.beginPath(); g.arc(sx + s * 7, sy - 30, 2.5, 0, TAU); g.fill(); });
      g.fillStyle = '#4f9a54'; [[-110, 10], [100, -10], [-80, -60], [90, 40]].forEach(([dx, dy], i) => { g.save(); g.translate(cx + dx, gy - 60 + dy + Math.sin(t * 1.5 + i) * 6); g.rotate(i + t * .5); g.beginPath(); g.ellipse(0, 0, 10, 4, 0, 0, TAU); g.fill(); g.restore(); });
    }
    g.restore();
    text(g, 'concept sketch (illustrative)', x + 12, y + h - 12, 13, 'rgba(59,53,82,.55)', 600);
  }

  // an Apex card: the concept in words only, no art
  function textCard(g, c, v, x, y, w, h) {
    g.fillStyle = '#f1ece2'; g.fillRect(x, y, w, h);
    g.setLineDash([8, 8]); g.strokeStyle = '#b9ad92'; g.lineWidth = 2; g.strokeRect(x + 14, y + 14, w - 28, h - 28); g.setLineDash([]);
    text(g, c.name.toUpperCase(), x + w / 2, y + 70, 18, C.muted, 800, 'center', 'M');
    g.font = font(30, 800, 'Montserrat, Jost'); g.fillStyle = C.ink; g.textAlign = 'center';
    const words = v.name.split(' '), half = Math.ceil(words.length / 2);
    if (g.measureText(v.name).width > w - 60) { g.fillText(words.slice(0, half).join(' '), x + w / 2, y + h / 2); g.fillText(words.slice(half).join(' '), x + w / 2, y + h / 2 + 38); }
    else g.fillText(v.name, x + w / 2, y + h / 2 + 10);
    text(g, 'Text only: no Apex Legends art on this page.', x + w / 2, y + h - 34, 13, C.muted, 600, 'center');
  }

  function finalArt(g, v, x, y, w, h) {
    cover(g, v.img + '_splash.jpg', x, y, w, h, .5, .25);
    g.fillStyle = 'rgba(21,32,68,.15)'; g.fillRect(x, y, w, h);
    const s = 96; g.fillStyle = '#fffaf0'; g.fillRect(x + 12, y + h - s - 16, s + 8, s + 8); pic(g, v.img + '.png', x + 16, y + h - s - 12, s, s);
  }

  /* ---------- slide 1: the kit strip and the fantasy card ---------- */
  const STEP = 3.2, FLIP = .5;
  const SEQ = []; ORDER.forEach(k => CASES[k].versions.forEach((_, i) => SEQ.push([k, i])));
  const KIT_DUR = SEQ.length * STEP;

  function drawKit(g, st, t, since) {
    const c = CASES[st.c], v = c.versions[st.v];
    T.use(g); g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,252,244,.9)'; rr(g, 0, 0, W, H, 14); g.fill();
    // the kit strip: never changes while the versions step
    g.fillStyle = '#152044'; rr(g, 12, 12, W - 24, 160, 12); g.fill();
    text(g, `The kit · ${c.name}`, 32, 44, 20, '#fff', 800, 'left', 'M');
    text(g, c.kitLine, 32, 70, 15, '#c9d3f0', 500);
    // padlock badge
    const pulse = st.pv != null ? clamp(1 - since / 1.2) : 0;
    g.save(); g.font = font(22, 600); g.fillStyle = C.gold; g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillText('🔒', W - 210, 42); g.restore();
    text(g, 'Kit changes: 0', W - 36, 50, 18, C.gold, 800, 'right', 'M');
    const items = c.kit || c.glyph, n = items.length, S = 62, gap = n > 4 ? 172 : 200, x0 = W / 2 - (n - 1) * gap / 2;
    items.forEach(([f, name], i) => {
      const x = x0 + i * gap - S / 2, y = 82;
      if (pulse > 0) { g.save(); g.shadowColor = C.gold; g.shadowBlur = 22 * pulse; g.fillStyle = C.gold; rr(g, x - 3, y - 3, S + 6, S + 6, 8); g.fill(); g.restore(); }
      if (c.kit) { g.fillStyle = '#000'; g.fillRect(x - 1, y - 1, S + 2, S + 2); pic(g, f, x, y, S, S); }
      else { g.fillStyle = '#26315e'; rr(g, x, y, S, S, 8); g.fill(); g.strokeStyle = '#4b5a96'; g.lineWidth = 2; g.stroke(); g.save(); g.font = font(36, 600); g.fillStyle = '#fffaf0'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(f, x + S / 2, y + S / 2 + 1); g.restore(); }
      text(g, name, x + S / 2, y + S + 18, 14, '#fffaf0', 600, 'center');
    });
    if (pulse > 0) T.label('Same kit, every version', W / 2, 186, 'center', '#9a5a06', 14, `rgba(253,233,184,${pulse})`);

    // the fantasy card, flipping between versions
    const cx = 12, cy = 200, cw = W - 24, ch = H - cy - 12;
    g.fillStyle = '#efe6d2'; rr(g, cx, cy, cw, ch, 12); g.fill();
    const flip = since < FLIP ? Math.abs(Math.cos(since / FLIP * Math.PI)) : 1;
    const showPrev = since < FLIP / 2 && st.pv != null;
    const vv = showPrev ? c.versions[st.pv] : v;
    const ax = cx + 18, ay = cy + 18, aw = 430, ah = ch - 36;
    g.save(); g.translate(ax + aw / 2, 0); g.scale(Math.max(.02, flip), 1); g.translate(-(ax + aw / 2), 0);
    g.save(); rr(g, ax, ay, aw, ah, 10); g.clip();
    if (c.apex) textCard(g, c, vv, ax, ay, aw, ah);
    else if (vv.img) finalArt(g, vv, ax, ay, aw, ah);
    else sketch(g, vv.sketch, ax, ay, aw, ah, t);
    g.restore(); g.strokeStyle = '#cdbf9f'; g.lineWidth = 2; rr(g, ax, ay, aw, ah, 10); g.stroke();
    g.restore();

    // the card's words
    const tx = ax + aw + 30, tw = cx + cw - tx - 20;
    const fade = since < FLIP ? clamp((since - FLIP / 2) / (FLIP / 2)) : 1;
    g.save(); g.globalAlpha = fade;
    text(g, `Version ${st.v + 1} of ${c.versions.length} · ${c.at}`, tx, ay + 22, 15, C.muted, 600);
    g.font = font(28, 800, 'Montserrat, Jost'); g.fillStyle = C.ink; g.textAlign = 'left'; g.fillText(v.name, tx, ay + 60);
    wrap(g, v.text, tx, ay + 94, tw, 23, 17, C.ink, 500);
    // reads as
    const ry = ay + 238;
    text(g, 'Reads as', tx, ry, 15, C.muted, 700);
    g.font = font(34, 800, 'Montserrat, Jost'); const rw = g.measureText(v.reads).width + 34;
    const [fl, fc, fb] = FIT[v.fit];
    g.fillStyle = '#fffaf0'; g.strokeStyle = fc; g.lineWidth = 3; rr(g, tx, ry + 10, rw, 54, 12); g.fill(); g.stroke();
    g.fillStyle = fc; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(v.reads, tx + 17, ry + 38);
    g.font = font(15, 700); const fw = g.measureText(fl).width + 20;
    g.fillStyle = fb; g.strokeStyle = fc; g.lineWidth = 2; rr(g, tx, ry + 76, fw, 28, 8); g.fill(); g.stroke();
    g.fillStyle = fc; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(fl, tx + 10, ry + 91);
    g.restore();
    // version timeline
    const step = 34, ny = ay + 16, nx0 = cx + cw - 30 - (c.versions.length - 1) * step;
    c.versions.forEach((vs, i) => {
      const x = nx0 + i * step;
      if (i) { g.strokeStyle = i <= st.v ? C.ink : '#cdbf9f'; g.lineWidth = 3; g.beginPath(); g.moveTo(x - step + 9, ny); g.lineTo(x - 9, ny); g.stroke(); }
      g.fillStyle = i === st.v ? C.gold : i < st.v ? C.ink : '#fffaf0'; g.strokeStyle = C.ink; g.lineWidth = 2; g.beginPath(); g.arc(x, ny, 8, 0, TAU); g.fill(); g.stroke();
    });
  }

  const scenes = {};
  canvasDemo('kit', (s, cv, g) => {
    const st = { c: 'ziggs', v: 0, pv: null, t: 0, at: -9, tour: true, held: false, key: '' };
    const tourBtn = $(s, '.sk-tour');
    const free = () => { st.held = false; st.tour = false; tourBtn.classList.remove('on'); };
    const go = (c, v) => { const same = c === st.c; st.pv = same ? st.v : null; st.c = c; st.v = v; st.at = st.t; };
    $$(s, '.sk-case .btn').forEach(b => b.onclick = () => { free(); go(b.dataset.c, 0); });
    $(s, '.sk-prev').onclick = () => { free(); if (st.v > 0) go(st.c, st.v - 1); };
    $(s, '.sk-next').onclick = () => { free(); if (st.v < CASES[st.c].versions.length - 1) go(st.c, st.v + 1); };
    tourBtn.onclick = () => { st.held = false; st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    function tourAt(t) {
      const i = Math.floor((t % KIT_DUR) / STEP), [c, v] = SEQ[i], prev = SEQ[i - 1];
      st.c = c; st.v = v; st.pv = prev && prev[0] === c ? prev[1] : null;
      return (t % KIT_DUR) - i * STEP;
    }
    function info() {
      const c = CASES[st.c], v = c.versions[st.v], key = st.c + st.v; if (key === st.key) return; st.key = key;
      $$(s, '.sk-case .btn').forEach(b => b.classList.toggle('on', b.dataset.c === st.c));
      say($(s, '.sk-stats'), `<div><b>${st.v + 1}/${c.versions.length}</b><span>${v.name}</span></div><div class="g"><b>0</b><span>abilities changed</span></div>`);
      say($(s, '.sk-out'), v.text);
    }
    function render(t) { const since = st.tour ? tourAt(t) : t - st.at; drawKit(g, st, t, since); info(); }
    scenes.kit = { seek(t) { st.held = true; st.tour = true; render(t); }, dur: () => KIT_DUR };
    return dt => { if (st.held) return; st.t += dt; if (st.tour && st.t >= KIT_DUR) st.t = 0; render(st.t); };
  });

  /* ---------- slide 2: where the character started ---------- */
  const LANES = [
    { name: 'Braum', way: 'mech', img: 'Braum.png', start: ['BraumE.png', 'Started from a shield'], kit: ['BraumQ.png', 'BraumW.png', 'BraumE.png', 'BraumRWrapper.png'], who: '"Kindness is Strength"' },
    { name: 'Caitlyn', way: 'mech', img: 'Caitlyn.png', start: ['CaitlynQ.png', 'Started from a sniper'], kit: ['CaitlynQ.png', 'CaitlynW.png', 'CaitlynE.png', 'CaitlynR.png'], who: 'The Sheriff of Piltover' },
    { name: 'Aurelion Sol', way: 'fan', img: 'AurelionSol.png', start: [null, 'Started from a storm dragon'], kit: ['AurelionSolQ.png', 'AurelionSolW.png', 'AurelionSolE.png', 'AurelionSolR.png'], who: 'A cosmic dragon' },
  ];
  LANES.forEach(l => { load(l.img); l.kit.forEach(load); if (l.start[0]) load(l.start[0]); });
  const LANE = 3.4, JIG = 3.2, OR_DUR = LANE * 3 + JIG * 2 + 1;

  function kitRow(g, kit, x, y, a) { kit.forEach((f, i) => { g.fillStyle = '#000'; g.fillRect(x + i * 52 - 1, y - 1, 46, 46); pic(g, f, x + i * 52, y, 44, 44, a); }); }
  function stageBox(g, x, y, w, h, title, a, col) {
    g.save(); g.globalAlpha *= a;
    g.fillStyle = '#fffaf0'; g.strokeStyle = col; g.lineWidth = 2.5; rr(g, x, y, w, h, 10); g.fill(); g.stroke();
    text(g, title, x + 12, y + 22, 14, col, 700);
    g.restore();
  }
  function arrow(g, x0, y, x1, k) {
    if (k <= 0) return; const xe = lerp(x0, x1, k);
    g.strokeStyle = C.ink; g.lineWidth = 3; g.beginPath(); g.moveTo(x0, y); g.lineTo(xe, y); g.stroke();
    if (k >= 1) { g.fillStyle = C.ink; g.beginPath(); g.moveTo(x1 + 4, y); g.lineTo(x1 - 8, y - 7); g.lineTo(x1 - 8, y + 7); g.closePath(); g.fill(); }
  }
  function dragonSketch(g, x, y, t) {
    g.save(); g.font = font(44, 600); g.fillStyle = '#5562eb'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('⛈', x - 28, y - 4); g.fillStyle = '#8a4fd6'; g.fillText('🐉', x + 26, y + 2 + Math.sin(t * 3) * 3); g.restore();
  }
  function drawOrigin(g, t, focus, indep) {
    T.use(g); g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,252,244,.9)'; rr(g, 0, 0, W, H, 14); g.fill();
    const SX = [218, 488, 758], SW = 250, LH = 128;
    LANES.forEach((l, i) => {
      const y = 12 + i * (LH + 10);
      // each lane builds in its turn; a focused lane replays and the rest stay complete
      const lt = focus === -1 ? t - i * LANE : focus === i ? t : 99, dim = focus !== -1 && focus !== i;
      g.save(); g.globalAlpha = dim ? .35 : 1;
      g.fillStyle = '#efe6d2'; rr(g, 8, y, W - 16, LH, 12); g.fill();
      text(g, l.name, 24, y + 36, 20, C.ink, 800, 'left', 'M');
      const mech = l.way === 'mech', col = mech ? '#23306e' : '#8a4fd6';
      g.font = font(14, 700); const tag = mech ? 'Mechanics first' : 'Fantasy first', tw = g.measureText(tag).width + 18;
      g.fillStyle = mech ? '#dfe6fb' : '#eadcf8'; g.strokeStyle = col; g.lineWidth = 2; rr(g, 24, y + 50, tw, 26, 8); g.fill(); g.stroke();
      g.fillStyle = col; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(tag, 33, y + 64);
      text(g, mech ? 'kit, then character' : 'character, then kit', 24, y + 100, 13, C.muted, 600);
      const a = k => clamp((lt - k) / .5), by = y + 10, bh = LH - 20;
      // stage 1: the seed
      stageBox(g, SX[0], by, SW, bh, l.start[1], a(.2), col);
      if (a(.2) > 0) { g.save(); g.globalAlpha *= a(.2); if (l.start[0]) { g.fillStyle = '#000'; g.fillRect(SX[0] + SW / 2 - 29, by + 36, 58, 58); pic(g, l.start[0], SX[0] + SW / 2 - 28, by + 37, 56, 56); } else dragonSketch(g, SX[0] + SW / 2, by + 66, t); g.restore(); }
      arrow(g, SX[0] + SW + 2, by + bh / 2, SX[1] - 4, clamp((lt - .9) / .4));
      // stage 2 and 3: kit then character, or character then kit
      const kitBox = mech ? 1 : 2, charBox = mech ? 2 : 1;
      stageBox(g, SX[kitBox], by, SW, bh, mech ? 'The kit grows from it' : 'A kit built to deliver it', a(kitBox === 1 ? 1.3 : 2.4), '#23306e');
      if (a(kitBox === 1 ? 1.3 : 2.4) > 0) kitRow(g, l.kit, SX[kitBox] + 24, by + 42, a(kitBox === 1 ? 1.3 : 2.4));
      stageBox(g, SX[charBox], by, SW, bh, mech ? 'A character that explains it' : 'The character comes first', a(charBox === 1 ? 1.3 : 2.4), '#8a4fd6');
      if (a(charBox === 1 ? 1.3 : 2.4) > 0) { g.save(); g.globalAlpha *= a(charBox === 1 ? 1.3 : 2.4); g.fillStyle = '#fffaf0'; g.fillRect(SX[charBox] + 12, by + 32, 66, 66); pic(g, l.img, SX[charBox] + 14, by + 34, 62, 62); wrap(g, l.who, SX[charBox] + 88, by + 60, SW - 98, 19, 15, C.ink, 600); g.restore(); }
      arrow(g, SX[1] + SW + 2, by + bh / 2, SX[2] - 4, clamp((lt - 2) / .4));
      g.restore();
    });
    // the jigsaw: a cohesive character achieves both
    const jy = 12 + 3 * (LH + 10), jh = H - jy - 10;
    g.fillStyle = '#152044'; rr(g, 8, jy, W - 16, jh, 12); g.fill();
    const jt = focus === -1 ? t - LANE * 3 : t - .2;
    const together = indep ? 0 : ease(clamp(jt / 1.4)), apart = indep ? ease(clamp(jt / 1.4)) : 0;
    const mx = 160 + together * 46 - apart * 30, fx = 400 - together * 46 + apart * 30, py = jy + jh / 2;
    piece(g, mx, py, 'Mechanics', '#2ea3dc', 1, apart);
    piece(g, fx, py, 'Fantasy', '#8a4fd6', -1, apart);
    if (together >= 1) { T.flash(280, py, 30, clamp((jt - 1.4) / .4) * (1 - clamp((jt - 2) / .6))); }
    const msg = indep
      ? ['There is great risk trying to do both', 'independently at the same time.']
      : ['A cohesive character achieves both:', 'who they are matches how they play.'];
    g.save(); g.globalAlpha = clamp((jt - .6) / .5);
    text(g, msg[0], 560, py - 6, 21, '#fffaf0', 800, 'left', 'M'); text(g, msg[1], 560, py + 22, 18, indep ? '#ffb4ae' : '#bfe8cc', 600);
    g.restore();
  }
  function piece(g, x, y, name, col, side, apart) {
    // a jigsaw piece with a tab on one side and a slot on the other; apart tilts them so the tab misses the slot
    g.save(); g.translate(x, y + apart * 14 * side); g.rotate(apart * .18 * side);
    const w = 150, h = 56;
    g.fillStyle = col; g.strokeStyle = '#fffaf0'; g.lineWidth = 2;
    g.beginPath();
    if (side === 1) { g.moveTo(-w / 2, -h / 2); g.lineTo(w / 2, -h / 2); g.lineTo(w / 2, -12); g.arc(w / 2 + 6, 0, 13, Math.PI * 1.2, Math.PI * .8, false); g.lineTo(w / 2, h / 2); g.lineTo(-w / 2, h / 2); g.closePath(); }
    else { g.moveTo(w / 2, -h / 2); g.lineTo(-w / 2, -h / 2); g.lineTo(-w / 2, -12); g.arc(-w / 2 + 6, 0, 13, Math.PI * 1.8, Math.PI * .2, true); g.lineTo(-w / 2, h / 2); g.lineTo(w / 2, h / 2); g.closePath(); }
    g.fill(); g.stroke();
    g.font = font(18, 800, 'Montserrat, Jost'); g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(name, -side * 6, 1);
    g.restore();
  }
  const OR_OUT = {
    all: 'Braum and Caitlyn started as mechanics (a shield, a sniper) and found a character that explains them. Aurelion Sol started as a fantasy (a storm dragon) and got a kit built to deliver it.',
    0: 'Braum started as a shield for allies. The character came later, and the one that stuck makes the shield the expression of who he is.',
    1: 'Caitlyn started as a sniper: long range, traps and nets. The Sheriff of Piltover is the character that makes that kit feel inevitable.',
    2: 'Aurelion Sol started as a fantasy: a storm dragon. The kit was built afterwards to make players feel that fantasy.',
    indep: 'Developing the kit and the fantasy at the same time, but separately, is where they drift apart. Caustic’s trap kit and an aggressive soldier look were made apart and did not fit.',
  };
  canvasDemo('origin', (s, cv, g) => {
    const st = { t: 0, focus: -1, indep: false, tour: true, held: false, key: '' };
    const tourBtn = $(s, '.or-tour'), box = $(s, '.or-indep');
    const free = () => { st.held = false; st.tour = false; tourBtn.classList.remove('on'); st.t = 0; };
    $$(s, '.or-focus .btn').forEach(b => b.onclick = () => { free(); st.focus = +b.dataset.f; });
    box.onchange = () => { const v = box.checked; free(); st.indep = v; };
    tourBtn.onclick = () => { st.held = false; st.tour = true; st.t = 0; tourBtn.classList.add('on'); };
    function render(t) {
      let focus = st.focus, indep = st.indep, tt = t;
      if (st.tour) { focus = -1; indep = t > LANE * 3 + JIG; tt = indep ? t - JIG : t; }
      drawOrigin(g, tt, focus, indep);
      const key = [focus, indep].join(); if (key === st.key) return; st.key = key;
      $$(s, '.or-focus .btn').forEach(b => b.classList.toggle('on', +b.dataset.f === focus));
      box.checked = indep;
      say($(s, '.or-out'), indep ? OR_OUT.indep : OR_OUT[focus === -1 ? 'all' : focus]);
    }
    scenes.origin = { seek(t) { st.held = true; st.tour = true; render(t); }, dur: () => OR_DUR };
    return dt => { if (st.held) return; st.t += dt; if (st.tour && st.t >= OR_DUR) st.t = 0; render(st.t); };
  });

  window.__seek = (t, which = 'kit') => scenes[which].seek(t);
  window.__dur = (which = 'kit') => scenes[which].dur();
})();
