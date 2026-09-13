import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { setTimeout as wait } from 'node:timers/promises';

const OUT_DIR = new URL('./', import.meta.url);
const url = process.env.EFFECTS_QA_URL || 'http://127.0.0.1:4178/preview/hero-models/?hero=sun_shangxiang';
const chromePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const port = Number(process.env.CHROME_PORT || 9237);

await mkdir(OUT_DIR, { recursive: true });
const chrome = spawn(chromePath, [
  '--headless=new',
  `--remote-debugging-port=${port}`,
  '--use-gl=swiftshader',
  '--enable-unsafe-swiftshader',
  '--no-first-run',
  '--no-default-browser-check',
  '--window-size=1440,1040',
  `--user-data-dir=/tmp/hero-effects-qa-${port}`,
  'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] });

let seq = 0;
const consoleEntries = [];
const pageExceptions = [];
const logEntries = [];

async function json(endpoint) {
  const response = await fetch(`http://127.0.0.1:${port}${endpoint}`);
  if (!response.ok) throw new Error(`${endpoint} ${response.status}`);
  return response.json();
}

async function waitForChrome() {
  for (let i = 0; i < 80; i += 1) {
    try { return await json('/json/version'); } catch { await wait(100); }
  }
  throw new Error('Chrome remote debugging did not start');
}

async function createTab() {
  const response = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' });
  if (!response.ok) throw new Error(`new tab ${response.status}`);
  return response.json();
}

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  const pending = new Map();
  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result || {});
      return;
    }
    if (message.method === 'Runtime.consoleAPICalled') {
      consoleEntries.push({
        type: message.params.type,
        text: message.params.args?.map((arg) => arg.value || arg.description || '').join(' '),
      });
    }
    if (message.method === 'Runtime.exceptionThrown') pageExceptions.push(message);
    if (message.method === 'Log.entryAdded') logEntries.push(message.params.entry);
  });
  return new Promise((resolve, reject) => {
    ws.addEventListener('open', () => {
      resolve({
        send(method, params = {}) {
          const id = ++seq;
          ws.send(JSON.stringify({ id, method, params }));
          return new Promise((res, rej) => pending.set(id, { resolve: res, reject: rej }));
        },
        close() { ws.close(); },
      });
    }, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });
}

async function evalExpr(client, expression) {
  const result = await client.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(`${result.exceptionDetails.text || 'Runtime evaluation failed'}: ${result.exceptionDetails.exception?.description || ''}`);
  return result.result.value;
}

async function screenshot(client, name, selector = '.stage-wrap') {
  const clip = await evalExpr(client, `(() => {
    const rect = document.querySelector(${JSON.stringify(selector)})?.getBoundingClientRect();
    if (!rect) return null;
    return { x: Math.max(0, rect.x), y: Math.max(0, rect.y), width: Math.max(1, rect.width), height: Math.max(1, rect.height), scale: 1 };
  })()`);
  const params = { format: 'png', fromSurface: true, captureBeyondViewport: false };
  if (clip) params.clip = clip;
  const result = await client.send('Page.captureScreenshot', params);
  await writeFile(new URL(name, OUT_DIR), Buffer.from(result.data, 'base64'));
}

