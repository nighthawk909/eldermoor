# ASSET_MANIFEST.md — Tutorial Island (Eldermoor)

The complete list of every asset Tutorial Island needs for OSRS parity, grouped by type, with
counts and status. Built through the `build_kit.py` factory (Blender → glTF → web client).
Names are **original Eldermoor designs** in the OSRS *roles* (never Jagex's names/models).

_Created 2026-06-28. Status: `done` / `partial` / `todo`._

**Headline counts**
| Category | Distinct assets |
|---|---|
| NPCs (humanoid, dialogue) | 13 (10 instructors + Aldric + ~2 ambient) |
| Mobs (creatures) | 3 types (~7 instances) |
| Buildings / structures | 9 |
| Functional fixtures (interactable) | 17 |
| Props & set dressing | ~27 |
| Foliage & nature | 8 |
| Terrain & world systems | 7 |
| Items (inventory / equipment) | ~31 |
| **Total unique 3D meshes (excl. item icons)** | **≈ 75** |

The character factory (`build_humanoid`) already produces most instructor *bodies* — what's left
is per-NPC spec tweaks, names, dialogue, and placement.

---

## 0. Variation system — "how many assets just for that"

We author a **base mesh + small palettes**, then generate distinct NPCs/mobs/props from *data*.
No new geometry per variant. This is the scale lever.

### NPCs (`build_humanoid` + `villager(seed)`)
| What we AUTHOR (one-time) | Count |
|---|---|
| Base humanoid mesh method | 1 |
| Skin tones | 6 |
| Hair colors | 8 |
| Clothing (tunic/robe) colors | 10 |
| Leg colors | 6 |
| Beard colors (+none) | 4 (+1) |
| Build (shoulder width) | 3 |
| **Total authored data points** | **~37 + 1 mesh** |

**Distinct NPCs this yields:** 6·8·10·6·3 = **8,640** base outfits → ×beard(5)·robe(2)·cape(11)
≈ **950,000+** visually distinct townsfolk. Plus hats/hoods/props for special roles. Effectively
unlimited — **every new villager dropped in the world costs 0 new geometry** (just a seed or spec).

### Mobs
Per type: 1 base mesh + a fur/feather palette + size scalars. e.g. rat = 1 mesh + 4 fur tones ×
3 sizes = **12 variants**; chicken = 1 mesh + 3 feathers × 2 sizes = 6. ~6 mob meshes + ~30
palette entries → **dozens of distinct creatures**.

### World assets
Same pattern: a kit piece + palette × scale × random rotation. e.g. tree = 1 mesh + 4 foliage
greens × 3 scales + free rotation → **dozens of unique trees** from one mesh. Buildings = a few
kit pieces (wall/floor/roof/door) × 2 wall materials × 2 roof colors → many distinct structures.

**Bottom line:** authoring ≈ **a few dozen meshes + a few dozen palette entries** covers an
entire populated island — not thousands of hand-built assets.

---

## 1. NPCs — humanoid, dialogue-bearing (13)

| # | Name (Eldermoor) | OSRS role | Teaches | Body spec | Status |
|---|---|---|---|---|---|
| 1 | **Warden Halric** | Guide | controls, settings, UI tabs; departure | `guide` | partial (spec) |
| 2 | **Forester Maeve** | Survival Expert | woodcutting, firemaking, fishing, cook-on-fire | new spec | todo |
| 3 | **Cook Tobin** | Master Chef | cooking, bread dough | `chef` | partial (spec) |
| 4 | **Loremaster Edda** | Quest Guide | quest journal/tab | new spec | todo |
| 5 | **Pickmaster Doran** | Mining Instructor | mining, smelting, smithing | `miner` | partial (spec) |
| 6 | **Sergeant Vael** | Combat Instructor | melee, ranged, equipment | `guard` | partial (spec) |
| 7 | **Teller Wynn** | Banker | banking | `banker` | partial (spec) |
| 8 | **Steward Brann** | Account Guide | account mgmt, poll booth | new spec | todo |
| 9 | **Brother Aldric** | Brother Brace | prayer, friends/ignore | `monklike` | **done** (in client) |
| 10 | **Magus Sorrel** | Magic Instructor | magic, runes, Wind Strike | `wizard` | partial (spec) |
| 11–13 | **Ambient townsfolk** ×2–3 | — | life/atmosphere | factory recolors | todo |

## 2. Mobs — creatures (3 types, ~7 instances)

| # | Mob | Where / use | Instances | Status |
|---|---|---|---|---|
| 1 | **Giant rat** | combat pen — melee + ranged target | 3–4 | partial (prototype built; scale up to "giant") |
| 2 | **Chicken** | magic area — Wind Strike target | 1–2 | todo |
| 3 | **Pen rats (small)** | dressing/ambience | 1–2 | optional |

## 3. Buildings / structures (9)

| # | Structure | Houses | Status |
|---|---|---|---|
| 1 | **Spawn house** (Guide) | lesson L1 | todo |
| 2 | **Cook's house** | L6 (range, table) | todo |
| 3 | **Quest Guide's house** | L7 | todo |
| 4 | **Bank building** | L13 (booths) | todo |
| 5 | **Chapel** | L15 (altar) | **done** (`chapel.glb`) |
| 6 | **Wizard's tower/house** | L16 (magic) | todo |
| 7 | **Mine** (underground cavern shell + ladders) | L8–L10 | todo |
| 8 | **Combat enclosure** (rat pen + gate) | L11–L12 | todo |
| 9 | **Departure jetty / dock** | L17 | todo |

## 4. Functional fixtures — interactable, wired to lessons (17)

| # | Fixture | Lesson | Status |
|---|---|---|---|
| 1 | **Doors** (openable, gate progress) ×~6 | all rooms | todo |
| 2 | **Gates** (zone barriers) ×~3 | flow | todo |
| 3 | **Ladder down** + **ladder up** | L8 / L10 | todo |
| 4 | **Tree** (choppable) ×2–3 | L2 | partial (foliage tree exists in old proto) |
| 5 | **Fishing spot** (ripple) | L4 | todo |
| 6 | **Fire** (firemaking result / cook) | L3, L5 | todo |
| 7 | **Range / stove** | L6 | todo |
| 8 | **Furnace** (smelting) | L9 | todo |
| 9 | **Anvil** (smithing) | L10 | todo |
| 10 | **Tin ore rock** | L8 | todo |
| 11 | **Copper ore rock** | L8 | todo |
| 12 | **Bank booth** ×1–2 | L13 | todo |
| 13 | **Poll booth** | L14 | todo |
| 14 | **Altar** | L15 | **done** (in chapel) |
| 15 | **Pipe organ + candle stands** | chapel dressing | **done** |
| 16 | **Spellcasting target** (or the chicken) | L16 | todo |
| 17 | **Departure boat** | L17 | todo |

## 5. Props & set dressing — non-interactive (~27)

Tables · chairs · stools · beds · benches · candles/torches · wall sconces · rugs · shelves ·
bookshelf · barrels · crates · sacks · pots/cauldron · cooking pot · bread-on-board · flour sack ·
fishing barrels · mining cart · weapon rack · signposts · lamp posts · well · hay bales ·
banners ✓ · fences (decorative) · wall hangings.
Status: **banners done**; rest todo. (Many are quick kit pieces.)

## 6. Foliage & nature (8)

Standard tree · swamp/canopy tree · bush · reeds (pond) · ground rocks · flowers/grass tufts ·
lily pads · mushrooms/fallen logs. — todo (faceted, per ART_SPEC; not icosphere blobs).

## 7. Terrain & world systems (7)

1. **Island landmass** — authentic Tutorial Island silhouette, heightmap relief.
2. **Surrounding sea** + **beach/sand** transition.
3. **Central pond** (survival area).
4. **Dirt paths** between zones.
5. **Fences / walls / barriers** channeling movement (ties to gating).
6. **Sky + lighting/grade** (warm key, AgX-Punchy feel) — done in client.
7. **Walkability/collision grid** — partial (chapel collision done in client).

## 8. Items — inventory / equipment (~31; 2D icons + a few world models)

- **Tools (4):** Bronze axe · Tinderbox · Small fishing net · Bronze pickaxe
- **Food chain (8):** Logs · Raw shrimp · Shrimp · Burnt shrimp · Pot of flour · Bucket of water · Bread dough · Bread
- **Smithing (5):** Tin ore · Copper ore · Bronze bar · Bronze dagger · Hammer
- **Combat gear (6):** Bronze sword · Wooden shield · Leather body · Leather gloves · Shortbow · Bronze arrows
- **Prayer/Magic (3):** Bones · Air rune · Mind rune
- **Misc (5):** Coins · Quest journal · Security/poll card · Map · Tutorial cape (departure)

---

## What's already done

- **Chapel** building + altar + organ + banners + candle stands (`chapel.glb`).
- **Brother Aldric** monk — placed, tappable, dialogue (in client).
- **Player** avatar — rigged, walks (`player.glb`).
- **Character factory** `build_humanoid` — covers ~7 of 10 instructor bodies via specs.
- **Giant rat** mob prototype.

## Suggested build order (asset side)

1. Finish the **instructor roster** (3 missing specs + names + dialogue), export to `assets/npcs/*.glb`.
2. **Buildings** via the kit: spawn house → cook's → quest → bank → wizard → mine → combat pen → dock.
3. **Functional fixtures** (per building, as each lesson needs them).
4. **Foliage + terrain** (island shape, pond, paths) — the open-world look.
5. **Props/dressing** pass per room.
6. **Mobs** (giant rat scale-up + chicken).
7. **Item icons** (2D) — generated alongside the inventory/lesson wiring.

---

## 9. Character-model sub-track (hero / townsfolk / monster — `build_eldermoor.py`)

> Merged in from the retired `MANIFEST.md` (2026-06-29). This is the **high-fidelity character-asset**
> line (Cycles look-judgment stills), distinct from the in-client glTF NPCs above. The refined hero feeds
> the client later (export to glTF, CLAUDE.md §3). DoD shorthand: continuous mesh (no primitive seams/gaps),
> substance materials (not flat plastic), textured face/skin, correct silhouette, clean GPU render.

### Hero (Adventurer) — `build_eldermoor.py` *(active sub-track)*
Current state: approved blockout exists but reads as stacked primitives with flat colours and a
geometry-only face. Rebuild to standard, chunk by chunk.

| # | Chunk | Definition of Done | Status |
|---|-------|--------------------|--------|
| A1 | Head mesh | Skull + features joined into one mesh; doubles welded; hybrid smooth/facet; chin/nose/brow silhouette intact; no floating parts | todo |
| A2 | Face texture | Painted skin/eyes/brows/mouth texture (code-generated) UV-mapped to the head front; reads as a face at 1m | doing |
| A3 | Body mesh | Torso/shoulders/sleeves joined; waist seam gone; sleeve↔shoulder gaps closed; hands resized/shaped | todo |
| A4 | Materials | Procedural cloth/leather/steel/skin with bump + roughness; no flat plastic | todo |
| A5 | Gear pass | Sword/shield/cape refined; cape cloth shading + drape; shield face detailed | todo |
| A6 | Beauty + turntable | Final hero render 1800×2250/384 + an N-frame turntable | todo |

### Other characters
- **Townsfolk (Merchant):** reuse A1–A4; robe silhouette, distinct from hero. — todo
- **Hostile (Forest Brute):** original hunched brute; reuse methods; tusks/claws as joined geometry. — todo
- **Cast lineup + world:** lineup render of all three, then a town/zone using the world palette. — todo

> Note: the **in-client** instructor/NPC bodies are produced by the separate `build_humanoid` factory
> (ASSET_MANIFEST §0–§1) and are the parity-critical path; this hero sub-track is the look-ceiling line.
