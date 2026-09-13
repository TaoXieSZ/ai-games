"""Wei faction 3D model authoring module.

Returns model dicts for: 曹操, 司马懿, 夏侯惇, 张辽, 许褚, 郭嘉, 甄姬.
Build each on top of a shared Zhao Yun-style base model (7-bone R6 rig).
"""

import math

from .common import Hero

IDS = [
    "cao_cao",
    "sima_yi",
    "xiahou_dun",
    "zhang_liao",
    "xu_chu",
    "guo_jia",
    "zhen_ji",
]


def _pick(catalog, hero_id):
    for item in catalog:
        if item.get("id") == hero_id:
            return item
    return None


def _reset(meta, base, *, cloth=None, armor=None, gold=None):
    palette = meta.get("palette", ["#215FAB", "#C4CFDC", "#D6B572", "#E5ECF4"])
    hero = Hero(
        meta,
        base,
        cloth=cloth or palette[0],
        armor=armor or palette[1],
        gold=gold or (palette[2] if len(palette) > 2 else palette[-1]),
    )
    return hero


def _add_torso_harness(hero):
    hero.add("TorsoHarness", "Torso", (0, 0.07, -0.60), (1.96, 1.60, .16), hero.armor, mat="Metal")
    hero.add("TorsoBand", "Torso", (0, -0.14, -0.75), (2.02, .24, .10), hero.gold, mat="Metal")
    hero.add("Belt", "Torso", (0, -0.92, -0.01), (2.02, .30, .98), hero.gold)
    hero.add("BeltLid", "Torso", (0, -1.00, -0.04), (2.02, .08, .16), hero.cloth)


def _add_split_robe(hero):
    for sign in (-1, 1):
        side = "Left" if sign < 0 else "Right"
        leg = f"{side}Leg"
        arm = f"{side}Arm"
        hero.add(f"RobeSplit{side}", leg, (0, -0.55, -0.73), (.95, 1.46, .11), hero.cloth, mat="Fabric")
        hero.add(f"RobeHem{side}", leg, (0, -1.36, -0.79), (.95, .18, .12), hero.gold, mat="Fabric")
        hero.add(f"RobeSleeve{side}", arm, (0, -0.75, .12), (1.10, .90, 1.10), hero.cloth, mat="Fabric")


def _stud_grid(hero, prefix, bone, xs, ys, *, z=-0.91, color=None, size=0.095):
    for ix, x in enumerate(xs):
        for iy, y in enumerate(ys):
            hero.add(f"{prefix}Stud{ix}{iy}", bone, (x, y, z), (size, size, size), color or hero.gold, shape="sphere", mat="Metal")


def _edge_frame(hero, prefix, bone, *, y=0.0, z=-0.90, w=1.0, h=1.0, color=None):
    c = color or hero.gold
    hero.add(prefix + "Top", bone, (0, y + h / 2, z), (w, .07, .07), c, mat="Metal")
    hero.add(prefix + "Bottom", bone, (0, y - h / 2, z), (w, .07, .07), c, mat="Metal")
    hero.add(prefix + "Left", bone, (-w / 2, y, z), (.07, h, .07), c, mat="Metal")
    hero.add(prefix + "Right", bone, (w / 2, y, z), (.07, h, .07), c, mat="Metal")


def _tassel(hero, prefix, bone, pos, color):
    x, y, z = pos
    hero.add(prefix + "Ring", bone, (x, y, z), (.20, .08, .20), hero.gold, shape="cylinder", mat="Metal")
    for index, dx in enumerate((-.09, -.03, .03, .09)):
        hero.add(prefix + "TasselCord" + str(index), bone, (x + dx, y - .25, z), (.035, .46, .035), color, mat="Fabric")


def _hair_sweep(hero, prefix, color, *, back=True):
    for sign in (-1, 1):
        for index in range(3):
            hero.add(
                f"{prefix}Fringe{sign}{index}",
                "Head",
                (sign * (.16 + index * .16), 1.14 - index * .08, -.54),
                (.35, .20, .18),
                color,
                rot=(0, 0, sign * (10 + index * 10)),
                mat="Fabric",
            )
        if back:
            hero.add(f"{prefix}SideFall{sign}", "Head", (sign * .58, .34, .48), (.20, 1.18, .20), color, rot=(-7, 0, sign * 5), mat="Fabric")


def _flower(hero, prefix, bone, center, petal_color, jewel_color=None, *, r=.18):
    x, y, z = center
    for index, angle in enumerate(range(0, 360, 72)):
        rad = math.radians(angle)
        hero.add(
            prefix + "Petal" + str(index),
            bone,
            (x + math.sin(rad) * r, y + math.cos(rad) * r, z),
            (.16, .09, .055),
            petal_color,
            rot=(0, 0, angle),
            mat="Fabric",
        )
    hero.add(prefix + "Center", bone, center, (.11, .11, .06), jewel_color or hero.gold, shape="sphere", mat="Metal")


