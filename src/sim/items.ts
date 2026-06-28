// Item definitions (data table). Content lives here, not in engine code.
// See docs/modules/Inventory.md.

export type EquipSlot =
  | 'weapon' | 'shield' | 'head' | 'body' | 'legs' | 'hands' | 'feet' | 'cape' | 'neck' | 'ring' | 'ammo';

export interface ItemBonuses {
  attack?: number;
  strength?: number;
  defence?: number;
}

export interface ItemDef {
  id: string;
  name: string;
  stackable: boolean;
  examine: string;
  equipable?: boolean;
  slot?: EquipSlot;
  bonuses?: ItemBonuses;
  value?: number;
}

export const ITEMS: Record<string, ItemDef> = {
  coins: { id: 'coins', name: 'Coins', stackable: true, examine: 'Lovely money!', value: 1 },
  logs: { id: 'logs', name: 'Logs', stackable: false, examine: 'A bundle of logs.', value: 4 },
  tinderbox: { id: 'tinderbox', name: 'Tinderbox', stackable: false, examine: 'Useful for lighting fires.', value: 1 },
  bronze_dagger: {
    id: 'bronze_dagger', name: 'Bronze dagger', stackable: false, examine: 'A small but sharp blade.',
    equipable: true, slot: 'weapon', bonuses: { attack: 4, strength: 3 }, value: 10,
  },
  bones: { id: 'bones', name: 'Bones', stackable: false, examine: 'Eurgh, dem bones.', value: 1 },
  raw_shrimp: { id: 'raw_shrimp', name: 'Raw shrimp', stackable: false, examine: 'I should cook this first.', value: 2 },
  shrimp: { id: 'shrimp', name: 'Shrimp', stackable: false, examine: 'Some nicely cooked shrimp.', value: 3 },
};

export function itemDef(id: string): ItemDef {
  const d = ITEMS[id];
  if (!d) throw new Error(`unknown item id: ${id}`);
  return d;
}

export function isStackable(id: string): boolean {
  return itemDef(id).stackable;
}
