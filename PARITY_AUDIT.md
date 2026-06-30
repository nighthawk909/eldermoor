# PARITY_AUDIT.md — Eldermoor vs OSRS Tutorial Island

> **The nitty-gritty punch-list.** Where `ROADMAP.md` tracks *phases* and `ASSET_MANIFEST.md` tracks
> *3D assets*, this file tracks every **individual broken or missing micro-interaction** the player can
> see, click, hover, or right-click — at the granularity of a single tooltip, a single menu option, a
> single key press, a single shader bug. No stone unturned. Each item is a **test**: it passes only
> when the behaviour matches OSRS (or our original equivalent at OSRS quality).
>
> _Created 2026-06-29. Audit target: live client `eldermoor_client.html` (v15)._
> _Build method: 1 authored pass + 4 parallel deep-dive critics (UI tabs · minimap/camera/chat ·
> room-by-room content · code-grounded defect review). Re-audit each loop; never delete a failing item._

## How to read an item

```
[ ] ID — one-line title
    Now:   what the current build actually does (grounded in the v15 code)
    OSRS:  what OSRS Tutorial Island (or live OSRS it inherits from) does
    Test:  the concrete pass condition — do this, observe that
```

**Status:** `[ ]` not started · `[~]` partial · `[x]` parity reached · `[!]` regression/broken.
**Severity:** 🟥 blocker (breaks the OSRS illusion on sight) · 🟧 major · 🟨 minor/polish.
IDs with a `+` (e.g. `INV+1`) came from the deep-dive critic pass and are additive to the base IDs.

---

## 0. Executive summary

The current build is a **single small circular grounds with one chapel + 4 NPCs + an altar**, wearing a
**cosmetic HUD shell** whose tabs mostly render static placeholder strings. Almost nothing the HUD shows
is *interactive*: the inventory can't wield/drop/right-click, skills can't be clicked open, equipment is
decorative, prayer/magic/quests/settings are stub text, and the chat channel buttons are dead. The
overworld has **no keyboard camera**, **no hover affordance**, and **only NPCs + the altar are clickable**
— trees, rocks, bushes, scenery, walls have no examine and no right-click. The renderer has concrete
bugs that produce the "inside/outside texture glitch" (nameplates draw through walls, water punches holes
in the floor, terrain multiplies a stray texture). Measured against the full OSRS Tutorial Island, the
build is **one room of ~ten, with HUD chrome but no HUD function.**

**Running total: ~500 itemised gaps** (see § Tally) after two audit waves (1 authored pass + 8 parallel
OSRS-expert critics across the two waves). Sections 1–25 are wave 1; §26–§29 are the wave-2 deep dives
(items/banking, combat/skilling mechanics, social/account/pre-game, render/animation/audio/mobile/feel).
Attack order is at the bottom.

---

## 1. World scope & geography 🟥

- [ ] **W1 — Island is one small circle, not Tutorial Island.** 🟥
    Now: spawn in a small fenced chapel grounds; south gate → short forest + one pond, then sea.
    OSRS: a multi-zone island — spawn house, survival area, cook's house, quest house, mine, combat ring,
    bank/poll, chapel, magic area, departure dock — linked by paths/gates.
    Test: walk the island and pass through ≥8 distinct themed zones via gated doors.
- [ ] **W2 — Only ONE building exists (the chapel).** 🟥
    OSRS: ~6–7 enclosed buildings + 1 underground room. Test: enter ≥6 dressed interiors.
- [ ] **W3 — No island silhouette / coastline.** 🟧
    Now: rectangular `BOUND` + flat sea. Test: minimap shows a non-circular landmass with carved coast.
- [ ] **W4 — No zone labels / "entering area" feedback.** 🟨
    Test: crossing a zone boundary updates an area label (and later music).
- [ ] **W5 — World doesn't feel "massive / moldable by data" yet.** 🟧
    Now: manifest system exists but only one tiny manifest authored. Test: ≥8 zones authored purely from
    `world.manifest.json` + colliders, all editable in `editor.html`.
- [ ] **W6 — No spawn/starting house (room 0).** 🟥
    Now: spawn is the open chapel grounds. OSRS: you spawn INSIDE an enclosed starting house with the
    Guide and one exit door. Test: load spawns the player in a sealed first room, one instructor, one gated door.
- [ ] **W7 — No underground layer / camera handling for the mine.** 🟧
    Now: single ground plane. OSRS: the mine is a separate sealed underground cell via ladder (no surface
    bleed). Test: descending the ladder loads a sealed underground room.

---

## 2. Camera controls 🟥

- [ ] **CAM1 — No keyboard camera (arrow keys / WASD).** 🟥
    Now: zero `keydown` listeners; camera moves only via pointer drag + pinch/wheel. OSRS uses arrow keys to
    rotate/pitch; Josh wants arrow AND WASD camera. Test: arrow keys + WASD rotate/pitch at a steady rate.
- [ ] **CAM2 — No middle-mouse-drag rotate.** 🟨 OSRS desktop standard. Test: MMB-drag orbits.
- [ ] **CAM3 — Zoom range shallow / no near or overhead extreme.** 🟨
    Now: `clampR` 5–22, `phi` 0.30–1.15. Test: zoom reaches close over-shoulder + high tactical; pitch matches OSRS.
- [ ] **CAM4 — Camera clips into walls/terrain.** 🟨 Test: orbiting against a wall never shows inside geometry/void.
- [ ] **CAM5 — No camera-reset / compass-click-to-north.** 🟨 Test: a compass control snaps yaw north on click.
- [ ] **CAM+1 — Drag direction has no invert option / unconfirmed vs OSRS convention.** 🟨
    Now: `phi -= dy*0.005`. Test: drag directions match OSRS MMB convention and/or are invertible in settings.
- [ ] **CAM+2 — Pinch-zoom multiplies per-move event, uncapped (jitter/overshoot).** 🟨
    Now: `sph.r *= pinch/d` every move, no smoothing. Test: a fast pinch zooms smoothly without snapping.
- [ ] **CAM+3 — `camT` follow lerp is per-frame (0.15), so follow speed scales with FPS.** 🟧
    Now: `camT.lerp(target, 0.15)` once per rendered frame → ~2.4× faster at 144fps vs 60fps. Test: follow
    speed identical at 60 and 144fps (derive the factor from `dt`).
- [ ] **CAM+4 — Zoom-to-cursor / pivot-pan absent; behaviour undocumented.** 🟨
    Now: zoom is player-centric only (parity OK) but the help text never states the zoom range. Test: zoom
    behaviour documented; help text states the range.

---

## 3. Movement & overworld interaction 🟥

- [ ] **MOV1 — Movement is click-to-move only (this is correct OSRS parity).** 🟨
    Decision: keep click-to-move; do NOT add WASD *walking*. WASD/arrows = camera, not movement. Test:
    documented that WASD = camera; click-to-move stays the movement model.
- [ ] **OW1 — Trees not interactable (no click/right-click/examine).** 🟥
    Now: `place()` adds mesh + collider only; trees aren't in `clickTargets`, have no `userData`/examine/menu.
    OSRS: right-click tree → Chop down / Examine. Test: right-click a tree → "Chop down" + "Examine" + "Walk here".
- [ ] **OW2 — Rocks not interactable.** 🟥 OSRS: Mine / Examine. Test: right-click a rock → "Mine" + "Examine".
- [ ] **OW3 — Bushes / scatter props not interactable.** 🟧 Test: right-click a bush → "Examine".
- [ ] **OW4 — No "Examine" on ANY scenery (walls, fences, gate, pond, banners, pews, windows).** 🟥
    Now: only the 4 NPCs + altar carry examine. Test: right-click ≥10 scenery objects, each has unique Examine text.
- [ ] **OW5 — Left-click has no context-correct default verb beyond Walk/Talk/Pray.** 🟧
    Test: left-clicking an interactable does its primary action (Chop/Mine/Open/Climb) without a menu.
- [ ] **OW6 — No "red X / can't reach" failure feedback.** 🟨 Test: clicking an unreachable tile → red X + chat line.
- [ ] **OW7 — Click marker is a 2-colour ring, not the OSRS animated cross.** 🟨 Test: walk marker is the OSRS X cross.
- [ ] **OW8 — Doors don't open; no door interaction.** 🟧 Test: right-click a door → "Open"; it swings and lets you through.
- [ ] **OW+1 — Hover does NOTHING: no cursor change, no top-left action tooltip, no mouse-over highlight.** 🟥
    Now: no `pointermove` hover-pick exists; picking only happens on tap/right-click; cursor never changes.
    OSRS: moving the cursor shows the top-left action+target ("Talk-to Brother Aldric") and highlights the
    model. Test: hovering an NPC shows a top-left action label + highlights it; hovering ground shows "Walk here".
- [ ] **OW+2 — Right-click menu's first option isn't typed as the left-click default.** 🟧
    Now: rows are styled identically; no "this is your left-click" emphasis. OSRS: the top option IS the
    left-click action; Cancel is red and always last. Test: menu's first row == left-click default; Cancel red/last.
- [ ] **OW+3 — Menu verb/target colouring is reversed vs OSRS.** 🟧
    Now: CSS colours the VERB gold (`.o`) and the name plain. OSRS: verb is white, target name is the coloured
    token. Test: "Talk-to" white, "Brother Aldric" coloured.
- [ ] **OW+4 — Left-click priority is hard NPC>object>ground, not OSRS op-priority/nearest.** 🟧
    Now: `worldClick` always prefers NPC, then object, then ground; `NPCS.find` returns array order not nearest.
    Test: a high-priority object overlapping an NPC does the object action; nearest entity wins ties.
- [ ] **OW+5 — "Walk here" is offered on blocked/unreachable tiles with no feedback.** 🟨
    Now: `openMenu` pushes "Walk here" for any in-bounds plane hit. Test: Walk-here on a blocked tile → red-X / can't-reach.
- [ ] **OW+6 — Examine prints to the DIALOGUE box (Continue button), not chat.** 🟧
    Now: `examine()` calls `sayLines('Examine', …)` opening the dialogue panel. OSRS: Examine writes ONE line
    to the game chat, no dialogue box. Test: Examine writes one chat line and does not open the Continue panel.
- [ ] **OW+7 — Long-press race: a borderline release can both open the menu and walk.** 🟨
    Now: `holdTimer` 450ms vs `dragged`/`consumed` flags race at the threshold. Test: long-press + release never also walks.
- [ ] **OW+8 — No execution path for world-object verbs (Open/Chop/Mine).** 🟧
    Now: `arrive()` only handles `t.lines` (talk) and `t.kind==='altar'`; any other `obj.verb` shown in the menu
    silently no-ops on arrival. Test: an object with verb "Open" actually opens on arrival.

---

## 4. Minimap 🟥

- [ ] **MM1 — Cannot click the minimap to walk.** 🟥
    Now: `#emmap` canvas has no event listener. Test: clicking a minimap point paths the player there.
- [ ] **MM2 — Cannot zoom the minimap.** 🟥 Now: fixed `sc=1.1`. Test: scroll / +﹣ over the minimap changes its zoom.
- [ ] **MM3 — Minimap shows no terrain / world shape.** 🟥
    Now: solid green bg + dots. Test: minimap shows the path, pond, chapel footprint, coastline.
- [ ] **MM4 — Compass 'N' is static text, doesn't rotate, isn't clickable.** 🟧 Test: compass rotates with camera; click = face north.
- [ ] **MM5 — Dots don't rotate/translate with camera orientation.** 🟧 Test: dots stay correct relative to facing as the camera turns.
- [ ] **MM6 — No minimap orbs (HP/Prayer/Run/Special).** 🟥 Test: four orbs frame the minimap; Run toggles run + drains.
- [ ] **MM7 — No world-map button / full world map.** 🟧 Test: a map button opens a pannable/zoomable island map.
- [ ] **MM8 — No XP-counter / wrench / advisor minimap buttons.** 🟨 Test: an XP-counter toggle exists in the minimap cluster.
- [ ] **MM9 — No next-step / quest marker blip.** 🟧 Test: the current objective shows as a distinct flashing minimap marker.
- [ ] **MM+1 — Player dot isn't visually distinct (size/brightness) from NPC dots.** 🟨
    Now: white dot r3.2 vs yellow NPC dots; centred (good). Test: player dot is white, centred, and larger/brighter.
- [ ] **MM+2 — All blips are one yellow; no per-type colour code.** 🟧
    Now: every NPC passed as `c:'#ffd98a'`. OSRS: yellow=NPC, white=player, red=attackable, cyan=ground item.
    Test: an attackable NPC = red dot, a ground item = cyan, a friendly NPC = yellow, simultaneously.