def _cao_cao(meta, base):
    palette = meta["palette"]
    h = _reset(meta, base, cloth=palette[0], armor=palette[2], gold=palette[1])
    h.remove("Helm", "Plume", "HelmTop", "HelmRidge", "HelmBrowBand", "HelmBack", "CheekGuard", "CheekEdge")
    h.crown(height=0.44, color=h.gold)
    h.add("CrownSidePinL", "Head", (-.88, 1.28, -.05), (.64, .08, .08), h.gold, shape="cylinder", rot=(0, 0, 90), mat="Metal")
    h.add("CrownSidePinR", "Head", (.88, 1.28, -.05), (.64, .08, .08), h.gold, shape="cylinder", rot=(0, 0, 90), mat="Metal")
    h.add("CrownPinOrbL", "Head", (-1.22, 1.28, -.05), (.16, .16, .16), h.gold, shape="sphere", mat="Metal")
    h.add("CrownPinOrbR", "Head", (1.22, 1.28, -.05), (.16, .16, .16), h.gold, shape="sphere", mat="Metal")
    h.add("CrownDragonMask", "Head", (0, 1.45, -.62), (.36, .30, .08), "#4A3322", mat="Metal")
    h.add("CrownDragonBrowL", "Head", (-.11, 1.50, -.68), (.18, .06, .04), h.gold, rot=(0, 0, -18), mat="Metal")
    h.add("CrownDragonBrowR", "Head", (.11, 1.50, -.68), (.18, .06, .04), h.gold, rot=(0, 0, 18), mat="Metal")
    h.add("HairLoop", "Head", (0, 1.03, 0.2), (.58, .80, .80), h.hair)
    _hair_sweep(h, "King", h.hair, back=False)
    h.beard(color=h.hair, length=0.50, width=.62)
    h.add("BlueMail", "Torso", (0, 0.05, -0.72), (1.95, 1.58, .17), h.cloth, mat="Fabric")
    h.add("ImperialChestPlate", "Torso", (0, 0.12, -0.79), (1.52, 1.10, .10), h.armor, mat="Metal")
    h.add("ImperialChestTrim", "Torso", (0, 0.12, -0.85), (1.64, .12, .08), h.gold, mat="Metal")
    _edge_frame(h, "ImperialPlateFrame", "Torso", y=.08, z=-.91, w=1.42, h=.98)
    _stud_grid(h, "Imperial", "Torso", (-.48, -.24, 0, .24, .48), (.40, .16, -.08), z=-.97, size=.072)
    h.add("ChestDragonBody", "Torso", (0, .03, -.99), (.66, .18, .06), h.gold, rot=(0, 0, -8), mat="Metal")
    h.add("ChestDragonHead", "Torso", (.34, .10, -1.02), (.22, .20, .07), h.gold, shape="sphere", mat="Metal")
    h.add("ChestDragonTail", "Torso", (-.38, -.06, -1.02), (.22, .08, .05), h.gold, rot=(0, 0, -30), mat="Metal")
    _add_torso_harness(h)
    _add_split_robe(h)
    for sign in (-1, 1):
        arm = "LeftArm" if sign < 0 else "RightArm"
        h.add(f"CommandShoulderPanel{sign}", arm, (0, .48, -.34), (.94, .24, .58), h.armor, mat="Metal")
        _stud_grid(h, f"CommandShoulder{sign}", arm, (-.24, 0, .24), (.50, .32), z=-.69, size=.08)
        h.add(f"SleeveKeyBorder{sign}", arm, (0, -.96, -.62), (1.06, .13, .07), h.gold, mat="Fabric")
        h.add(f"SleeveKeyCorner{sign}", arm, (sign * .36, -.84, -.65), (.18, .13, .06), h.gold, mat="Fabric")
    h.cape(color=palette[3], length=1.2, width=1.55)
    h.add("CloakEdge", "Torso", (0, -0.36, 0.78), (1.60, .95, .08), palette[3], mat="Fabric")
    for sign in (-1, 0, 1):
        h.add(f"CloakGoldFold{sign}", "Torso", (sign * .43, -.28, .86), (.08, .92, .05), h.gold, rot=(-10, 0, sign * 5), mat="Fabric")
    h.sword(name="EmperorSword", bone="RightArm", pos=(.24, -1.12, -0.72), length=1.70, color="#CDD9E8", width=.29)
    _tassel(h, "EmperorSword", "RightArm", (.05, -.93, -.82), "#7B1E29")
    h.add("WaistSword", "Torso", (0.58, -1.04, -0.22), (.26, .75, .22), h.armor, mat="Metal")
    h.add("WaistLoop", "Torso", (0.57, -1.0, -0.13), (.36, .20, .33), h.gold, mat="Metal")
    h.pose(RightArm=[-28, 16, -14], LeftArm=[8, -18, 12], Head=[2, 20, 0], Torso=[1, 12, 0])
    return h.done()


def _sima_yi(meta, base):
    palette = meta["palette"]
    h = _reset(meta, base, cloth=palette[0], armor=palette[1], gold=palette[2])
    h.remove(
        "Helm", "Plume", "HelmTop", "HelmRidge", "HelmBrowBand", "HelmBack", "CheekGuard", "CheekEdge",
        "Breastplate", "Chest", "LeftShoulder", "RightShoulder", "BackArmor", "BackBand", "BackVertical",
        "LeftBracer", "RightBracer", "LeftCuff", "RightCuff", "LeftSkirt", "RightSkirt", "LeftSideSkirt",
        "RightSideSkirt", "LeftGreave", "RightGreave", "LeftKnee", "RightKnee", "Cape", "Scarf",
    )
    h.add("DarkRobeBody", "Torso", (0, 0.00, -0.58), (1.86, 1.66, .18), palette[3], mat="Fabric")
    h.add("PurpleRobeFront", "Torso", (0, -0.02, -0.73), (1.26, 1.44, .08), h.cloth, mat="Fabric")
    h.add("RobeBackPanel", "Torso", (0, -0.12, 0.74), (1.62, 1.80, .10), palette[3], mat="Fabric")
    h.add("LongCollar", "Torso", (0, 0.96, -0.16), (1.84, .42, .20), h.armor, mat="Fabric")
    h.add("CollarNeck", "Torso", (0, 0.52, -0.42), (1.54, .30, .22), h.armor, mat="Fabric")
    h.add("HighCollarLeftWing", "Torso", (-.66, .88, -.36), (.24, .78, .13), palette[3], rot=(0, 0, -18), mat="Fabric")
    h.add("HighCollarRightWing", "Torso", (.66, .88, -.36), (.24, .78, .13), palette[3], rot=(0, 0, 18), mat="Fabric")
    h.add("HiddenBackHand", "Torso", (-.55, -.20, .88), (.36, .30, .18), h.skin)
    h.add("BackSleevePocket", "Torso", (-.36, -.12, .82), (.55, .48, .12), h.cloth, rot=(-5, 0, -12), mat="Fabric")
    for sign in (-1, 1):
        h.add(f"MoonRobeStripe{sign}", "Torso", (sign * .38, -.08, -.84), (.08, 1.36, .045), h.gold, mat="Fabric")
        h.add(f"CloudRobeMark{sign}", "Torso", (sign * .50, -.42, -.88), (.20, .09, .04), h.armor, rot=(0, 0, sign * 25), mat="Fabric")
    h.add("LongSleeveL", "LeftArm", (0, -1.12, .28), (1.08, .92, 1.10), h.cloth, mat="Fabric")
    h.add("LongSleeveR", "RightArm", (0, -1.12, .28), (1.08, .92, 1.10), h.cloth, mat="Fabric")
    for side, arm, sign in (("L", "LeftArm", -1), ("R", "RightArm", 1)):
        h.add(f"SleeveSilverRim{side}", arm, (0, -1.47, -.18), (1.08, .10, .38), h.armor, mat="Metal")
        h.add(f"SleevePurpleInside{side}", arm, (sign * .12, -1.31, -.34), (.74, .50, .18), "#2B2148", rot=(0, 0, sign * 8), mat="Fabric")
    for sign, leg in [(-1, "LeftLeg"), (1, "RightLeg")]:
        h.add(f"BackRobeSkirt{sign}", leg, (0, -0.55, 0.30), (.86, 1.42, .10), palette[3], mat="Fabric")
        h.add(f"FrontRobeSkirt{sign}", leg, (0, -0.52, -0.76), (.84, 1.36, .10), h.cloth, mat="Fabric")
        h.add(f"RobeSilverHem{sign}", leg, (0, -1.25, -0.82), (.86, .12, .10), h.armor, mat="Fabric")
        h.add(f"BambooInk{sign}", leg, (sign * .20, -.42, -.89), (.09, .68, .035), "#8B93A4", rot=(0, 0, sign * 5), mat="Fabric")
        h.add(f"BambooLeafA{sign}", leg, (sign * .30, -.20, -.92), (.18, .06, .03), "#8B93A4", rot=(0, 0, sign * 32), mat="Fabric")
        h.add(f"BambooLeafB{sign}", leg, (sign * .12, -.62, -.92), (.18, .06, .03), "#8B93A4", rot=(0, 0, -sign * 32), mat="Fabric")
    h.add("JudgmentCard", "LeftArm", (-.26, -.44, -.76), (.31, .60, .06), "#F3E8C8", rot=(0, 0, 6))
    h.add("CardTab", "LeftArm", (-.26, -.76, -.76), (.40, .12, .03), h.armor, rot=(0, 0, 6))
    h.card("SleeveJudgmentEchoA", bone="LeftArm", pos=(-.54, -.25, -.92), color="#202033", rot=(0, 0, -18))
    h.card("SleeveJudgmentEchoB", bone="Torso", pos=(.88, .08, -.98), color="#15151A", rot=(0, -18, 15))
    h.add("JudgeRibbon", "Torso", (0, -0.18, -0.79), (1.94, .10, .07), h.gold)
    h.add("PaleMask", "Head", (0, .72, -0.65), (.58, .10, .10), "#D9D9DE")
    h.add("TallAdvisorCap", "Head", (0, 1.38, 0.02), (1.04, .62, 1.02), palette[3], mat="Fabric")
    h.add("CapSilverRim", "Head", (0, 1.22, -0.55), (1.14, .10, .12), h.armor, mat="Metal")
    h.add("CapFrontGem", "Head", (0, 1.46, -.62), (.22, .22, .07), "#69499B", shape="sphere", mat="Metal")
    for x in (-.32, 0, .32):
        h.add(f"AdvisorCapRib{x}", "Head", (x, 1.42, -.58), (.06, .55, .06), h.gold, mat="Metal")
    for sign in (-1, 1):
        h.add(f"CapBackRibbon{sign}", "Head", (sign * .40, .76, .62), (.14, 1.16, .06), "#3F2B66", rot=(-16, 0, sign * 18), mat="Fabric")
    h.pose(
        Head=[-10, 40, 0],
        RightArm=[-34, 18, 0],
        LeftArm=[15, -66, 0],
        Torso=[0, 22, 0],
    )
    return h.done()


