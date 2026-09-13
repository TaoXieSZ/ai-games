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


def armor_tiles(hero, prefix, bone, xs, ys, z, color, accent=None, tile=(0.18, 0.14, 0.045)):
    for row, y in enumerate(ys):
        for col, x in enumerate(xs):
            hero.add(prefix + "Tile" + str(row) + "_" + str(col), bone, (x, y, z), tile, color, mat="Metal")
            if accent:
                hero.add(prefix + "Rivet" + str(row) + "_" + str(col), bone, (x, y, z - 0.035), (0.045, 0.045, 0.025), accent, "sphere", mat="Metal")
    return hero


def wave_trim(hero, prefix, bone, x0, y0, z, color, count=3, sign=1):
    for index in range(count):
        x = x0 + index * 0.24 * sign
        hero.add(prefix + "Wave" + str(index), bone, (x, y0 + math.sin(index) * 0.035, z), (0.22, 0.065, 0.035), color, rot=(0, 0, sign * (18 - index * 8)), mat="Metal")
    return hero


def beast_medal(hero, prefix, bone, pos, color=None):
    x, y, z = pos
    color = color or hero.gold
    hero.add(prefix + "Face", bone, (x, y, z), (0.34, 0.28, 0.10), color, "sphere", mat="Metal")
    hero.add(prefix + "Brow", bone, (x, y + 0.10, z - 0.06), (0.42, 0.07, 0.045), color, mat="Metal")
    for sign in (-1, 1):
        hero.add(prefix + "Fang" + str(sign), bone, (x + sign * 0.10, y - 0.15, z - 0.06), (0.08, 0.18, 0.05), color, "wedge", rot=(0, -sign * 90, 180), mat="Metal")
        hero.add(prefix + "Horn" + str(sign), bone, (x + sign * 0.20, y + 0.13, z - 0.04), (0.09, 0.20, 0.07), color, "wedge", rot=(0, -sign * 90, sign * 18), mat="Metal")
    return hero


def flower_mark(hero, prefix, bone, center, radius, petal, jewel=None):
    x, y, z = center
    for index in range(5):
        angle = index * 72
        radians = math.radians(angle)
        hero.add(prefix + "Petal" + str(index), bone, (x + math.sin(radians) * radius * 0.42, y + math.cos(radians) * radius * 0.42, z), (radius * 0.48, radius * 0.74, 0.04), petal, rot=(0, 0, -angle), mat="Fabric")
    hero.add(prefix + "Center", bone, (x, y, z - 0.035), (radius * 0.30, radius * 0.30, 0.035), jewel or hero.gold, "sphere", mat="Metal")
    return hero


def sun_quan(meta, base):
    hero = Hero(meta, base, cloth=TEAL, armor=RED, gold=GOLD, hair="#20232B")
    hero.remove("LeftBracer", "RightBracer", "LeftCuff", "RightCuff")
    hero.crown(height=0.58, color=GOLD).cape(DEEP_RED, length=1.78, width=2.1)
    trim(hero, "RoyalChest", "Torso", 0.07)
    hero.add("RoyalInnerTealRobe", "Torso", (0, 0.03, -0.78), (1.12, 1.44, 0.08), "#0F5964", mat="Fabric")
    armor_tiles(hero, "RoyalBreast", "Torso", (-0.42, -0.14, 0.14, 0.42), (0.44, 0.20, -0.04, -0.28), -0.84, "#9F2E2E", GOLD, tile=(0.18, 0.16, 0.04))
    for sign in (-1, 1):
        arm = "LeftArm" if sign < 0 else "RightArm"
        leg = "LeftLeg" if sign < 0 else "RightLeg"
        hero.add("RoyalDragonPauldron" + str(sign), arm, (0, 0.39, -0.04), (1.06, 0.24, 1.12), "#9F2E2E", rot=(0, 0, sign * 6), mat="Metal")
        wave_trim(hero, "ShoulderDragon" + str(sign), arm, -0.24 * sign, 0.43, -0.62, GOLD, count=3, sign=sign)
        hero.add("RoyalWristCuff" + str(sign), arm, (0, -1.10, -0.02), (0.78, 0.28, 0.82), "#8E2F3F", mat="Metal")
        hero.add("RoyalCuffGold" + str(sign), arm, (0, -1.10, -0.48), (0.62, 0.10, 0.06), GOLD, mat="Metal")
        hero.add("RoyalTealSleeveSide" + str(sign), arm, (0, -0.58, 0.26), (0.72, 0.96, 0.52), TEAL, mat="Fabric")
        hero.add("RoyalRedSleeveFace" + str(sign), arm, (0, -0.58, -0.46), (0.72, 0.82, 0.08), "#9F2E2E", mat="Metal")
        hero.add("RoyalLegPlate" + str(sign), leg, (0, -0.64, -0.68), (0.84, 1.08, 0.12), "#8E2F3F", mat="Metal")
        armor_tiles(hero, "RoyalLeg" + str(sign), leg, (-0.22, 0.22), (-0.30, -0.56, -0.82), -0.76, "#9F2E2E", GOLD, tile=(0.18, 0.13, 0.035))
    hero.add("RoyalBelt", "Torso", (0, -0.82, -0.72), (1.82, 0.22, 0.16), GOLD, mat="Metal")
    beast_medal(hero, "RoyalLionBuckle", "Torso", (0, -0.78, -0.92))
    hero.add("CrownBackPin", "Head", (0, 1.32, 0.54), (1.25, 0.12, 0.12), GOLD, mat="Metal")
    hero.add("CrownRubyTall", "Head", (0, 1.55, -0.64), (0.24, 0.34, 0.08), "#C3292F", rot=(0, 0, 45), mat="Metal")
    for sign in (-1, 1):
        hero.add("CrownRibbon" + str(sign), "Head", (sign * 0.46, 1.16, 0.62), (0.14, 1.20, 0.07), DEEP_RED, rot=(-8, 0, sign * 18), mat="Fabric")
    hero.sword("KingSword", "RightArm", (0.05, -1.14, -0.78), length=2.3, color="#DDE7EF", width=0.34)
    wave_trim(hero, "KingBladeEtch", "RightArm", -0.10, 0.20, -0.86, GOLD, count=4, sign=1)
    floating_card(hero, "BalanceCardA", "LeftArm", (-0.18, -1.08, -0.84), (0, 0, -15), RED)
    floating_card(hero, "BalanceCardB", "LeftArm", (0.18, -1.44, -0.82), (0, 0, 18), TEAL)
    floating_card(hero, "BalanceCardC", "Torso", (1.08, 0.76, -0.92), (0, -16, 16), RED)
    floating_card(hero, "BalanceCardD", "Torso", (-1.04, 0.68, -0.92), (0, 14, -14), TEAL)
    tassel(hero, "SwordTassel", "RightArm", (-0.24, -0.94, -0.78), DEEP_RED)
    hero.pose(Torso=(0, -14, 0), RightArm=(-48, 0, 24), LeftArm=(18, 0, -28), LeftLeg=(4, 0, -8), RightLeg=(-3, 0, 7), Head=(0, -10, 0))
    return hero.done()


