# Parity: Interaction / clicking (NEXT after characters)

Bar: OSRS interaction on **both** desktop and mobile. The #1 reported bug: on mobile, tapping an
NPC/object/screen does nothing and gives no haptic feedback. Done only when every box is checked
AND Josh confirms the mobile boxes on his phone. Built sub-feature by sub-feature.

## Input modes (must all work)
- [x] **Desktop left-click** = run the target's DEFAULT (first) action (verified on /play)
- [ ] **Desktop right-click** = open the full "Choose option" menu (step D)
- [x] **Mobile short tap** = run the DEFAULT action — FIXED: tap NPC → walk-adjacent → Talk-to +
      dialogue + haptic verified; Josh to confirm the buzz on a real phone
- [ ] **Mobile long-press (~450ms, no drag)** = open the "Choose option" menu (step D)
- [x] Tap-vs-drag/camera distinguished (drag threshold; stationary tap is never eaten by drag)
- [x] **Haptic** on a successful action (`navigator.vibrate(12)`, feature-detected — fires; buzz is device-only)
- [ ] Visual tap acknowledgement (ripple/marker) + selected-target highlight (step D)

## Targets and their option sets (default action listed first)
- [ ] **Ground/tile** → Walk here
- [ ] **NPC (friendly, e.g. Guide)** → Talk-to · Examine · Walk here
- [ ] **NPC (monster, e.g. rat)** → Attack · Examine · Walk here
- [ ] **Shop NPC** → Talk-to · Trade · Examine
- [ ] **Tree** → Chop · Examine    |  **Rock** → Mine · Examine  |  **Fishing spot** → Fish · Examine
- [ ] **Fire/range** → Cook (or Use food on it) · Examine
- [ ] **Bank** → Bank · Examine   |  **Door/gate** → Open · Examine  |  **Altar** → Pray-at · Examine
- [ ] **Ground item (loot)** → Take · Examine
- [ ] **Inventory item** → context options: Use · Wield/Wear (equipable) · Eat (food) · Bury (bones) ·
      Drink · Drop · Examine
- [ ] **Use-on**: item → item, item → world object, item → NPC
- [ ] **Worn equipment item** → Remove · Examine
- [ ] (later) **Player** → Follow · Trade with · Examine

## Rules
- [ ] The menu lists ONLY valid options for that target (no dead entries)
- [ ] Examine shows the description in the chat log
- [ ] Walk-to-interact paths to an ADJACENT tile, then runs the action (ties into Movement)
- [ ] Menu clamps on-screen; dismiss on outside tap; one menu at a time

## Mobile QA — Josh confirms on device
- [ ] Tap an NPC → default action happens first try (the bug is fixed)
- [ ] Long-press an NPC/object → option menu appears; choosing an option performs it
- [ ] Haptic buzz felt on action and on menu-open
- [ ] Tap an inventory item → acts; long-press → Use/Wield/Eat/Drop/Examine menu

## Tests — `tests/sim/interaction.test.ts` (pick/default-action/options logic); menu+touch = manual QA.
