# NEXT_TASKS.md — Eldermoor

The immediate, ordered next tasks. Each is one focused chunk (one file where possible) for a single agent.
Source of truth for the wider list: `BACKLOG.md` / `ROADMAP.md` / `PARITY_AUDIT.md`.

## Recently shipped (v24–v27)
- [x] **Ranged combat** (`combat.js`, v24) — bow + arrows consume ammo, projectile, max range, melee fallback.
- [x] **Magic cast** (`magic-tab.js`, v24) — combat spell → mob, consume runes, bolt projectile, Magic+HP XP.
- [x] **Prayer points** (`prayer-tab.js`, v25) — point pool = Prayer level, activation drain, bury-bones for XP.
- [x] **Make-X smith/cook** (`skilling.js`, v25) — smithing (anvil) + cooking (range) routed through Make-X.
- [x] **Quest accept/complete** (`quests-tab.js`, v25) — accept → track → complete flow + QP increment.
- [x] **Action SFX** (`sfx-actions.js`, v25) — chop/mine/fish/smith/hit/eat cues wired to actions.
- [x] **Lesson gating** (`src/gating.js`, v26, commit 11484f9) — gates skill/combat/bank actions + regions by
      tutorial step with OSRS nudge; anti-brick while instructors/zones absent.
- [x] **Fixed 0.6s global game tick** (`src/tick.js`, v27, commit e68d1b8) — one shared clock; combat +
      skilling subscribe to it. (7/7 functional test.)
      All v24–v27 integrated + boot-verified; **live-playtest pending** for the lot.
- [x] **Claude Code policy config** (commit 3a9fe8d) — settings + Session/Pre/Post/Stop hooks, validated.
- [x] **Mobile Sprint 1A — responsive UI framework** (v28→v29, `mobile-ui.js`/`emotes.js`/`charcreate.js`/`inventory-ops.js`):
      orientation detection, single-panel docking, bottom-sheet dialogue, chat collapse, objective auto-hide+persist,
      stray emote FAB removed, character name entry; **v29 QA fixes:** dedicated landscape layout, top-right HUD
      cluster de-overlap, responsive panel sizing (no clip), inventory long-press context menu on mobile
      (tap/long-press/Examine/Drop). 26/26 headless UI test. **Awaiting Josh's on-device QA before 1B.**
      *RESOLVED v35: character-creator part SHAPES now render on the in-world body via the procedural
      avatar (`avatar.js`). A higher-fidelity Blender-authored multi-part model can replace it later behind
      the same data contract (BACKLOG).*

## Test infrastructure (v30, owner-requested — supports the QA loop, not a milestone)
- [x] **Dev test character** (`devtest.js`): all skills 99 + combat kit each load (idempotent; toggle EMDEV).
- [x] **In-game QA panel** (`qa-panel.js` + `assets/data/qa.json`): per-item Pass/Fail/Skip + notes, one
      Copy/Share/Download report. **Process:** update `assets/data/qa.json` every release with what to test.
- [x] **Live QA sync** (v31, `api/qa.js` + Vercel KV): QA panel auto-POSTs results; dev reads `GET /api/qa`.
      **Setup (Josh):** connect Vercel KV + redeploy (HUMAN_ACTIONS.md).
- [x] **v32 QA findability**: version on the QA button (HUD hides the old version bar); XP counter de-overlap.
- [x] **v33 character-creator live preview**: 2D paper-doll updates on every part/colour toggle.
- [x] **v34 mobile 1A QA round 3**: inventory tap action, equip-slot display fix, compact dialogue dock,
      objective recall pill, collapsible tabs, landscape tab-bar fix. (Deferred: equip-on-avatar+eat anim=1B;
      combat anim/respawn=1C; QA live-sync=connect Vercel KV.)
- [x] **v35 parameterized player avatar** (`avatar.js`): character-creator parts + colours + body type now
      render on the in-world 3D body (was colour-only); limb pivots drive the walk cycle; worn weapon/shield
      show in the hands; `bury` op added. Fixed a glb-vs-avatar render race (loaders.js re-asserts the avatar
      after `player.glb` loads). Agent-QA'd before owner QA + 10/10 THREE-stub logic test.
