/* Your Blind Spots (replanned page for "All The Games I've Played Before"; Scripture: Study All Games, Five Types of Player Skills).
   Sixty well-known games, five per genre. Each carries the two skill types it leans on most: P physical execution,
   D decision making, X processing, K knowledge, F freeform. The tags are this page's reading. The learner's ticks are the
   only data; the three suggestions are the unplayed games that add most to their thinnest genres and skill types. */
(function () {
  const C = TD.C;
  const SK = { P: ['Physical Execution', '#2ea3dc'], D: ['Decision Making', '#e5322d'], X: ['Processing', '#8a4fd6'], K: ['Knowledge', '#2fae63'], F: ['Freeform', '#e0a92d'] };
  const G = [
    ['Platformers', 'Super Mario:PK,Celeste:PX,Hollow Knight:PK,Super Meat Boy:PD,Astro Bot:PK'],
    ['Shooters', 'Counter-Strike:PD,Halo:PD,DOOM:PX,Valorant:PD,Call of Duty:PD'],
    ['Action', 'Dark Souls:DK,Devil May Cry:PF,God of War:PD,Monster Hunter:KD,Sekiro:PD'],
    ['RPGs', 'Final Fantasy VII:KX,Baldur\'s Gate 3:FK,Pokémon:KX,Skyrim:KF,Warcraft (WoW):KD'],
    ['Strategy', 'StarCraft II:XP,Civilization:XK,XCOM:XD,Into the Breach:XD,Age of Empires:XK'],
    ['Puzzle', 'Tetris:XP,Portal:XK,Baba Is You:XF,The Witness:XK,Candy Crush:XD'],
    ['Adventure & story', 'Monkey Island:KF,Disco Elysium:FK,Ace Attorney:KX,Life is Strange:FD,Outer Wilds:KX'],
    ['Roguelikes & cards', 'Slay the Spire:XK,Hades:PD,Balatro:XK,Spelunky:DP,MTG Arena:XK'],
    ['Sims & builders', 'Minecraft:FK,SimCity:XF,Factorio:XF,The Sims:FK,Stardew Valley:KF'],
    ['Racing & sports', 'Mario Kart:PD,Rocket League:PD,EA FC / FIFA:DP,Gran Turismo:PK,Tony Hawk\'s:PX'],
    ['Party & social', 'Among Us:FD,Jackbox:FK,Overcooked:FP,Mario Party:FD,Tabletop D&D:FK'],
    ['Fighting & rhythm', 'Street Fighter:DP,Smash Bros.:PD,Beat Saber:PX,Guitar Hero:PK,osu!:PX'],
  ];
  const GAMES = []; G.forEach(([genre, list], gi) => list.split(',').forEach((s, j) => { const k = s.lastIndexOf(':'); GAMES.push({ id: GAMES.length, n: s.slice(0, k), a: s[k + 1], b: s[k + 2], gi, j }); }));
  const MAXS = {}; Object.keys(SK).forEach(k => MAXS[k] = GAMES.reduce((t, q) => t + (q.a === k ? 2 : q.b === k ? 1 : 0), 0));
  const mine = new Set();
  // a clustered history for the walk-through: the shooters, action games and RPGs many players grew up on
  const TOURPICK = [5, 6, 9, 7, 10, 12, 14, 16, 18, 19, 0, 45, 40, 26, 8, 11, 36, 55, 17, 13];
  function cover(set) {
    const sk = {}; Object.keys(SK).forEach(k => sk[k] = 0); const gen = G.map(() => 0);
    set.forEach(id => { const q = GAMES[id]; sk[q.a] += 2; sk[q.b] += 1; gen[q.gi]++; });
    Object.keys(sk).forEach(k => sk[k] /= MAXS[k]); return { sk, gen };
  }
  function suggest(set) {
    const s = new Set(set), out = [];
    for (let n = 0; n < 3; n++) {
      const c = cover(s); let best = null, bs = -1;
      GAMES.forEach(q => { if (s.has(q.id)) return; const sc = (1 - c.gen[q.gi] / 5) * 1.2 + (c.gen[q.gi] === 0 ? .6 : 0) + (1 - c.sk[q.a]) + (1 - c.sk[q.b]) * .5; if (sc > bs) { bs = sc; best = q; } });
      if (!best) break; out.push(best); s.add(best.id);
    }
    return out;
  }

  PLAY.game('blind', {
    dur: 34, clickStarts: true,
    init(o, live) { return { live, t: 0, set: live ? mine : new Set(), k: 0 }; },
    step(st, inp, dt) {
      st.t += dt;
      if (typeof inp.click === 'number') { st.set.has(inp.click) ? st.set.delete(inp.click) : st.set.add(inp.click); if (st.live) PLAY.beep(st.set.has(inp.click) ? 760 : 420, .05, .08); }
      if (inp.click === 'clear') st.set.clear();
    },
    bot(st) { const due = 1 + st.k * 1.2; if (st.k < TOURPICK.length && st.t >= due) return { down: {}, press: {}, click: TOURPICK[st.k++] }; return null; },
    draw(g, st, ui, live) {
      GK.panel(g);
      const LX = 20, LBL = 140, CW = 119, RH = 42, TY = 50, c = cover(st.set);
      GK.head(g, `Games played: ${st.set.size} of 60`, LX, 30, 'left', C.ink, 17);
      G.forEach(([genre], gi) => {
        const y = TY + gi * RH;
        GK.text(g, genre, LX, y + 22, c.gen[gi] ? C.ink : C.redDk, 12, 'left', 700);
        PLAY.bar(g, LX, y + 28, 110, 5, c.gen[gi] / 5, C.navy);
      });
      GAMES.forEach(q => {
        const x = LX + LBL + q.j * CW, y = TY + q.gi * RH, on = st.set.has(q.id);
        GK.box(g, x, y + 3, CW - 6, RH - 8, on ? C.navy : '#fffaf0', on ? C.navy : '#cdbf9f', 8, 1.5);
        GK.text(g, q.n, x + 8, y + 23, on ? '#fff' : C.ink, 11, 'left', 600);
        [q.a, q.b].forEach((k, i) => { g.fillStyle = SK[k][1]; g.beginPath(); g.arc(x + CW - 18 - i * 0, y + 14 + i * 11, i ? 3 : 4.5, 0, TD.TAU); g.fill(); });
        ui.hit(q.id, x, y + 3, CW - 6, RH - 8);
      });
      // right column: skill coverage, then three suggestions
      const RX = 770, RW = 250;
      GK.head(g, 'Skill types your history tests', RX, 30, 'left', C.ink, 15);
      const order = Object.keys(SK), low = order.slice().sort((a, b) => c.sk[a] - c.sk[b])[0];
      order.forEach((k, i) => {
        const y = 58 + i * 38; g.fillStyle = SK[k][1]; g.beginPath(); g.arc(RX + 6, y, 5, 0, TD.TAU); g.fill();
        GK.text(g, SK[k][0], RX + 18, y + 4, C.ink, 12, 'left', 700); GK.text(g, PLAY.pct(c.sk[k]), RX + RW, y + 4, C.ink, 13, 'right', 700);
        PLAY.bar(g, RX, y + 12, RW, 9, c.sk[k], SK[k][1]);
      });
      GK.text(g, 'share of the list\'s weight for that skill; big dot counts double', RX, 252, C.muted, 10, 'left', 500);
      const none = c.gen.filter(v => !v).length, sug = st.set.size >= 3 ? suggest(st.set) : [];
      GK.head(g, 'Three games for your gaps', RX, 292, 'left', C.ink, 15);
      if (!sug.length) PLAY.note(g, 'Pick at least three games you have played and the page will suggest three you have not.', RX, 314, RW);
      sug.forEach((q, i) => {
        const y = 308 + i * 70; GK.box(g, RX, y, RW, 60, '#fffaf0', '#cdbf9f', 10, 1.5);
        GK.text(g, q.n, RX + 12, y + 24, C.ink, 14, 'left', 800);
        GK.text(g, `${G[q.gi][0]} · ${SK[q.a][0]}`, RX + 12, y + 44, C.muted, 11, 'left', 600);
        g.fillStyle = SK[q.a][1]; g.beginPath(); g.arc(RX + RW - 16, y + 20, 6, 0, TD.TAU); g.fill();
      });
      if (live && st.set.size) ui.btn('clear', 'Clear my picks', RX, 530, 150, 34, { px: 12 });
      // side panel
      ui.stats(`<div><b>${st.set.size}</b><span>games played</span></div><div class="r"><b>${none}</b><span>genres with none</span></div><div><b style="font-size:17px">${st.set.size ? SK[low][0] : '–'}</b><span>the skill type your history tests least</span></div>`);
      const top = order.slice().sort((a, b) => c.sk[b] - c.sk[a])[0], who = live ? 'Your' : 'This scripted';
      ui.out(st.set.size < 3 ? (live ? 'Be strict: tick a game only if you could explain to someone what it does well.' : 'A scripted history, clustered the way many are: shooters, action games and RPGs first.')
        : `${who} history leans on ${SK[top][0]} (${PLAY.pct(c.sk[top])} of what the list offers) and is thinnest on ${SK[low][0]} (${PLAY.pct(c.sk[low])})${none ? `, with ${none} genre${none > 1 ? 's' : ''} untouched` : ''}. A designer reaches for the solutions they have played. The three on the right are where yours run out; the price is hours outside your favourite genre.`);
    },
  });
})();
