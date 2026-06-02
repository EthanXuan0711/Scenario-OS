// 信息架构收敛：驾驶舱能力并入「推演」，旧路由重定向，避免三页面职责重叠。
import { redirect } from "next/navigation";

export default function CockpitPage() {
  redirect("/scenario-map");
}
