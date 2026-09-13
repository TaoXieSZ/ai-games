# Exporter secondary motion verification

Scope: `scripts/export-hero-models.mjs` GLB animation baking and generated workshop demo secondary motion logic.

Validated behavior:

- Bone animation sampling uses time/phase for Idle, Walk, and Attack, with Attack sampled on canonical `0..0.8` seconds.
- GLB bow strings use the same bone sample time as the arm motion. Each string is rebuilt from metadata tip to computed nock, with +Y along the string and scaleY derived from the tip-to-nock length.
- GLB bow arrows use a frame whose origin is the computed nock and whose +Y points toward the grip before arrow offsets and ZYX local rotations are applied.
- Attachment motion rotates local parts around the metadata pivot while preserving distance to that pivot.
- Workshop demo emits the same attachment metadata and bow metadata, predicts left/right arm frames from current Motor6D C0/C1, converts Roblox part-center frames back to source bone pivots with `bone.center`, then writes weld C0 as `CFrame.new(-leftCenter) * bowLocalFrame` for strings and arrows.

Commands run:

```sh
node --check sanguosha-roblox/scripts/export-hero-models.mjs
```

Result: passed with no output.

Numerical QA script result, using current `data/hero-models-v1.json` without regenerating exports:

```json
{
  "hero": "sun_shangxiang",
  "bowFramesChecked": 6,
  "maxStringEndpointError": 5.775e-16,
  "maxArrowDirectionError": 0,
  "attachmentHero": "cao_cao",
  "attachmentPart": "Cape-1",
  "attachmentRadiusError": 0
}
```

Frames checked for Sun Shangxiang Attack: `0`, `0.11`, `0.224`, `0.4`, `0.512`, and `0.8` seconds. These include intermediate samples in addition to endpoints.

The numerical script independently recomputed the same rigid bone/world matrices, bow nock, string frames, arrow +Y frame, and attachment pivot radius invariants expected from the exporter formulas.
