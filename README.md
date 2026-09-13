# Roblox 三国杀 · 美术图鉴

25 位武将、43 款游戏牌，以 Roblox 方块风格呈现角色、兵器与卡面。

**在线图鉴：[taoxiesz.github.io/ai-games](https://taoxiesz.github.io/ai-games/)**

- [武将图鉴](https://taoxiesz.github.io/ai-games/sanguosha-roblox/preview/hero-pool/)：按魏、蜀、吴、群筛选，查看造型、动作与技能。
- [游戏牌图鉴](https://taoxiesz.github.io/ai-games/sanguosha-roblox/preview/game-cards/)：6 款基本牌、15 款锦囊、22 款装备，覆盖 160 张实体牌，保留花色、点数、牌包与规则。

卡面可以点击放大。【杀】【闪】等规则名词使用独立颜色与括号强调。插画是独立 PNG，规则由网页排版，方便逐张精修。

- [3D 武将模型](https://taoxiesz.github.io/ai-games/sanguosha-roblox/preview/hero-models/)：25 位武将，可旋转查看、预览动作，下载 GLB、Roblox 模型和可操控试演场。

## 本地预览

无需安装依赖，Node.js 20 或以上：

```bash
node scripts/build-art-gallery.mjs
python3 -m http.server 4178 --directory site
```

打开 `http://localhost:4178/`。

## 美术文件

- [`sanguosha-roblox/assets/art-design/`](sanguosha-roblox/assets/art-design/)：原图、造型设定与迭代版本。
- [`hero-art-v1.json`](sanguosha-roblox/data/hero-art-v1.json)：25 位武将的数据与选用图片。
- [`game-card-art-v1.json`](sanguosha-roblox/data/game-card-art-v1.json)：43 款游戏牌的数据、规则、实体副本与选用图片。
- [`docs/art/`](sanguosha-roblox/docs/art/)：美术规格、生成提示词与验证记录。
- [`preview/hero-pool/`](sanguosha-roblox/preview/hero-pool/) / [`preview/game-cards/`](sanguosha-roblox/preview/game-cards/)：两个静态图鉴页面。

## 发布

推送到 `main` 后，GitHub Actions 自动组装并部署到 GitHub Pages。网站发布图鉴页面、数据、选用插画和全 25 位 3D 模型。旧热搜人生网站已撤下，旧网址跳转到图鉴首页；历史游戏源码保留在原目录。

25 位 3D 模型采用独立关节和绑定饰件。`hero-playground.rbxlx` 可直接用 Roblox Studio 打开并 Play：切换武将、走动、跳跃、出招和闪避，活动半径限制为 12 studs。这是可操控美术试演，武将技能和完整牌局规则仍待接入。
