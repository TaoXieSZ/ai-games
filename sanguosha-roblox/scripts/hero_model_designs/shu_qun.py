"""Individual silhouettes for the remaining Shu and Qun generals."""
import math
from .common import Hero


def feather_fan(h,mechanical=False):
    h.add('FanGrip','RightArm',(0,-1.30,-.72),(.16,.52,.16),h.gold,mat='Metal')
    for i in range(7):
        angle=(i-3)*13
        r=math.radians(angle)
        x=math.sin(r)*.60;y=-.89+math.cos(r)*.60
        color=('#E8E0C5' if i%2 else h.cloth) if mechanical else '#ECE7D8'
        h.add('FanLeaf'+str(i),'RightArm',(x,y,-.73),(.26,1.22,.08),color,rot=(0,0,-angle),mat='Fabric')
        h.add('FanRib'+str(i),'RightArm',(x,y-.09,-.79),(.045,1.08,.045),h.gold,rot=(0,0,-angle),mat='Metal')
        if not mechanical:
            h.add('FeatherTip'+str(i),'RightArm',(x+math.sin(r)*.54,y+math.cos(r)*.54,-.73),(.08,.30,.23),color,'wedge',rot=(0,90,-angle))
    h.grip()


def gear(h,name,bone,pos,r=.24):
    x,y,z=pos
    for i in range(8):
        a=2*math.pi*i/8
        h.add(name+'Rim'+str(i),bone,(x+math.sin(a)*r,y+math.cos(a)*r,z),(.085,r*.84,.07),h.gold,rot=(0,0,-i*45),mat='Metal')
        h.add(name+'Tooth'+str(i),bone,(x+math.sin(a)*r*1.3,y+math.cos(a)*r*1.3,z),(.10,.14,.09),h.gold,rot=(0,0,-i*45),mat='Metal')
    h.add(name+'Axle',bone,pos,(.12,.12,.12),h.gold,'sphere',mat='Metal')


def trim_band(h,prefix,bone,y,z,width=1.7,color=None):
    h.add(prefix+'Band','Torso' if bone=='Torso' else bone,(0,y,z),(width,.075,.055),color or h.gold,mat='Metal')
    for i,x in enumerate([-.62,-.31,0,.31,.62]):
        h.add(prefix+'Stud'+str(i),bone,(x,y,z-.035),(.09,.09,.04),color or h.gold,rot=(0,0,45),mat='Metal')


def hanging_tassel(h,prefix,bone,pos,color='#A33A2D',count=3,spread=.09):
    x,y,z=pos
    h.add(prefix+'Knot',bone,(x,y,z),(.18,.18,.18),h.gold,'sphere',mat='Metal')
    for i in range(count):
        h.add(prefix+'Cord'+str(i),bone,(x+(i-(count-1)/2)*spread,y-.29,z),(.055,.55,.055),color,rot=(0,0,(i-1)*7),mat='Fabric')
    h.add(prefix+'End',bone,(x,y-.61,z),(.20,.09,.20),'#F0E3C7',mat='Fabric')


def flower_cluster(h,prefix,bone,center,petal_color,gem_color=None):
    x,y,z=center
    gem_color=gem_color or h.gold
    for i in range(6):
        a=2*math.pi*i/6
        h.add(prefix+'Petal'+str(i),bone,(x+math.sin(a)*.13,y+math.cos(a)*.13,z),(.14,.14,.055),petal_color,'sphere')
    h.add(prefix+'Gem',bone,(x,y,z-.035),(.11,.11,.07),gem_color,'sphere',mat='Metal')


