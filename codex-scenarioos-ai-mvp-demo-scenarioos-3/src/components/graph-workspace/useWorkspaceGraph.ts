"use client";

// 图谱工作台状态：选中 / 搜索 / 一度邻居 / 聚焦集 / 变量评分 / 左右折叠 / AI 增节点。
// 复用现有 graphNodes/graphEdges 与 cockpitSim 评分公式，渲染层解耦。

import { useCallback, useMemo, useState } from "react";
import { graphEdges, graphNodes } from "../../data/scenarioOS";
import type { DecisionVariable, ScenarioEdge, ScenarioNode } from "../../types";
import {
  clampPct,
  decisionVariables,
  defaultVariables,
  scorePaths,
  survivalScore,
  type VariableValues
} from "../cockpit/cockpitSim";

export function classifyNoteType(text: string): ScenarioNode["type"] {
  if (/(风险|危机|担心|亏|崩|监管|违规|失败|焦虑|压力|对手|竞争|裁员|纠纷)/.test(text)) return "risk";
  if (/(价值|意义|成长|自由|理想|增长|机会|愿景)/.test(text)) return "value";
  if (/(用户|客户|家人|朋友|老板|投资|团队|合伙|媒体|导师|粉丝)/.test(text)) return "person";
  if (/(公司|平台|组织|机构|部门|渠道|协会)/.test(text)) return "organization";
  if (/(选择|抉择|要不要|是否|决定|方向|取舍)/.test(text)) return "choice";
  if (/(行动|执行|计划|尝试|启动|落地|推进)/.test(text)) return "action";
  return "evidence";
}

export type ThreadMessage = { role: "user" | "system"; text: string };

export function useWorkspaceGraph() {
  const [customNodes, setCustomNodes] = useState<ScenarioNode[]>([]);
  const [customEdges, setCustomEdges] = useState<ScenarioEdge[]>([]);
  const [selectedId, setSelectedId] = useState<string>("choice");
  const [query, setQuery] = useState("");
  const [variables, setVariables] = useState<VariableValues>(defaultVariables);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [messages, setMessages] = useState<ThreadMessage[]>([
    { role: "system", text: "我是图谱推演助手。描述你的处境，我会在当前选中节点旁生成新节点并联动右侧评分。" }
  ]);

  const nodes = useMemo(() => [...graphNodes, ...customNodes], [customNodes]);
  const edges = useMemo(() => [...graphEdges, ...customEdges], [customEdges]);
  const nodeMap = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);

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

  const selectedNode = nodeMap.get(selectedId) ?? nodes[0];

  // 一度邻居（不含自身）
  const neighborIds = useMemo(() => {
    const set = new Set<string>();
    adjacency.get(selectedNode.id)?.forEach((id) => set.add(id));
    return set;
  }, [adjacency, selectedNode.id]);

  // 选中相关的边
  const relatedEdges = useMemo(
    () => edges.filter((edge) => edge.source === selectedNode.id || edge.target === selectedNode.id),
    [edges, selectedNode.id]
  );

  const normalizedQuery = query.trim().toLowerCase();
  const searchMatchIds = useMemo(() => {
    if (!normalizedQuery) return null;
    const ids = nodes
      .filter((node) => `${node.label} ${node.explanation} ${node.type}`.toLowerCase().includes(normalizedQuery))
      .map((node) => node.id);
    return new Set(ids);
  }, [nodes, normalizedQuery]);

  // 左侧列表：搜索时只显示匹配项
  const listNodes = useMemo(
    () => (searchMatchIds ? nodes.filter((node) => searchMatchIds.has(node.id)) : nodes),
    [nodes, searchMatchIds]
  );

  // 图谱高亮集与聚焦集：搜索优先（匹配高亮、非匹配压暗）；否则邻居高亮、无关压暗
  const searchActive = searchMatchIds !== null;
  const highlightedNodeIds = useMemo(
    () => (searchActive ? Array.from(searchMatchIds!) : Array.from(neighborIds)),
    [searchActive, searchMatchIds, neighborIds]
  );
  const focusNodeIds = useMemo(
    () => (searchActive ? Array.from(searchMatchIds!) : [selectedNode.id, ...Array.from(neighborIds)]),
    [searchActive, searchMatchIds, selectedNode.id, neighborIds]
  );

  const scoredPaths = useMemo(() => scorePaths(variables), [variables]);
  const survival = useMemo(() => survivalScore(variables), [variables]);

  const riskIndex = useMemo(() => {
    const risks = nodes.filter((node) => node.type === "risk");
    if (risks.length === 0) return 0;
    const weight = risks.reduce((sum, node) => sum + node.weight, 0) / risks.length;
    return Math.round(Math.min(100, weight + variables.risk * 0.2));
  }, [nodes, variables.risk]);

  const select = useCallback((id: string) => setSelectedId(id), []);
  const setVariable = useCallback((id: DecisionVariable["id"], value: number) => {
    setVariables((current) => ({ ...current, [id]: clampPct(value) }));
  }, []);
  const resetVariables = useCallback(() => setVariables(defaultVariables), []);
  const toggleLeft = useCallback(() => setLeftCollapsed((value) => !value), []);
  const toggleRight = useCallback(() => setRightCollapsed((value) => !value), []);

  const sendChat = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      setSelectedId((currentSel) => {
        const anchor = nodeMap.get(currentSel) ?? nodes[0];
        const type = classifyNoteType(trimmed);
        const id = `ai-${Date.now().toString(36)}`;
        const node: ScenarioNode = {
          id,
          type,
          label: trimmed.length > 16 ? `${trimmed.slice(0, 16)}…` : trimmed,
          shell: 2,
          weight: 54,
          confidence: "low",
          explanation: trimmed
        };
        const edge: ScenarioEdge = {
          source: anchor.id,
          target: id,
          relation: "influences",
          strength: 0.52,
          explanation: `AI 推演：从「${anchor.label}」延伸出的新判断。`
        };
        setCustomNodes((current) => [...current, node]);
        setCustomEdges((current) => [...current, edge]);
        if (type === "risk") setVariables((cur) => ({ ...cur, risk: clampPct(cur.risk + 8) }));
        else if (type === "value") setVariables((cur) => ({ ...cur, growth: clampPct(cur.growth + 6) }));
        setMessages((current) => [
          ...current,
          { role: "user", text: trimmed },
          { role: "system", text: `已把「${node.label}」接入图谱，与「${anchor.label}」建立联系，右侧评分已刷新。` }
        ]);
        return id;
      });
    },
    [nodeMap, nodes]
  );

  return {
    nodes,
    edges,
    nodeMap,
    selectedNode,
    selectedId,
    neighborIds,
    relatedEdges,
    query,
    setQuery,
    listNodes,
    searchActive,
    highlightedNodeIds,
    focusNodeIds,
    variables,
    decisionVariables,
    scoredPaths,
    survival,
    riskIndex,
    leftCollapsed,
    rightCollapsed,
    messages,
    select,
    setVariable,
    resetVariables,
    toggleLeft,
    toggleRight,
    sendChat
  };
}
