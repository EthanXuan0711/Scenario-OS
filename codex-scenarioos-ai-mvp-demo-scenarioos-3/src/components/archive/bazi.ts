// 八字命理分析引擎（纯前端、确定性）。
// 在原有「年月日时四柱」基础上扩展：藏干、十神、五行力量分布、纳音、旺衰、喜用神。
// 说明：月柱与节气、真太阳时校正为近似算法，用于可视化与体验，并非专业排盘精度。

export type WuXing = "木" | "火" | "土" | "金" | "水";

export const TIANGAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"] as const;
export const DIZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;

// 天干五行 / 阴阳（true=阳）
const TG_WX: WuXing[] = ["木", "木", "火", "火", "土", "土", "金", "金", "水", "水"];
const TG_YANG = [true, false, true, false, true, false, true, false, true, false];
// 地支五行
const DZ_WX: WuXing[] = ["水", "土", "木", "木", "土", "火", "火", "土", "金", "金", "土", "水"];

// 地支藏干（本气 / 中气 / 余气），权重 1 / 0.55 / 0.25
const HIDDEN: Record<string, string[]> = {
  子: ["癸"],
  丑: ["己", "癸", "辛"],
  寅: ["甲", "丙", "戊"],
  卯: ["乙"],
  辰: ["戊", "乙", "癸"],
  巳: ["丙", "庚", "戊"],
  午: ["丁", "己"],
  未: ["己", "丁", "乙"],
  申: ["庚", "壬", "戊"],
  酉: ["辛"],
  戌: ["戊", "辛", "丁"],
  亥: ["壬", "甲"],
};
const HIDDEN_WEIGHT = [1, 0.55, 0.25];

// 纳音（30 项，每项覆盖一对六十甲子）
const NAYIN = [
  "海中金", "炉中火", "大林木", "路旁土", "剑锋金", "山头火", "涧下水", "城头土", "白蜡金", "杨柳木",
  "泉中水", "屋上土", "霹雳火", "松柏木", "长流水", "砂中金", "山下火", "平地木", "壁上土", "金箔金",
  "覆灯火", "天河水", "大驿土", "钗钏金", "桑柘木", "大溪水", "沙中土", "天上火", "石榴木", "大海水",
];

export const WX_META: Record<WuXing, { color: string; glow: string; soft: string }> = {
  木: { color: "#5eead4", glow: "#14b8a6", soft: "rgba(94,234,212,0.14)" },
  火: { color: "#fb7185", glow: "#f43f5e", soft: "rgba(251,113,133,0.14)" },
  土: { color: "#facc15", glow: "#eab308", soft: "rgba(250,204,21,0.14)" },
  金: { color: "#e5e7eb", glow: "#94a3b8", soft: "rgba(226,232,240,0.14)" },
  水: { color: "#60a5fa", glow: "#2563eb", soft: "rgba(96,165,250,0.14)" },
};

// 五行生克
const SHENG: Record<WuXing, WuXing> = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" };
const KE: Record<WuXing, WuXing> = { 木: "土", 火: "金", 土: "水", 金: "木", 水: "火" };

const mod = (v: number, n: number) => ((v % n) + n) % n;

const tgIndex = (tg: string) => TIANGAN.indexOf(tg as (typeof TIANGAN)[number]);
const dzIndex = (dz: string) => DIZHI.indexOf(dz as (typeof DIZHI)[number]);

export const wuxingOfStem = (tg: string): WuXing => TG_WX[tgIndex(tg)] ?? "土";
export const wuxingOfBranch = (dz: string): WuXing => DZ_WX[dzIndex(dz)] ?? "土";

// 六十甲子序号（0–59）
function jiaziIndex(tg: string, dz: string): number {
  const s = tgIndex(tg);
  const b = dzIndex(dz);
  for (let n = 0; n < 60; n++) if (n % 10 === s && n % 12 === b) return n;
  return 0;
}

export function naYin(tg: string, dz: string): string {
  return NAYIN[Math.floor(jiaziIndex(tg, dz) / 2)] ?? "—";
}

// 十神：以日主天干为参照，判断另一天干的十神关系
export type ShiShen =
  | "比肩" | "劫财" | "食神" | "伤官" | "偏财"
  | "正财" | "七杀" | "正官" | "偏印" | "正印";

export function tenGod(dayStem: string, otherStem: string): ShiShen {
  const di = tgIndex(dayStem);
  const oi = tgIndex(otherStem);
  const dWx = TG_WX[di];
  const oWx = TG_WX[oi];
  const samePolarity = TG_YANG[di] === TG_YANG[oi];

  if (dWx === oWx) return samePolarity ? "比肩" : "劫财";
  if (SHENG[dWx] === oWx) return samePolarity ? "食神" : "伤官"; // 我生
  if (KE[dWx] === oWx) return samePolarity ? "偏财" : "正财"; // 我克
  if (KE[oWx] === dWx) return samePolarity ? "七杀" : "正官"; // 克我
  return samePolarity ? "偏印" : "正印"; // 生我
}