def _xiahou_dun(meta, base):
    palette = meta["palette"]
    h = _reset(meta, base, cloth=palette[0], armor=palette[1], gold=palette[2])
    h.remove("CheekGuard", "CheekEdge", "Plume", "Helm", "HelmTop", "HelmRidge", "HelmBrowBand", "HelmBack")
    h.add("BattleHeadband", "Head", (0, 1.14, -.05), (1.48, .13, 1.18), "#213E72", mat="Fabric")
    h.add("HeadbandTailA", "Head", (-.62, .96, .60), (.15, 1.04, .07), "#213E72", rot=(-12, 0, -24), mat="Fabric")
    h.add("HeadbandTailB", "Head", (-.42, .90, .66), (.12, .76, .06), "#213E72", rot=(-18, 0, -14), mat="Fabric")
    h.add("WarPonytailCore", "Head", (0, 1.34, .42), (.50, .58, .45), h.hair, shape="sphere", mat="Fabric")
    for index in range(5):
        h.add(
            "WarPonytailLock" + str(index),
            "Head",
            ((index - 2) * .08, 1.32 + index * .06, .66 + index * .13),
            (.20, .45, .28),
            h.hair,
            rot=(-22 + index * 3, 0, (index - 2) * 5),
            mat="Fabric",
        )
    h.add("HalfVisor", "Head", (0, 1.12, -0.46), (1.65, .20, .10), h.armor, mat="Metal")
    h.add("HelmetRim", "Head", (0, 1.33, -0.55), (1.44, .11, .90), h.gold, mat="Metal")
    h.add("WolfBadge", "Head", (0, 1.20, -.66), (.30, .24, .08), h.gold, shape="sphere", mat="Metal")
    h.add("EyePatch", "Head", (-.22, .70, -.64), (.34, .18, .08), "#0A0A0B")
    h.add("PatchTie", "Head", (-.38, .68, -.62), (.20, .05, .04), h.gold)
    h.add("PatchStrap", "Head", (-.08, .78, -.66), (.86, .05, .035), "#0A0A0B", rot=(0, 0, -14), mat="Fabric")
    h.add("CheekScarBronze", "Head", (.26, .54, -.66), (.30, .05, .035), "#A15C2B", rot=(0, 0, -28), mat="Fabric")
    h.add("MassShoulder", "RightArm", (.20, .58, .03), (0.74, .95, .14), h.armor, mat="Metal")
    h.add("MassPouch", "RightArm", (.63, .42, -0.20), (.22, .77, .58), h.gold, rot=(0, -32, 0), mat="Metal")
    h.add("MassShoulderLiner", "RightArm", (.74, .34, 0.42), (.16, .58, 1.20), h.gold, mat="Fabric")
    _stud_grid(h, "MassShoulder", "RightArm", (-.12, .12, .36), (.66, .42, .18), z=-.58, size=.09)
    h.add("LeftGuardingBracer", "LeftArm", (0, -.34, -.10), (.74, .88, .78), h.armor, mat="Metal")
    h.add("LeftGuardingRim", "LeftArm", (0, -.68, -.56), (.78, .12, .09), h.gold, mat="Metal")
    _stud_grid(h, "LeftGuard", "LeftArm", (-.22, 0, .22), (-.30, -.52), z=-.59, size=.075)
    h.add("RedCounterSash", "Torso", (0, -.86, -.74), (2.02, .18, .10), palette[3], mat="Fabric")
    h.add("SashTailA", "Torso", (.74, -.86, .10), (.14, 1.08, .08), palette[3], rot=(0, 0, -28), mat="Fabric")
    h.add("SashTailB", "Torso", (.94, -.94, .08), (.12, .80, .06), palette[3], rot=(0, 0, -18), mat="Fabric")
    h.add("BladeHandle", "RightArm", (-.10, -0.20, -0.66), (.20, 1.36, .20), h.hair, mat="Metal", shape="cylinder", rot=(0, 0, 88))
    h.add("BladePommel", "RightArm", (-.82, -0.19, -0.66), (.24, .24, .24), h.gold, mat="Metal")
    h.add("BladeGuard", "RightArm", (.48, -0.19, -0.66), (.18, .60, .24), h.gold, mat="Metal", rot=(0, 0, 88))
    h.add("BroadDaoBack", "RightArm", (1.20, -0.18, -0.66), (1.34, .34, .18), h.armor, mat="Metal", rot=(0, 0, 88))
    h.add("BroadDaoEdge", "RightArm", (1.35, -0.42, -0.71), (1.42, .12, .10), "#D9E2EA", mat="Metal", rot=(0, 0, 88))
    h.add("BroadDaoTip", "RightArm", (2.10, -0.18, -0.66), (.26, .62, .20), "#D9E2EA", shape="wedge", mat="Metal", rot=(0, -90, 88))
    h.add("BroadDaoSpineGold", "RightArm", (1.18, .04, -.74), (1.18, .08, .07), h.gold, mat="Metal", rot=(0, 0, 88))
    h.add("BladeBlueTassel", "RightArm", (.58, -.48, -.66), (.11, .72, .06), "#213E72", rot=(0, 0, 62), mat="Fabric")
    h.add("ShoulderBladeRest", "Torso", (.38, .86, .62), (1.24, .16, .18), h.armor, mat="Metal", rot=(0, 0, -4))
    h.pose(RightArm=[-66, -16, -46], LeftArm=[32, 4, 10], Head=[-1, -12, 0], Torso=[1, -8, 0])
    return h.done()


