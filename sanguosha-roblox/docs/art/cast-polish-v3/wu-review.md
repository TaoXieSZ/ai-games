# Wu Cast Polish V3 Review

Scope: only `scripts/hero_model_designs/wu.py`. I viewed all eight Wu reference PNGs before authoring and kept the 7-bone R6 rig intact.

## Sun Quan

- Reference anchors: tall gold crown with red jewel, teal robe under red lamellar armor, dragon/animal gold ornamentation, red cape, wide sword, floating card arc.
- Prior gap: the silhouette had crown/cape/cards, but the torso read as a simple framed plate without the dense red armor tiles, beast belt, sleeve trim, or leg armor rhythm from the painting.
- Changes: added `RoyalBreast*` armor tiles and rivets, `RoyalLionBuckle*`, crown ruby and crown ribbons, dragon-like shoulder trims, red wrist cuffs, leg plates, blade etching, and a fourth floating balance card.
- Remaining: `CrownRibbon*` can be considered for secondary motion.

## Gan Ning

- Reference anchors: pirate-like forward motion, spiked black hair, red headband and torn vest, bare tattooed arm, black bracers, teal waist ribbons, bells, back sail flag, hooked curved blade.
- Prior gap: the basic bare chest, flag, bells, and knife were present, but the flag was too neat and the hair/vest/knife lacked the aggressive broken silhouette.
- Changes: added spiked hair fan, ragged vest flaps and torn teeth, chest cord and bell necklace, left-arm wave tattoo, black bracers with studs, knee plates, torn sail flag corners and streamers, teal waist tails, and hooked knife edge with gold curls.
- Remaining: `SailFlagStreamer*` and `TealWaistTail*` are good candidates for secondary motion.

## Lu Meng

- Reference anchors: white robe over dark lamellar armor, black-gold shoulder guards, red shoulder cords and tassels, teal sash, sheathed sword, silver cloud sleeve trims.
- Prior gap: he read too much like a plain white scholar; the dark armor and decorated sleeves from the painting were underrepresented.
- Changes: added dark chest armor under the robe, `LuMengChest*` armor tiles, shoulder plates with roundels and tassels, robe back panel, sash plaque, visible sword hilt and pommel, sleeve cloud trims, black cuffs, and dark robe inserts on both legs.
- Remaining: `ShoulderTassel*` can reuse tassel-style motion.

## Huang Gai

- Reference anchors: white hair and mustache, red headband, scarred face, bare chest with strap and round medallion, one bandaged shoulder, one heavy beast pauldron, red-black armor skirt, large studded wooden mallet, fire boat flag.
- Prior gap: the big shapes were in place, but the face/headband, chest detail, broken cloth, fire emblem, and mallet hardware needed stronger painting alignment.
- Changes: added red battle headband and tails, white side hair locks, cheek scars, bare chest plate, cross-body leather strap, chest and pauldron beast medals, front skirt armor tiles, torn red skirt teeth, old leg guards, mallet iron bands and studs, and flame tongues on the flag.
- Remaining: `HeadbandBackTail*` and `TornRedSkirt*` can receive subtle cloth sway later.

## Zhou Yu

- Reference anchors: elegant commander with long hair, crown ruby, white scarf/cape, red-blue armor, beast medallions, ornate baton, floating suit cards.
- Prior gap: the pose and cards were readable, but he lacked the long-hair/crown side profile, card suit identity, and layered ornamental armor from the painting.
- Changes: added crown ruby and side pins, long hair falls, flowing scarf tails, gold scarf cloud motifs, dense chest armor tiles, chest and belt beast medals, red sleeves with gold cuffs, patterned skirt panels, baton crescents, and explicit suit-card icons plus a diamond card.
- Remaining: `WhiteScarfTail*` is a secondary-motion candidate.

## Da Qiao

- Reference anchors: ornate pink-red robe, black swept hair with floral pins, umbrella with flower panels, white sheer sash, long sleeves, blossom card.
- Prior gap: already close, but the umbrella face, sleeve blossoms, front hair sweep, back skirt, and sheer cloth needed richer decorative density.
- Changes: added swept front hair locks, sleeve flower marks, back rose skirt panels and gold hems, wide sheer sash tails, extra umbrella flowers and outer arcs, umbrella handle tassels, and a flower on the charm card.
- Remaining: `SheerSashWide*` and `UmbrellaHandleTassel*` can be animated with the existing ribbon/tassel style.

## Lu Xun