def gan_ning(meta, base):
    hero = Hero(meta, base, cloth="#C0262D", armor=DARK, gold="#F4C430", hair="#191D20")
    hero.remove(
        "LeftShoulder", "RightShoulder", "Breastplate", "Chest", "BackArmor", "BackBand", "BackVertical",
        "WaistBelt", "BeltTrim", "BeltDragon", "LeftSkirt", "RightSkirt", "LeftSideSkirt", "RightSideSkirt",
        "LeftGreave", "RightGreave", "LeftKnee", "RightKnee"
    )
    hero.add("OpenVest", "Torso", (0, 0.08, -0.62), (1.54, 1.25, 0.16), "#C0262D", mat="Fabric")
    hero.add("PirateBackVest", "Torso", (0, 0.02, 0.68), (1.48, 1.20, 0.11), "#9F1E2B", mat="Fabric")
    hero.add("FlagBackHarness", "Torso", (-0.42, 0.12, 0.84), (0.16, 1.44, 0.08), "#2A1A16", rot=(0, 0, -12), mat="Fabric")
    hero.add("FlagBackHarnessCross", "Torso", (0.18, -0.10, 0.86), (0.14, 1.34, 0.08), "#2A1A16", rot=(0, 0, 36), mat="Fabric")
    for sign in (-1, 1):
        hero.add("RaggedVestFlap" + str(sign), "Torso", (sign * 0.48, -0.22, -0.74), (0.30, 1.18, 0.07), "#9F1E2B", rot=(0, 0, sign * 14), mat="Fabric")
        for index in range(3):
            hero.add("TornVestTooth" + str(sign) + "_" + str(index), "Torso", (sign * (0.28 + index * 0.14), -0.76 - index * 0.03, -0.78), (0.13, 0.22, 0.05), "#9F1E2B", "wedge", rot=(0, -sign * 90, 180), mat="Fabric")
    hero.add("BareChest", "Torso", (0, 0.24, -0.73), (0.78, 0.92, 0.08), SKIN)
    hero.add("ChestCord", "Torso", (0, 0.08, -0.83), (0.92, 0.08, 0.055), "#5B2B1D", rot=(0, 0, -16), mat="Fabric")
    hero.add("BellNecklace", "Torso", (0.18, -0.08, -0.88), (0.18, 0.18, 0.14), hero.gold, "sphere", mat="Metal")
    for side, bone, sign in (("Left", "LeftArm", -1), ("Right", "RightArm", 1)):
        hero.add(side + "BareUpperArm", bone, (0, -0.20, -0.01), (0.55, 0.68, 0.52), SKIN)
        hero.add(side + "WristWrap", bone, (0, -1.02, -0.01), (0.62, 0.30, 0.58), DEEP_RED, mat="Fabric")
        hero.add(side + "BlackBracer", bone, (0, -1.08, -0.06), (0.70, 0.42, 0.68), "#121820", mat="Metal")
        hero.add(side + "BracerStudA", bone, (-0.18, -1.02, -0.44), (0.07, 0.07, 0.035), hero.gold, "sphere", mat="Metal")
        hero.add(side + "BracerStudB", bone, (0.18, -1.02, -0.44), (0.07, 0.07, 0.035), hero.gold, "sphere", mat="Metal")
        if sign < 0:
            hero.add("WaveTattoo", bone, (-0.18, -0.15, -0.38), (0.34, 0.12, 0.04), "#243447", rot=(0, 0, -28), mat="Fabric")
            hero.add("TattooCurl", bone, (0.06, -0.02, -0.39), (0.20, 0.08, 0.04), "#243447", rot=(0, 0, 22), mat="Fabric")
        hero.add(side + "KneeWrap", "LeftLeg" if sign < 0 else "RightLeg", (0, -0.92, -0.01), (0.58, 0.20, 0.56), "#0E7490", mat="Fabric")
        hero.add(side + "KneePlate", "LeftLeg" if sign < 0 else "RightLeg", (0, -0.72, -0.48), (0.62, 0.34, 0.08), "#161B22", mat="Metal")
        leg = "LeftLeg" if sign < 0 else "RightLeg"
        hero.add(side + "PirateBackLeg", leg, (0, -0.58, 0.42), (0.72, 1.10, 0.10), "#111827", mat="Fabric")
        hero.add(side + "PirateBootBand", leg, (0, -1.34, 0.05), (0.78, 0.10, 0.90), "#C0262D", mat="Fabric")
    hero.add("Headband", "Head", (0, 1.05, -0.05), (1.42, 0.16, 1.20), DEEP_RED, mat="Fabric")
    for index, x in enumerate((-0.48, -0.24, 0.0, 0.24, 0.48)):
        hero.add("SpikedHairFan" + str(index), "Head", (x, 1.34 + 0.10 * abs(index - 2), -0.08 + 0.08 * abs(index - 2)), (0.24, 0.50, 0.26), hero.hair, "wedge", rot=(-18, 0, (index - 2) * 14), mat="Fabric")
    hero.add("HeadbandTailA", "Head", (-0.68, 1.0, 0.58), (0.16, 0.92, 0.08), DEEP_RED, rot=(0, 0, -28), mat="Fabric")
    hero.add("HeadbandTailB", "Head", (-0.44, 0.96, 0.62), (0.13, 0.72, 0.08), DEEP_RED, rot=(0, 0, -18), mat="Fabric")
    short_flag(hero, "SailFlag", "Torso", (-0.86, 0.9, 0.82), cloth="#EEE2C6", mark="#C0262D")
    hero.add("SailFlagTornCornerA", "Torso", (0.04, 1.00, 0.76), (0.24, 0.28, 0.06), "#EEE2C6", "wedge", rot=(0, 90, 24), mat="Fabric")
    hero.add("SailFlagTornCornerB", "Torso", (-0.02, 0.62, 0.76), (0.18, 0.22, 0.06), "#EEE2C6", "wedge", rot=(0, -90, -18), mat="Fabric")
    for index in range(3):
        hero.add("SailFlagStreamer" + str(index), "Torso", (-0.70 + index * 0.18, 1.78 - index * 0.07, 0.82), (0.46, 0.11, 0.06), "#A5202C", rot=(0, 0, -10 - index * 8), mat="Fabric")
    hero.sword("ReverseKnife", "RightArm", (0.0, -1.10, -0.65), length=1.05, color="#E7EDF2", width=0.40)
    hero.add("ReverseKnifeHook", "RightArm", (0.32, -0.02, -0.66), (0.34, 0.54, 0.12), "#E7EDF2", "wedge", rot=(0, -90, -28), mat="Metal")
    wave_trim(hero, "KnifeGoldCurl", "RightArm", -0.12, -0.10, -0.75, hero.gold, count=3, sign=1)
    for index, x in enumerate((-0.48, -0.2, 0.08, 0.36, 0.62)):
        hero.add("BeltBell" + str(index), "Torso", (x, -0.78, -0.78), (0.18, 0.18, 0.18), hero.gold, "sphere", mat="Metal")
    for sign in (-1, 1):
        hero.add("TealWaistTail" + str(sign), "Torso", (sign * 0.56, -1.02, -0.50), (0.20, 1.18, 0.08), "#0E7490", rot=(0, 0, sign * 28), mat="Fabric")
    tassel(hero, "KnifeCord", "RightArm", (0.24, -0.78, -0.72), "#0E7490")
    hero.pose(Torso=(-9, 16, -9), RightArm=(-72, 0, 35), LeftArm=(36, 0, -45), LeftLeg=(-44, 0, -8), RightLeg=(30, 0, 15), Head=(0, 12, 0))
    return hero.done()


