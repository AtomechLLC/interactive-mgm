/* Mario-style pixel sprites shared by PvE pages (MGM C4 M5): one character per pixel, '.' is empty.
   Original pixel shapes, copied from enemy-composer/composer.js (which keeps its own copy). Exposed as window.MARIO. */
(function () {
  const PAL = { R: '#d8322b', S: '#f2b98a', K: '#5a3216', B: '#2f56c9', Y: '#ffd23f', W: '#ffffff', G: '#3fa34d', g: '#226b2f',
    D: '#2a3566', L: '#7d93e0', O: '#ff8a1e', k: '#151515', r: '#8f1d18', N: '#a4552a', n: '#6e3414', w: '#b9bccb', P: '#e2603a', p: '#ffd7a8' };
  const HERO = [
    '...RRRR...', '..RRRRRRR.', '..KSSSSK..', '..SSkSkS..', '..SSSSSS..', '...SSSS...', '..RRBBRR..',
    '.RRBBBBRR.', '.SRBYYBRS.', '.S.BBBB.S.', '...BBBB...', '...B..B...', '..KK..KK..'];
  const HERO_STEP = HERO.slice(0, 11).concat(['....BB....', '...KKKK...']);
  const HERO_JUMP = HERO.slice(0, 7).concat(['SRRBBBBRRS', '..RBYYBR..', '...BBBB...', '...BBBB...', '..B....B..', '.KK....KK.']);
  const HERO_THROW = HERO.slice(0, 7).concat(['.RRBBBBRSS', '.SRBYYBR..']).concat(HERO.slice(9));
  const FIRE = ['.OYO.', 'OYYYO', 'YYWYY', 'OYYYO', '.OYO.'];
  const WING = ['..WW', '.WWW', 'WWWw', 'WWw.', 'Ww..'];
  const recolor = (rows, map) => rows.map(r => [...r].map(c => map[c] || c).join(''));
  const stepOf = (rows, a, b) => rows.slice(0, -1).concat([rows.at(-1).replace(a, b)]);

  const GOOMBA = ['....NNNN....', '..NNNNNNNN..', '.NNkWNNWkNN.', 'NNNkWNNWkNNN', 'NNNNNNNNNNNN', '.NNNNNNNNNN.', '...pppppp...', '..nnpppppp..', '.nnnn..pnnn.'];
  const GOOMBA_STEP = GOOMBA.slice(0, 7).concat(['..pppppnn...', '..nnn.nnnn..']);
  const KOOPA = ['.YY.........', 'YYWY........', 'YYkY........', '.YYY..GGGG..', '..YY.GgGGgG.', '..YYGGGGGGGG', '...YGgGGgGGG', '....WWWWWWWW', '.....YY..YY.', '.....YY..YY.'];
  const KOOPA_STEP = KOOPA.slice(0, 8).concat(['....YY...YY.', '....YY...YY.']);
  const RKOOPA = recolor(KOOPA, { G: 'R', g: 'r' }), RKOOPA_STEP = recolor(KOOPA_STEP, { G: 'R', g: 'r' });
  const SHELL_G = ['...GGGG...', '..GgGGgG..', '.GGGGGGGG.', 'GGgGGgGGGG', 'WWWWWWWWWW'];
  const SHELL_R = recolor(SHELL_G, { G: 'R', g: 'r' });
  const SPINY = ['...W...W...', '..WW.W.WW..', '.WRRWRWRRW.', '.RRRRRRRRR.', 'RRWRRRRWRRR', 'RRRRRRRRRRR', 'YkYWWWWWWW.', '.YY.YY.YY..'];
  const SPINY_STEP = SPINY.slice(0, 7).concat(['..YY.YY.YY.']);
  const BUZZY = ['...DDDDD...', '..DLLDDDD..', '.DLDDDDDDD.', '.DDDDDDDDDD', 'DDDDDDDDDDD', 'WWWWWWWWWWW', 'YkY........', '.YY..YY.YY.'];
  const BUZZY_STEP = BUZZY.slice(0, 7).concat(['..YY.YY..YY']);
  const SHELL_D = ['...DDDDD...', '..DLLDDDD..', '.DLDDDDDDD.', 'DDDDDDDDDDD', 'WWWWWWWWWWW'];
  const PIRANHA = ['..RRRRRR..', '.RRWRRWRR.', 'RRRRRRRRRR', 'RWkkkkkkWR', '.RWkkkkWR.', '..RRRRRR..', '....GG....', '.GG.GG.GG.', 'GGGgGGgGGG', '.GGGGGGGG.', '....GG....', '....GG....'];
  const PIRANHA_B = PIRANHA.slice(0, 2).concat(['RRRRRRRRRR', 'RRWkkkkWRR', '.RRWWWWRR.', '..RRRRRR..']).concat(PIRANHA.slice(6));
  const PODO = ['...OOOO...', '..OYYYYO..', '.OYWWWWYO.', 'OYWkWWkWYO', 'OYWWWWWWYO', '.OYWWWWYO.', '..OYYYYO..', '..R.OO.R..', '.R..RR..R.'];
  const PODO_B = PODO.slice(0, 7).concat(['.R.R..R.R.', 'R...RR...R']);
  const BLOOP = ['....ww....', '...wWWw...', '..wWWWWw..', '.wWWWWWWw.', '.wWkWWkWw.', '.wWkWWkWw.', '.wWWWWWWw.', '..wWWWWw..', '.w.w..w.w.', 'w..w..w..w', 'w.w....w.w'];
  const BLOOP_B = BLOOP.slice(0, 8).concat(['..ww..ww..', '..w.ww.w..', '.w..ww..w.']);
  const LAKITU = ['...GGGG...', '..GgGGgG..', '..SSSSSS..', '..SkSSkS..', '...SSSS...', '.wWWWWWWw.', 'wWWkWWkWWw', 'wWWWkkWWWw', '.wWWWWWWw.', '..ww.ww...'];
  const LAKITU_B = LAKITU.slice(0, 8).concat(['.wWWWWWWw.', '...ww.ww..']);
  const BOWSER = ['.....gg.........', '....gGGg..W.W...', '...GGGGGGWGWGW..', '..GGkGGGGGGGGGW.', '.OOGGGGGGGgGGGW.', 'OOOOGGGGGGGGGGW.', 'OkOOOOYYYGGGGW..',
    '.OO.OOYYYYGGG...', '....OYYYYYYGG...', '...OOYYYYYOO....', '..OO.OOOO.OO....', '.OO..O.....OO...'];
  const BOWSER_B = BOWSER.slice(0, 10).concat(['...OO.OO.OO.....', '..OO..O...OO....']);
  const BULLET = ['..kkkkkkk.w.', '.kkkkkkkkwW.', 'kkWWkkkkkwWw', 'kWWkkkkkkwWw', 'kkkkkkkkkwWw', '.kkkkkkkkwW.', '..kkkkkkk.w.'];
  const CHEEP = ['....GGG....', '..GGGGGGG.W', '.GWkGGGGGWW', 'GGkkGGgGGWW', 'WWWGGGGGGWW', '.WWWGGGGG.W', '...OO.OO...'];
  const CHEEP_B = CHEEP.slice(0, 6).concat(['..OO...OO..']);
  const MYST = ['...LLLLLL...', '..LLLLLLLL..', '.LLLkLLkLLL.', '.LLLkLLkLLL.', 'LLLLLLLLLLLL', 'LLLWWWWWWLLL', '.LLLLLLLLLL.', '..DD....DD..'];
  const MYST_B = MYST.slice(0, 7).concat(['...DD..DD...']);

  function spr(g, rows, x, foot, P, o = {}) {
    const w = rows[0].length, h = rows.length;
    g.save();
    g.translate(Math.round(x), Math.round(foot - h * P / 2));
    if (o.rot) g.rotate(o.rot);
    g.scale(o.flipX ? -1 : 1, o.flipY ? -1 : 1);
    if (o.sy) g.scale(1, o.sy);
    g.globalAlpha *= o.a ?? 1;
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
      const ch = rows[r][c]; if (ch === '.' || !ch) continue;
      g.fillStyle = o.tint && ch !== 'k' && ch !== 'W' ? o.tint : PAL[ch];
      g.fillRect(Math.round((c - w / 2) * P), Math.round((r - h / 2) * P), P, P);
    }
    g.restore();
  }
  window.MARIO = { PAL, spr, recolor, HERO, HERO_STEP, HERO_JUMP, HERO_THROW, FIRE, WING, GOOMBA, GOOMBA_STEP, KOOPA, KOOPA_STEP, RKOOPA, RKOOPA_STEP,
    SHELL_G, SHELL_R, SPINY, SPINY_STEP, BUZZY, BUZZY_STEP, SHELL_D, PIRANHA, PIRANHA_B, PODO, PODO_B, BLOOP, BLOOP_B, LAKITU, LAKITU_B,
    BOWSER, BOWSER_B, BULLET, CHEEP, CHEEP_B, MYST, MYST_B };
})();
