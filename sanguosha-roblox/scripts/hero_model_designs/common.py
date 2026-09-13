"""Joint-local authoring helpers for the full cast. No Roblox runtime dependencies."""
from copy import deepcopy
import math

class Hero:
    def __init__(self, meta, base, cloth=None, armor=None, gold=None, skin='#E8B184', hair='#20232B'):
        self.meta=meta
        self.model=deepcopy(base)
        self.model.update(id=meta['id'],name=meta['name'],faction=meta['faction'],referenceArt=meta['artPath'],designNotes=meta['outfit']+' '+meta['prop'])
        self.cloth=cloth or meta['palette'][0];self.armor=armor or self.cloth;self.gold=gold or meta['palette'][-1];self.skin=skin;self.hair=hair
        mapping={'#215FAB':self.cloth,'#C4CFDC':self.armor,'#D6B572':self.gold,'#EAB181':skin,'#191D20':hair,'#E5ECF4':'#D5DEE6'}
        self.model['parts']=[p for p in self.model['parts'] if (p['bone']!='Head' or p['name'].startswith(('Eye','Brow','Mouth'))) and not p['name'].startswith(('Cape','Scarf','Weapon','Spear','Grip'))]
        for p in self.model['parts']+self.model['bones']:p['color']=mapping.get(p['color'],p['color'])
        self.model['poses']={'ready':{'RightArm':[-6,0,-5],'LeftArm':[0,0,5]}}
        self.add('HairBack','Head',(0,.64,.53),(1.43,1.16,.25),hair)
        for sign in [-1,1]: self.add('HairSide'+str(sign),'Head',(sign*.65,.83,.2),(.17,.67,.8),hair)
        self.add('HairTop','Head',(0,1.24,.1),(1.44,.22,1.22),hair)
    def add(self,name,bone,pos,size,color=None,shape='box',rot=(0,0,0),mat='SmoothPlastic'):
        self.model['parts'].append(dict(name=name,bone=bone,shape=shape,position=list(pos),size=list(size),rotation=list(rot),color=color or self.cloth,material=mat))
        return self
    def remove(self,*prefixes):
        self.model['parts']=[p for p in self.model['parts'] if not p['name'].startswith(prefixes)]
        return self
    def pose(self,**bones):
        self.model['poses']['ready'].update({k:list(v) for k,v in bones.items()});return self
    def robe(self,color=None,sleeves=True):
        color=color or self.cloth
        self.remove('Breastplate','Chest','LeftShoulder','RightShoulder','Back','LeftBracer','RightBracer')
        self.add('RobeFront','Torso',(0,.02,-.60),(1.95,1.59,.17),color,mat='Fabric')
        for sign in [-1,1]:
            self.add('RobeLapel'+str(sign),'Torso',(sign*.28,.27,-.73),(.22,1.08,.08),self.gold,rot=(0,0,sign*24),mat='Fabric')
            bone='LeftLeg' if sign<0 else 'RightLeg'
            self.add('RobeSplit'+str(sign),bone,(0,-.57,-.75),(.93,1.46,.12),color,mat='Fabric')
            self.add('RobeHem'+str(sign),bone,(0,-1.27,-.77),(.94,.10,.13),self.gold,mat='Fabric')
            if sleeves:
                arm='LeftArm' if sign<0 else 'RightArm'
                self.add('WideSleeve'+str(sign),arm,(0,-.76,.13),(1.12,.90,1.12),color,mat='Fabric')
        return self
    def beard(self,color=None,length=.55,width=.65):
        self.add('Beard','Head',(0,.18-length/2,-.76),(width,length,.23),color or self.hair)
        for sign in [-1,1]:self.add('Mustache'+str(sign),'Head',(sign*.19,.40,-.68),(.39,.12,.12),color or self.hair,rot=(0,0,sign*12))
        return self
    def bun(self,color=None,height=.45):
        self.add('HairBun','Head',(0,1.43,.26),(.57,height,.58),color or self.hair)
        self.add('BunBand','Head',(0,1.50,.26),(.62,.08,.63),self.gold,mat='Metal');return self
    def crown(self,height=.45,color=None):
        self.add('CrownBand','Head',(0,1.23,0),(1.5,.20,1.29),color or self.gold,mat='Metal')
        self.add('CrownFront','Head',(0,1.45,-.5),(.77,height,.16),color or self.gold,mat='Metal')
        self.add('CrownJade','Head',(0,1.43,-.61),(.20,.22,.09),self.cloth,rot=(0,0,45));return self
    def card(self,name,bone='LeftArm',pos=(0,-1.30,-.82),color='#E7D9B6',rot=(0,0,0)):
        self.add(name,bone,pos,(.44,.65,.055),color,rot=rot)
        self.add(name+'Seal',bone,(pos[0],pos[1],pos[2]-.039),(.17,.20,.025),self.cloth,rot=rot);return self
    def sword(self,name='Sword',bone='RightArm',pos=(0,-1.23,-.69),length=1.8,color='#D9E2EA',width=.30):
        x,y,z=pos
        self.add(name+'Grip',bone,(x,y,z),(.18,.45,.18),self.hair)
        self.add(name+'Guard',bone,(x,y+.30,z),(.72,.13,.24),self.gold,mat='Metal')
        self.add(name+'Blade',bone,(x,y+.40+length/2,z),(width,length,.13),color,mat='Metal')
        for sign in [-1,1]:self.add(name+'Tip'+str(sign),bone,(x+sign*width/4,y+.40+length+.20,z),(.13,.40,width/2),color,'wedge',rot=(0,-sign*90,0),mat='Metal')
        return self
    def spear(self,name='Spear',bone='RightArm',length=4.8,color='#D4DCE3'):
        self.add(name+'Shaft',bone,(0,-.40,-.69),(.14,length,.14),self.cloth,'cylinder',mat='Metal')
        y=-.40+length/2
        self.add(name+'Socket',bone,(0,y,-.69),(.27,.24,.27),self.gold,'cylinder',mat='Metal')
        for sign in [-1,1]:self.add(name+'Point'+str(sign),bone,(sign*.11,y+.49,-.69),(.17,.85,.22),color,'wedge',rot=(0,-sign*90,0),mat='Metal')
        self.grip(bone);return self
    def grip(self,bone='RightArm'):
        self.add('GripPalm'+bone,bone,(.21,-1.34,-.59),(.27,.38,.27),self.skin)
        self.add('GripFingers'+bone,bone,(.035,-1.34,-.80),(.40,.32,.16),self.skin)
        return self
    def cape(self,color=None,length=1.6,width=1.75):
        for sign in [-1,0,1]:self.add('Cape'+str(sign),'Torso',(sign*width/3,.65-length/2,.79),(width/3+.07,length,.12),color or self.cloth,rot=(-10,0,sign*5),mat='Fabric')
        return self
    def scale(self,x=1,y=1,z=1):
        # Uniform across joint coordinates and geometry keeps weld/joint relationships intact.
        for p in self.model['bones']+self.model['parts']:
            for key in ['position','size','center']:
                if key in p:p[key]=[v*s for v,s in zip(p[key],[x,y,z])]
        return self
    def done(self):return self.model
