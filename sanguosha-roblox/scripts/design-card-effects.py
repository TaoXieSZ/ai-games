"""Author the art-preview catalog; card ids and text come from the existing art library."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
CARDS = json.loads((ROOT / 'data/game-card-art-v1.json').read_text())
# id: color, accent, icon, visual intent. The animation modules own geometry.
DESIGNS = {
'fire_sha': ('#FF7040','#FFD487','fire','火焰包裹攻击轨迹，命中后火星外散'),
 'thunder_sha':('#A891FF','#DEEEFF','storm','电弧沿轨迹突进，落点分叉放电'),
'jiu':('#DDA65E','#F8E5AD','wine','酒樽升起，金色光流汇入胸口'),
'juedou':('#ECA258','#FFDED2','duel','双向刀光交替，目标间形成对决连线'),
'wuxie':('#83DBF2','#EEE4FF','ward','蓝色法印展开，将来袭牌影抵消'),
'shunshou':('#5EE0C7','#F6DC99','transfer','目标牌沿弧线飞回施放者'),
'guohe':('#E78F69','#FFE4AB','shatter','目标牌出现裂纹，碎片向外散开'),
'lebusishu':('#DF91D1','#FFE3A8','seal','粉金符印落下，封住目标脚下区域'),
'bingliang':('#C5AC65','#EBDFBC','grain','粮袋与粮草标记被封锁，留下断粮印记'),
'tiesuo':('#77BCC8','#DFECF2','chain','两处目标之间逐节连起铁索'),
'nanman':('#CB7948','#F2D483','charge','三道冲锋轨迹向外推进，扬起尘土'),
'taoyuan':('#F298B6','#98EDBD','blossom','三处桃花同时绽放，恢复光流向上升起'),
'wugu':('#E9C665','#A8DCA4','harvest','五张牌扇形展开，再依次分向各处'),
'wuzhong':('#63D5CA','#F4E5B4','draw','空印记中出现两张牌，飞入施放者'),
'jiedao':('#BCABE7','#F0C89A','redirect','借出的刀影转向第二个目标，显示折线路径'),
'huogong':('#EE7549','#FFD586','fire','牌面先亮起，随后目标周围燃起火焰'),
'shandian':('#B79AF5','#EFF5FF','storm','雷云蓄光后降下分叉雷电，留下放电环'),
'zhuge_crossbow':('#CB9B5F','#F1D298','weapon','连弩连续发射三道弩矢'),
'double_swords':('#DFB980','#9DCBEA','weapon','双剑交错，伴随两侧牌影交换'),
'green_dragon_blade':('#68C89B','#E8D48B','weapon','青龙刀光形成前后两次追击'),
'qinggang_sword':('#8BBEDD','#EFFAFF','weapon','青色剑光穿过并瓦解护盾'),
'serpent_spear':('#ADABDE','#E4EFFF','weapon','两张牌汇成一束蛇矛刺击'),
'stone_axe':('#D9A06C','#F3D3B0','weapon','两张牌消散后，巨斧震碎防御环'),
'halberd':('#D4A153','#F6DDB2','weapon','戟光分向三个目标，逐一亮起命中印记'),
'kylin_bow':('#DDA551','#91D7B1','weapon','金色弓影射向坐骑标记，令标记离场'),
'ice_sword':('#8EE4F0','#E9FFFF','weapon','两张目标牌结冰，再碎成冰晶'),
'fire_fan':('#EF8357','#FBD07F','weapon','朱雀扇展开，普通轨迹转成火焰'),
'ancient_scimitar':('#CFA365','#FFE9B8','weapon','空牌框亮起，厚重刀光追加爆点'),
'eight_trigrams':('#DECB8A','#F5E5C8','armor','八卦盘旋转，红色判定印记点亮护环'),
'renwang_shield':('#86B8C9','#CEE1DF','armor','盾面张开，黑色来袭轨迹在外侧碎裂'),
'vine_armor':('#8FC67B','#E3C184','armor','藤枝编成防护网，拦截普通来袭轨迹'),
'silver_lion':('#CEE3EC','#F6D68D','armor','狮形护印将多道冲击收束为一道'),
'red_hare':('#EB6E48','#FFCB7E','mount','赤红蹄迹前冲，距离减一印记闪现'),
'dayuan':('#BD9667','#EFDBAA','mount','沙金蹄迹卷起尘粒，距离减一印记闪现'),
'zixing':('#AF88DF','#E4C4F5','mount','紫色鬃光与蹄迹前冲，距离减一印记闪现'),
'dilu':('#B6DADF','#F1F2D5','mount','白色水纹绕足展开，距离加一印记闪现'),
'jueying':('#8C96D8','#CED6FA','mount','深蓝残影向后拉开，距离加一印记闪现'),
'zhuahuang_feidian':('#E3C054','#FFF1B6','mount','金色电纹蹄迹散开，距离加一印记闪现'),
'hualiu':('#D29491','#EDD4A8','mount','玫金护环围住蹄迹，距离加一印记闪现'),
}
PROPS = dict(zip([c['id'] for c in CARDS if c['category']=='equipment'],
 ['crossbow','dual_swords','glaive','sword','spear','axe','halberd','bow','ice_sword','fan','scimitar','bagua','shield','vine','lion']+['horse']*7))
BASE = {
'sha':dict(id='slash',duration=1.15,telegraph=.22,impact=.42,color='#F4B45F',accent='#F66D58',radius=0,icon='slash',visual='单体攻击，按武器展示刀光、箭矢或牌影'),
'shan':dict(id='dodge',duration=1,telegraph=.08,impact=.25,color='#78DDEB',accent='#D8FBFF',radius=0,icon='dodge',visual='身体残影与速度线'),
 'tao':dict(id='heal',duration=1.6,telegraph=.15,impact=.55,color='#75E3A1',accent='#F6BCBD',radius=0,icon='heal',visual='桃花与恢复光流'),
'wanjian':dict(id='arrows',duration=2,telegraph=.55,impact=.85,color='#F4B45F',accent='#F66D58',radius=2.6,icon='arrows',visual='范围箭雨与落点涟漪'),
}
effects=[]
for card in CARDS:
 cid=card['id'];base=BASE.get(cid)
 if base:
  effect=dict(base)
 else:
  color,accent,icon,visual=DESIGNS[cid]
  duration=3.0 if cid=='shandian' else 2.6 if cid in ('lebusishu','bingliang','tiesuo','wugu','nanman','taoyuan','jiedao') else 2.2
  effect=dict(id=cid,duration=duration,telegraph=.30,impact=.85,color=color,accent=accent,radius=2.6 if cid in ('nanman','taoyuan','wugu','tiesuo','halberd')else 0,icon=icon,visual=visual)
 effect.update(cardId=cid,label=card['name'],category=card['category'],motif=effect['id'])
 if cid in PROPS:
  effect['prop']=PROPS[cid];effect['slot']='mount' if PROPS[cid]=='horse' else 'armor' if PROPS[cid] in ('bagua','shield','vine','lion')else 'weapon'
  if effect['slot']=='mount':effect['distanceDelta']=-1 if cid in ('red_hare','dayuan','zixing')else 1
 effect['pose']='attack' if effect.get('slot')=='weapon' or cid in ('sha','fire_sha','thunder_sha','juedou','nanman','wanjian','huogong','jiedao')else 'ready'
 effect['cue']={'duration':min(effect['duration'],1.35 if len(card['name'])>2 else 1.05),'height':2.1}
 effects.append(effect)
assert len(effects)==43 and len({e['cardId']for e in effects})==43
payload={'version':3,'activityRadius':12,'maxActivePerHero':1,'effects':effects}
(ROOT/'data/hero-effects-v1.json').write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n')
print('Authored43 effects:6basic,15trick,22equipment; equipment has equip/trigger preview modes')
