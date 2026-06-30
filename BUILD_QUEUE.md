# BUILD_QUEUE.md — the fleet's work queue

> **The operational FIFO for the parallel build fleet.** One row = one tightly-scoped chunk a single
> agent owns end-to-end. Builders pull from the top of `queued`; the **reviewer/tester** checks finished
> work against its PARITY_AUDIT test conditions and appends any gap/regression back here as a new row.
> The orchestrator (main session) integrates verified work, deploys, and re-spawns the next chunk.
>
> _Created 2026-06-29. Source of truth for sequencing = `ROADMAP.md`; per-item tests = `PARITY_AUDIT.md`._
>
> **▶ v20 integration wave (2026-06-29):** the client is fully modular (~35 `src/*.js`) and v20 integrated
> **~26 feature modules into `src/main.js`** — all **boot-verified clean in a real browser (zero console
> errors)**. Several serialized client chunks below are now `review` because their module landed and boots
> clean, but **none are `done`**: the verdict for v20 work is *integrated + boot-clean, live in-world feature
> playtest PENDING*. Promote to `done` only after the chunk's PARITY_AUDIT test passes by clicking it on the
> live link. Delivered at module level: orbs (HP/Prayer/Run/Spec), run energy, hover action-text, world map,
> XP counter, procedural audio, save/load, branching dialogue runner, NPC speech bubbles, scene fog,
> resource-node depletion, + Inventory ops / Equipment / Prayer / Magic / Quests / Settings / Emotes tabs,
> + skilling & combat engines.

## Status legend
`queued` → not started · `building` → an agent owns it · `review` → built, awaiting reviewer/tester ·
`requeue` → reviewer found gaps, see notes · `done` → verified + deployed · `blocked` → waiting on a dep.

## The hard constraint (why ordering matters)
The playable client is **one 800-line HTML file** (`eldermoor_client.html`). Two agents cannot write it
at once without clobbering. So: **client-writing chunks are SERIALIZED** (one builder at a time) until
**Q0 (module split)** lands — after which each module is an independent file and builders fan out, one
agent per module. **Non-client chunks (data files, new assets, new modules) run fully in parallel now.**

---

## Q0 — THE UNLOCK (do first, verify before adopting)
| ID | Chunk | Scope (files) | Status | Notes |
|----|-------|---------------|--------|-------|
| Q0 | **Module split** — 10 ES modules under `src/` + `index.modular.html` shell. Behaviour IDENTICAL. | `src/*.js` + `index.modular.html` | **done (v18)** | **VERIFIED LIVE** via local preview: boots clean, ZERO console errors, HUD parity (total 32, 28 slots, v18 welcome), all 8 assets load. Adopted as canonical: `index.html` is now the modular shell; `eldermoor_client.html` kept as the v17 monolith rollback. **Per-module parallel builders are now unlocked.** |

> **⚙️ CANONICAL CLIENT IS NOW MODULAR.** Builders edit `src/*.js` (+ the `index.html`/`index.modular.html` shell).
> Each module is an independent file → **client builders now fan out one-per-module, in parallel** (no more serialization).
> Deploy = edit `src/` → `cp index.modular.html index.html && vercel deploy --prod --yes` (no monolith cp).
> Rollback = `cp eldermoor_client.html index.html && vercel deploy --prod --yes`. Module → audit-domain map:
> `interact.js`=§3 · `hud.js`=§5-15 · `minimap`(in hud.js)=§4 · `world.js`=§1/§18/§20 · `npc.js`/`dialogue.js`=§16/§17 · `input.js`=§2 · `player.js`=movement/combat.

## Parallel-now: content & data chunks (separate files, zero client conflict)
| ID | Chunk | Scope | Status | Audit refs |
|----|-------|-------|--------|-----------|
| D1 | **quests.json** — quest data schema + the tutorial-as-quest entry + 5 greyed future Eldermoor quests (states/reqs/QP/grouping) | `assets/data/quests.json` (new) | done | QJ1/QJ2, QUEST+1..12 |
| D2 | **Item-data reconcile** — added `cooked-shrimp`+`poll-card`, raw→cooked→burnt shrimp chain, all lesson ids resolve (0 unresolved) | `assets/data/items.json`,`lessons.json` | done | GRANT+2..6, ITEM+ , DATA+1 |
| D3 | **Emotes + Music data** — 22 emotes (19 basic + 3 locked) + 8 original-named tracks mapped to zones | `assets/data/emotes.json`,`music.json` (new) | done | EMOTE+2, MUSIC+1 |
| D4 | **Settings + character-creation data** — 4 groups/25 settings + creator parts/colours/bodytypes/pronouns | `assets/data/settings.json`,`appearance.json` (new) | done | ST+1.., CC1, SET+ |

