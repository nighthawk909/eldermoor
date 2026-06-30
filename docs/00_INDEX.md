# 00_INDEX.md — Eldermoor MMORPG Bible (master index)

This is the table of contents and **contract** for the entire specification. The Bible is built
incrementally, one spec file at a time, each to production quality. This index is the source of
truth for what exists, what's planned, and where each system is specified. Nothing is "improvised"
in code that isn't first specified here.

**Status legend:** ✅ drafted · ✍️ in progress · 📋 planned (stub/empty) · 🔒 locked (stable)

> **Live pipeline (2026-06-28):** the playable client `eldermoor_client.html` (Three.js) loads
> Blender-authored **glTF** from `build_kit.py --export`; textures via `make_textures.py`. This
> is a working partial implementation of `30_RENDERING`/`31_CAMERA`/`38_UI_FRAMEWORK` ahead of
> their full specs. Engine decision = **web-first** (CLAUDE.md §3). See `HANDOFF.md` for state.

> Authoring rule: a spec file is "drafted" when it covers architecture, data model, dependencies,
> acceptance criteria, test plan, editor/tooling needs, and future-extension points for its system
> (per `02_AI_DEV_WORKFLOW.md`). Code for a system may not begin until its spec is at least drafted.

---

## 00–09 · Vision & process
| File | Scope | Status |
|------|-------|--------|
| `00_INDEX.md` | This master index | ✅ |
| `00_PROJECT_VISION.md` | What the game is/isn't · art direction · standards · philosophy · goals · AI workflow · architecture principles | ✅ |
| `01_GLOSSARY.md` | Canonical terms (tick, tile, chunk, AoI, etc.) | 📋 |
| `02_AI_DEV_WORKFLOW.md` | How each AI session reads/extends the Bible; the 10-stage feature process; parity guarantee + verify loop | ✅ |
| `03_IP_AND_ORIGINALITY.md` | Original-asset law, reference-only tool policy, naming/lore originality checks | 📋 |

## 10–19 · Architecture
| `10_ARCHITECTURE.md` | Monorepo, engine/content/network separation, client/server model, data flow, stack decision | ✅ |
| `11_DATA_MODEL.md` | Entity/component model, DB schema, content schemas (zod) | 📋 |
| `12_NETWORK_PROTOCOL.md` | Packet catalog, tick sync, prediction/reconciliation, AoI | 📋 |
| `13_SAVE_PERSISTENCE.md` | Player/world persistence, migrations, backup | 📋 |
| `14_BUILD_DEPLOY.md` | Build pipeline, CI/CD, environments, deployment | 📋 |

## 20–29 · Planning
| `20_ROADMAP.md` | Domain→Epic→Feature→Task→Subtask breakdown (the thousands of items) + task schema | ✍️ |
| `21_MILESTONES.md` | Milestone gates, vertical slices, release plan | 📋 |

## 30–39 · Engine / client systems
| `30_RENDERING.md` 📋 · `31_CAMERA.md` 📋 · `32_INPUT.md` 📋 · `33_TILE_WORLD.md` 📋 · `34_CHUNK_STREAMING.md` 📋 · `35_ANIMATION.md` 📋 · `36_PARTICLES.md` 📋 · `37_AUDIO.md` 📋 · `38_UI_FRAMEWORK.md` 📋 · `39_LIGHTING_FOG.md` 📋 | | |

## 40–49 · Art & content pipeline
| `40_ART_SPEC.md` | Visual recipe (currently `/ART_SPEC.md`, to migrate) | ✅ (root) |
| `41_ASSET_STANDARDS.md` | Per-asset metadata schema, naming, folders, LOD/collision | 📋 |
| `42_MODELING_SPEC.md` | Character proportions (currently `/MODELING_SPEC.md`, to migrate) | ✅ (root) |
| `43_ENVIRONMENT_KIT.md` | Modular building/world kit spec + Chapel worked example | ✅ |
| `44_CHARACTER_RIG.md` | Shared skeleton, equipment-swap system, NPC variation | ✅ |
| `45_ANIMATION_LIBRARY.md` | Reusable idle/walk/attack/death states | 📋 |
| `46_AUDIO_ASSETS.md` | Music regions, SFX categories | 📋 |
| `47_CONTENT_DATA_FORMAT.md` | Data-driven defs for items/npcs/objects/etc. | 📋 |

## 50–69 · Gameplay systems
| `50_COMBAT.md` 📋 · `51_SKILLS_XP.md` 📋 · `52_INVENTORY_EQUIPMENT.md` 📋 · `53_BANKING.md` 📋 · `54_TRADING_ECONOMY.md` 📋 · `55_NPC_AI.md` 📋 · `56_PATHFINDING.md` 📋 · `57_DIALOGUE.md` 📋 · `58_QUESTS.md` 📋 · `59_SHOPS_LOOT.md` 📋 · `60_GATHERING.md` 📋 (mining/fishing/woodcutting) · `61_PRODUCTION.md` 📋 (smithing/cooking/crafting/firemaking) · `62_MAGIC.md` 📋 · `63_RANGED.md` 📋 · `64_PRAYER.md` 📋 · `65_GROUND_ITEMS.md` 📋 · `66_SPAWNS_RESPAWN.md` 📋 · `67_PROJECTILES.md` 📋 · `68_DAMAGE_FORMULAS.md` 📋 · `69_WORLD_REGIONS.md` 📋 | | |

## 70–79 · Multiplayer / server
| `70_SERVER_TICK.md` 📋 · `71_PLAYER_SESSION.md` 📋 · `72_AREA_OF_INTEREST.md` 📋 · `73_ANTICHEAT.md` 📋 | | |

## 80–89 · Tooling / QA
| `80_EDITOR_TOOLS.md` 📋 · `81_MAP_EDITOR.md` 📋 · `82_CONTENT_EDITOR.md` 📋 · `83_TESTING_STRATEGY.md` 📋 · `84_QA_GATES.md` 📋 · `85_DEBUG_CONSOLE.md` 📋 · `86_PERF_BUDGETS.md` 📋 | | |

## 90–99 · Content design
| `90_WORLD_BIBLE_LORE.md` 📋 (original world/lore/names) · `91_TUTORIAL_ISLAND.md` ✅ (now `/ROADMAP.md` P7 + `/PARITY_AUDIT.md`) · `92_BESTIARY.md` 📋 · `93_ITEM_CATALOG.md` 📋 · `94_QUEST_DESIGNS.md` 📋 | | |

---

## Migration note
Existing root docs fold into this scheme as they're next touched: `ART_SPEC.md`→`40`,
`MODELING_SPEC.md`→`42`; the parity plan now lives in `/ROADMAP.md` (phases) + `/PARITY_AUDIT.md`
(item-level tests) → `91`; `ASSET_MANIFEST.md`/`HANDOFF.md` remain working logs. `CLAUDE.md` stays at repo root (harness-read operating law). `PROJECT_CHARTER.md`
is superseded by `00_PROJECT_VISION.md` + `10_ARCHITECTURE.md`.
