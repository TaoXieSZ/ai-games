# Wei Cast Polish V3 Review

Scope: `sanguosha-roblox/scripts/hero_model_designs/wei.py` only. I viewed each Wei reference PNG in `assets/art-design/hero-pool-v1/` before editing and kept the R6 7-bone rig, existing weapon/action profiles, and ready poses intact.

## Cao Cao

- Reference anchors: tall square imperial crown with side pin, stern brows and block beard, dark blue lamellar armor, gold dragon plaques, command pose, short wine-red cape, and waist sword with tassel.
- Prior gap: the model had the crown, beard, armor, cape, and sword, but the imperial surfaces were too flat and lacked the dragon/crown/pinned-cape density from the painting.
- Concrete changes: added crown side pins and orbs, crown dragon mask, swept face hair, framed chest plate, rivet grid, chest dragon motif, shoulder command panels, sleeve key borders, gold cape folds, and sword tassel cords picked up by existing secondary motion.

## Sima Yi

- Reference anchors: narrow wolf-gaze posture, tall black advisor cap with purple gem, high collar, long slate-purple sleeves, black and violet robe panels, hidden hand, judgment cards, bamboo/cloud robe markings, and smoky fate feel.
- Prior gap: the model removed infantry armor well, but the hat, collar, sleeve interiors, robe prints, and back-hand silhouette were still too sparse for the reference.
- Concrete changes: added high collar wings, hidden back hand and sleeve pocket, moon robe stripes, cloud marks, sleeve silver rims and purple interiors, bamboo robe strokes, echoed judgment cards, cap gem, cap ribs, and rear cap ribbons.

## Xiahou Dun

- Reference anchors: black eyepatch with strap, rugged scar, blue battle headband and tails, thick ponytail, single oversized shoulder plate, red sash, forward guarding bracer, and heavy saber carried over the shoulder.
- Prior gap: the eyepatch and shoulder saber were present, but the head silhouette and counter-attack body language lacked the reference's layered headband, ponytail, scar, and guarding arm.
- Concrete changes: added headband tails, ponytail lock cluster, wolf badge, eyepatch strap, bronze cheek scar, studded oversized shoulder, guarding left bracer, red sash tails, gold saber spine, and blue blade tassel.

## Zhang Liao

- Reference anchors: fast cobalt raider silhouette, pointed helmet, long blue plume, cheek guards, silver forearm guards, lamellar stud rows, shin armor, paired short hook halberds, blue tassels, and snatched card echoes.
- Prior gap: the double weapons existed, but the model read more like generic armored infantry than a speed-focused raider with a blue plume and light plated silhouette.
- Concrete changes: added swept hair, cheek guards, seven-part blue plume, plume band, V chest strips, chest studs, light shoulder plates, silver forearm wraps, shin dash plates, lower crescent blades, weapon tassels, and raid card echoes.

## Xu Chu

- Reference anchors: largest blocky body, exposed arms, open dark vest, tiger pelt waist with white fur, wild top hair, gold arm bands, planted stance, and square tiger-head hammer with orange impact marks.
- Prior gap: the tiger waist and hammer were readable, but he still needed more bare-body mass, hair shape, pelt texture, and a stronger tiger face on the hammer.
- Concrete changes: removed default hair, added brute hair mass, fringe and top locks, open vest panels, chest shadow/lines, white fur front and tufts, bicep bands with studs, hammer nose/eyes, orange hammer slashes, and ground spark facets.

## Guo Jia

- Reference anchors: fragile slim scholar, silver-white hair, pale blue and white robes, oversized sleeves and shawl, tired gentle face, bamboo scroll tube, two glowing cards, waist tassel, and icy omen glow.
- Prior gap: the earlier model carried scholar robes and cards but still used default dark hair and lacked the sickly oracle identity from the painting.
- Concrete changes: removed inherited hair and added silver hair back/top, a larger front hair cap, soft white fringe, temple locks, loose side locks, segmented rear strands, small hair ornament, pale inner robe, hand pressed to chest, blue collar folds, white sleeve flashes, sleeve gold edges, bamboo skirt prints, omen cards, blue glow plates, and oracle belt tassel.

## Zhen Ji

