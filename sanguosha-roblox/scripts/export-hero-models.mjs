import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const dataPath = path.join(projectRoot, 'data/hero-models-v1.json');
const outputDir = path.join(projectRoot, 'models/hero-models-v1');

const RIG_PART_NAMES = new Map([
  ['Root', 'HumanoidRootPart'],
  ['Torso', 'Torso'],
  ['Head', 'Head'],
  ['LeftArm', 'Left Arm'],
  ['RightArm', 'Right Arm'],
  ['LeftLeg', 'Left Leg'],
  ['RightLeg', 'Right Leg'],
]);

const MOTOR_NAMES = new Map([
  ['Torso', 'RootJoint'],
  ['Head', 'Neck'],
  ['RightArm', 'Right Shoulder'],
  ['LeftArm', 'Left Shoulder'],
  ['RightLeg', 'Right Hip'],
  ['LeftLeg', 'Left Hip'],
]);

const MATERIAL_TOKEN = {
  SmoothPlastic: 272,
  Fabric: 1312,
  Metal: 1088,
};

const SHAPE_TOKEN = {
  box: 1,
  sphere: 0,
  cylinder: 2,
};

const ACTION_PROFILES = new Map([
  ['cao_cao', { actionType: 'sword', actionHand: 'right' }],
  ['sima_yi', { actionType: 'fan-card', actionHand: 'left' }],
  ['xiahou_dun', { actionType: 'sword', actionHand: 'right' }],
  ['zhang_liao', { actionType: 'spear', actionHand: 'both' }],
  ['xu_chu', { actionType: 'hammer', actionHand: 'left' }],
  ['guo_jia', { actionType: 'fan-card', actionHand: 'both' }],
  ['zhen_ji', { actionType: 'fan-card', actionHand: 'right' }],
  ['liu_bei', { actionType: 'fan-card', actionHand: 'both' }],
  ['guan_yu', { actionType: 'sword', actionHand: 'right' }],
  ['zhang_fei', { actionType: 'spear', actionHand: 'right' }],
  ['zhuge_liang', { actionType: 'fan-card', actionHand: 'right' }],
  ['zhao_yun', { actionType: 'spear', actionHand: 'right' }],
  ['ma_chao', { actionType: 'spear', actionHand: 'right' }],
  ['huang_yueying', { actionType: 'fan-card', actionHand: 'right' }],
  ['sun_quan', { actionType: 'sword', actionHand: 'right' }],
  ['gan_ning', { actionType: 'sword', actionHand: 'right' }],
  ['lu_meng', { actionType: 'fan-card', actionHand: 'left' }],
  ['huang_gai', { actionType: 'hammer', actionHand: 'right' }],
  ['zhou_yu', { actionType: 'fan-card', actionHand: 'left' }],
  ['da_qiao', { actionType: 'fan-card', actionHand: 'right' }],
  ['lu_xun', { actionType: 'fan-card', actionHand: 'left' }],
  ['sun_shangxiang', { actionType: 'bow', actionHand: 'left' }],
  ['hua_tuo', { actionType: 'fan-card', actionHand: 'left' }],
  ['lu_bu', { actionType: 'spear', actionHand: 'right' }],
  ['diao_chan', { actionType: 'fan-card', actionHand: 'left' }],
]);

const ANIMATION_TIMES = {
  Idle: sampleRange(0, 2, 17),
  Walk: sampleRange(0, 1, 25),
  Attack: sampleRange(0, 0.8, 25),
};

function usage() {
  return [
    'Usage: node scripts/export-hero-models.mjs',
    `Reads ${path.relative(projectRoot, dataPath)} and writes ${path.relative(projectRoot, outputDir)}.`,
  ].join('\n');
}

function fail(message) {
  console.error(`${message}\n\n${usage()}`);
  process.exit(1);
}

function main() {
  if (!existsSync(dataPath)) {
    fail('Missing data/hero-models-v1.json; exporter refuses to generate placeholder models.');
  }

  const heroes = JSON.parse(readFileSync(dataPath, 'utf8'));
  validateHeroes(heroes);
  mkdirSync(outputDir, { recursive: true });

  const manifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    source: 'data/hero-models-v1.json',
    conventions: {
      coordinates: 'Y-up, heroes face -Z.',
      glb: 'Rigid hierarchical nodes; no skinning. Bone meshes render only when bone.visible is not false.',
      wedge: 'Y-up triangular prism ramp: full height at local +Z rear edge, low edge at local -Z front, length along Z, width along X.',
      cylinder: 'GLB cylinders are generated along local Y. Roblox CylinderMesh defaults along X, so rbxmx cylinder decorations rotate 90 degrees around Z.',
      rbxmx: 'Humanoid R6 with seven standard body parts, six Motor6D joints, decoration parts welded to their owner body part.',
    },
    counts: {
      heroes: heroes.length,
      glb: 0,
      rbxmx: 0,
      workshopModels: 0,
      triangles: 0,
      vertices: 0,
    },
    heroes: [],
  };

  const workshopEntries = [];
  for (const [index, hero] of heroes.entries()) {
    const glb = buildGlb(hero);
    const rbx = buildRbxmxModel(hero, { refStart: 1000 + index * 10000 });
    const worldOffset = [(index % 4) * 8 - 12, 0, Math.floor(index / 4) * 8];
    const workshopModel = buildRbxmxModel(hero, {
      refStart: 100000 + index * 10000,
      worldOffset,
    });
    const glbFile = `${hero.id}.glb`;
    const rbxFile = `${hero.id}.rbxmx`;
    writeFileSync(path.join(outputDir, glbFile), glb.buffer);
    writeFileSync(path.join(outputDir, rbxFile), rbx.xml);
    workshopEntries.push({ hero, xmlItem: workshopModel.xmlItem, worldOffset });

    manifest.counts.glb += 1;
    manifest.counts.rbxmx += 1;
    manifest.counts.triangles += glb.stats.triangles;
    manifest.counts.vertices += glb.stats.vertices;
    manifest.heroes.push({
      id: hero.id,
      name: hero.name,
      files: {
        glb: glbFile,
        rbxmx: rbxFile,
      },
      bones: hero.bones.length,
      parts: hero.parts.length,
      glb: glb.stats,
      rbxmx: rbx.stats,
    });
  }

  const workshopXml = buildWorkshop(workshopEntries, heroes);
  writeFileSync(path.join(outputDir, 'hero-model-workshop.rbxlx'), workshopXml);
  manifest.counts.workshopModels = workshopEntries.length;
  writeFileSync(path.join(outputDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(path.join(outputDir, 'README.md'), readmeFor(manifest));

  console.log(`Exported ${heroes.length} hero models to ${path.relative(projectRoot, outputDir)}.`);
  console.log(`GLB ${manifest.counts.glb}, RBXMX ${manifest.counts.rbxmx}, triangles ${manifest.counts.triangles}, vertices ${manifest.counts.vertices}.`);
}

function validateHeroes(value) {
  if (!Array.isArray(value) || value.length === 0) fail('data/hero-models-v1.json must be a non-empty array.');
  const ids = new Set();
  for (const hero of value) {
    if (!hero || typeof hero !== 'object') throw new Error('Each hero must be an object.');
    if (!/^[a-z0-9_/-]+$/i.test(hero.id || '')) throw new Error(`Invalid hero id: ${hero.id}`);
    if (ids.has(hero.id)) throw new Error(`Duplicate hero id: ${hero.id}`);
    ids.add(hero.id);
    if (typeof hero.name !== 'string' || !hero.name) throw new Error(`Hero ${hero.id} needs name.`);
    if (!Array.isArray(hero.bones) || !Array.isArray(hero.parts)) throw new Error(`Hero ${hero.id} needs bones and parts arrays.`);
    const bones = new Map();
    for (const bone of hero.bones) {
      if (!bone || typeof bone.name !== 'string') throw new Error(`Hero ${hero.id} has invalid bone.`);
      if (bones.has(bone.name)) throw new Error(`Hero ${hero.id} duplicates bone ${bone.name}.`);
      bones.set(bone.name, bone);
      assertVec3(bone.position, `${hero.id}.${bone.name}.position`);
      assertVec3(bone.center, `${hero.id}.${bone.name}.center`);
      assertVec3(bone.size, `${hero.id}.${bone.name}.size`);
      assertColor(bone.color, `${hero.id}.${bone.name}.color`);
    }
    for (const bone of hero.bones) {
      if (bone.parent !== null && !bones.has(bone.parent)) throw new Error(`Hero ${hero.id} bone ${bone.name} references missing parent ${bone.parent}.`);
    }
    for (const required of RIG_PART_NAMES.keys()) {
      if (!bones.has(required)) throw new Error(`Hero ${hero.id} is missing required R6 bone ${required}.`);
    }
    for (const part of hero.parts) {
      if (!part || typeof part.name !== 'string') throw new Error(`Hero ${hero.id} has invalid part.`);
      if (!bones.has(part.bone)) throw new Error(`Hero ${hero.id} part ${part.name} references missing bone ${part.bone}.`);
      if (!['box', 'wedge', 'cylinder', 'sphere'].includes(part.shape)) throw new Error(`Hero ${hero.id} part ${part.name} has invalid shape ${part.shape}.`);
      if (!['Metal', 'Fabric', 'SmoothPlastic'].includes(part.material)) throw new Error(`Hero ${hero.id} part ${part.name} has invalid material ${part.material}.`);
      assertVec3(part.position, `${hero.id}.${part.name}.position`);
      assertVec3(part.rotation, `${hero.id}.${part.name}.rotation`);
      assertVec3(part.size, `${hero.id}.${part.name}.size`);
      assertColor(part.color, `${hero.id}.${part.name}.color`);
    }
  }
}

function assertVec3(value, label) {
  if (!Array.isArray(value) || value.length !== 3 || value.some((n) => typeof n !== 'number' || !Number.isFinite(n))) {
    throw new Error(`${label} must be [number, number, number].`);
  }
}

function assertColor(value, label) {
  if (typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value)) throw new Error(`${label} must be #rrggbb.`);
}

