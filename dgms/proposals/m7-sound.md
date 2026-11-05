# Module 7: Sound Design: interactive and GIF proposals

Source: "Refining Gameplay Workshop Version of Noah Taublieb's Sound Design Slide Deck" (Drive 10bPQK4yNLA98VHubsb4G6pEbktBqPMNEhJBaEG8euhU, 270 slides). First pass 2026-11-05. All 270 slides were read with speaker notes, and their numbers are the export's "N of 270" numbers.

Built so far: nothing yet. The course home is `../index.html`.

This is a workshop cut of Noah Taublieb's sound course, with review notes from Emmanuel Lagumbay (Guild Wars 2). It runs over two days: Day 1, "Sound Design Informs Game Design" (slides 2-115), and Day 2, "How To Identify Sound Design" (116-210). Slides 211-270 look like the original course's parts left at the end (planning, static vs continuous, panning, the final workshop). The ideas are clear and few: four rules, four classes, two common mistakes, static vs continuous sounds, panning, attenuation and loudness, plus tools and a re-sound-a-clip workshop.

This is the one module where the medium is the message, and a slide can't play a sound at the right moment. So the proposals lean on the Web Audio API, which can synthesise every sound these pages need (footsteps, a faucet loop, stingers, consonant and dissonant UI tones, a layered music track) with no audio files and no licensing questions. Gameplay clips from the referenced games stay as links, as the deck already does.

Effort: **S** = one GIF or a single small widget (under a day), **M** = a page with a few controls or a reusable rules table (1-2 days), **L** = a sandbox with several modes (3+ days).

## Top 5

| # | Proposal | Slides | Effort |
|---|----------|--------|--------|
| 1 | The faucet: static vs continuous, panning and attenuation | 94-99, 177-189, 223-236 | M |
| 2 | Four classes sorter: character, environment, UI/UX, music | 118-175, 191-197 | M |
| 3 | Same scene, four rules: a mixer that teaches focus | 18-46 | L |
| 4 | Music that reacts: style layers and state changes | 30-32, 166-170 | M |
| 5 | Two ways audio breaks: silence and no voice limit | 56-71 | S |

Quick wins worth doing early even though they are not top 5:
- **Consonant and dissonant menu** (slides 145-147). A small pause menu in the course style. Confirm plays a consonant chord and back or unavailable plays a dissonant one, following Persona 5's pattern (notes on 146: "Consonant sounds indicate relief from tension… dissonant sounds accentuate tension"). A toggle swaps them so the learner hears how wrong it feels.
- **Start at -20 dB** (slides 189, 232-233). A level meter with a faucet loop playing over a quiet room bed, and a fader that starts at -20 dB, from the notes on 233: "balance your sound effect around -20 dB and then adjust it from there." Very small.
- **Hear the boss coming** (slide 23). An original boss telegraph: an arrow indicator plus a rising tone that ends exactly when the shot fires, as in Emmanuel's Guild Wars 2 raid example ("the sound gives them an audio timer based on when that shot is exactly going to happen"). A mute button shows how much harder the timing gets with the arrow alone.

---

## Day 1, Part 1: What sound design is (slides 12-16)

**Sound informs game design** (slides 13-16), effort **S**, card
- Teaches: sound "keeps the player properly informed and emotionally engaged. It's primary function is to provide contextual information" (13). League of Legends' Ornn ultimate uses "a loud horn to tell players he is casting an ability that can… swing" a fight (13). "A sound effect can tell a player what to do, where to go and what to look out for" (14). Emmanuel's notes on 15-16 suggest a group exercise on a team shooter clip: pick out countdown VO, per-character footsteps, proximity and capture-point UI, and the pillars and mix section of a linked talk.
- Proposal: an opener card with Ornn's portrait and ultimate icon (approved imagery) and a play button for an original horn-like cue. Under it, the slide 15 listening checklist as tick boxes for the clip exercise.

## Day 1, Part 2: The 4 rules of immersive game audio (slides 18-52)

**Same scene, four rules** (slides 18-46), effort **L**, **TOP 5**
- Teaches: Rule 1, focus on what's important: "While our eyes can withstand as much graphical fidelity as we can throw at them, the human ear can only process so much before being overwhelmed" (21). Examples: fighting a boss blindfolded by sound (22), Guild Wars 2's Decima raid (23), and P.T., where rain pulls the eye to the window and screeching to the swaying bulb (24-25). Rule 2, show them why they should care, with stingers ("a short but powerful music or sound effect that accentuates a gameplay moment", 27): Sekiro's blade clash and follow-up drum (28-29), and Devil May Cry V's style-driven music (30-32). Rule 3, design a core identity: Doom Eternal's synth metal, Animal Crossing: New Leaf's trumpet and banjo, and Limbo with no music at all (33-40). Rule 4, reward accomplishments, micro and macro: Candy Crush's constant affirmation and Super Mario Bros. 3's level-clear jingle (41-46).
- Hard as text: four rules, each argued with a video link. The rules are about mixing choices, which a learner can make and hear.
- Proposal: one small top-down scene (a hero, an enemy, a pickup, a door and ambient rain) with every sound synthesised. Four rule tabs. Rule 1 has a mixer with every source at equal volume and a "focus" button that ducks the ambience under the enemy cue, so the learner hears the scene go from mush to clear. Rule 2 adds a parry with and without its stinger. Rule 3 swaps the whole soundtrack between three identity presets (aggressive, serene, music-free with louder wind and footsteps) on the same scene. Rule 4 adds a pickup chime per coin and a jingle on level clear, with toggles for each. The page ends with the slide 50 drill as a form: pick a 30-60 second clip and note how it follows each rule.

