// 小游戏入口：画布初始化、字体加载、触摸事件、渲染调度。
import { ctx, sys } from './platform';
import { render, onTouchStart, onTouchMove, onTouchEnd, hitRegions } from './renderer';
import { subscribe, getStore } from './store';

declare const wx: any;

// 高分屏适配：物理像素画布 + CSS 像素坐标系绘制
ctx.setTransform(sys.pixelRatio, 0, 0, sys.pixelRatio, 0, 0);

// 像素字体（子集 TTF 随包携带；加载失败则退回系统字体，游戏仍可玩）
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

// 冒烟测试钩子（仅测试脚本使用）
if (typeof globalThis !== 'undefined') {
  (globalThis as any).__hype = { getStore, hitRegions };
}