- [x] **v36 worn gear on avatar + v35-QA fixes**: `avatar.js` renders ALL worn slots (weapon/shield/body/
      cape/gloves + helm/legs/feet anchors), not just weapon/shield; unequip removes the mesh. Tab panel
      translucent so the character is visible while equipping (`mobile-ui.js`). Name entry enforces 2–12
      chars w/ live counter. Objective fixed: dropped the bogus hardcoded "Brother Aldric" line + charcreate
      fires `appearance_confirmed` so L0 completes and the objective advances. Agent-QA'd + 8/8 logic test.
      **Awaiting on-device QA (dispatch can screenshot).**

## Still open from v35/v36 owner QA (next focused rounds)
- [ ] **1C combat smoke**: character must PATH to a distant mob before attacking; add death/respawn +
      basic attack/death animation. (FAIL in v35 QA.)
- [ ] **Landscape panel polish**: inventory/equipment panel clipping "top-right stuff" in landscape. (FAIL.)
- [ ] **3D in-creator preview**: current creator preview is 2D + basic — replace with the live 3D avatar.

## Mobile Sprint 1 — remaining milestones (sequential, each gated by on-device QA)
- **1B** Inventory + Equipment mobile interactions (tap/long-press use/wield/drop on touch).
- **1C** Combat loop end-to-end on mobile (path → attack → hits → death → respawn).
- **1D** Tutorial progression (lesson gating active, objectives, NPC dialogue flow).
- **1E** Audio, settings, prayer toggles, save/load, logout.

## Next 10 (deferred until Mobile Sprint 1 passes)
1. **Worn gear on avatar** (`appearance-apply.js` or new): attach/colour wielded weapon + armour on the model.
2. **Bank depth** (`bank.js`): tabs, search, withdraw-as-note, placeholders.
3. **Spawn house zone** (`build_kit.py` + manifest): first enclosed room + the Guide instructor placed.
4. **Instructor roster placed in-world** (manifest + `npc.js`): place the authored instructor NPCs per zone
   (also activates lesson gating, which is anti-brick/open until instructors exist).
5. **Openable doors/gates** (`world.js`/`interact.js`): door objects toggle passability + feed `EMGATE` regions.
6. **Per-zone music** (`music-tab.js`/`audio.js`): real per-zone tracks beyond the procedural cues.
7. **Trading + multiplayer presence**: player-to-player trade (two-screen confirm); other-player dots.
8. **Bank PIN** (`bank.js`): 4-digit PIN gate on withdraw/settings.
9. **Quest reward screen** (`quests-tab.js`): reward scroll UI on completion.
10. **Live-playtest harness**: a checklist run on the deployed URL promoting integrated → done.

## Fleet tooling (new — supports the parallel build, not a milestone)
- [x] **Live KANBAN dashboard** (`dashboard.html` + `progress.json` + `api/progress.js` + `tools/progress.js`):
      columns To Do / Building / Review / Shipped / Done, deployed to prod (KV connected), phone-visible at
      https://eldermoor.vercel.app/dashboard.html . New `shipped` status = boot-verified + deployed, awaiting
      your playtest. Agents report with `node tools/progress.js set <id> <status> [note] --agent NAME`.
      *Open: auto-report wired into agent definitions so the board self-populates.*

## P1 render-correctness wave — SHIPPED (awaiting your playtest)
- [~] All 8 P1 fixes shipped + boot-verified + deployed (see ROADMAP P1). **Your call:** playtest the
      deployed link and confirm the chapel scene looks right (sky gradient, no water holes, terrain/floor
      seam, altar glow fade) → then I promote them to `done`. P1.6 roof is wired but dormant (no roofed
      building asset exists yet).

## Hard rules for every task
- Straight ASCII quotes only; escape `'` inside single-quoted strings as `\'`.
- One file per agent where possible; new modules export `init*()` for `main.js` wiring.
- Verify with a real browser boot (cache-free copy or deployed URL) — `node --check` alone is insufficient.
- Never deploy from a subagent; the orchestrator integrates + boot-verifies + deploys.
</content>
