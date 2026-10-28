// Speaker notes per slide. Source: "MGM C4 M3 - Mechanics Design Optimizations and Tools", slides 79-94.
window.NOTES = [
  { script: 'Let’s take a look at three implementations for opening a door, and see how their packaging and substance lead to dramatically different feeling mechanics, even if they feel like they have the same end result.' },
  { script: 'You flip the switch, door A opens. You stand on the pressure plate, door B opens. You pull the rope, door C opens. The switch only needs to update its value when it’s touched. The pressure plate is repeatedly evaluating “is something here or not?”, and changes the state when someone enters or leaves it. The pulley evaluates how far you’ve moved since grabbing the rope, and stores a percentage: 3.5 yards out of 5 is 70% open. Each one works differently, so the player’s behaviour around them is different, even if the outcome is the same.' },
  { script: 'The switch was binary: on or off. A blender is discrete: it goes faster the higher the number you press. The pulley is continuous: its value increases the further you pull.' },
];