- Reference anchors: ice-blue and white court dress, layered skirt panels, long water sleeves, black hair, floral gold hair ornaments, bead drops, fan held low, flower embroidery, black card petals, and blue water arcs.
- Prior gap: the model was already close, but the torso flowers, sleeve face panels, hair blossoms, and black-petal skill read needed more density.
- Concrete changes: added flower bodice panel, lapel threads, bodice flowers, ivory skirt pleats, navy skirt borders, navy sleeve faces, sleeve flowers, braided hair ridge, face-curtain locks, longer rear hair, rear hair ribbons, larger hair blossoms, gold hairpin needles, black petal cards pushed wider around the silhouette, and water arcs.

## Motion Notes

- Existing secondary motion picks up `Cape` panels, `JudgeRibbon`, `WaterSleeveTail`, `HairTassel`, and any non-ring/non-knot part whose name includes `Tassel`.
- New Cao Cao sword cords, Xiahou Dun blade tassel, Zhang Liao halberd tassels, Guo Jia oracle/sleeve tassels, and Zhen Ji existing hair tassels/water sleeves are covered by the current pass.
- Xu Chu remains intentionally rigid except for normal limb animation; the hammer, pelt face, and impact marks should move as part of the authored arm/torso bones.

## Visual Pass Notes

- I inspected `contact-wei-front.png`, `contact-wei-side.png`, `contact-wei-back.png`, and the individual after/front/side/back PNGs for Guo Jia and Zhen Ji.
- The visual pass found that Guo Jia's first silver-hair pass read as a pale forehead band from the front and a flat gray block from the back. I fixed this by adding a fuller front cap, temple locks, longer side locks, and segmented rear strands.
- The visual pass found that Zhen Ji's hair and black-card read were still too quiet at gallery scale. I fixed this by adding face-curtain locks, rear hair ribbons, larger blossoms, and wider black petal cards around the outer silhouette.
- Cao Cao, Sima Yi, Xiahou Dun, Zhang Liao, and Xu Chu were inspected in the Wei contact sheet and individual front PNGs. Their major silhouette changes are visible enough for root's integrated rebuild pass.

## Verification

- `python3 -m py_compile sanguosha-roblox/scripts/hero_model_designs/wei.py` passed.
- In-memory `wei.build_models()` produced 7 models: `cao_cao`, `sima_yi`, `xiahou_dun`, `zhang_liao`, `xu_chu`, `guo_jia`, `zhen_ji`.
- Each generated model kept 7 bones, all parts reference existing bones, and no duplicate part names were found.
- In-memory face and secondary-motion passes completed without writing generated data. Final verified part counts after face/motion passes: Cao Cao 229, Sima Yi 88, Xiahou Dun 180, Zhang Liao 228, Xu Chu 105, Guo Jia 114, Zhen Ji 182.

## Final Rendered Acceptance

- Inspected final rebuilt `contact-wei-front.png`, `contact-wei-side.png`, `contact-wei-back.png`, plus final individual Guo Jia and Zhen Ji front/side/back PNGs.
- Cao Cao: accepted for this pass. The square crown, command sword, gold chest motif, red cape, and ruler silhouette are visible at contact-sheet scale. Remaining polish would be finer dragon scrollwork and richer cape material.
- Sima Yi: accepted for this pass. The wolf-gaze turn, dark advisor cap, long robe, judgment card, and thin gold robe lines read clearly. Remaining polish would be a more dramatic smoky/card aura in animation.
- Xiahou Dun: accepted for this pass. The eyepatch, oversized shoulder, guarding arm, shoulder saber, headband, and counter-fighter stance are visible. Remaining polish would be cooling down the warm orange accent balance closer to the blue-gray reference.
- Zhang Liao: accepted for this pass. The dual halberds, blue plume, plated chest/legs, and raider silhouette are readable from front, side, and back. Remaining polish would be more swept plume volume during motion.
- Xu Chu: accepted for this pass. The bare arms, open vest, tiger pelt, large body, and tiger hammer identity read clearly. Remaining polish would be deeper hammer-face sculpting and more ground impact staging.
- Guo Jia: accepted after the final rebuild. The earlier near-bald/flat-gray-head issue is resolved; front hair, side locks, and rear segmented white hair now read as full silver hair. Remaining polish would be softer sleeve folds and more visible floating-card glow.
- Zhen Ji: accepted after the final rebuild. The head hair, floral pins, fan, water sleeves, and wider black-card petals now read at gallery scale. Remaining polish would be subtler facial elegance and more translucent robe layering.
- No critical remaining visible regression found in the Wei 7 scope. All remaining items above are next-pass art polish rather than blocking defects.