def liu_bei(meta,base):
    h=Hero(meta,base,cloth='#2E7555',armor='#285A40',gold='#C5A15B').robe('#F0E2C3').beard(length=.42).crown(.43)
    h.remove('RobeHem')
    h.add('GreenRoyalVest','Torso',(0,.05,-.73),(1.48,1.43,.10),h.cloth,mat='Fabric')
    h.add('SquareJadeCrownTop','Head',(0,1.72,-.05),(.55,.48,.46),'#2E7555',mat='Metal')
    h.add('CrownGoldFace','Head',(0,1.72,-.31),(.63,.52,.08),h.gold,mat='Metal')
    h.add('CrownJadeFace','Head',(0,1.74,-.36),(.37,.34,.04),'#246747',mat='Metal')
    h.add('CrownPin','Head',(0,1.56,.04),(1.28,.09,.09),h.gold,mat='Metal')
    for sign in [-1,1]:
        h.add('CrownPinTip'+str(sign),'Head',(sign*.72,1.56,.04),(.16,.16,.16),h.gold,'sphere',mat='Metal')
        h.add('DragonShoulder'+str(sign),'LeftArm' if sign<0 else 'RightArm',(0,.52,-.40),(.44,.30,.18),h.gold,'sphere',mat='Metal')
        h.add('DragonShoulderSnout'+str(sign),'LeftArm' if sign<0 else 'RightArm',(0,.47,-.59),(.26,.18,.10),h.gold,mat='Metal')
        h.add('DragonShoulderFang'+str(sign),'LeftArm' if sign<0 else 'RightArm',(0,.36,-.65),(.12,.18,.07),'#F0E3C7','wedge',rot=(0,0,180),mat='Metal')
        h.add('DragonShoulderBrow'+str(sign),'LeftArm' if sign<0 else 'RightArm',(0,.59,-.54),(.36,.06,.05),'#754822',mat='Metal')
        hanging_tassel(h,'ShoulderTassel'+str(sign),'LeftArm' if sign<0 else 'RightArm',(sign*.18,.22,-.48),'#A53428',3)
        h.add('WhiteSleevePanel'+str(sign),'LeftArm' if sign<0 else 'RightArm',(0,-.78,-.49),(.85,.96,.09),'#F2E8D0',mat='Fabric')
        h.add('GoldCuff'+str(sign),'LeftArm' if sign<0 else 'RightArm',(0,-1.17,-.50),(.96,.12,.10),h.gold,mat='Metal')
        h.add('RoyalSkirtPanel'+str(sign),'LeftLeg' if sign<0 else 'RightLeg',(0,-.61,-.91),(.79,1.32,.10),h.cloth,rot=(0,0,sign*4),mat='Fabric')
        h.add('RoyalSideBanner'+str(sign),'Torso',(sign*.93,-.25,-.78),(.18,1.32,.08),h.cloth,rot=(0,0,sign*9),mat='Fabric')
        trim_band(h,'RoyalSkirtTrim'+str(sign),'LeftLeg' if sign<0 else 'RightLeg',-1.20,-.98,.74)
    for side,sign in [('Left',-1),('Right',1)]:
        h.add('RoyalLapel'+side,'Torso',(sign*.28,.20,-.82),(.16,1.1,.07),'#EFE0BC',rot=(0,0,sign*29),mat='Fabric')
        h.add('SmallShoulder'+side,side+'Arm',(0,.36,0),(.98,.18,1.03),h.gold,mat='Metal')
        h.add('BackSwordSheath'+side,'Torso',(sign*.20,.0,.87),(.25,2.47,.21),h.cloth,rot=(0,0,sign*34),mat='Metal')
        h.add('BackSwordGrip'+side,'Torso',(-sign*.69,1.35,.87),(.18,.67,.20),'#222C27',rot=(0,0,sign*34))
        h.add('BackSwordGuard'+side,'Torso',(-sign*.49,1.04,.87),(.69,.12,.28),h.gold,rot=(0,0,sign*34),mat='Metal')
        h.card('GiftCard'+side,side+'Arm',(0,-1.42,-.84))
        h.add('BambooCardStem'+side,side+'Arm',(0,-1.44,-.90),(.035,.42,.025),'#4F8A48',rot=(0,0,-sign*8),mat='Fabric')
        for leaf in [-1,1]:
            h.add('BambooCardLeaf'+side+str(leaf),side+'Arm',(leaf*.07,-1.36,-.91),(.09,.20,.025),'#4F8A48',rot=(0,0,leaf*35),mat='Fabric')
    trim_band(h,'BeltDragon','Torso',-.70,-.86,1.62)
    h.add('BeltDragonMask','Torso',(0,-.70,-.93),(.43,.33,.11),h.gold,'sphere',mat='Metal')
    h.pose(RightArm=[-63,0,-10],LeftArm=[-56,0,12],Head=[3,0,0])
    return h.done()


