"""Validate the complete cast and authored/native/GLB export correspondence."""
import hashlib,json,math,struct,subprocess
from pathlib import Path
import xml.etree.ElementTree as E
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs/art/cast-polish-v3'
models=json.loads((ROOT/'data/hero-models-v1.json').read_text())
baseline=json.loads(subprocess.check_output(['git','show','611da85:sanguosha-roblox/data/hero-models-v1.json'],cwd=ROOT))
old={m['id']:m for m in baseline}; assert len(models)==25
changed=[m['id']for m in models if m!=old[m['id']]];assert len(changed)==25,changed
place=E.parse(ROOT/'models/hero-models-v1/hero-playground.rbxlx')
workshop=E.parse(ROOT/'models/hero-models-v1/hero-model-workshop.rbxlx')
rows=[]
for m in models:
 names={p['name'] for p in m['parts']};bones={b['name']for b in m['bones']};assert len(bones)==7 and len(names)==len(m['parts'])
 assert all(p['bone']in bones and all(math.isfinite(v)for k in ['position','size','rotation']for v in p[k]) and min(p['size'])>0 for p in m['parts'])
 byname={p['name']:p for p in m['parts']};motion=[]
 for g in m['attachmentMotion']:
  assert all(n in names and byname[n]['bone']==g['bone']for n in g['parts']);motion.extend(g['parts'])
 assert len(set(motion))==len(motion),('overlapping motion groups',m['id'])
 path=ROOT/'models/hero-models-v1'/m['id'];native=E.parse(path.with_suffix('.rbxmx'))
 xmlnames={n.text for n in native.findall('.//string[@name="Name"]')};assert names<=xmlnames
 assert len(native.findall('.//Item[@class="Motor6D"]'))==6
 assert len(native.findall('.//Item[@class="Humanoid"]'))==1
 raw=path.with_suffix('.glb').read_bytes();assert raw[:4]==b'glTF';glb=json.loads(raw[20:20+struct.unpack_from('<I',raw,12)[0]])
 assert names<={n.get('name')for n in glb['nodes']}
 assert len([n for n in glb['nodes'] if n.get('name')in bones])==7
 assert [a['name']for a in glb['animations']]==['Idle','Walk','Attack']
 for tree in [place,workshop]:
  candidates=[item for item in tree.findall('.//Item[@class="Model"]') if item.find('./Properties/string[@name="Name"]') is not None and item.find('./Properties/string[@name="Name"]').text in {m['id'],m['name']+'_'+m['id']}]
  assert candidates,m['id']
  assert names<={n.text for n in candidates[0].findall('.//string[@name="Name"]')}
 rows.append(dict(id=m['id'],name=m['name'],parts=len(names),beforeParts=len(old[m['id']]['parts']),rigNodes=7,motors=6,attachmentGroups=len(m['attachmentMotion']),glbBytes=len(raw),glbSha256=hashlib.sha256(raw).hexdigest()))
source=(ROOT/'models/hero-models-v1/hero-playground.rbxlx').read_text()
assert all(t in source for t in ['HeroEffects','slash','dodge','heal','arrows'])
OUT.mkdir(exist_ok=True,parents=True);(OUT/'export-report.json').write_text(json.dumps(dict(result='pass',baseline='611da85',changedHeroes=changed,heroes=rows),ensure_ascii=False,indent=2)+'\n')
print('PASS all25 changed; native/GLB/workshop/playground parts, rigid7node rigs,6motors,3animations, motion groups and effects')