def _zhang_liao(meta, base):
    palette = meta["palette"]
    h = _reset(meta, base, cloth=palette[0], armor=palette[1], gold=palette[3])
    h.remove("CheekGuard", "CheekEdge", "Plume", "Helm", "HelmTop", "HelmRidge", "HelmBrowBand", "HelmBack")
    _hair_sweep(h, "Raider", h.hair, back=False)
    h.add("SpineHelm", "Head", (0, 1.44, -0.03), (1.20, .18, 1.36), h.gold)
    h.add("HelmNeck", "Head", (0, 1.17, -0.58), (1.00, .42, .28), h.armor, mat="Metal")
    h.add("HelmRidge", "Head", (0, 1.52, -0.56), (1.62, .15, .08), h.armor, mat="Metal")
    h.add("SpineCrest", "Head", (0, 1.46, -0.64), (0.52, .40, .18), h.gold, mat="Metal")
    h.add("HelmCheekL", "Head", (-.70, .72, -.08), (.15, .58, .80), h.armor, mat="Metal")
    h.add("HelmCheekR", "Head", (.70, .72, -.08), (.15, .58, .80), h.armor, mat="Metal")
    for index in range(7):
        h.add(
            "BluePlumeLock" + str(index),
            "Head",
            ((index - 3) * .06, 1.70 + index * .03, .36 + index * .17),
            (.20, .36, .42),
            "#2468C8",
            rot=(-28 + index * 4, 0, (index - 3) * 4),
            mat="Fabric",
        )
    h.add("BluePlumeBand", "Head", (0, 1.58, .28), (.62, .12, .30), h.gold, mat="Metal")
    _add_torso_harness(h)
    h.add("RaiderChestBlueV", "Torso", (0, .18, -.88), (.86, .13, .06), h.cloth, rot=(0, 0, -28), mat="Fabric")
    h.add("RaiderChestBlueV2", "Torso", (0, .18, -.89), (.86, .13, .06), h.cloth, rot=(0, 0, 28), mat="Fabric")
    _stud_grid(h, "RaiderChest", "Torso", (-.46, -.23, 0, .23, .46), (.38, .12, -.14), z=-.94, size=.065)
    _add_split_robe(h)
    for sign in (-1, 1):
        arm = "LeftArm" if sign < 0 else "RightArm"
        leg = "LeftLeg" if sign < 0 else "RightLeg"
        h.add(f"LightShoulderPlate{sign}", arm, (0, .40, -.20), (.88, .20, .72), h.armor, rot=(0, 0, -sign * 7), mat="Metal")
        h.add(f"SilverForearmWrap{sign}", arm, (0, -.58, -.04), (.72, .48, .72), "#C4D1DE", mat="Metal")
        h.add(f"ShinDashPlate{sign}", leg, (0, -.52, -.74), (.76, .78, .12), h.armor, mat="Metal")
        _stud_grid(h, f"ShinDash{sign}", leg, (-.20, .06, .32), (-.30, -.58), z=-.84, size=.07)
    # 双短戟
    h.add("HalberdL", "LeftArm", (-.18, .48, -.66), (.15, 2.38, .17), h.armor, shape="cylinder", mat="Metal")
    h.add("HalberdLFerrule", "LeftArm", (-.18, 1.55, -.66), (.24, .24, .24), h.gold, shape="cylinder", mat="Metal")
    h.add("HalberdLSpike", "LeftArm", (-.18, 1.98, -.66), (.17, .78, .23), "#D9E2EA", shape="wedge", rot=(0, 90, 0), mat="Metal")
    h.add("HalberdLBlade", "LeftArm", (-.45, 1.62, -.66), (.42, .62, .12), "#D9E2EA", shape="wedge", rot=(0, 0, -18), mat="Metal")
    h.add("HalberdR", "RightArm", (.16, .48, -.66), (.15, 2.34, .17), h.armor, shape="cylinder", mat="Metal")
    h.add("HalberdRFerrule", "RightArm", (.16, 1.53, -.66), (.24, .24, .24), h.gold, shape="cylinder", mat="Metal")
    h.add("HalberdRSpike", "RightArm", (.16, 1.94, -.66), (.17, .74, .23), "#D9E2EA", shape="wedge", rot=(0, -90, 0), mat="Metal")
    h.add("HalberdRBlade", "RightArm", (.43, 1.58, -.66), (.42, .60, .12), "#D9E2EA", shape="wedge", rot=(0, 0, 18), mat="Metal")
    h.add("HalberdRCrescentLow", "RightArm", (.48, 1.22, -.70), (.32, .45, .11), "#D9E2EA", shape="wedge", rot=(0, 0, -35), mat="Metal")
    h.add("HalberdLCrescentLow", "LeftArm", (-.48, 1.26, -.70), (.32, .45, .11), "#D9E2EA", shape="wedge", rot=(0, 0, 35), mat="Metal")
    _tassel(h, "HalberdRBlue", "RightArm", (.16, 1.16, -.70), "#2468C8")
    _tassel(h, "HalberdLBlue", "LeftArm", (-.18, 1.18, -.70), "#2468C8")
    for index, x in enumerate((-.82, -.48, .72)):
        h.card("RaidCardEcho" + str(index), bone="Torso", pos=(x, -.20 + index * .10, -.98), color="#DDE7EF", rot=(0, -12 + index * 12, -18 + index * 18))
    h.add("SprintLeft", "LeftArm", (-0.57, 1.10, 0.20), (.17, .54, .54), h.hair, rot=(8, 0, -10))
    h.pose(Torso=[0, -16, 0], RightArm=[-54, -26, -8], LeftArm=[-8, 22, 14], Head=[8, -10, 0])
    return h.done()


