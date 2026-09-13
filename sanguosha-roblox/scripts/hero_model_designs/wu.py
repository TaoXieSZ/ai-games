"""Wu faction hero model designs."""
import math

from .common import Hero


ORDER = [
    "sun_quan",
    "gan_ning",
    "lu_meng",
    "huang_gai",
    "zhou_yu",
    "da_qiao",
    "lu_xun",
    "sun_shangxiang",
]


RED = "#B6322A"
DEEP_RED = "#8E2F3F"
TEAL = "#1F4E5F"
BLUE_BLACK = "#25364F"
WHITE = "#F5F0E6"
PAPER = "#EAD7B7"
DARK = "#111827"
GOLD = "#D8B35A"
WOOD = "#5B2B1D"
SKIN = "#E8B184"
GREY = "#BFC5C9"


def build_models(catalog, base):
    metas = {item["id"]: item for item in catalog}
    return [
        sun_quan(metas["sun_quan"], base),
        gan_ning(metas["gan_ning"], base),
        lu_meng(metas["lu_meng"], base),
        huang_gai(metas["huang_gai"], base),
        zhou_yu(metas["zhou_yu"], base),
        da_qiao(metas["da_qiao"], base),
        lu_xun(metas["lu_xun"], base),
        sun_shangxiang(metas["sun_shangxiang"], base),
    ]


def trim(hero, prefix, bone, y=-0.04, color=None):
    hero.add(prefix + "TrimTop", bone, (0, y + 0.44, -0.66), (1.28, 0.08, 0.12), color or hero.gold, mat="Metal")
    hero.add(prefix + "TrimBottom", bone, (0, y - 0.44, -0.66), (1.24, 0.08, 0.12), color or hero.gold, mat="Metal")
    hero.add(prefix + "TrimLeft", bone, (-0.55, y, -0.67), (0.08, 0.92, 0.12), color or hero.gold, mat="Metal")
    hero.add(prefix + "TrimRight", bone, (0.55, y, -0.67), (0.08, 0.92, 0.12), color or hero.gold, mat="Metal")
    return hero


def tassel(hero, prefix, bone, pos, color=DEEP_RED):
    x, y, z = pos
    hero.add(prefix + "Ring", bone, (x, y, z), (0.18, 0.08, 0.18), hero.gold, "cylinder", mat="Metal")
    for index, dx in enumerate((-0.09, -0.03, 0.03, 0.09)):
        hero.add(prefix + "Cord" + str(index), bone, (x + dx, y - 0.23, z), (0.035, 0.42, 0.035), color, mat="Fabric")
    return hero


def floating_card(hero, name, bone, pos, rot=(0, 0, 0), color="#B6322A"):
    hero.add(name, bone, pos, (0.42, 0.62, 0.045), color, rot=rot, mat="Fabric")
    hero.add(name + "Mark", bone, (pos[0], pos[1], pos[2] - 0.035), (0.18, 0.22, 0.025), hero.gold, rot=rot, mat="Metal")
    return hero


def short_flag(hero, prefix, bone, pos, cloth=WHITE, mark=RED):
    x, y, z = pos
    hero.add(prefix + "Pole", bone, (x, y, z), (0.08, 1.65, 0.08), WOOD, "cylinder", rot=(0, 0, 0), mat="Metal")
    hero.add(prefix + "Bar", bone, (x + 0.38, y + 0.62, z), (0.08, 0.82, 0.08), WOOD, "cylinder", rot=(0, 0, 90), mat="Metal")
    hero.add(prefix + "Cloth", bone, (x + 0.72, y + 0.32, z), (0.74, 0.92, 0.08), cloth, mat="Fabric")
    hero.add(prefix + "Mark", bone, (x + 0.72, y + 0.32, z - 0.055), (0.34, 0.42, 0.035), mark, mat="Fabric")
    return hero


