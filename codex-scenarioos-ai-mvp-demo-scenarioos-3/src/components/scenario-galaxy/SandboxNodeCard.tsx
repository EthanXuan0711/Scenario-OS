"use client";

// 沙盘节点详情卡：点击星球弹出，显示评分 / 权重 / 内容。
// 评分与权重由决策变量公式实时推导 —— 工作台调变量、AI 推演、笔记改写即同步。

import type { CSSProperties } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { VariableValues } from "../cockpit/cockpitSim";
import { NODE_TYPE_META } from "./galaxyTypes";
import { describeNode, relatedVariable, scoreLabel, scoreOf, weightOf, type SandboxNode } from "./sandboxScoring";

type Props = {
  node: SandboxNode | null;
  variables: VariableValues | null;
  topic: string;
  onClose: () => void;
};

const glassStyle: CSSProperties = {
  background: "rgba(10, 12, 24, 0.74)",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
  boxShadow: "0 18px 60px rgba(0,0,0,0.5), 0 0 36px rgba(90,110,200,0.16)"
};

export default function SandboxNodeCard({ node, variables, topic, onClose }: Props) {
  return (
    <AnimatePresence mode="wait">
      {node && (
        <motion.div
          key={node.id}
          initial={{ opacity: 0, y: 26, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: 16, filter: "blur(6px)" }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          className="pointer-events-auto absolute bottom-24 left-6 z-30 w-[340px] max-w-[calc(100vw-3rem)]"
        >
          <div className="rounded-[20px] p-5" style={glassStyle}>
            <CardBody node={node} variables={variables} topic={topic} onClose={onClose} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function CardBody({ node, variables, topic, onClose }: { node: SandboxNode; variables: VariableValues | null; topic: string; onClose: () => void }) {
  const meta = NODE_TYPE_META[node.type];
  const weight = weightOf(node.type, node.importance, variables);
  const score = scoreOf(node.type, node.importance, variables);
  const rel = relatedVariable(node.type);
  const relValue = (variables ?? null)?.[rel.id] ?? null;
  const description = describeNode(node.type, node.label, topic);

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-2.5 w-2.5 rounded-full" style={{ background: meta.color, boxShadow: `0 0 12px ${meta.glow}` }} />
          <span className="text-xs tracking-wide text-zinc-400">
            {node.kind === "star" ? `${meta.label} 恒星系` : meta.label}
            {node.isCondition ? " · 新增条件" : ""}
          </span>
        </div>
        <button type="button" onClick={onClose} className="text-zinc-500 transition-colors hover:text-zinc-200" aria-label="关闭详情">
          ✕
        </button>
      </div>

      <h3 className="mb-1.5 text-xl font-medium text-zinc-50">{node.label}</h3>
      <p className="mb-4 text-[13px] leading-relaxed text-zinc-400">{description}</p>

      <div className="mb-2 grid grid-cols-2 gap-3">
        <Metric label={scoreLabel(node.type)} value={score} color={meta.color} />
        <Metric label="权重" value={weight} color="#9ec2ff" />
      </div>

      <div className="rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2.5">
        <div className="flex items-center justify-between text-[11px] text-zinc-500">
          <span>关联变量 · {rel.name}</span>
          <span className="font-mono text-zinc-300">{relValue === null ? "默认" : `${relValue}`}</span>
        </div>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/5">
          <motion.div
            className="h-full rounded-full"
            style={{ background: meta.color }}
            initial={{ width: 0 }}
            animate={{ width: `${relValue ?? 50}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
        <div className="mt-2 text-[10px] leading-relaxed text-zinc-600">
          评分与权重由该变量实时驱动；在工作台调整变量 / AI 推演 / 笔记，这里会同步刷新。
        </div>
      </div>
    </>
  );
}

function Metric({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2.5">
      <div className="mb-1 text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mb-1.5 font-mono text-2xl leading-none text-zinc-50">{value}</div>
      <div className="h-1 overflow-hidden rounded-full bg-white/5">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
