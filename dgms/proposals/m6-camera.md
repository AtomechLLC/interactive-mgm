# Module 6: 3Cs: Camera: interactive and GIF proposals

Source: "RGF C2 M6 - 3Cs - Camera (Chad Verrall)" (Drive 152_gMXmIWjU_Q4zgShi7ttHbp9O3_yh3CbPuColk-uA, 305 slides). First pass 2026-11-04. Slides 1-253 were read with speaker notes, and their numbers are the export's "N of 305" numbers. The notes export stops at 253, so the rest of Part 5 (Goals 6-8), the drill, the philosophy slide and the leftover "Video X" lecture were read from slide text only. Slide numbers after 253 are approximate (the text export skips blank slides) and are marked "about".

Built so far: nothing yet. The course home is `../index.html`. No camera page exists anywhere in the project, so everything here starts fresh. The puppet tracer proposed for Module 5 and the jump tuner from Module 4 can share the same side-view hero, which keeps the 3Cs visually consistent.

This deck is taught by Chad Verrall (God of War, The Order: 1886) and is the most spatial of the course: camera types, position blends, lenses and field of view, composition, collision and occlusion. Nearly every slide describes a camera moving through space, which is the thing a static slide can't show. Most proposals below pair a top-down map (where the camera is) with a view panel (what the player sees), so one reusable "map + view" widget carries most of the module.

Effort: **S** = one GIF or a single small widget (under a day), **M** = a page with a few controls or a reusable rules table (1-2 days), **L** = a sandbox with several modes (3+ days).

Imagery note: the deck's examples are God of War, The Order: 1886, Resident Evil, Gears of War, Lies of P, Ghost of Tsushima and Elden Ring. None of those are on the project's approved imagery list, so the widgets use original grey-box scenes and name the game in the caption. Super Mario Bros. sprites are approved and fit the scrolling camera (76).

Wording note: the deck's "Goal 1: Good Composition" and "Looks good / Plays well" (130-131) are fine as spoken lines, but visual labels below use "Clear composition" and "Looks striking / Plays clearly".

## Top 5

| # | Proposal | Slides | Effort |
|---|----------|--------|--------|
| 1 | Camera rig switcher: 11 types on one level | 21-103 | L |
| 2 | Position blend arena | 48-58 | M |
| 3 | Lens ladder: mm, HFOV, VFOV and view distance | 153-177 | M |
| 4 | Follow camera tuner: five variables and verb states | 118-137, 204-213, 222-232 | L |
| 5 | Clipping and occlusion lab | 233-251 | M |

Quick wins worth doing early even though they are not top 5:
- **Lower the horizon** (slides 122-129). A single grey-box boss and a camera height and pitch slider. As the camera drops and the horizon lowers, the boss grows imposing; raised high and looking down, it shrinks. Notes on 125: "When the camera is up high looking down on someone… " and on 129: "if you want to make something be big and scary/imposing it's one of the best tools (Think boss fights)". A min/max button jumps to each extreme, because slide 122's advice is "Try extremes… What does the minimal setting do? What does the maximal setting do?"
- **Size is relative** (slides 162-164). A GIF: two identical orange dots, then large white dots appear around one and small ones around the other, and the right dot seems to grow. The caption ties it to FOV: the world around the hero sets how big the hero feels. Very small.
- **Off the spline** (slide 66). A GIF of a spline camera in a wide room. The hero walks sideways away from the spline, and the view panel shows them shrinking on screen. Notes: "This won't feel good as it creates a detachment between the camera and the character/hero." It's the clearest argument for when not to use a spline, and it falls out of proposal 1 for free.

---

## Part 0: Introduction (slides 1-18)

