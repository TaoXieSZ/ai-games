// 结局图鉴：记录本机已解锁的结局（localStorage）。
const KEY = 'hype-life-gallery-v1';

export function getUnlockedEndings(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
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
  try {
    localStorage.setItem(KEY, JSON.stringify(unlocked));
  } catch {
    // 无痕模式存不了就算了
  }
  return true;
}
