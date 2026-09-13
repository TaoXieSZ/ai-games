import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(new URL('../../../..', import.meta.url).pathname);
const modelsDir = path.join(repoRoot, 'models/hero-models-v1');
const dataPath = path.join(repoRoot, 'data/hero-models-v1.json');
const outPath = path.join(repoRoot, 'docs/art/hero-models-secondary-motion-01/verification/exporter-glb-secondary-motion-report.json');

const COMPONENTS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
const COMPONENT_INFO = {
  5120: { size: 1, read: (b, o) => b.readInt8(o) },
  5121: { size: 1, read: (b, o) => b.readUInt8(o) },
  5122: { size: 2, read: (b, o) => b.readInt16LE(o) },
  5123: { size: 2, read: (b, o) => b.readUInt16LE(o) },
  5125: { size: 4, read: (b, o) => b.readUInt32LE(o) },
  5126: { size: 4, read: (b, o) => b.readFloatLE(o) },
};

function readGlb(filePath) {
  const bytes = fs.readFileSync(filePath);
  if (bytes.toString('ascii', 0, 4) !== 'glTF') throw new Error(`${filePath}: not a GLB`);
  const totalLength = bytes.readUInt32LE(8);
  let offset = 12;
  let json = null;
  let bin = null;
  while (offset < totalLength) {
    const length = bytes.readUInt32LE(offset);
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    const start = offset + 8;
    if (type === 'JSON') json = JSON.parse(bytes.toString('utf8', start, start + length).replace(/\0+$/g, '').trim());
    if (type === 'BIN\0') bin = bytes.subarray(start, start + length);
    offset = start + length;
  }
  if (!json || !bin) throw new Error(`${filePath}: missing JSON or BIN chunk`);
  return { filePath, json, bin };
}

function readAccessor(glb, accessorIndex) {
  const accessor = glb.json.accessors[accessorIndex];
  const view = glb.json.bufferViews[accessor.bufferView];
  const component = COMPONENT_INFO[accessor.componentType];
  const width = COMPONENTS[accessor.type];
  if (!component || !width) throw new Error(`${glb.filePath}: unsupported accessor ${accessorIndex}`);
  const baseOffset = (view.byteOffset || 0) + (accessor.byteOffset || 0);
  const stride = view.byteStride || component.size * width;
  const rows = [];
  for (let i = 0; i < accessor.count; i += 1) {
    const row = [];
    for (let j = 0; j < width; j += 1) row.push(component.read(glb.bin, baseOffset + i * stride + j * component.size));
    rows.push(width === 1 ? row[0] : row);
  }
  return rows;
}

function finiteValues(value, pathName, failures) {
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) finiteValues(value[i], `${pathName}[${i}]`, failures);
  } else if (typeof value === 'number' && !Number.isFinite(value)) {
    failures.push(pathName);
  }
}

const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const length = (v) => Math.hypot(v[0], v[1], v[2]);
const distance = (a, b) => length(sub(a, b));
const normalize = (v) => {
  const len = length(v);
  return len > 1e-10 ? scale(v, 1 / len) : [0, 1, 0];
};
const lerp = (a, b, t) => a + (b - a) * t;
const lerpVec = (a, b, t) => a.map((value, index) => lerp(value, b[index], t));

function normalizeQuat(q) {
  const len = Math.hypot(q[0], q[1], q[2], q[3]);
  return len > 1e-10 ? q.map((value) => value / len) : [0, 0, 0, 1];
}

function slerpQuat(a, b, t) {
  let qa = normalizeQuat(a);
  let qb = normalizeQuat(b);
  let cos = qa[0] * qb[0] + qa[1] * qb[1] + qa[2] * qb[2] + qa[3] * qb[3];
  if (cos < 0) {
    qb = qb.map((value) => -value);
    cos = -cos;
  }
  if (cos > 0.9995) return normalizeQuat(lerpVec(qa, qb, t));
  const theta = Math.acos(Math.max(-1, Math.min(1, cos)));
  const sinTheta = Math.sin(theta);
  const wa = Math.sin((1 - t) * theta) / sinTheta;
  const wb = Math.sin(t * theta) / sinTheta;
  return normalizeQuat(qa.map((value, index) => value * wa + qb[index] * wb));
}

function mat3FromQuat([x, y, z, w]) {
  return [
    [1 - 2 * (y * y + z * z), 2 * (x * y - w * z), 2 * (x * z + w * y)],
    [2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x)],
    [2 * (x * z - w * y), 2 * (y * z + w * x), 1 - 2 * (x * x + y * y)],
  ];
}

