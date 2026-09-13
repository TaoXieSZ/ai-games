const DATA_URL = "../../data/hero-models-v1.json";
const MODEL_ROOT = "../../models/hero-models-v1";

const state = {
  models: [],
  modelIndex: 0,
  action: "ready",
  time: 0,
  yaw: Math.PI - 0.35,
  pitch: -0.06,
  distance: 10,
  cameraTarget: [0, 3, 0],
  dragging: false,
  lastPointer: [0, 0],
  gl: null,
  program: null,
  meshCache: new Map(),
  gpuMeshCache: new WeakMap(),
  gridMesh: null,
};

const canvas = document.querySelector("#stage");
const statusEl = document.querySelector("#status");
const summaryEl = document.querySelector("#modelSummary");
const statsEl = document.querySelector("#modelStats");
const heroTabs = document.querySelector("#heroTabs");
const referenceToggle = document.querySelector("#referenceToggle");
const referenceCard = document.querySelector("#referenceCard");
const glbLink = document.querySelector("#glbLink");
const rbxmxLink = document.querySelector("#rbxmxLink");
const fileStatus = document.querySelector("#fileStatus");

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
}

function normalizeModel(model, index) {
  const id = model.id || `hero_${index + 1}`;
  return {
    id,
    name: model.name || id,
    referenceArt: resolveProjectAsset(model.referenceArt || `assets/art-design/hero-pool-v1/${id}.png`),
    bones: Array.isArray(model.bones) ? model.bones : [],
    parts: Array.isArray(model.parts) ? model.parts : [],
    poses: model.poses || {},
  };
}

function resolveProjectAsset(path) {
  const value = String(path || "");
  if (!value) return "";
  if (/^(https?:)?\/\//.test(value) || value.startsWith("../")) return value;
  return `../../${value.replace(/^\.?\//, "")}`;
}

async function loadModels() {
  try {
    const response = await fetch(DATA_URL, { cache: "no-store" });
    if (!response.ok) throw new Error("模型数据未生成");
    const data = await response.json();
    if (!Array.isArray(data) || !data.length) throw new Error("模型数据为空");
    state.models = data.map(normalizeModel).map(prepareModelRuntime);
    statusEl.textContent = "";
  } catch (error) {
    state.models = [];
    statusEl.textContent = `模型数据读取失败：${error.message}。请确认 ${DATA_URL} 已生成。`;
  }
  summaryEl.textContent = `${state.models.length} 位武将 · Roblox积木骨架 · 可预览动作`;
}

function prepareModelRuntime(model) {
  const draws = [];
  let vertexCount = 0;
  model.bones.forEach((bone) => {
    if (!bone.visible || bone.name === "Root") return;
    const mesh = primitiveMesh("box", vec3(bone.size), materialColor(bone.color || "#ffffff", "SmoothPlastic"));
    const local = translationMat4(...vec3(bone.center));
    draws.push({ bone: bone.name, mesh, local });
    vertexCount += mesh.positions.length / 3;
  });

  model.parts.forEach((part) => {
    const mesh = primitiveMesh(part.shape || "box", vec3(part.size), materialColor(part.color, part.material));
    const local = multiplyMat4(translationMat4(...vec3(part.position)), rotationMat4(...vec3(part.rotation).map(degToRad)));
    draws.push({ bone: part.bone, mesh, local });
    vertexCount += mesh.positions.length / 3;
  });

  const prepared = { ...model, runtime: { draws, vertexCount, bounds: null } };
  prepared.runtime.bounds = computeModelBounds(prepared);
  return prepared;
}

function computeModelBounds(model) {
  const bounds = {
    min: [Infinity, Infinity, Infinity],
    max: [-Infinity, -Infinity, -Infinity],
  };
  ["ready", "walk", "attack"].forEach((action) => {
    [0, 0.25, 0.5, 0.75, 1].forEach((time) => {
      const boneMatrices = computeBoneMatrices(model, action, time);
      model.runtime.draws.forEach((item) => {
        const matrix = multiplyMat4(boneMatrices.get(item.bone) || identityMat4(), item.local);
        for (let index = 0; index < item.mesh.positions.length; index += 3) {
          includePoint(bounds, transformPoint(matrix, [item.mesh.positions[index], item.mesh.positions[index + 1], item.mesh.positions[index + 2]]));
        }
      });
    });
  });
  if (!Number.isFinite(bounds.min[0])) return { center: [0, 3, 0], radius: 5 };
  const center = bounds.min.map((value, index) => (value + bounds.max[index]) / 2);
  const span = bounds.max.map((value, index) => value - bounds.min[index]);
  const radius = Math.max(3, Math.hypot(...span) / 2);
  const corners = [];
  for (const x of [bounds.min[0], bounds.max[0]]) {
    for (const y of [bounds.min[1], bounds.max[1]]) {
      for (const z of [bounds.min[2], bounds.max[2]]) corners.push([x, y, z]);
    }
  }
  return { ...bounds, center, span, radius, corners };
}

function includePoint(bounds, point) {
  for (let index = 0; index < 3; index += 1) {
    bounds.min[index] = Math.min(bounds.min[index], point[index]);
    bounds.max[index] = Math.max(bounds.max[index], point[index]);
  }
}

function transformPoint(matrix, point) {
  const [x, y, z] = point;
  return [
    matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12],
    matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13],
    matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14],
  ];
}

