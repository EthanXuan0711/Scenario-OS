"use client";

import type { ReactNode } from "react";
import { useMemo, useRef, useState } from "react";
import { Activity, Crosshair, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import {
  Bar,
  Brush,
  CartesianGrid,
  ComposedChart,
  Label,
  LabelList,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { DaYunZone, KLinePoint } from "./klineTypes";
import { calculateMA } from "./klineTypes";

gsap.registerPlugin(useGSAP, ScrollTrigger);

interface LifeKLineChartProps {
  data: KLinePoint[];
  currentAge?: number;
  birthYear?: number;
  onYearClick?: (year: number) => void;
}

type ChartPoint = KLinePoint & {
  bodyRange: [number, number];
  ma5: number | null;
  ma10: number | null;
  trend: number;
};

function scoreTone(score: number) {
  if (score >= 78) return { color: "#34d399", bg: "rgba(52, 211, 153, 0.16)", label: "高势" };
  if (score <= 36) return { color: "#fb7185", bg: "rgba(251, 113, 133, 0.16)", label: "低势" };
  return { color: "#facc15", bg: "rgba(250, 204, 21, 0.14)", label: "中势" };
}

function MetricCard({ label, value, sub, tone, icon }: { label: string; value: string; sub: string; tone: string; icon: ReactNode }) {
  return (
    <div data-kline-animate="metric" className="min-w-0 rounded-lg border border-white/10 bg-white/[0.04] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="truncate text-[10px] uppercase tracking-[0.16em] text-zinc-500">{label}</span>
        <span className="shrink-0" style={{ color: tone }}>
          {icon}
        </span>
      </div>
      <div className="truncate font-mono text-lg font-black text-zinc-100">{value}</div>
      <div className="mt-1 truncate text-[10px] text-zinc-500">{sub}</div>
    </div>
  );
}

function ScoreBar({ score, label }: { score: number; label: string }) {
  const tone = scoreTone(score);
  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-center justify-between gap-2 text-[10px]">
        <span className="truncate text-zinc-500">{label}</span>
        <span className="font-mono font-bold" style={{ color: tone.color }}>
          {score}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.max(3, Math.min(100, score))}%`,
            background: `linear-gradient(90deg, ${tone.color}66, ${tone.color})`,
            boxShadow: `0 0 14px ${tone.color}55`,
          }}
        />
      </div>
    </div>
  );
}

function DaYunRail({ zones, minAge, maxAge, currentAge }: { zones: DaYunZone[]; minAge: number; maxAge: number; currentAge: number }) {
  const palette = ["#38bdf8", "#a78bfa", "#facc15", "#34d399", "#fb7185", "#f0abfc"];
  const span = Math.max(1, maxAge - minAge + 1);
  return (
    <div data-kline-animate="rail" className="mb-3 rounded-lg border border-white/10 bg-black/25 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-zinc-300">大运轨道</span>
        <span className="font-mono text-[10px] text-zinc-600">当前 {currentAge} 岁</span>
      </div>
      <div className="relative">
        <div className="flex h-2 overflow-hidden rounded-full bg-white/[0.05]">
          {zones.map((zone) => {
            const color = palette[zone.index % palette.length];
            const width = ((zone.endAge - zone.startAge + 1) / span) * 100;
            return (
              <div
                key={`${zone.daYun}-${zone.startAge}`}
                className="h-full"
                style={{
                  flex: `0 0 ${width}%`,
                  background: `linear-gradient(90deg, ${color}33, ${color}aa)`,
                }}
              />
            );
          })}
        </div>
        <div
          className="absolute -top-1 h-4 w-px bg-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.8)]"
          style={{ left: `${Math.max(0, Math.min(100, ((currentAge - minAge) / span) * 100))}%` }}
        />
      </div>
      <div className="mt-2 grid grid-cols-4 gap-1 sm:grid-cols-6">
        {zones.slice(0, 6).map((zone) => (
          <div key={`${zone.daYun}-label-${zone.startAge}`} className="min-w-0 rounded bg-white/[0.03] px-1.5 py-1">
            <div className="truncate text-[10px] text-zinc-300">{zone.daYun ?? "未定"}</div>
            <div className="font-mono text-[9px] text-zinc-600">
              {zone.startAge}-{zone.endAge}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CosmicTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartPoint }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const isUp = d.close >= d.open;
  const tone = scoreTone(d.score);

  return (
    <div className="w-72 rounded-lg border border-white/15 bg-[#07080d]/95 p-4 text-xs shadow-2xl backdrop-blur-xl">
      <div className="mb-2 flex items-center justify-between gap-2 border-b border-white/10 pb-2">
        <div className="min-w-0">
          <div className="truncate font-bold text-zinc-100">
            {d.year} {d.ganZhi}年
          </div>
          <div className="mt-0.5 font-mono text-[10px] text-zinc-500">{d.age} 岁</div>
        </div>
        <span className="shrink-0 rounded-full px-2 py-0.5 font-bold" style={{ color: tone.color, background: tone.bg }}>
          {tone.label} {d.score}
        </span>
      </div>
      {d.daYun && <div className="mb-2 text-cyan-300">大运：{d.daYun}</div>}
      <div className="mb-2 grid grid-cols-4 gap-1 rounded-lg bg-white/[0.04] p-2 text-center">
        {[
          ["开", d.open],
          ["收", d.close],
          ["高", d.high],
          ["低", d.low],
        ].map(([label, val]) => (
          <div key={label as string}>
            <div className="text-zinc-600">{label}</div>
            <div className="font-mono font-bold text-zinc-200">{val}</div>
          </div>
        ))}
      </div>
      <div className="mb-2 flex gap-3 text-[10px]">
        <span className={isUp ? "text-emerald-300" : "text-rose-300"}>{isUp ? "上行" : "下行"}蜡烛</span>
        {d.ma5 !== null && <span className="text-indigo-300">MA5: {d.ma5}</span>}
        {d.ma10 !== null && <span className="text-amber-300">MA10: {d.ma10}</span>}
      </div>
      <p className="max-h-32 overflow-y-auto text-justify leading-relaxed text-zinc-400">{d.reason}</p>
    </div>
  );
}

function CandleShape(props: Record<string, unknown>) {
  const { x, y, width, height, payload, yAxis } = props as {
    x: number;
    y: number;
    width: number;
    height: number;
    payload: ChartPoint;
    yAxis: { scale?: (v: number) => number };
  };
  if (typeof x !== "number" || typeof y !== "number" || typeof width !== "number") return null;

  const isUp = payload.close >= payload.open;
  const isExtreme = payload.score > 88 || payload.score < 24;
  const color = isUp ? "#34d399" : "#fb7185";
  const gradId = isUp ? "lifeKUp" : "lifeKDown";
  let highY = y;
  let lowY = y + height;

  if (yAxis?.scale) {
    try {
      highY = yAxis.scale(payload.high);
      lowY = yAxis.scale(payload.low);
    } catch {
      highY = y;
      lowY = y + height;
    }
  }

  const candleWidth = Math.max(3, width * 0.62);
  const cx = x + width / 2;
  const bodyHeight = Math.max(2, height);
  const bodyX = cx - candleWidth / 2;
  const bodyY = height < 2 ? y - 1 : y;

  return (
    <g filter={isExtreme ? "url(#lifeKGlow)" : undefined}>
      <line x1={cx} y1={highY} x2={cx} y2={lowY} stroke={color} strokeWidth={1.4} strokeLinecap="round" />
      <rect x={bodyX} y={bodyY} width={candleWidth} height={bodyHeight} fill={`url(#${gradId})`} stroke={color} strokeWidth={0.8} rx={1.5} />
    </g>
  );
}

function PeakLabel(props: Record<string, unknown> & { maxHigh?: number }) {
  const { x, y, width, value, maxHigh } = props as { x: number; y: number; width: number; value: number; maxHigh: number };
  if (value !== maxHigh) return null;
  return (
    <g>
      <text x={Number(x) + Number(width) / 2} y={Number(y) - 12} fill="#facc15" fontSize={10} fontWeight="bold" textAnchor="middle">
        ★{value}
      </text>
    </g>
  );
}

export default function LifeKLineChart({ data, currentAge, birthYear, onYearClick }: LifeKLineChartProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [activeYear, setActiveYear] = useState<number | null>(null);
  const currentYear = new Date().getFullYear();
  const thisAge = currentAge ?? (birthYear ? currentYear - birthYear + 1 : 30);

  const daYunZones = useMemo<DaYunZone[]>(() => {
    if (!data.length) return [];
    const zones: DaYunZone[] = [];
    let cur = data[0].daYun;
    let start = data[0].age;
    for (let i = 1; i <= data.length; i++) {
      if (i === data.length || data[i]?.daYun !== cur) {
        zones.push({ daYun: cur, startAge: start, endAge: data[i - 1]?.age, index: zones.length });
        if (i < data.length) {
          cur = data[i].daYun;
          start = data[i].age;
        }
      }
    }
    return zones;
  }, [data]);

  const transformed = useMemo<ChartPoint[]>(() => {
    const ma5 = calculateMA(data, 5);
    const ma10 = calculateMA(data, 10);
    return data.map((d, i) => ({
      ...d,
      bodyRange: [Math.min(d.open, d.close), Math.max(d.open, d.close)],
      ma5: ma5[i],
      ma10: ma10[i],
      trend: d.close - d.open,
    }));
  }, [data]);

  const daYunChanges = useMemo(() => data.filter((d, i) => i === 0 || d.daYun !== data[i - 1].daYun), [data]);
  const maxHigh = useMemo(() => (data.length ? Math.max(...data.map((d) => d.high)) : 0), [data]);
  const minLow = useMemo(() => (data.length ? Math.min(...data.map((d) => d.low)) : 0), [data]);
  const avgScore = useMemo(() => (data.length ? Math.round(data.reduce((sum, d) => sum + d.score, 0) / data.length) : 0), [data]);
  const positiveYears = useMemo(() => data.filter((d) => d.close >= d.open).length, [data]);
  const peakPoint = useMemo(() => data.reduce<KLinePoint | null>((best, d) => (!best || d.high > best.high ? d : best), null), [data]);
  const valleyPoint = useMemo(() => data.reduce<KLinePoint | null>((best, d) => (!best || d.low < best.low ? d : best), null), [data]);
  const currentPoint = useMemo(() => {
    if (!data.length) return null;
    return data.find((d) => d.age === thisAge) ?? data.find((d) => d.year === currentYear) ?? data[Math.min(data.length - 1, Math.max(0, thisAge - 1))];
  }, [currentYear, data, thisAge]);
  const trendDelta = useMemo(() => {
    if (!currentPoint) return 0;
    const idx = data.findIndex((d) => d.year === currentPoint.year);
    const prev = idx > 0 ? data[idx - 1] : null;
    return prev ? currentPoint.score - prev.score : currentPoint.close - currentPoint.open;
  }, [currentPoint, data]);
  const activePoint = useMemo(() => data.find((d) => d.year === activeYear) ?? null, [activeYear, data]);
  const focusPoint = activePoint ?? currentPoint ?? peakPoint;
  const brushIdx = useMemo(() => {
    const idx = data.findIndex((d) => d.age === thisAge);
    const ci = idx === -1 ? Math.min(30, Math.max(0, data.length - 1)) : idx;
    return { start: Math.max(0, ci - 15), end: Math.min(data.length - 1, ci + 15) };
  }, [data, thisAge]);

  useGSAP(
    () => {
      const root = wrapRef.current;
      if (!root) return;

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set("[data-kline-animate]", { autoAlpha: 1, clearProps: "transform" });
      });

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const metrics = gsap.utils.toArray<HTMLElement>("[data-kline-animate='metric']");
        const tl = gsap.timeline({
          defaults: { duration: 0.62, ease: "power3.out" },
          scrollTrigger: { trigger: root, start: "top 88%", once: true },
        });

        tl.from(metrics, { autoAlpha: 0, y: 14, stagger: 0.055 })
          .from("[data-kline-animate='rail']", { autoAlpha: 0, y: 12 }, "-=0.32")
          .from("[data-kline-animate='chart']", { autoAlpha: 0, y: 18, scale: 0.985 }, "-=0.28")
          .from("[data-kline-animate='detail']", { autoAlpha: 0, y: 12 }, "-=0.2");

        gsap.to("[data-kline-scan]", {
          xPercent: 120,
          duration: 4.8,
          repeat: -1,
          ease: "none",
        });
      });

      return () => mm.revert();
    },
    { scope: wrapRef, dependencies: [data.length] },
  );

  if (!data.length) {
    return <div className="flex h-64 items-center justify-center text-zinc-600">暂无数据 · 连接 LLM 后生成真实八字 K 线</div>;
  }

  const minAge = data[0].age;
  const maxAge = data[data.length - 1].age;
  const currentTone = scoreTone(currentPoint?.score ?? avgScore);
  const activeAge = activePoint?.age;

  return (
    <div ref={wrapRef} className="min-w-0 w-full">
      <div className="mb-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <MetricCard
          label="Current Flow"
          value={`${currentPoint?.ganZhi ?? "--"} ${currentPoint?.score ?? "--"}`}
          sub={`${thisAge} 岁 · ${currentPoint?.daYun ?? "大运未定"}`}
          tone={currentTone.color}
          icon={<Crosshair size={15} />}
        />
        <MetricCard
          label="Peak Signal"
          value={peakPoint ? `${peakPoint.high} / ${peakPoint.year}` : "--"}
          sub={peakPoint ? `${peakPoint.ganZhi}年 · ${peakPoint.age} 岁` : "暂无峰值"}
          tone="#facc15"
          icon={<Sparkles size={15} />}
        />
        <MetricCard
          label="Valley Risk"
          value={valleyPoint ? `${valleyPoint.low} / ${valleyPoint.year}` : "--"}
          sub={valleyPoint ? `${valleyPoint.ganZhi}年 · ${valleyPoint.age} 岁` : "暂无低点"}
          tone="#fb7185"
          icon={<TrendingDown size={15} />}
        />
        <MetricCard
          label="Lifetime Avg"
          value={`${avgScore}`}
          sub={`上行 ${positiveYears}/${data.length} 年 · Δ ${trendDelta >= 0 ? "+" : ""}${trendDelta}`}
          tone="#38bdf8"
          icon={trendDelta >= 0 ? <TrendingUp size={15} /> : <Activity size={15} />}
        />
      </div>

      <DaYunRail zones={daYunZones} minAge={minAge} maxAge={maxAge} currentAge={thisAge} />

      <div data-kline-animate="chart" className="relative overflow-hidden rounded-lg border border-white/10 bg-[#050509] p-3">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div data-kline-scan className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-cyan-300/10 to-transparent" />

        <div className="relative mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-3 text-[11px]">
            <span className="flex items-center gap-1.5 text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              吉运上行
            </span>
            <span className="flex items-center gap-1.5 text-rose-300">
              <span className="h-2 w-2 rounded-full bg-rose-400" />
              凶运下行
            </span>
            <span className="flex items-center gap-1.5 text-indigo-300">
              <span className="inline-block h-0.5 w-3 bg-indigo-300" />
              MA5
            </span>
            <span className="flex items-center gap-1.5 text-amber-300">
              <span className="inline-block h-0.5 w-3 bg-amber-300" />
              MA10
            </span>
          </div>
          <span className="font-mono text-[10px] text-zinc-600">点击蜡烛查看流年批注 · 底部滑块缩放</span>
        </div>

        <div className="relative h-[360px] min-h-[360px] min-w-0 w-full sm:h-[420px] sm:min-h-[420px] lg:h-[460px] lg:min-h-[460px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={transformed}
              margin={{ top: 28, right: 10, left: 0, bottom: 48 }}
              onClick={(e) => {
                const event = e as { activePayload?: Array<{ payload?: ChartPoint }> };
                const year = event.activePayload?.[0]?.payload?.year;
                if (!year) return;
                setActiveYear(year === activeYear ? null : year);
                onYearClick?.(year);
              }}
            >
              <defs>
                <linearGradient id="lifeKUp" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor="#047857" />
                  <stop offset="100%" stopColor="#34d399" />
                </linearGradient>
                <linearGradient id="lifeKDown" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#be123c" />
                  <stop offset="100%" stopColor="#fb7185" />
                </linearGradient>
                <filter id="lifeKGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {daYunZones.map((z) => (
                <ReferenceArea
                  key={`${z.daYun}-${z.startAge}-${z.endAge}`}
                  x1={z.startAge}
                  x2={z.endAge}
                  fill={z.index % 2 === 0 ? "rgba(56,189,248,0.045)" : "rgba(167,139,250,0.045)"}
                  stroke="none"
                />
              ))}

              {activeAge && <ReferenceArea x1={activeAge - 0.45} x2={activeAge + 0.45} fill="rgba(250,204,21,0.12)" stroke="rgba(250,204,21,0.35)" />}

              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.055)" />

              <XAxis dataKey="age" tick={{ fontSize: 9, fill: "#64748b" }} interval={9} axisLine={{ stroke: "rgba(255,255,255,0.08)" }} tickLine={false}>
                <Label value="年龄" position="insideBottomRight" offset={-5} fontSize={9} fill="#64748b" />
              </XAxis>
              <YAxis domain={[0, 110]} tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false}>
                <Label value="运势" angle={-90} position="insideLeft" fontSize={9} fill="#64748b" />
              </YAxis>

              <Tooltip content={<CosmicTooltip />} cursor={{ stroke: "rgba(255,255,255,0.16)", strokeDasharray: "4 4" }} />

              {daYunChanges.map((p) => (
                <ReferenceLine key={`${p.daYun}-${p.age}`} x={p.age} stroke="rgba(125,211,252,0.28)" strokeDasharray="3 3" strokeWidth={1}>
                  <Label value={p.daYun} position="top" fill="#7dd3fc" fontSize={9} />
                </ReferenceLine>
              ))}

              <ReferenceLine x={thisAge} stroke="#facc15" strokeWidth={2}>
                <Label value="今" position="top" fill="#facc15" fontSize={11} fontWeight="bold" />
              </ReferenceLine>
              <ReferenceLine y={maxHigh} stroke="rgba(250,204,21,0.26)" strokeDasharray="5 5">
                <Label value="峰" position="right" fill="#facc15" fontSize={10} />
              </ReferenceLine>
              <ReferenceLine y={minLow} stroke="rgba(251,113,133,0.24)" strokeDasharray="5 5">
                <Label value="谷" position="right" fill="#fb7185" fontSize={10} />
              </ReferenceLine>

              <Line type="monotone" dataKey="ma10" stroke="#fbbf24" dot={false} strokeWidth={1.5} connectNulls isAnimationActive={false} />
              <Line type="monotone" dataKey="ma5" stroke="#818cf8" dot={false} strokeWidth={2} connectNulls isAnimationActive={false} />

              <Bar dataKey="bodyRange" shape={<CandleShape />} isAnimationActive animationDuration={1000}>
                <LabelList dataKey="high" position="top" content={<PeakLabel maxHigh={maxHigh} />} />
              </Bar>

              <Brush
                dataKey="age"
                height={28}
                stroke="rgba(125,211,252,0.4)"
                fill="rgba(125,211,252,0.06)"
                startIndex={brushIdx.start}
                endIndex={brushIdx.end}
                travellerWidth={8}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {focusPoint && (
        <div data-kline-animate="detail" className="mt-3 rounded-lg border border-white/10 bg-white/[0.04] p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate font-bold text-zinc-100">
                {activePoint ? "选中流年" : "当前流年"} · {focusPoint.year} {focusPoint.ganZhi}年（{focusPoint.age}岁）
              </div>
              <div className="mt-1 flex flex-wrap gap-2 text-[10px]">
                {focusPoint.daYun && <span className="rounded-full bg-cyan-400/15 px-2 py-0.5 text-cyan-200">{focusPoint.daYun}</span>}
                <span className="rounded-full px-2 py-0.5" style={{ color: scoreTone(focusPoint.score).color, background: scoreTone(focusPoint.score).bg }}>
                  {scoreTone(focusPoint.score).label}
                </span>
              </div>
            </div>
            {activePoint && (
              <button type="button" onClick={() => setActiveYear(null)} className="rounded-lg border border-white/10 px-2 py-1 text-xs text-zinc-500 hover:text-zinc-200">
                关闭
              </button>
            )}
          </div>
          <div className="mb-3 grid gap-2 sm:grid-cols-3">
            <ScoreBar score={focusPoint.open} label="开盘势能" />
            <ScoreBar score={focusPoint.close} label="收盘势能" />
            <ScoreBar score={focusPoint.score} label="综合评分" />
          </div>
          <p className="text-[12px] leading-relaxed text-zinc-400">{focusPoint.reason}</p>
        </div>
      )}
    </div>
  );
}
