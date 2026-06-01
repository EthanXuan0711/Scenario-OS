"use client";

// React Flow 图编辑器：自定义节点 + 正交(smoothstep)连线 + 网格背景 + MiniMap + Controls。
// 关键：用 SizeGate 确保容器有非 0 尺寸时才挂载 ReactFlow（避免 error#004：parent needs width/height，
// 否则连线依赖的视口变换无法建立、边渲染不出来）。状态用 useNodesState/useEdgesState 保证节点被测量。

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Edge,
  type NodeMouseHandler
} from "@xyflow/react";
import type { ScenarioEdge, ScenarioNode } from "../../types";
import { NODE_META } from "../graph-workspace/workspaceNodeMeta";
import ScenarioNodeCard, { type ScenarioFlowNode, type ScenarioNodeData } from "./ScenarioNodeCard";
import { computeFlowLayout } from "./flowLayout";

const nodeTypes = { scenario: ScenarioNodeCard };

type Props = {
  nodes: ScenarioNode[];
  edges: ScenarioEdge[];
  selectedId: string;
  highlightedIds: string[];
  focusIds: string[];
  onSelect: (id: string) => void;
};

export default function ScenarioFlow(props: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  // 测量容器显式像素尺寸；仅当非 0 时挂载 ReactFlow，并套固定尺寸 div，避免 error#004。
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      setSize({ w: Math.round(rect.width), h: Math.round(rect.height) });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const ready = size.w > 1 && size.h > 1;

  return (
    <div ref={wrapRef} className="h-full w-full">
      {ready && (
        <div style={{ width: size.w, height: size.h }}>
          <FlowInner {...props} />
        </div>
      )}
    </div>
  );
}

function FlowInner({ nodes, edges, selectedId, highlightedIds, focusIds, onSelect }: Props) {
  const positions = useMemo(() => computeFlowLayout(nodes), [nodes]);
  const highlightSet = useMemo(() => new Set(highlightedIds), [highlightedIds]);
  const focusSet = useMemo(() => new Set(focusIds), [focusIds]);

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<ScenarioFlowNode>([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    setRfNodes((previous) => {
      const previousById = new Map(previous.map((node) => [node.id, node]));
      return nodes.map((node) => {
        const existing = previousById.get(node.id);
        const position = existing?.position ?? positions.get(node.id) ?? { x: 0, y: 0 };
        const dimmed = focusSet.size > 0 && !focusSet.has(node.id) && node.id !== selectedId;
        return {
          ...(existing ?? {}),
          id: node.id,
          type: "scenario" as const,
          position,
          selected: node.id === selectedId,
          data: { node, highlighted: highlightSet.has(node.id), dimmed }
        };
      });
    });
  }, [nodes, positions, selectedId, highlightSet, focusSet, setRfNodes]);

  useEffect(() => {
    setRfEdges(
      edges.map((edge) => {
        const active = edge.source === selectedId || edge.target === selectedId;
        const related = highlightSet.has(edge.source) || highlightSet.has(edge.target);
        const dimmed = focusSet.size > 0 && !focusSet.has(edge.source) && !focusSet.has(edge.target);
        return {
          id: `${edge.source}__${edge.target}`,
          source: edge.source,
          target: edge.target,
          type: "smoothstep",
          animated: active,
          style: {
            stroke: active ? "#e7c766" : related ? "#7c6f3c" : "#3a3a46",
            strokeWidth: active ? 2.2 : 1,
            opacity: dimmed ? 0.12 : active ? 0.95 : related ? 0.6 : 0.32
          }
        };
      })
    );
  }, [edges, selectedId, highlightSet, focusSet, setRfEdges]);

  const onNodeClick: NodeMouseHandler<ScenarioFlowNode> = (_, node) => onSelect(node.id);

  return (
    <ReactFlow<ScenarioFlowNode>
      nodes={rfNodes}
      edges={rfEdges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      onNodeClick={onNodeClick}
      fitView
      fitViewOptions={{ padding: 0.25 }}
      minZoom={0.12}
      maxZoom={2.5}
      nodesDraggable
      nodesConnectable={false}
      elementsSelectable
      proOptions={{ hideAttribution: true }}
      colorMode="dark"
    >
      <Background variant={BackgroundVariant.Dots} gap={26} size={1} color="#23232c" />
      <Controls position="top-left" showInteractive={false} />
      <MiniMap
        position="bottom-right"
        pannable
        zoomable
        nodeColor={(node) => NODE_META[(node.data as ScenarioNodeData).node.type].color}
        maskColor="rgba(3,3,8,0.66)"
        style={{ background: "#0a0a12", border: "1px solid rgba(255,255,255,0.08)" }}
      />
    </ReactFlow>
  );
}
