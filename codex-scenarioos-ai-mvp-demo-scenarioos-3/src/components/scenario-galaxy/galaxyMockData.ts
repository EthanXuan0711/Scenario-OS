// ScenarioGalaxy 演示数据（确定性生成）
// 用种子 PRNG 生成，保证服务端与客户端产出完全一致，避免 React 水合不匹配。
// 节点：事件 / 角色 / 平台 / 风险 / 结果 五类；连线：影响 / 冲突 / 因果 / 传播 四类。

import { VIEW_H, VIEW_W, type EdgeType, type NodeStatus, type NodeType, type ScenarioEdge, type ScenarioNode } from "./galaxyTypes";

// --- 确定性随机 ---
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260530);
const between = (min: number, max: number) => min + rand() * (max - min);
// 近似高斯抖动：三次均匀叠加，集中于中心
const jitter = (spread: number) => (rand() + rand() + rand() - 1.5) * spread;

// --- 标签词库（仅作 Demo 数据，不指向任何真实品牌） ---
const LABELS: Record<NodeType, string[]> = {
  event: ["核心舆论事件", "政策突变", "行业黑天鹅", "资本异动", "技术拐点", "监管信号", "突发危机", "市场拐点"],
  actor: [
    "关键意见领袖", "头部创作者", "监管机构", "竞争对手", "早期用户", "主流媒体", "投资机构", "行业协会",
    "内部团队", "渠道伙伴", "用户社群", "水军集群", "中立观察者", "跨界玩家", "地方代理", "技术供应商",
    "公关团队", "法务顾问", "数据分析师", "海外同行", "上游厂商", "下游客户", "行业大V", "政策研究者"
  ],
  platform: [
    "短视频广场", "社交舆论场", "内容社区", "直播间生态", "私域社群", "算法分发层", "搜索入口", "图文平台",
    "问答社区", "即时通讯", "资讯聚合", "海外社媒", "垂类论坛", "电商直播", "音频电台", "弹幕社区"
  ],
  risk: [
    "监管介入", "舆情反噬", "信任崩塌", "现金流断裂", "数据泄露", "误读扩散", "对手狙击", "合规风险",
    "口碑分化", "流量见顶", "内容失控", "用户流失", "平台封禁", "法律纠纷", "公关失误", "成本失控",
    "团队动荡", "供应中断", "估值缩水", "政策收紧"
  ],
  outcome: [
    "破圈成功", "用户高速增长", "口碑两极", "品牌受损", "政策收紧", "生态共建", "中立观望", "市场领先",
    "边缘化", "被收购", "独立上市", "区域突破", "跨界融合", "用户沉淀", "对手反超", "行业洗牌",
    "标准制定", "资本退潮", "二次增长", "平稳退出"
  ]
};

const DESC: Record<NodeType, (label: string) => string> = {
  event: (l) => `「${l}」是本轮推演的触发源，向外辐射影响相关角色与平台。`,
  actor: (l) => `「${l}」在事件中扮演关键角色，其立场与行动将左右传播走向。`,
  platform: (l) => `「${l}」是信息扩散的主要载体，决定传播速度与圈层渗透。`,
  risk: (l) => `「${l}」是需要重点监控的风险点，可能引发连锁负反馈。`,
  outcome: (l) => `「${l}」是当前推演下的一种未来分支，概率随变量调整而变化。`
};

type ClusterSpec = { type: NodeType; cx: number; cy: number; spread: number; stage: number };

const CLUSTERS: ClusterSpec[] = [
  { type: "event", cx: VIEW_W * 0.27, cy: VIEW_H * 0.52, spread: 120, stage: 0 },
  { type: "actor", cx: VIEW_W * 0.46, cy: VIEW_H * 0.25, spread: 190, stage: 1 },
  { type: "platform", cx: VIEW_W * 0.68, cy: VIEW_H * 0.56, spread: 180, stage: 2 },
  { type: "risk", cx: VIEW_W * 0.48, cy: VIEW_H * 0.8, spread: 175, stage: 3 },
  { type: "outcome", cx: VIEW_W * 0.83, cy: VIEW_H * 0.33, spread: 165, stage: 3 }
];

const SIZE_RANGE: Record<NodeType, [number, number]> = {
  event: [13, 22],
  actor: [7, 12],
  platform: [9, 14],
  risk: [8, 13],
  outcome: [9, 14]
};

