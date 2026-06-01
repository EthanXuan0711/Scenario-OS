"use client";

// 左轨内容：搜索框 + 节点列表。搜索只过滤本列表，同时图谱高亮匹配（由父级聚焦集驱动）。

import { Search } from "lucide-react";
import type { ScenarioNode } from "../../types";
import NodeList from "./NodeList";

type Props = {
  query: string;
  onQuery: (value: string) => void;
  nodes: ScenarioNode[];
  totalCount: number;
  selectedId: string;
  onSelect: (id: string) => void;
};

export default function LeftRail({ query, onQuery, nodes, totalCount, selectedId, onSelect }: Props) {
  return (
    <>
      <div className="border-b border-white/5 p-2.5">
        <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#0c0c16] px-2.5 py-1.5 focus-within:border-amber-500/40">
          <Search size={13} className="text-zinc-600" />
          <input
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="搜索节点…"
            className="min-w-0 flex-1 bg-transparent text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
          />
        </label>
        <div className="mt-1.5 px-1 text-[11px] text-zinc-600">
          {nodes.length}/{totalCount} 节点{query.trim() ? " · 图谱已高亮匹配" : ""}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <NodeList nodes={nodes} selectedId={selectedId} onSelect={onSelect} />
      </div>
    </>
  );
}
