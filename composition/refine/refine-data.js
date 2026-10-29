/* Refining the three abilities (MGM C4 M7, slides 109-141), as data the page's slides share. Steps 4-8 are the deck's
   (Skill Expression, 3Cs, Game Feel, Balance, Tutorialization); each line is a short form of that step's speaker notes. */
window.REFINE = (function () {
  const F = window.FORGE;
  const AB = F.PRESETS.map(p => ({ name: p.name, icon: F.PACKS[p.pack].icon, col: { Necrotic: '#8a4fd6', Smoke: '#6b6b78', Rain: '#3f8fd6' }[p.pack] }));
  // [step, colour tone, icon, one line per ability]
  const STEPS = [
    ['Skill Expression', 'blue', 'target-arrows', ['Tests timing and aim: miss and get nothing, hit to drain and heal', 'Tests decision making: hide the enemy, or hide an ally?', 'Tests situational awareness: it heals enemies in the rain too']],
    ['3Cs', 'teal', 'joystick', ['Character: steps forward, then strikes in a line', 'Controller: locks movement until the channel ends or you dodge', 'Camera: zooms up high to show the whole battlefield']],
    ['Game Feel', 'pink', 'sound-waves', ['The whip wraps the target and surges if it is electrified', 'The cloud ripples where the hidden enemy moves', 'Splatters glow green when they heal a wounded unit']],
    ['Balance', 'gold', 'scales', ['Recast quickly, but each repeat costs more', 'Move sooner after casting; much shorter duration', 'Healing split across targets; longer cooldown']],
    ['Tutorialization', 'green', 'spell-book', ['Hard check: drain the electrified gate to pass', 'Soft check: archers miss you inside the smoke', 'Sandbox: flowers bloom and bear fruit in the rain']],
  ];
  return { AB, STEPS };
})();
