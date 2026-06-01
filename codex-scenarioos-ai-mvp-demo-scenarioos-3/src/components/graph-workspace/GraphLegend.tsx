"use client";

// 底部图例：固定在中央图谱区域内部（绝对定位于 center 容器），不跨左右栏、不被 rail 覆盖。

import { NODE_META, NODE_TYPE_ORDER } from "./workspaceNodeMeta";

export default function GraphLegend() {
  return (
    <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2">
      <div className="flex max-w-[min(92%,760px)] flex-wrap items-center justify-center gap-x-3 gap-y-1.5 rounded-lg border border-white/10 bg-[#06060d]/85 px-3 py-1.5 backdrop-blur-sm">
        {NODE_TYPE_ORDER.map((type) => (
          <span key={type} className="flex items-center gap-1.5 text-[11px] text-zinc-400">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: NODE_META[type].color, boxShadow: `0 0 6px ${NODE_META[type].color}` }}
            />
            {NODE_META[type].label}
          </span>
        ))}
      </div>
    </div>
  );
}
