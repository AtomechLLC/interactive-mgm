// Speaker notes. Source: funsmith.world genre breakdown, "How to Make a Game Like GTA?".
window.NOTES = [
  { script: 'A GTA-style mission is built from atomic conditions while the world systems keep running. The city here has traffic, police patrols, pedestrians and a clock, and none of it belongs to the mission. The mission is only a chain of checks: reach the marker, wait until night, get a wanted level, lose it, deliver the car. Each frame the game asks one question, is the active condition true yet, and moves on when it is. While the player waits for night the traffic keeps flowing; the police that chase you are the same patrols that were wandering before. Build your own chain from the blocks and the world never pauses between them.' },
];
