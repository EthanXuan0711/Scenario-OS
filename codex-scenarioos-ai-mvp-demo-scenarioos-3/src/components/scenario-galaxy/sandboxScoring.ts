// 社会沙盘节点评分：评分/权重全部从决策变量公式推导，
// 因此工作台调变量、AI 推演、笔记改写时，节点详情会实时联动。

import { clampPct, defaultVariables, type VariableValues } from "../cockpit/cockpitSim";
import type { NodeType } from "./galaxyTypes";

// 被点击的沙盘节点（恒星或绕转节点）传给详情卡的数据
export type SandboxNode = {
  id: string;
  kind: "star" | "node";
  type: NodeType;
  label: string;
  color: string;
  importance: number;
  systemName: string;
  isCondition?: boolean;
};

// 每个维度类型 → 主导决策变量
const RELATED: Record<NodeType, keyof VariableValues> = {
  event: "growth",
  actor: "relationship",
  platform: "freedom",
  risk: "risk",
  outcome: "identity"
};

const VAR_NAME: Record<string, string> = {
  risk: "风险承受度",
  cashflow: "现金流权重",
  freedom: "自由度权重",
  relationship: "关系权重",
  growth: "成长速度",
  identity: "身份一致性"
};

export function relatedVariable(type: NodeType) {
  const id = RELATED[type];
  return { id, name: VAR_NAME[id] ?? id };
}

// 权重：节点固有重要度 + 关联变量当前值
export function weightOf(type: NodeType, importance: number, vars: VariableValues | null): number {
  const v = vars ?? defaultVariables;
  const rv = v[RELATED[type]] ?? 50;
  return clampPct(Math.round(35 + importance * 35 + (rv - 50) * 0.4));
}

// 适配评分（风险维度语义为"风险指数"，越高越危险）
export function scoreOf(type: NodeType, importance: number, vars: VariableValues | null): number {
  const v = vars ?? defaultVariables;
  const base = 46 + (importance - 0.5) * 36;
  let s = base;
  if (type === "event") s = base + (v.growth - 50) * 0.5;
  else if (type === "actor") s = base + (v.relationship - 50) * 0.5;
  else if (type === "platform") s = base + (v.freedom - 50) * 0.35 + (v.growth - 50) * 0.2;
  else if (type === "risk") s = base + (v.risk - 50) * 0.45 + (50 - v.cashflow) * 0.25;
  else if (type === "outcome") s = base + (v.growth - 50) * 0.3 + (v.cashflow - 50) * 0.2 - (v.risk - 50) * 0.12;
  return clampPct(Math.round(s));
}

export function scoreLabel(type: NodeType): string {
  return type === "risk" ? "风险指数" : "适配评分";
}

// 节点详情描述（结合议题）
export function describeNode(type: NodeType, label: string, topic: string): string {
  const scope = topic ? `围绕「${topic}」` : "在当前推演中";
  const byType: Record<NodeType, string> = {
    event: `${scope}，「${label}」是推动局势变化的触发事件，会改写后续节点的权重。`,
    actor: `${scope}，「${label}」是关键角色/利益相关方，其立场直接影响关系权重与可行路径。`,
    platform: `${scope}，「${label}」是事件扩散与资源调度的载体，决定成长与自由度的兑现速度。`,
    risk: `${scope}，「${label}」是需要对冲的风险点，现金流储备不足会放大它的破坏力。`,
    outcome: `${scope}，「${label}」是一种可能结果分支，评分反映其与你当前变量配置的适配度。`
  };
  return byType[type];
}
