// Canvas 即时模式渲染器：标题 / 卡牌 / 结局三屏。
// 每帧重建可点击区域，触摸命中后回调 store 动作。
import { ctx, W, H, getStorage } from './platform';
import { SPRITES, STAT_ICONS, PALETTE } from '../../hype-life/src/content/sprites';
import type { SpriteKey } from '../../hype-life/src/engine/types';
import { CONTENT } from '../../hype-life/src/content/events';
import {
  ENDINGS,
  FLAG_LABELS,
} from '../../hype-life/src/content/endings';
import { reactionsFor } from '../../hype-life/src/content/reactions';
import { getStore, startNew, continueGame, chooseIndex, undoGame, restart, toTitle } from './store';
import { getUnlockedEndings } from './gallery';
import { sfx } from './audio';

const C = {
  bg: '#1a1c2c',
  panel: '#29366f',
  deep: '#1f2a52',
  ink: '#f4f4f4',
  dim: '#94b0c2',
  lock: '#566c86',
  gold: '#ffcd75',
  hot: '#ef7d57',
  trust: '#73eff7',
  cash: '#ffcd75',
  risk: '#b13e53',
  blue: '#41a6f6',
};

const STAT_META: Record<string, { label: string; color: string }> = {
  hype: { label: '热度', color: C.hot },
  trust: { label: '信用', color: C.trust },
  cash: { label: '资金', color: C.cash },
  risk: { label: '风险', color: C.risk },
};

const ENDING_SPRITE: Record<string, SpriteKey> = {
  flowgod: 'bell',
  ipo: 'bell',
  writer: 'student',
  art: 'rich',
  lecture: 'rich',
  nobody: 'student',
  nextweek: 'panic',
  blocked: 'panic',
  broke: 'panic',
  forgotten: 'student',
  enemy: 'melon',
  stomach: 'melon',
};

const FONT = '"Fusion Pixel", monospace';

interface Btn {
  x: number;
  y: number;
  w: number;
  h: number;
  cb: () => void;
  /** 逻辑名，供冒烟测试精确定位（如 'start'、'choice:0'、'undo'） */
  label?: string;
}

let hit: Btn[] = [];
let scrollY = 0;
let expandedGallery = false;
let confirmExitAt = 0;

export function render() {
  hit = [];
  const { screen } = getStore();
  ctx.save();
  ctx.textBaseline = 'top';
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);
  if (screen === 'title') drawTitle();
  else if (screen === 'game') drawGame();
  else drawEnding();
  ctx.restore();
}

// ── 基础绘制 ─────────────────────────────────────────

function font(size: number, bold = false) {
  ctx.font = `${bold ? 'bold ' : ''}${size}px ${FONT}`;
}

function wrap(text: string, maxW: number, size: number, bold = false): string[] {
  font(size, bold);
  const lines: string[] = [];
  let line = '';
  for (const ch of text) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = ch === ' ' ? '' : ch;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function text(
  str: string,
  x: number,
  y: number,
  opts: { size?: number; color?: string; align?: CanvasTextAlign; bold?: boolean } = {},
): number {
  const { size = 14, color = C.ink, align = 'left', bold = false } = opts;
  font(size, bold);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(str, x, y);
  ctx.textAlign = 'left';
  return size * 1.4;
}

function panel(x: number, y: number, w: number, h: number, borderColor = C.ink) {
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(x + 5, y + 5, w, h);
  ctx.fillStyle = C.panel;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 3;
  ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
}

function button(
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  cb: () => void,
  opts: { bg?: string; color?: string; border?: string; dashed?: boolean; size?: number; id?: string } = {},
) {
  const { bg = C.blue, color = C.ink, border = '', dashed = false, size = 14, id } = opts;
  if (bg !== 'transparent') {
    ctx.fillStyle = bg;
    ctx.fillRect(x, y, w, h);
  }
  ctx.strokeStyle = border || bg;
  ctx.lineWidth = 2;
  if (dashed) ctx.setLineDash([4, 3]);
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  ctx.setLineDash([]);
  const lines = wrap(label, w - 16, size);
  font(size);
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  const lh = size * 1.35;
  let ty = y + (h - lines.length * lh) / 2 + 2;
  for (const line of lines) {
    ctx.fillText(line, x + w / 2, ty);
    ty += lh;
  }
  ctx.textAlign = 'left';
  hit.push({ x, y, w, h, cb, label: id });
}

function sprite(key: SpriteKey, cx: number, y: number, scale: number) {
  const rows = SPRITES[key];
  const size = rows.length * scale;
  const x = cx - size / 2;
  ctx.fillStyle = C.deep;
  ctx.fillRect(x - 4, y - 4, size + 8, size + 8);
  for (let r = 0; r < rows.length; r++) {
    for (let cI = 0; cI < rows[r].length; cI++) {
      const color = PALETTE[rows[r][cI]];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x + cI * scale, y + r * scale, scale, scale);
    }
  }
  return size;
}

