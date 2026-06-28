import { describe, it, expect } from 'vitest';
import { optionsFor, defaultOption, examineText } from '../../src/sim/interaction.js';
import type { Entity } from '../../src/sim/world.js';

const npc = (over: Partial<Entity>): Entity => ({ id: 'e', type: 'npc', tile: { x: 0, y: 0 }, ...over });

describe('Interaction options + default action', () => {
  it('friendly NPC → default Talk-to, plus Examine + Walk here', () => {
    const o = optionsFor(npc({ npc: 'guide', name: 'Guide' }));
    expect(o.map((x) => x.action)).toEqual(['talk', 'examine', 'walk']);
    expect(o[0]!.label).toBe('Talk-to Guide');
    expect(defaultOption(npc({ npc: 'guide', name: 'Guide' })).action).toBe('talk');
  });

  it('monster NPC → default Attack', () => {
    expect(defaultOption(npc({ npc: 'rat', name: 'Giant rat' })).action).toBe('attack');
    expect(defaultOption(npc({ combat: true, name: 'Goblin' })).action).toBe('attack');
  });

  it('tree → Chop, rock → Mine (default first)', () => {
    expect(defaultOption({ id: 't', type: 'object', obj: 'tree', name: 'Tree', tile: { x: 0, y: 0 } }).action).toBe('chop');
    expect(defaultOption({ id: 'r', type: 'object', obj: 'rock', name: 'Copper rock', tile: { x: 0, y: 0 } }).action).toBe('mine');
  });

  it('ground item → Take', () => {
    expect(defaultOption({ id: 'l', type: 'grounditem', name: 'Bones', tile: { x: 0, y: 0 } }).action).toBe('take');
  });

  it('every target has Examine + Walk here, and Examine returns text', () => {
    const o = optionsFor(npc({ npc: 'guide', name: 'Guide' }));
    expect(o.some((x) => x.action === 'examine')).toBe(true);
    expect(o.some((x) => x.action === 'walk')).toBe(true);
    expect(examineText(npc({ name: 'Guide', examine: 'A friendly guide.' }))).toBe('A friendly guide.');
    expect(examineText(npc({ name: 'Thing' }))).toBe("It's a thing."); // fallback
  });
});
