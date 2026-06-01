import type { Metadata } from "next";
import Cockpit from "../../components/cockpit/Cockpit";

export const metadata: Metadata = {
  title: "ScenarioOS · 决策推演驾驶舱 | Cockpit",
  description: "左 AI 聊天 + 中 3D 星系 + 右数据 的一体化决策推演驾驶舱"
};

export default function CockpitPage() {
  return <Cockpit />;
}