def zhang_fei(meta,base):
    h=Hero(meta,base,cloth='#1E5037',armor='#193D2B',gold='#B38B49',skin='#C98953')
    h.remove('LeftBracer','RightBracer','Mouth')
    for b in h.model['bones']:
        if b['name'].endswith('Arm'):b['color']=h.skin
    h.bun(height=.53)
    for sign in [-1,1]:
        for i in range(4):
            h.add('WildBeard'+str(sign)+str(i),'Head',(sign*(.29+i*.13),.17+i*.16,-.72),(.23,.52,.26),h.hair,rot=(0,0,sign*(18+i*12)))
        h.add('Moustache'+str(sign),'Head',(sign*.28,.42,-.75),(.40,.17,.20),h.hair,rot=(0,0,sign*20))
    h.add('ShoutMouth','Head',(0,.32,-.64),(.42,.26,.06),'#3A1418')
    h.add('ShoutTeeth','Head',(0,.41,-.69),(.34,.06,.04),'#F1E6CF')
    h.add('RedHeadband','Head',(0,1.27,.04),(1.53,.15,1.31),'#96312B',mat='Fabric')
    h.add('HeadbandGoldPlate','Head',(0,1.28,-.64),(.38,.24,.09),h.gold,mat='Metal')
    h.add('HeadbandStar','Head',(0,1.33,-.70),(.26,.20,.06),h.gold,'wedge',rot=(0,0,180),mat='Metal')
    for sign in [-1,1]:
        for i in range(5):
            h.add('SpikedHairTuft'+str(sign)+str(i),'Head',(sign*(.35+i*.10),1.12+i*.04,.32+i*.06),(.14,.38,.20),h.hair,rot=(-26,0,sign*(16+i*7)))
        h.add('RedHeadbandTail'+str(sign),'Head',(sign*.45,1.24,.70),(.24,1.32,.08),'#A3332C',rot=(-26,0,sign*18),mat='Fabric')
    h.add('RedScarf','Torso',(0,.84,-.69),(1.89,.34,.27),'#9E3028',rot=(0,0,-9),mat='Fabric')
    for sign in [-1,1]:
        h.add('ScarfFlyingTail'+str(sign),'Torso',(sign*.80,.75,.62),(.27,1.55,.11),'#9E3028',rot=(-22,0,sign*33),mat='Fabric')
    h.cape('#80251F',1.32,1.75)
    h.add('StuddedBreastRows','Torso',(0,.10,-.79),(1.38,1.25,.10),'#203D2C',mat='Metal')
    for row in range(4):
        for col in range(5):
            h.add('ChestRivet'+str(row)+str(col),'Torso',((col-2)*.26,.58-row*.28,-.86),(.07,.07,.045),h.gold,'sphere',mat='Metal')
    for sign in [-1,1]:
        h.add('BareArmWrap'+str(sign),'LeftArm' if sign<0 else 'RightArm',(0,-.34,-.54),(.92,.16,.12),'#7C2423',mat='Fabric')
        h.add('StuddedWristWrap'+str(sign),'LeftArm' if sign<0 else 'RightArm',(0,-1.02,-.55),(.88,.24,.12),'#1B1918',mat='Fabric')
        for i in range(3):
            h.add('WristStud'+str(sign)+str(i),'LeftArm' if sign<0 else 'RightArm',((i-1)*.22,-1.02,-.63),(.075,.075,.04),h.gold,'sphere',mat='Metal')
    h.spear('SnakeSpear',length=5.3,color='#C4CCD0').remove('SnakeSpearPoint')
    for sign in [-1,1]:
        for i in range(4):
            x=sign*(.12+.09*math.sin(i*1.8));y=2.40+i*.30
            h.add('SerpentBlade'+str(sign)+str(i),'RightArm',(x,y,-.69),(.16,.44,.21),'#CDD5D8',rot=(0,0,sign*(-1)**i*22),mat='Metal')
        h.add('SerpentFang'+str(sign),'RightArm',(sign*.18,3.62,-.69),(.20,.47,.27),'#DDE3E3','wedge',rot=(0,-sign*90,0),mat='Metal')
    h.add('SerpentGoldVine','RightArm',(0,3.02,-.88),(.11,1.30,.06),h.gold,rot=(0,0,-17),mat='Metal')
    hanging_tassel(h,'SpearRedTassel','RightArm',(.25,1.90,-.69),'#A42D28',4)
    h.pose(RightArm=[-56,8,-22],LeftArm=[-35,-5,27],Torso=[-6,12,0]).scale(1.09,1.02,1.03)
    return h.done()


def zhuge_liang(meta,base):
    h=Hero(meta,base,cloth='#2B684C',armor='#EBE2CA',gold='#BAA16C').robe('#E8DFCA')
    h.remove('LeftGreave','RightGreave','LeftKnee','RightKnee','BeltDragon')
    h.add('GreenInnerRobe','Torso',(0,.03,-.73),(.66,1.59,.10),h.cloth,mat='Fabric')
    h.add('ScholarHat','Head',(0,1.53,.04),(1.44,.59,1.15),h.cloth,mat='Fabric')
    h.add('HatFrontFlap','Head',(0,1.55,-.65),(1.48,.64,.09),'#1E543E',mat='Fabric')
    h.add('HatYinYang','Head',(0,1.48,-.73),(.32,.32,.055),'#EFE8D7','sphere',mat='Metal')
    h.add('HatYinYangDark','Head',(-.07,1.51,-.77),(.16,.16,.03),'#1E2A24','sphere')
    h.add('HatTallBack','Head',(0,1.75,.10),(1.35,.55,.92),'#1E543E',mat='Fabric')
    for x in [-.56,-.28,0,.28,.56]:h.add('HatRib'+str(x),'Head',(x,1.54,-.57),(.065,.57,.07),h.gold,mat='Metal')
    h.add('HatBand','Head',(0,1.26,-.58),(1.47,.09,.08),h.gold,mat='Metal')
    for sign in [-1,1]:h.add('HatTail'+str(sign),'Head',(sign*.30,.55,.79),(.20,1.55,.08),h.cloth,rot=(-16,0,sign*12),mat='Fabric')
    feather_fan(h)
    h.add('FanJadeRoot','RightArm',(0,-.50,-.86),(.42,.32,.10),'#1E654B',mat='Metal')
    for i in range(9):
        h.add('FanFeatherLayer'+str(i),'RightArm',((i-4)*.15,-.10+abs(i-4)*.04,-.91),(.18,1.42,.055),'#F4F0E2',rot=(0,0,(i-4)*8),mat='Fabric')
    for i in range(7):
        h.add('TallWhiteFanPlume'+str(i),'RightArm',((i-3)*.20,.24+abs(i-3)*.04,-.96),(.22,1.80,.06),'#F4F0E2',rot=(0,0,(i-3)*11),mat='Fabric')
    for sign in [-1,1]:
        h.add('ShoulderScrollPlate'+str(sign),'LeftArm' if sign<0 else 'RightArm',(0,.49,-.43),(.82,.20,.62),h.gold,rot=(0,0,-sign*7),mat='Metal')
        h.add('GreenRobeStreamer'+str(sign),'Torso',(sign*.77,-.08,.13),(.17,1.82,.08),h.cloth,rot=(-5,0,sign*16),mat='Fabric')
        hanging_tassel(h,'WaistJadeTassel'+str(sign),'Torso',(sign*.33,-.75,-.88),'#216147',3)
    for i in range(5):h.card('StarCard'+str(i),'LeftArm',((i-2)*.19,-1.05+abs(i-2)*.08,-.86-i*.01),'#244B36',rot=(0,0,(i-2)*12))
    for i in range(5):
        h.add('StarCardLine'+str(i),'LeftArm',((i-2)*.19,-1.05+abs(i-2)*.08,-.92-i*.01),(.16,.025,.018),h.gold,rot=(0,0,(i-2)*12),mat='Metal')
    h.pose(RightArm=[-47,0,-17],LeftArm=[-68,0,20],Head=[0,-12,0])
    return h.done()