export const SHISHEN_GROUP: Record<ShiShen, { group: string; tone: string }> = {
  比肩: { group: "比劫", tone: "#a3e635" },
  劫财: { group: "比劫", tone: "#a3e635" },
  食神: { group: "食伤", tone: "#5eead4" },
  伤官: { group: "食伤", tone: "#5eead4" },
  偏财: { group: "财星", tone: "#facc15" },
  正财: { group: "财星", tone: "#facc15" },
  七杀: { group: "官杀", tone: "#fb7185" },
  正官: { group: "官杀", tone: "#fb7185" },
  偏印: { group: "印星", tone: "#a78bfa" },
  正印: { group: "印星", tone: "#a78bfa" },
};

export interface Pillar {
  label: string;
  key: "year" | "month" | "day" | "hour";
  gan: string;
  zhi: string;
  ganWx: WuXing;
  zhiWx: WuXing;
  hidden: string[];
  naYin: string;
  god: ShiShen | "日主";
}

export interface BaziChart {
  pillars: Pillar[];
  dayStem: string;
  dayMasterWx: WuXing;
  // 五行力量（已归一为百分比）
  elements: { name: WuXing; pct: number; raw: number }[];
  strongest: WuXing;
  weakest: WuXing;
  // 旺衰
  selfRatio: number; // 同党（比劫+印）占比
  strength: "身强" | "均衡" | "身弱";
  // 喜用神
  favorable: WuXing[];
  unfavorable: WuXing[];
  // 十神计数（按组）
  godGroups: { group: string; count: number; tone: string }[];
  summary: string;
}

export interface BirthLike {
  year?: number;
  month?: number;
  day?: number;
  hour?: number;
  timeKnown?: boolean;
}

function monthPillar(year: number, month: number): [string, string] {
  const idx = mod(year * 12 + month - 3, 10);
  return [TIANGAN[idx], DIZHI[mod(month + 1, 12)]];
}

function dayPillar(year: number, month: number, day: number): [string, string] {
  const a = Math.floor((14 - month) / 12);
  const yr = year - a;
  const mo = month + 12 * a - 2;
  const off = Math.floor(
    (day + yr + Math.floor(yr / 4) - Math.floor(yr / 100) + Math.floor(yr / 400) + Math.floor((31 * mo) / 12)) % 60,
  );
  return [TIANGAN[off % 10], DIZHI[off % 12]];
}

function hourPillar(dayStem: string, hour: number): [string, string] {
  // 五鼠遁：日干定时干
  const zhiIdx = Math.floor(mod(hour + 1, 24) / 2);
  const base = (tgIndex(dayStem) % 5) * 2; // 甲己→甲子起
  const ganIdx = mod(base + zhiIdx, 10);
  return [TIANGAN[ganIdx], DIZHI[zhiIdx]];
}

