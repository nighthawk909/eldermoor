# NEXT_TASKS.md — Eldermoor

The immediate, ordered next tasks. Each is one focused chunk (one file where possible) for a single agent.
Source of truth for the wider list: `BACKLOG.md` / `ROADMAP.md` / `PARITY_AUDIT.md`.

## In flight
- [~] **Ranged combat** (`combat.js`) — integrated, boot-verify + playtest pending.

## Next 10 (assignable now, mostly distinct files)
1. **Magic cast** (`magic-tab.js`): cast Wind Strike on a mob — consume air+mind runes, projectile, Magic XP.
2. **Prayer points** (`prayer-tab.js`): point pool = Prayer level, activation drain, bury-bones for XP.
3. **Make-X wiring** (`skilling.js`): route smithing (anvil) + cooking (range) through `window.EMMAKE`.
4. **Lesson gating** (`src/gating.js`, new): lock zones/doors until `EMLESSON` clears the step + OSRS nudge.
5. **Worn gear on avatar** (`appearance-apply.js` or new): attach/colour wielded weapon + armour on the model.
6. **Quest flow** (`quests-tab.js`): accept → track → complete + reward scroll + QP increment.
7. **Bank depth** (`bank.js`): tabs, search, withdraw-as-note, placeholders.
8. **Spawn house zone** (`build_kit.py` + manifest): first enclosed room + the Guide instructor placed.
9. **SFX coverage** (`audio.js`): chop/mine/fish/smith/hit/door/eat cues wired to actions.
10. **Live-playtest harness**: a checklist run on the deployed URL promoting integrated → done.

## Hard rules for every task
- Straight ASCII quotes only; escape `'` inside single-quoted strings as `\'`.
- One file per agent where possible; new modules export `init*()` for `main.js` wiring.
- Verify with a real browser boot (cache-free copy or deployed URL) — `node --check` alone is insufficient.
- Never deploy from a subagent; the orchestrator integrates + boot-verifies + deploys.
</content>
