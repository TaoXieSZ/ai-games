# 第一版武将池美术规格

本稿定义 `catalog.json` 中现有 25 位武将的第一版 Roblox 风格美术方向。数据源为 [`data/hero-art-v1.json`](../../data/hero-art-v1.json)，本文用于给美术生成、图鉴排版和后续 3D 建模对齐读法。已交付 25 位武将的独立插画、完整文字卡面、造型动作规格和本地图鉴。当前为美术设计成果，尚未导入 Roblox 模型，也不改变任何卡牌规则。

每张独立武将插画都按同一原则生成：单人、无文字、无其他角色、不出现马匹、脸部清楚、兵器不遮挡五官。装备、坐骑感、药箱、扇、琴弦、卡牌碎片等都只是视觉道具，不赋予新规则；玩法仍以 `catalog.json` 的技能文本为准。

## 通用风格

武将采用经典 Roblox R6 方块比例：方形头、矩形躯干、短粗四肢、清楚的肩髋活动空间。服装可以有盔甲、披风、裙摆和长袖，但必须保留走、跳、转身和挥手的可动范围。细节优先变成大块色面、几何边饰、短披片和可读道具，避免小到建模阶段无法表现的花纹。

阵营色只作为识别底色，不做单调套模板：

| 阵营 | 主方向 | 避免 |
| --- | --- | --- |
| 魏 | 蓝、钢灰、冷金、黑 | 人人同一蓝金帝王甲 |
| 蜀 | 绿、玉、银白、暖金 | 所有人都像关羽绿甲立兵器 |
| 吴 | 朱红、玫红、青绿、水色、暖金 | 只做红甲站姿 |
| 群 | 紫黑、玫粉、医者白绿、强烈反差 | 全部做暗紫魔化 |

## 25 人角色矩阵

