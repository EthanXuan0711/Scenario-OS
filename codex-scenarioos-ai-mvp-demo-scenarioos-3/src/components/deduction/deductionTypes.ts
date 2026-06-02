// 推演数据契约（对齐地球Online PRD v1.1 第 5、7 节）。
// 前后端共享的结构：后端 LLM 产出必须满足 DeductionResult，前端只依赖这些类型。

// 判断强度三档（PRD 7.5：主动管理模糊边界）
export type JudgmentStrength = "high" | "medium" | "needs-verification";

// 四种推演模式（PRD 5.1）
export type DeductionMode = "precise" | "interval" | "branch" | "gather-info";

// 推演精度自检·五维（PRD 5.2）
export type PrecisionCheck = {
  goalClarity: number; // 目标明确度 1-5
  actorClarity: number; // 对象明确度 1-5
  variableCompleteness: number; // 变量完整度 1-5
  situationStability: number; // 局势稳定度 1-5
  verifiability: number; // 验证可行度 1-5
  total: number; // 总分 5-25
};

// 单条推演路径（PRD 7.4.2 路径分支树）
export type DeductionPath = {
  id: string;
  name: string; // 如「主动出击」
  probability: number; // 概率 0-100
  trigger: string; // 触发条件
  keyNode: string; // 关键节点 / 标签
  risk: { desc: string; chance: number }; // 风险描述 + 概率
  bestOutcome: string; // 最佳结果
  score: number; // 综合适配评分
  steps: string[]; // 最小试探动作 / 核心逻辑
};

// 当前局势判断（PRD 7.5）
export type Situation = {
  stage: string; // 阶段
  mainConflict: string; // 主导矛盾
  risks: string[]; // 风险点
};

// 完整推演结果（结果页所有区块）
export type DeductionResult = {
  id: string;
  topic: string;
  input: string;
  archetypeKey: string;
  mode: DeductionMode;
  strength: JudgmentStrength; // 判断强度
  precision: PrecisionCheck; // 五维自检
  situation: Situation; // 当前局势
  paths: DeductionPath[]; // 路径 A/B/C
  actionAdvice: string[]; // 行动建议 + 最小试探
  basis: string[]; // 判断依据（基于哪些记忆 / 模式）
  verificationWindow: string; // 可验证时间窗文案
  verifiableByDays: number; // 可验证天数（用于回填提醒）
};

// 推演输入
export type DeductionInput = {
  text: string; // 用户描述的当前困境
  topic?: string;
  variables?: Record<string, number> | null; // 命盘 / 决策变量
  conditions?: string[]; // 额外条件
};

// 结果回填（PRD 5.3：主动追踪命中率）
export type Verdict = "hit" | "deviation" | "miss"; // 命中 / 偏差 / 错误
export type Backfill = {
  resultId: string;
  topic: string;
  chosenPathId: string; // 用户选了哪条路径
  chosenPathName?: string; // 路径名（展示用，路径快照可能缺失时回退）
  verdict: Verdict;
  note?: string; // 回填说明 / 偏差原因
  verifyDate?: string; // 验证日期 yyyy-mm-dd（计划或实际）
  savedAt: number;
};

// 命中率统计（PRD 7.4.6 命中率仪表盘）
export type HitRateStats = {
  verified: number; // 已验证次数
  hit: number;
  deviation: number;
  miss: number;
  rate: number; // 命中率 %
};
