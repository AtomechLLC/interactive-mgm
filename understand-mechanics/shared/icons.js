/* Game icons for canvas pages: WoW spell and class icons (wow.zamimg.com) and game-icons.net glyphs (CC BY 3.0), saved in
   ../img/. Xelnath's standing rule: WoW, League and game-icons.net icons can be used anywhere in these interactives.
   ICON.draw(g, name, x, y, size) draws a framed square icon centred on x, y once it has loaded (nothing before that). */
(function () {
  const base = new URL('../img/', document.currentScript.src).href, cache = {};
  const FILE = {
    fireball: 'spell_fire_flamebolt.jpg', shadowbolt: 'spell_shadow_shadowbolt.jpg', lifetap: 'spell_shadow_burningspirit.jpg',
    mage: 'classicon_mage.jpg', warlock: 'classicon_warlock.jpg', priest: 'classicon_priest.jpg', warrior: 'classicon_warrior.jpg',
    heal: 'spell_holy_flashheal.jpg', potion: 'inv_potion_76.jpg', chaosbolt: 'ability_warlock_chaosbolt.jpg', lightning: 'spell_nature_lightning.jpg',
    incinerate: 'spell_fire_burnout.jpg', conflagrate: 'spell_fire_fireball.jpg', immolate: 'spell_fire_immolation.jpg', shadowburn: 'spell_shadow_scourgebuild.jpg',
    havoc: 'ability_warlock_baneofhavoc.jpg', darksoul: 'spell_warlock_demonsoul.jpg', backdraft: 'ability_warlock_backdraft.jpg', embers: 'ability_warlock_burningembers.jpg',
    fnb: 'ability_warlock_fireandbrimstone.jpg', embertap: 'inv_ember.jpg', chaoticenergy: 'spell_fire_felflamering.jpg', rainoffire: 'spell_shadow_rainoffire.jpg', emberstorm: 'spell_fire_moltenblood.jpg',
    key: 'gi-key.svg', lockpick: 'gi-lockpicks.svg', hammer: 'gi-claw-hammer.svg',
  };
  function img(name) {
    if (!cache[name]) { const i = new Image(); i.src = base + FILE[name]; cache[name] = i; }
    return cache[name].complete && cache[name].naturalWidth ? cache[name] : null;
  }
  Object.keys(FILE).forEach(img);
  function draw(g, name, x, y, s = 40, a = 1, frame = '#152044') {
    const i = img(name); if (!i || a <= 0) return;
    g.save(); g.globalAlpha *= a;
    g.fillStyle = frame; g.beginPath(); g.roundRect(x - s / 2 - 3, y - s / 2 - 3, s + 6, s + 6, 7); g.fill();
    g.beginPath(); g.roundRect(x - s / 2, y - s / 2, s, s, 5); g.clip(); g.drawImage(i, x - s / 2, y - s / 2, s, s);
    g.restore();
  }
  window.ICON = { draw, img, FILE };
})();
