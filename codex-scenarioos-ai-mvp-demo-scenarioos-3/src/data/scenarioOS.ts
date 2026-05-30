import type { ActionProtocolItem, CouncilOpinion, DecisionVariable, ScenarioEdge, ScenarioNode, ScenarioPath } from "../types";

export const intakeQuestions = [
  "你现在最纠结的选择是什么？",
  "这件事里你最怕失去什么？",
  "类似事情以前发生过吗？那次你怎么做的？"
];

export const initialMessages = [
  {
    from: "system" as const,
    body: "欢迎进入 ScenarioOS。先把一个真实困境放到桌面上，我会把它拆成变量、人物、风险和路径。"
  },
  {
    from: "system" as const,
    body: intakeQuestions[0]
  }
];

export const quickReplies = [
  "我要不要转行做 AI？",
  "这段合作关系要不要继续？",
  "要不要离开现在的城市？"
];

export const graphNodes: ScenarioNode[] = [
  {
    id: "choice",
    type: "choice",
    label: "转行 AI",
    shell: 0,
    weight: 96,
    confidence: "high",
    explanation: "当前核心抉择。它会同时改写现金流、成长曲线、身份认同和关键关系。"
  },
  {
    id: "self",
    type: "self",
    label: "我",
    shell: 0,
    weight: 88,
    confidence: "high",
    explanation: "决策者本人。系统只做推演与验证设计，不替你做最终选择。"
  },
  {
    id: "company",
    type: "organization",
    label: "现公司",
    shell: 1,
    weight: 68,
    confidence: "medium",
    explanation: "稳定收入来源，也是当前成长速度放缓的主要环境。"
  },
  {
    id: "partner",
    type: "person",
    label: "合伙人",
    shell: 1,
    weight: 62,
    confidence: "medium",
    explanation: "可能提供技术或项目互补，但协作承诺尚未被现实压力测试。"
  },
  {
    id: "family",
    type: "person",
    label: "家人",
    shell: 1,
    weight: 58,
    confidence: "medium",
    explanation: "偏好稳定，对激进转型的接受度取决于可见的现金流缓冲。"
  },
  {
    id: "mentor",
    type: "person",
    label: "行业导师",
    shell: 1,
    weight: 52,
    confidence: "low",
    explanation: "外部校准者。当前证据不足，适合通过访谈补齐。"
  },
  {
    id: "cashflow",
    type: "value",
    label: "现金流",
    shell: 2,
    weight: 86,
    confidence: "high",
    explanation: "决定转型速度的硬约束。储备不足会把高潜力路径变成被迫止损。"
  },
  {
    id: "freedom",
    type: "value",
    label: "自由度",
    shell: 2,
    weight: 74,
    confidence: "medium",
    explanation: "你对自主选择和工作方式弹性的偏好较强，会抬高创业或独立项目的吸引力。"
  },
  {
    id: "growth",
    type: "value",
    label: "成长速度",
    shell: 2,
    weight: 82,
    confidence: "high",
    explanation: "当前岗位成长曲线趋缓，是你考虑切换赛道的主驱动力。"
  },
  {
    id: "identity",
    type: "value",
    label: "身份一致性",
    shell: 2,
    weight: 65,
    confidence: "medium",
    explanation: "这条路是否像你真正想成为的人，比短期标签更重要。"
  },
  {
    id: "risk-cash",
    type: "risk",
    label: "现金流断裂",
    shell: 3,
    weight: 80,
    confidence: "high",
    explanation: "如果全职转型前没有缓冲，失败会从职业问题扩散成生活压力。"
  },
  {
    id: "risk-window",
    type: "risk",
    label: "错过窗口",
    shell: 3,
    weight: 67,
    confidence: "medium",
    explanation: "等待太久会降低进入新赛道的相对优势，但这个判断需要用真实机会反馈验证。"
  },
  {
    id: "risk-focus",
    type: "risk",
    label: "精力分散",
    shell: 3,
    weight: 72,
    confidence: "medium",
    explanation: "兼顾主业与副业时，最常见失败模式不是能力不足，而是上下文切换耗尽。"
  },
  {
    id: "risk-relation",
    type: "risk",
    label: "关系张力",
    shell: 3,
    weight: 54,
    confidence: "low",
    explanation: "家人、合伙人与现团队的预期管理不足，会把职业选择转化成关系冲突。"
  },
  {
    id: "path-steady",
    type: "path",
    label: "稳健路径",
    shell: 4,
    weight: 76,
    confidence: "high",
    explanation: "保留主业现金流，用 90 天建立可展示项目和行业反馈。"
  },
  {
    id: "path-bold",
    type: "path",
    label: "冒险路径",
    shell: 4,
    weight: 59,
    confidence: "medium",
    explanation: "全职转型，把学习、作品集和商业验证压缩到 6 个月内。"
  },
  {
    id: "path-hybrid",
    type: "path",
    label: "混合路径",
    shell: 4,
    weight: 84,
    confidence: "high",
    explanation: "争取公司内部 AI 项目或 80/20 时间，同时运营个人项目。"
  },
  {
    id: "path-retreat",
    type: "path",
    label: "止损路径",
    shell: 4,
    weight: 45,
    confidence: "low",
    explanation: "暂缓转型，把当前赛道做到更深，用行业深度替代技术广度。"
  }
];

