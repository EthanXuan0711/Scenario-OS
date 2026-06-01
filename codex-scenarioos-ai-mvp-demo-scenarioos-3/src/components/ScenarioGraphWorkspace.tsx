"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CircleDot,
  FileText,
  GitBranch,
  Info,
  ListTree,
  Network,
  Orbit,
  PanelLeft,
  PanelRight,
  RotateCcw,
  Search
} from "lucide-react";
import { graphEdges, graphNodes, scenarioPaths } from "../data/scenarioOS";
import type { ScenarioEdge, ScenarioNode, ScenarioPath } from "../types";
import ElectronCloud3D from "./ElectronCloud3D";

const nodeTypeMeta: Record<ScenarioNode["type"], { label: string; color: string; muted: string }> = {
  action: { label: "行动", color: "#94a3b8", muted: "bg-slate-400" },
  choice: { label: "抉择", color: "#d8a23a", muted: "bg-amber-500" },
  evidence: { label: "证据", color: "#8b949e", muted: "bg-zinc-500" },
  organization: { label: "组织", color: "#7c8ea5", muted: "bg-blue-300" },
  path: { label: "路径", color: "#c3832d", muted: "bg-orange-500" },
  person: { label: "人物", color: "#b9c0ca", muted: "bg-zinc-300" },
  risk: { label: "风险", color: "#b85b5b", muted: "bg-red-500" },
  self: { label: "自我", color: "#e0be62", muted: "bg-yellow-400" },
  value: { label: "变量", color: "#6da987", muted: "bg-emerald-500" }
};

const relationMeta: Record<ScenarioEdge["relation"], { label: string; color: string }> = {
  conflicts: { label: "冲突", color: "#b85b5b" },
  constrains: { label: "约束", color: "#98754f" },
  influences: { label: "影响", color: "#72809a" },
  revises: { label: "修正", color: "#7b8fb2" },
  supports: { label: "支持", color: "#6da987" },
  triggers: { label: "触发", color: "#a1783f" },
  validates: { label: "验证", color: "#c3a860" }
};

const confidenceLabels: Record<ScenarioNode["confidence"], string> = {
  high: "高置信",
  medium: "中置信",
  low: "低置信"
};

const riskLabels: Record<ScenarioPath["riskLevel"], string> = {
  high: "高风险",
  medium: "中风险",
  low: "低风险"
};

const pathIdByNodeId: Record<string, ScenarioPath["id"]> = {
  "path-bold": "bold",
  "path-hybrid": "hybrid",
  "path-retreat": "retreat",
  "path-steady": "steady"
};

const nodeTypeOrder: ScenarioNode["type"][] = [
  "choice",
  "self",
  "person",
  "organization",
  "value",
  "risk",
  "path",
  "evidence",
  "action"
];

const relationOrder: ScenarioEdge["relation"][] = ["supports", "influences", "constrains", "conflicts", "triggers", "validates"];

function matchesQuery(node: ScenarioNode, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  const meta = nodeTypeMeta[node.type];
  return `${node.label} ${node.explanation} ${node.type} ${meta.label} ${node.confidence}`.toLowerCase().includes(normalized);
}

function relationLabel(relation: ScenarioEdge["relation"]) {
  return relationMeta[relation].label;
}

function otherNodeId(edge: ScenarioEdge, selectedNodeId: string) {
  return edge.source === selectedNodeId ? edge.target : edge.source;
}