function wrapTextLines(str: string, maxW: number, size: number, bold = false): string[] {
  return wrap(str, maxW, size, bold);
}

function statIcon(key: string, x: number, y: number, scale = 2) {
  const rows = STAT_ICONS[key];
  for (let r = 0; r < rows.length; r++) {
    for (let cI = 0; cI < rows[r].length; cI++) {
      const color = PALETTE[rows[r][cI]];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x + cI * scale, y + r * scale, scale, scale);
    }
  }
}

// ── 标题页 ───────────────────────────────────────────

function drawTitle() {
  const cw = Math.min(W - 40, 480);
  const x0 = (W - cw) / 2;
  let y = 20 - scrollY;
  y += sprite('smug', W / 2, y, 7) + 18;
  // 标题：阴影 → 描红 → 主体
  font(42, true);
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillText('热搜人生', W / 2 + 4, y + 4);
  ctx.fillStyle = C.risk;
  ctx.fillText('热搜人生', W / 2 + 2, y + 2);
  ctx.fillStyle = C.gold;
  ctx.fillText('热搜人生', W / 2, y);
  ctx.textAlign = 'left';
  y += 56;
  y += text('HYPE LIFE · 流量炼金术士模拟器', W / 2, y, { size: 12, color: C.dim, align: 'center' });
  y += 10;

  const tagLines = wrapTextLines(
    '从三本线到纳斯达克。你有四条命：热度、信用、资金、风险——任何一条归零，人生杀青。',
    cw - 28,
    14,
  );
  panel(x0 + 20, y, cw - 40, tagLines.length * 22 + 18);
  let ty = y + 9;
  for (const line of tagLines) {
    text(line, x0 + 34, ty, { size: 14 });
    ty += 22;
  }
  y += tagLines.length * 22 + 18 + 18;

  const hasSave = !!wxHasSave();
  if (hasSave) {
    button(x0 + 40, y, cw - 80, 44, '继续上辈子', continueGame, { bg: C.gold, color: C.bg, id: 'continue' });
    y += 54;
  }
  button(x0 + 40, y, cw - 80, 44, hasSave ? '重新投胎' : '开始人生', startNew, { bg: C.blue, id: 'start' });
  y += 60;

  // 结局图鉴
  const unlocked = getUnlockedEndings();
  const all = Object.values(ENDINGS);
  const expandLabel = `结局图鉴 ${unlocked.length}/${all.length}（点击${expandedGallery ? '收起' : '展开'}）`;
  button(x0 + 40, y, cw - 80, 26, expandLabel, () => {
    expandedGallery = !expandedGallery;
  }, { bg: 'transparent', color: C.dim, border: C.lock, size: 12, id: 'gallery' });
  y += 32;

  if (expandedGallery) {
    const cols = 4;
    const gw = (cw - 40 - (cols - 1) * 6) / cols;
    all.forEach((e, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const gx = x0 + 20 + col * (gw + 6);
      const gy = y + row * 34;
      const got = unlocked.includes(e.id);
      ctx.fillStyle = got ? (e.isWin ? C.hot : C.panel) : 'rgba(0,0,0,0.25)';
      ctx.fillRect(gx, gy, gw, 28);
      ctx.strokeStyle = got ? (e.isWin ? C.hot : C.gold) : C.lock;
      ctx.lineWidth = 2;
      ctx.strokeRect(gx + 1, gy + 1, gw - 2, 26);
      const label = got ? e.title : '？？？';
      font(11);
      ctx.fillStyle = got ? (e.isWin ? C.hot : C.gold) : C.lock;
      ctx.textAlign = 'center';
      ctx.fillText(label, gx + gw / 2, gy + 9);
      ctx.textAlign = 'left';
    });
    y += Math.ceil(all.length / cols) * 34 + 12;
  }

  y += text('GitHub: TaoXieSZ/ai-games', W / 2, y, { size: 12, color: C.dim, align: 'center' });
  y += 6;
  const disLines = wrapTextLines('本游戏纯属虚构讽刺作品，人物与事件均为艺术加工，请勿对号入座。', cw - 40, 11);
  for (const line of disLines) {
    y += text(line, W / 2, y, { size: 11, color: C.dim, align: 'center' });
  }
  clampScroll(y + 16);
}

