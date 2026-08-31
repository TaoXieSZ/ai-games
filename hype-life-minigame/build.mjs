import { build } from 'esbuild';
import { copyFileSync } from 'node:fs';

// 打包小游戏入口：引擎/内容/UI 全部内联成单文件 game.js
await build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  outfile: 'game.js',
  format: 'cjs',
  platform: 'browser',
  target: 'es2020',
  minify: false,
  legalComments: 'none',
  logLevel: 'info',
});

// 静态资源（字体/音效）随包上传，devtools 直接读取相对路径
copyFileSync('assets/fonts/hype-subset.ttf', 'assets/fonts/hype-subset.ttf');
console.log('game.js 构建完成，可用微信开发者工具打开本目录');
