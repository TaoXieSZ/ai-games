# Hero Effects V1 Browser Verification

Date: 2026-09-13
URL: http://127.0.0.1:4178/preview/hero-models/?hero=sun_shangxiang
Browser: Chrome headless with SwiftShader WebGL via CDP script.

## Coverage

- Loaded shared configuration from `../../data/hero-effects-v1.json`; no hardcoded timing/color fallback is used.
- Verified four effect buttons appear in order: `slash`, `dodge`, `heal`, `arrows`.
- Captured each effect during release/impact timing:
  - `browser-effect-slash.png`
  - `browser-effect-dodge.png`
  - `browser-effect-heal.png`
  - `browser-effect-arrows.png`
  - `browser-effect-mobile-arrows.png`
- Contact sheet: `browser-effects-contactsheet.png`.

## Resource Stability

Initial model-only render: `meshCache=1196`, `gpuUploads=76`.
After first pass through the four effects: `meshCache=1212`, `gpuUploads=92`.
After 24 rapid replays alternating slash/arrows: `meshCache=1212`, `gpuUploads=92`.
The effect state remained single-active (`pressedCount=1`) during replay and returned to `ready` after completion.

## Interaction Checks

- Clicking an effect starts one active effect and updates the stage label.
- Clicking cancel clears `activeEffect`, restores `ready`, and shows the cleared message.
- Switching hero clears `activeEffect`, restores `ready`, and resets the stage label to `选择技能预览特效`.
- Mobile viewport `390×844` keeps the stage visible and all four effect buttons present.

## Result

Pass. No page exceptions and no console errors were captured by the browser QA script.
