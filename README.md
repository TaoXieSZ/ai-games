# ai-games

AI 打造的游戏实验合集。每个子目录是一个独立游戏，推送后由 GitHub Actions 自动构建并发布到 GitHub Pages。

**在线游玩**：<https://taoxiesz.github.io/ai-games/>

## 游戏列表

| 游戏 | 目录 | 简介 |
| --- | --- | --- |
| 🔥 [热搜人生 Hype Life](https://taoxiesz.github.io/ai-games/hype-life/) | [`hype-life/`](hype-life/) | 以孙宇晨为原型（虚构影射）的像素风人生抉择模拟器，从高三三本线玩到纳斯达克敲钟 |

## 结构

```
ai-games/
├── index.html              # 落地页（游戏列表）
├── hype-life/              # 游戏：热搜人生（Vite + React + TS）
└── .github/workflows/
    └── deploy.yml          # 推送 main 自动构建部署 Pages
```

## 新增一个游戏

1. 在根目录新建游戏子目录（Vite 项目即可）
2. 构建产物需支持子路径部署：`vite build --base=/<游戏目录名>/`
3. 在根 `index.html` 落地页加一张卡片
4. 在 `.github/workflows/deploy.yml` 的构建步骤里加一段 build & copy

## 本地开发

```bash
cd hype-life
npm install
npm run dev
```