def ma_chao(meta,base):
    h=Hero(meta,base,cloth='#3A5540',armor='#AD8D52',gold='#DBC18A')
    h.add('CavalryHelm','Head',(0,1.22,.04),(1.50,.33,1.34),'#B59B67',mat='Metal')
    h.add('HelmRidge','Head',(0,1.40,0),(.28,.21,1.21),h.gold,mat='Metal')
    h.add('HelmDragonBrow','Head',(0,1.20,-.67),(.94,.22,.11),h.gold,mat='Metal')
    h.add('HelmNoseGuard','Head',(0,.92,-.69),(.17,.55,.10),h.gold,mat='Metal')
    for sign in [-1,1]:
        h.add('HelmCheek'+str(sign),'Head',(sign*.72,.68,.10),(.16,.81,1.12),h.armor,mat='Metal')
        for i in range(8):h.add('WhitePlume'+str(sign)+str(i),'Head',(sign*(.30+i*.17),1.55+i*.13-.008*i*i,.20+i*.10),(.25,.62,.32),'#EDE6D6',rot=(-23+i*2,0,-sign*(45-i*3)),mat='Fabric')
        for i in range(4):
            h.add('SweptPlumeFan'+str(sign)+str(i),'Head',(sign*(.54+i*.23),1.83+i*.07,.34+i*.10),(.32,.82,.12),'#F3ECDD',rot=(-18,0,-sign*(58-i*6)),mat='Fabric')
            h.add('PlumeFeatherTip'+str(sign)+str(i),'Head',(sign*(.72+i*.28),2.17+i*.05,.39+i*.11),(.20,.42,.16),'#FFF7E7','wedge',rot=(0,-sign*90,-sign*(12+i*4)),mat='Fabric')
        h.add('GoldWingFlare'+str(sign),'Head',(sign*.55,1.35,-.08),(.22,.55,.15),h.gold,'wedge',rot=(0,-sign*90,sign*20),mat='Metal')
        h.add('LayeredPauldron'+str(sign),'LeftArm' if sign<0 else 'RightArm',(0,.55,-.20),(.98,.21,.96),h.gold,rot=(0,0,-sign*9),mat='Metal')
        for row in range(3):
            h.add('PauldronPlate'+str(sign)+str(row),'LeftArm' if sign<0 else 'RightArm',(0,.42-row*.16,-.51),(.87-row*.09,.08,.12),'#3A3328',mat='Metal')
        h.add('LegGoldScroll'+str(sign),'LeftLeg' if sign<0 else 'RightLeg',(0,-.73,-.91),(.72,.20,.09),h.gold,mat='Metal')
    h.cape('#E9E1CF',1.54,1.96).spear('CavalryLance',length=4.25)
    h.add('CavalryLamellarChest','Torso',(0,.10,-.80),(1.46,1.36,.10),'#2E3429',mat='Metal')
    for row in range(5):
        for col in range(5):
            h.add('LamellarStud'+str(row)+str(col),'Torso',((col-2)*.25,.64-row*.25,-.87),(.055,.055,.035),h.gold,'sphere',mat='Metal')
    h.add('WhiteCapeSweep','Torso',(-.76,.46,.91),(.32,2.18,.10),'#F0E6D2',rot=(-13,0,-22),mat='Fabric')
    h.add('LanceDragonSocket','RightArm',(0,1.84,-.80),(.42,.38,.12),h.gold,'sphere',mat='Metal')
    h.add('LanceWideBlade','RightArm',(0,2.05,-.69),(.42,1.02,.15),'#D7DDE0',mat='Metal')
    for i in range(4):h.add('WhiteTassel'+str(i),'RightArm',(.18+i*.04,1.46,-.69),(.065,.71,.08),'#E8E0CC',rot=(0,0,12+i*6),mat='Fabric')
    hanging_tassel(h,'LanceWhiteTassel','RightArm',(.25,1.54,-.72),'#E8E0CC',5,.07)
    h.pose(RightArm=[-67,0,-18],LeftArm=[-12,0,16],Torso=[0,-15,0],Head=[0,12,0])
    return h.done()


