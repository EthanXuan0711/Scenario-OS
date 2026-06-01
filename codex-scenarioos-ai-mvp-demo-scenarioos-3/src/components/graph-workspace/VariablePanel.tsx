"use client";

// 右侧变量评分面板：变量滑块经函数公式联动路径评分 / 生存概率（自行变化）。

import { RotateCcw } from "lucide-react";
import type { DecisionVariable } from "../../types";
import type { ScoredPath, VariableValues } from "../cockpit/cockpitSim";

type Props = {
  variables: VariableValues;
  decisionVariables: DecisionVariable[];
  scoredPaths: ScoredPath[];
  survival: number;
  riskIndex: number;
  onVariable: (id: DecisionVariable["id"], value: number) => void;
  onReset: () => void;
};

function riskTone(value: number) {
  return value < 34 ? "#34d399" : value < 67 ? "#e7c766" : "#f0556a";
}

export default function VariablePanel({ variables, decisionVariables, scoredPaths, survival, riskIndex, onVariable, onReset }: Props) {
  const top = scoredPaths[0];

  return (
    <div>
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
              <div className="h-1 overflow-hidden rounded-full bg-white/10">
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
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1 text-[11px] text-zinc-500 transition-colors hover:text-amber-200"
          >
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
    </div>
  );
}

function Metric({ label, value, tone, small }: { label: string; value: string; tone: string; small?: boolean }) {
  return (
    <div className="bg-[#08080f] px-2 py-2.5 text-center">
      <div className="mb-0.5 text-[10px] text-zinc-600">{label}</div>
      <div className={`font-mono ${small ? "text-xs" : "text-sm"}`} style={{ color: tone }}>
        {value}
      </div>
    </div>
  );
}