function setupTabs() {
  heroTabs.replaceChildren();
  state.models.forEach((model, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = model.name;
    button.setAttribute("role", "tab");
    button.setAttribute("aria-pressed", String(index === state.modelIndex));
    button.addEventListener("click", () => {
      state.modelIndex = index;
      frameCurrentModel(Math.PI - 0.35);
      refreshUi();
    });
    heroTabs.append(button);
  });
}

function refreshUi() {
  const model = currentModel();
  if (!model) return;
  [...heroTabs.children].forEach((button, index) => button.setAttribute("aria-pressed", String(index === state.modelIndex)));
  referenceCard.innerHTML = `<img src="${escapeHtml(model.referenceArt)}" alt="${escapeHtml(model.name)}原画参考"><figcaption>${escapeHtml(model.name)} · 原画参考</figcaption>`;
  referenceCard.hidden = !referenceToggle.checked;
  setDownload(glbLink, `${MODEL_ROOT}/${model.id}.glb`, `${model.id}.glb`);
  setDownload(rbxmxLink, `${MODEL_ROOT}/${model.id}.rbxmx`, `${model.id}.rbxmx`);
  checkFiles(model);
}

function frameCurrentModel(yaw = state.yaw) {
  const model = currentModel();
  if (!model?.runtime?.bounds) return;
  state.yaw = yaw;
  const bounds = model.runtime.bounds;
  const rect = canvas.getBoundingClientRect();
  const aspect = Math.max(0.55, (rect.width || 1) / (rect.height || 1));
  const fovY = degToRad(38);
  const tanY = Math.tan(fovY / 2);
  const tanX = tanY * aspect;
  const center = bounds.center;
  const camera = cameraBasis(yaw, state.pitch);
  let distance = 0;

  bounds.corners.forEach((corner) => {
    const rel = subtractVec3(corner, center);
    const x = Math.abs(dot(camera.right, rel));
    const y = Math.abs(dot(camera.up, rel));
    const z = dot(camera.forward, rel);
    distance = Math.max(distance, z + x / (tanX * 0.82), z + y / (tanY * 0.82));
  });

  state.cameraTarget = center;
  state.distance = clamp(distance, 9, 32);
}

function setDownload(anchor, href, name) {
  anchor.href = href;
  anchor.download = name;
  anchor.removeAttribute("aria-disabled");
}

async function checkFiles(model) {
  const files = [
    [`${MODEL_ROOT}/${model.id}.glb`, "GLB"],
    [`${MODEL_ROOT}/${model.id}.rbxmx`, "RBXMX"],
  ];
  const checks = await Promise.all(files.map(async ([url, label]) => {
    try {
      const response = await fetch(url, { method: "HEAD", cache: "no-store" });
      return response.ok ? label : null;
    } catch {
      return null;
    }
  }));
  const available = checks.filter(Boolean);
  glbLink.setAttribute("aria-disabled", String(!available.includes("GLB")));
  rbxmxLink.setAttribute("aria-disabled", String(!available.includes("RBXMX")));
  fileStatus.textContent = available.length ? `可下载：${available.join("、")}` : "模型导出文件待生成，检视器先显示骨架几何。";
}

function currentModel() {
  return state.models[state.modelIndex] || null;
}