def lu_meng(meta, base):
    hero = Hero(meta, base, cloth=WHITE, armor="#2D5D66", gold=GOLD, hair="#20232B")
    hero.robe(WHITE, sleeves=True).bun(height=0.34)
    hero.add("BlackLamellarUnderRobe", "Torso", (0, 0.03, -0.76), (1.20, 1.42, 0.08), "#19202A", mat="Metal")
    armor_tiles(hero, "LuMengChest", "Torso", (-0.28, 0.0, 0.28), (0.40, 0.17, -0.06, -0.29), -0.83, "#25364F", GOLD, tile=(0.17, 0.15, 0.04))
    for sign in (-1, 1):
        arm = "LeftArm" if sign < 0 else "RightArm"
        hero.add("BlackGoldShoulder" + str(sign), arm, (0, 0.38, -0.02), (1.02, 0.24, 1.08), "#25364F", rot=(0, 0, sign * 5), mat="Metal")
        hero.add("ShoulderRoundel" + str(sign), arm, (0, 0.45, -0.58), (0.25, 0.25, 0.06), GOLD, "sphere", mat="Metal")
        hero.add("RedCordDrop" + str(sign), arm, (sign * 0.12, 0.05, -0.62), (0.08, 0.60, 0.045), DEEP_RED, rot=(0, 0, sign * 12), mat="Fabric")
        tassel(hero, "ShoulderTassel" + str(sign), arm, (sign * 0.16, -0.28, -0.62), DEEP_RED)
    hero.add("RedShoulderCordL", "Torso", (-0.58, 0.78, -0.70), (0.22, 0.70, 0.10), "#A52A2A", rot=(0, 0, -26), mat="Fabric")
    hero.add("RedShoulderCordR", "Torso", (0.58, 0.78, -0.70), (0.22, 0.70, 0.10), "#A52A2A", rot=(0, 0, 26), mat="Fabric")
    hero.add("WhiteRobeBackPanel", "Torso", (0, -0.02, 0.74), (1.72, 1.76, 0.10), "#F7F2E7", mat="Fabric")
    hero.add("TealSash", "Torso", (0, -0.66, -0.76), (1.78, 0.20, 0.14), "#2D5D66", mat="Fabric")
    hero.add("SashGoldPlaque", "Torso", (0, -0.66, -0.92), (0.34, 0.24, 0.08), GOLD, mat="Metal")
    hero.add("Sheath", "Torso", (0.64, -0.92, -0.58), (0.22, 1.76, 0.22), DARK, "cylinder", rot=(0, 0, -58), mat="Metal")
    hero.add("SheathCap", "Torso", (1.13, -1.38, -0.58), (0.36, 0.18, 0.26), GOLD, mat="Metal")
    hero.add("VisibleSwordHilt", "Torso", (-0.03, -0.55, -0.64), (0.18, 1.18, 0.18), "#111827", "cylinder", rot=(0, 0, -56), mat="Metal")
    hero.add("VisibleSwordPommel", "Torso", (-0.38, -0.10, -0.64), (0.22, 0.22, 0.18), GOLD, "sphere", mat="Metal")
    for sign in (-1, 1):
        arm = "LeftArm" if sign < 0 else "RightArm"
        wave_trim(hero, "SleeveSilverCloud" + str(sign), arm, -0.28, -0.98, -0.48, "#BFC5C9", count=3, sign=1)
        hero.add("SleeveBlackCuff" + str(sign), arm, (0, -1.26, -0.02), (0.78, 0.20, 0.82), "#19202A", mat="Fabric")
        leg = "LeftLeg" if sign < 0 else "RightLeg"
        hero.add("BlackRobeInner" + str(sign), leg, (0, -0.52, -0.86), (0.62, 1.26, 0.07), "#171C24", mat="Fabric")
        hero.add("WhiteRobeGoldHem" + str(sign), leg, (0, -1.17, -0.89), (0.86, 0.10, 0.06), GOLD, mat="Metal")
    hero.card("ClosedHandStackA", "LeftArm", (0.06, -1.18, -0.78), "#E7D9B6", (0, 0, -7))
    hero.card("ClosedHandStackB", "LeftArm", (0.18, -1.12, -0.82), "#D8CAB0", (0, 0, 4))
    hero.pose(Torso=(0, -4, 0), RightArm=(-10, 0, 14), LeftArm=(-8, 0, -14), LeftLeg=(0, 0, -2), RightLeg=(0, 0, 2), Head=(0, 4, 0))
    return hero.done()


def huang_gai(meta, base):
    hero = Hero(meta, base, cloth="#9B2C2C", armor="#5B2B1D", gold="#E0A84F", hair=GREY)
    hero.scale(x=1.08, y=1.03, z=1.06).beard(GREY, length=0.68, width=0.72).bun(GREY, height=0.34)
    hero.add("RedBattleHeadband", "Head", (0, 1.12, -0.06), (1.54, 0.18, 1.22), "#9B2C2C", mat="Fabric")
    for sign in (-1, 1):
        hero.add("HeadbandBackTail" + str(sign), "Head", (sign * 0.32, 0.90, 0.68), (0.15, 1.02, 0.08), "#9B2C2C", rot=(-8, 0, sign * 20), mat="Fabric")
        hero.add("WhiteHairLock" + str(sign), "Head", (sign * 0.48, 0.72, 0.30), (0.22, 0.88, 0.18), GREY, rot=(0, 0, sign * 16), mat="Fabric")
    hero.add("CheekScarA", "Head", (-0.34, 0.58, -0.67), (0.06, 0.30, 0.035), "#7C2D2D", rot=(0, 0, -28), mat="Fabric")
    hero.add("CheekScarB", "Head", (-0.25, 0.55, -0.68), (0.05, 0.20, 0.035), "#7C2D2D", rot=(0, 0, 30), mat="Fabric")
    hero.remove("LeftShoulder")
    hero.add("BareChestBlock", "Torso", (0, 0.18, -0.74), (1.04, 1.06, 0.08), SKIN)
    hero.add("CrossBodyLeather", "Torso", (-0.18, 0.06, -0.82), (0.18, 1.54, 0.08), "#2A1A16", rot=(0, 0, -28), mat="Fabric")
    beast_medal(hero, "ChestFireMedal", "Torso", (0.38, 0.12, -0.90), "#E0A84F")
    hero.add("BandagedShoulder", "LeftArm", (0, 0.05, -0.02), (0.68, 0.82, 0.62), "#E5D6BF", mat="Fabric")
    hero.add("BandageStripA", "LeftArm", (0, 0.18, -0.36), (0.74, 0.10, 0.08), WHITE, rot=(0, 0, 16), mat="Fabric")
    hero.add("BandageStripB", "LeftArm", (0, -0.06, -0.36), (0.74, 0.10, 0.08), WHITE, rot=(0, 0, -16), mat="Fabric")
    hero.add("HeavyRightPauldron", "RightArm", (0, 0.22, -0.02), (0.88, 0.48, 0.76), "#5B2B1D", mat="Metal")
    beast_medal(hero, "RightPauldronBeast", "RightArm", (0, 0.24, -0.48), "#E0A84F")
    trim(hero, "OldArmor", "Torso", 0.03)
    armor_tiles(hero, "OldSkirtFront", "Torso", (-0.42, -0.14, 0.14, 0.42), (-0.62, -0.82, -1.02), -0.83, "#7E2630", "#E0A84F", tile=(0.18, 0.15, 0.04))
    for sign in (-1, 1):
        leg = "LeftLeg" if sign < 0 else "RightLeg"
        hero.add("OldLegGuard" + str(sign), leg, (0, -0.64, -0.66), (0.78, 1.02, 0.12), "#7E2630", mat="Metal")
        hero.add("OldLegGoldBand" + str(sign), leg, (0, -1.08, -0.76), (0.82, 0.10, 0.06), "#E0A84F", mat="Metal")
        for index in range(3):
            hero.add("TornRedSkirt" + str(sign) + "_" + str(index), leg, (sign * (0.10 + index * 0.12), -0.44 - index * 0.18, -0.84), (0.15, 0.42, 0.05), "#8E2F3F", "wedge", rot=(0, -sign * 90, 180), mat="Fabric")
    hero.add("DrumMalletHead", "RightArm", (0.0, -1.82, -0.70), (0.55, 0.45, 0.55), WOOD, "cylinder", rot=(90, 0, 0), mat="Metal")
    hero.add("DrumMalletHandle", "RightArm", (0.0, -1.24, -0.70), (0.11, 1.20, 0.11), WOOD, "cylinder", mat="Metal")
    for y in (-2.00, -1.64):
        hero.add("MalletIronBand" + str(y), "RightArm", (0.0, y, -0.70), (0.64, 0.08, 0.64), "#6B3A26", "cylinder", rot=(90, 0, 0), mat="Metal")
    for index, x in enumerate((-0.22, 0.0, 0.22)):
        hero.add("MalletStud" + str(index), "RightArm", (x, -1.82, -1.03), (0.10, 0.10, 0.055), "#E0A84F", "sphere", mat="Metal")
    short_flag(hero, "FireBoatFlag", "Torso", (0.72, 0.62, 0.80), cloth="#A52A2A", mark="#E0A84F")
    for index in range(3):
        hero.add("FlagFlameTongue" + str(index), "Torso", (1.44 + index * 0.14, 0.84 - index * 0.12, 0.74), (0.20, 0.40, 0.06), "#E0A84F", "wedge", rot=(0, 90, -18 + index * 12), mat="Fabric")
    hero.add("LooseArmorStrap", "Torso", (-0.52, 0.02, -0.78), (0.12, 1.18, 0.10), DARK, rot=(0, 0, -24), mat="Fabric")
    hero.pose(Torso=(4, 8, -2), RightArm=(-42, 0, 24), LeftArm=(22, 0, -38), LeftLeg=(12, 0, -10), RightLeg=(-5, 0, 7), Head=(0, 8, 0))
    return hero.done()


