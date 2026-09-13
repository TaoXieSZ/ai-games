# 标准 25 武将 3D 模型 V1

## 交付范围

这一版把标准 25 位武将全部做成 Roblox 方块比例的 3D 武将模型，用于美术图鉴、姿态检查和可操控试演。模型重点是先统一轮廓、配色、武器识别、握持关系和 R6 关节结构；细纹、材质层次、表情和技能特效仍可后续精修。

25 位范围为魏 7、蜀 7、吴 8、群 3：曹操、司马懿、夏侯惇、张辽、许褚、郭嘉、甄姬；刘备、关羽、张飞、诸葛亮、赵云、马超、黄月英；孙权、甘宁、吕蒙、黄盖、周瑜、大乔、陆逊、孙尚香；华佗、吕布、貂蝉。

每位武将保留 Root、Torso、Head、双臂、双腿七个节点；饰件和武器焊接到所属肢体，随 R6 Motor6D 关节运动。长刀、枪、戟、弓、锤、羽扇/手牌类道具在试演场里会走不同动作模板，避免 25 人全部套同一套挥剑动作。

## 文件与查看

`preview/hero-models/` 可切换武将、拖动旋转、缩放，查看前后侧面和待机、行走、攻击动作，旁边保留原画对照。

`models/hero-models-v1/` 提供：

- `*.glb`：每位武将一个文件，包含真实几何、刚性层级和 Idle、Walk、Attack 动画。不是蒙皮网格，也不是卡面贴图。
- `*.rbxmx`：每位武将一个原生 Roblox R6 Humanoid 模型，包含 HumanoidRootPart、Torso、Head、Left Arm、Right Arm、Left Leg、Right Leg、6 个 Motor6D 和焊接装饰。单个 `.rbxmx` 文件自身不带脚本。
- `hero-model-workshop.rbxlx`：独立展示场景，放置 25 位模型并循环演示待机、原地走和攻击动作，供 Studio 静态检查。
- `hero-playground.rbxlx`：独立可操控美术试演场。Play 后玩家可切换 25 位武将，用真实 Humanoid 走动、跳跃、攻击/闪避，并在 12 studs 活动半径内检视模型、武器和动作。这里还不是完整三国杀规则场景，武将技能、牌局流程、身份胜负和服务器规则引擎尚未实现。
- `manifest.json`：各模型的数量、包围盒与导出文件记录。

RBXMX 的 HumanoidRootPart 默认锚定，方便导入审阅。正式作为可移动人物使用时，需要解除根部锚定，并由游戏控制器管理移动、动画、碰撞和联网。浏览器预览、GLB 动画、workshop 展示场景和 hero-playground 都用于美术检视，不代表对局逻辑已经接入。

## 可重复生成

在仓库根目录运行，无需额外依赖：

```sh
python3 sanguosha-roblox/scripts/design-hero-models.py
node sanguosha-roblox/scripts/export-hero-models.mjs
node sanguosha-roblox/scripts/build-hero-playground.mjs
node scripts/build-art-gallery.mjs
```

第一步生成共用关节局部坐标数据 `data/hero-models-v1.json`，第二步导出 GLB、RBXMX、模型 README 和展示场景，第三步打包独立可操控 `hero-playground.rbxlx`，第四步组装图鉴网站。不要用游戏的 `npm run build` 代替模型导出；`npm run build` 面向主 Roblox 卡库工程，会生成 `sanguosha.rbxlx`。

坐标单位为 studs，Y 轴向上、正面朝 -Z；饰件位置相对于关节转轴。wedge 沿局部 -Z 为低边、+Z 为高边。原始设计脚本是几何来源，精修应修改脚本后重新生成。

## 验证记录（2026-09-13）

- 原生 Studio Play 全 25 位：依次换将，使用实际 Humanoid 导航移动，检查生命值、落地高度和关节变化；全部通过。每位攻击后测量右肩 Motor6D 的 C0 变化，再触发闪避验证另一段动作。
- 服务端活动边界：移到圈外后半径恢复为 11.996 studs；跳跃上升 5.91 studs；死亡后恢复为关羽、生命值 100。非法武将 id 和连续快速换将均正确拒绝。Play 控制台无错误。
- 25 个模板各有 6 个有效 Motor6D。最终嵌入的 catalog、服务端和客户端源码与测试场景逐字一致。
- 网页：25 人正面、侧面、背面共 75 张检查图，另有 25 张手机正面图；无空模型、JS 错误或下载链接异常。
- Studio 截图来自 Edit 模式的原生模型渲染。Play 截图接口返回纯色，因此 Play 行为依据真实角色导航和属性检查记录；未把网页截图作为 Roblox Play 截图。

证据：[Studio Play 数据](hero-models-v1/verification/studio-play-report.json)、[浏览器检查](hero-models-v1/verification/browser-report.json)、[全员正面](hero-models-v1/verification/contactsheet-front.png)、[Studio 关羽](hero-models-v1/verification/studio-guan_yu.png)、[Studio 大乔](hero-models-v1/verification/studio-da_qiao.png)。

手机网页布局已经检查；Roblox 真机触屏、多人压力和正式对局规则尚未验收。造型为首版可动模型，材质、面部与动画穿插仍可继续精修。