| 武将 | 角色读法 | 轮廓与姿势 | 视觉特效 |
| --- | --- | --- | --- |
| 曹操 | 控场君主，受击后反夺资源并号令魏阵 | 左臂抬手指挥，右手停在腰间佩剑旁，深蓝甲配酒红短披风 | 蓝金号令环与回收卡片碎片 |
| 司马懿 | 判定操盘者，替换命运并回收代价 | 背转头狼顾，袖中低持一张判定牌，另一手背在身后；无羽扇 | 深蓝烟雾方块与倒置判定牌 |
| 夏侯惇 | 反伤斗将，越被打越逼近 | 独眼，刀横扛肩后，另一前臂向前格挡迎击；无盾 | 铜红反震火星 |
| 张辽 | 突袭刺客将，突然切入并夺牌 | 轻甲冲刺，双短戟形成前后速度线 | 蓝色残影与被夺卡影 |
| 许褚 | 爆发重击，少防备换强伤害 | 最大块头，裸臂虎皮腰围，虎首重锤拖地蓄力 | 橙色地裂与虎纹冲击 |
| 郭嘉 | 病弱先知，受伤换情报与分配 | 瘦小文士，大披肩，两张牌在身侧展开 | 冰蓝预兆尘与牌面微光 |
| 甄姬 | 闪避与连判，黑牌化防守 | 端庄水袖侧步，纸扇低持 | 水纹方块与黑色牌瓣 |
| 刘备 | 支援君主，递牌回血并号召蜀将 | 双手递牌，双股剑背挂但不出鞘 | 绿色回复脉冲与红色号召火花 |
| 关羽 | 稳定进攻武圣，红牌化为【杀】 | 赤面、绿甲、长髯，青龙偃月刀立起 | 深朱红斩击符号 |
| 张飞 | 连续攻击，怒吼后多次出【杀】 | 黑须环眼，弯膝咆哮，蛇矛低扫 | 红色声波方块与连续斩痕 |
| 诸葛亮 | 牌序控制与空城防守 | 羽扇纶巾，静态后撤，星牌在扇前排列 | 绿色星盘线与透明城门盾 |
| 赵云 | 攻防转换，【杀】与【闪】互换 | 银甲蓝袍，双手低位斜向突刺 | 红蓝交错的进攻与闪避轨迹 |
| 马超 | 距离压迫骑将，贴近后封住【闪】 | 沙金甲、白短披风、双羽盔，回身收枪；无马 | 沙金冲锋尘环与红判定火花 |
| 黄月英 | 机关锦囊专家，锦囊摸牌且无距离限制 | 低位调试机关羽扇，工具腰带 | 绿金蓝图线与齿轮方块 |
| 孙权 | 换牌君主，重整手牌并接受救援 | 侧转拔剑，一手甩出旧牌 | 红青换牌环与低位桃色救援光 |
| 甘宁 | 拆牌游侠，黑牌化拆除 | 侧身跳跃，铃铛腰带，短刀反握 | 黑牌碎裂与水波方块 |
| 吕蒙 | 蓄牌忍耐，不出【杀】保留手牌 | 白衣收刀，双手靠近刀鞘，静立 | 青色锁牌方块，无攻击斩痕 |
| 黄盖 | 自损换牌，承受代价换资源 | 老将拉开肩甲带，战鼓槌下垂 | 红色伤害方块转成两张金牌 |
| 周瑜 | 优雅控牌，多摸并用花色误判 | 都督侧步，指挥棒如乐队指挥 | 金色节拍线与花色微光 |
| 大乔 | 控制与转移，用方块延迟并导走【杀】 | 纸伞侧开，长袖侧步避让 | 粉色方块牌光与弯折红斩线 |
| 陆逊 | 防控制与续牌，空手后再接牌 | 儒将半步后撤，空掌与袖中出牌 | 暖红卡链从袖口重连 |
| 孙尚香 | 装备联动与回复，失装备补牌 | 单膝转身拉弓，装备坠饰崩成牌 | 金色装备碎片转两张牌，轻回血光 |
| 华佗 | 治疗辅助，红牌急救并主动回血 | 白袍老医，药箱背包，前伸递药 | 绿色医疗方块与桃红急救光 |
| 吕布 | 压迫型最强武力，逼对方连续响应 | 紫黑重甲、双长翎，方天画戟过顶劈斩 | 成对红蓝响应回声 |
| 貂蝉 | 离间控制，弃牌挑起决斗并回合末补牌 | 紫粉舞步，双袖左右指向场外 | 月弧方块与两端红色决斗火花 |

## 姿势与轮廓规则

第一版最重要的是“玩家远看就知道不是同一个人换皮”。25 人不能复用同一种直立持兵器模板，至少在以下维度建立差异：

- 重心：关羽直立、赵云低突、马超回旋、张辽冲刺、吕蒙静立、黄月英低身调试机关。
- 身体朝向：曹操侧身抬手指挥、司马懿背转头狼顾、孙权转身拔剑、周瑜优雅侧步。
- 手臂动作：刘备双手递牌、张飞低扫、吕布过顶劈斩、华佗前伸递药。
- 轮廓道具：关羽立刀、赵云长枪、马超双羽盔白披风、吕布双长翎方天戟、甘宁锦帆背旗、黄月英机关扇、大乔纸伞。
- 镜头构图：重将用低角度，谋士用留白和牌阵，女性角色保持 Roblox 方块比例和端庄服装，不用真实人体或细腰长腿表现。

关羽与赵云沿用已定基准：关羽是赤面绿甲长髯、沉稳立刀；赵云是银甲蓝袍、双手低位斜向突刺。前三位魏将按实际生成提示词对齐：曹操深蓝甲、酒红短披风、左臂抬手指挥、右手靠腰间佩剑；司马懿背转头狼顾、袖中低持判定牌、另一手背后，不拿羽扇；夏侯惇刀横扛肩后，另一前臂向前格挡，不拿盾。马超必须和赵云区分：沙金甲、白短披风、双羽盔、回身收枪，不出现马匹。吕布必须是紫黑重甲、双长翎、方天画戟过顶劈斩。

