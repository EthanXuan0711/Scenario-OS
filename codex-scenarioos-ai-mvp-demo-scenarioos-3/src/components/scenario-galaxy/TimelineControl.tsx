"use client";

// 时间线控制：四阶段推演步进器（事件输入 → 角色映射 → 传播推演 → 结果分支）+ 播放/暂停。

import { motion } from "framer-motion";
import { STAGES } from "./galaxyTypes";

type Props = {
  stage: number;
  onStage: (stage: number) => void;
  playing: boolean;
  onTogglePlay: () => void;
};

export default function TimelineControl({ stage, onStage, playing, onTogglePlay }: Props) {
  const progress = STAGES.length > 1 ? stage / (STAGES.length - 1) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.5 }}
      className="pointer-events-auto absolute bottom-6 left-1/2 z-20 w-[min(680px,calc(100vw-3rem))] -translate-x-1/2"
    >
      <div
        className="flex items-center gap-4 rounded-2xl border border-white/10 px-4 py-3"
        style={{ background: "rgba(10,12,24,0.66)", backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)", boxShadow: "0 18px 50px rgba(0,0,0,0.45)" }}
      >
        <button
          type="button"
          onClick={onTogglePlay}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-zinc-100 transition-colors hover:border-amber-400/60 hover:text-amber-200"
          aria-label={playing ? "暂停推演" : "开始推演"}
        >
          {playing ? "❚❚" : "▶"}
        </button>

        <div className="relative flex flex-1 items-center justify-between">
          {/* 进度底线 */}
          <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-white/10" />
          <motion.div
            className="absolute left-0 top-1/2 h-px -translate-y-1/2 bg-amber-400/70"
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />

          {STAGES.map((s) => {
            const active = stage >= s.id;
            const current = stage === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onStage(s.id)}
                className="group relative z-10 flex flex-col items-center gap-1.5"
              >
                <span
                  className="flex h-3.5 w-3.5 items-center justify-center rounded-full border transition-all"
                  style={{
                    borderColor: active ? "#e7c766" : "rgba(255,255,255,0.25)",
                    background: active ? "#e7c766" : "rgba(10,12,24,0.9)",
                    boxShadow: current ? "0 0 14px rgba(231,199,102,0.7)" : "none"
                  }}
                />
                <span
                  className={`whitespace-nowrap text-[11px] transition-colors ${
                    current ? "text-amber-200" : active ? "text-zinc-300" : "text-zinc-500"
                  } group-hover:text-zinc-100`}
                >
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