function mat4FromTrs(translation = [0, 0, 0], rotation = [0, 0, 0, 1], scl = [1, 1, 1]) {
  const r = mat3FromQuat(normalizeQuat(rotation));
  return [
    r[0][0] * scl[0], r[1][0] * scl[0], r[2][0] * scl[0], 0,
    r[0][1] * scl[1], r[1][1] * scl[1], r[2][1] * scl[1], 0,
    r[0][2] * scl[2], r[1][2] * scl[2], r[2][2] * scl[2], 0,
    translation[0], translation[1], translation[2], 1,
  ];
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

function transformPoint(m, p) {
  return [
    m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
    m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
    m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14],
  ];
}

function transformVector(m, p) {
  return [
    m[0] * p[0] + m[4] * p[1] + m[8] * p[2],
    m[1] * p[0] + m[5] * p[1] + m[9] * p[2],
    m[2] * p[0] + m[6] * p[1] + m[10] * p[2],
  ];
}

function invertRigid(m) {
  const r = [[m[0], m[4], m[8]], [m[1], m[5], m[9]], [m[2], m[6], m[10]]];
  const t = [m[12], m[13], m[14]];
  const rt = [[r[0][0], r[1][0], r[2][0]], [r[0][1], r[1][1], r[2][1]], [r[0][2], r[1][2], r[2][2]]];
  const invT = [-(rt[0][0] * t[0] + rt[0][1] * t[1] + rt[0][2] * t[2]), -(rt[1][0] * t[0] + rt[1][1] * t[1] + rt[1][2] * t[2]), -(rt[2][0] * t[0] + rt[2][1] * t[1] + rt[2][2] * t[2])];
  return [rt[0][0], rt[1][0], rt[2][0], 0, rt[0][1], rt[1][1], rt[2][1], 0, rt[0][2], rt[1][2], rt[2][2], 0, invT[0], invT[1], invT[2], 1];
}

function animationMaps(glb, animationName) {
  const animation = glb.json.animations.find((entry) => entry.name === animationName);
  if (!animation) throw new Error(`${glb.filePath}: missing animation ${animationName}`);
  const maps = new Map();
  for (const channel of animation.channels) {
    const sampler = animation.samplers[channel.sampler];
    const input = readAccessor(glb, sampler.input);
    const output = readAccessor(glb, sampler.output);
    const target = channel.target.node;
    if (!maps.has(target)) maps.set(target, {});
    maps.get(target)[channel.target.path] = { input, output };
  }
  return maps;
}

function sampleTrack(track, time, pathName) {
  if (!track) return undefined;
  const times = track.input;
  const values = track.output;
  if (time <= times[0]) return values[0];
  if (time >= times[times.length - 1]) return values[values.length - 1];
  for (let i = 0; i < times.length - 1; i += 1) {
    if (time >= times[i] && time <= times[i + 1]) {
      const t = (time - times[i]) / (times[i + 1] - times[i]);
      return pathName === 'rotation' ? slerpQuat(values[i], values[i + 1], t) : lerpVec(values[i], values[i + 1], t);
    }
  }
  return values[values.length - 1];
}

function localTransformAt(node, tracks, time) {
  const translation = sampleTrack(tracks?.translation, time, 'translation') || node.translation || [0, 0, 0];
  const rotation = sampleTrack(tracks?.rotation, time, 'rotation') || node.rotation || [0, 0, 0, 1];
  const scaleValue = sampleTrack(tracks?.scale, time, 'scale') || node.scale || [1, 1, 1];
  return mat4FromTrs(translation, rotation, scaleValue);
}

function worldMatricesAt(glb, animationName, time) {
  const tracksByNode = animationMaps(glb, animationName);
  const worlds = new Map();
  const visiting = new Set();
  const parentByChild = new Map();
  glb.json.nodes.forEach((node, index) => (node.children || []).forEach((child) => parentByChild.set(child, index)));
  function resolve(index) {
    if (worlds.has(index)) return worlds.get(index);
    if (visiting.has(index)) throw new Error(`${glb.filePath}: node cycle at ${index}`);
    visiting.add(index);
    const parent = parentByChild.has(index) ? resolve(parentByChild.get(index)) : mat4FromTrs();
    const local = localTransformAt(glb.json.nodes[index], tracksByNode.get(index), time);
    const world = multiplyMat4(parent, local);
    worlds.set(index, world);
    visiting.delete(index);
    return world;
  }
  glb.json.nodes.forEach((_, index) => resolve(index));
  return worlds;
}

function nodeIndexByName(glb, name) {
  const index = glb.json.nodes.findIndex((node) => node.name === name);
  if (index === -1) throw new Error(`${glb.filePath}: missing node ${name}`);
  return index;
}

function meshYExtent(glb, nodeIndex) {
  const node = glb.json.nodes[nodeIndex];
  const mesh = glb.json.meshes[node.mesh];
  const positions = readAccessor(glb, mesh.primitives[0].attributes.POSITION);
  let minY = Infinity;
  let maxY = -Infinity;
  for (const position of positions) {
    minY = Math.min(minY, position[1]);
    maxY = Math.max(maxY, position[1]);
  }
  return { minY, maxY };
}

