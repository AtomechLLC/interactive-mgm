# Working rules for this repository

## Sprites: find the forward direction before using one

Before drawing any sprite, look at the image itself and determine which way it natively faces. Never assume from the file name, the source site, or another sprite in the same set.

1. Render the sprite enlarged and identify its front (eyes, snout, weapon, direction of the walk cycle).
2. Record the native facing next to where the sprite is loaded.
3. Mirror it so it faces the direction it moves, attacks or throws in the scene, and re-check after every change of direction within a loop (a dive and its return, a lunge and the turn after it).
4. Verify in a screenshot of the running scene, at several points in the loop, before recording GIFs or opening a pull request.

Known native facings:

- `composition/retro-attributes/img/cv-*` (Castlevania, including Simon): right.
- `composition/retro-attributes/img/z2-*` (Zelda II Link): left.
- `composition/retro-attributes/img/z-*-left`, `z-rope`, `z-dodongo*`, `z-arrow` (The Legend of Zelda): left.
- `student-tokens/256px/mario/` Paratroopa: left.
