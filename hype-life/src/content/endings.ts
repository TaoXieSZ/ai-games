// 影射对照表（内容统一改名处）：
//   孙宇晨→孙晨宇  波场TRON→涌场TIDE  湖畔大学→湖心大学  巴菲特→股神
//   贾跃亭→贾亭跃  王小川→王小舟  特朗普→懂王  景甜→田甜  曾颖→曾莹  火币HTX→回声ECHO
// 本作为纯属虚构的讽刺作品，所有人物与事件均为艺术加工。

export interface Ending {
  id: string;
  title: string;
  subtitle: string;
  text: string;
  isWin?: boolean;
}

export const ENDINGS: Record<string, Ending> = {
  // ── 通关系 ─────────────────────────────────────────
  flowgod: {
    id: 'flowgod',
    title: '流量之神',
    subtitle: 'HIDDEN END · 隐藏结局',
    isWin: true,
    text: '敲钟、认爱、长文、彩礼诉讼——你在同一个月里完成了这四件事，热搜前十长期占据三席。学者开始研究"孙晨宇现象"，教授在课堂上说："他不是在蹭热点，他就是热点本身。"你转发了这条视频，配文：过奖了。',
  },
  ipo: {
    id: 'ipo',
    title: '敲钟上市',
    subtitle: 'TRUE END · 热搜之王',
    isWin: true,
    text: '涌场 TIDE 登陆纳斯达克，首夜暴涨 647%。你在钟声里微笑，手机热搜第一还是你自己。从三本线到敲钟台，你花了二十年——人们记不住你做过什么，但所有人都记得你。',
  },
  writer: {
    id: 'writer',
    title: '热搜作家',
    subtitle: 'SPECIAL END · 笔杆子为王',
    isWin: true,
    text: '公司上市了，但你人生的高光时刻是那篇万字长文。出版商找上门，你的《我的女友》系列成为年度畅销书，首印三百万册。签售会上有读者问："都是真的吗？"你微笑："是艺术加工。"',
  },
  art: {
    id: 'art',
    title: '顶级收藏家',
    subtitle: 'SPECIAL END · 艺术永流传',
    isWin: true,
    text: '上市之后，你把重心放回了收藏：香蕉、雕塑、名画，你的美术馆开遍了三座城市。开幕式上你说："钱会归零，热搜会过期，只有艺术永流传。"台下记者问：那香蕉呢？——那根是真的不能放了。',
  },
  lecture: {
    id: 'lecture',
    title: '湖心讲师',
    subtitle: 'SPECIAL END · 反哺母校',
    isWin: true,
    text: '上市后你受聘回湖心大学任教，开设选修课《流量炼金学》，选课人数破了校史纪录。第一节课你说："同学们，今天教你们最重要的一课——所有热度都有价格，先想清楚你卖不卖。"教务处在门口贴了告示：本课不提供退款。',
  },
  nobody: {
    id: 'nobody',
    title: '无名富翁',
    subtitle: 'SECRET END · 你赢了，但没人知道',
    isWin: true,
    text: '你活到了最后，身家百亿，从没上过一次热搜。庆功宴上没有记者，敲钟直播在线人数 217。你给当年的自己发了条微博："看，不炒作也能成。"零转发。你关掉手机，突然有点想念那个总在制造话题的少年。',
  },
  // ── 死亡系 ─────────────────────────────────────────
  nextweek: {
    id: 'nextweek',
    title: '下周回国',
    subtitle: 'RISK END · 命运的轮回',
    text: '机场安检口，你的护照被留下了。你想起多年前自己直播追债时喊的那句"下周回国"——现在，全网把这句话原样还给了你，还做成了倒计时牌。你追过债的人点赞了相关新闻。',
  },
  blocked: {
    id: 'blocked',
    title: '被边控了',
    subtitle: 'RISK END · 风险爆表',
    text: '机场安检口，你的护照被留下了。"配合调查"，四个字比任何热搜都安静。你的超话还在更新，只是主角暂时不会再发微博了。',
  },
  enemy: {
    id: 'enemy',
    title: '全民公敌',
    subtitle: 'TRUST END · 信用破产',
    text: '你再次宣布"干一件大事"，评论区整整齐齐：又来割韭菜了。热搜你照样能上，但这次连你的道歉都没人信。信用这东西，透支起来比额度快多了。',
  },
  forgotten: {
    id: 'forgotten',
    title: '过气退圈',
    subtitle: 'HYPE END · 没有人记得你',
    text: '连续 90 天，你的名字没上过一次热搜。你试着发了几条动态，互动数是个位数。流量圈最残酷的地方在于：它不会杀死你，它只是忘了你。',
  },
  broke: {
    id: 'broke',
    title: '身家清零',
    subtitle: 'CASH END · 江湖再见',
    text: '币价归零那天，你的资产列表只剩一套自住房。曾经 456 万美元的午餐、620 万美元的香蕉，如今都是别人口中的传说。热度还在，只是再也没人接你的电话。',
  },
  stomach: {
    id: 'stomach',
    title: '吃出胃病',
    subtitle: 'SILLY END · 热度的代价',
    text: '第二根香蕉下肚，你在凌晨三点被送进了急诊。诊断书上写着"急性肠胃炎"，热搜词条却是#富豪真吃香蕉吃进医院#。出院那天你收到三个综艺邀约和一个带货金币巧克力品牌的商务——你全接了。医生说你没救了，不是胃。',
  },
};

