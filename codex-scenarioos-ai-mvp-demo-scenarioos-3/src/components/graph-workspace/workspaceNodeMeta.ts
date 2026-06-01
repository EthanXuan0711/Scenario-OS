// 工作台节点类型元数据（标签 + 配色），供列表、详情、图例共用。
// 配色与 3D 星图一致，但把过暗的红提亮以保证 UI 可读性。

import type { ScenarioNode } from "../../types";

export const NODE_META: Record<ScenarioNode["type"], { label: string; color: string }> = {
  self: { label: "自我", color: "#fbbf24" },
  choice: { label: "抉择", color: "#f59e0b" },
  person: { label: "人物", color: "#d4d4d8" },
  organization: { label: "组织", color: "#9ca3af" },
  value: { label: "价值", color: "#10b981" },
  risk: { label: "风险", color: "#ef4444" },
  path: { label: "路径", color: "#d97706" },
  evidence: { label: "证据", color: "#8b8b93" },
  action: { label: "行动", color: "#a1a1aa" }
};

export const NODE_TYPE_ORDER: ScenarioNode["type"][] = [
  "self",
  "choice",
  "path",
  "value",
  "risk",
  "person",
  "organization",
  "evidence",
  "action"
];
