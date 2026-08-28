import type { Stats, StatKey } from '../engine/types';

// 舆情反馈：根据上一题的结算结果，生成下一题开头的"灵活"过渡文案。
// 每次最多取两条，避免刷屏。

interface Rule {
  key: StatKey;
  threshold: number;
  line: string;
}

const RULES: Rule[] = [
  { key: 'hype', threshold: 10, line: '🔥 上一波操作出圈了，全网都在讨论你' },
  { key: 'hype', threshold: -8, line: '💤 有点没人聊你了，超话冷清得能听见回声' },
  { key: 'trust', threshold: 8, line: '🤝 路人缘变好，评论区难得一团和气' },
  { key: 'trust', threshold: -8, line: '🤬 评论区骂声一片，黑粉连夜产出新表情包' },
  { key: 'cash', threshold: 15, line: '💰 账户数字疯狂跳动，财务总监笑开了花' },
  { key: 'cash', threshold: -10, line: '💸 一笔大额支出到账，财务总监欲言又止' },
  { key: 'risk', threshold: 10, line: '⚖️ 监管的雷达哔哔作响，法务在加班' },
  { key: 'risk', threshold: -5, line: '✅ 风险警报暂时解除，法务终于睡了个好觉' },
];

export function reactionsFor(effects?: Partial<Stats> | null): string[] {
  if (!effects) return [];
  const out: string[] = [];
  for (const rule of RULES) {
    const delta = effects[rule.key] ?? 0;
    if (rule.threshold > 0 ? delta >= rule.threshold : delta <= rule.threshold) {
      out.push(rule.line);
    }
  }
  return out.slice(0, 2);
}
