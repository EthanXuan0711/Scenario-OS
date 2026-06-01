"use client";

// 社会沙盘页：5 维度恒星系（布朗运动）→ 决策路径星系。
// 点击星球 → 详情卡（评分/权重/内容，随变量实时同步）；新增条件 → 生成新星球；与工作台共享同一份场景。

import { useEffect, useState, type FormEvent } from "react";
import dynamic from "next/dynamic";
import { addCondition, loadScenario, removeCondition, saveScenario, useSharedScenario } from "../scenarioBridge";
import { matchArchetypeKey } from "../deriveScenario";
import { classifyType } from "../cockpit/cockpitSim";
import { NODE_TYPE_META } from "./galaxyTypes";
import SandboxNodeCard from "./SandboxNodeCard";
import type { SandboxNode } from "./sandboxScoring";

const StarSystems3D = dynamic(() => import("./StarSystems3D"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-600">正在初始化恒星系…</div>
});

export default function ScenarioGalaxy() {
  const scenario = useSharedScenario();
  const [input, setInput] = useState("");
  const [topic, setTopic] = useState("");
  const [active, setActive] = useState(false);
  const [selected, setSelected] = useState<SandboxNode | null>(null);
  const [conditionInput, setConditionInput] = useState("");

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
    <div className="relative h-screen w-full select-none overflow-hidden bg-[#04060e] font-sans text-zinc-200">
      <StarSystems3D onSelect={setSelected} selectedId={selected?.id ?? null} />

      {/* 标题 */}
      <div className="pointer-events-none absolute left-6 top-5 z-20">
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-100">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400/70" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-400" />
          </span>
          ScenarioOS · 社会沙盘
        </div>
        <div className="mt-1.5 max-w-[70vw] pl-5 font-mono text-[11px] text-zinc-500">
          {active ? `决策路径星系：「${topic}」 · 点击节点查看评分/权重` : "5 维度恒星系（布朗运动）· 点击星球进入详情 / 输入决策重组"}
        </div>
      </div>

      {/* 条件面板 */}
      <div className="absolute left-6 top-[72px] z-20 w-[248px] max-w-[calc(100vw-3rem)] rounded-2xl border border-white/10 p-3 backdrop-blur-md" style={{ background: "rgba(10,12,24,0.6)" }}>
        <div className="mb-2 flex items-center justify-between text-[11px] text-zinc-400">
          <span>条件 · 新增即生成星球</span>
          <span className="font-mono text-zinc-600">{conditions.length}</span>
        </div>
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

      <a
        href="/"
        className="absolute right-6 top-5 z-20 rounded-full border border-white/10 px-4 py-2 text-xs text-zinc-400 backdrop-blur-md transition-colors hover:border-amber-400/50 hover:text-amber-200"
        style={{ background: "rgba(10,12,24,0.55)" }}
      >
        ← 返回工作台
      </a>

      {/* 节点详情卡 */}
      <SandboxNodeCard node={selected} variables={scenario?.variables ?? null} topic={scenario?.topic ?? topic} onClose={() => setSelected(null)} />

      {/* 推演输入 */}
      <form
        onSubmit={submit}
        className="absolute bottom-6 left-1/2 z-20 flex w-[min(620px,calc(100vw-40px))] -translate-x-1/2 items-center gap-2 rounded-2xl border border-white/12 px-3 py-2 backdrop-blur-md"
        style={{ background: "rgba(10,12,24,0.82)" }}
      >
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="输入你的决策 / 担忧，从 5 维度抽取人生节点重组为决策路径星系…"
          className="min-w-0 flex-1 bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
        />
        <button type="submit" className="rounded-lg bg-amber-500 px-4 py-1.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-amber-400">
          推演
        </button>
        <button type="button" onClick={restore} className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:text-zinc-200">
          还原
        </button>
      </form>
    </div>
  );
}
