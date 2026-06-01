"use client";

// 右轨内容：节点详情（随选中同步）+ 变量评分面板（公式联动）。

import type { DecisionVariable, ScenarioEdge, ScenarioNode } from "../../types";
import type { ScoredPath, VariableValues } from "../cockpit/cockpitSim";
import NodeDetail from "./NodeDetail";
import VariablePanel from "./VariablePanel";

type Props = {
  node: ScenarioNode;
  relatedEdges: ScenarioEdge[];
  nodeMap: Map<string, ScenarioNode>;
  onSelect: (id: string) => void;
  variables: VariableValues;
  decisionVariables: DecisionVariable[];
  scoredPaths: ScoredPath[];
  survival: number;
  riskIndex: number;
  onVariable: (id: DecisionVariable["id"], value: number) => void;
  onReset: () => void;
};

export default function RightRail({
  node,
  relatedEdges,
  nodeMap,
  onSelect,
  variables,
  decisionVariables,
  scoredPaths,
  survival,
  riskIndex,
  onVariable,
  onReset
}: Props) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <NodeDetail node={node} relatedEdges={relatedEdges} nodeMap={nodeMap} onSelect={onSelect} />
      <VariablePanel
        variables={variables}
        decisionVariables={decisionVariables}
        scoredPaths={scoredPaths}
        survival={survival}
        riskIndex={riskIndex}
        onVariable={onVariable}
        onReset={onReset}
      />
    </div>
  );
}
