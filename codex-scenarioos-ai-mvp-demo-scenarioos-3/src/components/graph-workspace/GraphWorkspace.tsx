"use client";

// 图谱工作台总装：可折叠左轨（Vault）+ 中央 3D 星图（含底部图例）+ 可折叠右轨（数据）。
// 左/右独立收缩 → 中央自动变宽；双收 → 中央最大。左侧常驻 AI 推演抽屉（收缩后仍可用）。

import ElectronCloud3D from "../ElectronCloud3D";
import WorkspaceChatDrawer from "../WorkspaceChatDrawer";
import CollapsibleRail from "./CollapsibleRail";
import GraphLegend from "./GraphLegend";
import LeftRail from "./LeftRail";
import RightRail from "./RightRail";
import { useWorkspaceGraph } from "./useWorkspaceGraph";

function riskTone(value: number) {
  return value < 34 ? "#34d399" : value < 67 ? "#e7c766" : "#f0556a";
}

export default function GraphWorkspace() {
  const g = useWorkspaceGraph();

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[#04060e] font-sans text-zinc-200">
      <header className="flex items-center gap-3 border-b border-white/5 px-4 py-2.5">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400/70" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
        </span>
        <span className="text-sm font-medium text-zinc-100">ScenarioOS</span>
        <span className="hidden font-mono text-[11px] text-zinc-600 sm:inline">关系图谱工作台</span>
        <div className="ml-auto flex items-center gap-4 text-[11px]">
          <span className="hidden text-zinc-500 md:inline">
            节点 <span className="font-mono text-zinc-300">{g.nodes.length}</span>
          </span>
          <span className="hidden max-w-[160px] truncate text-zinc-500 lg:inline">
            当前 <span className="text-amber-200">{g.selectedNode.label}</span>
          </span>
          <span className="text-zinc-500">
            风险 <span className="font-mono" style={{ color: riskTone(g.riskIndex) }}>{g.riskIndex}</span>
          </span>
          <a href="/cockpit" className="rounded border border-white/10 px-2 py-1 text-zinc-400 transition-colors hover:border-amber-400/50 hover:text-amber-200">
            驾驶舱
          </a>
          <a href="/classic" className="rounded border border-white/10 px-2 py-1 text-zinc-400 transition-colors hover:border-amber-400/50 hover:text-amber-200">
            经典工作台
          </a>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <CollapsibleRail side="left" collapsed={g.leftCollapsed} onToggle={g.toggleLeft} title="图谱 Vault">
          <LeftRail
            query={g.query}
            onQuery={g.setQuery}
            nodes={g.listNodes}
            totalCount={g.nodes.length}
            selectedId={g.selectedId}
            onSelect={g.select}
          />
        </CollapsibleRail>

        <div className="relative min-w-0 flex-1 bg-[#030308]">
          <ElectronCloud3D
            nodes={g.nodes}
            edges={g.edges}
            selectedNodeId={g.selectedId}
            highlightedNodeIds={g.highlightedNodeIds}
            focusNodeIds={g.focusNodeIds}
            onNodeSelect={g.select}
            pulseSeed={g.nodes.length}
          />
          <GraphLegend />
        </div>

        <CollapsibleRail side="right" collapsed={g.rightCollapsed} onToggle={g.toggleRight} title="推演数据">
          <RightRail
            node={g.selectedNode}
            relatedEdges={g.relatedEdges}
            nodeMap={g.nodeMap}
            onSelect={g.select}
            variables={g.variables}
            decisionVariables={g.decisionVariables}
            scoredPaths={g.scoredPaths}
            survival={g.survival}
            riskIndex={g.riskIndex}
            onVariable={g.setVariable}
            onReset={g.resetVariables}
          />
        </CollapsibleRail>
      </div>

      <WorkspaceChatDrawer side="left" messages={g.messages} onSend={g.sendChat} />
    </div>
  );
}
