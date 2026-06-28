# Parity: Inventory (player feature)

Reference bar: OSRS inventory. **Done only when every box below is checked.** This is the first
deep, full-parity feature — built end to end (sim logic + on-screen panel + every interaction +
mobile), not just a container that opens.

## Interactions — each must WORK on screen and have an automated test
- [ ] Open/close the inventory panel (button + works on mobile)
- [ ] Items render in 28 slots with icon + quantity (stacks show count)
- [ ] **Examine** — shows the item's description text in the chat/log
- [ ] **Drop** — removes from inventory and creates a visible **ground item** you can pick back up
- [ ] **Wield/Wear (Equip)** — equipable items move to the equipment slot; bonuses update
- [ ] **Eat** — food items heal HP and are consumed (e.g. cooked Shrimp)
- [ ] **Bury** — Bones give Prayer XP and are consumed
- [ ] **Use** — selects the item for "Use → target"
- [ ] **Use item on item** (e.g. Tinderbox → Logs)
- [ ] **Use item on world object** (e.g. Logs → fire spot)
- [ ] **Use item on NPC** (hook in place even if few targets exist yet)
- [ ] **Drag to rearrange** slots (swap), persists
- [ ] Left-click runs the item's default action; right-click / long-press opens the full option menu
- [ ] Context menu lists exactly the valid options for that item (no dead options)

## Mobile QA — Josh confirms on a real phone, reports back
- [ ] Tapping an item selects/acts first try (no fat-finger misses)
- [ ] Long-press an item → option menu appears
- [ ] Drag-rearrange works with touch
- [ ] **Haptic buzz** on a successful item action (vibrate)
- [ ] Panel is readable + reachable one-handed on a phone

## Tests
- [ ] `tests/sim/inventory.test.ts` already covers add/remove/move/count
- [ ] `tests/sim/item_actions.test.ts` covers examine/drop/equip/eat/bury/use-on logic
- [ ] Headless load test asserts the option menu lists correct options per item kind