export function computeBazi(birth: BirthLike): BaziChart | null {
  if (!birth?.year) return null;
  const year = birth.year;
  const month = birth.month ?? 1;
  const day = birth.day ?? 1;
  const hour = birth.hour ?? 12;
  const timeKnown = birth.timeKnown ?? false;

  const yp: [string, string] = [TIANGAN[mod(year - 4, 10)], DIZHI[mod(year - 4, 12)]];
  const mp = monthPillar(year, month);
  const dp = dayPillar(year, month, day);
  const dayStem = dp[0];
  const hp = hourPillar(dayStem, hour);

  const raw: [Pillar["label"], Pillar["key"], [string, string], boolean][] = [
    ["年柱", "year", yp, true],
    ["月柱", "month", mp, true],
    ["日柱", "day", dp, true],
    ["时柱", "hour", hp, timeKnown],
  ];

  const pillars: Pillar[] = raw.map(([label, key, [gan, zhi], known]) => ({
    label,
    key,
    gan: known ? gan : "?",
    zhi: known ? zhi : "?",
    ganWx: known ? wuxingOfStem(gan) : "土",
    zhiWx: known ? wuxingOfBranch(zhi) : "土",
    hidden: known ? HIDDEN[zhi] ?? [] : [],
    naYin: known ? naYin(gan, zhi) : "—",
    god: key === "day" ? "日主" : known ? tenGod(dayStem, gan) : "正印",
  }));

  // ── 五行力量分布 ──
  const power: Record<WuXing, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  for (const p of pillars) {
    if (p.gan === "?") continue;
    power[p.ganWx] += 1; // 天干
    p.hidden.forEach((h, i) => {
      power[wuxingOfStem(h)] += HIDDEN_WEIGHT[i] ?? 0.25;
    });
  }
  const total = Object.values(power).reduce((a, b) => a + b, 0) || 1;
  const order: WuXing[] = ["木", "火", "土", "金", "水"];
  const elements = order.map((name) => ({ name, raw: power[name], pct: Math.round((power[name] / total) * 100) }));

  const sorted = [...elements].sort((a, b) => b.raw - a.raw);
  const strongest = sorted[0].name;
  const weakest = sorted[sorted.length - 1].name;

  // ── 旺衰：日主同党（同我比劫 + 生我印星）力量占比 ──
  const dWx = wuxingOfStem(dayStem);
  const sameElement = dWx;
  const resourceElement = (Object.keys(SHENG) as WuXing[]).find((k) => SHENG[k] === dWx)!; // 生我
  const selfRaw = power[sameElement] + power[resourceElement];
  const selfRatio = Math.round((selfRaw / total) * 100);
  const strength: BaziChart["strength"] = selfRatio >= 52 ? "身强" : selfRatio <= 38 ? "身弱" : "均衡";

  // ── 喜用神（启发式）──
  const drain = SHENG[dWx]; // 我生（食伤）
  const wealth = KE[dWx]; // 我克（财）
  const officer = (Object.keys(KE) as WuXing[]).find((k) => KE[k] === dWx)!; // 克我（官杀）
  let favorable: WuXing[];
  let unfavorable: WuXing[];
  if (strength === "身强") {
    favorable = [officer, wealth, drain];
    unfavorable = [sameElement, resourceElement];
  } else if (strength === "身弱") {
    favorable = [resourceElement, sameElement];
    unfavorable = [officer, wealth];
  } else {
    favorable = [wealth, drain];
    unfavorable = [];
  }

  // ── 十神分组计数 ──
  const groupCount: Record<string, { count: number; tone: string }> = {};
  for (const p of pillars) {
    if (p.god === "日主" || p.gan === "?") continue;
    const meta = SHISHEN_GROUP[p.god as ShiShen];
    groupCount[meta.group] = { count: (groupCount[meta.group]?.count ?? 0) + 1, tone: meta.tone };
  }
  const godGroups = Object.entries(groupCount).map(([group, v]) => ({ group, count: v.count, tone: v.tone }));

  const summary =
    `日主${dayStem}${dWx}，命局${strength}。` +
    `五行以${strongest}最旺、${weakest}最弱；` +
    `喜用${favorable.join("、")}，` +
    (unfavorable.length ? `忌${unfavorable.join("、")}。` : "宜动静相济。");

  return {
    pillars,
    dayStem,
    dayMasterWx: dWx,
    elements,
    strongest,
    weakest,
    selfRatio,
    strength,
    favorable,
    unfavorable,
    godGroups,
    summary,
  };
}

// 生肖
const ZODIAC = ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"];
export const zodiacOf = (year: number) => ZODIAC[mod(year - 4, 12)];

// ─────────────────────────────────────────────────────────────
// 命理符号 → 现实变量 译码层（PRD 5.9 合规要求）
// 每个符号必须：① 能展开到现实决策变量 ② 标注来源 ③ 配一个可验证问题。
// 这样命盘是"个人模式/阶段趋势"的表达，而非不可改变的算命。
// ─────────────────────────────────────────────────────────────

// 来源：从哪来的判断
export type ReadingSource = "出生信息" | "用户叙述" | "历史回填" | "系统推断";

export type SymbolReading = {
  symbol: string; // 符号本身，如「壬水日主」「官杀显」「身弱」「喜用 火木」
  category: "五行" | "十神" | "旺衰" | "喜用";
  meaning: string; // 产品内含义（行为/决策语言，不承诺命运）
  variables: string[]; // 对应现实变量（与命盘·决策六维同一套语言）
  sources: ReadingSource[]; // 来源标注
  question: string; // 未来 30 天可验证问题
};

// 五行 → 行动风格 / 能量来源 → 现实变量
const WX_VARS: Record<WuXing, { style: string; vars: string[] }> = {
  木: { style: "向上生长、主动探索", vars: ["成长速度", "主动性", "自由度"] },
  火: { style: "热情表达、对外扩张", vars: ["表达欲", "关系热度", "风险承受度"] },
  土: { style: "承载稳定、蓄力守界", vars: ["稳定性", "边界感", "现金流权重"] },
  金: { style: "收敛精炼、果断决策", vars: ["决断力", "规则感", "身份一致性"] },
  水: { style: "灵活流动、智谋整合", vars: ["灵活性", "资源整合", "自由度"] },
};

