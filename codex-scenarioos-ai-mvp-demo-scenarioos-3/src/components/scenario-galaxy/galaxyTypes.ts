// ScenarioGalaxy 类型定义层
// 数据驱动：所有节点/连线均来自数据，不在 JSX 里写死。

export type NodeType = "event" | "actor" | "platform" | "risk" | "outcome";
export type NodeStatus = "normal" | "active" | "risk" | "resolved";
export type EdgeType = "influence" | "conflict" | "causal" | "spread";

export type ScenarioNode = {
  id: string;
  label: string;
  type: NodeType;
  /** 世界坐标 X（位于 0..VIEW_W 的逻辑画布内） */
  x: number;
  /** 世界坐标 Y（位于 0..VIEW_H 的逻辑画布内） */
  y: number;
  /** 基础半径（像素，世界坐标系） */
  size: number;
  /** 重要度 0..1，影响发光强度与标签优先级 */
  importance: number;
  status: NodeStatus;
  description: string;
  /** 所属推演阶段 0..3，用于时间线分批出现 */
  stage: number;
};

export type ScenarioEdge = {
  id: string;
  source: string;
  target: string;
  /** 关系强度 0..1 */
  weight: number;
  type: EdgeType;
  /** 是否属于"当前主推演路径"（更亮、带发光） */
  mainPath?: boolean;
};

export type CameraState = {
  /** 平移 X（屏幕/世界单位） */
  x: number;
  /** 平移 Y */
  y: number;
  /** 缩放 */
  scale: number;
};

// 逻辑画布尺寸：SVG 用 viewBox 映射到屏幕，保证 SSR 与响应式一致。
export const VIEW_W = 1600;
export const VIEW_H = 1000;

export type GalaxyStageId = 0 | 1 | 2 | 3;

export type GalaxyStage = {
  id: GalaxyStageId;
  key: string;
  label: string;
  hint: string;
};

// 四阶段推演：输入 → 角色映射 → 传播推演 → 结果分支
export const STAGES: GalaxyStage[] = [
  { id: 0, key: "input", label: "事件输入", hint: "采集核心事件与触发因子" },
  { id: 1, key: "mapping", label: "角色映射", hint: "识别相关角色与利益方" },
  { id: 2, key: "spread", label: "传播推演", hint: "模拟跨平台传播与扩散" },
  { id: 3, key: "branch", label: "结果分支", hint: "推演风险点与未来结果" }
];

// 节点类型 → 视觉 token（配色取自暗黑科幻调性，与现有 void/ink/gold 调色板同源）
export const NODE_TYPE_META: Record<NodeType, { label: string; color: string; glow: string }> = {
  event: { label: "事件", color: "#e7c766", glow: "#f5d97a" },
  actor: { label: "角色", color: "#6ea8ff", glow: "#9ec2ff" },
  platform: { label: "平台", color: "#a78bfa", glow: "#c4b2ff" },
  risk: { label: "风险", color: "#f0556a", glow: "#ff8492" },
  outcome: { label: "结果", color: "#34d399", glow: "#6ee7b7" }
};

export const EDGE_TYPE_META: Record<EdgeType, { label: string; color: string }> = {
  influence: { label: "影响", color: "#7c89b8" },
  conflict: { label: "冲突", color: "#f0556a" },
  causal: { label: "因果", color: "#e7c766" },
  spread: { label: "传播", color: "#6ea8ff" }
};

export const NODE_STATUS_META: Record<NodeStatus, { label: string }> = {
  normal: { label: "常态" },
  active: { label: "激活" },
  risk: { label: "风险" },
  resolved: { label: "已收敛" }
};
