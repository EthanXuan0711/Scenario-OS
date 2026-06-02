"use client";

// 统一三导航（PRD 信息架构收敛）：聊天 / 推演 / 档案。
// 顶部独占一行的细顶栏 + 下划线标签（非药丸），各页内容在其下方。

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "聊天", hint: "记忆 · 笔记" },
  { href: "/scenario-map", label: "推演", hint: "决策星系" },
  { href: "/archive", label: "档案", hint: "命盘 · 命中率" }
];

export default function CosmicNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 top-0 z-50 flex h-11 items-center justify-center gap-7 backdrop-blur-md"
      style={{
        background: "linear-gradient(180deg, rgba(8,6,18,0.92), rgba(6,8,16,0.78))",
        borderBottom: "1px solid rgba(253,230,138,0.12)",
      }}
    >
      {/* 顶部暗金流光分隔线 */}
      <span className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-amber-300/40 to-transparent" />

      <Link href="/" className="absolute left-5 hidden items-center gap-2 sm:flex">
        <span className="flex h-5 w-5 items-center justify-center rounded-full border border-amber-200/40 text-[11px] text-amber-200" style={{ boxShadow: "0 0 10px rgba(231,199,102,0.3)" }}>
          ☯
        </span>
        <span className="font-mystic text-[13px] font-semibold tracking-wide text-zinc-200">ScenarioOS</span>
      </Link>

      {NAV.map((n) => {
        const active = pathname === n.href;
        return (
          <Link
            key={n.href}
            href={n.href}
            title={n.hint}
            className={`relative flex h-full items-center px-1 text-[13px] transition-colors ${active ? "text-amber-200" : "text-zinc-400 hover:text-zinc-100"}`}
          >
            <span className={active ? "font-mystic font-semibold" : "font-medium"}>{n.label}</span>
            {active && (
              <span
                className="absolute inset-x-0 bottom-0 h-0.5 rounded-full"
                style={{ background: "linear-gradient(90deg, transparent, #f0c85a, transparent)", boxShadow: "0 0 8px rgba(240,200,90,0.6)" }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