export const graphEdges: ScenarioEdge[] = [
  { source: "choice", target: "company", relation: "influences", strength: 0.74, explanation: "转型改变现公司中的角色和谈判空间。" },
  { source: "choice", target: "partner", relation: "supports", strength: 0.62, explanation: "合伙人可能支持副业项目验证。" },
  { source: "choice", target: "family", relation: "constrains", strength: 0.58, explanation: "家庭稳定预期会约束激进方案。" },
  { source: "choice", target: "cashflow", relation: "constrains", strength: 0.86, explanation: "现金流决定可承受试错周期。" },
  { source: "choice", target: "growth", relation: "triggers", strength: 0.83, explanation: "转型的核心诱因是成长速度。" },
  { source: "choice", target: "freedom", relation: "supports", strength: 0.74, explanation: "AI 产品化路径更接近自主工作偏好。" },
  { source: "cashflow", target: "risk-cash", relation: "triggers", strength: 0.92, explanation: "现金流储备不足会触发断裂风险。" },
  { source: "growth", target: "risk-window", relation: "triggers", strength: 0.65, explanation: "高成长窗口带来延迟成本。" },
  { source: "company", target: "path-hybrid", relation: "supports", strength: 0.72, explanation: "内部项目可降低转型断裂。" },
  { source: "partner", target: "risk-relation", relation: "conflicts", strength: 0.58, explanation: "合伙关系未校准会产生摩擦。" },
  { source: "risk-focus", target: "path-steady", relation: "constrains", strength: 0.64, explanation: "稳健路径的主要风险是精力分散。" },
  { source: "mentor", target: "path-hybrid", relation: "validates", strength: 0.53, explanation: "导师访谈可验证混合路径可行性。" },
  { source: "risk-cash", target: "path-bold", relation: "conflicts", strength: 0.91, explanation: "现金流断裂是冒险路径的单点故障。" },
  { source: "risk-window", target: "path-retreat", relation: "conflicts", strength: 0.57, explanation: "止损路径可能牺牲窗口期。" },
  { source: "identity", target: "path-hybrid", relation: "supports", strength: 0.69, explanation: "混合路径更容易保留身份连续性。" },
  { source: "choice", target: "path-steady", relation: "validates", strength: 0.7, explanation: "稳健路径是低风险验证策略。" },
  { source: "choice", target: "path-bold", relation: "validates", strength: 0.5, explanation: "冒险路径需要更强现金流证据。" },
  { source: "choice", target: "path-hybrid", relation: "validates", strength: 0.79, explanation: "混合路径同时满足成长和现金流。" },
  { source: "choice", target: "path-retreat", relation: "validates", strength: 0.38, explanation: "止损路径保守，但仍是可比较选项。" }
];

export const scenarioPaths: ScenarioPath[] = [
  {
    id: "hybrid",
    name: "混合路径",
    tag: "优先验证",
    coreLogic: "保留主业现金流，同时争取内部 AI 项目或外部最小产品，用现实反馈决定是否加速。",
    upside: "降低断裂风险，同时保留进入新赛道的速度。",
    opportunityCost: "短期会承受双线压力，个人时间被压缩。",
    failureMode: "主业和副业都只做到 60 分，无法形成可展示成果。",
    validationExperiment: "14 天内完成一个可演示 AI 小工具，并约 3 位目标用户试用。",
    fitScore: 84,
    riskLevel: "medium",
    relatedNodeIds: ["path-hybrid", "company", "growth", "identity", "risk-focus"]
  },
  {
    id: "steady",
    name: "稳健路径",
    tag: "低风险",
    coreLogic: "继续当前岗位 3-6 个月，把 AI 作为副业项目验证，等作品集和收入信号出现再转型。",
    upside: "现金流稳定，关系压力小，失败可逆。",
    opportunityCost: "可能错过早期窗口，增长速度不够刺激。",
    failureMode: "验证周期拖太长，副业始终停留在学习状态。",
    validationExperiment: "14 天内固定 20 小时学习与产出节奏，交付一个公开 demo。",
    fitScore: 76,
    riskLevel: "low",
    relatedNodeIds: ["path-steady", "cashflow", "risk-focus", "family"]
  },
  {
    id: "bold",
    name: "冒险路径",
    tag: "高波动",
    coreLogic: "立即转向全职 AI 学习和项目化验证，以高强度换取窗口期速度。",
    upside: "最快建立新身份，最大化赛道窗口。",
    opportunityCost: "6-12 个月收入不确定，失败后简历叙事难度上升。",
    failureMode: "现金流耗尽前没有形成可销售能力，被迫低质量回流。",
    validationExperiment: "先访谈 5 位已转型者，确认真实门槛、现金流周期和机会入口。",
    fitScore: 59,
    riskLevel: "high",
    relatedNodeIds: ["path-bold", "risk-cash", "risk-window", "freedom"]
  },
  {
    id: "retreat",
    name: "止损路径",
    tag: "保守对照",
    coreLogic: "暂缓转型，把当前赛道做深，等待更明确的外部机会或内部项目出现。",
    upside: "保住稳定性，减少情绪化决策。",
    opportunityCost: "可能持续消耗成长动机，延迟身份切换。",
    failureMode: "把谨慎包装成理性，半年后仍然没有新证据。",
    validationExperiment: "列出当前赛道 3 个可增长方向，验证是否还有真实兴奋感。",
    fitScore: 45,
    riskLevel: "low",
    relatedNodeIds: ["path-retreat", "company", "risk-window", "identity"]
  }
];