/** 终章连续剧名场面旗标（触发隐藏结局用） */
export const FINALE_FLAGS = ['teaser_love', 'essay', 'essay_backlash', 'bride_lawsuit'];

/**
 * 结局变体结算：在引擎给出的基础结局上，按旗标升级为更具体的结局。
 * 调用方保证 baseId 已是 'ipo'（胜利）或某个死亡结局。
 */
export function resolveEnding(baseId: string, flags: string[]): string {
  const has = (f: string) => flags.includes(f);
  if (baseId === 'ipo') {
    if (FINALE_FLAGS.every(has)) return 'flowgod';
    if (has('essay') && has('essay_backlash')) return 'writer';
    if (has('museum')) return 'art';
    if (has('huxin_flex')) return 'lecture';
    if (flags.length === 0) return 'nobody';
    return 'ipo';
  }
  if (baseId === 'blocked' && has('debt')) return 'nextweek';
  return baseId;
}

/** 旗标 → 名场面标签，结局页回顾用 */
export const FLAG_LABELS: Record<string, string> = {
  gambler: '孤注一掷赌名校',
  huxin_flex: '高调发文《我与马老师》',
  cut_leek: '拉盘套现被骂割韭菜',
  kidney: '"突发肾结石"取消午餐',
  lunch_done: '补上了股神的午餐',
  banana: '620 万买香蕉并吃掉',
  museum: '天价雕塑捐给美术馆',
  trump_station: '给懂王家族项目站台',
  ipo_done: '纳斯达克直播敲钟',
  countersue: '反手起诉"敲诈勒索"',
  teaser_love: '凌晨认爱顶流女星',
  essay: '深夜发布万字长文',
  essay_backlash: '长文翻车自认"艺术加工"',
  bride_lawsuit: '三千万彩礼诉讼',
  bet: '接下"一个比特币"的赌约',
  debt: '直播追债下周回国老板',
  echo: '收购回声交易所',
  scholar: '埋首故纸堆的卷王岁月',
  deleted: '删帖之夜',
  censorship: '公开信事件',
  pump: '拉盘喊单',
  crash: '维权群卧底',
  forbes: '福布斯封面',
  charity: '慈善人设',
  audit: '做空报告之战',
  hack: '交易所被盗之夜',
  airdrop: '天价空投',
  taunt: '推特跨国对线',
  lawyer_letter: '律师函警告大战',
  archaeology: '微博考古现场',
  trending3: '热搜前十占三席',
  rumors: '复合传闻',
};
