// Speaker notes. Source: funsmith.world genre breakdown, "How to Make a Card Video Game?".
window.NOTES = [
  { script: 'A card game is card data, a deck, turn management and an event loop that resolves actions and triggered abilities in order. Cast Fireball at a Golem with 3 health. Two triggers fire: your Kindle adds 2 damage and the opponent\'s Dampen halves it. They go on the stack above the spell and resolve last in, first out. Put Kindle on first and Dampen resolves first: 3 halves to 1, plus 2 makes 3, and the Golem dies, which triggers its last rites. Put Dampen on first and Kindle resolves first: 5 halves to 2, and the Golem lives. Same three cards, a different fight, decided only by the order of the loop.' },
];