- [ ] **MM+3 — Off-range dots aren't clamped to the rim.** 🟧
    Now: dots drawn at true offset, only CSS `overflow:hidden` clips them. OSRS: clamps distant blips to the inner
    rim (direction preserved). Test: a far NPC renders pinned to the rim in its correct direction.
- [ ] **MM+4 — `ang` heading param threaded through `setPlayer`/`drawMap` but unused (dead code).** 🟨
    Test: either the compass/map rotates by `ang` or the param is removed — no silently-ignored heading.
- [ ] **MM+5 — No ornate minimap frame/vignette.** 🟨 Test: the surround reads as the OSRS minimap frame, not a flat brown ring.
- [ ] **MM+6 — No hover/right-click on the minimap ("Walk here").** 🟧 Test: right-click the minimap → at least "Walk here".
- [ ] **MM+7 — No yellow destination flag on a long click-to-walk.** 🟧
    Now: `walkTo` only shows the fading in-world ring. OSRS: a yellow flag stands at the destination until arrival.
    Test: click a far tile → a flag stands there and clears on arrival.

---

## 5. HUD chrome & orbs (outside the tabs) 🟥

- [ ] **HUD1 — No HP/Prayer/Run/Special orbs.** 🟥 (see MM6) Test: four status orbs exist and update from real stats.
- [ ] **HUD2 — No run toggle / run energy.** 🟥 Now: single `SPEED=3.2`. Test: toggling run ~doubles speed and drains the orb.
- [ ] **HUD3 — No "Tutorial Island Progress" indicator.** 🟧 Test: an OSRS-style progress element reflects the current lesson.
- [ ] **HUD4 — No floating yellow guidance arrow over the next interactable.** 🟥 Test: a yellow arrow hovers over the objective target.
- [ ] **HUD5 — XP drops are barebones (one colour, no icon, no totals, overlap).** 🟨
    Now: a green "+N Skill" rises and fades; simultaneous drops overlap. Test: XP drop shows skill icon + amount, stacks, feeds an XP counter.
- [ ] **HUD6 — Level-up has no interface flash / popup / jingle.** 🟨 Test: leveling shows the OSRS level-up popup (and later jingle).
- [ ] **HUD+1 — No XP counter near the minimap; drops don't stack or show icons.** 🟨
    Test: an XP counter accumulates; multiple drops stack without overlap and show skill icons.
- [ ] **HUD+2 — No logout control in the HUD chrome (not just the missing tab).** 🟨
    Test: a logout control exists in the chrome and returns to a login/title stub.
- [ ] **HUD+3 — Objective pill (`#emobj`) can overlap the minimap (`#emmap`) on narrow screens.** 🟨
    Now: centred `top:8px` max 62vw vs `right:10px top:10px`. Test: at 380px width they don't overlap.
- [ ] **HUD+4 — Panel/tabs stack can exceed viewport on short landscape (structural cause of CB1).** 🟧
    Now: `#empanel bottom:92px max-height:52vh` directly above `#emtabs bottom:8px`. Test: panel never overlaps the tab row at any aspect.
- [ ] **HUD+5 — Orbs, when added, must follow OSRS order/placement (stacked left of the minimap, each right-clickable).** 🟧
    Test: orbs render in OSRS order (HP/Prayer/Run/Spec) left of the minimap, each with a right-click menu.
- [ ] **HUD+6 — Active-tab styling is a gold border, not the OSRS red-stone "pressed" look.** 🟨
    Now: `.on{border-color:#e7c64f;background:#5a4422}`. Test: the active tab uses the red-stone pressed look.
- [ ] **HUD+7 — No keyboard F-key/Esc tab control.** 🟨 (see TB+3/TB+4) Test: a hotkey opens a tab; Esc closes the open panel.
- [ ] **HUD+8 — Objective pill is set once and never flashes/updates.** 🟨
    Now: `setObjective` called once at init. Test: completing a step rewrites the objective with a brief flash.

---

## 6. Inventory tab 🟥

28-slot grid renders; **clicking a slot only prints "Use <item>." to chat.** No real item interaction.

- [ ] **INV1 — Cannot wield/wear items.** 🟥 Test: click a bronze axe → it equips (leaves bag, fills weapon slot + appears on player).
- [ ] **INV2 — No right-click item menu.** 🟥 OSRS: Use/Wield/Drop/Examine (+Eat/Bury/Read…). Test: right-click → ≥ Use, Wield/Eat/Bury, Drop, Examine.
- [ ] **INV3 — Cannot drop items.** 🟧 Test: Drop removes the item (ideally to a ground item).
- [ ] **INV4 — No "Use X on Y" combination.** 🟧 OSRS: tinderbox→logs, flour→water. Test: Use tinderbox → Use on logs → fire action.
- [ ] **INV5 — No item tooltip / hover name.** 🟨 Test: hovering a slot shows the item name + default verb.
- [ ] **INV6 — Cannot drag-rearrange.** 🟨 Test: drag an item to another slot → order updates and persists.
- [ ] **INV7 — Stack counts: only >1 shown, single colour, no K/M abbreviation.** 🟨 Test: 100,000+ shows "100K" in the right colour.
- [ ] **INV8 — No free-slot indicator / full-bag message.** 🟨 Test: receiving into a full bag prints "Your inventory is too full."
- [ ] **INV9 — Starting kit is placeholder, not lesson-driven.** 🟨 Now: grants axe+tinderbox+25 coins on load. Test: bag starts empty; items arrive via lesson grants.
- [ ] **INV10 — Item id case mismatch across data (kebab vs snake) — latent.** 🟧
    Now: `items.json` `bronze-axe` vs `lessons.json` `bronze_axe`; lessons.json isn't loaded yet so it's dormant. Test: one normalised id resolves across items/lessons/dialogue.
- [ ] **INV+1 — No item-specific Examine text (items.json examine never read).** 🟧
    Now: click prints "<verb> <name>." only. OSRS: Examine (last option) prints the item's unique line. Test: Examine a bronze axe → its distinct string.
- [ ] **INV+2 — No op-1 default-verb-per-item (left-click always does op[0]).** 🟧
    OSRS: left-click = op-1, which differs per item (Wield/Eat/Drink/Read). Test: left-click food Eats, weapon Wields — no menu.
- [ ] **INV+3 — No count colour tiers (white/green/yellow at 100k/10M).** 🟨 Test: 5=white, 100k=yellow, 10M=green.
- [ ] **INV+4 — No shift-click-drop / valuable-drop warning.** 🟨 Test: shift-click drops instantly when enabled; a flagged item asks to confirm.
- [ ] **INV+5 — Inventory header has no live free-slot count.** 🟨 Test: panel shows used/free (e.g. "3/28") updating on give/drop.
- [ ] **INV+6 — Stackables/coins don't show amount-tier sprites; non-stackables can't partial-fill.** 🟨 Test: coins stay one slot; coin icon tier reflects amount.

---

## 7. Stats / Skills tab 🟥

23-skill grid renders with levels; **the native `title` attribute is the only "tooltip"; no click does anything.**

- [ ] **SK1 — Clicking a skill does nothing (no skill guide).** 🟥 Test: click Woodcutting → a skill-guide panel of level unlocks; re-click/elsewhere closes.
- [ ] **SK2 — No hover tooltip with current/next-level/remaining XP.** 🟧 Now: `title="Name: <xp> xp"`. Test: hover shows current, next threshold, remaining in a custom box.
- [ ] **SK3 — Grid order isn't the OSRS layout.** 🟨 Test: grid matches OSRS skill positions exactly.
- [ ] **SK4 — Total level shown; no total XP / combat level here.** 🟨 Test: total level correct (32 start) + total XP available.
- [ ] **SK5 — No level-up → skill-guide reveal.** 🟨 Test: leveling surfaces the new unlock in the guide.
- [ ] **SK6 — No per-skill progress visual.** 🟨 Test: a small %-to-next or bar renders per skill (optional, OSRS-faithful).
- [ ] **SK+1 — Tooltip uses native `title` (delayed, unstyled), not an instant OSRS box.** 🟨 Test: hovering shows a custom-styled, no-delay tooltip.
- [ ] **SK+2 — Hitpoints-starts-at-10 not framed; grid order from JSON.** 🟨 Test: HP reads 10 at fresh start in its fixed cell; total accounts for it.
- [ ] **SK+3 — No level-up tab-button flash.** 🟨 Test: leveling briefly flashes the Stats tab button.
- [ ] **SK+4 — Large XP never abbreviated/comma-grouped.** 🟨 Test: a multi-million skill shows a grouped/abbreviated value.
- [ ] **SK+5 — No right-click skill menu ("View guide").** 🟨 Test: right-click a skill → at least "View <skill> guide".

---

## 8. Equipment tab 🟥

Renders 11 labelled empty boxes; purely decorative.

- [ ] **EQ1 — Slots are non-functional placeholders.** 🟥 Test: wielding an axe shows the axe icon in the weapon slot.
- [ ] **EQ2 — Cannot click a worn slot to remove.** 🟧 Test: clicking the weapon slot un-equips back to inventory.
- [ ] **EQ3 — No "Equipment Stats" / "Items Kept on Death" buttons.** 🟨 Test: an Equipment-Stats button opens a worn-bonus panel.
- [ ] **EQ4 — Worn gear doesn't affect the player model.** 🟧 Test: equipping a weapon makes it appear in the player's hand.
- [ ] **EQ5 — Worn gear doesn't affect combat stats.** 🟧 Test: equipping a weapon changes the stats totals + outcomes.
- [ ] **EQ+1 — Layout is a flat 3-col grid, not the OSRS humanoid cross.** 🟧
    OSRS: head top-centre; cape/neck/ammo; weapon-body-shield; legs; hands-feet-ring. Test: slots in the OSRS body arrangement.
- [ ] **EQ+2 — No "Items Kept on Death" button.** 🟨 Test: a Kept-on-Death control opens a panel of protected items.
- [ ] **EQ+3 — No Equipment-Stats panel with the bonus columns.** 🟨
    OSRS: Attack (Stab/Slash/Crush/Magic/Ranged), Defence (same 5), Other (Str/Ranged Str/Magic% /Prayer) + speed. Test: that panel sums worn gear.
- [ ] **EQ+4 — Empty slots show the slot NAME text instead of a ghost slot-icon.** 🟨 Test: empty slots show a silhouette icon, not "head"/"cape" text.
- [ ] **EQ+5 — Worn slot has no hover / "Remove <item>" affordance.** 🟨 Test: hovering a filled slot shows "Remove <item>".

---

## 9. Combat tab 🟥

Shows combat level + "Weapon: Unarmed" + 4 style buttons that set a var + print to chat. Reported **cut off** and unexplained.

- [ ] **CB1 — Panel is cut off / clipped on screen.** 🟥
    Now: `#empanel right:8 bottom:92 max-height:52vh overflow:auto` overlaps the tabs on short/zoomed viewports. Test: full Combat panel visible on phone + desktop without clipping.
- [ ] **CB2 — Attack styles have no description / per-style XP info.** 🟥
    OSRS: Accurate→Attack, Aggressive→Strength, Defensive→Defence, Controlled→all three, each with an icon. Test: each row names the trained skill(s) + shows its icon.
- [ ] **CB3 — Styles aren't weapon-aware ("Unarmed" hard-coded).** 🟧 Test: a bow swaps to ranged styles; a staff shows spell/defensive options.
- [ ] **CB4 — No Auto-Retaliate toggle.** 🟧 Test: an Auto-Retaliate toggle governs auto-fighting-back.
- [ ] **CB5 — No Special Attack bar.** 🟨 Test: a special-attack control renders (greyed when no spec weapon).
- [ ] **CB6 — Combat-level math unverified vs OSRS; only shown here.** 🟨 Test: combat level matches the OSRS formula (starts 3); shown by name/examine too.
- [ ] **CB+1 — Header doesn't recompute on gear/stat change; no "next level" hint.** 🟨 Test: changing a combat stat re-renders the header live.
- [ ] **CB+2 — Style buttons are plain text with no icons; default/persistence wrong.** 🟧 Test: each row shows its style icon; the chosen style persists per weapon type.
- [ ] **CB+3 — Weapon label is hard-coded "Weapon: Unarmed".** 🟧 Test: wielding a weapon updates the label to that weapon's name.
- [ ] **CB+4 — Special-attack bar isn't always-present chrome.** 🟨 OSRS draws it always (greyed at 0%). Test: the spec bar always renders, greyed when no spec.

---

## 10. Prayer tab 🟥

Renders one muted string: "Locked until you train Prayer at the altar." — yet the altar DOES grant Prayer XP. Contradictory + empty.

