"""Readable, individually authored Roblox expressions on the existing block heads."""
import math

# eye width/height, spacing, brow slope/thickness, mouth expression
PROFILES = {
 'cao_cao': (.13,.16,.29,12,.085,'smirk'),
 'sima_yi': (.15,.105,.30,-5,.060,'smirk'),
 'xiahou_dun': (.14,.19,.28,24,.105,'grim'),
 'zhang_liao': (.12,.18,.29,15,.078,'neutral'),
 'xu_chu': (.16,.21,.31,7,.100,'grin'),
 'guo_jia': (.13,.18,.28,-8,.055,'smile'),
 'zhen_ji': (.15,.245,.29,5,.044,'quiet'),
 'liu_bei': (.13,.18,.29,-6,.065,'smile'),
 'guan_yu': (.18,.10,.30,12,.100,'neutral'),
 'zhang_fei': (.17,.23,.31,28,.130,'shout'),
 'zhuge_liang': (.13,.15,.28,-4,.055,'smile'),
 'zhao_yun': (.12,.215,.28,14,.067,'neutral'),
 'ma_chao': (.13,.19,.29,19,.078,'grim'),
 'huang_yueying': (.14,.21,.29,17,.062,'focused'),
 'sun_quan': (.14,.18,.30,11,.080,'neutral'),
 'gan_ning': (.14,.19,.31,-10,.088,'grin'),
 'lu_meng': (.13,.14,.30,8,.067,'grim'),
 'huang_gai': (.15,.125,.30,19,.100,'grim'),
 'zhou_yu': (.125,.18,.285,-3,.060,'smirk'),
 'da_qiao': (.155,.25,.29,-5,.045,'smile'),
 'lu_xun': (.12,.22,.275,6,.052,'neutral'),
 'sun_shangxiang': (.14,.22,.29,20,.069,'focused'),
 'hua_tuo': (.15,.105,.30,-12,.085,'smile'),
 'lu_bu': (.14,.16,.31,26,.110,'grim'),
 'diao_chan': (.155,.235,.295,11,.045,'quiet'),
}
FEMALE={'zhen_ji','huang_yueying','da_qiao','sun_shangxiang','diao_chan'}

def refine_face(model):
    hero=model['id']; w,h,spacing,slope,thickness,mouth=PROFILES[hero]
    head=next(b for b in model['bones'] if b['name']=='Head')
    scale=[head['size'][i]/[1.38,1.25,1.2][i] for i in range(3)]
    legacy={'Eye-1','Eye1','Brow-1','Brow1','Mouth'}
    model['parts']=[p for p in model['parts'] if not (p['bone']=='Head' and p['name'] in legacy)]
    ink='#22202A' if hero in FEMALE else '#202126'
    brow='#B8B8B2' if hero in {'hua_tuo','huang_gai'} else ink
    def add(name,pos,size,color=ink,angle=0,shape='box'):
        model['parts'].append(dict(name='Face'+name,bone='Head',shape=shape,
          position=[v*s for v,s in zip(pos,scale)],size=[v*s for v,s in zip(size,scale)],
          rotation=[0,0,angle],color=color,material='SmoothPlastic'))
    for sign in [-1,1]:
        if hero=='xiahou_dun' and sign<0:continue # keep the authored eyepatch visible
        x=sign*spacing
        add('Eye'+str(sign),(x,.70,-.634),(w,h,.064),shape='sphere')
        add('EyeLight'+str(sign),(x-.023,.70+h*.22,-.669),(.035,.042,.013),'#FFF3DD',shape='sphere')
        # Brow arc is two connected facets, kept separate from the eye.
        for segment in [-1,1]:
            bx=x+segment*.075
            y=.91+segment*.075*math.tan(math.radians(sign*slope))
            add('Brow'+str(sign)+str(segment),(bx,y,-.644),(.19,thickness,.038),brow,sign*slope-segment*4)
        if hero in FEMALE:
            add('Lid'+str(sign),(x,.70+h*.43,-.672),(w+.09,.039,.028),ink,sign*9)
            add('Lash'+str(sign),(x+sign*(w*.5+.033),.70+h*.5,-.669),(.12,.033,.028),ink,sign*27)
    if mouth=='shout':return model # retain Zhang Fei's existing open mouth and teeth
    if mouth=='grin':
        add('Mouth',(0,.36,-.638),(.34,.135,.043))
        add('Teeth',(0,.394,-.665),(.27,.043,.018),'#F2E9D6')
    elif mouth=='smirk':
        add('Mouth',(.03,.36,-.644),(.23,.037,.028),angle=8)
        add('MouthCorner',(.15,.394,-.644),(.04,.072,.028))
    elif mouth=='smile':
        add('Mouth',(0,.35,-.644),(.18,.032,.028))
        for sign in [-1,1]:add('Smile'+str(sign),(sign*.10,.371,-.644),(.083,.029,.028),angle=sign*28)
    else:
        add('Mouth',(0,.36,-.644),(.14 if mouth=='quiet' else .23,.035,.028), '#89564F' if hero in FEMALE else ink,angle=-5 if mouth=='focused' else 0)
    return model
