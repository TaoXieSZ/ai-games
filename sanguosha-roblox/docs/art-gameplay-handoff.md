# 美术进度与回合交互接入交接

更新日期：2026-09-13。用户已安排另一 session 开始回合与其他交互；本 session 继续负责美术、模型、动作和特效表现。以下记录美术侧已确认的状态，不代表另一 session 的玩法进度。

## 已完成并发布

美术基线提交：`789014ede5e1e548d8de8ab8c5598c196ce52299`，已推送 `origin/main`。GitHub Pages 部署 `34773168241` 成功；部署后核对 54 个线上文件与本地字节一致。

- 25 位武将原画与图鉴；25 个可动 Roblox 模型完成全员原画对照精修。
- 43 种游戏牌美术设计，覆盖 160 张实体牌配置；包含名称、文字描述和关键牌名视觉区分。
- 全员待机、行走、攻击表现；原生试演场支持换将、移动、出招、闪避。
- 头发、披风、衣带等附属摆动；孙尚香弓弦和箭轴随双臂动作更新。
- 43 种牌均有演示特效：6 基本、15 锦囊、22 装备；装备分别提供入场/触发两种模式。支持预警、释放、消散、取消和换将清理。
- 全员 GLB、RBXMX、Studio 模型展台和可 Play 试演场已更新。