def huang_yueying(meta,base):
    h=Hero(meta,base,cloth='#39694C',armor='#BC9B67',gold='#BE9956').robe('#426D50').bun(height=.43)
    h.remove('LeftGreave','RightGreave','LeftKnee','RightKnee','BeltDragon')
    h.add('WorkshopHeadband','Head',(0,1.21,-.54),(1.31,.16,.12),h.cloth,mat='Fabric')
    h.add('HeadbandGear','Head',(0,1.25,-.64),(.26,.23,.08),h.gold,rot=(0,0,45),mat='Metal')
    h.add('HeadbandSquareBuckle','Head',(-.42,1.24,-.63),(.31,.27,.07),h.gold,mat='Metal')
    h.add('LooseForelock','Head',(-.14,.78,-.62),(.24,.78,.16),h.hair,rot=(0,0,-10))
    for sign in [-1,1]:
        h.add('SideFringe'+str(sign),'Head',(sign*.54,.91,-.54),(.25,.68,.20),h.hair,rot=(0,0,sign*16))
        h.add('HeadbandRibbon'+str(sign),'Head',(sign*.60,1.15,.54),(.16,.88,.08),h.cloth,rot=(-16,0,sign*26),mat='Fabric')
        h.add('ApronBack'+str(sign),'LeftLeg' if sign<0 else 'RightLeg',(0,-.58,.53),(.92,1.35,.12),h.cloth,mat='Fabric')
    h.add('WorkApron','Torso',(0,-.07,-.77),(1.40,1.34,.09),'#CCB58C',mat='Fabric')
    for i in range(7):
        h.add('BackRaisedGearFan'+str(i),'Torso',((i-3)*.18,.80+abs(i-3)*.06,.70),(.17,1.38,.07),'#D8CCAA',rot=(-10,0,(i-3)*13),mat='Metal')
    gear(h,'BackShoulderGear','Torso',(0,.70,.62),.24)
    h.add('ApronBlueprint','Torso',(0,-.11,-.84),(1.02,.78,.045),'#D8CCAA',mat='Fabric')
    h.add('BlueprintFanArc','Torso',(0,-.08,-.88),(.62,.035,.018),h.gold,rot=(0,0,20),mat='Metal')
    for i in range(4):
        h.add('BlueprintGearDot'+str(i),'Torso',((i-1.5)*.19,-.25,-.88),(.06,.06,.018),h.gold,'sphere',mat='Metal')
    for sign in [-1,1]:
        h.add('ApronSplit'+str(sign),'LeftLeg' if sign<0 else 'RightLeg',(0,-.39,-.90),(.70,1.09,.08),'#CCB58C',mat='Fabric')
        h.add('ApronStrap'+str(sign),'Torso',(sign*.49,.42,-.84),(.13,.80,.06),h.gold,mat='Fabric')
    h.add('ToolPouch','Torso',(-1.12,-.72,.12),(.39,.73,.72),'#705239')
    for i in range(3):h.add('ToolRoll'+str(i),'Torso',(-1.14,-.22,-.1+i*.23),(.13,.73,.13),'#E5D8B6','cylinder')
    h.add('WrenchHandle','Torso',(.96,-.84,-.64),(.09,.66,.11),h.gold,rot=(0,0,-18),mat='Metal')
    for sign in [-1,1]:h.add('WrenchJaw'+str(sign),'Torso',(.93+sign*.10,-.44,-.64),(.085,.25,.13),h.gold,mat='Metal')
    feather_fan(h,True);gear(h,'FanGear','RightArm',(0,-.83,-.85));gear(h,'BeltGear','Torso',(0,-.85,-.88),.16)
    for i in range(6):
        h.add('MechanicalFanBrace'+str(i),'RightArm',((i-2.5)*.18,-.45+abs(i-2.5)*.05,-.93),(.075,1.55,.055),h.gold,rot=(0,0,(i-2.5)*10),mat='Metal')
    h.add('WristBlueprint','LeftArm',(0,-1.25,-.85),(.56,.54,.045),'#E7D8AE',rot=(0,0,-9),mat='Fabric')
    h.add('ExtendedBlueprintScroll','LeftArm',(.10,-1.46,-.92),(.75,.36,.045),'#EADCB6',rot=(0,0,-14),mat='Fabric')
    h.add('BlueprintScrollKnobL','LeftArm',(-.30,-1.46,-.92),(.08,.45,.08),h.gold,'cylinder',mat='Metal')
    h.add('BlueprintScrollKnobR','LeftArm',(.50,-1.46,-.92),(.08,.45,.08),h.gold,'cylinder',mat='Metal')
    for sign in [-1,1]:
        h.add('WaistTube'+str(sign),'Torso',(sign*.88,-.52,.32),(.16,.72,.16),'#E9DDC6','cylinder',mat='Fabric')
    h.card('MechanismScroll','LeftArm',(0,-1.38,-.86),'#DACCAB')
    h.pose(RightArm=[-38,0,-26],LeftArm=[-50,0,14],Head=[2,9,0])
    return h.done()