def sun_quan(meta, base):
    hero = Hero(meta, base, cloth=TEAL, armor=RED, gold=GOLD, hair="#20232B")
    hero.crown(height=0.58, color=GOLD).cape(DEEP_RED, length=1.78, width=2.1)
    trim(hero, "RoyalChest", "Torso", 0.07)
    hero.add("RoyalBelt", "Torso", (0, -0.82, -0.72), (1.82, 0.22, 0.16), GOLD, mat="Metal")
    hero.add("CrownBackPin", "Head", (0, 1.32, 0.54), (1.25, 0.12, 0.12), GOLD, mat="Metal")
    hero.sword("KingSword", "RightArm", (0.05, -1.14, -0.78), length=2.3, color="#DDE7EF", width=0.34)
    floating_card(hero, "BalanceCardA", "LeftArm", (-0.18, -1.08, -0.84), (0, 0, -15), RED)
    floating_card(hero, "BalanceCardB", "LeftArm", (0.18, -1.44, -0.82), (0, 0, 18), TEAL)
    floating_card(hero, "BalanceCardC", "Torso", (1.08, 0.76, -0.92), (0, -16, 16), RED)
    tassel(hero, "SwordTassel", "RightArm", (-0.24, -0.94, -0.78), DEEP_RED)
    hero.pose(Torso=(0, -14, 0), RightArm=(-48, 0, 24), LeftArm=(18, 0, -28), LeftLeg=(4, 0, -8), RightLeg=(-3, 0, 7), Head=(0, -10, 0))
    return hero.done()


def gan_ning(meta, base):
    hero = Hero(meta, base, cloth="#C0262D", armor=DARK, gold="#F4C430", hair="#191D20")
    hero.remove("LeftShoulder", "RightShoulder", "Breastplate", "Chest")
    hero.add("OpenVest", "Torso", (0, 0.08, -0.62), (1.54, 1.25, 0.16), "#C0262D", mat="Fabric")
    hero.add("BareChest", "Torso", (0, 0.24, -0.73), (0.78, 0.92, 0.08), SKIN)
    for side, bone, sign in (("Left", "LeftArm", -1), ("Right", "RightArm", 1)):
        hero.add(side + "BareUpperArm", bone, (0, -0.20, -0.01), (0.55, 0.68, 0.52), SKIN)
        hero.add(side + "WristWrap", bone, (0, -1.02, -0.01), (0.62, 0.30, 0.58), DEEP_RED, mat="Fabric")
        hero.add(side + "KneeWrap", "LeftLeg" if sign < 0 else "RightLeg", (0, -0.92, -0.01), (0.58, 0.20, 0.56), "#0E7490", mat="Fabric")
    hero.add("Headband", "Head", (0, 1.05, -0.05), (1.42, 0.16, 1.20), DEEP_RED, mat="Fabric")
    hero.add("HeadbandTailA", "Head", (-0.68, 1.0, 0.58), (0.16, 0.92, 0.08), DEEP_RED, rot=(0, 0, -28), mat="Fabric")
    hero.add("HeadbandTailB", "Head", (-0.44, 0.96, 0.62), (0.13, 0.72, 0.08), DEEP_RED, rot=(0, 0, -18), mat="Fabric")
    short_flag(hero, "SailFlag", "Torso", (-0.86, 0.9, 0.82), cloth="#EEE2C6", mark="#C0262D")
    hero.sword("ReverseKnife", "RightArm", (0.0, -1.10, -0.65), length=1.05, color="#E7EDF2", width=0.40)
    for index, x in enumerate((-0.48, -0.2, 0.08, 0.36, 0.62)):
        hero.add("BeltBell" + str(index), "Torso", (x, -0.78, -0.78), (0.18, 0.18, 0.18), hero.gold, "sphere", mat="Metal")
    tassel(hero, "KnifeCord", "RightArm", (0.24, -0.78, -0.72), "#0E7490")
    hero.pose(Torso=(-9, 16, -9), RightArm=(-72, 0, 35), LeftArm=(36, 0, -45), LeftLeg=(-44, 0, -8), RightLeg=(30, 0, 15), Head=(0, 12, 0))
    return hero.done()


