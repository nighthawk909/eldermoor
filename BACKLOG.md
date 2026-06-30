# BACKLOG.md — Eldermoor

Outstanding work to 100%. Item-level pass/fail tests in `PARITY_AUDIT.md` (~645 items); phase status in
`ROADMAP.md`. This is the prioritized feature backlog.

## Test infrastructure (v30 — supports QA; keep current each release)
- [x] Dev test character (`devtest.js`) — all skills 99 + combat kit every load (idempotent; `EMDEV` toggle).
- [x] In-game QA panel (`qa-panel.js` + `assets/data/qa.json`) — per-item Pass/Fail/Skip + notes, one-tap
      Copy/Share/Download report. **Per-release chore:** refresh `assets/data/qa.json` with the build's test items.
- [ ] *(future)* QA report auto-delivery (needs a backend/endpoint — currently the tester sends the report
      blob back manually; the static client + sandbox network can't POST it).

## P0 — Mobile Playability (Sprint 1, ACTIVE — blocks new gameplay)
- [~] **1A Responsive UI framework** (v28→v29) — orientation, single-panel docking, bottom-sheet dialogue,
      chat collapse, objective auto-hide+persist, ≥44px touch targets, haptics, name entry, FAB removed;
      v29 QA fixes: dedicated landscape layout, top-right HUD cluster de-overlap, responsive panel sizing
      (no clip), inventory long-press context menu. Boot-verified (26/26 headless UI test); **re-QA on device.**
- [ ] **Parameterized player model (avatar customization made fully visible).** The character creator
      already SAVES every selection (parts + colours + name) in `eldermoor:appearance` (decision (a),
      kept). Today the single static glTF only reflects **colours** via `appearance-apply.js`. Build a
      parameterized/multi-part player model so the saved selections become visible without changing the
      save format: **hair, beard, head/face, torso (incl. robe/dress), arms, hands, legs (incl. skirts),
      footwear (boots/shoes/sandals)**, body type, plus colour tinting per part. Approach: author
      part meshes in Blender (`build_eldermoor.py`/kit) exported as togglable sub-meshes or a small set of
      swappable glTFs keyed by the existing part ids; `appearance-apply.js` shows/hides + tints by id.
      Constraint: **must read the current save shape as-is** (no migration). Keep ALL customization options
      that are part of the long-term vision — do not trim the creator to match current model limits.
- [ ] **1B** Inventory + Equipment mobile interactions.
- [ ] **1C** Combat loop end-to-end on mobile.
- [ ] **1D** Tutorial progression on mobile.
- [ ] **1E** Audio, settings, prayer, save/load, logout on mobile.

## P0 — promote integrated → done
- [ ] **Live-playtest pass** on the deployed link for every "integrated + boot-verified" feature; demote any
      that doesn't actually fire in 3D. *(the gate blocking ~all features from "complete")*
- [ ] **Production promotion** of v27 to the eldermoor.vercel.app production alias (`vercel --prod`, done
      outside the sandbox) — currently the latest push deploys as a preview.
- [x] Wire the tutorial lesson chain to **gate real actions** — `src/gating.js` (v26): gates skill/combat/bank
      actions + movement regions by lesson step with OSRS nudge; anti-brick until instructors/zones exist.
- [x] Fixed ~0.6s game tick for actions/combat — `src/tick.js` (v27): one shared `EMTICK` clock; combat +
      skilling subscribe to it. Integrated + boot-verified (7/7 functional test); live-playtest pending.

## P1 — combat & skilling depth
- [x] Ranged combat (bow+arrows, projectile, Ranged+HP XP) — integrated v24, playtest pending.
- [x] Magic cast (combat spell → mob, consume runes, bolt projectile, Magic+HP XP) — integrated v24, playtest pending.
- [x] Prayer points pool + activation drain + bury-bones — integrated v25, playtest pending.
- [x] Route smithing/cooking through the Make-X interface — integrated v25, playtest pending.
- [ ] Equipment renders on the 3D avatar.

## P2 — world build-out (needs assets via build_kit.py)
- [ ] 9 missing zones: spawn house, full survival area, cook's house, quest house, mine/underground,
      combat ring, bank building, wizard area, departure dock.
- [ ] Instructor roster placed in-world (data authored; NPCs not placed).
- [ ] Openable doors/gates between zones.

## P3 — systems
- [ ] Trading (player-to-player) · multiplayer presence.
- [ ] Bank PIN/tabs/search/notes/placeholders.
- [~] Quest accept/track/complete flow — accept/complete + QP increment integrated v25; reward screen pending.
- [~] Audio: action-SFX coverage integrated v25 (`sfx-actions.js`); real per-zone music still pending.

## P4 — polish / later
- [ ] Mobile HUD reflow · accessibility (colourblind/text-scale/keyboard nav) · i18n.
- [ ] World-map POI search; collection log / diaries / GE (future scope).
- [ ] Perf/LOD (InstancedMesh scatter), camera collision, engine-port bridge.

**Counts:** ~46 features integrated, ~44 remaining (see METRICS.md).

**Tooling:** policy-driven Claude Code config installed (commit 3a9fe8d) — `.claude/settings.json` +
SessionStart/PreToolUse/PostToolUse/Stop hooks (validated). Governs session bootstrap, destructive-git
approval, doc-staleness flagging, and stop-gating.
</content>
