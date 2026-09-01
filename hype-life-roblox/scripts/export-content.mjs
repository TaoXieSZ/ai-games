// 导出共享内容：把网页版 TS 内容层打包成 JSON（build-rbxlx.mjs 再生成 Luau 模块）。
import { build } from 'esbuild';
import { mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

mkdirSync('.tmp', { recursive: true });
const entry = '.tmp/export-entry.ts';
writeFileSync(
  entry,
  `import { CONTENT } from '../../hype-life/src/content/events';
import { ENDINGS, FINALE_FLAGS, FLAG_LABELS } from '../../hype-life/src/content/endings';
import { REACTION_RULES } from '../../hype-life/src/content/reactions';
import { SPRITES, STAT_ICONS, PALETTE } from '../../hype-life/src/content/sprites';
import { INITIAL_STATS, UNDO_LIMIT, WIN_ENDING_ID } from '../../hype-life/src/engine/engine';

const cards = Object.values(CONTENT.events).map((e) => ({
  id: e.id,
  act: e.act,
  year: e.year,
  scene: e.scene,
  sprite: e.sprite,
  title: e.title,
  text: e.text,
  mainline: !!e.mainline,
  whenSpec: e.whenSpec ?? null,
  choices: e.choices.map((c) => ({
    text: c.text,
    effects: c.effects ?? {},
    nextEventId: c.nextEventId ?? null,
    flags: c.flags ?? [],
    endingId: c.endingId ?? null,
    resultText: c.resultText ?? null,
  })),
}));

const payload = {
  cards,
  mainline: CONTENT.mainline,
  side: CONTENT.side,
  endings: ENDINGS,
  finaleFlags: FINALE_FLAGS,
  flagLabels: FLAG_LABELS,
  reactionRules: REACTION_RULES,
  sprites: SPRITES,
  statIcons: STAT_ICONS,
  palette: PALETTE,
  initialStats: INITIAL_STATS,
  undoLimit: UNDO_LIMIT,
  winEndingId: WIN_ENDING_ID,
};
console.log(JSON.stringify(payload));
`,
);

const bundled = await build({
  entryPoints: [entry],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: '.tmp/export-entry.cjs',
  logLevel: 'silent',
});

const run = spawnSync(process.execPath, ['.tmp/export-entry.cjs'], { encoding: 'utf8' });
if (run.status !== 0) {
  console.error(run.stderr);
  process.exit(1);
}
const payload = JSON.parse(run.stdout);
writeFileSync('.tmp/payload.json', JSON.stringify(payload, null, 2));
console.log(
  `内容导出完成: ${payload.cards.length} 张卡 / ${Object.keys(payload.endings).length} 个结局 / 用字像素图 ${Object.keys(payload.sprites).length} 组`,
);