**Three Cs, three definitions** (slides 8-12), effort **S**, GIF
- Teaches: character design is "What the hero does (verbs & actions)" (9), controls design is "How players interact with the world (using the hero)" (10), and camera design is "What & how the players see the world (and alter it)" (11). Slide 12: "Camera Design = Gameplay Design + Cinematics Design."
- Proposal: the Module 0/4/5 diagram (Player, Commands, Controller, Character, Camera, World) with the Camera box lighting last, and the same hero shown through three cameras (third-person follow, first-person, side view) under it. A closing card for the 3Cs arc across Modules 4-6.

## Part 1: 11 common game camera types (slides 21-108)

**Yaw, pitch, roll and the six translations** (slides 22-25), effort **S**, GIF
- Teaches: three rotations (yaw, pitch, roll) and three translation axes, "same terms used by pilots" (24). Slide 25: engines disagree on which axis is up: "Z could be up (Unreal) or Y could be up (Maya)".
- Proposal: a camera gizmo that rotates and slides on each axis in turn, with the label on screen. A last frame flips between a Z-up and a Y-up axis triad, captioned with the two engines. Reusable as the legend for every other widget in this module.

**Camera rig switcher** (slides 27-103), effort **L**, **TOP 5**
- Teaches: eleven types, each with pros and cons (103):
  1. Fixed point (28-38): "Neither moves (Translation) or rotates", or rotates from a fixed point. Tetris (29), Resident Evil (30). Pros: unnerving, suspenseful, security-camera narrative (33-35). Cons: "fairly dead and uninteresting", and unwanted cuts in combat "if the activation volumes are poorly setup" (31). Notes on 37: God of War never transitioned a camera in or out of water, so those were always cuts, and "trying to find ways to signal they're going to happen… helps players prepare."
  2. Dolly (39-47): a fixed camera that can dolly toward a virtual position set by the camera designer (42), and a fix for gimbal lock by placing the camera "outside of the gameplay space" (47).
  3. Position blend (48-58): see proposal 2.
  4. Vector, or isometric (59-61): "a constant relationship between the hero and its position with a specified yaw, pitch, distance and offset." Diablo III. "Feels programmatic, cold, and non-immersive" but "Easy to set up, low maintenance, and scalable."
  5. Spline (62-68): the hero's position drives the camera along a curve. For "Tight limited spaces (doorways or hallways)", not wide rooms (66). God of War: Chains of Olympus's battering ram (68).
  6. Animated (69-74): an animation played forward or back instead of riding the spline, so it can't get caught on the path (71). Ghost of Sparta used animated cameras wherever a spline was called for (74).
  7. Scrolling (75-79): Super Mario Bros., Super Metroid. "Low investment" and accessible but "less immersive, flat."
  8. Floating (80-81): Homeworld, Total War. Free over wide spaces but "Can be difficult to use" and needs jump-to shortcuts.
  9. Follow (82-86): "the base camera used for many third-person action games", with copies of it under different parameters.
  10. Cover (87-100): see the cover family below.
  11. First-person (101-102): immersive and cheaper than follow, but you can't see your upgrades and the hero is often a blank slate.
- Hard as text: eleven definitions with diagrams of arrows. Each one is a different rule for where the camera goes when the hero moves, which is exactly what a slider or a drag shows.
- Proposal: one grey-box level (a corridor, a doorway, an open courtyard and a small arena) with a draggable hero. The left panel is the top-down map with the camera's position, frustum and any rails, volumes or splines drawn in. The right panel is the view. A picker switches between the eleven rigs, and each shows its pros and cons as two short chip lists under the view. The spline rig in the courtyard reproduces the "off the spline" quick win, and the fixed rig with a badly placed activation volume reproduces the combat cut from 31 and 38. The scrolling rig switches the scene to a Super Mario Bros. strip, using the approved sprites. A "classify the camera" drill (105-107) sits at the end: the page plays a rig without naming it, and the learner picks which one it is.

