// 结局图鉴（wx 存储版）
import { getStorage, setStorage } from './platform';

const KEY = 'hype-life-gallery-v1';

export function getUnlockedEndings(): string[] {
  try {
    const raw = getStorage(KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(arr) ? (arr as string[]) : [];
  } catch {
    return [];
  }
}

/** 记录结局，首次解锁返回 true */
export function recordEnding(id: string): boolean {
  const unlocked = getUnlockedEndings();
  if (unlocked.includes(id)) return false;
  unlocked.push(id);
  setStorage(KEY, JSON.stringify(unlocked));
  return true;
}
