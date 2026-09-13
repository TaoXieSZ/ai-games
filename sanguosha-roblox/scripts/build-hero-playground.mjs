import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const modelDir = path.join(root, 'models/hero-models-v1');
const workshopDir = path.join(root, 'workshop');
const outputPath = path.join(modelDir, 'hero-playground.rbxlx');

const heroArt = JSON.parse(readFileSync(path.join(root, 'data/hero-art-v1.json'), 'utf8'));
const modelDataPath = path.join(root, 'data/hero-models-v1.json');
const modelData = existsSync(modelDataPath) ? JSON.parse(readFileSync(modelDataPath, 'utf8')) : [];
const modelById = new Map(modelData.map((model) => [model.id, model]));
const templateFiles = readdirSync(modelDir)
  .filter((name) => name.endsWith('.rbxmx'))
  .sort();
const availableIds = new Set(templateFiles.map((name) => name.replace(/\.rbxmx$/, '')));

const explicitActionTypes = new Map([
  ['cao_cao', 'sword'],
  ['sima_yi', 'fan-card'],
  ['xiahou_dun', 'sword'],
  ['zhang_liao', 'spear'],
  ['xu_chu', 'hammer'],
  ['guo_jia', 'fan-card'],
  ['zhen_ji', 'fan-card'],
  ['liu_bei', 'sword'],
  ['guan_yu', 'sword'],
  ['zhang_fei', 'spear'],
  ['zhuge_liang', 'fan-card'],
  ['zhao_yun', 'spear'],
  ['ma_chao', 'spear'],
  ['huang_yueying', 'fan-card'],
  ['sun_quan', 'sword'],
  ['gan_ning', 'sword'],
  ['lu_meng', 'fan-card'],
  ['huang_gai', 'hammer'],
  ['zhou_yu', 'fan-card'],
  ['da_qiao', 'fan-card'],
  ['lu_xun', 'fan-card'],
  ['sun_shangxiang', 'bow'],
  ['hua_tuo', 'fan-card'],
  ['lu_bu', 'spear'],
  ['diao_chan', 'fan-card'],
]);


if (templateFiles.length === 0) {
  throw new Error(`No .rbxmx hero templates found in ${path.relative(root, modelDir)}.`);
}

const catalog = heroArt.map((hero) => ({
  id: hero.id,
  name: hero.name,
  faction: hero.faction,
  hp: hero.hp,
  title: hero.title,
  template: hero.id,
  available: availableIds.has(hero.id),
  actionType: actionTypeFor(hero.id, modelById.get(hero.id)),
  ready: modelById.get(hero.id)?.poses?.ready || {},
}));

for (const id of availableIds) {
  if (!catalog.some((hero) => hero.id === id)) {
    const model = modelById.get(id);
    catalog.push({
      id,
      name: model?.name || id,
      faction: 'other',
      hp: 4,
      title: '3D Template',
      template: id,
      available: true,
      actionType: actionTypeFor(id, model),
      ready: model?.poses?.ready || {},
    });
  }
}

let nextRef = 0;
const ref = () => `RBXHP${++nextRef}`;
const xmlEscape = (text) => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const item = (className, name, children = '', properties = '') => `<Item class="${className}" referent="${ref()}"><Properties><string name="Name">${xmlEscape(name)}</string>${properties}</Properties>${children}</Item>`;
const prop = {
  bool: (name, value) => `<bool name="${name}">${value ? 'true' : 'false'}</bool>`,
  float: (name, value) => `<float name="${name}">${value}</float>`,
  int: (name, value) => `<int name="${name}">${value}</int>`,
  token: (name, value) => `<token name="${name}">${value}</token>`,
  vector3: (name, [x, y, z]) => `<Vector3 name="${name}"><X>${x}</X><Y>${y}</Y><Z>${z}</Z></Vector3>`,
  color: (name, [r, g, b]) => `<Color3 name="${name}"><R>${r}</R><G>${g}</G><B>${b}</B></Color3>`,
  cframe: (name, [x, y, z]) => `<CoordinateFrame name="${name}"><X>${x}</X><Y>${y}</Y><Z>${z}</Z><R00>1</R00><R01>0</R01><R02>0</R02><R10>0</R10><R11>1</R11><R12>0</R12><R20>0</R20><R21>0</R21><R22>1</R22></CoordinateFrame>`,
  protectedString: (name, value) => `<ProtectedString name="${name}">${xmlEscape(value)}</ProtectedString>`,
};

function readScript(file) {
  return readFileSync(path.join(workshopDir, file), 'utf8');
}

function longBracketLua(value) {
  let eq = '=';
  while (value.includes(`]${eq}]`)) eq += '=';
  return `[${eq}[${value}]${eq}]`;
}

function catalogModuleSource() {
  const json = JSON.stringify(catalog);
  return `local HttpService = game:GetService("HttpService")\nreturn HttpService:JSONDecode(${longBracketLua(json)})\n`;
}