## Serialized client chunks (queued behind Q0; one builder at a time meanwhile)
| ID | Chunk | Status | Audit refs |
|----|-------|--------|-----------|
| C1 | ✅ Scenery interaction + examine-to-chat | done (v17) | OW1-4, OW+6, FEEL+14 |
| C2 | ✅ P1 render-correctness | done (v16) | §25 REND/PERF |
| C3 | Hover affordance: top-left action text + cursor + model highlight | review (v20 — module integrated + boot-clean; live hover playtest pending) | OW+1, FEEL+3/4/15, PX5 |
| C4 | Chatbox: working channel filters + right-click On/Filtered/Off/Hide + `.sys` fix + tagged/coloured messages | queued | CH1, CH+1/+6, CH2 |
| C5 | Inventory: right-click op menu + wield/wear → equipment slot + drop + examine | review (v20 — right-click ops + equipment system/tab modules integrated + boot-clean; live op playtest pending) | INV1/2/3, INV+1/2, EQ+6 |
| C6 | Skills tab: click → skill-guide panel + custom XP-to-next tooltip | queued | SK1, SK2, SK+1 |
| C7 | Minimap: click-to-walk + terrain render + typed blip colours | queued (v20 — world-map module integrated; click-to-walk/terrain/blip still todo) | MM1, MM3, MM+2 |
| C8 | HUD orbs (HP/Prayer/Run/Spec) + run energy + run toggle | review (v20 — orbs + run energy + XP counter modules integrated + boot-clean; live orb/run playtest pending) | HUD1/2, MM6 |
| C9 | Camera: arrow/WASD keys + middle-mouse drag + FPS-independent follow | queued | CAM1/2, CAM+3 |
| C10 | Fill empty tabs with real panels — render Quests from `quests.json`, Settings from `settings.json`, Emotes from `emotes.json`, Music from `music.json` (data now exists) | review (v20 — Prayer/Magic/Quests/Settings/Emotes tab modules integrated + boot-clean; Music still todo; live playtest pending) | PR1, MG1, QJ1, ST1, EQ1, EMOTE+1, MUSIC+1 |
| C11 | Scenery forgiving-tap: extend `pickAt` ground-proximity fallback to scenery proxies (off-centre taps) | queued | R1 · OW1-3, BUG+2 |
| C12 | Add `Use` op to remaining items (decide coins/burnt-shrimp) | queued | R2 · INV+2 |

## Reviewer/tester queue (the feedback loop)
The reviewer reviews each `review`/`done` chunk against its PARITY_AUDIT test conditions (static code
verification — no live browser available), then appends rows here for anything missing or regressed.
| ID | Found by review of | Gap / regression | Severity |
|----|--------------------|------------------|----------|
| R1 | C1 scenery `pickAt` | Forgiving ground-proximity tap fallback checks NPCS then OBJECTS but **not scenery** — an off-centre tap on a tree/rock walks instead of interacting. | major → queued as **C11** |
| R2 | D2 items.json | `burnt-shrimp` and `coins` expose only `["Drop"]` — INV+2 wants a `Use` op on every item (note: coins-no-Use is arguably correct OSRS; decide). | minor → queued as **C12** |
| ~~R0~~ | C1 `arrive()` | ~~"syntax error from haven't apostrophe"~~ — **FALSE POSITIVE**: builder used a curly ’ (U+2019), valid in a straight-quoted string. `node vm` confirms both scripts parse clean. **Lesson: QA must run a real syntax check, never eyeball quotes** (now baked into `eldermoor-qa`). | n/a |

**Verdict on shipped work:** C1 (scenery) PASS · C2 (render) PASS · v17 verified syntactically clean and live ·
**v20** (~26 feature modules) integrated + **boot-verified clean in a real browser (zero console errors)** —
but live in-world feature playtesting (clicking C3/C5/C8/C10 + dialogue/audio/save in the 3D scene) is **PENDING**,
so none of those are `done` yet.

## The studio (persistent custom agents — `.claude/agents/`)
The fleet now runs on **reusable, version-controlled agent types** (available in every chat opened in this repo):
`eldermoor-pm` (orchestrate/groom this queue) · `eldermoor-builder` (one chunk, surgical, self-syntax-checks) ·
`eldermoor-qa` (deterministic-check-first review → REQUEUE) · `eldermoor-auditor` (OSRS gap hunting → PARITY_AUDIT) ·
`eldermoor-content` (data JSON) · `eldermoor-story` (lore/dialogue) · `eldermoor-modeler` (Blender glTF assets).

---

## How the loop runs (orchestrator)
1. Pull the top `queued` non-conflicting chunks → spawn one focused agent each (client chunks serialized; data/asset chunks parallel).
2. On completion → mark `review` → reviewer/tester verifies vs PARITY_AUDIT tests → `done` or `requeue` (+ new rows).
3. Orchestrator integrates verified work, bumps version, deploys, updates HANDOFF, re-spawns the next chunk.
4. Repeat until `queued` + `requeue` are empty (and the audit waves return dry).
</content>
