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


def liu_bei(meta,base):
    h=Hero(meta,base,cloth='#2E7555',armor='#285A40',gold='#C5A15B').robe('#F0E2C3').beard(length=.42).crown(.43)
    h.add('GreenRoyalVest','Torso',(0,.05,-.73),(1.48,1.43,.10),h.cloth,mat='Fabric')
    for side,sign in [('Left',-1),('Right',1)]:
        h.add('RoyalLapel'+side,'Torso',(sign*.28,.20,-.82),(.16,1.1,.07),'#EFE0BC',rot=(0,0,sign*29),mat='Fabric')
        h.add('SmallShoulder'+side,side+'Arm',(0,.36,0),(.98,.18,1.03),h.gold,mat='Metal')
        h.add('BackSwordSheath'+side,'Torso',(sign*.20,.0,.87),(.25,2.47,.21),h.cloth,rot=(0,0,sign*34),mat='Metal')
        h.add('BackSwordGrip'+side,'Torso',(-sign*.69,1.35,.87),(.18,.67,.20),'#222C27',rot=(0,0,sign*34))
        h.add('BackSwordGuard'+side,'Torso',(-sign*.49,1.04,.87),(.69,.12,.28),h.gold,rot=(0,0,sign*34),mat='Metal')
        h.card('GiftCard'+side,side+'Arm',(0,-1.42,-.84))
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
    h.add('RedScarf','Torso',(0,.84,-.69),(1.89,.34,.27),'#9E3028',rot=(0,0,-9),mat='Fabric')
    h.cape('#80251F',1.32,1.75)
    h.spear('SnakeSpear',length=5.3,color='#C4CCD0').remove('SnakeSpearPoint')
    for sign in [-1,1]:
        for i in range(4):
            x=sign*(.12+.09*math.sin(i*1.8));y=2.40+i*.30
            h.add('SerpentBlade'+str(sign)+str(i),'RightArm',(x,y,-.69),(.16,.44,.21),'#CDD5D8',rot=(0,0,sign*(-1)**i*22),mat='Metal')
        h.add('SerpentFang'+str(sign),'RightArm',(sign*.18,3.62,-.69),(.20,.47,.27),'#DDE3E3','wedge',rot=(0,-sign*90,0),mat='Metal')
    h.pose(RightArm=[-56,8,-22],LeftArm=[-35,-5,27],Torso=[-6,12,0]).scale(1.09,1.02,1.03)
    return h.done()


def zhuge_liang(meta,base):
    h=Hero(meta,base,cloth='#2B684C',armor='#EBE2CA',gold='#BAA16C').robe('#E8DFCA')
    h.add('GreenInnerRobe','Torso',(0,.03,-.73),(.66,1.59,.10),h.cloth,mat='Fabric')
    h.add('ScholarHat','Head',(0,1.53,.04),(1.44,.59,1.15),h.cloth,mat='Fabric')
    for x in [-.56,0,.56]:h.add('HatRib'+str(x),'Head',(x,1.54,-.57),(.065,.57,.07),h.gold,mat='Metal')
    h.add('HatBand','Head',(0,1.26,-.58),(1.47,.09,.08),h.gold,mat='Metal')
    for sign in [-1,1]:h.add('HatTail'+str(sign),'Head',(sign*.30,.55,.79),(.20,1.55,.08),h.cloth,rot=(-16,0,sign*12),mat='Fabric')
    feather_fan(h)
    for i in range(5):h.card('StarCard'+str(i),'LeftArm',((i-2)*.19,-1.05+abs(i-2)*.08,-.86-i*.01),'#244B36',rot=(0,0,(i-2)*12))
    h.pose(RightArm=[-47,0,-17],LeftArm=[-68,0,20],Head=[0,-12,0])
    return h.done()


def ma_chao(meta,base):
    h=Hero(meta,base,cloth='#3A5540',armor='#AD8D52',gold='#DBC18A')
    h.add('CavalryHelm','Head',(0,1.22,.04),(1.50,.33,1.34),'#B59B67',mat='Metal')
    h.add('HelmRidge','Head',(0,1.40,0),(.28,.21,1.21),h.gold,mat='Metal')
    for sign in [-1,1]:
        h.add('HelmCheek'+str(sign),'Head',(sign*.72,.68,.10),(.16,.81,1.12),h.armor,mat='Metal')
        for i in range(5):h.add('WhitePlume'+str(sign)+str(i),'Head',(sign*(.28+i*.11),1.57+i*.22,.20+i*.12),(.23,.40,.32),'#E8E0CC',rot=(-20,0,-sign*20),mat='Fabric')
    h.cape('#E9E1CF',1.54,1.96).spear('CavalryLance',length=4.25)
    for i in range(4):h.add('WhiteTassel'+str(i),'RightArm',(.18+i*.04,1.46,-.69),(.065,.71,.08),'#E8E0CC',rot=(0,0,12+i*6),mat='Fabric')
    h.pose(RightArm=[-67,0,-18],LeftArm=[-12,0,16],Torso=[0,-15,0],Head=[0,12,0])
    return h.done()