function wxHasSave(): boolean {
  // 标题页只需知道有没有存档：读一次存储
  try {
    if (getStore().state) return true;
    return !!getStorage('hype-life-save-v2');
  } catch {
    return false;
  }
}

// ── 游戏页 ───────────────────────────────────────────

function drawGame() {
  const { state } = getStore();
  if (!state?.currentEventId) return;
  const event = CONTENT.events[state.currentEventId];
  const confirmExit = Date.now() < confirmExitAt;
  let y = 10 - scrollY;

  // 顶栏
  button(10, y, confirmExit ? 96 : 70, 26, confirmExit ? '确认退出?' : '✕ 退出', () => {
    if (Date.now() < confirmExitAt) {
      confirmExitAt = 0;
      toTitle();
    } else {
      confirmExitAt = Date.now() + 3000;
      render();
    }
  }, { bg: C.panel, border: confirmExit ? C.risk : C.dim, color: confirmExit ? C.risk : C.ink, size: 12, id: 'exit' });
  text('热搜人生', W / 2, y + 5, { size: 14, color: C.gold, align: 'center' });
  button(W - 44, y, 34, 26, sfx.muted ? '🔇' : '🔊', () => {
    sfx.toggle();
  }, { bg: C.panel, border: C.dim, size: 12, id: 'mute' });
  y += 36;

  // 四维属性 2x2
  const bw = (W - 32 - 8) / 2;
  (['hype', 'trust', 'cash', 'risk'] as const).forEach((key, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 16 + col * (bw + 8);
    const sy = y + row * 34;
    ctx.fillStyle = C.panel;
    ctx.fillRect(x, sy, bw, 30);
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, sy + 1, bw - 2, 28);
    statIcon(key, x + 6, sy + 7);
    text(STAT_META[key].label, x + 26, sy + 4, { size: 12, color: C.dim });
    const pct = state.stats[key] / 100;
    const trackW = bw - 34;
    ctx.fillStyle = C.bg;
    ctx.fillRect(x + 28, sy + 19, trackW, 6);
    ctx.fillStyle = STAT_META[key].color;
    ctx.fillRect(x + 28, sy + 19, Math.round(trackW * pct), 6);
    const delta = state.lastEffects?.[key];
    if (delta) {
      text(`${delta > 0 ? '+' : ''}${delta}`, x + bw - 30, sy + 4, {
        size: 12,
        color: delta > 0 ? C.trust : C.risk,
        align: 'right',
      });
    }
  });
  y += 78;

  // 卡牌面板
  const px = 14;
  const pw = W - 28;
  const pad = 12;
  let cy = y + 6;
  // 先计算整卡高度（为面板背景）， dry-run：
  const badgesH = 24;
  const toastH = state.toast ? wrapTextLines(state.toast, pw - pad * 2 - 12, 13).length * 19 + 12 : 0;
  const reactions = reactionsFor(state.lastEffects);
  const reactionsH = reactions.length > 0 ? reactions.length * 19 + 10 : 0;
  const titleH = 34;
  const spriteH = 16 * 5 + 16;
  const textLines = wrapTextLines(event.text, pw - pad * 2, 14);
  const textH = textLines.length * 21 + 6;
  const choiceHs = event.choices.map((c) => Math.max(42, wrapTextLines(c.text, pw - pad * 2 - 20, 14).length * 19 + 16));
  const choicesH = choiceHs.reduce((a, b) => a + b + 8, 0) - 8;
  const undoH = 36;
  const cardH = badgesH + 8 + toastH + 6 + reactionsH + 6 + titleH + spriteH + textH + 8 + choicesH + 8 + undoH + pad * 2;

  panel(px, cy, pw, cardH);
  let ix = px + pad;
  let iy = cy + pad;
  const iw = pw - pad * 2;

  // 徽章行
  ctx.fillStyle = C.hot;
  ctx.fillRect(ix, iy, ctx.measureText(event.year).width + 40, 18);
  font(11);
  ctx.fillStyle = C.bg;
  ctx.fillText(event.year, ix + 5, iy + 3);
  ctx.fillStyle = C.dim;
  ctx.fillRect(ix + 52, iy, 90, 18);
  ctx.fillStyle = C.bg;
  ctx.fillText(event.scene, ix + 57, iy + 3);
  text(`第${event.act}幕 · ${state.mainIndex}/${CONTENT.mainline.length}`, px + pw - pad, iy + 3, { size: 11, color: C.dim, align: 'right' });
  iy += badgesH;

  if (state.toast) {
    const tls = wrapTextLines(state.toast, iw - 12, 13);
    ctx.fillStyle = C.deep;
    ctx.fillRect(ix, iy, iw, tls.length * 19 + 10);
    ctx.strokeStyle = C.dim;
    ctx.lineWidth = 1;
    ctx.strokeRect(ix + 0.5, iy + 0.5, iw - 1, tls.length * 19 + 9);
    ctx.fillStyle = C.cash;
    font(13);
    let ty2 = iy + 5;
    for (const line of tls) {
      ctx.fillText(line, ix + 6, ty2);
      ty2 += 19;
    }
    iy += toastH;
  }
  if (reactions.length > 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(ix, iy, iw, reactionsH);
    ctx.fillStyle = C.trust;
    ctx.fillRect(ix, iy, 3, reactionsH);
    font(12);
    ctx.fillStyle = C.dim;
    let ty3 = iy + 5;
    for (const r of reactions) {
      ctx.fillText(r, ix + 10, ty3);
      ty3 += 19;
    }
    iy += reactionsH;
  }
  iy += 4;
  text(event.title, ix, iy, { size: 24, color: C.gold, bold: true });
  iy += titleH;
  iy += sprite(event.sprite, W / 2, iy, 5) + 14;
  ctx.fillStyle = C.ink;
  font(14);
  for (const line of textLines) {
    ctx.fillText(line, ix, iy);
    iy += 21;
  }
  iy += 8;

  // 选项
  event.choices.forEach((c, i) => {
    const ch = choiceHs[i];
    const cls = wrapTextLines(c.text, iw - 20, 14);
    ctx.fillStyle = C.blue;
    ctx.fillRect(ix, iy, iw, ch);
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2;
    ctx.strokeRect(ix + 1, iy + 1, iw - 2, ch - 2);
    font(14);
    ctx.fillStyle = C.ink;
    let ly = iy + (ch - cls.length * 19) / 2 + 2;
    for (const line of cls) {
      ctx.fillText(line, ix + 10, ly);
      ly += 19;
    }
    hit.push({ x: ix, y: iy, w: iw, h: ch, cb: () => chooseIndex(i), label: `choice:${i}` });
    iy += ch + 8;
  });

  // 时光机
  const canUndo = state.undoLeft > 0 && state.history.length > 0;
  ctx.fillStyle = 'transparent';
  ctx.strokeStyle = canUndo ? C.lock : '#3a4460';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 3]);
  ctx.strokeRect(ix + 1, iy + 1, iw - 2, undoH - 2);
  ctx.setLineDash([]);
  font(13);
  ctx.fillStyle = canUndo ? C.dim : '#3a4460';
  ctx.textAlign = 'center';
  ctx.fillText(`↩ 时光机（剩 ${state.undoLeft} 次）`, ix + iw / 2, iy + 10);
  ctx.textAlign = 'left';
  if (canUndo) {
    hit.push({ x: ix, y: iy, w: iw, h: undoH, cb: undoGame, label: 'undo' });
  }
  iy += undoH;

  clampScroll(iy + 30);
  text('每个选择都算数 · 属性到 0 或 100 就杀青', W / 2, H - 24, { size: 11, color: C.dim, align: 'center' });
}

