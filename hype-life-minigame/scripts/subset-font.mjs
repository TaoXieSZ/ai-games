// 字体子集化：从游戏源码里提取全部用字，生成精简 TTF（全量 660KB → 约百 KB）。
// woff2 → ttf 用 wawoff2（npm，wasm 实现），子集化用 python fontTools（TTF 输入无需 brotli）。
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync, statSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { decompress } from 'wawoff2';

const SRC_DIRS = ['../hype-life/src', './src'];
const FONT_IN = '../hype-life/src/assets/fonts/fusion-pixel-12px-proportional-zh_hans.otf.woff2';
const FONT_OUT = 'assets/fonts/hype-subset.ttf';

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|mjs|html)$/.test(name)) out.push(p);
  }
  return out;
}

const chars = new Set();
for (const dir of SRC_DIRS) {
  for (const file of walk(dir)) {
    for (const ch of readFileSync(file, 'utf8')) chars.add(ch);
  }
}
// ASCII 可打印字符 + 常用全角标点兜底（动态文案/用户可见符号）
for (let c = 0x20; c <= 0x7e; c++) chars.add(String.fromCharCode(c));
for (const ch of '，。！？：；“”‘’（）《》〈〉【】·—…％￥×↩✕🔥🤝💰⚖️💤🤬💸✅⭐') chars.add(ch);

const text = [...chars].join('');
mkdirSync('assets/fonts', { recursive: true });
mkdirSync('.tmp', { recursive: true });
const textFile = '.tmp/charset.txt';
writeFileSync(textFile, text);
console.log('用字数:', chars.size);

// woff2 → ttf（避免 fontTools 的 brotli 依赖）
rmSync('.tmp/full.ttf', { force: true });
const ttfBuf = await decompress(readFileSync(FONT_IN));
writeFileSync('.tmp/full.ttf', ttfBuf);

rmSync(FONT_OUT, { force: true });
execFileSync(
  'python3',
  [
    '-m', 'fontTools.subset',
    '.tmp/full.ttf',
    `--text-file=${textFile}`,
    `--output-file=${FONT_OUT}`,
    '--layout-features=*',
    '--no-hinting',
  ],
  { stdio: 'inherit' },
);

const kb = (statSync(FONT_OUT).size / 1024).toFixed(1);
console.log(`字体子集生成完成: ${FONT_OUT} (${kb} KB)`);
