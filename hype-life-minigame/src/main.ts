// 小游戏入口：画布初始化、字体加载、触摸事件、渲染调度。
import { ctx, sys, W, H } from './platform';
import { render, onTouchStart, onTouchMove, onTouchEnd, hitRegions } from './renderer';
import { subscribe, getStore } from './store';

declare const wx: any;

// 高分屏适配：物理像素画布 + CSS 像素坐标系绘制
ctx.setTransform(sys.pixelRatio, 0, 0, sys.pixelRatio, 0, 0);

/** 启动/运行异常直接画在屏幕上（真机上没有控制台，能看到错误才有得修） */
function showFatal(title: string, err: unknown) {
  try {
    ctx.setTransform(sys.pixelRatio, 0, 0, sys.pixelRatio, 0, 0);
    ctx.fillStyle = '#1a1c2c';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ff6b6b';
    ctx.font = '16px sans-serif';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillText(title, 12, 16);
    ctx.fillStyle = '#f4f4f4';
    ctx.font = '12px sans-serif';
    const msg = String((err as Error)?.stack || err).split('\n');
    let y = 44;
    for (const line of msg.slice(0, 24)) {
      for (let i = 0; i < line.length; i += 46) {
        ctx.fillText(line.slice(i, i + 46), 12, y);
        y += 15;
        if (y > H - 10) return;
      }
    }
  } catch {
    // 连画布都失败时无能为力
  }
}

try {
  // 像素字体（子集 TTF 随包携带；加载失败则退回系统字体，游戏仍可玩）
  try {
    wx.loadFontFace({
      global: true,
      family: 'Fusion Pixel',
      source: 'url("assets/fonts/hype-subset.ttf")',
      success: () => render(),
      fail: (err: unknown) => {
        console.warn('像素字体加载失败，回退系统字体', err);
        render();
      },
    });
  } catch (e) {
    console.warn('loadFontFace 异常', e);
  }

  // 触摸 → 渲染器
  wx.onTouchStart((e: { touches: Array<{ clientX: number; clientY: number }> }) => {
    const t = e.touches[0];
    if (t) onTouchStart(t.clientX, t.clientY);
  });
  wx.onTouchMove((e: { touches: Array<{ clientX: number; clientY: number }> }) => {
    const t = e.touches[0];
    if (t) onTouchMove(t.clientX, t.clientY);
  });
  wx.onTouchEnd((e: { changedTouches: Array<{ clientX: number; clientY: number }> }) => {
    const t = e.changedTouches[0];
    if (t) onTouchEnd(t.clientX, t.clientY);
  });

  // 状态变化 → 重绘
  subscribe(() => render());
  render();
  // 真机保险：加载转圈要等首帧经帧循环上屏才会消失，再补渲染一帧
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => render());
  }
} catch (err) {
  showFatal('启动异常 Startup Error', err);
}

// 运行期未捕获异常也画到屏幕上
try {
  wx.onError?.((err: string) => showFatal('运行时错误 Runtime Error', err));
  wx.onUnhandledRejection?.((res: { reason: unknown }) =>
    showFatal('未处理的 Promise 异常', res?.reason),
  );
} catch {
  // 旧基础库无此 API
}

// 冒烟测试钩子（仅测试脚本使用）
if (typeof globalThis !== 'undefined') {
  (globalThis as any).__hype = {
    getStore,
    hitRegions,
    version: '0.1.0-minigame',
    bootOk: true,
  };
}
