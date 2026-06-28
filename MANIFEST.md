# MANIFEST.md — Eldermoor assets

The work, in small verified chunks. Build top-to-bottom. One chunk per loop (see SKILL.md).
Status: `todo` / `doing` / `done`. A chunk is `done` only when its DoD passes a reference check.

Legend for DoD shorthand: continuous mesh (no primitive seams/gaps), substance materials
(not flat plastic), textured face/skin, correct silhouette, clean GPU render.

---

## EPIC 1 — Adventurer (hero)  ⟵ active

Current state: approved blockout exists (`build_eldermoor.py`), but reads as stacked
primitives with flat colors and a geometry-only face. Rebuild to standard, chunk by chunk.

| # | Chunk | Definition of Done | Status |
|---|-------|--------------------|--------|
| A1 | **Head mesh** | Skull + features joined into one mesh; doubles welded; hybrid smooth/facet shading; chin/nose/brow silhouette intact; no floating feature parts | todo |
| A2 | **Face texture** | Painted skin/eyes/brows/mouth texture (generated in code) UV-mapped to the head front; eyes no longer grey rectangles; reads as a face at 1m | doing |
| A3 | **Body mesh** | Torso/shoulders/sleeves joined; waist seam gone; sleeve↔shoulder gaps closed; hands resized + shaped (not blobs) | todo |
| A4 | **Materials** | Procedural cloth (tunic), leather (belt/boots), steel (sword/shield), skin — bump + roughness variation; no flat plastic | todo |
| A5 | **Gear pass** | Sword/shield/cape refined; cape gets cloth shading + slight drape; shield face detailed | todo |
| A6 | **Beauty + turntable** | Final hero render at 1800×2250/384 + a turntable (N frames) for full-angle review | todo |

## EPIC 2 — Townsfolk (Merchant)
Reuse A1–A4 methods. Robe silhouette, distinct from hero. — todo

## EPIC 3 — Hostile (Forest Brute)
Original hunched brute. Reuse methods; add tusks/claws as joined geometry. — todo

## EPIC 4 — Cast lineup + world
Lineup render of all three; then town/zone using the world palette. — todo

---

## Active chunk

**A2 — Face texture.** First tangible step out of the "grey rectangle eyes" problem:
generate a painted face texture in code, then UV-map it onto the head (A1 mesh).
Sub-steps: (1) generate the texture image [in progress], (2) build A1 joined head,
(3) project UVs from front, (4) render head-only, inspect, iterate.