function buildGlb(hero) {
  const writer = new GlbWriter();
  const boneNodes = new Map();
  const boneByName = new Map(hero.bones.map((bone) => [bone.name, bone]));
  const worldByBone = new Map();
  const childrenByParent = new Map();
  for (const bone of hero.bones) {
    if (!childrenByParent.has(bone.parent)) childrenByParent.set(bone.parent, []);
    childrenByParent.get(bone.parent).push(bone);
  }
  for (const bone of hero.bones) worldByBone.set(bone.name, boneWorldPosition(bone, boneByName, worldByBone));

  for (const bone of hero.bones) {
    const node = writer.addNode({ name: bone.name, translation: bone.position });
    boneNodes.set(bone.name, node);
  }
  for (const bone of hero.bones) {
    const parentNode = bone.parent ? boneNodes.get(bone.parent) : null;
    if (parentNode !== null) writer.nodes[parentNode].children.push(boneNodes.get(bone.name));
  }

  const sceneRoot = writer.addNode({ name: `${hero.name} Rigid Rig`, children: (childrenByParent.get(null) || []).map((bone) => boneNodes.get(bone.name)) });
  writer.json.scenes.push({ nodes: [sceneRoot] });
  writer.json.scene = 0;

  for (const bone of hero.bones) {
    if (bone.visible === false) continue;
    const material = writer.material(hexToRgb(bone.color), 'SmoothPlastic');
    const geometry = geometryFor('box', bone.size);
    const mesh = writer.mesh(`${bone.name}Body`, geometry, material);
    const visual = writer.addNode({ name: `${bone.name}_BodyMesh`, mesh, translation: bone.center });
    writer.nodes[boneNodes.get(bone.name)].children.push(visual);
    writer.expandWorldBounds(geometry.positions, addVec3(worldByBone.get(bone.name), bone.center), IDENTITY_MAT3);
  }

  const partNodes = new Map();
  const partByName = new Map(hero.parts.map((part) => [part.name, part]));
  const bowArrowNames = new Set(hero.bowMotion?.arrows?.map((entry) => entry.part) || []);

  for (const part of hero.parts) {
    const material = writer.material(hexToRgb(part.color), part.material);
    const geometry = geometryFor(part.shape, part.size);
    const mesh = writer.mesh(part.name, geometry, material);
    const rotation = eulerMatrixDegrees(part.rotation);
    const visual = writer.addNode({
      name: part.name,
      mesh,
      translation: part.position,
      rotation: quatFromEulerDegreesZyx(part.rotation),
    });
    partNodes.set(part.name, visual);
    const parentBone = bowArrowNames.has(part.name) ? hero.bowMotion.bone : part.bone;
    writer.nodes[boneNodes.get(parentBone)].children.push(visual);
    writer.expandWorldBounds(geometry.positions, addVec3(worldByBone.get(part.bone), part.position), rotation);
  }

  addAnimations(writer, hero, boneNodes, partNodes, partByName);
  return writer.finish();
}

class GlbWriter {
  constructor() {
    this.json = {
      asset: { version: '2.0', generator: 'sanguosha-roblox/scripts/export-hero-models.mjs' },
      buffers: [],
      bufferViews: [],
      accessors: [],
      materials: [],
      meshes: [],
      nodes: [],
      scenes: [],
      animations: [],
    };
    this.nodes = this.json.nodes;
    this.bin = [];
    this.byteLength = 0;
    this.materialCache = new Map();
    this.stats = { vertices: 0, triangles: 0, bounds: null };
  }

  addNode(node) {
    const index = this.nodes.length;
    this.nodes.push({ children: [], ...node });
    return index;
  }

  material(rgb, material) {
    const key = `${rgb.join(',')}:${material}`;
    if (this.materialCache.has(key)) return this.materialCache.get(key);
    const index = this.json.materials.length;
    this.json.materials.push({
      name: `${material}_${rgb.map((n) => Math.round(n * 255).toString(16).padStart(2, '0')).join('')}`,
      pbrMetallicRoughness: {
        baseColorFactor: [rgb[0], rgb[1], rgb[2], 1],
        metallicFactor: material === 'Metal' ? 0.55 : 0,
        roughnessFactor: material === 'Fabric' ? 0.9 : 0.58,
      },
    });
    this.materialCache.set(key, index);
    return index;
  }

  mesh(name, geometry, material) {
    const position = this.accessor('positions', new Float32Array(geometry.positions), 'VEC3', 5126);
    const normal = this.accessor('normals', new Float32Array(geometry.normals), 'VEC3', 5126);
    const indices = this.accessor('indices', new Uint16Array(geometry.indices), 'SCALAR', 5123);
    const meshIndex = this.json.meshes.length;
    this.json.meshes.push({
      name,
      primitives: [{ attributes: { POSITION: position, NORMAL: normal }, indices, material }],
    });
    this.stats.vertices += geometry.positions.length / 3;
    this.stats.triangles += geometry.indices.length / 3;
    return meshIndex;
  }

  expandWorldBounds(positions, translation, rotation) {
    this.stats.bounds = mergeBounds(this.stats.bounds, boundsForPositions(positions, translation, rotation));
  }

  accessor(label, typed, type, componentType) {
    align(this, 4);
    const byteOffset = this.byteLength;
    const bytes = Buffer.from(typed.buffer, typed.byteOffset, typed.byteLength);
    this.bin.push(bytes);
    this.byteLength += bytes.byteLength;
    const bufferView = this.json.bufferViews.length;
    this.json.bufferViews.push({ buffer: 0, byteOffset, byteLength: bytes.byteLength, name: label });
    const accessor = this.json.accessors.length;
    const count = type === 'SCALAR' ? typed.length : typed.length / COMPONENTS[type];
    const info = { bufferView, componentType, count, type };
    if (label === 'positions' || label === 'time') {
      const minMax = minMaxForAccessor(typed, type);
      info.min = minMax.min;
      info.max = minMax.max;
    }
    this.json.accessors.push(info);
    return accessor;
  }

  finish() {
    align(this, 4);
    const bin = Buffer.concat(this.bin, this.byteLength);
    this.json.buffers = [{ byteLength: bin.byteLength }];
    const jsonBuffer = Buffer.from(JSON.stringify(this.json));
    const jsonPadding = padding(jsonBuffer.byteLength, 4, 0x20);
    const binPadding = padding(bin.byteLength, 4, 0);
    const total = 12 + 8 + jsonBuffer.byteLength + jsonPadding.length + 8 + bin.byteLength + binPadding.length;
    const header = Buffer.alloc(12);
    header.writeUInt32LE(0x46546c67, 0);
    header.writeUInt32LE(2, 4);
    header.writeUInt32LE(total, 8);
    const jsonHeader = Buffer.alloc(8);
    jsonHeader.writeUInt32LE(jsonBuffer.byteLength + jsonPadding.length, 0);
    jsonHeader.writeUInt32LE(0x4e4f534a, 4);
    const binHeader = Buffer.alloc(8);
    binHeader.writeUInt32LE(bin.byteLength + binPadding.length, 0);
    binHeader.writeUInt32LE(0x004e4942, 4);
    return {
      buffer: Buffer.concat([header, jsonHeader, jsonBuffer, jsonPadding, binHeader, bin, binPadding], total),
      stats: {
        vertices: this.stats.vertices,
        triangles: this.stats.triangles,
        nodes: this.nodes.length,
        meshes: this.json.meshes.length,
        animations: this.json.animations.length,
        bounds: this.stats.bounds,
      },
    };
  }
}

const COMPONENTS = { SCALAR: 1, VEC3: 3, VEC4: 4 };
const IDENTITY_MAT3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];

function align(writer, size) {
  const pad = padding(writer.byteLength, size, 0);
  if (pad.length) {
    writer.bin.push(pad);
    writer.byteLength += pad.length;
  }
}

function padding(length, size, fill) {
  const remainder = length % size;
  return Buffer.alloc(remainder === 0 ? 0 : size - remainder, fill);
}

function minMaxForAccessor(typed, type) {
  const components = COMPONENTS[type];
  const min = Array.from({ length: components }, () => Infinity);
  const max = Array.from({ length: components }, () => -Infinity);
  for (let i = 0; i < typed.length; i += components) {
    for (let c = 0; c < components; c += 1) {
      min[c] = Math.min(min[c], typed[i + c]);
      max[c] = Math.max(max[c], typed[i + c]);
    }
  }
  return { min, max };
}

