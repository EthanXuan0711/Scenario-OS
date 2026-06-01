"use client";

// 用户入口：未登录显示「登录」按钮；已登录显示头像 + 昵称，点开下拉可编辑档案 / 退出。
// 自包含（自带登录与档案弹窗），可放进任意页面顶栏。

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IdCard, LogIn, LogOut } from "lucide-react";
import { useUser } from "./useUser";
import LoginModal from "./LoginModal";
import ProfileModal from "./ProfileModal";

export default function UserMenu() {
  const { user, isLoggedIn, login, logout, updateProfile } = useUser();
  const [loginOpen, setLoginOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  return (
    <>
      {!isLoggedIn || !user ? (
        <button
          type="button"
          onClick={() => setLoginOpen(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/12 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-amber-400/50 hover:text-amber-200"
        >
          <LogIn size={13} />
          登录
        </button>
      ) : (
        <div ref={menuRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            className="flex items-center gap-2 rounded-full border border-white/12 py-1 pl-1 pr-3 text-xs text-zinc-200 transition-colors hover:border-amber-400/50"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-[11px] font-medium text-zinc-950">
              {user.nickname.slice(0, 1)}
            </span>
            <span className="max-w-[88px] truncate">{user.nickname}</span>
          </button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
                className="absolute right-0 top-[calc(100%+6px)] z-50 w-40 overflow-hidden rounded-xl border border-white/12"
                style={{ background: "rgba(12,14,24,0.98)", boxShadow: "0 16px 50px rgba(0,0,0,0.5)" }}
              >
                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(true);
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-zinc-300 transition-colors hover:bg-white/5 hover:text-zinc-100"
                  >
                    <IdCard size={14} className="text-amber-400" />
                    个人档案
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-100"
                  >
                    <LogOut size={14} />
                    退出登录
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      )}

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} onLogin={login} />
      {user && <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} user={user} onSave={updateProfile} />}
    </>
  );
}