try {
  await waitForChrome();
  const tab = await createTab();
  const client = await connect(tab.webSocketDebuggerUrl);
  await client.send('Page.enable');
  await client.send('Runtime.enable');
  await client.send('Log.enable');
  await client.send('Page.bringToFront');
  await client.send('Page.navigate', { url });
  await wait(1400);
  for (let i = 0; i < 50; i += 1) {
    const rendered = await evalExpr(client, `Boolean(state.gl) && state.gpuMeshUploads > 0 && stage.width > 300`);
    if (rendered) break;
    await wait(100);
  }

  const initial = await evalExpr(client, `({
    hero: document.querySelector('#heroName')?.textContent,
    effectButtons: [...document.querySelectorAll('[data-effect]')].map((button) => button.dataset.effect),
    effectsLoaded: state.effectsLoaded,
    meshCache: state.meshCache.size,
    gpuUploads: state.gpuMeshUploads,
    action: state.action,
    stage: document.querySelector('#effectStage')?.textContent,
    status: document.querySelector('#status')?.textContent || '',
    glReady: Boolean(state.gl),
    canvas: { width: stage.width, height: stage.height, rect: stage.getBoundingClientRect().toJSON() }
  })`);

  const captures = [];
  for (const id of ['slash', 'dodge', 'heal', 'arrows']) {
    await evalExpr(client, `document.querySelector('[data-effect="${id}"]').click()`);
    await wait(id === 'arrows' ? 930 : id === 'heal' ? 560 : id === 'dodge' ? 210 : 340);
    const info = await evalExpr(client, `({
      id: '${id}',
      active: state.activeEffect?.id || null,
      action: state.action,
      stage: document.querySelector('#effectStage')?.textContent,
      meshCache: state.meshCache.size,
      gpuUploads: state.gpuMeshUploads,
      pressed: [...document.querySelectorAll('[data-effect]')].filter((button) => button.getAttribute('aria-pressed') === 'true').map((button) => button.dataset.effect)
    })`);
    captures.push(info);
    await screenshot(client, `browser-effect-${id}.png`);
    await wait(1300);
  }

  const afterFirstPass = await evalExpr(client, `({ meshCache: state.meshCache.size, gpuUploads: state.gpuMeshUploads, action: state.action, active: state.activeEffect?.id || null })`);
  for (let i = 0; i < 24; i += 1) {
    const id = i % 2 === 0 ? 'slash' : 'arrows';
    await evalExpr(client, `document.querySelector('[data-effect="${id}"]').click()`);
    await wait(45);
  }
  await wait(260);
  const replayDuring = await evalExpr(client, `({
    meshCache: state.meshCache.size,
    gpuUploads: state.gpuMeshUploads,
    action: state.action,
    active: state.activeEffect?.id || null,
    pressedCount: document.querySelectorAll('[data-effect][aria-pressed="true"]').length
  })`);
  await wait(2400);
  const replayAfter = await evalExpr(client, `({ meshCache: state.meshCache.size, gpuUploads: state.gpuMeshUploads, action: state.action, active: state.activeEffect?.id || null })`);

  await evalExpr(client, `document.querySelector('[data-effect="heal"]').click()`);
  await wait(240);
  await evalExpr(client, `document.querySelector('#effectCancel').click()`);
  const cancel = await evalExpr(client, `({ active: state.activeEffect?.id || null, action: state.action, stage: document.querySelector('#effectStage')?.textContent })`);

  await evalExpr(client, `document.querySelector('[data-effect="dodge"]').click()`);
  await wait(160);
  await evalExpr(client, `document.querySelectorAll('#heroTabs button')[1].click()`);
  await wait(220);
  const switchHero = await evalExpr(client, `({ active: state.activeEffect?.id || null, action: state.action, hero: document.querySelector('#heroName')?.textContent, stage: document.querySelector('#effectStage')?.textContent })`);

  await client.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await wait(400);
  await evalExpr(client, `document.querySelector('[data-effect="arrows"]').click()`);
  await wait(1050);
  await screenshot(client, 'browser-effect-mobile-arrows.png');
  const mobile = await evalExpr(client, `({
    viewport: { width: innerWidth, height: innerHeight },
    effectButtonCount: document.querySelectorAll('[data-effect]').length,
    stageRect: document.querySelector('.stage-wrap').getBoundingClientRect().toJSON(),
    active: state.activeEffect?.id || null,
    stage: document.querySelector('#effectStage')?.textContent
  })`);

  const report = {
    url,
    initial,
    captures,
    afterFirstPass,
    replayDuring,
    replayAfter,
    cancel,
    switchHero,
    mobile,
    consoleEntries,
    pageExceptionCount: pageExceptions.length,
    logEntries,
    pass: initial.effectsLoaded === true
      && initial.effectButtons.join(',') === 'slash,dodge,heal,arrows'
      && captures.length === 4
      && captures.every((entry) => entry.active === entry.id && entry.pressed.length === 1)
      && replayDuring.pressedCount === 1
      && replayAfter.active === null
      && replayAfter.action === initial.action
      && replayAfter.meshCache === replayDuring.meshCache
      && replayAfter.gpuUploads === replayDuring.gpuUploads
      && cancel.active === null
      && switchHero.active === null
      && mobile.effectButtonCount === 4
      && pageExceptions.length === 0
      && !consoleEntries.some((entry) => entry.type === 'error'),
  };
  await writeFile(new URL('browser-effects-report.json', OUT_DIR), JSON.stringify(report, null, 2));
  await screenshot(client, 'browser-effect-final.png');
  client.close();
  if (!report.pass) {
    console.error(JSON.stringify(report, null, 2));
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify({ pass: report.pass, initial, afterFirstPass, replayDuring, replayAfter, cancel, switchHero, mobile, pageExceptionCount: pageExceptions.length }, null, 2));
  }
} finally {
  chrome.kill('SIGTERM');
  setTimeout(() => process.exit(process.exitCode || 0), 100).unref();
}
