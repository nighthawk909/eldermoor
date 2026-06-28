import { describe, it, expect } from 'vitest';
import {
  makeInventory, addItem, removeItem, countItem, hasItem, freeSlots, moveSlot, INV_SIZE,
} from '../../src/sim/inventory.js';
import { itemDef } from '../../src/sim/items.js';

describe('Items + Inventory', () => {
  it('AC1: fresh inventory has 28 empty slots', () => {
    const inv = makeInventory();
    expect(inv.slots.length).toBe(INV_SIZE);
    expect(inv.slots.every((s) => s === null)).toBe(true);
    expect(freeSlots(inv)).toBe(28);
  });

  it('AC2: stackable items share one slot', () => {
    const inv = makeInventory();
    expect(addItem(inv, 'coins', 5)).toBe(5);
    expect(addItem(inv, 'coins', 3)).toBe(3);
    expect(countItem(inv, 'coins')).toBe(8);
    expect(inv.slots.filter((s) => s && s.id === 'coins').length).toBe(1);
    expect(freeSlots(inv)).toBe(27);
  });

  it('AC3: non-stackable items take one slot each', () => {
    const inv = makeInventory();
    expect(addItem(inv, 'logs', 3)).toBe(3);
    expect(countItem(inv, 'logs')).toBe(3);
    expect(inv.slots.filter((s) => s && s.id === 'logs').length).toBe(3);
  });

  it('AC4: full inventory — partial add then zero', () => {
    const inv = makeInventory();
    expect(addItem(inv, 'logs', 28)).toBe(28); // fills it
    expect(freeSlots(inv)).toBe(0);
    expect(addItem(inv, 'bones', 5)).toBe(0);  // no room
    // with K empties, add of N adds K:
    removeItem(inv, 'logs', 2);                // free 2
    expect(addItem(inv, 'bones', 5)).toBe(2);  // only 2 fit
    expect(countItem(inv, 'bones')).toBe(2);
  });

  it('AC5: removeItem reduces/clears and returns amount removed', () => {
    const inv = makeInventory();
    addItem(inv, 'coins', 10);
    expect(removeItem(inv, 'coins', 4)).toBe(4);
    expect(countItem(inv, 'coins')).toBe(6);
    expect(removeItem(inv, 'coins', 100)).toBe(6); // over-remove returns available
    expect(countItem(inv, 'coins')).toBe(0);
    expect(inv.slots.every((s) => s === null)).toBe(true); // slot cleared
  });

  it('AC6: hasItem/countItem + unknown id throws', () => {
    const inv = makeInventory();
    addItem(inv, 'logs', 2);
    expect(hasItem(inv, 'logs', 2)).toBe(true);
    expect(hasItem(inv, 'logs', 3)).toBe(false);
    expect(() => itemDef('dragon_claws')).toThrow();
    expect(() => addItem(inv, 'dragon_claws', 1)).toThrow();
  });

  it('AC7: moveSlot swaps two slots (incl. into empty)', () => {
    const inv = makeInventory();
    addItem(inv, 'logs', 1);       // slot 0
    addItem(inv, 'bones', 1);      // slot 1
    moveSlot(inv, 0, 5);           // move logs into empty slot 5
    expect(inv.slots[0]).toBeNull();
    expect(inv.slots[5]?.id).toBe('logs');
    moveSlot(inv, 1, 5);           // swap bones <-> logs
    expect(inv.slots[1]?.id).toBe('logs');
    expect(inv.slots[5]?.id).toBe('bones');
    expect(() => moveSlot(inv, 0, 99)).toThrow();
  });
});