def hua_tuo(meta,base):
    h=Hero(meta,base,cloth='#E5DFCE',armor='#E5DFCE',gold='#749672',hair='#B7B8B1').robe('#E5DFCE').beard('#B9BAB2',length=.91,width=.49).bun('#B7B8B1')
    h.remove('LeftGreave','RightGreave','LeftKnee','RightKnee','BeltDragon')
    h.add('GreenHeadband','Head',(0,1.22,-.40),(1.34,.15,.18),'#387B50',mat='Fabric')
    h.add('HeadbandPin','Head',(0,1.27,.05),(1.04,.07,.07),'#B98E4F',mat='Metal')
    for sign in [-1,1]:
        h.add('HeadbandTail'+str(sign),'Head',(sign*.45,1.10,.68),(.18,1.15,.08),'#387B50',rot=(-18,0,sign*16),mat='Fabric')
        h.add('WhiteSideHair'+str(sign),'Head',(sign*.50,.66,-.48),(.18,.92,.18),'#C9CAC3',rot=(0,0,sign*10))
    h.add('GreenSash','Torso',(0,-.78,-.79),(2.0,.25,.10),'#387B50',mat='Fabric')
    h.add('KnottedSash','Torso',(0,-.76,-.90),(.40,.30,.10),'#2E7048','sphere',mat='Fabric')
    for sign in [-1,1]:
        h.add('SashTail'+str(sign),'Torso',(sign*.28,-1.02,-.88),(.15,.80,.07),'#387B50',rot=(0,0,sign*15),mat='Fabric')
        h.add('BambooRobePrint'+str(sign),'LeftLeg' if sign<0 else 'RightLeg',(0,-.65,-.92),(.08,.62,.035),'#477B57',rot=(0,0,sign*10),mat='Fabric')
        for leaf in [-1,1]:
            h.add('BambooLeaf'+str(sign)+str(leaf),'LeftLeg' if sign<0 else 'RightLeg',(leaf*.08,-.55,-.95),(.08,.23,.025),'#477B57',rot=(0,0,leaf*35),mat='Fabric')
    h.add('MedicineChest','Torso',(0,.26,1.04),(1.84,2.0,.70),'#6B4C34')
    h.add('ChestTopHerbs','Torso',(-.52,1.36,1.40),(.24,.50,.18),'#386F3F',rot=(0,0,-8),mat='Fabric')
    h.add('ChestScrollBundle','Torso',(.45,1.30,1.42),(.26,.54,.26),'#E6DCC3','cylinder',mat='Fabric')
    for row in range(3):
        for col in range(3):
            x=(col-1)*.56;y=.83-row*.57
            h.add('Drawer'+str(row)+str(col),'Torso',(x,y,1.42),(.48,.49,.08),'#997143')
            h.add('DrawerPull'+str(row)+str(col),'Torso',(x,y,1.49),(.14,.10,.06),'#D1B77C',mat='Metal')
    for sign in [-1,1]:h.add('MedicineStrap'+str(sign),'Torso',(sign*.72,.20,-.76),(.13,1.34,.09),'#916F45')
    h.add('GourdLower','Torso',(1.11,-.86,.18),(.40,.48,.40),'#B68139','sphere')
    h.add('GourdUpper','Torso',(1.11,-.53,.18),(.27,.30,.27),'#B68139','sphere')
    h.add('GourdCork','Torso',(1.11,-.32,.18),(.13,.17,.13),'#6B4C34','cylinder')
    h.add('GourdCord','Torso',(1.11,-.52,.11),(.07,.82,.07),'#2F6A45',rot=(0,0,8),mat='Fabric')
    h.add('BambooMedicineTube','Torso',(.54,-.52,-.82),(.19,.82,.19),'#A57438','cylinder',rot=(0,0,-12),mat='Metal')
    h.add('MedicineTubeCap','Torso',(.47,-.14,-.82),(.21,.08,.21),h.gold,'cylinder',rot=(0,0,-12),mat='Metal')
    h.add('MedicineBundle','RightArm',(0,-1.35,-.86),(.49,.28,.35),'#D8D0B7')
    for sign in [-1,1]:h.add('HerbLeaf'+str(sign),'RightArm',(sign*.10,-1.10,-.89),(.12,.30,.07),'#39784B',rot=(0,0,sign*30))
    for i in range(3):
        h.add('BundleClothFold'+str(i),'RightArm',((i-1)*.13,-1.36,-.92),(.045,.33,.025),'#BFB596',mat='Fabric')
    h.card('EmergencyCard','LeftArm',(0,-1.35,-.83),'#A53D38')
    h.add('EmergencyCardHerb','LeftArm',(0,-1.35,-.89),(.05,.30,.018),'#6C9B58',mat='Fabric')
    h.pose(RightArm=[-59,0,-10],LeftArm=[-43,0,20],Head=[7,0,0],Torso=[-3,0,0])
    return h.done()