## Day 1, Part 3: The 2 most common sound design mistakes (slides 56-77)

**Two ways audio breaks** (slides 56-71), effort **S**, **TOP 5**
- Teaches: mistakes come from two shortcomings: no resources (no money for a composer, or no experience) and technical errors (58-59). Need for Spirit: Drink & Drive Simulator has no sound at all: "There's no audio to indicate the friction of the various terrains, no stingers… there's not even a sound effect to indicate whether the car itself is even turned on!" (62), and Noah re-sounded it (63). Sonic Colors Ultimate's laser dash plays a collision sound for every crystal with no limiter, so it "becomes far too loud and way too crunchy" (68). Its level-clear music is too loud, panned too wide and loops early (70). Notes on 65 and 71 play devil's advocate: the indie probably lacked funds, but the AAA remaster has less excuse.
- Proposal: two short widgets. One is a car on a track with a sound on/off toggle (engine, terrain, collision), echoing slide 62's list. The other is a dash through twenty crystals with a "voice limit" slider: at unlimited, the overlapping hits stack into a loud, distorted burst on the level meter; at 3, it stays clean. The limiter is the lesson, and the meter makes it visible as well as audible.

## Day 1, workshop: Getting a sound library (slides 93-114)

**What does a faucet sound like?** (slides 94-103), effort **S**, fold into proposal 1
- Teaches: list every sound in an experience before you look for any: a startup, continuous running water, a rising pitch as the cup fills, and the handle's screech (96-99). Libraries can be free or paid but must be "royalty free" (101-102), or you can record your own sink (103). Soundly as a free library manager (105) and free packs (107).
- Proposal: the "pause and write down what you'd need" moment from slide 95 becomes a text box that then reveals the four-part answer, leading straight into proposal 1.

## Day 2, Part 1: The 4 classes of engaging sound design (slides 118-175)

**Four classes sorter** (slides 118-175, plus the drills on 191-197), effort **M**, **TOP 5**
- Teaches: four classes, each with three takeaways. Character sounds "represent the character's actions", "demonstrate traits" and "stand out" (120-131): Mario's jump, the Doom Slayer's shotgun, Tingle's "Kooloo Limpah" and Fatalis's roar. Environment sounds indicate danger, define ambience and are "comprised of many parts" (132-142): Shadow of the Colossus's footsteps and growl, and Breath of the Wild's layered grass, birds, terrain footsteps and boulder. UI/UX sounds guide non-diegetically, show how players should feel, and mark success or failure (143-155): Persona 5's menu, Smash Ultimate's knockout, and Dark Souls' "You Died" against its victory fanfare. Music defines tone, provides context and notifies state changes (156-173): Mario Wonder vs Metal Gear Rising vs Dark Souls 2's Majula, Breath of the Wild's Guardian stinger and Metal Gear Solid's alert. Composers are their own profession (174-175).
- Proposal: a sorting game. Short synthesised sounds play one at a time (a jump, a footstep on gravel, a menu confirm, a distant roar, a rising alert theme, wind) and the learner drops each into one of four bins. Each answer reveals its class, the takeaway it shows, and the referenced game as a caption. A second mode is the slide 196 drill: paste a video link, list five sounds and tag their classes. A Super Mario Bros. sprite can sit on the character bin, since Mario's jump is the deck's first example.

**Environment layers** (slides 137-139), effort **S**, fold into proposal 2
- Proposal: four layer toggles (grass, birds, footsteps by terrain, a dropped object) on one ambient loop, so "layers that work together rather than any one" (137) can be heard building up.

**Music that reacts** (slides 30-32, 166-170), effort **M**, **TOP 5**
- Teaches: Devil May Cry V adds "guitars, synths and vocal layers… as the player's rank rises from C all the way to S", then cuts when the room is clear (31-32). Breath of the Wild interrupts ambience "with a dissonant music stinger" at a Guardian (168). Metal Gear Solid switches from "slow and suspenseful" to "intensely fast paced" when spotted (170). Takeaway: music "notifies players about changes in gameplay states" (173).
- Proposal: a synthesised loop with four stems (drums, bass, lead, vocal-like pad) tied to a style meter from D to S. Clicking "stylish hit" raises the meter and brings stems in; idling lets it fall and stems drop out. A second tab is a stealth state machine (sneaking, suspicious, alert) where each state switches the track, with a stinger on the transition. The learner sees the state diagram and hears it at once.