def zhou_yu(meta, base):
    hero = Hero(meta, base, cloth=BLUE_BLACK, armor="#C7322B", gold=GOLD, hair="#20232B")
    hero.remove("LeftBracer", "RightBracer", "LeftCuff", "RightCuff")
    hero.crown(height=0.44, color=GOLD)
    hero.add("CrownRubyFront", "Head", (0, 1.47, -0.62), (0.24, 0.30, 0.08), "#C7322B", rot=(0, 0, 45), mat="Metal")
    for sign in (-1, 1):
        hero.add("CrownSidePin" + str(sign), "Head", (sign * 0.64, 1.33, -0.02), (0.52, 0.07, 0.07), GOLD, "cylinder", rot=(0, 0, 90), mat="Metal")
        hero.add("LongHairFall" + str(sign), "Head", (sign * 0.44, 0.24, 0.56), (0.20, 1.46, 0.18), hero.hair, rot=(-6, 0, sign * 8), mat="Fabric")
    hero.add("WhiteShortCapeL", "Torso", (-0.44, 0.44, 0.78), (0.96, 1.26, 0.12), WHITE, rot=(-8, 0, -8), mat="Fabric")
    hero.add("WhiteShortCapeR", "Torso", (0.44, 0.44, 0.78), (0.96, 1.26, 0.12), WHITE, rot=(-8, 0, 8), mat="Fabric")
    for sign in (-1, 1):
        hero.add("WhiteScarfTail" + str(sign), "Torso", (sign * 0.82, -0.12, 0.92), (0.34, 1.86, 0.08), "#F5F0E6", rot=(-10, 0, sign * 22), mat="Fabric")
        wave_trim(hero, "ScarfGoldCloud" + str(sign), "Torso", sign * 0.62, 0.18, 0.82, "#D8B35A", count=3, sign=sign)
    hero.add("CapeClasp", "Torso", (0, 0.82, -0.74), (0.34, 0.34, 0.12), GOLD, "sphere", mat="Metal")
    trim(hero, "GovernorPlate", "Torso", 0.02)
    armor_tiles(hero, "GovernorChest", "Torso", (-0.36, -0.12, 0.12, 0.36), (0.36, 0.12, -0.12, -0.36), -0.83, "#B6322A", GOLD, tile=(0.16, 0.15, 0.04))
    beast_medal(hero, "GovernorLionChest", "Torso", (0, 0.60, -0.91))
    beast_medal(hero, "GovernorLionBelt", "Torso", (0, -0.72, -0.92))
    for sign in (-1, 1):
        arm = "LeftArm" if sign < 0 else "RightArm"
        hero.add("GovernorRedSleeve" + str(sign), arm, (0, -0.44, -0.02), (0.86, 1.06, 0.94), "#C7322B", mat="Fabric")
        hero.add("GovernorSleeveGold" + str(sign), arm, (0, -0.82, -0.52), (0.74, 0.10, 0.06), GOLD, mat="Metal")
        hero.add("GovernorBlueSleeveSide" + str(sign), arm, (0, -0.44, 0.28), (0.82, 1.12, 0.48), BLUE_BLACK, mat="Fabric")
        hero.add("GovernorRedForearmFace" + str(sign), arm, (0, -1.02, -0.50), (0.76, 0.40, 0.08), "#9F2E2E", mat="Metal")
        leg = "LeftLeg" if sign < 0 else "RightLeg"
        hero.add("PatternedSkirtPanel" + str(sign), leg, (0, -0.48, -0.76), (0.72, 1.28, 0.09), "#B6322A", mat="Fabric")
        wave_trim(hero, "SkirtCloud" + str(sign), leg, -0.22, -0.40, -0.84, "#E8C978", count=3, sign=1)
    hero.add("BatonShaft", "RightArm", (0.02, -1.00, -0.72), (0.10, 2.15, 0.10), DARK, "cylinder", rot=(0, 0, -24), mat="Metal")
    hero.add("BatonTip", "RightArm", (-0.43, -0.03, -0.72), (0.22, 0.34, 0.22), GOLD, "sphere", mat="Metal")
    for sign in (-1, 1):
        hero.add("BatonCrescent" + str(sign), "RightArm", (-0.54 + sign * 0.16, 0.18, -0.72), (0.14, 0.46, 0.18), GOLD, "wedge", rot=(0, -sign * 90, sign * 22), mat="Metal")
    tassel(hero, "BatonTassel", "RightArm", (-0.48, -0.22, -0.72), "#C7322B")
    floating_card(hero, "SuitCardSpade", "LeftArm", (-0.1, -1.05, -0.84), (0, 0, 10), DARK)
    hero.add("SuitCardSpadeIcon", "LeftArm", (-0.1, -1.05, -0.89), (0.16, 0.20, 0.025), GOLD, "sphere", rot=(0, 0, 45), mat="Metal")
    floating_card(hero, "SuitCardHeart", "Torso", (0.98, 0.22, -0.96), (0, -14, 16), "#C7322B")
    hero.add("SuitCardHeartIcon", "Torso", (0.98, 0.22, -1.01), (0.16, 0.16, 0.025), GOLD, "sphere", mat="Metal")
    floating_card(hero, "SuitCardClub", "Torso", (-0.94, 0.0, -0.96), (0, 14, -18), DARK)
    hero.add("SuitCardClubIcon", "Torso", (-0.94, 0.0, -1.01), (0.16, 0.18, 0.025), GOLD, "sphere", mat="Metal")
    floating_card(hero, "SuitCardDiamond", "Torso", (0.62, -0.76, -0.98), (0, -10, 10), "#C7322B")
    hero.add("SuitCardDiamondIcon", "Torso", (0.62, -0.76, -1.03), (0.15, 0.15, 0.025), GOLD, rot=(0, 0, 45), mat="Metal")
    hero.pose(Torso=(0, -18, 0), RightArm=(-54, 0, 36), LeftArm=(14, 0, -34), LeftLeg=(-5, 0, -5), RightLeg=(8, 0, 6), Head=(0, -13, 0))
    return hero.done()