**Cover camera family** (slides 87-100), effort **M**
- Teaches: the cover camera is a modified follow camera with many variants. The Order: 1886 had low cover left, middle and right, object edges, low cover rear, moving in cover, blind fire, aim and aim over, high cover and building edges, peek low (up and side), peek high and soft cover (89-99). Notes on 93: rear cover cameras "are some of the most difficult cameras to setup and get correctly". Notes on 99: soft cover "was added pretty late in the development cycle." Notes on 100: cover cameras bias players toward the side with more visibility: "Gears of War players always favor the right side."
- Proposal: a family tree, with the base follow camera at the root, branching to low cover, high cover and soft cover, and each leaf showing a thumbnail view. Clicking a leaf shows the one or two parameters that changed from its parent (anchor height, offset side, FOV). It makes the "copies of the base camera with different parameters" idea (82) concrete, and reuses the follow camera tuner's renderer.

## Part 2: Cinematography principles for games (slides 111-149)

**Thirds, centre and circle-right** (slides 118-121), effort **S**
- Teaches: eyes go to the thirds lines and their intersections (118). "If the hero obstructs the center of the screen, they can block the sight line to the player's destination" (119). Lies of P keeps the hero centred, which Chad finds "very frustrating", though "Melee centric games tend to desire a more of a centered view to create less gameplay bias" (120). Gears of War, The Order and Horizon Zero Dawn frame on a third (121). Notes on 119: in Gears "you almost always want to circle right, because going left you have less visual information", which is why some games sit "just slightly off center."
- Proposal: a view panel with a thirds grid overlay, a hero, and a doorway target. An offset slider moves the hero from centre to the left third. At centre, the hero's silhouette covers the doorway; at the third, it's clear. A second toggle has an enemy circle the hero left, then right, and shades the visible area on each side, so the circle-right bias appears as a number (how much of the arena you can see). Fold into proposal 4 if that gets built first.

**Angles are our friends** (slides 122-138), effort **S**
- See the "lower the horizon" quick win. The deck's Simpsons storyboards (123-128) aren't on the approved imagery list, so the widget uses its own boss. Slide 132's point, "The angles available to you depend on the type of game camera you choose", is a caption that links back to the rig switcher: God of War and Resident Evil (133-134) pick their angles, Gears (135) mostly doesn't.

**Cameras accentuate verbs** (slides 136-137), effort **S**, GIF, fold into proposal 4
- Teaches: notes on 137: as the hero sprints, "the camera allows the hero to pull away slightly to help emphasize speed. The FOV expands so the player can see more", and in aim, "the camera FOV tightens… We're closer to the hero and framing the weapon." Notes on 136 list the verbs a camera should answer: left/right, aim, climb, slide, swim, crouch, prone.
- Proposal: a looping GIF of one hero walking, sprinting and aiming, with the camera's distance, height and FOV readouts updating in a corner. It doubles as the preview for proposal 4.

## Part 3: Designing field of view (slides 153-177)

