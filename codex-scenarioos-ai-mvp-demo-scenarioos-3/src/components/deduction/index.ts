// 推演模块统一出口
export * from "./deductionTypes";
export { runDeduction, type RunOptions } from "./runDeduction";
export { ruleBasedDeduction } from "./ruleEngine";
export {
  saveDeduction,
  loadHistory,
  saveBackfill,
  loadBackfills,
  computeHitRate,
  useHitRate,
  useDeductionHistory,
  useBackfills,
  type HistoryItem
} from "./backfillStore";
