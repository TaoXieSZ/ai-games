import { describe, expect, it } from 'vitest';
import {
  INITIAL_STATS,
  WIN_ENDING_ID,
  applyEffects,
  checkEnding,
  choose,
  createInitialState,
  shuffle,
} from './engine';
import type { Content, GameEvent } from './types';
import { CONTENT } from '../content/events';
import { ENDINGS, resolveEnding } from '../content/endings';
import { SPRITES, STAT_ICONS, PALETTE } from '../content/sprites';

// ── 数值 ─────────────────────────────────────────────

describe('applyEffects', () => {
  it('正常增减', () => {
    const next = applyEffects(INITIAL_STATS, { hype: 15, trust: -10 });
    expect(next.hype).toBe(45);
    expect(next.trust).toBe(INITIAL_STATS.trust - 10);
    expect(next.cash).toBe(INITIAL_STATS.cash);
  });

  it('钳制到 0~100', () => {
    const up = applyEffects(
      { hype: 90, trust: 50, cash: 50, risk: 95 },
      { hype: 50, risk: 50 },
    );
    expect(up.hype).toBe(100);
    expect(up.risk).toBe(100);
    const down = applyEffects(
      { hype: 5, trust: 50, cash: 3, risk: 50 },
      { hype: -50, cash: -50 },
    );
    expect(down.hype).toBe(0);
    expect(down.cash).toBe(0);
  });
});

describe('checkEnding', () => {
  it('风险优先于其他死亡结局', () => {
    expect(
      checkEnding({ hype: 0, trust: 0, cash: 0, risk: 100 }),
    ).toBe('blocked');
  });

  it('各属性边界触发对应结局', () => {
    expect(checkEnding({ hype: 0, trust: 50, cash: 50, risk: 50 })).toBe(
      'forgotten',
    );
    expect(checkEnding({ hype: 50, trust: 0, cash: 50, risk: 50 })).toBe(
      'enemy',
    );
    expect(checkEnding({ hype: 50, trust: 50, cash: 0, risk: 50 })).toBe(
      'broke',
    );
    expect(checkEnding({ hype: 50, trust: 50, cash: 50, risk: 99 })).toBeNull();
  });
});

// ── 发牌与连锁 ────────────────────────────────────────

function buildContent(main: GameEvent[], side: GameEvent[] = []): Content {
  const all = [...main, ...side];
  return {
    events: Object.fromEntries(all.map((e) => [e.id, e])),
    mainline: main.map((e) => e.id),
    side: side.map((e) => e.id),
  };
}

function card(id: string, act = 1): GameEvent {
  return {
    id,
    act,
    year: 'test',
    scene: 'test',
    sprite: 'smug',
    title: id,
    text: 'text',
    mainline: true,
    choices: [{ text: 'a', effects: { hype: 1 } }],
  };
}

describe('发牌', () => {
  it('每推进 2 张主线卡插播 1 张可用支线卡', () => {
    const actOf = (i: number) => (i < 2 ? 1 : i < 4 ? 2 : 3);
    const main = Array.from({ length: 5 }, (_, i) => card(`m${i}`, actOf(i)));
    const side = [card('s0', 1), card('s1', 2), card('s2', 3)];
    const content = buildContent(main, side);
    let state = createInitialState(content);
    const order: string[] = [state.currentEventId!];

    for (let i = 0; i < 9; i++) {
      state = choose(state, content, state.currentEventId ? content.events[state.currentEventId].choices[0] : main[0].choices[0]);
      if (!state.currentEventId) break;
      order.push(state.currentEventId);
    }

    // 主线顺序保持，支线只插在主线第 2、4 张之后
    expect(order).toEqual([
      'm0',
      'm1',
      's0',
      'm2',
      'm3',
      's1',
      'm4',
      // m4 是第 5 张主线（mainIndex=5，奇数）→ 无插播，结束
    ]);
  });

  it('支线卡不会提前泄露后续幕的内容', () => {
    const main = Array.from({ length: 4 }, (_, i) => card(`m${i}`, i + 1));
    const side = [card('s_late', 4), card('s_early', 1)];
    const content = buildContent(main, side);
    let state = createInitialState(content, () => 0.999); // 洗牌后 s_late 在前
    state = choose(state, content, content.events['m0'].choices[0]);
    state = choose(state, content, content.events['m1'].choices[0]);
    // 第 2 张主线后插播：s_late 属于第 4 幕但当前只到第 2 幕，必须跳过
    expect(state.currentEventId).toBe('s_early');
  });

  it('连锁卡插队到主线之前', () => {
    const chainCard = card('chain');
    const main = [
      { ...card('m0'), choices: [{ text: 'a', nextEventId: 'chain' }] },
      card('m1'),
    ];
    const content = buildContent(main, [chainCard]);
    let state = createInitialState(content);
    state = choose(state, content, content.events['m0'].choices[0]);
    expect(state.currentEventId).toBe('chain');
    state = choose(state, content, chainCard.choices[0]);
    expect(state.currentEventId).toBe('m1');
  });

  it('主线走完触发胜利结局', () => {
    const main = [card('m0'), card('m1')];
    const content = buildContent(main);
    let state = createInitialState(content);
    state = choose(state, content, content.events['m0'].choices[0]);
    expect(state.endingId).toBeNull();
    state = choose(state, content, content.events['m1'].choices[0]);
    expect(state.endingId).toBe(WIN_ENDING_ID);
  });

  it('选项可以直接触发指定结局', () => {
    const main = [
      {
        ...card('m0'),
        choices: [
          { text: '作死', endingId: 'stomach' },
          { text: '怂', effects: { trust: 1 } },
        ],
      },
      card('m1'),
    ];
    const content = buildContent(main);
    let state = createInitialState(content);
    state = choose(state, content, content.events['m0'].choices[0]);
    expect(state.endingId).toBe('stomach');
    expect(state.currentEventId).toBeNull();
  });
});

