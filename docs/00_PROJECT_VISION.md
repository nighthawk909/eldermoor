# 00_PROJECT_VISION.md — Eldermoor

The highest-leverage document. Everything else descends from this. If a decision anywhere in the
project contradicts this file, this file wins (below CLAUDE.md operating law).

_Owner directive, codified 2026-06-28._

---

## 1. What Eldermoor IS

A **production-quality, original MMORPG** that recreates the *feel, depth, and timeless design
principles* of a classic 2004-era MMORPG — built with **100% original** code, art, names,
characters, locations, lore, and assets. The intent is the **definitive open-source spiritual
successor** to that era of game: low-poly, readable, deep, social, skill-driven.

- Browser-instant play (the genre's DNA).
- Tile-based world, tick-based simulation, authoritative multiplayer.
- A wide, interlocking skill/economy/combat sandbox, not a linear themepark.

## 2. What Eldermoor IS NOT

- **Not a clone.** We never reproduce RuneScape's specific expression: its models, textures,
  maps (Gielinor/Varrock/Lumbridge), item/UI designs, music, names, or logos. No "make the OSRS
  goblin." Yes "a goblin-like enemy." Style/genre/mechanics aren't copyrightable; specific
  assets and names are. We stay on the original side of that line. (Full policy: `03_IP_AND_ORIGINALITY.md`.)
- **Not a prototype.** The goal is a clean, modular, documented architecture that supports years
  of expansion — not a tech demo.
- **Not modern-stylized.** Not Fortnite/WoW/Unreal-Marketplace/Unity-Asset-Store looking. If it
  couldn't have plausibly existed in 2004, it's wrong.

## 3. Art direction (retro low-poly fantasy)

The executable recipe is `40_ART_SPEC.md`; the principles:

- Extremely low-poly (100–1200 tris by object class), **flat shading over PBR**, minimal
  hand-painted textures (slight stretching OK), strong silhouettes, chunky proportions.
- Limited **earthy** palette, medieval fantasy. **No** bloom/motion-blur/realistic lighting.
  Vertex lighting preferred, simple shadow maps, low draw distance + atmospheric fog.
- Tile-based terrain, large instantly-readable objects. Every asset identifiable at a glance.
- Characters: simple faces, minimal features, large readable equipment that **swaps visually**.
  NPCs **share skeletons and reuse animations**, differing by proportions/clothing/colors/accessories.

## 4. Gameplay philosophy

- **Depth through interlocking simple systems**, not complexity for its own sake. Classic-MMO
  legibility: the player can always understand what an action does.
- **Skill-driven sandbox:** gathering → production → combat → economy loops that feed each other.
- **Everything data-driven.** Items, NPCs, objects, skills, loot, dialogue, quests, spawns,
  shops are *content* (editable config), never hardcoded logic.
- **Social & persistent.** Multiplayer-first; the world persists; the economy is player-driven.
- Full system surface (specified across `50–69`): Inventory, Equipment, Skills, Combat
  (melee/ranged/magic), NPC AI, Dialogue, Banking, Trading, Crafting, Mining, Fishing,
  Woodcutting, Smithing, Cooking, Firemaking, Prayer, Quests, Shops, Ground items, Loot tables,
  Respawn, Aggro, Pathfinding, Regions, Chunk streaming, Tile collision, Projectiles, Damage,
  XP curves, Economy, Spawns, Audio, UI, Camera, Save, Networking, Animation, Particles, Weather,
  Day/night.

## 5. Technical standards

- **Component-based, data-driven, configurable, modular**; loose coupling, high cohesion; no
  duplicated logic; never hardcode gameplay values.
- **Hard separation of layers:** engine ↔ rendering ↔ networking ↔ gameplay ↔ content. A change
  in one must not require edits across all.
- **Authoritative server, tick-based** simulation (classic-MMO model). Client renders + predicts.
- Performance, networking, and save/load are first-class for *every* feature, not afterthoughts.
- Detailed architecture: `10_ARCHITECTURE.md`.

## 6. Coding standards

- Never hardcode; everything configurable. Composition over inheritance. DRY.
- Separate gameplay logic from rendering; networking from gameplay; content from engine.
- Every feature ships with: documentation, config, tests (unit + integration), editor support,
  debug commands, logging, validation, error + recovery handling, performance analysis, network +
  save/load compatibility, localization + accessibility hooks, and explicit future-extension points.

## 7. AI development workflow

This project is built by AI sessions working from this Bible. Per-feature, **before any code**:
identify dependencies · identify every future consumer · identify expansion opportunities ·
decide if a reusable framework must exist first · decide if editor tooling is needed · decide
engine-code vs game-content placement. If a dependency is missing, **build the dependency first.**

Then the **10-stage process** (never skip a stage): Analyze → Architect → Design → Document →
Build → Test → Refactor → Benchmark → Verify → Mark Complete. Reconciled with CLAUDE.md: work in
**small verified chunks**, each fully completing these stages for its slice. Detail: `02_AI_DEV_WORKFLOW.md`.

## 8. Definition of "complete"

A feature is NOT complete because it works. It is complete only when: ✓ documented · ✓ tested
· ✓ modular · ✓ performant · ✓ reusable · ✓ expandable · ✓ integrates with every related system
· ✓ no known architectural issues · ✓ matches the 2004-MMO aesthetic · ✓ original work. If any
box is unmet, keep refining. (Gates: `84_QA_GATES.md`.)

## 9. Project goals

Build a clean, organized, scalable, **enjoyable-to-extend** codebase + content library that feels
as if a AAA studio built it over years. Optimize for **completeness, maintainability, modularity,
expandability, performance, readability, reusability, long-term scalability** — never for speed.
The recurring question is never "how do I finish this fast?" but **"what would a AAA MMO studio do
with unlimited time?"**
