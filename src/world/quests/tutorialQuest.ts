// Tutorial Island guided quest — authored as data (ids match tutorialIsland spawns).
// 4b: a short verifiable sequence exercising talk + reach + interact. The full station-to-station
// walkthrough is authored in 4c.
import type { QuestDef } from '../../sim/quest.js';

export const tutorialQuest: QuestDef = {
  id: 'tutorial',
  name: 'Tutorial Island',
  steps: [
    { id: 'talk_guide', instruction: 'Speak to the Guide to begin.', condition: { type: 'talk', target: 'guide' } },
    { id: 'walk_north', instruction: 'Walk north up the path to the Guard.', condition: { type: 'reach', x: 20, y: 17 } },
    { id: 'use_range', instruction: 'Find the cooking range and use it.', condition: { type: 'interact', target: 'range' } },
  ],
};