def da_qiao(meta, base):
    hero = Hero(meta, base, cloth="#D14A61", armor="#F7C6D0", gold="#D9B56B", hair="#17151A")
    hero.robe("#D14A61", sleeves=True).bun("#17151A", height=0.32)
    hero.remove("WideSleeve", "LeftCuff", "RightCuff", "LeftGreave", "RightGreave", "LeftKnee", "RightKnee")
    hero.add("LadyHairCrown", "Head", (0, 1.58, 0.10), (0.92, 0.16, 0.72), hero.gold, mat="Metal")
    hero.add("LadyHairCoilL", "Head", (-0.34, 1.32, 0.16), (0.42, 0.36, 0.42), "#17151A", "sphere", mat="Fabric")
    hero.add("LadyHairCoilR", "Head", (0.34, 1.32, 0.16), (0.42, 0.36, 0.42), "#17151A", "sphere", mat="Fabric")
    hero.add("FlowerHairpin", "Head", (0.46, 1.36, -0.34), (0.24, 0.24, 0.10), "#F7C6D0", "sphere", mat="Metal")
    for index, (dx, dy) in enumerate(((0.34, 1.40), (0.56, 1.39), (0.45, 1.52), (0.45, 1.27))):
        hero.add("HairpinPetal" + str(index), "Head", (dx, dy, -0.39), (0.20, 0.10, 0.06), "#F7C6D0", rot=(0, 0, index * 45), mat="Metal")
    hero.add("HairRibbonL", "Head", (-0.52, 0.98, 0.44), (0.16, 0.92, 0.08), "#B6322A", rot=(0, 0, -18), mat="Fabric")
    hero.add("HairRibbonR", "Head", (0.52, 0.98, 0.44), (0.16, 0.92, 0.08), "#B6322A", rot=(0, 0, 18), mat="Fabric")
    for sign in (-1, 1):
        arm = "LeftArm" if sign < 0 else "RightArm"
        hero.add("LongHairFall" + str(sign), "Head", (sign * 0.42, 0.32, 0.54), (0.22, 1.24, 0.20), "#17151A", mat="Fabric")
        hero.add("SweptFrontLock" + str(sign), "Head", (sign * 0.24, 1.02, -0.62), (0.44, 0.22, 0.16), "#211A21", rot=(0, 0, sign * 18), mat="Fabric")
        hero.add("LadySleeve" + str(sign), arm, (0, -0.54, -0.02), (0.72, 1.16, 0.74), "#D14A61", mat="Fabric")
        hero.add("WhiteInnerSleeve" + str(sign), arm, (sign * 0.12, -0.98, -0.16), (0.62, 1.04, 0.36), WHITE, rot=(0, 0, sign * 6), mat="Fabric")
        hero.add("SleeveGoldEdge" + str(sign), arm, (sign * 0.16, -1.48, -0.18), (0.74, 0.10, 0.38), hero.gold, rot=(0, 0, sign * 6), mat="Metal")
        flower_mark(hero, "SleeveBlossom" + str(sign), arm, (sign * 0.12, -0.76, -0.50), 0.20, "#F7C6D0", "#D9B56B")
        hero.add("SkirtPanel" + str(sign), "LeftLeg" if sign < 0 else "RightLeg", (sign * 0.12, -0.70, -0.76), (0.72, 1.34, 0.12), "#8E2F3F", rot=(0, 0, sign * 5), mat="Fabric")
        hero.add("SkirtGoldBorder" + str(sign), "LeftLeg" if sign < 0 else "RightLeg", (sign * 0.20, -0.70, -0.84), (0.08, 1.20, 0.08), hero.gold, rot=(0, 0, sign * 5), mat="Metal")
        hero.add("BackRoseSkirt" + str(sign), "LeftLeg" if sign < 0 else "RightLeg", (sign * 0.10, -0.62, 0.62), (0.98, 1.44, 0.10), "#B6324F", rot=(-6, 0, sign * 8), mat="Fabric")
        hero.add("BackSkirtGoldHem" + str(sign), "LeftLeg" if sign < 0 else "RightLeg", (sign * 0.16, -1.26, 0.69), (0.96, 0.08, 0.05), hero.gold, rot=(-6, 0, sign * 8), mat="Metal")
        hero.add("SideFanSkirt" + str(sign), "LeftLeg" if sign < 0 else "RightLeg", (sign * 0.48, -0.62, 0.10), (0.12, 1.38, 1.12), "#C63C58", rot=(0, 0, sign * 10), mat="Fabric")
        hero.add("WhiteSashTail" + str(sign), "Torso", (sign * 0.56, -0.42, -0.80), (0.18, 1.42, 0.08), WHITE, rot=(0, 0, sign * 20), mat="Fabric")
        hero.add("SheerSashWide" + str(sign), "Torso", (sign * 0.74, -0.66, -0.58), (0.26, 1.74, 0.055), "#F4E8DF", rot=(-8, 0, sign * 28), mat="Fabric")
        hero.add("RoseRibbonTail" + str(sign), "Torso", (sign * 0.70, -0.62, -0.76), (0.12, 1.20, 0.07), "#B6322A", rot=(0, 0, sign * 28), mat="Fabric")
    hero.add("PearlWaist", "Torso", (0, -0.52, -0.84), (1.42, 0.14, 0.10), WHITE, mat="Fabric")
    hero.add("FlowerBeltMedal", "Torso", (0, -0.58, -0.92), (0.32, 0.32, 0.10), hero.gold, "sphere", mat="Metal")
    umbrella_center = (-0.32, 0.36, -0.86)
    hero.add("UmbrellaHandleLower", "LeftArm", (-0.02, -1.05, -0.78), (0.10, 1.82, 0.10), WOOD, "cylinder", rot=(0, 0, -7), mat="Metal")
    hero.add("UmbrellaHandleUpper", "LeftArm", (-0.18, -0.10, -0.82), (0.08, 1.18, 0.08), WOOD, "cylinder", rot=(0, 0, -7), mat="Metal")
    hero.add("UmbrellaGrip", "LeftArm", (0.02, -1.56, -0.76), (0.28, 0.28, 0.18), hero.gold, mat="Metal")
    hero.add("LeftHandOnUmbrella", "LeftArm", (0.01, -1.40, -0.86), (0.36, 0.34, 0.22), SKIN)
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
        if index % 2 == 0:
            hero.add("UmbrellaBlossom" + str(index), "LeftArm", (px * 0.96 + umbrella_center[0] * 0.04, py * 0.96 + umbrella_center[1] * 0.04, umbrella_center[2] - 0.13), (0.20, 0.20, 0.04), "#F7C6D0", "sphere", mat="Fabric")
            flower_mark(hero, "UmbrellaFlower" + str(index), "LeftArm", (px * 0.90 + umbrella_center[0] * 0.10, py * 0.90 + umbrella_center[1] * 0.10, umbrella_center[2] - 0.16), 0.17, "#F6C4D0", "#D9B56B")
    hero.add("UmbrellaRimTop", "LeftArm", (umbrella_center[0], umbrella_center[1] + 1.02, umbrella_center[2] - 0.08), (1.12, 0.10, 0.10), hero.gold, mat="Metal")
    hero.add("UmbrellaRimBottom", "LeftArm", (umbrella_center[0], umbrella_center[1] - 1.02, umbrella_center[2] - 0.08), (1.12, 0.10, 0.10), hero.gold, mat="Metal")
    hero.add("UmbrellaRimLeft", "LeftArm", (umbrella_center[0] - 1.02, umbrella_center[1], umbrella_center[2] - 0.08), (0.10, 1.12, 0.10), hero.gold, mat="Metal")
    hero.add("UmbrellaRimRight", "LeftArm", (umbrella_center[0] + 1.02, umbrella_center[1], umbrella_center[2] - 0.08), (0.10, 1.12, 0.10), hero.gold, mat="Metal")
    for sign in (-1, 1):
        hero.add("UmbrellaOuterArc" + str(sign), "LeftArm", (umbrella_center[0] + sign * 0.70, umbrella_center[1] + 0.70, umbrella_center[2] - 0.12), (0.95, 0.08, 0.08), hero.gold, rot=(0, 0, sign * 28), mat="Metal")
        tassel(hero, "UmbrellaHandleTassel" + str(sign), "LeftArm", (sign * 0.10, -1.78, -0.78), "#B6322A")
    hero.card("CharmCard", "RightArm", (0.0, -1.12, -0.82), "#D14A61", (0, 0, 12))
    flower_mark(hero, "CharmCardFlower", "RightArm", (0.0, -1.12, -0.87), 0.16, "#F7C6D0", "#D9B56B")
    hero.pose(Torso=(0, 24, 3), LeftArm=(-30, 0, -54), RightArm=(22, 0, 42), LeftLeg=(13, 0, -13), RightLeg=(-9, 0, 14), Head=(0, 18, 0))
    return hero.done()


