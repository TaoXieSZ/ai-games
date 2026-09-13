"""Wei faction 3D model authoring module.

Returns model dicts for: 曹操, 司马懿, 夏侯惇, 张辽, 许褚, 郭嘉, 甄姬.
Build each on top of a shared Zhao Yun-style base model (7-bone R6 rig).
"""

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


def _cao_cao(meta, base):
    palette = meta["palette"]
    h = _reset(meta, base, cloth=palette[0], armor=palette[2], gold=palette[1])
    h.remove("Helm", "Plume", "HelmTop", "HelmRidge", "HelmBrowBand", "HelmBack", "CheekGuard", "CheekEdge")
    h.crown(height=0.44, color=h.gold)
    h.add("HairLoop", "Head", (0, 1.03, 0.2), (.58, .80, .80), h.hair)
    h.beard(color=h.hair, length=0.50, width=.62)
    h.add("BlueMail", "Torso", (0, 0.05, -0.72), (1.95, 1.58, .17), h.cloth, mat="Fabric")
    h.add("ImperialChestPlate", "Torso", (0, 0.12, -0.79), (1.52, 1.10, .10), h.armor, mat="Metal")
    h.add("ImperialChestTrim", "Torso", (0, 0.12, -0.85), (1.64, .12, .08), h.gold, mat="Metal")
    _add_torso_harness(h)
    _add_split_robe(h)
    h.cape(color=palette[3], length=1.2, width=1.55)
    h.add("CloakEdge", "Torso", (0, -0.36, 0.78), (1.60, .95, .08), palette[3], mat="Fabric")
    h.sword(name="EmperorSword", bone="RightArm", pos=(.24, -1.12, -0.72), length=1.70, color="#CDD9E8", width=.29)
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
    h.add("LongSleeveL", "LeftArm", (0, -1.12, .28), (1.08, .92, 1.10), h.cloth, mat="Fabric")
    h.add("LongSleeveR", "RightArm", (0, -1.12, .28), (1.08, .92, 1.10), h.cloth, mat="Fabric")
    for sign, leg in [(-1, "LeftLeg"), (1, "RightLeg")]:
        h.add(f"BackRobeSkirt{sign}", leg, (0, -0.55, 0.30), (.86, 1.42, .10), palette[3], mat="Fabric")
        h.add(f"FrontRobeSkirt{sign}", leg, (0, -0.52, -0.76), (.84, 1.36, .10), h.cloth, mat="Fabric")
        h.add(f"RobeSilverHem{sign}", leg, (0, -1.25, -0.82), (.86, .12, .10), h.armor, mat="Fabric")
    h.add("JudgmentCard", "LeftArm", (-.26, -.44, -.76), (.31, .60, .06), "#F3E8C8", rot=(0, 0, 6))
    h.add("CardTab", "LeftArm", (-.26, -.76, -.76), (.40, .12, .03), h.armor, rot=(0, 0, 6))
    h.add("JudgeRibbon", "Torso", (0, -0.18, -0.79), (1.94, .10, .07), h.gold)
    h.add("PaleMask", "Head", (0, .72, -0.65), (.58, .10, .10), "#D9D9DE")
    h.add("TallAdvisorCap", "Head", (0, 1.38, 0.02), (1.04, .62, 1.02), palette[3], mat="Fabric")
    h.add("CapSilverRim", "Head", (0, 1.22, -0.55), (1.14, .10, .12), h.armor, mat="Metal")
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
    h.add("HalfVisor", "Head", (0, 1.12, -0.46), (1.65, .20, .10), h.armor, mat="Metal")
    h.add("HelmetRim", "Head", (0, 1.33, -0.55), (1.44, .11, .90), h.gold, mat="Metal")
    h.add("EyePatch", "Head", (-.22, .70, -.64), (.34, .18, .08), "#0A0A0B")
    h.add("PatchTie", "Head", (-.38, .68, -.62), (.20, .05, .04), h.gold)
    h.add("MassShoulder", "RightArm", (.20, .58, .03), (0.74, .95, .14), h.armor, mat="Metal")
    h.add("MassPouch", "RightArm", (.63, .42, -0.20), (.22, .77, .58), h.gold, rot=(0, -32, 0), mat="Metal")
    h.add("MassShoulderLiner", "RightArm", (.74, .34, 0.42), (.16, .58, 1.20), h.gold, mat="Fabric")
    h.add("BladeHandle", "RightArm", (-.10, -0.20, -0.66), (.20, 1.36, .20), h.hair, mat="Metal", shape="cylinder", rot=(0, 0, 88))
    h.add("BladePommel", "RightArm", (-.82, -0.19, -0.66), (.24, .24, .24), h.gold, mat="Metal")
    h.add("BladeGuard", "RightArm", (.48, -0.19, -0.66), (.18, .60, .24), h.gold, mat="Metal", rot=(0, 0, 88))
    h.add("BroadDaoBack", "RightArm", (1.20, -0.18, -0.66), (1.34, .34, .18), h.armor, mat="Metal", rot=(0, 0, 88))
    h.add("BroadDaoEdge", "RightArm", (1.35, -0.42, -0.71), (1.42, .12, .10), "#D9E2EA", mat="Metal", rot=(0, 0, 88))
    h.add("BroadDaoTip", "RightArm", (2.10, -0.18, -0.66), (.26, .62, .20), "#D9E2EA", shape="wedge", mat="Metal", rot=(0, -90, 88))
    h.add("ShoulderBladeRest", "Torso", (.38, .86, .62), (1.24, .16, .18), h.armor, mat="Metal", rot=(0, 0, -4))
    h.pose(RightArm=[-66, -16, -46], LeftArm=[32, 4, 10], Head=[-1, -12, 0], Torso=[1, -8, 0])
    return h.done()


