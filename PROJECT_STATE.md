# PROJECT_STATE.md — Eldermoor

**Authoritative current-state snapshot.** Pairs with ARCHITECTURE.md, BACKLOG.md, NEXT_TASKS.md, METRICS.md.
For the full narrative handoff see `PROJECT_HANDOFF.md`; phase status in `ROADMAP.md`; item-level tests in
`PARITY_AUDIT.md`.

- **Live version:** v24 · **Link:** https://eldermoor.vercel.app
- **Overall:** ~22% (features integrated + boot-verified; **live-playtested separately — see METRICS**).
- **Client:** modular ES (`src/*.js`, ~37 modules) + `index.modular.html` shell, Three.js r128 (CDN),
  data-driven from `assets/data/*.json`. Deployed on Vercel. `eldermoor_client.html` = frozen v17 rollback.

## Works (verified in a foreground browser)
Walking / A* pathfinding / collision · camera (orbit, pinch, arrow/WASD/MMB) · HUD chrome (14 tabs, chat
channel filters, minimap, inventory, 23-skill stats total 32).

## Integrated + boot-verified (NOT yet live-playtested)
Render-correctness fixes · scenery + data-driven examine · status orbs + run energy · hover text + tooltips
· world map · minimap terrain + click-to-walk · XP counter · procedural audio · save/load · branching
dialogue runner · NPC speech bubbles · inventory right-click ops · equipment system + tab · Prayer / Magic /
Quests / Settings / Emotes / Music / Friends / Ignore / Account / Logout tabs · skilling engine + fixtures ·
resource depletion · combat engine (melee + ranged + magic-cast, player HP, death/respawn, retaliate) ·
attackable rat + Attack · banking · tutorial state machine · character creator + appearance-apply ·
Make-X interface.

## Recently resolved
- **v24:** ranged combat (bow + arrows consume ammo, projectile, max range, melee fallback, Ranged+HP XP) and
  magic-cast on mobs (click combat spell → target a mob, consume runes, bolt projectile, Magic+HP XP) both
  integrated + cache-free boot-verified; shipped v24. Live-playtest still pending (see METRICS / NEXT_TASKS).
- **BLOCKER (fixed):** a smart-quote normalization pass left unescaped apostrophes inside single-quoted
  strings (e.g. `Expert's`), which `node --check` tolerated but the browser rejected (`Unexpected
  identifier 's'`). Escaped across 33 files; cache-free boot verified clean; shipped v23.

## Standing constraint
No live 3D-interaction testing in the build environment → "integrated" features are unproven in actual play
until a real-browser playtest pass. The headless preview also caches ES-module deps, so re-verification uses
a cache-free copy or the deployed URL.
</content>
