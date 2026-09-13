const cardFxEquipmentProps = {
  zhuge_crossbow: "crossbow",
  double_swords: "dual_swords",
  green_dragon_blade: "glaive",
  qinggang_sword: "sword",
  serpent_spear: "spear",
  stone_axe: "axe",
  halberd: "halberd",
  kylin_bow: "bow",
  ice_sword: "ice_sword",
  fire_fan: "fan",
  ancient_scimitar: "scimitar",
  eight_trigrams: "bagua",
  renwang_shield: "shield",
  vine_armor: "vine",
  silver_lion: "lion",
  red_hare: "horse",
  dayuan: "horse",
  zixing: "horse",
  dilu: "horse",
  jueying: "horse",
  zhuahuang_feidian: "horse",
  hualiu: "horse",
};

const cardFxBehaviorInventory = {
  basic: ["fire_sha", "thunder_sha", "jiu"],
  trick: ["juedou", "wuxie", "shunshou", "guohe", "lebusishu", "bingliang", "tiesuo", "nanman", "taoyuan", "wugu", "wuzhong", "jiedao", "huogong", "shandian"],
  equipment: Object.keys(cardFxEquipmentProps),
};

function drawCardEffect(model, viewProj, boneMatrices, effect, elapsed, layer, mode = "trigger") {
  if (!effect || elapsed < 0 || elapsed > effect.duration) return false;
  const id = effect.motif || effect.cardId || effect.id;
  const normalized = { ...effect, id };
  if (mode === "equip" || normalized.category === "equipment") {
    return cardFxDrawEquipment(model, viewProj, boneMatrices, normalized, elapsed, layer, mode);
  }
  if (id === "fire_sha") return cardFxFireSha(model, viewProj, boneMatrices, normalized, elapsed, layer);
  if (id === "thunder_sha") return cardFxThunderSha(model, viewProj, boneMatrices, normalized, elapsed, layer);
  if (id === "jiu") return cardFxJiu(model, viewProj, boneMatrices, normalized, elapsed, layer);
  if (id === "juedou") return cardFxJuedou(model, viewProj, normalized, elapsed, layer);
  if (id === "wuxie") return cardFxWuxie(model, viewProj, normalized, elapsed, layer);
  if (id === "shunshou") return cardFxShunshou(model, viewProj, normalized, elapsed, layer);
  if (id === "guohe") return cardFxGuohe(model, viewProj, normalized, elapsed, layer);
  if (id === "lebusishu") return cardFxLebu(model, viewProj, normalized, elapsed, layer);
  if (id === "bingliang") return cardFxBingliang(model, viewProj, normalized, elapsed, layer);
  if (id === "tiesuo") return cardFxTiesuo(model, viewProj, normalized, elapsed, layer);
  if (id === "nanman") return cardFxNanman(model, viewProj, normalized, elapsed, layer);
  if (id === "taoyuan") return cardFxTaoyuan(model, viewProj, normalized, elapsed, layer);
  if (id === "wugu") return cardFxWugu(model, viewProj, normalized, elapsed, layer);
  if (id === "wuzhong") return cardFxWuzhong(model, viewProj, normalized, elapsed, layer);
  if (id === "jiedao") return cardFxJiedao(model, viewProj, normalized, elapsed, layer);
  if (id === "huogong") return cardFxHuogong(model, viewProj, normalized, elapsed, layer);
  if (id === "shandian") return cardFxShandian(model, viewProj, normalized, elapsed, layer);
  return false;
}

function cardFxDrawEquipment(model, viewProj, boneMatrices, effect, elapsed, layer, mode) {
  const prop = effect.prop || cardFxEquipmentProps[effect.id];
  if (!prop) return false;
  if (mode === "equip") return cardFxEquipPose(model, viewProj, boneMatrices, effect, elapsed, layer, prop);
  return cardFxEquipmentTrigger(model, viewProj, effect, elapsed, layer, prop);
}

function cardFxProgress(effect, elapsed) {
  return typeof effectProgress === "function"
    ? effectProgress(effect, elapsed)
    : cardFxClamp(elapsed / Math.max(0.001, effect.duration || 1), 0, 1);
}

function cardFxSmooth(a, b, value) {
  return typeof smoothstep === "function"
    ? smoothstep(a, b, value)
    : cardFxFallbackSmooth(a, b, value);
}

