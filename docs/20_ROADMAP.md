# 20_ROADMAP.md — Eldermoor implementation roadmap

The complete work breakdown: **Domain → Epic → Feature → Task → Subtask**, targeting thousands of
discrete completion items. This file defines the *system* and the *full domain map*; each domain's
deep task tree is expanded into its own section/file incrementally (see "Expansion plan" below).
No system is implemented before its tasks exist here and its spec is drafted in the Bible.

_Started 2026-06-28._

---

## 1. Task schema

Every leaf task is one row:

| Field | Meaning |
|-------|---------|
| **ID** | `DOMAIN-EE.FF.TT` — Domain code, Epic, Feature, Task (e.g. `TILE-01.02.03`) |
| **Title** | Imperative, specific |
| **Layer** | `engine` / `client` / `server` / `shared` / `content` / `tool` / `asset` |
| **Deps** | Task IDs that must complete first |
| **Spec** | Bible file(s) that govern it |
| **Acceptance** | Concrete pass condition |
| **Tests** | Unit / integration / none-justified |
| **Status** | 📋 todo / ✍️ doing / ✅ done |

A task is `✅` only when it meets the `00_PROJECT_VISION` §8 definition of complete.

## 2. Domain map (all domains)

| Code | Domain | Primary spec | Phase |
|------|--------|--------------|-------|
| FND | Foundation (monorepo, schemas, CI, validators) | `10`,`11`,`14` | 1 |
| RENDER | Rendering (faceted pipeline, batching, fog) | `30`,`39` | 3 |
| CAM | Camera (RS orbit, zoom, collision) | `31` | 3 |
| INPUT | Input (mouse/touch, right-click menus) | `32` | 3 |
| TILE | Tile world (grid, collision, heightmap) | `33` | 1/3 |
| CHUNK | Chunk streaming / regions | `34`,`69` | 7 |
| ANIM | Animation controller + library | `35`,`45` | 2/3 |
| FX | Particles | `36` | 7 |
| AUDIO | Audio (music regions, ambient, SFX) | `37`,`46` | 5 |
| UI | UI framework + panels (tabs, chat, minimap, world map, tooltips) | `38` | 3 |
| ART | Art pipeline + ENV kit + character rig | `40`–`45` | 2 |
| CONTENT | Content data format + loaders | `47`,`11` | 1 |
| COMBAT | Combat (melee/ranged/magic, damage, projectiles) | `50`,`62`,`63`,`67`,`68` | 5 |
| SKILL | Skills + XP curves | `51` | 5 |
| INV | Inventory + equipment | `52` | 5 |
| BANK | Banking | `53` | 5 |
| ECON | Trading + economy | `54` | 5 |
| NPC | NPC AI + aggro + spawns/respawn | `55`,`66` | 5 |
| PATH | Pathfinding | `56` | 4 |
| DLG | Dialogue | `57` | 5 |
| QUEST | Quests | `58` | 5 |
| SHOP | Shops + loot tables + ground items | `59`,`65` | 5 |
| GATHER | Gathering (mining/fishing/woodcutting) | `60` | 5 |
| PROD | Production (smithing/cooking/crafting/firemaking) | `61` | 5 |
| PRAY | Prayer | `64` | 5 |
| NET | Networking (packets, prediction, AoI) | `12`,`70`–`72` | 4 |
| PERSIST | Save / persistence / DB | `13` | 4 |
| SESS | Player session / login | `71` | 4 |
| SEC | Anti-cheat / validation | `73` | 4 |
| TOOL | Editor tools (map, content, asset validator, debug console) | `80`–`82`,`85` | 1/8 |
| QA | Testing strategy, QA gates, perf budgets | `83`,`84`,`86` | all |
| WORLD | World/lore/regions/bestiary/items/quests content | `90`–`94` | 6/7 |
| TUT | Tutorial Island vertical slice | `91` | 6 |
| WEATHER | Weather + day/night | (TBD) | 7 |

## 3. Worked example — FND (Foundation) fully broken down

This domain is the dependency root and is expanded here as the **granularity pattern** all other
domains follow.

### Epic FND-01 — Monorepo & build
- `FND-01.01.01` Init workspace (pnpm) with `packages/{shared,content,server,client,tools}` — *tool* — Deps: — — Accept: `pnpm -r build` runs. Tests: none-justified. 📋
- `FND-01.01.02` TypeScript project refs + strict config shared across packages — *tool* — Deps: 01 — Accept: cross-package import type-checks. 📋
- `FND-01.01.03` Vite client app boots blank scene; tsx server boots empty tick loop — *client/server* — Deps: 02 — Accept: both `dev` scripts run. 📋
- `FND-01.01.04` ESLint + Prettier + import-boundary lint (forbid client↔server imports) — *tool* — Deps: 02 — Accept: boundary violation fails lint. 📋

### Epic FND-02 — Shared schemas & content format
- `FND-02.01.01` zod schema: `ItemDef` (id, name, examine, stackable, equipable, slot, verbs, icon, model) — *shared* — Spec `47`,`52` — Accept: invalid def rejected w/ path. Tests: unit. 📋
- `FND-02.01.02` zod schema: `NpcDef` (id, name, examine, combat stats, anims, model, drops) — *shared* — Spec `47`,`55` — 📋
- `FND-02.01.03` zod schema: `ObjectDef` (id, name, examine, interactions, model, collision) — *shared* — 📋
- `FND-02.01.04` zod schema: `SkillDef` + XP curve table generator — *shared* — Spec `51` — 📋
- `FND-02.02.01` Content loader: load+validate all `/content/*.json` at boot, fail-fast w/ report — *shared* — Accept: one bad file names the field. Tests: unit+integration. 📋

### Epic FND-03 — Asset metadata validator
- `FND-03.01.01` Define asset metadata schema (`41_ASSET_STANDARDS`) as zod — *shared* — 📋
- `FND-03.01.02` CLI: scan `/assets`, assert every asset has valid sidecar metadata — *tool* — Accept: missing/invalid metadata fails CI. 📋

### Epic FND-04 — Test & CI harness
- `FND-04.01.01` Vitest config per package; sample passing test — *tool* — 📋
- `FND-04.01.02` CI: typecheck + lint + test + asset-validate on push (extend `.github/workflows`) — *tool* — Spec `14`,`84` — 📋
- `FND-04.01.03` Coverage reporting; gate ≥80% on `shared` rules — *tool* — Spec `83` — 📋

*(FND continues; every other domain gets this same Epic→Feature→Task depth in its expansion.)*

## 4. Expansion plan

Each domain's full task tree is authored to FND's depth before that domain's code begins (Bible
contract, `00_INDEX`). Recommended order = the phases in `10_ARCHITECTURE` §7. Domains within a
phase can be expanded in parallel (independent), which makes this an ideal multi-agent fan-out
job — one author per domain — when the owner opts into that scale. Until then, expanded
sequentially, highest-leverage first: **FND → CONTENT → ART → TILE → UI → NET/PERSIST → gameplay.**

Target depth: ~30 domains × ~6 epics × ~5 features × ~5 tasks ≈ **4,500–9,000 leaf tasks**, plus
subtasks where a task is non-trivial.
