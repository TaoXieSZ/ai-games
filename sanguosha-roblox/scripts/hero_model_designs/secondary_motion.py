"""Authored secondary motion groups; rigid panel motion, not cloth simulation."""
import math

def add_secondary_motion(model):
    groups=[]
    used=set()
    def group(label,parts,pivot,amplitude,phase=0):
        if not parts:return
        groups.append(dict(id=label,bone=parts[0]['bone'],parts=[p['name']for p in parts],pivot=list(pivot),amplitude=list(amplitude),phase=phase))
        used.update(p['name']for p in parts)
    cape=[p for p in model['parts'] if p['bone']=='Torso' and ('Cape' in p['name']) and p['name']!='CapeClasp']
    group('cape',cape,(0,.65,.79),(9,3,4),.4)
    for index,bone in enumerate(['Head','Torso','LeftArm','RightArm']):
        ribbon=[p for p in model['parts'] if p['bone']==bone and p['name']not in used and
                (p['name'].startswith(('Ribbon','WaterSleeveTail','WhiteSashTail','RoseRibbonTail','HairRibbon','HatRibbon','JudgeRibbon')))]
        if ribbon and bone in ['Head','Torso']:
            for part in ribbon:
                pivot=[*part['position']];pivot[1]+=part['size'][1]/2
                group('ribbon-'+part['name'],[part],pivot,(10,2,10),index*.6)
            ribbon=[]
        if ribbon:
            first=max(ribbon,key=lambda p:p['position'][1]);pivot=[*first['position']];pivot[1]+=.15
            group('ribbon-'+bone,ribbon,pivot,(10,2,12 if bone!='LeftArm' else -12),index*.6)
        tassels=[p for p in model['parts']if p['bone']==bone and p['name']not in used and'Tassel'in p['name']and not any(t in p['name']for t in ['Knot','Ring'])]
        if tassels and bone=='Head':
            for part in tassels:
                pivot=[*part['position']];pivot[1]+=part['size'][1]/2
                group('tassel-'+part['name'],[part],pivot,(8,0,8),.7)
            tassels=[]
        if tassels:
            first=max(tassels,key=lambda p:p['position'][1]);pivot=[*first['position']];pivot[1]+=first['size'][1]/2
            group('tassel-'+bone,tassels,pivot,(8,0,10),index*.8)
        sleeves=[p for p in model['parts']if p['bone']==bone and p['name'].startswith(('WhiteInnerSleeve','SleeveGoldEdge'))]
        if sleeves:
            first=next(p for p in sleeves if p['name'].startswith('WhiteInnerSleeve'));pivot=[*first['position']];pivot[1]+=first['size'][1]/2
            group('sleeve-'+bone,sleeves,pivot,(8,0,9 if bone=='RightArm'else -9),.5+index)
    model['attachmentMotion']=groups
    if model['id']=='sun_shangxiang':add_bow_motion(model)
    return model

def add_bow_motion(model):
    model['parts']=[p for p in model['parts']if p['name']not in ['BowStringFull','BowStringGripTie','ArrowShaft','ArrowHead']]
    spec=dict(bone='LeftArm',drawBone='RightArm',drawPoint=[.02,-1.18,-.98],
              tips=[[.34,.48,-1.03],[-.34,-2.44,-1.03]],grip=[0,-.98,-1.12],
              strings=['BowStringUpper','BowStringLower'],arrows=[
                  dict(part='ArrowShaft',offset=[0,1.6,0],rotation=[0,0,0]),
                  dict(part='ArrowPointL',offset=[-.045,3.35,0],rotation=[0,90,0]),
                  dict(part='ArrowPointR',offset=[.045,3.35,0],rotation=[0,-90,0])])
    model['bowMotion']=spec
    # Bind-pose drawing hand expressed in the left-arm coordinate frame.
    nock=[3.06,-1.18,-.98]
    def line(name,a,b,width,color):
        d=[b[i]-a[i]for i in range(3)];length=math.sqrt(sum(v*v for v in d))
        rotation=[math.degrees(math.asin(d[2]/length)),0,math.degrees(math.atan2(-d[0],d[1]))]
        model['parts'].append(dict(name=name,bone='LeftArm',shape='box',position=[(a[i]+b[i])/2 for i in range(3)],rotation=rotation,size=[width,length,width],color=color,material='SmoothPlastic'))
    for name,tip in zip(spec['strings'],spec['tips']):line(name,tip,nock,.035,'#EAD7B7')
    direction=[spec['grip'][i]-nock[i]for i in range(3)];length=math.sqrt(sum(v*v for v in direction));direction=[v/length for v in direction]
    end=[nock[i]+direction[i]*3.2 for i in range(3)]
    line('ArrowShaft',nock,end,.065,'#EAD7B7')
    for sign,label in [(-1,'L'),(1,'R')]:
        model['parts'].append(dict(name='ArrowPoint'+label,bone='LeftArm',shape='wedge',position=[nock[i]+direction[i]*3.35+(.045*sign if i==1 else 0)for i in range(3)],rotation=[0,-sign*90,90],size=[.09,.30,.16],color='#DCE7EC',material='Metal'))
    # Both hands now reach in front of the chest. Positive X raises the hand toward -Z.
    model['poses']['ready'].update(Torso=[-3,-18,0],LeftArm=[40,0,15],RightArm=[52,0,-28],Head=[0,-16,0],LeftLeg=[-20,0,-8],RightLeg=[10,0,8])