function addAnimations(writer, hero, boneNodes, partNodes, partByName) {
  const ready = hero.poses?.ready || {};
  const clips = [
    {
      name: 'Idle',
      times: ANIMATION_TIMES.Idle,
      offsetAt: (bone, time) => idleOffset(bone.name, time),
    },
    {
      name: 'Walk',
      times: ANIMATION_TIMES.Walk,
      offsetAt: (bone, time) => walkOffset(bone.name, time),
    },
    {
      name: 'Attack',
      times: ANIMATION_TIMES.Attack,
      offsetAt: (bone, time) => attackOffset(hero, bone.name, time),
    },
  ];

  for (const clip of clips) {
    const timeAccessor = writer.accessor('time', new Float32Array(clip.times), 'SCALAR', 5126);
    const samplers = [];
    const channels = [];
    for (const bone of hero.bones) {
      const rotations = [];
      const readyRotation = quatFromEulerDegrees(ready[bone.name] || [0, 0, 0]);
      for (const time of clip.times) {
        const offsetRotation = quatFromEulerDegrees(clip.offsetAt(bone, time));
        rotations.push(...quatMultiply(readyRotation, offsetRotation));
      }
      const output = writer.accessor('rotation', new Float32Array(rotations), 'VEC4', 5126);
      const samplerIndex = samplers.length;
      samplers.push({ input: timeAccessor, output, interpolation: 'LINEAR' });
      channels.push({ sampler: samplerIndex, target: { node: boneNodes.get(bone.name), path: 'rotation' } });
    }
    for (const [partName, node] of partNodes) {
      const part = partByName.get(partName);
      const transforms = clip.times.map((time) => animatedPartTransform(hero, part, clip.name, time));
      if (!transforms.some(Boolean)) continue;
      const filled = transforms.map((transform) => transform || basePartTransform(part));
      const translations = [];
      const rotations = [];
      const scales = [];
      for (const transform of filled) {
        translations.push(...transform.translation);
        rotations.push(...transform.rotation);
        scales.push(...transform.scale);
      }
      const translationAccessor = writer.accessor('translation', new Float32Array(translations), 'VEC3', 5126);
      const rotationAccessor = writer.accessor('rotation', new Float32Array(rotations), 'VEC4', 5126);
      const scaleAccessor = writer.accessor('scale', new Float32Array(scales), 'VEC3', 5126);
      for (const [path, output] of [['translation', translationAccessor], ['rotation', rotationAccessor], ['scale', scaleAccessor]]) {
        const samplerIndex = samplers.length;
        samplers.push({ input: timeAccessor, output, interpolation: 'LINEAR' });
        channels.push({ sampler: samplerIndex, target: { node, path } });
      }
    }

    writer.json.animations.push({ name: clip.name, samplers, channels });
  }
}

function idleOffset(name, time) {
  const wave = Math.sin(time * Math.PI);
  if (name === 'Torso') return [0, 0, wave * 1.5];
  if (name === 'Head') return [wave * 1.2, 0, 0];
  if (name === 'RightArm') return [wave * -2, 0, 0];
  if (name === 'LeftArm') return [wave * 2, 0, 0];
  return [0, 0, 0];
}

function walkOffset(name, time) {
  const wave = Math.sin(time * Math.PI * 2);
  if (name === 'RightArm') return [wave * 22, 0, 0];
  if (name === 'LeftArm') return [wave * -22, 0, 0];
  if (name === 'RightLeg') return [wave * -24, 0, 0];
  if (name === 'LeftLeg') return [wave * 24, 0, 0];
  if (name === 'Torso') return [Math.abs(wave) * -2, 0, wave * 2];
  return [0, 0, 0];
}


function actionProfileForHero(hero) {
  return ACTION_PROFILES.get(hero.id) || { actionType: 'sword', actionHand: 'right' };
}

function attackOffset(hero, name, time) {
  const profile = actionProfileForHero(hero);
  const t = clamp(time / 0.8, 0, 1);
  const windup = Math.sin(clamp(t / 0.28, 0, 1) * Math.PI * 0.5);
  const strike = Math.sin(clamp((t - 0.2) / 0.48, 0, 1) * Math.PI);
  const recover = clamp((t - 0.64) / 0.36, 0, 1);
  const power = Math.max(strike, windup * (1 - recover));
  const leftPrimary = profile.actionHand === 'left';
  const bothHands = profile.actionHand === 'both';
  if (profile.actionType === 'spear') {
    const thrust = Math.sin(clamp((t - 0.12) / 0.58, 0, 1) * Math.PI);
    if (name === 'Torso') return [-7 * thrust, -4 * thrust, 4 * thrust];
    if (name === 'Head') return [3 * thrust, -3 * thrust, 0];
    if (name === 'RightArm') return [-42 * thrust, 0, -8 * thrust];
    if (name === 'LeftArm') return [-30 * thrust, 0, 10 * thrust];
    if (name === 'RightLeg') return [-10 * thrust, 0, 0];
    if (name === 'LeftLeg') return [8 * thrust, 0, 0];
  } else if (profile.actionType === 'bow') {
    const draw = t < 0.5 ? Math.sin(clamp(t / 0.28, 0, 1) * Math.PI * 0.5) : Math.max(0, 1 - (t - 0.5) / 0.14);
    if (name === 'Torso') return [-2 * draw, -7 * draw, -3 * draw];
    if (name === 'Head') return [0, -5 * draw, 0];
    if (name === 'LeftArm') return [-2 * draw, 0, 3 * draw];
    if (name === 'RightArm') return [6 * draw, 0, 20 * draw];
    if (name === 'RightLeg') return [-4 * draw, 0, 0];
    if (name === 'LeftLeg') return [5 * draw, 0, 0];
  } else if (profile.actionType === 'fan-card') {
    if (name === 'Torso') return [-2 * power, 8 * power, (leftPrimary ? 5 : -5) * power];
    if (name === 'Head') return [-3 * power, (leftPrimary ? -8 : 8) * power, 0];
    if (bothHands && name === 'LeftArm') return [-28 * power, 0, -30 * power];
    if (bothHands && name === 'RightArm') return [-28 * power, 0, 30 * power];
    if (leftPrimary && name === 'LeftArm') return [-36 * power, 0, -42 * power];
    if (leftPrimary && name === 'RightArm') return [-12 * power, 0, 20 * power];
    if (name === 'RightArm') return [-36 * power, 0, 42 * power];
    if (name === 'LeftArm') return [-12 * power, 0, -20 * power];
    if (name === 'RightLeg') return [3 * power, 0, 0];
    if (name === 'LeftLeg') return [-3 * power, 0, 0];
  } else if (profile.actionType === 'hammer') {
    const slam = Math.sin(clamp((t - 0.08) / 0.68, 0, 1) * Math.PI);
    if (name === 'Torso') return [-12 * slam, (leftPrimary ? -7 : 7) * slam, (leftPrimary ? 12 : -12) * slam];
    if (name === 'Head') return [5 * slam, 0, 0];
    if (leftPrimary && name === 'LeftArm') return [-92 * slam, 0, 24 * slam];
    if (leftPrimary && name === 'RightArm') return [16 * slam, 0, -18 * slam];
    if (name === 'RightArm') return [-92 * slam, 0, -24 * slam];
    if (name === 'LeftArm') return [16 * slam, 0, 18 * slam];
    if (name === 'RightLeg') return [-8 * slam, 0, 0];
    if (name === 'LeftLeg') return [12 * slam, 0, 0];
  } else {
    if (name === 'Torso') return [0, -8 * power, 10 * strike];
    if (name === 'Head') return [0, -5 * power, 0];
    if (name === 'RightArm') return [-90 * strike, 0, 18 * strike];
    if (name === 'LeftArm') return [20 * strike, 0, -12 * strike];
    if (name === 'RightLeg') return [-6 * strike, 0, 0];
    if (name === 'LeftLeg') return [6 * strike, 0, 0];
  }
  return [0, 0, 0];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}


function sampleRange(start, end, count) {
  return Array.from({ length: count }, (_, index) => start + ((end - start) * index) / (count - 1));
}

function basePartTransform(part) {
  return {
    translation: part.position,
    rotation: quatFromEulerDegreesZyx(part.rotation),
    scale: [1, 1, 1],
  };
}

function animatedPartTransform(hero, part, clipName, time) {
  if (!part) return null;
  const bow = bowPartTransform(hero, part, clipName, time);
  if (bow) return bow;
  const motion = (hero.attachmentMotion || []).find((entry) => Array.isArray(entry.parts) && entry.parts.includes(part.name));
  if (!motion) return null;
  const wave = attachmentWave(clipName, time, motion.phase || 0);
  const deltaRotation = quatFromEulerDegrees((motion.amplitude || [0, 0, 0]).map((value) => value * wave));
  const deltaMatrix = mat3FromQuat(deltaRotation);
  const pivot = motion.pivot || [0, 0, 0];
  return {
    translation: addVec3(pivot, transformVec3(deltaMatrix, subtractVec3(part.position, pivot))),
    rotation: quatMultiply(deltaRotation, quatFromEulerDegreesZyx(part.rotation)),
    scale: [1, 1, 1],
  };
}

function attachmentWave(clipName, time, phase) {
  if (clipName === 'Idle') return 0.22 * Math.sin(Math.PI * time + phase);
  if (clipName === 'Walk') return Math.sin(Math.PI * 2 * time + phase);
  return 1.25 * Math.sin(Math.PI * clamp(time / 0.8, 0, 1)) * Math.sin(8 * time + phase);
}

