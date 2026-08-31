// 微信小游戏平台适配：画布、系统信息、存储。
declare const wx: any;

export const sys = wx.getSystemInfoSync();
export const canvas = wx.createCanvas();
export const ctx: CanvasRenderingContext2D = canvas.getContext('2d');

canvas.width = sys.windowWidth * sys.pixelRatio;
canvas.height = sys.windowHeight * sys.pixelRatio;

export const W = sys.windowWidth; // 逻辑宽度（CSS px）
export const H = sys.windowHeight;

export function getStorage(key: string): string | null {
  try {
    return wx.getStorageSync(key) || null;
  } catch {
    return null;
  }
}

export function setStorage(key: string, value: string) {
  try {
    wx.setStorageSync(key, value);
  } catch {
    // 存储失败静默
  }
}

export function removeStorage(key: string) {
  try {
    wx.removeStorageSync(key);
  } catch {
    // 忽略
  }
}
