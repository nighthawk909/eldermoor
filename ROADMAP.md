# ROADMAP.md — Eldermoor: the one master plan

> **v43 (2026-06-30) — real zone props + bank depth + quest reward.** ZONE-EXPORT: 8 Blender fixture meshes (range/furnace/anvil/bank_booth/altar/ladder/signpost/dock) exported to assets/kit/*.glb, registered in PIECES, wired so placeFixture uses the real mesh + manifest markers (ladder/altar/signpost/dock) place real props (placeholders remain only for gate/target/rune_rack/boat). BANK-DEPTH: tabs, search, withdraw-as-note, placeholders, 4-digit PIN (bank.js). QUEST-REWARD: OSRS reward scroll on completion (quests-tab.js). Clean-origin boot-verified (scene 519, EMBANK/EMQUEST live). Deployed v43.

> **v42 (2026-06-30) — ISLAND WALKABLE.** ZONE-RENDER landed: instanceManifest(world.js) now renders manifest buildings (procedural houses), skilling fixtures (fishing/fire/range/furnace/anvil/bank/poll via placeFixture), rat/chicken mobs, and placeholder landmarks; new runtime addNpc (npc.js, window.EMNPC.add) spawns the 10 instructors as procedural low-poly bodies with nameplate+click-proxy+collider+wander, talkable (talk() resolves their dialogue tree by id). Clean-origin boot-verified: loads (515 scene objs), player walks north through all 9 zones, 15 nameplates, dialogue trees present. No Blender needed for walkability. Deployed v42. Remaining: ZONE-EXPORT (optional fixture-mesh glb polish).

> **v41 wave — P4+P7 CONTENT authored (2026-06-30).** 7 agents landed: full L0-L17 lesson chain verified+wired (lessons.json), 11 instructor dialogue trees (dialogue.json, dual-keyed), 2 starter quests (quests.json), 67 examine lines (examine.json), 8 zone fixture builders (build_kit.py), 9-zone layout + instructor placement (world.manifest.json, ids reconciled to live dialogue/lesson/music ids), unique generative per-zone music (audio.js/music-engine.js, shipped v41). HONEST GAP: the zone layout is authored to the editor schema but the runtime instanceManifest(world.js) only reads objects/scatter/fixtures, and the 8 fixture meshes need a Blender GPU export — so the 9 new zones do NOT render in-game yet. Next: ZONE-RENDER (wire instanceManifest to render buildings/npcs/markers + NPC proxies) + ZONE-EXPORT (blender export fixture glb).

> **v40 (2026-06-30) — BOOT HOTFIX.** v39 bricked at "Entering the Chapel…": world.js read pos/player at module top-level (SPAWN), and the player<->world circular import made that a TDZ that crashed the whole ES module graph (so NOTHING booted and the loader never cleared — no JS ran to fire the 20s backstop). Fixed: SPAWN uses literal defaults, overwritten from colliders JSON. Verified on a clean origin: loader clears, EMHUD/EMTICK/EMCOMBAT/EMPRAYER init, scene=328 objects, login shows. Deployed v40.

> **v39 (2026-06-30) — QA-fix wave 2 SHIPPED (awaiting playtest).** 7 more agents: combat loop (walk-to-mob -> fight -> death/respawn + attack/death anim), skill-guide panel (click a skill in Stats), tutorial progression (lessons complete on the real action + 15s anti-brick grace), per-zone music + crossfade + persisted audio settings, 8 elemental/catalytic rune items (spells now castable), skill-guide wired into HUD. Camera keys (C9) + forgiving scenery tap (C11) were already live. Deployed v39 (modules 200) at https://eldermoor.vercel.app . Board: To Do 0 / Shipped 26 / Done 1. [~] pending on-device playtest via the v39 QA panel.

> **v38 (2026-06-30) — QA-fix wave SHIPPED (awaiting playtest).** 10 parallel agents shipped from v36 owner QA: login/landing + fixed logout; HUD overhaul (XP no longer overlaps inventory, persistent chatbox, stat-orb cluster, docked tab strip, blue->brown tone); combat styles (weapon-aware, per-style XP split); 28-prayer roster; 23-spell book (strike/bolt/blast/wave + teleports/alch, rune-gated); dialogue dismiss-on-walk-away + new-chat + Esc; dev toolbox (give/set/spawn/teleport); full dev rune+gear kit; +70 item tier ladder (Ferrite->Sunsteel); minimap (compass/click-to-walk/zoom/blips). Integrated (main.js+hud.js wiring), node --check clean, deployed-URL verified (modules 200) at https://eldermoor.vercel.app . [~] pending on-device playtest via the v38 in-game QA panel (auto-syncs to the dashboard). Character art (avatar/creator/mage-studio, src/char/*) owned by a SEPARATE chat.

> **Single source of truth for "what's built vs what's left."** This file replaces and merges the old
> `BUILD_PLAN.md` (phases A–J), `TUTORIAL_ISLAND_PARITY.md` (epics 0–10 + lessons), and the planning
> half of `KICKOFF.md` — which were duplicative and used three different status notations. One file,
> one notation, honest status.
>
> _Created 2026-06-29 (consolidation). Target: OSRS Tutorial Island parity-or-better, web-first client._

## Document map (read in this order)

1. **`CLAUDE.md`** — operating law, IP rules, stack decisions, code conventions. *Why we build this way.*
2. **`HANDOFF.md`** — current session state + changelog + the immediate next step. *Where we are right now.*
3. **`ROADMAP.md`** (this file) — the phased master checklist. *What's done, what's left, in what order.*
4. **`PARITY_AUDIT.md`** — the nitty-gritty per-feature test sheet (~250 itemised gaps, each a pass/fail
   test). *The granular punch-list the roadmap phases point into.*
5. **`ASSET_MANIFEST.md`** — every 3D asset (NPCs, buildings, fixtures, props, foliage, terrain, items)
   with counts + status, incl. the character-model sub-track. *The art production list.*
6. **`ART_SPEC.md` / `MODELING_SPEC.md`** — the visual + modeling standards every asset is judged against.

> Rule going forward: a feature's **status lives in ROADMAP** (phase-level) and its **test lives in
> PARITY_AUDIT** (item-level). An asset's status lives in ASSET_MANIFEST. No third copy anywhere.

## Status legend (one notation, used everywhere now)

- `[ ]` **todo** — not started.
- `[~]` **partial** — exists but does not meet its Definition of Done (e.g. HUD chrome that renders but
  isn't interactive). *Partial is not done.*
- `[x]` **done** — meets DoD, verified against the OSRS reference.
- `[!]` **broken/regressed** — was working or claimed done, now failing.

**Honesty rule (CLAUDE.md §0.3):** a phase is `[x]` only when its Definition of Done passes a real check.
"The chrome renders" ≠ done. The previous trackers over-marked `✅`; this file corrects that — see the
"reality check" notes that pull claimed-done items back to `[~]` where the audit proved them non-functional.

---

## 0. Honest baseline (2026-06-29)

**What genuinely works (`[x]`):**
- The asset pipeline: `build_kit.py` → glTF (`.glb`) + `colliders.json`/`manifest.json` sidecars →
  `eldermoor_client.html` (Three.js) → browser, deployed to Vercel. Verified end-to-end.
- One playable zone: chapel + grounds, tap-to-walk with **A\* pathfinding**, static+dynamic collision,
  follow camera, mobile input, haptics, wandering NPCs, long-press context menu, proximity-gated dialogue.
- World *systems* (not content): heightmap terrain, vertex-colour tile blend, procedural scatter, pond +
  sea + animated water, map editor + world manifest format.
- A 23-skill XP model with the real OSRS curve; an altar that grants real Prayer XP.

**What only LOOKS built (`[~]` — the trap the old docs hid):**
- The **HUD**: 8 tabs render, but Inventory can't wield/drop/right-click, Skills can't open a guide,
  Equipment is decorative, Prayer/Magic/Quests/Settings are stub strings, chat channel buttons are dead,
  there are no orbs, and the minimap can't be clicked or zoomed. *Chrome without function.* (See PARITY_AUDIT §4–§15.)
- **Content data** (`items.json`, `dialogue.json`, `lessons.json`, `skills.json`) is authored but
  `dialogue.json` + `lessons.json` are **never even fetched** by the client (PARITY_AUDIT DATA+3).

**What's missing entirely (`[ ]`):** 9 of 10 zones, the instructor roster, the gated lesson chain, all
the skill systems (woodcut→…→magic), combat, banking, character creation, audio, and the OSRS interaction
depth (hover affordance, examine-everything, working right-click verbs).

**Honest completeness:** frameworks ~good; **content + interactivity ~15%** of Tutorial Island.

> **v20 caveat (2026-06-29):** the client is now modular (~35 `src/*.js`) and v20 **integrated ~26 feature
> modules** (orbs, run energy, hover text, world map, XP counter, audio, save/load, dialogue runner, speech
> bubbles, fog, node depletion, + functional Inventory/Equipment/Prayer/Magic/Quests/Settings/Emotes tabs,
> skilling + combat engines). These are **integrated and boot-verified clean in a real browser (zero console
> errors)** — so the items below carry `[~]` *at the module level*. They are **NOT `[x]`**: live 3D-interaction
> playtesting (clicking each feature in-world and confirming it fires correctly) is still pending. Promote to
> `[x]` only after the per-item PARITY_AUDIT test passes by hand on the live link.

---

## Phase index & quick status

| Phase | Title | Status | Drives PARITY_AUDIT § |
|---|---|---|---|
| P0 | Engine/flow foundation (tick, state machine, gating, save, modularize) | `[~]` | 19, 24 |
| P1 | Render-correctness pass (the "inside/outside glitch" + code defects) | `[ ]` | 18, 25 |
| P2 | Interaction layer (examine-all, right-click verbs, hover, wield) | `[~]` | 3, 6 |
| P3 | HUD function pass (make every tab + minimap + orbs real) | `[~]` | 4, 5, 6–15 |
| P4 | World build-out (island shape + 10 zones + buildings + doors) | `[~]` | 1, 20 |
| P5 | NPC roster + dialogue trees + handoff | `[~]` | 16, 17 |
| P6 | Skill & combat systems (woodcut→magic, melee/ranged, prayer, banking) | `[~]` | 21 |
| P7 | The gated lesson chain L0–L17 | `[ ]` | 19, 20 |
| P8 | Character creation | `[ ]` | 23 |
| P9 | Audio (music + SFX + jingles) | `[~]` | 22 |
| P10 | Polish, perf/LOD, accessibility, engine-port bridge | `[ ]` | 24 |

Execution order is roughly P1 → P2 → P3 → P0(rest) → P4 → P5 → P6 → P7 → P8 → P9 → P10, but P0's tick +
state machine can land in parallel since P7 depends on them. Each phase below is a clean checklist.

---

## P0 — Engine & flow foundation `[~]`

The monolith must become a real, gated, persistent client.

- [x] **P0.1 Module split.** Single 800-line HTML → ES modules under `src/` (~35 modules now), `index.modular.html` shell, runs identically. *(done v18; adopted as canonical `index.html`. v20 integrated ~26 feature modules into `src/main.js`, boot-clean.)*
- [ ] **P0.2 Tick model.** Fixed ~0.6s game tick for actions/combat/movement cadence, decoupled from render FPS. (PARITY_AUDIT FLOW5)
- [ ] **P0.3 Lesson state machine.** Ordered `progress` driver: each step has id, prereqs, completion predicate, `onComplete`→unlock next. Steps are data. (FLOW1)
- [ ] **P0.4 Gating.** Doors/areas/actions locked until their step is active; OSRS "finish X first" nudge; no sequence-break. (FLOW2, FLOW7–FLOW9, FLOW12)
- [~] **P0.5 Persistence.** Progress + character + inventory + settings survive reload (localStorage). (FLOW4, ST5) *(v20 — save/load module integrated + boot-clean; live save/reload playtest pending.)*
- [x] **P0.6 Pathfinding + collision.** A\* + static/dynamic colliders from JSON sidecars. *(done; stuck-to-NPC bug fixed v15.)*
- [ ] **P0.7 Pathfinding scale-safety.** Fix the `ci*1000+cj` key aliasing + `WALK` bounds guard before any "massive world." (PARITY_AUDIT BUG+6, BUG+7)

## P1 — Render-correctness pass `[~]` (shipped v37 wave — boot-verified + deployed; **live playtest pending**)

> Shipped 2026-06-30 via the parallel fleet (builder-A/B/C + orchestrator wiring), boot-verified clean
> (zero console errors on the deployed build). `[~]` not `[x]`: render-correctness is visual, so final
> DoD needs Josh's on-device playtest (the "Shipped" column on the kanban dashboard).

- [~] **P1.1** Terrain role nulls `m.map`/emissive/ao/rough/metal so vertex colours don't multiply a texture. (engine.js) (REND+2)
- [~] **P1.2** Water gets `renderOrder` (band 10) over terrain (band 0); keeps `depthWrite=false`. (engine.js) (REND+3)
- [~] **P1.3** Nameplates — verified already correct (`depthTest:true`, no `depthTest:false`); if still through-walls, cause is elsewhere. (npc.js, no change) (PERF+3)
- [~] **P1.4** Imported glTF player/NPC meshes keep authored normals (`flat=false`); procedural primitives stay faceted by design. (verified no-op) (REND+5)
- [~] **P1.5** Explicit `materialRole()` map replaces substring matching (8 roles, first-match-wins). (engine.js) (RM3, REND+2/+3)
- [~] **P1.6** Roof auto-registers via `dressMaterials`; `updateRoofs(isInsideAnyRoof(pos))` wired in player.js; terrain `-0.01` z-offset. *Dormant until a roofed building asset exists (chapel/world.glb has no roof mesh).* (RM1, RM2, RM4, REND+4)
- [~] **P1.7** Sky no longer `toneMapped:false` (runs ACES like the scene); altar glow decays via `decayExp()` (asymptotic) in player.js. (REND+1, BUG+13)
- [~] **P1.8** Loader counts the content-data fetch + `clearOverlay()` + 20s safety backstop (no early fade, can't hang). (loaders.js) (BUG+18)

## P2 — Interaction layer `[~]`

Make the things already on screen *do something*.

- [ ] **P2.1** Register kit pieces (trees/rocks/bushes) + scenery as interactables with verbs + examine. (OW1–OW4)
- [ ] **P2.2** Examine on EVERYTHING, printed to chat (not the dialogue box). (OW4, OW+6)
- [~] **P2.3** Hover affordance: cursor change + top-left action label + model highlight. (OW+1, PX5) *(v20 — hover action-text module integrated + boot-clean; live hover playtest pending.)*
- [ ] **P2.4** Right-click parity: left-click=op1 default, menu order/colours, Cancel red/last, nearest-pick. (OW5, OW+2/+3/+4)
- [ ] **P2.5** Object verb execution path (Open/Chop/Mine actually run on arrival). (OW8, OW+8)
- [ ] **P2.6** Occlusion: don't register walk-taps through walls. (BUG+1)
- [ ] **P2.7** Can't-reach feedback (red X + "I can't reach that."). (OW6, OW+5)
- [x] **P2.8** Long-press / right-click context menu exists. *(done; minor races OW+7/BUG+3/BUG+4 remain.)*

## P3 — HUD function pass `[~]`

Every tab + the minimap + orbs become real. (Entire PARITY_AUDIT §4–§15 is the test set.)

- [~] **P3.1 Inventory:** wield/wear, right-click menu, drop, use-on, tooltip, drag-rearrange, count tiers, free-slot count. (INV1–INV8, INV+1–+6) *(v20 — right-click Inventory ops module integrated + boot-clean; live op playtest pending.)*
- [ ] **P3.2 Skills:** click→skill guide, custom hover tooltip (xp/next/remaining), OSRS grid order, right-click. (SK1–SK6, SK+1–+5)
- [~] **P3.3 Equipment:** functional slots, humanoid layout, Equipment-Stats + Kept-on-Death, remove-on-click, model+stat effect. (EQ1–EQ5, EQ+1–+5) *(v20 — equipment system + tab module integrated + boot-clean; live wield/remove playtest pending.)*
- [ ] **P3.4 Combat:** fix clipping, style descriptions/icons + trained-skill, weapon-aware, auto-retaliate, spec bar, weapon label. (CB1–CB6, CB+1–+4)
- [~] **P3.5 Prayer:** real prayer grid + points + activation + quick-prayers; resolve the "locked" contradiction. (PR1–PR5, PR+1–+3) *(v20 — Prayer tab module integrated + boot-clean; live playtest pending.)*
- [~] **P3.6 Magic:** spellbook grid + rune reqs + cast + filters + greyed states + hover. (MG1–MG5, MG+1–+4) *(v20 — Magic tab module integrated + boot-clean; live cast playtest pending.)*
- [~] **P3.7 Quests:** real journal — colour-coded states, greyed future quests, QP total, sections, click-through. (QJ1–QJ5, QJ+1–+4) *(v20 — Quests tab module integrated + boot-clean; live playtest pending.)*
- [~] **P3.8 Settings:** audio/graphics/controls sub-tabs with real, persisted toggles. (ST1–ST5, ST+1–+3) *(v20 — Settings tab module integrated + boot-clean; live toggle/persist playtest pending.)*
- [~] **P3.9 Missing tabs:** Friends, Ignore, Account, Emotes, Music, Logout; OSRS two-row stone layout; F-keys/Esc. (TB1–TB7, TB+1–+6) *(v20 — Emotes tab module integrated + boot-clean; Friends/Ignore/Account/Music/Logout still todo; live playtest pending.)*
- [ ] **P3.10 Chatbox:** working channel filters + right-click cycle, categorised/coloured messages, input line, `.sys` fix, scrollback. (CH1–CH7, CH+1–+9, BUG+10)
- [~] **P3.11 Minimap:** click-to-walk, zoom, terrain render, rotating clickable compass, typed blip colours, rim-clamp, orbs, world map, dest flag. (MM1–MM9, MM+1–+7) *(v20 — world-map + HUD orbs modules integrated + boot-clean; click-to-walk/zoom/terrain still todo; live playtest pending.)*
- [~] **P3.12 HUD chrome:** HP/Prayer/Run/Spec orbs + run energy, guidance arrow, progress indicator, XP counter, level-up popup, single docked right column. (HUD1–HUD6, HUD+1–+8) *(v20 — orbs + run energy + XP counter modules integrated + boot-clean; guidance arrow/level-up popup still todo; live playtest pending.)*
- [ ] **P3.13 OSRS brown-stone skin** across all panels (replace the dark-blur modern look where it remains).

> Reality check: the old BUILD_PLAN marked HUD "🔶 partial" and EPIC 1 as mostly addressed. The audit shows
> it's `[~]` *chrome only* — almost nothing in §6–§15 is interactive. P3 is large, not a polish pass.

## P4 — World build-out `[~]`

- [ ] **P4.1** Authentic island silhouette + coastline + relief (not a circle/box). (W1, W3)
- [ ] **P4.2** 10 zones placed + labelled via the manifest: spawn house, survival area, cook's house, quest house, mine (underground), combat ring, bank/poll, chapel ✅, magic area, departure dock. (W1, W2, W6, W7)
- [ ] **P4.3** Buildings via the kit: walls/floor/roof/door/window/stairs; **openable doors + lesson-locked gates**. (W2, OW8, ROOM11)
- [ ] **P4.4** Per-zone interaction content (tree/fishing-spot/fire/range/flour+water/ore rocks/furnace/anvil/rat pen/bank booth/poll booth/bones/chicken+runes/boat). (ROOM1–ROOM13)
- [ ] **P4.5** Underground mine cell (sealed sub-level via ladder). (W7, ROOM5)
- [x] **P4.6** World/terrain systems (heightmap, tile blend, scatter, water, manifest, editor). *(done.)*

## P5 — NPCs & dialogue `[~]`

- [ ] **P5.1** Instructor roster (10) modelled, placed, named-by-role. (NPC1, NPC6–NPC8; bodies tracked in ASSET_MANIFEST §1)
- [~] **P5.2** Branching dialogue trees from `dialogue.json` (options, portraits, ▼/space, numbered 1–5, state-varying lines). (DLG1–DLG9, DATA+3) *(v20 — branching dialogue-runner module integrated + boot-clean; live in-world dialogue playtest pending.)*
- [~] **P5.3** Overhead speech bubbles + role nameplates + Attack option on mobs. (NPC2, NPC3, NPC4) *(v20 — NPC speech-bubble module integrated + boot-clean; nameplates done; Attack-on-mobs + live playtest pending.)*
- [ ] **P5.4** Instructor handoff → next NPC + minimap marker + guidance arrow. (NPC5, MM9, HUD4)
- [ ] **P5.5** Decide the 3 chapel wanderers' fate (remove for parity or document as flavour). (NPC9)
- [x] **P5.6** Data-driven NPC placement + wander + nameplates + proximity dialogue. *(done.)*

## P6 — Skill & combat systems `[ ]`

- [~] **P6.1** Gather/produce chains: Woodcutting, Firemaking, Fishing, Cooking (incl. burn), Mining, Smelting, Smithing. (SYS1–SYS7) *(v20 — skilling engine + resource-node depletion modules integrated + boot-clean; per-skill live playtest pending.)*
- [~] **P6.2** Combat: tick attack, accuracy/damage roll, HP, retaliation, death/respawn; melee + ranged (ammo). (SYS8, SYS9, SYS13) *(v20 — combat engine module integrated + boot-clean; live combat playtest pending.)*
- [ ] **P6.3** Magic + runes: Wind Strike projectile + hit + cost + level. (SYS10)
- [ ] **P6.4** Prayer: bury-bones XP + prayer points + first prayer. (SYS11, PR3)
- [ ] **P6.5** Banking: storage container, deposit/withdraw, separate from inventory. (SYS12)
- [ ] **P6.6** Items/tools are real (axe/net/pickaxe/tinderbox enable their actions); normalise item ids. (SYS14, INV10, DATA+1)

## P7 — The gated lesson chain L0–L17 `[ ]`

Each lesson: gated (P0.4) + grants the right items/XP + hands off to the next instructor. DoD = matches OSRS content, blocks progress until done.

- [ ] **L0** Character-creation gate (P8) before spawn.
- [ ] **L1** Guide — controls, camera, interface tabs, settings; opens the first door.
- [ ] **L2** Survival Expert — Woodcutting (axe → logs).
- [ ] **L3** Survival Expert — Firemaking (tinderbox + logs → fire; can't burn under a tree).
- [ ] **L4** Survival Expert — Fishing (net → shrimp).
- [ ] **L5** Survival Expert — Cooking on fire (cook shrimp; handle a burnt one); gate to cook.
- [ ] **L6** Master Chef — bread dough (flour + water → dough; range).
- [ ] **L7** Quest Guide — quest journal/tab; ladder down to the mine.
- [ ] **L8** Mining Instructor — mine tin + copper.
- [ ] **L9** Mining Instructor — smelt → bronze bar (furnace).
- [ ] **L10** Mining Instructor — smith → bronze dagger (anvil); ladder up.
- [ ] **L11** Combat Instructor — equipment tab; wield dagger; leather armour; melee rats.
- [ ] **L12** Combat Instructor — ranged (shortbow + arrows); combat styles.
- [ ] **L13** Banker — banking interface (deposit/withdraw).
- [ ] **L14** Account Guide — account-management tab + poll booth (Eldermoor-original framing).
- [ ] **L15** Brother (chapel) — prayer tab, bury bones; Friends/Ignore tabs.
- [ ] **L16** Magic Instructor — magic tab, air/mind runes, Wind Strike on the chicken.
- [ ] **L17** Departure — final guide → leave-island confirmation → sail to the mainland.

## P8 — Character creation `[ ]`

- [ ] **P8.1** Creator screen: head/jaw/torso/arms/hands/legs/feet design cyclers + hair/torso/legs/feet/skin colour cyclers + pronouns + body type + Confirm. (CC1)
- [ ] **P8.2** Live rotating preview. (CC2)
- [ ] **P8.3** Apply to in-world player + persist. (CC3)

## P9 — Audio `[ ]`

- [~] **P9.1** Original per-zone music (Web Audio, era-appropriate, looping, zone crossfade). (AUD1, AUD5) *(v20 — procedural audio module integrated + boot-clean; per-zone crossfade + live playtest pending.)*
- [ ] **P9.2** Action SFX (chop/fire/mine/smith/fish/cook/hit/door). (AUD2)
- [ ] **P9.3** Level-up jingle + UI click sounds. (AUD3, AUD4)

## P10 — Polish & bridge `[ ]`

- [ ] **P10.1** Perf/LOD: InstancedMesh for scatter, throttled minimap redraw, draw-call budget for a massive world. (PX4, PERF+1, PERF+2)
- [ ] **P10.2** Robustness: full-bag honesty, addXp validation, resize pixelRatio, water offset wrap, HTML-escape/whitelist in chat. (BUG+8, BUG+9, BUG+14, BUG+12, SEC+1)
- [ ] **P10.3** Single version source; styled retryable load errors; foreground-verify doc. (PX1, PX2, PX3, BUG+11)
- [ ] **P10.4** Accessibility: min tap targets, contrast, UI scaling. (PX7, ST4)
- [ ] **P10.5** Departure cutscene; step-complete confirmations; combat-level formula fix. (PX6, P5 handoff, BUG+16)
- [ ] **P10.6** Engine-port bridge: approved props/buildings re-authored in Blender for glTF usable by web + Unity/Godot; a Cycles parity render of an interior. *(later, when the look is approved.)*

---

## Definition of Done (per phase)

A phase is `[x]` only when **every** sub-item's PARITY_AUDIT test passes against the OSRS reference,
verified on a **foregrounded** browser (the preview tab pauses rAF/WebGL — verify logic via eval, motion
by hand), with no console errors and no regression to the QC checklist in `HANDOFF.md`. Update this file's
status **and** the matching PARITY_AUDIT items + ASSET_MANIFEST rows in the same change. No green-washing.

## Where the old trackers went

- `BUILD_PLAN.md` (phases A–J) → merged into P0–P10 above (status corrected to honest `[~]`/`[ ]`).
- `TUTORIAL_ISLAND_PARITY.md` (epics 0–10 + L0–L17) → epics folded into the phases; the L0–L17 chain is P7.
- `KICKOFF.md` (one-time bootstrap) → repo/deploy already done; the unfinished module-split is P0.1.
- `MANIFEST.md` (character-asset sub-track) → merged into `ASSET_MANIFEST.md` §9.
</content>