// ── 结局页 ───────────────────────────────────────────

function drawEnding() {
  const { state, lastEndingNew } = getStore();
  if (!state) return;
  const ending = ENDINGS[state.endingId ?? 'forgotten'] ?? ENDINGS.forgotten;
  const cw = Math.min(W - 28, 500);
  const px = (W - cw) / 2;
  let y = 20 - scrollY;

  y += text(ending.subtitle, W / 2, y, { size: 12, color: C.dim, align: 'center' });
  y += 4;
  y += text(ending.title, W / 2, y, { size: 36, color: C.gold, align: 'center', bold: true });
  y += 8;
  y += sprite(ENDING_SPRITE[ending.id] ?? 'smug', W / 2, y, 7) + 14;

  const inner = cw - 32;
  let iy = y;

  // 先算面板高度
  const textLines = wrapTextLines(ending.text, inner, 14);
  const scenes = state.flags.map((f) => FLAG_LABELS[f]).filter(Boolean);
  const statsH = 30;
  const actionsH = 56;
  const repoH = 30;
  const disH = 24;
  const newH = lastEndingNew ? 36 : 0;
  const scenesH = scenes.length > 0 ? 26 + Math.min(scenes.length, 20) * 21 + 10 : 0;
  const panelH = 16 + textLines.length * 21 + 10 + newH + scenesH + statsH + actionsH + repoH + disH + 16;

  panel(px, iy, cw, panelH, ending.isWin ? C.gold : C.ink);
  let ly = iy + 16;
  ctx.fillStyle = C.ink;
  font(14);
  for (const line of textLines) {
    ctx.fillText(line, px + 16, ly);
    ly += 21;
  }
  ly += 10;
  if (lastEndingNew) {
    ctx.strokeStyle = C.gold;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(px + 16, ly, cw - 32, 30);
    ctx.setLineDash([]);
    text('★ 新结局收录！图鉴已更新', W / 2, ly + 7, { size: 13, color: C.gold, align: 'center' });
  }
  ly += newH;
  if (scenes.length > 0) {
    ctx.fillStyle = C.deep;
    ctx.fillRect(px + 16, ly, cw - 32, 26 + Math.min(scenes.length, 20) * 21 + 8);
    text(`本局名场面（${scenes.length}）`, px + 24, ly + 6, { size: 12, color: C.dim });
    ly += 26;
    font(13);
    ctx.fillStyle = C.ink;
    for (const s of scenes.slice(0, 20)) {
      ctx.fillText(`· ${s}`, px + 24, ly);
      ly += 21;
    }
    ly += 10;
  }
  // 属性结算
  const statStr = (['hype', 'trust', 'cash', 'risk'] as const)
    .map((k) => `${STAT_META[k].label} ${state.stats[k]}`)
    .join('   ');
  text(statStr, W / 2, ly + 6, { size: 13, color: C.cash, align: 'center' });
  ly += statsH;
  button(px + 24, ly, cw - 48, 44, '再活一次', restart, { bg: C.gold, color: C.bg, id: 'restart' });
  ly += 52;
  button(px + 24, ly, cw - 48, 36, '回到标题', toTitle, { bg: C.blue, id: 'to_title' });
  ly += 44;
  text('GitHub: TaoXieSZ/ai-games', W / 2, ly, { size: 12, color: C.dim, align: 'center' });
  ly += repoH;
  text('本游戏纯属虚构讽刺作品，人物与事件均为艺术加工。', W / 2, ly, { size: 11, color: C.dim, align: 'center' });
  clampScroll(iy + panelH + 20);
}

// ── 滚动与触摸 ───────────────────────────────────────

function clampScroll(contentBottom: number) {
  const max = Math.max(0, contentBottom - H + 20);
  if (scrollY > max) scrollY = max;
  if (scrollY < 0) scrollY = 0;
}

let touchStartY = 0;
let lastMoveY = 0;
let moved = false;

export function onTouchStart(x: number, y: number) {
  touchStartY = y;
  lastMoveY = y;
  moved = false;
}

export function onTouchMove(x: number, y: number) {
  const dy = y - lastMoveY;
  lastMoveY = y;
  if (Math.abs(y - touchStartY) > 6) moved = true;
  if (moved) {
    scrollY -= dy;
    render();
  }
}

export function onTouchEnd(x: number, y: number) {
  if (moved) return;
  // 从后往前命中（后绘制的在上层）
  for (let i = hit.length - 1; i >= 0; i--) {
    const b = hit[i];
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
      b.cb();
      return;
    }
  }
}

/** 冒烟测试用：当前帧的命中区域 */
export function hitRegions() {
  return hit;
}
