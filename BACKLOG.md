# Eldermoor — Backlog / TODO

Living checklist. **Rules:** work ONE item at a time, top to bottom. For each item:
build it fully (no shortcuts/stubs) → **play-test it as a human in the browser** (real
clicks, long-press, screenshots) → only then check it off and commit → next item.
`[ ]` todo · `[~]` in progress · `[x]` done (tested in a real browser).

> Verified means: I drove the actual UI like a player and confirmed it on screen — NOT
> that a function returned the right value in a console.

## P0 — Core is broken/unusable (fix first)
- [x] **1. Chat log readability.** Solid translucent panel + high-contrast cream text, raised
      above the HUD row. Verified in browser: 4 chat lines clearly legible over the world.
- [x] **2. HUD buttons placement.** Root cause: `#btns` had no `position` so `right/bottom`
      were ignored. Set `position:fixed`, larger touch targets, active state. Verified in browser:
      Skills/Items visible bottom-right on load; each opens its panel via a real click; toggle works.
- [ ] **3. Reliable tap-to-interact.** Tapping an NPC/object should interact on the first try.
      Verify: tap the Guide once → he is talked to and dialogue shows.

## P1 — Interaction model (RuneScape-style)
- [ ] **4. Context menu — desktop right-click.** Right-click a target → "Choose option" menu.
- [ ] **5. Context menu — mobile long-press.** ~450ms press (no drag) → same menu. Tap = default action.
- [ ] **6. Per-target options.** Talk-to / Chop|Mine|Fish|Cook|Smith|Pray|Cast|Shoot / Attack /
      Take / Examine / Walk here — correct set per object kind; tap runs the first (default) option.
- [ ] **7. Examine text.** Each object/NPC/item has a short flavor line shown in chat on Examine.

## P2 — Loot / drops
- [ ] **8. Visible ground loot.** Mob death spawns a labeled item on the ground (not silent
      inventory insert).
- [ ] **9. Pick up loot.** Tap loot or choose "Take" → walk over → item enters inventory, marker
      removed, chat message. Bones from the rat must be picked up before they can be buried.

## P3 — Feedback & polish
- [ ] **10. Click-to-move marker.** A brief ground marker where you tapped to walk.
- [ ] **11. Hover/selort target highlight.** Indicate what you're about to interact with.
- [ ] **12. Action/idle feedback.** Clear progress + "what am I doing" cue.

## Notes
- Test matrix per item: desktop click, desktop right-click, touch tap, touch long-press
  (emulate), and the tutorial-flow regression (still completes).
- Keep `main` always-playable: smoke check + real play-test before merge; each merge auto-deploys
  to https://eldermoor.vercel.app.