def lu_meng(meta, base):
    hero = Hero(meta, base, cloth=WHITE, armor="#2D5D66", gold=GOLD, hair="#20232B")
    hero.robe(WHITE, sleeves=True).bun(height=0.34)
    hero.add("RedShoulderCordL", "Torso", (-0.58, 0.78, -0.70), (0.22, 0.70, 0.10), "#A52A2A", rot=(0, 0, -26), mat="Fabric")
    hero.add("RedShoulderCordR", "Torso", (0.58, 0.78, -0.70), (0.22, 0.70, 0.10), "#A52A2A", rot=(0, 0, 26), mat="Fabric")
    hero.add("TealSash", "Torso", (0, -0.66, -0.76), (1.78, 0.20, 0.14), "#2D5D66", mat="Fabric")
    hero.add("Sheath", "Torso", (0.64, -0.92, -0.58), (0.22, 1.76, 0.22), DARK, "cylinder", rot=(0, 0, -58), mat="Metal")
    hero.add("SheathCap", "Torso", (1.13, -1.38, -0.58), (0.36, 0.18, 0.26), GOLD, mat="Metal")
    hero.card("ClosedHandStackA", "LeftArm", (0.06, -1.18, -0.78), "#E7D9B6", (0, 0, -7))
    hero.card("ClosedHandStackB", "LeftArm", (0.18, -1.12, -0.82), "#D8CAB0", (0, 0, 4))
    hero.pose(Torso=(0, -4, 0), RightArm=(-10, 0, 14), LeftArm=(-8, 0, -14), LeftLeg=(0, 0, -2), RightLeg=(0, 0, 2), Head=(0, 4, 0))
    return hero.done()


def huang_gai(meta, base):
    hero = Hero(meta, base, cloth="#9B2C2C", armor="#5B2B1D", gold="#E0A84F", hair=GREY)
    hero.scale(x=1.08, y=1.03, z=1.06).beard(GREY, length=0.68, width=0.72).bun(GREY, height=0.34)
    hero.remove("LeftShoulder")
    hero.add("BandagedShoulder", "LeftArm", (0, 0.05, -0.02), (0.68, 0.82, 0.62), "#E5D6BF", mat="Fabric")
    hero.add("BandageStripA", "LeftArm", (0, 0.18, -0.36), (0.74, 0.10, 0.08), WHITE, rot=(0, 0, 16), mat="Fabric")
    hero.add("BandageStripB", "LeftArm", (0, -0.06, -0.36), (0.74, 0.10, 0.08), WHITE, rot=(0, 0, -16), mat="Fabric")
    hero.add("HeavyRightPauldron", "RightArm", (0, 0.22, -0.02), (0.88, 0.48, 0.76), "#5B2B1D", mat="Metal")
    trim(hero, "OldArmor", "Torso", 0.03)
    hero.add("DrumMalletHead", "RightArm", (0.0, -1.82, -0.70), (0.55, 0.45, 0.55), WOOD, "cylinder", rot=(90, 0, 0), mat="Metal")
    hero.add("DrumMalletHandle", "RightArm", (0.0, -1.24, -0.70), (0.11, 1.20, 0.11), WOOD, "cylinder", mat="Metal")
    short_flag(hero, "FireBoatFlag", "Torso", (0.72, 0.62, 0.80), cloth="#A52A2A", mark="#E0A84F")
    hero.add("LooseArmorStrap", "Torso", (-0.52, 0.02, -0.78), (0.12, 1.18, 0.10), DARK, rot=(0, 0, -24), mat="Fabric")
    hero.pose(Torso=(4, 8, -2), RightArm=(-42, 0, 24), LeftArm=(22, 0, -38), LeftLeg=(12, 0, -10), RightLeg=(-5, 0, 7), Head=(0, 8, 0))
    return hero.done()


