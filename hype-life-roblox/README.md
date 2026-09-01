# 热搜人生 · Roblox 版

与网页版 [`hype-life/`](../hype-life/) **同引擎逻辑、同内容**（57 张事件卡、12 结局、时光机、条件抽卡、结局图鉴全部同源），渲染层为 Roblox ScreenGui。

## 一分钟上手（不需要装任何工具）

1. 用 **Roblox Studio** 打开本目录下的 **`hype-life.rbxlx`**（文件 → 从文件打开）
2. 按 **F5** 试玩
3. 发布：**文件 → Publish to Roblox As...** → 填名称/简介 → 创建
4. 公开：**Game Settings → Permissions → Public → Save**

> 建议先在 Game Settings → Security 里开启 **Allow Mesh & Image APIs**（像素立绘需要；不开启则立绘自动隐藏，不影响游玩），以及 **Enable Studio Access to API Services**（云存档 DataStore 需要）。

## 发布到全平台玩家

1. **Game Settings → 基础信息**：完善游戏描述
2. **Content Maturity 问卷**：按实际填写（本作仅为文字讽刺内容，无暴力/恐怖元素，选 Mild 级别即可）
3. **Game Settings → Permissions → Public**：设为公开即全员可玩
4. 可选：创建 **Game Pass / Developer Product** 实现 Robux 内购（个人开发者即可）

## 工程结构（开发者）

```
hype-life-roblox/
├── hype-life.rbxlx                  # 构建产物：可直接打开的地形文件（已提交）
├── default.project.json             # Rojo 项目定义（可选开发方式）
├── scripts/
│   ├── export-content.mjs           # 网页版 TS 内容 → JSON（57 卡/12 结局/舆情规则/像素画）
│   └── build-rbxlx.mjs              # JSON → Content.luau + 组装 .rbxlx
└── src/
    ├── ReplicatedStorage/Game/
    │   ├── Content.luau             # 自动生成（JSON 内嵌，HttpService 解析）
    │   └── Engine.luau              # 引擎移植（选择/回滚/条件抽卡/结局变体，与 TS 逐行对齐）
    ├── ServerScriptService/SaveService.server.luau   # DataStore 存档
    └── StarterPlayer/StarterPlayerScripts/Main.client.luau  # 三屏 UI
```

## 内容同步

内容与网页版**单一来源**：改 [`hype-life/src/content/`](../hype-life/src/content/) 里的卡牌/结局，然后：

```bash
npm install   # 首次
npm run build # 重新生成 Content.luau 与 hype-life.rbxlx
```

引擎逻辑的 Luau 移植为手写，改动引擎语义时需与 `hype-life/src/engine/engine.ts` 保持一致（判定顺序、时光机快照、条件抽卡等）。

## 发布检查清单

- [ ] Game Settings → Security：Allow Mesh & Image APIs 开启（像素立绘）
- [ ] Game Settings → Security：Enable Studio Access to API Services 开启（DataStore）
- [ ] Game Settings → Permissions：Public
- [ ] Content Maturity 问卷：Mild
- [ ] 真机（手机 Roblox App）试玩一遍