export default function ScenarioGraphWorkspace() {
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState("choice");
  const [query, setQuery] = useState("");
  const [activePathId, setActivePathId] = useState<ScenarioPath["id"]>("hybrid");

  const selectedNode = useMemo(
    () => graphNodes.find((node) => node.id === selectedNodeId) ?? graphNodes[0],
    [selectedNodeId]
  );

  const activePath = useMemo(
    () => scenarioPaths.find((path) => path.id === activePathId) ?? scenarioPaths[0],
    [activePathId]
  );

  const filteredNodes = useMemo(
    () => graphNodes.filter((node) => matchesQuery(node, query)),
    [query]
  );

  const relatedEdges = useMemo(
    () => graphEdges.filter((edge) => edge.source === selectedNode.id || edge.target === selectedNode.id),
    [selectedNode.id]
  );

  const highlightedNodeIds = useMemo(
    () => Array.from(new Set(relatedEdges.flatMap((edge) => [edge.source, edge.target]))),
    [relatedEdges]
  );

  const incomingEdges = useMemo(
    () => graphEdges.filter((edge) => edge.target === selectedNode.id),
    [selectedNode.id]
  );

  const outgoingEdges = useMemo(
    () => graphEdges.filter((edge) => edge.source === selectedNode.id),
    [selectedNode.id]
  );

  const relatedPaths = useMemo(() => {
    const direct = scenarioPaths.filter((path) => path.relatedNodeIds.includes(selectedNode.id) || path.id === activePath.id);
    return direct.length ? direct : [activePath];
  }, [activePath, selectedNode.id]);

  const gridTemplateColumns = `${leftCollapsed ? "48px" : "320px"} minmax(0, 1fr) ${
    rightCollapsed ? "48px" : "360px"
  }`;

  const selectNode = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    const nextPathId = pathIdByNodeId[nodeId];
    if (nextPathId) setActivePathId(nextPathId);
  };

  const selectPath = (path: ScenarioPath) => {
    setActivePathId(path.id);
    if (path.relatedNodeIds[0]) setSelectedNodeId(path.relatedNodeIds[0]);
  };

  const resetView = () => {
    setSelectedNodeId("choice");
    setActivePathId("hybrid");
    setQuery("");
  };

  return (
    <div className="flex h-screen min-w-[980px] flex-col overflow-hidden bg-[#0b0d12] text-sm text-zinc-300">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-800/80 bg-[#11141b] px-3">
        <div className="flex min-w-0 items-center gap-2">
          <IconButton
            label={leftCollapsed ? "展开左侧列表" : "收缩左侧列表"}
            onClick={() => setLeftCollapsed((value) => !value)}
          >
            {leftCollapsed ? <PanelLeft size={17} /> : <ChevronLeft size={17} />}
          </IconButton>
          <div className="min-w-0 px-2">
            <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">ScenarioGraph</div>
            <h1 className="truncate text-sm font-medium text-zinc-100">{activePath.name} / {selectedNode.label}</h1>
          </div>
        </div>

        <label className="mx-4 flex h-9 w-[min(420px,38vw)] items-center gap-2 border border-zinc-800 bg-[#0c0f15] px-3 text-xs text-zinc-500">
          <Search size={15} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索节点、类型或证据..."
            className="min-w-0 flex-1 bg-transparent text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
          />
        </label>

        <div className="flex items-center gap-2">
          <IconButton label="重置图谱视图" onClick={resetView}>
            <RotateCcw size={16} />
          </IconButton>
          <Link
            href="/scenario-map"
            className="flex h-9 items-center gap-2 border border-zinc-800 px-3 text-xs text-zinc-400 transition-colors hover:border-amber-500/50 hover:text-amber-200"
          >
            <Orbit size={15} />
            社会沙盘
          </Link>
          <IconButton
            label={rightCollapsed ? "展开右侧详情" : "收缩右侧详情"}
            onClick={() => setRightCollapsed((value) => !value)}
          >
            {rightCollapsed ? <PanelRight size={17} /> : <ChevronRight size={17} />}
          </IconButton>
        </div>
      </header>

      <div
        className="grid min-h-0 flex-1 overflow-hidden transition-[grid-template-columns] duration-200 ease-out"
        style={{ gridTemplateColumns }}
      >
        <aside data-testid="left-panel" className="min-h-0 min-w-0 overflow-hidden border-r border-zinc-800/80 bg-[#0f1218]">
          {leftCollapsed ? (
            <RailButton label="展开列表" side="left" onClick={() => setLeftCollapsed(false)} />
          ) : (
            <LeftPanel
              activePath={activePath}
              filteredNodes={filteredNodes}
              query={query}
              selectedNodeId={selectedNode.id}
              onQuery={setQuery}
              onSelectNode={selectNode}
              onSelectPath={selectPath}
            />
          )}
        </aside>

        <main data-testid="graph-panel" className="flex min-h-0 min-w-0 overflow-hidden flex-col bg-[#11141b]">
          <section className="relative min-h-0 flex-1 overflow-hidden">
            <div className="absolute left-4 top-4 z-10 flex items-center gap-2 border border-zinc-800 bg-[#11141b]/95 px-3 py-2 text-xs text-zinc-500">
              <Network size={15} className="text-zinc-400" />
              <span>{graphNodes.length} nodes</span>
              <span className="h-3 w-px bg-zinc-800" />
              <span>{graphEdges.length} links</span>
              <span className="h-3 w-px bg-zinc-800" />
              <span>{relatedEdges.length} related</span>
            </div>
            <ElectronCloud3D
              nodes={graphNodes}
              edges={graphEdges}
              selectedNodeId={selectedNode.id}
              highlightedNodeIds={highlightedNodeIds}
              onNodeSelect={selectNode}
              pulseSeed={activePath.fitScore}
            />
          </section>
          <GraphLegend />
        </main>

        <aside data-testid="right-panel" className="min-h-0 min-w-0 overflow-hidden border-l border-zinc-800/80 bg-[#0f1218]">
          {rightCollapsed ? (
            <RailButton label="展开详情" side="right" onClick={() => setRightCollapsed(false)} />
          ) : (
            <RightPanel
              activePath={activePath}
              incomingEdges={incomingEdges}
              outgoingEdges={outgoingEdges}
              relatedPaths={relatedPaths}
              selectedNode={selectedNode}
              onSelectNode={selectNode}
            />
          )}
        </aside>
      </div>
    </div>
  );
}

