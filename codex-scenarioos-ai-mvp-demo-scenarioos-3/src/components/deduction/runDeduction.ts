// 推演服务唯一入口。前端所有页面只调用 runDeduction()，不关心背后是规则引擎还是后端 LLM。
//
// 现在：本地规则引擎兜底（离线可演示）。
// 后端就绪后：把下方注释的 fetch 打开、删掉兜底调用即可，前端其它代码零改动。

import type { DeductionInput, DeductionResult } from "./deductionTypes";
import { ruleBasedDeduction } from "./ruleEngine";

// 可选的"推演中"拟真延时（PRD 7.4.7 沉浸式推演剧场），默认 0；UI 也可自行控制动画时长。
export type RunOptions = { simulateLatencyMs?: number };

export async function runDeduction(input: DeductionInput, opts: RunOptions = {}): Promise<DeductionResult> {
  if (opts.simulateLatencyMs && opts.simulateLatencyMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, opts.simulateLatencyMs));
  }

  // 后端接入点：置 NEXT_PUBLIC_USE_DEDUCE_API=1 即走 /api/deduce（当前为规则引擎 mock，
  // 后端换成真实 LLM 后契约不变）。接口异常自动回退本地规则引擎，保证演示不中断。
  // —— 验证「前端在规则引擎 ↔ 接口之间切换，UI 零改动」（PRD §5.3 验收）。
  if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_USE_DEDUCE_API === "1") {
    try {
      const res = await fetch("/api/deduce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (res.ok) return (await res.json()) as DeductionResult;
    } catch {
      // 网络/服务异常 → 回退本地兜底
    }
  }

  return ruleBasedDeduction(input);
}