function initGl() {
  const gl = canvas.getContext("webgl", { antialias: true, alpha: false, preserveDrawingBuffer: true });
  if (!gl) {
    statusEl.textContent = "当前浏览器不支持 WebGL。";
    return false;
  }
  state.gl = gl;
  const vertex = compileShader(gl, gl.VERTEX_SHADER, `
    attribute vec3 aPosition;
    attribute vec3 aNormal;
    attribute vec3 aColor;
    uniform mat4 uModel;
    uniform mat4 uViewProj;
    varying vec3 vNormal;
    varying vec3 vColor;
    varying vec3 vWorld;
    void main() {
      vec4 world = uModel * vec4(aPosition, 1.0);
      vWorld = world.xyz;
      vNormal = mat3(uModel) * aNormal;
      vColor = aColor;
      gl_Position = uViewProj * world;
    }
  `);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, `
    precision mediump float;
    varying vec3 vNormal;
    varying vec3 vColor;
    varying vec3 vWorld;
    uniform vec3 uLight;
    void main() {
      vec3 n = normalize(vNormal);
      float diffuse = max(dot(n, normalize(uLight)), 0.0);
      float rim = pow(1.0 - max(dot(n, normalize(vec3(0.0, 0.35, 1.0))), 0.0), 2.0);
      vec3 color = vColor * (0.48 + diffuse * 0.48) + vec3(0.85, 0.90, 1.0) * rim * 0.035;
      float fog = smoothstep(12.0, 23.0, length(vWorld.xz));
      gl_FragColor = vec4(mix(color, vec3(0.03, 0.07, 0.055), fog), 1.0);
    }
  `);
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  state.program = {
    id: program,
    aPosition: gl.getAttribLocation(program, "aPosition"),
    aNormal: gl.getAttribLocation(program, "aNormal"),
    aColor: gl.getAttribLocation(program, "aColor"),
    uModel: gl.getUniformLocation(program, "uModel"),
    uViewProj: gl.getUniformLocation(program, "uViewProj"),
    uLight: gl.getUniformLocation(program, "uLight"),
  };
  state.gridMesh = makeGrid();
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.clearColor(0.035, 0.07, 0.055, 1);
  return true;
}

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
  return shader;
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.floor(rect.width * ratio));
  const height = Math.max(1, Math.floor(rect.height * ratio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
}

function render(now = 0) {
  state.time = now / 1000;
  const gl = state.gl;
  if (!gl) return;
  resizeCanvas();
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const model = currentModel();
  if (!model) return;
  const aspect = canvas.width / canvas.height;
  const camera = cameraBasis(state.yaw, state.pitch);
  const eye = addVec3(state.cameraTarget, scaleVec3(camera.back, state.distance));
  const view = lookAt(eye, state.cameraTarget, [0, 1, 0]);
  const proj = perspective(degToRad(38), aspect, 0.1, 80);
  const viewProj = multiplyMat4(proj, view);
  const boneMatrices = computeBoneMatrices(model, state.action, state.time);
  statsEl.textContent = `几何 ${model.runtime.draws.length} · 顶点 ${model.runtime.vertexCount} · 骨骼 ${model.bones.length}`;

  drawMesh(state.gridMesh, identityMat4(), viewProj);
  model.runtime.draws.forEach((item) => drawMesh(item.mesh, multiplyMat4(boneMatrices.get(item.bone) || identityMat4(), item.local), viewProj));
  requestAnimationFrame(render);
}

function drawMesh(mesh, matrix, viewProj) {
  const gl = state.gl;
  const program = state.program;
  if (!mesh.indices.length) return;
  const gpu = uploadMesh(mesh);
  gl.useProgram(program.id);
  bindArray(program.aPosition, gpu.position, 3);
  bindArray(program.aNormal, gpu.normal, 3);
  bindArray(program.aColor, gpu.color, 3);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gpu.index);
  gl.uniformMatrix4fv(program.uModel, false, matrix);
  gl.uniformMatrix4fv(program.uViewProj, false, viewProj);
  gl.uniform3f(program.uLight, -0.42, 0.82, -0.64);
  gl.drawElements(gl.TRIANGLES, gpu.count, gl.UNSIGNED_SHORT, 0);
}

