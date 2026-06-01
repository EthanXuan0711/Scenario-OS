"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Activity,
  BookOpen,
  Check,
  ChevronRight,
  CircleDot,
  Copy,
  FileText,
  Folder,
  GitBranch,
  Hash,
  Link2,
  ListChecks,
  MessageSquarePlus,
  Orbit,
  PanelLeftClose,
  PanelRightClose,
  Pin,
  Plus,
  RefreshCw,
  RotateCcw,
  Scale,
  Search,
  ShieldAlert,
  Terminal
} from "lucide-react";
import {
  actionProtocol,
  councilOpinions,
  graphEdges,
  graphNodes,
  initialMessages as seedMessages,
  quickReplies,
  scenarioPaths,
  timeline,
  variables as baseVariables
} from "../data/scenarioOS";
import type { DecisionVariable, ScenarioEdge, ScenarioNode, ScenarioPath } from "../types";
import ElectronCloud3D from "./ElectronCloud3D";
import WorkspaceChatDrawer from "./WorkspaceChatDrawer";
import RailBar from "./RailBar";
import GraphControlBar from "./GraphControlBar";
import GraphLegend from "./graph-workspace/GraphLegend";
import { deriveScenarioOverrides, matchArchetypeKey } from "./deriveScenario";
import { loadScenario, saveScenario } from "./scenarioBridge";
import UserMenu from "./user/UserMenu";

type WorkspaceMode = "graph" | "note" | "canvas";
type RightTab = "properties" | "backlinks" | "variables" | "protocol" | "council";
type ThreadMessage = { role: "user" | "system"; text: string };
type VariableValues = Record<DecisionVariable["id"], number>;

const rightTabs: Array<{ id: RightTab; label: string }> = [
  { id: "properties", label: "属性" },
  { id: "backlinks", label: "反链" },
  { id: "variables", label: "变量" },
  { id: "protocol", label: "协议" },
  { id: "council", label: "反方" }
];

const workspaceModes: Array<{ id: WorkspaceMode; label: string }> = [
  { id: "graph", label: "局部图谱" },
  { id: "note", label: "Markdown" },
  { id: "canvas", label: "Canvas" }
];

const variableDefaults = baseVariables.reduce((accumulator, variable) => {
  accumulator[variable.id] = variable.value;
  return accumulator;
}, {} as VariableValues);

const initialThreadMessages: ThreadMessage[] = seedMessages.map((message) => ({
  role: "system",
  text: message.body
}));

const nodeTypeLabels: Record<ScenarioNode["type"], string> = {
  action: "行动",
  choice: "抉择",
  evidence: "证据",
  organization: "组织",
  path: "路径",
  person: "人物",
  risk: "风险",
  self: "自我",
  value: "价值"
};

const confidenceLabels: Record<ScenarioNode["confidence"], string> = {
  high: "高置信",
  medium: "中置信",
  low: "低置信"
};

const pathIdByNodeId: Record<string, ScenarioPath["id"]> = {
  "path-bold": "bold",
  "path-hybrid": "hybrid",
  "path-retreat": "retreat",
  "path-steady": "steady"
};

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function scorePath(path: ScenarioPath, variables: VariableValues) {
  const deltaByPath: Record<ScenarioPath["id"], number> = {
    hybrid:
      (variables.growth - 50) * 0.12 +
      (variables.identity - 50) * 0.1 +
      (variables.cashflow - 50) * 0.08 -
      (variables.risk - 50) * 0.03 -
      (variables.relationship - 50) * 0.02,
    steady:
      (variables.cashflow - 50) * 0.16 +
      (variables.relationship - 50) * 0.1 -
      (variables.growth - 50) * 0.06 -
      (variables.freedom - 50) * 0.06 -
      (variables.risk - 50) * 0.04,
    bold:
      (variables.risk - 50) * 0.16 +
      (variables.freedom - 50) * 0.14 +
      (variables.growth - 50) * 0.11 -
      (variables.cashflow - 50) * 0.13 -
      (variables.relationship - 50) * 0.06,
    retreat:
      (variables.cashflow - 50) * 0.08 +
      (variables.relationship - 50) * 0.08 -
      (variables.growth - 50) * 0.12 -
      (variables.freedom - 50) * 0.09 -
      (variables.identity - 50) * 0.04
  };

  return clamp(Math.round(path.fitScore + deltaByPath[path.id]), 18, 96);
}

function relationLabel(relation: ScenarioEdge["relation"]) {
  const labels: Record<ScenarioEdge["relation"], string> = {
    conflicts: "冲突",
    constrains: "约束",
    influences: "影响",
    revises: "修正",
    supports: "支撑",
    triggers: "触发",
    validates: "验证"
  };
  return labels[relation];
}

function noteTags(node: ScenarioNode) {
  const base = [nodeTypeLabels[node.type], confidenceLabels[node.confidence]];
  if (node.type === "path") base.push("MOC");
  if (node.type === "risk") base.push("待验证");
  if (node.type === "value") base.push("变量");
  return base;
}

function wikiLink(label: string) {
  return `[[${label}]]`;
}

// 根据输入关键词推断笔记节点类型（供 AI 推演抽屉生成节点用）
function classifyNoteType(text: string): ScenarioNode["type"] {
  if (/(风险|危机|担心|亏|崩|监管|违规|失败|焦虑|压力|对手|竞争|裁员|纠纷)/.test(text)) return "risk";
  if (/(价值|意义|成长|自由|理想|增长|机会|愿景)/.test(text)) return "value";
  if (/(用户|客户|家人|朋友|老板|投资|团队|合伙|媒体|导师|粉丝)/.test(text)) return "person";
  if (/(公司|平台|组织|机构|部门|渠道|协会)/.test(text)) return "organization";
  if (/(选择|抉择|要不要|是否|决定|方向|取舍)/.test(text)) return "choice";
  if (/(行动|执行|计划|尝试|启动|落地|推进)/.test(text)) return "action";
  return "evidence";
}

