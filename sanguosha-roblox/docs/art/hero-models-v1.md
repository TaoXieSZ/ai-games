# 首批武将 3D 模型：关羽、赵云

## 交付范围

从已选用的武将原画开始，将关羽、赵云制作成可旋转、可独立活动关节的 Roblox 方块模型。这一批用于检查轮廓、配色、握持与基本动作；还不是最终精修模型，也没有接入对局技能。

- 关羽：赤面、青绿头巾、三绺长髯、分片绿甲、长刀与红缨。
- 赵云：年轻无髯面孔、银盔、后掠蓝缨、蓝披风、分片银甲与尖头长枪。
- 每位有 Root、Torso、Head、双臂、双腿七个节点；饰件跟随所属肢体。裙甲分腿，握柄有手掌、指节和拇指。

## 文件与查看

`preview/hero-models/` 可切换武将、拖动旋转、缩放，查看前后侧面和待机、行走、攻击动作，旁边保留原画对照。

`models/hero-models-v1/` 提供：

- `guan_yu.glb` / `zhao_yun.glb`：实际几何与刚性关节层级，包含 Idle、Walk、Attack 动画。不是蒙皮网格，也不是卡面贴图。
- `guan_yu.rbxmx` / `zhao_yun.rbxmx`：原生 Roblox 部件，R6 Humanoid、6 个 Motor6D，以及焊接到肢体的装饰。文件自身不带脚本。
- `hero-model-workshop.rbxlx`：独立展示场景，含两个武将和演示动作脚本，供 Studio 检查。
- `manifest.json`：各模型的数量、包围盒与导出文件记录。

RBXMX 的 HumanoidRootPart 默认锚定，方便导入审阅。正式作为可移动人物使用时，需要解除根部锚定，并由游戏控制器管理移动、动画、碰撞和联网。浏览器预览、GLB 动画和展示场景用于美术检视，不代表对局逻辑已经接入。

## 可重复生成

在仓库根目录运行，无需额外依赖：

```sh
python3 sanguosha-roblox/scripts/design-hero-models.py
node sanguosha-roblox/scripts/export-hero-models.mjs
node scripts/build-art-gallery.mjs
```

第一步生成共用关节局部坐标数据 `data/hero-models-v1.json`，第二步导出 GLB 和 Roblox 文件，第三步组装图鉴网站。不要用游戏的 `npm run build` 代替模型导出。

坐标单位为 studs，Y 轴向上、正面朝 -Z；饰件位置相对于关节转轴。wedge 沿局部 -Z 为低边、+Z 为高边。原始设计脚本是几何来源，精修应修改脚本后重新生成。

## 已知验证边界

网页检视和文件结构可以在本地验证。当前 Studio MCP 未连通，因此不能把 XML 解析成功等同于 Studio 实际导入、Play 或移动控制器测试通过。正式接入前仍需在 Studio 检查关节、动作穿插、碰撞以及多人同步。
