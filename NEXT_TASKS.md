# NEXT_TASKS.md — Eldermoor

The immediate, ordered next tasks. Each is one focused chunk (one file where possible) for a single agent.
Source of truth for the wider list: `BACKLOG.md` / `ROADMAP.md` / `PARITY_AUDIT.md`.

## Recently shipped (v24)
- [x] **Ranged combat** (`combat.js`) — bow + arrows consume ammo, projectile, max range, melee fallback,
      Ranged+HP XP. Integrated + boot-verified; live-playtest pending.
- [x] **Magic cast** (`magic-tab.js`) — click combat spell → target a mob, consume runes, bolt projectile,
      Magic+HP XP. Integrated + boot-verified; live-playtest pending.

## Next 10 (assignable now, mostly distinct files)
1. **Prayer points** (`prayer-tab.js`): point pool = Prayer level, activation drain, bury-bones for XP.
2. **Make-X wiring** (`skilling.js`): route smithing (anvil) + cooking (range) through `window.EMMAKE`.
3. **Lesson gating** (`src/gating.js`, new): lock zones/doors until `EMLESSON` clears the step + OSRS nudge.
4. **Worn gear on avatar** (`appearance-apply.js` or new): attach/colour wielded weapon + armour on the model.
5. **Quest flow** (`quests-tab.js`): accept → track → complete + reward scroll + QP increment.
6. **Bank depth** (`bank.js`): tabs, search, withdraw-as-note, placeholders.
7. **Spawn house zone** (`build_kit.py` + manifest): first enclosed room + the Guide instructor placed.
8. **SFX coverage** (`audio.js`): chop/mine/fish/smith/hit/door/eat cues wired to actions.
9. **Fixed ~0.6s combat/action tick** (`combat.js`/`skilling.js`): drive hits + gather rolls off one cadence.
10. **Live-playtest harness**: a checklist run on the deployed URL promoting integrated → done.

## Hard rules for every task
- Straight ASCII quotes only; escape `'` inside single-quoted strings as `\'`.
- One file per agent where possible; new modules export `init*()` for `main.js` wiring.
- Verify with a real browser boot (cache-free copy or deployed URL) — `node --check` alone is insufficient.
- Never deploy from a subagent; the orchestrator integrates + boot-verifies + deploys.
</content>
