"use client";

// 右侧数据面板（隐式框）：选中节点内联详情 + 关键指标 + 路径评分 + 决策变量滑块。
// 变量由聊天自动联动，也可手动拖动；评分经函数公式实时刷新。

import { RotateCcw, X } from "lucide-react";
import { NODE_STATUS_META, NODE_TYPE_META, type ScenarioNode } from "../scenario-galaxy/galaxyTypes";
import type { ScoredPath, VariableValues } from "./cockpitSim";
import type { DecisionVariable } from "../../types";

type Props = {
  selectedNode: ScenarioNode | null;
  neighborCount: number;
  riskIndex: number;
  survival: number;
  scoredPaths: ScoredPath[];
  variables: VariableValues;
  decisionVariables: DecisionVariable[];
  onVariable: (id: DecisionVariable["id"], value: number) => void;
  onReset: () => void;
  onClearSelection: () => void;
};

function riskTone(value: number) {
  return value < 34 ? "#34d399" : value < 67 ? "#e7c766" : "#f0556a";
}

export default function DataPanel({
  selectedNode,
  neighborCount,
  riskIndex,
  survival,
  scoredPaths,
  variables,
  decisionVariables,
  onVariable,
  onReset,
  onClearSelection
}: Props) {
  const top = scoredPaths[0];

  return (
    <aside className="flex h-full w-full flex-col overflow-y-auto border-l border-white/5 bg-[#08080f]">
      <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        <span className="text-sm font-medium text-zinc-100">推演数据</span>
      </div>

      {selectedNode && (
        <div className="border-b border-white/5 px-4 py-3">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: NODE_TYPE_META[selectedNode.type].color }} />
            <span className="text-[11px] text-zinc-500">
              {NODE_TYPE_META[selectedNode.type].label} · {NODE_STATUS_META[selectedNode.status].label}
            </span>
            <button onClick={onClearSelection} className="ml-auto text-zinc-600 transition-colors hover:text-zinc-300" aria-label="取消选中">
              <X size={13} />
            </button>
          </div>
          <div className="mb-1 text-base text-zinc-100">{selectedNode.label}</div>
          <p className="mb-2 text-xs leading-relaxed text-zinc-500">{selectedNode.description}</p>
          <div className="flex gap-4 text-[11px] text-zinc-500">
            <span>
              重要度 <span className="font-mono text-zinc-300">{Math.round(selectedNode.importance * 100)}%</span>
            </span>
            <span>
              关联 <span className="font-mono text-zinc-300">{neighborCount}</span>
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-px border-b border-white/5 bg-white/5">
        <Metric label="生存概率" value={`${survival}%`} tone="#34d399" />
        <Metric label="风险指数" value={`${riskIndex}`} tone={riskTone(riskIndex)} />
        <Metric label="首选路径" value={top?.name ?? "—"} tone="#e7c766" small />
      </div>

      <div className="border-b border-white/5 px-4 py-3">
        <div className="mb-2 text-[11px] uppercase tracking-wider text-zinc-600">路径评分</div>
        <div className="space-y-2">
          {scoredPaths.map((path, index) => (
            <div key={path.id}>
              <div className="mb-1 flex justify-between text-xs">
                <span className={index === 0 ? "text-amber-200" : "text-zinc-400"}>{path.name}</span>
                <span className="font-mono text-zinc-300">{path.score}</span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${path.score}%`, background: index === 0 ? "#e7c766" : "rgba(231,199,102,0.45)" }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 py-3">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wider text-zinc-600">决策变量</span>
          <button onClick={onReset} className="flex items-center gap-1 text-[11px] text-zinc-500 transition-colors hover:text-amber-200">
            <RotateCcw size={11} />
            重置
          </button>
        </div>
        <div className="space-y-3.5">
          {decisionVariables.map((variable) => (
            <label key={variable.id} className="block">
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-zinc-400">{variable.name}</span>
                <span className="font-mono text-zinc-300">{variables[variable.id]}</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={variables[variable.id]}
                onChange={(event) => onVariable(variable.id, Number(event.target.value))}
                className="w-full accent-amber-500"
              />
              <div className="mt-0.5 flex justify-between text-[10px] text-zinc-600">
                <span>{variable.lowLabel}</span>
                <span>{variable.highLabel}</span>
              </div>
            </label>
          ))}
        </div>
      </div>
    </aside>
  );
}

function Metric({ label, value, tone, small }: { label: string; value: string; tone: string; small?: boolean }) {
  return (
    <div className="bg-[#08080f] px-3 py-2.5 text-center">
      <div className="mb-0.5 text-[10px] text-zinc-600">{label}</div>
      <div className={`font-mono ${small ? "text-xs" : "text-sm"}`} style={{ color: tone }}>
        {value}
      </div>
    </div>
  );
}
