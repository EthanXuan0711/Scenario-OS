"use client";

// 档案 v2 — PRD 长期资产完整版：
// 命盘雷达（十维）+ 人生K线图 + 命理八字面板 + 人生衍生品 + 命中率仪表盘 + 推演历史回填

import { useEffect, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { useSharedScenario } from "../scenarioBridge";
import { decisionVariables } from "../cockpit/cockpitSim";
import { saveBackfill, useDeductionHistory, useHitRate, useBackfills, type HistoryItem } from "../deduction";
import type { Verdict, Backfill } from "../deduction";
import { useUser } from "../user/useUser";
import MetaphysicsPanel from "./MetaphysicsPanel";
import { generateDemoKLine } from "./klineTypes";
import { computeBazi, zodiacOf, WX_META } from "./bazi";

const LifeKLineChart = dynamic(() => import("./LifeKLineChart"), {
  ssr: false,
  loading: () => <div className="flex h-[360px] items-center justify-center text-xs text-zinc-600 sm:h-[420px] lg:h-[460px]">正在生成生命 K 线…</div>
});

const EventKLine = dynamic(() => import("./EventKLine"), {
  ssr: false,
  loading: () => <div className="flex h-[300px] items-center justify-center text-xs text-zinc-600 sm:h-[360px]">正在生成事件 K 线…</div>
});

export default function Archive() {
  const scenario = useSharedScenario();
  const hit = useHitRate();
  const history = useDeductionHistory();
  const { user } = useUser();
  const vars = decisionVariables.map((v) => ({ id: v.id, name: v.name, value: scenario?.variables?.[v.id] ?? v.value }));

  return (
    <div className="cosmic-field mt-11 min-h-[calc(100dvh-2.75rem)] w-full overflow-x-hidden px-4 pb-20 pt-8 font-sans text-zinc-200 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <ArchiveHero user={user} />

        {/* 第一行：决策六维 + 命中率（高度对等的同辈卡片） */}
        <div className="mb-5 grid items-stretch gap-5 lg:grid-cols-2">
          <Panel title="命盘 · 决策六维" subtitle="DECISION RADAR">
            <RadarChart data={vars} />
          </Panel>
          <Panel title="推演命中率" subtitle="HIT RATE">
            <HitRatePanel stats={hit} />
          </Panel>
        </div>

        {/* 第二行：五行命盘工作台（全宽，内部双栏自适应，避免拥挤截断） */}
        <div className="mb-5">
          <Panel title="玄学 · 五行八字命盘" subtitle="BAZI MATRIX">
            <MetaphysicsPanel user={user} />
          </Panel>
        </div>

        {/* 第三行：人生K线（全宽） */}
        <div className="mb-5">
          <Panel title="人生K线 · 用 K 线读懂人生" subtitle="LIFE K-LINE">
            <RealLifeKLine user={user} />
          </Panel>
        </div>

        {/* 第四行：人生衍生品 + 推演历史 */}
        <div className="grid items-stretch gap-5 lg:grid-cols-2">
          <Panel title="人生衍生品 · 决策期权" subtitle="LIFE DERIVATIVES">
            <LifeDerivatives vars={vars} scenario={scenario} />
          </Panel>
          <Panel title="推演历史 · 结果回填" subtitle="DEDUCTION LOG">
            <History items={history} />
          </Panel>
        </div>
      </div>
    </div>
  );
}

// ─── 档案顶部命主横幅 ──────────────────────────────────────────
function ArchiveHero({ user }: { user: Parameters<typeof MetaphysicsPanel>[0]["user"] }) {
  const ref = useRef<HTMLDivElement>(null);
  const chart = computeBazi(user?.birth ?? {});
  const tone = chart ? WX_META[chart.dayMasterWx] : WX_META["土"];

  useEffect(() => {
    if (!ref.current) return;
    gsap.fromTo(ref.current, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" });
  }, []);

  return (
    <header
      ref={ref}
      className="mystic-card mb-6 overflow-hidden px-5 py-5 sm:px-7 sm:py-6"
      style={{ boxShadow: `inset 0 1px 0 rgba(255,255,255,0.05), 0 0 70px ${tone.glow}18` }}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-40 blur-3xl" style={{ background: tone.glow }} />
      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.28em] text-amber-200/50">Personal Destiny Archive</div>
          <h1 className="font-mystic text-2xl font-semibold text-zinc-50 sm:text-3xl">档案 · 你的长期决策资产</h1>
          <p className="mt-1.5 font-mono text-[11px] text-zinc-500">命盘 · 推演 · 验证 · 修正——比任何人都了解你的决策模式</p>
        </div>
        {chart ? (
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center rounded-xl border border-amber-200/20 bg-black/40 px-4 py-2">
              <span className="font-mono text-[9px] text-zinc-500">日主</span>
              <span className="font-mystic text-xl font-bold" style={{ color: tone.color, textShadow: `0 0 14px ${tone.glow}` }}>
                {chart.dayStem}
              </span>
              <span className="text-[10px]" style={{ color: tone.color }}>{chart.dayMasterWx}命</span>
            </div>
            <div className="flex flex-col gap-1.5 text-[11px]">
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-zinc-300">生肖 {zodiacOf(user?.birth?.year ?? 2000)}</span>
              <span className="rounded-full border px-2.5 py-0.5" style={{ borderColor: `${tone.color}44`, color: tone.color }}>{chart.strength}</span>
              <span className="rounded-full border border-amber-200/30 bg-amber-300/5 px-2.5 py-0.5 text-amber-200/80">喜 {chart.favorable.join("")}</span>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-amber-200/20 bg-black/30 px-4 py-2 text-right">
            <div className="font-mono text-[10px] text-zinc-500">未排盘</div>
            <div className="text-[11px] text-amber-200/70">填写出生信息解锁命盘 →</div>
          </div>
        )}
      </div>
    </header>
  );
}

function Panel({ title, subtitle, children, className = "" }: { title: string; subtitle?: string; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    gsap.fromTo(ref.current,
      { opacity: 0, y: 18 },
      { opacity: 1, y: 0, duration: 0.55, ease: "power2.out", scrollTrigger: undefined }
    );
  }, []);
  return (
    <section ref={ref} className={`mystic-card flex min-w-0 flex-col p-4 sm:p-5 ${className}`}>
      {/* 暗金边角装饰 */}
      <span className="pointer-events-none absolute left-3 top-3 h-3 w-3 border-l border-t border-amber-200/30" />
      <span className="pointer-events-none absolute right-3 top-3 h-3 w-3 border-r border-t border-amber-200/30" />
      <div className="mb-3 flex items-baseline justify-between gap-2 sm:mb-4">
        <h2 className="font-mystic text-[15px] font-semibold tracking-wide text-zinc-100">{title}</h2>
        {subtitle && <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-amber-200/40">{subtitle}</span>}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </section>
  );
}

// ─── 命盘雷达 ───────────────────────────────────────────────
function RadarChart({ data }: { data: { id: string; name: string; value: number }[] }) {
  const polygonRef = useRef<SVGPolygonElement>(null);
  const n = data.length;
  const cx = 120; const cy = 120; const R = 88;
  const angle = (i: number) => (-90 + (i * 360) / n) * (Math.PI / 180);
  const pt = (i: number, r: number) => [cx + Math.cos(angle(i)) * r, cy + Math.sin(angle(i)) * r] as const;
  const rings = [0.25, 0.5, 0.75, 1];
  const valuePoly = data.map((d, i) => pt(i, R * (d.value / 100)).join(",")).join(" ");

  useEffect(() => {
    if (!polygonRef.current) return;
    gsap.fromTo(polygonRef.current,
      { scale: 0, transformOrigin: "50% 50%", opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.8, ease: "back.out(1.5)", delay: 0.3 }
    );
  }, [data]);

  const VAR_COLORS: Record<string, string> = {
    risk: "#f0556a", cashflow: "#34d399", freedom: "#a78bfa",
    relationship: "#6ea8ff", growth: "#e7c766", identity: "#f97316"
  };

  return (
    <div className="flex w-full flex-col items-center">
      <svg viewBox="0 0 240 240" className="block h-auto w-full max-w-[260px] overflow-visible sm:max-w-[280px] lg:max-w-[260px] xl:max-w-[240px]">
        {rings.map((rr, k) => (
          <polygon key={k} points={data.map((_, i) => pt(i, R * rr).join(",")).join(" ")} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={1} />
        ))}
        {data.map((_, i) => { const [x, y] = pt(i, R); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.07)" strokeWidth={1} />; })}
        <polygon ref={polygonRef} points={valuePoly} fill="rgba(245,200,90,0.14)" stroke="#f0c85a" strokeWidth={1.8} opacity={0} />
        {data.map((d, i) => {
          const [x, y] = pt(i, R * (d.value / 100));
          const color = VAR_COLORS[d.id] ?? "#f0c85a";
          return <circle key={i} cx={x} cy={y} r={4} fill={color} style={{ filter: `drop-shadow(0 0 4px ${color})` }} />;
        })}
        {data.map((d, i) => {
          const [x, y] = pt(i, R + 18);
          return <text key={i} x={x} y={y} fill="#6b7280" fontSize={9} textAnchor="middle" dominantBaseline="middle">{d.name.replace("权重", "")}</text>;
        })}
        <text x={cx} y={cy + 4} fill="rgba(255,255,255,0.18)" fontSize={22} textAnchor="middle" dominantBaseline="middle">命</text>
      </svg>
      <div className="mt-1 font-mono text-[10px] text-zinc-600">联动工作台变量 · 实时演化</div>
    </div>
  );
}

// ─── 命中率仪表盘 ─────────────────────────────────────────────
function HitRatePanel({ stats }: { stats: { verified: number; hit: number; deviation: number; miss: number; rate: number } }) {
  const arcRef = useRef<SVGCircleElement>(null);
  const R = 54; const C = 2 * Math.PI * R;
  useEffect(() => {
    if (!arcRef.current) return;
    gsap.fromTo(arcRef.current,
      { strokeDashoffset: C },
      { strokeDashoffset: C - (C * stats.rate) / 100, duration: 1.2, ease: "power2.out", delay: 0.4 }
    );
  }, [stats.rate, C]);

  const achievements = [
    { id: "first", label: "首次回填", done: stats.verified >= 1 },
    { id: "triple", label: "连续命中3次", done: stats.hit >= 3 },
    { id: "rate80", label: "命中率达80%", done: stats.rate >= 80 }
  ];

  return (
    <div className="w-full">
      <div className="mb-4 grid grid-cols-1 items-center justify-items-center gap-4 min-[460px]:grid-cols-[130px_minmax(0,1fr)]">
        <svg viewBox="0 0 130 130" className="h-[130px] w-[130px]">
          <circle cx={65} cy={65} r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={8} />
          <circle
            ref={arcRef}
            cx={65} cy={65} r={R}
            fill="none"
            stroke="url(#hitGrad)"
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C}
            transform="rotate(-90 65 65)"
          />
          <defs>
            <linearGradient id="hitGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>
          </defs>
          <text x={65} y={60} fill="#fde68a" fontSize={28} textAnchor="middle" dominantBaseline="middle" fontWeight="bold">{stats.rate}</text>
          <text x={65} y={82} fill="#6b7280" fontSize={10} textAnchor="middle">% 命中率</text>
        </svg>
        <div className="grid w-full min-w-0 grid-cols-3 gap-2 min-[460px]:grid-cols-1">
          <StatPill label="命中" value={stats.hit} color="#34d399" />
          <StatPill label="偏差" value={stats.deviation} color="#e7c766" />
          <StatPill label="错误" value={stats.miss} color="#f0556a" />
        </div>
      </div>
      <div className="grid gap-1.5 min-[520px]:grid-cols-3 lg:grid-cols-1 xl:grid-cols-1">
        {achievements.map((a) => (
          <div key={a.id} className="flex min-w-0 items-center gap-2 text-[11px]">
            <span className={`h-2.5 w-2.5 rounded-full ${a.done ? "bg-amber-400" : "bg-white/10"}`} />
            <span className={`min-w-0 truncate ${a.done ? "text-zinc-200" : "text-zinc-600"}`}>{a.label}</span>
            {a.done && <span className="ml-auto text-amber-400">✓</span>}
          </div>
        ))}
      </div>
      {stats.verified === 0 && <div className="mt-3 text-center text-[11px] text-zinc-700">去「推演」，回来回填结果开始积累命中率 →</div>}
    </div>
  );
}

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-lg border border-white/5 bg-white/[0.03] px-2 py-1.5 sm:px-3">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      <span className="min-w-0 truncate text-[11px] text-zinc-500">{label}</span>
      <span className="ml-auto font-mono text-sm" style={{ color }}>{value}</span>
    </div>
  );
}

