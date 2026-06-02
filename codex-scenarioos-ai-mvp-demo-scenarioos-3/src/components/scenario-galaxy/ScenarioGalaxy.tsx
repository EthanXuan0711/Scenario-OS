"use client";

// 社会沙盘页：银河（均匀打散 + 平滑漂移）→ 决策路径。
// 默认元素独立漂移；输入决策 → 相关元素飞出汇聚成一条带连线的路径。
// 点击星球 → 详情卡（评分/权重/内容，随变量同步）；新增条件 → 生成新星球；与工作台共享场景。

import { useEffect, useState, type FormEvent } from "react";
import dynamic from "next/dynamic";
import { addCondition, loadScenario, removeCondition, saveScenario, useSharedScenario } from "../scenarioBridge";
import { matchArchetypeKey } from "../deriveScenario";
import { classifyType } from "../cockpit/cockpitSim";
import { runDeduction, saveDeduction, type DeductionResult } from "../deduction";
import { NODE_TYPE_META } from "./galaxyTypes";
import SandboxNodeCard from "./SandboxNodeCard";
import DeductionTheater from "./DeductionTheater";
import DeductionResultPanel from "./DeductionResult";
import type { SandboxNode } from "./sandboxScoring";

const StarSystems3D = dynamic(() => import("./StarSystems3D"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-600">正在初始化银河…</div>
});