function uploadMesh(mesh) {
  const gl = state.gl;
  const cached = state.gpuMeshCache.get(mesh);
  if (cached) return cached;
  const gpu = {
    position: gl.createBuffer(),
    normal: gl.createBuffer(),
    color: gl.createBuffer(),
    index: gl.createBuffer(),
    count: mesh.indices.length,
  };
  gl.bindBuffer(gl.ARRAY_BUFFER, gpu.position);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.positions), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, gpu.normal);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.normals), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, gpu.color);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.colors), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gpu.index);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(mesh.indices), gl.STATIC_DRAW);
  state.gpuMeshCache.set(mesh, gpu);
  return gpu;
}

function bindArray(attribute, buffer, size) {
  const gl = state.gl;
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(attribute);
  gl.vertexAttribPointer(attribute, size, gl.FLOAT, false, 0, 0);
}

function computeBoneMatrices(model, action, time) {
  const boneMap = new Map(model.bones.map((bone) => [bone.name, bone]));
  const matrices = new Map();
  const pulse = action === "ready" ? Math.sin(time * 2.2) * 3 : action === "walk" ? Math.sin(time * 5.4) * 18 : Math.sin(time * 7.0) * 8;

  function resolve(name) {
    if (matrices.has(name)) return matrices.get(name);
    const bone = boneMap.get(name);
    if (!bone) return identityMat4();
    const parent = bone.parent ? resolve(bone.parent) : identityMat4();
    const pose = poseFor(model, action, bone.name, pulse, time);
    const local = multiplyMat4(translationMat4(...vec3(bone.position)), rotationMat4(...pose.map(degToRad)));
    const world = multiplyMat4(parent, local);
    matrices.set(name, world);
    return world;
  }

  model.bones.forEach((bone) => resolve(bone.name));
  return matrices;
}

function poseFor(model, action, boneName, pulse, time) {
  const base = model.poses?.[action]?.[boneName] || model.poses?.ready?.[boneName] || [0, 0, 0];
  const pose = [...base];
  if (action === "ready") {
    if (boneName === "Torso") pose[0] += pulse * 0.22;
    if (boneName === "Head") pose[1] += pulse * 0.18;
  } else if (action === "walk") {
    if (boneName === "LeftArm" || boneName === "RightLeg") pose[0] += pulse;
    if (boneName === "RightArm" || boneName === "LeftLeg") pose[0] -= pulse;
    if (boneName === "Torso") pose[2] += Math.sin(time * 5.4) * 2.5;
  } else if (action === "attack") {
    if (boneName === "RightArm") pose[0] += pulse - 28;
    if (boneName === "Torso") pose[1] += pulse * 0.7;
  }
  return pose;
}

function primitiveMesh(shape, size, color) {
  const normalizedShape = String(shape || "box").toLowerCase();
  const key = `${normalizedShape}|${size.join(",")}|${color.map((value) => value.toFixed(4)).join(",")}`;
  const cached = state.meshCache.get(key);
  if (cached) return cached;
  const mesh = normalizedShape === "cylinder"
    ? cylinderMesh(size, color)
    : normalizedShape === "sphere"
      ? sphereMesh(size, color)
      : normalizedShape === "wedge"
        ? wedgeMesh(size, color)
        : boxMesh(size, color);
  state.meshCache.set(key, mesh);
  return mesh;
}

function materialColor(color, material) {
  const rgb = hexToRgb(color || "#ffffff");
  if (material === "Metal") return rgb;
  if (material === "Fabric") return rgb.map((value) => value * 0.88);
  return rgb;
}

function boxMesh(size, color) {
  const [x, y, z] = size.map((value) => value / 2);
  const faces = [
    [[[-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]], [0, 0, 1]],
    [[[x, -y, -z], [-x, -y, -z], [-x, y, -z], [x, y, -z]], [0, 0, -1]],
    [[[-x, y, z], [x, y, z], [x, y, -z], [-x, y, -z]], [0, 1, 0]],
    [[[-x, -y, -z], [x, -y, -z], [x, -y, z], [-x, -y, z]], [0, -1, 0]],
    [[[x, -y, z], [x, -y, -z], [x, y, -z], [x, y, z]], [1, 0, 0]],
    [[[-x, -y, -z], [-x, -y, z], [-x, y, z], [-x, y, -z]], [-1, 0, 0]],
  ];
  return facesToMesh(faces, color);
}

