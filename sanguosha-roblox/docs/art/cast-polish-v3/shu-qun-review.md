# Shu/Qun Cast Polish V3 Review

Scope: `sanguosha-roblox/scripts/hero_model_designs/shu_qun.py` only. I viewed each reference PNG in `assets/art-design/hero-pool-v1/` before editing and kept the R6 7-bone rig, weapon grips, and ready poses intact.

## Liu Bei

- Reference anchors: square green-and-gold crown with a long pin, twin swords over the shoulders, broad white sleeves, green royal panels, gold dragon shoulder ornaments, red-white tassels, and bamboo cards.
- Prior gap: the model had the twin swords and cards, but the crown, sleeves, skirt armor, and imperial chest/belt language were still too plain.
- Concrete changes: added a raised jade crown block, gold crown face, cross pin tips, dragon shoulder masks, white sleeve panels, gold cuffs, front skirt panels, belt mask, denser skirt trim, shoulder tassels, and bamboo marks on both cards.

## Zhang Fei

- Reference anchors: unruly black hair, red headband with flying tails, open shouting mouth, exposed arms with wraps, studded green armor, red scarf/cape, and a snake-like spear blade.
- Prior gap: the existing silhouette already shouted well, but the hair/headband and body armor did not carry enough of the painting's aggressive texture.
- Concrete changes: added spiked hair tufts, long red headband tails, gold forehead plate, flying scarf tails, studded breast rows, wrist wraps with studs, serpent gold vine, and a red spear tassel.

## Zhuge Liang

- Reference anchors: tall scholar hat with vertical ribs and yin-yang emblem, white/green layered robes, oversized feather fan, constellation cards, shoulder ornaments, jade tassels, and trailing green streamers.
- Prior gap: the fan and cards existed, but the hat face, robe layers, fan feather mass, and waist ornaments were too sparse.
- Concrete changes: removed inherited infantry knee/greave blocks, then added hat front flap, yin-yang emblem, extra hat ribs, layered fan feathers, jade fan root, shoulder scroll plates, green robe streamers, waist tassels, and gold constellation strokes on the cards.

## Ma Chao

- Reference anchors: heavy cavalry helmet, paired tall white plumes, black-gold lamellar armor, white cape sweep, ornate shoulder plates, leg scrollwork, broad spear blade, and white tassel.
- Prior gap: the model had a helmet, spear, and cape, but it did not yet feel like a plated cavalry general.
- Concrete changes: expanded the plumes, added dragon brow/nose guard, wing flares, layered pauldrons, lamellar chest studs, leg gold scroll panels, a sweeping white cape panel, wider lance blade, dragon socket, and white lance tassel cluster.

## Huang Yueying

- Reference anchors: green headband with square hardware, practical updo with loose fringe, workshop apron, mechanical fan, blueprint scrolls, gear motifs, waist tubes, and tool pouches.
- Prior gap: she had the inventor concept, but the front apron and fan needed more visible mechanical drafting detail.
- Concrete changes: added headband buckle, loose forelock, headband ribbons, blueprint panel on the apron, fan-arc and gear marks, extra mechanical fan braces, wrist blueprint, and waist tubes.

## Hua Tuo

- Reference anchors: white hair and beard, green headband, white robe with green sash, large medicine chest, herbs, scroll bundles, gourd, bamboo robe print, medicine bundle, and red emergency card.
- Prior gap: the medicine chest was readable, but the herbal healer identity needed more small props and green-white robe markings.
- Concrete changes: removed inherited infantry knee/greave blocks, then added headband and pin, headband tails, side hair, knotted sash with tails, bamboo robe prints, herbs and scroll bundle on the chest, gourd cord, bamboo medicine tube, cloth folds on the bundle, and herb mark on the card.

## Lu Bu

- Reference anchors: black-purple heavy armor, gold demon faces, huge red plumes, red cape and waist ribbons, massive halberd with crescent blades, shoulder demon ornaments, and red weapon wraps.
- Prior gap: the silhouette was already large, but the armor surface and helm needed more menace and density to match the painting.
- Concrete changes: added helm demon mask, black horn, side spikes, longer red plumes, black-red scale chest, chest and belt demon masks, purple scale grid, waist ribbons, pauldron demon masks, red pauldron cords, halberd dragon head, and red halberd wrap.

## Diao Chan

- Reference anchors: floral updo, pearl drops, long black hair, layered purple/pink skirt, translucent silk trails, flowered sleeves, waist jewelry, and a plum-marked card.
- Prior gap: the prior model correctly removed infantry armor, but the painting's dance silhouette needed more hair, jewelry, skirt layers, and sleeve flourish.
- Concrete changes: added flowing hair tips, pearl hair drops, silk trails from both arms, sleeve flower clusters, bodice V trim, waist pearl drops, outer skirt layers, gold skirt hems, and a plum mark on the held card.

## Motion Notes

