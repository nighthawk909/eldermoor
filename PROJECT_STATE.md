# PROJECT_STATE.md — Eldermoor


> **v67 (2026-07-02) — CHARACTER ART: real customization on the rigged avatars + creator previews the REAL model.** (Branch `claude/game-character-graphics-cctev0`, PR — NOT deployed; production still deploys from claude/modular-v23.) Root cause of the "blocky creator / customization does nothing" gripe: the creator previewed the procedural box body, and the skin/hair picks never touched the KayKit glb (one baked 1024px atlas per model). This pass: (1) **Skin tone + hair colour now APPLY to the real character** — new `src/char/glb-tint.js` retints the model's atlas on a canvas at runtime using per-model masks (R=skin, G=hair) baked offline by new `tools/bake_tint_masks.py` from each glb's UV islands (HSL family classification per model; painted eyes/face detail preserved; masks in `assets/ext/characters/masks/`, ~4KB each). Key gotcha fixed: GLTFLoader r128 CLONES the atlas material per skinned/static variant, so the tint swaps the map on ALL textured materials, not the first. (2) **Creator shows the real model** — `charcreate.js` drawPreview now loads the exact in-world rigged glb via new `EMAVATAR.buildGlbPreview` (idle animation, rotating), retints live on swatch click without reload, swaps models when head/torso picks change register (fallback chain procedural→SVG kept). (3) **Built-in gear wardrobe managed** — every KayKit glb ships its whole armory as ALWAYS-VISIBLE nodes (Knight: 2 swords + 4 shields + helmet + cape, all rendering at once, plus a second weapon cloned on at equip); avatar.js now hides all gear nodes at load and re-shows the node matching each actually-equipped item (weapon/shield/helm/cape; external gear .gltf load kept as fallback), so **equipping is finally visible** (bronze-sword → 1H_Sword in hand). (4) **NPC loadout curation** — npc.js hides the wardrobe and shows a role loadout (guard: sword+shield+helmet+cape; mage: staff+hat; rogue: knife; guides: cape). VERIFIED BY LOOKING (headless Chromium + npm-local three r128 stub for the blocked CDN; screenshots): creator shows the tinted rigged Knight; darkest-skin + red-hair picks visibly apply; Hooded pick swaps to the hooded Rogue keeping the tint; in-world avatar tinted with ZERO stray gear nodes; equip shows the sword; 0 console errors. Agent-QA'd: glb-tint/avatar/npc PASS, charcreate PARTIAL→FIXED (the creator's model-swap detached the outgoing preview without disposing it — every head/torso toggle leaked a full model + tint CanvasTexture; drawPreview now routes both swap paths through disposePreviewChildren(), and disposeGlb() also frees material.map + the kept original atlas, since material.dispose() never cascades to textures). Re-verified after the fix (same screenshot suite, 0 errors). **v67 batch 2 (owner feedback, same day): walking-backwards + blocky chapel cast FIXED.** (a) Walk-backwards ROOT-CAUSED: the KayKit rig faces +Z exactly like the procedural bodies, but avatar.js/npc.js rotated the loaded model PI against the group's atan2(ux,uz) facing — every rigged character moon-walked since v47/v52. Rotation removed; verified mid-walk east: group yaw==PI/2, child yaw==0. (b) The LAST blocky characters are gone: the chapel roster (Brother Aldric/Sister Wenna/Pilgrim Joss/Old Maven) now loads rigged+tinted KayKit bodies (NPCS[].kaykit specs through loadNpcGlb; old cone/icosphere glbs kept only as load-failure fallback), and the monk's 14-primitive body baked into world.glb is hidden by a bounds probe at his authored spot (hideBakedMonk, exactly 14 meshes). (c) Instructors get deterministic per-id skin/hair variety via EMTINT (no more five identical clones). Verified by capture: chapel cast all rigged and colour-varied, walk yaw matches movement, 0 console errors. NOTE: owner playtested PRODUCTION (v66) — none of v67 is live there; it's on the PR #28 preview until merged. LIMIT NAMED: hair STYLE can't change on these fixed meshes (head/torso picks choose the model silhouette); true mix-and-match hair/faces needs a modular CC0 pack (backlogged). STILL OPEN (unchanged from v66): click-mob combat + animations, banker/bank, world map, unclimbable stairs, walk-backwards.

> **v66 (2026-07-01) — owner-playtest batch 2a: solid walls + enter-through-doors, readable chat.** (1) **Buildings are solid + enterable through the door.** placeHouse walls are now RECT colliders (was ghost → you clipped through walls, couldn't use doors), with a widened ≥3.2u south doorway. To guarantee every door routes regardless of gap-vs-grid alignment (v61's failure mode), each door opening is registered in DOOR_GAPS and buildGrid() force-carves those cells walkable. Verified by probe on a clean origin: ALL 6 indoor instructors reachable from spawn via winding paths that route AROUND the solid walls and IN through the door (dist 0.08–1.21, 6–13 waypoints); no house re-sealed. (2) **Chat readable on desktop.** The culprit was mobile-ui.js: desktop reads as "landscape", and `body.em-landscape #emchat{height:130px}` (plus a panel-open rule that HID the chat log) overrode hud.js with !important. Fixed: landscape chat height→min(42vh,300px), and a real-desktop media query (min-width:701px & min-height:520px) keeps chat full-size and its log visible even when a panel/dialogue is open. (CSS unverifiable in the headless 0×0 sandbox — owner confirms.) Deployed v66. STILL OPEN: click-mob combat + animations, equip no-op, banker/bank, world map, unclimbable stairs, walk-backwards + blocky creator (char-art = other chat).

