# Module: Equipment

**Phase 1 · build #5.** Worn gear + aggregated bonuses. Headless, deterministic. Builds on Items/Inventory.

## Purpose
Equip/unequip items from the 28-slot inventory into typed equipment slots, swapping correctly, and
aggregate equipment bonuses (attack/strength/defence) for combat to read.

## Data model
```ts
interface Equipment { slots: Partial<Record<EquipSlot, string>>; }  // slot -> item id (qty implicitly 1)
```
Equipable items declare `equipable:true` + `slot` + optional `bonuses` in the item table (Items module).

## API
```
makeEquipment(): Equipment
equip(inv, eq, invIndex): boolean        // equip the item in inventory slot invIndex
unequip(inv, eq, slot): boolean          // move the worn item back to inventory
totalBonuses(eq): { attack:number; strength:number; defence:number }
equippedId(eq, slot): string | undefined
```

## Behavior
- `equip`: the inventory item must be `equipable` with a `slot`. The item leaves that inventory slot
  and goes to its equipment slot. If something was already worn in that slot, it **swaps** back into
  the freed inventory slot. Returns false (no change) if the item isn't equipable.
- `unequip`: move the worn item to the first empty inventory slot; clear the equipment slot. Returns
  false (no change) if there is no empty inventory slot.
- `totalBonuses`: sum each equipped item's bonuses (missing fields count as 0).

## Edge cases
- Equip a non-equipable item (e.g. logs) → false, nothing changes.
- Equip from an empty inventory slot → false.
- Equip into an occupied slot → clean swap (old item lands in the slot the new one vacated).
- Unequip into a full inventory → false; the item stays equipped (never destroyed).
- Equipable items are non-stackable, qty 1.

## Acceptance criteria (testable, headless)
1. `makeEquipment` → no slots set; `totalBonuses` = {0,0,0}.
2. Equip a bronze_dagger from inventory → weapon slot = bronze_dagger, that inventory slot empty,
   `totalBonuses.attack`=4, `.strength`=3.
3. Equip a non-equipable item (logs) → returns false; inventory + equipment unchanged.
4. Equip a second weapon while one is worn → swap: new weapon equipped, old weapon back in the
   vacated inventory slot.
5. Unequip → item returns to inventory, slot cleared, bonuses drop to 0.
6. Unequip into a full inventory → false; item stays equipped.
7. `totalBonuses` aggregates across slots (dagger weapon + wooden_shield ⇒ atk4/str3/def5).

## Manual QA
- Deferred to the equipment UI panel (rendered onto the sim). Gate = automated tests.

## Tests — `tests/sim/equipment.test.ts` (all 7 acceptance criteria).
