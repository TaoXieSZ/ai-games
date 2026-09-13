(function () {
  "use strict";

  const DATA_URL = "../../data/hero-models-v1.json";
  const HERO_IDS = ["sun_shangxiang", "cao_cao", "zhao_yun", "lu_bu"];
  const PLAYER_ID = "sun_shangxiang";
  const MOVE_RADIUS = 0.78;
  const HERO_SCALE = 0.29;
  const ACTION_DURATION = 0.82;

  const START_SLOTS = {
    sun_shangxiang: { x: 0, z: 2.05, yaw: 0 },
    cao_cao: { x: 0, z: -2.45, yaw: Math.PI },
    zhao_yun: { x: -2.72, z: -0.22, yaw: -Math.PI / 2 },
    lu_bu: { x: 2.72, z: -0.22, yaw: Math.PI / 2 },
  };

  const ACTION_PROFILES = {
    sun_shangxiang: { actionType: "bow", actionHand: "left" },
    cao_cao: { actionType: "sword", actionHand: "right" },
    zhao_yun: { actionType: "spear", actionHand: "right" },
    lu_bu: { actionType: "spear", actionHand: "right" },
  };

  const stateByCanvas = new WeakMap();

  function create(canvas, options = {}) {
    if (!(canvas instanceof HTMLCanvasElement)) throw new Error("BattleStage.create requires a canvas element.");
    const previous = stateByCanvas.get(canvas);
    if (previous) previous.destroy();

    const gl = canvas.getContext("webgl", { antialias: true, alpha: true, preserveDrawingBuffer: true });
    if (!gl) throw new Error("This browser does not support WebGL.");

    const state = {
      canvas,
      gl,
      options,
      program: makeProgram(gl),
      meshCache: new Map(),
      gpuMeshCache: new WeakMap(),
      gpuMeshes: new Set(),
      models: new Map(),
      heroes: new Map(),
      selectedId: null,
      showRange: false,
      ready: false,
      destroyed: false,
      raf: 0,
      lastTime: performance.now() / 1000,
      keys: new Set(),
      pointers: new Map(),
      pointerStart: null,
      dragVector: [0, 0],
      joystickVector: [0, 0],
      viewProj: identityMat4(),
      cameraEye: [0, 7, 8],
      reducedMotion: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
      resizeObserver: null,
      disposers: [],
    };

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0.02, 0.055, 0.06, 0);

    setupHeroes(state);
    wireInput(state);
    state.resizeObserver = new ResizeObserver(() => resizeCanvas(state));
    state.resizeObserver.observe(canvas);

    loadModels(state).then(() => {
      if (state.destroyed) return;
      state.ready = true;
      options.onReady?.();
    }).catch((error) => {
      console.error("BattleStage model load failed:", error);
      state.ready = false;
      options.onError?.(error);
    });

    const api = {
      setSelected(id) {
        state.selectedId = id && state.heroes.has(id) ? id : null;
      },
      setRange(value) {
        state.showRange = Boolean(value);
      },
      play(id, action = "attack") {
        const hero = state.heroes.get(id);
        if (!hero) return;
        hero.action = action === "walk" || action === "attack" ? action : "ready";
        hero.actionStartedAt = performance.now() / 1000;
      },
      move(dx = 0, dz = 0) {
        state.joystickVector = clampedMoveVector(Number(dx) || 0, Number(dz) || 0);
      },
      snapshot() {
        return {
          ready: state.ready,
          actors: [...state.heroes.values()].map((hero) => ({
            id: hero.id,
            x: hero.x,
            z: hero.z,
            originX: hero.homeX,
            originZ: hero.homeZ,
            action: hero.action,
          })),
          meshCount: state.meshCache.size,
          gpuBuffers: state.gpuMeshes.size * 4,
        };
      },
      reset() {
        setupHeroes(state);
        state.selectedId = null;
        state.showRange = false;
        state.keys.clear();
        state.dragVector = [0, 0];
        state.joystickVector = [0, 0];
      },
      destroy() {
        state.destroyed = true;
        cancelAnimationFrame(state.raf);
        state.resizeObserver?.disconnect();
        state.disposers.forEach((dispose) => dispose());
        state.gpuMeshes.forEach((gpu) => deleteGpuMesh(state.gl, gpu));
        state.gpuMeshes.clear();
        if (state.program?.id) state.gl.deleteProgram(state.program.id);
        state.gpuMeshCache = new WeakMap();
        stateByCanvas.delete(canvas);
      },
    };
    state.destroy = api.destroy;
    state.raf = requestAnimationFrame((time) => render(state, time));
    stateByCanvas.set(canvas, state);

    return api;
  }

  function setupHeroes(state) {
    state.heroes.clear();
    HERO_IDS.forEach((id) => {
      const slot = slotForHero(state, id);
      state.heroes.set(id, {
        id,
        x: slot.x,
        z: slot.z,
        homeX: slot.x,
        homeZ: slot.z,
        yaw: slot.yaw,
        baseYaw: slot.yaw,
        action: "ready",
        actionStartedAt: -100,
        walkAmount: 0,
        headWorld: [0, 0, 0],
        screen: { x: 0, y: 0, visible: false },
      });
    });
  }

  function syncResponsiveSlots(state) {
    state.heroes.forEach((hero) => {
      const slot = slotForHero(state, hero.id);
      const offsetX = hero.id === PLAYER_ID ? hero.x - hero.homeX : 0;
      const offsetZ = hero.id === PLAYER_ID ? hero.z - hero.homeZ : 0;
      hero.homeX = slot.x;
      hero.homeZ = slot.z;
      hero.baseYaw = slot.yaw;
      if (hero.id === PLAYER_ID) {
        hero.x = slot.x + offsetX;
        hero.z = slot.z + offsetZ;
        clampHeroToHome(hero);
      } else {
        hero.x = slot.x;
        hero.z = slot.z;
        hero.yaw = slot.yaw;
      }
    });
  }

  function slotForHero(state, id) {
    const base = START_SLOTS[id];
    if (!state?.canvas) return base;
    const rect = state.canvas.getBoundingClientRect();
    const aspect = (rect.width || 1) / Math.max(1, rect.height || 1);
    if (aspect >= 0.75) return base;
    const mobileSlots = {
      sun_shangxiang: { x: 0, z: 1.72, yaw: 0 },
      cao_cao: { x: 0, z: -2.28, yaw: Math.PI },
      zhao_yun: { x: -1.82, z: -0.32, yaw: -Math.PI / 2 },
      lu_bu: { x: 1.82, z: -0.32, yaw: Math.PI / 2 },
    };
    return mobileSlots[id] || base;
  }

  async function loadModels(state) {
    const response = await fetch(DATA_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`Unable to load ${DATA_URL}`);
    const payload = await response.json();
    if (!Array.isArray(payload)) throw new Error("Hero model data must be an array.");
    state.models.clear();
    payload.filter((model) => HERO_IDS.includes(model.id)).forEach((model, index) => {
      state.models.set(model.id, prepareModelRuntime(state, normalizeModel(model, index)));
    });
    const missing = HERO_IDS.filter((id) => !state.models.has(id));
    if (missing.length) throw new Error(`Missing battle hero models: ${missing.join(", ")}`);
  }

  function normalizeModel(model, index) {
    const id = model.id || `hero_${index + 1}`;
    return {
      id,
      name: model.name || id,
      bones: Array.isArray(model.bones) ? model.bones : [],
      parts: Array.isArray(model.parts) ? model.parts : [],
      poses: model.poses || {},
      attachmentMotion: Array.isArray(model.attachmentMotion) ? model.attachmentMotion : [],
      bowMotion: model.bowMotion || null,
    };
  }

  function prepareModelRuntime(state, model) {
    const draws = [];
    const attachmentMotion = prepareAttachmentMotion(model.attachmentMotion);
    const bowMotion = prepareBowMotion(model.bowMotion);

    model.bones.forEach((bone) => {
      if (!bone.visible || bone.name === "Root") return;
      const size = vec3(bone.size);
      const mesh = primitiveMesh(state, "box", size, materialColor(bone.color || "#ffffff", "SmoothPlastic"));
      draws.push({ name: bone.name, bone: bone.name, mesh, local: translationMat4(...vec3(bone.center)), size, material: "SmoothPlastic", kind: "bone" });
    });

    model.parts.forEach((part) => {
      const size = vec3(part.size);
      const mesh = primitiveMesh(state, part.shape || "box", size, materialColor(part.color, part.material));
      const local = multiplyMat4(translationMat4(...vec3(part.position)), rotationMat4(...vec3(part.rotation).map(degToRad)));
      draws.push({ name: part.name || "", bone: part.bone, mesh, local, size, material: part.material || "SmoothPlastic", kind: "part" });
    });

    return { ...model, runtime: { draws, attachmentMotion, bowMotion } };
  }

  function prepareAttachmentMotion(motions) {
    const byPart = new Map();
    motions.forEach((motion) => {
      const prepared = {
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

  function wireInput(state) {
    const { canvas } = state;

    const onKeyDown = (event) => {
      if (isInteractionBlocked()) {
        state.keys.clear();
        state.dragVector = [0, 0];
        state.joystickVector = [0, 0];
        return;
      }
      if (!shouldHandleKeyboard(event, canvas)) return;
      const key = event.key.toLowerCase();
      if (!["w", "a", "s", "d", "arrowup", "arrowleft", "arrowdown", "arrowright"].includes(key)) return;
      event.preventDefault();
      state.keys.add(key);
    };
    const onKeyUp = (event) => {
      state.keys.delete(event.key.toLowerCase());
    };
    const onPointerDown = (event) => {
      if (isInteractionBlocked()) {
        state.keys.clear();
        state.dragVector = [0, 0];
        return;
      }
      if (event.button !== undefined && event.button !== 0) return;
      const rect = canvas.getBoundingClientRect();
      state.pointerStart = { id: event.pointerId, x: event.clientX, y: event.clientY, rect, moved: 0 };
      state.pointers.set(event.pointerId, [event.clientX, event.clientY]);
      canvas.setPointerCapture?.(event.pointerId);
    };
    const onPointerMove = (event) => {
      if (isInteractionBlocked()) {
        state.keys.clear();
        state.dragVector = [0, 0];
        return;
      }
      if (!state.pointerStart || state.pointerStart.id !== event.pointerId) return;
      const dx = event.clientX - state.pointerStart.x;
      const dy = event.clientY - state.pointerStart.y;
      state.pointerStart.moved = Math.max(state.pointerStart.moved, Math.hypot(dx, dy));
      const strength = clamp(Math.hypot(dx, dy) / 90, 0, 1);
      if (strength > 0.05) state.dragVector = [dx / Math.max(1, Math.hypot(dx, dy)) * strength, dy / Math.max(1, Math.hypot(dx, dy)) * strength];
      state.pointers.set(event.pointerId, [event.clientX, event.clientY]);
    };
    const onPointerUp = (event) => {
      const start = state.pointerStart;
      state.pointers.delete(event.pointerId);
      state.dragVector = [0, 0];
      if (start && start.id === event.pointerId && start.moved < 10) selectNearestHero(state, event.clientX, event.clientY);
      if (start?.id === event.pointerId) state.pointerStart = null;
    };
    const onPointerCancel = (event) => {
      state.pointers.delete(event.pointerId);
      if (state.pointerStart?.id === event.pointerId) state.pointerStart = null;
      state.dragVector = [0, 0];
    };
    const onBlur = () => {
      state.keys.clear();
      state.dragVector = [0, 0];
      state.joystickVector = [0, 0];
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerCancel);
    state.disposers.push(
      () => window.removeEventListener("keydown", onKeyDown),
      () => window.removeEventListener("keyup", onKeyUp),
      () => window.removeEventListener("blur", onBlur),
      () => canvas.removeEventListener("pointerdown", onPointerDown),
      () => canvas.removeEventListener("pointermove", onPointerMove),
      () => canvas.removeEventListener("pointerup", onPointerUp),
      () => canvas.removeEventListener("pointercancel", onPointerCancel),
    );
  }

  function shouldHandleKeyboard(event, canvas) {
    if (event.metaKey || event.ctrlKey || event.altKey) return false;
    const active = document.activeElement;
    if (!active || active === document.body || active === document.documentElement || active === canvas) return true;
    const tag = active.tagName;
    if (active.isContentEditable || ["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A"].includes(tag)) return false;
    return active.closest?.("[role='button'],[role='textbox'],[contenteditable='true']") == null;
  }

  function isInteractionBlocked() {
    return Boolean(document.querySelector("dialog[open]"));
  }

  function selectNearestHero(state, clientX, clientY) {
    const rect = state.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    let best = null;
    state.heroes.forEach((hero) => {
      if (!hero.screen.visible) return;
      const distance = Math.hypot(hero.screen.x - x, hero.screen.y - y);
      if (distance < 54 && (!best || distance < best.distance)) best = { id: hero.id, distance };
    });
    if (best) {
      state.selectedId = best.id;
      state.options.onSelect?.(best.id);
    }
  }

  function render(state, nowMs) {
    if (state.destroyed) return;
    const now = nowMs / 1000;
    const dt = clamp(now - state.lastTime, 0, 0.05);
    state.lastTime = now;

    syncResponsiveSlots(state);
    updateMovement(state, dt);
    resizeCanvas(state);

    const gl = state.gl;
    gl.viewport(0, 0, state.canvas.width, state.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const camera = cameraForCanvas(state);
    state.cameraEye = camera.eye;
    const view = lookAt(camera.eye, camera.target, [0, 1, 0]);
    const proj = perspective(degToRad(camera.fov), camera.aspect, 0.1, 90);
    proj[9] = -camera.centerNdcY;
    state.viewProj = multiplyMat4(proj, view);

    drawStage(state);
    drawHeroes(state, now);
    emitPositions(state);

    state.raf = requestAnimationFrame((time) => render(state, time));
  }

  function updateMovement(state, dt) {
    if (isInteractionBlocked()) {
      state.keys.clear();
      state.dragVector = [0, 0];
      state.joystickVector = [0, 0];
      const player = state.heroes.get(PLAYER_ID);
      if (player?.action === "walk") player.action = "ready";
      if (player) player.walkAmount = approach(player.walkAmount, 0, dt * 7);
      return;
    }
    let x = 0;
    let z = 0;
    if (state.keys.has("a") || state.keys.has("arrowleft")) x -= 1;
    if (state.keys.has("d") || state.keys.has("arrowright")) x += 1;
    if (state.keys.has("w") || state.keys.has("arrowup")) z -= 1;
    if (state.keys.has("s") || state.keys.has("arrowdown")) z += 1;
    if (state.dragVector[0] || state.dragVector[1]) {
      x += state.dragVector[0];
      z += state.dragVector[1];
    }
    if (state.joystickVector[0] || state.joystickVector[1]) {
      x += state.joystickVector[0];
      z += state.joystickVector[1];
    }
    const length = Math.hypot(x, z);
    if (length > 0.01) movePlayer(state, x / Math.max(1, length), z / Math.max(1, length), dt);

    const player = state.heroes.get(PLAYER_ID);
    if (player) {
      const moving = length > 0.01;
      player.walkAmount = approach(player.walkAmount, moving ? 1 : 0, dt * 7);
      if (moving) {
        player.action = "walk";
        player.actionStartedAt = performance.now() / 1000;
      } else if (player.action === "walk") {
        player.action = "ready";
      }
    }
  }

  function movePlayer(state, dx, dz, dt) {
    const hero = state.heroes.get(PLAYER_ID);
    if (!hero) return;
    const speed = 1.55;
    hero.x += dx * speed * dt;
    hero.z += dz * speed * dt;
    clampHeroToHome(hero);
    if (Math.hypot(dx, dz) > 0.02) hero.yaw = Math.atan2(-dx, -dz);
  }

  function clampHeroToHome(hero) {
    const offsetX = hero.x - hero.homeX;
    const offsetZ = hero.z - hero.homeZ;
    const distance = Math.hypot(offsetX, offsetZ);
    if (distance > MOVE_RADIUS) {
      hero.x = hero.homeX + offsetX / distance * MOVE_RADIUS;
      hero.z = hero.homeZ + offsetZ / distance * MOVE_RADIUS;
    }
  }

  function clampedMoveVector(dx, dz) {
    const length = Math.hypot(dx, dz);
    if (length <= 0.01) return [0, 0];
    const scale = Math.min(1, length) / length;
    return [dx * scale, dz * scale];
  }

  function drawStage(state) {
    const viewProj = state.viewProj;
    drawMesh(state, primitiveMesh(state, "cylinder", [8.8, 0.12, 8.8], [0.16, 0.24, 0.24]), translationMat4(0, -0.08, 0), viewProj, 1, 0, "SmoothPlastic");
    drawMesh(state, primitiveMesh(state, "cylinder", [9.45, 0.08, 9.45], [0.045, 0.09, 0.095]), translationMat4(0, -0.15, 0), viewProj, 1, 0, "SmoothPlastic");

    drawGroundRing(state, [0, 0.005, 0], 4.15, 0.03, "#D7B85F", 0.84, false);
    drawGroundRing(state, [0, 0.018, 0], 2.65, 0.018, "#6A7D78", 0.48, false);

    for (let i = 0; i < 8; i += 1) {
      const angle = i * Math.PI / 4;
      const matrix = multiplyMat4(translationMat4(0, 0.035, 0), multiplyMat4(rotationMat4(0, angle, 0), translationMat4(0, 0, 2.08)));
      drawMesh(state, primitiveMesh(state, "box", [0.026, 0.03, 4.12], [0.76, 0.62, 0.28]), matrix, viewProj, i % 2 ? 0.26 : 0.42, 0, "Metal");
    }

    state.heroes.forEach((hero) => {
      if (state.showRange && hero.id === PLAYER_ID) drawGroundRing(state, [hero.homeX, 0.048, hero.homeZ], MOVE_RADIUS, 0.04, "#D7B85F", 0.88, true);
      drawMesh(state, primitiveMesh(state, "cylinder", [0.72, 0.024, 0.72], [0.005, 0.01, 0.012]), translationMat4(hero.x + 0.06, 0.018, hero.z + 0.09), viewProj, 0.34, 0, "SmoothPlastic");
      if (hero.id === state.selectedId) drawGroundRing(state, [hero.x, 0.058, hero.z], 0.68, 0.055, "#F4CA55", 0.96, false);
      if (state.showRange && hero.id !== PLAYER_ID) drawGroundRing(state, [hero.x, 0.052, hero.z], 0.78, 0.035, "#D7B85F", 0.68, true);
    });
  }

  function cameraForCanvas(state) {
    const rect = state.canvas.getBoundingClientRect();
    const width = Math.max(1, rect.width || state.canvas.clientWidth || state.canvas.width || 1);
    const height = Math.max(1, rect.height || state.canvas.clientHeight || state.canvas.height || 1);
    const aspect = width / height;
    const mobilePortrait = aspect < 0.75;
    const fov = mobilePortrait ? 46 : height < 540 ? 48 : 41;
    const target = [0, 0.96, -0.14];
    if (mobilePortrait) {
      return {
        aspect,
        fov,
        target,
        eye: [0, target[1] + 15.2 * 0.68, target[2] + 15.2 * 0.74],
        centerNdcY: 0.21,
      };
    }
    const cacheKey = `${width}:${height}:${state.models.size}`;
    if (state.cameraFitCache?.key === cacheKey) return state.cameraFitCache.value;
    const safe = safeStageRect(width, height);
    const labelHeight = height < 540 ? 23 : 51;
    const distance = fitCameraDistance(state, target, aspect, fov, safe, width, height, labelHeight);
    const eye = [0, target[1] + distance * 0.68, target[2] + distance * 0.74];
    const view = lookAt(eye, target, [0, 1, 0]);
    const proj = perspective(degToRad(fov), aspect, 0.1, 90);
    const bounds = projectedActorBounds(state, multiplyMat4(proj, view), width, height, labelHeight);
    const safeCenterY = (safe.top + safe.bottom) * 0.5;
    const boundsCenterY = (bounds.top + bounds.bottom) * 0.5;
    const centerNdcY = clamp((boundsCenterY - safeCenterY) * 2 / height, -0.55, 0.55);
    const result = { aspect, fov, target, eye, centerNdcY };
    state.cameraFitCache = { key: cacheKey, value: result };
    return result;
  }

  function safeStageRect(width, height) {
    let top = 200;
    let bottom = height - 315;
    if (height < 540) {
      top = 110;
      bottom = height - 126;
    } else if (height <= 800) {
      top = height < 650 ? 145 : 175;
      bottom = height - 205;
    }
    const shortLandscape = height < 540;
    return {
      left: width * (shortLandscape ? 0.08 : 0.24),
      right: width * (shortLandscape ? 0.92 : 0.76),
      top,
      bottom: Math.max(top + 90, bottom),
    };
  }

  function fitCameraDistance(state, target, aspect, fov, safe, width, height, labelHeight) {
    let distance = height < 540 ? 13.2 : 13.8;
    for (let i = 0; i < 28; i += 1) {
      const eye = [0, target[1] + distance * 0.68, target[2] + distance * 0.74];
      const view = lookAt(eye, target, [0, 1, 0]);
      const proj = perspective(degToRad(fov), aspect, 0.1, 90);
      const bounds = projectedActorBounds(state, multiplyMat4(proj, view), width, height, labelHeight);
      const projectedWidth = bounds.right - bounds.left;
      const projectedHeight = bounds.bottom - bounds.top;
      const safeWidth = safe.right - safe.left;
      const safeHeight = safe.bottom - safe.top;
      if (projectedWidth <= safeWidth && projectedHeight <= safeHeight) return distance;
      const widthRatio = projectedWidth / Math.max(1, safeWidth);
      const heightRatio = projectedHeight / Math.max(1, safeHeight);
      distance *= Math.max(1.08, Math.min(1.28, Math.max(widthRatio, heightRatio) * 1.04));
    }
    return distance;
  }

  function projectedActorBounds(state, viewProj, width, height, labelHeight) {
    const bounds = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity };
    state.heroes.forEach((hero) => {
      actorBoundsPoints(state, hero).forEach((point) => {
        const projected = projectPoint(viewProj, point, width, height);
        if (!projected.visible && projected.x < -9000) return;
        bounds.left = Math.min(bounds.left, projected.x);
        bounds.right = Math.max(bounds.right, projected.x);
        bounds.top = Math.min(bounds.top, projected.y - labelHeight);
        bounds.bottom = Math.max(bounds.bottom, projected.y);
      });
    });
    if (!Number.isFinite(bounds.left)) return { left: 0, right: width, top: 0, bottom: height };
    return bounds;
  }

  function actorBoundsPoints(state, hero) {
    const model = state.models.get(hero.id);
    const head = model?.bones.find(bone => bone.name === "Head");
    const bones = model && computeBoneMatrices(model, "ready", 0, true);
    const localHead = bones && transformPoint(bones.get("Head") || identityMat4(), vec3(head?.center || [0, 5, 0]));
    const headY = localHead ? (localHead[1] + 1.05) * HERO_SCALE : 1.95;
    const points = [];
    for (const x of [-0.65, 0.65]) {
      for (const y of [0, headY - 0.2]) {
        for (const z of [-0.4, 0.4]) points.push([hero.homeX + x, y, hero.homeZ + z]);
      }
    }
    points.push([hero.homeX, headY, hero.homeZ]);
    return points;
  }

  function drawHeroes(state, now) {
    const ordered = [...state.heroes.values()].sort((a, b) => a.z - b.z);
    ordered.forEach((hero) => {
      const model = state.models.get(hero.id);
      if (!model) return;
      const elapsed = now - hero.actionStartedAt;
      if (hero.action === "attack" && elapsed > ACTION_DURATION) hero.action = "ready";
      const action = hero.action === "attack" || hero.action === "walk" ? hero.action : "ready";
      const poseTime = action === "attack" ? elapsed : now;
      const root = multiplyMat4(
        translationMat4(hero.x, 0, hero.z),
        multiplyMat4(rotationMat4(0, hero.yaw, 0), scaleMat4(HERO_SCALE, HERO_SCALE, HERO_SCALE)),
      );
      const boneMatrices = computeBoneMatrices(model, action, poseTime, state.reducedMotion);
      model.runtime.draws.forEach((item) => {
        const local = drawMatrixForItem(model, item, boneMatrices, action, poseTime);
        drawMesh(state, item.mesh, multiplyMat4(root, local), state.viewProj, 1, item.material === "Neon" ? 1 : 0, item.material);
      });
      const head = model.bones.find((bone) => bone.name === "Head");
      const headLocal = transformPoint(boneMatrices.get("Head") || identityMat4(), vec3(head?.center || [0, 1.8, 0]));
      hero.headWorld = transformPoint(root, [headLocal[0], headLocal[1] + 1.05, headLocal[2]]);
      if (action === "attack") drawAttackCue(state, hero, elapsed / ACTION_DURATION);
    });
  }

  function drawAttackCue(state, hero, progress) {
    const p = clamp(progress, 0, 1);
    const fade = 1 - smoothstep(0.65, 1, p);
    const forward = [-Math.sin(hero.yaw), 0, -Math.cos(hero.yaw)];
    const start = [hero.x, 1.35, hero.z];
    const end = [hero.x + forward[0] * (1.1 + p * 0.8), 1.42, hero.z + forward[2] * (1.1 + p * 0.8)];
    drawLine(state, start, end, 0.045, "#F8D979", 0.8 * fade);
    drawLine(state, [end[0] - 0.18, end[1] + 0.14, end[2]], [end[0] + 0.18, end[1] - 0.14, end[2]], 0.032, "#FFF6D0", 0.72 * fade);
  }

  function emitPositions(state) {
    const rect = state.canvas.getBoundingClientRect();
    const positions = {};
    state.heroes.forEach((hero) => {
      const projected = projectPoint(state.viewProj, hero.headWorld, rect.width, rect.height);
      hero.screen = projected;
      positions[hero.id] = { x: projected.x, y: projected.y };
    });
    state.options.onPositions?.(positions);
  }

  function computeBoneMatrices(model, action, time, reducedMotion) {
    const boneMap = new Map(model.bones.map((bone) => [bone.name, bone]));
    const matrices = new Map();
    function resolve(name) {
      if (matrices.has(name)) return matrices.get(name);
      const bone = boneMap.get(name);
      if (!bone) return identityMat4();
      const parent = bone.parent ? resolve(bone.parent) : identityMat4();
      const ready = model.poses?.ready?.[bone.name] || [0, 0, 0];
      const offset = poseOffsetFor(model, action, bone.name, time, reducedMotion);
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

  function poseOffsetFor(model, action, boneName, time, reducedMotion) {
    if (action === "walk") return walkOffsetForPreview(boneName, time, reducedMotion);
    if (action === "attack") return attackOffsetForPreview(model, boneName, time);
    return idleOffsetForPreview(boneName, time, reducedMotion);
  }

  function idleOffsetForPreview(boneName, time, reducedMotion) {
    const pulse = Math.sin(time * 2.1) * (reducedMotion ? 1.2 : 3);
    if (boneName === "Torso") return [pulse * 0.18, 0, 0];
    if (boneName === "Head") return [0, pulse * 0.16, 0];
    return [0, 0, 0];
  }

  function walkOffsetForPreview(boneName, time, reducedMotion) {
    const pulse = Math.sin(time * 7.2) * (reducedMotion ? 7 : 19);
    if (boneName === "LeftArm" || boneName === "RightLeg") return [pulse, 0, 0];
    if (boneName === "RightArm" || boneName === "LeftLeg") return [-pulse, 0, 0];
    if (boneName === "Torso") return [0, 0, Math.sin(time * 7.2) * 2.4];
    return [0, 0, 0];
  }

  function attackOffsetForPreview(model, boneName, time) {
    const profile = ACTION_PROFILES[model.id] || { actionType: "sword", actionHand: "right" };
    const t = clamp(time / ACTION_DURATION, 0, 1);
    const windup = smoothstep(0, 0.22, t);
    const strike = Math.sin(clamp((t - 0.16) / 0.48, 0, 1) * Math.PI);
    const recover = smoothstep(0.64, 1, t);
    const power = Math.max(strike, windup * (1 - recover));
    if (profile.actionType === "bow") {
      const draw = t < 0.55 ? smoothstep(0.05, 0.32, t) : 1 - smoothstep(0.55, 0.72, t);
      if (boneName === "Torso") return [-2 * draw, -7 * draw, -3 * draw];
      if (boneName === "Head") return [0, -5 * draw, 0];
      if (boneName === "LeftArm") return [-2 * draw, 0, 3 * draw];
      if (boneName === "RightArm") return [6 * draw, 0, 20 * draw];
      if (boneName === "RightLeg") return [-4 * draw, 0, 0];
      if (boneName === "LeftLeg") return [5 * draw, 0, 0];
    }
    if (profile.actionType === "spear") {
      if (boneName === "Torso") return [-7 * strike, -4 * strike, 4 * strike];
      if (boneName === "Head") return [3 * strike, -3 * strike, 0];
      if (boneName === "RightArm") return [-42 * strike, 0, -8 * strike];
      if (boneName === "LeftArm") return [-30 * strike, 0, 10 * strike];
      if (boneName === "RightLeg") return [-10 * strike, 0, 0];
      if (boneName === "LeftLeg") return [8 * strike, 0, 0];
    }
    if (boneName === "Torso") return [0, -8 * power, 10 * strike];
    if (boneName === "Head") return [0, -5 * power, 0];
    if (boneName === "RightArm") return [-90 * strike, 0, 18 * strike];
    if (boneName === "LeftArm") return [20 * strike, 0, -12 * strike];
    if (boneName === "RightLeg") return [-6 * strike, 0, 0];
    if (boneName === "LeftLeg") return [6 * strike, 0, 0];
    return [0, 0, 0];
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
    if (action === "attack") return 1.25 * Math.sin(Math.PI * clamp(time / ACTION_DURATION, 0, 1)) * Math.sin(8 * time + phase);
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
      const frame = multiplyMat4(translationMat4(...nock), alignYMat4(subtractVec3(motion.grip, nock)));
      return multiplyMat4(leftWorld, multiplyMat4(frame, multiplyMat4(translationMat4(...arrow.offset), rotationMat4(...arrow.rotation.map(degToRad)))));
    }
    return null;
  }

  function makeProgram(gl) {
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
      uniform vec3 uEye;
      uniform float uAlpha;
      uniform float uEmissive;
      uniform float uMetal;
      uniform float uRoughness;
      void main() {
        vec3 n = normalize(vNormal);
        vec3 key = normalize(uLight);
        vec3 view = normalize(uEye - vWorld);
        float diffuse = max(dot(n, key), 0.0);
        float fill = max(dot(n, normalize(view + vec3(0.25, 0.55, 0.15))), 0.0);
        float sky = n.y * 0.5 + 0.5;
        float rim = pow(1.0 - max(dot(n, view), 0.0), 3.0);
        float specular = pow(max(dot(n, normalize(key + view)), 0.0), mix(80.0, 11.0, uRoughness));
        vec3 lit = vColor * (0.28 + diffuse * 0.56 + fill * 0.18 + sky * 0.13);
        lit += mix(vec3(1.0, 0.92, 0.72), vColor, uMetal * 0.65) * specular * mix(0.05, 0.34, uMetal) * (1.0 - uRoughness * 0.62);
        lit += vec3(0.58, 0.82, 0.9) * rim * 0.045;
        vec3 glow = min(vec3(1.0), vColor * 1.45 + vec3(0.08, 0.07, 0.035));
        gl_FragColor = vec4(mix(lit, glow, uEmissive), uAlpha);
      }
    `);
    const program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    return {
      id: program,
      aPosition: gl.getAttribLocation(program, "aPosition"),
      aNormal: gl.getAttribLocation(program, "aNormal"),
      aColor: gl.getAttribLocation(program, "aColor"),
      uModel: gl.getUniformLocation(program, "uModel"),
      uViewProj: gl.getUniformLocation(program, "uViewProj"),
      uLight: gl.getUniformLocation(program, "uLight"),
      uEye: gl.getUniformLocation(program, "uEye"),
      uAlpha: gl.getUniformLocation(program, "uAlpha"),
      uEmissive: gl.getUniformLocation(program, "uEmissive"),
      uMetal: gl.getUniformLocation(program, "uMetal"),
      uRoughness: gl.getUniformLocation(program, "uRoughness"),
    };
  }

  function compileShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  }

  function drawMesh(state, mesh, matrix, viewProj, alpha = 1, emissive = 0, material = "SmoothPlastic") {
    if (!mesh.indices.length) return;
    const gl = state.gl;
    const program = state.program;
    const gpu = uploadMesh(state, mesh);
    gl.useProgram(program.id);
    bindArray(gl, program.aPosition, gpu.position, 3);
    bindArray(gl, program.aNormal, gpu.normal, 3);
    bindArray(gl, program.aColor, gpu.color, 3);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gpu.index);
    gl.uniformMatrix4fv(program.uModel, false, matrix);
    gl.uniformMatrix4fv(program.uViewProj, false, viewProj);
    gl.uniform3f(program.uLight, -0.42, 0.86, 0.58);
    gl.uniform3fv(program.uEye, state.cameraEye);
    gl.uniform1f(program.uAlpha, clamp(alpha, 0, 1));
    gl.uniform1f(program.uEmissive, clamp(emissive, 0, 1));
    gl.uniform1f(program.uMetal, material === "Metal" ? 1 : 0);
    gl.uniform1f(program.uRoughness, material === "Fabric" ? 0.95 : material === "Metal" ? 0.36 : 0.72);
    if (alpha < 0.999) gl.depthMask(false);
    gl.drawElements(gl.TRIANGLES, gpu.count, gl.UNSIGNED_SHORT, 0);
    if (alpha < 0.999) gl.depthMask(true);
  }

  function uploadMesh(state, mesh) {
    const cached = state.gpuMeshCache.get(mesh);
    if (cached) return cached;
    const gl = state.gl;
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
    state.gpuMeshes.add(gpu);
    return gpu;
  }

  function deleteGpuMesh(gl, gpu) {
    if (!gl || !gpu) return;
    gl.deleteBuffer(gpu.position);
    gl.deleteBuffer(gpu.normal);
    gl.deleteBuffer(gpu.color);
    gl.deleteBuffer(gpu.index);
  }

  function bindArray(gl, attribute, buffer, size) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(attribute);
    gl.vertexAttribPointer(attribute, size, gl.FLOAT, false, 0, 0);
  }

  function primitiveMesh(state, shape, size, color) {
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

  function boxMesh(size, color) {
    const [x, y, z] = size.map((value) => value / 2);
    return facesToMesh([
      [[[-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]], [0, 0, 1]],
      [[[x, -y, -z], [-x, -y, -z], [-x, y, -z], [x, y, -z]], [0, 0, -1]],
      [[[-x, y, z], [x, y, z], [x, y, -z], [-x, y, -z]], [0, 1, 0]],
      [[[-x, -y, -z], [x, -y, -z], [x, -y, z], [-x, -y, z]], [0, -1, 0]],
      [[[x, -y, z], [x, -y, -z], [x, y, -z], [x, y, z]], [1, 0, 0]],
      [[[-x, -y, -z], [-x, -y, z], [-x, y, z], [-x, y, -z]], [-1, 0, 0]],
    ], color);
  }

  function wedgeMesh(size, color) {
    const [x, y, z] = size.map((value) => value / 2);
    const slopeNormal = normalize([0, z, -y]);
    return facesToMesh([
      [[[-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]], [0, 0, 1]],
      [[[-x, -y, -z], [x, -y, -z], [x, -y, z], [-x, -y, z]], [0, -1, 0]],
      [[[-x, -y, -z], [-x, -y, z], [-x, y, z]], [-1, 0, 0]],
      [[[x, -y, z], [x, -y, -z], [x, y, z]], [1, 0, 0]],
      [[[-x, y, z], [x, y, z], [x, -y, -z], [-x, -y, -z]], slopeNormal],
    ], color);
  }

  function cylinderMesh(size, color) {
    const [sx, sy, sz] = size;
    const rx = sx / 2;
    const rz = sz / 2;
    const h = sy / 2;
    const segments = 32;
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
      const t1 = row / rows * Math.PI;
      const t2 = (row + 1) / rows * Math.PI;
      for (let col = 0; col < cols; col += 1) {
        const u1 = col / cols * Math.PI * 2;
        const u2 = (col + 1) / cols * Math.PI * 2;
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

  function drawGroundRing(state, center, radius, thickness, color, alpha, dashed) {
    const mesh = ringMesh(state, dashed ? 0.026 : thickness, materialColor(color, "SmoothPlastic"), dashed);
    const matrix = multiplyMat4(translationMat4(center[0], center[1], center[2]), scaleMat4(radius, 1, radius));
    drawMesh(state, mesh, matrix, state.viewProj, alpha, alpha < 0.999 ? 0.25 : 0, "Metal");
  }

  function ringMesh(state, thicknessRatio, color, dashed = false) {
    const segments = dashed ? 56 : 80;
    const normalizedThickness = clamp(thicknessRatio, 0.01, 0.14);
    const key = `ring|${normalizedThickness.toFixed(3)}|${color.map((value) => value.toFixed(4)).join(",")}|${dashed ? 1 : 0}`;
    const cached = state.meshCache.get(key);
    if (cached) return cached;
    const mesh = emptyMesh();
    const inner = Math.max(0.02, 1 - normalizedThickness * 0.5);
    const outer = 1 + normalizedThickness * 0.5;
    for (let i = 0; i < segments; i += 1) {
      if (dashed && i % 4 > 1) continue;
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

  function drawLine(state, from, to, width, color, alpha) {
    drawMesh(state, primitiveMesh(state, "box", [width, 1, width], materialColor(color, "SmoothPlastic")), lineMatrixBetween(from, to, 1), state.viewProj, alpha, 0.75, "SmoothPlastic");
  }

  function resizeCanvas(state) {
    const rect = state.canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.floor(rect.width * ratio));
    const height = Math.max(1, Math.floor(rect.height * ratio));
    if (state.canvas.width !== width || state.canvas.height !== height) {
      state.canvas.width = width;
      state.canvas.height = height;
    }
  }

  function projectPoint(matrix, point, width, height) {
    const x = matrix[0] * point[0] + matrix[4] * point[1] + matrix[8] * point[2] + matrix[12];
    const y = matrix[1] * point[0] + matrix[5] * point[1] + matrix[9] * point[2] + matrix[13];
    const z = matrix[2] * point[0] + matrix[6] * point[1] + matrix[10] * point[2] + matrix[14];
    const w = matrix[3] * point[0] + matrix[7] * point[1] + matrix[11] * point[2] + matrix[15];
    if (w <= 0.0001) return { x: -9999, y: -9999, visible: false };
    const nx = x / w;
    const ny = y / w;
    return {
      x: (nx * 0.5 + 0.5) * width,
      y: (0.5 - ny * 0.5) * height,
      visible: Math.abs(nx) <= 1.2 && Math.abs(ny) <= 1.2 && z / w >= -1 && z / w <= 1,
    };
  }

  function materialColor(color, material) {
    const rgb = hexToRgb(color || "#ffffff");
    if (material === "Fabric") return rgb.map((value) => value * 0.96);
    return rgb;
  }

  function hexToRgb(hex) {
    const clean = String(hex).replace("#", "");
    const int = Number.parseInt(clean.length === 3 ? clean.split("").map((char) => char + char).join("") : clean, 16);
    if (!Number.isFinite(int)) return [1, 1, 1];
    return [((int >> 16) & 255) / 255, ((int >> 8) & 255) / 255, (int & 255) / 255];
  }

  function vec3(value) {
    return Array.isArray(value) && value.length >= 3 ? value.map(Number) : [0, 0, 0];
  }

  function degToRad(degrees) {
    return (Number(degrees) || 0) * Math.PI / 180;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function approach(value, target, amount) {
    if (value < target) return Math.min(target, value + amount);
    return Math.max(target, value - amount);
  }

  function smoothstep(edge0, edge1, value) {
    const t = clamp((value - edge0) / Math.max(0.0001, edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  function normalize(vector) {
    const length = Math.hypot(...vector) || 1;
    return vector.map((value) => value / length);
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

  function transformPoint(matrix, point) {
    const [x, y, z] = point;
    return [
      matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12],
      matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13],
      matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14],
    ];
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

  window.BattleStage = { create };
})();
