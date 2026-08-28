import { create } from 'zustand';
import { choose, createInitialState } from '../engine/engine';
import type { GameState } from '../engine/types';
import { CONTENT } from '../content/events';
import { resolveEnding } from '../content/endings';
import { sfx } from '../sfx/sfx';
import { recordEnding } from './gallery';

const SAVE_KEY = 'hype-life-save-v1';

type Screen = 'title' | 'game';

interface GameStore {
  screen: Screen;
  state: GameState | null;
  /** 本局结局是否为首次解锁（结局页显示"新结局收录"） */
  lastEndingNew: boolean;
  startNew: () => void;
  continueGame: () => void;
  chooseIndex: (i: number) => void;
  restart: () => void;
  toTitle: () => void;
}

function loadSave(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState;
    if (!parsed?.currentEventId || !CONTENT.events[parsed.currentEventId]) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function persist(state: GameState | null) {
  try {
    if (state && !state.endingId && state.currentEventId) {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } else {
      localStorage.removeItem(SAVE_KEY);
    }
  } catch {
    // 无痕模式等场景存不了就算了
  }
}

/** 标题页判断"继续"按钮是否可用 */
export function peekSave(): GameState | null {
  return loadSave();
}

export const useGameStore = create<GameStore>((set) => ({
  screen: 'title',
  state: null,
  lastEndingNew: false,
  startNew: () => {
    const fresh = createInitialState(CONTENT);
    persist(fresh);
    set({ screen: 'game', state: fresh, lastEndingNew: false });
  },
  continueGame: () => {
    const saved = loadSave();
    if (saved) set({ screen: 'game', state: saved, lastEndingNew: false });
    else set(() => ({ screen: 'game', state: createInitialState(CONTENT) }));
  },
  chooseIndex: (i) => {
    set((s) => {
      if (!s.state?.currentEventId) return s;
      const ev = CONTENT.events[s.state.currentEventId];
      const choice = ev.choices[i];
      if (!choice) return s;
      const next = choose(s.state, CONTENT, choice);
      // 引擎给出基础结局，再按旗标升级为具体结局变体
      let lastEndingNew = s.lastEndingNew;
      if (next.endingId) {
        next.endingId = resolveEnding(next.endingId, next.flags);
        lastEndingNew = recordEnding(next.endingId);
      }
      persist(next);
      // 音效：选择音 + 属性涨跌音，结局另配
      sfx.choose();
      const deltas = Object.values(choice.effects ?? {});
      if (deltas.some((d) => d > 0)) sfx.up();
      else if (deltas.some((d) => d < 0)) sfx.down();
      return { state: next, lastEndingNew };
    });
  },
  restart: () => {
    const fresh = createInitialState(CONTENT);
    persist(fresh);
    set({ screen: 'game', state: fresh });
  },
  toTitle: () => set({ screen: 'title' }),
}));
