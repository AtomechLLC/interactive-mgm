/* The deck's ability workshop (MGM C4 M7, slides 77-105), as data both slides on this page share.
   Problems are the two enemies of slide 83 with the vulnerabilities from its notes. Keywords: the deck's six ([Drain],
   [Lifesteal], [Extinguish], [Stealth], [Wet], [Heal]) plus four more so a learner can miss. RULES says what each keyword does
   to each thing in the world; those rules are the "existing system" that slide 105 says a new ability plugs into for free. */
window.FORGE = (function () {
  const PROBLEMS = {
    demon: { name: 'Flame Demon', icon: 'wow-spell_shadow_summoninfernal.jpg', weak: 'Extinguish', purpose: 'Defeat the Flame Demon & other fire creatures', col: '#e5622d' },
    mage: { name: 'Lightning Mage', icon: 'wow-spell_nature_lightningoverload.jpg', weak: 'Drain', purpose: 'Defeat the Lightning Mage', col: '#5562eb' },
  };
  // [keyword, what it means, tone]
  const KEYWORDS = [
    ['Drain', 'Steals power from the target', 'purple'], ['Lifesteal', 'What it takes heals you', 'pink'],
    ['Extinguish', 'Puts out fire', 'teal'], ['Stealth', 'Hides whoever is inside', 'grey'],
    ['Wet', 'Can’t burn; conducts electricity', 'blue'], ['Heal', 'Restores health, to everyone it touches', 'green'],
    ['Burn', 'Sets the target alight', 'orange'], ['Shock', 'Electric damage', 'gold'],
    ['Push', 'Knocks the target back', 'red'], ['Root', 'Holds the target in place', 'navy'],
  ];
  // packaging: theme, icon, colour (r,g,b), how it is delivered, the name's noun
  const PACKS = {
    Necrotic: { icon: 'wow-spell_shadow_lifedrain02.jpg', rgb: '138,79,214', shape: 'whip', noun: 'Strike', line: 'a dark, swinging whip' },
    Smoke: { icon: 'wow-ability_rogue_smoke.jpg', rgb: '107,107,120', shape: 'cloud', noun: 'Smoke', line: 'a smoke bomb on the target' },
    Rain: { icon: 'wow-spell_nature_giftofthewaterspirit.jpg', rgb: '63,143,214', shape: 'storm', noun: 'Rain', line: 'a rainstorm over the battlefield' },
    Storm: { icon: 'wow-spell_nature_lightning.jpg', rgb: '214,170,40', shape: 'bolt', noun: 'Bolt', line: 'a bolt from the sky' },
    Holy: { icon: 'wow-spell_holy_searinglight.jpg', rgb: '226,180,60', shape: 'beam', noun: 'Light', line: 'a beam of light' },
    Frost: { icon: 'wow-spell_frost_frostnova.jpg', rgb: '90,180,230', shape: 'nova', noun: 'Nova', line: 'a ring of ice around the target' },
  };
  const ADJ = { Heal: 'Restoring', Drain: 'Siphoning', Extinguish: 'Smothering', Lifesteal: 'Vampiric', Stealth: 'Shrouding', Wet: 'Drenching', Burn: 'Searing', Shock: 'Crackling', Push: 'Hurling', Root: 'Binding' };
  const ORDER = ['Heal', 'Drain', 'Extinguish', 'Lifesteal', 'Stealth', 'Wet', 'Burn', 'Shock', 'Push', 'Root'];
  const PRESETS = [
    { name: 'Siphoning Strike', problem: 'mage', keys: ['Drain', 'Lifesteal'], pack: 'Necrotic', desc: 'Drains power & vitality from a target and heals you.' },
    { name: 'Smothering Smoke', problem: 'demon', keys: ['Extinguish', 'Stealth'], pack: 'Smoke', desc: 'Clouds the target in obscuring shadows.' },
    { name: 'Restoring Rain', problem: 'demon', keys: ['Extinguish', 'Wet', 'Heal'], pack: 'Rain', desc: 'Blanket the battlefield in a healing rainstorm.' },
  ];
  function nameOf(keys, pack) {
    const p = PRESETS.find(x => x.pack === pack && x.keys.length === keys.length && x.keys.every(k => keys.includes(k)));
    if (p) return p.name;
    if (!pack) return 'Unnamed ability';
    const k = ORDER.find(x => keys.includes(x));
    return k ? `${ADJ[k]} ${PACKS[pack].noun}` : `${pack} ${PACKS[pack].noun}`;
  }
  function descOf(keys, pack) {
    const p = PRESETS.find(x => x.pack === pack && x.keys.length === keys.length && x.keys.every(k => keys.includes(k)));
    if (p) return p.desc;
    if (!pack) return 'Pick a theme to give it a form.';
    const what = keys.map(k => KEYWORDS.find(x => x[0] === k)[1].toLowerCase()).join('; ');
    return `${PACKS[pack].line.charAt(0).toUpperCase() + PACKS[pack].line.slice(1)}${what ? ': ' + what : ''}.`;
  }
  // world things and the keywords they already respond to: [keyword, what happens]. Written once, used by every ability.
  const THINGS = [
    { k: 'demon', name: 'Flame Demon', icon: 'wow-spell_shadow_summoninfernal.jpg', rules: { Extinguish: 'its fire goes out', Wet: 'can’t burn while wet', Burn: 'immune: it is fire', Heal: 'heals it too' } },
    { k: 'mage', name: 'Lightning Mage', icon: 'wow-spell_nature_lightningoverload.jpg', rules: { Drain: 'its charge empties', Shock: 'absorbs it and charges up', Wet: 'its bolts arc through wet things', Heal: 'heals it too' } },
    { k: 'bridge', name: 'Burning bridge', gi: 'flame', col: '#e5622d', rules: { Extinguish: 'the fire goes out, the way is open', Wet: 'stops spreading' } },
    { k: 'brazier', name: 'Brazier', gi: 'campfire', col: '#c9782a', rules: { Burn: 'lights the room', Extinguish: 'the room goes dark' } },
    { k: 'gate', name: 'Electrified gate', gi: 'lightning-arc', col: '#d6aa28', rules: { Drain: 'powers down, it opens', Shock: 'overcharges', Wet: 'shorts out with sparks' } },
    { k: 'field', name: 'Fallow field', gi: 'grass', col: '#4c9a52', rules: { Wet: 'crops sprout', Heal: 'blooms', Burn: 'scorched' } },
    { k: 'hall', name: 'Archer hallway', gi: 'bow-arrow', col: '#6b6b78', rules: { Stealth: 'walk past unseen' } },
    { k: 'ally', name: 'Wounded ally', gi: 'healing', col: '#2fae63', rules: { Heal: 'back on their feet', Stealth: 'hidden from enemies' } },
  ];
  return { PROBLEMS, KEYWORDS, PACKS, PRESETS, THINGS, nameOf, descOf, tone: k => (KEYWORDS.find(x => x[0] === k) || [, , 'grey'])[2] };
})();