**Lens ladder** (slides 153-177), effort **M**, **TOP 5**
- Teaches: FOV "is the extent of the observable world that is seen at any given moment by the player" (155). It comes from camera lenses (157). The Order: 1886 case (notes on 158): aim started at a 50mm lens, "39.6 HFOV… closest to the human eyes", but "Players were having to spend too much time moving the camera around (or exiting aim) to find targets." Aim moved to 35mm, which forced the base follow camera wider. They tried 20mm (HFOV 84) and 28mm (HFOV 65) and settled on 24mm (HFOV 74). The sniper scope used 135mm (HFOV 15), "based on the level's size and combat distance" (161). View distance sets comfort: console players sit farther and like 50-70 degrees horizontal, PC players sit close and like 90-100 (165, 169-170), and mobile varies (171). Engines measure differently: Unreal and Gears use horizontal FOV, The Order used vertical (172), converted by vfov = 2·arctan(tan(hfov/2)·9/16) (173). The main reason to convert is to copy another game's values: "The most inefficient thing you can do in the early stages of camera design is to reinvent the wheel from scratch" (173). Accessibility (176): screen size, distance and motion sensitivity are outside the developer's control, so let players adjust FOV, by percentage if the game also changes FOV per action.
- Hard as text: a formula with ASCII brackets and a list of lens numbers. The point is how each lens feels, and the conversion is the kind of thing people want to type numbers into.
- Proposal: a lens ladder (135, 50, 35, 28, 24, 20mm) beside a view panel of a grey-box combat space. Picking a rung changes the view and shows mm, HFOV and VFOV together. The Order's story plays as a guided tour: 50mm aim with a target drifting out of frame, then 35mm, then the base camera moving to 24mm. A converter box takes HFOV or VFOV and an aspect ratio and returns the other. A "where do you sit?" picker (couch, desk, phone) draws the screen at that distance and marks the comfortable range. A last toggle applies a player FOV percentage on top of the designer's per-action values and shows the hero drifting off the third unless the offset compensates (176).
- Check before building: the deck's lens-to-HFOV numbers match a 36mm (full-frame) sensor width: 50mm is 39.6, 35mm is 54.4, 28mm is 65.5, 24mm is 73.7, 20mm is 84 and 135mm is 15.2. State that assumption on the page.

## Part 4: How to use FOV to impact game feel (slides 181-218)

**Three FOV moves** (slides 183-216), effort **M**
- Teaches: tighter FOV for claustrophobia, distant things seeming closer, and focus (184-192: horror, scuba, The Order's sniper scope), at the cost of more camera input and less to see. Wider FOV to feel faster and distort (193-203: Aliens vs Predator's alien view is wider and fisheyed at the edges, 196-198), at the cost of distortion. Action-based FOV to accentuate actions (210-215): sprint and aim changes, and the "Secret sauce" of small FOV fluctuations on gun recoil in Gears and The Order (213). Cons: dev cost per FOV, and players lose agency when they can't adjust a designer's FOV, like Call of Duty's sniper scope (215). Parallax (204-209): "Camera position, FOV and the environment all contribute to parallax." Notes on 207: lower cameras feel faster, wider FOVs show more parallax, and "Open desert is harder to imply speed Vs racing through a redwood forest". Notes on 209: any FOV change makes the camera feel closer or farther, so distance and offset need re-tuning.
- Proposal: a runner on a straight road with a scenery picker (open desert, sparse posts, dense forest). Sliders for camera height and FOV, with the run speed fixed. A speed-feel meter isn't honest, so the page instead plays the same run twice side by side and lets the learner judge. A recoil toggle adds a 2-3 degree FOV kick per shot to an aim view, with an off/on comparison. The two missing clips on 206 and 208 (2D and 3D parallax comparisons) can be exported from this page; see the small fixes.

## Part 5: 8 immersive follow camera goals (slides 221-about 270)

**Follow camera tuner** (slides 222-232, plus 118-137 and 204-213), effort **L**, **TOP 5**
- Teaches: the five composition variables: anchor point (usually head or neck, "the rotation point the camera will pivot (Yaw, Pitch) around"), distance ("the farther away the more problems you'll have with occlusion and camera clipping"), left/right offset, height and FOV (224-226). Notes: "if you just focus on these 5, you'll be 80% there." Goal 2 asks "What is the hero trying to do? How can the camera guide the player to what they're supposed to do next? How can the camera support the hero's actions?" (228). The Order drill (229-230): cover, blind fire, small arms aim, moving right cover, aim again, plus slower camera turn speed when aiming and blend times between cameras (notes on 227). Goal 3 (232): stay close and keep the hero on screen, because far cameras shift players "from empathizing aka I am the hero… to sympathizing aka I'm watching the hero."
- Hard as text: five variables that interact. Changing FOV changes how far the camera feels, which then needs a new offset (209). That loop is the lesson, and it's invisible without sliders.
- Proposal: a third-person view with a thirds grid, an orbitable camera, and five sliders. A small side panel draws the rig from above (anchor dot, distance arm, offset, height). Presets: "Centred (Lies of P style)", "On a third (Gears style)", and "Too far" (which turns on a "watching, not being" badge from slide 232). A verb strip (walk, sprint, cover, blind fire, aim) blends the rig to each state's parameters with a visible blend time, so the learner sees the five-step Order sequence as five parameter sets. Each verb state is editable. Turning the FOV slider shows a "framing drift" ghost of where the hero was, so the learner learns to re-tune the offset.

