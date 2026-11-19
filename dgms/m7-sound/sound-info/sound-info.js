/* Sound that carries information (DGMS M7), beside "hear the boss coming" and "same scene, four rules".
   ult    Overwatch: every ultimate is shouted, with one line for the enemy team and another for allies. Kit plays
          Hanzo. The same Dragonstrike is a warning to one team and a rally call to the other; mute it and both fail.
   spec   Left 4 Dead: each special infected has its own sound, heard before it is seen. The cast plays them in a dark
          corridor: Wisp the Hunter, Sam the Smoker, Bram the Boomer, Grub the Tank, Sage the Witch.
   steps  Counter-Strike: running is loud and walking is silent but about half speed, so noise is a price Pip pays for
          time. Rook holds the site and turns if he hears steps.
   The voice lines and the sound descriptions are the games'. Distances, speeds and timings are ours. */
(function () {
  const { txt, box, bar, pill, clamp, lerp, C, dot, ring, wrap } = SCN, TAU = SCN.TAU;
  const W = 1040, H = 585;
  const team = (g, x, y, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(x - 9, y - 12); g.lineTo(x + 9, y - 12); g.lineTo(x, y); g.closePath(); g.fill(); };

  /* ---------------- Overwatch: ultimates you can hear ---------------- */
  SCN.run('ult', s => {
    const FLOOR = 318, WALL = 640, LEDGE = 170, SPEED = 520, CALL = 1.5;
    const LINES = [['Hanzo', 'Ryuu ga waga teki wo kurau!', 'Let the dragon consume my foes!'], ['Pharah', 'Justice rains from above!', 'Rocket barrage incoming!'], ['Reaper', 'Die! Die! Die!', 'Clearing the area.'], ['Zarya', 'Ogon\' po gotovnosti!', 'Fire at will!']];
    let z, who = 'enemy', voice = 'on', self = 'auto';
    const round = () => { Object.assign(z, { ph: 'wait', pt: 0, rt: 0, acted: false, res: '', px: 300, lift: 0, pst: 'idle', dx: null, est: 'idle', et: 0, seen: -1 }); };
    function act() { if (z.acted || z.ph === 'wait' || z.res) return; z.acted = true; z.pst = who === 'enemy' ? 'flee' : 'push'; }
    const api = {
      dur: 27,
      reset(tour) { if (tour) { who = 'enemy'; voice = 'on'; self = 'auto'; api.mark('who', who); api.mark('voice', voice); api.mark('self', self); } z = { t: 0, esc: 0, hit: 0, push: 0, late: 0, warn: 0 }; round(); },
      step(h) {
        z.t += h; z.pt += h; const ph = z.ph;
        if (ph === 'wait' && z.pt > .9) { z.ph = 'call'; z.pt = 0; z.rt = 0; if (voice === 'on') { z.seen = 0; SCN.tone({ f: 330, f2: 660, dur: .5, type: 'sawtooth', vol: .1 }); SCN.tone({ f: 494, f2: 880, dur: .6, type: 'triangle', vol: .08, at: .25 }); } }
        if (ph !== 'wait') z.rt += h;
        if (ph === 'call' && z.pt > CALL) { z.ph = 'fly'; z.pt = 0; z.dx = who === 'enemy' ? 850 : 110; SCN.noise({ dur: 1.2, cut: 500, vol: .25 }); }
        if (z.ph === 'fly') {
          const dir = who === 'enemy' ? -1 : 1; z.dx += dir * SPEED * h;
          if (z.seen < 0 && (who === 'enemy' ? z.dx < WALL : z.dx > z.px - 40)) z.seen = z.rt;
          if (who === 'enemy' && !z.res && z.dx < z.px + 20) { if (z.lift > 140) { z.res = 'esc'; z.esc++; } else { z.res = 'hit'; z.hit++; z.pst = 'down'; SCN.noise({ dur: .3, cut: 300, vol: .3 }); } z.warn = z.rt - z.seen; }
          if (who === 'ally' && z.est === 'idle' && z.dx > 790) { z.est = 'stun'; z.et = 0; z.warn = z.rt - z.seen; }
          if (z.dx < -420 || z.dx > W + 420) { z.ph = 'after'; z.pt = 0; }
        }
        if (z.est === 'stun') { z.et += h; if (z.px >= 740 && !z.res) { z.res = 'push'; z.push++; z.est = 'down'; SCN.noise({ dur: .2, cut: 900, vol: .25 }); } else if (z.et > .9) { z.est = 'back'; if (!z.res) { z.res = 'late'; z.late++; } } }
        if (z.ph === 'after' && z.pt > (who === 'ally' ? 2.2 : 1.6)) { if (who === 'ally' && !z.res) { z.res = 'late'; z.late++; } if (z.pt > (who === 'ally' ? 2.6 : 1.6)) round(); }
        if (self === 'auto' && !z.acted && z.seen >= 0 && z.rt - z.seen > (voice === 'on' ? .45 : .3)) act();
        if (z.pst === 'flee') { if (z.px > 170) z.px = Math.max(170, z.px - 300 * h); else z.lift = Math.min(LEDGE, z.lift + LEDGE / .45 * h); }
        if (z.pst === 'push' && z.px < 745) z.px = Math.min(745, z.px + 260 * h);
      },
      script: [[6.6, () => { voice = 'off'; api.mark('voice', voice); round(); }], [13.2, () => { who = 'ally'; voice = 'on'; api.mark('who', who); api.mark('voice', voice); round(); }], [20.2, () => { voice = 'off'; api.mark('voice', voice); round(); }]],
      caption: t => t < 6.6 ? 'Kit plays Hanzo on the enemy team, out of sight behind the wall. His ultimate is shouted across the whole map, so Pip and Sam have time to leave the lane.'
        : t < 13.2 ? 'Mute the line and the first sign is the dragon coming through the wall. The same ultimate is now a coin toss you cannot play around.'
        : t < 20.2 ? 'On your own team the same ultimate has a different line, in English. It is a rally call: go in with the dragon.'
        : 'Mute that too and Pip follows a beat late. One loud line was doing two jobs: a warning for one team, a go signal for the other.',
      status: () => z.res === 'esc' ? 'Out of the lane in time. The shout bought the escape.' : z.res === 'hit' ? 'Caught in the lane. The warning came too late to use.' : z.res === 'push' ? 'Pip arrived with the dragon and the push landed.' : z.res === 'late' ? 'The dragon went in alone. Rook and Bram stepped back in before anyone followed.' : self === 'you' ? 'Press J when you know what is coming: leave the lane against an enemy dragon, or charge in behind a friendly one.' : 'Switch who is ulting, and whether the line is spoken.',
      stats: () => `<div class="${voice === 'on' ? 'g' : 'r'}"><b>${z.warn ? z.warn.toFixed(1) + 's' : 'n/a'}</b><span>between the first cue and the dragon arriving</span></div><div><b>${z.esc} / ${z.esc + z.hit}</b><span>enemy dragons escaped</span></div><div class="y"><b>${z.push} / ${z.push + z.late}</b><span>friendly dragons followed in</span></div>`,
      acts: { act }, keys: { j: 'act' },
      set(k, v) { if (k === 'who') who = v; if (k === 'voice') voice = v; if (k === 'self') self = v; },
      draw(g) {
        g.clearRect(0, 0, W, H); g.save(); SCN.clipStage(g, W, H);
        const sky = g.createLinearGradient(0, 0, 0, FLOOR); sky.addColorStop(0, '#f3c98b'); sky.addColorStop(1, '#f7e3c0'); g.fillStyle = sky; g.fillRect(0, 0, W, FLOOR);
        g.fillStyle = 'rgba(150,90,60,.18)'; [[690, 90, 130, 228], [860, 130, 160, 188], [300, 60, 200, 258]].forEach(([x, y, w, h]) => { g.fillRect(x, y, w, h); g.beginPath(); g.moveTo(x - 14, y); g.lineTo(x + w / 2, y - 26); g.lineTo(x + w + 14, y); g.fill(); });
        g.fillStyle = '#c9a57a'; g.fillRect(0, FLOOR, W, 50); g.fillStyle = '#a07f58'; g.fillRect(0, FLOOR, W, 5);
        // the ledge on the left, out of the lane
        g.fillStyle = '#8a6748'; g.fillRect(30, FLOOR - LEDGE, 215, 14); g.fillRect(40, FLOOR - LEDGE, 12, LEDGE); g.fillRect(222, FLOOR - LEDGE, 12, LEDGE); g.strokeStyle = '#8a6748'; g.lineWidth = 4; for (let i = 1; i < 6; i++) { g.beginPath(); g.moveTo(222, FLOOR - i * 28); g.lineTo(250, FLOOR - i * 28); g.stroke(); } g.beginPath(); g.moveTo(250, FLOOR); g.lineTo(250, FLOOR - LEDGE); g.stroke();
        if (who === 'enemy') txt(g, 'out of the lane', 137, FLOOR - LEDGE + 28, { size: 13, w: 800, col: '#6b4d33', align: 'center' });
        // lane band
        g.fillStyle = 'rgba(63,193,255,.08)'; g.fillRect(0, FLOOR - 130, W, 130);
        const enemyCol = '#e5322d', allyCol = '#2ea3dc';
        // who is where
        const kx = who === 'enemy' ? 850 : 110, kface = who === 'enemy' ? -1 : 1, calling = z.ph === 'call';
        const rest = [];
        if (who === 'enemy') rest.push(['kit', kx, 0, kface, calling ? 'aim' : z.ph === 'fly' ? 'follow' : 'idle', enemyCol]);
        else { rest.push(['kit', kx, 0, 1, calling ? 'aim' : z.ph === 'fly' ? 'follow' : 'idle', allyCol]); const ep = z.est === 'stun' ? 'hit' : z.est === 'down' ? 'down' : 'guard'; rest.push(['rook', 800, 0, -1, ep, enemyCol], ['bram', 900, 0, -1, ep, enemyCol]); }
        const pp = z.pst === 'down' ? 'down' : z.pst === 'flee' ? (z.px > 170 ? CAST.cycle('run', z.t * 1.6) : z.lift < LEDGE ? 'jump' : 'crouch') : z.pst === 'push' ? (z.px < 745 ? CAST.cycle('run', z.t * 1.6) : 'strike') : 'guard';
        const pface = z.pst === 'flee' && z.px > 170 ? -1 : 1;
        rest.push(['sam', z.px - (z.pst === 'push' ? 60 : 78), z.lift, pface, pp, allyCol], ['pip', z.px, z.lift, pface, pp, allyCol]);
        rest.forEach(([id, x, lift, face, pose, col]) => { const down = pose === 'down'; CAST.draw(g, id, { x, y: FLOOR - lift, face, pose, s: .95, tint: id === 'sam' ? '#9fb7d8' : undefined }); team(g, x, FLOOR - lift - (down ? 50 : 132), col); });
        // the wall between the teams
        g.fillStyle = '#7d5a44'; g.fillRect(WALL - 16, 40, 32, FLOOR - 40); g.fillStyle = '#684936'; for (let y = 60; y < FLOOR; y += 34) g.fillRect(WALL - 16, y, 32, 3);
        txt(g, who === 'enemy' ? 'enemy side: out of Pip\'s sight' : 'enemy side', 840, 26, { size: 13, w: 800, col: '#6b4d33', align: 'center' }); txt(g, 'your team', 300, 26, { size: 13, w: 800, col: '#6b4d33', align: 'center' });
        // the dragon
        if (z.dx != null && z.ph === 'fly') { const dir = who === 'enemy' ? -1 : 1; g.save(); g.lineCap = 'round';
          for (let k = 0; k < 2; k++) { g.strokeStyle = k ? 'rgba(190,240,255,.95)' : 'rgba(40,150,255,.9)'; g.lineWidth = 20; g.shadowColor = '#3fc1ff'; g.shadowBlur = 24; g.beginPath(); for (let i = 0; i <= 40; i++) { const u = i / 40, x = z.dx - dir * u * 400, y = FLOOR - 68 + Math.sin(u * 9 - z.t * 14 + k * Math.PI) * 44 * (1 - u * .3); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
            const hy = FLOOR - 68 + Math.sin(-z.t * 14 + k * Math.PI) * 44; g.fillStyle = k ? '#dff7ff' : '#3fa0ff'; g.beginPath(); g.moveTo(z.dx + dir * 34, hy); g.lineTo(z.dx - dir * 6, hy - 20); g.lineTo(z.dx - dir * 6, hy + 20); g.fill(); }
          g.restore(); }
        // the shouted line
        if (voice === 'on' && (z.ph === 'call' || (z.ph === 'fly' && z.pt < .5))) { const en = who === 'enemy'; for (let i = 0; i < 3; i++) ring(g, kx, FLOOR - 110, 60 + ((z.rt * 420 + i * 220) % 660), en ? enemyCol : allyCol, 3, .35 * (1 - ((z.rt * 420 + i * 220) % 660) / 660));
          SCN.bubble(g, LINES[0][en ? 1 : 2], kx, FLOOR - 150, { size: 20, w: 800, max: 300, stroke: en ? enemyCol : allyCol, col: en ? enemyCol : '#14608a', dx: en ? -60 : 60 }); pill(g, en ? 'heard by everyone on the map' : 'allies hear it in their own words', clamp(kx + (en ? -60 : 110), 150, 880), FLOOR - 252, { size: 13, w: 800, fill: en ? enemyCol : allyCol }); }
        if (voice === 'off' && z.ph === 'call') { txt(g, '(silence)', kx, FLOOR - 170, { size: 18, w: 800, col: C.muted, align: 'center' }); }
        if (z.res) { const m = { esc: ['ESCAPED', C.green], hit: ['CAUGHT IN THE LANE', enemyCol], push: ['PUSH LANDED', C.green], late: ['A BEAT LATE', '#b26a00'] }[z.res]; pill(g, m[0], 520, 70, { size: 20, w: 800, fill: m[1], display: true }); }
        g.fillStyle = 'rgba(255,252,244,.97)'; g.fillRect(0, FLOOR + 50, W, H);
        // the lines table
        const ty = FLOOR + 66, en = who === 'enemy';
        txt(g, 'hero', 28, ty + 8, { size: 13, w: 800, col: C.muted }); txt(g, 'what the enemy team hears', 170, ty + 8, { size: 13, w: 800, col: enemyCol }); txt(g, 'what the hero\'s own team hears', 590, ty + 8, { size: 13, w: 800, col: '#14608a' });
        box(g, en ? 160 : 580, ty - 8, en ? 410 : 440, 196, { r: 10, fill: en ? 'rgba(229,50,45,.07)' : 'rgba(46,163,220,.09)', stroke: en ? enemyCol : allyCol, lw: 2 });
        LINES.forEach(([hero, a, b], i) => { const y = ty + 44 + i * 40; if (!i) box(g, 16, y - 18, 1008, 36, { r: 8, fill: 'rgba(255,185,81,.22)' }); txt(g, hero, 28, y, { size: 17, w: 800, display: true }); txt(g, '"' + a + '"', 170, y, { size: 17, w: 700 }); txt(g, '"' + b + '"', 590, y, { size: 17, w: 700 }); });
        g.restore();
      },
    };
    return api;
  });

  /* ---------------- Left 4 Dead: heard before seen ---------------- */
  SCN.run('spec', s => {
    const FLOOR = 300;
    const SP = [
      { id: 'hunter', name: 'Hunter', cast: 'wisp', tint: '#4b5a78', sc: 1, hear: 'a low growl, then a shriek as it leaps', glyph: 'grrr…  SKREEE!', todo: 'Stay close. Shove it off whoever it pins.', pose: 'crouch' },
      { id: 'smoker', name: 'Smoker', cast: 'sam', tint: '#7d9a6a', sc: 1.12, hear: 'a hacking, wheezing cough', glyph: 'hack… hack… wheeze', todo: 'Look up and back. Shoot the tongue to free a friend.', pose: 'idle' },
      { id: 'boomer', name: 'Boomer', cast: 'bram', tint: '#b9b06a', sc: 1.05, hear: 'wet gurgling and belching', glyph: 'glurp… BURP… glurp', todo: 'Back off before you shoot: its bile calls the horde.', pose: 'idle' },
      { id: 'tank', name: 'Tank', cast: 'grub', tint: '#a8646a', sc: 1.5, hear: 'a roar, shaking ground, and its own music', glyph: 'BOOM… BOOM… ROAR', todo: 'Everyone shoots it. Keep moving, never get cornered.', pose: 'guard' },
      { id: 'witch', name: 'Witch', cast: 'sage', tint: '#d9d3e6', sc: .95, hear: 'a woman sobbing in the dark', glyph: 'sob… sob… sniff', todo: 'Torches off. Go round. Do not startle her.', pose: 'crouch' }];
    const SOUND = {
      hunter() { SCN.tone({ f: 90, dur: .5, type: 'sawtooth', vol: .1, vib: 18 }); SCN.tone({ f: 1500, f2: 600, dur: .5, type: 'sawtooth', vol: .1, at: .7 }); },
      smoker() { [0, .28, .52].forEach(a => SCN.noise({ dur: .12, cut: 900, vol: .3, at: a })); SCN.noise({ dur: .6, cut: 2400, filter: 'bandpass', vol: .1, at: .8 }); },
      boomer() { [0, .35, .8].forEach((a, i) => SCN.tone({ f: 120 - i * 20, f2: 60, dur: .3, type: 'square', vol: .1, vib: 9, at: a })); },
      tank() { [0, .45, .9].forEach(a => { SCN.tone({ f: 55, f2: 35, dur: .3, type: 'sine', vol: .35, at: a }); SCN.noise({ dur: .15, cut: 200, vol: .3, at: a }); }); SCN.tone({ f: 140, f2: 70, dur: .8, type: 'sawtooth', vol: .14, at: 1.2, vib: 12 }); },
      witch() { [0, .5, 1].forEach(a => SCN.tone({ f: 620, f2: 440, dur: .35, type: 'sine', vol: .1, vib: 7, at: a })); },
    };
    let z, order = [0, 1, 2, 3, 4];
    function cue(i) { z.cur = i; z.ph = 'hear'; z.pt = 0; z.guess = null; z.x = 900; SOUND[SP[i].id](); z.heardAt = z.t; }
    function next() { const r = SCN.rng((z.n + 1) * 977 + 5)(); let i = Math.floor(r * 5); if (i === z.cur) i = (i + 1) % 5; z.n++; cue(i); }
    function guess(i) { if (z.ph !== 'hear' || z.cur < 0) return; z.guess = i; z.asked++; if (i === z.cur) { z.right++; z.known[i] = true; } z.ph = 'show'; z.pt = 0; }
    const api = {
      dur: 30,
      reset(tour) { z = { t: 0, cur: -1, ph: 'idle', pt: 0, guess: null, x: 900, n: 0, asked: 0, right: 0, known: {}, quiz: !tour, heardAt: 0, lead: 0 }; if (!tour) next(); },
      step(h) {
        z.t += h; z.pt += h;
        if (z.ph === 'hear' && z.pt > 1.9 && Math.floor(z.pt / 1.9) !== Math.floor((z.pt - h) / 1.9)) SOUND[SP[z.cur].id]();
        if (z.ph === 'hear' && !z.quiz && z.pt > 2.6) { z.ph = 'show'; z.pt = 0; z.known[z.cur] = true; }
        if (z.ph === 'show') { const tx = SP[z.cur].id === 'witch' ? 700 : 560; if (z.x > tx) z.x = Math.max(tx, z.x - 150 * h); if (z.x < 660 && !z.lead) z.lead = z.t - z.heardAt; if (z.quiz && z.pt > 4.2) next(); }
      },
      script: [0, 1, 2, 3, 4].map(i => [.6 + i * 5.6, () => cue(i)]),
      caption: t => t < 5.6 ? 'Pip can see as far as his torch. Past that it is dark, but it is not silent. A growl and a shriek: that is a Hunter, before anyone has seen it.'
        : t < 11.8 ? 'A hacking cough means a Smoker. Each special infected has one sound that belongs to nothing else in the game.'
        : t < 17.4 ? 'Gurgling means a Boomer, and the right answer to a Boomer is different: back away before you shoot.'
        : t < 23 ? 'The Tank even brings its own music. The sound names the threat, and the name tells the team what to do.'
        : 'The Witch is the reverse: her crying is a warning to go quiet. Five sounds, five different plans, all chosen before anything is on screen.',
      status: () => z.ph === 'hear' ? 'Something is out there. Which one is it? Answer from the sound alone.' : z.guess == null ? 'Press a name when you hear the next one.' : z.guess === z.cur ? `Yes: ${SP[z.cur].name}. ${SP[z.cur].todo}` : `That was the ${SP[z.cur].name}, not the ${SP[z.guess].name}. ${SP[z.cur].todo}`,
      stats: () => `<div class="g"><b>${z.lead ? z.lead.toFixed(1) + 's' : 'n/a'}</b><span>from first hearing it to first seeing it</span></div>` + (z.quiz ? `<div><b>${z.right} / ${z.asked}</b><span>named from the sound alone</span></div>` : `<div><b>${Object.keys(z.known).length} / 5</b><span>special infected introduced</span></div>`),
      acts: Object.fromEntries(SP.map((p, i) => ['g' + i, () => guess(i)])), keys: { 1: 'g0', 2: 'g1', 3: 'g2', 4: 'g3', 5: 'g4' },
      draw(g) {
        g.clearRect(0, 0, W, H); g.save(); SCN.clipStage(g, W, H);
        g.fillStyle = '#10131f'; g.fillRect(0, 0, W, FLOOR + 40);
        g.fillStyle = '#1a2032'; for (let i = 0; i < 7; i++) { g.fillRect(40 + i * 150, 70, 90, 150); } g.fillStyle = '#0b0d16'; for (let i = 0; i < 7; i++) g.fillRect(52 + i * 150, 82, 66, 126);
        g.fillStyle = '#232a3d'; g.fillRect(0, FLOOR, W, 40); g.fillStyle = '#2f3850'; g.fillRect(0, FLOOR, W, 4);
        const sp = z.cur >= 0 ? SP[z.cur] : null;
        // the special, drawn before the torch light so the dark hides it
        if (sp && z.ph === 'show') { const pose = sp.id === 'witch' || (sp.id === 'hunter' && z.x > 562) ? 'crouch' : z.x > 562 ? CAST.cycle('walk', z.t * (sp.id === 'tank' ? .8 : 1.2)) : sp.pose; CAST.draw(g, sp.cast, { x: z.x, y: FLOOR, face: -1, pose, s: sp.sc, tint: sp.tint, weapon: sp.id === 'tank' || sp.id === 'hunter' ? 'claws' : null }); if (sp.id === 'smoker' && z.x <= 562) { g.strokeStyle = '#c96a7a'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(z.x - 10, FLOOR - 118); g.quadraticCurveTo(450, FLOOR - 150 + Math.sin(z.t * 6) * 10, 300, FLOOR - 90); g.stroke(); } }
        // darkness with a torch cone cut out of it
        g.save(); g.fillStyle = 'rgba(4,5,10,.93)'; g.beginPath(); g.rect(0, 0, W, FLOOR + 40); g.moveTo(240, FLOOR - 92); g.lineTo(650, FLOOR - 215); g.lineTo(650, FLOOR + 40); g.lineTo(240, FLOOR + 40); g.closePath(); g.fill('evenodd');
        const cone = g.createLinearGradient(240, 0, 650, 0); cone.addColorStop(0, 'rgba(255,240,190,.20)'); cone.addColorStop(1, 'rgba(255,240,190,0)'); g.fillStyle = cone; g.beginPath(); g.moveTo(240, FLOOR - 92); g.lineTo(650, FLOOR - 215); g.lineTo(650, FLOOR + 40); g.lineTo(240, FLOOR + 40); g.fill(); g.restore();
        g.strokeStyle = 'rgba(255,240,190,.5)'; g.setLineDash([4, 8]); g.lineWidth = 2; g.beginPath(); g.moveTo(650, 40); g.lineTo(650, FLOOR + 36); g.stroke(); g.setLineDash([]); txt(g, 'as far as the torch reaches', 644, 30, { size: 13, w: 700, col: 'rgba(255,240,190,.7)', align: 'right' });
        CAST.draw(g, 'pip', { x: 200, y: FLOOR, pose: z.ph === 'hear' ? 'guard' : 'aim', weapon: null }); CAST.draw(g, 'kit', { x: 120, y: FLOOR, pose: 'guard', s: .95 });
        // the sound in the dark
        if (sp && z.ph === 'hear') { const sx = 860; for (let i = 0; i < 4; i++) { const r = ((z.pt * 180 + i * 90) % 360); g.strokeStyle = `rgba(255,185,81,${.7 * (1 - r / 360)})`; g.lineWidth = 4; g.beginPath(); g.arc(sx, FLOOR - 100, 30 + r, Math.PI * .72, Math.PI * 1.28); g.stroke(); }
          txt(g, '?', sx, FLOOR - 100, { size: 80, w: 800, col: 'rgba(255,255,255,.16)', align: 'center', display: true });
          txt(g, sp.glyph, 720, 78, { size: 30, w: 800, col: C.gold, align: 'center', display: true }); txt(g, 'you hear: ' + sp.hear, 720, 112, { size: 16, w: 700, col: '#e9e2cf', align: 'center' }); }
        if (sp && z.ph === 'show') { const ok = z.guess == null || z.guess === z.cur; pill(g, sp.name.toUpperCase(), clamp(z.x, 560, 900), FLOOR - 190 * sp.sc - 8, { size: 18, w: 800, fill: ok ? C.green : C.red, display: true }); txt(g, sp.todo, 820, 40, { size: 16, w: 700, col: '#e9e2cf', align: 'center' }); }
        // the five cards
        g.fillStyle = 'rgba(255,252,244,.97)'; g.fillRect(0, FLOOR + 40, W, H);
        SP.forEach((p, i) => { const x = 16 + i * 203, y = FLOOR + 54, on = z.cur === i && (z.ph === 'show' || !z.quiz), known = !z.quiz || z.known[i];
          box(g, x, y, 195, H - y - 14, { r: 12, fill: on ? '#fff4d6' : '#fffaf0', stroke: on ? C.gold : C.line, lw: on ? 4 : 2 });
          g.save(); g.beginPath(); g.rect(x, y, 195, H - y - 14); g.clip(); if (known) CAST.draw(g, p.cast, { x: x + 44, y: y + 122, s: .62 * Math.min(p.sc, 1.25), pose: p.id === 'witch' || p.id === 'hunter' ? 'crouch' : 'idle', tint: p.tint, weapon: p.id === 'tank' || p.id === 'hunter' ? 'claws' : null, shadow: false }); else txt(g, '?', x + 44, y + 80, { size: 54, w: 800, col: '#d5cbb4', align: 'center', display: true }); g.restore();
          txt(g, (i + 1) + '  ' + p.name, x + 88, y + 24, { size: 18, w: 800, display: true });
          if (known) { wrap(g, p.hear, x + 88, y + 52, 100, { size: 13.5, w: 700, col: '#a0530a', lh: 16 }); wrap(g, p.todo, x + 12, y + 148, 174, { size: 13, w: 600, col: C.ink, lh: 16 }); }
          else wrap(g, 'name it from its sound to fill this in', x + 88, y + 52, 100, { size: 13, w: 600, col: C.muted, lh: 16 }); });
        g.restore();
      },
    };
    return api;
  });

  /* ---------------- Counter-Strike: footsteps cost speed ---------------- */
  SCN.run('steps', s => {
    const FLOOR = 300, X0 = 70, RX = 900, EAR = 480, RUN = 170, WALK = RUN * .52;
    let z, limit = 14, plan = 'run';
    const PLANS = { run: 'Run all the way', walk: 'Walk all the way', mix: 'Run, then walk the last stretch' };
    const start = () => { Object.assign(z, { x: X0, rt: 0, heard: false, heardAt: 0, done: '', mode: 'stop', rings: [], stepT: 0, after: 0 }); };
    const api = {
      dur: 36,
      reset(tour) { if (tour) { limit = 14; plan = 'run'; api.mark('limit', 14); api.mark('plan', plan); } z = { t: 0, log: {}, auto: true, run: false, walk: false }; start(); },
      step(h) {
        z.t += h; z.rings = z.rings.filter(r => (r.t += h) < .9);
        if (z.done) { z.after += h; if (z.after > 2.6 && z.auto) start(); return; }
        const mode = z.auto ? (plan === 'run' ? 'run' : plan === 'walk' ? 'walk' : z.x < EAR - 6 ? 'run' : 'walk') : z.run ? 'run' : z.walk ? 'walk' : 'stop'; z.mode = mode;
        if (mode !== 'stop' || z.rt > 0) z.rt += h;
        z.x += (mode === 'run' ? RUN : mode === 'walk' ? WALK : 0) * h;
        if (mode !== 'stop') { z.stepT -= h; if (z.stepT <= 0) { z.stepT = mode === 'run' ? .3 : .55; z.rings.push({ x: z.x, t: 0, loud: mode === 'run' }); if (mode === 'run') SCN.noise({ dur: .07, cut: 700, vol: .28 }); else SCN.noise({ dur: .04, cut: 300, vol: .02 }); } }
        if (mode === 'run' && z.x > EAR && !z.heard) { z.heard = true; z.heardAt = z.rt; SCN.tone({ f: 880, dur: .12, vol: .1 }); }
        const end = r => { z.done = r; z.after = 0; z.log[z.auto ? plan : 'you'] = { t: z.rt, r, limit }; };
        if (z.rt > limit) end('time'); else if (z.x >= RX - 120) { end(z.heard ? 'shot' : 'won'); SCN.noise({ dur: .12, cut: 2500, vol: .3 }); }
      },
      script: [[9, () => { plan = 'walk'; api.mark('plan', plan); start(); }], [19.5, () => { limit = 7; api.mark('limit', 7); start(); }], [28, () => { plan = 'mix'; api.mark('plan', plan); start(); }]],
      caption: t => t < 9 ? 'Pip has to cross to the site that Rook is holding. Running gets there in under five seconds, but every footstep is loud, and Rook turns to face the door.'
        : t < 19.5 ? 'Walking makes no sound at all, so Rook is still watching the other way. It is also roughly half the speed.'
        : t < 28 ? 'So silence is paid for in time. Shorten the round clock and walking the whole way no longer arrives.'
        : 'The skilled answer is to spend noise where nobody can hear it: run the far stretch, walk the last one. Sound has become a resource to budget.',
      status: () => z.done === 'shot' ? 'Rook heard the steps and was aiming at the door when Pip came through.' : z.done === 'won' ? 'Rook never heard a thing. Pip arrives behind him.' : z.done === 'time' ? 'Out of time. Silence costs seconds, and this round did not have them.' : z.auto ? PLANS[plan] + '. Rook hears running anywhere past the marker.' : 'Hold D to run, hold S to walk. Rook hears running anywhere past the marker.',
      stats: () => `<div class="${z.heard ? 'r' : 'g'}"><b>${z.heard ? 'heard' : 'unheard'}</b><span>${z.heard ? 'Rook turned at ' + z.heardAt.toFixed(1) + ' s' : 'Rook is watching the other door'}</span></div><div class="${z.rt > limit - 2 ? 'r' : ''}"><b>${Math.max(0, limit - z.rt).toFixed(1)} s</b><span>left on the round clock</span></div><div class="y"><b>${Math.round(WALK / RUN * 100)}%</b><span>walking speed, as a share of running</span></div>`,
      acts: { run(v) { z.auto = false; z.run = !!v; if (v && z.done) start(); }, walk(v) { z.auto = false; z.walk = !!v; if (v && z.done) start(); } }, holds: { d: 'run', s: 'walk' },
      set(k, v) { if (k === 'limit') limit = +v; if (k === 'plan') plan = v; },
      draw(g) {
        g.clearRect(0, 0, W, H); g.save(); SCN.clipStage(g, W, H);
        g.fillStyle = '#e9d9b5'; g.fillRect(0, 0, W, FLOOR); g.fillStyle = '#d9c79d'; for (let i = 0; i < 6; i++) g.fillRect(i * 190 + 20, 96, 120, 8);
        g.fillStyle = 'rgba(229,50,45,.10)'; g.fillRect(EAR, 60, RX - EAR + 140, FLOOR - 60);
        g.fillStyle = '#b89c6b'; g.fillRect(0, FLOOR, W, 36); g.fillStyle = '#9a7f52'; g.fillRect(0, FLOOR, W, 4);
        g.strokeStyle = C.red; g.setLineDash([6, 6]); g.lineWidth = 3; g.beginPath(); g.moveTo(EAR, 60); g.lineTo(EAR, FLOOR + 30); g.stroke(); g.setLineDash([]);
        txt(g, 'Rook can hear running from here on', EAR + 10, 74, { size: 14, w: 800, col: C.red }); txt(g, 'too far away to be heard', EAR - 10, 74, { size: 14, w: 700, col: '#7c6a45', align: 'right' });
        // crates: Rook's cover and the door he watches
        g.fillStyle = '#8c6b3e'; g.fillRect(RX - 46, FLOOR - 62, 40, 62); g.fillStyle = '#6f5330'; g.fillRect(RX - 46, FLOOR - 62, 40, 5); g.fillStyle = '#5b6a7a'; g.fillRect(W - 26, FLOOR - 150, 14, 150); txt(g, 'other door', W - 12, FLOOR + 20, { size: 12, w: 800, col: '#fff', align: 'right' });
        // round clock
        box(g, 20, 14, 330, 34, { r: 8, fill: '#152044' }); txt(g, 'ROUND', 34, 32, { size: 13, w: 800, col: '#9fb0e6' }); bar(g, 96, 24, 170, 14, 1 - z.rt / limit, { col: z.rt > limit - 2 ? C.red : C.gold, back: 'rgba(255,255,255,.15)', stroke: null }); txt(g, Math.max(0, limit - z.rt).toFixed(1) + ' s', 338, 32, { size: 16, w: 800, col: '#fff', align: 'right', display: true });
        z.rings.forEach(r => { if (r.loud) { ring(g, r.x, FLOOR - 4, 20 + r.t * 420, C.red, 4, .55 * (1 - r.t / .9)); } else ring(g, r.x, FLOOR - 4, 6 + r.t * 16, '#7c6a45', 2, .5 * (1 - r.t / .9)); });
        const pd = z.done === 'shot', rd = z.done === 'won';
        CAST.draw(g, 'rook', { x: RX, y: FLOOR, face: z.heard ? -1 : 1, pose: rd ? 'down' : z.heard ? 'aim' : 'guard', weapon: rd ? null : 'bow' });
        if (z.heard && !rd) { txt(g, '!', RX, FLOOR - 156, { size: 40, w: 800, col: C.red, align: 'center', display: true }); if (!pd) { g.strokeStyle = 'rgba(229,50,45,.6)'; g.setLineDash([3, 7]); g.lineWidth = 2; g.beginPath(); g.moveTo(RX - 40, FLOOR - 96); g.lineTo(z.x + 20, FLOOR - 90); g.stroke(); g.setLineDash([]); } }
        else if (!rd) txt(g, 'watching the other door', RX, FLOOR - 150, { size: 13, w: 700, col: '#7c6a45', align: 'center' });
        CAST.draw(g, 'pip', { x: z.x + (pd ? -50 : z.done === 'won' ? 50 : 0), y: FLOOR, pose: pd ? 'down' : z.done === 'won' ? 'strike' : z.mode === 'run' ? CAST.cycle('run', z.t * 1.7) : z.mode === 'walk' ? CAST.cycle('walk', z.t * 1.1) : 'guard', weapon: 'dagger' });
        if (!z.done && z.mode !== 'stop') pill(g, z.mode === 'run' ? 'RUNNING: loud' : 'WALKING: silent', clamp(z.x, 100, 800), FLOOR - 162, { size: 14, w: 800, fill: z.mode === 'run' ? C.red : '#5d6b4a' });
        if (z.done) { const m = { shot: ['HEARD, AND SHOT AT THE DOOR', C.red], won: ['ARRIVED UNHEARD', C.green], time: ['OUT OF TIME', '#b26a00'] }[z.done]; pill(g, m[0], 520, 130, { size: 22, w: 800, fill: m[1], display: true }); }
        // the three plans, filled in as they are tried
        g.fillStyle = 'rgba(255,252,244,.97)'; g.fillRect(0, FLOOR + 36, W, H);
        const y0 = FLOOR + 62, sx = 300, sw = 520, tmax = 14;
        txt(g, 'the plan', 24, y0, { size: 13, w: 800, col: C.muted }); txt(g, 'seconds to reach the site', sx, y0, { size: 13, w: 800, col: C.muted }); txt(g, 'result', sx + sw + 30, y0, { size: 13, w: 800, col: C.muted });
        const lx = sx + sw * limit / tmax;
        [['run', PLANS.run], ['walk', PLANS.walk], ['mix', PLANS.mix], ['you', 'Your own route']].forEach(([k, name], i) => { const y = y0 + 34 + i * 44, L = z.log[k], live = !z.done && (z.auto ? plan === k : k === 'you');
          if (live || (z.done && (z.auto ? plan : 'you') === k)) box(g, 14, y - 19, 1012, 38, { r: 8, fill: 'rgba(255,185,81,.2)' });
          txt(g, name, 24, y, { size: 16, w: 800 }); box(g, sx, y - 9, sw, 18, { r: 4, fill: 'rgba(20,26,54,.1)' });
          const tt = live ? z.rt : L ? L.t : 0, r = live ? '' : L ? L.r : ''; if (tt) box(g, sx, y - 9, sw * Math.min(tt, tmax) / tmax, 18, { r: 4, fill: r === 'won' ? C.green : r === 'shot' ? C.red : r === 'time' ? '#b26a00' : C.blue });
          if (tt) txt(g, tt.toFixed(1) + ' s', sx + sw * Math.min(tt, tmax) / tmax + 8, y, { size: 14, w: 800 });
          txt(g, r === 'won' ? 'unheard' : r === 'shot' ? 'heard' : r === 'time' ? 'too slow' : live ? '…' : 'not tried', sx + sw + 30, y, { size: 15, w: 800, col: r === 'won' ? C.green : r === 'shot' ? C.red : r === 'time' ? '#b26a00' : C.muted }); });
        g.strokeStyle = C.navy; g.lineWidth = 3; g.beginPath(); g.moveTo(lx, y0 + 12); g.lineTo(lx, y0 + 192); g.stroke(); txt(g, 'round ends', lx, y0 + 204, { size: 12, w: 800, col: C.navy, align: 'center' });
        g.restore();
      },
    };
    return api;
  });
})();
