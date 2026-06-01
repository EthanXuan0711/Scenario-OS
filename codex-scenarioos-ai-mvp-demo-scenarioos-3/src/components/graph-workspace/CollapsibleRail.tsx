"use client";

// 通用可折叠侧栏（隐式框）：展开为全宽列，收起为细轨 + 展开按钮。
// 左右通用，收起时中央图谱自动变宽（本组件 shrink-0，中央 flex-1）。

import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  side: "left" | "right";
  collapsed: boolean;
  onToggle: () => void;
  title: string;
  width?: number;
  children: ReactNode;
};

export default function CollapsibleRail({ side, collapsed, onToggle, title, width = 304, children }: Props) {
  const isLeft = side === "left";
  const borderClass = isLeft ? "border-r" : "border-l";

  if (collapsed) {
    return (
      <div className={`flex h-full w-10 shrink-0 flex-col items-center bg-[#08080f] ${borderClass} border-white/5`}>
        <button
          type="button"
          onClick={onToggle}
          title={`展开${title}`}
          className="mt-3 flex h-7 w-7 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-100"
        >
          {isLeft ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
        <div className="mt-3 select-none text-[11px] tracking-widest text-zinc-600 [writing-mode:vertical-rl]">{title}</div>
      </div>
    );
  }

  return (
    <div className={`flex h-full shrink-0 flex-col bg-[#08080f] ${borderClass} border-white/5`} style={{ width }}>
      <div className="flex items-center gap-2 border-b border-white/5 px-3 py-2.5">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        <span className="text-xs font-medium text-zinc-200">{title}</span>
        <button
          type="button"
          onClick={onToggle}
          title="收起"
          className="ml-auto flex h-6 w-6 items-center justify-center rounded text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-100"
        >
          {isLeft ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}
