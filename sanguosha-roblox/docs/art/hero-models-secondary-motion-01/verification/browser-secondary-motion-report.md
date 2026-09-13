# Secondary motion browser verification

Source: http://127.0.0.1:4178/preview/hero-models/

No repo source, data, export, or Studio files were modified by this verification. The script samples the live browser page and calls the same matrix functions used by rendering and bounds.

## Summary

- Hero count: 25
- Finite matrix/point failures: 0
- CDP console errors/warnings: 0
- Attachment motion entries sampled: 30
- Bow attack samples: 10
- Max bow string paired endpoint error: 2.480493e-15 studs
- Min arrow +Y axis dot with nock→grip: 1.000000
- Max nock local/world consistency error: 1.195747e-15 studs

## Key screenshots

- browser-sun-shangxiang-ready.png
- browser-sun-shangxiang-attack-draw.png
- browser-sun-shangxiang-attack-rebound.png
- browser-source-bow-ready-front.png, copied from /tmp/bow-motion-qa when available
- browser-source-bow-attack-520ms.png, copied from /tmp/bow-motion-qa when available

## Coverage

- All 25 heroes: ready/walk/attack sampled at multiple times.
- Attachment pivot stability: every attachment entry keeps the authored pivot array constant across ready/walk/attack samples.
- Sun Shangxiang bow: both string segments are checked against tip/nock endpoints through charge and rebound samples; arrow +Y is checked against nock→grip.