function LeftPanel({
  activePath,
  filteredNodes,
  query,
  selectedNodeId,
  onQuery,
  onSelectNode,
  onSelectPath
}: {
  activePath: ScenarioPath;
  filteredNodes: ScenarioNode[];
  query: string;
  selectedNodeId: string;
  onQuery: (value: string) => void;
  onSelectNode: (nodeId: string) => void;
  onSelectPath: (path: ScenarioPath) => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-zinc-800/80 px-4 py-3">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ListTree size={16} className="text-zinc-400" />
            <h2 className="text-sm font-medium text-zinc-100">Scenario List</h2>
          </div>
          <span className="text-xs text-zinc-600">{filteredNodes.length}</span>
        </div>
        <label className="flex h-9 items-center gap-2 border border-zinc-800 bg-[#0b0d12] px-3 text-xs text-zinc-500">
          <Search size={14} />
          <input
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="过滤列表..."
            className="min-w-0 flex-1 bg-transparent text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
          />
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        <section className="mb-5">
          <div className="mb-2 flex items-center gap-2 px-1 text-xs font-medium uppercase tracking-[0.12em] text-zinc-600">
            <GitBranch size={13} />
            Paths
          </div>
          <div className="space-y-1">
            {scenarioPaths.map((path) => (
              <button
                key={path.id}
                type="button"
                onClick={() => onSelectPath(path)}
                className={`w-full border px-3 py-2 text-left transition-colors ${
                  activePath.id === path.id ? "border-amber-500/50 bg-amber-500/10" : "border-zinc-800/70 hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-xs text-zinc-100">{path.name}</span>
                  <span className="text-xs text-zinc-500">{path.fitScore}</span>
                </div>
                <div className="mt-2 h-1 bg-zinc-800">
                  <div className="h-full bg-amber-500/75" style={{ width: `${path.fitScore}%` }} />
                </div>
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-2 flex items-center gap-2 px-1 text-xs font-medium uppercase tracking-[0.12em] text-zinc-600">
            <FileText size={13} />
            Nodes
          </div>
          <div className="space-y-1">
            {filteredNodes.map((node) => (
              <button
                key={node.id}
                type="button"
                onClick={() => onSelectNode(node.id)}
                className={`w-full px-2 py-2 text-left transition-colors ${
                  selectedNodeId === node.id ? "bg-zinc-800/90 text-amber-100" : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs">{node.label}</span>
                  <span className="shrink-0 text-[10px] text-zinc-600">{nodeTypeMeta[node.type].label}</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function RightPanel({
  activePath,
  incomingEdges,
  outgoingEdges,
  relatedPaths,
  selectedNode,
  onSelectNode
}: {
  activePath: ScenarioPath;
  incomingEdges: ScenarioEdge[];
  outgoingEdges: ScenarioEdge[];
  relatedPaths: ScenarioPath[];
  selectedNode: ScenarioNode;
  onSelectNode: (nodeId: string) => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-zinc-800/80 px-4 py-3">
        <div className="mb-2 flex items-center gap-2 text-xs text-zinc-500">
          <Info size={15} />
          Node Detail
        </div>
        <h2 className="truncate text-lg font-medium text-zinc-100">{selectedNode.label}</h2>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <section className="border-b border-zinc-800/70 pb-4">
          <p className="text-sm leading-relaxed text-zinc-400">{selectedNode.explanation}</p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <DetailMetric label="类型" value={nodeTypeMeta[selectedNode.type].label} />
            <DetailMetric label="置信度" value={confidenceLabels[selectedNode.confidence]} />
            <DetailMetric label="权重" value={`${selectedNode.weight}%`} />
            <DetailMetric label="当前路径" value={activePath.name} />
          </div>
        </section>

        <section className="border-b border-zinc-800/70 py-4">
          <h3 className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-zinc-600">Incoming Links</h3>
          <EdgeList edges={incomingEdges} selectedNodeId={selectedNode.id} onSelectNode={onSelectNode} />
        </section>

        <section className="border-b border-zinc-800/70 py-4">
          <h3 className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-zinc-600">Outgoing Links</h3>
          <EdgeList edges={outgoingEdges} selectedNodeId={selectedNode.id} onSelectNode={onSelectNode} />
        </section>

        <section className="py-4">
          <h3 className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-zinc-600">Related Paths</h3>
          <div className="space-y-3">
            {relatedPaths.map((path) => (
              <article key={path.id} className="border border-zinc-800/70 px-3 py-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h4 className="text-sm font-medium text-zinc-100">{path.name}</h4>
                  <span className="text-xs text-zinc-500">{riskLabels[path.riskLevel]}</span>
                </div>
                <p className="text-xs leading-relaxed text-zinc-500">{path.coreLogic}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function EdgeList({
  edges,
  selectedNodeId,
  onSelectNode
}: {
  edges: ScenarioEdge[];
  selectedNodeId: string;
  onSelectNode: (nodeId: string) => void;
}) {
  if (edges.length === 0) return <p className="text-xs text-zinc-600">暂无链接。</p>;

  return (
    <div className="space-y-2">
      {edges.map((edge) => {
        const targetId = otherNodeId(edge, selectedNodeId);
        const targetNode = graphNodes.find((node) => node.id === targetId);
        if (!targetNode) return null;
        return (
          <button
            key={`${edge.source}-${edge.target}-${edge.relation}`}
            type="button"
            onClick={() => onSelectNode(targetNode.id)}
            className="w-full border border-zinc-800/70 px-3 py-2 text-left transition-colors hover:border-zinc-600"
          >
            <div className="mb-1 flex items-center justify-between gap-3 text-xs">
              <span className="truncate text-zinc-200">{targetNode.label}</span>
              <span className="shrink-0 text-zinc-600">{relationLabel(edge.relation)} · {Math.round(edge.strength * 100)}%</span>
            </div>
            <p className="text-xs leading-relaxed text-zinc-500">{edge.explanation}</p>
          </button>
        );
      })}
    </div>
  );
}

function GraphLegend() {
  const shownTypes = nodeTypeOrder.filter((type) => graphNodes.some((node) => node.type === type));
  const shownRelations = relationOrder.filter((relation) => graphEdges.some((edge) => edge.relation === relation));

  return (
    <footer className="flex h-[54px] shrink-0 flex-col justify-center gap-1 overflow-hidden border-t border-zinc-800/80 bg-[#11141b] px-4 text-[11px] text-zinc-500">
      <div className="flex items-center gap-2 whitespace-nowrap">
        <span className="shrink-0 text-zinc-600">Nodes</span>
        {shownTypes.map((type) => (
          <span key={type} className="flex shrink-0 items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-full ${nodeTypeMeta[type].muted}`} />
            {nodeTypeMeta[type].label}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2 whitespace-nowrap">
        <span className="shrink-0 text-zinc-600">Links</span>
        {shownRelations.map((relation) => (
          <span key={relation} className="flex shrink-0 items-center gap-1.5">
            <span className="h-px w-5" style={{ background: relationMeta[relation].color }} />
            {relationMeta[relation].label}
          </span>
        ))}
        <span className="flex shrink-0 items-center gap-1.5">
          <CircleDot size={12} className="text-amber-400" />
          选中 / 一度关联
        </span>
      </div>
    </footer>
  );
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-1 text-[11px] uppercase tracking-[0.12em] text-zinc-600">{label}</div>
      <div className="text-sm text-zinc-200">{value}</div>
    </div>
  );
}

function RailButton({ label, side, onClick }: { label: string; side: "left" | "right"; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-full w-full flex-col items-center justify-start gap-3 px-2 py-4 text-zinc-500 transition-colors hover:bg-zinc-900/60 hover:text-zinc-200"
      aria-label={label}
      title={label}
    >
      {side === "left" ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
      {side === "left" ? <ListTree size={16} /> : <Info size={16} />}
      <span className="[writing-mode:vertical-rl] text-[10px] uppercase tracking-[0.22em]">{side === "left" ? "List" : "Detail"}</span>
    </button>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center border border-zinc-800 text-zinc-500 transition-colors hover:border-zinc-600 hover:text-zinc-200"
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}
