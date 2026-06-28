# Module: Items + Inventory

**Phase 1 · build #4.** Item definitions + a 28-slot inventory container. Headless, deterministic.

## Purpose
Define items (data table) and a 28-slot inventory with stackable/non-stackable rules, add/remove/
count/move, and examine. Foundation for equipment, skilling yields, loot, banking.

## Data model
```ts
type EquipSlot = 'weapon'|'shield'|'head'|'body'|'legs'|'hands'|'feet'|'cape'|'neck'|'ring'|'ammo';
interface ItemDef { id:string; name:string; stackable:boolean; examine:string;
  equipable?:boolean; slot?:EquipSlot; bonuses?:{attack?:number;strength?:number;defence?:number}; value?:number; }
interface ItemStack { id:string; qty:number; }
interface Inventory { slots:(ItemStack|null)[]; }   // length 28
const INV_SIZE = 28;
```

## API
```
itemDef(id): ItemDef            // throws on unknown id
isStackable(id): boolean
makeInventory(): Inventory
addItem(inv,id,qty=1): number   // returns qty actually added (respects 28 slots + stacking)
removeItem(inv,id,qty=1): number// returns qty actually removed
countItem(inv,id): number
hasItem(inv,id,qty=1): boolean
firstEmpty(inv): number | -1
freeSlots(inv): number
moveSlot(inv,from,to): void     // swap (or move into empty) — for drag/drop
```

## Behavior
- **Stackable** items occupy ONE slot; `addItem` increments it (or opens one empty slot if absent).
- **Non-stackable** items take ONE slot each; `addItem(n)` fills up to `n` empty slots.
- `addItem` returns how many were actually added (0 if no room; partial if some room).
- `removeItem` removes up to `qty`; clears emptied slots; returns how many were removed.
- `moveSlot` swaps two slot indices (target may be empty).

## Edge cases
- Unknown item id → `itemDef`/`addItem` throw (no silent unknowns).
- Add to a full inventory → returns 0; partial fills return the actual count.
- Remove more than present → removes all present, returns that count (no negative qty).
- Stackable qty must never split across slots; non-stackable never stacks.
- `moveSlot` with equal/out-of-range indices is a safe no-op (in-range) / throws (out-of-range).

## Acceptance criteria (testable, headless)
1. `makeInventory` → 28 slots, all null; `freeSlots`=28.
2. Stackable: add 5 then 3 of the same id → ONE slot, qty 8; `countItem`=8; one slot used.
3. Non-stackable: add 3 → THREE slots; `countItem`=3.
4. Full inventory: non-stackable add of N with only K empties adds K, returns K; further add returns 0.
5. `removeItem` reduces a stack / clears slots; returns the amount removed; over-remove returns available.
6. `hasItem`/`countItem` reflect contents; unknown id throws.
7. `moveSlot` swaps two slots (and moves into an empty slot).

## Manual QA
- Deferred to the inventory UI panel (rendered onto the sim) — exercised on-screen when the client
  inventory grid is wired. This module's gate is its automated tests.

## Tests — `tests/sim/inventory.test.ts` (all 7 acceptance criteria).
