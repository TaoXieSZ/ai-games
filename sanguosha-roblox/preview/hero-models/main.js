const DATA_URL = "../../data/hero-models-v1.json";
const MODEL_ROOT = "../../models/hero-models-v1";
const MANIFEST_URL = `${MODEL_ROOT}/manifest.json`;
const EFFECTS_URL = "../../data/hero-effects-v1.json";

const EFFECT_KINDS = {
  slash: "出牌 · 单体打击",
  dodge: "响应 · 身法残影",
  heal: "恢复 · 桃花涟漪",
  arrows: "锦囊 · 范围箭雨",
};

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
  gpuMeshUploads: 0,
  gridMesh: null,
  fileManifest: null,
  effectSpecs: [],
  effectsLoaded: false,
  activeEffect: null,
  previousAction: "ready",
  reducedMotion: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
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
const playgroundLink = document.querySelector("#playgroundLink");
const fileStatus = document.querySelector("#fileStatus");
const heroName = document.querySelector("#heroName");
const designNotes = document.querySelector("#designNotes");
const factionLabel = document.querySelector("#factionLabel");
const poseNotes = document.querySelector("#poseNotes");
const effectButtons = document.querySelector("#effectButtons");
const effectStage = document.querySelector("#effectStage");
const effectCancel = document.querySelector("#effectCancel");

const factionNames = {
  wei: "魏",
  shu: "蜀",
  wu: "吴",
  qun: "群",
};

const actionProfiles = new Map([
  ["cao_cao", { actionType: "sword", actionHand: "right" }],
  ["sima_yi", { actionType: "fan-card", actionHand: "left" }],
  ["xiahou_dun", { actionType: "sword", actionHand: "right" }],
  ["zhang_liao", { actionType: "spear", actionHand: "both" }],
  ["xu_chu", { actionType: "hammer", actionHand: "left" }],
  ["guo_jia", { actionType: "fan-card", actionHand: "both" }],
  ["zhen_ji", { actionType: "fan-card", actionHand: "right" }],
  ["liu_bei", { actionType: "fan-card", actionHand: "both" }],
  ["guan_yu", { actionType: "sword", actionHand: "right" }],
  ["zhang_fei", { actionType: "spear", actionHand: "right" }],
  ["zhuge_liang", { actionType: "fan-card", actionHand: "right" }],
  ["zhao_yun", { actionType: "spear", actionHand: "right" }],
  ["ma_chao", { actionType: "spear", actionHand: "right" }],
  ["huang_yueying", { actionType: "fan-card", actionHand: "right" }],
  ["sun_quan", { actionType: "sword", actionHand: "right" }],
  ["gan_ning", { actionType: "sword", actionHand: "right" }],
  ["lu_meng", { actionType: "fan-card", actionHand: "left" }],
  ["huang_gai", { actionType: "hammer", actionHand: "right" }],
  ["zhou_yu", { actionType: "fan-card", actionHand: "left" }],
  ["da_qiao", { actionType: "fan-card", actionHand: "right" }],
  ["lu_xun", { actionType: "fan-card", actionHand: "left" }],
  ["sun_shangxiang", { actionType: "bow", actionHand: "left" }],
  ["hua_tuo", { actionType: "fan-card", actionHand: "left" }],
  ["lu_bu", { actionType: "spear", actionHand: "right" }],
  ["diao_chan", { actionType: "fan-card", actionHand: "left" }],
]);

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
}

function normalizeModel(model, index) {
  const id = model.id || `hero_${index + 1}`;
  return {
    id,
    name: model.name || id,
    faction: model.faction || "",
    designNotes: model.designNotes || "",
    poseDescription: model.poseDescription || "",
    referenceArt: resolveProjectAsset(model.referenceArt || `assets/art-design/hero-pool-v1/${id}.png`),
    bones: Array.isArray(model.bones) ? model.bones : [],
    parts: Array.isArray(model.parts) ? model.parts : [],
    poses: model.poses || {},
    attachmentMotion: Array.isArray(model.attachmentMotion) ? model.attachmentMotion : [],
    bowMotion: model.bowMotion || null,
  };
}