- Reference anchors: high square scholar-general hat, cream robe with red lining, dark lamellar chest armor, beast belt, bamboo books, red card orbit.
- Prior gap: he was too light and scholarly; the painting shows a military chest core, taller hat block, red lining, stronger belt emblem, and more tactical cards.
- Changes: added tall hat back plate and red top fold, hat beast emblem, red inner robe, dark chest armor with red tiles, belt beast, sleeve red linings and cloud motifs, red back panels, third book roll, book side strap, and two more tactic cards.
- Remaining: `HatRibbon*` already matches the shared moving-ribbon prefix.

## Sun Shangxiang

- Reference anchors: high ponytail, flower hair ornament, red-teal archer outfit, black-and-gold recurved bow, red wraps, flower charm, visible string and arrow.
- Prior gap: hair, outfit, quiver, and draw pose were already polished; the bow still read more like a straight block construction than the ornate black-gold bow in the painting.
- Changes: preserved existing hair/scalp names and all bow/string/arrow connectivity names. Added black curve overlays, crescent outer tips, red bow wraps, gold scroll motifs, arrow fletching, flower bow medal, bead chain, round charm, and charm flower.
- Bow compatibility: `BowStringFull`, `BowStringGripTie`, `ArrowShaft`, `ArrowHead`, `BowTopCap`, and `BowBottomCap` positions were left unchanged; the new crescent/scroll pieces sit around the existing tip geometry.
- Remaining: no new required connectivity work; `BowBeadChain` and `BowRoundCharm*` could be animated if desired.

## Local Checks

- `python3 -m py_compile sanguosha-roblox/scripts/hero_model_designs/wu.py` passed.
- In-memory build of all eight Wu models from `hero-art-v1.json` and a generated Zhao Yun base passed:
  - exactly 8 Wu models
  - each model has exactly 7 bones
  - no duplicate part names
  - no parts reference missing bones
  - all part position/size/rotation vectors are length 3

## Final Render Acceptance

Reviewed current `contact-wu-front.png`, `contact-wu-side.png`, `contact-wu-back.png`, plus individual after renders for the follow-up risk points.

- Sun Quan: accepted for this pass. The old inherited forearm bracer/cuff pieces are gone; side view now reads as teal sleeve plus red/gold royal armor instead of a default blue-gold arm block.
- Gan Ning: accepted for this pass. The old generic `BackArmor` gold grid no longer dominates the back; the back view reads as pirate vest, flag harness, and sail flag. The white flag cloth remains flat, but it is no longer a critical painting-alignment issue.
- Lu Meng: accepted for this pass. White robe, black inner armor, red tassels, teal sash, and sword read clearly from front and side. Back view is quieter than the painting but fits the restrained general silhouette.
- Huang Gai: accepted for this pass. The large mallet, red/black armor, bandaged shoulder, gray hair, red headband, and fire-flag details remain clear across the sheet.
- Zhou Yu: accepted for this pass. The old inherited forearm bracer/cuff pieces are gone; side view now reads as dark blue sleeve under red/gold commander armor. Pure side still shows a large blue sleeve surface, which is acceptable for now because the painting also uses dark blue sleeves under the red armor.
- Da Qiao: accepted for this pass. The back skirt now has wider split panels and side fan surfaces instead of plain inherited lower armor. Remaining visible issue: the back torso is still a broad flat rose block compared with the painting's floral robe texture, but it is not blocking the all-cast art-gallery pass.
- Lu Xun: accepted for this pass. The high hat, red inner robe, dark lamellar armor, bamboo scrolls, and card orbit are readable.
- Sun Shangxiang: accepted for this pass. The bow overlay reads as continuous black-and-gold curve from front and side, while the original bow caps, string, arrow shaft, and arrow head remain aligned.

Follow-up source changes after the first review:

- Removed inherited forearm bracer/cuff pieces from Sun Quan and Zhou Yu, then replaced them with larger faction-colored sleeve surfaces.
- Removed inherited back armor, waist armor, skirt, greave, and knee pieces from Gan Ning, then replaced the back with pirate vest and harness geometry.
- Removed inherited cuff, greave, and knee pieces from Da Qiao, then widened her rear and side skirt silhouette.

Critical remaining visible issue: none for the Wu v3 art-gallery acceptance pass. The main future polish targets are texture density on Da Qiao's rear robe, a less flat Gan Ning flag cloth, and more red armor mass on pure side views for Sun Quan/Zhou Yu if the camera stays exactly orthographic-side.
