"use client";

// 右侧节点详情：随选中同步更新，列出一度关联节点（可点击跳转）。

import type { ScenarioEdge, ScenarioNode } from "../../types";
import { NODE_META } from "./workspaceNodeMeta";

const confidenceLabels: Record<ScenarioNode["confidence"], string> = {
  high: "高置信",
  medium: "中置信",
  low: "低置信"
};

const relationLabels: Record<ScenarioEdge["relation"], string> = {
  influences: "影响",
  conflicts: "冲突",
  supports: "支撑",
  constrains: "约束",
  triggers: "触发",
  validates: "验证",
  revises: "修正"
};

type Props = {
  node: ScenarioNode;
  relatedEdges: ScenarioEdge[];
  nodeMap: Map<string, ScenarioNode>;
  onSelect: (id: string) => void;
};

export default function NodeDetail({ node, relatedEdges, nodeMap, onSelect }: Props) {
  const meta = NODE_META[node.type];

  return (
    <div className="border-b border-white/5 px-4 py-3">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ background: meta.color, boxShadow: `0 0 8px ${meta.color}` }} />
        <span className="text-[11px] text-zinc-500">
          {meta.label} · {confidenceLabels[node.confidence]}
        </span>
        <span className="ml-auto font-mono text-[11px] text-zinc-500">权重 {node.weight}</span>
      </div>
      <h3 className="mb-1.5 text-base leading-snug text-zinc-100">{node.label}</h3>
      <p className="mb-3 text-xs leading-relaxed text-zinc-400">{node.explanation}</p>

      <div className="mb-1.5 text-[11px] uppercase tracking-wider text-zinc-600">
        一度关联 · {relatedEdges.length}
      </div>
      <div className="space-y-1">
        {relatedEdges.slice(0, 10).map((edge) => {
          const otherId = edge.source === node.id ? edge.target : edge.source;
          const other = nodeMap.get(otherId);
          if (!other) return null;
          return (
            <button
              key={`${edge.source}-${edge.target}`}
              type="button"
              onClick={() => onSelect(other.id)}
              className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-200"
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: NODE_META[other.type].color }} />
              <span className="truncate">{other.label}</span>
              <span className="ml-auto shrink-0 text-[10px] text-zinc-600">{relationLabels[edge.relation]}</span>
            </button>
          );
        })}
        {relatedEdges.length === 0 && <p className="px-2 text-xs text-zinc-600">暂无关联，发送 AI 推演可生成。</p>}
      </div>
    </div>
  );
}
