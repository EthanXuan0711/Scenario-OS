import type { Metadata } from "next";
import Archive from "../../components/archive/Archive";

export const metadata: Metadata = {
  title: "ScenarioOS · 档案 | Archive",
  description: "命盘 · 推演历史 · 命中率——你的长期决策资产"
};

export default function ArchivePage() {
  return <Archive />;
}
