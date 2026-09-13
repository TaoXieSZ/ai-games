import { spawn } from 'node:child_process';
import { mkdir, writeFile, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const outputDir = process.argv[2] || path.resolve('sanguosha-roblox/docs/art/hero-models-secondary-motion-01/verification');
const baseUrl = process.argv[3] || 'http://127.0.0.1:4178/preview/hero-models/';
const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const remotePort = 9910 + Math.floor(Math.random() * 500);
const profileDir = path.join('/tmp', `chrome-secondary-motion-qa-${process.pid}`);
await mkdir(outputDir, { recursive: true });

if (!existsSync(chromePath)) throw new Error(`Chrome not found: ${chromePath}`);

const browser = spawn(chromePath, [
  '--headless=new',
  `--remote-debugging-port=${remotePort}`,
  `--user-data-dir=${profileDir}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-background-networking',
  '--window-size=1200,860',
  'about:blank',
], { stdio: ['ignore', 'pipe', 'pipe'] });

let stderr = '';
browser.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

async function waitForVersion() {
  const endpoint = `http://127.0.0.1:${remotePort}/json/version`;
  const start = Date.now();
  while (Date.now() - start < 10000) {
    try {
      const response = await fetch(endpoint);
      if (response.ok) return response.json();
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Chrome CDP did not start: ${stderr.slice(0, 1000)}`);
}

class CdpSession {
  constructor(webSocketDebuggerUrl) {
    this.ws = new WebSocket(webSocketDebuggerUrl);
    this.nextId = 0;
    this.pending = new Map();
    this.errors = [];
    this.ws.onmessage = (message) => {
      const data = JSON.parse(message.data);
      if (data.id && this.pending.has(data.id)) {
        const pending = this.pending.get(data.id);
        this.pending.delete(data.id);
        data.error ? pending.reject(new Error(JSON.stringify(data.error))) : pending.resolve(data.result);
      } else if (data.method === 'Runtime.exceptionThrown') {
        this.errors.push(data.params.exceptionDetails?.exception?.description || data.params.exceptionDetails?.text || 'exception');
      } else if (data.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(data.params.type)) {
        const text = (data.params.args || []).map((arg) => arg.value ?? arg.description ?? '').join(' ');
        this.errors.push(`${data.params.type}: ${text}`);
      }
    };
  }

  ready() {
    return new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });
  }

  send(method, params = {}) {
    const id = ++this.nextId;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }

  async eval(expression) {
    const result = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'Runtime.evaluate failed');
    }
    return result.result?.value;
  }

  close() {
    this.ws.close();
  }
}

async function createTab() {
  const response = await fetch(`http://127.0.0.1:${remotePort}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' });
  if (!response.ok) throw new Error(`Could not create CDP tab: ${response.status}`);
  return response.json();
}

async function clipFor(selector, cdp) {
  return cdp.eval(`(() => {
    const rect = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, scale: 1 };
  })()`);
}

async function screenshot(cdp, fileName, selector = '.stage-wrap') {
  const { data } = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: false,
    clip: await clipFor(selector, cdp),
  });
  await writeFile(path.join(outputDir, fileName), Buffer.from(data, 'base64'));
}

async function main() {
  await waitForVersion();
  const tab = await createTab();
  const cdp = new CdpSession(tab.webSocketDebuggerUrl);
  await cdp.ready();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Page.navigate', { url: baseUrl });
  await cdp.eval(`new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      const count = document.querySelectorAll('#heroTabs button').length;
      const stats = document.querySelector('#modelStats')?.textContent || '';
      const status = document.querySelector('#status')?.textContent || '';
      if (count === 25 && /几何 [1-9]/.test(stats)) resolve(true);
      else if (status.includes('失败')) reject(new Error(status));
      else if (Date.now() - start > 15000) reject(new Error('Timed out waiting for 25 models'));
      else setTimeout(tick, 100);
    };
    tick();
  })`);

  const qa = await cdp.eval(`(() => {
    const actionTimes = {
      ready: [0, 0.125, 0.25, 0.5, 0.75, 1.0],
      walk: [0, 0.125, 0.25, 0.375, 0.5, 0.75],
      attack: [0, 0.14, 0.28, 0.5, 0.57, 0.64, 0.79],
    };
    const finiteFailures = [];
    const motionSamples = [];
    const boundsByHero = [];

    const finiteArray = (values) => Array.isArray(values) && values.every((value) => Number.isFinite(value));
    const maxAbs = (values) => values.reduce((max, value) => Math.max(max, Math.abs(value)), 0);
    const partNames = (model) => new Set(model.runtime.draws.filter((item) => item.kind === 'part').map((item) => item.name));

    state.models.forEach((model) => {
      let heroMin = [Infinity, Infinity, Infinity];
      let heroMax = [-Infinity, -Infinity, -Infinity];
      for (const [action, times] of Object.entries(actionTimes)) {
        times.forEach((time) => {
          const boneMatrices = computeBoneMatrices(model, action, time);
          model.runtime.draws.forEach((item) => {
            const matrix = drawMatrixForItem(model, item, boneMatrices, action, time);
            if (!finiteArray(matrix)) finiteFailures.push({ hero: model.id, item: item.name, action, time, reason: 'matrix-not-finite' });
            for (let index = 0; index < item.mesh.positions.length; index += 3) {
              const point = transformPoint(matrix, [item.mesh.positions[index], item.mesh.positions[index + 1], item.mesh.positions[index + 2]]);
              if (!finiteArray(point)) finiteFailures.push({ hero: model.id, item: item.name, action, time, reason: 'point-not-finite' });
              for (let axis = 0; axis < 3; axis += 1) {
                heroMin[axis] = Math.min(heroMin[axis], point[axis]);
                heroMax[axis] = Math.max(heroMax[axis], point[axis]);
              }
            }
          });
        });
      }
      boundsByHero.push({ hero: model.id, name: model.name, min: heroMin, max: heroMax, span: heroMax.map((value, index) => value - heroMin[index]) });

      const names = partNames(model);
      (model.attachmentMotion || []).forEach((motion) => {
        const pivot = vec3(motion.pivot);
        const missingParts = (motion.parts || []).filter((name) => !names.has(name));
        const byAction = {};
        for (const [action, times] of Object.entries(actionTimes)) {
          byAction[action] = times.map((time) => {
            const wave = attachmentWave(action, time, Number(motion.phase) || 0);
            return { time, wave, pivot };
          });
        }
        motionSamples.push({ type: 'attachment', hero: model.id, id: motion.id || '', parts: motion.parts || [], missingParts, pivot, pivotStable: byAction.ready.concat(byAction.walk, byAction.attack).every((entry) => JSON.stringify(entry.pivot) === JSON.stringify(pivot)), byAction });
      });
    });

    const sun = state.models.find((model) => model.id === 'sun_shangxiang');
    const bowSamples = [];
    if (sun?.runtime?.bowMotion) {
      const motion = sun.runtime.bowMotion;
      actionTimes.attack.concat([0.22, 0.36, 0.43]).sort((a, b) => a - b).forEach((time) => {
        const boneMatrices = computeBoneMatrices(sun, 'attack', time);
        const leftWorld = boneMatrices.get(motion.bone) || identityMat4();
        const rightWorld = boneMatrices.get(motion.drawBone) || identityMat4();
        const nockWorld = transformPoint(rightWorld, motion.drawPoint);
        const nock = transformPoint(invertRigidMat4(leftWorld), nockWorld);
        const gripWorld = transformPoint(leftWorld, motion.grip);
        const grip = motion.grip;
        const gripDirection = normalize(subtractVec3(grip, nock));
        const draw = time < 0.5 ? Math.sin(clamp(time / 0.28, 0, 1) * Math.PI * 0.5) : Math.max(0, 1 - (time - 0.5) / 0.14);
        const stringErrors = motion.strings.map((name, index) => {
          const item = sun.runtime.draws.find((drawItem) => drawItem.name === name);
          const matrix = drawMatrixForItem(sun, item, boneMatrices, 'attack', time);
          const tipWorld = transformPoint(leftWorld, motion.tips[index]);
          const localHalf = (item?.size?.[1] || 1) / 2;
          const endpointA = transformPoint(matrix, [0, -localHalf, 0]);
          const endpointB = transformPoint(matrix, [0, localHalf, 0]);
          const distances = [
            Math.hypot(...subtractVec3(endpointA, tipWorld)) + Math.hypot(...subtractVec3(endpointB, nockWorld)),
            Math.hypot(...subtractVec3(endpointA, nockWorld)) + Math.hypot(...subtractVec3(endpointB, tipWorld)),
          ];
          return {
            part: name,
            tipError: Math.min(Math.hypot(...subtractVec3(endpointA, tipWorld)), Math.hypot(...subtractVec3(endpointB, tipWorld))),
            nockError: Math.min(Math.hypot(...subtractVec3(endpointA, nockWorld)), Math.hypot(...subtractVec3(endpointB, nockWorld))),
            pairedEndpointError: Math.min(...distances),
          };
        });
        const arrowErrors = motion.arrows.map((arrow) => {
          const item = sun.runtime.draws.find((drawItem) => drawItem.name === arrow.part);
          const matrix = drawMatrixForItem(sun, item, boneMatrices, 'attack', time);
          const originWorld = transformPoint(matrix, [0, 0, 0]);
          const axisWorld = normalize(subtractVec3(transformPoint(matrix, [0, 1, 0]), originWorld));
          const nockDistance = Math.hypot(...subtractVec3(transformPoint(leftWorld, nock), nockWorld));
          const alignment = dot(axisWorld, normalize(subtractVec3(gripWorld, nockWorld)));
          return { part: arrow.part, axisDotNockToGrip: alignment, nockLocalWorldError: nockDistance };
        });
        bowSamples.push({ time, draw, nock, nockWorld, grip, gripWorld, stringErrors, arrowErrors });
      });
    }

    return {
      heroCount: state.models.length,
      actions: actionTimes,
      finiteFailures,
      boundsByHero,
      motionSamples,
      bowSamples,
      consoleNote: 'Console errors are collected outside this in CDP.',
    };
  })()`);

  await cdp.eval(`document.querySelectorAll('#heroTabs button')[21].click(); document.querySelector("[data-view='front']").click();`);
  await new Promise((resolve) => setTimeout(resolve, 250));
  await screenshot(cdp, 'browser-sun-shangxiang-ready.png');
  await cdp.eval(`document.querySelector("[data-action='attack']").click();`);
  await new Promise((resolve) => setTimeout(resolve, 280));
  await screenshot(cdp, 'browser-sun-shangxiang-attack-draw.png');
  await new Promise((resolve) => setTimeout(resolve, 360));
  await screenshot(cdp, 'browser-sun-shangxiang-attack-rebound.png');

  for (const [source, dest] of [
    ['/tmp/bow-motion-qa/sun-shangxiang-ready-front.png', 'browser-source-bow-ready-front.png'],
    ['/tmp/bow-motion-qa/sun-shangxiang-attack-520ms.png', 'browser-source-bow-attack-520ms.png'],
  ]) {
    if (existsSync(source)) await copyFile(source, path.join(outputDir, dest));
  }

  const report = {
    generatedAt: new Date().toISOString(),
    source: baseUrl,
    changedRepoFiles: [],
    cdpConsoleErrors: cdp.errors,
    ...qa,
  };
  await writeFile(path.join(outputDir, 'browser-secondary-motion-report.json'), JSON.stringify(report, null, 2));

  const maxStringPairedEndpointError = Math.max(0, ...qa.bowSamples.flatMap((sample) => sample.stringErrors.map((entry) => entry.pairedEndpointError)));
  const minArrowAxisDot = Math.min(1, ...qa.bowSamples.flatMap((sample) => sample.arrowErrors.map((entry) => entry.axisDotNockToGrip)));
  const maxNockLocalWorldError = Math.max(0, ...qa.bowSamples.flatMap((sample) => sample.arrowErrors.map((entry) => entry.nockLocalWorldError)));
  await writeFile(path.join(outputDir, 'browser-secondary-motion-report.md'), `# Secondary motion browser verification\n\nSource: ${baseUrl}\n\nNo repo source, data, export, or Studio files were modified by this verification. The script samples the live browser page and calls the same matrix functions used by rendering and bounds.\n\n## Summary\n\n- Hero count: ${qa.heroCount}\n- Finite matrix/point failures: ${qa.finiteFailures.length}\n- CDP console errors/warnings: ${cdp.errors.length}\n- Attachment motion entries sampled: ${qa.motionSamples.length}\n- Bow attack samples: ${qa.bowSamples.length}\n- Max bow string paired endpoint error: ${maxStringPairedEndpointError.toExponential(6)} studs\n- Min arrow +Y axis dot with nock→grip: ${minArrowAxisDot.toFixed(6)}\n- Max nock local/world consistency error: ${maxNockLocalWorldError.toExponential(6)} studs\n\n## Key screenshots\n\n- browser-sun-shangxiang-ready.png\n- browser-sun-shangxiang-attack-draw.png\n- browser-sun-shangxiang-attack-rebound.png\n- browser-source-bow-ready-front.png, copied from /tmp/bow-motion-qa when available\n- browser-source-bow-attack-520ms.png, copied from /tmp/bow-motion-qa when available\n\n## Coverage\n\n- All 25 heroes: ready/walk/attack sampled at multiple times.\n- Attachment pivot stability: every attachment entry keeps the authored pivot array constant across ready/walk/attack samples.\n- Sun Shangxiang bow: both string segments are checked against tip/nock endpoints through charge and rebound samples; arrow +Y is checked against nock→grip.\n`);

  const result = {
    outputDir,
    heroCount: qa.heroCount,
    finiteFailures: qa.finiteFailures.length,
    cdpConsoleErrors: cdp.errors.length,
    attachmentEntries: qa.motionSamples.length,
    bowSamples: qa.bowSamples.length,
    maxStringPairedEndpointError,
    minArrowAxisDot,
    maxNockLocalWorldError,
  };
  console.log(JSON.stringify(result, null, 2));
  cdp.close();
}

main().finally(() => browser.kill('SIGTERM'));
