"use client";

// 推演结果面板 —— 银河汇聚后滑入，展示 PRD 六大区块。
// 路径 A/B/C + 判断强度 + 局势 + 行动建议 + 判断依据 + 可验证时间窗。

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import gsap from "gsap";
import type { DeductionResult as DR } from "../deduction/deductionTypes";

type Props = { result: DR | null; onClose: () => void };

export default function DeductionResultPanel({ result, onClose }: Props) {
  const [tab, setTab] = useState<"paths" | "action" | "basis">("paths");
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (result && panelRef.current) {
      gsap.fromTo(panelRef.current,
        { x: 48, opacity: 0, filter: "blur(8px)" },
        { x: 0, opacity: 1, filter: "blur(0px)", duration: 0.55, ease: "power3.out" }
      );
    }
  }, [result]);

  if (!result) return null;

  const STRENGTH_META = {
    "high": { label: "高把握", color: "#34d399", bg: "#34d39920" },
    "medium": { label: "中等把握", color: "#e7c766", bg: "#e7c76620" },
    "needs-verification": { label: "需进一步验证", color: "#f0556a", bg: "#f0556a20" }
  };
  const sm = STRENGTH_META[result.strength];

  const MODE_ZH: Record<string, string> = {
    precise: "精确推演", interval: "区间推演", branch: "分支推演", "gather-info": "补充信息"
  };

  return (
    <AnimatePresence>
      <motion.div
        ref={panelRef}
        className="pointer-events-auto absolute bottom-20 right-4 z-30 flex max-h-[calc(100dvh-7rem)] w-[340px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl"
        style={{
          background: "rgba(10,8,22,0.86)",
          backdropFilter: "blur(18px)",
          border: "1px solid rgba(253,230,138,0.16)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), 0 24px 64px -16px rgba(0,0,0,0.7)",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* 顶部暗金流光 + 边角装饰 */}
        <span className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/45 to-transparent" />
        <span className="pointer-events-none absolute left-2.5 top-2.5 h-3 w-3 border-l border-t border-amber-200/30" />
        <span className="pointer-events-none absolute right-2.5 top-2.5 h-3 w-3 border-r border-t border-amber-200/30" />

        {/* 头部 */}
        <div className="flex shrink-0 items-start justify-between border-b border-white/8 px-4 py-3">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2">
              <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: sm.bg, color: sm.color, boxShadow: `0 0 10px ${sm.color}33` }}>{sm.label}</span>
              <span className="font-mono text-[10px] text-amber-200/40">{MODE_ZH[result.mode]}</span>
            </div>
            <div className="truncate font-mystic text-[15px] font-semibold text-zinc-50">「{result.topic}」</div>
          </div>
          <button type="button" onClick={onClose} className="mt-0.5 shrink-0 text-zinc-500 transition-colors hover:text-zinc-200">✕</button>
        </div>

        {/* 局势 */}
        <div className="shrink-0 border-b border-white/6 px-4 py-3">
          <div className="mb-1 text-[10px] uppercase tracking-wider text-zinc-600">当前局势</div>
          <div className="text-[12px] text-zinc-200">{result.situation.stage}</div>
          <div className="mt-1 text-[11px] text-zinc-500">矛盾：{result.situation.mainConflict}</div>
        </div>

        {/* Tab */}
        <div className="flex shrink-0 border-b border-white/6">
          {(["paths", "action", "basis"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-[11px] font-medium transition-colors ${tab === t ? "border-b-2 border-amber-400 text-amber-200" : "text-zinc-500 hover:text-zinc-200"}`}
            >
              {t === "paths" ? "路径" : t === "action" ? "行动" : "依据"}
            </button>
          ))}
        </div>

        {/* 内容 */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {tab === "paths" && (
            <div className="flex flex-col gap-3">
              {result.paths.map((p, i) => (
                <PathCard key={p.id} path={p} rank={i} />
              ))}
            </div>
          )}
          {tab === "action" && (
            <div className="flex flex-col gap-2">
              {result.actionAdvice.map((a, i) => (
                <div key={i} className="flex gap-2 text-[12px]">
                  <span className="mt-0.5 shrink-0 text-amber-400">→</span>
                  <span className="text-zinc-200">{a}</span>
                </div>
              ))}
            </div>
          )}
          {tab === "basis" && (
            <div className="flex flex-col gap-2">
              {result.basis.map((b, i) => (
                <div key={i} className="flex gap-2 text-[11px] text-zinc-400">
                  <span className="mt-0.5 shrink-0 text-zinc-600">◎</span>
                  <span>{b}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 验证时间窗 */}
        <div className="flex shrink-0 items-center justify-between border-t border-white/6 px-4 py-2.5">
          <span className="font-mono text-[10px] text-zinc-600">{result.verificationWindow}</span>
          <Link href="/archive" className="rounded-full border border-amber-400/30 bg-amber-300/[0.06] px-2.5 py-0.5 font-mono text-[10px] text-amber-300/80 transition-colors hover:bg-amber-300/15 hover:text-amber-200">
            去档案回填 →
          </Link>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function PathCard({ path, rank }: { path: DR["paths"][0]; rank: number }) {
  const barRef = useRef<HTMLDivElement>(null);
  const RANK_COLORS = ["#f0c85a", "#6ea8ff", "#a78bfa", "#34d399"];
  const color = RANK_COLORS[rank % RANK_COLORS.length];

  useEffect(() => {
    if (!barRef.current) return;
    gsap.fromTo(barRef.current,
      { width: "0%" },
      { width: `${path.probability}%`, duration: 0.8, ease: "power2.out", delay: rank * 0.1 + 0.2 }
    );
  }, [path.probability, rank]);

  return (
    <div className="rounded-xl border border-white/6 p-3" style={{ background: "rgba(255,255,255,0.02)" }}>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[12px] font-medium text-zinc-100">{path.name}</span>
        <span className="font-mono text-xs" style={{ color }}>{path.probability}%</span>
      </div>
      <div className="mb-2 h-1 overflow-hidden rounded-full bg-white/6">
        <div ref={barRef} className="h-full rounded-full" style={{ background: color, width: 0 }} />
      </div>
      <div className="text-[10px] text-zinc-500">{path.trigger}</div>
      <div className="mt-1 text-[10px]" style={{ color: `${color}bb` }}>✓ {path.bestOutcome}</div>
      {path.risk.chance > 55 && (
        <div className="mt-1 text-[10px] text-red-400/70">⚠ {path.risk.desc} ({path.risk.chance}%)</div>
      )}
    </div>
  );
}
