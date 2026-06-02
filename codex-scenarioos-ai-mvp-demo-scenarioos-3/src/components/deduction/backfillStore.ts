"use client";

// 推演历史 + 结果回填 + 命中率（PRD 5.3 / 7.4.6）。
// 当前用 localStorage；后端就绪后可替换为接口，hook 签名不变。

import { useEffect, useState } from "react";
import type { Backfill, DeductionResult, HitRateStats } from "./deductionTypes";

const HIST_KEY = "scenarioos.deductions.v1";
const BF_KEY = "scenarioos.backfills.v1";
const EVENT = "scenarioos:deduction-updated";

export type HistoryItem = {
  id: string;
  topic: string;
  archetypeKey: string;
  verifiableByDays: number;
  savedAt: number;
  paths?: { id: string; name: string }[]; // 推演路径快照（用于回填时选择实际走了哪条）
};

function emit() {
  try {
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    // SSR / 无 window 时忽略
  }
}

export function loadHistory(): HistoryItem[] {
  try {
    return JSON.parse(localStorage.getItem(HIST_KEY) ?? "[]") as HistoryItem[];
  } catch {
    return [];
  }
}

export function saveDeduction(result: DeductionResult) {
  try {
    const item: HistoryItem = {
      id: result.id,
      topic: result.topic,
      archetypeKey: result.archetypeKey,
      verifiableByDays: result.verifiableByDays,
      savedAt: Date.now(),
      paths: result.paths?.map((p) => ({ id: p.id, name: p.name }))
    };
    const list = loadHistory().filter((h) => h.id !== result.id);
    localStorage.setItem(HIST_KEY, JSON.stringify([item, ...list].slice(0, 50)));
    emit();
  } catch {
    // ignore
  }
}

export function loadBackfills(): Backfill[] {
  try {
    return JSON.parse(localStorage.getItem(BF_KEY) ?? "[]") as Backfill[];
  } catch {
    return [];
  }
}

export function saveBackfill(backfill: Backfill) {
  try {
    const list = loadBackfills().filter((b) => b.resultId !== backfill.resultId);
    localStorage.setItem(BF_KEY, JSON.stringify([backfill, ...list]));
    emit();
  } catch {
    // ignore
  }
}

// 命中率：命中计 1，偏差计 0.5，错误计 0
export function computeHitRate(backfills: Backfill[] = loadBackfills()): HitRateStats {
  const verified = backfills.length;
  const hit = backfills.filter((b) => b.verdict === "hit").length;
  const deviation = backfills.filter((b) => b.verdict === "deviation").length;
  const miss = backfills.filter((b) => b.verdict === "miss").length;
  const rate = verified ? Math.round(((hit + deviation * 0.5) / verified) * 100) : 0;
  return { verified, hit, deviation, miss, rate };
}

const EMPTY: HitRateStats = { verified: 0, hit: 0, deviation: 0, miss: 0, rate: 0 };

// 响应式命中率（挂载读取 + 同页事件 + 跨标签 storage）
export function useHitRate(): HitRateStats {
  const [stats, setStats] = useState<HitRateStats>(EMPTY);
  useEffect(() => {
    const update = () => setStats(computeHitRate());
    update();
    window.addEventListener(EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);
  return stats;
}

// 响应式推演历史
export function useDeductionHistory(): HistoryItem[] {
  const [list, setList] = useState<HistoryItem[]>([]);
  useEffect(() => {
    const update = () => setList(loadHistory());
    update();
    window.addEventListener(EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);
  return list;
}

// 响应式回填记录（用于在历史区展示"已回填"详情）
export function useBackfills(): Backfill[] {
  const [list, setList] = useState<Backfill[]>([]);
  useEffect(() => {
    const update = () => setList(loadBackfills());
    update();
    window.addEventListener(EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);
  return list;
}
