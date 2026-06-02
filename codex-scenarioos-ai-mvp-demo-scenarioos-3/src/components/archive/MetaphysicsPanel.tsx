"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  computeBazi,
  interpretBazi,
  zodiacOf,
  WX_META,
  SHISHEN_GROUP,
  BAZI_DISCLAIMER,
  type WuXing,
  type BirthLike,
} from "./bazi";
import {
  useBaziVerify,
  saveBaziVerify,
  BAZI_VERDICT_META,
  type BaziVerdict,
} from "./baziVerifyStore";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const WU_XING = [
  { name: "木" as WuXing, angle: 90, meaning: "生长" },
  { name: "火" as WuXing, angle: 162, meaning: "热情" },
  { name: "土" as WuXing, angle: 234, meaning: "承载" },
  { name: "金" as WuXing, angle: 306, meaning: "决断" },
  { name: "水" as WuXing, angle: 18, meaning: "智慧" },
] as const;

const SHENG: Record<string, string> = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" };

const BA_GUA = [
  { name: "乾", symbol: "☰", color: "#fbbf24" },
  { name: "兑", symbol: "☱", color: "#f0abfc" },
  { name: "离", symbol: "☲", color: "#fb7185" },
  { name: "震", symbol: "☳", color: "#34d399" },
  { name: "巽", symbol: "☴", color: "#5eead4" },
  { name: "坎", symbol: "☵", color: "#60a5fa" },
  { name: "艮", symbol: "☶", color: "#c4b5fd" },
  { name: "坤", symbol: "☷", color: "#facc15" },
] as const;

type Props = { user: { birth?: BirthLike; nickname?: string } | null };

