// Tutorial Island — the starting region, expressed purely as data. A 40×40 island: ocean all
// around, a sand coastline, a grass landmass with a path network and an inland lake, populated
// with the varied asset library across loose zones (forest NW, mining N, village SE, field SW).
// Buildings/fences and full skill-station rooms arrive in the next sub-increments.
import type { MapDef } from '../mapTypes.js';

export const tutorialIsland: MapDef = {
  id: 'tutorial-island',
  name: 'Tutorial Island',
  width: 40,
  height: 40,
  groundColor: '#2c6a82', // ocean base plane
  start: { x: 20, y: 20 },
  terrain: [
    { kind: 'sand', x: 4, y: 4, w: 32, h: 32 },   // beach / coastline
    { kind: 'grass', x: 6, y: 6, w: 28, h: 28 },   // landmass (2-tile sand ring)
    { kind: 'path', x: 19, y: 7, w: 2, h: 26 },    // N–S road
    { kind: 'path', x: 7, y: 19, w: 26, h: 2 },    // E–W road
    { kind: 'water', x: 9, y: 27, w: 6, h: 5 },    // inland lake (SW)
  ],
  spawns: [
    // village / start
    { id: 'guide', kind: 'guide', entityType: 'npc', tile: { x: 22, y: 20 }, faceCam: true, npc: 'guide', name: 'Guide', examine: 'He shows new arrivals the ropes.', dlg: ['Welcome to Eldermoor! Tap the ground to walk.', 'Follow the paths — each clearing teaches a skill.'] },
    { id: 'guard', kind: 'guard', entityType: 'npc', tile: { x: 20, y: 16 }, faceCam: true, npc: 'guard', name: 'Guard', examine: 'Keeps the peace on the island.', dlg: ['Mind how you go, traveller.'] },
    { id: 'merchant', kind: 'merchant', entityType: 'npc', tile: { x: 28, y: 28 }, faceCam: true, npc: 'merchant', name: 'Merchant', examine: 'Always looking for a deal.', dlg: ['Finest wares in all of Eldermoor!'] },
    { id: 'townsfolk_m', kind: 'townsfolk_m', entityType: 'npc', tile: { x: 26, y: 30 }, faceCam: true, npc: 'townsfolk', name: 'Villager', examine: 'A local going about their day.', dlg: ['Lovely weather on the island today.'] },
    { id: 'townsfolk_f', kind: 'townsfolk_f', entityType: 'npc', tile: { x: 30, y: 26 }, faceCam: true, npc: 'townsfolk', name: 'Villager', examine: 'A local going about their day.', dlg: ['Welcome to our little island.'] },
    // wizard NE
    { id: 'wizard', kind: 'wizard', entityType: 'npc', tile: { x: 30, y: 10 }, faceCam: true, npc: 'wizard', name: 'Wizard', examine: 'His robes smell faintly of runes.', dlg: ['Magic flows through the runes, traveller.'] },
    // monsters — SW field + scattered
    { id: 'rat', kind: 'rat', entityType: 'npc', tile: { x: 14, y: 24 }, npc: 'rat', combat: true, name: 'Giant rat', examine: 'A large, mangy rodent.' },
    { id: 'goblin', kind: 'goblin', entityType: 'npc', tile: { x: 12, y: 23 }, npc: 'goblin', combat: true, name: 'Goblin', examine: 'Small, green and spoiling for a fight.' },
    { id: 'spider', kind: 'spider', entityType: 'npc', tile: { x: 16, y: 26 }, npc: 'spider', combat: true, name: 'Giant spider', examine: 'Eight legs too many.' },
    { id: 'cow', kind: 'cow', entityType: 'npc', tile: { x: 17, y: 31 }, npc: 'cow', combat: true, name: 'Cow', examine: 'It chews, indifferent to you.' },
    { id: 'imp', kind: 'imp', entityType: 'npc', tile: { x: 32, y: 14 }, npc: 'imp', combat: true, name: 'Imp', examine: 'A mischievous little demon.' },
    // mining cluster (N) — ore variety
    { id: 'rock_copper', kind: 'rock_copper', entityType: 'object', tile: { x: 24, y: 9 }, obj: 'rock', name: 'Copper rock', examine: 'A rock streaked with copper.' },
    { id: 'rock_tin', kind: 'rock_tin', entityType: 'object', tile: { x: 25, y: 10 }, obj: 'rock', name: 'Tin rock', examine: 'A rock streaked with tin.' },
    { id: 'rock_iron', kind: 'rock_iron', entityType: 'object', tile: { x: 26, y: 9 }, obj: 'rock', name: 'Iron rock', examine: 'A rock rich with iron.' },
    { id: 'rock_coal', kind: 'rock_coal', entityType: 'object', tile: { x: 24, y: 11 }, obj: 'rock', name: 'Coal rock', examine: 'A seam of coal.' },
    { id: 'rock_clay', kind: 'rock_clay', entityType: 'object', tile: { x: 26, y: 11 }, obj: 'rock', name: 'Clay rock', examine: 'Soft, workable clay.' },
    // a chopnable tree by the start
    { id: 'tree1', kind: 'tree_oak', entityType: 'object', tile: { x: 17, y: 14 }, obj: 'tree', name: 'Tree', examine: 'A sturdy oak — good for logs.' },
  ],
  decor: [
    { kind: 'fire', tile: { x: 23, y: 23 }, blocked: true }, // survival campfire near start
  ],
  scatter: [
    { kind: 'tree_oak', count: 16, minScale: 0.85, maxScale: 1.3, clearRadius: 4 },
    { kind: 'tree_pine', count: 12, minScale: 0.9, maxScale: 1.4, clearRadius: 4 },
    { kind: 'tree_willow', count: 6, minScale: 0.85, maxScale: 1.2, clearRadius: 4 },
    { kind: 'tree_dead', count: 4, minScale: 0.9, maxScale: 1.2, clearRadius: 4 },
  ],
};