**Clipping and occlusion lab** (slides 233-251), effort **M**, **TOP 5**
- Teaches: Goal 4, preventing clipping into walls, objects and ground (233), and five solutions (234-240): collision (push the camera, usually toward the anchor, which can jump), prediction ("responds to ray cast/feelers and tries to move the camera before collision happens"; notes on 235: The Order's wall approach is "80-90% prediction and just 10-20% collision"), a quantizer that shortens the arm at high or low pitch (236-237, "Secret Sauce: Change camera attributes based on pitch angle"), bringing the camera closer in hallways (238-239), and a collision resolve point instead of the anchor point for worst cases like "Corner with low ceiling" (240). Old approach (notes on 234): push up over the head, which jitters under a low ceiling. Goal 5, preventing full occlusion (241-251): partial occlusion is fine and even adds realism (244); Ghost of Tsushima's full occlusion probably stayed because of time, low occurrence and low return (243). Collision and prediction solve occlusion and walls together but pull the camera in during combat (246). Dithering (Elden Ring's trees, 248) keeps the camera's footprint but is art-heavy, "can break immersion: why are things going invisible?" and doesn't solve walls (250), so Chad is "hesitant to recommend it."
- Proposal: the "map + view" widget in a corner room with a low ceiling, a pillar and a tree. Five toggles for the five solutions plus a dithering toggle. Walk the hero toward the wall and the corner and the map draws the arm, the feeler rays, and the collision push, while the view shows what happens: clipping through the wall, a jump, a smooth pull-in, or jitter under the ceiling. A small counter tallies "frames hero fully hidden" and "frames camera inside geometry" so toggles can be compared. A "combat" switch adds an enemy behind the pillar and shows the trade-off: prediction pulls in and loses the enemy, dithering keeps the enemy visible but fades the pillar.

**Ambient camera animation** (about slides 252-258), effort **S**, GIF
- Teaches: Goal 6, ambient camera motion keyed to what the hero is doing: riding a horse, a moving train, a flying airship, walking, sprinting. "Big enough to feel the effect, subtle enough to not draw attention." Sources: motion capture or hand-keyed.
- Proposal: four short loops (walk, sprint, horseback, airship) with an intensity slider from 0 to "too much". The right setting is left to the learner, with the deck's caveat as the caption. Reuses the yaw/pitch/roll gizmo to show which axes each loop moves.

**Power user and novice** (about slides 259-264), effort **S**
- Teaches: Goal 7: "The two player types has opposite needs. Don't want to frustrate one as you please the other." Solutions: predict intent and make auto adjustment intuitive, let input override or cancel it, and wait until "X time has elapsed with no camera stick input" before auto-adjusting.
- Proposal: a hero running around a curved path, an auto-recentre camera, and a "stick idle time" slider. A recorded "power user" input track fights the camera when the delay is short and a "novice" track (no camera input) loses the hero when auto-recentre is off. The page shows how many times each player was overridden.

**Accessibility switches** (about slides 266-269), effort **S**, fold into the lens ladder
- Teaches: Goal 8: some players are sensitive to extraneous motion, and view distances and screens vary. Solutions: let players reduce or turn off additive camera animation and shakes, and adjust FOV and all cameras by percentage.
- Proposal: two toggles on the ambient animation and lens ladder pages ("reduce camera motion", "FOV %"), so accessibility is shown as part of the same rig, not a separate menu.

**Eight goals audit** (about slide 270, plus the drill about 271-280), effort **S**
- Teaches: the eight goals in one list, and the drill: "Typically when cameras are done well, few people notice them. But if they're done wrong or have issues, they tend to stand out. What is a game you played where you had camera problems…?"
- Proposal: a printable checklist card of the eight goals with a one-line test for each (for example, Goal 3: "Is the hero on screen in every shot?"). Learners fill it in for a game of their choice, which gives the drill a fixed format.

## Closing slides (about 282-305)

**Camera philosophy card** (about slide 282), effort **S**
- Teaches: "Test extremes. Embrace player freedom. Level design and flow influences the camera. Find the razor edge between beauty and accentuating gameplay. Feeling matters (It's all about how the camera controls feel). Start simple, slowly add complexity."
- Proposal: a single summary card in the course style, as the module's last frame.

The "Video X: Game Camera Overview" slides (about 284-300: top-down, three-quarter, 2D side, first and third person; motion types fixed, rotating, scrolling, panning, zoomable; anchor types locked, floating, tracking, pushable) look like an older lecture left at the end of the deck. If they stay, the anchor types fit the rig switcher as a second picker. See the small fixes.

## Small fixes spotted while reading

- Slide 5 is a placeholder ("Insert screen capture of Chad's LinkedIn Experience"). Slides 206 and 208 say "INSERT VIDEO CLIP". Notes on 207 say "\*insert narration for this clip to demonstrate this point\*". Notes on 238 hold editing instructions ("Highlight/call out the distance… Add speaker notes"). The drill slides (about 274-280) still say "REPLACE WITH UNIQUE STEPS", "REPLACE WITH UNIQUE SCREENSHARE VIDEO LOOM" and the example game is "Tag".
- About slide 265 is a leftover note on a slide face: "Add call back to player psychology course/module(5)". In this course, player psychology is Modules 2 and 3.
- Slide 13's player benefits ("Stands out in the player's mind… Is appropriately difficult and engaging… Grows with the players") look copied from another module and don't describe cameras.
- Slide 15 lists Part 5 as "8 Optimizations to Design Engaging 3rd Person Follow…", but Part 5 is titled "8 Immersive Follow Camera Goals".
- The FOV context numbering is inconsistent. Slide 169 says "Type 1: Console Games" but its notes say "The third type is Console". Slide 170's notes call PC "The second type" (matching), and slide 171's notes call mobile "The first type" while the slide says Type 3. The repeat slide at about 266 says "Type 3: Console Games".
- Notes on 176 say "Later in part 6 of this course, I will talk more on how make your follow camera more accessible". That's Goal 8 in Part 5.
- Slide 89 says "5 Basic Types of Cover Cameras" and then lists ten items (the main five with sub-items flattened into one list).
- Notes on 233 say "There are 2 most common situations when this happens" right after a slide titled "3 Common Problems", and only describe one.
- Slide 230's drill answer lists five cameras; the notes on 227 list seven steps. They're compatible, but the slide could say "five cameras, plus turn speed and blend time".
- The notes on 154 ("What is Field of View?") and 182 are copied from the angles slides ("Now you won't always have control over all the angles…").
- The drill slides say "Fill out the 7.3 section" and "the 7.5 section" of the mastering mechanics worksheet. This is Module 6, so the worksheet numbering may be from the old course order.
- Slide 108 and slide 110 are blank; slides 40-44 repeat the same dolly diagram five times with no notes.
- Typos: "Peak" for "peek" on 90 and 98 (91 uses "Peek"), "Krato's" (53), "mind as well" (246), "quit often" (234), "it's desired distance" (233), "They're view distance" (170), "two player types has" (Goal 7).
- Slide 17 says "Making good gameplay camera design decisions". Fine as narration; in any visual made from it, use "deliberate" or "informed" instead.
