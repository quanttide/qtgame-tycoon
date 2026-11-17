/* 滁州夜市 · 串串摊 速玩版 —— 7 天 / 3 分钟一局，纯原生 JS，无外部依赖 */
(function () {
  'use strict';

  // ==================== 常量 ====================
  var KEY = 'cz4399_lite_v1';
  var DAYS = 7;
  var DEFAULT_PRICE = 3;              // 常规价（¥3 时客流 = 基准客流，兼容旧逻辑）
  var PRICE_MIN = 2, PRICE_MAX = 6;   // 可定价区间
  var COST = 1.2;     // 每签成本
  var FIXED = 80;     // 每晚固定成本
  var MIN_BET = 40, MAX_BET = 200;

  // ==================== 消息钱袋 / 次数限制 ====================
  // 开局专款 ¥50，只用于买线索，不进经营净利（不污染已调平的周目目标）。
  // 一回合（7 天 / 一段）最多买 5 次，其中「数人头」最多 3 次；
  // 想再买要转发给好友或看激励视频：各 +2 次机会、补 ¥20、数人头额度 +1。
  var INTEL_START = 50;
  var CLUE_BUY_MAX = 5;
  var CLUE_COUNT_MAX = 3;
  var TOPUP_TIMES = 2;
  var TOPUP_CASH = 20;
  var TOPUP_COUNT = 1;

  // 客人对价格的敏感度：抬价客流掉多少。挖「问老客口味」才能知道今晚是哪一档
  var ELASTIC = {
    chill:  { s: 0.18, name: '不太挑价', hint: '来的不太在乎几块钱，价牌可以往上挪', best: 6 },
    normal: { s: 0.40, name: '看价下单', hint: '涨太多会走几个客，小幅涨最稳',       best: 5 },
    picky:  { s: 0.90, name: '斤斤计较', hint: '都是熟客和学生，一涨价扭头就走',     best: 3 }
  };
  // 三条线索：各买一个决策维度的确定性。每晚只有 2 次跑腿，还要花钱
  var CLUES = [
    { id: 'count', icon: '查', name: '数人头', cost: 10, desc: '按你写的价牌，给能直接照着备的准数' },
    { id: 'taste', icon: '味', name: '问口味', cost: 10, desc: '知道今晚客人挑不挑价' },
    { id: 'truth', icon: '验', name: '验消息', cost: 8,  desc: '街坊那句是真是假' }
  ];
  // 三段街：单局仍是 7 天 3 分钟，但有过关目标、解锁与难度递进
  var STAGES = [
    { name: '巷口小摊', goal: 600, runs: 2, costMul: 1.0, chill: 0.40, picky: 0.28,
      rumorRate: 0.75, bias: 0.18, spread: 0.30,
      desc: '每晚能跑 2 趟 · 赚够本周目目标就往里走', icon: '巷' },
    { name: '夜市主街', goal: 1100, runs: 2, costMul: 1.3, chill: 0.28, picky: 0.38,
      rumorRate: 0.62, bias: 0.26, spread: 0.34,
      desc: '消息更杂、目标也跟着涨', icon: '街' },
    { name: '美食节',   goal: 1600, runs: 1, costMul: 1.5, chill: 0.22, picky: 0.48,
      rumorRate: 0.52, bias: 0.34, spread: 0.38,
      desc: '每晚只能跑 1 趟，得挑最值钱那条线索', icon: '节' }
  ];

  // 三段通关礼：每段一位镇摊吉祥物 + 一句「心里有满足」的话。
  // 用内联 SVG 而不是 emoji，避免部分环境显示成方框；Q 版大眼高光手绘吉祥物。
  var MASCOTS = [
    {
      name: '阿灶', kind: '小火苗', dot: '灶', sign: '巷口 · 第一盏火',
      words: '第一晚你连火都不敢烧旺。现在你会先看天、再数人——锅热了，摊子就算支起来了。',
      art: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="小火苗阿灶">
<ellipse cx="60" cy="108" rx="33" ry="6" fill="#3a271c" opacity=".13"/><circle cx="60" cy="60" r="54" fill="#fff0c9" stroke="#3a271c" stroke-opacity=".2" stroke-width="3"/>
<circle cx="60" cy="60" r="49" fill="none" stroke="#e8a86c" stroke-width="2" stroke-dasharray="3 6"/>
<path d="M26 92 L94 92 L88 106 L32 106 Z" fill="#7a4a2c" stroke="#3a271c" stroke-width="3" stroke-linejoin="round"/>
<rect x="30" y="83" width="60" height="11" rx="4" fill="#a5663a" stroke="#3a271c" stroke-width="3"/>
<path d="M60 15 C76 35 88 48 88 64 C88 80 76 90 60 90 C44 90 32 80 32 64 C32 48 44 35 60 15 Z" fill="#ff8b3d" stroke="#3a271c" stroke-width="3" stroke-linejoin="round"/>
<path d="M60 43 C68 55 72 62 72 70 C72 79 67 84 60 84 C53 84 48 79 48 70 C48 62 52 55 60 43 Z" fill="#ffd45e"/>
<path d="M32 60 Q22 56 20 48 M88 60 Q98 56 100 48" fill="none" stroke="#3a271c" stroke-width="3" stroke-linecap="round"/>
<ellipse cx="48" cy="68.0" rx="7.2" ry="8.4" fill="#fffaf0" stroke="#3a271c" stroke-width="2.6"/><circle cx="49.1" cy="69.3" r="4.4" fill="#3a271c"/><circle cx="46.2" cy="65.2" r="2.1" fill="#fff"/><circle cx="51.1" cy="71.8" r="1" fill="#fff" opacity=".75"/><ellipse cx="72" cy="68.0" rx="7.2" ry="8.4" fill="#fffaf0" stroke="#3a271c" stroke-width="2.6"/><circle cx="73.1" cy="69.3" r="4.4" fill="#3a271c"/><circle cx="70.2" cy="65.2" r="2.1" fill="#fff"/><circle cx="75.1" cy="71.8" r="1" fill="#fff" opacity=".75"/>
<path d="M54 78 Q60 85 66 78" fill="none" stroke="#3a271c" stroke-width="2.8" stroke-linecap="round"/>
<ellipse cx="42" cy="74" rx="7" ry="4" fill="#e9524a" opacity=".42"/>
<ellipse cx="78" cy="74" rx="7" ry="4" fill="#e9524a" opacity=".42"/>
<ellipse cx="42" cy="31" rx="24" ry="10" fill="#fff" opacity=".22"/></svg>`
    },
    {
      name: '阿灯', kind: '灯笼崽', dot: '灯', sign: '主街 · 认灯的人',
      words: '主街上的风声最杂，你没跟着跑。熟客认灯不认招牌：「还是这家」。这句比账上的数耐看。',
      art: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="灯笼崽阿灯">
<ellipse cx="60" cy="108" rx="33" ry="6" fill="#3a271c" opacity=".13"/><circle cx="60" cy="60" r="54" fill="#ffe9d2" stroke="#3a271c" stroke-opacity=".2" stroke-width="3"/>
<circle cx="60" cy="60" r="49" fill="none" stroke="#e8b48c" stroke-width="2" stroke-dasharray="3 6"/>
<path d="M60 6 L60 20" stroke="#3a271c" stroke-width="3" stroke-linecap="round"/>
<rect x="28" y="26" width="64" height="66" rx="26" fill="#e9524a" stroke="#3a271c" stroke-width="3"/>
<path d="M48 28 Q42 60 48 90 M72 28 Q78 60 72 90" fill="none" stroke="#b8332c" stroke-width="2"/>
<rect x="40" y="20" width="40" height="10" rx="3" fill="#ffc93c" stroke="#3a271c" stroke-width="3"/>
<rect x="40" y="90" width="40" height="10" rx="3" fill="#ffc93c" stroke="#3a271c" stroke-width="3"/>
<path d="M60 100 L60 113 M54 100 L52 111 M66 100 L68 111" fill="none" stroke="#ffc93c" stroke-width="3" stroke-linecap="round"/>
<ellipse cx="48" cy="57.0" rx="7.2" ry="8.4" fill="#fffaf0" stroke="#3a271c" stroke-width="2.6"/><circle cx="49.1" cy="58.3" r="4.4" fill="#3a271c"/><circle cx="46.2" cy="54.2" r="2.1" fill="#fff"/><circle cx="51.1" cy="60.8" r="1" fill="#fff" opacity=".75"/><ellipse cx="72" cy="57.0" rx="7.2" ry="8.4" fill="#fffaf0" stroke="#3a271c" stroke-width="2.6"/><circle cx="73.1" cy="58.3" r="4.4" fill="#3a271c"/><circle cx="70.2" cy="54.2" r="2.1" fill="#fff"/><circle cx="75.1" cy="60.8" r="1" fill="#fff" opacity=".75"/>
<path d="M54 69 Q60 76 66 69" fill="none" stroke="#3a271c" stroke-width="2.8" stroke-linecap="round"/>
<ellipse cx="40" cy="64" rx="7" ry="4" fill="#e9524a" opacity=".42"/>
<ellipse cx="80" cy="64" rx="7" ry="4" fill="#e9524a" opacity=".42"/>
<ellipse cx="42" cy="31" rx="24" ry="10" fill="#fff" opacity=".22"/></svg>`
    },
    {
      name: '阿满', kind: '金锅', dot: '满', sign: '美食节 · 锅底朝天',
      words: '最后一晚只够跑一趟，你挑对了。锅底朝天，没人空着手回去——这条街往后记得你的味道。',
      art: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="金锅阿满">
<ellipse cx="60" cy="108" rx="33" ry="6" fill="#3a271c" opacity=".13"/><circle cx="60" cy="60" r="54" fill="#fff2cf" stroke="#3a271c" stroke-opacity=".2" stroke-width="3"/>
<circle cx="60" cy="60" r="49" fill="none" stroke="#e8c06c" stroke-width="2" stroke-dasharray="3 6"/>
<path d="M40 42 L40 28 M60 42 L60 24 M80 42 L80 28" fill="none" stroke="#3a271c" stroke-width="2.6" stroke-linecap="round"/>
<circle cx="40" cy="26" r="5" fill="#e9524a" stroke="#3a271c" stroke-width="2"/>
<circle cx="60" cy="22" r="5" fill="#3f9c63" stroke="#3a271c" stroke-width="2"/>
<circle cx="80" cy="26" r="5" fill="#ff8b3d" stroke="#3a271c" stroke-width="2"/>
<path d="M22 54 Q22 98 60 98 Q98 98 98 54 Z" fill="#e8a53c" stroke="#3a271c" stroke-width="3" stroke-linejoin="round"/>
<rect x="18" y="48" width="84" height="11" rx="5" fill="#ffc93c" stroke="#3a271c" stroke-width="3"/>
<path d="M18 60 Q8 60 8 70 M102 60 Q112 60 112 70" fill="none" stroke="#3a271c" stroke-width="3" stroke-linecap="round"/>
<ellipse cx="48" cy="72.0" rx="7.2" ry="8.4" fill="#fffaf0" stroke="#3a271c" stroke-width="2.6"/><circle cx="49.1" cy="73.3" r="4.4" fill="#3a271c"/><circle cx="46.2" cy="69.2" r="2.1" fill="#fff"/><circle cx="51.1" cy="75.8" r="1" fill="#fff" opacity=".75"/><ellipse cx="72" cy="72.0" rx="7.2" ry="8.4" fill="#fffaf0" stroke="#3a271c" stroke-width="2.6"/><circle cx="73.1" cy="73.3" r="4.4" fill="#3a271c"/><circle cx="70.2" cy="69.2" r="2.1" fill="#fff"/><circle cx="75.1" cy="75.8" r="1" fill="#fff" opacity=".75"/>
<path d="M54 83 Q60 90 66 83" fill="none" stroke="#3a271c" stroke-width="2.8" stroke-linecap="round"/>
<ellipse cx="39" cy="79" rx="7" ry="4" fill="#e9524a" opacity=".42"/>
<ellipse cx="81" cy="79" rx="7" ry="4" fill="#e9524a" opacity=".42"/>
<ellipse cx="42" cy="31" rx="24" ry="10" fill="#fff" opacity=".22"/></svg>`
    }
  ];

  // ==================== 周目 · 无尽闯关 ====================
  // 三段全通后自动进入下一周目：每段目标更高、每晚净利与奖励同步叠加，
  // 每周目 3 位新吉祥物。目标涨幅略高于收益涨幅，难度缓慢爬升但始终够得着。
  var CYCLE_GOAL_STEP = 0.34;   // 每周目目标 +34%
  var CYCLE_GAIN_STEP = 0.30;   // 每周目净利 / 奖励 +30%
  function cycleMul(c) { return 1 + (Math.max(1, c || 1) - 1) * CYCLE_GAIN_STEP; }
  function goalFor(stage, c) {
    // 每一轮（周目）第三阶段目标固定只比同一轮第二阶段多 400，不随周目倍率放大
    if (stage === 2) return goalFor(1, c) + 400;
    return Math.round(STAGES[stage].goal * (1 + (Math.max(1, c || 1) - 1) * CYCLE_GOAL_STEP) / 10) * 10;
  }
  var CN = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

  // 吉祥物 Q 版画法 v3：玻璃珠大眼 + 双高光、圆润笑口、柔腮红、落地投影、顶部高光。
  // 元素主体各画各的，脸谱统一生成，18+ 位一套视觉不散；纯内联 SVG，不依赖 emoji。
  function mascotArt(o) {
    var ey = o.ey || 66, lx = o.lx || 48, rx = o.rx || 72;
    var my = o.my || (ey + 12), by = o.by || (ey + 10), cx = (lx + rx) / 2;
    function eye(x) {
      return '<ellipse cx="' + x + '" cy="' + ey + '" rx="7.4" ry="8.6" fill="#fffaf0" stroke="#3a271c" stroke-width="2.6"/>' +
        '<circle cx="' + (x + 1.1) + '" cy="' + (ey + 1.3) + '" r="4.5" fill="#3a271c"/>' +
        '<circle cx="' + (x - 1.8) + '" cy="' + (ey - 2.8) + '" r="2.2" fill="#fff"/>' +
        '<circle cx="' + (x + 3.1) + '" cy="' + (ey + 3.8) + '" r="1" fill="#fff" opacity=".75"/>';
    }
    return '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + o.name + '">' +
      '<ellipse cx="60" cy="108" rx="33" ry="6" fill="#3a271c" opacity=".13"/>' +
      '<circle cx="60" cy="60" r="54" fill="' + o.bg + '" stroke="' + o.ring + '" stroke-width="3"/>' +
      '<circle cx="60" cy="60" r="49" fill="none" stroke="' + o.ring + '" stroke-width="1.6" stroke-dasharray="2 6" opacity=".85"/>' +
      o.body +
      '<ellipse cx="42" cy="31" rx="24" ry="10" fill="#fff" opacity=".26"/>' +
      eye(lx) + eye(rx) +
      '<path d="M' + (cx - 6) + ' ' + my + ' Q' + cx + ' ' + (my + 7) + ' ' + (cx + 6) + ' ' + my +
      '" fill="none" stroke="#3a271c" stroke-width="2.8" stroke-linecap="round"/>' +
      '<ellipse cx="' + (lx - 9) + '" cy="' + by + '" rx="7" ry="4" fill="#e9524a" opacity=".42"/>' +
      '<ellipse cx="' + (rx + 9) + '" cy="' + by + '" rx="7" ry="4" fill="#e9524a" opacity=".42"/>' +
      '</svg>';
  }
  // 第 1 周目沿用最早的三位（存档 id 0/1/2 完全兼容），第 2～6 周目是新的元素主题
  var NEW_MASCOTS = [
    // —— 第 2 周目 · 五行 ——
    { name: '阿芽', kind: '木 · 小苗', dot: '芽', sign: '五行 · 木', theme: 1,
      words: '第二回支摊，你没急着把火烧旺。先把根扎稳，苗自己会往上顶——慢一点也长。',
      bg: '#e7f6d8', ring: '#8fbe6c', ey: 66, my: 76, by: 72,
      body: '<path d="M28 92 L92 92 L86 106 L34 106 Z" fill="#8a5a34" stroke="#3a271c" stroke-width="3" stroke-linejoin="round"/>' +
        '<path d="M60 88 C40 88 32 74 32 58 C32 40 44 28 60 28 C76 28 88 40 88 58 C88 74 80 88 60 88 Z" fill="#8ed36b" stroke="#3a271c" stroke-width="3"/>' +
        '<path d="M60 30 Q52 18 40 16 Q44 30 60 34 Z" fill="#4fae56" stroke="#3a271c" stroke-width="2.5"/>' +
        '<path d="M60 30 Q68 18 80 16 Q76 30 60 34 Z" fill="#4fae56" stroke="#3a271c" stroke-width="2.5"/>' +
        '<path d="M60 34 L60 50" stroke="#3a271c" stroke-width="2.5" stroke-linecap="round"/>' },
    { name: '阿汐', kind: '水 · 水滴', dot: '汐', sign: '五行 · 水', theme: 1,
      words: '客人像水，赶是赶不来的。你把摊摆顺了，他们自然绕过来。',
      bg: '#dff2fb', ring: '#6fb6d8', ey: 68, my: 78, by: 74,
      body: '<path d="M60 16 C60 16 88 50 88 68 C88 84 76 94 60 94 C44 94 32 84 32 68 C32 50 60 16 60 16 Z" fill="#5fb8e6" stroke="#3a271c" stroke-width="3" stroke-linejoin="round"/>' +
        '<path d="M40 84 Q50 78 60 84 Q70 90 80 84" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".85"/>' +
        '<path d="M44 46 Q50 40 56 46" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/>' },
    { name: '阿墩', kind: '土 · 陶罐', dot: '墩', sign: '五行 · 土', theme: 1,
      words: '走到这一步，靠的不是哪晚手气好。是那几晚你没乱改主意，一筐一筐攒出来的。',
      bg: '#f7ead4', ring: '#c9a274', ey: 70, my: 80, by: 76,
      body: '<path d="M34 44 L86 44 L82 92 Q60 100 38 92 Z" fill="#c88b52" stroke="#3a271c" stroke-width="3" stroke-linejoin="round"/>' +
        '<rect x="30" y="36" width="60" height="12" rx="5" fill="#e0aa6b" stroke="#3a271c" stroke-width="3"/>' +
        '<path d="M40 58 L80 58" stroke="#a4703c" stroke-width="2.5" stroke-linecap="round"/>' },
    // —— 第 3 周目 · 天气 ——
    { name: '阿风', kind: '风 · 旋风', dot: '风', sign: '天气 · 风', theme: 2,
      words: '风向变得快，你学会了先看一眼再动。这一年，风没再把你吹偏。',
      bg: '#e2f7f1', ring: '#6bc3ac', ey: 66, my: 76, by: 72,
      body: '<path d="M34 54 Q34 32 60 32 Q86 32 86 54 L86 74 Q86 94 60 94 Q34 94 34 74 Z" fill="#9be6d2" stroke="#3a271c" stroke-width="3"/>' +
        '<path d="M18 44 Q28 38 36 42 M84 42 Q92 38 102 44 M20 80 Q28 84 34 82" fill="none" stroke="#3a271c" stroke-width="3" stroke-linecap="round"/>' +
        '<path d="M42 46 Q48 40 54 46" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>' },
    { name: '阿雷', kind: '雷 · 云闪', dot: '雷', sign: '天气 · 雷', theme: 2,
      words: '最慌的那一晚你也没跟着人群跑。雷响完，摊上的灯还亮着。',
      bg: '#eee6fb', ring: '#a98ad6', ey: 50, my: 59, by: 56,
      body: '<path d="M32 70 Q22 70 24 58 Q26 46 40 46 Q42 30 60 30 Q78 30 80 46 Q94 46 96 58 Q98 70 88 70 Z" fill="#b9a6dc" stroke="#3a271c" stroke-width="3" stroke-linejoin="round"/>' +
        '<path d="M58 68 L48 86 L58 86 L52 106 L74 80 L62 80 L70 68 Z" fill="#ffd45e" stroke="#3a271c" stroke-width="2.5" stroke-linejoin="round"/>' },
    { name: '阿雪', kind: '雪 · 雪团', dot: '雪', sign: '天气 · 雪', theme: 2,
      words: '冷清的夜里只剩几个熟客，你照样把锅烧热。他们记住的不是味道，是你没收摊。',
      bg: '#e8f4ff', ring: '#8fbee0', ey: 64, my: 74, by: 70,
      body: '<circle cx="60" cy="62" r="34" fill="#f4fbff" stroke="#3a271c" stroke-width="3"/>' +
        '<path d="M60 20 L60 32 M52 26 L68 26 M55 23 L65 29 M65 23 L55 29" stroke="#7fb9e0" stroke-width="2.5" stroke-linecap="round"/>' +
        '<path d="M24 44 L32 48 M96 44 L88 48" stroke="#7fb9e0" stroke-width="2.5" stroke-linecap="round"/>' +
        '<path d="M40 92 Q60 100 80 92" fill="none" stroke="#cfe6f7" stroke-width="3" stroke-linecap="round"/>' },
    // —— 第 4 周目 · 夜市吃食 ——
    { name: '阿串', kind: '签 · 串串', dot: '串', sign: '夜市 · 串', theme: 3,
      words: '一把签子数得清，人心数不清。你现在两样都心里有数了。',
      bg: '#fff0d9', ring: '#e8b06c', ey: 62, my: 70, by: 66,
      body: '<rect x="56" y="14" width="8" height="94" rx="3" fill="#c99a63" stroke="#3a271c" stroke-width="2.5"/>' +
        '<rect x="40" y="32" width="40" height="16" rx="7" fill="#ff8b3d" stroke="#3a271c" stroke-width="3"/>' +
        '<rect x="40" y="52" width="40" height="16" rx="7" fill="#e9524a" stroke="#3a271c" stroke-width="3"/>' +
        '<rect x="40" y="72" width="40" height="16" rx="7" fill="#ffc93c" stroke="#3a271c" stroke-width="3"/>' },
    { name: '阿椒', kind: '辣 · 红椒', dot: '椒', sign: '夜市 · 辣', theme: 3,
      words: '有人爱辣有人怕，你不再一锅端。替客人多想那一口，回头客就多一双筷。',
      bg: '#ffe6e2', ring: '#e08a7c', ey: 68, my: 78, by: 74,
      body: '<path d="M60 30 Q88 34 86 62 Q84 92 60 98 Q36 92 34 62 Q32 34 60 30 Z" fill="#e9524a" stroke="#3a271c" stroke-width="3"/>' +
        '<path d="M60 30 Q56 20 62 14" fill="none" stroke="#3a271c" stroke-width="3" stroke-linecap="round"/>' +
        '<path d="M60 22 Q72 16 78 20 Q72 28 60 28 Z" fill="#4fae56" stroke="#3a271c" stroke-width="2.5"/>' +
        '<path d="M42 44 Q48 40 52 44" fill="none" stroke="#ffb3a7" stroke-width="3" stroke-linecap="round"/>' },
    { name: '阿汤', kind: '汤 · 暖碗', dot: '汤', sign: '夜市 · 汤', theme: 3,
      words: '汤要慢慢煨，摊要慢慢守。急着揭盖的那几回，都熬成经验了。',
      bg: '#fff3dc', ring: '#e0b878', ey: 72, my: 82, by: 78,
      body: '<path d="M48 26 Q42 18 48 12 M60 24 Q54 16 60 8 M72 26 Q66 18 72 12" fill="none" stroke="#e0a45e" stroke-width="2.5" stroke-linecap="round"/>' +
        '<path d="M22 54 Q22 96 60 96 Q98 96 98 54 Z" fill="#f3d9a8" stroke="#3a271c" stroke-width="3" stroke-linejoin="round"/>' +
        '<ellipse cx="60" cy="54" rx="38" ry="9" fill="#ffb85e" stroke="#3a271c" stroke-width="3"/>' +
        '<rect x="18" y="48" width="84" height="10" rx="5" fill="#fff0cf" stroke="#3a271c" stroke-width="3"/>' },
    // —— 第 5 周目 · 街头小动物 ——
    { name: '阿喵', kind: '橘猫', dot: '喵', sign: '街巷 · 猫', theme: 4,
      words: '巷口那只猫又来了，蹲在你脚边不走。它挑地方，比谁都挑。',
      bg: '#ffeed8', ring: '#e8a86c', ey: 64, my: 74, by: 70,
      body: '<path d="M32 46 L36 20 L52 34 Z" fill="#ff9f45" stroke="#3a271c" stroke-width="3" stroke-linejoin="round"/>' +
        '<path d="M88 46 L84 20 L68 34 Z" fill="#ff9f45" stroke="#3a271c" stroke-width="3" stroke-linejoin="round"/>' +
        '<circle cx="60" cy="62" r="34" fill="#ffb25e" stroke="#3a271c" stroke-width="3"/>' +
        '<path d="M18 68 L36 66 M18 76 L36 74 M102 68 L84 66 M102 76 L84 74" stroke="#3a271c" stroke-width="2.5" stroke-linecap="round"/>' },
    { name: '阿汪', kind: '垂耳狗', dot: '汪', sign: '街巷 · 犬', theme: 4,
      words: '收摊最晚的那几夜，只有它陪你走回去。街空了，倒不觉得冷。',
      bg: '#f7e8d8', ring: '#c99a72', ey: 56, my: 66, by: 62,
      body: '<ellipse cx="32" cy="60" rx="12" ry="24" fill="#8a5836" stroke="#3a271c" stroke-width="3"/>' +
        '<ellipse cx="88" cy="60" rx="12" ry="24" fill="#8a5836" stroke="#3a271c" stroke-width="3"/>' +
        '<circle cx="60" cy="60" r="34" fill="#c68d59" stroke="#3a271c" stroke-width="3"/>' +
        '<ellipse cx="60" cy="80" rx="15" ry="10" fill="#f3ddbe" stroke="#3a271c" stroke-width="2.5"/>' },
    { name: '阿鲤', kind: '锦鲤', dot: '鲤', sign: '街巷 · 鲤', theme: 4,
      words: '有人说是运气。你知道不是——那一晚你多备了十签，刚好接住了整条街。',
      bg: '#ffe9e4', ring: '#e6907e', ey: 62, my: 72, by: 68,
      body: '<path d="M28 60 Q44 30 68 36 Q92 42 96 60 Q92 78 68 84 Q44 90 28 60 Z" fill="#ff8b5e" stroke="#3a271c" stroke-width="3"/>' +
        '<path d="M28 60 L12 42 L14 78 Z" fill="#e9524a" stroke="#3a271c" stroke-width="2.5" stroke-linejoin="round"/>' +
        '<path d="M62 36 Q70 24 80 28" fill="none" stroke="#ffc93c" stroke-width="4" stroke-linecap="round"/>' +
        '<circle cx="98" cy="26" r="3" fill="#8fd0e8" opacity=".8"/>' },
    // —— 第 6 周目 · 夜色珍宝 ——
    { name: '阿月', kind: '月 · 圆月', dot: '月', sign: '夜色 · 月', theme: 5,
      words: '月亮照过你第一晚的手忙脚乱，也照着现在这个不慌不忙的你。',
      bg: '#f0e9ff', ring: '#b19ada', ey: 66, my: 76, by: 72,
      body: '<circle cx="60" cy="60" r="38" fill="#ffe08a" stroke="#3a271c" stroke-width="3"/>' +
        '<circle cx="40" cy="44" r="7" fill="#f2c766" opacity=".6"/>' +
        '<circle cx="78" cy="74" r="5" fill="#f2c766" opacity=".6"/>' +
        '<path d="M96 20 L99 28 L107 30 L99 33 L96 41 L93 33 L85 30 L93 28 Z" fill="#fff3c9" stroke="#3a271c" stroke-width="2"/>' },
    { name: '阿星', kind: '星 · 星子', dot: '星', sign: '夜色 · 星', theme: 5,
      words: '抬头才发现，这条街的灯比星星还密。有一盏是你自己点起来的。',
      bg: '#e8ecff', ring: '#8f9ee0', ey: 60, my: 70, by: 66,
      body: '<path d="M60 16 L72 46 L104 50 L80 70 L88 102 L60 84 L32 102 L40 70 L16 50 L48 46 Z" fill="#9aa8ef" stroke="#3a271c" stroke-width="3" stroke-linejoin="round"/>' +
        '<circle cx="100" cy="20" r="3" fill="#ffd45e"/><circle cx="22" cy="24" r="2.5" fill="#ffd45e"/>' },
    { name: '阿玉', kind: '玉 · 元宝', dot: '玉', sign: '夜色 · 玉', theme: 5,
      words: '转到这一回，赚多少已经不是最要紧的。你把一件小事，做成了自己的样子。',
      bg: '#e2f6ee', ring: '#7cc4a8', ey: 78, my: 87, by: 84,
      body: '<path d="M20 66 Q34 44 60 44 Q86 44 100 66 Q100 92 60 94 Q20 92 20 66 Z" fill="#7fd6b4" stroke="#3a271c" stroke-width="3" stroke-linejoin="round"/>' +
        '<path d="M36 54 Q60 40 84 54" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".75"/>' +
        '<circle cx="60" cy="62" r="10" fill="#e8fff5" stroke="#3a271c" stroke-width="2.5"/>' }
  ].map(function (o) { o.art = mascotArt(o); return o; });

  var MASCOT_SETS = [
    { theme: '灶火 · 起摊', list: MASCOTS },
    { theme: '五行 · 木水土', list: NEW_MASCOTS.slice(0, 3) },
    { theme: '天气 · 风雷雪', list: NEW_MASCOTS.slice(3, 6) },
    { theme: '夜市 · 串辣汤', list: NEW_MASCOTS.slice(6, 9) },
    { theme: '街巷 · 猫犬鲤', list: NEW_MASCOTS.slice(9, 12) },
    { theme: '夜色 · 月星玉', list: NEW_MASCOTS.slice(12, 15) }
  ];
  // 解锁 id = (周目-1)*3 + 段号；第 1 周目仍是 0/1/2，旧存档无缝兼容
  function mascotId(cycle, stage) { return (Math.max(1, cycle || 1) - 1) * 3 + stage; }
  function mascotFor(id) {
    var gi = Math.floor(id / 3), turn = Math.floor(gi / MASCOT_SETS.length);
    var set = MASCOT_SETS[gi % MASCOT_SETS.length];
    var m = set.list[id % 3];
    if (turn === 0) return m;
    // 第 7 周目起：元素形象循环，但盖一枚金色「传」章、名字带转数，仍是新的一位
    var art = m.art.replace('</svg>',
      '<circle cx="96" cy="96" r="13" fill="#ffc93c" stroke="#3a271c" stroke-width="2.5"/>' +
      '<text x="96" y="101" text-anchor="middle" font-size="13" font-weight="900" fill="#7a3a10">传</text></svg>');
    return { name: m.name + '·' + (CN[Math.min(turn + 1, 10)] || (turn + 1)) + '转',
      kind: m.kind, dot: m.dot, sign: m.sign, words: m.words, art: art };
  }
  function mascotGroupCount() { return Math.max(MASCOT_SETS.length, SAVE.maxCycle || 1); }
  function mascotTotal() { return mascotGroupCount() * 3; }

  var WEATHERS = [
    { name: '晴', icon: '🌙', mul: 1.00, line: '今晚晴，出门逛的人不少' },
    { name: '阴', icon: '☁️', mul: 0.95, line: '天阴着，出来的人略少一点' },
    { name: '小雨', icon: '🌧️', mul: 0.85, line: '下点小雨，伞收了一半' },
    { name: '暴雨', icon: '⛈️', mul: 0.62, line: '雨往下倒，只剩几个熟客蹚水来' }
  ];
  var EVENTS = [
    { name: '游客高峰', icon: '🚌', mul: 1.35, up: true, line: '琅琊山下来一车游客，导游举着旗子在找摊位' },
    { name: '演唱会散场', icon: '🎤', mul: 1.30, up: true, line: '隔壁广场演唱会散了场，人潮举着荧光棒涌过来' },
    { name: '工地赶工', icon: '👷', mul: 1.20, up: true, line: '工地十一点才下班，工友下班就往夜市钻' },
    { name: '发工资', icon: '💰', mul: 1.18, up: true, line: '电子厂今天发工资，工友群里在约宵夜' },
    { name: '大闸蟹到货', icon: '🦀', mul: 1.15, up: true, line: '女山湖大闸蟹到货，来吃夜宵的人多一截' },
    { name: '隔壁降价', icon: '🏷️', mul: 0.86, up: false, line: '隔壁老王把价牌改小了，抢走几个客' },
    { name: '小区查燃气', icon: '🏚️', mul: 0.72, up: false, line: '前面小区提前熄了灯，路上空得能听见脚步' },
    { name: '整条街停电', icon: '🕯️', mul: 0.60, up: false, line: '变压器烧了，半条街都黑了，炉子点不着' }
  ];
  var MASTER_LINES = [
    '我拍脑袋搭的模型，别当准信——先试一晚',
    '这几个数我还虚着，你去街上数一晚才准',
    '比上回有底了，不过我也会看走眼',
    '这条街的脾气我摸着一点了，误差还有',
    '差不多，别全照我说的押',
    '数我蹲过了，可这行当总有意外',
    '我心里有数，你还是自己下去数数'
  ];
  var OLD_LINES = [
    '二十年了，这条街几点上人我清楚。他那模型？你先试一晚就懂了。',
    '别的不敢说，这条街的人几点来，我比他清楚。',
    '他那几个数虚得很，你自己掂量。',
    '我摆了二十年摊，没见过跟降价能长久的。',
    '队排到摊前没货，比剩几串亏得多。',
    '押多押少差几签，一晚上就明白了。'
  ];
  var OLD_HINT = {
    chill:  '我看今晚来的多半是外地客、刚发工资的，不太计较价。',
    normal: '今晚客人会看价牌，别涨太狠。',
    picky:  '今晚净是熟客和学生，价一动他们就往隔壁去。'
  };
  var QUIPS = {
    perfect: ['一签不多一签不少，锅底朝天！', '街坊开始认你这个摊了，微信上多了几个要订座的。'],
    leftover: ['多备的那几签全进了泔水桶——押多比押少贵，这一晚够记一辈子。', '案板上剩了一堆，明晚往下挪一档。'],
    shortage: ['队排到摊前你断了货，少做的生意补不回来，老客也散了几个。', '客人还在队里锅就空了，明晚往上押一档。'],
    normal: ['差几签不打紧，明晚照这个差调一档就行。', '这晚不算神，也不算糊，接着来。']
  };

  var TITLES = [
    { name: '夜市一霸', icon: '👑', desc: '这条街的深夜，一半人是冲你这口锅来的', test: function (s) { return s.totalProfit >= 900 && s.accurate >= 5; } },
    { name: '抬价高手', icon: '🏷️', desc: '价牌往上挪一寸，比多备十签赚得多', test: function (s) { return s.priceGain >= 300; } },
    { name: '满堂彩常客', icon: '🎆', desc: '价和量一起押准，锅底朝天好几回', test: function (s) { return s.jackpots >= 3; } },
    { name: '军师的乖学生', icon: '🎓', desc: '他报多少你押多少——听话确实能赚钱', test: function (s) { return s.accurate >= 5; } },
    { name: '账是正的', icon: '🧾', desc: '不算暴富，但每一分都是你亲手挣的', test: function (s) { return s.totalProfit >= 500; } },
    { name: '夜市活菩萨', icon: '🫶', desc: '客人吃得开心，你的钱包替他们开心', test: function (s) { return s.shortageNights >= 3; } },
    { name: '保守派摊主', icon: '🛡️', desc: '宁可少赚，绝不压货——锅里从来剩不下几串', test: function (s) { return s.leftoverNights >= 3; } },
    { name: '夜市愣头青', icon: '🌶️', desc: '军师说东你偏西，就差老摊主那点运气', test: function (s) { return s.accurate === 0 && s.avgDiff > 35; } },
    { name: '凭手感出摊', icon: '🎲', desc: '押多少看心情，赚多少看天气', test: function (s) { return s.accurate <= 1; } },
    { name: '自成一派的老江湖', icon: '🏮', desc: '军师的数只是参考，你自己的账本才是军师', test: function () { return true; } }
  ];

  var COLLECTION = [
    { icon: '🌶️', name: '红油底料', cond: '完成 1 局', ok: function (s) { return s.plays >= 1; } },
    { icon: '🍢', name: '秘制毛肚', cond: '单局押准 3 晚', ok: function (s) { return s.maxAcc >= 3; } },
    { icon: '🏮', name: '霓虹灯牌', cond: '单局净利 ¥500', ok: function (s) { return s.maxProfit >= 500; } },
    { icon: '🥢', name: '老客图鉴', cond: '完成 3 局', ok: function (s) { return s.plays >= 3; } },
    { icon: '🦀', name: '大闸蟹招牌', cond: '单局押准 5 晚', ok: function (s) { return s.maxAcc >= 5; } },
    { icon: '🛺', name: '加长摊车', cond: '完成 5 局', ok: function (s) { return s.plays >= 5; } },
    { icon: '👑', name: '夜市一霸匾', cond: '拿下【夜市一霸】', ok: function (s) { return s.titles.indexOf('夜市一霸') >= 0; } },
    { icon: '🎆', name: '收摊烟花', cond: '拿下 3 个称号', ok: function (s) { return s.titles.length >= 3; } },
    { icon: '🧧', name: '开张红包', cond: '单局净利 ¥800', ok: function (s) { return s.maxProfit >= 800; } },
    { icon: '🔥', name: '回头客灯', cond: '连续开张 3 天', ok: function (s) { return (s.streak || 0) >= 3; } },
    { icon: '🎆', name: '满堂彩匾', cond: '累计 5 次满堂彩', ok: function (s) { return (s.totalJackpots || 0) >= 5; } },
    { icon: '🪙', name: '攒钱罐', cond: '攒够 100 夜市币', ok: function (s) { return (s.coins || 0) >= 100; } }
  ];

  var RIVAL_NAMES = ['隔壁老王', '街口阿香', '推车老李', '夜市新人小周'];

  // ==================== 存档 ====================
  function defaultSave() {
    return { best: 0, bestTitle: '', plays: 0, maxAcc: 0, maxProfit: 0,
      todayKey: '', todayBest: 0, unlocked: [], titles: [], muted: false, bgm: true, doneTutorial: false,
      stage: 0, stageBest: [0, 0, 0], cleared: false, bestNight: 0, bestCombo: 0,
      mascots: [], cycle: 1, maxCycle: 1, clears: 0, cycleBest: [],
      lastDay: '', streak: 0, coins: 0, totalNights: 0, totalJackpots: 0, tries: 0 };
  }
  var SAVE = (function () {
    try { return Object.assign(defaultSave(), JSON.parse(localStorage.getItem(KEY) || '{}')); }
    catch (e) { return defaultSave(); }
  })();
  // 旧版「全通后停在 cleared=true」= 第 1 周目三段全通。
  // 必须先补齐该周目应得的 3 位吉祥物，才有资格进入第 2 周目。
  if (SAVE.cleared && !(SAVE.cycle > 1)) {
    SAVE.clears = Math.max(SAVE.clears || 0, 1);
    SAVE.cycle = 2; SAVE.maxCycle = Math.max(SAVE.maxCycle || 1, 2);
    SAVE.cleared = false; SAVE.stage = 0; SAVE.stageBest = [0, 0, 0];
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(SAVE)); } catch (e) {} }

  // ==================== 周目门槛 & 吉祥物永久保底 ====================
  // clears = 已经「三段全通」的周目数；合法的最大周目只能是 clears + 1。
  // 周目编号不允许被旧存档、异常数据或跳级操作抬高：没过完上一周目就进不去下一周目。
  function cycleCeiling() { return Math.max(1, (SAVE.clears || 0) + 1); }
  // 吉祥物永远留在摊上：已全通的周目 3 位一只都不能少；已拿过的一只都不删。
  // 启动即校正并写回一次，之后任何结算都不再清空这个数组。
  function ensureMascots() {
    if (!SAVE.mascots) SAVE.mascots = [];
    for (var c = 1; c <= (SAVE.clears || 0); c++) {
      for (var s = 0; s < STAGES.length; s++) {
        var id = mascotId(c, s);
        if (SAVE.mascots.indexOf(id) < 0) SAVE.mascots.push(id);
      }
    }
    // 当前周目已通过的段也补齐（跨局存档异常时不丢）
    var cur = SAVE.cycle || 1, done = Math.min(STAGES.length, SAVE.stage || 0);
    for (var s2 = 0; s2 < done; s2++) {
      var id2 = mascotId(cur, s2);
      if (SAVE.mascots.indexOf(id2) < 0) SAVE.mascots.push(id2);
    }
    SAVE.mascots.sort(function (a, b) { return a - b; });
  }
  // 门槛校正：没过完上一周目，绝不允许待在更高的周目
  var ceilNow = cycleCeiling();
  if ((SAVE.cycle || 1) > ceilNow) {
    SAVE.cycle = ceilNow; SAVE.stage = 0; SAVE.stageBest = [0, 0, 0];
  }
  SAVE.maxCycle = Math.max(SAVE.maxCycle || 1, SAVE.cycle || 1);
  ensureMascots();
  save();

  // ==================== 随机 ====================
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function hashStr(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function todayKey() {
    var d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }

  // ==================== 音效 ====================
  var actx = null;
  function tone(freq, dur, type, vol, delay) {
    if (SAVE.muted) return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!actx) actx = new AC();
      if (actx.state === 'suspended') actx.resume();
      var o = actx.createOscillator(), g = actx.createGain();
      o.type = type || 'sine'; o.frequency.value = freq;
      o.connect(g); g.connect(actx.destination);
      var t = actx.currentTime + (delay || 0);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.07, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.start(t); o.stop(t + dur + 0.03);
    } catch (e) {}
  }
  // 夜市吆喝滑音：与 BGM 里的筚篥拖腔同款，开张时"哎——来瞧嘞"一下
  function holler(f0, f1, dur, vol, delay) {
    if (SAVE.muted) return;
    try {
      var AC2 = window.AudioContext || window.webkitAudioContext;
      if (!AC2) return;
      if (!actx) actx = new AC2();
      if (actx.state === 'suspended') actx.resume();
      var o = actx.createOscillator(), g = actx.createGain(), lp = actx.createBiquadFilter();
      o.type = 'sawtooth'; lp.type = 'lowpass'; lp.frequency.value = 1500;
      var t = actx.currentTime + (delay || 0);
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.72);
      o.frequency.exponentialRampToValueAtTime(f1 * 0.94, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.045, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(lp); lp.connect(g); g.connect(actx.destination);
      o.start(t); o.stop(t + dur + 0.03);
    } catch (e) {}
  }
  var sfx = {
    tick: function () { tone(680, 0.05, 'square', 0.035); },
    open: function () { tone(170, 0.3, 'triangle', 0.09); holler(392, 784, 0.34, 0.034); },
    pop: function () { tone(520, 0.09, 'sine', 0.06); },
    coin: function () { tone(880, 0.12, 'sine', 0.06); tone(1320, 0.16, 'sine', 0.05, 0.08); },
    win: function () { tone(660, 0.1, 'sine', 0.07); tone(880, 0.1, 'sine', 0.07, 0.1); tone(1170, 0.2, 'sine', 0.07, 0.2); },
    bad: function () { tone(230, 0.28, 'sawtooth', 0.045); },
    click: function () { tone(440, 0.06, 'sine', 0.04); },
    reward: function () { tone(760, 0.08, 'sine', 0.05); tone(1040, 0.12, 'sine', 0.05, 0.07); },
    combo: function (n) {
      var f = 620 + Math.min(n, 7) * 70;
      tone(f, 0.09, 'square', 0.05); tone(f * 1.25, 0.10, 'sine', 0.05, 0.08);
      tone(f * 1.5, 0.16, 'sine', 0.06, 0.16);
    },
    jackpot: function () {
      [523, 659, 784, 1047, 1319].forEach(function (f, i) {
        tone(f, 0.30, 'triangle', 0.07, i * 0.085);
      });
      tone(1568, 0.55, 'sine', 0.06, 0.44);
    },
    record: function () {
      [784, 988, 1175, 1568].forEach(function (f, i) { tone(f, 0.22, 'sine', 0.07, i * 0.09); });
    },
    fanfare: function () {
      [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.26, 'triangle', 0.07, i * 0.11); });
      tone(1047, 0.6, 'sine', 0.06, 0.46);
    }
  };

  // ==================== 背景音乐 ====================
  // 原创盛唐长安夜市「魔性洗脑」循环曲：唐燕乐七声 + 短动机反复 + 附点切分 +
  // 四小节一升调 + 全体抽空砸锣 + 筚篥吆喝拖腔。曲项琵琶 / 羯鼓 / 拍手 / 铜钹 / 驼铃。
  // 本地 mp3，无外链、无版权依赖；?bgm=alt 可切换备选曲目。
  // 与音效分开控制：SAVE.muted 管音效，SAVE.bgm 管音乐。
  var BGM_ALT = /[?&]bgm=alt(?:&|$)/.test(location.search);
  var BGM_NAME = BGM_ALT ? '胡旋蹦灯调' : '西市上头鼓';
  var bgm = (function () {
    var audio = null;
    function el() {
      if (audio) return audio;
      try {
        var bgmFile = BGM_ALT ? 'bgm_alt.mp3' : 'bgm.mp3';
        // 带分享码走发布域校验，再挂版本号：换曲后不会一直播浏览器缓存里的旧 mp3
        audio = new Audio(bgmFile + location.search + (location.search ? '&' : '?') + 'v=20261115o');
        audio.loop = true;
        audio.preload = 'auto';
        audio.volume = 0.20;
        audio.style.display = 'none';
        document.body.appendChild(audio);   // 挂到 DOM，兼容老版内核
      } catch (e) { return null; }
      return audio;
    }
    function play() {
      if (SAVE.bgm === false) return;
      try {
        var a = el(); if (!a) return;
        var p = a.play();
        if (p && p.catch) p.catch(function () {});
      } catch (e) {}
    }
    function pause() { if (audio) { try { audio.pause(); } catch (e) {} } }
    function toggle() {
      SAVE.bgm = !(SAVE.bgm !== false);
      save();
      if (SAVE.bgm) play(); else pause();
      render();
      toast(SAVE.bgm ? '背景音乐已开 · 《' + BGM_NAME + '》' : '背景音乐已关');
    }
    return { play: play, pause: pause, toggle: toggle };
  })();
  var bgmKicked = false;
  function kickBgm() {                 // 自动播放策略：首次用户手势后才出声
    if (bgmKicked) return;
    bgmKicked = true;
    if (SAVE.bgm !== false) bgm.play();
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) bgm.pause();
    else if (SAVE.bgm !== false && bgmKicked) bgm.play();
  });

  // ==================== 工具 ====================
  var $ = function (id) { return document.getElementById(id); };
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  var toastTimer = null;
  function toast(msg) {
    var el = $('toast'); el.textContent = msg; el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 1900);
  }
  // 把 emoji 统一换成「彩色汉字徽章」：老旧 PC / 机房浏览器常缺 emoji 字体，会显示成方框
  var EM = {
    '🌙':'晴','☁':'阴','🌧':'雨','⛈':'暴','🚌':'客','🎤':'演','👷':'工','💰':'钱',
    '🦀':'蟹','🏷':'价','🏚':'空','🕯':'暗','👑':'霸','🎓':'学','🧾':'账','🫶':'善',
    '🛡':'稳','🌶':'辣','🎲':'猜','🏮':'摊','🍢':'串','🥢':'筷','🛺':'车','🎆':'花',
    '🧧':'包','🔥':'火','🗣':'街','🤖':'师','👴':'翁','👉':'→','📅':'日','👥':'双',
    '🏆':'冠','📤':'发','🏠':'家','🎉':'彩','😅':'汗','🤝':'平','👀':'看','📜':'卷',
    '✅':'对','🪙':'¥'
  };
  function deEmoji(html) {
    return String(html).replace(/\uFE0F/g, '').replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu,
      function (ch) {
        if (ch === '★' || ch === '☆') return ch;   // 口碑星保留
        return EM[ch] ? '<em class="ic">' + EM[ch] + '</em>' : '';
      });
  }
  function pick(arr, rnd) { return arr[Math.floor(rnd() * arr.length) % arr.length]; }
  // 线索固定价：开局 ¥50 刚好够买满 5 次，次数上限才是硬约束。
  // 段间难度改由跑腿趟数(runs) / 传言真假率 / 军师偏差体现，不再靠涨价。
  function clueCost(c) { return c.cost; }
  function round5(n) { return Math.round(n / 5) * 5; }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function money(n) { return (n >= 0 ? '+¥' : '-¥') + Math.abs(Math.round(n)); }


  // ==================== 高光 / 刺激反馈引擎 ====================
  // 全部是纯视觉层，pointer-events:none，绝不挡按钮点击；自动清理，不留 DOM 垃圾。
  function fxLayer() {
    var el = $('fx');
    if (!el) {
      el = document.createElement('div');
      el.id = 'fx'; el.className = 'fx-layer';
      document.body.appendChild(el);
    }
    return el;
  }
  function confetti(kind, n) {
    var L = fxLayer();
    var colors = kind === 'fire'
      ? ['#ffd45e', '#ff8b3d', '#e9524a', '#fff2d8']
      : ['#ffd45e', '#ff9f3d', '#38c6b4', '#e9524a', '#fff2d8', '#a06bd6'];
    for (var i = 0; i < n; i++) {
      var s = document.createElement('i');
      s.className = 'fx-petal' + (i % 4 === 0 ? ' round' : '');
      s.style.left = (4 + Math.random() * 92) + '%';
      s.style.background = colors[i % colors.length];
      s.style.animationDelay = (Math.random() * 0.45) + 's';
      s.style.animationDuration = (1.15 + Math.random() * 0.8) + 's';
      s.style.setProperty('--spin', (Math.random() * 720 - 360) + 'deg');
      L.appendChild(s);
      (function (node) {
        setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 2700);
      })(s);
    }
  }
  function shake() {
    var a = $('app');
    if (!a) return;
    a.classList.remove('fx-shake');
    void a.offsetWidth;
    a.classList.add('fx-shake');
    setTimeout(function () { a.classList.remove('fx-shake'); }, 520);
  }
  function flash(title, sub, kind, topPct, hold) {
    var L = fxLayer(), box = document.createElement('div');
    box.className = 'fx-flash fx-' + (kind || 'gold');
    box.innerHTML = '<b>' + title + '</b>' + (sub ? '<i>' + sub + '</i>' : '');
    box.style.top = (topPct || 32) + '%';
    L.appendChild(box);
    var h = hold || 1050;
    setTimeout(function () { box.classList.add('out'); }, h);
    setTimeout(function () { if (box.parentNode) box.parentNode.removeChild(box); }, h + 500);
  }
  function screenGlow(kind) {
    var L = fxLayer(), g = document.createElement('div');
    g.className = 'fx-glow fx-glow-' + (kind || 'gold');
    L.appendChild(g);
    setTimeout(function () { if (g.parentNode) g.parentNode.removeChild(g); }, 900);
  }
  // 数字从 0 滚到目标值，比直接拍一个数字刺激得多
  function countUp(el, to, dur) {
    if (!el) return;
    el.dataset.value = String(to);
    var neg = to < 0, end = Math.abs(to), t0 = null, D = dur || 620;
    function step(ts) {
      if (t0 === null) t0 = ts;
      var k = Math.min(1, (ts - t0) / D);
      var e = 1 - Math.pow(1 - k, 3);
      var v = Math.round(end * e);
      el.textContent = (neg ? '-¥' : '+¥') + v;
      if (k < 1) requestAnimationFrame(step);
      else el.textContent = (neg ? '-¥' : '+¥') + end;
    }
    requestAnimationFrame(step);
  }
  // 每晚评级：即使亏钱也不说「翻车」，用鼓励语把挫败感接住
  function rateNight(r, g, total) {
    if (total == null) total = r.profit + r.bonus + r.jackpotBonus;
    if (r.jackpot) return { key: 'jackpot', label: '满 堂 彩 !!', sub: '价和量全押对了，锅底朝天', cls: 'gold' };
    if (g.combo >= 3) return { key: 'combo', label: '连准 ×' + g.combo + ' !!', sub: '一晚比一晚准，街坊都认你了', cls: 'fire' };
    if (r.accurate && total > 0) return { key: 'nice', label: '漂 亮 !', sub: '一签不多一签不少', cls: 'orange' };
    if (total >= 0 && r.diff <= 25) return { key: 'steady', label: '稳 !', sub: '这晚收得漂亮', cls: 'teal' };
    if (total >= 0) return { key: 'ok', label: '还 行', sub: '钱是赚了，明晚再准一点', cls: 'teal' };
    return { key: 'soft', label: '别 急', sub: '明晚军师的数会更准，接着来', cls: 'soft' };
  }
  // 每晚即时奖励：不押准也有，避免「白玩一晚」
  function nightCoins(r, g) {
    var c = 2;
    if (r.accurate) c += 3;
    if (r.jackpot) c += 8;
    if (g.combo >= 2) c += Math.min(g.combo, 5);
    return c;
  }
  // 连续开张：跨天回来给一句招呼，只做展示与解锁，不改数值、不影响对战公平
  function touchStreak() {
    var tk = todayKey();
    if (SAVE.lastDay === tk) return SAVE.streak || 1;
    var y = new Date(Date.now() - 86400000);
    var yk = y.getFullYear() + '-' + (y.getMonth() + 1) + '-' + y.getDate();
    SAVE.streak = (SAVE.lastDay === yk) ? (SAVE.streak || 0) + 1 : 1;
    SAVE.lastDay = tk;
    return SAVE.streak;
  }

  // ==================== 生成 7 天 ====================
  // 关键改动：军师的区间围绕「有偏预测 guess」而不是真实客流，
  // 所以照抄军师不再等于押中答案，必须自己挖线索 / 看天气消息来判断。
  function makeWeek(seed, stage) {
    stage = clamp(stage || 0, 0, STAGES.length - 1);
    var cfg = STAGES[stage];
    var rnd = mulberry32((seed ^ (stage * 0x9e3779b9)) >>> 0), days = [];
    // 整周同向的系统偏差：玩两三晚就能察觉「军师这周一直报多/报少」，
    // 识破它比照抄更值钱，也是这版最核心的「别全信模型」体验。
    var weekBias = (rnd() < 0.5 ? -1 : 1) * cfg.bias * (0.85 + rnd() * 0.45);
    // 只给量级、不给精确签数：让玩家知道该往哪边调，但「挖数人头」依然值钱
    var biasAbs = Math.round(Math.abs(weekBias) * 90 / 5) * 5;
    var biasWord = biasAbs < 20 ? '十几签' : (biasAbs < 30 ? '二十几签'
      : (biasAbs < 40 ? '三十几签' : '四十来签'));
    for (var i = 0; i < DAYS; i++) {
      var w = pick(WEATHERS, rnd), ev = pick(EVENTS, rnd);
      var weekend = i >= 5;
      var cal = weekend ? 1.2 : 1;
      var float = 0.92 + rnd() * 0.16;
      var baseDemand = clamp(Math.round(100 * w.mul * ev.mul * cal * float), 45, 185);
      var er = rnd();
      var elastic = er < cfg.chill ? 'chill' : (er < 1 - cfg.picky ? 'normal' : 'picky');
      // 方向整周一致、幅度略收敛，再叠一点小噪声；照抄军师会稳定偏，玩家可自行修正
      var biasPct = weekBias * (1 - i * 0.045) + (rnd() * 2 - 1) * 0.045;
      var guess = clamp(round5(baseDemand * (1 + biasPct)), MIN_BET, MAX_BET);
      var spread = cfg.spread * (1 - i * 0.10);
      var masterLow = clamp(round5(guess * (1 - spread)), MIN_BET, MAX_BET);
      var masterHigh = clamp(round5(guess * (1 + spread)), MIN_BET, MAX_BET);
      var rumorTrue = rnd() < cfg.rumorRate;
      var opposite = EVENTS.filter(function (e) { return e.up !== ev.up; });
      var rumor = rumorTrue ? ev : pick(opposite, rnd);
      var rumorUp = rumorTrue ? ev.up : !ev.up;
      days.push({
        day: i + 1, weather: w, weekend: weekend, baseDemand: baseDemand,
        elastic: elastic, guess: guess, masterLow: masterLow, masterHigh: masterHigh,
        spread: spread, event: ev,
        biasHint: weekBias > 0
          ? '军师这周一直报多，大概多报了' + biasWord + '，照抄容易剩串，备货往下调'
          : '军师这周一直报少，大概少报了' + biasWord + '，照抄容易断货，备货往上调',
        masterLine: MASTER_LINES[i],
        oldLine: pick(OLD_LINES, rnd) + ' ' + OLD_HINT[elastic],
        rumorLine: rumor.line, rumorUp: rumorUp, rumorTrue: rumorTrue
      });
    }
    return days;
  }

  // ==================== 定价与结算 ====================
  // ¥3 时 factor 恒为 1，客流 = 基准客流，与旧版完全等价；
  // 抬价客少但每签毛利高，降价客多但毛利薄 —— 每晚是「备多少 × 卖多少钱」的二维决策。
  function priceFactor(price, elastic) {
    var s = (ELASTIC[elastic] || ELASTIC.normal).s;
    return clamp(1 - s * (price - DEFAULT_PRICE) / 3, 0.30, 1.35);
  }
  function effectiveDemand(d, price) {
    return clamp(Math.round(d.baseDemand * priceFactor(price, d.elastic)), 20, 260);
  }
  function calc(bet, price, d) {
    price = price || DEFAULT_PRICE;
    var D = effectiveDemand(d, price);
    var sold = Math.min(bet, D);
    var cost = bet * COST + FIXED;
    var profit = Math.round(sold * price - cost);
    var leftover = bet - sold, shortage = D - sold;
    var diff = Math.abs(bet - D);
    var accurate = diff <= 10;
    var starDelta = 0;
    if (leftover / bet > 0.15 || shortage > 25) starDelta = -1;
    else if (accurate) starDelta = 1;
    // 满堂彩：抬着价还押得准 = 价和量都判断对了
    var jackpot = (price >= 4 && accurate && leftover / bet <= 0.15) ? 1 : 0;
    // 同样备货按 ¥3 能赚多少，用来算「靠定价多赚了多少」
    var baseProfit = Math.round(Math.min(bet, effectiveDemand(d, DEFAULT_PRICE)) * DEFAULT_PRICE - cost);
    return { bet: bet, price: price, D: D, baseDemand: d.baseDemand, sold: sold,
      profit: profit, baseProfit: baseProfit, priceGain: profit - baseProfit,
      leftover: leftover, shortage: shortage, diff: diff, accurate: accurate,
      starDelta: starDelta, jackpot: jackpot, bonus: 0, jackpotBonus: 0 };
  }

  // ==================== 状态 ====================
  var screen = 'home';
  var G = null;
  var revealToken = 0;

  function newGame(mode, opts) {
    opts = opts || {};
    var stage = clamp(opts.stage != null ? opts.stage
      : (mode === 'solo' ? (SAVE.stage || 0) : 0), 0, STAGES.length - 1);
    var cycle = opts.cycle != null ? opts.cycle
      : (mode === 'solo' ? (SAVE.cycle || 1) : 1);
    // 门槛：没通关前置周目，任何入口都不能直接开更高周目
    if (mode === 'solo') cycle = Math.min(cycle, cycleCeiling());
    var seed = opts.seed != null ? opts.seed
      : (mode === 'daily' ? hashStr('daily-' + todayKey()) : (Math.random() * 1e9) | 0);
    var cm = mode === 'solo' ? cycleMul(cycle) : 1;
    G = {
      mode: mode, seed: seed, stage: stage, cycle: cycle, week: makeWeek(seed, stage), day: 0,
      cash: 0, stars: 3, combo: 0, bestCombo: 0,
      accurate: 0,
      totalProfit: 0, leftoverNights: 0, shortageNights: 0, diffSum: 0,
      history: [], bet: 100, price: DEFAULT_PRICE, lastResult: null, title: null,
      clueLeft: STAGES[stage].runs, clueLog: [], clueTotal: 0, jackpots: 0, priceGainSum: 0,
      intelCash: INTEL_START, clueBuys: 0, clueCountBuys: 0,
      buyMax: CLUE_BUY_MAX, countMax: CLUE_COUNT_MAX, topups: 0,
      bestNight: 0, nightTotals: [],
      foe: opts.foe || null, duelLink: '',
      rookie: (SAVE.plays === 0),
      miniGoals: [], hlShown: false, recordShown: false, pack: 0,
      miniHit: 0, nightCoinsSum: 0, cycleCoinBonus: 0, nextCycle: null
    };
    // 每晚一个够得着的小目标：让每晚上都有正反馈，而不是苦等 7 天的大结算
    for (var mi = 0; mi < DAYS; mi++) G.miniGoals.push(Math.round((80 + stage * 40 + mi * 8) * cm / 10) * 10);
    if (G.rookie) G.miniGoals[0] = 60;   // 首晚红包保底 ¥90，一定达得到
    if (mode === 'rival') G.foe = makeRival(seed, G.week);
    go('day');
  }
  function go(s) {
    // 离开开奖页时作废旧动画链：runReveal 是 async，标题更新后还要再跑约 2 秒，
    // 不递增 token 的话它会在切页后继续写已不存在的 #rvTitle，抛 null.innerHTML。
    if (screen === 'reveal' && s !== 'reveal') revealToken++;
    screen = s;
    document.body.classList.toggle('in-day', s === 'day');
    // 切页时清掉上一屏残留的全屏横幅 / 闪光 / 彩带，避免盖住新页面
    var fx = document.querySelector('.fx-layer');
    if (fx) fx.innerHTML = '';
    render(); window.scrollTo(0, 0);
  }

  // ==================== HTML 片段 ====================
  function skewerHtml(n) {
    var out = '';
    for (var i = 0; i < n; i++) out += '<i class="skewer"><b></b><b></b><b></b></i>';
    return out;
  }
  function bulbsHtml() {
    var out = '<div class="bulbs">';
    for (var i = 0; i < 11; i++) out += '<i></i>';
    return out + '</div>';
  }
  function guestHtml(i) {
    var hats = ['#e9524a', '#4f8fd6', '#ffc93c', '#38c6b4', '#a06bd6', '#63b66a'];
    var shirts = ['#4f8fd6', '#e9524a', '#38c6b4', '#ffc93c', '#a06bd6', '#ef8f4d'];
    return '<div class="guest" data-gi="' + i + '"><span class="hat" style="--hat:' + hats[i % 6] + '"></span>' +
      '<span class="head"></span><span class="body" style="--shirt:' + shirts[i % 6] + '"></span></div>';
  }
  function sceneHtml(d, big) {
    return '<div class="scene' + (big ? ' big' : '') + '">' + bulbsHtml() +
      '<div class="scene-sign">滁 州 夜 市</div>' +
      '<div class="scene-caption">' + (d ? d.weather.name + (d.weekend ? ' · 周末夜' : '') : '夜市 · 串串摊') + '</div>' +
      '<div class="steam"><i></i><i></i><i></i></div>' +
      '<div class="stall"><div class="awning"></div></div>' +
      '<div class="pot"></div>' +
      '<div class="skewers" id="potSkewers">' + skewerHtml(10) + '</div>' +
      (big ? '<div class="guest-row" id="guestRow"></div>' : '') +
      '</div>';
  }
  function starsHtml(n) {
    var s = '';
    for (var i = 1; i <= 5; i++) s += i <= n ? '★' : '☆';
    return s;
  }
  function hintBar(day) {
    var on = day + 1, out = '<span class="hint-bar">';
    for (var i = 1; i <= 7; i++) out += '<i class="' + (i <= on ? 'on' : '') + '"></i>';
    return out + '</span>';
  }
  function audioBtns() {
    return '<div class="topbar-audio">' +
      '<button class="btn-ghost btn" data-act="bgm">' + (SAVE.bgm === false ? '音乐关' : '音乐开') + '</button>' +
      '<button class="btn-ghost btn" data-act="mute">' + (SAVE.muted ? '音效关' : '音效开') + '</button>' +
      '</div>';
  }
  function topbar(right) {
    return '<div class="topbar"><button class="btn-ghost btn" data-act="home">‹ 首页</button>' +
      audioBtns() + (right || '') + '</div>';
  }

  // ==================== 首页 ====================
  function renderHome() {
    var stage = clamp(SAVE.stage || 0, 0, STAGES.length - 1);
    var cyc = SAVE.cycle || 1, cfg = STAGES[stage];
    var cm = cycleMul(cyc);
    var stageLine = '第 <b>' + cyc + '</b> 周目 · 闯到 <b>第 ' + (stage + 1) + '/' + STAGES.length +
      ' 段 · ' + cfg.name + '</b> · 本周目标 ¥' + goalFor(stage, cyc);
    var cycleLine = cyc > 1
      ? '<div class="st-cycle">熟客加成 <b>×' + cm.toFixed(2) + '</b>　·　三段目标 ¥' + goalFor(0, cyc) +
        ' / ¥' + goalFor(1, cyc) + ' / ¥' + goalFor(2, cyc) + '　·　三段全通才能再进下一周目，吉祥物永久留摊</div>'
      : '<div class="st-cycle">必须三段全通才能进下一周目：目标更高、奖励更多，收下的吉祥物永久留在摊上</div>';
    var best = SAVE.best > 0 ? '最高净利 <b>¥' + SAVE.best + '</b>' + (SAVE.bestTitle ? ' · 【' + SAVE.bestTitle + '】' : '') : '还没开过张，今晚试试？';
    var today = (SAVE.todayKey === todayKey() && SAVE.todayBest > 0)
      ? '　|　今日挑战最佳 <b>¥' + SAVE.todayBest + '</b>' : '';
    var extra = SAVE.bestNight > 0 ? '　|　最赚一晚 <b>¥' + SAVE.bestNight + '</b>' : '';
    var b0 = SAVE.stageBest || [0, 0, 0];
    var progress = STAGES.map(function (x, i) {
      return (b0[i] > 0 ? '¥' + b0[i] : '—');
    }).join(' / ');
    return '<div class="home-audio">' + audioBtns() + '</div>' +
      '<div class="home-head">' +
      '<div class="sign">滁州夜市</div>' +
      '<div class="subtitle">串 串 摊 · 速 玩 版</div>' +
      '<div class="pill">3 分钟一局 · 点开张就能玩</div>' +
      '</div>' +
      sceneHtml(null, false) +
      '<div class="stage-badge"><span class="st-icon">' + cfg.icon + '</span>' +
      '<div><div class="st-top">' + stageLine + '</div>' +
      '<div class="st-desc">' + cfg.desc + '</div>' +
      '<div class="st-progress">本周目各段最佳：' + progress + '</div>' +
      cycleLine +
      '<div class="st-mascots">镇摊吉祥物 已收下 <b>' + (SAVE.mascots || []).length + '</b> 位　·　第 ' + cyc + ' 周目 ' +
      mascotDots() + '</div></div></div>' +
      '<button class="btn-big" data-act="start" data-mode="solo">' +
      (cyc > 1 ? '开 张 · 第 ' + cyc + ' 周 目' : '开 张 ！') + '</button>' +
      '<div class="home-btns">' +
      '<button class="btn" data-act="start" data-mode="daily">📅<br>今日挑战</button>' +
      '<button class="btn" data-act="start" data-mode="invite">📤<br>邀好友</button>' +
      '<button class="btn" data-act="start" data-mode="rival">👴<br>街上摊主</button>' +
      '<button class="btn" data-act="collection">🏮<br>我的摊位</button>' +
      '</div>' +
      '<div class="record">' + best + today + extra + '</div>' +
      '<div class="keep-line">连续开张 <b>' + (SAVE.streak || 0) + '</b> 天　·　夜市币 <b>' +
      (SAVE.coins || 0) + '</b>　·　已摆 <b>' + (SAVE.totalNights || 0) + '</b> 晚　·　收集 <b>' +
      SAVE.unlocked.length + '/' + COLLECTION.length + '</b></div>' +
      '<div class="keep-bar"><i style="width:' + Math.round(SAVE.unlocked.length / COLLECTION.length * 100) + '%"></i></div>' +
      '<div class="foot-note">拖滑块备几签 → 点开张，就这么简单。<br>想赚更多：打听线索、改价牌、连续押准拿满堂彩。<br><span class="ver-tag">v2.8 · 消息版</span></div>';
  }

  // ==================== 押注页 ====================
  function clueText(d, id) {
    if (id === 'count') {
      // 买到的数必须和开张结算用的是同一个客流：effectiveDemand(d, 当前价牌)。
      // 常规区间：范围宽 10 且必含真实 D；押准判定 |bet-D|<=10，照范围里任一档备货都押得准。
      // 客流跌破最低备货 40 签 / 冲过 200 签上限时，如实报真实人数（不再伪装成 40 签），
      // 并说明这晚物理上押不准、把价牌往哪边调能把客流拨回可备区间。
      // 改价牌时 setPrice→refreshDay→renderDay 会重绘，这个数自动跟着变。
      var price = (G && G.price) || DEFAULT_PRICE;
      var D = effectiveDemand(d, price);
      var lo = clamp(round5(D) - 5, 20, 260);
      var hi = clamp(round5(D) + 5, 20, 260);
      var tip = D > MAX_BET
        ? '人比 200 签上限还多，滑块拉满也就 200 签，这晚没法押准；把价牌往上挪一点，客流会落回能备的范围。'
        : (D < MIN_BET
          ? '人比最低备货 40 签还少，压到最低也难免剩串，这晚没法押准；把价牌往下调一点，能多来些客。'
          : '照这个数备签就押得准；改价牌，这个数会跟着变。');
      return '数人头回来了：<b>按你现在写的 ¥' + price + ' 价牌</b>，今晚实打实来 <b>' +
        lo + '～' + hi + '</b> 人。' + tip;
    }
    if (id === 'taste') {
      var e = ELASTIC[d.elastic];
      return '老客说了：今晚客人<b>' + e.name + '</b>。' + e.hint + ' 价牌大概写 <b>¥' + e.best + '</b> 最划算。';
    }
    return '找人问过了：街坊那句话是<b>' + (d.rumorTrue ? '真的' : '假的') + '</b>，' +
      (d.rumorTrue ? '可以照着调备货。' : '得反着看，别被带偏了。');
  }

  // 「今晚的打算」：花消息金买确定性 + 自己写价牌
  // 限制优先级：今晚问过 > 今晚跑腿用完 > 本回合次数 > 数人头额度 > 钱不够
  function clueLock(c) {
    if (G.clueLog.indexOf(c.id) >= 0) return '已问';
    if (G.clueLeft <= 0) return '今晚跑完';
    if (G.clueBuys >= G.buyMax) return '次数用完';
    if (c.id === 'count' && G.clueCountBuys >= G.countMax) return '人头已满';
    if (G.intelCash < clueCost(c)) return '钱不够';
    return null;
  }
  function renderPlanPanel(d) {
    var clues = CLUES.map(function (c) {
      var done = G.clueLog.indexOf(c.id) >= 0;
      var lock = clueLock(c);
      return '<button class="clue-btn' + (done ? ' done' : '') + '" data-act="clue" data-id="' + c.id + '"' +
        (lock ? ' disabled' : '') + '><span class="cb-ico">' + c.icon + '</span>' +
        '<span class="cb-name">' + c.name + '</span><span class="cb-cost' + (lock && !done ? ' cb-lock' : '') + '">' +
        (lock || ('¥' + clueCost(c))) + '</span></button>';
    }).join('');
    var revealed = G.clueLog.map(function (id) {
      return '<div class="clue-result">' + clueText(d, id) + '</div>';
    }).join('');
    var prices = '';
    for (var p = PRICE_MIN; p <= PRICE_MAX; p++) {
      prices += '<button class="price-btn' + (p === G.price ? ' on' : '') +
        (p >= 4 ? ' jp' : '') + '" data-act="price" data-v="' + p + '">¥' + p + '</button>';
    }
    var purse = '<div class="intel-purse">消息钱袋 <b>¥' + G.intelCash + '</b>　·　本回合 <b>' +
      G.clueBuys + '/' + G.buyMax + '</b> 次　·　数人头 <b>' + G.clueCountBuys + '/' + G.countMax + '</b>' +
      (G.topups ? '　·　已加 <b>' + G.topups + '</b> 回' : '') + '</div>';
    var topup = '<div class="topup-box">' +
      '<div class="topup-tip">还想多打听？转发给好友 / 看段激励 → 再加 <b>' + TOPUP_TIMES +
      '</b> 次、补 <b>¥' + TOPUP_CASH + '</b> 消息金、数人头额度 <b>+' + TOPUP_COUNT + '</b>。</div>' +
      '<div class="topup-btns">' +
      '<button class="btn topup-btn" data-act="topupShare">转 发 加 次 数</button>' +
      '<button class="btn topup-btn alt" data-act="topupAd">看 激 励 加 次 数</button>' +
      '</div><div class="topup-note">静态版接不了真实广告 SDK，激励位为演示；4399 上线后换成平台激励视频即可。</div></div>';
    return '<div class="card plan-card">' +
      '<div class="plan-title">今晚先去打听 <span class="muted">今晚还能跑 ' + G.clueLeft + ' 趟</span></div>' +
      purse +
      '<div class="clue-row">' + clues + '</div>' + revealed + topup +
      '<div class="plan-title" style="margin-top:13px">价牌写多少钱 <span class="muted">每签净赚 ¥' + (G.price - COST).toFixed(1) + '</span></div>' +
      '<div class="price-row">' + prices + '</div>' +
      '<div class="plan-hint">价高客人少、价低客人多；先看老摊主那句挑不挑价，再定。<br>' +
      '<b class="jp-tip">价牌 ¥4 起，押准了有「满堂彩」：净利再 +35%、外加 ¥40</b></div>' +
      '</div>';
  }

  function renderDay() {
    var d = G.week[G.day];
    var masterBet = d.guess;                 // 军师的有偏预测，不再是答案
    var tut = (!SAVE.doneTutorial && G.day === 0)
      ? '<div class="tutorial">👉 拖滑块备几签 → 点「开张」就行！<br>开局送 <b>¥50 消息金</b>：打听线索能问到准数；本回合最多 5 次，数人头最多 3 次。</div>' : '';
    var hud = '<div class="hud"><span class="day">第 ' + (G.day + 1) + '/' + DAYS + ' 天</span>' +
      '<span>现金 ¥' + G.cash + '</span>' +
      '<span class="stars">' + starsHtml(G.stars) + '</span>' +
      '<span class="combo">连准 ' + G.combo + '</span></div>';
    var truthTag = (G.clueLog.indexOf('truth') >= 0)
      ? ' <span class="tag ' + (d.rumorTrue ? 'tag-up' : 'tag-down') + '">' + (d.rumorTrue ? '已验 · 真' : '已验 · 假') + '</span>' : '';
    var intel = '<div class="card">' +
      '<div class="intel-row"><span class="ico">' + d.weather.icon + '</span><span class="txt"><span class="who">今晚天气</span>' +
      d.weather.name + ' · ' + d.weather.line + (d.weekend ? '，<b>周末夜更热闹</b>' : '') + '</span></div>' +
      '<div class="intel-row"><span class="ico">🗣️</span><span class="txt"><span class="who">街坊说</span>' +
      d.rumorLine + ' <span class="tag ' + (d.rumorUp ? 'tag-up' : 'tag-down') + '">' + (d.rumorUp ? '↑ 人多' : '↓ 人少') + '</span>' + truthTag + '</span></div>' +
      '<div class="intel-row"><span class="ico">🤖</span><span class="txt"><span class="who">军师（越到后面越有底 ' + hintBar(G.day) + '）· 也会看走眼</span>' +
      '我看今晚大概 <b>' + d.masterLow + '～' + d.masterHigh + '</b> 人。' + d.masterLine +
      (G.day >= 1 ? '<br><span class="bias-hint">街坊点破 · ' + d.biasHint + '</span>' : '') + '</span></div>' +
      '<div class="intel-row"><span class="ico">👴</span><span class="txt"><span class="who">老摊主</span>' + d.oldLine + '</span></div>' +
      '</div>';
    var betPanel = '<div class="card">' +
      '<div class="bet-num">今晚备 <b id="betNum">' + G.bet + '</b> 签 <span class="muted">（最多 200）</span></div>' +
      '<div class="slider-wrap"><input type="range" id="betSlider" min="' + MIN_BET + '" max="' + MAX_BET + '" step="5" value="' + G.bet + '"></div>' +
      '<div class="scale"><span>40 签</span><span>120 签</span><span>200 签</span></div>' +
      '<div class="quick">' +
      '<button class="btn" data-act="adj" data-delta="-20">−20</button>' +
      '<button class="btn" data-act="adj" data-delta="-10">−10</button>' +
      '<button class="btn" data-act="adj" data-delta="10">+10</button>' +
      '<button class="btn" data-act="adj" data-delta="20">+20</button>' +
      '<button class="btn" data-act="master" data-v="' + masterBet + '">照军师说的</button>' +
      '</div>' +
      '<div class="pot-note">每签卖 ¥' + G.price + ' · 成本 ¥1.2 · 备多了剩串要倒掉</div>' +
      '</div>';
    var modeLine = '';
    if (G.mode === 'invite') modeLine = '<div class="duo-banner">战书局 · 押完 7 晚生成链接，发给好友应战</div>';
    else if (G.mode === 'duel' && G.foe) modeLine = '<div class="duo-banner">应战中 · 好友第 ' + (G.day + 1) + ' 晚押了 ' + G.foe.bets[G.day] + ' 签，别照抄</div>';
    else if (G.mode === 'rival' && G.foe) modeLine = '<div class="duo-banner">对手「' + G.foe.name + '」· 电脑摊主，同一条街各押各的</div>';
    else if (G.mode === 'solo') modeLine = '<div class="stage-line">第 ' + G.cycle + ' 周目 · 第 ' + (G.stage + 1) + '/' + STAGES.length + ' 段 · ' +
      STAGES[G.stage].name + '　目标 ¥' + goalFor(G.stage, G.cycle) +
      '　已赚 <b>¥' + G.totalProfit + '</b>　<span class="mini-goal">今晚小目标 ¥' +
      G.miniGoals[G.day] + '</span></div>';
    return topbar() + hud + modeLine +
      sceneHtml(d, false) + tut + intel + renderPlanPanel(d) + betPanel +
      '<div class="open-bar"><button class="btn-big" data-act="open">开 张 ！</button></div>';
  }

  // ==================== 开奖骨架 ====================
  function renderReveal() {
    var d = G.week[G.day];
    return topbar() +
      '<div class="hud"><span class="day">第 ' + (G.day + 1) + '/' + DAYS + ' 天</span>' +
      '<span>现金 ¥' + G.cash + '</span><span class="stars">' + starsHtml(G.stars) + '</span>' +
      '<span class="combo">连准 ' + G.combo + '</span></div>' +
      '<div class="reveal-title" id="rvTitle">夜市开张…</div>' +
      sceneHtml(d, true) +
      '<div class="reveal-numbers" id="rvNums"></div>' +
      '<div id="rvCard"></div>' +
      '<button class="btn-ghost btn skip" data-act="skip">跳过 ▸</button>' +
      '<button class="btn-big" id="rvNext" data-act="next" style="display:none;margin-top:12px">下一晚 →</button>';
  }

  // ==================== 结果页 ====================
  // ==================== 通关礼 · 镇摊吉祥物 ====================
  function mascotGot(i) { return (SAVE.mascots || []).indexOf(i) >= 0; }
  function mascotDots() {
    var cyc = SAVE.cycle || 1, out = '';
    for (var s = 0; s < 3; s++) {
      var id = mascotId(cyc, s), m = mascotFor(id);
      out += '<i class="mdot' + (mascotGot(id) ? ' got' : '') + '">' + m.dot + '</i>';
    }
    return out;
  }
  function renderPrize(st) {
    if (G.mode !== 'solo' || !st.passed) return '';
    var mid = mascotId(G.cycle, st.stage), m = mascotFor(mid), isNew = G.newMascot === mid;
    return '<div class="prize-card' + (isNew ? ' is-new' : '') + '">' +
      '<div class="prize-head">' + (isNew ? '新到 · ' : '') + '第 ' + G.cycle + ' 周目 · 第 ' + (st.stage + 1) +
      '/3 段通关礼 · 镇摊吉祥物【' + m.kind + '】</div>' +
      '<div class="prize-main"><div class="prize-art">' + m.art + '</div>' +
      '<div class="prize-txt"><div class="prize-name">' + m.name +
      '<span>' + m.kind + '</span></div>' +
      '<div class="prize-words">' + m.words + '</div></div></div>' +
      '<div class="prize-foot"><b>' + m.sign + '</b>　·　' +
      (isNew ? '已收进「我的摊位」，往后一直在摊上' : '早就收下了，还在摊上') + '</div></div>';
  }

  function renderResult() {
    var st = G.stat, t = G.title;
    var statHtml = '<div class="score-grid">' +
      '<div class="cell"><b>¥' + st.totalProfit + '</b><span>7 天净赚</span></div>' +
      '<div class="cell"><b>' + st.accurate + '/' + DAYS + '</b><span>押准晚数</span></div>' +
      '<div class="cell"><b>' + st.avgDiff + '</b><span>平均差几签</span></div>' +
      '</div>' +
      '<div class="muted center">备货准确率</div>' +
      '<div class="accuracy-bar"><i style="width:' + Math.round(st.accurate / DAYS * 100) + '%"></i></div>';
    var cycleHtml = (G.mode === 'solo' && G.cycle > 1)
      ? '<div class="cycle-bonus">第 ' + G.cycle + ' 周目加成 <b>×' + cycleMul(G.cycle).toFixed(2) +
        '</b> 已算进每晚净利、连准、满堂彩与夜市币' +
        (G.cycleCoinBonus ? '　·　周目红包夜市币 <b>+' + G.cycleCoinBonus + '</b>' : '') + '</div>'
      : '';
    var thrillHtml = '<div class="hl-title">这一周的高光时刻</div>' +
      '<div class="thrill">' +
      '<div class="th-cell"><b>¥' + st.bestNight + '</b><span>最赚的一晚</span></div>' +
      '<div class="th-cell"><b>' + st.jackpots + ' 次</b><span>满堂彩</span></div>' +
      '<div class="th-cell"><b>' + st.bestCombo + ' 晚</b><span>最长连准</span></div>' +
      '</div>' +
      '<div class="hl-row">¥' + st.priceGain + ' 靠定价多赚　·　打听 ' + st.clueBuys + ' 次用 ¥' + st.clueSpent + ' 消息金　·　' +
      st.miniHits + '/' + DAYS + ' 晚达成小目标　·　夜市币 +' + st.coinsEarned + '</div>' +
      '<div class="muted center" style="margin:2px 0 8px">累计夜市币 <b>' + SAVE.coins + '</b>' +
      '　·　连续开张 <b>' + (SAVE.streak || 1) + '</b> 天　·　共摆了 <b>' + (SAVE.totalNights || 0) + '</b> 晚</div>' +
      cycleHtml;
    var stageHtml = '';
    if (G.mode === 'solo') {
      var cfg = STAGES[st.stage];
      var gap = Math.max(0, st.goal - st.totalProfit);
      var mid = mascotId(G.cycle, st.stage);
      stageHtml = '<div class="stage-card ' + (st.passed ? 'pass' : 'fail') + '">' +
        '<div class="sc-head">' + (st.passed ? '过关！' : '这一周稳当收摊') + ' · 第 ' + G.cycle + ' 周目 · 第 ' + (st.stage + 1) + ' 段【' + cfg.name + '】</div>' +
        '<div class="sc-goal">本周目标 ¥' + st.goal + '　·　实际 ¥' + st.totalProfit + '　·　已到 ' +
        Math.round(Math.min(1, Math.max(0, st.totalProfit) / st.goal) * 100) + '%</div>' +
        '<div class="accuracy-bar"><i style="width:' + Math.round(Math.min(1, Math.max(0, st.totalProfit) / st.goal) * 100) + '%"></i></div>' +
        '<div class="sc-note">' + (st.passed
          ? (st.stage < STAGES.length - 1 ? '解锁下一段：' + STAGES[st.stage + 1].name + '，目标 ¥' + goalFor(st.stage + 1, G.cycle)
            : (G.nextCycle != null
              ? '第 ' + G.cycle + ' 周目三段全通！下回开张就进第 ' + G.nextCycle + ' 周目：目标更高、奖励更多，还有新的吉祥物'
              : '本周目前两段还没过完，三段全通才能进下一周目，先把前两段补上'))
          : '已经赚了 ¥' + st.totalProfit + '，离 ¥' + st.goal + ' 还差 ¥' + gap +
            '。下回别照抄军师：先挖「数人头」定备货，再把价牌抬到 ¥4 以上，押准了还有满堂彩。' +
            '<br><span class="prize-tease">这一段的通关礼是【' + mascotFor(mid).name +
            '】，下次把它领回摊上</span>') + '</div></div>';
    }
    var mainBtn;
    if (G.mode === 'solo' && st.passed && st.stage < STAGES.length - 1)
      mainBtn = '<button class="btn-big" data-act="nextStage">往里走 · ' + STAGES[st.stage + 1].name + ' →</button>';
    else if (G.mode === 'solo' && st.passed && G.nextCycle != null)
      mainBtn = '<button class="btn-big" data-act="restartAll">进 入 第 ' + G.nextCycle + ' 周 目 · 目标更高 →</button>';
    else if (G.mode === 'solo' && st.passed)
      mainBtn = '<button class="btn-big" data-act="retryStage">本周目还没全通 · 再摆一周 →</button>';
    else if (G.mode === 'solo')
      mainBtn = '<button class="btn-big" data-act="retryStage">再摆一周 · 冲 ¥' + st.goal + '</button>';
    else
      mainBtn = '<button class="btn-big" data-act="again">再 来 一 局</button>';
    var unlockHtml = G.newUnlocks && G.newUnlocks.length
      ? '<div class="unlock">解锁新物件：' + G.newUnlocks.map(function (u) { return u.icon + ' ' + u.name; }).join('、') + '</div>' : '';
    var dailyHtml = G.mode === 'daily'
      ? '<div class="share-box">今日挑战 · 今天所有人遇到的是同一条街。<br>本机今日最佳：<b>¥' + SAVE.todayBest + '</b>　历史最佳：<b>¥' + SAVE.best + '</b></div>' : '';
    var vsOut = (G.mode === 'duel' || G.mode === 'rival') ? vsHtml() : '';
    var inviteOut = G.mode === 'invite' ? inviteHtml() : '';
    return '<div class="title-card"><div class="crown">' + t.icon + '</div>' +
      '<h2>' + t.name + '</h2><p>' + t.desc + '</p></div>' +
      stageHtml + renderPrize(st) +
      '<div class="card">' + statHtml + thrillHtml +
      '<div class="stars-line">收摊口碑 ' + starsHtml(G.stars) + '　·　最准的一晚差 ' + st.bestDiff + ' 签</div></div>' +
      unlockHtml + dailyHtml + vsOut + inviteOut +
      mainBtn +
      '<div class="mini-btns" style="margin-top:10px">' +
      '<button class="btn" data-act="share">' + (G.mode === 'invite' ? '📤 复制战书文案' : '📤 复制成绩卡') + '</button>' +
      '<button class="btn" data-act="home">🏠 回首页</button>' +
      '</div>' +
      '<div class="foot-note">' +
      (G.mode === 'invite' ? '把战书链接发给好友，他点开就能应战'
        : ((G.mode === 'duel' || G.mode === 'rival') ? '同一条街，再换个押法试试'
          : '把成绩卡发给好友，看他能不能赚得比你多')) + '</div>';
  }

  // ==================== 图鉴 ====================
  function renderCollection() {
    var items = COLLECTION.map(function (c) {
      var got = SAVE.unlocked.indexOf(c.name) >= 0;
      return '<div class="coll ' + (got ? '' : 'locked') + '"><div class="ci">' + c.icon + '</div>' +
        '<div class="cn">' + (got ? c.name : '???') + '</div>' +
        '<div class="cc">' + c.cond + '</div></div>';
    }).join('');
    var gotN = (SAVE.mascots || []).length;
    var curCyc = SAVE.cycle || 1;
    var groups = mascotGroupCount(), groupHtml = '';
    for (var gi = 0; gi < groups; gi++) {
      var set = MASCOT_SETS[gi % MASCOT_SETS.length];
      var turn = Math.floor(gi / MASCOT_SETS.length);
      var cyc = gi + 1, gotIn = 0, cells = '';
      var opened = cyc <= curCyc;   // 未过完上一周目，后续周目标「未开启」
      for (var s = 0; s < 3; s++) {
        var id = gi * 3 + s, m = mascotFor(id), got = mascotGot(id);
        if (got) gotIn++;
        cells += '<div class="mascot-cell' + (got ? '' : ' locked') + '">' +
          '<div class="mc-art">' + (got ? m.art : '<div class="mc-q">?</div>') + '</div>' +
          '<div class="mc-name">' + (got ? m.name : '未解锁') + '</div>' +
          '<div class="mc-cond">' + (got ? m.kind
            : (opened ? '第 ' + cyc + ' 周目 · 第 ' + (s + 1) + ' 段'
              : '需先通关第 ' + (cyc - 1) + ' 周目')) + '</div></div>';
      }
      var state = cyc < curCyc ? '已完成' : (cyc > curCyc ? '未开启' : '进行中');
      groupHtml += '<div class="mascot-group"><div class="mg-title"><b>第 ' + cyc + ' 周目</b> · ' +
        set.theme + (turn > 0 ? '（' + (CN[Math.min(turn + 1, 10)] || (turn + 1)) + '转）' : '') +
        '<span>' + gotIn + '/3 · ' + state + '</span></div><div class="mascot-grid">' + cells + '</div></div>';
    }
    var lastId = gotN ? (SAVE.mascots || [])[gotN - 1] : null;
    var lastOne = lastId != null ? mascotFor(lastId) : null;
    var mascotHtml = '<div class="card" style="margin-top:12px"><h3 style="margin:0 0 4px">镇摊吉祥物</h3>' +
      '<div class="muted">已收下 ' + gotN + ' 位 · 通关一段领一位，<b>收下就永久留在摊上</b> · 周目无上限</div>' +
      groupHtml +
      '<div class="mascot-words">' + (lastOne ? '<b>' + lastOne.name + '</b>：' + lastOne.words : '每通关一段，就有一位来摊上坐镇。') + '</div></div>';
    return topbar() + '<div class="card"><h3 style="margin:0 0 4px">我的摊位</h3>' +
      '<div class="muted">已收集 ' + SAVE.unlocked.length + '/' + COLLECTION.length + ' · 玩得越多解锁越多</div></div>' +
      mascotHtml +
      '<div class="coll-grid">' + items + '</div>' +
      '<div class="card" style="margin-top:12px"><div class="muted">拿过的称号</div>' +
      '<div style="font-size:13px;font-weight:700;line-height:1.9;margin-top:5px">' +
      (SAVE.titles.length ? SAVE.titles.join(' · ') : '还没有，先开一局吧') + '</div>' +
      '<div class="muted" style="margin-top:9px">夜市币 ' + (SAVE.coins || 0) +
      '　·　连续开张 ' + (SAVE.streak || 0) + ' 天　·　累计满堂彩 ' + (SAVE.totalJackpots || 0) + ' 次</div>' +
      '<div class="muted" style="margin-top:9px">闯关进度</div>' +
      '<div style="font-size:13px;font-weight:700;margin-top:4px">' +
      (SAVE.maxCycle > 1 ? '已通 ' + (SAVE.clears || 0) + ' 个周目 · 正在第 ' + (SAVE.cycle || 1) + ' 周目'
        : '闯到第 ' + ((SAVE.stage || 0) + 1) + '/' + STAGES.length + ' 段 · ' + STAGES[SAVE.stage || 0].name) +
      '　·　最赚一晚 ¥' + (SAVE.bestNight || 0) + '</div></div>' +
      '<button class="btn-big" data-act="start" data-mode="solo" style="margin-top:4px">开 张 ！</button>';
  }

  // ==================== 渲染分发 ====================
  function render() {
    var html;
    if (screen === 'home') html = renderHome();
    else if (screen === 'day') html = renderDay();
    else if (screen === 'reveal') html = renderReveal();
    else if (screen === 'result') html = renderResult();
    else if (screen === 'duelIntro') html = renderDuelIntro();
    else html = renderCollection();
    $('app').innerHTML = deEmoji(html);
    if (screen === 'reveal') runReveal();
  }

  // ==================== 滑块 ====================
  function setBet(v) {
    G.bet = clamp(round5(v), MIN_BET, MAX_BET);
    var num = $('betNum'), slider = $('betSlider'), pot = $('potSkewers');
    if (num) num.textContent = G.bet;
    if (slider) slider.value = G.bet;
    if (pot) pot.innerHTML = skewerHtml(clamp(Math.round(G.bet / 10), 3, 20));
  }
  // 点线索 / 改价牌时原地重绘，保持滚动位置，不跳回顶部
  function refreshDay() {
    var y = window.scrollY;
    document.body.classList.add('in-day');
    $('app').innerHTML = deEmoji(renderDay());
    window.scrollTo(0, y);
  }
  function setPrice(v) {
    G.price = clamp(Math.round(v), PRICE_MIN, PRICE_MAX);
    refreshDay();
    sfx.tick();
  }
  function digClue(id) {
    var c = CLUES.filter(function (x) { return x.id === id; })[0];
    if (!c) return;
    if (G.clueLog.indexOf(id) >= 0) { toast('这条今晚已经问过啦'); return; }
    if (G.clueLeft <= 0) { toast('今晚跑腿趟数用完了，明晚再来'); return; }
    if (G.clueBuys >= G.buyMax) { toast('本回合次数用完了，转发给好友或看激励能再加'); return; }
    if (id === 'count' && G.clueCountBuys >= G.countMax) { toast('数人头额度用完了，转发或看激励能再加'); return; }
    var cost = clueCost(c);
    if (G.intelCash < cost) { toast('消息钱袋不够 ¥' + cost + ' 了，转发或看激励能补一点'); return; }
    G.clueLeft -= 1;
    G.clueLog.push(id);
    G.clueBuys += 1;
    if (id === 'count') G.clueCountBuys += 1;
    G.clueTotal += cost;
    G.intelCash -= cost;   // 只扣消息钱袋，不进经营现金 / 净利
    refreshDay();
    sfx.pop();
    toast('花了 ¥' + cost + '，' + c.name + '回来了');
  }

  // 转发 / 激励：放宽次数与钱袋。纯静态 H5 接不了真实激励视频，
  // 这里用「复制邀请链接」和「演示位 3 秒」两条真实可完成的路径；
  // 4399 上线后把 playAdDemo 换成平台激励视频回调即可。
  function grantTopup() {
    G.topups += 1;
    G.buyMax += TOPUP_TIMES;
    G.countMax += TOPUP_COUNT;
    G.intelCash += TOPUP_CASH;
    refreshDay();
    sfx.pop();
  }
  function copyInvite() {
    var link;
    try {
      var u = new URL(location.href);
      u.searchParams.delete('duel'); u.searchParams.delete('bgm');
      link = u.toString();
    } catch (e) { link = location.href.split('?')[0]; }
    var txt = '【滁州夜市 · 串串摊 速玩版】我在夜市摆摊，缺个搭子！\n' +
      '7 天速玩：打听线索、写价牌、押签，看谁赚得多～\n点开就能玩：' + link;
    copyText(txt, '链接已复制 · 发给好友！机会 +' + TOPUP_TIMES + ' 次、消息金 +¥' + TOPUP_CASH);
    grantTopup();
  }
  function playAdDemo() {
    var mask = document.createElement('div');
    mask.className = 'ad-mask';
    mask.innerHTML = '<div class="ad-box"><div class="ad-tag">激 励 视 频 · 演 示 位</div>' +
      '<div class="ad-emoji">灯</div><div class="ad-title">夜市开张大吉</div>' +
      '<div class="ad-sub">4399 上线后这里播放平台激励视频；本地版演示 3 秒后自动加次数。</div>' +
      '<div class="ad-count" id="adCount">3</div></div>';
    document.body.appendChild(mask);
    var left = 3;
    var tick = setInterval(function () {
      left -= 1;
      var c = document.getElementById('adCount');
      if (c) c.textContent = left > 0 ? String(left) : '✓';
      if (left <= 0) {
        clearInterval(tick);
        if (mask.parentNode) mask.parentNode.removeChild(mask);
        grantTopup();
        toast('激励看完 · 机会 +' + TOPUP_TIMES + ' 次、消息金 +¥' + TOPUP_CASH);
      }
    }, 1000);
  }

  // ==================== 开奖动画 ====================
  function currentResults() {
    var d = G.week[G.day];
    return [calc(G.bet, G.price, d)];
  }

  function applyResults(results) {
    var r = results[0];
    // 周目奖励叠加：净利、连准、满堂彩、夜市币一起按倍率放大，数字越滚越大
    var cm = G.mode === 'solo' ? cycleMul(G.cycle) : 1;
    var newCombo = r.accurate ? G.combo + 1 : 0;
    r.bonus = Math.round((newCombo >= 2 ? Math.min(30 + (newCombo - 2) * 40, 190) : 0) * cm);
    r.jackpotBonus = Math.round((r.jackpot ? Math.round(Math.max(r.profit, 0) * 0.35) + 40 : 0) * cm);
    r.profit = Math.round(r.profit * cm);
    r.baseProfit = Math.round(r.baseProfit * cm);
    r.priceGain = r.profit - r.baseProfit;
    G.combo = newCombo;
    G.bestCombo = Math.max(G.bestCombo, newCombo);
    G.stars = clamp(G.stars + r.starDelta, 1, 5);
    var nightTotal = r.profit + r.bonus + r.jackpotBonus;
    // 首局首晚保护：第一次接触不让人一上来就亏钱走掉
    G.pack = 0;
    if (G.rookie && G.day === 0 && nightTotal < 90) {
      G.pack = 90 - nightTotal;
      nightTotal += G.pack;
    }
    // 每晚小目标：够得着就给，高频正反馈
    G.miniHit = nightTotal >= G.miniGoals[G.day] ? 1 : 0;
    r.coins = Math.round(nightCoins(r, G) * cm) + (G.miniHit ? 3 : 0);
    G.nightCoinsSum += r.coins;
    SAVE.coins += r.coins;
    SAVE.totalNights = (SAVE.totalNights || 0) + 1;
    save();
    G.totalProfit += nightTotal;
    G.cash += nightTotal;
    G.priceGainSum += r.priceGain;
    G.bestNight = Math.max(G.bestNight, nightTotal);
    G.nightTotals.push(nightTotal);
    if (r.jackpot) { G.jackpots++; SAVE.totalJackpots = (SAVE.totalJackpots || 0) + 1; }
    if (r.accurate) G.accurate++;
    if (r.leftover / r.bet > 0.15) G.leftoverNights++;
    if (r.shortage > 25) G.shortageNights++;
    G.diffSum += r.diff;
    G.history.push({ results: results, D: r.D, price: r.price, nightTotal: nightTotal,
      miniHit: G.miniHit, coins: r.coins, pack: G.pack });
    G.lastResult = results;
  }

  function showRevealCard() {
    var results = G.lastResult;
    var nums = $('rvNums'), card = $('rvCard'), next = $('rvNext'), title = $('rvTitle');
    // 双保险：动画链若已跨页（含 refreshDay 重绘），元素不存在就直接丢弃
    if (!nums || !card || !next || !title || !results || !results.length) return;
    var r0 = results[0];
    title.innerHTML = deEmoji('按 ¥' + r0.price + '/签，今晚来了 <b>' + r0.D + '</b> 人！');
    nums.innerHTML = deEmoji(
      '<div class="chip"><b>' + r0.bet + '</b>你押的签</div>' +
      '<div class="chip"><b>¥' + r0.price + '</b>每签卖价</div>' +
      '<div class="chip"><b>' + r0.sold + '</b>卖出去</div>' +
      '<div class="chip ' + (r0.leftover > 0 ? 'bad' : 'good') + '"><b>' + r0.leftover + '</b>剩串倒掉</div>' +
      '<div class="chip ' + (r0.shortage > 0 ? 'bad' : 'good') + '"><b>' + r0.shortage + '</b>没吃到的客</div>');

    var quipKey = r0.accurate ? 'perfect' : (r0.leftover / r0.bet > 0.15 ? 'leftover' : (r0.shortage > 25 ? 'shortage' : 'normal'));
    var quip = QUIPS[quipKey][Math.floor(Math.random() * QUIPS[quipKey].length)];
    var total = r0.profit + r0.bonus + r0.jackpotBonus + (G.pack || 0);
    var rating = (G.rookie && G.day === 0)
      ? { key: 'open', label: '开 张 大 吉 !', sub: '第一晚就开胡，好兆头', cls: 'gold' }
      : rateNight(r0, G, total);
    var body = '<div class="rate-banner rate-' + rating.cls + '"><b>' + rating.label + '</b><i>' + rating.sub + '</i></div>' +
      '<div class="big-profit' + (total < 0 ? ' neg' : '') + '" id="bigProfit">+¥0</div>' +
      '<div class="profit-cap">今晚净赚</div>' +
      '<div class="diff-line">备 ' + r0.bet + ' 签 · 卖 ¥' + r0.price + '/签 · 来了 ' + r0.D + ' 人 · 差 <b>' + r0.diff + '</b> 签</div>' +
      (G.pack ? '<div class="mini-hit ok">开张红包 +¥' + G.pack + ' · 第一晚不算亏，慢慢来</div>' : '') +
      (G.miniHit ? '<div class="mini-hit ok">今晚小目标 ¥' + G.miniGoals[G.day] + ' 达成！夜市币 +3</div>'
        : '<div class="mini-hit">小目标 ¥' + G.miniGoals[G.day] + '，下晚再冲一把</div>') +
      (r0.priceGain > 0 ? '<div class="gain-line">靠定价多赚 <b>+¥' + r0.priceGain + '</b>（同样备货按 ¥3 只赚 ¥' + r0.baseProfit + '）</div>'
        : (r0.priceGain < 0 ? '<div class="gain-line bad">这个定价比常规价少赚 ¥' + Math.abs(r0.priceGain) + '</div>' : '')) +
      (r0.jackpotBonus ? '<div class="jackpot">满堂彩奖励 +¥' + r0.jackpotBonus + '</div>' : '') +
      (r0.bonus ? '<div class="center" style="color:#c8471f;font-weight:800;font-size:13px">连准 ' + G.combo + ' 晚，额外 +¥' + r0.bonus + '</div>' : '') +
      '<div class="coin-line">夜市币 <b>+' + (r0.coins || 0) + '</b>　累计 <b>' + SAVE.coins + '</b></div>' +
      '<div class="quip">' + quip + '</div>' +
      '<div class="stars-line">口碑 ' + starsHtml(G.stars) + '　·　连准 ' + G.combo + ' 晚</div>';
    card.innerHTML = deEmoji('<div class="result-card">' + body + '</div>');
    var hud = document.querySelector('.hud');
    if (hud) {
      if (hud.children[1]) hud.children[1].textContent = '现金 ¥' + G.cash;
      var st = hud.querySelector('.stars'); if (st) st.textContent = starsHtml(G.stars);
      var cb = hud.querySelector('.combo'); if (cb) cb.textContent = '连准 ' + G.combo;
    }
    countUp($('bigProfit'), total, 680);
    next.style.display = 'block';
    next.textContent = G.day >= DAYS - 1 ? '收摊 · 看成绩 →' : '下一晚 →';
    var sk = document.querySelector('.skip'); if (sk) sk.style.display = 'none';
    fireHighlight(r0, total, rating);
  }

  // 高光时刻总调度：不同结果给不同强度的刺激，弱结果也给一点甜头
  function fireHighlight(r, total, rating) {
    if (G.hlShown) return;
    G.hlShown = true;
    if (G.rookie && G.day === 0) {
      // 第一次接触，先把爽点给足：全屏高光 + 彩带 + 震动 + 号角，别让人第一眼就走
      flash('今 晚 开 胡 !!', '第一晚就开张大吉', 'gold');
      screenGlow('gold'); shake(); confetti('gold', 24); sfx.fanfare();
      return;
    }
    if (r.jackpot) {
      flash('满 堂 彩 !!', '价和量全押对了', 'gold');
      screenGlow('gold'); shake(); confetti('gold', 34); sfx.jackpot();
    } else if (G.combo >= 3) {
      flash('连准 ×' + G.combo, '越押越准，街坊都在看', 'fire');
      screenGlow('fire'); confetti('fire', 20); sfx.combo(G.combo);
    } else if (rating.key === 'nice' || rating.key === 'steady' || rating.key === 'ok') {
      confetti('gold', 12); sfx.reward();
    } else if (r.accurate) {
      sfx.win();
    } else {
      sfx.reward();
    }
    // 破纪录延后一点弹，别和评级横幅撞在一起
    if (total >= 300 && total > (SAVE.bestNight || 0) && !G.recordShown) {
      G.recordShown = true;
      setTimeout(function () {
        if (screen !== 'reveal') return;
        flash('新 纪 录 !!', '单晚净赚 ¥' + total, 'record');
        confetti('gold', 26); sfx.record();
      }, 620);
    }
  }

  async function runReveal() {
    var my = ++revealToken;
    var results = currentResults();
    applyResults(results);
    var d = G.week[G.day];
    var title = $('rvTitle'), row = $('guestRow');
    var n = clamp(Math.round(results[0].D / 12), 4, 12);
    row.innerHTML = Array.from({ length: n }, function (_, i) { return guestHtml(i); }).join('');
    sfx.open();
    title.innerHTML = deEmoji('锅热了，客人往这边来了…');
    await sleep(700); if (my !== revealToken) return;
    title.innerHTML = deEmoji('按 ¥' + results[0].price + '/签，今晚来了 <b>' + results[0].D + '</b> 人！');
    sfx.pop();
    // 客人逐个买串
    var guests = row.querySelectorAll('.guest');
    var buyCount = Math.min(guests.length, Math.round(Math.min(results[0].bet, results[0].D) / 12));
    for (var i = 0; i < buyCount; i++) {
      guests[i].classList.add('buying');
      if (i % 3 === 0) sfx.tick();
      await sleep(90);
      if (my !== revealToken) return;
    }
    // 剩串倒桶 / 客人空手走
    var pot = $('potSkewers');
    if (results[0].leftover > 0 && pot) {
      var some = pot.querySelectorAll('.skewer');
      for (var j = 0; j < Math.min(5, some.length); j++) some[j].classList.add('dump');
      sfx.bad();
    } else if (results[0].shortage > 0) {
      for (var k = 0; k < Math.min(3, guests.length); k++) {
        guests[guests.length - 1 - k].classList.add('sad', 'leaving');
      }
      sfx.bad();
    } else { sfx.coin(); }
    await sleep(650); if (my !== revealToken) return;
    // 金币
    if (results[0].profit + results[0].bonus + results[0].jackpotBonus >= 0) {
      var sc = document.querySelector('.scene');
      var coinN = results[0].jackpot ? 11 : 5;
      for (var c = 0; c < coinN; c++) {
        var coin = document.createElement('span');
        coin.className = 'coin'; coin.textContent = '¥';
        coin.style.left = (18 + c * 7) + '%'; coin.style.bottom = '80px';
        coin.style.animationDelay = (c * 0.09) + 's';
        sc.appendChild(coin);
      }
      sfx.coin();
      await sleep(550); if (my !== revealToken) return;
    }
    showRevealCard();
  }

  // ==================== 收摊结算 ====================
  function finishGame() {
    var nights = G.history.length || DAYS;
    var st = {
      totalProfit: G.totalProfit,
      accurate: G.accurate,
      avgDiff: Math.round(G.diffSum / nights),
      bestDiff: Math.min.apply(null, G.history.map(function (h) { return h.results[0].diff; }).concat([999])),
      leftoverNights: G.leftoverNights, shortageNights: G.shortageNights,
      bestNight: G.bestNight, priceGain: G.priceGainSum, jackpots: G.jackpots,
      clueSpent: G.clueTotal, clueBuys: G.clueBuys, stage: G.stage, bestCombo: G.bestCombo,
      goal: goalFor(G.stage, G.cycle),
      miniHits: G.history.filter(function (h) { return h.miniHit; }).length,
      coinsEarned: G.nightCoinsSum,
      hlNight: G.history.reduce(function (a, h) {
        return (!a || h.nightTotal > a.nightTotal) ? h : a;
      }, null)
    };
    st.bestDiff = st.bestDiff === 999 ? 0 : st.bestDiff;
    st.passed = G.mode === 'solo' ? (st.totalProfit >= st.goal) : null;
    var title = TITLES.filter(function (t) { return t.test(st); })[0] || TITLES[TITLES.length - 1];
    G.stat = st; G.title = title;

    // 存档、解锁与闯关进度
    SAVE.plays += 1;
    SAVE.tries = (SAVE.tries || 0) + 1;
    var streakNow = touchStreak();
    SAVE.maxAcc = Math.max(SAVE.maxAcc, st.accurate);
    SAVE.maxProfit = Math.max(SAVE.maxProfit, st.totalProfit);
    SAVE.bestNight = Math.max(SAVE.bestNight || 0, st.bestNight);
    SAVE.bestCombo = Math.max(SAVE.bestCombo || 0, st.bestCombo);
    if (SAVE.titles.indexOf(title.name) < 0) SAVE.titles.push(title.name);
    if (st.totalProfit > SAVE.best) { SAVE.best = st.totalProfit; SAVE.bestTitle = title.name; }
    if (G.mode === 'daily') {
      if (SAVE.todayKey !== todayKey()) { SAVE.todayKey = todayKey(); SAVE.todayBest = 0; }
      SAVE.todayBest = Math.max(SAVE.todayBest, st.totalProfit);
    }
    G.newMascot = null;
    G.cycleCoinBonus = 0;
    G.nextCycle = null;
    if (G.mode === 'solo') {
      if (!SAVE.stageBest) SAVE.stageBest = [0, 0, 0];
      SAVE.stageBest[st.stage] = Math.max(SAVE.stageBest[st.stage] || 0, st.totalProfit);
      if (st.passed) {
        if (st.stage === SAVE.stage && SAVE.stage < STAGES.length - 1) SAVE.stage = st.stage + 1;
        // 奖励叠加：周目越高，每段通关红包越多，且一律累加不清零
        var segBonus = Math.round((G.cycle - 1) * 40);
        if (segBonus > 0) { SAVE.coins += segBonus; G.cycleCoinBonus += segBonus; }
        // 每周目每段领一位吉祥物；第 1 周目 id 仍是 0/1/2，旧存档无缝兼容
        if (!SAVE.mascots) SAVE.mascots = [];
        var mid = mascotId(G.cycle, st.stage);
        if (SAVE.mascots.indexOf(mid) < 0) { SAVE.mascots.push(mid); G.newMascot = mid; }
        // 周目门槛：必须本周目前两段都已通关、且第 3 段本局达标，才算「过完一周目」
        // 只有满足这个条件才推进周目，缺任何一段都留在原周目继续闯。
        if (st.stage === STAGES.length - 1 &&
            (SAVE.stageBest[0] || 0) > 0 && (SAVE.stageBest[1] || 0) > 0) {
          var allBonus = 100 * (G.cycle - 1);
          if (allBonus > 0) { SAVE.coins += allBonus; G.cycleCoinBonus += allBonus; }
          SAVE.clears = (SAVE.clears || 0) + 1;
          SAVE.cycle = (SAVE.cycle || 1) + 1;
          SAVE.maxCycle = Math.max(SAVE.maxCycle || 1, SAVE.cycle);
          SAVE.stage = 0; SAVE.stageBest = [0, 0, 0]; SAVE.cleared = false;
          G.nextCycle = SAVE.cycle;
        }
      }
    }
    var newUnlocks = [];
    COLLECTION.forEach(function (c) {
      if (SAVE.unlocked.indexOf(c.name) < 0 && c.ok(SAVE)) { SAVE.unlocked.push(c.name); newUnlocks.push(c); }
    });
    G.newUnlocks = newUnlocks;
    if (G.mode === 'invite') {
      var myBets = G.history.map(function (h) { return h.results[0].bet; });
      G.duelLink = buildDuelUrl(encodeDuel(G.seed, myBets, st.totalProfit, st.accurate, G.stage));
    }
    save();
    clearTimeout(toastTimer);
    var tel = $('toast'); if (tel) tel.classList.remove('show');
    // 上一晚开奖留下的「新纪录 / 满堂彩」横幅别带到成绩页，免得盖住刚领的通关礼
    var oldFx = document.querySelector('.fx-layer');
    if (oldFx) oldFx.innerHTML = '';
    go('result');
    // 通关 / 过关的全屏高光：一局里最炸的一刻留到成绩页再放一次
    setTimeout(function () {
      if (screen !== 'result') return;
      if (G.mode === 'solo' && st.passed) {
        if (G.nextCycle != null) {
          flash('第 ' + G.cycle + ' 周 目 全 通 !!',
            '解锁第 ' + G.nextCycle + ' 周目 · 目标更高、礼物更多', 'gold', 15, 900);
          confetti('gold', 46); screenGlow('gold'); shake(); sfx.fanfare();
        } else {
          flash('过 关 !!', G.newMascot != null ? '领到「' + mascotFor(G.newMascot).name + '」'
            : '解锁 ' + STAGES[st.stage + 1].name, 'fire', 15, 900);
          confetti('fire', 30); shake(); sfx.fanfare();
        }
      } else {
        confetti('gold', 8); sfx.reward();   // 收摊也撒一把，但不盖成绩
      }
    }, 380);
    // 首次领奖：等全屏横幅退场，再补一把彩带，让奖品卡亮相时有个落点
    if (G.newMascot != null) {
      setTimeout(function () {
        if (screen !== 'result') return;
        confetti('gold', 14); sfx.reward();
      }, 1250);
    }
    if (streakNow >= 2 && G.mode === 'solo') {
      setTimeout(function () { if (screen === 'result') toast('回头客！连续开张 ' + streakNow + ' 天'); }, 1500);
    }
  }

  function nextDay() {
    if (G.day >= DAYS - 1) { finishGame(); return; }
    G.day += 1;
    // 沿用上一晚的押注，不用真实需求做默认值（避免泄露答案）
    G.bet = clamp(G.bet, MIN_BET, MAX_BET);
    G.price = DEFAULT_PRICE;
    G.clueLeft = STAGES[G.stage].runs; G.clueLog = [];
    G.hlShown = false; G.pack = 0; G.miniHit = 0;
    go('day');
  }

  // ==================== 邀请好友 · 异步战书 ====================
  // 纯静态 H5 没有服务器，做不了真人在线匹配。这里用「战书链接」实现异步对战：
  // 发起方押完 7 晚，把 seed + 自己的 7 个押注 + 成绩编码进 URL；好友点开后
  // 用同一 seed 重放完全相同的天气/消息/客流，各押各的，收摊时自动比净利与押准晚数。
  function b64e(str) {
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function b64d(str) {
    str = String(str).replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';
    return atob(str);
  }
  function duelCheck(o) {
    return (o.s + o.b.reduce(function (x, y) { return x + y; }, 0) + o.p * 3 + o.a * 7) % 46656;
  }
  function encodeDuel(seed, bets, profit, accurate, stage) {
    var o = { s: seed, b: bets, p: profit, a: accurate, g: stage || 0 };
    o.c = duelCheck(o);
    return b64e(JSON.stringify(o));
  }
  function decodeDuel(code) {
    try {
      var o = JSON.parse(b64d(code));
      if (!o || !o.b || o.b.length !== DAYS || typeof o.s !== 'number') return null;
      for (var i = 0; i < o.b.length; i++) {
        if (typeof o.b[i] !== 'number' || o.b[i] < MIN_BET || o.b[i] > MAX_BET) return null;
      }
      if (typeof o.p !== 'number' || typeof o.a !== 'number') return null;
      if (duelCheck(o) !== o.c) return null;
      return { seed: o.s, bets: o.b, profit: o.p, accurate: o.a,
        stage: clamp(o.g || 0, 0, STAGES.length - 1) };
    } catch (e) { return null; }
  }
  function buildDuelUrl(code) {
    try {
      var u = new URL(location.href);
      u.searchParams.set('duel', code);
      return u.toString();
    } catch (e) { return location.href.split('?')[0] + '?duel=' + code; }
  }
  function readDuelFromUrl() {
    try {
      var code = new URL(location.href).searchParams.get('duel');
      return code ? decodeDuel(code) : null;
    } catch (e) { return null; }
  }

  // 电脑摊主：用同一 seed 生成一组押注，明确标注为电脑，不冒充真人匹配
  function makeRival(seed, week) {
    var r = mulberry32((seed ^ 0x9e3779b9) >>> 0);
    var name = RIVAL_NAMES[Math.floor(r() * RIVAL_NAMES.length) % RIVAL_NAMES.length];
    var lean = r() < 0.34 ? -1 : (r() < 0.5 ? 0 : 1);   // 保守 / 听军师 / 激进
    var bets = week.map(function (d) {
      var mid = d.guess;   // 电脑摊主照军师的有偏预测押，同样会看走眼
      var base = lean === -1 ? mid - 14 : (lean === 1 ? mid + 14 : mid);
      return clamp(round5(base + Math.round((r() * 2 - 1) * 16)), MIN_BET, MAX_BET);
    });
    var profit = 0, accurate = 0;
    bets.forEach(function (b, i) {
      var rr = calc(b, DEFAULT_PRICE, week[i]);
      profit += rr.profit;
      if (rr.accurate) accurate++;
    });
    return { name: name, bets: bets, profit: profit, accurate: accurate, bot: true };
  }

  function renderDuelIntro() {
    var f = PENDING;
    return '<div class="home-audio">' + audioBtns() + '</div>' +
      '<div class="home-head">' +
      '<div class="sign">滁州夜市</div>' +
      '<div class="subtitle">串 串 摊 · 速 玩 版</div>' +
      '<div class="pill">有人给你下了战书</div></div>' +
      sceneHtml(null, false) +
      '<div class="card"><h3 style="margin:0 0 8px">同一条街，轮到你了</h3>' +
      '<p style="margin:0 0 8px;font-size:14px;line-height:1.8">好友已经押完 7 晚：净赚 <b>¥' + f.profit +
      '</b>、押准 <b>' + f.accurate + '</b> 晚。<br>你遇到的是<b>完全相同</b>的天气、街坊消息和客人，自己押一遍，看谁赚得多。</p>' +
      '<div class="muted">不用同时在线，也不用同一台设备；点开链接就能应战。<br>同一段街：' +
      (STAGES[f.stage] ? STAGES[f.stage].name : '巷口小摊') + '，同样的天气和客人。</div></div>' +
      '<button class="btn-big" data-act="accept">应 战 ！</button>' +
      '<button class="btn-ghost btn" data-act="decline" style="margin-top:10px">先不玩，回首页</button>' +
      '<div class="foot-note">这是异步战书，不是在线匹配；双方各玩各的 7 晚，收摊自动比成绩。</div>';
  }

  function vsHtml() {
    var f = G.foe, st = G.stat;
    var myWin = st.totalProfit > f.profit;
    var draw = st.totalProfit === f.profit;
    return '<div class="card"><h3 style="margin:0 0 6px">' +
      (f.bot ? '和「' + f.name + '」摆了同一条街' : '战书结果 · 和好友同一条街') + '</h3>' +
      '<table class="duo-table"><tr><th></th><th>你</th><th>' + (f.bot ? f.name : '好友') + '</th></tr>' +
      '<tr><td>7 天净赚</td><td class="' + (myWin ? 'win' : '') + '">¥' + st.totalProfit + '</td>' +
      '<td class="' + (!myWin && !draw ? 'win' : '') + '">¥' + f.profit + '</td></tr>' +
      '<tr><td>押准晚数</td><td>' + st.accurate + '</td><td>' + f.accurate + '</td></tr></table>' +
      '<div class="center" style="font-weight:900;color:#c8471f">' +
      (draw ? '打平了，再来一局！' : (myWin ? '你赢了！' : '这局输了，再摆一遍？')) + '</div>' +
      (f.bot ? '<div class="muted center">对手是电脑摊主，按固定街况押注；纯静态 H5 没有真人在线匹配</div>' : '') +
      '</div>';
  }

  function inviteHtml() {
    var safe = String(G.duelLink).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    return '<div class="card"><h3 style="margin:0 0 6px">把战书发给好友</h3>' +
      '<div class="muted">同一条街、同样 7 晚的天气和客人。他点开链接应战，两边自动比净利和押准晚数；不用同时在线。</div>' +
      '<input class="duel-link" id="duelLink" readonly value="' + safe + '">' +
      '<button class="btn" data-act="copylink">复制战书链接</button></div>';
  }

  // ==================== 分享 ====================
  function shareText() {
    var t = G.title, st = G.stat;
    var stageName = STAGES[st.stage] ? STAGES[st.stage].name : '';
    if (G.mode === 'invite') {
      return '【滁州夜市 · 串串摊】' + stageName + '摆完 7 晚，净赚 ¥' + st.totalProfit +
        '、押准 ' + st.accurate + ' 晚，最赚的一晚 ¥' + st.bestNight +
        '。同一条街，敢不敢再摆一遍？\n点开应战：' + G.duelLink;
    }
    var extra = G.mode === 'daily' ? '今日挑战（同一条街）'
      : ((G.mode === 'duel' || G.mode === 'rival') && G.foe
        ? '对战 ' + G.foe.name + '：我 ¥' + st.totalProfit + ' vs 对方 ¥' + G.foe.profit
        : '第 ' + G.cycle + ' 周目 · ' + stageName + ' · 7 天速玩' +
          (SAVE.clears ? '（已通 ' + SAVE.clears + ' 个周目）' : ''));
    return '【滁州夜市 · 串串摊 速玩版】' + extra +
      '\n7 天押准 ' + st.accurate + ' 晚，净赚 ¥' + st.totalProfit + '，平均只差 ' + st.avgDiff + ' 签' +
      '\n最赚的一晚 ¥' + st.bestNight + '，靠定价多赚 ¥' + st.priceGain + '，满堂彩 ' + st.jackpots + ' 次' +
      '\n拿下称号【' + t.name + '】——' + t.desc +
      '\n来 4399 搜「滁州夜市」，看你能不能比我赚得多！';
  }
  function copyText(txt, msg) {
    var m = msg || '战书已复制，发给好友吧！';
    // 浏览器可能在无用户手势时直接抛错；复制失败也不能挡住后续的加次数逻辑
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(function () { toast(m); },
          function () { fallbackCopy(txt, m); });
      } else fallbackCopy(txt, m);
    } catch (e) { fallbackCopy(txt, m); }
  }
  function fallbackCopy(txt, msg) {
    var m = msg || '战书已复制，发给好友吧！';
    try {
      var ta = document.createElement('textarea');
      ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
      toast(m);
    } catch (e) { toast('复制失败，长按下方文字手动复制～'); }
  }

  // ==================== 事件 ====================
  document.addEventListener('input', function (e) {
    if (e.target && e.target.id === 'betSlider' && G && screen === 'day') {
      setBet(Number(e.target.value)); sfx.tick();
    }
  });

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-act]');
    if (!t) return;
    var act = t.dataset.act;
    if (act !== 'mute') sfx.click();
    if (act !== 'bgm') kickBgm();
    switch (act) {
      case 'bgm': bgm.toggle(); break;
      case 'start':
        newGame(t.dataset.mode || 'solo',
          t.dataset.stage != null ? { stage: Number(t.dataset.stage) } : {});
        break;
      case 'price':
        setPrice(Number(t.dataset.v));
        break;
      case 'clue':
        digClue(t.dataset.id);
        break;
      case 'nextStage':
        newGame('solo', { stage: Math.min(G.stage + 1, STAGES.length - 1) });
        break;
      case 'retryStage':
        newGame('solo', { stage: G.stage });
        break;
      case 'restartAll':
        newGame('solo', { stage: 0 });
        break;
      case 'home':
        revealToken++; go('home');
        break;
      case 'mute':
        SAVE.muted = !SAVE.muted; save(); render();
        toast(SAVE.muted ? '音效已关' : '音效已开');
        break;
      case 'collection':
        go('collection');
        break;
      case 'adj':
        setBet(G.bet + Number(t.dataset.delta));
        break;
      case 'master':
        setBet(Number(t.dataset.v));
        toast('照军师押了 ' + G.bet + ' 签——他也会看走眼，自己掂量');
        break;
      case 'open':
        SAVE.doneTutorial = true; save();
        go('reveal');
        break;
      case 'skip':
        revealToken++;
        showRevealCard();
        break;
      case 'next':
        nextDay();
        break;
      case 'again':
        if (G.mode === 'duel' || G.mode === 'rival') newGame(G.mode, { seed: G.seed, foe: G.foe, stage: G.stage });
        else newGame(G.mode, { stage: G.stage });
        break;
      case 'share':
        copyText(shareText());
        break;
      case 'topupShare':
        copyInvite();
        break;
      case 'topupAd':
        playAdDemo();
        break;
      case 'copylink':
        copyText(G.duelLink);
        break;
      case 'accept':
        if (PENDING) {
          var f = PENDING; PENDING = null;
          newGame('duel', { seed: f.seed, stage: f.stage,
            foe: { name: '好友', bets: f.bets, profit: f.profit, accurate: f.accurate, bot: false } });
        }
        break;
      case 'decline':
        PENDING = null;
        try { var u2 = new URL(location.href); u2.searchParams.delete('duel'); history.replaceState(null, '', u2.toString()); } catch (e2) {}
        go('home');
        break;
    }
  });

  // ==================== 启动 ====================
  var PENDING = readDuelFromUrl();
  if (PENDING) screen = 'duelIntro';
  render();
})();
