/* Real abilities filed under the Ability Planning Framework (MGM C4 M7, deck slides 56-65): purpose (the problem), payload
   (the mechanics, as keywords plus one detail) and packaging (the theme). The fighting game four are the deck's own breakdowns;
   the rest are added so each purpose has more than one payload and each payload more than one packaging.
   art: 'gi:<game-icons name>' or an image in ../shared/img. Shared by every slide on this page. */
window.ABIL = [
  { name: 'Nayru’s Love', game: 'Super Smash Bros. Melee (Zelda)', art: 'gi:magic-shield', col: '#5aa8e8', purpose: 'Counter projectiles', payload: 'Reflect', detail: 'Long window: about 2 s', packaging: 'Magic: a crystal shield' },
  { name: 'Mario’s Cape', game: 'Super Smash Bros. Melee (Mario)', art: 'gi:cape', col: '#e8b83a', purpose: 'Counter projectiles', payload: 'Reflect', detail: 'Tight window: about 0.25 s', packaging: 'Physical: a swish of the cape' },
  { name: 'Reflector', game: 'Super Smash Bros. Melee (Fox)', art: 'gi:shield-reflect', col: '#6fc7c0', purpose: 'Counter projectiles', payload: 'Reflect', detail: 'Short window, sends it back faster', packaging: 'Tech: a hexagon device' },
  { name: 'Wind Wall', game: 'League of Legends (Yasuo)', art: 'lol-YasuoW.png', purpose: 'Counter projectiles', payload: 'Block', detail: 'A wall that eats every projectile', packaging: 'Wind: a gust of air' },
  { name: 'Unbreakable', game: 'League of Legends (Braum)', art: 'lol-BraumE.png', purpose: 'Counter projectiles', payload: 'Block', detail: 'A shield that catches the first hit', packaging: 'Physical: a vault door' },
  { name: 'Shoulder Throw', game: 'Street Fighter 6 (Ryu)', art: 'gi:grab', col: '#e05a3a', purpose: 'Counter blocking', payload: 'Grab + conditional damage + displace enemy', detail: 'Range: touch', packaging: 'Martial arts toss' },
  { name: 'Hookshot', game: 'Super Smash Bros. Melee (Link)', art: 'gi:grapple', col: '#4c9a52', purpose: 'Counter blocking', payload: 'Ranged grab + conditional damage + displace enemy', detail: 'Range: far', packaging: 'Physically grounded: a mechanical hook' },
  { name: 'Kick', game: 'Elden Ring', art: 'gi:boot-kick', col: '#a07a4a', purpose: 'Counter blocking', payload: 'Guard break', detail: 'Knocks the shield aside', packaging: 'Physical: a boot to the shield' },
  { name: 'Charge', game: 'World of Warcraft (warrior)', art: 'wow-ability_warrior_charge.jpg', purpose: 'Close the gap', payload: 'Dash + stun', detail: 'Rush to the target, stun on arrival', packaging: 'A warrior’s charge' },
  { name: 'Blink', game: 'World of Warcraft (mage)', art: 'wow-spell_arcane_blink.jpg', purpose: 'Close the gap', payload: 'Teleport', detail: 'Instant, a fixed distance', packaging: 'Arcane magic' },
  { name: 'Sweeping Blade', game: 'League of Legends (Yasuo)', art: 'lol-YasuoE.png', purpose: 'Close the gap', payload: 'Dash through a unit', detail: 'Needs something to dash through', packaging: 'A swordsman’s dash' },
  { name: 'Quick Attack', game: 'Pokémon (Pikachu)', art: 'pk-pikachu.png', purpose: 'Close the gap', payload: 'Strike first', detail: 'Always acts before slower moves', packaging: 'A burst of speed' },
];