function deriveNodeLabel(text: string) {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length <= 18) return compact;
  return `${compact.slice(0, 18)}...`;
}

function inferVariableAdjustments(text: string, current: VariableValues) {
  const normalized = text.toLowerCase();
  const rules: Array<{ id: DecisionVariable["id"]; keywords: string[]; delta: number }> = [
    { id: "risk", keywords: ["风险", "冒险", "不确定", "激进", "全职", "risk"], delta: 8 },
    { id: "cashflow", keywords: ["现金流", "收入", "存款", "预算", "钱", "缓冲", "cash"], delta: 8 },
    { id: "growth", keywords: ["成长", "学习", "机会", "窗口", "ai", "增长", "growth"], delta: 7 },
    { id: "freedom", keywords: ["自由", "自主", "独立", "远程", "freedom"], delta: 6 },
    { id: "relationship", keywords: ["家人", "合伙", "关系", "团队", "朋友", "relationship"], delta: 6 },
    { id: "identity", keywords: ["身份", "长期", "价值", "成为", "方向", "identity"], delta: 6 }
  ];

  return rules.reduce((next, rule) => {
    if (rule.keywords.some((keyword) => normalized.includes(keyword.toLowerCase()))) {
      return { ...next, [rule.id]: clamp(next[rule.id] + rule.delta) };
    }
    return next;
  }, { ...current });
}

