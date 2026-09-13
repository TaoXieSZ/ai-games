# Hero Effects V2 Notes

This pass keeps the four existing art-preview effect ids and timings: `slash`, `dodge`, `heal`, and `arrows`. It adds a presentation-only `cue` block to `data/hero-effects-v1.json` so the browser preview and Roblox playground can show a short skill-name callout above the acting hero.

The cue does not change card rules, target legality, damage, healing, hand count, or equipment state. Gameplay code can continue to treat these as visual events after its own validation.

## Native Playground Behavior

- Each play event creates one `Workspace.HeroPlaygroundClientEffects/Effect_*` folder for the casting player.
- `SkillCue` is a `BillboardGui` parented inside that folder and adorning the character `Head`, so replacing, canceling, switching hero, or removing the character destroys the cue with the rest of the effect. It uses normal world occlusion rather than forcing `AlwaysOnTop`.
- The cue uses only native GUI primitives: a small diamond seal, radial line frames, a symbol, and the Chinese skill label from the shared spec.
- `slash` now has thicker weapon streaks, a white-hot core, arrowhead support for bow users, and a small impact burst.
- `dodge` uses segmented humanoid afterimages instead of one large transparent slab.
- `heal` uses wider peach petals plus two rising spiral wisps around the body.
- `arrows` adds falling arrow trails, visible arrowheads, and stronger impact ripples.

## Shared Cue Defaults

`slash`, `dodge`, and `heal` use `cue.duration = 1.05` and `cue.height = 2.1`. `arrows` uses `cue.duration = 1.35` because the range skill has a longer telegraph.