def _xu_chu(meta, base):
    palette = meta["palette"]
    h = _reset(meta, base, cloth=palette[0], armor=palette[1], gold=palette[2])
    h.remove(
        "CheekGuard", "CheekEdge", "Plume", "Helm", "HelmTop", "HelmRidge", "HelmBrowBand", "HelmBack",
        "LeftShoulder", "RightShoulder", "LeftBracer", "RightBracer", "LeftCuff", "RightCuff",
        "Breastplate", "Chest", "BackArmor", "BackBand", "BackVertical", "LeftSkirt", "RightSkirt",
        "LeftSideSkirt", "RightSideSkirt",
    )
    h.remove("HairBack", "HairSide", "HairTop")
    h.add("BruteHairMass", "Head", (0, 1.20, .12), (1.36, .32, 1.12), h.hair, mat="Fabric")
    for sign in (-1, 1):
        for index in range(3):
            h.add(f"BruteFringe{sign}{index}", "Head", (sign * (.12 + index * .18), 1.08 - index * .08, -.52), (.34, .20, .18), h.hair, rot=(0, 0, sign * (16 + index * 12)), mat="Fabric")
    for index in range(6):
        h.add("BruteTopLock" + str(index), "Head", ((index - 2.5) * .09, 1.40 + abs(index - 2.5) * .03, .18 + index * .06), (.22, .40, .28), h.hair, rot=(-18, 0, (index - 2.5) * 6), mat="Fabric")
    h.add("BruteHairBand", "Head", (0, 1.28, .18), (.72, .13, .50), h.gold, mat="Metal")
    h.add("OpenChest", "Torso", (0, 0.03, -0.64), (1.95, 1.55, .17), "#F0E9D2", mat="Fabric")
    h.add("DarkOpenVestL", "Torso", (-.44, .10, -.78), (.52, 1.38, .08), h.cloth, rot=(0, 0, -9), mat="Fabric")
    h.add("DarkOpenVestR", "Torso", (.44, .10, -.78), (.52, 1.38, .08), h.cloth, rot=(0, 0, 9), mat="Fabric")
    h.add("BareChestShadow", "Torso", (0, .23, -.82), (.56, .72, .045), "#D79566", mat="Fabric")
    h.add("PectoralLineL", "Torso", (-.18, .34, -.86), (.22, .05, .035), "#B66C47", rot=(0, 0, -12), mat="Fabric")
    h.add("PectoralLineR", "Torso", (.18, .34, -.86), (.22, .05, .035), "#B66C47", rot=(0, 0, 12), mat="Fabric")
    h.add("TigerWaist", "Torso", (0, -1.03, -0.23), (1.98, .44, .86), "#A35A1F", mat="Fabric")
    h.add("TigerFurWhiteFront", "Torso", (0, -1.10, -.70), (1.68, .18, .11), "#F0E4CF", mat="Fabric")
    for index, x in enumerate((-.70, -.46, -.22, .02, .26, .50, .74)):
        h.add("TigerFurTuft" + str(index), "Torso", (x, -1.20, -.76), (.16, .26, .08), "#F0E4CF", shape="wedge", rot=(0, 0, (index - 3) * 7), mat="Fabric")
    h.add("TigerFurL", "LeftLeg", (0, -0.34, -0.73), (.98, .70, .14), "#C7822A", mat="Fabric")
    h.add("TigerFurR", "RightLeg", (0, -0.34, -0.73), (.98, .70, .14), "#C7822A", mat="Fabric")
    for x in (-.32, 0, .32):
        h.add(f"TigerStripe{x}", "Torso", (x, -1.05, -0.70), (.09, .42, .08), h.hair, mat="Fabric", rot=(0, 0, 18 if x < 0 else -18))
    h.add("TigerCollar", "Torso", (0, -0.74, -0.58), (1.6, .12, .10), "#6F2F18", mat="Fabric")
    h.add("TigerBelt", "Torso", (0, -1.04, -0.06), (1.95, .22, .12), h.gold, mat="Metal")
    h.add("BareArmL", "LeftArm", (0, -0.22, 0.02), (.92, 1.78, 1.00), h.skin, mat="SmoothPlastic")
    h.add("BareArmR", "RightArm", (0, -0.22, 0.02), (.92, 1.78, 1.00), h.skin, mat="SmoothPlastic")
    h.add("BicepBandL", "LeftArm", (0, .28, -.02), (.98, .16, 1.04), h.gold, mat="Metal")
    h.add("BicepBandR", "RightArm", (0, .28, -.02), (.98, .16, 1.04), h.gold, mat="Metal")
    _stud_grid(h, "BicepL", "LeftArm", (-.22, .06, .34), (.29,), z=-.58, size=.07)
    _stud_grid(h, "BicepR", "RightArm", (-.34, -.06, .22), (.29,), z=-.58, size=.07)
    h.add("ForearmBandL", "LeftArm", (0, -0.72, -0.02), (.96, .18, 1.04), h.hair, mat="Fabric")
    h.add("ForearmBandR", "RightArm", (0, -0.72, -0.02), (.96, .18, 1.04), h.hair, mat="Fabric")
    h.add("HammerGrip", "LeftArm", (0, -0.20, -0.71), (.20, 1.70, .20), h.hair, shape="cylinder", mat="Fabric", rot=(0, 0, -18))
    h.add("HammerNeck", "LeftArm", (0.28, .58, -0.70), (.24, .30, .24), h.gold, shape="cylinder", mat="Metal")
    h.add("TigerHammerHead", "LeftArm", (.52, .94, -0.66), (1.24, .68, .92), h.armor, shape="box", mat="Metal", rot=(0, 0, -8))
    h.add("TigerHammerFace", "LeftArm", (.52, .96, -1.14), (.94, .50, .10), h.gold, mat="Metal", rot=(0, 0, -8))
    h.add("TigerHammerBrow", "LeftArm", (.52, 1.10, -1.20), (.56, .10, .08), h.hair, mat="Metal", rot=(0, 0, -8))
    h.add("TigerHammerFangL", "LeftArm", (.30, .72, -1.21), (.12, .26, .08), "#F4E7C6", shape="wedge", rot=(0, 0, -8), mat="Metal")
    h.add("TigerHammerFangR", "LeftArm", (.74, .72, -1.21), (.12, .26, .08), "#F4E7C6", shape="wedge", rot=(0, 0, -8), mat="Metal")
    h.add("TigerHammerNose", "LeftArm", (.52, .93, -1.24), (.20, .13, .06), "#1C1718", mat="Metal", rot=(0, 0, -8))
    h.add("TigerHammerEyeL", "LeftArm", (.33, 1.02, -1.25), (.09, .07, .035), "#111827", shape="sphere", mat="Metal")
    h.add("TigerHammerEyeR", "LeftArm", (.71, 1.02, -1.25), (.09, .07, .035), "#111827", shape="sphere", mat="Metal")
    h.add("HammerOrangeSlashA", "LeftArm", (.32, 1.22, -1.25), (.12, .46, .045), "#D97706", rot=(0, 0, 24), mat="Fabric")
    h.add("HammerOrangeSlashB", "LeftArm", (.78, .78, -1.25), (.12, .42, .045), "#D97706", rot=(0, 0, 24), mat="Fabric")
    h.add("HammerGroundSparkA", "LeftArm", (.95, .42, -1.05), (.11, .48, .06), "#F59E0B", rot=(0, 0, -38), mat="Metal")
    h.add("HammerGroundSparkB", "LeftArm", (.15, .46, -1.05), (.09, .36, .05), "#F59E0B", rot=(0, 0, 34), mat="Metal")
    h.scale(1.08, 1.06, 1.04)
    h.pose(Torso=[0, 16, 0], RightArm=[-38, -16, -14], LeftArm=[32, 8, 18], LeftLeg=[-4, 0, 0])
    return h.done()