function wedgeMesh(size, color) {
  const [x, y, z] = size.map((value) => value / 2);
  const slopeNormal = normalize([0, z, -y]);
  const faces = [
    [[[-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]], [0, 0, 1]],
    [[[-x, -y, -z], [x, -y, -z], [x, -y, z], [-x, -y, z]], [0, -1, 0]],
    [[[-x, -y, -z], [-x, -y, z], [-x, y, z]], [-1, 0, 0]],
    [[[x, -y, z], [x, -y, -z], [x, y, z]], [1, 0, 0]],
    [[[-x, y, z], [x, y, z], [x, -y, -z], [-x, -y, -z]], slopeNormal],
  ];
  return facesToMesh(faces, color);
}

function cylinderMesh(size, color) {
  const [sx, sy, sz] = size;
  const rx = sx / 2;
  const rz = sz / 2;
  const h = sy / 2;
  const segments = 24;
  const mesh = emptyMesh();
  for (let i = 0; i < segments; i += 1) {
    const a = (i / segments) * Math.PI * 2;
    const b = ((i + 1) / segments) * Math.PI * 2;
    const p1 = [Math.cos(a) * rx, -h, Math.sin(a) * rz];
    const p2 = [Math.cos(b) * rx, -h, Math.sin(b) * rz];
    const p3 = [Math.cos(b) * rx, h, Math.sin(b) * rz];
    const p4 = [Math.cos(a) * rx, h, Math.sin(a) * rz];
    pushFace(mesh, [p1, p2, p3, p4], normalize([Math.cos((a + b) / 2), 0, Math.sin((a + b) / 2)]), color);
    pushFace(mesh, [[0, h, 0], p4, p3], [0, 1, 0], color);
    pushFace(mesh, [[0, -h, 0], p2, p1], [0, -1, 0], color);
  }
  return mesh;
}

function sphereMesh(size, color) {
  const [sx, sy, sz] = size.map((value) => value / 2);
  const rows = 12;
  const cols = 18;
  const mesh = emptyMesh();
  for (let row = 0; row < rows; row += 1) {
    const v1 = row / rows;
    const v2 = (row + 1) / rows;
    const t1 = v1 * Math.PI;
    const t2 = v2 * Math.PI;
    for (let col = 0; col < cols; col += 1) {
      const u1 = (col / cols) * Math.PI * 2;
      const u2 = ((col + 1) / cols) * Math.PI * 2;
      const points = [spherePoint(t1, u1, sx, sy, sz), spherePoint(t1, u2, sx, sy, sz), spherePoint(t2, u2, sx, sy, sz), spherePoint(t2, u1, sx, sy, sz)];
      const normal = normalize(points.reduce((acc, point) => [acc[0] + point[0] / sx, acc[1] + point[1] / sy, acc[2] + point[2] / sz], [0, 0, 0]));
      pushFace(mesh, points, normal, color);
    }
  }
  return mesh;
}

function spherePoint(theta, phi, sx, sy, sz) {
  return [Math.sin(theta) * Math.cos(phi) * sx, Math.cos(theta) * sy, Math.sin(theta) * Math.sin(phi) * sz];
}

function makeGrid() {
  const mesh = emptyMesh();
  const color = [0.34, 0.42, 0.32];
  for (let index = -8; index <= 8; index += 1) {
    addThinBox(mesh, [index, -0.06, 0], [0.018, 0.018, 16], color);
    addThinBox(mesh, [0, -0.055, index], [16, 0.018, 0.018], color);
  }
  addThinBox(mesh, [0, -0.075, 0], [7.2, 0.05, 7.2], [0.08, 0.13, 0.1]);
  return mesh;
}

function addThinBox(target, position, size, color) {
  const mesh = boxMesh(size, color);
  const offset = target.positions.length / 3;
  for (let i = 0; i < mesh.positions.length; i += 3) {
    target.positions.push(mesh.positions[i] + position[0], mesh.positions[i + 1] + position[1], mesh.positions[i + 2] + position[2]);
  }
  target.normals.push(...mesh.normals);
  target.colors.push(...mesh.colors);
  target.indices.push(...mesh.indices.map((index) => index + offset));
}

function facesToMesh(faces, color) {
  const mesh = emptyMesh();
  faces.forEach(([points, normal]) => pushFace(mesh, points, normal, color));
  return mesh;
}

function pushFace(mesh, points, normal, color) {
  const offset = mesh.positions.length / 3;
  points.forEach((point) => {
    mesh.positions.push(...point);
    mesh.normals.push(...normal);
    mesh.colors.push(...color);
  });
  if (points.length === 3) mesh.indices.push(offset, offset + 1, offset + 2);
  else mesh.indices.push(offset, offset + 1, offset + 2, offset, offset + 2, offset + 3);
}

