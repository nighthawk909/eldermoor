# MODELING_SPEC.md — Eldermoor Adventurer

The **standard**. CLAUDE.md says *don't shortcut*; ASSET_MANIFEST.md says *what* to build; this
file says *what "good" means*, in numbers and checks an agent can execute and verify.

> How to use: every ASSET_MANIFEST chunk's Definition of Done points here. A chunk is `done`
> only when its parts of the **Acceptance Checklist** (§7) pass against the reference (§1).
> "The code ran" is never done.

---

## 1. Reference & register

**Target:** early-RuneScape low-poly. Faceted but *clean and defined* — not stacked blocks,
not photoreal. Keep `reference/osrs_*.png` in the repo and judge against it every loop.

The defining traits to hit (these are what read as "RuneScape" vs "toy"):
- A **defined nose and brow** as real geometry (silhouette in profile).
- A **painted face** — eyes/brows/mouth are *texture*, never geometry.
- **Continuous body forms** — one shell, no primitive seams, no joint gaps.
- A **readable silhouette** — recognizable in pure black.

## 2. Proportions (measurable; tolerance ±5%)

Total height **H ≈ 2.0 m**, ~6 head-heights. Express everything as a fraction of H.

| Part | Spec |
|------|------|
| Head height | 0.165 H (~0.33 m) |
| Head width | 0.9–1.05 × head height |
| Neck | 0.03 H |
| Torso (shoulder→hip) | 0.30 H |
| Legs (hip→floor) | 0.46 H |
| Arm (shoulder→wrist) | 0.38 H |
| Shoulder width | 1.5–1.7 head-widths |
| Hand length | 0.7–0.8 × head height |
| Foot length | 0.9–1.0 × head height |

Build slim and upright; slight heroic stance. No squat/chibi proportions.

## 3. Topology standard (this is what turns "blocky" into "defined")

- **Quad-dominant.** Build from grids/lofts; n-gons only on flat caps. No stray triangles
  mid-surface.
- **One continuous body shell.** Torso + shoulders + pelvis are a single welded mesh lofted
  through cross-sections (hip → waist → chest → shoulder). **No two-cylinder waist seam.**
- **Edge loops at every joint** (even pre-rig — loops define form): ≥2 loops each at
  shoulder, elbow, wrist, hip, knee, ankle; a clean waist loop; brow / cheekbone / jaw loops
  on the head.
- **Weld doubles** after any join: `bmesh.ops.remove_doubles`, merge distance **0.0005 m**.
- **No interior geometry** — delete faces hidden inside after joins/booleans.
- **Normals** recalculated outside, consistent; zero flipped faces.
- **Shading:** smooth shading + **auto-smooth at 35°** on organic parts (head, limbs, torso)
  so curves flow but hard edges (jaw ridge, armor edges) stay crisp. Flat-shade only true
  facets (gem, blade bevels).
- **Bevel hard edges:** width 1–2% of the part's smallest dimension, 1–2 segments, **after
  applying scale** (so width is uniform). Edges must catch a highlight.

### Triangle budget (clean low-poly; guidance, not a cage)

| Part | Tris |
|------|------|
| Head (no hair) | 400–700 |
| Hair | 150–300 |
| Torso shell | 600–1000 |
| Each arm + hand | 350–600 |
| Each leg + boot | 350–550 |
| Sword / shield / cape | ~150 each |
| **Character total** | **~3,000–5,500** |

If a part is way under budget it's probably under-defined; way over means it stopped being
low-poly. Use the budget as a sanity gauge against the silhouette read.

## 4. Per-region build standard

**Head.** Base from a subdivided cube or icosphere; shape with loops to a tapered jaw/chin.
The **nose is extruded from the face** (select the nasal faces, extrude forward + down,
shape) — *not* a separate cone stuck on. Brow is a loop ridge, not a floating slab.
**No eye geometry** — eyes come from the texture (§5). Smooth + auto-smooth 35°.

**Torso.** Single lofted shell as above. Shoulders are the top of the shell sloping into the
arm holes — not a stacked yoke. Tabard/trim is a shallow inset or a separate thin panel that
sits flush, not a floating box.