def _guo_jia(meta, base):
    palette = meta["palette"]
    h = _reset(meta, base, cloth=palette[0], armor=palette[1], gold=palette[3])
    h.remove(
        "CheekGuard", "CheekEdge", "Plume", "Helm", "HelmTop", "HelmRidge", "HelmBrowBand", "HelmBack",
        "Breastplate", "Chest", "LeftShoulder", "RightShoulder", "BackArmor", "BackBand", "BackVertical",
        "LeftBracer", "RightBracer", "LeftCuff", "RightCuff", "LeftSkirt", "RightSkirt", "LeftSideSkirt",
        "RightSideSkirt", "LeftGreave", "RightGreave", "LeftKnee", "RightKnee", "Cape", "Scarf",
        "HairBack", "HairSide", "HairTop",
    )
    silver_hair = "#E8EDF2"
    h.add("SilverHairBack", "Head", (0, .48, .58), (1.44, 1.70, .20), silver_hair, mat="Fabric")
    h.add("SilverHairTop", "Head", (0, 1.23, -.04), (1.46, .32, 1.22), silver_hair, mat="Fabric")
    h.add("SilverHairFrontCap", "Head", (0, 1.02, -.56), (1.22, .32, .18), silver_hair, mat="Fabric")
    h.add("SilverCrownShadow", "Head", (0, 1.24, -.60), (1.12, .08, .05), "#B9C3CC", mat="Fabric")
    for sign in (-1, 1):
        for index in range(4):
            h.add(f"SoftWhiteFringe{sign}{index}", "Head", (sign * (.09 + index * .14), 1.02 - index * .10, -.63), (.30, .28, .17), silver_hair, rot=(0, 0, sign * (8 + index * 8)), mat="Fabric")
        h.add(f"TempleWhiteLock{sign}", "Head", (sign * .54, .72, -.46), (.20, .92, .17), silver_hair, rot=(0, 0, sign * 7), mat="Fabric")
        h.add(f"LooseWhiteSideLock{sign}", "Head", (sign * .62, .18, .26), (.19, 1.42, .19), silver_hair, rot=(-6, 0, sign * 4), mat="Fabric")
        for index in range(4):
            h.add(
                f"SilverBackStrand{sign}{index}",
                "Head",
                (sign * (.18 + index * .12), .34 - index * .13, .70),
                (.12, .86, .055),
                "#C9D2DA",
                rot=(-5, 0, sign * (5 + index * 4)),
                mat="Fabric",
            )
    h.add("SmallSilverOrnament", "Head", (.42, 1.20, -.38), (.24, .16, .06), h.gold, mat="Metal")
    h.add("ScholarRobe", "Torso", (0, -0.02, -0.58), (1.84, 1.57, .17), h.armor, mat="Fabric")
    h.add("ScholarOuterSash", "Torso", (0, 0.02, -0.72), (.56, 1.58, .08), h.cloth, mat="Fabric")
    h.add("ScholarMantle", "Torso", (0, 0.18, -0.73), (1.84, .42, .10), h.cloth, mat="Fabric")
    h.add("PaleInnerRobe", "Torso", (0, -.06, -.82), (.72, 1.44, .07), "#F1F5F9", mat="Fabric")
    h.add("ChestPressedHand", "RightArm", (-.18, -1.10, -.78), (.36, .28, .18), h.skin)
    h.add("BlueCollarFoldL", "Torso", (-.30, .56, -.82), (.16, .74, .05), h.cloth, rot=(0, 0, -24), mat="Fabric")
    h.add("BlueCollarFoldR", "Torso", (.30, .56, -.82), (.16, .74, .05), h.cloth, rot=(0, 0, 24), mat="Fabric")
    h.add("ScholarRight", "RightArm", (0, -0.72, -0.80), (1.18, .96, 1.05), h.cloth, mat="Fabric")
    h.add("ScholarLeft", "LeftArm", (0, -0.72, -0.80), (1.18, .96, 1.05), h.cloth, mat="Fabric")
    h.add("WhiteSleeveFlashR", "RightArm", (.10, -1.14, -.93), (.72, .50, .10), "#F1F5F9", rot=(0, 0, 9), mat="Fabric")
    h.add("WhiteSleeveFlashL", "LeftArm", (-.10, -1.14, -.93), (.72, .50, .10), "#F1F5F9", rot=(0, 0, -9), mat="Fabric")
    for side, arm, sign in (("L", "LeftArm", -1), ("R", "RightArm", 1)):
        h.add(f"WideSleeveGoldEdge{side}", arm, (0, -1.46, -.26), (1.12, .09, .36), h.gold, mat="Metal")
        h.add(f"SleeveBlueTassel{side}", arm, (sign * .36, -1.22, -.72), (.08, .42, .05), h.cloth, rot=(0, 0, sign * 14), mat="Fabric")
    for sign, leg in [(-1, "LeftLeg"), (1, "RightLeg")]:
        h.add(f"ScholarSkirt{sign}", leg, (0, -0.52, -0.74), (.84, 1.34, .10), h.armor, mat="Fabric")
        h.add(f"BambooHem{sign}", leg, (0, -1.22, -0.81), (.86, .13, .08), h.gold, mat="Fabric")
        h.add(f"ScholarBackSkirt{sign}", leg, (0, -0.55, 0.32), (.84, 1.26, .10), h.cloth, mat="Fabric")
        h.add(f"BlueFrontPanel{sign}", leg, (sign * .16, -.52, -.88), (.38, 1.26, .07), h.cloth, rot=(0, 0, sign * 5), mat="Fabric")
        h.add(f"BambooStem{sign}", leg, (sign * .24, -.50, -.94), (.055, .72, .03), "#56718F", rot=(0, 0, sign * 5), mat="Fabric")
        for index in range(3):
            h.add(f"BambooLeaf{sign}{index}", leg, (sign * (.12 + index * .09), -.26 - index * .18, -.97), (.16, .05, .025), "#56718F", rot=(0, 0, sign * (26 - index * 12)), mat="Fabric")
    h.add("ShoulderOrn", "RightArm", (-0.36, -0.55, -0.48), (.22, .20, .06), h.gold, mat="Metal")
    h.add("ShoulderOrn2", "LeftArm", (0.36, -0.55, -0.48), (.22, .20, .06), h.gold, mat="Metal")
    h.add("JadeBrace", "Torso", (-0.40, 0.22, -0.84), (.28, .66, .06), "#D9E2EE", rot=(0, 28, 0))
    h.add("BambooTube", "Torso", (0.12, .26, -0.81), (.42, .18, .06), "#DDD6AA", rot=(0, 28, 0))
    h.card("TopCardL", bone="LeftArm", pos=(0.02, -0.16, -0.74), color="#EDE9C9", rot=(0, 28, 0))
    h.card("TopCardR", bone="RightArm", pos=(0.22, -0.14, -0.72), color="#EDE9C9", rot=(8, 22, 0))
    h.card("OmenCardFloatA", bone="Torso", pos=(-.82, .52, -1.02), color="#D8EAFE", rot=(0, 18, -14))
    h.card("OmenCardFloatB", bone="Torso", pos=(.74, .78, -.98), color="#1E3A5F", rot=(0, -18, 18))
    h.add("OmenGlowA", "Torso", (-.82, .52, -1.07), (.54, .70, .025), "#8FC7FF", mat="Neon")
    h.add("OmenGlowB", "Torso", (.74, .78, -1.03), (.50, .66, .025), "#8FC7FF", mat="Neon")
    h.add("ScrollTag", "Torso", (0.26, 0.14, -0.80), (.24, .14, .04), "#D7CBA6")
    _tassel(h, "OracleBelt", "Torso", (.50, -.62, -.86), h.cloth)
    h.pose(Torso=[4, 4, 0], RightArm=[4, 16, -6], LeftArm=[14, -14, 0], Head=[-2, 10, 0])
    return h.done()


