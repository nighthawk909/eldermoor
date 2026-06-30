# NEXT_TASKS.md — Eldermoor

The immediate, ordered next tasks. Each is one focused chunk (one file where possible) for a single agent.
Source of truth for the wider list: `BACKLOG.md` / `ROADMAP.md` / `PARITY_AUDIT.md`.

## Recently shipped (v24–v25)
- [x] **Ranged combat** (`combat.js`, v24) — bow + arrows consume ammo, projectile, max range, melee fallback,
      Ranged+HP XP. Integrated + boot-verified; live-playtest pending.
- [x] **Magic cast** (`magic-tab.js`, v24) — click combat spell → target a mob, consume runes, bolt projectile,
      Magic+HP XP. Integrated + boot-verified; live-playtest pending.
- [x] **Prayer points** (`prayer-tab.js`, v25) — point pool = Prayer level, activation drain, bury-bones for XP.
- [x] **Make-X smith/cook** (`skilling.js`, v25) — smithing (anvil) + cooking (range) routed through Make-X.
- [x] **Quest accept/complete** (`quests-tab.js`, v25) — accept → track → complete flow + QP increment.
- [x] **Action SFX** (`sfx-actions.js`, v25) — chop/mine/fish/smith/hit/eat cues wired to actions.
      All v25 integrated + cache-free boot-verified (commit 88eaa61); live-playtest pending.

## Next 10 (assignable now, mostly distinct files)
1. **Lesson gating** (`src/gating.js`, new): lock zones/doors until `EMLESSON` clears the step + OSRS nudge.
2. **Worn gear on avatar** (`appearance-apply.js` or new): attach/colour wielded weapon + armour on the model.
3. **Bank depth** (`bank.js`): tabs, search, withdraw-as-note, placeholders.
4. **Spawn house zone** (`build_kit.py` + manifest): first enclosed room + the Guide instructor placed.
5. **Fixed ~0.6s combat/action tick** (`combat.js`/`skilling.js`): drive hits + gather rolls off one cadence.
6. **Instructor roster placed in-world** (manifest + `npc.js`): place the authored instructor NPCs per zone.
7. **Openable doors/gates** (`world.js`/`interact.js`): door objects toggle passability between zones.
8. **Per-zone music** (`music-tab.js`/`audio.js`): real per-zone tracks beyond the procedural cues.
9. **Trading + multiplayer presence**: player-to-player trade (two-screen confirm); other-player dots.
10. **Live-playtest harness**: a checklist run on the deployed URL promoting integrated → done.

## Hard rules for every task
- Straight ASCII quotes only; escape `'` inside single-quoted strings as `\'`.
- One file per agent where possible; new modules export `init*()` for `main.js` wiring.
- Verify with a real browser boot (cache-free copy or deployed URL) — `node --check` alone is insufficient.
- Never deploy from a subagent; the orchestrator integrates + boot-verifies + deploys.
</content>