def lu_bu(meta,base):
    h=Hero(meta,base,cloth='#492260',armor='#252133',gold='#BB9650')
    h.add('WarHelm','Head',(0,1.25,.02),(1.57,.36,1.38),'#262330',mat='Metal')
    h.add('HelmBrow','Head',(0,1.12,-.67),(1.50,.18,.13),h.gold,mat='Metal')
    h.add('HelmDemonMask','Head',(0,1.14,-.75),(.50,.35,.11),h.gold,'sphere',mat='Metal')
    h.add('HelmBlackHorn','Head',(0,1.56,-.08),(.32,.58,.18),'#17151B','wedge',rot=(0,0,180),mat='Metal')
    for sign in [-1,1]:
        h.add('CheekArmor'+str(sign),'Head',(sign*.74,.69,.06),(.16,.85,1.16),h.gold,mat='Metal')
        for i in range(10):
            x=sign*(.36+i*.15);y=1.59+.27*i-.028*i*i;z=.19+i*.25
            h.add('LongRedPlume'+str(sign)+str(i),'Head',(x,y,z),(.19,.40,.47),'#A92837',rot=(-25+i*8,0,-sign*18),mat='Fabric')
        h.add('HelmSideSpike'+str(sign),'Head',(sign*.70,1.32,-.16),(.20,.62,.16),h.gold,'wedge',rot=(0,-sign*90,sign*20),mat='Metal')
    h.cape('#70242F',1.82,2.01).spear('Fangtian',length=5.6,color='#D9D9D5')
    h.add('BlackRedScaleChest','Torso',(0,.12,-.80),(1.50,1.35,.10),'#16151D',mat='Metal')
    h.add('ChestDemonMask','Torso',(0,.35,-.92),(.48,.36,.11),h.gold,'sphere',mat='Metal')
    h.add('BeltDemonMask','Torso',(0,-.72,-.92),(.45,.34,.11),h.gold,'sphere',mat='Metal')
    for row in range(4):
        for col in range(5):
            color='#612236' if (row+col)%2 else '#26202F'
            h.add('PurpleScale'+str(row)+str(col),'Torso',((col-2)*.27,.62-row*.28,-.88),(.17,.16,.035),color,mat='Metal')
    for sign in [-1,1]:
        h.add('RedWaistRibbon'+str(sign),'Torso',(sign*.44,-.80,-.18),(.16,1.05,.08),'#A92837',rot=(0,0,sign*13),mat='Fabric')
    for sign in [-1,1]:
        h.add('HalberdCrossGuard'+str(sign),'RightArm',(sign*.34,2.50,-.69),(.65,.17,.21),h.gold,mat='Metal')
        h.add('HalberdSideBlade'+str(sign),'RightArm',(sign*.67,2.80,-.69),(.27,.87,.19),'#BBC6D0',mat='Metal')
        for up in [-1,1]:h.add('HalberdCrescent'+str(sign)+str(up),'RightArm',(sign*.47,2.80+up*.55,-.69),(.18,.47,.52),'#D7DDE0','wedge',rot=(0,-sign*90,0 if up>0 else 180),mat='Metal')
        h.add('HeavyPauldron'+str(sign),'LeftArm' if sign<0 else 'RightArm',(0,.44,.07),(1.22,.26,1.16),h.gold,rot=(0,0,-sign*9),mat='Metal')
        h.add('PauldronDemon'+str(sign),'LeftArm' if sign<0 else 'RightArm',(0,.51,-.54),(.40,.28,.11),h.gold,'sphere',mat='Metal')
        hanging_tassel(h,'PauldronRedCord'+str(sign),'LeftArm' if sign<0 else 'RightArm',(sign*.24,.21,-.52),'#A92837',3)
    h.add('HalberdDragonHead','RightArm',(0,2.48,-.88),(.42,.33,.11),h.gold,'sphere',mat='Metal')
    hanging_tassel(h,'HalberdRedWrap','RightArm',(0,2.18,-.69),'#A92837',4)
    h.pose(RightArm=[-103,0,-25],LeftArm=[-86,0,25],Torso=[-5,0,0],Head=[7,0,0]).scale(1.08,1.06,1.05)
    return h.done()