export default function ScenarioWorkspace() {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("graph");
  const [rightTab, setRightTab] = useState<RightTab>("backlinks");
  const [selectedNodeId, setSelectedNodeId] = useState("choice");
  const [query, setQuery] = useState("");
  const [capture, setCapture] = useState("");
  const [messages, setMessages] = useState<ThreadMessage[]>(initialThreadMessages);
  const [variables, setVariables] = useState<VariableValues>(variableDefaults);
  const [activePathId, setActivePathId] = useState<ScenarioPath["id"]>("hybrid");
  const [customNodes, setCustomNodes] = useState<ScenarioNode[]>([]);
  const [customEdges, setCustomEdges] = useState<ScenarioEdge[]>([]);
  const [nodeOverrides, setNodeOverrides] = useState<Record<string, Partial<ScenarioNode>>>({});
  const [scenarioMeta, setScenarioMeta] = useState<{ active: boolean; topic: string; input: string; archetypeKey: string }>({
    active: false,
    topic: "",
    input: "",
    archetypeKey: "generic"
  });
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [committed, setCommitted] = useState(false);
  const [round, setRound] = useState(1);
  const [backfill, setBackfill] = useState("");
  const [leftDetailsOpen, setLeftDetailsOpen] = useState(false);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [lastAction, setLastAction] = useState("图谱已载入，选择任意节点查看反链。");

  const allNodes = useMemo(
    () => [
      ...graphNodes.map((node) => (nodeOverrides[node.id] ? { ...node, ...nodeOverrides[node.id] } : node)),
      ...customNodes
    ],
    [customNodes, nodeOverrides]
  );
  const allEdges = useMemo(() => [...graphEdges, ...customEdges], [customEdges]);

  const scoredPaths = useMemo(
    () =>
      scenarioPaths
        .map((path) => ({ ...path, adjustedScore: scorePath(path, variables) }))
        .sort((first, second) => second.adjustedScore - first.adjustedScore),
    [variables]
  );

  const activePath = useMemo(
    () => scoredPaths.find((path) => path.id === activePathId) ?? scoredPaths[0],
    [activePathId, scoredPaths]
  );

  const selectedNode = useMemo(
    () => allNodes.find((node) => node.id === selectedNodeId) ?? allNodes[0],
    [allNodes, selectedNodeId]
  );

  const relatedEdges = useMemo(
    () => allEdges.filter((edge) => edge.source === selectedNode.id || edge.target === selectedNode.id),
    [allEdges, selectedNode.id]
  );

  const outgoingEdges = useMemo(() => allEdges.filter((edge) => edge.source === selectedNode.id), [allEdges, selectedNode.id]);
  const backlinkEdges = useMemo(() => allEdges.filter((edge) => edge.target === selectedNode.id), [allEdges, selectedNode.id]);

  const linkedNodeIds = useMemo(
    () => Array.from(new Set(relatedEdges.flatMap((edge) => [edge.source, edge.target]))),
    [relatedEdges]
  );

  const filteredNodes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return allNodes;
    return allNodes.filter((node) =>
      `${node.label} ${node.explanation} ${node.type} ${noteTags(node).join(" ")}`.toLowerCase().includes(normalizedQuery)
    );
  }, [allNodes, query]);

  const searchActive = query.trim().length > 0;
  const matchIds = useMemo(() => filteredNodes.map((node) => node.id), [filteredNodes]);
  // 图谱高亮集 / 聚焦集：搜索时高亮匹配并压暗其余；否则高亮一度邻居并压暗无关
  const graphHighlightIds = useMemo(() => (searchActive ? matchIds : linkedNodeIds), [searchActive, matchIds, linkedNodeIds]);
  const graphFocusIds = useMemo(
    () => (searchActive ? matchIds : [selectedNode.id, ...linkedNodeIds]),
    [searchActive, matchIds, selectedNode.id, linkedNodeIds]
  );

  const graphRef = useRef<HTMLElement>(null);
  const zoomGraph = (deltaY: number) => {
    const canvas = graphRef.current?.querySelector("canvas");
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.dispatchEvent(
      new WheelEvent("wheel", {
        deltaY,
        bubbles: true,
        cancelable: true,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2
      })
    );
  };


  const survival = useMemo(
    () => clamp(Math.round(48 + variables.cashflow * 0.26 + variables.relationship * 0.08 - variables.risk * 0.1), 18, 94),
    [variables]
  );

  // 写入共享场景：议题 + 推演原型 + 变量 → 供社会沙盘联动。
  useEffect(() => {
    if (scenarioMeta.active) saveScenario({ ...scenarioMeta, variables });
  }, [scenarioMeta, variables]);

  // 挂载时从共享场景恢复，保持工作台与社会沙盘一致。
  useEffect(() => {
    const shared = loadScenario();
    if (shared?.active && shared.input) {
      setScenarioMeta({ active: true, topic: shared.topic, input: shared.input, archetypeKey: shared.archetypeKey });
      setNodeOverrides((current) => ({ ...current, ...deriveScenarioOverrides(shared.input, shared.topic) }));
      if (shared.variables) setVariables(shared.variables);
      setSelectedNodeId("choice");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const actionReadiness = useMemo(
    () => clamp(Math.round((checked.size / actionProtocol.length) * 46 + (committed ? 24 : 0) + (backfill.trim() ? 18 : 0) + round * 2), 0, 98),
    [backfill, checked.size, committed, round]
  );

  const selectNode = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    const nextPathId = pathIdByNodeId[nodeId];
    if (nextPathId) setActivePathId(nextPathId);
    setRightTab("backlinks");
    setLastAction(`已打开 ${wikiLink(allNodes.find((node) => node.id === nodeId)?.label ?? nodeId)} 的局部图谱。`);
  };

  const selectPath = (pathId: ScenarioPath["id"]) => {
    const nextPath = scenarioPaths.find((path) => path.id === pathId);
    setActivePathId(pathId);
    if (nextPath?.relatedNodeIds[0]) setSelectedNodeId(nextPath.relatedNodeIds[0]);
    setLastAction(`已聚焦到「${nextPath?.name ?? pathId}」。`);
  };

  const submitCapture = () => {
    const trimmed = capture.trim();
    if (!trimmed) {
      inputRef.current?.focus();
      return;
    }

    const label = deriveNodeLabel(trimmed);
    // 用输入更新中心「转行 AI」议题——中心星球随之改变
    setNodeOverrides((current) => ({ ...current, ...deriveScenarioOverrides(trimmed, label) }));
    setScenarioMeta({ active: true, topic: label, input: trimmed, archetypeKey: matchArchetypeKey(trimmed) });

    // 同时生成一颗关联笔记星，连到中心
    const id = `capture-${customNodes.length + 1}`;
    const nextNode: ScenarioNode = {
      id,
      type: "evidence",
      label,
      shell: 1,
      weight: clamp(42 + Math.round(trimmed.length / 4), 42, 82),
      confidence: "low",
      explanation: trimmed
    };
    const nextEdge: ScenarioEdge = {
      source: "choice",
      target: id,
      relation: "supports",
      strength: 0.5,
      explanation: `这条原子笔记支撑中心议题「${label}」。`
    };

    setCustomNodes((current) => [...current, nextNode]);
    setCustomEdges((current) => [...current, nextEdge]);
    setVariables((current) => inferVariableAdjustments(trimmed, current));
    setSelectedNodeId("choice");
    setRightTab("properties");
    setWorkspaceMode("graph");
    setLeftDetailsOpen(true);
    setCapture("");
    setRound((value) => value + 1);
    setMessages((current) => [
      ...current,
      { role: "user", text: trimmed },
      { role: "system", text: `已把中心议题更新为 ${wikiLink(label)}，并生成关联笔记，右侧数据已刷新。` }
    ]);
    setLastAction(`中心议题已更新为 ${wikiLink(label)}。`);
  };

  const chatSend = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const label = deriveNodeLabel(trimmed);
    const type = classifyNoteType(trimmed);
    // 用输入更新中心「转行 AI」议题——中心星球随之改变
    setNodeOverrides((current) => ({ ...current, ...deriveScenarioOverrides(trimmed, label) }));
    setScenarioMeta({ active: true, topic: label, input: trimmed, archetypeKey: matchArchetypeKey(trimmed) });

    // 同时生成一颗关联星，连到中心
    const id = `ai-${customNodes.length + 1}`;
    const node: ScenarioNode = {
      id,
      type,
      label,
      shell: 1,
      weight: 54,
      confidence: "low",
      explanation: trimmed
    };
    const edge: ScenarioEdge = {
      source: "choice",
      target: id,
      relation: "influences",
      strength: 0.52,
      explanation: `AI 推演：围绕中心议题「${label}」延伸。`
    };

    setCustomNodes((current) => [...current, node]);
    setCustomEdges((current) => [...current, edge]);
    setSelectedNodeId("choice");
    setWorkspaceMode("graph");

    // 关键词轻量联动右侧变量（路径分会即时重排）
    if (type === "risk") updateVariable("risk", clamp(variables.risk + 8));
    else if (type === "value") updateVariable("growth", clamp(variables.growth + 6));

    setRound((value) => value + 1);
    setMessages((current) => [
      ...current,
      { role: "user", text: trimmed },
      { role: "system", text: `已把中心议题更新为「${label}」，右侧路径评分已随之刷新。` }
    ]);
    setLastAction(`中心议题已更新为 ${wikiLink(label)}。`);
  };

  const injectQuickReply = (reply: string) => {
    setCapture(reply);
    inputRef.current?.focus();
    setLastAction("快速模板已放入 Inbox，回车即可写入 vault。");
  };

  const copyWikiLink = () => {
    const text = wikiLink(selectedNode.label);
    void navigator.clipboard?.writeText(text);
    setLastAction(`已复制 ${text}`);
  };

  const pinAsMoc = () => {
    setWorkspaceMode("canvas");
    setRightTab("properties");
    setLastAction(`${wikiLink(selectedNode.label)} 已作为当前 MOC 视图锚点。`);
  };

  const regenerate = () => {
    const bestPath = scoredPaths[0];
    setActivePathId(bestPath.id);
    setSelectedNodeId(bestPath.relatedNodeIds[0] ?? "choice");
    setWorkspaceMode("canvas");
    setRound((value) => value + 1);
    setMessages((current) => [
      ...current,
      { role: "system", text: `第 ${round + 1} 轮重算完成：当前 MOC 首选为「${bestPath.name}」，路径分 ${bestPath.adjustedScore}。` }
    ]);
    setLastAction(`已重算路径，首选 MOC 为「${bestPath.name}」。`);
  };

  const updateVariable = (id: DecisionVariable["id"], value: number) => {
    setVariables((current) => ({ ...current, [id]: value }));
    setLastAction("变量已更新，路径分和 Canvas 会即时重排。");
  };

  const resetVariables = () => {
    setVariables(variableDefaults);
    setLastAction("变量已恢复默认值。");
  };

  const acceptPath = () => {
    setCommitted(true);
    setRightTab("protocol");
    setWorkspaceMode("canvas");
    setLastAction(`已把「${activePath.name}」固定为 14 天验证协议。`);
  };

  const challengePath = () => {
    setRightTab("council");
    setLastAction(`反方委员会正在审查「${activePath.name}」的失败模式。`);
  };

  const toggleProtocol = (id: string) => {
    setChecked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submitBackfill = () => {
    const trimmed = backfill.trim();
    if (!trimmed) return;
    setMessages((current) => [
      ...current,
      { role: "user", text: `回填：${trimmed}` },
      { role: "system", text: "回填已作为现实证据写入下一轮推演，未验证假设权重会被降低。" }
    ]);
    setRound((value) => value + 1);
    setLastAction("现实回填已进入 vault 的证据层。");
  };

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[#030308] text-sm text-zinc-400 lg:flex-row">
      {leftCollapsed ? (
        <RailBar side="left" title="Vault" onExpand={() => setLeftCollapsed(false)} />
      ) : (
      <section
        data-testid="vault-sidebar"
        className="flex h-[34vh] w-full min-w-0 flex-col border-b border-zinc-800/60 bg-[#07070e] lg:h-auto lg:w-[21rem] lg:min-w-[19rem] lg:border-b-0 lg:border-r"
      >
        <header className="border-b border-zinc-900 px-4 py-3">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Folder size={16} className="text-amber-500" />
              <h2 className="text-sm font-medium text-zinc-100">ScenarioOS Vault</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-600">{allNodes.length} notes</span>
              <button
                type="button"
                onClick={() => setLeftCollapsed(true)}
                title="收起 Vault"
                className="flex h-6 w-6 items-center justify-center rounded text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-100"
              >
                <PanelLeftClose size={14} />
              </button>
            </div>
          </div>
          <label className="flex items-center gap-2 border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs">
            <Search size={14} className="text-zinc-600" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索笔记、标签或链接..."
              className="min-w-0 flex-1 bg-transparent text-zinc-300 placeholder:text-zinc-600 focus:outline-none"
            />
          </label>
        </header>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <section className="mb-4 space-y-3 border border-zinc-900 bg-zinc-950/60 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-medium text-zinc-300">
                <MessageSquarePlus size={14} className="text-amber-500" />
                AI 输入主页面
              </div>
              <span className="text-[11px] text-zinc-600">自动写入 Vault</span>
            </div>
            <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
              {messages.slice(-6).map((message, index) => (
                <div
                  key={`${message.role}-${index}-${message.text.slice(0, 12)}`}
                  className={`border px-3 py-2 text-xs leading-relaxed ${
                    message.role === "user"
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-100"
                      : "border-zinc-900 bg-[#08080f] text-zinc-500"
                  }`}
                >
                  {message.text}
                </div>
              ))}
            </div>
          </section>

          <button
            type="button"
            onClick={() => setLeftDetailsOpen((open) => !open)}
            className="mb-4 flex w-full items-center justify-between border border-zinc-800 bg-[#0a0a12] px-3 py-2 text-left text-xs text-zinc-300 transition-colors hover:border-amber-500/50 hover:text-amber-100"
          >
            <span className="flex items-center gap-2">
              <Folder size={14} className="text-amber-500" />
              {leftDetailsOpen ? "收起原子笔记与内容路径" : "展开原子笔记与内容路径"}
            </span>
            <ChevronRight size={14} className={leftDetailsOpen ? "rotate-90 transition-transform" : "transition-transform"} />
          </button>

          {leftDetailsOpen ? (
            <>
          <section className="mb-5 space-y-2">
            <div className="flex items-center gap-2 px-1 text-xs font-medium text-zinc-500">
              <BookOpen size={13} />
              MOC 路径
            </div>
            {scoredPaths.map((path) => (
              <button
                key={path.id}
                type="button"
                onClick={() => selectPath(path.id)}
                className={`w-full border px-3 py-2 text-left transition-colors ${
                  activePath.id === path.id ? "border-amber-500/50 bg-amber-500/10" : "border-zinc-900 hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-zinc-200">[[{path.name}]]</span>
                  <span className="text-xs text-amber-200">{path.adjustedScore}</span>
                </div>
                <div className="mt-1 h-1 overflow-hidden bg-zinc-900">
                  <div className="h-full bg-amber-500/75" style={{ width: `${path.adjustedScore}%` }} />
                </div>
              </button>
            ))}
          </section>

          <section className="mb-5 space-y-2">
            <div className="flex items-center gap-2 px-1 text-xs font-medium text-zinc-500">
              <FileText size={13} />
              Notes
            </div>
            <div className="space-y-1">
              {filteredNodes.map((node) => (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => selectNode(node.id)}
                  className={`w-full px-2 py-2 text-left transition-colors ${
                    selectedNode.id === node.id ? "bg-zinc-900 text-amber-100" : "text-zinc-500 hover:bg-zinc-900/60 hover:text-zinc-200"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs">[[{node.label}]]</span>
                    <span className="text-[10px] text-zinc-700">{nodeTypeLabels[node.type]}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2 px-1 text-xs font-medium text-zinc-500">
              <Hash size={13} />
              Tags
            </div>
            <div className="flex flex-wrap gap-2">
              {["MOC", "变量", "待验证", "关系", "现金流", "14天"].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setQuery(tag)}
                  className="border border-zinc-900 px-2 py-1 text-xs text-zinc-500 transition-colors hover:border-amber-500/40 hover:text-amber-200"
                >
                  #{tag}
                </button>
              ))}
            </div>
          </section>
            </>
          ) : (
            <section className="border border-dashed border-zinc-800 bg-zinc-950/40 px-3 py-4 text-xs leading-relaxed text-zinc-500">
              原子笔记、内容路径和标签已折叠。点击上方按钮展开，输入区仍会自动写入新原子笔记、更新右侧属性，并触发变量评分重算。
            </section>
          )}
        </div>

        <form
          data-testid="quick-capture"
          className="space-y-3 border-t border-zinc-900 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            submitCapture();
          }}
        >
          <div className="text-xs font-medium text-zinc-500">Inbox / 原子笔记</div>
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={capture}
              onChange={(event) => setCapture(event.target.value)}
              rows={3}
              placeholder="写入一个事实、担忧或反驳..."
              className="min-w-0 flex-1 rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-300 placeholder:text-zinc-600 focus:border-amber-500/50 focus:outline-none"
            />
            <button
              type="submit"
              className="rounded bg-zinc-100 px-3 text-zinc-950 transition-colors hover:bg-white"
              aria-label="新建原子笔记"
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {quickReplies.map((reply) => (
              <button
                key={reply}
                type="button"
                onClick={() => injectQuickReply(reply)}
                className="border border-zinc-900 px-3 py-2 text-left text-xs text-zinc-500 transition-colors hover:border-amber-500/40 hover:text-amber-200"
              >
                {reply}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={regenerate}
            className="inline-flex w-full items-center justify-center gap-2 border border-zinc-800 py-2 text-xs text-zinc-400 transition-colors hover:border-amber-500/50 hover:text-amber-200"
          >
            <RefreshCw size={14} />
            重算图谱与 MOC
          </button>
        </form>
      </section>
      )}

      <main className="flex min-h-0 flex-1 flex-col bg-[#040409]">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-900 px-4 py-3">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2 text-xs text-zinc-600">
              <Terminal size={13} />
              ScenarioOS Vault / {selectedNode.label}.md
            </div>
            <h1 className="truncate text-lg text-zinc-100">{selectedNode.label}</h1>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-2 overflow-x-auto">
              <Link
                href="/scenario-map"
                className="flex shrink-0 items-center gap-1.5 rounded border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-amber-200 transition-colors hover:border-amber-400/70 hover:bg-amber-500/20"
              >
                <Orbit size={14} />
                社会沙盘
              </Link>
              <span className="mx-1 h-4 w-px shrink-0 bg-zinc-800" aria-hidden />
              {workspaceModes.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setWorkspaceMode(mode.id)}
                  className={`shrink-0 border px-3 py-1.5 transition-colors ${
                    workspaceMode === mode.id
                      ? "border-amber-500/50 bg-amber-500/10 text-amber-100"
                      : "border-zinc-800 text-zinc-500 hover:text-zinc-200"
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
            <span className="mx-1 h-4 w-px shrink-0 bg-zinc-800" aria-hidden />
            <UserMenu />
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-hidden">
          {workspaceMode === "graph" && (
            <section ref={graphRef} data-testid="obsidian-graph" className="relative h-full overflow-hidden bg-[#030308]">
              <GraphControlBar onZoomIn={() => zoomGraph(-220)} onZoomOut={() => zoomGraph(220)} onReset={() => zoomGraph(1400)} />
              <ElectronCloud3D
                edges={allEdges}
                nodes={allNodes}
                selectedNodeId={selectedNode.id}
                highlightedNodeIds={graphHighlightIds}
                focusNodeIds={graphFocusIds}
                onNodeSelect={selectNode}
                pulseSeed={round}
              />

              <div className="absolute left-5 top-5 flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950/85 px-3 py-1.5 text-xs text-zinc-400 backdrop-blur-md">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                局部图谱 · {relatedEdges.length} 条双链 · 当前 MOC {activePath.name}
              </div>

              <div className="absolute right-5 top-5 hidden gap-2 text-right text-xs sm:grid">
                <StatusPill label="Notes" value={allNodes.length} />
                <StatusPill label="Links" value={allEdges.length} />
                <StatusPill label="MOC" value={activePath.adjustedScore} />
                <StatusPill label="Protocol" value={`${checked.size}/${actionProtocol.length}`} />
              </div>

              <div className="absolute bottom-4 left-4 right-4 border border-zinc-800 bg-zinc-950/90 p-4 backdrop-blur-md lg:right-auto lg:max-w-xl">
                <div className="mb-2 flex items-center gap-2">
                  <CircleDot size={15} className="text-amber-500" />
                  <h3 className="text-sm text-zinc-100">[[{selectedNode.label}]]</h3>
                  <span className="text-xs text-zinc-600">{nodeTypeLabels[selectedNode.type]}</span>
                </div>
                <p className="text-xs leading-relaxed text-zinc-400">{selectedNode.explanation}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {noteTags(selectedNode).map((tag) => (
                    <span key={tag} className="border border-zinc-800 px-2 py-1 text-[11px] text-zinc-500">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              <GraphLegend />
            </section>
          )}

          {workspaceMode === "note" && (
            <section data-testid="markdown-note" className="h-full overflow-y-auto px-5 py-6 lg:px-10">
              <article className="mx-auto max-w-3xl">
                <div className="mb-6 border-b border-zinc-900 pb-5">
                  <div className="mb-3 flex flex-wrap gap-2">
                    {noteTags(selectedNode).map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setQuery(tag)}
                        className="border border-zinc-800 px-2 py-1 text-xs text-zinc-500 transition-colors hover:border-amber-500/40 hover:text-amber-200"
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                  <h2 className="mb-3 text-2xl text-zinc-50"># {selectedNode.label}</h2>
                  <p className="leading-relaxed text-zinc-300">{selectedNode.explanation}</p>
                </div>

                <MarkdownBlock title="YAML Frontmatter">
                  <pre className="whitespace-pre-wrap text-xs leading-relaxed text-zinc-500">{`---
type: ${nodeTypeLabels[selectedNode.type]}
confidence: ${confidenceLabels[selectedNode.confidence]}
weight: ${selectedNode.weight}
links: ${relatedEdges.length}
---`}</pre>
                </MarkdownBlock>

                <MarkdownBlock title="Linked Thinking">
                  <p className="mb-3 leading-relaxed">
                    这个节点不是单独的建议，而是图谱里的一个笔记。它通过双链连接到相关人物、变量、风险和路径；每一次补充事实都会新增一条可追踪链接。
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {relatedEdges.slice(0, 8).map((edge) => {
                      const target = allNodes.find((node) => node.id === (edge.source === selectedNode.id ? edge.target : edge.source));
                      if (!target) return null;
                      return (
                        <button
                          key={`${edge.source}-${edge.target}`}
                          type="button"
                          onClick={() => selectNode(target.id)}
                          className="border border-zinc-800 px-2 py-1 text-xs text-amber-100/80 transition-colors hover:border-amber-500/50"
                        >
                          [[{target.label}]]
                        </button>
                      );
                    })}
                  </div>
                </MarkdownBlock>

                <MarkdownBlock title="Decision Notes">
                  <ul className="space-y-2 text-sm text-zinc-400">
                    <li>- 当前首选路径：[[{activePath.name}]]，路径分 {activePath.adjustedScore}。</li>
                    <li>- 18 个月生存概率：{survival}%。</li>
                    <li>- 14 天行动准备度：{actionReadiness}%。</li>
                  </ul>
                </MarkdownBlock>
              </article>
            </section>
          )}

          {workspaceMode === "canvas" && (
            <section data-testid="obsidian-canvas" className="h-full overflow-y-auto p-5">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <div className="mb-1 text-xs text-zinc-600">Canvas / MOC</div>
                  <h2 className="text-xl text-zinc-100">{activePath.name}</h2>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={acceptPath}
                    className="flex items-center gap-2 bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-950 transition-colors hover:bg-white"
                  >
                    固定协议 <ChevronRight size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={challengePath}
                    className="border border-zinc-800 px-3 py-2 text-xs text-zinc-400 transition-colors hover:border-amber-500/50 hover:text-amber-200"
                  >
                    反方审查
                  </button>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
                <section className="border border-zinc-800 bg-zinc-950 p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <GitBranch size={16} className="text-amber-500" />
                    <h3 className="text-base text-zinc-200">路径 Canvas</h3>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {scoredPaths.map((path) => (
                      <button
                        key={path.id}
                        type="button"
                        onClick={() => selectPath(path.id)}
                        className={`min-h-36 border p-4 text-left transition-colors ${
                          activePath.id === path.id ? "border-amber-500/60 bg-amber-500/10" : "border-zinc-900 bg-[#111113] hover:border-zinc-700"
                        }`}
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <h4 className="text-sm text-zinc-100">[[{path.name}]]</h4>
                          <span className="text-xs text-amber-200">{path.adjustedScore}</span>
                        </div>
                        <p className="mb-3 line-clamp-3 text-xs leading-relaxed text-zinc-500">{path.coreLogic}</p>
                        <Metric label="适配度" value={`${path.adjustedScore}%`} width={path.adjustedScore} tone="amber" />
                      </button>
                    ))}
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="border border-zinc-800 bg-zinc-950 p-5">
                    <h3 className="mb-3 text-base text-zinc-200">当前 MOC 说明</h3>
                    <p className="mb-4 text-sm leading-relaxed text-zinc-400">{activePath.coreLogic}</p>
                    <div className="space-y-3 text-sm">
                      <Detail label="最大上行收益" value={activePath.upside} />
                      <Detail label="机会成本" value={activePath.opportunityCost} />
                      <Detail label="失败模式" value={activePath.failureMode} />
                      <Detail label="验证实验" value={activePath.validationExperiment} />
                    </div>
                  </div>

                  <div className="border border-zinc-800 bg-zinc-950 p-5">
                    <h3 className="mb-3 text-base text-zinc-200">时间线</h3>
                    <div className="space-y-3">
                      {timeline.map((item) => (
                        <article key={item.time} className="border-l-2 border-zinc-800 pl-4">
                          <div className="mb-1 text-xs text-amber-200/80">{item.time}</div>
                          <h4 className="text-sm text-zinc-200">{item.title}</h4>
                          <p className="text-xs leading-relaxed text-zinc-500">{item.detail}</p>
                        </article>
                      ))}
                    </div>
                  </div>
                </section>
              </div>
            </section>
          )}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-zinc-900 px-4 py-2 text-xs text-zinc-600">
          <span>{lastAction}</span>
          <span>第 {round} 轮 · {messages.length} 条记录</span>
        </footer>
      </main>

      {rightCollapsed ? (
        <RailBar side="right" title="数据" onExpand={() => setRightCollapsed(false)} />
      ) : (
      <aside className="flex h-[36vh] w-full min-w-0 flex-col border-t border-zinc-800/60 bg-[#07070e] lg:h-auto lg:w-[27rem] lg:min-w-[23rem] lg:border-l lg:border-t-0">
        <div className="flex items-center overflow-x-auto border-b border-zinc-900 px-2 pt-2 text-xs font-medium">
          {rightTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setRightTab(tab.id)}
              className={`shrink-0 border-b-2 px-3 py-2 transition-colors ${
                rightTab === tab.id ? "border-amber-500 text-zinc-100" : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setRightCollapsed(true)}
            title="收起数据面板"
            className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-100"
          >
            <PanelRightClose size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5">
          {rightTab === "properties" && (
            <div data-testid="properties-panel" className="pb-8">
              <div className="panel-section">
                <div className="mb-3 flex items-center gap-2">
                  <FileText size={16} className="text-amber-500" />
                  <h3 className="text-base text-zinc-200">笔记属性</h3>
                </div>
                <div className="space-y-3">
                  <Detail label="文件名" value={`${selectedNode.label}.md`} />
                  <Detail label="类型" value={nodeTypeLabels[selectedNode.type]} />
                  <Detail label="置信度" value={confidenceLabels[selectedNode.confidence]} />
                  <Metric label="节点权重" value={`${selectedNode.weight}%`} width={selectedNode.weight} tone="amber" />
                </div>
              </div>

              <div className="panel-section">
                <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {noteTags(selectedNode).map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setQuery(tag)}
                      className="border border-zinc-800 px-2 py-1 text-xs text-zinc-500 transition-colors hover:border-amber-500/40 hover:text-amber-200"
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 grid gap-2">
                <button
                  type="button"
                  onClick={copyWikiLink}
                  className="flex w-full items-center justify-center gap-2 border border-zinc-800 py-2 text-xs text-zinc-400 transition-colors hover:border-amber-500/50 hover:text-amber-200"
                >
                  <Copy size={14} />
                  复制 WikiLink
                </button>
                <button
                  type="button"
                  onClick={pinAsMoc}
                  className="flex w-full items-center justify-center gap-2 border border-zinc-800 py-2 text-xs text-zinc-400 transition-colors hover:border-amber-500/50 hover:text-amber-200"
                >
                  <Pin size={14} />
                  固定为 MOC 锚点
                </button>
              </div>
            </div>
          )}

          {rightTab === "backlinks" && (
            <div data-testid="backlinks-panel" className="pb-8">
              <div className="panel-section">
                <div className="mb-3 flex items-center gap-2">
                  <Link2 size={16} className="text-amber-500" />
                  <h3 className="text-base text-zinc-200">反向链接</h3>
                </div>
                <LinkList emptyText="暂无反链，补充事实后会形成新的引用。" edges={backlinkEdges} nodes={allNodes} selectedNodeId={selectedNode.id} onSelect={selectNode} />
              </div>

              <div className="panel-section">
                <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Outgoing Links</h4>
                <LinkList emptyText="没有向外链接。" edges={outgoingEdges} nodes={allNodes} selectedNodeId={selectedNode.id} onSelect={selectNode} />
              </div>

              <div className="panel-section">
                <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">Unlinked Mentions</h4>
                <button
                  type="button"
                  onClick={() => setCapture(`${selectedNode.label} 的未链接提及：需要现实证据校准。`)}
                  className="w-full border border-dashed border-zinc-800 px-3 py-3 text-left text-xs leading-relaxed text-zinc-500 transition-colors hover:border-amber-500/40 hover:text-amber-200"
                >
                  发现 1 条可能相关提及：点击写入 Inbox，变成正式双链。
                </button>
              </div>
            </div>
          )}

          {rightTab === "variables" && (
            <div className="pb-8">
              <div className="panel-section">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Scale size={16} className="text-amber-500" />
                    <h3 className="text-base text-zinc-200">可调变量</h3>
                  </div>
                  <button
                    type="button"
                    onClick={resetVariables}
                    className="inline-flex items-center gap-1 text-xs text-zinc-500 transition-colors hover:text-amber-200"
                  >
                    <RotateCcw size={13} />
                    重置
                  </button>
                </div>
                <p className="mb-4 text-xs text-zinc-500">这些变量像 Obsidian 属性一样影响 MOC 排序。</p>
                {baseVariables.map((variable) => (
                  <Slider
                    key={variable.id}
                    label={variable.name}
                    lowLabel={variable.lowLabel}
                    highLabel={variable.highLabel}
                    value={variables[variable.id]}
                    onChange={(value) => updateVariable(variable.id, value)}
                  />
                ))}
              </div>
            </div>
          )}

          {rightTab === "protocol" && (
            <div className="pb-8">
              <div className="panel-section">
                <div className="mb-3 flex items-center gap-2">
                  <ListChecks size={16} className="text-amber-500" />
                  <h3 className="text-base text-zinc-200">14 天验证协议</h3>
                </div>
                <ul className="space-y-3 text-zinc-400">
                  {actionProtocol.map((item) => (
                    <li key={item.id} className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => toggleProtocol(item.id)}
                        className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center border transition-colors ${
                          checked.has(item.id) ? "border-amber-500 bg-amber-500 text-zinc-950" : "border-zinc-700"
                        }`}
                        aria-label={`切换任务：${item.label}`}
                      >
                        {checked.has(item.id) && <Check size={11} />}
                      </button>
                      <span>
                        <span className={checked.has(item.id) ? "block text-zinc-500 line-through" : "block text-zinc-300"}>{item.label}</span>
                        <span className="block text-xs leading-relaxed text-zinc-600">{item.detail}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="panel-section space-y-3">
                <Metric label="协议完成度" value={`${actionReadiness}%`} width={actionReadiness} tone="green" />
                <textarea
                  value={backfill}
                  onChange={(event) => setBackfill(event.target.value)}
                  placeholder="第 14 天把真实结果回填到这里..."
                  className="min-h-24 w-full resize-none border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 placeholder:text-zinc-600 focus:border-amber-500/50 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={submitBackfill}
                  className="w-full border border-zinc-800 py-2 text-xs text-zinc-400 transition-colors hover:border-amber-500/50 hover:text-amber-200"
                >
                  提交现实回填
                </button>
              </div>
            </div>
          )}

          {rightTab === "council" && (
            <div className="pb-8">
              <div className="panel-section">
                <div className="mb-3 flex items-center gap-2">
                  <ShieldAlert size={16} className="text-amber-500" />
                  <h3 className="text-base text-zinc-200">反方委员会</h3>
                </div>
                <div className="space-y-4 text-zinc-400">
                  {councilOpinions.map((opinion) => (
                    <article key={opinion.id} className="border-l-2 border-zinc-800 pl-4">
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <h4 className="text-sm text-zinc-200">{opinion.role}</h4>
                        <button
                          type="button"
                          onClick={() => selectPath(opinion.targetPathId)}
                          className="text-xs text-zinc-600 transition-colors hover:text-amber-200"
                        >
                          定位 MOC
                        </button>
                      </div>
                      <p className="mb-2 text-xs text-amber-200/80">{opinion.stance}</p>
                      <p className="text-sm leading-relaxed">{opinion.challenge}</p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
      )}

      <WorkspaceChatDrawer side="left" messages={messages} onSend={chatSend} />
    </div>
  );
}

function LinkList({
  emptyText,
  edges,
  nodes,
  selectedNodeId,
  onSelect
}: {
  emptyText: string;
  edges: ScenarioEdge[];
  nodes: ScenarioNode[];
  selectedNodeId: string;
  onSelect: (nodeId: string) => void;
}) {
  if (edges.length === 0) return <p className="text-xs leading-relaxed text-zinc-600">{emptyText}</p>;

  return (
    <div className="space-y-3">
      {edges.map((edge) => {
        const otherId = edge.source === selectedNodeId ? edge.target : edge.source;
        const otherNode = nodes.find((node) => node.id === otherId);
        if (!otherNode) return null;
        return (
          <button
            key={`${edge.source}-${edge.target}`}
            type="button"
            onClick={() => onSelect(otherNode.id)}
            className="w-full border border-zinc-900 px-3 py-2 text-left transition-colors hover:border-zinc-700"
          >
            <div className="mb-1 flex items-center justify-between gap-3 text-xs">
              <span className="text-zinc-200">[[{otherNode.label}]]</span>
              <span className="text-zinc-600">{relationLabel(edge.relation)} · {Math.round(edge.strength * 100)}%</span>
            </div>
            <p className="text-xs leading-relaxed text-zinc-500">{edge.explanation}</p>
          </button>
        );
      })}
    </div>
  );
}

function MarkdownBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-7 border-l border-zinc-800 pl-5">
      <h3 className="mb-3 text-sm text-zinc-200">## {title}</h3>
      <div className="text-sm leading-relaxed text-zinc-400">{children}</div>
    </section>
  );
}

function Metric({ label, value, width, tone }: { label: string; value: string; width: number; tone: "amber" | "green" | "zinc" }) {
  const color = tone === "amber" ? "bg-amber-500/80" : tone === "green" ? "bg-emerald-700" : "bg-zinc-500";

  return (
    <div>
      <div className="mb-1 flex justify-between gap-3 text-xs">
        <span className="text-zinc-400">{label}</span>
        <span className="font-medium text-zinc-100">{value}</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-zinc-900">
        <div className={`h-full ${color}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function Slider({
  label,
  lowLabel,
  highLabel,
  value,
  onChange
}: {
  label: string;
  lowLabel: string;
  highLabel: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block border-b border-zinc-900 py-4 last:border-0">
      <span className="mb-2 flex items-center justify-between gap-3 text-xs">
        <span className="text-zinc-400">{label}</span>
        <span className="text-zinc-100">{value}</span>
      </span>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-amber-500"
      />
      <span className="mt-1 flex justify-between text-[11px] text-zinc-600">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </span>
    </label>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-1 text-xs text-zinc-600">{label}</div>
      <div className="text-sm leading-relaxed text-zinc-300">{value}</div>
    </div>
  );
}

function StatusPill({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-full border border-zinc-800 bg-zinc-950/85 px-3 py-1.5 text-zinc-400 backdrop-blur-md">
      {label} <span className="text-zinc-100">{value}</span>
    </div>
  );
}
