// 生成 Roblox 地形文件 hype-life.rbxlx：
// 1. 读取导出的内容 JSON 生成 Content.luau（JSON 经 HttpService:JSONDecode 解析）
// 2. 把引擎/存档/客户端源码嵌入为 Script 实例，输出可直接用 Roblox Studio 打开的 .rbxlx
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

mkdirSync('assets', { recursive: true });
const payload = readFileSync('.tmp/payload.json', 'utf8');

// ── Content.luau ─────────────────────────────────────
const compact = JSON.stringify(JSON.parse(payload));
const escaped = compact.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const contentLuau = `-- 自动生成：内容与网页版 hype-life 同源，请勿手改。
-- 更新方式：在仓库根目录运行 npm run build（hype-life-roblox）。
local HttpService = game:GetService('HttpService')
local PAYLOAD = '${escaped}'
return HttpService:JSONDecode(PAYLOAD)
`;
writeFileSync('src/ReplicatedStorage/Game/Content.luau', contentLuau);

// ── rbxlx 组装 ───────────────────────────────────────
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
let referentN = 0;
const ref = () => `RBX${(referentN += 1)}`;

function scriptItem(className, name, sourceFile) {
  const source = readFileSync(sourceFile, 'utf8');
  if (source.includes(']]>')) {
    throw new Error(`${sourceFile} 含有 ']]>'，会破坏 rbxlx 转义`);
  }
  return `<Item class="${className}" referent="${ref()}">
<Properties>
<string name="Name">${esc(name)}</string>
<ProtectedString name="Source">${esc(source)}</ProtectedString>
</Properties>
</Item>`;
}

function containerItem(className, name, children) {
  return `<Item class="${className}" referent="${ref()}">
<Properties>
<string name="Name">${esc(name)}</string>
</Properties>
${children.join('\n')}
</Item>`;
}

const gameFolder = containerItem('Folder', 'Game', [
  scriptItem('ModuleScript', 'Content', 'src/ReplicatedStorage/Game/Content.luau'),
  scriptItem('ModuleScript', 'Engine', 'src/ReplicatedStorage/Game/Engine.luau'),
]);

const xml = `<roblox xmlns:xmime="http://www.w3.org/2005/05/xmlmime" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://www.roblox.com/roblox.xsd" version="4">
${containerItem('ReplicatedStorage', 'ReplicatedStorage', [gameFolder])}
${containerItem('ServerScriptService', 'ServerScriptService', [scriptItem('Script', 'SaveService', 'src/ServerScriptService/SaveService.server.luau')])}
${containerItem('StarterPlayer', 'StarterPlayer', [containerItem('StarterPlayerScripts', 'StarterPlayerScripts', [scriptItem('LocalScript', 'Main', 'src/StarterPlayer/StarterPlayerScripts/Main.client.luau')])])}
${containerItem('Workspace', 'Workspace', [])}
${containerItem('Lighting', 'Lighting', [])}
</roblox>
`;

writeFileSync('hype-life.rbxlx', xml);
console.log(`hype-life.rbxlx 生成完成（${(xml.length / 1024).toFixed(1)} KB）— 用 Roblox Studio 打开即可`);