function bowPartTransform(hero, part, clipName, time) {
  const bow = hero.bowMotion;
  if (!bow) return null;
  const stringIndex = (bow.strings || []).indexOf(part.name);
  const arrow = (bow.arrows || []).find((entry) => entry.part === part.name);
  if (stringIndex === -1 && !arrow) return null;
  const boneWorld = animatedBoneWorldMatrices(hero, clipName, time);
  const leftWorld = boneWorld.get(bow.bone);
  const rightWorld = boneWorld.get(bow.drawBone);
  if (!leftWorld || !rightWorld) return null;
  const nock = transformPointMat4(invertRigidMat4(leftWorld), transformPointMat4(rightWorld, bow.drawPoint));
  if (stringIndex !== -1) {
    const tip = (bow.tips || [])[Math.min(stringIndex, (bow.tips || []).length - 1)];
    if (!tip) return null;
    const frame = alignYFrame(tip, nock);
    return {
      translation: frame.translation,
      rotation: frame.rotation,
      scale: [1, Math.max(0.001, distance(tip, nock) / Math.max(0.001, part.size[1])), 1],
    };
  }
  const arrowFrame = yFrameAt(nock, bow.grip || [0, -1, -1]);
  const localOffset = transformVec3(mat3FromQuat(arrowFrame.rotation), arrow.offset || [0, 0, 0]);
  return {
    translation: addVec3(arrowFrame.translation, localOffset),
    rotation: quatMultiply(arrowFrame.rotation, quatFromEulerDegreesZyx(arrow.rotation || [0, 0, 0])),
    scale: [1, 1, 1],
  };
}

function animatedBoneWorldMatrices(hero, clipName, time) {
  const ready = hero.poses?.ready || {};
  const boneByName = new Map(hero.bones.map((bone) => [bone.name, bone]));
  const matrices = new Map();
  function resolve(name) {
    if (matrices.has(name)) return matrices.get(name);
    const bone = boneByName.get(name);
    if (!bone) return identityMat4();
    const parent = bone.parent ? resolve(bone.parent) : identityMat4();
    const offset = clipName === 'Idle' ? idleOffset(name, time) : clipName === 'Walk' ? walkOffset(name, time) : attackOffset(hero, name, time);
    const local = multiplyMat4(
      multiplyMat4(translationMat4(...bone.position), mat4FromQuat(quatFromEulerDegrees(ready[name] || [0, 0, 0]))),
      mat4FromQuat(quatFromEulerDegrees(offset)),
    );
    const world = multiplyMat4(parent, local);
    matrices.set(name, world);
    return world;
  }
  for (const bone of hero.bones) resolve(bone.name);
  return matrices;
}

function alignYFrame(from, to) {
  const frame = yFrameAt(scaleVec3(addVec3(from, to), 0.5), to);
  return frame;
}

function yFrameAt(origin, target) {
  const up = normalizeVec3(subtractVec3(target, origin));
  const helper = Math.abs(up[1]) < 0.95 ? [0, 1, 0] : [1, 0, 0];
  let right = normalizeVec3(crossVec3(helper, up));
  if (lengthVec3(right) < 0.001) right = [1, 0, 0];
  const back = normalizeVec3(crossVec3(right, up));
  right = normalizeVec3(crossVec3(up, back));
  return {
    translation: origin,
    rotation: quatFromMat3([
      [right[0], up[0], back[0]],
      [right[1], up[1], back[1]],
      [right[2], up[2], back[2]],
    ]),
  };
}

function mat3FromQuat([x, y, z, w]) {
  return [
    [1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y)],
    [2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x)],
    [2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)],
  ];
}

function quatFromMat3(m) {
  const trace = m[0][0] + m[1][1] + m[2][2];
  if (trace > 0) {
    const s = Math.sqrt(trace + 1) * 2;
    return [(m[2][1] - m[1][2]) / s, (m[0][2] - m[2][0]) / s, (m[1][0] - m[0][1]) / s, 0.25 * s];
  }
  if (m[0][0] > m[1][1] && m[0][0] > m[2][2]) {
    const s = Math.sqrt(1 + m[0][0] - m[1][1] - m[2][2]) * 2;
    return [0.25 * s, (m[0][1] + m[1][0]) / s, (m[0][2] + m[2][0]) / s, (m[2][1] - m[1][2]) / s];
  }
  if (m[1][1] > m[2][2]) {
    const s = Math.sqrt(1 + m[1][1] - m[0][0] - m[2][2]) * 2;
    return [(m[0][1] + m[1][0]) / s, 0.25 * s, (m[1][2] + m[2][1]) / s, (m[0][2] - m[2][0]) / s];
  }
  const s = Math.sqrt(1 + m[2][2] - m[0][0] - m[1][1]) * 2;
  return [(m[0][2] + m[2][0]) / s, (m[1][2] + m[2][1]) / s, 0.25 * s, (m[1][0] - m[0][1]) / s];
}

function transformVec3(m, v) {
  return [
    m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
    m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
    m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
  ];
}

function identityMat4() {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

function translationMat4(x, y, z) {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
}

function mat4FromQuat(q) {
  const m = mat3FromQuat(q);
  return [m[0][0], m[1][0], m[2][0], 0, m[0][1], m[1][1], m[2][1], 0, m[0][2], m[1][2], m[2][2], 0, 0, 0, 0, 1];
}

function multiplyMat4(a, b) {
  const out = new Array(16).fill(0);
  for (let col = 0; col < 4; col += 1) {
    for (let row = 0; row < 4; row += 1) {
      for (let i = 0; i < 4; i += 1) out[col * 4 + row] += a[i * 4 + row] * b[col * 4 + i];
    }
  }
  return out;
}

function transformPointMat4(m, p) {
  return [
    m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
    m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
    m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14],
  ];
}

function invertRigidMat4(m) {
  const r = [[m[0], m[4], m[8]], [m[1], m[5], m[9]], [m[2], m[6], m[10]]];
  const t = [m[12], m[13], m[14]];
  const rt = [[r[0][0], r[1][0], r[2][0]], [r[0][1], r[1][1], r[2][1]], [r[0][2], r[1][2], r[2][2]]];
  const invT = transformVec3(rt, scaleVec3(t, -1));
  return [rt[0][0], rt[1][0], rt[2][0], 0, rt[0][1], rt[1][1], rt[2][1], 0, rt[0][2], rt[1][2], rt[2][2], 0, invT[0], invT[1], invT[2], 1];
}

