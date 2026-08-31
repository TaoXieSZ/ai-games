// 结局页黑屏调试：录制绘制调用，看结局帧画了什么
import assert from 'node:assert';
const storage = new Map();
const handlers = {};
const ops = [];
let recording = false;
const makeCtx = () =>
  new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === 'measureText') return (s) => ({ width: String(s).length * 10 });
        if (prop === 'canvas') return canvasMock;
        return (...args) => {
          if (recording) {
            if (prop === 'fillText' || prop === 'fillRect' || prop === 'strokeRect')
              ops.push({ op: prop, args: args.map((a) => (typeof a === 'string' ? a.slice(0, 24) : Math.round(a * 10) / 10)) });
          }
          return undefined;
        };
      },
      set() {
        return true;
      },
    },
  );
const canvasMock = { width: 0, height: 0, getContext: () => makeCtx() };
globalThis.wx = {
  getSystemInfoSync: () => ({ windowWidth: 375, windowHeight: 750, pixelRatio: 2 }),
  createCanvas: () => canvasMock,
  getStorageSync: (k) => storage.get(k) ?? '',
  setStorageSync: (k, v) => storage.set(k, v),
  removeStorageSync: (k) => storage.delete(k),
  createInnerAudioContext: () => ({ src: '', play() {}, stop() {}, seek() {} }),
  loadFontFace: (o) => o?.success?.(),
  onTouchStart: (fn) => (handlers.start = fn),
  onTouchMove: (fn) => (handlers.move = fn),
  onTouchEnd: (fn) => (handlers.end = fn),
  onError: (fn) => (globalThis.__onErr = fn),
};
await import('../game.js');
const hype = globalThis.__hype;
const tapLabel = (label) => {
  const btn = hype.hitRegions().find((b) => b.label === label);
  assert.ok(btn, `找不到 ${label}`);
  handlers.start?.({ touches: [{ clientX: btn.x + btn.w / 2, clientY: btn.y + btn.h / 2 }] });
  handlers.end?.({ changedTouches: [{ clientX: btn.x + btn.w / 2, clientY: btn.y + btn.h / 2 }] });
};
tapLabel('start');
let guard = 0;
recording = false;
while (!hype.getStore().state.endingId && guard < 200) {
  const choices = hype.hitRegions().filter((b) => (b.label ?? '').startsWith('choice:'));
  if (!choices.length) break;
  ops.length = 0; // 只保留最后一帧的绘制
  recording = true;
  try {
    choices[0].cb();
  } catch (e) {
    console.log('=== drawEnding 抛出异常 ===');
    console.log(e?.stack || e);
  }
  recording = false;
  guard++;
}
const st = hype.getStore().state;
console.log('endingId:', st.endingId, '| cards:', st.cardsPlayed);
console.log('结局帧绘制调用数:', ops.length);
const texts = ops.filter((o) => o.op === 'fillText');
console.log('--- 文本绘制（前 25 条，含坐标）---');
for (const t of texts.slice(0, 25)) console.log(JSON.stringify(t));
const ys = ops.map((o) => o.args[2]).filter((v) => typeof v === 'number');
console.log('y 范围:', Math.min(...ys), '~', Math.max(...ys));
if (globalThis.__onErr && typeof globalThis.__captured !== 'undefined') {
  console.log('onError 曾触发');
}