// 十神组 → 与外界互动方式 → 现实变量
const GOD_VARS: Record<string, { style: string; vars: string[] }> = {
  比劫: { style: "竞争心强、自我驱动、重独立", vars: ["自驱力", "竞争倾向", "身份一致性"] },
  食伤: { style: "表达输出、创造发散、爱自主", vars: ["表达欲", "成长速度", "自由度"] },
  财星: { style: "务实导向、重资源与目标", vars: ["现金流权重", "资源整合", "执行力"] },
  官杀: { style: "规则感强、责任压力、在意外部期待", vars: ["规则感", "关系权重", "责任压力"] },
  印星: { style: "重学习、倾向借力与内省", vars: ["学习倾向", "支持依赖", "稳定性"] },
};

export function interpretBazi(chart: BaziChart): SymbolReading[] {
  const readings: SymbolReading[] = [];

  // ① 日主五行
  const dm = WX_VARS[chart.dayMasterWx];
  readings.push({
    symbol: `${chart.dayStem}${chart.dayMasterWx} · 日主`,
    category: "五行",
    meaning: `你的底层行动风格偏「${dm.style}」，这是默认的能量来源，不是固定结局。`,
    variables: dm.vars,
    sources: ["出生信息", "系统推断"],
    question: `未来 30 天，你是否确实更习惯用「${dm.style}」的方式推进当前这个决策，而不是相反？`,
  });

  // ② 主导十神（出现次数最多的组；并列取第一个）
  if (chart.godGroups.length) {
    const top = [...chart.godGroups].sort((a, b) => b.count - a.count)[0];
    const g = GOD_VARS[top.group];
    if (g) {
      readings.push({
        symbol: `${top.group}显（×${top.count}）`,
        category: "十神",
        meaning: `你与外界互动更容易呈现「${g.style}」的倾向。`,
        variables: g.vars,
        sources: ["出生信息", "系统推断"],
        question:
          top.group === "官杀"
            ? "未来 30 天，你是否更容易因为「怕不符合规则 / 他人期待」而推迟一个本想做的决定？"
            : top.group === "印星"
              ? "未来 30 天，面对难题时你是否更倾向先找人/找资料借力，而不是直接动手？"
              : top.group === "食伤"
                ? "未来 30 天，当你有自由表达/创作空间时，投入度是否明显更高？"
                : top.group === "财星"
                  ? "未来 30 天，你是否更容易被「能不能带来现实回报」牵引决策？"
                  : "未来 30 天，你是否更倾向独立扛事、不太愿意把主导权交出去？",
      });
    }
  }

  // ③ 旺衰
  const strengthReading: Record<BaziChart["strength"], { meaning: string; vars: string[]; q: string }> = {
    身强: {
      meaning: "自驱与主动性偏强，倾向主动出击；要留意「用力过猛 / 不易听劝」。",
      vars: ["主动性偏高", "风险承受度偏高"],
      q: "未来 30 天，你是否至少有一次因为太想主导而忽略了关键反对意见？",
    },
    身弱: {
      meaning: "更适合借力与稳扎稳打；压力大时容易回避，需要外部支撑。",
      vars: ["风险承受度偏保守", "支持依赖", "关系权重"],
      q: "未来 30 天，遇到压力时你是否更容易回避正面沟通、把决定往后拖？",
    },
    均衡: {
      meaning: "动静相济，攻守切换空间较大；优势是弹性，风险是缺乏鲜明取舍。",
      vars: ["灵活性", "适应力"],
      q: "未来 30 天，你是否会因为「都还行」而迟迟不给当前决策一个明确取舍？",
    },
  };
  const sr = strengthReading[chart.strength];
  readings.push({
    symbol: `命局 · ${chart.strength}`,
    category: "旺衰",
    meaning: sr.meaning,
    variables: sr.vars,
    sources: ["出生信息", "系统推断"],
    question: sr.q,
  });

  // ④ 喜用神（建议的能量补强方向）
  if (chart.favorable.length) {
    const favStyles = chart.favorable.map((f) => `${f}(${WX_VARS[f].style})`).join("、");
    const favVars = Array.from(new Set(chart.favorable.flatMap((f) => WX_VARS[f].vars)));
    readings.push({
      symbol: `喜用 ${chart.favorable.join("")}`,
      category: "喜用",
      meaning: `当前阶段，往「${favStyles}」方向用力，更可能顺势；这是行动建议，不是吉凶定论。`,
      variables: favVars,
      sources: ["系统推断"],
      question: `未来 30 天，当你主动往「${chart.favorable[0]}」对应的方式发力时，事情推进是否确实更顺？`,
    });
  }

  return readings;
}

// 合规声明（前台必须随符号命盘一起出现）
export const BAZI_DISCLAIMER =
  "命盘是你个人决策模式与阶段趋势的「符号化表达」，不是不可改变的命运。每个符号都对应可观察、可验证的现实变量，请用上面的问题在 30 天后回填验证。";
