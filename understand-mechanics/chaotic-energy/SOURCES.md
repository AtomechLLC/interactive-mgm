# Mists of Pandaria Destruction Warlock: the numbers

Data behind `chaotic-energy/` (deck slides 224 and 256, "Limiting Player Actions: Destruction Warlock & Chaotic Energy"). Everything is patch 5.4.8 unless noted. All of it lives in `R` at the top of `destro.js`.

## Sources

- **SimC**: SimulationCraft tag [`release-548-8`](https://github.com/simulationcraft/simc/tree/release-548-8), the last 5.4.8 build. Spell data from [`engine/dbc/sc_spell_data.inc`](https://github.com/simulationcraft/simc/blob/release-548-8/engine/dbc/sc_spell_data.inc) (game build 18414), ember logic from [`engine/class_modules/sc_warlock.cpp`](https://github.com/simulationcraft/simc/blob/release-548-8/engine/class_modules/sc_warlock.cpp), rotation from [`profiles/Tier16H/Warlock_Destruction_T16H.simc`](https://github.com/simulationcraft/simc/blob/release-548-8/profiles/Tier16H/Warlock_Destruction_T16H.simc).
- **Wowhead**: MoP Classic tooltips, e.g. [Chaos Bolt 116858](https://www.wowhead.com/mop-classic/spell=116858), [Chaotic Energy 111546](https://www.wowhead.com/mop-classic/spell=111546). Spell ids below link the same way.
- **Warcraft Wiki**: [Burning Embers](https://warcraft.wiki.gg/wiki/Burning_Embers) (4 embers of 10 partial embers, Shadowburn hotfixes).

## Resource

| What | Number | Source |
| --- | --- | --- |
| Chaotic Energy (111546) | Replaces Life Tap. Mana regen +625% (effect 1), haste also raises regen; Incinerate, Conflagrate, Immolate mana cost +300% (effect 2); global cooldown −0.5 s, so 1.5 s → 1.0 s (effect 3, SimC `trigger_gcd += effectN(3)`) | Wowhead tooltip, SimC spell data |
| Mana at level 90 | 300,000 base mana, 15,000 mp5 base regen (SimC `gt_octbase_mpby_class`, `gt_base_mp5`); warlock regen is divided by spell speed, so haste raises it. With Chaotic Energy: 3,000/s × 7.25 × 1.10 haste ≈ 23,900/s. Costs (% of base mana, after ×4): Incinerate 20 (14 with Backdraft), Immolate 12, Conflagrate 4, Havoc 4, Dark Soul 5; Chaos Bolt and Shadowburn 0 | SimC `sc_extra_data.inc`, `sc_scale_data.inc`, `warlock_t::mana_regen_per_second` |
| Burning Embers (108647) | 4 embers, 10 bits each (SimC stores 0.1 per bit, max 4.0). Fights start with 1 ember (`initial_burning_embers( 1 )`) | Warcraft Wiki, SimC |
| Ember spenders | Chaos Bolt, Shadowburn, Ember Tap: 10 bits (power type 14, cost 10). Fire and Brimstone versions of Incinerate, Conflagrate, Immolate: 10 bits each | SimC spellpower data |

## Generators

| Spell | Cast | Damage | Bits | Source |
| --- | --- | --- | --- | --- |
| Incinerate (29722) | 2.0 s | 1645 + 1.54 × SP | +1, +2 on a crit; 15% chance of +1 more (hotfix 2013-09-13) | SimC `incinerate_t::impact` |
| Conflagrate (17962) | instant, 2 charges, 12 s recharge | 1843 + 1.725 × SP | same as Incinerate; grants 3 Backdraft | SimC `conflagrate_t` |
| Immolate (348) | 1.5 s | 502 + 0.47 × SP, then 502 + 0.47 × SP every 3 s for 15 s | +1 only when the hit or a tick crits | SimC `immolate_t` |
| Rain of Fire (104232) | instant, 25% base mana, 8 s | AoE | each hit: 12.5% chance of +2 | SimC `rain_of_fire_tick_t` (not simulated) |
| Shadowburn kill | | | 2 embers if the target dies within 5 s (hotfix 2013-03-05) | Warcraft Wiki (not simulated) |

## Spenders and cooldowns

| Spell | Numbers | Source |
| --- | --- | --- |
| Chaos Bolt (116858) | 3.0 s cast, 1 ember. 2488–3040 base (avg 2764) + 2.5875 × SP. Always crits (SimC `crit_chance` returns 1.0) and damage × (1 + spell crit) | Wowhead, SimC `chaos_bolt_t` |
| Shadowburn (17877) | instant, 1 ember, target under 20%. 3365–4112 base + 3.5 × SP. Restores 15% mana after 5 s | Wowhead, SimC |
| Backdraft (117828) | Conflagrate gives 3 stacks (max 6), 15 s. Incinerate −30% cast time and mana, uses 1; Chaos Bolt −30% cast, uses 3 (Pyroclasm) | Wowhead, SimC |
| Havoc (80240) | 25 s cooldown, 15 s: next 3 single-target spells, or 1 Chaos Bolt, also hit the Havoc target | Wowhead, SimC (`havoc_consume = 3` on Chaos Bolt) |
| Fire and Brimstone (108683) | toggle; Immolate, Incinerate, Conflagrate cost 1 ember each and hit all targets within 10 yd for 35% (+mastery) | Wowhead (not simulated) |
| Ember Tap (114635) | 1 ember: heal 15% of max health (+mastery) | Wowhead (not simulated) |
| Dark Soul: Instability (113858) | +30% crit for 20 s, 2 min cooldown, off the global cooldown | Wowhead, SimC |
| Mastery: Emberstorm (77220) | per mastery point: ember spenders +3%, fillers +1% (tooltip at 8 points: 24% and 8%) | Wowhead, SimC |

## Rotation (SimC 5.4.8, single target)

1. Dark Soul on cooldown.
2. Havoc on the second target, if there is one.
3. Shadowburn if more than 3.5 embers, Dark Soul is up, Havoc is up, or the target is about to die.
4. Immolate when it is about to fall off.
5. Conflagrate at 2 charges.
6. Chaos Bolt if fewer than 3 Backdraft stacks and (more than 3.5 embers, or Dark Soul is up). Or with 3 Havoc stacks.
7. Conflagrate.
8. Incinerate.

The "Spend at once" option drops the 3.5-ember and Dark Soul conditions. Trinket, potion, Skull Banner and pet lines are left out.

## Illustrative, not from the game

- The character: 20,000 spell power, 25% crit, 16 mastery points, 10% haste. Spell crits deal 200%.
- No travel time, misses or pets. Haste shortens casts and Immolate's tick interval but not the 1.0 s global cooldown.
- Immolate refreshes carry over up to half the duration.
- The comparison of "Pool for Dark Soul" and "Spend at once" averages 12 seeded 5-minute fights each. It comes out within about 1%: pooling gains a little, which matches 5.x, where pooling mattered mostly for trinket procs and Havoc.
- The Chaotic Energy regen slider is a what-if: 100% is the 5.4 value. Below about 75% mana runs dry in a minute and the warlock stands idle or spends embers early, since Chaos Bolt costs no mana.
