// 引擎核心类型：引擎不认识具体剧情，只认识这些结构。

export type StatKey = 'hype' | 'trust' | 'cash' | 'risk';

export type Stats = Record<StatKey, number>;

export type SpriteKey =
  | 'student'
  | 'smug'
  | 'panic'
  | 'suit'
  | 'bell'
  | 'melon'
  | 'rich';

export interface Choice {
  text: string;
  /** 对四维属性的增减，范围外自动钳制到 0~100 */
  effects?: Partial<Stats>;
  /** 直连的下一张事件卡（连锁剧情），插队到队列最前 */
  nextEventId?: string;
  /** 选择后打的旗标，用于结局结算与名场面回顾 */
  flags?: string[];
  /** 立即触发的结局（如"再吃一根香蕉"直接吃进医院），跳过常规结算 */
  endingId?: string;
  /** 选择后的反馈语，显示在下一张卡顶部 */
  resultText?: string;
}

export interface GameEvent {
  id: string;
  /** 幕数 1~5 */
  act: number;
  /** 展示用的年份/时间，如 "2007" 或 "2026.08" */
  year: string;
  /** 场景名，如 "高三教室" */
  scene: string;
  sprite: SpriteKey;
  title: string;
  text: string;
  /** 主线卡（按顺序推进剧情）；缺省为支线卡（按规则插播） */
  mainline?: boolean;
  choices: Choice[];
}

export interface Content {
  events: Record<string, GameEvent>;
  /** 主线卡 id，按剧情顺序 */
  mainline: string[];
  /** 支线卡 id 池 */
  side: string[];
}

export interface GameState {
  stats: Stats;
  currentEventId: string | null;
  seenIds: string[];
  flags: string[];
  /** 连锁卡队列，先进先出 */
  queue: string[];
  /** 已消耗的主线卡数（指向 mainline 中下一张的下标） */
  mainIndex: number;
  /** 洗好的支线卡顺序 */
  sideOrder: string[];
  /** 支线发牌指针 */
  sideIndex: number;
  /** 上一次在主线第几张卡时插播了支线，防止同一位置连插 */
  lastSideAtMain: number;
  cardsPlayed: number;
  lastEffects: Partial<Stats> | null;
  toast: string | null;
  endingId: string | null;
}
