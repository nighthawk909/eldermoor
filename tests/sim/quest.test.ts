import { describe, it, expect } from 'vitest';
import { startQuest, currentStep, conditionMet, applyEvent, progress, type QuestDef } from '../../src/sim/quest.js';

const def: QuestDef = {
  id: 'q', name: 'Test quest',
  steps: [
    { id: 's1', instruction: 'Talk to the Guide.', condition: { type: 'talk', target: 'guide' } },
    { id: 's2', instruction: 'Use the range.', condition: { type: 'interact', target: 'range' } },
    { id: 's3', instruction: 'Reach the dock.', condition: { type: 'reach', x: 5, y: 6 } },
  ],
};

describe('Quest flow state machine', () => {
  it('starts at step 0, not done', () => {
    const s = startQuest(def);
    expect(s.stepIndex).toBe(0);
    expect(s.done).toBe(false);
    expect(currentStep(def, s)?.id).toBe('s1');
  });

  it('a non-matching event does not advance', () => {
    const s = startQuest(def);
    const s2 = applyEvent(def, s, { type: 'talk', target: 'wizard' });
    expect(s2.stepIndex).toBe(0);
    const s3 = applyEvent(def, s, { type: 'interact', target: 'guide' }); // right target, wrong type
    expect(s3.stepIndex).toBe(0);
  });

  it('the matching event advances to the next step', () => {
    const s = startQuest(def);
    const s2 = applyEvent(def, s, { type: 'talk', target: 'guide' });
    expect(s2.stepIndex).toBe(1);
    expect(currentStep(def, s2)?.id).toBe('s2');
  });

  it('applyEvent is immutable (original state untouched)', () => {
    const s = startQuest(def);
    applyEvent(def, s, { type: 'talk', target: 'guide' });
    expect(s.stepIndex).toBe(0);
  });

  it('reach condition matches on both coordinates', () => {
    expect(conditionMet({ type: 'reach', x: 5, y: 6 }, { type: 'reach', x: 5, y: 6 })).toBe(true);
    expect(conditionMet({ type: 'reach', x: 5, y: 6 }, { type: 'reach', x: 5, y: 7 })).toBe(false);
  });

  it('completing the last step finishes the quest', () => {
    let s = startQuest(def);
    s = applyEvent(def, s, { type: 'talk', target: 'guide' });
    s = applyEvent(def, s, { type: 'interact', target: 'range' });
    s = applyEvent(def, s, { type: 'reach', x: 5, y: 6 });
    expect(s.done).toBe(true);
    expect(currentStep(def, s)).toBeNull();
  });

  it('events after completion are no-ops', () => {
    let s = startQuest(def);
    for (const ev of [{ type: 'talk', target: 'guide' }, { type: 'interact', target: 'range' }, { type: 'reach', x: 5, y: 6 }] as const) s = applyEvent(def, s, ev);
    const after = applyEvent(def, s, { type: 'talk', target: 'guide' });
    expect(after).toEqual(s);
  });

  it('progress reports current/total', () => {
    let s = startQuest(def);
    expect(progress(def, s)).toEqual({ current: 0, total: 3 });
    s = applyEvent(def, s, { type: 'talk', target: 'guide' });
    expect(progress(def, s)).toEqual({ current: 1, total: 3 });
  });
});