// ── 结局变体结算 ──────────────────────────────────────

describe('resolveEnding', () => {
  it('终章名场面集齐 → 流量之神', () => {
    const flags = [
      'teaser_love',
      'essay',
      'essay_backlash',
      'bride_lawsuit',
      'banana',
    ];
    expect(resolveEnding('ipo', flags)).toBe('flowgod');
  });

  it('长文双旗标 → 热搜作家；捐赠 → 收藏家；湖心 → 讲师', () => {
    expect(resolveEnding('ipo', ['essay', 'essay_backlash'])).toBe('writer');
    expect(resolveEnding('ipo', ['museum'])).toBe('art');
    expect(resolveEnding('ipo', ['huxin_flex'])).toBe('lecture');
  });

  it('零旗标通关 → 无名富翁', () => {
    expect(resolveEnding('ipo', [])).toBe('nobody');
  });

  it('风险死亡 + 追债旗标 → 下周回国；普通死亡直通', () => {
    expect(resolveEnding('blocked', ['debt'])).toBe('nextweek');
    expect(resolveEnding('blocked', [])).toBe('blocked');
    expect(resolveEnding('enemy', ['debt'])).toBe('enemy');
  });
});

// ── 内容完整性 ────────────────────────────────────────

describe('内容校验', () => {
  it('连锁卡不得出现在主线列表（否则会演两遍）', () => {
    const chained = new Set(
      Object.values(CONTENT.events).flatMap((e) =>
        e.choices.map((c) => c.nextEventId).filter((id): id is string => !!id),
      ),
    );
    for (const id of CONTENT.mainline) {
      expect(chained.has(id), `${id} 既是主线又被连锁引用`).toBe(false);
    }
  });

  it('选项直通结局时目标结局必须存在', () => {
    for (const ev of Object.values(CONTENT.events)) {
      for (const c of ev.choices) {
        if (c.endingId) {
          expect(ENDINGS[c.endingId], `${ev.id} 引用未知结局 ${c.endingId}`).toBeTruthy();
        }
      }
    }
  });

  it('每一幕都有足够的支线卡', () => {
    for (const act of [1, 2, 3, 4, 5]) {
      const n = CONTENT.side.filter(
        (id) => CONTENT.events[id].act === act,
      ).length;
      expect(n, `第 ${act} 幕支线卡数量`).toBeGreaterThanOrEqual(2);
    }
  });

  it('每张事件卡至少三个选项', () => {
    for (const [id, ev] of Object.entries(CONTENT.events)) {
      expect(ev.choices.length, `${id} 选项数`).toBeGreaterThanOrEqual(3);
    }
  });

  it('每幕的主线脊柱不能缺故事', () => {
    const minByAct: Record<number, number> = { 1: 4, 2: 3, 3: 3, 4: 4, 5: 3 };
    for (const [actStr, min] of Object.entries(minByAct)) {
      const act = Number(actStr);
      const n = CONTENT.mainline.filter(
        (id) => CONTENT.events[id].act === act,
      ).length;
      expect(n, `第 ${act} 幕主线卡数量`).toBeGreaterThanOrEqual(min);
    }
  });

  it('所有连锁/主线/支线引用的卡都存在', () => {
    const { events, mainline, side } = CONTENT;
    for (const id of [...mainline, ...side]) {
      expect(events[id], `缺失事件卡 ${id}`).toBeTruthy();
    }
    for (const ev of Object.values(events)) {
      for (const c of ev.choices) {
        if (c.nextEventId) {
          expect(events[c.nextEventId], `${ev.id} 连锁到不存在的 ${c.nextEventId}`).toBeTruthy();
        }
      }
    }
    expect(mainline.length).toBeGreaterThanOrEqual(15);
    expect(mainline.length + side.length).toBeGreaterThanOrEqual(20);
  });

  it('像素矩阵尺寸正确且字符都在调色板里', () => {
    for (const [key, rows] of Object.entries(SPRITES)) {
      expect(rows.length, `${key} 行数`).toBe(16);
      for (const row of rows) {
        expect(row.length, `${key} 行宽`).toBe(16);
      }
    }
    for (const [key, rows] of Object.entries(STAT_ICONS)) {
      expect(rows.length, `${key} 行数`).toBe(8);
      for (const row of rows) {
        expect(row.length, `${key} 行宽`).toBe(8);
      }
      for (const row of rows) {
        for (const ch of row) {
          expect(PALETTE[ch] !== undefined || ch === '.', `${key} 未知字符 '${ch}'`).toBe(true);
        }
      }
    }
  });
});

describe('shuffle', () => {
  it('保持元素集合不变', () => {
    const arr = [1, 2, 3, 4, 5];
    expect(shuffle(arr, () => 0.5).sort()).toEqual(arr);
  });
});
