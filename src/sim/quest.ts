// Quest flow — a headless, deterministic, immutable step machine. A quest is an ordered list
// of steps; each step has an instruction and a completion condition. The player produces events
// (talked to X, interacted with Y, reached a tile); applyEvent advances the active step when its
// condition is met and returns a NEW state. Used for the Tutorial Island guided path.
// See docs/modules/Quest.md.

export type QuestCondition =
  | { type: 'talk'; target: string }       // talk-to an NPC id
  | { type: 'interact'; target: string }   // use/examine an object id (a station)
  | { type: 'reach'; x: number; y: number }; // arrive at a tile

export interface QuestStep {
  id: string;
  instruction: string;        // shown in the HUD as the current objective
  condition: QuestCondition;
}

export interface QuestDef {
  id: string;
  name: string;
  steps: QuestStep[];
}

export interface QuestState {
  questId: string;
  stepIndex: number;          // index of the active step; === steps.length ⇒ finished
  done: boolean;
}

export type QuestEvent =
  | { type: 'talk'; target: string }
  | { type: 'interact'; target: string }
  | { type: 'reach'; x: number; y: number };

export function startQuest(def: QuestDef): QuestState {
  return { questId: def.id, stepIndex: 0, done: def.steps.length === 0 };
}

export function currentStep(def: QuestDef, state: QuestState): QuestStep | null {
  if (state.done) return null;
  return def.steps[state.stepIndex] ?? null;
}

export function conditionMet(cond: QuestCondition, ev: QuestEvent): boolean {
  if (cond.type !== ev.type) return false;
  if (cond.type === 'reach' && ev.type === 'reach') return cond.x === ev.x && cond.y === ev.y;
  if ((cond.type === 'talk' && ev.type === 'talk') || (cond.type === 'interact' && ev.type === 'interact')) {
    return cond.target === ev.target;
  }
  return false;
}

/** Apply a player event. Advances (immutably) iff it satisfies the active step's condition. */
export function applyEvent(def: QuestDef, state: QuestState, ev: QuestEvent): QuestState {
  if (state.done) return state;
  const step = def.steps[state.stepIndex];
  if (!step) return { ...state, done: true };
  if (!conditionMet(step.condition, ev)) return state;
  const stepIndex = state.stepIndex + 1;
  return { ...state, stepIndex, done: stepIndex >= def.steps.length };
}

/** Progress for a HUD readout (e.g. "Objective 3 / 10"). */
export function progress(def: QuestDef, state: QuestState): { current: number; total: number } {
  return { current: Math.min(state.stepIndex, def.steps.length), total: def.steps.length };
}