def huang_yueying(meta,base):
    h=Hero(meta,base,cloth='#39694C',armor='#BC9B67',gold='#BE9956').robe('#426D50').bun(height=.43)
    h.add('WorkApron','Torso',(0,-.07,-.77),(1.40,1.34,.09),'#CCB58C',mat='Fabric')
    for sign in [-1,1]:
        h.add('ApronSplit'+str(sign),'LeftLeg' if sign<0 else 'RightLeg',(0,-.39,-.90),(.70,1.09,.08),'#CCB58C',mat='Fabric')
        h.add('ApronStrap'+str(sign),'Torso',(sign*.49,.42,-.84),(.13,.80,.06),h.gold,mat='Fabric')
    h.add('ToolPouch','Torso',(-1.12,-.72,.12),(.39,.73,.72),'#705239')
    for i in range(3):h.add('ToolRoll'+str(i),'Torso',(-1.14,-.22,-.1+i*.23),(.13,.73,.13),'#E5D8B6','cylinder')
    h.add('WrenchHandle','Torso',(.96,-.84,-.64),(.09,.66,.11),h.gold,rot=(0,0,-18),mat='Metal')
    for sign in [-1,1]:h.add('WrenchJaw'+str(sign),'Torso',(.93+sign*.10,-.44,-.64),(.085,.25,.13),h.gold,mat='Metal')
    feather_fan(h,True);gear(h,'FanGear','RightArm',(0,-.83,-.85));gear(h,'BeltGear','Torso',(0,-.85,-.88),.16)
    h.card('MechanismScroll','LeftArm',(0,-1.38,-.86),'#DACCAB')
    h.pose(RightArm=[-38,0,-26],LeftArm=[-50,0,14],Head=[2,9,0])
    return h.done()


def hua_tuo(meta,base):
    h=Hero(meta,base,cloth='#E5DFCE',armor='#E5DFCE',gold='#749672',hair='#B7B8B1').robe('#E5DFCE').beard('#B9BAB2',length=.91,width=.49).bun('#B7B8B1')
    h.add('GreenSash','Torso',(0,-.78,-.79),(2.0,.25,.10),'#387B50',mat='Fabric')
    h.add('MedicineChest','Torso',(0,.26,1.04),(1.84,2.0,.70),'#6B4C34')
    for row in range(3):
        for col in range(3):
            x=(col-1)*.56;y=.83-row*.57
            h.add('Drawer'+str(row)+str(col),'Torso',(x,y,1.42),(.48,.49,.08),'#997143')
            h.add('DrawerPull'+str(row)+str(col),'Torso',(x,y,1.49),(.14,.10,.06),'#D1B77C',mat='Metal')
    for sign in [-1,1]:h.add('MedicineStrap'+str(sign),'Torso',(sign*.72,.20,-.76),(.13,1.34,.09),'#916F45')
    h.add('GourdLower','Torso',(1.11,-.86,.18),(.40,.48,.40),'#B68139','sphere')
    h.add('GourdUpper','Torso',(1.11,-.53,.18),(.27,.30,.27),'#B68139','sphere')
    h.add('GourdCork','Torso',(1.11,-.32,.18),(.13,.17,.13),'#6B4C34','cylinder')
    h.add('MedicineBundle','RightArm',(0,-1.35,-.86),(.49,.28,.35),'#D8D0B7')
    for sign in [-1,1]:h.add('HerbLeaf'+str(sign),'RightArm',(sign*.10,-1.10,-.89),(.12,.30,.07),'#39784B',rot=(0,0,sign*30))
    h.card('EmergencyCard','LeftArm',(0,-1.35,-.83),'#A53D38')
    h.pose(RightArm=[-59,0,-10],LeftArm=[-43,0,20],Head=[7,0,0],Torso=[-3,0,0])
    return h.done()


