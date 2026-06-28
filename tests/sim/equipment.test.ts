import { describe, it, expect } from 'vitest';
import { makeInventory, addItem, countItem, freeSlots } from '../../src/sim/inventory.js';
import { makeEquipment, equip, unequip, totalBonuses, equippedId } from '../../src/sim/equipment.js';

describe('Equipment', () => {
  it('AC1: fresh equipment is empty; no bonuses', () => {
    const eq = makeEquipment();
    expect(Object.keys(eq.slots).length).toBe(0);
    expect(totalBonuses(eq)).toEqual({ attack: 0, strength: 0, defence: 0 });
  });

  it('AC2: equip a weapon from inventory → worn, slot vacated, bonuses applied', () => {
    const inv = makeInventory();
    const eq = makeEquipment();
    addItem(inv, 'bronze_dagger', 1); // slot 0
    expect(equip(inv, eq, 0)).toBe(true);
    expect(equippedId(eq, 'weapon')).toBe('bronze_dagger');
    expect(inv.slots[0]).toBeNull();
    expect(totalBonuses(eq)).toEqual({ attack: 4, strength: 3, defence: 0 });
  });

  it('AC3: equipping a non-equipable item changes nothing', () => {
    const inv = makeInventory();
    const eq = makeEquipment();
    addItem(inv, 'logs', 1);
    expect(equip(inv, eq, 0)).toBe(false);
    expect(inv.slots[0]?.id).toBe('logs');
    expect(Object.keys(eq.slots).length).toBe(0);
  });

  it('AC4: equipping into an occupied slot swaps cleanly', () => {
    const inv = makeInventory();
    const eq = makeEquipment();
    addItem(inv, 'bronze_dagger', 1); // slot 0
    equip(inv, eq, 0);                 // dagger worn, slot 0 empty
    addItem(inv, 'bronze_dagger', 1); // another dagger lands in slot 0
    // pretend it's a different weapon by swapping: equip slot 0 again → swap
    expect(equip(inv, eq, 0)).toBe(true);
    expect(equippedId(eq, 'weapon')).toBe('bronze_dagger');
    expect(inv.slots[0]?.id).toBe('bronze_dagger'); // old one returned to the vacated slot
    expect(countItem(inv, 'bronze_dagger')).toBe(1);
  });

  it('AC5: unequip returns the item to inventory and drops bonuses', () => {
    const inv = makeInventory();
    const eq = makeEquipment();
    addItem(inv, 'bronze_dagger', 1);
    equip(inv, eq, 0);
    expect(unequip(inv, eq, 'weapon')).toBe(true);
    expect(equippedId(eq, 'weapon')).toBeUndefined();
    expect(countItem(inv, 'bronze_dagger')).toBe(1);
    expect(totalBonuses(eq)).toEqual({ attack: 0, strength: 0, defence: 0 });
  });

  it('AC6: unequip into a full inventory fails; item stays equipped', () => {
    const inv = makeInventory();
    const eq = makeEquipment();
    addItem(inv, 'bronze_dagger', 1);
    equip(inv, eq, 0);            // dagger worn, inventory empty
    addItem(inv, 'logs', 28);     // fill all 28 slots
    expect(freeSlots(inv)).toBe(0);
    expect(unequip(inv, eq, 'weapon')).toBe(false);
    expect(equippedId(eq, 'weapon')).toBe('bronze_dagger'); // still worn
  });

  it('AC7: totalBonuses aggregates across slots', () => {
    const inv = makeInventory();
    const eq = makeEquipment();
    addItem(inv, 'bronze_dagger', 1);   // slot 0
    addItem(inv, 'wooden_shield', 1);   // slot 1
    equip(inv, eq, 0);
    equip(inv, eq, 1);
    expect(totalBonuses(eq)).toEqual({ attack: 4, strength: 3, defence: 5 });
  });
});
