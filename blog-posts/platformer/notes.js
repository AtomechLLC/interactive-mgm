// Speaker notes. Source: funsmith.world genre breakdown, "Platformer Game Design". Physics values are illustrative.
window.NOTES = [
  { script: 'A platformer lives on a responsive moveset, and responsive means the game reads what the player meant. Twenty attempts at two gaps, each with presses a few frames off, the way real hands are. With no forgiveness, late presses at the ledge do nothing because Mario already left the ground, and early presses before landing are dropped. Add six frames of coyote time and the late presses work. Add a six-frame jump buffer and the early ones do too. The hands never changed. Then raise gravity: shorter arcs, and the gap itself becomes the problem, which is the kind of difficulty you meant to design.' },
];