function resolveProjectAsset(path) {
  const value = String(path || "");
  if (!value) return "";
  if (/^(https?:)?\/\//.test(value) || value.startsWith("../")) return value;
  return `../../${value.replace(/^\.?\//, "")}`;
}

async function loadEffects() {
  try {
    const response = await fetch(EFFECTS_URL, { cache: "no-store" });
    if (!response.ok) throw new Error("特效数据未生成");
    const payload = await response.json();
    const effects = Array.isArray(payload) ? payload : payload.effects;
    if (!Array.isArray(effects) || !effects.length) throw new Error("特效数据为空");
    const required = ["slash", "dodge", "heal", "arrows"];
    const byId = new Map(effects.map((effect) => [effect.id, effect]));
    if (!required.every((id) => byId.has(id))) throw new Error("特效数据缺少基础技能");
    state.effectSpecs = required.map((id) => byId.get(id));
    state.effectsLoaded = true;
  } catch (error) {
    console.warn(`技能特效数据读取失败：${error.message}`);
    state.effectSpecs = [];
    state.effectsLoaded = false;
    if (effectStage) effectStage.textContent = "特效数据未加载";
  }
}

async function loadModels() {
  try {
    const response = await fetch(DATA_URL, { cache: "no-store" });
    if (!response.ok) throw new Error("模型数据未生成");
    const data = await response.json();
    if (!Array.isArray(data) || !data.length) throw new Error("模型数据为空");
    state.models = data.map(normalizeModel).map(prepareModelRuntime);
    const requestedHero = new URLSearchParams(location.search).get("hero");
    state.modelIndex = Math.max(0, state.models.findIndex((model) => model.id === requestedHero));
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
  const attachmentMotion = prepareAttachmentMotion(model.attachmentMotion);
  const bowMotion = prepareBowMotion(model.bowMotion);
  model.bones.forEach((bone) => {
    if (!bone.visible || bone.name === "Root") return;
    const mesh = primitiveMesh("box", vec3(bone.size), materialColor(bone.color || "#ffffff", "SmoothPlastic"));
    const local = translationMat4(...vec3(bone.center));
    draws.push({ name: bone.name, bone: bone.name, mesh, local, size: vec3(bone.size), kind: "bone" });
    vertexCount += mesh.positions.length / 3;
  });

  model.parts.forEach((part) => {
    const size = vec3(part.size);
    const mesh = primitiveMesh(part.shape || "box", size, materialColor(part.color, part.material));
    const local = multiplyMat4(translationMat4(...vec3(part.position)), rotationMat4(...vec3(part.rotation).map(degToRad)));
    draws.push({ name: part.name || "", bone: part.bone, mesh, local, size, material: part.material || "SmoothPlastic", kind: "part" });
    vertexCount += mesh.positions.length / 3;
  });

  const prepared = { ...model, runtime: { draws, vertexCount, bounds: null, attachmentMotion, bowMotion } };
  prepared.runtime.bounds = computeModelBounds(prepared);
  prepared.runtime.boundsByAction = Object.fromEntries(["ready", "walk", "attack"].map((action) => [action, computeModelBounds(prepared, [action])]));
  return prepared;
}

function prepareAttachmentMotion(motions) {
  const byPart = new Map();
  motions.forEach((motion) => {
    const prepared = {
      bone: motion.bone || "",
      pivot: vec3(motion.pivot),
      amplitude: vec3(motion.amplitude),
      phase: Number(motion.phase) || 0,
    };
    (Array.isArray(motion.parts) ? motion.parts : []).forEach((name) => byPart.set(name, prepared));
  });
  return byPart;
}

function prepareBowMotion(motion) {
  if (!motion) return null;
  return {
    bone: motion.bone || "LeftArm",
    drawBone: motion.drawBone || "RightArm",
    drawPoint: vec3(motion.drawPoint),
    tips: Array.isArray(motion.tips) ? motion.tips.map(vec3) : [],
    grip: vec3(motion.grip),
    strings: Array.isArray(motion.strings) ? motion.strings : [],
    arrows: Array.isArray(motion.arrows) ? motion.arrows.map((arrow) => ({
      part: arrow.part || "",
      offset: vec3(arrow.offset),
      rotation: vec3(arrow.rotation),
    })) : [],
  };
}

function computeModelBounds(model, actions = ["ready", "walk", "attack"]) {
  const bounds = {
    min: [Infinity, Infinity, Infinity],
    max: [-Infinity, -Infinity, -Infinity],
  };
  actions.forEach((action) => {
    [0, 0.25, 0.5, 0.75, 1].forEach((time) => {
      const boneMatrices = computeBoneMatrices(model, action, time);
      model.runtime.draws.forEach((item) => {
        const matrix = drawMatrixForItem(model, item, boneMatrices, action, time);
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
    const faction = factionNames[model.faction] || model.faction || "-";
    button.innerHTML = `<span class="faction-chip">${escapeHtml(faction)}</span><span class="hero-label">${escapeHtml(model.name)}</span>`;
    button.setAttribute("role", "tab");
    button.setAttribute("title", `${model.name}${model.faction ? ` · ${factionNames[model.faction] || model.faction}` : ""}`);
    button.setAttribute("aria-pressed", String(index === state.modelIndex));
    button.addEventListener("click", () => {
      state.modelIndex = index;
      const url = new URL(location.href);
      url.searchParams.set("hero", model.id);
      history.replaceState(null, "", url);
      cancelEffect(false);
      frameCurrentModel(Math.PI - 0.35);
      refreshUi();
    });
    heroTabs.append(button);
  });
}

function setupEffects() {
  if (!effectButtons) return;
  effectButtons.replaceChildren();
  if (!state.effectsLoaded) {
    const button = document.createElement("button");
    button.type = "button";
    button.disabled = true;
    button.innerHTML = `<span class="effect-label">未加载</span><span class="effect-kind">需要 hero-effects-v1.json</span>`;
    effectButtons.append(button);
    if (effectStage) effectStage.textContent = "特效数据未加载";
    return;
  }
  state.effectSpecs.forEach((effect) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.effect = effect.id;
    button.style.setProperty("--effect-color", effect.color || "#F4B45F");
    button.style.setProperty("--effect-accent", effect.accent || "#F66D58");
    button.setAttribute("aria-pressed", "false");
    button.innerHTML = `<span class="effect-label">${escapeHtml(effect.label || effect.id)}</span><span class="effect-kind">${escapeHtml(EFFECT_KINDS[effect.id] || "技能特效")}</span>`;
    button.addEventListener("click", () => playEffect(effect.id));
    effectButtons.append(button);
  });
  effectCancel?.addEventListener("click", () => cancelEffect(true));
}

function playEffect(id) {
  const effect = state.effectSpecs.find((entry) => entry.id === id);
  if (!effect) return;
  const now = state.time || performance.now() / 1000;
  state.previousAction = state.activeEffect ? state.previousAction : state.action;
  state.activeEffect = { ...effect, startedAt: now };
  setPreviewAction(id === "slash" || id === "arrows" ? "attack" : "ready");
  updateEffectUi(0);
  frameCurrentModel(state.yaw, true);
}

function cancelEffect(showMessage = true) {
  if (!state.activeEffect && !showMessage) return;
  const restore = state.previousAction || "ready";
  state.activeEffect = null;
  state.previousAction = restore;
  setPreviewAction(restore);
  updateEffectButtons(null);
  if (effectStage) effectStage.textContent = showMessage ? "特效已清理，模型回到动作预览。" : "选择技能预览特效";
}

function finishEffect() {
  const restore = state.previousAction || "ready";
  state.activeEffect = null;
  setPreviewAction(restore);
  updateEffectButtons(null);
  if (effectStage) effectStage.textContent = "特效播放完成，已回到动作预览。";
}

function updateEffectUi(elapsed) {
  const effect = state.activeEffect;
  updateEffectButtons(effect?.id || null);
  if (!effectStage || !effect) return;
  const stage = elapsed < effect.telegraph ? "预示" : elapsed < effect.impact ? "释放" : "消散";
  effectStage.textContent = `${effect.label || effect.id} · ${stage}`;
}

function updateEffectButtons(activeId) {
  effectButtons?.querySelectorAll("[data-effect]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.effect === activeId));
  });
}

function setPreviewAction(action) {
  state.action = action || "ready";
  frameCurrentModel(state.yaw, Boolean(state.activeEffect));
  document.querySelectorAll("[data-action]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.action === state.action));
  });
}

function refreshUi() {
  const model = currentModel();
  if (!model) return;
  [...heroTabs.children].forEach((button, index) => button.setAttribute("aria-pressed", String(index === state.modelIndex)));
  heroName.textContent = model.name;
  designNotes.textContent = model.designNotes || "设计说明待补充。";
  factionLabel.textContent = factionNames[model.faction] || model.faction || "未标注";
  poseNotes.textContent = describePose(model);
  referenceCard.innerHTML = `<img src="${escapeHtml(model.referenceArt)}" alt="${escapeHtml(model.name)}原画参考"><figcaption>${escapeHtml(model.name)} · 原画参考</figcaption>`;
  referenceCard.hidden = !referenceToggle.checked;
  setDownload(glbLink, `${MODEL_ROOT}/${model.id}.glb`, `${model.id}.glb`);
  setDownload(rbxmxLink, `${MODEL_ROOT}/${model.id}.rbxmx`, `${model.id}.rbxmx`);
  checkFiles(model);
}

function describePose(model) {
  return model.poseDescription || "旋转查看站姿，切换下方动作预览。";
}

function frameCurrentModel(yaw = state.yaw, includeActiveEffect = false) {
  const model = currentModel();
  if (!model?.runtime?.bounds) return;
  state.yaw = yaw;
  const actionBounds = model.runtime.boundsByAction?.[state.action] || model.runtime.bounds;
  const bounds = includeActiveEffect ? (activeEffectBounds(model) || model.runtime.bounds) : actionBounds;
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
  const heroFiles = await getHeroFiles(model.id);
  const available = [];
  if (heroFiles?.glb) available.push("GLB");
  if (heroFiles?.rbxmx) available.push("RBXMX");
  available.push("Roblox试演场");
  glbLink.setAttribute("aria-disabled", String(!heroFiles?.glb));
  rbxmxLink.setAttribute("aria-disabled", String(!heroFiles?.rbxmx));
  playgroundLink.removeAttribute("aria-disabled");
  fileStatus.textContent = available.length ? `可下载：${available.join("、")}` : "模型导出文件待生成，检视器先显示骨架几何。";
}

async function getHeroFiles(id) {
  if (!state.fileManifest) {
    try {
      const response = await fetch(MANIFEST_URL, { cache: "no-store" });
      if (!response.ok) throw new Error("manifest missing");
      state.fileManifest = await response.json();
    } catch {
      state.fileManifest = { heroes: [] };
    }
  }
  return state.fileManifest.heroes?.find((hero) => hero.id === id)?.files || null;
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
    uniform float uAlpha;
    uniform float uEmissive;
    uniform vec3 uEye;
    uniform float uMetal;
    uniform float uRoughness;
    void main() {
      vec3 n = normalize(vNormal);
      vec3 key = normalize(uLight);
      vec3 view = normalize(uEye - vWorld);
      float diffuse = max(dot(n, key), 0.0);
      float fill = max(dot(n, normalize(view + vec3(0.35, 0.45, 0.0))), 0.0);
      float sky = n.y * 0.5 + 0.5;
      float rim = pow(1.0 - max(dot(n, view), 0.0), 3.0);
      float specular = pow(max(dot(n, normalize(key + view)), 0.0), mix(90.0, 10.0, uRoughness));
      vec3 lit = vColor * (0.30 + diffuse * 0.54 + fill * 0.22 + sky * 0.12);
      vec3 reflection = mix(vec3(1.0, 0.94, 0.82), vColor, uMetal * 0.65);
      lit += reflection * specular * mix(0.05, 0.38, uMetal) * (1.0 - uRoughness * 0.65);
      lit += vec3(0.70, 0.83, 1.0) * rim * mix(0.018, 0.06, uMetal);
      vec3 glow = min(vec3(1.0), vColor * 1.42 + vec3(0.06, 0.055, 0.035));
      vec3 color = mix(lit, glow, uEmissive);
      float fog = smoothstep(12.0, 23.0, length(vWorld.xz)) * (1.0 - uEmissive * 0.72);
      gl_FragColor = vec4(mix(color, vec3(0.03, 0.07, 0.055), fog), uAlpha);
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
    uAlpha: gl.getUniformLocation(program, "uAlpha"),
    uEmissive: gl.getUniformLocation(program, "uEmissive"),
    uEye: gl.getUniformLocation(program, "uEye"),
    uMetal: gl.getUniformLocation(program, "uMetal"),
    uRoughness: gl.getUniformLocation(program, "uRoughness"),
  };
  state.gridMesh = makeGrid();
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
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
  state.cameraEye = eye;
  const view = lookAt(eye, state.cameraTarget, [0, 1, 0]);
  const proj = perspective(degToRad(38), aspect, 0.1, 80);
  const viewProj = multiplyMat4(proj, view);
  let action = state.action;
  const effect = state.activeEffect;
  const effectElapsed = effect ? state.time - effect.startedAt : 0;
  if (effect && effectElapsed > effect.duration) {
    finishEffect();
    action = state.action;
  } else if (effect) {
    updateEffectUi(effectElapsed);
  }
  const poseTime = effect && (effect.id === "slash" || effect.id === "arrows") ? clamp(effectElapsed, 0, 0.799) : state.time;
  const boneMatrices = computeBoneMatrices(model, action, poseTime);
  statsEl.textContent = `几何 ${model.runtime.draws.length} · 顶点 ${model.runtime.vertexCount} · 骨骼 ${model.bones.length}`;

  drawMesh(state.gridMesh, identityMat4(), viewProj);
  drawActiveEffect(model, viewProj, boneMatrices, effectElapsed, "behind");
  model.runtime.draws.forEach((item) => drawMesh(item.mesh, drawMatrixForItem(model, item, boneMatrices, action, poseTime), viewProj, 1, item.material === "Neon" ? 1 : 0, item.material));
  drawActiveEffect(model, viewProj, boneMatrices, effectElapsed, "front");
  requestAnimationFrame(render);
}

function drawActiveEffect(model, viewProj, boneMatrices, elapsed, layer) {
  const effect = state.activeEffect;
  if (!effect || elapsed < 0 || elapsed > effect.duration) return;
  if (effect.id === "slash") drawSlashEffect(model, viewProj, boneMatrices, effect, elapsed, layer);
  if (effect.id === "dodge") drawDodgeEffect(model, viewProj, effect, elapsed, layer);
  if (effect.id === "heal") drawHealEffect(model, viewProj, effect, elapsed, layer);
  if (effect.id === "arrows") drawArrowsEffect(model, viewProj, effect, elapsed, layer);
}

function effectProgress(effect, elapsed) {
  return clamp(elapsed / Math.max(0.001, effect.duration), 0, 1);
}

function effectAnchors(model) {
  const bounds = model.runtime.bounds;
  const root = model.bones.find((bone) => bone.name === "Root");
  const torso = model.bones.find((bone) => bone.name === "Torso");
  const rootPosition = vec3(root?.position || [0, 3.2, 0]);
  const torsoPosition = vec3(torso?.position || [0, 0, 0]);
  const ground = Math.max(0.02, (bounds?.min?.[1] ?? 0) + 0.04);
  const center = [rootPosition[0] + torsoPosition[0], rootPosition[1] + torsoPosition[1], rootPosition[2] + torsoPosition[2]];
  return {
    center,
    ground,
    chest: [center[0], center[1] + 0.48, center[2] - 0.25],
    front: [center[0], ground, center[2] - 2.35],
    sideLeft: [center[0] - 1.05, ground, center[2] - 0.2],
    sideRight: [center[0] + 1.05, ground, center[2] - 0.2],
  };
}

function drawSlashEffect(model, viewProj, boneMatrices, effect, elapsed, layer) {
  const profile = actionProfileForModel(model);
  const { chest, front, ground } = effectAnchors(model);
  const p = effectProgress(effect, elapsed);
  const hit = smoothstep(effect.telegraph, effect.impact, elapsed);
  const fade = 1 - smoothstep(effect.impact, effect.duration, elapsed);
  const color = materialColor(effect.color, "SmoothPlastic");
  const accent = materialColor(effect.accent, "SmoothPlastic");
  if (layer === "behind") {
    drawGroundRing(viewProj, front, 0.78 + 0.22 * hit, 0.075, effect.color, 0.68 * (1 - p * 0.28), false);
    return;
  }
  const alpha = Math.max(0.08, fade);
  if (profile.actionType === "bow") {
    const hand = transformPoint(boneMatrices.get("LeftArm") || identityMat4(), [0, -1.05, -1.18]);
    const start = [hand[0] + 0.18, hand[1] + 0.1, hand[2] - 0.45];
    const end = [front[0] + 0.2, ground + 1.42, front[2] - 0.72];
    const streak = mixVec3(start, end, state.reducedMotion ? 0.72 : Math.max(hit, 0.42));
    drawLine(viewProj, start, streak, 0.13, effect.color, 0.98 * alpha);
    drawLine(viewProj, addVec3(start, [-0.12, 0.08, 0.08]), addVec3(streak, [-0.05, 0.04, 0.06]), 0.055, effect.accent, 0.72 * alpha);
    if (hit > 0.12) drawSpark(viewProj, streak, effect.accent, 0.26 + 0.24 * hit, 0.75 * fade);
  } else if (profile.actionType === "spear") {
    const start = addVec3(chest, [0, 0.15, 0.35]);
    const end = [front[0], ground + 1.45, front[2] - 0.75 * hit];
    drawLine(viewProj, start, end, 0.12, effect.color, 0.95 * alpha);
    if (hit > 0.02) drawSpark(viewProj, end, effect.accent, 0.28 + 0.24 * hit, 0.62 * fade * hit);
  } else if (profile.actionType === "hammer") {
    drawGroundRing(viewProj, front, 0.82 + 0.55 * hit, 0.1, effect.accent, 0.78 * fade, false);
    if (hit > 0.02) drawSpark(viewProj, [front[0], ground + 0.34, front[2]], effect.color, 0.52 * hit, 0.78 * fade * hit);
  } else if (profile.actionType === "fan-card") {
    const cards = state.reducedMotion ? 3 : 5;
    for (let i = 0; i < cards; i += 1) {
      const angle = -0.95 + i * (1.9 / Math.max(1, cards - 1)) + hit * 0.35;
      const pos = [chest[0] + Math.sin(angle) * 1.15, chest[1] + Math.cos(angle * 0.8) * 0.32, chest[2] - 0.9 - hit * 0.95];
      const local = multiplyMat4(translationMat4(...pos), rotationMat4(0, angle, 0.32));
      drawMesh(effectBox([0.34, 0.035, 0.48], i % 2 ? effect.color : effect.accent), local, viewProj, (0.44 + 0.3 * hit) * fade);
    }
    drawSpark(viewProj, [front[0], ground + 1.0, front[2]], effect.accent, 0.32 * hit, 0.5 * fade);
  } else {
    const segments = state.reducedMotion ? 7 : 12;
    for (let i = 0; i < segments; i += 1) {
      const t = i / Math.max(1, segments - 1);
      const angle = -1.15 + t * 2.3;
      const sweep = clamp((hit - t * 0.08) / 0.55, 0, 1);
      const pos = [chest[0] + Math.sin(angle) * 1.05, chest[1] + 0.1 + Math.cos(angle) * 0.9, chest[2] - 1.0 - 0.35 * sweep];
      const mat = multiplyMat4(translationMat4(...pos), rotationMat4(0.2, 0, -angle));
      drawMesh(effectBox([0.46, 0.06, 0.09], i < segments * 0.55 ? effect.color : effect.accent), mat, viewProj, (0.25 + 0.65 * sweep) * fade);
    }
  }
}

function drawDodgeEffect(model, viewProj, effect, elapsed, layer) {
  const { center, ground } = effectAnchors(model);
  const p = effectProgress(effect, elapsed);
  const move = state.reducedMotion ? 0.35 : Math.sin(Math.min(1, p * 1.35) * Math.PI) * 1.05;
  const fade = 1 - smoothstep(effect.impact, effect.duration, elapsed);
  if (layer === "behind") {
    drawGroundRing(viewProj, [center[0], ground, center[2]], 0.82 + p * 0.58, 0.06, effect.color, 0.58 * fade, true);
    return;
  }
  const ghosts = state.reducedMotion ? [-0.55, 0.55] : [-1.15, -0.55, 0.55, 1.15];
  ghosts.forEach((offset, index) => {
    const side = Math.sign(offset) || 1;
    const alpha = (0.28 + index * 0.045) * fade;
    const pos = [center[0] + offset * move, center[1] - 0.1, center[2] + 0.1 * side];
    const mat = multiplyMat4(translationMat4(...pos), rotationMat4(0, 0, 0.16 * side));
    drawMesh(effectBox([0.52, 3.25, 0.18], effect.color), mat, viewProj, alpha);
    drawLine(viewProj, [pos[0] - side * 0.7, ground + 0.5, pos[2]], [pos[0] + side * 0.72, ground + 1.15, pos[2] - 0.48], 0.07, effect.accent, 0.62 * fade);
  });
}

function drawHealEffect(model, viewProj, effect, elapsed, layer) {
  const { center, ground } = effectAnchors(model);
  const p = effectProgress(effect, elapsed);
  const bloom = smoothstep(effect.telegraph, effect.impact, elapsed);
  const fade = 1 - smoothstep(effect.impact, effect.duration, elapsed);
  if (layer === "behind") {
    drawGroundRing(viewProj, [center[0], ground, center[2]], 0.68 + 1.28 * bloom, 0.075, effect.color, 0.7 * fade, false);
    drawGroundRing(viewProj, [center[0], ground + 0.035, center[2]], 0.42 + 0.9 * p, 0.055, effect.accent, 0.58 * fade, true);
    return;
  }
  const count = state.reducedMotion ? 6 : 12;
  for (let i = 0; i < count; i += 1) {
    const phase = i / count;
    const rise = state.reducedMotion ? p * 0.8 : (p + phase * 0.28) % 1;
    const angle = phase * Math.PI * 2 + p * 1.3;
    const radius = 0.72 + 0.9 * bloom;
    const sideLift = i % 2 === 0 ? -0.28 : 0.28;
    const pos = [center[0] + Math.cos(angle) * radius + sideLift, ground + 0.65 + rise * 3.15, center[2] + Math.sin(angle) * radius * 0.72];
    const mat = multiplyMat4(translationMat4(...pos), rotationMat4(0.5, angle, 0.7));
    drawMesh(effectBox([0.24, 0.05, 0.42], i % 3 === 0 ? effect.accent : effect.color), mat, viewProj, (0.58 + 0.24 * bloom) * fade);
  }
  drawSpark(viewProj, [center[0], ground + 1.15, center[2] - 0.25], effect.color, 0.3 + 0.32 * bloom, 0.62 * fade);
}

function drawArrowsEffect(model, viewProj, effect, elapsed, layer) {
  const { center, ground } = effectAnchors(model);
  const p = effectProgress(effect, elapsed);
  const fade = 1 - smoothstep(effect.impact, effect.duration, elapsed);
  const radius = Number(effect.radius) || 2.6;
  const targets = [
    [center[0], ground, center[2] - 2.35],
    [center[0] - 1.35, ground, center[2] - 1.65],
    [center[0] + 1.35, ground, center[2] - 1.65],
  ];
  if (layer === "behind") {
    drawGroundRing(viewProj, [center[0], ground, center[2] - 1.8], radius, 0.085, effect.color, 0.72 * (1 - p * 0.24), true);
    targets.forEach((target, index) => drawGroundRing(viewProj, target, 0.42 + index * 0.04, 0.065, index % 2 ? effect.accent : effect.color, 0.78 * fade, false));
    return;
  }
  const count = state.reducedMotion ? 7 : 15;
  for (let i = 0; i < count; i += 1) {
    const target = targets[i % targets.length];
    const lane = Math.floor(i / targets.length);
    const delay = state.reducedMotion ? i * 0.015 : i * 0.055;
    const fall = clamp((elapsed - effect.telegraph - delay) / 0.62, 0, 1);
    if (fall <= 0) continue;
    const side = ((i % 5) - 2) * 0.28;
    const start = [target[0] + side - 0.55, ground + 5.8 - lane * 0.18, target[2] - 1.1];
    const end = [target[0] + side * 0.45, ground + 0.55, target[2] + 0.22];
    const tip = mixVec3(start, end, fall);
    const tail = mixVec3(start, end, Math.max(0, fall - 0.26));
    drawLine(viewProj, tail, tip, 0.07, i % 2 ? effect.accent : effect.color, 0.9 * fade);
    if (fall > 0.82) drawSpark(viewProj, end, effect.accent, 0.22 + 0.1 * (i % 3), 0.52 * fade);
  }
}

function drawGroundRing(viewProj, center, radius, thickness, color, alpha, dashed) {
  const mesh = ringMesh(dashed ? 0.026 : 0.044, materialColor(color, "SmoothPlastic"), dashed);
  const verticalScale = Math.max(0.35, thickness / 0.05);
  const matrix = multiplyMat4(translationMat4(center[0], center[1], center[2]), scaleMat4(radius, verticalScale, radius));
  drawMesh(mesh, matrix, viewProj, alpha);
}

function drawLine(viewProj, from, to, width, color, alpha) {
  drawMesh(effectBox([width, 1, width], color), lineMatrixBetween(from, to, 1), viewProj, alpha);
}

function drawSpark(viewProj, center, color, size, alpha) {
  const mesh = effectBox([1, 1, 1], color);
  const axes = [
    [size, size * 0.16, size * 0.16, 0, 0, 0],
    [size * 0.16, size, size * 0.16, 0, 0, Math.PI / 4],
    [size * 0.16, size * 0.16, size, Math.PI / 4, 0, 0],
  ];
  axes.forEach(([sx, sy, sz, rx, ry, rz]) => {
    const mat = multiplyMat4(translationMat4(...center), multiplyMat4(rotationMat4(rx, ry, rz), scaleMat4(sx, sy, sz)));
    drawMesh(mesh, mat, viewProj, alpha);
  });
}

function effectBox(size, color) {
  return primitiveMesh("box", size, materialColor(color, "SmoothPlastic"));
}

function ringMesh(thicknessRatio, color, dashed = false) {
  const segments = dashed ? 48 : 64;
  const normalizedThickness = clamp(thicknessRatio, 0.012, 0.12);
  const key = `ring|${normalizedThickness.toFixed(3)}|${color.map((value) => value.toFixed(4)).join(",")}|${dashed ? 1 : 0}`;
  const cached = state.meshCache.get(key);
  if (cached) return cached;
  const mesh = emptyMesh();
  const inner = Math.max(0.02, 1 - normalizedThickness * 0.5);
  const outer = 1 + normalizedThickness * 0.5;
  for (let i = 0; i < segments; i += 1) {
    if (dashed && i % 4 === 2) continue;
    if (dashed && i % 4 === 3) continue;
    const a = (i / segments) * Math.PI * 2;
    const b = ((i + 1) / segments) * Math.PI * 2;
    const face = [
      [Math.cos(a) * inner, 0, Math.sin(a) * inner],
      [Math.cos(a) * outer, 0, Math.sin(a) * outer],
      [Math.cos(b) * outer, 0, Math.sin(b) * outer],
      [Math.cos(b) * inner, 0, Math.sin(b) * inner],
    ];
    pushFace(mesh, face, [0, 1, 0], color);
    pushFace(mesh, [...face].reverse(), [0, -1, 0], color);
  }
  state.meshCache.set(key, mesh);
  return mesh;
}

function activeEffectBounds(model) {
  const effect = state.activeEffect;
  if (!effect) return null;
  const { center, ground } = effectAnchors(model);
  const bounds = { min: [...model.runtime.bounds.min], max: [...model.runtime.bounds.max] };
  const includeBox = (min, max) => {
    includePoint(bounds, min);
    includePoint(bounds, max);
  };
  if (effect.id === "slash") includeBox([center[0] - 1.8, ground, center[2] - 3.6], [center[0] + 1.8, center[1] + 1.8, center[2] + 0.7]);
  if (effect.id === "dodge") includeBox([center[0] - 2.2, ground, center[2] - 0.9], [center[0] + 2.2, center[1] + 1.4, center[2] + 0.9]);
  if (effect.id === "heal") includeBox([center[0] - 1.8, ground, center[2] - 1.5], [center[0] + 1.8, center[1] + 2.7, center[2] + 1.5]);
  if (effect.id === "arrows") includeBox([center[0] - 3.2, ground, center[2] - 4.7], [center[0] + 3.2, center[1] + 4.1, center[2] + 1.1]);
  const mergedCenter = bounds.min.map((value, index) => (value + bounds.max[index]) / 2);
  const corners = [];
  for (const x of [bounds.min[0], bounds.max[0]]) {
    for (const y of [bounds.min[1], bounds.max[1]]) {
      for (const z of [bounds.min[2], bounds.max[2]]) corners.push([x, y, z]);
    }
  }
  return { ...bounds, center: mergedCenter, corners };
}

function mixVec3(a, b, amount) {
  const t = clamp(amount, 0, 1);
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function smoothstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / Math.max(0.0001, edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function drawMatrixForItem(model, item, boneMatrices, action, time) {
  const bowMatrix = bowMatrixForItem(model, item, boneMatrices);
  if (bowMatrix) return bowMatrix;
  const boneWorld = boneMatrices.get(item.bone) || identityMat4();
  const attachment = attachmentMatrixForItem(model, item, action, time);
  if (attachment) return multiplyMat4(multiplyMat4(boneWorld, attachment), item.local);
  return multiplyMat4(boneWorld, item.local);
}

function attachmentMatrixForItem(model, item, action, time) {
  if (item.kind !== "part") return null;
  const motion = model.runtime.attachmentMotion.get(item.name);
  if (!motion) return null;
  const wave = attachmentWave(action, time, motion.phase);
  const rotation = rotationMat4Xyz(...motion.amplitude.map((degrees) => degToRad(degrees * wave)));
  return multiplyMat4(
    multiplyMat4(translationMat4(...motion.pivot), rotation),
    translationMat4(...motion.pivot.map((value) => -value)),
  );
}

function attachmentWave(action, time, phase = 0) {
  if (action === "walk") return Math.sin(Math.PI * 2 * time + phase);
  if (action === "attack") {
    const t = ((time % 0.8) + 0.8) % 0.8;
    return 1.25 * Math.sin(Math.PI * clamp(t / 0.8, 0, 1)) * Math.sin(8 * t + phase);
  }
  return 0.22 * Math.sin(Math.PI * time + phase);
}

function bowMatrixForItem(model, item, boneMatrices) {
  if (item.kind !== "part" || !model.runtime.bowMotion) return null;
  const motion = model.runtime.bowMotion;
  const leftWorld = boneMatrices.get(motion.bone) || identityMat4();
  const rightWorld = boneMatrices.get(motion.drawBone) || identityMat4();
  const nockWorld = transformPoint(rightWorld, motion.drawPoint);
  const nock = transformPoint(invertRigidMat4(leftWorld), nockWorld);
  const stringIndex = motion.strings.indexOf(item.name);
  if (stringIndex >= 0) {
    const tip = motion.tips[stringIndex];
    if (!tip) return null;
    return multiplyMat4(leftWorld, lineMatrixBetween(tip, nock, item.size[1]));
  }
  const arrow = motion.arrows.find((entry) => entry.part === item.name);
  if (arrow) {
    const frame = arrowFrameMatrix(nock, motion.grip);
    return multiplyMat4(
      leftWorld,
      multiplyMat4(
        frame,
        multiplyMat4(translationMat4(...arrow.offset), rotationMat4(...arrow.rotation.map(degToRad))),
      ),
    );
  }
  return null;
}

function lineMatrixBetween(from, to, baseLength = 1) {
  const delta = subtractVec3(to, from);
  const length = Math.max(0.001, Math.hypot(...delta));
  const mid = scaleVec3(addVec3(from, to), 0.5);
  return multiplyMat4(
    multiplyMat4(translationMat4(...mid), alignYMat4(delta)),
    scaleMat4(1, length / Math.max(0.001, baseLength || 1), 1),
  );
}

function arrowFrameMatrix(origin, grip) {
  const towardGrip = subtractVec3(grip, origin);
  return multiplyMat4(translationMat4(...origin), alignYMat4(towardGrip));
}

function drawMesh(mesh, matrix, viewProj, alpha = 1, emissive = alpha < 0.999 ? 1 : 0, material = "SmoothPlastic") {
  const gl = state.gl;
  const program = state.program;
  if (!mesh.indices.length) return;
  const gpu = uploadMesh(mesh);
  const translucent = alpha < 0.999;
  gl.useProgram(program.id);
  bindArray(program.aPosition, gpu.position, 3);
  bindArray(program.aNormal, gpu.normal, 3);
  bindArray(program.aColor, gpu.color, 3);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gpu.index);
  gl.uniformMatrix4fv(program.uModel, false, matrix);
  gl.uniformMatrix4fv(program.uViewProj, false, viewProj);
  gl.uniform3f(program.uLight, -0.42, 0.82, -0.64);
  gl.uniform1f(program.uAlpha, clamp(alpha, 0, 1));
  gl.uniform1f(program.uEmissive, clamp(emissive, 0, 1));
  gl.uniform3fv(program.uEye, state.cameraEye || [0, 4, -10]);
  gl.uniform1f(program.uMetal, material === "Metal" ? 1 : 0);
  gl.uniform1f(program.uRoughness, material === "Metal" ? 0.34 : material === "Fabric" ? 0.95 : 0.7);
  if (translucent) gl.depthMask(false);
  gl.drawElements(gl.TRIANGLES, gpu.count, gl.UNSIGNED_SHORT, 0);
  if (translucent) gl.depthMask(true);
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
  state.gpuMeshUploads += 1;
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

  function resolve(name) {
    if (matrices.has(name)) return matrices.get(name);
    const bone = boneMap.get(name);
    if (!bone) return identityMat4();
    const parent = bone.parent ? resolve(bone.parent) : identityMat4();
    const ready = model.poses?.ready?.[bone.name] || [0, 0, 0];
    const offset = poseOffsetFor(model, action, bone.name, time);
    const local = multiplyMat4(
      multiplyMat4(translationMat4(...vec3(bone.position)), rotationMat4Xyz(...ready.map(degToRad))),
      rotationMat4Xyz(...offset.map(degToRad)),
    );
    const world = multiplyMat4(parent, local);
    matrices.set(name, world);
    return world;
  }

  model.bones.forEach((bone) => resolve(bone.name));
  return matrices;
}

function poseOffsetFor(model, action, boneName, time) {
  const authored = action !== "ready" ? model.poses?.[action]?.[boneName] : null;
  const offset = authored || (action === "ready"
    ? idleOffsetForPreview(boneName, time)
    : action === "walk"
      ? walkOffsetForPreview(boneName, time)
      : action === "attack"
        ? attackOffsetForPreview(model, boneName, time)
        : [0, 0, 0]);
  return offset;
}

function idleOffsetForPreview(boneName, time) {
  const pulse = Math.sin(time * 2.2) * 3;
  if (boneName === "Torso") return [pulse * 0.22, 0, 0];
  if (boneName === "Head") return [0, pulse * 0.18, 0];
  return [0, 0, 0];
}

function walkOffsetForPreview(boneName, time) {
  const pulse = Math.sin(time * 5.4) * 18;
  if (boneName === "LeftArm" || boneName === "RightLeg") return [pulse, 0, 0];
  if (boneName === "RightArm" || boneName === "LeftLeg") return [-pulse, 0, 0];
  if (boneName === "Torso") return [0, 0, Math.sin(time * 5.4) * 2.5];
  return [0, 0, 0];
}

function actionProfileForModel(model) {
  return actionProfiles.get(model.id) || { actionType: "sword", actionHand: "right" };
}

function attackPhase(time) {
  const t = ((time * 1.25) % 1 + 1) % 1;
  const windup = Math.sin(clamp(t / 0.28, 0, 1) * Math.PI * 0.5);
  const strike = Math.sin(clamp((t - 0.2) / 0.48, 0, 1) * Math.PI);
  const recover = clamp((t - 0.64) / 0.36, 0, 1);
  return { t, windup, strike, recover, power: Math.max(strike, windup * (1 - recover)) };
}

function attackOffsetForPreview(model, boneName, time) {
  const profile = actionProfileForModel(model);
  const phase = attackPhase(time);
  return attackOffsetByProfile(profile, boneName, phase);
}

function attackOffsetByProfile(profile, boneName, phase) {
  const leftPrimary = profile.actionHand === "left";
  const bothHands = profile.actionHand === "both";
  if (profile.actionType === "spear") {
    const thrust = Math.sin(clamp((phase.t - 0.12) / 0.58, 0, 1) * Math.PI);
    if (boneName === "Torso") return [-7 * thrust, -4 * thrust, 4 * thrust];
    if (boneName === "Head") return [3 * thrust, -3 * thrust, 0];
    if (boneName === "RightArm") return [-42 * thrust, 0, -8 * thrust];
    if (boneName === "LeftArm") return [-30 * thrust, 0, 10 * thrust];
    if (boneName === "RightLeg") return [-10 * thrust, 0, 0];
    if (boneName === "LeftLeg") return [8 * thrust, 0, 0];
  } else if (profile.actionType === "bow") {
    const draw = phase.t < 0.5
      ? Math.sin(clamp(phase.t / 0.28, 0, 1) * Math.PI * 0.5)
      : Math.max(0, 1 - (phase.t - 0.5) / 0.14);
    if (boneName === "Torso") return [-2 * draw, -7 * draw, -3 * draw];
    if (boneName === "Head") return [0, -5 * draw, 0];
    if (boneName === "LeftArm") return [-2 * draw, 0, 3 * draw];
    if (boneName === "RightArm") return [6 * draw, 0, 20 * draw];
    if (boneName === "RightLeg") return [-4 * draw, 0, 0];
    if (boneName === "LeftLeg") return [5 * draw, 0, 0];
  } else if (profile.actionType === "fan-card") {
    const p = phase.power;
    if (boneName === "Torso") return [-2 * p, 8 * p, (leftPrimary ? 5 : -5) * p];
    if (boneName === "Head") return [-3 * p, (leftPrimary ? -8 : 8) * p, 0];
    if (bothHands && boneName === "LeftArm") return [-28 * p, 0, -30 * p];
    if (bothHands && boneName === "RightArm") return [-28 * p, 0, 30 * p];
    if (leftPrimary && boneName === "LeftArm") return [-36 * p, 0, -42 * p];
    if (leftPrimary && boneName === "RightArm") return [-12 * p, 0, 20 * p];
    if (boneName === "RightArm") return [-36 * p, 0, 42 * p];
    if (boneName === "LeftArm") return [-12 * p, 0, -20 * p];
    if (boneName === "RightLeg") return [3 * p, 0, 0];
    if (boneName === "LeftLeg") return [-3 * p, 0, 0];
  } else if (profile.actionType === "hammer") {
    const slam = Math.sin(clamp((phase.t - 0.08) / 0.68, 0, 1) * Math.PI);
    if (boneName === "Torso") return [-12 * slam, (leftPrimary ? -7 : 7) * slam, (leftPrimary ? 12 : -12) * slam];
    if (boneName === "Head") return [5 * slam, 0, 0];
    if (leftPrimary && boneName === "LeftArm") return [-92 * slam, 0, 24 * slam];
    if (leftPrimary && boneName === "RightArm") return [16 * slam, 0, -18 * slam];
    if (boneName === "RightArm") return [-92 * slam, 0, -24 * slam];
    if (boneName === "LeftArm") return [16 * slam, 0, 18 * slam];
    if (boneName === "RightLeg") return [-8 * slam, 0, 0];
    if (boneName === "LeftLeg") return [12 * slam, 0, 0];
  } else {
    if (boneName === "Torso") return [0, -8 * phase.power, 10 * phase.strike];
    if (boneName === "Head") return [0, -5 * phase.power, 0];
    if (boneName === "RightArm") return [-90 * phase.strike, 0, 18 * phase.strike];
    if (boneName === "LeftArm") return [20 * phase.strike, 0, -12 * phase.strike];
    if (boneName === "RightLeg") return [-6 * phase.strike, 0, 0];
    if (boneName === "LeftLeg") return [6 * phase.strike, 0, 0];
  }
  return [0, 0, 0];
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
  if (material === "Fabric") return rgb.map((value) => value * 0.96);
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
      cancelEffect(false);
      setPreviewAction(button.dataset.action);
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

function scaleMat4(x, y, z) {
  return [x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1];
}

function alignYMat4(direction) {
  const length = Math.hypot(...direction);
  const y = length > 0.0001 ? direction.map((value) => value / length) : [0, 1, 0];
  const helper = Math.abs(dot(y, [0, 1, 0])) < 0.95 ? [0, 1, 0] : [1, 0, 0];
  const x = normalize(cross(helper, y));
  const z = cross(x, y);
  return [
    x[0], x[1], x[2], 0,
    y[0], y[1], y[2], 0,
    z[0], z[1], z[2], 0,
    0, 0, 0, 1,
  ];
}

function invertRigidMat4(matrix) {
  const tx = matrix[12], ty = matrix[13], tz = matrix[14];
  return [
    matrix[0], matrix[4], matrix[8], 0,
    matrix[1], matrix[5], matrix[9], 0,
    matrix[2], matrix[6], matrix[10], 0,
    -(matrix[0] * tx + matrix[1] * ty + matrix[2] * tz),
    -(matrix[4] * tx + matrix[5] * ty + matrix[6] * tz),
    -(matrix[8] * tx + matrix[9] * ty + matrix[10] * tz),
    1,
  ];
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

function rotationMat4Xyz(rx, ry, rz) {
  const sx = Math.sin(rx), cx = Math.cos(rx);
  const sy = Math.sin(ry), cy = Math.cos(ry);
  const sz = Math.sin(rz), cz = Math.cos(rz);
  const x = [1, 0, 0, 0, 0, cx, sx, 0, 0, -sx, cx, 0, 0, 0, 0, 1];
  const y = [cy, 0, -sy, 0, 0, 1, 0, 0, sy, 0, cy, 0, 0, 0, 0, 1];
  const z = [cz, sz, 0, 0, -sz, cz, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  return multiplyMat4(multiplyMat4(x, y), z);
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
  await Promise.all([loadModels(), loadEffects()]);
  if (!state.models.length) return;
  setupTabs();
  setupEffects();
  frameCurrentModel();
  refreshUi();
  wireControls();
  if (initGl()) requestAnimationFrame(render);
}

main().catch((error) => {
  statusEl.textContent = `模型检视器启动失败：${error.message}`;
});
