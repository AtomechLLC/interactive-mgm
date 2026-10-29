// Resource Variety: health, mana and gold drawn as themed vessels (slide 1), then six more resource types as mini meters (slide 2). Static: no demo hooks.
(() => {
  const NAVY = '#1b2148';
  const POOLS = [
    { key: 'hp', name: 'Health', icon: 'inv_potion_54', val: '58 / 100', spent: 'spent by taking hits', fill: .58, top: '#ff7a63', bot: '#c9271c', foam: '#ffb2a4' },
    { key: 'mp', name: 'Mana', icon: 'inv_potion_137', val: '58 / 100', spent: 'spent by casting spells', fill: .58, top: '#6fb8ff', bot: '#2346c9', foam: '#bfe2ff' },
    { key: 'gold', name: 'Gold', icon: 'inv_misc_coin_02', val: '580 / 1,000', spent: 'spent at the merchant', fill: .58, coins: true },
  ];

  // one glass tube; w x h in svg units, the liquid level is p.fill of the inside
  function vessel(p, w, h) {
    const id = p.key + Math.random().toString(36).slice(2, 7);
    const r = w * .22, ix = 10, iy = 10, iw = w - 20, ih = h - 20;
    const lvl = iy + ih * (1 - p.fill);
    let inner;
    if (p.coins) {
      // a stack of coins seen from the side, each a short gold cylinder
      const ch = Math.max(12, ih / 20), cw = iw * .74, cx = ix + (iw - cw) / 2;
      let s = '';
      for (let y = iy + ih - ch, i = 0; y >= lvl - 1; y -= ch * .78, i++) {
        const dx = ((i * 37) % 5 - 2) * iw * .01;
        s += `<rect x="${cx + dx}" y="${y}" width="${cw}" height="${ch}" rx="${ch / 2}" fill="url(#cg${id})" stroke="#8a5a00" stroke-width="1.6"/>`;
        s += `<rect x="${cx + dx + cw * .1}" y="${y + ch * .22}" width="${cw * .8}" height="${ch * .16}" rx="${ch * .08}" fill="#fff3b8" opacity=".55"/>`;
      }
      // loose coins on top
      s += `<ellipse cx="${ix + iw * .34}" cy="${lvl - ch * .25}" rx="${iw * .2}" ry="${ch * .55}" fill="#ffd24a" stroke="#8a5a00" stroke-width="1.6"/>`;
      s += `<ellipse cx="${ix + iw * .68}" cy="${lvl - ch * .55}" rx="${iw * .17}" ry="${ch * .48}" fill="#ffe27a" stroke="#8a5a00" stroke-width="1.6"/>`;
      inner = s;
    } else {
      const amp = ih * .012, n = 4;
      let wave = `M${ix} ${lvl}`;
      for (let i = 0; i < n; i++) {
        const x0 = ix + iw * i / n, x1 = ix + iw * (i + .5) / n, x2 = ix + iw * (i + 1) / n;
        wave += ` Q${x1} ${lvl + (i % 2 ? amp : -amp) * 2} ${x2} ${lvl}`;
      }
      const body = wave + ` L${ix + iw} ${iy + ih} L${ix} ${iy + ih} Z`;
      let bub = '';
      [[.3, .82, .035], [.62, .7, .025], [.45, .9, .02], [.7, .88, .04], [.24, .66, .02], [.55, .78, .015]].forEach(([bx, by, br]) => {
        const y = lvl + (iy + ih - lvl) * (by - .55) / .45;
        bub += `<circle cx="${ix + iw * bx}" cy="${y}" r="${iw * br}" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="2"/>`;
      });
      inner = `<path d="${body}" fill="url(#lg${id})"/><path d="${wave}" fill="none" stroke="${p.foam}" stroke-width="4" stroke-linecap="round"/>${bub}`;
    }
    const ticks = [.25, .5, .75].map(t => {
      const y = iy + ih * (1 - t);
      return `<line x1="${ix + iw - iw * .2}" y1="${y}" x2="${ix + iw - 2}" y2="${y}" stroke="${NAVY}" stroke-opacity=".35" stroke-width="3" stroke-linecap="round"/>`;
    }).join('');
    return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" class="rv-tube">
      <defs>
        <clipPath id="cl${id}"><rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" rx="${r - 8}"/></clipPath>
        <linearGradient id="lg${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.top}"/><stop offset="1" stop-color="${p.bot}"/></linearGradient>
        <linearGradient id="cg${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe680"/><stop offset=".55" stop-color="#f2b31a"/><stop offset="1" stop-color="#c47f00"/></linearGradient>
        <linearGradient id="gl${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#eef1fb"/><stop offset=".5" stop-color="#ffffff"/><stop offset="1" stop-color="#e6e9f5"/></linearGradient>
      </defs>
      <rect x="4" y="4" width="${w - 8}" height="${h - 8}" rx="${r}" fill="url(#gl${id})" stroke="${NAVY}" stroke-width="6"/>
      <g clip-path="url(#cl${id})">${inner}</g>
      ${ticks}
      <rect x="${ix + iw * .1}" y="${iy + ih * .06}" width="${iw * .1}" height="${ih * .86}" rx="${iw * .05}" fill="#fff" opacity=".55"/>
    </svg>`;
  }

  document.querySelectorAll('[data-trio]').forEach(el => {
    const big = el.dataset.trio === 'big';
    const [w, h] = big ? [176, 420] : [66, 190];
    el.innerHTML = POOLS.map(p => `<div class="rv-pool ${p.key}">
      <img class="rv-ic" src="../img/${p.icon}.jpg" alt="">
      ${vessel(p, w, h)}
      <b>${p.name}</b>
      ${big ? `<span class="rv-val">${p.val}</span><small>${p.spent}</small>` : ''}
    </div>`).join('');
  });

  // six more resource types, each drawn as the meter that game genre uses
  const seg = (n, full, part) => `<div class="m-seg">${Array.from({ length: n }, (_, i) => `<i style="--f:${i < full ? 1 : i === full ? part : 0}"></i>`).join('')}</div>`;
  const MORE = [
    { icon: 'ability_warrior_rampage', name: 'Super Meters', meter: seg(3, 2, .4) + '<span class="m-num">2 <em>of 3 stocks</em></span>', note: 'filled by landing hits, spent on supers' },
    { icon: 'spell_nature_timestop', name: 'Cooldowns', meter: `<div class="m-cd"><img src="../img/spell_fire_fireball.jpg" alt=""><svg viewBox="0 0 100 100"><path d="M50 50 L50 0 A50 50 0 1 1 ${50 - 50 * Math.sin(2 * Math.PI * .35)} ${50 - 50 * Math.cos(2 * Math.PI * .35)} Z" fill="#0b1030" fill-opacity=".62"/></svg><span>8</span></div><span class="m-num">8 s <em>until ready</em></span>`, note: 'time refills it, the ability spends it' },
    { icon: 'wow_token01', name: 'Real Currency', meter: '<span class="m-big">1,250</span><span class="m-num"><em>shop coins</em></span>', note: 'bought with money, spent in the store' },
    { icon: 'inv_misc_ticket_tarot_madness', name: 'Cards', meter: `<div class="m-hand">${['inv_inscription_tarot_volcanocard', 'inv_misc_ticket_tarot_madness', 'inv_inscription_tarot_volcanocard', 'inv_misc_ticket_tarot_madness', 'inv_inscription_tarot_volcanocard'].map((c, i) => `<img src="../img/${c}.jpg" style="--i:${i - 2}" alt="">`).join('')}</div><span class="m-num">5 <em>of 7 in hand</em></span>`, note: 'drawn each turn, played to act' },
    { icon: 'inv_potion_131', name: 'Potions', meter: `<div class="m-pots"><img src="../img/inv_potion_54.jpg" alt=""><img src="../img/inv_potion_54.jpg" alt=""><img class="used" src="../img/inv_potion_54.jpg" alt=""></div><span class="m-num">2 <em>of 3 charges</em></span>`, note: 'refilled at a checkpoint, drunk to heal' },
    { icon: 'inv_chest_plate16', name: 'Equipment Durability', meter: '<div class="m-bar"><i style="--f:.34"></i></div><span class="m-num">34 <em>/ 100</em></span>', note: 'worn down by hits, restored by a repair' },
  ];
  const grid = document.querySelector('.rv-grid');
  if (grid) grid.innerHTML = MORE.map(m => `<div class="rv-tile">
    <div class="rv-th"><img src="../img/${m.icon}.jpg" alt=""><b>${m.name}</b></div>
    <div class="rv-meter">${m.meter}</div>
    <small>${m.note}</small>
  </div>`).join('');
})();
