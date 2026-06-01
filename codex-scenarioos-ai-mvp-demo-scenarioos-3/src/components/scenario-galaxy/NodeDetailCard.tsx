"use client";

// 节点详情卡：深色玻璃拟态，选中节点时弹出，切换节点时淡出再滑入。

import type { CSSProperties } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { NODE_STATUS_META, NODE_TYPE_META, type ScenarioNode } from "./galaxyTypes";

type Props = {
  node: ScenarioNode | null;
  neighborCount: number;
  onClose: () => void;
};

const glassStyle: CSSProperties = {
  background: "rgba(10, 12, 24, 0.72)",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
  boxShadow: "0 18px 60px rgba(0,0,0,0.5), 0 0 36px rgba(90,110,200,0.16)"
};

export default function NodeDetailCard({ node, neighborCount, onClose }: Props) {
  return (
    <AnimatePresence mode="wait">
      {node && (
        <motion.div
          key={node.id}
          initial={{ opacity: 0, y: 26, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: 16, filter: "blur(6px)" }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="pointer-events-auto absolute bottom-24 left-6 z-20 w-[340px] max-w-[calc(100vw-3rem)] lg:bottom-6"
        >
          <div className="rounded-[20px] p-5" style={glassStyle}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex h-2.5 w-2.5 rounded-full"
                  style={{ background: NODE_TYPE_META[node.type].color, boxShadow: `0 0 12px ${NODE_TYPE_META[node.type].glow}` }}
                />
                <span className="text-xs tracking-wide text-zinc-400">
                  {NODE_TYPE_META[node.type].label} · {NODE_STATUS_META[node.status].label}
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-zinc-500 transition-colors hover:text-zinc-200"
                aria-label="关闭详情"
              >
                ✕
              </button>
            </div>

            <h3 className="mb-2 text-xl font-medium text-zinc-50">{node.label}</h3>
            <p className="mb-4 text-[13px] leading-relaxed text-zinc-400">{node.description}</p>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <Stat label="重要度" value={`${Math.round(node.importance * 100)}%`} />
              <Stat label="关联节点" value={`${neighborCount}`} />
              <Stat label="推演阶段" value={`S${node.stage}`} />
              <Stat label="坐标" value={`${Math.round(node.x)},${Math.round(node.y)}`} />
            </div>

            <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/5">
              <motion.div
                className="h-full rounded-full"
                style={{ background: NODE_TYPE_META[node.type].color }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.round(node.importance * 100)}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2">
      <div className="mb-0.5 text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="font-mono text-sm text-zinc-100">{value}</div>
    </div>
  );
}