- [ ] **PR1 — Shows no prayers at all.** 🟥 OSRS: a grid (Thick Skin, Burst of Strength…), greyed by level. Test: low prayers visible, higher greyed with reqs.
- [ ] **PR2 — Contradiction: altar grants Prayer XP but tab says "locked".** 🟧 Test: after praying, the tab reflects the Prayer level + unlocked prayers.
- [ ] **PR3 — No Prayer points / no activation.** 🟥 Test: a Prayer orb shows points; clicking an unlocked prayer toggles it and drains points.
- [ ] **PR4 — Bury-bones mechanic absent.** 🟧 OSRS: bury bones for first Prayer XP (Brother Brace). Test: a bones item with "Bury" grants Prayer XP.
- [ ] **PR5 — No prayer tooltips (effect/drain/level).** 🟨 Test: hovering a prayer shows its level req + effect.
- [ ] **PR+1 — Panel renders zero prayer cells even at unlocked level (hard-coded text).** 🟥 Test: at Prayer ≥1, Thick Skin shows as enabled, not a locked sentence.
- [ ] **PR+2 — No Quick-Prayers setup / orb toggle.** 🟨 Test: a quick-prayers configure control + a quick-prayer toggle on the orb.
- [ ] **PR+3 — No active-prayer highlighted state.** 🟨 Test: toggling a prayer shows a lit "active" border.

---

## 11. Magic tab 🟥

Renders one muted string. No spellbook.

- [ ] **MG1 — No spellbook grid.** 🟥 OSRS: a grid (Wind Strike, Confuse, teleports…), greyed by level/runes. Test: the grid renders; Wind Strike visible at L1.
- [ ] **MG2 — No rune requirements.** 🟥 Test: hovering Wind Strike shows "1 Air + 1 Mind"; castable only with those runes.
- [ ] **MG3 — Cannot cast a spell.** 🟥 OSRS: Wind Strike on the practice chicken. Test: with runes, Wind Strike → target → projectile + hit + Magic XP.
- [ ] **MG4 — No spell filter buttons.** 🟨 Test: filter toggles hide/show spell categories.
- [ ] **MG5 — No spellbook switching (deferred).** 🟨 Test: standard book present; architecture allows others.
- [ ] **MG+1 — No grid scaffold; just an instruction sentence (no fixed RS layout).** 🟥 Test: the spell grid renders in standard-book order, Wind Strike top-left.
- [ ] **MG+2 — No autocast affordance.** 🟨 Test: combat spells expose an autocast-select.
- [ ] **MG+3 — No per-spell hover (level req + rune rows).** 🟨 Test: hovering Wind Strike shows "Level 1" + rune icons.
- [ ] **MG+4 — No greyed-vs-castable visual state.** 🟨 Test: above-level spell renders darkened; Wind Strike bright at L1.

---

## 12. Quest tab 🟥

Renders "Tutorial Island — in progress." Nothing else.

- [ ] **QJ1 — No quest list at all.** 🟥 OSRS: a scrollable journal, colour-coded (red/yellow/green), grouped, with QP total. Test: list + states + QP counter.
- [ ] **QJ2 — No future/greyed quests shown.** 🟥 OSRS lists all quests from the start. Test: ≥1 future quest in red "not started" with a click-through.
- [ ] **QJ3 — Clicking a quest does nothing.** 🟧 Test: clicking a quest opens its detail subpanel.
- [ ] **QJ4 — No Quest Points total / minigame/diary sub-tabs.** 🟨 Test: a QP total renders; sub-tabs architected.
- [ ] **QJ5 — Tutorial Island itself isn't a tracked quest-like list.** 🟧 Test: the tutorial steps list with done/active states.
- [ ] **QJ+1 — Header lacks the "Quest Point: N" counter.** 🟨 Test: the journal header shows a QP total.
- [ ] **QJ+2 — No Free/Members/Misc section dividers.** 🟨 Test: the journal shows at least Free/Members section headers.
- [ ] **QJ+3 — No red/yellow/green state colouring wired to data.** 🟧 Test: at least one quest in each of red/yellow/green by state.
- [ ] **QJ+4 — No scrolling list affordance.** 🟨 Test: a populated quest list scrolls within the journal frame.

---

## 13. Settings tab 🟥

Renders "Audio, graphics & controls — coming soon." Not built.

- [ ] **ST1 — No audio settings (master/music/SFX/area + mute).** 🟥 Test: sliders/toggles for music + SFX actually change volume.
- [ ] **ST2 — No graphics settings (brightness/draw-distance/shadows/AA).** 🟧 Test: a brightness control + ≥2 quality toggles change the render.
- [ ] **ST3 — No control settings (camera mode/zoom/keys/mouse).** 🟧 Test: a control panel exposes camera keys + zoom + drop-mode toggles.
- [ ] **ST4 — No UI-scale/transparency/orb-visibility toggles.** 🟨 Test: a UI-scale control resizes the HUD.
- [ ] **ST5 — Settings don't persist.** 🟧 Test: changed settings survive a reload (localStorage).
- [ ] **ST+1 — No sub-tab row (Display/Audio/Controls categories).** 🟧 Test: the Settings panel has a category sub-tab row switching sections.
- [ ] **ST+2 — No two-mouse-button / shift-click-drop / chat-effects toggles.** 🟨 Test: those toggles exist and change behaviour.
- [ ] **ST+3 — Brightness/zoom not shown as sliders with a numeric readout.** 🟨 Test: the control shows its value and updates the render.

---

## 14. Missing tabs entirely 🟥

8 tabs exist; OSRS has more.

- [ ] **TB1 — No Friends tab.** 🟧 Test: a Friends tab with add/remove/online status.
- [ ] **TB2 — No Ignore tab.** 🟨 Test: an Ignore tab with add/remove.
- [ ] **TB3 — No Account-Management tab.** 🟧 (Account Guide teaches this.) Test: an Account tab (Eldermoor-original framing).
- [ ] **TB4 — No Emotes tab.** 🟧 Test: an Emotes tab with ≥4 playable emotes.
- [ ] **TB5 — No Music player tab.** 🟨 Test: a Music tab listing tracks; clicking plays one.
- [ ] **TB6 — No Logout tab/button.** 🟨 Test: a Logout control returns to a title/login stub.
- [ ] **TB7 — Cluster is a single 8-grid, not the OSRS two-row 13-icon layout.** 🟨 Test: matches OSRS two-row layout with all parity tabs.
- [ ] **TB+1 — Re-clicking the active tab CLOSES the panel (non-OSRS).** 🟧
    OSRS never blanks the side panel. Test: re-clicking the active tab keeps a panel visible; the stone stays lit.
- [ ] **TB+2 — Tabs use OS emoji, not bespoke stone-tab sprites.** 🟨 Test: tab icons are consistent sprites, not font-emoji that vary by OS.
- [ ] **TB+3 — No F-key hotkey tab switching.** 🟨 Test: a function key switches to its tab.
- [ ] **TB+4 — No "Esc closes interface".** 🟨 Test: Esc with a panel open closes/deselects it.
- [ ] **TB+5 — Switching tabs plays no UI click and doesn't manage focus.** 🟨 Test: switching plays a UI click (AUD4) + instantly swaps content.
- [ ] **TB+6 — Panel/tabs/minimap aren't one docked column; panel can overlap chat on small screens.** 🟧
    Now: `#empanel`/`#emtabs` are independent fixed boxes. Test: they read as one docked right column; panel never overlaps chat.

---

## 15. Chatbox 🟥

A 150px log + 6 channel buttons (All/Game/Public/Private/Clan/Trade) with **no click handlers** — "chat tabs do nothing."

- [ ] **CH1 — Channel buttons are dead (no filter, no active state).** 🟥 Test: clicking "Game" shows only game messages + highlights; "All" restores everything.
- [ ] **CH2 — Messages aren't categorised by channel.** 🟧 Now: `addChat` appends undifferentiated lines. Test: system/game/NPC lines tagged so filters work.
- [ ] **CH3 — Cannot type into chat.** 🟧 Test: Enter focuses an input; typed text appears as a public message.
- [ ] **CH4 — No timestamps / scroll memory / continue framing.** 🟨 Test: optional timestamps; the box never jumps unexpectedly.
- [ ] **CH5 — Chat skin doesn't match OSRS (parchment, scroll arrows).** 🟨 Test: the chatbox reads as the OSRS chat frame.
- [ ] **CH6 — No report/abuse, no chat-effect parsing.** 🟨 Test: basic chat-effect parsing + a report stub.
- [ ] **CH7 — `addChat` interpolates raw HTML (XSS/format risk).** 🟨 (see SEC+1) Test: a `<b>` from a non-system source renders literally.
- [ ] **CH+1 — No per-channel right-click On/Filtered/Off/Hide cycle.** 🟧 Test: right-click "Public" cycles On→Filtered→Off→Hide and filters the log.
- [ ] **CH+2 — Channel buttons don't use OSRS per-channel colours; active not shown.** 🟨 Test: each button in its signature colour; active visibly selected.
- [ ] **CH+3 — No "Click here to continue" overflow/new-message prompt.** 🟨 Test: the prompt appears under OSRS's conditions.
- [ ] **CH+4 — No Game filter (spam vs important).** 🟨 Test: Game→Filtered hides routine skill spam but keeps level-ups.
- [ ] **CH+5 — No private-message in/out framing/colours.** 🟨 Test: outgoing "To <name>:", incoming "From <name>:" in the PM colour.
- [ ] **CH+6 — `.sys` class defined but the `sys` flag passed to `addChat` is IGNORED.** 🟧
    Now: many callers pass a 3rd `true` arg but `addChat(text, who)` only takes two → `.sys` never applied. Test: system lines render in the system colour.
- [ ] **CH+7 — No split-chat (mobile) overlay mode.** 🟨 Test: a split-chat toggle shows fading overlay lines.
- [ ] **CH+8 — No skinned scroll arrows/thumb (relies on native scrollbar).** 🟨 Test: OSRS-style scroll arrows replace the native bar.
- [ ] **CH+9 — Hard 60-line cap discards scrollback.** 🟨 Test: >60 lines retained and scrollable.

---

## 16. Dialogue system 🟧

Flat line queue + single "Continue" button. The branching trees in `dialogue.json` are **not wired** (and never even fetched — see DATA+3).

- [ ] **DLG1 — Flat line list, not a branching tree.** 🟥 Test: an instructor offers choice options that branch.
- [ ] **DLG2 — No speaker/player portrait.** 🟧 Test: the dialogue box shows the speaking head on the correct side.
- [ ] **DLG3 — No "click/space to continue" + no ▼ arrow.** 🟨 Test: space and click both advance; a continue arrow renders.
- [ ] **DLG4 — No OSRS chat-interface skin.** 🟨 Test: the dialogue frame matches the OSRS parchment skin.
- [ ] **DLG5 — No numbered option list (1–5 keys).** 🟧 Test: options render numbered; 1–5 select.
- [ ] **DLG6 — Dialogue doesn't drive lesson progress.** 🟥 Test: completing an instructor's dialogue updates the objective + arrow to the next step.
- [ ] **DLG7 — No "experienced player, skip tutorial" branch.** 🟨 Test: the Guide offers a skip option jumping to L17.
- [ ] **DLG8 — Instructor lines don't vary by inventory/skill state.** 🟧 Now: same lines every talk. Test: the Survival Expert says something different before vs after chopping.
- [ ] **DLG9 — No NPC-initiated auto-talk on zone entry.** 🟨 Test: entering the cook's house auto-starts the Master Chef's intro once.

---

## 17. NPCs 🟧

4 NPCs (monk + 3 wanderers). Tappable with Talk-to/Examine. Good bones; thin content.

- [ ] **NPC1 — Only 4 NPCs; the instructor roster is absent.** 🟥 Test: all ~10 instructors modelled, placed, named, talkable.
- [ ] **NPC2 — No overhead speech bubbles.** 🟧 Test: an NPC line shows an overhead bubble too.
- [ ] **NPC3 — No "Attack" option on attackable NPCs (rats).** 🟧 Test: a rat right-click shows "Attack"; clicking engages combat.
- [ ] **NPC4 — Nameplates always on; no monster combat level.** 🟨 Test: monster plates show combat level; friendly NPCs match OSRS hover.
- [ ] **NPC5 — No instructor handoff / "speak to X next".** 🟧 Test: finishing one instructor points the arrow/marker at the next.
- [ ] **NPC6 — The spawn-room Guide is missing entirely.** 🟥 Test: an original Guide stands in the spawn house, talks first, hands off.
- [ ] **NPC7 — Chapel monk plays the wrong role (no Brother-Brace prayer lesson).** 🟧
    Now: Brother Aldric gives altar flavour only. OSRS: Brother Brace gives bones → bury → Prayer tab → Friends/Ignore. Test: the monk gives bones, prompts Bury, unlocks Prayer + Friends/Ignore.
