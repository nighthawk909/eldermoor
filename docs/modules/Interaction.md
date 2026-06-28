# Module: Item/World Interaction + Context Menu

**Phase 1 · build #6.** Turns taps/clicks into actions. **This module owns the fix for the
reported mobile bugs** (talk-to-NPC on mobile; long-press options) — captured here as binding
acceptance criteria so they are not lost in the rebuild.

## Purpose
Map pointer input → an action against whatever is under it (NPC / object / ground-item / ground),
RuneScape-style: **tap = default action**, **right-click (desktop) / long-press (mobile) = a
"Choose option" menu**. Walk-to-interact paths to an adjacent tile (Movement), then runs the action.

## Data model
```ts
type TargetKind = 'npc' | 'object' | 'grounditem' | 'tile';
interface PickResult { kind: TargetKind; entityId?: string; tile: Tile; }
interface MenuOption { label: string; run(): void; }      // first option = default (tap) action
```
Per-kind options (slice): NPC → [Talk-to, Examine, Walk here]; object(tree/rock/…) →
[<Verb> (Chop/Mine/…), Examine, Walk here]; combat NPC → [Attack, Examine, Walk here];
grounditem → [Take, Examine, Walk here]; tile → [Walk here].

## Behavior
- **Pick**: project the pointer to a tile; choose the entity on/adjacent to it within a tolerance
  (entities are small — see AC). Default action = the kind's first option.
- **Tap/click**: run the default action (walk-adjacent then act).
- **Right-click / long-press (~450ms, no drag)**: open the option menu at the pointer; selecting
  runs that option; tapping elsewhere closes it.

## Edge cases / mobile (the reported bugs — binding)
- A **tap that lands near (not exactly on) an NPC/object still selects it** (touch fat-finger
  tolerance: pick the nearest interactable within N px / 1 tile, not just an exact hit).
- A tap must **not be swallowed by the camera-drag handler** — distinguish tap vs drag by movement
  threshold + time; a stationary touch under the drag threshold is a tap, not a drag.
- **Long-press works on touch**: a ~450ms press without exceeding the drag threshold opens the menu;
  it must not also trigger a walk/tap on release.
- Menu stays on-screen (clamp to viewport); dismiss on outside tap; one menu at a time.
- Pointer/touch events use Pointer Events (unified mouse+touch); `touch-action:none` on the canvas.

## Feedback — haptics + visual (REQUIRED; reported by owner)
- **Haptic feedback** via `navigator.vibrate` on meaningful touch actions: short tap (~10ms) on a
  successful tap/select; a distinct pattern on context-menu open (long-press) and on
  action-complete/level-up. Guard with feature-detection (`'vibrate' in navigator`); no-op on
  unsupported devices/desktop. Respect a settings toggle (default on).
- **Visual tap feedback**: a brief ripple/marker at the tap point + highlight of the selected target,
  so a tap is always acknowledged even where haptics are unavailable.
- **Reality check**: `navigator.vibrate` only fires on real mobile hardware. Automated/emulated QA
  can assert the call is made (spy on `navigator.vibrate`); the actual buzz is confirmed by the
  owner on a physical phone before this is marked done.

## Acceptance criteria (testable)
1. (sim) Pick returns the correct NPC/object for a tile on or adjacent to it within tolerance.
2. (sim) Default action for each kind is the documented first option.
3. **(manual, mobile) Tapping an NPC talks to it on the first try** — verified on a touch device /
   emulation, including a slightly-off tap.
4. **(manual, mobile) Long-press on an NPC/object opens the "Choose option" menu**; selecting
   "Talk-to"/"Examine"/etc. performs it; a normal tap still walks/does the default.
5. (manual) Right-click on desktop opens the same menu.
6. (manual) Long-press does not also fire a walk on release; tap vs drag never misfire.

## Manual QA checklist
- [ ] **Mobile: tap Guide → dialogue opens first try** (and a near-miss tap still selects him).
- [ ] **Mobile: long-press Guide → menu with Talk-to/Examine/Walk here**; pick Talk-to → dialogue.
- [ ] Desktop: right-click → same menu.
- [ ] Long-press then release on empty ground → menu (or walk), never both.
- [ ] Tested at phone width with touch emulation AND, if possible, a real phone on the live deploy.

## Tests — `tests/sim/interaction.test.ts` (pick/default-action logic); menu + touch are manual QA.
