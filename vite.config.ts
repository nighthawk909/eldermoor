import { defineConfig } from 'vite';

// Multi-page build so the live deploy can serve BOTH the current game (index.html)
// and the in-progress new-engine demos, plus a progress hub.
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',                 // current playable prototype (the game)
        progress: 'progress.html',          // hub linking everything + status
        tick: 'tick-harness.html',          // new engine: tick heartbeat
        movement: 'movement-harness.html',  // new engine: tile movement demo
        characters: 'characters-showcase.html', // character factory showcase (hero/NPCs/monsters)
      },
    },
  },
});