function emptyMesh() {
  return { positions: [], normals: [], colors: [], indices: [] };
}

function wireControls() {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      const view = button.dataset.view;
      frameCurrentModel(view === "front" ? Math.PI : view === "side" ? Math.PI / 2 : 0);
      document.querySelectorAll("[data-view]").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
    });
  });
  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      state.action = button.dataset.action;
      document.querySelectorAll("[data-action]").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
    });
  });
  referenceToggle.addEventListener("change", () => {
    referenceCard.hidden = !referenceToggle.checked;
  });
  canvas.addEventListener("pointerdown", (event) => {
    state.dragging = true;
    state.lastPointer = [event.clientX, event.clientY];
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!state.dragging) return;
    const dx = event.clientX - state.lastPointer[0];
    const dy = event.clientY - state.lastPointer[1];
    state.lastPointer = [event.clientX, event.clientY];
    state.yaw += dx * 0.01;
    state.pitch = clamp(state.pitch + dy * 0.006, -0.65, 0.45);
  });
  canvas.addEventListener("pointerup", () => {
    state.dragging = false;
  });
  canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
      state.distance = clamp(state.distance + event.deltaY * 0.012, 6, 40);
  }, { passive: false });
  window.addEventListener("resize", () => frameCurrentModel(state.yaw));
}

function vec3(value) {
  return Array.isArray(value) && value.length >= 3 ? value.map(Number) : [0, 0, 0];
}

function hexToRgb(hex) {
  const clean = String(hex).replace("#", "");
  const int = Number.parseInt(clean.length === 3 ? clean.split("").map((char) => char + char).join("") : clean, 16);
  if (!Number.isFinite(int)) return [1, 1, 1];
  return [((int >> 16) & 255) / 255, ((int >> 8) & 255) / 255, (int & 255) / 255];
}

function degToRad(degrees) {
  return (Number(degrees) || 0) * Math.PI / 180;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalize(vector) {
  const length = Math.hypot(...vector) || 1;
  return vector.map((value) => value / length);
}

function cameraBasis(yaw, pitch) {
  const back = normalize([
    Math.sin(yaw) * Math.cos(pitch),
    Math.sin(pitch),
    Math.cos(yaw) * Math.cos(pitch),
  ]);
  const forward = scaleVec3(back, -1);
  const right = normalize(cross([0, 1, 0], back));
  const up = cross(back, right);
  return { back, forward, right, up };
}

function addVec3(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function subtractVec3(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function scaleVec3(vector, amount) {
  return [vector[0] * amount, vector[1] * amount, vector[2] * amount];
}

function identityMat4() {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

function translationMat4(x, y, z) {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
}

function rotationMat4(rx, ry, rz) {
  const sx = Math.sin(rx), cx = Math.cos(rx);
  const sy = Math.sin(ry), cy = Math.cos(ry);
  const sz = Math.sin(rz), cz = Math.cos(rz);
  const x = [1, 0, 0, 0, 0, cx, sx, 0, 0, -sx, cx, 0, 0, 0, 0, 1];
  const y = [cy, 0, -sy, 0, 0, 1, 0, 0, sy, 0, cy, 0, 0, 0, 0, 1];
  const z = [cz, sz, 0, 0, -sz, cz, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  return multiplyMat4(multiplyMat4(z, y), x);
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

function perspective(fovy, aspect, near, far) {
  const f = 1 / Math.tan(fovy / 2);
  const nf = 1 / (near - far);
  return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0];
}

function lookAt(eye, center, up) {
  const z = normalize([eye[0] - center[0], eye[1] - center[1], eye[2] - center[2]]);
  const x = normalize(cross(up, z));
  const y = cross(z, x);
  return [
    x[0], y[0], z[0], 0,
    x[1], y[1], z[1], 0,
    x[2], y[2], z[2], 0,
    -dot(x, eye), -dot(y, eye), -dot(z, eye), 1,
  ];
}

function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

async function main() {
  await loadModels();
  if (!state.models.length) return;
  setupTabs();
  frameCurrentModel();
  refreshUi();
  wireControls();
  if (initGl()) requestAnimationFrame(render);
}

main().catch((error) => {
  statusEl.textContent = `模型检视器启动失败：${error.message}`;
});
