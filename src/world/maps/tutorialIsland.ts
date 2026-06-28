// Tutorial Island — the starting region, expressed purely as data. This is the first map
// migrated onto the data layer; it reproduces the original hand-placed content and is the
// seed we grow toward OSRS-parity (more rooms, stations, NPCs, monsters, resources).
import type { MapDef } from '../mapTypes.js';

export const tutorialIsland: MapDef = {
  id: 'tutorial-island',
  name: 'Tutorial Island',
  width: 24,
  height: 24,
  groundColor: '#4f8a3c',
  start: { x: 12, y: 12 },
  spawns: [
    {
      id: 'guide', kind: 'guide', entityType: 'npc', tile: { x: 15, y: 12 }, faceCam: true,
      npc: 'guide', name: 'Guide', examine: 'He shows new arrivals the ropes.',
      dlg: ['Welcome to Eldermoor! Tap the ground to walk.', 'Long-press things to see more options.'],
    },
    {
      id: 'wizard', kind: 'wizard', entityType: 'npc', tile: { x: 9, y: 15 }, faceCam: true,
      npc: 'wizard', name: 'Wizard', examine: 'His robes smell faintly of runes.',
      dlg: ['Magic flows through the runes, traveller.'],
    },
    {
      id: 'merchant', kind: 'merchant', entityType: 'npc', tile: { x: 16, y: 16 }, faceCam: true,
      npc: 'merchant', name: 'Merchant', examine: 'Always looking for a deal.',
      dlg: ['Finest wares in all of Eldermoor!'],
    },
    {
      id: 'rat', kind: 'rat', entityType: 'npc', tile: { x: 13, y: 17 },
      npc: 'rat', combat: true, name: 'Giant rat', examine: 'A large, mangy rodent.',
    },
    {
      id: 'tree1', kind: 'tree', entityType: 'object', tile: { x: 10, y: 10 },
      obj: 'tree', name: 'Tree', examine: 'A sturdy tree — good for logs.',
    },
    {
      id: 'rock1', kind: 'rock', entityType: 'object', tile: { x: 17, y: 9 },
      obj: 'rock', name: 'Copper rock', examine: 'A rock streaked with copper.',
    },
  ],
  decor: [
    { kind: 'pond', tile: { x: 6, y: 18 } },
    { kind: 'fire', tile: { x: 18, y: 14 }, blocked: true },
  ],
  blockedTiles: [[5, 17], [5, 18], [6, 17], [6, 18], [7, 18], [6, 19]], // pond footprint
  scatter: [
    { kind: 'tree', count: 18, minScale: 0.8, maxScale: 1.3, clearRadius: 3 },
  ],
};