> **v65 (2026-07-01) — owner-playtest fixes, batch 1 (world visuals), each VERIFIED BY LOOKING.** Using the new capture harness (see v64) to actually view the rendered game: (1) **Roofs reveal interiors** — placeHouse roofs are now registerRoof()'d and engine.updateRoofsFor(pos) hides only the roof(s) the player is under (was: manifest roofs never registered → you could never see inside a building). Verified by capture: standing in spawn_house, the roof hides and Warden Halric + the interior are visible. (2) **Trees out of buildings** — instanceManifest scatter now excludes house footprints (+1.5u) and a 2.5u radius around every placed object/NPC (was: trees grew through walls/roofs and on instructors). Verified: 0 trees inside any of the 5 house footprints. (3) **Tab-toggle relocated** — #emtabs-toggle moved from the top minimap cluster to directly above the tab strip, bottom-right (owner asked repeatedly). (4) **Chat readable** — #emchat 178px → min(42vh,300px) + wider, so it shows many lines not one. NOTE: (3)/(4) are DOM/CSS and can't be visually verified in-sandbox (headless 0×0 viewport collapses vw/vh) — owner confirms in a real browser. Deployed v65. STILL OPEN (batch 2+): walk-through walls + unclimbable stairs (collision), click-mob combat + animations, equip no-op, banker/bank, world map, walk-backwards (char-art = other chat), blocky creator (other chat).

> **v64 (2026-07-01) — REALITY CHECK: owner playtest exposed the game as broadly broken; began real visual QC.** Owner playtest of the live build found it broadly non-functional (all-water world, walk-through walls, no combat/animation on click, unreadable chat, mislabeled version, etc.) — proving the prior "functional verification" (driving window.EM* APIs) was inadequate: it confirmed code paths execute, NOT that a player clicking things works. Two structural fixes this pass + a QC unlock: (1) **Still-frame capture harness** — engine.js renderer now uses preserveDrawingBuffer:true so the live WebGL canvas can be copied (drawImage→toDataURL→POST to a local shot-server→PNG on disk) and actually LOOKED AT; preview_screenshot hangs on the continuous rAF loop, so this is how visual QC happens now. (2) **Grass island terrain** — the world.glb ships only chapel-grounds terrain; the multi-zone island sat over the 360×360 ocean plane → "everything is blue". world.js addIslandGround() lays a tiled-grass floor across the whole play area (below terrain/floors/pond, above ocean). Verified by CAPTURE: island now reads as grass with a contained pond, not open water. (3) **Honest version label** — qa.json bumped v58→v64 (the QA badge had lied through 5 deploys). Boot-verified + visually verified. Deployed v64. REMAINING owner-reported (tracked): walk-through walls, roofs hide interiors, no combat/anim on click, equip no-op, chat unreadable, tab-button placement, world map, banker/bank, unclimbable stairs, blocky creator (other chat).

> **v63 (2026-07-01) — tutorial lesson flags wired to real actions (L13/L15/L17) + boardable ferry.** A cross-check of every lesson complete_when vs. what the game actually dispatches found 6 lesson flags that NOTHING fired (they only ever advanced via the 15s anti-brick grace, or hard-bricked): controls_taught(L1) quests_taught(L7) bank_used(L13) account_taught(L14) bones_buried(L15) departed(L17). This pass wired the 3 ACTION-based ones live: bank.js showBankPanel dispatches `bank_used`; inventory-ops.js runOp('bury') dispatches `bones_buried` (the WORKING bury path — EMPRAYER.buryBones was found to be dead code depending on a nonexistent window.EMINV); and the ferry dock is now a boardable scenery node (world.js SCENERY_DESC gains dock+boat with verb 'Board') that fires `departed` via a new player.arrive() branch. Also confirmed the bread chain is complete (flour+water→dough→bread bake recipe) so L6 is satisfiable, and all 8 has: items exist. Verified on a CLEAN origin (port 8194): bank_used + bones_buried + departed all dispatch live from their real actions, dock reachable/boardable, 0 console errors. Remaining dialogue-driven flags (L1/L7/L14) + dead buryBones + non-clickable markers logged to BACKLOG. Boot-verified. Deployed v63.

