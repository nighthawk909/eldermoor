// Equipment: worn gear by slot + aggregated bonuses. See docs/modules/Equipment.md.
import { type EquipSlot, type ItemBonuses, itemDef } from './items.js';
import { type Inventory, firstEmpty } from './inventory.js';

export interface Equipment {
  slots: Partial<Record<EquipSlot, string>>; // slot -> item id (qty 1)
}

export function makeEquipment(): Equipment {
  return { slots: {} };
}

export function equippedId(eq: Equipment, slot: EquipSlot): string | undefined {
  return eq.slots[slot];
}

/** Equip the item in inventory slot `invIndex`. Swaps with anything already in that slot. */
export function equip(inv: Inventory, eq: Equipment, invIndex: number): boolean {
  if (invIndex < 0 || invIndex >= inv.slots.length) return false;
  const stack = inv.slots[invIndex];
  if (!stack) return false;
  const def = itemDef(stack.id);
  if (!def.equipable || !def.slot) return false;

  const slot = def.slot;
  const prev = eq.slots[slot];
  // new item leaves inventory; old worn item (if any) returns to that freed slot
  inv.slots[invIndex] = prev ? { id: prev, qty: 1 } : null;
  eq.slots[slot] = stack.id;
  return true;
}

/** Move the worn item in `slot` back to the first empty inventory slot. */
export function unequip(inv: Inventory, eq: Equipment, slot: EquipSlot): boolean {
  const id = eq.slots[slot];
  if (!id) return false;
  const empty = firstEmpty(inv);
  if (empty === -1) return false; // inventory full — keep it equipped, never destroy
  inv.slots[empty] = { id, qty: 1 };
  delete eq.slots[slot];
  return true;
}

export function totalBonuses(eq: Equipment): Required<ItemBonuses> {
  const total: Required<ItemBonuses> = { attack: 0, strength: 0, defence: 0 };
  for (const id of Object.values(eq.slots)) {
    if (!id) continue;
    const b = itemDef(id).bonuses;
    if (!b) continue;
    total.attack += b.attack ?? 0;
    total.strength += b.strength ?? 0;
    total.defence += b.defence ?? 0;
  }
  return total;
}
