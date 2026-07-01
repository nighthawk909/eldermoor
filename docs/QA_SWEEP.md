# QA Sweep - Static Defect Review (v37 to v55 session)

Reviewed at commit 1f1d4c5. Deterministic checks: node --check on all 49 src/*.js files (all pass), plus JSON.parse validation on all 15 assets/data/*.json files (all valid). Static tracing then covered the five risk areas: monkey-patch conflicts, cross-module mob resolver agreement, init order, RAF/interval leaks, and event wiring.

## Deterministic checks

    node --check src/*.js      -> 49/49 files OK, zero syntax errors
    JSON.parse assets/data/*.json (15 files) -> 15/15 valid

No client-side syntax or JSON regressions in this session output.

## Confirmed defects

### 1. lit:fire lesson predicate has no real dispatcher - L4 Firemaking never completes on the actual action, only via the 15s anti-brick timeout.

Files: src/lessons.js:174-176 (evalAtom treats lit:/killed:/cast: as namespaced flags set only via em-flag), src/skilling.js:265 (light()) and src/skilling.js:115-147 (tick() success path) - neither ever dispatches a lit:fire em-flag event.

Evidence: grepping for the lit: prefix across src/*.js shows the string only in comments/switch-case in lessons.js; combat.js and magic-tab.js both dispatch their own namespaced flags (killed:<mob>, cast:<spell>) on success, but no module anywhere dispatches lit:fire.

Impact: assets/data/lessons.json line 71 sets complete_when to lit:fire for the Firemaking lesson. Per lessons.js onLessonEvent (the action-predicate branch, lines 298-364), since the predicate never evaluates true, the lesson can only ever complete via the 15s ACTION_GRACE_MS anti-brick timeout, regardless of whether the player actually lit a fire. Not a hard brick (the grace timer is real and does fire), but it is a UX/parity gap: successfully lighting the fire immediately does not advance the lesson - the player silently waits out a fixed 15s clock every time, which reads as a bug.

Fix: in skilling.js tick() success branch for the light verb (or in begin() one-shot completion for light), dispatch an em-flag CustomEvent with detail lit:fire right after the success chat line, so lessons.js evalAtom (line 174) can observe it via flagSet and lessons.js existing em-flag listener (onFlagEvent, line 369) completes the lesson in real time - falling back to the grace timer only if firemaking is ever removed or rebalanced.

### 2. em-settings-change is dispatched but has zero listeners anywhere in the repo (orphaned event).

File: src/settings-tab.js line 122 dispatches a CustomEvent named em-settings-change with detail id/value.

Evidence: grepping the whole repo for em-settings-change returns exactly one hit - the dispatch site itself. No addEventListener for em-settings-change exists in any src/*.js file.

Impact: harmless (no error, no dropped functionality - sfx-actions.js and audio.js both re-read window.EMSETTINGS synchronously at cue-trigger time rather than reacting to this event, so live volume/mute changes still take effect immediately on the next cue). This is dead wiring / an incomplete feature, not a regression that breaks anything today.

Fix (low priority, backlog): either wire a listener (e.g. in audio.js or sfx-actions.js) for instant re-application of settings without waiting for the next cue, or remove the dead dispatch if no consumer is planned.

## Lower-confidence / non-issues actively checked and ruled out

- Canonical-mob resolver duplication (combat.js vs magic-tab.js): both copies of resolveCanonicalMob (combat.js line 429, magic-tab.js line 287) use identical id+position matching logic against window.EMMOB.nodes, and both agree with world.js line 382, where proxy.userData.mob is set to the canonical live node (not a clone), per the CBT-FIX comment at world.js lines 370-386. Since userData.mob is now the real node, mob._inst is truthy immediately and both resolvers short-circuit on their first line anyway - no divergence possible. No defect.
- killed:<mob> / cast:<spell> id alignment: combat.js line 733 normalizes the mob id (hyphens to underscores, giant-rat to giant_rat) before dispatching, matching lessons.json killed:giant_rat and killed:giant_rat_ranged exactly. magic-tab.js line 440 normalizes the spell id the same way (gale-bolt to gale_bolt), matching lessons.json cast:gale_bolt exactly. No defect.
- has:tin-ore / has:copper-ore / has:bronze-bar / has:bronze-dagger / has:logs / has:raw-shrimp / has:cooked-shrimp / has:bread / has:bread-dough item ids all resolve in assets/data/items.json. No defect.
- src/main.js init-array order (initGating runs before initGround/initBank; initSfxActions runs before initGround/initAvatar/initLevelUp): every module that reads a not-yet-created window.EM* global does so defensively - gating.js never reads EMLESSON/EMHUD/EMGROUND at initGating() call time, only lazily inside accessor functions invoked later; sfx-actions.js patchGround (and its siblings) are retried via a bounded requestAnimationFrame poll (pollLateGlobals, capped at 100 frames) plus an em-data-ready listener, and since main.js init forEach runs fully synchronously before the first animation frame, initGround has already assigned window.EMGROUND by the time the first pollLateGlobals callback executes. No defect - self-heals by design, confirmed via the actual synchronous/async ordering.
- Monkey-patch double-wrapping (sfx-actions.js patches EMSKILL/EMEQUIP/EMBANK/EMCOMBAT/EMGROUND/EMINVOPS): every patch function in sfx-actions.js guards with a boolean flag (xpPatched, skillPatched, equipPatched, bankPatched, combatPatched, groundPatched, invOpsPatched) or a per-verb marker on the wrapped function itself, and each underlying window.EM* global is assigned exactly once (direct assignment, not re-assigned by a second init call anywhere in the codebase - verified via grep that initSkilling/initEquipment/initBank/initCombat/initGround/initInvOps each appear in main.js init array exactly once). No double-wrap, no dropped return value (every wrapper captures and returns the original call's result). No defect.
- RAF/interval loops (avatar mixer, prayer overhead sprite, magic bolt arc, level-up poll, minimap compass): prayer-tab.js overheadFrame (lines 256-284) is idempotently started via ensureOverheadLoop's null-handle guard and self-terminates when no prayer is active; levelup.js guards its setInterval behind a window.__emLevelUp singleton (line 158) and clears it in destroy() (lines 258-264); minimap-render.js compassLoop and loop are single self-chaining loops, not re-entrant; avatar.js has no RAF of its own - it exposes update(dt) called once per frame from player.js line 155 inside the existing simStep(dt), itself called once per frame from main.js single render loop. No stacking or leak found.
- avatar.js gather-clip substitution vs combat attack/death priority: player.js calls EMAVATAR.setState with attack/death directly on rising edges (lines 157 and 159); avatar.js setState (lines 329-335) only substitutes the looping gather clip when the incoming state name is walk or idle AND EMSKILL.isActive() is true AND the player is not moving - attack/death/cast/hit/block always pass straight through untouched. No priority race.
- isRangedReady dual-flag dispatch on ranged kill (killed:<mob> plus killed:<mob>_ranged) is intentional - a ranged kill should satisfy both the base and ranged-specific lesson predicates - and is evaluated at the actual moment of death via live equipment state (combat.js lines 310-318), not a stale snapshot. No defect.
- Music zone-follow vs manual jukebox pick (audio.js lines 501-529, music-tab.js lines 82-83): manual playZone calls from the jukebox bypass lastAutoZone, and the 1s pollZoneFollow poll only re-triggers playZone when the live lesson zone id changes from lastAutoZone - matching the documented manual-pick-wins-until-zone-changes behaviour exactly. No defect.
- initAudio lacks an explicit early-return singleton guard on window.EMAUDIO, unlike sibling modules (initAvatar, initLevelUp). Currently harmless since main.js only calls it once. Flagged only as a defensive-pattern inconsistency, not a live bug.

## Verdict

No blocker or major regressions found in this session's monkey-patch/event-wiring/init-order work - the defensive patterns (poll-until-present, singleton guards, return-value preservation, id normalization) are consistently and correctly applied everywhere checked. The one real gameplay-facing gap is #1 (Firemaking lesson does not detect the actual lit-fire action, only times out after 15s) - pre-existing since the commit that introduced the predicate system this session (4a37e28), not a regression from later chunks, but still worth a follow-up fix given how easy the dispatch is to add. #2 is inert dead wiring, safe to leave or clean up.

---

## Functional reachability + combat verification (v62, 2026-07-01)

Method: live A* probes + live combat driven through the real `window.EM*` APIs on a
clean-origin preview (port rotation to defeat ES-module cache).

Reachability sweep — plan a path from spawn to every world interactable, assert the
route ends within talk/use range (not the astar-fail fallback):

    ALL 22 probed targets reachable — 0 bricks:
      6 instructors (in their proper in-room positions, within talkRange)
      16 fixtures/mobs/landmarks (fishing/fire/range/furnace/anvil/gate/rats/
          target/bank/poll/altar/rune-racks/chicken/dock)
    (This is the state AFTER the v62 sealed-building collider fix. Pre-v62, ~9 of
     these — banking, prayer altar, rune rack, chicken, 4 instructors — were HARD
     bricks: enclosed by full-footprint solid-fill rects in world.colliders.json.)

Combat lesson mechanism (L11/L12) — driven live via EMCOMBAT.attack + EMCOMBAT.tick:

    giant-rat: maxHp hydrated=5 from combat.json (id match OK), death path fires
    em-flag "killed:giant_rat". Dev char is L99 so it one-shots (correct — max hit
    exceeds a tutorial rat's 5 HP); real low-level play takes several hits.

Magic cast mechanism (L16) — executeCast (magic-tab.js) dispatches em-flag
"cast:<sid>" (gale-bolt -> cast:gale_bolt); confirmed by code + verified live in v50.
Not re-driven here (needs the arm-spell -> click-mob UI chain, not a public API).

Verdict: reachability + combat kill-flag PASS. No code change required this pass.
