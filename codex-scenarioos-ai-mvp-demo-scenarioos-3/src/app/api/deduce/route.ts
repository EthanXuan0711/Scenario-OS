// POST /api/deduce —— 推演服务的最小后端契约端点（PRD §5.3 / §12.4）。
// 入参 DeductionInput → 回参 DeductionResult。当前用确定性规则引擎兜底（与前端同一份逻辑），
// 后端就绪后把本文件内部换成真实 LLM 推演即可，契约不变、前端零改动。

import { NextResponse } from "next/server";
import { ruleBasedDeduction } from "../../../components/deduction/ruleEngine";
import type { DeductionInput } from "../../../components/deduction/deductionTypes";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const input = (await req.json()) as DeductionInput;
    if (!input || typeof input.text !== "string" || !input.text.trim()) {
      return NextResponse.json({ error: "DeductionInput.text 必填" }, { status: 400 });
    }
    const result = ruleBasedDeduction(input);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "推演服务异常" }, { status: 500 });
  }
}

// 便于探活
export async function GET() {
  return NextResponse.json({ ok: true, service: "deduce", engine: "rule-based" });
}
