"use client";

// 事件 K 线（PRD §5.10「人生 K 线双图」之一）：用真实推演历史 + 回填结果生成。
// 每根蜡烛 = 一次推演事件；命中/偏差/错误决定涨跌与颜色；连成「判断命中势能」走势。
// 30/90/365 天窗口切换。数据来自 localStorage（客户端），故本组件以 ssr:false 动态加载。

import { useMemo, useState } from "react";
import {
  Bar, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, Label,
} from "recharts";
import { useDeductionHistory, useBackfills, type HistoryItem } from "../deduction";
import type { Verdict } from "../deduction";

const VERDICT_META: Record<Verdict, { label: string; color: string; delta: number }> = {
  hit: { label: "命中", color: "#34d399", delta: 12 },
  deviation: { label: "偏差", color: "#e7c766", delta: 3 },
  miss: { label: "错误", color: "#fb7185", delta: -12 },
};
const PENDING = { label: "待验证", color: "#6b7280" };

const WINDOWS = [
  { key: "30", label: "30天", days: 30 },
  { key: "90", label: "90天", days: 90 },
  { key: "365", label: "1年", days: 365 },
  { key: "all", label: "全部", days: Infinity },
] as const;

type EventPoint = {
  idx: number;
  label: string;
  topic: string;
  verdict?: Verdict;
  open: number;
  close: number;
  high: number;
  low: number;
  bodyRange: [number, number];
};

const clamp = (v: number, lo = 5, hi = 95) => Math.max(lo, Math.min(hi, v));
const fmt = (ts: number) => {
  const d = new Date(ts);
  return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function CandleShape(props: Record<string, unknown>) {
  const { x, y, width, height, payload, yAxis } = props as {
    x: number; y: number; width: number; height: number;
    payload: EventPoint; yAxis: { scale?: (v: number) => number };
  };
  if (typeof x !== "number" || typeof width !== "number") return null;
  const v = payload.verdict;
  const color = v ? VERDICT_META[v].color : PENDING.color;
  let highY = y;
  let lowY = y + height;
  if (yAxis?.scale) {
    try { highY = yAxis.scale(payload.high); lowY = yAxis.scale(payload.low); } catch { /* noop */ }
  }
  const cw = Math.max(3, width * 0.6);
  const cx = x + width / 2;
  const bodyH = Math.max(2, height);
  return (
    <g>
      <line x1={cx} y1={highY} x2={cx} y2={lowY} stroke={color} strokeWidth={1.3} strokeLinecap="round" />
      <rect x={cx - cw / 2} y={height < 2 ? y - 1 : y} width={cw} height={bodyH} fill={color} fillOpacity={0.85} stroke={color} rx={1.5} />
    </g>
  );
}

function EventTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: EventPoint }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const vm = d.verdict ? VERDICT_META[d.verdict] : PENDING;
  return (
    <div className="w-56 rounded-lg border border-white/15 bg-[#07060f]/95 p-3 text-xs shadow-2xl backdrop-blur-xl">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] text-zinc-500">{d.label}</span>
        <span className="rounded-full px-2 py-0.5 text-[10px]" style={{ color: vm.color, background: `${vm.color}1c` }}>{vm.label}</span>
      </div>
      <div className="truncate text-zinc-100">「{d.topic}」</div>
      <div className="mt-1 font-mono text-[10px] text-zinc-500">势能 {d.open} → {d.close}</div>
    </div>
  );
}

