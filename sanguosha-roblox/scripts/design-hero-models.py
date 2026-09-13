"""Authored first-batch articulated Roblox hero geometry, in studs.
A shared joint-local description drives both real GLB and native Roblox exports.
Run from anywhere; never edits the existing gameplay rig or place.
"""
import json, math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def build(hero):
    guan=hero=='guan_yu'
    p={'cloth':'#12633F' if guan else '#215FAB','armor':'#174B36' if guan else '#C4CFDC',
       'edge':'#BF9850' if guan else '#D6B572','dark':'#202823' if guan else '#243347',
       'skin':'#AC342B' if guan else '#EAB181','hair':'#191D20','metal':'#D1DED9' if guan else '#E5ECF4'}
    bones=[{'name':'Root','parent':None,'position':[0,3.2,0],'center':[0,0,0],'size':[2,2,1],'color':p['dark'],'visible':False},
      {'name':'Torso','parent':'Root','position':[0,0,0],'center':[0,0,0],'size':[2,2,1],'color':p['cloth'],'visible':True},
      {'name':'Head','parent':'Torso','position':[0,1.08,0],'center':[0,.65,0],'size':[1.38,1.25,1.2],'color':p['skin'],'visible':True}]
    for side,sign in [('Left',-1),('Right',1)]:
        bones.append({'name':side+'Arm','parent':'Torso','position':[sign*1.52,.6,0],'center':[0,-.57,0],'size':[.88,1.92,.98],'color':p['cloth'],'visible':True})
        bones.append({'name':side+'Leg','parent':'Torso','position':[sign*.54,-1,0],'center':[0,-1,0],'size':[.94,2,1],'color':p['dark'],'visible':True})
    parts=[]
    def add(name,bone,pos,size,color,shape='box',rot=(0,0,0),mat='SmoothPlastic'):
        parts.append(dict(name=name,bone=bone,shape=shape,position=list(pos),rotation=list(rot),size=list(size),color=p.get(color,color),material=mat))
    def plate(name,bone,pos,size,color='armor',rot=(0,0,0)):
        x,y,z=pos;w,h,d=size
        add(name+'Rim',bone,pos,size,'edge',rot=rot,mat='Metal')
        # Most costume panels face forward; frontal overlay is kept outside the rim.
        add(name+'Panel',bone,(x,y,z-.035),(max(w-.1,.06),max(h-.1,.06),d+.015),color,rot=rot,mat='Metal')
    def ring(name,bone,pos,radius,color='edge',thick=.055):
        for i in range(10):
            a=2*math.pi*i/10
            add(name+str(i),bone,(pos[0]+math.sin(a)*radius,pos[1]+math.cos(a)*radius,pos[2]),(thick,radius*.65,thick),color,rot=(0,0,-a*180/math.pi),mat='Metal')
    def emblem(name,bone,pos,scale=1):
        x,y,z=pos
        add(name+'Brow',bone,(x,y+.1*scale,z),(.4*scale,.13*scale,.11*scale),'edge',rot=(0,0,0),mat='Metal')
        add(name+'Muzzle',bone,(x,y-.05*scale,z-.07*scale),(.25*scale,.18*scale,.12*scale),'edge',mat='Metal')
        for s in [-1,1]:
            add(name+'Horn'+str(s),bone,(x+s*.2*scale,y+.18*scale,z),(.065*scale,.23*scale,.07*scale),'edge',rot=(0,0,-s*30),mat='Metal')
            add(name+'Eye'+str(s),bone,(x+s*.11*scale,y+.04*scale,z-.071*scale),(.06*scale,.035*scale,.025*scale),'dark')
        ring(name+'Ring',bone,(x,y-.17*scale,z-.11*scale),.105*scale,'edge',.045*scale)
    # Chest: broad lamellar panels, edge banding and sparse rivets.
    plate('Breastplate','Torso',(0,.06,-.57),(1.93,1.55,.16))
    for row in range(3):
        for col in range(4):
            x=(col-1.5)*.42;y=.54-row*.36
            add(f'ChestScale{row}_{col}','Torso',(x,y,-.702),(.37,.3,.055),'armor',rot=(3,0,0),mat='Metal')
            if (row+col)%2==0:add(f'ChestStud{row}_{col}','Torso',(x,y+.06,-.74),(.055,.055,.035),'edge',rot=(0,0,45),mat='Metal')
    for s in [-1,1]:
        add('ChestHarness'+str(s),'Torso',(s*.8,.04,-.75),(.085,1.46,.055),'edge',mat='Metal')
    # Layered back instead of an empty rear silhouette.
    add('BackArmor','Torso',(0,.05,.57),(1.91,1.62,.16),'armor',mat='Metal')
    for y in [-.45,0,.45]:add('BackBand'+str(y),'Torso',(0,y,.69),(1.8,.065,.05),'edge',mat='Metal')
    for x in [-.82,.82]:add('BackVertical'+str(x),'Torso',(x,.03,.69),(.065,1.48,.05),'edge',mat='Metal')
    add('WaistBelt','Torso',(0,-.83,0),(2.12,.29,1.2),'dark',mat='Fabric')
    for y in [-.72,-.95]:add('BeltTrim'+str(y),'Torso',(0,y,-.63),(2.12,.045,.045),'edge',mat='Metal')
    emblem('BeltDragon','Torso',(0,-.82,-.76),1.2)
    # Split skirt and greaves follow their own legs, so walking doesn't drag a solid skirt.
    for side,sgn in [('Left',-1),('Right',1)]:
        arm=side+'Arm';leg=side+'Leg'
        plate(side+'Shoulder',arm,(0,.12,-.065),(1.12,.66,1.2),rot=(0,0,-sgn*9))
        add(side+'ShoulderCap',arm,(0,.43,.04),(1.0,.12,.95),'edge',rot=(0,0,-sgn*9),mat='Metal')
        emblem(side+'ShoulderSeal',arm,(0,.12,-.73),.76)
        plate(side+'Bracer',arm,(0,-.7,-.57),(.9,.59,.16))
        for y in [-.45,-.96]:add(side+'Cuff'+str(y),arm,(0,y,0),(.94,.08,1.04),'edge',mat='Metal')
        add(side+'Hand',arm,(0,-1.38,-.04),(.85,.48,.93),'skin')
        plate(side+'Skirt',leg,(0,-.23,-.63),(.88,.66,.12))
        for y in [-.07,-.3]:
            for x in [-.22,.22]:add(side+'SkirtStud'+str(y)+str(x),leg,(x,y,-.74),(.07,.07,.04),'edge',mat='Metal')
        add(side+'SideSkirt',leg,(sgn*.48,-.2,.05),(.12,.74,1.04),'cloth',mat='Fabric')
        add(side+'SkirtEdge',leg,(sgn*.56,-.2,.05),(.04,.74,1.04),'edge',mat='Metal')
        plate(side+'Greave',leg,(0,-1.06,-.54),(.87,.68,.13))
        add(side+'Boot',leg,(0,-1.76,-.12),(1.02,.46,1.26),'dark')
        add(side+'Sole',leg,(0,-1.97,-.12),(1.04,.1,1.28),'cloth')
        add(side+'BootBand',leg,(0,-1.57,-.12),(1.05,.07,1.27),'edge',mat='Metal')
        add(side+'Knee',leg,(0,-.64,-.61),(.45,.28,.12),'edge',rot=(0,0,45),mat='Metal')
    # Independent eyes and brows read from both front and three-quarter views.
    for s in [-1,1]:
        add('Eye'+str(s),'Head',(s*.28,.72,-.619),(.115,.2,.045),'hair')
        add('Brow'+str(s),'Head',(s*.27,.94,-.635),(.37,.105,.055),'hair',rot=(0,0,s*18))
    add('Mouth','Head',(0,.39,-.63),(.28,.042,.042),'hair')
    if guan:
        # Green wrapped cap, three major beard facets, long rear ribbons.
        add('HairBack','Head',(0,.56,.5),(1.45,1.12,.33),'hair')
        for s in [-1,1]:add('Sideburn'+str(s),'Head',(s*.61,.38,-.06),(.18,.95,.96),'hair')
        add('HeadwrapBase','Head',(0,1.25,0),(1.57,.27,1.32),'cloth',mat='Fabric')
        add('HeadwrapFold','Head',(0,1.45,.08),(1.32,.21,1.12),'cloth',rot=(0,0,4),mat='Fabric')
        add('HeadwrapKnot','Head',(0,1.64,.23),(.68,.25,.63),'cloth',rot=(0,0,-7),mat='Fabric')
        add('HeadwrapGold','Head',(0,1.36,-.645),(.13,.48,.06),'edge',mat='Metal')
        emblem('CapSeal','Head',(0,1.21,-.73),.72)
        for s in [-1,1]:
            add('Moustache'+str(s),'Head',(s*.2,.4,-.68),(.47,.18,.18),'hair',rot=(0,0,s*16))
        add('BeardCenter','Head',(0,-.15,-.95),(.43,1.32,.28),'hair')
        for s in [-1,1]:
            add('BeardSide'+str(s),'Head',(s*.34,-.03,-.92),(.28,1.1,.23),'hair',rot=(0,0,s*7))
            add('BeardHighlight'+str(s),'Head',(s*.15,-.14,-1.10),(.026,1.15,.022),'#343A36')
            add('WrapTail'+str(s),'Head',(s*.29,.43,.85),(.42,1.9,.1),'cloth',rot=(-15,0,s*8),mat='Fabric')
        for s in [-1,1]:
            add('RobeTail'+str(s),'Torso',(s*.52,-1.17,.8),(.91,1.85,.12),'cloth',rot=(-12,0,s*5),mat='Fabric')
            add('RobeTailBorder'+str(s),'Torso',(s*.91,-1.17,.85),(.055,1.75,.06),'edge',rot=(-12,0,s*5),mat='Fabric')
    else:
        add('HelmTop','Head',(0,1.23,.03),(1.54,.33,1.32),'metal',mat='Metal')
        add('HelmRidge','Head',(0,1.43,.06),(.38,.19,1.1),'metal',mat='Metal')
        add('HelmBrowBand','Head',(0,1.09,-.645),(1.52,.13,.12),'edge',mat='Metal')
        add('HelmBack','Head',(0,.72,.59),(1.5,.89,.14),'armor',mat='Metal')
        for s in [-1,1]:
            add('CheekGuard'+str(s),'Head',(s*.72,.64,.04),(.14,.83,1.24),'metal',mat='Metal')
            add('CheekEdge'+str(s),'Head',(s*.72,.24,-.08),(.16,.075,1.03),'edge',mat='Metal')
        emblem('HelmDragon','Head',(0,1.17,-.78),.94)
        # Faceted plume has a raised crest and three swept lengths.
        for i in range(4):
            add('PlumeRise'+str(i),'Head',((i-1.5)*.14,1.63+i*.03,.35),(.16,.55,.26),'cloth',rot=(-30-i*5,0,0),mat='Fabric')
            add('PlumeTrail'+str(i),'Head',((i-1.5)*.19,1.61-i*.13,1.04+i*.12),(.2,.22,1.35),'cloth',rot=(18+i*5,0,(i-1.5)*8),mat='Fabric')
        add('ScarfFront','Torso',(0,.73,-.72),(1.65,.23,.2),'cloth',rot=(0,0,-8),mat='Fabric')
        add('CapeTop','Torso',(0,.72,.78),(1.65,.35,.17),'cloth',mat='Fabric')
        for i in [-1,0,1]:
            add('CapePanel'+str(i),'Torso',(i*.5,-.05,.89),(.58,1.73,.12),'cloth',rot=(-12,0,i*3),mat='Fabric')
        emblem('CapeDragon','Torso',(0,-.15,1.03),1)
    # Weapon is constructed as separate named pieces attached at the right-hand grip.
    add('WeaponShaft','RightArm',(0,-.18,-.67),(.17,5.5,.17),'cloth','cylinder',mat='Metal')
    for y in [-2.85,-1.8,-.2,1.3,2.43]:
        add('WeaponFerrule'+str(y),'RightArm',(0,y,-.67),(.235,.13,.235),'edge','cylinder',mat='Metal')
    add('WeaponGrip','RightArm',(0,-1.29,-.67),(.23,.46,.23),'dark','cylinder',mat='Fabric')
    # Palm reaches the shaft; curled fingertips close across its front.
    add('GripPalm','RightArm',(.21,-1.34,-.59),(.27,.38,.27),'skin')
    add('GripFingers','RightArm',(.035,-1.34,-.80),(.4,.32,.16),'skin')
    add('GripThumb','RightArm',(-.19,-1.18,-.66),(.17,.22,.27),'skin',rot=(0,0,-12))
    add('WeaponPommel','RightArm',(0,-3.0,-.67),(.3,.27,.3),'edge',rot=(0,45,0),mat='Metal')
    if guan:
        # Swept crescent: broad overlapping facets, continuous silver cutting edge.
        add('DragonBladeCore','RightArm',(-.32,3.17,-.67),(.72,1.28,.16),'cloth',rot=(0,0,-17),mat='Metal')
        add('DragonBladeUpper','RightArm',(-.59,3.83,-.67),(.45,.91,.15),'cloth',rot=(0,0,-31),mat='Metal')
        add('DragonBladeTip','RightArm',(-.91,4.32,-.67),(.18,.62,.34),'metal','wedge',rot=(0,-90,0),mat='Metal')
        for i,(x,y,h,a) in enumerate([(-.69,2.96,.75,-17),(-.86,3.52,.63,-20),(-1.0,4.05,.63,-32)]):
            add('CrescentSilverEdge'+str(i),'RightArm',(x,y,-.67),(.13,h,.19),'metal',rot=(0,0,a),mat='Metal')
        add('BladeSpine','RightArm',(-.06,2.95,-.67),(.18,.65,.21),'edge',rot=(0,0,-12),mat='Metal')
        emblem('WeaponDragonNeck','RightArm',(-.02,2.57,-.84),1.2)
        for i in range(4):add('BladeDragonSpine'+str(i),'RightArm',(-.23-i*.09,2.98+i*.21,-.77),(.1,.29,.06),'edge',rot=(0,0,(-1)**i*22),mat='Metal')
        tassel='#A52A22'
    else:
        add('SpearSocket','RightArm',(0,2.65,-.67),(.31,.35,.31),'edge','cylinder',mat='Metal')
        # Two opposed ramps form a true pointed spear silhouette, rather than a blunt box.
        add('SpearBladeL','RightArm',(-.11,3.30,-.67),(.18,1.08,.22),'metal','wedge',rot=(0,90,0),mat='Metal')
        add('SpearBladeR','RightArm',(.11,3.30,-.67),(.18,1.08,.22),'armor','wedge',rot=(0,-90,0),mat='Metal')
        emblem('SpearDragon','RightArm',(0,2.62,-.89),.9)
        tassel='cloth'
    add('WeaponTasselKnot','RightArm',(.19,2.4,-.67),(.25,.25,.25),tassel,'sphere',mat='Fabric')
    for i in range(4):add('WeaponTassel'+str(i),'RightArm',(.28+i*.06,1.95,-.67+(i-1.5)*.045),(.075,.84,.075),tassel,rot=(0,0,13+i*4),mat='Fabric')
    return {'id':hero,'name':'关羽' if guan else '赵云','version':1,'units':'studs','front':'-Z','stage':'articulated-block-model-v1',
      'referenceArt':f'assets/art-design/hero-pool-v1/{hero}.png',
      'designNotes':'赤面、三绺长髯、青绿头巾、分片甲裙与青龙偃月刀。' if guan else '银盔蓝缨、无髯年轻面孔、分片银甲、蓝披风与银枪。',
      'bones':bones,'parts':parts,'poses':{'ready':{'RightArm':[-8,0,-5],'LeftArm':[0,0,5]} if guan else {'RightArm':[-38,0,-8],'LeftArm':[-28,0,18]}}}

if __name__ == '__main__':
    from hero_model_designs import wei, wu, shu_qun
    from hero_model_designs.faces import refine_face
    catalog=json.loads((ROOT/'data/hero-art-v1.json').read_text())
    models=[build(x) for x in ['guan_yu','zhao_yun']]
    base=models[1]
    for group in [wei,wu,shu_qun]:models.extend(group.build_models(catalog,base))
    by_id={m['id']:m for m in models}
    assert len(models)==len(by_id)==len(catalog)==25, 'Full cast must have 25 unique models'
    models=[by_id[m['id']] for m in catalog]
    for model,meta in zip(models,catalog):
        model['faction']=meta['faction']
        model['referenceArt']=meta['artPath']
        model['poseDescription']=meta['pose']
        refine_face(model)
    out=ROOT/'data/hero-models-v1.json';out.write_text(json.dumps(models,ensure_ascii=False,indent=2)+'\n')
    for m in models:print(m['id'],len(m['bones']),'bones',len(m['parts']),'decorations')