def lu_xun(meta, base):
    hero = Hero(meta, base, cloth=PAPER, armor="#B91C1C", gold="#D6A84F", hair="#20232B")
    hero.robe(PAPER, sleeves=True)
    hero.remove("HairTop")
    hero.add("ScholarHatTop", "Head", (0, 1.28, -0.04), (1.38, 0.28, 1.02), "#334155", mat="Fabric")
    hero.add("ScholarHatFront", "Head", (0, 1.16, -0.62), (1.18, 0.28, 0.16), "#334155", mat="Fabric")
    hero.add("TallHatBackPlate", "Head", (0, 1.54, 0.16), (1.20, 0.54, 0.80), "#1F2937", mat="Fabric")
    hero.add("RedHatTopFold", "Head", (0, 1.78, 0.05), (1.38, 0.16, 0.92), "#B91C1C", mat="Fabric")
    beast_medal(hero, "HatBeastEmblem", "Head", (0, 1.28, -0.70), "#D6A84F")
    hero.add("HatRibbonL", "Head", (-0.48, 1.08, 0.58), (0.12, 0.90, 0.08), "#B91C1C", rot=(0, 0, -16), mat="Fabric")
    hero.add("HatRibbonR", "Head", (0.48, 1.08, 0.58), (0.12, 0.90, 0.08), "#B91C1C", rot=(0, 0, 16), mat="Fabric")
    hero.add("RedInnerRobe", "Torso", (0, 0.02, -0.77), (1.10, 1.46, 0.08), "#8E2F3F", mat="Fabric")
    hero.add("LuXunChestArmor", "Torso", (0, 0.10, -0.84), (1.02, 1.10, 0.08), "#111827", mat="Metal")
    armor_tiles(hero, "LuXunChest", "Torso", (-0.24, 0.0, 0.24), (0.38, 0.14, -0.10, -0.34), -0.90, "#B91C1C", "#D6A84F", tile=(0.16, 0.15, 0.035))
    beast_medal(hero, "LuXunBeltBeast", "Torso", (0, -0.78, -0.92), "#D6A84F")
    for sign in (-1, 1):
        arm = "LeftArm" if sign < 0 else "RightArm"
        hero.add("RedSleeveLining" + str(sign), arm, (0, -0.70, -0.48), (0.86, 0.88, 0.08), "#B91C1C", mat="Fabric")
        wave_trim(hero, "LuXunSleeveCloud" + str(sign), arm, -0.24, -0.74, -0.56, "#D6A84F", count=3, sign=1)
        leg = "LeftLeg" if sign < 0 else "RightLeg"
        hero.add("LuXunRedBackPanel" + str(sign), leg, (0, -0.58, 0.58), (0.82, 1.42, 0.09), "#7F1D1D", mat="Fabric")
    hero.add("BookRollA", "Torso", (0.64, -0.22, -0.78), (0.18, 0.86, 0.18), "#C39152", "cylinder", rot=(0, 0, 0), mat="Fabric")
    hero.add("BookRollB", "Torso", (0.82, -0.22, -0.78), (0.18, 0.86, 0.18), "#C39152", "cylinder", rot=(0, 0, 0), mat="Fabric")
    hero.add("BookRollC", "Torso", (1.00, -0.22, -0.78), (0.18, 0.86, 0.18), "#B98146", "cylinder", rot=(0, 0, 0), mat="Fabric")
    hero.add("BookSideStrap", "Torso", (0.82, -0.22, -0.95), (0.08, 0.96, 0.05), "#3B2A1A", mat="Fabric")
    hero.add("BookCord", "Torso", (0.73, -0.22, -0.92), (0.48, 0.08, 0.08), hero.gold, mat="Metal")
    hero.card("NewDrawCard", "LeftArm", (0.02, -1.08, -0.82), "#E7D9B6", (0, 0, -8))
    floating_card(hero, "SleeveGlowCard", "Torso", (-0.86, -0.42, -0.94), (0, 10, -16), "#B91C1C")
    floating_card(hero, "TacticCardA", "Torso", (0.22, -1.08, -0.98), (0, -6, 6), "#B91C1C")
    floating_card(hero, "TacticCardB", "Torso", (0.78, -0.78, -0.98), (0, -14, 12), "#B91C1C")
    hero.add("QuietPalm", "RightArm", (0.0, -1.30, -0.72), (0.40, 0.28, 0.18), SKIN)
    hero.pose(Torso=(0, 12, 0), RightArm=(10, 0, 34), LeftArm=(-18, 0, -20), LeftLeg=(-9, 0, -7), RightLeg=(4, 0, 8), Head=(0, 10, 0))
    return hero.done()


