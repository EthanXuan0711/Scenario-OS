"use client";

// 图谱控件栏（参考视频左侧竖排图标）：放大 / 缩小 / 复位 / 标签开关。
// 叠加在图谱区域内部左侧，深色玻璃药丸样式。

import type { ReactNode } from "react";
import { Crosshair, Minus, Plus, Tag } from "lucide-react";

type Props = {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onToggleLabels?: () => void;
  labelsOn?: boolean;
};

export default function GraphControlBar({ onZoomIn, onZoomOut, onReset, onToggleLabels, labelsOn }: Props) {
  return (
    <div className="absolute left-4 top-1/2 z-20 flex -translate-y-1/2 flex-col items-center gap-1 rounded-full border border-white/10 bg-[#0a0a14]/80 p-1.5 shadow-lg backdrop-blur-md">
      <ControlButton title="放大" onClick={onZoomIn}>
        <Plus size={16} />
      </ControlButton>
      <ControlButton title="缩小" onClick={onZoomOut}>
        <Minus size={16} />
      </ControlButton>
      <div className="my-0.5 h-px w-5 bg-white/10" />
      <ControlButton title="复位视角" onClick={onReset}>
        <Crosshair size={15} />
      </ControlButton>
      {onToggleLabels && (
        <ControlButton title={labelsOn ? "隐藏标签" : "显示标签"} onClick={onToggleLabels} active={labelsOn}>
          <Tag size={15} />
        </ControlButton>
      )}
    </div>
  );
}

function ControlButton({
  title,
  onClick,
  active,
  children
}: {
  title: string;
  onClick: () => void;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
        active ? "bg-amber-500/20 text-amber-200" : "text-zinc-300 hover:bg-white/10 hover:text-amber-200"
      }`}
    >
      {children}
    </button>
  );
}