// ─── 人生K线双图（大K线：一生阶段走势；事件K线：真实推演/回填走势）──────
function RealLifeKLine({ user }: { user: { birth?: { year?: number; month?: number; day?: number }; nickname?: string } | null }) {
  const [view, setView] = useState<"macro" | "event">("macro");
  const currentYear = new Date().getFullYear();
  const birthYear = user?.birth?.year ?? 1995;
  const currentAge = currentYear - birthYear + 1;
  const klineData = generateDemoKLine(birthYear, currentYear);

  return (
    <div>
      {/* 双图切换 */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 rounded-xl border border-white/10 bg-black/30 p-1">
          {([["macro", "人生大K线"], ["event", "事件K线"]] as const).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setView(k)}
              className="rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all"
              style={{
                background: view === k ? "rgba(240,200,90,0.14)" : "transparent",
                color: view === k ? "#f0c85a" : "#9ca3af",
                boxShadow: view === k ? "0 0 12px rgba(240,200,90,0.18)" : undefined,
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="font-mono text-[10px] text-zinc-600">
          {view === "macro"
            ? user?.birth?.year ? `${birthYear}年生 · 当前 ${currentAge} 岁 · 点击K线看流年` : "演示数据 · 填写出生年份后生成"
            : "由真实推演历史 + 回填结果生成"}
        </div>
      </div>

      {view === "macro" ? (
        <LifeKLineChart data={klineData} currentAge={currentAge} birthYear={birthYear} />
      ) : (
        <EventKLine />
      )}
    </div>
  );
}

// ─── 人生衍生品 ────────────────────────────────────────────────
function LifeDerivatives({ vars, scenario }: { vars: { id: string; name: string; value: number }[]; scenario: ReturnType<typeof useSharedScenario> }) {
  const varMap = Object.fromEntries(vars.map(v => [v.id, v.value]));

  // 根据当前变量配置自动生成"人生衍生品"建议
  const derivatives = [
    {
      type: "看涨期权",
      icon: "📈",
      color: "#34d399",
      name: "成长加速器",
      condition: `当 成长速度 ≥ ${Math.min(90, (varMap.growth ?? 50) + 8)}`,
      action: "加仓：投入更多时间到当前最高杠杆赛道",
      expiry: "90天验证窗",
      premium: varMap.growth > 70 ? "低风险" : "中风险"
    },
    {
      type: "保护性看跌",
      icon: "🛡️",
      color: "#6ea8ff",
      name: "现金流对冲",
      condition: `当 现金流 ≤ ${Math.max(20, (varMap.cashflow ?? 50) - 15)}`,
      action: "止损：触发备用方案，保护底仓",
      expiry: "30天预警",
      premium: varMap.cashflow > 60 ? "低溢价" : "高溢价"
    },
    {
      type: "跨式期权",
      icon: "⚡",
      color: "#a78bfa",
      name: "关系弹性",
      condition: `关系权重 波动超过 ±${Math.round((varMap.relationship ?? 50) * 0.22)} 时`,
      action: "双向布局：既防关系破裂，又抓破冰机会",
      expiry: scenario?.active ? "当前推演周期内" : "需先激活推演",
      premium: "中性"
    },
    {
      type: "时间锁定",
      icon: "⏳",
      color: "#e7c766",
      name: "窗口期期货",
      condition: `身份一致性 维持在 ${Math.max(40, (varMap.identity ?? 50) - 10)}~${Math.min(100, (varMap.identity ?? 50) + 10)}`,
      action: "锁定：在窗口期内执行已规划的高价值行动",
      expiry: "180天合约",
      premium: varMap.identity > 65 ? "溢价值得" : "谨慎入场"
    }
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="font-mono text-[10px] text-zinc-600">
        基于你的命盘变量自动生成 · 把人生决策当作可量化的衍生品合约
      </div>
      {derivatives.map((d, i) => (
        <DerivativeCard key={i} {...d} />
      ))}
    </div>
  );
}

function DerivativeCard({ type, icon, color, name, condition, action, expiry, premium }: {
  type: string; icon: string; color: string; name: string;
  condition: string; action: string; expiry: string; premium: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    gsap.fromTo(ref.current, { x: -12, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, ease: "power2.out", delay: 0.1 });
  }, []);

  return (
    <div
      ref={ref}
      className="group rounded-xl border px-4 py-3 transition-colors hover:border-opacity-60"
      style={{ borderColor: `${color}30`, background: `linear-gradient(135deg, ${color}08, transparent)` }}
    >
      <div className="mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <span className="text-xs font-medium text-zinc-100">{name}</span>
          <span className="rounded-full px-1.5 py-0.5 text-[10px]" style={{ background: `${color}20`, color }}>{type}</span>
        </div>
        <span className="font-mono text-[10px] text-zinc-600">{premium}</span>
      </div>
      <div className="mb-1 font-mono text-[10px] text-zinc-500">触发条件：{condition}</div>
      <div className="mb-1 text-[11px] text-zinc-300">→ {action}</div>
      <div className="font-mono text-[10px]" style={{ color: `${color}80` }}>到期：{expiry}</div>
    </div>
  );
}

// ─── 推演历史回填（深化：路径 + 理由 + 验证日期）────────────────────
const ARCHETYPE_ZH: Record<string, string> = {
  startup: "创业", marriage: "婚恋", house: "置业", "study-abroad": "留学",
  "job-change": "跳槽", "civil-service": "考公", generic: "通用"
};
const VERDICT_META: Record<Verdict, { label: string; color: string }> = {
  hit: { label: "命中", color: "#34d399" },
  deviation: { label: "偏差", color: "#e7c766" },
  miss: { label: "错误", color: "#f0556a" }
};
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function History({ items }: { items: HistoryItem[] }) {
  const backfills = useBackfills();
  const bfMap = new Map(backfills.map((b) => [b.resultId, b]));

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <div className="text-3xl opacity-20">◎</div>
        <div className="text-[12px] text-zinc-600">还没有推演记录。<br />去「推演」输入一个决策，记录会自动出现在这里。</div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2.5">
      {items.map((item) => (
        <HistoryRow key={item.id} item={item} backfill={bfMap.get(item.id)} />
      ))}
    </div>
  );
}

function HistoryRow({ item, backfill }: { item: HistoryItem; backfill?: Backfill }) {
  const [open, setOpen] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(backfill?.verdict ?? null);
  const [pathId, setPathId] = useState<string>(backfill?.chosenPathId ?? item.paths?.[0]?.id ?? "");
  const [note, setNote] = useState(backfill?.note ?? "");
  const [date, setDate] = useState(backfill?.verifyDate ?? "");

  const save = () => {
    if (!verdict) return;
    const pathName = item.paths?.find((p) => p.id === pathId)?.name ?? backfill?.chosenPathName;
    saveBackfill({
      resultId: item.id,
      topic: item.topic,
      chosenPathId: pathId || "chosen",
      chosenPathName: pathName,
      verdict,
      note: note.trim() || undefined,
      verifyDate: date || undefined,
      savedAt: Date.now()
    });
    setOpen(false);
  };

  const vm = backfill ? VERDICT_META[backfill.verdict] : null;

  return (
    <div className="rounded-xl border border-white/8 px-4 py-3" style={{ background: "rgba(255,255,255,0.02)" }}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm text-zinc-100">「{item.topic}」</div>
          <div className="mt-0.5 font-mono text-[10px] text-zinc-600">
            {ARCHETYPE_ZH[item.archetypeKey] ?? item.archetypeKey} · {item.verifiableByDays}天验证 · {new Date(item.savedAt).toLocaleDateString("zh-CN")}
          </div>
        </div>
        {vm && !open ? (
          <span className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px]" style={{ borderColor: `${vm.color}55`, color: vm.color, background: `${vm.color}12` }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: vm.color }} />
            {vm.label}
          </span>
        ) : (
          !open && (
            <button type="button" onClick={() => setOpen(true)} className="rounded-lg border border-amber-200/30 bg-amber-300/[0.06] px-2.5 py-1 text-[11px] text-amber-200/80 transition-colors hover:bg-amber-300/10">
              回填结果 →
            </button>
          )
        )}
      </div>

      {/* 已回填摘要（未展开时） */}
      {vm && !open && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/5 pt-2 font-mono text-[10px] text-zinc-500">
          {backfill?.chosenPathName && <span>实走：<span className="text-zinc-300">{backfill.chosenPathName}</span></span>}
          {backfill?.verifyDate && <span>验证：{backfill.verifyDate}</span>}
          {backfill?.note && <span className="min-w-0 flex-1 truncate">说明：{backfill.note}</span>}
          <button type="button" onClick={() => setOpen(true)} className="ml-auto text-amber-200/60 hover:text-amber-200">修改</button>
        </div>
      )}

      {/* 回填表单（展开时） */}
      {open && (
        <div className="mt-3 flex flex-col gap-3 border-t border-white/8 pt-3">
          {/* 1. 结果判定 */}
          <Field label="① 真实结果">
            <div className="flex gap-1.5">
              {(Object.keys(VERDICT_META) as Verdict[]).map((v) => {
                const m = VERDICT_META[v];
                const active = verdict === v;
                return (
                  <button key={v} type="button" onClick={() => setVerdict(v)}
                    className="rounded-lg border px-3 py-1.5 text-[12px] transition-all active:scale-95"
                    style={{ borderColor: active ? m.color : `${m.color}40`, color: m.color, background: active ? `${m.color}1f` : "transparent", boxShadow: active ? `0 0 12px ${m.color}33` : undefined }}>
                    {m.label}
                  </button>
                );
              })}
            </div>
          </Field>

          {/* 2. 实际走了哪条路径 */}
          {item.paths && item.paths.length > 0 && (
            <Field label="② 实际走了哪条路径">
              <div className="flex flex-wrap gap-1.5">
                {item.paths.map((p) => {
                  const active = pathId === p.id;
                  return (
                    <button key={p.id} type="button" onClick={() => setPathId(p.id)}
                      className="rounded-lg border px-2.5 py-1 text-[11px] transition-colors"
                      style={{ borderColor: active ? "rgba(110,168,255,0.6)" : "rgba(255,255,255,0.12)", color: active ? "#9ec5ff" : "#a1a1aa", background: active ? "rgba(110,168,255,0.12)" : "transparent" }}>
                      {p.name}
                    </button>
                  );
                })}
              </div>
            </Field>
          )}

          {/* 3. 验证日期 */}
          <Field label="③ 验证日期">
            <div className="flex items-center gap-2">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="rounded-lg border border-white/12 bg-black/30 px-2.5 py-1 text-[12px] text-zinc-200 outline-none [color-scheme:dark] focus:border-amber-200/40" />
              <button type="button" onClick={() => setDate(todayStr())} className="rounded-md border border-white/12 px-2 py-1 text-[10px] text-zinc-400 hover:text-zinc-200">今天</button>
            </div>
          </Field>

          {/* 4. 回填说明 / 偏差原因 */}
          <Field label="④ 回填说明 / 偏差原因">
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
              placeholder="发生了什么？与推演判断的差异在哪？下一轮要修正什么？"
              className="w-full resize-none rounded-lg border border-white/12 bg-black/30 px-2.5 py-1.5 text-[11px] text-zinc-200 outline-none placeholder:text-zinc-700 focus:border-amber-200/40" />
          </Field>

          <div className="flex items-center justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-3 py-1.5 text-[12px] text-zinc-500 hover:text-zinc-300">取消</button>
            <button type="button" onClick={save} disabled={!verdict}
              className="rounded-lg border border-amber-300/40 bg-amber-300/10 px-4 py-1.5 text-[12px] text-amber-200 transition-all hover:bg-amber-300/20 disabled:cursor-not-allowed disabled:opacity-40">
              保存回填
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-[11px] text-zinc-400">{label}</div>
      {children}
    </div>
  );
}
