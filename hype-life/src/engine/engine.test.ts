import { describe, expect, it } from 'vitest';
import {
  INITIAL_STATS,
  UNDO_LIMIT,
  WIN_ENDING_ID,
  applyEffects,
  checkEnding,
  choose,
  createInitialState,
  shuffle,
  undo,
} from './engine';
import type { Content, GameEvent } from './types';
import { CONTENT } from '../content/events';
import { ENDINGS, resolveEnding } from '../content/endings';
import { SPRITES, STAT_ICONS, PALETTE } from '../content/sprites';
import { reactionsFor } from '../content/reactions';

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

// ── 舆情反馈文案（灵活下一题的过渡） ───────────────────

describe('reactionsFor', () => {
  it('按涨跌生成对应反馈，最多两条', () => {
    const lines = reactionsFor({ hype: 15, trust: -10 });
    expect(lines.length).toBe(2);
    expect(lines[0]).toContain('全网');
    expect(lines[1]).toContain('评论区');
  });

  it('小幅波动不生成反馈', () => {
    expect(reactionsFor({ hype: 3, cash: -2 })).toEqual([]);
    expect(reactionsFor(undefined)).toEqual([]);
  });
});

// ── 时光机（回滚上一题） ───────────────────────────────

describe('undo', () => {
  it('回滚属性、卡牌与旗标，消耗一次次数', () => {
    const main = [
      {
        ...card('m0'),
        choices: [
          { text: 'a', effects: { hype: 10 }, flags: ['x'] },
          { text: 'b', effects: { trust: 10 } },
        ],
      },
      card('m1'),
    ];
    const content = buildContent(main);
    const start = createInitialState(content);
    let state = choose(start, content, content.events['m0'].choices[0]);
    expect(state.stats.hype).toBe(INITIAL_STATS.hype + 10);
    expect(state.flags).toContain('x');
    expect(state.currentEventId).toBe('m1');

    state = undo(state);
    expect(state.stats.hype).toBe(INITIAL_STATS.hype);
    expect(state.flags).not.toContain('x');
    expect(state.currentEventId).toBe('m0');
    expect(state.undoLeft).toBe(UNDO_LIMIT - 1);

    // 换个选法：这次走另一条路
    state = choose(state, content, content.events['m0'].choices[1]);
    expect(state.stats.trust).toBe(INITIAL_STATS.trust + 10);
    expect(state.currentEventId).toBe('m1');
  });

  it('次数用尽或无历史时不可回滚', () => {
    const main = [
      {
        ...card('m0'),
        choices: [{ text: 'a', effects: { hype: 1 } }],
      },
      card('m1'),
    ];
    const content = buildContent(main);
    let state = createInitialState(content);
    state = { ...state, undoLeft: 0 };
    const played = choose(state, content, content.events['m0'].choices[0]);
    expect(undo(played)).toBe(played); // 次数用尽，原样返回

    // 正常玩一题，回滚一次成功；历史耗尽后再回滚则原样返回
    const played2 = choose(
      createInitialState(content),
      content,
      content.events['m0'].choices[0],
    );
    const rewound = undo(played2);
    expect(rewound.undoLeft).toBe(UNDO_LIMIT - 1);
    expect(undo(rewound)).toBe(rewound);
  });

  it('死亡结局后不可回滚（结局已成定局）', () => {
    const main = [
      {
        ...card('m0'),
        choices: [{ text: '作死', effects: { risk: 100 } }],
      },
      card('m1'),
    ];
    const content = buildContent(main);
    let state = createInitialState(content);
    state = choose(state, content, content.events['m0'].choices[0]);
    expect(state.endingId).toBe('blocked');
    expect(undo(state)).toBe(state);
  });
});

// ── 状态条件抽卡（灵活下一题） ─────────────────────────

describe('支线卡 when 条件', () => {
  const whenCard = (id: string, when: (s: { stats: { hype: number } }) => boolean) => ({
    id,
    act: 2,
    year: 't',
    scene: 't',
    sprite: 'smug' as const,
    title: id,
    text: 't',
    when,
    choices: [{ text: 'a', effects: { hype: 1 } }],
  });

  function sim(mainAct: number, hype: number) {
    const main = [card('m0', mainAct), card('m1', mainAct)];
    const side = [
      whenCard('s_hot', (s) => s.stats.hype >= 70),
      whenCard('s_calm', (s) => s.stats.hype < 70),
    ];
    const content = buildContent(main, side);
    let state = createInitialState(content, () => 0);
    state = {
      ...state,
      stats: { ...state.stats, hype },
    };
    // 连打两张主线卡：第二张之后才会插播支线
    state = choose(state, content, content.events['m0'].choices[0]);
    state = choose(state, content, content.events['m1'].choices[0]);
    return state.currentEventId;
  }

  it('热度高抽到热度卡，热度低抽到平静卡', () => {
    expect(sim(2, 80)).toBe('s_hot');
    expect(sim(2, 20)).toBe('s_calm');
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
