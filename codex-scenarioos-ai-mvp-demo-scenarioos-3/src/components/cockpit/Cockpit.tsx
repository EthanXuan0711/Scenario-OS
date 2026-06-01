"use client";

// ScenarioOS 决策推演驾驶舱：左 AI 聊天 + 中 3D 星系 + 右数据，三栏皆为隐式框。
// 聊天输入 → 生成星球 + 联动变量/评分 + 镜头飞向新节点，形成一体化推演闭环。

import dynamic from "next/dynamic";
import { Orbit } from "lucide-react";
import ChatPanel from "./ChatPanel";
import DataPanel from "./DataPanel";
import { useCockpit } from "./useCockpit";

const Galaxy3D = dynamic(() => import("../scenario-galaxy/Galaxy3D"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-600">正在初始化 3D 星系…</div>
  )
});

function riskTone(value: number) {
  return value < 34 ? "#34d399" : value < 67 ? "#e7c766" : "#f0556a";
}

export default function Cockpit() {
  const cockpit = useCockpit();
  const { galaxy } = cockpit;
  const neighborCount = galaxy.selectedNode ? Math.max(0, galaxy.neighborIds.size - 1) : 0;

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[#04060e] font-sans text-zinc-200">
      <header className="flex items-center gap-3 border-b border-white/5 px-4 py-2.5">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400/70" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
        </span>
        <span className="text-sm font-medium text-zinc-100">ScenarioOS</span>
        <span className="hidden font-mono text-[11px] text-zinc-600 sm:inline">社会沙盘 · 决策推演驾驶舱</span>
        <div className="ml-auto flex items-center gap-4 text-[11px]">
          <span className="hidden text-zinc-500 md:inline">
            星球 <span className="font-mono text-zinc-300">{galaxy.visibleNodeIds.size}</span>
          </span>
          <span className="hidden text-zinc-500 md:inline">
            连线 <span className="font-mono text-zinc-300">{galaxy.visibleEdges.length}</span>
          </span>
          <span className="text-zinc-500">
            风险 <span className="font-mono" style={{ color: riskTone(galaxy.riskIndex) }}>{galaxy.riskIndex}</span>
          </span>
          <a
            href="/scenario-map"
            className="flex items-center gap-1 rounded border border-white/10 px-2.5 py-1 text-zinc-400 transition-colors hover:border-amber-400/50 hover:text-amber-200"
          >
            <Orbit size={12} />
            全屏演示
          </a>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="w-[340px] min-w-[280px] shrink-0">
          <ChatPanel messages={cockpit.messages} notes={cockpit.notes} scoredPaths={cockpit.scoredPaths} onSend={cockpit.send} />
        </div>

        <div className="relative min-w-0 flex-1">
          <Galaxy3D data={galaxy} />
          <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 text-center font-mono text-[11px] text-zinc-600">
            拖拽旋转 · 滚轮缩放 · 点击星球聚焦
          </div>
        </div>

        <div className="w-[320px] min-w-[260px] shrink-0">
          <DataPanel
            selectedNode={galaxy.selectedNode}
            neighborCount={neighborCount}
            riskIndex={galaxy.riskIndex}
            survival={cockpit.survival}
            scoredPaths={cockpit.scoredPaths}
            variables={cockpit.variables}
            decisionVariables={cockpit.decisionVariables}
            onVariable={cockpit.setVariable}
            onReset={cockpit.resetVariables}
            onClearSelection={galaxy.clearSelection}
          />
        </div>
      </div>
    </div>
  );
}