def zhou_yu(meta, base):
    hero = Hero(meta, base, cloth=BLUE_BLACK, armor="#C7322B", gold=GOLD, hair="#20232B")
    hero.crown(height=0.44, color=GOLD)
    hero.add("WhiteShortCapeL", "Torso", (-0.44, 0.44, 0.78), (0.96, 1.26, 0.12), WHITE, rot=(-8, 0, -8), mat="Fabric")
    hero.add("WhiteShortCapeR", "Torso", (0.44, 0.44, 0.78), (0.96, 1.26, 0.12), WHITE, rot=(-8, 0, 8), mat="Fabric")
    hero.add("CapeClasp", "Torso", (0, 0.82, -0.74), (0.34, 0.34, 0.12), GOLD, "sphere", mat="Metal")
    trim(hero, "GovernorPlate", "Torso", 0.02)
    hero.add("BatonShaft", "RightArm", (0.02, -1.00, -0.72), (0.10, 2.15, 0.10), DARK, "cylinder", rot=(0, 0, -24), mat="Metal")
    hero.add("BatonTip", "RightArm", (-0.43, -0.03, -0.72), (0.22, 0.34, 0.22), GOLD, "sphere", mat="Metal")
    tassel(hero, "BatonTassel", "RightArm", (-0.48, -0.22, -0.72), "#C7322B")
    floating_card(hero, "SuitCardSpade", "LeftArm", (-0.1, -1.05, -0.84), (0, 0, 10), DARK)
    floating_card(hero, "SuitCardHeart", "Torso", (0.98, 0.22, -0.96), (0, -14, 16), "#C7322B")
    floating_card(hero, "SuitCardClub", "Torso", (-0.94, 0.0, -0.96), (0, 14, -18), DARK)
    hero.pose(Torso=(0, -18, 0), RightArm=(-54, 0, 36), LeftArm=(14, 0, -34), LeftLeg=(-5, 0, -5), RightLeg=(8, 0, 6), Head=(0, -13, 0))
    return hero.done()


def da_qiao(meta, base):
    hero = Hero(meta, base, cloth="#D14A61", armor="#F7C6D0", gold="#D9B56B", hair="#17151A")
    hero.robe("#D14A61", sleeves=True).bun("#17151A", height=0.32)
    hero.add("FlowerHairpin", "Head", (0.42, 1.32, -0.36), (0.22, 0.22, 0.10), "#F7C6D0", "sphere", mat="Metal")
    for sign in (-1, 1):
        hero.add("LongHairFall" + str(sign), "Head", (sign * 0.42, 0.32, 0.54), (0.22, 1.24, 0.20), "#17151A", mat="Fabric")
        hero.add("SkirtPanel" + str(sign), "LeftLeg" if sign < 0 else "RightLeg", (sign * 0.12, -0.70, -0.76), (0.72, 1.34, 0.12), "#8E2F3F", rot=(0, 0, sign * 5), mat="Fabric")
        hero.add("WhiteSashTail" + str(sign), "Torso", (sign * 0.56, -0.42, -0.80), (0.18, 1.42, 0.08), WHITE, rot=(0, 0, sign * 20), mat="Fabric")
    umbrella_center = (-0.32, 0.36, -0.86)
    hero.add("UmbrellaHandleLower", "LeftArm", (-0.02, -1.05, -0.78), (0.10, 1.82, 0.10), WOOD, "cylinder", rot=(0, 0, -7), mat="Metal")
    hero.add("UmbrellaHandleUpper", "LeftArm", (-0.18, -0.10, -0.82), (0.08, 1.18, 0.08), WOOD, "cylinder", rot=(0, 0, -7), mat="Metal")
    hero.add("UmbrellaGrip", "LeftArm", (0.02, -1.56, -0.76), (0.28, 0.28, 0.18), hero.gold, mat="Metal")
    hero.add("UmbrellaHub", "LeftArm", umbrella_center, (0.32, 0.18, 0.32), hero.gold, "cylinder", rot=(90, 0, 0), mat="Metal")
    for index, angle in enumerate(range(0, 360, 45)):
        radians = math.radians(angle)
        x = umbrella_center[0] + math.cos(radians) * 0.45
        y = umbrella_center[1] + math.sin(radians) * 0.45
        hero.add("UmbrellaRib" + str(index), "LeftArm", (x, y, umbrella_center[2] - 0.02), (0.055, 1.02, 0.045), hero.gold, "cylinder", rot=(0, 0, angle - 90), mat="Metal")
        panel_color = "#E66B7E" if index % 2 else "#D14A61"
        px = umbrella_center[0] + math.cos(radians) * 0.72
        py = umbrella_center[1] + math.sin(radians) * 0.72
        hero.add("UmbrellaPanel" + str(index), "LeftArm", (px, py, umbrella_center[2] - 0.06), (0.72, 0.48, 0.09), panel_color, rot=(0, 0, angle), mat="Fabric")
    hero.add("UmbrellaRimTop", "LeftArm", (umbrella_center[0], umbrella_center[1] + 1.02, umbrella_center[2] - 0.08), (1.12, 0.10, 0.10), hero.gold, mat="Metal")
    hero.add("UmbrellaRimBottom", "LeftArm", (umbrella_center[0], umbrella_center[1] - 1.02, umbrella_center[2] - 0.08), (1.12, 0.10, 0.10), hero.gold, mat="Metal")
    hero.add("UmbrellaRimLeft", "LeftArm", (umbrella_center[0] - 1.02, umbrella_center[1], umbrella_center[2] - 0.08), (0.10, 1.12, 0.10), hero.gold, mat="Metal")
    hero.add("UmbrellaRimRight", "LeftArm", (umbrella_center[0] + 1.02, umbrella_center[1], umbrella_center[2] - 0.08), (0.10, 1.12, 0.10), hero.gold, mat="Metal")
    hero.card("CharmCard", "RightArm", (0.0, -1.12, -0.82), "#D14A61", (0, 0, 12))
    hero.pose(Torso=(0, 18, 2), LeftArm=(-18, 0, -46), RightArm=(16, 0, 36), LeftLeg=(10, 0, -10), RightLeg=(-7, 0, 13), Head=(0, 14, 0))
    return hero.done()