function verifyFinite(glb) {
  const failures = [];
  glb.json.nodes?.forEach((node, index) => {
    finiteValues(node.translation, `nodes[${index}].translation`, failures);
    finiteValues(node.rotation, `nodes[${index}].rotation`, failures);
    finiteValues(node.scale, `nodes[${index}].scale`, failures);
  });
  glb.json.accessors?.forEach((_, index) => finiteValues(readAccessor(glb, index), `accessors[${index}]`, failures));
  return failures;
}

function verifySunShangxiang(glb, hero) {
  const bow = hero.bowMotion;
  const samples = [0.037, 0.111, 0.183, 0.333, 0.457, 0.573, 0.721];
  const leftIndex = nodeIndexByName(glb, bow.bone);
  const rightIndex = nodeIndexByName(glb, bow.drawBone);
  const stringIndices = bow.strings.map((name) => nodeIndexByName(glb, name));
  const arrowIndex = nodeIndexByName(glb, bow.arrows[0].part);
  const stringExtents = stringIndices.map((index) => meshYExtent(glb, index));
  const rows = [];
  let maxStringEndpointError = 0;
  let maxArrowDirectionError = 0;
  for (const time of samples) {
    const worlds = worldMatricesAt(glb, 'Attack', time);
    const leftWorld = worlds.get(leftIndex);
    const rightWorld = worlds.get(rightIndex);
    const nockLocal = transformPoint(invertRigid(leftWorld), transformPoint(rightWorld, bow.drawPoint));
    const nockWorld = transformPoint(leftWorld, nockLocal);
    const gripWorld = transformPoint(leftWorld, bow.grip);
    const expectedArrowY = normalize(sub(gripWorld, nockWorld));
    const perString = [];
    for (let i = 0; i < stringIndices.length; i += 1) {
      const stringWorld = worlds.get(stringIndices[i]);
      const { minY, maxY } = stringExtents[i];
      const a = transformPoint(stringWorld, [0, minY, 0]);
      const b = transformPoint(stringWorld, [0, maxY, 0]);
      const tipWorld = transformPoint(leftWorld, bow.tips[i]);
      const endpointError = Math.min(distance(a, tipWorld) + distance(b, nockWorld), distance(a, nockWorld) + distance(b, tipWorld));
      maxStringEndpointError = Math.max(maxStringEndpointError, endpointError);
      perString.push({ name: bow.strings[i], endpointError });
    }
    const arrowWorld = worlds.get(arrowIndex);
    const actualArrowY = normalize(transformVector(arrowWorld, [0, 1, 0]));
    const arrowDirectionError = length(sub(actualArrowY, expectedArrowY));
    maxArrowDirectionError = Math.max(maxArrowDirectionError, arrowDirectionError);
    rows.push({ time, nockLocal, stringEndpointErrors: perString, arrowDirectionError });
  }
  return { samples, maxStringEndpointError, maxArrowDirectionError, rows };
}

const heroes = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const glbFiles = fs.readdirSync(modelsDir).filter((name) => name.endsWith('.glb')).sort();
const finiteSummary = [];
for (const name of glbFiles) {
  const glb = readGlb(path.join(modelsDir, name));
  const failures = verifyFinite(glb);
  finiteSummary.push({ file: name, nodeCount: glb.json.nodes.length, animationCount: glb.json.animations?.length || 0, animationNames: (glb.json.animations || []).map((entry) => entry.name), finite: failures.length === 0, failureCount: failures.length, firstFailures: failures.slice(0, 8) });
}
const sunGlb = readGlb(path.join(modelsDir, 'sun_shangxiang.glb'));
const sunHero = heroes.find((hero) => hero.id === 'sun_shangxiang');
const sunShangxiang = verifySunShangxiang(sunGlb, sunHero);
const report = {
  generatedAt: new Date().toISOString(),
  modelDirectory: path.relative(repoRoot, modelsDir),
  glbCount: glbFiles.length,
  allGlbFinite: finiteSummary.every((entry) => entry.finite),
  finiteSummary,
  sunShangxiang,
  thresholds: {
    maxStringEndpointErrorStuds: 0.03,
    maxArrowDirectionVectorError: 0.03,
  },
  pass: finiteSummary.every((entry) => entry.finite) && sunShangxiang.maxStringEndpointError < 0.03 && sunShangxiang.maxArrowDirectionError < 0.03,
};
fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ glbCount: report.glbCount, allGlbFinite: report.allGlbFinite, maxStringEndpointError: report.sunShangxiang.maxStringEndpointError, maxArrowDirectionError: report.sunShangxiang.maxArrowDirectionError, pass: report.pass, report: path.relative(repoRoot, outPath) }, null, 2));
process.exit(report.pass ? 0 : 1);
