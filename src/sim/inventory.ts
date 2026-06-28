// 28-slot inventory container. Headless, deterministic. See docs/modules/Inventory.md.
import { itemDef, isStackable } from './items.js';

export const INV_SIZE = 28;

export interface ItemStack {
  id: string;
  qty: number;
}
export interface Inventory {
  slots: (ItemStack | null)[];
}

export function makeInventory(): Inventory {
  return { slots: new Array<ItemStack | null>(INV_SIZE).fill(null) };
}

export function countItem(inv: Inventory, id: string): number {
  let n = 0;
  for (const s of inv.slots) if (s && s.id === id) n += s.qty;
  return n;
}
export function hasItem(inv: Inventory, id: string, qty = 1): boolean {
  return countItem(inv, id) >= qty;
}
export function firstEmpty(inv: Inventory): number {
  return inv.slots.findIndex((s) => s === null);
}
export function freeSlots(inv: Inventory): number {
  return inv.slots.reduce((n, s) => n + (s === null ? 1 : 0), 0);
}

/** Add up to `qty`; returns how many were actually added (respects 28 slots + stacking rules). */
export function addItem(inv: Inventory, id: string, qty = 1): number {
  itemDef(id); // validate id (throws on unknown)
  if (qty <= 0) return 0;

  if (isStackable(id)) {
    const existing = inv.slots.find((s): s is ItemStack => s !== null && s.id === id);
    if (existing) { existing.qty += qty; return qty; }
    const slot = firstEmpty(inv);
    if (slot === -1) return 0;
    inv.slots[slot] = { id, qty };
    return qty;
  }

  // non-stackable: one per empty slot
  let added = 0;
  for (let i = 0; i < inv.slots.length && added < qty; i++) {
    if (inv.slots[i] === null) { inv.slots[i] = { id, qty: 1 }; added++; }
  }
  return added;
}

/** Remove up to `qty`; clears emptied slots; returns how many were actually removed. */
export function removeItem(inv: Inventory, id: string, qty = 1): number {
  if (qty <= 0) return 0;
  let removed = 0;

  if (isStackable(id)) {
    for (const s of inv.slots) {
      if (s && s.id === id) {
        const take = Math.min(s.qty, qty - removed);
        s.qty -= take; removed += take;
        break; // stackable lives in a single slot
      }
    }
  } else {
    for (let i = 0; i < inv.slots.length && removed < qty; i++) {
      const s = inv.slots[i];
      if (s && s.id === id) { inv.slots[i] = null; removed++; }
    }
  }
  // clear any emptied stackable slot
  for (let i = 0; i < inv.slots.length; i++) {
    const s = inv.slots[i];
    if (s && s.qty <= 0) inv.slots[i] = null;
  }
  return removed;
}

/** Swap two slots (target may be empty). Out-of-range throws; equal index is a no-op. */
export function moveSlot(inv: Inventory, from: number, to: number): void {
  if (from < 0 || to < 0 || from >= INV_SIZE || to >= INV_SIZE) throw new Error('moveSlot out of range');
  if (from === to) return;
  const tmp = inv.slots[from]!;
  inv.slots[from] = inv.slots[to]!;
  inv.slots[to] = tmp;
}
