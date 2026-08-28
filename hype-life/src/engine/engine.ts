import type { Choice, Content, GameState, Stats, StatKey } from './types';

export const STAT_KEYS: StatKey[] = ['hype', 'trust', 'cash', 'risk'];

/** 主线走完且没触发死亡结局时的胜利结局 */
export const WIN_ENDING_ID = 'ipo';

/** 每局可用的"时光机"（回滚上一题）次数 */
export const UNDO_LIMIT = 3;

export const INITIAL_STATS: Stats = { hype: 30, trust: 65, cash: 30, risk: 10 };

export const clampStat = (n: number): number =>
  Math.max(0, Math.min(100, Math.round(n)));

export function applyEffects(stats: Stats, effects?: Partial<Stats>): Stats {
  const next = { ...stats };
  if (!effects) return next;
  for (const k of STAT_KEYS) {
    const delta = effects[k];
    if (delta !== undefined) next[k] = clampStat(next[k] + delta);
  }
  return next;
}

/** 死亡结局判定。风险优先——最戏剧化的死法不该被其他结局截胡。 */
export function checkEnding(stats: Stats): string | null {
  if (stats.risk >= 100) return 'blocked';
  if (stats.cash <= 0) return 'broke';
  if (stats.hype <= 0) return 'forgotten';
  if (stats.trust <= 0) return 'enemy';
  return null;
}

export function shuffle<T>(
  arr: readonly T[],
  rand: () => number = Math.random,
): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function createInitialState(
  content: Content,
  rand: () => number = Math.random,
): GameState {
  const first = content.mainline[0];
  if (!first) throw new Error('mainline 不能为空');
  return {
    stats: { ...INITIAL_STATS },
    currentEventId: first,
    seenIds: [first],
    flags: [],
    queue: [],
    mainIndex: 1,
    sideOrder: shuffle(content.side, rand),
    sideIndex: 0,
    lastSideAtMain: -1,
    cardsPlayed: 0,
    lastEffects: null,
    toast: null,
    endingId: null,
    history: [],
    undoLeft: UNDO_LIMIT,
  };
}

function currentMainAct(state: GameState, content: Content): number {
  const lastIdx = Math.min(state.mainIndex, content.mainline.length) - 1;
  const id = content.mainline[lastIdx];
  return id ? (content.events[id]?.act ?? 1) : 1;
}

/** 从支线池抽下一张当前幕可用、且满足自身 when 条件的卡；没有则返回 null。会就地修改传入的副本。 */
function drawSide(state: GameState, content: Content): string | null {
  const act = currentMainAct(state, content);
  for (let i = state.sideIndex; i < state.sideOrder.length; i++) {
    const ev = content.events[state.sideOrder[i]];
    if (ev && ev.act <= act && (!ev.when || ev.when(state))) {
      const picked = state.sideOrder[i];
      state.sideOrder[i] = state.sideOrder[state.sideIndex];
      state.sideOrder[state.sideIndex] = picked;
      state.sideIndex += 1;
      return picked;
    }
  }
  return null;
}

/** 推进到下一张卡。会就地修改传入的副本；返回 null 表示主线走完。 */
function advance(s: GameState, content: Content): string | null {
  if (s.queue.length > 0) return s.queue.shift()!;
  // 每推进 2 张主线卡后插播 1 张支线卡，同一位置不重复插播
  if (
    s.mainIndex >= 2 &&
    s.mainIndex % 2 === 0 &&
    s.lastSideAtMain < s.mainIndex
  ) {
    const sideId = drawSide(s, content);
    if (sideId) {
      s.lastSideAtMain = s.mainIndex;
      return sideId;
    }
  }
  const nextMain = content.mainline[s.mainIndex];
  if (!nextMain) return null;
  s.mainIndex += 1;
  return nextMain;
}

export function choose(
  state: GameState,
  content: Content,
  choice: Choice,
): GameState {
  if (state.endingId || state.currentEventId === null) return state;

  // 时光机快照：记录选择前的局面（不嵌套 history），栈深 UNDO_LIMIT
  const snapshot: GameState = {
    ...state,
    history: [],
    lastEffects: null,
    toast: null,
  };

  const s: GameState = {
    ...state,
    stats: applyEffects(state.stats, choice.effects),
    flags: choice.flags ? [...state.flags, ...choice.flags] : state.flags,
    queue: [...state.queue],
    seenIds: [...state.seenIds],
    sideOrder: [...state.sideOrder],
    history: [...state.history, snapshot].slice(-UNDO_LIMIT),
    lastEffects: choice.effects ?? {},
    toast: choice.resultText ?? null,
    cardsPlayed: state.cardsPlayed + 1,
  };
  if (choice.nextEventId) s.queue.unshift(choice.nextEventId);

  // 选项可直接定死结局（如"吃进医院"），否则按属性结算
  const death = choice.endingId ?? checkEnding(s.stats);
  if (death) {
    s.endingId = death;
    s.currentEventId = null;
    return s;
  }

  const next = advance(s, content);
  if (next === null) {
    s.endingId = WIN_ENDING_ID;
    s.currentEventId = null;
    return s;
  }
  s.currentEventId = next;
  s.seenIds = [...s.seenIds, next];
  return s;
}

/** 时光机：回滚到上一题选择前的局面，消耗一次机会 */
export function undo(state: GameState): GameState {
  if (
    state.endingId ||
    state.currentEventId === null ||
    state.undoLeft <= 0 ||
    state.history.length === 0
  ) {
    return state;
  }
  const prev = state.history[state.history.length - 1];
  return {
    ...prev,
    history: state.history.slice(0, -1),
    undoLeft: state.undoLeft - 1,
    toast: '↩ 时光机启动：这一题，换个选法。',
    lastEffects: null,
  };
}