def _zhen_ji(meta, base):
    h = _reset(meta, base, cloth="#567BAA", armor="#DDE8F3", gold="#C7AA6B")
    h.remove("Breastplate", "Chest", "LeftShoulder", "RightShoulder", "BackArmor", "BackBand", "BackVertical",
             "LeftBracer", "RightBracer", "LeftCuff", "RightCuff", "LeftSkirt", "RightSkirt", "LeftSideSkirt",
             "RightSideSkirt", "LeftGreave", "RightGreave", "LeftKnee", "RightKnee", "BeltDragon", "BeltTrim", "WaistBelt", "Hair")
    h.robe("#EEF1ED")
    h.add("CourtBelt", "Torso", (0,-.78,0), (2.04,.24,1.18), "#7399BB", mat="Fabric")
    h.add("BlueInnerRobe", "Torso", (0,.05,-.73), (.58,1.58,.09), "#527BA9", mat="Fabric")
    h.add("CourtJewel", "Torso", (0,-.78,-.68), (.31,.31,.12), h.gold, rot=(0,0,45), mat="Metal")
    h.add("CourtJewelInset", "Torso", (0,-.78,-.76), (.17,.17,.07), "#47799B", rot=(0,0,45))
    h.add("FlowerBodicePanel", "Torso", (0, .18, -.82), (.98, 1.02, .07), "#F6F3EA", mat="Fabric")
    for sign in (-1, 1):
        h.add("BlueLapelFlow" + str(sign), "Torso", (sign * .30, .34, -.90), (.14, 1.10, .045), "#7EA8D7", rot=(0, 0, sign * 24), mat="Fabric")
        h.add("GoldLapelThread" + str(sign), "Torso", (sign * .45, .20, -.94), (.055, .94, .035), h.gold, rot=(0, 0, sign * 24), mat="Metal")
    _flower(h, "BodiceFlowerA", "Torso", (-.22, .42, -.88), "#F7F2DD", "#80A9C8", r=.12)
    _flower(h, "BodiceFlowerB", "Torso", (.24, -.08, -.88), "#F7F2DD", "#80A9C8", r=.10)
    for sign,leg,arm in [(-1,"LeftLeg","LeftArm"),(1,"RightLeg","RightArm")]:
        h.add("BlueOverSkirt"+str(sign),leg,(sign*.26,-.53,-.84),(.34,1.62,.13),"#719CC5",rot=(0,0,-sign*5),mat="Fabric")
        h.add("SkirtBack"+str(sign),leg,(0,-.53,.55),(.94,1.61,.12),"#9BB8D3",mat="Fabric")
        h.add("SkirtSide"+str(sign),leg,(sign*.50,-.53,.02),(.13,1.65,1.10),"#87A8C9",mat="Fabric")
        h.add("IvoryFrontPleat"+str(sign),leg,(sign*.10,-.54,-.94),(.34,1.50,.06),"#F4F0E5",rot=(0,0,sign*3),mat="Fabric")
        h.add("NavySkirtBorder"+str(sign),leg,(sign*.44,-.56,-.97),(.12,1.42,.055),"#2B4770",rot=(0,0,-sign*5),mat="Fabric")
        for k in range(3):
            h.add("PlumEmbroidery"+str(sign)+str(k),leg,(sign*.22,-.15-k*.42,-.93),(.13,.13,.026),"#F5F0DF",rot=(0,0,45),mat="Fabric")
        h.add("BlueSleeveBorder"+str(sign),arm,(0,-1.01,-.02),(1.16,.19,1.15),"#668BB2",mat="Fabric")
        h.add("SleeveGoldSeam"+str(sign),arm,(0,-.89,-.61),(1.10,.045,.035),h.gold,mat="Fabric")
        h.add("NavySleeveFace"+str(sign),arm,(sign*.13,-.94,-.74),(.64,.80,.10),"#2C4C78",rot=(0,0,sign*6),mat="Fabric")
        _flower(h, "SleeveFlower"+str(sign), arm, (sign*.22, -.86, -.82), "#F6F0DD", "#7DA9C8", r=.10)
        for k in range(3):
            h.add("WaterSleeveTail"+str(sign)+str(k),arm,(sign*(.35+k*.10),-1.08-k*.21,.32+k*.05),(.56,.36,.12),"#D8E5EB",rot=(0,0,-sign*(12+k*8)),mat="Fabric")
    # Layered swept hair frames the face; the long rear strands end above the belt.
    h.add("HairCrown", "Head", (0,1.21,.10), (1.51,.37,1.22), h.hair)
    h.add("HairBack", "Head", (0,.47,.64), (1.50,1.82,.30), h.hair)
    h.bun(height=.64)
    h.add("BraidedHairRidge", "Head", (0, 1.32, -.18), (.86, .16, .16), h.hair, mat="Fabric")
    for sign in [-1,1]:
        for k in range(3):
            h.add("SweptFringe"+str(sign)+str(k),"Head",(sign*(.16+k*.18),1.17-k*.10,-.51),(.42,.24,.22),"#252830",rot=(0,0,sign*(12+k*9)))
        h.add("FaceCurtainLock"+str(sign),"Head",(sign*.48,.74,-.48),(.20,.95,.18),h.hair,rot=(0,0,sign*7),mat="Fabric")
        h.add("LongSideLock"+str(sign),"Head",(sign*.66,.18,.12),(.25,1.76,.46),h.hair,rot=(-8,0,sign*5),mat="Fabric")
        h.add("RearHairRibbon"+str(sign),"Head",(sign*.44,.06,.78),(.14,1.32,.08),"#7EA8D7",rot=(-12,0,sign*12),mat="Fabric")
        h.add("CrownBranch"+str(sign),"Head",(sign*.48,1.49,-.27),(.75,.085,.09),h.gold,rot=(0,0,sign*12),mat="Metal")
        h.add("HairPearl"+str(sign),"Head",(sign*.64,1.47,-.34),(.16,.16,.14),"#F4EEDF",shape="sphere")
        _flower(h, "HairBlossom"+str(sign), "Head", (sign*.52, 1.39, -.46), "#F7F2E4", "#7AA7CA", r=.15)
        h.add("GoldHairpinNeedle"+str(sign), "Head", (sign*.86, 1.42, -.18), (.62, .055, .055), h.gold, mat="Metal", rot=(0, 0, sign*8))
        for k in range(3):h.add("BlueHairBead"+str(sign)+str(k),"Head",(sign*.84,1.35-k*.17,-.05),(.10,.13,.10),"#719BBC",shape="sphere")
        h.add("HairTassel"+str(sign),"Head",(sign*.84,.71,-.05),(.13,.38,.10),"#D5C393",mat="Fabric")
    # Open fan: connected radial ribs meet the hand, rather than a card-sized plate.
    for i in range(9):
        angle=-64+i*16; rad=math.radians(angle)
        x=math.sin(rad); y=math.cos(rad)
        h.add("FanLeaf"+str(i),"RightArm",(x*.61,-1.25+y*.61,-.82),(.24,.85,.075),"#DBE7EE",rot=(0,0,-angle),mat="Fabric")
        h.add("FanRib"+str(i),"RightArm",(x*.53,-1.25+y*.53,-.87),(.035,1.05,.025),h.gold,rot=(0,0,-angle),mat="Metal")
        h.add("FanBlueRim"+str(i),"RightArm",(x*.99,-1.25+y*.99,-.83),(.27,.12,.10),"#5B83AA",rot=(0,0,-angle),mat="Fabric")
    h.add("FanGrip","RightArm",(0,-1.34,-.82),(.14,.34,.16),h.gold,mat="Metal")
    for index, (x, y, r) in enumerate(((-1.12, .35, -18), (1.08, .56, 16), (-.88, -.46, 24), (.96, -.78, -28), (-1.26, -.08, 38), (1.22, -.22, -36))):
        h.card("BlackPetalCard" + str(index), bone="Torso", pos=(x, y, -1.05), color="#111827", rot=(0, r, r))
        h.add("WaterArc" + str(index), "Torso", (x * .82, y - .08, -1.08), (.40, .07, .035), "#A9D7F3", rot=(0, 0, r), mat="Fabric")
    h.grip()
    h.pose(RightArm=[-10,0,-20],LeftArm=[-56,8,34],Head=[1,12,0],Torso=[0,-10,0])
    h.scale(.96,.98,.98)
    return h.done()


def build_models(catalog, base):
    """Build and return 7 Wei faction hero models from a hero art catalog.

    `catalog` should be the list loaded from `hero-art-v1.json`.
    `base` should be the existing Zhao Yun model dict template.
    """
    if not isinstance(catalog, (list, tuple)):
        raise TypeError("catalog should be a list/tuple of hero metadata")

    builders = {
        "cao_cao": _cao_cao,
        "sima_yi": _sima_yi,
        "xiahou_dun": _xiahou_dun,
        "zhang_liao": _zhang_liao,
        "xu_chu": _xu_chu,
        "guo_jia": _guo_jia,
        "zhen_ji": _zhen_ji,
    }

    out = []
    for hero_id in IDS:
        meta = _pick(catalog, hero_id)
        if not meta:
            raise ValueError(f"catalog missing wei hero: {hero_id}")
        model = builders[hero_id](meta, base)
        model["designNotes"] = f"{meta.get('outfit', '')} {meta.get('prop', '')}".strip()
        out.append(model)
    return out


__all__ = ["build_models"]