function cardFxFallbackSmooth(a, b, value) {
  const t = cardFxClamp((value - a) / Math.max(0.0001, b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

function cardFxClamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function cardFxAnchors(model) {
  if (typeof effectAnchors === "function") return effectAnchors(model);
  const bounds = model?.runtime?.bounds;
  const ground = Math.max(0.02, (bounds?.min?.[1] ?? 0) + 0.04);
  const center = bounds?.center || [0, 3.2, 0];
  return {
    center,
    ground,
    chest: [center[0], center[1] + 0.48, center[2] - 0.25],
    front: [center[0], ground, center[2] - 2.35],
    sideLeft: [center[0] - 1.05, ground, center[2] - 0.2],
    sideRight: [center[0] + 1.05, ground, center[2] - 0.2],
  };
}

function cardFxFade(effect, elapsed) {
  return 1 - cardFxSmooth(effect.impact ?? effect.duration * 0.55, effect.duration || 1, elapsed);
}

function cardFxHit(effect, elapsed) {
  return cardFxSmooth(effect.telegraph ?? 0.15, effect.impact ?? effect.duration * 0.55, elapsed);
}

function cardFxPulse(p, offset = 0) {
  return 0.5 + 0.5 * Math.sin((p + offset) * Math.PI * 2);
}

function cardFxMix(a, b, t) {
  return typeof mixVec3 === "function"
    ? mixVec3(a, b, t)
    : [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function cardFxAdd(a, b) {
  return typeof addVec3 === "function" ? addVec3(a, b) : [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function cardFxScale(v, amount) {
  return typeof scaleVec3 === "function" ? scaleVec3(v, amount) : [v[0] * amount, v[1] * amount, v[2] * amount];
}

function cardFxBonePoint(boneMatrices, bone, local, fallback) {
  const matrix = boneMatrices?.get?.(bone);
  return matrix && typeof transformPoint === "function" ? transformPoint(matrix, local) : fallback;
}

function cardFxBoneLocal(model, boneName, fallback) {
  const bone = model?.bones?.find?.((entry) => entry.name === boneName);
  if (!bone) return fallback;
  const center = Array.isArray(bone.center) ? bone.center.map(Number) : [0, 0, 0];
  const size = Array.isArray(bone.size) ? bone.size.map(Number) : [0.9, 1.9, 1.0];
  return [
    center[0],
    center[1] - size[1] * 0.46,
    center[2] - size[2] * 0.36,
  ];
}

function cardFxHandPoint(model, boneMatrices, boneName, fallback) {
  return cardFxBonePoint(boneMatrices, boneName, cardFxBoneLocal(model, boneName, [0, -1.45, -0.36]), fallback);
}

function cardFxMat(pos, rot = [0, 0, 0], scl = [1, 1, 1]) {
  return multiplyMat4(
    multiplyMat4(translationMat4(pos[0], pos[1], pos[2]), rotationMat4(rot[0], rot[1], rot[2])),
    scaleMat4(scl[0], scl[1], scl[2]),
  );
}

function cardFxSizedScale(size, scl) {
  return [
    size[0] * scl[0],
    size[1] * scl[1],
    size[2] * scl[2],
  ];
}

function cardFxBlock(viewProj, pos, size, color, alpha, rot = [0, 0, 0], scl = [1, 1, 1], material = "SmoothPlastic") {
  const mesh = effectBox([1, 1, 1], color);
  drawMesh(mesh, cardFxMat(pos, rot, cardFxSizedScale(size, scl)), viewProj, alpha, alpha < 0.999 ? 1 : 0, material);
}

function cardFxCylinder(viewProj, pos, size, color, alpha, rot = [0, 0, 0], scl = [1, 1, 1], material = "SmoothPlastic") {
  const mesh = primitiveMesh("cylinder", [1, 1, 1], materialColor(color, material));
  drawMesh(mesh, cardFxMat(pos, rot, cardFxSizedScale(size, scl)), viewProj, alpha, alpha < 0.999 ? 1 : 0, material);
}

function cardFxWedge(viewProj, pos, size, color, alpha, rot = [0, 0, 0], scl = [1, 1, 1], material = "SmoothPlastic") {
  const mesh = primitiveMesh("wedge", [1, 1, 1], materialColor(color, material));
  drawMesh(mesh, cardFxMat(pos, rot, cardFxSizedScale(size, scl)), viewProj, alpha, alpha < 0.999 ? 1 : 0, material);
}

function cardFxCard(viewProj, pos, color, accent, alpha, rot = [0, 0, 0], scl = [1, 1, 1]) {
  cardFxBlock(viewProj, pos, [0.36, 0.035, 0.52], color, alpha, rot, scl);
  cardFxBlock(viewProj, cardFxAdd(pos, [0, 0.025, 0]), [0.28, 0.026, 0.39], accent, alpha * 0.75, rot, scl);
}

function cardFxOutlineCard(viewProj, pos, color, alpha, rot = [0, 0, 0]) {
  const dx = 0.2;
  const dz = 0.28;
  cardFxBlock(viewProj, cardFxAdd(pos, [dx, 0, 0]), [0.035, 0.04, 0.56], color, alpha, rot);
  cardFxBlock(viewProj, cardFxAdd(pos, [-dx, 0, 0]), [0.035, 0.04, 0.56], color, alpha, rot);
  cardFxBlock(viewProj, cardFxAdd(pos, [0, 0, dz]), [0.4, 0.04, 0.035], color, alpha, rot);
  cardFxBlock(viewProj, cardFxAdd(pos, [0, 0, -dz]), [0.4, 0.04, 0.035], color, alpha, rot);
}

function cardFxTargetRings(viewProj, anchors, effect, fade, count = 3) {
  const points = [
    [anchors.center[0], anchors.ground, anchors.center[2] - 2.45],
    [anchors.center[0] - 1.45, anchors.ground, anchors.center[2] - 1.7],
    [anchors.center[0] + 1.45, anchors.ground, anchors.center[2] - 1.7],
  ];
  points.slice(0, count).forEach((point, i) => drawGroundRing(viewProj, point, 0.42, 0.065, i % 2 ? effect.accent : effect.color, 0.76 * fade, false));
  return points;
}

function cardFxFireSha(model, viewProj, boneMatrices, effect, elapsed, layer) {
  const a = cardFxAnchors(model);
  const p = cardFxProgress(effect, elapsed);
  const hit = cardFxHit(effect, elapsed);
  const fade = cardFxFade(effect, elapsed);
  const hand = cardFxHandPoint(model, boneMatrices, "RightArm", cardFxAdd(a.chest, [0.6, 0.1, -0.2]));
  if (layer === "behind") {
    drawGroundRing(viewProj, a.front, 0.8, 0.08, effect.color, 0.65 * fade, false);
    drawGroundRing(viewProj, [a.front[0], a.ground + 0.04, a.front[2]], 1.3, 0.05, effect.accent, 0.35 * fade, true);
    return true;
  }
  const end = [a.front[0] + 0.15, a.ground + 1.9, a.front[2] - 0.45];
  const sweep = cardFxMix(hand, end, Math.max(0.32, hit));
  for (let i = 0; i < 7; i += 1) {
    const t = i / 6;
    const pos = cardFxMix(hand, sweep, t);
    const side = Math.sin(t * Math.PI + p * 1.6) * 0.22;
    cardFxBlock(viewProj, cardFxAdd(pos, [side, 0.22 * t, -0.08 * i]), [0.24, 0.08, 0.36], i % 2 ? effect.accent : effect.color, 0.82 * fade, [0.25, p * 0.7, -0.7 + t]);
  }
  drawLine(viewProj, hand, sweep, 0.08, "#FFF4D9", 0.82 * fade);
  if (hit > 0.12) drawImpactBurst(viewProj, [a.front[0], a.ground + 1.15, a.front[2] - 0.25], effect, hit, fade);
  return true;
}

function cardFxThunderSha(model, viewProj, boneMatrices, effect, elapsed, layer) {
  const a = cardFxAnchors(model);
  const hit = cardFxHit(effect, elapsed);
  const fade = cardFxFade(effect, elapsed);
  const start = [a.chest[0] + 0.25, a.ground + 4.2, a.chest[2] - 0.45];
  const end = [a.front[0], a.ground + 0.95, a.front[2] - 0.35];
  if (layer === "behind") {
    drawGroundRing(viewProj, a.front, 0.72, 0.08, effect.accent, 0.72 * fade, true);
    drawGroundRing(viewProj, [a.front[0], a.ground + 0.06, a.front[2]], 1.18, 0.045, effect.color, 0.42 * fade, false);
    return true;
  }
  const joints = [
    start,
    [start[0] - 0.55, a.ground + 3.2, start[2] - 0.2],
    [start[0] + 0.28, a.ground + 2.25, start[2] - 0.55],
    [end[0] - 0.25, a.ground + 1.45, end[2] + 0.05],
    cardFxMix(start, end, Math.max(0.35, hit)),
  ];
  for (let i = 0; i < joints.length - 1; i += 1) {
    drawLine(viewProj, joints[i], joints[i + 1], 0.13, effect.color, 0.2 * fade);
    drawLine(viewProj, joints[i], joints[i + 1], 0.046, effect.accent, 0.92 * fade);
  }
  drawSpark(viewProj, joints[joints.length - 1], "#F7E58A", 0.36, 0.82 * fade);
  return true;
}

function cardFxJiu(model, viewProj, boneMatrices, effect, elapsed, layer) {
  const a = cardFxAnchors(model);
  const p = cardFxProgress(effect, elapsed);
  const fade = cardFxFade(effect, elapsed);
  if (layer === "behind") {
    drawGroundRing(viewProj, [a.center[0], a.ground, a.center[2] - 0.25], 0.72, 0.075, effect.accent, 0.62 * fade, false);
    drawGroundRing(viewProj, [a.center[0], a.ground + 0.04, a.center[2] - 0.25], 1.1, 0.045, effect.color, 0.42 * fade, true);
    return true;
  }
  const cup = cardFxAdd(a.chest, [0.5, -0.28, -0.7]);
  cardFxCylinder(viewProj, cup, [0.42, 0.34, 0.42], effect.accent, 0.88 * fade, [0, 0, 0]);
  cardFxBlock(viewProj, cardFxAdd(cup, [0, 0.28, 0]), [0.32, 0.04, 0.32], "#F0C36A", 0.92 * fade);
  cardFxCylinder(viewProj, cardFxAdd(cup, [-0.52, 0.1, 0.05]), [0.5, 0.75, 0.5], effect.color, 0.82 * fade, [0.18, 0, 0.2]);
  cardFxBlock(viewProj, cardFxAdd(cup, [-0.52, 0.52, 0.05]), [0.46, 0.11, 0.46], "#F0C36A", 0.78 * fade, [0.18, 0, 0.2]);
  for (let i = 0; i < 5; i += 1) {
    const angle = i * Math.PI * 2 / 5 + p * 0.7;
    drawLine(viewProj, cardFxAdd(cup, [Math.cos(angle) * 0.32, 0.38, Math.sin(angle) * 0.18]), cardFxAdd(cup, [Math.cos(angle) * 0.75, 0.78, Math.sin(angle) * 0.34]), 0.035, "#F0C36A", 0.55 * fade);
  }
  drawSpark(viewProj, cardFxAdd(a.chest, [0.03, 0.18, -0.45]), effect.accent, 0.4, 0.58 * fade);
  return true;
}

function cardFxJuedou(model, viewProj, effect, elapsed, layer) {
  const a = cardFxAnchors(model);
  const hit = cardFxHit(effect, elapsed);
  const fade = cardFxFade(effect, elapsed);
  if (layer === "behind") {
    drawGroundRing(viewProj, [a.center[0], a.ground, a.center[2] - 2.0], 1.78, 0.08, effect.color, 0.58 * fade, false);
    drawGroundRing(viewProj, [a.center[0] - 1.25, a.ground, a.center[2] - 2.0], 0.48, 0.055, effect.accent, 0.72 * fade, false);
    drawGroundRing(viewProj, [a.center[0] + 1.25, a.ground, a.center[2] - 2.0], 0.48, 0.055, effect.accent, 0.72 * fade, false);
    return true;
  }
  const left = [a.center[0] - 1.2, a.ground + 1.4, a.center[2] - 2.15];
  const right = [a.center[0] + 1.2, a.ground + 1.4, a.center[2] - 2.15];
  drawLine(viewProj, cardFxAdd(left, [-0.7, -0.35, 0]), cardFxMix(left, right, 0.5 + hit * 0.1), 0.09, effect.color, 0.88 * fade);
  drawLine(viewProj, cardFxAdd(right, [0.7, -0.35, 0]), cardFxMix(right, left, 0.5 + hit * 0.1), 0.09, effect.accent, 0.88 * fade);
  cardFxCylinder(viewProj, [a.center[0], a.ground + 0.82, a.center[2] - 2.0], [0.68, 0.42, 0.68], "#33212A", 0.82 * fade, [Math.PI / 2, 0, 0]);
  drawSpark(viewProj, [a.center[0], a.ground + 1.42, a.center[2] - 2.0], effect.accent, 0.34, 0.8 * fade * hit);
  return true;
}

function cardFxWuxie(model, viewProj, effect, elapsed, layer) {
  const a = cardFxAnchors(model);
  const fade = cardFxFade(effect, elapsed);
  if (layer === "behind") {
    drawGroundRing(viewProj, [a.center[0], a.ground + 0.02, a.center[2] - 1.45], 1.32, 0.06, effect.accent, 0.5 * fade, true);
    return true;
  }
  const y = a.ground + 2.15;
  drawLine(viewProj, [a.center[0] - 2.2, y, a.center[2] - 1.45], [a.center[0] - 0.38, y + 0.05, a.center[2] - 1.45], 0.08, effect.color, 0.65 * fade);
  drawLine(viewProj, [a.center[0] + 0.38, y - 0.05, a.center[2] - 1.45], [a.center[0] + 2.2, y, a.center[2] - 1.45], 0.08, effect.color, 0.65 * fade);
  cardFxSeal(viewProj, [a.center[0], y, a.center[2] - 1.45], effect.accent, effect.color, fade);
  return true;
}

function cardFxSeal(viewProj, pos, color, accent, alpha) {
  cardFxCylinder(viewProj, pos, [0.88, 0.05, 0.88], color, 0.68 * alpha, [Math.PI / 2, 0, 0]);
  cardFxBlock(viewProj, pos, [0.08, 0.08, 1.1], accent, 0.8 * alpha, [0, 0.2, Math.PI / 4]);
  cardFxBlock(viewProj, pos, [1.1, 0.08, 0.08], accent, 0.8 * alpha, [0, -0.2, Math.PI / 4]);
}

function cardFxShunshou(model, viewProj, effect, elapsed, layer) {
  const a = cardFxAnchors(model);
  const p = cardFxProgress(effect, elapsed);
  const fade = cardFxFade(effect, elapsed);
  const from = [a.center[0] + 1.5, a.ground + 1.2, a.center[2] - 1.3];
  const to = [a.center[0] - 0.45, a.ground + 1.65, a.center[2] - 0.85];
  if (layer === "behind") {
    drawGroundRing(viewProj, [a.center[0] + 1.45, a.ground, a.center[2] - 1.25], 0.46, 0.055, effect.color, 0.7 * fade, false);
    return true;
  }
  cardFxBlock(viewProj, from, [0.38, 0.72, 0.18], "#473222", 0.45 * fade, [0.1, 0, 0.1]);
  cardFxCard(viewProj, cardFxMix(from, to, cardFxClamp(p * 1.3, 0, 1)), effect.accent, "#F3E4B8", 0.9 * fade, [0.15, -0.45, 0.35]);
  drawLine(viewProj, cardFxAdd(from, [-0.14, 0.25, -0.06]), cardFxMix(from, to, 0.8), 0.06, effect.color, 0.58 * fade);
  return true;
}

function cardFxGuohe(model, viewProj, effect, elapsed, layer) {
  const a = cardFxAnchors(model);
  const hit = cardFxHit(effect, elapsed);
  const fade = cardFxFade(effect, elapsed);
  if (layer === "behind") {
    drawGroundRing(viewProj, a.front, 0.8, 0.055, effect.color, 0.45 * fade, true);
    return true;
  }
  for (let i = 0; i < 4; i += 1) {
    cardFxBlock(viewProj, [a.center[0] - 0.75 + i * 0.5, a.ground + 0.65, a.center[2] - 1.65 - i * 0.07], [0.44, 0.11, 0.16], "#A66A36", 0.82 * fade, [0.04, 0.25, -0.14 - hit * 0.35]);
  }
  drawLine(viewProj, [a.center[0] + 0.7, a.ground + 2.0, a.center[2] - 1.3], [a.center[0] + 0.12, a.ground + 0.95, a.center[2] - 1.7], 0.075, effect.accent, 0.86 * fade);
  cardFxCard(viewProj, [a.center[0] - 0.1, a.ground + 0.82 - hit * 0.38, a.center[2] - 1.9], "#D9C391", effect.color, 0.72 * fade, [0.5 + hit, 0.2, 0.1]);
  return true;
}

function cardFxLebu(model, viewProj, effect, elapsed, layer) {
  const a = cardFxAnchors(model);
  const p = cardFxProgress(effect, elapsed);
  const fade = cardFxFade(effect, elapsed);
  if (layer === "behind") {
    drawGroundRing(viewProj, [a.center[0], a.ground, a.center[2] - 1.25], 1.2, 0.075, effect.color, 0.45 * fade, false);
    return true;
  }
  cardFxBlock(viewProj, [a.center[0], a.ground + 0.45, a.center[2] - 1.25], [0.78, 0.16, 0.62], "#6E3630", 0.72 * fade, [0, 0.15, 0]);
  for (let i = 0; i < 5; i += 1) {
    const x = (i - 2) * 0.36;
    const y = a.ground + 1.08 + Math.sin(p * 1.5 + i) * 0.08;
    drawLine(viewProj, [a.center[0] + x, y, a.center[2] - 1.35], [a.center[0] + x + 0.18, y + 0.55, a.center[2] - 1.15], 0.04, i % 2 ? effect.accent : effect.color, 0.76 * fade);
  }
  cardFxOutlineCard(viewProj, [a.center[0] + 1.05, a.ground + 1.08, a.center[2] - 1.6], effect.accent, 0.4 * fade, [0.12, -0.25, 0]);
  return true;
}

function cardFxBingliang(model, viewProj, effect, elapsed, layer) {
  const a = cardFxAnchors(model);
  const fade = cardFxFade(effect, elapsed);
  if (layer === "behind") {
    drawGroundRing(viewProj, [a.center[0], a.ground, a.center[2] - 1.35], 1.0, 0.05, effect.accent, 0.44 * fade, true);
    return true;
  }
  cardFxBlock(viewProj, [a.center[0], a.ground + 0.95, a.center[2] - 1.45], [1.15, 1.3, 0.28], "#7A5A32", 0.78 * fade);
  cardFxBlock(viewProj, [a.center[0], a.ground + 0.95, a.center[2] - 1.62], [0.72, 0.78, 0.08], "#31351F", 0.72 * fade);
  drawLine(viewProj, [a.center[0] - 0.5, a.ground + 1.25, a.center[2] - 1.75], [a.center[0] + 0.5, a.ground + 0.65, a.center[2] - 1.75], 0.075, effect.accent, 0.82 * fade);
  drawLine(viewProj, [a.center[0] + 0.5, a.ground + 1.25, a.center[2] - 1.75], [a.center[0] - 0.5, a.ground + 0.65, a.center[2] - 1.75], 0.075, effect.accent, 0.82 * fade);
  cardFxCylinder(viewProj, [a.center[0] - 0.75, a.ground + 0.2, a.center[2] - 1.05], [0.38, 0.58, 0.38], "#EEF0D7", 0.68 * fade, [0.3, 0, 0.15]);
  return true;
}

function cardFxTiesuo(model, viewProj, effect, elapsed, layer) {
  const a = cardFxAnchors(model);
  const p = cardFxProgress(effect, elapsed);
  const fade = cardFxFade(effect, elapsed);
  const left = [a.center[0] - 1.5, a.ground + 0.38, a.center[2] - 1.6];
  const right = [a.center[0] + 1.5, a.ground + 0.38, a.center[2] - 1.6];
  if (layer === "behind") {
    drawGroundRing(viewProj, [left[0], a.ground, left[2]], 0.48, 0.055, effect.color, 0.72 * fade, false);
    drawGroundRing(viewProj, [right[0], a.ground, right[2]], 0.48, 0.055, effect.color, 0.72 * fade, false);
    return true;
  }
  cardFxCylinder(viewProj, left, [0.18, 0.72, 0.18], effect.accent, 0.82 * fade);
  cardFxCylinder(viewProj, right, [0.18, 0.72, 0.18], effect.accent, 0.82 * fade);
  for (let i = 0; i < 9; i += 1) {
    const t0 = i / 9;
    const t1 = (i + 0.62) / 9;
    const p0 = cardFxMix(left, right, t0);
    const p1 = cardFxMix(left, right, t1);
    const lift = Math.sin(t0 * Math.PI) * 0.52 + Math.sin(p * Math.PI * 2 + i) * 0.03;
    p0[1] += lift;
    p1[1] += Math.sin(t1 * Math.PI) * 0.52;
    drawLine(viewProj, p0, p1, 0.075, i % 2 ? effect.color : "#4B5563", 0.86 * fade);
  }
  return true;
}

function cardFxNanman(model, viewProj, effect, elapsed, layer) {
  const a = cardFxAnchors(model);
  const hit = cardFxHit(effect, elapsed);
  const fade = cardFxFade(effect, elapsed);
  const targets = [[-1.7, -2.1], [0, -2.75], [1.7, -2.1]];
  if (layer === "behind") {
    cardFxTargetRings(viewProj, a, effect, fade, 3);
    return true;
  }
  targets.forEach(([x, z], i) => {
    const base = [a.center[0] + x * (1 - hit * 0.18), a.ground + 0.72, a.center[2] + z];
    cardFxBlock(viewProj, base, [0.34, 0.85, 0.28], "#7B2F1E", 0.68 * fade, [0, x * 0.1, 0.12 * Math.sign(x || 1)]);
    cardFxBlock(viewProj, cardFxAdd(base, [0, 0.64, 0]), [0.28, 0.24, 0.24], effect.accent, 0.76 * fade);
    drawLine(viewProj, cardFxAdd(base, [0.1 * Math.sign(x || 1), 0.65, -0.05]), [a.center[0], a.ground + 1.2, a.center[2] - 1.55], 0.06, i % 2 ? effect.color : effect.accent, 0.72 * fade);
  });
  return true;
}

function cardFxTaoyuan(model, viewProj, effect, elapsed, layer) {
  const a = cardFxAnchors(model);
  const p = cardFxProgress(effect, elapsed);
  const fade = cardFxFade(effect, elapsed);
  const points = [
    [a.center[0], a.ground, a.center[2] - 2.25],
    [a.center[0] - 1.25, a.ground, a.center[2] - 1.4],
    [a.center[0] + 1.25, a.ground, a.center[2] - 1.4],
  ];
  if (layer === "behind") {
    points.forEach((point) => drawGroundRing(viewProj, point, 0.54, 0.055, effect.accent, 0.72 * fade, false));
    drawGroundRing(viewProj, [a.center[0], a.ground + 0.04, a.center[2] - 1.7], 1.6, 0.045, effect.color, 0.42 * fade, true);
    return true;
  }
  for (let i = 0; i < 9; i += 1) {
    const angle = i * Math.PI * 2 / 9 + p * 0.6;
    const pos = [a.center[0] + Math.cos(angle) * 1.25, a.ground + 1.2 + Math.sin(i) * 0.3, a.center[2] - 1.65 + Math.sin(angle) * 0.75];
    cardFxBlock(viewProj, pos, [0.2, 0.035, 0.28], i % 2 ? effect.color : effect.accent, 0.7 * fade, [0.3, angle, 0.4]);
  }
  drawSpark(viewProj, [a.center[0], a.ground + 1.3, a.center[2] - 1.65], effect.accent, 0.42, 0.68 * fade);
  return true;
}

function cardFxWugu(model, viewProj, effect, elapsed, layer) {
  const a = cardFxAnchors(model);
  const fade = cardFxFade(effect, elapsed);
  if (layer === "behind") {
    drawGroundRing(viewProj, [a.center[0], a.ground, a.center[2] - 1.55], 1.35, 0.055, effect.color, 0.5 * fade, false);
    return true;
  }
  cardFxCylinder(viewProj, [a.center[0], a.ground + 0.46, a.center[2] - 1.4], [1.0, 0.42, 0.68], "#6A8F3F", 0.7 * fade, [Math.PI / 2, 0, 0]);
  for (let i = 0; i < 5; i += 1) {
    const angle = -0.75 + i * 0.38;
    cardFxCard(viewProj, [a.center[0] + (i - 2) * 0.32, a.ground + 1.15 + Math.cos(angle) * 0.12, a.center[2] - 1.65], "#F4E6B5", effect.accent, 0.82 * fade, [0.18, angle, -angle * 0.3]);
  }
  for (let i = 0; i < 4; i += 1) {
    drawLine(viewProj, [a.center[0] - 0.6 + i * 0.38, a.ground + 0.55, a.center[2] - 1.22], [a.center[0] - 0.48 + i * 0.38, a.ground + 1.48, a.center[2] - 1.2], 0.035, effect.accent, 0.72 * fade);
  }
  return true;
}

function cardFxWuzhong(model, viewProj, effect, elapsed, layer) {
  const a = cardFxAnchors(model);
  const p = cardFxProgress(effect, elapsed);
  const fade = cardFxFade(effect, elapsed);
  const center = [a.center[0], a.ground + 1.85, a.center[2] - 1.35];
  if (layer === "behind") {
    drawGroundRing(viewProj, [a.center[0], a.ground, a.center[2] - 1.35], 0.95, 0.055, effect.color, 0.42 * fade, true);
    return true;
  }
  for (let i = 0; i < 12; i += 1) {
    const t = i / 12;
    const angle = t * Math.PI * 2 + p * 1.2;
    const p0 = [center[0] + Math.cos(angle) * 0.42, center[1] + Math.sin(angle * 2) * 0.18, center[2] + Math.sin(angle) * 0.42];
    const p1 = [center[0] + Math.cos(angle + 0.32) * 0.72, center[1] + Math.sin((angle + 0.32) * 2) * 0.18, center[2] + Math.sin(angle + 0.32) * 0.72];
    drawLine(viewProj, p0, p1, 0.045, i % 2 ? effect.color : effect.accent, 0.72 * fade);
  }
  cardFxCard(viewProj, cardFxAdd(center, [-0.38, 0.1, -0.2]), "#FFFFFF", effect.accent, 0.88 * fade, [0.4, -0.55, 0.15]);
  cardFxCard(viewProj, cardFxAdd(center, [0.38, -0.08, -0.05]), "#FFFFFF", effect.color, 0.88 * fade, [-0.25, 0.45, -0.12]);
  return true;
}

function cardFxJiedao(model, viewProj, effect, elapsed, layer) {
  const a = cardFxAnchors(model);
  const p = cardFxProgress(effect, elapsed);
  const fade = cardFxFade(effect, elapsed);
  const rack = [a.center[0] - 1.25, a.ground + 1.1, a.center[2] - 1.45];
  const target = [a.center[0] + 1.35, a.ground + 1.05, a.center[2] - 1.95];
  if (layer === "behind") {
    drawGroundRing(viewProj, [target[0], a.ground, target[2]], 0.55, 0.055, effect.color, 0.66 * fade, false);
    return true;
  }
  cardFxBlock(viewProj, rack, [0.16, 1.8, 0.16], "#2D3748", 0.72 * fade);
  cardFxDrawSword(viewProj, cardFxMix(rack, target, cardFxClamp(p * 1.15, 0, 1)), effect.accent, "#F2DFB0", 0.86 * fade, [0.35, 0, -0.85], 0.82);
  drawLine(viewProj, rack, target, 0.035, effect.color, 0.82 * fade);
  cardFxSeal(viewProj, [a.center[0], a.ground + 1.38, a.center[2] - 1.7], effect.color, effect.accent, 0.5 * fade);
  return true;
}

function cardFxHuogong(model, viewProj, effect, elapsed, layer) {
  const a = cardFxAnchors(model);
  const hit = cardFxHit(effect, elapsed);
  const fade = cardFxFade(effect, elapsed);
  const card = [a.center[0] - 0.2, a.ground + 1.65, a.center[2] - 1.45];
  if (layer === "behind") {
    drawGroundRing(viewProj, [a.center[0], a.ground, a.center[2] - 1.45], 0.92, 0.055, effect.color, 0.48 * fade, false);
    return true;
  }
  cardFxCard(viewProj, card, "#F6D372", effect.color, 0.88 * fade, [0.18, -0.25, 0.08]);
  for (let i = 0; i < 6; i += 1) {
    const t = i / 5;
    const pos = [card[0] + 0.5 + Math.sin(t * Math.PI) * 0.65, card[1] - 0.2 + t * 0.7, card[2] - 0.18 - t * 0.3];
    cardFxBlock(viewProj, pos, [0.18, 0.06, 0.28], i % 2 ? effect.accent : effect.color, 0.78 * fade * Math.max(0.35, hit), [0.2, t, -0.7]);
  }
  drawSpark(viewProj, cardFxAdd(card, [0.46, 0.04, -0.2]), effect.accent, 0.34, 0.72 * fade * hit);
  return true;
}

function cardFxShandian(model, viewProj, effect, elapsed, layer) {
  const a = cardFxAnchors(model);
  const p = cardFxProgress(effect, elapsed);
  const fade = cardFxFade(effect, elapsed);
  const cloud = [a.center[0], a.ground + 4.05, a.center[2] - 1.25];
  if (layer === "behind") {
    drawGroundRing(viewProj, [a.center[0], a.ground, a.center[2] - 1.25], 0.95, 0.07, effect.accent, 0.58 * fade, true);
    drawGroundRing(viewProj, [a.center[0], a.ground + 0.05, a.center[2] - 1.25], 1.42, 0.04, effect.color, 0.34 * fade, false);
    return true;
  }
  for (let i = 0; i < 4; i += 1) {
    cardFxBlock(viewProj, [cloud[0] - 0.54 + i * 0.36, cloud[1] + Math.sin(i) * 0.08, cloud[2] + (i % 2) * 0.12], [0.58, 0.32, 0.42], i % 2 ? "#101827" : effect.color, 0.78 * fade, [0.05, i * 0.2, 0]);
  }
  for (let i = 0; i < 3; i += 1) {
    const x = (i - 1) * 0.45 + Math.sin(p + i) * 0.05;
    const top = cardFxAdd(cloud, [x, -0.28, 0]);
    const mid = [top[0] + (i % 2 ? -0.28 : 0.28), a.ground + 2.55, top[2] - 0.12];
    const end = [a.center[0] + x * 0.4, a.ground + 0.72, a.center[2] - 1.25];
    drawLine(viewProj, top, mid, 0.055, effect.accent, 0.92 * fade);
    drawLine(viewProj, mid, end, 0.055, "#F7E58A", 0.86 * fade);
  }
  return true;
}

function cardFxEquipPose(model, viewProj, boneMatrices, effect, elapsed, layer, prop) {
  const a = cardFxAnchors(model);
  const p = cardFxProgress(effect, elapsed);
  const fade = cardFxFade(effect, elapsed);
  const rightHand = cardFxHandPoint(model, boneMatrices, "RightArm", cardFxAdd(a.chest, [0.6, 0, -0.2]));
  const leftHand = cardFxHandPoint(model, boneMatrices, "LeftArm", cardFxAdd(a.chest, [-0.6, 0, -0.2]));
  const weaponDisplay = [a.center[0] + 2.35, a.chest[1] - 0.1, a.center[2] - 0.95];
  const armorDisplay = [a.center[0] - 2.15, a.chest[1] - 0.08, a.center[2] - 0.75];
  const isArmor = ["bagua", "shield", "vine", "lion"].includes(prop);
  if (layer === "behind") {
    if (prop === "horse") {
      drawGroundRing(viewProj, [a.center[0], a.ground, a.center[2] + 0.65], 1.42, 0.06, effect.accent, 0.48 * fade, false);
      cardFxMountPath(viewProj, a, effect, fade, effect.id);
    } else if (isArmor) {
      drawGroundRing(viewProj, [armorDisplay[0], a.ground, armorDisplay[2]], 0.72, 0.055, effect.color, 0.42 * fade, true);
    } else {
      drawGroundRing(viewProj, [weaponDisplay[0], a.ground, weaponDisplay[2]], 0.78, 0.045, effect.accent, 0.52 * fade, false);
    }
    return true;
  }
  const bob = Math.sin(p * Math.PI) * 0.16;
  if (prop === "horse") {
    cardFxDrawHorse(viewProj, [a.center[0] + 1.45, a.ground + 0.85 + bob, a.center[2] + 0.4], effect, fade, effect.id, 0.78);
    return true;
  }
  if (prop === "bagua") {
    cardFxDrawBagua(viewProj, cardFxAdd(armorDisplay, [0, bob * 0.4, 0]), effect, fade, 0.98);
    cardFxDrawEquipTether(viewProj, armorDisplay, leftHand, effect, fade, p);
    return true;
  }
  if (prop === "shield") {
    cardFxDrawShield(viewProj, cardFxAdd(armorDisplay, [0, bob * 0.4, 0]), effect.color, effect.accent, fade, 0.98);
    cardFxDrawEquipTether(viewProj, armorDisplay, leftHand, effect, fade, p);
    return true;
  }
  if (prop === "vine") {
    cardFxDrawVine(viewProj, cardFxAdd(armorDisplay, [0, bob * 0.4, 0]), effect, fade, 0.96);
    cardFxDrawEquipTether(viewProj, armorDisplay, leftHand, effect, fade, p);
    return true;
  }
  if (prop === "lion") {
    cardFxDrawLion(viewProj, cardFxAdd(armorDisplay, [0, bob * 0.4, 0]), effect, fade, 0.96);
    cardFxDrawEquipTether(viewProj, armorDisplay, leftHand, effect, fade, p);
    return true;
  }
  const display = cardFxAdd(weaponDisplay, [0, bob * 0.55, 0]);
  cardFxDrawWeaponProp(viewProj, display, prop, effect, fade, prop === "dual_swords" ? 1.02 : 1.08);
  cardFxDrawEquipTether(viewProj, display, prop === "dual_swords" ? cardFxMix(leftHand, rightHand, 0.5) : rightHand, effect, fade, p);
  return true;
}

function cardFxDrawEquipTether(viewProj, display, hand, effect, fade, progress) {
  const appear = cardFxSmooth(0.48, 0.78, progress);
  if (appear <= 0.01) return;
  const start = cardFxMix(display, hand, 0.72);
  drawLine(viewProj, start, hand, 0.035, effect.accent, 0.62 * fade * appear);
  drawSpark(viewProj, start, effect.color, 0.16, 0.46 * fade * appear);
}

function cardFxEquipmentTrigger(model, viewProj, effect, elapsed, layer, prop) {
  const a = cardFxAnchors(model);
  const p = cardFxProgress(effect, elapsed);
  const hit = cardFxHit(effect, elapsed);
  const fade = cardFxFade(effect, elapsed);
  if (layer === "behind") {
    if (prop === "horse") {
      const defensive = cardFxMountSign(effect.id) > 0;
      drawGroundRing(viewProj, [a.center[0], a.ground, a.center[2] - 1.45], defensive ? 1.55 : 0.9, 0.065, defensive ? effect.accent : effect.color, 0.58 * fade, defensive);
      cardFxMountPath(viewProj, a, effect, fade, effect.id);
    } else if (["bagua", "shield", "vine", "lion"].includes(prop)) {
      drawGroundRing(viewProj, [a.center[0], a.ground, a.center[2] - 0.45], 0.98, 0.06, effect.accent, 0.5 * fade, prop === "bagua");
    } else {
      drawGroundRing(viewProj, a.front, Number(effect.radius) || 1.1, 0.06, effect.color, 0.48 * fade, false);
    }
    return true;
  }
  if (prop === "crossbow") cardFxCrossbowVolley(viewProj, a, effect, fade, hit);
  else if (prop === "dual_swords") cardFxDualSwordsExchange(viewProj, a, effect, fade, p);
  else if (prop === "glaive") cardFxGlaiveFollowup(viewProj, a, effect, fade, hit);
  else if (prop === "sword") cardFxPierceShield(viewProj, a, effect, fade, hit);
  else if (prop === "spear") cardFxFuseCardsSpear(viewProj, a, effect, fade, p);
  else if (prop === "axe") cardFxAxeBreak(viewProj, a, effect, fade, hit);
  else if (prop === "halberd") cardFxHalberdTargets(viewProj, a, effect, fade);
  else if (prop === "bow") cardFxBowDismount(viewProj, a, effect, fade, hit);
  else if (prop === "ice_sword") cardFxIceShatter(viewProj, a, effect, fade, hit);
  else if (prop === "fan") cardFxFireFanConvert(viewProj, a, effect, fade, p);
  else if (prop === "scimitar") cardFxScimitarEmptyHand(viewProj, a, effect, fade, hit);
  else if (prop === "bagua") cardFxBaguaJudgement(viewProj, a, effect, fade, p);
  else if (prop === "shield") cardFxRenwangBlock(viewProj, a, effect, fade);
  else if (prop === "vine") cardFxVineScreen(viewProj, a, effect, fade);
  else if (prop === "lion") cardFxLionWard(viewProj, a, effect, fade, hit);
  else if (prop === "horse") cardFxHorseDistance(viewProj, a, effect, fade, effect.id);
  return true;
}

function cardFxDrawWeaponProp(viewProj, pos, prop, effect, fade, scale) {
  if (prop === "crossbow") return cardFxDrawCrossbow(viewProj, pos, effect.color, effect.accent, fade, scale);
  if (prop === "dual_swords") {
    cardFxDrawSword(viewProj, cardFxAdd(pos, [-0.22, 0.08, 0]), effect.color, effect.accent, fade, [0.4, 0, -0.75], scale);
    cardFxDrawSword(viewProj, cardFxAdd(pos, [0.22, -0.02, 0]), effect.accent, effect.color, fade, [0.4, 0, 0.75], scale * 0.88);
    return undefined;
  }
  if (prop === "glaive") return cardFxDrawPolearm(viewProj, pos, effect, fade, scale, "glaive");
  if (prop === "sword") return cardFxDrawSword(viewProj, pos, effect.color, effect.accent, fade, [0.35, 0, -0.55], scale);
  if (prop === "spear") return cardFxDrawPolearm(viewProj, pos, effect, fade, scale, "spear");
  if (prop === "axe") return cardFxDrawAxe(viewProj, pos, effect, fade, scale);
  if (prop === "halberd") return cardFxDrawPolearm(viewProj, pos, effect, fade, scale, "halberd");
  if (prop === "bow") return cardFxDrawBow(viewProj, pos, effect, fade, scale);
  if (prop === "ice_sword") return cardFxDrawSword(viewProj, pos, effect.color, effect.accent, fade, [0.25, 0, -0.55], scale);
  if (prop === "fan") return cardFxDrawFan(viewProj, pos, effect, fade, scale);
  if (prop === "scimitar") return cardFxDrawScimitar(viewProj, pos, effect, fade, scale);
  return undefined;
}

function cardFxDrawCrossbow(viewProj, pos, color, accent, fade, scale = 1) {
  cardFxBlock(viewProj, pos, [0.85, 0.22, 0.24], color, 0.84 * fade, [0.08, -0.45, 0], [scale, scale, scale], "Metal");
  cardFxBlock(viewProj, cardFxAdd(pos, [0, 0.02, -0.35 * scale]), [0.28, 0.18, 0.58], accent, 0.72 * fade, [0.08, -0.45, 0], [scale, scale, scale]);
  for (let i = 0; i < 3; i += 1) drawLine(viewProj, cardFxAdd(pos, [-0.38 + i * 0.38, 0.16, -0.36]), cardFxAdd(pos, [-0.25 + i * 0.25, 0.18, -1.0]), 0.028, "#E9D8A6", 0.8 * fade);
}

function cardFxDrawSword(viewProj, pos, color, accent, fade, rot = [0.3, 0, -0.65], scale = 1) {
  cardFxBlock(viewProj, pos, [0.1, 1.25, 0.08], accent, 0.86 * fade, rot, [scale, scale, scale], "Metal");
  cardFxWedge(viewProj, cardFxAdd(pos, [0, 0.66 * scale, 0]), [0.18, 0.28, 0.12], accent, 0.8 * fade, rot, [scale, scale, scale], "Metal");
  cardFxBlock(viewProj, cardFxAdd(pos, [0, -0.58 * scale, 0]), [0.42, 0.08, 0.12], color, 0.82 * fade, rot, [scale, scale, scale], "Metal");
}

function cardFxDrawPolearm(viewProj, pos, effect, fade, scale, kind) {
  cardFxBlock(viewProj, pos, [0.09, 2.0, 0.09], "#5B4636", 0.8 * fade, [0.7, 0, -0.55], [scale, scale, scale]);
  const head = cardFxAdd(pos, [0.55 * scale, 0.74 * scale, 0]);
  if (kind === "glaive") {
    cardFxWedge(viewProj, head, [0.52, 0.78, 0.18], effect.color, 0.86 * fade, [0.7, 0, -0.55], [scale, scale, scale], "Metal");
    cardFxBlock(viewProj, cardFxAdd(head, [0.18, 0.08, 0]), [0.08, 0.5, 0.12], effect.accent, 0.72 * fade, [0.7, 0, -0.55], [scale, scale, scale], "Metal");
  } else if (kind === "halberd") {
    cardFxWedge(viewProj, head, [0.42, 0.5, 0.16], effect.accent, 0.86 * fade, [0.7, 0, -0.55], [scale, scale, scale], "Metal");
    cardFxBlock(viewProj, cardFxAdd(head, [-0.22, 0.0, 0]), [0.38, 0.16, 0.12], effect.color, 0.78 * fade, [0.7, 0, -0.55], [scale, scale, scale], "Metal");
    cardFxBlock(viewProj, cardFxAdd(head, [0.22, 0.0, 0]), [0.38, 0.16, 0.12], effect.color, 0.78 * fade, [0.7, 0, -0.55], [scale, scale, scale], "Metal");
  } else {
    cardFxWedge(viewProj, head, [0.28, 0.62, 0.14], effect.accent, 0.86 * fade, [0.7, 0, -0.55], [scale, scale, scale], "Metal");
    cardFxWedge(viewProj, cardFxAdd(head, [-0.16, -0.05, 0]), [0.24, 0.5, 0.14], effect.color, 0.7 * fade, [0.7, 0, -0.55], [scale, scale, scale], "Metal");
  }
  return undefined;
}

function cardFxDrawAxe(viewProj, pos, effect, fade, scale = 1) {
  cardFxBlock(viewProj, pos, [0.12, 1.32, 0.12], "#5B4636", 0.82 * fade, [0.45, 0, -0.55], [scale, scale, scale]);
  cardFxWedge(viewProj, cardFxAdd(pos, [0.42 * scale, 0.42 * scale, 0]), [0.82, 0.58, 0.22], effect.accent, 0.86 * fade, [0.45, 0, -0.55], [scale, scale, scale], "Metal");
}

function cardFxDrawBow(viewProj, pos, effect, fade, scale = 1) {
  for (let i = 0; i < 5; i += 1) {
    const y = (i - 2) * 0.28 * scale;
    const x = Math.sin((i / 4) * Math.PI) * 0.38 * scale;
    cardFxBlock(viewProj, cardFxAdd(pos, [x, y, 0]), [0.09, 0.34, 0.09], effect.color, 0.82 * fade, [0.2, 0, 0.35], [scale, scale, scale], "Metal");
  }
  drawLine(viewProj, cardFxAdd(pos, [0, -0.7 * scale, 0]), cardFxAdd(pos, [0, 0.7 * scale, 0]), 0.026, effect.accent, 0.78 * fade);
}

function cardFxDrawFan(viewProj, pos, effect, fade, scale = 1) {
  for (let i = 0; i < 5; i += 1) {
    const angle = -0.55 + i * 0.28;
    cardFxWedge(viewProj, cardFxAdd(pos, [Math.sin(angle) * 0.28 * scale, Math.cos(angle) * 0.18 * scale, 0]), [0.22, 0.85, 0.06], i % 2 ? effect.accent : effect.color, 0.78 * fade, [0.25, angle, -angle], [scale, scale, scale]);
  }
}

function cardFxDrawScimitar(viewProj, pos, effect, fade, scale = 1) {
  for (let i = 0; i < 4; i += 1) {
    cardFxBlock(viewProj, cardFxAdd(pos, [Math.sin(i * 0.45) * 0.18 * scale, (i - 1.5) * 0.25 * scale, 0]), [0.16, 0.42, 0.08], i < 3 ? effect.accent : effect.color, 0.84 * fade, [0.25, 0, -0.85 + i * 0.14], [scale, scale, scale], "Metal");
  }
  cardFxBlock(viewProj, cardFxAdd(pos, [-0.28 * scale, -0.58 * scale, 0]), [0.42, 0.08, 0.12], effect.color, 0.8 * fade, [0.25, 0, -0.85], [scale, scale, scale], "Metal");
}

function cardFxDrawShield(viewProj, pos, color, accent, fade, scale = 1) {
  cardFxCylinder(viewProj, pos, [0.88, 0.16, 1.12], color, 0.84 * fade, [Math.PI / 2, 0, 0], [scale, scale, scale], "Metal");
  cardFxCylinder(viewProj, cardFxAdd(pos, [0, 0.02, -0.04]), [0.44, 0.18, 0.5], accent, 0.72 * fade, [Math.PI / 2, 0, 0], [scale, scale, scale], "Metal");
}

function cardFxDrawBagua(viewProj, pos, effect, fade, scale = 1) {
  cardFxCylinder(viewProj, pos, [0.9, 0.08, 0.9], effect.accent, 0.72 * fade, [Math.PI / 2, 0, 0], [scale, scale, scale], "Metal");
  cardFxCylinder(viewProj, cardFxAdd(pos, [0, 0.02, -0.02]), [0.54, 0.09, 0.54], "#111827", 0.58 * fade, [Math.PI / 2, 0, 0], [scale, scale, scale]);
  for (let i = 0; i < 8; i += 1) {
    const angle = i * Math.PI / 4;
    cardFxBlock(viewProj, cardFxAdd(pos, [Math.cos(angle) * 0.42 * scale, Math.sin(angle) * 0.42 * scale, -0.08]), [0.2, 0.045, 0.035], "#F5F1D4", 0.8 * fade, [0, 0, angle], [scale, scale, scale]);
  }
}

function cardFxDrawVine(viewProj, pos, effect, fade, scale = 1) {
  cardFxBlock(viewProj, pos, [0.82, 0.82, 0.16], effect.color, 0.68 * fade, [0, 0, 0], [scale, scale, scale]);
  for (let i = 0; i < 4; i += 1) {
    drawLine(viewProj, cardFxAdd(pos, [-0.38 + i * 0.25, -0.38, -0.12]), cardFxAdd(pos, [-0.18 + i * 0.22, 0.38, -0.12]), 0.045, "#A97B3B", 0.82 * fade);
  }
  drawSpark(viewProj, cardFxAdd(pos, [0.42 * scale, 0.32 * scale, -0.12]), effect.accent, 0.16, 0.42 * fade);
}

function cardFxDrawLion(viewProj, pos, effect, fade, scale = 1) {
  cardFxBlock(viewProj, pos, [0.9, 0.68, 0.18], effect.color, 0.74 * fade, [0, 0, 0], [scale, scale, scale], "Metal");
  cardFxCylinder(viewProj, cardFxAdd(pos, [0, 0.1 * scale, -0.12]), [0.44, 0.1, 0.44], effect.accent, 0.76 * fade, [Math.PI / 2, 0, 0], [scale, scale, scale], "Metal");
  cardFxBlock(viewProj, cardFxAdd(pos, [-0.38 * scale, 0.28 * scale, -0.08]), [0.28, 0.24, 0.14], effect.accent, 0.68 * fade, [0, 0, 0.35], [scale, scale, scale], "Metal");
  cardFxBlock(viewProj, cardFxAdd(pos, [0.38 * scale, 0.28 * scale, -0.08]), [0.28, 0.24, 0.14], effect.accent, 0.68 * fade, [0, 0, -0.35], [scale, scale, scale], "Metal");
}

function cardFxDrawHorse(viewProj, pos, effect, fade, id, scale = 1) {
  const palette = cardFxHorsePalette(id, effect);
  cardFxBlock(viewProj, pos, [1.04, 0.48, 0.34], palette.body, 0.82 * fade, [0, -0.18, 0], [scale, scale, scale]);
  cardFxBlock(viewProj, cardFxAdd(pos, [0.52 * scale, 0.28 * scale, -0.02]), [0.38, 0.32, 0.28], palette.body, 0.8 * fade, [0, -0.18, -0.15], [scale, scale, scale]);
  cardFxBlock(viewProj, cardFxAdd(pos, [-0.05 * scale, 0.34 * scale, -0.02]), [0.55, 0.12, 0.38], palette.tack, 0.78 * fade, [0, -0.18, 0], [scale, scale, scale]);
  const legXs = [-0.36, -0.12, 0.22, 0.44];
  legXs.forEach((x, i) => {
    const lean = i % 2 ? -0.18 : 0.16;
    cardFxBlock(viewProj, cardFxAdd(pos, [x * scale, -0.48 * scale, 0]), [0.12, 0.7, 0.12], palette.body, 0.78 * fade, [0, 0, lean], [scale, scale, scale]);
    cardFxBlock(viewProj, cardFxAdd(pos, [(x + lean * 0.18) * scale, -0.86 * scale, 0]), [0.22, 0.08, 0.14], palette.hoof, 0.84 * fade, [0, 0, lean], [scale, scale, scale]);
  });
}

function cardFxHorsePalette(id, effect) {
  const palettes = {
    red_hare: { body: "#B32624", tack: "#F0B34F", hoof: "#3A1E1A" },
    dayuan: { body: "#B98245", tack: "#E6C076", hoof: "#F1E3C0" },
    zixing: { body: "#6E2F2F", tack: "#8B5AA8", hoof: "#D0A85A" },
    dilu: { body: "#E7E2D1", tack: "#5F6E7A", hoof: "#B38B55" },
    jueying: { body: "#111827", tack: "#4B5563", hoof: "#9CA3AF" },
    zhuahuang_feidian: { body: "#F4F0DF", tack: "#D6B245", hoof: "#D6B245" },
    hualiu: { body: "#A15B3C", tack: "#E8C37A", hoof: "#F3E2BD" },
  };
  return palettes[id] || { body: effect.color, tack: effect.accent, hoof: "#E7D0A0" };
}

function cardFxMountSign(id) {
  return ["dilu", "jueying", "zhuahuang_feidian", "hualiu"].includes(id) ? 1 : -1;
}

function cardFxMountPath(viewProj, anchors, effect, fade, id) {
  const sign = cardFxMountSign(id);
  const color = sign > 0 ? effect.accent : effect.color;
  const z = anchors.center[2] - 1.1;
  for (let i = 0; i < 4; i += 1) {
    const x = anchors.center[0] + (i - 1.5) * 0.45 * sign;
    cardFxBlock(viewProj, [x, anchors.ground + 0.04, z - i * 0.18], [0.3, 0.035, 0.16], color, 0.5 * fade, [0, sign * 0.35, 0]);
  }
}

function cardFxCrossbowVolley(viewProj, a, effect, fade, hit) {
  cardFxDrawCrossbow(viewProj, [a.center[0] - 0.55, a.ground + 1.65, a.center[2] - 0.8], effect.color, effect.accent, fade, 0.72);
  for (let i = 0; i < 6; i += 1) {
    const start = [a.center[0] - 0.1 + (i % 3) * 0.16, a.ground + 1.55 + Math.floor(i / 3) * 0.16, a.center[2] - 1.15];
    const end = [a.center[0] - 0.85 + i * 0.34, a.ground + 1.0, a.center[2] - 3.05];
    const tip = cardFxMix(start, end, Math.max(0.28, hit));
    drawLine(viewProj, start, tip, 0.042, effect.accent, 0.86 * fade);
    drawArrowHead(viewProj, start, tip, effect.accent, 0.8 * fade);
  }
}

function cardFxDualSwordsExchange(viewProj, a, effect, fade, p) {
  const left = [a.center[0] - 0.8, a.ground + 1.75, a.center[2] - 1.25];
  const right = [a.center[0] + 0.8, a.ground + 1.75, a.center[2] - 1.25];
  cardFxDrawSword(viewProj, left, effect.color, effect.accent, fade, [0.35, 0, -0.75], 0.72);
  cardFxDrawSword(viewProj, right, effect.accent, effect.color, fade, [0.35, 0, 0.75], 0.64);
  cardFxCard(viewProj, cardFxMix(left, right, cardFxPulse(p) * 0.75 + 0.12), "#F7DDA2", effect.color, 0.76 * fade, [0.18, 0.35, 0.2]);
}

function cardFxGlaiveFollowup(viewProj, a, effect, fade, hit) {
  cardFxDrawPolearm(viewProj, [a.center[0] - 0.4, a.ground + 1.45, a.center[2] - 0.8], effect, fade, 0.82, "glaive");
  for (let i = 0; i < 8; i += 1) {
    const t0 = i / 8;
    const t1 = (i + 1) / 8;
    const p0 = [a.center[0] + Math.cos(2.6 - t0 * 3.4) * 1.1, a.ground + 1.45 + Math.sin(t0 * Math.PI) * 0.8, a.center[2] - 1.75 - hit * 0.25];
    const p1 = [a.center[0] + Math.cos(2.6 - t1 * 3.4) * 1.1, a.ground + 1.45 + Math.sin(t1 * Math.PI) * 0.8, a.center[2] - 1.75 - hit * 0.25];
    drawLine(viewProj, p0, p1, 0.06, i < 4 ? effect.color : effect.accent, 0.76 * fade);
  }
}

function cardFxPierceShield(viewProj, a, effect, fade, hit) {
  cardFxDrawShield(viewProj, [a.center[0] + 0.45, a.ground + 1.38, a.center[2] - 1.8], "#B9D6D6", effect.color, fade * 0.45, 0.72);
  const start = [a.center[0] - 1.0, a.ground + 1.7, a.center[2] - 1.1];
  const end = [a.center[0] + 1.1, a.ground + 1.34, a.center[2] - 2.05];
  cardFxDrawSword(viewProj, cardFxMix(start, end, Math.max(0.28, hit)), effect.color, effect.accent, fade, [0.55, -0.9, -1.18], 0.75);
  drawLine(viewProj, start, end, 0.045, "#E7E7E7", 0.8 * fade);
}

function cardFxFuseCardsSpear(viewProj, a, effect, fade, p) {
  const center = [a.center[0], a.ground + 1.5, a.center[2] - 1.35];
  cardFxCard(viewProj, cardFxAdd(center, [-0.7 + p * 0.42, 0.18, 0]), "#EFE1B0", effect.color, 0.76 * fade, [0.2, 0.65, 0.2]);
  cardFxCard(viewProj, cardFxAdd(center, [0.7 - p * 0.42, -0.08, 0]), "#EFE1B0", effect.accent, 0.76 * fade, [-0.2, -0.65, -0.2]);
  cardFxDrawPolearm(viewProj, [center[0], center[1] - 0.05, center[2] - 0.28], effect, fade, 0.85, "spear");
}

function cardFxAxeBreak(viewProj, a, effect, fade, hit) {
  cardFxCard(viewProj, [a.center[0] - 0.72, a.ground + 1.1, a.center[2] - 1.2], "#AEB4B8", effect.color, 0.58 * fade, [0.6, 0.3, 0.5]);
  cardFxCard(viewProj, [a.center[0] - 0.32, a.ground + 1.0, a.center[2] - 1.45], "#AEB4B8", effect.accent, 0.58 * fade, [-0.4, -0.3, -0.35]);
  cardFxDrawAxe(viewProj, [a.center[0] + 0.55, a.ground + 1.65 - hit * 0.34, a.center[2] - 1.65], effect, fade, 0.8);
  drawGroundRing(viewProj, a.front, 0.55, 0.065, effect.accent, 0.62 * fade * Math.max(0.35, hit), false);
}

function cardFxHalberdTargets(viewProj, a, effect, fade) {
  const origin = [a.center[0], a.ground + 1.92, a.center[2] - 1.1];
  cardFxDrawPolearm(viewProj, origin, effect, fade, 0.78, "halberd");
  const targets = cardFxTargetRings(viewProj, a, effect, fade, 3);
  targets.forEach((target, i) => drawLine(viewProj, origin, [target[0], a.ground + 0.75, target[2]], 0.045, i % 2 ? effect.color : effect.accent, 0.78 * fade));
}

function cardFxBowDismount(viewProj, a, effect, fade, hit) {
  const bow = [a.center[0] - 0.85, a.ground + 1.55, a.center[2] - 1.05];
  const saddle = [a.center[0] + 0.9, a.ground + 1.05, a.center[2] - 2.05];
  cardFxDrawBow(viewProj, bow, effect, fade, 0.78);
  drawLine(viewProj, bow, cardFxMix(bow, saddle, Math.max(0.25, hit)), 0.045, effect.accent, 0.84 * fade);
  cardFxBlock(viewProj, saddle, [0.55, 0.16, 0.38], "#2E2A23", 0.72 * fade, [0.35, 0.25 + hit * 0.4, 0.25]);
  drawGroundRing(viewProj, [saddle[0], a.ground, saddle[2]], 0.48, 0.055, effect.color, 0.62 * fade, true);
}

function cardFxIceShatter(viewProj, a, effect, fade, hit) {
  cardFxDrawSword(viewProj, [a.center[0] - 0.45, a.ground + 1.65, a.center[2] - 1.0], effect.color, effect.accent, fade, [0.35, 0, -0.65], 0.75);
  [-0.3, 0.38].forEach((x, i) => {
    const pos = [a.center[0] + x, a.ground + 1.1, a.center[2] - 1.88];
    cardFxCard(viewProj, pos, "#DDF8FF", effect.color, 0.62 * fade, [0.25, i ? -0.35 : 0.35, 0.1]);
    cardFxBlock(viewProj, cardFxAdd(pos, [0, 0.02, 0]), [0.52, 0.09, 0.64], effect.accent, 0.3 * fade, [0.25, i ? -0.35 : 0.35, 0.1]);
  });
  if (hit > 0.15) drawSpark(viewProj, [a.center[0] + 0.05, a.ground + 1.25, a.center[2] - 1.88], effect.color, 0.38, 0.76 * fade);
}

function cardFxFireFanConvert(viewProj, a, effect, fade, p) {
  const pos = [a.center[0] - 0.65, a.ground + 1.3, a.center[2] - 1.0];
  cardFxDrawFan(viewProj, pos, effect, fade, 0.82);
  for (let i = 0; i < 7; i += 1) {
    const t = i / 6;
    const flame = [a.center[0] - 0.15 + Math.sin(t * Math.PI) * 0.55, a.ground + 1.05 + t * 1.0, a.center[2] - 1.4 - t * 0.6];
    cardFxBlock(viewProj, flame, [0.22, 0.08, 0.3], i % 2 ? effect.accent : effect.color, 0.76 * fade, [0.4, p + t, -0.8]);
  }
  drawLine(viewProj, [a.center[0] - 0.1, a.ground + 1.25, a.center[2] - 1.25], [a.center[0] + 1.1, a.ground + 1.55, a.center[2] - 2.1], 0.055, "#F6D88A", 0.74 * fade);
}

function cardFxScimitarEmptyHand(viewProj, a, effect, fade, hit) {
  cardFxDrawScimitar(viewProj, [a.center[0] - 0.35, a.ground + 1.62, a.center[2] - 1.15], effect, fade, 0.86);
  for (let i = 0; i < 3; i += 1) {
    cardFxOutlineCard(viewProj, [a.center[0] + 0.65 + i * 0.28, a.ground + 1.05, a.center[2] - 1.85], effect.accent, 0.42 * fade, [0.15, -0.35, 0]);
  }
  drawSpark(viewProj, [a.center[0] + 0.35, a.ground + 1.45, a.center[2] - 1.65], effect.color, 0.3, 0.7 * fade * Math.max(0.35, hit));
}

function cardFxBaguaJudgement(viewProj, a, effect, fade, p) {
  const pos = [a.center[0], a.ground + 1.55, a.center[2] - 0.85];
  cardFxDrawBagua(viewProj, pos, effect, fade, 0.82);
  const angle = p * Math.PI * 2;
  cardFxBlock(viewProj, cardFxAdd(pos, [Math.cos(angle) * 0.55, Math.sin(angle) * 0.55, -0.12]), [0.14, 0.14, 0.06], "#E03131", 0.88 * fade, [0, 0, angle]);
  cardFxCard(viewProj, [a.center[0] + 0.95, a.ground + 1.25, a.center[2] - 1.4], "#F5F1D4", "#E03131", 0.7 * fade, [0.2, -0.45, 0.1]);
}

function cardFxRenwangBlock(viewProj, a, effect, fade) {
  const shield = [a.center[0] - 0.25, a.ground + 1.45, a.center[2] - 1.25];
  cardFxDrawShield(viewProj, shield, effect.color, effect.accent, fade, 0.85);
  drawLine(viewProj, [a.center[0] + 1.55, a.ground + 1.65, a.center[2] - 2.15], [a.center[0] + 0.2, a.ground + 1.45, a.center[2] - 1.42], 0.12, "#111827", 0.72 * fade);
  drawLine(viewProj, [a.center[0] + 0.2, a.ground + 1.45, a.center[2] - 1.42], [a.center[0] + 1.1, a.ground + 0.92, a.center[2] - 2.05], 0.06, "#111827", 0.55 * fade);
  drawLine(viewProj, [a.center[0] + 0.2, a.ground + 1.45, a.center[2] - 1.42], [a.center[0] + 1.12, a.ground + 2.08, a.center[2] - 2.0], 0.06, "#111827", 0.55 * fade);
}

function cardFxVineScreen(viewProj, a, effect, fade) {
  const center = [a.center[0], a.ground + 1.25, a.center[2] - 1.05];
  cardFxDrawVine(viewProj, center, effect, fade, 0.9);
  for (let i = 0; i < 4; i += 1) {
    drawLine(viewProj, [a.center[0] - 0.9 + i * 0.6, a.ground + 0.32, a.center[2] - 1.28], [a.center[0] - 0.55 + i * 0.42, a.ground + 2.1, a.center[2] - 1.28], 0.07, i % 2 ? effect.color : "#A97B3B", 0.78 * fade);
  }
}

function cardFxLionWard(viewProj, a, effect, fade, hit) {
  const pos = [a.center[0], a.ground + 1.45, a.center[2] - 0.95];
  cardFxDrawLion(viewProj, pos, effect, fade, 0.82);
  drawGroundRing(viewProj, [a.center[0], a.ground + 0.08, a.center[2] - 0.95], 0.74, 0.065, effect.accent, 0.7 * fade, false);
  drawLine(viewProj, [a.center[0] - 1.05, a.ground + 1.9, a.center[2] - 1.6], [a.center[0] - 0.28, a.ground + 1.55, a.center[2] - 1.05], 0.08, effect.accent, 0.48 * fade * Math.max(0.4, hit));
  drawLine(viewProj, [a.center[0] + 1.05, a.ground + 1.9, a.center[2] - 1.6], [a.center[0] + 0.28, a.ground + 1.55, a.center[2] - 1.05], 0.08, effect.accent, 0.48 * fade * Math.max(0.4, hit));
}

function cardFxHorseDistance(viewProj, a, effect, fade, id) {
  const sign = cardFxMountSign(id);
  cardFxDrawHorse(viewProj, [a.center[0] + 0.15 * sign, a.ground + 0.86, a.center[2] - 1.35], effect, fade, id, 0.78);
  const color = sign > 0 ? effect.accent : effect.color;
  const from = [a.center[0] - 1.35 * sign, a.ground + 0.18, a.center[2] - 1.25];
  const to = [a.center[0] + 1.45 * sign, a.ground + 0.18, a.center[2] - 2.0];
  drawLine(viewProj, from, to, 0.055, color, 0.7 * fade);
  drawArrowHead(viewProj, from, to, color, 0.78 * fade);
  cardFxBlock(viewProj, [to[0], a.ground + 0.45, to[2]], [0.42, 0.08, 0.08], color, 0.76 * fade);
  cardFxBlock(viewProj, [to[0], a.ground + 0.45, to[2]], [0.08, 0.42, 0.08], color, sign > 0 ? 0.76 * fade : 0);
}

window.drawCardEffect = drawCardEffect;
window.cardFxBehaviorInventory = cardFxBehaviorInventory;
