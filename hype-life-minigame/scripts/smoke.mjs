// 冒烟测试：用 wx mock 在 Node 里跑通「标题 → 开局 → 选择 → 回滚 → 再选 → 退出 → 继续存档」。
// 运行前先 npm run build 生成 game.js。
import assert from 'node:assert';

// ── wx mock ──────────────────────────────────────────
const storage = new Map();
const handlers = {};
const makeCtx = () =>
  new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === 'measureText') return (s) => ({ width: String(s).length * 10 });
        if (prop === 'canvas') return canvasMock;
        return () => undefined;
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
};

await import('../game.js');

const hype = globalThis.__hype;
assert.ok(hype, '冒烟钩子 __hype 未暴露');
const store = () => hype.getStore();

function tapLabel(label) {
  const btn = hype.hitRegions().find((b) => b.label === label);
  assert.ok(btn, `找不到按钮 ${label}（当前屏：${store().screen}）`);
  const cx = btn.x + btn.w / 2;
  const cy = btn.y + btn.h / 2;
  handlers.start?.({ touches: [{ clientX: cx, clientY: cy }] });
  handlers.end?.({ changedTouches: [{ clientX: cx, clientY: cy }] });
}

// 1. 初始在标题页，开局
assert.equal(store().screen, 'title');
tapLabel('start');
assert.equal(store().screen, 'game');
assert.equal(store().state.currentEventId, 'm_start');

// 2. 选第一个选项（高调作死）→ 推进到 m_prize，属性/旗标生效
tapLabel('choice:0');
assert.equal(store().state.currentEventId, 'm_prize');
assert.equal(store().state.stats.hype, 30 + 10);
assert.ok(store().state.flags.includes('gambler'));

// 3. 时光机回滚 → 回到 m_start，属性还原、旗标移除、次数-1
tapLabel('undo');
assert.equal(store().state.currentEventId, 'm_start');
assert.equal(store().state.stats.hype, 30);
assert.ok(!store().state.flags.includes('gambler'));
assert.equal(store().state.undoLeft, 2);

// 4. 再选一次（换条路线：老实刷题）
tapLabel('choice:1');
assert.equal(store().state.currentEventId, 'm_prize');
assert.equal(store().state.stats.trust, 90 + 8); // 开局信用 90 + 刷题 8

// 5. 退出（二次确认）→ 标题页，存档保留
tapLabel('exit');
tapLabel('exit');
assert.equal(store().screen, 'title');

// 6. 继续上辈子 → 恢复到 m_prize
tapLabel('continue');
assert.equal(store().screen, 'game');
assert.equal(store().state.currentEventId, 'm_prize');

// 7. 死亡局：风险爆表直接触发结局，结局页必须真正渲染出按钮
tapLabel('exit');
tapLabel('exit');
tapLabel('start');
// m_start 第一个选项 hype+10/trust-5，不致死；连点穿越若干卡直到出现结局
let guard = 0;
while (!store().state.endingId && guard < 200) {
  const choices = hype.hitRegions().filter((b) => (b.label ?? '').startsWith('choice:'));
  if (choices.length === 0) break;
  choices[0].cb();
  guard++;
}
assert.ok(
  store().state.endingId === null || typeof store().state.endingId === 'string',
  'endingId 非法',
);
// 结局页必须注册了结局按钮（否则说明结局页没被渲染——黑屏 bug 回归）
assert.ok(
  hype.hitRegions().some((b) => b.label === 'restart'),
  '结局页未渲染（缺少再活一次按钮）',
);

console.log('✅ 冒烟测试通过：标题/开局/选择/时光机回滚/退出/存档续玩/结局链路均正常');
