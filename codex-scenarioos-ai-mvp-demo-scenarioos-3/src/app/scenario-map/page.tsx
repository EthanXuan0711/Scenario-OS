import type { Metadata } from "next";
import ScenarioGalaxy from "../../components/scenario-galaxy";

export const metadata: Metadata = {
  title: "ScenarioOS · 社会沙盘 | Scenario Map",
  description: "事件 · 角色 · 平台 · 风险 · 结果 的关系网络推演演示页"
};

export default function ScenarioMapPage() {
  return <ScenarioGalaxy />;
}