> **v62 (2026-07-01) — ROOT-CAUSE fix: 3 sealed buildings made every indoor interactable unreachable.** Extending the v61 reachability probe to ALL 28 world interactables exposed the real root cause behind v61's symptom: `world.colliders.json` contained pipeline-generated **full-footprint solid-fill rects** for quest_house, bank and wizard_tower (e.g. the entire bank interior as one solid box) PLUS wall rects whose door gap was on the *north* while `placeHouse` draws the visual door on the *south*. Net: those 3 rooms were 100% sealed, so bank_booth, poll_booth, altar, rune_rack, practice_chicken AND the 4 instructors inside were all unreachable (A* stopped at the footprint's south edge). Fix (world.colliders.json): removed all 18 rects inside those 3 footprints, making them ghost-walled like the already-working spawn_house/cooks_house (visual walls remain). With the rooms open, the v61 instructor relocations were REVERTED so all 6 stand in their proper in-room spots again; fire_ring nudged 1.5u to a clean tile. Verified on a CLEAN origin (port 8190): ALL 22 interactables reachable from spawn (6 instructors within talkRange + 16 fixtures/mobs/landmarks), 0 bricks, 6 doors intact, 0 console errors. Solid walls with real door-portals remains the BACKLOG follow-up. Boot-verified. Deployed v62.

> **v61 (2026-07-01) — tutorial-brick fix: indoor instructors were UNREACHABLE.** While investigating solid house walls, a spawn→instructor A* reachability probe exposed a PRE-EXISTING bug (present since the zones landed, independent of walls): 4 of 6 instructors — Loremaster Edda (quest_guide), Teller Wynn (banker), Steward Brann (account_guide), Magus Sorrel (magic_instructor) — sat on top of their station-fixture colliders (bank_booth/altar/rune_rack/teaching props), which enclosed their tile in a ~4-unit blocked ring. A* stopped 3.6–5.1 units short even when starting AT the door, so the player could never get within talkRange → could not talk-to them → lesson guidance bricked. Fix (world.manifest.json): the 4 were relocated to the nearest spawn-reachable tile beside their station (empirically found via probe). Verified on a CLEAN origin (port 8186): all 6 instructors now reachable from spawn within talkRange (dist 0.08–1.34, real multi-waypoint paths), 6 doors intact, 0 console errors. Also: solid house walls attempted and REVERTED (sealed instructors in at current grid resolution — see BACKLOG for the proper portal approach). Boot-verified. Deployed v61.

> **v60 (2026-07-01) — pathfinding robustness (2 audit bugs).** Two real A* defects from PARITY_AUDIT closed in world.js: **BUG+6** — the cell key `ci*1000+cj` aliased once a grid exceeded 1000 cols/rows (a hard cap on the OSRS-massive world-scale mandate); now encodes with the live row count `ci*G.rows+cj` (decode `k/KR`, `k%KR`), collision-free at any size. **BUG+7** — `cellWalkable` indexed `WALK[ci][cj]` with no bounds guard, so a path touching the exact BOUND edge could throw "Cannot read properties of undefined"; now guarded (`inb + WALK[ci] + cell`). Verified on a CLEAN origin (port 8180): normal path still reaches its target (encode/decode round-trips, no regression), a path planned to a BOUND-corner tile returns cleanly with no throw, 6 doors still place, 0 console errors. Boot-verified. Deployed v60.

> **v59 (2026-07-01) — openable doors + gates.** New `src/doors.js` (`window.EMDOORS`, published at import time so world load can use it): a hinged wooden leaf in every house doorway + an iron-banded rat-pen gate, clicked to swing open/shut with a creak, Open/Close verb + Examine (reuses the scenery node shape for free picking/hover). Collision is a DYNAMIC predicate (`window.EMDOORS.blocks`) consulted by `world.moveBlocked()` — mirrors the lesson-region gate, so the baked A* path grid is untouched and pathfinding is unchanged. House doors start OPEN (the verified-walkable island is unregressed); the rat-pen gate starts SHUT — open it to enter the pen (true OSRS Tutorial-Island progression). Wired: `world.placeHouse` + `rat_pen_gate` object branch, `player.arrive()` door branch, main-loop swing tween. Verified on a CLEAN origin (port 8178): 6 doors placed (5 house + gate), gate-shut blocks its gap / open clears it / verb toggles Open<->Close / swing tween completes, an open house door blocks nothing, 0 console errors. Boot-verified. Deployed v59.

> **v58 (2026-07-01) — CRITICAL tutorial fix (found via live smoke test).** The lesson poll (lessons.js check()) only evaluated the current STEP predicate, never the lesson-level complete_when. L0 has no step predicates and completes via flag:appearance_confirmed, which charcreate sets through an em-flag event (nothing fires em-lesson complete:L0). Result: after character creation the tutorial was STUCK on L0 forever. Fix: check() now completes a lesson whenever its complete_when holds (also hardens every action lesson). Verified on a clean origin: real charcreate path (em-flag only, poll-driven) advances L0->L1, and the chain drives L1..L6. Deployed v58.

> **v57 (2026-07-01) — dev kit slimmed (smoke-test finding).** A scripted functional smoke test (driving the live APIs: giveItem/addXp/EMLESSON/em-flag/combat/skill/ground/bank/equip/devtools) confirmed all subsystems respond, and surfaced that the dev test character filled all 28 bag slots -> could not gather during tutorial testing. devtest.js KIT slimmed to essentials (worn combat kit + 1 bow + full runes + core tools + food); extra gear tiers/tools now spawnable via the dev toolbox. Verified: bag 25/28, 3 free, giveItem(logs) works. Boot-verified. Deployed v57.