## 图鉴与 UI 文字规则

独立卡面插画不带文字，图鉴 HTML 负责排完整姓名、称号、势力、体力和技能。这样可以避免生图文字出错，也方便后续改规则文案。

规则关键词按现有美术方向执行：

- 【杀】：完整括号、粗体、深朱红，目标色 `#A52A22`。
- 【闪】：完整括号、粗体、深靛蓝，目标色 `#244C83`。
- 同一关键词每次出现都同色同字重，断行不能拆开括号与卡名。
- 颜色只表示关键词类别，不表示红黑花色或武将势力。

未来对局 UI 展示别人状态时，武将图只展示公开信息：姓名、势力、体力、装备公开槽、手牌张数。别人手牌内容仍不直接展示，除非规则效果允许查看。装备图标可以使用武将插画的视觉道具语言，但实际装备区仍读取规则数据，不从美术道具推导。

## 生成提示词使用方式

`hero-art-v1.json` 的 `promptEnglish` 只包含单个武将的服饰、动作、道具和轻量特效。批量生图时应额外统一追加通用风格约束：classic Roblox R6 block avatar, polished stylized game card illustration, portrait composition, no text, no logo, no watermark, no other characters, no horse, face unobstructed, weapon not covering face。

`artPath` 是每位武将的目标图像路径，统一位于 `assets/art-design/hero-pool-v1/`。根代理生成图片后，图鉴页只需要按 JSON 的 `id` 与 `artPath` 绑定图片，技能文本继续来自同一 JSON 或 `catalog.json`。

## 交付与检查记录

