# 武将模型第一轮精修

基于 `6a686ad` 的 25 位可动模型继续精修，不扩展牌局玩法。

## 造型

- 全 25 位分别设置眼形、眉形和嘴型：曹操偏自信、司马懿眯眼、许褚宽眼露齿、郭嘉微笑、关羽细长眼、张飞保留怒吼。夏侯惇的眼罩保留，华佗和黄盖使用灰眉。
- 甄姬：去掉默认重甲，改为冰蓝白色宫装、分片前后裙摆、水袖、流苏发饰和真正展开的九骨折扇。
- 大乔：轻长袖、白色腰带、花簪与侧举方骨纸伞。
- 孙尚香：去掉重甲胸肩，改为红色短衣、青色胸带、高马尾和弓手护腕。
- 黄月英：补工坊头带、侧发、后裙片，保留围裙和工具；貂蝉补发帘、舞裙侧片、后片和花瓣裙边。

面部五官也是模型几何；衣裙分片分别跟随腿部，发饰跟随头部，兵器跟随实际持械手。继续使用现有七节点 R6 骨架。

## 动作

出招按道具和持械手区分。许褚使用左手锤，孙尚香左手持弓、右手拉弦；刘备前持手牌，使用双手牌动作。动作包含预备、发力和回收。

浏览器、GLB 导出和 Roblox 试演同步更新。原画参考保持不变。本轮没有新增武将技能、伤害特效或牌局规则。

## 本轮验证

- 25 位在原生 Studio Play 逐个换将、落地、走动、出招和闪避通过；按实际主手检查 Motor6D 变化，双手动作同时检查两肩。
- 网页 25 位、100 个出招采样帧均有有效几何和有限坐标，无脚本异常；另已检查正侧背造型和手机布局。
- 骨骼旋转统一为 XYZ，装饰几何保留 ZYX；与实际 Studio 三轴旋转结果对照，最大误差小于 1e-6。
- 最终嵌入源码与生成场景一致；[原生逐将数据](hero-models-refinement-01/verification/studio-play-report.json)、[动作采样](hero-models-refinement-01/verification/motion-browser-report.json)、[文件校验](hero-models-refinement-01/verification/verification.json)。

[Studio 甄姬](hero-models-refinement-01/verification/studio-zhen_ji.png) · [Studio 孙尚香](hero-models-refinement-01/verification/studio-sun_shangxiang.png)

本轮原生截图是 Edit 模式渲染；Play 验证使用实际导航与关节检查。服装、弓弦仍为刚性几何，弦的形变与细部穿插可继续精修。