> **v56 (2026-07-01) — QA sweep + fix.** Full static defect sweep of the v37-v55 body: 49/49 src syntax-clean, 15/15 JSON valid, no monkey-patch double-wraps, no rAF leaks, canonical-mob resolvers agree, all lesson-predicate ids aligned (docs/QA_SWEEP.md). One real fix: skilling.js firemaking success now dispatches em-flag lit:fire so L3 completes on the action (not the 15s anti-brick grace). Orphaned em-settings-change event noted as backlog (harmless). Boot-verified. Deployed v56.

> **v55 (2026-07-01) — quest journal + tooltip depth.** quests-tab.js: locked-quest greying + missing-req tooltip/banner + disabled Start + brown-stone styling (state colouring/grouping/QP total already present). tooltip.js: rich item hovers (name/verb/slot/equip bonuses/value/examine) + world-target tooltips mirroring the hover label, XSS-safe, skipped on touch. Boot-verified. Deployed v55.

> **v54 (2026-07-01) — run animation.** player.js drives the avatar Running_A clip when run energy is on + moving (was always the walk clip). Boot-verified. Deployed v54.

> **v53 (2026-06-30) — skilling anim + zone content.** avatar.js: player plays a looping gather/work-swing animation while EMSKILL.isActive() (chop/mine/smith/etc.), coexists with walk/attack/death, boot-safe. world.manifest.json: signpost + 1-3 teaching props added to all 9 zones (existing kit ids only; scene 524->562). Boot-verified. Deployed v53.

> **v52 (2026-06-30) — instructors are real models.** npc.js addNpc now loads a KayKit rigged glb per role (guide/guard->Knight, mage->Mage, rogue/survival->Rogue, barbarian->Barbarian) with an AnimationMixer (Idle/Walking_A driven off the wander c.moving flag), hiding the procedural box body; defensive fallback to the box if GLTFLoader/glb fails. World now visually consistent: real rigged player + real rigged instructors. Boot-verified (15 nameplates, clean). Deployed v52.

> **v51 (2026-06-30) — polish batch.** levelup.js (new, wired): OSRS level-up popup + jingle, polls EMHUD levels. sfx-actions.js: full procedural SFX coverage for chop/mine/fish/fire/smith/smelt/cook/hit/block/eat/bury/drop/take/equip/bank/prayer/cast/UI/level-up (fixed a dead rawBeep that reached a non-existent EMAUDIO._ctx; own mixer/mute-aware Web Audio bus). items.json: value/weight/highalch/lowalch/examine across all 110 items. Boot-verified. Deployed v51.

> **v50 (2026-06-30) — tutorial chain wired end-to-end.** Fixed the L0-L17 completion breaks found by direct trace: combat.js now dispatches em-flag killed:<mob> (+ _ranged) on kill (giant-rat->giant_rat) for L11/L12; magic-tab.js dispatches cast:<spell> and L16 predicate aligned to the real spell id (gale_bolt = Wind Strike); skilling.js mine now yields BOTH copper-ore AND tin-ore (random) so L8 (has:tin-ore&has:copper-ore) + smelting are reachable. All lesson item ids verified present. Boot-verified clean. Deployed v50.

> **v49 (2026-06-30) — Use-on.** inventory-ops.js: OSRS Use flow (arm Use on a bag item -> tap another item OR a world fixture). Data-driven recipes in assets/data/useon.json: flour+water->dough, tinderbox+logs->fire (lit:fire flag for L3), raw-shrimp on fire/range->cooked, ore on furnace->bronze-bar, bar on anvil->bronze-dagger; fixture recipes route through window.EMSKILL (no dup). Boot-verified. Deployed v49.

> **v48 (2026-06-30) — combat formulas + ground items + chat depth.** combat.js: OSRS effective-level/accuracy-roll/max-hit formulas + per-weapon attack-speed cadence + style stance bonuses (combat.json). grounditems.js (new, wired into main loop + inventory Drop): drop->ground mesh+proxy->Take/Examine, stacking, 60s despawn. hud.js chat: coloured/categorised by channel, timestamps, PM From/To, working filters, 200-line scrollback, XSS-safe sanitize. Boot-verified (EMGROUND.drop live, scene 524). Deployed v48.