def diao_chan(meta,base):
    h=Hero(meta,base,cloth='#78529A',armor='#AA7EAE',gold='#C7AB6D',skin='#EDBC9C').robe('#79559A').bun(height=.54)
    h.remove('LeftGreave','RightGreave','LeftKnee','RightKnee','LeftSkirt','RightSkirt','LeftSideSkirt','RightSideSkirt','BeltDragon')
    for sign in [-1,1]:
        for k in range(3):
            h.add('DancerSweptFringe'+str(sign)+str(k),'Head',(sign*(.18+k*.16),1.15-k*.10,-.53),(.36,.22,.21),'#302731',rot=(0,0,sign*(8+k*14)))
        h.add('DancerSideSkirt'+str(sign),'LeftLeg' if sign<0 else 'RightLeg',(sign*.49,-.49,.02),(.13,1.54,1.16),'#80558E',mat='Fabric')
        h.add('DancerBackSkirt'+str(sign),'LeftLeg' if sign<0 else 'RightLeg',(0,-.49,.59),(.97,1.54,.12),'#946697',mat='Fabric')
        for k in range(3):h.add('DancerHemPetal'+str(sign)+str(k),'LeftLeg' if sign<0 else 'RightLeg',((k-1)*.24,-1.17,-.91),(.14,.14,.035),'#D9B4C8',rot=(0,0,45),mat='Fabric')
        h.add('LongHair'+str(sign),'Head',(sign*.57,-.04,.54),(.32,1.75,.25),h.hair,rot=(-7,0,sign*8))
        h.add('FlowingHairTip'+str(sign),'Head',(sign*.68,-.70,.46),(.22,.66,.18),h.hair,rot=(-22,0,sign*18))
        h.add('PinkSkirtPanel'+str(sign),'LeftLeg' if sign<0 else 'RightLeg',(0,-.49,-.89),(.55,1.46,.09),'#D1A1BB',rot=(0,0,sign*6),mat='Fabric')
        for i in range(5):
            x=sign*.49+math.sin(i*math.pi*2/5)*.19;y=1.39+math.cos(i*math.pi*2/5)*.19
            h.add('HairFlower'+str(sign)+str(i),'Head',(x,y,-.19),(.20,.20,.10),'#D9A1BD','sphere')
        h.add('GoldHairpin'+str(sign),'Head',(sign*.80,1.43,.09),(.67,.06,.07),h.gold,mat='Metal')
        hanging_tassel(h,'HairPearlDrop'+str(sign),'Head',(sign*.68,1.22,-.10),'#E9C0D1',3,.05)
        arm='LeftArm' if sign<0 else 'RightArm'
        # Short articulated ribbon segments stay above the feet; no solid skirt bridge.
        for i in range(5):h.add('Ribbon'+str(sign)+str(i),arm,(sign*(.39+i*.20),-.79-i*.09,.13+i*.10),(.37,.22,.10),'#DCA5C0',rot=(0,0,-sign*(15-i*12)),mat='Fabric')
        h.add('WaterSleeveTail'+str(sign)+'Root',arm,(sign*.12,-.55,-.60),(.72,.52,.08),'#F3C4D4',rot=(0,0,-sign*18),mat='Fabric')
        for i in range(5):h.add('RoseRibbonTail'+str(sign)+str(i),arm,(sign*(.35+i*.24),-.42-i*.18,-.54+i*.08),(.42,.18,.055),'#F0BBD0',rot=(0,0,-sign*(25-i*10)),mat='Fabric')
        flower_cluster(h,'SleeveFlower'+str(sign),arm,(sign*.36,-.33,-.66),'#D9A1BD','#B77BA6')
    h.add('RoseBodice','Torso',(0,.13,-.77),(1.25,1.08,.08),'#C18EAD',mat='Fabric')
    h.add('BodiceVTrim','Torso',(0,.20,-.85),(.22,1.03,.045),h.gold,rot=(0,0,21),mat='Metal')
    h.add('BodiceVTrimMirror','Torso',(0,.20,-.85),(.22,1.03,.045),h.gold,rot=(0,0,-21),mat='Metal')
    h.add('WaistGem','Torso',(0,-.78,-.87),(.34,.34,.11),'#B4769F',rot=(0,0,45))
    for sign in [-1,1]:
        hanging_tassel(h,'WaistPearlDrop'+str(sign),'Torso',(sign*.48,-.67,-.86),'#D9A1BD',4,.06)
        h.add('LayeredOuterSkirt'+str(sign),'LeftLeg' if sign<0 else 'RightLeg',(0,-.70,-.99),(.72,1.26,.08),'#6E3D82',rot=(0,0,sign*8),mat='Fabric')
        h.add('GoldSkirtHem'+str(sign),'LeftLeg' if sign<0 else 'RightLeg',(0,-1.30,-1.03),(.72,.10,.08),h.gold,mat='Metal')
    h.card('DiscardedCard','LeftArm',(0,-1.43,-.84),'#EDD6D7',rot=(0,0,12))
    h.add('DiscardedCardPlum','LeftArm',(0,-1.43,-.89),(.18,.04,.018),'#87344C',rot=(0,0,36),mat='Fabric')
    h.pose(RightArm=[-28,0,-49],LeftArm=[-47,0,43],Torso=[0,-18,0],Head=[0,15,0])
    return h.done()


def build_models(catalog,base):
    funcs={f.__name__:f for f in [liu_bei,zhang_fei,zhuge_liang,ma_chao,huang_yueying,hua_tuo,lu_bu,diao_chan]}
    return [funcs[m['id']](m,base) for m in catalog if m['id'] in funcs]