def lu_xun(meta, base):
    hero = Hero(meta, base, cloth=PAPER, armor="#B91C1C", gold="#D6A84F", hair="#20232B")
    hero.robe(PAPER, sleeves=True)
    hero.remove("HairTop")
    hero.add("ScholarHatTop", "Head", (0, 1.28, -0.04), (1.38, 0.28, 1.02), "#334155", mat="Fabric")
    hero.add("ScholarHatFront", "Head", (0, 1.16, -0.62), (1.18, 0.28, 0.16), "#334155", mat="Fabric")
    hero.add("HatRibbonL", "Head", (-0.48, 1.08, 0.58), (0.12, 0.90, 0.08), "#B91C1C", rot=(0, 0, -16), mat="Fabric")
    hero.add("HatRibbonR", "Head", (0.48, 1.08, 0.58), (0.12, 0.90, 0.08), "#B91C1C", rot=(0, 0, 16), mat="Fabric")
    hero.add("BookRollA", "Torso", (0.64, -0.22, -0.78), (0.18, 0.86, 0.18), "#C39152", "cylinder", rot=(0, 0, 0), mat="Fabric")
    hero.add("BookRollB", "Torso", (0.82, -0.22, -0.78), (0.18, 0.86, 0.18), "#C39152", "cylinder", rot=(0, 0, 0), mat="Fabric")
    hero.add("BookCord", "Torso", (0.73, -0.22, -0.92), (0.48, 0.08, 0.08), hero.gold, mat="Metal")
    hero.card("NewDrawCard", "LeftArm", (0.02, -1.08, -0.82), "#E7D9B6", (0, 0, -8))
    floating_card(hero, "SleeveGlowCard", "Torso", (-0.86, -0.42, -0.94), (0, 10, -16), "#B91C1C")
    hero.add("QuietPalm", "RightArm", (0.0, -1.30, -0.72), (0.40, 0.28, 0.18), SKIN)
    hero.pose(Torso=(0, 12, 0), RightArm=(10, 0, 34), LeftArm=(-18, 0, -20), LeftLeg=(-9, 0, -7), RightLeg=(4, 0, 8), Head=(0, 10, 0))
    return hero.done()


