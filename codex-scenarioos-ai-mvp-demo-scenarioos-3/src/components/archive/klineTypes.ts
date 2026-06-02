export interface KLinePoint {
  age: number;
  year: number;
  ganZhi: string;
  daYun?: string;
  open: number;
  close: number;
  high: number;
  low: number;
  score: number;
  reason: string;
}

export interface DaYunZone {
  daYun: string | undefined;
  startAge: number;
  endAge: number;
  index: number;
}

export function calculateMA(data: KLinePoint[], period: number): (number | null)[] {
  return data.map((_, index) => {
    if (index < period - 1) return null;
    const slice = data.slice(index - period + 1, index + 1);
    const sum = slice.reduce((acc, d) => acc + d.score, 0);
    return Math.round((sum / period) * 10) / 10;
  });
}

export function generateDemoKLine(birthYear: number, currentYear: number): KLinePoint[] {
  const TIANGAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
  const DIZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
  const DAYUN_LABELS = ["童限", "初运", "青运", "壮运", "中运", "暮运", "晚运", "老运"];
  const mod = (v: number, n: number) => ((v % n) + n) % n;
  const ganZhi = (year: number) => `${TIANGAN[mod(year - 4, 10)]}${DIZHI[mod(year - 4, 12)]}`;

  const REASON_TEMPLATES = [
    "流年干支入命，五行得势，事业与表达能力上扬，适合主动争取资源和曝光。",
    "大运与流年相冲，财星受扰，宜保守推进，重点关注现金流、健康与家庭秩序。",
    "贵人星动，适合学习、谈判、签约与跨圈层协作，外部助力更容易出现。",
    "桃花流年，情绪与关系议题被放大，适合修复沟通，也要避免冲动承诺。",
    "驿马星动，利迁移、出行、异地合作与转型探索，新的场域会带来机会。",
    "官星透出，利职位、规则、考核与责任升级，但要控制口舌和合规风险。",
    "财帛宫受压，投资和扩张要谨慎，先稳住主业，再处理高风险选择。",
    "比劫旺盛，竞争压力上升，适合提升专业壁垒，合同与分账要写清楚。",
    "食神生财，创造力、内容表达和副业收益更容易转化，适合做作品沉淀。",
    "七煞入命，短期压力较强，适合收缩、复盘和蓄力，逆境中仍可建立韧性。",
  ];

  const points: KLinePoint[] = [];
  let prevScore = 55 + Math.sin(birthYear) * 8;
  let daYunIdx = 0;

  for (let age = 1; age <= 100; age++) {
    const year = birthYear + age - 1;
    const gz = ganZhi(year);
    if (age > 1 && (age - 1) % 10 === 0) daYunIdx++;
    const daYun = age <= 6 ? "童限" : DAYUN_LABELS[Math.min(daYunIdx, DAYUN_LABELS.length - 1)];

    const tiangangIdx = mod(year - 4, 10);
    const dizhiIdx = mod(year - 4, 12);
    const wave = Math.sin(age * 0.38 + tiangangIdx * 0.7) * 22 + Math.cos(dizhiIdx * 0.5 + age * 0.12) * 12;
    const noise = (Math.sin(age * 17 + birthYear) - 0.5) * 14;
    const score = Math.round(Math.max(18, Math.min(96, 52 + wave + noise)));

    const delta = score - prevScore;
    const bodySize = Math.abs(delta) * 0.6 + 4;
    const open = Math.round(prevScore + (delta > 0 ? -bodySize * 0.3 : bodySize * 0.3));
    const close = Math.round(open + delta * 0.8);
    const high = Math.round(Math.max(open, close) + Math.abs(noise) * 0.5 + 2);
    const low = Math.round(Math.min(open, close) - Math.abs(noise) * 0.4 - 1);

    const isCurrentYear = year === currentYear;
    const reasonIdx = mod(tiangangIdx + dizhiIdx + age, REASON_TEMPLATES.length);
    const reason = `${gz}年（${age}岁）${REASON_TEMPLATES[reasonIdx]}${isCurrentYear ? " 当前流年，建议重点观察。" : ""}`;

    points.push({
      age,
      year,
      ganZhi: gz,
      daYun,
      open: Math.max(5, open),
      close: Math.max(5, close),
      high: Math.max(7, high),
      low: Math.max(3, low),
      score,
      reason,
    });
    prevScore = score;
  }

  return points;
}
