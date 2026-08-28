# 热搜人生 · Hype Life

以孙宇晨人生轨迹为原型的**虚构讽刺**像素风叙事抉择游戏（Reigns 式事件卡模拟器）。

> 本游戏纯属虚构讽刺作品，人物与事件均为艺术加工（影射对照表见 `src/content/endings.ts` 顶部），请勿对号入座。

## 玩法

从高三三本线一路抉择到纳斯达克敲钟，终点延伸至 2026 年 8 月的"恋情热搜连续剧"。每张事件卡固定**三选一**（高调作死 / 稳健发育 / 剑走偏锋），影响四维属性（0~100）：

| 属性 | 归零/爆表结局 |
| --- | --- |
| 🔥 热度 | 归零 → 过气退圈 |
| 🤝 信用 | 归零 → 全民公敌 |
| 💰 资金 | 归零 → 身家清零 |
| ⚖️ 风险 | 爆表 → 被边控 |

主线走完且存活 → 真结局"敲钟上市"；集齐终章连续剧名场面 → 隐藏结局预告（M2 解锁《流量之神》）。

## 运行

```bash
npm install
npm run dev        # 开发（默认 http://localhost:5173）
npm run test       # Vitest 单测（引擎 + 内容完整性 + 像素矩阵尺寸）
npm run build      # 产物输出 dist/（纯静态，可部署 GitHub Pages）
npm run preview    # 预览构建产物
```

## 技术

- Vite + React 18 + TypeScript + Zustand（localStorage 存档）
- 零外部美术：中文像素字体 [Fusion Pixel](https://github.com/TakWolf/fusion-pixel-font)（OFL，自托管于 `public/fonts/`）；角色/图标为代码内嵌像素矩阵（`src/content/sprites.ts`），canvas 绘制 + `image-rendering: pixelated`
- 引擎与内容分离：`src/engine/`（纯函数结算/连锁/结局）不认识剧情，全部剧情在 `src/content/events.ts` 数据里，加卡即加内容

## 路线图

- **M1（已完成）**：引擎 + 24 张卡 + 5 结局 + 像素 UI
- **M2（已完成）**：50 张卡（18 张主线脊柱 + 5 条连锁链 + 27 张支线）、12 个结局（含隐藏结局《流量之神》《无名富翁》与搞笑结局《吃出胃病》）、WebAudio 合成 8-bit 音效 + 静音开关、金色西装新精灵
- **M3（待做）**：卡牌甩出动效、结局图鉴收集、移动端适配、部署上线
