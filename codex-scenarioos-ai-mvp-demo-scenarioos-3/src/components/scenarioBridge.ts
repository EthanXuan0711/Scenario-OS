"use client";

// 跨页共享推演场景：工作台写入（输入议题 + 推演原型 + 变量），社会沙盘读取并联动。
// localStorage 持久化 + 自定义事件（同页实时）+ storage 事件（跨标签）。

import { useEffect, useState } from "react";
import type { VariableValues } from "./cockpit/cockpitSim";

const KEY = "scenarioos.scenario.v1";
const EVENT = "scenarioos:scenario-updated";

// 用户新增的条件 → 在社会沙盘里生成新星球
export type ScenarioCondition = { id: string; label: string; type: string };

export type SharedScenario = {
  active: boolean;
  topic: string;
  input: string;
  archetypeKey: string;
  variables: VariableValues | null;
  conditions?: ScenarioCondition[];
};

const EMPTY_SCENARIO: SharedScenario = {
  active: false,
  topic: "",
  input: "",
  archetypeKey: "generic",
  variables: null,
  conditions: []
};

export function saveScenario(data: SharedScenario) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    // ignore storage failures
  }
}

export function loadScenario(): SharedScenario | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SharedScenario) : null;
  } catch {
    return null;
  }
}

// 新增一个条件 → 追加到共享场景（社会沙盘据此生成新星球）。
export function addCondition(label: string, type: string): ScenarioCondition {
  const current = loadScenario() ?? { ...EMPTY_SCENARIO };
  const existing = current.conditions ?? [];
  const condition: ScenarioCondition = { id: `c${Date.now().toString(36)}${existing.length}`, label, type };
  saveScenario({ ...current, conditions: [...existing, condition] });
  return condition;
}

// 移除一个条件。
export function removeCondition(id: string) {
  const current = loadScenario();
  if (!current) return;
  saveScenario({ ...current, conditions: (current.conditions ?? []).filter((c) => c.id !== id) });
}

// 订阅共享场景（挂载时读取 + 同页/跨标签更新时刷新）。
export function useSharedScenario(): SharedScenario | null {
  const [scenario, setScenario] = useState<SharedScenario | null>(null);

  useEffect(() => {
    const update = () => setScenario(loadScenario());
    update();
    window.addEventListener(EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);

  return scenario;
}
