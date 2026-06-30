# 44_CHARACTER_RIG.md — shared character base & equipment-swap

One humanoid base from which **every** player and NPC is derived. NPCs differ only by
proportions, clothing, colors, and accessories — never a bespoke rig (`00_PROJECT_VISION` §4).
Construction method is the CLAUDE.md-locked approach (sculpted icosphere head, tapered cylinder
torso/limbs, rounded forms) — explicitly **not** stacked boxes (that's the slop we're killing).
Proportion reference: `42_MODELING_SPEC`. Built via `build_kit.py` / `build_eldermoor.py`.

---

## 1. Base proportions
- Total height **≈ 2.0 u (~1 tile)**. Head ≈ 0.34u; torso ≈ 0.9u; legs/robe ≈ 0.95u.
- Silhouette is **continuous and rounded** — no Minecraft cubes, no gaps at joints.
- Faces are **simple**: minimal features (eyes always; nose/brow/beard as accessories).

## 2. Shared skeleton (joint list — for animation reuse)
`root → hips → spine → chest → neck → head`; arms `shoulder.L/R → elbow → wrist`; legs
`hip.L/R → knee → ankle`. All NPCs reuse this skeleton so animations are authored once.

## 3. Animation states (reusable across all characters)
`idle` · `walk` · `attack_melee` · `attack_ranged` · `cast` · `block` · `death`. Simple,
readable, no facial rig / cloth sim / physics (`00_PROJECT_VISION` §4). (Static meshes now;
rig + clips when the client animation system lands, domain `ANIM`.)

## 4. Equipment-swap slots (mesh swaps on the base)
`head` (hat/helm/hood) · `torso` (robe/tunic/body) · `legs` · `feet` · `hands` (gloves) ·
`weapon` · `shield` · `cape` · `ammo`. Equipping swaps the slot mesh + updates combat stats
(`52_INVENTORY_EQUIPMENT`). Large, readable gear per art bible.

## 5. NPC variation parameters (data-driven, `47_CONTENT_DATA_FORMAT`)
`heightScale` · `girth` · `skin` · primary/secondary `clothingColor` · `accessory`
(hood/hat/beard/none) · equipped items. A `NpcDef` is just these values over the base.

## 6. Acceptance (parity)
1. ☐ Reads as a proper low-poly character at gameplay distance — rounded, continuous, NOT cubic.
2. ☐ Silhouette communicates the role at a glance (a monk reads as a monk).
3. ☐ Simple readable face (eyes present; features per accessory).
4. ☐ On-palette; flat even lighting; no PBR sheen.
5. ☐ Tris ≤ ~900 (NPC) / ≤ ~1200 (hero); materials ≤ 6.
6. ☐ Renders clean on GPU; sits correctly on the ground plane, no float/clip.

## 7. Metadata (per `41_ASSET_STANDARDS`)
```
id: char.base.humanoid             display: "Humanoid base"
category: character/base           scale: ~2.0u (~1 tile)
tris: ≤900 npc / ≤1200 hero        materials: ≤6
collision: 1 tile capsule          anims: idle,walk,attack_melee,attack_ranged,cast,block,death
slots: head,torso,legs,feet,hands,weapon,shield,cape,ammo
variants: monk(Brother-Brace eq.), guide, merchant, brute, ... (NpcDef over base)
deps: 42_MODELING_SPEC, 45_ANIMATION_LIBRARY   folder: /assets/characters
```
