"use client";

// 左侧节点列表：点击同步选中（联动图谱 + 右侧详情）。搜索时只显示匹配项。

import type { ScenarioNode } from "../../types";
import { NODE_META } from "./workspaceNodeMeta";

type Props = {
  nodes: ScenarioNode[];
  selectedId: string;
  onSelect: (id: string) => void;
};

export default function NodeList({ nodes, selectedId, onSelect }: Props) {
  if (nodes.length === 0) {
    return <p className="px-3 py-4 text-xs text-zinc-600">没有匹配的节点。</p>;
  }

  return (
    <div className="space-y-0.5 px-2 py-2">
      {nodes.map((node) => {
        const isSelected = node.id === selectedId;
        const meta = NODE_META[node.type];
        return (
          <button
            key={node.id}
            type="button"
            onClick={() => onSelect(node.id)}
            className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors ${
              isSelected ? "bg-amber-500/15 text-amber-100" : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
            }`}
          >
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: meta.color }} />
            <span className="truncate">{node.label}</span>
            <span className="ml-auto shrink-0 text-[10px] text-zinc-600">{meta.label}</span>
          </button>
        );
      })}
    </div>
  );
}