def sun_shangxiang(meta, base):
    hero = Hero(meta, base, cloth="#C92A3A", armor="#2B6C7A", gold="#F0B35A", hair="#18151C")
    # Replace inherited heavy infantry armour with a red, gold and jade archer outfit.
    hero.remove("HairBack", "HairSide", "HairTop", "LeftShoulder", "RightShoulder", "Breastplate", "Chest",
                "Back", "Waist", "Belt", "LeftBracer", "RightBracer", "LeftCuff", "RightCuff",
                "LeftSkirt", "RightSkirt", "LeftSideSkirt", "RightSideSkirt", "LeftGreave", "RightGreave", "LeftKnee", "RightKnee")
    red, shade, teal, gold, hair = "#B92D40", "#6E2437", "#256A6C", "#DDA75B", "#242029"
    for bone in hero.model['bones']:
        if bone['name'].endswith('Arm'): bone['color'] = SKIN
        if bone['name'].endswith('Leg'): bone['color'] = "#25232B"
    def flower(name, bone, center, radius):
        x, y, z = center
        for i in range(5):
            angle = i * 72
            rad = math.radians(angle)
            hero.add(name + "Petal" + str(i), bone, (x + math.sin(rad)*radius*.52, y + math.cos(rad)*radius*.52, z),
                     (radius*.55, radius*.92, .075), gold, rot=(0, 0, -angle), mat="Metal")
        hero.add(name + "Jewel", bone, (x, y, z-.06), (radius*.55, radius*.55, .09), red, "sphere", mat="Metal")
    hero.add("ArcherVest", "Torso", (0, .05, -.59), (1.94, 1.67, .15), red, mat="Fabric")
    hero.add("ArcherBackVest", "Torso", (0, .05, .56), (1.94, 1.67, .14), shade, mat="Fabric")
    hero.add("JadeCrossLapel", "Torso", (-.18, .25, -.72), (.36, 1.22, .10), teal, rot=(0, 0, -33), mat="Fabric")
    hero.add("GoldLapelEdge", "Torso", (-.36, .25, -.78), (.065, 1.25, .055), gold, rot=(0, 0, -33), mat="Metal")
    hero.add("RedCrossLapel", "Torso", (.20, .25, -.79), (.32, 1.22, .10), "#D44249", rot=(0, 0, 31), mat="Fabric")
    hero.add("RedLapelEdge", "Torso", (.35, .25, -.85), (.055, 1.20, .04), gold, rot=(0, 0, 31), mat="Metal")
    hero.add("TealWaistWrap", "Torso", (0, -.70, 0), (2.10, .38, 1.27), teal, mat="Fabric")
    for y in [-.57, -.82]:
        hero.add("WaistPiping"+str(y), "Torso", (0, y, -.67), (2.08, .035, .045), gold, mat="Metal")
    flower("WaistFlower", "Torso", (-.24, -.70, -.78), .25)
    for sign in [-1, 1]:
        hero.add("WaistBowLoop"+str(sign), "Torso", (-.24+sign*.30, -.74, -.72), (.43, .22, .12), teal, rot=(0,0,sign*23), mat="Fabric")
        hero.add("RibbonJadeTail"+str(sign), "Torso", (sign*.49, -1.36, -.82), (.30, 1.14, .10), teal, rot=(-8,0,sign*21), mat="Fabric")
    # A swept hairline and connected ponytail retain the block silhouette at game scale.
    hero.add("ArcherHairCap", "Head", (0, 1.29, .04), (1.48, .30, 1.29), hair)
    hero.add("ArcherHairCrown", "Head", (-.12, 1.48, .18), (1.17, .20, .98), "#302832", rot=(0,0,-7))
    hero.add("ArcherHairBack", "Head", (0, .79, .60), (1.46, 1.04, .24), "#201D25")
    hero.add("ArcherFringeLeft", "Head", (-.31, 1.19, -.64), (.79, .29, .18), hair, rot=(0,0,-17))
    hero.add("ArcherFringeRight", "Head", (.38, 1.27, -.64), (.61, .23, .18), "#302832", rot=(0,0,13))
    hero.add("ArcherFringeSweep", "Head", (-.49, 1.06, -.70), (.32, .39, .13), "#352C35", rot=(0,0,-25))
    for sign in [-1,1]:
        hero.add("ArcherHairSide"+str(sign), "Head", (sign*.69, .94, .04), (.20,.78,1.15), hair)
        hero.add("ArcherTempleLock"+str(sign), "Head", (sign*.67, .66, -.59), (.18,.85,.22), "#302832", rot=(0,0,sign*12))
    hero.add("HighPonyBase", "Head", (-.06,1.60,.61), (.61,.40,.61), hair)
    hero.add("HighPonyTailA", "Head", (-.35,1.42,1.00), (.59,.74,.50), "#302832", rot=(-24,0,-32))
    hero.add("HighPonyTailB", "Head", (-.83,.94,1.22), (.48,.89,.38), hair, rot=(-12,0,-26))
    hero.add("HighPonyTailC", "Head", (-1.16,.36,1.27), (.33,.78,.28), "#201D25", rot=(8,0,-20))
    hero.add("HighPonyTailFacet", "Head", (-.66,1.03,1.05), (.14,1.03,.08), "#44343C", rot=(-16,0,-25))
    hero.add("RedPonyRibbon", "Head", (-.06,1.60,.94), (.66,.18,.16), red, rot=(0,0,-8), mat="Fabric")
    for sign in [-1,1]:
        hero.add("PonyBowLoop"+str(sign), "Head", (-.06+sign*.33,1.63,.94), (.47,.25,.18), "#D44249", rot=(0,0,sign*25), mat="Fabric")
        hero.add("HairRibbonTail"+str(sign), "Head", (-.12+sign*.41,.82,1.47), (.17,1.54,.09), red, rot=(-12,0,sign*15), mat="Fabric")
    flower("HairFlower", "Head", (.57,1.37,-.74), .27)
    # Cuffs cover the real block arms; decoration inside the rig would be invisible.
    for sign in [-1,1]:
        arm = "LeftArm" if sign < 0 else "RightArm"
        leg = "LeftLeg" if sign < 0 else "RightLeg"
        hero.add("RedShoulderSleeve"+str(sign),arm,(0,.17,0),(.97,.53,1.05),red,mat="Fabric")
        hero.add("ShoulderGoldEdge"+str(sign),arm,(0,-.04,-.01),(1.00,.065,1.07),gold,mat="Metal")
        hero.add("ArcherBracer"+str(sign),arm,(0,-.88,-.015),(.96,.75,1.04),shade,mat="Fabric")
        for y in [-.54,-1.22]:
            hero.add("BracerRim"+str(sign)+str(y),arm,(0,y,-.015),(.99,.075,1.07),gold,mat="Metal")
        hero.add("BracerFace"+str(sign),arm,(0,-.88,-.56),(.71,.55,.08),red,mat="Metal")
        flower("BracerFlower"+str(sign),arm,(0,-.86,-.63),.16)
        hero.add("ArcherSkirtRim"+str(sign),leg,(0,-.34,-.66),(.94,.95,.15),gold,rot=(0,0,sign*6),mat="Metal")
        hero.add("ArcherSkirt"+str(sign),leg,(0,-.34,-.75),(.82,.83,.08),red,rot=(0,0,sign*6),mat="Fabric")
        for row in range(2):
            for x in [-.24,.24]:
                hero.add("SkirtStud"+str(sign)+str(row)+str(x),leg,(x,-.10-row*.29,-.81),(.065,.065,.035),gold,rot=(0,0,45),mat="Metal")
        hero.add("ArcherSideSkirt"+str(sign),leg,(sign*.48,-.31,.05),(.13,.95,1.13),shade,rot=(0,0,sign*8),mat="Fabric")
        hero.add("ArcherBackSkirt"+str(sign),leg,(0,-.32,.58),(.88,.91,.13),red,mat="Fabric")
        hero.add("ArcherBackHem"+str(sign),leg,(0,-.75,.67),(.88,.07,.05),gold,mat="Metal")
        hero.add("ShinGuardRim"+str(sign),leg,(0,-1.21,-.54),(.87,.78,.13),gold,mat="Metal")
        hero.add("ShinGuard"+str(sign),leg,(0,-1.21,-.62),(.75,.64,.075),shade,mat="Metal")
        hero.add("ShinGuardInlay"+str(sign),leg,(0,-1.20,-.67),(.20,.25,.04),red,rot=(0,0,45),mat="Metal")
    hero.add("ArcherShoulderPlate", "LeftArm", (0,.38,-.04), (1.10,.20,1.18), gold, rot=(0,0,7), mat="Metal")
    hero.add("ArcherShoulderInset", "LeftArm", (0,.49,-.04), (.88,.06,.96), shade, rot=(0,0,7), mat="Metal")
    # The back gets an offset quiver, leaving the ponytail clear on the opposite side.
    hero.add("QuiverBody", "Torso", (.76,.20,.85), (.46,1.40,.40), shade, rot=(0,0,-10), mat="Fabric")
    for y in [-.44,.78]:
        hero.add("QuiverRim"+str(y),"Torso",(.76,y,.86),(.51,.10,.45),gold,rot=(0,0,-10),mat="Metal")
    for i in range(3):
        x=.63+i*.16
        hero.add("QuiverArrow"+str(i),"Torso",(x,1.01+i*.09,.87),(.045,.91,.045),"#C9AB7C","cylinder")
        hero.add("QuiverFeather"+str(i),"Torso",(x,1.40+i*.09,.87),(.14,.29,.06),red,rot=(0,0,-12),mat="Fabric")
    hero.add("BowGrip", "LeftArm", (0.0, -0.98, -0.98), (0.34, 0.38, 0.22), hero.gold, mat="Metal")
    hero.add("BowBackbone", "LeftArm", (0.0, -0.98, -1.03), (0.12, 2.72, 0.12), WOOD, "cylinder", mat="Metal")
    hero.add("BowUpperCurve", "LeftArm", (0.22, -0.08, -1.03), (0.12, 1.12, 0.12), WOOD, "cylinder", rot=(0, 0, -14), mat="Metal")
    hero.add("BowLowerCurve", "LeftArm", (-0.22, -1.88, -1.03), (0.12, 1.12, 0.12), WOOD, "cylinder", rot=(0, 0, 14), mat="Metal")
    hero.add("BowUpperBlackCurve", "LeftArm", (0.34, 0.10, -1.05), (0.14, 1.26, 0.14), "#2A1A16", "cylinder", rot=(0, 0, -18), mat="Metal")
    hero.add("BowLowerBlackCurve", "LeftArm", (-0.34, -2.06, -1.05), (0.14, 1.26, 0.14), "#2A1A16", "cylinder", rot=(0, 0, 18), mat="Metal")
    hero.add("BowTopCap", "LeftArm", (0.34, 0.48, -1.03), (0.24, 0.24, 0.16), hero.gold, mat="Metal")
    hero.add("BowBottomCap", "LeftArm", (-0.34, -2.44, -1.03), (0.24, 0.24, 0.16), hero.gold, mat="Metal")
    hero.add("BowTopBlade", "LeftArm", (0.48, 0.72, -1.02), (0.22, 0.38, 0.14), hero.gold, "wedge", rot=(0, 0, -14), mat="Metal")
    hero.add("BowBottomBlade", "LeftArm", (-0.48, -2.68, -1.02), (0.22, 0.38, 0.14), hero.gold, "wedge", rot=(180, 0, 14), mat="Metal")
    hero.add("BowTopCrescentOuter", "LeftArm", (0.58, 0.64, -1.04), (0.18, 0.52, 0.16), hero.gold, "wedge", rot=(0, -90, -18), mat="Metal")
    hero.add("BowBottomCrescentOuter", "LeftArm", (-0.58, -2.60, -1.04), (0.18, 0.52, 0.16), hero.gold, "wedge", rot=(180, 90, 18), mat="Metal")
    for y in (-0.02, -1.94):
        hero.add("BowRedWrap" + str(y), "LeftArm", (0.0 if y < -1 else 0.25, y, -1.12), (0.34, 0.14, 0.07), red, mat="Fabric")
    wave_trim(hero, "BowGoldScrollUpper", "LeftArm", (0.12), 0.20, -1.13, gold, count=3, sign=1)
    wave_trim(hero, "BowGoldScrollLower", "LeftArm", (-0.48), -2.18, -1.13, gold, count=3, sign=1)
    hero.add("BowStringFull", "LeftArm", (0.0, -0.98, -1.25), (0.035, 2.86, 0.035), "#EAD7B7", "cylinder", mat="Fabric")
    hero.add("BowStringGripTie", "LeftArm", (0.0, -0.98, -1.12), (0.34, 0.035, 0.035), "#EAD7B7", "cylinder", rot=(0, 0, 90), mat="Fabric")
    hero.add("LeftHandOnBow", "LeftArm", (0.0, -1.02, -1.18), (0.36, 0.32, 0.20), SKIN)
    hero.add("RightHandDraw", "RightArm", (0.02, -1.18, -0.98), (0.34, 0.30, 0.18), SKIN)
    hero.add("ArrowShaft", "RightArm", (0.0, -1.12, -0.90), (0.06, 2.32, 0.06), "#EAD7B7", "cylinder", rot=(0, 0, 88), mat="Metal")
    hero.add("ArrowHead", "RightArm", (-1.14, -1.10, -0.90), (0.26, 0.42, 0.16), "#E7EDF2", "wedge", rot=(0, 0, 88), mat="Metal")
    hero.add("ArrowFletchA", "RightArm", (1.02, -1.16, -0.90), (0.24, 0.08, 0.06), red, rot=(0, 0, 88), mat="Fabric")
    hero.add("ArrowFletchB", "RightArm", (1.02, -1.05, -0.90), (0.24, 0.08, 0.06), teal, rot=(0, 0, 88), mat="Fabric")
    tassel(hero, "BowTassel", "LeftArm", (0.34, -0.12, -1.02), "#C92A3A")
    flower_mark(hero, "BowFlowerMedal", "LeftArm", (0.40, -0.30, -1.16), 0.17, gold, red)
    hero.add("BowBeadChain", "LeftArm", (0.48, -0.54, -1.16), (0.08, 0.52, 0.045), "#9F1E2B", mat="Fabric")
    hero.add("BowRoundCharm", "LeftArm", (0.48, -0.86, -1.16), (0.20, 0.20, 0.06), red, "sphere", mat="Metal")
    flower_mark(hero, "BowRoundCharmFlower", "LeftArm", (0.48, -0.86, -1.20), 0.10, gold, red)
    floating_card(hero, "EquipCharmA", "Torso", (-0.88, -0.82, 0.64), (0, 18, -14), "#C92A3A")
    floating_card(hero, "EquipCharmB", "Torso", (0.88, -0.72, 0.62), (0, -18, 14), "#2B6C7A")
    hero.pose(Torso=(-7, -26, -2), LeftArm=(-42, 0, -56), RightArm=(-42, 0, 58), LeftLeg=(-42, 0, -14), RightLeg=(20, 0, 14), Head=(0, -20, 0))
    return hero.done()