export default function ScenarioGalaxy() {
  const scenario = useSharedScenario();
  const [input, setInput] = useState("");
  const [topic, setTopic] = useState("");
  const [active, setActive] = useState(false);
  const [selected, setSelected] = useState<SandboxNode | null>(null);
  const [conditionInput, setConditionInput] = useState("");
  const [condCollapsed, setCondCollapsed] = useState(false);
  const [theater, setTheater] = useState(false);
  const [deductionResult, setDeductionResult] = useState<DeductionResult | null>(null);

  useEffect(() => {
    const shared = loadScenario();
    if (shared?.active) {
      setActive(true);
      setTopic(shared.topic);
    }
  }, []);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    const tp = trimmed.length > 12 ? `${trimmed.slice(0, 12)}…` : trimmed;
    const current = loadScenario();
    saveScenario({
      active: true,
      topic: tp,
      input: trimmed,
      archetypeKey: matchArchetypeKey(trimmed),
      variables: current?.variables ?? null,
      conditions: current?.conditions ?? []
    });
    setActive(true);
    setTopic(tp);
    setInput("");
    setTheater(true);
    // 跑推演 → 写历史 → 展示结果面板（后端就绪后 runDeduction 自动改走 /api/deduce）
    runDeduction({
      text: trimmed,
      topic: tp,
      variables: current?.variables ?? null,
      conditions: (current?.conditions ?? []).map((c) => c.label)
    })
      .then((result) => {
        saveDeduction(result);
        setDeductionResult(result);
      })
      .catch(() => {});
  };

  const restore = () => {
    const current = loadScenario();
    saveScenario({ active: false, topic: "", input: "", archetypeKey: "generic", variables: current?.variables ?? null, conditions: current?.conditions ?? [] });
    setActive(false);
    setTopic("");
    setSelected(null);
  };

  const addCond = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = conditionInput.trim();
    if (!trimmed) return;
    addCondition(trimmed, classifyType(trimmed));
    setConditionInput("");
  };

  const conditions = scenario?.conditions ?? [];

  return (
    <div className="relative mt-11 h-[calc(100dvh-2.75rem)] min-h-[640px] w-full select-none overflow-hidden bg-[#04050c] font-sans text-zinc-200">
      <StarSystems3D onSelect={setSelected} selectedId={selected?.id ?? null} />

      <DeductionTheater playing={theater} topic={topic} onDone={() => setTheater(false)} />

      {/* 标题 */}
      <div className="pointer-events-none absolute left-6 top-14 z-20">
        <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.24em] text-amber-200/45">Deduction Galaxy</div>
        <div className="flex items-center gap-2 font-mystic text-lg font-semibold text-zinc-50">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400/70" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-400" style={{ boxShadow: "0 0 10px rgba(240,200,90,0.7)" }} />
          </span>
          推演 · 决策星系
        </div>
        <div className="mt-1.5 max-w-[70vw] pl-5 font-mono text-[11px] text-zinc-500">
          {active ? `决策路径：「${topic}」 · 点击节点看评分/权重` : "银河 · 元素独立漂移 · 点击星球看详情 / 输入决策汇聚成路径"}
        </div>
      </div>

      {/* 条件面板（可折叠） */}
      <div className="mystic-card absolute left-6 top-[124px] z-20 w-[248px] max-w-[calc(100vw-3rem)] p-3">
        <span className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-amber-200/35 to-transparent" />
        <button type="button" onClick={() => setCondCollapsed((v) => !v)} className="flex w-full items-center justify-between text-[11px] text-zinc-300 transition-colors hover:text-amber-200">
          <span className="flex items-center gap-1.5"><span className="text-amber-300/70">✦</span> 条件 · 新增即生成星球</span>
          <span className="flex items-center gap-2">
            <span className="font-mono text-zinc-600">{conditions.length}</span>
            <span className={`inline-block transition-transform duration-200 ${condCollapsed ? "" : "rotate-90"}`}>▸</span>
          </span>
        </button>
        {!condCollapsed && (
          <div className="mt-2.5">
            {conditions.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {conditions.map((c) => {
                  const meta = NODE_TYPE_META[c.type as keyof typeof NODE_TYPE_META] ?? NODE_TYPE_META.event;
                  return (
                    <span key={c.id} className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]" style={{ borderColor: `${meta.color}55`, color: meta.color, background: `${meta.color}12` }}>
                      {c.label}
                      <button type="button" onClick={() => removeCondition(c.id)} className="text-zinc-500 hover:text-zinc-200" aria-label="移除条件">
                        ✕
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
            <form onSubmit={addCond} className="flex items-center gap-1.5">
              <input
                value={conditionInput}
                onChange={(event) => setConditionInput(event.target.value)}
                placeholder="新增一个条件…"
                className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-2.5 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-amber-400/50 focus:outline-none"
              />
              <button type="submit" className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-zinc-300 transition-colors hover:border-amber-400/50 hover:text-amber-200">
                ＋
              </button>
            </form>
          </div>
        )}
      </div>

      {/* 节点详情卡 */}
      <SandboxNodeCard node={selected} variables={scenario?.variables ?? null} topic={scenario?.topic ?? topic} onClose={() => setSelected(null)} />

      {/* 推演结果面板 */}
      <DeductionResultPanel result={deductionResult} onClose={() => setDeductionResult(null)} />

      {/* 推演输入 */}
      <form
        onSubmit={submit}
        className="absolute bottom-6 left-1/2 z-20 flex w-[min(620px,calc(100vw-40px))] -translate-x-1/2 items-center gap-2 overflow-hidden rounded-2xl px-3 py-2 backdrop-blur-md"
        style={{ background: "rgba(10,8,22,0.85)", border: "1px solid rgba(253,230,138,0.18)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), 0 16px 44px -20px rgba(0,0,0,0.8)" }}
      >
        <span className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-amber-200/40 to-transparent" />
        <span className="pl-1 text-amber-300/60">✦</span>
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="输入你的决策 / 担忧，相关元素将飞出汇聚成一条决策路径…"
          className="min-w-0 flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-lg px-5 py-1.5 text-sm font-semibold text-zinc-950 transition-all hover:brightness-110 active:scale-95"
          style={{ background: "linear-gradient(135deg, #f5d77a, #e7c766)", boxShadow: "0 0 18px rgba(231,199,102,0.4)" }}
        >
          推演
        </button>
        <button type="button" onClick={restore} className="rounded-lg border border-white/12 px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:border-white/25 hover:text-zinc-200">
          还原
        </button>
      </form>
    </div>
  );
}
