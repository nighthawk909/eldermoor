# Eldermoor

Procedural Blender character/hero asset, rendered head-less via [`build_eldermoor.py`](build_eldermoor.py).

## Render

Requires **Blender 4.2+** (developed on 4.3.2).

```bash
# Fast GPU preview (48 spp, 720x900)
blender --background --python build_eldermoor.py -- --preview

# Full-quality hero render (1800x2250, 384 spp) -> eldermoor_hero.png
blender --background --python build_eldermoor.py -- --samples 384 --res 1800 2250
```

The script auto-detects the render device (OptiX > CUDA > HIP > Metal > oneAPI, falling
back to CPU) and prints the choice as `[eldermoor] render device: ...`.

Output paths are resolved against this folder, so a bare `--out name.png` always lands
here rather than the drive root.

### Flags

| Flag | Default | Notes |
|------|---------|-------|
| `--preview` | off | Forces 48 spp @ 720x900 for fast iteration |
| `--samples N` | 384 | Cycles sample count |
| `--res W H` | 1800 2250 | Output resolution |
| `--out PATH` | `eldermoor_hero.png` | Relative paths resolve to this folder |
| `--device TYPE` | AUTO | `AUTO`, `GPU`, or `CPU` |

## CI

Every push runs a fast CPU smoke render (8 spp @ 160x200) via GitHub Actions to verify
the scene still builds and renders without errors. See
[`.github/workflows/render-smoke.yml`](.github/workflows/render-smoke.yml).