def lu_bu(meta,base):
    h=Hero(meta,base,cloth='#492260',armor='#252133',gold='#BB9650')
    h.add('WarHelm','Head',(0,1.25,.02),(1.57,.36,1.38),'#262330',mat='Metal')
    h.add('HelmBrow','Head',(0,1.12,-.67),(1.50,.18,.13),h.gold,mat='Metal')
    for sign in [-1,1]:
        h.add('CheekArmor'+str(sign),'Head',(sign*.74,.69,.06),(.16,.85,1.16),h.gold,mat='Metal')
        for i in range(7):
            x=sign*(.36+i*.15);y=1.59+.27*i-.028*i*i;z=.19+i*.25
            h.add('LongRedPlume'+str(sign)+str(i),'Head',(x,y,z),(.19,.40,.47),'#A92837',rot=(-25+i*8,0,-sign*18),mat='Fabric')
    h.cape('#70242F',1.82,2.01).spear('Fangtian',length=5.6,color='#D9D9D5')
    for sign in [-1,1]:
        h.add('HalberdCrossGuard'+str(sign),'RightArm',(sign*.34,2.50,-.69),(.65,.17,.21),h.gold,mat='Metal')
        h.add('HalberdSideBlade'+str(sign),'RightArm',(sign*.67,2.80,-.69),(.27,.87,.19),'#BBC6D0',mat='Metal')
        for up in [-1,1]:h.add('HalberdCrescent'+str(sign)+str(up),'RightArm',(sign*.47,2.80+up*.55,-.69),(.18,.47,.52),'#D7DDE0','wedge',rot=(0,-sign*90,0 if up>0 else 180),mat='Metal')
        h.add('HeavyPauldron'+str(sign),'LeftArm' if sign<0 else 'RightArm',(0,.44,.07),(1.22,.26,1.16),h.gold,rot=(0,0,-sign*9),mat='Metal')
    h.pose(RightArm=[-103,0,-25],LeftArm=[-86,0,25],Torso=[-5,0,0],Head=[7,0,0]).scale(1.08,1.06,1.05)
    return h.done()


def diao_chan(meta,base):
    h=Hero(meta,base,cloth='#78529A',armor='#AA7EAE',gold='#C7AB6D',skin='#EDBC9C').robe('#79559A').bun(height=.54)
    h.remove('LeftGreave','RightGreave','LeftKnee','RightKnee')
    for sign in [-1,1]:
        h.add('LongHair'+str(sign),'Head',(sign*.57,-.04,.54),(.32,1.75,.25),h.hair,rot=(-7,0,sign*8))
        h.add('PinkSkirtPanel'+str(sign),'LeftLeg' if sign<0 else 'RightLeg',(0,-.49,-.89),(.55,1.46,.09),'#D1A1BB',rot=(0,0,sign*6),mat='Fabric')
        for i in range(5):
            x=sign*.49+math.sin(i*math.pi*2/5)*.19;y=1.39+math.cos(i*math.pi*2/5)*.19
            h.add('HairFlower'+str(sign)+str(i),'Head',(x,y,-.19),(.20,.20,.10),'#D9A1BD','sphere')
        h.add('GoldHairpin'+str(sign),'Head',(sign*.80,1.43,.09),(.67,.06,.07),h.gold,mat='Metal')
        arm='LeftArm' if sign<0 else 'RightArm'
        # Short articulated ribbon segments stay above the feet; no solid skirt bridge.
        for i in range(5):h.add('Ribbon'+str(sign)+str(i),arm,(sign*(.39+i*.20),-.79-i*.09,.13+i*.10),(.37,.22,.10),'#DCA5C0',rot=(0,0,-sign*(15-i*12)),mat='Fabric')
    h.add('RoseBodice','Torso',(0,.13,-.77),(1.25,1.08,.08),'#C18EAD',mat='Fabric')
    h.add('WaistGem','Torso',(0,-.78,-.87),(.34,.34,.11),'#B4769F',rot=(0,0,45))
    h.card('DiscardedCard','LeftArm',(0,-1.43,-.84),'#EDD6D7',rot=(0,0,12))
    h.pose(RightArm=[-28,0,-49],LeftArm=[-47,0,43],Torso=[0,-18,0],Head=[0,15,0])
    return h.done()


def build_models(catalog,base):
    funcs={f.__name__:f for f in [liu_bei,zhang_fei,zhuge_liang,ma_chao,huang_yueying,hua_tuo,lu_bu,diao_chan]}
    return [funcs[m['id']](m,base) for m in catalog if m['id'] in funcs]