export default function MetaphysicsPanel({ user }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const baguaRef = useRef<SVGGElement>(null);
  const wuxingRef = useRef<SVGGElement>(null);
  const pulseRef = useRef<SVGCircleElement>(null);

  const birth = user?.birth;
  const chart = computeBazi(birth ?? {});
  const readings = chart ? interpretBazi(chart) : [];
  const verifyMap = useBaziVerify();
  const activeElement: WuXing = chart?.dayMasterWx ?? "土";
  const tone = WX_META[activeElement];

  useGSAP(
    () => {
      const root = panelRef.current;
      if (!root) return;
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set("[data-animate], [data-pillar], [data-bar], [data-chip]", { autoAlpha: 1, clearProps: "transform" });
      });

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // 不挂 ScrollTrigger：当 chart 由空变为有（依赖变化）重跑入场时，
        // 带 once 的触发器可能不再触发而把元素卡在 autoAlpha:0。这里改为 setup 即播放。
        const tl = gsap.timeline({ defaults: { duration: 0.7, ease: "power3.out" } });
        // 命盘罗盘是核心、必须常显。用 fromTo 显式指定终点 scale:1，
        // 这样即便依赖变化重跑、上一轮残留内联 scale，也始终回到满尺寸常显（gsap-core：
        // from() 会以"当前值"为终点，叠加重跑易被残留值污染，故用 fromTo）。
        tl.fromTo("[data-animate='dial']", { scale: 0.92 }, { scale: 1, ease: "power2.out" })
          .from("[data-pillar]", { autoAlpha: 0, y: 14, stagger: 0.06 }, "-=0.4")
          .from("[data-bar]", { scaleX: 0, transformOrigin: "left center", stagger: 0.07 }, "-=0.2")
          .from("[data-chip]", { autoAlpha: 0, y: 8, stagger: 0.04 }, "-=0.25");

        // 八卦外环顺时针、五行内环逆时针，构成转动的命盘罗盘
        gsap.to(baguaRef.current, { rotation: 360, duration: 96, repeat: -1, ease: "none", svgOrigin: "160 160" });
        gsap.to(wuxingRef.current, { rotation: -360, duration: 60, repeat: -1, ease: "none", svgOrigin: "160 160" });

        // 五行相生：暗虚线沿 木→火→土→金→水 方向流动的能量
        gsap.fromTo(
          "[data-sheng-line]",
          { strokeDashoffset: 0 },
          { strokeDashoffset: -48, duration: 1.6, repeat: -1, ease: "none" },
        );

        // 五行节点呼吸 + 当前日主元素更强的脉冲
        gsap.to("[data-wuxing-node]", {
          scale: 1.12, duration: 0.9, repeat: -1, yoyo: true, ease: "sine.inOut",
          stagger: { each: 0.22, repeat: -1 }, transformOrigin: "50% 50%",
        });

        if (pulseRef.current) {
          gsap.to(pulseRef.current, {
            scale: 1.3, opacity: 0.08, duration: 1.7, repeat: -1, yoyo: true, ease: "sine.inOut", svgOrigin: "160 160",
          });
        }
      });

      return () => mm.revert();
    },
    { scope: panelRef, dependencies: [activeElement, !!chart] },
  );

  const C = 160;
  const R_OUTER = 122;
  const R_WUXING = 80;
  const R_CENTER = 38;
  // 圆周坐标四舍五入到 3 位，避免 Node/浏览器三角函数精度差异导致的水合不一致
  const rd = (n: number) => Math.round(n * 1000) / 1000;

  return (
    <div
      ref={panelRef}
      className="relative overflow-hidden rounded-2xl border border-amber-200/15 bg-[#070512]/80 p-3 sm:p-4"
      style={{ boxShadow: `inset 0 1px 0 rgba(255,255,255,0.06), 0 0 60px ${tone.glow}14` }}
    >
      {/* 背景星云 */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(circle at 26% 30%, ${tone.glow}22 0, transparent 42%), radial-gradient(circle at 84% 78%, rgba(167,139,250,0.10) 0, transparent 46%)`,
        }}
      />
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-amber-200/40 to-transparent" />

      <div className="relative">
        {/* 头部 */}
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-amber-200/50">BaZi Matrix</div>
            <div className="mt-1 font-mystic text-base font-semibold text-zinc-50 sm:text-lg">五行命盘工作台</div>
          </div>
          <div className="shrink-0 rounded-xl border border-amber-200/20 bg-black/40 px-3 py-1.5 text-right">
            <div className="font-mono text-[9px] tracking-wider text-zinc-500">日主 · DAY MASTER</div>
            <div className="font-mystic text-base font-bold" style={{ color: tone.color, textShadow: `0 0 12px ${tone.glow}` }}>
              {chart ? `${chart.pillars[2].gan}${chart.pillars[2].zhi}` : "未定"}
            </div>
          </div>
        </div>

        {/* 两栏布局：宽屏左盘右析，窄屏纵向堆叠 */}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-start">
          {/* 左：命盘罗盘 */}
          <div className="flex flex-col items-center">
            <div data-animate="dial" className="relative flex w-full justify-center overflow-hidden">
              <svg viewBox={`0 0 ${C * 2} ${C * 2}`} className="block h-auto w-full max-w-[290px] sm:max-w-[330px] lg:max-w-[310px] xl:max-w-[350px]">
                <defs>
                  <radialGradient id="metaCore" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor={tone.color} stopOpacity="0.34" />
                    <stop offset="44%" stopColor="#0b0a1f" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="#050410" stopOpacity="0.2" />
                  </radialGradient>
                  <filter id="metaGlow">
                    <feGaussianBlur stdDeviation="2.2" result="b" />
                    <feMerge>
                      <feMergeNode in="b" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                <circle cx={C} cy={C} r={140} fill="url(#metaCore)" stroke="rgba(231,199,102,0.16)" strokeWidth={1} />
                {[42, 68, 98, 128].map((r) => (
                  <circle key={r} cx={C} cy={C} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={1} />
                ))}
                {BA_GUA.map((_, i) => {
                  const a = (i * 45 - 90) * (Math.PI / 180);
                  return (
                    <line
                      key={i}
                      x1={rd(C + Math.cos(a) * 44)} y1={rd(C + Math.sin(a) * 44)}
                      x2={rd(C + Math.cos(a) * 140)} y2={rd(C + Math.sin(a) * 140)}
                      stroke="rgba(255,255,255,0.06)" strokeWidth={1}
                    />
                  );
                })}

                <g ref={baguaRef}>
                  {BA_GUA.map((gua, i) => {
                    const a = (i * 45 - 90) * (Math.PI / 180);
                    const x = rd(C + Math.cos(a) * R_OUTER);
                    const y = rd(C + Math.sin(a) * R_OUTER);
                    return (
                      <g key={gua.name} data-bagua-node>
                        <circle cx={x} cy={y} r={19} fill="rgba(7,5,18,0.88)" stroke={gua.color} strokeWidth={1.2} filter="url(#metaGlow)" />
                        <text x={x} y={y - 1} textAnchor="middle" fontSize={16} fill={gua.color} fontWeight={700}>{gua.symbol}</text>
                        <text x={x} y={y + 13} textAnchor="middle" fontSize={8} fill="rgba(255,255,255,0.5)">{gua.name}</text>
                      </g>
                    );
                  })}
                </g>

                <g ref={wuxingRef}>
                  {WU_XING.map((wx) => {
                    const a = (wx.angle - 90) * (Math.PI / 180);
                    const x = rd(C + Math.cos(a) * R_WUXING);
                    const y = rd(C + Math.sin(a) * R_WUXING);
                    const t = WU_XING.find((w) => w.name === SHENG[wx.name]);
                    const tx = t ? rd(C + Math.cos((t.angle - 90) * (Math.PI / 180)) * R_WUXING) : x;
                    const ty = t ? rd(C + Math.sin((t.angle - 90) * (Math.PI / 180)) * R_WUXING) : y;
                    const m = WX_META[wx.name];
                    const active = activeElement === wx.name;
                    return (
                      <g key={wx.name}>
                        <line
                          data-sheng-line
                          x1={x} y1={y} x2={tx} y2={ty}
                          stroke={m.color} strokeWidth={1.1} strokeDasharray="5 7" opacity={0.45}
                          style={{ filter: `drop-shadow(0 0 3px ${m.glow})` }}
                        />
                        <g data-wuxing-node>
                          <circle
                            cx={x} cy={y} r={active ? 23 : 17}
                            fill="rgba(5,4,16,0.92)" stroke={m.color} strokeWidth={active ? 2.4 : 1.5}
                            style={{ filter: `drop-shadow(0 0 8px ${m.glow})` }}
                          />
                          <text x={x} y={y + 5} textAnchor="middle" fontSize={14} fill={m.color} fontWeight={800}>{wx.name}</text>
                        </g>
                      </g>
                    );
                  })}
                </g>

                <circle ref={pulseRef} cx={C} cy={C} r={R_CENTER + 16} fill="none" stroke={tone.color} strokeWidth={2} opacity={0.28} />
                <circle cx={C} cy={C} r={R_CENTER} fill="rgba(0,0,0,0.55)" stroke={tone.color} strokeWidth={1.4} />
                <text x={C} y={C - 5} textAnchor="middle" fontSize={24} fill="rgba(255,255,255,0.9)" fontWeight={800} className="font-mystic">
                  {chart ? chart.dayStem : "命"}
                </text>
                <text x={C} y={C + 18} textAnchor="middle" fontSize={11} fill={tone.color}>{activeElement}局</text>
              </svg>
            </div>

            {/* 五行旺衰条 */}
            {chart && (
              <div className="mt-1 w-full max-w-[300px]">
                <div className="mb-1.5 flex items-center justify-between font-mono text-[10px] text-zinc-500">
                  <span>身强弱 · {chart.strength}</span>
                  <span>同党 {chart.selfRatio}%</span>
                </div>
                <div className="relative h-2 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${chart.selfRatio}%`,
                      background: `linear-gradient(90deg, ${tone.glow}, ${tone.color})`,
                      boxShadow: `0 0 12px ${tone.glow}88`,
                    }}
                  />
                  <div className="absolute inset-y-0 left-1/2 w-px bg-white/30" />
                </div>
              </div>
            )}

            {/* 五行图例 + 生克注解，填充左栏并提供释义 */}
            <div className="mt-3 grid w-full max-w-[300px] grid-cols-5 gap-1">
              {WU_XING.map((wx) => {
                const m = WX_META[wx.name];
                const active = activeElement === wx.name;
                return (
                  <div
                    key={wx.name}
                    data-chip
                    className="rounded-lg px-1 py-1.5 text-center"
                    style={{
                      background: active ? `${m.color}18` : `${m.color}0a`,
                      border: `1px solid ${active ? `${m.color}55` : "rgba(255,255,255,0.06)"}`,
                    }}
                  >
                    <div className="font-mystic text-sm font-bold" style={{ color: m.color }}>{wx.name}</div>
                    <div className="mt-0.5 truncate text-[8px] text-zinc-500">{wx.meaning}</div>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 max-w-[300px] text-center font-mono text-[9px] leading-relaxed text-zinc-600">
              内环五行相生 · 外环八卦定位 · 中宫为日主
            </div>
          </div>

          {/* 右：四柱 + 八字分析 */}
          <div className="min-w-0">
            {chart ? (
              <div className="flex flex-col gap-3">
                {/* 四柱（含十神 / 藏干 / 纳音） */}
                <div className="grid grid-cols-4 gap-1.5">
                  {chart.pillars.map((p) => {
                    const gm = WX_META[p.ganWx];
                    const isDay = p.key === "day";
                    return (
                      <div
                        key={p.key}
                        data-pillar
                        className="flex flex-col items-center rounded-xl border bg-white/[0.03] px-1 py-2 text-center"
                        style={{
                          borderColor: isDay ? `${gm.color}55` : "rgba(255,255,255,0.1)",
                          boxShadow: isDay ? `inset 0 0 16px ${gm.glow}1f` : undefined,
                        }}
                      >
                        <div className="text-[9px] text-zinc-500">{p.label}</div>
                        <div
                          className="mt-0.5 rounded px-1 text-[9px] font-medium"
                          style={{ color: p.god === "日主" ? gm.color : SHISHEN_GROUP[p.god as keyof typeof SHISHEN_GROUP]?.tone ?? "#a1a1aa" }}
                        >
                          {p.god}
                        </div>
                        <div className="mt-1 flex flex-col items-center leading-none">
                          <span className="font-mystic text-xl font-black" style={{ color: gm.color, textShadow: `0 0 10px ${gm.glow}` }}>{p.gan}</span>
                          <span className="mt-1 font-mystic text-lg font-bold text-zinc-200">{p.zhi}</span>
                        </div>
                        <div className="mt-1 truncate text-[8px] text-zinc-600">{p.hidden.join("") || "—"}</div>
                        <div className="mt-0.5 truncate text-[8px] text-zinc-600">{p.naYin}</div>
                      </div>
                    );
                  })}
                </div>

                {/* 五行力量分布 */}
                <div className="rounded-xl border border-white/10 bg-white/[0.025] p-2.5">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] text-zinc-300">五行力量分布</span>
                    <span className="font-mono text-[9px] text-zinc-600">旺 {chart.strongest} · 弱 {chart.weakest}</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {chart.elements.map((el) => {
                      const m = WX_META[el.name];
                      const fav = chart.favorable.includes(el.name);
                      return (
                        <div key={el.name} className="flex items-center gap-2">
                          <span className="w-4 shrink-0 text-center text-[11px] font-bold" style={{ color: m.color }}>{el.name}</span>
                          <div className="relative h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
                            <div
                              data-bar
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.max(4, el.pct)}%`,
                                background: `linear-gradient(90deg, ${m.glow}, ${m.color})`,
                                boxShadow: `0 0 10px ${m.glow}66`,
                              }}
                            />
                          </div>
                          <span className="w-8 shrink-0 text-right font-mono text-[10px] text-zinc-400">{el.pct}%</span>
                          {fav && <span className="w-3 text-[9px] text-amber-300" title="喜用">✦</span>}
                          {!fav && <span className="w-3" />}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 十神分布 + 喜用神 */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-white/10 bg-white/[0.025] p-2.5">
                    <div className="mb-1.5 text-[11px] text-zinc-300">十神格局</div>
                    <div className="flex flex-wrap gap-1">
                      {chart.godGroups.map((g) => (
                        <span
                          key={g.group}
                          data-chip
                          className="rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                          style={{ background: `${g.tone}1c`, color: g.tone, border: `1px solid ${g.tone}44` }}
                        >
                          {g.group}×{g.count}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-amber-200/20 bg-amber-300/[0.05] p-2.5">
                    <div className="mb-1.5 text-[11px] text-amber-200/80">喜用神</div>
                    <div className="flex flex-wrap gap-1">
                      {chart.favorable.map((f) => {
                        const m = WX_META[f];
                        return (
                          <span key={f} data-chip className="rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                            style={{ background: `${m.color}1c`, color: m.color, border: `1px solid ${m.color}55` }}>
                            {f}
                          </span>
                        );
                      })}
                      {chart.unfavorable.length > 0 && (
                        <span className="ml-1 self-center font-mono text-[9px] text-zinc-600">忌 {chart.unfavorable.join("")}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 命理批断 */}
                <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent px-3 py-2.5">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: tone.color, boxShadow: `0 0 8px ${tone.glow}` }} />
                    <span className="text-[11px] text-zinc-200">
                      {user?.nickname ?? "命主"} · 生肖{zodiacOf(birth?.year ?? 2000)} · {chart.strength}
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-zinc-400">{chart.summary}</p>
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-10 text-center">
                <div className="text-4xl text-amber-200/30">☯</div>
                <div className="text-[12px] text-zinc-400">填写出生信息后解锁</div>
                <div className="text-[11px] text-zinc-600">四柱 · 藏干 · 十神 · 五行力量 · 喜用神</div>
                <div className="mt-1 rounded-lg border border-amber-200/20 px-3 py-1 font-mono text-[10px] text-amber-200/60">
                  工作台右上角 → 个人档案
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 命理译码：符号 → 现实变量（全宽 2 列网格，PRD 5.9 合规：可展开/标来源/可验证） */}
        {chart && (
          <div className="mt-4 rounded-xl border border-violet-300/15 bg-violet-500/[0.04] p-3">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="text-[12px] text-violet-200/90">命理译码 · 符号 → 现实变量</span>
              <span className="font-mono text-[9px] text-zinc-600">可验证 · 非算命</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {readings.map((r) => (
                <div key={r.symbol} className="flex flex-col rounded-lg border border-white/8 bg-black/20 p-2.5">
                  <div className="mb-1 flex flex-wrap items-center gap-1.5">
                    <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-violet-100" style={{ background: "rgba(167,139,250,0.18)" }}>
                      {r.symbol}
                    </span>
                    {r.sources.map((s) => (
                      <span key={s} className="rounded border border-white/10 px-1 py-0.5 font-mono text-[8px] text-zinc-500">
                        来源·{s}
                      </span>
                    ))}
                  </div>
                  <p className="mb-1.5 text-[10px] leading-relaxed text-zinc-400">{r.meaning}</p>
                  <div className="mb-1.5 flex flex-wrap gap-1">
                    {r.variables.map((v) => (
                      <span key={v} className="rounded-md bg-white/[0.05] px-1.5 py-0.5 text-[9px] text-zinc-300">→ {v}</span>
                    ))}
                  </div>
                  <div className="mt-auto flex items-start gap-1.5 rounded-md bg-amber-300/[0.06] px-2 py-1.5">
                    <span className="mt-px text-[10px] text-amber-300/80">?</span>
                    <span className="text-[10px] leading-relaxed text-amber-100/70">{r.question}</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-1">
                    <span className="font-mono text-[9px] text-zinc-600">30天后回填：</span>
                    {(Object.keys(BAZI_VERDICT_META) as BaziVerdict[]).map((v) => {
                      const m = BAZI_VERDICT_META[v];
                      const active = verifyMap[r.symbol]?.verdict === v;
                      return (
                        <button
                          key={v}
                          type="button"
                          onClick={() => saveBaziVerify(r.symbol, v, new Date().getTime())}
                          className="rounded border px-1.5 py-0.5 text-[9px] transition-all active:scale-95"
                          style={{ borderColor: active ? m.color : `${m.color}33`, color: m.color, background: active ? `${m.color}22` : "transparent" }}
                        >
                          {m.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[9px] leading-relaxed text-zinc-600">{BAZI_DISCLAIMER}</p>
          </div>
        )}
      </div>
    </div>
  );
}
