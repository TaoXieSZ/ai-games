// 小游戏专用状态层：与网页版 gameStore 同构，但用 wx 存储 + 自研轻量订阅。
// 引擎与内容层 100% 复用网页版代码。
import {
  choose,
  createInitialState,
  undo,
  UNDO_LIMIT,
} from '../../hype-life/src/engine/engine';
import type { GameState } from '../../hype-life/src/engine/types';
import { CONTENT } from '../../hype-life/src/content/events';
import { ENDINGS, resolveEnding } from '../../hype-life/src/content/endings';
import { sfx } from './audio';
import { getStorage, setStorage, removeStorage } from './platform';
import { recordEnding } from './gallery';

const SAVE_KEY = 'hype-life-save-v2';

export type Screen = 'title' | 'game' | 'ending';

export interface Store {
  screen: Screen;
  state: GameState | null;
  lastEndingNew: boolean;
}

let store: Store = { screen: 'title', state: null, lastEndingNew: false };
const listeners = new Set<() => void>();

export function getStore(): Store {
  return store;
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function set(patch: Partial<Store>) {
  store = { ...store, ...patch };
  listeners.forEach((fn) => fn());
}

function loadSave(): GameState | null {
  try {
    const raw = getStorage(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState;
    if (!parsed?.currentEventId || !CONTENT.events[parsed.currentEventId]) {
      return null;
    }
    parsed.history = Array.isArray(parsed.history) ? parsed.history : [];
    parsed.undoLeft =
      typeof parsed.undoLeft === 'number' ? parsed.undoLeft : UNDO_LIMIT;
    return parsed;
  } catch {
    return null;
  }
}

function persist(state: GameState | null) {
  if (state && !state.endingId && state.currentEventId) {
    setStorage(SAVE_KEY, JSON.stringify(state));
  } else {
    removeStorage(SAVE_KEY);
  }
}

export function startNew() {
  const fresh = createInitialState(CONTENT);
  persist(fresh);
  set({ screen: 'game', state: fresh, lastEndingNew: false });
}

export function continueGame() {
  const saved = loadSave();
  if (saved) set({ screen: 'game', state: saved, lastEndingNew: false });
  else set({ screen: 'game', state: createInitialState(CONTENT) });
}

export function chooseIndex(i: number) {
  const cur = store.state;
  if (!cur?.currentEventId) return;
  const ev = CONTENT.events[cur.currentEventId];
  const choice = ev.choices[i];
  if (!choice) return;
  const next = choose(cur, CONTENT, choice);
  let lastEndingNew = store.lastEndingNew;
  if (next.endingId) {
    next.endingId = resolveEnding(next.endingId, next.flags);
    lastEndingNew = recordEnding(next.endingId);
  }
  persist(next);
  sfx.play('choose');
  const deltas = Object.values(choice.effects ?? {});
  if (deltas.some((d) => d > 0)) sfx.play('up');
  else if (deltas.some((d) => d < 0)) sfx.play('down');
  if (next.endingId) {
    sfx.play(ENDINGS[next.endingId]?.isWin ? 'win' : 'lose');
  }
  set({ state: next, lastEndingNew });
}

export function undoGame() {
  if (!store.state) return;
  const next = undo(store.state);
  persist(next);
  sfx.play('choose');
  set({ state: next });
}

export function restart() {
  const fresh = createInitialState(CONTENT);
  persist(fresh);
  set({ screen: 'game', state: fresh, lastEndingNew: false });
}

export function toTitle() {
  set({ screen: 'title' });
}
