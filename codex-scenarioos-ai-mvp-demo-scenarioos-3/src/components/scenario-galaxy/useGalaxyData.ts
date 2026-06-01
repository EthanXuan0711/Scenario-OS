// ScenarioGalaxy 数据与交互状态 hook
// 负责：选中 / 悬停 / 推演阶段 状态，以及邻接高亮、可见性、风险指数等派生数据。

import { useCallback, useMemo, useState } from "react";
import { coreNodeId, mainPathNodeIds, scenarioEdges, scenarioNodes } from "./galaxyMockData";
import type { ScenarioEdge, ScenarioNode } from "./galaxyTypes";
import { useSharedScenario } from "../scenarioBridge";
import { galaxyLabelsFor } from "../deriveScenario";

export type NodeVisualState = "selected" | "neighbor" | "dim" | "normal";

export type UseGalaxyData = {
  nodes: ScenarioNode[];
  edges: ScenarioEdge[];
  nodeMap: Map<string, ScenarioNode>;
  visibleNodeIds: Set<string>;
  visibleEdges: ScenarioEdge[];
  selectedId: string | null;
  hoveredId: string | null;
  selectedNode: ScenarioNode | null;
  neighborIds: Set<string>;
  activeEdgeIds: Set<string>;
  mainPathSet: Set<string>;
  stage: number;
  riskIndex: number;
  focusMode: boolean;
  select: (id: string) => void;
  toggleSelect: (id: string) => void;
  hover: (id: string | null) => void;
  clearSelection: () => void;
  setStage: (stage: number) => void;
  nodeStateOf: (id: string) => NodeVisualState;
  addScenario: (nodes: ScenarioNode[], edges: ScenarioEdge[]) => void;
};

export function useGalaxyData(): UseGalaxyData {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [stage, setStageState] = useState<number>(0);

  const scenario = useSharedScenario();
  const [addedNodes, setAddedNodes] = useState<ScenarioNode[]>([]);
  const [addedEdges, setAddedEdges] = useState<ScenarioEdge[]>([]);

  // 基础星球：共享场景激活时，按节点类型用推演原型标签池重贴标签（中心 = 议题）。
  const baseNodes = useMemo(() => {
    if (!scenario?.active) return scenarioNodes;
    const pools = galaxyLabelsFor(scenario.input, scenario.topic);
    const counters: Record<string, number> = {};
    return scenarioNodes.map((node) => {
      if (node.id === coreNodeId) return { ...node, label: scenario.topic || node.label };
      const pool = pools[node.type];
      if (!pool || pool.length === 0) return node;
      const index = counters[node.type] ?? 0;
      counters[node.type] = index + 1;
      return { ...node, label: pool[index % pool.length] };
    });
  }, [scenario]);

  const nodes = useMemo(() => [...baseNodes, ...addedNodes], [baseNodes, addedNodes]);
  const edges = useMemo(() => [...scenarioEdges, ...addedEdges], [addedEdges]);

  // 动态追加节点/连线（供聊天驾驶舱"输入生成星球"使用）
  const addScenario = useCallback((newNodes: ScenarioNode[], newEdges: ScenarioEdge[]) => {
    setAddedNodes((current) => [...current, ...newNodes]);
    setAddedEdges((current) => [...current, ...newEdges]);
  }, []);

  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const mainPathSet = useMemo(() => new Set(mainPathNodeIds), []);

  // 邻接表：id -> 相邻节点 id 集合
  const adjacency = useMemo(() => {
    const map = new Map<string, Set<string>>();
    edges.forEach((edge) => {
      if (!map.has(edge.source)) map.set(edge.source, new Set());
      if (!map.has(edge.target)) map.set(edge.target, new Set());
      map.get(edge.source)!.add(edge.target);
      map.get(edge.target)!.add(edge.source);
    });
    return map;
  }, [edges]);

  // 当前阶段可见的节点/连线（时间线分批出现）
  const visibleNodeIds = useMemo(() => {
    const set = new Set<string>();
    nodes.forEach((n) => {
      if (n.stage <= stage) set.add(n.id);
    });
    return set;
  }, [nodes, stage]);

  const visibleEdges = useMemo(
    () => edges.filter((e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)),
    [edges, visibleNodeIds]
  );

  // 高亮焦点：选中优先，其次悬停
  const highlightId = selectedId ?? hoveredId;

  const neighborIds = useMemo(() => {
    const set = new Set<string>();
    if (!highlightId) return set;
    set.add(highlightId);
    adjacency.get(highlightId)?.forEach((id) => set.add(id));
    return set;
  }, [adjacency, highlightId]);

  const activeEdgeIds = useMemo(() => {
    const set = new Set<string>();
    if (!highlightId) return set;
    edges.forEach((edge) => {
      if (edge.source === highlightId || edge.target === highlightId) set.add(edge.id);
    });
    return set;
  }, [edges, highlightId]);

  // 风险指数：可见风险节点中处于 risk/active 状态的占比（0..100）
  const riskIndex = useMemo(() => {
    const risks = nodes.filter((n) => n.type === "risk" && visibleNodeIds.has(n.id));
    let base = 0;
    if (risks.length > 0) {
      const hot = risks.filter((n) => n.status === "risk" || n.status === "active").length;
      const intensity = risks.reduce((sum, n) => sum + n.importance, 0) / risks.length;
      base = Math.round((hot / risks.length) * 70 + intensity * 30);
    }
    // 共享场景激活时，由工作台「风险」变量联动
    if (scenario?.active && scenario.variables) {
      base = Math.round(base * 0.4 + scenario.variables.risk * 0.6);
    }
    return Math.min(100, base);
  }, [nodes, visibleNodeIds, scenario]);

  const selectedNode = selectedId ? nodeMap.get(selectedId) ?? null : null;

  const select = useCallback((id: string) => setSelectedId(id), []);
  const toggleSelect = useCallback((id: string) => setSelectedId((cur) => (cur === id ? null : id)), []);
  const hover = useCallback((id: string | null) => setHoveredId(id), []);
  const clearSelection = useCallback(() => setSelectedId(null), []);
  const setStage = useCallback((next: number) => setStageState(Math.max(0, Math.min(3, next))), []);

  const nodeStateOf = useCallback(
    (id: string): NodeVisualState => {
      if (id === selectedId) return "selected";
      if (!highlightId) return "normal";
      if (neighborIds.has(id)) return "neighbor";
      return "dim";
    },
    [highlightId, neighborIds, selectedId]
  );

  return {
    nodes,
    edges,
    nodeMap,
    visibleNodeIds,
    visibleEdges,
    selectedId,
    hoveredId,
    selectedNode,
    neighborIds,
    activeEdgeIds,
    mainPathSet,
    stage,
    riskIndex,
    focusMode: selectedId !== null,
    select,
    toggleSelect,
    hover,
    clearSelection,
    setStage,
    nodeStateOf,
    addScenario
  };
}
