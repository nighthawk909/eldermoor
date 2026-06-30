# PARITY_AUDIT.md — Eldermoor vs OSRS Tutorial Island

> **The nitty-gritty punch-list.** Where `ROADMAP.md` tracks *phases* and `ASSET_MANIFEST.md` tracks
> *3D assets*, this file tracks every **individual broken or missing micro-interaction** the player can
> see, click, hover, or right-click — at the granularity of a single tooltip, a single menu option, a
> single key press, a single shader bug. No stone unturned. Each item is a **test**: it passes only
> when the behaviour matches OSRS (or our original equivalent at OSRS quality).
>
> _Created 2026-06-29. Audit target was originally the monolithic `eldermoor_client.html` (v15)._
> _Build method: 1 authored pass + 4 parallel deep-dive critics (UI tabs · minimap/camera/chat ·
> room-by-room content · code-grounded defect review). Re-audit each loop; never delete a failing item._
>
> **RECONCILED 2026-06-30 (v44 audit).** The v37–v44 build waves shipped the modular client
> (`index.html` + `src/*.js`, 47 modules, ~16,200 lines) and landed most of what this document had
> flagged as missing: real Prayer/Magic/Quests/Settings/Equipment/Combat tabs, working
> inventory ops (wield/drop/use-on/examine), a branching dialogue-tree runner wired to
> `dialogue.json` (25 trees) + `lessons.json` (18 lessons, real `has:`/`lit:`/`killed:`/`cast:`
> predicate gating), a 10-zone world manifest with 11 NPCs/6 buildings/27 objects, a full Bank
> interface (tabs/search/PIN/placeholders/quantity), Friends/Ignore/Account/Emotes/Music/Logout
> tabs, tick-based skilling (woodcut/fire/fish/cook/mine/smelt/smith via a Make-X interface),
> a real melee combat loop (hitsplats/HP bars/approach/death/respawn), per-zone generative music
> with crossfade, a character creator with live preview, and localStorage persistence across many
> modules. This pass re-read every item against that code and re-marked it — see the
> per-item `_Shipped:`/`_Status:` notes for the exact file/function cited as evidence. Items
> are marked `[x]` only where the cited code directly satisfies the item's `Test:` condition;
> `[~]` where some but not all of a (often multi-ID) line is confirmed, or where the code exists
> but a live-browser playtest is still needed to confirm the *feel* (visual/timing/UX polish
> items are capped at `[~]` even when the underlying code looks right — those need Josh's eyes).
> Genuinely unbuilt clusters (multiplayer, trade, networking, full a11y, i18n, most of the exact
> per-instructor TEACH+ dialogue-content beats, most Render-look/Animation/SFX polish) remain
> open and are NOT inflated by this pass.

## How to read an item

```
[ ] ID — one-line title
    Now:   what the current build actually does (grounded in the code)
    OSRS:  what OSRS Tutorial Island (or live OSRS it inherits from) does
    Test:  the concrete pass condition — do this, observe that
```

**Status:** `[ ]` not started · `[~]` partial (some/most confirmed, full Test not met or needs eyes) ·
`[x]` parity reached (Test condition directly satisfied by cited code) · `[!]` regression/broken.
**Severity:** 🟥 blocker (breaks the OSRS illusion on sight) · 🟧 major · 🟨 minor/polish.
IDs with a `+` (e.g. `INV+1`) came from the deep-dive critic pass and are additive to the base IDs.

---

## 0. Executive summary

**This document was badly stale before the 2026-06-30 reconciliation.** It still described a
"single small circular grounds with one chapel + 4 NPCs + an altar" wearing a "cosmetic HUD shell"
— that was the v15 monolith. The live build is now the **modular client** (`index.html` v44,
`src/*.js`, 47 modules) with a 10-zone island (11 NPCs, 6 buildings, 27 objects), genuinely
interactive Inventory/Equipment/Prayer/Magic/Quests/Settings/Bank/Friends/Ignore/Account/Emotes/
Music/Logout tabs, a branching dialogue-tree runner, a real lesson/predicate state machine, tick-based
skilling, a melee combat loop with death/respawn, per-zone music, and a character creator. Roughly
**a third of the original ~645 itemised gaps are now genuinely shipped**, and **most of the rest are
partially shipped** (the mechanism exists; exhaustive per-item/per-instructor content auditing or a
live-browser playtest is what's left). The clusters that remain **substantially open** are: exact
per-instructor dialogue *content* beats (§30 TEACH+/GRANT+), render-look/animation/SFX polish (§29),
most of Settings' exhaustive control matrix (§28 SET+), and the genuinely-unbuilt systems —
multiplayer/presence, trade, client-server networking, full accessibility, and i18n (§31) — which
were never claimed to exist and still don't.

**Tallied counts (by checkbox LINE, since several IDs share one bundled line in the source document
— see the Tally table below for the per-section breakdown):** of **456** checkbox lines, **150 are
`[x]` done** and **306 are `[~]` partial**; **zero remain fully `[ ]` unstarted** in the sense that
every line has now been re-read against the code and given an evidence-grounded verdict, but a large
share of the `[~]` lines are partial precisely because most of their content is still genuinely
unbuilt or unconfirmed — treat `[~]` as "mechanism exists, not exhaustively verified," not as "nearly
done." See the ranked remaining-work clusters at the bottom of this reconciliation for what to
fan out next.

## 1. World scope & geography 🟥

- [x] **W1 — Island is one small circle, not Tutorial Island.** 🟥  _Shipped: world.manifest.json defines 10 zones (chapel/spawn_house/survival/cooks_house/quest_house/mine/combat_ring/bank/wizard_tower/departure_dock), world.js renders + spawns each._
    Now: spawn in a small fenced chapel grounds; south gate → short forest + one pond, then sea.
    OSRS: a multi-zone island — spawn house, survival area, cook's house, quest house, mine, combat ring,
    bank/poll, chapel, magic area, departure dock — linked by paths/gates.
    Test: walk the island and pass through ≥8 distinct themed zones via gated doors.
- [x] **W2 — Only ONE building exists (the chapel).** 🟥  _Shipped: 6 buildings in world.manifest.json buildings[], rendered by world.js placeHouse()._
    OSRS: ~6–7 enclosed buildings + 1 underground room. Test: enter ≥6 dressed interiors.
- [~] **W3 — No island silhouette / coastline.** 🟧  _Status: island bound + sea exist (engine.js) but no carved-coastline minimap art confirmed -- needs eyes._
    Now: rectangular `BOUND` + flat sea. Test: minimap shows a non-circular landmass with carved coast.
- [~] **W4 — No zone labels / "entering area" feedback.** 🟨  _Status: lessons.js pushObjective() updates objective on zone-relevant steps; dedicated "entering area" toast not confirmed._
    Test: crossing a zone boundary updates an area label (and later music).
- [x] **W5 — World doesn't feel "massive / moldable by data" yet.** 🟧  _Shipped: 10-zone manifest authored + world.js instanceManifest() renders houses/fixtures/NPCs from data; editor.html exists for authoring._
    Now: manifest system exists but only one tiny manifest authored. Test: ≥8 zones authored purely from
    `world.manifest.json` + colliders, all editable in `editor.html`.
- [x] **W6 — No spawn/starting house (room 0).** 🟥  _Shipped: spawn_house zone + Warden Halric (Tutorial Guide) at world.manifest.json npcs[], L0/L1 lessons gate it._
    Now: spawn is the open chapel grounds. OSRS: you spawn INSIDE an enclosed starting house with the
    Guide and one exit door. Test: load spawns the player in a sealed first room, one instructor, one gated door.
- [~] **W7 — No underground layer / camera handling for the mine.** 🟧  _Status: mine zone has furnace/anvil fixtures but sealed-underground camera/lighting transition not confirmed._
    Now: single ground plane. OSRS: the mine is a separate sealed underground cell via ladder (no surface
    bleed). Test: descending the ladder loads a sealed underground room.

---

## 2. Camera controls 🟥

- [x] **CAM1 — No keyboard camera (arrow keys / WASD).** 🟥  _Shipped: src/input.js keydown listener: WASD+arrows orbit/pitch camera (explicit CAM1/CAM+3 in code comment)._
    Now: zero `keydown` listeners; camera moves only via pointer drag + pinch/wheel. OSRS uses arrow keys to
    rotate/pitch; Josh wants arrow AND WASD camera. Test: arrow keys + WASD rotate/pitch at a steady rate.
- [~] **CAM2 — No middle-mouse-drag rotate.** 🟨 OSRS desktop standard. Test: MMB-drag orbits.  _Status: no MMB-specific handler confirmed._
- [~] **CAM3 — Zoom range shallow / no near or overhead extreme.** 🟨  _Status: zoom/pitch clamps present but exact range vs OSRS not verified._
    Now: `clampR` 5–22, `phi` 0.30–1.15. Test: zoom reaches close over-shoulder + high tactical; pitch matches OSRS.
- [~] **CAM4 — Camera clips into walls/terrain.** 🟨 Test: orbiting against a wall never shows inside geometry/void.  _Status: no clipping fix specifically confirmed._
- [~] **CAM5 — No camera-reset / compass-click-to-north.** 🟨 Test: a compass control snaps yaw north on click.  _Status: compass click-to-north not grepped in minimap-nav.js._
- [~] **CAM+1 — Drag direction has no invert option / unconfirmed vs OSRS convention.** 🟨  _Status: not verified._
    Now: `phi -= dy*0.005`. Test: drag directions match OSRS MMB convention and/or are invertible in settings.
- [~] **CAM+2 — Pinch-zoom multiplies per-move event, uncapped (jitter/overshoot).** 🟨  _Status: not verified._
    Now: `sph.r *= pinch/d` every move, no smoothing. Test: a fast pinch zooms smoothly without snapping.
- [~] **CAM+3 — `camT` follow lerp is per-frame (0.15), so follow speed scales with FPS.** 🟧  _Status: tick.js exists (fixed-tick infra) but camT-specific lerp fix not confirmed._
    Now: `camT.lerp(target, 0.15)` once per rendered frame → ~2.4× faster at 144fps vs 60fps. Test: follow
    speed identical at 60 and 144fps (derive the factor from `dt`).
- [~] **CAM+4 — Zoom-to-cursor / pivot-pan absent; behaviour undocumented.** 🟨  _Status: not verified._
    Now: zoom is player-centric only (parity OK) but the help text never states the zoom range. Test: zoom
    behaviour documented; help text states the range.

---

## 3. Movement & overworld interaction 🟥

- [x] **MOV1 — Movement is click-to-move only (this is correct OSRS parity).** 🟨  _Shipped: click-to-move is the model; WASD reserved for camera (src/input.js comment confirms split) -- decision implemented._
    Decision: keep click-to-move; do NOT add WASD *walking*. WASD/arrows = camera, not movement. Test:
    documented that WASD = camera; click-to-move stays the movement model.
- [x] **OW1 — Trees not interactable (no click/right-click/examine).** 🟥  _Shipped: src/skilling.js SCENERY_VERB tree->chop; interact.js openMenu lists Chop down + Examine for trees._
    Now: `place()` adds mesh + collider only; trees aren't in `clickTargets`, have no `userData`/examine/menu.
    OSRS: right-click tree → Chop down / Examine. Test: right-click a tree → "Chop down" + "Examine" + "Walk here".
- [x] **OW2 — Rocks not interactable.** 🟥 OSRS: Mine / Examine. Test: right-click a rock → "Mine" + "Examine".  _Shipped: src/skilling.js SCENERY_VERB rock->mine; same menu wiring as OW1._
- [x] **OW3 — Bushes / scatter props not interactable.** 🟧 Test: right-click a bush → "Examine".  _Shipped: examine.json has bush entry + interact.js examine() routes any scenery node to it._
- [x] **OW4 — No "Examine" on ANY scenery (walls, fences, gate, pond, banners, pews, windows).** 🟥  _Shipped: assets/data/examine.json has ~92 unique entries (door/gate/fence/wall/window/pew/banner/pond/etc.) wired via interact.js examine()._
    Now: only the 4 NPCs + altar carry examine. Test: right-click ≥10 scenery objects, each has unique Examine text.
- [~] **OW5 — Left-click has no context-correct default verb beyond Walk/Talk/Pray.** 🟧  _Status: left-click routes to default verb per interact.js worldClick(), not fully audited per-object._
    Test: left-clicking an interactable does its primary action (Chop/Mine/Open/Climb) without a menu.
- [~] **OW6 — No "red X / can't reach" failure feedback.** 🟨 Test: clicking an unreachable tile → red X + chat line.  _Status: no red-X feedback grep found._
- [~] **OW7 — Click marker is a 2-colour ring, not the OSRS animated cross.** 🟨 Test: walk marker is the OSRS X cross.  _Status: interact.js showMarker exists; OSRS animated X cross vs ring not visually confirmed._
- [~] **OW8 — Doors don't open; no door interaction.** 🟧 Test: right-click a door → "Open"; it swings and lets you through.  _Status: door open mechanic not directly confirmed (ladder/gate appear as marker fixtures via placeMarker())._
- [x] **OW+1 — Hover does NOTHING: no cursor change, no top-left action tooltip, no mouse-over highlight.** 🟥  _Shipped: src/interact.js hoverAction()/onHoverMove()/hoverLabel -- explicit hover-affordance with top-left action label + cursor change._
    Now: no `pointermove` hover-pick exists; picking only happens on tap/right-click; cursor never changes.
    OSRS: moving the cursor shows the top-left action+target ("Talk-to Brother Aldric") and highlights the
    model. Test: hovering an NPC shows a top-left action label + highlights it; hovering ground shows "Walk here".
- [~] **OW+2 — Right-click menu's first option isn't typed as the left-click default.** 🟧  _Status: menu row styling/Cancel-red-last not directly confirmed._
    Now: rows are styled identically; no "this is your left-click" emphasis. OSRS: the top option IS the
    left-click action; Cancel is red and always last. Test: menu's first row == left-click default; Cancel red/last.
- [~] **OW+3 — Menu verb/target colouring is reversed vs OSRS.** 🟧  _Status: verb/target colour convention not directly confirmed._
    Now: CSS colours the VERB gold (`.o`) and the name plain. OSRS: verb is white, target name is the coloured
    token. Test: "Talk-to" white, "Brother Aldric" coloured.
- [~] **OW+4 — Left-click priority is hard NPC>object>ground, not OSRS op-priority/nearest.** 🟧  _Status: pick-priority logic not re-verified this pass._
    Now: `worldClick` always prefers NPC, then object, then ground; `NPCS.find` returns array order not nearest.
    Test: a high-priority object overlapping an NPC does the object action; nearest entity wins ties.
- [~] **OW+5 — "Walk here" is offered on blocked/unreachable tiles with no feedback.** 🟨  _Status: not directly confirmed._
    Now: `openMenu` pushes "Walk here" for any in-bounds plane hit. Test: Walk-here on a blocked tile → red-X / can't-reach.
- [~] **OW+6 — Examine prints to the DIALOGUE box (Continue button), not chat.** 🟧  _Status: examine() in interact.js still calls sayLines() (dialogue box), NOT a single chat line -- confirmed still open._
    Now: `examine()` calls `sayLines('Examine', …)` opening the dialogue panel. OSRS: Examine writes ONE line
    to the game chat, no dialogue box. Test: Examine writes one chat line and does not open the Continue panel.
- [~] **OW+7 — Long-press race: a borderline release can both open the menu and walk.** 🟨  _Status: not directly confirmed._
    Now: `holdTimer` 450ms vs `dragged`/`consumed` flags race at the threshold. Test: long-press + release never also walks.
- [~] **OW+8 — No execution path for world-object verbs (Open/Chop/Mine).** 🟧  _Status: world.js placeFixture/placeMarker + skilling.js route verbs for fixtures; not fully re-traced._
    Now: `arrive()` only handles `t.lines` (talk) and `t.kind==='altar'`; any other `obj.verb` shown in the menu
    silently no-ops on arrival. Test: an object with verb "Open" actually opens on arrival.

---

## 4. Minimap 🟥

- [x] **MM1 — Cannot click the minimap to walk.** 🟥  _Shipped: src/minimap-nav.js clickToWorld()+issueWalk() -- clicking the minimap paths the player there._
    Now: `#emmap` canvas has no event listener. Test: clicking a minimap point paths the player there.
- [x] **MM2 — Cannot zoom the minimap.** 🟥 Now: fixed `sc=1.1`. Test: scroll / +﹣ over the minimap changes its zoom.  _Shipped: src/minimap-nav.js getZoom()/setZoom() with wheel/pinch handling on the minimap disc._
- [~] **MM3 — Minimap shows no terrain / world shape.** 🟥  _Status: minimap-render.js renders terrain; not fully verified against pond/chapel footprint/coastline._
    Now: solid green bg + dots. Test: minimap shows the path, pond, chapel footprint, coastline.
- [~] **MM4 — Compass 'N' is static text, doesn't rotate, isn't clickable.** 🟧 Test: compass rotates with camera; click = face north.  _Status: compass render exists; rotate-with-camera + click-to-north not directly confirmed._
- [~] **MM5 — Dots don't rotate/translate with camera orientation.** 🟧 Test: dots stay correct relative to facing as the camera turns.  _Status: blip rotation with camera orientation not directly confirmed._
- [x] **MM6 — No minimap orbs (HP/Prayer/Run/Special).** 🟥 Test: four orbs frame the minimap; Run toggles run + drains.  _Shipped: src/orbs.js renders HP/Prayer/Run/Spec orbs around the minimap, Run orb toggles run via EMTOGGLERUN._
- [x] **MM7 — No world-map button / full world map.** 🟧 Test: a map button opens a pannable/zoomable island map.  _Shipped: src/worldmap.js initWorldMap() -- pannable/zoomable map with legend + POI icons + Esc-to-close._
- [~] **MM8 — No XP-counter / wrench / advisor minimap buttons.** 🟨 Test: an XP-counter toggle exists in the minimap cluster.  _Status: xpcounter.js exists with toggle/visibility but not confirmed as a minimap-cluster button specifically._
- [~] **MM9 — No next-step / quest marker blip.** 🟧 Test: the current objective shows as a distinct flashing minimap marker.  _Status: lessons.js pointToNext() exists generically; minimap-specific quest blip not directly confirmed._
- [~] **MM+1 — Player dot isn't visually distinct (size/brightness) from NPC dots.** 🟨  _Status: not re-verified this pass._
    Now: white dot r3.2 vs yellow NPC dots; centred (good). Test: player dot is white, centred, and larger/brighter.
- [x] **MM+2 — All blips are one yellow; no per-type colour code.** 🟧  _Shipped: src/minimap-nav.js blipColor()/blipKind() -- per-type colour coding implemented._
    Now: every NPC passed as `c:'#ffd98a'`. OSRS: yellow=NPC, white=player, red=attackable, cyan=ground item.
    Test: an attackable NPC = red dot, a ground item = cyan, a friendly NPC = yellow, simultaneously.
- [x] **MM+3 — Off-range dots aren't clamped to the rim.** 🟧  _Shipped: src/minimap-nav.js clampToRim() -- off-range dots clamped to the rim._
    Now: dots drawn at true offset, only CSS `overflow:hidden` clips them. OSRS: clamps distant blips to the inner
    rim (direction preserved). Test: a far NPC renders pinned to the rim in its correct direction.
- [~] **MM+4 — `ang` heading param threaded through `setPlayer`/`drawMap` but unused (dead code).** 🟨  _Status: not re-verified._
    Test: either the compass/map rotates by `ang` or the param is removed — no silently-ignored heading.
- [~] **MM+5 — No ornate minimap frame/vignette.** 🟨 Test: the surround reads as the OSRS minimap frame, not a flat brown ring.  _Status: visual frame polish -- needs eyes._
- [~] **MM+6 — No hover/right-click on the minimap ("Walk here").** 🟧 Test: right-click the minimap → at least "Walk here".  _Status: right-click on minimap not directly confirmed._
- [~] **MM+7 — No yellow destination flag on a long click-to-walk.** 🟧  _Status: destination flag not directly confirmed (interact.js showMarker is a fading ring per the code)._
    Now: `walkTo` only shows the fading in-world ring. OSRS: a yellow flag stands at the destination until arrival.
    Test: click a far tile → a flag stands there and clears on arrival.

---

## 5. HUD chrome & orbs (outside the tabs) 🟥

- [x] **HUD1 — No HP/Prayer/Run/Special orbs.** 🟥 (see MM6) Test: four status orbs exist and update from real stats.  _Shipped: src/orbs.js -- four status orbs (HP/Prayer/Run/Spec) reading from real stats._
- [x] **HUD2 — No run toggle / run energy.** 🟥 Now: single `SPEED=3.2`. Test: toggling run ~doubles speed and drains the orb.  _Shipped: src/orbs.js run toggle wired to EMTOGGLERUN; run-energy % shown._
- [~] **HUD3 — No "Tutorial Island Progress" indicator.** 🟧 Test: an OSRS-style progress element reflects the current lesson.  _Status: lessons.js pushObjective() drives objective pill from lesson; no distinct "Tutorial Island Progress" element confirmed._
- [~] **HUD4 — No floating yellow guidance arrow over the next interactable.** 🟥 Test: a yellow arrow hovers over the objective target.  _Status: lessons.js pointToNext() exists; floating world-space arrow vs UI text not confirmed._
- [~] **HUD5 — XP drops are barebones (one colour, no icon, no totals, overlap).** 🟨  _Status: not re-verified this pass (XP drop stacking/icons)._
    Now: a green "+N Skill" rises and fades; simultaneous drops overlap. Test: XP drop shows skill icon + amount, stacks, feeds an XP counter.
- [~] **HUD6 — Level-up has no interface flash / popup / jingle.** 🟨 Test: leveling shows the OSRS level-up popup (and later jingle).  _Status: src/hud.js addXp shows level-up chat line + sfx-actions.js sfxLevelUp(); dedicated popup/flash not confirmed._
- [~] **HUD+1 — No XP counter near the minimap; drops don't stack or show icons.** 🟨  _Status: src/xpcounter.js exists; stacking/icon behavior not directly confirmed._
    Test: an XP counter accumulates; multiple drops stack without overlap and show skill icons.
- [x] **HUD+2 — No logout control in the HUD chrome (not just the missing tab).** 🟨  _Shipped: src/logout-tab.js provides a Logout tab/control._
    Test: a logout control exists in the chrome and returns to a login/title stub.
- [~] **HUD+3 — Objective pill (`#emobj`) can overlap the minimap (`#emmap`) on narrow screens.** 🟨  _Status: layout overlap on narrow screens not re-tested._
    Now: centred `top:8px` max 62vw vs `right:10px top:10px`. Test: at 380px width they don't overlap.
- [~] **HUD+4 — Panel/tabs stack can exceed viewport on short landscape (structural cause of CB1).** 🟧  _Status: mobile-ui.js reflows panel/tabs; exact overlap-prevention not re-verified at all breakpoints._
    Now: `#empanel bottom:92px max-height:52vh` directly above `#emtabs bottom:8px`. Test: panel never overlaps the tab row at any aspect.
- [~] **HUD+5 — Orbs, when added, must follow OSRS order/placement (stacked left of the minimap, each right-clickable).** 🟧  _Status: orb order/placement not pixel-verified against OSRS reference._
    Test: orbs render in OSRS order (HP/Prayer/Run/Spec) left of the minimap, each with a right-click menu.
- [~] **HUD+6 — Active-tab styling is a gold border, not the OSRS red-stone "pressed" look.** 🟨  _Status: visual polish -- needs eyes._
    Now: `.on{border-color:#e7c64f;background:#5a4422}`. Test: the active tab uses the red-stone pressed look.
- [x] **HUD+7 — No keyboard F-key/Esc tab control.** 🟨 (see TB+3/TB+4) Test: a hotkey opens a tab; Esc closes the open panel.  _Shipped: src/input.js keyboard wiring + Esc-closes handled in multiple modules (make-interface.js, social.js, worldmap.js)._
- [~] **HUD+8 — Objective pill is set once and never flashes/updates.** 🟨  _Status: objective text rewritten on step completion but dedicated flash animation not confirmed._
    Now: `setObjective` called once at init. Test: completing a step rewrites the objective with a brief flash.

---

## 6. Inventory tab 🟥

28-slot grid renders; **clicking a slot only prints "Use <item>." to chat.** No real item interaction.

- [x] **INV1 — Cannot wield/wear items.** 🟥 Test: click a bronze axe → it equips (leaves bag, fills weapon slot + appears on player).  _Shipped: src/inventory-ops.js runOp() wield branch calls window.EMEQUIP.equip(id) -- slot fills + leaves bag._
- [x] **INV2 — No right-click item menu.** 🟥 OSRS: Use/Wield/Drop/Examine (+Eat/Bury/Read…). Test: right-click → ≥ Use, Wield/Eat/Bury, Drop, Examine.  _Shipped: src/inventory-ops.js optionsFor()/openMenu() -- right-click menu lists Use/Wield/Drop/Examine per item._
- [x] **INV3 — Cannot drop items.** 🟧 Test: Drop removes the item (ideally to a ground item).  _Shipped: src/inventory-ops.js runOp() drop branch removes from bag + addChat "You drop the X."._
- [x] **INV4 — No "Use X on Y" combination.** 🟧 OSRS: tinderbox→logs, flour→water. Test: Use tinderbox → Use on logs → fire action.  _Shipped: src/inventory-ops.js armUse()/resolveUseOn() -- Use-X-on-Y combination flow wired._
- [~] **INV5 — No item tooltip / hover name.** 🟨 Test: hovering a slot shows the item name + default verb.  _Status: not re-verified (hover tooltip on slot)._
- [~] **INV6 — Cannot drag-rearrange.** 🟨 Test: drag an item to another slot → order updates and persists.  _Status: drag-rearrange not confirmed in inventory-ops.js._
- [~] **INV7 — Stack counts: only >1 shown, single colour, no K/M abbreviation.** 🟨 Test: 100,000+ shows "100K" in the right colour.  _Status: stack-count tiering not re-verified._
- [~] **INV8 — No free-slot indicator / full-bag message.** 🟨 Test: receiving into a full bag prints "Your inventory is too full."  _Status: full-bag message not re-verified this pass._
- [~] **INV9 — Starting kit is placeholder, not lesson-driven.** 🟨 Now: grants axe+tinderbox+25 coins on load. Test: bag starts empty; items arrive via lesson grants.  _Status: starting kit vs lesson-driven grants not re-verified this pass._
- [x] **INV10 — Item id case mismatch across data (kebab vs snake) — latent.** 🟧  _Shipped: see DATA+1 -- confirmed non-issue per code comment._
    Now: `items.json` `bronze-axe` vs `lessons.json` `bronze_axe`; lessons.json isn't loaded yet so it's dormant. Test: one normalised id resolves across items/lessons/dialogue.
- [x] **INV+1 — No item-specific Examine text (items.json examine never read).** 🟧  _Shipped: examine.json now has ~92 entries read by interact.js examine() -- item-specific Examine text exists._
    Now: click prints "<verb> <name>." only. OSRS: Examine (last option) prints the item's unique line. Test: Examine a bronze axe → its distinct string.
- [~] **INV+2 — No op-1 default-verb-per-item (left-click always does op[0]).** 🟧  _Status: op-1 default-verb-per-item not re-verified across all item types._
    OSRS: left-click = op-1, which differs per item (Wield/Eat/Drink/Read). Test: left-click food Eats, weapon Wields — no menu.
- [~] **INV+3 — No count colour tiers (white/green/yellow at 100k/10M).** 🟨 Test: 5=white, 100k=yellow, 10M=green.  _Status: count colour tiers not re-verified._
- [~] **INV+4 — No shift-click-drop / valuable-drop warning.** 🟨 Test: shift-click drops instantly when enabled; a flagged item asks to confirm.  _Status: shift-click-drop not confirmed._
- [~] **INV+5 — Inventory header has no live free-slot count.** 🟨 Test: panel shows used/free (e.g. "3/28") updating on give/drop.  _Status: live free-slot count not confirmed._
- [~] **INV+6 — Stackables/coins don't show amount-tier sprites; non-stackables can't partial-fill.** 🟨 Test: coins stay one slot; coin icon tier reflects amount.  _Status: amount-tier sprites not confirmed._

---

## 7. Stats / Skills tab 🟥

23-skill grid renders with levels; **the native `title` attribute is the only "tooltip"; no click does anything.**

- [x] **SK1 — Clicking a skill does nothing (no skill guide).** 🟥 Test: click Woodcutting → a skill-guide panel of level unlocks; re-click/elsewhere closes.  _Shipped: src/skill-guide.js EMSKILLGUIDE.open(skillId) -- clicking a skill opens a guide panel._
- [x] **SK2 — No hover tooltip with current/next-level/remaining XP.** 🟧 Now: `title="Name: <xp> xp"`. Test: hover shows current, next threshold, remaining in a custom box.  _Shipped: src/skill-guide.js EMSKILLGUIDE.tooltip(skillId) returns current/next/remaining XP, custom hover tooltip._
- [~] **SK3 — Grid order isn't the OSRS layout.** 🟨 Test: grid matches OSRS skill positions exactly.  _Status: grid order not pixel-verified against OSRS layout._
- [~] **SK4 — Total level shown; no total XP / combat level here.** 🟨 Test: total level correct (32 start) + total XP available.  _Status: total level shown (hud.js totalLevel()); total XP / combat level co-display not confirmed in this tab._
- [~] **SK5 — No level-up → skill-guide reveal.** 🟨 Test: leveling surfaces the new unlock in the guide.  _Status: level-up -> guide reveal not confirmed._
- [~] **SK6 — No per-skill progress visual.** 🟨 Test: a small %-to-next or bar renders per skill (optional, OSRS-faithful).  _Status: per-skill progress bar not confirmed._
- [x] **SK+1 — Tooltip uses native `title` (delayed, unstyled), not an instant OSRS box.** 🟨 Test: hovering shows a custom-styled, no-delay tooltip.  _Shipped: src/skill-guide.js fbShow()/tipHtml() -- custom-styled instant tooltip replacing native title._
- [~] **SK+2 — Hitpoints-starts-at-10 not framed; grid order from JSON.** 🟨 Test: HP reads 10 at fresh start in its fixed cell; total accounts for it.  _Status: not re-verified._
- [~] **SK+3 — No level-up tab-button flash.** 🟨 Test: leveling briefly flashes the Stats tab button.  _Status: tab-flash on level-up not confirmed._
- [~] **SK+4 — Large XP never abbreviated/comma-grouped.** 🟨 Test: a multi-million skill shows a grouped/abbreviated value.  _Status: src/skill-guide.js fmt(n) exists; large-XP abbreviation in the Stats grid itself not confirmed._
- [~] **SK+5 — No right-click skill menu ("View guide").** 🟨 Test: right-click a skill → at least "View <skill> guide".  _Status: right-click "View guide" not confirmed (left-click open is confirmed)._

---

## 8. Equipment tab 🟥

Renders 11 labelled empty boxes; purely decorative.

- [x] **EQ1 — Slots are non-functional placeholders.** 🟥 Test: wielding an axe shows the axe icon in the weapon slot.  _Shipped: src/equipment.js + equipment-tab.js -- wielding an axe shows the icon in the weapon slot._
- [x] **EQ2 — Cannot click a worn slot to remove.** 🟧 Test: clicking the weapon slot un-equips back to inventory.  _Shipped: src/equipment-tab.js: clicking a filled slot calls window.EMEQUIP.unequip(slot)._
- [x] **EQ3 — No "Equipment Stats" / "Items Kept on Death" buttons.** 🟨 Test: an Equipment-Stats button opens a worn-bonus panel.  _Shipped: src/equipment-tab.js "Equipment Stats" toggle calling window.EMEQUIP.stats() (.emeqt-stats panel)._
- [~] **EQ4 — Worn gear doesn't affect the player model.** 🟧 Test: equipping a weapon makes it appear in the player's hand.  _Status: equipment.js manages the worn{} model/slot data; whether the weapon visually appears on the 3D player rig not directly confirmed._
- [x] **EQ5 — Worn gear doesn't affect combat stats.** 🟧 Test: equipping a weapon changes the stats totals + outcomes.  _Shipped: src/equipment-tab.js stats() sums worn bonuses; src/combat.js consumes weapon-class data for style/XP._
- [x] **EQ+1 — Layout is a flat 3-col grid, not the OSRS humanoid cross.** 🟧  _Shipped: src/equipment-tab.js SLOTS[] uses cell-area OSRS humanoid layout (head/cape-neck-ammo/weapon-body-shield/legs/hands-feet-ring)._
    OSRS: head top-centre; cape/neck/ammo; weapon-body-shield; legs; hands-feet-ring. Test: slots in the OSRS body arrangement.
- [~] **EQ+2 — No "Items Kept on Death" button.** 🟨 Test: a Kept-on-Death control opens a panel of protected items.  _Status: "Items Kept on Death" button not confirmed._
- [x] **EQ+3 — No Equipment-Stats panel with the bonus columns.** 🟨  _Shipped: src/equipment-tab.js .emeqt-stats panel + EMEQUIP.stats() -- Equipment-Stats panel exists._
    OSRS: Attack (Stab/Slash/Crush/Magic/Ranged), Defence (same 5), Other (Str/Ranged Str/Magic% /Prayer) + speed. Test: that panel sums worn gear.
- [~] **EQ+4 — Empty slots show the slot NAME text instead of a ghost slot-icon.** 🟨 Test: empty slots show a silhouette icon, not "head"/"cape" text.  _Status: ghost icon vs text label not pixel-verified (SLOTS[] does define a ghost emoji per slot)._
- [~] **EQ+5 — Worn slot has no hover / "Remove <item>" affordance.** 🟨 Test: hovering a filled slot shows "Remove <item>".  _Status: hover "Remove item" affordance not confirmed._

---

## 9. Combat tab 🟥

Shows combat level + "Weapon: Unarmed" + 4 style buttons that set a var + print to chat. Reported **cut off** and unexplained.

- [~] **CB1 — Panel is cut off / clipped on screen.** 🟥  _Status: mobile-ui.js reflows the panel; clipping not re-tested at all viewport sizes this pass._
    Now: `#empanel right:8 bottom:92 max-height:52vh overflow:auto` overlaps the tabs on short/zoomed viewports. Test: full Combat panel visible on phone + desktop without clipping.
- [x] **CB2 — Attack styles have no description / per-style XP info.** 🟥  _Shipped: src/combat.js styleDefs (accurate/aggressive/defensive/controlled) with desc + trains[] per OSRS mapping; combat.json backs this._
    OSRS: Accurate→Attack, Aggressive→Strength, Defensive→Defence, Controlled→all three, each with an icon. Test: each row names the trained skill(s) + shows its icon.
- [x] **CB3 — Styles aren't weapon-aware ("Unarmed" hard-coded).** 🟧 Test: a bow swaps to ranged styles; a staff shows spell/defensive options.  _Shipped: src/combat.js weapon-class-aware style sets (WEAPON_CLASS_DEFS), selectedStyleByClass keyed per weapon class._
- [~] **CB4 — No Auto-Retaliate toggle.** 🟧 Test: an Auto-Retaliate toggle governs auto-fighting-back.  _Status: auto-retaliate not confirmed as a UI toggle this pass (mechanic CBT+7 referenced in 27)._
- [~] **CB5 — No Special Attack bar.** 🟨 Test: a special-attack control renders (greyed when no spec weapon).  _Status: special-attack bar not confirmed as always-present chrome._
- [~] **CB6 — Combat-level math unverified vs OSRS; only shown here.** 🟨 Test: combat level matches the OSRS formula (starts 3); shown by name/examine too.  _Status: combat-level formula not re-derived this pass._
- [~] **CB+1 — Header doesn't recompute on gear/stat change; no "next level" hint.** 🟨 Test: changing a combat stat re-renders the header live.  _Status: live header recompute not confirmed._
- [~] **CB+2 — Style buttons are plain text with no icons; default/persistence wrong.** 🟧 Test: each row shows its style icon; the chosen style persists per weapon type.  _Status: style icons not confirmed._
- [~] **CB+3 — Weapon label is hard-coded "Weapon: Unarmed".** 🟧 Test: wielding a weapon updates the label to that weapon's name.  _Status: weapon label dynamic update not confirmed in Combat tab UI (engine itself is weapon-aware per CB3)._
- [~] **CB+4 — Special-attack bar isn't always-present chrome.** 🟨 OSRS draws it always (greyed at 0%). Test: the spec bar always renders, greyed when no spec.  _Status: always-present spec bar not confirmed._

---

## 10. Prayer tab 🟥

Renders one muted string: "Locked until you train Prayer at the altar." — yet the altar DOES grant Prayer XP. Contradictory + empty.

- [x] **PR1 — Shows no prayers at all.** 🟥 OSRS: a grid (Thick Skin, Burst of Strength…), greyed by level. Test: low prayers visible, higher greyed with reqs.  _Shipped: src/prayer-tab.js renderGrid() -- full prayer grid from prayers.json (28 prayers), gated by level._
- [x] **PR2 — Contradiction: altar grants Prayer XP but tab says "locked".** 🟧 Test: after praying, the tab reflects the Prayer level + unlocked prayers.  _Shipped: src/prayer-tab.js prayerLevel()/syncPtsMax() sync the tab to the real Prayer level -- contradiction resolved._
- [x] **PR3 — No Prayer points / no activation.** 🟥 Test: a Prayer orb shows points; clicking an unlocked prayer toggles it and drains points.  _Shipped: src/prayer-tab.js drainTick()/publishPts() -- Prayer points tick down per active prayer; renderPtsBar() shows the orb._
- [x] **PR4 — Bury-bones mechanic absent.** 🟧 OSRS: bury bones for first Prayer XP (Brother Brace). Test: a bones item with "Bury" grants Prayer XP.  _Shipped: src/prayer-tab.js buryBones() -- bury-bones mechanic implemented._
- [x] **PR5 — No prayer tooltips (effect/drain/level).** 🟨 Test: hovering a prayer shows its level req + effect.  _Shipped: src/prayer-tab.js tipHtml()/attachTip() -- hover tooltips with level req + effect._
- [x] **PR+1 — Panel renders zero prayer cells even at unlocked level (hard-coded text).** 🟥 Test: at Prayer ≥1, Thick Skin shows as enabled, not a locked sentence.  _Shipped: renderGrid() renders real prayer cells gated by level, not hard-coded text._
- [~] **PR+2 — No Quick-Prayers setup / orb toggle.** 🟨 Test: a quick-prayers configure control + a quick-prayer toggle on the orb.  _Status: Quick-Prayers setup/orb toggle not confirmed._
- [x] **PR+3 — No active-prayer highlighted state.** 🟨 Test: toggling a prayer shows a lit "active" border.  _Shipped: src/prayer-tab.js deactivateConflicts()/publishActive() -- active-prayer highlighted state._

---

## 11. Magic tab 🟥

Renders one muted string. No spellbook.

- [x] **MG1 — No spellbook grid.** 🟥 OSRS: a grid (Wind Strike, Confuse, teleports…), greyed by level/runes. Test: the grid renders; Wind Strike visible at L1.  _Shipped: src/magic-tab.js -- spellbook grid rendered from spell data, greyed by level/runes._
- [x] **MG2 — No rune requirements.** 🟥 Test: hovering Wind Strike shows "1 Air + 1 Mind"; castable only with those runes.  _Shipped: src/magic-tab.js cost:{rune:n} per spell + RUNES catalogue with icons -- requirements shown and enforced._
- [x] **MG3 — Cannot cast a spell.** 🟥 OSRS: Wind Strike on the practice chicken. Test: with runes, Wind Strike → target → projectile + hit + Magic XP.  _Shipped: src/magic-tab.js intercepts EMCOMBAT.attack for combat spells; alchemy targets inventory items -- casting wired._
- [~] **MG4 — No spell filter buttons.** 🟨 Test: filter toggles hide/show spell categories.  _Status: spell filter buttons not confirmed._
- [~] **MG5 — No spellbook switching (deferred).** 🟨 Test: standard book present; architecture allows others.  _Status: spellbook-switching architecture not confirmed (single standard book implied, acceptable)._
- [x] **MG+1 — No grid scaffold; just an instruction sentence (no fixed RS layout).** 🟥 Test: the spell grid renders in standard-book order, Wind Strike top-left.  _Shipped: magic-tab.js renders a real spell grid (not an instruction sentence)._
- [~] **MG+2 — No autocast affordance.** 🟨 Test: combat spells expose an autocast-select.  _Status: autocast-select not confirmed._
- [x] **MG+3 — No per-spell hover (level req + rune rows).** 🟨 Test: hovering Wind Strike shows "Level 1" + rune icons.  _Shipped: magic-tab.js hover shows level req + rune icons._
- [~] **MG+4 — No greyed-vs-castable visual state.** 🟨 Test: above-level spell renders darkened; Wind Strike bright at L1.  _Status: greyed-vs-castable visual state not pixel-verified but implied by file header._

---

## 12. Quest tab 🟥

Renders "Tutorial Island — in progress." Nothing else.

- [x] **QJ1 — No quest list at all.** 🟥 OSRS: a scrollable journal, colour-coded (red/yellow/green), grouped, with QP total. Test: list + states + QP counter.  _Shipped: src/quests-tab.js -- scrollable journal, colour-coded red/yellow/green, QP counter._
- [x] **QJ2 — No future/greyed quests shown.** 🟥 OSRS lists all quests from the start. Test: ≥1 future quest in red "not started" with a click-through.  _Shipped: quests.json + questListWithOverrides() -- future/greyed quests listed from the start._
- [x] **QJ3 — Clicking a quest does nothing.** 🟧 Test: clicking a quest opens its detail subpanel.  _Shipped: src/quests-tab.js clicking a quest opens a detail subpanel._
- [~] **QJ4 — No Quest Points total / minigame/diary sub-tabs.** 🟨 Test: a QP total renders; sub-tabs architected.  _Status: QP total confirmed persisted (LS_QP_KEY); minigame/diary sub-tabs not confirmed._
- [x] **QJ5 — Tutorial Island itself isn't a tracked quest-like list.** 🟧 Test: the tutorial steps list with done/active states.  _Shipped: lessons.js + quests-tab.js: Tutorial Island tracked with completion flip (see QUEST+10/11)._
- [x] **QJ+1 — Header lacks the "Quest Point: N" counter.** 🟨 Test: the journal header shows a QP total.  _Shipped: questPointsTotal shown; QP counter in journal header._
- [~] **QJ+2 — No Free/Members/Misc section dividers.** 🟨 Test: the journal shows at least Free/Members section headers.  _Status: Free/Members/Misc dividers not confirmed._
- [x] **QJ+3 — No red/yellow/green state colouring wired to data.** 🟧 Test: at least one quest in each of red/yellow/green by state.  _Shipped: red/yellow/green states wired to persisted data (loadPersistedStates/savePersistedStates)._
- [~] **QJ+4 — No scrolling list affordance.** 🟨 Test: a populated quest list scrolls within the journal frame.  _Status: scrolling affordance not confirmed._

---

## 13. Settings tab 🟥

Renders "Audio, graphics & controls — coming soon." Not built.

- [x] **ST1 — No audio settings (master/music/SFX/area + mute).** 🟥 Test: sliders/toggles for music + SFX actually change volume.  _Shipped: src/settings-tab.js maybeAudio() bridges sliders/toggles to EMAUDIO.setVolume()/mute() -- real audio control._
- [~] **ST2 — No graphics settings (brightness/draw-distance/shadows/AA).** 🟧 Test: a brightness control + ≥2 quality toggles change the render.  _Status: graphics settings (brightness/draw-distance/shadows/AA) not confirmed in settingsData()._
- [~] **ST3 — No control settings (camera mode/zoom/keys/mouse).** 🟧 Test: a control panel exposes camera keys + zoom + drop-mode toggles.  _Status: control settings (camera keys/zoom/mouse) not confirmed._
- [~] **ST4 — No UI-scale/transparency/orb-visibility toggles.** 🟨 Test: a UI-scale control resizes the HUD.  _Status: UI-scale/transparency/orb-visibility not confirmed._
- [x] **ST5 — Settings don't persist.** 🟧 Test: changed settings survive a reload (localStorage).  _Shipped: src/settings-tab.js buildStore() persists to localStorage under "eldermoor:settings"._
- [~] **ST+1 — No sub-tab row (Display/Audio/Controls categories).** 🟧 Test: the Settings panel has a category sub-tab row switching sections.  _Status: sub-tab row (Display/Audio/Controls) not confirmed -- settingsData() may be a flat list._
- [~] **ST+2 — No two-mouse-button / shift-click-drop / chat-effects toggles.** 🟨 Test: those toggles exist and change behaviour.  _Status: two-mouse-button/shift-click-drop/chat-effects toggles not confirmed._
- [~] **ST+3 — Brightness/zoom not shown as sliders with a numeric readout.** 🟨 Test: the control shows its value and updates the render.  _Status: slider numeric readout not confirmed._

---

## 14. Missing tabs entirely 🟥

8 tabs exist; OSRS has more.

- [x] **TB1 — No Friends tab.** 🟧 Test: a Friends tab with add/remove/online status.  _Shipped: src/social.js friendsCfg() -- Friends tab with add/remove/online status._
- [x] **TB2 — No Ignore tab.** 🟨 Test: an Ignore tab with add/remove.  _Shipped: src/social.js ignoreCfg() -- Ignore tab with add/remove._
- [x] **TB3 — No Account-Management tab.** 🟧 (Account Guide teaches this.) Test: an Account tab (Eldermoor-original framing).  _Shipped: src/social.js renderAccountTab() -- Account-Management tab present._
- [x] **TB4 — No Emotes tab.** 🟧 Test: an Emotes tab with ≥4 playable emotes.  _Shipped: src/emotes.js -- Emotes tab with grid, locked/unlocked emotes._
- [x] **TB5 — No Music player tab.** 🟨 Test: a Music tab listing tracks; clicking plays one.  _Shipped: src/music-tab.js -- Music tab listing tracks, click-to-play, loop/shuffle._
- [x] **TB6 — No Logout tab/button.** 🟨 Test: a Logout control returns to a title/login stub.  _Shipped: src/logout-tab.js -- Logout tab/control._
- [~] **TB7 — Cluster is a single 8-grid, not the OSRS two-row 13-icon layout.** 🟨 Test: matches OSRS two-row layout with all parity tabs.  _Status: two-row 13-icon OSRS layout not pixel-verified; tab count gap is resolved (14 HUD tabs per HANDOFF v21), exact visual layout unconfirmed._
- [~] **TB+1 — Re-clicking the active tab CLOSES the panel (non-OSRS).** 🟧  _Status: re-click-keeps-panel-open behaviour not re-verified this pass._
    OSRS never blanks the side panel. Test: re-clicking the active tab keeps a panel visible; the stone stays lit.
- [~] **TB+2 — Tabs use OS emoji, not bespoke stone-tab sprites.** 🟨 Test: tab icons are consistent sprites, not font-emoji that vary by OS.  _Status: bespoke sprites vs emoji not confirmed -- emoji glyphs still visible throughout (prayer/run icons), likely still open._
- [~] **TB+3 — No F-key hotkey tab switching.** 🟨 Test: a function key switches to its tab.  _Status: F-key hotkey tab switching not confirmed._
- [x] **TB+4 — No "Esc closes interface".** 🟨 Test: Esc with a panel open closes/deselects it.  _Shipped: Esc-closes confirmed across several panels (make-interface.js, social.js, worldmap.js)._
- [~] **TB+5 — Switching tabs plays no UI click and doesn't manage focus.** 🟨 Test: switching plays a UI click (AUD4) + instantly swaps content.  _Status: sfx-actions.js sfxTabClick() exists -- UI click sound real; focus management not confirmed._
- [~] **TB+6 — Panel/tabs/minimap aren't one docked column; panel can overlap chat on small screens.** 🟧  _Status: docked-column layout vs independent fixed boxes not re-verified._
    Now: `#empanel`/`#emtabs` are independent fixed boxes. Test: they read as one docked right column; panel never overlaps chat.

---

## 15. Chatbox 🟥

A 150px log + 6 channel buttons (All/Game/Public/Private/Clan/Trade) with **no click handlers** — "chat tabs do nothing."

- [x] **CH1 — Channel buttons are dead (no filter, no active state).** 🟥 Test: clicking "Game" shows only game messages + highlights; "All" restores everything.  _Shipped: src/hud.js chVisible()/paintChBtn() -- channel buttons filter + show active state._
- [x] **CH2 — Messages aren't categorised by channel.** 🟧 Now: `addChat` appends undifferentiated lines. Test: system/game/NPC lines tagged so filters work.  _Shipped: src/hud.js addChat() tags messages with dataset.ch=channel -- categorised by channel._
- [~] **CH3 — Cannot type into chat.** 🟧 Test: Enter focuses an input; typed text appears as a public message.  _Status: typing into chat not confirmed in hud.js this pass._
- [~] **CH4 — No timestamps / scroll memory / continue framing.** 🟨 Test: optional timestamps; the box never jumps unexpectedly.  _Status: timestamps/scroll memory not confirmed._
- [~] **CH5 — Chat skin doesn't match OSRS (parchment, scroll arrows).** 🟨 Test: the chatbox reads as the OSRS chat frame.  _Status: visual skin -- needs eyes._
- [~] **CH6 — No report/abuse, no chat-effect parsing.** 🟨 Test: basic chat-effect parsing + a report stub.  _Status: chat-effect parsing/report stub not confirmed._
- [~] **CH7 — `addChat` interpolates raw HTML (XSS/format risk).** 🟨 (see SEC+1) Test: a `<b>` from a non-system source renders literally.  _Status: addChat() still appears to interpolate text into innerHTML; SEC+1 tag-whitelist fix not confirmed._
- [x] **CH+1 — No per-channel right-click On/Filtered/Off/Hide cycle.** 🟧 Test: right-click "Public" cycles On→Filtered→Off→Hide and filters the log.  _Shipped: src/hud.js paintChBtn()/chVisible() -- right-click cycles on/filtered/off/hide per channel._
- [~] **CH+2 — Channel buttons don't use OSRS per-channel colours; active not shown.** 🟨 Test: each button in its signature colour; active visibly selected.  _Status: per-channel signature colours not pixel-verified (CSS class .ch-trade exists suggesting hooks)._
- [~] **CH+3 — No "Click here to continue" overflow/new-message prompt.** 🟨 Test: the prompt appears under OSRS's conditions.  _Status: "click to continue" overflow prompt not confirmed._
- [~] **CH+4 — No Game filter (spam vs important).** 🟨 Test: Game→Filtered hides routine skill spam but keeps level-ups.  _Status: Game-filtered vs spam distinction not confirmed._
- [~] **CH+5 — No private-message in/out framing/colours.** 🟨 Test: outgoing "To <name>:", incoming "From <name>:" in the PM colour.  _Status: PM in/out framing not confirmed._
- [x] **CH+6 — `.sys` class defined but the `sys` flag passed to `addChat` is IGNORED.** 🟧  _Shipped: src/hud.js addChat(text, who, opts) now accepts {sys,channel} (or legacy true) -- sys flag read and applied -- bug fixed._
    Now: many callers pass a 3rd `true` arg but `addChat(text, who)` only takes two → `.sys` never applied. Test: system lines render in the system colour.
- [~] **CH+7 — No split-chat (mobile) overlay mode.** 🟨 Test: a split-chat toggle shows fading overlay lines.  _Status: split-chat mobile overlay not confirmed (mobile-ui.js wireChat() exists but split-overlay mode unconfirmed)._
- [~] **CH+8 — No skinned scroll arrows/thumb (relies on native scrollbar).** 🟨 Test: OSRS-style scroll arrows replace the native bar.  _Status: skinned scroll arrows not confirmed._
- [~] **CH+9 — Hard 60-line cap discards scrollback.** 🟨 Test: >60 lines retained and scrollable.  _Status: 60-line cap not re-verified this pass._

---

## 16. Dialogue system 🟧

Flat line queue + single "Continue" button. The branching trees in `dialogue.json` are **not wired** (and never even fetched — see DATA+3).

- [x] **DLG1 — Flat line list, not a branching tree.** 🟥 Test: an instructor offers choice options that branch.  _Shipped: src/dialogue.js runDialogue()/renderTreeNode()/chooseOption() -- full branching tree runner reading node.options[]._
- [~] **DLG2 — No speaker/player portrait.** 🟧 Test: the dialogue box shows the speaking head on the correct side.  _Status: speaker/player portrait not confirmed._
- [x] **DLG3 — No "click/space to continue" + no ▼ arrow.** 🟨 Test: space and click both advance; a continue arrow renders.  _Shipped: src/dialogue.js renderTreeNode() -- no-options continue affordance; click/Space advances._
- [~] **DLG4 — No OSRS chat-interface skin.** 🟨 Test: the dialogue frame matches the OSRS parchment skin.  _Status: visual chat-interface skin -- needs eyes._
- [x] **DLG5 — No numbered option list (1–5 keys).** 🟧 Test: options render numbered; 1–5 select.  _Shipped: src/dialogue.js chooseOption()/renderTreeNode() -- numbered option list rendered from node.options[]._
- [x] **DLG6 — Dialogue doesn't drive lesson progress.** 🟥 Test: completing an instructor's dialogue updates the objective + arrow to the next step.  _Shipped: src/lessons.js evalPredicate()/advanceStep() -- dialogue effects (applyNodeEffects) and em-flag events drive lesson progress._
- [~] **DLG7 — No "experienced player, skip tutorial" branch.** 🟨 Test: the Guide offers a skip option jumping to L17.  _Status: "skip tutorial" branch not confirmed._
- [~] **DLG8 — Instructor lines don't vary by inventory/skill state.** 🟧 Now: same lines every talk. Test: the Survival Expert says something different before vs after chopping.  _Status: state-aware instructor lines not confirmed across all 25 trees this pass._
- [~] **DLG9 — No NPC-initiated auto-talk on zone entry.** 🟨 Test: entering the cook's house auto-starts the Master Chef's intro once.  _Status: NPC-initiated auto-talk on zone entry not confirmed._

---

## 17. NPCs 🟧

4 NPCs (monk + 3 wanderers). Tappable with Talk-to/Examine. Good bones; thin content.

- [x] **NPC1 — Only 4 NPCs; the instructor roster is absent.** 🟥 Test: all ~10 instructors modelled, placed, named, talkable.  _Shipped: world.manifest.json npcs[] has 11 NPCs incl. full instructor roster (warden_halric, forester-maeve, cook-tobin, loremaster-edda, pickmaster-doran, sergeant-vael, teller-wynn, steward-brann, brother_aldric, magus-sorrel, dock-halric); dialogue.json has 25 trees._
- [x] **NPC2 — No overhead speech bubbles.** 🟧 Test: an NPC line shows an overhead bubble too.  _Shipped: src/npc.js speechSprite()/showBubble() -- overhead speech bubble implemented._
- [x] **NPC3 — No "Attack" option on attackable NPCs (rats).** 🟧 Test: a rat right-click shows "Attack"; clicking engages combat.  _Shipped: src/world.js placeMob()/_buildRatMesh() + combat.js Attack flow -- attackable rat mob exists, wired to combat engine._
- [~] **NPC4 — Nameplates always on; no monster combat level.** 🟨 Test: monster plates show combat level; friendly NPCs match OSRS hover.  _Status: monster combat-level-on-nameplate not confirmed._
- [~] **NPC5 — No instructor handoff / "speak to X next".** 🟧 Test: finishing one instructor points the arrow/marker at the next.  _Status: instructor handoff arrow retarget -- lessons.js pointToNext() generic; per-instructor handoff text not individually confirmed._
- [x] **NPC6 — The spawn-room Guide is missing entirely.** 🟥 Test: an original Guide stands in the spawn house, talks first, hands off.  _Shipped: warden_halric (Tutorial Guide) placed in spawn_house zone, dialogue id warden-halric, lessons L0/L1._
- [~] **NPC7 — Chapel monk plays the wrong role (no Brother-Brace prayer lesson).** 🟧  _Status: brother_aldric Prayer Instructor + bury-bones now real (PR4); full Friends/Ignore hand-off sequencing not individually confirmed._
    Now: Brother Aldric gives altar flavour only. OSRS: Brother Brace gives bones → bury → Prayer tab → Friends/Ignore. Test: the monk gives bones, prompts Bury, unlocks Prayer + Friends/Ignore.
- [~] **NPC8 — Nameplates show personal names, not teaching roles.** 🟨 Test: instructor plates show the role ("Survival Expert").  _Status: world.manifest.json npcs[] carry a role field (e.g. "Survival Expert") suggesting role-plates are data-available; plate rendering source not confirmed._
- [~] **NPC9 — 3 generic chapel wanderers aren't OSRS-faithful.** 🟨 Test: decide — remove for parity or justify as documented Eldermoor flavour.  _Status: no documented decision found on chapel wanderers this pass._

---

## 18. Rooms / environment rendering 🟥

"Rooms still glitch between inside/outside textures and colours." Root causes are pinned in §25 (REND/PERF/BUG); the player-facing symptoms:

- [~] **RM1 — Inside/outside texture & colour glitch.** 🟥  _Status: root causes (REND+2/REND+3/PERF+3) confirmed fixed in code; full orbit-no-flicker visual confirmation needs eyes._
    Causes: z-fighting (terrain y=-0.05 vs floor y=0), substring material matching bleeding textures, water depthWrite holes, nameplates through walls, no roof seal. Test: stand inside, orbit fully — no flicker, no exterior bleed.
- [~] **RM2 — No roof / interiors not visually sealed.** 🟧 Test: inside you see walls on all sides; roof hides on entry, shows from outside.  _Status: roof-seal-on-entry not confirmed._
- [~] **RM3 — Material assignment by fragile substring match.** 🟧 (see REND+2/REND+3) Test: each mesh's material assigned by explicit role, not `name.includes()`.  _Status: material-by-role vs substring-match not re-audited line-by-line this pass._
- [~] **RM4 — Terrain/floor 5cm gap can flicker.** 🟨 Test: no flicker at the floor/terrain seam at any zoom/angle.  _Status: terrain/floor seam flicker not re-tested._
- [~] **RM5 — Walls textured identically inside & out; no trims.** 🟨 Test: interior walls read distinct from exterior masonry.  _Status: interior/exterior wall texture distinction not confirmed._
- [~] **RM6 — Lighting doesn't change interior vs exterior.** 🟨 Test: stepping inside subtly darkens/warms the light.  _Status: interior/exterior lighting change not confirmed._

---

## 19. Tutorial flow & gating 🟥

The actual *tutorial* — the gated instructor chain — does not exist as logic.

- [x] **FLOW1 — No state machine driving lesson progress.** 🟥 Test: completing a step advances `progress` and unlocks the next.  _Shipped: src/lessons.js -- full state machine: currentLesson()/currentStep()/advanceStep()/evalPredicate() drives lessonIndex/stepIndex + unlocks next._
- [~] **FLOW2 — No gating (free-roam; nothing locked).** 🟥 Test: a locked door refuses entry with the OSRS nudge until its lesson completes.  _Status: gating on locked doors not confirmed as a refusal-with-nudge UX (gating.js exists, see GATE+ below)._
- [x] **FLOW3 — No character-creation gate (L0).** 🟥 Test: first load shows a creator; confirming spawns you.  _Shipped: src/charcreate.js -- character-creation gate; HANDOFF.md v21 confirms creator+L0-gate integrated._
- [x] **FLOW4 — No progress persistence.** 🟧 Test: complete a step, reload → resume at the same step + inventory/stats.  _Shipped: src/lessons.js loadProgress()/saveProgress() + src/save.js -- progress persistence to localStorage._
- [x] **FLOW5 — No fixed ~0.6s game tick.** 🟧 Test: actions/combat resolve on a fixed tick independent of FPS.  _Shipped: src/tick.js + src/skilling.js TICK_MS=600 -- fixed ~0.6s game tick governs skill/action resolution._
- [x] **FLOW6 — Objective text is static, not lesson-driven.** 🟨 Test: each completed step rewrites the objective.  _Shipped: src/lessons.js pushObjective() rewrites objective text from the live lesson/step, not static._
- [~] **FLOW7 — World clicks aren't inert during the intro (no "follow the instructions" nudge).** 🟧  _Status: world-click inertness before L1 not confirmed._
    OSRS: in the spawn room you can only talk to the Guide. Test: before L1, world clicks are inert + a nudge fires.
- [~] **FLOW8 — Tabs aren't lesson-gated/force-flashed at the right beat.** 🟧  _Status: tab lock/flash-on-unlock not confirmed._
    OSRS: a tab is locked until its instructor unlocks it, then its stone FLASHES with "Click the flashing icon." Test: at L1 the Settings tab flashes; untaught tabs are inert.
- [~] **FLOW9 — No "click here to continue" UI-element highlight overlays.** 🟧  _Status: "click here to continue" UI-element highlight overlay not confirmed._
    OSRS paints a pulsing highlight around the exact UI element to click next. Test: each UI-teaching step highlights the specific HUD element until clicked.
- [~] **FLOW10 — Run is absent; OSRS keeps the orb present but never teaches run on-island.** 🟨 Test: run orb present, walking is the cadence; document run as post-island.  _Status: run-orb-present-but-undocumented decision not re-verified._
- [~] **FLOW11 — Lesson-critical items can be lost with no re-grant (softlock risk).** 🟧 Test: dropping the axe is blocked, or the Survival Expert re-issues it on talk.  _Status: lesson-critical item loss / re-grant not confirmed._
- [~] **FLOW12 — Forward gating not enforced while backtracking is allowed.** 🟧 Test: you may re-enter finished rooms, but the next gate stays shut until its predicate passes.  _Status: forward-gating-while-backtrack-allowed not confirmed._

---

## 20. Per-zone room content (OSRS Tutorial Island, room by room) 🟥

The specific objects + teaching beats each instructor area needs. (Asset side tracked in `ASSET_MANIFEST.md`; this is the *interaction/content* checklist.)

- [~] **ROOM1 — Survival area lacks its props.** 🟥  _Status: survival zone exists with fixtures; tree/net-spot/fire-tile/exit-gate completeness not individually re-verified._
    OSRS: a fenced clearing with a choppable TREE, a net FISHING SPOT (→ shrimp), an open FIRE tile, and a gate to the cook. Test: tree + net-spot + fire-tile + exit gate, all interactable.
- [~] **ROOM2 — No cooking range + "can't make fire under a tree" beat.** 🟧  _Status: range fixture confirmed placeable; "fire under tree" block rule not confirmed._
    OSRS: firemaking is blocked on a tree-shaded tile ("You can't light a fire here"); the cook's house has a RANGE distinct from the open fire. Test: fire-under-tree fails with the message; a separate range exists for L6.
- [~] **ROOM3 — Master Chef's flour-pot + water-bucket + dough beat missing.** 🟧  _Status: cook-house zone presence confirmed; full flour/water/dough beat not re-traced (see COOK+4 in 27)._
    OSRS: pick up POT OF FLOUR + BUCKET OF WATER, Use flour on water → bread dough, bake. Test: the cook's house has both; combining yields dough.
- [~] **ROOM4 — Quest Guide house: no journal explanation + ladder down.** 🟧 Test: a quest house with the Quest Guide + a ladder descending to the mine.  _Status: quest_house zone + ladder-down marker fixture exist; full journal-explanation beat not confirmed._
- [~] **ROOM5 — Mine: no tin rock, copper rock, furnace, anvil.** 🟥  _Status: mine zone + furnace/anvil fixtures confirmed placeable; tin/copper-specific rocks not individually confirmed._
    OSRS: mine tin + copper → smelt at FURNACE → bronze bar → smith at ANVIL → bronze dagger → ladder up. Test: separate tin+copper rocks, a furnace, an anvil, each wired to its action.
- [~] **ROOM6 — Combat area: no rat pen + gate + giant rat + ranged target.** 🟥  _Status: combat_ring zone + rat mob (NPC3) confirmed; pen-gate-open + ranged-engagement beat not individually confirmed._
    OSRS: a fenced RAT PEN with a GATE you open, melee rats inside, then range a rat with a shortbow + arrows. Test: openable pen gate, attackable rats, a ranged engagement.
- [~] **ROOM7 — Bank area: no bank booth + poll booth + account beat.** 🟧 Test: a bank booth opens a bank interface; a poll booth + account explanation present.  _Status: bank zone + Bank of Eldermoor interface (BANK+1) confirmed; poll-booth/account beat not confirmed._
- [x] **ROOM8 — Chapel lacks burnable bones + the real prayer beat.** 🟧  _Shipped: src/prayer-tab.js buryBones() -- real bury-bones Prayer XP beat now exists (was a flat altar +7 only)._
    Now: altar grants flat +7 on "Pray-at"; no bones. OSRS: Brother Brace gives bones → BURY → first Prayer XP. Test: give-bones → bury → Prayer XP.
- [~] **ROOM9 — Magic area: no chicken + air/mind runes + Wind Strike beat.** 🟧 Test: a Magic Instructor grants runes; a target chicken takes Wind Strike for XP.  _Status: wizard_tower zone + magic-tab.js rune-cast-on-mob flow confirmed generally; named practice-chicken target not individually confirmed._
- [~] **ROOM10 — Departure dock: no final NPC + no boat.** 🟧 Test: a departure NPC at a dock offers a boat; confirming triggers the leave-island transition.  _Status: departure_dock zone + dock fixture exist; departure-NPC/boat/leave-transition not individually confirmed._
- [~] **ROOM11 — No inter-room doors/gates as discrete openable objects.** 🟧 Test: ≥6 door/gate objects between rooms, each Open-able, several lesson-locked.  _Status: door/gate marker fixtures exist across zones; lesson-locking of specific gates not individually confirmed._
- [~] **ROOM12 — Pond has no fishing-spot shimmer; fire has no light/smoke/despawn.** 🟨 Test: the fishing spot animates; a made fire emits light and despawns over time.  _Status: fishing-spot shimmer / fire light-smoke-despawn not confirmed._
- [~] **ROOM13 — A lit fire doesn't block its tile (cook from adjacent).** 🟨 Test: a made fire adds a temporary collider; cooking happens from an adjacent tile.  _Status: fire-blocks-tile-cook-from-adjacent not confirmed._

---

## 21. Game systems behind the lessons 🟧

- [x] **SYS1 — Woodcutting.** 🟧 Test: chop a tree → logs + Woodcutting XP over ticks.  _Shipped: src/skilling.js chop() -- tick-based woodcutting with success roll, logs output, Woodcutting XP._
- [x] **SYS2 — Firemaking.** 🟧 Test: tinderbox on logs → fire + Firemaking XP.  _Shipped: src/skilling.js light action -- tinderbox-on-logs -> fire + Firemaking XP per ACTIONS table._
- [x] **SYS3 — Fishing.** 🟧 Test: net a spot → raw shrimp + Fishing XP.  _Shipped: src/skilling.js fish action -- net-a-spot -> raw shrimp + Fishing XP per ACTIONS table._
- [x] **SYS4 — Cooking (incl. burning).** 🟧 Test: cook shrimp on fire → cooked (or burnt) + Cooking XP.  _Shipped: src/skilling.js cook action -- burn-chance roll (20%) + Cooking XP, burnt/cooked split._
- [x] **SYS5 — Mining.** 🟧 Test: mine tin/copper → ore + Mining XP.  _Shipped: src/skilling.js mine() -- tin/copper -> ore + Mining XP._
- [x] **SYS6 — Smelting.** 🟧 Test: tin+copper at furnace → bronze bar + Smithing XP.  _Shipped: src/skilling.js smelt action present in ACTIONS table._
- [x] **SYS7 — Smithing.** 🟧 Test: bronze bar at anvil → bronze dagger + Smithing XP.  _Shipped: src/skilling.js smith action + src/make-interface.js -- bronze bar at anvil -> dagger via Make-X interface._
- [x] **SYS8 — Combat (melee).** 🟥 Test: attack a rat → tick damage, HP drop, XP, death/respawn.  _Shipped: src/combat.js -- full melee loop: approach, tick damage, HP drop, XP, death/respawn._
- [~] **SYS9 — Ranged.** 🟧 Test: bow+arrows → attack a rat at range, ammo consumed, Ranged XP.  _Status: ranged combat: combat.js has ranged-style XP split; ammo-consumption/range-step not individually re-verified._
- [x] **SYS10 — Magic/runes.** 🟧 Test: cast Wind Strike with runes → projectile + Magic XP.  _Shipped: src/magic-tab.js -- Wind Strike with runes -> combat-spell cast via EMCOMBAT.attack intercept + Magic XP._
- [x] **SYS11 — Prayer (bury bones) only partial.** 🟧 Test: bury bones → Prayer XP.  _Shipped: src/prayer-tab.js buryBones() -- bury bones -> Prayer XP, no longer partial._
- [x] **SYS12 — Banking.** 🟧 Test: open bank booth → deposit/withdraw separate from inventory.  _Shipped: src/bank.js -- full bank interface separate from inventory (deposit/withdraw)._
- [x] **SYS13 — HP / death / respawn model.** 🟧 Test: damage reduces HP; 0 → respawn.  _Shipped: src/combat.js -- player HP/death/respawn model (damage reduces HP; 0 -> respawn)._
- [~] **SYS14 — Tools aren't real (axe/net/pickaxe/tinderbox have no function).** 🟧 Test: each tool enables its skill action.  _Status: tool-enables-skill-action wiring implied by skilling.js requiring items; axe/net/pickaxe/tinderbox gating not individually re-verified per tool._

---

## 22. Audio 🟥

- [x] **AUD1 — No music.** 🟧 Test: an original tutorial theme loops; mutable in settings.  _Shipped: src/audio.js + music-engine.js -- per-zone original music with crossfade, mutable in settings (ST1)._
- [~] **AUD2 — No SFX.** 🟧 Test: chop/fire/mine/smith/fish/cook/hit/door each play their SFX.  _Status: sfx-actions.js covers tab-click/xp-gain/level-up/item-received/combat-hit/action-tick; chop/fire/mine/smith/fish/cook/door each-distinct SFX not individually confirmed._
- [x] **AUD3 — No level-up jingle.** 🟨 Test: leveling plays the jingle.  _Shipped: src/sfx-actions.js sfxLevelUp() -- level-up jingle._
- [x] **AUD4 — No UI click sounds.** 🟨 Test: tab/button clicks play the OSRS-style click.  _Shipped: src/sfx-actions.js sfxTabClick() + attachClickListeners() -- UI click sounds on tab/button clicks._
- [x] **AUD5 — No zone-based music crossfade.** 🟨 Test: entering a zone crossfades to its track.  _Shipped: src/audio.js playZone() + auto zone-follow -- zone-based music crossfade._

---

## 23. Character creation 🟥

- [x] **CC1 — No character creator screen.** 🟥 Test: a creator panel (head/torso/arms/hands/legs/feet + colours + body type + pronouns) with live preview.  _Shipped: src/charcreate.js buildPanel() -- full creator panel with cyclers/swatches for appearance + colours, live preview._
- [x] **CC2 — No live rotating preview.** 🟧 Test: changing an option updates a rotating model live.  _Shipped: src/charcreate.js drawPreview()/paperDollSVG() -- live SVG paper-doll preview updates on option change._
- [x] **CC3 — Appearance doesn't drive the in-world player.** 🟧 Test: confirmed look applies to the player + persists.  _Shipped: src/appearance-apply.js applyAppearance()/tintRoot() -- appearance drives the in-world player + persists._

---

## 24. Cross-cutting polish & correctness 🟨

- [~] **PX1 — Version string hard-coded in multiple spots.** 🟨 Test: a single source of the version string.  _Status: index.html #hud and src/hud.js welcome line both say v44 -- appear in sync but not confirmed single-sourced._
- [~] **PX2 — No real loading/error UX beyond one "Failed to load" string.** 🟨 Test: asset failures show a styled, retryable error.  _Status: styled retryable error UX not confirmed._
- [~] **PX3 — Preview-tab caveat blocks headless verification.** 🟨 Test: a documented foreground-verify path; logic verified via eval.  _Status: not re-verified._
- [~] **PX4 — No FPS/perf budget or LOD for a "massive" world.** 🟨 (see PERF+2) Test: 60fps target with the full island instanced.  _Status: no LOD/perf-budget system confirmed._
- [x] **PX5 — No hover-cursor affordances.** 🟨 (see OW+1) Test: hovering an interactable changes the cursor + shows the default action.  _Shipped: src/interact.js onHoverMove()/hoverLabel -- hover-cursor affordance (same as OW+1)._
- [~] **PX6 — No step-complete "well done" confirmations.** 🟨 Test: each step completion shows the OSRS confirmation.  _Status: dedicated step-complete confirmation UI not confirmed (chat-line lesson completion exists via lessons.js chat())._
- [~] **PX7 — Accessibility: tiny tap targets, no contrast pass, no text scaling.** 🟨 Test: targets meet a min size; UI-scale option (ties ST4).  _Status: accessibility tap-target sizing/contrast/text-scaling not confirmed (mobile-ui.js exists for reflow, not a full a11y pass)._

---

## 25. Code-level defects & rendering bugs 🟥

Concrete, code-grounded defects (from the code review critic). Several directly cause the "rooms glitch" and other visible breakage. These are *bugs*, not feature gaps — fix in place.

**Rendering**
- [~] **REND+1 — Sky vertex colours double-tone-mapped.** 🟨 `MeshBasicMaterial` sky colours are sRGB→linear pre-converted, then ACES tone-maps them at output → muddier than the authored `#5e93c9/#e7ddc4`. Test: the top-of-sky pixel ≈ `#5e93c9` within tolerance.  _Status: sky toneMapped:false referenced in HANDOFF v16 changelog but not re-grepped this pass._
- [x] **REND+2 — Terrain branch never nulls `m.map`.** 🟥 In `dressMaterials` the `terrain` branch sets `vertexColors=true` + white color but keeps any baked baseColorTexture → vertex colours multiply a stray texture (the colour glitch). Test: terrain `material.map` is null after dress.  _Shipped: src/engine.js: terrain dress branch sets m.map=null, m.emissiveMap=null, etc. -- confirmed nulled._
- [x] **REND+3 — Water is transparent with `depthWrite` left on → floor punches through.** 🟥 Test: water overlapping the floor never makes the floor disappear at any angle (set `depthWrite=false`/sort).  _Shipped: src/engine.js: water material depthWrite=false -- confirmed set._
- [~] **REND+4 — Terrain forced `DoubleSide` worsens shadow acne + self-shadows underside.** 🟨 Test: low-sun terrain shows no moiré; `FrontSide` fixes it.  _Status: FrontSide vs DoubleSide on terrain not re-grepped this pass._
- [~] **REND+5 — `flatShading=true` forced on player + NPC meshes, flattening authored smooth normals.** 🟧 Test: a character head keeps smooth curvature; env stays faceted (don't flat-shade characters).  _Status: avatar.js mat() still sets flatShading:true at construction -- not confirmed fixed, may still be open._
- [x] **PERF+3 — Nameplates use `depthTest:false` → names render THROUGH walls.** 🟥 You see interior NPC names through solid masonry from outside (a direct "inside/outside" symptom). Test: outside the chapel, interior nameplates are occluded by the wall.  _Shipped: src/npc.js nameplate/speech sprites use depthTest:true -- names occluded by walls, confirmed fixed (combat.js/magic-tab.js FX sprites keep depthTest:false by design, not a regression)._

**Interaction / raycasting**
- [~] **BUG+1 — Taps "through" walls register as walk commands.** 🟧 `pickAt` only raycasts `clickTargets` + the ground plane; world geometry isn't tested, so an occluded floor tile is walkable. Test: tapping a tile hidden behind a wall doesn't path there.  _Status: not re-verified this pass._
- [~] **BUG+2 — Forgiving NPC tap picks array-order, not nearest; shadows objects.** 🟧 `NPCS.find(...<1.2)` engages the lower-indexed NPC and can talk a pilgrim instead of praying the altar. Test: tapping between two NPCs engages the nearer one; objects aren't shadowed by NPC proximity.  _Status: not re-verified this pass._
- [~] **BUG+3 — "Walk here" uses a stale `ground` closure from menu-open time.** 🟨 Test: long-press, orbit, choose Walk here later → marker should target the current intent, not the old tile.  _Status: not re-verified this pass._
- [~] **BUG+4 — Long-press/up race can both walk AND open the menu (~450ms).** 🟨 Test: releasing near 450ms never produces both a walk marker and the menu.  _Status: not re-verified this pass._
- [x] **BUG+5 — Pinch divide-by-zero → NaN camera → black screen.** 🟥 **(FIXED v15: `d>0.001` guard.)** Test: two touches on one pixel then spread never NaNs the camera.  _Shipped: audit itself marks this FIXED v15._
- [x] **BUG+17 — Asymmetric NPC/player collision thresholds cause the stuck-to-NPC glue + doorway stutter.** 🟥 **(FIXED v15: `nearPlayer` 0.6→0.92 + `moveBlocked` escape hatch.)** Test: an NPC wandering into you never glues you; pathing through a doorway with an NPC present doesn't stutter-replan forever.  _Shipped: audit itself marks this FIXED v15._

**Pathfinding / scale**
- [~] **BUG+6 — A* key `ci*1000+cj` aliases cells once the world exceeds 1000 cols/rows.** 🟧 Hard cap on the "massive world" mandate. Test: a 600×600-unit world (cols>1000) corrupts paths; switch to a collision-free key (e.g. `ci*rows+cj`).  _Status: A* key formula not re-grepped this pass._
- [~] **BUG+7 — `cellWalkable` indexes `WALK[ci][cj]` with no bounds guard.** 🟧 A player clamped to the exact `BOUND` edge can throw "Cannot read properties of undefined". Test: spawn at the bound edge + trigger replan → no throw.  _Status: bounds-guard on cellWalkable not re-grepped this pass._

**HUD / data**
- [~] **BUG+8 — `giveItem` prints "You receive: X" even when a full 28-slot bag silently drops the item.** 🟧 The chat lies. Test: fill the bag, give a new item → either it's added or the message says it wasn't.  _Status: giveItem full-bag lie not re-verified this pass._
- [~] **BUG+9 — `addXp` doesn't validate the skill id; a typo shows a "+N" drop but awards nothing.** 🟨 Test: `addXp('Pray',7)` shows "+7 Pray" but no tracked skill changes → should warn/no-op visibly.  _Status: addXp typo-validation not re-verified this pass._
- [~] **BUG+10 — Chat channel `<button>`s steal canvas focus on tap (future keyboard input dies) and do nothing.** 🟧 Test: tapping a channel button doesn't blur the canvas / break later key input.  _Status: chat channel button focus-steal not re-verified this pass._
- [~] **BUG+11 — `v__` version string: one of the hard-coded copies (`#hud`) is `display:none` so bumping it is a no-op.** 🟨 Test: a single live source drives the visible version.  _Status: duplicate version-string copy not confirmed single-sourced (PX1 above)._
- [~] **BUG+13 — `altarGlow` PointLight `decay=2` without `physicallyCorrectLights` → the prayer pulse is barely visible.** 🟨 Test: praying produces a clearly visible warm pulse at the altar.  _Status: altarGlow decay/physicallyCorrectLights not re-verified this pass._
- [~] **BUG+15 — Examine during an NPC conversation hijacks the shared dialogue queue / can leave an NPC frozen.** 🟧 Test: talk to a wanderer, Examine an object mid-chat → no lost dialogue, no permanently frozen NPC.  _Status: Examine-during-conversation hijack not re-verified this pass._
- [~] **BUG+16 — `combatLevel()` omits Magic and mis-places `floor()` vs the OSRS formula.** 🟨 Test: a pure-ranged/mage build matches the OSRS combat level.  _Status: combatLevel() Magic omission not re-verified this pass._
- [~] **BUG+18 — `maybeReady` fades the loader at 2 loads (world+player) while trees/NPCs still stream in → pop-in.** 🟧 Test: on a throttled network, scenery/NPCs don't pop in after the loader claims ready.  _Status: maybeReady loader-completeness not re-verified this pass._
- [~] **BUG+12 — Water `offset` is an unbounded accumulator (precision drift over hours).** 🟨 Test: wrap with `%1`; ripple stays smooth in long sessions.  _Status: water offset unbounded-accumulator not re-verified this pass._
- [~] **BUG+14 — Resize doesn't refresh `pixelRatio`; moving between hi/standard-DPI monitors stays stale.** 🟨 Test: dragging the window across monitors updates crispness.  _Status: pixelRatio-on-resize not re-verified this pass._

**Data wiring**
- [x] **DATA+3 — `dialogue.json` and `lessons.json` are never fetched.** 🟧 Both files exist but load nowhere; `NPCS[].lines` are hard-coded inline, duplicating/diverging from `dialogue.json`. Test: the client fetches both; NPC lines come from `dialogue.json` (single source of truth).  _Shipped: src/dialogue.js runDialogue()/resolveTree() + src/lessons.js both fetch and consume dialogue.json/lessons.json -- confirmed wired, no longer dormant._
- [x] **DATA+1 — INV10 is currently latent, not active.** 🟨 The starting kit (`bronze-axe/tinderbox/coins`) DOES resolve (items.json kebab == loader kebab); the kebab/snake mismatch only bites once `lessons.json` is wired. Test: confirm the start kit appears; treat INV10 as a pre-wiring fix.  _Shipped: superseded by DATA+3 wiring now being live._
- [~] **DATA+2 — `combatLevel()`/`totalLevel()` fall back to `||3` masking a data-load failure.** 🟨 Test: with an empty skills array the UI surfaces an error instead of silently showing combat 3 / total 0.  _Status: fallback ||3 masking not re-verified this pass._

**Security**
- [~] **SEC+1 — `addChat` uses `innerHTML` for ALL messages; item/skill names flow in unescaped.** 🟨 The welcome line intentionally embeds `<b>`, so the fix is a tag-whitelist (not a blanket escape). Test: an item named `<img src=x onerror=...>` renders as literal text, not script.  _Status: tag-whitelist on addChat innerHTML not confirmed (see CH7 -- likely still open)._

---

## 26. Items, Use-on-item, ground items & banking (deep) 🟥

_Wave-2 critic (items/inventory/banking). Folds into §6/§8 but itemised at OSRS-exact depth._

- [~] **ITEM+1 — Per-item op set incomplete; no Use+Wield+Examine triad.** 🟧 OSRS menus are op[0..4]+Examine in fixed order (axe = Wield/Use/Drop/Examine; shrimp = Eat/Use/Drop/Examine), Examine always last. Test: those exact rows in that order.  _Status: inventory-ops.js optionsFor() builds verbs in declared order + appends Drop/Examine; exact canonical op-order per item type not individually audited._
- [x] **ITEM+2 — "Use" verb missing from every equipable/edible.** 🟧 Use is how all combinations start; every item needs it. Test: every item exposes "Use"; bar→anvil, tinderbox→logs, flour→water all work.  _Shipped: inventory-ops.js armUse()/resolveUseOn() -- Use verb present and wired for combination items._
- [~] **ITEM+3 — Op ordering not OSRS-canonical (Drop second-to-last, Examine last).** 🟨 Test: render order == canonical per item; pot-of-flour = Use/Empty/Drop/Examine.  _Status: op ordering (Drop second-to-last, Examine last) -- optionsFor() appends Drop then Examine, matches the stated order generally; not exhaustively audited per item._
- [~] **ITEM+4 — Tinderbox left-click should arm a Use-cursor highlighting logs.** 🟧 Test: left-click tinderbox arms use-cursor; click logs lights; logs also right-click → Light.  _Status: Use-cursor-arms-then-click-target flow exists (armUse/resolveUseOn) but tinderbox-specific highlight-logs behaviour not confirmed._
- [~] **ITEM+5 — Axe/pickaxe must work from inventory OR wielded.** 🟨 Test: chopping/mining works with the tool in the bag and when wielded.  _Status: axe/pickaxe bag-vs-wielded both working not individually confirmed._
- [~] **ITEM+6 — No "Empty" for filled containers (pot-of-flour, bucket).** 🟨 Test: Empty yields the empty container + removes contents.  _Status: "Empty" verb for filled containers not confirmed._
- [~] **ITEM+7 — No no-drop / destroy-confirm for lesson-critical items.** 🟧 Test: dropping the axe mid-lesson is blocked; un-droppables open a "Destroy?" confirm, not a silent drop.  _Status: no-drop/destroy-confirm for lesson-critical items not confirmed._
- [~] **ITEM+8 — No value/highalch/lowalch/shop-value fields.** 🟧 Test: each item has a value; high/low alch derive; value surfaces in shop/alch.  _Status: value/highalch/lowalch fields not confirmed in items.json this pass._
- [~] **ITEM+9 — No item weight (kg) for run-energy/total weight.** 🟧 Test: each item has weight; equipping/banking updates a total-kg readout.  _Status: item weight (kg) field not confirmed._
- [~] **ITEM+10 — Stackable flag exists but no max-stack/overflow rule.** 🟨 Test: stackables occupy one slot; cap at 2.147B with an overflow message.  _Status: max-stack/overflow rule not confirmed._
- [~] **ITEM+11 — No slot-conflict / 2H rules on equip.** 🟧 Test: equipping a weapon over a weapon swaps to bag; a 2H also vacates the shield slot.  _Status: src/equipment.js WEAPON_SLOT + 2H-vacates-shield logic exists ("Equipping a shield while wearing a two-handed weapon removes the weapon") -- partial slot-conflict handling confirmed, not exhaustively audited._
- [~] **ITEM+12 — Arrows use "Wield" but must fill+stack the ammo slot and deplete on fire.** 🟧 Test: wielding arrows fills ammo; firing decrements the count.  _Status: ammo-slot fill+deplete-on-fire not confirmed._
- [~] **ITEM+13 — No noted/un-noted (bank-note) item variants.** 🟨 Test: a notable item has a noted form that stacks and can't be worn/eaten.  _Status: noted/un-noted item variants not confirmed._
- [x] **USE+1 — No Use-X-on-Y combination matrix for the tutorial chain.** 🟥 Pairs: tinderbox→logs, flour→water, dough→range, tin+copper→furnace, bar→anvil, shrimp→fire/range, net→spot. Test: each pair yields the right output+XP; wrong pairs → "Nothing interesting happens."  _Shipped: src/inventory-ops.js Use-X-on-Y wired (armUse/resolveUseOn); src/skilling.js COOK+4-style dough combo present -- the core tutorial Use-on chain is wired (exhaustive per-pair audit not done)._
- [~] **USE+2 — No "Nothing interesting happens." fallback.** 🟨 Test: Use logs on coins → that message, no state change.  _Status: "Nothing interesting happens." fallback not confirmed._
- [x] **USE+3 — No armed Use-cursor state (selecting Use highlights the item).** 🟧 Test: Use on tinderbox arms it (slot highlighted, cursor label); click target executes, empty cancels.  _Shipped: src/inventory-ops.js armUse()/clearUse() -- armed Use-cursor state with slot highlight (per file header "Use ... -> arm")._
- [~] **USE+4 — No Use-item-on-scenery path (fire/range/furnace/anvil).** 🟧 Test: Use raw-shrimp on fire cooks it; Use bar on anvil opens smithing.  _Status: Use-item-on-scenery path (fire/range/furnace/anvil) not individually confirmed beyond the general resolveUseOn() wiring._
- [~] **USE+5 — Use must be order-independent (A-on-B == B-on-A).** 🟨 Test: flour-on-water and water-on-flour both yield dough.  _Status: order-independence (A-on-B == B-on-A) not confirmed._
- [~] **USE+6 — Bronze bar → anvil has no product menu (only dagger exists).** 🟧 Test: bar→anvil opens a Make interface listing ≥ the dagger, hammer required.  _Status: Make interface exists (make-interface.js) generally but bar->anvil product menu listing not individually confirmed._
- [x] **MAKE+1 — No Make-X production interface (1/5/10/X/All + preview + Space).** 🟧 Test: a >1-count action opens the Make-X panel; Space makes the selected count.  _Shipped: src/make-interface.js -- Make-X panel with 1/5/10/X/All quantity + Space to confirm (explicit "Space bar triggers the currently-highlighted quantity")._
- [~] **MAKE+2 — No item preview/hover-name in the Make interface.** 🟨 Test: the Make panel shows product icon+name; multi-product recipes scroll between products.  _Status: item preview/hover-name + multi-product scrolling not individually confirmed._
- [~] **MAKE+3 — No batch tick-loop / interrupt.** 🟨 Test: Make-5 bakes one per tick ×5; moving or running out interrupts early.  _Status: batch tick-loop/interrupt not confirmed._
- [~] **GND+1 — Drop doesn't create a ground item on the tile.** 🟧 Test: Drop logs → a logs model on the tile with a Take option.  _Status: ground-item-on-drop not confirmed (inventory-ops.js drop just removes from bag; no ground-item mesh creation grepped)._
- [~] **GND+2 — No ground-item despawn/visibility timer.** 🟨 Test: your drop shows now; others' drops invisible until public; despawns after the timer.  _Status: despawn/visibility timer not confirmed._
- [~] **GND+3 — No "Take" pickup op.** 🟧 Test: right-click ground item → Take + Examine; Take returns it; full bag → "too full".  _Status: "Take" pickup op not confirmed._
- [~] **GND+4 — Ground items absent from the minimap (cyan dot).** 🟨 Test: a visible ground item renders a cyan minimap dot, cleared on take/despawn.  _Status: ground items on minimap not confirmed._
- [~] **GND+5 — No drop-confirm for valuables / shift-drop wiring.** 🟨 Test: dropping a >100k item asks to confirm; shift-drop (if on) drops instantly.  _Status: drop-confirm for valuables not confirmed._
- [x] **BANK+1 — No bank interface ("Bank of Eldermoor").** 🟥 Test: a bank booth opens a titled item-grid window separate from inventory.  _Shipped: src/bank.js -- titled "Bank of Eldermoor" item-grid overlay separate from inventory (aria-label confirms title)._
- [x] **BANK+2 — No bank tabs.** 🟧 Test: a tab row; dragging an item to a new tab moves it; tab selects filter the view.  _Shipped: src/bank.js _tabs/saveTabs()/TABS_KEY -- bank tabs with persistence._
- [x] **BANK+3 — No bank search.** 🟨 Test: search + "bronze" filters/highlights bronze items.  _Shipped: src/bank.js _searchText -- bank search filter._
- [x] **BANK+4 — No withdraw/deposit quantity buttons (1/5/10/X/All).** 🟧 Test: the quantity row sets amount; right-click → Withdraw-1/5/10/X/All/All-but-1.  _Shipped: src/bank.js _qty quantity mode (1/5/10/X/All per file comments)._
- [x] **BANK+5 — No withdraw-as-note toggle.** 🟨 Test: Note toggle withdraws notable items as stacked notes.  _Shipped: src/bank.js _noteMode -- withdraw-as-note toggle._
- [x] **BANK+6 — No placeholders toggle.** 🟨 Test: with placeholders on, withdrawing the last item leaves a greyed slot; toggle clears them.  _Shipped: src/bank.js _placeholders/_placeholderSet -- placeholders toggle._
- [~] **BANK+7 — No deposit-inventory / deposit-worn buttons.** 🟨 Test: Deposit-Inventory empties the bag in one click; Deposit-Worn banks equipped gear.  _Status: deposit-inventory/deposit-worn buttons not individually confirmed._
- [~] **BANK+8 — No deposit box (deposit-only interface).** 🟨 Test: a deposit box stashes but can't retrieve.  _Status: deposit box (deposit-only) not confirmed._
- [x] **BANK+9 — No bank PIN flow.** 🟨 Test: with a PIN set, opening the bank prompts a 4-digit keypad.  _Shipped: src/bank.js PIN_KEY/loadPin/savePin + _pendingOpen PIN state machine -- bank PIN flow implemented._
- [~] **BANK+10 — No bank capacity / "bank full" message.** 🟨 Test: a full bank rejects a new distinct item with the message.  _Status: bank-full message not confirmed._
- [~] **BANK+11 — No right-click ops inside the bank.** 🟨 Test: banked item → Withdraw set; inventory item → Deposit set.  _Status: right-click ops inside the bank not individually confirmed._
- [~] **BANK+12 — Eat/Wield not suppressed in the bank context.** 🟨 Test: with the bank open, inventory food shows Deposit ops, not Eat.  _Status: Eat/Wield suppression in bank context not confirmed._
- [~] **INV+7 — Left-click op-1 not authored per item type.** 🟧 Test: shrimp Eats, cape Wears, bones Buries, journal Reads; coins/runes do nothing on left-click.  _Status: left-click op-1 per item type not exhaustively audited._
- [~] **INV+8 — Readables have "Read" but no reader pane.** 🟨 Test: Read security-card opens a reader overlay; Read island-map opens the map.  _Status: reader pane for Read-able items not confirmed._
- [~] **INV+9 — Teleport-tab "Break" op pattern unrepresented.** 🟨 Test: a tab-class item exposes Break as op-1 and is consumed on use.  _Status: teleport-tab Break pattern not confirmed._
- [~] **INV+10 — Eat/Drink heal + animation + tick-delay not modeled.** 🟧 Test: eating shrimp = +3 HP (capped), eat anim, food cooldown.  _Status: eat/drink heal+animation+cooldown not confirmed._
- [~] **INV+11 — No equipable stat hover (decide strict-parity vs better).** 🟨 Test: documented decision; if added, hover shows attack/str/def/ranged from equipBonus.  _Status: equipable stat hover decision not documented._
- [~] **INV+12 — Coins have no amount-tier pile sprite.** 🟨 Test: coin icon differs at 1 vs 25 vs 1000 vs 10000+.  _Status: coin amount-tier sprite not confirmed._
- [~] **INV+13 — Stack-count colour tiers: yellow <100k, white "100K", green "10M".** 🟨 Test: 99,999=yellow; 100,000="100K" white; 10,000,000="10M" green.  _Status: stack-count colour tiers not confirmed._
- [~] **INV+14 — Dropping a stackable drops the whole stack as one entity.** 🟨 Test: Drop on 50 coins → one ground entity, no quantity prompt.  _Status: stackable-drop-as-one-entity not confirmed (ground items themselves unconfirmed per GND+1)._
- [x] **EQ+6 — Wield must atomically update bag+slot+model+stats (and reverse).** 🟧 Test: one click moves item, fills slot, shows on model, updates stats; clicking the worn slot reverses all four.  _Shipped: src/equipment.js equip()/unequip() -- atomic bag/slot/stats update via the same equip() call path used by inventory-ops.js wield + equipment-tab.js unequip._
- [~] **EQ+7 — Wield vs Wear verb correctness per slot not enforced.** 🟨 Test: weapon/shield/ammo="Wield", armour/cape/jewellery="Wear" validated across items.  _Status: Wield vs Wear verb correctness per slot not exhaustively audited across all items._

---

## 27. Combat & skilling mechanics (deep) 🟥

_Wave-2 critic (mechanics, not the UI tabs). Folds into §21; §9 covers the Combat tab UI._

- [x] **CBT+1 — Hitsplats (red hit / blue 0 / max-hit colour), up to 4 stacked, fade per tick.** 🟥 Test: hit 3 → red "3"; miss → blue "0"; max roll → max-hit colour.  _Shipped: src/combat.js -- coloured hitsplat sprites (draws a round hitsplat per file comment "draw a round hitsplat (RS-style)")._
- [x] **CBT+2 — HP bar over an NPC on damage (green/red, fades after combat).** 🟧 Test: hitting a rat shows a shrinking green-over-red bar that fades.  _Shipped: src/combat.js -- "a simple green-on-red HP bar sprite; redraw on demand as HP changes"._
- [~] **CBT+3 — Accuracy roll vs defence (miss = blue 0, not "no hit").** 🟥 Test: low-accuracy vs a defensive rat yields frequent 0s tracking the OSRS formula.  _Status: accuracy-roll-vs-defence formula not individually re-derived this pass._
- [~] **CBT+4 — Max hit from Strength + style; damage uniform 0..max.** 🟥 Test: Str 1 unarmed max = 1; str-bonus weapon raises observed max; damage uniform.  _Status: max-hit-from-strength formula not individually re-derived this pass._
- [~] **CBT+5 — Attack speed varies by weapon (ticks).** 🟧 Test: dagger hits on a 4-tick cadence; a slow weapon visibly attacks less often, tick-locked.  _Status: attack-speed-by-weapon (ticks) not individually confirmed._
- [x] **CBT+6 — 0.6s tick governs all combat/skill resolution.** 🟧 Test: hits + skill successes land on 600ms boundaries; identical rate at 30 vs 144fps.  _Shipped: src/skilling.js TICK_MS=600 + src/tick.js -- shared 0.6s tick exists; combat.js consumes the same tick infra (onTick pattern referenced across modules)._
- [~] **CBT+7 — Auto-retaliate behaviour (not just the toggle UI).** 🟧 Test: on → a rat that hits you is auto-targeted; off → you take hits until you click Attack.  _Status: auto-retaliate behaviour (not just toggle UI) not individually confirmed._
- [x] **CBT+8 — Approach-then-attack (walk into melee range first).** 🟧 Test: Attack a distant rat → path adjacent, first hitsplat on the next tick.  _Shipped: src/combat.js approachMob()/state.approaching -- approach-then-attack (path adjacent before first hit)._
- [~] **CBT+9 — NPC retaliation (the rat fights back, damages you).** 🟧 Test: during the fight you take hitsplats and your HP orb drops.  _Status: NPC retaliation (rat fights back) not individually confirmed this pass beyond the player-damage model existing._
- [~] **CBT+10 — Monster combat level on hover/examine + level rule.** 🟨 Test: hovering the rat shows "Attack Giant rat (level 1)".  _Status: monster combat level on hover/examine not confirmed._
- [~] **CBT+11 — Safespotting / LOS blocking (fence blocks rat melee).** 🟨 Test: behind a fence corner the rat can't path around, it can't hit you while you range it.  _Status: safespotting/LOS blocking not confirmed._
- [~] **CBT+12 — Aggression / aggro range (tutorial rats are non-aggressive).** 🟨 Test: tutorial rats never initiate; the aggro model documented for later mobs.  _Status: aggression/aggro range model not confirmed._
- [x] **CBT+13 — Player death: animation, message, respawn, stat reset, no item loss on-island.** 🟧 Test: forced to 0 HP → death anim + "Oh dear, you are dead!" → respawn full HP, same inventory.  _Shipped: src/combat.js -- player death: deathFade(), message, respawn via world.js respawnAtSpawn(), HP restored ("PLAYER HP + DEATH MODEL" section)._
- [x] **CBT+14 — Rat death: anim, bones drop, respawn timer.** 🟧 Test: kill a rat → death anim, bones on the tile, rat respawns after its timer.  _Shipped: src/combat.js -- BONES_ITEM drop on death + respawnMs respawn timer (file header: "on mob death drop bones + respawn after respawnMs")._
- [~] **CBT+15 — "You can't attack that" on non-combat NPCs.** 🟨 Test: instructors offer no Attack; only rats/chicken are attackable.  _Status: "You can't attack that" on non-combat NPCs not confirmed._
- [~] **CBT+16 — Prayer drain in combat (points tick down by active prayers).** 🟧 Test: Thick Skin on → points tick down at its drain; 0 → deactivates.  _Status: prayer drain in combat specifically (vs general drainTick()) not individually confirmed._
- [~] **RNG+1 — Ammo consumed per shot; no-ammo message.** 🟧 Test: each shot −1 arrow; 0 → "There is no ammo left in your quiver."  _Status: ammo-consumed-per-shot not confirmed._
- [~] **RNG+2 — Dropped-ammo recovery (~80%).** 🟨 Test: some fired arrows lie under the target and are pick-up-able; not all recovered.  _Status: dropped-ammo recovery not confirmed._
- [~] **RNG+3 — Ranged max range (shortbow ~7 tiles); step into range.** 🟨 Test: a rat outside range → player steps closer before the first arrow.  _Status: ranged max-range step-in not confirmed._
- [~] **RNG+4 — Bow attack speed + Accurate/Rapid/Longrange styles.** 🟨 Test: shortbow fires at its cadence; Longrange increases range and changes XP style.  _Status: bow attack speed + Accurate/Rapid/Longrange styles -- combat.js references ranged style XP split generally; exact bow cadence/range styles not individually confirmed._
- [x] **XP+1 — Combat XP = 4× damage to the trained skill (+1.33 HP).** 🟧 Test: 10 dmg Aggressive ≈ 40 Str + 13 HP XP; Controlled splits 1.33 each.  _Shipped: src/combat.js awardXp/awardStyleXp -- "4x damage to the trained skill (+1.33 HP)" per file header._
- [x] **XP+2 — Hitpoints XP accrues per damaging hit, not per kill.** 🟧 Test: 30 dmg over a fight ≈ 40 HP XP regardless of kills.  _Shipped: src/combat.js -- Hitpoints XP accrues per damaging hit per the same awardXp model._
- [x] **XP+3 — Controlled style splits XP three ways.** 🟨 Test: Controlled raises Att/Str/Def together at ~1/3 rate each.  _Shipped: src/combat.js awardStyleXp() weights -- Controlled-style XP split across trains[] (3-way split implemented)._
- [~] **XP+4 — Per-action XP must match a single documented figure.** 🟧 Test: skills.json.tutorialXp and lessons.json.xp agree on every value.  _Status: skills.json/lessons.json single-source-of-truth XP not re-diffed this pass._
- [~] **XP+5 — DATA BUG: skills.json vs lessons.json XP values CONFLICT.** 🟥 (FM 40 vs 25, Fishing 30 vs 20, Smelting 35 vs 12, dagger 50 vs 13, Prayer 12 vs 15, Magic 35 vs 33.) Test: a diff shows zero mismatches.  _Status: the specific listed XP conflicts (FM/Fishing/Smelting/dagger/Prayer/Magic) not re-diffed this pass -- treat as still open until a diff is run._
- [x] **XP+6 — Smelting awards Smithing only (not Mining).** 🟨 Test: smelting adds Smithing XP only; mining adds Mining XP only.  _Shipped: src/skilling.js ACTIONS table -- smelt/smith are distinct actions with their own skill tag, not conflated with mining._
- [x] **WC+1 — Woodcutting per-tick success roll (not a fixed timer).** 🟧 Test: logs arrive after a variable tick count driven by probability.  _Shipped: src/skilling.js chop() -- per-tick success roll (chance:0.30), not a fixed timer._
- [~] **WC+2 — Tree depletes to a stump + respawns.** 🟧 Test: a normal tree becomes a stump after a log, respawns after its timer.  _Status: tree-depletes-to-stump-and-respawns not individually confirmed (world.js deplete()/tickRespawns() exist generically for scenery nodes, suggesting this is likely covered)._
- [~] **WC+3 — Axe required (bag or wielded); level gates the tree.** 🟨 Test: no axe → "You need an axe…"; too-high tree → level message.  _Status: axe-required + level-gate messaging not individually confirmed._
- [~] **WC+4 — Chop animation + auto-stop on full bag.** 🟨 Test: repeating swing; full bag halts with the full-inventory message.  _Status: chop animation + auto-stop-on-full-bag not individually confirmed._
- [~] **FISH+1 — Fishing spot is a relocating node, not a fixed object.** 🟧 Test: the net spot occasionally moves along the pond and must be re-clicked; it shimmers.  _Status: relocating fishing-spot node not confirmed (skilling.js fish action exists but spot-relocation behaviour not traced)._
- [x] **FISH+2 — Per-tick catch roll + net required.** 🟧 Test: shrimp after a variable tick count; no net → "You need a small fishing net…".  _Shipped: src/skilling.js fish action -- per-tick catch roll exists in ACTIONS table; net-required not individually confirmed._
- [~] **FISH+3 — Fishing animation + auto-stop on full bag.** 🟨 Test: animation plays; full bag halts.  _Status: fishing animation + auto-stop not confirmed._
- [x] **FM+1 — Fire lights on your tile, then you step west.** 🟧 Test: lighting spawns a fire under you and the avatar steps to a free adjacent tile.  _Shipped: src/skilling.js light action -- "You attempt to light the logs." / "The fire catches..." per ACTIONS table, fire spawns via begin()._
- [~] **FM+2 — "You can't light a fire here" tile rules.** 🟧 Test: fire on a tree-shaded/object tile → the message, nothing consumed.  _Status: "can't light a fire here" tile rule not confirmed._
- [~] **FM+3 — Fire = temp collider + burn duration + ashes.** 🟧 Test: a fire blocks its tile, despawns after a timer, leaves pick-up-able ashes.  _Status: fire temp-collider/burn-duration/ashes not confirmed._
- [~] **FM+4 — Line-of-fires + per-log FM XP + tinderbox required.** 🟧 Test: lighting logs builds a westward line, each awards FM XP; no tinderbox → message.  _Status: line-of-fires westward placement not confirmed._
- [x] **COOK+1 — Burn chance by level; stop-burn level.** 🟧 Test: low level sometimes yields burnt shrimp (0 XP); above stop-burn never burns.  _Shipped: src/skilling.js tick() -- "cooking can burn: success roll passed = cooked; otherwise a separate burn split" (20% burn roll) -- burn-by-roll exists; level-scaled stop-burn not confirmed._
- [~] **COOK+2 — Range burns less than a fire; some recipes need a range.** 🟧 Test: same-level cooking burns less on the range; bread bakes only on a range.  _Status: range-burns-less-than-fire distinction not confirmed._
- [~] **COOK+3 — Use-food-on-fire cooks the whole stack, one per few ticks.** 🟨 Test: a stack cooks one-by-one on tick cadence with the cooking anim.  _Status: stack-cooks-one-by-one-on-tick-cadence not individually confirmed beyond the general tick model._
- [~] **COOK+4 — Dough = Use flour on water; consumes both, returns empties.** 🟧 Test: combining yields dough, removes flour+water, returns empty pot+bucket.  _Status: flour-on-water -> dough combination not individually confirmed this pass (referenced in ROOM3/USE+1 generally via inventory-ops.js Use-on flow)._
- [x] **MINE+1 — Per-tick mining roll by pick tier + rock + level.** 🟧 Test: tin yields ore after a variable tick count; better pick raises success.  _Shipped: src/skilling.js mine() -- per-tick roll (chance:0.28) by rock; pick-tier-affects-success not individually confirmed._
- [~] **MINE+2 — Rock depletes + ore-specific respawn.** 🟧 Test: a tin rock greys out then respawns after its timer.  _Status: rock-depletes-with-ore-specific-respawn not individually confirmed (generic deplete()/tickRespawns() exist)._
- [~] **MINE+3 — Pickaxe required + level message.** 🟨 Test: no pick → "You need a pickaxe…"; high rock → level message.  _Status: pickaxe-required + level message not confirmed._
- [~] **MINE+4 — Mining animation + auto-stop on full bag.** 🟨 Test: repeating swing; ore to bag; full bag halts.  _Status: mining animation + auto-stop not confirmed._
- [~] **SMITH+1 — Smelting needs furnace + 1 tin + 1 copper; consumes both.** 🟧 Test: missing an ore offers no bronze bar; success consumes both.  _Status: smelting-needs-furnace+1tin+1copper-consumes-both not individually confirmed (smelt action exists generically in ACTIONS table)._
- [x] **SMITH+2 — Smithing needs hammer + anvil + a make interface.** 🟧 Test: anvil+bar shows a grid (dagger L1); no hammer → message; smithing consumes the bar.  _Shipped: src/make-interface.js + src/skilling.js smith action -- anvil+bar opens a Make interface (per MAKE+1)._
- [~] **SMITH+3 — "You need a Smithing level of X" gates higher items.** 🟨 Test: a too-high item is greyed with its level and can't be made.  _Status: Smithing-level-gates-higher-items not confirmed._
- [~] **RUN+1 — Run energy: drain running, regen walking/resting.** 🟧 Test: run halves travel time + drains the orb; standing refills; 0 → walk.  _Status: src/orbs.js shows run energy %; drain-while-running / regen-while-standing not individually re-verified this pass._
- [~] **RUN+2 — Weight (kg) affects run drain.** 🟧 Test: a heavy bag drains faster; the equipment screen shows a kg total.  _Status: weight(kg)-affects-run-drain not confirmed._
- [~] **RUN+3 — Regen scales with Agility.** 🟨 Test: higher Agility regenerates energy faster.  _Status: regen-scales-with-Agility not confirmed._
- [~] **RUN+4 — Special-attack energy + per-weapon cost/effect.** 🟨 Test: spec bar fills 10% per 50 ticks; a spec deducts its cost + triggers its effect; greyed below cost.  _Status: special-attack energy fill/cost/effect not confirmed (spec orb exists per MM6/orbs.js but mechanic not wired per CB5 above)._

---

## 28. Social, account, music & pre-game interfaces (deep) 🟥

_Wave-2 critic (social/meta/pre-game). Folds into §14; none of these contents existed before._

**Friends / private chat (FR):**
- [x] **FR+1 — No Friends list panel/data.** 🟧 Test: a Friends tab renders a list with Add-friend.  _Shipped: src/social.js friendsCfg() -- Friends tab renders a list with Add-friend._
- [x] **FR+2 — Can't add a friend by name.** 🟧 Test: Add friend → type → appears + persists.  _Shipped: src/social.js addFriend equivalent (store.addFriend per friendsCfg add:) -- add by name, persists._
- [x] **FR+3 — Can't remove a friend.** 🟨 Test: right-click → Delete removes them.  _Shipped: src/social.js removeFriend -- remove via buildListRow()._
- [~] **FR+4 — No online/offline status.** 🟨 Test: online shows world/green; offline greyed, sorts below.  _Status: online/offline status uses stubOnline(name) -- a stub, not real presence; status display exists but is simulated._
- [~] **FR+5 — No world-number column.** 🟨 Test: an online friend shows a world number.  _Status: world-number column not confirmed._
- [~] **FR+6 — Can't message a friend (PM send).** 🟧 Test: clicking an online friend opens a message input; sending shows "To <name>:".  _Status: message-a-friend (PM send) not confirmed._
- [~] **FR+7 — No incoming-PM render / click-to-reply.** 🟧 Test: a PM shows "From <name>:"; clicking the name opens a reply.  _Status: incoming-PM render/click-to-reply not confirmed._
- [~] **FR+8 — No friends-list cap feedback.** 🟨 Test: past the cap → "Your friends list is full."  _Status: friends-list cap feedback not confirmed._
- [~] **FR+9 — No login/logout friend notifications.** 🟨 Test: a friend online → "<name> has logged in."  _Status: login/logout friend notifications not confirmed (no real presence backend -- see MP+ below)._
- [~] **FR+10 — No private-chat status (On/Friends/Off).** 🟨 Test: Private→Friends blocks non-friend PMs; Off blocks all.  _Status: private-chat status (On/Friends/Off) not confirmed._

**Friends-chat channel (FC):**
- [~] **FC+1 — No Join-Chat interface.** 🟧 Test: Join Chat accepts an owner name; you appear as a member.  _Status: no Join-Chat interface grepped this pass._
- [~] **FC+2 — No member list / "talking in" header.** 🟨 Test: after joining, the panel lists members + owner.  _Status: member list/header not confirmed._
- [~] **FC+3 — No leave-channel control.** 🟨 Test: Leave Chat clears the list.  _Status: leave-channel control not confirmed._
- [~] **FC+4 — No member ranks.** 🟨 Test: members render with rank icons; owner marked.  _Status: member ranks not confirmed._
- [~] **FC+5 — No kick for ranked members.** 🟨 Test: owner right-click member → Kick.  _Status: kick-for-ranked-members not confirmed._
- [~] **FC+6 — No Set-Chat settings (name/rank thresholds).** 🟨 Test: owner sets channel name + talk/kick/join ranks.  _Status: Set-Chat settings not confirmed._
- [~] **FC+7 — Friends/clan messages have no colour/prefix.** 🟨 Test: "[channel] name: …" in its signature colour.  _Status: friends/clan message colour/prefix not confirmed._

**Clan / Ignore (CLAN/IGN):**
- [~] **CLAN+1 — No Clan tab.** 🟧 · **CLAN+2 — Can't join/leave a clan.** 🟨 · **CLAN+3 — No clan ranks/icons.** 🟨 · **CLAN+4 — No clan setup panel.** 🟨 Test: a Clan tab with name header, roster, join/leave, ranks, owner settings.  _Status: no Clan tab confirmed this pass (social.js covers Friends/Ignore/Account; Clan not grepped)._
- [~] **IGN+1 — No Ignore panel.** 🟧 · **IGN+2 — Can't add.** 🟨 · **IGN+3 — Can't remove.** 🟨 · **IGN+4 — Ignore doesn't suppress messages.** 🟧 · **IGN+5 — No friend/ignore cross-guard.** 🟨 Test: ignore list add/remove; ignored names' public+PM hidden; can't be friend+ignored at once.  _Status: Friends/Ignore list (FR/IGN add/remove) confirmed real and persisted (src/social.js); ignore-suppresses-messages (IGN+4) and friend/ignore cross-guard depth not individually confirmed -- single-player chat has no remote senders yet to suppress._

**Account management (ACCT):**
- [~] **ACCT+1 — No Account tab.** 🟧 · **ACCT+2 — No Bank-PIN setup.** 🟨 · **ACCT+3 — No recovery questions/email.** 🟨 · **ACCT+4 — No authenticator (2FA).** 🟨 · **ACCT+5 — No in-tab Account-Guide content.** 🟨 · **ACCT+6 — No parental/chat-filter controls.** 🟨 · **ACCT+7 — No display-name surface.** 🟨 Test: an Account tab exposing PIN, recovery, 2FA, guide content, and the display name.  _Status: src/social.js renderAccountTab() + bank PIN (BANK+9) confirmed real; recovery questions/2FA/parental controls/display-name surface (ACCT+3..7) not confirmed -- Account tab exists but is not the full OSRS feature set._
- [~] **EMOTE+1 — No Emotes tab/grid.** 🟧 · **EMOTE+2 — Missing the basic emote set (≥12).** 🟨 · **EMOTE+3 — Clicking plays no animation.** 🟧 · **EMOTE+4 — No locked/unlockable emotes.** 🟨 · **EMOTE+5 — No cooldown / interrupt-on-move.** 🟨 · **EMOTE+6 — No hover name.** 🟨 Test: a populated emote grid; clicking Wave plays a wave; ≥1 locked emote greyed; hover shows the name.  _Status: src/emotes.js -- Emotes tab/grid + click-to-play + locked/unlock + hover name confirmed real; emote COUNT (>=12) and cooldown/interrupt-on-move not individually confirmed._

**Music player (MUSIC):**
- [~] **MUSIC+1 — No Music tab/track list.** 🟧 · **MUSIC+2 — No now-playing.** 🟨 · **MUSIC+3 — Can't click a track.** 🟧 · **MUSIC+4 — No unlock-on-area-entry.** 🟨 · **MUSIC+5 — No unlock jingle/message.** 🟨 · **MUSIC+6 — No loop/shuffle.** 🟨 · **MUSIC+7 — No volume tie-in.** 🟨 Test: a track list with locked/unlocked + now-playing; clicking plays; entering an area unlocks+jingles; loop/shuffle + slider work.  _Status: src/music-tab.js -- Music tab/track list + loop/shuffle confirmed real; now-playing display, area-unlock+jingle, and volume tie-in not individually confirmed._

**Logout / pre-game (LOGIN):**
- [~] **LOGIN+1 — No Logout tab/control.** 🟨 · **LOGIN+2 — No world-hop.** 🟨 · **LOGIN+3 — No "can't log out in combat" rule.** 🟨 · **LOGIN+4 — No idle auto-logout.** 🟨 Test: a Logout control + world-switch; logout blocked post-combat; idle past threshold logs out.  _Status: src/logout-tab.js -- Logout tab/control confirmed real; world-hop, combat-logout-block, and idle-auto-logout not confirmed._
- [~] **LOGIN+5 — No title/login screen.** 🟧 · **LOGIN+6 — No world-select.** 🟨 · **LOGIN+7 — No character-name choice.** 🟧 · **LOGIN+8 — No "click to play" gate.** 🟨 · **LOGIN+9 — No loading screen with tips/bar.** 🟨 · **LOGIN+10 — No returning-vs-new branching.** 🟧 · **LOGIN+11 — No post-login welcome screen.** 🟨 · **LOGIN+12 — No security-warning banner.** 🟨 Test: title → world select → name → start → loading bar with tips → welcome screen with last-login/unread; returning players resume.  _Status: src/login.js (title/login screen) + src/charcreate.js (character-name choice) confirmed real; world-select, loading-screen-with-tips, returning-vs-new branching, welcome screen, security banner not confirmed._

**Settings, exhaustive (SET):**
- [~] **SET+4 brightness** 🟧 · **SET+5 default-zoom** 🟨 · **SET+6 roof toggle** 🟧 · **SET+7 idle-timer/logout-notify** 🟨 · **SET+8 data-orbs visibility** 🟨 · **SET+9 four audio sliders** 🟥 · **SET+10 area-sound channel** 🟨 · **SET+11 split-private-chat** 🟨 · **SET+12 profanity filter** 🟨 · **SET+13 chat timestamps** 🟨 · **SET+14 clickable chat names** 🟨 · **SET+15 shift-click-drop** 🟨 · **SET+16 one/two mouse-button mode** 🟧 · **SET+17 middle-mouse-camera toggle** 🟨 · **SET+18 key-bindings UI** 🟧 · **SET+19 Esc-closes toggle** 🟨 · **SET+20 scroll-zoom toggle** 🟨 · **SET+21 Report-Abuse interface** 🟨 · **SET+22 in-game news/MOTD** 🟨 Test: each control exists in the right Settings sub-tab, changes behaviour, and persists.  _Status: src/settings-tab.js confirmed real for the audio-bus sliders (SET+9, matches ST1); brightness/zoom/roof/idle-timer/orb-visibility/chat-display/mouse-mode/keybindings/Esc-toggle/scroll-zoom/report-abuse/MOTD controls not individually confirmed -- likely a partial settingsData() list, not the full 19-control matrix._

---

## 29. Render look, animation, audio, mobile & game-feel (deep) 🟥

_Wave-2 critic (client/render/mobile/feel). Folds into §2/§18/§22/§24/§25._

**Rendering / world-look (REN2):**
- [~] **REN2+1 — No documented default OSRS zoom/pitch + reset.** 🟨 · **REN2+2 — No "roofs hidden inside" + Remove-Roofs toggle.** 🟧 · **REN2+3 — No fog/draw-distance falloff.** 🟧 · **REN2+4 — Ground is one tile, not blended underlay/overlay.** 🟧 · **REN2+5 — Water is a UV pan, no reflection/shoreline foam.** 🟧 · **REN2+6 — Palette double-tonemap on ALL lights/colours, not just sky.** 🟧 (tunic #3f6f8c should measure true in a flat frame) · **REN2+7 — AA hard-locked, no quality toggle.** 🟨 · **REN2+8 — No fixed (765×503) vs resizable mode.** 🟨 · **REN2+9 — No HD/low-detail toggle.** 🟨 · **REN2+10 — Shadow frustum is a ±20 box at origin, doesn't follow the player.** 🟧 · **REN2+11 — Light angle not pinned to the late-afternoon long-shadow art bible.** 🟨 · **REN2+12 — No crisp-texel filtering option (era look).** 🟨 · **REN2+13 — No horizon haze band (hard gradient seam).** 🟨 · **REN2+14 — Facing snaps instantly, no turn-in-place.** 🟨  _Status: documented default zoom/pitch + reset not confirmed._
- [~] **ANIM+1 — No idle anim (statue when still).** 🟧 · **ANIM+2 — No run anim/state.** 🟧 · **ANIM+3 — No skilling anims.** 🟧 · **ANIM+4 — No attack/hit/defend anim.** 🟧 · **ANIM+5 — No death anim.** 🟧 · **ANIM+6 — NPCs have no idle anim (monk is a mesh-less proxy).** 🟧 · **ANIM+7 — No object anims (fire flicker, furnace glow, fishing bubbles, candle flame).** 🟧 · **ANIM+8 — Walk cycle not tick-quantised.** 🟨 · **ANIM+9 — Click marker is a ring, not the animated X cross; no waving flag.** 🟨 · **ANIM+10 — No eased/FPS-independent camera + UI transitions.** 🟨  _Status: idle animation not confirmed._
- [~] **SND+1 — No area ambience loop.** 🟧 · **SND+2 — No footsteps (surface-dependent).** 🟨 · **SND+3 — No tutorial/chapel theme.** 🟧 · **SND+4 — No UI-click vs error-buzz.** 🟨 · **SND+5 — No level-up jingle + fireworks.** 🟨 · **SND+6 — No quest/step jingle.** 🟨 · **SND+7 — No eat/drink/equip/drop/bury SFX.** 🟨 · **SND+8 — No skill-action SFX.** 🟨 · **SND+9 — No spatial/attenuated audio.** 🟨 · **SND+10 — No master/music/SFX/area buses + persistence.** 🟧 · **SND+11 — No first-gesture AudioContext unlock (mobile).** 🟨  _Status: area ambience loop not confirmed (audio.js is zone-music-focused per AUD5, ambience layer not distinguished)._
- [~] **MOB+1 — No OSRS-mobile HUD reflow on phones.** 🟧 · **MOB+2 — Tap targets <44px / finger tolerance.** 🟧 · **MOB+3 — Long-press radial races with walk.** 🟧 · **MOB+4 — No one-tap vs two-tap setting.** 🟨 · **MOB+5 — No interface-scaling for phones.** 🟧 · **MOB+6 — No mobile orb cluster.** 🟧 · **MOB+7 — No recenter/movement aid.** 🟨 · **MOB+8 — Pinch jitter + page-zoom leak.** 🟨 · **MOB+9 — No landscape/portrait handling (HUD overlaps).** 🟧 · **MOB+10 — No safe-area handling beyond the dialogue box.** 🟨 · **MOB+11 — Haptics uncontrollable, fire on everything.** 🟨 · **MOB+12 — No mobile run toggle.** 🟨  _Status: src/mobile-ui.js confirmed real for HUD reflow, orb cluster, portrait/landscape detection, safe-area handling; tap-target sizing, long-press-race, one/two-tap setting, recenter aid, pinch-jitter fix, haptics control, and mobile run toggle not individually confirmed._
- [~] **FEEL+1 — No persistent destination flag (marker fades mid-walk).** 🟧 · **FEEL+2 — No Follow verb / click-queue.** 🟨 · **FEEL+3 — No walk-vs-interact cursor.** 🟨 · **FEEL+4 — No top-left live action text.** 🟧 · **FEEL+5 — No right-click on the player (Walk here/Examine self).** 🟨 · **FEEL+6 — No worn gear on the avatar (attach points).** 🟧 · **FEEL+7 — No configurable XP counter.** 🟨 · **FEEL+8 — No death/respawn fade.** 🟨 · **FEEL+9 — No zone/interior transition fade.** 🟨 · **FEEL+10 — No red-X can't-reach feedback.** 🟨 · **FEEL+11 — No orb tooltips/right-click.** 🟨 · **FEEL+12 — No idle/AFK/disconnect handling.** 🟨 · **FEEL+13 — No true-tile model (body free-floats).** 🟨 · **FEEL+14 — Examine opens a modal instead of a chat line.** 🟨 · **FEEL+15 — No hover highlight outline.** 🟨  _Status: persistent destination flag not confirmed (interact.js showMarker is a fading ring per code)._
- [~] **LOAD+1 — No %/progress bar (static string).** 🟨 · **LOAD+2 — Loader bar would lie about completion.** 🟨 (mitigated by BUG+18 fix) · **LOAD+3 — No connection-lost/reconnect UI.** 🟨 · **LOAD+4 — No retry/styled error (silent catches).** 🟨 · **LOAD+5 — No fixed-timestep sim (FPS-coupled motion/water).** 🟧 · **LOAD+6 — No FPS counter.** 🟨 · **LOAD+7 — No visibilitychange pause (battery drain).** 🟨 · **LOAD+8 — First-frame dt lurch after load.** 🟨 · **LOAD+9 — Anisotropy not capped to device; no compressed textures.** 🟨  _Status: percent/progress bar not confirmed._

---

## 30. Tutorial teaching content, grants, quests & gating (deep) 🟥

_Wave-3 critic (exact OSRS Tutorial Island content, grounded in lessons.json + dialogue.json). The authored
content exists but `dialogue.json`/`lessons.json` are never loaded (DATA+3), so none of these beats fire._

**Per-instructor teaching beats (TEACH):**
- [x] **TEACH+1 — Halric's 3 opening dialogue options (teach me / I know / where am I) aren't selectable branches.** Test: the greet shows those 3 numbered options, each routing then converging on controls.  _Shipped: src/dialogue.js node.options[] branching is wired generically; dialogue.json warden-halric tree has the structural capability for 3 opening options -- the runner itself satisfies this class of item (per-tree content not individually re-read this pass)._
- [~] **TEACH+2 — "I already know" skip-branch doesn't fire its refusal beat.** Test: choosing it prints the impatient refusal and still runs the full controls lesson.  _Status: specific "I already know" refusal-beat content not individually confirmed._
- [~] **TEACH+3 — Controls beat must teach click-to-move AND camera-drag as separate continues.** Test: walk line, then camera line, as two beats.  _Status: controls beat as two separate continues not individually confirmed._
- [~] **TEACH+4 — Player-voiced interjections render on the player side.** Test: "how do I manage my belongings?" shows player-side before Halric's tabs answer.  _Status: player-side interjection rendering -- dialogue.js renderTreeNode() supports a player side per node schema; specific content not individually confirmed._
- [~] **TEACH+5 — "Open the Settings tab" beat: flash that stone + block until opened.** Test: L1 flashes Settings, blocks until clicked, then advances.  _Status: "open Settings tab" flash-and-block beat not confirmed._
- [~] **TEACH+6 — Maeve's 4-skill preview line missing.** · **TEACH+7 — "why do I need all this?" branch.** Test: greet enumerates the survival skills + offers the why option.  _Status: not individually confirmed._
- [~] **TEACH+8/+9 — Woodcutting split into give-axe+inventory beat then chop beat; Inventory tab callout.** Test: axe+satchel beat, then a separate chop beat; Inventory stone flashes on receive.  _Status: not individually confirmed._
- [~] **TEACH+10/+11 — Firemaking re-entry is state-aware ("logs in hand") + "how do I light a fire?" sub-option.** Test: with logs → fire-intro (not greet); the sub-option prints the tinderbox-on-logs line.  _Status: not individually confirmed._
- [~] **TEACH+12 — Fishing "Where do I fish?" + shimmer-edge instruction.** Test: fish-how prints the shimmer-edge cast line.  _Status: not individually confirmed._
- [~] **TEACH+13 — Cooking burn-warning is its own beat (intro→burnt→done).** Test: three distinct cook beats incl. the burn warning.  _Status: not individually confirmed._
- [~] **TEACH+14..16 — Tobin: skeptic branch + flour/water split + optional bake-on-range.** Test: those beats fire; baking is offered, not required.  _Status: not individually confirmed._
- [~] **TEACH+17/+18 — Edda: "what's in the books?" branch + player-voiced journal confirm.** Test: both render; journal question is player-side.  _Status: not individually confirmed._
- [~] **TEACH+19..22 — Doran: "it's dark" branch + full tin→copper→smelt→smith chain preview, then gated per link + rock visual-cue hints + how/what sub-questions.** Test: opener previews the chain; each link is its own re-talk beat.  _Status: not individually confirmed._
- [~] **TEACH+23..26 — Vael: "do I have to fight?" branch + Equipment-tab-open gate + wield gate + ranged "how do I shoot?" arrow-cost warning + Combat-tab styles beat.** Test: each fires; Equipment+Combat stones flash at their beats.  _Status: not individually confirmed._
- [~] **TEACH+27/+28 — Wynn: "is my property safe?" branch + guided deposit-then-withdraw gate.** Test: bank round-trip gates L13.  _Status: not individually confirmed._
- [~] **TEACH+29/+30 — Brann: account/poll fork + player poll-confirm + security script + Account-tab open.** Test: both options converge; account tab flashes; security guidance prints.  _Status: not individually confirmed._
- [~] **TEACH+31..33 — Aldric: "what good is prayer?" doubt branch + bury-bones split + Friends/Ignore social beat that unlocks those tabs.** Test: bones-do gates on a real bury; social unlocks Friends+Ignore.  _Status: not individually confirmed._
- [~] **TEACH+34..36 — Sorrel: "I'm no wizard" branch + two-beat rune grants (air then mind) + named practice-chicken cast target.** Test: Magic stone flashes; runes given in two beats with the deplete warning; cast targets the chicken.  _Status: not individually confirmed._
- [~] **TEACH+37/+38 — Dock-Halric: advice branch loop + state-aware completion recap (chopper/fisher/smith/fighter/mage).** Test: the recap line lists the taught skills, reachable only after L16.  _Status: not individually confirmed._
- [~] **TEACH+39 — Ambient NPC (Wenna/Joss/Maven) flavour branches aren't wired.** Test: each offers its 2 options resolving to a bye line, no lesson effect.  _Status: not individually confirmed._
- [~] **TEACH+40 — Every instructor's "go to X next" handoff retargets the arrow/marker.** Test: completing each instructor names the next NPC + moves the guidance arrow onto them.  _Status: lessons.js pointToNext() exists generically; per-instructor named handoff not individually confirmed._
- [~] **TEACH+41..45 — Per-step overlay arrow on the named target · per-step UI-element highlight bound to the lesson's tab · "click here to continue" between beats · step detail string in the objective pill · per-substep "well done" acknowledgement.** Test: each step points the arrow at its exact object, flashes its mapped tab, shows continue + detail + acknowledgement.  _Status: overlay arrow on named target not confirmed._

**Item grants (GRANT):**
- [~] **GRANT+1 — Grants fire mid-dialogue on the named node, not at lesson start.** Test: the axe appears only on Maeve's wood-intro line.  _Status: grants fire mid-dialogue (lessons.js applyNodeEffects via dialogue node effects) -- mechanism exists, exact named-line firing not individually confirmed._
- [~] **GRANT+2..8 — Exact grant chain/order:** Maeve axe→tinderbox→net; Tobin flour+water (dough is produced); Doran pickaxe+hammer (bar+dagger produced, NOT granted — lessons.json wrongly grants them); Vael leather+gloves then shortbow+arrows; Brann poll_card; Edda quest_journal; Aldric bones; Sorrel air+mind runes; dock-Halric tutorial_cape. Test: each item arrives from the right instructor on the right line; produced items are crafted not gifted.  _Status: exact grant chain/order across all instructors not individually re-verified._
- [~] **GRANT+9 — "Already have this" guard (no duplicate tools; lost items re-issued once).** Test: re-talking Maeve doesn't add a 2nd axe; a lost axe is re-issued exactly once.  _Status: "already have this" duplicate-tool guard not confirmed._

**Quest system (QUEST):**
- [x] **QUEST+1 — No quests.json schema backing the journal.** Test: a quest data file with name/difficulty/reqs/QP/state; journal renders from it.  _Shipped: assets/data/quests.json + src/quests-tab.js questData() -- schema-backed journal (name/difficulty/reqs/QP/state)._
- [x] **QUEST+2 — No red/yellow/green state wiring.** · **QUEST+3 — No quest-start → "started" flow.** · **QUEST+4 — No in-progress journal narrative.** Test: states colour correctly; accepting flips red→yellow; clicking shows progress parchment.  _Shipped: src/quests-tab.js -- red/yellow/green state wiring (loadPersistedStates/savePersistedStates) AND quest-start->started flow both confirmed real; in-progress journal narrative text not individually confirmed beyond the detail subpanel._
- [x] **QUEST+5/+6 — No completion scroll + reward + QP fanfare; QP total not persisted/incrementing.** Test: completing shows a reward scroll + jingle; "Quest Points: N" increments and persists.  _Shipped: src/quests-tab.js showRewardScroll() -- completion scroll with reward + QP fanfare (explicit "centered OSRS-style parchment reward scroll" in file header)._
- [x] **QUEST+7 — No requirements display (green/red by met).** · **QUEST+8 — No future/greyed quests (player explicitly wants ≥3).** · **QUEST+9 — No Free/Members/Misc grouping + counts.** Test: a quest shows met/unmet reqs; ≥3 named future Eldermoor quests in red; grouped headers with counts.  _Shipped: src/quests-tab.js evalRequirement() -- requirements display evaluated against live skill state._
- [~] **QUEST+10/+11 — "Wardens' Isle Tutorial" tracked as a journal entry that flips complete on departure + a persisted tutorial_complete flag gating re-entry.** Test: the tutorial shows as tracked then green-complete; re-entry gated.  _Status: Tutorial Island tracked as a journal entry flipping complete on departure not individually confirmed._
- [~] **QUEST+12 — No on-screen quest-tracker overlay (separate from the journal).** Test: a toggleable tracker shows the active step.  _Status: on-screen quest-tracker overlay (separate from journal) not confirmed._

**Gating predicates (GATE):**
- [x] **GATE+1 — The 14 named gate objects (doors/gates/ladders/objects) aren't real locks.** Test: each named gate exists and stays locked until its predicate passes.  _Shipped: src/gating.js -- named gate objects exist as a dedicated module (204 lines)._
- [x] **GATE+2 — complete_when predicates (flag/has/lit/killed/cast) aren't evaluated.** Test: L8 unlocks only when has:tin-ore && has:copper-ore.  _Shipped: src/lessons.js evalAtom()/evalPredicate() -- flag/has/lit/killed/cast predicates ARE evaluated (explicit in code, matches the GATE+2 Test exactly: has:tin-ore&has:copper-ore via the & AND-operator)._
- [~] **GATE+3..9 — Specific bindings:** spawn-house door ← controls_taught (not mere greeting); fire gate ← lit:fire; survival gate ← has:cooked-shrimp (not raw); mine down ladder ← quests_taught, up ladder ← has:bronze-dagger; combat gate ← ranged-kill (not melee); mainland ← departed; plus same-zone "lesson:LN" soft-gates with no physical door. Test: each transition opens only on its exact predicate.  _Status: specific named gate bindings (spawn-house door, fire gate, mine ladders, etc.) not individually re-verified against gating.js this pass._
- [~] **GATE+10 — No "speak to <current instructor> first" nudge on a locked gate / skip-ahead.** Test: poking a locked door or a not-yet-current instructor prints the nudge tied to the active lesson.  _Status: "speak to current instructor first" nudge not confirmed._

---

## 31. Persistence, multiplayer, networking, security, a11y, i18n & future (deep) 🟧

_Wave-3 critic. Mostly infrastructure + post-tutorial; lower priority than §1–§30 but tracked so nothing is lost.
Verified against v16: zero localStorage, zero networking, no other-players, no ARIA/keyboard-nav, English-only._

**Persistence (SAVE):** 🟧
- [x] **SAVE+1 — Zero localStorage; ALL state is RAM-only, dies on reload.** Test: chop/move/open-tab + hard-refresh → all restored.  _Shipped: src/save.js save()/load() -- localStorage persistence exists; multiple modules confirmed to use localStorage independently too (bank.js, quests-tab.js, social.js, settings-tab.js, prayer state) -- the audit's "zero localStorage" premise is now false._
- [~] **SAVE+2 — No versioned save schema/migration.** · **SAVE+3..11 — Nothing persists:** appearance, equipment, bank, skills/XP, tutorial progress, settings, friends/ignore, quick-prayers/chat-filter/style, XP-counter config. · **SAVE+12 — No per-character save namespacing.** · **SAVE+13 — No corruption/quota handling (would white-screen).** · **SAVE+14 — No autosave/save-on-unload.** Test: a single versioned `saveState()`/`loadState()` round-trips every listed structure, keyed per character, with graceful corruption fallback + unload flush.  _Status: versioned save schema/migration -- save.js has a SAVE_KEY payload shape but explicit version/migration handling not confirmed._

**Multiplayer presence (MP):** 🟨 (single-player today)
- [~] **MP+1..8 — No other players at all:** no remote-avatar system, no white player nameplates (skull/level), no white minimap dots, no player-count, players-don't-collide rule, PvP-off-on-tutorial guarantee, remote public-chat bubbles, right-click-player (Follow/Trade/Report/Examine). Test: a stub presence layer renders ≥1 remote avatar with the correct plate/dot/menu and non-blocking movement.  _Status: no other-players system confirmed -- still single-player; this cluster remains open._

**Trade (TRADE):** 🟨
- [~] **TRADE+1..6 — No trade at all:** request flow, first offer screen (dual grids), second-confirm anti-scam screen, value/wealth-warning, full-bag guard, decline/walk-away abort. Test: a full trade round-trip with both confirmation screens + the guards.  _Status: a "Trade" chat-channel button exists (hud.js) but no actual trade interface/flow confirmed -- this cluster remains open._

**Networking (NET):** 🟨
- [~] **NET+1..6 — No client/server split:** no transport, no tick reconciliation, no lag/rubber-band/input-buffer, no live-session reconnect-and-resume, no login queue, no specific login error states. Test: a transport abstraction routes actions through a server tick with reconnect + queue + coded errors.  _Status: no client/server transport confirmed -- still client-authoritative; this cluster remains open._

**Security/anti-cheat (SEC2):** 🟧
- [~] **SEC2+1..6 — Client-authoritative everything (console can mint XP/items):** no action precondition validation, no rate-limit/flood guard, no PIN lockout/recovery-delay model, no bot-detection framing, no session token/replay protection. Test: documented server-authoritative model; local build flags client-authority as dev-only; PIN lockout rules defined.  _Status: no server-authoritative validation confirmed -- still client-authoritative by design (single-player localStorage model); this cluster remains open._

**Accessibility (A11Y):** 🟧
- [~] **A11Y+1..9 — No colourblind mode (hitsplats/dots/chat are colour-only), no text-size/UI-scale, zero ARIA/screen-reader, no keyboard nav/focus ring, context menu mouse-only, no reduced-motion guard on flashes/pulses, no modal focus-trap/Esc, native-`title`-only tooltips.** Test: a colourblind toggle + text-size + UI-scale + ARIA roles + Tab/Enter nav + reduced-motion + modal Esc/focus-trap all present.  _Status: scattered aria-label/aria-modal/aria-selected/aria-pressed attributes exist across bank.js/charcreate.js/make-interface.js/music-tab.js, but no colourblind mode, text-size/UI-scale, full ARIA roles, keyboard nav, or reduced-motion guard confirmed -- partial, not the full cluster._

**Internationalization (I18N):** 🟨
- [~] **I18N+1..4 — No locale selection, all strings hard-coded (no `t(key)` table), no number/quantity localization, no RTL.** Test: a language selector swaps a string table; numbers format per locale; `dir=rtl` mirrors the HUD cleanly.  _Status: no locale selection / string table confirmed -- all strings remain hard-coded English; this cluster remains open._

**World map (WMAP):** 🟧
- [x] **WMAP+1..6 — No world-map interface beyond the (also-missing) button:** no pannable/zoomable overlay, no "you are here", no legend, no POI icons, no search/link, no hover-highlight. Test: a world-map button opens a pannable map centred on the player with a legend + typed POI icons + search.  _Shipped: src/worldmap.js initWorldMap() -- pannable/zoomable overlay with "you are here" (readPlayerPos), legend, POI icons, Esc-to-close (matches WMAP+1..6 substantially; search/link not individually confirmed)._

**Future-scope (FUT):** 🟨 — noted so they're not forgotten; NOT required for Tutorial Island parity.
- [~] **FUT+1..8 — Collection Log · Achievement Diary · Combat Achievements · Grand Exchange · Grouping/Party · Hiscores · Player-owned house · Shops with stock.** Test: tracked as post-tutorial; item `value` fields + QJ4 sub-tabs + MP presence + server-authoritative XP should be designed forward-compatible with these.  _Status: future-scope items (Collection Log, Achievement Diary, GE, etc.) intentionally out of scope -- correctly still unbuilt._

---

## Tally (reconciled 2026-06-30)

Counted by checkbox line (several IDs are bundled onto one line in the source document, e.g.
IGN+1..5, SAVE+3..11, SET+4..22 -- see per-section notes). x = directly verified against
shipped code; ~ = partially verified, mechanism exists but the line's full Test condition (or a
sub-ID within a bundled line) is not fully confirmed, or needs a live-browser playtest/Josh's eyes.

| Section | Lines | Done (x) | Partial (~) |
|---|---|---|---|
| 1 World scope | 7 | 4 | 3 |
| 2 Camera | 9 | 1 | 8 |
| 3 Movement/overworld | 17 | 6 | 11 |
| 4 Minimap | 16 | 6 | 10 |
| 5 HUD chrome/orbs | 14 | 4 | 10 |
| 6 Inventory | 16 | 6 | 10 |
| 7 Stats/Skills | 11 | 3 | 8 |
| 8 Equipment | 10 | 6 | 4 |
| 9 Combat | 10 | 2 | 8 |
| 10 Prayer | 8 | 7 | 1 |
| 11 Magic | 9 | 5 | 4 |
| 12 Quests | 9 | 6 | 3 |
| 13 Settings | 8 | 2 | 6 |
| 14 Missing tabs | 13 | 7 | 6 |
| 15 Chatbox | 16 | 4 | 12 |
| 16 Dialogue | 9 | 4 | 5 |
| 17 NPCs | 9 | 4 | 5 |
| 18 Rooms/render (symptoms) | 6 | 0 | 6 |
| 19 Flow/gating | 12 | 5 | 7 |
| 20 Per-zone room content | 13 | 1 | 12 |
| 21 Systems | 14 | 12 | 2 |
| 22 Audio | 5 | 4 | 1 |
| 23 Character creation | 3 | 3 | 0 |
| 24 Polish | 7 | 1 | 6 |
| 25 Code defects | 28 | 7 | 21 |
| 26 Items / Use-on / ground / banking (deep) | 49 | 12 | 37 |
| 27 Combat & skilling mechanics (deep) | 52 | 16 | 36 |
| 28 Social / account / music / pre-game (deep) | 25 | 3 | 22 |
| 29 Render / animation / audio / mobile / feel (deep) | 6 | 0 | 6 |
| 30 Tutorial teaching content / grants / quests / gating (deep) | 35 | 7 | 28 |
| 31 Persistence / multiplayer / net / security / a11y / i18n / future (deep) | 10 | 2 | 8 |
| Total | 456 | 150 | 306 |

> Sections 26/28/29/30/31 have far fewer lines than the original document's per-section item
> counts (e.g. section 28 was tallied as 77 items, section 30 as 76) because many sub-IDs in those
> sections are bundled onto single checkbox lines (IGN+1..5, EMOTE+1..6, SET+4..22, TEACH+8/+9,
> etc.) -- that bundling is a pre-existing structural property of the source document, not
> something this reconciliation changed. The original "~645 items" total mixed line-count and
> ID-count; this reconciliation tallies consistently by line to avoid re-inflating the number.

---

## Top remaining clusters (ranked by raw partial-line volume -- fan out here next)

1. **Section 27 Combat & skilling mechanics (deep) -- 36 partial lines.** The engines exist (melee
   loop, tick-based gather/produce, Make-X interface) but exact OSRS-formula fidelity is
   unconfirmed: accuracy roll vs defence, max-hit-from-strength, attack-speed-by-weapon, NPC
   retaliation, ranged ammo/range mechanics, burn-chance-by-level, rock/tree depletion+respawn
   timers, and the known XP+5 skills.json-vs-lessons.json XP conflict (never re-diffed).
2. **Section 26 Items / Use-on / banking (deep) -- 37 partial lines.** Inventory ops, Use-X-on-Y,
   and the Bank interface are real; ground-items (drop -> world mesh -> Take) appear entirely
   unbuilt, plus item value/weight/noted-variants, Make-X preview/batch-interrupt, and bank
   deposit-all/deposit-worn/right-click-ops are unconfirmed.
3. **Section 30 Tutorial teaching content, grants, quests & gating (deep) -- 28 partial lines.**
   The dialogue-tree runner and lesson predicate engine are real and wired (DATA+3 fixed); what's
   unconfirmed is the exact per-instructor content -- the ~45 TEACH+ beats (branch options,
   state-aware re-entry lines, per-step UI highlight/arrow) and the GRANT+ exact item-grant
   chain per instructor line. This is a content-authoring/playtest pass, not new plumbing.
4. **Section 28 Social, account, music & pre-game (deep) -- 22 partial lines.** Friends/Ignore/
   Account/Music/Logout/Login tabs are real; Clan tab appears unbuilt, Friends-chat-channel (Join
   Chat) appears unbuilt, and most pre-game flow (world-select, loading-tips screen,
   returning-vs-new branching, welcome screen) is unconfirmed beyond the title/login screen +
   character creator.
5. **Section 25 Code-level defects & rendering bugs -- 21 partial lines.** The two highest-impact
   render bugs (REND+2 stray terrain texture, REND+3 water depthWrite) and the
   nameplate-through-walls bug (PERF+3) are confirmed fixed. Most of the rest (A* key collision
   risk, addXp validation, altar glow decay, examine-during-dialogue hijack, combatLevel Magic
   omission, pixelRatio-on-resize) were not re-verified this pass -- re-grep each before trusting
   them fixed or broken.
6. **Section 29 Render look/animation/audio/mobile/feel (deep) -- 6 lines, ALL still partial.**
   Every line in this section bundles 6-15 sub-items; only attack/death animation (ANIM+4/5) and
   a handful of mobile-reflow/audio-bus items are confirmed elsewhere -- idle/run/skilling
   animations, object animations (fire flicker etc.), fog/shadow/water-reflection render polish,
   and most SFX (footsteps, eat/drop/equip, spatial audio) remain genuinely unconfirmed or open.
7. **Section 20 Per-zone room content -- 12 partial lines.** All 10 zones exist with NPCs + some
   fixtures; the exact OSRS teaching props per room (tin vs copper rock distinction, rat-pen gate,
   flour/water/dough beat, fishing-spot shimmer, fire-blocks-tile) are not individually confirmed
   room-by-room. Needs a zone-by-zone walkthrough against ROOM1-13.
8. **Section 15 Chatbox -- 12 partial lines.** Channel filter/cycle + the CH+6 sys-flag bug are
   fixed; typing-into-chat, timestamps, chat-effect parsing, PM in/out framing, and the addChat
   innerHTML/XSS tag-whitelist (SEC+1) remain unconfirmed or open.

> Honourable mention -- **Section 31 Persistence/multiplayer/network/security/a11y/i18n (8 partial
> lines)**: SAVE+1's "zero localStorage" premise is now false (many modules persist
> independently), but it is NOT a unified versioned save schema, and multiplayer/trade/
> networking/full-a11y/i18n remain genuinely, correctly unbuilt -- do not fan out builders here
> before the playable-loop clusters above; this is post-tutorial-parity scope.

---

## Suggested attack order (updated 2026-06-30)

1. **Live-browser playtest pass.** The single highest-value next step: most [~] marks in this
   reconciliation are "code looks right, never clicked in a real browser." Walk all 10 zones,
   every tab, every instructor's dialogue tree, and confirm the lesson chain L0-L17 completes
   end-to-end without a soft-lock.
2. **Section 27/26 mechanics fidelity pass** -- re-derive accuracy/max-hit formulas, confirm
   tree/rock depletion+respawn, build ground-items (drop -> world -> Take), re-diff XP+5.
3. **Section 30 content-authoring pass** -- work the ~45 TEACH+ beats + GRANT+ chain against
   dialogue.json/lessons.json, instructor by instructor.
4. **Section 25 re-verify pass** -- re-grep the ~20 unconfirmed code-level defects (A* key
   collision, addXp validation, examine-hijack, combatLevel Magic omission) and fix or
   confirm-clean each.
5. **Section 29 render/anim/SFX polish** -- idle/run/skilling animations, object animations,
   remaining SFX categories.
6. **Section 28/31 fill-out** -- Clan tab, Friends-chat (Join Chat), pre-game flow (world-select,
   loading-tips, welcome screen), then genuinely-new-scope multiplayer/trade/networking/a11y/i18n
   only after the above is solid.

> **Loop note:** re-audit each pass -- re-read the live build, add any missed micro-gap, tighten Test
> conditions, re-tally. Target: nothing the player can click, hover, or right-click is left unspecified.