- Existing secondary motion will catch cape pieces, names beginning with `Ribbon`, and any non-knot part whose name includes `Tassel`.
- New tassel cords on Liu Bei, Zhang Fei, Zhuge Liang, Ma Chao, Lu Bu, and Diao Chan should be picked up by the existing motion pass after the root rebuilds generated data.
- Some new cloth strips such as `HeadbandRibbon`, `SashTail`, and `ScarfFlyingTail` are currently static because the shared secondary-motion prefix list is owned outside this task. I left those names explicit so the root/shared pass can decide whether to add them without touching shared files here.

## Visual Acceptance Pass

Reviewed `contact-shu-qun-front.png` plus individual front/side renders where the contact sheet exposed weak silhouettes.

- Ma Chao: front/side renders made the white plumes read like two narrow antelope horns. I widened the plume mass, curved the feather blocks outward, added `SweptPlumeFan*` panels, and capped them with soft feather tips so the silhouette reads as a swept white cavalry crest.
- Huang Yueying: front render buried her inventor identity behind a small hand fan and a flat apron. I added a torso-mounted raised gear fan behind the shoulder line, a larger visible blueprint scroll in the left hand, and scroll knobs so the workshop silhouette is readable even before looking at small gear details.
- Zhuge Liang: front render showed the scholar hat and fan, but both were too flat. I added a taller back hat slab and a second row of tall white fan plume panels, making the head/fan profile closer to the reference.
- Diao Chan: front render was still mostly a purple block with small wrist curls. I replaced the static `SilkTrail*` additions with motion-recognized `RoseRibbonTail*` ribbons and added `WaterSleeveTail*Root` sleeve panels so the dance pose has a wider silk silhouette.
- Liu Bei: front render was acceptable overall, but the shoulder dragons were too small to read as dragon ornaments. I added snout/fang pieces and side banner panels to push him further toward royal ceremonial armor.

## Verification

- `python3 -m py_compile sanguosha-roblox/scripts/hero_model_designs/shu_qun.py` passed.
- In-memory build of `shu_qun.build_models()` produced 8 models: `liu_bei`, `zhang_fei`, `zhuge_liang`, `ma_chao`, `huang_yueying`, `hua_tuo`, `lu_bu`, `diao_chan`.
- Each generated model kept 7 bones, preserved ready-arm pose entries, and had no duplicate part names.
- In-memory face and secondary-motion passes completed without writing generated data.
- After the visual-fix pass, in-memory secondary motion completed with visible groups on `liu_bei`, `zhang_fei`, `zhuge_liang`, `ma_chao`, `huang_yueying`, `hua_tuo`, `lu_bu`, and `diao_chan`; no generated data or screenshot output was regenerated in this slice.

## Final Render Acceptance

Reviewed the rebuilt `contact-shu-qun-front.png`, `contact-shu-qun-side.png`, and `contact-shu-qun-back.png`, then opened individual close renders for Ma Chao, Huang Yueying, Zhuge Liang, and Diao Chan where the prior pass had visible risks.

- Liu Bei: accepted for this pass. Front reads as green royal/ceremonial armor with crown, shoulder ornaments, cards, tassels, and twin swords visible from side/back. Future polish: make the shoulder dragon shapes more sculptural; no visible regression.
- Zhang Fei: accepted for this pass. Contact front/back keep the wild beard, red scarf/cape, heavy green armor, and snake spear readable. Future polish: make the red headband tails more cloth-like in motion; no visible regression.
- Zhuge Liang: accepted for this pass. The tall hat and large fan now separate him from the generic robe body. Future polish: the fan feathers render gray under current lighting and could use warmer material/edge contrast; no visible regression.
- Ma Chao: accepted after the plume fix. Front and side close renders now read as swept white cavalry plumes rather than narrow horns. Future polish: feather blocks are still chunky in Roblox style; no critical visible issue.
- Huang Yueying: accepted with caveat. Front still reads more as green inventor than the full painted workshop pose, but the side/back now expose the raised gear-fan silhouette and the blueprint/gear props are visible. This is an art-depth limitation, not a regression.
- Hua Tuo: accepted for this pass. Front/back contact renders show white robe, green sash, medicine chest, gourd, and held herb/card identity clearly. Future polish: increase robe bamboo print contrast; no visible regression.
- Lu Bu: accepted for this pass. The red double plume, dark armor, heavy shoulders, cape, and halberd silhouette are distinct in all contact views. Future polish: front chest demon details could be larger, but there is no current breakage.
- Diao Chan: accepted with caveat. Hair ornaments, purple skirt, side/back sleeve ribbons, and waist jewelry are visible, but the front still feels more blocky than the reference's flowing silk. This should move to future polish with animation/translucent cloth work; no production regression.

Critical remaining visible issues: none in this owned slice. The remaining items above are future art polish rather than blockers for the current rebuilt gallery.
