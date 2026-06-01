// 推演拆解引擎（纯前端、确定性）：把一句决策输入识别为某类决策原型，
// 生成相关的「组织/人物/价值/风险」标签覆盖局部图谱周围星球；
// 并为社会沙盘提供对应类型的星球标签池（事件/角色/平台/风险/结果）。

export type ScenarioOverride = { label: string; explanation: string };

type Archetype = {
  id: string;
  match: RegExp;
  org: string;
  persons: [string, string, string];
  values: [string, string, string, string];
  risks: [string, string, string, string];
};

// 周围节点槽位 → 局部图谱里的真实节点 id
const SLOTS = {
  org: "company",
  persons: ["partner", "family", "mentor"] as const,
  values: ["cashflow", "growth", "freedom", "identity"] as const,
  risks: ["risk-cash", "risk-window", "risk-focus", "risk-relation"] as const
};

// 决策原型库（更具体的在前匹配）
const ARCHETYPES: Archetype[] = [
  {
    id: "civil-service",
    match: /公务员|考公|体制|编制|上岸|事业单位|国企|铁饭碗/,
    org: "现单位",
    persons: ["体制内同学", "父母期望", "上岸前辈"],
    values: ["收入稳定", "晋升通道", "生活节奏", "社会认同"],
    risks: ["收入落差", "年龄门槛", "职业倦怠", "异地分居"]
  },
  {
    id: "marriage",
    match: /结婚|领证|对象|恋爱|分手|相亲|伴侣|男友|女友|感情|要不要在一起/,
    org: "双方家庭",
    persons: ["伴侣", "父母", "已婚朋友"],
    values: ["经济基础", "共同成长", "个人空间", "人生阶段"],
    risks: ["经济压力", "年龄焦虑", "三观差异", "激情消退"]
  },
  {
    id: "house",
    match: /买房|房子|首付|月供|楼盘|学区房|置业|贷款买/,
    org: "中介楼盘",
    persons: ["另一半", "父母首付", "已购房朋友"],
    values: ["首付能力", "升值空间", "通勤距离", "居住品质"],
    risks: ["月供断供", "房价下跌", "学区变动", "流动性差"]
  },
  {
    id: "study-abroad",
    match: /留学|出国|读研|考研|深造|读博|名校|gap\s?year|申研|读个研/,
    org: "目标院校",
    persons: ["推荐人", "父母", "校友学长"],
    values: ["费用预算", "院校层次", "职业前景", "视野拓展"],
    risks: ["签证风险", "回国落差", "适应压力", "家庭分离"]
  },
  {
    id: "job-change",
    match: /跳槽|换工作|离职|裁员|入职|猎头|涨薪|新 ?offer|要不要去/,
    org: "目标公司",
    persons: ["现领导", "猎头", "内推朋友"],
    values: ["薪资涨幅", "成长空间", "工作强度", "稳定性"],
    risks: ["试用期风险", "行业下行", "通勤变长", "团队不合"]
  },
  {
    id: "startup",
    match: /创业|转行|副业|做号|自媒体|开店|接单|独立开发|做产品|搞 ?ai|做 ?ai|All ?in|梭哈/i,
    org: "现公司",
    persons: ["合伙人", "家庭支持", "行业导师"],
    values: ["现金流", "成长速度", "自由度", "身份认同"],
    risks: ["现金流断裂", "错过窗口", "精力分散", "关系张力"]
  }
];

const GENERIC: Omit<Archetype, "match"> = {
  id: "generic",
  org: "相关组织",
  persons: ["关键人物", "支持者", "过来人"],
  values: ["主要成本", "潜在收益", "时间投入", "自我认同"],
  risks: ["最大风险", "机会成本", "精力分散", "关系影响"]
};

function archetypeOf(input: string): Omit<Archetype, "match"> {
  return ARCHETYPES.find((item) => item.match.test(input)) ?? GENERIC;
}

export function matchArchetypeKey(input: string): string {
  return archetypeOf(input).id;
}

// 局部图谱：中心 + 周围节点覆盖
export function deriveScenarioOverrides(input: string, centerLabel: string): Record<string, ScenarioOverride> {
  const archetype = archetypeOf(input);
  const overrides: Record<string, ScenarioOverride> = {};

  overrides.choice = { label: centerLabel, explanation: input };
  overrides[SLOTS.org] = { label: archetype.org, explanation: `与「${centerLabel}」相关的关键组织 / 场景。` };
  SLOTS.persons.forEach((id, index) => {
    overrides[id] = { label: archetype.persons[index], explanation: `「${centerLabel}」中的关键角色：${archetype.persons[index]}。` };
  });
  SLOTS.values.forEach((id, index) => {
    overrides[id] = { label: archetype.values[index], explanation: `评估「${centerLabel}」的价值维度：${archetype.values[index]}。` };
  });
  SLOTS.risks.forEach((id, index) => {
    overrides[id] = { label: archetype.risks[index], explanation: `「${centerLabel}」需要监控的风险：${archetype.risks[index]}。` };
  });

  return overrides;
}

// 社会沙盘：按节点类型提供标签池（事件/角色/平台/风险/结果），由星系按类型循环取用。
export function galaxyLabelsFor(input: string, topic: string): Record<string, string[]> {
  const archetype = archetypeOf(input);
  return {
    event: [topic || "核心议题", "关键决策点", "外部变化", "时间窗口", "转折信号", "触发事件"],
    actor: [...archetype.persons, "支持者", "反对者", "旁观者", "过来人", "决策者"],
    platform: [archetype.org, "信息渠道", "同温层", "权威机构", "舆论场", "关系网络"],
    risk: [...archetype.risks, "不确定性", "外部冲击", "机会成本"],
    outcome: ["理想结果", "保底结果", "最坏情况", "意外转机", "原地踏步", "渐进改善"]
  };
}
