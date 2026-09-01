// 自动诊断：列出 Studio → 读控制台 → 截屏 → 摘要游戏树。
import { McpStdio } from './mcp-client.mjs';
import { writeFileSync } from 'node:fs';

const client = new McpStdio();
await client.init();

const studios = await client.waitForStudio(15000);
console.log('Studio 实例:', JSON.stringify(studios));
const studioId = studios[0].id;

// 1. 控制台输出（找报错）
const consoleOut = await client.call('get_console_output', { studioId });
const consoleText = consoleOut.content?.[0]?.text ?? '';
console.log('===== 控制台输出（最近 60 行）=====');
console.log(consoleText.split('\n').slice(-60).join('\n'));

// 2. 模拟器截屏
try {
  const shot = await client.call('screen_capture', { studioId });
  const img = shot.content?.find((c) => c.type === 'image');
  if (img) {
    const b64 = img.data ?? img.dataBase64;
    writeFileSync('.tmp/simulator.png', Buffer.from(b64, 'base64'));
    console.log('===== 截图已保存 .tmp/simulator.png =====');
  } else {
    console.log('screen_capture 无图片返回:', JSON.stringify(shot).slice(0, 200));
  }
} catch (e) {
  console.log('screen_capture 失败:', String(e).slice(0, 120));
}

// 3. 游戏树摘要
try {
  const tree = await client.call('search_game_tree', { studioId, maxDepth: 2 });
  const treeText = tree.content?.[0]?.text ?? '';
  console.log('===== 游戏树摘要 =====');
  console.log(treeText.slice(0, 1500));
} catch (e) {
  console.log('search_game_tree 失败:', String(e).slice(0, 120));
}

client.close();
process.exit(0);
