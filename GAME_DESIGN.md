# Eldermoor — Game Design

> Living document. Update it when decisions change. This is the source of truth for *what the game is*.

## Vision
An original, instant-play browser RPG in the **early-RuneScape low-poly style** (faceted, flat-shaded,
warm palette). Click-to-move, OSRS-style skills with the real XP curve, gather→process→combat loops.
Original IP throughout — we match the *feel*, never copy specific Jagex assets, names, maps, or UI.

## Pillars
1. **Instant in the browser** — no install; loads and plays on desktop and mobile.
2. **OSRS-familiar systems** — recognizable skills, levels, inventory, combat triangle.
3. **Original & cohesive** — one consistent art style (see `MODELING_SPEC.md`), our own world/lore.
4. **Always playable `main`** — every merge keeps the live preview working.

## Current content — Tutorial Island (shipped in `index.html`)
Walkable island (grass/sand/sea). Guided objective chain with a beacon over the next target:
talk to Guide → Woodcutting (tree→Logs) → Firemaking (light fire) → Fishing (Raw shrimp) →
Cooking (Shrimp) → Mining (Ore) → Smithing (Bronze dagger) → Melee (combat dummy) →
kill Giant rat (Bones) → Prayer (bury bones) → Ranged (target) → Magic (Wind Strike) →
Crafting (table) → board the Boat (finish). HUD: skills panel, inventory, objective banner,
chat log, floating XP, combat hitsplats.

## Skills (15)
| Skill | Trained by (tutorial) | Base XP | Notes |
|---|---|---|---|
| Attack | hitting dummy / rat | 4/hit | melee accuracy (future) |
| Strength | hitting dummy / rat | 4/hit | melee damage (future) |
| Defence | hitting dummy / rat | 4/hit | damage reduction (future) |
| Hitpoints | any combat | 2/hit | **starts at level 10** (OSRS rule) |
| Ranged | archery target | 30 | projectile feedback |
| Magic | practice dummy (Wind Strike) | 35 | needs runes (future economy) |
| Prayer | bury Bones / altar | 12–20 | bones from kills |
| Woodcutting | chop Tree | 25 | yields Logs |
| Firemaking | light Logs (Tinderbox) | 40 | consumes Logs |
| Fishing | Fishing spot | 30 | yields Raw shrimp |
| Cooking | cook on fire | 30 | Raw shrimp → Shrimp |
| Mining | Copper rock | 35 | yields Ore |
| Smithing | Anvil | 50 | Ore → Bronze dagger |
| Crafting | Crafting table | 25 | yields a craftable |

XP curve: real OSRS table (precomputed in `skills.js`), levels 1–99, `levelFromXp(xp)`.

## Combat model (current → intended)
- **Now:** click a mob → auto-walk into range → fixed-interval hits → random 1–3 dmg → hitsplats →
  on death drop loot + respawn after ~6s. XP split across Attack/Strength/Defence + Hitpoints.
- **Intended:** accuracy/max-hit derived from levels + equipped gear; the melee/ranged/magic triangle;
  monster combat levels; food healing; basic prayer effects.

## Data-driven design (why parallel work is possible)
- **Stations** (anything interactable) are entries in `STN` (`world.js`): `{id,pos,obj,kind,skill,xp,
  give,need,dur,verb,...}`. Adding content = adding data, not engine changes.
- **Quests/objectives** are entries in `STEPS` (`quests.js`). The tutorial is just the first quest.
- New skills register in `SKILLS` (`skills.js`) + a station that trains them.
Keep this discipline: features add **data + their own module**, so branches rarely touch the same lines.

## Roadmap (backlog — pull the top item, don't do all at once)
1. **Modularize** (`refactor/modularize`) — prerequisite for everything below. *(Phase 2)*
2. **Bigger overworld + town** — leave the island by boat into a starter town: paths, buildings,
   shop NPC, a few training areas. Proper (even grid-based) pathing so you can't clip props.
3. **Bank + persistence** — a bank chest; save inventory/skills. *(Deployed site may use `localStorage`;
   note: Claude artifacts cannot — test persistence on the Vercel deploy, not in an artifact preview.)*
4. **Real combat + gear** — level-based accuracy/damage, equippable weapons/armor, monster combat levels,
   food healing, the combat triangle.
5. **Quest system + storyline** — data-driven multi-step quests with dialogue gates, rewards, a journal.
6. **Dialogue trees** — branching NPC conversations (`dialogue.js`) with conditions.
7. **More skills depth** — higher-tier resources (oak/willow, iron/coal), recipe trees.
8. **Audio** — original SFX/music; ambient loops.
9. **Asset import** — pull hero/props from the Blender pipeline (`assets/pipeline/`) as glTF when ready.

## Open questions (decide before the relevant feature)
- Persistence backend: `localStorage` only, or a tiny server / Supabase for cross-device saves?
- Multiplayer: out of scope for now — keep systems single-player-clean but not multiplayer-hostile.
- Map authoring: hand-placed data vs. a small JSON map format loaded at runtime.
