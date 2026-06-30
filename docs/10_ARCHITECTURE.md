# 10_ARCHITECTURE.md — Eldermoor system architecture

How the whole thing fits together. Descends from `00_PROJECT_VISION.md` §5. Detailed sub-specs:
`11_DATA_MODEL`, `12_NETWORK_PROTOCOL`, `13_SAVE_PERSISTENCE`, `14_BUILD_DEPLOY`.

_Codified 2026-06-28._

---

## 1. Stack decision (the one expensive-to-reverse call)

**Decision: a TypeScript monorepo — authoritative Node game server + Three.js web client +
shared, data-driven content packages. Assets authored in Blender → glTF.**

Rationale (vs Unity/Godot, which CLAUDE.md left open):
- A tile-based, tick-based, low-poly MMO is *exactly* what the web stack does well — OSRS itself
  was a browser/Java tick game. We don't need a heavy 3D engine for this fidelity.
- **One language** (TypeScript) across client/server/shared kills serialization-mismatch bugs and
  lets item/NPC/packet types be shared and data-driven.
- **Browser-instant play** preserved (genre DNA, `00_PROJECT_VISION` §1).
- Keeps the **already-validated** Three.js client + Blender→glTF pipeline (proven on the stone/
  wood kit corner, 2026-06-28). No throwaway.
- Unity/Godot buy nicer built-in editors at the cost of browser-instant, engine lock-in, and a
  language split — not worth it at this art tier. We build our own web-based editor tools (`80–82`).

> If this is ever overridden, it invalidates large parts of `30–39`, `70–79`, and `80–89`. Treat
> as locked unless the owner reopens it.

## 2. Monorepo layout

```
/packages
  /shared    — types, content schemas (zod), constants, RNG, tick math, damage formulas
               (imported by BOTH client and server; the single source of truth for rules)
  /content   — data-driven defs (JSON/typed): items, npcs, objects, skills, loot, dialogue,
               quests, spawns, shops, recipes. NO logic — pure data validated against /shared schemas.
  /server    — authoritative simulation: 600ms tick loop, world state, AI, pathfinding,
               combat resolution, networking, persistence. Owns truth.
  /client    — Three.js renderer, scene/asset loader (glTF), camera, input, UI, client-side
               prediction + reconciliation. Renders state; never authoritative.
  /tools     — web-based editor tooling: asset-metadata validator, map editor, content editors,
               debug console.
/assets      — Blender sources (build_*.py), exported glTF, textures. The art pipeline (40–47).
/docs        — this Bible.
```

Layer law (enforced by package boundaries): `content` depends on `shared`; `client`/`server`
depend on `shared` (+ load `content`); `client` and `server` **never** import each other.
Rendering code lives only in `client`; gameplay rules live in `shared`/`server`, never in render code.

## 3. Runtime model

- **Authoritative server, fixed 600ms tick** (classic-MMO cadence; `70_SERVER_TICK`). Each tick:
  ingest inputs → run AI/movement/combat/skills → resolve → broadcast deltas to clients in range.
- **Client:** renders interpolated state at display FPS; predicts local movement and reconciles
  against server truth. Decoupled from tick (the render-vs-tick split, like `tutorial_island.html`'s
  planned F5 chunk).
- **Tile world:** integer tile grid; collision/pathfinding on tiles; world divided into **chunks**
  streamed by area-of-interest (`34_CHUNK_STREAMING`, `72_AREA_OF_INTEREST`).

## 4. Data flow (one example: chopping a tree)

1. Client: player right-clicks tree → "Chop" → sends `INTERACT{objectId}` packet.
2. Server tick: validates reach/tool/skill (rules from `shared`), starts the action, rolls success
   from `shared` formulas + `content` woodcutting data.
3. On success: mutates inventory + grants XP (server state), schedules tree-respawn, emits deltas.
4. Client: receives deltas → updates UI/inventory, plays chop animation + SFX, shows XP drop.

Every system follows this shape: **client intent → server authority (shared rules + content data)
→ state delta → client presentation.**

## 5. Persistence

- **Postgres** for player/world persistence (Supabase is connected to this workspace and is a
  candidate for managed Postgres + auth). SQLite acceptable for local dev.
- Player save = rows (profile, skills, inventory, bank, equipment, position, quest state). Content
  is code/data, not in the player DB. Migrations + backups per `13_SAVE_PERSISTENCE`.

## 6. Tooling & quality

- Build: package-manager workspaces (pnpm/npm), Vite (client), tsx/node (server), Vitest (tests),
  CI on every push (`14_BUILD_DEPLOY`). Asset-metadata validator gates the asset pipeline (`41`).
- Editors are web apps in `/tools` (map editor, content editor) so designers edit *data*, not code.

## 7. Build sequence (phased; each phase = verified chunks)

1. **Foundation:** monorepo scaffold · `shared` schemas · `content` format · asset-metadata
   validator · test + CI harness. (Dependencies first.)
2. **Asset kit:** complete modular environment kit (walls/floors/roofs/doors/windows/posts/fences/
   trees/rocks) + character/NPC base rig with equipment swap — to `40`/`41`/`44`.
3. **Client engine:** tile renderer, camera, input, right-click context menus, UI tabs, chatbox,
   minimap.
4. **Server + net:** tick loop, movement, pathfinding, tile collision, persistence, packet layer.
5. **Gameplay systems** (data-driven): skills/XP, inventory/equipment, combat, banking, NPC AI,
   dialogue, quests, loot, economy, audio.
6. **Vertical slice:** Tutorial Island at full parity (`91_TUTORIAL_ISLAND`) on the real engine —
   end-to-end proof.
7. **World + polish:** regions, chunk streaming, weather, day/night, particles, music regions.