function actionTypeFor(id, model) {
  if (explicitActionTypes.has(id)) return explicitActionTypes.get(id);
  if (!model || !Array.isArray(model.parts)) return 'sword';
  const names = model.parts.map((part) => String(part.name || '').toLowerCase()).join(' ');
  if (names.includes('hammer') || names.includes('mallet')) return 'hammer';
  if (names.includes('bow')) return 'bow';
  if (names.includes('spear') || names.includes('lance') || names.includes('halberd')) return 'spear';
  if (names.includes('fan') || names.includes('card') || names.includes('scroll') || names.includes('jadebrace') || names.includes('bamboo')) return 'fan-card';
  if (names.includes('sword') || names.includes('blade') || names.includes('dao') || names.includes('knife')) return 'sword';
  return 'fan-card';
}

function remapTemplateXml(fileName) {
  const id = fileName.replace(/\.rbxmx$/, '');
  const xml = readFileSync(path.join(modelDir, fileName), 'utf8');
  const match = xml.match(/<Item class="Model"[\s\S]*<\/Item>/);
  if (!match) throw new Error(`${fileName} does not contain a Model item.`);
  let model = match[0];
  const refs = [...new Set([
    ...[...model.matchAll(/referent="([^"]+)"/g)].map((m) => m[1]),
    ...[...model.matchAll(/<Ref name="[^"]+">([^<]+)<\/Ref>/g)].map((m) => m[1]),
  ])];
  for (const oldRef of refs.sort((a, b) => b.length - a.length)) {
    model = model.replaceAll(oldRef, `RBX_TEMPLATE_${id}_${oldRef.replace(/[^A-Za-z0-9_]/g, '_')}`);
  }
  model = model.replace(/<string name="Name">[\s\S]*?<\/string>/, `<string name="Name">${xmlEscape(id)}</string>`);
  return model;
}

function part(name, size, cframe, color, material = 272, canCollide = true) {
  return item('Part', name, '', [
    prop.token('shape', 1),
    prop.bool('Anchored', true),
    prop.bool('CanCollide', canCollide),
    prop.bool('CanTouch', false),
    prop.bool('CanQuery', true),
    prop.bool('Massless', false),
    prop.float('Transparency', 0),
    prop.token('Material', material),
    prop.vector3('size', size),
    prop.cframe('CFrame', cframe),
    prop.color('Color', color),
  ].join(''));
}

function boundaryRing() {
  const pieces = [];
  const radius = 12;
  for (let i = 0; i < 32; i += 1) {
    const a = (i / 32) * Math.PI * 2;
    const x = Math.cos(a) * radius;
    const z = Math.sin(a) * radius;
    pieces.push(part(`MovementRadius_${i + 1}`, [0.25, 0.08, 1.3], [x, 0.82, z], [0.7, 0.48, 0.22], 1088, false));
  }
  return pieces.join('');
}

const templateItems = templateFiles.map(remapTemplateXml).join('\n');
const serverScript = item('Script', 'HeroPlayground', '', prop.protectedString('Source', readScript('HeroPlayground.server.luau')));
const clientScript = item('LocalScript', 'HeroPlayground', '', prop.protectedString('Source', readScript('HeroPlayground.client.luau')));
const catalogScript = item('ModuleScript', 'HeroPlaygroundCatalog', '', prop.protectedString('Source', catalogModuleSource()));
const remote = item('RemoteFunction', 'HeroPlaygroundRemote');

const workspace = item('Workspace', 'Workspace', [
  part('HeroPlaygroundFloor', [36, 1, 36], [0, -0.5, 0], [0.16, 0.15, 0.13], 512, true),
  part('PlayerReviewStand', [6, 0.4, 6], [0, 0.2, 0], [0.33, 0.21, 0.13], 272, true),
  part('NpcReviewStand', [6, 0.4, 6], [8, 0.2, -5], [0.18, 0.24, 0.34], 272, true),
  boundaryRing(),
].join('\n'));
const serverStorage = item('ServerStorage', 'ServerStorage', item('Folder', 'HeroTemplates', templateItems));
const replicatedStorage = item('ReplicatedStorage', 'ReplicatedStorage', `${remote}\n${catalogScript}`);
const serverScriptService = item('ServerScriptService', 'ServerScriptService', serverScript);
const starterPlayerScripts = item('StarterPlayerScripts', 'StarterPlayerScripts', clientScript);
const starterPlayer = item('StarterPlayer', 'StarterPlayer', starterPlayerScripts, [
  prop.float('CameraMaxZoomDistance', 18),
  prop.float('CameraMinZoomDistance', 7),
].join(''));
const lighting = item('Lighting', 'Lighting', '', [
  prop.float('Brightness', 2.2),
  prop.float('ClockTime', 14),
  prop.color('Ambient', [0.48, 0.48, 0.48]),
  prop.color('OutdoorAmbient', [0.56, 0.52, 0.48]),
].join(''));

const xml = `<roblox version="4">\n${workspace}\n${serverStorage}\n${replicatedStorage}\n${serverScriptService}\n${starterPlayer}\n${lighting}\n</roblox>\n`;

mkdirSync(modelDir, { recursive: true });
writeFileSync(outputPath, xml);

const availableCount = catalog.filter((hero) => hero.available).length;
console.log(`Built ${path.relative(root, outputPath)} with ${availableCount}/${catalog.length} available hero templates.`);