const MARGIN = 90;
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function buildNodes(): { nodes: ScenarioNode[]; byType: Record<NodeType, ScenarioNode[]> } {
  const nodes: ScenarioNode[] = [];
  const byType: Record<NodeType, ScenarioNode[]> = { event: [], actor: [], platform: [], risk: [], outcome: [] };

  CLUSTERS.forEach((cluster) => {
    const labels = LABELS[cluster.type];
    labels.forEach((label, i) => {
      const isCore = cluster.type === "event" && i === 0;
      const importance = isCore ? 1 : clamp(between(0.32, 0.92), 0, 1);
      const [minSize, maxSize] = SIZE_RANGE[cluster.type];
      const size = isCore ? maxSize + 4 : minSize + (maxSize - minSize) * importance;

      const x = isCore ? cluster.cx : clamp(cluster.cx + jitter(cluster.spread), MARGIN, VIEW_W - MARGIN);
      const y = isCore ? cluster.cy : clamp(cluster.cy + jitter(cluster.spread), MARGIN, VIEW_H - MARGIN);

      let status: NodeStatus = "normal";
      if (isCore) status = "active";
      else if (cluster.type === "risk" && rand() < 0.45) status = "risk";
      else if (cluster.type === "outcome" && rand() < 0.3) status = "resolved";
      else if (rand() < 0.12) status = "active";

      const node: ScenarioNode = {
        id: `${cluster.type}-${i}`,
        label,
        type: cluster.type,
        x,
        y,
        size,
        importance,
        status,
        description: DESC[cluster.type](label),
        stage: cluster.stage
      };
      nodes.push(node);
      byType[cluster.type].push(node);
    });
  });

  return { nodes, byType };
}

function buildEdges(byType: Record<NodeType, ScenarioNode[]>): ScenarioEdge[] {
  const edges: ScenarioEdge[] = [];
  const seen = new Set<string>();
  let counter = 0;

  const key = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];

  const addEdge = (source: string, target: string, type: EdgeType, mainPath = false) => {
    if (source === target) return;
    const k = key(source, target);
    if (seen.has(k)) return;
    seen.add(k);
    edges.push({ id: `e-${counter++}`, source, target, type, weight: clamp(between(0.3, 1), 0, 1), mainPath });
  };

  const core = byType.event[0];

  // --- 主推演路径（高亮发光）：事件 → 角色 → 平台 → 风险 → 结果 ---
  const pathActor = byType.actor[0];
  const pathPlatform = byType.platform[0];
  const pathRisk = byType.risk[0];
  const pathOutcome = byType.outcome[0];
  [pathActor, pathPlatform].forEach((n) => (n.importance = Math.max(n.importance, 0.85)));
  pathRisk.status = "risk";
  pathOutcome.status = "resolved";
  addEdge(core.id, pathActor.id, "causal", true);
  addEdge(pathActor.id, pathPlatform.id, "spread", true);
  addEdge(pathPlatform.id, pathRisk.id, "influence", true);
  addEdge(pathRisk.id, pathOutcome.id, "causal", true);

  // 核心事件 → 其它事件（因果）
  byType.event.slice(1).forEach((e) => addEdge(core.id, e.id, "causal"));
  // 核心事件 → 若干关键角色（影响）
  for (let i = 0; i < 6; i++) addEdge(core.id, pick(byType.actor).id, "influence");

  // 角色 → 平台（传播）：每个角色连 1~2 个平台
  byType.actor.forEach((a) => {
    const n = rand() < 0.5 ? 1 : 2;
    for (let i = 0; i < n; i++) addEdge(a.id, pick(byType.platform).id, "spread");
  });

  // 平台 → 平台（传播，圈层互联）
  byType.platform.forEach((p) => addEdge(p.id, pick(byType.platform).id, "spread"));

  // 平台 → 风险（影响 / 冲突）
  byType.platform.forEach((p) => addEdge(p.id, pick(byType.risk).id, rand() < 0.4 ? "conflict" : "influence"));

  // 风险 → 结果（因果）
  byType.risk.forEach((r) => addEdge(r.id, pick(byType.outcome).id, "causal"));

  // 角色 ↔ 角色（冲突 / 影响）
  for (let i = 0; i < 12; i++) addEdge(pick(byType.actor).id, pick(byType.actor).id, rand() < 0.5 ? "conflict" : "influence");

  // 风险 ↔ 风险（传播扩散）
  for (let i = 0; i < 8; i++) addEdge(pick(byType.risk).id, pick(byType.risk).id, "spread");

  // 平台 → 结果（影响）
  for (let i = 0; i < 7; i++) addEdge(pick(byType.platform).id, pick(byType.outcome).id, "influence");

  return edges;
}

const built = buildNodes();
const generatedNodes = built.nodes;
const generatedEdges = buildEdges(built.byType);

export const scenarioNodes: ScenarioNode[] = generatedNodes;
export const scenarioEdges: ScenarioEdge[] = generatedEdges;
export const coreNodeId = built.byType.event[0].id;
export const mainPathNodeIds: string[] = [
  built.byType.event[0].id,
  built.byType.actor[0].id,
  built.byType.platform[0].id,
  built.byType.risk[0].id,
  built.byType.outcome[0].id
];
