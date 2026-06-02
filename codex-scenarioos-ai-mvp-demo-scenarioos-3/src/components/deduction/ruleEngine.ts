// 规则引擎：在后端 LLM 接入前，用确定性规则 + 现有原型/评分引擎产出 PRD 结构化推演结果。
// 后端就绪后，runDeduction() 直接改调后端即可，本文件可保留为离线兜底。

import { archetypeDetail } from "../deriveScenario";
import { defaultVariables, scorePaths, survivalScore, type VariableValues } from "../cockpit/cockpitSim";
import type { DeductionInput, DeductionMode, DeductionPath, DeductionResult, JudgmentStrength, PrecisionCheck, Situation } from "./deductionTypes";

function precisionOf(text: string): PrecisionCheck {
  const len = text.trim().length;
  const hasActor = /我|他|她|对方|公司|父母|领导|合伙|朋友|老板|伴侣|对象|团队|客户/.test(text);
  const hasTime = /什么时候|多久|今年|明年|月|周|天|窗口|现在|马上|deadline|截止/.test(text);
  const hasGoal = /要不要|该不该|选|怎么办|值不值|能不能|如何|是否|继续|放弃/.test(text);
  const goalClarity = hasGoal ? (len > 16 ? 5 : 4) : len > 10 ? 3 : 2;
  const actorClarity = hasActor ? 4 : 2;
  const variableCompleteness = Math.min(5, Math.max(2, Math.round(len / 12)));
  const situationStability = 3;
  const verifiability = hasTime ? 4 : 3;
  const total = goalClarity + actorClarity + variableCompleteness + situationStability + verifiability;
  return { goalClarity, actorClarity, variableCompleteness, situationStability, verifiability, total };
}

function strengthOf(p: PrecisionCheck): JudgmentStrength {
  return p.total >= 20 ? "high" : p.total >= 15 ? "medium" : "needs-verification";
}

function modeOf(p: PrecisionCheck): DeductionMode {
  const min = Math.min(p.goalClarity, p.actorClarity, p.variableCompleteness, p.situationStability, p.verifiability);
  if (min < 2) return "gather-info";
  if (p.total >= 21) return "precise";
  if (p.total >= 16) return "interval";
  return "branch";
}

export function ruleBasedDeduction(input: DeductionInput): DeductionResult {
  const text = input.text.trim();
  const topic = input.topic || (text.length > 12 ? `${text.slice(0, 12)}…` : text) || "新议题";
  const arch = archetypeDetail(text);
  const vars: VariableValues = { ...defaultVariables, ...(input.variables ?? {}) };

  const scored = scorePaths(vars).slice(0, 3);
  const sum = scored.reduce((s, p) => s + p.score, 0) || 1;
  const paths: DeductionPath[] = scored.map((p) => ({
    id: p.id,
    name: p.name,
    probability: Math.round((p.score / sum) * 100),
    trigger: p.validationExperiment,
    keyNode: p.tag,
    risk: { desc: p.failureMode, chance: Math.max(8, Math.min(92, 100 - p.score)) },
    bestOutcome: p.upside,
    score: p.score,
    steps: [p.coreLogic, p.validationExperiment]
  }));
  const probSum = paths.reduce((s, p) => s + p.probability, 0);
  if (paths.length && probSum !== 100) paths[0].probability += 100 - probSum;

  const precision = precisionOf(text);
  const strength = strengthOf(precision);
  const mode = modeOf(precision);
  const survival = survivalScore(vars);

  const situation: Situation = {
    stage: `「${topic}」处于需要结构化推演的关键决策点`,
    mainConflict: `${arch.values[0]} 与 ${arch.risks[0]} 的权衡`,
    risks: arch.risks.slice(0, 3)
  };

  const basis = [
    `识别为「${arch.id}」类决策原型`,
    `关键价值维度：${arch.values.join(" / ")}`,
    `当前变量配置下 18 个月生存概率约 ${survival}%`,
    `关键角色：${arch.persons.join(" / ")}`
  ];

  const top = paths[0];
  const actionAdvice = [
    `优先验证：${top?.trigger ?? "用最小动作收集真实反馈"}`,
    top ? `最小试探（${top.name}）：${top.steps[1] ?? top.steps[0]}` : "先收集关键信息再做判断",
    `重点监控风险：${arch.risks[0]}`
  ];

  const verifiableByDays = mode === "precise" ? 30 : mode === "interval" ? 60 : 90;

  return {
    id: `d${Date.now().toString(36)}`,
    topic,
    input: text,
    archetypeKey: arch.id,
    mode,
    strength,
    precision,
    situation,
    paths,
    actionAdvice,
    basis,
    verificationWindow: `${verifiableByDays} 天内可回填验证`,
    verifiableByDays
  };
}