export const variables: DecisionVariable[] = [
  { id: "risk", name: "风险承受度", lowLabel: "保守", highLabel: "激进", value: 46 },
  { id: "cashflow", name: "现金流权重", lowLabel: "可牺牲", highLabel: "必须稳", value: 78 },
  { id: "freedom", name: "自由度权重", lowLabel: "低优先", highLabel: "高优先", value: 72 },
  { id: "relationship", name: "关系权重", lowLabel: "可后置", highLabel: "强约束", value: 58 },
  { id: "growth", name: "成长速度", lowLabel: "慢变量", highLabel: "快反馈", value: 82 },
  { id: "identity", name: "身份一致性", lowLabel: "可调整", highLabel: "必须像我", value: 69 }
];

export const councilOpinions: CouncilOpinion[] = [
  {
    id: "realist",
    role: "冷酷现实主义者",
    stance: "先审现金流，再谈理想。",
    challenge: "冒险路径的最大漏洞不是能力，而是现金流储备不足。没有 6 个月缓冲，不应把它排第一。",
    targetPathId: "bold"
  },
  {
    id: "longterm",
    role: "长期主义者",
    stance: "看 10 年身份复利。",
    challenge: "如果你只是追热点，3 年后会再次换赛道。混合路径必须证明它和你的长期身份一致。",
    targetPathId: "hybrid"
  },
  {
    id: "opportunity",
    role: "机会成本审计员",
    stance: "每个选择都在永久放弃别的东西。",
    challenge: "稳健路径的隐性代价是窗口期和注意力。它看起来安全，但可能把你锁进慢性后悔。",
    targetPathId: "steady"
  },
  {
    id: "risk",
    role: "风险专员",
    stance: "寻找系统性崩盘点。",
    challenge: "混合路径最容易死于精力分散。必须把每周可投入时间写成硬约束。",
    targetPathId: "hybrid"
  },
  {
    id: "future",
    role: "未来自我代理",
    stance: "从三年后回看今天。",
    challenge: "三年后的你不一定后悔慢，但会后悔没有用现实实验验证自己的恐惧。",
    targetPathId: "retreat"
  }
];

export const timeline = [
  { time: "14 天", title: "验证一个关键假设", detail: "用小项目或深度访谈验证 AI 路径是否有真实外部反馈。" },
  { time: "3 个月", title: "形成第一组证据", detail: "至少有一个可展示项目、一个真实用户反馈和一个行业连接。" },
  { time: "1 年", title: "选择加速或收缩", detail: "根据收入、能力曲线与身份一致性决定是否全职转型。" },
  { time: "3 年", title: "身份稳定成型", detail: "你不再只是在学 AI，而是在一个具体问题域里用 AI 产生价值。" }
];

export const actionProtocol: ActionProtocolItem[] = [
  { id: "ship", label: "交付一个可演示 AI 小工具", detail: "范围必须小到 14 天内能给真实用户试用。" },
  { id: "interview", label: "访谈 3 位转型者或目标用户", detail: "记录真实门槛、付费意愿和失败原因。" },
  { id: "cash", label: "计算 6 个月现金流缓冲", detail: "把固定支出、可削减支出和最低收入线写清楚。" },
  { id: "backfill", label: "第 14 天回填结果", detail: "标记哪些判断被验证、偏差或推翻，然后重新推演。" }
];