- [ ] **NPC8 — Nameplates show personal names, not teaching roles.** 🟨 Test: instructor plates show the role ("Survival Expert").
- [ ] **NPC9 — 3 generic chapel wanderers aren't OSRS-faithful.** 🟨 Test: decide — remove for parity or justify as documented Eldermoor flavour.

---

## 18. Rooms / environment rendering 🟥

"Rooms still glitch between inside/outside textures and colours." Root causes are pinned in §25 (REND/PERF/BUG); the player-facing symptoms:

- [ ] **RM1 — Inside/outside texture & colour glitch.** 🟥
    Causes: z-fighting (terrain y=-0.05 vs floor y=0), substring material matching bleeding textures, water depthWrite holes, nameplates through walls, no roof seal. Test: stand inside, orbit fully — no flicker, no exterior bleed.
- [ ] **RM2 — No roof / interiors not visually sealed.** 🟧 Test: inside you see walls on all sides; roof hides on entry, shows from outside.
- [ ] **RM3 — Material assignment by fragile substring match.** 🟧 (see REND+2/REND+3) Test: each mesh's material assigned by explicit role, not `name.includes()`.
- [ ] **RM4 — Terrain/floor 5cm gap can flicker.** 🟨 Test: no flicker at the floor/terrain seam at any zoom/angle.
- [ ] **RM5 — Walls textured identically inside & out; no trims.** 🟨 Test: interior walls read distinct from exterior masonry.
- [ ] **RM6 — Lighting doesn't change interior vs exterior.** 🟨 Test: stepping inside subtly darkens/warms the light.

---

## 19. Tutorial flow & gating 🟥

The actual *tutorial* — the gated instructor chain — does not exist as logic.

- [ ] **FLOW1 — No state machine driving lesson progress.** 🟥 Test: completing a step advances `progress` and unlocks the next.
- [ ] **FLOW2 — No gating (free-roam; nothing locked).** 🟥 Test: a locked door refuses entry with the OSRS nudge until its lesson completes.
- [ ] **FLOW3 — No character-creation gate (L0).** 🟥 Test: first load shows a creator; confirming spawns you.
- [ ] **FLOW4 — No progress persistence.** 🟧 Test: complete a step, reload → resume at the same step + inventory/stats.
- [ ] **FLOW5 — No fixed ~0.6s game tick.** 🟧 Test: actions/combat resolve on a fixed tick independent of FPS.
- [ ] **FLOW6 — Objective text is static, not lesson-driven.** 🟨 Test: each completed step rewrites the objective.
- [ ] **FLOW7 — World clicks aren't inert during the intro (no "follow the instructions" nudge).** 🟧
    OSRS: in the spawn room you can only talk to the Guide. Test: before L1, world clicks are inert + a nudge fires.
- [ ] **FLOW8 — Tabs aren't lesson-gated/force-flashed at the right beat.** 🟧
    OSRS: a tab is locked until its instructor unlocks it, then its stone FLASHES with "Click the flashing icon." Test: at L1 the Settings tab flashes; untaught tabs are inert.
- [ ] **FLOW9 — No "click here to continue" UI-element highlight overlays.** 🟧
    OSRS paints a pulsing highlight around the exact UI element to click next. Test: each UI-teaching step highlights the specific HUD element until clicked.
- [ ] **FLOW10 — Run is absent; OSRS keeps the orb present but never teaches run on-island.** 🟨 Test: run orb present, walking is the cadence; document run as post-island.
- [ ] **FLOW11 — Lesson-critical items can be lost with no re-grant (softlock risk).** 🟧 Test: dropping the axe is blocked, or the Survival Expert re-issues it on talk.
- [ ] **FLOW12 — Forward gating not enforced while backtracking is allowed.** 🟧 Test: you may re-enter finished rooms, but the next gate stays shut until its predicate passes.

---

## 20. Per-zone room content (OSRS Tutorial Island, room by room) 🟥

The specific objects + teaching beats each instructor area needs. (Asset side tracked in `ASSET_MANIFEST.md`; this is the *interaction/content* checklist.)

- [ ] **ROOM1 — Survival area lacks its props.** 🟥
    OSRS: a fenced clearing with a choppable TREE, a net FISHING SPOT (→ shrimp), an open FIRE tile, and a gate to the cook. Test: tree + net-spot + fire-tile + exit gate, all interactable.
- [ ] **ROOM2 — No cooking range + "can't make fire under a tree" beat.** 🟧
    OSRS: firemaking is blocked on a tree-shaded tile ("You can't light a fire here"); the cook's house has a RANGE distinct from the open fire. Test: fire-under-tree fails with the message; a separate range exists for L6.
- [ ] **ROOM3 — Master Chef's flour-pot + water-bucket + dough beat missing.** 🟧
    OSRS: pick up POT OF FLOUR + BUCKET OF WATER, Use flour on water → bread dough, bake. Test: the cook's house has both; combining yields dough.
- [ ] **ROOM4 — Quest Guide house: no journal explanation + ladder down.** 🟧 Test: a quest house with the Quest Guide + a ladder descending to the mine.
- [ ] **ROOM5 — Mine: no tin rock, copper rock, furnace, anvil.** 🟥
    OSRS: mine tin + copper → smelt at FURNACE → bronze bar → smith at ANVIL → bronze dagger → ladder up. Test: separate tin+copper rocks, a furnace, an anvil, each wired to its action.
- [ ] **ROOM6 — Combat area: no rat pen + gate + giant rat + ranged target.** 🟥
    OSRS: a fenced RAT PEN with a GATE you open, melee rats inside, then range a rat with a shortbow + arrows. Test: openable pen gate, attackable rats, a ranged engagement.
- [ ] **ROOM7 — Bank area: no bank booth + poll booth + account beat.** 🟧 Test: a bank booth opens a bank interface; a poll booth + account explanation present.
- [ ] **ROOM8 — Chapel lacks burnable bones + the real prayer beat.** 🟧
    Now: altar grants flat +7 on "Pray-at"; no bones. OSRS: Brother Brace gives bones → BURY → first Prayer XP. Test: give-bones → bury → Prayer XP.
- [ ] **ROOM9 — Magic area: no chicken + air/mind runes + Wind Strike beat.** 🟧 Test: a Magic Instructor grants runes; a target chicken takes Wind Strike for XP.
- [ ] **ROOM10 — Departure dock: no final NPC + no boat.** 🟧 Test: a departure NPC at a dock offers a boat; confirming triggers the leave-island transition.
- [ ] **ROOM11 — No inter-room doors/gates as discrete openable objects.** 🟧 Test: ≥6 door/gate objects between rooms, each Open-able, several lesson-locked.
- [ ] **ROOM12 — Pond has no fishing-spot shimmer; fire has no light/smoke/despawn.** 🟨 Test: the fishing spot animates; a made fire emits light and despawns over time.
- [ ] **ROOM13 — A lit fire doesn't block its tile (cook from adjacent).** 🟨 Test: a made fire adds a temporary collider; cooking happens from an adjacent tile.

---

## 21. Game systems behind the lessons 🟧

- [ ] **SYS1 — Woodcutting.** 🟧 Test: chop a tree → logs + Woodcutting XP over ticks.
- [ ] **SYS2 — Firemaking.** 🟧 Test: tinderbox on logs → fire + Firemaking XP.
- [ ] **SYS3 — Fishing.** 🟧 Test: net a spot → raw shrimp + Fishing XP.
- [ ] **SYS4 — Cooking (incl. burning).** 🟧 Test: cook shrimp on fire → cooked (or burnt) + Cooking XP.
- [ ] **SYS5 — Mining.** 🟧 Test: mine tin/copper → ore + Mining XP.
- [ ] **SYS6 — Smelting.** 🟧 Test: tin+copper at furnace → bronze bar + Smithing XP.
- [ ] **SYS7 — Smithing.** 🟧 Test: bronze bar at anvil → bronze dagger + Smithing XP.
- [ ] **SYS8 — Combat (melee).** 🟥 Test: attack a rat → tick damage, HP drop, XP, death/respawn.
- [ ] **SYS9 — Ranged.** 🟧 Test: bow+arrows → attack a rat at range, ammo consumed, Ranged XP.
- [ ] **SYS10 — Magic/runes.** 🟧 Test: cast Wind Strike with runes → projectile + Magic XP.
- [ ] **SYS11 — Prayer (bury bones) only partial.** 🟧 Test: bury bones → Prayer XP.
- [ ] **SYS12 — Banking.** 🟧 Test: open bank booth → deposit/withdraw separate from inventory.
- [ ] **SYS13 — HP / death / respawn model.** 🟧 Test: damage reduces HP; 0 → respawn.
- [ ] **SYS14 — Tools aren't real (axe/net/pickaxe/tinderbox have no function).** 🟧 Test: each tool enables its skill action.

---

## 22. Audio 🟥

- [ ] **AUD1 — No music.** 🟧 Test: an original tutorial theme loops; mutable in settings.
- [ ] **AUD2 — No SFX.** 🟧 Test: chop/fire/mine/smith/fish/cook/hit/door each play their SFX.
- [ ] **AUD3 — No level-up jingle.** 🟨 Test: leveling plays the jingle.
- [ ] **AUD4 — No UI click sounds.** 🟨 Test: tab/button clicks play the OSRS-style click.
- [ ] **AUD5 — No zone-based music crossfade.** 🟨 Test: entering a zone crossfades to its track.

---

## 23. Character creation 🟥

- [ ] **CC1 — No character creator screen.** 🟥 Test: a creator panel (head/torso/arms/hands/legs/feet + colours + body type + pronouns) with live preview.
- [ ] **CC2 — No live rotating preview.** 🟧 Test: changing an option updates a rotating model live.
- [ ] **CC3 — Appearance doesn't drive the in-world player.** 🟧 Test: confirmed look applies to the player + persists.

---

## 24. Cross-cutting polish & correctness 🟨

- [ ] **PX1 — Version string hard-coded in multiple spots.** 🟨 Test: a single source of the version string.
- [ ] **PX2 — No real loading/error UX beyond one "Failed to load" string.** 🟨 Test: asset failures show a styled, retryable error.
- [ ] **PX3 — Preview-tab caveat blocks headless verification.** 🟨 Test: a documented foreground-verify path; logic verified via eval.
- [ ] **PX4 — No FPS/perf budget or LOD for a "massive" world.** 🟨 (see PERF+2) Test: 60fps target with the full island instanced.
- [ ] **PX5 — No hover-cursor affordances.** 🟨 (see OW+1) Test: hovering an interactable changes the cursor + shows the default action.
- [ ] **PX6 — No step-complete "well done" confirmations.** 🟨 Test: each step completion shows the OSRS confirmation.
- [ ] **PX7 — Accessibility: tiny tap targets, no contrast pass, no text scaling.** 🟨 Test: targets meet a min size; UI-scale option (ties ST4).

---

## 25. Code-level defects & rendering bugs 🟥

Concrete, code-grounded defects (from the code review critic). Several directly cause the "rooms glitch" and other visible breakage. These are *bugs*, not feature gaps — fix in place.

