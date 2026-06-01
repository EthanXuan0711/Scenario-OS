"use client";

// 登录 / 注册弹窗（本地演示账户）。无需真实密码，提交即创建本地用户。

import { useState, type ReactNode } from "react";
import { LogIn, X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  onLogin: (nickname: string) => void;
};

export default function LoginModal({ open, onClose, onLogin }: Props) {
  const [nickname, setNickname] = useState("");
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");

  if (!open) return null;

  const submit = () => {
    const name = (nickname || account).trim();
    if (!name) return;
    onLogin(name);
    setNickname("");
    setAccount("");
    setPassword("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-sm rounded-2xl border border-white/12 p-6"
        style={{ background: "rgba(12,14,24,0.96)", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}
      >
        <button onClick={onClose} className="absolute right-4 top-4 text-zinc-500 transition-colors hover:text-zinc-200" aria-label="关闭">
          <X size={16} />
        </button>
        <div className="mb-1 flex items-center gap-2">
          <LogIn size={16} className="text-amber-400" />
          <h2 className="text-base font-medium text-zinc-100">登录 / 注册 ScenarioOS</h2>
        </div>
        <p className="mb-5 text-xs text-zinc-500">本地演示账户，仅存储在你的浏览器，无需真实密码。</p>

        <div className="space-y-3">
          <Field label="账号 / 手机号（可选）">
            <input
              value={account}
              onChange={(event) => setAccount(event.target.value)}
              placeholder="example@scenarioos.com"
              className="w-full rounded-lg border border-white/10 bg-[#0c0c16] px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-amber-500/50 focus:outline-none"
            />
          </Field>
          <Field label="密码（演示，可留空）">
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••"
              className="w-full rounded-lg border border-white/10 bg-[#0c0c16] px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-amber-500/50 focus:outline-none"
            />
          </Field>
          <Field label="昵称">
            <input
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") submit();
              }}
              placeholder="你的称呼"
              className="w-full rounded-lg border border-white/10 bg-[#0c0c16] px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-amber-500/50 focus:outline-none"
            />
          </Field>
        </div>

        <button
          type="button"
          onClick={submit}
          className="mt-5 w-full rounded-lg bg-amber-500 py-2.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-amber-400"
        >
          登录 / 创建账户
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-zinc-500">{label}</span>
      {children}
    </label>
  );
}
