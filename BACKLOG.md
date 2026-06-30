# BACKLOG.md — Eldermoor

Outstanding work to 100%. Item-level pass/fail tests in `PARITY_AUDIT.md` (~645 items); phase status in
`ROADMAP.md`. This is the prioritized feature backlog.

## P0 — promote integrated → done
- [ ] **Live-playtest pass** on the deployed link for every "integrated + boot-verified" feature; demote any
      that doesn't actually fire in 3D. *(the gate blocking ~all features from "complete")*
- [ ] Wire the tutorial lesson chain to **gate real actions** (lock doors/zones until the step is done).
- [ ] Fixed ~0.6s game tick for actions/combat.

## P1 — combat & skilling depth
- [~] Ranged combat (integrated, untested) · [ ] Magic cast (Wind Strike → mob, consume runes, XP).
- [ ] Prayer points pool + activation drain + bury-bones.
- [ ] Route smithing/cooking through the Make-X interface; per-tick gather rolls + depletion already exist.
- [ ] Equipment renders on the 3D avatar.

## P2 — world build-out (needs assets via build_kit.py)
- [ ] 9 missing zones: spawn house, full survival area, cook's house, quest house, mine/underground,
      combat ring, bank building, wizard area, departure dock.
- [ ] Instructor roster placed in-world (data authored; NPCs not placed).
- [ ] Openable doors/gates between zones.

## P3 — systems
- [ ] Trading (player-to-player) · multiplayer presence.
- [ ] Bank PIN/tabs/search/notes/placeholders.
- [ ] Quest accept/track/complete flow + reward screen.
- [ ] Real per-zone music + full action-SFX coverage.

## P4 — polish / later
- [ ] Mobile HUD reflow · accessibility (colourblind/text-scale/keyboard nav) · i18n.
- [ ] World-map POI search; collection log / diaries / GE (future scope).
- [ ] Perf/LOD (InstancedMesh scatter), camera collision, engine-port bridge.

**Counts:** ~38 features integrated, ~52 remaining (see METRICS.md).
</content>
