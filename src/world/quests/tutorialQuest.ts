// Tutorial Island guided quest — authored as data (ids/tiles match tutorialIsland spawns).
// The full station-to-station walkthrough. Every 'reach' target is a WALKABLE tile (never a
// blocked station/NPC tile), and every talk/interact target is a real spawn id.
import type { QuestDef } from '../../sim/quest.js';

export const tutorialQuest: QuestDef = {
  id: 'tutorial',
  name: 'Tutorial Island',
  steps: [
    { id: 'talk_guide', instruction: 'Speak to the Guide to begin your training.', condition: { type: 'talk', target: 'guide' } },
    { id: 'survival', instruction: 'Walk to the campfire to start survival training.', condition: { type: 'reach', x: 23, y: 24 } },
    { id: 'fishing', instruction: 'Fish at the fishing spot by the lake.', condition: { type: 'interact', target: 'fishing_spot' } },
    { id: 'cooking', instruction: 'Cook your catch on the range.', condition: { type: 'interact', target: 'range' } },
    { id: 'mining', instruction: 'Mine the copper rock.', condition: { type: 'interact', target: 'rock_copper' } },
    { id: 'smelting', instruction: 'Smelt your ore at the furnace.', condition: { type: 'interact', target: 'furnace' } },
    { id: 'smithing', instruction: 'Hammer a bar at the anvil.', condition: { type: 'interact', target: 'anvil' } },
    { id: 'combat', instruction: 'Defeat the giant rat to learn combat.', condition: { type: 'interact', target: 'rat' } },
    { id: 'prayer', instruction: 'Pray at the altar.', condition: { type: 'interact', target: 'altar_prayer' } },
    { id: 'magic', instruction: 'Speak to the Wizard to learn magic.', condition: { type: 'talk', target: 'wizard' } },
    { id: 'banking', instruction: 'Visit the bank booth in the hut.', condition: { type: 'interact', target: 'bank_booth' } },
  ],
};
