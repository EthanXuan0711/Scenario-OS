"use client";

// 命理可验证问题的回填记录（PRD 5.9：每个符号解释都要有可验证问题，并能在 30 天后核对）。
// 与推演回填分开存储，但同样形成"判断 → 可验证 → 回填"的闭环。

import { useEffect, useState } from "react";

const KEY = "scenarioos.baziVerify.v1";
const EVENT = "scenarioos:bazi-verify-updated";

export type BaziVerdict = "yes" | "deviation" | "no"; // 应验 / 部分 / 未发生
export type BaziVerifyRecord = {
  verdict: BaziVerdict;
  at: number; // 回填时间戳
};
export type BaziVerifyMap = Record<string, BaziVerifyRecord>;

function emit() {
  try {
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    // SSR
  }
}

export function loadBaziVerify(): BaziVerifyMap {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as BaziVerifyMap;
  } catch {
    return {};
  }
}

export function saveBaziVerify(questionKey: string, verdict: BaziVerdict, at: number) {
  try {
    const map = loadBaziVerify();
    map[questionKey] = { verdict, at };
    localStorage.setItem(KEY, JSON.stringify(map));
    emit();
  } catch {
    // ignore
  }
}

export function clearBaziVerify(questionKey: string) {
  try {
    const map = loadBaziVerify();
    delete map[questionKey];
    localStorage.setItem(KEY, JSON.stringify(map));
    emit();
  } catch {
    // ignore
  }
}

export function useBaziVerify(): BaziVerifyMap {
  const [map, setMap] = useState<BaziVerifyMap>({});
  useEffect(() => {
    const update = () => setMap(loadBaziVerify());
    update();
    window.addEventListener(EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);
  return map;
}

export const BAZI_VERDICT_META: Record<BaziVerdict, { label: string; color: string }> = {
  yes: { label: "应验", color: "#34d399" },
  deviation: { label: "部分", color: "#e7c766" },
  no: { label: "未发生", color: "#fb7185" },
};
