"use client";

// 自定义节点（BaseNode 模式）：遵循规范设计令牌——圆角 10px、13px 字、选中 #25262a、离线文本 #666、左右端口 Handle。

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { ScenarioNode } from "../../types";
import { NODE_META } from "../graph-workspace/workspaceNodeMeta";

export type ScenarioNodeData = {
  node: ScenarioNode;
  highlighted: boolean;
  dimmed: boolean;
};

export type ScenarioFlowNode = Node<ScenarioNodeData, "scenario">;

const TYPE_LABELS: Record<ScenarioNode["type"], string> = {
  self: "自我",
  choice: "抉择",
  person: "人物",
  organization: "组织",
  value: "价值",
  risk: "风险",
  path: "路径",
  evidence: "证据",
  action: "行动"
};

export default function ScenarioNodeCard({ data, selected }: NodeProps<ScenarioFlowNode>) {
  const { node, highlighted, dimmed } = data;
  const meta = NODE_META[node.type];
  const accent = meta.color;

  return (
    <div
      className="flex items-center gap-2 px-3 py-2"
      style={{
        minWidth: 124,
        borderRadius: 10,
        border: `1px solid ${selected ? accent : highlighted ? `${accent}99` : "rgba(255,255,255,0.10)"}`,
        background: selected ? "#25262a" : "#141419",
        boxShadow: selected
          ? `0 0 0 1px ${accent}, 0 4px 20px ${accent}44`
          : highlighted
            ? `0 0 14px ${accent}22`
            : "0 2px 8px rgba(0,0,0,0.45)",
        opacity: dimmed ? 0.28 : 1,
        fontSize: 13,
        fontFamily: 'Inter, "Helvetica Neue", system-ui, -apple-system, sans-serif',
        transition: "border-color .2s, background .2s, opacity .25s, box-shadow .2s"
      }}
    >
      <Handle type="target" position={Position.Left} style={{ width: 7, height: 7, border: "none", background: accent }} />
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: accent, boxShadow: `0 0 8px ${accent}` }} />
      <div className="min-w-0">
        <div className="truncate" style={{ color: selected ? "#ffffff" : "#e4e4e7", fontWeight: 500, lineHeight: 1.2 }}>
          {node.label}
        </div>
        <div style={{ color: "#666666", fontSize: 11, lineHeight: 1.3 }}>{TYPE_LABELS[node.type]}</div>
      </div>
      <Handle type="source" position={Position.Right} style={{ width: 7, height: 7, border: "none", background: accent }} />
    </div>
  );
}