在线入口：[模型图鉴](https://taoxiesz.github.io/ai-games/sanguosha-roblox/preview/hero-models/) · [武将原画](https://taoxiesz.github.io/ai-games/sanguosha-roblox/preview/hero-pool/) · [游戏牌](https://taoxiesz.github.io/ai-games/sanguosha-roblox/preview/game-cards/)

## 可接入的文件与稳定标识

本节路径相对 `sanguosha-roblox/`。使用已有 `id` 关联资源，避免用中文显示名作为资源主键。

| 文件 | 用途 |
| --- | --- |
| `data/hero-art-v1.json` | 25 位武将的 id、名称、势力、原画路径与美术设定；技能文字供核对，不充当规则执行器 |
| `data/game-card-art-v1.json` | 43 种牌的 id、名称、分类、描述、份数与原画路径 |
| `data/hero-models-v1.json` | 模型骨架、部件、姿态、附属摆动、弓箭运动参数 |
| `data/hero-effects-v1.json` | 43 种特效的时间、表现配置与头顶技能名 cue（schema version 3） |
| `models/hero-models-v1/<hero_id>.rbxmx` | 可导入 Studio 的原生角色模型 |
| `models/hero-models-v1/<hero_id>.glb` | 模型交换与外部查看文件，包含 Idle/Walk/Attack 动画 |
| `models/hero-models-v1/hero-playground.rbxlx` | 当前可 Play 的美术动作及特效试演场 |
| `models/hero-models-v1/hero-model-workshop.rbxlx` | 全员模型展台 |
| `workshop/HeroPlayground.server.luau` | 原生角色装配、动作、试演边界和特效广播参考实现 |
| `workshop/HeroPlayground.client.luau` | 试演 UI、特效几何与生命周期参考实现 |
| `workshop/CardEffects.luau` | 新增 39 种原生卡牌特效，包含装备入场/触发 |

保留骨骼和部件名称，尤其是 `attachmentMotion`、`bowMotion` 中引用的部件。`scripts/build-hero-playground.mjs` 按武将产生 `actionType` / `actionHand`，并将动作与附属参数写入 catalog；接入时需要一并保留。

## 试演接口与玩法边界

现有 `ReplicatedStorage.HeroPlaygroundRemote` 是试演用 RemoteFunction：

| 动作 | 参数/用途 |
| --- | --- |
| `GetState` | 读取 heroId、catalog、活动半径和 effects |
| `SwitchHero` | `{heroId = "sun_shangxiang"}`，切换试演角色 |
| `Attack` | 播放攻击动作与杀的演示特效 |
| `Dodge` | 播放闪避动作与闪的演示特效 |
| `PreviewEffect` | `{effectId = "slash", previewMode = "trigger"}`；装备可用 `previewMode = "equip"` |
| `CancelEffect` | 清理当前特效并恢复待机 |

这些接口没有实现完整的三国杀回合、出牌合法性、目标判定、手牌消耗或伤害结算。现有冷却、圆形活动边界、地面特效圈和头顶技能名 cue 属于试演行为，不应直接解释成正式攻击距离、选目标规则或技能触发判定。

`hero-effects-v1.json` 当前为 `version: 3`，在保留 `slash`、`dodge`、`heal`、`arrows` 原 id 与 duration 的基础上增加 `cue`：`duration` 控制头顶技能名停留时间，`height` 控制相对 Head 的世界高度。玩法层只需要在自己的校验完成后广播表现事件，表现层会按 `label`、`color`、`accent` 和 `cue` 播放。

玩法 session 接入建议：服务端先校验当前回合、牌与目标，再广播已确认的动作/特效事件；手牌身份遵守可见性规则，对手默认只显示数量，公开装备可查看，获得授权的看牌事件再展示具体牌。回合状态、技能判定与伤害由玩法层负责，表现层负责播放、结束及取消。用户此前确认角色应能在限定范围内活动，并需要查看他人装备和手牌的交互。

## 协作范围

- 美术侧维护 `scripts/hero_model_designs/`、模型设计与导出、`assets/art-design/`、美术数据、模型图鉴和美术验收记录。
- 回合交互 session 按用户安排推进正式玩法。此记录没有假设该 session 已完成任何功能，也没有替它修改玩法文件。
- `workshop/` 与美术数据 schema 是潜在共享接入点；改协议、骨骼或部件名称前先对齐，避免导出或动作连接失效。
- 生成文件应由现有脚本产生；不要手改导出的 JSON、GLB、RBXMX 来替代源模型修改。
- 当前工作目录有未提交的玩法与其他项目文件；只提交自己负责的文件，避免整目录暂存或覆盖他人工作。

## 验证与剩余美术工作

验收记录见 `docs/art/cast-polish-v3/README.md`：全员正侧背检查，浏览器 25×3×7 动作样本，Studio 全员行走/攻击/闪避、60 组附属摆动，孙尚香 18 个拉弓连接样本，原生和浏览器四种特效生命周期，干净重建 53 个产物一致。

后续美术可继续细化布料曲线、贴图、黄月英正面机关层次、貂蝉裙袖、大乔背面布料，并根据真实回合流程调整命中点、目标高亮及技能时序。尚未验收手机原生多人性能或正式对局规则；这些不能由美术试演通过替代。

## 全牌特效更新（2026-09-13）

`cardId` 对应游戏牌库 ID；旧别名 `sha → slash`、`shan → dodge`、`tao → heal`、`wanjian → arrows` 保持兼容，其他 effectId 与 cardId 相同。装备的 `prop` / `slot` 区分轮廓类型和武器、防具、坐骑，`distanceDelta` 只是坐骑表现提示。`PreviewEffect` 仅接受 `trigger` / `equip` 两种模式，非装备不能用 `equip`。广播 payload 新增 `previewMode`，不传默认为 `trigger`。

每个角色只保留一个活动特效，重新释放、取消和换将会销毁旧容器及头顶牌名。原生新模块使用注入的绘制辅助函数；浏览器对应 `preview/hero-models/card-effects.js`。装备入场展示轮廓与部位连接光线，不改变实际装备、攻击距离或判定结果。八卦阵等使用固定成功表现样例，正式判定分支和真实多目标位置需要由玩法层接入。

验收详见 `docs/art/card-effects-v3/README.md`。

## 对局 UI 设计稿（2026-09-13）

新增 `preview/battle-ui/`：四人 3D 场地、顶部公开信息、底部手牌/确认、技能说明、装备抽屉、隐藏手牌选取、出闪响应和五谷丰登公开牌池。移动与出牌交互使用固定样例，只用于美术体验。

关键约定：头像旁 ⋯ 始终查看公开信息；关闭详情保留当前选牌；未确认目标时按钮不可提交；响应时只启用可响应的牌；对手实际手牌没有进入样例数据。正式玩法提供可选目标、响应种类和公开 view model，UI 不计算真实距离或伤害。

设计、颜色、状态流程、接入数据形状与验收说明见 `docs/art/battle-ui-v1/DESIGN.md`。本轮没有修改 `src/` 或正式对局 place；Roblox 原生 ScreenGui 仍待玩法任务按设计稿接入。

拖牌补充：手牌拖到合法武将头顶松手，复用点击确认的使用入口。拖动草稿独立于点击选择，无效放下或取消保留原选择；过河拆桥仍需选择区域牌，铁索拖放先选第一人，再点或再拖补选第二人，最后统一确认（也可只连一人），万箭齐发明确展示群体意图。手机向上提牌、横向滑动手牌。原生接入应使用服务端提供的合法目标与交互状态，在松手时重新核对资格。
