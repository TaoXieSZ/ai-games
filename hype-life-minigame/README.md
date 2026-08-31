# 热搜人生 · 微信小游戏版

复用 [`hype-life/`](../hype-life/) 的引擎与内容层（100% 同源），渲染层为 Canvas 即时模式绘制的微信小游戏（`game.js` 形态）。

## 本地构建

```bash
npm install
npm run build     # 生成音效 wav + 字体子集 + 打包 game.js
npm run smoke     # wx mock 冒烟测试（全链路）
npm run typecheck
```

构建产物 `game.js` 已随仓库提交，**不装 Node 也能直接用微信开发者工具打开**；改了源码才需要重新 build。

## 上传体验版（当天可玩，无需软著/备案）

1. 注册微信小游戏账号：[mp.weixin.qq.com](https://mp.weixin.qq.com/) → 小程序 → 选"小游戏"（个人主体可选，免费游戏无需版号）
2. 拿到 `appid`（设置→基本账号信息）
3. 安装[微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
4. 用开发者工具打开本目录，把 `project.config.json` 里的 `appid` 换成你的（或先用 touristappid 游客模式预览）
5. 点"预览"生成二维码 → 手机微信扫码即玩（体验版可添加最多 100 名体验成员）

## 正式发布（公开给所有人）需要

1. **计算机软件著作权登记证书** 或 电子版权认证（各省版权局/线上代办，1-4 周）
2. **备案**：小游戏主体备案 + 游戏内容备案（在 mp 后台引导下完成，需国内服务器信息，约 1-2 周）
3. 提交审核（类目：游戏 → 休闲游戏），审核通过后全量发布

## 工程说明

```
hype-life-minigame/
├── game.json / project.config.json   # 小游戏配置（appid 在此改）
├── game.js                           # esbuild 打包产物（已提交）
├── assets/
│   ├── fonts/hype-subset.ttf        # 字体子集（660KB→180KB，脚本从源码提取用字）
│   └── sfx/*.wav                    # 8-bit 音效（离线渲染，替代 WebAudio）
├── src/
│   ├── main.ts                      # 入口：画布/字体/触摸/渲染调度
│   ├── renderer.ts                  # Canvas 即时模式 UI（标题/卡牌/结局三屏）
│   ├── store.ts                     # 与网页版同构的状态层（引擎 100% 复用）
│   ├── audio.ts / gallery.ts / platform.ts
├── scripts/
│   ├── gen-sfx.mjs                  # 音符 → wav 离线渲染
│   ├── subset-font.mjs              # wawoff2 解码 + fontTools 子集化
│   └── smoke.mjs                    # wx mock 冒烟测试
└── build.mjs                        # esbuild 打包
```

引擎与内容与网页版完全同源（`../hype-life/src/engine` + `content`），**加卡/改结局只在网页版内容文件里改**，这里重新 build 即可同步。