本地入口：[第一版英雄池](http://127.0.0.1:4178/preview/hero-pool/)，原卡库页也已增加入口。按魏 7、蜀 7、吴 8、群 3 分组，支持姓名/技能搜索、完整卡面和大图详情。

生成方式：全部使用内置 image_gen；以已认可的关羽、赵云设计稿为风格参考，分别生成单人竖版插画。每位对应的完整最终生成提示词见下表。陆逊另外进行方块手型修订，黄盖进行干净绷带修订；初稿保留，图鉴使用 v2。许褚初始提示词中的钝斧最终呈现为虎首重锤，展示规格按实际图像更新；道具不赋予额外规则。

逐图检查过人物身份、主要造型、兵器和动作。动作涵盖立刀、横枪、过顶劈斩、回身、跳跃、射箭、指挥、递牌、持扇、递药和舞袖。细密纹样、披布与概念动作仍需在后续 3D 制作阶段简化并验证。

浏览器验证：25 张独立 PNG 均为 1024 × 1536，图片全部加载；逐卡姓名、势力、体力和技能与 catalog.json 一致。魏/蜀/吴/群筛选计数正确；姓名与技能搜索、空结果、红蓝关键词不拆行、红桃不误标为【桃】、键盘打开/Esc 关闭及焦点恢复通过。1440 桌面与 390 手机布局无横向溢出，长技能完整，无 JavaScript 异常。

证据：[验证报告](hero-pool-v1/verification/report.json)、[桌面](hero-pool-v1/verification/desktop.png)、[赵云详情](hero-pool-v1/verification/zhao-yun-dialog.png)、[手机](hero-pool-v1/verification/mobile.png)。

| 武将 | 最终插画 | 完整提示词 |
| --- | --- | --- |
| 曹操 | [PNG](../../assets/art-design/hero-pool-v1/cao_cao.png) | [初始生成](hero-pool-v1/prompts/cao_cao.txt) |
| 司马懿 | [PNG](../../assets/art-design/hero-pool-v1/sima_yi.png) | [初始生成](hero-pool-v1/prompts/sima_yi.txt) |
| 夏侯惇 | [PNG](../../assets/art-design/hero-pool-v1/xiahou_dun.png) | [初始生成](hero-pool-v1/prompts/xiahou_dun.txt) |
| 张辽 | [PNG](../../assets/art-design/hero-pool-v1/zhang_liao.png) | [初始生成](hero-pool-v1/prompts/zhang_liao.txt) |
| 许褚 | [PNG](../../assets/art-design/hero-pool-v1/xu_chu.png) | [初始生成](hero-pool-v1/prompts/xu_chu.txt) |
| 郭嘉 | [PNG](../../assets/art-design/hero-pool-v1/guo_jia.png) | [初始生成](hero-pool-v1/prompts/guo_jia.txt) |
| 甄姬 | [PNG](../../assets/art-design/hero-pool-v1/zhen_ji.png) | [初始生成](hero-pool-v1/prompts/zhen_ji.txt) |
| 刘备 | [PNG](../../assets/art-design/hero-pool-v1/liu_bei.png) | [初始生成](hero-pool-v1/prompts/liu_bei.txt) |
| 关羽 | [PNG](../../assets/art-design/hero-pool-v1/guan_yu.png) | [初始生成](hero-pool-v1/prompts/guan_yu.txt) |
| 张飞 | [PNG](../../assets/art-design/hero-pool-v1/zhang_fei.png) | [初始生成](hero-pool-v1/prompts/zhang_fei.txt) |
| 诸葛亮 | [PNG](../../assets/art-design/hero-pool-v1/zhuge_liang.png) | [初始生成](hero-pool-v1/prompts/zhuge_liang.txt) |
| 赵云 | [PNG](../../assets/art-design/hero-pool-v1/zhao_yun.png) | [初始生成](hero-pool-v1/prompts/zhao_yun.txt) |
| 马超 | [PNG](../../assets/art-design/hero-pool-v1/ma_chao.png) | [初始生成](hero-pool-v1/prompts/ma_chao.txt) |
| 黄月英 | [PNG](../../assets/art-design/hero-pool-v1/huang_yueying.png) | [初始生成](hero-pool-v1/prompts/huang_yueying.txt) |
| 孙权 | [PNG](../../assets/art-design/hero-pool-v1/sun_quan.png) | [初始生成](hero-pool-v1/prompts/sun_quan.txt) |
| 甘宁 | [PNG](../../assets/art-design/hero-pool-v1/gan_ning.png) | [初始生成](hero-pool-v1/prompts/gan_ning.txt) |
| 吕蒙 | [PNG](../../assets/art-design/hero-pool-v1/lu_meng.png) | [初始生成](hero-pool-v1/prompts/lu_meng.txt) |
| 黄盖 | [PNG](../../assets/art-design/hero-pool-v1/huang_gai-v2.png) | [初始生成](hero-pool-v1/prompts/huang_gai.txt) · [最终修订](hero-pool-v1/prompts/huang_gai-v2.txt) |
| 周瑜 | [PNG](../../assets/art-design/hero-pool-v1/zhou_yu.png) | [初始生成](hero-pool-v1/prompts/zhou_yu.txt) |
| 大乔 | [PNG](../../assets/art-design/hero-pool-v1/da_qiao.png) | [初始生成](hero-pool-v1/prompts/da_qiao.txt) |
| 陆逊 | [PNG](../../assets/art-design/hero-pool-v1/lu_xun-v2.png) | [初始生成](hero-pool-v1/prompts/lu_xun.txt) · [最终修订](hero-pool-v1/prompts/lu_xun-v2.txt) |
| 孙尚香 | [PNG](../../assets/art-design/hero-pool-v1/sun_shangxiang.png) | [初始生成](hero-pool-v1/prompts/sun_shangxiang.txt) |
| 华佗 | [PNG](../../assets/art-design/hero-pool-v1/hua_tuo.png) | [初始生成](hero-pool-v1/prompts/hua_tuo.txt) |
| 吕布 | [PNG](../../assets/art-design/hero-pool-v1/lu_bu.png) | [初始生成](hero-pool-v1/prompts/lu_bu.txt) |
| 貂蝉 | [PNG](../../assets/art-design/hero-pool-v1/diao_chan.png) | [初始生成](hero-pool-v1/prompts/diao_chan.txt) |