export default function EventKLine() {
  const history = useDeductionHistory();
  const backfills = useBackfills();
  const [win, setWin] = useState<(typeof WINDOWS)[number]["key"]>("90");

  const { points, stats } = useMemo(() => {
    const bfMap = new Map(backfills.map((b) => [b.resultId, b.verdict]));
    const days = WINDOWS.find((w) => w.key === win)?.days ?? Infinity;
    const cutoff = days === Infinity ? 0 : Date.now() - days * 86400000;
    const items: HistoryItem[] = history
      .filter((h) => h.savedAt >= cutoff)
      .sort((a, b) => a.savedAt - b.savedAt);

    let eq = 50;
    const pts: EventPoint[] = items.map((h, i) => {
      const verdict = bfMap.get(h.id);
      const delta = verdict ? VERDICT_META[verdict].delta : 0;
      const open = eq;
      eq = clamp(eq + delta);
      const close = eq;
      const high = Math.min(100, Math.max(open, close) + 4);
      const low = Math.max(0, Math.min(open, close) - 4);
      return { idx: i, label: fmt(h.savedAt), topic: h.topic, verdict, open, close, high, low, bodyRange: [Math.min(open, close), Math.max(open, close)] };
    });

    const s = { hit: 0, deviation: 0, miss: 0, pending: 0 };
    items.forEach((h) => {
      const v = bfMap.get(h.id);
      if (v === "hit") s.hit++; else if (v === "deviation") s.deviation++; else if (v === "miss") s.miss++; else s.pending++;
    });
    return { points: pts, stats: { ...s, equity: eq } };
  }, [history, backfills, win]);

  return (
    <div className="min-w-0 w-full">
      {/* 窗口切换 + 统计 */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1">
          {WINDOWS.map((w) => (
            <button
              key={w.key}
              type="button"
              onClick={() => setWin(w.key)}
              className="rounded-lg border px-2.5 py-1 text-[11px] transition-colors"
              style={{
                borderColor: win === w.key ? "rgba(240,200,90,0.5)" : "rgba(255,255,255,0.1)",
                color: win === w.key ? "#f0c85a" : "#a1a1aa",
                background: win === w.key ? "rgba(240,200,90,0.1)" : "transparent",
              }}
            >
              {w.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2.5 font-mono text-[10px]">
          <span className="text-emerald-300">命中 {stats.hit}</span>
          <span className="text-amber-300">偏差 {stats.deviation}</span>
          <span className="text-rose-300">错误 {stats.miss}</span>
          <span className="text-zinc-500">待验证 {stats.pending}</span>
        </div>
      </div>

      {points.length === 0 ? (
        <div className="flex h-[300px] flex-col items-center justify-center gap-2 rounded-lg border border-white/8 bg-[#050509] text-center sm:h-[360px]">
          <div className="text-3xl opacity-20">📉</div>
          <div className="text-[12px] text-zinc-500">这个窗口还没有可验证的事件。</div>
          <div className="text-[11px] text-zinc-700">去「推演」做一次决策，回来「回填」结果，<br />事件 K 线会在这里成形。</div>
        </div>
      ) : (
        <div className="relative min-w-0 overflow-hidden rounded-lg border border-white/10 bg-[#050509] p-3">
          <div
            className="pointer-events-none absolute inset-0 opacity-50"
            style={{ background: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)", backgroundSize: "28px 28px" }}
          />
          <div className="relative mb-2 flex items-center justify-between">
            <span className="font-mono text-[10px] text-zinc-600">判断命中势能 · 每根蜡烛 = 一次推演事件</span>
            <span className="font-mono text-[11px]" style={{ color: stats.equity >= 50 ? "#34d399" : "#fb7185" }}>当前势能 {stats.equity}</span>
          </div>
          <div className="relative h-[300px] min-h-[300px] min-w-0 w-full sm:h-[360px] sm:min-h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={points} margin={{ top: 16, right: 8, left: -8, bottom: 8 }}>
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#64748b" }} axisLine={{ stroke: "rgba(255,255,255,0.08)" }} tickLine={false} interval="preserveStartEnd" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} width={28} />
                <Tooltip content={<EventTooltip />} cursor={{ stroke: "rgba(255,255,255,0.16)", strokeDasharray: "4 4" }} />
                <ReferenceLine y={50} stroke="rgba(255,255,255,0.16)" strokeDasharray="5 5">
                  <Label value="基线" position="right" fill="#64748b" fontSize={9} />
                </ReferenceLine>
                <Bar dataKey="bodyRange" shape={<CandleShape />} isAnimationActive animationDuration={700} />
                <Line type="monotone" dataKey="close" stroke="#f0c85a" dot={false} strokeWidth={1.6} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
