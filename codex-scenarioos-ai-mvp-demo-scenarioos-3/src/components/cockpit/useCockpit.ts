"use client";

// 驾驶舱编排 hook：把聊天输入、原子笔记、决策变量、路径评分与 3D 星系串成一个推演闭环。

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGalaxyData } from "../scenario-galaxy/useGalaxyData";
import { coreNodeId } from "../scenario-galaxy/galaxyMockData";
import {
  clampPct,
  decisionVariables,
  defaultVariables,
  scorePaths,
  simulate,
  survivalScore,
  type VariableValues
} from "./cockpitSim";
import type { DecisionVariable } from "../../types";

export type ChatMessage = { id: string; role: "user" | "system"; text: string };
export type AtomicNote = { id: string; text: string };

export function useCockpit() {
  const galaxy = useGalaxyData();
  const [variables, setVariables] = useState<VariableValues>(defaultVariables);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "m0",
      role: "system",
      text: "我是 ScenarioOS 推演引擎。把你正在面对的处境、担忧或选择讲给我——我会实时把它映射成关系星图、风险点与路径评分。"
    }
  ]);
  const [notes, setNotes] = useState<AtomicNote[]>([]);
  const seq = useRef(0);

  // 驾驶舱中星系直接全量呈现（不做分阶段时间线门控）
  useEffect(() => {
    galaxy.setStage(3);
  }, [galaxy.setStage]);

  const scoredPaths = useMemo(() => scorePaths(variables), [variables]);
  const survival = useMemo(() => survivalScore(variables), [variables]);

  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const id = seq.current;
      seq.current += 1;

      setMessages((current) => [...current, { id: `u-${id}`, role: "user", text: trimmed }]);

      const result = simulate(trimmed, coreNodeId, id);
      galaxy.addScenario(result.nodes, result.edges);
      setNotes((current) => [{ id: `n-${id}`, text: trimmed }, ...current]);

      setVariables((current) => {
        const next = { ...current };
        (Object.keys(result.varDelta) as Array<keyof VariableValues>).forEach((key) => {
          next[key] = clampPct(next[key] + (result.varDelta[key] ?? 0));
        });
        return next;
      });

      setMessages((current) => [...current, { id: `s-${id}`, role: "system", text: result.summary }]);

      // 输入后镜头飞向新生成的事件节点
      if (result.nodes[0]) galaxy.select(result.nodes[0].id);
    },
    [galaxy]
  );

  const setVariable = useCallback((id: DecisionVariable["id"], value: number) => {
    setVariables((current) => ({ ...current, [id]: clampPct(value) }));
  }, []);

  const resetVariables = useCallback(() => setVariables(defaultVariables), []);

  return {
    galaxy,
    variables,
    decisionVariables,
    setVariable,
    resetVariables,
    messages,
    notes,
    send,
    scoredPaths,
    survival
  };
}
