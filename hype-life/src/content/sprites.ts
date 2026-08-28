import type { SpriteKey } from '../engine/types';

// 代码内嵌像素画：调色板 + 字符矩阵，零外部图片素材。
// '.' 为透明；其余字符查 PALETTE。测试会校验矩阵尺寸。

export const PALETTE: Record<string, string> = {
  k: '#1a1c2c', // 描边深色
  h: '#29366f', // 头发
  s: '#ffcd75', // 皮肤/金
  w: '#f4f4f4', // 白
  e: '#29366f', // 西装
  b: '#3b5dc9', // 蓝色卫衣
  r: '#b13e53', // 领带/红
  o: '#ef7d57', // 橙（火焰）
  y: '#a7f070', // 绿（笑脸）
  c: '#73eff7', // 青（汗滴/彩纸）
  n: '#f7e26b', // 香蕉黄
};

// 头部 7 行（发顶到眼镜），所有表情共用
const HEAD_TOP = [
  '................',
  '....kkkkkkkk....',
  '...khhhhhhhhk...',
  '..khhhhhhhhhhk..',
  '..khhsssssshhk..',
  '..khsssssssshk..',
  '..kskwksskwksk..', // 眼镜
];
const CHEEKS = '..kssssssssssk..';
const CHIN = '...kssssssssk...';
const NECK = '....kksssskk....';

// 嘴型：中排 10 格（cols 3-12）
const MOUTHS = {
  neutral: 'sssskkssss', // 抿嘴
  smug: 'sssssskkss', // 右侧坏笑
  panic: 'ssskkkksss', // 大张嘴
  melon: 'sskknnnnss', // 叼着香蕉
};

const SUIT = [
  '..eeeewwwweeee..',
  '..eeeewrrweeee..',
  '..eeeewrrweeee..',
  '..eeeeewweeeee..',
];
const SUIT_BOTTOM = '..eeeeeeeeeeee..';
const CASUAL = [
  '..bbbbwwwwbbbb..',
  '..bbbbwwwwbbbb..',
  '..bbbbwkkwbbbb..',
  '..bbbbbbbbbbbb..',
];
const CASUAL_BOTTOM = '..bbbbbbbbbbbb..';
// 金色西装（收藏家/讲师等富豪结局）
const GOLD = [
  '..sssswwwwssss..',
  '..sssswrrwssss..',
  '..sssswrrwssss..',
  '..ssssswwsssss..',
];
const GOLD_BOTTOM = '..ssssssssssss..';

function face(mouth: string, sweat = false): string[] {
  const cheeks = sweat ? '..ksssssssssskc.' : CHEEKS;
  return [...HEAD_TOP, cheeks, `..k${mouth}k..`, CHIN, NECK];
}

function assemble(mouth: string, outfit: string[], bottom: string, sweat = false): string[] {
  return [...face(mouth, sweat), ...outfit, bottom];
}

/** 头顶加彩纸（敲钟用） */
function withConfetti(base: string[]): string[] {
  const rows = [...base];
  rows[0] = '....s...s...s...';
  rows[1] = '.c..kkkkkkkk...y';
  return rows;
}

export const SPRITES: Record<SpriteKey, string[]> = {
  student: assemble(MOUTHS.neutral, CASUAL, CASUAL_BOTTOM),
  suit: assemble(MOUTHS.neutral, SUIT, SUIT_BOTTOM),
  smug: assemble(MOUTHS.smug, SUIT, SUIT_BOTTOM),
  panic: assemble(MOUTHS.panic, SUIT, SUIT_BOTTOM, true),
  melon: assemble(MOUTHS.melon, SUIT, SUIT_BOTTOM),
  bell: withConfetti(assemble(MOUTHS.smug, SUIT, SUIT_BOTTOM)),
  rich: assemble(MOUTHS.smug, GOLD, GOLD_BOTTOM),
};

/** 四维属性小图标（8x8） */
export const STAT_ICONS: Record<string, string[]> = {
  hype: [
    '...o....',
    '...oo...',
    '..ooo...',
    '..oooo..',
    '.ooooo..',
    '.oooooo.',
    '.ooyooo.',
    '..oyoo..',
  ],
  trust: [
    '.yyyyyy.',
    'y......y',
    'y.w..w.y',
    'y......y',
    'y.wwww.y',
    'y......y',
    '.yyyyyy.',
    '........',
  ],
  cash: [
    '..ssss..',
    '.ssssss.',
    'ssswwsss',
    'sswwwwss',
    'sswwwwss',
    'ssswwsss',
    '.ssssss.',
    '..ssss..',
  ],
  risk: [
    '....rr..',
    '...rr...',
    '..rr....',
    '.rrrrr..',
    '...rr...',
    '..rr....',
    '.rr.....',
    'rr......',
  ],
};
