"use client";

// 科幻 HUD 信息层：顶部状态栏（系统标识 + 推演阶段）与右上角读数（节点 / 连线 / 风险指数）。

import { motion } from "framer-motion";
import { STAGES } from "./galaxyTypes";

type Props = {
  stage: number;
  riskIndex: number;
  nodeCount: number;
  edgeCount: number;
  focusLabel?: string;
};

function riskTone(value: number) {
  if (value < 34) return { color: "#34d399", label: "可控" };
  if (value < 67) return { color: "#e7c766", label: "警戒" };
  return { color: "#f0556a", label: "高危" };
}

export default function GalaxyHud({ stage, riskIndex, nodeCount, edgeCount, focusLabel }: Props) {
  const tone = riskTone(riskIndex);
  const current = STAGES[Math.max(0, Math.min(3, stage))];

  return (
    <>
      {/* 顶部左：系统标识 */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="pointer-events-none absolute left-6 top-6 z-20"
      >
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400/70" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-400" />
          </span>
          <h1 className="text-sm font-medium tracking-wide text-zinc-100">ScenarioOS · 社会沙盘推演</h1>
        </div>
        <div className="mt-1 pl-5 font-mono text-[11px] text-zinc-500">
          SCENARIO ENGINE / LIVE SIMULATION
          {focusLabel ? <span className="text-amber-300/80"> · 聚焦 {focusLabel}</span> : null}
        </div>
      </motion.div>

      {/* 顶部右：读数 */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.5 }}
        className="pointer-events-none absolute right-6 top-6 z-20 flex items-center gap-2"
      >
        <Pill label="NODES" value={nodeCount} />
        <Pill label="LINKS" value={edgeCount} />
        <div
          className="rounded-xl border border-white/10 px-3 py-2"
          style={{ background: "rgba(10,12,24,0.6)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)" }}
        >
          <div className="mb-1 flex items-center justify-between gap-3 text-[10px] uppercase tracking-wider text-zinc-500">
            <span>风险指数</span>
            <span style={{ color: tone.color }}>{tone.label}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/8">
              <motion.div
                className="h-full rounded-full"
                style={{ background: tone.color }}
                animate={{ width: `${riskIndex}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
            <span className="font-mono text-sm" style={{ color: tone.color }}>
              {riskIndex}
            </span>
          </div>
        </div>
      </motion.div>

      {/* 顶部中：当前阶段 */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="pointer-events-none absolute left-1/2 top-6 z-20 hidden -translate-x-1/2 md:block"
      >
        <div
          className="rounded-full border border-white/10 px-4 py-1.5 text-center"
          style={{ background: "rgba(10,12,24,0.55)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
        >
          <span className="font-mono text-[11px] text-zinc-500">STAGE {stage + 1}/4 · </span>
          <span className="text-xs text-zinc-100">{current.label}</span>
          <span className="ml-2 text-[11px] text-zinc-500">{current.hint}</span>
        </div>
      </motion.div>
    </>
  );
}

function Pill({ label, value }: { label: string; value: number }) {
  return (
    <div
      className="rounded-xl border border-white/10 px-3 py-2 text-center"
      style={{ background: "rgba(10,12,24,0.6)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)" }}
    >
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="font-mono text-sm text-zinc-100">{value}</div>
    </div>
  );
}
