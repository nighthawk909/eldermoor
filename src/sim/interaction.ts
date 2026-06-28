// Interaction logic (headless, testable): given a target entity, what are the options and the
// default (left-click / tap) action? See docs/parity/interaction.md. Render/input + haptics layer
// on top in the client.
import type { Entity } from './world.js';

export type ActionId = 'walk' | 'talk' | 'attack' | 'chop' | 'mine' | 'fish' | 'take' | 'examine';
export interface InteractOption { label: string; action: ActionId; }

function name(e: Entity): string {
  return (e.name as string) ?? e.id;
}

/** Full option list for a target; the FIRST entry is the default (tap / left-click) action. */
export function optionsFor(e: Entity): InteractOption[] {
  const opts: InteractOption[] = [];
  const n = name(e);
  if (e.type === 'npc') {
    if (e.npc === 'rat' || e.combat === true) opts.push({ label: `Attack ${n}`, action: 'attack' });
    else opts.push({ label: `Talk-to ${n}`, action: 'talk' });
  } else if (e.type === 'object') {
    if (e.obj === 'tree') opts.push({ label: `Chop ${n}`, action: 'chop' });
    else if (e.obj === 'rock') opts.push({ label: `Mine ${n}`, action: 'mine' });
    else if (e.obj === 'fishspot') opts.push({ label: `Fish ${n}`, action: 'fish' });
  } else if (e.type === 'grounditem') {
    opts.push({ label: `Take ${n}`, action: 'take' });
  }
  opts.push({ label: `Examine ${n}`, action: 'examine' });
  opts.push({ label: 'Walk here', action: 'walk' });
  return opts;
}

/** The default action run on a plain tap / left-click. */
export function defaultOption(e: Entity): InteractOption {
  return optionsFor(e)[0]!;
}

export function examineText(e: Entity): string {
  return (e.examine as string) ?? `It's a ${name(e).toLowerCase()}.`;
}