def sun_shangxiang(meta, base):
    hero = Hero(meta, base, cloth="#C92A3A", armor="#2B6C7A", gold="#F0B35A", hair="#18151C")
    hero.remove("HairBack", "HairSide", "HairTop")
    hero.add("HighPonyBase", "Head", (0, 1.30, 0.22), (0.62, 0.34, 0.62), "#18151C")
    hero.add("HighPonyTailA", "Head", (-0.28, 1.28, 0.78), (0.30, 1.28, 0.24), "#18151C", rot=(-18, 0, -28), mat="Fabric")
    hero.add("HighPonyTailB", "Head", (-0.04, 1.18, 0.96), (0.26, 1.02, 0.22), "#18151C", rot=(-28, 0, -8), mat="Fabric")
    hero.add("HairFlower", "Head", (0.40, 1.26, -0.32), (0.22, 0.22, 0.12), hero.gold, "sphere", mat="Metal")
    for sign in (-1, 1):
        leg = "LeftLeg" if sign < 0 else "RightLeg"
        arm = "LeftArm" if sign < 0 else "RightArm"
        hero.add("ArcherSkirt" + str(sign), leg, (0, -0.55, -0.76), (0.82, 1.18, 0.12), "#C92A3A", rot=(0, 0, sign * 8), mat="Fabric")
        hero.add("GoldBracer" + str(sign), arm, (0, -0.76, -0.02), (0.58, 0.30, 0.56), hero.gold, mat="Metal")
    hero.add("BowGrip", "LeftArm", (0.0, -0.98, -0.98), (0.34, 0.38, 0.22), hero.gold, mat="Metal")
    hero.add("BowBackbone", "LeftArm", (0.0, -0.98, -1.03), (0.12, 2.72, 0.12), WOOD, "cylinder", mat="Metal")
    hero.add("BowUpperCurve", "LeftArm", (0.22, -0.08, -1.03), (0.12, 1.12, 0.12), WOOD, "cylinder", rot=(0, 0, -14), mat="Metal")
    hero.add("BowLowerCurve", "LeftArm", (-0.22, -1.88, -1.03), (0.12, 1.12, 0.12), WOOD, "cylinder", rot=(0, 0, 14), mat="Metal")
    hero.add("BowTopCap", "LeftArm", (0.34, 0.48, -1.03), (0.24, 0.24, 0.16), hero.gold, mat="Metal")
    hero.add("BowBottomCap", "LeftArm", (-0.34, -2.44, -1.03), (0.24, 0.24, 0.16), hero.gold, mat="Metal")
    hero.add("BowStringFull", "LeftArm", (0.0, -0.98, -1.25), (0.035, 2.86, 0.035), "#EAD7B7", "cylinder", mat="Fabric")
    hero.add("BowStringGripTie", "LeftArm", (0.0, -0.98, -1.12), (0.34, 0.035, 0.035), "#EAD7B7", "cylinder", rot=(0, 0, 90), mat="Fabric")
    hero.add("LeftHandOnBow", "LeftArm", (0.0, -1.02, -1.18), (0.36, 0.32, 0.20), SKIN)
    hero.add("RightHandDraw", "RightArm", (0.02, -1.18, -0.98), (0.34, 0.30, 0.18), SKIN)
    hero.add("ArrowShaft", "RightArm", (0.0, -1.12, -0.90), (0.06, 2.32, 0.06), "#EAD7B7", "cylinder", rot=(0, 0, 88), mat="Metal")
    hero.add("ArrowHead", "RightArm", (-1.14, -1.10, -0.90), (0.26, 0.42, 0.16), "#E7EDF2", "wedge", rot=(0, 0, 88), mat="Metal")
    floating_card(hero, "EquipCharmA", "Torso", (-0.88, -0.82, 0.64), (0, 18, -14), "#C92A3A")
    floating_card(hero, "EquipCharmB", "Torso", (0.88, -0.72, 0.62), (0, -18, 14), "#2B6C7A")
    hero.pose(Torso=(-4, -22, 0), LeftArm=(-36, 0, -46), RightArm=(-34, 0, 48), LeftLeg=(-34, 0, -12), RightLeg=(16, 0, 10), Head=(0, -18, 0))
    return hero.done()