def _zhang_liao(meta, base):
    palette = meta["palette"]
    h = _reset(meta, base, cloth=palette[0], armor=palette[1], gold=palette[3])
    h.remove("CheekGuard", "CheekEdge", "Plume", "Helm", "HelmTop", "HelmRidge", "HelmBrowBand", "HelmBack")
    h.add("SpineHelm", "Head", (0, 1.44, -0.03), (1.20, .18, 1.36), h.gold)
    h.add("HelmNeck", "Head", (0, 1.17, -0.58), (1.00, .42, .28), h.armor, mat="Metal")
    h.add("HelmRidge", "Head", (0, 1.52, -0.56), (1.62, .15, .08), h.armor, mat="Metal")
    h.add("SpineCrest", "Head", (0, 1.46, -0.64), (0.52, .40, .18), h.gold, mat="Metal")
    _add_torso_harness(h)
    _add_split_robe(h)
    # 双短戟
    h.add("HalberdL", "LeftArm", (-.18, .48, -.66), (.15, 2.38, .17), h.armor, shape="cylinder", mat="Metal")
    h.add("HalberdLFerrule", "LeftArm", (-.18, 1.55, -.66), (.24, .24, .24), h.gold, shape="cylinder", mat="Metal")
    h.add("HalberdLSpike", "LeftArm", (-.18, 1.98, -.66), (.17, .78, .23), "#D9E2EA", shape="wedge", rot=(0, 90, 0), mat="Metal")
    h.add("HalberdLBlade", "LeftArm", (-.45, 1.62, -.66), (.42, .62, .12), "#D9E2EA", shape="wedge", rot=(0, 0, -18), mat="Metal")
    h.add("HalberdR", "RightArm", (.16, .48, -.66), (.15, 2.34, .17), h.armor, shape="cylinder", mat="Metal")
    h.add("HalberdRFerrule", "RightArm", (.16, 1.53, -.66), (.24, .24, .24), h.gold, shape="cylinder", mat="Metal")
    h.add("HalberdRSpike", "RightArm", (.16, 1.94, -.66), (.17, .74, .23), "#D9E2EA", shape="wedge", rot=(0, -90, 0), mat="Metal")
    h.add("HalberdRBlade", "RightArm", (.43, 1.58, -.66), (.42, .60, .12), "#D9E2EA", shape="wedge", rot=(0, 0, 18), mat="Metal")
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
    h.add("OpenChest", "Torso", (0, 0.03, -0.64), (1.95, 1.55, .17), "#F0E9D2", mat="Fabric")
    h.add("TigerWaist", "Torso", (0, -1.03, -0.23), (1.98, .44, .86), "#A35A1F", mat="Fabric")
    h.add("TigerFurL", "LeftLeg", (0, -0.34, -0.73), (.98, .70, .14), "#C7822A", mat="Fabric")
    h.add("TigerFurR", "RightLeg", (0, -0.34, -0.73), (.98, .70, .14), "#C7822A", mat="Fabric")
    for x in (-.32, 0, .32):
        h.add(f"TigerStripe{x}", "Torso", (x, -1.05, -0.70), (.09, .42, .08), h.hair, mat="Fabric", rot=(0, 0, 18 if x < 0 else -18))
    h.add("TigerCollar", "Torso", (0, -0.74, -0.58), (1.6, .12, .10), "#6F2F18", mat="Fabric")
    h.add("TigerBelt", "Torso", (0, -1.04, -0.06), (1.95, .22, .12), h.gold, mat="Metal")
    h.add("BareArmL", "LeftArm", (0, -0.22, 0.02), (.92, 1.78, 1.00), h.skin, mat="SmoothPlastic")
    h.add("BareArmR", "RightArm", (0, -0.22, 0.02), (.92, 1.78, 1.00), h.skin, mat="SmoothPlastic")
    h.add("ForearmBandL", "LeftArm", (0, -0.72, -0.02), (.96, .18, 1.04), h.hair, mat="Fabric")
    h.add("ForearmBandR", "RightArm", (0, -0.72, -0.02), (.96, .18, 1.04), h.hair, mat="Fabric")
    h.add("HammerGrip", "LeftArm", (0, -0.20, -0.71), (.20, 1.70, .20), h.hair, shape="cylinder", mat="Fabric", rot=(0, 0, -18))
    h.add("HammerNeck", "LeftArm", (0.28, .58, -0.70), (.24, .30, .24), h.gold, shape="cylinder", mat="Metal")
    h.add("TigerHammerHead", "LeftArm", (.52, .94, -0.66), (1.24, .68, .92), h.armor, shape="box", mat="Metal", rot=(0, 0, -8))
    h.add("TigerHammerFace", "LeftArm", (.52, .96, -1.14), (.94, .50, .10), h.gold, mat="Metal", rot=(0, 0, -8))
    h.add("TigerHammerBrow", "LeftArm", (.52, 1.10, -1.20), (.56, .10, .08), h.hair, mat="Metal", rot=(0, 0, -8))
    h.add("TigerHammerFangL", "LeftArm", (.30, .72, -1.21), (.12, .26, .08), "#F4E7C6", shape="wedge", rot=(0, 0, -8), mat="Metal")
    h.add("TigerHammerFangR", "LeftArm", (.74, .72, -1.21), (.12, .26, .08), "#F4E7C6", shape="wedge", rot=(0, 0, -8), mat="Metal")
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
    )
    h.add("ScholarRobe", "Torso", (0, -0.02, -0.58), (1.84, 1.57, .17), h.armor, mat="Fabric")
    h.add("ScholarOuterSash", "Torso", (0, 0.02, -0.72), (.56, 1.58, .08), h.cloth, mat="Fabric")
    h.add("ScholarMantle", "Torso", (0, 0.18, -0.73), (1.84, .42, .10), h.cloth, mat="Fabric")
    h.add("ScholarRight", "RightArm", (0, -0.72, -0.80), (1.18, .96, 1.05), h.cloth, mat="Fabric")
    h.add("ScholarLeft", "LeftArm", (0, -0.72, -0.80), (1.18, .96, 1.05), h.cloth, mat="Fabric")
    for sign, leg in [(-1, "LeftLeg"), (1, "RightLeg")]:
        h.add(f"ScholarSkirt{sign}", leg, (0, -0.52, -0.74), (.84, 1.34, .10), h.armor, mat="Fabric")
        h.add(f"BambooHem{sign}", leg, (0, -1.22, -0.81), (.86, .13, .08), h.gold, mat="Fabric")
        h.add(f"ScholarBackSkirt{sign}", leg, (0, -0.55, 0.32), (.84, 1.26, .10), h.cloth, mat="Fabric")
    h.add("ShoulderOrn", "RightArm", (-0.36, -0.55, -0.48), (.22, .20, .06), h.gold, mat="Metal")
    h.add("ShoulderOrn2", "LeftArm", (0.36, -0.55, -0.48), (.22, .20, .06), h.gold, mat="Metal")
    h.add("JadeBrace", "Torso", (-0.40, 0.22, -0.84), (.28, .66, .06), "#D9E2EE", rot=(0, 28, 0))
    h.add("BambooTube", "Torso", (0.12, .26, -0.81), (.42, .18, .06), "#DDD6AA", rot=(0, 28, 0))
    h.card("TopCardL", bone="LeftArm", pos=(0.02, -0.16, -0.74), color="#EDE9C9", rot=(0, 28, 0))
    h.card("TopCardR", bone="RightArm", pos=(0.22, -0.14, -0.72), color="#EDE9C9", rot=(8, 22, 0))
    h.add("ScrollTag", "Torso", (0.26, 0.14, -0.80), (.24, .14, .04), "#D7CBA6")
    h.pose(Torso=[4, 4, 0], RightArm=[4, 16, -6], LeftArm=[14, -14, 0], Head=[-2, 10, 0])
    return h.done()