## Technical concepts (slides 177-189, repeated at 223-236)

**The faucet** (slides 94-99, 177-189, 223-236), effort **M**, **TOP 5**
- Teaches: static sounds "have a set duration" and must sync to an event of known length (180-181, 224-227): turning the handle, or the cup filling and rising in pitch. Continuous sounds "have no set duration" and loop seamlessly until "The player decides this!" (182-185, 228-231): "Game designers can't predict when players will turn off the faucet, or even if they ever will" (185). Panning places a sound in the stereo field (235). Attenuation lowers volume with distance: "Closer = Louder, Farther = Quieter" (186, 236). Loudness in decibels, starting around -20 dB (189, 232-233).
- Hard as text: these are the deck's most technical slides, drawn as static timelines. Every one of them is something you hear change when you move or click.
- Proposal: a top-down room with a sink and a draggable listener (the player). Click the handle to start the faucet: a static startup, then a seamless loop, then a static stop when clicked again, each drawn on a live timeline as it plays (start, play, reset, stop, matching 183-185). A cup fill plays as a static event with rising pitch. Dragging the listener left and right pans the sound; dragging away attenuates it, with the falloff curve drawn and editable (linear vs logarithmic, min and max distance). A dB meter and fader sit in the corner, starting at -20. A "bad loop" toggle adds a click at the loop point, which ties back to Sonic Colors' early loop (70).

## Bonus: Tools and workshop (slides 84-88, 198-208, 254-266)

**Re-sound a clip** (slides 254-266), effort **M**
- Teaches: capture four 15-30 second clips, replace their audio with your own, one a week for four weeks, or one 1-2 minute clip in a month (260-261). Video editing (iMovie, Clipchamp) is the designer's way to sync sound without audio programming (262-264). Noah's Need for Spirit redesign is the worked example (266).
- Proposal: a browser timeline that plays a short original grey-box gameplay loop with markers at each event (a jump, a hit, a landing, a pickup) and a palette of synthesised sounds to drag onto the markers. Playback shows whether each sound starts on its frame. It gives learners a first pass at syncing before they open a video editor, and the finished timeline exports as a cue list.

**Tools card** (slides 85-88, 200-207), effort **S**
- Teaches: researching sound sources with AI search (85, 200-201), built-in screen capture on Windows and macOS (86, 202-204), an external SSD for libraries (87, 205-206), and velcro to keep it attached to a laptop (88, 207).
- Proposal: one reference card with the capture shortcuts for each OS and links to Soundly and the royalty-free packs. Keep it short; this content dates fastest.

## Small fixes spotted while reading

- The part numbering is inconsistent with the workshop order. Slide 18 is "Part 2: The 4 Rules" but the narration says "Welcome to Part 4". Slide 56 is "Part 3" but says "Part 5". Slide 93 says "Part 6", slide 118 says "Part 3", slide 84 and 198 both say "Part 7", and slide 82 (the Guild Wars 2 story) also says "Part 7".
- Several sections appear twice: the 3 tools (84-88 and 198-208), static vs continuous (177-185 and 223-231), loudness (189 and 232-233), and the P.T. and Sonic notes are pasted onto 187 and 188 under the panning section. Slides 211-270 look like the pre-workshop course order left at the end. The roadmap slide shows two different orders (19 vs 212).
- Slide 270 is the last slide but only lists two of the four classes ("Character, Environment"), and looks like an unfinished summary.
- Video placeholders: "!!! INSERT VIDEO DEMONSTRATION" on 51, 76, 106, 108, 113, 197, 201, 203, 204, 206, 208, 241, 265 and 266. Slide 208's script is empty. Slide 61 is marked "(OUTDATED GAMEPLAY)". Slide 107 has "New Notes" and "(old notes)" side by side.
- Speaking-note boilerplate repeats on ten slides: "(make it sound personal, 1 on 1, 1st person, less TikTok personality more real person speak)". Emmanuel's review notes (15, 16, 83) are addressed to Noah and should be resolved into the narration or removed.
- Tool 1 recommends ChatGPT or Gemini to learn "what sound sources were used and how they were made" (85). Those answers are often invented; worth adding "then verify against an interview or a breakdown".
- Slide 206's script says "make sure to sign out of amazon before doing this so as not to leak personal info", which is a recording note.
- Typos: "Sounds Design Fundamentals" (1, 116), "It's primary function" (13), "direct's" (25, 187), "it's combat" (28), "Doom Deternal" (37), "trumpet/bajo duo" (38, banjo), "Hear is the" (44), "indicative on one" (58), "Infact" (63), "forgoed" (65), "if your interested" (4), "specialize and music creation" (156), "measure in decibels" (189, 232), "curios" (222), "all all on it's own" (262), "Roylaty" (112).