function subtractVec3(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function distance(a, b) {
  return lengthVec3(subtractVec3(a, b));
}

function lengthVec3(v) {
  return Math.hypot(v[0], v[1], v[2]);
}

function normalizeVec3(v) {
  const len = lengthVec3(v);
  return len > 0.000001 ? [v[0] / len, v[1] / len, v[2] / len] : [0, 1, 0];
}

function crossVec3(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}


function quatMultiply(a, b) {
  const [ax, ay, az, aw] = a;
  const [bx, by, bz, bw] = b;
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}

function geometryFor(shape, size) {
  if (shape === 'box') return boxGeometry(size);
  if (shape === 'wedge') return wedgeGeometry(size);
  if (shape === 'cylinder') return cylinderGeometry(size, 16);
  if (shape === 'sphere') return sphereGeometry(size, 8, 12);
  throw new Error(`Unsupported shape ${shape}.`);
}

function boxGeometry(size) {
  const [sx, sy, sz] = size.map((n) => n / 2);
  const faces = [
    [[[-sx, -sy, -sz], [sx, -sy, -sz], [sx, sy, -sz], [-sx, sy, -sz]], [0, 0, -1]],
    [[[sx, -sy, sz], [-sx, -sy, sz], [-sx, sy, sz], [sx, sy, sz]], [0, 0, 1]],
    [[[-sx, -sy, sz], [-sx, -sy, -sz], [-sx, sy, -sz], [-sx, sy, sz]], [-1, 0, 0]],
    [[[sx, -sy, -sz], [sx, -sy, sz], [sx, sy, sz], [sx, sy, -sz]], [1, 0, 0]],
    [[[-sx, sy, -sz], [sx, sy, -sz], [sx, sy, sz], [-sx, sy, sz]], [0, 1, 0]],
    [[[-sx, -sy, sz], [sx, -sy, sz], [sx, -sy, -sz], [-sx, -sy, -sz]], [0, -1, 0]],
  ];
  return facesToGeometry(faces);
}

function wedgeGeometry(size) {
  const [sx, sy, sz] = size.map((n) => n / 2);
  const a = [-sx, -sy, -sz];
  const b = [sx, -sy, -sz];
  const c = [-sx, -sy, sz];
  const d = [sx, -sy, sz];
  const e = [-sx, sy, sz];
  const f = [sx, sy, sz];
  const faces = [
    [[a, b, d, c], [0, -1, 0]],
    [[c, d, f, e], [0, 0, 1]],
    [[a, c, e], [-1, 0, 0]],
    [[b, f, d], [1, 0, 0]],
    [[a, e, f, b], normalize([0, sz, -sy])],
  ];
  return facesToGeometry(faces);
}

function cylinderGeometry(size, segments) {
  const [sx, sy, sz] = size;
  const rx = sx / 2;
  const rz = sz / 2;
  const y0 = -sy / 2;
  const y1 = sy / 2;
  const positions = [];
  const normals = [];
  const indices = [];
  for (let i = 0; i < segments; i += 1) {
    const a0 = (i / segments) * Math.PI * 2;
    const a1 = ((i + 1) / segments) * Math.PI * 2;
    const p0 = [Math.cos(a0) * rx, y0, Math.sin(a0) * rz];
    const p1 = [Math.cos(a1) * rx, y0, Math.sin(a1) * rz];
    const p2 = [Math.cos(a1) * rx, y1, Math.sin(a1) * rz];
    const p3 = [Math.cos(a0) * rx, y1, Math.sin(a0) * rz];
    const n0 = normalize([Math.cos(a0) / Math.max(rx, 0.001), 0, Math.sin(a0) / Math.max(rz, 0.001)]);
    const n1 = normalize([Math.cos(a1) / Math.max(rx, 0.001), 0, Math.sin(a1) / Math.max(rz, 0.001)]);
    pushQuad(positions, normals, indices, [p0, p1, p2, p3], [n0, n1, n1, n0]);
    pushTri(positions, normals, indices, [[0, y1, 0], p3, p2], [0, 1, 0]);
    pushTri(positions, normals, indices, [[0, y0, 0], p1, p0], [0, -1, 0]);
  }
  return { positions, normals, indices };
}

function sphereGeometry(size, rows, columns) {
  const [sx, sy, sz] = size.map((n) => n / 2);
  const positions = [];
  const normals = [];
  const indices = [];
  for (let row = 0; row < rows; row += 1) {
    const v0 = row / rows;
    const v1 = (row + 1) / rows;
    const phi0 = v0 * Math.PI;
    const phi1 = v1 * Math.PI;
    for (let col = 0; col < columns; col += 1) {
      const u0 = col / columns;
      const u1 = (col + 1) / columns;
      const theta0 = u0 * Math.PI * 2;
      const theta1 = u1 * Math.PI * 2;
      const pts = [
        spherePoint(theta0, phi0, sx, sy, sz),
        spherePoint(theta0, phi1, sx, sy, sz),
        spherePoint(theta1, phi1, sx, sy, sz),
        spherePoint(theta1, phi0, sx, sy, sz),
      ];
      pushQuad(positions, normals, indices, pts, pts.map(normalize));
    }
  }
  return { positions, normals, indices };
}

function spherePoint(theta, phi, sx, sy, sz) {
  return [Math.cos(theta) * Math.sin(phi) * sx, Math.cos(phi) * sy, Math.sin(theta) * Math.sin(phi) * sz];
}

function facesToGeometry(faces) {
  const positions = [];
  const normals = [];
  const indices = [];
  for (const [points, normal] of faces) {
    if (points.length === 3) pushTri(positions, normals, indices, points, normal);
    else pushQuad(positions, normals, indices, points, normal);
  }
  return { positions, normals, indices };
}

function pushQuad(positions, normals, indices, points, faceNormals) {
  const base = positions.length / 3;
  for (let i = 0; i < points.length; i += 1) {
    positions.push(...points[i]);
    normals.push(...(Array.isArray(faceNormals[0]) ? faceNormals[i] : faceNormals));
  }
  indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
}

function pushTri(positions, normals, indices, points, faceNormal) {
  const base = positions.length / 3;
  for (const point of points) {
    positions.push(...point);
    normals.push(...faceNormal);
  }
  indices.push(base, base + 1, base + 2);
}

function buildRbxmxModel(hero, options = {}) {
  const builder = new RobloxXmlBuilder(options.refStart || 0);
  const worldOffset = options.worldOffset || [0, 0, 0];
  const boneByName = new Map(hero.bones.map((bone) => [bone.name, bone]));
  const worldByBone = new Map();
  for (const bone of hero.bones) worldByBone.set(bone.name, boneWorldPosition(bone, boneByName, worldByBone));

  const partRefs = new Map();
  const partItems = [];
  for (const bone of hero.bones) {
    const name = RIG_PART_NAMES.get(bone.name) || bone.name;
    const world = addVec3(addVec3(worldByBone.get(bone.name), bone.center), worldOffset);
    const ref = builder.ref();
    partRefs.set(bone.name, ref);
    partItems.push(builder.item('Part', ref, [
      propString('Name', name),
      propVector3('size', bone.size),
      propCFrame('CFrame', cframeFromTranslation(world)),
      propColor(bone.color),
      propBool('Anchored', bone.name === 'Root'),
      propBool('CanCollide', false),
      propBool('CanTouch', false),
      propBool('CanQuery', true),
      propBool('Massless', bone.name !== 'Root'),
      propFloat('Transparency', bone.visible === false ? 1 : 0),
      propToken('Material', MATERIAL_TOKEN.SmoothPlastic),
      propToken('shape', SHAPE_TOKEN.box),
    ]));
  }

  const decorationItems = [];
  for (const part of hero.parts) {
    const bone = boneByName.get(part.bone);
    const ref = builder.ref();
    const world = addVec3(addVec3(worldByBone.get(part.bone), part.position), worldOffset);
    const dataRotation = eulerMatrixDegrees(part.rotation);
    const rotation = part.shape === 'cylinder'
      ? multiplyMat3(dataRotation, eulerMatrixDegrees([0, 0, 90]))
      : dataRotation;
    const className = part.shape === 'wedge' ? 'WedgePart' : 'Part';
    const properties = [
      propString('Name', part.name),
      propVector3('size', part.size),
      propCFrame('CFrame', cframeFromMatrix(world, rotation)),
      propColor(part.color),
      propBool('Anchored', false),
      propBool('CanCollide', false),
      propBool('CanTouch', false),
      propBool('CanQuery', true),
      propBool('Massless', true),
      propFloat('Transparency', 0),
      propToken('Material', MATERIAL_TOKEN[part.material]),
      propToken('shape', SHAPE_TOKEN[part.shape] || SHAPE_TOKEN.box),
    ];
    const weldC0 = multiplyCFrame(cframeFromTranslation(scaleVec3(bone.center, -1)), cframeFromMatrix(part.position, rotation));
    const children = [builder.item('Weld', builder.ref(), [
      propString('Name', `${part.name}Weld`),
      propRef('Part0', partRefs.get(part.bone)),
      propRef('Part1', ref),
      propCFrame('C0', weldC0),
      propCFrame('C1', identityCFrame()),
      propBool('Enabled', true),
    ])];
    decorationItems.push(builder.item(className, ref, properties, children));
  }

  const humanoid = builder.item('Humanoid', builder.ref(), [
    propString('Name', 'Humanoid'),
    propToken('RigType', 0),
    propFloat('WalkSpeed', 14),
    propFloat('JumpPower', 48),
    propBool('AutoRotate', true),
  ]);

  const motorItems = [];
  for (const bone of hero.bones) {
    if (!bone.parent || !MOTOR_NAMES.has(bone.name)) continue;
    const parent = boneByName.get(bone.parent);
    const c0 = multiplyCFrame(cframeFromTranslation(scaleVec3(parent.center, -1)), cframeFromTranslation(bone.position));
    const c1 = cframeFromTranslation(scaleVec3(bone.center, -1));
    motorItems.push(builder.item('Motor6D', builder.ref(), [
      propString('Name', MOTOR_NAMES.get(bone.name)),
      propRef('Part0', partRefs.get(bone.parent)),
      propRef('Part1', partRefs.get(bone.name)),
      propCFrame('C0', c0),
      propCFrame('C1', c1),
      propBool('Enabled', true),
    ]));
  }

  const modelChildren = [humanoid, ...partItems, ...motorItems, ...decorationItems];
  const modelRef = builder.ref();
  const xmlItem = builder.item('Model', modelRef, [
    propString('Name', `${hero.name}_${hero.id}`),
    propRef('PrimaryPart', partRefs.get('Root')),
    propCFrame('WorldPivotData', cframeFromTranslation(worldOffset)),
  ], modelChildren);

  const xml = `<roblox version="4">\n${xmlItem}\n</roblox>\n`;
  return {
    xml,
    xmlItem,
    stats: {
      bodyParts: partItems.length,
      decorations: decorationItems.length,
      motors: motorItems.length,
      humanoids: 1,
    },
  };
}

function buildWorkshop(entries, heroes) {
  const builder = new RobloxXmlBuilder(900000);
  const stands = entries.map((entry, index) => builder.item('Part', builder.ref(), [
    propString('Name', `DemoStand_${entry.hero.id}`),
    propVector3('size', [5.5, 0.45, 5.5]),
    propCFrame('CFrame', cframeFromTranslation([entry.worldOffset[0], 0.225, entry.worldOffset[2]])),
    propColor(index % 2 === 0 ? '#5c3a25' : '#33445f'),
    propBool('Anchored', true),
    propBool('CanCollide', true),
    propBool('CanTouch', false),
    propBool('CanQuery', true),
    propBool('Massless', false),
    propFloat('Transparency', 0),
    propToken('Material', MATERIAL_TOKEN.SmoothPlastic),
    propToken('shape', SHAPE_TOKEN.box),
  ]));
  const script = builder.item('Script', builder.ref(), [
    propString('Name', 'HeroModelWorkshopDemo'),
    propProtectedString('Source', demoScriptSource(heroes)),
  ]);
  const workspace = builder.item('Workspace', builder.ref(), [propString('Name', 'Workspace')], [...stands, ...entries.map((entry) => entry.xmlItem), script]);
  const lighting = builder.item('Lighting', builder.ref(), [
    propString('Name', 'Lighting'),
    propFloat('Brightness', 2),
    propFloat('ClockTime', 14),
    propColor('#808080', 'Ambient'),
  ]);
  return `<roblox version="4">\n${workspace}\n${lighting}\n</roblox>\n`;
}

function demoScriptSource(heroes) {
  const readyById = Object.fromEntries(heroes.map((hero) => [hero.id, hero.poses?.ready || {}]));
  const boneCentersById = Object.fromEntries(heroes.map((hero) => [hero.id, Object.fromEntries(hero.bones.map((bone) => [bone.name, bone.center]))]));
  const partInfoById = Object.fromEntries(heroes.map((hero) => [hero.id, Object.fromEntries(hero.parts.map((part) => [part.name, { bone: part.bone, shape: part.shape, position: part.position, rotation: part.rotation, size: part.size }]))]));
  const attachmentMotionsById = Object.fromEntries(heroes.map((hero) => [hero.id, hero.attachmentMotion || []]));
  const bowMotionsById = Object.fromEntries(heroes.filter((hero) => hero.bowMotion).map((hero) => [hero.id, hero.bowMotion]));
  const readyLua = luaTable(readyById);
  const boneCentersLua = luaTable(boneCentersById);
  const partInfoLua = luaTable(partInfoById);
  const attachmentMotionsLua = luaTable(attachmentMotionsById);
  const bowMotionsLua = luaTable(bowMotionsById);
  return `-- Generated hero-model-workshop demo animation.
-- The standalone .rbxmx exports intentionally do not include this script.
local RunService = game:GetService("RunService")

local MOTOR_NAMES = {
	"RootJoint",
	"Neck",
	"Right Shoulder",
	"Left Shoulder",
	"Right Hip",
	"Left Hip",
}

local READY_POSES = ${readyLua}
local BONE_CENTERS = ${boneCentersLua}
local PART_INFO = ${partInfoLua}
local ATTACHMENT_MOTIONS = ${attachmentMotionsLua}
local BOW_MOTIONS = ${bowMotionsLua}

local BONE_PART_NAMES = {
	Root = "HumanoidRootPart",
	Torso = "Torso",
	Head = "Head",
	LeftArm = "Left Arm",
	RightArm = "Right Arm",
	LeftLeg = "Left Leg",
	RightLeg = "Right Leg",
}

local MOTOR_TO_BONE = {
	RootJoint = "Torso",
	Neck = "Head",
	["Right Shoulder"] = "RightArm",
	["Left Shoulder"] = "LeftArm",
	["Right Hip"] = "RightLeg",
	["Left Hip"] = "LeftLeg",
}

local BONE_TO_MOTOR = {
	Torso = "RootJoint",
	Head = "Neck",
	RightArm = "Right Shoulder",
	LeftArm = "Left Shoulder",
	RightLeg = "Right Hip",
	LeftLeg = "Left Hip",
}

local ACTION_PROFILES = {
	cao_cao = { actionType = "sword", actionHand = "right" },
	sima_yi = { actionType = "fan-card", actionHand = "left" },
	xiahou_dun = { actionType = "sword", actionHand = "right" },
	zhang_liao = { actionType = "spear", actionHand = "both" },
	xu_chu = { actionType = "hammer", actionHand = "left" },
	guo_jia = { actionType = "fan-card", actionHand = "both" },
	zhen_ji = { actionType = "fan-card", actionHand = "right" },
	liu_bei = { actionType = "fan-card", actionHand = "both" },
	guan_yu = { actionType = "sword", actionHand = "right" },
	zhang_fei = { actionType = "spear", actionHand = "right" },
	zhuge_liang = { actionType = "fan-card", actionHand = "right" },
	zhao_yun = { actionType = "spear", actionHand = "right" },
	ma_chao = { actionType = "spear", actionHand = "right" },
	huang_yueying = { actionType = "fan-card", actionHand = "right" },
	sun_quan = { actionType = "sword", actionHand = "right" },
	gan_ning = { actionType = "sword", actionHand = "right" },
	lu_meng = { actionType = "fan-card", actionHand = "left" },
	huang_gai = { actionType = "hammer", actionHand = "right" },
	zhou_yu = { actionType = "fan-card", actionHand = "left" },
	da_qiao = { actionType = "fan-card", actionHand = "right" },
	lu_xun = { actionType = "fan-card", actionHand = "left" },
	sun_shangxiang = { actionType = "bow", actionHand = "left" },
	hua_tuo = { actionType = "fan-card", actionHand = "left" },
	lu_bu = { actionType = "spear", actionHand = "right" },
	diao_chan = { actionType = "fan-card", actionHand = "left" },
}

local function modelId(modelName)
	return modelName:match("([a-z_]+)$") or modelName
end

local function profileFor(id)
	return ACTION_PROFILES[id] or { actionType = "sword", actionHand = "right" }
end

local function readyFor(id)
	return READY_POSES[id] or {}
end

local function anglesFromDegrees(value)
	if type(value) ~= "table" then
		return CFrame.new()
	end
	return CFrame.Angles(math.rad(value[1] or 0), math.rad(value[2] or 0), math.rad(value[3] or 0))
end

local function collectRig(model)
	local humanoid = model:FindFirstChildOfClass("Humanoid")
	if not humanoid then
		return nil
	end
	local root = model:FindFirstChild("HumanoidRootPart")
	if root and root:IsA("BasePart") then
		root.Anchored = true
	end
	local id = modelId(model.Name)
	local ready = readyFor(id)
	local motors = {}
	for _, name in ipairs(MOTOR_NAMES) do
		local motor = model:FindFirstChild(name, true)
		if motor and motor:IsA("Motor6D") then
			local boneName = MOTOR_TO_BONE[name]
			motors[name] = {
				motor = motor,
				baseC0 = motor.C0,
				baseC1 = motor.C1,
				ready = anglesFromDegrees(boneName and ready[boneName]),
				currentC0 = motor.C0 * anglesFromDegrees(boneName and ready[boneName]),
			}
		end
	end
	local parts = {}
	for partName, info in pairs(PART_INFO[id] or {}) do
		local part = model:FindFirstChild(partName, true)
		if part and part:IsA("BasePart") then
			local weld = part:FindFirstChild(partName .. "Weld") or part:FindFirstChildOfClass("Weld")
			if weld and weld:IsA("Weld") then
				parts[partName] = { part = part, weld = weld, baseC0 = weld.C0, baseSize = part.Size, info = info }
			end
		end
	end
	local profile = profileFor(id)
	return {
		id = id,
		model = model,
		motors = motors,
		parts = parts,
		boneCenters = BONE_CENTERS[id] or {},
		attachmentMotions = ATTACHMENT_MOTIONS[id] or {},
		bowMotion = BOW_MOTIONS[id],
		phase = (#model.Name % 7) * 0.17,
		actionType = profile.actionType,
		actionHand = profile.actionHand,
	}
end

local rigs = {}
for _, child in ipairs(workspace:GetChildren()) do
	if child:IsA("Model") then
		local rig = collectRig(child)
		if rig then
			table.insert(rigs, rig)
		end
	end
end

local function setMotor(rig, name, transform)
	local record = rig.motors[name]
	if record then
		record.motor.Transform = CFrame.new()
		record.currentC0 = record.baseC0 * record.ready * transform
		record.motor.C0 = record.currentC0
	end
end


local function v3(value)
	if type(value) ~= "table" then
		return Vector3.zero
	end
	return Vector3.new(value[1] or 0, value[2] or 0, value[3] or 0)
end

local function cframeFromZyx(value)
	if type(value) ~= "table" then
		return CFrame.new()
	end
	return CFrame.Angles(0, 0, math.rad(value[3] or 0)) * CFrame.Angles(0, math.rad(value[2] or 0), 0) * CFrame.Angles(math.rad(value[1] or 0), 0, 0)
end

local function shapeCorrection(info)
	if info.shape == "cylinder" then
		return CFrame.Angles(0, 0, math.rad(90))
	end
	return CFrame.new()
end

local function localPartFrame(info)
	return CFrame.new(v3(info.position)) * cframeFromZyx(info.rotation) * shapeCorrection(info)
end

local function boneCenter(rig, boneName)
	return v3(rig.boneCenters[boneName])
end

local function attachmentWave(clipName, clipTime, phase)
	if clipName == "Idle" then
		return 0.22 * math.sin(math.pi * clipTime + phase)
	elseif clipName == "Walk" then
		return math.sin(math.pi * 2 * clipTime + phase)
	end
	return 1.25 * math.sin(math.pi * math.clamp(clipTime / 0.8, 0, 1)) * math.sin(8 * clipTime + phase)
end

local function setWeldLocalFrame(rig, record, localFrame)
	local center = boneCenter(rig, record.info.bone)
	record.weld.C0 = CFrame.new(-center) * localFrame * shapeCorrection(record.info)
end

local function applyAttachmentMotion(rig, clipName, clipTime)
	for _, motion in ipairs(rig.attachmentMotions) do
		local wave = attachmentWave(clipName, clipTime, motion.phase or 0)
		local amplitude = v3(motion.amplitude)
		local deltaRotation = CFrame.Angles(math.rad(amplitude.X * wave), math.rad(amplitude.Y * wave), math.rad(amplitude.Z * wave))
		local pivot = v3(motion.pivot)
		for _, partName in ipairs(motion.parts or {}) do
			local record = rig.parts[partName]
			if record then
				local localFrame = CFrame.new(pivot) * deltaRotation * CFrame.new(-pivot) * localPartFrame(record.info)
				setWeldLocalFrame(rig, record, localFrame)
				record.part.Size = record.baseSize
			end
		end
	end
end

local function predictedPartFrame(rig, boneName)
	local partName = BONE_PART_NAMES[boneName]
	local part = partName and rig.model:FindFirstChild(partName)
	if not part or not part:IsA("BasePart") then
		return nil
	end
	local motorName = BONE_TO_MOTOR[boneName]
	local record = motorName and rig.motors[motorName]
	if not record then
		return part.CFrame
	end
	local parentPart = record.motor.Part0
	if not parentPart or not parentPart:IsA("BasePart") then
		return part.CFrame
	end
	return parentPart.CFrame * record.currentC0 * record.baseC1:Inverse()
end

local function frameYAt(origin, target)
	local up = target - origin
	if up.Magnitude < 0.0001 then
		up = Vector3.yAxis
	else
		up = up.Unit
	end
	local helper = if math.abs(up.Y) < 0.95 then Vector3.yAxis else Vector3.xAxis
	local right = helper:Cross(up)
	if right.Magnitude < 0.0001 then
		right = Vector3.xAxis
	else
		right = right.Unit
	end
	local back = right:Cross(up).Unit
	right = up:Cross(back).Unit
	return CFrame.fromMatrix(origin, right, up, back)
end

local function applyBowMotion(rig)
	local bow = rig.bowMotion
	if not bow then
		return
	end
	local leftPartFrame = predictedPartFrame(rig, bow.bone)
	local rightPartFrame = predictedPartFrame(rig, bow.drawBone)
	if not leftPartFrame or not rightPartFrame then
		return
	end
	local leftCenter = boneCenter(rig, bow.bone)
	local rightCenter = boneCenter(rig, bow.drawBone)
	local leftPartName = BONE_PART_NAMES[bow.bone]
	local leftPart = leftPartName and rig.model:FindFirstChild(leftPartName)
	local leftPivotFrame = leftPartFrame * CFrame.new(-leftCenter)
	local rightPivotFrame = rightPartFrame * CFrame.new(-rightCenter)
	local nock = leftPivotFrame:PointToObjectSpace(rightPivotFrame:PointToWorldSpace(v3(bow.drawPoint)))
	for index, partName in ipairs(bow.strings or {}) do
		local record = rig.parts[partName]
		local tipValue = bow.tips and bow.tips[index]
		if record and tipValue then
			if leftPart and leftPart:IsA("BasePart") then
				record.weld.Part0 = leftPart
			end
			local tip = v3(tipValue)
			local midpoint = (tip + nock) * 0.5
			local localFrame = frameYAt(midpoint, nock)
			local length = (nock - tip).Magnitude
			record.part.Size = Vector3.new(record.baseSize.X, math.max(0.001, length), record.baseSize.Z)
			record.weld.C0 = CFrame.new(-leftCenter) * localFrame * shapeCorrection(record.info)
		end
	end
	local arrowFrame = frameYAt(nock, v3(bow.grip))
	for _, arrow in ipairs(bow.arrows or {}) do
		local record = rig.parts[arrow.part]
		if record then
			if leftPart and leftPart:IsA("BasePart") then
				record.weld.Part0 = leftPart
			end
			record.part.Size = record.baseSize
			record.weld.C0 = CFrame.new(-leftCenter) * arrowFrame * CFrame.new(v3(arrow.offset)) * cframeFromZyx(arrow.rotation) * shapeCorrection(record.info)
		end
	end
end

local function applyPartMotion(rig, clipName, clipTime)
	for _, record in pairs(rig.parts) do
		record.weld.C0 = record.baseC0
		record.part.Size = record.baseSize
	end
	applyAttachmentMotion(rig, clipName, clipTime)
	applyBowMotion(rig)
end

local function poseIdle(rig, localT)
	local breathe = math.sin(localT * math.pi * 2) * 0.04
	setMotor(rig, "RootJoint", CFrame.Angles(0, 0, breathe))
	setMotor(rig, "Neck", CFrame.Angles(breathe * 0.7, 0, 0))
	setMotor(rig, "Right Shoulder", CFrame.Angles(-breathe * 0.8, 0, breathe * 0.5))
	setMotor(rig, "Left Shoulder", CFrame.Angles(breathe * 0.8, 0, -breathe * 0.5))
	setMotor(rig, "Right Hip", CFrame.new())
	setMotor(rig, "Left Hip", CFrame.new())
end

local function poseWalk(rig, localT)
	local swing = math.sin(localT * math.pi * 2)
	local lift = math.abs(swing) * 0.04
	setMotor(rig, "RootJoint", CFrame.new(0, lift, 0) * CFrame.Angles(math.rad(-2), 0, math.rad(swing * 4)))
	setMotor(rig, "Neck", CFrame.Angles(math.rad(2), 0, 0))
	setMotor(rig, "Right Shoulder", CFrame.Angles(math.rad(swing * 24), 0, 0))
	setMotor(rig, "Left Shoulder", CFrame.Angles(math.rad(swing * -24), 0, 0))
	setMotor(rig, "Right Hip", CFrame.Angles(math.rad(swing * -28), 0, 0))
	setMotor(rig, "Left Hip", CFrame.Angles(math.rad(swing * 28), 0, 0))
end

local function poseAttack(rig, localT)
	local clamped = math.clamp(localT, 0, 1)
	local windup = math.sin(math.clamp(clamped / 0.28, 0, 1) * math.pi * 0.5)
	local strike = math.sin(math.clamp((clamped - 0.2) / 0.48, 0, 1) * math.pi)
	local recover = math.clamp((clamped - 0.64) / 0.36, 0, 1)
	local power = math.max(strike, windup * (1 - recover))
	local leftPrimary = rig.actionHand == "left"
	local bothHands = rig.actionHand == "both"
	if rig.actionType == "spear" then
		local thrust = math.sin(math.clamp((clamped - 0.12) / 0.58, 0, 1) * math.pi)
		setMotor(rig, "RootJoint", CFrame.Angles(math.rad(-7 * thrust), math.rad(-4 * thrust), math.rad(4 * thrust)))
		setMotor(rig, "Neck", CFrame.Angles(math.rad(3 * thrust), math.rad(-3 * thrust), 0))
		setMotor(rig, "Right Shoulder", CFrame.Angles(math.rad(-42 * thrust), 0, math.rad(-8 * thrust)))
		setMotor(rig, "Left Shoulder", CFrame.Angles(math.rad(-30 * thrust), 0, math.rad(10 * thrust)))
		setMotor(rig, "Right Hip", CFrame.Angles(math.rad(-10 * thrust), 0, 0))
		setMotor(rig, "Left Hip", CFrame.Angles(math.rad(8 * thrust), 0, 0))
	elseif rig.actionType == "bow" then
		local draw = if clamped < 0.5 then math.sin(math.clamp(clamped / 0.28, 0, 1) * math.pi * 0.5) else math.max(0, 1 - (clamped - 0.5) / 0.14)
		setMotor(rig, "RootJoint", CFrame.Angles(math.rad(-2 * draw), math.rad(-7 * draw), math.rad(-3 * draw)))
		setMotor(rig, "Neck", CFrame.Angles(0, math.rad(-5 * draw), 0))
		setMotor(rig, "Left Shoulder", CFrame.Angles(math.rad(-2 * draw), 0, math.rad(3 * draw)))
		setMotor(rig, "Right Shoulder", CFrame.Angles(math.rad(6 * draw), 0, math.rad(20 * draw)))
	elseif rig.actionType == "fan-card" then
		setMotor(rig, "RootJoint", CFrame.Angles(math.rad(-2 * power), math.rad(8 * power), math.rad(if leftPrimary then 5 * power else -5 * power)))
		setMotor(rig, "Neck", CFrame.Angles(math.rad(-3 * power), math.rad(if leftPrimary then -8 * power else 8 * power), 0))
		if leftPrimary then
			setMotor(rig, "Left Shoulder", CFrame.Angles(math.rad(-36 * power), 0, math.rad(-42 * power)))
			setMotor(rig, "Right Shoulder", CFrame.Angles(math.rad(-12 * power), 0, math.rad(20 * power)))
		elseif bothHands then
			setMotor(rig, "Left Shoulder", CFrame.Angles(math.rad(-28 * power), 0, math.rad(-30 * power)))
			setMotor(rig, "Right Shoulder", CFrame.Angles(math.rad(-28 * power), 0, math.rad(30 * power)))
		else
			setMotor(rig, "Right Shoulder", CFrame.Angles(math.rad(-36 * power), 0, math.rad(42 * power)))
			setMotor(rig, "Left Shoulder", CFrame.Angles(math.rad(-12 * power), 0, math.rad(-20 * power)))
		end
	elseif rig.actionType == "hammer" then
		local slam = math.sin(math.clamp((clamped - 0.08) / 0.68, 0, 1) * math.pi)
		setMotor(rig, "RootJoint", CFrame.Angles(math.rad(-12 * slam), math.rad(if leftPrimary then -7 * slam else 7 * slam), math.rad(if leftPrimary then 12 * slam else -12 * slam)))
		setMotor(rig, "Neck", CFrame.Angles(math.rad(5 * slam), 0, 0))
		if leftPrimary then
			setMotor(rig, "Left Shoulder", CFrame.Angles(math.rad(-92 * slam), 0, math.rad(24 * slam)))
			setMotor(rig, "Right Shoulder", CFrame.Angles(math.rad(16 * slam), 0, math.rad(-18 * slam)))
		else
			setMotor(rig, "Right Shoulder", CFrame.Angles(math.rad(-92 * slam), 0, math.rad(-24 * slam)))
			setMotor(rig, "Left Shoulder", CFrame.Angles(math.rad(16 * slam), 0, math.rad(18 * slam)))
		end
	else
		setMotor(rig, "RootJoint", CFrame.Angles(0, math.rad(-8 * power), math.rad(10 * strike)))
		setMotor(rig, "Neck", CFrame.Angles(0, math.rad(-5 * power), 0))
		setMotor(rig, "Right Shoulder", CFrame.Angles(math.rad(-90 * strike), 0, math.rad(18 * strike)))
		setMotor(rig, "Left Shoulder", CFrame.Angles(math.rad(20 * strike), 0, math.rad(-12 * strike)))
	end
end

RunService.Heartbeat:Connect(function()
	local now = os.clock()
	for _, rig in ipairs(rigs) do
		local t = (now + rig.phase) % 6
		if t < 2 then
			poseIdle(rig, t / 2)
			applyPartMotion(rig, "Idle", t)
		elseif t < 4 then
			local walkT = (t - 2) / 2
			poseWalk(rig, walkT)
			applyPartMotion(rig, "Walk", walkT)
		else
			local attackT = ((t - 4) / 2) * 0.8
			poseAttack(rig, attackT / 0.8)
			applyPartMotion(rig, "Attack", attackT)
		end
	end
end)
`;
}

function luaTable(value) {
  if (Array.isArray(value)) return `{ ${value.map((entry) => luaTable(entry)).join(', ')} }`;
  if (value && typeof value === 'object') {
    return `{ ${Object.entries(value).map(([key, entry]) => `[${JSON.stringify(key)}] = ${luaTable(entry)}`).join(', ')} }`;
  }
  return JSON.stringify(value);
}


function readmeFor(manifest) {
  return `# Hero Models V1

Generated by \`scripts/export-hero-models.mjs\` from \`${manifest.source}\`.

- Scope: standard 25 generals as Roblox-style R6 block characters for art review and controllable playground testing.
- Coordinates: Y-up; heroes face -Z.
- GLB: rigid hierarchical nodes with Idle, Walk, and Attack animation clips; no skinning or external assets.
- Roblox: each \`.rbxmx\` contains one R6 Humanoid model with HumanoidRootPart, Torso, Head, Left Arm, Right Arm, Left Leg, Right Leg, six Motor6D joints, and welded decoration parts. Individual \`.rbxmx\` files do not include scripts.
- \`hero-model-workshop.rbxlx\`: standalone art-review scene with scripted idle/walk/attack loops.
- \`hero-playground.rbxlx\`: standalone controllable art playground built by \`scripts/build-hero-playground.mjs\`; it supports walking, jumping, hero switching, attack/dodge inputs, and visual review only. Hero skills, full card rules, identity-game flow, and battle validation are not implemented here.
- Import/display note: HumanoidRootPart is Anchored in the exported Roblox XML so the model stays upright when dropped into Studio for review. Clear Anchored on HumanoidRootPart before using the asset as a movable in-game character.
- Wedge convention: Y-up triangular prism ramp, low front edge at local -Z and full-height rear edge at local +Z.
- Cylinder convention: GLB cylinders are local-Y; Roblox cylinder parts are rotated around Z to compensate for the default X-axis cylinder.

Assets exported: ${manifest.counts.heroes} heroes, ${manifest.counts.glb} GLB files, ${manifest.counts.rbxmx} RBXMX files.
`;
}

class RobloxXmlBuilder {
  constructor(start = 0) {
    this.next = start;
  }

  ref() {
    this.next += 1;
    return `RBX${this.next}`;
  }

  item(className, ref, properties, children = []) {
    return `<Item class="${className}" referent="${ref}"><Properties>${properties.join('')}</Properties>${children.join('')}</Item>`;
  }
}

function propString(name, value) {
  return `<string name="${name}">${xmlEscape(value)}</string>`;
}

function propProtectedString(name, value) {
  return `<ProtectedString name="${name}">${xmlEscape(value)}</ProtectedString>`;
}

function propBool(name, value) {
  return `<bool name="${name}">${value ? 'true' : 'false'}</bool>`;
}

function propFloat(name, value) {
  return `<float name="${name}">${fmt(value)}</float>`;
}

function propToken(name, value) {
  return `<token name="${name}">${value}</token>`;
}

function propRef(name, value) {
  return `<Ref name="${name}">${value}</Ref>`;
}

function propVector3(name, value) {
  return `<Vector3 name="${name}"><X>${fmt(value[0])}</X><Y>${fmt(value[1])}</Y><Z>${fmt(value[2])}</Z></Vector3>`;
}

function propColor(color, name = 'Color') {
  const [r, g, b] = hexToRgb(color);
  const packed = (255 * 16777216 + Math.round(r * 255) * 65536 + Math.round(g * 255) * 256 + Math.round(b * 255)) >>> 0;
  return `<Color3 name="${name}"><R>${fmt(r)}</R><G>${fmt(g)}</G><B>${fmt(b)}</B></Color3><Color3uint8 name="Color3uint8">${packed}</Color3uint8>`;
}

function propCFrame(name, cframe) {
  const r = cframe.r;
  return `<CoordinateFrame name="${name}"><X>${fmt(cframe.t[0])}</X><Y>${fmt(cframe.t[1])}</Y><Z>${fmt(cframe.t[2])}</Z><R00>${fmt(r[0][0])}</R00><R01>${fmt(r[0][1])}</R01><R02>${fmt(r[0][2])}</R02><R10>${fmt(r[1][0])}</R10><R11>${fmt(r[1][1])}</R11><R12>${fmt(r[1][2])}</R12><R20>${fmt(r[2][0])}</R20><R21>${fmt(r[2][1])}</R21><R22>${fmt(r[2][2])}</R22></CoordinateFrame>`;
}

function xmlEscape(text) {
  return String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function fmt(value) {
  const n = Math.abs(value) < 1e-8 ? 0 : value;
  return Number(n.toFixed(6)).toString();
}

function hexToRgb(hex) {
  const int = Number.parseInt(hex.slice(1), 16);
  return [((int >> 16) & 255) / 255, ((int >> 8) & 255) / 255, (int & 255) / 255];
}

function quatFromEulerDegrees([x, y, z]) {
  const hx = (x * Math.PI) / 360;
  const hy = (y * Math.PI) / 360;
  const hz = (z * Math.PI) / 360;
  const sx = Math.sin(hx);
  const cx = Math.cos(hx);
  const sy = Math.sin(hy);
  const cy = Math.cos(hy);
  const sz = Math.sin(hz);
  const cz = Math.cos(hz);
  return [
    sx * cy * cz + cx * sy * sz,
    cx * sy * cz - sx * cy * sz,
    cx * cy * sz + sx * sy * cz,
    cx * cy * cz - sx * sy * sz,
  ];
}

function quatFromEulerDegreesZyx([x, y, z]) {
  const qx = quatFromAxisAngle([1, 0, 0], x);
  const qy = quatFromAxisAngle([0, 1, 0], y);
  const qz = quatFromAxisAngle([0, 0, 1], z);
  return quatMultiply(quatMultiply(qz, qy), qx);
}

function quatFromAxisAngle([x, y, z], degrees) {
  const half = (degrees * Math.PI) / 360;
  const s = Math.sin(half);
  return [x * s, y * s, z * s, Math.cos(half)];
}

function eulerMatrixDegrees([x, y, z]) {
  const rx = (x * Math.PI) / 180;
  const ry = (y * Math.PI) / 180;
  const rz = (z * Math.PI) / 180;
  const sx = Math.sin(rx);
  const cx = Math.cos(rx);
  const sy = Math.sin(ry);
  const cy = Math.cos(ry);
  const sz = Math.sin(rz);
  const cz = Math.cos(rz);
  const mx = [[1, 0, 0], [0, cx, -sx], [0, sx, cx]];
  const my = [[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]];
  const mz = [[cz, -sz, 0], [sz, cz, 0], [0, 0, 1]];
  return multiplyMat3(multiplyMat3(mz, my), mx);
}

function multiplyMat3(a, b) {
  const out = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      out[row][col] = a[row][0] * b[0][col] + a[row][1] * b[1][col] + a[row][2] * b[2][col];
    }
  }
  return out;
}