def _zhen_ji(meta, base):
    palette = meta["palette"]
    h = _reset(meta, base, cloth=palette[0], armor=palette[1], gold=palette[3])
    h.remove("CheekGuard", "CheekEdge", "Plume", "Helm", "HelmTop", "HelmRidge", "HelmBrowBand", "HelmBack")
    h.scale(0.96, 0.98, 0.98)
    h.add("WinterCoat", "Torso", (0, 0.03, -0.58), (1.82, 1.60, .16), "#F5F7FD", mat="Fabric")
    h.add("SplitSkirtL", "LeftLeg", (0, -0.46, -0.71), (.82, 1.48, .12), "#9DC0E1", mat="Fabric")
    h.add("SplitSkirtR", "RightLeg", (0, -0.46, -0.71), (.82, 1.48, .12), "#9DC0E1", mat="Fabric")
    h.add("TrimL", "LeftLeg", (0, -0.58, -0.79), (.86, .18, .14), "#DDE9F8", mat="Fabric")
    h.add("TrimR", "RightLeg", (0, -0.58, -0.79), (.86, .18, .14), "#DDE9F8", mat="Fabric")
    h.add("WaterSleeveL", "LeftArm", (0, -0.78, -0.04), (1.18, .96, .86), "#7DA0CC", mat="Fabric")
    h.add("WaterSleeveR", "RightArm", (0, -0.78, -0.04), (1.18, .96, .86), "#7DA0CC", mat="Fabric")
    h.add("WovenRibL", "Torso", (-0.58, 0.22, -0.16), (0.42, .82, .12), h.gold)
    h.add("WovenRibR", "Torso", (0.58, 0.22, -0.16), (0.42, .82, .12), h.gold)
    # 折扇
    h.card("FoldingFan", bone="RightArm", pos=(0.18, -0.45, -1.02), color="#F0F3F8", rot=(0, 16, 0))
    h.add("FanStem", "RightArm", (0.18, -1.00, -0.75), (.11, .44, .11), h.gold, shape="cylinder", mat="Metal")
    h.add("FanPlate", "RightArm", (0.18, -0.42, -1.00), (.02, .53, .54), "#9EC0E7", shape="box", rot=(0, 18, 0))
    h.bun(height=0.34)
    h.pose(RightArm=[-16, 16, 34], LeftArm=[18, -44, -20], Head=[3, 8, 0], Torso=[0, -6, 0])
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
