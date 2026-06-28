# Parity: Equipment (player feature)

Reference bar: OSRS worn equipment + the equipment interface. Done only when every box is checked.

## Interactions — each must WORK on screen and have a test
- [ ] Open the Equipment interface (button; works on mobile)
- [ ] Shows all slots (head/cape/neck/ammo/weapon/shield/body/legs/hands/feet/ring) with worn items
- [ ] **Wield/Wear** an equipable item from the inventory → moves to its slot; bonuses update
- [ ] **Remove** a worn item → back to inventory (blocked + messaged if inventory full)
- [ ] **Examine** a worn item → shows its description
- [ ] Right-click (desktop) / long-press (mobile) on a worn slot → menu: Remove / Examine
- [ ] Right-click / long-press an inventory item → includes Wield/Wear when equipable
- [ ] Equipment bonuses panel (attack/strength/defence) reflects worn gear and updates live
- [ ] Two-handed/shield interaction rules respected (later items)

## Mobile QA — Josh confirms on device
- [ ] Tap a slot/item acts first try
- [ ] Long-press opens the Remove/Examine menu
- [ ] Haptic buzz on wield/remove

## Tests
- [ ] `tests/sim/equipment.test.ts` covers equip/unequip/swap/bonuses (done at primitive level)
- [ ] UI-level test: option menu lists correct actions for worn vs inventory items
