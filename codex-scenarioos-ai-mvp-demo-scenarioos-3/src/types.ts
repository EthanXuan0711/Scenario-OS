export type ScenarioNodeType =
  | "self"
  | "choice"
  | "person"
  | "organization"
  | "value"
  | "risk"
  | "path"
  | "evidence"
  | "action";

export type ScenarioNode = {
  id: string;
  type: ScenarioNodeType;
  label: string;
  shell: 0 | 1 | 2 | 3 | 4;
  weight: number;
  confidence: "low" | "medium" | "high";
  explanation: string;
};

export type ScenarioEdge = {
  source: string;
  target: string;
  relation: "influences" | "conflicts" | "supports" | "constrains" | "triggers" | "validates" | "revises";
  strength: number;
  explanation: string;
};

export type ScenarioPath = {
  id: "steady" | "bold" | "hybrid" | "retreat";
  name: string;
  tag: string;
  coreLogic: string;
  upside: string;
  opportunityCost: string;
  failureMode: string;
  validationExperiment: string;
  fitScore: number;
  riskLevel: "low" | "medium" | "high";
  relatedNodeIds: string[];
};

export type DecisionVariable = {
  id: "risk" | "cashflow" | "freedom" | "relationship" | "growth" | "identity";
  name: string;
  lowLabel: string;
  highLabel: string;
  value: number;
};

export type CouncilOpinion = {
  id: string;
  role: string;
  stance: string;
  challenge: string;
  targetPathId: ScenarioPath["id"];
};

export type ActionProtocolItem = {
  id: string;
  label: string;
  detail: string;
};