> **v47 (2026-06-30) — REAL CHARACTER.** The blocky procedural avatar is replaced by the CC0 KayKit rigged glTF character (avatar.js loads assets/ext/characters/*.glb, THREE.AnimationMixer drives idle/walk/attack/death/cast, weapon+shield clone onto handslot.r/.l bones). player.js drives mixer state when the glb is active, else the procedural rig (boot-safe fallback preserved). Verified: usingGlb flips true on appearance set, Knight.glb 200, gear sockets populate. Deployed v47.

> **v46 (2026-06-30) — core loop FIXED (from owner playtest).** Root cause of dead combat AND dead magic: world.js placeMob() handed the click-picker a throwaway CLONE, not the canonical mob node, so HP/death never stuck — fixed at root (proxy.userData.mob = node) + defensive resolvers in combat.js/magic-tab.js. Magic now casts on the real mob with element-coloured projectile + impact. Prayer shows clear on/off + overhead sprite. HUD: desktop dock-lock (panel no longer dragged top-left over XP/QA by mobile-ius landscape rule), full-width skills grid, WORKING chat input. Creator: OSRS 2-column no-scroll + rotating 3D preview. CC0 KayKit pack downloaded (5 rigged chars + 14 gear) for the avatar swap (next). Boot-verified, deployed v46.

> **IN FLIGHT (2026-06-30, post-v45 owner playtest).** Owner playtest found the shipped core loop functionally broken (boot-verified != works). Two tracks running: (1) ASSET PIVOT — operating-law 0.1 revised to allow free CC0 assets; sourcing real low-poly character+gear to replace the blocky procedural avatar (ASSETS-REAL). (2) FUNCTIONAL FIXES from the bug list: HUD-FIX (inventory/XP overlap, skills panel space, tab dock, working chat input), COMBAT-FIX (melee actually works), PRAYER-FIX (on/off clarity + overheads), MAGIC-FIX (cast + animation), CREATOR-LAYOUT (OSRS 2-column, no-scroll). Each will be integrated + boot-verified + deployed as it lands; owner re-playtests as the gate.

> **v45 (2026-06-30) — 3D character creator + interaction parity.** Replaced the flat 2D paper-doll creator preview with a live rotating 3D render of the REAL in-world avatar (charcreate.js uses a mini THREE scene + window.EMAVATAR.buildBody(sel); SVG paper-doll kept only as a no-THREE fallback). Boot-verified: creator preview is a 300x300 canvas updating per option, not SVG. Also P2 interaction parity (interact.js): examine-on-everything to chat, nearest-pick on overlapping taps, red X + "I cant reach that" feedback, wall occlusion on walk-taps, red Cancel last in menus. Clean-origin boot-verified. Deployed v45.

> **v44 (2026-06-30) — all zone props modelled.** PROPS-FINISH: rat_pen_gate/target_butt/rune_rack/boat authored (build_kit.py), Blender-exported to assets/kit, registered in PIECES + MARKER_PIECE — every placeholder block is now a real faceted mesh. Clean-origin boot-verified (scene 523). Deployed v44.

> **v43 (2026-06-30) — real zone props + bank depth + quest reward.** ZONE-EXPORT: 8 Blender fixture meshes (range/furnace/anvil/bank_booth/altar/ladder/signpost/dock) exported to assets/kit/*.glb, registered in PIECES, wired so placeFixture uses the real mesh + manifest markers (ladder/altar/signpost/dock) place real props (placeholders remain only for gate/target/rune_rack/boat). BANK-DEPTH: tabs, search, withdraw-as-note, placeholders, 4-digit PIN (bank.js). QUEST-REWARD: OSRS reward scroll on completion (quests-tab.js). Clean-origin boot-verified (scene 519, EMBANK/EMQUEST live). Deployed v43.

> **v42 (2026-06-30) — ISLAND WALKABLE.** ZONE-RENDER landed: instanceManifest(world.js) now renders manifest buildings (procedural houses), skilling fixtures (fishing/fire/range/furnace/anvil/bank/poll via placeFixture), rat/chicken mobs, and placeholder landmarks; new runtime addNpc (npc.js, window.EMNPC.add) spawns the 10 instructors as procedural low-poly bodies with nameplate+click-proxy+collider+wander, talkable (talk() resolves their dialogue tree by id). Clean-origin boot-verified: loads (515 scene objs), player walks north through all 9 zones, 15 nameplates, dialogue trees present. No Blender needed for walkability. Deployed v42. Remaining: ZONE-EXPORT (optional fixture-mesh glb polish).

> **v41 wave — P4+P7 CONTENT authored (2026-06-30).** 7 agents landed: full L0-L17 lesson chain verified+wired (lessons.json), 11 instructor dialogue trees (dialogue.json, dual-keyed), 2 starter quests (quests.json), 67 examine lines (examine.json), 8 zone fixture builders (build_kit.py), 9-zone layout + instructor placement (world.manifest.json, ids reconciled to live dialogue/lesson/music ids), unique generative per-zone music (audio.js/music-engine.js, shipped v41). HONEST GAP: the zone layout is authored to the editor schema but the runtime instanceManifest(world.js) only reads objects/scatter/fixtures, and the 8 fixture meshes need a Blender GPU export — so the 9 new zones do NOT render in-game yet. Next: ZONE-RENDER (wire instanceManifest to render buildings/npcs/markers + NPC proxies) + ZONE-EXPORT (blender export fixture glb).

> **v40 (2026-06-30) — BOOT HOTFIX.** v39 bricked at "Entering the Chapel…": world.js read pos/player at module top-level (SPAWN), and the player<->world circular import made that a TDZ that crashed the whole ES module graph (so NOTHING booted and the loader never cleared — no JS ran to fire the 20s backstop). Fixed: SPAWN uses literal defaults, overwritten from colliders JSON. Verified on a clean origin: loader clears, EMHUD/EMTICK/EMCOMBAT/EMPRAYER init, scene=328 objects, login shows. Deployed v40.

> **v39 (2026-06-30) — QA-fix wave 2 SHIPPED (awaiting playtest).** 7 more agents: combat loop (walk-to-mob -> fight -> death/respawn + attack/death anim), skill-guide panel (click a skill in Stats), tutorial progression (lessons complete on the real action + 15s anti-brick grace), per-zone music + crossfade + persisted audio settings, 8 elemental/catalytic rune items (spells now castable), skill-guide wired into HUD. Camera keys (C9) + forgiving scenery tap (C11) were already live. Deployed v39 (modules 200) at https://eldermoor.vercel.app . Board: To Do 0 / Shipped 26 / Done 1. [~] pending on-device playtest via the v39 QA panel.

> **v38 (2026-06-30) — QA-fix wave SHIPPED (awaiting playtest).** 10 parallel agents shipped from v36 owner QA: login/landing + fixed logout; HUD overhaul (XP no longer overlaps inventory, persistent chatbox, stat-orb cluster, docked tab strip, blue->brown tone); combat styles (weapon-aware, per-style XP split); 28-prayer roster; 23-spell book (strike/bolt/blast/wave + teleports/alch, rune-gated); dialogue dismiss-on-walk-away + new-chat + Esc; dev toolbox (give/set/spawn/teleport); full dev rune+gear kit; +70 item tier ladder (Ferrite->Sunsteel); minimap (compass/click-to-walk/zoom/blips). Integrated (main.js+hud.js wiring), node --check clean, deployed-URL verified (modules 200) at https://eldermoor.vercel.app . [~] pending on-device playtest via the v38 in-game QA panel (auto-syncs to the dashboard). Character art (avatar/creator/mage-studio, src/char/*) owned by a SEPARATE chat.

**Authoritative current-state snapshot.** Pairs with ARCHITECTURE.md, BACKLOG.md, NEXT_TASKS.md, METRICS.md.
For the full narrative handoff see `PROJECT_HANDOFF.md`; phase status in `ROADMAP.md`; item-level tests in
`PARITY_AUDIT.md`.

- **Live version:** v36 · **Link:** https://eldermoor.vercel.app (production auto-deploys from `claude/modular-v23`)
- **Overall:** ~24% (features integrated + boot-verified; **live-playtested separately — see METRICS**).
- **Client:** modular ES (`src/*.js`, ~37 modules) + `index.modular.html` shell, Three.js r128 (CDN),
  data-driven from `assets/data/*.json`. Deployed on Vercel. `eldermoor_client.html` = frozen v17 rollback.

## Works (verified in a foreground browser)
Walking / A* pathfinding / collision · camera (orbit, pinch, arrow/WASD/MMB) · HUD chrome (14 tabs, chat
channel filters, minimap, inventory, 23-skill stats total 32).

## Integrated + boot-verified (NOT yet live-playtested)
Render-correctness fixes · scenery + data-driven examine · status orbs + run energy · hover text + tooltips
· world map · minimap terrain + click-to-walk · XP counter · procedural audio · save/load · branching
dialogue runner · NPC speech bubbles · inventory right-click ops · equipment system + tab · Prayer / Magic /
Quests / Settings / Emotes / Music / Friends / Ignore / Account / Logout tabs · skilling engine + fixtures ·
resource depletion · combat engine (melee + ranged + magic-cast, player HP, death/respawn, retaliate) ·
attackable rat + Attack · banking · tutorial state machine · character creator + appearance-apply ·
Make-X interface (wired to smithing/cooking) · prayer points (drain + bury-bones) · quest accept/track/
complete flow · action SFX coverage (`sfx-actions.js`) · lesson gating (`gating.js`) · single 0.6s global
game tick (`tick.js`, shared by combat + skilling).

## Recently resolved
- **P1 render-correctness wave (shipped, boot-verified + deployed; live playtest pending):** the parallel
  fleet (builder-A on engine.js, builder-B on npc.js, builder-C on meshes/loader, + orchestrator wiring in
  player.js) landed all 8 P1 fixes — explicit material-role map (P1.5), terrain map-null (P1.1), water
  renderOrder (P1.2), roof register + `isInsideAnyRoof` + z-offset wired in player.js (P1.6, dormant until a
  roofed building exists), sky `toneMapped` + asymptotic altar-glow `decayExp` (P1.7), loader counts
  content-data + 20s backstop (P1.8); P1.3 (nameplates) and P1.4 (flat-shading) verified already-correct
  no-ops. QA'd (P1.6/P1.7 REQUEUE resolved by the orchestrator wiring — QA raced the edit). Boot-verified
  clean (zero console errors on the rebooted deployed build).
- **Kanban dashboard + `shipped` status:** `dashboard.html` rebuilt as a kanban (To Do / Building / Review /
  Shipped / Done) with a bottleneck highlight, an honest banner naming the real gate (human playtest), and a
  "Needs my eyes" filter. New `shipped` status = boot-verified + deployed, awaiting human playtest (distinct
  from `done` = playtest-confirmed) — so forward progress is visible instead of piling at "review".
- **Fleet live-progress dashboard (tooling, not a player feature):** `dashboard.html` + `progress.json`
  (local single-writer board) + `api/progress.js` (Vercel KV, mirrors `api/qa.js`) + `tools/progress.js`
  (reporter CLI). Watch the parallel build fleet live in-session (preview) or on any device once KV is
  connected. Statuses: queued/building/review/requeue/done/blocked/failed. Boot-verified live (status flip
  reflected on the board with no reload). Not yet deployed to production.
- **v36 — Worn gear on the avatar (all slots) + QA fixes (from v35 owner QA):** `avatar.js` `renderWorn()`
  now renders EVERY worn slot, not just weapon/shield — weapon (hand), shield (hand), body/armour
  (torso shell + pauldrons), cape (back), gloves (hands), and helm/legs/feet anchors are ready for
  future items; unequipping removes the mesh. The tab panel (`mobile-ui.js`) is now translucent so the
  3D character is visible behind the open Inventory/Equipment panel (you can watch gear appear). Name
  entry enforces **2–12 chars** with a live counter/hint. Objective no longer stale: removed the bogus
  hardcoded "Brother Aldric" objective (NPC not in data) and charcreate now fires `appearance_confirmed`
  so lesson L0 completes and the objective advances after character creation. Production now
  auto-deploys from `claude/modular-v23` (Vercel Production Branch switched). Agent-QA'd + 8/8 worn-gear
  logic test. **Still open from v35 QA: combat pathing/death/respawn (1C); landscape panel polish.**
- **v35 — Parameterized player avatar (`avatar.js`):** the character-creator picks now appear on the
  in-world 3D body. A procedural humanoid is built from THREE primitives off `window.EMAPPEARANCE`
  (parts + colours + body type): head/hair/beard/hood, torso (tunic/robe/jerkin/yoke), arms
  (sleeved/bare/wrapped), hands (bare/gloves/bracers), legs (trousers/skirt/breeches), feet
  (boots/shoes/sandals). Limb pivots register onto `window.EMRIG` so the existing `player.js` walk
  cycle animates them; the static `player.glb` is hidden while the avatar is active. Worn weapon/shield
  from `EMEQUIP.worn` render in the hands. Save format unchanged. **loaders.js re-asserts the avatar
  after `player.glb` loads** (fixes a glb-vs-avatar render race — QA blocker). `bury` op added
  (removes bones + Prayer XP). Agent-QA'd (PARTIAL→fixed) + 10/10 THREE-stub logic test before owner QA.
- **v34 — Mobile 1A QA round 3 (from in-game QA report):** inventory **tap** now performs the default
  action (Wield equips, Eat eats, Examine prints) instead of doing nothing; equipping no longer **bugs the
  equipment slot** (equipment-tab handles the {id,count} worn shape); **dialogue** is now a compact bottom
  dock in both orientations (no more mid-screen float / oversized box) with a smaller Continue button; the
  **objective** collapses to an always-visible tappable pill (never lost; tap to recall); **tabs are
  collapsible** (toggle top-right) and the **landscape** tab bar is fixed on-screen (7-col, 2 rows).
  Boot-verified 16/16 headless. Still later milestones: equip-on-avatar + eating animation (1B), combat
  death/respawn/animation (1C), QA live-sync (needs Vercel KV connected).
- **v33 — Character-creator LIVE PREVIEW (owner-requested):** a 2D SVG paper-doll in the
  creator (`charcreate.js`) updates as you toggle every option (hood/beard, tunic/robe/jerkin/yoke,
  trousers/skirt/breeches, boots/shoes/sandals, sleeved/bare/wrapped arms, gloves/bracers, body type) plus
  all colours (skin/hair/torso/legs/feet). Sticky at the top of the creator so it stays visible while cycling.
  It shows part shapes the static 3D model does not, so it is a real preview now; a 3D/in-world preview can
  follow with the parameterized model. Boot-verified 11/11 headless.
- **v32 — QA findability + top-left declutter (1A polish from on-device QA):** the in-game **QA**
  button now shows the build **version** (the game HUD hides the original version bar, so this is where you
  read it) and is bigger/clearer; the XP-gained counter was moved BELOW the QA button so the two no longer
  overlap in the top-left. Boot-verified 9/9 (button visible, shows v32, ≥40px, no XP overlap, overlay+notes
  open). Backlogged (owner-requested): a **character-creator live preview**. 
- **v31 — Live QA sync backend (owner-requested):** the project gains its first **backend** — a
  zero-dependency Vercel serverless function `api/qa.js` backed by **Vercel KV** (Upstash REST via the
  injected `KV_REST_API_URL`/`KV_REST_API_TOKEN`). The QA panel (`qa-panel.js`) now auto-POSTs results
  every few seconds (debounced; footer shows synced/offline; failures silent), so the tester just plays +
  checks boxes and the dev reads the latest via `GET /api/qa` (no copy/paste). Static serve unchanged
  (no package.json/build; Vercel auto-builds `/api`). **Setup required (Josh): connect a Vercel KV store
  to the project + redeploy — see HUMAN_ACTIONS.md;** until then the function returns 503 and the panel
  falls back to Copy/Share/Download. Client sync boot-verified 6/6 (POST payload: version/results/report/
  counts/device + graceful failure); function `node --check` clean (runs live once KV is connected).
- **v30 — Test infrastructure (owner-requested; not Milestone 1B):**
  - **Dev test character** (`src/devtest.js`, `window.EMDEV`): on every load sets all skills to level 99
    and tops up a combat kit in the bag (bronze-sword, shortbow, 500 arrows, 1000 air+mind runes,
    bronze-dagger, cooked-shrimp, bones, 10k coins). Idempotent (ensures quantities, never overflows);
    no auto-equip yet (equip via inventory long-press → Wield; auto-equip waits for 1B's equip-tab fix).
    Default-on; toggle `EMDEV.setEnabled(false)` / `window.EM_DEVTEST_OFF`.
  - **In-game QA panel** (`src/qa-panel.js`, `window.EMQA`, `assets/data/qa.json`): a "QA" launcher
    (top-left) opens a mobile-first checklist for the current build — Pass/Fail/Skip + a note field per
    item, persisted to `eldermoor:qa:<version>`, compiled into one Markdown report with Copy / Share /
    Download. The tester checks off items in-game and sends back ONE report instead of retyping per item.
    I update `qa.json` each release with what to test. Boot-verified by an 18/18 headless test.
- **v29 — Milestone 1A QA fixes (round 2):** dedicated **landscape** layout (tab panel docks left,
  anchored top+bottom so it never clips; minimap cluster top-right; tabs bottom-right); the top-right HUD
  cluster (minimap/orbs/world-map button) reflowed into one non-overlapping right-edge stack and the XP
  counter moved top-left (they used to overlap each other and the panel); responsive panel sizing
  (`max-width:100vw-12px`, on-screen in both orientations); **inventory touch interactions** — long-press
  opens the option menu on mobile (`inventory-ops.js`; tap = op0, long-press = context menu with
  Use/Wield/Eat/Drop/Examine, trailing-click suppressed, haptics); objective banner now re-shows on entry
  (`em-appearance`) and stays ~8s. Boot-verified by a 26/26 headless-Chromium UI test (incl. landscape
  no-clip/no-overlap, cluster non-overlap, long-press menu, Examine→chat). **Pending Josh's on-device QA.**
  Known limitation: character-creator **part SHAPES** (e.g. boots vs sandals, trousers vs skirt) don't yet
  change the model — the player is a single static glTF; only COLOURS apply. Options/skirts/footwear exist
  and persist; reflecting part shape needs a parameterized player model (separate modeling milestone).
- **v28 — Mobile Sprint 1, Milestone 1A (responsive UI framework):** new `src/mobile-ui.js`
  (`window.EMUI` + `window.EMHAPTIC`). Live portrait/landscape orientation detection (body
  `em-portrait`/`em-landscape`, no reload); fluid panel/tab/chat layout that stacks without overlap;
  ≥44px touch targets; dialogue restyled as a docked bottom sheet; single active panel (tab panel ↔
  dialogue mutually exclusive, chat yields); collapsible chat; auto-hiding objective banner; stray
  floating emote FAB removed (`emotes.js`); character **name entry** + validation in the creator
  (`charcreate.js`, saved to `eldermoor:name`/`window.EMNAME`); `viewport-fit=cover` for safe areas;
  haptic framework. Boot-verified by a 19/19 headless-Chromium UI test. **Pending Josh's on-device QA.**
  Gameplay (combat/skills/quests/banking/audio) intentionally untouched (later milestones).
- **v27:** single authoritative **0.6s global game tick** (`src/tick.js`, `window.EMTICK`): combat and
  skilling dropped their two independent `setInterval`/`setTimeout` clocks and now subscribe to one shared
  cadence (OSRS one-tick model), with a private-interval fallback if the clock is absent. Verified by a 7/7
  functional test (shared clock, sub/unsub, teardown). Shipped v27 (commit e68d1b8). Live-playtest pending.
- **Tooling:** policy-driven **Claude Code configuration** installed (commit 3a9fe8d) — `.claude/settings.json`
  + SessionStart / PreToolUse / PostToolUse / Stop hooks, all validated against simulated payloads, plus a
  CLAUDE.md EXECUTION POLICY section. Converts prompt-driven behaviour to enforced policy.
- **v26:** lesson gating (`src/gating.js`, `window.EMGATE`) — gates skill/combat/bank actions + movement
  regions by tutorial step with OSRS-style nudges; anti-brick (open while instructors/zones absent). Shipped
  v26 (commit 11484f9). Live-playtest pending.
- **v25:** prayer points/tab (point pool, activation drain, bury-bones), Make-X wired to smithing (anvil) +
  cooking (range), quest accept → track → complete flow, and action SFX coverage (`sfx-actions.js`); plus a
  fix un-escaping invalid `\'` string delimiters in `sfx-actions.js` + `skilling.js`. Integrated + cache-free
  boot-verified; shipped v25 (commit 88eaa61). Live-playtest still pending.
- **v24:** ranged combat (bow + arrows consume ammo, projectile, max range, melee fallback, Ranged+HP XP) and
  magic-cast on mobs (click combat spell → target a mob, consume runes, bolt projectile, Magic+HP XP) both
  integrated + cache-free boot-verified; shipped v24. Live-playtest still pending (see METRICS / NEXT_TASKS).
- **BLOCKER (fixed):** a smart-quote normalization pass left unescaped apostrophes inside single-quoted
  strings (e.g. `Expert's`), which `node --check` tolerated but the browser rejected (`Unexpected
  identifier 's'`). Escaped across 33 files; cache-free boot verified clean; shipped v23.

## Standing constraint
No live 3D-interaction testing in the build environment → "integrated" features are unproven in actual play
until a real-browser playtest pass. The headless preview also caches ES-module deps, so re-verification uses
a cache-free copy or the deployed URL.
</content>