**Arms.** Tapered tube, loops at shoulder/elbow/wrist, welded or bridged into the shell.

**Hands.** Shaped mitts: a palm volume + a tapered finger block (a suggested thumb is enough
at this scale). **No icosphere blobs.** Hand length per §2.

**Legs.** Tapered, loops at hip/knee/ankle.

**Boots.** Continuous form with heel, instep, and toe — not stacked boxes. Sole as a thin
inset rim.

**Gear.** Sword: beveled blade (optional shallow fuller), guard, wrapped grip, pommel.
Shield: slightly **domed** disc (not a flat cylinder), rim, central boss. Cape: subdivided
cloth plane shaped with a lattice/displace or hand-set verts for a real drape — not a flat
board.

## 5. UV & texture standard

- **Head must be UV-unwrapped** (front-biased projection or smart unwrap; seam hidden at the
  back under the hair) so the painted face lands correctly on the curved surface.
- **Painted maps are Claude-generated** (e.g. `make_face_tex.py`). Face texture ≥ **2048²**
  for the hero head; body/atlas maps ≥ 1024².
- Consistent texel density across parts. Eyes/brows/mouth/skin-shading live in the texture.

## 6. Material standard (no flat plastic)

Procedural node setups, one per substance — each needs **color variation + bump + roughness
variation**, never a single solid BSDF:

| Material | Notes |
|----------|-------|
| Skin | base + face texture; subtle roughness break-up; soft, not glossy |
| Cloth (tunic/cape) | noise/wave bump for weave; roughness ~0.8 |
| Leather (belt/boots) | voronoi/cell bump for grain; roughness ~0.6 |
| Steel (blade/boss) | metallic 1.0, roughness ~0.3, slight variation; no mirror chrome |
| Wood (shield/grip) | wave grain; roughness ~0.7 |

## 7. Acceptance checklist (run every loop — this is what makes "better" verifiable)

Render **front + side + 3⁄4 + a turntable** under the neutral eval setup (§8), then check.
Each item is pass/fail; any fail = fix and re-loop.

**Silhouette**
- [ ] Recognizable as the character in pure black.
- [ ] Proportions match §2 within ±5% (measure in-scene).

**Topology** (scriptable to verify)
- [ ] Body is one continuous shell — no visible primitive seam at the waist.
- [ ] No gaps at sleeve↔shoulder, hip↔pelvis, neck↔torso.
- [ ] Doubles welded (vertex count sane; no coincident verts at merge dist).
- [ ] Normals consistent; no black/flipped faces.
- [ ] Tri count within §3 budget.

**Head / face**
- [ ] Nose is extruded geometry (shows in profile), not a stuck-on part.
- [ ] Eyes/brows/mouth are texture; **zero eye geometry**.
- [ ] Face reads as a face at 1–2 m, no uncanny dark-top/pale-bottom split.

**Hands**
- [ ] Shaped (palm + fingers), not blobs; sized per §2.

**Shading / materials**
- [ ] Auto-smooth correct: curves flow, hard edges stay crisp; no faceting on round forms.
- [ ] Each part reads as its substance, not plastic (bump + roughness present).

**Render**
- [ ] Clean AA at production settings; confirmed on GPU.

## 8. Evaluation setup (keep constant so critiques compare)

Neutral mid-grey studio, three-point light, AgX-Punchy, 50–72 mm lens, character framed
head-to-toe. Same setup every eval. Turntable = 24 frames for silhouette review.

## 9. Anti-patterns (automatic fail)

- Stacked primitives left as *final* geometry (blockout only).
- Single-color flat BSDF as a finished material.
- Eyes/brows as geometry.
- Icosphere-blob hands; two-cylinder torso; flat-board cape; flat-disc shield.
- Advancing a chunk because "the script ran."
- Lowering resolution/samples/ambition instead of fixing the model.

## 10. Method

Many small modeling passes — add loops → shape → weld → re-render → judge against §7 →
repeat — per the loop in SKILL.md. Geometry is *worked*, not one-shot. The blockout in
`build_eldermoor.py` is the starting point to model *over*, not the finish line.