function identityCFrame() {
  return cframeFromTranslation([0, 0, 0]);
}

function cframeFromTranslation(t) {
  return { t, r: [[1, 0, 0], [0, 1, 0], [0, 0, 1]] };
}

function cframeFromMatrix(t, r) {
  return { t, r };
}

function multiplyCFrame(a, b) {
  return {
    t: addVec3(a.t, transformPoint(b.t, a.r)),
    r: multiplyMat3(a.r, b.r),
  };
}

function transformPoint(point, matrix) {
  return [
    matrix[0][0] * point[0] + matrix[0][1] * point[1] + matrix[0][2] * point[2],
    matrix[1][0] * point[0] + matrix[1][1] * point[1] + matrix[1][2] * point[2],
    matrix[2][0] * point[0] + matrix[2][1] * point[1] + matrix[2][2] * point[2],
  ];
}

function boneWorldPosition(bone, boneByName, cache) {
  if (cache.has(bone.name)) return cache.get(bone.name);
  const world = bone.parent === null ? bone.position : addVec3(boneWorldPosition(boneByName.get(bone.parent), boneByName, cache), bone.position);
  cache.set(bone.name, world);
  return world;
}

function addVec3(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function scaleVec3(a, scale) {
  return [a[0] * scale, a[1] * scale, a[2] * scale];
}

function normalize(v) {
  const length = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / length, v[1] / length, v[2] / length];
}

function boundsForPositions(positions, translation = [0, 0, 0], rotation = IDENTITY_MAT3) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    const point = addVec3(transformPoint([positions[i], positions[i + 1], positions[i + 2]], rotation), translation);
    for (let c = 0; c < 3; c += 1) {
      min[c] = Math.min(min[c], point[c]);
      max[c] = Math.max(max[c], point[c]);
    }
  }
  return { min, max };
}

function mergeBounds(a, b) {
  if (!a) return b;
  return {
    min: a.min.map((n, i) => Math.min(n, b.min[i])),
    max: a.max.map((n, i) => Math.max(n, b.max[i])),
  };
}

main();
