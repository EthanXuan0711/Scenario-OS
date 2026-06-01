"use client";

// 侧栏折叠后的细轨条：竖排标题 + 展开按钮。与经典工作台的隐式框风格一致。

import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  side: "left" | "right";
  title: string;
  onExpand: () => void;
};

export default function RailBar({ side, title, onExpand }: Props) {
  const isLeft = side === "left";
  return (
    <div
      className={`flex w-full shrink-0 flex-row items-center gap-3 bg-[#07070e] px-2 py-1.5 lg:h-auto lg:w-10 lg:flex-col lg:py-3 ${
        isLeft ? "border-b lg:border-b-0 lg:border-r" : "border-t lg:border-t-0 lg:border-l"
      } border-zinc-800/60`}
    >
      <button
        type="button"
        onClick={onExpand}
        title={`展开${title}`}
        className="flex h-7 w-7 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-100"
      >
        {isLeft ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
      <div className="select-none text-[11px] tracking-widest text-zinc-600 lg:[writing-mode:vertical-rl]">{title}</div>
    </div>
  );
}
