// 驾驶舱"模拟推演"引擎（纯前端，无需大模型 API）。
// 输入文本 → 关键词解析 → 生成星系节点/连线 + 调整决策变量；变量经函数公式联动路径评分。

import { scenarioPaths, variables as baseVariables } from "../../data/scenarioOS";
import type { DecisionVariable, ScenarioPath } from "../../types";
import type { NodeStatus, NodeType, ScenarioEdge, ScenarioNode } from "../scenario-galaxy/galaxyTypes";

export type VariableValues = Record<DecisionVariable["id"], number>;

export const decisionVariables = baseVariables;

export const defaultVariables: VariableValues = baseVariables.reduce((acc, variable) => {
  acc[variable.id] = variable.value;
  return acc;
}, {} as VariableValues);

export const clampPct = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

export type ScoredPath = ScenarioPath & { score: number };

// 变量 → 路径评分（函数公式：各变量按权重影响不同路径的适配度）
export function scorePaths(vars: VariableValues): ScoredPath[] {
  const deltaByPath: Record<ScenarioPath["id"], number> = {
    hybrid:
      (vars.growth - 50) * 0.12 +
      (vars.identity - 50) * 0.1 +
      (vars.cashflow - 50) * 0.08 -
      (vars.risk - 50) * 0.03 -
      (vars.relationship - 50) * 0.02,
    steady:
      (vars.cashflow - 50) * 0.16 +
      (vars.relationship - 50) * 0.1 -
      (vars.growth - 50) * 0.06 -
      (vars.freedom - 50) * 0.06 -
      (vars.risk - 50) * 0.04,
    bold:
      (vars.risk - 50) * 0.16 +
      (vars.freedom - 50) * 0.14 +
      (vars.growth - 50) * 0.11 -
      (vars.cashflow - 50) * 0.13 -
      (vars.relationship - 50) * 0.06,
    retreat:
      (vars.cashflow - 50) * 0.08 +
      (vars.relationship - 50) * 0.08 -
      (vars.growth - 50) * 0.12 -
      (vars.freedom - 50) * 0.09 -
      (vars.identity - 50) * 0.04
  };

  return scenarioPaths
    .map((path) => ({ ...path, score: clampPct(Math.round(path.fitScore + deltaByPath[path.id]), 18, 96) }))
    .sort((first, second) => second.score - first.score);
}

// 18 个月生存概率（函数公式）
export function survivalScore(vars: VariableValues) {
  return clampPct(Math.round(48 + vars.cashflow * 0.26 + vars.relationship * 0.08 - vars.risk * 0.1), 18, 94);
}

// 关键词词库：命中 → 生成对应类型节点 + 调整变量
type Lexicon = {
  type: NodeType;
  words: string[];
  effect: Partial<VariableValues>;
  status?: NodeStatus;
};

const LEXICONS: Lexicon[] = [
  {
    type: "risk",
    words: ["风险", "危机", "担心", "焦虑", "压力", "亏", "崩", "监管", "封", "违规", "失败", "对手", "竞争", "纠纷", "裁员", "债"],
    effect: { risk: 10, cashflow: -4 },
    status: "risk"
  },
  {
    type: "outcome",
    words: ["增长", "机会", "爆发", "突破", "红利", "上市", "成功", "扩张", "盈利", "赚", "翻倍"],
    effect: { growth: 8, cashflow: 5 }
  },
  {
    type: "actor",
    words: ["用户", "客户", "团队", "投资", "媒体", "老板", "合伙", "kol", "达人", "粉丝", "专家", "导师", "家人", "朋友"],
    effect: { relationship: 6 }
  },
  {
    type: "platform",
    words: ["抖音", "小红书", "微信", "平台", "直播", "视频", "内容", "流量", "b站", "知乎", "社群", "公众号", "电商"],
    effect: { growth: 4 }
  },
  {
    type: "event",
    words: ["创业", "转行", "辞职", "自由", "独立", "副业", "跳槽", "All in", "梭哈"],
    effect: { freedom: 8, identity: 5 }
  }
];

// 把一段条件文本归类到某个维度（命中关键词 → 对应类型；默认归为事件）。
export function classifyType(text: string): NodeType {
  const lower = text.toLowerCase();
  for (const lex of LEXICONS) {
    if (lex.words.some((word) => lower.includes(word.toLowerCase()))) return lex.type;
  }
  return "event";
}

export type IngestResult = {
  nodes: ScenarioNode[];
  edges: ScenarioEdge[];
  varDelta: Partial<VariableValues>;
  matched: NodeType[];
  summary: string;
};

const TYPE_LABEL: Record<NodeType, string> = {
  event: "事件",
  actor: "角色",
  platform: "平台",
  risk: "风险",
  outcome: "结果"
};

function makeNode(id: string, label: string, type: NodeType, importance: number, status: NodeStatus): ScenarioNode {
  return {
    id,
    label,
    type,
    x: 0,
    y: 0,
    size: 8 + importance * 8,
    importance,
    status,
    description: `由对话推演生成：「${label}」（${TYPE_LABEL[type]}）。`,
    stage: 0
  };
}

function makeEdge(id: string, source: string, target: string, type: ScenarioEdge["type"]): ScenarioEdge {
  return { id, source, target, weight: 0.6, type };
}

function variableName(id: string) {
  return baseVariables.find((variable) => variable.id === id)?.name ?? id;
}

// 主推演：把一句输入解析为图谱增量 + 变量增量 + 系统回应
export function simulate(text: string, coreId: string, idSeed: number): IngestResult {
  const lower = text.toLowerCase();
  const nodes: ScenarioNode[] = [];
  const edges: ScenarioEdge[] = [];
  const varDelta: Partial<VariableValues> = {};
  const matched: NodeType[] = [];

  const topic = text.trim().slice(0, 12) || "新议题";
  const eventId = `chat-${idSeed}-evt`;
  nodes.push(makeNode(eventId, topic, "event", 0.82, "active"));
  edges.push(makeEdge(`chat-${idSeed}-core`, coreId, eventId, "causal"));

  let i = 0;
  LEXICONS.forEach((lex) => {
    const hit = lex.words.find((word) => lower.includes(word.toLowerCase()));
    if (!hit) return;
    matched.push(lex.type);
    const id = `chat-${idSeed}-n${i}`;
    nodes.push(makeNode(id, hit, lex.type, 0.62, lex.status ?? "normal"));
    edges.push(makeEdge(`chat-${idSeed}-l${i}`, eventId, id, lex.type === "risk" ? "conflict" : "influence"));
    (Object.keys(lex.effect) as Array<keyof VariableValues>).forEach((key) => {
      varDelta[key] = (varDelta[key] ?? 0) + (lex.effect[key] ?? 0);
    });
    i += 1;
  });

  const deltaText = Object.entries(varDelta)
    .filter(([, value]) => value)
    .map(([key, value]) => `${variableName(key)}${(value as number) > 0 ? "↑" : "↓"}`)
    .join("、");

  const parts = [`已将「${topic}」映射进推演图谱`];
  if (matched.length) parts.push(`识别到 ${Array.from(new Set(matched)).map((t) => TYPE_LABEL[t]).join("、")} 维度`);
  if (deltaText) parts.push(`变量联动：${deltaText}`);
  const summary = `${parts.join("；")}。已同步刷新右侧路径评分。`;

  return { nodes, edges, varDelta, matched, summary };
}