**Rendering**
- [ ] **REND+1 — Sky vertex colours double-tone-mapped.** 🟨 `MeshBasicMaterial` sky colours are sRGB→linear pre-converted, then ACES tone-maps them at output → muddier than the authored `#5e93c9/#e7ddc4`. Test: the top-of-sky pixel ≈ `#5e93c9` within tolerance.
- [ ] **REND+2 — Terrain branch never nulls `m.map`.** 🟥 In `dressMaterials` the `terrain` branch sets `vertexColors=true` + white color but keeps any baked baseColorTexture → vertex colours multiply a stray texture (the colour glitch). Test: terrain `material.map` is null after dress.
- [ ] **REND+3 — Water is transparent with `depthWrite` left on → floor punches through.** 🟥 Test: water overlapping the floor never makes the floor disappear at any angle (set `depthWrite=false`/sort).
- [ ] **REND+4 — Terrain forced `DoubleSide` worsens shadow acne + self-shadows underside.** 🟨 Test: low-sun terrain shows no moiré; `FrontSide` fixes it.
- [ ] **REND+5 — `flatShading=true` forced on player + NPC meshes, flattening authored smooth normals.** 🟧 Test: a character head keeps smooth curvature; env stays faceted (don't flat-shade characters).
- [ ] **PERF+3 — Nameplates use `depthTest:false` → names render THROUGH walls.** 🟥 You see interior NPC names through solid masonry from outside (a direct "inside/outside" symptom). Test: outside the chapel, interior nameplates are occluded by the wall.

**Interaction / raycasting**
- [ ] **BUG+1 — Taps "through" walls register as walk commands.** 🟧 `pickAt` only raycasts `clickTargets` + the ground plane; world geometry isn't tested, so an occluded floor tile is walkable. Test: tapping a tile hidden behind a wall doesn't path there.
- [ ] **BUG+2 — Forgiving NPC tap picks array-order, not nearest; shadows objects.** 🟧 `NPCS.find(...<1.2)` engages the lower-indexed NPC and can talk a pilgrim instead of praying the altar. Test: tapping between two NPCs engages the nearer one; objects aren't shadowed by NPC proximity.
- [ ] **BUG+3 — "Walk here" uses a stale `ground` closure from menu-open time.** 🟨 Test: long-press, orbit, choose Walk here later → marker should target the current intent, not the old tile.
- [ ] **BUG+4 — Long-press/up race can both walk AND open the menu (~450ms).** 🟨 Test: releasing near 450ms never produces both a walk marker and the menu.
- [ ] **BUG+5 — Pinch divide-by-zero → NaN camera → black screen.** 🟥 **(FIXED v15: `d>0.001` guard.)** Test: two touches on one pixel then spread never NaNs the camera.
- [ ] **BUG+17 — Asymmetric NPC/player collision thresholds cause the stuck-to-NPC glue + doorway stutter.** 🟥 **(FIXED v15: `nearPlayer` 0.6→0.92 + `moveBlocked` escape hatch.)** Test: an NPC wandering into you never glues you; pathing through a doorway with an NPC present doesn't stutter-replan forever.

**Pathfinding / scale**
- [ ] **BUG+6 — A* key `ci*1000+cj` aliases cells once the world exceeds 1000 cols/rows.** 🟧 Hard cap on the "massive world" mandate. Test: a 600×600-unit world (cols>1000) corrupts paths; switch to a collision-free key (e.g. `ci*rows+cj`).
- [ ] **BUG+7 — `cellWalkable` indexes `WALK[ci][cj]` with no bounds guard.** 🟧 A player clamped to the exact `BOUND` edge can throw "Cannot read properties of undefined". Test: spawn at the bound edge + trigger replan → no throw.

**HUD / data**
- [ ] **BUG+8 — `giveItem` prints "You receive: X" even when a full 28-slot bag silently drops the item.** 🟧 The chat lies. Test: fill the bag, give a new item → either it's added or the message says it wasn't.
- [ ] **BUG+9 — `addXp` doesn't validate the skill id; a typo shows a "+N" drop but awards nothing.** 🟨 Test: `addXp('Pray',7)` shows "+7 Pray" but no tracked skill changes → should warn/no-op visibly.
- [ ] **BUG+10 — Chat channel `<button>`s steal canvas focus on tap (future keyboard input dies) and do nothing.** 🟧 Test: tapping a channel button doesn't blur the canvas / break later key input.
- [ ] **BUG+11 — `v__` version string: one of the hard-coded copies (`#hud`) is `display:none` so bumping it is a no-op.** 🟨 Test: a single live source drives the visible version.
- [ ] **BUG+13 — `altarGlow` PointLight `decay=2` without `physicallyCorrectLights` → the prayer pulse is barely visible.** 🟨 Test: praying produces a clearly visible warm pulse at the altar.
- [ ] **BUG+15 — Examine during an NPC conversation hijacks the shared dialogue queue / can leave an NPC frozen.** 🟧 Test: talk to a wanderer, Examine an object mid-chat → no lost dialogue, no permanently frozen NPC.
- [ ] **BUG+16 — `combatLevel()` omits Magic and mis-places `floor()` vs the OSRS formula.** 🟨 Test: a pure-ranged/mage build matches the OSRS combat level.
- [ ] **BUG+18 — `maybeReady` fades the loader at 2 loads (world+player) while trees/NPCs still stream in → pop-in.** 🟧 Test: on a throttled network, scenery/NPCs don't pop in after the loader claims ready.
- [ ] **BUG+12 — Water `offset` is an unbounded accumulator (precision drift over hours).** 🟨 Test: wrap with `%1`; ripple stays smooth in long sessions.
- [ ] **BUG+14 — Resize doesn't refresh `pixelRatio`; moving between hi/standard-DPI monitors stays stale.** 🟨 Test: dragging the window across monitors updates crispness.

**Data wiring**
- [ ] **DATA+3 — `dialogue.json` and `lessons.json` are never fetched.** 🟧 Both files exist but load nowhere; `NPCS[].lines` are hard-coded inline, duplicating/diverging from `dialogue.json`. Test: the client fetches both; NPC lines come from `dialogue.json` (single source of truth).
- [ ] **DATA+1 — INV10 is currently latent, not active.** 🟨 The starting kit (`bronze-axe/tinderbox/coins`) DOES resolve (items.json kebab == loader kebab); the kebab/snake mismatch only bites once `lessons.json` is wired. Test: confirm the start kit appears; treat INV10 as a pre-wiring fix.
- [ ] **DATA+2 — `combatLevel()`/`totalLevel()` fall back to `||3` masking a data-load failure.** 🟨 Test: with an empty skills array the UI surfaces an error instead of silently showing combat 3 / total 0.

**Security**
- [ ] **SEC+1 — `addChat` uses `innerHTML` for ALL messages; item/skill names flow in unescaped.** 🟨 The welcome line intentionally embeds `<b>`, so the fix is a tag-whitelist (not a blanket escape). Test: an item named `<img src=x onerror=...>` renders as literal text, not script.

---

## 26. Items, Use-on-item, ground items & banking (deep) 🟥

_Wave-2 critic (items/inventory/banking). Folds into §6/§8 but itemised at OSRS-exact depth._

- [ ] **ITEM+1 — Per-item op set incomplete; no Use+Wield+Examine triad.** 🟧 OSRS menus are op[0..4]+Examine in fixed order (axe = Wield/Use/Drop/Examine; shrimp = Eat/Use/Drop/Examine), Examine always last. Test: those exact rows in that order.
- [ ] **ITEM+2 — "Use" verb missing from every equipable/edible.** 🟧 Use is how all combinations start; every item needs it. Test: every item exposes "Use"; bar→anvil, tinderbox→logs, flour→water all work.
- [ ] **ITEM+3 — Op ordering not OSRS-canonical (Drop second-to-last, Examine last).** 🟨 Test: render order == canonical per item; pot-of-flour = Use/Empty/Drop/Examine.
- [ ] **ITEM+4 — Tinderbox left-click should arm a Use-cursor highlighting logs.** 🟧 Test: left-click tinderbox arms use-cursor; click logs lights; logs also right-click → Light.
- [ ] **ITEM+5 — Axe/pickaxe must work from inventory OR wielded.** 🟨 Test: chopping/mining works with the tool in the bag and when wielded.
- [ ] **ITEM+6 — No "Empty" for filled containers (pot-of-flour, bucket).** 🟨 Test: Empty yields the empty container + removes contents.
- [ ] **ITEM+7 — No no-drop / destroy-confirm for lesson-critical items.** 🟧 Test: dropping the axe mid-lesson is blocked; un-droppables open a "Destroy?" confirm, not a silent drop.
- [ ] **ITEM+8 — No value/highalch/lowalch/shop-value fields.** 🟧 Test: each item has a value; high/low alch derive; value surfaces in shop/alch.
- [ ] **ITEM+9 — No item weight (kg) for run-energy/total weight.** 🟧 Test: each item has weight; equipping/banking updates a total-kg readout.
- [ ] **ITEM+10 — Stackable flag exists but no max-stack/overflow rule.** 🟨 Test: stackables occupy one slot; cap at 2.147B with an overflow message.
- [ ] **ITEM+11 — No slot-conflict / 2H rules on equip.** 🟧 Test: equipping a weapon over a weapon swaps to bag; a 2H also vacates the shield slot.
- [ ] **ITEM+12 — Arrows use "Wield" but must fill+stack the ammo slot and deplete on fire.** 🟧 Test: wielding arrows fills ammo; firing decrements the count.
- [ ] **ITEM+13 — No noted/un-noted (bank-note) item variants.** 🟨 Test: a notable item has a noted form that stacks and can't be worn/eaten.
- [ ] **USE+1 — No Use-X-on-Y combination matrix for the tutorial chain.** 🟥 Pairs: tinderbox→logs, flour→water, dough→range, tin+copper→furnace, bar→anvil, shrimp→fire/range, net→spot. Test: each pair yields the right output+XP; wrong pairs → "Nothing interesting happens."
- [ ] **USE+2 — No "Nothing interesting happens." fallback.** 🟨 Test: Use logs on coins → that message, no state change.
- [ ] **USE+3 — No armed Use-cursor state (selecting Use highlights the item).** 🟧 Test: Use on tinderbox arms it (slot highlighted, cursor label); click target executes, empty cancels.
- [ ] **USE+4 — No Use-item-on-scenery path (fire/range/furnace/anvil).** 🟧 Test: Use raw-shrimp on fire cooks it; Use bar on anvil opens smithing.
- [ ] **USE+5 — Use must be order-independent (A-on-B == B-on-A).** 🟨 Test: flour-on-water and water-on-flour both yield dough.
- [ ] **USE+6 — Bronze bar → anvil has no product menu (only dagger exists).** 🟧 Test: bar→anvil opens a Make interface listing ≥ the dagger, hammer required.
- [ ] **MAKE+1 — No Make-X production interface (1/5/10/X/All + preview + Space).** 🟧 Test: a >1-count action opens the Make-X panel; Space makes the selected count.
- [ ] **MAKE+2 — No item preview/hover-name in the Make interface.** 🟨 Test: the Make panel shows product icon+name; multi-product recipes scroll between products.
- [ ] **MAKE+3 — No batch tick-loop / interrupt.** 🟨 Test: Make-5 bakes one per tick ×5; moving or running out interrupts early.
- [ ] **GND+1 — Drop doesn't create a ground item on the tile.** 🟧 Test: Drop logs → a logs model on the tile with a Take option.
- [ ] **GND+2 — No ground-item despawn/visibility timer.** 🟨 Test: your drop shows now; others' drops invisible until public; despawns after the timer.
- [ ] **GND+3 — No "Take" pickup op.** 🟧 Test: right-click ground item → Take + Examine; Take returns it; full bag → "too full".
- [ ] **GND+4 — Ground items absent from the minimap (cyan dot).** 🟨 Test: a visible ground item renders a cyan minimap dot, cleared on take/despawn.
- [ ] **GND+5 — No drop-confirm for valuables / shift-drop wiring.** 🟨 Test: dropping a >100k item asks to confirm; shift-drop (if on) drops instantly.
- [ ] **BANK+1 — No bank interface ("Bank of Eldermoor").** 🟥 Test: a bank booth opens a titled item-grid window separate from inventory.
- [ ] **BANK+2 — No bank tabs.** 🟧 Test: a tab row; dragging an item to a new tab moves it; tab selects filter the view.
- [ ] **BANK+3 — No bank search.** 🟨 Test: search + "bronze" filters/highlights bronze items.
- [ ] **BANK+4 — No withdraw/deposit quantity buttons (1/5/10/X/All).** 🟧 Test: the quantity row sets amount; right-click → Withdraw-1/5/10/X/All/All-but-1.
- [ ] **BANK+5 — No withdraw-as-note toggle.** 🟨 Test: Note toggle withdraws notable items as stacked notes.
- [ ] **BANK+6 — No placeholders toggle.** 🟨 Test: with placeholders on, withdrawing the last item leaves a greyed slot; toggle clears them.
- [ ] **BANK+7 — No deposit-inventory / deposit-worn buttons.** 🟨 Test: Deposit-Inventory empties the bag in one click; Deposit-Worn banks equipped gear.
- [ ] **BANK+8 — No deposit box (deposit-only interface).** 🟨 Test: a deposit box stashes but can't retrieve.
- [ ] **BANK+9 — No bank PIN flow.** 🟨 Test: with a PIN set, opening the bank prompts a 4-digit keypad.
- [ ] **BANK+10 — No bank capacity / "bank full" message.** 🟨 Test: a full bank rejects a new distinct item with the message.
- [ ] **BANK+11 — No right-click ops inside the bank.** 🟨 Test: banked item → Withdraw set; inventory item → Deposit set.
- [ ] **BANK+12 — Eat/Wield not suppressed in the bank context.** 🟨 Test: with the bank open, inventory food shows Deposit ops, not Eat.
- [ ] **INV+7 — Left-click op-1 not authored per item type.** 🟧 Test: shrimp Eats, cape Wears, bones Buries, journal Reads; coins/runes do nothing on left-click.
- [ ] **INV+8 — Readables have "Read" but no reader pane.** 🟨 Test: Read security-card opens a reader overlay; Read island-map opens the map.
- [ ] **INV+9 — Teleport-tab "Break" op pattern unrepresented.** 🟨 Test: a tab-class item exposes Break as op-1 and is consumed on use.
- [ ] **INV+10 — Eat/Drink heal + animation + tick-delay not modeled.** 🟧 Test: eating shrimp = +3 HP (capped), eat anim, food cooldown.
- [ ] **INV+11 — No equipable stat hover (decide strict-parity vs better).** 🟨 Test: documented decision; if added, hover shows attack/str/def/ranged from equipBonus.
- [ ] **INV+12 — Coins have no amount-tier pile sprite.** 🟨 Test: coin icon differs at 1 vs 25 vs 1000 vs 10000+.
- [ ] **INV+13 — Stack-count colour tiers: yellow <100k, white "100K", green "10M".** 🟨 Test: 99,999=yellow; 100,000="100K" white; 10,000,000="10M" green.
- [ ] **INV+14 — Dropping a stackable drops the whole stack as one entity.** 🟨 Test: Drop on 50 coins → one ground entity, no quantity prompt.
- [ ] **EQ+6 — Wield must atomically update bag+slot+model+stats (and reverse).** 🟧 Test: one click moves item, fills slot, shows on model, updates stats; clicking the worn slot reverses all four.
- [ ] **EQ+7 — Wield vs Wear verb correctness per slot not enforced.** 🟨 Test: weapon/shield/ammo="Wield", armour/cape/jewellery="Wear" validated across items.

---

## 27. Combat & skilling mechanics (deep) 🟥

_Wave-2 critic (mechanics, not the UI tabs). Folds into §21; §9 covers the Combat tab UI._

- [ ] **CBT+1 — Hitsplats (red hit / blue 0 / max-hit colour), up to 4 stacked, fade per tick.** 🟥 Test: hit 3 → red "3"; miss → blue "0"; max roll → max-hit colour.
- [ ] **CBT+2 — HP bar over an NPC on damage (green/red, fades after combat).** 🟧 Test: hitting a rat shows a shrinking green-over-red bar that fades.
- [ ] **CBT+3 — Accuracy roll vs defence (miss = blue 0, not "no hit").** 🟥 Test: low-accuracy vs a defensive rat yields frequent 0s tracking the OSRS formula.
- [ ] **CBT+4 — Max hit from Strength + style; damage uniform 0..max.** 🟥 Test: Str 1 unarmed max = 1; str-bonus weapon raises observed max; damage uniform.
- [ ] **CBT+5 — Attack speed varies by weapon (ticks).** 🟧 Test: dagger hits on a 4-tick cadence; a slow weapon visibly attacks less often, tick-locked.
- [ ] **CBT+6 — 0.6s tick governs all combat/skill resolution.** 🟧 Test: hits + skill successes land on 600ms boundaries; identical rate at 30 vs 144fps.
- [ ] **CBT+7 — Auto-retaliate behaviour (not just the toggle UI).** 🟧 Test: on → a rat that hits you is auto-targeted; off → you take hits until you click Attack.
- [ ] **CBT+8 — Approach-then-attack (walk into melee range first).** 🟧 Test: Attack a distant rat → path adjacent, first hitsplat on the next tick.
- [ ] **CBT+9 — NPC retaliation (the rat fights back, damages you).** 🟧 Test: during the fight you take hitsplats and your HP orb drops.
- [ ] **CBT+10 — Monster combat level on hover/examine + level rule.** 🟨 Test: hovering the rat shows "Attack Giant rat (level 1)".
- [ ] **CBT+11 — Safespotting / LOS blocking (fence blocks rat melee).** 🟨 Test: behind a fence corner the rat can't path around, it can't hit you while you range it.
- [ ] **CBT+12 — Aggression / aggro range (tutorial rats are non-aggressive).** 🟨 Test: tutorial rats never initiate; the aggro model documented for later mobs.
- [ ] **CBT+13 — Player death: animation, message, respawn, stat reset, no item loss on-island.** 🟧 Test: forced to 0 HP → death anim + "Oh dear, you are dead!" → respawn full HP, same inventory.
- [ ] **CBT+14 — Rat death: anim, bones drop, respawn timer.** 🟧 Test: kill a rat → death anim, bones on the tile, rat respawns after its timer.
- [ ] **CBT+15 — "You can't attack that" on non-combat NPCs.** 🟨 Test: instructors offer no Attack; only rats/chicken are attackable.
- [ ] **CBT+16 — Prayer drain in combat (points tick down by active prayers).** 🟧 Test: Thick Skin on → points tick down at its drain; 0 → deactivates.
- [ ] **RNG+1 — Ammo consumed per shot; no-ammo message.** 🟧 Test: each shot −1 arrow; 0 → "There is no ammo left in your quiver."
- [ ] **RNG+2 — Dropped-ammo recovery (~80%).** 🟨 Test: some fired arrows lie under the target and are pick-up-able; not all recovered.
- [ ] **RNG+3 — Ranged max range (shortbow ~7 tiles); step into range.** 🟨 Test: a rat outside range → player steps closer before the first arrow.
- [ ] **RNG+4 — Bow attack speed + Accurate/Rapid/Longrange styles.** 🟨 Test: shortbow fires at its cadence; Longrange increases range and changes XP style.
- [ ] **XP+1 — Combat XP = 4× damage to the trained skill (+1.33 HP).** 🟧 Test: 10 dmg Aggressive ≈ 40 Str + 13 HP XP; Controlled splits 1.33 each.
- [ ] **XP+2 — Hitpoints XP accrues per damaging hit, not per kill.** 🟧 Test: 30 dmg over a fight ≈ 40 HP XP regardless of kills.
- [ ] **XP+3 — Controlled style splits XP three ways.** 🟨 Test: Controlled raises Att/Str/Def together at ~1/3 rate each.
- [ ] **XP+4 — Per-action XP must match a single documented figure.** 🟧 Test: skills.json.tutorialXp and lessons.json.xp agree on every value.
- [ ] **XP+5 — DATA BUG: skills.json vs lessons.json XP values CONFLICT.** 🟥 (FM 40 vs 25, Fishing 30 vs 20, Smelting 35 vs 12, dagger 50 vs 13, Prayer 12 vs 15, Magic 35 vs 33.) Test: a diff shows zero mismatches.
- [ ] **XP+6 — Smelting awards Smithing only (not Mining).** 🟨 Test: smelting adds Smithing XP only; mining adds Mining XP only.
- [ ] **WC+1 — Woodcutting per-tick success roll (not a fixed timer).** 🟧 Test: logs arrive after a variable tick count driven by probability.
- [ ] **WC+2 — Tree depletes to a stump + respawns.** 🟧 Test: a normal tree becomes a stump after a log, respawns after its timer.
- [ ] **WC+3 — Axe required (bag or wielded); level gates the tree.** 🟨 Test: no axe → "You need an axe…"; too-high tree → level message.
- [ ] **WC+4 — Chop animation + auto-stop on full bag.** 🟨 Test: repeating swing; full bag halts with the full-inventory message.
- [ ] **FISH+1 — Fishing spot is a relocating node, not a fixed object.** 🟧 Test: the net spot occasionally moves along the pond and must be re-clicked; it shimmers.
- [ ] **FISH+2 — Per-tick catch roll + net required.** 🟧 Test: shrimp after a variable tick count; no net → "You need a small fishing net…".
- [ ] **FISH+3 — Fishing animation + auto-stop on full bag.** 🟨 Test: animation plays; full bag halts.
- [ ] **FM+1 — Fire lights on your tile, then you step west.** 🟧 Test: lighting spawns a fire under you and the avatar steps to a free adjacent tile.
- [ ] **FM+2 — "You can't light a fire here" tile rules.** 🟧 Test: fire on a tree-shaded/object tile → the message, nothing consumed.
- [ ] **FM+3 — Fire = temp collider + burn duration + ashes.** 🟧 Test: a fire blocks its tile, despawns after a timer, leaves pick-up-able ashes.
- [ ] **FM+4 — Line-of-fires + per-log FM XP + tinderbox required.** 🟧 Test: lighting logs builds a westward line, each awards FM XP; no tinderbox → message.
- [ ] **COOK+1 — Burn chance by level; stop-burn level.** 🟧 Test: low level sometimes yields burnt shrimp (0 XP); above stop-burn never burns.
- [ ] **COOK+2 — Range burns less than a fire; some recipes need a range.** 🟧 Test: same-level cooking burns less on the range; bread bakes only on a range.
- [ ] **COOK+3 — Use-food-on-fire cooks the whole stack, one per few ticks.** 🟨 Test: a stack cooks one-by-one on tick cadence with the cooking anim.
- [ ] **COOK+4 — Dough = Use flour on water; consumes both, returns empties.** 🟧 Test: combining yields dough, removes flour+water, returns empty pot+bucket.
- [ ] **MINE+1 — Per-tick mining roll by pick tier + rock + level.** 🟧 Test: tin yields ore after a variable tick count; better pick raises success.
- [ ] **MINE+2 — Rock depletes + ore-specific respawn.** 🟧 Test: a tin rock greys out then respawns after its timer.
- [ ] **MINE+3 — Pickaxe required + level message.** 🟨 Test: no pick → "You need a pickaxe…"; high rock → level message.
- [ ] **MINE+4 — Mining animation + auto-stop on full bag.** 🟨 Test: repeating swing; ore to bag; full bag halts.
- [ ] **SMITH+1 — Smelting needs furnace + 1 tin + 1 copper; consumes both.** 🟧 Test: missing an ore offers no bronze bar; success consumes both.
- [ ] **SMITH+2 — Smithing needs hammer + anvil + a make interface.** 🟧 Test: anvil+bar shows a grid (dagger L1); no hammer → message; smithing consumes the bar.
- [ ] **SMITH+3 — "You need a Smithing level of X" gates higher items.** 🟨 Test: a too-high item is greyed with its level and can't be made.
- [ ] **RUN+1 — Run energy: drain running, regen walking/resting.** 🟧 Test: run halves travel time + drains the orb; standing refills; 0 → walk.
- [ ] **RUN+2 — Weight (kg) affects run drain.** 🟧 Test: a heavy bag drains faster; the equipment screen shows a kg total.
- [ ] **RUN+3 — Regen scales with Agility.** 🟨 Test: higher Agility regenerates energy faster.
- [ ] **RUN+4 — Special-attack energy + per-weapon cost/effect.** 🟨 Test: spec bar fills 10% per 50 ticks; a spec deducts its cost + triggers its effect; greyed below cost.

---

## 28. Social, account, music & pre-game interfaces (deep) 🟥

_Wave-2 critic (social/meta/pre-game). Folds into §14; none of these contents existed before._

**Friends / private chat (FR):**
- [ ] **FR+1 — No Friends list panel/data.** 🟧 Test: a Friends tab renders a list with Add-friend.
- [ ] **FR+2 — Can't add a friend by name.** 🟧 Test: Add friend → type → appears + persists.
- [ ] **FR+3 — Can't remove a friend.** 🟨 Test: right-click → Delete removes them.
- [ ] **FR+4 — No online/offline status.** 🟨 Test: online shows world/green; offline greyed, sorts below.
- [ ] **FR+5 — No world-number column.** 🟨 Test: an online friend shows a world number.
- [ ] **FR+6 — Can't message a friend (PM send).** 🟧 Test: clicking an online friend opens a message input; sending shows "To <name>:".
- [ ] **FR+7 — No incoming-PM render / click-to-reply.** 🟧 Test: a PM shows "From <name>:"; clicking the name opens a reply.
- [ ] **FR+8 — No friends-list cap feedback.** 🟨 Test: past the cap → "Your friends list is full."
- [ ] **FR+9 — No login/logout friend notifications.** 🟨 Test: a friend online → "<name> has logged in."
- [ ] **FR+10 — No private-chat status (On/Friends/Off).** 🟨 Test: Private→Friends blocks non-friend PMs; Off blocks all.

**Friends-chat channel (FC):**
- [ ] **FC+1 — No Join-Chat interface.** 🟧 Test: Join Chat accepts an owner name; you appear as a member.
- [ ] **FC+2 — No member list / "talking in" header.** 🟨 Test: after joining, the panel lists members + owner.
- [ ] **FC+3 — No leave-channel control.** 🟨 Test: Leave Chat clears the list.
- [ ] **FC+4 — No member ranks.** 🟨 Test: members render with rank icons; owner marked.
- [ ] **FC+5 — No kick for ranked members.** 🟨 Test: owner right-click member → Kick.
- [ ] **FC+6 — No Set-Chat settings (name/rank thresholds).** 🟨 Test: owner sets channel name + talk/kick/join ranks.
- [ ] **FC+7 — Friends/clan messages have no colour/prefix.** 🟨 Test: "[channel] name: …" in its signature colour.

**Clan / Ignore (CLAN/IGN):**
- [ ] **CLAN+1 — No Clan tab.** 🟧 · **CLAN+2 — Can't join/leave a clan.** 🟨 · **CLAN+3 — No clan ranks/icons.** 🟨 · **CLAN+4 — No clan setup panel.** 🟨 Test: a Clan tab with name header, roster, join/leave, ranks, owner settings.
- [ ] **IGN+1 — No Ignore panel.** 🟧 · **IGN+2 — Can't add.** 🟨 · **IGN+3 — Can't remove.** 🟨 · **IGN+4 — Ignore doesn't suppress messages.** 🟧 · **IGN+5 — No friend/ignore cross-guard.** 🟨 Test: ignore list add/remove; ignored names' public+PM hidden; can't be friend+ignored at once.

**Account management (ACCT):**
- [ ] **ACCT+1 — No Account tab.** 🟧 · **ACCT+2 — No Bank-PIN setup.** 🟨 · **ACCT+3 — No recovery questions/email.** 🟨 · **ACCT+4 — No authenticator (2FA).** 🟨 · **ACCT+5 — No in-tab Account-Guide content.** 🟨 · **ACCT+6 — No parental/chat-filter controls.** 🟨 · **ACCT+7 — No display-name surface.** 🟨 Test: an Account tab exposing PIN, recovery, 2FA, guide content, and the display name.
- [ ] **EMOTE+1 — No Emotes tab/grid.** 🟧 · **EMOTE+2 — Missing the basic emote set (≥12).** 🟨 · **EMOTE+3 — Clicking plays no animation.** 🟧 · **EMOTE+4 — No locked/unlockable emotes.** 🟨 · **EMOTE+5 — No cooldown / interrupt-on-move.** 🟨 · **EMOTE+6 — No hover name.** 🟨 Test: a populated emote grid; clicking Wave plays a wave; ≥1 locked emote greyed; hover shows the name.

**Music player (MUSIC):**
- [ ] **MUSIC+1 — No Music tab/track list.** 🟧 · **MUSIC+2 — No now-playing.** 🟨 · **MUSIC+3 — Can't click a track.** 🟧 · **MUSIC+4 — No unlock-on-area-entry.** 🟨 · **MUSIC+5 — No unlock jingle/message.** 🟨 · **MUSIC+6 — No loop/shuffle.** 🟨 · **MUSIC+7 — No volume tie-in.** 🟨 Test: a track list with locked/unlocked + now-playing; clicking plays; entering an area unlocks+jingles; loop/shuffle + slider work.

**Logout / pre-game (LOGIN):**
- [ ] **LOGIN+1 — No Logout tab/control.** 🟨 · **LOGIN+2 — No world-hop.** 🟨 · **LOGIN+3 — No "can't log out in combat" rule.** 🟨 · **LOGIN+4 — No idle auto-logout.** 🟨 Test: a Logout control + world-switch; logout blocked post-combat; idle past threshold logs out.
- [ ] **LOGIN+5 — No title/login screen.** 🟧 · **LOGIN+6 — No world-select.** 🟨 · **LOGIN+7 — No character-name choice.** 🟧 · **LOGIN+8 — No "click to play" gate.** 🟨 · **LOGIN+9 — No loading screen with tips/bar.** 🟨 · **LOGIN+10 — No returning-vs-new branching.** 🟧 · **LOGIN+11 — No post-login welcome screen.** 🟨 · **LOGIN+12 — No security-warning banner.** 🟨 Test: title → world select → name → start → loading bar with tips → welcome screen with last-login/unread; returning players resume.

**Settings, exhaustive (SET):**
- [ ] **SET+4 brightness** 🟧 · **SET+5 default-zoom** 🟨 · **SET+6 roof toggle** 🟧 · **SET+7 idle-timer/logout-notify** 🟨 · **SET+8 data-orbs visibility** 🟨 · **SET+9 four audio sliders** 🟥 · **SET+10 area-sound channel** 🟨 · **SET+11 split-private-chat** 🟨 · **SET+12 profanity filter** 🟨 · **SET+13 chat timestamps** 🟨 · **SET+14 clickable chat names** 🟨 · **SET+15 shift-click-drop** 🟨 · **SET+16 one/two mouse-button mode** 🟧 · **SET+17 middle-mouse-camera toggle** 🟨 · **SET+18 key-bindings UI** 🟧 · **SET+19 Esc-closes toggle** 🟨 · **SET+20 scroll-zoom toggle** 🟨 · **SET+21 Report-Abuse interface** 🟨 · **SET+22 in-game news/MOTD** 🟨 Test: each control exists in the right Settings sub-tab, changes behaviour, and persists.

---

## 29. Render look, animation, audio, mobile & game-feel (deep) 🟥

_Wave-2 critic (client/render/mobile/feel). Folds into §2/§18/§22/§24/§25._

**Rendering / world-look (REN2):**
- [ ] **REN2+1 — No documented default OSRS zoom/pitch + reset.** 🟨 · **REN2+2 — No "roofs hidden inside" + Remove-Roofs toggle.** 🟧 · **REN2+3 — No fog/draw-distance falloff.** 🟧 · **REN2+4 — Ground is one tile, not blended underlay/overlay.** 🟧 · **REN2+5 — Water is a UV pan, no reflection/shoreline foam.** 🟧 · **REN2+6 — Palette double-tonemap on ALL lights/colours, not just sky.** 🟧 (tunic #3f6f8c should measure true in a flat frame) · **REN2+7 — AA hard-locked, no quality toggle.** 🟨 · **REN2+8 — No fixed (765×503) vs resizable mode.** 🟨 · **REN2+9 — No HD/low-detail toggle.** 🟨 · **REN2+10 — Shadow frustum is a ±20 box at origin, doesn't follow the player.** 🟧 · **REN2+11 — Light angle not pinned to the late-afternoon long-shadow art bible.** 🟨 · **REN2+12 — No crisp-texel filtering option (era look).** 🟨 · **REN2+13 — No horizon haze band (hard gradient seam).** 🟨 · **REN2+14 — Facing snaps instantly, no turn-in-place.** 🟨
- [ ] **ANIM+1 — No idle anim (statue when still).** 🟧 · **ANIM+2 — No run anim/state.** 🟧 · **ANIM+3 — No skilling anims.** 🟧 · **ANIM+4 — No attack/hit/defend anim.** 🟧 · **ANIM+5 — No death anim.** 🟧 · **ANIM+6 — NPCs have no idle anim (monk is a mesh-less proxy).** 🟧 · **ANIM+7 — No object anims (fire flicker, furnace glow, fishing bubbles, candle flame).** 🟧 · **ANIM+8 — Walk cycle not tick-quantised.** 🟨 · **ANIM+9 — Click marker is a ring, not the animated X cross; no waving flag.** 🟨 · **ANIM+10 — No eased/FPS-independent camera + UI transitions.** 🟨
- [ ] **SND+1 — No area ambience loop.** 🟧 · **SND+2 — No footsteps (surface-dependent).** 🟨 · **SND+3 — No tutorial/chapel theme.** 🟧 · **SND+4 — No UI-click vs error-buzz.** 🟨 · **SND+5 — No level-up jingle + fireworks.** 🟨 · **SND+6 — No quest/step jingle.** 🟨 · **SND+7 — No eat/drink/equip/drop/bury SFX.** 🟨 · **SND+8 — No skill-action SFX.** 🟨 · **SND+9 — No spatial/attenuated audio.** 🟨 · **SND+10 — No master/music/SFX/area buses + persistence.** 🟧 · **SND+11 — No first-gesture AudioContext unlock (mobile).** 🟨
- [ ] **MOB+1 — No OSRS-mobile HUD reflow on phones.** 🟧 · **MOB+2 — Tap targets <44px / finger tolerance.** 🟧 · **MOB+3 — Long-press radial races with walk.** 🟧 · **MOB+4 — No one-tap vs two-tap setting.** 🟨 · **MOB+5 — No interface-scaling for phones.** 🟧 · **MOB+6 — No mobile orb cluster.** 🟧 · **MOB+7 — No recenter/movement aid.** 🟨 · **MOB+8 — Pinch jitter + page-zoom leak.** 🟨 · **MOB+9 — No landscape/portrait handling (HUD overlaps).** 🟧 · **MOB+10 — No safe-area handling beyond the dialogue box.** 🟨 · **MOB+11 — Haptics uncontrollable, fire on everything.** 🟨 · **MOB+12 — No mobile run toggle.** 🟨
- [ ] **FEEL+1 — No persistent destination flag (marker fades mid-walk).** 🟧 · **FEEL+2 — No Follow verb / click-queue.** 🟨 · **FEEL+3 — No walk-vs-interact cursor.** 🟨 · **FEEL+4 — No top-left live action text.** 🟧 · **FEEL+5 — No right-click on the player (Walk here/Examine self).** 🟨 · **FEEL+6 — No worn gear on the avatar (attach points).** 🟧 · **FEEL+7 — No configurable XP counter.** 🟨 · **FEEL+8 — No death/respawn fade.** 🟨 · **FEEL+9 — No zone/interior transition fade.** 🟨 · **FEEL+10 — No red-X can't-reach feedback.** 🟨 · **FEEL+11 — No orb tooltips/right-click.** 🟨 · **FEEL+12 — No idle/AFK/disconnect handling.** 🟨 · **FEEL+13 — No true-tile model (body free-floats).** 🟨 · **FEEL+14 — Examine opens a modal instead of a chat line.** 🟨 · **FEEL+15 — No hover highlight outline.** 🟨
- [ ] **LOAD+1 — No %/progress bar (static string).** 🟨 · **LOAD+2 — Loader bar would lie about completion.** 🟨 (mitigated by BUG+18 fix) · **LOAD+3 — No connection-lost/reconnect UI.** 🟨 · **LOAD+4 — No retry/styled error (silent catches).** 🟨 · **LOAD+5 — No fixed-timestep sim (FPS-coupled motion/water).** 🟧 · **LOAD+6 — No FPS counter.** 🟨 · **LOAD+7 — No visibilitychange pause (battery drain).** 🟨 · **LOAD+8 — First-frame dt lurch after load.** 🟨 · **LOAD+9 — Anisotropy not capped to device; no compressed textures.** 🟨

---

## 30. Tutorial teaching content, grants, quests & gating (deep) 🟥

_Wave-3 critic (exact OSRS Tutorial Island content, grounded in lessons.json + dialogue.json). The authored
content exists but `dialogue.json`/`lessons.json` are never loaded (DATA+3), so none of these beats fire._

**Per-instructor teaching beats (TEACH):**
- [ ] **TEACH+1 — Halric's 3 opening dialogue options (teach me / I know / where am I) aren't selectable branches.** Test: the greet shows those 3 numbered options, each routing then converging on controls.
- [ ] **TEACH+2 — "I already know" skip-branch doesn't fire its refusal beat.** Test: choosing it prints the impatient refusal and still runs the full controls lesson.
- [ ] **TEACH+3 — Controls beat must teach click-to-move AND camera-drag as separate continues.** Test: walk line, then camera line, as two beats.
- [ ] **TEACH+4 — Player-voiced interjections render on the player side.** Test: "how do I manage my belongings?" shows player-side before Halric's tabs answer.
- [ ] **TEACH+5 — "Open the Settings tab" beat: flash that stone + block until opened.** Test: L1 flashes Settings, blocks until clicked, then advances.
- [ ] **TEACH+6 — Maeve's 4-skill preview line missing.** · **TEACH+7 — "why do I need all this?" branch.** Test: greet enumerates the survival skills + offers the why option.
- [ ] **TEACH+8/+9 — Woodcutting split into give-axe+inventory beat then chop beat; Inventory tab callout.** Test: axe+satchel beat, then a separate chop beat; Inventory stone flashes on receive.
- [ ] **TEACH+10/+11 — Firemaking re-entry is state-aware ("logs in hand") + "how do I light a fire?" sub-option.** Test: with logs → fire-intro (not greet); the sub-option prints the tinderbox-on-logs line.
- [ ] **TEACH+12 — Fishing "Where do I fish?" + shimmer-edge instruction.** Test: fish-how prints the shimmer-edge cast line.
- [ ] **TEACH+13 — Cooking burn-warning is its own beat (intro→burnt→done).** Test: three distinct cook beats incl. the burn warning.
- [ ] **TEACH+14..16 — Tobin: skeptic branch + flour/water split + optional bake-on-range.** Test: those beats fire; baking is offered, not required.
- [ ] **TEACH+17/+18 — Edda: "what's in the books?" branch + player-voiced journal confirm.** Test: both render; journal question is player-side.
- [ ] **TEACH+19..22 — Doran: "it's dark" branch + full tin→copper→smelt→smith chain preview, then gated per link + rock visual-cue hints + how/what sub-questions.** Test: opener previews the chain; each link is its own re-talk beat.
- [ ] **TEACH+23..26 — Vael: "do I have to fight?" branch + Equipment-tab-open gate + wield gate + ranged "how do I shoot?" arrow-cost warning + Combat-tab styles beat.** Test: each fires; Equipment+Combat stones flash at their beats.
- [ ] **TEACH+27/+28 — Wynn: "is my property safe?" branch + guided deposit-then-withdraw gate.** Test: bank round-trip gates L13.
- [ ] **TEACH+29/+30 — Brann: account/poll fork + player poll-confirm + security script + Account-tab open.** Test: both options converge; account tab flashes; security guidance prints.
- [ ] **TEACH+31..33 — Aldric: "what good is prayer?" doubt branch + bury-bones split + Friends/Ignore social beat that unlocks those tabs.** Test: bones-do gates on a real bury; social unlocks Friends+Ignore.
- [ ] **TEACH+34..36 — Sorrel: "I'm no wizard" branch + two-beat rune grants (air then mind) + named practice-chicken cast target.** Test: Magic stone flashes; runes given in two beats with the deplete warning; cast targets the chicken.
- [ ] **TEACH+37/+38 — Dock-Halric: advice branch loop + state-aware completion recap (chopper/fisher/smith/fighter/mage).** Test: the recap line lists the taught skills, reachable only after L16.
- [ ] **TEACH+39 — Ambient NPC (Wenna/Joss/Maven) flavour branches aren't wired.** Test: each offers its 2 options resolving to a bye line, no lesson effect.
- [ ] **TEACH+40 — Every instructor's "go to X next" handoff retargets the arrow/marker.** Test: completing each instructor names the next NPC + moves the guidance arrow onto them.
- [ ] **TEACH+41..45 — Per-step overlay arrow on the named target · per-step UI-element highlight bound to the lesson's tab · "click here to continue" between beats · step detail string in the objective pill · per-substep "well done" acknowledgement.** Test: each step points the arrow at its exact object, flashes its mapped tab, shows continue + detail + acknowledgement.

**Item grants (GRANT):**
- [ ] **GRANT+1 — Grants fire mid-dialogue on the named node, not at lesson start.** Test: the axe appears only on Maeve's wood-intro line.
- [ ] **GRANT+2..8 — Exact grant chain/order:** Maeve axe→tinderbox→net; Tobin flour+water (dough is produced); Doran pickaxe+hammer (bar+dagger produced, NOT granted — lessons.json wrongly grants them); Vael leather+gloves then shortbow+arrows; Brann poll_card; Edda quest_journal; Aldric bones; Sorrel air+mind runes; dock-Halric tutorial_cape. Test: each item arrives from the right instructor on the right line; produced items are crafted not gifted.
- [ ] **GRANT+9 — "Already have this" guard (no duplicate tools; lost items re-issued once).** Test: re-talking Maeve doesn't add a 2nd axe; a lost axe is re-issued exactly once.

**Quest system (QUEST):**
- [ ] **QUEST+1 — No quests.json schema backing the journal.** Test: a quest data file with name/difficulty/reqs/QP/state; journal renders from it.
- [ ] **QUEST+2 — No red/yellow/green state wiring.** · **QUEST+3 — No quest-start → "started" flow.** · **QUEST+4 — No in-progress journal narrative.** Test: states colour correctly; accepting flips red→yellow; clicking shows progress parchment.
- [ ] **QUEST+5/+6 — No completion scroll + reward + QP fanfare; QP total not persisted/incrementing.** Test: completing shows a reward scroll + jingle; "Quest Points: N" increments and persists.
- [ ] **QUEST+7 — No requirements display (green/red by met).** · **QUEST+8 — No future/greyed quests (player explicitly wants ≥3).** · **QUEST+9 — No Free/Members/Misc grouping + counts.** Test: a quest shows met/unmet reqs; ≥3 named future Eldermoor quests in red; grouped headers with counts.
- [ ] **QUEST+10/+11 — "Wardens' Isle Tutorial" tracked as a journal entry that flips complete on departure + a persisted tutorial_complete flag gating re-entry.** Test: the tutorial shows as tracked then green-complete; re-entry gated.
- [ ] **QUEST+12 — No on-screen quest-tracker overlay (separate from the journal).** Test: a toggleable tracker shows the active step.

**Gating predicates (GATE):**
- [ ] **GATE+1 — The 14 named gate objects (doors/gates/ladders/objects) aren't real locks.** Test: each named gate exists and stays locked until its predicate passes.
- [ ] **GATE+2 — complete_when predicates (flag/has/lit/killed/cast) aren't evaluated.** Test: L8 unlocks only when has:tin-ore && has:copper-ore.
- [ ] **GATE+3..9 — Specific bindings:** spawn-house door ← controls_taught (not mere greeting); fire gate ← lit:fire; survival gate ← has:cooked-shrimp (not raw); mine down ladder ← quests_taught, up ladder ← has:bronze-dagger; combat gate ← ranged-kill (not melee); mainland ← departed; plus same-zone "lesson:LN" soft-gates with no physical door. Test: each transition opens only on its exact predicate.
- [ ] **GATE+10 — No "speak to <current instructor> first" nudge on a locked gate / skip-ahead.** Test: poking a locked door or a not-yet-current instructor prints the nudge tied to the active lesson.

---

## 31. Persistence, multiplayer, networking, security, a11y, i18n & future (deep) 🟧

_Wave-3 critic. Mostly infrastructure + post-tutorial; lower priority than §1–§30 but tracked so nothing is lost.
Verified against v16: zero localStorage, zero networking, no other-players, no ARIA/keyboard-nav, English-only._

**Persistence (SAVE):** 🟧
- [ ] **SAVE+1 — Zero localStorage; ALL state is RAM-only, dies on reload.** Test: chop/move/open-tab + hard-refresh → all restored.
- [ ] **SAVE+2 — No versioned save schema/migration.** · **SAVE+3..11 — Nothing persists:** appearance, equipment, bank, skills/XP, tutorial progress, settings, friends/ignore, quick-prayers/chat-filter/style, XP-counter config. · **SAVE+12 — No per-character save namespacing.** · **SAVE+13 — No corruption/quota handling (would white-screen).** · **SAVE+14 — No autosave/save-on-unload.** Test: a single versioned `saveState()`/`loadState()` round-trips every listed structure, keyed per character, with graceful corruption fallback + unload flush.

**Multiplayer presence (MP):** 🟨 (single-player today)
- [ ] **MP+1..8 — No other players at all:** no remote-avatar system, no white player nameplates (skull/level), no white minimap dots, no player-count, players-don't-collide rule, PvP-off-on-tutorial guarantee, remote public-chat bubbles, right-click-player (Follow/Trade/Report/Examine). Test: a stub presence layer renders ≥1 remote avatar with the correct plate/dot/menu and non-blocking movement.

**Trade (TRADE):** 🟨
- [ ] **TRADE+1..6 — No trade at all:** request flow, first offer screen (dual grids), second-confirm anti-scam screen, value/wealth-warning, full-bag guard, decline/walk-away abort. Test: a full trade round-trip with both confirmation screens + the guards.

**Networking (NET):** 🟨
- [ ] **NET+1..6 — No client/server split:** no transport, no tick reconciliation, no lag/rubber-band/input-buffer, no live-session reconnect-and-resume, no login queue, no specific login error states. Test: a transport abstraction routes actions through a server tick with reconnect + queue + coded errors.

**Security/anti-cheat (SEC2):** 🟧
- [ ] **SEC2+1..6 — Client-authoritative everything (console can mint XP/items):** no action precondition validation, no rate-limit/flood guard, no PIN lockout/recovery-delay model, no bot-detection framing, no session token/replay protection. Test: documented server-authoritative model; local build flags client-authority as dev-only; PIN lockout rules defined.

**Accessibility (A11Y):** 🟧
- [ ] **A11Y+1..9 — No colourblind mode (hitsplats/dots/chat are colour-only), no text-size/UI-scale, zero ARIA/screen-reader, no keyboard nav/focus ring, context menu mouse-only, no reduced-motion guard on flashes/pulses, no modal focus-trap/Esc, native-`title`-only tooltips.** Test: a colourblind toggle + text-size + UI-scale + ARIA roles + Tab/Enter nav + reduced-motion + modal Esc/focus-trap all present.

**Internationalization (I18N):** 🟨
- [ ] **I18N+1..4 — No locale selection, all strings hard-coded (no `t(key)` table), no number/quantity localization, no RTL.** Test: a language selector swaps a string table; numbers format per locale; `dir=rtl` mirrors the HUD cleanly.

**World map (WMAP):** 🟧
- [ ] **WMAP+1..6 — No world-map interface beyond the (also-missing) button:** no pannable/zoomable overlay, no "you are here", no legend, no POI icons, no search/link, no hover-highlight. Test: a world-map button opens a pannable map centred on the player with a legend + typed POI icons + search.

**Future-scope (FUT):** 🟨 — noted so they're not forgotten; NOT required for Tutorial Island parity.
- [ ] **FUT+1..8 — Collection Log · Achievement Diary · Combat Achievements · Grand Exchange · Grouping/Party · Hiscores · Player-owned house · Shops with stock.** Test: tracked as post-tutorial; item `value` fields + QJ4 sub-tabs + MP presence + server-authoritative XP should be designed forward-compatible with these.

---

## Tally

| Section | Items |
|---|---|
| 1 World scope | 7 |
| 2 Camera | 9 |
| 3 Movement/overworld | 18 |
| 4 Minimap | 16 |
| 5 HUD chrome/orbs | 14 |
| 6 Inventory | 16 |
| 7 Stats/Skills | 11 |
| 8 Equipment | 10 |
| 9 Combat | 10 |
| 10 Prayer | 8 |
| 11 Magic | 9 |
| 12 Quests | 9 |
| 13 Settings | 8 |
| 14 Missing tabs | 13 |
| 15 Chatbox | 16 |
| 16 Dialogue | 9 |
| 17 NPCs | 9 |
| 18 Rooms/render (symptoms) | 6 |
| 19 Flow/gating | 12 |
| 20 Per-zone room content | 13 |
| 21 Systems | 14 |
| 22 Audio | 5 |
| 23 Character creation | 3 |
| 24 Polish | 7 |
| 25 Code defects | 28 |
| 26 Items / Use-on / ground / banking (deep) | 49 |
| 27 Combat & skilling mechanics (deep) | 52 |
| 28 Social / account / music / pre-game (deep) | 77 |
| 29 Render / animation / audio / mobile / feel (deep) | 71 |
| 30 Tutorial teaching content / grants / quests / gating (deep) | 76 |
| 31 Persistence / multiplayer / net / security / a11y / i18n / future (deep) | 67 |
| **Total** | **~645** |

---

## Suggested attack order (highest visible-parity ROI first)

1. **Code defects that break the look (§25): REND+2/+3, PERF+3, REND+5, BUG+1.** Kills the "inside/outside glitch" + names-through-walls on sight. Cheap, high impact.
2. **Interaction layer: OW1–OW5, OW+1/+6, INV1–INV2, SK1, CH1/CH+6.** Make the things you already see *do something* — clickable trees/rocks/examine, wield, right-click items, open skill guides, working chat tabs, hover affordance.
3. **Minimap MM1–MM6 + HUD orbs HUD1–HUD2 + camera keys CAM1.**
4. **Fill the empty tabs: PR/MG/QJ/ST/EQ/CB real panels** (PR1, MG1, QJ1/QJ2, ST1, EQ1/EQ+3, CB1/CB2).
5. **Flow + gating + character creation: FLOW1–3, FLOW7–9, CC1.** Turn it into the actual tutorial.
6. **Systems + world build-out: SYS*, W1–W2, ROOM1–13.** The long tail of content.
7. **Audio AUD* + remaining polish PX*.**

> **Loop note:** re-audit each pass — re-read the live build, add any missed micro-gap, tighten Test
> conditions, re-tally. Target: nothing the player can click, hover, or right-click is left unspecified.
</content>
