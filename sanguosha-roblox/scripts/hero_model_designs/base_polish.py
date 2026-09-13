"""Painting-led details for the two original heroes, applied after faction cloning."""
import math
from .faceted import polygon_parts


def polish_original(model):
    if model['id'] not in {'guan_yu', 'zhao_yun'}:
        return model
    guan = model['id'] == 'guan_yu'
    gold = '#CDA357' if guan else '#D9B77C'
    green, blue, ink = '#19573D', '#235DAB', '#22272C'
    silver = '#D5DFE6'
    parts = model['parts']

    def add(name, bone, pos, size, color, rot=(0, 0, 0), shape='box', material='Metal'):
        parts.append(dict(name='Art'+name, bone=bone, shape=shape, position=list(pos), size=list(size),
                          rotation=list(rot), color=color, material=material))

    def line(name, bone, a, b, width, color=gold):
        d = [b[i]-a[i] for i in range(3)]
        length = math.sqrt(sum(v*v for v in d))
        rot = [math.degrees(math.asin(d[2]/length)), 0, math.degrees(math.atan2(-d[0], d[1]))]
        add(name, bone, [(a[i]+b[i])/2 for i in range(3)], [width, length, width], color, rot)

    def dragon(name, bone, x, y, z, scale=1):
        # Raised brow, jaw, horns and winding body retain the original's dragon emblem.
        add(name+'Brow', bone, (x,y+.20*scale,z), (.40*scale,.12*scale,.09), gold, (0,0,-8))
        add(name+'Jaw', bone, (x,y+.04*scale,z-.035), (.25*scale,.16*scale,.10), gold)
        for sign in [-1,1]:
            add(name+'Eye'+str(sign),bone,(x+sign*.11*scale,y+.15*scale,z-.07),(.055*scale,.04*scale,.03),ink)
            line(name+'Horn'+str(sign),bone,(x+sign*.19*scale,y+.23*scale,z),(x+sign*.30*scale,y+.48*scale,z),.06*scale)
        curve=[(.03,-.03),(.25,-.15),(.28,-.36),(.08,-.51),(-.18,-.42),(-.26,-.23),(-.40,-.18)]
        for i,(a,b) in enumerate(zip(curve,curve[1:])):
            line(name+'Coil'+str(i),bone,(x+a[0]*scale,y+a[1]*scale,z),(x+b[0]*scale,y+b[1]*scale,z),.065*scale)

    # Gold edging and dark recesses make individual lamellae readable at game scale.
    for p in parts:
        if p['name'].startswith('ChestScale'):
            p['color'] = ['#236548','#194833','#2B7051'][int(p['name'][10])%3] if guan else ['#C4CFD8','#A1B3C5','#DBE2E6'][int(p['name'][10])%3]
        if p['name'].endswith('ShoulderPanel'):
            p['size'][2] += .045
        if p['name'].startswith('BeardHighlight'):
            p['color'] = '#4B493E'
    for side, sign in [('Left',-1),('Right',1)]:
        arm,leg=side+'Arm',side+'Leg'
        # Flared lower shoulder plates and wraparound cuff surfaces.
        add(side+'ShoulderApron',arm,(sign*.10,-.16,-.70),(1.02,.44,.12),green if guan else blue,(0,0,-sign*8),'box','Fabric')
        add(side+'ShoulderHem',arm,(sign*.13,-.36,-.78),(1.05,.075,.065),gold,(0,0,-sign*8))
        for i in range(3):
            add(side+'ShoulderLamella'+str(i),arm,((i-1)*.29,.16,-.79),(.24,.30,.065),green if guan else silver)
            add(side+'ShoulderRivet'+str(i),arm,((i-1)*.29,.24,-.84),(.055,.055,.04),gold,shape='sphere')
        add(side+'CuffUnderlay',arm,(0,-.73,0),(.94,.64,1.04),green if guan else blue,material='Fabric')
        for y in [-.43,-1.02]:
            add(side+'CuffGold'+str(y),arm,(0,y,0),(.99,.07,1.08),gold)
        dragon(side+'CuffDragon',arm,0,-.68,-.71,.48)
        # Segmented silk under-skirt, not a single solid block over both moving legs.
        add(side+'UnderSkirt',leg,(0,-.51,.60),(.91,1.16,.12),green if guan else blue,(-5,0,sign*5),'box','Fabric')
        add(side+'UnderSkirtHem',leg,(0,-1.05,.68),(.91,.06,.045),gold,(0,0,sign*5))
        for row in range(2):
            for col in range(2):
                add(side+'SkirtScale'+str(row)+str(col),leg,((col-.5)*.36,-.14-row*.27,-.77),(.30,.21,.045),green if guan else silver)
                add(side+'SkirtFloret'+str(row)+str(col),leg,((col-.5)*.36,-.14-row*.27,-.807),(.065,.09,.026),gold,(0,0,45))
        dragon(side+'ShinScroll',leg,0,-1.04,-.68,.44)
        add(side+'BootFacing',leg,(0,-1.78,-.80),(.89,.27,.07),green if guan else blue,material='Fabric')
        add(side+'BootToeTrim',leg,(0,-1.94,-.81),(.94,.055,.08),gold)

    if guan:
        # The long black beard and green cloth cap are his strongest silhouette anchors.
        remove={'BeardCenter','BeardSide-1','BeardSide1'}
        model['parts'][:]=[p for p in parts if p['name'] not in remove]
        add('BeardCenter', 'Head',(0,-.03,-.93),(.42,1.20,.29),'#242522',material='SmoothPlastic')
        for sign in [-1,1]:
            add('BeardFacet'+str(sign),'Head',(sign*.27,.02,-.94),(.27,1.03,.22),'#30312A',(0,0,sign*8),material='SmoothPlastic')
            add('BeardPoint'+str(sign),'Head',(sign*.09,-.75,-.93),(.18,.45,.25),'#20221F',(180,-sign*90,0),'wedge','SmoothPlastic')
            add('CapFold'+str(sign),'Head',(sign*.43,1.45,-.43),(.57,.18,.48),'#236846',(0,sign*8,sign*7),material='Fabric')
            add('RobePleat'+str(sign),'Torso',(sign*.56,-1.22,.98),(.13,1.69,.06),'#28734F',(-12,0,sign*5),material='Fabric')
            add('RobeGoldHem'+str(sign),'Torso',(sign*.52,-1.97,1.06),(.80,.05,.045),gold,(-12,0,sign*5))
        dragon('ChestDragon','Torso',.37,.16,-.81,.76)
        # Continuous native wedge tessellation follows the painting's crescent contour.
        model['parts'][:]=[p for p in parts if not p['name'].startswith(('DragonBlade','CrescentSilverEdge','BladeSpine','BladeDragonSpine'))]
        outline=[(-.10,2.46),(.06,2.72),(-.08,3.08),(-.28,3.44),(-.57,3.81),(-.65,4.23),(-.70,4.90),(-1.00,4.47),(-1.18,3.98),(-1.21,3.52),(-1.13,3.12),(-.92,2.82),(-.64,2.63)]
        parts.extend(polygon_parts('ArtCrescentEdge','RightArm',outline,-.67,.18,'#D6E0DC'))
        inner=[(-.13,2.64),(-.08,2.83),(-.23,3.18),(-.43,3.51),(-.72,3.89),(-.77,4.23),(-.72,4.60),(-.89,4.28),(-1.04,3.91),(-1.06,3.53),(-.98,3.22),(-.77,2.92),(-.52,2.75)]
        for side,depth in [('Front',-.779),('Back',-.561)]:
            parts.extend(polygon_parts('ArtCrescentInlay'+side,'RightArm',inner,depth,.025,green))
        # Connected gold tracery down the green face of the crescent blade.
        path=[(-.16,2.78),(-.45,3.02),(-.37,3.27),(-.69,3.52),(-.64,3.81)]
        for i,(a,b) in enumerate(zip(path,path[1:])):
            line('BladeDragonStem'+str(i),'RightArm',(a[0],a[1],-.80),(b[0],b[1],-.80),.06)
        for i,(x,y) in enumerate(path[1:-1]):
            line('BladeDragonClaw'+str(i),'RightArm',(x,y,-.82),(x-.17,y+.10,-.82),.048)
        add('BladeCollar','RightArm',(0,2.48,-.67),(.39,.18,.38),gold,shape='cylinder')
    else:
        # Silver helmet facets and long swept blue plume replace the flat crest silhouette.
        model['parts'][:]=[p for p in parts if not p['name'].startswith(('PlumeRise','PlumeTrail'))]
        for sign in [-1,1]:
            add('HelmSlope'+str(sign),'Head',(sign*.52,1.37,.03),(.51,.18,1.20),silver,(0,0,-sign*23))
            add('HelmetTempleRivet'+str(sign),'Head',(sign*.75,.80,-.50),(.07,.07,.07),gold,shape='sphere')
            add('CheekInset'+str(sign),'Head',(sign*.80,.64,-.06),(.045,.52,.87),'#879FB9')
        dragon('HelmetDragon','Head',0,1.23,-.87,.63)
        for i in range(5):
            x=(i-2)*.13
            add('CrestRise'+str(i),'Head',(x,1.77-i*.025,.42),(.18,.63,.36),['#255AAA','#347ACD','#184782'][i%3],(-28,0,(i-2)*-7),material='Fabric')
            add('PlumeTrail'+str(i),'Head',(x*1.4,1.64-i*.08,1.07+i*.045),(.22,.30,1.35),['#255AAA','#347ACD','#184782'][i%3],(22+i*4,0,(i-2)*5),material='Fabric')
            add('PlumeTip'+str(i),'Head',(x*1.8,1.21-i*.12,1.71+i*.065),(.18,.24,.63),blue,(32+i*5,0,(i-2)*6),material='Fabric')
        add('ScarfLowerFold','Torso',(-.05,.49,-.81),(1.36,.21,.11),'#347ACD',(0,0,-14),material='Fabric')
        dragon('ChestDragon','Torso',.14,-.05,-.83,.90)
        for i in [-1,0,1]:
            add('CapeExtension'+str(i),'Torso',(i*.53,-1.0,1.08),(.59,1.17,.12),['#235DAB','#1C4786','#3471BA'][i+1],(-15,0,i*6),material='Fabric')
            add('CapeHem'+str(i),'Torso',(i*.53,-1.54,1.22),(.58,.055,.05),gold,(-15,0,i*6))
        add('SpearRidge','RightArm',(0,3.27,-.815),(.045,1.0,.035),'#F1F2ED')
        dragon('SpearSocketDragon','RightArm',0,2.64,-.91,.60)
    model['designNotes'] += ' 原画对齐精修：分层金边甲片、浮雕龙纹、布料分片及头饰轮廓。'
    return model
