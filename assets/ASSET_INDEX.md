# Eldermoor — Asset Index (the digital asset library)

Source of truth for every reusable asset. Build/update assets here; game code references them via
`src/render/` factories (realtime) and, later, `assets/models/` glTF (Phase 5+). Author once, place
anywhere by data — never re-model inline. See `docs/Technical_Architecture.md` §5b.

## Authoring sources
- `assets/pipeline/build_eldermoor.py` — Blender hero (the quality bar): sculpted head, tunic +
  spaulders + flared hem, rounded boots, gripped sword, round shield. **This is what in-game
  characters must match.**
- `assets/pipeline/build_hero_v2.py`, `make_face_tex.py`, `face_tex.png` — variants / face texture.

## Realtime factories (built from the playbook — CLAUDE.md §4 palette + faceted flat-shading)
| Asset | Factory (`src/render/`) | Status |
|-------|-------------------------|--------|
| Hero (player) | `characters.ts → makeHero()` | ⬜ building (parity:characters) |
| Human NPC (Guide/Wizard/Merchant) | `characters.ts → makeNPC(opts)` | ⬜ |
| Monster — Giant rat | `characters.ts → makeRat()` | ⬜ |
| Monster — Forest brute | `characters.ts → makeBrute()` | ⬜ |
| Props (tree/rock/fire/anvil/…) | `props.ts` | ⬜ (port from prototype factories) |

## Rule
Adding a creature/prop = a new factory entry here + a `data/` row that places it by `kind`. New world
content is data, not new modelling code.
